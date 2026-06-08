import { CFG, getLevelColors } from '../cfg.js'
import { getColor, getRGB, parseHex, toCanvas } from '../../../utils/helper.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'
import * as LevelIndicator from '../components/level-indicator.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { get, set } from '../../../utils/progress.js'
import { goToMenuAfterAssets } from '../../../utils/level-assets.js'
import * as LevelHelp from '../../../utils/level-help.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import * as WordHeroIdleSpeech from './word-hero-idle-speech.js'
import * as WordHangingVines from './word-hanging-vines.js'
import * as WordConsciousnessLayers from './word-consciousness-layers.js'
import * as WordBackgroundAntiheroes from './word-background-antiheroes.js'
import * as WordDreamingEyes from './word-dreaming-eyes.js'

const ANTIHERO_SPAWN_DELAY = 1.5
const CORNER_RADIUS = 20  // Radius for rounded corners
//
// Eerie background drone timing (random glitch pulses between intervals)
//
const EERIE_SOUND_INITIAL_DELAY_MIN = 3
const EERIE_SOUND_INITIAL_DELAY_MAX = 6
const EERIE_SOUND_MIN_DELAY = 4
const EERIE_SOUND_MAX_DELAY = 8
//
// FPS / timer row aligned vertically with WORDS letters and top-right score numerals
//
const WORD_HUD_FPS_TOP_OFFSET = 43
//
// Black outline offsets for bottom death subtitle (8-direction stroke)
//
const DEATH_MESSAGE_OUTLINE_OFFSETS = [
  [-2, -2], [0, -2], [2, -2],
  [-2, 0], [2, 0],
  [-2, 2], [0, 2], [2, 2]
]

/**
 * Creates red death subtitle with black outline at the bottom of the screen
 * @param {Object} k - Kaplay instance
 * @param {Object} cfg - Message configuration
 * @param {string} cfg.message - Text to display
 * @param {number} cfg.centerX - Horizontal center X
 * @param {number} cfg.messageY - Vertical position
 * @param {number} [cfg.fontSize=28] - Font size in pixels
 * @param {number} [cfg.zIndex] - Draw order (defaults to UI + 10)
 * @returns {Object} Handles with setOpacity() and destroy()
 */
export function createOutlinedDeathMessage(k, cfg) {
  const {
    message,
    centerX,
    messageY,
    fontSize = 28,
    zIndex = CFG.visual.zIndex.ui + 10
  } = cfg
  const font = CFG.visual.fonts.regularFull.replace(/'/g, '')
  const [fillR, fillG, fillB] = parseHex(CFG.visual.colors.deathMessage)
  const outlineTexts = DEATH_MESSAGE_OUTLINE_OFFSETS.map(([dx, dy]) =>
    k.add([
      k.text(message, { size: fontSize, align: 'center', font }),
      k.pos(centerX + dx, messageY + dy),
      k.anchor('center'),
      k.color(0, 0, 0),
      k.opacity(0),
      k.z(zIndex)
    ])
  )
  const messageText = k.add([
    k.text(message, { size: fontSize, align: 'center', font }),
    k.pos(centerX, messageY),
    k.anchor('center'),
    k.color(fillR, fillG, fillB),
    k.opacity(0),
    k.z(zIndex)
  ])
  return {
    messageText,
    setOpacity(value) {
      messageText.opacity = value
      outlineTexts.forEach(t => { t.opacity = value })
    },
    destroy() {
      k.destroy(messageText)
      outlineTexts.forEach(t => k.destroy(t))
    }
  }
}

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
  const antiHeroScale = 2 / 3
  const antiHeroSize = 96 * antiHeroScale
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
      bodyColor,
      scale: antiHeroScale,
      isStatic: true,
      addMouth: true,
      addWatch: true,
      //
      // HUD progression anti-heroes are decorative — suppress the default
      // "z-Z" sleeping glyphs so the indicator stays clean.
      //
      idleVocalization: null
    })
    antiHero.character.z = CFG.visual.zIndex.ui  // Show above platforms
    antiHeroes.push(antiHero)
  }
  
  return antiHeroes
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
 * @param {Function} [config.onAnnihilation] - Callback when hero meets anti-hero
 * @param {number} [config.helpY] - Override Y position for the "buy help" label (default: floor + offset)
 * @returns {Object} Object with sound, hero, antiHero, levelIndicator, fpsCounter, breathMusic
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
    antiHeroY = null,
    onAnnihilation = null,
    helpY: helpYOverride = null
  } = config
  
  //
  // Per-level palette when not overridden — deeper word levels get darker
  //
  const resolvedLevelColors = levelName ? getLevelColors(levelName) : null
  const bgColor = backgroundColor || resolvedLevelColors?.background || CFG.visual.colors.background
  const pfColor = platformColor || resolvedLevelColors?.platform || CFG.visual.colors.platform
  const playfieldColor = resolvedLevelColors?.playfield ?? CFG.visual.colors.playfield ?? pfColor
  //
  // The very top/bottom edges of the canvas are covered by the platform strips
  // (pfColor), so use pfColor as the backdrop to eliminate visible seams at
  // the letterbox boundary.
  //
  CanvasBackdrop.applyCanvasBackdrop(k, pfColor)
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
  // Start background music for word levels (word.mp3 + breath.mp3)
  //
  Sound.startBackgroundMusic(sound, k, 'word')
  const breathVolume = CFG.audio.backgroundMusic?.breath ?? CFG.audio.backgroundMusic?.word * 0.5
  const breathMusic = k.play('breath', {
    volume: breathVolume,
    loop: true
  })
  k.onSceneLeave(() => {
    if (breathMusic && breathMusic.stop) breathMusic.stop()
    CanvasBackdrop.clearCanvasBackdrop(k)
  })
  Sound.startAudioContext(sound)
  Sound.unmuteProceduralSounds()
  Sound.resumeGlobalAudio()
  //
  // Eerie background drones at random intervals (word section atmosphere)
  //
  const eerieInst = {
    k,
    sound,
    soundTimer: k.rand(EERIE_SOUND_INITIAL_DELAY_MIN, EERIE_SOUND_INITIAL_DELAY_MAX)
  }
  k.onUpdate(() => onUpdateEerieSound(eerieInst))
  //
  // Layer 0 — thought sky void; layer 5 — game-world playfield fill inside walls
  //
  const bottomPH = bottomPlatformHeight ?? k.height() * 0.12
  const wall = sideWallWidth ?? 192
  k.add([
    k.rect(k.width(), k.height()),
    getColor(k, bgColor),
    k.pos(0, 0),
    k.fixed(),
    k.z(CFG.visual.zIndex.wordThoughtSky ?? CFG.visual.zIndex.background - 18)
  ])
  addPlayfieldFill(k, playfieldColor, topPlatformHeight, bottomPH, wall)
  WordConsciousnessLayers.create({
    k,
    sideWallWidth: wall,
    topPlatformHeight,
    bottomPlatformHeight: bottomPH,
    playfieldColor
  })
  WordHangingVines.create({
    k,
    sideWallWidth: sideWallWidth ?? 192,
    topPlatformHeight,
    bottomPlatformHeight: bottomPH,
    playfieldColor
  })
  
  // Add platforms (unless skipped)
  if (!skipPlatforms) {
    addPlatforms(k, pfColor, bottomPlatformHeight, topPlatformHeight, platformGap)
    createRoundedCorners(k, pfColor, {
      sideWallWidth: wall,
      topPlatformHeight: topPlatformHeight ?? 360,
      bottomPlatformHeight: bottomPH
    })
  }
  
  // Setup camera
  setupCamera(k)
  
  //
  // Hero body color based on section progress (used for level indicator small hero)
  //
  const isTimeComplete = get('time.completed', false)
  const isTouchCompleteForColor = get('touch.completed', false)
  const heroBodyColor = isTimeComplete ? "#FF8C00" : isTouchCompleteForColor ? "#8B5A50" : CFG.visual.colors.hero.body
  //
  // Add level indicator if levelNumber provided
  //
  let levelIndicator = null
  if (levelNumber && topPlatformHeight && sideWallWidth) {
    levelIndicator = LevelIndicator.create({
      k,
      levelNumber,
      activeColor: CFG.visual.colors.levelIndicator.active,
      inactiveColor: CFG.visual.colors.levelIndicator.inactive,
      heroBodyColor,
      topPlatformHeight,
      sideWallWidth
    })
  }
  levelName && sideWallWidth != null && LevelHelp.create({
    k,
    levelName,
    sideWallWidth,
    floorY: k.height() - (bottomPlatformHeight ?? 360),
    helpY: helpYOverride ?? k.height() - (bottomPlatformHeight ?? 360) + LevelHelp.HELP_UNDER_PLAY_AREA_OFFSET,
    levelIndicator,
    sound,
    //
    // Sync canvas letterbox color with the platform strips while the help
    // panel is open or closing — eliminates visible horizontal seams.
    //
    sceneBackdropHex: pfColor
  })
  //
  // Create FPS counter, timer and target time (aligned with WORDS and small hero)
  //
  const uiTopY = topPlatformHeight ? topPlatformHeight - WORD_HUD_FPS_TOP_OFFSET : 55
  const fpsCounter = FpsCounter.create({ 
    k,
    showTimer: true,
    targetTime: levelName && CFG.gameplay.speedBonusTime ? CFG.gameplay.speedBonusTime[levelName] : null,
    topY: uiTopY
  })
  //
  // Update FPS counter
  //
  k.onUpdate(() => {
    FpsCounter.onUpdate(fpsCounter)
  })
  TouchControls.create({
    k,
    floorY: k.height() - (bottomPlatformHeight ?? 360),
    leftMargin: sideWallWidth ?? 192,
    rightMargin: sideWallWidth ?? 192
  })
  
  // Level titles removed for cleaner visual experience
  // if (levelTitleColor) {
  //   addLevelTitle(k, "words like blades", levelTitleColor, null, null, topPlatformHeight)
  // }
  
  //
  // Setup back to menu
  //
  CFG.controls.backToMenu.forEach(key => {
    k.onKeyPress(key, () => {
      Sound.stopBackgroundMusic(sound)
      if (breathMusic && breathMusic.stop) breathMusic.stop()
      goToMenuAfterAssets(k)
    })
  })
  
  let hero = null
  let antiHero = null
  
  //
  // Create heroes if requested
  //
  if (createHeroes && levelName && heroX !== null && heroY !== null && antiHeroX !== null && antiHeroY !== null) {
    const heroesResult = createLevelHeroes(k, sound, levelName, heroX, heroY, antiHeroX, antiHeroY, pfColor, onAnnihilation)
    hero = heroesResult.hero
    antiHero = heroesResult.antiHero
    hero && WordHeroIdleSpeech.create(k, hero)
    WordDreamingEyes.create(k, { topPlatformHeight, bottomPlatformHeight: bottomPH, sideWallWidth: wall }, hero)
    hero && WordBackgroundAntiheroes.create({
      k,
      hero,
      bottomPlatformHeight: bottomPH,
      topPlatformHeight: topPlatformHeight ?? 360,
      sideWallWidth: wall,
      playfieldColor
    })
  }
  
  return { sound, hero, antiHero, levelIndicator, fpsCounter, breathMusic, backgroundColor: bgColor, platformColor: pfColor, playfieldColor }
}

/**
 * Check if player earned speed bonus for completing level faster than target
 * @param {Object} k - Kaplay instance
 * @param {string} levelName - Current level name (e.g. 'level-word.0')
 * @param {number} levelTime - Time taken to complete level (seconds)
 * @param {Object} levelIndicator - Level indicator instance
 * @returns {boolean} True if speed bonus earned
 */
export function checkSpeedBonus(k, levelName, levelTime, levelIndicator) {
  const targetTime = CFG.gameplay.speedBonusTime && CFG.gameplay.speedBonusTime[levelName]
  if (!targetTime) return false
  return levelTime < targetTime
}

/**
 * Play speed bonus visual effects on the small hero indicator
 * Flashes hero color/white and creates circle particles flying outward
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with smallHero
 */
export function playSpeedBonusEffects(k, levelIndicator) {
  if (!levelIndicator || !levelIndicator.smallHero || !levelIndicator.smallHero.character) return
  const bodyColorHex = levelIndicator.smallHero.bodyColor || CFG.visual.colors.hero.body
  const heroColor = getRGB(k, bodyColorHex)
  flashSmallHeroBonus(k, levelIndicator, heroColor, 0)
  createSpeedBonusParticles(k, levelIndicator, heroColor)
}

/**
 * Play life sound, flash life image and create particles when hero dies
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with lifeImage
 */
export function playLifeDeathEffects(k, levelIndicator) {
  if (!levelIndicator || !levelIndicator.lifeImage || !levelIndicator.lifeImage.sprite || !levelIndicator.lifeImage.sprite.exists()) {
    return
  }
  Sound.playLifeSound(k)
  const originalColor = levelIndicator.lifeImage.sprite.color
  flashLifeImageWord(k, levelIndicator, originalColor, 0)
  createLifeScoreParticlesWord(k, levelIndicator)
}

/**
 * Flash life image red/white when hero dies
 */
function flashLifeImageWord(k, levelIndicator, originalColor, count) {
  if (!levelIndicator || !levelIndicator.lifeImage || !levelIndicator.lifeImage.sprite || !levelIndicator.lifeImage.sprite.exists()) {
    return
  }
  if (count >= 20) {
    levelIndicator.lifeImage.sprite.color = originalColor
    levelIndicator.lifeImage.sprite.opacity = 1.0
    return
  }
  if (count % 2 === 0) {
    levelIndicator.lifeImage.sprite.color = k.rgb(255, 100, 100)
    levelIndicator.lifeImage.sprite.opacity = 1.0
  } else {
    levelIndicator.lifeImage.sprite.color = k.rgb(255, 255, 255)
    levelIndicator.lifeImage.sprite.opacity = 0.5
  }
  k.wait(0.05, () => flashLifeImageWord(k, levelIndicator, originalColor, count + 1))
}

/**
 * Create red particles around life image when hero dies
 */
function createLifeScoreParticlesWord(k, levelIndicator) {
  if (!levelIndicator || !levelIndicator.lifeImage || !levelIndicator.lifeImage.sprite || !levelIndicator.lifeImage.sprite.exists()) {
    return
  }
  const lifeImageX = levelIndicator.lifeImage.sprite.pos.x
  const lifeImageY = levelIndicator.lifeImage.sprite.pos.y
  const particleCount = 15
  for (let i = 0; i < particleCount; i++) {
    const angle = (Math.PI * 2 * i) / particleCount
    const speed = 80 + Math.random() * 40
    const lifetime = 0.8 + Math.random() * 0.4
    const size = 4 + Math.random() * 4
    const particle = k.add([
      k.rect(size, size),
      k.pos(lifeImageX, lifeImageY),
      k.color(255, 0, 0),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
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

const SPEED_BONUS_FLASH_COUNT = 20
const SPEED_BONUS_FLASH_INTERVAL = 0.05
const SPEED_BONUS_PARTICLE_COUNT = 8
const SPEED_BONUS_PARTICLE_SPEED_MIN = 30
const SPEED_BONUS_PARTICLE_SPEED_RANGE = 20
const SPEED_BONUS_PARTICLE_SIZE_MIN = 4
const SPEED_BONUS_PARTICLE_SIZE_RANGE = 4
const SPEED_BONUS_PARTICLE_LIFETIME_MIN = 0.8
const SPEED_BONUS_PARTICLE_LIFETIME_RANGE = 0.4

/**
 * Flash small hero between hero color and white for speed bonus
 */
function flashSmallHeroBonus(k, levelIndicator, heroColor, count) {
  if (count >= SPEED_BONUS_FLASH_COUNT) {
    levelIndicator.smallHero.character.color = k.rgb(255, 255, 255)
    return
  }
  levelIndicator.smallHero.character.color = count % 2 === 0
    ? heroColor
    : k.rgb(255, 255, 255)
  k.wait(SPEED_BONUS_FLASH_INTERVAL, () => flashSmallHeroBonus(k, levelIndicator, heroColor, count + 1))
}

/**
 * Create circle particles flying outward from small hero on speed bonus
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with smallHero
 * @param {Object} heroColor - RGB color matching the hero's body
 */
function createSpeedBonusParticles(k, levelIndicator, heroColor) {
  if (!levelIndicator || !levelIndicator.smallHero || !levelIndicator.smallHero.character) return
  const heroX = levelIndicator.smallHero.character.pos.x
  const heroY = levelIndicator.smallHero.character.pos.y
  
  for (let i = 0; i < SPEED_BONUS_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / SPEED_BONUS_PARTICLE_COUNT
    const speed = SPEED_BONUS_PARTICLE_SPEED_MIN + Math.random() * SPEED_BONUS_PARTICLE_SPEED_RANGE
    const lifetime = SPEED_BONUS_PARTICLE_LIFETIME_MIN + Math.random() * SPEED_BONUS_PARTICLE_LIFETIME_RANGE
    const size = SPEED_BONUS_PARTICLE_SIZE_MIN + Math.random() * SPEED_BONUS_PARTICLE_SIZE_RANGE
    //
    // Create small circle particle matching hero body color
    //
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

//
// Rounded playfield fill — lighter game zone distinct from dark void and platform frame
//
function addPlayfieldFill(k, playfieldColor, topPlatformHeight, bottomPlatformHeight, sideWallWidth) {
  const wall = sideWallWidth
  const topY = topPlatformHeight ?? 360
  const bottomPH = bottomPlatformHeight ?? 360
  const fillZ = CFG.visual.zIndex.wordPlayfieldFill ?? -90
  const width = k.width() - wall * 2
  const height = k.height() - topY - bottomPH
  const spriteKey = `word-playfield-fill-${width}x${height}-${playfieldColor.replace('#', '')}`
  if (!k.getSprite(spriteKey)) {
    const canvas = toCanvas({ width, height, pixelRatio: 1 }, (ctx) => {
      ctx.fillStyle = playfieldColor.startsWith('#') ? playfieldColor : `#${playfieldColor.replace('#', '')}`
      ctx.beginPath()
      ctx.moveTo(CORNER_RADIUS, 0)
      ctx.lineTo(width - CORNER_RADIUS, 0)
      ctx.quadraticCurveTo(width, 0, width, CORNER_RADIUS)
      ctx.lineTo(width, height - CORNER_RADIUS)
      ctx.quadraticCurveTo(width, height, width - CORNER_RADIUS, height)
      ctx.lineTo(CORNER_RADIUS, height)
      ctx.quadraticCurveTo(0, height, 0, height - CORNER_RADIUS)
      ctx.lineTo(0, CORNER_RADIUS)
      ctx.quadraticCurveTo(0, 0, CORNER_RADIUS, 0)
      ctx.closePath()
      ctx.fill()
    })
    k.loadSprite(spriteKey, canvas)
    canvas.width = 0
    canvas.height = 0
  }
  k.add([
    k.sprite(spriteKey),
    k.pos(wall, topY),
    k.fixed(),
    k.z(fillZ)
  ])
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
      CFG.game.platformName,
      k.z(CFG.visual.zIndex.platforms)  // High z-index so platforms are always on top
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
 * @param {Object} sound - Sound instance
 * @param {string} currentLevel - Level name (e.g., 'level-word.1')
 * @param {number} heroX - Hero X position
 * @param {number} heroY - Hero Y position
 * @param {number} antiHeroX - Anti-hero X position
 * @param {number} antiHeroY - Anti-hero Y position
 * @param {string} [platformColor] - Platform color for dust particles
 * @param {Function} [onAnnihilation] - Callback when hero meets anti-hero
 * @returns {Object} {hero, antiHero}
 */
function createLevelHeroes(k, sound, currentLevel, heroX, heroY, antiHeroX, antiHeroY, platformColor = null, onAnnihilation = null) {
  //
  // Use platform color for dust particles (black platforms)
  //
  const dustColor = platformColor
  //
  // Check completed sections for hero appearance
  //
  const isWordComplete = get('word.completed', false)
  const isTimeComplete = get('time.completed', false)
  const isTouchComplete = get('touch.completed', false)
  //
  // Hero body color: orange if time complete, brown if touch complete, otherwise default
  //
  const heroBodyColor = isTimeComplete
    ? "#FF8C00"
    : isTouchComplete
      ? "#8B5A50"
      : CFG.visual.colors.hero.body
  
  const antiHero = Hero.create({
    k,
    x: antiHeroX,
    y: antiHeroY,
    type: 'antiHero',
    sfx: sound,
    dustColor,
    addMouth: true,
    addArms: true,
    addWatch: true,
    bodyColor: 'DC143C'
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
    currentLevel,
    onAnnihilation: onAnnihilation || null,
    dustColor,
    addMouth: isWordComplete,
    bodyColor: heroBodyColor,
    addArms: isTouchComplete || isWordComplete,
    addWatch: true,
    //
    // word-hero-idle-speech handles mouth visuals in this section —
    // disable built-in musical notes so they don't compete
    //
    idleVocalization: null
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
    k.outline(3, getRGB(k, CFG.visual.colors.outline)),
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
      k.outline(2, getRGB(k, CFG.visual.colors.outline)),
      k.z(CFG.visual.zIndex.platforms + 1),  // In front of platforms
    ])
  }
  
  return title
}

/**
 * Creates a rounded corner sprite using canvas (L-shaped with rounded inner corner)
 * @param {number} radius - Corner radius
 * @param {string} color - Platform color in hex format
 * @returns {HTMLCanvasElement} Canvas element ready for k.loadSprite; caller must zero it after loading
 */
function createRoundedCornerSprite(radius, color) {
  const canvas = document.createElement('canvas')
  canvas.width = radius
  canvas.height = radius
  const ctx = canvas.getContext('2d')
  //
  // Draw L-shaped corner with rounded inner angle
  //
  ctx.fillStyle = color
  ctx.fillRect(0, 0, radius, radius)
  //
  // Cut out top-right quarter circle to create rounded inner corner
  //
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(radius, radius, radius, 0, Math.PI * 2)
  ctx.fill()

  return canvas
}

/**
 * Creates rounded corners for game area to soften sharp edges where platforms meet
 * @param {Object} k - Kaplay instance
 * @param {string} platformColor - Platform color in hex format
 * @param {Object} [dims] - Custom platform dimensions
 * @param {number} [dims.sideWallWidth=192] - Side wall width
 * @param {number} [dims.topPlatformHeight=360] - Top platform height
 * @param {number} [dims.bottomPlatformHeight=360] - Bottom platform height
 */
export function createRoundedCorners(k, platformColor, dims = {}) {
  const radius = CORNER_RADIUS
  const sideWallWidth = dims.sideWallWidth || 192
  const topPlatformHeight = dims.topPlatformHeight || 360
  const bottomPlatformHeight = dims.bottomPlatformHeight || 360
  //
  // Create corner sprite
  //
  const cornerCanvas = createRoundedCornerSprite(radius, platformColor)
  k.loadSprite('word-corner-sprite', cornerCanvas)
  //
  // Release canvas backing store immediately after Kaplay reads it.
  //
  cornerCanvas.width = 0
  cornerCanvas.height = 0
  //
  // Top-left corner (rotate 0°)
  //
  k.add([
    k.sprite('word-corner-sprite'),
    k.pos(sideWallWidth, topPlatformHeight),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Top-right corner (rotate 90°)
  //
  k.add([
    k.sprite('word-corner-sprite'),
    k.pos(k.width() - sideWallWidth, topPlatformHeight),
    k.rotate(90),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Bottom-left corner (rotate 270°)
  //
  k.add([
    k.sprite('word-corner-sprite'),
    k.pos(sideWallWidth, k.height() - bottomPlatformHeight),
    k.rotate(270),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Bottom-right corner (rotate 180°)
  //
  k.add([
    k.sprite('word-corner-sprite'),
    k.pos(k.width() - sideWallWidth, k.height() - bottomPlatformHeight),
    k.rotate(180),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
}
//
// Drives periodic eerie glitch drones for word level atmosphere
//
function onUpdateEerieSound(inst) {
  updateEerieSound(inst, EERIE_SOUND_MIN_DELAY, EERIE_SOUND_MAX_DELAY)
}
