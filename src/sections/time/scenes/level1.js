import { CFG } from '../cfg.js'
import { initScene, startTimeSectionMusic, startClockMusic, checkSpeedBonus, createSunHoverFace, timeSectionMusic } from '../components/scene-helper.js'
import * as MovingCars from '../components/moving-cars.js'
import { getDarkness } from '../utils/time-day-night.js'
import * as Hero from '../../../components/hero.js'
import * as TimePlatform from '../components/time-platform.js'
import * as TimeSpikes from '../components/one-spikes.js'
import * as Sound from '../../../utils/sound.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { set, get } from '../../../utils/progress.js'
import { toCanvas, parseHex, getRGB } from '../../../utils/helper.js'
import * as BackgroundBirds from '../components/background-birds.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import * as LifeDeduction from '../../touch/utils/life-deduction.js'
import * as TimeLevel0Ambience from '../utils/time-level0-ambience.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'

//
// Use platform color for the life-deduction backdrop and canvas letterbox,
// because the visible top/bottom border areas are painted with the platform
// color, not the sky background color.
//
const [TIME_LIFE_DEDUCT_BG_R, TIME_LIFE_DEDUCT_BG_G, TIME_LIFE_DEDUCT_BG_B] = parseHex(CFG.visual.colors.platform)
//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_TOP_HEIGHT = 150  // Raised top platform (was 250)
const PLATFORM_BOTTOM_HEIGHT = 150  // Raised bottom platform (was 250)
const PLATFORM_SIDE_WIDTH = 192
const CORNER_RADIUS = 20  // Radius for rounded corners of game area
const GROUND_STRIPE_HEIGHT = 5  // Height of ground stripe above bottom platform
//
// TIME indicator tooltip
//
const TIME_INDICATOR_TOOLTIP_TEXT = "Your progress"
const TIME_INDICATOR_TOOLTIP_WIDTH = 200
const TIME_INDICATOR_TOOLTIP_HEIGHT = 60
const TIME_INDICATOR_TOOLTIP_Y_OFFSET = 40
//
// Green timer tooltip
//
const GREEN_TIMER_TOOLTIP_TEXT = "Complete the level in time\nto earn more fragments"
const GREEN_TIMER_TOOLTIP_WIDTH = 100
const GREEN_TIMER_TOOLTIP_HEIGHT = 30
const GREEN_TIMER_TOOLTIP_Y_OFFSET = 50
//
// Small hero and life icon tooltips
//
const SMALL_HERO_TOOLTIP_TEXT = "Your fragments"
const SMALL_HERO_TOOLTIP_SIZE = 80
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_TEXT = "Life score"
const LIFE_TOOLTIP_SIZE = 80
const LIFE_TOOLTIP_Y_OFFSET = 50
//
// Hero tooltip (hover body)
//
const HERO_TOOLTIP_TEXT = "Damn it"
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -60
//
// Anti-hero tooltip
//
const ANTIHERO_TOOLTIP_TEXT = "Learning to handle numbers"
const ANTIHERO_TOOLTIP_HOVER_SIZE = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
//
// Platform tooltip
//
const PLATFORM_TOOLTIP_TEXT = "Do not touch the one"
const PLATFORM_TOOLTIP_WIDTH = 80
const PLATFORM_TOOLTIP_HEIGHT = 40
const PLATFORM_TOOLTIP_Y_OFFSET = -50
//
// Bonus hero — hidden platform right-below the "22" platform
//
const BONUS_PLATFORM_X = 720
const BONUS_PLATFORM_Y = 830
//
// Match the regular time platform dimensions: 60px wide x 48px tall (showSecondsOnly format)
//
const BONUS_PLATFORM_WIDTH = 60
const BONUS_PLATFORM_COLLISION_HEIGHT = 48
const BONUS_STORAGE_KEY = 'time.level1BonusCollected'
const BONUS_HERO_COLOR = "#8B5A50"
//
// Y threshold for the hidden platform's triggerBelowY detection.
// First-floor platforms can vary up to PLATFORM_VERTICAL_OFFSET(60) + 25px below
// FIRST_FLOOR_FLOOR_Y, placing the hero center at most ~723px when standing.
// We must be above that (≥724) and below 792 (hero center when feet hit the
// hidden platform surface at Y=830). 760 gives a safe 37px margin on both ends.
//
const BONUS_TRIGGER_BELOW_Y = 760
//
// Life deduction (show hint + control 5th platform falling)
//
const LIFE_DEDUCT_THRESHOLD = 5
const LIFE_DEDUCT_FLAG = 'time.level1TrapAdded'
//
// Night music controller: darkness threshold for fading music, and cricket intervals
//
const NIGHT_DARKNESS_THRESHOLD = 0.45
const NIGHT_MUSIC_TRANSITION_SPEED = 1.5
const NIGHT_CRICKET_INTERVAL_MIN = 1.5
const NIGHT_CRICKET_INTERVAL_MAX = 4.0
//
// Level geometry - two platforms connected by stairs
//
const BOTTOM_PLATFORM_TOP = 1080 - PLATFORM_BOTTOM_HEIGHT  // 930
const FIRST_FLOOR_FLOOR_Y = 700   // Raised first floor (was 910)
const SECOND_FLOOR_FLOOR_Y = 400  // Raised second floor (was 554)
//
// Hero must be well above this Y to trigger trap 2. Set to 30px below
// the second floor so a hero jumping from the first floor (peak ≈ Y 548)
// cannot trigger it — only heroes actually on or near the second floor can.
//
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
    // Start clock.mp3 (stored in timeSectionMusic for proper transition stopping)
    //
    startClockMusic(k)
    //
    // Night music controller: fades kids/time/clock music out as darkness rises,
    // plays crickets at random intervals at night, restores volumes at dawn.
    //
    const nightMusicState = {
      k,
      sound,
      cricketTimer: NIGHT_CRICKET_INTERVAL_MIN + Math.random() * (NIGHT_CRICKET_INTERVAL_MAX - NIGHT_CRICKET_INTERVAL_MIN)
    }
    k.onUpdate(() => onUpdateNightMusic(nightMusicState))
    //
    // Initialize level with heroes and platforms (skip default platforms)
    //
    const { hero, antiHero, levelIndicator } = initScene({
      k,
      levelName: 'level-time.1',
      levelNumber: 2,
      skipPlatforms: true,
      spriteName: 'city-background-level1',
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
        // Check for speed bonus before incrementing normal score
        //
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(k, 'level-time.1', levelTime, levelIndicator)
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
          flashSmallHeroLevel1(k, levelIndicator, originalColor, 0)
          //
          // Create heart particles around small hero
          //
          createHeroScoreParticles(k, levelIndicator)
        }
        //
        // Wait before transition (extra 1s if speed bonus earned for particle effect)
        //
        const transitionDelay = speedBonusEarned ? 2.8 : 1.8
        k.wait(transitionDelay, () => {
          createLevelTransition(k, 'level-time.1')
        })
      },
      showGameClock: true
    })
    //
    // Override canvas backdrop to match the platform color (top/bottom border
    // areas are painted with platform color, not sky background color).
    //
    CanvasBackdrop.applyCanvasBackdrop(k, CFG.visual.colors.platform)
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
    // Street ambience: lamps, grass, bird/cricket sounds
    //
    const level1Ambience = TimeLevel0Ambience.create({
      k,
      sound,
      platformSideWidth: PLATFORM_SIDE_WIDTH,
      platformBottomHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      heroInst: hero,
      crowLampIndex: 3,
      crowTooltipText: 'so much suffering for a watch...'
    })
    k.onSceneLeave(() => level1Ambience.cleanup())
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ 
      k, 
      showTimer: true, 
      targetTime: CFG.gameplay.speedBonusTime['level-time.1'],
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
    createMovingCars(k)
    //
    // Create custom platforms for two-floor level
    //
    createLevelPlatforms(k)
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
    // Trap 2: clock platform slides right when hero approaches, then returns.
    // Activates once hero score reaches the threshold and persists across visits.
    //
    //
    // Life deduction: show hint at level start if lifeScore >= threshold
    // 5th platform only falls if the hint was shown (current or previous visit)
    //
    const currentLifeScore = get('lifeScore', 0)
    const trapAlreadyAdded = get(LIFE_DEDUCT_FLAG, false)
    const showTrap = !trapAlreadyAdded && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    const trapEnabled = showTrap || trapAlreadyAdded
    levelIndicator.updateTrapCount(trapEnabled ? 1 : 0)
    const sceneLock = { locked: showTrap }
    if (showTrap) {
      hero.controlsDisabled = true
      sceneLock.heroInst = hero
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        sceneLock,
        sceneBgRgb: { r: TIME_LIFE_DEDUCT_BG_R, g: TIME_LIFE_DEDUCT_BG_G, b: TIME_LIFE_DEDUCT_BG_B },
        textColorRgb: { r: 255, g: 220, b: 50 }
      })
    }
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
    let lowerPlatformCount = 1  // Count platforms (clockPlatform is #1)
    let fifthPlatformX = null  // X of the 5th (falling) platform, set during loop
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
      // Count platforms for falling platform detection
      //
      lowerPlatformCount++
      const isFifthPlatform = lowerPlatformCount === 5
      //
      // Adjust X position for last lower platform (move left)
      //
      let adjustedPlatformX = platformX
      if (isLastLowerPlatform) {
        adjustedPlatformX -= 20  // Move left by 20px
      }
      //
      // Track the 5th platform's X so we can place a lethal "1" below it.
      //
      if (isFifthPlatform) {
        fifthPlatformX = adjustedPlatformX
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
        levelIndicator,
        falling: isFifthPlatform && trapEnabled,
        fallTarget: isFifthPlatform && trapEnabled ? BOTTOM_PLATFORM_TOP + 30 : 0
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
      startX: PLATFORM_SIDE_WIDTH + 10,
      endX: k.width() - PLATFORM_SIDE_WIDTH - 20,
      y: BOTTOM_PLATFORM_TOP - 10,
      hero,
      currentLevel: 'level-time.1',
      digitCount: 50,
      fakeDigitCount: 0,
      sfx: sound,
      levelIndicator,
      //
      // Skip ones at lamp pole footprints: gaLeft(192) + LAMP_X_OFFSETS
      //
      excludeX: [192 + 150, 192 + 480, 192 + 810, 192 + 1140]
    })
    //
    // When trap is enabled the 5th platform falls, leaving a gap with no digit "1"
    // at that X position. Place one extra spike in front of the lamp pole.
    // FALLING_SPIKE_X_OFFSET shifts the digit right to align visually with the lamp.
    //
    if (trapEnabled && fifthPlatformX !== null) {
      const FALLING_SPIKE_X_OFFSET = 30
      TimeSpikes.addSingleSpike(timeSpikes, fifthPlatformX + FALLING_SPIKE_X_OFFSET, BOTTOM_PLATFORM_TOP - 10)
    }
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
    // Tooltip for small hero (score indicator)
    //
    levelIndicator && levelIndicator.smallHero && Tooltip.create({
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
    // Tooltip for life icon (top-right)
    //
    levelIndicator && levelIndicator.lifeImage && Tooltip.create({
      k,
      targets: [{
        x: levelIndicator.lifeImage.sprite.pos.x,
        y: levelIndicator.lifeImage.sprite.pos.y,
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
        width: ANTIHERO_TOOLTIP_HOVER_SIZE,
        height: ANTIHERO_TOOLTIP_HOVER_SIZE,
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
    // Tooltip for clock platforms — only show when platform has not yet fallen
    //
    const platformTargets = clockPlatforms.map(p => ({
      x: () => p.platform.pos.x,
      y: () => p.platform.pos.y,
      width: PLATFORM_TOOLTIP_WIDTH,
      height: PLATFORM_TOOLTIP_HEIGHT,
      text: PLATFORM_TOOLTIP_TEXT,
      offsetY: PLATFORM_TOOLTIP_Y_OFFSET,
      visible: () => !p.hasFallen
    }))
    Tooltip.create({ k, targets: platformTargets })
    //
    // Hidden bonus hero — right-below the "22" platform
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
      storageKey: BONUS_STORAGE_KEY,
      platformText: "00",
      platformFontSize: 48,
      platformCollisionHeight: BONUS_PLATFORM_COLLISION_HEIGHT,
      //
      // Collision box shifted down by half its height and right by half its width.
      //
      platformCollisionYOffset: BONUS_PLATFORM_COLLISION_HEIGHT / 2,
      platformCollisionXOffset: BONUS_PLATFORM_WIDTH / 2,
      //
      // The hidden platform is beneath the first floor (Y≈700). Gate the reveal
      // by a Y threshold instead of vertical proximity so the platform stays
      // invisible while the hero walks or jumps on the floor above. It only
      // pops in once the hero has fallen past the first floor level.
      // revealWidth is widened to cover the full gap between adjacent platforms
      // so the hero is detected anywhere inside that gap, not just dead-center.
      //
      revealDistance: 100,
      triggerBelowY: BONUS_TRIGGER_BELOW_Y,
      revealWidth: PLATFORM_SPACING
    })
  })
}

/**
 * Creates all platforms for level 1 (two-floor corridor)
 * @param {Object} k - Kaplay instance
 */
function createLevelPlatforms(k) {
  const backgroundPlatformColor = k.Color.fromHex(CFG.visual.colors.platform)
  
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
 * Creates a rounded corner sprite using canvas (L-shaped with rounded inner corner)
 * @param {number} radius - Corner radius
 * @param {string} backgroundColor - Background color hex
 * @returns {string} Data URL of the corner sprite
 */
function createRoundedCornerSprite(radius, backgroundColor) {
  const size = radius * 2
  const dataURL = toCanvas({ width: size, height: size }, (ctx) => {
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
  const [stripeR, stripeG, stripeB] = parseHex(CFG.visual.colors.groundStripe)
  const groundColor = k.rgb(stripeR, stripeG, stripeB)
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
 * Creates rounded corners for game area to soften sharp edges where platforms meet
 * @param {Object} k - Kaplay instance
 */
function createRoundedCorners(k) {
  const radius = CORNER_RADIUS
  const cornerColor = CFG.visual.colors.platform
  const cornerDataURL = createRoundedCornerSprite(radius, cornerColor)
  k.loadSprite('corner-sprite-level1', cornerDataURL)
  //
  // Release canvas backing store immediately after Kaplay reads it.
  //
  cornerDataURL.width = 0
  cornerDataURL.height = 0
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
 * Creates moving blurred cars on background
 * @param {Object} k - Kaplay instance
 */
function createMovingCars(k) {
  const carCount = 5
  const platformTopY = k.height() - PLATFORM_BOTTOM_HEIGHT + 17
  const carSpeedMin = 20
  const carSpeedMax = 50
  const gameAreaLeft = PLATFORM_SIDE_WIDTH
  const gameAreaRight = k.width() - PLATFORM_SIDE_WIDTH
  const gameAreaWidth = gameAreaRight - gameAreaLeft
  const cars = []
  for (let i = 0; i < carCount; i++) {
    const direction = Math.random() > 0.5 ? 1 : -1
    const carSpeed = (carSpeedMin + Math.random() * (carSpeedMax - carSpeedMin)) * direction
    const isSUV = Math.random() > 0.5
    const bodyWidth = isSUV ? 80 + Math.random() * 30 : 70 + Math.random() * 30
    const bodyHeight = isSUV ? 35 + Math.random() * 10 : 30 + Math.random() * 8
    const roofWidth = bodyWidth * 0.6
    const roofHeight = isSUV ? bodyHeight * 0.4 : bodyHeight * 0.5
    const wheelRadius = 10 + Math.random() * 4
    const bodyColor = 50 + Math.random() * 20
    const roofColor = bodyColor - 15
    const wheelColor = 30 + Math.random() * 15
    const windowColor = 80 + Math.random() * 20
    const padding = 20
    const canvasHeight = roofHeight + bodyHeight + wheelRadius + padding * 2
    const centerY = canvasHeight - padding - wheelRadius
    const carY = platformTopY - (centerY + wheelRadius - canvasHeight / 2)
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
    const spriteId = `car-${Date.now()}-${i}-${Math.random()}`
    k.loadSprite(spriteId, carSpriteDataURL)
    //
    // Release canvas backing store immediately after Kaplay reads it.
    //
    carSpriteDataURL.width = 0
    carSpriteDataURL.height = 0
    const startX = gameAreaLeft + (i / (carCount - 1)) * gameAreaWidth + (Math.random() - 0.5) * (gameAreaWidth / carCount)
    //
    // Headlight geometry: front bumper area at hood level
    //
    const headlightOffsetX = bodyWidth * 0.68
    const headlightOffsetY = -(canvasHeight / 2 - 20 - wheelRadius - bodyHeight * 0.30)
    const frontSign = carSpeed > 0 ? 1 : -1
    const carObj = k.add([
      k.sprite(spriteId),
      k.pos(startX, carY),
      k.anchor('center'),
      k.z(15.6),
      {
        speed: carSpeed,
        bodyWidth,
        gameAreaLeft,
        gameAreaRight,
        headlightOffsetX,
        headlightOffsetY,
        frontSign,
        update() {
          this.pos.x += this.speed * k.dt()
          if (this.speed > 0 && this.pos.x > this.gameAreaRight + 100) {
            this.pos.x = this.gameAreaLeft - this.bodyWidth - 100
          } else if (this.speed < 0 && this.pos.x < this.gameAreaLeft - this.bodyWidth - 100) {
            this.pos.x = this.gameAreaRight + 100
          }
          //
          // Dim body at night so only headlights remain prominent
          //
          this.opacity = Math.max(0.08, 1 - getDarkness() * 1.15)
        }
      }
    ])
    cars.push(carObj)
  }
  MovingCars.createHeadlightLayer(k, cars)
}

/**
 * Creates a blurred car sprite using canvas with blur filter
 * @param {Object} params - Car parameters
 * @returns {string} Data URL of the car sprite
 */
function createBlurredCarSprite({ bodyWidth, bodyHeight, roofWidth, roofHeight, wheelRadius, bodyColor, roofColor, wheelColor, windowColor, speed }) {
  const padding = 20
  const canvasWidth = bodyWidth + padding * 2
  const canvasHeight = roofHeight + bodyHeight + wheelRadius + padding * 2
  const centerX = canvasWidth / 2
  const centerY = canvasHeight - padding - wheelRadius
  
  return toCanvas({ width: canvasWidth, height: canvasHeight, pixelRatio: 1 }, (ctx) => {
    ctx.clearRect(0, 0, canvasWidth, canvasHeight)
    ctx.filter = 'blur(6px)'
    
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
    
    const outlineWidth = 1.5
    const outlineColor = bodyColor - 20
    
    drawRoundedRect(
      centerX - bodyWidth / 2 - outlineWidth,
      centerY - bodyHeight,
      bodyWidth + outlineWidth * 2,
      bodyHeight + outlineWidth * 2,
      4 + outlineWidth,
      outlineColor
    )
    
    drawRoundedRect(
      centerX - roofWidth / 2 - outlineWidth,
      centerY - bodyHeight - roofHeight - outlineWidth,
      roofWidth + outlineWidth * 2,
      roofHeight + outlineWidth * 2,
      4 + outlineWidth,
      outlineColor
    )
    
    drawRoundedRect(
      centerX - bodyWidth / 2,
      centerY - bodyHeight,
      bodyWidth,
      bodyHeight,
      4,
      bodyColor
    )
    
    drawRoundedRect(
      centerX - roofWidth / 2,
      centerY - bodyHeight - roofHeight,
      roofWidth,
      roofHeight,
      4,
      roofColor
    )
    
    const windowWidth = roofWidth / 2 - 8
    const windowHeight = roofHeight - 8
    const windowY = centerY - bodyHeight - roofHeight + 4
    
    const frontWindowX = speed > 0 ? centerX + roofWidth / 4 : centerX - roofWidth / 4
    ctx.fillStyle = `rgb(${windowColor}, ${windowColor}, ${windowColor})`
    ctx.fillRect(frontWindowX - windowWidth / 2, windowY, windowWidth, windowHeight)
    
    const rearWindowX = speed > 0 ? centerX - roofWidth / 4 : centerX + roofWidth / 4
    ctx.fillRect(rearWindowX - windowWidth / 2, windowY, windowWidth, windowHeight)
    
    const wheelY = centerY - wheelRadius
    const frontWheelX = centerX + bodyWidth / 3 - bodyWidth / 2
    const rearWheelX = centerX - bodyWidth / 3 + bodyWidth / 2
    
    ctx.fillStyle = `rgb(${wheelColor}, ${wheelColor}, ${wheelColor})`
    ctx.beginPath()
    ctx.arc(frontWheelX, wheelY, wheelRadius, 0, Math.PI * 2)
    ctx.fill()
    
    ctx.beginPath()
    ctx.arc(rearWheelX, wheelY, wheelRadius, 0, Math.PI * 2)
    ctx.fill()
    
    const rimRadius = wheelRadius - 3
    ctx.fillStyle = `rgb(${wheelColor + 25}, ${wheelColor + 25}, ${wheelColor + 25})`
    ctx.beginPath()
    ctx.arc(frontWheelX, wheelY, rimRadius, 0, Math.PI * 2)
    ctx.fill()
    ctx.beginPath()
    ctx.arc(rearWheelX, wheelY, rimRadius, 0, Math.PI * 2)
    ctx.fill()
    //
    // Diffused headlights at front bumper (same blur as body — soft glow)
    //
    const frontSign = speed > 0 ? 1 : -1
    const bumperY = centerY - bodyHeight * 0.26
    const headSpread = bodyWidth * 0.22
    const headRx = wheelRadius * 2.2
    const drawHeadDisc = (hx, hy) => {
      const grd = ctx.createRadialGradient(hx, hy, 0, hx, hy, headRx)
      grd.addColorStop(0, 'rgba(255, 250, 228, 0.22)')
      grd.addColorStop(0.35, 'rgba(255, 236, 195, 0.11)')
      grd.addColorStop(0.7, 'rgba(255, 218, 165, 0.045)')
      grd.addColorStop(1, 'rgba(255, 208, 150, 0)')
      ctx.fillStyle = grd
      ctx.beginPath()
      ctx.arc(hx, hy, headRx, 0, Math.PI * 2)
      ctx.fill()
    }
    const hxBase = centerX + frontSign * (bodyWidth * 0.56)
    drawHeadDisc(hxBase - frontSign * headSpread * 0.42, bumperY)
    drawHeadDisc(hxBase - frontSign * headSpread * 0.95, bumperY + wheelRadius * 0.12)
  })
}
//
// Night music controller: fades the three shared time-section music tracks out
// once darkness rises above the threshold and restores them smoothly at dawn.
// Also fires cricket chirps at random intervals during night.
// Uses null-guards since timeSectionMusic handles are populated asynchronously
// by startTimeSectionMusic / startClockMusic after their internal delays.
//
function onUpdateNightMusic(inst) {
  const darkness = getDarkness()
  const isNight = darkness > NIGHT_DARKNESS_THRESHOLD
  const dt = inst.k.dt()
  const fadeStep = NIGHT_MUSIC_TRANSITION_SPEED * dt
  if (isNight) {
    //
    // Fade ambient music toward silence (clock ticking stays audible at night).
    //
    if (timeSectionMusic.kids) {
      timeSectionMusic.kids.volume = Math.max(0, timeSectionMusic.kids.volume - fadeStep * CFG.audio.backgroundMusic.kids)
    }
    if (timeSectionMusic.time) {
      timeSectionMusic.time.volume = Math.max(0, timeSectionMusic.time.volume - fadeStep * CFG.audio.backgroundMusic.time)
    }
    //
    // Cricket chirps at random intervals.
    //
    inst.cricketTimer -= dt
    if (inst.cricketTimer <= 0) {
      Sound.playCricketSound(inst.sound)
      inst.cricketTimer = NIGHT_CRICKET_INTERVAL_MIN + Math.random() * (NIGHT_CRICKET_INTERVAL_MAX - NIGHT_CRICKET_INTERVAL_MIN)
    }
  } else {
    //
    // Restore volumes smoothly toward their target levels.
    //
    if (timeSectionMusic.kids) {
      timeSectionMusic.kids.volume = Math.min(CFG.audio.backgroundMusic.kids, timeSectionMusic.kids.volume + fadeStep * CFG.audio.backgroundMusic.kids)
    }
    if (timeSectionMusic.time) {
      timeSectionMusic.time.volume = Math.min(CFG.audio.backgroundMusic.time, timeSectionMusic.time.volume + fadeStep * CFG.audio.backgroundMusic.time)
    }
  }
}