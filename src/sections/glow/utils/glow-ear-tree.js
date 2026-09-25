//
// Small background trees whose sparse branches end in big ears instead of
// leaves — the nearest branches lean and stretch toward the hero on approach.
//
const EAR_TREE_TRUNK_H_BASE = 104
const EAR_TREE_TRUNK_W_BASE = 9
const EAR_TREE_BRANCH_COUNT_DEFAULT = 5
const EAR_TREE_BRANCH_LEN_BASE = 52
const EAR_LEN = 34
const EAR_W = 20
const EAR_CANAL_RADIUS = 5
const EAR_OUTLINE_PAD = 2
const EAR_TREE_TRIGGER_RADIUS = 280
const EAR_TREE_REACH_EASE = 4
const EAR_TREE_TWIG_LEN = 18
const EAR_TREE_TWIG_COUNT = 2
//
// Tapered trunk polygon — wide at the ground, narrow at the crown, with a
// gentle sideways wobble so it reads as an organic trunk (same silhouette
// idea as the big tree's trunk) instead of a straight-sided rectangle.
//
const EAR_TREE_TRUNK_STEPS = 6
const EAR_TREE_TRUNK_BASE_MULT = 1.05
const EAR_TREE_TRUNK_TOP_MULT = 0.32
const EAR_TREE_TRUNK_WOBBLE = 0.12
const EAR_TREE_TRUNK_OUTLINE_PAD = 2
//
// Branches attach at the trunk's own surface (offset from centerline by its
// half-width at that height), not the centerline itself — otherwise they
// read as floating in front of the trunk rather than growing out of it.
//
const EAR_TREE_BRANCH_ATTACH_MULT = 0.85

/**
 * Creates the ear-tree decor inst for a set of ground-planted spots.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst (unused directly, kept for symmetry with other decor components)
 * @param {Array<{x: number, groundY: number}>} cfg.spots - World planting points
 * @returns {Object} Ear-tree inst
 */
export function create(cfg) {
  const { k, spots } = cfg
  const trees = spots.map(spot => {
    const trunkH = EAR_TREE_TRUNK_H_BASE * (spot.trunkScale ?? 1)
    const trunkW = EAR_TREE_TRUNK_W_BASE * (spot.trunkWScale ?? 1)
    const branchLen = EAR_TREE_BRANCH_LEN_BASE * (spot.branchScale ?? 1)
    const branchCount = spot.branchCount ?? EAR_TREE_BRANCH_COUNT_DEFAULT
    const tree = {
      x: spot.x,
      groundY: spot.groundY,
      trunkH,
      trunkW,
      branchLen,
      branchCount,
      seed: spot.seed ?? 0,
      branches: []
    }
    tree.branches = buildEarTreeBranches(tree)
    return tree
  })
  return { k, trees }
}
//
// Rest angles fan out above the trunk, alternating left/right with twigs.
//
function branchAttachYOnTrunk(tree, index) {
  const trunkTop = tree.groundY - tree.trunkH
  const attachTop = trunkTop + tree.trunkH * 0.07
  const attachBottom = tree.groundY - tree.trunkH * 0.12
  const t = tree.branchCount <= 1 ? 0.5 : index / (tree.branchCount - 1)
  return attachTop + (attachBottom - attachTop) * t
}
function buildEarTreeBranches(tree) {
  const branches = []
  const { groundY, trunkH, branchLen, branchCount, seed } = tree
  for (let i = 0; i < branchCount; i++) {
    const side = i % 2 === 0 ? -1 : 1
    const lift = 0.28 + 0.52 * (i / Math.max(1, branchCount - 1))
    const restAngle = side * (0.48 + 0.32 * lift) - Math.PI / 2 + (seed + i) * 0.04
    const baseY = branchAttachYOnTrunk(tree, i)
    const baseX = tree.x + side * trunkHalfWidthAt(tree, baseY) * EAR_TREE_BRANCH_ATTACH_MULT
    const tipX = baseX + Math.cos(restAngle) * branchLen
    const tipY = baseY + Math.sin(restAngle) * branchLen
    const twigs = []
    for (let t = 0; t < EAR_TREE_TWIG_COUNT; t++) {
      const forkT = 0.55 + t * 0.18
      const forkAngle = restAngle + side * (0.35 + t * 0.22)
      const forkBaseX = baseX + (tipX - baseX) * forkT
      const forkBaseY = baseY + (tipY - baseY) * forkT
      const len = EAR_TREE_TWIG_LEN * (0.85 + t * 0.12)
      twigs.push({
        forkT,
        baseX: forkBaseX,
        baseY: forkBaseY,
        restAngle: forkAngle,
        len,
        hasEar: true,
        earMirror: side,
        tipX: forkBaseX + Math.cos(forkAngle) * len,
        tipY: forkBaseY + Math.sin(forkAngle) * len
      })
    }
    branches.push({ baseX, baseY, restAngle, tipX, tipY, twigs, hasEar: true, earMirror: side })
  }
  return branches
}
//
// Trunk half-width at a given world Y (linear taper from ground to crown).
//
function trunkHalfWidthAt(tree, y) {
  const t = Math.min(1, Math.max(0, (tree.groundY - y) / tree.trunkH))
  return tree.trunkW * (EAR_TREE_TRUNK_BASE_MULT + (EAR_TREE_TRUNK_TOP_MULT - EAR_TREE_TRUNK_BASE_MULT) * t)
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
  const branchLen = tree.branchLen
  tree.branches.forEach(branch => {
    const restTipX = branch.baseX + Math.cos(branch.restAngle) * branchLen
    const restTipY = branch.baseY + Math.sin(branch.restAngle) * branchLen
    const dx = heroX - branch.baseX
    const dy = heroY - branch.baseY
    const dist = Math.hypot(dx, dy) || 1
    const reachT = Math.max(0, 1 - dist / EAR_TREE_TRIGGER_RADIUS)
    const towardX = branch.baseX + (dx / dist) * branchLen
    const towardY = branch.baseY + (dy / dist) * branchLen
    const targetX = restTipX + (towardX - restTipX) * reachT
    const targetY = restTipY + (towardY - restTipY) * reachT
    branch.tipX += (targetX - branch.tipX) * ease
    branch.tipY += (targetY - branch.tipY) * ease
    //
    // Twigs fork off the parent branch at a fixed fraction of its length
    // (forkT) — re-anchoring baseX/baseY to the branch's CURRENT (already
    // eased this frame) base→tip line every frame, instead of the fixed
    // position they forked from at creation, is what keeps them attached as
    // the parent branch reaches or eases back. Without this they stayed at
    // their original creation-time spot while the parent moved out from
    // under them, reading as a twig floating disconnected in mid-air.
    //
    branch.twigs?.forEach(twig => {
      twig.baseX = branch.baseX + (branch.tipX - branch.baseX) * twig.forkT
      twig.baseY = branch.baseY + (branch.tipY - branch.baseY) * twig.forkT
      const restTwigX = twig.baseX + Math.cos(twig.restAngle) * twig.len
      const restTwigY = twig.baseY + Math.sin(twig.restAngle) * twig.len
      const twigDx = heroX - twig.baseX
      const twigDy = heroY - twig.baseY
      const twigDist = Math.hypot(twigDx, twigDy) || 1
      const twigTowardX = twig.baseX + (twigDx / twigDist) * twig.len * 0.85
      const twigTowardY = twig.baseY + (twigDy / twigDist) * twig.len * 0.85
      const tX = restTwigX + (twigTowardX - restTwigX) * reachT
      const tY = restTwigY + (twigTowardY - restTwigY) * reachT
      twig.tipX = twig.tipX ?? restTwigX
      twig.tipY = twig.tipY ?? restTwigY
      twig.tipX += (tX - twig.tipX) * ease
      twig.tipY += (tY - twig.tipY) * ease
    })
  })
}
function drawEarTree(k, tree, barkColor, outlineColor, earColor) {
  k.drawPolygon({ pts: buildTrunkOutline(k, tree, EAR_TREE_TRUNK_OUTLINE_PAD), color: outlineColor, triangulate: true })
  k.drawPolygon({ pts: buildTrunkOutline(k, tree, 0), color: barkColor, triangulate: true })
  tree.branches.forEach(branch => drawEarBranch(k, tree, branch, barkColor, outlineColor, earColor))
}
//
// Trunk silhouette points, base to crown up one side and back down the
// other, so it can be filled as a single tapered polygon.
//
function buildTrunkOutline(k, tree, pad) {
  const left = []
  const right = []
  for (let i = 0; i <= EAR_TREE_TRUNK_STEPS; i++) {
    const t = i / EAR_TREE_TRUNK_STEPS
    const y = tree.groundY - tree.trunkH * t
    const halfW = trunkHalfWidthAt(tree, y) + pad
    const wobble = Math.sin(t * Math.PI * 1.4 + tree.seed * 3) * tree.trunkW * EAR_TREE_TRUNK_WOBBLE
    left.push({ x: tree.x - halfW + wobble, y })
    right.push({ x: tree.x + halfW + wobble, y })
  }
  return [...left, ...right.reverse()].map(p => k.vec2(p.x, p.y))
}
function drawEarBranch(k, tree, branch, barkColor, outlineColor, earColor) {
  const base = k.vec2(branch.baseX, branch.baseY)
  const tip = k.vec2(branch.tipX, branch.tipY)
  const limbW = Math.max(3, tree.trunkW * 0.42)
  k.drawCircle({
    pos: base,
    radius: limbW * 0.55 + 1,
    color: outlineColor
  })
  k.drawCircle({
    pos: base,
    radius: limbW * 0.45,
    color: barkColor
  })
  k.drawLine({ p1: base, p2: tip, width: limbW + 2, color: outlineColor })
  k.drawLine({ p1: base, p2: tip, width: limbW, color: barkColor })
  branch.twigs?.forEach(twig => {
    const twigBase = k.vec2(twig.baseX, twig.baseY)
    const twigTip = k.vec2(twig.tipX ?? twig.baseX, twig.tipY ?? twig.baseY)
    k.drawLine({ p1: twigBase, p2: twigTip, width: limbW * 0.55 + 1, color: outlineColor })
    k.drawLine({ p1: twigBase, p2: twigTip, width: limbW * 0.5, color: barkColor })
    twig.hasEar && drawEarAtTip(k, twigTip.x, twigTip.y, twig.restAngle, twig.earMirror, outlineColor, earColor)
  })
  branch.hasEar && drawEarAtTip(k, tip.x, tip.y,
    Math.atan2(branch.tipY - branch.baseY, branch.tipX - branch.baseX), branch.earMirror, outlineColor, earColor)
}
function drawEarAtTip(k, tipX, tipY, angle, mirror, outlineColor, earColor) {
  drawEarShape(k, tipX, tipY, angle, mirror, outlineColor, earColor)
}
//
// Local-space ear outline, modeled on a real ear's silhouette (base/lobe at
// the origin, rounded crown along +x): a bulging outer helix curve up to a
// rounded — not pointed — top, an inward notch on the return curve for the
// antihelix/tragus, and a rounded lobe back at the base. Rotated to the
// branch angle, drawn with an inner ridge line (antihelix) and canal circle
// for the same detail a real ear reads by.
//
const EAR_LOCAL_POINTS = [
  [0, -0.05],
  [0.04, -0.35],
  [0.18, -0.68],
  [0.42, -0.92],
  [0.68, -0.88],
  [0.9, -0.6],
  [1, -0.22],
  [0.94, 0.14],
  [0.74, 0.42],
  [0.56, 0.28],
  [0.66, 0.06],
  [0.5, -0.02],
  [0.3, 0.2],
  [0.12, 0.28],
  [0, 0.08]
]
//
// Antihelix fold, drawn as a short inner ridge line from the upper curve
// down toward the canal — same idea as the crease visible in a real ear.
//
const EAR_RIDGE_LOCAL_POINTS = [
  [0.7, -0.5],
  [0.5, -0.1],
  [0.36, 0.14]
]
function drawEarShape(k, tipX, tipY, angle, mirror, outlineColor, earColor) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  //
  // mirror flips the local Y axis before rotating — a real left ear and
  // right ear are not rotations of each other, they're mirror images (the
  // notch/lobe sit on opposite sides), so this is a separate transform from
  // the branch-angle rotation above it.
  //
  const flip = mirror < 0 ? -1 : 1
  const toWorld = (lx, ly, pad) => {
    const py0 = ly * flip
    const px = lx * (EAR_LEN + pad)
    const py = py0 * (EAR_W / 2 + pad)
    return k.vec2(tipX + px * cos - py * sin, tipY + px * sin + py * cos)
  }
  //
  // Flipping ly reverses the polygon's winding order (CCW becomes CW) —
  // reversing the point array right back undoes just that (order), leaving
  // the mirrored shape but restoring the winding triangulate expects. Without
  // this, mirrored ears silently failed to fill (only the canal circle,
  // which doesn't care about winding, ever showed) — the polygon itself
  // never rendered, reading as "ear not fully drawn, just a dark circle".
  //
  const orderedPoints = flip < 0 ? [...EAR_LOCAL_POINTS].reverse() : EAR_LOCAL_POINTS
  const outlinePts = orderedPoints.map(([lx, ly]) => toWorld(lx, ly, EAR_OUTLINE_PAD))
  const fillPts = orderedPoints.map(([lx, ly]) => toWorld(lx, ly, 0))
  k.drawPolygon({ pts: outlinePts, color: outlineColor, triangulate: true })
  k.drawPolygon({ pts: fillPts, color: earColor, triangulate: true })
  const ridgePts = EAR_RIDGE_LOCAL_POINTS.map(([lx, ly]) => toWorld(lx, ly, 0))
  for (let i = 0; i < ridgePts.length - 1; i++) {
    k.drawLine({ p1: ridgePts[i], p2: ridgePts[i + 1], width: 1.6, color: outlineColor, opacity: 0.6 })
  }
  const canalCenter = toWorld(0.32, 0.12, 0)
  k.drawCircle({ pos: canalCenter, radius: EAR_CANAL_RADIUS, color: outlineColor })
}
