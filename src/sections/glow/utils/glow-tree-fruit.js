import { CFG } from '../../../cfg.js'
import * as Sound from '../../../utils/sound.js'
import { GLOW_SUN_LIT_FRAC, GLOW_SUN_LIT_OFFSET_X, GLOW_SUN_LIT_OFFSET_Y } from './glow-eye-berry.js'
import { GLOW_PAL, getTreePaletteColor, glowRgb } from './glow-palette.js'
import { TREE_SEED, paintGlowTreeFoliageMask } from './glow-tree.js'

//
// Decorative canopy fruit on the main glow tree (game palette only).
//
const FRUIT_SEED_OFFSET = 8803
const FRUIT_RANDOM_COUNT = 17
//
// Fallen anchor fruit vanishes after this if the centipede never claims it.
//
const FRUIT_GROUND_LINGER_SEC = 10
const FRUIT_GROUND_FADE_SEC = 0.9
const FRUIT_RADIUS_MIN = 6
const FRUIT_RADIUS_RANGE = 4
const ANCHOR_DROP_LEFT_PAD = 16
const ANCHOR_DROP_RIGHT_PAD = 12
const ANCHOR_LEAF_TARGET_Y_OFFSET = 48
const ANCHOR_Y_SCORE_WEIGHT = 0.25
const FRUIT_STEM_LEN = 4
const FRUIT_CONTOUR_W = 1.2
const FRUIT_Z = CFG.visual.zIndex.platforms - 1
const FRUIT_FALL_GRAVITY = 1650
const FRUIT_FALL_GROUND_PAD = 2
const FRUIT_LEAF_SEED = 9917
const FRUIT_BOUNCE_RESTITUTION_FIRST = 0.36
const FRUIT_BOUNCE_RESTITUTION_SECOND = 0.2
const FRUIT_BOUNCE_MIN_VY = 95
const FRUIT_BOUNCE_MAX_COUNT = 2
const FRUIT_LAND_ROLL_SPEED = 46
const FRUIT_ROLL_FRICTION = 720
const FRUIT_SETTLE_VX = 5
const FRUIT_WOOD_SEGMENT_PAD = 10
const HORIZ_BRANCH_FRUIT_EXCLUDE_X_PAD = 34
const HORIZ_BRANCH_FRUIT_EXCLUDE_Y_ABOVE = 22
const HORIZ_BRANCH_FRUIT_EXCLUDE_Y_BELOW = 110
const ANCHOR_CANOPY_MIN_ABOVE_BRANCH = 40
const FRUIT_CLUSTER_MIN_CELLS = 5
const FRUIT_CLUSTER_MIN_SPAN_CELLS = 2
const FRUIT_HANG_TRIES_MAX = 24
const FRUIT_HANG_TRIES_PER_CELL = 3
const FRUIT_HANG_JITTER_MAX = 0
const FRUIT_HANG_JITTER_FRAC = 0
//
// Foliage coverage mask: two rings outside the fruit edge. Only near-opaque
// mask pixels count — anti-aliased leaf rims and faint loose leaves read as
// air on screen, so a fruit resting on them looked like it was floating.
//
const FRUIT_MASK_RING_PADS = [3, 7]
const FRUIT_MASK_RING_SAMPLES = 12
const FRUIT_MASK_RING_MIN_COVERED = 12
const FRUIT_CLUSTER_MIN_NEIGHBOR_AVG = 1.5
const FRUIT_CLUSTER_INTERIOR_NEIGHBORS_MIN = 3
//
// Keep fallen fruit in front of the right trampoline cap so the centipede's
// feast stays visible (same cap scale as glow level0 TRAMP_RADIUS).
//
const GLOW_RIGHT_TRAMP_CAP_HALF = 38
const GLOW_FRUIT_TRAMP_ROLL_CLEAR = 16
const GLOW_FRUIT_TRAMP_HIDE_X_MAX = 148
const FRUIT_MASK_ALPHA_MIN = 235
const FRUIT_MASK_SOLID_GRID_STEP = 3
const FRUIT_MASK_SOLID_GRID_RADIUS = 4
const FOLIAGE_MASK_CELL_PAD_MULT = 2
const FRUIT_CANOPY_MIN_ABOVE_BRANCH = 52
const FRUIT_CANOPY_MAX_RIGHT_OF_TRAMP = 36

/**
 * X centre of the strip between trunk and branch trampoline (for anchor foliage pick).
 * @param {Object} cfg
 * @param {number} cfg.trunkX
 * @param {number} cfg.trunkHalf
 * @param {number} cfg.branchTrampX
 * @param {number} cfg.trampClearHalf
 * @returns {number}
 */
export function computeGlowAnchorFruitDropX(cfg) {
  const { trunkX, trunkHalf, branchTrampX, trampClearHalf } = cfg
  const stripLeft = trunkX + trunkHalf + ANCHOR_DROP_LEFT_PAD
  const stripRight = branchTrampX - trampClearHalf - ANCHOR_DROP_RIGHT_PAD
  return (stripLeft + stripRight) * 0.5
}

/**
 * Builds fruit attachment points (repeatable anchor on foliage + random canopy spots).
 * @param {Object} treeData - Output from buildGlowTree()
 * @param {Object} anchorDropCfg - Trunk/tramp layout for anchor cluster pick
 * @param {number} [anchorDropCfg.minHangY] - Topmost on-screen world Y; fruit above it is never placed
 * @returns {Array<Object>}
 */
export function buildGlowTreeFruitSpots(treeData, anchorDropCfg) {
  const rng = mulberry32(TREE_SEED + FRUIT_SEED_OFFSET)
  const hangable = collectHangableTreeFoliage(treeData, anchorDropCfg)
  if (!hangable.length) return []
  const cellPx = getTreePaletteColor().foliageClusterCellPx
  const hang = {
    treeData,
    cellPx,
    mask: buildFoliageMask(treeData, cellPx),
    minY: anchorDropCfg?.minHangY ?? -Infinity
  }
  const anchorR = FRUIT_RADIUS_MIN + 2.5
  const anchorHue = 0.62
  const anchorPick = pickAnchorFruitHang(hang, hangable, anchorDropCfg, anchorR)
  const anchorLeaf = anchorPick?.leaf ?? null
  //
  // A missing anchor spot only costs the droppable fruit — the rest of the
  // crown is still hung, so the colour-world tree is never bare.
  //
  const spots = anchorPick ? [{
    anchor: true,
    attached: true,
    x: anchorPick.pos.x,
    y: anchorPick.pos.y,
    r: anchorR,
    hue: anchorHue,
    vy: 0,
    leaves: makeFruitLeafPair(hashFruitLeafSeed(anchorPick.pos.x, anchorPick.pos.y, anchorHue), anchorR, rng, anchorHue)
  }] : []
  const pool = hangable.filter(f => f !== anchorLeaf)
  const pickN = Math.min(FRUIT_RANDOM_COUNT, pool.length)
  for (let n = 0; n < pickN; n++) {
    let placed = false
    for (let attempt = 0; attempt < 10 && pool.length; attempt++) {
      const idx = Math.floor(rng() * pool.length)
      const foliage = pool[idx]
      const r = FRUIT_RADIUS_MIN + rng() * FRUIT_RADIUS_RANGE
      const hue = 0.12 + rng() * 0.72
      const pos = pickValidFruitHangOnCluster(hang, foliage, r, rng)
      if (!pos) continue
      pool.splice(idx, 1)
      spots.push({
        attached: true,
        x: pos.x,
        y: pos.y,
        r,
        hue,
        vy: 0,
        leaves: makeFruitLeafPair(hashFruitLeafSeed(pos.x, pos.y, hue), r, rng, hue)
      })
      placed = true
      break
    }
    !placed && pool.length && pool.pop()
  }
  return spots
}

/**
 * True while the single branch-knocked apple is still falling or on the ground.
 * @param {Object} levelInst - Glow level inst
 * @returns {boolean}
 */
export function hasGlowAnchorFruitDropInWorld(levelInst) {
  const spots = levelInst.treeFruitSpots
  if (!spots?.length) return false
  return spots.some(f => f.fromAnchorDrop && !f.removed)
}

/**
 * Spawns the one falling anchor apple (start-branch knock). No second drop until
 * the centipede has eaten the current one.
 * @param {Object} levelInst - Glow level inst
 * @returns {boolean} True when an apple was knocked loose
 */
export function releaseGlowAnchorFruit(levelInst) {
  if (hasGlowAnchorFruitDropInWorld(levelInst)) return false
  const fruit = levelInst.treeFruitSpots?.find(f => f.anchor && f.attached)
  if (!fruit) return false
  levelInst.treeFruitSpots.push({
    fromAnchorDrop: true,
    attached: false,
    x: fruit.x,
    y: fruit.y,
    r: fruit.r,
    hue: fruit.hue,
    vy: 0,
    vx: 0,
    rollDir: pickFruitLandRollDir(fruit.x, fruit.y),
    leaves: fruit.leaves
  })
  return true
}

/**
 * Where the knocked apple still in the world lies (falling or waiting for the
 * centipede), null when there is none — saved level state.
 * @param {Object} levelInst - Glow level inst
 * @param {number} floorY - Ground surface Y used while it is still falling
 * @returns {{x: number, floorY: number}|null}
 */
export function getFallenAnchorFruit(levelInst, floorY) {
  const fruit = levelInst.treeFruitSpots?.find(f => f.fromAnchorDrop && !f.removed && !f.beingEaten)
  return fruit ? { x: fruit.x, floorY: fruit.settled ? (fruit._restFloorY ?? floorY) : floorY } : null
}

/**
 * Puts a saved knocked apple back on the ground at x, already settled, so
 * the centipede comes for it as before.
 * @param {Object} levelInst - Glow level inst
 * @param {number} x - Ground X of the apple
 * @param {number} floorY - Ground surface Y
 */
export function restoreFallenAnchorFruit(levelInst, x, floorY) {
  if (hasGlowAnchorFruitDropInWorld(levelInst)) return
  const anchor = levelInst.treeFruitSpots?.find(f => f.anchor && f.attached)
  if (!anchor) return
  levelInst.treeFruitSpots.push({
    fromAnchorDrop: true,
    attached: false,
    x,
    y: floorY - anchor.r - FRUIT_FALL_GROUND_PAD,
    r: anchor.r,
    hue: anchor.hue,
    vy: 0,
    vx: 0,
    rollDir: pickFruitLandRollDir(x, floorY),
    leaves: anchor.leaves,
    airborne: false,
    settled: true,
    _restFloorY: floorY
  })
}

/**
 * Steps falling fruit physics.
 * @param {Object} levelInst - Glow level inst
 * @param {number} dt - Frame delta
 * @param {number} floorY - Ground surface Y
 */
export function tickGlowTreeFruits(levelInst, dt, floorY) {
  const spots = levelInst.treeFruitSpots
  if (!spots?.length || floorY == null) return
  const now = levelInst.k?.time?.() ?? 0
  let prune = false
  spots.forEach(fruit => {
    if (fruit.removed) return
    if (fruit.attached) return
    if (!fruit.settled) {
      stepFallingFruit(fruit, dt, floorY, levelInst)
      return
    }
    fruit.settledAt == null && (fruit.settledAt = now)
    //
    // The knocked apple waits on the ground until the centipede eats it.
    //
    if (fruit.beingEaten || fruit.fromAnchorDrop) return
    const linger = now - fruit.settledAt
    if (!fruit.fadeOutStarted && linger >= FRUIT_GROUND_LINGER_SEC) {
      fruit.fadeOutStarted = true
      fruit.fadeOutT = 0
    }
    if (fruit.fadeOutStarted) {
      fruit.fadeOutT = (fruit.fadeOutT ?? 0) + dt
      fruit.fadeOutT >= FRUIT_GROUND_FADE_SEC && (fruit.removed = true, prune = true)
    }
  })
  prune && (levelInst.treeFruitSpots = spots.filter(f => !f.removed))
  spots.forEach(fruit => {
    if (fruit.removed || fruit.attached || fruit.beingEaten) return
    if (fruit.settled) nudgeGlowFruitClearOfRightTramp(levelInst, fruit)
  })
}

/**
 * Registers a fixed draw layer for tree fruits.
 * @param {Object} k - Kaplay inst
 * @param {Object} levelInst - Glow level inst (needs treeFruitSpots)
 */
export function mountGlowTreeFruitLayer(k, levelInst) {
  k.add([
    k.z(FRUIT_Z),
    {
      draw() {
        drawGlowTreeFruits(levelInst)
      }
    }
  ])
}

/**
 * Draws fruits when the main tree is visible.
 * @param {Object} inst - Glow level inst
 */
export function drawGlowTreeFruits(inst) {
  const spots = inst.treeFruitSpots
  if (!spots?.length) return
  const k = inst.k
  const fruitPal = GLOW_PAL.glowTreeFruit
  const bodyA = glowRgb(fruitPal.body)
  const bodyB = glowRgb(fruitPal.light)
  const shadeRgb = glowRgb(fruitPal.shade)
  const contourRgb = glowRgb(fruitPal.contour)
  const stem = glowRgb(GLOW_PAL.treeColor.root)
  //
  // The tree copy of the anchor apple regrows only after the fallen one is eaten.
  //
  const anchorDropInWorld = hasGlowAnchorFruitDropInWorld(inst)
  spots.forEach(fruit => {
    if (fruit.removed) return
    if (fruit.feastDrawHidden) return
    if (fruit.anchor && fruit.attached && anchorDropInWorld) return
    let op = 1
    fruit.fadeOutStarted && (op *= Math.max(0, 1 - (fruit.fadeOutT ?? 0) / FRUIT_GROUND_FADE_SEC))
    if (op <= 0.02) return
    const t = fruit.hue ?? 0.5
    const rgb = lerpRgb(bodyA, bodyB, t)
    const col = k.rgb(rgb.r, rgb.g, rgb.b)
    const stemCol = k.rgb(stem.r, stem.g, stem.b)
    const leaves = fruit.leaves ?? []
    leaves.forEach(leaf => {
      const leafRgb = leafRgbFromShadeIdx(leaf.shadeIdx)
      const lx = fruit.x + leaf.dx
      const ly = fruit.y + leaf.dy
      drawFruitLeaf(k, lx, ly, leaf.len, leaf.angle, leafRgb, op * 0.95)
    })
    fruit.attached && k.drawLine({
      p1: k.vec2(fruit.x, fruit.y - fruit.r),
      p2: k.vec2(fruit.x, fruit.y - fruit.r - FRUIT_STEM_LEN),
      width: 1.6,
      color: stemCol,
      opacity: op
    })
    const shadeCol = k.rgb(shadeRgb.r, shadeRgb.g, shadeRgb.b)
    const contourCol = k.rgb(contourRgb.r, contourRgb.g, contourRgb.b)
    drawFruitBody(k, fruit, col, shadeCol, contourCol, op)
    const highlight = glowRgb(fruitPal.light)
    const bodyR = fruitDisplayRadius(fruit)
    bodyR > 2 && k.drawCircle({
      pos: k.vec2(
        fruit.x + bodyR * GLOW_SUN_LIT_OFFSET_X - bodyR * 0.08,
        fruit.y + bodyR * GLOW_SUN_LIT_OFFSET_Y - bodyR * 0.1
      ),
      radius: bodyR * 0.18,
      color: k.rgb(highlight.r, highlight.g, highlight.b),
      opacity: op * 0.28
    })
  })
}

/**
 * @param {Object} fruit - Tree fruit spot
 * @returns {number}
 */
export function getGlowFruitDisplayRadius(fruit) {
  const progress = fruit.eatProgress ?? 0
  return fruit.r * (1 - progress * 0.94)
}
//
// Keeps a fallen fruit's bottom on the ground as bites shrink its radius.
//
export function keepGlowFruitRestingOnFloor(fruit) {
  if (!fruit || fruit.attached || fruit.removed) return
  const r = getGlowFruitDisplayRadius(fruit)
  if (fruit._restFloorY == null) {
    fruit._restFloorY = fruit.y + r + FRUIT_FALL_GROUND_PAD
  }
  fruit.y = fruit._restFloorY - r - FRUIT_FALL_GROUND_PAD
}

function fruitDisplayRadius(fruit) {
  return getGlowFruitDisplayRadius(fruit)
}

function drawFruitBody(k, fruit, col, shadeCol, contourCol, op) {
  const r = fruitDisplayRadius(fruit)
  if (r < 1.2) return
  const bites = fruit.biteCount ?? 0
  const eaten = (fruit.eatProgress ?? 0) > 0.02 || bites > 0
  if (eaten) {
    const pts = buildRaggedFruitPolygon(k, fruit.x, fruit.y, r, fruit.biteMarks ?? [], fruit.biteSeed ?? 0)
    pts.length >= 3 && k.drawPolygon({ pts, color: shadeCol, opacity: op })
    const litX = fruit.x + r * GLOW_SUN_LIT_OFFSET_X
    const litY = fruit.y + r * GLOW_SUN_LIT_OFFSET_Y
    const litPts = buildRaggedFruitPolygon(k, litX, litY, r * GLOW_SUN_LIT_FRAC, fruit.biteMarks ?? [], fruit.biteSeed ?? 0)
    litPts.length >= 3 && k.drawPolygon({ pts: litPts, color: col, opacity: op })
    return
  }
  k.drawCircle({
    pos: k.vec2(fruit.x, fruit.y),
    radius: r + FRUIT_CONTOUR_W,
    color: contourCol,
    opacity: op
  })
  k.drawCircle({
    pos: k.vec2(fruit.x, fruit.y),
    radius: r,
    color: shadeCol,
    opacity: op
  })
  k.drawCircle({
    pos: k.vec2(fruit.x + r * GLOW_SUN_LIT_OFFSET_X, fruit.y + r * GLOW_SUN_LIT_OFFSET_Y),
    radius: r * GLOW_SUN_LIT_FRAC,
    color: col,
    opacity: op
  })
}

function buildRaggedFruitPolygon(k, cx, cy, r, biteMarks, seed) {
  const steps = 16
  const pts = []
  for (let i = 0; i < steps; i++) {
    const a = (Math.PI * 2 * i) / steps
    let rr = r
    biteMarks.forEach(mark => {
      let da = a - mark.angle
      while (da > Math.PI) da -= Math.PI * 2
      while (da < -Math.PI) da += Math.PI * 2
      if (Math.abs(da) < mark.width) {
        rr *= 1 - mark.depth
      }
    })
    const wobble = (((seed + i * 17) % 97) / 97 - 0.5) * r * 0.06
    pts.push(k.vec2(cx + Math.cos(a) * (rr + wobble), cy + Math.sin(a) * (rr + wobble) * 0.92))
  }
  return pts
}

//
// The anchor fruit drops straight down, so its hang x decides where it lands.
// Scan every interior foliage cell and keep the valid one closest to the
// middle of the gap between trunk and left trampoline; cells whose fruit
// would overhang either side of the gap are skipped.
//
function pickAnchorFruitHang(hang, hangable, anchorDropCfg, fruitR) {
  const { trunkX, trunkHalf, branchTrampX: trampX, trampClearHalf } = anchorDropCfg
  const gapLeft = trunkX + trunkHalf + ANCHOR_DROP_LEFT_PAD + fruitR
  const gapRight = trampX - trampClearHalf - ANCHOR_DROP_RIGHT_PAD - fruitR
  const dropX = computeGlowAnchorFruitDropX(anchorDropCfg)
  const horiz = hang.treeData.horizBranch
  const ceilingY = horiz ? horiz.physY - ANCHOR_CANOPY_MIN_ABOVE_BRANCH : Infinity
  const targetY = horiz ? horiz.y - ANCHOR_LEAF_TARGET_Y_OFFSET : 0
  let best = null
  let bestScore = Infinity
  hangable.forEach(leaf => {
    leaf.cells.forEach(cell => {
      if (!isFruitClusterCellInterior(leaf.cells, cell)) return
      const pos = foliageCellCentre(leaf, cell, hang.cellPx)
      if (pos.x < gapLeft || pos.x > gapRight || pos.y > ceilingY) return
      const score = Math.abs(pos.x - dropX) + Math.abs(pos.y - targetY) * ANCHOR_Y_SCORE_WEIGHT
      if (score >= bestScore || !isValidFruitHang(hang, pos.x, pos.y, fruitR)) return
      bestScore = score
      best = { leaf, pos }
    })
  })
  return best
}

function foliageCellCentre(cluster, cell, cellPx) {
  return {
    x: Math.round(cluster.x) + cell.dx * cellPx + cellPx * 0.5,
    y: Math.round(cluster.y) + cell.dy * cellPx + cellPx * 0.5
  }
}

function collectHangableTreeFoliage(treeData, anchorDropCfg) {
  const cellPx = getTreePaletteColor().foliageClusterCellPx
  const horiz = treeData.horizBranch
  const canopyMaxY = horiz ? horiz.physY - FRUIT_CANOPY_MIN_ABOVE_BRANCH : Infinity
  const canopyMaxX = branchTrampX(anchorDropCfg) + FRUIT_CANOPY_MAX_RIGHT_OF_TRAMP
  return treeData.leaves.filter(leaf => {
    if (leaf.type !== 'cluster') return false
    if (!clusterHasLeafVolume(leaf.cells)) return false
    if (clusterNeighborAvg(leaf.cells) < FRUIT_CLUSTER_MIN_NEIGHBOR_AVG) return false
    const c = clusterCentroid(leaf, cellPx)
    if (c.y > canopyMaxY) return false
    return c.x <= canopyMaxX
  })
}
function branchTrampX(anchorDropCfg) {
  return anchorDropCfg?.branchTrampX ?? Infinity
}
function clusterCentroid(cluster, cellPx) {
  const ox = Math.round(cluster.x)
  const oy = Math.round(cluster.y)
  let sx = 0
  let sy = 0
  const n = cluster.cells.length || 1
  cluster.cells.forEach(cell => {
    sx += ox + cell.dx * cellPx
    sy += oy + cell.dy * cellPx
  })
  return { x: sx / n, y: sy / n }
}
//
// Candidate hang points are cell centres exactly as the bake paints them; a
// point only counts when the rendered foliage mask covers the whole fruit.
//
function pickValidFruitHangOnCluster(hang, cluster, fruitR, rng) {
  const tries = Math.min(FRUIT_HANG_TRIES_MAX, cluster.cells.length * FRUIT_HANG_TRIES_PER_CELL)
  for (let t = 0; t < tries; t++) {
    const cell = cluster.cells[Math.floor(rng() * cluster.cells.length)]
    if (!isFruitClusterCellInterior(cluster.cells, cell)) continue
    const pos = fruitPositionOnFoliageCell(cluster, cell, fruitR, rng, hang.cellPx)
    if (isValidFruitHang(hang, pos.x, pos.y, fruitR)) return pos
  }
  return null
}
function fruitPositionOnFoliageCell(cluster, cell, fruitR, rng, cellPx) {
  const jitter = Math.min(FRUIT_HANG_JITTER_MAX, fruitR * FRUIT_HANG_JITTER_FRAC)
  return {
    x: Math.round(cluster.x) + cell.dx * cellPx + cellPx * 0.5 + (rng() - 0.5) * jitter,
    y: Math.round(cluster.y) + cell.dy * cellPx + cellPx * 0.5 + (rng() - 0.5) * jitter
  }
}
function isFruitClusterCellInterior(cells, cell) {
  const set = new Set(cells.map(c => `${c.dx},${c.dy}`))
  let n = 0
  set.has(`${cell.dx + 1},${cell.dy}`) && (n += 1)
  set.has(`${cell.dx - 1},${cell.dy}`) && (n += 1)
  set.has(`${cell.dx},${cell.dy + 1}`) && (n += 1)
  set.has(`${cell.dx},${cell.dy - 1}`) && (n += 1)
  return n >= FRUIT_CLUSTER_INTERIOR_NEIGHBORS_MIN
}
function isValidFruitHang(hang, x, y, fruitR) {
  const { treeData, mask } = hang
  if (y - fruitR - FRUIT_STEM_LEN < hang.minY) return false
  if (isPointOnTreeWood(treeData, x, y)) return false
  const hb = treeData.horizBranch
  if (hb && isInHeroBranchFruitExcludeZone(hb, x, y)) return false
  return isFruitCoveredByFoliage(mask, x, y, fruitR)
}
//
// Centre, stem top and nearly the whole ring around the fruit must sit on
// painted leaves — a fruit on a canopy edge would read as floating in the air.
//
function isFruitCoveredByFoliage(mask, x, y, fruitR) {
  if (!isFoliageMaskSolid(mask, x, y)) return false
  if (!isFoliageMaskSolid(mask, x, y - fruitR - FRUIT_STEM_LEN)) return false
  if (!isFoliageMaskSolid(mask, x, y + fruitR * 0.35)) return false
  for (const pad of FRUIT_MASK_RING_PADS) {
    const ringR = fruitR + pad
    let covered = 0
    for (let i = 0; i < FRUIT_MASK_RING_SAMPLES; i++) {
      const a = (i / FRUIT_MASK_RING_SAMPLES) * Math.PI * 2
      isFoliageMaskSolid(mask, x + Math.cos(a) * ringR, y + Math.sin(a) * ringR) && (covered += 1)
    }
    if (covered < FRUIT_MASK_RING_MIN_COVERED) return false
  }
  for (let i = 0; i < 4; i++) {
    const a = Math.PI * 0.25 + (i / 4) * Math.PI
    if (!isFoliageMaskSolid(mask, x + Math.cos(a) * fruitR * 0.85, y + Math.sin(a) * fruitR * 0.85)) return false
  }
  return true
}
function isFoliageMaskSolid(mask, x, y) {
  if (!isFoliageMaskCovered(mask, x, y)) return false
  const step = FRUIT_MASK_SOLID_GRID_STEP
  const r = FRUIT_MASK_SOLID_GRID_RADIUS
  for (let oy = -r; oy <= r; oy += step) {
    for (let ox = -r; ox <= r; ox += step) {
      if (!isFoliageMaskCovered(mask, x + ox, y + oy)) return false
    }
  }
  return true
}
function isFoliageMaskCovered(mask, x, y) {
  const px = Math.round(x) - mask.x
  const py = Math.round(y) - mask.y
  if (px < 0 || py < 0 || px >= mask.w || py >= mask.h) return false
  return mask.data[(py * mask.w + px) * 4 + 3] > FRUIT_MASK_ALPHA_MIN
}
//
// One CPU-only canvas, read once while the fruit layout is built (never per frame).
//
function buildFoliageMask(treeData, cellPx) {
  const bounds = foliageBounds(treeData, cellPx)
  const w = Math.max(1, Math.ceil(bounds.x2 - bounds.x1))
  const h = Math.max(1, Math.ceil(bounds.y2 - bounds.y1))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.translate(-bounds.x1, -bounds.y1)
  paintGlowTreeFoliageMask(ctx, treeData, cellPx)
  const data = ctx.getImageData(0, 0, w, h).data
  canvas.width = 0
  canvas.height = 0
  return { x: bounds.x1, y: bounds.y1, w, h, data }
}
function foliageBounds(treeData, cellPx) {
  const bounds = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  const pad = cellPx * FOLIAGE_MASK_CELL_PAD_MULT
  const grow = (x, y, r) => {
    bounds.x1 = Math.min(bounds.x1, x - r)
    bounds.y1 = Math.min(bounds.y1, y - r)
    bounds.x2 = Math.max(bounds.x2, x + r)
    bounds.y2 = Math.max(bounds.y2, y + r)
  }
  treeData.leaves.forEach(leaf => {
    if (leaf.type !== 'cluster') {
      grow(leaf.x, leaf.y, leaf.size)
      return
    }
    leaf.cells.forEach(c => grow(Math.round(leaf.x) + c.dx * cellPx, Math.round(leaf.y) + c.dy * cellPx, pad))
  })
  //
  // Tree segments bake into a world-sized canvas starting at 0,0 — leaves
  // past its edges are never drawn, so fruit must not hang there either.
  //
  bounds.x1 = Math.max(0, Math.floor(bounds.x1))
  bounds.y1 = Math.max(0, Math.floor(bounds.y1))
  bounds.x2 = Math.min(CFG.visual.glow.worldWidth, bounds.x2)
  bounds.y2 = Math.min(CFG.visual.glow.worldHeight, bounds.y2)
  return bounds
}
function clusterHasLeafVolume(cells) {
  if (cells.length < FRUIT_CLUSTER_MIN_CELLS) return false
  let minDy = 0
  let maxDy = 0
  cells.forEach(c => {
    minDy = Math.min(minDy, c.dy)
    maxDy = Math.max(maxDy, c.dy)
  })
  return maxDy - minDy >= FRUIT_CLUSTER_MIN_SPAN_CELLS - 1
}
function clusterNeighborAvg(cells) {
  const set = new Set(cells.map(c => `${c.dx},${c.dy}`))
  let total = 0
  cells.forEach(c => {
    let n = 0
    set.has(`${c.dx + 1},${c.dy}`) && (n += 1)
    set.has(`${c.dx - 1},${c.dy}`) && (n += 1)
    set.has(`${c.dx},${c.dy + 1}`) && (n += 1)
    set.has(`${c.dx},${c.dy - 1}`) && (n += 1)
    total += n
  })
  return total / cells.length
}

function isInHeroBranchFruitExcludeZone(horizBranch, x, y) {
  const xMin = Math.min(horizBranch.x1, horizBranch.x2) - HORIZ_BRANCH_FRUIT_EXCLUDE_X_PAD
  const xMax = Math.max(horizBranch.x1, horizBranch.x2) + HORIZ_BRANCH_FRUIT_EXCLUDE_X_PAD
  const yTop = horizBranch.physY - HORIZ_BRANCH_FRUIT_EXCLUDE_Y_ABOVE
  const yBot = horizBranch.y + HORIZ_BRANCH_FRUIT_EXCLUDE_Y_BELOW
  return x >= xMin && x <= xMax && y >= yTop && y <= yBot
}

function isPointOnTreeWood(treeData, x, y) {
  for (const seg of treeData.trunkSegs ?? []) {
    if (distanceToWoodSegment(x, y, seg) <= FRUIT_WOOD_SEGMENT_PAD) return true
  }
  for (const seg of treeData.branchSegs ?? []) {
    if (distanceToWoodSegment(x, y, seg) <= FRUIT_WOOD_SEGMENT_PAD) return true
  }
  return false
}

function distanceToWoodSegment(px, py, seg) {
  const half = (seg.w ?? 8) * 0.5
  const dist = distancePointToSegment(px, py, seg.sx, seg.sy, seg.ex, seg.ey)
  return dist - half
}

function distancePointToSegment(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const lenSq = dx * dx + dy * dy
  if (lenSq < 1e-6) return Math.hypot(px - x1, py - y1)
  let t = ((px - x1) * dx + (py - y1) * dy) / lenSq
  t = Math.max(0, Math.min(1, t))
  const cx = x1 + t * dx
  const cy = y1 + t * dy
  return Math.hypot(px - cx, py - cy)
}

function makeFruitLeafPair(seed, fruitR, rng, hue) {
  const r = mulberry32(seed >>> 0)
  const jitter = () => (rng ? rng() : r())
  const shadeCount = (GLOW_PAL.treeColor.leafShades || [GLOW_PAL.treeColor.leaf]).length
  const hueSkew = (hue ?? 0.5) * 0.55
  const angleA = -0.38 - hueSkew - jitter() * 0.35
  const angleB = 0.22 + hueSkew * 0.85 + jitter() * 0.4
  const lenA = 4.2 + jitter() * 3.6
  const lenB = 3.8 + jitter() * 3.2
  return [
    {
      dx: -fruitR * (0.38 + jitter() * 0.22),
      dy: -fruitR * (0.48 + jitter() * 0.14),
      len: lenA,
      angle: angleA,
      shadeIdx: Math.floor(jitter() * shadeCount)
    },
    {
      dx: fruitR * (0.32 + jitter() * 0.26),
      dy: -fruitR * (0.52 + jitter() * 0.16),
      len: lenB,
      angle: angleB,
      shadeIdx: Math.floor(jitter() * shadeCount)
    }
  ]
}

function leafRgbFromShadeIdx(shadeIdx) {
  const shades = GLOW_PAL.treeColor.leafShades || [GLOW_PAL.treeColor.leaf]
  const i = ((shadeIdx ?? 0) % shades.length + shades.length) % shades.length
  return glowRgb(shades[i])
}

function stepFallingFruit(fruit, dt, floorY, levelInst) {
  const restY = floorY - fruit.r - FRUIT_FALL_GROUND_PAD
  fruit.vx = fruit.vx ?? 0
  if (fruit.airborne == null) fruit.airborne = true
  if (fruit.airborne) {
    fruit.vy = (fruit.vy ?? 0) + FRUIT_FALL_GRAVITY * dt
    fruit.y += fruit.vy * dt
    if (fruit.y >= restY && fruit.vy >= 0) {
      fruit.y = restY
      fruit._restFloorY = restY + fruit.r + FRUIT_FALL_GROUND_PAD
      fruit.fromAnchorDrop && !fruit._anchorFallSoundPlayed &&
        levelInst?.sound &&
        (fruit._anchorFallSoundPlayed = true, Sound.playGlowAppleSoftFall(levelInst.sound))
      const nextVy = applyFruitGroundImpact(fruit, fruit.vy)
      fruit.vy = nextVy
      fruit.airborne = nextVy !== 0
    }
    return
  }
  fruit.y = restY
  fruit._restFloorY == null && (fruit._restFloorY = restY + fruit.r + FRUIT_FALL_GROUND_PAD)
  fruit.vy = 0
  fruit.x += fruit.vx * dt
  fruit.vx = decayFruitRollSpeed(fruit.vx, dt)
  if (Math.abs(fruit.vx) < FRUIT_SETTLE_VX) {
    fruit.vx = 0
    fruit.settled = true
    levelInst && nudgeGlowFruitClearOfRightTramp(levelInst, fruit)
  }
}

function nudgeGlowFruitClearOfRightTramp(levelInst, fruit) {
  const trampX = levelInst.trampState?.x
  if (trampX == null) return
  const r = getGlowFruitDisplayRadius(fruit)
  const capHalf = GLOW_RIGHT_TRAMP_CAP_HALF
  const blockMin = trampX - capHalf - r - 10
  const blockMax = trampX + GLOW_FRUIT_TRAMP_HIDE_X_MAX
  if (fruit.x < blockMin || fruit.x > blockMax) return
  const lakeX1 = levelInst.lakeX1 ?? 0
  fruit.x = Math.max(lakeX1 + 52, trampX - capHalf - r - GLOW_FRUIT_TRAMP_ROLL_CLEAR)
  fruit.vx = -Math.max(Math.abs(fruit.vx ?? 0), FRUIT_LAND_ROLL_SPEED * 0.65)
  fruit.rollDir = -1
  fruit.settled = false
  fruit.airborne = false
}

function applyFruitGroundImpact(fruit, impactVy) {
  const bounceN = fruit.bounceCount ?? 0
  if (impactVy >= FRUIT_BOUNCE_MIN_VY && bounceN < FRUIT_BOUNCE_MAX_COUNT) {
    const rest = bounceN === 0 ? FRUIT_BOUNCE_RESTITUTION_FIRST : FRUIT_BOUNCE_RESTITUTION_SECOND
    if (bounceN === 0) {
      const roll = (fruit.rollDir ?? 1) * FRUIT_LAND_ROLL_SPEED * Math.min(1.15, impactVy / 420)
      fruit.vx = (fruit.vx ?? 0) + roll
    }
    fruit.bounceCount = bounceN + 1
    return -impactVy * rest
  }
  if (bounceN === 0 && Math.abs(fruit.vx ?? 0) < 8) {
    fruit.vx = (fruit.vx ?? 0) + (fruit.rollDir ?? 1) * FRUIT_LAND_ROLL_SPEED * 0.45
  }
  return 0
}

function decayFruitRollSpeed(vx, dt) {
  const fr = FRUIT_ROLL_FRICTION * dt
  if (vx > 0) return Math.max(0, vx - fr)
  if (vx < 0) return Math.min(0, vx + fr)
  return 0
}

function pickFruitLandRollDir(x, y) {
  const h = mulberry32((Math.round(x * 2.7) ^ Math.round(y * 4.1)) >>> 0)()
  return h < 0.42 ? -1 : 1
}

function hashFruitLeafSeed(x, y, hue) {
  return (Math.round(x * 3.1) ^ Math.round(y * 5.7) ^ Math.round(hue * 997) ^ FRUIT_LEAF_SEED) >>> 0
}

function drawFruitLeaf(k, x, y, size, angle, rgb, op) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const rot = (lx, ly) => k.vec2(x + lx * cos - ly * sin, y + lx * sin + ly * cos)
  const pts = [
    rot(0, 0),
    rot(-size * 0.62, -size * 0.32),
    rot(0, -size),
    rot(size * 0.62, -size * 0.32)
  ]
  k.drawPolygon({ pts, color: k.rgb(rgb.r, rgb.g, rgb.b), opacity: op })
}

function lerpRgb(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t)
  }
}

function mulberry32(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
