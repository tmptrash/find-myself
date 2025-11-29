import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as MovingPlatform from '../../../components/moving-platform.js'
import * as FlyingWords from '../components/flying-words.js'
import * as WordPile from '../components/word-pile.js'
import * as WordGrass from '../components/word-grass.js'

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
    const bladeWidth = Blades.getBladeWidth(k)
    const movingPlatformX = HERO_SPAWN_X + 110  // 110px from hero
    
    // Calculate positions for blade platforms
    const leftX = Math.min(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const rightX = Math.max(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    // First blade at 0.42 distance, second blade at 0.73 distance
    const blade1X = leftX + distance * 0.42
    const blade2X = leftX + distance * 0.73
    
    // Second moving platform before second blade (rightmost)
    const movingPlatform2X = blade2X - bladeWidth * 1.1  // Closer to second blade
    
    //
    // Define platform gaps
    //
    const platformGaps = [
      // First gap for first moving platform
      {
        x: movingPlatformX - bladeWidth / 2,
        width: bladeWidth
      },
      // Second gap for second moving platform
      {
        x: movingPlatform2X - bladeWidth / 2,
        width: bladeWidth
      }
    ]
    
    // Initialize level with heroes and gaps in platform
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.2',
      levelNumber: 3,  // Show 3 red blades in indicator
      nextLevel: 'level-word.3',
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "words are blades that never rust",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      platformGap: platformGaps
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
    // Create word grass on bottom platform (pass blade positions)
    //
    const wordGrass = WordGrass.create({
      k,
      customBounds: platformBounds,
      hero,
      bladePositions: [blade1X, blade2X],  // Two static blades on this level
      platformGaps  // Pass the gaps so grass doesn't spawn over them
    })
    
    //
    // Update word grass animation
    //
    k.onUpdate(() => {
      WordGrass.onUpdate(wordGrass)
    })
    
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    const bladeHeight = Blades.getBladeHeight(k)
    
    // Create first moving platform
    MovingPlatform.create({
      k,
      x: movingPlatformX,
      y: platformY,
      hero,
      color: CFG.visual.colors.platform,
      currentLevel: 'level-word.2',
      sfx: sound
    })
    
    // Create second moving platform (before second blade)
    MovingPlatform.create({
      k,
      x: movingPlatform2X,
      y: platformY,
      hero,
      color: CFG.visual.colors.platform,
      currentLevel: 'level-word.2',
      sfx: sound
    })
    
    // Create first blade
    const blades1 = Blades.create({
      k,
      x: blade1X,
      y: platformY - bladeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(blades1, "level-word.2"),
      sfx: sound
    })
    
    // Create second blade
    const blades2 = Blades.create({
      k,
      x: blade2X,
      y: platformY - bladeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(blades2, "level-word.2"),
      sfx: sound
    })
    
    // Start blade animations after 1 second
    Blades.startAnimation(blades1)
    Blades.startAnimation(blades2)
    
    // Eerie sound effects removed for cleaner audio experience
  })
}
