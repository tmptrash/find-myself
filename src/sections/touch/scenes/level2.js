import { CFG } from '../cfg.js'
import { CFG as GLOBAL_CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { toPng, getRGB } from '../../../utils/helper.js'
import { drawFirTree } from '../components/fir-tree.js'
import * as Dust from '../components/dust.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { arcY } from '../utils/trees.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as LifeDeduction from '../utils/life-deduction.js'
import * as BonusHero from '../components/bonus-hero.js'
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Rounded corner configuration for game area
//
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'touch2-corner-sprite'
const WALL_COLOR_HEX = '#1F1F1F'
//
// Platform dimensions
//
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN
//
// Hero spawn positions
//
const HERO_SPAWN_X = CFG.visual.screen.width - RIGHT_MARGIN - 250
const HERO_SPAWN_Y = FLOOR_Y - 50
//
// Icicle spike configuration (deadly floor barrier)
//
const ICICLE_HEIGHT_MIN = 30
const ICICLE_HEIGHT_MAX = 55
const ICICLE_WIDTH_MIN = 16
const ICICLE_WIDTH_MAX = 30
const ICICLE_SPACING = 22
const ICICLE_SAFE_ZONE_X = CFG.visual.screen.width - RIGHT_MARGIN - 550
const ICICLE_COLOR_R = 255
const ICICLE_COLOR_G = 255
const ICICLE_COLOR_B = 255
const ICICLE_OUTLINE_WIDTH = 2
const ICICLE_KILL_TOLERANCE = 10
const HERO_FEET_OFFSET = 35
//
// Right-side floor icicles: single row left of the rightmost platform
//
const RIGHT_ICICLE_START_X = ICICLE_SAFE_ZONE_X + 80
const RIGHTMOST_PLATFORM_LEFT_EDGE = CFG.visual.screen.width - RIGHT_MARGIN - 200 - 70
const RIGHT_ICICLE_END_X = RIGHTMOST_PLATFORM_LEFT_EDGE - 30
const RIGHT_ICICLE_HERO_CLEAR_X = HERO_SPAWN_X
const RIGHT_ICICLE_HERO_CLEAR_RADIUS = 80
const RIGHT_ICICLE_SPACING = 30
//
// Hanging icicles under log platforms (appear after life deduction)
//
const HANGING_ICICLE_COUNT_PER_PLATFORM = 6
const HANGING_ICICLE_HEIGHT_MIN = 14
const HANGING_ICICLE_HEIGHT_MAX = 26
const HANGING_ICICLE_WIDTH_MIN = 5
const HANGING_ICICLE_WIDTH_MAX = 10
const HANGING_ICICLE_SKIP_INDICES = [1]
//
// Icicle wobble (random icicles wobble left/right one at a time with creak)
//
const ICICLE_WOBBLE_INTERVAL_MIN = 2
const ICICLE_WOBBLE_INTERVAL_MAX = 5
const ICICLE_WOBBLE_DURATION = 1.2
const ICICLE_WOBBLE_AMPLITUDE = 3
//
// Decorative floor logs (stacked piles between icicles and in the safe zone)
//
const DECOR_LOG_PILE_POSITIONS = [
  LEFT_MARGIN + 200,
  ICICLE_SAFE_ZONE_X + 130
]
const DECOR_LOG_Z = 5
const DECOR_LOG_WIDTH = 120
const DECOR_LOG_HEIGHT = 30
//
// Snowflake hero push (snowflakes fly when hero runs past)
//
const SNOW_PUSH_DISTANCE = 60
const SNOW_PUSH_STRENGTH = 25
const SNOW_PUSH_DOWN_BOOST = 10
//
// Tooltip texts and layout
//
const ICICLE_TOOLTIP_TEXT = "I'm an icicle.\ncome closer and lick me"
const ICICLE_TOOLTIP_Y_OFFSET = -30
const ANTIHERO_TOOLTIP_TEXT = "I'm here :)"
const ANTIHERO_TOOLTIP_HOVER_SIZE = 80
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
const TOUCH_INDICATOR_TOOLTIP_TEXT = "here you see how far you have\ncome in learning touch"
const TOUCH_INDICATOR_TOOLTIP_WIDTH = 250
const TOUCH_INDICATOR_TOOLTIP_HEIGHT = 50
const TOUCH_INDICATOR_TOOLTIP_Y_OFFSET = -30
const GREEN_TIMER_TOOLTIP_TEXT = "complete the level in time\nto earn more points"
const GREEN_TIMER_TOOLTIP_WIDTH = 80
const GREEN_TIMER_TOOLTIP_HEIGHT = 20
const GREEN_TIMER_TOOLTIP_Y_OFFSET = 30
const FPS_COUNTER_TOP_Y = 55
const SMALL_HERO_TOOLTIP_TEXT = "your points"
const SMALL_HERO_TOOLTIP_SIZE = 60
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_TEXT = "life score"
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50
//
// Hero tooltip
//
const HERO_TOOLTIP_TEXT = "maybe here I'm not\nfinding myself...\nbut the platforms"
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -100
//
// Moon hover glow configuration
//
const MOON_HOVER_GLOW_EXTRA = 40
const MOON_HOVER_GLOW_SPEED = 3
//
// Antihero platform tooltip (log where antihero stands)
//
const ANTIHERO_PLATFORM_TOOLTIP_TEXT = "there are other\nplatforms below..."
const ANTIHERO_PLATFORM_TOOLTIP_Y_OFFSET = 40
//
// Antihero timed hint (shown if player hasn't completed level in time)
//
const ANTIHERO_HINT_DELAY = 60
const ANTIHERO_HINT_TEXT = "use the edges\nof the platforms..."
const ANTIHERO_HINT_DISPLAY_TIME = 8
const ANTIHERO_HINT_Y_OFFSET = -140
//
// Jump ring: expanding circle of particles radiating from hero's feet
//
const JUMP_RING_PARTICLE_COUNT = 28
const JUMP_RING_EXPAND_SPEED = 300
const JUMP_RING_LIFETIME = 0.6
const JUMP_RING_PARTICLE_SIZE = 2.5
const JUMP_RING_JITTER = 6
const JUMP_RING_COLOR_R = 200
const JUMP_RING_COLOR_G = 220
const JUMP_RING_COLOR_B = 255
const JUMP_RING_FOOT_OFFSET_Y = 40
//
// Speed bonus constants
//
const SPEED_BONUS_FLASH_COUNT = 20
const SPEED_BONUS_FLASH_INTERVAL = 0.05
const SPEED_BONUS_PARTICLE_COUNT = 8
const SPEED_BONUS_PARTICLE_SPEED_MIN = 30
const SPEED_BONUS_PARTICLE_SPEED_RANGE = 20
const SPEED_BONUS_PARTICLE_SIZE_MIN = 4
const SPEED_BONUS_PARTICLE_SIZE_RANGE = 4
const SPEED_BONUS_PARTICLE_LIFETIME_MIN = 0.8
const SPEED_BONUS_PARTICLE_LIFETIME_RANGE = 0.4
//
// Log platform visual constants (rounded wooden look)
//
const LOG_BARK_COLOR_HEX = '#5C3A1E'
const LOG_BARK_LIGHT_HEX = '#7A5030'
const LOG_BARK_DARK_HEX = '#3E2510'
const LOG_RING_COLOR_HEX = '#A07050'
const LOG_RING_DARK_HEX = '#6B4930'
const LOG_CORE_COLOR_HEX = '#C4956A'
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
// Life deduction (level-specific flags and thresholds, up to 2 deductions)
//
const LIFE_DEDUCT_THRESHOLD = 10
const LIFE_DEDUCT_FLAG = 'touch.level2TrapCount'
const LIFE_DEDUCT_VISITED_FLAG = 'touch.level2Visited'
const LIFE_DEDUCT_ICICLES_FLAG = 'touch.level2IciclesActive'
const LIFE_DEDUCT_TRAP_FLAG = 'touch.level2TrapActive'
const LIFE_DEDUCT_MAX_COUNT = 2
//
// Trap platform: the second-to-last platform slides away on first approach
//
const TRAP_PLATFORM_SLIDE_SPEED = 1200
const TRAP_PLATFORM_RETURN_SPEED = 600
const TRAP_PLATFORM_SLIDE_DISTANCE = 400
const TRAP_PLATFORM_TRIGGER_RADIUS = 80
const TRAP_PLATFORM_PAUSE_DURATION = 0.3
//
// Tree wind sway configuration (front-row trees oscillate gently)
//
const TREE_SWAY_AMPLITUDE = 3
const TREE_SWAY_SPEED = 1.2
//
// Snow clump constants (small extra snow pieces scattered on the mound)
//
const SNOW_CLUMP_COUNT_MIN = 3
const SNOW_CLUMP_COUNT_MAX = 6
const SNOW_CLUMP_RADIUS_MIN = 3
const SNOW_CLUMP_RADIUS_MAX = 8
//
// Moon configuration (drawn on mountains canvas)
//
const MOON_X = 1400
const MOON_Y = 320
const MOON_RADIUS = 56
const MOON_COLOR_R = 200
const MOON_COLOR_G = 195
const MOON_COLOR_B = 180
const MOON_GLOW_RADIUS = 30
//
// Pre-defined crater positions relative to moon center (fraction of radius)
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
/**
 * Level 2 scene for touch section - Simple level without obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel2(k) {
  k.scene("level-touch.2", () => {
    //
    // Save progress
    //
    set('lastLevel', 'level-touch.2')
    //
    // Set gravity
    //
    k.setGravity(CFG.game.gravity)
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    //
    // Start touch.mp3 background music with same volume as level 0
    // Use global CFG to ensure same volume as level 0
    //
    const touchMusic = k.play('touch', {
      loop: true,
      volume: GLOBAL_CFG.audio.backgroundMusic.touch
    })
    //
    // Ensure music volume is set correctly (same as level 0)
    // Set volume explicitly to match level 0 using global CFG
    //
    k.wait(0.1, () => {
      touchMusic.volume = GLOBAL_CFG.audio.backgroundMusic.touch
    })
    //
    // Stop music when leaving the scene
    //
    k.onSceneLeave(() => {
      touchMusic.stop()
    })
    //
    // Set background to match wall color (prevents visible bars at top/bottom)
    //
    k.setBackground(k.rgb(31, 31, 31))
    //
    // Draw background (black)
    //
    //
    // Create dark mountains in the background
    //
    createMountains(k)
    //
    // Create dark bushes on background
    //
    createBackgroundBushesNear(k)  // Near layer - grayer, shorter
    //
    // Create darkest background trees (third layer - darkest and tallest)
    //
    createBackgroundDarkestTrees(k)
    //
    // Create background dark trees (larger, darker, more of them)
    //
    createBackgroundDarkTrees(k)
    //
    // Create foreground trees with gray color (from previous level) in front of hero
    //
    createForegroundTrees(k)
    //
    // Create walls
    //
    // Left wall (full height)
    //
    k.add([
      k.rect(LEFT_MARGIN, CFG.visual.screen.height),
      k.pos(LEFT_MARGIN / 2, CFG.visual.screen.height / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
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
      k.color(31, 31, 31),
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
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create rounded corners at all four game area corners
    //
    createRoundedCorners(k)
    //
    // Check completed sections for hero appearance
    //
    const isTouchComplete = get('touch.completed', false)
    const isTimeComplete = get('time.completed', false)
    const isWordComplete = get('word.completed', false)
    //
    // Hero body color: red if word complete, orange if time complete, brown if touch complete, otherwise gray
    //
    const heroBodyColor = isWordComplete ? "#E74C3C" : isTimeComplete ? "#FF8C00" : isTouchComplete ? "#8B5A50" : "#C0C0C0"
    //
    // Create level indicator (TOUCH letters)
    //
    const levelIndicator = LevelIndicator.create({
      k,
      levelNumber: 2,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      heroBodyColor,
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    //
    // Life deduction logic: icicles hidden until 1st deduction, trap platform until 2nd.
    // Same "first visit → second visit" pattern per deduction.
    //
    const currentLifeScore = get('lifeScore', 0)
    const trapCount = get(LIFE_DEDUCT_FLAG, 0)
    const iciclesAlreadyActive = get(LIFE_DEDUCT_ICICLES_FLAG, false)
    const trapAlreadyActive = get(LIFE_DEDUCT_TRAP_FLAG, false)
    const alreadyVisited = get(LIFE_DEDUCT_VISITED_FLAG, false)
    const eligible = trapCount < LIFE_DEDUCT_MAX_COUNT && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    //
    // Determine whether to show deduction on this load
    //
    let showTrap = false
    if (eligible && !alreadyVisited) {
      set(LIFE_DEDUCT_VISITED_FLAG, true)
    } else if (eligible && alreadyVisited) {
      showTrap = true
      set(LIFE_DEDUCT_VISITED_FLAG, false)
    }
    //
    // Resolve active states: icicles after 1st deduction, trap after 2nd
    //
    let iciclesActive = iciclesAlreadyActive
    let trapPlatformActive = trapAlreadyActive
    if (showTrap) {
      const nextCount = trapCount + 1
      if (nextCount >= 1) iciclesActive = true
      if (nextCount >= 2) trapPlatformActive = true
    }
    //
    // Scene-level lock: hero controls disabled during life deduction animation
    //
    const sceneLock = { locked: showTrap }
    //
    // Bottom platform (full width)
    //
    k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height - BOTTOM_MARGIN / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(31, 31, 31),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create clouds under top platform (top wall)
    //
    createCloudsUnderTopPlatform(k)
    //
    // Create platforms first to get first platform position and states
    //
    const platformsData = createDiagonalPlatforms(k, trapPlatformActive)
    const firstPlatform = platformsData.firstPlatform
    const platformStates = platformsData.platformStates
    //
    // Create anti-hero on first platform (top-left)
    //
    const antiHeroInst = Hero.create({
      k,
      x: firstPlatform.x,
      y: firstPlatform.y - 50,  // Above platform
      type: Hero.HEROES.ANTIHERO,
      controllable: false,
      sfx: sound,
      antiHero: null,
      addArms: true
    })
    //
    // Hide character immediately to prevent double appearance
    //
    if (antiHeroInst.character) {
      antiHeroInst.character.hidden = true
    }
    //
    // Create hero with anti-hero reference for annihilation
    //
    //
    // Snow color for dust particles (matching snowdrifts)
    //
    const snowColor = '#FFFFFF' // Pure white in hex
    
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: antiHeroInst,
      dustColor: snowColor,
      onAnnihilation: () => {
        //
        // Check for speed bonus before scoring
        //
        const levelTime = FpsCounter.getLevelTime(fpsCounter)
        const speedBonusEarned = checkSpeedBonus(levelTime)
        const currentScore = get('heroScore', 0)
        const pointsToAdd = speedBonusEarned ? 3 : 1
        const newScore = currentScore + pointsToAdd
        set('heroScore', newScore)
        levelIndicator?.updateHeroScore?.(newScore)
        sound && Sound.playVictorySound(sound)
        speedBonusEarned && playSpeedBonusEffects(k, levelIndicator)
        const transitionDelay = speedBonusEarned ? 2.3 : 1.3
        k.wait(transitionDelay, () => {
          Sound.stopAmbient(sound)
          touchMusic.stop()
          createLevelTransition(k, 'level-touch.2', () => {
            k.go('level-touch.3')
          })
        })
      },
      currentLevel: 'level-touch.2',
      jumpForce: CFG.game.jumpForce,
      addMouth: isWordComplete,
      addArms: isTouchComplete,
      bodyColor: heroBodyColor
    })
    //
    // Lock hero controls while life deduction animation plays
    //
    if (sceneLock.locked) {
      heroInst.controlsDisabled = true
      sceneLock.heroInst = heroInst
    }
    //
    // Show life deduction animation if eligible on second visit.
    // Updates deduct count and activates icicles/trap depending on which deduction this is.
    //
    if (showTrap) {
      const nextCount = trapCount + 1
      const extraFlags = []
      if (nextCount >= 1) extraFlags.push(LIFE_DEDUCT_ICICLES_FLAG)
      if (nextCount >= 2) extraFlags.push(LIFE_DEDUCT_TRAP_FLAG)
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        deductFlagValue: trapCount + 1,
        extraFlags,
        sceneLock,
        onComplete: () => {
          if (!iciclesAlreadyActive) {
            //
            // First deduction: populate left-side floor icicles and hanging platform icicles
            //
            generateIcicles().forEach(ic => icicleData.push(ic))
            generateHangingIcicles(platformStates).forEach(ic => hangingIcicleData.push(ic))
          }
        }
      })
    }
    //
    // Hide character immediately to prevent double appearance
    //
    if (heroInst.character) {
      heroInst.character.hidden = true
    }
    //
    // Spawn hero after delay
    //
    const HERO_SPAWN_DELAY = 0.5
    let heroSpawned = false
    k.wait(HERO_SPAWN_DELAY, () => {
      if (!heroSpawned && heroInst.character) {
        Hero.spawn(heroInst)
        heroSpawned = true
      }
    })
    //
    // Spawn anti-hero after delay
    //
    let antiHeroSpawned = false
    k.wait(HERO_SPAWN_DELAY, () => {
      if (!antiHeroSpawned && antiHeroInst.character) {
        Hero.spawn(antiHeroInst)
        antiHeroSpawned = true
      }
    })
    //
    // Create dust particles in game area only
    // Use snow color for particles (same as snow platform)
    //
    const dustInst = Dust.create({ 
      k,
      bounds: {
        left: LEFT_MARGIN,
        right: CFG.visual.screen.width - RIGHT_MARGIN,
        top: TOP_MARGIN,
        bottom: CFG.visual.screen.height - BOTTOM_MARGIN
      },
      color: { r: 255, g: 255, b: 255 }  // Snow color (pure white)
    })
    //
    // Create blue snow drifts on bottom platform floor
    //
    createSnowDrifts(k)
    //
    // Hidden bonus hero on left wall, above the icicles.
    // Only reachable by jumping from an upper platform and flying left.
    //
    const BONUS_PLATFORM_X = LEFT_MARGIN + 50
    const BONUS_PLATFORM_Y = FLOOR_Y - 200
    BonusHero.create({
      k,
      x: BONUS_PLATFORM_X,
      y: BONUS_PLATFORM_Y,
      width: 70,
      heroInst,
      levelIndicator,
      sfx: sound,
      approachFromAbove: true,
      revealDistance: 120,
      heroBodyColor,
      storageKey: 'touch.level2BonusCollected',
      hintText: "delayed gratification is\noften better than instant"
    })
    //
    // Right-side floor icicles always present from the start.
    // Left-side floor icicles appear only after the first life deduction.
    //
    const leftIcicles = iciclesActive ? generateIcicles() : []
    const icicleData = [...generateRightIcicles(), ...leftIcicles]
    //
    // Hanging icicles under log platforms (only after life deduction)
    //
    const hangingIcicleData = iciclesActive ? generateHangingIcicles(platformStates) : []
    k.add([
      k.pos(0, 0),
      k.z(11),
      {
        draw() {
          if (icicleData.length > 0) drawIcicles(k, icicleData)
          if (hangingIcicleData.length > 0) drawHangingIcicles(k, hangingIcicleData, platformStates)
        }
      }
    ])
    const icicleWobbleState = {
      timer: 2 + Math.random() * 2,
      activeIndex: -1,
      elapsed: 0,
      prevWobbleDir: 0
    }
    k.onUpdate(() => {
      if (icicleData.length > 0) updateIcicleWobble(k, icicleData, icicleWobbleState, sound)
    })
    //
    // Generate decorative background logs at multiple spots
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
    // Platform visibility system
    //
    const VISIBILITY_RADIUS = 120  // Reduced radius for tighter detection
    const VISIBILITY_DURATION = 2.0
    const MAX_JUMPS = 3
    const PLATFORM_HEIGHT = 30  // Platform height constant
    let wasGrounded = false
    //
    // Create hero influence radius halo (visible circle around hero)
    // Draw halo in onDraw callback to ensure it's always visible
    //
    k.onDraw(() => {
      //
      // Draw influence radius halo around hero
      // Only draw when hero exists and character is available
      // Single outer circle at maximum radius, barely visible
      //
      if (!heroInst || !heroInst.character || !heroInst.character.pos) return
      
      const heroX = heroInst.character.pos.x
      const heroY = heroInst.character.pos.y
      
      //
      // Draw single outer circle at maximum radius
      //
      const glowColor = k.rgb(255, 255, 255)  // White matching snow theme
      const haloOpacity = 0.08  // Barely visible opacity
      
      k.drawCircle({
        radius: VISIBILITY_RADIUS,
        pos: k.vec2(heroX, heroY),
        color: glowColor,
        opacity: haloOpacity
      })
    })
    //
    // Update dust and platform visibility
    //
    //
    // Track hero's previous X position for snowflake push direction
    //
    let lastHeroX = heroInst.character?.pos?.x ?? HERO_SPAWN_X
    k.onUpdate(() => {
      const dt = k.dt()
      Dust.onUpdate(dustInst, dt)
      //
      // Push snowflakes in hero's movement direction (like leaves in level 1)
      //
      if (heroInst.character?.pos) {
        const heroX = heroInst.character.pos.x
        const heroY = heroInst.character.pos.y
        const heroVx = heroX - lastHeroX
        lastHeroX = heroX
        if (Math.abs(heroVx) > 0.5) {
          for (const p of dustInst.particles) {
            const dx = Math.abs(p.x - heroX)
            const dy = Math.abs(p.y - heroY)
            if (dx < SNOW_PUSH_DISTANCE && dy < SNOW_PUSH_DISTANCE) {
              p.driftSpeed += heroVx * SNOW_PUSH_STRENGTH * dt
              p.fallSpeed += SNOW_PUSH_DOWN_BOOST * dt
            }
          }
        }
      }
      //
      // Check if hero touches icicle spikes (deadly floor barrier)
      //
      if (!heroInst.isDying && heroInst.character?.pos) {
        checkIcicleCollision(k, heroInst, icicleData, levelIndicator)
        checkHangingIcicleCollision(k, heroInst, hangingIcicleData, levelIndicator, platformStates)
      }
      //
      // Check if hero just landed
      //
      const isGrounded = heroInst.character.isGrounded()
      const justLanded = !wasGrounded && isGrounded
      wasGrounded = isGrounded
      //
      // Get hero position
      //
      const heroX = heroInst.character.pos.x
      const heroY = heroInst.character.pos.y
      //
      // Helper function to check if platform edges intersect with visibility circle
      //
      const isPlatformInRadius = (state) => {
        const platformHalfWidth = state.width / 2
        const platformHalfHeight = PLATFORM_HEIGHT / 2
        //
        // Platform bounds
        //
        const platformLeft = state.x - platformHalfWidth
        const platformRight = state.x + platformHalfWidth
        const platformTop = state.y - platformHalfHeight
        const platformBottom = state.y + platformHalfHeight
        //
        // Find closest point on platform rectangle to hero
        //
        const closestX = Math.max(platformLeft, Math.min(heroX, platformRight))
        const closestY = Math.max(platformTop, Math.min(heroY, platformBottom))
        //
        // Calculate distance from hero to closest point on platform
        //
        const dx = closestX - heroX
        const dy = closestY - heroY
        const distance = Math.sqrt(dx * dx + dy * dy)
        //
        // Platform is in radius if closest point is within circle
        //
        return distance <= VISIBILITY_RADIUS
      }
      //
      // If hero just landed, reveal nearby platforms
      // Platforms appear ONLY on landing, not when touching from below
      //
      if (justLanded) {
        //
        // Check each platform
        //
        platformStates.forEach(state => {
          //
          // Check if platform edges intersect with visibility circle
          //
          if (isPlatformInRadius(state)) {
            //
            // Increase jump count (up to MAX_JUMPS)
            //
            if (state.jumpCount < MAX_JUMPS) {
              state.jumpCount++
            }
            //
            // Reset visibility timer (start fade out)
            //
            state.visibilityTimer = VISIBILITY_DURATION
            //
            // Start shake effect (400ms)
            //
            state.shakeTimer = 0.4
          }
        })
      }
      //
      // Trap platform: slides left, pauses, returns, then vanishes until next jump
      //
      platformStates.forEach(state => {
        if (!state.isTrap) return
        if (!state.trapTriggered) {
          const dx = Math.abs(heroX - state.x)
          const dy = Math.abs(heroY - state.y)
          if (state.opacity > 0 && dx < state.width / 2 + TRAP_PLATFORM_TRIGGER_RADIUS && dy < TRAP_PLATFORM_TRIGGER_RADIUS) {
            state.trapTriggered = true
            state.trapPhase = 'sliding-out'
            state.trapSlideProgress = 0
            state.trapPauseTimer = 0
          }
        }
        if (state.trapPhase === 'sliding-out') {
          state.trapSlideProgress += TRAP_PLATFORM_SLIDE_SPEED * dt
          if (state.trapSlideProgress >= TRAP_PLATFORM_SLIDE_DISTANCE) {
            state.trapSlideProgress = TRAP_PLATFORM_SLIDE_DISTANCE
            state.trapPhase = 'pausing'
            state.trapPauseTimer = 0
          }
          const newX = state.trapOriginalX - state.trapSlideProgress
          state.x = newX
          state.visualObject && (state.visualObject.pos.x = newX)
          state.collisionObject && (state.collisionObject.pos.x = newX)
        } else if (state.trapPhase === 'pausing') {
          state.trapPauseTimer += dt
          if (state.trapPauseTimer >= TRAP_PLATFORM_PAUSE_DURATION) {
            state.trapPhase = 'sliding-back'
          }
        } else if (state.trapPhase === 'sliding-back') {
          state.trapSlideProgress -= TRAP_PLATFORM_RETURN_SPEED * dt
          if (state.trapSlideProgress <= 0) {
            state.trapSlideProgress = 0
            state.trapPhase = 'done'
          }
          const newX = state.trapOriginalX - state.trapSlideProgress
          state.x = newX
          state.visualObject && (state.visualObject.pos.x = newX)
          state.collisionObject && (state.collisionObject.pos.x = newX)
        }
      })
      //
      // Update platform visibility timers and opacity
      //
      platformStates.forEach((state, index) => {
        //
        // First platform (where anti-hero stands) is always visible
        //
        if (index === 0) {
          state.opacity = 1.0
          state.visibilityTimer = VISIBILITY_DURATION
          state.jumpCount = MAX_JUMPS
          //
          // Always enable collision for first platform
          //
          if (!state.hasCollision && state.collisionObject) {
            state.collisionObject.use(k.area())
            state.hasCollision = true
          }
          return
        }
        
        //
        // Update shake effect
        //
        if (state.shakeTimer > 0) {
          state.shakeTimer -= dt
          //
          // Apply random shake offset (stronger at start, weaker at end)
          //
          const shakeIntensity = state.shakeTimer / 0.4  // 1.0 at start, 0.0 at end
          const maxShake = 4 * shakeIntensity  // Max 4px shake
          state.shakeOffsetX = (Math.random() - 0.5) * maxShake * 2
          state.shakeOffsetY = (Math.random() - 0.5) * maxShake * 2
        } else {
          //
          // Shake finished - reset offsets
          //
          state.shakeOffsetX = 0
          state.shakeOffsetY = 0
        }
        
        if (state.visibilityTimer > 0) {
          //
          // Decrease timer
          //
          state.visibilityTimer -= dt
          //
          // Calculate base opacity from jump count
          // 1 jump: 0.33, 2 jumps: 0.66, 3 jumps: 1.0
          //
          const baseOpacity = state.jumpCount / MAX_JUMPS
          //
          // Calculate fade progress (0 = just jumped, 1 = timer expired)
          //
          const fadeProgress = 1 - (state.visibilityTimer / VISIBILITY_DURATION)
          //
          // Interpolate opacity: start at baseOpacity, fade to 0
          // Each jump makes platform less transparent (higher baseOpacity)
          //
          state.opacity = baseOpacity * (1 - fadeProgress)
        } else if (state.jumpCount > 0) {
          //
          // Timer expired - platform becomes invisible
          //
          state.opacity = 0
        }
        //
        // Enable/disable collision based on visibility (works for all platforms including fake)
        //
        if (state.collisionObject) {
          if (state.opacity > 0 && !state.hasCollision) {
            //
            // Platform became visible - enable collision
            //
            state.collisionObject.use(k.area())
            state.hasCollision = true
          } else if (state.opacity <= 0 && state.hasCollision) {
            //
            // Platform became invisible - disable collision (hero will fall)
            //
            //
            // Remove area component to disable collision
            //
            state.collisionObject.unuse("area")
            state.hasCollision = false
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
      targetTime: CFG.gameplay.speedBonusTime
        ? CFG.gameplay.speedBonusTime['level-touch.2']
        : null
    })
    //
    // Update FPS counter
    //
    k.onUpdate(() => {
      FpsCounter.onUpdate(fpsCounter)
    })
    //
    // Draw dust in front of hero but behind platforms
    //
    k.add([
      k.z(CFG.visual.zIndex.player + 3),
      {
        draw() {
          Dust.draw(dustInst)
        }
      }
    ])
    //
    // Tooltip: icicle spikes (each icicle has its own hover zone)
    //
    Tooltip.create({
      k,
      targets: icicleData.map(ic => ({
        x: ic.x,
        y: FLOOR_Y - ic.height / 2,
        width: ic.width + 10,
        height: ic.height,
        text: ICICLE_TOOLTIP_TEXT,
        offsetY: ICICLE_TOOLTIP_Y_OFFSET
      }))
    })
    //
    // Tooltip: hero
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => heroInst.character.pos.x,
        y: () => heroInst.character.pos.y,
        width: HERO_TOOLTIP_HOVER_SIZE,
        height: HERO_TOOLTIP_HOVER_SIZE,
        text: HERO_TOOLTIP_TEXT,
        offsetY: HERO_TOOLTIP_Y_OFFSET
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
    // Tooltip: green timer (appears below, positioned at FPS counter row)
    //
    Tooltip.create({
      k,
      targets: [{
        x: k.width() / 2 + 140,
        y: FPS_COUNTER_TOP_Y,
        width: GREEN_TIMER_TOOLTIP_WIDTH,
        height: GREEN_TIMER_TOOLTIP_HEIGHT,
        text: GREEN_TIMER_TOOLTIP_TEXT,
        offsetY: GREEN_TIMER_TOOLTIP_Y_OFFSET,
        forceBelow: true
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
    // Moon hover glow system (glows when mouse hovers over it)
    //
    const moonGlowState = { intensity: 0 }
    k.add([
      k.z(2),
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
    // Tooltip: antihero platform (first platform where antihero stands)
    //
    Tooltip.create({
      k,
      targets: [{
        x: firstPlatform.x,
        y: firstPlatform.y,
        width: firstPlatform.width,
        height: 30,
        text: ANTIHERO_PLATFORM_TOOLTIP_TEXT,
        offsetY: ANTIHERO_PLATFORM_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Landing ring system: expanding circle of particles on hero landing
    //
    const jumpRings = []
    let prevGroundedForRing = true
    const jumpRingColor = k.rgb(JUMP_RING_COLOR_R, JUMP_RING_COLOR_G, JUMP_RING_COLOR_B)
    k.add([
      k.z(CFG.visual.zIndex.player + 2),
      {
        draw() {
          drawJumpRings(k, jumpRings, jumpRingColor)
        }
      }
    ])
    k.onUpdate(() => {
      const grounded = heroInst.character?.isGrounded?.() ?? true
      onUpdateLandingRings(k, jumpRings, heroInst, grounded, prevGroundedForRing)
      prevGroundedForRing = grounded
    })
    //
    // Antihero hint: after ANTIHERO_HINT_DELAY seconds, show a hint if level not completed
    //
    const hintState = {
      timer: 0,
      shown: false,
      currentHint: null
    }
    k.onUpdate(() => onUpdateAntiHeroHint(k, hintState, antiHeroInst))
    //
    // Return to menu on ESC
    //
    k.onKeyPress("escape", () => {
      Sound.stopAmbient(sound)
      k.go("menu")
    })
  })
}

/**
 * Creates scrolling clouds under the top platform (seamless loop, same as level 0/1)
 * @param {Object} k - Kaplay instance
 */
function createCloudsUnderTopPlatform(k) {
  const CLOUD_SCROLL_SPEED = 6
  const CLOUD_TOP_Y = TOP_MARGIN + 15
  const CLOUD_BOTTOM_Y = TOP_MARGIN + 55
  const CLOUD_COUNT = 22
  const CLOUD_RANDOMNESS = 15
  const baseCloudColor = k.rgb(30, 35, 50)
  //
  // Band covers the playable width; two copies tile seamlessly
  //
  const areaLeft = LEFT_MARGIN
  const areaRight = CFG.visual.screen.width - RIGHT_MARGIN
  const bandWidth = areaRight - areaLeft
  const cloudSpacing = bandWidth / CLOUD_COUNT
  //
  // Cloud X positions are relative to the band (0 to bandWidth)
  //
  const cloudConfigs = []
  for (let i = 0; i < CLOUD_COUNT; i++) {
    const baseX = cloudSpacing * i + cloudSpacing * 0.5
    const cloudX = baseX + (Math.random() - 0.5) * CLOUD_RANDOMNESS
    const cloudY = CLOUD_TOP_Y + Math.random() * (CLOUD_BOTTOM_Y - CLOUD_TOP_Y)
    const crownSize = (35 + Math.random() * 40) * 1.2
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
  const inst = { scrollX: 0 }
  //
  // Draw two copies of the band so one always fills the visible area
  //
  k.add([
    k.z(CFG.visual.zIndex.platforms - 1),
    {
      draw() {
        inst.scrollX = (inst.scrollX + CLOUD_SCROLL_SPEED * k.dt()) % bandWidth
        for (let copy = 0; copy < 2; copy++) {
          const baseOffset = areaLeft + inst.scrollX - copy * bandWidth
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
      }
    }
  ])
}

/**
 * Creates blue snow drifts on bottom platform floor
 * @param {Object} k - Kaplay instance
 */
function createSnowDrifts(k) {
  //
  // Snow drift configurations for bottom platform
  //
  const floorY = FLOOR_Y
  //
  // Generate many snow drifts with random sizes covering entire floor
  //
  const drifts = []
  //
  // Fill entire bottom platform with drifts
  //
  const corridorStart = LEFT_MARGIN
  const corridorEnd = k.width() - RIGHT_MARGIN
  
  for (let x = corridorStart; x < corridorEnd; x += 40 + Math.random() * 30) {
    const width = 50 + Math.random() * 90  // 50-140px width (larger and overlapping)
    const height = 8 + Math.random() * 15   // 8-23px height
    const zIndex = Math.random() > 0.5 ? 12 : 25  // 50% behind hero, 50% in front
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: floorY, z: zIndex, shapeType, skew })
  }
  //
  // Add some extra smaller drifts between main ones for more coverage
  //
  for (let x = corridorStart; x < corridorEnd; x += 30 + Math.random() * 25) {
    const width = 30 + Math.random() * 50  // 30-80px width (medium)
    const height = 5 + Math.random() * 8    // 5-13px height (smaller)
    const zIndex = Math.random() > 0.3 ? 12 : 25  // More behind hero
    const shapeType = Math.floor(Math.random() * 3)  // 0, 1, or 2 for different shapes
    const skew = -0.3 + Math.random() * 0.6  // -0.3 to 0.3 for asymmetry
    
    drifts.push({ x, width, height, y: floorY, z: zIndex, shapeType, skew })
  }
  //
  // Create each drift as a mound shape with multiple layers
  //
  //
  // Clipping bounds: drift points must stay inside the game area
  //
  const clipLeft = LEFT_MARGIN - corridorStart
  const clipRight = corridorEnd - corridorStart
  drifts.forEach(drift => {
    k.add([
      k.pos(drift.x, drift.y),
      k.z(drift.z),  // Either behind hero (12) or in front (25)
      {
        draw() {
          //
          // Drifts in front of hero (z=25) are slightly more transparent
          //
          const baseOpacity = drift.z === 25 ? 0.7 : 0.95
          const shadowOpacity = drift.z === 25 ? 0.5 : 0.7
          const highlightOpacity = drift.z === 25 ? 0.6 : 0.85
          //
          // Clamp horizontal extent to game area bounds
          //
          const leftBound = LEFT_MARGIN - drift.x
          const rightBound = (k.width() - RIGHT_MARGIN) - drift.x
          //
          // Draw snow drift as a polygon (mound shape)
          //
          const points = []
          const steps = 20
          //
          // Create curved top using different shape formulas based on shapeType
          //
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            let x = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
            x = Math.max(leftBound, Math.min(rightBound, x))
            let y
            //
            // Different shape types for variety
            //
            if (drift.shapeType === 0) {
              //
              // Parabolic curve (classic mound)
              //
              y = -drift.height * (1 - Math.pow(2 * t - 1, 2))
            } else if (drift.shapeType === 1) {
              //
              // Steeper peak (more pointed)
              //
              y = -drift.height * (1 - Math.pow(Math.abs(2 * t - 1), 1.5))
            } else {
              //
              // Flatter top (more spread out)
              //
              y = -drift.height * (1 - Math.pow(2 * t - 1, 4))
            }
            points.push(k.vec2(x, y))
          }
          //
          // Add bottom points to close the shape (clamped to game area)
          //
          points.push(k.vec2(Math.max(leftBound, Math.min(rightBound, drift.width / 2)), 0))
          points.push(k.vec2(Math.max(leftBound, Math.min(rightBound, -drift.width / 2)), 0))
          //
          // Draw main snow mound (light blue layer)
          //
          k.drawPolygon({
            pts: points,
            color: k.rgb(255, 255, 255),  // Pure white
            opacity: baseOpacity
          })
          //
          // Draw shadow layer (darker blue at bottom)
          //
          const shadowPoints = []
          for (let i = 0; i <= steps; i++) {
            const t = i / steps
            let sx = (t - 0.5 + drift.skew * (t - 0.5)) * drift.width
            sx = Math.max(leftBound, Math.min(rightBound, sx))
            const sy = -drift.height * 0.3 * (1 - Math.pow(2 * t - 1, 2))
            shadowPoints.push(k.vec2(sx, sy))
          }
          shadowPoints.push(k.vec2(Math.max(leftBound, Math.min(rightBound, drift.width / 2)), 0))
          shadowPoints.push(k.vec2(Math.max(leftBound, Math.min(rightBound, -drift.width / 2)), 0))
          
          k.drawPolygon({
            pts: shadowPoints,
            color: k.rgb(100, 130, 180),  // Darker blue shadow
            opacity: shadowOpacity
          })
          //
          // Draw highlight on top (brightest blue spot, offset by skew)
          // Ensure it stays within the mound (not below y=0)
          //
          const highlightOffset = drift.skew * drift.width * 0.2
          const highlightRadius = drift.width * 0.15
          const highlightY = -drift.height * 0.7
          //
          // Only draw highlight if it stays above the baseline
          //
          if (Math.abs(highlightY) - highlightRadius > 0) {
            k.drawCircle({
              radius: highlightRadius,
              color: k.rgb(200, 220, 255),  // Bright blue highlight
              pos: k.vec2(highlightOffset, highlightY),
              opacity: highlightOpacity
            })
          }
        }
      }
    ])
  })
}

/**
 * Creates platforms forming a path from top-left to bottom-right
 * All platforms are arranged so hero can jump from one to another
 * Leading to the final platform near anti-hero position
 * Platforms are invisible by default and become visible when hero lands nearby
 * @param {Object} k - Kaplay instance
 * @returns {Object} Object with first platform position and platform states array
 */
function createDiagonalPlatforms(k, enableTrap = true) {
  //
  // Platform parameters
  //
  const platformHeight = 30
  //
  // Jump physics: max horizontal distance ~180px (with margin)
  // jumpForce: 640, gravity: 2000, moveSpeed: 300
  // Max jump time: 2 * (jumpForce / gravity) = 0.64s
  // Max distance: moveSpeed * jumpTime = 300 * 0.64 ≈ 192px
  // Use 160px spacing for comfortable jumps
  //
  const maxJumpDistance = 160
  //
  // Platform visibility system
  // Each platform has: opacity (0-1), jumpCount (0-3), visibilityTimer (0-2 seconds)
  //
  const platformStates = []
  const VISIBILITY_RADIUS = 250  // Radius around hero to reveal platforms
  const VISIBILITY_DURATION = 2.0  // 2 seconds visibility after landing
  const MAX_JUMPS = 3  // 3 jumps to fully reveal platform
  //
  // Helper function to create a snow platform with visibility state
  //
  const createSnowPlatform = (x, y, width, index) => {
    //
    // First platform (where anti-hero stands) is always visible
    //
    const isFirstPlatform = index === 0
    //
    // Initialize platform state
    //
    const platformState = {
      x,
      y,
      width,
      opacity: isFirstPlatform ? 1.0 : 0,  // First platform visible, others invisible
      jumpCount: isFirstPlatform ? MAX_JUMPS : 0,  // First platform fully revealed
      visibilityTimer: isFirstPlatform ? VISIBILITY_DURATION : 0,  // First platform timer set
      visualObject: null,  // Will store visual object reference
      collisionObject: null,  // Will store collision object reference
      hasCollision: false,  // Track if collision is enabled
      shakeTimer: 0,  // Timer for shake effect (400ms)
      shakeOffsetX: 0,  // Current shake offset X
      shakeOffsetY: 0  // Current shake offset Y
    }
    platformStates.push(platformState)
    //
    // Create collision platform
    // First platform has collision enabled immediately
    //
    const collisionComponents = [
      k.rect(width, platformHeight),
      k.pos(x, y),
      k.anchor("center"),
      k.body({ isStatic: true }),
      k.opacity(0),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ]
    //
    // First platform needs collision enabled from start
    //
    if (isFirstPlatform) {
      collisionComponents.push(k.area())
      platformState.hasCollision = true
    }
    
    const collisionObj = k.add(collisionComponents)
    platformState.collisionObject = collisionObj
    //
    // Pre-generate log surface detail (cracks, knots, snow for first platform)
    //
    const logDetail = generateLogDetail(width, platformHeight, isFirstPlatform)
    //
    platformState.icicles = []
    //
    // Create visual platform (log style) with dynamic opacity
    //
    const visualObj = k.add([
      k.pos(x, y),
      k.z(CFG.visual.zIndex.platforms - 1),
      {
        draw() {
          const currentOpacity = platformState.opacity
          if (currentOpacity <= 0) return
          const drawX = platformState.shakeOffsetX
          const drawY = platformState.shakeOffsetY
          drawLogPlatform(k, width, platformHeight, drawX, drawY, currentOpacity, logDetail)
        }
      }
    ])
    platformState.visualObject = visualObj
  }
  //
  // Define 7 platforms forming a path from top-left to bottom-right
  // Platforms arranged diagonally from top-left to bottom-right
  //
  const startX = LEFT_MARGIN + 200
  const endX = CFG.visual.screen.width - RIGHT_MARGIN - 200
  const totalHorizontalDistance = endX - startX
  //
  // Vertical positions: platforms go from top-left to bottom-right
  //
  const startY = TOP_MARGIN + 250
  const endY = FLOOR_Y - 100
  const totalVerticalDistance = endY - startY
  //
  // Create 7 platforms evenly spaced horizontally
  //
  const platformCount = 7
  const platforms = []
  
  for (let i = 0; i < platformCount; i++) {
    const t = i / (platformCount - 1)  // 0 to 1
    let x = startX + totalHorizontalDistance * t
    const y = startY + totalVerticalDistance * t
    //
    // Platform 4 (middle) is longest, others are medium
    // Middle platform shortened by 20% on the right side
    //
    let width = i === 3 ? 200 : 140
    if (i === 3) {
      //
      // Reduce width by 20% (from 200 to 160)
      // Shift center left by half the reduction to keep left edge in place
      //
      const widthReduction = width * 0.2  // 40 pixels
      width = width - widthReduction  // 160 pixels
      x = x - widthReduction / 2  // Shift left by 20 pixels
    }
    
    platforms.push({ x, y, width })
  }
  //
  // Raise the rightmost platform slightly higher for better icicle kill zone
  //
  const RIGHTMOST_PLATFORM_RAISE = 20
  platforms[platformCount - 1].y -= RIGHTMOST_PLATFORM_RAISE
  //
  // Create all platforms
  //
  platforms.forEach((platform, index) => {
    createSnowPlatform(platform.x, platform.y, platform.width, index)
  })
  //
  // Create 2 fake platforms (no collision) to confuse player
  // Positioned to the right and up from platforms 2 and 5
  //
  const fakePlatformOffsets = [
    { sourceIndex: 4, offsetX: 120, offsetY: -120 },  // Right and above platform 4 (visible from its right part)
    { sourceIndex: 4, offsetX: 0, offsetY: -250 }     // Left of first fake and higher (dead-end path)
  ]
  
  fakePlatformOffsets.forEach((fake, fakeIndex) => {
    const sourcePlatform = platforms[fake.sourceIndex]
    const fakeX = sourcePlatform.x + fake.offsetX
    const fakeY = sourcePlatform.y + fake.offsetY
    const fakeWidth = 140
    
    //
    // Create fake platform state (invisible by default, same as regular platforms)
    //
    const fakePlatformState = {
      x: fakeX,
      y: fakeY,
      width: fakeWidth,
      opacity: 0,  // Start invisible like other platforms
      jumpCount: 0,
      visibilityTimer: 0,
      visualObject: null,
      collisionObject: null,
      hasCollision: false,  // Collision enabled when visible
      shakeTimer: 0,
      shakeOffsetX: 0,
      shakeOffsetY: 0,
      isFake: true  // Mark as fake platform (for reference only)
    }
    platformStates.push(fakePlatformState)
    
    //
    // Create collision object (same as regular platforms)
    //
    const fakeCollisionComponents = [
      k.rect(fakeWidth, platformHeight),
      k.pos(fakeX, fakeY),
      k.anchor("center"),
      k.body({ isStatic: true }),
      k.opacity(0),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ]
    const fakeCollisionObj = k.add(fakeCollisionComponents)
    fakePlatformState.collisionObject = fakeCollisionObj
    
    //
    // Pre-generate log surface detail (no snow on fake platforms)
    //
    const fakeLogDetail = generateLogDetail(fakeWidth, platformHeight, false)
    //
    // Create visual platform (log style, no snow on fake platforms)
    //
    const fakeVisualObj = k.add([
      k.pos(fakeX, fakeY),
      k.z(CFG.visual.zIndex.platforms - 1),
      {
        draw() {
          const currentOpacity = fakePlatformState.opacity
          if (currentOpacity <= 0) return
          const drawX = fakePlatformState.shakeOffsetX
          const drawY = fakePlatformState.shakeOffsetY
          drawLogPlatform(k, fakeWidth, platformHeight, drawX, drawY, currentOpacity, fakeLogDetail)
        }
      }
    ])
    fakePlatformState.visualObject = fakeVisualObj
  })
  
  //
  // Mark the second-to-last platform (index 1) as a trap that slides away once
  // Only activated after the 2nd life deduction in this level
  //
  const TRAP_INDEX = 1
  platformStates[TRAP_INDEX].isTrap = enableTrap
  platformStates[TRAP_INDEX].trapTriggered = false
  platformStates[TRAP_INDEX].trapPhase = 'idle'
  platformStates[TRAP_INDEX].trapSlideProgress = 0
  platformStates[TRAP_INDEX].trapPauseTimer = 0
  platformStates[TRAP_INDEX].trapOriginalX = platforms[TRAP_INDEX].x
  //
  // Return first platform position and platform states for visibility system
  //
  return {
    firstPlatform: platforms[0],
    platformStates: platformStates
  }
}

function createBackgroundBushesNear(k) {
  //
  // Create near layer bushes - grayer, shorter, in front of far layer
  //
  const grassY = FLOOR_Y - 2
  const playableWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const yOffset = -80  // Raised bushes higher
  
  //
  // Random helper
  //
  const rand = (min, max) => min + Math.random() * (max - min)
  
  //
  // Create many bushes for continuous strip
  //
  const totalElements = 80  // More bushes for continuous horizontal strip
  const spacing = playableWidth / (totalElements - 1)
  const bushes = []
  
  for (let i = 0; i < totalElements; i++) {
    const posX = LEFT_MARGIN + spacing * i
    
    //
    // Create bushes with 100% density for continuous strip
    //
    // Always create bush (no random skip)
    
    //
    // Near layer bushes - base size (shorter than far layer)
    //
    const bushSize = (20 + Math.random() * 30) * 0.7 * 6.4  // Base size (shorter than far layer)
    const crownCount = 8 + Math.floor(Math.random() * 10)  // More crowns for continuous density
    const crowns = []
    
    for (let j = 0; j < crownCount; j++) {
      const angle = Math.random() * Math.PI * 2
      const distance = Math.random() * bushSize * 0.8
      const x = Math.cos(angle) * distance
      const y = Math.sin(angle) * distance * 0.6
      
      crowns.push({
        offsetX: x,
        offsetY: y,
        sizeVariation: 0.5 + Math.random() * 0.5,
        opacityVariation: 0.6 + Math.random() * 0.4
      })
    }
    
    //
    // Dark gray bush color for near layer (much darker)
    //
    const grayBushColor = k.rgb(18, 20, 22)  // Much darker gray color
    
    bushes.push({
      x: posX,
      y: grassY + yOffset,
      size: bushSize,
      crowns: crowns,
      color: grayBushColor,
      opacity: 0.85,  // Slightly more opaque for continuous appearance
      swaySpeed: 0.1 + Math.random() * 0.05,
      swayAmount: (0.5 + Math.random() * 0.5) * 0.7,
      swayOffset: Math.random() * Math.PI * 2
    })
  }
  
  //
  // Create canvas and draw bushes on it using toPng
  //
  const createBushesCanvas = () => {
    //
    // Calculate arc multiplier for bushes (higher at edges, lower in center)
    //
    const screenCenter = k.width() / 2
    const maxDistance = Math.max(screenCenter - LEFT_MARGIN, k.width() - RIGHT_MARGIN - screenCenter)
    
    return toPng({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
      //
      // Draw bushes on canvas with arc variation
      //
      bushes.forEach(bush => {
        const sway = 0  // No sway for static canvas
        
        //
        // Calculate distance from center and apply arc formula
        //
        const distanceFromCenter = Math.abs(bush.x - screenCenter)
        const normalizedDistance = distanceFromCenter / maxDistance  // 0 at center, 1 at edges
        const arcMultiplier = 0.7 + normalizedDistance * 0.6  // 0.7 at center, 1.3 at edges (creates arc)
        
        bush.crowns.forEach(crown => {
          ctx.fillStyle = `rgba(${bush.color.r}, ${bush.color.g}, ${bush.color.b}, ${bush.opacity * crown.opacityVariation})`
          ctx.beginPath()
          ctx.arc(
            bush.x + crown.offsetX + sway,
            bush.y + crown.offsetY,
            bush.size * crown.sizeVariation * 0.5 * arcMultiplier,  // Apply arc multiplier to size
            0,
            Math.PI * 2
          )
          ctx.fill()
        })
      })
    })
  }
  
  const bushesDataURL = createBushesCanvas()
  const bushesTexture = k.loadSprite('bg-touch-level2-background-bushes-near', bushesDataURL)
  
  //
  // Draw bushes canvas (in front of far bushes, but behind trees)
  //
  k.add([
    k.z(2),  // In front of far bushes (z=1.5) but behind trees
    {
      draw() {
        k.drawSprite({
          sprite: 'bg-touch-level2-background-bushes-near',
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}

function createMountains(k) {
  //
  // Create mountains using segment-based random point generation
  //
  const screenWidth = k.width()
  const screenHeight = k.height()
  const horizonY = FLOOR_Y  // Mountains start from bottom platform
  //
  // Color palette
  //
  const colors = {
    sky: '#000000',            // Black background
    snow: 'rgb(255, 255, 255)', // Pure white snow
    rockLeft: 'rgb(73, 121, 141)',  // Left side rock color
    rockRight: 'rgb(62, 105, 121)', // Right side rock color
    rockRightLight: 'rgb(130, 176, 209)' // Right side light rock color
  }
  
  const fixedPointOnSegment = (x1, y1, x2, y2, percent) => {
    //
    // Fixed point on segment (no randomness) - always same position
    //
    const n = percent / 100
    const a = (y2 - y1) / (x2 - x1)
    const x = x1 + (x2 - x1) * n
    const y = a * (x - x1) + y1
    return { x, y }
  }
  
  //
  // Draw single mountain (fixed positions, no randomness)
  //
  const drawMountain = (ctx, x, y, width, height, mountainData, alpha = 1, customColors = null) => {
    ctx.save()
    ctx.globalAlpha = alpha
    
    //
    // Use custom colors if provided, otherwise use default colors
    //
    const mountainColors = customColors || colors
    
    //
    // Fixed positions (no randomness) - always same place
    //
    const leftMountainBaseX = x + mountainData.widthVariation / 2
    const rightMountainBaseX = x + width - mountainData.widthVariation / 2
    const mountainTopY = y - mountainData.heightVariation / 2
    const mountainTopX = x + (width - mountainData.centerVariation) / 2 + mountainData.centerVariation / 2
    
    const leftSnow = fixedPointOnSegment(leftMountainBaseX, y, mountainTopX, mountainTopY, 85)  // Higher snow line for sharper peaks (was 70%)
    const rightSnow = fixedPointOnSegment(rightMountainBaseX, y, mountainTopX, mountainTopY, 85)  // Higher snow line for sharper peaks (was 70%)
    const midSnow = {
      x: mountainTopX,
      y: (leftSnow.y + rightSnow.y) / 2
    }
    
    const leftSnowPoints = []
    const rightSnowPoints = []
    for (let i = 1; i <= 2; i++) {
      const leftPoint = fixedPointOnSegment(leftSnow.x, leftSnow.y, midSnow.x, midSnow.y, 100 / 3 * i)  // Fixed position
      leftPoint.y += 15 * (1 - 2 * (i % 2))  // Fixed offset
      leftSnowPoints.push(leftPoint)
      
      const rightPoint = fixedPointOnSegment(midSnow.x, midSnow.y, rightSnow.x, rightSnow.y, 100 / 3 * i)  // Fixed position
      rightPoint.y += 15 * (-1 + 2 * (i % 2))  // Fixed offset
      rightSnowPoints.push(rightPoint)
    }
    
    //
    // Draw snow cap (left side - shaded)
    //
    ctx.fillStyle = mountainColors.rockRightLight
    ctx.beginPath()
    ctx.moveTo(leftSnow.x, leftSnow.y)
    leftSnowPoints.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.lineTo(midSnow.x, midSnow.y)
    ctx.lineTo(mountainTopX, mountainTopY)
    ctx.fill()
    //
    // Draw snow cap (right side - illuminated)
    //
    ctx.fillStyle = mountainColors.snow
    ctx.beginPath()
    ctx.moveTo(midSnow.x, midSnow.y)
    rightSnowPoints.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.lineTo(rightSnow.x, rightSnow.y)
    ctx.lineTo(mountainTopX, mountainTopY)
    ctx.fill()
    
    //
    // Draw left rock face (shaded side)
    //
    ctx.fillStyle = mountainColors.rockRight
    ctx.beginPath()
    ctx.moveTo(leftMountainBaseX, y)
    ctx.lineTo(leftSnow.x, leftSnow.y)
    leftSnowPoints.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.lineTo(midSnow.x, midSnow.y)
    ctx.lineTo(midSnow.x, y)
    ctx.fill()
    //
    // Draw right rock face (illuminated side)
    //
    ctx.fillStyle = mountainColors.rockLeft
    ctx.beginPath()
    ctx.moveTo(midSnow.x, midSnow.y)
    rightSnowPoints.forEach(point => ctx.lineTo(point.x, point.y))
    ctx.lineTo(rightSnow.x, rightSnow.y)
    ctx.lineTo(rightMountainBaseX, y)
    ctx.lineTo(mountainTopX, y)
    ctx.fill()
    
    ctx.restore()
  }
  
  //
  // Create canvas for mountains using toPng
  //
  const createMountainsCanvas = () => {
    //
    // Draw three mountains: left (shadowed, lower), center (higher, sharper), right (light)
    // Made higher and stretched horizontally
    //
    const screenThird = screenWidth / 3
    
    //
    // Left mountain: shadowed, lower (but higher than before)
    //
    const leftMountainParams = {
      widthVariation: 40,  // Narrower for sharper peak
      heightVariation: 1200,  // 2x higher
      centerVariation: 250  // Narrower variation for sharper peak
    }
    const leftMountainHeight = 2500  // 2x higher
    const leftMountainX = -100  // Start further left
    const leftMountainWidth = screenThird + 200  // Wider
    
    //
    // Center mountain: higher, sharper (made even higher)
    //
    const centerMountainParams = {
      widthVariation: 30,  // Narrower for sharpest peak
      heightVariation: 1500,  // 2x higher
      centerVariation: 200  // Narrower variation for sharpest peak
    }
    const centerMountainHeight = 2800  // 2x higher
    const centerMountainX = screenThird - 400  // Start further left to accommodate much wider base
    const centerMountainWidth = screenThird + 900  // Much wider base
    
    //
    // Right mountain: light (made higher)
    //
    const rightMountainParams = {
      widthVariation: 45,  // Narrower for sharper peak
      heightVariation: 1300,  // 2x higher
      centerVariation: 280  // Narrower variation for sharper peak
    }
    const rightMountainHeight = 2200  // 2x higher
    const rightMountainX = screenThird * 2 - 150  // Start further left
    const rightMountainWidth = screenThird + 250  // Wider, extends to edge
    
    return toPng({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
      //
      // Disable anti-aliasing for pixel art effect
      //
      ctx.imageSmoothingEnabled = false
      
      //
      // Draw dark night sky (fill entire canvas to avoid horizontal line)
      //
      ctx.fillStyle = colors.sky
      ctx.fillRect(0, 0, screenWidth, screenHeight)
      //
      // Draw left mountain (shadowed, darker colors)
      //
      drawMountain(ctx, leftMountainX, horizonY, leftMountainWidth, leftMountainHeight, leftMountainParams, 1.0, {
        snow: 'rgb(200, 210, 220)',  // Darker snow
        rockLeft: 'rgb(50, 80, 100)',  // Darker left rock
        rockRight: 'rgb(40, 70, 90)',  // Darker right rock
        rockRightLight: 'rgb(90, 130, 150)'  // Darker light rock
      })
      
      //
      // Draw center mountain (higher, sharper, normal colors)
      //
      drawMountain(ctx, centerMountainX, horizonY, centerMountainWidth, centerMountainHeight, centerMountainParams, 1.0, {
        snow: colors.snow,
        rockLeft: colors.rockLeft,
        rockRight: colors.rockRight,
        rockRightLight: colors.rockRightLight
      })
      
      //
      // Draw right mountain (light, brighter colors)
      //
      drawMountain(ctx, rightMountainX, horizonY, rightMountainWidth, rightMountainHeight, rightMountainParams, 1.0, {
        snow: 'rgb(245, 248, 250)',  // Brighter snow
        rockLeft: 'rgb(90, 140, 160)',  // Brighter left rock
        rockRight: 'rgb(80, 130, 150)',  // Brighter right rock
        rockRightLight: 'rgb(150, 190, 220)'  // Brighter light rock
      })
      //
      // Draw moon in front of mountains
      //
      drawLevel2Moon(ctx)
    })
  }
  
  const mountainsDataURL = createMountainsCanvas()
  k.loadSprite('bg-touch-level2-mountains', mountainsDataURL)
  
  //
  // Draw mountains canvas (behind everything)
  //
  k.add([
    k.z(1),  // Very far back, behind trees
    {
      draw() {
        k.drawSprite({
          sprite: 'bg-touch-level2-mountains',
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}
/**
 * First level background dark fir trees. They are distributed evenly across the screen.
 * @param {*} ctx Canvas context
 */
function drawBackgroundDarkestTrees(ctx) {
  const w = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const treesAmount = 50
  const treePeriod = w / treesAmount
  const treesLayers = 1

  for ( let i = 0; i < treesAmount; i++ ) {
    const x = i * treePeriod + Math.random() * treePeriod + LEFT_MARGIN
    drawFirTree(ctx, x, FLOOR_Y, arcY(x, LEFT_MARGIN, w, 400, 480), {
      layers: treesLayers,
      trunkWidthPercent: .03,
      trunkHeightPercent: Math.random() * .2 + .1,
      trunkColor: '#050505',
      leftColor: [7, 7, 7],
      rightColor: [10, 10, 10],
      layer0WidthPercent: .5,
      layersDecWidthPercent: .15,
      layersSharpness: Math.floor(Math.random() * 10 + 10)
    })
  }
}
function createBackgroundDarkestTrees(k) {
  const png = toPng({ width: k.width(), height: k.height() }, drawBackgroundDarkestTrees)
  k.loadSprite('bg-touch-level2-darkest-trees', png)  
  //
  // Draw trees canvas (behind all other trees - lowest z-index)
  //
  k.add([
    k.z(3),  // Behind background trees (z=4) but above mountains (z=1)
    {
      draw() {
        k.drawSprite({
          sprite: 'bg-touch-level2-darkest-trees',
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}
/**
 * First level background dark fir trees. They are distributed evenly across the screen.
 * @param {*} ctx Canvas context
 */
function drawBackgroundDarkTrees(ctx) {
  const w = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const treesAmount = 30
  const treePeriod = w / treesAmount
  const treesLayers = 4

  for ( let i = 0; i < treesAmount; i++ ) {
    const x = i * treePeriod + Math.random() * treePeriod + LEFT_MARGIN
    drawFirTree(ctx, x, FLOOR_Y, arcY(x, LEFT_MARGIN, w, 300, 380), {
      layers: Math.random() * treesLayers + 4,
      trunkWidthPercent: .03,
      trunkHeightPercent: Math.random() * .2 + .1,
      trunkColor: '#101010',
      leftColor: [15, 15, 15],
      rightColor: [25, 20, 25],
      layer0WidthPercent: .3,
      layersDecWidthPercent: .15,
      layersSharpness: Math.floor(Math.random() * 10 + 10)
    })
  }
}

function createBackgroundDarkTrees(k) {
  const png = toPng({ width: k.width(), height: k.height() }, drawBackgroundDarkTrees)
  k.loadSprite('bg-touch-level2-background-dark-trees', png)
  //
  // Draw trees canvas (behind other trees)
  //
  k.add([
    k.z(4),  // Behind foreground trees (z=5) but above background
    {
      draw() {
        k.drawSprite({
          sprite: 'bg-touch-level2-background-dark-trees',
          pos: k.vec2(0, 0),
          anchor: "topleft"
        })
      }
    }
  ])
}
/**
 * Creates all foreground trees as dynamic swaying objects
 * Both the behind-hero row and the in-front-of-hero overlay trees sway
 * @param {Object} k - Kaplay instance
 */
function createForegroundTrees(k) {
  const screenWidth = CFG.visual.screen.width
  //
  // Pre-generate layer data for 15 foreground trees (behind hero)
  //
  const foregroundTrees = generateForegroundTreeData()
  k.add([
    k.z(CFG.visual.zIndex.player - 1),
    {
      draw() {
        drawOverlayTreesSway(k, foregroundTrees)
      }
    }
  ])
  //
  // Pre-generate layer data for 2 overlay trees that sway in front of hero
  //
  const overlayTrees = generateOverlayTreeData(screenWidth)
  k.add([
    k.z(CFG.visual.zIndex.player + 1),
    {
      draw() {
        drawOverlayTreesSway(k, overlayTrees)
      }
    }
  ])
}

/**
 * Pre-generates layer geometry for 15 foreground trees (behind hero)
 * Same data format as overlay trees so drawOverlayTreesSway can render both
 * @returns {Array} Array of tree data objects
 */
function generateForegroundTreeData() {
  const w = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const treesAmount = 15
  const treePeriod = w / treesAmount
  const treeDefs = []
  for (let i = 0; i < treesAmount; i++) {
    const x = i * treePeriod + Math.random() * treePeriod + LEFT_MARGIN
    const height = arcY(x, LEFT_MARGIN, w, 200, 280)
    const layerCount = Math.floor(Math.random() * 4 + 4)
    treeDefs.push({
      x,
      height,
      layers: layerCount,
      trunkWidthPercent: 0.03,
      trunkHeightPercent: Math.random() * 0.2 + 0.1,
      leftColor: [30, 100, 40],
      rightColor: [30, 150, 40],
      layer0WidthPercent: 0.3,
      layersDecWidthPercent: 0.15,
      layersSharpness: Math.floor(Math.random() * 10 + 10),
      phase: Math.random() * Math.PI * 2
    })
  }
  return treeDefs.map(def => buildTreeLayerData(def))
}

/**
 * Converts a tree definition into pre-computed layer data for per-frame rendering
 * @param {Object} def - Tree definition with position, size, colors, and phase
 * @returns {Object} Tree data with trunk rect and layer geometry
 */
function buildTreeLayerData(def) {
  const trunkWidth = def.height * def.trunkWidthPercent
  const trunkHeight = def.height * def.trunkHeightPercent
  const layerHeight = (def.height - trunkHeight) / def.layers
  const layerData = []
  let baseY = FLOOR_Y - trunkHeight
  for (let i = 0; i < def.layers; i++) {
    const layerWidth = def.height * def.layer0WidthPercent - def.height * def.layer0WidthPercent * i * def.layersDecWidthPercent
    const topY = baseY - layerHeight
    const offsetX = (Math.random() - 0.5) * layerWidth / 3
    layerData.push({ baseY, topY, layerWidth, offsetX, index: i })
    baseY = topY
  }
  return {
    x: def.x,
    height: def.height,
    trunkX: def.x - trunkWidth / 2,
    trunkY: FLOOR_Y - trunkHeight,
    trunkWidth,
    trunkHeight,
    leftColor: def.leftColor,
    rightColor: def.rightColor,
    layersSharpness: def.layersSharpness,
    layers: def.layers,
    layerData,
    phase: def.phase
  }
}

/**
 * Pre-generates static layer geometry for overlay trees (computed once)
 * Each tree stores its trunk rect and layer triangles for per-frame drawing
 * @param {number} screenWidth - Screen width for positioning
 * @returns {Array} Array of tree data objects
 */
function generateOverlayTreeData(screenWidth) {
  const treeDefs = [
    {
      x: screenWidth - RIGHT_MARGIN - 180,
      height: 220,
      layers: 5,
      trunkWidthPercent: 0.03,
      trunkHeightPercent: 0.15,
      leftColor: [25, 85, 35],
      rightColor: [25, 130, 35],
      layer0WidthPercent: 0.3,
      layersDecWidthPercent: 0.15,
      layersSharpness: 14,
      phase: Math.random() * Math.PI * 2
    },
    {
      x: screenWidth - RIGHT_MARGIN - 80,
      height: 180,
      layers: 4,
      trunkWidthPercent: 0.03,
      trunkHeightPercent: 0.12,
      leftColor: [28, 90, 38],
      rightColor: [28, 140, 38],
      layer0WidthPercent: 0.3,
      layersDecWidthPercent: 0.15,
      layersSharpness: 12,
      phase: Math.random() * Math.PI * 2
    }
  ]
  return treeDefs.map(def => buildTreeLayerData(def))
}

/**
 * Draws overlay trees each frame with wind sway applied to each layer
 * Higher layers sway more than lower ones for realistic branch movement
 * @param {Object} k - Kaplay instance
 * @param {Array} trees - Pre-generated tree data
 */
function drawOverlayTreesSway(k, trees) {
  const time = k.time()
  for (const tree of trees) {
    const swayBase = Math.sin(time * TREE_SWAY_SPEED + tree.phase) * TREE_SWAY_AMPLITUDE * (tree.height / 200)
    //
    // Draw trunk (no sway)
    //
    k.drawRect({
      pos: k.vec2(tree.trunkX, tree.trunkY),
      width: tree.trunkWidth,
      height: tree.trunkHeight,
      color: k.rgb(74, 46, 31)
    })
    //
    // Draw each layer with increasing sway
    //
    const lc = tree.leftColor
    const rc = tree.rightColor
    for (const layer of tree.layerData) {
      const sway = swayBase * (layer.index + 1) / tree.layers
      //
      // Left half (darker)
      //
      k.drawPolygon({
        pts: [
          k.vec2(tree.x + layer.offsetX + sway, layer.baseY),
          k.vec2(tree.x - layer.layerWidth / 2 + sway, layer.baseY),
          k.vec2(tree.x + sway, layer.topY - tree.layersSharpness)
        ],
        color: k.rgb(lc[0], lc[1], lc[2])
      })
      //
      // Right half (lighter)
      //
      k.drawPolygon({
        pts: [
          k.vec2(tree.x + layer.offsetX + sway, layer.baseY),
          k.vec2(tree.x + layer.layerWidth / 2 + sway, layer.baseY),
          k.vec2(tree.x + sway, layer.topY - tree.layersSharpness)
        ],
        color: k.rgb(rc[0], rc[1], rc[2])
      })
    }
  }
}

/**
 * Generates icicle spike data for the bottom floor barrier
 * Icicles cover the floor from left wall to the safe zone on the right
 * @returns {Array} Array of icicle objects with position, size, and tip offset
 */
function generateIcicles() {
  const icicles = []
  const startX = LEFT_MARGIN + 5
  const endX = ICICLE_SAFE_ZONE_X
  //
  // Clearance radius around decorative log piles (no icicles where logs sit)
  //
  const logClearance = DECOR_LOG_WIDTH * 1.5
  for (let x = startX; x < endX; x += ICICLE_SPACING) {
    //
    // Skip icicles near log pile positions
    //
    const nearLog = DECOR_LOG_PILE_POSITIONS.some(logX => Math.abs(x - logX) < logClearance)
    if (nearLog) continue
    icicles.push({
      x: x + (Math.random() - 0.5) * 8,
      baseY: FLOOR_Y,
      width: ICICLE_WIDTH_MIN + Math.random() * (ICICLE_WIDTH_MAX - ICICLE_WIDTH_MIN),
      height: ICICLE_HEIGHT_MIN + Math.random() * (ICICLE_HEIGHT_MAX - ICICLE_HEIGHT_MIN),
      tipOffset: (Math.random() - 0.5) * 4
    })
  }
  return icicles
}

/**
 * Draws icicle spikes pointing upward from the floor
 * Each icicle has a dark outline and semi-transparent blue-white fill
 * @param {Object} k - Kaplay instance
 * @param {Array} icicleData - Array of icicle objects
 */
function drawIcicles(k, icicleData) {
  const outlineColor = k.rgb(0, 0, 0)
  const icicleColor = k.rgb(ICICLE_COLOR_R, ICICLE_COLOR_G, ICICLE_COLOR_B)
  const ow = ICICLE_OUTLINE_WIDTH
  icicleData.forEach(icicle => {
    //
    // Draw black outline (slightly larger triangle behind the icicle)
    //
    k.drawPolygon({
      pts: [
        k.vec2(icicle.x - icicle.width / 2 - ow, icicle.baseY + ow),
        k.vec2(icicle.x + icicle.width / 2 + ow, icicle.baseY + ow),
        k.vec2(icicle.x + icicle.tipOffset, icicle.baseY - icicle.height - ow)
      ],
      color: outlineColor
    })
    //
    // Draw icicle fill (semi-transparent blue-white)
    //
    k.drawPolygon({
      pts: [
        k.vec2(icicle.x - icicle.width / 2, icicle.baseY),
        k.vec2(icicle.x + icicle.width / 2, icicle.baseY),
        k.vec2(icicle.x + icicle.tipOffset, icicle.baseY - icicle.height)
      ],
      color: icicleColor
    })
  })
}

/**
 * Checks if hero is touching any icicle spike and triggers death
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Array} icicleData - Array of icicle objects
 */
function checkIcicleCollision(k, heroInst, icicleData, levelIndicator) {
  const heroX = heroInst.character.pos.x
  const heroFeetY = heroInst.character.pos.y + HERO_FEET_OFFSET
  for (const icicle of icicleData) {
    const dx = Math.abs(heroX - icicle.x)
    //
    // Horizontal overlap: hero center within half icicle width + tolerance
    //
    if (dx > icicle.width / 2 + 8) continue
    //
    // Vertical overlap: hero feet below the icicle tip
    //
    const icicleTipY = icicle.baseY - icicle.height + ICICLE_KILL_TOLERANCE
    if (heroFeetY > icicleTipY) {
      onHeroDeath(k, heroInst, levelIndicator)
      return
    }
  }
}

/**
 * Updates icicle wobble state: one random icicle wobbles at a time
 * Wobble applies a horizontal offset to the icicle's tipOffset, then resets
 * @param {Object} k - Kaplay instance
 * @param {Array} icicleData - Icicle position data (mutated: tipOffset changes)
 * @param {Object} state - Wobble state { timer, activeIndex, elapsed }
 * @param {Object} sfx - Sound instance
 */
function updateIcicleWobble(k, icicleData, state, sfx) {
  if (icicleData.length === 0) return
  const dt = k.dt()
  //
  // If an icicle is currently wobbling, animate it
  //
  if (state.activeIndex >= 0) {
    state.elapsed += dt
    const progress = state.elapsed / ICICLE_WOBBLE_DURATION
    if (progress >= 1) {
      //
      // Wobble finished, restore original tipOffset
      //
      icicleData[state.activeIndex].tipOffset = icicleData[state.activeIndex].originalTip
      state.activeIndex = -1
      state.timer = ICICLE_WOBBLE_INTERVAL_MIN + Math.random() * (ICICLE_WOBBLE_INTERVAL_MAX - ICICLE_WOBBLE_INTERVAL_MIN)
    } else {
      //
      // Damped oscillation: sin wave with decaying amplitude
      //
      const decay = 1 - progress
      const phase = progress * Math.PI * 6
      const wobble = Math.sin(phase) * ICICLE_WOBBLE_AMPLITUDE * decay
      icicleData[state.activeIndex].tipOffset = icicleData[state.activeIndex].originalTip + wobble
      //
      // Detect direction change (velocity sign flip) and play crunch at each peak
      //
      const velocity = Math.cos(phase)
      const dir = velocity > 0 ? 1 : -1
      if (state.prevWobbleDir !== 0 && dir !== state.prevWobbleDir) {
        sfx && playIceCreakSound(sfx, decay)
      }
      state.prevWobbleDir = dir
    }
    return
  }
  //
  // Count down to next wobble
  //
  state.timer -= dt
  if (state.timer <= 0) {
    const idx = Math.floor(Math.random() * icicleData.length)
    //
    // Store original tipOffset so we can restore it after wobble
    //
    if (icicleData[idx].originalTip === undefined) {
      icicleData[idx].originalTip = icicleData[idx].tipOffset
    }
    state.activeIndex = idx
    state.elapsed = 0
    state.prevWobbleDir = 0
    sfx && playIceCreakSound(sfx, 1)
  }
}

/**
 * Plays a short ice crunch sound for a single wobble peak
 * Volume scales with the wobble decay so later peaks are quieter
 * @param {Object} instance - Sound instance from create()
 * @param {number} [volume=1] - Volume multiplier (0-1), tied to wobble decay
 */
function playIceCreakSound(instance, volume = 1) {
  if (!instance?.audioContext) return
  const ctx = instance.audioContext
  const now = ctx.currentTime
  const duration = 0.08
  const peak = 0.5 * volume
  //
  // Short white noise burst for a single crunch
  //
  const bufferSize = ctx.sampleRate * duration
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1
  }
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  //
  // Low-pass filter for icy crunch character
  //
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(700, now)
  filter.frequency.linearRampToValueAtTime(350, now + duration)
  filter.Q.value = 1.5
  //
  // Sharp attack, fast decay envelope
  //
  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0, now)
  envelope.gain.linearRampToValueAtTime(peak, now + 0.003)
  envelope.gain.exponentialRampToValueAtTime(0.001, now + duration)
  noiseSource.connect(filter)
  filter.connect(envelope)
  envelope.connect(ctx.destination)
  noiseSource.start(now)
  noiseSource.stop(now + duration)
}

/**
 * Generates decorative stacked log pile at the given X position
 * Bottom row has 3 logs, then 2 on top, then 1 on top (pyramid shape)
 * Uses the same drawLogPlatform rendering as playable platforms
 * @param {number} pileX - Center X of the log pile
 * @returns {Array} Array of log objects with position, size, detail
 */
function generateDecorLogs(pileX) {
  const logs = []
  const baseX = pileX
  const w = DECOR_LOG_WIDTH
  const h = DECOR_LOG_HEIGHT
  const halfH = h / 2
  //
  // Bottom row: 3 logs side by side on the floor
  //
  for (let i = 0; i < 3; i++) {
    const spacing = h + 2
    logs.push({
      x: baseX + (i - 1) * spacing + (Math.random() - 0.5) * 4,
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
      x: baseX + (i - 0.5) * spacing + (Math.random() - 0.5) * 4,
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
    x: baseX + (Math.random() - 0.5) * 6,
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
    k.wait(DEATH_RELOAD_DELAY, () => k.go('level-touch.2'))
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
 * Pre-generates random crack, knot and snow detail for a single log platform.
 * Called once per platform at creation time so the visuals stay stable across frames.
 * @param {number} w - Platform width
 * @param {number} h - Platform height
 * @param {boolean} withSnow - Whether to generate asymmetric snow profile
 * @returns {Object} Detail data (cracks, knots, snowProfile)
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
  // Asymmetric snow profile with multiple random peaks and bumps.
  // Uses 2-3 overlapping mounds of different sizes to break symmetry.
  //
  let snowProfile = null
  let snowClumps = null
  if (withSnow) {
    const steps = 24
    snowProfile = new Array(steps + 1).fill(0)
    //
    // Layer 2-3 mounds at random positions with random heights
    //
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
    //
    // Normalize so the peak is 1.0, then add small random bumps
    //
    const maxVal = Math.max(...snowProfile)
    for (let i = 0; i <= steps; i++) {
      snowProfile[i] = snowProfile[i] / maxVal + (Math.random() - 0.5) * 0.08
      snowProfile[i] = Math.max(0, snowProfile[i])
    }
    //
    // Ensure edges taper to zero
    //
    snowProfile[0] = Math.min(snowProfile[0], 0.05)
    snowProfile[steps] = Math.min(snowProfile[steps], 0.05)
    //
    // Snow clumps: small extra circles scattered along the mound surface
    //
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
 * Draws a log-shaped platform: rounded barrel body with bark texture,
 * cracks/knots for detail, oval end-grain on the right, and optional snowdrift.
 * All coordinates are relative to the platform center (0,0).
 * @param {Object} k - Kaplay instance
 * @param {number} w - Platform width
 * @param {number} h - Platform height
 * @param {number} ox - Shake offset X
 * @param {number} oy - Shake offset Y
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
  k.drawPolygon({ pts: bodyPts, color: barkColor, opacity: opacity })
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
  //
  // Main snow mound (white)
  //
  k.drawPolygon({ pts: snowPts, color: k.rgb(255, 255, 255), opacity: 0.9 * opacity })
  //
  // Shadow layer at the bottom of the snow
  //
  const shadowPts = []
  for (let i = 0; i <= snowSteps; i++) {
    const t = i / snowSteps
    const px = (t - 0.5) * w + ox
    shadowPts.push(k.vec2(px, -halfH - snowHeight * 0.3 * sp[i] + oy))
  }
  shadowPts.push(k.vec2(halfW + ox, -halfH + oy))
  shadowPts.push(k.vec2(-halfW + ox, -halfH + oy))
  k.drawPolygon({ pts: shadowPts, color: k.rgb(100, 130, 180), opacity: 0.5 * opacity })
  //
  // Snow clumps: small extra circles on the mound surface for variation
  //
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
  //
  // Bright highlight offset toward the peak of the asymmetric mound
  //
  let peakIdx = 0
  for (let i = 1; i <= snowSteps; i++) {
    if (sp[i] > sp[peakIdx]) peakIdx = i
  }
  const peakT = peakIdx / snowSteps
  const highlightX = (peakT - 0.5) * w + ox
  k.drawCircle({
    pos: k.vec2(highlightX, -halfH - snowHeight * sp[peakIdx] * 0.7 + oy),
    radius: w * 0.08,
    color: k.rgb(200, 220, 255),
    opacity: 0.6 * opacity
  })
}
//
// Draws a filled oval (ellipse) using a polygon approximation
//
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
  // Bottom corners need higher z-index to render above snowdrifts and other floor elements
  //
  const BOTTOM_CORNER_Z = 26
  //
  // Bottom-left corner (rotate 270°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, CFG.visual.screen.height - BOTTOM_MARGIN),
    k.rotate(270),
    k.z(BOTTOM_CORNER_Z)
  ])
  //
  // Bottom-right corner (rotate 180°)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, CFG.visual.screen.height - BOTTOM_MARGIN),
    k.rotate(180),
    k.z(BOTTOM_CORNER_Z)
  ])
}

/**
 * Checks if the player completed the level faster than the target time
 * @param {number} levelTime - Time in seconds
 * @returns {boolean} True if speed bonus earned
 */
function checkSpeedBonus(levelTime) {
  const targetTime = CFG.gameplay.speedBonusTime
    && CFG.gameplay.speedBonusTime['level-touch.2']
  if (!targetTime) return false
  return levelTime < targetTime
}

/**
 * Play speed bonus visual effects on the small hero indicator
 * Flashes hero color/white and creates circle particles flying outward
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with smallHero
 */
function playSpeedBonusEffects(k, levelIndicator) {
  if (!levelIndicator?.smallHero?.character) return
  const bodyColorHex = levelIndicator.smallHero.bodyColor || CFG.visual.colors.sections.touch.body
  const heroColor = getRGB(k, bodyColorHex)
  flashSmallHeroBonus(k, levelIndicator, heroColor, 0)
  createSpeedBonusParticles(k, levelIndicator, heroColor)
}

/**
 * Flash small hero between hero color and white for speed bonus
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with smallHero
 * @param {Object} heroColor - RGB color matching the hero body
 * @param {number} count - Current flash iteration
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
 * @param {Object} heroColor - RGB color matching the hero body
 */
function createSpeedBonusParticles(k, levelIndicator, heroColor) {
  if (!levelIndicator?.smallHero?.character) return
  const heroX = levelIndicator.smallHero.character.pos.x
  const heroY = levelIndicator.smallHero.character.pos.y
  for (let i = 0; i < SPEED_BONUS_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / SPEED_BONUS_PARTICLE_COUNT
    const speed = SPEED_BONUS_PARTICLE_SPEED_MIN + Math.random() * SPEED_BONUS_PARTICLE_SPEED_RANGE
    const lifetime = SPEED_BONUS_PARTICLE_LIFETIME_MIN + Math.random() * SPEED_BONUS_PARTICLE_LIFETIME_RANGE
    const size = SPEED_BONUS_PARTICLE_SIZE_MIN + Math.random() * SPEED_BONUS_PARTICLE_SIZE_RANGE
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
      if (age >= lifetime && particle.exists?.()) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Draws a full moon with smooth radial glow and craters on the background canvas
 * Uses canvas radial gradient for seamless glow falloff
 * @param {CanvasRenderingContext2D} ctx - Canvas 2D context
 */
function drawLevel2Moon(ctx) {
  ctx.save()
  //
  // Draw smooth radial glow using canvas gradient
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
  //
  // Smooth transition toward target intensity
  //
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
 * Detects hero landing and spawns an expanding ring of particles
 * from under the hero's feet. Uses the existing landing sound from hero.js.
 * @param {Object} k - Kaplay instance
 * @param {Array} rings - Ring array (mutated in place)
 * @param {Object} heroInst - Hero instance
 * @param {boolean} grounded - Whether hero is currently grounded
 * @param {boolean} prevGrounded - Whether hero was grounded on previous frame
 */
function onUpdateLandingRings(k, rings, heroInst, grounded, prevGrounded) {
  const dt = k.dt()
  //
  // Detect landing: hero transitions from airborne to grounded
  //
  if (!prevGrounded && grounded && heroInst.character?.pos) {
    const hx = heroInst.character.pos.x
    const hy = heroInst.character.pos.y + JUMP_RING_FOOT_OFFSET_Y
    //
    // Create one ring with particles distributed along a circle.
    // Each particle has a fixed angle and per-particle jitter seed.
    //
    const particles = []
    for (let i = 0; i < JUMP_RING_PARTICLE_COUNT; i++) {
      const angle = (Math.PI * 2 * i) / JUMP_RING_PARTICLE_COUNT
      particles.push({
        angle,
        jitterX: (Math.random() - 0.5) * JUMP_RING_JITTER,
        jitterY: (Math.random() - 0.5) * JUMP_RING_JITTER
      })
    }
    rings.push({
      cx: hx,
      cy: hy,
      particles,
      radius: 0,
      life: JUMP_RING_LIFETIME,
      maxLife: JUMP_RING_LIFETIME
    })
  }
  //
  // Update existing rings: expand radius, decrease lifetime
  //
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i]
    ring.life -= dt
    if (ring.life <= 0) {
      rings.splice(i, 1)
      continue
    }
    ring.radius += JUMP_RING_EXPAND_SPEED * dt
    //
    // Animate jitter so particles tremble along the ring
    //
    for (const p of ring.particles) {
      p.jitterX += (Math.random() - 0.5) * JUMP_RING_JITTER * dt * 10
      p.jitterY += (Math.random() - 0.5) * JUMP_RING_JITTER * dt * 10
    }
  }
}
//
// Draws expanding ring particles: each dot sits on the ring circumference with jitter
//
function drawJumpRings(k, rings, color) {
  for (const ring of rings) {
    const alpha = ring.life / ring.maxLife
    const dotSize = JUMP_RING_PARTICLE_SIZE * (0.5 + alpha * 0.5)
    for (const p of ring.particles) {
      const px = ring.cx + Math.cos(p.angle) * ring.radius + p.jitterX
      const py = ring.cy + Math.sin(p.angle) * ring.radius + p.jitterY
      k.drawCircle({
        pos: k.vec2(px, py),
        radius: dotSize,
        color,
        opacity: alpha * 0.6
      })
    }
  }
}

/**
 * Shows a timed hint from the anti-hero after ANTIHERO_HINT_DELAY seconds.
 * Only triggers once per level load.
 * @param {Object} k - Kaplay instance
 * @param {Object} hintState - Hint state object
 * @param {Object} antiHeroInst - Anti-hero instance
 */
function onUpdateAntiHeroHint(k, hintState, antiHeroInst) {
  if (hintState.shown) return
  hintState.timer += k.dt()
  if (hintState.timer < ANTIHERO_HINT_DELAY) return
  hintState.shown = true
  //
  // Create a forced-visible tooltip above the anti-hero
  //
  const target = {
    x: () => antiHeroInst.character.pos.x,
    y: () => antiHeroInst.character.pos.y,
    width: 0,
    height: 0,
    text: ANTIHERO_HINT_TEXT,
    offsetY: ANTIHERO_HINT_Y_OFFSET
  }
  hintState.currentHint = Tooltip.create({
    k,
    targets: [target],
    forceVisible: true
  })
  hintState.currentHint.activeTarget = target
  hintState.currentHint.frozenX = Math.round(antiHeroInst.character.pos.x)
  hintState.currentHint.frozenY = Math.round(antiHeroInst.character.pos.y)
  hintState.currentHint.opacity = 1
  k.wait(ANTIHERO_HINT_DISPLAY_TIME, () => {
    hintState.currentHint && Tooltip.destroy(hintState.currentHint)
    hintState.currentHint = null
  })
}

/**
 * Generates right-side floor icicles (bottom platform right portion).
 * Always present from the start of the level.
 * @returns {Array} Array of icicle objects
 */
function generateRightIcicles() {
  const icicles = []
  for (let x = RIGHT_ICICLE_START_X; x < RIGHT_ICICLE_END_X; x += RIGHT_ICICLE_SPACING) {
    //
    // Skip icicles near hero spawn point (clearance zone)
    //
    if (Math.abs(x - RIGHT_ICICLE_HERO_CLEAR_X) < RIGHT_ICICLE_HERO_CLEAR_RADIUS) continue
    icicles.push({
      x: x + (Math.random() - 0.5) * 8,
      baseY: FLOOR_Y,
      width: ICICLE_WIDTH_MIN + Math.random() * (ICICLE_WIDTH_MAX - ICICLE_WIDTH_MIN),
      height: ICICLE_HEIGHT_MIN + Math.random() * (ICICLE_HEIGHT_MAX - ICICLE_HEIGHT_MIN),
      tipOffset: (Math.random() - 0.5) * 4
    })
  }
  return icicles
}

/**
 * Generates icicles hanging under visible log platforms (point downward).
 * Skips trap platform and platforms in HANGING_ICICLE_SKIP_INDICES.
 * @param {Array} platformStates - Platform state objects from createDiagonalPlatforms
 * @returns {Array} Array of hanging icicle objects { x, topY, width, height, tipOffset }
 */
function generateHangingIcicles(platformStates) {
  const icicles = []
  const platformHeight = 30
  platformStates.forEach((state, idx) => {
    if (state.isTrap || state.isFake) return
    if (HANGING_ICICLE_SKIP_INDICES.includes(idx)) return
    const halfW = state.width / 2
    for (let i = 0; i < HANGING_ICICLE_COUNT_PER_PLATFORM; i++) {
      const t = (i + 0.5) / HANGING_ICICLE_COUNT_PER_PLATFORM
      const ox = (t - 0.5) * (state.width - 16) + (Math.random() - 0.5) * 6
      icicles.push({
        x: state.x + ox,
        topY: state.y + platformHeight / 2,
        width: HANGING_ICICLE_WIDTH_MIN + Math.random() * (HANGING_ICICLE_WIDTH_MAX - HANGING_ICICLE_WIDTH_MIN),
        height: HANGING_ICICLE_HEIGHT_MIN + Math.random() * (HANGING_ICICLE_HEIGHT_MAX - HANGING_ICICLE_HEIGHT_MIN),
        tipOffset: (Math.random() - 0.5) * 2,
        platformIdx: idx
      })
    }
  })
  return icicles
}
//
// Draws icicles hanging downward from platform bottoms.
// Only draws icicles whose parent platform is visible (opacity > 0).
// Applies the parent platform's shake offset so icicles move with the platform.
//
function drawHangingIcicles(k, data, platformStates) {
  const outlineColor = k.rgb(0, 0, 0)
  const icicleColor = k.rgb(ICICLE_COLOR_R, ICICLE_COLOR_G, ICICLE_COLOR_B)
  const ow = ICICLE_OUTLINE_WIDTH
  for (const ic of data) {
    const pState = platformStates[ic.platformIdx]
    if (!pState || pState.opacity <= 0) continue
    const sx = pState.shakeOffsetX || 0
    const sy = pState.shakeOffsetY || 0
    const cx = ic.x + sx
    const cy = ic.topY + sy
    k.drawPolygon({
      pts: [
        k.vec2(cx - ic.width / 2 - ow, cy - ow),
        k.vec2(cx + ic.width / 2 + ow, cy - ow),
        k.vec2(cx + ic.tipOffset, cy + ic.height + ow)
      ],
      color: outlineColor,
      opacity: pState.opacity * 0.8
    })
    k.drawPolygon({
      pts: [
        k.vec2(cx - ic.width / 2, cy),
        k.vec2(cx + ic.width / 2, cy),
        k.vec2(cx + ic.tipOffset, cy + ic.height)
      ],
      color: icicleColor,
      opacity: pState.opacity * 0.85
    })
  }
}
//
// Checks if hero collides with hanging icicles.
// Uses hero's head position (center minus offset) for accurate vertical overlap.
// Only checks icicles whose parent platform is visible.
//
function checkHangingIcicleCollision(k, heroInst, data, levelIndicator, platformStates) {
  if (data.length === 0) return
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y
  const heroTopY = heroY - HERO_FEET_OFFSET
  const heroBottomY = heroY + HERO_FEET_OFFSET
  for (const ic of data) {
    const pState = platformStates[ic.platformIdx]
    if (!pState || pState.opacity <= 0) continue
    const dx = Math.abs(heroX - ic.x)
    if (dx > ic.width / 2 + 10) continue
    //
    // Vertical overlap: hero range [heroTopY, heroBottomY] vs icicle range [topY, topY+height]
    //
    if (heroTopY < ic.topY + ic.height && heroBottomY > ic.topY) {
      onHeroDeath(k, heroInst, levelIndicator)
      return
    }
  }
}
