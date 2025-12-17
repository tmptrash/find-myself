import { CFG } from '../cfg.js'
import { getColor } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'
import * as LevelIndicator from '../components/level-indicator.js'
//
// Global music instances for time section (persist across level reloads)
// Note: clock.mp3 is NOT stored here - it restarts on each level load for sync
//
let timeSectionMusic = {
  kids: null,
  time: null
}

/**
 * Starts time section background music (only if not already playing)
 * Note: Does not start clock.mp3 - that is managed per-level for synchronization
 * @param {Object} k - Kaplay instance
 */
export function startTimeSectionMusic(k) {
  if (!timeSectionMusic.kids) {
    timeSectionMusic.kids = k.play('kids', {
      loop: true,
      volume: CFG.audio.backgroundMusic.kids
    })
  }
  if (!timeSectionMusic.time) {
    timeSectionMusic.time = k.play('time', {
      loop: true,
      volume: CFG.audio.backgroundMusic.time
    })
  }
}

/**
 * Stops all time section background music
 */
export function stopTimeSectionMusic() {
  if (timeSectionMusic.kids) {
    timeSectionMusic.kids.stop()
    timeSectionMusic.kids = null
  }
  if (timeSectionMusic.time) {
    timeSectionMusic.time.stop()
    timeSectionMusic.time = null
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
    sideWallWidth = 192,
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
    addPlatforms(k, CFG.visual.colors.platform, bottomPlatformHeight, topPlatformHeight, sideWallWidth, platformGap)
  }
  //
  // Add level indicator if levelNumber provided
  //
  if (levelNumber && topPlatformHeight && sideWallWidth) {
    LevelIndicator.create({
      k,
      levelNumber,
      activeColor: "#FFFFFF",
      inactiveColor: "#555555",
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
  
  return { sound, hero, antiHero }
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
  // Top platform
  //
  k.add([
    k.rect(k.width(), topHeight),
    k.pos(0, 0),
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
    // Solid bottom platform
    //
    k.add([
      k.rect(k.width(), bottomHeight),
      k.pos(0, k.height() - bottomHeight),
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
  const antiHeroInst = Hero.create({
    k,
    x: antiHeroX,
    y: antiHeroY,
    type: Hero.HEROES.ANTIHERO,
    controllable: false,
    sfx: null,
    bodyColor: "#FF8C00",  // Orange/yellow (explicit hex to avoid local config override)
    outlineColor: CFG.visual.colors.outline
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
    bodyColor: CFG.visual.colors.hero.body,  // Gray from local time config
    outlineColor: CFG.visual.colors.hero.outline
  })
  
  return {
    hero: heroInst,
    antiHero: antiHeroInst
  }
}

