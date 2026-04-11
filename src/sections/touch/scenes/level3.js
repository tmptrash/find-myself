import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { createLevelTransition } from '../../../utils/transition.js'
import * as GlowBug from '../components/glow-bug.js'
import * as ShadowCreature from '../components/shadow-creature.js'
import * as JungleDecor from '../components/jungle-decor.js'
import { toPng, getRGB } from '../../../utils/helper.js'
import * as Dust from '../components/dust.js'
import * as Tooltip from '../../../utils/tooltip.js'
import { drawFirTree } from '../components/fir-tree.js'
import { arcY } from '../utils/trees.js'
//
// Game area margins
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Hero spawn configuration
//
const HERO_COLLISION_HEIGHT = 25
const HERO_SCALE = 3
const HERO_COLLISION_HEIGHT_SCALED = HERO_COLLISION_HEIGHT * HERO_SCALE
//
// Background color (near-black night sky)
//
const BG_COLOR_R = 31
const BG_COLOR_G = 31
const BG_COLOR_B = 31
const BG_HEX = '#1F1F1F'
//
// Wall color (matches background for seamless edges)
//
const WALL_COLOR_R = 31
const WALL_COLOR_G = 31
const WALL_COLOR_B = 31
const WALL_COLOR_HEX = '#1F1F1F'
//
// Platform dimensions
//
const PLATFORM_HEIGHT = 40
//
// Log platform visual constants (rounded wooden look matching level 2)
//
const LOG_BARK_COLOR_HEX = '#4A3018'
const LOG_BARK_LIGHT_HEX = '#6A4228'
const LOG_BARK_DARK_HEX = '#321A0A'
const LOG_RING_COLOR_HEX = '#8A5A40'
const LOG_RING_DARK_HEX = '#5B3920'
const LOG_CORE_COLOR_HEX = '#A4755A'
const LOG_END_STEPS = 16
const LOG_BARK_LINE_COUNT = 5
const LOG_END_SQUASH = 0.55
const LOG_CRACK_COUNT_MIN = 6
const LOG_CRACK_COUNT_MAX = 12
const LOG_CRACK_LENGTH_MIN = 6
const LOG_CRACK_LENGTH_MAX = 24
const LOG_KNOT_COUNT_MIN = 2
const LOG_KNOT_COUNT_MAX = 5
const LOG_KNOT_RADIUS_MIN = 2
const LOG_KNOT_RADIUS_MAX = 5
//
// Bug shield radius for thorn collision (hero directly above bug is protected)
// X range is tight: only shields when hero stands on top of the bug, not beside it
//
const BUG_SHIELD_RADIUS_X = 15
const BUG_SHIELD_RADIUS_Y = 30
//
// Rounded corner configuration for game area
//
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'touch3-corner-sprite'
//
// Corridor platform definitions (4 platforms)
// Path: P0 (left-top) → P2 (left-middle, thorns) → P1 (right-middle, trap) → P3 (right-top, anti-hero)
// Each entry: { x: centerX, y: topSurfaceY, width }
// P0: small starting platform at max left (higher than P2)
// P1: trap platform that splits when hero approaches (no vines)
// P2: thorn-covered hazard platform (moved left)
// P3: anti-hero platform at max right/top (no bugs)
//
const CORRIDOR_PLATFORMS = [
  { x: 180, y: 550, width: 150 },
  { x: 1150, y: 500, width: 340 },
  { x: 680, y: 600, width: 280 },
  { x: 1650, y: 350, width: 250 }
]
//
// Trap platform configuration (P1 splits into two halves when hero approaches)
//
const TRAP_PLATFORM_INDEX = 1
//
// Anti-hero platform index (fixed, not affected by adding new platforms)
//
const ANTIHERO_PLATFORM_INDEX = 3
const TRAP_ACTIVATION_DELAY = 0.05
const TRAP_INITIAL_GAP = 3
//
// Each half slides out by a small amount (just enough to create a gap)
//
const TRAP_MAX_SPLIT_DISTANCE = 180
//
// Duration in seconds for splitting apart and returning back
//
const TRAP_SPLIT_DURATION = 0.55
const TRAP_RETURN_DURATION = 1.2
//
// Trap proximity detection range (triggers while hero is still in the air)
//
const TRAP_PROXIMITY_X = 300
const TRAP_PROXIMITY_Y = 400
//
// Platform thorn zones (thorns only on P2 hazard platform, none on trap platform)
//
const PLATFORM_THORN_ZONES = [
  {
    startX: CORRIDOR_PLATFORMS[2].x - CORRIDOR_PLATFORMS[2].width / 2 + 20,
    endX: CORRIDOR_PLATFORMS[2].x + CORRIDOR_PLATFORMS[2].width / 2 - 20,
    y: CORRIDOR_PLATFORMS[2].y
  }
]
//
// Trap platform left-half thorn coverage (fraction of left half width from left edge)
//
const TRAP_LEFT_THORN_COVERAGE = 0.6
const TRAP_THORN_INSET = 15
//
// Y tolerance for platform thorn collision detection (pixels)
//
const PLATFORM_THORN_TOLERANCE = 5
//
// Blue thorn color for level 3 (icy/cold theme, slightly darker)
//
const THORN_COLOR_R = 55
const THORN_COLOR_G = 90
const THORN_COLOR_B = 145
//
// Snow particle color (cold blue-white matching dark theme)
//
const SNOW_COLOR_R = 180
const SNOW_COLOR_G = 195
const SNOW_COLOR_B = 220
//
// Number of glow bugs on the bottom wall (with blades across full width)
//
const BOTTOM_WALL_BUG_COUNT = 10
//
// Monster spawn position (just below upper-right anti-hero platform)
//
const MONSTER_SPAWN_X = 1650
const MONSTER_SPAWN_Y = 430
//
// Bottom wall kill zone Y threshold (top surface of bottom wall)
//
const BOTTOM_KILL_Y = CFG.visual.screen.height - CFG.visual.gameArea.bottomMargin
//
// Floor Y for mountain and tree base (top of bottom wall)
//
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN
//
// Play area width (for tree distribution)
//
const PLAY_AREA_WIDTH = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
//
// Pre-rendered background sprite names
//
const BG_SKY_SPRITE = 'bg-touch-level3-sky'
const MOUNTAINS_SPRITE = 'bg-touch-level3-mountains'
const DARK_TREES_SPRITE = 'bg-touch-level3-dark-trees'
const MEDIUM_TREES_SPRITE = 'bg-touch-level3-medium-trees'
const FRONT_TREES_SPRITE = 'bg-touch-level3-front-trees'
const CLOUDS_SPRITE = 'bg-touch-level3-clouds'
//
// Depth-based opacity below darkness (farther layers dimmer, revealed by bug light)
// Shader DARKNESS_AMBIENT provides faint base visibility through these opacities
//
const MOUNTAINS_DEPTH_OPACITY = 0.15
const DARK_TREES_DEPTH_OPACITY = 0.70
const MEDIUM_TREES_DEPTH_OPACITY = 0.82
const FRONT_TREES_DEPTH_OPACITY = 0.95
const PLATFORM_DEPTH_OPACITY = 0.15
//
// Mountain snow line position (percentage from base to peak)
//
const MOUNTAIN_SNOW_PERCENT = 85
//
// Mountain snow cap wobble offset (pixels)
//
const MOUNTAIN_SNOW_WOBBLE = 15
//
// Left mountain geometry and colors (adapted from touch level 2)
//
const LEFT_MOUNTAIN = {
  xOffset: -100,
  widthExtra: 200,
  widthVariation: 40,
  heightVariation: 1200,
  centerVariation: 250,
  colors: {
    snow: 'rgb(30, 32, 36)',
    rockLeft: 'rgb(14, 18, 22)',
    rockRight: 'rgb(12, 16, 20)',
    rockRightLight: 'rgb(20, 26, 30)'
  }
}
//
// Center mountain geometry and colors (tallest, sharpest)
//
const CENTER_MOUNTAIN = {
  xOffset: -400,
  widthExtra: 900,
  widthVariation: 30,
  heightVariation: 1500,
  centerVariation: 200,
  colors: {
    snow: 'rgb(35, 38, 42)',
    rockLeft: 'rgb(16, 22, 28)',
    rockRight: 'rgb(14, 20, 26)',
    rockRightLight: 'rgb(24, 30, 36)'
  }
}
//
// Right mountain geometry and colors (darkest silhouettes)
//
const RIGHT_MOUNTAIN = {
  xOffset: -150,
  widthExtra: 250,
  widthVariation: 45,
  heightVariation: 1300,
  centerVariation: 280,
  colors: {
    snow: 'rgb(32, 35, 40)',
    rockLeft: 'rgb(18, 24, 28)',
    rockRight: 'rgb(16, 22, 26)',
    rockRightLight: 'rgb(26, 32, 38)'
  }
}
//
// Shared tree trunk configuration
//
const TREE_TRUNK_HEIGHT_BASE = 0.1
const TREE_TRUNK_HEIGHT_RANGE = 0.2
const TREE_LAYERS_DEC_WIDTH = 0.15
//
// Dark tree layer configuration (furthest back, thin silhouettes)
//
const DARK_TREES_COUNT = 20
const DARK_TREES_LAYERS = 1
const DARK_TREES_TRUNK_WIDTH = 0.03
const DARK_TREES_TRUNK_COLOR = '#1A1A1A'
const DARK_TREES_LEFT_COLOR = [40, 55, 38]
const DARK_TREES_RIGHT_COLOR = [50, 65, 48]
const DARK_TREES_LAYER_WIDTH = 0.5
const DARK_TREES_HEIGHT_MIN = 320
const DARK_TREES_HEIGHT_MAX = 400
const DARK_TREES_SHARPNESS_MIN = 10
const DARK_TREES_SHARPNESS_MAX = 20
//
// Medium tree layer configuration (dark silhouettes)
//
const BG_TREES_COUNT = 12
const BG_TREES_LAYERS = 4
const BG_TREES_TRUNK_WIDTH = 0.03
const BG_TREES_TRUNK_COLOR = '#1A1A1A'
const BG_TREES_LEFT_COLOR = [45, 65, 40]
const BG_TREES_RIGHT_COLOR = [55, 78, 50]
const BG_TREES_LAYER_WIDTH = 0.3
const BG_TREES_HEIGHT_MIN = 290
const BG_TREES_HEIGHT_MAX = 370
const BG_TREES_SHARPNESS_MIN = 10
const BG_TREES_SHARPNESS_MAX = 20
//
// Foreground tree layer configuration (small, very dark, in front of creature)
//
const FRONT_TREES_COUNT = 15
const FRONT_TREES_LAYERS = 3
const FRONT_TREES_TRUNK_WIDTH = 0.03
const FRONT_TREES_TRUNK_COLOR = '#161616'
const FRONT_TREES_LEFT_COLOR = [50, 75, 42]
const FRONT_TREES_RIGHT_COLOR = [62, 90, 52]
const FRONT_TREES_LAYER_WIDTH = 0.35
const FRONT_TREES_HEIGHT_MIN = 120
const FRONT_TREES_HEIGHT_MAX = 250
const FRONT_TREES_SHARPNESS_MIN = 8
const FRONT_TREES_SHARPNESS_MAX = 18
//
// Cloud configuration (scrolling dark clouds under top wall)
//
const CLOUD_SCROLL_SPEED = 4
const CLOUD_TOP_Y = TOP_MARGIN + 15
const CLOUD_BOTTOM_Y = TOP_MARGIN + 55
const CLOUD_COUNT = 18
const CLOUD_RANDOMNESS = 15
const CLOUD_DENSE_Y = TOP_MARGIN + 30
const CLOUD_BASE_COLOR_R = 14
const CLOUD_BASE_COLOR_G = 16
const CLOUD_BASE_COLOR_B = 30
//
// Moon configuration (drawn on background canvas)
//
const MOON_X = 1400
const MOON_Y = 230
const MOON_RADIUS = 56
const MOON_COLOR_R = 200
const MOON_COLOR_G = 195
const MOON_COLOR_B = 180
const MOON_GLOW_RADIUS = 30
//
// Moon hover glow configuration
//
const MOON_HOVER_GLOW_EXTRA = 40
const MOON_HOVER_GLOW_SPEED = 3
//
// Pre-defined crater positions relative to moon center (fraction of radius)
// Each crater has a slightly darker shade defined by brightness offset
//
const MOON_CRATERS = [
  { x: -0.3, y: -0.2, r: 0.25, dark: 25 },
  { x: 0.25, y: 0.15, r: 0.2, dark: 20 },
  { x: -0.1, y: 0.35, r: 0.16, dark: 30 },
  { x: 0.4, y: -0.25, r: 0.13, dark: 22 },
  { x: -0.45, y: 0.1, r: 0.11, dark: 18 },
  { x: 0.1, y: -0.45, r: 0.1, dark: 28 },
  { x: 0.3, y: 0.4, r: 0.09, dark: 15 }
]
//
// Snow clump detail counts for log snow caps
//
const SNOW_CLUMP_COUNT_MIN = 3
const SNOW_CLUMP_COUNT_MAX = 6
const SNOW_CLUMP_RADIUS_MIN = 3
const SNOW_CLUMP_RADIUS_MAX = 8
//
// Tooltip texts and layout
//
const TOUCH_INDICATOR_TOOLTIP_TEXT = "here you see how far you have\ncome in learning touch"
const TOUCH_INDICATOR_TOOLTIP_WIDTH = 250
const TOUCH_INDICATOR_TOOLTIP_HEIGHT = 50
const TOUCH_INDICATOR_TOOLTIP_Y_OFFSET = -30
const SMALL_HERO_TOOLTIP_TEXT = "your score"
const SMALL_HERO_TOOLTIP_SIZE = 60
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_TEXT = "life score"
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50
const MONSTER_TOOLTIP_TEXT = "come here little one"
const MONSTER_TOOLTIP_HOVER_SIZE = 100
const MONSTER_TOOLTIP_Y_OFFSET = -80
const ANTIHERO_TOOLTIP_TEXT = "come on, you can do it"
const ANTIHERO_TOOLTIP_HOVER_SIZE = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
//
// Decorative log piles (stacked on the bottom floor in multiple spots)
//
const DECOR_LOG_WIDTH = 160
const DECOR_LOG_HEIGHT = 28
const DECOR_LOG_PILE_POSITIONS = [
  LEFT_MARGIN + 200,
  LEFT_MARGIN + 550,
  CFG.visual.screen.width - RIGHT_MARGIN - 550,
  CFG.visual.screen.width - RIGHT_MARGIN - 200
]
const DECOR_LOG_Z = 1
//
// Bottom platform snow profile constants
//
const BOTTOM_SNOW_HEIGHT = 12
const BOTTOM_SNOW_STEPS = 40
//
// Z-index layers for this level
// Sky → mountains → dark trees → medium trees → front trees → vines →
// platform visuals → foreground → creature → bugs
//
const Z_SKY = -95
const Z_MOUNTAINS = -90
const Z_DARK_TREES = -85
const Z_MEDIUM_TREES = -80
const Z_FRONT_TREES = -75
const Z_CLOUDS = 52
const Z_VINES = 0
const Z_PLATFORM_VISUALS = 2
const Z_FOREGROUND = 3
const Z_CREATURE = 5
const Z_BUGS = 8
const Z_DARKNESS = 50
//
// Darkness overlay (shader-based with smooth gradient falloff per light source)
// Covers only the game area with rounded corners; walls/margins stay normal
//
const MAX_DARKNESS_LIGHTS = 12
const DARKNESS_OPACITY = 1.0
const DARKNESS_AMBIENT = 0.14
const DARKNESS_GLOW_RADIUS = 350
const DARKNESS_GLOW_INTENSITY = 1.0
const DARKNESS_CREATURE_BURN_RADIUS = 120
const DARKNESS_CREATURE_BURN_INTENSITY = 1.0
/**
 * Level 3 scene for touch section - dark jungle corridor with glowing bugs and shadow creature
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel3(k) {
  k.scene("level-touch.3", () => {
    //
    // Save progress
    //
    set('lastLevel', 'level-touch.3')
    //
    // Set gravity
    //
    k.setGravity(CFG.game.gravity)
    //
    // Set canvas background to wall color to prevent edge strips
    //
    k.setBackground(k.rgb(WALL_COLOR_R, WALL_COLOR_G, WALL_COLOR_B))
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start boss.mp3 background music
    //
    const bossMusic = k.play('boss', {
      loop: true,
      volume: CFG.audio.backgroundMusic.time
    })
    //
    // Stop music when leaving the scene
    //
    k.onSceneLeave(() => {
      bossMusic.stop()
    })
    //
    // Create boundary walls
    //
    createWalls(k)
    //
    // Create rounded corners for the game area
    //
    createRoundedCorners(k)
    //
    // Create corridor platforms (invisible collision rects, skips trap platform)
    //
    createCorridorPlatforms(k)
    //
    // Create trap platform as two splittable halves
    //
    const trapState = createTrapPlatform(k)
    //
    // Pre-generate log detail data (cracks, knots, snow on top) for each platform
    //
    const logDetails = CORRIDOR_PLATFORMS.map(platform =>
      generateLogDetail(platform.width, PLATFORM_HEIGHT, true)
    )
    //
    // Generate separate log details for each trap half
    //
    const trapLogHalfW = CORRIDOR_PLATFORMS[TRAP_PLATFORM_INDEX].width / 2
    const trapLeftLogDetail = generateLogDetail(trapLogHalfW, PLATFORM_HEIGHT, false)
    const trapRightLogDetail = generateLogDetail(trapLogHalfW, PLATFORM_HEIGHT, false)
    //
    // Create depth-layered background (sky, mountains, dark trees, medium trees)
    //
    createDepthLayers(k)
    //
    // Create pre-rendered foreground trees (transparent, in front of creature)
    //
    createFrontTrees(k)
    //
    // Create scrolling dark clouds under top wall
    //
    createScrollingClouds(k)
    //
    // Create snow particles in game area
    //
    const snowColor = { r: SNOW_COLOR_R, g: SNOW_COLOR_G, b: SNOW_COLOR_B }
    const dustInst = Dust.create({
      k,
      bounds: {
        left: LEFT_MARGIN,
        right: CFG.visual.screen.width - RIGHT_MARGIN,
        top: CLOUD_BOTTOM_Y,
        bottom: CFG.visual.screen.height - BOTTOM_MARGIN
      },
      color: snowColor
    })
    //
    // Hero body color: red if word complete, orange if time complete, brown if touch complete, otherwise gray
    //
    const isTouchComplete = get('touch', false)
    const isWordComplete = get('word', false)
    const isTimeComplete = get('time', false)
    const heroBodyColor = isWordComplete ? "#E74C3C" : isTimeComplete ? "#FF8C00" : isTouchComplete ? "#8B5A50" : "#C0C0C0"
    //
    // Create level indicator (TOUCH letters)
    //
    const levelIndicator = LevelIndicator.create({
      k,
      levelNumber: 3,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      heroBodyColor,
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    //
    // Create anti-hero on the last (upper-right) platform
    //
    const antiHeroPlatform = CORRIDOR_PLATFORMS[ANTIHERO_PLATFORM_INDEX]
    const antiHeroX = antiHeroPlatform.x + antiHeroPlatform.width / 2 - 80
    const antiHeroY = antiHeroPlatform.y - HERO_COLLISION_HEIGHT_SCALED / 2 - 5
    const antiHeroInst = Hero.create({
      k,
      x: antiHeroX,
      y: antiHeroY,
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      sfx: sound,
      antiHero: null,
      addArms: true
    })
    //
    // Create hero on the first (bottom-left) platform
    //
    const firstPlatform = CORRIDOR_PLATFORMS[0]
    const heroX = firstPlatform.x - firstPlatform.width / 2 + 80
    const heroY = firstPlatform.y - HERO_COLLISION_HEIGHT_SCALED / 2 - 5
    const heroInst = Hero.create({
      k,
      x: heroX,
      y: heroY,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: antiHeroInst,
      onAnnihilation: () => {
        //
        // Stop creature and transition after completing touch section
        //
        creatureInst.stopped = true
        createLevelTransition(k, 'level-touch.3')
      },
      currentLevel: 'level-touch.3',
      addMouth: isWordComplete,
      addArms: isTouchComplete,
      bodyColor: heroBodyColor
    })
    //
    // Spawn hero and anti-hero, render above darkness overlay
    //
    Hero.spawn(heroInst)
    Hero.spawn(antiHeroInst)
    heroInst.character.z = Z_DARKNESS + 1
    heroInst.deathParticleZ = Z_DARKNESS + 1
    antiHeroInst.character.z = Z_DARKNESS + 1
    //
    // Create glow bugs on platforms P0 and P2 (no bugs on trap or anti-hero platforms)
    //
    const glowBugInst = GlowBug.create({
      k,
      hero: heroInst,
      sfx: sound,
      platforms: [CORRIDOR_PLATFORMS[0], CORRIDOR_PLATFORMS[2]],
      bugsPerPlatform: 1,
      minBugsPerPlatform: 1
    })
    //
    // Create a bug on the right half of the trap platform
    //
    const trapPlatform = CORRIDOR_PLATFORMS[TRAP_PLATFORM_INDEX]
    const trapRightHalfPlatform = {
      x: trapPlatform.x + trapPlatform.width / 4,
      y: trapPlatform.y,
      width: trapPlatform.width / 2
    }
    const trapBugInst = GlowBug.create({
      k,
      hero: heroInst,
      sfx: sound,
      platforms: [trapRightHalfPlatform],
      bugsPerPlatform: 1,
      minBugsPerPlatform: 1
    })
    //
    // Create glow bugs on the bottom wall (blade-covered floor)
    //
    const bottomWallPlatform = {
      x: LEFT_MARGIN + PLAY_AREA_WIDTH / 2,
      y: BOTTOM_KILL_Y,
      width: PLAY_AREA_WIDTH - 40
    }
    const bottomBugInst = GlowBug.create({
      k,
      hero: heroInst,
      sfx: sound,
      platforms: [bottomWallPlatform],
      bugsPerPlatform: 1,
      minBugsPerPlatform: BOTTOM_WALL_BUG_COUNT
    })
    //
    // Create shadow creature with hero death animation on touch
    //
    const creatureInst = ShadowCreature.create({
      k,
      x: MONSTER_SPAWN_X,
      y: MONSTER_SPAWN_Y,
      hero: heroInst,
      platforms: CORRIDOR_PLATFORMS,
      platformHeight: PLATFORM_HEIGHT,
      onHeroTouch: () => {
        if (heroInst.isDying) return
        onHeroDeath(k, heroInst, levelIndicator)
      }
    })
    //
    // Create jungle decorations (grass, vines, thorns on bottom wall and platforms)
    //
    const decorInst = JungleDecor.create({
      k,
      platforms: CORRIDOR_PLATFORMS,
      platformHeight: PLATFORM_HEIGHT,
      hero: heroInst,
      platformThorns: PLATFORM_THORN_ZONES,
      skipVineIndices: [TRAP_PLATFORM_INDEX]
    })
    decorInst.thornColor = k.rgb(THORN_COLOR_R, THORN_COLOR_G, THORN_COLOR_B)
    //
    // Split trap platform grass blades into left/right half groups
    // so they move with their respective halves during split animation
    //
    const trapPlat = CORRIDOR_PLATFORMS[TRAP_PLATFORM_INDEX]
    //
    // Generate thorns on the left portion of the left trap half
    //
    const trapHalfWidth = trapPlat.width / 2
    const trapLeftEdge = trapPlat.x - trapHalfWidth / 2 - TRAP_INITIAL_GAP - trapHalfWidth / 2
    const trapThornStartX = trapLeftEdge + TRAP_THORN_INSET
    const trapThornEndX = trapLeftEdge + trapHalfWidth * TRAP_LEFT_THORN_COVERAGE - TRAP_THORN_INSET
    const trapLeftThorns = generateTrapThorns(trapThornStartX, trapThornEndX, trapPlat.y)
    //
    // Store initial thorn X positions for absolute offset calculation
    //
    trapLeftThorns.forEach(thorn => { thorn.initialX = thorn.x })
    //
    // Split trap platform grass blades into left/right half groups
    //
    const trapLeftBlades = []
    const trapRightBlades = []
    decorInst.grassBlades.forEach(blade => {
      if (Math.abs(blade.baseY - trapPlat.y) > 5) return
      const platLeft = trapPlat.x - trapPlat.width / 2
      const platRight = trapPlat.x + trapPlat.width / 2
      if (blade.x < platLeft || blade.x > platRight) return
      blade.x < trapPlat.x ? trapLeftBlades.push(blade) : trapRightBlades.push(blade)
    })
    //
    // Store initial blade X positions for absolute offset calculation
    //
    trapLeftBlades.forEach(blade => { blade.initialX = blade.x })
    trapRightBlades.forEach(blade => { blade.initialX = blade.x })
    //
    // Draw hanging vines (behind platforms)
    //
    k.add([
      k.z(Z_VINES),
      {
        draw() {
          JungleDecor.onDrawVines(decorInst)
        }
      }
    ])
    //
    // Draw log platform visuals (rounded wooden logs with bark texture)
    //
    k.add([
      k.z(Z_PLATFORM_VISUALS),
      k.opacity(PLATFORM_DEPTH_OPACITY),
      {
        draw() {
          drawAllLogPlatforms(k, logDetails, trapState, trapLeftLogDetail, trapRightLogDetail)
        }
      }
    ])
    //
    // Generate decorative log piles at multiple spots on the bottom floor
    //
    const allDecorLogs = DECOR_LOG_PILE_POSITIONS.map(x => generateDecorLogs(x))
    k.add([
      k.z(DECOR_LOG_Z),
      {
        draw() {
          allDecorLogs.forEach(logs => drawDecorLogs(k, logs))
        }
      }
    ])
    //
    // Generate bottom platform snow profile (covers the full-width floor)
    //
    const bottomSnowProfile = generateBottomSnowProfile()
    k.add([
      k.z(Z_FOREGROUND),
      {
        draw() {
          drawBottomPlatformSnow(k, bottomSnowProfile)
        }
      }
    ])
    //
    // Draw shadow creature body and tentacles (below darkness, hidden in dark areas)
    //
    k.add([
      k.z(Z_CREATURE),
      {
        draw() {
          ShadowCreature.onDraw(creatureInst)
        }
      }
    ])
    //
    // Draw creature eyes and fire above darkness (eyes always visible, fire bright)
    //
    k.add([
      k.z(Z_DARKNESS + 1),
      {
        draw() {
          ShadowCreature.onDrawOverlay(creatureInst)
        }
      }
    ])
    //
    // Draw glow bug auras and bugs above darkness (always visible, dim when not glowing)
    //
    k.add([
      k.z(Z_DARKNESS + 1),
      {
        draw() {
          GlowBug.onDraw(glowBugInst)
          GlowBug.onDraw(trapBugInst)
          GlowBug.onDraw(bottomBugInst)
        }
      }
    ])
    //
    // Draw moon above darkness (bright and visible)
    //
    k.add([
      k.z(Z_DARKNESS + 1),
      {
        draw() {
          drawMoonOverlay(k)
        }
      }
    ])
    //
    // Moon hover glow system (glows when mouse hovers over it)
    //
    const moonGlowState = { intensity: 0 }
    k.add([
      k.z(Z_DARKNESS + 2),
      {
        draw() {
          drawMoonHoverGlow(k, moonGlowState)
        }
      }
    ])
    k.onUpdate(() => {
      updateMoonHoverGlow(k, moonGlowState)
    })
    //
    // Draw thorns above darkness (always visible)
    //
    k.add([
      k.z(Z_DARKNESS + 1),
      {
        draw() {
          JungleDecor.onDrawBottomThorns(decorInst)
          JungleDecor.onDrawPlatformThorns(decorInst)
          drawTrapLeftThorns(k, trapLeftThorns, trapState)
        }
      }
    ])
    //
    // Draw snow particles above darkness (always visible, gentle snowfall)
    //
    k.add([
      k.z(Z_DARKNESS + 2),
      {
        draw() {
          Dust.draw(dustInst)
        }
      }
    ])
    //
    // Load darkness shader (smooth gradient falloff per light source, rounded corners)
    //
    k.loadShader("level3-darkness", null, generateDarknessShader(MAX_DARKNESS_LIGHTS))
    //
    // Darkness overlay covers only the game area (not walls/margins)
    // Uses drawUVQuad which provides proper UV coords for the shader
    //
    const gameAreaWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    const gameAreaHeight = CFG.visual.screen.height - TOP_MARGIN - BOTTOM_MARGIN
    k.add([
      k.pos(LEFT_MARGIN, TOP_MARGIN),
      k.z(Z_DARKNESS),
      {
        draw() {
          k.drawUVQuad({
            width: gameAreaWidth,
            height: gameAreaHeight,
            anchor: "topleft",
            shader: "level3-darkness",
            uniform: collectLightUniforms(k, glowBugInst, trapBugInst, bottomBugInst, creatureInst, gameAreaWidth, gameAreaHeight),
            fixed: true
          })
        }
      }
    ])
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ k, showTimer: true })
    //
    // Tooltip: TOUCH indicator letters (top-left corner)
    //
    const touchLettersCenterX = LEFT_MARGIN + 40 + TOUCH_INDICATOR_TOOLTIP_WIDTH / 2
    const touchLettersCenterY = TOP_MARGIN / 2
    Tooltip.create({
      k,
      targets: [{
        x: touchLettersCenterX,
        y: touchLettersCenterY,
        width: TOUCH_INDICATOR_TOOLTIP_WIDTH,
        height: TOUCH_INDICATOR_TOOLTIP_HEIGHT,
        text: TOUCH_INDICATOR_TOOLTIP_TEXT,
        offsetY: TOUCH_INDICATOR_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Tooltip: small hero icon (score) - appears below
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
    // Tooltip: life icon - appears below
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
    // Tooltip: monster (shadow creature)
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => creatureInst.x,
        y: () => creatureInst.y,
        width: MONSTER_TOOLTIP_HOVER_SIZE,
        height: MONSTER_TOOLTIP_HOVER_SIZE,
        text: MONSTER_TOOLTIP_TEXT,
        offsetY: MONSTER_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Tooltip: anti-hero
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => antiHeroInst.character.pos.x,
        y: () => antiHeroInst.character.pos.y,
        width: ANTIHERO_TOOLTIP_HOVER_SIZE,
        height: ANTIHERO_TOOLTIP_HOVER_SIZE,
        text: ANTIHERO_TOOLTIP_TEXT,
        offsetY: ANTIHERO_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Main update loop
    //
    k.onUpdate(() => {
      onUpdate(k, fpsCounter, glowBugInst, trapBugInst, bottomBugInst, creatureInst, heroInst, trapState, trapLeftBlades, trapRightBlades, levelIndicator, trapLeftThorns)
      Dust.onUpdate(dustInst, k.dt())
    })
    //
    // ESC key to return to menu
    //
    k.onKeyPress("escape", () => {
      k.go("menu")
    })
  })
}

/**
 * Main update function for all level3 systems
 * @param {Object} k - Kaplay instance
 * @param {Object} fpsCounter - FPS counter instance
 * @param {Object} glowBugInst - GlowBug manager instance
 * @param {Object} trapBugInst - GlowBug instance for the trap platform right half
 * @param {Object} bottomBugInst - GlowBug instance for the bottom wall
 * @param {Object} creatureInst - Shadow creature instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} trapState - Trap platform state
 * @param {Array} trapLeftBlades - Grass blades on the left trap half
 * @param {Array} trapRightBlades - Grass blades on the right trap half
 * @param {Object} levelIndicator - Level indicator for life score effects on death
 * @param {Array} trapLeftThorns - Thorn data on the left trap half (moves with platform)
 */
function onUpdate(k, fpsCounter, glowBugInst, trapBugInst, bottomBugInst, creatureInst, heroInst, trapState, trapLeftBlades, trapRightBlades, levelIndicator, trapLeftThorns) {
  const dt = k.dt()
  FpsCounter.onUpdate(fpsCounter)
  GlowBug.onUpdate(glowBugInst, dt)
  //
  // Update trap platform split animation and sync hero position
  //
  const prevRightX = trapState.rightCenterX
  updateTrapPlatform(trapState, heroInst, dt)
  //
  // Sync trap blades and thorns using absolute offsets (prevents drift and flickering)
  //
  const leftOffset = trapState.leftCenterX - trapState.initialLeftCenterX
  const rightOffset = trapState.rightCenterX - trapState.initialRightCenterX
  trapLeftBlades.forEach(blade => { blade.x = blade.initialX + leftOffset })
  trapLeftThorns.forEach(thorn => { thorn.x = thorn.initialX + leftOffset })
  trapRightBlades.forEach(blade => { blade.x = blade.initialX + rightOffset })
  //
  // Sync trap bug position and bounds with the right half movement delta
  //
  const rightDeltaX = trapState.rightCenterX - prevRightX
  if (rightDeltaX !== 0 && trapBugInst.entries) {
    trapBugInst.entries.forEach(entry => {
      entry.bug.x += rightDeltaX
      entry.bug.bounds.minX += rightDeltaX
      entry.bug.bounds.maxX += rightDeltaX
      //
      // Shift leg foot positions with platform to prevent stretching during split
      //
      entry.bug.legs.forEach(leg => {
        leg.footX += rightDeltaX
        leg.targetFootX += rightDeltaX
        leg.stepStartX += rightDeltaX
      })
    })
  }
  GlowBug.onUpdate(trapBugInst, dt)
  GlowBug.onUpdate(bottomBugInst, dt)
  //
  // Check bottom wall and platform thorns (only when hero is alive)
  //
  if (!heroInst.isDying) {
    checkBottomThorns(k, heroInst, levelIndicator)
    checkPlatformThorns(k, heroInst, [...glowBugInst.entries, ...trapBugInst.entries, ...bottomBugInst.entries], levelIndicator)
    checkTrapLeftThorns(k, heroInst, trapLeftThorns, trapState, levelIndicator)
  }
  //
  // Get glow positions with darkness glow radius (creature burns within visible light)
  //
  const glowPositions = [
    ...GlowBug.getGlowingPositions(glowBugInst),
    ...GlowBug.getGlowingPositions(trapBugInst),
    ...GlowBug.getGlowingPositions(bottomBugInst)
  ].map(glow => ({ ...glow, radius: DARKNESS_GLOW_RADIUS }))
  ShadowCreature.onUpdate(creatureInst, dt, glowPositions)
}

/**
 * Checks if hero has fallen onto the bottom wall thorns and triggers death
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} levelIndicator - Level indicator for life score effects
 */
function checkBottomThorns(k, heroInst, levelIndicator) {
  if (!heroInst.character?.pos) return
  const heroFeetY = heroInst.character.pos.y + HERO_COLLISION_HEIGHT_SCALED / 2
  if (heroFeetY >= BOTTOM_KILL_Y) {
    onHeroDeath(k, heroInst, levelIndicator)
  }
}

/**
 * Checks if hero is standing on a platform thorn zone and triggers death
 * Skips kill when hero is near a bug (bug body shields hero from thorns below)
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Array} bugEntries - GlowBug entries for shielding check
 * @param {Object} levelIndicator - Level indicator for life score effects
 */
function checkPlatformThorns(k, heroInst, bugEntries, levelIndicator) {
  if (!heroInst.character?.pos) return
  const heroX = heroInst.character.pos.x
  const heroFeetY = heroInst.character.pos.y + HERO_COLLISION_HEIGHT_SCALED / 2
  //
  // Check if hero is directly above any bug (standing on it shields from thorns)
  // Hero feet must be above the bug center and within tight horizontal range
  //
  const shielded = bugEntries.some(entry => {
    const dx = Math.abs(heroX - entry.bug.x)
    const dy = entry.bug.y - heroFeetY
    return dx < BUG_SHIELD_RADIUS_X && dy > 0 && dy < BUG_SHIELD_RADIUS_Y
  })
  if (shielded) return
  for (const zone of PLATFORM_THORN_ZONES) {
    //
    // Hero feet must be approximately at platform surface AND within thorn X range
    //
    if (heroFeetY >= zone.y - PLATFORM_THORN_TOLERANCE &&
        heroFeetY <= zone.y + PLATFORM_THORN_TOLERANCE &&
        heroX >= zone.startX && heroX <= zone.endX) {
      onHeroDeath(k, heroInst, levelIndicator)
      return
    }
  }
}

/**
 * Generates thorn data for the left trap platform half
 * Thorns use the same sizing as jungle-decor thorns
 * @param {number} startX - Left edge X of thorn zone
 * @param {number} endX - Right edge X of thorn zone
 * @param {number} y - Platform surface Y
 * @returns {Array} Array of thorn objects {x, baseY, width, height, tipOffset}
 */
function generateTrapThorns(startX, endX, y) {
  const SPACING = 22
  const WIDTH_MIN = 7
  const WIDTH_MAX = 14
  const HEIGHT_MIN = 11
  const HEIGHT_MAX = 20
  const TIP_OFFSET = 3
  const RAISE = 3
  const thorns = []
  for (let x = startX; x < endX; x += SPACING) {
    thorns.push({
      x: x + (Math.random() - 0.5) * 6,
      baseY: y - RAISE,
      width: WIDTH_MIN + Math.random() * (WIDTH_MAX - WIDTH_MIN),
      height: HEIGHT_MIN + Math.random() * (HEIGHT_MAX - HEIGHT_MIN),
      tipOffset: (Math.random() - 0.5) * TIP_OFFSET
    })
  }
  return thorns
}

/**
 * Draws trap left-half thorns with outline, offset by current platform position
 * @param {Object} k - Kaplay instance
 * @param {Array} thorns - Thorn data array
 * @param {Object} trapState - Trap platform state (for current position)
 */
function drawTrapLeftThorns(k, thorns, trapState) {
  const thornColor = k.rgb(THORN_COLOR_R, THORN_COLOR_G, THORN_COLOR_B)
  const outlineColor = k.rgb(0, 0, 0)
  const ow = 2
  thorns.forEach(thorn => {
    k.drawPolygon({
      pts: [
        k.vec2(thorn.x - thorn.width / 2 - ow, thorn.baseY + ow),
        k.vec2(thorn.x + thorn.width / 2 + ow, thorn.baseY + ow),
        k.vec2(thorn.x + thorn.tipOffset, thorn.baseY - thorn.height - ow)
      ],
      color: outlineColor
    })
    k.drawPolygon({
      pts: [
        k.vec2(thorn.x - thorn.width / 2, thorn.baseY),
        k.vec2(thorn.x + thorn.width / 2, thorn.baseY),
        k.vec2(thorn.x + thorn.tipOffset, thorn.baseY - thorn.height)
      ],
      color: thornColor
    })
  })
}

/**
 * Checks if hero is touching trap left-half thorns and triggers death
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Array} thorns - Thorn data array (positions updated each frame)
 * @param {Object} trapState - Trap platform state
 * @param {Object} levelIndicator - Level indicator for life score effects
 */
function checkTrapLeftThorns(k, heroInst, thorns, trapState, levelIndicator) {
  if (!heroInst.character?.pos) return
  const heroX = heroInst.character.pos.x
  const heroFeetY = heroInst.character.pos.y + HERO_COLLISION_HEIGHT_SCALED / 2
  if (heroFeetY < trapState.y - PLATFORM_THORN_TOLERANCE ||
      heroFeetY > trapState.y + PLATFORM_THORN_TOLERANCE) return
  const leftHalfLeft = trapState.leftCenterX - trapState.halfWidth / 2
  const leftHalfRight = trapState.leftCenterX + trapState.halfWidth / 2
  if (heroX < leftHalfLeft || heroX > leftHalfRight) return
  //
  // Check if hero is within any thorn's X range
  //
  for (const thorn of thorns) {
    if (Math.abs(heroX - thorn.x) < thorn.width) {
      onHeroDeath(k, heroInst, levelIndicator)
      return
    }
  }
}
//
// Life death effect constants
//
const LIFE_FLASH_COUNT = 20
const LIFE_FLASH_INTERVAL = 0.05
const LIFE_PARTICLE_COUNT = 15
const LIFE_PARTICLE_SPEED_MIN = 80
const LIFE_PARTICLE_SPEED_EXTRA = 40
const LIFE_PARTICLE_LIFETIME_MIN = 0.8
const LIFE_PARTICLE_LIFETIME_EXTRA = 0.4
const LIFE_PARTICLE_SIZE_MIN = 4
const LIFE_PARTICLE_SIZE_EXTRA = 4
const DEATH_RELOAD_DELAY = 0.8

/**
 * Handles hero death: increments life score, plays laugh sound,
 * flashes life image, creates particles, then reloads the level
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} levelIndicator - Level indicator with lifeImage and updateLifeScore
 */
function onHeroDeath(k, heroInst, levelIndicator) {
  if (heroInst.isDying) return
  Hero.death(heroInst, () => {
    const currentScore = get('lifeScore', 0)
    const newScore = currentScore + 1
    set('lifeScore', newScore)
    levelIndicator?.updateLifeScore?.(newScore)
    //
    // Play laugh sound and trigger life image visual effects
    //
    if (levelIndicator?.lifeImage?.sprite?.exists?.()) {
      Sound.playLifeSound(k)
      const originalColor = levelIndicator.lifeImage.sprite.color
      flashLifeImage(k, levelIndicator, originalColor, 0)
      createLifeParticles(k, levelIndicator)
    }
    k.wait(DEATH_RELOAD_DELAY, () => k.go('level-touch.3'))
  })
}

/**
 * Flashes life image red/white alternating to indicate death
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with lifeImage
 * @param {Object} originalColor - Original color to restore after flash
 * @param {number} count - Current flash iteration
 */
function flashLifeImage(k, levelIndicator, originalColor, count) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  if (count >= LIFE_FLASH_COUNT) {
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
  k.wait(LIFE_FLASH_INTERVAL, () => flashLifeImage(k, levelIndicator, originalColor, count + 1))
}

/**
 * Creates red particles radiating outward from the life image on death
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with lifeImage position
 */
function createLifeParticles(k, levelIndicator) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  const lifeX = levelIndicator.lifeImage.sprite.pos.x
  const lifeY = levelIndicator.lifeImage.sprite.pos.y
  for (let i = 0; i < LIFE_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LIFE_PARTICLE_COUNT
    const speed = LIFE_PARTICLE_SPEED_MIN + Math.random() * LIFE_PARTICLE_SPEED_EXTRA
    const lifetime = LIFE_PARTICLE_LIFETIME_MIN + Math.random() * LIFE_PARTICLE_LIFETIME_EXTRA
    const size = LIFE_PARTICLE_SIZE_MIN + Math.random() * LIFE_PARTICLE_SIZE_EXTRA
    const particle = k.add([
      k.rect(size, size),
      k.pos(lifeX, lifeY),
      k.color(255, 0, 0),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
      k.anchor('center'),
      k.fixed()
    ])
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    let elapsed = 0
    particle.onUpdate(() => {
      elapsed += k.dt()
      particle.pos.x += vx * k.dt()
      particle.pos.y += vy * k.dt()
      particle.opacity = 1 - elapsed / lifetime
      if (elapsed >= lifetime) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Creates boundary walls for the level
 * @param {Object} k - Kaplay instance
 */
function createWalls(k) {
  //
  // Left wall (full height)
  //
  k.add([
    k.rect(LEFT_MARGIN, CFG.visual.screen.height),
    k.pos(LEFT_MARGIN / 2, CFG.visual.screen.height / 2),
    k.anchor("center"),
    k.area(),
    k.body({ isStatic: true }),
    k.color(WALL_COLOR_R, WALL_COLOR_G, WALL_COLOR_B),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Right wall (full height)
  //
  k.add([
    k.rect(RIGHT_MARGIN, CFG.visual.screen.height),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN / 2, CFG.visual.screen.height / 2),
    k.anchor("center"),
    k.area(),
    k.body({ isStatic: true }),
    k.color(WALL_COLOR_R, WALL_COLOR_G, WALL_COLOR_B),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Top wall (full width)
  //
  k.add([
    k.rect(CFG.visual.screen.width, TOP_MARGIN),
    k.pos(CFG.visual.screen.width / 2, TOP_MARGIN / 2),
    k.anchor("center"),
    k.area(),
    k.body({ isStatic: true }),
    k.color(WALL_COLOR_R, WALL_COLOR_G, WALL_COLOR_B),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Bottom wall (full width)
  //
  k.add([
    k.rect(CFG.visual.screen.width, BOTTOM_MARGIN),
    k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height - BOTTOM_MARGIN / 2),
    k.anchor("center"),
    k.area(),
    k.body({ isStatic: true }),
    k.color(WALL_COLOR_R, WALL_COLOR_G, WALL_COLOR_B),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
}

/**
 * Creates corridor platforms as invisible collision rectangles
 * Skips the trap platform (created separately as two halves)
 * @param {Object} k - Kaplay instance
 */
function createCorridorPlatforms(k) {
  CORRIDOR_PLATFORMS.forEach((platform, index) => {
    if (index === TRAP_PLATFORM_INDEX) return
    k.add([
      k.rect(platform.width, PLATFORM_HEIGHT),
      k.pos(platform.x, platform.y + PLATFORM_HEIGHT / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
  })
}

/**
 * Creates the trap platform as two halves that can split apart
 * Returns state object for animation tracking
 * @param {Object} k - Kaplay instance
 * @returns {Object} Trap platform state
 */
function createTrapPlatform(k) {
  const platform = CORRIDOR_PLATFORMS[TRAP_PLATFORM_INDEX]
  const halfWidth = platform.width / 2
  const leftCenterX = platform.x - halfWidth / 2 - TRAP_INITIAL_GAP
  const rightCenterX = platform.x + halfWidth / 2 + TRAP_INITIAL_GAP
  const centerY = platform.y + PLATFORM_HEIGHT / 2
  //
  // Create left half collision body
  //
  const leftHalf = k.add([
    k.rect(halfWidth, PLATFORM_HEIGHT),
    k.pos(leftCenterX, centerY),
    k.anchor("center"),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  //
  // Create right half collision body
  //
  const rightHalf = k.add([
    k.rect(halfWidth, PLATFORM_HEIGHT),
    k.pos(rightCenterX, centerY),
    k.anchor("center"),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  return {
    leftHalf,
    rightHalf,
    triggered: false,
    splitting: false,
    returning: false,
    done: false,
    activationTimer: 0,
    leftCenterX,
    rightCenterX,
    initialLeftCenterX: leftCenterX,
    initialRightCenterX: rightCenterX,
    splitDistance: 0,
    splitProgress: 0,
    y: platform.y,
    halfWidth,
    heroRidingHalf: null,
    heroOffsetX: 0
  }
}

/**
 * Updates trap platform split animation (one-time only)
 * Splits fast to 2x width gap and stays open permanently
 * Hero riding a half gets carried along with it
 * @param {Object} trapState - Trap platform state
 * @param {Object} heroInst - Hero instance
 * @param {number} dt - Delta time
 */
function updateTrapPlatform(trapState, heroInst, dt) {
  if (!heroInst.character?.pos) return
  //
  // Already returned to original position, permanently idle
  //
  if (trapState.done) return
  //
  // Returning phase: halves slide back to original position, then lock permanently
  //
  if (trapState.returning) {
    trapState.splitProgress += dt / TRAP_RETURN_DURATION
    //
    // Fully returned — lock permanently
    //
    if (trapState.splitProgress >= 1) {
      trapState.splitProgress = 1
      trapState.done = true
      trapState.heroRidingHalf = null
    }
    //
    // Ease-in-out: accelerate at start, decelerate at end (reverse direction)
    //
    const eased = smoothstep(trapState.splitProgress)
    trapState.splitDistance = TRAP_MAX_SPLIT_DISTANCE * (1 - eased)
    trapState.leftCenterX = trapState.initialLeftCenterX - trapState.splitDistance
    trapState.rightCenterX = trapState.initialRightCenterX + trapState.splitDistance
    trapState.leftHalf.pos.x = trapState.leftCenterX
    trapState.rightHalf.pos.x = trapState.rightCenterX
    syncHeroWithTrapPlatform(heroInst, trapState)
    return
  }
  //
  // Splitting phase: halves slide apart with ease-in-out, then start returning
  //
  if (trapState.splitting) {
    trapState.splitProgress += dt / TRAP_SPLIT_DURATION
    //
    // Reached max split — switch to returning
    //
    if (trapState.splitProgress >= 1) {
      trapState.splitProgress = 0
      trapState.returning = true
      trapState.splitting = false
      return
    }
    //
    // Ease-in-out: accelerate at start, decelerate at end
    //
    const eased = smoothstep(Math.min(trapState.splitProgress, 1))
    trapState.splitDistance = TRAP_MAX_SPLIT_DISTANCE * eased
    trapState.leftCenterX = trapState.initialLeftCenterX - trapState.splitDistance
    trapState.rightCenterX = trapState.initialRightCenterX + trapState.splitDistance
    trapState.leftHalf.pos.x = trapState.leftCenterX
    trapState.rightHalf.pos.x = trapState.rightCenterX
    syncHeroWithTrapPlatform(heroInst, trapState)
    return
  }
  //
  // Count down activation delay after trigger
  //
  if (trapState.triggered) {
    trapState.activationTimer -= dt
    if (trapState.activationTimer <= 0) {
      trapState.splitting = true
    }
    return
  }
  //
  // Check if hero is approaching the platform (proximity-based, triggers while in the air)
  //
  const platform = CORRIDOR_PLATFORMS[TRAP_PLATFORM_INDEX]
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y
  const dx = Math.abs(heroX - platform.x)
  const dy = Math.abs(heroY - platform.y)
  if (dx < TRAP_PROXIMITY_X && dy < TRAP_PROXIMITY_Y) {
    trapState.triggered = true
    trapState.activationTimer = TRAP_ACTIVATION_DELAY
  }
}

/**
 * Detects when hero lands on a trap platform half and starts tracking.
 * While tracked, hero's X is locked relative to the half's center each frame.
 * Tracking stops when hero jumps off or platform finishes moving.
 * @param {Object} heroInst - Hero instance
 * @param {Object} trapState - Trap platform state
 */
function syncHeroWithTrapPlatform(heroInst, trapState) {
  if (!heroInst.character?.pos) return
  const heroX = heroInst.character.pos.x
  const heroFeetY = heroInst.character.pos.y + HERO_COLLISION_HEIGHT_SCALED / 2
  const platSurfaceY = trapState.y
  const halfW = trapState.halfWidth / 2
  const isNearSurface = Math.abs(heroFeetY - platSurfaceY) < 20
  const isGrounded = heroInst.character.isGrounded?.() ?? false
  const onPlatform = isNearSurface && isGrounded
  //
  // If hero is not on the platform, stop tracking
  //
  if (!onPlatform) {
    trapState.heroRidingHalf = null
    return
  }
  //
  // If not yet tracking, detect which half the hero is on and start tracking
  //
  if (!trapState.heroRidingHalf) {
    if (heroX >= trapState.leftCenterX - halfW && heroX <= trapState.leftCenterX + halfW) {
      trapState.heroRidingHalf = 'left'
      trapState.heroOffsetX = heroX - trapState.leftCenterX
    } else if (heroX >= trapState.rightCenterX - halfW && heroX <= trapState.rightCenterX + halfW) {
      trapState.heroRidingHalf = 'right'
      trapState.heroOffsetX = heroX - trapState.rightCenterX
    }
  }
  //
  // Hero is being tracked — snap X to maintain relative offset from the half
  //
  if (trapState.heroRidingHalf === 'left') {
    heroInst.character.pos.x = trapState.leftCenterX + trapState.heroOffsetX
  } else if (trapState.heroRidingHalf === 'right') {
    heroInst.character.pos.x = trapState.rightCenterX + trapState.heroOffsetX
  }
}

/**
 * Generates log detail data (cracks, knots) for a platform of given dimensions
 * @param {number} w - Platform width
 * @param {number} h - Platform height
 * @param {boolean} withSnow - Whether to generate snow profile on top
 * @returns {Object} Detail data { cracks, knots, snowProfile, snowClumps }
 */
function generateLogDetail(w, h, withSnow) {
  const halfW = w / 2
  const halfH = h / 2
  const sq = LOG_END_SQUASH
  const innerLeft = -halfW + halfH * sq
  const innerRight = halfW - halfH * sq
  const innerW = innerRight - innerLeft
  //
  // Cracks: short dark diagonal lines on the bark surface
  //
  const crackCount = LOG_CRACK_COUNT_MIN + Math.floor(Math.random() * (LOG_CRACK_COUNT_MAX - LOG_CRACK_COUNT_MIN + 1))
  const cracks = []
  for (let i = 0; i < crackCount; i++) {
    const cx = innerLeft + Math.random() * innerW
    const cy = -halfH * 0.7 + Math.random() * h * 0.7
    const len = LOG_CRACK_LENGTH_MIN + Math.random() * (LOG_CRACK_LENGTH_MAX - LOG_CRACK_LENGTH_MIN)
    const angle = -0.4 + Math.random() * 0.8
    cracks.push({ x: cx, y: cy, len, angle })
  }
  //
  // Knots: small dark ovals on the bark
  //
  const knotCount = LOG_KNOT_COUNT_MIN + Math.floor(Math.random() * (LOG_KNOT_COUNT_MAX - LOG_KNOT_COUNT_MIN + 1))
  const knots = []
  for (let i = 0; i < knotCount; i++) {
    knots.push({
      x: innerLeft + Math.random() * innerW,
      y: -halfH * 0.5 + Math.random() * h * 0.5,
      r: LOG_KNOT_RADIUS_MIN + Math.random() * (LOG_KNOT_RADIUS_MAX - LOG_KNOT_RADIUS_MIN)
    })
  }
  //
  // Asymmetric snow profile (only when requested)
  //
  let snowProfile = null
  let snowClumps = null
  if (withSnow) {
    const steps = 24
    snowProfile = new Array(steps + 1).fill(0)
    const moundCount = 2 + Math.floor(Math.random() * 2)
    for (let m = 0; m < moundCount; m++) {
      const center = 0.15 + Math.random() * 0.7
      const spread = 0.2 + Math.random() * 0.3
      const height = 0.5 + Math.random() * 0.5
      for (let i = 0; i <= steps; i++) {
        const t = i / steps
        const dist = (t - center) / spread
        snowProfile[i] += height * Math.max(0, 1 - dist * dist)
      }
    }
    const maxVal = Math.max(...snowProfile)
    for (let i = 0; i <= steps; i++) {
      snowProfile[i] = snowProfile[i] / maxVal + (Math.random() - 0.5) * 0.08
      snowProfile[i] = Math.max(0, snowProfile[i])
    }
    snowProfile[0] = Math.min(snowProfile[0], 0.05)
    snowProfile[steps] = Math.min(snowProfile[steps], 0.05)
    const clumpCount = SNOW_CLUMP_COUNT_MIN + Math.floor(Math.random() * (SNOW_CLUMP_COUNT_MAX - SNOW_CLUMP_COUNT_MIN + 1))
    snowClumps = []
    for (let i = 0; i < clumpCount; i++) {
      const t = 0.1 + Math.random() * 0.8
      const idx = Math.round(t * steps)
      const profileH = snowProfile[Math.min(idx, steps)]
      snowClumps.push({
        t,
        yOffset: -profileH * 0.3 + Math.random() * profileH * 0.4,
        r: SNOW_CLUMP_RADIUS_MIN + Math.random() * (SNOW_CLUMP_RADIUS_MAX - SNOW_CLUMP_RADIUS_MIN)
      })
    }
  }
  return { cracks, knots, snowProfile, snowClumps }
}

/**
 * Draws all log platforms (regular and trap halves) at their current positions
 * Uses pushTransform/popTransform to center each log at the platform origin
 * @param {Object} k - Kaplay instance
 * @param {Array} logDetails - Pre-generated log details per platform
 * @param {Object} trapState - Trap platform state with current positions
 * @param {Object} trapLeftLogDetail - Log detail for left trap half
 * @param {Object} trapRightLogDetail - Log detail for right trap half
 */
function drawAllLogPlatforms(k, logDetails, trapState, trapLeftLogDetail, trapRightLogDetail) {
  //
  // Draw regular platforms (skip trap platform index)
  //
  CORRIDOR_PLATFORMS.forEach((platform, idx) => {
    if (idx === TRAP_PLATFORM_INDEX) return
    const centerY = platform.y + PLATFORM_HEIGHT / 2
    k.pushTransform()
    k.pushTranslate(platform.x, centerY)
    drawLogPlatform(k, platform.width, PLATFORM_HEIGHT, 0, 0, 1, logDetails[idx])
    k.popTransform()
  })
  //
  // Draw trap platform left half
  //
  const trapCenterY = trapState.y + PLATFORM_HEIGHT / 2
  k.pushTransform()
  k.pushTranslate(trapState.leftCenterX, trapCenterY)
  drawLogPlatform(k, trapState.halfWidth, PLATFORM_HEIGHT, 0, 0, 1, trapLeftLogDetail)
  k.popTransform()
  //
  // Draw trap platform right half
  //
  k.pushTransform()
  k.pushTranslate(trapState.rightCenterX, trapCenterY)
  drawLogPlatform(k, trapState.halfWidth, PLATFORM_HEIGHT, 0, 0, 1, trapRightLogDetail)
  k.popTransform()
}

/**
 * Draws a log-shaped platform: rounded barrel body with bark texture,
 * cracks/knots for detail, oval end-grain on the right, and optional snowdrift.
 * All coordinates are relative to the platform center (0,0).
 * @param {Object} k - Kaplay instance
 * @param {number} w - Platform width
 * @param {number} h - Platform height
 * @param {number} ox - Offset X
 * @param {number} oy - Offset Y
 * @param {number} opacity - Current opacity (0-1)
 * @param {Object} detail - Pre-generated log detail (cracks, knots, snowProfile)
 */
function drawLogPlatform(k, w, h, ox, oy, opacity, detail) {
  const halfW = w / 2
  const halfH = h / 2
  const endR = halfH
  const sq = LOG_END_SQUASH
  const barkColor = getRGB(k, LOG_BARK_COLOR_HEX)
  const barkLight = getRGB(k, LOG_BARK_LIGHT_HEX)
  const barkDark = getRGB(k, LOG_BARK_DARK_HEX)
  const ringColor = getRGB(k, LOG_RING_COLOR_HEX)
  const ringDark = getRGB(k, LOG_RING_DARK_HEX)
  const coreColor = getRGB(k, LOG_CORE_COLOR_HEX)
  //
  // Main barrel body (rounded rectangle with oval ends)
  //
  const bodyPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(-halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  //
  // Dark outline
  //
  k.drawPolygon({ pts: bodyPts.map(p => k.vec2(p.x, p.y + 2)), color: k.rgb(0, 0, 0), opacity: 0.4 * opacity })
  //
  // Bark body
  //
  k.drawPolygon({ pts: bodyPts, color: barkColor, opacity })
  //
  // Light streak on top half for volume
  //
  const topPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push(k.vec2(-halfW + r * Math.cos(a) * sq + ox, r * Math.sin(a) * 0.45 - halfH * 0.2 + oy))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    const r = endR * 0.85
    topPts.push(k.vec2(halfW + r * Math.cos(a) * sq + ox, r * Math.sin(a) * 0.45 - halfH * 0.2 + oy))
  }
  k.drawPolygon({ pts: topPts, color: barkLight, opacity: 0.5 * opacity })
  //
  // Horizontal bark lines for texture
  //
  for (let i = 0; i < LOG_BARK_LINE_COUNT; i++) {
    const ly = -halfH + (h / (LOG_BARK_LINE_COUNT + 1)) * (i + 1) + oy
    k.drawRect({
      pos: k.vec2(-halfW + endR * sq + ox, ly),
      width: w - endR * sq * 2,
      height: 1,
      color: barkDark,
      opacity: 0.3 * opacity
    })
  }
  //
  // Cracks: short dark diagonal lines across the bark
  //
  for (const crack of detail.cracks) {
    const dx = Math.cos(crack.angle) * crack.len * 0.5
    const dy = Math.sin(crack.angle) * crack.len * 0.5
    k.drawLines({
      pts: [k.vec2(crack.x - dx + ox, crack.y - dy + oy), k.vec2(crack.x + dx + ox, crack.y + dy + oy)],
      width: 1,
      color: barkDark,
      opacity: 0.5 * opacity
    })
  }
  //
  // Knots: small dark ovals on the bark surface
  //
  for (const knot of detail.knots) {
    drawOvalRing(k, knot.x + ox, knot.y + oy, knot.r, 0.7, barkDark, 0.45 * opacity)
    drawOvalRing(k, knot.x + ox, knot.y + oy, knot.r * 0.5, 0.7, barkLight, 0.25 * opacity)
  }
  //
  // Right end-grain oval (cross-section squashed horizontally)
  //
  const endCX = halfW + ox
  const endCY = oy
  drawOvalRing(k, endCX, endCY, endR, sq, ringColor, opacity)
  drawOvalRing(k, endCX, endCY, endR * 0.75, sq, coreColor, opacity)
  drawOvalRing(k, endCX, endCY, endR * 0.5, sq, ringDark, 0.3 * opacity)
  drawOvalRing(k, endCX, endCY, endR * 0.2, sq, barkDark, 0.5 * opacity)
  //
  // Snowdrift on top (only when detail includes a snow profile)
  //
  if (!detail.snowProfile) return
  const sp = detail.snowProfile
  const snowSteps = sp.length - 1
  const snowHeight = h * 0.5
  const snowPts = []
  for (let i = 0; i <= snowSteps; i++) {
    const t = i / snowSteps
    const px = (t - 0.5) * w + ox
    snowPts.push(k.vec2(px, -halfH - snowHeight * sp[i] + oy))
  }
  snowPts.push(k.vec2(halfW + ox, -halfH + oy))
  snowPts.push(k.vec2(-halfW + ox, -halfH + oy))
  k.drawPolygon({ pts: snowPts, color: k.rgb(255, 255, 255), opacity: 0.9 * opacity })
  const shadowPts = []
  for (let i = 0; i <= snowSteps; i++) {
    const t = i / snowSteps
    const px = (t - 0.5) * w + ox
    shadowPts.push(k.vec2(px, -halfH - snowHeight * 0.3 * sp[i] + oy))
  }
  shadowPts.push(k.vec2(halfW + ox, -halfH + oy))
  shadowPts.push(k.vec2(-halfW + ox, -halfH + oy))
  k.drawPolygon({ pts: shadowPts, color: k.rgb(100, 130, 180), opacity: 0.5 * opacity })
  if (detail.snowClumps) {
    for (const clump of detail.snowClumps) {
      const cx = (clump.t - 0.5) * w + ox
      const idx = Math.round(clump.t * snowSteps)
      const baseH = sp[Math.min(idx, snowSteps)]
      const cy = -halfH - snowHeight * baseH + clump.yOffset * snowHeight + oy
      k.drawCircle({
        pos: k.vec2(cx, cy),
        radius: clump.r,
        color: k.rgb(230, 240, 255),
        opacity: 0.8 * opacity
      })
    }
  }
}

/**
 * Draws a filled oval (ellipse) using a polygon approximation
 * @param {Object} k - Kaplay instance
 * @param {number} cx - Center X
 * @param {number} cy - Center Y
 * @param {number} r - Radius
 * @param {number} squash - Horizontal squash factor (0-1)
 * @param {Object} color - Kaplay color object
 * @param {number} opacity - Opacity (0-1)
 */
function drawOvalRing(k, cx, cy, r, squash, color, opacity) {
  const pts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI * 2 * i / LOG_END_STEPS
    pts.push(k.vec2(cx + Math.cos(a) * r * squash, cy + Math.sin(a) * r))
  }
  k.drawPolygon({ pts, color, opacity })
}

/**
 * Creates a rounded corner sprite using canvas (L-shaped with rounded inner corner)
 * @param {number} radius - Corner radius in pixels
 * @param {string} color - Fill color in hex format
 * @returns {string} Data URL of the corner sprite
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
  // Cut out quarter circle to create rounded inner corner
  //
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(radius, radius, radius, 0, Math.PI * 2)
  ctx.fill()
  return canvas.toDataURL()
}

/**
 * Creates rounded corners at all four corners of the game area
 * @param {Object} k - Kaplay instance
 */
function createRoundedCorners(k) {
  const cornerDataURL = createRoundedCornerSprite(CORNER_RADIUS, WALL_COLOR_HEX)
  k.loadSprite(CORNER_SPRITE_NAME, cornerDataURL)
  //
  // Render corners above darkness overlay so they're always visible
  //
  const cornerZ = Z_DARKNESS + 3
  //
  // Top-left corner
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, TOP_MARGIN),
    k.z(cornerZ)
  ])
  //
  // Top-right corner (rotate 90°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, TOP_MARGIN),
    k.rotate(90),
    k.z(cornerZ)
  ])
  //
  // Bottom-left corner (rotate 270°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, CFG.visual.screen.height - BOTTOM_MARGIN),
    k.rotate(270),
    k.z(cornerZ)
  ])
  //
  // Bottom-right corner (rotate 180°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, CFG.visual.screen.height - BOTTOM_MARGIN),
    k.rotate(180),
    k.z(cornerZ)
  ])
}

/**
 * Creates depth-layered background: sky+moon, mountains, dark trees, medium trees
 * Each layer is a separate sprite rendered at its own z-level with depth-based opacity
 * Farther layers appear dimmer both in ambient darkness and when illuminated by bugs
 * @param {Object} k - Kaplay instance
 */
function createDepthLayers(k) {
  const screenWidth = CFG.visual.screen.width
  const screenHeight = CFG.visual.screen.height
  const screenThird = screenWidth / 3
  //
  // Sky layer: background color fill + moon (opaque base, always behind everything)
  //
  const skyPng = toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
    ctx.imageSmoothingEnabled = false
    ctx.fillStyle = BG_HEX
    ctx.fillRect(0, 0, screenWidth, screenHeight)
    drawMoon(ctx)
  })
  k.loadSprite(BG_SKY_SPRITE, skyPng)
  k.add([
    k.z(Z_SKY),
    {
      draw() {
        k.drawSprite({ sprite: BG_SKY_SPRITE, pos: k.vec2(0, 0), anchor: "topleft" })
      }
    }
  ])
  //
  // Mountains layer (farthest depth, dimmest)
  //
  const mountainsPng = toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
    ctx.imageSmoothingEnabled = false
    //
    // Clip mountains to game area boundaries (no overflow into margins)
    //
    ctx.save()
    ctx.beginPath()
    ctx.rect(LEFT_MARGIN, 0, PLAY_AREA_WIDTH, screenHeight)
    ctx.clip()
    drawMountainShape(ctx, LEFT_MOUNTAIN.xOffset, FLOOR_Y, screenThird + LEFT_MOUNTAIN.widthExtra, LEFT_MOUNTAIN, LEFT_MOUNTAIN.colors)
    drawMountainShape(ctx, screenThird + CENTER_MOUNTAIN.xOffset, FLOOR_Y, screenThird + CENTER_MOUNTAIN.widthExtra, CENTER_MOUNTAIN, CENTER_MOUNTAIN.colors)
    drawMountainShape(ctx, screenThird * 2 + RIGHT_MOUNTAIN.xOffset, FLOOR_Y, screenThird + RIGHT_MOUNTAIN.widthExtra, RIGHT_MOUNTAIN, RIGHT_MOUNTAIN.colors)
    ctx.restore()
  })
  k.loadSprite(MOUNTAINS_SPRITE, mountainsPng)
  addDepthLayer(k, MOUNTAINS_SPRITE, Z_MOUNTAINS, MOUNTAINS_DEPTH_OPACITY)
  //
  // Dark trees layer (far depth)
  //
  const darkTreesPng = toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
    ctx.imageSmoothingEnabled = false
    const darkPeriod = PLAY_AREA_WIDTH / DARK_TREES_COUNT
    for (let i = 0; i < DARK_TREES_COUNT; i++) {
      const x = i * darkPeriod + Math.random() * darkPeriod + LEFT_MARGIN
      drawFirTree(ctx, x, FLOOR_Y, arcY(x, LEFT_MARGIN, PLAY_AREA_WIDTH, DARK_TREES_HEIGHT_MIN, DARK_TREES_HEIGHT_MAX), {
        layers: DARK_TREES_LAYERS,
        trunkWidthPercent: DARK_TREES_TRUNK_WIDTH,
        trunkHeightPercent: TREE_TRUNK_HEIGHT_BASE + Math.random() * TREE_TRUNK_HEIGHT_RANGE,
        trunkColor: DARK_TREES_TRUNK_COLOR,
        leftColor: DARK_TREES_LEFT_COLOR,
        rightColor: DARK_TREES_RIGHT_COLOR,
        layer0WidthPercent: DARK_TREES_LAYER_WIDTH,
        layersDecWidthPercent: TREE_LAYERS_DEC_WIDTH,
        layersSharpness: Math.floor(Math.random() * (DARK_TREES_SHARPNESS_MAX - DARK_TREES_SHARPNESS_MIN) + DARK_TREES_SHARPNESS_MIN)
      })
    }
  })
  k.loadSprite(DARK_TREES_SPRITE, darkTreesPng)
  addDepthLayer(k, DARK_TREES_SPRITE, Z_DARK_TREES, DARK_TREES_DEPTH_OPACITY)
  //
  // Medium trees layer (medium depth)
  //
  const mediumTreesPng = toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
    ctx.imageSmoothingEnabled = false
    const bgPeriod = PLAY_AREA_WIDTH / BG_TREES_COUNT
    for (let i = 0; i < BG_TREES_COUNT; i++) {
      const x = i * bgPeriod + Math.random() * bgPeriod + LEFT_MARGIN
      drawFirTree(ctx, x, FLOOR_Y, arcY(x, LEFT_MARGIN, PLAY_AREA_WIDTH, BG_TREES_HEIGHT_MIN, BG_TREES_HEIGHT_MAX), {
        layers: Math.random() * BG_TREES_LAYERS + 4,
        trunkWidthPercent: BG_TREES_TRUNK_WIDTH,
        trunkHeightPercent: TREE_TRUNK_HEIGHT_BASE + Math.random() * TREE_TRUNK_HEIGHT_RANGE,
        trunkColor: BG_TREES_TRUNK_COLOR,
        leftColor: BG_TREES_LEFT_COLOR,
        rightColor: BG_TREES_RIGHT_COLOR,
        layer0WidthPercent: BG_TREES_LAYER_WIDTH,
        layersDecWidthPercent: TREE_LAYERS_DEC_WIDTH,
        layersSharpness: Math.floor(Math.random() * (BG_TREES_SHARPNESS_MAX - BG_TREES_SHARPNESS_MIN) + BG_TREES_SHARPNESS_MIN)
      })
    }
  })
  k.loadSprite(MEDIUM_TREES_SPRITE, mediumTreesPng)
  addDepthLayer(k, MEDIUM_TREES_SPRITE, Z_MEDIUM_TREES, MEDIUM_TREES_DEPTH_OPACITY)
}

/**
 * Adds a depth layer below darkness with depth-scaled opacity
 * Shader ambient lets it bleed through faintly; bug light reveals it fully
 * @param {Object} k - Kaplay instance
 * @param {string} sprite - Sprite name
 * @param {number} z - Z-index below darkness
 * @param {number} depthOpacity - Opacity scaling (farther layers are dimmer)
 */
function addDepthLayer(k, sprite, z, depthOpacity) {
  k.add([
    k.z(z),
    k.opacity(depthOpacity),
    {
      draw() {
        k.drawSprite({ sprite, pos: k.vec2(0, 0), anchor: "topleft" })
      }
    }
  ])
}

/**
 * Creates a pre-rendered foreground tree layer with transparent background
 * Small, bright trees drawn in front of the creature for depth parallax
 * @param {Object} k - Kaplay instance
 */
function createFrontTrees(k) {
  const screenWidth = CFG.visual.screen.width
  const screenHeight = CFG.visual.screen.height
  //
  // Render small foreground trees onto transparent canvas
  //
  const png = toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
    const treePeriod = PLAY_AREA_WIDTH / FRONT_TREES_COUNT
    for (let i = 0; i < FRONT_TREES_COUNT; i++) {
      const x = i * treePeriod + Math.random() * treePeriod + LEFT_MARGIN
      drawFirTree(ctx, x, FLOOR_Y, arcY(x, LEFT_MARGIN, PLAY_AREA_WIDTH, FRONT_TREES_HEIGHT_MIN, FRONT_TREES_HEIGHT_MAX), {
        layers: Math.random() * FRONT_TREES_LAYERS + 3,
        trunkWidthPercent: FRONT_TREES_TRUNK_WIDTH,
        trunkHeightPercent: TREE_TRUNK_HEIGHT_BASE + Math.random() * TREE_TRUNK_HEIGHT_RANGE,
        trunkColor: FRONT_TREES_TRUNK_COLOR,
        leftColor: FRONT_TREES_LEFT_COLOR,
        rightColor: FRONT_TREES_RIGHT_COLOR,
        layer0WidthPercent: FRONT_TREES_LAYER_WIDTH,
        layersDecWidthPercent: TREE_LAYERS_DEC_WIDTH,
        layersSharpness: Math.floor(Math.random() * (FRONT_TREES_SHARPNESS_MAX - FRONT_TREES_SHARPNESS_MIN) + FRONT_TREES_SHARPNESS_MIN)
      })
    }
  })
  k.loadSprite(FRONT_TREES_SPRITE, png)
  //
  // Front trees use the same depth layer pattern (closest, brightest)
  //
  addDepthLayer(k, FRONT_TREES_SPRITE, Z_FRONT_TREES, FRONT_TREES_DEPTH_OPACITY)
}

/**
 * Creates scrolling dark clouds under the top platform (seamless loop)
 * @param {Object} k - Kaplay instance
 */
function createScrollingClouds(k) {
  const baseCloudColor = k.rgb(CLOUD_BASE_COLOR_R, CLOUD_BASE_COLOR_G, CLOUD_BASE_COLOR_B)
  const areaLeft = LEFT_MARGIN
  const areaRight = CFG.visual.screen.width - RIGHT_MARGIN
  const bandWidth = areaRight - areaLeft
  const cloudSpacing = bandWidth / CLOUD_COUNT
  //
  // Pre-generate cloud positions and crown shapes relative to the band
  //
  const cloudConfigs = []
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const baseX = cloudSpacing * i + cloudSpacing * 0.5
    const cloudX = baseX + (Math.random() - 0.5) * CLOUD_RANDOMNESS
    const cloudY = CLOUD_TOP_Y + Math.random() * (CLOUD_BOTTOM_Y - CLOUD_TOP_Y)
    const crownSize = (30 + Math.random() * 35) * 1.2
    const crownCount = 5 + Math.floor(Math.random() * 4)
    const crowns = []
    for (let j = 0; j < crownCount; j++) {
      crowns.push({
        offsetX: (Math.random() - 0.5) * crownSize * 0.7,
        offsetY: (Math.random() - 0.5) * crownSize * 0.5,
        sizeVariation: 0.6 + Math.random() * 0.6,
        opacityVariation: 0.7 + Math.random() * 0.2
      })
    }
    cloudConfigs.push({
      x: cloudX,
      y: cloudY,
      crownSize,
      crowns,
      color: baseCloudColor,
      opacity: 0.85 + Math.random() * 0.1
    })
  }
  //
  // Scroll offset wraps within bandWidth
  //
  const scrollState = { scrollX: 0 }
  const screenWidth = CFG.visual.screen.width
  const screenHeight = CFG.visual.screen.height
  const wallColor = k.rgb(WALL_COLOR_R, WALL_COLOR_G, WALL_COLOR_B)
  k.add([
    k.z(Z_CLOUDS),
    {
      draw() {
        scrollState.scrollX = (scrollState.scrollX + CLOUD_SCROLL_SPEED * k.dt()) % bandWidth
        for (let copy = 0; copy < 2; copy++) {
          const baseOffset = areaLeft + scrollState.scrollX - copy * bandWidth
          for (const cloud of cloudConfigs) {
            const cx = cloud.x + baseOffset
            if (cx + cloud.crownSize < areaLeft || cx - cloud.crownSize > areaRight) continue
            for (const crown of cloud.crowns) {
              k.drawCircle({
                pos: k.vec2(cx + crown.offsetX, cloud.y + crown.offsetY),
                radius: cloud.crownSize * crown.sizeVariation,
                color: cloud.color,
                opacity: cloud.opacity * crown.opacityVariation
              })
            }
          }
        }
        //
        // Mask overflow with wall-colored rectangles on all four sides
        //
        k.drawRect({ pos: k.vec2(0, 0), width: areaLeft, height: screenHeight, color: wallColor })
        k.drawRect({ pos: k.vec2(areaRight, 0), width: screenWidth - areaRight, height: screenHeight, color: wallColor })
        k.drawRect({ pos: k.vec2(0, 0), width: screenWidth, height: TOP_MARGIN, color: wallColor })
        k.drawRect({ pos: k.vec2(0, screenHeight - BOTTOM_MARGIN), width: screenWidth, height: BOTTOM_MARGIN, color: wallColor })
      }
    }
  ])
}

/**
 * Draws a full moon with smooth radial glow and craters on the background canvas
 * Uses canvas radial gradient for seamless glow falloff (no visible rings)
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function drawMoon(ctx) {
  ctx.save()
  //
  // Draw smooth radial glow using canvas gradient (no discrete rings)
  //
  const outerR = MOON_RADIUS + MOON_GLOW_RADIUS
  const gradient = ctx.createRadialGradient(MOON_X, MOON_Y, MOON_RADIUS * 0.8, MOON_X, MOON_Y, outerR)
  gradient.addColorStop(0, `rgba(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B}, 0.15)`)
  gradient.addColorStop(0.4, `rgba(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B}, 0.06)`)
  gradient.addColorStop(1, `rgba(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B}, 0)`)
  ctx.beginPath()
  ctx.arc(MOON_X, MOON_Y, outerR, 0, Math.PI * 2)
  ctx.fillStyle = gradient
  ctx.fill()
  //
  // Draw solid moon disc
  //
  ctx.beginPath()
  ctx.arc(MOON_X, MOON_Y, MOON_RADIUS, 0, Math.PI * 2)
  ctx.fillStyle = `rgb(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B})`
  ctx.fill()
  //
  // Draw craters as darker circles clipped to moon disc
  // Each crater has its own darkness level for surface variation
  //
  ctx.save()
  ctx.beginPath()
  ctx.arc(MOON_X, MOON_Y, MOON_RADIUS, 0, Math.PI * 2)
  ctx.clip()
  MOON_CRATERS.forEach(crater => {
    const cr = MOON_COLOR_R - crater.dark
    const cg = MOON_COLOR_G - crater.dark
    const cb = MOON_COLOR_B - crater.dark
    ctx.beginPath()
    ctx.arc(
      MOON_X + crater.x * MOON_RADIUS,
      MOON_Y + crater.y * MOON_RADIUS,
      crater.r * MOON_RADIUS,
      0, Math.PI * 2
    )
    ctx.fillStyle = `rgb(${cr}, ${cg}, ${cb})`
    ctx.fill()
  })
  ctx.restore()
  ctx.restore()
}

/**
 * Draws a single mountain with snow cap and colored rock faces onto canvas context
 * Adapted from touch section level 2 mountain rendering
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 * @param {number} x - Left edge X position
 * @param {number} baseY - Mountain base Y (horizon line)
 * @param {number} width - Horizontal span of the mountain
 * @param {Object} data - Mountain geometry data {widthVariation, heightVariation, centerVariation}
 * @param {Object} colors - Color palette {snow, rockLeft, rockRight, rockRightLight}
 */
function drawMountainShape(ctx, x, baseY, width, data, colors) {
  ctx.save()
  //
  // Calculate mountain geometry from data parameters
  //
  const leftBaseX = x + data.widthVariation / 2
  const rightBaseX = x + width - data.widthVariation / 2
  const peakY = baseY - data.heightVariation / 2
  const peakX = x + (width - data.centerVariation) / 2 + data.centerVariation / 2
  //
  // Calculate snow line positions on left and right slopes
  //
  const leftSnow = fixedPointOnSegment(leftBaseX, baseY, peakX, peakY, MOUNTAIN_SNOW_PERCENT)
  const rightSnow = fixedPointOnSegment(rightBaseX, baseY, peakX, peakY, MOUNTAIN_SNOW_PERCENT)
  const midSnow = {
    x: peakX,
    y: (leftSnow.y + rightSnow.y) / 2
  }
  //
  // Generate snow cap edge points with wobble
  //
  const leftSnowPoints = []
  const rightSnowPoints = []
  for (let i = 1; i <= 2; i++) {
    const leftPt = fixedPointOnSegment(leftSnow.x, leftSnow.y, midSnow.x, midSnow.y, 100 / 3 * i)
    leftPt.y += MOUNTAIN_SNOW_WOBBLE * (1 - 2 * (i % 2))
    leftSnowPoints.push(leftPt)
    const rightPt = fixedPointOnSegment(midSnow.x, midSnow.y, rightSnow.x, rightSnow.y, 100 / 3 * i)
    rightPt.y += MOUNTAIN_SNOW_WOBBLE * (-1 + 2 * (i % 2))
    rightSnowPoints.push(rightPt)
  }
  //
  // Draw left snow cap
  //
  ctx.fillStyle = colors.snow
  ctx.beginPath()
  ctx.moveTo(leftSnow.x, leftSnow.y)
  leftSnowPoints.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(midSnow.x, midSnow.y)
  ctx.lineTo(peakX, peakY)
  ctx.fill()
  //
  // Draw right snow cap (lighter color)
  //
  ctx.fillStyle = colors.rockRightLight
  ctx.beginPath()
  ctx.moveTo(midSnow.x, midSnow.y)
  rightSnowPoints.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(rightSnow.x, rightSnow.y)
  ctx.lineTo(peakX, peakY)
  ctx.fill()
  //
  // Draw left rock face
  //
  ctx.fillStyle = colors.rockLeft
  ctx.beginPath()
  ctx.moveTo(leftBaseX, baseY)
  ctx.lineTo(leftSnow.x, leftSnow.y)
  leftSnowPoints.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(midSnow.x, midSnow.y)
  ctx.lineTo(midSnow.x, baseY)
  ctx.fill()
  //
  // Draw right rock face
  //
  ctx.fillStyle = colors.rockRight
  ctx.beginPath()
  ctx.moveTo(midSnow.x, midSnow.y)
  rightSnowPoints.forEach(p => ctx.lineTo(p.x, p.y))
  ctx.lineTo(rightSnow.x, rightSnow.y)
  ctx.lineTo(rightBaseX, baseY)
  ctx.lineTo(peakX, baseY)
  ctx.fill()
  ctx.restore()
}

/**
 * Calculates a fixed point on a line segment at a given percentage
 * @param {number} x1 - Start X
 * @param {number} y1 - Start Y
 * @param {number} x2 - End X
 * @param {number} y2 - End Y
 * @param {number} percent - Position along segment (0-100)
 * @returns {Object} Point {x, y}
 */
function fixedPointOnSegment(x1, y1, x2, y2, percent) {
  const n = percent / 100
  const a = (y2 - y1) / (x2 - x1)
  const px = x1 + (x2 - x1) * n
  const py = a * (px - x1) + y1
  return { x: px, y: py }
}

/**
 * Smooth ease-in-out curve (Hermite interpolation)
 * Accelerates from 0, decelerates toward 1
 * @param {number} t - Normalized progress (0 to 1)
 * @returns {number} Eased value (0 to 1)
 */
function smoothstep(t) {
  return t * t * (3 - 2 * t)
}

/**
 * Generates a GLSL fragment shader for the darkness overlay
 * Each light source creates a smooth gradient falloff using smoothstep
 * @param {number} maxLights - Maximum number of simultaneous light sources
 * @returns {string} GLSL fragment shader source
 */
function generateDarknessShader(maxLights) {
  let uniforms = ''
  uniforms += 'uniform float u_ambient;\n'
  uniforms += 'uniform float u_darkness;\n'
  uniforms += 'uniform float u_gw;\n'
  uniforms += 'uniform float u_gh;\n'
  uniforms += 'uniform float u_ox;\n'
  uniforms += 'uniform float u_oy;\n'
  uniforms += 'uniform float u_cr;\n'
  let lightCalc = ''
  for (let i = 0; i < maxLights; i++) {
    uniforms += `uniform vec2 u_p${i}; uniform float u_r${i}; uniform float u_i${i};\n`
    lightCalc += `d = length(wp - u_p${i}); f = smoothstep(u_r${i}, 0.0, d); light = max(light, u_i${i} * f * f);\n`
  }
  return `${uniforms}
vec4 frag(vec2 pos, vec2 uv, vec4 color, sampler2D tex) {
  vec2 lp = uv * vec2(u_gw, u_gh);
  vec2 wp = lp + vec2(u_ox, u_oy);
  float cr = u_cr;
  float ax = min(lp.x, u_gw - lp.x);
  float ay = min(lp.y, u_gh - lp.y);
  if (ax < cr && ay < cr) {
    float cd = length(vec2(cr - ax, cr - ay));
    if (cd > cr) { return vec4(0.0, 0.0, 0.0, 0.0); }
  }
  float light = u_ambient;
  float d;
  float f;
  ${lightCalc}
  return vec4(0.0, 0.0, 0.0, u_darkness * (1.0 - light));
}`
}

/**
 * Collects all light sources and builds the shader uniform object
 * Bugs and moon always emit light; creature emits light only when burning
 * @param {Object} k - Kaplay instance
 * @param {Object} glowBugInst - Main glow bug manager
 * @param {Object} trapBugInst - Trap platform glow bug manager
 * @param {Object} bottomBugInst - Bottom wall glow bug manager
 * @param {Object} creatureInst - Shadow creature instance
 * @param {number} gaWidth - Game area width
 * @param {number} gaHeight - Game area height
 * @returns {Object} Shader uniforms object
 */
function collectLightUniforms(k, glowBugInst, trapBugInst, bottomBugInst, creatureInst, gaWidth, gaHeight) {
  const lights = []
  //
  // Only glowing bugs emit light (non-glowing bugs are visible above darkness without glow)
  //
  const allEntries = [...glowBugInst.entries, ...trapBugInst.entries, ...bottomBugInst.entries]
  allEntries.forEach(entry => {
    entry.isGlowing && lights.push({
      x: entry.bug.x,
      y: entry.bug.y,
      r: DARKNESS_GLOW_RADIUS,
      i: DARKNESS_GLOW_INTENSITY
    })
  })
  //
  // Creature emits light when burning (makes body and fire visible through darkness)
  //
  creatureInst.isBurning && lights.push({
    x: creatureInst.x,
    y: creatureInst.y,
    r: DARKNESS_CREATURE_BURN_RADIUS,
    i: DARKNESS_CREATURE_BURN_INTENSITY
  })
  //
  // Build uniform object with game area dimensions and all light slots
  //
  const uniforms = {
    u_ambient: DARKNESS_AMBIENT,
    u_darkness: DARKNESS_OPACITY,
    u_gw: gaWidth,
    u_gh: gaHeight,
    u_ox: LEFT_MARGIN,
    u_oy: TOP_MARGIN,
    u_cr: CORNER_RADIUS
  }
  for (let idx = 0; idx < MAX_DARKNESS_LIGHTS; idx++) {
    const light = lights[idx]
    uniforms[`u_p${idx}`] = light ? k.vec2(light.x, light.y) : k.vec2(-9999, -9999)
    uniforms[`u_r${idx}`] = light ? light.r : 0
    uniforms[`u_i${idx}`] = light ? light.i : 0
  }
  return uniforms
}

/**
 * Draws a bright moon with soft glow above the darkness overlay
 * Simplified version of the background moon for visibility through darkness
 * @param {Object} k - Kaplay instance
 */
function drawMoonOverlay(k) {
  const GLOW_RINGS = 8
  const GLOW_OUTER = MOON_RADIUS + MOON_GLOW_RADIUS
  //
  // Draw soft radial glow rings from outer to inner
  //
  for (let i = 0; i < GLOW_RINGS; i++) {
    const t = i / GLOW_RINGS
    const ringRadius = GLOW_OUTER * (1 - t)
    const ringOpacity = t * t * 0.15
    k.drawCircle({
      pos: k.vec2(MOON_X, MOON_Y),
      radius: ringRadius,
      color: k.rgb(MOON_COLOR_R, MOON_COLOR_G, MOON_COLOR_B),
      opacity: ringOpacity
    })
  }
  //
  // Draw moon body
  //
  k.drawCircle({
    pos: k.vec2(MOON_X, MOON_Y),
    radius: MOON_RADIUS,
    color: k.rgb(MOON_COLOR_R, MOON_COLOR_G, MOON_COLOR_B),
    opacity: 1
  })
  //
  // Draw craters as darker circles
  //
  MOON_CRATERS.forEach(crater => {
    k.drawCircle({
      pos: k.vec2(
        MOON_X + crater.x * MOON_RADIUS,
        MOON_Y + crater.y * MOON_RADIUS
      ),
      radius: crater.r * MOON_RADIUS,
      color: k.rgb(
        MOON_COLOR_R - crater.dark,
        MOON_COLOR_G - crater.dark,
        MOON_COLOR_B - crater.dark
      ),
      opacity: 1
    })
  })
}

/**
 * Updates moon hover glow intensity based on mouse proximity
 * @param {Object} k - Kaplay instance
 * @param {Object} state - Moon glow state { intensity: 0-1 }
 */
function updateMoonHoverGlow(k, state) {
  const mousePos = k.mousePos()
  const dx = mousePos.x - MOON_X
  const dy = mousePos.y - MOON_Y
  const dist = Math.sqrt(dx * dx + dy * dy)
  const isHovering = dist < MOON_RADIUS + 20
  const dt = k.dt()
  const target = isHovering ? 1 : 0
  state.intensity += (target - state.intensity) * MOON_HOVER_GLOW_SPEED * dt
  state.intensity = Math.max(0, Math.min(1, state.intensity))
}

/**
 * Draws additional radial glow around the moon when hovered
 * Renders concentric circles with fading opacity for a soft glow effect
 * @param {Object} k - Kaplay instance
 * @param {Object} state - Moon glow state { intensity: 0-1 }
 */
function drawMoonHoverGlow(k, state) {
  if (state.intensity < 0.01) return
  const glowColor = k.rgb(MOON_COLOR_R, MOON_COLOR_G, MOON_COLOR_B)
  const rings = 8
  for (let i = rings; i > 0; i--) {
    const t = i / rings
    const radius = MOON_RADIUS + MOON_HOVER_GLOW_EXTRA * t
    k.drawCircle({
      pos: k.vec2(MOON_X, MOON_Y),
      radius,
      color: glowColor,
      opacity: state.intensity * 0.12 * (1 - t)
    })
  }
}

/**
 * Generates decorative stacked log pile at the given X position on the floor
 * Bottom row has 3 logs, then 2 on top, then 1 on top (pyramid shape)
 * @param {number} pileX - Center X of the pile
 * @returns {Array} Array of log objects with position, size, detail
 */
function generateDecorLogs(pileX) {
  const logs = []
  const w = DECOR_LOG_WIDTH
  const h = DECOR_LOG_HEIGHT
  const halfH = h / 2
  //
  // Bottom row: 3 logs side by side on the floor
  //
  for (let i = 0; i < 3; i++) {
    const spacing = h + 2
    logs.push({
      x: pileX + (i - 1) * spacing + (Math.random() - 0.5) * 4,
      y: FLOOR_Y - halfH,
      w,
      h,
      detail: generateLogDetail(w, h, false)
    })
  }
  //
  // Middle row: 2 logs resting in the gaps of the bottom row
  //
  const midY = FLOOR_Y - h - halfH - 2
  for (let i = 0; i < 2; i++) {
    const spacing = h + 2
    logs.push({
      x: pileX + (i - 0.5) * spacing + (Math.random() - 0.5) * 4,
      y: midY,
      w,
      h,
      detail: generateLogDetail(w, h, false)
    })
  }
  //
  // Top: 1 log balanced on the middle row
  //
  logs.push({
    x: pileX + (Math.random() - 0.5) * 6,
    y: midY - h - 2,
    w,
    h,
    detail: generateLogDetail(w, h, false)
  })
  return logs
}

/**
 * Draws decorative stacked log pile using the same drawLogPlatform as playable logs
 * @param {Object} k - Kaplay instance
 * @param {Array} logs - Array of log objects with position, size, detail
 */
function drawDecorLogs(k, logs) {
  for (const log of logs) {
    k.pushTransform()
    k.pushTranslate(log.x, log.y)
    drawLogPlatform(k, log.w, log.h, 0, 0, 1, log.detail)
    k.popTransform()
  }
}

/**
 * Generates an asymmetric snow height profile for the bottom platform
 * Uses multiple overlapping mounds for natural coverage
 * @returns {Array} Snow profile heights (normalized 0-1)
 */
function generateBottomSnowProfile() {
  const profile = new Array(BOTTOM_SNOW_STEPS + 1).fill(0)
  const moundCount = 6 + Math.floor(Math.random() * 4)
  for (let m = 0; m < moundCount; m++) {
    const center = Math.random()
    const spread = 0.08 + Math.random() * 0.15
    const height = 0.3 + Math.random() * 0.7
    for (let i = 0; i <= BOTTOM_SNOW_STEPS; i++) {
      const t = i / BOTTOM_SNOW_STEPS
      const dist = (t - center) / spread
      profile[i] += height * Math.max(0, 1 - dist * dist)
    }
  }
  const maxVal = Math.max(...profile)
  for (let i = 0; i <= BOTTOM_SNOW_STEPS; i++) {
    profile[i] = profile[i] / maxVal + (Math.random() - 0.5) * 0.06
    profile[i] = Math.max(0.05, Math.min(1, profile[i]))
  }
  profile[0] = Math.min(profile[0], 0.1)
  profile[BOTTOM_SNOW_STEPS] = Math.min(profile[BOTTOM_SNOW_STEPS], 0.1)
  return profile
}

/**
 * Draws snow covering on the bottom platform across the full playable width
 * @param {Object} k - Kaplay instance
 * @param {Array} profile - Snow profile heights (normalized 0-1)
 */
function drawBottomPlatformSnow(k, profile) {
  const leftX = LEFT_MARGIN
  const rightX = CFG.visual.screen.width - RIGHT_MARGIN
  const snowWidth = rightX - leftX
  const pts = []
  for (let i = 0; i <= BOTTOM_SNOW_STEPS; i++) {
    const t = i / BOTTOM_SNOW_STEPS
    const px = leftX + t * snowWidth
    pts.push(k.vec2(px, FLOOR_Y - BOTTOM_SNOW_HEIGHT * profile[i]))
  }
  pts.push(k.vec2(rightX, FLOOR_Y))
  pts.push(k.vec2(leftX, FLOOR_Y))
  k.drawPolygon({ pts, color: k.rgb(255, 255, 255), opacity: 0.9 })
  //
  // Subtle shadow layer for depth
  //
  const shadowPts = []
  for (let i = 0; i <= BOTTOM_SNOW_STEPS; i++) {
    const t = i / BOTTOM_SNOW_STEPS
    const px = leftX + t * snowWidth
    shadowPts.push(k.vec2(px, FLOOR_Y - BOTTOM_SNOW_HEIGHT * 0.3 * profile[i]))
  }
  shadowPts.push(k.vec2(rightX, FLOOR_Y))
  shadowPts.push(k.vec2(leftX, FLOOR_Y))
  k.drawPolygon({ pts: shadowPts, color: k.rgb(100, 130, 180), opacity: 0.4 })
}

