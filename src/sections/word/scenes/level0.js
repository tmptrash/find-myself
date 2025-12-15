import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as Hero from '../../../components/hero.js'
import * as FlyingWords from '../components/flying-words.js'
import * as WordPile from '../components/word-pile.js'
import * as WordGrass from '../components/word-grass.js'
import { getProgress, saveLastLevel } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'

//
// Death messages (shown randomly on death)
//
const DEATH_MESSAGES = [
  "Cut again.",
  "Words hurt. Remember?",
  "Too sharp for you?",
  "It stings, doesn't it?",
  "Still bleeding?",
  "You let it cut you.",
  "That one went deep."
]

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
const INSTRUCTIONS_INITIAL_DELAY = 1.0  // Delay before instructions appear
const INSTRUCTIONS_FADE_IN_DURATION = 0.8
const INSTRUCTIONS_HOLD_DURATION = 4.0
const INSTRUCTIONS_FADE_OUT_DURATION = 0.8

//
// Flag to track if intro was shown in current session (resets only on page reload)
//
let introShownInSession = false

//
// Flag to track if intro animation is complete (resets only on page reload)
//
let introAnimationComplete = false

//
// Flag to track if instructions animation is complete (resets only on page reload)
//
let instructionsAnimationComplete = false

/**
 * Shows a random death message and then restarts the level
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} bladesInst - Blades instance that was hit
 */
function showDeathMessage(k, hero, bladesInst) {
  //
  // Select random message
  //
  const message = DEATH_MESSAGES[Math.floor(Math.random() * DEATH_MESSAGES.length)]
  
  //
  // Calculate position (below bottom platform, centered)
  //
  const centerX = CFG.visual.screen.width / 2
  const messageY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT + 150
  
  //
  // Create message text
  //
  const messageText = k.add([
    k.text(message, {
      size: 28,
      align: "center",
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX, messageY),
    k.anchor("center"),
    k.color(107, 142, 159),  // Blade color (steel blue)
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 10)
  ])
  
  //
  // Animation state
  //
  const inst = {
    k,
    messageText,
    timer: 0,
    phase: 'fade_in',
    skipRequested: false
  }
  
  //
  // Listen for skip inputs (space, enter, mouse click)
  //
  const skipHandlers = []
  
  const requestSkip = () => {
    inst.skipRequested = true
  }
  
  skipHandlers.push(k.onKeyPress("space", requestSkip))
  skipHandlers.push(k.onKeyPress("enter", requestSkip))
  skipHandlers.push(k.onClick(requestSkip))
  
  //
  // Show blades and trigger death animation
  //
  if (bladesInst) {
    bladesInst.wasShownOnDeath = true  // Stop glint animation on death
    Blades.show(bladesInst)
  }
  Hero.death(hero, () => {
    // This callback will be called after message sequence completes
  })
  
  //
  // Update animation
  //
  const updateInterval = k.onUpdate(() => {
    inst.timer += k.dt()
    
    //
    // Handle skip request
    //
    if (inst.skipRequested) {
      //
      // Clean up immediately
      //
      updateInterval.cancel()
      skipHandlers.forEach(h => h.cancel())
      k.destroy(messageText)
      //
      // Restart level
      //
      k.go("level-word.0")
      return
    }
    
    if (inst.phase === 'fade_in') {
      //
      // Fade in message
      //
      const progress = Math.min(1, inst.timer / CFG.visual.deathMessage.fadeDuration)
      messageText.opacity = progress
      
      if (progress >= 1) {
        inst.phase = 'hold'
        inst.timer = 0
      }
    } else if (inst.phase === 'hold') {
      //
      // Hold message
      //
      if (inst.timer >= CFG.visual.deathMessage.duration) {
        inst.phase = 'fade_out'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_out') {
      //
      // Fade out message
      //
      const progress = Math.min(1, inst.timer / CFG.visual.deathMessage.fadeDuration)
      messageText.opacity = 1 - progress
      
      if (progress >= 1) {
        //
        // Clean up and restart level
        //
        updateInterval.cancel()
        skipHandlers.forEach(h => h.cancel())
        k.destroy(messageText)
        k.go("level-word.0")
      }
    }
  })
}

/**
 * Level 0 scene - Introduction level with blade obstacles
 * Three blade blocks: two static, one trap with appearing blades
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-word.0", () => {
    //
    // Save progress immediately when entering this level
    //
    saveLastLevel('level-word.0')
    //
    // Initialize level with heroes
    //
    const progress = getProgress()
    const isFirstRun = !progress.word
    
    //
    // Show intro only if:
    // 1. This is first run (section not completed)
    // 2. Intro wasn't shown yet in this session
    //
    const shouldShowIntro = isFirstRun && !introShownInSession
    
    const { sound, hero } = initScene({
      k,
      levelName: 'level-word.0',
      levelNumber: 1,  // Show 1 red blade in indicator
      nextLevel: 'level-word.1',
      levelTitle: "words like blades",
      levelTitleColor: CFG.visual.colors.blades,
      subTitle: "some words are sharper than any blade...",
      subTitleColor: CFG.visual.colors.blades,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y
    })
    
    //
    // Show intro text on first run only (once per session)
    //
    if (shouldShowIntro) {
      introShownInSession = true  // Mark as shown
      //
      // Always show intro sequence until fully complete
      //
      if (!instructionsAnimationComplete) {
        showIntroSequence(k)
      }
    } else {
      //
      // Show only instructions without intro text (always until complete)
      //
      if (!instructionsAnimationComplete) {
        showInstructions(k)
      }
    }
    
    //
    // Calculate platform boundaries for flying words
    //
    const platformBounds = {
      left: PLATFORM_SIDE_WIDTH,
      right: CFG.visual.screen.width - PLATFORM_SIDE_WIDTH,
      top: PLATFORM_TOP_HEIGHT,
      bottom: CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    }
    
    //
    // Create word pile for depth atmosphere effect
    // Multiple layers of static words at different depths creating "word dump" feeling
    //
    const wordPile = WordPile.create({
      k,
      customBounds: platformBounds
    })
    
    //
    // Create flying words for atmosphere
    //
    const flyingWords = FlyingWords.create({
      k,
      hero,
      currentLevel: 'level-word.0',
      onDeath: () => showDeathMessage(k, hero, null),  // Use showDeathMessage for killer letter deaths
      color: '#B0B0B0',  // Light gray for ghostly/ethereal flying words
      customBounds: platformBounds,
      letterToWordRatio: CFG.visual.flyingWords.letterToWordRatio,
      killerLetterCount: 1  // Level 0: 1 killer letter
    })
    
    //
    // Update flying words animation
    //
    k.onUpdate(() => {
      FlyingWords.onUpdate(flyingWords)
    })
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ k })
    //
    // Update FPS counter
    //
    k.onUpdate(() => {
      FpsCounter.onUpdate(fpsCounter)
    })
    
    //
    // Calculate positions
    //
    const leftX = Math.min(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const rightX = Math.max(HERO_SPAWN_X, ANTIHERO_SPAWN_X)
    const distance = rightX - leftX
    
    const platformY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT
    const bladeHeight = Blades.getBladeHeight(k)
    
    //
    // Three blade blocks at equal distances
    // Block 1: 0.20 distance (dangerous) - 2 letters A
    // Block 2: 0.40 distance (dangerous) - 2 letters A
    // Block 3: 0.70 distance (safe to pass - trap decoy) - 2 letters A
    //
    const blade1X = leftX + distance * 0.20
    const blade2X = leftX + distance * 0.40
    const blade3X = leftX + distance * 0.70
    
    //
    // Create first static blade block (2 blades)
    //
    const blades1 = Blades.create({
      k,
      x: blade1X,
      y: platformY - 8,  // Lower by 2px
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, blades1),
      sfx: sound,
      bladeCount: 2,
      zIndex: CFG.visual.zIndex.platforms - 0.5  // Behind platform
    })
    Blades.show(blades1)  // Show permanently
    
    //
    // Create second static blade block (2 blades)
    //
    const blades2 = Blades.create({
      k,
      x: blade2X,
      y: platformY - 8,  // Lower by 2px
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => showDeathMessage(k, hero, blades2),
      sfx: sound,
      bladeCount: 2,
      zIndex: CFG.visual.zIndex.platforms - 0.5  // Behind platform
    })
    Blades.show(blades2)  // Show permanently
    
    //
    // Create third blade block (trap - safe to pass)
    // This block is safe to pass through (no collision)
    //
    const blades3 = Blades.create({
      k,
      x: blade3X,
      y: platformY - 8,  // Lower by 2px
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: null,  // No collision - safe to pass
      sfx: sound,
      bladeCount: 2,
      zIndex: CFG.visual.zIndex.platforms - 0.5  // Behind platform
    })
    Blades.show(blades3)  // Show permanently
    //
    // Set z-index higher than hero to show in front
    //
    blades3.blade.z = CFG.visual.zIndex.player + 1
    
    //
    // Create word grass and trees for additional atmosphere
    // Pass blade positions so grass doesn't spawn near them
    //
    const bladePositions = [blade1X, blade2X, blade3X]
    const wordGrass = WordGrass.create({
      k,
      customBounds: platformBounds,
      hero,
      bladePositions,
      movingPlatformPositions: []  // No moving platforms on level 0
    })
    
    //
    // Update word grass animation
    //
    k.onUpdate(() => {
      WordGrass.onUpdate(wordGrass)
    })
    
    //
    // Trap blades that appear when hero gets close to blade3
    //
    const trapDistance = 20  // Distance to trigger trap (very close)
    const bladeWidth = Blades.getBladeWidth(k)
    const gapWidth = -4  // Overlap with blade3
    const trapBladeX = blade3X + bladeWidth / 2 + gapWidth + bladeWidth / 2  // Position overlapping
    
    let trapBlades = null
    let trapTriggered = false
    
    //
    // Check distance to trigger trap
    // Calculate distance to the right edge of blade3 (where trap will appear)
    //
    k.onUpdate(() => {
      if (trapTriggered) return
      
      const blade3RightEdge = blade3X + bladeWidth / 2
      const distanceToTrap = Math.abs(hero.character.pos.x - blade3RightEdge)
      
      if (distanceToTrap < trapDistance) {
        trapTriggered = true
        
        //
        // Create trap blades that appear suddenly
        //
        trapBlades = Blades.create({
          k,
          x: trapBladeX,
          y: platformY - 8,  // Lower by 2px
          hero,
          orientation: Blades.ORIENTATIONS.FLOOR,
          onHit: () => showDeathMessage(k, hero, trapBlades),
          sfx: sound,
          bladeCount: 2,
          zIndex: CFG.visual.zIndex.platforms - 0.5  // Behind platform
        })
        
        //
        // Start animation immediately
        //
        Blades.startAnimation(trapBlades)
      }
    })
  })
}

/**
 * Show intro sequence with text animations above game area (or just instructions if intro already complete)
 * @param {Object} k - Kaplay instance
 */
function showIntroSequence(k) {
  //
  // Skip intro text, show only instructions immediately
  //
  introAnimationComplete = true
  showInstructions(k)
}

/**
 * Creates instructions text object with manual black outline
 * @param {Object} k - Kaplay instance
 * @param {number} centerX - Center X position
 * @param {number} textY - Text Y position
 * @returns {Object} Instructions text object with outline texts array
 */
function createInstructionsText(k, centerX, textY) {
  const instructionsContent = "← → - move,   ↑ Space - jump,   ESC - menu"
  const OUTLINE_OFFSET = 2
  //
  // Create 8 outline texts (black)
  //
  const outlineOffsets = [
    [-OUTLINE_OFFSET, 0], [OUTLINE_OFFSET, 0],
    [0, -OUTLINE_OFFSET], [0, OUTLINE_OFFSET],
    [-OUTLINE_OFFSET, -OUTLINE_OFFSET], [OUTLINE_OFFSET, -OUTLINE_OFFSET],
    [-OUTLINE_OFFSET, OUTLINE_OFFSET], [OUTLINE_OFFSET, OUTLINE_OFFSET]
  ]
  
  const outlineTexts = outlineOffsets.map(([dx, dy]) => {
    return k.add([
      k.text(instructionsContent, {
        size: 24,
        align: "center",
        font: CFG.visual.fonts.regularFull.replace(/'/g, '')
      }),
      k.pos(centerX + dx, textY + dy),
      k.anchor("center"),
      k.color(0, 0, 0),  // Black outline
      k.opacity(0),
      k.z(CFG.visual.zIndex.ui + 9)
    ])
  })
  //
  // Create main text (light gray)
  //
  const mainText = k.add([
    k.text(instructionsContent, {
      size: 24,
      align: "center",
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX, textY),
    k.anchor("center"),
    k.color(204, 204, 204),  // Light gray
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 10)
  ])
  
  return { mainText, outlineTexts }
}

/**
 * Shows only instructions without intro text
 * @param {Object} k - Kaplay instance
 */
function showInstructions(k) {
  const centerX = CFG.visual.screen.width / 2
  const textY = PLATFORM_TOP_HEIGHT / 2
  
  //
  // Create instructions text with outline
  //
  const { mainText, outlineTexts } = createInstructionsText(k, centerX, textY)
  
  //
  // Animation state
  //
  const inst = {
    k,
    mainText,
    outlineTexts,
    timer: 0,
    phase: 'initial_delay'
  }
  
  //
  // Update animation
  //
  const updateInterval = k.onUpdate(() => {
    inst.timer += k.dt()
    
    if (inst.phase === 'initial_delay') {
      //
      // Wait for initial delay
      //
      if (inst.timer >= INSTRUCTIONS_INITIAL_DELAY) {
        inst.phase = 'fade_in'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_in') {
      //
      // Fade in instructions text and outline
      //
      const progress = Math.min(1, inst.timer / INSTRUCTIONS_FADE_IN_DURATION)
      mainText.opacity = progress
      outlineTexts.forEach(text => {
        text.opacity = progress
      })
      
      if (progress >= 1) {
        inst.phase = 'hold'
        inst.timer = 0
      }
    } else if (inst.phase === 'hold') {
      //
      // Hold instructions text
      //
      if (inst.timer >= INSTRUCTIONS_HOLD_DURATION) {
        inst.phase = 'fade_out'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_out') {
      //
      // Fade out instructions text and outline
      //
      const progress = Math.min(1, inst.timer / INSTRUCTIONS_FADE_OUT_DURATION)
      mainText.opacity = 1 - progress
      outlineTexts.forEach(text => {
        text.opacity = 1 - progress
      })
      
      if (progress >= 1) {
        //
        // Clean up and finish
        //
        instructionsAnimationComplete = true
        updateInterval.cancel()
        k.destroy(mainText)
        outlineTexts.forEach(text => k.destroy(text))
      }
    }
  })
}


