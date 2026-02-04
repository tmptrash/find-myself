import { CFG } from '../cfg.js'
import { initScene, startTimeSectionMusic } from '../components/scene-helper.js'
import * as Hero from '../../../components/hero.js'
import * as TimePlatform from '../components/time-platform.js'
import * as TimeSpikes from '../components/one-spikes.js'
import * as Sound from '../../../utils/sound.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { set, get } from '../../../utils/progress.js'
import { toPng, parseHex } from '../../../utils/helper.js'

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 150  // Raised top platform (was 250)
const PLATFORM_BOTTOM_HEIGHT = 150  // Raised bottom platform (was 250)
const PLATFORM_SIDE_WIDTH = 192
const CORNER_RADIUS = 20  // Radius for rounded corners of game area
const GROUND_STRIPE_HEIGHT = 5  // Height of ground stripe above bottom platform

/**
 * Flash small hero with color animation
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator instance
 * @param {Object} originalColor - Original color of small hero
 * @param {number} count - Current flash count
 */
function flashSmallHeroLevel1(k, levelIndicator, originalColor, count) {
  if (count >= 20) {
    levelIndicator.smallHero.character.color = originalColor
    return
  }
  //
  // Flash between green and white for visibility
  //
  levelIndicator.smallHero.character.color = count % 2 === 0 ? k.rgb(0, 255, 100) : k.rgb(255, 255, 255)
  k.wait(0.05, () => flashSmallHeroLevel1(k, levelIndicator, originalColor, count + 1))
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
  // Create heart particles flying outward
  //
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.8 + Math.random() * 0.4
    
    const particle = k.add([
      k.text('♥', { size: 20 + Math.random() * 10 }),
      k.pos(heroX, heroY),
      k.color(255, 100 + Math.random() * 100, 100 + Math.random() * 100),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
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
      //
      // Move outward
      //
      particle.pos.x += Math.cos(angle) * speed * k.dt()
      particle.pos.y += Math.sin(angle) * speed * k.dt()
      //
      // Fade out
      //
      particle.opacity = 1 - (elapsed / lifetime)
    })
  }
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
  k.loadSprite('corner-sprite-level1', cornerDataURL)
  //
  // Top-left corner (rotate 0°)
  //
  k.add([
    k.sprite('corner-sprite-level1'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, PLATFORM_TOP_HEIGHT - CORNER_RADIUS),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
  //
  // Top-right corner (rotate 90°)
  //
  k.add([
    k.sprite('corner-sprite-level1'),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH + CORNER_RADIUS, PLATFORM_TOP_HEIGHT - CORNER_RADIUS),
    k.rotate(90),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
  //
  // Bottom-left corner (rotate 270°)
  //
  k.add([
    k.sprite('corner-sprite-level1'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, k.height() - PLATFORM_BOTTOM_HEIGHT + CORNER_RADIUS),
    k.rotate(270),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
  //
  // Bottom-right corner (rotate 180°)
  //
  k.add([
    k.sprite('corner-sprite-level1'),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH + CORNER_RADIUS, k.height() - PLATFORM_BOTTOM_HEIGHT + CORNER_RADIUS),
    k.rotate(180),
    k.z(CFG.visual.zIndex.platforms + 1),
    k.anchor('topleft')
  ])
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
  const carSpeedMin = 20  // Minimum speed (px/s) - slower
  const carSpeedMax = 50  // Maximum speed (px/s) - slower
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
    // Distribute cars horizontally across the platform at start (not all from edges)
    //
    const startX = gameAreaLeft + (i / (carCount - 1)) * gameAreaWidth + (Math.random() - 0.5) * (gameAreaWidth / carCount)
    
    k.add([
      k.sprite(spriteId),
      k.pos(startX, carY),
      k.anchor('center'),
      k.z(15.6),  // Above city background (15.5) but below heroes (20)
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
//
// Level geometry - two platforms connected by stairs
//
const BOTTOM_PLATFORM_TOP = 1080 - PLATFORM_BOTTOM_HEIGHT  // 930
const FIRST_FLOOR_FLOOR_Y = 700   // Raised first floor (was 910)
const SECOND_FLOOR_FLOOR_Y = 400  // Raised second floor (was 554)
//
// Lower platform: narrow platform in left part of screen
//
const LOWER_PLATFORM_START_X = PLATFORM_SIDE_WIDTH  // Left wall (192)
//
// Hero spawn positions
//
const HERO_SPAWN_X = LOWER_PLATFORM_START_X + 60  // Left side of lower platform, moved right 50px (was +10)
const HERO_SPAWN_Y = FIRST_FLOOR_FLOOR_Y - 50
const ANTIHERO_CLOCK_PLATFORM_X = PLATFORM_SIDE_WIDTH + 65  // Clock platform position, moved right 50px (was +15)
const ANTIHERO_SPAWN_X = ANTIHERO_CLOCK_PLATFORM_X  // Standing on clock platform
const ANTIHERO_SPAWN_Y = SECOND_FLOOR_FLOOR_Y - 50  // Standing on clock platform
/**
 * Time section level 1 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel1(k) {
  k.scene("level-time.1", () => {
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-time.1')
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start background music (only if not already playing)
    // Note: kids.mp3 and time.mp3 persist across level reloads
    //
    startTimeSectionMusic(k, true)
    //
    // Start clock.mp3 locally (restarts on each level load for synchronization)
    //
    Sound.playInScene(k, 'clock', CFG.audio.backgroundMusic.clock, true)
    //
    // Initialize level with heroes and platforms (skip default platforms)
    //
    const { hero, antiHero, levelIndicator } = initScene({
      k,
      levelName: 'level-time.1',
      levelNumber: 2,
      skipPlatforms: true,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      onAnnihilation: () => {
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
          flashSmallHeroLevel1(k, levelIndicator, originalColor, 0)
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
          // Move to next level with transition
          //
          createLevelTransition(k, 'level-time.1')
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
    // Add city background (preloaded sprite)
    //
    k.add([
      k.sprite('city-background-level1'),
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
    createMovingCars(k)
    //
    // Create custom platforms for two-floor level
    //
    createLevelPlatforms(k, sound)
    //
    // Create clock platform (persistent, shows seconds only) under hero
    //
    const clockPlatformX = LOWER_PLATFORM_START_X + 65  // Moved right by 50px (was +15)
    const clockPlatform = TimePlatform.create({
      k,
      x: clockPlatformX,
      y: FIRST_FLOOR_FLOOR_Y,
      hero,
      persistent: true,
      showSecondsOnly: true,
      initialTime: 0,  // Always show 00
      staticTime: true,  // Never update time (always show 00)
      duration: 0,  // Not used for persistent platforms
      sfx: sound,
      enableColorChange: true,
      levelIndicator
    })
    //
    // Create clock platform (persistent, shows seconds only) under anti-hero
    //
    const antiHeroClockPlatform = TimePlatform.create({
      k,
      x: ANTIHERO_CLOCK_PLATFORM_X,
      y: SECOND_FLOOR_FLOOR_Y,
      hero: antiHero,  // Pass antiHero for collision detection
      persistent: true,
      showSecondsOnly: true,
      duration: 0,  // Not used for persistent platforms
      sfx: sound,
      enableColorChange: true,
      levelIndicator
    })
    //
    // Create clock platforms to the right of hero (kill on digit 1)
    // Initial times: 02, 05, 10, 15, 20, 25, 30, ...
    //
    const PLATFORM_SPACING = 180  // Distance between platform centers (increased to prevent skipping platforms)
    const PLATFORM_WIDTH_SECONDS_ONLY = 60  // Width for XX format
    const PLATFORM_VERTICAL_OFFSET = 60  // Maximum vertical offset from base level
    const RIGHT_WALL_X = k.width() - PLATFORM_SIDE_WIDTH
    const clockPlatforms = []
    let lastLowerPlatform = null  // Store reference to last lower platform
    
    let platformX = clockPlatformX + PLATFORM_SPACING
    let initialTime = 2  // Start with 02
    let platformIndex = 0  // Index for vertical variation pattern
    let lastPlatformX = platformX  // Store last platform X position
    
    //
    // Create lower platforms (first floor) until we reach near the right wall
    //
    while (platformX + PLATFORM_WIDTH_SECONDS_ONLY / 2 < RIGHT_WALL_X - 20) {
      //
      // Check if this will be the last or second-to-last platform before right wall
      //
      const isLastLowerPlatform = (platformX + PLATFORM_SPACING + PLATFORM_WIDTH_SECONDS_ONLY / 2 >= RIGHT_WALL_X - 20)
      const isSecondToLastLowerPlatform = (platformX + 2 * PLATFORM_SPACING + PLATFORM_WIDTH_SECONDS_ONLY / 2 >= RIGHT_WALL_X - 20) && !isLastLowerPlatform
      
      //
      // Calculate vertical offset - last platform is elevated to transition to upper level
      //
      let verticalOffset
      let platformY
      
      if (isLastLowerPlatform) {
        //
        // Last lower platform: elevated halfway between first and second floor
        //
        const transitionHeight = FIRST_FLOOR_FLOOR_Y - (FIRST_FLOOR_FLOOR_Y - SECOND_FLOOR_FLOOR_Y) / 2
        platformY = transitionHeight + 40  // Move down by 40px
      } else if (isSecondToLastLowerPlatform) {
        //
        // Second-to-last lower platform: move down slightly
        //
        verticalOffset = Math.sin(platformIndex * 0.8) * PLATFORM_VERTICAL_OFFSET
        platformY = FIRST_FLOOR_FLOOR_Y + verticalOffset + 25  // Move down by 25px
      } else {
        //
        // Normal lower platforms: sine wave variation
        //
        verticalOffset = Math.sin(platformIndex * 0.8) * PLATFORM_VERTICAL_OFFSET
        platformY = FIRST_FLOOR_FLOOR_Y + verticalOffset
      }
      //
      // Third platform (platformIndex === 1) should always show 22 and never change
      //
      const isThirdPlatform = platformIndex === 1
      const platformInitialTime = isThirdPlatform ? 22 : initialTime
      const isStaticTime = isThirdPlatform
      //
      // Adjust X position for last lower platform (move left)
      //
      let adjustedPlatformX = platformX
      if (isLastLowerPlatform) {
        adjustedPlatformX -= 20  // Move left by 20px
      }
      
      const platform = TimePlatform.create({
        k,
        x: adjustedPlatformX,
        y: platformY,
        hero,
        persistent: true,
        showSecondsOnly: true,
        initialTime: platformInitialTime,
        staticTime: isStaticTime,  // Third platform never changes time
        killOnOne: true,  // Kill hero when time contains digit 1
        currentLevel: 'level-time.1',
        duration: 0,  // Not used for persistent platforms
        sfx: sound,
        enableColorChange: true,
        levelIndicator
      })
      
      clockPlatforms.push(platform)
      
      //
      // Store reference to last lower platform
      //
      if (isLastLowerPlatform) {
        lastLowerPlatform = platform
      }
      
      //
      // Store last platform position for upper level
      //
      lastPlatformX = adjustedPlatformX  // Use adjusted X position for upper platform start
      
      //
      // Move to next platform position
      //
      platformX += PLATFORM_SPACING
      platformIndex++
      
      //
      // Calculate next initial time: 2, 5, 10, 15, 20, 25, 30, ...
      //
      if (initialTime === 2) {
        initialTime = 5
      } else if (initialTime === 5) {
        initialTime = 10
      } else {
        initialTime += 5
      }
    }
    //
    // Create upper platforms (second floor) from last lower platform to anti-hero
    // Moving from right to left
    //
    const UPPER_PLATFORM_VERTICAL_OFFSET = 80  // Larger vertical variation for upper platforms
    let upperPlatformX = lastPlatformX  // Start from last lower platform X position
    let upperPlatformIndex = 0
    let upperInitialTime = initialTime  // Continue time sequence from lower platforms
    const upperPlatforms = []  // Store all upper platforms to show them later
    
    //
    // Create platforms until we reach anti-hero position
    //
    while (upperPlatformX - PLATFORM_WIDTH_SECONDS_ONLY / 2 > ANTIHERO_CLOCK_PLATFORM_X + PLATFORM_WIDTH_SECONDS_ONLY) {
      //
      // Skip first platform (rightmost upper platform) - we'll create fewer platforms
      //
      if (upperPlatformIndex === 0) {
        //
        // Skip first iteration but update counters
        //
        upperPlatformX -= PLATFORM_SPACING
        upperPlatformIndex++
        upperInitialTime += 5
        continue
      }
      //
      // Calculate vertical offset for upper platforms
      //
      const verticalOffset = Math.sin(upperPlatformIndex * 0.7) * UPPER_PLATFORM_VERTICAL_OFFSET
      let platformY = SECOND_FLOOR_FLOOR_Y + verticalOffset
      let platformX = upperPlatformX
      //
      // Check if this is one of the last two leftmost platforms
      // Calculate distance to anti-hero position
      //
      const distanceToAntiHero = upperPlatformX - (ANTIHERO_CLOCK_PLATFORM_X + PLATFORM_WIDTH_SECONDS_ONLY)
      const isLastTwoLeftmost = distanceToAntiHero <= PLATFORM_SPACING * 2.5  // Last two platforms (within 2.5 spacing distances)
      //
      // Adjust first created platform (second in original sequence, now rightmost upper)
      // Move it right and down to make it jumpable from lower platform
      //
      const isRightmostPlatform = upperPlatformIndex === 1
      if (isRightmostPlatform) {
        platformX += 40  // Move right by 40px (reduced from 80 to move left)
        platformY += 60  // Move down by 60px (increased from 15 to lower it more)
      } else if (isLastTwoLeftmost) {
        //
        // Lower the last two leftmost platforms
        //
        platformY += 80  // Move down by 80px
      }
      
      const platform = TimePlatform.create({
        k,
        x: platformX,
        y: platformY,
        hero,
        persistent: true,
        showSecondsOnly: true,
        initialTime: isRightmostPlatform ? 33 : upperInitialTime,  // Rightmost platform shows 33
        staticTime: isRightmostPlatform,  // Rightmost platform time never changes
        killOnOne: !isRightmostPlatform,  // Rightmost platform doesn't kill hero
        currentLevel: 'level-time.1',
        duration: 0,  // Not used for persistent platforms
        sfx: sound,
        hidden: true,  // Hide text initially
        enableColorChange: true,
        levelIndicator
      })
      
      clockPlatforms.push(platform)
      upperPlatforms.push(platform)  // Store for later showing
      
      //
      // Move to next platform position (going left)
      //
      upperPlatformX -= PLATFORM_SPACING
      upperPlatformIndex++
      
      //
      // Continue time sequence
      //
      upperInitialTime += 5
    }
    //
    // Track if upper platforms have been shown
    //
    let upperPlatformsShown = false
    
    //
    // Update clock platforms
    //
    k.onUpdate(() => {
      TimePlatform.onUpdate(clockPlatform)
      TimePlatform.onUpdate(antiHeroClockPlatform)
      clockPlatforms.forEach(platform => {
        TimePlatform.onUpdate(platform)
      })
      
      //
      // Check if hero reached last lower platform and show upper platforms
      //
      if (!upperPlatformsShown && lastLowerPlatform && hero && hero.character) {
        //
        // Check if hero is on the last lower platform
        //
        if (lastLowerPlatform.platform.isColliding(hero.character) && hero.character.isGrounded()) {
          //
          // Show all upper platforms
          //
          upperPlatforms.forEach(platform => {
            TimePlatform.show(platform)
          })
          upperPlatformsShown = true
        }
      }
    })
    //
    // Create time spikes (digit "1") at bottom invisible platform level
    //
    const timeSpikes = TimeSpikes.create({
      k,
      startX: PLATFORM_SIDE_WIDTH + 10,  // Start from left wall + 10px (moved right)
      endX: k.width() - PLATFORM_SIDE_WIDTH - 20,  // End closer to right wall (added one more spike)
      y: BOTTOM_PLATFORM_TOP - 10,  // At bottom invisible platform level (910)
      hero,
      currentLevel: 'level-time.1',
      digitCount: 50,  // Increased to make spikes closer together
      fakeDigitCount: 0,  // All spikes cut (no fake spikes)
      sfx: sound,
      levelIndicator
    })
    //
    // Spawn hero immediately
    //
    Hero.spawn(hero)
    //
    // Spawn anti-hero after delay
    //
    k.wait(1.0, () => {
      Hero.spawn(antiHero)
    })
  })
}

/**
 * Creates all platforms for level 1 (two-floor corridor)
 * @param {Object} k - Kaplay instance
 * @param {Object} sound - Sound instance
 */
function createLevelPlatforms(k, sound) {
  const backgroundPlatformColor = k.Color.fromHex(CFG.visual.colors.platform)
  const visiblePlatformColor = k.Color.fromHex("#707070")  // Lighter gray for visible platforms
  
  //
  // Top platform (ceiling for entire level)
  //
  k.add([
    k.rect(k.width(), PLATFORM_TOP_HEIGHT),
    k.pos(0, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(backgroundPlatformColor),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  
  //
  // Bottom platform (floor for entire level)
  //
  k.add([
    k.rect(k.width(), PLATFORM_BOTTOM_HEIGHT),
    k.pos(0, k.height() - PLATFORM_BOTTOM_HEIGHT),
    k.area(),
    k.body({ isStatic: true }),
    k.color(backgroundPlatformColor),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  
  //
  // Left wall
  //
  k.add([
    k.rect(PLATFORM_SIDE_WIDTH, k.height()),
    k.pos(0, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(backgroundPlatformColor),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  
  //
  // Right wall
  //
  k.add([
    k.rect(PLATFORM_SIDE_WIDTH, k.height()),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH, 0),
    k.area(),
    k.body({ isStatic: true }),
    k.color(backgroundPlatformColor),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
}

