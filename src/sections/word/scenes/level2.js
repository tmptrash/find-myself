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

export function sceneLevel2(k) {
  k.scene("level-word.2", () => {
    // Calculate moving platform position first (110px from hero start position)
    const spikeWidth = Blades.getSpikeWidth(k)
    const movingPlatformX = HERO_SPAWN_X + 110  // 110px from hero
    
    // Calculate positions for spike platforms
    const leftX = Math.min(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const rightX = Math.max(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    // First spike at 0.42 distance, second spike at 0.73 distance
    const spike1X = leftX + distance * 0.42
    const spike2X = leftX + distance * 0.73
    
    // Second moving platform before second spike (rightmost)
    const movingPlatform2X = spike2X - spikeWidth * 1.1  // Closer to second spike
    
    // Initialize level with heroes and gaps in platform
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.2',
      levelNumber: 3,  // Show 3 red blades in indicator
      nextLevel: 'level-word.3',
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-word.2'].spikes,
      subTitle: "words are blades that never rust",
      subTitleColor: CFG.colors['level-word.2'].spikes,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap: [
        // First gap for first moving platform
        {
          x: movingPlatformX - spikeWidth / 2,
          width: spikeWidth
        },
        // Second gap for second moving platform
        {
          x: movingPlatform2X - spikeWidth / 2,
          width: spikeWidth
        }
      ]
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
    
    const platformY = CFG.screen.height - PLATFORM_BOTTOM_HEIGHT
    const spikeHeight = Blades.getSpikeHeight(k)
    
    // Create first moving platform
    MovingPlatform.create({
      k,
      x: movingPlatformX,
      y: platformY,
      hero,
      color: CFG.colors['level-word.2'].platform,
      currentLevel: 'level-word.2',
      sfx: sound
    })
    
    // Create second moving platform (before second spike)
    MovingPlatform.create({
      k,
      x: movingPlatform2X,
      y: platformY,
      hero,
      color: CFG.colors['level-word.2'].platform,
      currentLevel: 'level-word.2',
      sfx: sound
    })
    
    // Create first spike
    const spikes1 = Blades.create({
      k,
      x: spike1X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(spikes1, "level-word.2"),
      sfx: sound
    })
    
    // Create second spike
    const spikes2 = Blades.create({
      k,
      x: spike2X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(spikes2, "level-word.2"),
      sfx: sound
    })
    
    // Start spike animations after 1 second
    Blades.startAnimation(spikes1)
    Blades.startAnimation(spikes2)
    
    // Eerie sound effects removed for cleaner audio experience
  })
}
