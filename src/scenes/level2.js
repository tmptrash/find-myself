import { CONFIG } from '../config.js'
import { initLevel, spawnHero } from '../components/scene.js'

export function sceneLevel2(k) {
  k.scene("level2", () => {
    // Initialize level with common setup
    const { sound } = initLevel(k, {
      backgroundColor: CONFIG.colors.level1.background,
      platformColor: CONFIG.colors.level1.platform
    })
    
    // Spawn hero with assembly effect
    spawnHero(k, 'level2', sound)
  })
}
