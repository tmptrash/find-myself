import { glowRgb } from './glow-palette.js'
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
