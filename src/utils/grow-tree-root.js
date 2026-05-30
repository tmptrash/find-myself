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
    if (Math.random() < MICRO_BRANCH_CHANCE && depth < MICRO_BRANCH_DEPTH_LIMIT) {
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
  if (Math.random() < MAIN_BRANCH_CHANCE) {
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
