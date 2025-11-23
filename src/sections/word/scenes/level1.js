import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as FlyingWords from '../components/flying-words.js'
import * as WordPile from '../components/word-pile.js'

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
    // Calculate moving platform position and gap
    //
    const centerX = CFG.visual.screen.width / 2
    const bladeWidth = Blades.getBladeWidth(k)
    const movingPlatformX = centerX + CFG.visual.screen.width * 0.05  // Position platform left of center
    
    //
    // Initialize level with heroes and gap in platform (for trap)
    //
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.1',
      levelNumber: 2,  // Show 2 red blades in indicator
      nextLevel: 'level-word.2',
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "sometimes words cut deeper than blades...",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap: {
        x: movingPlatformX - bladeWidth / 2,  // Gap under platform
        width: bladeWidth  // Gap width matches blade width
      }
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
    // Create word pile for depth atmosphere effect
    //
    const wordPile = WordPile.create({
      k,
      customBounds: platformBounds
    })
    
    //
    // Update flying words animation
    //
    k.onUpdate(() => {
      FlyingWords.onUpdate(flyingWords)
    })
    
    //
    // Create moving platform (at floor level)
    //
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    
    MovingPlatform.create({
      k,
      x: movingPlatformX,
      y: platformY,
      hero,
      color: CFG.visual.colors.platform,
      currentLevel: 'level-word.1',
      sfx: sound
    })
  })
}
