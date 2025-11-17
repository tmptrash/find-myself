import { CFG } from '../../../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as BladeArm from '../components/blade-arm.js'
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
const HERO_SPAWN_X_BASE = 576   // 30% of 1920 (base position before shift)
const HERO_SPAWN_Y = 691        // 64% of 1080
const ANTIHERO_SPAWN_X = 1690   // 88% of 1920
const ANTIHERO_SPAWN_Y = 691    // 64% of 1080

export function sceneLevel3(k) {
  k.scene("level-word.3", () => {
    // Calculate hero position shifted right by 3 spike widths
    const singleSpikeWidth = Blades.getSingleSpikeWidth(k)
    const heroX = HERO_SPAWN_X_BASE + singleSpikeWidth * 3  // Shift right by 3 pyramids
    const leftX = Math.min(heroX, ANTIHERO_SPAWN_X)
    const rightX = Math.max(heroX, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    // First spike at 1/3 distance
    const spike1X = leftX + distance / 3
    
    // Second spike at 2/3 distance
    const spike2X = leftX + distance * 2 / 3
    
    // Moving platforms before each spike
    const spikeWidth = Blades.getSpikeWidth(k)
    const movingPlatform1X = spike1X - spikeWidth * 1.1  // Before first spike
    const movingPlatform2X = spike2X - spikeWidth * 1.1  // Before second spike
    
    // Initialize level with heroes and TWO gaps in platform
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.3',
      levelNumber: 4,  // Show 4 red blades in indicator
      nextLevel: 'level-word.4',
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-word.3'].spikes,
      subTitle: "when feelings grow dull, words become sharper",
      subTitleColor: CFG.colors['level-word.3'].spikes,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: heroX,  // Custom hero position (shifted right by 3 pyramids)
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap: [
        // First gap for first moving platform (special jump-to-disable)
        {
          x: movingPlatform1X - spikeWidth / 2,
          width: spikeWidth
        },
        // Second gap for second moving platform (normal timer-based)
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
    
    // Create first special moving platform (jump-to-disable mode)
    MovingPlatform.create({
      k,
      x: movingPlatform1X,
      y: platformY,
      hero,
      color: CFG.colors['level-word.3'].platform,
      currentLevel: 'level-word.3',
      jumpToDisableSpikes: true,  // Special mode: jump down to disable spikes
      autoOpen: true,  // Auto-open on level start
      sfx: sound
    })
    
    // Create second normal moving platform (timer-based mode)
    MovingPlatform.create({
      k,
      x: movingPlatform2X,
      y: platformY,
      hero,
      color: CFG.colors['level-word.3'].platform,
      currentLevel: 'level-word.3',
      jumpToDisableSpikes: false,  // Normal mode: timer-based (4 seconds)
      autoOpen: false,  // Triggered by hero proximity
      sfx: sound
    })
    
    // Create first spike (static, appears once)
    const spikes1 = Blades.create({
      k,
      x: spike1X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(spikes1, "level-word.3"),
      sfx: sound
    })
    
    // Create second spike (static, appears once)
    const spikes2 = Blades.create({
      k,
      x: spike2X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(spikes2, "level-word.3"),
      sfx: sound
    })
    
    // Start spike animations (appear once like in level 1)
    Blades.startAnimation(spikes1, 1)
    Blades.startAnimation(spikes2, 1)
    
    // Create blade arm that extends from the left (positioned at hero's height)
    BladeArm.create({
      k,
      y: heroY,
      hero,
      color: CFG.colors['level-word.3'].spikes,
      sfx: sound,
      currentLevel: 'level-word.3'
    })
    
    // Eerie sound effects removed for cleaner audio experience
  })
}