import { vecLen } from './helper.js'
//
// Analytic two-bone inverse kinematics in the plane: a root (hip,
// shoulder), a middle joint (knee, elbow) and a tip (foot, wrist). The
// tip's distance is kept within what the two bones span (`margin` px short
// of either limit), the middle joint swings out to the side `bend` picks.
// No iterations, no allocations: the joint is written into `out`.
//
const MIN_DIST = 0.001

/**
 * Solves a two-bone limb: where its middle joint goes for a tip target.
 * `bend` picks the side the joint folds to (+1 or -1); values between
 * fold it part of the way (0: the limb straight along the target line),
 * so a joint changing sides can do so smoothly; the first bone always
 * keeps its length.
 * @param {number} rootX - Root X
 * @param {number} rootY - Root Y
 * @param {number} tipX - Tip target X
 * @param {number} tipY - Tip target Y
 * @param {number} len1 - First bone's length (root to joint)
 * @param {number} len2 - Second bone's length (joint to tip)
 * @param {number} bend - Fold side and share, -1 … 1
 * @param {number} margin - How far short of the bones' limits the tip stays (px)
 * @param {{x: number, y: number}} out - Receives the middle joint
 * @returns {{x: number, y: number}} out
 */
export function solveTwoBone(rootX, rootY, tipX, tipY, len1, len2, bend, margin, out) {
  const dx = tipX - rootX
  const dy = tipY - rootY
  const raw = vecLen(dx, dy) || MIN_DIST
  const dist = Math.max(Math.abs(len1 - len2) + margin, Math.min(len1 + len2 - margin, raw))
  const cos = Math.max(-1, Math.min(1, (len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist)))
  const angle = Math.atan2(dy, dx) + bend * Math.acos(cos)
  out.x = rootX + Math.cos(angle) * len1
  out.y = rootY + Math.sin(angle) * len1
  return out
}
