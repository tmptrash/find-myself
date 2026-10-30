import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import { CAVE_PAL } from '../utils/cave-paint.js'
//
// Cave fireflies: slow wandering sparks across the shaft, plus bursts the
// hero shatters into on a spike hit (they drift apart, flicker and fade).
// Everything draws in one additive pass with the shared glow sprite.
//
const AMBIENT_SPEED = 22
const AMBIENT_TURN_RATE = 0.9
const AMBIENT_GLOW_R = 9
const AMBIENT_CORE_R = 1.6
const AMBIENT_OPACITY = 0.75
const FLICKER_SPEED_MIN = 1.2
const FLICKER_SPEED_RANGE = 2.4
const FLICKER_DEPTH = 0.55
const CULL_PAD = 24
//
// Burst sparks: launch speed, drag, lifetime and size.
//
const BURST_SPEED_MIN = 50
const BURST_SPEED_RANGE = 190
const BURST_UP_BIAS = 60
const BURST_DRAG = 1.6
const BURST_FLOAT = 14
const BURST_LIFE_MIN = 1.5
const BURST_LIFE_RANGE = 0.9
const BURST_GLOW_R_MIN = 6
const BURST_GLOW_R_RANGE = 7
const BURST_SPREAD_PX = 14
const CORE_GLOW_SCALE = 0.32
const SPARK_FLICKER_MULT = 3
const FULL_TURN = Math.PI * 2

/**
 * Creates the ambient firefly swarm.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {{x1: number, y1: number, x2: number, y2: number}} cfg.bounds - World box they wander in
 * @param {number} cfg.count - Ambient firefly count
 * @returns {Object} Fireflies instance
 */
export function create(cfg) {
  const { k, bounds, count } = cfg
  Glow.create(k)
  const inst = {
    k,
    bounds,
    ambient: [],
    sparks: [],
    glowRgb: getRGB(k, CAVE_PAL.firefly),
    coreRgb: getRGB(k, CAVE_PAL.fireflyCore),
    sparkRgbs: CAVE_PAL.heroSpark.map(hex => getRGB(k, hex))
  }
  for (let i = 0; i < count; i++) {
    inst.ambient.push({
      x: bounds.x1 + Math.random() * (bounds.x2 - bounds.x1),
      y: bounds.y1 + Math.random() * (bounds.y2 - bounds.y1),
      heading: Math.random() * FULL_TURN,
      flickerSpeed: FLICKER_SPEED_MIN + Math.random() * FLICKER_SPEED_RANGE,
      phase: Math.random() * FULL_TURN
    })
  }
  return inst
}

/**
 * Bursts the hero into fireflies at a point.
 * @param {Object} inst - Fireflies instance
 * @param {number} x - Burst centre X
 * @param {number} y - Burst centre Y
 * @param {number} count - Spark count
 */
export function burst(inst, x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * FULL_TURN
    const speed = BURST_SPEED_MIN + Math.random() * BURST_SPEED_RANGE
    const life = BURST_LIFE_MIN + Math.random() * BURST_LIFE_RANGE
    inst.sparks.push({
      x: x + (Math.random() - 0.5) * BURST_SPREAD_PX,
      y: y + (Math.random() - 0.5) * BURST_SPREAD_PX * 2,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - BURST_UP_BIAS,
      life,
      maxLife: life,
      r: BURST_GLOW_R_MIN + Math.random() * BURST_GLOW_R_RANGE,
      color: inst.sparkRgbs[i % inst.sparkRgbs.length],
      flickerSpeed: (FLICKER_SPEED_MIN + Math.random() * FLICKER_SPEED_RANGE) * SPARK_FLICKER_MULT,
      phase: Math.random() * FULL_TURN
    })
  }
}

/**
 * Moves ambient fireflies and ages burst sparks.
 * @param {Object} inst - Fireflies instance
 */
export function onUpdate(inst) {
  const dt = inst.k.dt()
  const { bounds } = inst
  inst.ambient.forEach(f => {
    f.heading += (Math.random() - 0.5) * AMBIENT_TURN_RATE * FULL_TURN * dt
    f.x += Math.cos(f.heading) * AMBIENT_SPEED * dt
    f.y += Math.sin(f.heading) * AMBIENT_SPEED * dt
    const outX = f.x < bounds.x1 || f.x > bounds.x2
    const outY = f.y < bounds.y1 || f.y > bounds.y2
    outX && (f.heading = Math.PI - f.heading)
    outY && (f.heading = -f.heading)
    f.x = Math.max(bounds.x1, Math.min(bounds.x2, f.x))
    f.y = Math.max(bounds.y1, Math.min(bounds.y2, f.y))
  })
  const drag = Math.exp(-BURST_DRAG * dt)
  inst.sparks.forEach(s => {
    s.vx *= drag
    s.vy = s.vy * drag - BURST_FLOAT * dt
    s.x += s.vx * dt
    s.y += s.vy * dt
    s.life -= dt
  })
  inst.sparks = inst.sparks.filter(s => s.life > 0)
}

/**
 * Additive draw of every visible firefly and spark.
 * @param {Object} inst - Fireflies instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 * @param {number} [opacity=1] - Fade (the menu picture cross-fading)
 */
export function onDraw(inst, top, bottom, opacity = 1) {
  const k = inst.k
  const t = k.time()
  inst.ambient.forEach(f => {
    if (f.y < top - CULL_PAD || f.y > bottom + CULL_PAD) return
    const flicker = flickerAt(t, f) * opacity
    Glow.drawGlow(k, f.x, f.y, AMBIENT_GLOW_R, inst.glowRgb, AMBIENT_OPACITY * flicker)
    Glow.drawGlow(k, f.x, f.y, AMBIENT_CORE_R / CORE_GLOW_SCALE, inst.coreRgb, flicker)
  })
  inst.sparks.forEach(s => {
    const fade = s.life / s.maxLife
    const flicker = flickerAt(t, s)
    Glow.drawGlow(k, s.x, s.y, s.r, s.color, fade * flicker)
    Glow.drawGlow(k, s.x, s.y, s.r * CORE_GLOW_SCALE, inst.coreRgb, fade)
  })
}
//
// Brightness 1 → (1 - FLICKER_DEPTH) following a per-light sine.
//
function flickerAt(t, light) {
  const wave = (1 + Math.sin(t * light.flickerSpeed + light.phase)) / 2
  return 1 - FLICKER_DEPTH * wave
}
