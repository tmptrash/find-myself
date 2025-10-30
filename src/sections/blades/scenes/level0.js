import { CFG } from '../../../cfg.js'
import { initScene, updateEerieSound } from '../utils/scene.js'

/**
 * Level 0 scene - Introduction level
 * Simple empty room with no obstacles, just hero and anti-hero
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-1.0", () => {
    // Initialize level with heroes, no gaps or obstacles
    const { sound } = initScene({
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
    
    // Scene instance with state
    const inst = {
      k,
      sound,
      soundTimer: k.rand(3, 6)
    }
    
    // Setup eerie sound effect
    k.onUpdate(() => {
      updateEerieSound(inst, 2, 6)
    })
  })
}

