import { CFG } from '../../../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as FlyingWords from '../components/flying-words.js'

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 360      // Top platform height (33.3% of 1080)
const PLATFORM_BOTTOM_HEIGHT = 360   // Bottom platform height (33.3% of 1080)
const PLATFORM_SIDE_WIDTH = 192      // Side walls width (10% of 1920)

//
// Hero spawn positions (in pixels)
//
const HERO_SPAWN_X = 230    // 12% of 1920
const HERO_SPAWN_Y = 691    // 64% of 1080
const ANTIHERO_SPAWN_X = 1690  // 88% of 1920
const ANTIHERO_SPAWN_Y = 691   // 64% of 1080

export function sceneLevel1(k) {
  k.scene("level-word.1", () => {
    //
    // Calculate moving platform position first (needed for gap calculation)
    //
    const centerX = CFG.screen.width / 2
    const spikeWidth = Blades.getSpikeWidth(k)
    const movingPlatformX = centerX + CFG.screen.width * 0.05  // Position platform left of center
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
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap: {
        x: movingPlatformX - spikeWidth / 2,  // Start gap before platform
        width: spikeWidth  // Gap width matches spike width
      }
    })
    
    //
    // Calculate platform boundaries for flying words
    //
    const platformBounds = {
      left: PLATFORM_SIDE_WIDTH,
      right: CFG.screen.width - PLATFORM_SIDE_WIDTH,
      top: PLATFORM_TOP_HEIGHT + 20,
      bottom: CFG.screen.height - PLATFORM_BOTTOM_HEIGHT - 20
    }
    
    //
    // Create flying words for atmosphere
    //
    const flyingWords = FlyingWords.create({
      k,
      color: 'B0B0B0',  // Light gray for ghostly/ethereal flying words
      customBounds: platformBounds
    })
    
    //
    // Update flying words animation
    //
    k.onUpdate(() => {
      FlyingWords.onUpdate(flyingWords)
    })
    
    // Create spikes in the middle of the level
    const platformY = CFG.screen.height - PLATFORM_BOTTOM_HEIGHT
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
