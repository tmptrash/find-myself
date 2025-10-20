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
    
    // Create hero instance
    const hero = Hero.create({
      k,
      x: CFG.levels.level2.heroSpawn.x,
      y: CFG.levels.level2.heroSpawn.y,
      type: HEROES.HERO,
      sfx: sound
    })
    
    // Spawn hero with assembly effect
    Hero.spawn(hero)
  })
}
