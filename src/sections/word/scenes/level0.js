import { CFG } from '../../../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as FlyingWords from '../components/flying-words.js'

/**
 * Level 0 scene - Introduction level with blade obstacles
 * Three blade blocks: two static, one trap with appearing blades
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-word.0", () => {
    //
    // Initialize level with heroes
    //
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.0',
      levelNumber: 1,  // Show 1 red blade in indicator
      nextLevel: 'level-word.1',
      showInstructions: true,
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-word.0'].spikes,
      subTitle: "some words are sharper than any blade...",
      subTitleColor: CFG.colors['level-word.0'].spikes,
    })
    
    //
    // Create flying words for atmosphere
    //
    const flyingWords = FlyingWords.create({
      k,
      color: 'B0B0B0'  // Light gray for ghostly/ethereal flying words
    })
    
    //
    // Update flying words animation
    //
    k.onUpdate(() => {
      FlyingWords.onUpdate(flyingWords)
    })
    
    //
    // Calculate positions
    //
    const heroX = k.width() * CFG.levels['level-word.0'].heroSpawn.x / 100
    const antiHeroX = k.width() * CFG.levels['level-word.0'].antiHeroSpawn.x / 100
    const leftX = Math.min(heroX, antiHeroX)
    const rightX = Math.max(heroX, antiHeroX)
    const distance = rightX - leftX
    
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = Blades.getSpikeHeight(k)
    
    //
    // Three blade blocks at equal distances
    // Block 1: 0.20 distance (dangerous)
    // Block 2: 0.40 distance (dangerous)
    // Block 3: 0.70 distance (safe to pass - trap decoy)
    //
    const blade1X = leftX + distance * 0.20
    const blade2X = leftX + distance * 0.40
    const blade3X = leftX + distance * 0.70
    
    //
    // Create first static blade block (2 spikes)
    //
    const blades1 = Blades.create({
      k,
      x: blade1X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(blades1, "level-word.0"),
      sfx: sound,
      spikeCount: 2
    })
    Blades.show(blades1)  // Show permanently
    
    //
    // Create second static blade block (2 spikes)
    //
    const blades2 = Blades.create({
      k,
      x: blade2X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(blades2, "level-word.0"),
      sfx: sound,
      spikeCount: 2
    })
    Blades.show(blades2)  // Show permanently
    
    //
    // Create third blade block (trap - safe to pass)
    // This block is safe to pass through (no collision)
    //
    const blades3 = Blades.create({
      k,
      x: blade3X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: null,  // No collision - safe to pass
      sfx: sound,
      spikeCount: 2
    })
    Blades.show(blades3)  // Show permanently
    //
    // Set z-index higher than hero to show in front
    //
    blades3.spike.z = CFG.visual.zIndex.player + 1
    
    //
    // Trap blades that appear when hero gets close to blade3
    //
    const trapDistance = 20  // Distance to trigger trap (very close)
    const spikeWidth = Blades.getSpikeWidth(k)
    const gapWidth = 8  // Very small gap between blade3 and trap
    const trapBladeX = blade3X + spikeWidth / 2 + gapWidth + spikeWidth / 2  // Position with small gap
    
    let trapBlades = null
    let trapTriggered = false
    
    //
    // Check distance to trigger trap
    // Calculate distance to the right edge of blade3 (where trap will appear)
    //
    k.onUpdate(() => {
      if (trapTriggered) return
      
      const blade3RightEdge = blade3X + spikeWidth / 2
      const distanceToTrap = Math.abs(hero.character.pos.x - blade3RightEdge)
      
      if (distanceToTrap < trapDistance) {
        trapTriggered = true
        
        //
        // Create trap blades that appear suddenly
        //
        trapBlades = Blades.create({
          k,
          x: trapBladeX,
          y: platformY - spikeHeight / 2,
          hero,
          orientation: Blades.ORIENTATIONS.FLOOR,
          onHit: () => Blades.handleCollision(trapBlades, "level-word.0"),
          sfx: sound,
          spikeCount: 2
        })
        
        //
        // Start animation immediately
        //
        Blades.startAnimation(trapBlades)
      }
    })
  })
}

