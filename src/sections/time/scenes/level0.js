import { CFG } from '../cfg.js'
import { initScene, startTimeSectionMusic } from '../utils/scene.js'
import * as Hero from '../../../components/hero.js'
import * as TimeDigits from '../components/time-digits.js'
import * as TimePlatform from '../components/time-platform.js'
import * as StaticTimePlatform from '../components/static-time-platform.js'
import * as AnalogClock from '../components/analog-clock.js'
import * as TimeSpikes from '../components/time-spikes.js'
import * as Sound from '../../../utils/sound.js'
import { set, setSoundStatus, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { createLevelTransition } from '../../../utils/transition.js'
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
const HERO_FIRST_THOUGHTS_DELAY = 2.0
//
// Instructions animation constants
//
const INSTRUCTIONS_INITIAL_DELAY = 1.0
const INSTRUCTIONS_FADE_IN_DURATION = 0.8
const INSTRUCTIONS_HOLD_DURATION = 4.0
const INSTRUCTIONS_FADE_OUT_DURATION = 0.8
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
    set('lastLevel', 'level-time.0')
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
    Sound.playInScene(k, 'clock', CFG.audio.backgroundMusic.clock, true)
    //
    // Start beginning phrase about time
    //
    Sound.playOnce(k, HERO_FIRST_THOUGHTS_DELAY, 'time0', CFG.audio.backgroundMusic.words)
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
        // After annihilation, show transition and move to level 1
        //
        createLevelTransition(k, 'level-time.0')
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
    // Show instructions every time
    //
    showInstructions(k)
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
    // Create a game object for drawing analog clock
    //
    k.add([
      {
        draw() {
          AnalogClock.draw(analogClock)
        }
      },
      k.z(17)  // Above time digits
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
    // Create analog clock centered horizontally at the top
    //
    const analogClock = AnalogClock.create({
      k,
      x: CFG.visual.screen.width / 2,  // Center horizontally
      y: 450,  // Higher up
      staticPlatform
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
    // Update all time platforms and analog clock
    //
    k.onUpdate(() => {
      TimePlatform.onUpdate(timePlatform1)
      TimePlatform.onUpdate(timePlatform2)
      TimePlatform.onUpdate(timePlatform3)
      TimePlatform.onUpdate(timePlatform5)
      TimePlatform.onUpdate(timePlatform6)
      StaticTimePlatform.onUpdate(staticPlatform)
      AnalogClock.onUpdate(analogClock)
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
      currentLevel: 'level-time.0',
      sfx: sound
    })
    //
    // Make last 4 fake spikes glitch like broken TV/computer screen
    // and disappear when hero jumps on them
    //
    let glitchTimer = 0
    let isGlitching = false
    let glitchFlickerTimer = 0
    let spikesDisappeared = false
    let glitchSoundPlayed = false
    const STABLE_DURATION = 5  // 5 seconds stable
    const GLITCH_DURATION = 0.8  // 0.8 seconds of glitching
    //
    // Store original positions for each fake spike
    //
    const originalPositions = []
    const originalRotations = []
    
    timeSpikes.fakeSpikes.forEach(fakeSpike => {
      if (fakeSpike && fakeSpike.exists && fakeSpike.exists()) {
        originalPositions.push({ x: fakeSpike.pos.x, y: fakeSpike.pos.y })
        originalRotations.push(fakeSpike.angle)
      }
    })
    
    k.onUpdate(() => {
      //
      // Check if hero jumped on fake spikes (passed through them from above)
      //
      if (!spikesDisappeared && hero.character.pos.x > 1350 && hero.character.pos.y > 700) {
        //
        // Hero reached the fake spikes area - make them disappear permanently
        //
        spikesDisappeared = true
        
        timeSpikes.fakeSpikes.forEach(fakeSpike => {
          if (fakeSpike && fakeSpike.exists && fakeSpike.exists()) {
            fakeSpike.opacity = 0
            
            if (fakeSpike.outlineTexts) {
              fakeSpike.outlineTexts.forEach(outline => {
                if (outline && outline.exists && outline.exists()) {
                  outline.opacity = 0
                }
              })
            }
          }
        })
      }
      //
      // Glitch effect: 5 seconds stable, then chaotic TV-like glitching
      //
      if (!spikesDisappeared && timeSpikes && timeSpikes.fakeSpikes) {
        glitchTimer += k.dt()
        
        if (!isGlitching) {
          //
          // Stable phase: spikes are at original positions
          //
          if (glitchTimer >= STABLE_DURATION) {
            //
            // Start glitching
            //
            isGlitching = true
            glitchTimer = 0
            glitchFlickerTimer = 0
            glitchSoundPlayed = false
          }
        } else {
          //
          // Glitching phase: TV screen distortion effects
          //
          glitchFlickerTimer += k.dt()
          //
          // Random flicker intervals (between 0.03 and 0.12 seconds)
          //
          const randomInterval = 0.03 + Math.random() * 0.09
          
          if (glitchFlickerTimer >= randomInterval) {
            glitchFlickerTimer = 0
            //
            // Apply random TV glitch effects to each spike
            //
            timeSpikes.fakeSpikes.forEach((fakeSpike, index) => {
              if (fakeSpike && fakeSpike.exists && fakeSpike.exists()) {
                const original = originalPositions[index]
                const originalRotation = originalRotations[index]
                //
                // Random glitch type for variety
                //
                const glitchType = Math.random()
                
                if (glitchType < 0.2) {
                  //
                  // Type 1: Complete signal loss (20%)
                  //
                  fakeSpike.opacity = 0
                  if (fakeSpike.outlineTexts) {
                    fakeSpike.outlineTexts.forEach(outline => {
                      if (outline && outline.exists && outline.exists()) {
                        outline.opacity = 0
                      }
                    })
                  }
                } else if (glitchType < 0.5) {
                  //
                  // Type 2: Horizontal displacement (30%)
                  //
                  const offsetX = (Math.random() - 0.5) * 20  // ±10px horizontal
                  fakeSpike.pos.x = original.x + offsetX
                  fakeSpike.opacity = 0.7 + Math.random() * 0.3
                  
                  if (fakeSpike.outlineTexts) {
                    fakeSpike.outlineTexts.forEach((outline, i) => {
                      if (outline && outline.exists && outline.exists()) {
                        const outlineOffset = i < 4 ? [-2, 0, 2, -2][i] : [2, -2, 0, 2][i - 4]
                        outline.pos.x = original.x + offsetX + outlineOffset
                        outline.opacity = 0.7 + Math.random() * 0.3
                      }
                    })
                  }
                } else if (glitchType < 0.7) {
                  //
                  // Type 3: Vertical jitter (20%)
                  //
                  const offsetY = (Math.random() - 0.5) * 10  // ±5px vertical
                  fakeSpike.pos.y = original.y + offsetY
                  fakeSpike.opacity = 1
                  
                  if (fakeSpike.outlineTexts) {
                    fakeSpike.outlineTexts.forEach((outline, i) => {
                      if (outline && outline.exists && outline.exists()) {
                        const outlineOffsetY = i < 3 ? -2 : (i < 5 ? 0 : 2)
                        outline.pos.y = original.y + offsetY + outlineOffsetY
                        outline.opacity = 1
                      }
                    })
                  }
                } else if (glitchType < 0.85) {
                  //
                  // Type 4: Double vision / ghosting (15%)
                  //
                  const offsetX = (Math.random() - 0.5) * 15
                  const offsetY = (Math.random() - 0.5) * 8
                  fakeSpike.pos.x = original.x + offsetX
                  fakeSpike.pos.y = original.y + offsetY
                  fakeSpike.opacity = 0.5 + Math.random() * 0.3
                  
                  if (fakeSpike.outlineTexts) {
                    fakeSpike.outlineTexts.forEach((outline, i) => {
                      if (outline && outline.exists && outline.exists()) {
                        const ox = i < 4 ? [-2, 0, 2, -2][i] : [2, -2, 0, 2][i - 4]
                        const oy = i < 3 ? -2 : (i < 5 ? 0 : 2)
                        outline.pos.x = original.x + offsetX + ox
                        outline.pos.y = original.y + offsetY + oy
                        outline.opacity = 0.5 + Math.random() * 0.3
                      }
                    })
                  }
                } else {
                  //
                  // Type 5: Normal display (15%)
                  //
                  fakeSpike.pos.x = original.x
                  fakeSpike.pos.y = original.y
                  fakeSpike.opacity = 1
                  
                  if (fakeSpike.outlineTexts) {
                    fakeSpike.outlineTexts.forEach((outline, i) => {
                      if (outline && outline.exists && outline.exists()) {
                        const ox = i < 4 ? [-2, 0, 2, -2][i] : [2, -2, 0, 2][i - 4]
                        const oy = i < 3 ? -2 : (i < 5 ? 0 : 2)
                        outline.pos.x = original.x + ox
                        outline.pos.y = original.y + oy
                        outline.opacity = 1
                      }
                    })
                  }
                }
              }
            })
          }
          
          if (glitchTimer >= GLITCH_DURATION) {
            //
            // End glitching, restore to original positions
            //
            isGlitching = false
            glitchTimer = 0
            glitchSoundPlayed = false
            //
            // Restore spikes to original positions and full opacity
            //
            timeSpikes.fakeSpikes.forEach((fakeSpike, index) => {
              if (fakeSpike && fakeSpike.exists && fakeSpike.exists()) {
                const original = originalPositions[index]
                fakeSpike.pos.x = original.x
                fakeSpike.pos.y = original.y
                fakeSpike.opacity = 1
                
                if (fakeSpike.outlineTexts) {
                  fakeSpike.outlineTexts.forEach((outline, i) => {
                    if (outline && outline.exists && outline.exists()) {
                      const ox = i < 4 ? [-2, 0, 2, -2][i] : [2, -2, 0, 2][i - 4]
                      const oy = i < 3 ? -2 : (i < 5 ? 0 : 2)
                      outline.pos.x = original.x + ox
                      outline.pos.y = original.y + oy
                      outline.opacity = 1
                    }
                  })
                }
              }
            })
          }
        }
      }
    })
  })
}
