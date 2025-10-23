import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Hero from '../components/hero.js'
import { HEROES } from '../components/hero.js'

export function sceneLevel2(k) {
  k.scene("level2", () => {
    // Initialize level with common setup
    const { sound } = initScene({
      k,
      backgroundColor: CFG.colors.level1.background,
      platformColor: CFG.colors.level1.platform
    })
    
    // Create anti-hero instance (same position as level 1)
    const antiHero = Hero.create({
      k,
      x: k.width() * CFG.levels.level1.antiHeroSpawn.x / 100,
      y: k.height() * CFG.levels.level1.antiHeroSpawn.y / 100,
      type: 'antihero',
      sfx: sound
    })
    
    // Create hero instance with annihilation setup
    const hero = Hero.create({
      k,
      x: k.width() * CFG.levels.level2.heroSpawn.x / 100,
      y: k.height() * CFG.levels.level2.heroSpawn.y / 100,
      type: HEROES.HERO,
      sfx: sound,
      antiHero,
      onAnnihilation: () => {
        // TODO: Add next level or end screen
        k.go("menu")
      }
    })
    
    // Spawn hero with assembly effect
    Hero.spawn(hero)
  })
}
