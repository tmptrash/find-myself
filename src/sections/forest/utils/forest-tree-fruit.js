import { CFG } from '../../../cfg.js'
import * as Sound from '../../../utils/sound.js'
import { FOREST_SUN_LIT_FRAC, FOREST_SUN_LIT_OFFSET_X, FOREST_SUN_LIT_OFFSET_Y } from './forest-eye-berry.js'
import { FOREST_PAL, getTreePaletteColor, forestRgb } from './forest-palette.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { TREE_SEED, collectForestTreeClusterLeaves, paintForestTreeClusterLeaves, paintForestTreeFoliageMask } from './forest-tree.js'

//
// Decorative canopy fruit on the main forest tree (game palette only).
//
const FRUIT_SEED_OFFSET = 8803
const FRUIT_RANDOM_COUNT = 7
//
// Fallen anchor fruit vanishes after this if the centipede never claims it.
//
const FRUIT_GROUND_LINGER_SEC = 10
const FRUIT_GROUND_FADE_SEC = 0.9
const FRUIT_ANCHOR_R = 8.5
const FRUIT_ANCHOR_HUE = 0.62
//
// Fruit hangs from the free tips of thin twigs on a short visible stem.
//
const FRUIT_TWIG_TIP_MAX_W = 3.2
const FRUIT_TIP_STEM_LEN_MIN = 5
const FRUIT_TIP_STEM_LEN_RANGE = 3
const FRUIT_TIP_LEAN_MAX = 0.35
const FRUIT_STEM_W = 1.8
const FRUIT_STEM_CONTOUR_W = 1
//
// The fruit must touch painted foliage (ring cover). Depth = distance to the
// crown's silhouette: fruit on the front edge is big and bright, fruit deep
// inside is small, darker and partly hidden behind canopy leaves re-painted
// on top of it.
//
const FRUIT_DEPTH_RING_PAD = 5
const FRUIT_DEPTH_RING_SAMPLES = 16
const FRUIT_DEPTH_MIN_COVER = 0.3
const FRUIT_EDGE_DEPTH_PX = 28
const FRUIT_EDGE_RAYS = 12
const FRUIT_EDGE_STEP_PX = 3
const FRUIT_R_NEAR = 11
const FRUIT_R_DEEP = 5
const FRUIT_R_JITTER = 0.8
const FRUIT_R_PROBE = 8
const FRUIT_HUE_NEAR = 0.8
const FRUIT_HUE_DEEP = 0.2
const FRUIT_COVER_DEPTH_MIN = 0.12
const FRUIT_COVER_FRAC_MIN = 0.2
const FRUIT_COVER_FRAC_MAX = 0.42
const FRUIT_COVER_FRAC_JITTER = 0.35
const FRUIT_COVER_SKIP_CHANCE = 0.35
const FRUIT_COVER_SIDE_JITTER = 0.8
const FRUIT_COVER_SIDE_MIN = 0.7
const FRUIT_COVER_CHORD_SCALE = 1.75
const FRUIT_COVER_LEAF_REACH = 0.25
const FRUIT_COVER_LEAF_CENTROID = 0.45
const FRUIT_COVER_SPRITE = 'forest-tree-fruit-cover'
const FRUIT_COVER_GRAIN_SEED = 6011
const FRUIT_COVER_BAKE_PAD = 2
//
// Spacing keeps the crown from reading as a polka-dot pattern: no fruit in a
// vertical stack, none crowded against another.
//
const FRUIT_MIN_SPACING = 42
const FRUIT_STACK_DX = 24
const FRUIT_STACK_DY = 90
const ANCHOR_DROP_LEFT_PAD = 16
const ANCHOR_DROP_RIGHT_PAD = 12
const ANCHOR_LEAF_TARGET_Y_OFFSET = 48
const ANCHOR_Y_SCORE_WEIGHT = 0.25
const FRUIT_STEM_LEN = 4
const FRUIT_CONTOUR_W = 1.2
const FRUIT_Z = CFG.visual.zIndex.platforms - 1
const FRUIT_FALL_GRAVITY = 1650
//
// A landed apple settles a little INTO the ground (its bottom this many px
// below the floor line) so it nests in the grass instead of hovering above it.
//
const FRUIT_GROUND_SINK = 5
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
// feast stays visible (same cap scale as forest level0 TRAMP_RADIUS).
//
const FOREST_RIGHT_TRAMP_CAP_HALF = 38
const FOREST_FRUIT_TRAMP_ROLL_CLEAR = 16
const FOREST_FRUIT_TRAMP_HIDE_X_MAX = 148
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
export function computeForestAnchorFruitDropX(cfg) {
  const { x1, x2 } = forestAnchorFruitGroundClearSpan(cfg)
  return (x1 + x2) * 0.5
}

/**
 * World X span on the ground kept clear for the knocked anchor apple (between
 * trunk and branch-trampoline pads). Matches the foliage pick gap.
 * @param {Object} cfg
 * @param {number} cfg.trunkX
 * @param {number} cfg.trunkHalf
 * @param {number} cfg.branchTrampX
 * @param {number} cfg.trampClearHalf
 * @returns {{ x1: number, x2: number }}
 */
export function forestAnchorFruitGroundClearSpan(cfg) {
  const { trunkX, trunkHalf, branchTrampX, trampClearHalf } = cfg
  return {
    x1: trunkX + trunkHalf + ANCHOR_DROP_LEFT_PAD,
    x2: branchTrampX - trampClearHalf - ANCHOR_DROP_RIGHT_PAD
  }
}

/**
 * True when world X lies in the anchor-apple ground strip (no grass / ferns).
 * @param {number} x - World X
 * @param {Object} cfg - Same layout object as computeForestAnchorFruitDropX
 * @returns {boolean}
 */
export function isForestAnchorFruitGroundX(x, cfg) {
  const { x1, x2 } = forestAnchorFruitGroundClearSpan(cfg)
  return x >= x1 && x <= x2
}

/**
 * Builds fruit attachment points (repeatable anchor on foliage + random canopy spots).
 * @param {Object} treeData - Output from buildForestTree()
 * @param {Object} anchorDropCfg - Trunk/tramp layout for anchor cluster pick
 * @param {number} [anchorDropCfg.minHangY] - Topmost on-screen world Y; fruit above it is never placed
 * @returns {Array<Object>}
 */
export function buildForestTreeFruitSpots(treeData, anchorDropCfg) {
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
  const tips = collectTwigTipHangs(hang, anchorDropCfg, rng)
  const anchor = pickAnchorTipHang(tips, anchorDropCfg, treeData.horizBranch) ?? pickAnchorClusterHang(hang, hangable, anchorDropCfg, rng)
  //
  // A missing anchor spot only costs the droppable fruit — the rest of the
  // crown is still hung, so the colour-world tree is never bare.
  //
  const spots = anchor ? [anchor] : []
  const leaves = collectForestTreeClusterLeaves(treeData, getTreePaletteColor())
  shuffleInPlace(tips, rng)
  tips.sort((a, b) => Number(b.isTip) - Number(a.isTip))
  for (const tip of tips) {
    if (spots.length - (anchor ? 1 : 0) >= FRUIT_RANDOM_COUNT) break
    if (spots.some(s => fruitSpotsTooClose(s, tip))) continue
    spots.push(makeTwigFruitSpot(tip, leaves, rng))
  }
  return spots
}

/**
 * True while the single branch-knocked apple is still falling or on the ground.
 * @param {Object} levelInst - Forest level inst
 * @returns {boolean}
 */
export function hasForestAnchorFruitDropInWorld(levelInst) {
  const spots = levelInst.treeFruitSpots
  if (!spots?.length) return false
  return spots.some(f => f.fromAnchorDrop && !f.removed)
}

/**
 * Spawns the one falling anchor apple (start-branch knock). No second drop until
 * the centipede has eaten the current one.
 * @param {Object} levelInst - Forest level inst
 * @returns {boolean} True when an apple was knocked loose
 */
export function releaseForestAnchorFruit(levelInst) {
  if (hasForestAnchorFruitDropInWorld(levelInst)) return false
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
 * @param {Object} levelInst - Forest level inst
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
 * @param {Object} levelInst - Forest level inst
 * @param {number} x - Ground X of the apple
 * @param {number} floorY - Ground surface Y
 */
export function restoreFallenAnchorFruit(levelInst, x, floorY) {
  if (hasForestAnchorFruitDropInWorld(levelInst)) return
  const anchor = levelInst.treeFruitSpots?.find(f => f.anchor && f.attached)
  if (!anchor) return
  levelInst.treeFruitSpots.push({
    fromAnchorDrop: true,
    attached: false,
    x,
    y: floorY - anchor.r + FRUIT_GROUND_SINK,
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
 * @param {Object} levelInst - Forest level inst
 * @param {number} dt - Frame delta
 * @param {number} floorY - Ground surface Y
 */
export function tickForestTreeFruits(levelInst, dt, floorY) {
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
    if (fruit.settled) nudgeForestFruitClearOfRightTramp(levelInst, fruit)
  })
}

/**
 * Registers a fixed draw layer for tree fruits. Canopy leaves that sit in
 * front of deep fruit are baked once per scene run into one sprite drawn
 * over the fruit, so those apples read as hanging inside the crown.
 * @param {Object} k - Kaplay inst
 * @param {Object} levelInst - Forest level inst (needs treeFruitSpots)
 */
export function mountForestTreeFruitLayer(k, levelInst) {
  levelInst.treeFruitCover = bakeFruitLeafCover(k, levelInst.treeFruitSpots ?? [])
  k.add([
    k.z(FRUIT_Z),
    {
      draw() {
        drawForestTreeFruits(levelInst)
      }
    }
  ])
}

/**
 * Draws fruits when the main tree is visible.
 * @param {Object} inst - Forest level inst
 */
export function drawForestTreeFruits(inst) {
  const spots = inst.treeFruitSpots
  if (!spots?.length) return
  const k = inst.k
  const fruitPal = FOREST_PAL.forestTreeFruit
  const bodyA = forestRgb(fruitPal.body)
  const bodyB = forestRgb(fruitPal.light)
  const shadeRgb = forestRgb(fruitPal.shade)
  const contourRgb = forestRgb(fruitPal.contour)
  const stem = forestRgb(FOREST_PAL.treeColor.root)
  //
  // The tree copy of the anchor apple regrows only after the fallen one is eaten.
  //
  const anchorDropInWorld = hasForestAnchorFruitDropInWorld(inst)
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
    const shadeCol = k.rgb(shadeRgb.r, shadeRgb.g, shadeRgb.b)
    const contourCol = k.rgb(contourRgb.r, contourRgb.g, contourRgb.b)
    fruit.attached && drawFruitStem(k, fruit, stemCol, contourCol, op)
    drawFruitBody(k, fruit, col, shadeCol, contourCol, op)
    const highlight = forestRgb(fruitPal.light)
    const bodyR = fruitDisplayRadius(fruit)
    bodyR > 2 && k.drawCircle({
      pos: k.vec2(
        fruit.x + bodyR * FOREST_SUN_LIT_OFFSET_X - bodyR * 0.08,
        fruit.y + bodyR * FOREST_SUN_LIT_OFFSET_Y - bodyR * 0.1
      ),
      radius: bodyR * 0.18,
      color: k.rgb(highlight.r, highlight.g, highlight.b),
      opacity: op * 0.28
    })
  })
  const cover = inst.treeFruitCover
  cover && k.drawSprite({ sprite: FRUIT_COVER_SPRITE, pos: k.vec2(cover.x, cover.y) })
}

/**
 * @param {Object} fruit - Tree fruit spot
 * @returns {number}
 */
export function getForestFruitDisplayRadius(fruit) {
  const progress = fruit.eatProgress ?? 0
  return fruit.r * (1 - progress * 0.94)
}
//
// Keeps a fallen fruit's bottom on the ground as bites shrink its radius.
//
export function keepForestFruitRestingOnFloor(fruit) {
  if (!fruit || fruit.attached || fruit.removed) return
  const r = getForestFruitDisplayRadius(fruit)
  if (fruit._restFloorY == null) {
    fruit._restFloorY = fruit.y + r - FRUIT_GROUND_SINK
  }
  fruit.y = fruit._restFloorY - r + FRUIT_GROUND_SINK
}

function fruitDisplayRadius(fruit) {
  return getForestFruitDisplayRadius(fruit)
}

function drawFruitBody(k, fruit, col, shadeCol, contourCol, op) {
  const r = fruitDisplayRadius(fruit)
  if (r < 1.2) return
  const bites = fruit.biteCount ?? 0
  const eaten = (fruit.eatProgress ?? 0) > 0.02 || bites > 0
  if (eaten) {
    const pts = buildRaggedFruitPolygon(k, fruit.x, fruit.y, r, fruit.biteMarks ?? [], fruit.biteSeed ?? 0)
    pts.length >= 3 && k.drawPolygon({ pts, color: shadeCol, opacity: op })
    const litX = fruit.x + r * FOREST_SUN_LIT_OFFSET_X
    const litY = fruit.y + r * FOREST_SUN_LIT_OFFSET_Y
    const litPts = buildRaggedFruitPolygon(k, litX, litY, r * FOREST_SUN_LIT_FRAC, fruit.biteMarks ?? [], fruit.biteSeed ?? 0)
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
    pos: k.vec2(fruit.x + r * FOREST_SUN_LIT_OFFSET_X, fruit.y + r * FOREST_SUN_LIT_OFFSET_Y),
    radius: r * FOREST_SUN_LIT_FRAC,
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
// Every free twig tip (a segment end no other segment grows from) that can
// carry a fruit: stem down from the tip, fruit sized by how deep in the
// crown it hangs.
//
function collectTwigTipHangs(hang, anchorDropCfg, rng) {
  const segs = hang.treeData.branchSegs ?? []
  const starts = new Set(segs.map(s => `${s.sx},${s.sy}`))
  const horiz = hang.treeData.horizBranch
  const canopyMaxY = horiz ? horiz.physY - FRUIT_CANOPY_MIN_ABOVE_BRANCH : Infinity
  const canopyMaxX = branchTrampX(anchorDropCfg) + FRUIT_CANOPY_MAX_RIGHT_OF_TRAMP
  const out = []
  segs.forEach(seg => {
    if ((seg.w2 ?? seg.w) > FRUIT_TWIG_TIP_MAX_W || seg.ey < hang.minY) return
    const len = Math.hypot(seg.ex - seg.sx, seg.ey - seg.sy) || 1
    const lean = Math.max(-FRUIT_TIP_LEAN_MAX, Math.min(FRUIT_TIP_LEAN_MAX, (seg.ex - seg.sx) / len * FRUIT_TIP_LEAN_MAX))
    const stemLen = FRUIT_TIP_STEM_LEN_MIN + rng() * FRUIT_TIP_STEM_LEN_RANGE
    const probe = hangFromTip(seg.ex, seg.ey, lean, stemLen, FRUIT_R_PROBE)
    if (foliageRingCover(hang.mask, probe.x, probe.y, FRUIT_R_PROBE) < FRUIT_DEPTH_MIN_COVER) return
    const depth = foliageEdgeDepth(hang.mask, probe.x, probe.y)
    const r = FRUIT_R_NEAR + (FRUIT_R_DEEP - FRUIT_R_NEAR) * depth + (rng() - 0.5) * FRUIT_R_JITTER * 2
    const pos = hangFromTip(seg.ex, seg.ey, lean, stemLen, r)
    if (pos.y > canopyMaxY || pos.x > canopyMaxX) return
    if (horiz && isInHeroBranchFruitExcludeZone(horiz, pos.x, pos.y)) return
    if (isPointOnTreeWood(hang.treeData, pos.x, pos.y)) return
    out.push({
      x: pos.x,
      y: pos.y,
      r,
      depth,
      inward: foliageInwardSide(hang.mask, pos.x, pos.y),
      stemX: seg.ex,
      stemY: seg.ey,
      isTip: !starts.has(`${seg.ex},${seg.ey}`)
    })
  })
  return out
}
//
// Fruit centre below a twig tip: the stem leans slightly with the twig.
//
function hangFromTip(tipX, tipY, lean, stemLen, r) {
  return {
    x: tipX + Math.sin(lean) * (stemLen + r),
    y: tipY + Math.cos(lean) * (stemLen + r)
  }
}
//
// Share of the ring just outside the fruit that lies on painted leaves.
//
function foliageRingCover(mask, x, y, r) {
  const ringR = r + FRUIT_DEPTH_RING_PAD
  let covered = 0
  for (let i = 0; i < FRUIT_DEPTH_RING_SAMPLES; i++) {
    const a = (i / FRUIT_DEPTH_RING_SAMPLES) * Math.PI * 2
    isFoliageMaskCovered(mask, x + Math.cos(a) * ringR, y + Math.sin(a) * ringR) && (covered += 1)
  }
  return covered / FRUIT_DEPTH_RING_SAMPLES
}
//
// 0 on the crown's silhouette, 1 once the nearest gap in the leaves is
// FRUIT_EDGE_DEPTH_PX away in every direction.
//
function foliageEdgeDepth(mask, x, y) {
  let nearest = FRUIT_EDGE_DEPTH_PX
  for (let i = 0; i < FRUIT_EDGE_RAYS; i++) {
    const a = (i / FRUIT_EDGE_RAYS) * Math.PI * 2
    nearest = Math.min(nearest, foliageRayReach(mask, x, y, a, nearest))
  }
  return nearest / FRUIT_EDGE_DEPTH_PX
}
//
// Direction (radians from straight up, clockwise) toward the thickest
// foliage around a point — cover leaves come from the crown's inner side.
//
function foliageInwardSide(mask, x, y) {
  let sx = 0
  let sy = 0
  for (let i = 0; i < FRUIT_EDGE_RAYS; i++) {
    const a = (i / FRUIT_EDGE_RAYS) * Math.PI * 2
    const reach = foliageRayReach(mask, x, y, a, FRUIT_EDGE_DEPTH_PX)
    sx += Math.cos(a) * reach
    sy += Math.sin(a) * reach
  }
  return Math.atan2(sx, -sy)
}
function foliageRayReach(mask, x, y, a, maxD) {
  for (let d = FRUIT_EDGE_STEP_PX; d < maxD; d += FRUIT_EDGE_STEP_PX) {
    if (!isFoliageMaskCovered(mask, x + Math.cos(a) * d, y + Math.sin(a) * d)) return d
  }
  return maxD
}
//
// The anchor fruit drops straight down, so its hang x decides where it lands:
// keep the twig tip closest to the middle of the trunk–trampoline gap.
//
function pickAnchorTipHang(tips, anchorDropCfg, horiz) {
  const best = pickBestAnchorPos(tips, anchorDropCfg, horiz)
  if (!best) return null
  tips.splice(tips.indexOf(best), 1)
  return {
    anchor: true,
    attached: true,
    x: best.x,
    y: best.y - best.r + FRUIT_ANCHOR_R,
    r: FRUIT_ANCHOR_R,
    hue: FRUIT_ANCHOR_HUE,
    vy: 0,
    leaves: [],
    stemX: best.stemX,
    stemY: best.stemY
  }
}
//
// Fallback when no twig tip fits the gap: the old interior-foliage-cell scan.
// Cells whose fruit would overhang either side of the gap are skipped.
//
function pickAnchorClusterHang(hang, hangable, anchorDropCfg, rng) {
  const cells = []
  hangable.forEach(leaf => {
    leaf.cells.forEach(cell => {
      if (!isFruitClusterCellInterior(leaf.cells, cell)) return
      const pos = foliageCellCentre(leaf, cell, hang.cellPx)
      isValidFruitHang(hang, pos.x, pos.y, FRUIT_ANCHOR_R) && cells.push(pos)
    })
  })
  const pos = pickBestAnchorPos(cells, anchorDropCfg, hang.treeData.horizBranch)
  if (!pos) return null
  return {
    anchor: true,
    attached: true,
    x: pos.x,
    y: pos.y,
    r: FRUIT_ANCHOR_R,
    hue: FRUIT_ANCHOR_HUE,
    vy: 0,
    leaves: makeFruitLeafPair(hashFruitLeafSeed(pos.x, pos.y, FRUIT_ANCHOR_HUE), FRUIT_ANCHOR_R, rng, FRUIT_ANCHOR_HUE)
  }
}
//
// Lowest score inside the drop gap: distance to the gap middle plus a light
// pull toward the canopy height just above the hero branch.
//
function pickBestAnchorPos(items, anchorDropCfg, horiz) {
  const { trunkX, trunkHalf, branchTrampX: trampX, trampClearHalf } = anchorDropCfg
  const gapLeft = trunkX + trunkHalf + ANCHOR_DROP_LEFT_PAD + FRUIT_ANCHOR_R
  const gapRight = trampX - trampClearHalf - ANCHOR_DROP_RIGHT_PAD - FRUIT_ANCHOR_R
  const dropX = computeForestAnchorFruitDropX(anchorDropCfg)
  const ceilingY = horiz ? horiz.physY - ANCHOR_CANOPY_MIN_ABOVE_BRANCH : Infinity
  const targetY = horiz ? horiz.y - ANCHOR_LEAF_TARGET_Y_OFFSET : 0
  let best = null
  let bestScore = Infinity
  items.forEach(item => {
    if (item.x < gapLeft || item.x > gapRight || item.y > ceilingY) return
    const score = Math.abs(item.x - dropX) + Math.abs(item.y - targetY) * ANCHOR_Y_SCORE_WEIGHT
    if (score >= bestScore) return
    bestScore = score
    best = item
  })
  return best
}
//
// Ordinary crown fruit: deeper fruit is smaller, darker and some of it gets
// a leaf cover over one side.
//
function makeTwigFruitSpot(tip, leaves, rng) {
  const coverRoll = rng()
  const side = keepStemSideOpen(tip.inward + (rng() - 0.5) * FRUIT_COVER_SIDE_JITTER)
  const depthT = (tip.depth - FRUIT_COVER_DEPTH_MIN) / (1 - FRUIT_COVER_DEPTH_MIN)
  const covered = depthT > 0 && coverRoll >= FRUIT_COVER_SKIP_CHANCE
  const frac = FRUIT_COVER_FRAC_MIN + (FRUIT_COVER_FRAC_MAX - FRUIT_COVER_FRAC_MIN) * Math.min(1, depthT + rng() * FRUIT_COVER_FRAC_JITTER)
  return {
    attached: true,
    x: tip.x,
    y: tip.y,
    r: tip.r,
    hue: FRUIT_HUE_NEAR + (FRUIT_HUE_DEEP - FRUIT_HUE_NEAR) * tip.depth,
    vy: 0,
    leaves: [],
    stemX: tip.stemX,
    stemY: tip.stemY,
    cover: covered ? collectCoverLeaves(leaves, tip, side, frac) : []
  }
}
//
// Canopy leaves lying over the chosen side of the fruit, beyond a chord that
// leaves roughly `frac` of the disc hidden.
//
function collectCoverLeaves(leaves, fruit, side, frac) {
  const dirX = Math.sin(side)
  const dirY = -Math.cos(side)
  const chord = fruit.r * (0.5 - frac) * FRUIT_COVER_CHORD_SCALE
  return leaves.filter(leaf => {
    const cx = leaf.x + leaf.size * FRUIT_COVER_LEAF_CENTROID * Math.sin(leaf.angle)
    const cy = leaf.y - leaf.size * FRUIT_COVER_LEAF_CENTROID * Math.cos(leaf.angle)
    const dx = cx - fruit.x
    const dy = cy - fruit.y
    if (Math.hypot(dx, dy) > fruit.r + leaf.size * FRUIT_COVER_LEAF_REACH) return false
    return dx * dirX + dy * dirY >= chord
  })
}
//
// Cover never comes straight from above, where it would hide the stem.
//
function keepStemSideOpen(side) {
  const a = Math.atan2(Math.sin(side), Math.cos(side))
  if (Math.abs(a) >= FRUIT_COVER_SIDE_MIN) return a
  return a < 0 ? -FRUIT_COVER_SIDE_MIN : FRUIT_COVER_SIDE_MIN
}
function fruitSpotsTooClose(a, b) {
  const dx = Math.abs(a.x - b.x)
  const dy = Math.abs(a.y - b.y)
  if (dx < FRUIT_STACK_DX && dy < FRUIT_STACK_DY) return true
  return Math.hypot(dx, dy) < FRUIT_MIN_SPACING
}
//
// One sprite with every cover leaf, graded like the tree bake so the leaves
// match the canopy behind them.
//
function bakeFruitLeafCover(k, spots) {
  const leaves = spots.flatMap(s => s.cover ?? [])
  if (!leaves.length) return null
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  leaves.forEach(l => {
    x1 = Math.min(x1, l.x - l.size)
    y1 = Math.min(y1, l.y - l.size)
    x2 = Math.max(x2, l.x + l.size)
    y2 = Math.max(y2, l.y + l.size)
  })
  const ox = Math.floor(x1) - FRUIT_COVER_BAKE_PAD
  const oy = Math.floor(y1) - FRUIT_COVER_BAKE_PAD
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(x2 - ox) + FRUIT_COVER_BAKE_PAD
  canvas.height = Math.ceil(y2 - oy) + FRUIT_COVER_BAKE_PAD
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.translate(-ox, -oy)
  paintForestTreeClusterLeaves(ctx, leaves, getTreePaletteColor().leafOpacity ?? 1)
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, FRUIT_COVER_GRAIN_SEED)
  k.loadSprite(FRUIT_COVER_SPRITE, canvas)
  return { x: ox, y: oy }
}
//
// Short stem from the twig tip to the top of the fruit, contoured like it.
//
function drawFruitStem(k, fruit, stemCol, contourCol, op) {
  const sx = fruit.stemX ?? fruit.x
  const sy = fruit.stemY ?? fruit.y - fruit.r - FRUIT_STEM_LEN
  const dx = sx - fruit.x
  const dy = sy - fruit.y
  const len = Math.hypot(dx, dy) || 1
  const p1 = k.vec2(fruit.x + dx / len * fruit.r * 0.8, fruit.y + dy / len * fruit.r * 0.8)
  const p2 = k.vec2(sx, sy)
  k.drawLine({ p1, p2, width: FRUIT_STEM_W + FRUIT_STEM_CONTOUR_W * 2, color: contourCol, opacity: op })
  k.drawLine({ p1, p2, width: FRUIT_STEM_W, color: stemCol, opacity: op })
}
function shuffleInPlace(list, rng) {
  for (let i = list.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1))
    const tmp = list[i]
    list[i] = list[j]
    list[j] = tmp
  }
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
  paintForestTreeFoliageMask(ctx, treeData, cellPx)
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
  bounds.x2 = Math.min(CFG.visual.forest.worldWidth, bounds.x2)
  bounds.y2 = Math.min(CFG.visual.forest.worldHeight, bounds.y2)
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
  const shadeCount = (FOREST_PAL.treeColor.leafShades || [FOREST_PAL.treeColor.leaf]).length
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
  const shades = FOREST_PAL.treeColor.leafShades || [FOREST_PAL.treeColor.leaf]
  const i = ((shadeIdx ?? 0) % shades.length + shades.length) % shades.length
  return forestRgb(shades[i])
}

function stepFallingFruit(fruit, dt, floorY, levelInst) {
  const restY = floorY - fruit.r + FRUIT_GROUND_SINK
  fruit.vx = fruit.vx ?? 0
  if (fruit.airborne == null) fruit.airborne = true
  if (fruit.airborne) {
    fruit.vy = (fruit.vy ?? 0) + FRUIT_FALL_GRAVITY * dt
    fruit.y += fruit.vy * dt
    if (fruit.y >= restY && fruit.vy >= 0) {
      fruit.y = restY
      fruit._restFloorY = restY + fruit.r - FRUIT_GROUND_SINK
      fruit.fromAnchorDrop && !fruit._anchorFallSoundPlayed &&
        levelInst?.sound &&
        (fruit._anchorFallSoundPlayed = true, Sound.playForestAppleSoftFall(levelInst.sound))
      const nextVy = applyFruitGroundImpact(fruit, fruit.vy)
      fruit.vy = nextVy
      fruit.airborne = nextVy !== 0
    }
    return
  }
  fruit.y = restY
  fruit._restFloorY == null && (fruit._restFloorY = restY + fruit.r - FRUIT_GROUND_SINK)
  fruit.vy = 0
  fruit.x += fruit.vx * dt
  fruit.vx = decayFruitRollSpeed(fruit.vx, dt)
  if (Math.abs(fruit.vx) < FRUIT_SETTLE_VX) {
    fruit.vx = 0
    fruit.settled = true
    levelInst && nudgeForestFruitClearOfRightTramp(levelInst, fruit)
  }
}

function nudgeForestFruitClearOfRightTramp(levelInst, fruit) {
  const trampX = levelInst.trampState?.x
  if (trampX == null) return
  const r = getForestFruitDisplayRadius(fruit)
  const capHalf = FOREST_RIGHT_TRAMP_CAP_HALF
  const blockMin = trampX - capHalf - r - 10
  const blockMax = trampX + FOREST_FRUIT_TRAMP_HIDE_X_MAX
  if (fruit.x < blockMin || fruit.x > blockMax) return
  const lakeX1 = levelInst.lakeX1 ?? 0
  fruit.x = Math.max(lakeX1 + 52, trampX - capHalf - r - FOREST_FRUIT_TRAMP_ROLL_CLEAR)
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
