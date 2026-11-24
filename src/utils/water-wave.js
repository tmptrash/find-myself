//
// A water surface as a row of springs (Rain World style), one every
// `spacing` px across the open water: each point is pulled back to rest
// (tension), toward its neighbours (the wave equation at `speed` px/s) and
// slowed (damping). Its ends are pinned at rest, so waves come back off
// the banks and die out. It steps at a fixed STEP whatever the frame rate
// (as many steps as the frame's time takes, never more than MAX_STEPS),
// and what is shown (`y`) is eased between the last two steps by the time
// left over, so it moves smoothly at 60, 90 or 120 FPS without stepping
// any faster. Heights stay within ±amplitude px; what is shown has its
// crests drawn up sharper the higher they are (`crestSharp` of their
// height squared over the amplitude) and its troughs left round, as a
// strong wave's. The speed is held to CFL_MAX of a point's spacing per
// step, so no setting makes it blow up. Now and then (every
// idleEvery..+range s) a random point gets a tiny kick (±idleKick px/s):
// the still water is never quite flat, never in a repeating pattern.
// Everything lives in typed arrays made once: no allocation while it runs.
//
const STEP = 1 / 60
const MAX_STEPS = 4
const CFL_MAX = 0.9
const HALF = 0.5
const MIN_POINTS = 3

/**
 * Creates a water surface simulation over [x1, x2].
 * @param {Object} cfg
 * @param {number} cfg.x1 - World X of the left pinned end
 * @param {number} cfg.x2 - World X of the right pinned end
 * @param {number} cfg.spacing - Px between points (the wave's resolution)
 * @param {number} cfg.speed - Wave propagation speed (px/s)
 * @param {number} cfg.damping - Velocity damping (1/s)
 * @param {number} cfg.tension - Pull back to rest (1/s²)
 * @param {number} cfg.amplitude - Max height off rest (px)
 * @param {number} cfg.crestSharp - How much sharper high crests are drawn (0: not)
 * @param {number} cfg.kick - Velocity (px/s) a disturbance of strength 1 gives
 * @param {number} cfg.idleKick - Max velocity (px/s) of the idle kicks
 * @param {number} cfg.idleEvery - Seconds between idle kicks at least
 * @param {number} cfg.idleRange - Up to this many seconds more
 * @returns {Object} Wave instance: `count` points `dx` px apart from `x1`, shown heights `y`, velocities `v`
 */
export function create(cfg) {
  const count = Math.max(MIN_POINTS, Math.round((cfg.x2 - cfg.x1) / cfg.spacing) + 1)
  const dx = (cfg.x2 - cfg.x1) / (count - 1)
  const speed = Math.min(cfg.speed, dx / STEP * CFL_MAX)
  return {
    x1: cfg.x1,
    x2: cfg.x2,
    count,
    dx,
    h: new Float32Array(count),
    prev: new Float32Array(count),
    v: new Float32Array(count),
    y: new Float32Array(count),
    pull: speed * speed / (dx * dx),
    tension: cfg.tension,
    damping: cfg.damping,
    amplitude: cfg.amplitude,
    crestSharp: cfg.crestSharp,
    kick: cfg.kick,
    idleKick: cfg.idleKick,
    idleEvery: cfg.idleEvery,
    idleRange: cfg.idleRange,
    idleIn: cfg.idleEvery,
    acc: 0
  }
}

/**
 * Runs the springs on by this frame's time, in fixed steps, then eases
 * what is shown between the last two of them.
 * @param {Object} inst - Wave instance
 * @param {number} dt - Frame time (s)
 */
export function onUpdate(inst, dt) {
  inst.acc = Math.min(inst.acc + dt, STEP * MAX_STEPS)
  while (inst.acc >= STEP) {
    inst.acc -= STEP
    inst.prev.set(inst.h)
    step(inst)
  }
  show(inst, inst.acc / STEP)
}

/**
 * Pushes the surface down at a world X (something fell in or broke it):
 * the point there and half as much its two neighbours.
 * @param {Object} inst - Wave instance
 * @param {number} x - World X
 * @param {number} strength - How hard (1: `kick` px/s)
 */
export function disturb(inst, x, strength) {
  const i = Math.round((x - inst.x1) / inst.dx)
  if (i < 1 || i > inst.count - 2) return
  const v = inst.kick * strength
  inst.v[i] += v
  inst.v[i - 1] += v * HALF
  inst.v[i + 1] += v * HALF
}

/**
 * The surface's shown height off rest at a world X (0 off its span),
 * between its points.
 * @param {Object} inst - Wave instance
 * @param {number} x - World X
 * @returns {number} Px off rest (down is +)
 */
export function heightAt(inst, x) {
  if (x <= inst.x1 || x >= inst.x2) return 0
  const at = (x - inst.x1) / inst.dx
  const i = Math.min(inst.count - 2, Math.floor(at))
  const u = at - i
  return inst.y[i] + (inst.y[i + 1] - inst.y[i]) * u
}
//
// One fixed step: velocities from the neighbours, the pull to rest and
// the damping, then heights (held within amplitude, a point that hits it
// stopping there); the ends stay pinned.
//
function step(inst) {
  const { h, v, count, pull, tension, damping, amplitude } = inst
  for (let i = 1; i < count - 1; i++) {
    v[i] += (pull * (h[i - 1] + h[i + 1] - 2 * h[i]) - tension * h[i] - damping * v[i]) * STEP
  }
  for (let i = 1; i < count - 1; i++) {
    const y = h[i] + v[i] * STEP
    if (Math.abs(y) > amplitude) {
      h[i] = Math.sign(y) * amplitude
      v[i] = 0
    } else h[i] = y
  }
  idle(inst)
}
//
// What is shown: each point eased from its last step's height by `u`,
// its crest (up is −) drawn sharper.
//
function show(inst, u) {
  const { h, prev, y, count, crestSharp, amplitude } = inst
  for (let i = 0; i < count; i++) {
    const at = prev[i] + (h[i] - prev[i]) * u
    const up = Math.max(0, -at)
    y[i] = at - crestSharp * up * up / amplitude
  }
}
//
// The idle kick now and then (see idleKick).
//
function idle(inst) {
  inst.idleIn -= STEP
  if (inst.idleIn > 0) return
  inst.idleIn = inst.idleEvery + Math.random() * inst.idleRange
  const i = 1 + Math.floor(Math.random() * (inst.count - 2))
  inst.v[i] += (Math.random() * 2 - 1) * inst.idleKick
}
