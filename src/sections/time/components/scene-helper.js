import { CFG } from '../cfg.js'
import { getColor } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { get, set } from '../../../utils/progress.js'

const MUSIC_START_DELAY = 6.0
//
// Sun position and radius (matches city-background.js calculations)
//
const SUN_X = CFG.visual.screen.width * 0.85 - 100
const SUN_Y = CFG.visual.screen.height * 0.2 + 150
const SUN_RADIUS = 90
//
// Sun hover detection and face fade speed
//
const SUN_HOVER_SPEED = 3
const SUN_HOVER_MARGIN = 20
//
// Sun smiley face dimensions (relative to SUN_RADIUS)
//
const SUN_EYE_OFFSET_X = 0.28
const SUN_EYE_OFFSET_Y = -0.15
const SUN_EYE_RADIUS = 0.14
const SUN_PUPIL_RADIUS = 0.07
const SUN_MOUTH_Y = 0.25
const SUN_MOUTH_WIDTH = 0.5
const SUN_MOUTH_HEIGHT = 0.22
const SUN_TOOTH_WIDTH = 0.1
const SUN_TOOTH_HEIGHT = 0.08
//
// Global music instances for time section (persist across level reloads)
//
export let timeSectionMusic = {
  kids: null,
  time: null,
  clock: null
}

/**
 * Starts time section background music (only if not already playing)
 * Note: Does not start clock.mp3 - that is managed per-level for synchronization
 * @param {Object} k - Kaplay instance
 */
export function startTimeSectionMusic(k, music = false) {
  const delay = get('sounds.time0') ? 0 : MUSIC_START_DELAY
  k.wait(delay, () => {
    if (!timeSectionMusic.kids) {
      timeSectionMusic.kids = k.play('time0-kids', {
        loop: true,
        volume: CFG.audio.backgroundMusic.kids
      })
    }
    if (music && !timeSectionMusic.time) {
      timeSectionMusic.time = k.play('time', {
        loop: true,
        volume: CFG.audio.backgroundMusic.time
      })
    }
  })
}

/**
 * Starts clock.mp3 background music and stores handle for proper stopping
 * @param {Object} k - Kaplay instance
 */
export function startClockMusic(k) {
  if (timeSectionMusic.clock) {
    timeSectionMusic.clock.stop()
  }
  timeSectionMusic.clock = Sound.playInScene(k, 'clock', CFG.audio.backgroundMusic.clock, true)
}
/**
 * Stops all time section background music
 * @param {Object} k - Optional Kaplay instance for direct sound stopping
 */
export function stopTimeSectionMusic(k) {
  if (timeSectionMusic.kids) {
    timeSectionMusic.kids.stop()
    timeSectionMusic.kids = null
  }
  if (timeSectionMusic.time) {
    timeSectionMusic.time.stop()
    timeSectionMusic.time = null
  }
  if (timeSectionMusic.clock) {
    timeSectionMusic.clock.stop()
    timeSectionMusic.clock = null
  }
  //
  // Also try to stop sounds directly via Kaplay (fallback)
  //
  if (k) {
    const soundsToStop = ['clock', 'time', 'time0-kids']
    soundsToStop.forEach(soundName => {
      try {
        const sound = k.getSound(soundName)
        if (sound) {
          sound.stop()
        }
      } catch (e) {
        // Sound not found or already stopped
      }
    })
  }
}

/**
 * Adds background to the scene
 * @param {Object} k - Kaplay instance
 * @param {String} color - Background color in hex format
 * @returns {Object} Background object
 */
function addBackground(k, color) {
  return k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    getColor(k, color),
    k.z(CFG.visual.zIndex.background)
  ])
}

/**
 * Initialize time section scene with heroes and common setup
 * @param {Object} config - Scene configuration
 * @param {Object} config.k - Kaplay instance
 * @param {string} config.levelName - Level name (e.g., 'level-time.0')
 * @param {number} [config.levelNumber] - Level number for indicator (1-4 for T, 1, M, E)
 * @param {string} [config.nextLevel] - Next level name
 * @param {boolean} [config.skipPlatforms=false] - Skip platform creation
 * @param {number} [config.bottomPlatformHeight] - Bottom platform height
 * @param {number} [config.topPlatformHeight] - Top platform height
 * @param {number} [config.sideWallWidth] - Side wall width
 * @param {number} [config.heroX] - Hero X position
 * @param {number} [config.heroY] - Hero Y position
 * @param {number} [config.antiHeroX] - Anti-hero X position
 * @param {number} [config.antiHeroY] - Anti-hero Y position
 * @param {Array} [config.platformGap] - Platform gaps configuration
 * @param {Function} [config.onAnnihilation] - Callback when hero meets anti-hero
 * @returns {Object} Scene instance with sound, hero, and antiHero
 */
export function initScene(config) {
  const { 
    k, 
    levelName,
    levelNumber = null,
    skipPlatforms = false,
    bottomPlatformHeight = 360,
    topPlatformHeight = 360,
    sideWallWidth = 162,
    heroX = null,
    heroY = null,
    antiHeroX = null,
    antiHeroY = null,
    platformGap = null,
    onAnnihilation = null
  } = config  
  //
  // Set gravity
  //
  k.setGravity(CFG.game.gravity)
  
  //
  // Create sound instance and stop ambient from menu
  //
  const sound = Sound.create()
  Sound.stopAmbient(sound)
  
  //
  // Set background color using Kaplay API
  //
  k.setBackground(k.Color.fromHex(CFG.visual.colors.background))
  
  //
  // Add background rectangle as game object
  //
  addBackground(k, CFG.visual.colors.background)
  
  //
  // Add platforms (unless skipped)
  //
  if (!skipPlatforms) {
    addPlatforms(k, CFG.visual.colors.background, bottomPlatformHeight, topPlatformHeight, sideWallWidth, platformGap)
  }
  //
  // Add level indicator if levelNumber provided
  // Hero body color matches the actual hero: orange when time complete, brown when touch complete, gray otherwise
  //
  const isTimeCompleteForIndicator = get('time', false)
  const isTouchCompleteForIndicator = get('touch', false)
  const indicatorHeroColor = isTimeCompleteForIndicator ? "#FF8C00" : isTouchCompleteForIndicator ? "#8B5A50" : CFG.visual.colors.hero.body
  let levelIndicator = null
  if (levelNumber && topPlatformHeight && sideWallWidth) {
    levelIndicator = LevelIndicator.create({
      k,
      levelNumber,
      activeColor: "#FFFFFF",
      inactiveColor: "#555555",
      heroBodyColor: indicatorHeroColor,
      topPlatformHeight,
      sideWallWidth
    })
  }
  
  //
  // Setup back to menu
  //
  CFG.controls.backToMenu.forEach(key => {
    k.onKeyPress(key, () => {
      //
      // Stop time section music when leaving section
      //
      stopTimeSectionMusic()
      //
      // Restore volume to 1 and unmute procedural sounds when going to menu
      //
      k.volume(1)
      Sound.unmuteProceduralSounds()
      k.go("menu")
    })
  })
  
  let hero = null
  let antiHero = null
  
  //
  // Create heroes if positions provided
  //
  if (heroX !== null && heroY !== null && antiHeroX !== null && antiHeroY !== null) {
    const heroesResult = createLevelHeroes(k, sound, levelName, heroX, heroY, antiHeroX, antiHeroY, onAnnihilation)
    hero = heroesResult.hero
    antiHero = heroesResult.antiHero
  }
  
  return { sound, hero, antiHero, levelIndicator }
}

/**
 * Add platforms to the scene
 * @param {Object} k - Kaplay instance
 * @param {string} color - Platform color
 * @param {number} bottomHeight - Bottom platform height
 * @param {number} topHeight - Top platform height
 * @param {number} sideWidth - Side wall width
 * @param {Array} [gaps] - Platform gaps configuration
 */
function addPlatforms(k, color, bottomHeight, topHeight, sideWidth, gaps = null) {
  const platformRgb = getColor(k, color)?.color
  //
  // Top platform (starts from y=0, extends down by topHeight)
  //
  k.add([
    k.rect(k.width(), topHeight),
    k.pos(0, 0),  // Start from top of screen (y = 0)
    k.area(),
    k.body({ isStatic: true }),
    k.color(platformRgb.r, platformRgb.g, platformRgb.b),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  
  //
  // Bottom platform (with optional gaps)
  //
  if (gaps && gaps.length > 0) {
    //
    // Create platform segments with gaps
    //
    let currentX = 0
    gaps.forEach(gap => {
      const segmentWidth = gap.x - currentX
      if (segmentWidth > 0) {
        k.add([
          k.rect(segmentWidth, bottomHeight),
          k.pos(currentX, k.height() - bottomHeight),
          k.area(),
          k.body({ isStatic: true }),
          k.color(platformRgb.r, platformRgb.g, platformRgb.b),
          k.z(CFG.visual.zIndex.platforms),
          CFG.game.platformName
        ])
      }
      currentX = gap.x + gap.width
    })
    
    //
    // Final segment after last gap
    //
    const finalWidth = k.width() - currentX
    if (finalWidth > 0) {
      k.add([
        k.rect(finalWidth, bottomHeight),
        k.pos(currentX, k.height() - bottomHeight),
        k.area(),
        k.body({ isStatic: true }),
        k.color(platformRgb.r, platformRgb.g, platformRgb.b),
        k.z(CFG.visual.zIndex.platforms),
        CFG.game.platformName
      ])
    }
  } else {
    //
    // Solid bottom platform (extends up from bottom of screen)
    // For level-time.0, make it reach to the very bottom
    //
    const bottomY = k.height() - bottomHeight  // Position so platform extends to k.height()
    k.add([
      k.rect(k.width(), bottomHeight),
      k.pos(0, bottomY),  // Start from calculated Y, extends down to k.height()
      k.area(),
      k.body({ isStatic: true }),
      k.color(platformRgb.r, platformRgb.g, platformRgb.b),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
  }
  
  //
  // Left wall
  //
  k.add([
    k.rect(sideWidth, k.height() - topHeight - bottomHeight),
    k.pos(0, topHeight),
    k.area(),
    k.body({ isStatic: true }),
    k.color(platformRgb.r, platformRgb.g, platformRgb.b),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  
  //
  // Right wall
  //
  k.add([
    k.rect(sideWidth, k.height() - topHeight - bottomHeight),
    k.pos(k.width() - sideWidth, topHeight),
    k.area(),
    k.body({ isStatic: true }),
    k.color(platformRgb.r, platformRgb.g, platformRgb.b),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
}

/**
 * Create hero and anti-hero for level
 * @param {Object} k - Kaplay instance
 * @param {Object} sound - Sound instance
 * @param {string} levelName - Level name
 * @param {number} heroX - Hero X position
 * @param {number} heroY - Hero Y position
 * @param {number} antiHeroX - Anti-hero X position
 * @param {number} antiHeroY - Anti-hero Y position
 * @param {Function} onAnnihilation - Callback when hero meets anti-hero
 * @returns {Object} Object with hero and antiHero instances
 */
function createLevelHeroes(k, sound, levelName, heroX, heroY, antiHeroX, antiHeroY, onAnnihilation) {
  //
  // Check completed sections for hero appearance
  //
  const isWordComplete = get('word', false)
  const isTimeComplete = get('time', false)
  const isTouchComplete = get('touch', false)
  //
  // Hero body color: yellow if time complete, brown if touch complete, otherwise gray
  //
  const heroBodyColor = isTimeComplete ? "#FF8C00" : isTouchComplete ? "#8B5A50" : CFG.visual.colors.hero.body
  
  const antiHeroInst = Hero.create({
    k,
    x: antiHeroX,
    y: antiHeroY,
    type: Hero.HEROES.ANTIHERO,
    controllable: false,
    sfx: null,
    bodyColor: "#FF8C00",
    outlineColor: CFG.visual.colors.outline,
    addArms: true,
    addWatch: true
  })
  
  const heroInst = Hero.create({
    k,
    x: heroX,
    y: heroY,
    type: Hero.HEROES.HERO,
    controllable: true,
    sfx: sound,
    antiHero: antiHeroInst,
    onAnnihilation: onAnnihilation || (() => k.go(levelName)),
    currentLevel: levelName,
    bodyColor: heroBodyColor,  // Yellow if time complete, gray otherwise
    outlineColor: CFG.visual.colors.hero.outline,
    addMouth: isWordComplete,  // Add mouth if word section is complete
    addArms: isTouchComplete  // Add arms if touch section is complete
  })
  
  return {
    hero: heroInst,
    antiHero: antiHeroInst
  }
}
/**
 * Creates a sun hover face system that shows a smiley when the mouse hovers the sun
 * @param {Object} k - Kaplay instance
 * @param {number} zIndex - Z-index for the face overlay
 */
export function createSunHoverFace(k, zIndex = 16) {
  const state = { intensity: 0 }
  k.add([
    k.z(zIndex),
    { draw() { drawSunFace(k, state.intensity) } }
  ])
  k.onUpdate(() => updateSunHover(k, state))
}
//
// Update sun hover intensity based on mouse proximity
//
function updateSunHover(k, state) {
  const mousePos = k.mousePos()
  const dx = mousePos.x - SUN_X
  const dy = mousePos.y - SUN_Y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const isHovering = dist < SUN_RADIUS + SUN_HOVER_MARGIN
  const target = isHovering ? 1 : 0
  state.intensity += (target - state.intensity) * SUN_HOVER_SPEED * k.dt()
  state.intensity = Math.max(0, Math.min(1, state.intensity))
}
//
// Draw smiley face on the sun with eyes, pupils, mouth and teeth
//
function drawSunFace(k, intensity) {
  if (intensity < 0.01) return
  const r = SUN_RADIUS
  const darkColor = k.rgb(180, 180, 160)
  const white = k.rgb(255, 255, 255)
  const black = k.rgb(40, 40, 40)
  //
  // Eyes — white sclera with dark pupils
  //
  const eyeR = SUN_EYE_RADIUS * r
  const pupilR = SUN_PUPIL_RADIUS * r
  const eyeY = SUN_Y + SUN_EYE_OFFSET_Y * r
  const leftEyeX = SUN_X - SUN_EYE_OFFSET_X * r
  const rightEyeX = SUN_X + SUN_EYE_OFFSET_X * r
  k.drawCircle({ pos: k.vec2(leftEyeX, eyeY), radius: eyeR, color: white, opacity: intensity })
  k.drawCircle({ pos: k.vec2(rightEyeX, eyeY), radius: eyeR, color: white, opacity: intensity })
  k.drawCircle({ pos: k.vec2(leftEyeX, eyeY), radius: pupilR, color: black, opacity: intensity })
  k.drawCircle({ pos: k.vec2(rightEyeX, eyeY), radius: pupilR, color: black, opacity: intensity })
  //
  // Mouth — darker ellipse with white teeth
  //
  const mouthY = SUN_Y + SUN_MOUTH_Y * r
  const mouthW = SUN_MOUTH_WIDTH * r
  const mouthH = SUN_MOUTH_HEIGHT * r
  k.drawEllipse({
    pos: k.vec2(SUN_X, mouthY),
    radiusX: mouthW / 2,
    radiusY: mouthH / 2,
    color: darkColor,
    opacity: intensity
  })
  //
  // Teeth — two small white rectangles at top of mouth
  //
  const toothW = SUN_TOOTH_WIDTH * r
  const toothH = SUN_TOOTH_HEIGHT * r
  const toothY = mouthY - mouthH / 2
  k.drawRect({
    pos: k.vec2(SUN_X - toothW - 1, toothY),
    width: toothW,
    height: toothH,
    color: white,
    opacity: intensity
  })
  k.drawRect({
    pos: k.vec2(SUN_X + 1, toothY),
    width: toothW,
    height: toothH,
    color: white,
    opacity: intensity
  })
}
/**
 * Check if player earned speed bonus and display message
 * @param {Object} k - Kaplay instance
 * @param {string} levelName - Current level name (e.g. 'level-time.0')
 * @param {number} levelTime - Time taken to complete level (seconds)
 * @param {Object} levelIndicator - Level indicator instance
 * @returns {boolean} True if speed bonus earned
 */
export function checkSpeedBonus(k, levelName, levelTime, levelIndicator) {
  const targetTime = CFG.gameplay.speedBonusTime[levelName]
  
  if (!targetTime) return false
  
  const earnedBonus = levelTime < targetTime
  
  return earnedBonus
}

