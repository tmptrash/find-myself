//
// The life of a loader eye (boot-loader.js, the cave's loader eye): its
// pupil darts to a spot and holds there, as if it tracks something moving
// about the screen, and now and then it blinks.
//
// Pupil saccades: a quick dart (PUPIL_DART_RATE per s) to a random spot at
// least PUPIL_MIN_REACH of the way out (PUPIL_CENTER_CHANCE of the time
// straight ahead), held PUPIL_HOLD_MIN..MAX s. Blinks: BLINK_SEC long,
// BLINK_GAP_MIN..MAX s apart.
//
const PUPIL_DART_RATE = 14
const PUPIL_HOLD_MIN_SEC = 0.7
const PUPIL_HOLD_MAX_SEC = 2.2
const PUPIL_MIN_REACH = 0.35
const PUPIL_CENTER_CHANCE = 0.15
const BLINK_SEC = 0.32
const BLINK_GAP_MIN_SEC = 0.9
const BLINK_GAP_MAX_SEC = 2.1

/**
 * Creates an eye's motion state.
 * @param {number} maxOffset - How far the pupil may move off the middle (SVG units)
 * @returns {Object} Motion instance: pupilX / pupilY are the pupil's offset now
 */
export function create(maxOffset) {
  return {
    maxOffset,
    pupilX: 0,
    pupilY: 0,
    targetX: 0,
    targetY: 0,
    holdLeft: 0,
    blinkLeft: 0,
    blinkGap: randomRange(BLINK_GAP_MIN_SEC, BLINK_GAP_MAX_SEC)
  }
}

/**
 * Runs the eye on: the pupil's dart or hold, the blink.
 * @param {Object} inst - Motion instance
 * @param {number} dt - Seconds since the last frame
 * @returns {number} How far the lid is down (0 open, 1 closed)
 */
export function onUpdate(inst, dt) {
  inst.holdLeft -= dt
  if (inst.holdLeft <= 0) {
    pickTarget(inst)
    inst.holdLeft = randomRange(PUPIL_HOLD_MIN_SEC, PUPIL_HOLD_MAX_SEC)
  }
  const ease = Math.min(1, dt * PUPIL_DART_RATE)
  inst.pupilX += (inst.targetX - inst.pupilX) * ease
  inst.pupilY += (inst.targetY - inst.pupilY) * ease
  return blink(inst, dt)
}
//
// A new spot to look at (now and then straight ahead, so it reads as
// looking around rather than jittering).
//
function pickTarget(inst) {
  if (Math.random() < PUPIL_CENTER_CHANCE) {
    inst.targetX = 0
    inst.targetY = 0
    return
  }
  const angle = Math.random() * Math.PI * 2
  const reach = inst.maxOffset * randomRange(PUPIL_MIN_REACH, 1)
  inst.targetX = Math.cos(angle) * reach
  inst.targetY = Math.sin(angle) * reach
}
//
// How far the lid is down: a smooth close-then-open over BLINK_SEC.
//
function blink(inst, dt) {
  if (inst.blinkLeft > 0) {
    inst.blinkLeft = Math.max(0, inst.blinkLeft - dt)
    return Math.sin(Math.PI * (1 - inst.blinkLeft / BLINK_SEC))
  }
  inst.blinkGap -= dt
  if (inst.blinkGap > 0) return 0
  inst.blinkLeft = BLINK_SEC
  inst.blinkGap = randomRange(BLINK_GAP_MIN_SEC, BLINK_GAP_MAX_SEC)
  return 0
}
function randomRange(min, max) {
  return min + Math.random() * (max - min)
}
