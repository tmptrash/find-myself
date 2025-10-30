import { CFG } from '../../../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Spikes from '../components/spikes.js'
import * as MovingPlatform from '../../../components/moving-platform.js'

export function sceneLevel1(k) {
  k.scene("level-1.1", () => {
    // Calculate moving platform position first (needed for gap calculation)
    const centerX = k.width() / 2
    const spikeWidth = Spikes.getSpikeWidth(k)
    const movingPlatformX = centerX + k.width() * 0.05  // Position platform left of center
    const spikeX = movingPlatformX + spikeWidth * 1.1  // Position spikes closer to platform
    
    // Initialize level with heroes and gap in platform
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-1.1',
      levelNumber: 2,  // Show 2 red blades in indicator
      nextLevel: 'level-1.2',
      showInstructions: false,
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-1.1'].spikes,
      subTitle: "sometimes words cut deeper than blades...",
      subTitleColor: CFG.colors['level-1.1'].background,
      platformGap: {
        x: movingPlatformX - spikeWidth / 2,  // Start gap before platform
        width: spikeWidth  // Gap width matches spike width
      }
    })
    
    // Create spikes in the middle of the level
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = Spikes.getSpikeHeight(k)  // Dynamic spike height based on screen resolution
    
    // Create moving platform right before spikes (at floor level)
    const movingPlatformY = platformY  // At the same level as bottom platform
    
    MovingPlatform.create({
      k,
      x: movingPlatformX,
      y: movingPlatformY,
      hero,
      color: CFG.colors['level-1.1'].platform,
      currentLevel: 'level-1.1',
      sfx: sound
    })
    
    const spikes = Spikes.create({
      k,
      x: spikeX,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      onHit: () => Spikes.handleCollision(spikes, "level-1.1"),
      sfx: sound
    })
    
    // Start spike animation after 2 seconds
    Spikes.startAnimation(spikes, 1)
    
    // Eerie sound effects removed for cleaner audio experience
  })
}
