import { CAVE_PAL, css } from './cave-paint.js'
//
// Shared soft radial glow sprite (cream core falling off to transparent).
// Tinted per draw with a palette colour and drawn additively for mushroom
// halos, fireflies and water glints. Baked once per live k.
//
const GLOW_SPRITE = 'cave0-glow-v1'
const GLOW_BAKE_R = 64
const GLOW_MID_STOP = 0.35
const GLOW_MID_ALPHA = 0.35
const glowReadyFor = new WeakSet()

/**
 * Ensures the glow sprite exists on this k and returns its name.
 * @param {Object} k - Kaplay instance
 * @returns {string} Sprite name
 */
export function create(k) {
  if (glowReadyFor.has(k)) return GLOW_SPRITE
  const size = GLOW_BAKE_R * 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(GLOW_BAKE_R, GLOW_BAKE_R, 0, GLOW_BAKE_R, GLOW_BAKE_R, GLOW_BAKE_R)
  g.addColorStop(0, css(CAVE_PAL.glowCore, 1))
  g.addColorStop(GLOW_MID_STOP, css(CAVE_PAL.glowCore, GLOW_MID_ALPHA))
  g.addColorStop(1, css(CAVE_PAL.glowCore, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  k.loadSprite(GLOW_SPRITE, canvas)
  glowReadyFor.add(k)
  return GLOW_SPRITE
}

/**
 * Draws one additive glow blob.
 * @param {Object} k - Kaplay instance
 * @param {number} x - Centre X (world)
 * @param {number} y - Centre Y (world)
 * @param {number} radius - Glow radius (px)
 * @param {Object} color - Kaplay rgb tint
 * @param {number} opacity - 0..1
 * @param {number} [squashY=1] - Vertical scale (flat reflections)
 */
export function drawGlow(k, x, y, radius, color, opacity, squashY = 1) {
  if (opacity <= 0) return
  k.drawSprite({
    sprite: GLOW_SPRITE,
    pos: k.vec2(x, y),
    anchor: 'center',
    width: radius * 2,
    height: radius * 2 * squashY,
    color,
    opacity,
    blend: k.BlendMode.Add
  })
}
