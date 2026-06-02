import { toCanvas, getHex } from '../../../utils/helper.js'
import { drawMoonToCanvas } from '../../../utils/draw-moon.js'

//
// Baked motif sizes
//
const FIGURE_W = 96
const FIGURE_H = 160
const TOUCH_MOON_CANVAS = 96
const TOUCH_MOON_DISC_R = TOUCH_MOON_CANVAS * 0.21
const TOUCH_MOON_GLOW_R = TOUCH_MOON_DISC_R * 0.32
const TIME_SUN_CANVAS = 120
const TIME_SUN_DISC_R = TIME_SUN_CANVAS * 0.36
const TOUCH_MOON_SPRITE_KEY = 'word-touch-moon'
const TIME_SUN_SPRITE_KEY = 'word-time-sun'
const BRAIN_SPRITE_KEY = 'word-brain'
const BRAIN_SRC_W = 402
const BRAIN_SRC_H = 466
//
// Touch moon body — lavender-violet so it matches the word playfield
//
const WORD_MOON_COLOR_R = 168
const WORD_MOON_COLOR_G = 158
const WORD_MOON_COLOR_B = 196
//
// Time section sun palette (time-day-night.js / city-background.js)
//
const TIME_SUN_COLOR_R = 255
const TIME_SUN_COLOR_G = 140
const TIME_SUN_COLOR_B = 0
const TIME_SUN_GLOW_STEPS = 24
const TIME_SUN_GLOW_MAX_FACTOR = 0.488
const TIME_SUN_CENTER_R = 255
const TIME_SUN_CENTER_G = 228
const TIME_SUN_CENTER_B = 120

/**
 * Returns a cached figure silhouette sprite (single-path fill — no overlap darkening)
 * @param {Object} k - Kaplay instance
 * @param {string} fillHex - Silhouette fill hex
 * @returns {string} Sprite key
 */
export function getFigureSpriteKey(k, fillHex) {
  const hex = getHex(fillHex).replace('#', '')
  const key = `word-figure-${hex}`
  if (!k.getSprite(key)) {
    const canvas = toCanvas({ width: FIGURE_W, height: FIGURE_H, pixelRatio: 1 }, (ctx) => {
      drawFigureSilhouette(ctx, FIGURE_W / 2, FIGURE_H * 0.94, FIGURE_H * 0.38, getHex(fillHex))
    })
    k.loadSprite(key, canvas)
    canvas.width = 0
    canvas.height = 0
  }
  return key
}

/**
 * Returns touch-section moon sprite (draw-moon.js) with a tight purple-tinted halo
 * @param {Object} k - Kaplay instance
 * @returns {string} Sprite key
 */
export function getTouchMoonSpriteKey(k) {
  if (!k.getSprite(TOUCH_MOON_SPRITE_KEY)) {
    const canvas = toCanvas({ width: TOUCH_MOON_CANVAS, height: TOUCH_MOON_CANVAS, pixelRatio: 1 }, (ctx) => {
      drawMoonToCanvas(ctx, {
        cx: TOUCH_MOON_CANVAS / 2,
        cy: TOUCH_MOON_CANVAS / 2,
        radius: TOUCH_MOON_DISC_R,
        glowRadius: TOUCH_MOON_GLOW_R,
        color: { r: WORD_MOON_COLOR_R, g: WORD_MOON_COLOR_G, b: WORD_MOON_COLOR_B }
      })
    })
    k.loadSprite(TOUCH_MOON_SPRITE_KEY, canvas)
    canvas.width = 0
    canvas.height = 0
  }
  return TOUCH_MOON_SPRITE_KEY
}

/**
 * Returns time-section sun sprite (time-day-night.js radial glow style)
 * @param {Object} k - Kaplay instance
 * @returns {string} Sprite key
 */
export function getTimeSunSpriteKey(k) {
  if (!k.getSprite(TIME_SUN_SPRITE_KEY)) {
    const canvas = toCanvas({ width: TIME_SUN_CANVAS, height: TIME_SUN_CANVAS, pixelRatio: 1 }, (ctx) => {
      drawTimeSunArt(ctx, TIME_SUN_CANVAS / 2, TIME_SUN_CANVAS / 2, TIME_SUN_DISC_R)
    })
    k.loadSprite(TIME_SUN_SPRITE_KEY, canvas)
    canvas.width = 0
    canvas.height = 0
  }
  return TIME_SUN_SPRITE_KEY
}

/**
 * Alias for drift motifs — touch moon with compact glow
 * @param {Object} k - Kaplay instance
 * @returns {string} Sprite key
 */
export function getMoonSpriteKey(k) {
  return getTouchMoonSpriteKey(k)
}

/**
 * Loads the static brain PNG from assets (publicDir root)
 * @param {Object} k - Kaplay instance
 */
export function loadBrainSprite(k) {
  !k.getSprite(BRAIN_SPRITE_KEY) && k.loadSprite(BRAIN_SPRITE_KEY, './brain.png')
}

/**
 * Returns the brain sprite key for the playfield center backdrop
 * @param {Object} k - Kaplay instance
 * @returns {string} Sprite key
 */
export function getBrainSpriteKey(k) {
  loadBrainSprite(k)
  return BRAIN_SPRITE_KEY
}

/**
 * Fits brain.png inside the playfield — height capped at half the play area
 * @param {number} playWidth - Playfield width in pixels
 * @param {number} playHeight - Playfield height in pixels
 * @param {number} heightRatio - Target height as a fraction of playHeight
 * @param {number} maxWidthRatio - Max width as a fraction of playWidth
 * @returns {{ width: number, height: number }}
 */
export function computeBrainFitSize(playWidth, playHeight, heightRatio, maxWidthRatio) {
  const aspect = BRAIN_SRC_W / BRAIN_SRC_H
  let height = playHeight * heightRatio
  let width = height * aspect
  const maxWidth = playWidth * maxWidthRatio
  if (width > maxWidth) {
    width = maxWidth
    height = width / aspect
  }
  return { width, height }
}

//
// Unified human silhouette — one fill path, no stacked shapes
//
function drawFigureSilhouette(ctx, cx, footY, s, fill) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(cx, footY - s * 2.05, s * 0.22, 0, Math.PI * 2)
  ctx.moveTo(cx - s * 0.34, footY - s * 1.62)
  ctx.lineTo(cx + s * 0.34, footY - s * 1.62)
  ctx.lineTo(cx + s * 0.28, footY - s * 0.92)
  ctx.lineTo(cx + s * 0.14, footY)
  ctx.lineTo(cx + s * 0.04, footY)
  ctx.lineTo(cx + s * 0.08, footY - s * 0.96)
  ctx.lineTo(cx - s * 0.08, footY - s * 0.96)
  ctx.lineTo(cx - s * 0.04, footY)
  ctx.lineTo(cx - s * 0.14, footY)
  ctx.lineTo(cx - s * 0.28, footY - s * 0.92)
  ctx.closePath()
  ctx.moveTo(cx - s * 0.36, footY - s * 1.48)
  ctx.quadraticCurveTo(cx - s * 0.62, footY - s * 1.18, cx - s * 0.48, footY - s * 0.88)
  ctx.quadraticCurveTo(cx - s * 0.38, footY - s * 1.08, cx - s * 0.34, footY - s * 1.48)
  ctx.moveTo(cx + s * 0.36, footY - s * 1.48)
  ctx.quadraticCurveTo(cx + s * 0.62, footY - s * 1.18, cx + s * 0.48, footY - s * 0.88)
  ctx.quadraticCurveTo(cx + s * 0.38, footY - s * 1.08, cx + s * 0.34, footY - s * 1.48)
  ctx.fill('evenodd')
}

//
// Time section sun — concentric radial glow baked to canvas (time-day-night.js)
//
function drawTimeSunArt(ctx, cx, cy, r) {
  for (let s = 0; s < TIME_SUN_GLOW_STEPS; s++) {
    const t = s / (TIME_SUN_GLOW_STEPS - 1)
    const radius = r * (0.22 + t * (TIME_SUN_GLOW_MAX_FACTOR - 0.22))
    const cr = Math.round(TIME_SUN_COLOR_R + (255 - TIME_SUN_COLOR_R) * (1 - t) * 0.32)
    const cg = Math.round(TIME_SUN_COLOR_G + (216 - TIME_SUN_COLOR_G) * (1 - t) * 0.30)
    const cb = Math.round(TIME_SUN_COLOR_B + (92 - TIME_SUN_COLOR_B) * (1 - t) * 0.18)
    const op = (1 - t) * (1 - t) * 0.52
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${cr}, ${cg}, ${cb}, ${op})`
    ctx.fill()
  }
  ctx.beginPath()
  ctx.arc(cx, cy, r * 0.32, 0, Math.PI * 2)
  ctx.fillStyle = `rgba(${TIME_SUN_CENTER_R}, ${TIME_SUN_CENTER_G}, ${TIME_SUN_CENTER_B}, 0.32)`
  ctx.fill()
}
