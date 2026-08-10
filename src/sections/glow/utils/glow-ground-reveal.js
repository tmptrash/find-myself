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
