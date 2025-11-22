import { CFG } from '../cfg.js'
import { getColor, getRGB } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'
import { isSectionComplete } from '../../../utils/progress.js'

const ANTIHERO_SPAWN_DELAY = 1.5
/**
 * Adds background to the scene
 * @param {Object} k - Kaplay instance
 * @param {String} color - Background color in hex format
 * @returns {Object} Background object
 */
export function addBackground(k, color) {
  return k.add([
    k.rect(k.width(), k.height()),
    getColor(k, color),
    k.pos(0, 0),
    k.fixed(),
    k.z(CFG.visual.zIndex.background)
  ])
}

/**
 * Adds level indicator using anti-heroes (5 anti-heroes showing current level progress)
 * @param {Object} k - Kaplay instance
 * @param {number} levelNumber - Current level number (1-5)
 * @param {string} activeColor - Color for active (completed) levels
 * @param {string} inactiveColor - Color for inactive (not completed) levels
 * @param {number} topPlatformHeight - Top platform height in pixels
 * @param {number} sideWallWidth - Side wall width in pixels
 * @returns {Array} Array of anti-hero instances
 */
export function addLevelIndicator(k, levelNumber, activeColor, inactiveColor, topPlatformHeight, sideWallWidth) {
  
  //
  // Calculate spacing for 5 anti-heroes
  //
  const antiHeroScale = 2  // Small size for indicators
  const antiHeroSize = 32 * antiHeroScale  // Approximate size
  const spacing = -20  // Strong overlap - very close together
  
  const startX = sideWallWidth + antiHeroSize / 2  // Align left side with platform below
  //
  // Position anti-heroes just above the top platform
  //
  const y = topPlatformHeight - antiHeroSize / 2 - 5  // Just above platform edge
  
  const antiHeroes = []
  for (let i = 0; i < 5; i++) {
    const bodyColor = i < levelNumber ? activeColor : inactiveColor
    const antiHero = Hero.create({
      k,
      x: startX + i * (antiHeroSize + spacing),
      y: y,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      bodyColor,      // Custom body color (section color or gray)
      scale: antiHeroScale,
      isStatic: true, // No physics for indicators
      addMouth: true
    })
    antiHero.character.z = CFG.visual.zIndex.ui  // Show above platforms
    antiHeroes.push(antiHero)
  }
  
  return antiHeroes
}

/**
 * Add word-based level indicator (letters "WORDS")
 * @param {Object} k - Kaplay instance
 * @param {number} levelNumber - Current level (1-5)
 * @param {string} activeColor - Color for completed levels (hex)
 * @param {string} inactiveColor - Color for future levels (hex)
 * @param {number} topPlatformHeight - Height of top platform
 * @param {number} sideWallWidth - Width of side wall
 * @returns {Array} Array of letter objects
 */
export function addWordLevelIndicator(k, levelNumber, activeColor, inactiveColor, topPlatformHeight, sideWallWidth) {
  const letters = ['W', 'O', 'R', 'D', 'S']
  const fontSize = 48
  const letterSpacing = -5  // Negative spacing for closer letters
  const outlineThickness = 2
  
  // Default colors if not provided
  const defaultActive = "#DC143C"  // Red
  const defaultInactive = "#555555"  // Gray
  
  const startX = sideWallWidth + 20  // Small offset from left wall
  const y = topPlatformHeight - fontSize - 10  // Position above platform
  
  const letterObjects = []
  
  letters.forEach((letter, i) => {
    const isActive = i < levelNumber
    const colorHex = isActive ? (activeColor || defaultActive) : (inactiveColor || defaultInactive)
    
    // Calculate x position for this letter
    const letterX = startX + i * (fontSize + letterSpacing)
    
    // Create outline (8 directions)
    const offsets = [
      [-outlineThickness, -outlineThickness],
      [0, -outlineThickness],
      [outlineThickness, -outlineThickness],
      [-outlineThickness, 0],
      [outlineThickness, 0],
      [-outlineThickness, outlineThickness],
      [0, outlineThickness],
      [outlineThickness, outlineThickness]
    ]
    
    offsets.forEach(([dx, dy]) => {
      k.add([
        k.text(letter, {
          size: fontSize,
          font: CFG.visual.fonts.thin
        }),
        k.pos(letterX + dx, y + dy),
        k.color(0, 0, 0),
        k.z(CFG.visual.zIndex.ui)
      ])
    })
    
    // Create main letter
    const {r, g, b} = getRGB(k, colorHex)
    const mainLetter = k.add([
      k.text(letter, {
        size: fontSize,
        font: CFG.visual.fonts.thin
      }),
      k.pos(letterX, y),
      k.color(r, g, b),
      k.z(CFG.visual.zIndex.ui)
    ])
    
    letterObjects.push(mainLetter)
  })
  
  return letterObjects
}

/**
 * Initializes a level with common setup (gravity, sound, background, platforms, camera, controls)
 * @param {Object} config - Level configuration
 * @param {Object} config.k - Kaplay instance
 * @param {string} [config.levelName] - Level name (e.g., 'level-word.1') for config lookup
 * @param {number} [config.levelNumber] - Level number for indicator (1-5)
 * @param {string} [config.nextLevel] - Next level name for annihilation
 * @param {string} [config.levelTitle] - Level title text to display at the top
 * @param {string} [config.levelTitleColor] - Level title color in hex format
 * @param {string} [config.subTitle] - Subtitle text to display below the title
 * @param {string} [config.subTitleColor] - Subtitle color in hex format
 * @param {String} [config.backgroundColor] - Background color (optional if levelName provided)
 * @param {String} [config.platformColor] - Platform color (optional if levelName provided)
 * @param {Number} [config.bottomPlatformHeight] - Bottom platform height in pixels
 * @param {Number} [config.topPlatformHeight] - Top platform height in pixels
 * @param {Number} [config.sideWallWidth] - Side wall width in pixels
 * @param {Object|Array} [config.platformGap] - Gap(s) in bottom platform {x, width} or [{x, width}, ...]
 * @param {Boolean} [config.skipPlatforms] - If true, don't create standard platforms
 * @param {Boolean} [config.createHeroes=true] - If true, create hero and anti-hero
 * @param {Number} [config.heroX] - Hero X position in pixels
 * @param {Number} [config.heroY] - Hero Y position in pixels
 * @param {Number} [config.antiHeroX] - Anti-hero X position in pixels
 * @param {Number} [config.antiHeroY] - Anti-hero Y position in pixels
 * @returns {Object} Object with sound, hero, antiHero instances
 */
export function initScene(config) {
  const { 
    k, 
    levelName,
    levelNumber,
    nextLevel,
    levelTitle,
    levelTitleColor,
    subTitle,
    subTitleColor,
    backgroundColor, 
    platformColor, 
    bottomPlatformHeight, 
    topPlatformHeight,
    sideWallWidth,
    platformGap,
    skipPlatforms,
    createHeroes = true,
    heroX = null,
    heroY = null,
    antiHeroX = null,
    antiHeroY = null
  } = config
  
  // Use word section colors if not explicitly provided
  const bgColor = backgroundColor || CFG.visual.colors.background
  const pfColor = platformColor || CFG.visual.colors.platform
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
  // Start background music for word levels
  //
  Sound.startBackgroundMusic(sound, k, 'word')
  
  // Add background
  addBackground(k, bgColor)
  
  // Add platforms (unless skipped)
  if (!skipPlatforms) {
    addPlatforms(k, pfColor, bottomPlatformHeight, topPlatformHeight, platformGap)
  }
  
  // Setup camera
  setupCamera(k)
  
  // Add level indicator if levelNumber provided
  if (levelNumber && topPlatformHeight && sideWallWidth) {
    // Use word indicator for all levels
    addWordLevelIndicator(k, levelNumber, CFG.visual.colors.levelIndicator.active, CFG.visual.colors.levelIndicator.inactive, topPlatformHeight, sideWallWidth)
  }
  
  // Level titles removed for cleaner visual experience
  // if (levelTitleColor) {
  //   addLevelTitle(k, "words like blades", levelTitleColor, null, null, topPlatformHeight)
  // }
  
  // Setup back to menu
  CFG.controls.backToMenu.forEach(key => {
    k.onKeyPress(key, () => {
      Sound.stopBackgroundMusic(sound)
      k.go("menu")
    })
  })
  
  let hero = null
  let antiHero = null
  
  // Create heroes if requested
  if (createHeroes && levelName && heroX !== null && heroY !== null && antiHeroX !== null && antiHeroY !== null) {
    const heroesResult = createLevelHeroes(k, sound, levelName, heroX, heroY, antiHeroX, antiHeroY, pfColor)
    hero = heroesResult.hero
    antiHero = heroesResult.antiHero
  }
  
  return { sound, hero, antiHero }
}

/**
 * Update eerie ambient sound at random intervals
 * @param {Object} inst - Scene instance
 * @param {number} [minDelay=4] - Min delay in seconds
 * @param {number} [maxDelay=8] - Max delay in seconds
 */
export function updateEerieSound(inst, minDelay = 4, maxDelay = 8) {
  const { k, sound } = inst
  
  inst.soundTimer -= k.dt()
  
  if (inst.soundTimer <= 0) {
    sound && Sound.playGlitchSound(sound)
    inst.soundTimer = k.rand(minDelay, maxDelay)
  }
}

/**
 * Sets up fixed camera in the center of the screen
 * @param {Object} k - Kaplay instance
 */
function setupCamera(k) {
  k.onUpdate(() => {
    k.camPos(k.width() / 2, k.height() / 2)
  })
}
/**
 * Adds standard platforms to the level (top, bottom, left wall, right wall)
 * @param {Object} k - Kaplay instance
 * @param {String} color - Platform color in hex format
 * @param {Number} bottomPlatformHeight - Bottom platform height in pixels
 * @param {Number} topPlatformHeight - Top platform height in pixels
 * @param {Object|Array} [gap] - Gap(s) in bottom platform {x, width} or [{x, width}, ...]
 * @returns {Array} Array of platform objects
 */
function addPlatforms(k, color, bottomPlatformHeight, topPlatformHeight, gap) {
  const sideWallWidth = 192  // Side walls width (10% of 1920)
  
  function createPlatform(x, y, width, height) {
    return k.add([
      k.rect(width, height),
      k.pos(x, y),
      k.area(),
      k.body({ isStatic: true }),
      getColor(k, color),
      CFG.game.platformName
    ])
  }
  
  const platforms = []
  
  // Bottom platform (with gap(s) if specified)
  if (gap) {
    // Normalize gap to array
    const gaps = Array.isArray(gap) ? gap : [gap]
    
    // Sort gaps by x position
    const sortedGaps = [...gaps].sort((a, b) => a.x - b.x)
    
    // Create platform segments between gaps
    let lastX = 0
    
    sortedGaps.forEach(g => {
      // Create segment before gap
      if (g.x > lastX) {
        platforms.push(createPlatform(lastX, k.height() - bottomPlatformHeight, g.x - lastX, bottomPlatformHeight))
      }
      lastX = g.x + g.width
    })
    
    // Create final segment after last gap
    if (lastX < k.width()) {
      platforms.push(createPlatform(lastX, k.height() - bottomPlatformHeight, k.width() - lastX, bottomPlatformHeight))
    }
  } else {
    // Full bottom platform (no gap)
    platforms.push(createPlatform(0, k.height() - bottomPlatformHeight, k.width(), bottomPlatformHeight))
  }
  
  return [
    ...platforms,
    // Top platform (drops down 1/3 of screen height)
    createPlatform(0, 0, k.width(), topPlatformHeight),
    // Left wall (20% from left edge)
    createPlatform(0, topPlatformHeight, sideWallWidth, k.height() - topPlatformHeight - bottomPlatformHeight),
    // Right wall (20% from right edge)
    createPlatform(k.width() - sideWallWidth, topPlatformHeight, sideWallWidth, k.height() - topPlatformHeight - bottomPlatformHeight)
  ]
}

/**
 * Create hero and anti-hero for a level
 * @param {Object} k - Kaplay instance
 * @param {string} levelName - Level name (e.g., 'level-word.1')
 * @param {Object} sound - Sound instance
 * @param {string} nextLevel - Next level name for annihilation (deprecated, kept for compatibility)
 * @param {Number} [customHeroX] - Custom hero X position (overrides config)
 * @param {Number} [customHeroY] - Custom hero Y position (overrides config)
 * @param {string} [platformColor] - Platform color for dust particles
 * @returns {Object} {hero, antiHero}
 */
function createLevelHeroes(k, sound, currentLevel, heroX, heroY, antiHeroX, antiHeroY, platformColor = null) {
  //
  // Use platform color for dust particles (black platforms)
  //
  const dustColor = platformColor
  
  const antiHero = Hero.create({
    k,
    x: antiHeroX,
    y: antiHeroY,
    type: 'antiHero',
    sfx: sound,
    dustColor,
    addMouth: true,
    bodyColor: 'DC143C'  // Crimson red for anti-hero
  })
  
  // Hide anti-hero initially (will be shown when spawned)
  antiHero.character.hidden = true
  
  const hero = Hero.create({
    k,
    x: heroX,
    y: heroY,
    type: Hero.HEROES.HERO,
    sfx: sound,
    antiHero,
    currentLevel,  // Current level for transition system
    dustColor,
    addMouth: isSectionComplete('word')
  })
  
  hero.character.use("player")
  Hero.spawn(hero)
  
  // Spawn anti-hero with delay
  k.wait(ANTIHERO_SPAWN_DELAY, () => {
    Hero.spawn(antiHero)
  })
  
  return { hero, antiHero }
}

/**
 * Adds level title text at the top center of the screen (private function)
 * @param {Object} k - Kaplay instance
 * @param {string} text - Text to display
 * @param {string} color - Text color in hex format
 * @param {string} [subText] - Subtitle text to display below
 * @param {string} [subColor] - Subtitle color in hex format
 * @param {number} [customTopHeight] - Custom top platform height (% of screen height)
 * @returns {Object} Text object
 */
function addLevelTitle(k, text, color, subText = null, subColor = null, customTopHeight = null) {
  const topHeight = customTopHeight || CFG.visual.topPlatformHeight
  const topPlatformHeight = k.height() * topHeight / 100
  const centerX = k.width() / 2
  const textY = topPlatformHeight / 2  // Middle between top of screen and top platform
  
  // Add main title
  const title = k.add([
    k.text(text, {
      size: 40
    }),
    k.pos(centerX, textY),
    k.anchor("center"),
    getColor(k, color),
    k.outline(3, getRGB(k, CFG.visual.colors.outlineTextColor)),
    k.z(CFG.visual.zIndex.platforms + 1),  // In front of platforms
  ])
  
  // Add subtitle if provided
  if (subText && subColor) {
    k.add([
      k.text(subText, {
        size: 17
      }),
      k.pos(centerX, textY + 30),  // 30px below title
      k.anchor("center"),
      getColor(k, subColor),
      k.outline(2, getRGB(k, CFG.visual.colors.outlineTextColor)),
      k.z(CFG.visual.zIndex.platforms + 1),  // In front of platforms
    ])
  }
  
  return title
}
