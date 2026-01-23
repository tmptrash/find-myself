/**
 * This function returns the Y coordinate of a point on an arc.
 * @param {*} x - The X coordinate of the point
 * @param {*} a - The left edge of the arc
 * @param {*} b - The right edge of the arc
 * @param {*} minY - The minimum Y coordinate
 * @param {*} maxY - The maximum Y coordinate
 * @returns The Y coordinate of the point on the arc
 */
export function arcY(x, a, b, minY, maxY) {
  const t = (x - a) / (b - a) 
  const k = 2 * t - 1

  return minY + (k * k) * (maxY - minY)
}