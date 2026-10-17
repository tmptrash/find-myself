//
// FABRIK inverse kinematics for a planar chain of equal-length segments.
// The root stays pinned, the tip chases a target, and an optional rest pose
// softly pulls the inner joints so a bent chain keeps its curve instead of
// collapsing into a straight line between solves.
//
const DEFAULT_ITERATIONS = 4
const MIN_DIST = 1e-6

/**
 * Creates a straight chain hanging from a root along a direction.
 * @param {Object} cfg
 * @param {number} cfg.segments - Segment count (joints = segments + 1)
 * @param {number} cfg.segLen - Length of one segment in px
 * @param {number} cfg.x - Root X
 * @param {number} cfg.y - Root Y
 * @param {number} [cfg.angle=-Math.PI/2] - Initial direction (radians, default up)
 * @returns {Object} Chain inst with joints `pts` (root first) and `segLen`
 */
export function create(cfg) {
  const { segments, segLen, x, y } = cfg
  const angle = cfg.angle ?? -Math.PI / 2
  const pts = Array.from({ length: segments + 1 }, (_, i) => ({
    x: x + Math.cos(angle) * segLen * i,
    y: y + Math.sin(angle) * segLen * i
  }))
  return { pts, segLen }
}

/**
 * Changes the segment length (chains that grow or shrink keep their joint count).
 * @param {Object} inst - Chain inst
 * @param {number} segLen - New segment length in px
 */
export function setSegLen(inst, segLen) {
  inst.segLen = segLen
}

/**
 * Solves the chain so its root sits at (rootX, rootY) and its tip reaches
 * toward (targetX, targetY). Out-of-reach targets straighten the chain.
 * @param {Object} inst - Chain inst
 * @param {number} rootX - Pinned root X
 * @param {number} rootY - Pinned root Y
 * @param {number} targetX - Tip target X
 * @param {number} targetY - Tip target Y
 * @param {Object} [opts]
 * @param {Array<{x: number, y: number}>} [opts.rest] - Rest pose (same joint count)
 * @param {number} [opts.stiffness=0] - 0..1 pull of inner joints toward the rest pose
 * @param {number} [opts.iterations=4] - FABRIK passes
 */
export function solve(inst, rootX, rootY, targetX, targetY, opts = {}) {
  const { pts, segLen } = inst
  const last = pts.length - 1
  const reach = segLen * last
  const dx = targetX - rootX
  const dy = targetY - rootY
  const dist = Math.hypot(dx, dy)
  if (dist >= reach) {
    straighten(pts, rootX, rootY, dx / Math.max(dist, MIN_DIST), dy / Math.max(dist, MIN_DIST), segLen)
    return
  }
  const iterations = opts.iterations ?? DEFAULT_ITERATIONS
  const stiffness = opts.stiffness ?? 0
  for (let it = 0; it < iterations; it++) {
    opts.rest && stiffness > 0 && pullTowardRest(pts, opts.rest, stiffness)
    pts[last].x = targetX
    pts[last].y = targetY
    for (let i = last - 1; i >= 0; i--) placeAt(pts[i], pts[i + 1], segLen)
    pts[0].x = rootX
    pts[0].y = rootY
    for (let i = 1; i <= last; i++) placeAt(pts[i], pts[i - 1], segLen)
  }
}

//
// Moves `p` onto the circle of radius `len` around `anchor`, keeping its direction.
//
function placeAt(p, anchor, len) {
  const dx = p.x - anchor.x
  const dy = p.y - anchor.y
  const d = Math.max(Math.hypot(dx, dy), MIN_DIST)
  p.x = anchor.x + (dx / d) * len
  p.y = anchor.y + (dy / d) * len
}

function straighten(pts, rootX, rootY, ux, uy, segLen) {
  pts.forEach((p, i) => {
    p.x = rootX + ux * segLen * i
    p.y = rootY + uy * segLen * i
  })
}

function pullTowardRest(pts, rest, stiffness) {
  for (let i = 1; i < pts.length - 1; i++) {
    pts[i].x += (rest[i].x - pts[i].x) * stiffness
    pts[i].y += (rest[i].y - pts[i].y) * stiffness
  }
}
