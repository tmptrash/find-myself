import * as PropellerBud from '../components/propeller-bud.js'

//
// Valera's flight as a short film: while the bud flies from one stop to the
// next the camera leaves the hero and follows it, then stays with it for
// HOLD_SEC after it lands and comes back. All that time the hero still shows
// but the level's creatures do not see him (see isHeroUnseen).
//
const HOLD_SEC = 2
const BLEND_SEC = 0.9
const PHASE = {
  IDLE: 'idle',
  FOLLOW: 'follow',
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
    // How far the camera has gone from the hero to the bud (0..1, linear)
    t: 0,
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
  tickPhase(inst, dt)
  const goal = inst.phase === PHASE.RETURN || inst.phase === PHASE.IDLE ? 0 : 1
  const step = dt / BLEND_SEC
  inst.t += Math.sign(goal - inst.t) * Math.min(step, Math.abs(goal - inst.t))
  inst.phase === PHASE.RETURN && inst.t <= 0 && (inst.phase = PHASE.IDLE)
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
 * Where the camera looks: the hero's point moved toward the bud by the film's
 * progress (eased), written into out.
 * @param {Object|null} inst - Film inst
 * @param {number} heroX - Hero world X
 * @param {number} heroY - Hero world Y
 * @param {{x: number, y: number}} out - Point to fill
 * @returns {number} How far from the hero the view is (0 = on him)
 */
export function focusPoint(inst, heroX, heroY, out) {
  const s = inst ? inst.t * inst.t * (3 - 2 * inst.t) : 0
  out.x = heroX + ((inst?.last.x ?? heroX) - heroX) * s
  out.y = heroY + ((inst?.last.y ?? heroY) - heroY) * s
  return s
}

// Flight starts the film; landing starts the hold; the hold's end starts the camera's way back
function tickPhase(inst, dt) {
  if (PropellerBud.isMoving(inst.bud)) {
    inst.phase = PHASE.FOLLOW
    inst.holdLeft = HOLD_SEC
    return
  }
  inst.phase === PHASE.FOLLOW && (inst.phase = PHASE.HOLD)
  if (inst.phase !== PHASE.HOLD) return
  inst.holdLeft -= dt
  inst.holdLeft <= 0 && (inst.phase = PHASE.RETURN)
}

function resetFilm(inst) {
  inst.phase = PHASE.IDLE
  inst.t = 0
}
