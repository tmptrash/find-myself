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
import { getGlowGameplayTreeBarkShades } from './glow-palette.js'
import { paintGlowGameplayBarkOnTrunk } from './glow-tree.js'
//
// Small background trees whose branches end in clusters of red leaves —
// branches grow from the tapered trunk surface and stay at rest; only the
// landing jolt (spiky tomato) rocks the whole tree.
//
const EAR_TREE_TRUNK_H_BASE = 104
const EAR_TREE_TRUNK_W_BASE = 9
const EAR_TREE_BRANCH_COUNT_DEFAULT = 5
const EAR_TREE_BRANCH_LEN_BASE = 52
const EAR_TREE_TWIG_LEN = 18
const EAR_TREE_TWIG_COUNT = 2
const EAR_TREE_TRUNK_STEPS = 6
const EAR_TREE_TRUNK_BASE_MULT = 1.05
const EAR_TREE_TRUNK_TOP_MULT = 0.32
const EAR_TREE_TRUNK_WOBBLE = 0.12
const EAR_TREE_TRUNK_OUTLINE_PAD = 1
const EAR_TREE_BRANCH_ATTACH_MULT = 0.85
const EAR_TREE_TRUNK_TOP_RIM_W = 2
//
// Extra stroke on branch limbs beyond the bark width (outline pass draws wider).
//
const EAR_TREE_BRANCH_LIMB_OUTLINE_EXTRA = 1
const EAR_TREE_BRANCH_TWIG_OUTLINE_EXTRA = 0.5
const EAR_TREE_BRANCH_KNOT_OUTLINE_R = 0.5
//
// Red leaf clusters at branch and twig tips: each leaf is an asymmetric
// pointed oval (local +x from stem to tip), two tones plus a dark rim and
// midrib. Fan angles are offsets from the limb direction.
//
const LEAF_LEN = 15
const LEAF_HALF_W = 6
const LEAF_OUTLINE_PAD = 1
const LEAF_MIDRIB_W = 1
const LEAF_MIDRIB_FRAC = 0.82
const LEAF_BRANCH_FAN = [-0.7, 0, 0.75]
const LEAF_TWIG_FAN = [-0.45, 0.5]
const LEAF_BRANCH_SCALE = 1
const LEAF_TWIG_SCALE = 0.8
const LEAF_UP_PULL = 0.35
//
// Leaf polygons in local space: stem at the origin, tip at +x = 1; the
// upper half is a touch fuller than the lower one so leaves are not mirrored.
//
const LEAF_SHAPE = [
  [0, 0],
  [0.18, -0.62],
  [0.42, -0.95],
  [0.7, -0.78],
  [1, 0],
  [0.72, 0.62],
  [0.45, 0.82],
  [0.18, 0.5]
]
const LEAF_LIGHT_SHAPE = [
  [0.06, -0.06],
  [0.2, -0.56],
  [0.43, -0.86],
  [0.69, -0.7],
  [0.92, -0.06]
]
//
// Root fan at the base, same growTreeRootSegments algorithm the big glow
// tree uses — generated once per tree at creation time and baked into a
// sprite (never regrown), same as the trunk. Starting thickness matches the
// trunk's own local cross-section width at ground level (see
// buildEarTreeRoots) so trunk and roots read as one continuous seam instead
// of a sudden width jump.
//
const EAR_TREE_ROOT_COUNT = 3
const EAR_TREE_ROOT_SEGMENTS = 5
const EAR_TREE_ROOT_MIN_DRAW_WIDTH = 0.85
const EAR_TREE_ROOT_TIP_RADIUS = 0.55
const EAR_TREE_ROOTS_BAKE_SLOT = 'earTreeRootsShort'
const EAR_TREE_TRUNK_BAKE_SLOT = 'earTreeTrunk'
//
// Bump when trunk silhouette or outline width changes so live bakes refresh.
//
const EAR_TREE_TRUNK_BAKE_REV = 3
const EAR_TREE_ROOTS_GRAIN_SEED = 0.37
const EAR_TREE_TRUNK_GRAIN_SEED = 0.71
//
// Branch/twig/leaf reach past the trunk centre for camera culling.
//
const EAR_TREE_BRANCH_CULL_PAD = LEAF_LEN * 2
//
// Landing jolt — the whole tree rocks around its base with a decaying swing.
//
const EAR_TREE_SHAKE_DURATION = 0.6
const EAR_TREE_SHAKE_FREQ = 30
const EAR_TREE_SHAKE_MAX_RAD = 0.07
const RAD_TO_DEG = 180 / Math.PI

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
      shakeT: 0,
      branches: []
    }
    tree.branches = buildEarTreeBranches(tree)
    tree.rootSegs = buildEarTreeRoots(tree)
    return tree
  })
  return { k, trees, leafIndices: buildLeafIndices(k), branchBatch: PolyBatch.create() }
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
      twigs
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
 * Advances the landing-jolt timers of every tree.
 * @param {Object} inst - Ear-tree inst
 * @param {number} dt - Frame delta
 */
export function onUpdate(inst, dt) {
  inst.trees.forEach(tree => updateEarTree(tree, dt))
}

/**
 * Starts the landing jolt on one tree (restarts it if already rocking).
 * @param {Object} inst - Ear-tree inst
 * @param {number} index - Tree index in inst.trees
 */
export function shake(inst, index) {
  const tree = inst.trees[index]
  tree && (tree.shakeT = EAR_TREE_SHAKE_DURATION)
}

/**
 * World position of a tree's crown top, following the current jolt swing.
 * @param {Object} inst - Ear-tree inst
 * @param {number} index - Tree index in inst.trees
 * @returns {{x: number, y: number}|null}
 */
export function getCrownTop(inst, index) {
  const tree = inst.trees[index]
  if (!tree) return null
  const angle = treeShakeAngle(tree)
  return {
    x: tree.x + Math.sin(angle) * tree.trunkH,
    y: tree.groundY - Math.cos(angle) * tree.trunkH
  }
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
 * Draws branches and their red leaf clusters (trunks are on a lower overlay z).
 * @param {Object} inst - Ear-tree inst
 * @param {Object} barkColor - Kaplay rgb for branches
 * @param {Object} outlineColor - Kaplay rgb for limb outlines
 * @param {{base: Object, light: Object, vein: Object}} leafColors - Kaplay rgb leaf tones
 * @param {number} [opacity=1] - Reveal fade
 * @param {{x1: number, x2: number}|null} [view=null] - Visible world X range for culling
 */
export function onDrawBranches(inst, barkColor, outlineColor, leafColors, opacity = 1, view = null) {
  const batch = inst.branchBatch
  PolyBatch.reset(batch)
  inst.trees.forEach(tree => {
    const reach = tree.branchLen + EAR_TREE_TWIG_LEN + EAR_TREE_BRANCH_CULL_PAD
    if (!isWorldSpanInView(tree.x - reach, tree.x + reach, view)) return
    const angle = treeShakeAngle(tree)
    tree.drawAngle = angle
    tree.drawCos = Math.cos(angle)
    tree.drawSin = Math.sin(angle)
    tree.branches.forEach(branch =>
      addEarBranch(batch, inst.leafIndices, tree, branch, barkColor, outlineColor, leafColors))
  })
  PolyBatch.flush(batch, inst.k, opacity)
}
function updateEarTree(tree, dt) {
  tree.shakeT > 0 && (tree.shakeT = Math.max(0, tree.shakeT - dt))
}
//
// Static trunk blit — baked once per bark/outline colour pair.
//
function drawEarTreeTrunk(k, tree, barkColor, outlineColor, opacity, view) {
  const baked = ensureStaticDecorSprite(k, tree, EAR_TREE_TRUNK_BAKE_SLOT,
    `${colorKey(barkColor, outlineColor)}-r${EAR_TREE_TRUNK_BAKE_REV}`,
    trunkBounds(tree), ctx => paintEarTreeTrunk(ctx, tree, barkColor, outlineColor),
    tree.x * EAR_TREE_TRUNK_GRAIN_SEED)
  if (!baked || !isWorldSpanInView(baked.x, baked.x + baked.w, view)) return
  const angle = treeShakeAngle(tree)
  if (!angle) {
    drawStaticDecorSprite(k, baked, opacity)
    return
  }
  //
  // Rocking trunk pivots on its base point so it never detaches from the roots.
  //
  k.drawSprite({
    sprite: baked.sprite,
    pos: k.vec2(tree.x, tree.groundY),
    anchor: k.vec2((tree.x - baked.x) / baked.w * 2 - 1, (tree.groundY - baked.y) / baked.h * 2 - 1),
    angle: angle * RAD_TO_DEG,
    ...(opacity < 1 ? { opacity } : {})
  })
}
//
// Decaying swing angle (radians) of the landing jolt; 0 when the tree is still.
//
function treeShakeAngle(tree) {
  if (!(tree.shakeT > 0)) return 0
  const decay = tree.shakeT / EAR_TREE_SHAKE_DURATION
  return Math.sin((EAR_TREE_SHAKE_DURATION - tree.shakeT) * EAR_TREE_SHAKE_FREQ) * EAR_TREE_SHAKE_MAX_RAD * decay
}
//
// Rotates a world point around the tree base by the current draw swing.
//
function swingX(tree, x, y) {
  if (!tree.drawAngle) return x
  return tree.x + (x - tree.x) * tree.drawCos - (y - tree.groundY) * tree.drawSin
}
function swingY(tree, x, y) {
  if (!tree.drawAngle) return y
  return tree.groundY + (x - tree.x) * tree.drawSin + (y - tree.groundY) * tree.drawCos
}
//
// Canvas fills the whole wavy taper as one path, so the outline and bark
// read as one seamless silhouette (no per-step quad seams).
//
function paintEarTreeTrunk(ctx, tree, barkColor, outlineColor) {
  fillTrunkOutline(ctx, tree, EAR_TREE_TRUNK_OUTLINE_PAD, outlineColor)
  fillTrunkOutline(ctx, tree, 0, barkColor)
  paintTrunkTopRim(ctx, tree, outlineColor)
  const segs = buildEarTreeTrunkSegs(tree)
  paintGlowGameplayBarkOnTrunk(
    ctx,
    segs,
    (tree.seed + tree.x * 0.17) | 0,
    tree.groundY,
    getGlowGameplayTreeBarkShades()
  )
}
//
// Tapered trunk as a segment chain for the shared glow-tree bark pass.
//
function buildEarTreeTrunkSegs(tree) {
  const segs = []
  for (let i = 0; i < EAR_TREE_TRUNK_STEPS; i++) {
    const e0 = trunkEdgeAtStep(tree, 0, i)
    const e1 = trunkEdgeAtStep(tree, 0, i + 1)
    segs.push({
      sx: (e0.left + e0.right) * 0.5,
      sy: e0.y,
      ex: (e1.left + e1.right) * 0.5,
      ey: e1.y,
      w: e0.right - e0.left,
      w2: e1.right - e1.left
    })
  }
  return segs
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
// Queues one branch (base knot, limb, twigs, leaves) into the layer batch in
// back-to-front order.
//
function addEarBranch(batch, leafIndices, tree, branch, barkColor, outlineColor, leafColors) {
  const limbW = Math.max(3, tree.trunkW * 0.42)
  const bx = swingX(tree, branch.baseX, branch.baseY)
  const by = swingY(tree, branch.baseX, branch.baseY)
  const tx = swingX(tree, branch.tipX, branch.tipY)
  const ty = swingY(tree, branch.tipX, branch.tipY)
  PolyBatch.addDisc(batch, bx, by, limbW * 0.55 + EAR_TREE_BRANCH_KNOT_OUTLINE_R, outlineColor)
  PolyBatch.addDisc(batch, bx, by, limbW * 0.45, barkColor)
  PolyBatch.addLine(batch, bx, by, tx, ty, limbW + EAR_TREE_BRANCH_LIMB_OUTLINE_EXTRA, outlineColor)
  PolyBatch.addLine(batch, bx, by, tx, ty, limbW, barkColor)
  branch.twigs?.forEach(twig => {
    const wbx = swingX(tree, twig.baseX, twig.baseY)
    const wby = swingY(tree, twig.baseX, twig.baseY)
    const wtx = swingX(tree, twig.tipX, twig.tipY)
    const wty = swingY(tree, twig.tipX, twig.tipY)
    PolyBatch.addLine(batch, wbx, wby, wtx, wty, limbW * 0.55 + EAR_TREE_BRANCH_TWIG_OUTLINE_EXTRA, outlineColor)
    PolyBatch.addLine(batch, wbx, wby, wtx, wty, limbW * 0.5, barkColor)
    addLeafCluster(batch, leafIndices, wtx, wty, Math.atan2(wty - wby, wtx - wbx), LEAF_TWIG_FAN, LEAF_TWIG_SCALE, leafColors)
  })
  addLeafCluster(batch, leafIndices, tx, ty, Math.atan2(ty - by, tx - bx), LEAF_BRANCH_FAN, LEAF_BRANCH_SCALE, leafColors)
}
//
// Fans a few leaves around the limb direction, pulled slightly upward so the
// cluster reads as a crown, not as spikes continuing the limb.
//
function addLeafCluster(batch, leafIndices, x, y, limbAngle, fan, scale, leafColors) {
  const upAngle = limbAngle + angleDelta(limbAngle, -Math.PI / 2) * LEAF_UP_PULL
  fan.forEach(offset => addLeaf(batch, leafIndices, x, y, upAngle + offset, scale, leafColors))
}
//
// Signed shortest rotation from angle a to angle b.
//
function angleDelta(a, b) {
  return Math.atan2(Math.sin(b - a), Math.cos(b - a))
}
//
// Leaf shapes only ever rotate and scale (positive, per axis), which keeps a
// valid triangulation valid — ear-clipping runs once at create time.
//
function buildLeafIndices(k) {
  return {
    leaf: triangulateLeafShape(k, LEAF_SHAPE),
    light: triangulateLeafShape(k, LEAF_LIGHT_SHAPE)
  }
}
function triangulateLeafShape(k, shape) {
  const pts = shape.map(([lx, ly]) => k.vec2(lx * LEAF_LEN, ly * LEAF_HALF_W))
  return k.triangulate(pts).flatMap(tri => tri.map(p => pts.indexOf(p)))
}
//
// Dark rim (same shape scaled outward), body, lit upper half, midrib.
//
function addLeaf(batch, leafIndices, x, y, angle, scale, leafColors) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  const len = LEAF_LEN * scale
  const halfW = LEAF_HALF_W * scale
  PolyBatch.addShape(batch, LEAF_SHAPE, leafIndices.leaf, x, y, len + LEAF_OUTLINE_PAD * 2, halfW + LEAF_OUTLINE_PAD, cos, sin, leafColors.vein)
  PolyBatch.addShape(batch, LEAF_SHAPE, leafIndices.leaf, x, y, len, halfW, cos, sin, leafColors.base)
  PolyBatch.addShape(batch, LEAF_LIGHT_SHAPE, leafIndices.light, x, y, len, halfW, cos, sin, leafColors.light)
  const ribLen = len * LEAF_MIDRIB_FRAC
  PolyBatch.addLine(batch, x, y, x + cos * ribLen, y + sin * ribLen, LEAF_MIDRIB_W, leafColors.vein)
}
