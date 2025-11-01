import { CFG } from '../../../cfg.js'
import { getColor, getRGB } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Spikes from '../../../sections/blades/components/spikes.js'
import * as Hero from '../../../components/hero.js'

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
 * Adds level indicator using spikes (5 spikes showing current level progress)
 * @param {Object} k - Kaplay instance
 * @param {number} levelNumber - Current level number (1-5)
 * @param {string} activeColor - Color for active (completed) levels
 * @param {string} inactiveColor - Color for inactive (not completed) levels
 * @param {number} [customTopHeight] - Custom top platform height (% of screen height)
 * @returns {Array} Array of spike instances
 */
export function addLevelIndicator(k, levelNumber, activeColor, inactiveColor, customTopHeight = null) {
  const topHeight = customTopHeight || CFG.visual.topPlatformHeight
  const topPlatformHeight = k.height() * topHeight / 100
  const sideWallWidth = k.width() * CFG.visual.sideWallWidth / 100
  
  // Calculate width for single spike (1 pyramid)
  const blockSize = Math.max(2, Math.round(k.height() / 250))
  const singleSpikeWidth = 7 * blockSize  // SINGLE_SPIKE_WIDTH_BLOCKS * blockSize
  const spacing = blockSize  // 1 block between pyramid bases
  
  const startX = sideWallWidth + singleSpikeWidth / 2
  // Position spikes above the top platform
  const spikeHeight = 4 * blockSize  // SPIKE_HEIGHT_BLOCKS * blockSize
  const y = topPlatformHeight - spikeHeight / 2 - 4  // Above platform by spike height + 4px
  
  const spikes = []
  for (let i = 0; i < 5; i++) {
    const color = i < levelNumber ? activeColor : inactiveColor
    const spike = Spikes.create({
      k,
      x: startX + i * (singleSpikeWidth + spacing),
      y: y,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      color: color,
      spikeCount: 1  // Single pyramid for indicator
    })
    spike.spike.opacity = 1  // Make spike visible immediately
    spike.spike.z = CFG.visual.zIndex.ui  // Show above platforms
    spikes.push(spike)
  }
  
  return spikes
}

/**
 * Initializes a level with common setup (gravity, sound, background, platforms, camera, instructions, controls)
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
 * @param {Number} [config.bottomPlatformHeight] - Custom bottom platform height (% of screen height)
 * @param {Number} [config.topPlatformHeight] - Custom top platform height (% of screen height)
 * @param {Object|Array} [config.platformGap] - Gap(s) in bottom platform {x, width} or [{x, width}, ...]
 * @param {Boolean} [config.skipPlatforms] - If true, don't create standard platforms
 * @param {Boolean} [config.showInstructions=false] - If true, show control instructions
 * @param {Boolean} [config.createHeroes=true] - If true, create hero and anti-hero
 * @param {Number} [config.heroX] - Custom hero X position (overrides config)
 * @param {Number} [config.heroY] - Custom hero Y position (overrides config)
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
    platformGap,
    skipPlatforms, 
    showInstructions = false,
    createHeroes = true,
    heroX = null,
    heroY = null
  } = config
  
  // Use levelName-based colors if not explicitly provided
  const bgColor = backgroundColor || (levelName && CFG.colors[levelName]?.background)
  const pfColor = platformColor || (levelName && CFG.colors[levelName]?.platform)
  
  // Set gravity (scaled to screen height for resolution independence)
  k.setGravity(CFG.gameplay.gravityRatio * k.height())
  
  // Create sound instance and start audio context
  const sound = Sound.create()
  
  // Add background
  addBackground(k, bgColor)
  
  // Add platforms (unless skipped)
  if (!skipPlatforms) {
    addPlatforms(k, pfColor, bottomPlatformHeight, topPlatformHeight, platformGap)
  }
  
  // Setup camera
  setupCamera(k)
  
  // Add instructions (only if requested)
  if (showInstructions) {
    const instructionsObj = addInstructions(k)
    
    // Fade out instructions after 5 seconds
    k.wait(5, () => {
      const fadeOutDuration = 1.0  // 1 second fade out
      let fadeTimer = 0
      
      instructionsObj.onUpdate(() => {
        fadeTimer += k.dt()
        const progress = Math.min(1, fadeTimer / fadeOutDuration)
        instructionsObj.opacity = 1 - progress
        
        if (progress >= 1) {
          k.destroy(instructionsObj)
        }
      })
    })
  }
  
  // Add level indicator if levelNumber provided
  if (levelNumber) {
    const customTopHeight = topPlatformHeight || (skipPlatforms && levelName && CFG.levels[levelName]?.topPlatformHeight)
    addLevelIndicator(k, levelNumber, CFG.colors.levelIndicator.active, CFG.colors.levelIndicator.inactive, customTopHeight)
  }
  
  // Level titles removed for cleaner visual experience
  // if (levelTitleColor) {
  //   addLevelTitle(k, "words like blades", levelTitleColor, null, null, topPlatformHeight)
  // }
  
  // Setup back to menu
  CFG.controls.backToMenu.forEach(key => {
    k.onKeyPress(key, () => k.go("menu"))
  })
  
  let hero = null
  let antiHero = null
  
  // Create heroes if requested
  if (createHeroes && levelName && nextLevel) {
    const heroesResult = createLevelHeroes(k, levelName, sound, nextLevel, heroX, heroY)
    hero = heroesResult.hero
    antiHero = heroesResult.antiHero
  }
  
  return { sound, hero, antiHero }
}
/**
 * Adds control instructions to the screen
 * @param {Object} k - Kaplay instance
 * @returns {Object} Created instructions object
 */
function addInstructions(k) {
  // Base instruction text (no spaces between arrows)
  const baseText = "AD/←→   - move\nSpace/↑ - jump\nESC     - menu"
  
  // Calculate position: center horizontally, middle of bottom platform
  const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
  const centerX = k.width() / 2
  const bottomY = k.height() - bottomPlatformHeight / 2  // Middle of bottom platform
  
  return k.add([
    k.text(baseText, {
      size: CFG.visual.instructionsFontSize,
      width: k.width() - 40,
      align: "center"
    }),
    k.pos(centerX, bottomY),
    k.anchor("center"),
    getColor(k, CFG.colors['level-word.1'].instructions),  // instructions color
    k.z(CFG.visual.zIndex.ui),
    k.fixed()
  ])
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
 * @param {Number} [customBottomHeight] - Custom bottom platform height (% of screen height)
 * @param {Number} [customTopHeight] - Custom top platform height (% of screen height)
 * @param {Object|Array} [gap] - Gap(s) in bottom platform {x, width} or [{x, width}, ...]
 * @returns {Array} Array of platform objects
 */
function addPlatforms(k, color, customBottomHeight, customTopHeight, gap) {
  // Calculate platform dimensions from percentages (use custom or default)
  const bottomPlatformHeight = k.height() * (customBottomHeight || CFG.visual.bottomPlatformHeight) / 100
  const topPlatformHeight = k.height() * (customTopHeight || CFG.visual.topPlatformHeight) / 100
  const sideWallWidth = k.width() * CFG.visual.sideWallWidth / 100
  
  function createPlatform(x, y, width, height) {
    return k.add([
      k.rect(width, height),
      k.pos(x, y),
      k.area(),
      k.body({ isStatic: true }),
      getColor(k, color),
      CFG.levels.platformName
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
 * @returns {Object} {hero, antiHero}
 */
function createLevelHeroes(k, levelName, sound, nextLevel, customHeroX = null, customHeroY = null) {
  const antiHero = Hero.create({
    k,
    x: k.width() * CFG.levels[levelName].antiHeroSpawn.x / 100,
    y: k.height() * CFG.levels[levelName].antiHeroSpawn.y / 100,
    type: 'antihero',
    sfx: sound
  })
  
  // Hide anti-hero initially (will be shown when spawned)
  antiHero.character.hidden = true
  
  const hero = Hero.create({
    k,
    x: customHeroX !== null ? customHeroX : k.width() * CFG.levels[levelName].heroSpawn.x / 100,
    y: customHeroY !== null ? customHeroY : k.height() * CFG.levels[levelName].heroSpawn.y / 100,
    type: Hero.HEROES.HERO,
    sfx: sound,
    antiHero,
    currentLevel: levelName  // Use new transition system
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
 * Update eerie sound timer and play sound randomly
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
    k.outline(3, getRGB(k, CFG.colors.outlineTextColor)),
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
      k.outline(2, getRGB(k, CFG.colors.outlineTextColor)),
      k.z(CFG.visual.zIndex.platforms + 1),  // In front of platforms
    ])
  }
  
  return title
}