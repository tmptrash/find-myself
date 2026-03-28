import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { createLevelTransition } from '../../../utils/transition.js'
import * as GlowBug from '../components/glow-bug.js'
import * as ShadowCreature from '../components/shadow-creature.js'
import * as Fog from '../components/fog.js'
import * as JungleDecor from '../components/jungle-decor.js'
import { toPng } from '../../../utils/helper.js'
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
const BG_COLOR_R = 12
const BG_COLOR_G = 12
const BG_COLOR_B = 16
const BG_HEX = '#0C0C10'
//
// Wall color (deep black)
//
const WALL_COLOR_R = 8
const WALL_COLOR_G = 8
const WALL_COLOR_B = 10
const WALL_COLOR_HEX = '#08080A'
//
// Platform color (dark stone)
//
const PLATFORM_COLOR_R = 50
const PLATFORM_COLOR_G = 48
const PLATFORM_COLOR_B = 55
//
// Platform root color (very dark green)
//
const PLATFORM_ROOT_COLOR_R = 30
const PLATFORM_ROOT_COLOR_G = 38
const PLATFORM_ROOT_COLOR_B = 28
//
// Platform dimensions
//
const PLATFORM_HEIGHT = 40
const PLATFORM_CORNER_RADIUS = 8
//
// Dark outline around platforms on all sides (follows rounded corners)
//
const PLATFORM_OUTLINE_WIDTH = 3
const PLATFORM_OUTLINE_COLOR_R = 5
const PLATFORM_OUTLINE_COLOR_G = 5
const PLATFORM_OUTLINE_COLOR_B = 5
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
  { x: 1650, y: 300, width: 250 }
]
//
// Trap platform configuration (P1 splits into two halves when hero approaches)
//
const TRAP_PLATFORM_INDEX = 1
const TRAP_ACTIVATION_DELAY = 0.05
const TRAP_INITIAL_GAP = 3
//
// Each half slides out by the full platform width (2x width total gap)
//
const TRAP_MAX_SPLIT_DISTANCE = CORRIDOR_PLATFORMS[1].width
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
// Y tolerance for platform thorn collision detection (pixels)
//
const PLATFORM_THORN_TOLERANCE = 5
//
// Monster spawn position (dark corner, far from hero)
//
const MONSTER_SPAWN_X = 1600
const MONSTER_SPAWN_Y = 500
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
const BACK_CANVAS_SPRITE = 'bg-touch-level3-back'
const FRONT_TREES_SPRITE = 'bg-touch-level3-front-trees'
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
const DARK_TREES_TRUNK_COLOR = '#080808'
const DARK_TREES_LEFT_COLOR = [10, 14, 10]
const DARK_TREES_RIGHT_COLOR = [14, 18, 14]
const DARK_TREES_LAYER_WIDTH = 0.5
const DARK_TREES_HEIGHT_MIN = 400
const DARK_TREES_HEIGHT_MAX = 480
const DARK_TREES_SHARPNESS_MIN = 10
const DARK_TREES_SHARPNESS_MAX = 20
//
// Medium tree layer configuration (dark silhouettes)
//
const BG_TREES_COUNT = 12
const BG_TREES_LAYERS = 4
const BG_TREES_TRUNK_WIDTH = 0.03
const BG_TREES_TRUNK_COLOR = '#080808'
const BG_TREES_LEFT_COLOR = [12, 18, 10]
const BG_TREES_RIGHT_COLOR = [16, 22, 14]
const BG_TREES_LAYER_WIDTH = 0.3
const BG_TREES_HEIGHT_MIN = 300
const BG_TREES_HEIGHT_MAX = 380
const BG_TREES_SHARPNESS_MIN = 10
const BG_TREES_SHARPNESS_MAX = 20
//
// Foreground tree layer configuration (small, very dark, in front of creature)
//
const FRONT_TREES_COUNT = 15
const FRONT_TREES_LAYERS = 3
const FRONT_TREES_TRUNK_WIDTH = 0.03
const FRONT_TREES_TRUNK_COLOR = '#060606'
const FRONT_TREES_LEFT_COLOR = [10, 20, 8]
const FRONT_TREES_RIGHT_COLOR = [14, 28, 12]
const FRONT_TREES_LAYER_WIDTH = 0.35
const FRONT_TREES_HEIGHT_MIN = 80
const FRONT_TREES_HEIGHT_MAX = 200
const FRONT_TREES_SHARPNESS_MIN = 8
const FRONT_TREES_SHARPNESS_MAX = 18
//
// Cloud configuration (dark clouds under top wall, adapted from touch level 2)
//
const CLOUD_DENSE_COUNT = 16
const CLOUD_SPARSE_COUNT = 5
const CLOUD_DENSE_Y = TOP_MARGIN + 30
const CLOUD_SPARSE_Y_MIN = TOP_MARGIN + 50
const CLOUD_SPARSE_Y_MAX = TOP_MARGIN + 80
const CLOUD_BASE_COLOR_R = 14
const CLOUD_BASE_COLOR_G = 14
const CLOUD_BASE_COLOR_B = 18
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
// Platform root decoration count per 100px of platform width
//
const ROOTS_PER_100PX = 3
const ROOT_LENGTH_MIN = 25
const ROOT_LENGTH_MAX = 55
const ROOT_WIDTH_MIN = 2.5
const ROOT_WIDTH_MAX = 4.5
const ROOT_X_WOBBLE = 12
//
// Platform bark line count range
//
const BARK_LINES_MIN = 2
const BARK_LINES_MAX = 4
const BARK_LINE_OPACITY_MIN = 0.05
const BARK_LINE_OPACITY_MAX = 0.1
//
// Z-index layers for this level
// Back canvas (mountains + dark/medium trees) → clouds → fog → vines →
// platforms → platform visuals → foreground → creature → front trees → bugs
//
const Z_BACK_CANVAS = -95
const Z_CLOUDS = -80
const Z_FOG = -10
const Z_VINES = 0
const Z_PLATFORM_VISUALS = 2
const Z_FOREGROUND = 3
const Z_CREATURE = 5
const Z_FRONT_TREES = 6
const Z_BUGS = 8
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
    // Start touch.mp3 background music
    //
    const touchMusic = k.play('touch', {
      loop: true,
      volume: CFG.audio.backgroundMusic.touch
    })
    //
    // Stop music when leaving the scene
    //
    k.onSceneLeave(() => {
      touchMusic.stop()
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
    // Pre-generate platform decoration data (roots and bark lines)
    //
    const platformDecor = generatePlatformDecor(CORRIDOR_PLATFORMS)
    //
    // Create pre-rendered background canvas (mountains + dark/medium trees, one sprite)
    //
    createBackCanvas(k)
    //
    // Create pre-rendered foreground trees (transparent, in front of creature)
    //
    createFrontTrees(k)
    //
    // Create dark clouds under top wall
    //
    createClouds(k)
    //
    // Create level indicator (TOUCH letters)
    //
    const levelIndicator = LevelIndicator.create({
      k,
      levelNumber: 3,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    //
    // Create anti-hero on the last (upper-right) platform
    //
    const lastPlatform = CORRIDOR_PLATFORMS[CORRIDOR_PLATFORMS.length - 1]
    const antiHeroX = lastPlatform.x + lastPlatform.width / 2 - 80
    const antiHeroY = lastPlatform.y - HERO_COLLISION_HEIGHT_SCALED / 2 - 5
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
        // Stop creature and transition after annihilation to level 4
        //
        creatureInst.stopped = true
        createLevelTransition(k, 'level-touch.3', () => {
          k.go('level-touch.4')
        })
      },
      currentLevel: 'level-touch.3',
      addMouth: true
    })
    //
    // Spawn hero and anti-hero
    //
    Hero.spawn(heroInst)
    Hero.spawn(antiHeroInst)
    //
    // Create fog system
    //
    const fogInst = Fog.create({ k })
    //
    // Create glow bugs on platforms 0-2 (no bugs on anti-hero platform)
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
    //
    // Split trap platform grass blades into left/right half groups
    // so they move with their respective halves during split animation
    //
    const trapPlat = CORRIDOR_PLATFORMS[TRAP_PLATFORM_INDEX]
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
    // Draw fog layer
    //
    k.add([
      k.z(Z_FOG),
      {
        draw() {
          Fog.onDraw(fogInst)
        }
      }
    ])
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
    // Draw platform visuals with rounded edges, black stripe, and root decorations
    //
    k.add([
      k.z(Z_PLATFORM_VISUALS),
      {
        draw() {
          drawPlatformVisuals(k, platformDecor)
          drawTrapPlatformVisuals(k, trapState)
        }
      }
    ])
    //
    // Draw grass and thorns (above platforms)
    //
    k.add([
      k.z(Z_FOREGROUND),
      {
        draw() {
          JungleDecor.onDrawForeground(decorInst)
        }
      }
    ])
    //
    // Draw shadow creature (between back canvas and front trees)
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
    // Draw glow bug auras and bugs (in front of front trees)
    //
    k.add([
      k.z(Z_BUGS),
      {
        draw() {
          GlowBug.onDraw(glowBugInst)
          GlowBug.onDraw(trapBugInst)
        }
      }
    ])
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ k, showTimer: true })
    //
    // Main update loop
    //
    k.onUpdate(() => {
      onUpdate(k, fpsCounter, fogInst, glowBugInst, trapBugInst, creatureInst, heroInst, trapState, trapLeftBlades, trapRightBlades, levelIndicator)
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
 * @param {Object} fogInst - Fog instance
 * @param {Object} glowBugInst - GlowBug manager instance
 * @param {Object} trapBugInst - GlowBug instance for the trap platform right half
 * @param {Object} creatureInst - Shadow creature instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} trapState - Trap platform state
 * @param {Array} trapLeftBlades - Grass blades on the left trap half
 * @param {Array} trapRightBlades - Grass blades on the right trap half
 * @param {Object} levelIndicator - Level indicator for life score effects on death
 */
function onUpdate(k, fpsCounter, fogInst, glowBugInst, trapBugInst, creatureInst, heroInst, trapState, trapLeftBlades, trapRightBlades, levelIndicator) {
  const dt = k.dt()
  FpsCounter.onUpdate(fpsCounter)
  Fog.onUpdate(fogInst, dt)
  GlowBug.onUpdate(glowBugInst, dt)
  //
  // Update trap platform split animation and sync hero position
  //
  const prevLeftX = trapState.leftCenterX
  const prevRightX = trapState.rightCenterX
  updateTrapPlatform(trapState, heroInst, dt)
  //
  // Sync trap grass blades with platform half movement
  //
  const leftDeltaX = trapState.leftCenterX - prevLeftX
  const rightDeltaX = trapState.rightCenterX - prevRightX
  if (leftDeltaX !== 0) {
    trapLeftBlades.forEach(blade => { blade.x += leftDeltaX })
  }
  if (rightDeltaX !== 0) {
    trapRightBlades.forEach(blade => { blade.x += rightDeltaX })
  }
  //
  // Sync trap bug position and bounds with the right half movement delta
  //
  if (rightDeltaX !== 0 && trapBugInst.entries) {
    trapBugInst.entries.forEach(entry => {
      entry.bug.x += rightDeltaX
      entry.bug.bounds.minX += rightDeltaX
      entry.bug.bounds.maxX += rightDeltaX
    })
  }
  GlowBug.onUpdate(trapBugInst, dt)
  //
  // Check bottom wall and platform thorns (only when hero is alive)
  //
  if (!heroInst.isDying) {
    checkBottomThorns(k, heroInst, levelIndicator)
    checkPlatformThorns(k, heroInst, [...glowBugInst.entries, ...trapBugInst.entries], levelIndicator)
  }
  //
  // Get glow positions from both bug instances for creature AI
  //
  const glowPositions = [
    ...GlowBug.getGlowingPositions(glowBugInst),
    ...GlowBug.getGlowingPositions(trapBugInst)
  ]
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
 * Pre-generates decorative root tendrils and bark line data for each platform
 * Called once during scene setup for consistent per-frame rendering
 * @param {Array} platforms - Corridor platform definitions
 * @returns {Array} Array of { roots, barkLines } per platform
 */
function generatePlatformDecor(platforms) {
  return platforms.map(platform => {
    //
    // Generate root tendrils hanging from platform bottom
    //
    const rootCount = Math.max(2, Math.round(platform.width / 100 * ROOTS_PER_100PX))
    const roots = []
    for (let i = 0; i < rootCount; i++) {
      const frac = (i + 0.5) / rootCount
      roots.push({
        startX: platform.x - platform.width / 2 + frac * platform.width,
        endXOffset: (Math.random() - 0.5) * ROOT_X_WOBBLE,
        length: ROOT_LENGTH_MIN + Math.random() * (ROOT_LENGTH_MAX - ROOT_LENGTH_MIN),
        width: ROOT_WIDTH_MIN + Math.random() * (ROOT_WIDTH_MAX - ROOT_WIDTH_MIN)
      })
    }
    //
    // Generate horizontal bark grain lines on platform surface
    //
    const lineCount = BARK_LINES_MIN + Math.floor(Math.random() * (BARK_LINES_MAX - BARK_LINES_MIN + 1))
    const barkLines = []
    for (let i = 0; i < lineCount; i++) {
      const startFrac = Math.random() * 0.3
      const endFrac = startFrac + 0.2 + Math.random() * 0.5
      barkLines.push({
        startX: platform.x - platform.width / 2 + PLATFORM_CORNER_RADIUS + startFrac * (platform.width - PLATFORM_CORNER_RADIUS * 2),
        endX: platform.x - platform.width / 2 + PLATFORM_CORNER_RADIUS + Math.min(endFrac, 1) * (platform.width - PLATFORM_CORNER_RADIUS * 2),
        yOffset: 10 + Math.random() * (PLATFORM_HEIGHT - 18),
        opacity: BARK_LINE_OPACITY_MIN + Math.random() * (BARK_LINE_OPACITY_MAX - BARK_LINE_OPACITY_MIN)
      })
    }
    return { roots, barkLines }
  })
}

/**
 * Draws platform visuals with black outline, rounded edges, bark texture, and hanging roots
 * Skips the trap platform (drawn separately via drawTrapPlatformVisuals)
 * @param {Object} k - Kaplay instance
 * @param {Array} platformDecor - Pre-generated decoration data per platform
 */
function drawPlatformVisuals(k, platformDecor) {
  const platformColor = k.rgb(PLATFORM_COLOR_R, PLATFORM_COLOR_G, PLATFORM_COLOR_B)
  const outlineColor = k.rgb(PLATFORM_OUTLINE_COLOR_R, PLATFORM_OUTLINE_COLOR_G, PLATFORM_OUTLINE_COLOR_B)
  const rootColor = k.rgb(PLATFORM_ROOT_COLOR_R, PLATFORM_ROOT_COLOR_G, PLATFORM_ROOT_COLOR_B)
  const barkColor = k.rgb(PLATFORM_COLOR_R - 15, PLATFORM_COLOR_G - 15, PLATFORM_COLOR_B - 10)
  CORRIDOR_PLATFORMS.forEach((platform, idx) => {
    if (idx === TRAP_PLATFORM_INDEX) return
    drawSinglePlatform(k, platform.x, platform.y, platform.width, platformColor, outlineColor, rootColor, barkColor, platformDecor[idx])
  })
}

/**
 * Draws a single platform with black outline on all sides, rounded edges, bark lines, and roots
 * Outline is drawn first as a larger rounded rect, then fill on top
 * @param {Object} k - Kaplay instance
 * @param {number} centerX - Platform center X
 * @param {number} topY - Platform top surface Y
 * @param {number} width - Platform width
 * @param {Object} platformColor - Main platform color
 * @param {Object} outlineColor - Black outline color
 * @param {Object} rootColor - Root tendril color
 * @param {Object} barkColor - Bark line color
 * @param {Object} decor - Pre-generated decoration data (roots, barkLines)
 */
function drawSinglePlatform(k, centerX, topY, width, platformColor, outlineColor, rootColor, barkColor, decor) {
  const left = centerX - width / 2
  const r = PLATFORM_CORNER_RADIUS
  const ow = PLATFORM_OUTLINE_WIDTH
  //
  // Draw black outline (slightly larger rounded rect behind the fill)
  //
  drawRoundedRect(k, left - ow, topY - ow, width + ow * 2, PLATFORM_HEIGHT + ow * 2, r + ow, outlineColor)
  //
  // Draw platform fill on top
  //
  drawRoundedRect(k, left, topY, width, PLATFORM_HEIGHT, r, platformColor)
  //
  // Draw bark grain lines for wood texture
  //
  decor?.barkLines?.forEach(line => {
    k.drawLine({
      p1: k.vec2(line.startX, topY + line.yOffset),
      p2: k.vec2(line.endX, topY + line.yOffset),
      width: 1,
      color: barkColor,
      opacity: line.opacity
    })
  })
  //
  // Draw root tendrils hanging from platform bottom with gentle sway
  //
  const time = k.time()
  decor?.roots?.forEach((root, i) => {
    const sway = Math.sin(time * 1.2 + root.startX * 0.1 + i) * 4
    k.drawLine({
      p1: k.vec2(root.startX, topY + PLATFORM_HEIGHT),
      p2: k.vec2(root.startX + root.endXOffset + sway, topY + PLATFORM_HEIGHT + root.length),
      width: root.width,
      color: rootColor,
      opacity: 0.8
    })
  })
}

/**
 * Draws the trap platform halves at their current positions
 * Each half has black outline on all sides following rounded corners
 * @param {Object} k - Kaplay instance
 * @param {Object} trapState - Trap platform state with current positions
 */
function drawTrapPlatformVisuals(k, trapState) {
  const platformColor = k.rgb(PLATFORM_COLOR_R, PLATFORM_COLOR_G, PLATFORM_COLOR_B)
  const outlineColor = k.rgb(PLATFORM_OUTLINE_COLOR_R, PLATFORM_OUTLINE_COLOR_G, PLATFORM_OUTLINE_COLOR_B)
  const { leftCenterX, rightCenterX, y, halfWidth } = trapState
  const r = PLATFORM_CORNER_RADIUS
  const ow = PLATFORM_OUTLINE_WIDTH
  //
  // Draw left half with outline
  //
  const leftEdge = leftCenterX - halfWidth / 2
  drawRoundedRect(k, leftEdge - ow, y - ow, halfWidth + ow * 2, PLATFORM_HEIGHT + ow * 2, r + ow, outlineColor)
  drawRoundedRect(k, leftEdge, y, halfWidth, PLATFORM_HEIGHT, r, platformColor)
  //
  // Draw right half with outline
  //
  const rightEdge = rightCenterX - halfWidth / 2
  drawRoundedRect(k, rightEdge - ow, y - ow, halfWidth + ow * 2, PLATFORM_HEIGHT + ow * 2, r + ow, outlineColor)
  drawRoundedRect(k, rightEdge, y, halfWidth, PLATFORM_HEIGHT, r, platformColor)
}

/**
 * Draws a rounded rectangle using 2 overlapping rects and 4 corner circles
 * Works without engine-level radius support
 * @param {Object} k - Kaplay instance
 * @param {number} x - Left edge X
 * @param {number} y - Top edge Y
 * @param {number} w - Width
 * @param {number} h - Height
 * @param {number} r - Corner radius
 * @param {Object} color - Kaplay color object
 */
function drawRoundedRect(k, x, y, w, h, r, color) {
  //
  // Horizontal strip (full width, excluding top/bottom corner strips)
  //
  k.drawRect({
    pos: k.vec2(x, y + r),
    width: w,
    height: h - 2 * r,
    color
  })
  //
  // Vertical strip (excluding left/right corner strips)
  //
  k.drawRect({
    pos: k.vec2(x + r, y),
    width: w - 2 * r,
    height: h,
    color
  })
  //
  // Four corner circles
  //
  k.drawCircle({ pos: k.vec2(x + r, y + r), radius: r, color })
  k.drawCircle({ pos: k.vec2(x + w - r, y + r), radius: r, color })
  k.drawCircle({ pos: k.vec2(x + r, y + h - r), radius: r, color })
  k.drawCircle({ pos: k.vec2(x + w - r, y + h - r), radius: r, color })
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
  // Top-left corner
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, TOP_MARGIN),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Top-right corner (rotate 90°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, TOP_MARGIN),
    k.rotate(90),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Bottom-left corner (rotate 270°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, CFG.visual.screen.height - BOTTOM_MARGIN),
    k.rotate(270),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
  //
  // Bottom-right corner (rotate 180°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, CFG.visual.screen.height - BOTTOM_MARGIN),
    k.rotate(180),
    k.z(CFG.visual.zIndex.platforms + 1)
  ])
}

/**
 * Creates a single pre-rendered background canvas containing mountains, dark trees,
 * and medium trees. Rendered once via toPng for performance.
 * @param {Object} k - Kaplay instance
 */
function createBackCanvas(k) {
  const screenWidth = CFG.visual.screen.width
  const screenHeight = CFG.visual.screen.height
  const screenThird = screenWidth / 3
  //
  // Render mountains + all back trees into one canvas
  //
  const png = toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
    ctx.imageSmoothingEnabled = false
    //
    // Fill sky with background color for seamless blending
    //
    ctx.fillStyle = BG_HEX
    ctx.fillRect(0, 0, screenWidth, screenHeight)
    //
    // Draw crescent moon with soft glow
    //
    drawMoon(ctx)
    //
    // Draw three mountains (left, center, right)
    //
    drawMountainShape(ctx, LEFT_MOUNTAIN.xOffset, FLOOR_Y, screenThird + LEFT_MOUNTAIN.widthExtra, LEFT_MOUNTAIN, LEFT_MOUNTAIN.colors)
    drawMountainShape(ctx, screenThird + CENTER_MOUNTAIN.xOffset, FLOOR_Y, screenThird + CENTER_MOUNTAIN.widthExtra, CENTER_MOUNTAIN, CENTER_MOUNTAIN.colors)
    drawMountainShape(ctx, screenThird * 2 + RIGHT_MOUNTAIN.xOffset, FLOOR_Y, screenThird + RIGHT_MOUNTAIN.widthExtra, RIGHT_MOUNTAIN, RIGHT_MOUNTAIN.colors)
    //
    // Draw dark tree silhouettes (furthest back, single layer)
    //
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
    //
    // Draw medium trees (multi-layered, slightly brighter)
    //
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
  k.loadSprite(BACK_CANVAS_SPRITE, png)
  //
  // Display back canvas behind creature
  //
  k.add([
    k.z(Z_BACK_CANVAS),
    {
      draw() {
        k.drawSprite({
          sprite: BACK_CANVAS_SPRITE,
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
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
  // Display front trees in front of creature for depth
  //
  k.add([
    k.z(Z_FRONT_TREES),
    {
      draw() {
        k.drawSprite({
          sprite: FRONT_TREES_SPRITE,
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}

/**
 * Creates dark clouds under the top wall, adapted from touch level 2
 * Dense layer at top for solid coverage, sparse layer below for wispy effect
 * @param {Object} k - Kaplay instance
 */
function createClouds(k) {
  const baseColor = k.rgb(CLOUD_BASE_COLOR_R, CLOUD_BASE_COLOR_G, CLOUD_BASE_COLOR_B)
  const screenWidth = CFG.visual.screen.width
  const cloudStartX = LEFT_MARGIN + 50
  const cloudEndX = screenWidth - RIGHT_MARGIN - 50
  const cloudWidth = cloudEndX - cloudStartX
  //
  // Cloud shape templates (puffs relative to mainSize)
  //
  const cloudTypes = [
    {
      mainSize: 70,
      puffs: [
        { radius: 0.7, offsetX: -0.8, offsetY: -0.05 },
        { radius: 0.75, offsetX: -0.4, offsetY: -0.1 },
        { radius: 0.65, offsetX: 0.4, offsetY: -0.1 },
        { radius: 0.7, offsetX: 0.8, offsetY: -0.05 },
        { radius: 0.6, offsetX: -0.2, offsetY: 0.15 },
        { radius: 0.6, offsetX: 0.2, offsetY: 0.15 }
      ],
      opacity: 0.5
    },
    {
      mainSize: 55,
      puffs: [
        { radius: 0.8, offsetX: -0.7, offsetY: 0 },
        { radius: 0.85, offsetX: -0.3, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.3, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.7, offsetY: 0 },
        { radius: 0.7, offsetX: 0, offsetY: 0.12 }
      ],
      opacity: 0.45
    },
    {
      mainSize: 45,
      puffs: [
        { radius: 0.75, offsetX: -0.6, offsetY: 0 },
        { radius: 0.8, offsetX: -0.2, offsetY: -0.08 },
        { radius: 0.8, offsetX: 0.2, offsetY: -0.08 },
        { radius: 0.75, offsetX: 0.6, offsetY: 0 }
      ],
      opacity: 0.4
    }
  ]
  //
  // Generate dense layer clouds at top (solid coverage, no gaps)
  //
  const denseSpacing = cloudWidth / (CLOUD_DENSE_COUNT - 1)
  for (let i = 0; i < CLOUD_DENSE_COUNT; i++) {
    const baseX = cloudStartX + denseSpacing * i
    const randomOffset = (Math.random() - 0.5) * (denseSpacing * 0.6)
    const cloudX = baseX + randomOffset
    //
    // Distribute into 2 rows for solid coverage
    //
    const rowIndex = i % 2
    const cloudY = CLOUD_DENSE_Y + rowIndex * 8 + (Math.random() - 0.5) * 3
    const cloudType = cloudTypes[i % cloudTypes.length]
    const sizeVariation = 1.0 + Math.random() * 0.4
    const mainSize = cloudType.mainSize * sizeVariation
    addCloudObject(k, cloudX, cloudY, mainSize, cloudType, baseColor)
  }
  //
  // Generate sparse layer clouds below (fewer, more spread out)
  //
  const sparseSpacing = cloudWidth / (CLOUD_SPARSE_COUNT - 1)
  for (let i = 0; i < CLOUD_SPARSE_COUNT; i++) {
    const baseX = cloudStartX + sparseSpacing * i
    const randomOffset = (Math.random() - 0.5) * 40
    const cloudX = baseX + randomOffset
    const sparseRange = CLOUD_SPARSE_Y_MAX - CLOUD_SPARSE_Y_MIN
    const cloudY = CLOUD_SPARSE_Y_MIN + Math.random() * Math.random() * sparseRange
    const cloudType = cloudTypes[(i + CLOUD_DENSE_COUNT) % cloudTypes.length]
    const sizeVariation = 1.0 + Math.random() * 0.3
    const mainSize = cloudType.mainSize * sizeVariation
    addCloudObject(k, cloudX, cloudY, mainSize, cloudType, baseColor)
  }
}

/**
 * Adds a single cloud game object with puff circles at the given position
 * @param {Object} k - Kaplay instance
 * @param {number} x - Cloud center X
 * @param {number} y - Cloud center Y
 * @param {number} mainSize - Main circle radius
 * @param {Object} cloudType - Cloud template with puffs and opacity
 * @param {Object} color - Kaplay color object
 */
function addCloudObject(k, x, y, mainSize, cloudType, color) {
  const opacityVariation = 0.9 + Math.random() * 0.2
  const opacity = cloudType.opacity * opacityVariation
  //
  // Capture puff data for draw closure
  //
  const puffs = cloudType.puffs
  k.add([
    k.pos(x, y),
    k.z(Z_CLOUDS),
    {
      draw() {
        //
        // Main cloud body
        //
        k.drawCircle({
          radius: mainSize,
          pos: k.vec2(0, 0),
          color,
          opacity
        })
        //
        // Draw puff circles around main body
        //
        puffs.forEach(puff => {
          k.drawCircle({
            radius: mainSize * puff.radius,
            pos: k.vec2(puff.offsetX * mainSize, puff.offsetY * mainSize),
            color,
            opacity
          })
        })
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
