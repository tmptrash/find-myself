import { CFG } from '../../../cfg.js'
import { getColor, getRGB } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Blades from '../components/blades.js'
import * as Hero from '../../../components/hero.js'
import * as Particles from '../../../utils/particles.js'
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
 * @param {number} [customTopHeight] - Custom top platform height (% of screen height)
 * @returns {Array} Array of anti-hero instances
 */
export function addLevelIndicator(k, levelNumber, activeColor, inactiveColor, customTopHeight = null) {
  const topHeight = customTopHeight || CFG.visual.topPlatformHeight
  const topPlatformHeight = k.height() * topHeight / 100
  const sideWallWidth = k.width() * CFG.visual.sideWallWidth / 100
  
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
  
  // Set gravity (fixed for 1920x1080 resolution)
  k.setGravity(CFG.gameplay.gravity)
  
  //
  // Create sound instance and stop ambient from menu
  //
  const sound = Sound.create()
  Sound.stopAmbient(sound)
  
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
  
  if (levelName?.startsWith('level-word')) {
    const resolvedBottomPercent = bottomPlatformHeight ?? CFG.visual.bottomPlatformHeight
    const resolvedTopPercent = topPlatformHeight ?? CFG.visual.topPlatformHeight
    addWordBackdrop(k, {
      levelName,
      platformColor: pfColor || CFG.colors['level-word.0']?.platform,
      bottomPercent: resolvedBottomPercent,
      topPercent: resolvedTopPercent,
      hero
    })
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
  //
  // Get dust color from level platform color
  //
  const dustColor = CFG.colors[levelName]?.platform || null
  
  const antiHero = Hero.create({
    k,
    x: k.width() * CFG.levels[levelName].antiHeroSpawn.x / 100,
    y: k.height() * CFG.levels[levelName].antiHeroSpawn.y / 100,
    type: 'antiHero',
    sfx: sound,
    dustColor,
    addMouth: true
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
    currentLevel: levelName,  // Use new transition system
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

/**
 * Adds stylized "word" backdrop between platforms
 * @param {Object} k - Kaplay instance
 * @param {Object} params - Backdrop parameters
 * @param {string} params.levelName - Level name (e.g., 'level-word.1')
 * @param {string} [params.platformColor] - Platform color to derive tint
 * @param {number} params.bottomPercent - Bottom platform height percentage
 * @param {number} params.topPercent - Top platform height percentage
 */
function addWordBackdrop(k, { levelName, platformColor, bottomPercent, topPercent, hero }) {
  const baseBottomPercent = bottomPercent ?? CFG.visual.bottomPlatformHeight
  const baseTopPercent = topPercent ?? CFG.visual.topPlatformHeight
  const bottomHeightPx = k.height() * baseBottomPercent / 100
  const topHeightPx = k.height() * baseTopPercent / 100
  const sideWallWidthPx = k.width() * CFG.visual.sideWallWidth / 100
  const playableTop = topHeightPx
  const playableBottom = k.height() - bottomHeightPx
  const playableHeight = playableBottom - playableTop
  const playableWidth = k.width() - sideWallWidthPx * 2
  const centerY = playableTop + playableHeight / 2
  const centerX = k.width() / 2
  const playableLeft = sideWallWidthPx
  const playableRight = k.width() - sideWallWidthPx
  const horizontalMargin = 1
  const verticalMargin = 0

  const baseColorHex = platformColor || CFG.colors[levelName]?.platform || '666666'
  const rgb = getRGB(k, baseColorHex)

  const tint = (value, factor) => Math.min(255, Math.max(0, Math.round(value * factor)))
  const dimColor = {
    r: tint(rgb.r, 0.4),
    g: tint(rgb.g, 0.4),
    b: tint(rgb.b, 0.4)
  }

  const fontSize = Math.min(playableHeight * 0.4, playableWidth * 0.45)

  const canvasWidth = Math.ceil(playableWidth)
  const canvasHeight = Math.ceil(fontSize * 1.2)
  const sampleCanvas = document.createElement('canvas')
  sampleCanvas.width = canvasWidth
  sampleCanvas.height = canvasHeight
  const sampleCtx = sampleCanvas.getContext('2d')
  sampleCtx.fillStyle = '#ffffff'
  sampleCtx.font = `bold ${fontSize}px monospace`
  sampleCtx.textAlign = 'center'
  sampleCtx.textBaseline = 'middle'
  sampleCtx.fillText('word', canvasWidth / 2, canvasHeight / 2)

  const imageData = sampleCtx.getImageData(0, 0, canvasWidth, canvasHeight)
  const pixels = imageData.data

  const isEdgePixel = (x, y) => {
    const getAlpha = (px, py) => {
      if (px < 0 || px >= canvasWidth || py < 0 || py >= canvasHeight) return 0
      return pixels[(py * canvasWidth + px) * 4 + 3]
    }

    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        if (dx === 0 && dy === 0) continue
        if (getAlpha(x + dx, y + dy) < 128) return true
      }
    }
    return false
  }

  const edgePixels = []
  for (let y = 0; y < canvasHeight; y++) {
    for (let x = 0; x < canvasWidth; x++) {
      const alpha = pixels[(y * canvasWidth + x) * 4 + 3]
      if (alpha > 128 && isEdgePixel(x, y)) {
        edgePixels.push({ x, y })
      }
    }
  }

  for (let i = edgePixels.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[edgePixels[i], edgePixels[j]] = [edgePixels[j], edgePixels[i]]
  }

  const samplingProbability = 0.52  // +30% from 0.4
  const minDistance = 4.6  // Reduced for +30% more density
  const selectedPositions = []

  const isFarEnough = (x, y) => {
    const minDistSq = minDistance * minDistance
    for (let i = 0; i < selectedPositions.length; i++) {
      const dx = selectedPositions[i].x - x
      const dy = selectedPositions[i].y - y
      if (dx * dx + dy * dy < minDistSq) return false
    }
    return true
  }

  edgePixels.forEach(pixel => {
    if (Math.random() > samplingProbability) return

    const worldX = centerX + (pixel.x - canvasWidth / 2)
    const worldY = centerY + (pixel.y - canvasHeight / 2)

    const clampedX = Math.max(playableLeft + horizontalMargin, Math.min(playableRight - horizontalMargin, worldX))
    const clampedY = Math.max(playableTop + verticalMargin, Math.min(playableBottom - verticalMargin, worldY))

    if (isFarEnough(clampedX, clampedY)) {
      selectedPositions.push({ x: clampedX, y: clampedY })
    }
  })

  if (selectedPositions.length === 0) {
    selectedPositions.push({ x: centerX, y: centerY })
  }

  const fireflyColor = '#FFE2A8'
  const particleSystem = {
    k,
    particles: [],
    color: fireflyColor,
    baseOpacity: 0.55,
    flickerSpeed: 2.4,
    trembleRadius: 0.7,
    trembleRadiusAfterFlee: 5.5,
    mouseInfluence: 0,
    threatInfluence: 260,
    fleeDistance: 150,
    bounds: {
      x: playableLeft,
      y: playableTop,
      width: playableWidth,
      height: playableHeight
    },
    boundsMargin: { horizontal: horizontalMargin, vertical: verticalMargin },
    time: 0,
    getThreatPosition: () => {
      if (!hero || !hero.character || !hero.character.exists()) {
        return { active: false }
      }
      const pos = hero.character.pos
      return {
        x: pos.x,
        y: pos.y,
        active: true,
        influence: 200,
        fleeDistance: 120
      }
    },
    isCursorVisible: () => false
  }

  selectedPositions.forEach(pos => {
    particleSystem.particles.push({
      baseX: pos.x,
      baseY: pos.y,
      x: pos.x,
      y: pos.y,
      flickerPhase: Math.random() * Math.PI * 2,
      tremblePhase: Math.random() * Math.PI * 2,
      trembleSpeed: 0.8 + Math.random() * 0.4,
      fleeSpeed: 0.7 + Math.random() * 0.6,
      opacity: 0.4,
      isFleeing: false,
      isAutoFleeing: false,
      fleeStartX: pos.x,
      fleeStartY: pos.y,
      fleeTargetX: pos.x,
      fleeTargetY: pos.y,
      fleeProgress: 0,
      justLanded: false,
      landedTimer: 0,
      floatFadeIn: 0,
      hasEverFled: false
    })
  })

  const particleDrawLayer = CFG.visual.zIndex.background + 2

  const inst = Particles.create({
    k,
    particleCount: 0,
    color: fireflyColor,
    baseOpacity: particleSystem.baseOpacity,
    flickerSpeed: particleSystem.flickerSpeed,
    trembleRadius: particleSystem.trembleRadius,
    mouseInfluence: particleSystem.mouseInfluence,
    bounds: particleSystem.bounds,
    gaussianFactor: 0.3,
    boundsMargin: particleSystem.boundsMargin
  })
  inst.particles = particleSystem.particles
  inst.trembleRadiusAfterFlee = particleSystem.trembleRadiusAfterFlee
  inst.time = particleSystem.time
  inst.getThreatPosition = particleSystem.getThreatPosition
  inst.isCursorVisible = () => false
  inst.threatInfluence = particleSystem.threatInfluence
  inst.fleeDistance = particleSystem.fleeDistance

  k.onUpdate(() => {
    Particles.onUpdate(inst)
  })

  k.onDraw(() => {
    inst.particles.forEach(particle => {
      if (particle.opacity < 0.01) return
      const pos = k.vec2(particle.x, particle.y)

      k.drawCircle({
        pos,
        radius: 4.5,
        color: k.rgb(255, 200, 150),
        opacity: particle.opacity * 0.3,
        z: particleDrawLayer,
        fixed: true
      })
      k.drawCircle({
        pos,
        radius: 2.1,
        color: k.rgb(255, 238, 180),
        opacity: particle.opacity,
        z: particleDrawLayer + 0.1,
        fixed: true
      })
    })
  })
}