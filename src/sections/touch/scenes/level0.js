import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as SmallBugs from '../components/small-bugs.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as BugPyramid from '../components/bug-pyramid.js'
import * as LevelIndicator from '../components/level-indicator.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { toPng, getRGB } from '../../../utils/helper.js'
import * as LifeDeduction from '../utils/life-deduction.js'
import { drawThorns } from '../components/jungle-decor.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as Rain from '../components/rain.js'
//
// Bug constants (from bugs.js)
//
const BUG_BODY_SIZE = 6
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Rounded corner configuration
//
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'touch0-corner-sprite'
const WALL_COLOR_HEX = '#1F1F1F'
//
// Platform dimensions
//
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN
//
// Floor thorns on bottom platform: clusters with gaps (same spike style as touch level 3)
//
const FLOOR_THORN_SPACING = 22
const FLOOR_THORN_WIDTH_MIN = 7
const FLOOR_THORN_WIDTH_MAX = 14
//
// Random spike count per cluster (inclusive range) so strips stay jumpable; gaps between clusters
//
const FLOOR_THORN_MIN_PER_CLUSTER = 2
const FLOOR_THORN_MAX_PER_CLUSTER = 6
const FLOOR_THORN_HEIGHT_MIN = 11
const FLOOR_THORN_HEIGHT_MAX = 20
const FLOOR_THORN_TIP_OFFSET = 3
const FLOOR_THORN_RAISE_OFFSET = 3
const FLOOR_THORN_CLUSTER_MIN = 70
const FLOOR_THORN_CLUSTER_EXTRA = 140
const FLOOR_THORN_GAP_MIN = 80
const FLOOR_THORN_GAP_EXTRA = 140
const FLOOR_THORN_EDGE_INSET = 40
const HERO_COLLISION_HEIGHT_THORNS = 25
const HERO_SCALE_THORNS = 3
const HERO_COLLISION_HEIGHT_SCALED_THORNS = HERO_COLLISION_HEIGHT_THORNS * HERO_SCALE_THORNS
const FLOOR_THORN_FEET_TOLERANCE_LOW = 22
const FLOOR_THORN_FEET_TOLERANCE_HIGH = 12
const FLOOR_THORN_DEATH_RELOAD_DELAY = 0.8
//
// Z: floor thorns above platform (16), below grass blades (20) so spikes sit on floor but under grass
//
const FLOOR_THORN_DRAW_Z = CFG.visual.zIndex.platforms + 2
//
// Hero spawn positions
//
const HERO_SPAWN_X = LEFT_MARGIN + 100
const HERO_SPAWN_Y = FLOOR_Y - 50
//
// No grass blades or floor thorns centered on hero start (horizontal band)
//
const HERO_SPAWN_GRASS_THORN_EXCLUDE_HALF_WIDTH = 140
//
// Floor thorn spikes (touch level 0): blue blades, black outline via drawThorns
//
const FLOOR_THORN_BLADE_FILL_R = 100
const FLOOR_THORN_BLADE_FILL_G = 195
const FLOOR_THORN_BLADE_FILL_B = 235
//
// Life image flash + red particles on thorn death (same as touch level 3)
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
//
// Speed bonus effects (flash small hero + particles on quick completion)
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
//
// Life deduction (level-specific flags and threshold)
//
const LIFE_DEDUCT_THRESHOLD = 10
const LIFE_DEDUCT_FLAG = 'touch.lifeDeducted'
//
// Instructions animation constants
//
const INSTRUCTIONS_INITIAL_DELAY = 1.0
const INSTRUCTIONS_FADE_IN_DURATION = 0.8
const INSTRUCTIONS_HOLD_DURATION = 4.0
const INSTRUCTIONS_FADE_OUT_DURATION = 0.8
const INSTRUCTIONS_FONT_SIZE = 24
const INSTRUCTIONS_OUTLINE_OFFSET = 2
const INSTRUCTIONS_TEXT = "← → - move,  ↑ Space - jump,  ESC - menu,  use mouse"
//
// Monster conversation system (timed dialogue between 3 monsters)
//
const MONSTER_CONVERSATION_DELAY = 20
const MONSTER_CHARS_PER_SECOND = 12
const MONSTER_MIN_DISPLAY_TIME = 2.5
const MONSTER_PAUSE_BETWEEN = 1.0
const MONSTER_CONVERSATION_LINES = [
  { speaker: 0, text: "look. the grey one is\ntouching the bugs again" },
  { speaker: 1, text: "why do they always\ntouch the bugs?" },
  { speaker: 2, text: "because small things\ngather into bigger things.\nthat is philosophy" },
  { speaker: 1, text: "I touched the bugs once" },
  { speaker: 0, text: "yes. you became taller" },
  { speaker: 1, text: "so... touching the world\nchanges you?" },
  { speaker: 2, text: "usually" },
  { speaker: 1, text: "should we tell him?" },
  { speaker: 0, text: "no. understanding must\ngrow on its own" }
]
const MONSTER_CONVERSATION_STORAGE_KEY = 'conversations.monsterSeen'
//
// Bug4 (anti-hero platform monster) tooltip - head-only hover zone, appears below
//
const BUG4_TOOLTIP_TEXT = "gather nearby bugs to reach higher"
const BUG4_TOOLTIP_HOVER_WIDTH = 60
const BUG4_TOOLTIP_HOVER_HEIGHT = 40
const BUG4_TOOLTIP_Y_OFFSET = 50
//
// Floor monster (bug0-2) hover tooltip
//
const FLOOR_MONSTER_TOOLTIP_TEXT = "What?!"
const FLOOR_MONSTER_TOOLTIP_HOVER_SIZE = 60
const FLOOR_MONSTER_TOOLTIP_Y_OFFSET = -80
//
// TOUCH indicator tooltip
//
const TOUCH_INDICATOR_TOOLTIP_TEXT = "here you see how far you have\ncome in learning touch"
const TOUCH_INDICATOR_TOOLTIP_WIDTH = 250
const TOUCH_INDICATOR_TOOLTIP_HEIGHT = 50
const TOUCH_INDICATOR_TOOLTIP_Y_OFFSET = -30
//
// Small bug tooltip (jokes and after green time expires)
//
const SMALL_BUG_TOOLTIP_TEXT_HINT = "gather us in one place\nand we will help you"
const SMALL_BUG_TOOLTIP_HOVER_SIZE = 50
const SMALL_BUG_TOOLTIP_Y_OFFSET = -50
//
// Bug jokes (2x the number of bugs, shown randomly on hover)
//
const SMALL_BUG_JOKES = [
  "I'm not a bug,\nI'm a feature",
  "do these legs\nmake me look fast?",
  "I once outran\na pixel",
  "my therapist says\nI have too many legs",
  "I tried yoga.\ndownward bug is hard",
  "is it just me\nor is the floor moving?",
  "don't step on me.\nI have feelings",
  "I'm on a seafood diet.\nI see food, I run",
  "my left legs never\nagree with my right",
  "I was employee\nof the month once",
  "I don't need a gym.\nI carry my own weight",
  "running is cheaper\nthan therapy",
  "I dream of being\na butterfly sometimes",
  "my ancestors were\ndinosaurs. probably",
  "fun fact: I have more\nlegs than friends",
  "the floor is lava.\njust kidding. or is it?",
  "I'm not lost.\nI'm exploring",
  "two bugs walk into\na bar. ouch",
  "why did I cross\nthe screen? no idea",
  "I'm basically\na tiny horse",
  "excuse me, is this\nthe way to the exit?",
  "my horoscope said\nstay home today",
  "I could've been\na spider but no",
  "plot twist:\nI'm the main character"
]
//
// Anti-hero tooltip (reduced height to avoid overlap with bug4 below)
//
const ANTIHERO_TOOLTIP_TEXT = "try to reach me"
const ANTIHERO_TOOLTIP_HOVER_WIDTH = 80
const ANTIHERO_TOOLTIP_HOVER_HEIGHT = 60
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
//
// Hero tooltip (raised higher so it sits above bug tooltips)
//
const HERO_TOOLTIP_TEXT = "you are here.\ntry to find yourself"
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -100
//
// Green timer tooltip (appears below the timer text)
//
const GREEN_TIMER_TOOLTIP_TEXT = "complete the level in time\nto earn more points"
const GREEN_TIMER_TOOLTIP_WIDTH = 80
const GREEN_TIMER_TOOLTIP_HEIGHT = 30
const GREEN_TIMER_TOOLTIP_Y_OFFSET = 50
//
// Small hero and life icon tooltips (appear below)
//
const SMALL_HERO_TOOLTIP_TEXT = "your score"
const SMALL_HERO_TOOLTIP_SIZE = 60
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_TEXT = "life score"
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50
//
// Floor thorns tooltip
//
const FLOOR_THORNS_TOOLTIP_TEXT = "try to touch me"
const FLOOR_THORNS_TOOLTIP_HEIGHT = 40
const FLOOR_THORNS_TOOLTIP_Y_OFFSET = -30
//
// Bird tooltip
//
const BIRD_TOOLTIP_TEXT = "I believe I can fly"
const BIRD_TOOLTIP_HOVER_SIZE = 40
const BIRD_TOOLTIP_Y_OFFSET = -30
//
// Small bug random phrases (shown as speech bubbles with long pauses)
//
const BUG_PHRASE_MIN_PAUSE = 25
const BUG_PHRASE_EXTRA_PAUSE = 20
const BUG_PHRASE_CHARS_PER_SECOND = 12
const BUG_PHRASE_MIN_DISPLAY_TIME = 2.5
const BUG_PHRASE_Y_OFFSET = -40
const SMALL_BUG_PHRASES = [
  "what a great day\nfor a run",
  "gotta go fast",
  "left, right, left, right...",
  "I love running",
  "need to get everything\ndone today",
  "where did everyone go?",
  "are we there yet?",
  "my legs never get tired",
  "the floor is warm today",
  "I wonder what's\nover there",
  "running is my therapy",
  "one more lap...\nmaybe two",
  "has anyone seen\nmy shadow?",
  "this ground smells\nlike adventure",
  "I think I saw\na crumb somewhere",
  "life is short.\nrun faster",
  "do bugs dream\nof electric crumbs?",
  "my left legs are\nfaster than my right"
]
//
// Trap spikes: hidden spikes that emerge from the floor when hero approaches
//
const TRAP_TRIGGER_X = 700
const TRAP_TRIGGER_RADIUS = 140
const TRAP_SPIKE_COUNT = 4
const TRAP_SPIKE_SPACING = 28
const TRAP_SPIKE_WIDTH_BASE = 10
const TRAP_SPIKE_HEIGHT_MIN = 50
const TRAP_SPIKE_HEIGHT_MAX = 80
const TRAP_RISE_DURATION = 0.3
const TRAP_HOLD_DURATION = 2.0
const TRAP_RETRACT_DURATION = 0.8
//
// Tentacle wiggle parameters
//
const TRAP_WIGGLE_SPEED = 3.0
const TRAP_WIGGLE_AMPLITUDE = 8
const TRAP_SEGMENTS = 10
//
// Tentacle eye parameters (eye at the tip that follows the hero)
//
const TRAP_EYE_RADIUS = 4
const TRAP_PUPIL_RADIUS = 2
const TRAP_PUPIL_MAX_OFFSET = 1.5
const TRAP_EYE_SEGMENT = 0.15
const TRAP_EXCLUSION_HALF_WIDTH = 200
const TRAP_SPIKE_FILL_R = 180
const TRAP_SPIKE_FILL_G = 60
const TRAP_SPIKE_FILL_B = 60
const TRAP_TOOLTIP_TEXT = "surprise"
const TRAP_TOOLTIP_Y_OFFSET = -30
//
// Anti-hero platform (right side, above hero height)
//
const HERO_HEIGHT = 96  // SPRITE_SIZE (32) * HERO_SCALE (3)
const ANTIHERO_PLATFORM_Y = FLOOR_Y - HERO_HEIGHT - 80  // Above hero height (lowered)
/**
 * Level 0 scene for touch section - Introduction level
 * Large game area with minimal obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-touch.0", () => {
    //
    // Reset scores only if coming from a different section (not a reload after death)
    //
    const lastLevel = get('lastLevel', '')
    const isComingFromDifferentSection = !lastLevel || typeof lastLevel !== 'string' || !lastLevel.startsWith('level-touch.')
    
    if (isComingFromDifferentSection) {
      set('heroScore', 0)
      set('lifeScore', 0)
    }
    //
    // Save progress
    //
    set('lastLevel', 'level-touch.0')
    //
    // Set background to match wall color (prevents visible bars at top/bottom)
    //
    k.setBackground(k.rgb(31, 31, 31))
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
    // Draw background
    //
    k.onDraw(() => {
      k.drawRect({
        width: k.width(),
        height: k.height(),
        pos: k.vec2(0, 0),
        color: k.rgb(42, 42, 42)  // CFG.visual.colors.background
      })
    })
    //
    // Create dark background clouds in the distance at the top
    //
    createBackgroundClouds(k)
    //
    // Create simple bottom platform
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
      levelNumber: 0,
      activeColor: '#8B5A50',
      inactiveColor: '#808080',
      completedColor: '#8B5A50',
      heroBodyColor,
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    //
    // Life deduction intro: show once when lifeScore reaches threshold for the first time
    //
    const currentLifeScore = get('lifeScore', 0)
    const alreadyDeducted = get(LIFE_DEDUCT_FLAG, false)
    const trapAlreadyActive = get('touch.trapActive', false)
    const lifeDeducted = !alreadyDeducted && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    //
    // Scene-level lock: hero controls are disabled during the life deduction animation
    //
    const sceneLock = { locked: lifeDeducted }
    //
    // Show keyboard controls instructions (delayed if life deduction animation plays)
    //
    showInstructions(k, lifeDeducted ? LifeDeduction.TOTAL_DURATION : 0)
    if (lifeDeducted) {
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        extraFlags: ['touch.trapActive'],
        sceneLock
      })
    }
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
    // Thorn spikes along the bottom floor in random clusters with gaps (jump-through holes)
    //
    const floorThornBaseY = FLOOR_Y - FLOOR_THORN_RAISE_OFFSET
    const floorThornStartX = LEFT_MARGIN + FLOOR_THORN_EDGE_INSET
    const floorThornEndX = CFG.visual.screen.width - RIGHT_MARGIN - FLOOR_THORN_EDGE_INSET
    const FLOOR_THORN_MAX_CLUSTERS = 3
    const floorThornExcludeZones = [
      { center: HERO_SPAWN_X, halfWidth: HERO_SPAWN_GRASS_THORN_EXCLUDE_HALF_WIDTH },
      { center: TRAP_TRIGGER_X, halfWidth: TRAP_EXCLUSION_HALF_WIDTH }
    ]
    const floorThornData = generateFloorThornsWithGaps(
      floorThornStartX,
      floorThornEndX,
      floorThornBaseY,
      floorThornExcludeZones,
      FLOOR_THORN_MAX_CLUSTERS
    )
    //
    // Draw thorns after background sprites (z=7), under grass (z=20); k.onDraw would paint under the full-screen tree canvas
    //
    k.add([
      k.z(FLOOR_THORN_DRAW_Z),
      {
        draw() {
          drawThorns(
            k,
            floorThornData,
            k.rgb(FLOOR_THORN_BLADE_FILL_R, FLOOR_THORN_BLADE_FILL_G, FLOOR_THORN_BLADE_FILL_B)
          )
        }
      }
    ])
    //
    // Anti-hero platform position (for reference - will be replaced by bug)
    // Note: platformCenterX is defined later when creating bug4
    //
    //
    // Create grass/bushes/trees decoration with parallax depth layers
    //
    const grassY = FLOOR_Y - 2
    const playableWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    const bgColor = { r: 42, g: 42, b: 42 }
    //
    // Create parallax layers (all three layers)
    //
    const layers = []
    const layerConfigs = [
      { name: 'back', colorMix: 0.2, opacity: 1.0, yOffset: 0, scale: 1.5 },      // Tallest, opaque to cover darkened area
      { name: 'middle', colorMix: 0.55, opacity: 1.0, yOffset: -15, scale: 1.0 }, // Medium height, medium contrast
      { name: 'front', colorMix: 1.0, opacity: 0.95, yOffset: -30, scale: 0.6 }   // Shortest, bright colors
    ]
    
    for (let layerIndex = 0; layerIndex < layerConfigs.length; layerIndex++) {
      const config = layerConfigs[layerIndex]
      const colorMix = config.colorMix
      const baseOpacity = config.opacity
      const yOffset = config.yOffset
      const scale = config.scale
      //
      // Interpolate color towards background for distant layers
      // Back layer (layerIndex 0) - monochrome dark
      // Middle layer (layerIndex 1) - dark colored (dark green leaves, dark brown trunk)
      // Front layer (layerIndex 2) - bright colored (bright green leaves, brown trunk, bright green grass)
      //
      const grassBaseR = layerIndex === 2 ? 40 : 50 * colorMix + bgColor.r * (1 - colorMix)
      const grassBaseG = layerIndex === 2 ? 85 : 80 * colorMix + bgColor.g * (1 - colorMix)
      const grassBaseB = layerIndex === 2 ? 40 : 50 * colorMix + bgColor.b * (1 - colorMix)
      
      const bushBaseR = layerIndex === 2 ? 35 : 35 * colorMix + bgColor.r * (1 - colorMix)
      const bushBaseG = layerIndex === 2 ? 70 : 55 * colorMix + bgColor.g * (1 - colorMix)
      const bushBaseB = layerIndex === 2 ? 35 : 35 * colorMix + bgColor.b * (1 - colorMix)
      
      const treeLeafR = layerIndex === 0 ? 12 * colorMix + bgColor.r * (1 - colorMix) : (layerIndex === 1 ? 12 * colorMix + bgColor.r * (1 - colorMix) : 40)
      const treeLeafG = layerIndex === 0 ? 16 * colorMix + bgColor.g * (1 - colorMix) : (layerIndex === 1 ? 16 * colorMix + bgColor.g * (1 - colorMix) : 75)
      const treeLeafB = layerIndex === 0 ? 12 * colorMix + bgColor.b * (1 - colorMix) : (layerIndex === 1 ? 12 * colorMix + bgColor.b * (1 - colorMix) : 40)
      
      const treeTrunkR = layerIndex === 0 ? 10 * colorMix + bgColor.r * (1 - colorMix) : (layerIndex === 1 ? 10 * colorMix + bgColor.r * (1 - colorMix) : 70)
      const treeTrunkG = layerIndex === 0 ? 10 * colorMix + bgColor.g * (1 - colorMix) : (layerIndex === 1 ? 10 * colorMix + bgColor.g * (1 - colorMix) : 50)
      const treeTrunkB = layerIndex === 0 ? 10 * colorMix + bgColor.b * (1 - colorMix) : (layerIndex === 1 ? 10 * colorMix + bgColor.b * (1 - colorMix) : 30)
      //
      // Generate grass blade data for this layer
      // All grass grows from ground level (grassY), not affected by yOffset
      // Back layer most dense (continuous), front layer least dense
      //
      const grassBlades = []
      const grassDensity = layerIndex === 0 ? 120 : (layerIndex === 1 ? 50 : 25)
      const bladesCount = Math.floor(grassDensity * scale)
      
      for (let i = 0; i < bladesCount; i++) {
        let baseX = LEFT_MARGIN + Math.random() * playableWidth
        let rejectGuard = 0
        while (
          Math.abs(baseX - HERO_SPAWN_X) < HERO_SPAWN_GRASS_THORN_EXCLUDE_HALF_WIDTH &&
          rejectGuard < 60
        ) {
          baseX = LEFT_MARGIN + Math.random() * playableWidth
          rejectGuard++
        }
        const height = (10 + Math.random() * 20) * scale
        const bendX = (Math.random() - 0.5) * 6
        const swaySpeed = 0.8 + Math.random() * 0.6
        const swayAmount = (2 + Math.random() * 3) * scale
        const swayOffset = Math.random() * Math.PI * 2
        
        grassBlades.push({
          x1: baseX,
          y1: grassY,
          baseX2: baseX + bendX,
          y2: grassY - height,
          height: height,
          swaySpeed: swaySpeed,
          swayAmount: swayAmount,
          swayOffset: swayOffset,
          color: k.rgb(
            grassBaseR + Math.random() * 20,
            grassBaseG + Math.random() * 20,
            grassBaseB + Math.random() * 15
          ),
          opacity: baseOpacity + Math.random() * 0.15,
          width: (0.8 + Math.random() * 0.4) * scale
        })
      }
      //
      // Generate bush data for this layer
      // For front layer: don't create bushes separately, will alternate with trees
      //
      const bushes = []
      const bushCount = layerIndex === 2 ? 0 : 0
      
      for (let i = 0; i < bushCount; i++) {
        const spacing = playableWidth / (bushCount + 1)
        const randomness = layerIndex === 0 ? 30 : (layerIndex === 1 ? 60 : 40)
        const bushX = LEFT_MARGIN + spacing * (i + 1) + (Math.random() - 0.5) * randomness
        const baseBushSize = (40 + Math.random() * 60) * scale
        
        const bush = {
          x: bushX,
          y: grassY + yOffset - baseBushSize / 2,
          size: baseBushSize,
          color: k.rgb(
            bushBaseR + Math.random() * 15,
            bushBaseG + Math.random() * 15,
            bushBaseB + Math.random() * 10
          ),
          opacity: baseOpacity + Math.random() * 0.1
        }
        
        bushes.push(bush)
      }
      //
      // Generate tree data for this layer
      // For front layer: create both trees and bushes in alternating pattern
      //
      const trees = []
      const treeCount = layerIndex === 0 ? 18 : (layerIndex === 1 ? 5 : 0)
      
      for (let i = 0; i < treeCount; i++) {
        const spacing = playableWidth / (treeCount - 1)
        const randomness = layerIndex === 0 ? 20 : (layerIndex === 1 ? 40 : 25)
        const treeX = LEFT_MARGIN + spacing * i + (Math.random() - 0.5) * randomness
        const baseTreeHeight = (120 + Math.random() * 100) * scale
        const crownCenterY = grassY + yOffset - baseTreeHeight
        const trunkTop = crownCenterY
        const trunkBottom = grassY
        const trunkHeight = trunkBottom - trunkTop
        const trunkWidth = layerIndex === 0 ? (4 + Math.random() * 4) * scale : (6 + Math.random() * 6) * scale
        const crownSize = (50 + Math.random() * 60) * scale
        
        const crownCount = layerIndex === 0 ? 5 + Math.floor(Math.random() * 4) : 3 + Math.floor(Math.random() * 3)
        const crowns = []
        
        for (let j = 0; j < crownCount; j++) {
          crowns.push({
            offsetX: (Math.random() - 0.5) * crownSize * (layerIndex === 0 ? 0.7 : 0.5),
            offsetY: (Math.random() - 0.5) * crownSize * (layerIndex === 0 ? 0.5 : 0.4),
            sizeVariation: layerIndex === 0 ? 0.6 + Math.random() * 0.6 : 0.8 + Math.random() * 0.5,
            opacityVariation: layerIndex === 0 ? 0.7 + Math.random() * 0.2 : 0.85 + Math.random() * 0.15
          })
        }
        
        const tree = {
          x: treeX,
          y: grassY + yOffset,
          trunkTop: trunkTop,
          trunkBottom: trunkBottom,
          trunkHeight: trunkHeight,
          trunkWidth: trunkWidth,
          crownSize: crownSize,
          crownCenterY: crownCenterY,
          crowns: crowns,
          trunkColor: k.rgb(
            treeTrunkR,
            treeTrunkG,
            treeTrunkB
          ),
          leafColor: k.rgb(
            treeLeafR,
            treeLeafG,
            treeLeafB
          ),
          opacity: layerIndex === 0 ? 0.85 + Math.random() * 0.1 : baseOpacity,
          swaySpeed: 0.2 + Math.random() * 0.15,
          swayAmount: (1 + Math.random() * 1.5) * scale,
          swayOffset: Math.random() * Math.PI * 2
        }
        
        trees.push(tree)
      }
      //
      // For front layer: create alternating trees and bushes
      //
      if (layerIndex === 2) {
        const totalElements = 14
        const spacing = playableWidth / (totalElements - 1)
        const TREE_MARGIN = 80
        
        for (let i = 0; i < totalElements; i++) {
          const randomness = 25
          //
          // Limit randomness for first and last elements to prevent overflow
          //
          let randomOffset = (Math.random() - 0.5) * randomness
          //
          // For first element: add extra margin and only allow positive offset
          //
          if (i === 0) {
            randomOffset = Math.max(0, randomOffset) + TREE_MARGIN
          }
          //
          // For last element: subtract extra margin and only allow negative offset
          //
          if (i === totalElements - 1) {
            randomOffset = Math.min(0, randomOffset) - TREE_MARGIN
          }
          
          const posX = LEFT_MARGIN + spacing * i + randomOffset
          const isBush = Math.random() < 0.35
          
          if (isBush) {
            const bushWidth = (30 + Math.random() * 30) * scale
            const bushHeight = (25 + Math.random() * 25) * scale
            const bushCenterY = grassY + yOffset - bushHeight * 0.6
            
            const colorType = Math.floor(Math.random() * 4)
            let baseLeafR, baseLeafG, baseLeafB
            
            if (colorType === 0) {
              baseLeafR = 35
              baseLeafG = 70
              baseLeafB = 35
            } else if (colorType === 1) {
              baseLeafR = 75
              baseLeafG = 65
              baseLeafB = 25
            } else if (colorType === 2) {
              baseLeafR = 85
              baseLeafG = 45
              baseLeafB = 25
            } else {
              baseLeafR = 70
              baseLeafG = 35
              baseLeafB = 30
            }
            
            const crownCount = 12 + Math.floor(Math.random() * 8)
            const crowns = []
            
            for (let j = 0; j < crownCount; j++) {
              const angle = Math.random() * Math.PI * 2
              const radiusX = Math.random() * 0.9
              const radiusY = Math.random() * 0.9
              
              const x = Math.cos(angle) * radiusX * bushWidth
              const y = Math.sin(angle) * radiusY * bushHeight
              
              const heightRatio = (y + bushHeight) / (bushHeight * 2)
              const centerDistance = Math.sqrt((x * x) / (bushWidth * bushWidth) + (y * y) / (bushHeight * bushHeight))
              
              const isTop = heightRatio > 0.6
              const brightness = isTop ? 15 + Math.random() * 20 : -10 + Math.random() * 10
              
              const size = centerDistance < 0.4 ? 0.3 + Math.random() * 0.2 :
                          0.2 + Math.random() * 0.2
              
              crowns.push({
                offsetX: x,
                offsetY: y,
                sizeVariation: size,
                opacityVariation: 0.8 + Math.random() * 0.2,
                colorShift: brightness
              })
            }
            
            const bush = {
              x: posX,
              y: bushCenterY,
              size: Math.max(bushWidth, bushHeight),
              crowns: crowns,
              color: k.rgb(baseLeafR, baseLeafG, baseLeafB),
              opacity: 0.95
            }
            
            bushes.push(bush)
          } else {
            const baseTreeHeight = (250 + Math.random() * 400) * scale
            const crownCenterY = grassY + yOffset - baseTreeHeight
            const trunkBottom = grassY
            const trunkActualHeight = baseTreeHeight * (0.6 + Math.random() * 0.1)
            const trunkTop = trunkBottom - trunkActualHeight
            const trunkWidth = (5 + Math.random() * 3) * scale
            const crownWidth = (45 + Math.random() * 35) * scale
            const crownHeight = (50 + Math.random() * 40) * scale
            
            const colorType = Math.floor(Math.random() * 4)
            let baseLeafR, baseLeafG, baseLeafB
            
            if (colorType === 0) {
              baseLeafR = 40
              baseLeafG = 75
              baseLeafB = 40
            } else if (colorType === 1) {
              baseLeafR = 80
              baseLeafG = 70
              baseLeafB = 30
            } else if (colorType === 2) {
              baseLeafR = 90
              baseLeafG = 50
              baseLeafB = 30
            } else {
              baseLeafR = 75
              baseLeafG = 40
              baseLeafB = 35
            }
            
            const branchCount = 3 + Math.floor(Math.random() * 3)
            const branches = []
            let highestBranchY = trunkBottom
            
            for (let b = 0; b < branchCount; b++) {
              const branchAngle = ((b / branchCount) * Math.PI * 1.2 - Math.PI * 0.6) + (Math.random() - 0.5) * 0.4
              const branchLength = (50 + Math.random() * 40) * scale
              const branchWidth = trunkWidth * (0.6 + Math.random() * 0.3)
              const branchStartHeight = trunkTop + trunkActualHeight * (0.3 + Math.random() * 0.4)
              
              if (branchStartHeight < highestBranchY) {
                highestBranchY = branchStartHeight
              }
              
              branches.push({
                startX: 0,
                startY: branchStartHeight,
                endX: Math.sin(branchAngle) * branchLength,
                endY: branchStartHeight - Math.abs(Math.cos(branchAngle)) * branchLength,
                width: branchWidth,
                angle: branchAngle
              })
            }
            
            const actualTrunkTop = highestBranchY
            const actualTrunkHeight = trunkBottom - actualTrunkTop
            
            const crownCount = 25 + Math.floor(Math.random() * 15)
            const crowns = []
            
            for (let j = 0; j < crownCount; j++) {
              const branchIndex = Math.floor(Math.random() * branches.length)
              const branch = branches[branchIndex]
              const alongBranch = 0.4 + Math.random() * 0.6
              
              const branchX = branch.startX + (branch.endX - branch.startX) * alongBranch
              const branchY = branch.startY + (branch.endY - branch.startY) * alongBranch
              
              const clusterRadius = (18 + Math.random() * 25) * scale
              const angle = Math.random() * Math.PI * 2
              const distance = Math.random() * clusterRadius
              
              const x = branchX + Math.cos(angle) * distance
              const y = branchY + Math.sin(angle) * distance * 0.8
              
              const distFromBranch = distance / clusterRadius
              const heightFromGround = (y - crownCenterY) / crownHeight
              
              const isTop = heightFromGround < -0.3
              const brightness = isTop ? 15 + Math.random() * 25 : -15 + Math.random() * 15
              
              const size = distFromBranch < 0.5 ? 0.25 + Math.random() * 0.25 :
                          0.15 + Math.random() * 0.2
              
              crowns.push({
                offsetX: x,
                offsetY: y - crownCenterY,
                sizeVariation: size,
                opacityVariation: 0.8 + Math.random() * 0.2,
                colorShift: brightness
              })
            }
            
            const tree = {
              x: posX,
              y: grassY + yOffset,
              trunkTop: actualTrunkTop,
              trunkBottom: trunkBottom,
              trunkHeight: actualTrunkHeight,
              trunkWidth: trunkWidth,
              crownSize: Math.max(crownWidth, crownHeight),
              crownCenterY: crownCenterY,
              crowns: crowns,
              branches: branches,
              trunkColor: k.rgb(
                60 + Math.random() * 20,
                40 + Math.random() * 15,
                25 + Math.random() * 10
              ),
              leafColor: k.rgb(
                baseLeafR,
                baseLeafG,
                baseLeafB
              ),
              opacity: 0.95,
              swaySpeed: 0.15 + Math.random() * 0.1,
              swayAmount: (0.8 + Math.random() * 1.0) * scale,
              swayOffset: Math.random() * Math.PI * 2
            }
            
            trees.push(tree)
          }
        }
      }
      
      layers.push({ grassBlades, bushes, trees, name: config.name })
    }
    //
    // Create two background canvases: one for back layer, one for middle+front
    //
    const createBackLayerCanvas = () => {
      return toPng({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
        //
        // 1. Draw darkened ground area
        //
        if (layers.length > 0 && layers[0].trees.length > 0) {
          const backLayer = layers[0]
          const avgCrownY = backLayer.trees.reduce((sum, t) => sum + t.crownCenterY, 0) / backLayer.trees.length
          const floorY = FLOOR_Y
          
          ctx.fillStyle = 'rgb(28, 28, 28)'
          ctx.fillRect(0, avgCrownY, k.width(), floorY - avgCrownY)
        }
        //
        // 2. Draw back layer only (layerIndex 0)
        //
        if (layers[0]) {
          drawLayerToCanvas(ctx, layers[0], 0, null)
        }
      })
    }
    
    const createMiddleFrontCanvas = () => {
      //
      // Calculate dynamic tree indices (will be drawn separately)
      //
      const allFrontTrees = layers[2] ? layers[2].trees : []
      const dynamicTreesSet = new Set()
      for (let i = 0; i < allFrontTrees.length; i++) {
        if (i % 5 < 2) {
          dynamicTreesSet.add(i)
        }
      }
      
      return toPng({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
        //
        // 1. Draw middle layer (all trees)
        //
        if (layers[1]) {
          drawLayerToCanvas(ctx, layers[1], 0, null)
        }
        //
        // 2. Draw 60% of front layer trees (exclude dynamic trees)
        //
        if (layers[2]) {
          const staticTrees = layers[2].trees.filter((_, i) => !dynamicTreesSet.has(i))
          const frontLayerStatic = {
            trees: staticTrees,
            bushes: layers[2].bushes,
            grassBlades: layers[2].grassBlades,
            name: layers[2].name
          }
          drawLayerToCanvas(ctx, frontLayerStatic, 0, null)
        }
      })
    }
    //
    // Helper function to draw layer to canvas
    //
    const drawLayerToCanvas = (ctx, layer, time, skipIndices) => {
      //
      // Draw trees
      //
      for (const tree of layer.trees) {
        const sway = Math.sin(time * tree.swaySpeed + tree.swayOffset) * tree.swayAmount
        //
        // Draw trunk
        //
        ctx.fillStyle = `rgba(${tree.trunkColor.r}, ${tree.trunkColor.g}, ${tree.trunkColor.b}, ${tree.opacity})`
        ctx.fillRect(
          tree.x + sway * 0.2 - tree.trunkWidth / 2,
          tree.trunkTop,
          tree.trunkWidth,
          tree.trunkHeight
        )
        //
        // Draw branches
        //
        if (tree.branches) {
          for (const branch of tree.branches) {
            ctx.strokeStyle = `rgba(${tree.trunkColor.r}, ${tree.trunkColor.g}, ${tree.trunkColor.b}, ${tree.opacity})`
            ctx.lineWidth = branch.width
            ctx.beginPath()
            ctx.moveTo(tree.x + branch.startX + sway * 0.2, branch.startY)
            ctx.lineTo(tree.x + branch.endX + sway * 0.3, branch.endY)
            ctx.stroke()
          }
        }
        //
        // Draw crowns
        //
        for (const crown of tree.crowns) {
          const colorShift = crown.colorShift || 0
          const leafR = Math.min(255, tree.leafColor.r + colorShift)
          const leafG = Math.min(255, tree.leafColor.g + colorShift)
          const leafB = Math.min(255, tree.leafColor.b + colorShift)
          
          ctx.fillStyle = `rgba(${leafR}, ${leafG}, ${leafB}, ${tree.opacity * crown.opacityVariation})`
          ctx.beginPath()
          ctx.arc(
            tree.x + crown.offsetX + sway,
            tree.crownCenterY + crown.offsetY,
            tree.crownSize * crown.sizeVariation,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }
      //
      // Draw bushes
      //
      for (const bush of layer.bushes) {
        const time = 0
        const sway = Math.sin(time * bush.swaySpeed + bush.swayOffset) * bush.swayAmount
        
        for (const crown of bush.crowns) {
          const colorShift = crown.colorShift || 0
          const leafR = Math.min(255, bush.color.r + colorShift)
          const leafG = Math.min(255, bush.color.g + colorShift)
          const leafB = Math.min(255, bush.color.b + colorShift)
          
          ctx.fillStyle = `rgba(${leafR}, ${leafG}, ${leafB}, ${bush.opacity * crown.opacityVariation})`
          ctx.beginPath()
          ctx.arc(
            bush.x + crown.offsetX + sway,
            bush.y + crown.offsetY,
            bush.size * crown.sizeVariation * 0.5,
            0,
            Math.PI * 2
          )
          ctx.fill()
        }
      }
    }
    
    const backLayerDataURL = createBackLayerCanvas()
    const middleFrontDataURL = createMiddleFrontCanvas()
    const backTexture = k.loadSprite('bg-touch-back', backLayerDataURL)
    const middleFrontTexture = k.loadSprite('bg-touch-middle-front', middleFrontDataURL)
    //
    // Draw back layer canvas (before big bugs, z=2)
    //
    k.add([
      k.z(2),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-back',
            pos: k.vec2(0, 0),
            anchor: "topleft"
          })
        }
      }
    ])
    //
    // Draw middle+front layer canvas (after big bugs, z=7)
    //
    k.add([
      k.z(7),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-middle-front',
            pos: k.vec2(0, 0),
            anchor: "topleft"
          })
        }
      }
    ])
    //
    // Create birds flying in the background
    //
    const birds = []
    const BIRD_COUNT = 5
    const SKY_HEIGHT = 400
    
    for (let i = 0; i < BIRD_COUNT; i++) {
      const startX = Math.random() * k.width()
      const startY = TOP_MARGIN + Math.random() * SKY_HEIGHT
      const speed = 40 + Math.random() * 30
      const amplitude = 10 + Math.random() * 20
      const frequency = 0.5 + Math.random() * 1.0
      const phaseOffset = Math.random() * Math.PI * 2
      const timeOffset = Math.random() * 10
      const isTreeColor = Math.random() < 0.5
      //
      // Black birds are bigger (closer), gray birds are smaller (farther)
      //
      const size = isTreeColor ? (4 + Math.random() * 3) : (8 + Math.random() * 6)
      
      birds.push({
        x: startX,
        y: startY,
        baseY: startY,
        speed: speed,
        amplitude: amplitude,
        frequency: frequency,
        size: size,
        phaseOffset: phaseOffset,
        timeOffset: timeOffset,
        color: isTreeColor ? k.rgb(36, 37, 36) : k.rgb(5, 5, 5),
        wingPhase: 0,
        isFlapping: Math.random() > 0.5,
        flapTimer: Math.random() * 3,
        flapDuration: 0.8 + Math.random() * 0.4,
        glideDuration: 2.0 + Math.random() * 2.0
      })
    }
    
    k.add([
      k.z(5),
      {
        draw() {
          const time = k.time()
          const dt = k.dt()
          
          for (const bird of birds) {
            //
            // Update position
            //
            bird.x += bird.speed * dt
            //
            // Wrap around screen
            //
            if (bird.x > k.width() + 50) {
              bird.x = -50
              bird.baseY = TOP_MARGIN + Math.random() * SKY_HEIGHT
            }
            //
            // Sine wave flight pattern
            //
            bird.y = bird.baseY + Math.sin((time + bird.timeOffset) * bird.frequency + bird.phaseOffset) * bird.amplitude
            //
            // Update flapping state timer
            //
            bird.flapTimer += dt
            const currentDuration = bird.isFlapping ? bird.flapDuration : bird.glideDuration
            
            if (bird.flapTimer > currentDuration) {
              bird.isFlapping = !bird.isFlapping
              bird.flapTimer = 0
            }
            //
            // Wing animation: flap or glide
            //
            let wingAngle
            if (bird.isFlapping) {
              bird.wingPhase = Math.sin((time + bird.timeOffset) * 8 + bird.phaseOffset)
              wingAngle = bird.wingPhase * 0.8
            } else {
              wingAngle = 0.7
            }
            //
            // Draw bird as simple wing silhouette (like seagull from distance)
            //
            const wingSpan = bird.size * 2.5
            const wingHeight = Math.abs(wingAngle) * wingSpan * 0.3
            const wingThickness = bird.size * 0.15
            //
            // Left wing - curved line
            //
            const leftWingTip = k.vec2(bird.x - wingSpan, bird.y - wingHeight)
            const leftWingMid = k.vec2(
              bird.x - wingSpan * 0.5,
              bird.y - wingHeight * 0.5
            )
            
            k.drawLine({
              p1: k.vec2(bird.x, bird.y),
              p2: leftWingMid,
              width: wingThickness * 3,
              color: bird.color,
              opacity: 0.85
            })
            
            k.drawLine({
              p1: leftWingMid,
              p2: leftWingTip,
              width: wingThickness * 2,
              color: bird.color,
              opacity: 0.85
            })
            //
            // Right wing - curved line
            //
            const rightWingTip = k.vec2(bird.x + wingSpan, bird.y - wingHeight)
            const rightWingMid = k.vec2(
              bird.x + wingSpan * 0.5,
              bird.y - wingHeight * 0.5
            )
            
            k.drawLine({
              p1: k.vec2(bird.x, bird.y),
              p2: rightWingMid,
              width: wingThickness * 3,
              color: bird.color,
              opacity: 0.85
            })
            
            k.drawLine({
              p1: rightWingMid,
              p2: rightWingTip,
              width: wingThickness * 2,
              color: bird.color,
              opacity: 0.85
            })
          }
        }
      }
    ])
    //
    // Create dynamic grass drawer with hero interaction
    //
    const allGrassBlades = []
    for (const layer of layers) {
      allGrassBlades.push(...layer.grassBlades)
    }
    
    const grassDrawer = k.add([
      k.z(20),
      {
        heroRef: null,
        draw() {
          const time = k.time()
          const heroX = this.heroRef ? this.heroRef.character.pos.x : -1000
          const heroY = this.heroRef ? this.heroRef.character.pos.y : -1000
          const HERO_RADIUS = 50
          const PUSH_FORCE = 15
          
          for (const blade of allGrassBlades) {
            const baseSway = Math.sin(time * blade.swaySpeed + blade.swayOffset) * blade.swayAmount
            //
            // Check distance to hero
            //
            const dx = blade.x1 - heroX
            const dy = blade.y1 - heroY
            const distance = Math.sqrt(dx * dx + dy * dy)
            //
            // Add push effect if hero is close
            //
            let pushSway = 0
            if (distance < HERO_RADIUS) {
              const pushStrength = (1 - distance / HERO_RADIUS)
              pushSway = (dx / distance) * pushStrength * PUSH_FORCE
            }
            
            k.drawLine({
              p1: k.vec2(blade.x1, blade.y1),
              p2: k.vec2(blade.baseX2 + baseSway + pushSway, blade.y2),
              width: blade.width,
              color: blade.color,
              opacity: blade.opacity
            })
          }
        }
      }
    ])
    //
    // Create dynamic foreground trees drawer (40% of front layer)
    //
    if (layers[2]) {
      const allFrontTrees = layers[2].trees
      const dynamicTreesIndices = []
      const staticTreesIndices = []
      //
      // Distribute trees: every 3rd tree is dynamic, others are static
      //
      for (let i = 0; i < allFrontTrees.length; i++) {
        if (i % 5 < 2) {
          dynamicTreesIndices.push(i)
        } else {
          staticTreesIndices.push(i)
        }
      }
      
      const dynamicTrees = dynamicTreesIndices.map(i => allFrontTrees[i])
      
      k.add([
        k.z(25),
        {
          draw() {
            const time = k.time()
            
            for (const tree of dynamicTrees) {
              const sway = Math.sin(time * tree.swaySpeed + tree.swayOffset) * tree.swayAmount * 8
              //
              // Draw trunk (no sway)
              //
              const trunkCenterY = (tree.trunkTop + tree.trunkBottom) / 2
              
              k.drawRect({
                pos: k.vec2(tree.x, trunkCenterY),
                width: tree.trunkWidth,
                height: tree.trunkHeight,
                anchor: "center",
                color: tree.trunkColor,
                opacity: tree.opacity
              })
              //
              // Draw branches (no sway)
              //
              if (tree.branches) {
                for (const branch of tree.branches) {
                  k.drawLine({
                    p1: k.vec2(tree.x + branch.startX, branch.startY),
                    p2: k.vec2(tree.x + branch.endX, branch.endY),
                    width: branch.width,
                    color: tree.trunkColor,
                    opacity: tree.opacity
                  })
                }
              }
              //
              // Draw crowns (each crown sways independently)
              //
              for (const crown of tree.crowns) {
                const colorShift = crown.colorShift || 0
                const leafR = Math.min(255, tree.leafColor.r + colorShift)
                const leafG = Math.min(255, tree.leafColor.g + colorShift)
                const leafB = Math.min(255, tree.leafColor.b + colorShift)
                //
                // Each crown circle has its own sway based on its position
                //
                const crownPhase = crown.offsetX * 0.1 + crown.offsetY * 0.1
                const crownSway = Math.sin(time * tree.swaySpeed * 5 + tree.swayOffset + crownPhase) * tree.swayAmount * 6
                
                k.drawCircle({
                  pos: k.vec2(
                    tree.x + crown.offsetX + crownSway,
                    tree.crownCenterY + crown.offsetY
                  ),
                  radius: tree.crownSize * crown.sizeVariation,
                  color: k.rgb(leafR, leafG, leafB),
                  opacity: tree.opacity * crown.opacityVariation
                })
              }
            }
          }
        }
      ])
    }
    //
    // Big bug constants (needed for bug4 creation)
    //
    const BIG_BUG_COLOR = "#1A1C1A"  // Black color for bug4 (anti-hero platform)
    //
    // Calculate back layer tree color for bugs 1, 2, 3
    // Back layer (layerIndex 0) tree color: 12 * 0.2 + 42 * 0.8 = 36 (R), 16 * 0.2 + 42 * 0.8 = 37 (G), 12 * 0.2 + 42 * 0.8 = 36 (B)
    // Mix between black (#1A1C1A = rgb(26, 28, 26)) and tree color (#242524 = rgb(36, 37, 36))
    // Average: rgb(31, 32.5, 31) ≈ rgb(31, 33, 31) = #1F211F
    //
    const BACK_LAYER_TREE_COLOR = "#1F211F"  // Color between black and back layer trees for better visibility
    const BIG_BUG_Z_INDEX = 8  // In front of layer 1 trees (z=7), behind dynamic trees (z=25), below player (z=10)
    const BIG_BUG_LEG_SPREAD_FACTOR = 0.25
    const BIG_BUG_LEG_THICKNESS = 3.0
    const BIG_BUG_CRAWL_SPEED = 12  // Increased speed for tall bugs
    const BIG_BUG_SCALE = 3.0
    const BIG_BUG_EYE_SCALE = 1.18  // Slightly larger eyes on long-legged floor bugs
    //
    // Create bug 4 (platform bug for anti-hero) before creating anti-hero
    // Note: bug4 is created here but hero reference will be set later
    //
    const BUG_BODY_SIZE_FOR_BUG4 = 6  // From bugs.js
    const bug4LegDropFactor = 0.95
    const bug4Radius = BUG_BODY_SIZE_FOR_BUG4 * 1.5 * BIG_BUG_SCALE  // Same radius as other big bugs
    //
    // Position bug4 on the right side but visible on screen
    // Place it at about 85% of screen width from left
    // Note: floorWidth is defined later, calculate it here for bug4 positioning
    //
    const bug4FloorWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    const bug4X = LEFT_MARGIN + bug4FloorWidth * 0.85
    //
    // Calculate bug4 position same way as other big bugs
    // First determine desired leg length (similar to bug1 - tallest)
    // Then calculate body Y position from floor
    // Finally adjust so that bug's back (top) is at ANTIHERO_PLATFORM_Y
    //
    // Legs length = 2 body lengths (same as bug1 and bug2)
    // 2 body lengths = BUG_BODY_SIZE * 1.5 * BIG_BUG_SCALE * 2 = 6 * 1.5 * 3.0 * 2 = 54
    const bug4LegLength1 = 28  // First segment
    const bug4LegLength2 = 26  // Second segment (total = 54, equals 2 body lengths)
    const bug4LegReach = (bug4LegLength1 + bug4LegLength2) * BIG_BUG_SCALE * bug4LegDropFactor
    //
    // Calculate body Y position so that top of head is at ANTIHERO_PLATFORM_Y
    // and legs touch FLOOR_Y
    // Top of flat head is at bug4BodyY - flatHeadHeight / 2
    // We want top of head at ANTIHERO_PLATFORM_Y
    // So: bug4BodyY = ANTIHERO_PLATFORM_Y + flatHeadHeight / 2
    //
    // For bugs with upward legs, legs go up from sides first, then down to floor
    // Legs are positioned at floorY = bug4BodyY + reach * legDropFactor
    // We want floorY = FLOOR_Y
    // So: FLOOR_Y = bug4BodyY + reach * legDropFactor
    // Therefore: reach * legDropFactor = FLOOR_Y - bug4BodyY
    // reach = (FLOOR_Y - bug4BodyY) / legDropFactor
    //
    const flatHeadHeight = bug4Radius * 0.8
    const bug4BodyY = ANTIHERO_PLATFORM_Y + flatHeadHeight / 2
    const requiredLegReach = (FLOOR_Y - bug4BodyY) / bug4LegDropFactor
    
    //
    // Calculate leg lengths to ensure legs touch FLOOR_Y
    //
    let bug4LegLength1Final, bug4LegLength2Final
    
    if (bug4LegReach < requiredLegReach) {
      //
      // Need longer legs - adjust leg lengths proportionally
      //
      const scaleFactor = requiredLegReach / bug4LegReach
      bug4LegLength1Final = bug4LegLength1 * scaleFactor
      bug4LegLength2Final = bug4LegLength2 * scaleFactor
    } else {
      //
      // Current leg lengths are sufficient
      //
      bug4LegLength1Final = bug4LegLength1
      bug4LegLength2Final = bug4LegLength2
    }
    
    const bigBug4Inst = Bugs.create({
      k,
      x: bug4X,
      y: bug4BodyY,
      hero: null,  // Will be set later after hero is created
      surface: 'floor',
      scale: BIG_BUG_SCALE,  // Same scale as other big bugs
      legLength1: bug4LegLength1Final,  // Adjusted to ensure legs touch FLOOR_Y
      legLength2: bug4LegLength2Final,  // Adjusted to ensure legs touch FLOOR_Y
      crawlSpeed: 0,  // No movement
      legSpreadFactor: BIG_BUG_LEG_SPREAD_FACTOR,
      legDropFactor: bug4LegDropFactor,
      customColor: BIG_BUG_COLOR,  // Same color as other big bugs
      zIndex: BIG_BUG_Z_INDEX,
      showOutline: false,
      hasUpwardLegs: true,
      targetFloorY: FLOOR_Y,  // Use fixed FLOOR_Y for legs
      legThickness: BIG_BUG_LEG_THICKNESS,
      bodyShape: 'circle',  // Circle shape like other big bugs
      eyeScaleMultiplier: BIG_BUG_EYE_SCALE,
      legCount: 2,
      sfx: sound,
      bounds: {
        minX: LEFT_MARGIN + bug4Radius,  // Don't go beyond left platform (account for body radius)
        maxX: CFG.visual.screen.width - RIGHT_MARGIN - bug4Radius,  // Don't go beyond right platform (account for body radius)
        minY: bug4BodyY,
        maxY: bug4BodyY
      }
    })
    //
    // Mark bug4 as having flat head (for special rendering)
    // and upward legs (legs go up from sides first, then down to floor)
    // Also mark as platform bug that doesn't react to hero
    //
    bigBug4Inst.hasFlatHead = true
    bigBug4Inst.hasUpwardLegs = true
    bigBug4Inst.isPlatformBug = true  // Don't react to hero
    //
    // Set bug to stationary (no movement)
    //
    bigBug4Inst.state = 'stopping'
    bigBug4Inst.vx = 0  // No horizontal movement
    bigBug4Inst.vy = 0
    bigBug4Inst.isMother = true
    bigBug4Inst.originalY = bug4BodyY
    bigBug4Inst.isScared = false
    bigBug4Inst.scareTimer = 0
    bigBug4Inst.maxDrop = 0
    //
    // Create invisible platform on bug's back (head) for anti-hero
    // Top of flat head is at ANTIHERO_PLATFORM_Y
    // Platform should be on top of the head
    //
    const bug4BackPlatformWidth = bug4Radius * 2.5  // Wide platform on bug's back
    const bug4BackPlatformHeight = 10
    //
    // Platform top should be at ANTIHERO_PLATFORM_Y (top of bug's head)
    // With anchor "top", platform top is at Y
    // So: bug4BackPlatformY = ANTIHERO_PLATFORM_Y
    //
    const bug4BackPlatformY = ANTIHERO_PLATFORM_Y
    
    const antiHeroPlatform = k.add([
      k.rect(bug4BackPlatformWidth, bug4BackPlatformHeight),
      k.pos(bug4X, bug4BackPlatformY),
      k.anchor("top"),  // Anchor at top so platform sits on head
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),  // Invisible
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create anti-hero first (needed for hero annihilation setup)
    // Position anti-hero directly on top of platform (on top of bug's head)
    //
    const antiHeroSpawnX = bug4X  // Center on bug's back
    const antiHeroSpawnY = bug4BackPlatformY - 50  // On top of platform (slightly above to let physics settle)
    const antiHeroInst = Hero.create({
      k,
      x: antiHeroSpawnX,
      y: antiHeroSpawnY,
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
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: antiHeroInst,
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
          //
          // Stop all audio before transition so nothing bleeds into the subtitle screen
          //
          Sound.stopAmbient(sound)
          touchMusic.stop()
          createLevelTransition(k, 'level-touch.0', () => {
            k.go('level-touch.1')
          })
        })
      },
      currentLevel: 'level-touch.0',
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
        grassDrawer.heroRef = heroInst
        heroSpawned = true
      }
    })
    //
    // Spawn anti-hero after delay
    // Position is already set correctly at creation time
    // Use flag to ensure spawn is called only once
    //
    let antiHeroSpawned = false
    k.wait(HERO_SPAWN_DELAY, () => {
      if (!antiHeroSpawned && antiHeroInst.character) {
        Hero.spawn(antiHeroInst)
        antiHeroSpawned = true
      }
    })
    //
    // Hero vs floor thorns (death + reload level)
    //
    k.onUpdate(() => {
      checkFloorThorns(k, heroInst, floorThornData, levelIndicator)
    })
    //
    // Trap tentacles: appear if life was just deducted or if trap was already active from a previous attempt
    //
    const showTraps = lifeDeducted || trapAlreadyActive
    showTraps && createTrapSpikes(k, heroInst, levelIndicator, sound)
    //
    // Create bugs on the floor
    //
    const bugFloorY = FLOOR_Y - 4  // Lower by 6 pixels total (was -10)
    const bugs = []  // Big bugs only
    const smallBugs = []  // Small bugs and debug bug
    const floorWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    //
    // Create four big bugs: three crawlers (far left + two) and bug4 (platform)
    // Note: BIG_BUG_* constants are defined earlier before bug4 creation
    //
    // Bug 0: Far left, medium-long legs
    //
    const bug0LegLength1 = 85
    const bug0LegLength2 = 75
    const bug0LegDropFactor = 0.9
    const bug0LegReach = (bug0LegLength1 + bug0LegLength2) * BIG_BUG_SCALE * bug0LegDropFactor
    const bug0X = LEFT_MARGIN + floorWidth * 0.1
    const bug0Y = bugFloorY - bug0LegReach
    const bug0BodyRadius = BUG_BODY_SIZE * 1.5 * BIG_BUG_SCALE * 0.9
    //
    // Bug 1: Tallest (very long legs)
    //
    const bug1LegLength1 = 100
    const bug1LegLength2 = 90
    const bug1LegDropFactor = 0.95
    const bug1LegReach = (bug1LegLength1 + bug1LegLength2) * BIG_BUG_SCALE * bug1LegDropFactor
    const bug1X = LEFT_MARGIN + floorWidth * 0.38
    const bug1Y = bugFloorY - bug1LegReach
    //
    // Set boundary for bug1: stop before bug4 and don't go beyond platforms
    //
    const bug1BodyRadius = BUG_BODY_SIZE * 1.5 * BIG_BUG_SCALE * 0.9
    const bug1MaxX = bug4X - 150  // Stop 150px before bug4
    const bug0MaxX = bug1X - 130
    const bug1MinX = Math.max(LEFT_MARGIN + bug1BodyRadius, bug0X + 100)
    const bug1MaxXWithPlatform = Math.min(bug1MaxX, CFG.visual.screen.width - RIGHT_MARGIN - bug1BodyRadius)  // Don't go beyond right platform
    
    const bigBug0Inst = Bugs.create({
      k,
      x: bug0X,
      y: bug0Y,
      hero: heroInst,
      surface: 'floor',
      scale: BIG_BUG_SCALE,
      legLength1: bug0LegLength1,
      legLength2: bug0LegLength2,
      crawlSpeed: BIG_BUG_CRAWL_SPEED,
      legSpreadFactor: BIG_BUG_LEG_SPREAD_FACTOR,
      legDropFactor: bug0LegDropFactor,
      customColor: BACK_LAYER_TREE_COLOR,
      zIndex: BIG_BUG_Z_INDEX,
      showOutline: false,
      legThickness: BIG_BUG_LEG_THICKNESS,
      bodyShape: 'circle',
      eyeScaleMultiplier: BIG_BUG_EYE_SCALE,
      legCount: 2,
      sfx: sound,
      bounds: {
        minX: LEFT_MARGIN + bug0BodyRadius,
        maxX: Math.min(bug0MaxX, CFG.visual.screen.width - RIGHT_MARGIN - bug0BodyRadius),
        minY: bug0Y,
        maxY: bug0Y
      }
    })
    
    const bigBug1Inst = Bugs.create({
      k,
      x: bug1X,
      y: bug1Y,
      hero: heroInst,
      surface: 'floor',
      scale: BIG_BUG_SCALE,
      legLength1: bug1LegLength1,
      legLength2: bug1LegLength2,
      crawlSpeed: BIG_BUG_CRAWL_SPEED,
      legSpreadFactor: BIG_BUG_LEG_SPREAD_FACTOR,
      legDropFactor: bug1LegDropFactor,
      customColor: BACK_LAYER_TREE_COLOR,
      zIndex: BIG_BUG_Z_INDEX,
      showOutline: false,
      legThickness: BIG_BUG_LEG_THICKNESS,
      bodyShape: 'circle',
      eyeScaleMultiplier: BIG_BUG_EYE_SCALE,
      legCount: 2,
      sfx: sound,
      bounds: {
        minX: bug1MinX,
        maxX: bug1MaxXWithPlatform,
        minY: bug1Y,
        maxY: bug1Y
      }
    })
    //
    // Bug 2: Medium height (between bug1 and bug4)
    //
    const bug2LegLength1 = 80
    const bug2LegLength2 = 70
    const bug2LegDropFactor = 0.90
    const bug2LegReach = (bug2LegLength1 + bug2LegLength2) * BIG_BUG_SCALE * bug2LegDropFactor
    const bug2X = LEFT_MARGIN + floorWidth * 0.6
    const bug2Y = bugFloorY - bug2LegReach
    //
    // Set boundary for bug2: stop before bug4 and don't go beyond platforms
    //
    const bug2BodyRadius = BUG_BODY_SIZE * 1.5 * BIG_BUG_SCALE * 0.9
    const bug2MaxX = bug4X - 150  // Stop 150px before bug4
    const bug2MinX = LEFT_MARGIN + bug2BodyRadius  // Don't go beyond left platform
    const bug2MaxXWithPlatform = Math.min(bug2MaxX, CFG.visual.screen.width - RIGHT_MARGIN - bug2BodyRadius)  // Don't go beyond right platform
    
    const bigBug2Inst = Bugs.create({
      k,
      x: bug2X,
      y: bug2Y,
      hero: heroInst,
      surface: 'floor',
      scale: BIG_BUG_SCALE,
      legLength1: bug2LegLength1,
      legLength2: bug2LegLength2,
      crawlSpeed: BIG_BUG_CRAWL_SPEED,
      legSpreadFactor: BIG_BUG_LEG_SPREAD_FACTOR,
      legDropFactor: bug2LegDropFactor,
      customColor: BACK_LAYER_TREE_COLOR,
      zIndex: BIG_BUG_Z_INDEX,
      showOutline: false,
      legThickness: BIG_BUG_LEG_THICKNESS,
      bodyShape: 'circle',
      eyeScaleMultiplier: BIG_BUG_EYE_SCALE,
      legCount: 2,
      sfx: sound,
      bounds: {
        minX: bug2MinX,
        maxX: bug2MaxXWithPlatform,
        minY: bug2Y,
        maxY: bug2Y
      }
    })
    //
    // Update bug4 hero reference now that hero is created
    //
    bigBug4Inst.hero = heroInst
    //
    // Store state for all big bugs and add to bugs array
    //
    const bigBugs = [
      { inst: bigBug0Inst, y: bug0Y },
      { inst: bigBug1Inst, y: bug1Y },
      { inst: bigBug2Inst, y: bug2Y },
      { inst: bigBug4Inst, y: bug4BodyY }
    ]
    
    bigBugs.forEach(({ inst, y }) => {
      inst.originalY = y
      inst.isScared = false
      inst.scareTimer = 0
      inst.scareDuration = 2.0
      inst.maxDrop = 0
      inst.isMother = true
      inst.justRecovered = false
      bugs.push(inst)
    })
    //
    // Create regular bugs
    //
    for (let i = 0; i < 12; i++) {
      //
      // Distribute bugs across the floor
      //
      const spacing = (floorWidth - 200) / 11
      const bugX = LEFT_MARGIN + 100 + i * spacing + (Math.random() - 0.5) * 30
      // Larger bugs with smaller size variation - closer to big bugs
      const bugScale = 1.0 + Math.random() * 0.3  // Range: 1.0 to 1.3 (was 0.6 to 1.4)
      //
      // Use longer legs for small bugs to ensure they reach the floor and extend fully
      // Longer legs help prevent knees from touching ground - legs should stand on foot tips
      //
      const smallBugLegLength1 = 12  // Longer first segment
      const smallBugLegLength2 = 11  // Longer second segment
      const smallBugLegReach = (smallBugLegLength1 + smallBugLegLength2) * bugScale
      const smallBugLegDropFactor = 1.0  // Full drop factor to ensure legs reach floor
      //
      // Calculate body Y position so legs touch the floor
      // Need to account for body radius - body center is at bugY, but bottom of body is at bugY + bodyRadius
      // Legs attach to bottom of body, so: floorY = bugY + bodyRadius + reach * legDropFactor
      // We want floorY = bugFloorY
      // So: bugY = bugFloorY - bodyRadius - reach * legDropFactor
      // Add extra offset to lower body position
      //
      const bodyRadius = BUG_BODY_SIZE * 1.5 * bugScale * 0.9
      const bodyLowerOffset = 10  // Additional offset to lower body (reduced to straighten legs)
      const bugY = bugFloorY - bodyRadius - smallBugLegReach * smallBugLegDropFactor + bodyLowerOffset
      
      const bugInst = SmallBugs.create({
        k,
        x: bugX,
        y: bugY,
        hero: heroInst,
        surface: 'floor',
        scale: bugScale,
        legLength1: smallBugLegLength1,
        legLength2: smallBugLegLength2,
        legDropFactor: smallBugLegDropFactor,
        targetFloorY: bugFloorY,  // Explicitly set floor Y so legs touch platform
        legSpreadFactor: 0.3,  // Keep legs close to body
        legCount: 4,  // Will be converted to 6 legs by component logic
        sfx: sound,
        touchRadius: 50,  // Increased distance for level 0
        bounds: {
          minX: LEFT_MARGIN + 30,
          maxX: CFG.visual.screen.width - RIGHT_MARGIN - 30,
          minY: bugY,
          maxY: bugY
        }
      })
      //
      // Store original Y position and escape state
      //
      bugInst.originalY = bugY
      bugInst.isScared = false
      bugInst.scareTimer = 0
      bugInst.scareDuration = 2.0
      bugInst.maxDrop = 0
      bugInst.isMother = false
      bugInst.justRecovered = false
      
      smallBugs.push(bugInst)
    }
    //
    // Update bug4 platform and anti-hero position to follow bug movement
    //
    k.onUpdate(() => {
      //
      // Sync platform and anti-hero with bug4 movement
      //
      if (bigBug4Inst && antiHeroPlatform && antiHeroInst) {
        //
        // Update platform position to follow bug's head top
        // Top of flat head is at bug4BodyY - flatHeadHeight / 2
        //
        const flatHeadHeight = bug4Radius * 0.8
        const headTopY = bigBug4Inst.y - flatHeadHeight / 2
        antiHeroPlatform.pos.x = bigBug4Inst.x
        antiHeroPlatform.pos.y = headTopY
        
        //
        // Update anti-hero position to stay on platform
        //
        if (antiHeroInst.character) {
          antiHeroInst.character.pos.x = bigBug4Inst.x
          //
          // Keep anti-hero on platform (let physics handle Y, but sync X)
          //
        }
      }
    })
    //
    // Add hero collision check for bugs to trigger scare behavior
    //
    k.onUpdate(() => {
      const heroX = heroInst.character.pos.x
      const heroY = heroInst.character.pos.y
      const HERO_RADIUS = 50  // Increased distance for level 0
      const dt = k.dt()
      
      for (const bugInst of bugs) {
        //
        // Bugs in pyramid don't react to hero (don't get scared)
        // Platform bug (bug4) also doesn't react to hero
        //
        if (bugInst.state === 'pyramid' || bugInst.isPlatformBug) {
          continue
        }
        
        const dx = bugInst.x - heroX
        const dy = bugInst.y - heroY
        const distance = Math.sqrt(dx * dx + dy * dy)
        
        //
        // Update justRecovered timer - reset after short time regardless of distance
        //
        if (bugInst.justRecovered) {
          if (bugInst.justRecoveredTimer === undefined) {
            bugInst.justRecoveredTimer = 0.5  // Short cooldown period
          }
          bugInst.justRecoveredTimer -= dt
          if (bugInst.justRecoveredTimer <= 0) {
            bugInst.justRecovered = false
            bugInst.justRecoveredTimer = undefined
          }
        }
        
        if (distance < HERO_RADIUS) {
          //
          // Hero is close
          //
          if (!bugInst.isScared && !bugInst.justRecovered) {
            //
            // Bug gets scared
            //
            bugInst.isScared = true
            bugInst.scareTimer = 0
            bugInst.state = 'scared'
            bugInst.vx = 0
            bugInst.vy = 0
            //
            // Play scare sound
            //
            sound && Sound.playBugScareSound(sound)
            //
            // Calculate max drop based on actual leg lengths
            //
            const reach = (bugInst.legLength1 + bugInst.legLength2) * bugInst.scale
            bugInst.maxDrop = reach * 0.5
          }
        }
        
        if (bugInst.isScared) {
          //
          // Bug is scared - drop body and wait
          //
          if (bugInst.dropOffset < bugInst.maxDrop) {
            bugInst.dropOffset += dt * 200
            if (bugInst.dropOffset > bugInst.maxDrop) bugInst.dropOffset = bugInst.maxDrop
          }
          //
          // Count scare time
          //
          bugInst.scareTimer += dt
          
          if (bugInst.scareTimer >= bugInst.scareDuration) {
            //
            // Scare duration is over - determine escape direction and start crawling
            // Direction is based on hero position at THIS moment
            //
            const currentDx = bugInst.x - heroX
            const escapeDirection = currentDx < 0 ? -1 : 1
            //
            // Start crawling away from hero
            //
            bugInst.isScared = false
            bugInst.justRecovered = true
            bugInst.justRecoveredTimer = 0.5  // Short cooldown period
            bugInst.state = 'crawling'
            bugInst.movementAngle = escapeDirection < 0 ? Math.PI : 0
            bugInst.vx = Math.cos(bugInst.movementAngle) * bugInst.crawlSpeed
            bugInst.vy = 0
          }
        }
        
        if (!bugInst.isScared && bugInst.dropOffset > 0) {
          //
          // Lift body back up when not scared
          //
          bugInst.dropOffset -= dt * 150
          if (bugInst.dropOffset < 0) bugInst.dropOffset = 0
        }
      }
    })
    //
    // Bug pyramid system
    //
    const activePyramids = []
    const pyramidCheckInterval = 0.5  // Check for groups every 0.5 seconds
    let pyramidCheckTimer = 0
    
    //
      // Update bugs and pyramids
    //
    k.onUpdate(() => {
      const dt = k.dt()
      
      bugs.forEach(bug => Bugs.onUpdate(bug, dt))
      smallBugs.forEach(bug => SmallBugs.onUpdate(bug, dt))
      
      //
      // Update active pyramids (iterate backwards to safely remove)
      //
      for (let i = activePyramids.length - 1; i >= 0; i--) {
        const pyramid = activePyramids[i]
        BugPyramid.onUpdate(pyramid, dt)
        //
        // Check for bugs that can join this pyramid
        // Check both big bugs and small bugs
        //
        if (pyramid.isActive) {
          const allBugs = [...bugs, ...smallBugs]
          const availableBugs = allBugs.filter(bug => 
            bug.isMother === false && 
            bug.state !== 'pyramid' && 
            bug.state !== 'scared' &&
            bug.state !== 'recovering' &&
            !bug.isScattering
          )
          
          availableBugs.forEach(bug => {
            //
            // Check distance to pyramid center
            //
            const dx = bug.x - pyramid.centerX
            const dy = bug.y - pyramid.centerY
            const dist = Math.sqrt(dx * dx + dy * dy)
            
            if (dist <= 60) {  // JOIN_DETECTION_RADIUS
              //
              // Try to add bug to pyramid (timer will be reset to 0 in addBug)
              //
              const added = BugPyramid.addBug(pyramid, bug)
              if (added) {
                //
                // Bug successfully added, timer reset to 0 for another 5 seconds
                //
              }
            }
          })
        }
        //
        // Remove destroyed pyramids
        //
        if (!pyramid.isActive) {
          activePyramids.splice(i, 1)
        }
      }
      
      //
      // Check for new bug groups to form pyramids
      //
      pyramidCheckTimer += dt
      if (pyramidCheckTimer >= pyramidCheckInterval) {
        pyramidCheckTimer = 0
        
        //
        // Check if any bugs are still scattering (can't form new pyramid until all scattered)
        //
        const anyScattering = bugs.some(bug => bug.isScattering === true)
        
        if (anyScattering) {
          //
          // Wait for all bugs to finish scattering before allowing new pyramid
          //
          return
        }
        
        //
        // Get only small bugs (not in pyramid, not scared, not scattering)
        // Use all bugs (big + small) and filter for small bugs
        //
        const allBugs = [...bugs, ...smallBugs]
        const availableSmallBugs = allBugs.filter(bug => 
          bug.isMother === false && 
          bug.state !== 'pyramid' && 
          bug.state !== 'scared' &&
          bug.state !== 'recovering' &&
          !bug.isScattering
        )
        
        //
        // Find bug groups
        //
        const group = BugPyramid.findBugGroup(availableSmallBugs)
        
        if (group && group.length >= 5) {
          //
          // Check if bugs in this group are already in a pyramid
          //
          const alreadyInPyramid = group.some(bug => 
            activePyramids.some(pyramid => 
              pyramid.bugs.some(b => b.inst === bug)
            )
          )
          
          if (!alreadyInPyramid) {
            //
            // Create new pyramid
            //
            const pyramid = BugPyramid.create({
              k,
              bugs: group,
              hero: heroInst,
              sound
            })
            
            if (pyramid) {
              activePyramids.push(pyramid)
            }
          }
        }
      }
    })
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({
      k,
      showTimer: true,
      targetTime: CFG.gameplay.speedBonusTime
        ? CFG.gameplay.speedBonusTime['level-touch.0']
        : null
    })
    //
    // Update FPS counter
    //
    k.onUpdate(() => {
      FpsCounter.onUpdate(fpsCounter)
    })
    //
    // Draw bugs with individual z-indices
    // Create drawing objects that check state dynamically
    //
    const bugDrawObjects = []
    bugs.forEach(bugInst => {
      const drawObj = k.add([
        k.z(bugInst.zIndex),
        {
          draw() {
            Bugs.draw(bugInst)
          }
        }
      ])
      bugDrawObjects.push({ bug: bugInst, obj: drawObj })
    })
    //
    // Monster conversation system: timed dialogue between 3 monsters.
    // Starts after MONSTER_CONVERSATION_DELAY seconds and plays once.
    //
    const monsterBugs = [bigBug0Inst, bigBug1Inst, bigBug2Inst]
    startMonsterConversation(k, monsterBugs)
    //
    // Tooltip for floor monsters (bug0-2) - "What?!" on hover
    //
    monsterBugs.forEach(bug => {
      Tooltip.create({
        k,
        targets: [{
          x: () => bug.x,
          y: () => bug.y,
          width: FLOOR_MONSTER_TOOLTIP_HOVER_SIZE,
          height: FLOOR_MONSTER_TOOLTIP_HOVER_SIZE,
          text: FLOOR_MONSTER_TOOLTIP_TEXT,
          offsetY: FLOOR_MONSTER_TOOLTIP_Y_OFFSET
        }]
      })
    })
    //
    // Small bug random phrases: occasional speech bubbles from crawling bugs
    //
    startSmallBugPhrases(k, smallBugs)
    //
    // Tooltip for bug4 (anti-hero platform monster) - head-only hover, appears below
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => bigBug4Inst.x,
        y: () => bigBug4Inst.y,
        width: BUG4_TOOLTIP_HOVER_WIDTH,
        height: BUG4_TOOLTIP_HOVER_HEIGHT,
        text: BUG4_TOOLTIP_TEXT,
        offsetY: BUG4_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Tooltip for TOUCH level indicator letters
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
    // Tooltip for small bugs with random jokes.
    // Each bug picks a random joke on each hover.
    // Text switches to hint after green time expires.
    //
    const smallBugTooltipTargets = smallBugs.map((bug) => {
      const target = {
        x: () => bug.x,
        y: () => bug.y,
        width: SMALL_BUG_TOOLTIP_HOVER_SIZE,
        height: SMALL_BUG_TOOLTIP_HOVER_SIZE,
        text: SMALL_BUG_JOKES[Math.floor(Math.random() * SMALL_BUG_JOKES.length)],
        offsetY: SMALL_BUG_TOOLTIP_Y_OFFSET
      }
      return target
    })
    const smallBugTooltips = smallBugTooltipTargets.map(target => {
      const inst = Tooltip.create({ k, targets: [target] })
      inst._wasActive = false
      return inst
    })
    //
    // Tooltip for anti-hero
    //
    Tooltip.create({
      k,
      targets: [{
        x: () => antiHeroInst.character.pos.x,
        y: () => antiHeroInst.character.pos.y,
        width: ANTIHERO_TOOLTIP_HOVER_WIDTH,
        height: ANTIHERO_TOOLTIP_HOVER_HEIGHT,
        text: ANTIHERO_TOOLTIP_TEXT,
        offsetY: ANTIHERO_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Tooltip for hero
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
    // Tooltip for green timer (target time)
    //
    fpsCounter.targetText && Tooltip.create({
      k,
      targets: [{
        x: fpsCounter.targetText.pos.x,
        y: fpsCounter.targetText.pos.y,
        width: GREEN_TIMER_TOOLTIP_WIDTH,
        height: GREEN_TIMER_TOOLTIP_HEIGHT,
        text: GREEN_TIMER_TOOLTIP_TEXT,
        offsetY: GREEN_TIMER_TOOLTIP_Y_OFFSET,
        forceBelow: true
      }]
    })
    //
    // Tooltip for small hero icon (score) - appears below
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
    // Tooltip for life icon - appears below
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
    // Tooltip for floor thorns (clusters)
    //
    Tooltip.create({
      k,
      targets: computeThornClusterTargets(floorThornData)
    })
    //
    // Tooltip for birds
    //
    Tooltip.create({
      k,
      targets: birds.map(bird => ({
        x: () => bird.x,
        y: () => bird.y,
        width: BIRD_TOOLTIP_HOVER_SIZE,
        height: BIRD_TOOLTIP_HOVER_SIZE,
        text: BIRD_TOOLTIP_TEXT,
        offsetY: BIRD_TOOLTIP_Y_OFFSET
      }))
    })
    //
    // Draw small bugs (including debug bug)
    // Bugs in pyramid state should be in front of trees (z=25) and platforms (z=15)
    //
    const smallBugDrawObjects = []
    smallBugs.forEach(bugInst => {
      const drawObj = k.add([
        k.z(bugInst.zIndex),
        {
          draw() {
            SmallBugs.draw(bugInst)
          }
        }
      ])
      smallBugDrawObjects.push({ bug: bugInst, obj: drawObj })
    })
    //
    // Update z-index for bugs in pyramid state each frame
    //
    k.onUpdate(() => {
      smallBugDrawObjects.forEach(({ bug, obj }) => {
        const pyramidZIndex = bug.state === 'pyramid' ? 30 : bug.zIndex
        if (obj.exists()) {
          obj.z = pyramidZIndex
        }
      })
    })
    //
    // Switch small bug tooltip text to hint after green time expires
    //
    let bugTooltipsSwapped = false
    k.onUpdate(() => {
      //
      // Rotate bug jokes: pick a new random joke each time hover ends
      //
      if (!bugTooltipsSwapped) {
        smallBugTooltips.forEach((tooltipInst, i) => {
          const isActive = tooltipInst.activeTarget !== null
          if (tooltipInst._wasActive && !isActive) {
            smallBugTooltipTargets[i].text = SMALL_BUG_JOKES[Math.floor(Math.random() * SMALL_BUG_JOKES.length)]
          }
          tooltipInst._wasActive = isActive
        })
      }
      //
      // Switch small bug tooltip text to hint after green time expires
      //
      if (bugTooltipsSwapped) return
      const levelTime = FpsCounter.getLevelTime(fpsCounter)
      const targetTime = CFG.gameplay.speedBonusTime
        && CFG.gameplay.speedBonusTime['level-touch.0']
      if (!targetTime) return
      if (levelTime >= targetTime) {
        bugTooltipsSwapped = true
        smallBugTooltipTargets.forEach(t => {
          t.text = SMALL_BUG_TOOLTIP_TEXT_HINT
        })
      }
    })
    //
    // Rain system: depth-layered drops with splashes on objects
    //
    const frontTrees = layers[2] ? layers[2].trees : []
    Rain.create({
      k,
      topY: TOP_MARGIN,
      floorY: FLOOR_Y,
      leftX: LEFT_MARGIN,
      rightX: CFG.visual.screen.width - RIGHT_MARGIN,
      heroInst,
      antiHeroInst,
      monsterBugs: [bigBug0Inst, bigBug1Inst, bigBug2Inst],
      smallBugs,
      trees: frontTrees
    })
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
 * Builds thorn spike data along the floor: clusters of FLOOR_THORN_MIN_PER_CLUSTER..FLOOR_THORN_MAX_PER_CLUSTER spikes (random per cluster), then gap regions
 * @param {number} startX - Left edge of playable thorn range
 * @param {number} endX - Right edge of playable thorn range
 * @param {number} baseY - Thorn base Y (same as jungle-decor bottom wall)
 * @param {Array<{center: number, halfWidth: number}>} excludeZones - Horizontal bands to skip
 * @param {number} [maxClusters] - Maximum number of thorn clusters to generate (null = unlimited)
 * @returns {Array<{x: number, baseY: number, width: number, height: number, tipOffset: number}>}
 */
function generateFloorThornsWithGaps(startX, endX, baseY, excludeZones, maxClusters) {
  const thorns = []
  let x = startX
  let clusterCount = 0
  while (x < endX) {
    if (maxClusters != null && clusterCount >= maxClusters) break
    const clusterEnd = Math.min(
      x + FLOOR_THORN_CLUSTER_MIN + Math.random() * FLOOR_THORN_CLUSTER_EXTRA,
      endX
    )
    let cx = x
    let placedInCluster = 0
    const targetInCluster =
      FLOOR_THORN_MIN_PER_CLUSTER +
      Math.floor(
        Math.random() *
          (FLOOR_THORN_MAX_PER_CLUSTER - FLOOR_THORN_MIN_PER_CLUSTER + 1)
      )
    while (placedInCluster < targetInCluster && cx < clusterEnd) {
      const tx = cx + (Math.random() - 0.5) * 6
      cx += FLOOR_THORN_SPACING
      //
      // Skip thorns inside any exclusion zone
      //
      const inExcluded = excludeZones.some(z => Math.abs(tx - z.center) < z.halfWidth)
      if (inExcluded) continue
      thorns.push({
        x: tx,
        baseY,
        width: FLOOR_THORN_WIDTH_MIN + Math.random() * (FLOOR_THORN_WIDTH_MAX - FLOOR_THORN_WIDTH_MIN),
        height: FLOOR_THORN_HEIGHT_MIN + Math.random() * (FLOOR_THORN_HEIGHT_MAX - FLOOR_THORN_HEIGHT_MIN),
        tipOffset: (Math.random() - 0.5) * FLOOR_THORN_TIP_OFFSET
      })
      placedInCluster++
    }
    clusterCount++
    const gap = FLOOR_THORN_GAP_MIN + Math.random() * FLOOR_THORN_GAP_EXTRA
    x = clusterEnd + gap
  }
  return thorns
}
/**
 * Groups thorn data into cluster bounding boxes for tooltip hover zones
 * @param {Array} thornData - Thorn definitions from generateFloorThornsWithGaps
 * @returns {Array<Object>} Array of tooltip target objects for each cluster
 */
function computeThornClusterTargets(thornData) {
  if (!thornData || thornData.length === 0) return []
  //
  // Separate thorns into clusters by detecting gaps > cluster gap threshold
  //
  const CLUSTER_GAP_THRESHOLD = 80
  const sorted = [...thornData].sort((a, b) => a.x - b.x)
  const clusters = []
  let currentCluster = [sorted[0]]
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i].x - sorted[i - 1].x > CLUSTER_GAP_THRESHOLD) {
      clusters.push(currentCluster)
      currentCluster = [sorted[i]]
    } else {
      currentCluster.push(sorted[i])
    }
  }
  clusters.push(currentCluster)
  //
  // Convert each cluster into a tooltip target with bounding rect
  //
  return clusters.map(cluster => {
    const minX = Math.min(...cluster.map(t => t.x - t.width))
    const maxX = Math.max(...cluster.map(t => t.x + t.width))
    const centerX = (minX + maxX) / 2
    const centerY = cluster[0].baseY
    return {
      x: centerX,
      y: centerY,
      width: maxX - minX,
      height: FLOOR_THORNS_TOOLTIP_HEIGHT,
      text: FLOOR_THORNS_TOOLTIP_TEXT,
      offsetY: FLOOR_THORNS_TOOLTIP_Y_OFFSET
    }
  })
}

/**
 * Kills the hero when feet overlap a floor thorn (same horizontal test as touch level 3 trap thorns)
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Array} floorThornData - Thorn definitions from generateFloorThornsWithGaps
 * @param {Object} levelIndicator - Level indicator inst (life score UI)
 */
function checkFloorThorns(k, heroInst, floorThornData, levelIndicator) {
  if (!heroInst.character?.pos) return
  const heroX = heroInst.character.pos.x
  const heroFeetY = heroInst.character.pos.y + HERO_COLLISION_HEIGHT_SCALED_THORNS / 2
  if (heroFeetY < FLOOR_Y - FLOOR_THORN_FEET_TOLERANCE_LOW ||
      heroFeetY > FLOOR_Y + FLOOR_THORN_FEET_TOLERANCE_HIGH) {
    return
  }
  for (const thorn of floorThornData) {
    if (Math.abs(heroX - thorn.x) < thorn.width / 2) {
      onHeroFloorThornDeath(k, heroInst, levelIndicator)
      return
    }
  }
}

/**
 * Hero death on floor thorns: life score, laugh, reload touch level 0
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} levelIndicator - Level indicator inst
 */
function onHeroFloorThornDeath(k, heroInst, levelIndicator) {
  if (heroInst.isDying) return
  Hero.death(heroInst, () => {
    const currentScore = get('lifeScore', 0)
    const newScore = currentScore + 1
    set('lifeScore', newScore)
    levelIndicator?.updateLifeScore?.(newScore)
    if (levelIndicator?.lifeImage?.sprite?.exists?.()) {
      Sound.playLifeSound(k)
      const originalColor = levelIndicator.lifeImage.sprite.color
      flashLifeImageOnThornDeath(k, levelIndicator, originalColor, 0)
      createLifeParticlesOnThornDeath(k, levelIndicator)
    }
    k.wait(FLOOR_THORN_DEATH_RELOAD_DELAY, () => k.go('level-touch.0'))
  })
}

/**
 * Flashes life image red/white on thorn death (same pattern as touch level 3)
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with lifeImage
 * @param {Object} originalColor - Original color to restore after flash
 * @param {number} count - Current flash iteration
 */
function flashLifeImageOnThornDeath(k, levelIndicator, originalColor, count) {
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
  k.wait(LIFE_FLASH_INTERVAL, () => flashLifeImageOnThornDeath(k, levelIndicator, originalColor, count + 1))
}

/**
 * Red square particles radiating from life icon (same as touch level 3)
 * @param {Object} k - Kaplay instance
 * @param {Object} levelIndicator - Level indicator with lifeImage position
 */
function createLifeParticlesOnThornDeath(k, levelIndicator) {
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
 * Creates trap spikes that hide below the floor and emerge when the hero walks close.
 * The spikes rise, hold briefly, then retract. Kills the hero on contact while risen.
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} levelIndicator - Level indicator for life score
 * @param {Object} sound - Sound instance
 * @returns {Object} Trap instance with state
 */
function createTrapSpikes(k, heroInst, levelIndicator, sound) {
  //
  // Generate spike data centered on TRAP_TRIGGER_X
  //
  const spikes = []
  const totalWidth = (TRAP_SPIKE_COUNT - 1) * TRAP_SPIKE_SPACING
  const startX = TRAP_TRIGGER_X - totalWidth / 2
  for (let i = 0; i < TRAP_SPIKE_COUNT; i++) {
    spikes.push({
      x: startX + i * TRAP_SPIKE_SPACING + (Math.random() - 0.5) * 6,
      baseY: FLOOR_Y,
      height: TRAP_SPIKE_HEIGHT_MIN + Math.random() * (TRAP_SPIKE_HEIGHT_MAX - TRAP_SPIKE_HEIGHT_MIN),
      phaseOffset: Math.random() * Math.PI * 2
    })
  }
  const inst = {
    spikes,
    phase: 'hidden',
    timer: 0,
    progress: 0,
    triggered: false
  }
  const fillColor = k.rgb(TRAP_SPIKE_FILL_R, TRAP_SPIKE_FILL_G, TRAP_SPIKE_FILL_B)
  const outlineColor = k.rgb(0, 0, 0)
  //
  // Draw trap spikes with vertical offset based on rise progress (0 = hidden, 1 = fully risen)
  //
  k.add([
    k.z(FLOOR_THORN_DRAW_Z),
    {
      draw() {
        if (inst.progress <= 0) return
        drawTrapSpikes(k, inst, fillColor, outlineColor, heroInst)
      }
    }
  ])
  //
  // Update: detect hero proximity, animate rise/hold/retract, check collision
  //
  k.onUpdate(() => onUpdateTrap(k, inst, heroInst, levelIndicator, sound))
  //
  // Tooltip appears only while spikes are visible
  //
  const trapClusterMinX = Math.min(...spikes.map(s => s.x - s.width))
  const trapClusterMaxX = Math.max(...spikes.map(s => s.x + s.width))
  const trapClusterCenterX = (trapClusterMinX + trapClusterMaxX) / 2
  const trapClusterWidth = trapClusterMaxX - trapClusterMinX
  Tooltip.create({
    k,
    targets: [{
      x: trapClusterCenterX,
      y: FLOOR_Y,
      width: trapClusterWidth,
      height: FLOOR_THORNS_TOOLTIP_HEIGHT,
      text: TRAP_TOOLTIP_TEXT,
      offsetY: TRAP_TOOLTIP_Y_OFFSET
    }]
  })
  return inst
}
//
// Animates trap spike phases: hidden -> rising -> holding -> retracting -> hidden
//
function onUpdateTrap(k, inst, heroInst, levelIndicator, sound) {
  if (!heroInst.character?.pos) return
  const dt = k.dt()
  const heroX = heroInst.character.pos.x
  const heroFeetY = heroInst.character.pos.y + HERO_COLLISION_HEIGHT_SCALED_THORNS / 2
  if (inst.phase === 'hidden') {
    //
    // Trigger when hero walks within the activation radius
    //
    if (!inst.triggered && Math.abs(heroX - TRAP_TRIGGER_X) < TRAP_TRIGGER_RADIUS) {
      inst.phase = 'rising'
      inst.timer = 0
      inst.triggered = true
      sound && Sound.playBladeSound(sound)
    }
    return
  }
  inst.timer += dt
  if (inst.phase === 'rising') {
    inst.progress = Math.min(1, inst.timer / TRAP_RISE_DURATION)
    if (inst.progress >= 1) {
      inst.phase = 'holding'
      inst.timer = 0
    }
  } else if (inst.phase === 'holding') {
    inst.progress = 1
    if (inst.timer >= TRAP_HOLD_DURATION) {
      inst.phase = 'retracting'
      inst.timer = 0
    }
  } else if (inst.phase === 'retracting') {
    inst.progress = Math.max(0, 1 - inst.timer / TRAP_RETRACT_DURATION)
    if (inst.progress <= 0) {
      inst.phase = 'hidden'
      inst.timer = 0
    }
  }
  //
  // Kill hero if feet overlap any risen spike
  //
  if (inst.progress > 0.3) {
    const onFloor = heroFeetY >= FLOOR_Y - FLOOR_THORN_FEET_TOLERANCE_LOW &&
                    heroFeetY <= FLOOR_Y + FLOOR_THORN_FEET_TOLERANCE_HIGH
    if (onFloor) {
      for (const spike of inst.spikes) {
        if (Math.abs(heroX - spike.x) < TRAP_SPIKE_WIDTH_BASE) {
          onHeroFloorThornDeath(k, heroInst, levelIndicator)
          return
        }
      }
    }
  }
}
//
// Draws trap tentacles wiggling upward from the floor
//
function drawTrapSpikes(k, inst, fillColor, outlineColor, heroInst) {
  const time = k.time()
  const heroX = heroInst?.character?.pos?.x ?? 0
  const heroY = heroInst?.character?.pos?.y ?? 0
  for (const spike of inst.spikes) {
    const visibleHeight = spike.height * inst.progress
    if (visibleHeight <= 0) continue
    drawTentacle(k, spike, visibleHeight, time, fillColor, outlineColor, heroX, heroY)
  }
}
//
// Draw a single tentacle as segments with sinusoidal wiggle and an eye at the tip
//
function drawTentacle(k, spike, visibleHeight, time, fillColor, outlineColor, heroX, heroY) {
  const segments = TRAP_SEGMENTS
  let eyeX = 0
  let eyeY = 0
  for (let i = 0; i < segments; i++) {
    const t0 = i / segments
    const t1 = (i + 1) / segments
    const y0 = spike.baseY - visibleHeight * t0
    const y1 = spike.baseY - visibleHeight * t1
    //
    // Wiggle increases toward the tip, phase offset per tentacle for variety
    //
    const wiggle0 = Math.sin(time * TRAP_WIGGLE_SPEED + t0 * 4 + spike.phaseOffset) * TRAP_WIGGLE_AMPLITUDE * t0
    const wiggle1 = Math.sin(time * TRAP_WIGGLE_SPEED + t1 * 4 + spike.phaseOffset) * TRAP_WIGGLE_AMPLITUDE * t1
    const x0 = spike.x + wiggle0
    const x1 = spike.x + wiggle1
    const w0 = TRAP_SPIKE_WIDTH_BASE * (1 - t0 * 0.7)
    const w1 = TRAP_SPIKE_WIDTH_BASE * (1 - t1 * 0.7)
    const ow = 2
    k.drawPolygon({
      pts: [
        k.vec2(x0 - w0 / 2 - ow, y0),
        k.vec2(x0 + w0 / 2 + ow, y0),
        k.vec2(x1 + w1 / 2 + ow, y1),
        k.vec2(x1 - w1 / 2 - ow, y1)
      ],
      color: outlineColor
    })
    k.drawPolygon({
      pts: [
        k.vec2(x0 - w0 / 2, y0),
        k.vec2(x0 + w0 / 2, y0),
        k.vec2(x1 + w1 / 2, y1),
        k.vec2(x1 - w1 / 2, y1)
      ],
      color: fillColor
    })
    //
    // Track eye position at the segment closest to the tip
    //
    if (t1 >= TRAP_EYE_SEGMENT && eyeX === 0) {
      eyeX = (x0 + x1) / 2
      eyeY = (y0 + y1) / 2
    }
  }
  //
  // Draw eye that follows the hero
  //
  drawTentacleEye(k, eyeX, eyeY, heroX, heroY)
}
//
// Draws an eye on the tentacle tip that tracks the hero position
//
function drawTentacleEye(k, eyeX, eyeY, heroX, heroY) {
  //
  // White sclera
  //
  k.drawCircle({
    pos: k.vec2(eyeX, eyeY),
    radius: TRAP_EYE_RADIUS + 1,
    color: k.rgb(0, 0, 0)
  })
  k.drawCircle({
    pos: k.vec2(eyeX, eyeY),
    radius: TRAP_EYE_RADIUS,
    color: k.rgb(240, 240, 230)
  })
  //
  // Pupil that looks toward the hero
  //
  const dx = heroX - eyeX
  const dy = heroY - eyeY
  const dist = Math.sqrt(dx * dx + dy * dy)
  const nx = dist > 0 ? dx / dist : 0
  const ny = dist > 0 ? dy / dist : 0
  k.drawCircle({
    pos: k.vec2(eyeX + nx * TRAP_PUPIL_MAX_OFFSET, eyeY + ny * TRAP_PUPIL_MAX_OFFSET),
    radius: TRAP_PUPIL_RADIUS,
    color: k.rgb(20, 20, 20)
  })
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
  // Bottom corners need higher z-index to render above grass (z=20) and trees (z=25)
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
 * Creates dark background clouds that scroll slowly to the right in a seamless loop.
 * Clouds are generated within a band width equal to the screen, then drawn twice
 * side-by-side so one copy always fills the visible area during scrolling.
 * @param {Object} k - Kaplay instance
 */
function createBackgroundClouds(k) {
  const CLOUD_SCROLL_SPEED = 8
  const CLOUD_TOP_Y = TOP_MARGIN + 20
  const CLOUD_BOTTOM_Y = TOP_MARGIN + 100
  const CLOUD_COUNT = 18
  const CLOUD_RANDOMNESS = 20
  const baseCloudColor = k.rgb(36, 37, 36)
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
    const crownSize = (50 + Math.random() * 60) * 1.2
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
  // Draw two copies of the band so one always fills the visible area.
  // The second copy is placed one bandWidth BEHIND (to the left of) the first.
  //
  k.add([
    k.z(1),
    {
      draw() {
        inst.scrollX = (inst.scrollX + CLOUD_SCROLL_SPEED * k.dt()) % bandWidth
        for (let copy = 0; copy < 2; copy++) {
          //
          // copy 0: current position, copy 1: one band-width behind
          //
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
 * Check if player earned speed bonus for completing level faster than target
 * @param {number} levelTime - Time taken to complete level (seconds)
 * @returns {boolean} True if speed bonus earned
 */
function checkSpeedBonus(levelTime) {
  const targetTime = CFG.gameplay.speedBonusTime
    && CFG.gameplay.speedBonusTime['level-touch.0']
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
      if (age >= lifetime && particle.exists?.()) {
        k.destroy(particle)
      }
    })
  }
}

/**
 * Creates instructions text with manual black outline
 * @param {Object} k - Kaplay instance
 * @param {number} centerX - Center X position
 * @param {number} textY - Text Y position
 * @returns {Object} Object with mainText and outlineTexts array
 */
function createInstructionsText(k, centerX, textY) {
  //
  // Create 8 outline texts (black)
  //
  const outlineOffsets = [
    [-INSTRUCTIONS_OUTLINE_OFFSET, 0], [INSTRUCTIONS_OUTLINE_OFFSET, 0],
    [0, -INSTRUCTIONS_OUTLINE_OFFSET], [0, INSTRUCTIONS_OUTLINE_OFFSET],
    [-INSTRUCTIONS_OUTLINE_OFFSET, -INSTRUCTIONS_OUTLINE_OFFSET], [INSTRUCTIONS_OUTLINE_OFFSET, -INSTRUCTIONS_OUTLINE_OFFSET],
    [-INSTRUCTIONS_OUTLINE_OFFSET, INSTRUCTIONS_OUTLINE_OFFSET], [INSTRUCTIONS_OUTLINE_OFFSET, INSTRUCTIONS_OUTLINE_OFFSET]
  ]
  const outlineTexts = outlineOffsets.map(([dx, dy]) => k.add([
    k.text(INSTRUCTIONS_TEXT, {
      size: INSTRUCTIONS_FONT_SIZE,
      align: "center",
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX + dx, textY + dy),
    k.anchor("center"),
    k.color(0, 0, 0),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 9)
  ]))
  //
  // Create main text (white)
  //
  const mainText = k.add([
    k.text(INSTRUCTIONS_TEXT, {
      size: INSTRUCTIONS_FONT_SIZE,
      align: "center",
      font: CFG.visual.fonts.regularFull.replace(/'/g, '')
    }),
    k.pos(centerX, textY),
    k.anchor("center"),
    k.color(255, 255, 255),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 10)
  ])
  return { mainText, outlineTexts }
}

/**
 * Starts a timed conversation between three monsters (big bugs 0, 1, 2).
 * Each line appears as a speech bubble above the speaking monster.
 * Display duration is based on text length. Plays once after initial delay.
 * @param {Object} k - Kaplay instance
 * @param {Array<Object>} monsterBugs - Array of [bug0, bug1, bug2] instances
 */
function startMonsterConversation(k, monsterBugs) {
  //
  // Only show conversation once per player (persisted in localStorage)
  //
  if (get(MONSTER_CONVERSATION_STORAGE_KEY)) return
  //
  // Conversation state: tracks current line and timing
  //
  const inst = {
    lineIndex: 0,
    timer: 0,
    phase: 'delay',
    currentTooltip: null,
    currentDisplayTime: 0
  }
  //
  // Show a conversation line as a forced-visible tooltip above the speaking monster
  //
  const showLine = (lineData) => {
    const bug = monsterBugs[lineData.speaker]
    if (!bug) return
    inst.currentTooltip && Tooltip.destroy(inst.currentTooltip)
    const target = {
      x: () => bug.x,
      y: () => bug.y,
      width: 0,
      height: 0,
      text: lineData.text,
      offsetY: -80
    }
    inst.currentTooltip = Tooltip.create({
      k,
      targets: [target],
      forceVisible: true
    })
    inst.currentTooltip.activeTarget = target
    inst.currentTooltip.frozenX = Math.round(bug.x)
    inst.currentTooltip.frozenY = Math.round(bug.y)
    inst.currentTooltip.opacity = 1
    const chars = lineData.text.replace(/\n/g, '').length
    inst.currentDisplayTime = Math.max(MONSTER_MIN_DISPLAY_TIME, chars / MONSTER_CHARS_PER_SECOND)
  }
  //
  // Update handler drives the conversation timeline
  //
  k.onUpdate(() => {
    inst.timer += k.dt()
    if (inst.phase === 'delay') {
      if (inst.timer >= MONSTER_CONVERSATION_DELAY) {
        inst.phase = 'showing'
        inst.timer = 0
        showLine(MONSTER_CONVERSATION_LINES[0])
      }
    } else if (inst.phase === 'showing') {
      //
      // Keep frozen position updated so bubble tracks the swaying monster
      //
      if (inst.currentTooltip) {
        const bug = monsterBugs[MONSTER_CONVERSATION_LINES[inst.lineIndex].speaker]
        inst.currentTooltip.frozenX = Math.round(bug.x)
        inst.currentTooltip.frozenY = Math.round(bug.y)
      }
      if (inst.timer >= inst.currentDisplayTime) {
        inst.currentTooltip && Tooltip.destroy(inst.currentTooltip)
        inst.currentTooltip = null
        inst.lineIndex++
        if (inst.lineIndex >= MONSTER_CONVERSATION_LINES.length) {
          inst.phase = 'done'
          //
          // Persist only after the full conversation has played
          //
          set(MONSTER_CONVERSATION_STORAGE_KEY, true)
          return
        }
        inst.phase = 'pause'
        inst.timer = 0
      }
    } else if (inst.phase === 'pause') {
      if (inst.timer >= MONSTER_PAUSE_BETWEEN) {
        inst.phase = 'showing'
        inst.timer = 0
        showLine(MONSTER_CONVERSATION_LINES[inst.lineIndex])
      }
    }
  })
}

/**
 * Shows random speech bubbles from crawling small bugs with long pauses.
 * Picks a random crawling bug and a random phrase, displays it, then waits.
 * Loops indefinitely to add ambient life to the level.
 * @param {Object} k - Kaplay instance
 * @param {Array<Object>} smallBugs - Array of small bug instances
 */
function startSmallBugPhrases(k, smallBugs) {
  const inst = {
    timer: 0,
    phase: 'pause',
    currentTooltip: null,
    currentDisplayTime: 0,
    lastPhraseIndex: -1,
    pauseDuration: BUG_PHRASE_MIN_PAUSE * 0.5 + Math.random() * BUG_PHRASE_EXTRA_PAUSE * 0.5
  }
  //
  // Pick a random phrase, avoiding the last one used
  //
  const pickPhrase = () => {
    let idx = Math.floor(Math.random() * SMALL_BUG_PHRASES.length)
    if (idx === inst.lastPhraseIndex && SMALL_BUG_PHRASES.length > 1) {
      idx = (idx + 1) % SMALL_BUG_PHRASES.length
    }
    inst.lastPhraseIndex = idx
    return SMALL_BUG_PHRASES[idx]
  }
  //
  // Find a random bug that is currently crawling (not in pyramid or scared)
  //
  const pickBug = () => {
    const crawling = smallBugs.filter(b => b.state === 'crawling')
    if (crawling.length === 0) return null
    return crawling[Math.floor(Math.random() * crawling.length)]
  }
  //
  // Show a phrase bubble above the chosen bug
  //
  const showPhrase = (bug, text) => {
    inst.currentTooltip && Tooltip.destroy(inst.currentTooltip)
    const target = {
      x: () => bug.x,
      y: () => bug.y,
      width: 0,
      height: 0,
      text,
      offsetY: BUG_PHRASE_Y_OFFSET
    }
    inst.currentTooltip = Tooltip.create({
      k,
      targets: [target],
      forceVisible: true
    })
    inst.currentTooltip.activeTarget = target
    inst.currentTooltip.frozenX = Math.round(bug.x)
    inst.currentTooltip.frozenY = Math.round(bug.y)
    inst.currentTooltip.opacity = 1
    const chars = text.replace(/\n/g, '').length
    inst.currentDisplayTime = Math.max(BUG_PHRASE_MIN_DISPLAY_TIME, chars / BUG_PHRASE_CHARS_PER_SECOND)
  }
  k.onUpdate(() => {
    inst.timer += k.dt()
    if (inst.phase === 'pause') {
      if (inst.timer >= inst.pauseDuration) {
        const bug = pickBug()
        if (!bug) {
          inst.timer = 0
          return
        }
        const text = pickPhrase()
        showPhrase(bug, text)
        inst.phase = 'showing'
        inst.timer = 0
      }
    } else if (inst.phase === 'showing') {
      if (inst.timer >= inst.currentDisplayTime) {
        inst.currentTooltip && Tooltip.destroy(inst.currentTooltip)
        inst.currentTooltip = null
        inst.phase = 'pause'
        inst.timer = 0
        inst.pauseDuration = BUG_PHRASE_MIN_PAUSE + Math.random() * BUG_PHRASE_EXTRA_PAUSE
      }
    }
  })
}

/**
 * Shows keyboard instructions with fade in/hold/fade out animation
 * @param {Object} k - Kaplay instance
 * @param {number} extraDelay - Additional delay before showing (e.g. waiting for deduction animation)
 */
function showInstructions(k, extraDelay = 0) {
  const centerX = CFG.visual.screen.width / 2
  const textY = TOP_MARGIN + 90
  //
  // Create instructions text with outline
  //
  const { mainText, outlineTexts } = createInstructionsText(k, centerX, textY)
  //
  // Animation state (extra delay added to initial delay)
  //
  const totalInitialDelay = INSTRUCTIONS_INITIAL_DELAY + extraDelay
  const inst = {
    timer: 0,
    phase: 'initial_delay'
  }
  //
  // Update animation
  //
  const updateInterval = k.onUpdate(() => {
    inst.timer += k.dt()
    if (inst.phase === 'initial_delay') {
      if (inst.timer >= totalInitialDelay) {
        inst.phase = 'fade_in'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_in') {
      const progress = Math.min(1, inst.timer / INSTRUCTIONS_FADE_IN_DURATION)
      mainText.opacity = progress
      outlineTexts.forEach(t => { t.opacity = progress })
      if (progress >= 1) {
        inst.phase = 'hold'
        inst.timer = 0
      }
    } else if (inst.phase === 'hold') {
      if (inst.timer >= INSTRUCTIONS_HOLD_DURATION) {
        inst.phase = 'fade_out'
        inst.timer = 0
      }
    } else if (inst.phase === 'fade_out') {
      const progress = Math.min(1, inst.timer / INSTRUCTIONS_FADE_OUT_DURATION)
      mainText.opacity = 1 - progress
      outlineTexts.forEach(t => { t.opacity = 1 - progress })
      if (progress >= 1) {
        updateInterval.cancel()
        k.destroy(mainText)
        outlineTexts.forEach(t => k.destroy(t))
      }
    }
  })
}