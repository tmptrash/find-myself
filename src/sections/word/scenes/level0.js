import { CFG } from '../../../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Blades from '../components/blades.js'
import * as FlyingWords from '../components/flying-words.js'
import { getColor } from '../../../utils/helper.js'
import { getProgress } from '../../../utils/progress.js'

const INTRO_TEXT = "find yourself to know who you are"
const INTRO_INITIAL_DELAY = 2.0  // Delay before intro starts
const INTRO_FADE_IN_DURATION = 1.0
const INTRO_HOLD_DURATION = 3.0
const INTRO_FADE_OUT_DURATION = 1.0
const INSTRUCTIONS_INITIAL_DELAY = 1.0  // Delay before instructions (without intro)
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
 * Level 0 scene - Introduction level with blade obstacles
 * Three blade blocks: two static, one trap with appearing blades
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-word.0", () => {
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
    
    const { sound, hero, antiHero } = initScene({
      k,
      levelName: 'level-word.0',
      levelNumber: 1,  // Show 1 red blade in indicator
      nextLevel: 'level-word.1',
      levelTitle: "words like blades",
      levelTitleColor: CFG.colors['level-word.0'].spikes,
      subTitle: "some words are sharper than any blade...",
      subTitleColor: CFG.colors['level-word.0'].spikes,
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
    
    //
    // Calculate positions
    //
    const heroX = k.width() * CFG.levels['level-word.0'].heroSpawn.x / 100
    const antiHeroX = k.width() * CFG.levels['level-word.0'].antiHeroSpawn.x / 100
    const leftX = Math.min(heroX, antiHeroX)
    const rightX = Math.max(heroX, antiHeroX)
    const distance = rightX - leftX
    
    const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
    const platformY = k.height() - bottomPlatformHeight
    const spikeHeight = Blades.getSpikeHeight(k)
    
    //
    // Three blade blocks at equal distances
    // Block 1: 0.20 distance (dangerous)
    // Block 2: 0.40 distance (dangerous)
    // Block 3: 0.70 distance (safe to pass - trap decoy)
    //
    const blade1X = leftX + distance * 0.20
    const blade2X = leftX + distance * 0.40
    const blade3X = leftX + distance * 0.70
    
    //
    // Create first static blade block (2 spikes)
    //
    const blades1 = Blades.create({
      k,
      x: blade1X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(blades1, "level-word.0"),
      sfx: sound,
      spikeCount: 2
    })
    Blades.show(blades1)  // Show permanently
    
    //
    // Create second static blade block (2 spikes)
    //
    const blades2 = Blades.create({
      k,
      x: blade2X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: () => Blades.handleCollision(blades2, "level-word.0"),
      sfx: sound,
      spikeCount: 2
    })
    Blades.show(blades2)  // Show permanently
    
    //
    // Create third blade block (trap - safe to pass)
    // This block is safe to pass through (no collision)
    //
    const blades3 = Blades.create({
      k,
      x: blade3X,
      y: platformY - spikeHeight / 2,
      hero,
      orientation: Blades.ORIENTATIONS.FLOOR,
      onHit: null,  // No collision - safe to pass
      sfx: sound,
      spikeCount: 2
    })
    Blades.show(blades3)  // Show permanently
    //
    // Set z-index higher than hero to show in front
    //
    blades3.spike.z = CFG.visual.zIndex.player + 1
    
    //
    // Trap blades that appear when hero gets close to blade3
    //
    const trapDistance = 20  // Distance to trigger trap (very close)
    const spikeWidth = Blades.getSpikeWidth(k)
    const gapWidth = 8  // Very small gap between blade3 and trap
    const trapBladeX = blade3X + spikeWidth / 2 + gapWidth + spikeWidth / 2  // Position with small gap
    
    let trapBlades = null
    let trapTriggered = false
    
    //
    // Check distance to trigger trap
    // Calculate distance to the right edge of blade3 (where trap will appear)
    //
    k.onUpdate(() => {
      if (trapTriggered) return
      
      const blade3RightEdge = blade3X + spikeWidth / 2
      const distanceToTrap = Math.abs(hero.character.pos.x - blade3RightEdge)
      
      if (distanceToTrap < trapDistance) {
        trapTriggered = true
        
        //
        // Create trap blades that appear suddenly
        //
        trapBlades = Blades.create({
          k,
          x: trapBladeX,
          y: platformY - spikeHeight / 2,
          hero,
          orientation: Blades.ORIENTATIONS.FLOOR,
          onHit: () => Blades.handleCollision(trapBlades, "level-word.0"),
          sfx: sound,
          spikeCount: 2
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
  const centerX = k.width() / 2
  const topPlatformHeight = k.height() * CFG.visual.topPlatformHeight / 100
  const textY = topPlatformHeight / 2  // Center of top platform area
  
  //
  // If intro already complete, show only instructions
  //
  if (introAnimationComplete) {
    showInstructions(k)
    return
  }
  
  //
  // Phase 1: Show intro text "find yourself to know who you are"
  //
  const introText = k.add([
    k.text(INTRO_TEXT, {
      size: 32,
      align: "center",
      font: "jetbrains"
    }),
    k.pos(centerX, textY),
    k.anchor("center"),
    k.color(107, 142, 159),  // Steel blue (blade color - 6B8E9F)
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 10)
  ])
  
  //
  // Animation state
  //
  const inst = {
    k,
    introText,
    instructionsText: null,
    timer: 0,
    phase: 'initial_delay'  // Start with delay phase
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
      if (inst.timer >= INTRO_INITIAL_DELAY) {
        inst.phase = 'intro_fade_in'
        inst.timer = 0
      }
    } else if (inst.phase === 'intro_fade_in') {
      //
      // Fade in intro text
      //
      const progress = Math.min(1, inst.timer / INTRO_FADE_IN_DURATION)
      introText.opacity = progress
      
      if (progress >= 1) {
        inst.phase = 'intro_hold'
        inst.timer = 0
      }
    } else if (inst.phase === 'intro_hold') {
      //
      // Hold intro text
      //
      if (inst.timer >= INTRO_HOLD_DURATION) {
        inst.phase = 'intro_fade_out'
        inst.timer = 0
      }
    } else if (inst.phase === 'intro_fade_out') {
      //
      // Fade out intro text
      //
      const progress = Math.min(1, inst.timer / INTRO_FADE_OUT_DURATION)
      introText.opacity = 1 - progress
      
      if (progress >= 1) {
        k.destroy(introText)
        introAnimationComplete = true  // Mark intro as complete
        inst.phase = 'instructions_fade_in'
        inst.timer = 0
        
        //
        // Create instructions text
        //
        inst.instructionsText = k.add([
          k.text("← → - move,   ↑ Space - jump,   ESC - menu", {
            size: 24, 
            align: "center",
            font: "jetbrains"
          }),
          k.pos(centerX, textY),
          k.anchor("center"),
          k.color(204, 204, 204),  // Light gray
          k.opacity(0),
          k.z(CFG.visual.zIndex.ui + 10)
        ])
      }
    } else if (inst.phase === 'instructions_fade_in') {
      //
      // Fade in instructions text
      //
      const progress = Math.min(1, inst.timer / INSTRUCTIONS_FADE_IN_DURATION)
      inst.instructionsText.opacity = progress
      
      if (progress >= 1) {
        inst.phase = 'instructions_hold'
        inst.timer = 0
      }
    } else if (inst.phase === 'instructions_hold') {
      //
      // Hold instructions text
      //
      if (inst.timer >= INSTRUCTIONS_HOLD_DURATION) {
        inst.phase = 'instructions_fade_out'
        inst.timer = 0
      }
    } else if (inst.phase === 'instructions_fade_out') {
      //
      // Fade out instructions text
      //
      const progress = Math.min(1, inst.timer / INSTRUCTIONS_FADE_OUT_DURATION)
      inst.instructionsText.opacity = 1 - progress
      
      if (progress >= 1) {
        //
        // Clean up and finish
        //
        instructionsAnimationComplete = true  // Mark instructions as complete
        updateInterval.cancel()
        k.destroy(inst.instructionsText)
      }
    }
  })
}

/**
 * Shows only instructions without intro text
 * @param {Object} k - Kaplay instance
 */
function showInstructions(k) {
  const centerX = k.width() / 2
  const topPlatformHeight = k.height() * CFG.visual.topPlatformHeight / 100
  const textY = topPlatformHeight / 2
  
  //
  // Create instructions text
  //
  const instructionsText = k.add([
    k.text("← → - move,   ↑ Space - jump,   ESC - menu", {
      size: 24, 
      align: "center",
      font: "jetbrains"
    }),
    k.pos(centerX, textY),
    k.anchor("center"),
    k.color(204, 204, 204),  // Light gray
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 10)
  ])
  
  //
  // Animation state
  //
  const inst = {
    k,
    instructionsText,
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
      // Fade in instructions text
      //
      const progress = Math.min(1, inst.timer / INSTRUCTIONS_FADE_IN_DURATION)
      instructionsText.opacity = progress
      
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
      // Fade out instructions text
      //
      const progress = Math.min(1, inst.timer / INSTRUCTIONS_FADE_OUT_DURATION)
      instructionsText.opacity = 1 - progress
      
      if (progress >= 1) {
        //
        // Clean up and finish
        //
        instructionsAnimationComplete = true  // Mark instructions as complete
        updateInterval.cancel()
        k.destroy(instructionsText)
      }
    }
  })
}

