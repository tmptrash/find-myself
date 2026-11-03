//
// A tree's landing jolt: it swings round its foot for DURATION s at FREQ
// rad/s, dying out. Shared by the bomb trees and the water flower, so the
// plants a landing shakes all shake the same way; each picks its own swing
// size.
//
const DURATION = 0.6
const FREQ = 30

/**
 * Creates a tree's jolt, at rest.
 * @returns {Object} Jolt inst
 */
export function create() {
  return { left: 0 }
}

/**
 * Starts the jolt (restarts it if the tree is already rocking).
 * @param {Object} inst - Jolt inst
 */
export function start(inst) {
  inst.left = DURATION
}

/**
 * Runs the jolt down.
 * @param {Object} inst - Jolt inst
 * @param {number} dt - Frame delta (s)
 */
export function onUpdate(inst, dt) {
  inst.left > 0 && (inst.left = Math.max(0, inst.left - dt))
}

/**
 * The tree's current swing round its foot.
 * @param {Object} inst - Jolt inst
 * @param {number} maxRad - Swing at the start of the jolt (radians)
 * @returns {number} Radians (0 at rest)
 */
export function angle(inst, maxRad) {
  if (!(inst.left > 0)) return 0
  return Math.sin((DURATION - inst.left) * FREQ) * maxRad * inst.left / DURATION
}
