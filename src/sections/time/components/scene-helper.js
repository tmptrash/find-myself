import { CFG } from '../cfg.js'
import { getColor } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { get, set } from '../../../utils/progress.js'
import * as DayNight from '../utils/time-day-night.js'
import { goToMenuAfterAssets } from '../../../utils/level-assets.js'
import * as LevelHelp from '../../../utils/level-help.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as TimeDigits from './time-digits.js'

const MUSIC_START_DELAY = 6.0
//
// In-game clock (top-right of game area, levels 0-2)
// Positioned inside the game area, below the top platform.
//
const CLOCK_FONT_SIZE = 22
const CLOCK_MARGIN_RIGHT = 24
const CLOCK_GAME_AREA_OFFSET_Y = 36
const CLOCK_COLOR_R = 74
const CLOCK_COLOR_G = 104
const CLOCK_COLOR_B = 152
const CLOCK_OPACITY = 0.65
const CLOCK_Z = 200
const CLOCK_FONT = 'JetBrains Mono'
//
// Sun position and radius (matches city-background.js calculations)
//
const SUN_X = CFG.visual.screen.width * 0.85 - 50
const SUN_Y = CFG.visual.screen.height * 0.2 + 150
const SUN_RADIUS = 112
//
// Sun hover detection radius margin
//
const SUN_HOVER_MARGIN = 20
//
// Ray particle emission and movement parameters
//
const SUN_RAY_EMIT_RATE = 0.055
const SUN_RAY_SPEED_MIN = 55
const SUN_RAY_SPEED_MAX = 140
const SUN_RAY_LIFE_MIN = 0.75
const SUN_RAY_LIFE_MAX = 1.4
const SUN_RAY_GLOW_R_MIN = 3
const SUN_RAY_GLOW_R_MAX = 6
const SUN_RAY_MAX_COUNT = 60
//
// Floating background MM:SS phrases — above city bg, below playfield
//
const FLOATING_PHRASE_Z = CFG.visual.zIndex.background + 3
//
// Rays emit only during first SUN_RAY_HOVER_DURATION seconds of hover; not at night
//
const SUN_RAY_HOVER_DURATION = 2.0
const SUN_RAY_NIGHT_DARKNESS = 0.35
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
 * @param {string} [config.heroDustColor] - Hex dust under feet (hero only), e.g. '#000000'
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
    onAnnihilation = null,
    heroDustColor = null,
    backgroundColor = CFG.visual.colors.background,
    platformColor = null,
    //
    // City background sprite name — used by DayNight to look up real window positions
    //
    spriteName = 'city-background',
    //
    // When false, skip drawing the dynamic sun (winter/autumn levels)
    //
    showSun = true,
    //
    // When false, skip drawing the moon entirely (e.g. level 3 has its own skybox)
    //
    showMoon = true,
    //
    // When set, stars are drawn on a separate layer at this z-index (e.g. below clouds)
    //
    starLayerZ = null,
    //
    // When set, moon is drawn on a separate layer at this z-index (e.g. below clouds)
    //
    moonLayerZ = null,
    //
    // Show the in-game clock in the top-right corner (levels 0, 1, 2)
    //
    showGameClock = false,
    //
    // Semi-transparent countdown strings drifting on the background
    //
    showFloatingPhrases = true
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
  k.setBackground(k.Color.fromHex(backgroundColor))
  CanvasBackdrop.applyCanvasBackdrop(k, backgroundColor)
  //
  // Add background rectangle as game object
  //
  addBackground(k, backgroundColor)
  //
  // Add platforms (unless skipped)
  //
  const resolvedPlatformColor = platformColor ?? backgroundColor
  if (!skipPlatforms) {
    addPlatforms(k, resolvedPlatformColor, bottomPlatformHeight, topPlatformHeight, sideWallWidth, platformGap)
  }
  //
  // Add level indicator if levelNumber provided
  // Hero body color matches the actual hero: orange when time complete, teal when touch complete, section hero otherwise
  //
  const isTimeCompleteForIndicator = get('time.completed', false)
  const isTouchCompleteForIndicator = get('touch.completed', false)
  const indicatorHeroColor = isTimeCompleteForIndicator ? "#FF8C00" : isTouchCompleteForIndicator ? CFG.visual.colors.sections.touch.body : CFG.visual.colors.hero.body
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
  levelName && LevelHelp.create({
    k,
    levelName,
    sideWallWidth,
    floorY: k.height() - bottomPlatformHeight,
    levelIndicator,
    sound,
    //
    // Pass backdrop hex so syncPanelBackdrop can dim the canvas letterbox bars
    // while the buy-help panel is open, preventing visible strips.
    //
    sceneBackdropHex: CFG.visual.colors.platform
  })
  TouchControls.create({
    k,
    floorY: k.height() - bottomPlatformHeight,
    leftMargin: sideWallWidth,
    rightMargin: sideWallWidth
  })
  
  //
  // Setup back to menu
  //
  CFG.controls.backToMenu.forEach(key => {
    k.onKeyPress(key, () => {
      //
      // If a help panel is open, Esc closes only the panel (handled inside
      // level-help.js). Do not also navigate to the menu.
      //
      if (LevelHelp.isAnyPanelOpen()) return
      //
      // Stop time section music when leaving section
      //
      stopTimeSectionMusic()
      //
      // Restore volume to 1 and unmute procedural sounds when going to menu
      //
      k.volume(1)
      Sound.unmuteProceduralSounds()
      goToMenuAfterAssets(k)
    })
  })
  
  let hero = null
  let antiHero = null
  
  //
  // Create heroes if positions provided
  //
  if (heroX !== null && heroY !== null && antiHeroX !== null && antiHeroY !== null) {
    const heroesResult = createLevelHeroes(k, sound, levelName, heroX, heroY, antiHeroX, antiHeroY, onAnnihilation, heroDustColor)
    hero = heroesResult.hero
    antiHero = heroesResult.antiHero
  }
  
  //
  // Day/night cycle (persists across scene reloads via module-level state)
  //
  const dayNight = DayNight.create({ k, sound, timeSectionMusic, spriteName, showSun, showMoon, starLayerZ, moonLayerZ })
  //
  // Floating background time phrases (steel-blue MM:SS strings)
  //
  let floatingPhrases = null
  if (showFloatingPhrases) {
    floatingPhrases = TimeDigits.create({ k })
    k.onUpdate(() => TimeDigits.onUpdate(floatingPhrases))
    k.add([
      k.z(FLOATING_PHRASE_Z),
      k.fixed(),
      { draw() { TimeDigits.draw(floatingPhrases) } }
    ])
  }
  k.onSceneLeave(() => {
    dayNight.cleanup()
    CanvasBackdrop.clearCanvasBackdrop(k)
  })
  //
  // In-game clock: a grey HH:MM timer in the top-right corner, synchronized
  // to the day/night cycle (full day = CYCLE_DURATION = 60 s of real time).
  //
  showGameClock && addGameClock(k, sideWallWidth, topPlatformHeight)
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
function createLevelHeroes(k, sound, levelName, heroX, heroY, antiHeroX, antiHeroY, onAnnihilation, heroDustColor = null) {
  //
  // Check completed sections for hero appearance
  //
  const isWordComplete = get('word.completed', false)
  const isTimeComplete = get('time.completed', false)
  const isTouchComplete = get('touch.completed', false)
  //
  // Hero body color: orange if time complete, touch teal if touch complete, otherwise section steel teal
  //
  const heroBodyColor = isTimeComplete ? "#FF8C00" : isTouchComplete ? CFG.visual.colors.sections.touch.body : CFG.visual.colors.hero.body
  
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
    bodyColor: heroBodyColor,
    outlineColor: CFG.visual.colors.hero.outline,
    addMouth: isWordComplete,  // Add mouth if word section is complete
    addArms: isTouchComplete,  // Add arms if touch section is complete
    dustColor: heroDustColor
  })
  
  return {
    hero: heroInst,
    antiHero: antiHeroInst
  }
}
/**
 * Creates a sun hover ray system: bright particles fly outward when mouse hovers the sun.
 * @param {Object} k - Kaplay instance
 * @param {number} zIndex - Z-index for the ray overlay
 */
export function createSunHoverFace(k, zIndex = 16) {
  const state = { rays: [], emitTimer: 0, hoverTimer: 0 }
  k.add([
    k.z(zIndex),
    { draw() { drawSunRays(k, state) } }
  ])
  k.onUpdate(() => updateSunHoverRays(k, state))
}
//
// Emit rays only during first SUN_RAY_HOVER_DURATION seconds of hover;
// stop at night (darkness above threshold); rays already in flight fade naturally
//
function updateSunHoverRays(k, state) {
  const mousePos = k.mousePos()
  const dx = mousePos.x - SUN_X
  const dy = mousePos.y - SUN_Y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const isHovering = dist < SUN_RADIUS + SUN_HOVER_MARGIN
  const dt = k.dt()
  const darkness = DayNight.getDarkness()
  if (isHovering) {
    state.hoverTimer += dt
  } else {
    state.hoverTimer = 0
  }
  const canEmit = isHovering
    && state.hoverTimer < SUN_RAY_HOVER_DURATION
    && state.rays.length < SUN_RAY_MAX_COUNT
    && darkness < SUN_RAY_NIGHT_DARKNESS
  if (canEmit) {
    state.emitTimer -= dt
    if (state.emitTimer <= 0) {
      spawnSunRay(state)
      state.emitTimer = SUN_RAY_EMIT_RATE
    }
  }
  for (let i = state.rays.length - 1; i >= 0; i--) {
    const ray = state.rays[i]
    ray.x += ray.vx * dt
    ray.y += ray.vy * dt
    ray.life -= dt / ray.maxLife
    if (ray.life <= 0) state.rays.splice(i, 1)
  }
}
//
// Spawn one ray from the sun's edge at a random angle
//
function spawnSunRay(state) {
  const angle = Math.random() * Math.PI * 2
  const speed = SUN_RAY_SPEED_MIN + Math.random() * (SUN_RAY_SPEED_MAX - SUN_RAY_SPEED_MIN)
  const maxLife = SUN_RAY_LIFE_MIN + Math.random() * (SUN_RAY_LIFE_MAX - SUN_RAY_LIFE_MIN)
  const radius = SUN_RAY_GLOW_R_MIN + Math.random() * (SUN_RAY_GLOW_R_MAX - SUN_RAY_GLOW_R_MIN)
  state.rays.push({
    x: SUN_X + Math.cos(angle) * SUN_RADIUS,
    y: SUN_Y + Math.sin(angle) * SUN_RADIUS,
    vx: Math.cos(angle) * speed,
    vy: Math.sin(angle) * speed,
    life: 1.0,
    maxLife,
    radius
  })
}
//
// Draw all active rays as bright lines flying outward from the sun edge
//
function drawSunRays(k, state) {
  for (const ray of state.rays) {
    const op = ray.life
    const len = ray.radius * 5
    const nx = ray.vx / Math.sqrt(ray.vx * ray.vx + ray.vy * ray.vy)
    const ny = ray.vy / Math.sqrt(ray.vx * ray.vx + ray.vy * ray.vy)
    k.drawLine({
      p1: k.vec2(ray.x, ray.y),
      p2: k.vec2(ray.x + nx * len * 1.5, ray.y + ny * len * 1.5),
      width: ray.radius * 0.8,
      color: k.rgb(255, 248, 180),
      opacity: op * 0.18
    })
    k.drawLine({
      p1: k.vec2(ray.x, ray.y),
      p2: k.vec2(ray.x + nx * len, ray.y + ny * len),
      width: ray.radius * 0.45,
      color: k.rgb(255, 255, 230),
      opacity: op * 0.85
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
//
// Creates a grey HH:MM clock in the top-right corner of the game area.
// Reads moduleTimeOfDay via DayNight.getTimeOfDay() each frame.
// A full 24-hour day takes CYCLE_DURATION (60 s) of real time.
//
function addGameClock(k, sideWallWidth, topPlatformHeight) {
  const clockColor = k.rgb(CLOCK_COLOR_R, CLOCK_COLOR_G, CLOCK_COLOR_B)
  const clockX = k.width() - sideWallWidth - CLOCK_MARGIN_RIGHT
  //
  // Position inside the game area, offset below the bottom of the top platform strip.
  //
  const clockY = topPlatformHeight + CLOCK_GAME_AREA_OFFSET_Y
  k.add([
    k.z(CLOCK_Z),
    k.fixed(),
    {
      draw() {
        const t = DayNight.getTimeOfDay()
        const totalHours = t * 24
        const hours = Math.floor(totalHours) % 24
        const minutes = Math.floor((totalHours * 60) % 60)
        const hh = String(hours).padStart(2, '0')
        const mm = String(minutes).padStart(2, '0')
        k.drawText({
          text: `${hh}:${mm}`,
          size: CLOCK_FONT_SIZE,
          font: CLOCK_FONT,
          anchor: 'right',
          pos: k.vec2(clockX, clockY),
          color: clockColor,
          opacity: CLOCK_OPACITY
        })
      }
    }
  ])
}