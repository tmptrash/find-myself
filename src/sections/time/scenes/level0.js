import { CFG } from '../cfg.js'
import { initScene, startTimeSectionMusic, stopTimeSectionMusic } from '../components/scene-helper.js'
import * as Hero from '../../../components/hero.js'
import * as TimePlatform from '../components/time-platform.js'
import * as StaticTimePlatform from '../components/static-time-platform.js'
import * as OneSpikes from '../components/one-spikes.js'
import * as Sound from '../../../utils/sound.js'
import { set, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { toPng, parseHex } from '../../../utils/helper.js'
import * as MovingCars from '../components/moving-cars.js'
//
// Platform dimensions (in pixels, for 1920x1080 resolution)
// Platforms fill entire top and bottom to hide background
//
const PLATFORM_TOP_HEIGHT = 250
const PLATFORM_BOTTOM_HEIGHT = 255  // Lowered by 5px to create ground stripe
const PLATFORM_SIDE_WIDTH = 192
const GROUND_STRIPE_HEIGHT = 5  // Height of ground stripe above bottom platform
//
// Hero spawn positions (in pixels)
//
const HERO_SPAWN_X = 250
const HERO_SPAWN_Y = 795  // Raised by 5px due to ground stripe
const ANTIHERO_SPAWN_X = 1670
const ANTIHERO_SPAWN_Y = 795  // Raised by 5px due to ground stripe
//
// Hero spawn timing
//
const ANTIHERO_SPAWN_DELAY = 1.0  // Anti-hero spawns 1 second after hero
const HERO_FIRST_THOUGHTS_DELAY = 2.0
const CORNER_RADIUS = 20  // Radius for rounded corners of game area
//
// Instructions animation constants
//
const INSTRUCTIONS_INITIAL_DELAY = 1.0
const INSTRUCTIONS_FADE_IN_DURATION = 0.8
const INSTRUCTIONS_HOLD_DURATION = 4.0
const INSTRUCTIONS_FADE_OUT_DURATION = 0.8
/**
 * Flash small hero with color animation
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator instance
 * @param {Object} originalColor - Original color of small hero
 * @param {number} count - Current flash count
 */
function flashSmallHeroLevel0(k, levelIndicator, originalColor, count) {
  if (count >= 20) {
    levelIndicator.smallHero.character.color = originalColor
    return
  }
  //
  // Flash between green and white for visibility
  //
  levelIndicator.smallHero.character.color = count % 2 === 0 ? k.rgb(0, 255, 100) : k.rgb(255, 255, 255)
  k.wait(0.05, () => flashSmallHeroLevel0(k, levelIndicator, originalColor, count + 1))
}
/**
 * Create heart particles around small hero when level is completed
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator instance
 */
function createHeroScoreParticles(k, levelIndicator) {
  if (!levelIndicator || !levelIndicator.smallHero || !levelIndicator.smallHero.character) {
    return
  }
  
  const heroX = levelIndicator.smallHero.character.pos.x
  const heroY = levelIndicator.smallHero.character.pos.y
  const particleCount = 15
  //
  // Create heart particles flying outward (yellow with black outline like hero particles)
  //
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 100 + Math.random() * 50
    const lifetime = 0.8 + Math.random() * 0.4
    const heartSize = 18 + Math.random() * 8
    //
    // Create black outline hearts (8 directions)
    //
    const outlineOffset = 1.5
    const outlineOffsets = [
      [-outlineOffset, -outlineOffset],
      [0, -outlineOffset],
      [outlineOffset, -outlineOffset],
      [-outlineOffset, 0],
      [outlineOffset, 0],
      [-outlineOffset, outlineOffset],
      [0, outlineOffset],
      [outlineOffset, outlineOffset]
    ]
    
    outlineOffsets.forEach(([dx, dy]) => {
      const outlineParticle = k.add([
        k.text('♥', { size: heartSize }),
        k.pos(heroX + dx, heroY + dy),
        k.color(0, 0, 0),
        k.opacity(1),
        k.z(CFG.visual.zIndex.ui + 10),
        k.fixed()
      ])
      //
      // Animate outline particle
      //
      const startTime = k.time()
      outlineParticle.onUpdate(() => {
        const elapsed = k.time() - startTime
        if (elapsed > lifetime) {
          outlineParticle.destroy()
          return
        }
        outlineParticle.pos.x += Math.cos(angle) * speed * k.dt()
        outlineParticle.pos.y += Math.sin(angle) * speed * k.dt()
        outlineParticle.opacity = 1 - (elapsed / lifetime)
      })
    })
    //
    // Create main yellow heart
    //
    const particle = k.add([
      k.text('♥', { size: heartSize }),
      k.pos(heroX, heroY),
      k.color(255, 200, 0),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 11),
      k.fixed()
    ])
    //
    // Animate particle outward with fade
    //
    const startTime = k.time()
    particle.onUpdate(() => {
      const elapsed = k.time() - startTime
      if (elapsed > lifetime) {
        particle.destroy()
        return
      }
      particle.pos.x += Math.cos(angle) * speed * k.dt()
      particle.pos.y += Math.sin(angle) * speed * k.dt()
      particle.opacity = 1 - (elapsed / lifetime)
    })
  }
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
 * Creates ground stripe above bottom platform
 * @param {Object} k - Kaplay instance
 */
function createGroundStripe(k) {
  const groundColor = k.rgb(20, 20, 20)  // Dark gray ground
  const gameAreaWidth = k.width() - PLATFORM_SIDE_WIDTH * 2
  const groundY = k.height() - PLATFORM_BOTTOM_HEIGHT - 4
  k.add([
    k.rect(gameAreaWidth, GROUND_STRIPE_HEIGHT),
    k.pos(PLATFORM_SIDE_WIDTH, groundY),
    k.color(groundColor),
    k.z(16)  // Above platforms (15), background (15.5), cars (15.6), rounded corners (15.8)
  ])
}

/**
 * Creates a rounded corner sprite using canvas (L-shaped with rounded inner corner)
 * @param {number} radius - Corner radius
 * @param {string} backgroundColor - Background color hex
 * @returns {string} Data URL of the corner sprite
 */
function createRoundedCornerSprite(radius, backgroundColor) {
  const size = radius * 2
  const dataURL = toPng({ width: size, height: size }, (ctx) => {
    const [r, g, b] = parseHex(backgroundColor)
    ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
    //
    // Draw L-shaped corner with rounded inner angle
    // Start with full square
    //
    ctx.fillRect(0, 0, size, size)
    //
    // Cut out top-right quarter circle to create rounded inner corner
    //
    ctx.globalCompositeOperation = 'destination-out'
    ctx.beginPath()
    ctx.arc(size, size, radius, Math.PI, Math.PI * 1.5, false)
    ctx.lineTo(size, size)
    ctx.closePath()
    ctx.fill()
    //
    // Reset composite operation
    //
    ctx.globalCompositeOperation = 'source-over'
  })
  return dataURL
}

/**
 * Creates rounded corners for game area to soften sharp edges where platforms meet
 * @param {Object} k - Kaplay instance
 */
function createRoundedCorners(k) {
  const radius = CORNER_RADIUS
  const backgroundColor = CFG.visual.colors.background
  //
  // Create corner sprite
  //
  const cornerDataURL = createRoundedCornerSprite(radius, backgroundColor)
  k.loadSprite('corner-sprite', cornerDataURL)
  //
  // Top-left corner (rotate 0°)
  //
  k.add([
    k.sprite('corner-sprite'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, PLATFORM_TOP_HEIGHT - CORNER_RADIUS),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
  //
  // Top-right corner (rotate 90°)
  //
  k.add([
    k.sprite('corner-sprite'),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH + CORNER_RADIUS, PLATFORM_TOP_HEIGHT - CORNER_RADIUS),
    k.rotate(90),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
  //
  // Bottom-left corner (rotate 270°)
  //
  k.add([
    k.sprite('corner-sprite'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, k.height() - PLATFORM_BOTTOM_HEIGHT + CORNER_RADIUS),
    k.rotate(270),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
  //
  // Bottom-right corner (rotate 180°)
  //
  k.add([
    k.sprite('corner-sprite'),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH + CORNER_RADIUS, k.height() - PLATFORM_BOTTOM_HEIGHT + CORNER_RADIUS),
    k.rotate(180),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
}

/**
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
    const { hero, antiHero, levelIndicator } = initScene({
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
        stopTimeSectionMusic()
        //
        // Fade out all sounds immediately
        //
        if (sound && sound.audioContext) {
          const ctx = sound.audioContext
          if (sound.ambientGain) {
            sound.ambientGain.gain.setValueAtTime(sound.ambientGain.gain.value, ctx.currentTime)
            sound.ambientGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
          }
        }
        Sound.fadeOutAllMusic()
        //
        // Increment hero score (level completed)
        //
        const currentScore = get('heroScore', 0)
        const newScore = currentScore + 1
        set('heroScore', newScore)
        //
        // Show visual effects with hero score before transition
        //
        if (levelIndicator && levelIndicator.smallHero) {
          //
          // Update score text immediately
          //
          if (levelIndicator.updateHeroScore) {
            levelIndicator.updateHeroScore(newScore)
          }
          //
          // Play victory sound
          //
          Sound.playVictorySound(sound)
          //
          // Flash small hero aggressively (green to white, 20 flashes = 1 second)
          //
          const originalColor = levelIndicator.smallHero.character.color
          flashSmallHeroLevel0(k, levelIndicator, originalColor, 0)
          //
          // Create heart particles around small hero
          //
          createHeroScoreParticles(k, levelIndicator)
        }
        //
        // Wait 1.3 seconds before transition (1s for effects + 0.3s pause)
        //
        k.wait(1.3, () => {
          //
          // After annihilation, show transition and move to level 1
          //
          createLevelTransition(k, 'level-time.0')
        })
      }
    })
    
    //
    // Override z-index for heroes
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
    // Add city background (preloaded sprite)
    //
    k.add([
      k.sprite('city-background'),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height / 2),
      k.anchor('center'),
      k.z(15.5)  // In front of platforms (15)
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
    // Create rounded corners for game area
    //
    createRoundedCorners(k)
    //
    // Create ground stripe above bottom platform
    //
    createGroundStripe(k)
    //
    // Create moving blurred cars on background
    //
    MovingCars.create({
      k,
      platformBottomHeight: PLATFORM_BOTTOM_HEIGHT,
      platformSideWidth: PLATFORM_SIDE_WIDTH,
      carCount: 5
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
      sfx: sound,
      levelIndicator
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
      sfx: sound,
      levelIndicator
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
      sfx: sound,
      levelIndicator
    })
    //
    // Make platform 3 grayer (darker than other platforms)
    //
    timePlatform3.timerText.color = k.rgb(140, 140, 140)  // Darker gray instead of 192, 192, 192
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
      duration: 3,
      sfx: sound,
      levelIndicator
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
      sfx: sound,
      levelIndicator
    })
    //
    // Platform 6 trap: smoothly moves right when hero moves right past platform 5 edge, returns after 1 second, only once
    //
    const PLATFORM6_ORIGINAL_X = 1240
    const PLATFORM6_MOVE_DISTANCE = 200  // Move 200px to the right
    const PLATFORM6_MOVE_SPEED = 400  // Speed of platform movement (px/s)
    const PLATFORM6_RETURN_DELAY = 1.0  // 1 second delay before return
    const PLATFORM5_X = 1060
    const PLATFORM5_WIDTH = 140
    const PLATFORM5_RIGHT_EDGE = PLATFORM5_X + PLATFORM5_WIDTH / 2  // Right edge of platform 5 (1130)
    
    let platform6State = 'idle'  // 'idle', 'moving_right', 'waiting', 'returning'
    let platform6CurrentX = PLATFORM6_ORIGINAL_X
    let platform6TargetX = PLATFORM6_ORIGINAL_X
    let platform6WaitTimer = 0
    let platform6HasActivated = false  // Track if trap has been activated once
    
    k.onUpdate(() => {
      //
      // Check if hero moves right past platform 5 edge (only if trap hasn't activated yet)
      //
      if (!platform6HasActivated && hero && hero.character && platform6State === 'idle') {
        const heroX = hero.character.pos.x
        
        //
        // If hero is to the right of platform 5's right edge, start moving platform 6
        //
        if (heroX > PLATFORM5_RIGHT_EDGE) {
          //
          // Start moving platform 6 to the right smoothly
          //
          platform6HasActivated = true
          platform6State = 'moving_right'
          platform6TargetX = PLATFORM6_ORIGINAL_X + PLATFORM6_MOVE_DISTANCE
          //
          // Temporarily remove collision so hero can't land on moving platform
          //
          if (timePlatform6.platform.body) {
            timePlatform6.platform.unuse("body")
          }
          timePlatform6.platform.unuse(CFG.game.platformName)
        }
      }
      
      //
      // Handle platform 6 movement states
      //
      if (platform6State === 'moving_right' && !timePlatform6.isDestroyed) {
        //
        // Smoothly move platform 6 to the right
        //
        const moveDelta = PLATFORM6_MOVE_SPEED * k.dt()
        platform6CurrentX = Math.min(platform6CurrentX + moveDelta, platform6TargetX)
        
        //
        // Update platform position
        //
        timePlatform6.platform.pos.x = platform6CurrentX
        timePlatform6.timerText.pos.x = platform6CurrentX
        timePlatform6.outlineTexts.forEach(outlineText => {
          outlineText.pos.x = platform6CurrentX
        })
        
        //
        // Check if reached target position
        //
        if (platform6CurrentX >= platform6TargetX) {
          platform6State = 'waiting'
          platform6WaitTimer = 0
        }
      } else if (platform6State === 'waiting' && !timePlatform6.isDestroyed) {
        //
        // Wait before returning
        //
        platform6WaitTimer += k.dt()
        if (platform6WaitTimer >= PLATFORM6_RETURN_DELAY) {
          platform6State = 'returning'
          platform6TargetX = PLATFORM6_ORIGINAL_X
        }
      } else if (platform6State === 'returning' && !timePlatform6.isDestroyed) {
        //
        // Smoothly return platform 6 to original position
        //
        const moveDelta = PLATFORM6_MOVE_SPEED * k.dt()
        platform6CurrentX = Math.max(platform6CurrentX - moveDelta, platform6TargetX)
        
        //
        // Update platform position
        //
        timePlatform6.platform.pos.x = platform6CurrentX
        timePlatform6.timerText.pos.x = platform6CurrentX
        timePlatform6.outlineTexts.forEach(outlineText => {
          outlineText.pos.x = platform6CurrentX
        })
        
        //
        // Check if returned to original position
        //
        if (platform6CurrentX <= platform6TargetX) {
          platform6State = 'idle'
          platform6CurrentX = PLATFORM6_ORIGINAL_X
          //
          // Re-enable collision when platform returns (hero can jump on it now)
          //
          if (!timePlatform6.platform.body) {
            timePlatform6.platform.use(k.body({ isStatic: true }))
          }
          timePlatform6.platform.use(CFG.game.platformName)
        }
      }
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
    })
    //
    // Create time spikes (digit "1") under the time platform to anti-hero
    //
    const oneSpikes = OneSpikes.create({
      k,
      startX: 450,  // Start after the time platform
      endX: 1600,   // End near the anti-hero
      y: 815,       // Below the time platform, on the floor level
      hero,
      currentLevel: 'level-time.0',
      sfx: sound,
      levelIndicator
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
    
    oneSpikes.fakeSpikes.forEach(fakeSpike => {
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
        
        oneSpikes.fakeSpikes.forEach(fakeSpike => {
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
      if (!spikesDisappeared && oneSpikes && oneSpikes.fakeSpikes) {
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
            oneSpikes.fakeSpikes.forEach((fakeSpike, index) => {
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
            oneSpikes.fakeSpikes.forEach((fakeSpike, index) => {
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
