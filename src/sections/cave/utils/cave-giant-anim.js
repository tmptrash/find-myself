import { CAVE_CFG } from '../cfg.js'
//
// The giant's procedural swim on top of its path (cave-giant.js lays its
// body along the trail its head swam): per frame, each bone's wave (rad,
// added to the bone's direction along the trail), each paddle's stroke
// and the body's slow float.
//
// The wave travels head to tail (sin of the phase minus PHASE_OFFSET per
// bone): hardly anything at the head, a little on the massive torso, most
// down the tail; its frequency and size follow the state and the speed,
// eased so they never jump, and slowly wander (WANDER_*) so no two beats
// are alike. States set the targets: IDLE (barely moving), SWIM (by
// speed), SURFACE (the wave dying away), BREATHE (still on the surface,
// slow breaths nodding the head) and DIVE (the wave coming back).
//
const A = CAVE_CFG.giant.anim
export const STATE = { IDLE: 'idle', SWIM: 'swim', SURFACE: 'surface', BREATHE: 'breathe', DIVE: 'dive' }
//
// Per bone, head to tail: share of the wave (bones up to BODY_BONES take
// the body's swing, the rest the tail's).
//
const WAVE_SHARE = [0.08, 0.25, 0.12, 0.3, 0.55, 0.85, 1]
const BODY_BONES = 4
const PHASE_OFFSET = A.phaseOffset
//
// State targets: wave size (share of full) and frequency (share of
// swimFrequency); speed (the share of its chase speed it swims or wants
// to) adds more, the tail beating harder and faster the faster it goes;
// how fast targets are eased (per s).
//
const TARGETS = {
  [STATE.IDLE]: { amp: 0.25, freq: 0.4 },
  [STATE.SWIM]: { amp: 0.45, freq: 0.6 },
  [STATE.SURFACE]: { amp: 0.15, freq: 0.4 },
  [STATE.BREATHE]: { amp: 0.08, freq: 0.3 },
  [STATE.DIVE]: { amp: 0.6, freq: 0.8 }
}
const SPEED_AMP = 0.7
const SPEED_FREQ = 1.8
const EASE_RATE = 2
//
// Wandering: the wave's size and pace drift slowly (two slow sines each).
//
const WANDER_AMP = 0.15
const WANDER_FREQ = 0.1
const WANDER_W1 = 0.37
const WANDER_W2 = 0.23
//
// Breathing: the head nods BREATH_NOD rad at BREATH_HZ; the body floats
// BOB px at BOB_HZ (BOB_BREATHE while breathing, so a rider is not shaken).
//
const BREATH_NOD = 0.025
const BREATH_HZ = 0.25
const BOB = 2
const BOB_BREATHE = 0.6
const BOB_HZ = 0.17
//
// Paddles (front, hind): a rowing stroke — a quick sweep back and a slower
// return (the stroke's sine plus STROKE_SKEW of its double) — FIN_SWING
// rad about its socket, the hind one FIN_LAG behind the front one;
// strokes per s follow the swim's pace (PADDLE_HZ). Breathing calms them
// by BREATHE_CALM.
//
const FIN_SWING = [0.38, 0.32]
const FIN_LAG = [0, 1.4]
const STROKE_SKEW = 0.35
const PADDLE_HZ = 0.45
const BREATHE_CALM = 0.8
const FULL_TURN = Math.PI * 2

/**
 * Creates the giant's animator.
 * @param {number} bones - Bone count, head first
 * @returns {Object} Animator instance
 */
export function create(bones) {
  return {
    waves: Array.from({ length: bones }, () => 0),
    fins: FIN_SWING.map(() => 0),
    amp: TARGETS[STATE.IDLE].amp,
    freq: TARGETS[STATE.IDLE].freq,
    breathe: 0,
    phase: 0,
    paddle: 0,
    t: 0,
    bob: 0
  }
}

/**
 * Runs the animation on.
 * @param {Object} inst - Animator instance
 * @param {Object} drive
 * @param {string} drive.state - STATE
 * @param {number} drive.speed - Share of full speed (0..1)
 * @param {number} drive.dt - Delta time
 */
export function onUpdate(inst, drive) {
  const dt = drive.dt * A.animationSpeed
  const goal = TARGETS[drive.state]
  const ease = 1 - Math.exp(-EASE_RATE * dt)
  inst.t += dt
  inst.amp += (goal.amp + SPEED_AMP * drive.speed - inst.amp) * ease
  inst.freq += (goal.freq + SPEED_FREQ * drive.speed - inst.freq) * ease
  inst.breathe += ((drive.state === STATE.BREATHE ? 1 : 0) - inst.breathe) * ease
  const wander = 1 + WANDER_AMP * Math.sin(inst.t * WANDER_W1) * Math.sin(inst.t * WANDER_W2 + 1)
  inst.phase += FULL_TURN * A.swimFrequency * inst.freq * (1 + WANDER_FREQ * Math.sin(inst.t * WANDER_W2)) * dt
  const nod = BREATH_NOD * inst.breathe * Math.sin(inst.t * BREATH_HZ * FULL_TURN)
  inst.waves.forEach((_, i) => {
    const swing = i < BODY_BONES ? A.swimAmplitude : A.tailAmplitude
    inst.waves[i] = swing * WAVE_SHARE[i] * inst.amp * wander * Math.sin(inst.phase - i * PHASE_OFFSET) + (i === 0 ? nod : 0)
  })
  swingParts(inst, drive.speed, dt)
  inst.bob = Math.sin(inst.t * BOB_HZ * FULL_TURN) * (BOB + (BOB_BREATHE - BOB) * inst.breathe)
}
//
// The paddles row with the stroke (faster the faster it swims).
//
function swingParts(inst, speed, dt) {
  const calm = 1 - inst.breathe * BREATHE_CALM
  inst.paddle += FULL_TURN * PADDLE_HZ * (inst.freq + speed) * dt
  inst.fins.forEach((_, i) => {
    inst.fins[i] = FIN_SWING[i] * stroke(inst.paddle - FIN_LAG[i]) * calm
  })
}
//
// A rowing stroke at phase p: quick one way, slower back.
//
function stroke(p) {
  return (Math.sin(p) + STROKE_SKEW * Math.sin(2 * p)) / (1 + STROKE_SKEW)
}
