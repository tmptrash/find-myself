import { CFG } from '../cfg.js'
import { initScene, startTimeSectionMusic } from '../utils/scene.js'
import * as Hero from '../../../components/hero.js'
import * as TimePlatform from '../components/time-platform.js'
import * as StaticTimePlatform from '../components/static-time-platform.js'
import * as AnalogClock from '../components/analog-clock.js'
import * as TimeSpikes from '../components/time-spikes.js'
import * as Sound from '../../../utils/sound.js'
import { set, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { stopTimeSectionMusic } from '../utils/scene.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { toPng } from '../../../utils/helper.js'
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
 * Creates a blurred car sprite using canvas with blur filter
 * @param {Object} params - Car parameters
 * @param {number} params.bodyWidth - Car body width
 * @param {number} params.bodyHeight - Car body height
 * @param {number} params.roofWidth - Car roof width
 * @param {number} params.roofHeight - Car roof height
 * @param {number} params.wheelRadius - Wheel radius
 * @param {number} params.bodyColor - Body color (gray value 0-255)
 * @param {number} params.roofColor - Roof color (gray value 0-255)
 * @param {number} params.wheelColor - Wheel color (gray value 0-255)
 * @param {number} params.windowColor - Window color (gray value 0-255)
 * @param {number} params.speed - Car speed (for window direction)
 * @returns {string} Data URL of the car sprite
 */
function createBlurredCarSprite({ bodyWidth, bodyHeight, roofWidth, roofHeight, wheelRadius, bodyColor, roofColor, wheelColor, windowColor, speed }) {
  //
  // Calculate canvas size (add padding for blur)
  //
  const padding = 20
  const canvasWidth = bodyWidth + padding * 2
  const canvasHeight = roofHeight + bodyHeight + wheelRadius + padding * 2
  const centerX = canvasWidth / 2
  const centerY = canvasHeight - padding - wheelRadius
  
  return toPng({ width: canvasWidth, height: canvasHeight, pixelRatio: 1 }, (ctx) => {
    //
    // Clear canvas with transparent background
    //
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    
    //
    // Apply blur filter (same as buildings - blur(6px))
    //
    ctx.filter = 'blur(6px)'
    
    //
    // Helper function to draw rounded rectangle
    //
    const drawRoundedRect = (x, y, width, height, radius, color) => {
      ctx.fillStyle = `rgb(${color}, ${color}, ${color})`
      ctx.beginPath()
      ctx.moveTo(x + radius, y)
      ctx.lineTo(x + width - radius, y)
      ctx.quadraticCurveTo(x + width, y, x + width, y + radius)
      ctx.lineTo(x + width, y + height - radius)
      ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height)
      ctx.lineTo(x + radius, y + height)
      ctx.quadraticCurveTo(x, y + height, x, y + height - radius)
      ctx.lineTo(x, y + radius)
      ctx.quadraticCurveTo(x, y, x + radius, y)
      ctx.closePath()
      ctx.fill()
    }
    
    //
    // Car body outline (darker stroke) - draw first (behind)
    //
    const outlineWidth = 1.5
    const outlineColor = bodyColor - 20
    
    //
    // Body outline
    //
    drawRoundedRect(
      centerX - bodyWidth / 2 - outlineWidth,
      centerY - bodyHeight,
      bodyWidth + outlineWidth * 2,
      bodyHeight + outlineWidth * 2,
      4 + outlineWidth,
      outlineColor
    )
    
    //
    // Roof outline
    //
    drawRoundedRect(
      centerX - roofWidth / 2 - outlineWidth,
      centerY - bodyHeight - roofHeight - outlineWidth,
      roofWidth + outlineWidth * 2,
      roofHeight + outlineWidth * 2,
      4 + outlineWidth,
      outlineColor
    )
    
    //
    // Main car body (rounded rectangle)
    //
    drawRoundedRect(
      centerX - bodyWidth / 2,
      centerY - bodyHeight,
      bodyWidth,
      bodyHeight,
      4,
      bodyColor
    )
    
    //
    // Car roof (rounded rectangle)
    //
    drawRoundedRect(
      centerX - roofWidth / 2,
      centerY - bodyHeight - roofHeight,
      roofWidth,
      roofHeight,
      4,
      roofColor
    )
    
    //
    // Car windows
    //
    const windowWidth = roofWidth / 2 - 8
    const windowHeight = roofHeight - 8
    const windowY = centerY - bodyHeight - roofHeight + 4
    
    //
    // Front window (right side when moving right)
    //
    const frontWindowX = speed > 0 ? centerX + roofWidth / 4 : centerX - roofWidth / 4
    ctx.fillStyle = `rgb(${windowColor}, ${windowColor}, ${windowColor})`
    ctx.fillRect(frontWindowX - windowWidth / 2, windowY, windowWidth, windowHeight)
    
    //
    // Rear window
    //
    const rearWindowX = speed > 0 ? centerX - roofWidth / 4 : centerX + roofWidth / 4
    ctx.fillRect(rearWindowX - windowWidth / 2, windowY, windowWidth, windowHeight)
    
    //
    // Draw wheels (4 wheels)
    //
    const wheelY = centerY - wheelRadius
    const frontWheelX = centerX + bodyWidth / 3 - bodyWidth / 2
    const rearWheelX = centerX - bodyWidth / 3 + bodyWidth / 2
    
    //
    // Front wheels
    //
    ctx.fillStyle = `rgb(${wheelColor}, ${wheelColor}, ${wheelColor})`
    ctx.beginPath()
    ctx.arc(frontWheelX, wheelY, wheelRadius, 0, Math.PI * 2)
    ctx.fill()
    
    //
    // Rear wheels
    //
    ctx.beginPath()
    ctx.arc(rearWheelX, wheelY, wheelRadius, 0, Math.PI * 2)
    ctx.fill()
    
    //
    // Wheel rims (lighter circles inside)
    //
    const rimRadius = wheelRadius - 3
    ctx.fillStyle = `rgb(${wheelColor + 25}, ${wheelColor + 25}, ${wheelColor + 25})`
    ctx.beginPath()
    ctx.arc(frontWheelX, wheelY, rimRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(rearWheelX, wheelY, rimRadius, 0, Math.PI * 2)
    ctx.fill()
  })
}

/**
 * Creates moving blurred cars on background (sedans/SUVs with wheels, driving on bottom platform)
 * Cars are rendered as blurred sprites using canvas with blur filter
 * @param {Object} k - Kaplay instance
 */
function createMovingCars(k) {
  //
  // Car parameters
  //
  const carCount = 5  // Number of cars
  const platformTopY = k.height() - PLATFORM_BOTTOM_HEIGHT + 17  // Top of bottom platform
  const carSpeedMin = 10  // Minimum speed (px/s) - slower
  const carSpeedMax = 30  // Maximum speed (px/s) - slower
  const gameAreaLeft = PLATFORM_SIDE_WIDTH
  const gameAreaRight = k.width() - PLATFORM_SIDE_WIDTH
  const gameAreaWidth = gameAreaRight - gameAreaLeft
  
  //
  // Create cars moving in different directions
  // Distribute cars horizontally across the platform at start
  //
  for (let i = 0; i < carCount; i++) {
    const direction = Math.random() > 0.5 ? 1 : -1  // Left (-1) or right (1)
    const carSpeed = (carSpeedMin + Math.random() * (carSpeedMax - carSpeedMin)) * direction
    const isSUV = Math.random() > 0.5  // 50% chance of SUV (taller) vs sedan
    const bodyWidth = isSUV ? 80 + Math.random() * 30 : 70 + Math.random() * 30  // 80-110px (SUV) or 70-100px (sedan)
    const bodyHeight = isSUV ? 35 + Math.random() * 10 : 30 + Math.random() * 8  // 35-45px (SUV) or 30-38px (sedan)
    const roofWidth = bodyWidth * 0.6  // Roof is 60% of body width
    const roofHeight = isSUV ? bodyHeight * 0.4 : bodyHeight * 0.5  // Roof height
    const wheelRadius = 10 + Math.random() * 4  // 10-14px radius
    const bodyColor = 50 + Math.random() * 20  // Gray color 50-70
    const roofColor = bodyColor - 15  // Darker roof
    const wheelColor = 30 + Math.random() * 15  // Dark wheels 30-45
    const windowColor = 80 + Math.random() * 20  // Lighter windows 80-100
    
    //
    // Create blurred car sprite
    //
    const carSpriteDataURL = createBlurredCarSprite({
      bodyWidth,
      bodyHeight,
      roofWidth,
      roofHeight,
      wheelRadius,
      bodyColor,
      roofColor,
      wheelColor,
      windowColor,
      speed: carSpeed
    })
    
    //
    // Load sprite
    //
    const spriteId = `car-${Date.now()}-${i}-${Math.random()}`
    k.loadSprite(spriteId, carSpriteDataURL)
    
    //
    // Position car on bottom platform
    // Sprite uses anchor('center'), so we need to position center of sprite correctly
    // Canvas height = roofHeight + bodyHeight + wheelRadius + padding * 2
    // Center Y of canvas = canvasHeight / 2
    // Bottom of wheels in canvas = centerY + wheelRadius (from center of sprite)
    // We want bottom of wheels to be at platformTopY
    //
    const padding = 20
    const canvasHeight = roofHeight + bodyHeight + wheelRadius + padding * 2
    const centerY = canvasHeight - padding - wheelRadius  // Center Y of wheels in canvas
    const carY = platformTopY - (centerY + wheelRadius - canvasHeight / 2)  // Position sprite center so wheels touch platform
    
    //
    // Distribute cars horizontally across the platform at start (not all from edges)
    //
    const startX = gameAreaLeft + (i / (carCount - 1)) * gameAreaWidth + (Math.random() - 0.5) * (gameAreaWidth / carCount)
    
    k.add([
      k.sprite(spriteId),
      k.pos(startX, carY),
      k.anchor('center'),
      k.z(15.6),  // Above city background (15.5) but below analog clock (17) and heroes (20)
      {
        speed: carSpeed,
        bodyWidth: bodyWidth,
        gameAreaLeft: gameAreaLeft,
        gameAreaRight: gameAreaRight,
        update() {
          //
          // Move car horizontally
          //
          this.pos.x += this.speed * k.dt()
          
          //
          // Reset car position when it goes off-screen (wrap around)
          //
          if (this.speed > 0 && this.pos.x > this.gameAreaRight + 100) {
            this.pos.x = this.gameAreaLeft - this.bodyWidth - 100
          } else if (this.speed < 0 && this.pos.x < this.gameAreaLeft - this.bodyWidth - 100) {
            this.pos.x = this.gameAreaRight + 100
          }
        }
      }
    ])
  }
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
        stopTimeSectionMusic()
        //
        // After annihilation, show transition and move to level 1
        //
        createLevelTransition(k, 'level-time.0')
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
    // Create a game object for drawing analog clock
    //
    k.add([
      {
        draw() {
          AnalogClock.draw(analogClock)
        }
      },
      k.z(17)  // Above other elements
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
    // Create small hero icon and life.png image below level indicator letters
    //
    //
    // Create small hero icon and life.png image in top right corner
    //
    const fontSize = 48  // Font size of level indicator letters
    const smallHeroSize = 90  // Increased by 30% (60 * 1.3)
    const lifeImageHeight = 60  // Increased by 30% (30 * 2 * 1.3)
    const spacingBetween = 90  // Spacing between hero and life
    const lifeImageOriginalHeight = 1197  // Original height of life.png
    const rightMargin = 80  // Margin from right edge (80px)
    const topMargin = 30  // Top margin (same as T1ME)
    const smallHeroY = topMargin + fontSize / 2  // Aligned with center of T1ME letters vertically
    
    //
    // Create small hero (2x smaller, static, time section colors)
    // Check completed sections for hero parts (mouth, arms)
    //
    const isWordComplete = get('word', false)
    const isTouchComplete = get('touch', false)
    
    //
    // Position hero and life in top right corner
    //
    const lifeImageX = k.width() - rightMargin - lifeImageHeight / 2  // Life on the right, 80px from edge
    const smallHeroX = lifeImageX - spacingBetween - smallHeroSize / 2  // Hero to the left of life
    
    const smallHero = Hero.create({
      k,
      x: smallHeroX,
      y: smallHeroY,
      type: Hero.HEROES.HERO,
      controllable: false,
      isStatic: true,
      scale: 2.4375,  // Increased by 30% (1.875 * 1.3)
      bodyColor: CFG.visual.colors.hero.body,
      outlineColor: CFG.visual.colors.outline,
      addMouth: isWordComplete,  // Add mouth if word section is complete
      addArms: isTouchComplete  // Add arms if touch section is complete
    })
    smallHero.character.fixed = true  // Fixed position
    smallHero.character.z = CFG.visual.zIndex.ui
    
    //
    // Load and add life.png image (scaled to 2x size, increased by 30%)
    // Positioned in top right corner
    //
    k.loadSprite('life', '/life.png')
    const lifeImageScale = (lifeImageHeight / lifeImageOriginalHeight) * 1.3  // Scale increased by 30%
    k.add([
      k.sprite('life'),
      k.pos(lifeImageX, smallHeroY),  // Same Y as small hero (aligned with T1ME)
      k.scale(lifeImageScale),
      k.anchor('center'),
      k.fixed(),
      k.z(CFG.visual.zIndex.ui)
    ])
    //
    // Create moving blurred cars on background
    //
    createMovingCars(k)
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
      duration: 3,
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
      AnalogClock.onUpdate(analogClock)
    })
    //
    // Create time spikes (digit "1") under the time platform to anti-hero
    //
    const timeSpikes = TimeSpikes.create({
      k,
      startX: 450,  // Start after the time platform
      endX: 1600,   // End near the anti-hero
      y: 823,       // Below the time platform, on the floor level
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
