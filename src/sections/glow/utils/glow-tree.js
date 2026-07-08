/**
 * Glow section — deterministic organic tree generator.
 * All randomness is seeded so the same seed always produces the same tree.
 * Change the seed constant exported below to get a different tree shape.
 *
 * The tree is rendered once to an HTMLCanvasElement via renderGlowTreeToCanvas()
 * and loaded as a Kaplay sprite so that per-frame drawing cost is zero.
 */

import { growTreeRootSegments } from '../../../utils/grow-tree-root.js'
import { getTreeBarkPalette } from './glow-palette.js'

//
// Default seed — modify this value to reshape the entire tree.
//
export const TREE_SEED = 3712
//
// Root rendering tuning — taper zones and the trunk-base flare geometry.
//
const ROOT_BOTTOM_TAPER_ZONE = 38
const ROOT_GROUND_TAPER_ZONE = 42
const ROOT_TRUNK_BOOST_FALLOFF = 44
const ROOT_FLARE_H = 36
const ROOT_FLARE_BOTTOM_FRAC = 0.55
//
// Roots are hard-clipped this many px BELOW the ground line — no root stroke
// (taper aside) can ever poke above the ground surface.
//
const ROOT_CLIP_BELOW_GROUND = 2
//
// Side shading — the sun sits top-right, so trunk and branches carry a soft
// dark band along their lower-left side. The band follows each segment (no
// straight screen-space gradient), so the wobbly silhouette keeps its shape.
//
const SHADE_LIGHT_DIR_X = 0.66
const SHADE_LIGHT_DIR_Y = -0.75
const SHADE_ALPHA = 0.16
const SHADE_WIDTH_FRAC = 0.4
const SHADE_MIN_SEG_W = 6
//
// Trunk bark texture — the sun sits top-RIGHT, so the trunk carries a dark
// shade band along its left edge and a soft highlight along its right edge.
// Wavy bark lines follow the trunk centreline at these half-width fractions.
//
const BARK_SHADOW_BAND_FRAC = 0.42
const BARK_SHADOW_ALPHA = 0.2
const BARK_HIGHLIGHT_BAND_FRAC = 0.3
const BARK_HIGHLIGHT_ALPHA = 0.16
const BARK_LINE_FRACS = [-0.74, -0.52, -0.3, -0.1, 0.12, 0.34, 0.55, 0.76]
const BARK_LINE_ALPHA_MIN = 0.1
const BARK_LINE_ALPHA_RANGE = 0.12
const BARK_LINE_JITTER = 3
const BARK_LINE_WIDTH_MIN = 1
const BARK_LINE_WIDTH_RANGE = 1.2
const BARK_NOTCH_COUNT = 14
const BARK_NOTCH_ALPHA = 0.16
const BARK_KNOT_COUNT = 3
const BARK_KNOT_ALPHA = 0.22
//
// Outline width for the trunk/branch silhouette (palette.woodOutline tone).
// Implemented as an underdraw: the wood is painted first with widths grown by
// this many px per side, then the normal fills cover everything but the rim.
//
const WOOD_OUTLINE_PX = 1
//
// Default trunk-height band (fractions of the trunk) branches sprout from.
// Background trees pass a higher minimum so their foliage gathers at the top.
//
const BRANCH_FRAC_MIN = 0.5
const BRANCH_FRAC_MAX = 0.92
//
// Upward branch mode (background trees): branches leave the trunk close to
// vertical instead of sideways, so their leaves stay near the crown.
//
const BRANCH_UP_SPREAD_MIN = 0.2
const BRANCH_UP_SPREAD_RANGE = 0.45
//
// Canopy cluster leaves — size range of the dense top-crown teardrops.
//
const CANOPY_LEAF_SIZE_MIN = 13
const CANOPY_LEAF_SIZE_RANGE = 11
const CANOPY_LEAF_OPACITY_MIN = 0.85
const CANOPY_LEAF_OPACITY_RANGE = 0.15
//
// Horizontal branch length (px) — the branch that extends left from the trunk.
//
export const HORIZ_BRANCH_LENGTH = 200

/**
 * Creates a seeded pseudo-random number generator.
 * @param {number} seed - Integer seed; different values produce different trees.
 * @returns {function(): number} Returns a float in [0, 1).
 */
export function createRng(seed) {
  let s = (seed >>> 0)
  return () => {
    s = ((s * 1664525 + 1013904223) >>> 0)
    return s / 4294967296
  }
}

/**
 * Builds complete static tree data from a seed value.
 * @param {number} seed - Shape seed (integer)
 * @param {number} trunkX - Horizontal centre of the trunk base
 * @param {number} trunkBottomY - Y coordinate of the trunk base (ground level)
 * @param {number} trunkTopY - Y coordinate of the trunk apex
 * @param {number} rootMaxY - Furthest Y down roots are allowed to reach
 * @param {number} [rootStartY] - Y where roots start (defaults to trunk base)
 * @param {Object} [opts] - { includeRoots, includeHeroBranch, branchFracMin,
 *   branchFracMax, branchUpward } — background parallax trees skip roots and
 *   the hero platform branch, push branches to the top of the trunk and grow
 *   them upward instead of sideways.
 * @returns {Object} { seed, trunkSegs, rootSegs, branchSegs, leaves, horizBranch }
 */
export function buildGlowTree(seed, trunkX, trunkBottomY, trunkTopY, rootMaxY, rootStartY, opts = {}) {
  const {
    includeRoots = true,
    includeHeroBranch = true,
    branchFracMin = BRANCH_FRAC_MIN,
    branchFracMax = BRANCH_FRAC_MAX,
    branchUpward = false
  } = opts
  const rng = createRng(seed)
  const treeH = trunkBottomY - trunkTopY
  const rootBaseY = rootStartY !== undefined ? rootStartY : trunkBottomY
  const maxRootY = rootMaxY !== undefined ? rootMaxY : rootBaseY + 80
  const trunkSegs = buildTrunk(rng, trunkX, trunkBottomY, trunkTopY)
  const rootSegs = includeRoots ? buildRoots(rng, trunkSegs, rootBaseY, treeH, maxRootY) : []
  const branchSegs = []
  const leafEndpoints = []
  //
  // Seeded branches sprout from random heights along the configured trunk band.
  //
  buildBranchesFromTrunk(rng, trunkSegs, branchSegs, leafEndpoints, branchFracMin, branchFracMax, branchUpward)
  //
  // Top crown — three clusters grow from the trunk apex for a full canopy.
  //
  const trunkTop = trunkSegs[trunkSegs.length - 1]
  const crownAngles = [-Math.PI / 2, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55]
  crownAngles.forEach(angle => {
    const len = 28 + rng() * 22
    growBranch(rng, trunkTop.ex, trunkTop.ey, angle, Math.round(len), 10, branchSegs, leafEndpoints, 0)
  })
  //
  // Special horizontal branch in the lower-left: starts horizontal then turns organic.
  // This branch has a physics collision box — the hero starts here.
  //
  const horizBranch = includeHeroBranch ? buildHorizBranch(rng, trunkSegs, branchSegs, leafEndpoints) : null
  const leaves = buildLeaves(rng, leafEndpoints)
  return { seed, trunkSegs, rootSegs, branchSegs, leaves, horizBranch, rootStartY: rootBaseY }
}

/**
 * Renders the complete tree to an HTMLCanvasElement using canvas2D.
 * The canvas is transparent except for the tree pixels.
 * Load the returned canvas with k.loadSprite() and display it as a full-screen sprite.
 * @param {Object} treeData - Output of buildGlowTree()
 * @param {Object} palette - Color palette (e.g. TREE_PALETTE_GRAY)
 * @param {number} w - Canvas width (should match screen width)
 * @param {number} h - Canvas height (should match screen height)
 * @returns {HTMLCanvasElement} Ready-to-load canvas
 */
export function renderGlowTreeToCanvas(treeData, palette, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  renderGlowTreeIntoContext(ctx, treeData, palette, w, h)
  return canvas
}

/**
 * Renders the complete tree into an EXISTING canvas2D context — several trees
 * can share one layer canvas (used by the big background parallax trees).
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {Object} treeData - Output of buildGlowTree()
 * @param {Object} palette - Color palette (e.g. getTreePaletteGray())
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 */
export function renderGlowTreeIntoContext(ctx, treeData, palette, w, h) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  //
  // Per-part colors — gray uses one tone; color palette splits roots/trunk/leaves.
  //
  const rootR = palette.rootR ?? palette.treeR ?? 144
  const rootG = palette.rootG ?? palette.treeG ?? 144
  const rootB = palette.rootB ?? palette.treeB ?? 144
  const trunkR = palette.trunkR ?? palette.treeR ?? rootR
  const trunkG = palette.trunkG ?? palette.treeG ?? rootG
  const trunkB = palette.trunkB ?? palette.treeB ?? rootB
  const branchR = palette.branchR ?? trunkR
  const branchG = palette.branchG ?? trunkG
  const branchB = palette.branchB ?? trunkB
  const leafR = palette.leafR ?? palette.treeR ?? trunkR
  const leafG = palette.leafG ?? palette.treeG ?? trunkG
  const leafB = palette.leafB ?? palette.treeB ?? trunkB
  //
  // Bark tones come from the palette per phase — gray phase stays grayscale.
  //
  const fallbackBark = getTreeBarkPalette()
  const barkDark = palette.barkShades?.dark ?? glowHexToRgb(fallbackBark.dark)
  const barkHighlight = palette.barkShades?.highlight ?? glowHexToRgb(fallbackBark.highlight)
  //
  // Roots — organic stroke network (same primitive as the ready/menu trees).
  // Width tapers with proximity to the ground surface so no root ever reads
  // above the ground line, while segments under the trunk base keep full
  // width — the trunk fill painted afterwards makes the joint seamless.
  //
  const groundY = treeData.rootStartY ?? (treeData.trunkSegs[0]?.sy ?? h)
  const trunkBaseX = treeData.trunkSegs[0]?.sx ?? 0
  const trunkHalfW = (treeData.trunkSegs[0]?.w ?? 74) * 0.5
  ctx.lineCap = 'round'
  //
  // Roots are optional — background parallax trees are built without them.
  //
  if (treeData.rootSegs.length) {
    //
    // Hard clip: root strokes may only paint below the ground line, so no root
    // ever pokes above the ground regardless of stroke width or round caps.
    //
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, groundY + ROOT_CLIP_BELOW_GROUND, w, h - groundY - ROOT_CLIP_BELOW_GROUND)
    ctx.clip()
    drawRootStrokes(ctx, treeData, { r: rootR, g: rootG, b: rootB }, h, groundY, trunkBaseX, trunkHalfW)
    ctx.restore()
    //
    // Root flare — a tapering wedge in the root tone directly under the trunk
    // base. Its top edge matches the trunk width EXACTLY, so the trunk-to-roots
    // transition is seamless in width; individual root strokes grow out of it.
    //
    ctx.fillStyle = `rgb(${rootR}, ${rootG}, ${rootB})`
    traceRootFlarePath(ctx, trunkBaseX, trunkHalfW, groundY)
    ctx.fill()
  }
  //
  // Wood clip line: the trunk base or the ground line (roots start), whichever
  // is higher. Trees built with the trunk sunk below ground are cut exactly at
  // the ground line so the base never floats and never pokes below the floor.
  //
  const trunkClipY = Math.min(treeData.trunkSegs.length > 0 ? treeData.trunkSegs[0].sy : h, groundY)
  const trunkRgb = { r: trunkR, g: trunkG, b: trunkB }
  const branchRgb = { r: branchR, g: branchG, b: branchB }
  //
  // Branches — filled capsule segments in the light branch tone. Drawn BEFORE
  // the trunk so every branch base is covered by the trunk silhouette: bases
  // emerge organically from the trunk edge instead of showing rectangular
  // butts, and no branch run reads as a stripe inside the trunk.
  //
  //
  // Optional 1 px outline around trunk + branches (NOT leaves, NOT roots):
  // underdraw the whole wood silhouette slightly wider in the outline tone —
  // the regular fills painted next leave only the outer rim visible, so no
  // internal seams appear at branch/trunk junctions.
  //
  if (palette.woodOutline) {
    const ol = palette.woodOutline
    treeData.branchSegs.forEach(seg => {
      drawFilledWoodSegment(ctx, { ...seg, w: seg.w + WOOD_OUTLINE_PX * 2 }, ol, trunkClipY)
    })
    fillWoodChain(ctx, expandChainWidths(treeData.trunkSegs, WOOD_OUTLINE_PX * 2), ol, trunkClipY)
  }
  treeData.branchSegs.forEach(seg => {
    drawFilledWoodSegment(ctx, seg, branchRgb, trunkClipY)
  })
  const treeSeed = treeData.seed ?? TREE_SEED
  drawBranchCracks(ctx, treeData.branchSegs, barkDark, treeSeed + 1777, trunkClipY)
  //
  // Trunk — one smooth silhouette (per-joint averaged normals, continuous
  // width taper) topped with a full bark pass: sun-side shading (dark left,
  // highlight right — the sun is top-right), wavy bark lines that follow the
  // centreline, notches, knots and fractal cracks.
  //
  fillWoodChain(ctx, treeData.trunkSegs, trunkRgb, trunkClipY)
  drawTrunkBark(ctx, treeData.trunkSegs, barkDark, barkHighlight, treeSeed + 557, trunkClipY)
  drawTrunkCracks(ctx, treeData.trunkSegs, barkDark, treeSeed + 991, trunkClipY)
  //
  // Sun-side shading on branches — soft dark band along the lower-left of
  // every branch. The band follows each segment so the wobbly silhouette
  // never shows a straight screen-space seam.
  //
  drawWoodShading(ctx, treeData.branchSegs, barkDark, trunkClipY)
  //
  // Leaves — note-tree style teardrop leaves with a centre vein.
  //
  ctx.globalAlpha = 1
  const leafShades = palette.leafShades ?? [{ r: leafR, g: leafG, b: leafB }]
  //
  // Background palettes disable leaf details — plain teardrops, no vein line.
  //
  const vein = palette.noLeafDetails ? null : (palette.leafVein ?? barkDark)
  treeData.leaves.forEach(leaf => {
    const shade = leafShades[leaf.shadeIdx ?? 0] ?? leafShades[0]
    const opacity = (leaf.opacity ?? 1) * (palette.leafOpacity ?? 1)
    drawLeafToCanvas(ctx, leaf.x, leaf.y, leaf.size, leaf.angle, shade.r, shade.g, shade.b, opacity, vein)
  })
}

/**
 * Paints a dense elliptical canopy cluster of teardrop leaves — used to give
 * the background parallax trees lush tops that merge into a solid leaf band.
 * Leaves crowd toward the ellipse centre so the crown core reads solid while
 * the rim stays organically ragged. Fully deterministic per seed.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {Object} opts - { seed, cx, cy, rx, ry, count, palette }
 */
export function renderGlowCanopyIntoContext(ctx, opts) {
  const { seed, cx, cy, rx, ry, count, palette } = opts
  const rng = createRng(seed)
  const leafShades = palette.leafShades ?? [{ r: palette.leafR, g: palette.leafG, b: palette.leafB }]
  const vein = palette.noLeafDetails ? null : (palette.leafVein ?? null)
  for (let i = 0; i < count; i++) {
    //
    // Square-root-free radial bias: multiplying two rng() samples pulls the
    // distribution toward the centre, keeping the crown core dense.
    //
    const a = rng() * Math.PI * 2
    const dist = rng() * (0.35 + rng() * 0.65)
    const x = cx + Math.cos(a) * rx * dist
    const y = cy + Math.sin(a) * ry * dist
    const size = CANOPY_LEAF_SIZE_MIN + rng() * CANOPY_LEAF_SIZE_RANGE
    const shade = leafShades[Math.min(leafShades.length - 1, Math.floor(rng() * leafShades.length + rng() * 0.4))]
    const opacity = CANOPY_LEAF_OPACITY_MIN + rng() * CANOPY_LEAF_OPACITY_RANGE
    drawLeafToCanvas(ctx, x, y, size, (rng() - 0.5) * 2, shade.r, shade.g, shade.b, opacity, vein)
  }
}
//
// Builds the trunk as tapered segments drifting organically from base to apex.
//
function buildTrunk(rng, trunkX, bottomY, topY) {
  const STEPS = 18
  const TRUNK_W_BASE = 74
  const TRUNK_W_TOP = 10
  const segs = []
  const stepH = (bottomY - topY) / STEPS
  let cx = trunkX
  let cy = bottomY
  for (let i = 0; i < STEPS; i++) {
    const prevX = cx
    const prevY = cy
    cx += (rng() - 0.5) * 9
    cy -= stepH
    //
    // Width is interpolated continuously along the segment (w at the start,
    // w2 at the end) so the trunk outline tapers smoothly instead of stepping
    // down once per segment — no visible joints between segments.
    //
    const w = TRUNK_W_BASE + (TRUNK_W_TOP - TRUNK_W_BASE) * (i / STEPS)
    const w2 = TRUNK_W_BASE + (TRUNK_W_TOP - TRUNK_W_BASE) * ((i + 1) / STEPS)
    segs.push({ sx: prevX, sy: prevY, ex: cx, ey: cy, w, w2 })
  }
  return segs
}
//
// Clamps a segment so nothing draws below the trunk base line.
//
function clampSegmentToMaxY(seg, maxY) {
  let sx = seg.sx
  let sy = seg.sy
  let ex = seg.ex
  let ey = seg.ey
  if (Math.min(sy, ey) > maxY + 0.5) return null
  if (sy > maxY + 0.5) {
    const t = (maxY - ey) / (sy - ey)
    sx = ex + (sx - ex) * t
    sy = maxY
  }
  if (ey > maxY + 0.5) {
    const t = (maxY - sy) / (ey - sy)
    ex = sx + (ex - sx) * t
    ey = maxY
  }
  return { sx, sy, ex, ey, w: seg.w, w2: seg.w2 }
}
//
// Fills one wood segment as a capsule (tapered quad + round end caps) —
// joints between segments and branch bases read rounded, not rectangular.
//
function drawFilledWoodSegment(ctx, seg, rgb, maxY) {
  const clipped = clampSegmentToMaxY(seg, maxY)
  if (!clipped) return
  const { sx, sy, ex, ey, w } = clipped
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const hw = w * 0.5
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  ctx.moveTo(sx + nx * hw, sy + ny * hw)
  ctx.lineTo(ex + nx * hw, ey + ny * hw)
  ctx.lineTo(ex - nx * hw, ey - ny * hw)
  ctx.lineTo(sx - nx * hw, sy - ny * hw)
  ctx.closePath()
  ctx.fill()
  //
  // Round caps at both segment ends soften every junction.
  //
  ctx.beginPath()
  ctx.arc(sx, sy, hw, 0, Math.PI * 2)
  ctx.arc(ex, ey, hw, 0, Math.PI * 2)
  ctx.fill()
}
//
// Builds left/right outline points for a chain of tapered segments.
// One point pair per JOINT with the averaged normal of the adjacent segments
// and the interpolated width — the silhouette stays perfectly smooth with no
// per-segment steps or kinks. Also returns the centreline spine (for bark).
//
function buildChainOutline(segs, maxY) {
  const left = []
  const right = []
  const spine = []
  const clipped = []
  segs.forEach(seg => {
    const c = clampSegmentToMaxY(seg, maxY)
    c && clipped.push(c)
  })
  if (!clipped.length) return { left, right, spine }
  //
  // Per-segment normals, then one joint entry per chain vertex.
  //
  clipped.forEach(seg => {
    const dx = seg.ex - seg.sx
    const dy = seg.ey - seg.sy
    const len = Math.hypot(dx, dy) || 1
    seg.nx = -dy / len
    seg.ny = dx / len
  })
  const joints = [{ x: clipped[0].sx, y: clipped[0].sy, nx: clipped[0].nx, ny: clipped[0].ny, hw: clipped[0].w * 0.5 }]
  clipped.forEach((seg, i) => {
    const next = clipped[i + 1]
    //
    // Interior joints blend the normals of both adjacent segments.
    //
    let nx = seg.nx
    let ny = seg.ny
    if (next) {
      nx = (seg.nx + next.nx) * 0.5
      ny = (seg.ny + next.ny) * 0.5
      const nLen = Math.hypot(nx, ny) || 1
      nx /= nLen
      ny /= nLen
    }
    joints.push({ x: seg.ex, y: seg.ey, nx, ny, hw: (seg.w2 ?? seg.w) * 0.5 })
  })
  joints.forEach(j => {
    left.push({ x: j.x + j.nx * j.hw, y: j.y + j.ny * j.hw })
    right.push({ x: j.x - j.nx * j.hw, y: j.y - j.ny * j.hw })
    spine.push(j)
  })
  return { left, right, spine }
}
//
// Paints the shadow-side band on wood segments (trunk + branches). All capsules
// are accumulated into ONE path and filled once, so overlapping joints do not
// double the alpha. The band hugs the segment edge facing away from the sun.
//
function drawWoodShading(ctx, segs, rgb, maxY) {
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${SHADE_ALPHA})`
  ctx.beginPath()
  segs.forEach(seg => {
    if (seg.w < SHADE_MIN_SEG_W) return
    const clipped = clampSegmentToMaxY(seg, maxY)
    if (!clipped) return
    const { sx, sy, ex, ey, w } = clipped
    const dx = ex - sx
    const dy = ey - sy
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    //
    // Pick the normal that points AWAY from the light direction.
    //
    const sign = (nx * SHADE_LIGHT_DIR_X + ny * SHADE_LIGHT_DIR_Y) < 0 ? 1 : -1
    const off = w * (1 - SHADE_WIDTH_FRAC) * 0.5 * sign
    const hw = w * SHADE_WIDTH_FRAC * 0.5
    const ax = sx + nx * off
    const ay = sy + ny * off
    const bx = ex + nx * off
    const by = ey + ny * off
    ctx.moveTo(ax + nx * hw, ay + ny * hw)
    ctx.lineTo(bx + nx * hw, by + ny * hw)
    ctx.lineTo(bx - nx * hw, by - ny * hw)
    ctx.lineTo(ax - nx * hw, ay - ny * hw)
    ctx.closePath()
    ctx.moveTo(ax + hw, ay)
    ctx.arc(ax, ay, hw, 0, Math.PI * 2)
    ctx.moveTo(bx + hw, by)
    ctx.arc(bx, by, hw, 0, Math.PI * 2)
  })
  ctx.fill()
}
//
// Strokes all root segments with the ground/trunk-proximity taper applied.
//
function drawRootStrokes(ctx, treeData, rgb, h, groundY, trunkBaseX, trunkHalfW) {
  ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  treeData.rootSegs.forEach(seg => {
    const segBottomY = Math.max(seg.sy, seg.ey)
    const segTopY = Math.min(seg.sy, seg.ey)
    const bottomTaper = Math.min(1, (h - segBottomY) / ROOT_BOTTOM_TAPER_ZONE)
    //
    // Thinner the closer the segment is to the ground surface.
    //
    const groundTaper = Math.max(0, Math.min(1, (segTopY - groundY) / ROOT_GROUND_TAPER_ZONE))
    //
    // Full width under the trunk base (falls off with horizontal distance)
    // so the root mass matches the trunk width right at the junction.
    //
    const midX = (seg.sx + seg.ex) * 0.5
    const trunkProximity = Math.max(0, Math.min(1, 1 - (Math.abs(midX - trunkBaseX) - trunkHalfW) / ROOT_TRUNK_BOOST_FALLOFF))
    const surfaceTaper = Math.max(groundTaper, trunkProximity)
    ctx.lineWidth = Math.max(0.6, seg.w * Math.max(0.08, surfaceTaper) * Math.max(0.35, bottomTaper))
    ctx.beginPath()
    ctx.moveTo(seg.sx, seg.sy)
    ctx.lineTo(seg.ex, seg.ey)
    ctx.stroke()
  })
}
//
// Traces the closed trunk-base root flare path (for filling).
//
function traceRootFlarePath(ctx, trunkBaseX, trunkHalfW, groundY) {
  ctx.beginPath()
  ctx.moveTo(trunkBaseX + trunkHalfW, groundY)
  ctx.quadraticCurveTo(
    trunkBaseX + trunkHalfW, groundY + ROOT_FLARE_H * 0.6,
    trunkBaseX + trunkHalfW * ROOT_FLARE_BOTTOM_FRAC, groundY + ROOT_FLARE_H
  )
  ctx.lineTo(trunkBaseX - trunkHalfW * ROOT_FLARE_BOTTOM_FRAC, groundY + ROOT_FLARE_H)
  ctx.quadraticCurveTo(
    trunkBaseX - trunkHalfW, groundY + ROOT_FLARE_H * 0.6,
    trunkBaseX - trunkHalfW, groundY
  )
  ctx.closePath()
}
//
// Returns a copy of a segment chain with widths grown by the given amount
// (both per-side) — used for the outline underdraw of the trunk.
//
function expandChainWidths(segs, extra) {
  return segs.map(seg => ({
    ...seg,
    w: seg.w + extra,
    w2: (seg.w2 ?? seg.w) + extra
  }))
}
//
// Fills a connected wood chain (trunk or thick branch run).
//
function fillWoodChain(ctx, segs, rgb, maxY) {
  const { left, right } = buildChainOutline(segs, maxY)
  if (!left.length) return
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  left.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y)
  ctx.closePath()
  ctx.fill()
}
//
// Clips the context to a wood chain silhouette and runs a paint callback.
//
function withChainClip(ctx, segs, maxY, paint) {
  const { left, right } = buildChainOutline(segs, maxY)
  if (!left.length) return
  ctx.save()
  ctx.beginPath()
  left.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y)
  ctx.closePath()
  ctx.clip()
  paint()
  ctx.restore()
}
//
// One fractal crack — a wobbly line that recursively spawns thinner child
// cracks, each of which splits again, so cracks divide into smaller cracks.
//
function drawFractalCrack(ctx, rng, x, y, angle, length, width, tone, alpha, depth) {
  if (length < 4 || width < 0.25 || depth > 4) return
  ctx.strokeStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${alpha})`
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x, y)
  let cx = x
  let cy = y
  const steps = 3 + Math.floor(rng() * 3)
  const stepLen = length / steps
  for (let i = 0; i < steps; i++) {
    angle += (rng() - 0.5) * 0.5
    cx += Math.cos(angle) * stepLen
    cy += Math.sin(angle) * stepLen
    ctx.lineTo(cx, cy)
    //
    // Mid-crack fork — a smaller crack peels off sideways.
    //
    if (rng() < 0.4) {
      drawFractalCrack(ctx, rng, cx, cy, angle + (rng() > 0.5 ? 0.7 : -0.7) + (rng() - 0.5) * 0.4, length * 0.45, width * 0.55, tone, alpha * 0.85, depth + 1)
    }
  }
  ctx.stroke()
  //
  // Tip split — the crack ends by dividing into finer cracks.
  //
  if (rng() < 0.75) {
    drawFractalCrack(ctx, rng, cx, cy, angle + (rng() - 0.5) * 0.9, length * 0.55, width * 0.6, tone, alpha * 0.85, depth + 1)
  }
}
//
// Sparse fractal cracks over the trunk, mostly running downward.
//
function drawTrunkCracks(ctx, segs, dark, seed, maxY) {
  const rng = createRng(seed)
  withChainClip(ctx, segs, maxY, () => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const CRACK_COUNT = 9
    for (let i = 0; i < CRACK_COUNT; i++) {
      const segIdx = Math.floor(rng() * segs.length)
      const seg = segs[segIdx]
      const t = rng()
      const sx = seg.sx + (seg.ex - seg.sx) * t + (rng() - 0.5) * seg.w * 0.6
      const sy = seg.sy + (seg.ey - seg.sy) * t
      const angle = Math.PI / 2 + (rng() - 0.5) * 0.6
      drawFractalCrack(ctx, rng, sx, sy, angle, 26 + rng() * 46, 1 + rng() * 0.8, dark, 0.3 + rng() * 0.2, 0)
    }
  })
}
//
// Full trunk bark pass: sun-side shading bands (dark LEFT edge / highlight
// RIGHT edge — the sun sits top-right), wavy bark lines that follow the trunk
// centreline, short horizontal notches and a few knots. Everything is clipped
// to the trunk silhouette and follows the spine, so no straight screen-space
// seams appear on the wobbly trunk.
//
function drawTrunkBark(ctx, segs, dark, highlight, seed, maxY) {
  const { left, right, spine } = buildChainOutline(segs, maxY)
  if (!spine.length) return
  const rng = createRng(seed)
  withChainClip(ctx, segs, maxY, () => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    //
    // Shadow band along the left edge (away from the sun) and a soft
    // highlight band along the right edge (facing the sun).
    //
    fillEdgeBand(ctx, left, spine, BARK_SHADOW_BAND_FRAC, dark, BARK_SHADOW_ALPHA)
    fillEdgeBand(ctx, right, spine, BARK_HIGHLIGHT_BAND_FRAC, highlight, BARK_HIGHLIGHT_ALPHA)
    //
    // Wavy bark lines — one per half-width fraction, following the centreline
    // with per-point jitter. Lines on the sunny side use the highlight tone.
    //
    BARK_LINE_FRACS.forEach(frac => {
      const tone = frac > 0.3 ? highlight : dark
      ctx.strokeStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${BARK_LINE_ALPHA_MIN + rng() * BARK_LINE_ALPHA_RANGE})`
      ctx.lineWidth = BARK_LINE_WIDTH_MIN + rng() * BARK_LINE_WIDTH_RANGE
      ctx.beginPath()
      spine.forEach((j, i) => {
        const px = j.x + j.nx * j.hw * frac + (rng() - 0.5) * BARK_LINE_JITTER
        const py = j.y + j.ny * j.hw * frac + (rng() - 0.5) * BARK_LINE_JITTER
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      })
      ctx.stroke()
    })
    drawBarkNotches(ctx, rng, spine, dark)
    drawBarkKnots(ctx, rng, spine, dark)
  })
}
//
// Short horizontal notches — small curved ridge marks crossing the bark lines.
//
function drawBarkNotches(ctx, rng, spine, dark) {
  ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BARK_NOTCH_ALPHA})`
  for (let i = 0; i < BARK_NOTCH_COUNT; i++) {
    const j = spine[Math.floor(rng() * spine.length)]
    const frac = (rng() * 2 - 1) * 0.7
    const cx = j.x + j.nx * j.hw * frac
    const cy = j.y + j.ny * j.hw * frac
    const len = 3 + rng() * j.hw * 0.35
    ctx.lineWidth = 1 + rng() * 0.8
    ctx.beginPath()
    ctx.moveTo(cx - len * 0.5, cy + (rng() - 0.5) * 2)
    ctx.quadraticCurveTo(cx, cy + 1 + rng() * 2, cx + len * 0.5, cy + (rng() - 0.5) * 2)
    ctx.stroke()
  }
}
//
// A few dark knots — small elongated bark "eyes" on the lower trunk half.
//
function drawBarkKnots(ctx, rng, spine, dark) {
  ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BARK_KNOT_ALPHA})`
  for (let i = 0; i < BARK_KNOT_COUNT; i++) {
    const j = spine[1 + Math.floor(rng() * Math.max(1, spine.length * 0.55))]
    if (!j || j.hw < 8) continue
    const frac = (rng() * 2 - 1) * 0.45
    const cx = j.x + j.nx * j.hw * frac
    const cy = j.y + j.ny * j.hw * frac
    const rx = 2.5 + rng() * 3
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, rx * (1.5 + rng()), 0, 0, Math.PI * 2)
    ctx.stroke()
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx * 0.45, rx * 0.8, 0, 0, Math.PI * 2)
    ctx.stroke()
  }
}
//
// Fills a soft band hugging one silhouette edge: outer points are the edge
// itself, inner points sit a width-fraction toward the centreline.
//
function fillEdgeBand(ctx, edge, spine, bandFrac, tone, alpha) {
  if (edge.length < 2) return
  ctx.fillStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${alpha})`
  ctx.beginPath()
  edge.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  for (let i = edge.length - 1; i >= 0; i--) {
    const p = edge[i]
    const c = spine[i]
    ctx.lineTo(p.x + (c.x - p.x) * bandFrac, p.y + (c.y - p.y) * bandFrac)
  }
  ctx.closePath()
  ctx.fill()
}
//
// A few short fractal cracks along the thicker branch runs.
//
function drawBranchCracks(ctx, segs, dark, seed, maxY) {
  const rng = createRng(seed)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  segs.forEach(seg => {
    //
    // Only thick branch segments get cracks — twigs stay clean.
    //
    if (seg.w < 9 || rng() > 0.16) return
    const dx = seg.ex - seg.sx
    const dy = seg.ey - seg.sy
    const along = Math.atan2(dy, dx)
    const sx = seg.sx + dx * rng()
    const sy = seg.sy + dy * rng()
    drawFractalCrack(ctx, rng, sx, sy, along + (rng() - 0.5) * 0.5, 10 + rng() * 16, 0.7 + rng() * 0.5, dark, 0.25 + rng() * 0.15, 1)
  })
}
//
// Parses a hex string into RGB components for bark drawing.
//
function glowHexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  }
}
//
// Builds spreading roots from the trunk base using the shared grow-tree-root
// algorithm — the same one used by the menu background side trees.
// Each root starts nearly vertical and gradually curls outward (left or right)
// via a lateral bias, just like menu trees curl toward the canvas centre.
//
function buildRoots(rng, trunkSegs, trunkBottomY, treeH, rootMaxY) {
  const ROOT_COUNT = 5 + Math.floor(rng() * 3)
  const ROOT_W_BASE = 26
  const ROOT_SEGMENTS = 22
  //
  // Roots start slightly above the trunk base line, spread across the trunk
  // base width, so the trunk fill painted after them hides every junction.
  //
  const ROOT_START_LIFT = 6
  const baseSpread = (trunkSegs[0]?.w ?? 74) * 0.32
  //
  // Inject seeded random so the main root directions are deterministic.
  // growTreeRootSegments branching calls use Math.random for micro-details.
  //
  const rand = (min, max) => min + rng() * (max - min)
  const baseX = trunkSegs[0].sx
  const allSegs = []
  for (let r = 0; r < ROOT_COUNT; r++) {
    //
    // Alternate sides: even indices go right (+1), odd go left (-1).
    // lateralBias curves each root outward from the trunk centre.
    //
    const side = r % 2 === 0 ? 1 : -1
    const xJitter = side * rng() * baseSpread
    const startAngle = Math.PI / 2 + side * (0.08 + rng() * 0.14)
    //
    // Positive bias curves LEFT (angle → π), negative bias curves RIGHT (angle → 0).
    //
    const lateralBias = side * 0.022
    const rootSegs = growTreeRootSegments({
      x: baseX + xJitter,
      y: trunkBottomY - ROOT_START_LIFT,
      angle: startAngle,
      segments: ROOT_SEGMENTS,
      thickness: ROOT_W_BASE,
      lateralBiasPerSegment: lateralBias,
      rand
    })
    for (const seg of rootSegs) {
      //
      // Clamp roots to [start lift, rootMaxY] so they never creep above
      // the covered junction band (negative-Y drift from angle wobble).
      //
      if (seg.startY >= trunkBottomY - ROOT_START_LIFT - 2 && seg.endY >= trunkBottomY - ROOT_START_LIFT - 2 && seg.endY <= rootMaxY) {
        allSegs.push({ sx: seg.startX, sy: seg.startY, ex: seg.endX, ey: seg.endY, w: seg.width })
      }
    }
  }
  return allSegs
}
//
// Sprouts branches from the main trunk at RANDOM heights (upper part of the
// tree). Sides alternate so the canopy stays balanced, but the exact position
// of every branch on the trunk is seeded-random. Each branch then splits
// fractally into smaller leafy branches inside growBranch().
//
function buildBranchesFromTrunk(rng, trunkSegs, branchSegs, leafEndpoints, fracMin = BRANCH_FRAC_MIN, fracMax = BRANCH_FRAC_MAX, upward = false) {
  const BRANCH_COUNT = 7 + Math.floor(rng() * 3)
  for (let i = 0; i < BRANCH_COUNT; i++) {
    const frac = fracMin + rng() * (fracMax - fracMin)
    const segIdx = Math.min(Math.floor(frac * trunkSegs.length), trunkSegs.length - 1)
    const seg = trunkSegs[segIdx]
    const side = i % 2 === 0 ? -1 : 1
    //
    // Upward mode keeps every branch within a narrow fan around vertical, so
    // the foliage climbs above the sprout point instead of spreading sideways.
    //
    const angleBase = upward
      ? -Math.PI / 2 + side * (BRANCH_UP_SPREAD_MIN + rng() * BRANCH_UP_SPREAD_RANGE)
      : (side < 0 ? -Math.PI + 0.3 + rng() * 0.55 : -0.3 - rng() * 0.55)
    const len = 14 + rng() * 20 - frac * 5
    const w = 8 + (1 - frac) * 16
    growBranch(rng, seg.ex, seg.ey, angleBase, Math.max(7, Math.round(len)), w, branchSegs, leafEndpoints, 0)
  }
}
//
// Recursively grows a branch segment, spawning sub-branches and leaf endpoints.
//
function growBranch(rng, x, y, angle, length, thickness, branchSegs, leafEndpoints, depth) {
  if (length <= 2 || thickness < 0.45 || depth > 7) {
    leafEndpoints.push({ x, y, r: 32 + depth * 6 })
    return
  }
  const STEP = 5 + rng() * 4
  const TIP_TAPER = 0.88
  let cx = x
  let cy = y
  for (let i = 0; i < length; i++) {
    const px = cx
    const py = cy
    const t = length <= 1 ? 0 : i / (length - 1)
    const segW = thickness * (1 - t * TIP_TAPER)
    angle += (rng() - 0.5) * 0.28
    cx += Math.cos(angle) * STEP
    cy += Math.sin(angle) * STEP
    branchSegs.push({ sx: px, sy: py, ex: cx, ey: cy, w: Math.max(1.2, segW) })
    if (depth >= 1 && i > 0 && i % 2 === 0 && rng() < 0.5) {
      leafEndpoints.push({ x: cx, y: cy, r: 20 + depth * 5 + rng() * 14 })
    }
  }
  if (rng() < 0.82) {
    growBranch(rng, cx, cy, angle - 0.35 - rng() * 0.2, Math.round(length * 0.65), thickness * 0.72, branchSegs, leafEndpoints, depth + 1)
  }
  if (rng() < 0.65) {
    growBranch(rng, cx, cy, angle + 0.35 + rng() * 0.2, Math.round(length * 0.55), thickness * 0.66, branchSegs, leafEndpoints, depth + 1)
  }
}
//
// Builds the special lower-left horizontal branch.
// The horizontal portion has a physics collision box (returned in horizBranch).
// After the horizontal extent the branch turns organic, starting at full HORIZ_W.
//
function buildHorizBranch(rng, trunkSegs, branchSegs, leafEndpoints) {
  //
  // Position: fraction 0.32 from bottom, well below the seeded branches.
  //
  const HORIZ_FRAC = 0.32
  const segIdx = Math.min(Math.floor(HORIZ_FRAC * trunkSegs.length), trunkSegs.length - 1)
  const seg = trunkSegs[segIdx]
  const startX = seg.ex
  const startY = seg.ey
  const endX = startX - HORIZ_BRANCH_LENGTH
  const HORIZ_W = 22
  const N_SEGS = 7
  const xStep = (endX - startX) / N_SEGS
  let hcx = startX
  let hcy = startY
  //
  // Break horizontal portion into N_SEGS mini-segments with slight y-drift for
  // organic unevenness. First and last segments stay at startY to keep the
  // junction with the trunk and the organic ending clean.
  //
  for (let i = 0; i < N_SEGS; i++) {
    const hpx = hcx
    const hpy = hcy
    hcx = startX + (i + 1) * xStep
    if (i > 0 && i < N_SEGS - 1) {
      hcy = startY + (rng() - 0.5) * 8
    } else {
      hcy = startY
    }
    branchSegs.push({ sx: hpx, sy: hpy, ex: hcx, ey: hcy, w: HORIZ_W })
  }
  //
  // Smaller leafy branches sprouting from the hero branch — a couple of
  // upward shoots along its length plus a leafy fan at the tip.
  //
  const SHOOT_FRACS = [0.35, 0.65]
  SHOOT_FRACS.forEach(frac => {
    const sx = startX + (endX - startX) * frac
    growBranch(rng, sx, startY - HORIZ_W * 0.3, -Math.PI / 2 + (rng() - 0.5) * 0.5, 5 + Math.round(rng() * 4), HORIZ_W * 0.32, branchSegs, leafEndpoints, 1)
  })
  //
  // Leafy continuation off the left tip: starts at the FULL platform width at
  // the junction (seamless joint) and tapers away from the platform branch.
  //
  growBranch(rng, endX, startY, Math.PI + 0.18 + rng() * 0.2, 9 + Math.round(rng() * 3), HORIZ_W, branchSegs, leafEndpoints, 1)
  //
  // physY is the top of the branch visual (center line - half width),
  // so the hero stands on the visible surface rather than floating above it.
  //
  const physY = startY - Math.floor(HORIZ_W / 2)
  return {
    x1: endX,
    x2: startX,
    y: startY,
    physY,
    w: HORIZ_W
  }
}
//
// Converts leaf endpoint data into note-tree style clusters:
// 18–30 leaves scattered up to 70 px around the endpoint (flattened vertically).
//
function buildLeaves(rng, endpoints, shadeCount = 3) {
  const out = []
  endpoints.forEach(ep => {
    const count = 18 + Math.floor(rng() * 12)
    const spread = Math.min(70, ep.r * 1.05)
    for (let i = 0; i < count; i++) {
      const a = rng() * Math.PI * 2 - Math.PI
      const dist = rng() * spread
      const shadeIdx = Math.min(shadeCount - 1, Math.floor(rng() * shadeCount + rng() * 0.4))
      out.push({
        x: ep.x + Math.cos(a) * dist,
        y: ep.y + Math.sin(a) * dist * 0.6,
        size: 12 + rng() * 10,
        angle: (rng() - 0.5) * 2,
        opacity: 0.85 + rng() * 0.15,
        shadeIdx
      })
    }
  })
  return out
}
//
// Draws a single leaf to a canvas2D context — same shape as the touch L1
// note trees: quadratic-curve teardrop with a centre vein line.
//
function drawLeafToCanvas(ctx, x, y, size, angle, r, g, b, opacity, vein) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-size * 0.6, -size * 0.3, 0, -size)
  ctx.quadraticCurveTo(size * 0.6, -size * 0.3, 0, 0)
  ctx.closePath()
  ctx.fill()
  //
  // Centre vein — skipped entirely when the palette disables leaf details.
  //
  if (vein) {
    ctx.strokeStyle = `rgba(${vein.r}, ${vein.g}, ${vein.b}, ${0.35 * opacity})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -size)
    ctx.stroke()
  }
  ctx.restore()
}
