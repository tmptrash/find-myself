import {
  applyGlowCanvasPixelate,
  applyGlowFilmGrainToCanvas,
  applyGlowLayerGradeToCanvas,
  GLOW_LAYER_GRADE
} from './glow-parallax-grain.js'
import { glowFilmGrainBlockPxForTier } from './glow-pixel-density.js'

//
// Depth-of-field blur baked into parallax (not removed — guides focus).
// Gameplay plane stays sharp; foreground heroes/HUD get a light pixel pass.
//
export const GLOW_FOCUS_BLUR_PX = {
  background: 5,
  midground: 2.25,
  nearground: 0.45,
  gameplay: 0,
  foreground: 0
}

export const GLOW_FOREGROUND_PIXELATE_CELL_PX = 2

/**
 * Gaussian blur radius for a parallax depth tier (px).
 * @param {'background'|'midground'|'nearground'|'gameplay'|'foreground'} tier
 * @returns {number}
 */
export function glowDepthBlurRadiusPx(tier) {
  return GLOW_FOCUS_BLUR_PX[tier] ?? 0
}

/**
 * Gameplay-plane decor bake — full sharpness, gameplay grain scale.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [seedOffset=0]
 */
export function applyGlowGameplaySharpBake(canvas, seedOffset = 0) {
  applyGlowLayerGradeToCanvas(canvas, {
    ...GLOW_LAYER_GRADE.decor,
    grainBlockSize: glowFilmGrainBlockPxForTier('gameplay')
  }, seedOffset)
}

/**
 * HUD / top-of-playfield labels — sharp vector text, no foreground pixelate.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [seedOffset=0]
 */
export function applyGlowHudSharpBake(canvas, seedOffset = 0) {
  applyGlowGameplaySharpBake(canvas, seedOffset)
}

/**
 * Foreground bake — grade, pixel blocks, then light focal grain.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [seedOffset=0]
 */
export function applyGlowForegroundFocusBake(canvas, seedOffset = 0) {
  applyGlowLayerGradeToCanvas(canvas, {
    ...GLOW_LAYER_GRADE.decor,
    grain: 0
  }, seedOffset)
  applyGlowCanvasPixelate(canvas, GLOW_FOREGROUND_PIXELATE_CELL_PX)
  applyGlowFilmGrainToCanvas(canvas, seedOffset, {
    strengthScale: GLOW_LAYER_GRADE.decor.grain ?? 0.12,
    blockSize: glowFilmGrainBlockPxForTier('focal')
  })
}
