import { CFG } from '../cfg.js'
import { initScene, stopTimeSectionMusic } from '../utils/scene.js'
import * as Hero from '../../../components/hero.js'
import * as TimePlatform from '../components/time-platform.js'
import * as TimeSpikes from '../components/time-spikes.js'
import * as Sound from '../../../utils/sound.js'
import { saveLastLevel } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
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
const HERO_WIDTH = 96   // SPRITE_SIZE (32) * HERO_SCALE (3)
//
// Level geometry
//
const BOTTOM_PLATFORM_TOP = 1080 - PLATFORM_BOTTOM_HEIGHT  // 930
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
    saveLastLevel('level-time.2')
    //
    // Stop previous level music (kids.mp3 and time.mp3 from level 1)
    //
    stopTimeSectionMusic()
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start time.mp3 and clock.mp3 background music (without kids.mp3)
    //
    const timeMusic = k.play('time', {
      loop: true,
      volume: CFG.audio.backgroundMusic.time
    })
    //
    // Start clock.mp3 (restarts on each level load for synchronization)
    //
    const clockMusic = k.play('clock', {
      loop: true,
      volume: CFG.audio.backgroundMusic.clock
    })
    //
    // Stop all music when leaving the scene
    //
    k.onSceneLeave(() => {
      timeMusic.stop()
      clockMusic.stop()
    })
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
        clockMusic.stop()
        //
        // Move to menu (TODO: create level 3 or time-complete scene)
        //
        k.go('menu')
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
    // Create custom platforms for this level
    //
    createLevelPlatforms(k, sound)
    //
    // Create time spikes (digit "1") at bottom platform level
    //
    const timeSpikes = TimeSpikes.create({
      k,
      startX: PLATFORM_SIDE_WIDTH + 10,  // Start from left wall + 10px
      endX: k.width() - PLATFORM_SIDE_WIDTH - 10,  // End at right wall - 10px
      y: k.height() - PLATFORM_BOTTOM_HEIGHT - 20,  // At bottom platform level
      hero,
      currentLevel: 'level-time.2',
      digitCount: 50,  // Many spikes close together
      fakeDigitCount: 0,  // All spikes kill (no bunnies)
      sfx: sound
    })
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
    globalTimer: 0  // Timer to track seconds
  }
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
        const platformTime = (inst.globalTime + p.timeOffset) % 60
        p.inst.currentTime = platformTime
        const timeText = platformTime.toString().padStart(2, '0')
        p.inst.timerText.text = timeText
        p.inst.outlineTexts.forEach(outline => {
          outline.text = timeText
        })
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
    //
    if (inst.nextPlatform && !inst.nextPlatform.inst.isDestroyed) {
      const platformTime = (inst.globalTime + inst.nextPlatform.timeOffset) % 60
      inst.nextPlatform.inst.currentTime = platformTime
      const timeText = platformTime.toString().padStart(2, '0')
      inst.nextPlatform.inst.timerText.text = timeText
      inst.nextPlatform.inst.outlineTexts.forEach(outline => {
        outline.text = timeText
      })
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
        //
        const landingTime = inst.nextPlatform.inst.currentTime || inst.nextPlatform.inst.initialTime
        const isSafe = isSumEven(landingTime)
        //
        // If landing platform has odd sum, kill hero
        //
        if (!isSafe) {
          Hero.death(hero, () => {
            k.go('level-time.2')
          })
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
  
  const pos = getPlatformPosition(nextIndex, k)
  //
  // Calculate max darkening: decrease by 1 every 6 platforms (min 1)
  // Start from 12, reduces slower than before
  //
  const maxDarkening = Math.max(12 - Math.floor(nextIndex / 6), 1)
  //
  // Create platform with offset that will tick with global time
  //
  const platform = TimePlatform.create({
    k,
    x: pos.x,
    y: pos.y,
    hero,
    persistent: true,
    showSecondsOnly: true,
    initialTime: randomOffset,  // Initial display
    staticTime: false,
    duration: 0,
    sfx: sound
  })
  
  inst.nextPlatform = {
    inst: platform,
    index: nextIndex,
    heroLanded: false,
    timeOffset: randomOffset,  // Store offset for syncing
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

