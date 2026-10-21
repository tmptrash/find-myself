import {
  bakeGlowHeroFrameStripBlocks,
  drawGlowHeroFramesStripHud,
  recomputeGlowHeroFramesStripLayout
} from '../sections/glow/utils/glow-hero-frames-strip.js'

//
// Dev full-page view — same strips as lesson-glow.0 HUD. Open:
// /?scene=dev-glow-hero-frames
//

/**
 * Registers the Glow hero run/jump frame sheet (dev only).
 * @param {Object} k - Kaplay instance
 */
export function sceneGlowHeroFramesPreview(k) {
  k.scene('dev-glow-hero-frames', () => {
    const blocks = bakeGlowHeroFrameStripBlocks(k)
    const stripInst = {
      k,
      blocks,
      levelHeroScale: 1,
      maxHeightPx: k.height() - 40
    }
    recomputeGlowHeroFramesStripLayout(stripInst)
    k.setBackground(k.rgb(10, 10, 10))
    k.onDraw(() => drawGlowHeroFramesStripHud(stripInst))
    k.onKeyPress('escape', () => k.go('menu'))
  })
}
