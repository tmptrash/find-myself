import { CONFIG } from '../config.js'
import { initLevel } from '../components/scene.js'
import * as Hero from '../components/hero.js'

export function sceneLevel1(k) {
  k.scene("level1", () => {
    // Initialize level with common setup
    const { sound } = initLevel(k, {
      backgroundColor: CONFIG.colors.level1.background,
      platformColor: CONFIG.colors.level1.platform
    })
    
    // Get hero spawn position from config
    const { x: heroX, y: heroY } = CONFIG.levels.level1.heroSpawn
    
    // Create anti-hero instance
    const antiHero = Hero.create(k, {
      x: k.width() - 100,
      y: 801,
      type: 'antihero',
      controllable: false,
      sfx: sound
    })
    
    // Add collision tag to anti-hero
    antiHero.character.use("annihilationTarget")
    
    // Create hero instance with annihilation setup
    const hero = Hero.create(k, {
      x: heroX,
      y: heroY,
      type: 'hero',
      controllable: true,
      sfx: sound,
      antiHero,
      onAnnihilationComplete: () => k.go("level2")
    })
    
    // Spawn hero with assembly effect
    Hero.spawn(hero)
  })
}
