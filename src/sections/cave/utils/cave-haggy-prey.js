import { CAVE_CFG } from '../cfg.js'
import * as Runner from '../components/cave-runner.js'
//
// What the blind climber (cave-haggy.js) is told of and what it does with
// a runner — the same in the level and in the menu's backdrop: the bodies
// it may touch, a runner as its prey, how a caught runner is drawn, how
// its jaws and its hands are heard.
// A runner's body is RUNNER_R px round. In the hand it lies along the
// hand, its head on toward the mouth, gripped by its hind end (HELD_BACK
// of its own sheet px behind its middle) and reaching HELD_AHEAD px on
// from the grip — what the bites take off, so the piece left in the hand
// grows shorter; the piece a bite took, in the mouth, shrinks by
// CHEWED_SHRINK as it is chewed. Its running shakes the rock (tremor):
// the climber feels it from afar. A chew's crunch lasts CHEW_CRUNCH_TIME
// … CHEW_CRUNCH_TIME_RANGE more s (each chew its own length), a bite's
// as long as the jaws take to close. A hand taking hold is
// heard only close by, gone GRIP_HEAR px from the listener.
//
export const KIND_RUNNER = 'runner'
export const RUNNER_R = 9
const HELD_BACK = 190
const HELD_AHEAD = 22
const CHEWED_SHRINK = 0.45
const CHEW_CRUNCH_TIME = 0.06
const CHEW_CRUNCH_TIME_RANGE = 0.2
const GRIP_HEAR = 650

/**
 * Creates a runner's record as the climber's prey (what the climber hands
 * back in its callbacks and to the draw).
 * @param {Object} runner - Runner instance
 * @returns {Object} Prey: its kind, the runner, how the climber holds and feels it
 */
export function create(runner) {
  return { kind: KIND_RUNNER, runner, ahead: HELD_AHEAD, mouthful: true, tremor: true }
}

/**
 * Sets the n-th body in the climber's list (its record made once, then
 * only updated): its middle and radius and what it is as prey; not about
 * (live: false) while it has no place.
 * @param {Array<Object>} beings - The climber's list (ctx.beings)
 * @param {number} n - Its place in the list
 * @param {{x: number, y: number}|null} pos - Its middle (null: not about)
 * @param {number} r - Its body's radius (px)
 * @param {Object|null} prey - What it is as prey (null: nothing to eat)
 */
export function setBeing(beings, n, pos, r, prey) {
  beings[n] ??= { x: 0, y: 0, r, live: false, prey }
  const b = beings[n]
  b.live = Boolean(pos)
  b.x = pos ? pos.x : b.x
  b.y = pos ? pos.y : b.y
}

/**
 * Draws a runner the climber eats: along the hand, its head on toward the
 * fingers' tips, kicking, as much of it as the bites have left (chew
 * below 0) — or the piece the last bite took off, in the mouth, smaller
 * the longer it is chewed (chew 0 … 1).
 * @param {Object} prey - From create()
 * @param {{x: number, y: number}} at - World point
 * @param {number} angle - The hand's turn (degrees)
 * @param {number} bites - Bites taken so far
 * @param {number} kick - How hard it kicks (0 … 1)
 * @param {number} chew - Below 0: what the hand holds; 0 … 1: the bitten piece, so far chewed
 */
export function onDraw(prey, at, angle, bites, kick, chew) {
  if (chew >= 0) return Runner.drawBitten(prey.runner, at, angle, bites, 1 - CHEWED_SHRINK * chew)
  Runner.drawHeld(prey.runner, at, angle, 1, kick, bites, HELD_BACK)
}

/**
 * How long the jaws' crunch on a runner lasts.
 * @param {number} strength - 1: a bite; less: a chew
 * @returns {number} Seconds
 */
export function crunchTime(strength) {
  return strength < 1 ? CHEW_CRUNCH_TIME + Math.random() * CHEW_CRUNCH_TIME_RANGE : CAVE_CFG.haggy.sense.eat.bite
}

/**
 * How near a hand's hold is heard: 1 right at the listener, 0 from
 * GRIP_HEAR px off.
 * @param {number} x - World X of the hold
 * @param {number} y - World Y of the hold
 * @param {{x: number, y: number}} ear - The listener (the hero, the view's middle)
 * @returns {number}
 */
export function gripNear(x, y, ear) {
  return 1 - Math.hypot(x - ear.x, y - ear.y) / GRIP_HEAR
}
