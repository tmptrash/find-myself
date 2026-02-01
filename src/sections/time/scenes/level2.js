import { CFG } from '../cfg.js'
import { initScene, stopTimeSectionMusic } from '../utils/scene.js'
import * as Hero from '../../../components/hero.js'
import * as TimePlatform from '../components/time-platform.js'
import * as TimeSpikes from '../components/time-spikes.js'
import * as Sound from '../../../utils/sound.js'
import { set, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as CityBackground from '../components/city-background.js'
import * as LevelIndicator from '../components/level-indicator.js'
//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 150
const PLATFORM_BOTTOM_HEIGHT = 150
const PLATFORM_SIDE_WIDTH = 50  // Reduced from 192 to 50 for more space
//
// Hero size (approximately)
//
const HERO_HEIGHT = 96  // SPRITE_SIZE (32) * HERO_SCALE (3)
//
// Level geometry
//
const FLOOR_Y = 700
//
// Hero spawn positions
//
const HERO_SPAWN_X = PLATFORM_SIDE_WIDTH + 100
const HERO_SPAWN_Y = FLOOR_Y - 50
//
// Anti-hero will spawn on a far left platform at higher altitude
// Increased platform count to push anti-hero platform to the far left
//
const FINAL_PLATFORM_INDEX = 28

/**
 * Time section level 2 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel2(k) {
  k.scene("level-time.2", () => {
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-time.2')
    //
    // Stop previous level music (kids.mp3, time.mp3 and clock.mp3 from level 1)
    //
    stopTimeSectionMusic()
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start time.mp3, kids.mp3 and clock.mp3 background music
    //
    const timeMusic = Sound.playInScene(k, 'time', CFG.audio.backgroundMusic.time, true)
    const kidsMusic = Sound.playInScene(k, 'time0-kids', CFG.audio.backgroundMusic.kids, true)
    const clockMusic = Sound.playInScene(k, 'clock', CFG.audio.backgroundMusic.clock, true)
    //
    // Calculate anti-hero position (on final platform)
    // Create the platform FIRST, then position hero above it
    // Lower the platform by 2 hero heights
    //
    const antiHeroPos = getPlatformPosition(FINAL_PLATFORM_INDEX, k)
    const PLATFORM_Y_OFFSET = HERO_HEIGHT * 2  // Lower by 2 hero heights (192px)
    const finalPlatformY = antiHeroPos.y + PLATFORM_Y_OFFSET
    //
    // Create final platform under anti-hero BEFORE creating heroes
    //
    const finalPlatform = TimePlatform.create({
      k,
      x: antiHeroPos.x,
      y: finalPlatformY,
      hero: null,  // Will set hero reference later
      persistent: true,
      showSecondsOnly: true,
      initialTime: 0,
      staticTime: true,
      duration: 0,
      sfx: sound,
      killOnOne: false
    })
    //
    // Make sure final platform and its text are visible with high z-index
    //
    finalPlatform.platform.z = 15
    finalPlatform.timerText.z = 20
    finalPlatform.timerText.opacity = 1
    finalPlatform.outlineTexts.forEach(outline => {
      outline.z = 20
      outline.opacity = 1
    })
    //
    // Calculate anti-hero spawn position above the platform
    //
    const antiHeroSpawnY = finalPlatformY - HERO_HEIGHT
    //
    // Initialize level with heroes and platforms
    //
    const { hero, antiHero } = initScene({
      k,
      levelName: 'level-time.2',
      levelNumber: 3,
      skipPlatforms: true,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: antiHeroPos.x,
      antiHeroY: antiHeroSpawnY,
      onAnnihilation: () => {
        //
        // Stop all music before leaving
        //
        timeMusic.stop()
        kidsMusic.stop()
        clockMusic.stop()
        //
        // Move to level 3
        //
        k.go('level-time.3')
      }
    })
    
    //
    // Show anti-hero immediately (don't hide)
    //
    antiHero.character.z = 20
    hero.character.z = 20
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
    // Add city background (preloaded sprite)
    //
    k.add([
      k.sprite('city-background-level2'),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height / 2),
      k.anchor('center'),
      k.z(14)  // Behind platforms (15) and snow (14.5)
    ])
    //
    // Create custom platforms for this level
    //
    createLevelPlatforms(k, sound)
    //
    // Create small hero icon and life.png image below level indicator letters
    // Hero centered on letter T, dropped down by half of small hero height
    //
    const levelIndicatorY = PLATFORM_TOP_HEIGHT - 48 - 10  // Same Y as level indicator letters
    const levelIndicatorStartX = PLATFORM_SIDE_WIDTH + 20  // Same X as level indicator start
    const fontSize = 48  // Font size of level indicator letters
    const letterSpacing = -5  // Letter spacing
    const letterT_X = levelIndicatorStartX  // X position of letter T (first letter)
    const letterT_CenterX = letterT_X + fontSize / 2  // Center X of letter T
    const smallHeroSize = 66  // Increased by 10% (60 * 1.1)
    const smallHeroDropDown = smallHeroSize / 2  // Drop down by half of hero height
    const lifeImageHeight = 60  // Increased by 2x (30 * 2), center stays at same Y
    const heroOffsetLeft = -15  // Move hero left
    const spacingBetween = 70  // Increased spacing to move life further right
    const lifeImageOriginalHeight = 1197  // Original height of life.png
    
    //
    // Create small hero (2x smaller, static, time section colors)
    // Check completed sections for hero parts (mouth, arms)
    //
    const isWordComplete = get('word', false)
    const isTouchComplete = get('touch', false)
    
    const smallHeroY = levelIndicatorY + fontSize + smallHeroDropDown  // Below letters, dropped by half hero height
    const smallHero = Hero.create({
      k,
      x: letterT_CenterX + heroOffsetLeft,  // Moved left from center of letter T
      y: smallHeroY,
      type: Hero.HEROES.HERO,
      controllable: false,
      isStatic: true,
      scale: 2.0625,  // Increased by 10% (1.875 * 1.1)
      bodyColor: CFG.visual.colors.hero.body,
      outlineColor: CFG.visual.colors.outline,
      addMouth: isWordComplete,  // Add mouth if word section is complete
      addArms: isTouchComplete  // Add arms if touch section is complete
    })
    smallHero.character.fixed = true  // Fixed position
    smallHero.character.z = CFG.visual.zIndex.ui
    
    //
    // Load and add life.png image (scaled to 2x size, increased by 10%, center stays at same Y)
    // Positioned to the right of small hero at the same vertical level
    //
    k.loadSprite('life', '/life.png')
    const lifeImageX = letterT_CenterX + smallHeroSize / 2 + spacingBetween + heroOffsetLeft
    const lifeImageScale = (lifeImageHeight / lifeImageOriginalHeight) * 1.1  // Scale to 60px height * 1.1 (increased by 10%)
    k.add([
      k.sprite('life'),
      k.pos(lifeImageX, smallHeroY),  // Same Y as small hero (center stays at same vertical position)
      k.scale(lifeImageScale),
      k.anchor('center'),
      k.fixed(),
      k.z(CFG.visual.zIndex.ui)
    ])
    //
    // Create clouds under top platform (where snow falls from)
    //
    createCloudsUnderTopPlatform(k)
    //
    // Create snow particle system
    //
    const snowSystem = createSnowParticles(k)
    //
    // Update snow particles
    //
    k.onUpdate(() => {
      updateSnowParticles(snowSystem)
    })
    //
    // Draw snow particles (using k.add with draw method for proper z-index)
    //
    k.add([
      {
        draw() {
          drawSnowParticles(snowSystem)
        }
      },
      k.z(16)  // Above platforms (15) and city background (14) but below hero (20)
    ])
    //
    // Create time spikes (digit "1") at bottom platform level
    //
    const timeSpikes = TimeSpikes.create({
      k,
      startX: PLATFORM_SIDE_WIDTH + 10,  // Start from left wall + 10px
      endX: k.width() - PLATFORM_SIDE_WIDTH - 10,  // End at right wall - 10px
      y: k.height() - PLATFORM_BOTTOM_HEIGHT - 10,  // Higher, partially in snow
      hero,
      currentLevel: 'level-time.2',
      digitCount: 50,  // Many spikes close together
      fakeDigitCount: 0,  // All spikes kill (no bunnies)
      sfx: sound
    })
    //
    // Create snow drifts on bottom platform floor
    //
    createSnowDrifts(k)
    //
    // Create dynamic platform system
    //
    const platformSystem = createPlatformSystem(k, sound, hero, antiHero)
    //
    // Update hero reference in final platform
    //
    finalPlatform.hero = antiHero
    //
    // Spawn hero immediately
    //
    Hero.spawn(hero)
    //
    // Spawn anti-hero immediately (no delay)
    //
    Hero.spawn(antiHero)
  })
}

/**
 * Check if sum of digits is even
 * @param {number} seconds - Current seconds (0-59)
 * @returns {boolean} True if sum is even
 */
function isSumEven(seconds) {
  const digit1 = Math.floor(seconds / 10)
  const digit2 = seconds % 10
  const sum = digit1 + digit2
  return sum % 2 === 0
}

/**
 * Calculate platform position based on index
 * @param {number} index - Platform index
 * @param {Object} k - Kaplay instance
 * @returns {Object} {x, y} position
 */
function getPlatformPosition(index, k) {
  const startX = PLATFORM_SIDE_WIDTH + 100
  const startY = 750  // Lowered from 700 to 750
  const horizontalSpacing = 140  // Distance between platforms horizontally
  const verticalVariation = 20   // Small vertical variation (can go up or down)
  const rightWallX = k.width() - PLATFORM_SIDE_WIDTH - 100
  const leftWallX = PLATFORM_SIDE_WIDTH + 80  // Minimum X position (near left wall)
  //
  // Calculate X position - move right until reaching the wall
  //
  const x = startX + index * horizontalSpacing
  //
  // If we've reached the right wall, start going left and higher
  //
  if (x >= rightWallX) {
    const overshoot = index - Math.floor((rightWallX - startX) / horizontalSpacing)
    const leftX = rightWallX - overshoot * (horizontalSpacing + 30)  // Extra 30px left
    return {
      x: Math.max(leftX, leftWallX),  // Don't go past left wall
      y: startY - (index * 5) - (overshoot * 25)  // Reduced vertical rise
    }
  }
  //
  // Calculate Y with gentle wave pattern (sometimes up, sometimes down)
  //
  const wave = Math.sin(index * 0.5) * verticalVariation
  const gradualRise = index * 5  // Reduced upward slope (was 8)
  
  return {
    x: x,
    y: startY - gradualRise + wave
  }
}

/**
 * Create hearts display above hero
 * @param {Object} inst - Platform system instance
 */
function createHearts(inst) {
  const { k } = inst
  
  //
  // Initialize hearts array
  //
  inst.hearts = []
  
  //
  // Create outline offsets for black outline (thicker outline with larger size)
  //
  const outlineOffsets = [
    [-4, -4], [-3, -4], [-2, -4], [-1, -4], [0, -4], [1, -4], [2, -4], [3, -4], [4, -4],
    [-4, -3], [-3, -3], [-2, -3], [-1, -3], [0, -3], [1, -3], [2, -3], [3, -3], [4, -3],
    [-4, -2], [-3, -2], [-2, -2], [-1, -2], [0, -2], [1, -2], [2, -2], [3, -2], [4, -2],
    [-4, -1], [-3, -1], [-2, -1], [-1, -1], [0, -1], [1, -1], [2, -1], [3, -1], [4, -1],
    [-4, 0],  [-3, 0],  [-2, 0],  [-1, 0],           [1, 0],  [2, 0],  [3, 0],  [4, 0],
    [-4, 1],  [-3, 1],  [-2, 1],  [-1, 1],  [0, 1],  [1, 1],  [2, 1],  [3, 1],  [4, 1],
    [-4, 2],  [-3, 2],  [-2, 2],  [-1, 2],  [0, 2],  [1, 2],  [2, 2],  [3, 2],  [4, 2],
    [-4, 3],  [-3, 3],  [-2, 3],  [-1, 3],  [0, 3],  [1, 3],  [2, 3],  [3, 3],  [4, 3],
    [-4, 4],  [-3, 4],  [-2, 4],  [-1, 4],  [0, 4],  [1, 4],  [2, 4],  [3, 4],  [4, 4]
  ]
  
  //
  // Create 3 hearts with black outline
  //
  for (let i = 0; i < 3; i++) {
    //
    // Create outline hearts (black, slightly larger for better visibility)
    //
    const outlineHearts = outlineOffsets.map(([ox, oy]) => {
      return k.add([
        k.text('♥', {
          size: 22,  // Slightly larger than main heart for better outline visibility
          font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
          align: "center"
        }),
        k.pos(ox, oy),
        k.anchor("center"),
        k.color(0, 0, 0),  // Black outline
        k.z(CFG.visual.zIndex.ui - 1),  // Behind main heart
        k.opacity(1)
      ])
    })
    
    //
    // Create main heart (yellow, same as anti-hero)
    //
    const heart = k.add([
      k.text('♥', {
        size: 20,
        font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
        align: "center"
      }),
      k.pos(0, 0),
      k.anchor("center"),
      k.color(255, 140, 0),  // Orange/yellow heart (same as anti-hero #FF8C00)
      k.z(CFG.visual.zIndex.ui),
      k.opacity(1),
      {
        outlineHearts: outlineHearts
      }
    ])
    inst.hearts.push(heart)
  }
  
  //
  // Update hearts position
  //
  updateHeartsPosition(inst)
}

/**
 * Update hearts position above hero
 * @param {Object} inst - Platform system instance
 */
function updateHeartsPosition(inst) {
  const { k, hero } = inst
  
  if (!inst.hearts || !hero || !hero.character) return
  
  //
  // Position hearts above hero
  //
  const heartsY = hero.character.pos.y - 60
  const heartsX = hero.character.pos.x
  const heartSpacing = 25  // Space between hearts
  
  //
  // Count visible hearts (hearts that should be shown)
  //
  const visibleHeartsCount = inst.attemptsRemaining
  
  //
  // Center only visible hearts horizontally relative to hero position
  // Calculate start position so visible hearts are centered
  //
  const totalWidth = visibleHeartsCount > 0 ? (visibleHeartsCount - 1) * heartSpacing : 0
  const startX = heartsX - totalWidth / 2
  
  //
  // Position visible hearts centered, ignoring hidden ones
  //
  let visibleIndex = 0
  inst.hearts.forEach((heart, index) => {
    if (heart && heart.exists()) {
      //
      // Only position visible hearts (those that should be shown)
      //
      if (index < visibleHeartsCount) {
        const heartX = startX + visibleIndex * heartSpacing
        heart.pos.x = heartX
        heart.pos.y = heartsY
        
        //
        // Update outline hearts position
        //
        if (heart.outlineHearts) {
          heart.outlineHearts.forEach((outlineHeart) => {
            if (outlineHeart && outlineHeart.exists()) {
              outlineHeart.pos.x = heartX
              outlineHeart.pos.y = heartsY
            }
          })
        }
        visibleIndex++
      }
    }
  })
}

/**
 * Update hearts display based on remaining attempts
 * @param {Object} inst - Platform system instance
 */
function updateHearts(inst) {
  const { k } = inst
  
  if (!inst.hearts) {
    createHearts(inst)
    return
  }
  
  //
  // Hide hearts that exceed attempts remaining
  //
  inst.hearts.forEach((heart, index) => {
    if (heart && heart.exists()) {
      const opacity = index < inst.attemptsRemaining ? 1 : 0
      heart.opacity = opacity
      
      //
      // Update outline hearts opacity
      //
      if (heart.outlineHearts) {
        heart.outlineHearts.forEach((outlineHeart) => {
          if (outlineHeart && outlineHeart.exists()) {
            outlineHeart.opacity = opacity
          }
        })
      }
    }
  })
  
  //
  // Update position
  //
  updateHeartsPosition(inst)
}

/**
 * Hide/destroy hearts when hero dies
 * @param {Object} inst - Platform system instance
 */
function destroyHearts(inst) {
  const { k } = inst
  
  if (!inst.hearts) return
  
  inst.hearts.forEach((heart) => {
    if (heart && heart.exists()) {
      //
      // Destroy outline hearts
      //
      if (heart.outlineHearts) {
        heart.outlineHearts.forEach((outlineHeart) => {
          if (outlineHeart && outlineHeart.exists()) {
            k.destroy(outlineHeart)
          }
        })
      }
      //
      // Destroy main heart
      //
      k.destroy(heart)
    }
  })
  
  inst.hearts = null
}

/**
 * Creates dynamic platform system
 * @param {Object} k - Kaplay instance
 * @param {Object} sound - Sound instance
 * @param {Object} hero - Hero instance
 * @param {Object} antiHero - Anti-hero instance
 * @returns {Object} Platform system instance
 */
function createPlatformSystem(k, sound, hero, antiHero) {
  const platforms = []
  let currentPlatformIndex = 0
  let nextPlatform = null
  //
  // Create starting platform with 00
  //
  const startPos = getPlatformPosition(0, k)
  const startPlatform = TimePlatform.create({
    k,
    x: startPos.x,
    y: startPos.y,
    hero,
    persistent: true,
    showSecondsOnly: true,
    initialTime: 0,
    staticTime: false,  // Let time tick on the platform
    duration: 0,
    sfx: sound
  })
  platforms.push({
    inst: startPlatform,
    index: 0,
    timeOffset: 0,  // No offset for starting platform
    ageInSeconds: 0,  // How many seconds platform has existed
    maxDarkening: 12,  // Maximum darkenings before disappearing
    lastGlobalTime: 0  // Track last global time to detect second changes
  })
  
  const inst = {
    k,
    sound,
    hero,
    antiHero,
    platforms,
    currentPlatformIndex,
    nextPlatform,
    globalTime: 0,  // Global time in seconds that all platforms sync to
    globalTimer: 0,  // Timer to track seconds
    attemptsRemaining: 3,  // Number of wrong platform attempts remaining (starts at 3)
    hearts: null,  // Array of heart objects showing remaining attempts
    lastErrorTime: 0  // Track when last error occurred to prevent multiple triggers
  }
  
  //
  // Ensure attempts counter is properly initialized
  //
  if (inst.attemptsRemaining <= 0 || inst.attemptsRemaining > 3) {
    inst.attemptsRemaining = 3
  }
  //
  // Create hearts display
  //
  createHearts(inst)
  updateHearts(inst)
  //
  // DEBUG: Create all platforms at once for visualization
  //
  const DEBUG_SHOW_ALL_PLATFORMS = false
  if (DEBUG_SHOW_ALL_PLATFORMS) {
    for (let i = 1; i < FINAL_PLATFORM_INDEX - 7; i++) {
      const pos = getPlatformPosition(i, k)
      const randomOffset = Math.floor(Math.random() * 60)
      const platform = TimePlatform.create({
        k,
        x: pos.x,
        y: pos.y,
        hero,
        persistent: true,
        showSecondsOnly: true,
        initialTime: randomOffset,
        staticTime: false,
        duration: 0,
        sfx: sound
      })
      platforms.push({
        inst: platform,
        index: i,
        timeOffset: randomOffset,
        ageInSeconds: 0,
        maxDarkening: Math.max(12 - Math.floor(i / 6), 1),
        lastGlobalTime: 0
      })
    }
  } else {
    //
    // Create initial next platform
    //
    createNextPlatform(inst)
  }
  //
  // Update function called every frame
  //
  k.onUpdate(() => {
    //
    // Check if hero is dead or doesn't exist - hide hearts
    //
    if (!hero || !hero.character || !hero.character.exists()) {
      if (inst.hearts) {
        destroyHearts(inst)
      }
      return
    }
    
    //
    // Update hearts position above hero
    //
    updateHeartsPosition(inst)
    
    //
    // Update global timer
    //
    inst.globalTimer += k.dt()
    if (inst.globalTimer >= 1.0) {
      inst.globalTimer -= 1.0
      inst.globalTime++
      if (inst.globalTime >= 60) {
        inst.globalTime = 0
      }
    }
    //
    // Sync all current platforms to global time + their offset
    // Age and darken ONLY the current platform (last one hero is standing on)
    //
    inst.platforms.forEach((p, index) => {
      if (!p.inst.isDestroyed) {
        //
        // Safe platforms (3rd, 5th, 7th, 9th, etc.) always show "00"
        //
        if (p.isSafePlatform) {
          p.inst.currentTime = 0
          const timeText = "00"
          p.inst.timerText.text = timeText
          p.inst.outlineTexts.forEach(outline => {
            outline.text = timeText
          })
        } else {
          const platformTime = (inst.globalTime + p.timeOffset) % 60
          p.inst.currentTime = platformTime
          const timeText = platformTime.toString().padStart(2, '0')
          p.inst.timerText.text = timeText
          p.inst.outlineTexts.forEach(outline => {
            outline.text = timeText
          })
        }
        //
        // Only age and darken the current platform (last one)
        //
        const isCurrentPlatform = index === inst.platforms.length - 1
        if (isCurrentPlatform) {
          //
          // Age the platform every second
          //
          if (p.lastGlobalTime !== inst.globalTime) {
            p.lastGlobalTime = inst.globalTime
            p.ageInSeconds++
            //
            // Darken towards black (0, 0, 0)
            // 192 / 10 ≈ 19 per second
            //
            const brightness = Math.max(192 - (p.ageInSeconds * 19), 0)
            p.inst.timerText.color = k.rgb(brightness, brightness, brightness)
            //
            // Keep outline black
            //
            p.inst.outlineTexts.forEach(outline => {
              outline.color = k.rgb(0, 0, 0)
            })
            //
            // Destroy platform if it has aged too much
            //
            if (p.ageInSeconds >= p.maxDarkening) {
              TimePlatform.destroy(p.inst)
            }
          }
        }
      }
    })
    //
    // Sync next platform with its offset (but don't age or darken it)
    // Safe platforms always show "00"
    //
    if (inst.nextPlatform && !inst.nextPlatform.inst.isDestroyed) {
      if (inst.nextPlatform.isSafePlatform) {
        //
        // Safe platforms always show "00"
        //
        inst.nextPlatform.inst.currentTime = 0
        const timeText = "00"
        inst.nextPlatform.inst.timerText.text = timeText
        inst.nextPlatform.inst.outlineTexts.forEach(outline => {
          outline.text = timeText
        })
      } else {
        //
        // Regular platforms tick with global time
        //
        const platformTime = (inst.globalTime + inst.nextPlatform.timeOffset) % 60
        inst.nextPlatform.inst.currentTime = platformTime
        const timeText = platformTime.toString().padStart(2, '0')
        inst.nextPlatform.inst.timerText.text = timeText
        inst.nextPlatform.inst.outlineTexts.forEach(outline => {
          outline.text = timeText
        })
      }
    }
    //
    // Check if hero jumped to next platform
    //
    if (inst.nextPlatform && hero && hero.character) {
      const isOnNext = inst.nextPlatform.inst.platform.isColliding(hero.character)
      const isGrounded = hero.character.isGrounded()
      
      if (isOnNext && isGrounded && !inst.nextPlatform.heroLanded) {
        //
        // Get time on the platform hero is landing on
        // Safe platforms (3rd, 5th, 7th, 9th, etc.) are always safe
        //
        const isSafePlatform = inst.nextPlatform.isSafePlatform || false
        const landingTime = inst.nextPlatform.inst.currentTime || inst.nextPlatform.inst.initialTime
        const isSafe = isSafePlatform || isSumEven(landingTime)
        //
        // If landing platform has odd sum, decrease attempts
        //
        if (!isSafe) {
          //
          // Mark as landed immediately to prevent repeated checks
          //
          inst.nextPlatform.heroLanded = true
          
          //
          // Only count error once per platform (check errorCounted flag)
          //
          if (!inst.nextPlatform.errorCounted) {
            inst.nextPlatform.errorCounted = true
            
            //
            // Decrease attempts only if we have attempts remaining
            // Platform won't kill hero, but we still track attempts
            //
            if (inst.attemptsRemaining > 0) {
              inst.attemptsRemaining--
              
              //
              // Play death sound when losing a heart
              //
              Sound.playDeathSound(inst.sound)
              
              //
              // Update hearts display
              //
              updateHearts(inst)
              
              //
              // If no attempts left, hero dies
              //
              if (inst.attemptsRemaining <= 0) {
                Hero.death(inst.hero, () => k.go('level-time.2'))
                return
              }
            }
          }
          
          //
          // Add platform to platforms array so it can age and disappear
          //
          inst.platforms.push({
            inst: inst.nextPlatform.inst,
            index: inst.nextPlatform.index,
            timeOffset: inst.nextPlatform.timeOffset,
            isSafePlatform: inst.nextPlatform.isSafePlatform || false,
            ageInSeconds: inst.nextPlatform.ageInSeconds,
            maxDarkening: inst.nextPlatform.maxDarkening,
            lastGlobalTime: inst.nextPlatform.lastGlobalTime
          })
          
          //
          // Destroy previous platform (including the first one)
          //
          const prevPlatformIndex = inst.platforms.length - 2
          if (prevPlatformIndex >= 0) {
            const prevPlatform = inst.platforms[prevPlatformIndex]
            if (prevPlatform && !prevPlatform.inst.isDestroyed) {
              TimePlatform.destroy(prevPlatform.inst)
            }
          }
          
          inst.currentPlatformIndex = inst.nextPlatform.index
          inst.nextPlatform = null
          //
          // Create new next platform (stop 7 platforms before the final one)
          //
          if (inst.currentPlatformIndex < FINAL_PLATFORM_INDEX - 7) {
            createNextPlatform(inst)
          }
          //
          // Platform is unsafe but hero can stay on it
          //
          return
        }
        //
        // Safe landing - make it current platform
        //
        inst.nextPlatform.heroLanded = true
        inst.platforms.push({
          inst: inst.nextPlatform.inst,
          index: inst.nextPlatform.index,
          timeOffset: inst.nextPlatform.timeOffset,  // Keep the offset
          isSafePlatform: inst.nextPlatform.isSafePlatform || false,
          ageInSeconds: inst.nextPlatform.ageInSeconds,
          maxDarkening: inst.nextPlatform.maxDarkening,
          lastGlobalTime: inst.nextPlatform.lastGlobalTime
        })
        //
        // Destroy previous platform (including the first one)
        //
        const prevPlatformIndex = inst.platforms.length - 2
        if (prevPlatformIndex >= 0) {
          const prevPlatform = inst.platforms[prevPlatformIndex]
          if (prevPlatform && !prevPlatform.inst.isDestroyed) {
            TimePlatform.destroy(prevPlatform.inst)
          }
        }
        
        inst.currentPlatformIndex = inst.nextPlatform.index
        inst.nextPlatform = null
        //
        // Create new next platform (stop 7 platforms before the final one)
        //
        if (inst.currentPlatformIndex < FINAL_PLATFORM_INDEX - 7) {
          createNextPlatform(inst)
        }
      }
    }
  })
  
  return inst
}

/**
 * Create next platform with random time offset
 * @param {Object} inst - Platform system instance
 */
function createNextPlatform(inst) {
  const { k, sound, hero } = inst
  //
  // Get current platform
  //
  const currentPlatform = inst.platforms[inst.platforms.length - 1]
  if (!currentPlatform) return
  //
  // Generate random offset (0-59) for next platform
  //
  const randomOffset = Math.floor(Math.random() * 60)
  const nextIndex = inst.currentPlatformIndex + 1
  //
  // Don't create platform if it's too close to final platform (leave gap for reaching anti-hero)
  //
  if (nextIndex >= FINAL_PLATFORM_INDEX - 7) {
    return
  }
  
  //
  // Check if this is a safe platform (through intervals of 3, 5, 7, 9 platforms)
  // Safe platforms: 3rd (index 2), then +5=8th (index 7), then +7=15th (index 14), then +9=24th (index 23)
  // Then cycle repeats: +3=27th (index 26), +5=32nd (index 31), +7=39th (index 38), +9=48th (index 47)...
  //
  const intervals = [3, 5, 7, 9]
  const platformNumber = nextIndex + 1  // Convert 0-based index to 1-based platform number
  let currentPosition = 0
  let intervalIndex = 0
  let isSafePlatform = false
  
  while (currentPosition < platformNumber) {
    currentPosition += intervals[intervalIndex]
    if (currentPosition === platformNumber) {
      isSafePlatform = true
      break
    }
    intervalIndex = (intervalIndex + 1) % intervals.length
  }
  
  const pos = getPlatformPosition(nextIndex, k)
  //
  // Calculate max darkening: decrease by 1 every 6 platforms (min 1)
  // Start from 12, reduces slower than before
  //
  const maxDarkening = Math.max(12 - Math.floor(nextIndex / 6), 1)
  //
  // Create platform with offset that will tick with global time
  // Safe platforms always show "00" and don't tick
  //
  const platform = TimePlatform.create({
    k,
    x: pos.x,
    y: pos.y,
    hero,
    persistent: true,
    showSecondsOnly: true,
    initialTime: isSafePlatform ? 0 : randomOffset,  // Safe platforms always show 00
    staticTime: isSafePlatform,  // Safe platforms don't tick
    duration: 0,
    sfx: sound
  })
  
  inst.nextPlatform = {
    inst: platform,
    index: nextIndex,
    heroLanded: false,
    errorCounted: false,  // Track if error was already counted for this platform
    timeOffset: isSafePlatform ? 0 : randomOffset,  // Store offset for syncing (0 for safe platforms)
    isSafePlatform: isSafePlatform,  // Flag to mark safe platforms
    ageInSeconds: 0,
    maxDarkening: maxDarkening,
    lastGlobalTime: inst.globalTime
  }
}

/**
 * Creates basic level platforms (top, bottom, left, right walls)
 * @param {Object} k - Kaplay instance
 * @param {Object} sound - Sound instance
 */
function createLevelPlatforms(k, sound) {
  const backgroundPlatformColor = k.Color.fromHex(CFG.visual.colors.platform)
  //
  // Top platform (ceiling)
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
  // Bottom platform (floor)
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

/**
 * Creates clouds under the top platform (top wall)
 * @param {Object} k - Kaplay instance
 */
function createCloudsUnderTopPlatform(k) {
  //
  // Cloud parameters
  //
  const cloudTopY = PLATFORM_TOP_HEIGHT + 40  // Top Y position (dense layer here)
  const cloudBottomY = PLATFORM_TOP_HEIGHT + 100  // Bottom Y position (sparse clouds here)
  const cloudDenseLayerY = PLATFORM_TOP_HEIGHT + 50  // Dense layer Y position
  const cloudSparseLayerStartY = PLATFORM_TOP_HEIGHT + 60  // Start of sparse layer
  const cloudSparseLayerEndY = cloudBottomY  // End of sparse layer
  const baseCloudColor = k.rgb(250, 250, 255)  // White with slight blue tint for clouds
  
  //
  // Create multiple clouds spread horizontally across the screen
  // Cover almost entire width like snow
  //
  const screenWidth = k.width()
  const cloudStartX = PLATFORM_SIDE_WIDTH + 50  // Start a bit inside left margin
  const cloudEndX = screenWidth - PLATFORM_SIDE_WIDTH - 50  // End a bit before right margin
  const cloudCoverageWidth = cloudEndX - cloudStartX
  
  //
  // Create dense layer at top (more clouds, closer together)
  //
  const denseCloudCount = 24  // Even more clouds for solid coverage without gaps
  const denseCloudSpacing = cloudCoverageWidth / (denseCloudCount - 1)
  
  //
  // Create sparse layer below (fewer clouds, more spread out)
  //
  const sparseCloudCount = 8  // Fewer clouds for sparse coverage
  const sparseCloudSpacing = cloudCoverageWidth / (sparseCloudCount - 1)
  
  //
  // Generate clouds programmatically to cover almost entire width
  // Create overlapping clouds like snow covering the top
  //
  const cloudTypes = [
    //
    // Type 1: Large wide cloud (6 puffs)
    //
    {
      mainSize: 50,
      puffs: [
        { radius: 0.7, offsetX: -0.8, offsetY: -0.05 },
        { radius: 0.75, offsetX: -0.4, offsetY: -0.1 },
        { radius: 0.65, offsetX: 0.4, offsetY: -0.1 },
        { radius: 0.7, offsetX: 0.8, offsetY: -0.05 },
        { radius: 0.6, offsetX: -0.2, offsetY: 0.15 },
        { radius: 0.6, offsetX: 0.2, offsetY: 0.15 }
      ],
      color: baseCloudColor,
      opacity: 0.6
    },
    //
    // Type 2: Medium wide cloud (5 puffs)
    //
    {
      mainSize: 42,
      puffs: [
        { radius: 0.8, offsetX: -0.7, offsetY: 0 },
        { radius: 0.85, offsetX: -0.3, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.3, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.7, offsetY: 0 },
        { radius: 0.7, offsetX: 0, offsetY: 0.12 }
      ],
      color: k.rgb(245, 245, 250),
      opacity: 0.55
    },
    //
    // Type 3: Small wide cloud (4 puffs)
    //
    {
      mainSize: 35,
      puffs: [
        { radius: 0.75, offsetX: -0.6, offsetY: 0 },
        { radius: 0.8, offsetX: -0.2, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.2, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.6, offsetY: 0 }
      ],
      color: k.rgb(255, 255, 255),
      opacity: 0.5
    },
    //
    // Type 4: Very wide cloud (7 puffs)
    //
    {
      mainSize: 55,
      puffs: [
        { radius: 0.65, offsetX: -1.0, offsetY: 0 },
        { radius: 0.7, offsetX: -0.6, offsetY: -0.1 },
        { radius: 0.75, offsetX: -0.2, offsetY: -0.12 },
        { radius: 0.75, offsetX: 0.2, offsetY: -0.12 },
        { radius: 0.7, offsetX: 0.6, offsetY: -0.1 },
        { radius: 0.65, offsetX: 1.0, offsetY: 0 },
        { radius: 0.6, offsetX: 0, offsetY: 0.15 }
      ],
      color: baseCloudColor,
      opacity: 0.65
    }
  ]
  
  //
  // Generate clouds with dense layer at top, sparse layer below
  //
  const cloudConfigs = []
  
  //
  // Create dense layer at top (solid coverage, no gaps)
  //
  for (let i = 0; i < denseCloudCount; i++) {
    const baseX = cloudStartX + denseCloudSpacing * i
    
    //
    // Add small randomness for natural look (less variation for dense layer)
    // Overlap clouds to ensure no gaps
    //
    const randomOffset = (Math.random() - 0.5) * (denseCloudSpacing * 0.6)  // Overlap with neighbors
    const x = baseX + randomOffset
    
    //
    // Select cloud type with some variation
    //
    const typeIndex = i % cloudTypes.length
    const cloudType = cloudTypes[typeIndex]
    
    //
    // Vary size slightly for more natural look
    // Make dense layer clouds slightly larger for better overlap
    //
    const sizeVariation = 1.0 + Math.random() * 0.3  // 1.0 to 1.3 (larger for dense layer)
    const mainSize = cloudType.mainSize * sizeVariation
    
    //
    // Create multiple rows for dense layer to ensure no gaps
    // Divide clouds into 2-3 rows for complete coverage
    //
    const rowsPerLayer = 2
    const rowIndex = Math.floor((i % denseCloudCount) / (denseCloudCount / rowsPerLayer))
    const rowYOffset = rowIndex * 8  // 8px between rows
    const yVariation = (Math.random() - 0.5) * 3  // ±1.5px variation within row
    const cloudY = cloudDenseLayerY + rowYOffset + yVariation
    
    cloudConfigs.push({
      x: x,
      y: cloudY,
      mainSize: mainSize,
      puffs: cloudType.puffs,
      color: cloudType.color,
      opacity: cloudType.opacity * (0.9 + Math.random() * 0.2)  // Slight opacity variation
    })
  }
  
  //
  // Create sparse layer below (fewer clouds, more spread out)
  //
  for (let i = 0; i < sparseCloudCount; i++) {
    const baseX = cloudStartX + sparseCloudSpacing * i
    
    //
    // Add more randomness for sparse layer
    //
    const randomOffset = (Math.random() - 0.5) * 40  // ±20px random offset
    const x = baseX + randomOffset
    
    //
    // Select cloud type with some variation
    //
    const typeIndex = (i + denseCloudCount) % cloudTypes.length
    const cloudType = cloudTypes[typeIndex]
    
    //
    // Vary size slightly for more natural look
    //
    const sizeVariation = 0.9 + Math.random() * 0.2  // 0.9 to 1.1
    const mainSize = cloudType.mainSize * sizeVariation
    
    //
    // Distribute Y positions in sparse layer (more variation)
    // Use quadratic function to bias towards top of sparse layer
    //
    const sparseYRange = cloudSparseLayerEndY - cloudSparseLayerStartY
    const yDistribution = Math.random() * Math.random()  // 0 to 1, biased towards 0 (top)
    const cloudY = cloudSparseLayerStartY + yDistribution * sparseYRange
    
    cloudConfigs.push({
      x: x,
      y: cloudY,
      mainSize: mainSize,
      puffs: cloudType.puffs,
      color: cloudType.color,
      opacity: cloudType.opacity * (0.9 + Math.random() * 0.2)  // Slight opacity variation
    })
  }
  
  cloudConfigs.forEach((cloudConfig) => {
    k.add([
      k.pos(cloudConfig.x, cloudConfig.y),
      k.z(14.5),  // Above city background (14) but below platforms (15) and other elements
      {
        draw() {
          //
          // Draw cloud as overlapping circles (puffy cloud shape)
          //
          const mainSize = cloudConfig.mainSize
          
          //
          // Main cloud body (largest circle in center)
          //
          k.drawCircle({
            radius: mainSize,
            pos: k.vec2(0, 0),
            color: cloudConfig.color,
            opacity: cloudConfig.opacity
          })
          
          //
          // Draw all puffs for this cloud
          //
          cloudConfig.puffs.forEach((puff) => {
            k.drawCircle({
              radius: mainSize * puff.radius,
              pos: k.vec2(puff.offsetX * mainSize, puff.offsetY * mainSize),
              color: cloudConfig.color,
              opacity: cloudConfig.opacity
            })
          })
        }
      }
    ])
  })
}

/**
 * Create snow particle system
 * Snow particles stay within game area (between side platforms, from clouds to bottom platform)
 * @param {Object} k - Kaplay instance
 * @returns {Object} Snow system instance
 */
function createSnowParticles(k) {
  const particles = []
  const PARTICLE_COUNT = 150
  //
  // Game area boundaries
  // Add small margin to ensure particles don't overlap with platform edges
  //
  const MARGIN = 2  // Small margin from platform edges
  const gameAreaLeft = PLATFORM_SIDE_WIDTH + MARGIN  // Inside left platform
  const gameAreaRight = k.width() - PLATFORM_SIDE_WIDTH - MARGIN  // Inside right platform
  const gameAreaTop = PLATFORM_TOP_HEIGHT + 100  // Start from clouds area
  const gameAreaBottom = k.height() - PLATFORM_BOTTOM_HEIGHT  // End at bottom platform
  const gameAreaWidth = gameAreaRight - gameAreaLeft
  const gameAreaHeight = gameAreaBottom - gameAreaTop
  //
  // Create particles with random initial positions within game area
  //
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    particles.push({
      x: gameAreaLeft + Math.random() * gameAreaWidth,
      y: gameAreaTop + Math.random() * gameAreaHeight,
      size: 1 + Math.random() * 2,  // Size between 1-3px
      speedX: 30 + Math.random() * 40,  // Horizontal speed (left to right)
      speedY: 50 + Math.random() * 50,  // Vertical speed (falling down)
      opacity: 0.3 + Math.random() * 0.4  // Opacity 0.3-0.7
    })
  }
  
  return {
    k,
    particles,
    gameAreaLeft,
    gameAreaRight,
    gameAreaTop,
    gameAreaBottom,
    gameAreaWidth,
    gameAreaHeight
  }
}

/**
 * Update snow particles
 * Keep particles within game area boundaries
 * @param {Object} inst - Snow system instance
 */
function updateSnowParticles(inst) {
  const { k, particles, gameAreaLeft, gameAreaRight, gameAreaTop, gameAreaBottom, gameAreaWidth, gameAreaHeight } = inst
  const dt = k.dt()
  //
  // Update each particle
  //
  particles.forEach(p => {
    //
    // Move particle left-to-right and down
    //
    p.x += p.speedX * dt
    p.y += p.speedY * dt
    //
    // Keep particles within game area boundaries
    // Account for particle size to ensure no overlap with platforms
    //
    const halfSize = p.size / 2
    //
    // Horizontal boundaries (left and right platforms)
    // Wrap particles but ensure they don't overlap platform edges
    //
    if (p.x + halfSize >= gameAreaRight) {
      //
      // Particle (including its size) reached or passed right platform boundary, wrap to left side
      //
      p.x = gameAreaLeft + halfSize + Math.random() * 10  // Start from left boundary with margin
      p.y = gameAreaTop + Math.random() * gameAreaHeight
    }
    if (p.x - halfSize <= gameAreaLeft) {
      //
      // Particle (including its size) reached or passed left platform boundary, wrap to right side
      //
      p.x = gameAreaRight - halfSize - Math.random() * 10  // Start from right boundary with margin
      p.y = gameAreaTop + Math.random() * gameAreaHeight
    }
    //
    // Vertical boundaries (clouds top and bottom platform)
    //
    if (p.y > gameAreaBottom) {
      //
      // Particle went past bottom platform, reset to top (clouds area)
      //
      p.y = gameAreaTop + Math.random() * 20  // Random position near top
      p.x = gameAreaLeft + Math.random() * gameAreaWidth
    }
    if (p.y < gameAreaTop) {
      //
      // Particle went above clouds, reset to bottom
      //
      p.y = gameAreaBottom - Math.random() * 20  // Random position near bottom
      p.x = gameAreaLeft + Math.random() * gameAreaWidth
    }
  })
}

/**
 * Draw snow particles
 * @param {Object} inst - Snow system instance
 */
function drawSnowParticles(inst) {
  const { k, particles } = inst
  //
  // Draw each particle as a white pixel/small rect
  //
  particles.forEach(p => {
    k.drawRect({
      width: p.size,
      height: p.size,
      pos: k.vec2(p.x, p.y),
      color: k.rgb(255, 255, 255),
      opacity: p.opacity
    })
  })
}

/**
 * Creates snow drifts on bottom platform floor
 * @param {Object} k - Kaplay instance
 */
function createSnowDrifts(k) {
  //
  // Snow drift configurations for bottom platform
  //
  const floorY = k.height() - PLATFORM_BOTTOM_HEIGHT
  //
  // Generate many snow drifts with random sizes covering entire floor
  //
  const drifts = []
  //
  // Fill entire bottom platform with drifts
  //
  const corridorStart = PLATFORM_SIDE_WIDTH
  const corridorEnd = k.width() - PLATFORM_SIDE_WIDTH
  
  for (let x = corridorStart; x < corridorEnd; x += 40 + Math.random() * 30) {
    const width = 50 + Math.random() * 90  // 50-140px width (larger and overlapping)
    const height = 8 + Math.random() * 15   // 8-23px height
    const zIndex = Math.random() > 0.5 ? 12 : 25  // 50% behind hero, 50% in front
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: floorY, z: zIndex, shapeType, skew })
  }
  //
  // Add some extra smaller drifts between main ones for more coverage
  //
  for (let x = corridorStart; x < corridorEnd; x += 30 + Math.random() * 25) {
    const width = 30 + Math.random() * 50  // 30-80px width (medium)
    const height = 5 + Math.random() * 8    // 5-13px height (smaller)
    const zIndex = Math.random() > 0.3 ? 12 : 25  // More behind hero
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: floorY, z: zIndex, shapeType, skew })
  }
  //
  // Create each drift as a mound shape with multiple layers
  //
  drifts.forEach(drift => {
    k.add([
      k.pos(drift.x, drift.y),
      k.z(drift.z),  // Either behind hero (12) or in front (25)
      {
        draw() {
          //
          // Drifts in front of hero (z=25) are slightly more transparent
          //
          const baseOpacity = drift.z === 25 ? 0.7 : 0.95
          const shadowOpacity = drift.z === 25 ? 0.5 : 0.7
          const highlightOpacity = drift.z === 25 ? 0.6 : 0.85
          //
          // Draw snow drift as a polygon (mound shape)
          //
          const points = []
          const steps = 20
          //
          // Create curved top using different shape formulas based on shapeType
          //
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const x = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
            let y
            //
            // Different shape types for variety
            //
            if (drift.shapeType === 0) {
              //
              // Parabolic curve (classic mound)
              //
              y = -drift.height * (1 - Math.pow(2 * t - 1, 2))
            } else if (drift.shapeType === 1) {
              //
              // Steeper peak (more pointed)
              //
              y = -drift.height * (1 - Math.pow(Math.abs(2 * t - 1), 1.5))
            } else {
              //
              // Flatter top (more spread out)
              //
              y = -drift.height * (1 - Math.pow(2 * t - 1, 4))
            }
            points.push(k.vec2(x, y))
          }
          //
          // Add bottom points to close the shape
          //
          points.push(k.vec2(drift.width / 2, 0))
          points.push(k.vec2(-drift.width / 2, 0))
          //
          // Draw main snow mound (lightest layer)
          //
          k.drawPolygon({
            pts: points,
            color: k.rgb(240, 240, 250),
            opacity: baseOpacity
          })
          //
          // Draw shadow layer (darker at bottom)
          //
          const shadowPoints = []
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            const x = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
            const y = -drift.height * 0.3 * (1 - Math.pow(2 * t - 1, 2))
            shadowPoints.push(k.vec2(x, y))
          }
          shadowPoints.push(k.vec2(drift.width / 2, 0))
          shadowPoints.push(k.vec2(-drift.width / 2, 0))
          
          k.drawPolygon({
            pts: shadowPoints,
            color: k.rgb(200, 200, 220),
            opacity: shadowOpacity
          })
          //
          // Draw highlight on top (brightest spot, offset by skew)
          // Ensure it stays within the mound (not below y=0)
          //
          const highlightOffset = drift.skew * drift.width * 0.2
          const highlightRadius = drift.width * 0.15
          const highlightY = -drift.height * 0.7
          //
          // Only draw highlight if it stays above the baseline
          //
          if (Math.abs(highlightY) - highlightRadius > 0) {
            k.drawCircle({
              radius: highlightRadius,
              color: k.rgb(255, 255, 255),
              pos: k.vec2(highlightOffset, highlightY),
              opacity: highlightOpacity
            })
          }
        }
      }
    ])
  })
}
