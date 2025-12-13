import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import { getColor } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Blades from '../components/blades.js'
import * as Hero from '../../../components/hero.js'
import * as FlyingWords from '../components/flying-words.js'
import * as WordPile from '../components/word-pile.js'
import { saveLastLevel } from '../../../utils/progress.js'

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
// Level 3 has narrower playable area (exactly hero jump height)
//
const PLATFORM_TOP_HEIGHT = 475      // Top platform height (44% of 1080)
const PLATFORM_BOTTOM_HEIGHT = 475   // Bottom platform height (44% of 1080)
const PLATFORM_SIDE_WIDTH = 192      // Side walls width (10% of 1920)

//
// Hero spawn positions (in pixels)
//
const HERO_SPAWN_X = 230    // 12% of 1920
const HERO_SPAWN_Y = 562    // 52% of 1080 (higher due to narrower pit)
const ANTIHERO_SPAWN_X = 1690  // 88% of 1920
const ANTIHERO_SPAWN_Y = 562   // 52% of 1080

export function sceneLevel3(k) {
  k.scene("level-word.3", () => {
    //
    // Save progress immediately when entering this level
    //
    saveLastLevel('level-word.3')
    // Initialize level with heroes (skip standard platforms)
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.3',
      levelNumber: 4,  // Show 4 red blades in indicator
      nextLevel: 'level-word.4',
      skipPlatforms: true,
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "words are blades that leave invisible wounds",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y
    })
    
    // Create custom platforms with pit in the middle
    const pitInfo = createCustomPlatforms(k, CFG.visual.colors.platform)
    
    //
    // Create flying words for atmosphere (constrained to narrow pit area between walls)
    //
    const flyingWords = FlyingWords.create({
      k,
      hero,
      currentLevel: 'level-word.3',
      onDeath: () => {
        //
        // No death messages in level 3 - just direct restart
        //
        import('../../../components/hero.js').then(Hero => {
          Hero.death(hero, () => k.go('level-word.3'))
        })
      },
      color: '#B0B0B0',  // Light gray for ghostly/ethereal flying words
      customBounds: {
        left: PLATFORM_SIDE_WIDTH + 20,
        right: CFG.visual.screen.width - PLATFORM_SIDE_WIDTH - 20,
        top: PLATFORM_TOP_HEIGHT,
        bottom: CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
      },
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio,
      killerLetterCount: 5  // Level 3: 5 killer letters
    })
    
    //
    // Create word pile for depth atmosphere effect
    //
    const wordPile = WordPile.create({
      k,
      customBounds: {
        left: PLATFORM_SIDE_WIDTH,
        right: CFG.visual.screen.width - PLATFORM_SIDE_WIDTH,
        top: PLATFORM_TOP_HEIGHT,
        bottom: CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
      }
    })
    
    //
    // Update flying words animation
    //
    k.onUpdate(() => {
      FlyingWords.onUpdate(flyingWords)
    })
    
    // Create bottom of the pit (platform at pit depth)
    const heroHeight = CFG.visual.screen.height * 0.08  // Approximate hero height (8% of screen)
    const pitDepth = heroHeight * 1.3  // Pit depth slightly more than hero height
    const pitBottomY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT + pitDepth
    
    // Create pit bottom platform
    k.add([
      k.rect(pitInfo.width, k.height() - pitBottomY),
      k.pos(pitInfo.centerX - pitInfo.width / 2, pitBottomY),
      k.area(),
      k.body({ isStatic: true }),
      getColor(k, CFG.visual.colors.platform),
      CFG.game.platformName
    ])
    
    // Create blades at the bottom of the pit (pointing up)
    const bladeHeight = Blades.getBladeHeight(k)
    const bladeWidth = Blades.getBladeWidth(k)
    const pitBlades = Blades.create({
      k,
      x: pitInfo.centerX,
      y: pitBottomY - bladeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(pitBlades, "level-word.3"),
      sfx: sound
    })
    pitBlades.blade.opacity = 1
    
    // Create 3 blades (left floor, center ceiling, right floor)
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    const floorBladeY = platformY - bladeHeight * 1.2  // Extend up from floor
    const ceilingBladeY = PLATFORM_TOP_HEIGHT + bladeHeight * 1.2  // Extend down from ceiling
    
    // Left blade (floor, left of pit, closer to pit) - starts hidden BELOW platform (bigger Y)
    const leftBladeX = pitInfo.centerX - pitInfo.width / 2 - bladeWidth * 2.5
    const hiddenY1 = platformY + bladeHeight * 2  // Hidden deep below platform
    const blades1 = Blades.create({
      k,
      x: leftBladeX,
      y: hiddenY1,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => {
        blades1.blade.opacity = 1
        Hero.death(hero, () => k.go("level-word.3"))
      },
      sfx: sound,
      disableAnimation: true,  // Disable vibration and glint for moving blades
      zIndex: -25  // Behind platforms (z=1), in front of word pile (z=-50 to -100)
    })
    blades1.blade.opacity = 1
    
    // Center blade (ceiling, over pit, pointing down) - starts hidden INSIDE platform (smaller Y)
    const hiddenY2 = PLATFORM_TOP_HEIGHT - bladeHeight * 2  // Hidden deep above platform
    const blades2 = Blades.create({
      k,
      x: pitInfo.centerX,
      y: hiddenY2,
      hero,
      orientation: Blades.ORIENTATIONS.CEILING,
      onHit: () => {
        blades2.blade.opacity = 1
        Hero.death(hero, () => k.go("level-word.3"))
      },
      sfx: sound,
      disableAnimation: true,  // Disable vibration and glint for moving blades
      zIndex: -25  // Behind platforms (z=1), in front of word pile (z=-50 to -100)
    })
    blades2.blade.opacity = 1
    
    // Right blade (floor, right of pit, closer to anti-hero but with jump space) - starts hidden BELOW platform (bigger Y)
    const rightBladeX = pitInfo.centerX + pitInfo.width / 2 + bladeWidth * 1.5
    const hiddenY3 = platformY + bladeHeight * 2  // Hidden deep below platform
    const blades3 = Blades.create({
      k,
      x: rightBladeX,
      y: hiddenY3,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => {
        blades3.blade.opacity = 1
        Hero.death(hero, () => k.go("level-word.3"))
      },
      sfx: sound,
      disableAnimation: true,  // Disable vibration and glint for moving blades
      zIndex: -25  // Behind platforms (z=1), in front of word pile (z=-50 to -100)
    })
    blades3.blade.opacity = 1
    
    // Scene instance with state
    const inst = {
      k,
      sound,
      soundTimer: k.rand(3, 6),
      // Blade animation state
      blades1,
      blades2,
      blades3,
      targetY1: hiddenY1,      // Hidden position (retracted)
      visibleY1: floorBladeY,  // Visible position (extended)
      targetY2: hiddenY2,      // Hidden position (retracted up)
      visibleY2: ceilingBladeY, // Visible position (extended down)
      targetY3: hiddenY3,      // Hidden position (retracted)
      visibleY3: floorBladeY,  // Visible position (extended)
      blade1State: 'waiting',
      blade2State: 'waiting',
      blade3State: 'waiting',
      animationTimer: 0,
      cycleTimer: 0,
      animationSpeed: 0.15,   // Seconds for extend/retract (slower blade movement)
      bladeDelay: 0.12,      // Seconds between blades (pause between blade1->blade2 and blade2->blade3)
      cycleDelay: 0.12       // Seconds after last blade before restart
    }
    
    // Start blade animation after 0.5 second
    k.wait(0.5, () => {
      inst.blade1State = 'extending'
      inst.animationTimer = 0
      sound && Sound.playBladeSound(sound)
    })
    
    // Setup blade animation (eerie sound effects removed)
    k.onUpdate(() => {
      updateBladesAnimation(inst)
    })
  })
}

/**
 * Update blades animation (cycle: extend, retract, repeat)
 * @param {Object} inst - Scene instance
 */
function updateBladesAnimation(inst) {
  const { k, blades1, blades2, blades3, targetY1, visibleY1, targetY2, visibleY2, targetY3, visibleY3, animationSpeed, sound } = inst
  
  inst.animationTimer += k.dt()
  inst.cycleTimer += k.dt()
  
  // SPIKE 1 STATE MACHINE (Left blades - first)
  if (inst.blade1State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades1.blade.pos.y = targetY1 + (visibleY1 - targetY1) * progress
    
    if (progress >= 1) {
      blades1.blade.pos.y = visibleY1
      inst.blade1State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.blade1State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades1.blade.pos.y = visibleY1 + (targetY1 - visibleY1) * progress
    
    if (progress >= 1) {
      blades1.blade.pos.y = targetY1
      inst.blade1State = 'waiting-for-blade3'
      inst.animationTimer = 0
    }
  } else if (inst.blade1State === 'waiting-for-blade3') {
    if (inst.animationTimer >= inst.bladeDelay) {
      inst.blade3State = 'extending'
      inst.blade1State = 'blade3-active'
      inst.animationTimer = 0
      sound && Sound.playBladeSound(sound)
    }
  }
  
  // SPIKE 2 STATE MACHINE (Center blades - third/last)
  if (inst.blade2State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades2.blade.pos.y = targetY2 + (visibleY2 - targetY2) * progress
    
    if (progress >= 1) {
      blades2.blade.pos.y = visibleY2
      inst.blade2State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.blade2State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades2.blade.pos.y = visibleY2 + (targetY2 - visibleY2) * progress
    
    if (progress >= 1) {
      blades2.blade.pos.y = targetY2
      inst.blade2State = 'cycle-complete'
      inst.blade1State = 'cycle-complete'
      inst.blade3State = 'cycle-complete'
      inst.animationTimer = 0
      inst.cycleTimer = 0
    }
  }
  
  // SPIKE 3 STATE MACHINE (Right blades - second)
  if (inst.blade3State === 'extending') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades3.blade.pos.y = targetY3 + (visibleY3 - targetY3) * progress
    
    if (progress >= 1) {
      blades3.blade.pos.y = visibleY3
      inst.blade3State = 'retracting'
      inst.animationTimer = 0
    }
  } else if (inst.blade3State === 'retracting') {
    const progress = Math.min(1, inst.animationTimer / animationSpeed)
    blades3.blade.pos.y = visibleY3 + (targetY3 - visibleY3) * progress
    
    if (progress >= 1) {
      blades3.blade.pos.y = targetY3
      inst.blade3State = 'waiting-for-blade2'
      inst.animationTimer = 0
    }
  } else if (inst.blade3State === 'waiting-for-blade2') {
    if (inst.animationTimer >= inst.bladeDelay) {
      inst.blade2State = 'extending'
      inst.blade3State = 'blade2-active'
      inst.animationTimer = 0
      sound && Sound.playBladeSound(sound)
    }
  }
  
  // RESTART CYCLE after delay
  if (inst.blade1State === 'cycle-complete' && inst.cycleTimer >= inst.cycleDelay) {
    inst.cycleTimer = 0
    inst.animationTimer = 0
    blades1.blade.pos.y = targetY1
    blades2.blade.pos.y = targetY2
    blades3.blade.pos.y = targetY3
    inst.blade1State = 'extending'
    inst.blade2State = 'waiting'
    inst.blade3State = 'waiting'
    
    sound && Sound.playBladeSound(sound)
  }
}

/**
 * Create custom platforms with a pit in the middle
 * @param {Object} k - Kaplay instance
 * @param {String} color - Platform color
 * @returns {Object} Pit information (centerX, width)
 */
function createCustomPlatforms(k, color) {
  // Calculate pit dimensions (same width as blades)
  const pitWidth = Blades.getBladeWidth(k)
  const centerX = CFG.visual.screen.width / 2
  const pitLeft = centerX - pitWidth / 2
  const pitRight = centerX + pitWidth / 2
  
  function createPlatform(x, y, width, height) {
    return k.add([
      k.rect(width, height),
      k.pos(x, y),
      k.area(),
      k.body({ isStatic: true }),
      getColor(k, color),
      CFG.game.platformName
    ])
  }
  
  // Top platform (full width)
  createPlatform(0, 0, CFG.visual.screen.width, PLATFORM_TOP_HEIGHT)
  
  // Bottom platform - LEFT side (before pit)
  createPlatform(0, CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT, pitLeft, PLATFORM_BOTTOM_HEIGHT)
  
  // Bottom platform - RIGHT side (after pit)
  createPlatform(pitRight, CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT, CFG.visual.screen.width - pitRight, PLATFORM_BOTTOM_HEIGHT)
  
  // Left wall
  createPlatform(0, PLATFORM_TOP_HEIGHT, PLATFORM_SIDE_WIDTH, CFG.visual.screen.height - PLATFORM_TOP_HEIGHT - PLATFORM_BOTTOM_HEIGHT)
  
  // Right wall
  createPlatform(CFG.visual.screen.width - PLATFORM_SIDE_WIDTH, PLATFORM_TOP_HEIGHT, PLATFORM_SIDE_WIDTH, CFG.visual.screen.height - PLATFORM_TOP_HEIGHT - PLATFORM_BOTTOM_HEIGHT)
  
  return { centerX, width: pitWidth }
}

