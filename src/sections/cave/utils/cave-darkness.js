import { forestRgb } from '../../forest/utils/forest-palette.js'
import * as Layout from './cave-layout.js'
import { CAVE_PAL } from './cave-paint.js'
//
// Darkness over the world (under the hero, glows and fireflies), applied as
// a multiply light level so the palette hues stay but sink toward the deep
// cave tone. Darkness amount 0 leaves the art untouched; 1 multiplies it by
// a deep shade of the darkness swatch. The upper part is one level the
// lantern mushroom lowers. The lower part is a baked mask: dim everywhere,
// cleared in pools around the lit mushrooms and fading in from the upper
// level at its top.
//
const MASK_SPRITE = 'cave0-dark-mask-v3'
const MASK_CELL = 2
const LOWER_BASE = 0.8
const LOWER_TOP_BAND = 170
const LOWER_MIN = 0.12
const LIGHT_STRENGTH = 0.78
//
// Upper part: full darkness and how much the lantern clears it.
//
const UPPER_DARK = 1
const LANTERN_CLEAR = 0.88
//
// Upper darkness steps (the lantern level snaps to them).
//
const LEVELS = 24
//
// Full darkness multiplies by this share of the darkness swatch — deeper
// than the swatch itself, so the unlit shaft is close to black.
//
const DARK_DEPTH = 0.5
const BYTE = 255
const bakedFor = new WeakSet()

/**
 * Creates the darkness layer and bakes its masks once per live k.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<{x: number, y: number, light: number}>} cfg.lights - Static light pools (lower part)
 * @returns {Object} Darkness instance
 */
export function create(cfg) {
  const { k, lights } = cfg
  const tint = forestRgb(CAVE_PAL.darkness)
  !bakedFor.has(k) && (bakeLowerMask(k, lights, tint), bakedFor.add(k))
  const levelColors = []
  for (let i = 0; i <= LEVELS; i++) {
    const m = multiplier(tint, i / LEVELS)
    levelColors.push(k.rgb(m.r, m.g, m.b))
  }
  return { k, levelColors, level: LEVELS }
}

/**
 * Sets the upper darkness from the lantern light level.
 * @param {Object} inst - Darkness instance
 * @param {number} lantern - Lantern light 0..1
 */
export function setLantern(inst, lantern) {
  inst.level = Math.round(UPPER_DARK * (1 - LANTERN_CLEAR * lantern) * LEVELS)
}

/**
 * Draws the darkness for the visible world rectangle.
 * @param {Object} inst - Darkness instance
 * @param {{left: number, top: number, right: number, bottom: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  const k = inst.k
  const upperBottom = Math.min(view.bottom, Layout.DARK_ZONE_BOTTOM_Y)
  upperBottom > view.top && inst.level > 0 && k.drawRect({
    pos: k.vec2(view.left, view.top),
    width: view.right - view.left,
    height: upperBottom - view.top,
    color: inst.levelColors[inst.level],
    blend: k.BlendMode.Multiply
  })
  view.bottom > Layout.DARK_ZONE_BOTTOM_Y && k.drawSprite({
    sprite: MASK_SPRITE,
    pos: k.vec2(0, Layout.DARK_ZONE_BOTTOM_Y),
    width: Layout.WORLD_W,
    height: Layout.WORLD_H - Layout.DARK_ZONE_BOTTOM_Y,
    blend: k.BlendMode.Multiply
  })
}
//
// Lower-part mask: fade from the upper level at the top, a dim base, and
// soft pools cleared around each lit mushroom.
//
function bakeLowerMask(k, lights, tint) {
  const w = Math.ceil(Layout.WORLD_W / MASK_CELL)
  const h = Math.ceil((Layout.WORLD_H - Layout.DARK_ZONE_BOTTOM_Y) / MASK_CELL)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(w, h)
  for (let row = 0; row < h; row++) {
    const wy = Layout.DARK_ZONE_BOTTOM_Y + row * MASK_CELL
    const band = Math.min(1, (wy - Layout.DARK_ZONE_BOTTOM_Y) / LOWER_TOP_BAND)
    const base = UPPER_DARK + (LOWER_BASE - UPPER_DARK) * smoothstep(band)
    for (let col = 0; col < w; col++) {
      const wx = col * MASK_CELL
      const clear = lights.reduce((sum, l) => sum + lightAt(l, wx, wy), 0)
      writePixel(img, row * w + col, multiplier(tint, Math.max(LOWER_MIN, base - clear)))
    }
  }
  ctx.putImageData(img, 0, 0)
  k.loadSprite(MASK_SPRITE, canvas)
}
function lightAt(light, x, y) {
  const d = Math.hypot(x - light.x, y - light.y) / light.light
  if (d >= 1) return 0
  const f = 1 - d * d
  return LIGHT_STRENGTH * f * f
}
//
// Light multiplier for a darkness amount: 1 (white) → the deep shade of
// the darkness swatch.
//
function multiplier(tint, amount) {
  const deep = c => BYTE - amount * (BYTE - c * DARK_DEPTH)
  return { r: Math.round(deep(tint.r)), g: Math.round(deep(tint.g)), b: Math.round(deep(tint.b)) }
}
function writePixel(img, index, rgb) {
  const i = index * 4
  img.data[i] = rgb.r
  img.data[i + 1] = rgb.g
  img.data[i + 2] = rgb.b
  img.data[i + 3] = BYTE
}
function smoothstep(t) {
  return t * t * (3 - 2 * t)
}
