import { glowRgb } from './glow-palette.js'
//
// Faulty lamp: steady glow, then a burst of rapid toggles; some bursts end
// in a short blackout. The "off" state keeps a faint filament glow.
//
const LAMP_STEADY_MIN = 0.5
const LAMP_STEADY_MAX = 2.2
const LAMP_TOGGLE_MIN = 0.03
const LAMP_TOGGLE_MAX = 0.1
const LAMP_BURST_MIN = 2
const LAMP_BURST_MAX = 6
const LAMP_DROPOUT_CHANCE = 0.35
const LAMP_DARK_MIN = 0.12
const LAMP_DARK_MAX = 0.45
const LAMP_OFF_LEVEL = 0.12
const LAMP_HUM_FREQ = 37
const LAMP_HUM_DEPTH = 0.12
//
// Rising sparks: spawn rate, speed, life and the share of brighter 2px ones.
//
const SPARK_MAX = 22
const SPARK_SPEED_MIN = 10
const SPARK_SPEED_MAX = 25
const SPARK_LIFE_MIN = 1.5
const SPARK_LIFE_MAX = 3
const SPARK_HOT_CHANCE = 0.3

/**
 * Creates the faulty-lamp state shared by every Glow hologram. Starts in a
 * burst so a freshly shown hologram stutters on like an old projector.
 * @returns {Object} Lamp inst
 */
export function createLamp() {
  return { on: false, phase: 'burst', timer: 0, toggles: 0, dropout: false }
}

/**
 * Ticks the lamp state machine: steady → burst of toggles → (dark) → steady.
 * @param {Object} lamp - Lamp inst from createLamp()
 * @param {Object} k - Kaplay inst
 * @param {number} dt - Frame delta in seconds
 */
export function updateLamp(lamp, k, dt) {
  lamp.timer -= dt
  if (lamp.timer > 0) return
  if (lamp.phase === 'burst' && lamp.toggles > 0) {
    lamp.on = !lamp.on
    lamp.toggles--
    lamp.timer = k.rand(LAMP_TOGGLE_MIN, LAMP_TOGGLE_MAX)
    return
  }
  if (lamp.phase === 'burst' && lamp.dropout) {
    lamp.on = false
    lamp.phase = 'dark'
    lamp.timer = k.rand(LAMP_DARK_MIN, LAMP_DARK_MAX)
    return
  }
  if (lamp.phase === 'burst') {
    lamp.on = true
    lamp.phase = 'steady'
    lamp.timer = k.rand(LAMP_STEADY_MIN, LAMP_STEADY_MAX)
    return
  }
  startLampBurst(lamp, k, lamp.phase === 'steady' && Math.random() < LAMP_DROPOUT_CHANCE)
}

/**
 * Forces a stutter right now (used when a hologram appears).
 * @param {Object} lamp - Lamp inst
 * @param {Object} k - Kaplay inst
 * @param {boolean} dropout - End the burst in a short blackout
 */
export function startLampBurst(lamp, k, dropout) {
  lamp.phase = 'burst'
  lamp.toggles = k.randi(LAMP_BURST_MIN, LAMP_BURST_MAX + 1)
  lamp.dropout = dropout
  lamp.timer = 0
}

/**
 * Current lamp brightness multiplier: mains hum while on, a dim filament when off.
 * @param {Object} lamp - Lamp inst
 * @param {number} time - Hologram clock in seconds
 * @returns {number} 0..1 brightness
 */
export function lampLevel(lamp, time) {
  if (!lamp.on) return LAMP_OFF_LEVEL
  return 1 - LAMP_HUM_DEPTH * (0.5 + 0.5 * Math.sin(time * LAMP_HUM_FREQ))
}

/**
 * True while the lamp is stuttering (holograms tear and jitter then).
 * @param {Object} lamp - Lamp inst
 * @returns {boolean}
 */
export function isLampBursting(lamp) {
  return lamp.phase === 'burst'
}

/**
 * Creates an empty rising-spark emitter.
 * @returns {{ list: Array, debt: number }} Spark emitter
 */
export function createSparks() {
  return { list: [], debt: 0 }
}

/**
 * Moves sparks up, drops dead ones and spawns new ones along a horizontal band.
 * @param {Object} sparks - Emitter from createSparks()
 * @param {Object} k - Kaplay inst
 * @param {number} dt - Frame delta in seconds
 * @param {number} spread - Half-width of the spawn band in px
 * @param {number} perSec - Spawn rate (0 stops spawning)
 */
export function updateSparks(sparks, k, dt, spread, perSec) {
  sparks.list.forEach(spark => {
    spark.t += dt
    spark.y -= spark.vy * dt
  })
  sparks.list = sparks.list.filter(spark => spark.t < spark.life)
  sparks.debt += dt * perSec
  while (sparks.debt >= 1) {
    sparks.debt--
    sparks.list.length < SPARK_MAX && sparks.list.push({
      x: k.rand(-spread, spread),
      y: 0,
      vy: k.rand(SPARK_SPEED_MIN, SPARK_SPEED_MAX),
      life: k.rand(SPARK_LIFE_MIN, SPARK_LIFE_MAX),
      hot: Math.random() < SPARK_HOT_CHANCE,
      t: 0
    })
  }
}

/**
 * Draws sparks relative to (x, y), fading each one over its life.
 * @param {Object} k - Kaplay inst
 * @param {Object} sparks - Emitter from createSparks()
 * @param {number} x - Emitter origin X
 * @param {number} y - Emitter origin Y
 * @param {number} op - Overall opacity
 * @param {Object} tones - Kaplay colors `{ spark, core }`
 */
export function drawSparks(k, sparks, x, y, op, tones) {
  sparks.list.forEach(spark => {
    const life = 1 - spark.t / spark.life
    k.drawRect({
      pos: k.vec2(Math.round(x + spark.x), Math.round(y + spark.y)),
      width: spark.hot ? 2 : 1,
      height: spark.hot ? 2 : 1,
      color: spark.hot ? tones.core : tones.spark,
      opacity: op * life
    })
  })
}

/**
 * Palette hex → Kaplay color for draw calls.
 * @param {Object} k - Kaplay inst
 * @param {string} hex - Palette hex
 * @returns {Object} Kaplay color
 */
export function paletteColor(k, hex) {
  const c = glowRgb(hex)
  return k.rgb(c.r, c.g, c.b)
}

/**
 * Palette hex → CSS rgba() string for canvas bakes.
 * @param {string} hex - Palette hex
 * @param {number} alpha - 0..1
 * @returns {string}
 */
export function cssColor(hex, alpha) {
  const c = glowRgb(hex)
  return `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`
}
