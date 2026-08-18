//
// Right-side ground opens in horizontal strips as the hero runs past the tree.
//
export const GROUND_RIGHT_STRIP_COUNT = 10
//
// Returns which strip index (0 … count-1) contains world X on the right ground.
//
export function groundRightStripIndexForX(x, stripStartX, stripEndX) {
  if (x < stripStartX) return -1
  const span = stripEndX - stripStartX
  if (span <= 0) return -1
  const t = (x - stripStartX) / span
  const idx = Math.floor(t * GROUND_RIGHT_STRIP_COUNT)
  return Math.min(GROUND_RIGHT_STRIP_COUNT - 1, Math.max(0, idx))
}
//
// World X range covered by one strip (for tagging decor at placement time).
//
export function groundRightStripXBounds(stripIndex, stripStartX, stripEndX) {
  const span = stripEndX - stripStartX
  const w = span / GROUND_RIGHT_STRIP_COUNT
  const x1 = stripStartX + stripIndex * w
  return { x1, x2: x1 + w }
}
//
// True once the hero has opened at least one right-side ground strip.
//
export function isRightGroundStripExplored(zones) {
  return zones.groundRightStripMax >= 0 || Boolean(zones.groundDecorRight)
}
//
// World X of the rightmost fully opened strip edge (start of the unknown).
//
export function groundRightExploredEdgeX(stripMax, stripStartX, stripEndX) {
  if (stripMax < 0) return stripStartX
  const span = stripEndX - stripStartX
  if (span <= 0) return stripStartX
  const w = span / GROUND_RIGHT_STRIP_COUNT
  return stripStartX + Math.min(GROUND_RIGHT_STRIP_COUNT, stripMax + 1) * w
}
/**
 * Soft opacity for a world X on the right ground: fully visible inside the
 * opened edge, then a fade into the unknown instead of a hard strip cut.
 * @param {number} x - World X
 * @param {Object} opts
 * @param {number} opts.stripStartX
 * @param {number} opts.stripEndX
 * @param {number} opts.stripMax
 * @param {number} opts.heroX
 * @param {number} opts.fadeWidth
 * @param {number} opts.lookahead
 * @returns {number} 0..1
 */
export function groundRightAppearOpacity(x, opts) {
  const { stripStartX, stripEndX, stripMax, heroX, fadeWidth, lookahead } = opts
  if (stripMax >= GROUND_RIGHT_STRIP_COUNT - 1) return 1
  const savedEdge = groundRightExploredEdgeX(stripMax, stripStartX, stripEndX)
  const liveEdge = Math.max(savedEdge, heroX + lookahead)
  if (x <= liveEdge) return 1
  if (fadeWidth <= 0) return 0
  return Math.max(0, Math.min(1, 1 - (x - liveEdge) / fadeWidth))
}
