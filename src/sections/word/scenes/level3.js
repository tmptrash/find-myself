import { CFG } from '../cfg.js'
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
    // Calculate hero position shifted right by 3 blade widths
    const singleBladeWidth = Blades.getSingleBladeWidth(k)
    const customHeroX = HERO_SPAWN_X_BASE + singleBladeWidth * 3  // Shift right by 3 pyramids
    const leftX = Math.min(customHeroX, ANTIHERO_SPAWN_X)
    const rightX = Math.max(customHeroX, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    // Moving platforms at 1/3 and 2/3 distance
    const bladeWidth = Blades.getBladeWidth(k)
    const movingPlatform1X = leftX + distance / 3  // First platform at 1/3 distance
    const movingPlatform2X = leftX + distance * 2 / 3  // Second platform at 2/3 distance
    
    // Initialize level with heroes and TWO gaps in platform
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.3',
      levelNumber: 4,  // Show 4 red blades in indicator
      nextLevel: 'level-word.4',
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "when feelings grow dull, words become sharper",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: customHeroX,  // Custom hero position (shifted right by 3 pyramids)
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap: [
        // First gap for first moving platform (special jump-to-disable)
        {
          x: movingPlatform1X - bladeWidth / 2,
          width: bladeWidth
        },
        // Second gap for second moving platform (normal timer-based)
        {
          x: movingPlatform2X - bladeWidth / 2,
          width: bladeWidth
        }
      ]
    })
    
    //
    // Calculate platform boundaries for flying words
    //
    const platformBounds = {
      left: PLATFORM_SIDE_WIDTH,
      right: CFG.visual.screen.width - PLATFORM_SIDE_WIDTH,
      top: PLATFORM_TOP_HEIGHT + 20,
      bottom: CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT - 20
    }
    
    //
    // Create flying words for atmosphere
    //
    const flyingWords = FlyingWords.create({
      k,
      color: '#B0B0B0',  // Light gray for ghostly/ethereal flying words
      customBounds: platformBounds,
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio
    })
    
    //
    // Update flying words animation
    //
    k.onUpdate(() => {
      FlyingWords.onUpdate(flyingWords)
    })
    
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    const bladeHeight = Blades.getBladeHeight(k)
    
    // Create first special moving platform (jump-to-disable mode)
    MovingPlatform.create({
      k,
      x: movingPlatform1X,
      y: platformY,
      hero,
      color: CFG.visual.colors.platform,
      currentLevel: 'level-word.3',
      jumpToDisableBlades: true,  // Special mode: jump down to disable blades
      autoOpen: true,  // Auto-open on level start
      sfx: sound
    })
    
    // Create second normal moving platform (timer-based mode)
    MovingPlatform.create({
      k,
      x: movingPlatform2X,
      y: platformY,
      hero,
      color: CFG.visual.colors.platform,
      currentLevel: 'level-word.3',
      jumpToDisableBlades: false,  // Normal mode: timer-based (4 seconds)
      autoOpen: false,  // Triggered by hero proximity
      sfx: sound
    })
    
    // Create blade arm that extends from the left (positioned above bottom platform at hero's mid-body height)
    const bottomPlatformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT  // 720
    const heroHalfHeight = 37  // Half of hero's height
    const textY = bottomPlatformY - heroHalfHeight - 15    // Text at mid-body height above bottom platform, raised by 30px
    BladeArm.create({
      k,
      y: textY,
      hero,
      color: CFG.visual.colors.blades,
      sfx: sound,
      currentLevel: 'level-word.3'
    })
    
    // Eerie sound effects removed for cleaner audio experience
  })
}