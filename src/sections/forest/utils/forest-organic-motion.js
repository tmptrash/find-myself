//
// Analog motion toolkit for living forest things: spring-dampers stepped at a
// fixed substep (the same motion at 60 and 120 FPS), eased target ramps, and
// a smooth deterministic drift for idle breathing. The drift sums sines whose
// frequency ratios are irrational, under a slow amplitude swell, so it never
// settles into a loop a player could spot.
//
const TWO_PI = Math.PI * 2
const DRIFT_FREQS = [0.137, 0.2913, 0.6181]
const DRIFT_WEIGHTS = [0.56, 0.29, 0.15]
const DRIFT_SWELL_FREQ = 0.0713
const DRIFT_SWELL_DEPTH = 0.4
//
// Classic shader hash constants: any seed maps to a stable 0..1 value.
//
const HASH_A = 12.9898
const HASH_B = 43758.5453
const SEED_PHASE_STEP = 1.618

/**
 * Creates a spring-damper value at rest.
 * @param {number} [value=0] - Starting value
 * @returns {Object} Spring inst ({ value, velocity, acceleration })
 */
export function create(value = 0) {
  return { value, velocity: 0, acceleration: 0 }
}

/**
 * Advances a spring one substep (semi-implicit Euler: stable for the stiff,
 * well-damped springs used here at a 1/240 s step).
 * acceleration = stiffness * (target - value) - damping * velocity + extra
 * @param {Object} inst - Spring inst
 * @param {number} target - Value the spring pulls toward
 * @param {number} stiffness - Pull per unit offset (1/s²)
 * @param {number} damping - Velocity loss (1/s)
 * @param {number} h - Substep length (s)
 * @param {number} [extra=0] - Extra acceleration (inertia from a parent, kicks)
 * @returns {number} The acceleration applied this substep
 */
export function step(inst, target, stiffness, damping, h, extra = 0) {
  const acceleration = stiffness * (target - inst.value) - damping * inst.velocity + extra
  inst.acceleration = acceleration
  inst.velocity += acceleration * h
  inst.value += inst.velocity * h
  return acceleration
}

/**
 * Creates a fixed-substep clock.
 * @param {number} stepSec - Substep length (s)
 * @param {number} maxFrameSec - Longest frame time simulated (a hitch is not caught up)
 * @returns {Object} Clock inst
 */
export function createClock(stepSec, maxFrameSec) {
  return { stepSec, maxFrameSec, acc: 0 }
}

/**
 * Adds a frame's time and returns how many whole substeps to run now.
 * @param {Object} clock - Clock inst
 * @param {number} dt - Frame time (s)
 * @returns {number} Substep count
 */
export function consumeSteps(clock, dt) {
  clock.acc += Math.min(dt, clock.maxFrameSec)
  const steps = Math.floor(clock.acc / clock.stepSec)
  clock.acc -= steps * clock.stepSec
  return steps
}




/**
 * Smooth, deterministic, non-repeating drift in about -1..1.
 * @param {number} t - Time (s)
 * @param {number} seed - Any number; different seeds give unrelated drifts
 * @param {number} [speed=1] - Time scale (higher breathes faster)
 * @returns {number}
 */
export function drift(t, seed, speed = 1) {
  let sum = 0
  for (let i = 0; i < DRIFT_FREQS.length; i++) {
    const phase = hash01(seed + i * SEED_PHASE_STEP) * TWO_PI
    sum += DRIFT_WEIGHTS[i] * Math.sin(TWO_PI * DRIFT_FREQS[i] * speed * t + phase)
  }
  const swellPhase = hash01(seed - SEED_PHASE_STEP) * TWO_PI
  const swell = 1 - DRIFT_SWELL_DEPTH * (0.5 + 0.5 * Math.sin(TWO_PI * DRIFT_SWELL_FREQ * speed * t + swellPhase))
  return sum * swell
}

/**
 * Stable pseudo-random 0..1 for a number (no state, same input same output).
 * @param {number} n
 * @returns {number}
 */
export function hash01(n) {
  const s = Math.sin(n * HASH_A) * HASH_B
  return s - Math.floor(s)
}

/**
 * 0..1 ease with zero speed and acceleration at both ends (input clamped).
 * @param {number} x
 * @returns {number}
 */
export function smootherstep(x) {
  const t = Math.min(1, Math.max(0, x))
  return t * t * t * (t * (t * 6 - 15) + 10)
}
