import { GLOW_PAL } from '../utils/glow-palette.js'
//
// Soft diagonal sunlight shafts falling from the upper left to the lower
// right, as in the glow reference. One tiny soft-beam texture is baked per
// live Kaplay instance and stretched/rotated per shaft with drawSprite, so
// the GPU fills only the shafts' own quads and all shafts share one batch.
// The bake is a smooth alpha ramp on a single palette swatch; film grain is
// left off because the texture is stretched many times over.
//
const SHAFT_SPRITE = 'glow-light-shaft'
const SHAFT_TEX_W = 32
const SHAFT_TEX_H = 128
const SHAFT_ACROSS_POW = 2
const SHAFT_HEAD_FADE = 0.12
const SHAFT_TAIL_POW = 1.8
const SHAFT_ALPHA_MAX = 255
const SHAFT_SHIMMER_AMP = 0.22
const SHAFT_SHIMMER_SPEED = 0.35
const SHAFT_MIN_DRAW_OPACITY = 0.01
const RAD_TO_DEG = 180 / Math.PI
const bakedForK = new WeakMap()

/**
 * Creates the light-shaft layer.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {Array<{x: number, y: number, width: number, length: number, opacity: number}>} cfg.shafts - Shaft tops (world) and sizes
 * @param {number} cfg.angle - Shaft tilt in radians; negative leans the bottom to the right
 * @param {Function} cfg.getOpacity - () => number, global layer opacity
 * @param {number} cfg.z - Layer z
 * @returns {Object} Light-shaft inst
 */
export function create(cfg) {
  const { k, shafts, angle, getOpacity, z } = cfg
  ensureShaftSprite(k)
  const inst = {
    k,
    getOpacity,
    angleDeg: angle * RAD_TO_DEG,
    shafts: shafts.map((s, i) => ({ ...s, phase: i * 1.7 }))
  }
  k.add([k.z(z), { draw() { onDraw(inst) } }])
  return inst
}

/**
 * Draws every shaft with a slow per-shaft shimmer.
 * @param {Object} inst - Light-shaft inst
 */
export function onDraw(inst) {
  const layerOpacity = inst.getOpacity()
  if (layerOpacity < SHAFT_MIN_DRAW_OPACITY) return
  const { k } = inst
  const t = k.time() * SHAFT_SHIMMER_SPEED
  inst.shafts.forEach(shaft => {
    const shimmer = 1 - SHAFT_SHIMMER_AMP * (0.5 + 0.5 * Math.sin(t + shaft.phase))
    k.drawSprite({
      sprite: SHAFT_SPRITE,
      pos: k.vec2(shaft.x, shaft.y),
      width: shaft.width,
      height: shaft.length,
      angle: inst.angleDeg,
      anchor: 'top',
      opacity: shaft.opacity * shimmer * layerOpacity
    })
  })
}
//
// Alpha ramp: soft across the width, quick fade-in at the head, long fade
// toward the ground.
//
function ensureShaftSprite(k) {
  if (bakedForK.get(k)) return
  const canvas = document.createElement('canvas')
  canvas.width = SHAFT_TEX_W
  canvas.height = SHAFT_TEX_H
  const ctx = canvas.getContext('2d')
  const img = ctx.createImageData(SHAFT_TEX_W, SHAFT_TEX_H)
  const rgb = hexToRgb(GLOW_PAL.glowForestFloor.shaft)
  for (let y = 0; y < SHAFT_TEX_H; y++) {
    const v = y / (SHAFT_TEX_H - 1)
    const along = Math.min(1, v / SHAFT_HEAD_FADE) * Math.pow(1 - v, SHAFT_TAIL_POW)
    for (let x = 0; x < SHAFT_TEX_W; x++) {
      const u = (x + 0.5) / SHAFT_TEX_W
      const across = Math.pow(Math.sin(Math.PI * u), SHAFT_ACROSS_POW)
      const i = (y * SHAFT_TEX_W + x) * 4
      img.data[i] = rgb.r
      img.data[i + 1] = rgb.g
      img.data[i + 2] = rgb.b
      img.data[i + 3] = Math.round(SHAFT_ALPHA_MAX * across * along)
    }
  }
  ctx.putImageData(img, 0, 0)
  k.loadSprite(SHAFT_SPRITE, canvas)
  bakedForK.set(k, true)
}
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
