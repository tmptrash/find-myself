//
// Thin rings and small discs drawn cheaply: Kaplay's own drawEllipse /
// drawCircle build a new polygon every call, and an outline goes through
// its round-joined polyline — about a thousand indices for one small ring
// on the water. Here a ring is a ready strip of SEGMENTS quads and a disc
// a fan of SEGMENTS triangles; their vertices are kept per live k and
// only moved, and they go to drawPolygon's quick path (vertices with
// their colours and indices): nothing is built per call.
//
const SEGMENTS = 24
const FULL_TURN = Math.PI * 2
const HALF = 0.5
const COS = Float64Array.from({ length: SEGMENTS + 1 }, (_, i) => Math.cos(i / SEGMENTS * FULL_TURN))
const SIN = Float64Array.from({ length: SEGMENTS + 1 }, (_, i) => Math.sin(i / SEGMENTS * FULL_TURN))
const RING_INDICES = Array.from({ length: SEGMENTS }, (_, i) => [i * 2, i * 2 + 1, i * 2 + 2, i * 2 + 1, i * 2 + 3, i * 2 + 2]).flat()
const DISC_INDICES = Array.from({ length: SEGMENTS }, (_, i) => [0, i + 1, i + 2]).flat()
const toolsFor = new WeakMap()

/**
 * Draws an ellipse's outline as a ring `width` px wide.
 * @param {Object} k - Kaplay instance
 * @param {number} x - Middle X
 * @param {number} y - Middle Y
 * @param {number} rx - Radius across
 * @param {number} ry - Radius up and down
 * @param {number} width - The line's width (px)
 * @param {Object} color - Kaplay colour
 * @param {number} opacity - Opacity 0 … 1
 */
export function ring(k, x, y, rx, ry, width, color, opacity) {
  const tool = toolOf(k).ring
  const pts = tool.opt.pts
  const half = width * HALF
  for (let i = 0; i <= SEGMENTS; i++) {
    pts[i * 2].x = x + COS[i] * (rx + half)
    pts[i * 2].y = y + SIN[i] * (ry + half)
    pts[i * 2 + 1].x = x + COS[i] * Math.max(0, rx - half)
    pts[i * 2 + 1].y = y + SIN[i] * Math.max(0, ry - half)
  }
  paint(k, tool, color, opacity)
}

/**
 * Draws a filled ellipse (a circle with rx = ry).
 * @param {Object} k - Kaplay instance
 * @param {number} x - Middle X
 * @param {number} y - Middle Y
 * @param {number} rx - Radius across
 * @param {number} ry - Radius up and down
 * @param {Object} color - Kaplay colour
 * @param {number} opacity - Opacity 0 … 1
 */
export function disc(k, x, y, rx, ry, color, opacity) {
  const tool = toolOf(k).disc
  const pts = tool.opt.pts
  pts[0].x = x
  pts[0].y = y
  for (let i = 0; i <= SEGMENTS; i++) {
    pts[i + 1].x = x + COS[i] * rx
    pts[i + 1].y = y + SIN[i] * ry
  }
  paint(k, tool, color, opacity)
}
//
// This k's ring and disc: their vertices, colours and draw options, made
// once.
//
function toolOf(k) {
  toolsFor.has(k) || toolsFor.set(k, { ring: newTool(k, (SEGMENTS + 1) * 2, RING_INDICES), disc: newTool(k, SEGMENTS + 2, DISC_INDICES) })
  return toolsFor.get(k)
}
function newTool(k, count, indices) {
  return { color: null, opt: { pts: Array.from({ length: count }, () => k.vec2(0, 0)), colors: new Array(count).fill(null), indices, opacity: 1 } }
}
function paint(k, tool, color, opacity) {
  tool.color === color || tool.opt.colors.fill(color)
  tool.color = color
  tool.opt.opacity = opacity
  k.drawPolygon(tool.opt)
}
