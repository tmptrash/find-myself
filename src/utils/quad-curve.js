//
// Quadratic Bezier helpers shared by the procedural plant painters
// (fern fronds, feather plume stalks, leaf blades).
//

/**
 * Strokes one quadratic Bezier segment with the current context style.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{x: number, y: number}} p0 - Start point
 * @param {{x: number, y: number}} p1 - Control point
 * @param {{x: number, y: number}} p2 - End point
 */
export function strokeQuad(ctx, p0, p1, p2) {
  ctx.beginPath()
  ctx.moveTo(p0.x, p0.y)
  ctx.quadraticCurveTo(p1.x, p1.y, p2.x, p2.y)
  ctx.stroke()
}

/**
 * Point on a quadratic Bezier at parameter t.
 * @param {{x: number, y: number}} p0 - Start point
 * @param {{x: number, y: number}} p1 - Control point
 * @param {{x: number, y: number}} p2 - End point
 * @param {number} t - Curve parameter 0..1
 * @returns {{x: number, y: number}}
 */
export function quadPoint(p0, p1, p2, t) {
  const u = 1 - t
  return {
    x: u * u * p0.x + 2 * u * t * p1.x + t * t * p2.x,
    y: u * u * p0.y + 2 * u * t * p1.y + t * t * p2.y
  }
}

/**
 * Unit tangent of a quadratic Bezier at parameter t.
 * @param {{x: number, y: number}} p0 - Start point
 * @param {{x: number, y: number}} p1 - Control point
 * @param {{x: number, y: number}} p2 - End point
 * @param {number} t - Curve parameter 0..1
 * @returns {{x: number, y: number}}
 */
export function quadTangent(p0, p1, p2, t) {
  const x = 2 * (1 - t) * (p1.x - p0.x) + 2 * t * (p2.x - p1.x)
  const y = 2 * (1 - t) * (p1.y - p0.y) + 2 * t * (p2.y - p1.y)
  const len = Math.hypot(x, y) || 1
  return { x: x / len, y: y / len }
}
