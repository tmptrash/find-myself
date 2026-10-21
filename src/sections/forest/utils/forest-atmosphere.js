import { FOREST_PAL, forestRgb } from './forest-palette.js'
//
// Lightweight depth, contact shadows and underground falloff for the forest
// forest — palette-only colours, no new sprites or geometry.
//
const UG_DETAIL_FADE_DEPTH = 0.55
const UG_LARGE_FEATURE_FADE_DEPTH = 0.3
const UG_DEPTH_VIGNETTE_START_FRAC = 0.22
const UG_DEPTH_VIGNETTE_MID_FRAC = 0.58
const UG_DEPTH_VIGNETTE_MID_ALPHA = 0.2
const UG_DEPTH_VIGNETTE_END_ALPHA = 0.78
const CONTACT_SHADOW_CORE_ALPHA = 0.4
const CONTACT_SHADOW_MID_ALPHA = 0.17
const CONTACT_SHADOW_SINK_FRAC = 0.14

/**
 * RGB triplet for soft ground contact shadows (cool forest shadow swatch).
 * @returns {{ r: number, g: number, b: number }}
 */
export function forestContactShadowRgb() {
  return forestRgb(FOREST_PAL.forestShadow)
}

/**
 * Alpha multiplier for small buried decor (pebbles, grit, worms) by depth.
 * @param {number} y - World Y of the feature
 * @param {number} surfaceY - Top of the earth band (walk line)
 * @param {number} bandH - Earth band height
 * @returns {number}
 */
export function forestUndergroundSmallDetailAlpha(y, surfaceY, bandH) {
  const t = depthT(y, surfaceY, bandH)
  return 1 - t * UG_DETAIL_FADE_DEPTH
}

/**
 * Alpha multiplier for large underground masses (boulder piles / main roots).
 * @param {number} y - World Y of the feature centre
 * @param {number} surfaceY - Top of the earth band
 * @param {number} bandH - Earth band height
 * @returns {number}
 */
export function forestUndergroundLargeFeatureAlpha(y, surfaceY, bandH) {
  const t = depthT(y, surfaceY, bandH)
  return 1 - t * UG_LARGE_FEATURE_FADE_DEPTH
}

/**
 * Soft elliptical contact shadow on the ground line (paint before the object).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx - Centre X on the ground
 * @param {number} groundY - Ground contact Y
 * @param {number} rx - Shadow half-width
 * @param {number} ry - Shadow half-height
 * @param {{ r: number, g: number, b: number }} shadowRgb
 * @param {number} [strength=1] - Scales opacity
 */
export function paintForestContactShadow(ctx, cx, groundY, rx, ry, shadowRgb, strength = 1) {
  const { r, g, b } = shadowRgb
  const coreA = CONTACT_SHADOW_CORE_ALPHA * strength
  const midA = CONTACT_SHADOW_MID_ALPHA * strength
  const grad = ctx.createRadialGradient(cx, groundY, 0, cx, groundY, rx)
  grad.addColorStop(0, `rgba(${r},${g},${b},${coreA})`)
  grad.addColorStop(0.55, `rgba(${r},${g},${b},${midA})`)
  grad.addColorStop(1, `rgba(${r},${g},${b},0)`)
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.ellipse(cx, groundY + ry * CONTACT_SHADOW_SINK_FRAC, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
}

/**
 * Vertical darkening over the baked earth band so the bottom sinks into the
 * deepest warm earth tone (not the green void, which read as an uplight).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0 - Left X
 * @param {number} y0 - Top of band (FLOOR_Y)
 * @param {number} width - Band width
 * @param {number} height - CAVE_BAND_H
 */
export function paintUndergroundDepthVignette(ctx, x0, y0, width, height) {
  const voidRgb = forestRgb('groundDeep')
  const yStart = y0 + height * UG_DEPTH_VIGNETTE_START_FRAC
  const yEnd = y0 + height
  const grad = ctx.createLinearGradient(0, yStart, 0, yEnd)
  grad.addColorStop(0, 'rgba(0,0,0,0)')
  grad.addColorStop(UG_DEPTH_VIGNETTE_MID_FRAC, `rgba(${voidRgb.r},${voidRgb.g},${voidRgb.b},${UG_DEPTH_VIGNETTE_MID_ALPHA})`)
  grad.addColorStop(1, `rgba(${voidRgb.r},${voidRgb.g},${voidRgb.b},${UG_DEPTH_VIGNETTE_END_ALPHA})`)
  ctx.fillStyle = grad
  ctx.fillRect(x0, y0, width, height)
}

function depthT(y, surfaceY, bandH) {
  if (bandH <= 0) return 0
  return Math.max(0, Math.min(1, (y - surfaceY) / bandH))
}
