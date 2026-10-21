import {
  bakeForestHeroFrameStripBlocks,
  drawForestHeroFramesStripHud,
  recomputeForestHeroFramesStripLayout
} from '../sections/forest/utils/forest-hero-frames-strip.js'

//
// Dev full-page view — same strips as lesson-forest.0 HUD. Open:
// /?scene=dev-forest-hero-frames
//

/**
 * Registers the Forest hero run/jump frame sheet (dev only).
 * @param {Object} k - Kaplay instance
 */
export function sceneForestHeroFramesPreview(k) {
  k.scene('dev-forest-hero-frames', () => {
    const blocks = bakeForestHeroFrameStripBlocks(k)
    const stripInst = {
      k,
      blocks,
      levelHeroScale: 1,
      maxHeightPx: k.height() - 40
    }
    recomputeForestHeroFramesStripLayout(stripInst)
    k.setBackground(k.rgb(10, 10, 10))
    k.onDraw(() => drawForestHeroFramesStripHud(stripInst))
    k.onKeyPress('escape', () => k.go('menu'))
  })
}
