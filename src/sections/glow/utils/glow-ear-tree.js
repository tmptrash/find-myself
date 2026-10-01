import { clampRootSegmentsBelowGroundLine, growTreeRootSegments } from '../../../utils/grow-tree-root.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import {
  colorKey,
  cssRgb,
  drawStaticDecorSprite,
  ensureStaticDecorSprite,
  isWorldSpanInView,
  rootSegmentsBounds
} from './glow-static-bake.js'
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
// tree uses — generated once per tree at creation time and baked into a
// sprite (never regrown), same as the trunk. Starting thickness matches the
// trunk's own local cross-section width at ground level (see
// buildEarTreeRoots) so trunk and roots read as one continuous seam instead
// of a sudden width jump.
//
const EAR_TREE_ROOT_COUNT = 3
const EAR_TREE_ROOT_SEGMENTS = 10
const EAR_TREE_ROOT_MIN_DRAW_WIDTH = 0.85
const EAR_TREE_ROOT_TIP_RADIUS = 0.55
const EAR_TREE_ROOTS_BAKE_SLOT = 'earTreeRoots'
const EAR_TREE_TRUNK_BAKE_SLOT = 'earTreeTrunk'
const EAR_TREE_ROOTS_GRAIN_SEED = 0.37
const EAR_TREE_TRUNK_GRAIN_SEED = 0.71
//
// Branch/twig/mouth reach past the trunk centre for camera culling.
//
const EAR_TREE_BRANCH_CULL_PAD = MOUTH_LEN + MOUTH_HALF_H

/**
 * Creates the ear-tree decor inst for a set of ground-planted spots.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst (draws, bakes, one-off lip triangulation)
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
  return { k, trees, mouthIndices: buildMouthIndices(k), branchBatch: PolyBatch.create() }
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
// and thinner roots. Cached on the tree and baked into a sprite on first
// draw (never regrown).
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
// Root fan blit — the ~500 tapered segments per tree are baked once per
// colour instead of being re-stroked every frame.
//
function drawEarTreeRoots(k, tree, rootColor, opacity, view) {
  if (!tree.rootSegs?.length) return
  const baked = ensureStaticDecorSprite(k, tree, EAR_TREE_ROOTS_BAKE_SLOT, colorKey(rootColor),
    rootSegmentsBounds(tree.rootSegs, EAR_TREE_ROOT_MIN_DRAW_WIDTH),
    ctx => paintEarTreeRoots(ctx, tree.rootSegs, rootColor),
    tree.x * EAR_TREE_ROOTS_GRAIN_SEED)
  if (!baked || !isWorldSpanInView(baked.x, baked.x + baked.w, view)) return
  drawStaticDecorSprite(k, baked, opacity)
}
//
// Fill-only root lines — round caps plus a tip dot on every terminal end so
// the taper never reads as chopped off before the point.
//
function paintEarTreeRoots(ctx, segs, rootColor) {
  const startKeys = new Set(segs.map(seg => `${seg.startX},${seg.startY}`))
  ctx.lineCap = 'round'
  ctx.strokeStyle = cssRgb(rootColor)
  ctx.fillStyle = cssRgb(rootColor)
  segs.forEach(seg => {
    ctx.lineWidth = Math.max(EAR_TREE_ROOT_MIN_DRAW_WIDTH, seg.width)
    ctx.beginPath()
    ctx.moveTo(seg.startX, seg.startY)
    ctx.lineTo(seg.endX, seg.endY)
    ctx.stroke()
  })
  segs.forEach(seg => {
    if (startKeys.has(`${seg.endX},${seg.endY}`)) return
    const tipR = Math.max(EAR_TREE_ROOT_TIP_RADIUS, seg.width * 0.45)
    ctx.beginPath()
    ctx.arc(seg.endX, seg.endY, tipR, 0, Math.PI * 2)
    ctx.fill()
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
 * Draws every tree trunk (baked sprite) under the hero.
 * @param {Object} inst - Ear-tree inst
 * @param {Object} barkColor - Kaplay rgb for trunk fill
 * @param {Object} outlineColor - Kaplay rgb for trunk outline
 * @param {number} [opacity=1] - Reveal fade
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDrawTrunks(inst, barkColor, outlineColor, opacity = 1, view = null) {
  inst.trees.forEach(tree => drawEarTreeTrunk(inst.k, tree, barkColor, outlineColor, opacity, view))
}

/**
 * Draws every root fan (baked sprite) above the grass layer so blade tufts
 * do not crop taper tips.
 * @param {Object} inst - Ear-tree inst
 * @param {Object} rootColor - Kaplay rgb for the root fan, big-tree style
 * @param {number} [opacity=1] - Reveal fade
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDrawRoots(inst, rootColor, opacity = 1, view = null) {
  inst.trees.forEach(tree => drawEarTreeRoots(inst.k, tree, rootColor, opacity, view))
}

/**
 * Redraws every trunk above grass and shore decor (branches draw on a higher z).
 * @param {Object} inst - Ear-tree inst
 * @param {Object} barkColor - Kaplay rgb for trunk fill
 * @param {Object} outlineColor - Kaplay rgb for trunk outline
 * @param {number} [opacity=1] - Reveal fade
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDrawTrunksAboveGrass(inst, barkColor, outlineColor, opacity = 1, view = null) {
  inst.trees.forEach(tree => drawEarTreeTrunk(inst.k, tree, barkColor, outlineColor, opacity, view))
}

/**
 * Draws branches and lip mouths only (trunks are on a lower overlay z).
 * @param {Object} inst - Ear-tree inst
 * @param {Object} barkColor - Kaplay rgb for branches
 * @param {Object} outlineColor - Kaplay rgb for outlines
 * @param {Object} lipColor - Kaplay rgb for lip fill
 * @param {number} [opacity=1] - Reveal fade
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDrawBranches(inst, barkColor, outlineColor, lipColor, opacity = 1, view = null) {
  const batch = inst.branchBatch
  PolyBatch.reset(batch)
  inst.trees.forEach(tree => {
    const reach = tree.branchLen + EAR_TREE_TWIG_LEN + EAR_TREE_BRANCH_CULL_PAD
    if (!isWorldSpanInView(tree.x - reach, tree.x + reach, view)) return
    tree.branches.forEach(branch =>
      addEarBranch(batch, inst.mouthIndices, tree, branch, barkColor, outlineColor, lipColor))
  })
  PolyBatch.flush(batch, inst.k, opacity)
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
// Static trunk blit — baked once per bark/outline colour pair.
//
function drawEarTreeTrunk(k, tree, barkColor, outlineColor, opacity, view) {
  const baked = ensureStaticDecorSprite(k, tree, EAR_TREE_TRUNK_BAKE_SLOT, colorKey(barkColor, outlineColor),
    trunkBounds(tree), ctx => paintEarTreeTrunk(ctx, tree, barkColor, outlineColor),
    tree.x * EAR_TREE_TRUNK_GRAIN_SEED)
  if (!baked || !isWorldSpanInView(baked.x, baked.x + baked.w, view)) return
  drawStaticDecorSprite(k, baked, opacity)
}
//
// Canvas fills the whole wavy taper as one path, so the outline and bark
// read as one seamless silhouette (no per-step quad seams).
//
function paintEarTreeTrunk(ctx, tree, barkColor, outlineColor) {
  fillTrunkOutline(ctx, tree, EAR_TREE_TRUNK_OUTLINE_PAD, outlineColor)
  fillTrunkOutline(ctx, tree, 0, barkColor)
  paintTrunkTopRim(ctx, tree, outlineColor)
}
function fillTrunkOutline(ctx, tree, pad, color) {
  ctx.fillStyle = cssRgb(color)
  const base = trunkEdgeAtStep(tree, pad, 0)
  ctx.beginPath()
  ctx.moveTo(base.left, base.y)
  for (let i = 1; i <= EAR_TREE_TRUNK_STEPS; i++) {
    const edge = trunkEdgeAtStep(tree, pad, i)
    ctx.lineTo(edge.left, edge.y)
  }
  for (let i = EAR_TREE_TRUNK_STEPS; i >= 0; i--) {
    const edge = trunkEdgeAtStep(tree, pad, i)
    ctx.lineTo(edge.right, edge.y)
  }
  ctx.closePath()
  ctx.fill()
}
//
// Black cap line along the crown — the tapered polygon alone left the top
// edge without a readable outline. Reuses trunkEdgeAtStep for the exact
// same left/right/y the trunk polygon's own top edge uses so the rim's ends
// land on the polygon's actual top corners.
//
function paintTrunkTopRim(ctx, tree, outlineColor) {
  const edge = trunkEdgeAtStep(tree, EAR_TREE_TRUNK_OUTLINE_PAD, EAR_TREE_TRUNK_STEPS)
  ctx.strokeStyle = cssRgb(outlineColor)
  ctx.lineWidth = EAR_TREE_TRUNK_TOP_RIM_W
  ctx.lineCap = 'butt'
  ctx.beginPath()
  ctx.moveTo(edge.left, edge.y)
  ctx.lineTo(edge.right, edge.y)
  ctx.stroke()
}
function trunkBounds(tree) {
  const bounds = { x1: Infinity, y1: Infinity, x2: -Infinity, y2: -Infinity }
  for (let i = 0; i <= EAR_TREE_TRUNK_STEPS; i++) {
    const edge = trunkEdgeAtStep(tree, EAR_TREE_TRUNK_OUTLINE_PAD, i)
    bounds.x1 = Math.min(bounds.x1, edge.left)
    bounds.x2 = Math.max(bounds.x2, edge.right)
  }
  bounds.y1 = tree.groundY - tree.trunkH - EAR_TREE_TRUNK_TOP_RIM_W
  bounds.y2 = tree.groundY
  return bounds
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
// Queues one branch (base knot, limb, twigs, lips) into the layer batch in
// the same back-to-front order the separate draw calls used.
//
function addEarBranch(batch, mouthIndices, tree, branch, barkColor, outlineColor, lipColor) {
  const limbW = Math.max(3, tree.trunkW * 0.42)
  PolyBatch.addDisc(batch, branch.baseX, branch.baseY, limbW * 0.55 + 1, outlineColor)
  PolyBatch.addDisc(batch, branch.baseX, branch.baseY, limbW * 0.45, barkColor)
  PolyBatch.addLine(batch, branch.baseX, branch.baseY, branch.tipX, branch.tipY, limbW + 2, outlineColor)
  PolyBatch.addLine(batch, branch.baseX, branch.baseY, branch.tipX, branch.tipY, limbW, barkColor)
  branch.twigs?.forEach(twig => {
    PolyBatch.addLine(batch, twig.baseX, twig.baseY, twig.tipX, twig.tipY, limbW * 0.55 + 1, outlineColor)
    PolyBatch.addLine(batch, twig.baseX, twig.baseY, twig.tipX, twig.tipY, limbW * 0.5, barkColor)
    twig.hasMouth && addMouth(batch, mouthIndices, twig.tipX, twig.tipY,
      Math.atan2(twig.tipY - twig.baseY, twig.tipX - twig.baseX), outlineColor, lipColor)
  })
  branch.hasMouth && addMouth(batch, mouthIndices, branch.tipX, branch.tipY,
    Math.atan2(branch.tipY - branch.baseY, branch.tipX - branch.baseX), outlineColor, lipColor)
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
//
// Lip shapes only ever rotate and scale (positive, per axis), which keeps any
// valid triangulation valid — so ear-clipping runs once at create time
// instead of on every one of the ~60 lip polygons each frame.
//
function buildMouthIndices(k) {
  return {
    upper: triangulateMouthShape(k, MOUTH_UPPER_LIP),
    lower: triangulateMouthShape(k, MOUTH_LOWER_LIP)
  }
}
function triangulateMouthShape(k, shape) {
  const pts = shape.map(([lx, ly]) => k.vec2(lx * MOUTH_LEN, ly * MOUTH_HALF_H))
  return k.triangulate(pts).flatMap(tri => tri.map(p => pts.indexOf(p)))
}
function addMouth(batch, mouthIndices, tipX, tipY, angle, outlineColor, lipColor) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const outlineW = MOUTH_LEN + MOUTH_OUTLINE_PAD
  const outlineH = MOUTH_HALF_H + MOUTH_OUTLINE_PAD
  //
  // Outline drawn first as the same shape scaled slightly outward from the
  // attach point (same cheap technique the old ear silhouette used) — a
  // uniform one-pixel-ish rim around each lip, no separate stroke pass needed.
  //
  PolyBatch.addShape(batch, MOUTH_UPPER_LIP, mouthIndices.upper, tipX, tipY, outlineW, outlineH, cos, sin, outlineColor)
  PolyBatch.addShape(batch, MOUTH_LOWER_LIP, mouthIndices.lower, tipX, tipY, outlineW, outlineH, cos, sin, outlineColor)
  PolyBatch.addShape(batch, MOUTH_UPPER_LIP, mouthIndices.upper, tipX, tipY, MOUTH_LEN, MOUTH_HALF_H, cos, sin, lipColor)
  PolyBatch.addShape(batch, MOUTH_LOWER_LIP, mouthIndices.lower, tipX, tipY, MOUTH_LEN, MOUTH_HALF_H, cos, sin, lipColor)
}
