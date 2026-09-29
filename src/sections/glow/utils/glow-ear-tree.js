import { clampRootSegmentsBelowGroundLine, growTreeRootSegments } from '../../../utils/grow-tree-root.js'
//
// Small background trees whose branches end in red lips — branches grow from
// the tapered trunk surface and lean toward the hero like the old ear trees.
//
const EAR_TREE_TRUNK_H_BASE = 104
const EAR_TREE_TRIGGER_RADIUS = 280
const EAR_TREE_REACH_EASE = 4
const EAR_TREE_TRUNK_W_BASE = 9
const EAR_TREE_BRANCH_COUNT_DEFAULT = 5
const EAR_TREE_BRANCH_LEN_BASE = 52
const EAR_TREE_TWIG_LEN = 18
const EAR_TREE_TWIG_COUNT = 2
const EAR_TREE_TRUNK_STEPS = 6
const EAR_TREE_TRUNK_BASE_MULT = 1.05
const EAR_TREE_TRUNK_TOP_MULT = 0.32
const EAR_TREE_TRUNK_WOBBLE = 0.12
const EAR_TREE_TRUNK_OUTLINE_PAD = 2
const EAR_TREE_BRANCH_ATTACH_MULT = 0.85
const EAR_TREE_TRUNK_TOP_RIM_W = 3
const MOUTH_LEN = 30
const MOUTH_HALF_H = 9
const MOUTH_GAP = 3
const MOUTH_OUTLINE_PAD = 1
//
// Root fan at the base, same growTreeRootSegments algorithm the big glow
// tree uses — generated once per tree at creation time and redrawn as
// static geometry every frame (never regrown), same pattern as the trunk.
// Starting thickness matches the trunk's own local cross-section width at
// ground level (see buildEarTreeRoots) so trunk and roots read as one
// continuous seam instead of a sudden width jump.
//
const EAR_TREE_ROOT_COUNT = 3
const EAR_TREE_ROOT_SEGMENTS = 10
const EAR_TREE_ROOT_MIN_DRAW_WIDTH = 0.85
const EAR_TREE_ROOT_TIP_RADIUS = 0.55

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
      shoreLeft: Boolean(spot.shoreLeft),
      branches: []
    }
    tree.branches = buildEarTreeBranches(tree)
    tree.rootSegs = buildEarTreeRoots(tree)
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
  const { branchLen, branchCount, seed } = tree
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
        hasMouth: true,
        tipX: forkBaseX + Math.cos(forkAngle) * len,
        tipY: forkBaseY + Math.sin(forkAngle) * len
      })
    }
    branches.push({
      baseX,
      baseY,
      restAngle,
      tipX,
      tipY,
      twigs,
      hasMouth: true
    })
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
//
// Grows a small root fan at the trunk base once, at creation time — the
// same growTreeRootSegments algorithm the big glow tree uses, just fewer
// and thinner roots. Cached on the tree and redrawn as static geometry
// every frame (never regrown, unlike the trunk which is cheap to redo).
//
function buildEarTreeRoots(tree) {
  const rand = (min, max) => min + Math.random() * (max - min)
  //
  // Half-width of the trunk right at the ground line — a root starting at
  // the trunk centre gets this full cross-section as its start thickness;
  // one starting further off-centre gets only the remaining room to the
  // trunk edge (mirrored), so no root ever reads wider than the trunk
  // itself at the seam (same idea as rootSegWidth() for the big tree).
  //
  const halfW = trunkHalfWidthAt(tree, tree.groundY)
  const segs = []
  for (let r = 0; r < EAR_TREE_ROOT_COUNT; r++) {
    const side = r % 2 === 0 ? 1 : -1
    const xJitter = side * Math.random() * halfW * 0.6
    const offset = Math.min(halfW, Math.abs(xJitter))
    const startThickness = Math.max(1, 2 * (halfW - offset))
    const startAngle = Math.PI / 2 + side * (0.15 + Math.random() * 0.25)
    segs.push(...growTreeRootSegments({
      x: tree.x + xJitter,
      y: tree.groundY - 2,
      angle: startAngle,
      segments: EAR_TREE_ROOT_SEGMENTS,
      thickness: startThickness,
      lateralBiasPerSegment: side * 0.03,
      rand
    }))
  }
  return clampRootSegmentsBelowGroundLine(segs, tree.groundY)
}
//
// Fill-only root lines — round caps plus a tip dot on every terminal end so
// the taper never reads as chopped off before the point.
//
function drawEarTreeRoots(k, tree, rootColor, opacity = 1) {
  const segs = tree.rootSegs
  if (!segs?.length) return
  const op = earDrawOpacity(opacity)
  const startKeys = new Set(segs.map(seg => `${seg.startX},${seg.startY}`))
  segs.forEach(seg => {
    const w = Math.max(EAR_TREE_ROOT_MIN_DRAW_WIDTH, seg.width)
    k.drawLine({
      p1: k.vec2(seg.startX, seg.startY),
      p2: k.vec2(seg.endX, seg.endY),
      width: w,
      color: rootColor,
      lineCap: 'round',
      ...op
    })
  })
  segs.forEach(seg => {
    const key = `${seg.endX},${seg.endY}`
    if (startKeys.has(key)) return
    const tipR = Math.max(EAR_TREE_ROOT_TIP_RADIUS, seg.width * 0.45)
    k.drawCircle({ pos: k.vec2(seg.endX, seg.endY), radius: tipR, color: rootColor, ...op })
  })
}

/**
 * Eases branch and twig tips toward (or back from) the hero's position.
 * @param {Object} inst - Ear-tree inst
 * @param {number} heroX - Hero world X
 * @param {number} heroY - Hero world Y
 * @param {number} dt - Frame delta
 */
export function onUpdate(inst, heroX, heroY, dt) {
  inst.trees.forEach(tree => updateEarTree(tree, heroX, heroY, dt))
}

/**
 * Draws every tree trunk (plus its root fan, same z, under the grass layer).
 * @param {Object} inst - Ear-tree inst
 * @param {Object} barkColor - Kaplay rgb for trunk fill
 * @param {Object} outlineColor - Kaplay rgb for trunk outline
 * @param {Object} rootColor - Kaplay rgb for the root fan, big-tree style
 */
export function onDrawTrunks(inst, barkColor, outlineColor, opacity = 1) {
  inst.trees.forEach(tree => drawEarTreeTrunk(inst.k, tree, barkColor, outlineColor, opacity))
}
//
// Root fans sit above the grass layer so blade tufts do not crop taper tips.
//
export function onDrawRoots(inst, rootColor, opacity = 1) {
  inst.trees.forEach(tree => drawEarTreeRoots(inst.k, tree, rootColor, opacity))
}

/**
 * Redraws every trunk above grass and shore decor (branches draw on a higher z).
 * @param {Object} inst - Ear-tree inst
 * @param {Object} barkColor - Kaplay rgb for trunk fill
 * @param {Object} outlineColor - Kaplay rgb for trunk outline
 */
export function onDrawTrunksAboveGrass(inst, barkColor, outlineColor, opacity = 1) {
  inst.trees.forEach(tree => drawEarTreeTrunk(inst.k, tree, barkColor, outlineColor, opacity))
}

/**
 * Draws branches and lip mouths only (trunks are on a lower overlay z).
 * @param {Object} inst - Ear-tree inst
 * @param {Object} barkColor - Kaplay rgb for branches
 * @param {Object} outlineColor - Kaplay rgb for outlines
 * @param {Object} lipColor - Kaplay rgb for lip fill
 */
export function onDrawBranches(inst, barkColor, outlineColor, lipColor, opacity = 1) {
  const k = inst.k
  inst.trees.forEach(tree => {
    tree.branches.forEach(branch => drawEarBranch(k, tree, branch, barkColor, outlineColor, lipColor, opacity))
  })
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
//
// Kaplay's drawPolygon({triangulate: true}) ear-clips the whole 14-point
// outline in one shot, and its ear-clipping loop gives up (returning zero
// triangles, so nothing gets drawn — no error, no fallback) whenever it
// can't find a valid ear within one full pass. Empirically this happens for
// roughly 40% of the tapered/wobbled trunk shapes this generator produces,
// which is why trunks appeared to render fine sometimes and be fully
// invisible other times. Drawing the trunk as a strip of small convex
// quads (one per taper step) sidesteps that ear-clipping path entirely:
// each quad triangulates trivially and correctly via the untriangulated
// vertex-fan default (see buildTrunkSegmentQuad).
//
function earDrawOpacity(opacity) {
  return opacity < 0.999 ? { opacity } : {}
}
function drawEarTreeTrunk(k, tree, barkColor, outlineColor, opacity = 1) {
  drawTrunkSegments(k, tree, EAR_TREE_TRUNK_OUTLINE_PAD, outlineColor, opacity)
  drawTrunkSegments(k, tree, 0, barkColor, opacity)
  drawTrunkTopRim(k, tree, outlineColor, opacity)
}
function drawTrunkSegments(k, tree, pad, color, opacity = 1) {
  for (let i = 0; i < EAR_TREE_TRUNK_STEPS; i++) {
    k.drawPolygon({ pts: buildTrunkSegmentQuad(k, tree, pad, i), color, ...earDrawOpacity(opacity) })
  }
}
//
// Black cap line along the crown — the tapered polygon alone left the top
// edge without a readable outline. Reuses trunkEdgeAtStep for the exact
// same left/right/y the trunk polygon's own top edge uses (it used to
// compute its own wobble with the wrong phase — t=0 instead of t=1 — so the
// rim's ends didn't land on the polygon's actual top corners and poked out
// past them).
//
function drawTrunkTopRim(k, tree, outlineColor, opacity = 1) {
  const edge = trunkEdgeAtStep(tree, EAR_TREE_TRUNK_OUTLINE_PAD, EAR_TREE_TRUNK_STEPS)
  k.drawLine({
    p1: k.vec2(edge.left, edge.y),
    p2: k.vec2(edge.right, edge.y),
    width: EAR_TREE_TRUNK_TOP_RIM_W,
    color: outlineColor,
    ...earDrawOpacity(opacity)
  })
}
//
// Left/right taper edge at step i (0 = ground, EAR_TREE_TRUNK_STEPS = crown).
//
function trunkEdgeAtStep(tree, pad, i) {
  const t = i / EAR_TREE_TRUNK_STEPS
  const y = tree.groundY - tree.trunkH * t
  const halfW = trunkHalfWidthAt(tree, y) + pad
  const wobble = Math.sin(t * Math.PI * 1.4 + tree.seed * 3) * tree.trunkW * EAR_TREE_TRUNK_WOBBLE
  return { left: tree.x - halfW + wobble, right: tree.x + halfW + wobble, y }
}
//
// One taper segment as a convex quad (bottom-left, bottom-right, top-right,
// top-left) — always triangulates correctly through the untriangulated
// vertex-fan default, unlike the full wavy outline (see drawEarTreeTrunk).
//
function buildTrunkSegmentQuad(k, tree, pad, i) {
  const bottom = trunkEdgeAtStep(tree, pad, i)
  const top = trunkEdgeAtStep(tree, pad, i + 1)
  return [
    k.vec2(bottom.left, bottom.y),
    k.vec2(bottom.right, bottom.y),
    k.vec2(top.right, top.y),
    k.vec2(top.left, top.y)
  ]
}
function drawEarBranch(k, tree, branch, barkColor, outlineColor, lipColor, opacity = 1) {
  const base = k.vec2(branch.baseX, branch.baseY)
  const tip = k.vec2(branch.tipX, branch.tipY)
  const limbW = Math.max(3, tree.trunkW * 0.42)
  const op = earDrawOpacity(opacity)
  k.drawCircle({ pos: base, radius: limbW * 0.55 + 1, color: outlineColor, ...op })
  k.drawCircle({ pos: base, radius: limbW * 0.45, color: barkColor, ...op })
  k.drawLine({ p1: base, p2: tip, width: limbW + 2, color: outlineColor, ...op })
  k.drawLine({ p1: base, p2: tip, width: limbW, color: barkColor, ...op })
  branch.twigs?.forEach(twig => {
    const twigBase = k.vec2(twig.baseX, twig.baseY)
    const twigTip = k.vec2(twig.tipX, twig.tipY)
    k.drawLine({ p1: twigBase, p2: twigTip, width: limbW * 0.55 + 1, color: outlineColor, ...op })
    k.drawLine({ p1: twigBase, p2: twigTip, width: limbW * 0.5, color: barkColor, ...op })
    twig.hasMouth && drawMouthAtTip(k, twigTip.x, twigTip.y,
      Math.atan2(twigTip.y - twigBase.y, twigTip.x - twigBase.x), outlineColor, lipColor, opacity)
  })
  branch.hasMouth && drawMouthAtTip(k, tip.x, tip.y,
    Math.atan2(branch.tipY - branch.baseY, branch.tipX - branch.baseX), outlineColor, lipColor, opacity)
}
//
// Upper and lower lip polygons in local mouth space (+x along the branch).
//
const MOUTH_UPPER_LIP = [
  [-0.5, -0.15],
  [-0.35, -0.55],
  [-0.08, -0.72],
  [0.2, -0.68],
  [0.45, -0.42],
  [0.5, -0.12],
  [0.35, -0.05],
  [-0.35, -0.05]
]
const MOUTH_LOWER_LIP = [
  [-0.42, 0.08],
  [-0.2, 0.42],
  [0.15, 0.55],
  [0.42, 0.38],
  [0.48, 0.12],
  [0.2, 0.06],
  [-0.25, 0.06]
]
function drawMouthAtTip(k, tipX, tipY, angle, outlineColor, lipColor, opacity = 1) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const toWorld = (lx, ly, pad = 0) => {
    const px = lx * (MOUTH_LEN + pad)
    const py = ly * (MOUTH_HALF_H + pad)
    return k.vec2(tipX + px * cos - py * sin, tipY + px * sin + py * cos)
  }
  const upper = MOUTH_UPPER_LIP.map(([lx, ly]) => toWorld(lx, ly))
  const lower = MOUTH_LOWER_LIP.map(([lx, ly]) => toWorld(lx, ly))
  //
  // Outline drawn first as the same shape scaled slightly outward from the
  // attach point (same cheap technique the old ear silhouette used) — a
  // uniform one-pixel-ish rim around each lip, no separate stroke pass needed.
  //
  const upperOutline = MOUTH_UPPER_LIP.map(([lx, ly]) => toWorld(lx, ly, MOUTH_OUTLINE_PAD))
  const lowerOutline = MOUTH_LOWER_LIP.map(([lx, ly]) => toWorld(lx, ly, MOUTH_OUTLINE_PAD))
  const op = earDrawOpacity(opacity)
  k.drawPolygon({ pts: upperOutline, color: outlineColor, triangulate: true, ...op })
  k.drawPolygon({ pts: lowerOutline, color: outlineColor, triangulate: true, ...op })
  k.drawPolygon({ pts: upper, color: lipColor, triangulate: true, ...op })
  k.drawPolygon({ pts: lower, color: lipColor, triangulate: true, ...op })
}
