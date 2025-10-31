import { CFG } from '../../../cfg.js'
import { initScene } from '../utils/scene.js'

/**
 * Level 0 scene - Introduction level
 * Simple empty room with no obstacles, just hero and anti-hero
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-1.0", () => {
    // Initialize level with heroes, no gaps or obstacles
    initScene({
      k,
      levelName: 'level-1.0',
      levelNumber: 1,  // Show 1 red blade in indicator
      nextLevel: 'level-1.1',
      showInstructions: true,
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-1.0'].spikes,
      subTitle: "some words are sharper than any blade...",
      subTitleColor: CFG.colors['level-1.0'].background,
    })
  })
}

