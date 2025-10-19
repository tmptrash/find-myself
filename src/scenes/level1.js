import { CONFIG } from '../config.js'
import { initLevel, spawnHero, spawnAntiHero } from '../components/scene.js'
import * as Hero from '../components/hero.js'

export function sceneLevel1(k) {
  k.scene("level1", () => {
    // Initialize level with common setup
    const { sound } = initLevel(k, {
      backgroundColor: CONFIG.colors.level1.background,
      platformColor: CONFIG.colors.level1.platform
    })
    
    // Spawn anti-hero in bottom-right corner (on platform)
    const antiHero = spawnAntiHero(k, sound, {
      x: k.width() - 100,
      y: 801  // Same as hero Y position (on bottom platform)
    })
    
    // Spawn hero with assembly effect
    let playerInst = null
    spawnHero(k, 'level1', sound, (heroInst) => {
      playerInst = heroInst
      
      // Setup annihilation effect
      Hero.setupAnnihilation(k, playerInst, antiHero, sound, () => {
        k.go("level2")
      })
    })
  })
}
