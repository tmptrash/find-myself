import { CONFIG } from '../config.js'
import { initScene } from '../utils/scene.js'
import * as Hero from '../components/hero.js'
import { HEROES } from '../components/hero.js'

export function sceneLevel1(k) {
  k.scene("level1", () => {
    // Initialize level with common setup
    const { sound } = initScene({
      k,
      backgroundColor: CONFIG.colors.level1.background,
      platformColor: CONFIG.colors.level1.platform
    })
    
    // Create anti-hero instance
    const antiHero = Hero.create({
      k,
      x: CONFIG.levels.level1.antiHeroSpawn.x,
      y: CONFIG.levels.level1.antiHeroSpawn.y,
      type: 'antihero',
      sfx: sound
    })
    
    // Add collision tag to anti-hero
    antiHero.character.use("annihilation")
    
    // Create hero instance with annihilation setup
    const hero = Hero.create({
      k,
      x: CONFIG.levels.level1.heroSpawn.x,
      y: CONFIG.levels.level1.heroSpawn.y,
      type: HEROES.HERO,
      sfx: sound,
      antiHero,
      onAnnihilation: () => k.go("level2")
    })
    
    // Spawn hero with assembly effect
    Hero.spawn(hero)
  })
}
