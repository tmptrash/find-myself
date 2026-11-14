import * as PropellerBud from '../components/propeller-bud.js'

//
// Valera's flight as a short film: the camera stays with the hero while the
// bud flies. Once the bud has practically landed (PropellerBud.isNearlyLanded)
// the camera leaves the hero for it, stays HOLD_SEC with it and comes back.
// From take-off until the camera is back the hero still shows but the level's
// creatures do not see him (see isHeroUnseen), and while the camera is leaving
// him he cannot be hurt by anything (isHeroShielded).
//
// The camera flies like one held in hands: over TRAVEL_SEC it eases into the
// flight, reaches its top speed at the half way point between the hero and the
// bud and eases out to a stop at the bud, gently (a smoothstep). It then settles
// with a soft swing (SWING_PX, swelling in over SWING_IN_SEC from nothing, so no
// jolt where the flight ends, then dying away over SWING_DECAY_SEC) and, as long as it
// is on the bud, sways the way a first-person shooter's camera does: a smooth
// wandering figure-of-eight of SWAY_PX made of slow waves at the frequencies of
// SWAY_X_HZ / SWAY_Y_HZ (their weights in SWAY_MIX), so his aim never rests dead
// centre. It stays HOLD_SEC on him so the sway can be seen.
//
const HOLD_SEC = 4
const TRAVEL_SEC = 2.2
const SWING_PX = 28
const SWING_IN_SEC = 1
const SWING_DECAY_SEC = 2.2
const SWING_HZ = 0.5
const SWING_VERTICAL = 0.3
const SWAY_PX = 16
const SWAY_X_HZ = [0.22, 0.5, 0.85]
const SWAY_Y_HZ = [0.35, 0.7, 1.1]
const SWAY_PHASE_X = [0, 1.1, 2.3]
const SWAY_PHASE_Y = [0.5, 1.9, 0.3]
const SWAY_MIX = [0.78, 0.2, 0.02]
const SWAY_VERTICAL = 0.7
const PHASE = {
  IDLE: 'idle',
  FLY: 'fly',
  LEAVE: 'leave',
  HOLD: 'hold',
  RETURN: 'return'
}

/**
 * Creates the film's state for a level's bud.
 * @param {Object} cfg
 * @param {Object} cfg.bud - Propeller bud inst
 * @returns {Object} Film inst
 */
export function create(cfg) {
  return {
    bud: cfg.bud,
    phase: PHASE.IDLE,
    holdLeft: 0,
    // How far the camera has gone from the hero to the bud (0 hero .. 1 bud)
    t: 0,
    // Progress (0..1) of the camera's current flight and where it started from
    u: 0,
    from: 0,
    time: 0,
    swingT: Infinity,
    head: { x: 0, y: 0 },
    last: { x: 0, y: 0 }
  }
}

/**
 * Advances the film. Call once per frame.
 * @param {Object} inst - Film inst
 * @param {number} dt - Frame delta (s)
 * @param {boolean} heroAlive - False while the hero is dying or drowning: the film is dropped
 */
export function onUpdate(inst, dt, heroAlive) {
  if (!heroAlive) {
    resetFilm(inst)
    return
  }
  PropellerBud.headPos(inst.bud, inst.head) && (inst.last.x = inst.head.x, inst.last.y = inst.head.y)
  inst.time += dt
  tickPhase(inst, dt)
}

/**
 * True from the bud's take-off until the camera is back on the hero.
 * @param {Object|null} inst - Film inst
 * @returns {boolean}
 */
export function isHeroUnseen(inst) {
  return Boolean(inst) && inst.phase !== PHASE.IDLE
}

/**
 * True while the camera is leaving the hero for the landed bud: nothing in the
 * level may hurt him then.
 * @param {Object|null} inst - Film inst
 * @returns {boolean}
 */
export function isHeroShielded(inst) {
  return Boolean(inst) && inst.phase === PHASE.LEAVE
}

/**
 * Where the camera looks: the hero's point moved toward the bud by the film's
 * progress, plus the swing and the wandering aim of the hands once it is on
 * the bud, written into out.
 * @param {Object|null} inst - Film inst
 * @param {number} heroX - Hero world X
 * @param {number} heroY - Hero world Y
 * @param {{x: number, y: number}} out - Point to fill
 * @returns {number} How far from the hero the view is (0 = on him)
 */
export function focusPoint(inst, heroX, heroY, out) {
  if (!inst) {
    out.x = heroX
    out.y = heroY
    return 0
  }
  const s = inst.t
  const hand = handOffset(inst)
  out.x = heroX + (inst.last.x - heroX) * s + hand.x
  out.y = heroY + (inst.last.y - heroY) * s + hand.y
  return s > 0.001 ? s : 0
}
//
// The flight's easing: smoothly speeding up to the half way point, then
// slowing down the same way to a stop (u 0..1 → 0..1); its top speed is only
// 1.5 times the average, so the camera never lunges.
//
function ease(u) {
  return u * u * (3 - 2 * u)
}
//
// A smooth wander: slow waves at the given frequencies and phases, mixed by weight.
//
function wander(time, hz, phase) {
  let sum = 0
  for (let n = 0; n < hz.length; n++) sum += SWAY_MIX[n] * Math.sin(time * hz[n] * Math.PI * 2 + phase[n])
  return sum
}
//
// The settling swing at a time since arriving: it swells in smoothly (so the
// camera's speed does not jump where the flight ends), dies away over
// SWING_DECAY_SEC and goes on, ever fainter, while the camera leaves again.
//
function swingOffset(swingT) {
  if (!Number.isFinite(swingT)) return 0
  const attack = ease(Math.min(1, swingT / SWING_IN_SEC))
  return SWING_PX * attack * Math.exp(-swingT / SWING_DECAY_SEC) * Math.sin(swingT * SWING_HZ * Math.PI * 2)
}
//
// The hands' offset: the settling swing after arriving plus the shooter-style
// sway, both only as far as the camera is on the bud.
//
const handScratch = { x: 0, y: 0 }
function handOffset(inst) {
  const w = inst.t
  const swing = swingOffset(inst.swingT)
  handScratch.x = w * (swing + SWAY_PX * wander(inst.time, SWAY_X_HZ, SWAY_PHASE_X))
  handScratch.y = w * (swing * SWING_VERTICAL + SWAY_PX * SWAY_VERTICAL * wander(inst.time, SWAY_Y_HZ, SWAY_PHASE_Y))
  return handScratch
}
//
// Take-off starts the film (a camera still away goes back to the hero); the
// practical landing sends the camera to the bud; once it is there the hold
// runs (the swinging dies away in it), and its end starts the way back.
//
function tickPhase(inst, dt) {
  inst.swingT += dt
  const moving = PropellerBud.isMoving(inst.bud)
  if (moving && !PropellerBud.isNearlyLanded(inst.bud)) {
    tickFlight(inst, dt)
    return
  }
  inst.phase === PHASE.FLY && startLeave(inst)
  inst.phase === PHASE.LEAVE && tickLeave(inst, dt)
  inst.phase === PHASE.HOLD && tickHold(inst, dt)
  inst.phase === PHASE.RETURN && tickReturn(inst, dt)
}
//
// The bud is in flight: the camera is on the hero, or coming back to him.
//
function tickFlight(inst, dt) {
  if (inst.t > 0 && inst.phase !== PHASE.RETURN) startReturn(inst)
  inst.phase === PHASE.IDLE && (inst.phase = PHASE.FLY)
  inst.phase === PHASE.RETURN && tickReturn(inst, dt)
}
function startLeave(inst) {
  inst.phase = PHASE.LEAVE
  inst.u = 0
  inst.from = inst.t
}
function tickLeave(inst, dt) {
  inst.u = Math.min(1, inst.u + dt / TRAVEL_SEC)
  inst.t = inst.from + (1 - inst.from) * ease(inst.u)
  if (inst.u < 1) return
  inst.phase = PHASE.HOLD
  inst.holdLeft = HOLD_SEC
  inst.swingT = 0
}
function tickHold(inst, dt) {
  inst.holdLeft -= dt
  inst.holdLeft <= 0 && startReturn(inst)
}
function startReturn(inst) {
  inst.phase = PHASE.RETURN
  inst.u = 0
  inst.from = inst.t
}
function tickReturn(inst, dt) {
  inst.u = Math.min(1, inst.u + dt / TRAVEL_SEC)
  inst.t = inst.from * (1 - ease(inst.u))
  inst.u >= 1 && finishReturn(inst)
}
//
// The camera is back on the hero: the film is over.
//
function finishReturn(inst) {
  inst.phase = PHASE.IDLE
  inst.t = 0
  inst.u = 0
}
function resetFilm(inst) {
  inst.phase = PHASE.IDLE
  inst.t = 0
  inst.u = 0
  inst.swingT = Infinity
}
