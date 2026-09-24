//
// Small background trees whose sparse branches end in big ears instead of
// leaves — the nearest branches lean and stretch toward the hero on approach.
//
const EAR_TREE_TRUNK_H = 68
const EAR_TREE_TRUNK_W = 8
const EAR_TREE_BRANCH_COUNT = 3
const EAR_TREE_BRANCH_LEN = 44
//
// Ear silhouette, built in local space with the base at the origin and the
// outward tip at (EAR_LEN, 0), then rotated to match the branch direction —
// an asymmetric pointed leaf shape (bulge on the outer curve, concave on the
// inner curve) reads as a real ear instead of a plain oval.
//
const EAR_LEN = 34
const EAR_W = 20
const EAR_CANAL_RADIUS = 5
const EAR_OUTLINE_PAD = 2
//
// Distance at which branches start reaching — reachT scales to 1 as the hero
// closes in, so the lean grows smoothly instead of snapping on at the edge.
//
const EAR_TREE_TRIGGER_RADIUS = 240
const EAR_TREE_REACH_EASE = 4

/**
 * Creates the ear-tree decor inst for a set of ground-planted spots.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst (unused directly, kept for symmetry with other decor components)
 * @param {Array<{x: number, groundY: number}>} cfg.spots - World planting points
 * @returns {Object} Ear-tree inst
 */
export function create(cfg) {
  const { k, spots } = cfg
  const trees = spots.map(spot => ({
    x: spot.x,
    groundY: spot.groundY,
    branches: buildEarTreeBranches(spot.x, spot.groundY)
  }))
  return { k, trees }
}
//
// Rest angles fan out above the trunk, alternating left/right.
//
function buildEarTreeBranches(x, groundY) {
  const branches = []
  for (let i = 0; i < EAR_TREE_BRANCH_COUNT; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const lift = 0.35 + 0.4 * (i / Math.max(1, EAR_TREE_BRANCH_COUNT - 1))
    const restAngle = side * (0.55 + 0.25 * lift) - Math.PI / 2
    const baseY = groundY - EAR_TREE_TRUNK_H * (0.5 + 0.4 * i / Math.max(1, EAR_TREE_BRANCH_COUNT - 1))
    const tipX = x + Math.cos(restAngle) * EAR_TREE_BRANCH_LEN
    const tipY = baseY + Math.sin(restAngle) * EAR_TREE_BRANCH_LEN
    branches.push({ baseY, restAngle, tipX, tipY })
  }
  return branches
}

/**
 * Eases every branch tip toward (or back from) the hero's position.
 * @param {Object} inst - Ear-tree inst
 * @param {number} heroX - Hero world X
 * @param {number} heroY - Hero world Y
 * @param {number} dt - Frame delta
 */
export function onUpdate(inst, heroX, heroY, dt) {
  inst.trees.forEach(tree => updateEarTree(tree, heroX, heroY, dt))
}

/**
 * Draws every ear-tree's trunk, branches and ears.
 * @param {Object} inst - Ear-tree inst
 * @param {Object} barkColor - Kaplay rgb for trunk and branches
 * @param {Object} outlineColor - Kaplay rgb for outlines
 * @param {Object} earColor - Kaplay rgb for the ear fill
 */
export function onDraw(inst, barkColor, outlineColor, earColor) {
  inst.trees.forEach(tree => drawEarTree(inst.k, tree, barkColor, outlineColor, earColor))
}
function updateEarTree(tree, heroX, heroY, dt) {
  const ease = Math.min(1, dt * EAR_TREE_REACH_EASE)
  tree.branches.forEach(branch => {
    const restTipX = tree.x + Math.cos(branch.restAngle) * EAR_TREE_BRANCH_LEN
    const restTipY = branch.baseY + Math.sin(branch.restAngle) * EAR_TREE_BRANCH_LEN
    const dx = heroX - tree.x
    const dy = heroY - branch.baseY
    const dist = Math.hypot(dx, dy) || 1
    const reachT = Math.max(0, 1 - dist / EAR_TREE_TRIGGER_RADIUS)
    const towardX = tree.x + (dx / dist) * EAR_TREE_BRANCH_LEN
    const towardY = branch.baseY + (dy / dist) * EAR_TREE_BRANCH_LEN
    const targetX = restTipX + (towardX - restTipX) * reachT
    const targetY = restTipY + (towardY - restTipY) * reachT
    branch.tipX += (targetX - branch.tipX) * ease
    branch.tipY += (targetY - branch.tipY) * ease
  })
}
function drawEarTree(k, tree, barkColor, outlineColor, earColor) {
  const trunkTop = tree.groundY - EAR_TREE_TRUNK_H
  k.drawLine({
    p1: k.vec2(tree.x, tree.groundY),
    p2: k.vec2(tree.x, trunkTop),
    width: EAR_TREE_TRUNK_W + 2,
    color: outlineColor
  })
  k.drawLine({
    p1: k.vec2(tree.x, tree.groundY),
    p2: k.vec2(tree.x, trunkTop),
    width: EAR_TREE_TRUNK_W,
    color: barkColor
  })
  tree.branches.forEach(branch => drawEarBranch(k, tree.x, branch, barkColor, outlineColor, earColor))
}
function drawEarBranch(k, trunkX, branch, barkColor, outlineColor, earColor) {
  const base = k.vec2(trunkX, branch.baseY)
  const tip = k.vec2(branch.tipX, branch.tipY)
  k.drawLine({ p1: base, p2: tip, width: 5, color: outlineColor })
  k.drawLine({ p1: base, p2: tip, width: 3, color: barkColor })
  const angle = Math.atan2(branch.tipY - branch.baseY, branch.tipX - trunkX)
  drawEarShape(k, tip.x, tip.y, angle, outlineColor, earColor)
}
//
// Local-space ear outline: a pointed, asymmetric leaf shape (base at the
// origin, tip pointing along +x), rotated to the branch angle and drawn with
// an inner canal ellipse so it reads as an ear rather than a plain oval.
//
const EAR_LOCAL_POINTS = [
  [0, 0],
  [0.16, -0.62],
  [0.42, -1],
  [0.78, -0.55],
  [1, 0],
  [0.72, 0.6],
  [0.36, 0.85],
  [0.1, 0.45]
]
function drawEarShape(k, tipX, tipY, angle, outlineColor, earColor) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const toWorld = (lx, ly, pad) => {
    const px = lx * (EAR_LEN + pad)
    const py = ly * (EAR_W / 2 + pad)
    return k.vec2(tipX + px * cos - py * sin, tipY + px * sin + py * cos)
  }
  const outlinePts = EAR_LOCAL_POINTS.map(([lx, ly]) => toWorld(lx, ly, EAR_OUTLINE_PAD))
  const fillPts = EAR_LOCAL_POINTS.map(([lx, ly]) => toWorld(lx, ly, 0))
  k.drawPolygon({ pts: outlinePts, color: outlineColor, triangulate: true })
  k.drawPolygon({ pts: fillPts, color: earColor, triangulate: true })
  const canalCenter = toWorld(0.42, 0.1, 0)
  k.drawCircle({ pos: canalCenter, radius: EAR_CANAL_RADIUS, color: outlineColor })
}
