import { CFG } from '../cfg.js'
import { initScene, startTimeSectionMusic, stopTimeSectionMusic, startClockMusic, checkSpeedBonus, createSunHoverFace } from '../components/scene-helper.js'
import * as Hero from '../../../components/hero.js'
import * as TimePlatform from '../components/time-platform.js'
import * as StaticTimePlatform from '../components/static-time-platform.js'
import * as OneSpikes from '../components/one-spikes.js'
import * as Sound from '../../../utils/sound.js'
import { set, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { toPng, parseHex, getRGB } from '../../../utils/helper.js'
import * as MovingCars from '../components/moving-cars.js'
import * as BackgroundBirds from '../components/background-birds.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
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
// TIME indicator tooltip
//
const TIME_INDICATOR_TOOLTIP_TEXT = "your progress"
const TIME_INDICATOR_TOOLTIP_WIDTH = 200
const TIME_INDICATOR_TOOLTIP_HEIGHT = 60
const TIME_INDICATOR_TOOLTIP_Y_OFFSET = 40
//
// Green timer tooltip
//
const GREEN_TIMER_TOOLTIP_TEXT = "complete the level in time\nto earn more points"
const GREEN_TIMER_TOOLTIP_WIDTH = 100
const GREEN_TIMER_TOOLTIP_HEIGHT = 30
const GREEN_TIMER_TOOLTIP_Y_OFFSET = 50
//
// Small hero and life icon tooltips (appear below)
//
const SMALL_HERO_TOOLTIP_TEXT = "your points"
const SMALL_HERO_TOOLTIP_SIZE = 80
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_TEXT = "life score"
const LIFE_TOOLTIP_SIZE = 80
const LIFE_TOOLTIP_Y_OFFSET = 50
//
// Anti-hero tooltip
//
const ANTIHERO_TOOLTIP_TEXT = "time waits for no one"
const ANTIHERO_TOOLTIP_HOVER_WIDTH = 80
const ANTIHERO_TOOLTIP_HOVER_HEIGHT = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
//
// Hero tooltip
//
const HERO_TOOLTIP_TEXT = "time flies..."
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -60
//
// Bonus hero — hidden platform shaped as 00:00, top-left of rightmost platform
//
const BONUS_PLATFORM_X = 1100
const BONUS_PLATFORM_Y = 530
const BONUS_PLATFORM_WIDTH = 100
const BONUS_STORAGE_KEY = 'time.level0BonusCollected'
const BONUS_HERO_COLOR = "#8B5A50"

/**
 * Time section level 0 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-time.0", () => {
    //
    // Reset scores only if coming from a different section (not a reload after death)
    //
    const lastLevel = get('lastLevel', '')
    const isComingFromDifferentSection = !lastLevel || typeof lastLevel !== 'string' || !lastLevel.startsWith('level-time.')
    
    if (isComingFromDifferentSection) {
      set('heroScore', 0)
      set('lifeScore', 0)
    }
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
    // Start clock.mp3 (stored in timeSectionMusic for proper transition stopping)
    //
    startClockMusic(k)
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
        // Check for speed bonus before incrementing normal score
        //
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(k, 'level-time.0', levelTime, levelIndicator)
        //
        // Increment hero score (level completed + speed bonus if earned)
        //
        const currentScore = get('heroScore', 0)
        const pointsToAdd = speedBonusEarned ? 2 : 1
        const newScore = currentScore + pointsToAdd
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
        // Wait before transition (extra 1s if speed bonus earned for particle effect)
        //
        const transitionDelay = speedBonusEarned ? 2.3 : 1.3
        k.wait(transitionDelay, () => {
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
    //
    // Add city background (preloaded sprite)
    //
    k.add([
      k.sprite('city-background'),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height / 2),
      k.anchor('center'),
      k.z(15.5)
    ])
    //
    // Sun hover face (smiley appears when mouse hovers the sun)
    //
    createSunHoverFace(k, 15.6)
    //
    // Create background birds
    //
    const birds = BackgroundBirds.create(k)
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ 
      k, 
      showTimer: true, 
      targetTime: CFG.gameplay.speedBonusTime['level-time.0'],
      topY: PLATFORM_TOP_HEIGHT - 57
    })
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
    // Platform 1: left-bottom, above hero (3 seconds)
    //
    const timePlatform1 = TimePlatform.create({
      k,
      x: 400,
      y: 760,
      hero,
      duration: 3,
      sfx: sound,
      levelIndicator
    })
    //
    // Platform 2: middle, higher (closer, 2 seconds)
    //
    const timePlatform2 = TimePlatform.create({
      k,
      x: 580,
      y: 690,
      hero,
      duration: 2,
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
    timePlatform3.initialColor = 140
    //
    // Platform 4: static platform with running timer (same Y as platform 2)
    //
    const staticPlatform = StaticTimePlatform.create({
      k,
      x: 880,
      y: 720,
    })
    //
    // Platform 5: 4-second timer, right and up from static platform
    //
    const timePlatform5 = TimePlatform.create({
      k,
      x: 1060,
      y: 650,
      hero,
      duration: 4,
      sfx: sound,
      levelIndicator
    })
    //
    // Platform 6: 2-second timer, right and up from platform 5
    //
    const timePlatform6 = TimePlatform.create({
      k,
      x: 1240,
      y: 580,
      hero,
      duration: 2,
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
    // Create time spikes (digit "1") under the time platform
    // Gap near anti-hero (no spikes near anti-hero)
    //
    const oneSpikes = OneSpikes.create({
      k,
      startX: 450,
      endX: 1400,
      y: 815,
      hero,
      currentLevel: 'level-time.0',
      digitCount: 36,
      fakeDigitCount: 0,
      sfx: sound,
      levelIndicator
    })
    //
    // Tooltip for TIME level indicator letters
    //
    const timeLettersCenterX = PLATFORM_SIDE_WIDTH + 90
    const timeLettersCenterY = PLATFORM_TOP_HEIGHT - 40
    Tooltip.create({
      k,
      targets: [{
        x: timeLettersCenterX,
        y: timeLettersCenterY,
        width: TIME_INDICATOR_TOOLTIP_WIDTH,
        height: TIME_INDICATOR_TOOLTIP_HEIGHT,
        text: TIME_INDICATOR_TOOLTIP_TEXT,
        offsetY: TIME_INDICATOR_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Tooltip for green timer (target time countdown)
    //
    fpsCounter.targetText && Tooltip.create({
      k,
      targets: [{
        x: fpsCounter.targetText.pos.x,
        y: fpsCounter.targetText.pos.y,
        width: GREEN_TIMER_TOOLTIP_WIDTH,
        height: GREEN_TIMER_TOOLTIP_HEIGHT,
        text: GREEN_TIMER_TOOLTIP_TEXT,
        offsetY: GREEN_TIMER_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Tooltip for small hero icon (score) — appears below
    //
    Tooltip.create({
      k,
      targets: [{
        x: levelIndicator.smallHero.character.pos.x,
        y: levelIndicator.smallHero.character.pos.y,
        width: SMALL_HERO_TOOLTIP_SIZE,
        height: SMALL_HERO_TOOLTIP_SIZE,
        text: SMALL_HERO_TOOLTIP_TEXT,
        offsetY: SMALL_HERO_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Tooltip for life icon — appears below
    //
    Tooltip.create({
      k,
      targets: [{
        x: levelIndicator.lifeImage.pos.x,
        y: levelIndicator.lifeImage.pos.y,
        width: LIFE_TOOLTIP_SIZE,
        height: LIFE_TOOLTIP_SIZE,
        text: LIFE_TOOLTIP_TEXT,
        offsetY: LIFE_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Tooltip for anti-hero
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => antiHero.character.pos.x,
        y: () => antiHero.character.pos.y,
        width: ANTIHERO_TOOLTIP_HOVER_WIDTH,
        height: ANTIHERO_TOOLTIP_HOVER_HEIGHT,
        text: ANTIHERO_TOOLTIP_TEXT,
        offsetY: ANTIHERO_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Tooltip for hero
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => hero.character.pos.x,
        y: () => hero.character.pos.y,
        width: HERO_TOOLTIP_HOVER_SIZE,
        height: HERO_TOOLTIP_HOVER_SIZE,
        text: HERO_TOOLTIP_TEXT,
        offsetY: HERO_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Hidden bonus hero — 00:00 platform top-left of the rightmost platform
    //
    BonusHero.create({
      k,
      x: BONUS_PLATFORM_X,
      y: BONUS_PLATFORM_Y,
      width: BONUS_PLATFORM_WIDTH,
      heroInst: hero,
      levelIndicator,
      sfx: sound,
      approachFromAbove: true,
      heroBodyColor: BONUS_HERO_COLOR,
      storageKey: BONUS_STORAGE_KEY
    })
  })
}

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
  if (!levelIndicator || !levelIndicator.smallHero || !levelIndicator.smallHero.character) return
  const bodyColorHex = levelIndicator.smallHero.bodyColor || CFG.visual.colors.hero.body
  const heroColor = getRGB(k, bodyColorHex)
  const heroX = levelIndicator.smallHero.character.pos.x
  const heroY = levelIndicator.smallHero.character.pos.y
  const particleCount = 8
  //
  // Flash the small hero between hero color and white
  //
  flashSmallHeroForBonus(k, levelIndicator, heroColor, 0)
  //
  // Create circle particles flying outward matching hero body color
  //
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 30 + Math.random() * 20
    const lifetime = 0.8 + Math.random() * 0.4
    const size = 4 + Math.random() * 4
    const particle = k.add([
      k.circle(size),
      k.pos(heroX, heroY),
      k.color(heroColor.r, heroColor.g, heroColor.b),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 11),
      k.anchor('center'),
      k.fixed()
    ])
    const velocityX = Math.cos(angle) * speed
    const velocityY = Math.sin(angle) * speed
    let age = 0
    particle.onUpdate(() => {
      const dt = k.dt()
      age += dt
      particle.pos.x += velocityX * dt
      particle.pos.y += velocityY * dt
      particle.opacity = 1 - (age / lifetime)
      if (age >= lifetime && particle.exists && particle.exists()) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Flash small hero between hero color and white for speed bonus
 */
function flashSmallHeroForBonus(k, levelIndicator, heroColor, count) {
  const FLASH_COUNT = 20
  const FLASH_INTERVAL = 0.05
  if (count >= FLASH_COUNT) {
    levelIndicator.smallHero.character.color = k.rgb(255, 255, 255)
    return
  }
  levelIndicator.smallHero.character.color = count % 2 === 0 ? heroColor : k.rgb(255, 255, 255)
  k.wait(FLASH_INTERVAL, () => flashSmallHeroForBonus(k, levelIndicator, heroColor, count + 1))
}


/**
 * Creates ground stripe above bottom platform
 * @param {Object} k - Kaplay instance
 */
function createGroundStripe(k) {
  const groundColor = k.rgb(20, 20, 20)
  const gameAreaWidth = k.width() - PLATFORM_SIDE_WIDTH * 2
  const groundY = k.height() - PLATFORM_BOTTOM_HEIGHT - 4
  k.add([
    k.rect(gameAreaWidth, GROUND_STRIPE_HEIGHT),
    k.pos(PLATFORM_SIDE_WIDTH, groundY),
    k.color(groundColor),
    k.z(16)
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
