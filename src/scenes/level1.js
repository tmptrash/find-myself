import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Hero from '../components/hero.js'
import { HEROES } from '../components/hero.js'
import * as Spikes from '../components/spike.js'

export function sceneLevel1(k) {
  k.scene("level1", () => {
    // Initialize level with common setup
    const { sound } = initScene({
      k,
      backgroundColor: CFG.colors.level1.background,
      platformColor: CFG.colors.level1.platform
    })
    
    // Create anti-hero instance
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
      x: k.width() * CFG.levels.level1.heroSpawn.x / 100,
      y: k.height() * CFG.levels.level1.heroSpawn.y / 100,
      type: HEROES.HERO,
      sfx: sound,
      antiHero,
      onAnnihilation: () => k.go("level2")
    })
    
    // Add spike tag to hero for collision detection
    hero.character.use("player")
    
    // Create spikes in the middle of the level
    const centerX = k.width() / 2
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = 20  // From spikes.js SPIKE_HEIGHT constant
    
    Spikes.create({
      k,
      x: centerX,
      y: platformY - spikeHeight / 2,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => {
        // Restart level when hero hits spikes
        k.go("level1")
      }
    })
    
    // Spawn hero with assembly effect
    Hero.spawn(hero)
  })
}
