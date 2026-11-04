import {
  applyForestLayerGradeToCanvas,
  FOREST_LAYER_GRADE
} from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'

//
// Depth-of-field blur baked into parallax (not removed — guides focus).
// Gameplay plane stays sharp; foreground heroes/HUD get a light pixel pass.
//
const FOREST_FOCUS_BLUR_PX = {
  background: 5.5,
  midground: 2.5,
  nearground: 0.5,
  gameplay: 0,
  foreground: 0
}


/**
 * Gaussian blur radius for a parallax depth tier (px).
 * @param {'background'|'midground'|'nearground'|'gameplay'|'foreground'} tier
 * @returns {number}
 */
export function forestDepthBlurRadiusPx(tier) {
  return FOREST_FOCUS_BLUR_PX[tier] ?? 0
}

/**
 * Gameplay-plane decor bake — full sharpness, gameplay grain scale.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [seedOffset=0]
 */
export function applyForestGameplaySharpBake(canvas, seedOffset = 0) {
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.decor,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, seedOffset)
}

/**
 * HUD / top-of-playfield labels — sharp vector text, no foreground pixelate.
 * @param {HTMLCanvasElement} canvas
 * @param {number} [seedOffset=0]
 */
export function applyForestHudSharpBake(canvas, seedOffset = 0) {
  applyForestGameplaySharpBake(canvas, seedOffset)
}

