import { CFG } from '../../../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as FlyingWords from '../components/flying-words.js'

export function sceneLevel1(k) {
  k.scene("level-word.1", () => {
    //
    // Calculate moving platform position first (needed for gap calculation)
    //
    const centerX = k.width() / 2
    const spikeWidth = Blades.getSpikeWidth(k)
    const movingPlatformX = centerX + k.width() * 0.05  // Position platform left of center
    const spikeX = movingPlatformX + spikeWidth * 1.1  // Position spikes closer to platform
    
    //
    // Initialize level with heroes and gap in platform
    //
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.1',
      levelNumber: 2,  // Show 2 red blades in indicator
      nextLevel: 'level-word.2',
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-word.1'].spikes,
      subTitle: "sometimes words cut deeper than blades...",
      subTitleColor: CFG.colors['level-word.1'].spikes,
      platformGap: {
        x: movingPlatformX - spikeWidth / 2,  // Start gap before platform
        width: spikeWidth  // Gap width matches spike width
      }
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
    
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    
    // Create spikes in the middle of the level
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = Blades.getSpikeHeight(k)  // Dynamic spike height based on screen resolution
    
    // Create moving platform right before spikes (at floor level)
    const movingPlatformY = platformY  // At the same level as bottom platform
    
    MovingPlatform.create({
      k,
      x: movingPlatformX,
      y: movingPlatformY,
      hero,
      color: CFG.colors['level-word.1'].platform,
      currentLevel: 'level-word.1',
      sfx: sound
    })
    
    const spikes = Blades.create({
      k,
      x: spikeX,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(spikes, "level-word.1"),
      sfx: sound
    })
    
    // Start spike animation after 2 seconds
    Blades.startAnimation(spikes, 1)
    
    // Eerie sound effects removed for cleaner audio experience
  })
}
