//
// Procedural tree-root segment grower — extracted from the touch L1
// tree-roots component so the same organic root algorithm can produce
// roots both for the in-game L1 musical-roots tree AND for the
// ready/menu background composite.
//
// The growth is recursive: every "root" is a chain of step-sized
// segments that randomly wobble; with small probabilities it also
// spawns micro side-roots and a main branch that thins out. Each
// recursive call gets shorter and thinner, so the network naturally
// tapers to nothing.
//
// Two purely additive options on top of the L1 behaviour:
//   - `lateralBiasPerSegment`: a constant angular delta added to every
//     segment's angle so the root gradually curls toward one side.
//     Used by the menu-bg generator to bend underground roots toward
//     the centre of the canvas (they start as a straight continuation
//     of the trunk and curl inward as they descend).
//   - `rand`: optional injectable RNG so callers can run the exact
//     same growth twice with a seeded RNG if needed.
//
const ROOT_MIN_THICKNESS = 0.4
const ROOT_MAX_DEPTH = 6
const ROOT_STEP_MIN = 4
const ROOT_STEP_MAX = 7
const ROOT_SEGMENT_WOBBLE = 0.18
const MICRO_BRANCH_CHANCE = 0.08
const MICRO_BRANCH_DEPTH_LIMIT = 5
const MICRO_BRANCH_ANGLE_SPREAD = 1.5
const MICRO_BRANCH_SEG_MIN = 2
const MICRO_BRANCH_SEG_MAX = 4
const MICRO_BRANCH_THICKNESS_RATIO = 0.35
const MICRO_BRANCH_DEPTH_BUMP = 2
const MAIN_BRANCH_CHANCE = 0.4
const MAIN_BRANCH_ANGLE_SPREAD = 1
const MAIN_BRANCH_SEGMENTS_RATIO = 0.6
const MAIN_BRANCH_THICKNESS_RATIO = 0.6
const CONTINUE_ANGLE_SPREAD = 0.3
const CONTINUE_SEGMENTS_RATIO = 0.8
const CONTINUE_THICKNESS_RATIO = 0.8
//
// Root hair detail (paintRootHairs): thin slanted rootlets along the roots
// (some with one small fork) and a small fan of hairs at every root tip, so
// the network ends in fine fibres instead of blunt strokes.
//
const ROOTLET_MIN_ROOT_W = 2
const ROOTLET_CHANCE = 0.45
const ROOTLET_LEN_MIN = 6
const ROOTLET_LEN_RANGE = 14
const ROOTLET_ANGLE_MIN = 0.55
const ROOTLET_ANGLE_RANGE = 0.6
const ROOTLET_W = 1
const ROOTLET_FORK_CHANCE = 0.4
const ROOTLET_FORK_LEN = 0.55
const ROOTLET_FORK_ANGLE = 0.5
const ROOT_TIP_HAIR_MIN = 2
const ROOT_TIP_HAIR_RANGE = 2
const ROOT_TIP_HAIR_SPREAD = 0.9
const ROOT_TIP_HAIR_LEN_MIN = 4
const ROOT_TIP_HAIR_LEN_RANGE = 8
const ROOT_TIP_HAIR_BEND = 0.35
const ROOT_TIP_KEY_PRECISION = 10
//
// Root relief (paintRootRelief), shared by every tree with roots: a thin rim
// in the contour tone, the fill strokes, a light streak along the upper-left
// (lit) side, a dark groove along thick roots, and sparse faint hairs in the
// fill's groove tone — so the roots read as round wood that still belongs to
// the soil rather than black-scratched lines.
//
const ROOT_RELIEF_CONTOUR_EXTRA_W = 1.4
const ROOT_RELIEF_HIGHLIGHT_ALPHA = 0.58
const ROOT_RELIEF_HIGHLIGHT_OFFSET = -1.6
const ROOT_RELIEF_HIGHLIGHT_MIN_W = 3
const ROOT_RELIEF_HIGHLIGHT_W_FRAC = 0.28
const ROOT_RELIEF_GROOVE_MIN_W = 6
const ROOT_RELIEF_GROOVE_OFFSET = 0.18
const ROOT_RELIEF_GROOVE_DARKEN = 0.72
const ROOT_RELIEF_GROOVE_ALPHA = 0.55
const ROOT_RELIEF_HAIR_DENSITY = 0.3
const ROOT_RELIEF_HAIR_ALPHA = 0.45

/**
 * Recursively grows a tree-root network and returns the flat list of
 * line segments that make up every branch.
 *
 * @param {Object} opts
 * @param {number} opts.x - Root anchor X
 * @param {number} opts.y - Root anchor Y
 * @param {number} opts.angle - Initial growth angle in radians (Math.PI/2 = down)
 * @param {number} opts.segments - Number of primary segments along the main root
 * @param {number} opts.thickness - Starting line width
 * @param {number} [opts.depth=0] - Recursion depth (callers usually pass 0)
 * @param {number} [opts.lateralBiasPerSegment=0] - Constant angular delta added to every segment angle. Negative steers toward angle 0 (right); positive steers toward angle PI (left).
 * @param {(min: number, max: number) => number} [opts.rand] - Optional injectable uniform random
 * @returns {Array<{ startX: number, startY: number, endX: number, endY: number, width: number, depth: number }>}
 */
export function growTreeRootSegments(opts) {
  const {
    x,
    y,
    angle,
    segments,
    thickness,
    depth = 0,
    lateralBiasPerSegment = 0,
    rand = defaultRand
  } = opts
  const out = []
  if (segments <= 0 || thickness <= ROOT_MIN_THICKNESS || depth > ROOT_MAX_DEPTH) return out
  const step = rand(ROOT_STEP_MIN, ROOT_STEP_MAX)
  let cx = x
  let cy = y
  let curAngle = angle
  for (let i = 0; i < segments; i++) {
    const prevX = cx
    const prevY = cy
    //
    // Organic per-segment wobble + optional lateral bias accumulating
    // a gentle curl over many segments.
    //
    curAngle += rand(-ROOT_SEGMENT_WOBBLE, ROOT_SEGMENT_WOBBLE) + lateralBiasPerSegment
    cx += Math.cos(curAngle) * step
    cy += Math.sin(curAngle) * step
    out.push({ startX: prevX, startY: prevY, endX: cx, endY: cy, width: thickness, depth })
    //
    // Rare micro side-roots — thin short offshoots for visual detail
    //
    if (rand(0, 1) < MICRO_BRANCH_CHANCE && depth < MICRO_BRANCH_DEPTH_LIMIT) {
      out.push(...growTreeRootSegments({
        x: cx,
        y: cy,
        angle: curAngle + rand(-MICRO_BRANCH_ANGLE_SPREAD, MICRO_BRANCH_ANGLE_SPREAD),
        segments: rand(MICRO_BRANCH_SEG_MIN, MICRO_BRANCH_SEG_MAX),
        thickness: thickness * MICRO_BRANCH_THICKNESS_RATIO,
        depth: depth + MICRO_BRANCH_DEPTH_BUMP,
        lateralBiasPerSegment,
        rand
      }))
    }
  }
  //
  // 40% chance of a secondary main branch splitting off the tip
  //
  if (rand(0, 1) < MAIN_BRANCH_CHANCE) {
    out.push(...growTreeRootSegments({
      x: cx,
      y: cy,
      angle: curAngle + rand(-MAIN_BRANCH_ANGLE_SPREAD, MAIN_BRANCH_ANGLE_SPREAD),
      segments: segments * MAIN_BRANCH_SEGMENTS_RATIO,
      thickness: thickness * MAIN_BRANCH_THICKNESS_RATIO,
      depth: depth + 1,
      lateralBiasPerSegment,
      rand
    }))
  }
  //
  // The primary root always tries to continue — slightly thinner +
  // shorter each recursion — until it falls below the thickness /
  // segment-count cutoffs that terminate the recursion.
  //
  out.push(...growTreeRootSegments({
    x: cx,
    y: cy,
    angle: curAngle + rand(-CONTINUE_ANGLE_SPREAD, CONTINUE_ANGLE_SPREAD),
    segments: segments * CONTINUE_SEGMENTS_RATIO,
    thickness: thickness * CONTINUE_THICKNESS_RATIO,
    depth: depth + 1,
    lateralBiasPerSegment,
    rand
  }))
  return out
}

/**
 * Paints an array of root segments onto a 2D canvas context.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array} segments - Output of `growTreeRootSegments`
 * @param {string} strokeStyle - CSS colour string (e.g. 'rgba(140, 78, 40, 0.92)')
 */
/**
 * Drops/clips root segments so nothing extends above the ground line (smaller Y).
 * @param {Array} segments - Output of growTreeRootSegments
 * @param {number} groundY - Walkable ground Y; roots may not go above this
 * @returns {Array}
 */
export function clampRootSegmentsBelowGroundLine(segments, groundY) {
  const out = []
  for (const seg of segments) {
    const clipped = clipRootSegmentMinY(seg, groundY)
    clipped && out.push(clipped)
  }
  return out
}
/**
 * Paints a root network as round wood: contour rim, fill, lit upper-left
 * streak, a groove along thick roots and sparse faint hair rootlets.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {Array<{sx: number, sy: number, ex: number, ey: number, w: number}>} segs - Root segments with their drawn width
 * @param {() => number} rng - Seeded uniform random in [0, 1)
 * @param {Object} shades - Palette tones as {r, g, b}
 * @param {Object} shades.fill - Root body
 * @param {Object} shades.lit - Lit upper edge
 * @param {Object} shades.contour - Thin rim around the body
 */
export function paintRootRelief(ctx, segs, rng, shades) {
  const { fill, lit, contour } = shades
  const groove = scaleRgb(fill, ROOT_RELIEF_GROOVE_DARKEN)
  ctx.save()
  ctx.lineCap = 'round'
  strokeRootSegs(ctx, segs, rgbCss(contour, 1), ROOT_RELIEF_CONTOUR_EXTRA_W)
  strokeRootSegs(ctx, segs, rgbCss(fill, 1), 0)
  strokeRootHighlights(ctx, segs, rgbCss(lit, ROOT_RELIEF_HIGHLIGHT_ALPHA))
  strokeRootGrooves(ctx, segs, rgbCss(groove, ROOT_RELIEF_GROOVE_ALPHA))
  ctx.restore()
  paintRootHairs(ctx, segs, rng, rgbCss(groove, ROOT_RELIEF_HAIR_ALPHA), ROOT_RELIEF_HAIR_DENSITY)
}
/**
 * Paints root hair detail over an already stroked root network: slanted
 * rootlets along thick-enough roots and a fan of hairs at every root tip
 * (a segment end no other segment continues from).
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {Array<{sx: number, sy: number, ex: number, ey: number, w: number}>} segs - Root segments with their drawn width
 * @param {() => number} rng - Seeded uniform random in [0, 1)
 * @param {string} color - CSS stroke colour
 * @param {number} [density=1] - Scales the rootlet and tip-fan chances
 */
export function paintRootHairs(ctx, segs, rng, color, density = 1) {
  const startKeys = new Set(segs.map(seg => rootPointKey(seg.sx, seg.sy)))
  ctx.save()
  ctx.lineCap = 'round'
  ctx.strokeStyle = color
  ctx.lineWidth = ROOTLET_W
  segs.forEach(seg => {
    const angle = Math.atan2(seg.ey - seg.sy, seg.ex - seg.sx)
    seg.w >= ROOTLET_MIN_ROOT_W && rng() < ROOTLET_CHANCE * density && strokeRootlet(ctx, rng, seg, angle)
    const isTip = !startKeys.has(rootPointKey(seg.ex, seg.ey))
    isTip && rng() < density && strokeRootTipHairs(ctx, rng, seg, angle)
  })
  ctx.restore()
}
function clipRootSegmentMinY(seg, minY) {
  let { startX, startY, endX, endY, width, depth } = seg
  if (startY < minY && endY < minY) return null
  if (startY < minY) {
    const dy = endY - startY
    if (Math.abs(dy) < 1e-6) return null
    const t = (minY - startY) / dy
    if (t <= 0 || t >= 1) return null
    startX = startX + (endX - startX) * t
    startY = minY
  }
  if (endY < minY) {
    const dy = endY - startY
    if (Math.abs(dy) < 1e-6) return null
    const t = (minY - startY) / dy
    if (t <= 0 || t >= 1) return null
    endX = startX + (endX - startX) * t
    endY = minY
  }
  if (Math.hypot(endX - startX, endY - startY) < 0.4) return null
  return { startX, startY, endX, endY, width, depth }
}
export function drawTreeRootSegmentsToCanvas(ctx, segments, strokeStyle) {
  ctx.lineCap = 'round'
  ctx.strokeStyle = strokeStyle
  for (const seg of segments) {
    ctx.lineWidth = seg.width
    ctx.beginPath()
    ctx.moveTo(seg.startX, seg.startY)
    ctx.lineTo(seg.endX, seg.endY)
    ctx.stroke()
  }
}

function defaultRand(min, max) {
  return min + Math.random() * (max - min)
}
//
// One stroke per segment at its drawn width plus an optional extra (rim).
//
function strokeRootSegs(ctx, segs, css, extraW) {
  ctx.strokeStyle = css
  segs.forEach(seg => {
    ctx.lineWidth = seg.w + extraW
    ctx.beginPath()
    ctx.moveTo(seg.sx, seg.sy)
    ctx.lineTo(seg.ex, seg.ey)
    ctx.stroke()
  })
}
//
// Thin light streak along the upper-left of every thick-enough segment.
//
function strokeRootHighlights(ctx, segs, css) {
  ctx.strokeStyle = css
  segs.forEach(seg => {
    if (seg.w < ROOT_RELIEF_HIGHLIGHT_MIN_W) return
    ctx.lineWidth = Math.max(1, seg.w * ROOT_RELIEF_HIGHLIGHT_W_FRAC)
    ctx.beginPath()
    ctx.moveTo(seg.sx + ROOT_RELIEF_HIGHLIGHT_OFFSET, seg.sy + ROOT_RELIEF_HIGHLIGHT_OFFSET)
    ctx.lineTo(seg.ex + ROOT_RELIEF_HIGHLIGHT_OFFSET, seg.ey + ROOT_RELIEF_HIGHLIGHT_OFFSET)
    ctx.stroke()
  })
}
//
// Dark groove along thick roots, a little toward their shaded lower side.
//
function strokeRootGrooves(ctx, segs, css) {
  ctx.strokeStyle = css
  ctx.lineWidth = 1
  segs.forEach(seg => {
    if (seg.w < ROOT_RELIEF_GROOVE_MIN_W) return
    const angle = Math.atan2(seg.ey - seg.sy, seg.ex - seg.sx)
    const ox = -Math.sin(angle) * seg.w * ROOT_RELIEF_GROOVE_OFFSET
    const oy = Math.cos(angle) * seg.w * ROOT_RELIEF_GROOVE_OFFSET
    ctx.beginPath()
    ctx.moveTo(seg.sx + ox, seg.sy + oy)
    ctx.lineTo(seg.ex + ox, seg.ey + oy)
    ctx.stroke()
  })
}
//
// Brightness-only step of a palette colour (no new hue appears).
//
function scaleRgb(c, f) {
  return { r: Math.round(c.r * f), g: Math.round(c.g * f), b: Math.round(c.b * f) }
}
function rgbCss(c, alpha) {
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`
}
//
// Rounded point key — continuation segments start exactly where the previous
// one ended, but clipping may shift a coordinate by a float hair.
//
function rootPointKey(x, y) {
  return `${Math.round(x * ROOT_TIP_KEY_PRECISION)},${Math.round(y * ROOT_TIP_KEY_PRECISION)}`
}
//
// Thin rootlet from a random point of the segment, slanting off one side.
//
function strokeRootlet(ctx, rng, seg, angle) {
  const t = rng()
  const x = seg.sx + (seg.ex - seg.sx) * t
  const y = seg.sy + (seg.ey - seg.sy) * t
  const side = rng() < 0.5 ? -1 : 1
  const a = angle + side * (ROOTLET_ANGLE_MIN + rng() * ROOTLET_ANGLE_RANGE)
  const len = ROOTLET_LEN_MIN + rng() * ROOTLET_LEN_RANGE
  const ex = x + Math.cos(a) * (len + seg.w * 0.5)
  const ey = y + Math.sin(a) * (len + seg.w * 0.5)
  ctx.beginPath()
  ctx.moveTo(x, y)
  ctx.lineTo(ex, ey)
  if (rng() < ROOTLET_FORK_CHANCE) {
    const fa = a + (rng() < 0.5 ? -1 : 1) * ROOTLET_FORK_ANGLE
    const mx = x + (ex - x) * 0.5
    const my = y + (ey - y) * 0.5
    ctx.moveTo(mx, my)
    ctx.lineTo(mx + Math.cos(fa) * len * ROOTLET_FORK_LEN, my + Math.sin(fa) * len * ROOTLET_FORK_LEN)
  }
  ctx.stroke()
}
//
// Fan of slightly bent hairs continuing a root past its tip.
//
function strokeRootTipHairs(ctx, rng, seg, angle) {
  const count = ROOT_TIP_HAIR_MIN + Math.floor(rng() * (ROOT_TIP_HAIR_RANGE + 1))
  ctx.beginPath()
  for (let i = 0; i < count; i++) {
    const a = angle + (rng() - 0.5) * ROOT_TIP_HAIR_SPREAD * 2
    const len = ROOT_TIP_HAIR_LEN_MIN + rng() * ROOT_TIP_HAIR_LEN_RANGE
    const bend = a + (rng() - 0.5) * ROOT_TIP_HAIR_BEND * 2
    const mx = seg.ex + Math.cos(a) * len * 0.5
    const my = seg.ey + Math.sin(a) * len * 0.5
    ctx.moveTo(seg.ex, seg.ey)
    ctx.quadraticCurveTo(mx, my, mx + Math.cos(bend) * len * 0.5, my + Math.sin(bend) * len * 0.5)
  }
  ctx.stroke()
}
