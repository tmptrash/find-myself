import { CONFIG } from '../config.js'
import { initLevel } from '../components/scene.js'
import * as Hero from '../components/hero.js'

export function sceneLevel2(k) {
  k.scene("level2", () => {
    // Initialize level with common setup
    const { sound } = initLevel(k, {
      backgroundColor: CONFIG.colors.level1.background,
      platformColor: CONFIG.colors.level1.platform
    })
    
    // Get hero spawn position from config
    const { x, y } = CONFIG.levels.level2.heroSpawn
    
    // Create hero instance
    const hero = Hero.create({
      k,
      x,
      y,
      type: 'hero',
      controllable: true,
      sfx: sound
    })
    
    // Spawn hero with assembly effect
    Hero.spawn(hero)
  })
}
