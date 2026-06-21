import { CFG } from '../cfg.js'
import { initScene, startTimeSectionMusic, stopTimeSectionMusic, startClockMusic, checkSpeedBonus, createSunHoverFace, timeSectionMusic } from '../components/scene-helper.js'
import * as Hero from '../../../components/hero.js'
import * as TimePlatform from '../components/time-platform.js'
import * as StaticTimePlatform from '../components/static-time-platform.js'
import * as OneSpikes from '../components/one-spikes.js'
import * as Sound from '../../../utils/sound.js'
import { set, get } from '../../../utils/progress.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { toCanvas, parseHex, getRGB } from '../../../utils/helper.js'
import * as MovingCars from '../components/moving-cars.js'
import * as TimeLevel0Ambience from '../utils/time-level0-ambience.js'
import { getDarkness } from '../utils/time-day-night.js'
import * as BackgroundBirds from '../components/background-birds.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import * as LifeDeduction from '../../touch/utils/life-deduction.js'
import * as PixelClouds from '../../../components/pixel-clouds.js'
//
//
const [TIME_LIFE_DEDUCT_BG_R, TIME_LIFE_DEDUCT_BG_G, TIME_LIFE_DEDUCT_BG_B] = parseHex(CFG.visual.colors.background)
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
const NIGHT_DARKNESS_THRESHOLD = 0.45
const NIGHT_MUSIC_TRANSITION_SPEED = 1.5
const NIGHT_CRICKET_INTERVAL_MIN = 1.5
const NIGHT_CRICKET_INTERVAL_MAX = 4.0
const NIGHT_CAR_HORN_INTERVAL_MIN = 5
const NIGHT_CAR_HORN_INTERVAL_MAX = 15
//
// Background clouds — 8 clouds at fully random X positions within the play area
//
const CLOUD_COUNT = 8
const CLOUD_Z = 14.5
const CLOUD_SIZE_MIN = 45
const CLOUD_SIZE_MAX = 110
const CLOUD_LAYERS_MIN = 8
const CLOUD_LAYERS_MAX = 16
const CLOUD_Y_OFFSET_MIN = 15
const CLOUD_Y_OFFSET_MAX = 130
const CLOUD_SCHEMES = [
  { baseColor: '#f0f0f0', shadowColor: '#a0a0b8', highlightColor: '#ffffff' },
  { baseColor: '#606060', shadowColor: '#202030', highlightColor: '#909090' },
  { baseColor: '#405070', shadowColor: '#151828', highlightColor: '#708090' }
]
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
// Small hero and life icon tooltips (appear below)
//
const SMALL_HERO_TOOLTIP_TEXT = "Your fragments"
const SMALL_HERO_TOOLTIP_SIZE = 80
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_TEXT = "Life score"
const LIFE_TOOLTIP_SIZE = 80
const LIFE_TOOLTIP_Y_OFFSET = 50
//
// Anti-hero tooltip
//
const ANTIHERO_TOOLTIP_TEXT = "Time waits for no one"
const ANTIHERO_TOOLTIP_HOVER_WIDTH = 80
const ANTIHERO_TOOLTIP_HOVER_HEIGHT = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
//
// Hero tooltip
//
const HERO_TOOLTIP_TEXT = "Time flies..."
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -60
//
// Bonus hero — hidden platform shaped as 00:00, top-left of rightmost platform
//
const BONUS_PLATFORM_X = 920
const BONUS_PLATFORM_Y = 555
//
// Collision width is wider than the visual "00:00" text so the hero can reliably
// land on the platform. The visual (text) is drawn centered and is unaffected by this.
//
const BONUS_PLATFORM_WIDTH = 80
const BONUS_STORAGE_KEY = 'time.level0BonusCollected'
const BONUS_HERO_COLOR = "#8B5A50"
//
// Life deduction (show hint + control platform 6 trap)
//
const LIFE_DEDUCT_THRESHOLD = 5
const LIFE_DEDUCT_FLAG = 'time.level0TrapAdded'
//
// Grace-period flag: set on the FIRST entry when trap conditions are met so the
// dialog fires on the SECOND entry (after the hero has had one free attempt).
//
const LIFE_DEDUCT_GRACE_FLAG = 'time.level0TrapGrace'
//
// Resting birds near the anti-hero: small silhouettes that scatter on hero landing
//
const BIRD_COUNT = 4
//
// Last lamp post: gaLeft(192) + LAMP_X_OFFSETS[3](1140) = 1332, arm extends +84px.
// Birds perch clustered on the arc mid-span, close together.
//
const BIRD_PERCH_X = 1380
//
// Lamp arm bezier geometry for the last lamp (index 3), used to position birds on the arc.
// poleTopCx = PLATFORM_SIDE_WIDTH + 1140 = 1332.
// topY = streetSurfaceY(+17) - lampBase(-4) - poleHeight(-185) = height - bottom - 172 = 653.
// Arc x(t) = poleTopCx + 124t - 40t².
// Arc y(t) = topY - 40t + 69t².
// LAMP_ARC_FOOT_OFFSET: half arm tube width; bird feet sit slightly below arc centerline.
//
const LAST_LAMP_POLE_X = PLATFORM_SIDE_WIDTH + 1140
const LAST_LAMP_TOP_Y = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT - 172
const LAMP_ARC_FOOT_OFFSET = 4
//
// Horizontal spread across the lamp beam: birds spaced ~12px apart along the arm.
//
const BIRD_SPREAD_X = 48
//
// Wing flap speed range when birds scatter (radians per second).
//
const BIRD_WING_FLAP_SPEED_MIN = 8
const BIRD_WING_FLAP_SPEED_RANGE = 5
//
// Horizontal distance at which birds react. Y-distance is ignored because the hero
// always stays far below the lamp arc and never reaches bird height.
//
const BIRD_SCATTER_DIST_X = 80
const BIRD_FLY_SPEED_X_MIN = 55
const BIRD_FLY_SPEED_X_RANGE = 100
const BIRD_FLY_SPEED_Y_MIN = 230
const BIRD_FLY_SPEED_Y_RANGE = 130
const BIRD_FLY_GRAVITY = 60
const BIRD_FADE_DURATION = 1.4
//
// Darkness threshold: birds rest and scatter only during daytime (low darkness)
//
const BIRD_DAY_DARKNESS_MAX = 0.35
const BIRD_DRAW_Z = 18

/**
 * Time section level 0 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-time.0", () => {
    //
    // Track current section for music routing; scores carry over from touch unchanged.
    //
    set('lastSection', 'time')
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
    // Restore kids volume if it was muted during a previous night cycle.
    // Happens when the scene restarts (hero dies) while music was faded out at night
    // but the day/night cycle has since returned to daytime.
    //
    k.wait(0.2, () => {
      if (timeSectionMusic.kids && getDarkness() < NIGHT_DARKNESS_THRESHOLD) {
        timeSectionMusic.kids.volume = CFG.audio.backgroundMusic.kids
      }
    })
    //
    // Start clock.mp3 (stored in timeSectionMusic for proper transition stopping)
    //
    startClockMusic(k)
    //
    // Night music controller: fade kids/time tracks at dusk, restore at dawn.
    //
    const nightMusicState = {
      k,
      sound,
      cricketTimer: NIGHT_CRICKET_INTERVAL_MIN + Math.random() * (NIGHT_CRICKET_INTERVAL_MAX - NIGHT_CRICKET_INTERVAL_MIN),
      carHornTimer: NIGHT_CAR_HORN_INTERVAL_MIN + Math.random() * (NIGHT_CAR_HORN_INTERVAL_MAX - NIGHT_CAR_HORN_INTERVAL_MIN)
    }
    k.onUpdate(() => onUpdateNightMusic(nightMusicState))
    //
    // Start beginning phrase about time
    //
    Sound.playOnce(k, HERO_FIRST_THOUGHTS_DELAY, 'time0', CFG.audio.backgroundMusic.words)
    //
    // Holds the bonus platform instance once created — used in onAnnihilation
    // to persist the collected state only on successful level completion.
    //
    let bonusHeroInst = null
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
      heroDustColor: '#000000',
      onAnnihilation: () => {
        //
        // Persist bonus collection to localStorage only on successful level completion.
        // If the hero died, this never runs and the bonus reverts on restart.
        //
        BonusHero.finalizeCollection(bonusHeroInst)
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
        const transitionDelay = speedBonusEarned ? 2.8 : 1.8
        //
        // Clear grace flag on level success so it doesn't linger
        //
        set(LIFE_DEDUCT_GRACE_FLAG, false)
        k.wait(transitionDelay, () => {
          createLevelTransition(k, 'level-time.0')
        })
      },
      showGameClock: true
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
      showElapsedTimer: false,
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
    // Sparse decorative clouds (very rare — 3 total across the level)
    //
    createSparseClouds(k)
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
    // Street ambience: distant motors, birds, faulty Г-shaped lamp, manhole steam
    //
    const level0Ambience = TimeLevel0Ambience.create({
      k,
      sound,
      platformSideWidth: PLATFORM_SIDE_WIDTH,
      platformBottomHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      antiHeroSpawnX: ANTIHERO_SPAWN_X,
      heroInst: hero,
      crowLampIndex: 0,
      crowTooltipText: 'at least he has arms'
    })
    k.onSceneLeave(() => level0Ambience.cleanup())
    //
    // Force-refresh HUD life score display (guards against init-order edge cases)
    //
    levelIndicator.updateLifeScore(get('lifeScore', 0))
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
    //
    // Life deduction: show hint at level start if lifeScore >= threshold
    // Platform 6 trap only activates if the hint was shown (current or previous visit)
    //
    const currentLifeScore = get('lifeScore', 0)
    const trapAlreadyAdded = get(LIFE_DEDUCT_FLAG, false)
    const graceVisitDone = get(LIFE_DEDUCT_GRACE_FLAG, false)
    //
    // Grace period: on the first entry when conditions are met, set the grace flag
    // and skip the dialog (give the hero one free attempt). On the second entry
    // (graceVisitDone = true), show the dialog as usual.
    //
    const trapConditionsMet = !trapAlreadyAdded && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    const showTrap = trapConditionsMet && graceVisitDone
    if (trapConditionsMet && !graceVisitDone) {
      set(LIFE_DEDUCT_GRACE_FLAG, true)
    }
    if (showTrap) {
      //
      // Clear grace flag since dialog is about to fire
      //
      set(LIFE_DEDUCT_GRACE_FLAG, false)
    }
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
        textColorRgb: { r: 255, g: 140, b: 0 }
      })
    }
    let platform6HasActivated = !trapEnabled
    
    k.onUpdate(() => {
      //
      // Check if hero moves right past platform 5 edge (only if trap is enabled and hasn't activated yet)
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
      levelIndicator,
      //
      // Skip ones at lamp pole footprints: gaLeft(192) + LAMP_X_OFFSETS[1..3]
      //
      excludeX: [192 + 480, 192 + 810, 192 + 1140]
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
    bonusHeroInst = BonusHero.create({
      k,
      x: BONUS_PLATFORM_X,
      y: BONUS_PLATFORM_Y,
      width: BONUS_PLATFORM_WIDTH,
      heroInst: hero,
      levelIndicator,
      sfx: sound,
      heroBodyColor: BONUS_HERO_COLOR,
      storageKey: BONUS_STORAGE_KEY,
      approachFromAbove: true,
      revealDistance: 120,
      //
      // Collision box: shifted right by ~half the original width, then widened 5px
      // on each side. XOffset = original(60) − halfWidth(30) = 30.
      //
      collisionWidth: 69,
      platformCollisionHeight: 12,
      platformCollisionXOffset: 30,
      platformCollisionYOffset: 0,
      platformText: "00:00"
    })
    //
    // Resting birds near the anti-hero: they scatter when the hero lands close by
    //
    createRestingBirds(k, hero, sound)
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
 * Creates rounded corners for game area to soften sharp edges where platforms meet
 * @param {Object} k - Kaplay instance
 */
function createRoundedCorners(k) {
  const radius = CORNER_RADIUS
  const cornerColor = CFG.visual.colors.background
  const cornerDataURL = createRoundedCornerSprite(radius, cornerColor)
  k.loadSprite('corner-sprite', cornerDataURL)
  //
  // Release canvas backing store immediately after Kaplay reads it.
  //
  cornerDataURL.width = 0
  cornerDataURL.height = 0
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
//
// Returns the y position (feet level) on the last lamp arm bezier at a given world x.
// Uses the quadratic bezier: y(t) = LAST_LAMP_TOP_Y - 40t + 69t², x(t) = LAST_LAMP_POLE_X + 124t - 40t².
// Solves x(t) = xAbs for t, then evaluates y(t) minus LAMP_ARC_FOOT_OFFSET.
//
function birdArcFeetY(xAbs) {
  const xRel = xAbs - LAST_LAMP_POLE_X
  const disc = 15376 - 160 * xRel
  if (disc < 0) return LAST_LAMP_TOP_Y - LAMP_ARC_FOOT_OFFSET
  const t = (124 - Math.sqrt(disc)) / 80
  return LAST_LAMP_TOP_Y - 40 * t + 69 * t * t - LAMP_ARC_FOOT_OFFSET
}
//
// Resting birds near the anti-hero, scattered to the left. They fly away when
// the hero lands within BIRD_SCATTER_RADIUS. Wing-flap sound fires once.
//
function createRestingBirds(k, heroInst, sound) {
  const birds = []
  for (let i = 0; i < BIRD_COUNT; i++) {
    const size = 5 + Math.random() * 3
    //
    // Spread birds symmetrically around the lamp arc perch point, close together.
    //
    const xOff = (i - (BIRD_COUNT - 1) / 2) * (BIRD_SPREAD_X / BIRD_COUNT) + (Math.random() - 0.5) * 4
    const birdX = BIRD_PERCH_X + xOff
    //
    // Compute the lamp arm arc y at this bird's x so each bird follows the curve.
    // Bird center is placed so that feet (y + size*1.5) land on the arc surface.
    //
    const feetY = birdArcFeetY(birdX)
    birds.push({
      x: birdX,
      y: feetY - size * 1.5,
      vx: 0,
      vy: 0,
      scattered: false,
      opacity: 1,
      fadeTimer: 0,
      size,
      wingAngle: Math.random() * Math.PI * 2,
      wingFlapSpeed: BIRD_WING_FLAP_SPEED_MIN + Math.random() * BIRD_WING_FLAP_SPEED_RANGE
    })
  }
  let scattered = false
  k.add([
    k.z(BIRD_DRAW_Z),
    k.fixed(),
    {
      draw() {
        //
        // Birds are only visible during daytime
        //
        if (getDarkness() <= BIRD_DAY_DARKNESS_MAX) drawBirds(k, birds)
      },
      update() { onUpdateBirds(k, heroInst, birds, scattered, sound) }
    }
  ])
  //
  // Scatter birds on horizontal proximity only — the hero always walks far below
  // the lamp arc so Euclidean distance would never fall within a useful radius.
  //
  k.onUpdate(() => {
    if (scattered) return
    //
    // Birds only react during daytime — stay still at night
    //
    if (getDarkness() > BIRD_DAY_DARKNESS_MAX) return
    const heroX = heroInst.character?.pos?.x ?? 0
    const distX = Math.abs(heroX - BIRD_PERCH_X)
    if (distX > BIRD_SCATTER_DIST_X) return
    scattered = true
    Sound.playWingFlapSound(sound)
    for (const bird of birds) {
      bird.scattered = true
      //
      // Each bird flies in a slightly different direction for realistic dispersal.
      // Most fly left (away from the hero who approaches from the left), but some
      // curve right to create a natural flock split.
      //
      const dirX = Math.random() < 0.75 ? -1 : 1
      bird.vx = dirX * (BIRD_FLY_SPEED_X_MIN + Math.random() * BIRD_FLY_SPEED_X_RANGE)
      bird.vy = -(BIRD_FLY_SPEED_Y_MIN + Math.random() * BIRD_FLY_SPEED_Y_RANGE)
    }
  })
}
//
// Moves flying birds upward / outward and fades them when they scatter.
//
function onUpdateBirds(k, heroInst, birds, scattered, sound) {
  const dt = k.dt()
  for (const bird of birds) {
    if (!bird.scattered) continue
    bird.x += bird.vx * dt
    bird.y += bird.vy * dt
    bird.vy += BIRD_FLY_GRAVITY * dt
    bird.fadeTimer += dt
    bird.opacity = Math.max(0, 1 - bird.fadeTimer / BIRD_FADE_DURATION)
    //
    // Animate wings flapping while bird is in flight
    //
    bird.wingAngle += bird.wingFlapSpeed * dt
  }
}
//
// Draws each bird:
//   Resting  — body oval + round head + short tail + tiny legs on the ground.
//   In flight — body oval + spread wings (fades out as bird disappears).
//
function drawBirds(k, birds) {
  const bodyColor = k.rgb(30, 26, 30)
  const wingColor = k.rgb(20, 18, 22)
  const legColor = k.rgb(70, 55, 30)
  const beakColor = k.rgb(160, 110, 40)
  const eyeWhite = k.rgb(230, 225, 215)
  const eyeDark = k.rgb(15, 12, 15)
  for (const bird of birds) {
    if (bird.scattered && bird.opacity <= 0) continue
    const { x, y, size, opacity, scattered } = bird
    //
    // Body oval
    //
    k.drawEllipse({
      pos: k.vec2(x, y),
      radiusX: size * (scattered ? 1.0 : 1.2),
      radiusY: size * 0.55,
      color: bodyColor,
      opacity
    })
    if (!scattered) {
      //
      // Round head on the left side (birds face left, toward the hero start)
      //
      const headX = x - size * 0.85
      const headY = y - size * 0.35
      k.drawCircle({
        pos: k.vec2(headX, headY),
        radius: size * 0.5,
        color: bodyColor,
        opacity
      })
      //
      // Small beak — tiny triangle pointing left from head
      //
      k.drawTriangle({
        p1: k.vec2(headX - size * 0.55, headY),
        p2: k.vec2(headX - size * 0.15, headY - size * 0.15),
        p3: k.vec2(headX - size * 0.15, headY + size * 0.15),
        color: beakColor,
        opacity
      })
      //
      // Eye: small white circle with dark pupil
      //
      const eyeX = headX - size * 0.1
      const eyeY = headY - size * 0.22
      k.drawCircle({ pos: k.vec2(eyeX, eyeY), radius: size * 0.2, color: eyeWhite, opacity })
      k.drawCircle({ pos: k.vec2(eyeX - size * 0.07, eyeY), radius: size * 0.09, color: eyeDark, opacity })
      //
      // Short triangular tail pointing right (opposite to head)
      //
      k.drawTriangle({
        p1: k.vec2(x + size * 0.7, y - size * 0.1),
        p2: k.vec2(x + size * 1.5, y - size * 0.45),
        p3: k.vec2(x + size * 1.5, y + size * 0.2),
        color: bodyColor,
        opacity
      })
      //
      // Tiny legs down to lamp arc surface
      //
      const legTopY = y + size * 0.5
      const legBotY = y + size * 1.5
      k.drawLine({ p1: k.vec2(x - size * 0.2, legTopY), p2: k.vec2(x - size * 0.2, legBotY), width: 1.0, color: legColor, opacity })
      k.drawLine({ p1: k.vec2(x + size * 0.2, legTopY), p2: k.vec2(x + size * 0.2, legBotY), width: 1.0, color: legColor, opacity })
      //
      // Short horizontal toe stubs
      //
      k.drawLine({ p1: k.vec2(x - size * 0.6, legBotY), p2: k.vec2(x + size * 0.2, legBotY), width: 1.0, color: legColor, opacity })
      k.drawLine({ p1: k.vec2(x - size * 0.2, legBotY), p2: k.vec2(x + size * 0.6, legBotY), width: 1.0, color: legColor, opacity })
    } else {
      //
      // Flapping wings: tip Y oscillates via sine wave driven by bird.wingAngle.
      // Full down: y + size*0.3, full up: y - size*1.6.
      //
      const wingSpread = size * 2.2
      const flapT = (Math.sin(bird.wingAngle) + 1) / 2
      const wingTip = y + size * (0.3 - 1.9 * flapT)
      k.drawTriangle({ p1: k.vec2(x, y - size * 0.3), p2: k.vec2(x - wingSpread, wingTip), p3: k.vec2(x, y + size * 0.2), color: wingColor, opacity })
      k.drawTriangle({ p1: k.vec2(x, y - size * 0.3), p2: k.vec2(x + wingSpread, wingTip), p3: k.vec2(x, y + size * 0.2), color: wingColor, opacity })
    }
  }
}
//
// Creates decorative pixel clouds at fully random positions in the top area.
// Clouds are pre-baked on one canvas and shown as a single sprite.
//
function createSparseClouds(k) {
  const screenWidth = k.width()
  const cloudY = PLATFORM_TOP_HEIGHT + 55
  const playAreaWidth = screenWidth - PLATFORM_SIDE_WIDTH * 2
  const canvas = document.createElement('canvas')
  canvas.width = screenWidth
  canvas.height = 350
  const ctx = canvas.getContext('2d')
  //
  // Draw each cloud at a fully random X position within the play area
  //
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const x = PLATFORM_SIDE_WIDTH + Math.random() * playAreaWidth
    const yOffset = CLOUD_Y_OFFSET_MIN + Math.random() * (CLOUD_Y_OFFSET_MAX - CLOUD_Y_OFFSET_MIN)
    const size = CLOUD_SIZE_MIN + Math.random() * (CLOUD_SIZE_MAX - CLOUD_SIZE_MIN)
    const layers = CLOUD_LAYERS_MIN + Math.floor(Math.random() * (CLOUD_LAYERS_MAX - CLOUD_LAYERS_MIN))
    const scheme = CLOUD_SCHEMES[Math.floor(Math.random() * CLOUD_SCHEMES.length)]
    const lightSide = Math.random() > 0.5 ? 'left' : 'right'
    drawCloudOnCanvas(ctx, { x, y: yOffset, size, layers, lightSide, ...scheme, pixelSize: 2 })
  }
  const spriteData = canvas.toDataURL()
  canvas.width = 0
  canvas.height = 0
  k.loadSprite('level0-clouds', spriteData)
  k.add([
    k.sprite('level0-clouds'),
    k.pos(0, cloudY - 55),
    k.z(CLOUD_Z),
    k.fixed()
  ])
}
//
// Draws a single cloud using the metaball (bubble) technique onto a canvas context.
// Mirrors the algorithm from level2.js for shared pixel-art style.
//
function drawCloudOnCanvas(ctx, config) {
  const {
    x,
    y,
    size = 80,
    layers = 12,
    lightSide = 'right',
    baseColor = '#f0f0f0',
    shadowColor = '#a0a0b8',
    highlightColor = '#ffffff',
    pixelSize = 2
  } = config
  const base = parseCloudHex(baseColor)
  const shadow = parseCloudHex(shadowColor)
  const highlight = parseCloudHex(highlightColor)
  const cloudLayers = []
  for (let li = 0; li < layers; li++) {
    const depth = li / layers
    const bubbles = []
    const count = 3 + Math.floor(Math.random() * 5)
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * size * 0.5
      const radius = size * 0.15 + Math.random() * size * 0.25
      bubbles.push({
        x: Math.cos(angle) * dist,
        y: Math.sin(angle) * dist * 0.6 - (depth - 0.5) * size * 0.3,
        radius,
        density: 0.5 + Math.random() * 0.4
      })
    }
    cloudLayers.push({ bubbles, depth, lightBoost: depth * 0.6, darkness: (1 - depth) * 0.3 })
  }
  const half = size
  for (const layer of cloudLayers) {
    for (let py = -half; py <= half; py += pixelSize) {
      for (let px = -half; px <= half; px += pixelSize) {
        let density = 0
        for (const b of layer.bubbles) {
          const d = Math.sqrt((px - b.x) ** 2 + (py - b.y) ** 2)
          if (d < b.radius) {
            const f = 1 - d / b.radius
            density += f * f * b.density
          }
        }
        if (density <= 0.25 - layer.depth * 0.1) continue
        density = Math.min(density, 1)
        let lf
        if (lightSide === 'right') lf = (px / half) * 0.5 + 0.5
        else lf = (-px / half) * 0.5 + 0.5
        lf = Math.max(0, Math.min(1, lf * 0.5 + density * 0.2 + layer.lightBoost - layer.darkness))
        let r, g, b
        if (lf > 0.65) {
          const t = (lf - 0.65) / 0.35
          r = Math.floor(base.r + (highlight.r - base.r) * t)
          g = Math.floor(base.g + (highlight.g - base.g) * t)
          b = Math.floor(base.b + (highlight.b - base.b) * t)
        } else if (lf > 0.3) {
          r = base.r; g = base.g; b = base.b
        } else {
          const t = lf / 0.3
          r = Math.floor(shadow.r + (base.r - shadow.r) * t)
          g = Math.floor(shadow.g + (base.g - shadow.g) * t)
          b = Math.floor(shadow.b + (base.b - shadow.b) * t)
        }
        ctx.fillStyle = `rgb(${r},${g},${b})`
        ctx.fillRect(x + px, y + py, pixelSize, pixelSize)
      }
    }
  }
}
//
// Converts #rrggbb hex string to { r, g, b } object (cloud rendering helper)
//
function parseCloudHex(hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return m ? { r: parseInt(m[1], 16), g: parseInt(m[2], 16), b: parseInt(m[3], 16) } : { r: 255, g: 255, b: 255 }
}
//
// Night music controller: fades the shared time-section music tracks out at dusk
// and restores them smoothly at dawn. Also fires cricket chirps during night.
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
  //
  // Car horns play both day and night (city always has traffic)
  //
  inst.carHornTimer -= dt
  if (inst.carHornTimer <= 0) {
    Sound.playCarHornSound(inst.sound)
    inst.carHornTimer = NIGHT_CAR_HORN_INTERVAL_MIN + Math.random() * (NIGHT_CAR_HORN_INTERVAL_MAX - NIGHT_CAR_HORN_INTERVAL_MIN)
  }
}
