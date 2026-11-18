//
// Look-ahead of a level camera on a screen held upright (taller than
// wide): the camera leads the running hero by LEAD_SHARE of the view's
// width in the way he runs, so more of the level shows ahead of him and he
// sits toward the trailing edge. The lead never moves while he stands. It
// takes a new way only after he has run that way for LEAD_TURN_HOLD
// seconds (a step or a turn on the spot changes nothing), and then shifts
// only as he runs: LEAD_CATCH px of lead per px he covers, ramping in over
// LEAD_RAMP seconds and slowing down within LEAD_SOFT px of where it is
// going — so he drifts across the screen to the other side over a run
// instead of the view jumping. A move under LEAD_MOVE_EPS px a frame does
// not count as running; one over LEAD_TELEPORT px is a teleport (a
// respawn) and drops the lead. Shared by every level camera
// (forest-camera.js, cave-view.js).
//
const LEAD_SHARE = 0.32
const LEAD_MOVE_EPS = 0.5
const LEAD_TURN_HOLD = 0.4
const LEAD_CATCH = 0.45
const LEAD_RAMP = 0.5
const LEAD_SOFT = 60
const LEAD_SOFT_MIN = 0.15
const LEAD_TELEPORT = 200

/**
 * Creates a camera's look-ahead state (no lead yet).
 * @returns {Object} Lead instance
 */
export function create() {
  return { leadX: 0, leadDir: 0, runDir: 0, runTime: 0, lastX: null }
}

/**
 * Drops the lead at once (spawn, respawn, teleports): none, the hero at x.
 * @param {Object} inst - Lead instance
 * @param {number|null} x - Hero world X (null: unknown, the next update only takes it in)
 */
export function reset(inst, x) {
  inst.leadX = 0
  inst.leadDir = 0
  inst.runDir = 0
  inst.runTime = 0
  inst.lastX = x
}

/**
 * The lead this frame (world px to add to the hero's X for the camera):
 * none unless the screen is held upright.
 * @param {Object} inst - Lead instance
 * @param {Object} k - Kaplay instance
 * @param {number} heroX - Hero world X
 * @param {number} viewW - Width of the view onto the world (px)
 * @returns {number}
 */
export function update(inst, k, heroX, viewW) {
  const moved = inst.lastX === null ? 0 : heroX - inst.lastX
  inst.lastX = heroX
  if (k.height() <= k.width()) {
    inst.leadX = 0
    return 0
  }
  if (Math.abs(moved) > LEAD_TELEPORT) {
    reset(inst, heroX)
    return 0
  }
  if (Math.abs(moved) <= LEAD_MOVE_EPS) return inst.leadX
  trackRun(inst, Math.sign(moved), k.dt())
  const delta = inst.leadDir * viewW * LEAD_SHARE - inst.leadX
  const ramp = Math.min(1, Math.max(0, inst.runTime - LEAD_TURN_HOLD) / LEAD_RAMP)
  const soft = Math.max(LEAD_SOFT_MIN, Math.min(1, Math.abs(delta) / LEAD_SOFT))
  const step = Math.abs(moved) * LEAD_CATCH * ramp * soft
  inst.leadX += Math.sign(delta) * Math.min(Math.abs(delta), step)
  return inst.leadX
}
//
// How long the hero has been running his current way; the lead takes that
// way once he has kept to it LEAD_TURN_HOLD seconds.
//
function trackRun(inst, dir, dt) {
  inst.runTime = dir === inst.runDir ? inst.runTime + dt : 0
  inst.runDir = dir
  inst.runTime >= LEAD_TURN_HOLD && (inst.leadDir = dir)
}
