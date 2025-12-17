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
//
const PLATFORM_TOP_HEIGHT = 150  // Raised top platform (was 250)
const PLATFORM_BOTTOM_HEIGHT = 150  // Raised bottom platform (was 250)
const PLATFORM_SIDE_WIDTH = 192
//
// Hero size (approximately)
//
const HERO_HEIGHT = 96  // SPRITE_SIZE (32) * HERO_SCALE (3)
const HERO_WIDTH = 96   // SPRITE_SIZE (32) * HERO_SCALE (3)
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
const LOWER_PLATFORM_WIDTH = HERO_WIDTH - 8  // Narrower than hero (88px, was 104px)
const LOWER_PLATFORM_END_X = LOWER_PLATFORM_START_X + LOWER_PLATFORM_WIDTH  // 280
//
// Hero spawn positions
//
const HERO_SPAWN_X = LOWER_PLATFORM_START_X + 10  // Left side of lower platform (202)
const HERO_SPAWN_Y = FIRST_FLOOR_FLOOR_Y - 50
const ANTIHERO_CLOCK_PLATFORM_X = PLATFORM_SIDE_WIDTH + 15  // Clock platform position (same offset as hero's)
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
    saveLastLevel('level-time.1')
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
    // Initialize level with heroes and platforms (skip default platforms)
    //
    const { hero, antiHero } = initScene({
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
        // Move to next level (TODO: create level 2)
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
    // Create custom platforms for two-floor level
    //
    createLevelPlatforms(k, sound)
    //
    // Create clock platform (persistent, shows seconds only) under hero
    //
    const clockPlatformX = LOWER_PLATFORM_START_X + 15  // Moved right by 5px (was 10)
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
      sfx: sound
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
      sfx: sound
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
        sfx: sound
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
      // Adjust first created platform (second in original sequence, now rightmost upper)
      // Move it right and down to make it jumpable from lower platform
      //
      const isRightmostPlatform = upperPlatformIndex === 1
      if (isRightmostPlatform) {
        platformX += 40  // Move right by 40px (reduced from 80 to move left)
        platformY += 60  // Move down by 60px (increased from 15 to lower it more)
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
        hidden: true  // Hide text initially
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
      y: BOTTOM_PLATFORM_TOP - 20,  // At bottom invisible platform level (910)
      hero,
      currentLevel: 'level-time.1',
      digitCount: 36,  // Added one more spike at the end
      fakeDigitCount: 0,  // All spikes cut (no fake spikes)
      sfx: sound
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

