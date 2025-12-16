import { CFG } from '../cfg.js'
import { initScene, startTimeSectionMusic } from '../utils/scene.js'
import * as Hero from '../../../components/hero.js'
import * as TimeDigits from '../components/time-digits.js'
import * as TimePlatform from '../components/time-platform.js'
import * as StaticTimePlatform from '../components/static-time-platform.js'
import * as TimeSpikes from '../components/time-spikes.js'
import * as Sound from '../../../utils/sound.js'
import { saveLastLevel } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
// Platforms fill entire top and bottom to hide background
//
const PLATFORM_TOP_HEIGHT = 250
const PLATFORM_BOTTOM_HEIGHT = 250
const PLATFORM_SIDE_WIDTH = 192

//
// Hero spawn positions (in pixels)
//
const HERO_SPAWN_X = 250
const HERO_SPAWN_Y = 790
const ANTIHERO_SPAWN_X = 1670
const ANTIHERO_SPAWN_Y = 790
//
// Hero spawn timing
//
const ANTIHERO_SPAWN_DELAY = 1.0  // Anti-hero spawns 1 second after hero
//
// Instructions animation constants
//
const INSTRUCTIONS_INITIAL_DELAY = 1.0
const INSTRUCTIONS_FADE_IN_DURATION = 0.8
const INSTRUCTIONS_HOLD_DURATION = 4.0
const INSTRUCTIONS_FADE_OUT_DURATION = 0.8
//
// Flag to track if instructions animation is complete (resets only on page reload)
//
let instructionsAnimationComplete = false

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
  // Create main text (white)
  //
  const mainText = k.add([
    k.text(instructionsContent, {
      size: 24,
      align: "center",
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX, textY),
    k.anchor("center"),
    k.color(255, 255, 255),  // White for time section
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 10)
  ])
  
  return { mainText, outlineTexts }
}

/**
 * Shows instructions
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

/**
 * Time section level 0 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-time.0", () => {
    //
    // Save progress immediately when entering this level
    //
    saveLastLevel('level-time.0')
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start background music (only if not already playing)
    // Note: kids.mp3 and time.mp3 persist across level reloads
    //
    startTimeSectionMusic(k)
    //
    // Start clock.mp3 locally (restarts on each level load for synchronization)
    //
    const clockMusic = k.play('clock', {
      loop: true,
      volume: CFG.audio.backgroundMusic.clock
    })
    //
    // Stop clock music when leaving the scene (will restart on reload for sync)
    //
    k.onSceneLeave(() => {
      clockMusic.stop()
    })
    //
    // Initialize level with heroes and platforms
    //
    const { hero, antiHero } = initScene({
      k,
      levelName: 'level-time.0',
      levelNumber: 1,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      onAnnihilation: () => {
        //
        // After annihilation, return to menu
        // TODO: Change to k.go('level-time.1') when level 1 is created
        //
        k.go('menu')
      }
    })
    
    //
    // Override z-index for heroes to be above time digits
    //
    hero.character.z = 20
    antiHero.character.z = 20
    //
    // Hide anti-hero initially (will appear after spawn delay)
    //
    antiHero.character.hidden = true
    //
    // Show instructions on first run
    //
    if (!instructionsAnimationComplete) {
      showInstructions(k)
    }
    //
    // Create time digits background (full screen)
    //
    const timeDigitsInst = TimeDigits.create({ k })
    
    //
    // Update time digits
    //
    k.onUpdate(() => TimeDigits.onUpdate(timeDigitsInst))
    
    //
    // Create a game object for drawing time digits with proper z-index
    //
    k.add([
      {
        draw() {
          TimeDigits.draw(timeDigitsInst)
        }
      },
      k.z(16)  // Above platforms (15) but below player
    ])
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
    // Spawn hero immediately
    //
    Hero.spawn(hero)
    //
    // Spawn anti-hero after delay
    //
    k.wait(ANTIHERO_SPAWN_DELAY, () => {
      Hero.spawn(antiHero)
    })
    //
    // Create time platforms going right and up
    // Platform 1: left-bottom, above hero (2 seconds)
    //
    const timePlatform1 = TimePlatform.create({
      k,
      x: 400,
      y: 760,
      hero,
      duration: 2,
      sfx: sound
    })
    //
    // Platform 2: middle, higher (closer, 1 second)
    //
    const timePlatform2 = TimePlatform.create({
      k,
      x: 580,
      y: 690,
      hero,
      duration: 1,
      sfx: sound
    })
    //
    // Platform 3: right, even higher, FAKE (hero passes through)
    //
    const timePlatform3 = TimePlatform.create({
      k,
      x: 760,
      y: 620,
      hero,
      isFake: true,
      sfx: sound
    })
    //
    // Platform 4: static platform with running timer (same Y as platform 2)
    //
    const staticPlatform = StaticTimePlatform.create({
      k,
      x: 880,
      y: 720,
    })
    //
    // Platform 5: 1-second timer, right and up from static platform
    //
    const timePlatform5 = TimePlatform.create({
      k,
      x: 1060,
      y: 650,
      hero,
      duration: 1,
      sfx: sound
    })
    //
    // Platform 6: 1-second timer, right and up from platform 5
    //
    const timePlatform6 = TimePlatform.create({
      k,
      x: 1240,
      y: 580,
      hero,
      duration: 1,
      sfx: sound
    })
    //
    // Update all time platforms
    //
    k.onUpdate(() => {
      TimePlatform.onUpdate(timePlatform1)
      TimePlatform.onUpdate(timePlatform2)
      TimePlatform.onUpdate(timePlatform3)
      TimePlatform.onUpdate(timePlatform5)
      TimePlatform.onUpdate(timePlatform6)
      StaticTimePlatform.onUpdate(staticPlatform)
    })
    //
    // Create time spikes (digit "1") under the time platform to anti-hero
    //
    const timeSpikes = TimeSpikes.create({
      k,
      startX: 450,  // Start after the time platform
      endX: 1600,   // End near the anti-hero
      y: 810,       // Below the time platform, on the floor level
      hero,
      sfx: sound
    })
  })
}
