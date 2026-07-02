import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/lesson-indicator.js'
import * as LevelHelp from '../../../utils/lesson-help.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import * as TreeRoots from '../components/tree-roots.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { goToMenuAfterAssets, goAfterPreparingAssets } from '../../../utils/lesson-assets.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'
import { toCanvas, getRGB, parseHex } from '../../../utils/helper.js'
import * as FallingLeaf from '../components/falling-leaf.js'
// Rain removed from level 1
import * as Tooltip from '../../../utils/tooltip.js'
import * as LifeDeduction from '../utils/life-deduction.js'
import * as GiantWorm from '../components/giant-worm.js'
import { drawRealisticBird, buildBirdDrawCache } from '../utils/realistic-bird.js'
import * as OrganicParallax from '../utils/organic-parallax-tree.js'
import { drawCrow } from '../../../utils/crow.js'
import { addTouchSectionFloorRocks, addSingleFloorRockAt } from '../utils/floor-rocks.js'
import { createHangingSpider, spiderHoverTooltipTarget } from '../utils/hanging-spider.js'
import * as BonusHero from '../components/bonus-hero.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as LogPlatform from '../components/log-platform.js'
import { onUpdateLesson1GameLoop } from '../utils/lesson1-runtime.js'
import { getActiveZoneIndex, isZoneAwake } from '../utils/scene-perf.js'
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const PLAY_AREA_BOTTOM_TRIM = 50
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin + PLAY_AREA_BOTTOM_TRIM
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Rounded corner configuration
//
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'touch1-corner-sprite'
//
// L1 walls / canvas backing / playfield all share `L1_SCENE_BG` for a
// borderless look, so the rounded corner L-shapes must blend into that
// same teal — otherwise the corners read as four dark blobs against the
// brighter teal frame. We expose RGB constants so the corner sprite
// builder and any future wall-tinted decorations stay in sync.
//
const WALL_COLOR_HEX = '#1C323A'
const WALL_COLOR_R = 28
const WALL_COLOR_G = 50
const WALL_COLOR_B = 58
//
// Platform dimensions
//
const FLOOR_Y = CFG.visual.screen.height - BOTTOM_MARGIN - 200
//
// Hero spawn positions
//
const HERO_SPAWN_X = LEFT_MARGIN + 100
const HERO_SPAWN_Y = FLOOR_Y - 50
//
// T letter (right side, on the ground — replaces anti-hero)
//
const T_LETTER_X = CFG.visual.screen.width - RIGHT_MARGIN - 310
//
// 'bot' anchor: Y is the bottom edge of the letter — 28px below floor so
// the letter appears stuck in the ground, matching lesson0 T style.
//
const T_LETTER_Y = FLOOR_Y + 28
const T_LETTER_FONT_SIZE = 68
const T_LETTER_ANGLE = 10
//
// Teal fill — matches lesson0 TOUCH letter palette (90 136 152)
//
const T_LETTER_FILL_R = 90
const T_LETTER_FILL_G = 136
const T_LETTER_FILL_B = 152
const T_LETTER_OUTLINE = 2
const T_LETTER_Z = 27
const T_LETTER_MASK_Z = 28
//
// Collection radius: circular check like lesson0 (radius px)
//
const T_LETTER_COLLECT_RADIUS = 58
//
// Log platforms for collectible letters
//
const LOG_PLATFORM_W = 120
const LOG_PLATFORM_H = 28
//
// O letter platform (left side — appears after 7 tree touches phase 1).
// Low enough that hero can jump onto it from the ground.
//
const O_PLATFORM_X = LEFT_MARGIN + 280
const O_PLATFORM_Y = FLOOR_Y - 101
//
// U letter platform (right side, before giant worm).
// Width reduced 40% vs standard log; shifted one full standard width further left.
//
const U_PLATFORM_W = Math.round(LOG_PLATFORM_W * 0.6)
const U_PLATFORM_X = CFG.visual.screen.width - RIGHT_MARGIN - 280 - LOG_PLATFORM_W + Math.round(U_PLATFORM_W / 2)
const U_PLATFORM_Y = FLOOR_Y - 171
//
// CH letter platform (left side — appears after melody solved)
//
const CH_PLATFORM_X = LEFT_MARGIN + 160
const CH_PLATFORM_Y = FLOOR_Y - 102
const CH_PLATFORM_W = Math.round(LOG_PLATFORM_W * 0.85)
//
// Platform and letters fade out this many seconds after the letters are collected
//
const CH_PLATFORM_HIDE_DELAY = 3
//
// Touch counter (x/7) position relative to hero head
//
const TOUCH_COUNTER_X_OFFSET = 18
const TOUCH_COUNTER_Y_OFFSET = -95
const TOUCH_COUNTER_FONT = 20
//
// Melody note counter (x/5) shown near hero during melody phase
//
const MELODY_COUNTER_X_OFFSET = 18
const MELODY_COUNTER_Y_OFFSET = -95
const MELODY_COUNTER_FONT = 20
const MELODY_COUNTER_TOTAL = 5
//
// Mushroom trampoline (right corner — helps reach bonus hero platform)
//
const MUSHROOM_TRAMP_X = CFG.visual.screen.width - RIGHT_MARGIN - 20
const MUSHROOM_TRAMP_Y = FLOOR_Y
const MUSHROOM_TRAMP_RADIUS = 30
const MUSHROOM_TRAMP_FORCE = 1350
const MUSHROOM_TRAMP_COOLDOWN = 0.4
//
// Trampoline mushroom visual dimensions — same scale as large decorative mushrooms
//
const MUSHROOM_TRAMP_CAP_W = 28
const MUSHROOM_TRAMP_CAP_H = 13
const MUSHROOM_TRAMP_STEM_H = 17
const MUSHROOM_TRAMP_STEM_W = 8
const MUSHROOM_TRAMP_TOTAL_W = Math.ceil(MUSHROOM_TRAMP_CAP_W + 4)
const MUSHROOM_TRAMP_TOTAL_H = Math.ceil(MUSHROOM_TRAMP_CAP_H + MUSHROOM_TRAMP_STEM_H + 4)
//
// Squash amount on bounce (0=normal, 1=full squash)
//
const MUSHROOM_SQUASH_MAX = 0.35
const MUSHROOM_TRAMP_SPRITE = 'mushroom-trampoline'
//
// Warm orange-red cap — same dominant color as trampoline mushrooms in lesson3
//
const MUSHROOM_TRAMP_COLOR = [220, 90, 40]
//
// Bonus hero platform position (reachable via mushroom trampoline).
// Placed high-right but not too high — the mushroom force reaches it cleanly.
//
const BONUS_PLATFORM_X = CFG.visual.screen.width - RIGHT_MARGIN - 240
const BONUS_PLATFORM_Y = FLOOR_Y - 220
//
// End music state constants
//
const FLOOR_STRIPE_H = 3
//
// Raise the stripe so its bottom edge clears the platform's rounded corner arc
//
const FLOOR_STRIPE_Y_OFFSET = 3
const END_MUSIC_NAME = 'touch1-end'
const END_MUSIC_TEXT = 'Press Enter to end the lesson'
const END_MUSIC_TEXT_FONT = 26
const END_MUSIC_TEXT_Y = TOP_MARGIN + 62
//
// Duration of fade-to-black overlay before the level transition fires
//
const SCENE_FADE_OUT_DURATION = 1.5
//
// Dialogs for each letter
//
const L1_DIALOG_T = "Every conversation begins with\na [hl]T[/hl]ouch. Speak with Trees..."
const L1_DIALOG_O = "[hl]O[/hl]bserve. Every voice is\ndifferent."
const L1_DIALOG_U = "[hl]U[/hl]nderstand. Patterns create\nmeaning. Maybe birds may help\nyou?"
const L1_DIALOG_CH = "Every [hl]C[/hl]onnection carries\n[hl]H[/hl]armony within it."
//
// Goal texts matching dialogs (shown when goal button pressed)
//
const L1_GOAL_T = "Every conversation begins\nwith a Touch. Speak with\nTrees — touch all of them."
const L1_GOAL_O = "Observe. Every voice is\ndifferent. Touch all 7\ntrees again."
const L1_GOAL_U = "Understand. Patterns create\nmeaning. Hover the bird to\nhear the sequence."
const L1_GOAL_CH = "Connection and Harmony.\nYou found yourself."
//
// Letter blink animation: matches lesson0 TOUCH letter pulse behaviour
//
const TOUCH_LETTER_PULSE_SPEED = 1.8
const TOUCH_LETTER_PULSE_MIN = 0.35
//
// Firefly configuration: small glowing dots that drift between tree layers
//
const FIREFLY_COUNT = 12
const FIREFLY_MIN_SPEED = 8
const FIREFLY_MAX_SPEED = 25
const FIREFLY_DRIFT_RANGE = 40
const FIREFLY_RADIUS_MIN = 1.5
const FIREFLY_RADIUS_MAX = 3
const FIREFLY_GLOW_SPEED_MIN = 0.8
const FIREFLY_GLOW_SPEED_MAX = 2.5
//
// Fireflies — pulled from the previous near-white-green to warm amber
// gold so the floating dots become the sparkling warm accent against
// the cool teal forest, matching Touch L0's fireflies.
//
const FIREFLY_COLOR_R = 244
const FIREFLY_COLOR_G = 192
const FIREFLY_COLOR_B = 64
//
// Hero push distance for fireflies (same mechanic as snowflakes)
//
const FIREFLY_PUSH_DISTANCE = 60
const FIREFLY_PUSH_STRENGTH = 8
//
// Z-indices for firefly layers (behind/between/in front of trees)
//
const FIREFLY_LAYERS_Z = [1, 4, 8, 24]
//
// Vertical ceiling for fireflies: they should never drift above the
// foreground tree canopy (the yellow-leaved row), so they read as
// little glints inside / beneath the foliage instead of floating
// freely against the open sky. Measured upward from the floor.
//
const FIREFLY_MIN_Y_OFFSET_FROM_FLOOR = 360
//
// Thunder and lightning configuration
//
const LIGHTNING_FLASH_DURATION = 0.18
const LIGHTNING_FLASH_OPACITY = 0.28
const LIGHTNING_BLINK_COUNT = 3
const LIGHTNING_BLINK_INTERVAL = 0.06
const THUNDER_MULTI_CHANCE = 0.5
const THUNDER_MULTI_MAX = 3
const THUNDER_MULTI_DELAY_MIN = 0.4
const THUNDER_MULTI_DELAY_MAX = 1.2
//
// Forest ambient sound intervals (level 1)
//
const L1_BIRD_INTERVAL_MIN = 4
const L1_BIRD_INTERVAL_MAX = 9
const L1_CRICKET_INTERVAL_MIN = 3
const L1_CRICKET_INTERVAL_MAX = 7
const L1_FROG_INTERVAL_MIN = 5
const L1_FROG_INTERVAL_MAX = 15
const L1_CROW_MP3_INTERVAL_MIN = 8
const L1_CROW_MP3_INTERVAL_MAX = 20
const L1_CROW_MP3_VOLUME = 0.6
const L1_CROW_MP3_NAMES = ['crow0']
const L1_CROW_MOUTH_OPEN_DURATION = 0.9
const L1_CROW_ROCK_DRAW_Z = 9
//
// Crow sits on the bare ground just to the right of the hero spawn (no rock, no grass zone).
//
const L1_CROW_X = LEFT_MARGIN + 160
const L1_CROW_LOSER_TEXT = "You're a loser!"
const L1_CROW_DISCO_TEXT = 'Yuhuuu, discooo!!!'
const L1_CROW_TOOLTIP_HOVER_W = 52
const L1_CROW_TOOLTIP_HOVER_H = 48
const L1_CROW_TOOLTIP_OFFSET_Y = -52
//
// Middle parallax layer: same organic autumn trees as touch L0, darkened for depth.
//
const L1_MIDDLE_ORGANIC_TREE_COUNT = 6
const L1_MIDDLE_ORGANIC_COLOR_DIM = 0.3
const L1_MIDDLE_GREYWASH = 0.48
//
// Front organic row reads farther away than gameplay props (no sway; baked into front PNG).
//
const L1_FRONT_ORGANIC_COLOR_DIM = 0.2
const L1_FRONT_ORGANIC_GREYWASH = 0.58
const L1_BACK_ROW_FAR_BLEND = 0.62
const L1_BACK_ROW_NEAR_BLEND = 0.36
//
// Scene fill — deep teal, the dominant cool half of the complementary
// palette (matches Touch L0's playfield). Same darkness band as the
// previous neutral grey so silhouette contrast stays intact.
//
const L1_SCENE_BG_R = 28
const L1_SCENE_BG_G = 50
const L1_SCENE_BG_B = 58
const L1_SCENE_BG_HEX = '#1C323A'
//
// Zone sleep + TreeRoots proximity (touch level 1 performance)
//
const L1_ZONE_COUNT = 4
const L1_TREE_ROOT_UPDATE_MAX_DIST = 1500
const L1_TREE_COLLISION_MAX_DIST = 100
//
// Mushroom decoration constants for level 1
//
const L1_MUSHROOM_COUNT = 6
const L1_MUSHROOM_FUNNY_CHANCE = 0.38
const L1_SPIDER_TOOLTIP_TEXT = 'apartment for rent, cheep'
//
// Occasional mushroom hover jokes (English)
//
const L1_MUSHROOM_FUNNY_LINES = [
  'Still more grounded than my ex',
  'Do not tap — union mushroom',
  'Certified organic-ish',
  'Contains zero bitcoin',
  'I peaked in the spore era'
]
const L1_MUSHROOM_CAP_WIDTH_MIN = 14
const L1_MUSHROOM_CAP_WIDTH_MAX = 26
const L1_MUSHROOM_STEM_HEIGHT_MIN = 10
const L1_MUSHROOM_STEM_HEIGHT_MAX = 20
//
// Soft contour glow around level 1 mushrooms
//
const L1_MUSHROOM_GLOW_OUTLINE_PAD = 1.4
const L1_MUSHROOM_GLOW_ALPHA_MIN = 0.08
const L1_MUSHROOM_GLOW_ALPHA_RANGE = 0.24
const L1_MUSHROOM_GLOW_SPEED = 1.7
//
// Scrolling cloud constants
//
const CLOUD_SCROLL_SPEED = 8
const CLOUD_TOP_Y = TOP_MARGIN + 20
const CLOUD_BOTTOM_Y = TOP_MARGIN + 100
const CLOUD_COUNT = 18
const CLOUD_RANDOMNESS = 20
//
// Tooltip texts
//
const HERO_TOOLTIP_TEXT = "Do, Re, Mi..."
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -100
const TOUCH_INDICATOR_TOOLTIP_TEXT = "Here you can see how far\nyou have come in learning touch"
const TOUCH_INDICATOR_TOOLTIP_WIDTH = 250
const TOUCH_INDICATOR_TOOLTIP_HEIGHT = 50
const TOUCH_INDICATOR_TOOLTIP_Y_OFFSET = -30
const FPS_COUNTER_TOP_Y = 55
const SMALL_HERO_TOOLTIP_TEXT = "Your fragments"
const SMALL_HERO_TOOLTIP_SIZE = 60
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_TEXT = "Your experience"
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50
//
// Falling leaf tooltip phrases (shown when hovering a leaf in the air)
//
const LEAF_FALLING_PHRASES = [
  "Aaaaaa!!!!",
  "I'm freeee!",
  "Wheee!!",
  "Not again...",
  "Fly, fly, fly!"
]
//
// Grounded leaf tooltip phrases (shown when hovering a leaf on the floor)
//
const LEAF_GROUND_PHRASES = [
  "I used to be somebody",
  "Don't step on me!",
  "I'm fine. This is fine",
  "Tell my branch\nI said hi",
  "Floor life is\nnot so bad",
  "I'm on a break",
  "Five more minutes...",
  "Was that a foot?!",
  "I regret nothing",
  "At least it's warm\ndown here"
]
//
// Poison leaf tooltip phrases (shown on hover over blue leaves)
//
const LEAF_POISON_PHRASES = [
  "Don't touch me",
  "I dare you",
  "Feeling brave?",
  "You won't like this",
  "Blue means danger"
]
const LEAF_TOOLTIP_HOVER_SIZE = 30
const LEAF_TOOLTIP_Y_OFFSET = -30
//
// Poison leaf settings (blue leaves that kill the hero on contact)
//
const POISON_LEAF_CHANCE = 0.4
//
// Poison leaves — kept on the cool half of the complementary palette
// but pulled toward steel teal so they read as on-palette danger
// (instead of an isolated bright cyan-blue accent against the warm
// autumn leaves).
//
const POISON_LEAF_COLOR_HEX = '#3E708A'
//
// Death animation — leaf burst and 10-second restart countdown
//
const DEATH_LEAF_COUNT = 22
const DEATH_LEAF_BURST_SPEED_MIN = 90
const DEATH_LEAF_BURST_SPEED_MAX = 240
const DEATH_LEAF_GRAVITY = 320
const DEATH_LEAF_DRAG = 0.97
const DEATH_LEAF_LIFETIME = 4.5
const DEATH_COUNTDOWN_SECONDS = 7
//
// Prompt shown at the top after hero death.
// Player can press Space or Enter to restart; auto-restarts after 7 s.
// Countdown number is appended inline after the three dots, same color as the text.
//
const L1_DEATH_PROMPT_BASE = 'Press Space or Enter to continue... '
const L1_DEATH_PROMPT_Y = TOP_MARGIN + 62
const L1_DEATH_PROMPT_FONT = 22
const WORM_BASE_Y = FLOOR_Y + 30
const WORM_DRAW_Z = 17
const WORM_SEGMENT_COUNT = 5
const WORM_SEGMENT_RADIUS = 2.5
const WORM_REST_SPACING = 4.0
const WORM_WAVE_SPEED = 0.3
const WORM_HEAD_SPEED = 3.5
const WORM_FOLLOW_SPEED = 6
const WORM_STEER_SPEED = 0.4
const WORM_STEER_AMPLITUDE = 0.15
const WORM_DIRECTION_CHANGE_MIN = 10
const WORM_DIRECTION_CHANGE_RANGE = 20
const WORM_WAVE_DELAY = 0.4
const WORM_CONTRACT_MIN = 0.7
const WORM_CONTRACT_MAX = 1.0
const WORM_MAX_STRETCH = 1.2
const WORM_BULGE_AMOUNT = 0.85
const WORM_TRAIL_FADE_SPEED = 0.0035
const WORM_TRAIL_MAX_POINTS = 30
const WORM_TRAIL_COLOR = '#060806'
const WORM_BODY_COLOR = '#6E4538'
const WORM_HEAD_COLOR = '#8B5E48'
const WORM_VENTRAL_HIGHLIGHT = '#A07868'
const WORM_SEGMENT_RING_OPACITY = 0.42
const WORM_EYE_RADIUS = 1.4
const WORM_PUPIL_RADIUS = 0.7
const WORM_EYE_SPACING = 2.0
const WORM_COUNT = 1
const WORM_Y_ZONE_HEIGHT = 15
const WORM_HOVER_WIDTH = 50
const WORM_HOVER_HEIGHT = 30
const WORM_TOOLTIP_OFFSET_Y = -28
const SMALL_WORM_PHRASES = [
  "You should see\nmy dad",
  "I'm just a\nbaby noodle",
  "Do worms have\nfeelings? Yes."
]
//
// Life icon flash/particle effects on death
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
// First tree trunk tooltip (note name hint)
//
const FIRST_TREE_TOOLTIP_TEXT = "Do"
const FIRST_TREE_TOOLTIP_HOVER_WIDTH = 40
const FIRST_TREE_TOOLTIP_EXTRA_HEIGHT = 20
const FIRST_TREE_TOOLTIP_Y_OFFSET = -60
//
// Crow hint — note sequence shown on hover after U collected
//
const L1_CROW_SEQUENCE_HINT = "Do, Re, Mi, Re, Mi\nplay the trees"
const GIANT_WORM_X_OFFSET = 200
//
// Life deduction — first trap (poison leaves) and second trap (random rising bugs)
//
const LIFE_DEDUCT_THRESHOLD = 5
const LIFE_DEDUCT_FLAG = 'touch.lesson1TrapAdded'
const LIFE_DEDUCT_VISITED_FLAG = 'touch.lesson1Visited'
const LIFE_DEDUCT_LEAVES_FLAG = 'touch.lesson1LeavesActive'
//
// Second trap — giant worm that resurfaces between note trees.
// Activates independently of the first trap when lifeScore > 6 (>= 7 points).
//
const TRAP2_THRESHOLD = 10
const TRAP2_FLAG = 'touch.lesson1Trap2Added'
const TRAP2_VISITED_FLAG = 'touch.lesson1Trap2Visited'
const TRAP2_WORM_REPOSITION_DELAY = 1.5
//
// Decorative parallax trees must not overlap the seven melody note trees
//
const NOTE_TREE_EXCLUSION_RADIUS = 70

/**
 * Level 1 scene for touch section
 * Basic platform layout with simple obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLesson1(k) {
  k.scene("lesson-touch.1", async () => {
    //
    // Save progress
    //
    set('lastLesson', 'lesson-touch.1')
    //
    // Snapshot life score at level entry so deaths this level do not
    // permanently inflate the teacher's score in the next level.
    //
    const initialLifeScore = get('lifeScore', 0)
    //
    // Set background to match wall color (prevents visible bars at top/bottom)
    //
    //
    // Sync canvas + CSS backdrop so letterbox bars match the scene background.
    //
    CanvasBackdrop.applyCanvasBackdrop(k, L1_SCENE_BG_HEX)
    //
    // Async sprite load can outlive a quick re-enter; bail before adding duplicate draw layers.
    //
    let sceneActive = true
    k.onSceneLeave(() => {
      sceneActive = false
      CanvasBackdrop.clearCanvasBackdrop(k)
    })
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
    // Draw background
    //
    k.onDraw(() => {
      k.drawRect({
        width: k.width(),
        height: k.height(),
        pos: k.vec2(0, 0),
        color: k.rgb(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B)
      })
    })
    //
    // Scrolling clouds: generate configs and add live draw object
    //
    const cloudConfigs = createScrollingCloudConfigs()
    createScrollingClouds(k, cloudConfigs)
    //
    // Create grass/bushes/trees decoration with parallax depth layers
    //
    //
    // `grassY` is the visible ground line — the y where every blade
    // base, bush root and trunk bottom is anchored. Lowered by 1 px
    // from `FLOOR_Y - 2` to `FLOOR_Y - 1` so the grass line sits a
    // touch closer to the actual physics floor, matching the eye-line
    // the player reads as "ground" against the deeper teal playfield.
    //
    const grassY = FLOOR_Y - 1
    const playableWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    const noteTreeXs = TreeRoots.getNoteTreePositions(LEFT_MARGIN, RIGHT_MARGIN, CFG.visual.screen.width)
    const bgColor = { r: L1_SCENE_BG_R, g: L1_SCENE_BG_G, b: L1_SCENE_BG_B }
    //
    // Blend Kaplay RGB colours toward the flat scene fog for distant silhouettes.
    //
    const tintKapRgbTowardBg = (kapRgb, amount) => k.rgb(
      Math.round(kapRgb.r * (1 - amount) + bgColor.r * amount),
      Math.round(kapRgb.g * (1 - amount) + bgColor.g * amount),
      Math.round(kapRgb.b * (1 - amount) + bgColor.b * amount)
    )
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
      //
      // Section-based placement: divide the playable width into equal sections,
      // place one cluster per section with random jitter within the section.
      // This guarantees even horizontal coverage across the full game zone
      // while still giving a patchy, organic look (some sections are skipped).
      //
      const sectionCount = layerIndex === 0 ? 9 : 5
      const sectionW = playableWidth / sectionCount
      for (let c = 0; c < sectionCount; c++) {
        //
        // Skip ~20% of sections at random to create natural gaps
        //
        if (Math.random() < 0.2) continue
        const sectionLeft = LEFT_MARGIN + c * sectionW
        //
        // Cluster center is random within the section, with a small margin
        //
        let centerX = sectionLeft + sectionW * 0.15 + Math.random() * (sectionW * 0.7)
        //
        // Avoid placing right at the hero spawn
        //
        if (Math.abs(centerX - HERO_SPAWN_X) < 120) {
          centerX = HERO_SPAWN_X + 130
          if (centerX > sectionLeft + sectionW) continue
        }
        const clusterRadius = (layerIndex === 0 ? 30 : 20) + Math.random() * (layerIndex === 0 ? 45 : 30)
        const bladesInCluster = (layerIndex === 0 ? 10 : 7) + Math.floor(Math.random() * (layerIndex === 0 ? 10 : 7))
        for (let b = 0; b < bladesInCluster; b++) {
          const dist = Math.pow(Math.random(), 1.52) * clusterRadius
          const ang = Math.random() * Math.PI * 2
          const baseX = centerX + Math.cos(ang) * dist * 0.94
          if (baseX < LEFT_MARGIN + 8 || baseX > LEFT_MARGIN + playableWidth - 8) continue
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
      const treeCount = layerIndex === 0 ? 26 : (layerIndex === 1 ? 14 : 0)
      
      for (let i = 0; i < treeCount; i++) {
        //
        // Mid-distance organic canopy — procedural twin of touch L0, dimmed so front stays brightest.
        //
        if (layerIndex === 1) {
          //
          // Edge-to-edge spacing: first tree near left edge, last near right edge.
          // Background parallax trees don't need to avoid note trees — they render
          // behind the gameplay layer and never visually conflict with note trees.
          //
          const spacing = playableWidth / (treeCount - 1)
          const randomness = 40
          const treeX = LEFT_MARGIN + spacing * i + (Math.random() - 0.5) * randomness
          const baseTreeHeight = (105 + Math.random() * 135) * scale
          const crownCenterY = grassY + yOffset - baseTreeHeight
          const trunkBottom = grassY
          const trunkActualHeight = baseTreeHeight * (0.55 + Math.random() * 0.1)
          const trunkTop = trunkBottom - trunkActualHeight
          const trunkWidth = (5 + Math.random() * 3) * scale
          const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
            rootAbsoluteMaxY: CFG.visual.screen.height - 6,
            includeRoots: false
          })
          const palette = OrganicParallax.buildTreePalette()
          const tree = {
            x: treeX,
            y: grassY + yOffset,
            trunkTop,
            trunkBottom,
            trunkHeight: trunkActualHeight,
            trunkWidth,
            crownCenterY,
            crowns: [],
            trunkSegments: organic.trunkSegments,
            rootSegments: organic.rootSegments,
            branchClusters: organic.branchClusters,
            trunkColor: k.rgb(palette.trunk.r, palette.trunk.g, palette.trunk.b),
            leafColor: k.rgb(120, 90, 40),
            opacity: baseOpacity + Math.random() * 0.08,
            swaySpeed: 0,
            swayAmount: 0,
            swayOffset: 0
          }
          OrganicParallax.dimOrganicTreeColors(tree, L1_MIDDLE_ORGANIC_COLOR_DIM)
          OrganicParallax.blendOrganicTowardBackground(tree, bgColor, L1_MIDDLE_GREYWASH)
          trees.push(tree)
          continue
        }
        //
        // Back layer: round-crown trees distributed edge-to-edge.
        // No exclusion for note trees — these render in the background baked PNG.
        //
        const spacing = playableWidth / (treeCount - 1)
        const randomness = layerIndex === 0 ? 20 : 25
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
        if (layerIndex === 0) {
          const depthBlend = Math.random() < 0.52 ? L1_BACK_ROW_FAR_BLEND : L1_BACK_ROW_NEAR_BLEND
          tree.trunkColor = tintKapRgbTowardBg(tree.trunkColor, depthBlend)
          tree.leafColor = tintKapRgbTowardBg(tree.leafColor, depthBlend)
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
          if (isNearNoteTreeX(posX, noteTreeXs)) continue
          //
          // Front canopy is organic-only (same generator as touch L0): rain reads crowns from leaf samples.
          //
          const baseTreeHeight = (175 + Math.random() * 285) * scale
            const crownCenterY = grassY + yOffset - baseTreeHeight
            const trunkBottom = grassY
          const trunkActualHeight = baseTreeHeight * (0.55 + Math.random() * 0.1)
            const trunkTop = trunkBottom - trunkActualHeight
            const trunkWidth = (5 + Math.random() * 3) * scale
          const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
            rootAbsoluteMaxY: CFG.visual.screen.height - 6,
            rootSegmentsMin: 10,
            rootSegmentsRange: 16
          })
          const rainCrowns = []
          for (const cluster of organic.branchClusters) {
            for (let l = 0; l < cluster.leaves.length; l += 3) {
              const leaf = cluster.leaves[l]
              const worldLeafX = cluster.pivotX + leaf.x
              const worldLeafY = cluster.pivotY + leaf.y
              rainCrowns.push({ offsetX: worldLeafX, offsetY: worldLeafY - crownCenterY })
            }
          }
          const palette = OrganicParallax.buildTreePalette()
            const tree = {
              x: posX,
              y: grassY + yOffset,
            trunkTop,
            trunkBottom,
            trunkHeight: trunkActualHeight,
            trunkWidth,
            crownCenterY,
            crowns: rainCrowns,
            trunkSegments: organic.trunkSegments,
            rootSegments: organic.rootSegments,
            branchClusters: organic.branchClusters,
            trunkColor: k.rgb(palette.trunk.r, palette.trunk.g, palette.trunk.b),
            rootColor: k.rgb(palette.root.r, palette.root.g, palette.root.b),
            leafColor: k.rgb(120, 90, 40),
              opacity: 0.95,
            swaySpeed: 0,
            swayAmount: 0,
            swayOffset: 0
          }
          OrganicParallax.dimOrganicTreeColors(tree, L1_FRONT_ORGANIC_COLOR_DIM)
          OrganicParallax.blendOrganicTowardBackground(tree, bgColor, L1_FRONT_ORGANIC_GREYWASH)
            trees.push(tree)
        }
      }
      
      layers.push({ grassBlades, bushes, trees, name: config.name })
    }
    //
    // Single merged PNG bakes all three parallax tree layers at once.
    // This eliminates one extra draw call and one texture sample per frame.
    // Draw order: back (0) → middle (1) → front (2) — layers compose correctly.
    //
    const createAllTreesCanvas = () => {
      const bw = CFG.visual.screen.width
      const bh = CFG.visual.screen.height
      return toCanvas({ width: bw, height: bh, pixelRatio: 1 }, (ctx) => {
        for (const layer of layers) {
          drawLayerToCanvas(ctx, layer, 0, null)
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
        // Organic autumn trees (touch L0 style): trunk segments + roots + clusters.
        //
        if (tree.branchClusters && tree.trunkSegments) {
          OrganicParallax.drawOrganicTreeToCanvas(ctx, tree, sway)
          continue
        }
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
    
    //
    // One sprite for all background tree layers — single draw call per frame
    //
    const allTreesDataURL = createAllTreesCanvas()
    loadTouchSprite(k, 'bg-touch-all-trees', allTreesDataURL)
    k.add([
      k.z(2),
      {
        draw() {
          drawL1StaticAllTrees(k)
        }
      }
    ])
    const l1Rocks = addTouchSectionFloorRocks(k, {
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN,
      drawZ: L1_CROW_ROCK_DRAW_Z,
      spritePrefix: 'rock-l1',
      rockCount: 5,
      excludeCenterX: HERO_SPAWN_X,
      excludeHalfWidth: 125,
      //
      // Keep rocks away from the mushroom trampoline area
      //
      excludeZones: [{ centerX: MUSHROOM_TRAMP_X, halfWidth: 80 }]
    })
    //
    // Create birds flying in the background (same realistic silhouette as Touch L0).
    //
    const birds = []
    const BIRD_COUNT = 5
    const SKY_HEIGHT = 400
    const BIRD_FLAP_GLIDE_BLEND_TIME = 0.45
    const BIRD_GLIDE_POSE = 0.45
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
      const initialFlapping = Math.random() > 0.5
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
        isFlapping: initialFlapping,
        flapTimer: Math.random() * 3,
        flapDuration: 0.8 + Math.random() * 0.4,
        glideDuration: 2.0 + Math.random() * 2.0,
        modeBlend: initialFlapping ? 1 : 0,
        //
        // Pre-allocated draw positions — eliminates 8 k.vec2 allocations per bird per frame
        //
        dc: buildBirdDrawCache(k)
      })
    }
    k.add([
      k.z(5),
      {
        draw() {
          for (const bird of birds) {
            drawRealisticBird(k, bird, bird.wingPhase, bird.dc)
          }
        }
      }
    ])
    //
    // Merge all grass blades from all layers into one flat array.
    // Per-blade drawLine gives each blade its own natural sway (base fixed,
    // tip bending in wind) — the same approach as lesson0, which the user
    // considers the reference for realistic grass movement.
    //
    const allGrassBlades = []
    for (const layer of layers) {
      allGrassBlades.push(...layer.grassBlades)
    }
    //
    // Reusable vec2 instances — avoid allocating 2 vec2 objects per blade per frame
    // (that would be ~500 short-lived allocations/sec at 60 fps with ~250 blades).
    //
    const grassP1 = k.vec2(0, 0)
    const grassP2 = k.vec2(0, 0)
    //
    // Grass drawer — always renders all blades (no zone culling, no hero push).
    // Lesson1 is a fixed-viewport level so all blades are always on screen.
    //
    const grassDrawer = k.add([
      k.z(20),
      {
        draw() {
          const time = k.time()
          for (const blade of allGrassBlades) {
            const sway = Math.sin(time * blade.swaySpeed + blade.swayOffset) * blade.swayAmount
            grassP1.x = blade.x1
            grassP1.y = blade.y1
            grassP2.x = blade.baseX2 + sway
            grassP2.y = blade.y2
            k.drawLine({
              p1: grassP1,
              p2: grassP2,
              width: blade.width,
              color: blade.color,
              opacity: blade.opacity
            })
          }
        }
      }
    ])
    //
    // Create walls and boundaries
    //
    // Left wall (full height)
    //
    k.add([
      k.rect(LEFT_MARGIN, CFG.visual.screen.height),
      k.pos(LEFT_MARGIN / 2, CFG.visual.screen.height / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B),
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
      k.color(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B),
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
      k.color(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Create rounded corners at all four game area corners
    //
    createRoundedCorners(k)
    //
    // Create level indicator (TOUCH letters)
    //
    //
    // Hero body color: red if word complete, orange if time complete, brown if touch complete, otherwise gray
    //
    const isTouchComplete = get('touch.completed', false)
    const isWordComplete = get('word.completed', false)
    const isTimeComplete = get('time.completed', false)
    //
    // Default silver hero. After completing touch he adopts the touch
    // identity colour, which is now steel teal — the cool complement of
    // silver in the teal+orange palette.
    //
    //
    // Touch section identity teal — same as lesson0 antiHero/hero colour.
    // Upper sections override: word=red, time=orange, otherwise teal always.
    //
    const heroBodyColor = isWordComplete ? "#E74C3C" : isTimeComplete ? "#FF8C00" : CFG.visual.colors.sections.touch.body
    const levelIndicator = LevelIndicator.create({
      k,
      levelNumber: 1,
      //
      // Start all TOUCH letters gray — each letter lights up teal when collected.
      // setSectionLabelLetterProgress is called in each onXLetterCollect callback.
      //
      sectionLabelCompletedLetters: 0,
      activeColor: '#5A8898',
      inactiveColor: '#B0B0B0',
      completedColor: '#5A8898',
      heroBodyColor,
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    //
    // Mutable ref updated by letter collection callbacks so the goal button
    // always shows the most recent letter dialog (before gameState exists).
    //
    const l1GoalRef = { text: LevelHelp.LESSON_GOAL_TEXTS?.['lesson-touch.1'] ?? '' }
    LevelHelp.create({
      k,
      levelName: 'lesson-touch.1',
      sideWallWidth: LEFT_MARGIN,
      floorY: FLOOR_Y,
      helpY: CFG.visual.screen.height - 55,
      levelIndicator,
      sound,
      sceneBackdropHex: '#1C323A',
      //
      // Dynamic goal text — shows text from the last letter collection dialog
      //
      getGoalText: () => l1GoalRef.text
    })
    TouchControls.create({
      k,
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN
    })
    //
    // ESC to menu — register early so it works even while async assets load
    //
    k.onKeyPress('escape', () => {
      if (LevelHelp.isAnyPanelOpen()) return
      goToMenuAfterAssets(k)
    })
    //
    // Life deduction logic: leaves are paused until deduction animation plays.
    // First visit with eligible score: mark as visited, no deduction yet.
    // Second visit (after death/reload): show deduction and activate leaves.
    //
    const currentLifeScore = get('lifeScore', 0)
    const trapAlreadyAdded = get(LIFE_DEDUCT_FLAG, false)
    const leavesAlreadyActive = get(LIFE_DEDUCT_LEAVES_FLAG, false)
    const alreadyVisited = get(LIFE_DEDUCT_VISITED_FLAG, false)
    const eligible = !trapAlreadyAdded && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    //
    // Determine whether to show deduction and whether leaves should fall
    //
    let showTrap = false
    let leavesActive = leavesAlreadyActive
    if (eligible && !alreadyVisited) {
      set(LIFE_DEDUCT_VISITED_FLAG, true)
    } else if (eligible && alreadyVisited) {
      showTrap = true
      leavesActive = true
    }
    //
    // Second trap: giant worm that resurfaces between note trees + blue leaves.
    // Requires trap1 to already be set (matches lesson0 pattern).
    // Two-visit mechanism: first visit marks flag, second shows the dialog.
    //
    const trap2AlreadyAdded = get(TRAP2_FLAG, false)
    const trap2AlreadyVisited = get(TRAP2_VISITED_FLAG, false)
    const trap2Eligible = !trap2AlreadyAdded && trapAlreadyAdded && currentLifeScore >= TRAP2_THRESHOLD
    let showTrap2 = false
    if (trap2Eligible && !trap2AlreadyVisited) {
      set(TRAP2_VISITED_FLAG, true)
    } else if (trap2Eligible && trap2AlreadyVisited) {
      showTrap2 = true
    }
    //
    // Prevent both traps in the same visit — defer trap2 to next level entry
    //
    if (showTrap && showTrap2) {
      showTrap2 = false
      set(TRAP2_VISITED_FLAG, false)
    }
    const trap2Active = showTrap2 || trap2AlreadyAdded
    //
    // Trap2 also needs leaves to fall
    //
    if (trap2Active) leavesActive = true
    //
    // Badge count: 0, 1 or 2 depending on which traps are active
    //
    const trapCountValue = trap2Active ? 2 : (showTrap || trapAlreadyAdded) ? 1 : 0
    levelIndicator.updateTrapCount(trapCountValue)
    //
    // Scene-level lock: hero controls disabled during life deduction animation
    //
    const sceneLock = { locked: showTrap || showTrap2 }
    //
    // Bottom platform (full width) - raised by 200px, but extends to bottom
    //
    k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN + 200),
      k.pos(CFG.visual.screen.width / 2, CFG.visual.screen.height - (BOTTOM_MARGIN + 200) / 2),
      k.anchor("center"),
      k.area(),
      k.body({ isStatic: true }),
      k.color(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    //
    // Black stripe along the top edge of the bottom platform — extends across
    // the full platform width (no CORNER_RADIUS inset). The corner sprites are
    // drawn at BOTTOM_CORNER_Z = 30 (above the stripe Z = 29) so they paint the
    // wall color over the stripe ends, visually clipping it at the rounded arcs.
    //
    k.add([
      k.z(T_LETTER_MASK_Z + 1),
      {
        draw() {
          const stripeX = LEFT_MARGIN
          const stripeW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
          k.drawRect({
            pos: k.vec2(stripeX, FLOOR_Y - FLOOR_STRIPE_Y_OFFSET),
            width: stripeW,
            height: FLOOR_STRIPE_H,
            color: k.rgb(22, 38, 24),
            opacity: 1,
            radius: Math.ceil(FLOOR_STRIPE_H / 2)
          })
        }
      }
    ])
    //
    // Game state for letter-collection phase progression
    //
    const gameState = {
      //
      // Progression phases:
      //   'pre_t'  — waiting for hero to collect T letter
      //   'phase1' — T collected, trees make same note, count 7 unique touches → O platform
      //   'wait_o' — O platform visible, waiting for hero to collect O
      //   'phase2' — O collected, trees make unique notes, count 7 touches → U platform
      //   'wait_u' — U platform visible, waiting for hero to collect U
      //   'melody' — U collected, crow shows sequence, hero plays melody → CH platform
      //   'wait_ch' — CH platform visible, waiting for hero to collect CH
      //   'end'    — CH collected, playing end music
      //
      phase: 'pre_t',
      treesEnabled: false,
      treesPhase1Touched: new Set(),
      treesPhase2Touched: new Set(),
      tCollected: false,
      oCollected: false,
      uCollected: false,
      chCollected: false,
      dialogOpen: false,
      //
      // Melody puzzle state (phase 'melody')
      //
      playerSequence: [],
      targetSequence: [0, 1, 2, 1, 2],
      lastTouchedTreeIndex: -1,
      sequenceCompleteTime: null,
      pauseTimer: 0,
      //
      // Goal text shown when goal button pressed (also synced to l1GoalRef.text)
      //
      lastDialogText: '',
      goalRef: l1GoalRef,
      //
      // Touch counter objects
      //
      counterObj: null,
      counterOutlines: null,
      //
      // Platform refs created during gameplay
      //
      oPlatformObj: null,
      uPlatformObj: null,
      chPlatformObj: null,
      oLetterObjs: null,
      uLetterObjs: null,
      chLetterObjs: null,
      //
      // Mushroom trampoline cooldown and squash animation (0=normal, 1=full squash)
      //
      mushroomCooldown: 0,
      mushroomSquash: 0,
      //
      // Melody note counter objects (x/5, visible during 'melody' phase)
      //
      melodyCounterObj: null,
      melodyCounterOutlines: null,
      //
      // Snapshot of life score at level entry — used to undo death penalties on completion.
      //
      initialLifeScore: initialLifeScore ?? 0
    }
    //
    // Minimum pause after melody sequence before it counts as valid
    //
    const SEQUENCE_PAUSE_MINIMUM = 1.0
    
    //
    // Activate CH platform after melody solved
    //
    function onMelodySolved() {
      if (gameState.phase !== 'melody') return
      gameState.phase = 'wait_ch'
      k.wait(0.3, () => createCHPlatform(k, gameState, sound, levelIndicator, treeRootsInst))
    }
    //
    //
    // Create hero (no anti-hero — completion is driven by CH letter collection)
    //
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      currentLevel: 'lesson-touch.1',
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
    // Show "Life made corrections" dialog for first trap (no score deduction)
    //
    if (showTrap) {
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        extraFlags: [LIFE_DEDUCT_LEAVES_FLAG],
        sceneLock,
        noDeduct: true,
        hideScore: true,
        introTextOverride: 'Life made corrections.',
        resultTextOverride: 'Learn this lesson.',
        sceneBgRgb: { r: L1_SCENE_BG_R, g: L1_SCENE_BG_G, b: L1_SCENE_BG_B },
        textColorRgb: { r: 90, g: 136, b: 152 },
        onComplete: () => {
          gameState._leavesRef && (gameState._leavesRef.poisonChance = POISON_LEAF_CHANCE)
        }
      })
    }
    //
    // "Life made corrections" for second trap (worm + blue leaves)
    //
    if (showTrap2) {
      const trap2Delay = showTrap ? LifeDeduction.TOTAL_DURATION + 0.5 : 0
      k.wait(trap2Delay, () => {
        LifeDeduction.show({
          k,
          currentScore: get('lifeScore', 0),
          levelIndicator,
          sound,
          deductFlag: TRAP2_FLAG,
          extraFlags: [LIFE_DEDUCT_LEAVES_FLAG],
          sceneLock,
          noDeduct: true,
          hideScore: true,
          introTextOverride: 'Life made corrections.',
          resultTextOverride: 'Learn this lesson.',
          sceneBgRgb: { r: L1_SCENE_BG_R, g: L1_SCENE_BG_G, b: L1_SCENE_BG_B },
          textColorRgb: { r: 90, g: 136, b: 152 },
          onComplete: () => {
            gameState._leavesRef && (gameState._leavesRef.poisonChance = POISON_LEAF_CHANCE)
          }
        })
      })
    }
    //
    // Spawn hero
    //
    Hero.spawn(heroInst)
    //
    // Hidden bonus hero (reachable via mushroom trampoline in right corner)
    //
    const bonusHeroInst = BonusHero.create({
      k,
      x: BONUS_PLATFORM_X,
      y: BONUS_PLATFORM_Y,
      width: 90,
      heroInst,
      levelIndicator,
      sfx: sound,
      approachFromAbove: true,
      heroBodyColor,
      storageKey: 'touch.lesson1BonusCollected',
      collisionWidth: 96,
      platformCollisionXOffset: 48,
      platformCollisionYOffset: 10
    })
    gameState._bonusHeroRef = bonusHeroInst
    //
    // Store hero reference in gameState
    //
    gameState._heroRef = heroInst
    //
    // Create tree roots (async - wait for sprites to load)
    //
    const treeRootsInst = await TreeRoots.create({
      k,
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN,
      screenWidth: CFG.visual.screen.width,
      sfx: sound
    })
    if (!sceneActive) return
    gameState._treeRootsRef = treeRootsInst
    //
    // Trampoline mushroom — rendered as canvas sprite matching regular mushrooms style.
    // Positioned so the stem base aligns with FLOOR_Y.
    //
    const trampDataUrl = toCanvas({ width: MUSHROOM_TRAMP_TOTAL_W, height: MUSHROOM_TRAMP_TOTAL_H, pixelRatio: 1 }, (ctx) => {
      drawMushroomShape(ctx, MUSHROOM_TRAMP_TOTAL_W, MUSHROOM_TRAMP_TOTAL_H, MUSHROOM_TRAMP_CAP_W, MUSHROOM_TRAMP_CAP_H, MUSHROOM_TRAMP_STEM_H, MUSHROOM_TRAMP_STEM_W, MUSHROOM_TRAMP_COLOR)
    })
    loadTouchSprite(k, MUSHROOM_TRAMP_SPRITE, trampDataUrl)
    const trampSpriteBaseX = MUSHROOM_TRAMP_X - MUSHROOM_TRAMP_TOTAL_W / 2
    const trampSpritePos = k.vec2(trampSpriteBaseX, MUSHROOM_TRAMP_Y - MUSHROOM_TRAMP_TOTAL_H)
    k.add([
      k.z(6),
      {
        draw() {
          const sq = gameState.mushroomSquash
          if (sq > 0.01) {
            //
            // Squash: scale Y down, offset pos so bottom stays on the floor
            //
            const scaleY = 1 - sq * 0.35
            trampSpritePos.y = MUSHROOM_TRAMP_Y - MUSHROOM_TRAMP_TOTAL_H * scaleY
            k.drawSprite({ sprite: MUSHROOM_TRAMP_SPRITE, pos: trampSpritePos, scale: k.vec2(1, scaleY) })
          } else {
            trampSpritePos.y = MUSHROOM_TRAMP_Y - MUSHROOM_TRAMP_TOTAL_H
            k.drawSprite({ sprite: MUSHROOM_TRAMP_SPRITE, pos: trampSpritePos })
          }
        }
      }
    ])
    //
    // Invisible solid cap platform so the hero stands on top of the mushroom
    // without visually sinking into it.
    //
    k.add([
      k.rect(MUSHROOM_TRAMP_CAP_W, 6),
      k.pos(MUSHROOM_TRAMP_X - MUSHROOM_TRAMP_CAP_W / 2, MUSHROOM_TRAMP_Y - MUSHROOM_TRAMP_TOTAL_H),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ])
    //
    // Add custom drawing for tree roots (above platform z=15, but behind player z=10)
    // Set z=16 so roots draw on top of platform
    //
    k.add([
      k.z(16),
      {
        draw() {
          TreeRoots.draw(treeRootsInst)
        }
      }
    ])
    //
    // White root glow overlay: blinking sprite on top of roots during note play
    //
    k.add([
      k.z(17),
      {
        draw() {
          TreeRoots.drawGlow(treeRootsInst)
        }
      }
    ])
    //
    // Small peristaltic worms crawling along the root level
    //
    const wormInsts = Array.from({ length: WORM_COUNT }, (_, i) => createWorm(k, i))
    //
    // Per-frame worm update (called inside k.onUpdate below)
    //
    const wormUpdateTimer = k.onUpdate(() => wormInsts.forEach(w => onUpdateWorm(k, w)))
    const wormTooltipTargets = wormInsts.map((w, i) => ({
      x: () => w.segments[0].x,
      y: () => w.segments[0].y,
      width: WORM_HOVER_WIDTH,
      height: WORM_HOVER_HEIGHT,
      text: SMALL_WORM_PHRASES[i % SMALL_WORM_PHRASES.length],
      offsetY: WORM_TOOLTIP_OFFSET_Y
    }))
    Tooltip.create({ k, targets: wormTooltipTargets })
    //
    // Giant rising worm — appears near anti-hero platform, triggered by proximity
    //
    const giantWormInst = GiantWorm.create({
      k,
      x: T_LETTER_X - GIANT_WORM_X_OFFSET,
      floorY: FLOOR_Y,
      hero: heroInst,
      sfx: sound
    })
    gameState._giantWormRef = giantWormInst
    //
    // Floating tooltip for giant worm — position is updated each frame via wormTooltipOnUpdate
    //
    const WORM_TOOLTIP_TEXT = "Don't jump over,\ncome closer..."
    const WORM_TOOLTIP_WIDTH = 60
    const WORM_TOOLTIP_HEIGHT = 80
    const wormTooltipTarget = {
      x: giantWormInst.x,
      y: FLOOR_Y - 40,
      width: WORM_TOOLTIP_WIDTH,
      height: WORM_TOOLTIP_HEIGHT,
      text: WORM_TOOLTIP_TEXT,
      offsetY: -90
    }
    Tooltip.create({ k, targets: [wormTooltipTarget] })
    //
    // Second giant worm — only created when trap2 is active.
    // Repositions randomly between note trees after each retract cycle.
    //
    const trap2WormInst = trap2Active ? createTrap2Worm(k, heroInst, sound, FLOOR_Y) : null
    //
    // Tooltip on first tree trunk (note "C")
    //
    const firstRoot = treeRootsInst.roots[0]
    const firstTrunkVisualHeight = firstRoot.trunkBottom.y - firstRoot.trunkTop.y + FIRST_TREE_TOOLTIP_EXTRA_HEIGHT
    const firstTrunkCenterY = firstRoot.trunkBottom.y - firstTrunkVisualHeight / 2
    Tooltip.create({
      k,
      targets: [{
        x: firstRoot.x,
        y: firstTrunkCenterY,
        width: FIRST_TREE_TOOLTIP_HOVER_WIDTH,
        height: firstTrunkVisualHeight,
        text: FIRST_TREE_TOOLTIP_TEXT,
        offsetY: FIRST_TREE_TOOLTIP_Y_OFFSET
      }]
    })
    //
    // Create falling leaves system (leaves detach from TreeRoots trees).
    // 40% of leaves are poisonous (blue) and kill the hero on contact.
    // Leaves are paused until life deduction animation completes.
    //
    const poisonColor = getRGB(k, POISON_LEAF_COLOR_HEX)
    const fallingLeafInst = FallingLeaf.create({
      k,
      treeRoots: treeRootsInst,
      floorY: FLOOR_Y,
      hero: heroInst,
      leftBound: LEFT_MARGIN,
      rightBound: CFG.visual.screen.width - RIGHT_MARGIN,
      poisonChance: leavesActive ? POISON_LEAF_CHANCE : 0,
      poisonColor,
      //
      // Ground leaves must render above the black floor stripe (z = T_LETTER_MASK_Z + 1 = 29)
      //
      groundZ: T_LETTER_MASK_Z + 2,
      onPoisonHit: () => {
        //
        // During the celebration phase (end music) leaves are harmless
        //
        if (gameState?.phase === 'end') return
        onPoisonLeafDeath(k, heroInst, levelIndicator, sound, bonusHeroInst)
      },
      onLeafGroundLand: () => Sound.playLeafGroundRustle(sound, 0.16 + Math.random() * 0.14)
    })
    //
    // Store ref so trap onComplete callbacks can activate poison leaves
    //
    gameState._leavesRef = fallingLeafInst
    //
    // Normal leaves always fall; poison (blue) leaves only after deduction
    //
    fallingLeafInst.paused = false
    //
    // Create bugs (obstacles)
    //
    //
    // Bug 1: Patrol on floor
    //
    Bugs.create({
      k,
      x: LEFT_MARGIN + 350,
      y: FLOOR_Y - 40,
      patrolStart: LEFT_MARGIN + 250,
      patrolEnd: CFG.visual.screen.width - RIGHT_MARGIN - 250,
      speed: 80
    })
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({
      k,
      showTimer: false
    })
    //
    // End music text display (shown while touch1-end.mp3 plays after CH collected)
    //
    const endMusicTextObj = { text: null, outlines: [] }
    k.add([
      k.z(CFG.visual.zIndex.ui + 5),
      {
        draw() {
          if (!gameState.chCollected) return
          const msg = END_MUSIC_TEXT
          const cx = CFG.visual.screen.width / 2
          const cy = END_MUSIC_TEXT_Y
          const outlineOffsets = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]
          outlineOffsets.forEach(([dx, dy]) => {
            k.drawText({ text: msg, pos: k.vec2(cx + dx, cy + dy), size: END_MUSIC_TEXT_FONT, font: CFG.visual.fonts.regularFull, color: k.rgb(0, 0, 0), anchor: 'center', opacity: 0.85 })
          })
          k.drawText({ text: msg, pos: k.vec2(cx, cy), size: END_MUSIC_TEXT_FONT, font: CFG.visual.fonts.regularFull, color: k.rgb(220, 200, 160), anchor: 'center', opacity: 1 })
        }
      }
    ])
    //
    // Create level transition for next level
    //
    const transition = createLevelTransition(k)
    //
    // Fireflies: small glowing dots drifting between tree layers (loop registered below)
    //
    const fireflyRuntime = createFireflies(k, heroInst)
    //
    // Tooltip: hero (tracks hero position dynamically)
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
    // T letter: stands on ground at right side (where anti-hero used to be)
    // Blinks brown to signal it's collectable. Removed when collected.
    //
    const tLetterObjs = createStandingLetter(k, 'T', T_LETTER_X, T_LETTER_Y, T_LETTER_FONT_SIZE, T_LETTER_ANGLE, T_LETTER_FILL_R, T_LETTER_FILL_G, T_LETTER_FILL_B, T_LETTER_Z)
    const tLetterMask = createTLetterMask(k, T_LETTER_X, T_LETTER_Y)
    const tBlinkState = { timer: 0, phase: 0 }
    k.add([
      k.z(T_LETTER_Z + 0.5),
      {
        draw() {
          animateLetterBlink(k, tLetterObjs, tBlinkState, gameState.tCollected)
        }
      }
    ])
    //
    // Tooltip: falling and grounded leaves (separate phrases per state)
    //
    createLeafTooltips(k, fallingLeafInst)
    //
    // Thunder + lightning flash at random intervals
    //
    const lightningState = {
      flashTimer: 0,
      blinkCount: 0,
      blinkTimer: 0
    }
    k.add([
      k.z(0),
      {
        draw() {
          drawLightningFlash(k, lightningState)
        }
      }
    ])
    //
    // Forest ambience: birds, cicadas/crickets and frogs at random intervals
    //
    const birdState = { timer: L1_BIRD_INTERVAL_MIN + Math.random() * (L1_BIRD_INTERVAL_MAX - L1_BIRD_INTERVAL_MIN) }
    const cricketState = { timer: L1_CRICKET_INTERVAL_MIN + Math.random() * (L1_CRICKET_INTERVAL_MAX - L1_CRICKET_INTERVAL_MIN) }
    const frogState = { timer: L1_FROG_INTERVAL_MIN + Math.random() * (L1_FROG_INTERVAL_MAX - L1_FROG_INTERVAL_MIN) }
    //
    // Random distant crow calls from mp3 samples ('crow0' is preloaded at boot).
    //
    const crowMp3State = {
      timer: L1_CROW_MP3_INTERVAL_MIN + Math.random() * (L1_CROW_MP3_INTERVAL_MAX - L1_CROW_MP3_INTERVAL_MIN),
      mouthOpen: false,
      mouthTimer: 0
    }
    //
    // Crow stands directly on the ground — no rock perch, no rock visual.
    // A virtual perch descriptor with radius 0 places the body center at FLOOR_Y - 9*sc.
    //
    const sc = 1.35
    const crowPerch = { worldX: L1_CROW_X, worldY: FLOOR_Y, radius: 0 }
    addCrowOnRock(k, crowPerch, crowMp3State, heroInst, gameState)
    //
    // Crow tooltip — dynamic: shows sequence hint after U is collected
    //
    const crowTooltipState = { inst: null }
    Tooltip.create({
      k,
      targets: [{
        x: crowPerch.worldX,
        y: crowPerch.worldY - 9 * sc,
        width: L1_CROW_TOOLTIP_HOVER_W,
        height: L1_CROW_TOOLTIP_HOVER_H,
        text: () => gameState.phase === 'end' ? L1_CROW_DISCO_TEXT : gameState.phase === 'melody' ? L1_CROW_SEQUENCE_HINT : L1_CROW_LOSER_TEXT,
        offsetY: L1_CROW_TOOLTIP_OFFSET_Y
      }]
    })
    const playLeft = LEFT_MARGIN
    const playRight = CFG.visual.screen.width - RIGHT_MARGIN
    const treeRootsCenterX = noteTreeXs.reduce((a, b) => a + b, 0) / noteTreeXs.length
    //
    // When trap2 is active, reposition the worm to a new gap between note trees
    // after each retract cycle (delayed by TRAP2_WORM_REPOSITION_DELAY seconds).
    //
    const trap2RepositionRuntime = trap2WormInst ? createTrap2WormReposition(k, trap2WormInst, heroInst) : null
    k.onUpdate(() => {
      onUpdateLesson1GameLoop(k, {
        heroInst,
        defaultHeroX: HERO_SPAWN_X,
        playLeft,
        playRight,
        zoneCount: L1_ZONE_COUNT,
        fpsCounter,
        treeRootsInst,
        treeRootsCenterX,
        treeRootUpdateMaxDist: L1_TREE_ROOT_UPDATE_MAX_DIST,
        treeCollisionMaxDist: L1_TREE_COLLISION_MAX_DIST,
        fallingLeafInst,
        giantWormInst,
        trap2WormInst,
        levelIndicator,
        gameState,
        sound,
        lightningState,
        sequencePauseMinimum: SEQUENCE_PAUSE_MINIMUM,
        onMelodySolved,
        processTreeTouch: (touchedIdx) => processL1TreeTouch(k, gameState, touchedIdx, sound, levelIndicator, treeRootsInst, transition),
        checkGiantWormCollision: (k, heroInst, wormInst, levelIndicator, sound) => checkGiantWormCollision(k, heroInst, wormInst, levelIndicator, sound, bonusHeroInst),
        wormTooltipOnUpdate: () => {
          wormTooltipTarget.y = FLOOR_Y - giantWormInst.riseAmount / 2
          wormTooltipTarget.x = giantWormInst.x + (giantWormInst.leanOffset || 0)
          wormTooltipTarget.height = Math.max(10, giantWormInst.riseAmount)
        },
        fireflyOnUpdate: (kk, activeZone) => fireflyRuntime.onUpdate(kk, activeZone),
        rainOnUpdate: null,
        ambientOnUpdate: (kk) => {
          onUpdateLightning(kk, lightningState)
          onUpdateBirdAmbient(kk, birdState, sound)
          onUpdateCricketAmbient(kk, cricketState, sound)
          onUpdateFrogAmbient(kk, frogState)
          onUpdateCrowMp3Ambient(kk, crowMp3State)
        },
        birdsOnUpdate: () => onUpdateL1Birds(k, birds, SKY_HEIGHT, TOP_MARGIN, BIRD_FLAP_GLIDE_BLEND_TIME, BIRD_GLIDE_POSE)
      })
      trap2RepositionRuntime?.onUpdate?.()
      //
      // Per-frame letter collection checks (hero proximity to letter platforms)
      //
      if (heroInst.character?.pos) {
        const heroX = heroInst.character.pos.x
        const heroY = heroInst.character.pos.y
        //
        // T letter
        //
        if (!gameState.tCollected) {
          //
          // Check using circular radius vs center of visible letter portion
          // (top half center: T_LETTER_Y - T_LETTER_FONT_SIZE * 0.5)
          //
          const tCenterY = T_LETTER_Y - T_LETTER_FONT_SIZE / 2
          const dx = heroX - T_LETTER_X
          const dy = heroY - tCenterY
          if (dx * dx + dy * dy < T_LETTER_COLLECT_RADIUS * T_LETTER_COLLECT_RADIUS) {
            onTLetterCollect(k, gameState, tLetterObjs, tLetterMask, sound, levelIndicator, treeRootsInst, crowTooltipState)
          }
        }
        //
        // O letter (on platform)
        //
        if (gameState.phase === 'wait_o' && gameState.oPlatformObj?.exists?.() && !gameState.oCollected) {
          if (Math.abs(heroX - O_PLATFORM_X) < LOG_PLATFORM_W / 2 + 20 && heroY < O_PLATFORM_Y + 8 && heroY > O_PLATFORM_Y - 90) {
            gameState.oLetterObjs?.forEach(o => o?.exists?.() && k.destroy(o))
            onOLetterCollect(k, gameState, sound, levelIndicator, treeRootsInst)
          }
        }
        //
        // U letter (on platform)
        //
        if (gameState.phase === 'wait_u' && gameState.uPlatformObj?.exists?.() && !gameState.uCollected) {
          if (Math.abs(heroX - U_PLATFORM_X) < U_PLATFORM_W / 2 + 20 && heroY < U_PLATFORM_Y + 8 && heroY > U_PLATFORM_Y - 90) {
            gameState.uLetterObjs?.forEach(o => o?.exists?.() && k.destroy(o))
            onULetterCollect(k, gameState, sound, levelIndicator, treeRootsInst)
          }
        }
        //
        // CH letter (on platform)
        //
        if (gameState.phase === 'wait_ch' && gameState.chPlatformObj?.exists?.() && !gameState.chCollected) {
          if (Math.abs(heroX - CH_PLATFORM_X) < CH_PLATFORM_W / 2 + 20 && heroY < CH_PLATFORM_Y + 8 && heroY > CH_PLATFORM_Y - 90) {
            gameState.chLetterObjs?.forEach(o => o?.exists?.() && k.destroy(o))
            onCHLetterCollect(k, gameState, sound, levelIndicator, transition)
          }
        }
      }
      //
      // Mushroom trampoline: proximity-based bounce check (same pattern as glow bugs).
      // Cap top is at FLOOR_Y - MUSHROOM_TRAMP_TOTAL_H. Hero center is ~20px above feet.
      //
      gameState.mushroomCooldown > 0 && (gameState.mushroomCooldown -= k.dt())
      gameState.mushroomSquash > 0 && (gameState.mushroomSquash = Math.max(0, gameState.mushroomSquash - k.dt() * 4))
      if (gameState.mushroomCooldown <= 0 && heroInst.character?.pos) {
        const mDx = Math.abs(heroInst.character.pos.x - MUSHROOM_TRAMP_X)
        const mDy = heroInst.character.pos.y - MUSHROOM_TRAMP_Y
        const capTopDy = -(MUSHROOM_TRAMP_TOTAL_H + 18)
        if (mDx < MUSHROOM_TRAMP_RADIUS && mDy < capTopDy + 22 && mDy > capTopDy - 20 && heroInst.character.vel?.y >= 0) {
          heroInst.character.vel.y = -MUSHROOM_TRAMP_FORCE
          gameState.mushroomCooldown = MUSHROOM_TRAMP_COOLDOWN
          gameState.mushroomSquash = MUSHROOM_SQUASH_MAX
          sound && Sound.playJumpSound(sound)
        }
      }
      //
      // Counter follows hero every frame (phase1 / phase2 tree count display)
      //
      if ((gameState.phase === 'phase1' || gameState.phase === 'phase2') && gameState.counterObj?.exists?.() && heroInst.character?.pos) {
        const hx = heroInst.character.pos.x
        const hy = heroInst.character.pos.y
        const cx = hx + TOUCH_COUNTER_X_OFFSET
        const cy = hy + TOUCH_COUNTER_Y_OFFSET
        gameState.counterObj.pos.x = cx
        gameState.counterObj.pos.y = cy
        const offs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
        gameState.counterOutlines?.forEach((n, i) => {
          if (!n?.exists?.()) return
          n.pos.x = cx + offs[i][0]
          n.pos.y = cy + offs[i][1]
        })
      }
      //
      // Melody note counter: show x/5 near hero while melody phase is active
      //
      if (gameState.phase === 'melody' && heroInst.character?.pos) {
        updateMelodyCounter(k, gameState, heroInst.character.pos.x, heroInst.character.pos.y)
      } else if (gameState.phase !== 'melody' && gameState.melodyCounterObj?.exists?.()) {
        destroyMelodyCounter(k, gameState)
      }
    })
    //
    // Small mushrooms scattered along the ground (some carry joke hovers)
    //
    const l1Mushrooms = createL1Mushrooms(k, gameState)
    const mushroomTipTargets = l1Mushrooms
      .filter(m => m.tooltipText)
      .map(m => ({
        x: m.x + m.width * 0.5,
        y: m.y + m.height * 0.45,
        width: Math.max(34, m.width + 6),
        height: Math.max(28, m.height + 4),
        text: m.tooltipText,
        offsetY: -32
      }))
    mushroomTipTargets.length && Tooltip.create({ k, targets: mushroomTipTargets })
    const spiderL1Inst = createHangingSpider({
      k,
      heroInst,
      treeRootsInst,
      noteTreeIndices: [...new Set(gameState.targetSequence)],
      floorY: FLOOR_Y
    })
    Tooltip.create({
      k,
      targets: [spiderHoverTooltipTarget(spiderL1Inst, () => gameState.phase === 'end' ? 'Yuhuuu, discooo!!!' : L1_SPIDER_TOOLTIP_TEXT)]
    })
    //
    // ESC key to return to menu — also stops end music if playing
    //
    k.onKeyPress("escape", () => {
      if (LevelHelp.isAnyPanelOpen()) return
      gameState._endMusicRef?.stop?.()
      goToMenuAfterAssets(k)
    })
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
 * Handles hero death from touching a poison (blue) leaf.
 * Increments life score, flashes life icon, then reloads the level.
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} levelIndicator - Level indicator with lifeImage
 */
function onPoisonLeafDeath(k, heroInst, levelIndicator, sound, bonusHeroInst) {
  if (heroInst.isDying) return
  //
  // Capture hero position before the character object is destroyed by Hero.death()
  //
  const deathX = heroInst.character.pos.x
  const deathY = heroInst.character.pos.y
  //
  // Spawn leaf burst immediately — same frame the hero disappears (no delay).
  // suppressParticles skips the default body/eye particle animation.
  //
  spawnLeafDeathBurst(k, deathX, deathY)
  Hero.death(heroInst, () => {
    //
    // Revert any bonus fragments collected this session — they carry over
    // only when the hero completes the level, not on death.
    //
    BonusHero.revertCollection(bonusHeroInst)
    const currentScore = get('lifeScore', 0)
    const newScore = currentScore + 1
    set('lifeScore', newScore)
    levelIndicator?.updateLifeScore?.(newScore)
    if (levelIndicator?.lifeImage?.sprite?.exists?.()) {
      Sound.playGentleLifeSound(sound)
      const originalColor = levelIndicator.lifeImage.sprite.color
      flashLifeImageOnDeath(k, levelIndicator, originalColor, 0)
      createLifeParticlesOnDeath(k, levelIndicator)
    }
    startDeathCountdown(k, 'lesson-touch.1', deathX, deathY)
  }, { suppressParticles: true })
}
//
// Flashes life image red/white on poison death
//
function flashLifeImageOnDeath(k, levelIndicator, originalColor, count) {
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
  k.wait(LIFE_FLASH_INTERVAL, () => flashLifeImageOnDeath(k, levelIndicator, originalColor, count + 1))
}
//
// Red square particles radiating from life icon on death
//
function createLifeParticlesOnDeath(k, levelIndicator) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  const lifeX = levelIndicator.lifeImage.sprite.pos.x
  const lifeY = levelIndicator.lifeImage.sprite.pos.y
  for (let i = 0; i < LIFE_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LIFE_PARTICLE_COUNT
    const speed = LIFE_PARTICLE_SPEED_MIN + Math.random() * LIFE_PARTICLE_SPEED_EXTRA
    const lifetime = LIFE_PARTICLE_LIFETIME_MIN + Math.random() * LIFE_PARTICLE_LIFETIME_EXTRA
    const size = LIFE_PARTICLE_SIZE_MIN + Math.random() * LIFE_PARTICLE_SIZE_EXTRA
    const pData = {
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      lifetime,
      elapsed: 0
    }
    const particle = k.add([
      k.rect(size, size),
      k.pos(lifeX, lifeY),
      k.color(255, 0, 0),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
      k.anchor('center'),
      k.fixed()
    ])
    particle.onUpdate(() => onUpdateDeathParticle(k, particle, pData))
  }
}
//
// Updates a death particle (movement + fade + destroy)
//
function onUpdateDeathParticle(k, particle, pData) {
  pData.elapsed += k.dt()
  particle.pos.x += pData.vx * k.dt()
  particle.pos.y += pData.vy * k.dt()
  particle.opacity = 1 - pData.elapsed / pData.lifetime
  if (pData.elapsed >= pData.lifetime) {
    k.destroy(particle)
  }
}

/**
 * Creates rounded corners at all four corners of the game area
 * @param {Object} k - Kaplay instance
 */
function createRoundedCorners(k) {
  const cornerDataURL = createRoundedCornerSprite(CORNER_RADIUS, WALL_COLOR_HEX)
  loadTouchSprite(k, CORNER_SPRITE_NAME, cornerDataURL)
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
  // Bottom corners must render ABOVE the floor stripe (z = T_LETTER_MASK_Z + 1 = 29)
  // so the wall-color arcs visually clip the stripe at the rounded ends.
  //
  const BOTTOM_CORNER_Z = 30
  //
  // Bottom-left corner (rotate 270°) — at FLOOR_Y (raised platform)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(LEFT_MARGIN, FLOOR_Y),
    k.rotate(270),
    k.z(BOTTOM_CORNER_Z)
  ])
  //
  // Bottom-right corner (rotate 180°) — at FLOOR_Y (raised platform)
  //
  k.add([
    k.sprite(CORNER_SPRITE_NAME),
    k.pos(CFG.visual.screen.width - RIGHT_MARGIN, FLOOR_Y),
    k.rotate(180),
    k.z(BOTTOM_CORNER_Z)
  ])
}

/**
 * Generates cloud configuration data for the scrolling cloud system.
 * Cloud X positions are relative to a band (0 to bandWidth) so two copies
 * can tile seamlessly during scrolling.
 * @returns {Object} Cloud config with bandWidth and cloud array
 */
function createScrollingCloudConfigs() {
  const areaLeft = LEFT_MARGIN
  const areaRight = CFG.visual.screen.width - RIGHT_MARGIN
  const bandWidth = areaRight - areaLeft
  const cloudSpacing = bandWidth / CLOUD_COUNT
  //
  // Cloud base colour matches the muted teal used by L0's distance fog
  // circles so both levels share one cool-side cloud band instead of
  // L1's previous neutral grey clouds floating on top of the teal sky.
  //
  const baseCloudColor = { r: 32, g: 60, b: 68 }
  const configs = []
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
    configs.push({
          x: cloudX,
      y: cloudY,
      crownSize,
      crowns,
          color: baseCloudColor,
      opacity: 0.85 + Math.random() * 0.1
    })
  }
  return { bandWidth, areaLeft, areaRight, configs }
}

/**
 * Creates the scrolling cloud draw object.
 * Bakes all clouds onto an offscreen canvas sprite once (one copy = bandWidth wide).
 * At runtime only 2 drawSprite calls replace the previous ~250 drawCircle/frame.
 * @param {Object} k - Kaplay instance
 * @param {Object} cloudData - Output of createScrollingCloudConfigs
 */
function createScrollingClouds(k, cloudData) {
  const { bandWidth, areaLeft, areaRight, configs } = cloudData
  //
  // Determine sprite canvas dimensions: full band width × enough vertical headroom
  //
  //
  // Account for sizeVariation (up to 1.2) and offsetX/offsetY spread when sizing the canvas.
  // Without this, large crowns near the edges get clipped.
  //
  const MAX_SIZE_VARIATION = 1.2
  const maxActualRadius = configs.reduce((m, c) => Math.max(m, c.crownSize * MAX_SIZE_VARIATION), 0)
  const maxOffsetSpread = configs.reduce((m, c) => {
    const maxOff = c.crowns.reduce((mo, cr) => Math.max(mo, Math.abs(cr.offsetX), Math.abs(cr.offsetY)), 0)
    return Math.max(m, maxOff)
  }, 0)
  //
  // Total vertical padding: largest crown radius + largest offset contribution
  //
  const verticalPad = Math.ceil(maxActualRadius + maxOffsetSpread + 8)
  const stripTop = CLOUD_TOP_Y - verticalPad
  const stripBottom = CLOUD_BOTTOM_Y + verticalPad
  const stripH = Math.ceil(stripBottom - stripTop)
  //
  // Horizontal padding for edge clouds that extend beyond the band boundaries
  //
  const horizPad = Math.ceil(maxActualRadius + maxOffsetSpread + 8)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(bandWidth) + horizPad * 2
  canvas.height = stripH
  const ctx = canvas.getContext('2d')
  //
  // Render all clouds once into the offscreen canvas (shifted right by horizPad)
  //
  for (const cloud of configs) {
    const r = cloud.color.r
    const g = cloud.color.g
    const b = cloud.color.b
    for (const crown of cloud.crowns) {
      const cx = cloud.x + crown.offsetX + horizPad
      const cy = cloud.y + crown.offsetY - stripTop
      const radius = cloud.crownSize * crown.sizeVariation
      const alpha = cloud.opacity * crown.opacityVariation
      ctx.beginPath()
      ctx.arc(cx, cy, radius, 0, Math.PI * 2)
      ctx.fillStyle = `rgba(${r},${g},${b},${alpha})`
      ctx.fill()
    }
  }
  const spriteName = 'l1-clouds-strip'
  loadTouchSprite(k, spriteName, canvas.toDataURL())
  //
  // Reusable draw positions for the two seamless copies.
  // Shift left by horizPad so the extra canvas padding is invisible.
  //
  const posA = k.vec2(0, 0)
  const posB = k.vec2(0, 0)
  const inst = { scrollX: 0 }
  k.add([
    k.z(1),
    {
      draw() {
        inst.scrollX = (inst.scrollX + CLOUD_SCROLL_SPEED * k.dt()) % bandWidth
        posA.x = areaLeft + inst.scrollX - horizPad
        posA.y = stripTop
        posB.x = areaLeft + inst.scrollX - bandWidth - horizPad
        posB.y = stripTop
        k.drawSprite({ sprite: spriteName, pos: posA, anchor: 'topleft' })
        k.drawSprite({ sprite: spriteName, pos: posB, anchor: 'topleft' })
      }
    }
  ])
}

/**
 * Creates dynamic tooltips for leaves. Falling leaves get "scream" phrases,
 * grounded leaves get funny "resting" phrases. Phrases are assigned via
 * WeakMaps so each leaf keeps its phrase stable across frames.
 * @param {Object} k - Kaplay instance
 * @param {Object} fallingLeafInst - FallingLeaf instance with fallingLeaves/groundLeaves
 */
function createLeafTooltips(k, fallingLeafInst) {
  //
  // Separate phrase maps: falling vs grounded so phrase changes on landing.
  // Poison leaves always use the poison pool regardless of state.
  //
  const fallingPhraseMap = new WeakMap()
  const groundPhraseMap = new WeakMap()
  const getPhrase = (leaf, isFalling) => {
    if (leaf.poisonous) {
      if (!fallingPhraseMap.has(leaf)) {
        fallingPhraseMap.set(leaf, LEAF_POISON_PHRASES[Math.floor(Math.random() * LEAF_POISON_PHRASES.length)])
      }
      return fallingPhraseMap.get(leaf)
    }
    const map = isFalling ? fallingPhraseMap : groundPhraseMap
    const pool = isFalling ? LEAF_FALLING_PHRASES : LEAF_GROUND_PHRASES
    if (!map.has(leaf)) {
      map.set(leaf, pool[Math.floor(Math.random() * pool.length)])
    }
    return map.get(leaf)
  }
  //
  // Pre-allocate tooltip target slots refreshed each frame via onUpdate.
  // Capped at 40 to cover active leaves on screen without hit-testing empty stubs.
  //
  const tooltipTargets = []
  const MAX_TRACKED_LEAVES = 40
  for (let i = 0; i < MAX_TRACKED_LEAVES; i++) {
    tooltipTargets.push({
      x: -9999,
      y: -9999,
      width: LEAF_TOOLTIP_HOVER_SIZE,
      height: LEAF_TOOLTIP_HOVER_SIZE,
      text: "",
      offsetY: LEAF_TOOLTIP_Y_OFFSET
    })
  }
  Tooltip.create({ k, targets: tooltipTargets })
  //
  // Sync tooltip positions/texts with actual leaf positions each frame
  //
  k.onUpdate(() => onUpdateLeafTooltips(fallingLeafInst, tooltipTargets, getPhrase))
}
//
// Updates leaf tooltip target positions. Poison leaves get warning phrases,
// falling leaves get scream phrases, grounded leaves get resting phrases.
//
function onUpdateLeafTooltips(fallingLeafInst, targets, getPhrase) {
  const falling = fallingLeafInst.fallingLeaves
  const ground = fallingLeafInst.groundLeaves
  let idx = 0
  //
  // Falling leaves first
  //
  for (let i = 0; i < falling.length && idx < targets.length; i++, idx++) {
    targets[idx].x = falling[i].x
    targets[idx].y = falling[i].y
    targets[idx].text = getPhrase(falling[i], true)
  }
  //
  // Grounded leaves next
  //
  for (let i = 0; i < ground.length && idx < targets.length; i++, idx++) {
    targets[idx].x = ground[i].x
    targets[idx].y = ground[i].y
    targets[idx].text = getPhrase(ground[i], false)
  }
  //
  // Hide remaining unused slots
  //
  for (; idx < targets.length; idx++) {
    targets[idx].x = -9999
    targets[idx].y = -9999
  }
}
//
// Placeholder — melody logic now lives in lesson1-runtime.js processMelodySequence
//
/**
 * Creates a small worm that crawls along the root level with peristaltic locomotion.
 * The head steers sinusoidally; body segments follow with distance constraints.
 * @param {Object} k - Kaplay instance
 * @param {number} index - Worm index for varied starting position and direction
 * @returns {Object} Worm instance
 */
function createWorm(k, index) {
  const leftBound = LEFT_MARGIN + 40
  const rightBound = CFG.visual.screen.width - RIGHT_MARGIN - 40
  const range = rightBound - leftBound
  const zoneWidth = range / WORM_COUNT
  const startX = leftBound + zoneWidth * index + Math.random() * zoneWidth
  const yZoneCenter = WORM_BASE_Y + index * WORM_Y_ZONE_HEIGHT
  const startAngle = (index % 2 === 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.5
  const segments = []
  for (let i = 0; i < WORM_SEGMENT_COUNT; i++) {
    segments.push({
      x: startX - i * WORM_REST_SPACING * Math.cos(startAngle),
      y: yZoneCenter - i * WORM_REST_SPACING * Math.sin(startAngle)
    })
  }
  const trailRgb = parseHex(WORM_TRAIL_COLOR)
  const bodyRgb = parseHex(WORM_BODY_COLOR)
  const headRgb = parseHex(WORM_HEAD_COLOR)
  const ventralRgb = parseHex(WORM_VENTRAL_HIGHLIGHT)
  const inst = {
    segments,
    heading: startAngle,
    wavePhase: Math.random() * Math.PI * 2,
    steerPhase: Math.random() * Math.PI * 2,
    directionTimer: WORM_DIRECTION_CHANGE_MIN + Math.random() * WORM_DIRECTION_CHANGE_RANGE,
    trail: Array.from({ length: WORM_TRAIL_MAX_POINTS }, () => ({ x: 0, y: 0, opacity: 0 })),
    trailHead: 0,
    leftBound,
    rightBound,
    yMin: WORM_BASE_Y + index * WORM_Y_ZONE_HEIGHT - 3,
    yMax: WORM_BASE_Y + (index + 1) * WORM_Y_ZONE_HEIGHT,
    sleeping: false,
    drawColors: {
      trail: k.rgb(trailRgb[0], trailRgb[1], trailRgb[2]),
      body: k.rgb(bodyRgb[0], bodyRgb[1], bodyRgb[2]),
      head: k.rgb(headRgb[0], headRgb[1], headRgb[2]),
      ventral: k.rgb(ventralRgb[0], ventralRgb[1], ventralRgb[2]),
      ring: k.rgb(26, 18, 14),
      outline: k.rgb(12, 10, 8),
      eye: k.rgb(220, 220, 210),
      pupil: k.rgb(20, 20, 20)
    },
    drawVecs: {
      trail: k.vec2(0, 0),
      segP1: k.vec2(0, 0),
      segP2: k.vec2(0, 0),
      ring: k.vec2(0, 0),
      head: k.vec2(0, 0),
      eye: k.vec2(0, 0),
      pupil: k.vec2(0, 0)
    }
  }
  k.add([
    k.z(WORM_DRAW_Z),
    { draw() { onDrawWorm(k, inst) } }
  ])
  return inst
}
//
// Per-frame peristaltic locomotion: steers head, drags body segments.
//
function onUpdateWorm(k, inst) {
  if (inst.sleeping) return
  const dt = k.dt()
  inst.wavePhase += WORM_WAVE_SPEED * dt
  inst.steerPhase += WORM_STEER_SPEED * dt
  inst.directionTimer -= dt
  //
  // Flip heading at random intervals or when hitting bounds
  //
  if (inst.directionTimer <= 0) {
    inst.heading += Math.PI + (Math.random() - 0.5) * 0.8
    inst.directionTimer = WORM_DIRECTION_CHANGE_MIN + Math.random() * WORM_DIRECTION_CHANGE_RANGE
  }
  const steerOffset = Math.sin(inst.steerPhase) * WORM_STEER_AMPLITUDE
  const actualHeading = inst.heading + steerOffset
  const head = inst.segments[0]
  head.x += Math.cos(actualHeading) * WORM_HEAD_SPEED * dt
  head.y += Math.sin(actualHeading) * WORM_HEAD_SPEED * dt
  //
  // Bounce off horizontal bounds
  //
  if (head.x < inst.leftBound) { head.x = inst.leftBound; inst.heading = Math.abs(inst.heading % (Math.PI * 2)) * (inst.heading < 0 ? -1 : 1); inst.heading = 0 }
  if (head.x > inst.rightBound) { head.x = inst.rightBound; inst.heading = Math.PI }
  //
  // Clamp Y to zone
  //
  head.y = Math.max(inst.yMin, Math.min(inst.yMax, head.y))
  //
  // Body segments follow head with distance constraints
  //
  for (let i = 1; i < inst.segments.length; i++) {
    const prev = inst.segments[i - 1]
    const seg = inst.segments[i]
    const dx = seg.x - prev.x
    const dy = seg.y - prev.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    const target = WORM_REST_SPACING
    if (dist > target * WORM_MAX_STRETCH) {
      const ratio = (dist - target) / dist
      seg.x -= dx * ratio * WORM_FOLLOW_SPEED * dt
      seg.y -= dy * ratio * WORM_FOLLOW_SPEED * dt
    }
    seg.y = Math.max(inst.yMin, Math.min(inst.yMax, seg.y))
  }
  //
  // Update trail ring buffer — store head position with full opacity
  //
  const t = inst.trail[inst.trailHead]
  t.x = head.x
  t.y = head.y
  t.opacity = 0.45
  inst.trailHead = (inst.trailHead + 1) % WORM_TRAIL_MAX_POINTS
  for (let i = 0; i < WORM_TRAIL_MAX_POINTS; i++) {
    if (inst.trail[i].opacity > 0) inst.trail[i].opacity -= WORM_TRAIL_FADE_SPEED
  }
}
//
// Draws the worm: faint trail, body segments with peristaltic bulge, eyes.
//
function onDrawWorm(k, inst) {
  const { segments, drawColors, drawVecs, wavePhase } = inst
  //
  // Trail rendered every other frame to halve circle draw calls
  //
  inst._trailFrame = (inst._trailFrame ?? 0) + 1
  if (inst._trailFrame % 2 === 0) {
    for (let i = 0; i < WORM_TRAIL_MAX_POINTS; i++) {
      const tp = inst.trail[i]
      if (tp.opacity <= 0) continue
      drawVecs.trail.x = tp.x
      drawVecs.trail.y = tp.y
      k.drawCircle({ pos: drawVecs.trail, radius: 1.2, color: drawColors.trail, opacity: tp.opacity })
    }
  }
  //
  // Body segments — radius varies with peristaltic wave
  //
  for (let i = segments.length - 1; i >= 0; i--) {
    const seg = segments[i]
    //
    // Peristaltic bulge: wave travels tail-to-head
    //
    const waveOffset = (i / segments.length) * Math.PI * 2
    const bulge = WORM_CONTRACT_MIN + (WORM_CONTRACT_MAX - WORM_CONTRACT_MIN) * (0.5 + 0.5 * Math.sin(wavePhase - waveOffset))
    const r = WORM_SEGMENT_RADIUS * (i === 0 ? 1.6 : bulge)
    const isHead = i === 0
    drawVecs.segP1.x = seg.x
    drawVecs.segP1.y = seg.y
    //
    // Outline + fill — ventral highlight and segment rings removed for performance
    //
    k.drawCircle({ pos: drawVecs.segP1, radius: r + 0.8, color: drawColors.outline, opacity: 0.9 })
    k.drawCircle({ pos: drawVecs.segP1, radius: r, color: isHead ? drawColors.head : drawColors.body, opacity: 1 })
  }
  //
  // Eyes on the head segment
  //
  drawWormEyes(k, inst, segments[0])
}
//
// Draws two small eyes on the worm head, oriented along the heading direction.
//
function drawWormEyes(k, inst, head) {
  const { drawColors, drawVecs, heading } = inst
  const perp = heading + Math.PI / 2
  const eyeDist = WORM_EYE_SPACING
  for (let side = -1; side <= 1; side += 2) {
    const ex = head.x + Math.cos(perp) * eyeDist * side + Math.cos(heading) * 2
    const ey = head.y + Math.sin(perp) * eyeDist * side + Math.sin(heading) * 2
    drawVecs.eye.x = ex
    drawVecs.eye.y = ey
    k.drawCircle({ pos: drawVecs.eye, radius: WORM_EYE_RADIUS, color: drawColors.eye, opacity: 1 })
    drawVecs.pupil.x = ex + Math.cos(heading) * 0.5
    drawVecs.pupil.y = ey + Math.sin(heading) * 0.5
    k.drawCircle({ pos: drawVecs.pupil, radius: WORM_PUPIL_RADIUS, color: drawColors.pupil, opacity: 1 })
  }
}
//
// Checks if hero overlaps the giant worm body and triggers death + smile.
//
function checkGiantWormCollision(k, heroInst, wormInst, levelIndicator, sound, bonusHeroInst) {
  //
  // Worm in disco-dance mode does not hurt the hero
  //
  if (wormInst.phase === 'dancing') return
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y
  if (GiantWorm.checkCollision(wormInst, heroX, heroY)) {
    GiantWorm.startSmiling(wormInst)
    onPoisonLeafDeath(k, heroInst, levelIndicator, sound, bonusHeroInst)
  }
}
//
// Fireflies that drift between tree layers at different z-depths
//
function createFireflies(k, heroInst) {
  const playableW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  //
  // Spawn band is capped to the foliage zone — bounded above by the
  // foreground tree canopy and below by a small ground clearance — so
  // fireflies never appear floating above the painted yellow leaves.
  //
  const fireflyMinY = FLOOR_Y - FIREFLY_MIN_Y_OFFSET_FROM_FLOOR
  const fireflyMaxY = FLOOR_Y - 20
  const fireflyColor = k.rgb(FIREFLY_COLOR_R, FIREFLY_COLOR_G, FIREFLY_COLOR_B)
  const fireflies = []
  //
  // Pre-group fireflies by layer: eliminates per-layer scan of all fireflies in drawFireflyLayer.
  // Each draw call only iterates its own subset (~4–5 fireflies) instead of all 18.
  //
  const fireflyLayers = FIREFLY_LAYERS_Z.map(() => [])
  for (let i = 0; i < FIREFLY_COUNT; i++) {
    const x = LEFT_MARGIN + Math.random() * playableW
    const y = fireflyMinY + Math.random() * (fireflyMaxY - fireflyMinY)
    const li = i % FIREFLY_LAYERS_Z.length
    const f = {
      x,
      y,
      baseX: x,
      baseY: y,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      pushVx: 0,
      pushVy: 0,
      radius: FIREFLY_RADIUS_MIN + Math.random() * (FIREFLY_RADIUS_MAX - FIREFLY_RADIUS_MIN),
      glowSpeed: FIREFLY_GLOW_SPEED_MIN + Math.random() * (FIREFLY_GLOW_SPEED_MAX - FIREFLY_GLOW_SPEED_MIN),
      phase: Math.random() * Math.PI * 2,
      speed: FIREFLY_MIN_SPEED + Math.random() * (FIREFLY_MAX_SPEED - FIREFLY_MIN_SPEED),
      layerIndex: li,
      //
      // Pre-baked draw objects to avoid per-frame allocations
      //
      pos: k.vec2(x, y),
      color: fireflyColor
    }
    fireflies.push(f)
    fireflyLayers[li].push(f)
  }
  //
  // One draw object per z-layer — passes pre-grouped layer array so no filtering is needed
  //
  FIREFLY_LAYERS_Z.forEach((zVal, li) => {
    const layerFireflies = fireflyLayers[li]
    k.add([
      k.z(zVal),
      {
        draw() {
          drawFireflyLayer(k, layerFireflies)
        }
      }
    ])
  })
  let lastHeroX = heroInst.character?.pos?.x ?? 0
  let lastHeroY = heroInst.character?.pos?.y ?? 0
  const playRight = CFG.visual.screen.width - RIGHT_MARGIN
  const zoneForX = (x) => getActiveZoneIndex(x, LEFT_MARGIN, playRight, L1_ZONE_COUNT)
  const onUpdate = (k, activeZone) => {
    const isAwake = (x) => isZoneAwake(zoneForX(x), activeZone, L1_ZONE_COUNT)
    onUpdateFireflies(k, fireflies, isAwake)
    if (!heroInst.character?.pos) return
    const heroX = heroInst.character.pos.x
    const heroY = heroInst.character.pos.y
    const heroVx = heroX - lastHeroX
    const heroVy = heroY - lastHeroY
    lastHeroX = heroX
    lastHeroY = heroY
    const heroSpeed = Math.abs(heroVx) + Math.abs(heroVy)
    if (heroSpeed < 0.5) return
    const dt = k.dt()
    const pushRadiusSq = FIREFLY_PUSH_DISTANCE * FIREFLY_PUSH_DISTANCE
    for (const f of fireflies) {
      if (!isAwake(f.x)) continue
      const dx = f.x - heroX
      const dy = f.y - heroY
      const distSq = dx * dx + dy * dy
      if (distSq >= pushRadiusSq || distSq < 1) continue
      const dist = Math.sqrt(distSq)
      const force = (1 - dist / FIREFLY_PUSH_DISTANCE) * FIREFLY_PUSH_STRENGTH * dt
      f.pushVx += (dx / dist) * force + heroVx * force * 0.3
      f.pushVy += (dy / dist) * force + heroVy * force * 0.3
    }
  }
  return { fireflies, onUpdate }
}
//
// Per-frame drift: gentle sine-wave wander within bounds
//
function onUpdateFireflies(k, fireflies, isAwake = null) {
  const dt = k.dt()
  const t = k.time()
  const minX = LEFT_MARGIN + 10
  const maxX = CFG.visual.screen.width - RIGHT_MARGIN - 10
  //
  // Per-frame Y clamp uses the same canopy ceiling as spawn, so a
  // firefly pushed by the hero can't briefly drift up above the
  // foreground trees before settling back into the foliage band.
  //
  const minY = FLOOR_Y - FIREFLY_MIN_Y_OFFSET_FROM_FLOOR
  const maxY = FLOOR_Y - 20
  for (const f of fireflies) {
    if (isAwake && !isAwake(f.x)) continue
    f.x += Math.sin(t * f.glowSpeed + f.phase) * f.speed * dt + f.pushVx
    f.y += Math.cos(t * f.glowSpeed * 0.7 + f.phase) * f.speed * 0.6 * dt + f.pushVy
    //
    // Decay push velocity over time
    //
    f.pushVx *= 0.96
    f.pushVy *= 0.96
    if (f.x < minX) f.x = minX
    if (f.x > maxX) f.x = maxX
    if (f.y < minY) f.y = minY
    if (f.y > maxY) f.y = maxY
  }
}
//
// Draw fireflies from a pre-grouped layer array (no layerIndex filtering needed).
//
function drawFireflyLayer(k, fireflies) {
  const t = k.time()
  for (const f of fireflies) {
    const glow = (Math.sin(t * f.glowSpeed + f.phase) + 1) / 2
    const alpha = 0.15 + glow * 0.7
    f.pos.x = f.x
    f.pos.y = f.y
    //
    // Single bright core — glow halo removed for performance
    //
    k.drawCircle({
      pos: f.pos,
      radius: f.radius,
      color: f.color,
      opacity: alpha
    })
  }
}
//
// Update lightning flash decay (thunder only on wrong melody notes)
//
function onUpdateLightning(k, state) {
  const dt = k.dt()
  //
  // Count down active flash
  //
  if (state.flashTimer > 0) {
    state.flashTimer = Math.max(0, state.flashTimer - dt)
  }
  //
  // Blink: schedule additional short flashes after the main one
  //
  if (state.blinkCount > 0) {
    state.blinkTimer -= dt
    if (state.blinkTimer <= 0) {
      state.flashTimer = LIGHTNING_FLASH_DURATION * 0.6
      state.blinkCount--
      state.blinkTimer = LIGHTNING_BLINK_INTERVAL
    }
  }
}
//
// Thunder + flash when the player hits a wrong note in the melody puzzle
//
function triggerMelodyWrongThunder(sound, state) {
  playVariedThunder(sound)
  state.flashTimer = LIGHTNING_FLASH_DURATION
  state.blinkCount = LIGHTNING_BLINK_COUNT
  state.blinkTimer = LIGHTNING_BLINK_INTERVAL
}
//
// Play 1-3 thunder rumbles with random durations and delays
//
function playVariedThunder(sound) {
  const durations = [1.5, 2.5, 3.5, 4.5, 5.0]
  const mainDuration = durations[Math.floor(Math.random() * durations.length)]
  Sound.playThunderSound(sound, { duration: mainDuration })
  //
  // Chance to add follow-up rumbles
  //
  if (Math.random() < THUNDER_MULTI_CHANCE) {
    const extraCount = 1 + Math.floor(Math.random() * (THUNDER_MULTI_MAX - 1))
    let cumulativeDelay = 0
    for (let i = 0; i < extraCount; i++) {
      cumulativeDelay += THUNDER_MULTI_DELAY_MIN + Math.random() * (THUNDER_MULTI_DELAY_MAX - THUNDER_MULTI_DELAY_MIN)
      const extraDuration = 1.0 + Math.random() * 2.5
      const extraVolume = 0.4 + Math.random() * 0.4
      Sound.playThunderSound(sound, { duration: extraDuration, volume: extraVolume, delay: cumulativeDelay })
    }
  }
}
//
// Draw lightning flash: a single full-screen white overlay that fades out smoothly.
// No horizontal strips — uniform alpha prevents visible banding.
//
function drawLightningFlash(k, state) {
  if (state.flashTimer <= 0) return
  const progress = state.flashTimer / LIGHTNING_FLASH_DURATION
  k.drawRect({
    pos: k.vec2(0, 0),
    width: CFG.visual.screen.width,
    height: CFG.visual.screen.height,
    color: k.rgb(225, 230, 248),
    opacity: progress * LIGHTNING_FLASH_OPACITY
  })
}
//
// Periodically play a distant crow call from one of the two mp3 samples.
//
function onUpdateCrowMp3Ambient(k, state) {
  //
  // Count down mouth-open timer; close beak when done
  //
  if (state.mouthTimer > 0) {
    state.mouthTimer -= k.dt()
    if (state.mouthTimer <= 0) state.mouthOpen = false
  }
  state.timer -= k.dt()
  if (state.timer <= 0) {
    k.play(L1_CROW_MP3_NAMES[0], { volume: L1_CROW_MP3_VOLUME })
    state.mouthOpen = true
    state.mouthTimer = L1_CROW_MOUTH_OPEN_DURATION
    state.timer = L1_CROW_MP3_INTERVAL_MIN + Math.random() * (L1_CROW_MP3_INTERVAL_MAX - L1_CROW_MP3_INTERVAL_MIN)
  }
}
//
// Periodically play a small bird chirp or owl hoot
//
function onUpdateBirdAmbient(k, state, sound) {
  state.timer -= k.dt()
  if (state.timer <= 0) {
    Math.random() < 0.7 ? Sound.playBirdChirpSound(sound) : Sound.playOwlSound(sound)
    state.timer = L1_BIRD_INTERVAL_MIN + Math.random() * (L1_BIRD_INTERVAL_MAX - L1_BIRD_INTERVAL_MIN)
  }
}
//
// Periodically play cricket/cicada chirps
//
function onUpdateCricketAmbient(k, state, sound) {
  state.timer -= k.dt()
  if (state.timer <= 0) {
    Sound.playCricketSound(sound)
    state.timer = L1_CRICKET_INTERVAL_MIN + Math.random() * (L1_CRICKET_INTERVAL_MAX - L1_CRICKET_INTERVAL_MIN)
  }
}
//
// Periodically play a frog croak
//
function onUpdateFrogAmbient(k, state) {
  state.timer -= k.dt()
  if (state.timer <= 0) {
    Sound.playFrogSound(k)
    state.timer = L1_FROG_INTERVAL_MIN + Math.random() * (L1_FROG_INTERVAL_MAX - L1_FROG_INTERVAL_MIN)
  }
}
//
// Creates small mushrooms scattered along the level 1 ground
//
function createL1Mushrooms(k, gameState) {
  const playableW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const mushrooms = []
  //
  // Mushroom cap palette tuned to the touch teal+orange complementary
  // scheme. Warm earthy oranges / ambers dominate so mushrooms still
  // read as forest floor, while two cool steel-teal variants echo the
  // BG / anti-hero identity colour. Replaces the previous all-warm
  // brown/red set that fought the new teal-side scenery.
  //
  const capColors = [
    [220, 110, 40],
    [200, 80, 30],
    [240, 180, 70],
    [180, 130, 60],
    [90, 136, 152],
    [60, 100, 120]
  ]
  for (let i = 0; i < L1_MUSHROOM_COUNT; i++) {
    const capW = L1_MUSHROOM_CAP_WIDTH_MIN + Math.random() * (L1_MUSHROOM_CAP_WIDTH_MAX - L1_MUSHROOM_CAP_WIDTH_MIN)
    const capH = capW * (0.4 + Math.random() * 0.3)
    const stemH = L1_MUSHROOM_STEM_HEIGHT_MIN + Math.random() * (L1_MUSHROOM_STEM_HEIGHT_MAX - L1_MUSHROOM_STEM_HEIGHT_MIN)
    const stemW = capW * (0.25 + Math.random() * 0.15)
    const totalW = Math.ceil(capW + 4)
    const totalH = Math.ceil(capH + stemH + 4)
    const color = capColors[Math.floor(Math.random() * capColors.length)]
    const spriteName = `mushroom-l1-${i}`
    const dataUrl = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawMushroomShape(ctx, totalW, totalH, capW, capH, stemH, stemW, color)
    })
    //
    // Reject positions too close to the crow so no mushrooms appear next to it.
    //
    let posX
    let attempts = 0
    const CROW_CLEAR_RADIUS = 120
    do {
      posX = LEFT_MARGIN + 60 + Math.random() * (playableW - 120)
      attempts++
    } while (Math.abs(posX - L1_CROW_X) < CROW_CLEAR_RADIUS && attempts < 20)
    const tipRoll = Math.random()
    const tooltipText = tipRoll < L1_MUSHROOM_FUNNY_CHANCE
      ? L1_MUSHROOM_FUNNY_LINES[Math.floor(Math.random() * L1_MUSHROOM_FUNNY_LINES.length)]
      : null
    const mX = posX
    const mY = FLOOR_Y - totalH + 2
    const mCx = mX + totalW * 0.5
    const mStemTop = mY + totalH - stemH - 2
    mushrooms.push({
      spriteName,
      dataUrl,
      x: mX,
      y: mY,
      width: totalW,
      height: totalH,
      capW,
      capH,
      stemH,
      stemW,
      capColor: color,
      glowPhase: Math.random() * Math.PI * 2,
      tooltipText,
      //
      // Pre-baked draw objects — eliminates 2 k.rgb + 3 k.vec2 per mushroom per frame
      //
      glowColor: k.rgb(color[0], color[1], color[2]),
      glowCapPos: k.vec2(mCx, mStemTop),
      glowStemPos: k.vec2(mCx - stemW / 2 - L1_MUSHROOM_GLOW_OUTLINE_PAD, mStemTop),
      spritePos: k.vec2(mX, mY)
    })
  }
  //
  // Disco dance constants: mushrooms sway left/right when end music plays
  //
  const MUSHROOM_DANCE_AMP_DEG = 12
  const MUSHROOM_DANCE_FREQ = 3.5
  mushrooms.forEach(m => loadTouchSprite(k, m.spriteName, m.dataUrl))
  k.add([
    k.z(6),
    {
      draw() {
        const t = k.time()
        const dancing = gameState?.phase === 'end'
        for (const m of mushrooms) {
          if (dancing) {
            //
            // Sway around base center: use anchor:'bot' so rotation origin is
            // the bottom-center of the sprite, then apply sine wave angle.
            //
            const angle = Math.sin(t * MUSHROOM_DANCE_FREQ + m.glowPhase) * MUSHROOM_DANCE_AMP_DEG
            k.drawSprite({
              sprite: m.spriteName,
              pos: k.vec2(m.x + m.width * 0.5, m.y + m.height),
              angle,
              anchor: 'bot'
            })
          } else {
            k.drawSprite({ sprite: m.spriteName, pos: m.spritePos })
          }
          // FPS_DISABLED: drawL1MushroomContourGlow(k, m, t)
        }
      }
    }
  ])
  return mushrooms
}
//
// Tiny pulsing halo traced along the mushroom cap and stem silhouette
//
function drawL1MushroomContourGlow(k, m, time) {
  const glow = (Math.sin(time * L1_MUSHROOM_GLOW_SPEED + m.glowPhase) + 1) / 2
  const alpha = L1_MUSHROOM_GLOW_ALPHA_MIN + glow * L1_MUSHROOM_GLOW_ALPHA_RANGE
  const pad = L1_MUSHROOM_GLOW_OUTLINE_PAD
  //
  // Cap outline — slightly inflated half-ellipse hugging the cap edge
  //
  k.drawEllipse({
    pos: m.glowCapPos,
    radiusX: m.capW / 2 + pad,
    radiusY: m.capH + pad,
    color: m.glowColor,
    opacity: alpha
  })
  //
  // Stem outline — thin tapered quad matching the stem silhouette
  //
  k.drawRect({
    pos: m.glowStemPos,
    width: m.stemW + pad * 2,
    height: m.stemH + pad,
    color: m.glowColor,
    opacity: alpha * 0.75
  })
}
//
// Draw a mushroom on a 2D canvas (cap + stem + texture dots)
//
function drawMushroomShape(ctx, totalW, totalH, capW, capH, stemH, stemW, color) {
  const cx = totalW / 2
  const stemTop = totalH - stemH - 2
  //
  // Stem: tapered rectangle
  //
  ctx.fillStyle = `rgb(${Math.min(255, color[0] + 40)}, ${Math.min(255, color[1] + 50)}, ${Math.min(255, color[2] + 30)})`
  ctx.beginPath()
  ctx.moveTo(cx - stemW / 2, totalH - 2)
  ctx.lineTo(cx - stemW * 0.4, stemTop)
  ctx.lineTo(cx + stemW * 0.4, stemTop)
  ctx.lineTo(cx + stemW / 2, totalH - 2)
  ctx.closePath()
  ctx.fill()
  //
  // Cap: half-ellipse
  //
  ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
  ctx.beginPath()
  ctx.ellipse(cx, stemTop, capW / 2, capH, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  //
  // Cap highlight
  //
  ctx.fillStyle = `rgba(255, 255, 255, 0.15)`
  ctx.beginPath()
  ctx.ellipse(cx - capW * 0.1, stemTop - capH * 0.3, capW * 0.25, capH * 0.3, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  //
  // White spots on cap for texture
  //
  const dotCount = Math.floor(Math.random() * 3) + 1
  ctx.fillStyle = `rgba(255, 255, 240, 0.3)`
  for (let d = 0; d < dotCount; d++) {
    const dotX = cx + (Math.random() - 0.5) * capW * 0.6
    const dotY = stemTop - capH * (0.2 + Math.random() * 0.5)
    ctx.beginPath()
    ctx.arc(dotX, dotY, 1 + Math.random(), 0, Math.PI * 2)
    ctx.fill()
  }
}
//
// Draws an animated crow perched on the ground (or on a rock if radius > 0).
// The beak opens when a crow MP3 sample plays (crowMp3State.mouthOpen).
// The crow always faces the hero; eyes track the hero position.
//
function addCrowOnRock(k, rock, crowMp3State, heroInst, gameState) {
  const sc = 1.35
  const cx = rock.worldX
  //
  // Ground-level perch: body center placed so feet (legBot = perchY + 15*sc) align with FLOOR_Y.
  //
  const perchY = rock.worldY - rock.radius * 0.62 - 15 * sc
  //
  // Crow dance: hop up/down at ~2Hz when end music is playing (phase 'end')
  //
  const CROW_DANCE_AMP = 6
  const CROW_DANCE_FREQ = 4.0
  k.add([
    k.z(L1_CROW_ROCK_DRAW_Z),
    {
      draw() {
        const heroX = heroInst?.character?.pos?.x ?? cx + 1
        const s = heroX >= cx ? 1 : -1
        const dancing = gameState?.phase === 'end'
        const bounce = dancing ? Math.abs(Math.sin(k.time() * CROW_DANCE_FREQ)) * CROW_DANCE_AMP : 0
        drawCrow(k, cx, perchY - bounce, sc, s, crowMp3State.mouthOpen, heroInst)
      }
    }
  ])
}
//
// Creates the second giant worm at a random position between note trees.
// The worm spawns at the midpoint of a random gap between two adjacent note trees.
//
function createTrap2Worm(k, heroInst, sound, floorY) {
  const noteXs = TreeRoots.getNoteTreePositions(LEFT_MARGIN, RIGHT_MARGIN, CFG.visual.screen.width)
  const gapCenters = []
  for (let i = 0; i < noteXs.length - 1; i++) {
    gapCenters.push((noteXs[i] + noteXs[i + 1]) / 2)
  }
  const pickNewX = (currentX) => {
    const others = gapCenters.filter(x => x !== currentX)
    const pool = others.length > 0 ? others : gapCenters
    return pool[Math.floor(Math.random() * pool.length)]
  }
  const initialX = pickNewX(null)
  const worm = GiantWorm.create({ k, x: initialX, floorY, hero: heroInst, sfx: sound })
  return worm
}
//
// Watches the trap2 worm's visibility state and repositions it to a new random
// gap after each retract cycle, after TRAP2_WORM_REPOSITION_DELAY seconds.
//
function createTrap2WormReposition(k, worm, heroInst) {
  const noteXs = TreeRoots.getNoteTreePositions(LEFT_MARGIN, RIGHT_MARGIN, CFG.visual.screen.width)
  const gapCenters = []
  for (let i = 0; i < noteXs.length - 1; i++) {
    gapCenters.push((noteXs[i] + noteXs[i + 1]) / 2)
  }
  const pickNewX = (currentX) => {
    const others = gapCenters.filter(x => x !== currentX)
    const pool = others.length > 0 ? others : gapCenters
    return pool[Math.floor(Math.random() * pool.length)]
  }
  let wasVisible = false
  const onUpdate = () => {
    const nowVisible = worm.phase !== 'hidden' || worm.riseAmount > 0
    if (wasVisible && !nowVisible) {
      k.wait(TRAP2_WORM_REPOSITION_DELAY, () => {
        if (!heroInst?.character?.exists?.()) return
        worm.x = pickNewX(worm.x)
      })
    }
    wasVisible = nowVisible
  }
  return { onUpdate }
}
//
// True when a decorative tree X would overlap a melody note-tree slot
//
function isNearNoteTreeX(x, noteTreeXs) {
  return noteTreeXs.some(nx => Math.abs(x - nx) < NOTE_TREE_EXCLUSION_RADIUS)
}
//
// Merged baked background PNG — all three parallax tree layers in one draw call
//
function drawL1StaticAllTrees(k) {
  k.drawSprite({
    sprite: 'bg-touch-all-trees',
    pos: k.vec2(0, 0),
    anchor: 'topleft'
  })
}
//
// Per-frame bird physics: position, sine flight path, flap/glide state machine.
// Called from the unified game loop so draw() stays allocation-free.
//
function onUpdateL1Birds(k, birds, skyHeight, topMargin, flapBlendTime, glidePose) {
  const time = k.time()
  const dt = k.dt()
  for (const bird of birds) {
    bird.x += bird.speed * dt
    if (bird.x > k.width() + 50) {
      bird.x = -50
      bird.baseY = topMargin + Math.random() * skyHeight
    }
    bird.y = bird.baseY + Math.sin((time + bird.timeOffset) * bird.frequency + bird.phaseOffset) * bird.amplitude
    bird.flapTimer += dt
    const currentDuration = bird.isFlapping ? bird.flapDuration : bird.glideDuration
    if (bird.flapTimer > currentDuration) {
      bird.isFlapping = !bird.isFlapping
      bird.flapTimer = 0
    }
    const targetBlend = bird.isFlapping ? 1 : 0
    const blendStep = dt / flapBlendTime
    if (bird.modeBlend < targetBlend) {
      bird.modeBlend = Math.min(targetBlend, bird.modeBlend + blendStep)
    } else if (bird.modeBlend > targetBlend) {
      bird.modeBlend = Math.max(targetBlend, bird.modeBlend - blendStep)
    }
    //
    // Smoothly blend wing position between flap sine and static glide pose
    //
    const flapWave = Math.sin((time + bird.timeOffset) * 8 + bird.phaseOffset)
    bird.wingPhase = glidePose + (flapWave - glidePose) * bird.modeBlend
  }
}
//
// Triggers all tree roots to glow and shake for 1 second (melody success effect)
//
function triggerAllRootsGlow(treeRootsInst) {
  for (const root of treeRootsInst.roots) {
    root.touchShake = 2
    root.glowTimer = 1.0
  }
}
//
// Creates two text objects for a standing letter (fill + outline)
// Returns array [outlineObj, fillObj] for later manipulation
//
function createStandingLetter(k, letter, x, y, size, angle, fillR, fillG, fillB, z) {
  const font = CFG.visual.fonts.thinFull.replace(/'/g, '')
  const oo = T_LETTER_OUTLINE
  //
  // 8-direction outline offsets matching lesson0 createPickupLetter style
  //
  const offsets = [
    [-oo, -oo], [0, -oo], [oo, -oo],
    [-oo, 0], [oo, 0],
    [-oo, oo], [0, oo], [oo, oo]
  ]
  const outlines = offsets.map(([dx, dy]) => k.add([
    k.text(letter, { size, font }),
    k.pos(x + dx, y + dy),
    k.anchor('bot'),
    k.rotate(angle),
    k.color(0, 0, 0),
    k.z(z)
  ]))
  const fill = k.add([
    k.text(letter, { size, font }),
    k.pos(x, y),
    k.anchor('bot'),
    k.rotate(angle),
    k.color(fillR, fillG, fillB),
    k.z(z + 0.1)
  ])
  return [...outlines, fill]
}
//
// Floor mask for T letter — clips the submerged portion below FLOOR_Y
//
function createTLetterMask(k, tX, tY) {
  //
  // tY is the bottom edge of the letter (anchor 'bot'). The mask draws a
  // background-coloured rect from FLOOR_Y down to tY to hide the
  // submerged portion, matching lesson0 createFloorMask style.
  //
  const maskW = T_LETTER_FONT_SIZE * 1.4
  return k.add([
    k.pos(tX - maskW / 2, FLOOR_Y),
    k.z(T_LETTER_MASK_Z),
    {
      draw() {
        k.drawRect({
          pos: k.vec2(0, 0),
          width: maskW,
          height: tY - FLOOR_Y + 4,
          color: k.rgb(L1_SCENE_BG_R, L1_SCENE_BG_G, L1_SCENE_BG_B)
        })
      }
    }
  ])
}
//
// Animates a standing letter blinking (teal → white pulse) until collected.
// Matches lesson0's TOUCH letter pulse: TOUCH_LETTER_PULSE_SPEED / TOUCH_LETTER_PULSE_MIN.
// letterObjs layout: [...outlines (0..n-2), fill (last)]
//
function animateLetterBlink(k, letterObjs, blinkState, collected) {
  if (collected) return
  blinkState.timer += k.dt()
  const pulse = (Math.sin(blinkState.timer * TOUCH_LETTER_PULSE_SPEED) + 1) / 2
  const opacity = TOUCH_LETTER_PULSE_MIN + (1 - TOUCH_LETTER_PULSE_MIN) * pulse
  const cr = Math.round(T_LETTER_FILL_R + (255 - T_LETTER_FILL_R) * pulse)
  const cg = Math.round(T_LETTER_FILL_G + (255 - T_LETTER_FILL_G) * pulse)
  const cb = Math.round(T_LETTER_FILL_B + (255 - T_LETTER_FILL_B) * pulse)
  const fill = letterObjs[letterObjs.length - 1]
  if (fill?.exists?.()) {
    fill.opacity = opacity
    fill.color = k.rgb(cr, cg, cb)
  }
  for (let i = 0; i < letterObjs.length - 1; i++) {
    letterObjs[i]?.exists?.() && (letterObjs[i].opacity = opacity)
  }
}
//
// Called when hero collects the T letter
//
function onTLetterCollect(k, gameState, tLetterObjs, tLetterMask, sound, levelIndicator, treeRootsInst, crowTooltipState) {
  gameState.tCollected = true
  gameState.phase = 'phase1'
  gameState.treesEnabled = true
  //
  // Destroy T letter visuals
  //
  tLetterObjs.forEach(o => o?.exists?.() && k.destroy(o))
  tLetterMask?.exists?.() && k.destroy(tLetterMask)
  //
  // Enable tree glow and same-note mode
  //
  TreeRoots.enableSameNoteMode && TreeRoots.enableSameNoteMode(treeRootsInst)
  //
  // Show dialog
  //
  gameState.dialogOpen = true
  gameState.lastDialogText = L1_GOAL_T
  gameState.goalRef && (gameState.goalRef.text = L1_GOAL_T)
  LevelHelp.openStandalonePanel(k, L1_DIALOG_T, {
    textStyles: { hl: { color: k.rgb(255, 200, 60) } },
    sceneBackdropHex: L1_SCENE_BG_HEX,
    onClose: () => { gameState.dialogOpen = false }
  })
  //
  // Flash T in TOUCH HUD
  //
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, 1)
  LevelIndicator.flashLetterBurst(levelIndicator, 1)
  sound && Sound.playVictorySound(sound)
}
//
// Called when O letter is collected
//
function onOLetterCollect(k, gameState, sound, levelIndicator, treeRootsInst) {
  if (gameState.oCollected) return
  gameState.oCollected = true
  gameState.phase = 'phase2'
  gameState.treesPhase2Touched = new Set()
  //
  // Destroy O platform after short delay
  //
  k.wait(2.5, () => {
    gameState.oPlatformObj?.exists?.() && k.destroy(gameState.oPlatformObj)
    gameState.oPlatformObj = null
  })
  //
  // Enable unique notes per tree
  //
  TreeRoots.enableUniqueNoteMode && TreeRoots.enableUniqueNoteMode(treeRootsInst)
  //
  // Show dialog
  //
  gameState.dialogOpen = true
  gameState.lastDialogText = L1_GOAL_O
  gameState.goalRef && (gameState.goalRef.text = L1_GOAL_O)
  LevelHelp.openStandalonePanel(k, L1_DIALOG_O, {
    textStyles: { hl: { color: k.rgb(255, 200, 60) } },
    sceneBackdropHex: L1_SCENE_BG_HEX,
    onClose: () => { gameState.dialogOpen = false }
  })
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, 2)
  LevelIndicator.flashLetterBurst(levelIndicator, 2)
  sound && Sound.playVictorySound(sound)
}
//
// Called when U letter is collected
//
function onULetterCollect(k, gameState, sound, levelIndicator, treeRootsInst) {
  if (gameState.uCollected) return
  gameState.uCollected = true
  gameState.phase = 'melody'
  //
  // Destroy U platform after short delay
  //
  k.wait(2.5, () => {
    gameState.uPlatformObj?.exists?.() && k.destroy(gameState.uPlatformObj)
    gameState.uPlatformObj = null
  })
  //
  // Show dialog
  //
  gameState.dialogOpen = true
  gameState.lastDialogText = L1_GOAL_U
  gameState.goalRef && (gameState.goalRef.text = L1_GOAL_U)
  LevelHelp.openStandalonePanel(k, L1_DIALOG_U, {
    textStyles: { hl: { color: k.rgb(255, 200, 60) } },
    sceneBackdropHex: L1_SCENE_BG_HEX,
    onClose: () => { gameState.dialogOpen = false }
  })
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, 3)
  LevelIndicator.flashLetterBurst(levelIndicator, 3)
  sound && Sound.playVictorySound(sound)
}
//
// Called when CH letters are collected — plays end music, blocks controls
//
function onCHLetterCollect(k, gameState, sound, levelIndicator, transition) {
  if (gameState.chCollected) return
  gameState.chCollected = true
  gameState.phase = 'end'
  //
  // Level completed — persist bonus fragments so they survive the next session
  //
  BonusHero.finalizeCollection(gameState._bonusHeroRef)
  //
  // Hero closes eyes when idle during the celebration (calm, peaceful look)
  //
  gameState._heroRef && Hero.setEyesClosed(gameState._heroRef, true)
  //
  // Remove CH platform and letters after a short delay so the hero has time
  // to jump off before the ground disappears beneath them.
  //
  k.wait(CH_PLATFORM_HIDE_DELAY, () => {
    gameState.chPlatformObj?.exists?.() && k.destroy(gameState.chPlatformObj)
    gameState.chLetterObjs?.forEach(obj => obj?.exists?.() && k.destroy(obj))
    gameState.chPlatformObj = null
    gameState.chLetterObjs = null
  })
  //
  // Flash CH in TOUCH HUD (letters 4 and 5)
  //
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, 5)
  LevelIndicator.flashLetterBurst(levelIndicator, 4)
  k.wait(0.3, () => LevelIndicator.flashLetterBurst(levelIndicator, 5))
  //
  // Play victory sound, then start end music + disco effects
  //
  sound && Sound.playVictorySound(sound)
  k.wait(0.8, () => {
    //
    // Start visual effects immediately so worm rises and trees cycle color
    // even if music play is delayed by the browser.
    //
    gameState._giantWormRef && GiantWorm.startDancing(gameState._giantWormRef)
    gameState._treeRootsRef && TreeRoots.startDisco(gameState._treeRootsRef)
    //
    // Try playing end music; retry once if k.play returns null (audio context
    // may be suspended on first attempt after a long pause).
    //
    const tryPlayMusic = () => {
      const m = k.play(END_MUSIC_NAME, { loop: false, volume: 0.8 })
      if (m) gameState._endMusicRef = m
      return !!m
    }
    if (!tryPlayMusic()) {
      k.wait(0.4, tryPlayMusic)
    }
    //
    // Fade screen to black over SCENE_FADE_OUT_DURATION, then run transition
    //
    const goNext = () => {
      gameState._endMusicRef?.stop?.()
      gameState._treeRootsRef && TreeRoots.stopDisco(gameState._treeRootsRef)
      //
      // Restore life score to level-entry snapshot so deaths this session
      // do not carry into the next level.
      //
      set('lifeScore', gameState.initialLifeScore ?? 0)
      fadeOutLesson1(k, SCENE_FADE_OUT_DURATION, () => createLevelTransition(k, 'lesson-touch.1'))
    }
    const enterCancel = k.onKeyPress('enter', () => {
      enterCancel.cancel()
      goNext()
    })
    //
    // Auto-transition when music ends (~60s). enterCancel guarded so goNext
    // never fires twice if Enter was pressed before the timer fires.
    //
    k.wait(62, () => {
      enterCancel.cancel()
      goNext()
    })
  })
  gameState.lastDialogText = L1_GOAL_CH
  gameState.goalRef && (gameState.goalRef.text = L1_GOAL_CH)
}
//
// Creates a log platform with a letter label on top of it
// Returns { platformObj, letterObjs }
//
function createLetterLogPlatform(k, letter, platX, platY, w, h, tiltDeg = 0) {
  const platformObj = LogPlatform.create({ k, x: platX - w / 2, y: platY, width: w, height: h, opacity: 0 })
  //
  // Fade in platform
  //
  const fadeInterval = k.onUpdate(() => {
    if (!platformObj.exists?.()) { fadeInterval.cancel(); return }
    if (platformObj.opacity >= 1) { platformObj.opacity = 1; fadeInterval.cancel(); return }
    platformObj.opacity = Math.min(1, platformObj.opacity + k.dt() * 1.5)
  })
  //
  // Letter sinks 10px into the platform: bottom edge = platY + 10.
  // Size matches lesson0 TOUCH letter size (68px).
  // Optional tiltDeg rotates the letter for a casual, hand-placed look.
  //
  const LETTER_SINK_PX = 10
  const letterX = platX
  const letterY = platY + LETTER_SINK_PX
  const oo = T_LETTER_OUTLINE
  const offsets = [
    [-oo, -oo], [0, -oo], [oo, -oo],
    [-oo, 0], [oo, 0],
    [-oo, oo], [0, oo], [oo, oo]
  ]
  const outlines = offsets.map(([ox, oy]) => k.add([
    k.text(letter, { size: T_LETTER_FONT_SIZE, font: CFG.visual.fonts.thinFull }),
    k.pos(letterX + ox, letterY + oy),
    k.anchor('bot'),
    k.color(0, 0, 0),
    k.opacity(0),
    k.rotate(tiltDeg),
    k.z(CFG.visual.zIndex.platforms + 1)
  ]))
  const fill = k.add([
    k.text(letter, { size: T_LETTER_FONT_SIZE, font: CFG.visual.fonts.thinFull }),
    k.pos(letterX, letterY),
    k.anchor('bot'),
    k.color(T_LETTER_FILL_R, T_LETTER_FILL_G, T_LETTER_FILL_B),
    k.opacity(0),
    k.rotate(tiltDeg),
    k.z(CFG.visual.zIndex.platforms + 1.1)
  ])
  const letterFade = k.onUpdate(() => {
    if (!fill.exists?.()) { letterFade.cancel(); return }
    if (fill.opacity >= 1) {
      fill.opacity = 1
      outlines.forEach(o => { o.exists?.() && (o.opacity = 1) })
      letterFade.cancel()
      return
    }
    fill.opacity = Math.min(1, fill.opacity + k.dt() * 1.5)
    outlines.forEach(o => { o.exists?.() && (o.opacity = fill.opacity) })
  })
  return { platformObj, letterObjs: [...outlines, fill] }
}
//
// Creates the O platform (left side) after 7/7 tree touches in phase 1
//
function createOPlatform(k, gameState, sound, levelIndicator, treeRootsInst) {
  if (gameState.oPlatformObj) return
  const { platformObj, letterObjs } = createLetterLogPlatform(k, 'O', O_PLATFORM_X, O_PLATFORM_Y, LOG_PLATFORM_W, LOG_PLATFORM_H, -9)
  gameState.oPlatformObj = platformObj
  gameState.oLetterObjs = letterObjs
  gameState.phase = 'wait_o'
  triggerAllRootsGlow(gameState._treeRootsRef ?? treeRootsInst)
  sound && Sound.playVictorySound(sound)
  //
  // O letter blink state
  //
  const blinkState = { timer: 0, phase: 0 }
  k.add([
    k.z(CFG.visual.zIndex.platforms + 1.5),
    {
      draw() {
        animateLetterBlink(k, letterObjs, blinkState, gameState.oCollected)
      }
    }
  ])
}
//
// Creates the U platform (right side) after 7/7 tree touches in phase 2
//
function createUPlatform(k, gameState, sound, levelIndicator, treeRootsInst) {
  if (gameState.uPlatformObj) return
  const { platformObj, letterObjs } = createLetterLogPlatform(k, 'U', U_PLATFORM_X, U_PLATFORM_Y, U_PLATFORM_W, LOG_PLATFORM_H, 7)
  gameState.uPlatformObj = platformObj
  gameState.uLetterObjs = letterObjs
  gameState.phase = 'wait_u'
  triggerAllRootsGlow(treeRootsInst)
  sound && Sound.playVictorySound(sound)
  //
  // U letter blink state
  //
  const blinkState = { timer: 0, phase: 0 }
  k.add([
    k.z(CFG.visual.zIndex.platforms + 1.5),
    {
      draw() {
        animateLetterBlink(k, letterObjs, blinkState, gameState.uCollected)
      }
    }
  ])
}
//
// Creates the CH platform (left side) after melody solved
//
function createCHPlatform(k, gameState, sound, levelIndicator, treeRootsInst) {
  if (gameState.chPlatformObj) return
  const { platformObj, letterObjs } = createLetterLogPlatform(k, 'CH', CH_PLATFORM_X, CH_PLATFORM_Y, CH_PLATFORM_W, LOG_PLATFORM_H)
  gameState.chPlatformObj = platformObj
  gameState.chLetterObjs = letterObjs
  triggerAllRootsGlow(treeRootsInst)
  sound && Sound.playVictorySound(sound)
  const blinkState = { timer: 0, phase: 0 }
  k.add([
    k.z(CFG.visual.zIndex.platforms + 1.5),
    {
      draw() {
        animateLetterBlink(k, letterObjs, blinkState, gameState.chCollected)
      }
    }
  ])
}
//
// Per-frame function — updates touch counter display and checks letter collections
//
function processL1TreeTouch(k, gameState, touchedIdx, sound, levelIndicator, treeRootsInst, transition) {
  const heroChar = gameState._heroRef?.character
  if (!heroChar) return
  const heroX = heroChar.pos.x
  const heroY = heroChar.pos.y
  //
  // Phase 1: count unique tree touches → O platform
  //
  if (gameState.phase === 'phase1' && touchedIdx !== -1) {
    if (!gameState.treesPhase1Touched.has(touchedIdx)) {
      gameState.treesPhase1Touched.add(touchedIdx)
      updateTreeCounter(k, gameState, gameState.treesPhase1Touched.size, 7, heroX, heroY)
    }
    if (gameState.treesPhase1Touched.size >= 7) {
      destroyTreeCounter(k, gameState)
      createOPlatform(k, gameState, sound, levelIndicator, treeRootsInst)
    }
  }
  //
  // Phase 2: count unique tree touches → U platform
  //
  if (gameState.phase === 'phase2' && touchedIdx !== -1) {
    if (!gameState.treesPhase2Touched.has(touchedIdx)) {
      gameState.treesPhase2Touched.add(touchedIdx)
      updateTreeCounter(k, gameState, gameState.treesPhase2Touched.size, 7, heroX, heroY)
    }
    if (gameState.treesPhase2Touched.size >= 7) {
      destroyTreeCounter(k, gameState)
      createUPlatform(k, gameState, sound, levelIndicator, treeRootsInst)
    }
  }
  //
  // Phase 1/2: update counter position each frame
  //
  if ((gameState.phase === 'phase1' || gameState.phase === 'phase2') && gameState.counterObj?.exists?.()) {
    const count = gameState.phase === 'phase1' ? gameState.treesPhase1Touched.size : gameState.treesPhase2Touched.size
    const cx = heroX + TOUCH_COUNTER_X_OFFSET
    const cy = heroY + TOUCH_COUNTER_Y_OFFSET
    gameState.counterObj.pos.x = cx
    gameState.counterObj.pos.y = cy
    gameState.counterOutlines?.forEach((n, i) => {
      if (!n?.exists?.()) return
      const offs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
      n.pos.x = cx + offs[i][0]
      n.pos.y = cy + offs[i][1]
    })
  }
}
//
// Shows and updates melody note counter (x/5) near hero during melody phase
//
function updateMelodyCounter(k, gameState, heroX, heroY) {
  const count = gameState.playerSequence.length
  const text = `${count}/${MELODY_COUNTER_TOTAL}`
  const cx = heroX + MELODY_COUNTER_X_OFFSET
  const cy = heroY + MELODY_COUNTER_Y_OFFSET
  if (!gameState.melodyCounterObj || !gameState.melodyCounterObj?.exists?.()) {
    const offs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
    gameState.melodyCounterOutlines = offs.map(([dx, dy]) => k.add([
      k.text(text, { size: MELODY_COUNTER_FONT }),
      k.pos(cx + dx, cy + dy),
      k.anchor('left'),
      k.color(0, 0, 0),
      k.opacity(0.85),
      k.z(CFG.visual.zIndex.ui + 10)
    ]))
    gameState.melodyCounterObj = k.add([
      k.text(text, { size: MELODY_COUNTER_FONT }),
      k.pos(cx, cy),
      k.anchor('left'),
      k.color(k.rgb(255, 210, 60)),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10.1)
    ])
    return
  }
  gameState.melodyCounterObj.text = text
  gameState.melodyCounterOutlines?.forEach(n => n?.exists?.() && (n.text = text))
  gameState.melodyCounterObj.pos.x = cx
  gameState.melodyCounterObj.pos.y = cy
  const offs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
  gameState.melodyCounterOutlines?.forEach((n, i) => {
    if (!n?.exists?.()) return
    n.pos.x = cx + offs[i][0]
    n.pos.y = cy + offs[i][1]
  })
}
//
// Destroys the melody note counter
//
function destroyMelodyCounter(k, gameState) {
  gameState.melodyCounterObj?.exists?.() && k.destroy(gameState.melodyCounterObj)
  gameState.melodyCounterObj = null
  gameState.melodyCounterOutlines?.forEach(n => n?.exists?.() && k.destroy(n))
  gameState.melodyCounterOutlines = null
}
//
// Updates x/y touch counter near hero head
//
function updateTreeCounter(k, gameState, count, total, heroX, heroY) {
  const text = `${count}/${total}`
  const cx = heroX + TOUCH_COUNTER_X_OFFSET
  const cy = heroY + TOUCH_COUNTER_Y_OFFSET
  if (!gameState.counterObj || !gameState.counterObj?.exists?.()) {
    const offs = [[-1, -1], [1, -1], [-1, 1], [1, 1]]
    gameState.counterOutlines = offs.map(([dx, dy]) => k.add([
      k.text(text, { size: TOUCH_COUNTER_FONT }),
      k.pos(cx + dx, cy + dy),
      k.anchor('left'),
      k.color(0, 0, 0),
      k.opacity(0.85),
      k.z(CFG.visual.zIndex.ui + 10)
    ]))
    gameState.counterObj = k.add([
      k.text(text, { size: TOUCH_COUNTER_FONT }),
      k.pos(cx, cy),
      k.anchor('left'),
      k.color(k.rgb(80, 230, 80)),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10.1)
    ])
    return
  }
  gameState.counterObj.text = text
  gameState.counterOutlines?.forEach(n => n?.exists?.() && (n.text = text))
}
//
// Destroys the touch counter
//
function destroyTreeCounter(k, gameState) {
  gameState.counterObj?.exists?.() && k.destroy(gameState.counterObj)
  gameState.counterObj = null
  gameState.counterOutlines?.forEach(n => n?.exists?.() && k.destroy(n))
  gameState.counterOutlines = null
}
//
// Draws the big mushroom trampoline in the right corner
//
//
// Fades the scene to black over `duration` seconds, then calls onComplete.
// Syncs Kaplay clear color + CSS letterbox bars so top/bottom strips
// also fade — they are not covered by the overlay rect but respond to
// k.setBackground + CanvasBackdrop.setCssBackdrop changes.
//
function fadeOutLesson1(k, duration, onComplete) {
  const [sr, sg, sb] = parseHex(L1_SCENE_BG_HEX)
  let elapsed = 0
  //
  // Oversized rect covers the canvas + any letterbox area the overlay rect
  // itself might miss (e.g. sub-pixel overflows). Safe because k.fixed()
  // anchors it to screen space regardless of camera position.
  //
  const OVERSCAN = 60
  const overlay = k.add([
    k.pos(-OVERSCAN, -OVERSCAN),
    k.rect(CFG.visual.screen.width + OVERSCAN * 2, CFG.visual.screen.height + OVERSCAN * 2),
    k.color(0, 0, 0),
    k.opacity(0),
    k.z(CFG.visual.zIndex.ui + 200),
    k.fixed()
  ])
  const cancel = k.onUpdate(() => {
    elapsed += k.dt()
    const progress = Math.min(1, elapsed / duration)
    overlay.opacity = progress
    //
    // Lerp scene background colour toward black so letterbox bars match
    //
    const r = Math.round(sr * (1 - progress))
    const g = Math.round(sg * (1 - progress))
    const b = Math.round(sb * (1 - progress))
    k.setBackground(k.rgb(r, g, b))
    CanvasBackdrop.setCssBackdrop(k.canvas, r, g, b)
    if (elapsed >= duration) {
      cancel.cancel()
      //
      // Destroy the black overlay BEFORE calling onComplete so that the
      // transition overlay (created synchronously inside onComplete) is the
      // only thing covering the screen. Its CSS backdrop and the overlay rect
      // share the same colour, eliminating mismatched letterbox strips.
      //
      overlay.exists() && k.destroy(overlay)
      onComplete?.()
    }
  })
}
//
// Spawns a burst of autumn leaf particles at the hero's death position.
// Shape: teardrop bezier polygon identical to FallingLeaf and tree-roots leaves.
// Physics: explosive burst → transitions to gentle flutter+fall identical to FallingLeaf.
//
function spawnLeafDeathBurst(k, x, y) {
  //
  // Build teardrop leaf shape using the same quadratic bezier formula as
  // FallingLeaf.buildLeafPoints and tree-roots.js drawLeafToCanvas.
  // Base at (0,0), tip at (0,-size), control points at (±size*0.6, -size*0.3).
  //
  const LEAF_BEZIER_STEPS = 8
  function buildLeafPts(size) {
    const pts = []
    for (let i = 0; i <= LEAF_BEZIER_STEPS; i++) {
      const t = i / LEAF_BEZIER_STEPS
      const omt = 1 - t
      pts.push(k.vec2(2 * omt * t * (-size * 0.6), 2 * omt * t * (-size * 0.3) + t * t * (-size)))
    }
    for (let i = 0; i <= LEAF_BEZIER_STEPS; i++) {
      const t = i / LEAF_BEZIER_STEPS
      const omt = 1 - t
      pts.push(k.vec2(2 * omt * t * (size * 0.6), omt * omt * (-size) + 2 * omt * t * (-size * 0.3)))
    }
    return pts
  }
  //
  // Autumn palette matching tree-roots.js leaf colors
  //
  const leafPalette = [
    [220, 60, 50],
    [235, 90, 50],
    [240, 185, 55],
    [235, 150, 55],
    [245, 120, 45]
  ]
  const particles = []
  for (let i = 0; i < DEATH_LEAF_COUNT; i++) {
    const burstAngle = Math.random() * Math.PI * 2
    const speed = DEATH_LEAF_BURST_SPEED_MIN + Math.random() * (DEATH_LEAF_BURST_SPEED_MAX - DEATH_LEAF_BURST_SPEED_MIN)
    const col = leafPalette[Math.floor(Math.random() * leafPalette.length)]
    //
    // Leaf size matches tree-roots.js (rand 12-22)
    //
    const size = 12 + Math.random() * 10
    particles.push({
      x,
      y,
      vx: Math.cos(burstAngle) * speed,
      vy: Math.sin(burstAngle) * speed - 60,
      pts: buildLeafPts(size),
      //
      // 2D rotation (deg): fast initial spin, slows to gentle leaf tumble
      //
      leafAngle: Math.random() * 360,
      rotSpeed: (Math.random() - 0.5) * 400,
      //
      // Z-axis pseudo-3D tumble via scaleX = |cos(rotZ)|, same as FallingLeaf
      //
      rotZ: Math.random() * 360,
      tumbleSpeed: (Math.random() - 0.5) * 160,
      scaleX: 1,
      //
      // Flutter wave — used in leaf-fall phase, matches FallingLeaf parameters
      //
      wavePhase: Math.random() * Math.PI * 2,
      waveSpeed: 1.5 + Math.random() * 2.0,
      waveAmplitude: 8 + Math.random() * 12,
      windX: (Math.random() - 0.5) * 16,
      r: col[0], g: col[1], b: col[2],
      opacity: 0.88 + Math.random() * 0.12,
      life: DEATH_LEAF_LIFETIME * (0.7 + Math.random() * 0.6),
      //
      // 1.0 = full burst energy (fast), decays to 0 → switches to leaf-fall physics
      //
      burstEnergy: 1.0,
      settled: false
    })
  }
  const drawer = k.add([
    k.z(CFG.visual.zIndex.ui + 50),
    {
      draw() {
        for (const p of particles) {
          if (p.life <= 0) continue
          const fade = p.settled ? Math.min(1, p.life / 1.2) : 1
          k.pushTransform()
          k.pushTranslate(p.x, p.y)
          k.pushRotate(p.leafAngle)
          k.pushScale(p.scaleX, 1)
          k.drawPolygon({
            pts: p.pts,
            color: k.rgb(p.r, p.g, p.b),
            opacity: p.opacity * fade
          })
          k.popTransform()
        }
      }
    }
  ])
  const updater = k.onUpdate(() => {
    const dt = k.dt()
    let alive = false
    for (const p of particles) {
      if (p.life <= 0) continue
      alive = true
      if (p.settled) {
        p.life -= dt
        continue
      }
      //
      // Burst energy decays over ~0.8s, then physics switches to FallingLeaf mode
      //
      p.burstEnergy = Math.max(0, p.burstEnergy - dt * 1.2)
      if (p.burstEnergy > 0) {
        //
        // Burst phase: high velocity + gravity + drag
        //
        p.x += p.vx * dt
        p.y += p.vy * dt
        p.vy += DEATH_LEAF_GRAVITY * dt
        p.vx *= DEATH_LEAF_DRAG
        p.leafAngle += p.rotSpeed * dt
        p.rotSpeed *= 0.95
      } else {
        //
        // Leaf-fall phase: matches FallingLeaf flutter + gentle fall
        //
        p.wavePhase += p.waveSpeed * dt
        const flutter = Math.sin(p.wavePhase) * p.waveAmplitude * 0.3
        p.x += (p.windX + flutter) * dt
        p.y += 35 * dt
        p.leafAngle += (p.rotSpeed >= 0 ? 1 : -1) * 60 * dt
      }
      //
      // Z-axis tumble active in both phases — identical to FallingLeaf
      //
      p.rotZ += p.tumbleSpeed * dt
      p.scaleX = Math.max(0.1, Math.abs(Math.cos(p.rotZ * Math.PI / 180)))
      //
      // Settle on floor platform
      //
      if (p.y >= FLOOR_Y) {
        p.y = FLOOR_Y
        p.settled = true
        p.rotSpeed = 0
        p.life = 2.5 + Math.random() * 1.5
      } else {
        p.life -= dt
      }
    }
    if (!alive) {
      updater.cancel()
      drawer.exists() && k.destroy(drawer)
    }
  })
}
//
// Shows "Press Space or Enter to continue... N" at the top after hero death.
// The countdown number is inline, same color as the prompt text.
// Auto-restarts when the countdown reaches 0.
//
function startDeathCountdown(k, sceneName, deathX, deathY) {
  let elapsed = 0
  const cx = CFG.visual.screen.width / 2
  const textCfg = { size: L1_DEATH_PROMPT_FONT, font: CFG.visual.fonts.regularFull }
  const initText = L1_DEATH_PROMPT_BASE + DEATH_COUNTDOWN_SECONDS
  const offs = [[-1.5, -1.5], [1.5, -1.5], [-1.5, 1.5], [1.5, 1.5]]
  const outlines = offs.map(([dx, dy]) => k.add([
    k.text(initText, textCfg),
    k.pos(cx + dx, L1_DEATH_PROMPT_Y + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(0.85),
    k.z(CFG.visual.zIndex.ui + 60)
  ]))
  const promptText = k.add([
    k.text(initText, textCfg),
    k.pos(cx, L1_DEATH_PROMPT_Y),
    k.anchor('center'),
    k.color(k.rgb(220, 220, 220)),
    k.opacity(1),
    k.z(CFG.visual.zIndex.ui + 60.1)
  ])
  const destroyAll = () => {
    outlines.forEach(o => o?.exists?.() && k.destroy(o))
    promptText.exists() && k.destroy(promptText)
  }
  const doRestart = () => {
    skipHandler.cancel()
    updateTimer.cancel()
    destroyAll()
    goAfterPreparingAssets(k, sceneName)
  }
  const skipHandler = k.onKeyPress((key) => {
    if (key === 'space' || key === 'enter') doRestart()
  })
  const updateTimer = k.onUpdate(() => {
    elapsed += k.dt()
    const remaining = Math.max(0, DEATH_COUNTDOWN_SECONDS - elapsed)
    const newText = L1_DEATH_PROMPT_BASE + Math.ceil(remaining)
    if (promptText.exists()) promptText.text = newText
    outlines.forEach(o => o?.exists?.() && (o.text = newText))
    if (elapsed >= DEATH_COUNTDOWN_SECONDS) doRestart()
  })
}
