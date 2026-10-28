import { forestRgb } from '../../forest/utils/forest-palette.js'
import { getRGB } from '../../../utils/helper.js'
import * as Layout from './cave-layout.js'
import { CAVE_PAL } from './cave-paint.js'
//
// Warm light shaft falling through the entry hole from the forest above:
// a soft slanted wedge, brightest at the top, drawn additively over the
// darkness (it tints the air, it does not reveal the platforms). Baked once
// per live k at half resolution.
//
const SPRITE_NAME = 'cave0-shaft-v1'
const BAKE_SCALE = 0.5
const SHAFT_LEN = 720
const SHAFT_TOP_HALF_W = 70
const SHAFT_BOTTOM_HALF_W = 230
const SHAFT_SLANT = 120
const SHAFT_FADE_POW = 1.6
const SHAFT_EDGE_SOFT = 0.55
const SHAFT_TOP_Y = -20
const SHAFT_OPACITY = 0.2
const SHAFT_FLICKER_AMP = 0.12
const SHAFT_FLICKER_SPEED = 0.7
const BYTE = 255
const bakedFor = new WeakSet()

/**
 * Creates the entry light shaft.
 * @param {Object} k - Kaplay instance
 * @returns {Object} Shaft instance
 */
export function create(k) {
  !bakedFor.has(k) && (bakeShaft(k), bakedFor.add(k))
  const w = SHAFT_BOTTOM_HALF_W * 2 + SHAFT_SLANT
  return {
    k,
    x: (Layout.ENTRY_X1 + Layout.ENTRY_X2) / 2 - SHAFT_BOTTOM_HALF_W,
    w,
    color: getRGB(k, CAVE_PAL.shaft)
  }
}

/**
 * Additive draw of the shaft (skip when it is below the view).
 * @param {Object} inst - Shaft instance
 * @param {number} viewTop - View top world Y
 */
export function onDraw(inst, viewTop) {
  if (viewTop > SHAFT_TOP_Y + SHAFT_LEN) return
  const k = inst.k
  const flicker = 1 + Math.sin(k.time() * SHAFT_FLICKER_SPEED) * SHAFT_FLICKER_AMP
  k.drawSprite({
    sprite: SPRITE_NAME,
    pos: k.vec2(inst.x, SHAFT_TOP_Y),
    width: inst.w,
    height: SHAFT_LEN,
    color: inst.color,
    opacity: SHAFT_OPACITY * flicker,
    blend: k.BlendMode.Add
  })
}
//
// Wedge widening and slanting down-right, fading with depth and toward
// its soft side edges.
//
function bakeShaft(k) {
  const fullW = SHAFT_BOTTOM_HALF_W * 2 + SHAFT_SLANT
  const w = Math.ceil(fullW * BAKE_SCALE)
  const h = Math.ceil(SHAFT_LEN * BAKE_SCALE)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(w, h)
  const core = forestRgb(CAVE_PAL.glowCore)
  for (let y = 0; y < h; y++) {
    const t = y / h
    const halfW = SHAFT_TOP_HALF_W + (SHAFT_BOTTOM_HALF_W - SHAFT_TOP_HALF_W) * t
    const cx = SHAFT_BOTTOM_HALF_W + SHAFT_SLANT * t
    const fade = Math.pow(1 - t, SHAFT_FADE_POW)
    for (let x = 0; x < w; x++) {
      const d = Math.abs(x / BAKE_SCALE - cx) / halfW
      const edge = d >= 1 ? 0 : Math.min(1, (1 - d) / SHAFT_EDGE_SOFT)
      const i = (y * w + x) * 4
      img.data[i] = core.r
      img.data[i + 1] = core.g
      img.data[i + 2] = core.b
      img.data[i + 3] = Math.round(BYTE * fade * edge * edge)
    }
  }
  ctx.putImageData(img, 0, 0)
  k.loadSprite(SPRITE_NAME, canvas)
}
