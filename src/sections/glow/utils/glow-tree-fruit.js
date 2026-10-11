import { CFG } from '../../../cfg.js'
import { GLOW_PAL, glowRgb, isGlowGrayExploreBeforeL } from './glow-palette.js'
import { TREE_SEED } from './glow-tree.js'

//
// Decorative canopy fruit on the main glow tree (Otterisk palette only).
//
const FRUIT_SEED_OFFSET = 8803
const FRUIT_RANDOM_COUNT = 17
const FRUIT_GROUND_LINGER_SEC = 5
const FRUIT_GROUND_FADE_SEC = 0.9
const FRUIT_RADIUS_MIN = 6
const FRUIT_RADIUS_RANGE = 4
const ANCHOR_DROP_LEFT_PAD = 16
const ANCHOR_DROP_RIGHT_PAD = 12
const ANCHOR_LEAF_TARGET_Y_OFFSET = 48
const FRUIT_STEM_LEN = 4
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
const HORIZ_BRANCH_FRUIT_EXCLUDE_Y_BELOW = 68
const ANCHOR_CANOPY_MIN_ABOVE_BRANCH = 40
const FOLIAGE_CLUSTER_CELL_PX = 10
const FRUIT_CLUSTER_MIN_CELLS = 5
const FRUIT_HANG_CLUSTER_PAD = 4
const FRUIT_STEM_ANCHOR_PAD = 5
const FRUIT_CLUSTER_MIN_SPAN_CELLS = 2

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
 * @returns {Array<Object>}
 */
export function buildGlowTreeFruitSpots(treeData, anchorDropCfg) {
  const rng = mulberry32(TREE_SEED + FRUIT_SEED_OFFSET)
  const hangable = collectHangableTreeFoliage(treeData)
  if (!hangable.length) return []
  const horiz = treeData.horizBranch
  const dropX = computeGlowAnchorFruitDropX(anchorDropCfg)
  const { trunkX, trunkHalf, branchTrampX, trampClearHalf } = anchorDropCfg
  const stripLeft = trunkX + trunkHalf + ANCHOR_DROP_LEFT_PAD
  const stripRight = branchTrampX - trampClearHalf - ANCHOR_DROP_RIGHT_PAD
  const canopyCeilingY = horiz ? horiz.physY - ANCHOR_CANOPY_MIN_ABOVE_BRANCH : Infinity
  const anchorCandidates = hangable.filter(f => {
    if (f.x < stripLeft || f.x > stripRight) return false
    return f.y <= canopyCeilingY
  })
  let anchorPool = anchorCandidates.length
    ? anchorCandidates
    : hangable.filter(f => f.x >= stripLeft && f.x <= stripRight)
  !anchorPool.length && (anchorPool = [...hangable].sort(
    (a, b) => Math.abs(a.x - dropX) - Math.abs(b.x - dropX)
  ))
  if (!anchorPool.length) return []
  const targetY = horiz ? horiz.y - ANCHOR_LEAF_TARGET_Y_OFFSET : anchorPool[0].y
  let anchorLeaf = anchorPool[0]
  let anchorDist = Infinity
  anchorPool.forEach(foliage => {
    const d = Math.hypot(foliage.x - dropX, foliage.y - targetY)
    if (d < anchorDist) {
      anchorDist = d
      anchorLeaf = foliage
    }
  })
  const anchorR = FRUIT_RADIUS_MIN + 2.5
  const anchorHue = 0.12
  let anchorPos = pickValidFruitHangOnCluster(treeData, anchorLeaf, anchorR, rng)
  if (!anchorPos) {
    for (const foliage of anchorPool) {
      anchorPos = pickValidFruitHangOnCluster(treeData, foliage, anchorR, rng)
      if (anchorPos) {
        anchorLeaf = foliage
        break
      }
    }
  }
  if (!anchorPos) return []
  const spots = [{
    anchor: true,
    attached: true,
    x: anchorPos.x,
    y: anchorPos.y,
    r: anchorR,
    hue: anchorHue,
    vy: 0,
    leaves: makeFruitLeafPair(hashFruitLeafSeed(anchorPos.x, anchorPos.y, anchorHue), anchorR, rng, anchorHue)
  }]
  const pool = hangable.filter(f => f !== anchorLeaf)
  const pickN = Math.min(FRUIT_RANDOM_COUNT, pool.length)
  for (let n = 0; n < pickN; n++) {
    let placed = false
    for (let attempt = 0; attempt < 10 && pool.length; attempt++) {
      const idx = Math.floor(rng() * pool.length)
      const foliage = pool[idx]
      const r = FRUIT_RADIUS_MIN + rng() * FRUIT_RADIUS_RANGE
      const hue = 0.35 + rng() * 0.55
      const pos = pickValidFruitHangOnCluster(treeData, foliage, r, rng)
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
 * Spawns a falling copy; the anchor fruit stays attached for the next cycle.
 * @param {Object} levelInst - Glow level inst
 */
export function releaseGlowAnchorFruit(levelInst) {
  const fruit = levelInst.treeFruitSpots?.find(f => f.anchor && f.attached)
  if (!fruit) return
  levelInst.treeFruitSpots.push({
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
  levelInst._branchLandingsAfterG = 0
}

/**
 * Steps falling fruit physics.
 * @param {Object} levelInst - Glow level inst
 * @param {number} dt - Frame delta
 * @param {number} floorY - Ground surface Y
 */
export function tickGlowTreeFruits(levelInst, dt, floorY) {
  if (!levelInst.zones?.gCollected) return
  const spots = levelInst.treeFruitSpots
  if (!spots?.length || floorY == null) return
  const now = levelInst.k?.time?.() ?? 0
  let prune = false
  spots.forEach(fruit => {
    if (fruit.removed) return
    if (fruit.attached) return
    if (!fruit.settled) {
      stepFallingFruit(fruit, dt, floorY)
      return
    }
    fruit.settledAt == null && (fruit.settledAt = now)
    if (fruit.beingEaten) return
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
  if (!spots?.length || !isGlowTreeFruitVisible(inst)) return
  const k = inst.k
  const fade = inst.colorFade ?? 0
  const gray = isGlowGrayExploreBeforeL(inst.zones, fade)
  const flat = !gray && !inst.zones?.tree && fade < 0.08
  const bodyA = gray ? glowRgb(GLOW_PAL.decorGray) : glowRgb('glowLightCore')
  const bodyB = gray ? glowRgb(GLOW_PAL.lightGray) : glowRgb(GLOW_PAL.mushroomsLight[0])
  const stem = glowRgb(gray ? GLOW_PAL.decorGray : GLOW_PAL.treeColor.root)
  const baseOp = gray ? 0.5 : flat ? 0.45 : Math.min(1, 0.55 + fade * 0.45)
  spots.forEach(fruit => {
    if (fruit.removed) return
    let op = baseOp
    fruit.fadeOutStarted && (op *= Math.max(0, 1 - (fruit.fadeOutT ?? 0) / FRUIT_GROUND_FADE_SEC))
    if (op <= 0.02) return
    const t = fruit.hue ?? 0.5
    const rgb = lerpRgb(bodyA, bodyB, t)
    const col = k.rgb(rgb.r, rgb.g, rgb.b)
    const stemCol = k.rgb(stem.r, stem.g, stem.b)
    const leaves = fruit.leaves ?? []
    leaves.forEach(leaf => {
      const leafRgb = leafRgbFromShadeIdx(leaf.shadeIdx, gray)
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
    drawFruitBody(k, fruit, col, op)
    const highlight = glowRgb(GLOW_PAL.treeColor.leafShades?.[0] ?? GLOW_PAL.treeColor.leaf)
    const bodyR = fruitDisplayRadius(fruit)
    bodyR > 2 && k.drawCircle({
      pos: k.vec2(fruit.x - bodyR * 0.25, fruit.y - bodyR * 0.2),
      radius: bodyR * 0.22,
      color: k.rgb(highlight.r, highlight.g, highlight.b),
      opacity: op * 0.35
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

function fruitDisplayRadius(fruit) {
  return getGlowFruitDisplayRadius(fruit)
}

function drawFruitBody(k, fruit, col, op) {
  const r = fruitDisplayRadius(fruit)
  if (r < 1.2) return
  const bites = fruit.biteCount ?? 0
  const eaten = (fruit.eatProgress ?? 0) > 0.02 || bites > 0
  if (eaten) {
    const pts = buildRaggedFruitPolygon(k, fruit.x, fruit.y, r, fruit.biteMarks ?? [], fruit.biteSeed ?? 0)
    pts.length >= 3 && k.drawPolygon({ pts, color: col, opacity: op })
    return
  }
  k.drawCircle({
    pos: k.vec2(fruit.x, fruit.y),
    radius: r,
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

function collectHangableTreeFoliage(treeData) {
  return (treeData.leaves ?? []).filter(leaf => {
    if (leaf.type !== 'cluster') return false
    if ((leaf.cells?.length ?? 0) < FRUIT_CLUSTER_MIN_CELLS) return false
    return isClusterHangableForFruit(treeData, leaf)
  })
}

function pickValidFruitHangOnCluster(treeData, cluster, fruitR, rng) {
  const cells = cluster.cells ?? []
  if (!cells.length) return null
  const tries = Math.min(16, cells.length * 3)
  for (let t = 0; t < tries; t++) {
    const pos = fruitPositionOnFoliage(cluster, fruitR, rng)
    if (isValidFruitHangOnCluster(treeData, cluster, pos.x, pos.y, fruitR)) return pos
  }
  return null
}

function fruitPositionOnFoliage(cluster, fruitR, rng) {
  const cells = cluster.cells ?? [{ dx: 0, dy: 0 }]
  const cell = cells[Math.floor(rng() * cells.length)]
  const cx = cluster.x + cell.dx * FOLIAGE_CLUSTER_CELL_PX
  const cy = cluster.y + cell.dy * FOLIAGE_CLUSTER_CELL_PX
  const jitter = Math.min(2.5, fruitR * 0.22)
  return {
    x: cx + (rng() - 0.5) * jitter,
    y: cy + (rng() - 0.5) * jitter
  }
}

function isValidFruitHangOnCluster(treeData, cluster, x, y, fruitR) {
  if (isPointOnTreeWood(treeData, x, y)) return false
  const hb = treeData.horizBranch
  if (hb && isInHeroBranchFruitExcludeZone(hb, x, y)) return false
  if (!isPointInClusterCells(cluster, x, y, fruitR * 0.55 + FRUIT_HANG_CLUSTER_PAD)) return false
  return isFruitStemAnchoredOnCluster(cluster, x, y, fruitR)
}

function isFruitStemAnchoredOnCluster(cluster, x, y, fruitR) {
  const stemBaseY = y - fruitR
  const stemTopY = stemBaseY - FRUIT_STEM_LEN
  const samples = [
    { x, y: stemTopY },
    { x, y: stemBaseY - FRUIT_STEM_LEN * 0.5 },
    { x, y: stemBaseY },
    { x, y: y - fruitR * 0.35 }
  ]
  return samples.some(p => isPointInClusterCells(cluster, p.x, p.y, FRUIT_STEM_ANCHOR_PAD))
}

function isPointInClusterCells(cluster, x, y, pad) {
  const cellPx = FOLIAGE_CLUSTER_CELL_PX
  for (const c of cluster.cells ?? []) {
    const px = cluster.x + c.dx * cellPx
    const py = cluster.y + c.dy * cellPx
    if (Math.hypot(x - px, y - py) <= pad) return true
  }
  return false
}

function isClusterHangableForFruit(treeData, cluster) {
  const cells = cluster.cells ?? []
  if (!clusterHasLeafVolume(cells)) return false
  let clearCells = 0
  const cellPx = FOLIAGE_CLUSTER_CELL_PX
  cells.forEach(c => {
    const px = cluster.x + c.dx * cellPx
    const py = cluster.y + c.dy * cellPx
    if (isPointOnTreeWood(treeData, px, py)) return
    const hb = treeData.horizBranch
    if (hb && isInHeroBranchFruitExcludeZone(hb, px, py)) return
    clearCells++
  })
  return clearCells >= Math.max(4, Math.ceil(cells.length * 0.45))
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

function leafRgbFromShadeIdx(shadeIdx, grayExplore = false) {
  if (grayExplore) {
    const i = ((shadeIdx ?? 0) % 2 + 2) % 2
    return glowRgb(i === 0 ? GLOW_PAL.decorGray : GLOW_PAL.lightGray)
  }
  const shades = GLOW_PAL.treeColor.leafShades || [GLOW_PAL.treeColor.leaf]
  const i = ((shadeIdx ?? 0) % shades.length + shades.length) % shades.length
  return glowRgb(shades[i])
}

function stepFallingFruit(fruit, dt, floorY) {
  const restY = floorY - fruit.r - FRUIT_FALL_GROUND_PAD
  fruit.vx = fruit.vx ?? 0
  if (fruit.airborne == null) fruit.airborne = true
  if (fruit.airborne) {
    fruit.vy = (fruit.vy ?? 0) + FRUIT_FALL_GRAVITY * dt
    fruit.y += fruit.vy * dt
    if (fruit.y >= restY && fruit.vy >= 0) {
      fruit.y = restY
      const nextVy = applyFruitGroundImpact(fruit, fruit.vy)
      fruit.vy = nextVy
      fruit.airborne = nextVy !== 0
    }
    return
  }
  fruit.y = restY
  fruit.vy = 0
  fruit.x += fruit.vx * dt
  fruit.vx = decayFruitRollSpeed(fruit.vx, dt)
  if (Math.abs(fruit.vx) < FRUIT_SETTLE_VX) {
    fruit.vx = 0
    fruit.settled = true
  }
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

function isGlowTreeFruitVisible(inst) {
  if (!inst.zones?.gCollected) return false
  if (inst.zones?.tree) return true
  if (inst.treeSegmentRevealed?.size > 0) return true
  if (inst.treeObj && !inst.treeObj.hidden && (inst.treeObj.opacity ?? 0) > 0.05) return true
  return false
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
