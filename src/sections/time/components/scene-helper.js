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
// Eyebrow dimensions and raise distance (relative to SUN_RADIUS)
//
const SUN_BROW_OFFSET_Y = -0.08
const SUN_BROW_RAISE = 0.14
const SUN_BROW_WIDTH = 0.16
const SUN_BROW_THICKNESS = 2.5
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
  const isTimeCompleteForIndicator = get('time.completed', false)
  const isTouchCompleteForIndicator = get('touch.completed', false)
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
  const isWordComplete = get('word.completed', false)
  const isTimeComplete = get('time.completed', false)
  const isTouchComplete = get('touch.completed', false)
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
// Draw smiley face on the sun with eyes, eyebrows, pupils, and a curved smile.
// Eyebrows raise and smile widens gradually as intensity goes from 0 to 1.
//
function drawSunFace(k, intensity) {
  if (intensity < 0.01) return
  const r = SUN_RADIUS
  const darkColor = k.rgb(180, 180, 160)
  const white = k.rgb(255, 255, 255)
  const black = k.rgb(40, 40, 40)
  //
  // Eye positions
  //
  const eyeR = SUN_EYE_RADIUS * r
  const pupilR = SUN_PUPIL_RADIUS * r
  const eyeY = SUN_Y + SUN_EYE_OFFSET_Y * r
  const leftEyeX = SUN_X - SUN_EYE_OFFSET_X * r
  const rightEyeX = SUN_X + SUN_EYE_OFFSET_X * r
  //
  // Eyebrows — raise upward as intensity increases
  //
  const browY = eyeY + SUN_BROW_OFFSET_Y * r - intensity * SUN_BROW_RAISE * r
  const browHalfW = SUN_BROW_WIDTH * r
  drawSunBrow(k, leftEyeX, browY, browHalfW, intensity)
  drawSunBrow(k, rightEyeX, browY, browHalfW, intensity)
  //
  // Eyes — white sclera with dark pupils
  //
  k.drawCircle({ pos: k.vec2(leftEyeX, eyeY), radius: eyeR, color: white, opacity: intensity })
  k.drawCircle({ pos: k.vec2(rightEyeX, eyeY), radius: eyeR, color: white, opacity: intensity })
  k.drawCircle({ pos: k.vec2(leftEyeX, eyeY), radius: pupilR, color: black, opacity: intensity })
  k.drawCircle({ pos: k.vec2(rightEyeX, eyeY), radius: pupilR, color: black, opacity: intensity })
  //
  // Smile — curved arc that widens and rises with intensity
  //
  drawSunSmile(k, intensity, r, darkColor, white)
}
//
// Draws a single eyebrow as a short curved arc above an eye
//
function drawSunBrow(k, cx, y, halfW, intensity) {
  const segments = 6
  const black = k.rgb(60, 50, 30)
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments
    const t1 = (i + 1) / segments
    const x0 = cx - halfW + t0 * halfW * 2
    const x1 = cx - halfW + t1 * halfW * 2
    const archHeight = -intensity * 3
    const y0 = y + Math.sin(t0 * Math.PI) * archHeight
    const y1 = y + Math.sin(t1 * Math.PI) * archHeight
    k.drawLine({
      p1: k.vec2(x0, y0),
      p2: k.vec2(x1, y1),
      width: SUN_BROW_THICKNESS,
      color: black,
      opacity: intensity
    })
  }
}
//
// Draws a curved smile on the sun. At low intensity it is a flat line;
// at full intensity it becomes a wide grin with teeth.
//
function drawSunSmile(k, intensity, r, darkColor, white) {
  const mouthY = SUN_Y + SUN_MOUTH_Y * r
  const mouthW = SUN_MOUTH_WIDTH * r * (0.4 + intensity * 0.6)
  const curveDepth = intensity * SUN_MOUTH_HEIGHT * r * 0.8
  const segments = 10
  //
  // Draw filled mouth area using overlapping circles along the curve
  //
  for (let i = 0; i <= segments; i++) {
    const t = i / segments
    const x = SUN_X - mouthW / 2 + t * mouthW
    const curveY = mouthY + Math.sin(t * Math.PI) * curveDepth
    const dotR = 2 + intensity * 3.5
    k.drawCircle({ pos: k.vec2(x, curveY), radius: dotR, color: darkColor, opacity: intensity })
  }
  //
  // Teeth — only visible when smile is wide enough
  //
  if (intensity > 0.3) {
    const toothOpacity = (intensity - 0.3) / 0.7
    const toothW = SUN_TOOTH_WIDTH * r
    const toothH = SUN_TOOTH_HEIGHT * r * intensity
    k.drawRect({
      pos: k.vec2(SUN_X - toothW - 1, mouthY - toothH * 0.3),
      width: toothW,
      height: toothH,
      color: white,
      opacity: toothOpacity
    })
    k.drawRect({
      pos: k.vec2(SUN_X + 1, mouthY - toothH * 0.3),
      width: toothW,
      height: toothH,
      color: white,
      opacity: toothOpacity
    })
  }
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

