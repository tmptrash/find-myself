import { CFG } from '../cfg.js'
import { initScene, stopTimeSectionMusic, timeSectionMusic } from '../components/scene-helper.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'
import { set, get } from '../../../utils/progress.js'
import { getColor, toCanvas, parseHex, hexToRgb, rgbToHex } from '../../../utils/helper.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as OneSpikes from '../components/one-spikes.js'
import * as MovingCars from '../components/moving-cars.js'
import * as BackgroundBirds from '../components/background-birds.js'
import * as Tooltip from '../../../utils/tooltip.js'
import { registerTime3Sprite } from '../../../utils/level-assets.js'
import { getDarkness } from '../utils/time-day-night.js'
import * as BootLoader from '../../../utils/boot-loader.js'
import { createLevelTransition } from '../../../utils/transition.js'
import * as LevelHelp from '../../../utils/level-help.js'
import * as TimeLevel3Finale from '../utils/time-level3-finale.js'
//
// Platform dimensions (in pixels, for 1920x1080 resolution)
//
const PLATFORM_BOTTOM_HEIGHT = 100
const PLATFORM_SIDE_WIDTH = 50
const CORNER_RADIUS = 20  // Radius for rounded corners
//
// TIME indicator tooltip
//
const TIME_INDICATOR_TOOLTIP_TEXT = "Your progress"
const TIME_INDICATOR_TOOLTIP_WIDTH = 200
const TIME_INDICATOR_TOOLTIP_HEIGHT = 60
const TIME_INDICATOR_TOOLTIP_Y_OFFSET = 40
//
// Monster and hero tooltips
//
const MONSTER_TOOLTIP_TEXT = "Why are you running?"
const MONSTER_TOOLTIP_SIZE = 120
const MONSTER_TOOLTIP_Y_OFFSET = -80
const HERO_TOOLTIP_TEXT = "I can't keep uuuuup!!!"
const HERO_TOOLTIP_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -60
//
// Corridor dimensions
//
const CORRIDOR_HEIGHT = 200  // Height of the corridor
const UPPER_CORRIDOR_HEIGHT = 270  // Upper corridor height (reduced to raise middle platform)
const CORRIDOR_Y = 200  // Position upper corridor at top (room for clouds above)
const LOWER_CORRIDOR_Y = 680  // Position lower corridor
const PASSAGE_WIDTH = 100  // Width of passage between corridors
//
// Hero and monster spawn positions
//
const HERO_SPAWN_X = 350  // Hero starts more to the right
const HERO_SPAWN_Y = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT / 2
const MONSTER_SPAWN_X = PLATFORM_SIDE_WIDTH + 30  // Monster starts at the left (closer to wall)
const MONSTER_SPAWN_Y = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT / 2
const ANTIHERO_SPAWN_X = PLATFORM_SIDE_WIDTH + 50  // Anti-hero at the left of lower corridor
const ANTIHERO_SPAWN_Y = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT / 2
//
// Snowball instructions text Y — placed in the lower third of the upper corridor so it
// doesn't overlap with the T1ME indicator near the corridor ceiling.
//
const SNOWBALL_INSTRUCTIONS_TEXT_Y = CORRIDOR_Y + 200
//
// Guards against duplicate music when the async scene setup is interrupted and restarted.
//
let level3SceneGeneration = 0
//
// Bullet configuration
//
const BULLET_RADIUS = 6
const BULLET_SPEED = 600
const BULLET_OUTLINE_WIDTH = 2
const MONSTER_FREEZE_DURATION = 1.0
//
// Level decay constants (when monster eats clocks)
//
const randomRange = (min, max) => Math.random() * (max - min) + min
//
// Monster night effect thresholds and glow colours.
// At night the overlay (z=15.51) hides the body; the glow circles sit above it.
//
const MONSTER_NIGHT_DARKNESS = 0.35
const MONSTER_EYE_GLOW_Z = 16
const MONSTER_EYE_DAY_Z = 14
const MONSTER_EYE_GLOW_RADIUS = 9
const MONSTER_EYE_GLOW_R = 255
const MONSTER_EYE_GLOW_G = 140
const MONSTER_EYE_GLOW_B = 20
const MONSTER_BODY_DAY_OPACITY = 1.0
const MONSTER_BODY_NIGHT_OPACITY = 0.18
//
// Night pupils sit one z-step above the glow circles so they remain visible
// as dark spots inside the orange glow when the night overlay is active.
//
const MONSTER_NIGHT_PUPIL_Z = 17
//
// Night music constants for level 3.
// Boss / kids / clock fade out after dark; crickets fill the silence.
//
const NIGHT_DARKNESS_THRESHOLD = 0.45
const NIGHT_MUSIC_TRANSITION_SPEED = 0.6  // fraction per second
const NIGHT_CRICKET_INTERVAL_MIN = 1.2
const NIGHT_CRICKET_INTERVAL_MAX = 3.5
//
// Load a sprite and register it with the time-3 pack registry so it is squashed
// (replaced with a 1×1 placeholder) when the player leaves this level, reducing
// peak VRAM on re-entry.
// If src is an HTMLCanvasElement, its 2D backing store is released immediately after
// k.loadSprite uploads the pixels to a WebGL texture, freeing GPU memory right away
// instead of waiting for GC.
//
function loadTime3Sprite(k, name, src) {
  k.loadSprite(name, src)
  registerTime3Sprite(name)
  if (src && src.nodeName === 'CANVAS') {
    src.width = 0
    src.height = 0
  }
}

/**
 * Draw realistic pixel art cloud on canvas
 * @param {CanvasRenderingContext2D} context - Canvas context
 * @param {Object} config - Cloud configuration
 */
function drawCloud(context, config) {
  const {
    x,
    y,
    size = 200,
    layers = 15,
    lightSide = 'right',
    baseColor = '#f5d5b8',
    shadowColor = '#9ba4d6',
    highlightColor = '#ffeedd',
    pixelSize = 2
  } = config
  
  const base = hexToRgb(baseColor)
  const shadow = hexToRgb(shadowColor)
  const highlight = hexToRgb(highlightColor)
  
  const cloudLayers = []
  
  for (let layerIndex = 0; layerIndex < layers; layerIndex++) {
    const layerDepth = layerIndex / layers
    const bubblesInLayer = Math.floor(randomRange(3, 8))
    const bubbles = []
    
    const layerLightBoost = layerDepth * 0.6
    const layerDarkness = (1 - layerDepth) * 0.3
    
    for (let i = 0; i < bubblesInLayer; i++) {
      const angle = randomRange(0, Math.PI * 2)
      const distance = randomRange(0, size * 0.5)
      const radius = randomRange(size * 0.15, size * 0.4)
      
      const bx = Math.cos(angle) * distance
      const by = Math.sin(angle) * distance * 0.6 - (layerDepth - 0.5) * size * 0.3
      
      bubbles.push({
        x: bx,
        y: by,
        radius: radius,
        density: randomRange(0.5, 0.9)
      })
    }
    
    cloudLayers.push({
      bubbles: bubbles,
      depth: layerDepth,
      lightBoost: layerLightBoost,
      darkness: layerDarkness
    })
  }
  
  for (const layer of cloudLayers) {
    const halfSize = size
    
    for (let py = -halfSize; py <= halfSize; py += pixelSize) {
      for (let px = -halfSize; px <= halfSize; px += pixelSize) {
        let totalDensity = 0
        
        for (const bubble of layer.bubbles) {
          const dx = px - bubble.x
          const dy = py - bubble.y
          const dist = Math.sqrt(dx * dx + dy * dy)
          
          if (dist < bubble.radius) {
            const falloff = 1 - (dist / bubble.radius)
            totalDensity += falloff * falloff * bubble.density
          }
        }
        
        const threshold = 0.25 - layer.depth * 0.1
        
        if (totalDensity > threshold) {
          const density = Math.min(totalDensity, 1)
          
          let lightFactor = 0
          
          switch (lightSide) {
            case 'right':
              lightFactor = (px / halfSize) * 0.5 + 0.5
              break
            case 'left':
              lightFactor = (-px / halfSize) * 0.5 + 0.5
              break
            case 'top':
              lightFactor = (-py / halfSize) * 0.5 + 0.5
              break
            case 'bottom':
              lightFactor = (py / halfSize) * 0.5 + 0.5
              break
          }
          
          lightFactor = lightFactor * 0.5 + density * 0.2 + layer.lightBoost - layer.darkness
          lightFactor = Math.max(0, Math.min(1, lightFactor))
          
          let r, g, b
          
          if (lightFactor > 0.65) {
            const t = (lightFactor - 0.65) / 0.35
            r = Math.floor(base.r + (highlight.r - base.r) * t)
            g = Math.floor(base.g + (highlight.g - base.g) * t)
            b = Math.floor(base.b + (highlight.b - base.b) * t)
          } else if (lightFactor > 0.3) {
            r = Math.floor(base.r)
            g = Math.floor(base.g)
            b = Math.floor(base.b)
          } else {
            const t = lightFactor / 0.3
            r = Math.floor(shadow.r + (base.r - shadow.r) * t)
            g = Math.floor(shadow.g + (base.g - shadow.g) * t)
            b = Math.floor(shadow.b + (base.b - shadow.b) * t)
          }
          
          context.fillStyle = rgbToHex(r, g, b)
          context.fillRect(x + px, y + py, pixelSize, pixelSize)
        }
      }
    }
  }
}

/**
 * Time section level 3 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel3(k) {
  k.scene("level-time.3", async () => {
    const sceneGeneration = ++level3SceneGeneration
    const isStaleScene = () => sceneGeneration !== level3SceneGeneration
    //
    // Show loader immediately — this scene does heavy canvas generation that would
    // otherwise freeze the browser without any visible progress indicator.
    //
    BootLoader.showLoader()
    BootLoader.setLoaderBarPct(5)
    //
    // Save progress immediately when entering this level
    //
    set('lastLevel', 'level-time.3')
    //
    // Save heroScore at level start for restoration on death
    //
    const heroScoreAtStart = get('heroScore', 0)
    //
    // Stop any leftover tracks from a prior visit or interrupted load.
    //
    stopLevel3BackgroundMusic(k)
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    Sound.resumeGlobalAudio()
    let nightMusicState = null
    //
    // Initialize level with heroes (skip default platforms)
    //
    const { hero, antiHero, levelIndicator } = initScene({
      k,
      levelName: 'level-time.3',
      levelNumber: 4,
      skipPlatforms: true,
      spriteName: 'city-background-level3',
      showSun: false,
      showMoon: false,
      showGameClock: true,
      backgroundColor: CFG.visual.colors.platform,
      sceneBackdropHex: CFG.visual.colors.platform,
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: CORRIDOR_Y - 20,  // T1ME indicator above upper corridor ceiling
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      helpY: CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT - 35,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y,
      //
      // Restore heroScore before reloading so snowballs spent in this run are refunded.
      //
      onAnnihilation: () => {
        set('heroScore', heroScoreAtStart)
        stopLevel3BackgroundMusic(k)
        stopTimeSectionMusic()
        Sound.fadeOutAllMusic()
        createLevelTransition(k, 'level-time.3')
      }
    })
    if (isStaleScene()) return
    //
    // Array to store decay holes in platforms
    //
    //
    // Core scene objects created — update loader progress.
    //
    BootLoader.setLoaderBarPct(20)
    //
    // Create custom corridor platforms
    //
    createCorridorPlatforms(k)
    //
    // Add city background (preloaded sprite with autumn leaves)
    //
    k.add([
      k.sprite('city-background-level3'),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height / 2),
      k.anchor('center'),
      k.z(13)  // Behind everything except gradient
    ])
    //
    // Create background birds
    //
    const birds = BackgroundBirds.create(k)
    //
    // Create small clouds at the top
    //
    const cloudY = CORRIDOR_Y - 30
    const screenWidth = k.width()
    const cloudCount = 16
    const cloudSpacing = screenWidth / cloudCount
    //
    // Create single large canvas for all clouds
    //
    const cloudsCanvas = document.createElement('canvas')
    cloudsCanvas.width = screenWidth
    cloudsCanvas.height = 250
    const cloudsCtx = cloudsCanvas.getContext('2d')
    //
    // Define cloud color schemes (same as level2)
    //
    const cloudSchemes = [
      { baseColor: '#f0f0f0', shadowColor: '#a0a0b8', highlightColor: '#ffffff' },  // White
      { baseColor: '#606060', shadowColor: '#202030', highlightColor: '#909090' },  // Gray
      { baseColor: '#405070', shadowColor: '#151828', highlightColor: '#708090' }   // Blue
    ]
    //
    // Draw all clouds on one canvas
    //
    for (let i = 0; i < cloudCount; i++) {
      const x = cloudSpacing * i + (Math.random() - 0.5) * cloudSpacing * 0.5
      const yOffset = (Math.random() - 0.5) * 60
      const cloudSize = 25 + Math.random() * 150  // Smaller clouds (25-60)
      const layers = 6 + Math.floor(Math.random() * 12)
      const scheme = cloudSchemes[Math.floor(Math.random() * cloudSchemes.length)]
      const lightSide = Math.random() > 0.5 ? 'left' : 'right'
      
      drawCloud(cloudsCtx, {
        x: x,
        y: 125 + yOffset,
        size: cloudSize,
        layers: layers,
        lightSide: lightSide,
        baseColor: scheme.baseColor,
        shadowColor: scheme.shadowColor,
        highlightColor: scheme.highlightColor,
        pixelSize: 2
      })
    }
    //
    // Convert to sprite and add to scene
    //
    const cloudsSprite = cloudsCanvas.toDataURL()
    //
    // Release 2D backing store immediately — data has been serialised to a PNG string.
    //
    cloudsCanvas.width = 0
    cloudsCanvas.height = 0
    loadTime3Sprite(k, 'level3-clouds', cloudsSprite)
    k.add([
      k.sprite('level3-clouds'),
      k.pos(0, cloudY - 70),
      k.z(13),
      k.fixed()
    ])
    //
    // Add moving cars on bottom platform
    //
    MovingCars.create({
      k,
      platformBottomHeight: PLATFORM_BOTTOM_HEIGHT,
      platformSideWidth: PLATFORM_SIDE_WIDTH,
      carCount: 5
    })
    //
    // Create time sections with clocks
    //
    const sections = createTimeSections(k)
    //
    // Create monster that chases the hero
    //
    const monster = createMonster(k, hero, sound, levelIndicator, heroScoreAtStart)
    //
    // Lower-corridor finale: calm approach wall + monster pacing near the anti-hero.
    //
    TimeLevel3Finale.create({
      k,
      hero,
      antiHero,
      monster,
      lowerCorridorY: LOWER_CORRIDOR_Y,
      lowerCorridorHeight: CORRIDOR_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH
    })
    //
    // Monster–hero collision runs after finale flags update each frame.
    //
    k.onUpdate(() => onUpdateMonsterHeroCollision(k, hero, monster, levelIndicator, heroScoreAtStart))
    //
    // Setup control inversion based on current section for BOTH hero and anti-hero
    //
    setupControlInversion(hero, sections)
    setupControlInversion(antiHero, sections)
    //
    // Setup shooting system for hero
    //
    setupHeroShooting(k, hero, monster, levelIndicator)
    //
    // Spawn hero
    //
    Hero.spawn(hero)
    //
    // Set hero z-index between snow layers (behind snow at z=25, in front of snow at z=12)
    //
    hero.character.z = 20
    //
    // Spawn anti-hero
    //
    Hero.spawn(antiHero)
    //
    // Set anti-hero z-index between snow layers (behind snow at z=25, in front of snow at z=12)
    //
    antiHero.character.z = 20
    //
    // Create snow particle system
    //
    const snowSystem = createSnowParticles(k, sections)
    //
    // Update snow particles
    //
    k.onUpdate(() => {
      updateSnowParticles(snowSystem)
    })
    //
    // Create obstacle spikes (digit "1") in clusters in both corridors
    //
    createObstacleSpikes(k, hero, sound, levelIndicator, sections, heroScoreAtStart)
    //
    // Yield to allow the browser to repaint the loader before the heavy snow
    // canvas generation that follows.
    //
    BootLoader.setLoaderBarPct(55)
    await BootLoader.yieldForGpu(1)
    if (isStaleScene()) return
    //
    // Create snow drifts on corridor floors
    //
    createSnowDrifts(k)
    //
    // Yield again so the loader updates before the remaining setup.
    //
    BootLoader.setLoaderBarPct(85)
    await BootLoader.yieldForGpu(1)
    if (isStaleScene()) return
    //
    // Create ground stripe on down corridor floor
    //
    createGroundStripe(k)
    //
    // Create rounded corners for corridors
    //
    createRoundedCorners(k)
    //
    // All heavy setup complete — update loader to 100 % and hide it.
    //
    BootLoader.setLoaderBarPct(100)
    BootLoader.hideLoader()
    if (isStaleScene()) return
    //
    // Start music once after setup completes so rapid scene re-entry never stacks tracks.
    //
    nightMusicState = startLevel3MusicSession(k, sound, sceneGeneration)
    k.onUpdate(() => {
      if (nightMusicState.sceneGeneration !== level3SceneGeneration) return
      onUpdateNightMusic(nightMusicState)
    })
    applyDayMusicVolumes(nightMusicState)
    //
    // Check if monster collides with clocks
    //
    k.onUpdate(() => {
      sections.forEach(section => {
        if (section.clock && section.clock.exists && section.clock.exists()) {
          let shouldDestroy = false
          //
          // Check collision with monster body
          //
          const bodyDistX = Math.abs(monster.x - section.clock.pos.x)
          const bodyDistY = Math.abs(monster.y - section.clock.pos.y)
          
          if (bodyDistX < 40 && bodyDistY < 40) {
            shouldDestroy = true
          }
          //
          // Check collision with each leg (end point of each leg)
          //
          if (!shouldDestroy) {
            monster.legs.forEach(leg => {
              //
              // Get the position of the last segment (foot) of each leg
              //
              const lastSegmentIndex = leg.segments.length - 1
              if (lastSegmentIndex >= 0) {
                const footX = leg.segments[lastSegmentIndex].x
                const footY = leg.segments[lastSegmentIndex].y
                const footDistX = Math.abs(footX - section.clock.pos.x)
                const footDistY = Math.abs(footY - section.clock.pos.y)
                
                if (footDistX < 30 && footDistY < 30) {
                  shouldDestroy = true
                }
              }
            })
          }
          //
          // If monster or any leg touched the clock, destroy it with particle effect
          //
          if (shouldDestroy) {
            createClockDisintegrationEffect(k, section.clock, sound)
            k.destroy(section.clock)
            section.clock = null  // Mark as destroyed
          }
        }
      })
    })
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({
      k,
      showTimer: true,
      showElapsedTimer: false,
      targetTime: null,
      topY: CORRIDOR_Y - 20 - 57
    })
    //
    // Update FPS counter
    //
    k.onUpdate(() => {
      FpsCounter.onUpdate(fpsCounter)
    })
    //
    // Show snowball throwing instructions
    //
    showSnowballInstructions(k)
    //
    // Tooltip for TIME level indicator letters
    //
    const timeLettersCenterX = PLATFORM_SIDE_WIDTH + 90
    const timeLettersCenterY = CORRIDOR_Y - 60
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
    // Tooltip for monster
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => monster.body?.pos?.x ?? 0,
        y: () => monster.body?.pos?.y ?? 0,
        width: MONSTER_TOOLTIP_SIZE,
        height: MONSTER_TOOLTIP_SIZE,
        text: MONSTER_TOOLTIP_TEXT,
        offsetY: MONSTER_TOOLTIP_Y_OFFSET
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
        width: HERO_TOOLTIP_SIZE,
        height: HERO_TOOLTIP_SIZE,
        text: HERO_TOOLTIP_TEXT,
        offsetY: HERO_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // While the buy-help panel is open: lock hero input and flag monster to pause.
    // Poll every frame; restoring controls on the tick after the panel closes is safe
    // because hero input is already suppressed one extra frame at most.
    //
    let wasHelpOpen = false
    k.onUpdate(() => onUpdateHelpLock({ hero, monster, wasHelpOpen: () => wasHelpOpen, setWasHelpOpen: v => { wasHelpOpen = v } }))
  })
}

/**
 * Create instructions text with outline
 * @param {Object} k - Kaplay instance
 * @param {number} centerX - Center X position
 * @param {number} textY - Text Y position
 * @param {string} content - Text content
 * @returns {Object} Text objects
 */
function createInstructionsText(k, centerX, textY, content) {
  const OUTLINE_OFFSET = 2
  //
  // Create 8 outline texts (black)
  //
  const outlineOffsets = [
    [-OUTLINE_OFFSET, 0], [OUTLINE_OFFSET, 0],
    [0, -OUTLINE_OFFSET], [0, OUTLINE_OFFSET],
    [-OUTLINE_OFFSET, -OUTLINE_OFFSET], [OUTLINE_OFFSET, -OUTLINE_OFFSET],
    [-OUTLINE_OFFSET, OUTLINE_OFFSET], [OUTLINE_OFFSET, OUTLINE_OFFSET]
  ]
  
  const outlineTexts = outlineOffsets.map(([dx, dy]) => {
    return k.add([
      k.text(content, {
        size: 24,
        align: "center",
        font: CFG.visual.fonts.regularFull.replace(/'/g, '')
      }),
      k.pos(centerX + dx, textY + dy),
      k.anchor("center"),
      k.color(0, 0, 0),
      k.opacity(0),
      k.z(CFG.visual.zIndex.ui + 9),
      k.fixed()
    ])
  })
  //
  // Create main text (white)
  //
  const mainText = k.add([
    k.text(content, {
      size: 24,
      align: "center",
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX, textY),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 10),
    k.fixed()
  ])
  
  return { mainText, outlineTexts }
}

/**
 * Shows snowball throwing instructions
 * @param {Object} k - Kaplay instance
 */
function showSnowballInstructions(k) {
  //
  // Check progress storage for how many times instructions were shown
  //
  let showCount = get('time.level3SnowballInstructionsCount', 0)
  //
  // Only show instructions first 2 times
  //
  if (showCount >= 2) {
    return
  }
  //
  // Increment show count
  //
  set('time.level3SnowballInstructionsCount', showCount + 1)
  
  const centerX = CFG.visual.screen.width / 2 - 20
  const textY = SNOWBALL_INSTRUCTIONS_TEXT_Y
  const instructionsContent = "use Shift to throw snowballs at monster"
  //
  // Create instructions text with outline
  //
  const { mainText, outlineTexts } = createInstructionsText(k, centerX, textY, instructionsContent)
  //
  // Animation constants
  //
  const INITIAL_DELAY = 1.0
  const FADE_IN_DURATION = 0.5
  const HOLD_DURATION = 4.0
  const FADE_OUT_DURATION = 0.5
  //
  // Animation state
  //
  const inst = {
    k,
    mainText,
    outlineTexts,
    timer: 0,
    phase: 'initial_delay'
  }
  //
  // Update animation
  //
  const updateInterval = k.onUpdate(() => {
    inst.timer += k.dt()
    
    if (inst.phase === 'initial_delay') {
      if (inst.timer >= INITIAL_DELAY) {
        inst.phase = 'fade_in'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_in') {
      const progress = Math.min(1, inst.timer / FADE_IN_DURATION)
      mainText.opacity = progress
      outlineTexts.forEach(text => {
        text.opacity = progress
      })
      
      if (progress >= 1) {
        inst.phase = 'hold'
        inst.timer = 0
      }
    } else if (inst.phase === 'hold') {
      if (inst.timer >= HOLD_DURATION) {
        inst.phase = 'fade_out'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_out') {
      const progress = Math.min(1, inst.timer / FADE_OUT_DURATION)
      mainText.opacity = 1 - progress
      outlineTexts.forEach(text => {
        text.opacity = 1 - progress
      })
      
      if (progress >= 1) {
        updateInterval.cancel()
        mainText.exists() && k.destroy(mainText)
        outlineTexts.forEach(text => {
          text.exists() && k.destroy(text)
        })
      }
    }
  })
}

/**
 * Create sprite for middle wall with rounded right corners
 * @param {number} width - Wall width
 * @param {number} height - Wall height
 * @param {string} colorHex - Hex color string
 * @returns {string} Data URL for sprite
 */
function createMiddleWallSprite(width, height, colorHex) {
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  const radius = CORNER_RADIUS
  //
  // Parse hex color (returns array [r, g, b])
  //
  const [r, g, b] = parseHex(colorHex)
  ctx.fillStyle = `rgb(${r}, ${g}, ${b})`
  //
  // Draw rectangle with rounded top-right and bottom-right corners
  //
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(width - radius, 0)
  ctx.arcTo(width, 0, width, radius, radius)
  ctx.lineTo(width, height - radius)
  ctx.arcTo(width, height, width - radius, height, radius)
  ctx.lineTo(0, height)
  ctx.closePath()
  ctx.fill()
  
  return canvas.toDataURL()
}

/**
 * Create corridor platforms for level 3
 * @param {Object} k - Kaplay instance
 */
function createCorridorPlatforms(k) {
  const platformColor = getColor(k, CFG.visual.colors.platform)
  const platformHex = CFG.visual.colors.platform
  //
  // Create sprite for middle wall with rounded right corners
  //
  const passageStartX = k.width() - PLATFORM_SIDE_WIDTH - PASSAGE_WIDTH
  const middleWallHeight = LOWER_CORRIDOR_Y - (CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT)
  const middleWallSprite = createMiddleWallSprite(passageStartX, middleWallHeight, platformHex)
  loadTime3Sprite(k, 'middle-wall-level3', middleWallSprite)
  //
  // Top fill above the upper corridor (matches middle wall / letterbox)
  //
  k.add([
    k.rect(k.width(), CORRIDOR_Y),
    k.pos(0, 0),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Middle wall between corridors (sprite with rounded right corners)
  //
  k.add([
    k.sprite('middle-wall-level3'),
    k.pos(0, CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT),
    k.anchor('topleft'),
    k.area(),
    k.body({ isStatic: true }),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Bottom fill below the lower corridor (matches middle wall / letterbox)
  //
  k.add([
    k.rect(k.width(), k.height() - (LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT)),
    k.pos(0, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Left wall (covers both corridors)
  //
  k.add([
    k.rect(PLATFORM_SIDE_WIDTH, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT),
    k.pos(0, CORRIDOR_Y),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Right wall (covers both corridors)
  //
  k.add([
    k.rect(PLATFORM_SIDE_WIDTH, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH, CORRIDOR_Y),
    k.area(),
    k.body({ isStatic: true }),
    platformColor,
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
}

/**
 * Create snow particle system
 * @param {Object} k - Kaplay instance
 * @returns {Object} Snow system instance
 */
/**
 * Create snow particles for both corridors
 * @param {Object} k - Kaplay instance
 * @param {Array} sections - Time sections with isReversed property
 * @returns {Object} Snow system instance
 */
function createSnowParticles(k, sections) {
  const particles = []
  const PARTICLE_COUNT = 300
  const MARGIN = 10
  const gameAreaLeft = PLATFORM_SIDE_WIDTH + MARGIN
  const gameAreaRight = k.width() - PLATFORM_SIDE_WIDTH - MARGIN
  const gameAreaWidth = gameAreaRight - gameAreaLeft
  //
  // Define visible areas (exclude clouds, middle platform, and bottom platform)
  //
  const upperCorridorTop = CORRIDOR_Y
  const upperCorridorBottom = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT
  const lowerCorridorTop = LOWER_CORRIDOR_Y
  const lowerCorridorBottom = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT
  //
  // Create particles in two corridors only (not in clouds, middle platform, or bottom platform)
  //
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const size = 1 + Math.random() * 2
    const opacity = 0.3 + Math.random() * 0.4
    //
    // Distribute particles between upper and lower corridors (60% upper, 40% lower)
    //
    const inUpperCorridor = Math.random() < 0.6
    const yPos = inUpperCorridor
      ? upperCorridorTop + Math.random() * (upperCorridorBottom - upperCorridorTop)
      : lowerCorridorTop + Math.random() * (lowerCorridorBottom - lowerCorridorTop)
    //
    // Create particle as a game object
    //
    const particle = k.add([
      k.rect(size, size),
      k.pos(gameAreaLeft + Math.random() * gameAreaWidth, yPos),
      k.color(255, 255, 255),
      k.opacity(opacity),
      //
      // z=22: above the night overlay (15.51) so snow remains visible at night.
      //
      k.z(22),
      k.fixed()
    ])
    
    particles.push({
      obj: particle,
      baseSpeedX: 150 + Math.random() * 100,
      speedY: -30 + Math.random() * 60,
      gameAreaLeft,
      gameAreaRight,
      gameAreaWidth,
      upperCorridorTop,
      upperCorridorBottom,
      lowerCorridorTop,
      lowerCorridorBottom
    })
  }
  
  return {
    k,
    particles,
    sections,
    gameAreaLeft,
    gameAreaRight,
    gameAreaWidth,
    upperCorridorTop,
    upperCorridorBottom,
    lowerCorridorTop,
    lowerCorridorBottom
  }
}

/**
 * Update snow particles
 * @param {Object} inst - Snow system instance
 */
function updateSnowParticles(inst) {
  const { k, particles, sections, gameAreaLeft, gameAreaRight, gameAreaWidth, upperCorridorTop, upperCorridorBottom, lowerCorridorTop, lowerCorridorBottom } = inst
  const dt = k.dt()
  //
  // Update each particle
  //
  particles.forEach(p => {
    //
    // Find which section particle is currently in
    //
    const particleX = p.obj.pos.x
    const particleY = p.obj.pos.y
    const currentSection = sections.find(s => 
      particleX >= s.x && 
      particleX < s.x + s.width &&
      particleY >= s.y &&
      particleY < s.y + s.height
    )
    //
    // Determine snow direction based on section's isReversed property
    //
    const speedX = currentSection && currentSection.isReversed ? -p.baseSpeedX : p.baseSpeedX
    //
    // Move particle with direction based on current section
    //
    p.obj.pos.x += speedX * dt
    p.obj.pos.y += p.speedY * dt
    //
    // Determine which corridor particle is in
    //
    const inUpperCorridor = p.obj.pos.y >= upperCorridorTop && p.obj.pos.y <= upperCorridorBottom
    const inLowerCorridor = p.obj.pos.y >= lowerCorridorTop && p.obj.pos.y <= lowerCorridorBottom
    //
    // Wrap particle within its current section boundaries
    //
    if (currentSection) {
      const sectionLeft = currentSection.x
      const sectionRight = currentSection.x + currentSection.width
      //
      // If particle exits section on right, respawn at left of same section
      //
      if (p.obj.pos.x > sectionRight) {
        p.obj.pos.x = sectionLeft + (p.obj.pos.x - sectionRight)
        p.speedY = -30 + Math.random() * 60
      }
      //
      // If particle exits section on left, respawn at right of same section
      //
      if (p.obj.pos.x < sectionLeft) {
        p.obj.pos.x = sectionRight - (sectionLeft - p.obj.pos.x)
        p.speedY = -30 + Math.random() * 60
      }
    }
    //
    // Wrap vertically within corridor bounds
    //
    if (inUpperCorridor) {
      if (p.obj.pos.y < upperCorridorTop - 10) {
        p.obj.pos.y = upperCorridorBottom + 10
      }
      if (p.obj.pos.y > upperCorridorBottom + 10) {
        p.obj.pos.y = upperCorridorTop - 10
      }
    } else if (inLowerCorridor) {
      if (p.obj.pos.y < lowerCorridorTop - 10) {
        p.obj.pos.y = lowerCorridorBottom + 10
      }
      if (p.obj.pos.y > lowerCorridorBottom + 10) {
        p.obj.pos.y = lowerCorridorTop - 10
      }
    } else {
      //
      // Particle escaped corridor bounds (shouldn't happen), respawn in random corridor
      //
      const respawnInUpper = Math.random() < 0.6
      p.obj.pos.y = respawnInUpper
        ? upperCorridorTop + Math.random() * (upperCorridorBottom - upperCorridorTop)
        : lowerCorridorTop + Math.random() * (lowerCorridorBottom - lowerCorridorTop)
      p.obj.pos.x = gameAreaLeft + Math.random() * gameAreaWidth
    }
  })
}

/**
 * Create time sections with clock backgrounds
 * @param {Object} k - Kaplay instance
 * @returns {Array} Array of section objects
 */
function createTimeSections(k) {
  const sections = []
  const upperCorridorCenterY = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT / 2
  const lowerCorridorCenterY = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT / 2
  //
  // Fixed section configuration for upper corridor (4 sections with fixed inversion pattern)
  //
  const UPPER_SECTION_COUNT = 4
  const upperCorridorWidth = k.width() - PLATFORM_SIDE_WIDTH * 2 - PASSAGE_WIDTH
  const upperSectionWidth = upperCorridorWidth / UPPER_SECTION_COUNT
  //
  // Fixed inversion pattern: false, true, false, true (alternating)
  //
  const upperInversionPattern = [false, true, false, true]
  
  for (let i = 0; i < UPPER_SECTION_COUNT; i++) {
    const sectionStartX = PLATFORM_SIDE_WIDTH + upperSectionWidth * i
    const sectionCenterX = sectionStartX + upperSectionWidth / 2
    const isReversed = upperInversionPattern[i]
    const clockSize = 42 + (i * 3)  // Fixed progression: 42, 45, 48, 51
    const clockGrayLevel = 160 + (i * 15)  // Fixed progression: 160, 175, 190, 205
    const clockYOffset = -20 + (i * 10)  // Fixed progression: -20, -10, 0, 10
    const minutes = 10 + (i * 15)  // Fixed times: 10, 25, 40, 55
    const seconds = i * 15  // Fixed seconds: 0, 15, 30, 45
    
    const clock = k.add([
      k.text(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, {
        size: clockSize,
        align: "center"
      }),
      k.pos(sectionCenterX, upperCorridorCenterY + clockYOffset),
      k.anchor("center"),
      k.color(clockGrayLevel, clockGrayLevel, clockGrayLevel),
      k.opacity(0.7),
      k.z(19),  // High z-index to be visible above background
      k.fixed()
    ])
    
    sections.push({
      x: sectionStartX,
      y: CORRIDOR_Y,
      width: upperSectionWidth,
      height: UPPER_CORRIDOR_HEIGHT,
      centerX: sectionCenterX,
      isReversed,
      clock,
      clockTime: { minutes, seconds },
      corridor: 'upper'
    })
  }
  //
  // Fixed section configuration for lower corridor (5 sections with fixed inversion pattern)
  //
  const LOWER_SECTION_COUNT = 5
  const lowerCorridorWidth = k.width() - PLATFORM_SIDE_WIDTH * 2
  const lowerSectionWidth = lowerCorridorWidth / LOWER_SECTION_COUNT
  //
  // Fixed inversion pattern: true, false, true, false, true (alternating, starting with true)
  //
  const lowerInversionPattern = [true, false, true, false, true]
  
  for (let i = 0; i < LOWER_SECTION_COUNT; i++) {
    const sectionStartX = PLATFORM_SIDE_WIDTH + lowerSectionWidth * i
    const sectionCenterX = sectionStartX + lowerSectionWidth / 2
    const isReversed = lowerInversionPattern[i]
    const clockSize = 44 + (i * 2)  // Fixed progression: 44, 46, 48, 50, 52
    const clockGrayLevel = 150 + (i * 12)  // Fixed progression: 150, 162, 174, 186, 198
    const clockYOffset = -25 + (i * 12)  // Fixed progression: -25, -13, -1, 11, 23
    const minutes = 5 + (i * 12)  // Fixed times: 5, 17, 29, 41, 53
    const seconds = i * 12  // Fixed seconds: 0, 12, 24, 36, 48
    
    const clock = k.add([
      k.text(`${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`, {
        size: clockSize,
        align: "center"
      }),
      k.pos(sectionCenterX, lowerCorridorCenterY + clockYOffset),
      k.anchor("center"),
      k.color(clockGrayLevel, clockGrayLevel, clockGrayLevel),
      k.opacity(0.7),
      k.z(19),  // High z-index to be visible above background
      k.fixed()
    ])
    
    sections.push({
      x: sectionStartX,
      y: LOWER_CORRIDOR_Y,
      width: lowerSectionWidth,
      height: CORRIDOR_HEIGHT,
      centerX: sectionCenterX,
      isReversed,
      clock,
      clockTime: { minutes, seconds },
      corridor: 'lower'
    })
  }
  //
  // Animate clocks
  //
  k.onUpdate(() => {
    sections.forEach(section => {
      //
      // Skip if clock was destroyed
      //
      if (!section.clock || !section.clock.exists || !section.clock.exists()) {
        return
      }
      
      if (section.isReversed) {
        //
        // Decrease time
        //
        section.clockTime.seconds -= k.dt()
        
        if (section.clockTime.seconds < 0) {
          section.clockTime.seconds = 59
          section.clockTime.minutes--
          if (section.clockTime.minutes < 0) {
            section.clockTime.minutes = 59
          }
        }
      } else {
        //
        // Increase time
        //
        section.clockTime.seconds += k.dt()
        
        if (section.clockTime.seconds >= 60) {
          section.clockTime.seconds = 0
          section.clockTime.minutes++
          if (section.clockTime.minutes >= 60) {
            section.clockTime.minutes = 0
          }
        }
      }
      //
      // Update display
      //
      const m = Math.floor(Math.abs(section.clockTime.minutes))
      const s = Math.floor(Math.abs(section.clockTime.seconds))
      section.clock.text = `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
    })
  })
  
  return sections
}

/**
 * Create clock disintegration particle effect
 * @param {Object} k - Kaplay instance
 * @param {Object} clock - Clock text object to disintegrate
 * @param {Object} sound - Sound instance
 * @param {Array} decayHoles - Array to store decay holes
 */
function createClockDisintegrationEffect(k, clock, sound) {
  const PARTICLE_COUNT = 30
  const PARTICLE_SIZE = 3
  const clockPos = clock.pos
  const clockColor = clock.color || k.rgb(180, 180, 180)
  //
  // Play clock destruction sound
  //
  Sound.playClockDestroySound(sound)
  //
  // Create particles at clock position
  //
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    //
    // Random starting position around clock
    //
    const offsetX = k.rand(-20, 20)
    const offsetY = k.rand(-15, 15)
    //
    // Random velocity (explosion outward)
    //
    const angle = k.rand(0, Math.PI * 2)
    const speed = k.rand(100, 300)
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    //
    // Create particle
    //
    const particle = k.add([
      k.rect(PARTICLE_SIZE, PARTICLE_SIZE),
      k.pos(clockPos.x + offsetX, clockPos.y + offsetY),
      k.color(clockColor.r, clockColor.g, clockColor.b),
      k.opacity(1.0),
      k.anchor("center"),
      k.z(19),  // Above everything except UI
      k.fixed()
    ])
    //
    // Store velocity and lifetime
    //
    particle.vx = vx
    particle.vy = vy
    particle.lifetime = 0
    particle.maxLifetime = 1.0  // Particles last 1 second
    //
    // Animate particle
    //
    particle.onUpdate(() => {
      const dt = k.dt()
      particle.lifetime += dt
      //
      // Move particle
      //
      particle.pos.x += particle.vx * dt
      particle.pos.y += particle.vy * dt
      //
      // Apply gravity
      //
      particle.vy += 500 * dt
      //
      // Fade out
      //
      const fadeProgress = particle.lifetime / particle.maxLifetime
      particle.opacity = 1 - fadeProgress
      //
      // Destroy when lifetime is over
      //
      if (particle.lifetime >= particle.maxLifetime) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Create monster that chases the hero
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} sfx - Sound instance for step sounds
 * @returns {Object} Monster instance with returnHome method
 */
function createMonster(k, heroInst, sfx, levelIndicator, heroScoreAtStart) {
  const MONSTER_SPEED = 110  // Even faster movement
  const BODY_SIZE = 60
  const LEG_COUNT = 8
  const SEGMENT_COUNT = 6
  const SEGMENT_LENGTH = 24
  const LEG_WIDTH = 6
  const STEP_HEIGHT = 40  // How high legs lift when stepping
  
  const monsterX = MONSTER_SPAWN_X
  const monsterY = MONSTER_SPAWN_Y
  //
  // Create legs with IK
  //
  const legs = []
  for (let i = 0; i < LEG_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LEG_COUNT
    const restDistance = 60  // Distance from center when at rest
    const bodyEdgeOffset = 10  // Start legs from inside the body (close to center)
    const leg = {
      segments: [],
      targetX: monsterX + Math.cos(angle) * restDistance,
      targetY: monsterY + Math.sin(angle) * restDistance,
      groundTargetX: monsterX + Math.cos(angle) * restDistance,
      groundTargetY: monsterY + Math.sin(angle) * restDistance,
      baseAngle: angle,
      stepPhase: (i / LEG_COUNT),  // Offset so legs step in sequence
      isLifted: false,
      liftProgress: 0,
      lastStepSoundTime: 0  // Track when last sound was played
    }
    //
    // Create segments for this leg starting from body edge
    //
    for (let j = 0; j < SEGMENT_COUNT; j++) {
      leg.segments.push({
        x: monsterX + Math.cos(angle) * (bodyEdgeOffset + j * SEGMENT_LENGTH),
        y: monsterY + Math.sin(angle) * (bodyEdgeOffset + j * SEGMENT_LENGTH)
      })
    }
    
    legs.push(leg)
  }
  //
  // Create body (morphing shape) - use many small overlapping circles
  //
  const bodyCircles = []
  const BODY_CIRCLE_COUNT = 60
  for (let i = 0; i < BODY_CIRCLE_COUNT; i++) {
    const baseRadius = (BODY_SIZE / 4) * (0.3 + Math.random() * 1.2)
    const circle = k.add([
      k.circle(baseRadius),
      k.pos(monsterX, monsterY),
      k.color(40, 40, 45),
      k.opacity(1.0),
      k.z(14),
      k.fixed()
    ])
    bodyCircles.push({
      obj: circle,
      phaseOffset: Math.random() * Math.PI * 2,
      radius: 0.3 + Math.random() * 0.8,
      speed: 0.6 + Math.random() * 0.8,
      baseRadius: baseRadius
    })
  }
  //
  // Create eyes
  //
  const eyes = []
  const EYE_RADIUS = 6
  const PUPIL_RADIUS = 3
  const eyePositions = [
    { x: -12, y: -12 },  // Top-left
    { x: 12, y: -12 },   // Top-right
    { x: -12, y: 12 },   // Bottom-left
    { x: 12, y: 12 }     // Bottom-right
  ]
  
  for (let i = 0; i < 4; i++) {
    const eyePos = eyePositions[i]
    //
    // White eye background
    //
    const eyeWhite = k.add([
      k.circle(EYE_RADIUS),
      k.pos(monsterX + eyePos.x, monsterY + eyePos.y),
      k.color(255, 255, 255),
      k.opacity(1.0),
      k.z(14),
      k.fixed()
    ])
    //
    // Black pupil
    //
    const pupil = k.add([
      k.circle(PUPIL_RADIUS),
      k.pos(monsterX + eyePos.x, monsterY + eyePos.y),
      k.color(0, 0, 0),
      k.opacity(1.0),
      k.z(14),
      k.fixed()
    ])
    
    eyes.push({
      white: eyeWhite,
      pupil: pupil,
      offsetX: eyePos.x,
      offsetY: eyePos.y
    })
  }
  //
  // Glow circles: sit above the night overlay (z=MONSTER_EYE_GLOW_Z) and are
  // invisible during the day. At night their opacity rises so the eyes appear
  // to emit orange light through the darkness.
  //
  const glowCircles = []
  for (let i = 0; i < 4; i++) {
    const eyePos = eyePositions[i]
    const glow = k.add([
      k.circle(MONSTER_EYE_GLOW_RADIUS),
      k.pos(monsterX + eyePos.x, monsterY + eyePos.y),
      k.color(MONSTER_EYE_GLOW_R, MONSTER_EYE_GLOW_G, MONSTER_EYE_GLOW_B),
      k.opacity(0),
      k.z(MONSTER_EYE_GLOW_Z),
      k.fixed()
    ])
    glowCircles.push({ obj: glow, offsetX: eyePos.x, offsetY: eyePos.y })
  }
  //
  // Night pupils: dark circles at z=MONSTER_NIGHT_PUPIL_Z placed on top of the
  // glow circles so the eyes retain a visible pupil during night. They start
  // invisible and fade in together with the glow circles.
  //
  const nightPupils = []
  for (let i = 0; i < 4; i++) {
    const eyePos = eyePositions[i]
    const np = k.add([
      k.circle(PUPIL_RADIUS),
      k.pos(monsterX + eyePos.x, monsterY + eyePos.y),
      k.color(0, 0, 0),
      k.opacity(0),
      k.z(MONSTER_NIGHT_PUPIL_Z),
      k.fixed()
    ])
    nightPupils.push({ obj: np, offsetX: eyePos.x, offsetY: eyePos.y })
  }

  const inst = {
    k,
    x: monsterX,
    y: monsterY,
    startX: monsterX,
    startY: monsterY,
    hero: heroInst,
    sfx,
    speed: MONSTER_SPEED,
    legs,
    bodyCircles,
    eyes,
    glowCircles,
    nightPupils,
    bodySize: BODY_SIZE,
    legWidth: LEG_WIDTH,
    segmentLength: SEGMENT_LENGTH,
    segmentCount: SEGMENT_COUNT,
    stepHeight: STEP_HEIGHT,
    morphTimer: 0,
    stepTimer: 0,
    wobbleX: 0,
    wobbleY: 0,
    isReturningHome: false,
    isFrozen: false,
    helpLocked: false,
    finalePauseChase: false,
    finaleAllowEat: true,
    finaleChaseScale: 1,
    finaleIdleSway: false,
    currentMoveDirectionX: 1,
    currentMoveDirectionY: 1
  }
  //
  // Update monster
  //
  k.onUpdate(() => {
    const dt = k.dt()
    
    let moveDirectionX = 1
    let moveDirectionY = 1
    const heroX = inst.hero.character.pos.x
    const heroY = inst.hero.character.pos.y
    //
    // Check if hero is annihilating - monster stays in place but continues animating
    //
    const isAnnihilating = inst.hero.isAnnihilating
    //
    // Check if monster is frozen (hit by bullet)
    //
    const isFrozen = inst.isFrozen
    //
    // Check if buy-help panel is open — monster freezes while dialog is visible
    //
    const isHelpLocked = inst.helpLocked
    const finalePauseChase = inst.finalePauseChase
    const finaleIdleSway = inst.finaleIdleSway
    const chaseSpeed = inst.speed * (inst.finaleChaseScale ?? 1)
    //
    // Check if monster should return home
    //
    if (inst.isReturningHome) {
      //
      // Move towards start position (no chaotic movement)
      //
      const distanceToStartX = inst.startX - inst.x
      const distanceToStartY = inst.startY - inst.y
      moveDirectionX = distanceToStartX > 0 ? 1 : -1
      moveDirectionY = distanceToStartY > 0 ? 1 : -1
      //
      // Move monster towards start position (straight line, no wobble)
      //
      if (!isAnnihilating && !isFrozen && !isHelpLocked && !finalePauseChase && Math.abs(distanceToStartX) > 10) {
        inst.x += moveDirectionX * chaseSpeed * dt
      }
      if (!isAnnihilating && !isFrozen && !isHelpLocked && !finalePauseChase && Math.abs(distanceToStartY) > 10) {
        inst.y += moveDirectionY * chaseSpeed * dt
      }
      //
      // No wobble when returning home
      //
      inst.wobbleX = 0
      inst.wobbleY = 0
    } else {
      //
      // Normal chase behavior towards hero
      //
      const distanceX = heroX - inst.x
      const distanceY = heroY - inst.y
      moveDirectionX = distanceX > 0 ? 1 : -1
      moveDirectionY = distanceY > 0 ? 1 : -1
      //
      // Move monster towards hero (stop moving if annihilating, frozen, or help panel open)
      //
      if (!isAnnihilating && !isFrozen && !isHelpLocked && !finalePauseChase && Math.abs(distanceX) > 10) {
        inst.x += moveDirectionX * chaseSpeed * dt + Math.sin(inst.morphTimer * 5) * 8 * dt
      }
      if (!isAnnihilating && !isFrozen && !isHelpLocked && !finalePauseChase && Math.abs(distanceY) > 10) {
        inst.y += moveDirectionY * chaseSpeed * dt
      }
    }
    //
    // Store movement direction for leg calculations
    //
    inst.currentMoveDirectionX = moveDirectionX
    inst.currentMoveDirectionY = moveDirectionY
    //
    // Add chaotic wobble to movement (reduced) - only when chasing (not when returning home)
    // Keep wobble during annihilation for natural look; idle sway when paused near anti-hero.
    //
    if (finaleIdleSway && !inst.isReturningHome) {
      inst.wobbleX = Math.sin(inst.morphTimer * 2.4) * 7
      inst.wobbleY = Math.cos(inst.morphTimer * 1.7) * 5
    } else if (!inst.isReturningHome) {
      inst.wobbleX = Math.sin(inst.morphTimer * 3) * 10
      inst.wobbleY = Math.cos(inst.morphTimer * 2.3) * 8
    } else {
      //
      // When returning home, keep slight wobble during annihilation
      //
      if (isAnnihilating) {
        inst.wobbleX = Math.sin(inst.morphTimer * 2) * 5
        inst.wobbleY = Math.cos(inst.morphTimer * 1.5) * 4
      } else {
        inst.wobbleX = 0
        inst.wobbleY = 0
      }
    }
    //
    // Update body morphing - create organic blob-like shape
    //
    inst.morphTimer += dt * 2
    inst.bodyCircles.forEach((bc, i) => {
      const phase = inst.morphTimer * bc.speed + bc.phaseOffset
      const offsetX = Math.cos(phase) * 10 * bc.radius
      const offsetY = Math.sin(phase * 1.3) * 10 * bc.radius
      bc.obj.pos.x = inst.x + offsetX + inst.wobbleX
      bc.obj.pos.y = inst.y + offsetY + inst.wobbleY
      const scale = 0.9 + Math.sin(phase * 2) * 0.1
      bc.obj.radius = bc.baseRadius * scale
    })
    //
    // Update eyes position and make pupils look at hero
    //
    inst.eyes.forEach(eye => {
      const eyeX = inst.x + eye.offsetX + inst.wobbleX
      const eyeY = inst.y + eye.offsetY + inst.wobbleY
      //
      // Update white part position
      //
      eye.white.pos.x = eyeX
      eye.white.pos.y = eyeY
      //
      // Calculate direction to hero for pupil
      //
      const toHeroX = heroX - eyeX
      const toHeroY = heroY - eyeY
      const distToHero = Math.hypot(toHeroX, toHeroY)
      //
      // Move pupil towards hero within eye bounds
      //
      const maxPupilOffset = 3  // Maximum distance pupil can move from center
      if (distToHero > 0) {
        const pupilOffsetX = (toHeroX / distToHero) * maxPupilOffset
        const pupilOffsetY = (toHeroY / distToHero) * maxPupilOffset
        eye.pupil.pos.x = eyeX + pupilOffsetX
        eye.pupil.pos.y = eyeY + pupilOffsetY
      } else {
        eye.pupil.pos.x = eyeX
        eye.pupil.pos.y = eyeY
      }
    })
    //
    // Update step timer
    //
    inst.stepTimer += dt * 1.5
    //
    // Update legs with proper IK and stepping
    //
    inst.legs.forEach((leg, legIndex) => {
      const idleSway = finaleIdleSway && !inst.isReturningHome
      const stepCycle = (inst.stepTimer + leg.stepPhase) % 2
      const restDistance = 60  // Distance from center when at rest
      //
      // Calculate angle relative to movement direction to distribute legs properly
      //
      const legAngleFromCenter = leg.baseAngle
      const movementAngle = inst.currentMoveDirectionX > 0 ? 0 : Math.PI
      const angleDiff = Math.abs(((legAngleFromCenter - movementAngle + Math.PI) % (Math.PI * 2)) - Math.PI)
      //
      // Distribute legs: front 1/3 ahead of body, middle 1/3 beside, back 1/3 behind
      //
      let forwardBias
      if (angleDiff < Math.PI / 3) {
        //
        // Front legs - go ahead of body (reduced distance)
        //
        forwardBias = inst.currentMoveDirectionX * 80
      } else if (angleDiff > (2 * Math.PI) / 3) {
        //
        // Back legs - step forward but stay behind front legs
        //
        forwardBias = inst.currentMoveDirectionX * 40
      } else {
        //
        // Side legs - stay well ahead
        //
        forwardBias = inst.currentMoveDirectionX * 60
      }
      const legDistance = restDistance
      //
      // Calculate ideal ground position for this leg
      //
      const idealGroundX = inst.x + Math.cos(leg.baseAngle) * legDistance + forwardBias + inst.wobbleX
      const idealGroundY = inst.y + Math.sin(leg.baseAngle) * legDistance + inst.wobbleY
      //
      // Check if leg needs to step (too far from ideal position)
      //
      const distToIdeal = Math.hypot(leg.groundTargetX - idealGroundX, leg.groundTargetY - idealGroundY)
      const stepThreshold = idleSway ? 18 : 50
      const stepLiftWindow = idleSway ? 0.55 : 0.4
      
      if (stepCycle < stepLiftWindow && distToIdeal > stepThreshold) {
        //
        // Lift leg and move to new position
        //
        leg.isLifted = true
        leg.liftProgress = stepCycle / stepLiftWindow
        //
        // Interpolate ground target
        //
        leg.groundTargetX = leg.groundTargetX + (idealGroundX - leg.groundTargetX) * 0.3
        leg.groundTargetY = leg.groundTargetY + (idealGroundY - leg.groundTargetY) * 0.3
      } else if (stepCycle >= stepLiftWindow) {
        leg.isLifted = false
        leg.liftProgress = 0
      }
      //
      // Calculate target with lift
      //
      const lift = leg.isLifted ? Math.sin(leg.liftProgress * Math.PI) * inst.stepHeight : 0
      leg.targetX = leg.groundTargetX
      leg.targetY = leg.groundTargetY - lift
      //
      // FABRIK IK: Forward and backward reaching
      //
      // Forward pass: start from end, reach backwards to base
      //
      let endX = leg.targetX
      let endY = leg.targetY
      
      for (let i = inst.segmentCount - 1; i >= 0; i--) {
        const segment = leg.segments[i]
        
        if (i === 0) {
          //
          // First segment attaches close to body center
          //
          const bodyAttachOffset = 10  // Small offset from center
          const bodyEdgeX = inst.x + Math.cos(leg.baseAngle) * bodyAttachOffset
          const bodyEdgeY = inst.y + Math.sin(leg.baseAngle) * bodyAttachOffset
          const dx = segment.x - bodyEdgeX
          const dy = segment.y - bodyEdgeY
          const dist = Math.hypot(dx, dy)
          if (dist > 0) {
            segment.x = bodyEdgeX
            segment.y = bodyEdgeY
          }
        } else {
          //
          // Pull segment towards end target
          //
          const dx = segment.x - endX
          const dy = segment.y - endY
          const dist = Math.hypot(dx, dy)
          if (dist > 0) {
            segment.x = endX + (dx / dist) * inst.segmentLength
            segment.y = endY + (dy / dist) * inst.segmentLength
          }
          endX = segment.x
          endY = segment.y
        }
      }
      //
      // Backward pass: start from base (close to body center), push forward to end
      //
      const bodyAttachOffset = 10  // Small offset from center
      const bodyEdgeX = inst.x + Math.cos(leg.baseAngle) * bodyAttachOffset + inst.wobbleX
      const bodyEdgeY = inst.y + Math.sin(leg.baseAngle) * bodyAttachOffset + inst.wobbleY
      
      leg.segments[0].x = bodyEdgeX
      leg.segments[0].y = bodyEdgeY
      
      for (let i = 1; i < inst.segmentCount; i++) {
        const prevSegment = leg.segments[i - 1]
        const segment = leg.segments[i]
        
        const dx = segment.x - prevSegment.x
        const dy = segment.y - prevSegment.y
        const dist = Math.hypot(dx, dy)
        
        if (dist > 0) {
          segment.x = prevSegment.x + (dx / dist) * inst.segmentLength
          segment.y = prevSegment.y + (dy / dist) * inst.segmentLength
        }
      }
    })
    //
    // Fade body and glow eyes based on day/night darkness.
    //
    updateMonsterNight(inst)
  })
  //
  // Draw legs with pads at the end (using game object with z-index)
  //
  k.add([
    {
      draw() {
        const legColor = k.rgb(40, 40, 45)
        inst.legs.forEach(leg => {
      leg.segments.forEach((segment, i) => {
        //
        // Draw circle at each joint to fill gaps between line segments
        //
        k.drawCircle({
          pos: k.vec2(segment.x, segment.y),
          radius: inst.legWidth / 2,
          color: legColor
        })
        if (i < leg.segments.length - 1) {
          const nextSegment = leg.segments[i + 1]
          k.drawLine({
            p1: k.vec2(segment.x, segment.y),
            p2: k.vec2(nextSegment.x, nextSegment.y),
            width: inst.legWidth,
            color: legColor
          })
        }
      })
      //
      // Draw pad at the end of each leg
      //
      const lastSegment = leg.segments[leg.segments.length - 1]
      k.drawCircle({
        pos: k.vec2(lastSegment.x, lastSegment.y),
        radius: inst.legWidth * 1.5,
        color: legColor
      })
        })
      }
    },
    k.z(13)  // Below body circles (14) so legs appear behind body
  ])
  
  return inst
}

/**
 * Setup control inversion based on current section
 * @param {Object} heroInst - Hero instance
 * @param {Array} sections - Array of section objects
 */
function setupControlInversion(heroInst, sections) {
  const k = heroInst.k
  //
  // Track progress separately for each corridor to prevent control jitter
  // Upper corridor: sections 0-3 (left to right)
  // Lower corridor: sections 4-8 (right to left)
  //
  let currentSection = null
  let maxUpperIndex = -1
  let minLowerIndex = 9
  
  k.onUpdate(() => {
    const heroX = heroInst.character.pos.x
    const heroY = heroInst.character.pos.y
    //
    // Find which section hero is in (check both x and y coordinates)
    //
    const newSection = sections.find(s => 
      heroX >= s.x && 
      heroX < s.x + s.width &&
      heroY >= s.y &&
      heroY < s.y + s.height
    )
    
    if (!newSection) return
    
    const newIndex = sections.indexOf(newSection)
    const isUpperCorridor = newSection.corridor === 'upper'
    const isLowerCorridor = newSection.corridor === 'lower'
    
    //
    // Check if hero moved into a new section
    //
    if (newSection !== currentSection) {
      let shouldUpdateControls = false
      
      if (isUpperCorridor) {
        //
        // Upper corridor: progress is left to right (indices increase 0→3)
        //
        if (newIndex > maxUpperIndex) {
          maxUpperIndex = newIndex
          shouldUpdateControls = true
        }
      } else if (isLowerCorridor) {
        //
        // Lower corridor: progress is right to left (indices decrease 8→4)
        //
        if (newIndex < minLowerIndex) {
          minLowerIndex = newIndex
          shouldUpdateControls = true
        }
      }
      
      //
      // Only update controls if progressing forward in current corridor
      //
      if (shouldUpdateControls) {
        heroInst.controlsReversed = newSection.isReversed
      }
      
      currentSection = newSection
    }
  })
}

/**
 * Creates obstacle spikes (digit "1") in clusters throughout corridors
 * Spikes are placed in the CENTER of each section, not at boundaries
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance for collision
 * @param {Object} sound - Sound instance for effects
 * @param {Array} sections - Time sections to place spikes in their centers
 */
function createObstacleSpikes(k, hero, sound, levelIndicator, sections, heroScoreAtStart) {
  //
  // Spike Y positions
  //
  const upperCorridorY = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT - 14  // On middle platform
  const lowerCorridorY = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT - 15  // Lowered to sit on floor
  //
  // Place spikes in CENTER of alternating sections (avoid section boundaries)
  // Upper corridor: sections 0 and 2 (indices 0, 2)
  // Lower corridor: sections 2 and 4 (indices 6, 8 in combined array)
  //
  const spikePositions = [
    //
    // Upper corridor - section 0 (first section, center)
    //
    { sectionIndex: 0, count: 2 },
    //
    // Upper corridor - section 2 (third section, center)
    //
    { sectionIndex: 2, count: 3 },
    //
    // Lower corridor - section 2 (third section, center) - index 6 in sections array
    //
    { sectionIndex: 6, count: 2 },
    //
    // Lower corridor - section 4 (fifth section, center) - index 8 in sections array
    //
    { sectionIndex: 8, count: 3 }
  ]
  
  const clusters = []
  
  spikePositions.forEach(pos => {
    const section = sections[pos.sectionIndex]
    if (!section) return
    
    const clusterWidth = 30 * (pos.count - 1)  // Width based on spike count
    const clusterCenterX = section.centerX
    const clusterStartX = clusterCenterX - clusterWidth / 2
    const clusterEndX = clusterCenterX + clusterWidth / 2
    const clusterY = section.corridor === 'upper' ? upperCorridorY : lowerCorridorY
    
    clusters.push({
      startX: clusterStartX,
      endX: clusterEndX,
      y: clusterY,
      count: pos.count
    })
  })
  //
  // Create each cluster
  //
  clusters.forEach(cluster => {
    OneSpikes.create({
      k,
      startX: cluster.startX,
      endX: cluster.endX,
      y: cluster.y,
      hero,
      currentLevel: 'level-time.3',
      digitCount: cluster.count,
      fakeDigitCount: 0,  // No fake spikes - all are deadly
      sfx: sound,
      levelIndicator,
      //
      // Restore heroScore so snowballs spent this run are refunded on spike death.
      //
      onBeforeRestart: () => set('heroScore', heroScoreAtStart)
    })
    //
    // Create snow mound sprite at the base of each spike cluster using toCanvas()
    //
    const clusterCenterX = (cluster.startX + cluster.endX) / 2
    const clusterWidth = (cluster.endX - cluster.startX) + 40  // Extra width around spikes
    const moundHeight = 18  // Taller snow mound at base
    
    const moundDataURL = toCanvas({ width: clusterWidth + 20, height: moundHeight + 10, pixelRatio: 1 }, (ctx) => {
      ctx.translate((clusterWidth + 20) / 2, moundHeight + 10)
      
      const points = []
      const steps = 20
      
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const x = (t - 0.5) * clusterWidth
        const y = -moundHeight * (1 - Math.pow(2 * t - 1, 4))
        points.push({ x, y })
      }
      
      //
      // Draw mound
      //
      ctx.fillStyle = 'rgb(245, 245, 255)'
      ctx.globalAlpha = 0.95
      ctx.beginPath()
      points.forEach((p, i) => {
        if (i === 0) {
          ctx.moveTo(p.x, p.y)
        } else {
          ctx.lineTo(p.x, p.y)
        }
      })
      ctx.lineTo(clusterWidth / 2, 0)
      ctx.lineTo(-clusterWidth / 2, 0)
      ctx.closePath()
      ctx.fill()
      
      //
      // Add highlight
      //
      const highlightRadius = clusterWidth * 0.08
      const highlightY = -moundHeight * 0.5
      
      if (Math.abs(highlightY) - highlightRadius > 0) {
        ctx.fillStyle = 'rgb(255, 255, 255)'
        ctx.globalAlpha = 0.7
        ctx.beginPath()
        ctx.arc(0, highlightY, highlightRadius, 0, Math.PI * 2)
        ctx.fill()
      }
    })
    
    loadTime3Sprite(k, `spike-mound-${cluster.startX}-${cluster.y}`, moundDataURL)
    k.add([
      k.sprite(`spike-mound-${cluster.startX}-${cluster.y}`),
      k.pos(clusterCenterX, cluster.y + 10),
      k.anchor('center'),
      k.z(9)  // Behind spikes (10) and snow drifts (12)
    ])
  })
}

/**
 * Creates clouds at the very top of upper corridor using toCanvas() for performance
 * @param {Object} k - Kaplay instance
 */
function createCloudsAtTop(k) {
  //
  // Cloud parameters (positioned above upper corridor)
  //
  const cloudTopY = CORRIDOR_Y  // Just inside corridor top
  const cloudDenseLayerY = CORRIDOR_Y + 30  // Dense layer inside corridor
  const cloudSparseLayerStartY = CORRIDOR_Y + 50  // Start of sparse layer
  const cloudSparseLayerEndY = CORRIDOR_Y + 80  // End of sparse layer
  const baseCloudColor = { r: 250, g: 250, b: 255 }  // White with slight blue tint for clouds
  
  //
  // Create multiple clouds spread horizontally across the screen
  //
  const screenWidth = k.width()
  const cloudStartX = PLATFORM_SIDE_WIDTH + 60
  const cloudEndX = screenWidth - PLATFORM_SIDE_WIDTH - 70
  const cloudCoverageWidth = cloudEndX - cloudStartX
  
  const denseCloudCount = 24
  const denseCloudSpacing = cloudCoverageWidth / (denseCloudCount - 1)
  const sparseCloudCount = 8
  const sparseCloudSpacing = cloudCoverageWidth / (sparseCloudCount - 1)
  
  //
  // Cloud types configuration
  //
  const cloudTypes = [
    {
      mainSize: 50,
      puffs: [
        { radius: 0.7, offsetX: -0.8, offsetY: -0.05 },
        { radius: 0.75, offsetX: -0.4, offsetY: -0.1 },
        { radius: 0.65, offsetX: 0.4, offsetY: -0.1 },
        { radius: 0.7, offsetX: 0.8, offsetY: -0.05 },
        { radius: 0.6, offsetX: -0.2, offsetY: 0.15 },
        { radius: 0.6, offsetX: 0.2, offsetY: 0.15 }
      ],
      opacity: 0.6
    },
    {
      mainSize: 42,
      puffs: [
        { radius: 0.8, offsetX: -0.7, offsetY: 0 },
        { radius: 0.85, offsetX: -0.3, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.3, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.7, offsetY: 0 },
        { radius: 0.7, offsetX: 0, offsetY: 0.12 }
      ],
      opacity: 0.55
    },
    {
      mainSize: 35,
      puffs: [
        { radius: 0.75, offsetX: -0.6, offsetY: 0 },
        { radius: 0.8, offsetX: -0.2, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.2, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.6, offsetY: 0 }
      ],
      opacity: 0.5
    },
    {
      mainSize: 55,
      puffs: [
        { radius: 0.65, offsetX: -1.0, offsetY: 0 },
        { radius: 0.7, offsetX: -0.6, offsetY: -0.1 },
        { radius: 0.75, offsetX: -0.2, offsetY: -0.12 },
        { radius: 0.75, offsetX: 0.2, offsetY: -0.12 },
        { radius: 0.7, offsetX: 0.6, offsetY: -0.1 },
        { radius: 0.65, offsetX: 1.0, offsetY: 0 },
        { radius: 0.6, offsetX: 0, offsetY: 0.15 }
      ],
      opacity: 0.65
    }
  ]
  
  //
  // Generate cloud configurations
  //
  const cloudConfigs = []
  
  for (let i = 0; i < denseCloudCount; i++) {
    const baseX = cloudStartX + denseCloudSpacing * i
    const randomOffset = (Math.random() - 0.5) * (denseCloudSpacing * 0.6)
    const x = baseX + randomOffset
    const typeIndex = i % cloudTypes.length
    const cloudType = cloudTypes[typeIndex]
    const sizeVariation = 1.0 + Math.random() * 1.3
    const mainSize = cloudType.mainSize * sizeVariation
    const rowsPerLayer = 2
    const rowIndex = Math.floor((i % denseCloudCount) / (denseCloudCount / rowsPerLayer))
    const rowYOffset = rowIndex * 8
    const yVariation = (Math.random() - 0.5) * 3
    const cloudY = cloudDenseLayerY + rowYOffset + yVariation
    
    cloudConfigs.push({
      x: x,
      y: cloudY,
      mainSize: mainSize,
      puffs: cloudType.puffs,
      opacity: cloudType.opacity * (0.9 + Math.random() * 0.2)
    })
  }
  
  for (let i = 0; i < sparseCloudCount; i++) {
    const baseX = cloudStartX + sparseCloudSpacing * i
    const randomOffset = (Math.random() - 0.5) * 40
    const x = baseX + randomOffset
    const typeIndex = (i + denseCloudCount) % cloudTypes.length
    const cloudType = cloudTypes[typeIndex]
    const sizeVariation = 0.9 + Math.random() * 0.2
    const mainSize = cloudType.mainSize * sizeVariation
    const sparseYRange = cloudSparseLayerEndY - cloudSparseLayerStartY
    const yDistribution = Math.random() * Math.random()
    const cloudY = cloudSparseLayerStartY + yDistribution * sparseYRange
    
    cloudConfigs.push({
      x: x,
      y: cloudY,
      mainSize: mainSize,
      puffs: cloudType.puffs,
      opacity: cloudType.opacity * (0.9 + Math.random() * 0.2)
    })
  }
  
  //
  // Render all clouds to a single sprite using toCanvas()
  // Canvas height increased to prevent clipping
  //
  const cloudsDataURL = toCanvas({ width: screenWidth, height: 150, pixelRatio: 1 }, (ctx) => {
    cloudConfigs.forEach((cloudConfig) => {
      const canvasX = cloudConfig.x
      const canvasY = cloudConfig.y - cloudTopY  // Relative to top of canvas
      const mainSize = cloudConfig.mainSize
      
      ctx.globalAlpha = cloudConfig.opacity
      ctx.fillStyle = `rgb(${baseCloudColor.r}, ${baseCloudColor.g}, ${baseCloudColor.b})`
      
      //
      // Draw main cloud circle
      //
      ctx.beginPath()
      ctx.arc(canvasX, canvasY, mainSize, 0, Math.PI * 2)
      ctx.fill()
      
      //
      // Draw all puffs
      //
      cloudConfig.puffs.forEach((puff) => {
        ctx.beginPath()
        ctx.arc(
          canvasX + puff.offsetX * mainSize,
          canvasY + puff.offsetY * mainSize,
          mainSize * puff.radius,
          0,
          Math.PI * 2
        )
        ctx.fill()
      })
    })
  })
  
  //
  // Load sprite and add to scene
  //
  loadTime3Sprite(k, 'clouds-level3', cloudsDataURL)
  k.add([
    k.sprite('clouds-level3'),
    k.pos(0, cloudTopY),
    k.z(16),
    k.anchor('topleft')
  ])
}

/**
 * Creates snow drifts on corridor floors using toCanvas() for performance
 * @param {Object} k - Kaplay instance
 */
function createSnowDrifts(k) {
  //
  // Snow drift configurations (x, width, height, corridor)
  //
  const upperFloorY = CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT + 2
  const lowerFloorY = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT + 2
  const passageStartX = k.width() - PLATFORM_SIDE_WIDTH - PASSAGE_WIDTH
  const passageEndX = k.width() - PLATFORM_SIDE_WIDTH
  
  //
  // Generate continuous snow drifts data
  //
  const driftsBack = []  // z=12, behind hero
  const driftsFront = []  // z=25, in front of hero
  
  const upperCorridorStart = PLATFORM_SIDE_WIDTH + 100
  const upperCorridorEnd = passageStartX - 80
  
  for (let x = upperCorridorStart; x < upperCorridorEnd; x += 20 + Math.random() * 15) {
    //
    // Clamp width so the drift never extends past the corridor's right boundary.
    //
    const width = Math.min(60 + Math.random() * 120, passageStartX - x)
    const height = 8 + Math.random() * 15
    const zIndex = Math.random() > 0.5 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: upperFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  const lowerCorridorStart1 = PLATFORM_SIDE_WIDTH + 100
  const lowerCorridorEnd1 = passageStartX
  
  for (let x = lowerCorridorStart1; x < lowerCorridorEnd1; x += 20 + Math.random() * 15) {
    //
    // Clamp width so the drift stays within the left corridor segment.
    //
    const width = Math.min(60 + Math.random() * 120, passageStartX - x)
    const height = 8 + Math.random() * 15
    const zIndex = Math.random() > 0.5 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: lowerFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  const lowerCorridorStart2 = passageEndX
  const lowerCorridorEnd2 = k.width() - PLATFORM_SIDE_WIDTH
  
  for (let x = lowerCorridorStart2; x < lowerCorridorEnd2; x += 20 + Math.random() * 15) {
    const width = 60 + Math.random() * 120
    const height = 8 + Math.random() * 15
    const zIndex = Math.random() > 0.5 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: lowerFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  //
  // Add extra smaller drifts
  //
  for (let x = upperCorridorStart; x < upperCorridorEnd; x += 15 + Math.random() * 12) {
    //
    // Clamp width so small drifts also stay within the corridor right boundary.
    //
    const width = Math.min(40 + Math.random() * 70, passageStartX - x)
    const height = 5 + Math.random() * 8
    const zIndex = Math.random() > 0.3 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: upperFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  for (let x = lowerCorridorStart1; x < lowerCorridorEnd1; x += 15 + Math.random() * 12) {
    //
    // Clamp width so small drifts also stay within the left lower corridor segment.
    //
    const width = Math.min(40 + Math.random() * 70, passageStartX - x)
    const height = 5 + Math.random() * 8
    const zIndex = Math.random() > 0.3 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: lowerFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  for (let x = lowerCorridorStart2; x < lowerCorridorEnd2; x += 15 + Math.random() * 12) {
    const width = 40 + Math.random() * 70
    const height = 5 + Math.random() * 8
    const zIndex = Math.random() > 0.3 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    
    const drift = { x, width, height, y: lowerFloorY, shapeType, skew }
    if (zIndex === 12) {
      driftsBack.push(drift)
    } else {
      driftsFront.push(drift)
    }
  }
  
  //
  // Helper function to draw drift to canvas
  //
  const drawDriftToCanvas = (ctx, drift, isFront) => {
    const baseOpacity = isFront ? 0.7 : 0.95
    const shadowOpacity = isFront ? 0.5 : 0.7
    const highlightOpacity = isFront ? 0.6 : 0.85
    
    ctx.save()
    ctx.translate(drift.x, drift.y)
    
    //
    // Draw main snow mound
    //
    ctx.globalAlpha = baseOpacity
    ctx.fillStyle = 'rgb(240, 240, 250)'
    ctx.beginPath()
    
    const steps = 20
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
      let y
      
      if (drift.shapeType === 0) {
        y = -drift.height * (1 - Math.pow(2 * t - 1, 2))
      } else if (drift.shapeType === 1) {
        y = -drift.height * (1 - Math.pow(Math.abs(2 * t - 1), 1.5))
      } else {
        y = -drift.height * (1 - Math.pow(2 * t - 1, 4))
      }
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.lineTo(drift.width / 2, 0)
    ctx.lineTo(-drift.width / 2, 0)
    ctx.closePath()
    ctx.fill()
    
    //
    // Draw shadow layer
    //
    ctx.globalAlpha = shadowOpacity
    ctx.fillStyle = 'rgb(200, 200, 220)'
    ctx.beginPath()
    
    for (let i = 0; i <= steps; i++) {
      const t = i / steps
      const x = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
      const y = -drift.height * 0.3 * (1 - Math.pow(2 * t - 1, 2))
      
      if (i === 0) {
        ctx.moveTo(x, y)
      } else {
        ctx.lineTo(x, y)
      }
    }
    
    ctx.lineTo(drift.width / 2, 0)
    ctx.lineTo(-drift.width / 2, 0)
    ctx.closePath()
    ctx.fill()
    
    //
    // Draw highlight
    //
    const highlightOffset = drift.skew * drift.width * 0.2
    const highlightRadius = drift.width * 0.15
    const highlightY = -drift.height * 0.7
    
    if (Math.abs(highlightY) - highlightRadius > 0) {
      ctx.globalAlpha = highlightOpacity
      ctx.fillStyle = 'rgb(255, 255, 255)'
      ctx.beginPath()
      ctx.arc(highlightOffset, highlightY, highlightRadius, 0, Math.PI * 2)
      ctx.fill()
    }
    
    ctx.restore()
  }
  
  //
  // Render back snow layer to sprite
  //
  const snowBackDataURL = toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
    driftsBack.forEach(drift => drawDriftToCanvas(ctx, drift, false))
  })
  
  //
  // Render front snow layer to sprite
  //
  const snowFrontDataURL = toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
    driftsFront.forEach(drift => drawDriftToCanvas(ctx, drift, true))
  })
  
  //
  // Load and add sprites
  //
  loadTime3Sprite(k, 'snow-back-level3', snowBackDataURL)
  loadTime3Sprite(k, 'snow-front-level3', snowFrontDataURL)
  
  k.add([
    k.sprite('snow-back-level3'),
    k.pos(0, 0),
    k.z(12),  // Behind decay bricks (z=20) but above platforms (z=15)
    k.anchor('topleft')
  ])
  
  k.add([
    k.sprite('snow-front-level3'),
    k.pos(0, 0),
    k.z(13),  // Behind decay bricks (z=20) but above platforms (z=15)
    k.anchor('topleft')
  ])
}

/**
 * Flashes the life image to indicate life count increase
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator instance
 * @param {Object} originalColor - Original color
 * @param {number} count - Flash count
 */
function flashLifeImageLevel3(k, levelIndicator, originalColor, count) {
  if (!levelIndicator || !levelIndicator.lifeImage || !levelIndicator.lifeImage.sprite || !levelIndicator.lifeImage.sprite.exists()) {
    return
  }
  if (count >= 20) {
    levelIndicator.lifeImage.sprite.color = originalColor
    levelIndicator.lifeImage.sprite.opacity = 1.0
    return
  }
  //
  // Flash entire image with color tint and opacity change
  //
  if (count % 2 === 0) {
    //
    // Red tint with full opacity
    //
    levelIndicator.lifeImage.sprite.color = k.rgb(255, 100, 100)
    levelIndicator.lifeImage.sprite.opacity = 1.0
  } else {
    //
    // White tint with reduced opacity
    //
    levelIndicator.lifeImage.sprite.color = k.rgb(255, 255, 255)
    levelIndicator.lifeImage.sprite.opacity = 0.5
  }
  k.wait(0.05, () => flashLifeImageLevel3(k, levelIndicator, originalColor, count + 1))
}
function createLifeScoreParticlesLevel3(k, levelIndicator) {
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


/**
 * Creates a rounded corner sprite using canvas
 * @param {number} radius - Corner radius
 * @param {string} backgroundColor - Background color as hex string
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
 * Creates ground stripes on corridor floors
 * @param {Object} k - Kaplay instance
 */
function createGroundStripe(k) {
  const [stripeR, stripeG, stripeB] = parseHex(CFG.visual.colors.groundStripe)
  const groundColor = k.rgb(stripeR, stripeG, stripeB)
  const GROUND_STRIPE_HEIGHT = 5
  const gameAreaWidth = k.width() - PLATFORM_SIDE_WIDTH * 2
  //
  // Lower corridor ground stripe
  //
  const lowerGroundY = LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT - 4
  k.add([
    k.rect(gameAreaWidth, GROUND_STRIPE_HEIGHT),
    k.pos(PLATFORM_SIDE_WIDTH, lowerGroundY),
    k.color(groundColor),
    k.z(16)
  ])
}

/**
 * Creates rounded corners for corridors
 * @param {Object} k - Kaplay instance
 */
function createRoundedCorners(k) {
  const radius = CORNER_RADIUS
  const cornerColor = CFG.visual.colors.platform
  const cornerDataURL = createRoundedCornerSprite(radius, cornerColor)
  loadTime3Sprite(k, 'corner-sprite-level3', cornerDataURL)
  //
  // Bottom-left corner (where monster starts, lower part)
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, CORRIDOR_Y + UPPER_CORRIDOR_HEIGHT + CORNER_RADIUS),
    k.rotate(270),
    k.z(30),  // High z-index to be visible above snow
    k.anchor('topleft')
  ])
  //
  // Lower corridor corners (only left side)
  // Top-left corner
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, LOWER_CORRIDOR_Y - CORNER_RADIUS),
    k.z(30),  // High z-index to be visible above snow
    k.anchor('topleft')
  ])
  //
  // Bottom-left corner
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT + CORNER_RADIUS),
    k.rotate(270),
    k.z(30),  // High z-index to be visible above snow
    k.anchor('topleft')
  ])
  //
  // Bottom-right corner (only full right wall)
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH + CORNER_RADIUS, LOWER_CORRIDOR_Y + CORRIDOR_HEIGHT + CORNER_RADIUS),
    k.rotate(180),
    k.z(30),  // High z-index to be visible above snow
    k.anchor('topleft')
  ])
  //
  // Top-left corner of upper corridor (left wall meets corridor ceiling)
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(PLATFORM_SIDE_WIDTH - CORNER_RADIUS, CORRIDOR_Y - CORNER_RADIUS),
    k.z(30),
    k.anchor('topleft')
  ])
  //
  // Top-right corner of upper corridor (right wall meets corridor ceiling)
  //
  k.add([
    k.sprite('corner-sprite-level3'),
    k.pos(k.width() - PLATFORM_SIDE_WIDTH + CORNER_RADIUS, CORRIDOR_Y - CORNER_RADIUS),
    k.rotate(90),
    k.z(30),
    k.anchor('topleft')
  ])
}
/**
 * Setup hero shooting system
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {Object} monster - Monster instance
 * @param {Object} levelIndicator - Level indicator instance
 */
function setupHeroShooting(k, hero, monster, levelIndicator) {
  //
  // Handle shooting with both Shift keys
  //
  const shootKeys = ['shift', 'ShiftLeft', 'ShiftRight']
  
  shootKeys.forEach(key => {
    k.onKeyPress(key, () => {
      //
      // Check if hero has bullets (heroScore > 0)
      //
      const currentScore = get('heroScore', 0)
      
      if (currentScore > 0 && hero.character && hero.character.exists()) {
        //
        // Get hero facing direction from flipX
        //
        const heroFacingRight = !hero.character.flipX
        //
        // Reduce hero score by 1
        //
        const newScore = currentScore - 1
        set('heroScore', newScore)
        //
        // Update score display
        //
        if (levelIndicator && levelIndicator.updateHeroScore) {
          levelIndicator.updateHeroScore(newScore)
        }
        //
        // Create bullet
        //
        createBullet(k, hero, heroFacingRight, monster)
      } else if (currentScore === 0) {
        //
        // Play empty click sound if no bullets
        //
        hero.sfx && Sound.playEmptyClickSound(hero.sfx)
      }
    })
  })
}
/**
 * Create a bullet
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 * @param {boolean} facingRight - Direction hero is facing
 * @param {Object} monster - Monster instance
 */
function createBullet(k, hero, facingRight, monster) {
  const heroPos = hero.character.pos
  const direction = facingRight ? 1 : -1
  //
  // Spawn at hero's hand: offset from center to left/right arm
  //
  const HAND_OFFSET_X = 24
  const HAND_OFFSET_Y = -3
  const bulletX = heroPos.x + direction * HAND_OFFSET_X
  const bulletY = heroPos.y + HAND_OFFSET_Y
  //
  // Get hero color
  //
  const heroColor = getColor(k, CFG.visual.colors.hero.body)
  //
  // Play shoot sound
  //
  Sound.playBulletShootSound(hero.sfx)
  //
  // Create bullet as drawable object (snowball-like)
  //
  const bullet = k.add([
    k.pos(bulletX, bulletY),
    k.z(21),
    k.anchor('center'),
    'bullet',
    {
      draw() {
        //
        // Draw outline (black circle)
        //
        k.drawCircle({
          pos: k.vec2(0, 0),
          radius: BULLET_RADIUS + BULLET_OUTLINE_WIDTH,
          color: k.rgb(0, 0, 0)
        })
        //
        // Draw main bullet (hero color)
        //
        k.drawCircle({
          pos: k.vec2(0, 0),
          radius: BULLET_RADIUS,
          color: heroColor
        })
      }
    }
  ])
  //
  // Move bullet
  //
  bullet.onUpdate(() => {
    bullet.pos.x += BULLET_SPEED * direction * k.dt()
    //
    // Destroy if out of bounds
    //
    if (bullet.pos.x < 0 || bullet.pos.x > k.width()) {
      k.destroy(bullet)
    }
  })
  //
  // Check collision with monster
  //
  bullet.onUpdate(() => {
    if (!monster) return
    
    const distX = Math.abs(bullet.pos.x - monster.x)
    const distY = Math.abs(bullet.pos.y - monster.y)
    
    if (distX < 40 && distY < 40) {
      //
      // Hit monster
      //
      onMonsterHit(k, monster, hero.sfx)
      k.destroy(bullet)
    }
  })
}
/**
 * Handle monster being hit by bullet
 * @param {Object} k - Kaplay instance
 * @param {Object} monster - Monster instance
 * @param {Object} sfx - Sound instance
 */
function onMonsterHit(k, monster, sfx) {
  //
  // Add freeze duration (accumulate)
  //
  if (!monster.freezeTimeRemaining) {
    monster.freezeTimeRemaining = 0
  }
  monster.freezeTimeRemaining += MONSTER_FREEZE_DURATION
  //
  // Mark as frozen if not already
  //
  if (!monster.isFrozen) {
    monster.isFrozen = true
    //
    // Start countdown timer
    //
    startFreezeCountdown(k, monster)
  }
  //
  // Play hit sound
  //
  sfx && Sound.playBulletHitSound(sfx)
  //
  // Create hit particles
  //
  createMonsterHitParticles(k, monster)
  //
  // Flash monster
  //
  flashMonster(k, monster, 0)
}
/**
 * Start freeze countdown for monster
 * @param {Object} k - Kaplay instance
 * @param {Object} monster - Monster instance
 */
function startFreezeCountdown(k, monster) {
  //
  // Decrease freeze time each frame
  //
  const unfreezeLoop = k.onUpdate(() => {
    if (!monster || !monster.freezeTimeRemaining) {
      unfreezeLoop.cancel()
      return
    }
    
    monster.freezeTimeRemaining -= k.dt()
    //
    // Unfreeze when time runs out
    //
    if (monster.freezeTimeRemaining <= 0) {
      monster.isFrozen = false
      monster.freezeTimeRemaining = 0
      unfreezeLoop.cancel()
    }
  })
}
/**
 * Create particles when monster is hit
 * @param {Object} k - Kaplay instance
 * @param {Object} monster - Monster instance
 */
function createMonsterHitParticles(k, monster) {
  const PARTICLE_COUNT = 15
  const PARTICLE_SIZE = 4
  
  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = 100 + Math.random() * 200
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    
    const particle = k.add([
      k.rect(PARTICLE_SIZE, PARTICLE_SIZE),
      k.pos(monster.x, monster.y),
      k.color(0, 0, 0),
      k.opacity(1.0),
      k.anchor('center'),
      k.z(22)
    ])
    
    particle.onUpdate(() => {
      particle.pos.x += vx * k.dt()
      particle.pos.y += vy * k.dt()
      particle.opacity -= k.dt() * 2
      
      if (particle.opacity <= 0) {
        k.destroy(particle)
      }
    })
  }
}
/**
 * Flash monster white when hit
 * @param {Object} k - Kaplay instance
 * @param {Object} monster - Monster instance
 * @param {number} count - Flash count
 */
function flashMonster(k, monster, count) {
  if (count >= 10) return
  
  const isWhite = count % 2 === 0
  const newColor = isWhite ? k.rgb(255, 255, 255) : k.rgb(80, 80, 80)
  //
  // Flash all body circles
  //
  if (monster.bodyCircles) {
    monster.bodyCircles.forEach(circle => {
      try {
        if (circle && typeof circle.color !== 'undefined') {
          circle.color = newColor
        }
      } catch (e) {
        // Skip if circle is destroyed
      }
    })
  }
  
  k.wait(0.1, () => flashMonster(k, monster, count + 1))
}
//
// Night effect for the monster: elevate glow circle opacity as darkness rises
// so the eyes appear to emit light above the night overlay.
// The body circles stay at z=14 (below the overlay at z=15.51) and fade out
// naturally as the overlay intensifies.
//
function updateMonsterNight(inst) {
  const darkness = getDarkness()
  const glowFactor = Math.max(0, Math.min(1, (darkness - MONSTER_NIGHT_DARKNESS) / 0.3))
  //
  // Dim body circles at night to make the creature even less visible.
  //
  const bodyOpacity = MONSTER_BODY_DAY_OPACITY - (MONSTER_BODY_DAY_OPACITY - MONSTER_BODY_NIGHT_OPACITY) * glowFactor
  inst.bodyCircles.forEach(bc => {
    bc.obj.opacity = bodyOpacity
  })
  //
  // Raise glow circle opacity and keep them aligned with the regular eyes.
  //
  inst.glowCircles.forEach(gc => {
    gc.obj.pos.x = inst.x + gc.offsetX + inst.wobbleX
    gc.obj.pos.y = inst.y + gc.offsetY + inst.wobbleY
    gc.obj.opacity = glowFactor * 0.92
  })
  //
  // Night pupils follow glow circles and track the hero direction so the eyes
  // appear to look at the player during darkness.
  //
  const heroX = inst.hero?.character?.pos?.x ?? inst.x
  const heroY = inst.hero?.character?.pos?.y ?? inst.y
  const NIGHT_PUPIL_MAX_OFFSET = 3
  inst.nightPupils.forEach(np => {
    const eyeX = inst.x + np.offsetX + inst.wobbleX
    const eyeY = inst.y + np.offsetY + inst.wobbleY
    const toHeroX = heroX - eyeX
    const toHeroY = heroY - eyeY
    const distToHero = Math.hypot(toHeroX, toHeroY)
    if (distToHero > 0 && glowFactor > 0) {
      np.obj.pos.x = eyeX + (toHeroX / distToHero) * NIGHT_PUPIL_MAX_OFFSET
      np.obj.pos.y = eyeY + (toHeroY / distToHero) * NIGHT_PUPIL_MAX_OFFSET
    } else {
      np.obj.pos.x = eyeX
      np.obj.pos.y = eyeY
    }
    np.obj.opacity = glowFactor * 0.95
  })
}
//
// Stops all level-3 background music tracks (boss, kids, clock).
//
function stopLevel3BackgroundMusic(k) {
  stopTimeSectionMusic(k)
  const soundsToStop = ['boss', 'clock', 'time0-kids', 'time']
  soundsToStop.forEach(soundName => {
    try {
      const track = k.getSound(soundName)
      track?.stop?.()
    } catch (e) {
      // Sound not found or already stopped
    }
  })
}
//
// Starts boss / kids / clock background music for level 3 (single instance per scene).
//
function startLevel3Music(k) {
  Sound.resumeGlobalAudio()
  k.volume(1)
  stopLevel3BackgroundMusic(k)
  const timeMusic = Sound.playInScene(k, 'boss', CFG.audio.backgroundMusic.time, true)
  const kidsMusic = Sound.playInScene(k, 'time0-kids', CFG.audio.backgroundMusic.kids, true)
  const clockMusic = Sound.playInScene(k, 'clock', CFG.audio.backgroundMusic.clock, true)
  timeSectionMusic.clock = clockMusic
  return { timeMusic, kidsMusic, clockMusic }
}
//
// Creates the night-music controller state and starts the three background tracks once.
//
function startLevel3MusicSession(k, sound, sceneGeneration) {
  const { timeMusic, kidsMusic, clockMusic } = startLevel3Music(k)
  return {
    k,
    sound,
    timeMusic,
    kidsMusic,
    clockMusic,
    sceneGeneration,
    cricketTimer: NIGHT_CRICKET_INTERVAL_MIN + Math.random() * (NIGHT_CRICKET_INTERVAL_MAX - NIGHT_CRICKET_INTERVAL_MIN)
  }
}
//
// Sets volume on an existing music track (never spawns duplicates).
//
function setMusicTrackVolume(track, volume) {
  if (!track) return
  track.volume = volume
  track.paused === true && (track.paused = false)
}
//
// Snaps boss / kids / clock to configured day volumes when it is not night.
//
function applyDayMusicVolumes(inst) {
  if (getDarkness() > NIGHT_DARKNESS_THRESHOLD) return
  setMusicTrackVolume(inst.timeMusic, CFG.audio.backgroundMusic.time)
  setMusicTrackVolume(inst.kidsMusic, CFG.audio.backgroundMusic.kids)
  setMusicTrackVolume(inst.clockMusic, CFG.audio.backgroundMusic.clock)
}
//
// Night music controller: fades the three level-3 music tracks out once it gets
// dark enough, and fires cricket sounds at random intervals while it is night.
// Restores original volumes when the day returns.
//
function onUpdateNightMusic(inst) {
  if (inst.sceneGeneration !== level3SceneGeneration) return
  const darkness = getDarkness()
  const isNight = darkness > NIGHT_DARKNESS_THRESHOLD
  const dt = inst.k.dt()
  if (isNight) {
    //
    // Fade music volumes toward zero.
    //
    const fadeStep = NIGHT_MUSIC_TRANSITION_SPEED * dt
    inst.timeMusic && (inst.timeMusic.volume = Math.max(0, inst.timeMusic.volume - fadeStep * CFG.audio.backgroundMusic.time))
    inst.kidsMusic && (inst.kidsMusic.volume = Math.max(0, inst.kidsMusic.volume - fadeStep * CFG.audio.backgroundMusic.kids))
    inst.clockMusic && (inst.clockMusic.volume = Math.max(0, inst.clockMusic.volume - fadeStep * CFG.audio.backgroundMusic.clock))
    //
    // Trigger cricket chirps at random intervals.
    //
    inst.cricketTimer -= dt
    if (inst.cricketTimer <= 0) {
      Sound.playCricketSound(inst.sound)
      inst.cricketTimer = NIGHT_CRICKET_INTERVAL_MIN + Math.random() * (NIGHT_CRICKET_INTERVAL_MAX - NIGHT_CRICKET_INTERVAL_MIN)
    }
  } else {
    //
    // Dawn: restore music volumes smoothly (same fade rate as night).
    //
    const fadeStep = NIGHT_MUSIC_TRANSITION_SPEED * dt
    inst.timeMusic && (inst.timeMusic.volume = Math.min(CFG.audio.backgroundMusic.time, inst.timeMusic.volume + fadeStep * CFG.audio.backgroundMusic.time))
    inst.kidsMusic && (inst.kidsMusic.volume = Math.min(CFG.audio.backgroundMusic.kids, inst.kidsMusic.volume + fadeStep * CFG.audio.backgroundMusic.kids))
    inst.clockMusic && (inst.clockMusic.volume = Math.min(CFG.audio.backgroundMusic.clock, inst.clockMusic.volume + fadeStep * CFG.audio.backgroundMusic.clock))
  }
}
//
// Checks monster–hero overlap after finale flags update; triggers death when allowed.
//
function onUpdateMonsterHeroCollision(k, hero, monster, levelIndicator, heroScoreAtStart) {
  if (!hero || hero.isDying || hero.isAnnihilating || monster.finaleAllowEat === false) return
  const bodyDistX = Math.abs(monster.x - hero.character.pos.x)
  const bodyDistY = Math.abs(monster.y - hero.character.pos.y)
  if (bodyDistX >= 50 || bodyDistY >= 50) return
  const savedSfx = hero.sfx
  const savedLevelIndicator = levelIndicator
  Sound.stopSubtitleSound()
  Hero.death(hero, () => {
    k.wait(0.1, () => {
      if (savedSfx?.audioContext && savedSfx.ambientGain) {
        const ctx = savedSfx.audioContext
        savedSfx.ambientGain.gain.setValueAtTime(savedSfx.ambientGain.gain.value, ctx.currentTime)
        savedSfx.ambientGain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2)
      }
      Sound.fadeOutAllMusic()
      const currentScore = get('lifeScore', 0)
      const newScore = currentScore + 1
      set('lifeScore', newScore)
      set('heroScore', heroScoreAtStart)
      if (savedLevelIndicator?.lifeImage?.sprite?.exists()) {
        savedLevelIndicator.updateLifeScore?.(newScore)
        Sound.playLifeSound(k)
        const originalColor = savedLevelIndicator.lifeImage.sprite.color
        flashLifeImageLevel3(k, savedLevelIndicator, originalColor, 0)
        createLifeScoreParticlesLevel3(k, savedLevelIndicator)
      }
      k.wait(0.8, () => {
        Sound.stopSubtitleSound()
        k.go('level-time.3')
      })
    })
  })
}
//
// Polls LevelHelp.isAnyPanelOpen() every frame. When the panel opens:
// - hero input is disabled (controlsDisabled = true)
// - monster.helpLocked is set so movement stops
// Both are restored the frame after the panel closes.
//
function onUpdateHelpLock(inst) {
  const isOpen = LevelHelp.isAnyPanelOpen()
  if (isOpen === inst.wasHelpOpen()) return
  inst.setWasHelpOpen(isOpen)
  inst.hero.controlsDisabled = isOpen
  inst.monster.helpLocked = isOpen
}