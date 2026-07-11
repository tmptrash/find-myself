import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import * as Bugs from '../components/bugs.js'
import * as SmallBugs from '../components/small-bugs.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as BugPyramid from '../components/bug-pyramid.js'
import * as LevelIndicator from '../components/lesson-indicator.js'
import * as LevelHelp from '../../../utils/lesson-help.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { goToMenuAfterAssets, goAfterPreparingAssets } from '../../../utils/lesson-assets.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'
import { drawRealisticBird } from '../utils/realistic-bird.js'
import * as OrganicParallax from '../utils/organic-parallax-tree.js'
import { createHangingSpider, spiderHoverTooltipTarget } from '../utils/hanging-spider.js'
import { toCanvas, getRGB } from '../../../utils/helper.js'
import { isTouchDevice } from '../../../utils/touch-input.js'
import * as LifeDeduction from '../utils/life-deduction.js'
import { createScrollingCloudBand, createFloorThornSprite } from '../utils/lesson0-scenery-sprites.js'
import { drawMushroomToCanvas } from '../../../utils/draw-mushroom.js'
import { buildRockVertices, buildRockPalette, drawRockToCanvas } from '../../../utils/draw-rock.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as HeroCounter from '../../../utils/hero-counter.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as Rain from '../components/rain.js'
import * as BonusHero from '../components/bonus-hero.js'
import * as LogPlatform from '../components/log-platform.js'
import { getCameraCenterX, getDistanceThreshold, isWithinDistance } from '../utils/scene-perf.js'
import { onUpdateLesson0GameLoop, drawL0Birds } from '../utils/lesson0-runtime.js'
//
// Bug constants (from bugs.js)
//
const BUG_BODY_SIZE = 6
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const PLAY_AREA_BOTTOM_TRIM = 100
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin + PLAY_AREA_BOTTOM_TRIM
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// End-of-level hint shown at the top during the gather phase (bugs flying to hero).
// Pressing Space or Enter advances immediately; shows countdown from 15 seconds.
//
const L0_GATHER_PROMPT_BASE = 'Press Space or Enter to continue... '
const L0_END_TEXT_Y = TOP_MARGIN + 62
const L0_END_TEXT_FONT = 26
//
// Prompt shown at the top after hero death.
// Player can press Space or Enter to restart; auto-restarts after 7 s.
// Countdown number is appended inline after the three dots, same color as the text.
//
const L0_DEATH_PROMPT_BASE = 'Press Space or Enter to continue... '
const L0_DEATH_PROMPT_Y = TOP_MARGIN + 62
const L0_DEATH_PROMPT_FONT = 22
//
// Rounded corner configuration
//
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'touch0-corner-sprite'
//
// Letterbox / wall tint is the darkest end of the cool side of the
// teal+orange complementary palette so the playfield never breaks the
// composition with a neutral grey frame.
//
const WALL_COLOR_HEX = '#152528'
//
// RGB form of WALL_COLOR_HEX used in inline k.color()/k.rgb() calls
// (Kaplay's color components are RGB integers, not hex strings).
//
const WALL_COLOR_R = 21
const WALL_COLOR_G = 37
const WALL_COLOR_B = 40
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
//
// Thorn mesh sits this many px above FLOOR_Y (lower value = spikes sit closer to the soil line).
//
const FLOOR_THORN_RAISE_OFFSET = 1
const FLOOR_THORN_CLUSTER_MIN = 70
const FLOOR_THORN_CLUSTER_EXTRA = 140
const FLOOR_THORN_GAP_MIN = 80
const FLOOR_THORN_GAP_EXTRA = 140
const FLOOR_THORN_EDGE_INSET = 40
//
// Bottom of hero hitbox for spike overlap — matches hero.js COLLISION_HEIGHT + COLLISION_OFFSET_Y (anchor center).
//
const HERO_HITBOX_HEIGHT_FOR_THORNS = 69
const HERO_HITBOX_OFFSET_Y_FOR_THORNS = 3
const HERO_HALF_WIDTH_THORNS = 15
//
// Broad vertical gate for thorn checks (feet Y vs floor line); precise hit uses per-spike geometry below.
//
const FLOOR_THORN_FEET_TOLERANCE_LOW = 28
const FLOOR_THORN_FEET_TOLERANCE_HIGH = 12
//
// Feet must reach slightly past the spike tip (into the stake mesh); no kill zone above the tip while jumping over.
//
const FLOOR_THORN_FEET_MIN_PENETRATION_PAST_TIP = 2
//
// Collision tip sits slightly lower than mesh tip so landing reads as contact with visible steel (see jungle-decor drawThorns).
//
const FLOOR_THORN_COLLISION_TIP_BIAS_DOWN = 14
const FLOOR_THORN_FEET_BELOW_BASE_PAD = 10
//
// Death animation — firefly burst and 10-second restart countdown
//
const DEATH_FIREFLY_COUNT = 22
const DEATH_FIREFLY_BURST_SPEED_MIN = 80
const DEATH_FIREFLY_BURST_SPEED_MAX = 220
const DEATH_FIREFLY_DRAG = 0.982
const DEATH_FIREFLY_LIFETIME = 5.0
const DEATH_COUNTDOWN_SECONDS_L0 = 7
//
// Z: floor + trap thorns above grass (20) and rocks (7), below hinged trees (25).
//
const L0_FLOOR_THORN_DRAW_Z = 27
//
// Parallax ladder (Kaplay z, larger draws above): far circles, far grey organics, grey-leaf mid band,
// black-leaf mid band, birds, baked front bushes/static circles z=7, grass z=20,
// dim duplicate organics z=23 under hinged sway z=25.
//
const L0_PARALLAX_FAR_CIRCLE_Z = 2
const L0_PARALLAX_FAR_ORGANIC_Z = 3
const L0_PARALLAX_GREY_LEAF_ROW_Z = 4
const L0_PARALLAX_BLACK_LEAF_ROW_Z = 5
const L0_BIRD_LAYER_Z = 6
const L0_PARALLAX_FRONT_STATIC_Z = 7
//
const L0_FRONT_ORGANIC_DARK_BACKDROP_Z = 23
const L0_FRONT_ORGANIC_DYNAMIC_Z = 25
//
const L0_FRONT_ORGANIC_DARK_DIM_RGB = 0.38
const L0_FRONT_ORGANIC_DARK_BACKDROP_OPACITY_SCALE = 0.88
//
// Dark static organic silhouettes on back parallax — tinted like Touch L1 back row (far/near fog).
//
const L0_BACK_ORGANIC_MID_COUNT = 9
//
// Extra back row: smaller + heavier dim so it reads clearly behind the mid silhouettes.
//
const L0_BACK_ORGANIC_FAR_COUNT = 15
const L0_BACK_ORGANIC_FAR_HEIGHT_SCALE = 0.78
//
// Far circle crowns sit on the cool side of the complementary palette —
// muted teal so the deepest parallax band reads as cold distance fog
// rather than neutral grey.
//
const L0_CLOUD_CIRCLE_R = 32
const L0_CLOUD_CIRCLE_G = 60
const L0_CLOUD_CIRCLE_B = 68
const L0_CLOUD_CIRCLE_BLEND_FAR = 0.9
const L0_CLOUD_CIRCLE_BLEND_NEAR = 0.74
//
// Far-back organic silhouettes (behind mid bands): heavier grey fog than before.
//
const L0_BACK_ORGANIC_GREY_BLEND_FAR = 0.96
const L0_BACK_ORGANIC_GREY_BLEND_NEAR = 0.90
//
// Mid-depth organic bands: grey row farther / taller / denser than black; explicit neutrals (no brown tint).
//
const L0_GREY_LEAF_ROW_COUNT = 24
const L0_BLACK_LEAF_ROW_COUNT = 14
const L0_GREY_LEAF_ROW_SLOT_BIAS = 0.38
const L0_BLACK_LEAF_ROW_SLOT_BIAS = 0.42
//
// Leafy "grey" mid band — mid-distance silhouettes. Sit BETWEEN the
// LIGHT back haze and the darker black-leaf row in the brightness
// gradient (atmospheric perspective: lighter the further from
// camera). Cool teal tone keeps them on the complementary palette's
// cool half.
//
const L0_GREY_ORGANIC_TRUNK_R = 60
const L0_GREY_ORGANIC_TRUNK_G = 92
const L0_GREY_ORGANIC_TRUNK_B = 108
const L0_GREY_ORGANIC_LEAF_R = 70
const L0_GREY_ORGANIC_LEAF_G = 105
const L0_GREY_ORGANIC_LEAF_B = 122
const L0_GREY_ORGANIC_JITTER = 4
const L0_BLACK_LEAF_SILHOUETTE_DIM = 0.72
//
// "Black" mid band — closer to camera than grey-leaf row, so darker
// (lighter farther principle) but still tinted cool so distant
// silhouettes don't drift back to neutral grey.
//
const L0_BLACK_ORGANIC_TRUNK_R = 30
const L0_BLACK_ORGANIC_TRUNK_G = 52
const L0_BLACK_ORGANIC_TRUNK_B = 62
const L0_BLACK_ORGANIC_LEAF_R = 36
const L0_BLACK_ORGANIC_LEAF_G = 60
const L0_BLACK_ORGANIC_LEAF_B = 70
//
// After fog tint, darken organic back silhouettes so they read between circle trees and swaying front row.
//
const L0_BACK_ORGANIC_SILHOUETTE_DIM = 0.26
const L0_BACK_ORGANIC_FAR_SILHOUETTE_DIM = 0.12
const L0_BACK_SIMPLE_TREE_COUNT = 22
//
// Parallax vertical bands: farther from camera uses more negative Y so crowns sit higher.
//
const L0_PARALLAX_BACK_Y_OFFSET = -78
const L0_PARALLAX_GREY_LEAF_Y_OFFSET = -160
const L0_PARALLAX_BLACK_LEAF_Y_OFFSET = -68
const L0_PARALLAX_FRONT_Y_OFFSET = -12
//
const L0_PARALLAX_BACK_SCALE = 1.52
const L0_PARALLAX_GREY_LEAF_SCALE = 1.34
const L0_PARALLAX_BLACK_LEAF_SCALE = 0.88
const L0_PARALLAX_FRONT_SCALE = 0.52
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
// Floor hazards: rusted metal spikes, pulled to a vibrant orange so they
// glow as the warm complement against the teal playfield. The hue still
// reads as oxidised iron, just on the orange side of red.
//
//
// Bright aqua-teal spikes — visible on the dark playfield while staying in the touch palette
//
const FLOOR_THORN_BLADE_FILL_R = 130
const FLOOR_THORN_BLADE_FILL_G = 205
const FLOOR_THORN_BLADE_FILL_B = 215
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
// Life trap — first trap (spike adds) and second trap (bug4 starts moving)
//
const LIFE_DEDUCT_THRESHOLD = 5
const LIFE_DEDUCT_FLAG = 'touch.trapAdded'
//
// Grace-period flag: hero gets one free attempt before trap1 dialog fires.
//
const LIFE_DEDUCT_VISITED_FLAG = 'touch.trapVisited'
//
// Second trap: the bug on which the anti-hero stands starts moving slowly.
// Triggers when the first trap is already set AND lifeScore >= TRAP2_THRESHOLD.
//
const TRAP2_THRESHOLD = 5
const TRAP2_FLAG = 'touch.trapAdded2'
const TRAP2_VISITED_FLAG = 'touch.trapVisited2'
const TRAP2_BUG_SPEED = 10
//
// Flat playfield fill — deep teal, the dominant cool half of the
// teal+orange complementary scheme. Same darkness band as the previous
// neutral grey so contrast against hero/foreground silhouettes is
// preserved, only the hue shifts.
//
const L0_PLAYFIELD_BG_HEX = '#1C323A'
const L0_PLAYFIELD_BG_R = 28
const L0_PLAYFIELD_BG_G = 50
const L0_PLAYFIELD_BG_B = 58
//
// Monster conversation system (context-aware per-act dialogue between 3 monsters)
//
const MONSTER_CHARS_PER_SECOND = 12
const MONSTER_MIN_DISPLAY_TIME = 2.5
const MONSTER_PAUSE_BETWEEN = 1.0
const MONSTER_ACTS = [
  {
    key: 'touch.monstersTalkedT',
    condition: () => true,
    delay: 20,
    lines: [
      { speaker: 0, text: "That little one again.\nDoes he even know\nwhat 'touch' is?" },
      { speaker: 1, text: "Doubt it. Look how\nhe walks. Like a\nconfused potato" },
      { speaker: 2, text: "Potatoes can't walk.\nThat's the whole\nproblem with potatoes" }
    ]
  },
  {
    key: 'touch.monstersTalkedO',
    condition: () => true,
    delay: 5,
    lines: [
      { speaker: 1, text: "The fireflies like him.\nThey have terrible\ntaste in friends" },
      { speaker: 2, text: "Those bugs trust him.\nThey also eat dirt.\nSo." },
      { speaker: 0, text: "Maybe tiny is growing.\nOr maybe he just\nsmells better now" }
    ]
  },
  {
    key: 'touch.monstersTalkedU',
    condition: () => true,
    delay: 5,
    lines: [
      { speaker: 2, text: "He's collecting letters.\nAt that speed he'll\nfinish in... decades" },
      { speaker: 0, text: "We could just give\nhim the letters.\nBut where's the fun?" },
      { speaker: 1, text: "Honestly? I'm rooting\nfor him a little.\nDon't tell the others" }
    ]
  },
  {
    key: 'touch.monstersTalkedC',
    condition: () => true,
    delay: 5,
    lines: [
      { speaker: 0, text: "Do you think he\nknows we're watching?" },
      { speaker: 2, text: "Of course not.\nHumans never look up.\nThat's their thing." },
      { speaker: 1, text: "If he finishes,\nwe might actually\nhave to work" }
    ]
  }
]
const MONSTER_IDLE_CHECK_INTERVAL = 3.0
//
// Hero reaction when a bug crawls onto him: short meow + crouch pose
//
const HERO_BUG_CROUCH_DURATION = 0.45
//
// TOUCH indicator tooltip
//
const TOUCH_INDICATOR_TOOLTIP_TEXT = "Here you can see how far\nyou have come in learning touch"
const TOUCH_INDICATOR_TOOLTIP_WIDTH = 250
const TOUCH_INDICATOR_TOOLTIP_HEIGHT = 50
const TOUCH_INDICATOR_TOOLTIP_Y_OFFSET = -30
//
const ANTIHERO_TOOLTIP_TEXT = "Try to reach me"
const ANTIHERO_TOOLTIP_HOVER_WIDTH = 80
const ANTIHERO_TOOLTIP_HOVER_HEIGHT = 60
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
//
// Hero tooltip (raised higher so it sits above bug tooltips)
//
const HERO_TOOLTIP_TEXT = "I must find myself..."
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -100
//
// Small hero and life icon tooltips (appear below)
//
const SMALL_HERO_TOOLTIP_TEXT = "Your fragments"
const SMALL_HERO_TOOLTIP_SIZE = 60
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_TEXT = "Your experience"
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50
//
// Floor thorns tooltip
//
const FLOOR_THORNS_TOOLTIP_TEXT = "Try to touch me"
const FLOOR_THORNS_TOOLTIP_HEIGHT = 40
const FLOOR_THORNS_TOOLTIP_Y_OFFSET = -30
//
// Bird tooltip
//
const BIRD_TOOLTIP_TEXT = "I belieeeve I can flyyyy"
const BIRD_TOOLTIP_HOVER_SIZE = 40
const BIRD_TOOLTIP_Y_OFFSET = -30
//
// Small bug random phrases (shown as speech bubbles with long pauses)
//
const BUG_PHRASE_MIN_PAUSE = 50
const BUG_PHRASE_EXTRA_PAUSE = 40
const BUG_PHRASE_CHARS_PER_SECOND = 12
const BUG_PHRASE_MIN_DISPLAY_TIME = 2.5
const BUG_PHRASE_Y_OFFSET = -40
const SMALL_BUG_PHRASES = [
  "I'm on a strict diet:\nzero responsibilities",
  "my hobbies include\navoiding decisions",
  "I told myself a joke.\nI'm still buffering",
  "I'm not lost.\nI'm exploring\npolicy loopholes",
  "confidence level:\ndownloading…",
  "I multitask:\nI worry while\nI procrastinate",
  "I'm basically\na walking typo",
  "my plans are flexible.\nthey're mostly vapor",
  "I'm saving my energy\nfor a dramatic exit",
  "I don't fall apart.\nI stage a retreat",
  "my calm is 90%\ncaffeine and denial",
  "I journal.\nMostly receipts",
  "boundaries?\nI draw them\nin invisible ink",
  "I thrive in chaos.\nI'm houseplants",
  "I'm not late.\nI'm building suspense",
  "I'm zen.\nAs in zero\nenergy noodles",
  "I delegate.\nTo future me.\nHe's furious",
  "my spirit animal\nis a loading spinner"
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
const TRAP_PROXIMITY_RADIUS = 180
const TRAP_AMBIENT_SOUND_INTERVAL = 2.0
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
//
// Dirt particles that burst from ground when tentacles emerge.
// Visually match the hero's landing dust (rect + black outline, gravity).
//
const DIRT_PARTICLE_COUNT_PER_SPIKE = 6
const DIRT_PARTICLE_SPEED_MIN = 80
const DIRT_PARTICLE_SPEED_MAX = 160
const DIRT_PARTICLE_LIFETIME = 0.5
const DIRT_PARTICLE_SIZE = 6
const DIRT_PARTICLE_GRAVITY = 600
//
// Dirt thrown when tentacles burst out — warm orange-brown so the burst
// reads as on-palette earth instead of muddy grey.
//
const DIRT_PARTICLE_COLOR_R = 160
const DIRT_PARTICLE_COLOR_G = 97
const DIRT_PARTICLE_COLOR_B = 44
//
// Trap tentacle spikes — hotter orange than the static floor thorns so
// fast-rising hazards read as urgent fire-warning hue.
//
const TRAP_SPIKE_FILL_R = 240
const TRAP_SPIKE_FILL_G = 128
const TRAP_SPIKE_FILL_B = 48
const TRAP_TOOLTIP_TEXT = "Surprise!"
const TRAP_TOOLTIP_Y_OFFSET = -30
//
// Anti-hero platform (right side, above hero height)
//
const HERO_HEIGHT = 96  // SPRITE_SIZE (32) * HERO_SCALE (3)
//
// Raised so letter O is only reachable via firefly platform (not a normal jump from floor)
//
const ANTIHERO_PLATFORM_Y = FLOOR_Y - HERO_HEIGHT - 165  // Well above hero jump reach
//
// Decorative culling and atmosphere activation (multiples of viewport width)
//
const L0_CULL_SCREEN_MULT = 2
const L0_ATMOSPHERE_SCREEN_MULT = 1.5
//
// TOUCH letter pickup system constants
//
const TOUCH_LETTER_SIZE = 68
const TOUCH_LETTER_COLLECT_RADIUS = 58
const TOUCH_LETTER_T_X_OFFSET = 190
//
// Teal color matching TOUCH HUD letters (#5A8898)
//
const TOUCH_LETTER_COLOR_R = 90
const TOUCH_LETTER_COLOR_G = 136
const TOUCH_LETTER_COLOR_B = 152
//
// Outline thickness (same as lesson-indicator.js)
//
const TOUCH_LETTER_OUTLINE = 2
//
// Fade pulse: opacity cycles between MIN and 1.0
//
const TOUCH_LETTER_PULSE_SPEED = 1.8
const TOUCH_LETTER_PULSE_MIN = 0.35
//
// Letter tilts (degrees): alternating lean per letter
//
const TOUCH_LETTER_TILTS = [-8, 12, 6, -5]
//
// Tilt for the H letter (paired with C) and opacity for the semi-transparent U letter
//
const TOUCH_LETTER_TILT_H = 7
const TOUCH_U_LETTER_OPACITY = 0.50
//
// Horizontal gap between the C and H letters when displayed together
//
const TOUCH_CH_SPACING = 72
const TOUCH_FIREFLY_FLEE_RADIUS = 195
const TOUCH_FIREFLY_FOLLOW_DIST = 85
//
// Radius within which a hero touch collects an individual firefly
//
const TOUCH_FIREFLY_TOUCH_RADIUS = 35
const TOUCH_FIREFLY_PLATFORM_FORM_DIST = 380
const TOUCH_FIREFLY_PLATFORM_W = 155
const TOUCH_FIREFLY_PLATFORM_H = 20
//
// Platform height above floor
//
const TOUCH_FIREFLY_PLATFORM_Y_ABOVE_FLOOR = 115
//
// Precomputed absolute Y of the firefly platform center
//
const TOUCH_FIREFLY_PLATFORM_ACTUAL_Y = FLOOR_Y - TOUCH_FIREFLY_PLATFORM_Y_ABOVE_FLOOR
//
// Side offset of firefly platform from the monster center (in px)
//
const TOUCH_FIREFLY_PLATFORM_SIDE_OFFSET = 85
//
// How many seconds the firefly platform stays before dissolving back to follow mode
//
const TOUCH_FIREFLY_PLATFORM_DURATION = 5
//
// Max height fireflies can reach in normal flight modes. Platform mode bypasses this bound
// so fireflies can still form a platform above tree crown level.
//
const TOUCH_FIREFLY_MAX_HEIGHT_ABOVE_FLOOR = 90
//
// Extra pixels beyond the half-screen to still draw fireflies (avoids pop-in at edges)
//
const L0_FIREFLY_DRAW_MARGIN = 120
//
// Firefly counter font size (position offsets live in utils/hero-counter.js)
//
const TOUCH_FIREFLY_COUNTER_FONT = 22
//
// Log platform dimensions for U letter (same height as bonus-hero log)
//
//
// Log platform dimensions (halved width per design; height = log diameter)
//
const TOUCH_LOG_PLATFORM_W = 82
const TOUCH_LOG_PLATFORM_H = 28
//
// How many pixels lower the U log platform is placed vs ANTIHERO_PLATFORM_Y
//
const TOUCH_U_PLATFORM_Y_LOWER = 120
//
// How many extra pixels the U letter sits below the platform top surface
//
const TOUCH_U_LETTER_Y_EXTRA = 10
//
// How many pixels lower the C log platform is placed vs ANTIHERO_PLATFORM_Y
//
const TOUCH_C_PLATFORM_Y_LOWER = 50
const TOUCH_HIDDEN_PLATFORM_W = 165
const TOUCH_HIDDEN_PLATFORM_H = 22
//
// X-distance from hero within which bugs stop approaching and just walk near him
//
const TOUCH_BUG_GATHER_NEAR_DIST = 150
//
// Distance threshold for monster bugs to stop approaching the hero
//
const TOUCH_MONSTER_GATHER_NEAR_DIST = 200
//
// Speed at which monster bugs walk toward the hero during gather phase
//
const TOUCH_MONSTER_GATHER_SPEED = 65
//
// Velocity threshold below which the hero is considered idle
//
const TOUCH_GATHER_HERO_IDLE_VEL_THRESHOLD = 5
//
// Random interval range (seconds) between ambient bug cheer sounds during gather phase
//
const TOUCH_GATHER_SOUND_INTERVAL_MIN = 0.35
const TOUCH_GATHER_SOUND_INTERVAL_MAX = 1.1
//
// How long to wait after all bugs have arrived near the hero before transitioning
//
const TOUCH_GATHER_POST_ARRIVE_DELAY = 15
//
// Fallback: force transition after this many seconds even if bugs haven't all arrived
//
const TOUCH_GATHER_MAX_WAIT = 40
//
// How many pixels the O letter's bottom sits below the monster head top edge
//
const TOUCH_LETTER_O_Y_OFFSET = 17
//
// Y tolerance for hero-on-platform detection (hero bottom vs platform top)
//
//
// Offset from hero center to its physics foot (matches hero.js COLLISION_HEIGHT/2 + COLLISION_OFFSET_Y)
//
const HERO_FOOT_OFFSET_Y = 37.5
const ANTIHERO_PLATFORM_DETECT_Y_TOL = 30
//
// X half-width tolerance for hero-on-platform detection
//
const ANTIHERO_PLATFORM_DETECT_HALF_W = 130
//
// TOUCH letter dialog texts. All use Kaplay inline style tag [hl]...[/hl] for the yellow letter.
// Lines are kept to ~20-28 visible characters each for a balanced dialog layout.
//
const TOUCH_DIALOG_T = "[hl]T[/hl]rust cannot be taken. It must\nbe earned. The fireflies follow\nyou now. Collect them all, then\nfollow the low monster."
const TOUCH_DIALOG_O = "The world has always been\nspeaking. You just started\nnoticing. [hl]O[/hl]bservation is not\na gift — it is attention."
const TOUCH_DIALOG_U = "Five bugs together become\nsomething more. You did not\ngain power — you [hl]U[/hl]nderstood\nhow things connect when\nyou give them space to meet."
const TOUCH_DIALOG_C = "The world acts as one whole.\n[hl]C[/hl]onnection and [hl]H[/hl]armony\nwere always here.\nNow you are part of them."
//
// Clean (tag-free) versions used in the goal panel so [hl] markup is not shown as literals
//
const TOUCH_GOAL_TEXT_T = "Trust is earned, not taken.\nThe fireflies follow you now.\nCollect them all, then follow\nthe low monster."
const TOUCH_GOAL_TEXT_O = "The world has always been\nspeaking. You just started\nnoticing. Look carefully —\nnot everything is visible\nat first glance."
const TOUCH_GOAL_TEXT_U = "Five bugs together become\nsomething more. Gather them in\none spot and wait. They form a\nplatform — connection you\nrecognized. Touch connects."
const TOUCH_GOAL_TEXT_C = "The world acts as one whole.\nConnection and Harmony\nwere always here.\nNow you are part of them."
/**
 * Level 0 scene for touch section - Introduction level
 * Large game area with minimal obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLesson0(k) {
  k.scene("lesson-touch.0", () => {
    //
    // Reset life score when entering from a different section.
    // Uses lastSection key (not lastLevel) so the check survives section-complete pre-routing.
    // heroScore is always read from localStorage and is not reset here.
    //
    if (get('lastSection', null) !== 'touch') {
      set('lifeScore', 0)
    }
    set('lastSection', 'touch')
    //
    // Snapshot life score at level entry so it can be restored on completion
    // — deaths within a level do not carry over to the next one.
    //
    const initialLifeScore = get('lifeScore', 0)
    //
    // Touch level 0 starts with 3 fragments for HELP tutorial
    //
    const TOUCH_L0_START_FRAGMENTS = 3
    set('heroScore', TOUCH_L0_START_FRAGMENTS)
    //
    // Save progress
    //
    set('lastLesson', 'lesson-touch.0')
    //
    // Set background to match wall color (prevents visible bars at top/bottom)
    //
    //
    // Sync canvas + CSS backdrop to wall color (the top/bottom platform strips
    // visible at the edge of the viewport are drawn with WALL_COLOR).
    //
    CanvasBackdrop.applyCanvasBackdrop(k, WALL_COLOR_HEX)
    k.onSceneLeave(() => {
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
    // Start touch.mp3 background music
    //
    const touchMusic = k.play('touch', {
      loop: true,
      volume: CFG.audio.backgroundMusic.touch
    })
    //
    // Audio references for cleanup on scene leave
    //
    const rainRef = { stop: null }
    //
    // Stop music and ambient sounds when leaving the scene (death, ESC, transition)
    //
    k.onSceneLeave(() => {
      touchMusic.stop()
      rainRef.stop?.()
    })
    //
    // Draw background
    //
    k.onDraw(() => {
      k.drawRect({
        width: k.width(),
        height: k.height(),
        pos: k.vec2(0, 0),
        color: k.rgb(L0_PLAYFIELD_BG_R, L0_PLAYFIELD_BG_G, L0_PLAYFIELD_BG_B)
      })
    })
    //
    // Create dark background clouds in the distance at the top
    //
    createScrollingCloudBand(k, {
      areaLeft: LEFT_MARGIN,
      areaRight: CFG.visual.screen.width - RIGHT_MARGIN,
      cloudTopY: TOP_MARGIN + 20,
      cloudBottomY: TOP_MARGIN + 100,
      cloudCount: isTouchDevice() ? 14 : 18,
      cloudRandomness: 20,
      baseCloudColor: k.rgb(L0_CLOUD_CIRCLE_R, L0_CLOUD_CIRCLE_G, L0_CLOUD_CIRCLE_B)
    })
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
    //
    // Hero body color. Default silver `#C0C0C0` is the achromatic
    // neutral the entire section pairs against (the anti-hero and the
    // touch-completion identity color become its teal complement). When
    // the player has finished a section, the hero adopts that section's
    // identity colour: teal for touch, orange for time, red for word.
    //
    const heroBodyColor = CFG.visual.colors.sections.touch.antiHero
    //
    // Create level indicator (TOUCH letters)
    //
    const levelIndicator = LevelIndicator.create({
      k,
      levelNumber: -1,
      //
      // TOUCH letters tint matches the new section identity (steel teal),
      // so the HUD agrees with the in-game anti-hero / touch-completed
      // hero progression colour.
      //
      activeColor: '#5A8898',
      inactiveColor: '#B0B0B0',
      completedColor: '#5A8898',
      heroBodyColor,
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN
    })
    const levelHelpInst = LevelHelp.create({
      k,
      levelName: 'lesson-touch.0',
      sideWallWidth: LEFT_MARGIN,
      floorY: FLOOR_Y,
      levelIndicator,
      sound,
      sceneBackdropHex: WALL_COLOR_HEX
    })
    TouchControls.create({
      k,
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN
    })
    //
    // Life deduction intro: show once when lifeScore reaches threshold for the first time
    //
    const currentLifeScore = get('lifeScore', 0)
    const trapAlreadyAdded = get(LIFE_DEDUCT_FLAG, false)
    const trap1AlreadyVisited = get(LIFE_DEDUCT_VISITED_FLAG, false)
    const trap1Eligible = !trapAlreadyAdded && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    //
    // Grace period: first visit marks visited flag, second visit shows dialog.
    //
    let showTrap = false
    if (trap1Eligible && !trap1AlreadyVisited) {
      set(LIFE_DEDUCT_VISITED_FLAG, true)
    } else if (trap1Eligible && trap1AlreadyVisited) {
      showTrap = true
      set(LIFE_DEDUCT_VISITED_FLAG, false)
    }
    //
    // Second trap detection — mirrors the level 1 visited/eligible pattern
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
    // Prevent two correction dialogs in the same level entry — defer trap2 if trap1 also shows
    //
    if (showTrap && showTrap2) {
      showTrap2 = false
      set(TRAP2_VISITED_FLAG, false)
    }
    const trap2Active = showTrap2 || trap2AlreadyAdded
    //
    // Trap badge: 0, 1 or 2
    //
    const trapCount = trap2Active ? 2 : (showTrap || trapAlreadyAdded) ? 1 : 0
    levelIndicator.updateTrapCount(trapCount)
    //
    // Scene-level lock: hero controls are disabled during the life deduction animation
    //
    const sceneLock = { locked: showTrap || showTrap2 }
    if (showTrap) {
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        sceneLock,
        noDeduct: true,
        hideScore: true,
        introTextOverride: 'Life made corrections.',
        resultTextOverride: 'Learn this lesson.',
        sceneBgRgb: { r: WALL_COLOR_R, g: WALL_COLOR_G, b: WALL_COLOR_B },
        textColorRgb: { r: 90, g: 136, b: 152 }
      })
    }
    if (showTrap2) {
      const trap2Delay = showTrap ? LifeDeduction.TOTAL_DURATION + 0.5 : 0
      k.wait(trap2Delay, () => {
          LifeDeduction.show({
          k,
          currentScore: get('lifeScore', 0),
          levelIndicator,
          sound,
          deductFlag: TRAP2_FLAG,
          sceneLock,
          noDeduct: true,
          hideScore: true,
          introTextOverride: 'Life made corrections.',
          resultTextOverride: 'Learn this lesson.',
          sceneBgRgb: { r: WALL_COLOR_R, g: WALL_COLOR_G, b: WALL_COLOR_B },
          textColorRgb: { r: 90, g: 136, b: 152 }
        })
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
      k.color(WALL_COLOR_R, WALL_COLOR_G, WALL_COLOR_B),
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
    // Guarantee at least one thorn is always present
    //
    if (floorThornData.length === 0) {
      const safeX = (floorThornStartX + floorThornEndX) / 2
      floorThornData.push({
        x: safeX,
        baseY: floorThornBaseY,
        width: (FLOOR_THORN_WIDTH_MIN + FLOOR_THORN_WIDTH_MAX) / 2,
        height: (FLOOR_THORN_HEIGHT_MIN + FLOOR_THORN_HEIGHT_MAX) / 2,
        tipOffset: 0
      })
    }
    //
    //
    // Draw thorns above baked scenery (z=7), rocks (z=7), grass (z=20); below hinged trees (25).
    //
    createFloorThornSprite(
      k,
      floorThornData,
      k.rgb(FLOOR_THORN_BLADE_FILL_R, FLOOR_THORN_BLADE_FILL_G, FLOOR_THORN_BLADE_FILL_B),
      L0_FLOOR_THORN_DRAW_Z
    )
    //
    // Anti-hero platform position (for reference - will be replaced by bug)
    // Note: platformCenterX is defined later when creating bug4
    //
    //
    // Create grass/bushes/trees decoration with parallax depth layers
    //
    const grassY = FLOOR_Y - 2
    const playableWidth = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
    const bgColor = { r: L0_PLAYFIELD_BG_R, g: L0_PLAYFIELD_BG_G, b: L0_PLAYFIELD_BG_B }
    //
    // Same fog tint as Touch level 1 back-row circle trees (trunk + leaf RGB pulled toward scene grey).
    //
    const tintKapRgbTowardBg = (kapRgb, amount) => k.rgb(
      Math.round(kapRgb.r * (1 - amount) + bgColor.r * amount),
      Math.round(kapRgb.g * (1 - amount) + bgColor.g * amount),
      Math.round(kapRgb.b * (1 - amount) + bgColor.b * amount)
    )
    //
    const tintLeafRgbTowardBg = (leaf, amount) => {
      leaf.r = Math.round(leaf.r * (1 - amount) + bgColor.r * amount)
      leaf.g = Math.round(leaf.g * (1 - amount) + bgColor.g * amount)
      leaf.b = Math.round(leaf.b * (1 - amount) + bgColor.b * amount)
    }
    //
    // Far circle crowns only — blend palette toward cloud grey (Touch L1 scrolling clouds).
    //
    const tintKapRgbTowardCloudCircle = (kapRgb, amount) => k.rgb(
      Math.round(kapRgb.r * (1 - amount) + L0_CLOUD_CIRCLE_R * amount),
      Math.round(kapRgb.g * (1 - amount) + L0_CLOUD_CIRCLE_G * amount),
      Math.round(kapRgb.b * (1 - amount) + L0_CLOUD_CIRCLE_B * amount)
    )
    //
    // Four depth bands: far circles + far grey organics, grey-leaf mid, black-leaf mid, colorful front.
    //
    const layers = []
    const layerConfigs = [
      {
        name: 'back',
        colorMix: 0.2,
        opacity: 1.0,
        yOffset: L0_PARALLAX_BACK_Y_OFFSET,
        scale: L0_PARALLAX_BACK_SCALE
      },
      {
        name: 'greyLeaf',
        colorMix: 0.55,
        opacity: 1.0,
        yOffset: L0_PARALLAX_GREY_LEAF_Y_OFFSET,
        scale: L0_PARALLAX_GREY_LEAF_SCALE
      },
      {
        name: 'blackLeaf',
        colorMix: 0.55,
        opacity: 1.0,
        yOffset: L0_PARALLAX_BLACK_LEAF_Y_OFFSET,
        scale: L0_PARALLAX_BLACK_LEAF_SCALE
      },
      {
        name: 'front',
        colorMix: 1.0,
        opacity: 0.95,
        yOffset: L0_PARALLAX_FRONT_Y_OFFSET,
        scale: L0_PARALLAX_FRONT_SCALE
      }
    ]
    
    for (let layerIndex = 0; layerIndex < layerConfigs.length; layerIndex++) {
      const config = layerConfigs[layerIndex]
      const colorMix = config.colorMix
      const baseOpacity = config.opacity
      const yOffset = config.yOffset
      const scale = config.scale
      //
      // Depth rows (camera → back): front colorful; mid black/grey organics; far circles + grey organics.
      //
      //
      // All parallax layers use neutral-cool tones mixed toward the teal background.
      // The warm amber/orange override for the front layer was removed to eliminate
      // the yellow grass appearance.
      //
      const grassBaseR = 50 * colorMix + bgColor.r * (1 - colorMix)
      const grassBaseG = 80 * colorMix + bgColor.g * (1 - colorMix)
      const grassBaseB = 50 * colorMix + bgColor.b * (1 - colorMix)

      const bushBaseR = 35 * colorMix + bgColor.r * (1 - colorMix)
      const bushBaseG = 55 * colorMix + bgColor.g * (1 - colorMix)
      const bushBaseB = 35 * colorMix + bgColor.b * (1 - colorMix)

      const treeLeafR = 12 * colorMix + bgColor.r * (1 - colorMix)
      const treeLeafG = 16 * colorMix + bgColor.g * (1 - colorMix)
      const treeLeafB = 12 * colorMix + bgColor.b * (1 - colorMix)

      const treeTrunkR = 10 * colorMix + bgColor.r * (1 - colorMix)
      const treeTrunkG = 10 * colorMix + bgColor.g * (1 - colorMix)
      const treeTrunkB = 10 * colorMix + bgColor.b * (1 - colorMix)
      //
      // Generate grass blade data for this layer.
      // Back/middle layers stay uniform-but-sparse for atmospheric haze.
      // The FRONT layer uses cluster-based growth so grass doesn't carpet
      // the whole platform — instead it clumps in patches with bare soil
      // between (more roots, rocks, moss can show through).
      //
      const grassBlades = []
      if (layerIndex === 3) {
        //
        // Front layer: organic patches (fewer on touch devices)
        //
        const touchMode = isTouchDevice()
        const clusterCount = touchMode
          ? 2 + Math.floor(Math.random() * 2)
          : 6 + Math.floor(Math.random() * 4)
        for (let c = 0; c < clusterCount; c++) {
          let centerX = LEFT_MARGIN + 80 + Math.random() * (playableWidth - 160)
          let safety = 0
          while (
            Math.abs(centerX - HERO_SPAWN_X) < HERO_SPAWN_GRASS_THORN_EXCLUDE_HALF_WIDTH &&
            safety < 30
          ) {
            centerX = LEFT_MARGIN + 80 + Math.random() * (playableWidth - 160)
            safety++
          }
          const clusterRadius = 30 + Math.random() * 60
          const bladesInCluster = touchMode
            ? 1 + Math.floor(Math.random() * 3)
            : 4 + Math.floor(Math.random() * 8)
          for (let b = 0; b < bladesInCluster; b++) {
            //
            // Place blades with falloff distribution near the cluster center
            //
            const dist = Math.pow(Math.random(), 1.6) * clusterRadius
            const sign = Math.random() < 0.5 ? -1 : 1
            const baseX = centerX + sign * dist
            grassBlades.push(buildGrassBlade(k, baseX, grassY, scale, baseOpacity, grassBaseR, grassBaseG, grassBaseB))
          }
        }
      } else {
        //
        // Far sheet + mid bands: scattered tufts (grey/black leaf rows slightly sparser than far sheet).
        //
        const touchMode = isTouchDevice()
        const clusterCount = layerIndex === 0
          ? (touchMode ? 7 + Math.floor(Math.random() * 4) : 22 + Math.floor(Math.random() * 12))
          : layerIndex === 1
            ? (touchMode ? 4 + Math.floor(Math.random() * 3) : 13 + Math.floor(Math.random() * 9))
            : layerIndex === 2
              ? (touchMode ? 3 + Math.floor(Math.random() * 3) : 11 + Math.floor(Math.random() * 7))
              : 0
        for (let c = 0; c < clusterCount; c++) {
          let centerX = LEFT_MARGIN + 40 + Math.random() * (playableWidth - 80)
          let safety = 0
          while (
            Math.abs(centerX - HERO_SPAWN_X) < HERO_SPAWN_GRASS_THORN_EXCLUDE_HALF_WIDTH &&
            safety < 35
          ) {
            centerX = LEFT_MARGIN + 40 + Math.random() * (playableWidth - 80)
            safety++
          }
          const clusterRadius = layerIndex === 0
            ? 38 + Math.random() * 85
            : layerIndex === 1
              ? 32 + Math.random() * 72
              : 26 + Math.random() * 58
          const bladesInCluster = touchMode
            ? (layerIndex === 0
              ? 2 + Math.floor(Math.random() * 5)
              : layerIndex === 1
                ? 2 + Math.floor(Math.random() * 4)
                : 2 + Math.floor(Math.random() * 3))
            : (layerIndex === 0
              ? 5 + Math.floor(Math.random() * 14)
              : layerIndex === 1
                ? 4 + Math.floor(Math.random() * 11)
                : 4 + Math.floor(Math.random() * 9))
          if (!touchMode && Math.random() < 0.08) continue
          if (touchMode && Math.random() < 0.18) continue
          for (let b = 0; b < bladesInCluster; b++) {
            const dist = Math.pow(Math.random(), 1.55) * clusterRadius
            const ang = Math.random() * Math.PI * 2
            const baseX = centerX + Math.cos(ang) * dist * 0.95
            if (baseX < LEFT_MARGIN + 6 || baseX > LEFT_MARGIN + playableWidth - 6) continue
            grassBlades.push(buildGrassBlade(k, baseX, grassY, scale, baseOpacity, grassBaseR, grassBaseG, grassBaseB))
          }
        }
      }
      //
      // Generate bush data for this layer
      // For front layer: don't create bushes separately, will alternate with trees
      //
      const bushes = []
      const bushCount = layerIndex === 3 ? 0 : 0
      
      for (let i = 0; i < bushCount; i++) {
        const spacing = playableWidth / (bushCount + 1)
        const randomness = layerIndex === 0 ? 30 : (layerIndex === 1 ? 50 : 60)
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
      const treeCount = layerIndex === 0 ? L0_BACK_SIMPLE_TREE_COUNT : 0
      
      for (let i = 0; i < treeCount; i++) {
        const spacing = playableWidth / (treeCount - 1)
        const randomness = 20
        const treeX = LEFT_MARGIN + spacing * i + (Math.random() - 0.5) * randomness
        const baseTreeHeight = (120 + Math.random() * 100) * scale
        const crownCenterY = grassY + yOffset - baseTreeHeight
        const trunkTop = crownCenterY
        const trunkBottom = grassY
        const trunkHeight = trunkBottom - trunkTop
        const trunkWidth = (4 + Math.random() * 4) * scale
        const crownSize = (50 + Math.random() * 60) * scale
        
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
        
        //
        // Circle trees only — no underground roots on Touch L0.
        //
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
          rootSegments: [],
          rootColor: k.rgb(L0_TREE_ROOT_COLOR_R, L0_TREE_ROOT_COLOR_G, L0_TREE_ROOT_COLOR_B),
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
          opacity: 0.85 + Math.random() * 0.1,
          swaySpeed: 0.2 + Math.random() * 0.15,
          swayAmount: (1 + Math.random() * 1.5) * scale,
          swayOffset: Math.random() * Math.PI * 2
        }
        if (layerIndex === 0) {
          const cloudBlend = Math.random() < 0.52 ? L0_CLOUD_CIRCLE_BLEND_FAR : L0_CLOUD_CIRCLE_BLEND_NEAR
          tree.trunkColor = tintKapRgbTowardCloudCircle(tree.trunkColor, cloudBlend)
          tree.leafColor = tintKapRgbTowardCloudCircle(tree.leafColor, cloudBlend)
          tree.rootColor = tintKapRgbTowardCloudCircle(tree.rootColor, cloudBlend)
        }
        
        trees.push(tree)
      }
      //
      // Back row organics: farthest sheet paints smaller trees first, then mid silhouettes (+3 vs original).
      //
      if (layerIndex === 0) {
        const backOrganicRows = [
          {
            count: L0_BACK_ORGANIC_FAR_COUNT,
            heightScale: L0_BACK_ORGANIC_FAR_HEIGHT_SCALE,
            dim: L0_BACK_ORGANIC_FAR_SILHOUETTE_DIM,
            slotBias: 0
          },
          {
            count: L0_BACK_ORGANIC_MID_COUNT,
            heightScale: 1,
            dim: L0_BACK_ORGANIC_SILHOUETTE_DIM,
            slotBias: 0.41
          }
        ]
        for (const row of backOrganicRows) {
          for (let oi = 0; oi < row.count; oi++) {
            const slotT = (oi + 1 + row.slotBias) / (row.count + 1)
            let posX = LEFT_MARGIN + playableWidth * slotT + (Math.random() - 0.5) * 44
            if (posX < LEFT_MARGIN + 28 || posX > LEFT_MARGIN + playableWidth - 28) {
              posX = LEFT_MARGIN + playableWidth * slotT
            }
            const baseTreeHeight = (88 + Math.random() * 112) * scale * row.heightScale
            const crownCenterY = grassY + yOffset - baseTreeHeight
            const trunkBottom = grassY
            const trunkActualHeight = baseTreeHeight * (0.52 + Math.random() * 0.12)
            const trunkTop = trunkBottom - trunkActualHeight
            const trunkWidth = (4 + Math.random() * 2.5) * scale
            const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
              includeRoots: false,
              rootAbsoluteMaxY: Math.min(TREE_ROOT_ABSOLUTE_MAX_Y, trunkBottom + L0_ORGANIC_ROOT_DEPTH_MAX),
              rootSegmentsMin: 11,
              rootSegmentsRange: 14
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
            const depthBlend = Math.random() < 0.52 ? L0_BACK_ORGANIC_GREY_BLEND_FAR : L0_BACK_ORGANIC_GREY_BLEND_NEAR
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
              rootColor: k.rgb(L0_TREE_ROOT_COLOR_R, L0_TREE_ROOT_COLOR_G, L0_TREE_ROOT_COLOR_B),
              //
              // Warm-orange seed leaf colour; it then gets heavily blended
              // toward the LIGHT haze tone below so only a faint
              // amber undertone survives in the far parallax silhouettes.
              //
              leafColor: k.rgb(170, 105, 44),
              opacity: 1,
              swaySpeed: 0,
              swayAmount: 0,
              swayOffset: 0
            }
            tree.trunkColor = tintKapRgbTowardCloudCircle(tree.trunkColor, depthBlend)
            tree.leafColor = tintKapRgbTowardCloudCircle(tree.leafColor, depthBlend)
            tree.rootColor = tintKapRgbTowardCloudCircle(tree.rootColor, depthBlend)
            for (const cluster of tree.branchClusters) {
              for (const leaf of cluster.leaves) {
                tintLeafRgbTowardBg(leaf, depthBlend)
              }
            }
            OrganicParallax.dimOrganicTreeColors(tree, row.dim)
            trees.push(tree)
          }
        }
      }
      //
      // Grey-leaf organic band — explicit neutral grey trunk + canopy (reads grey vs brown tint + vs circle crowns).
      //
      if (layerIndex === 1) {
        for (let oi = 0; oi < L0_GREY_LEAF_ROW_COUNT; oi++) {
          const slotT = (oi + 1 + L0_GREY_LEAF_ROW_SLOT_BIAS) / (L0_GREY_LEAF_ROW_COUNT + 1)
          let posX = LEFT_MARGIN + playableWidth * slotT + (Math.random() - 0.5) * 38
          if (posX < LEFT_MARGIN + 24 || posX > LEFT_MARGIN + playableWidth - 24) {
            posX = LEFT_MARGIN + playableWidth * slotT
          }
          const baseTreeHeight = (210 + Math.random() * 140) * scale
          const crownCenterY = grassY + yOffset - baseTreeHeight
          const trunkBottom = grassY
          const trunkActualHeight = baseTreeHeight * (0.52 + Math.random() * 0.12)
          const trunkTop = trunkBottom - trunkActualHeight
          const trunkWidth = (4 + Math.random() * 2.5) * scale
          const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
            includeRoots: false,
            rootAbsoluteMaxY: Math.min(TREE_ROOT_ABSOLUTE_MAX_Y, trunkBottom + L0_ORGANIC_ROOT_DEPTH_MAX),
            rootSegmentsMin: 11,
            rootSegmentsRange: 14
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
          const trunkRgb = jitterL0GreyOrganicRgb(
            L0_GREY_ORGANIC_TRUNK_R,
            L0_GREY_ORGANIC_TRUNK_G,
            L0_GREY_ORGANIC_TRUNK_B
          )
          const leafRgb = jitterL0GreyOrganicRgb(
            L0_GREY_ORGANIC_LEAF_R,
            L0_GREY_ORGANIC_LEAF_G,
            L0_GREY_ORGANIC_LEAF_B
          )
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
            trunkColor: k.rgb(trunkRgb.r, trunkRgb.g, trunkRgb.b),
            rootColor: k.rgb(trunkRgb.r, trunkRgb.g, trunkRgb.b),
            leafColor: k.rgb(leafRgb.r, leafRgb.g, leafRgb.b),
            opacity: 1,
            swaySpeed: 0,
            swayAmount: 0,
            swayOffset: 0
          }
          for (const cluster of tree.branchClusters) {
            for (const leaf of cluster.leaves) {
              leaf.r = leafRgb.r
              leaf.g = leafRgb.g
              leaf.b = leafRgb.b
            }
          }
          trees.push(tree)
        }
      }
      //
      // Black-leaf organic mid band — nearer than grey row, near-black mass reads in front of distant fog.
      //
      if (layerIndex === 2) {
        for (let oi = 0; oi < L0_BLACK_LEAF_ROW_COUNT; oi++) {
          const slotT = (oi + 1 + L0_BLACK_LEAF_ROW_SLOT_BIAS) / (L0_BLACK_LEAF_ROW_COUNT + 1)
          let posX = LEFT_MARGIN + playableWidth * slotT + (Math.random() - 0.5) * 34
          if (posX < LEFT_MARGIN + 24 || posX > LEFT_MARGIN + playableWidth - 24) {
            posX = LEFT_MARGIN + playableWidth * slotT
          }
          const baseTreeHeight = (195 + Math.random() * 130) * scale
          const crownCenterY = grassY + yOffset - baseTreeHeight
          const trunkBottom = grassY
          const trunkActualHeight = baseTreeHeight * (0.52 + Math.random() * 0.12)
          const trunkTop = trunkBottom - trunkActualHeight
          const trunkWidth = (4 + Math.random() * 2.5) * scale
          const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
            includeRoots: false,
            rootAbsoluteMaxY: Math.min(TREE_ROOT_ABSOLUTE_MAX_Y, trunkBottom + L0_ORGANIC_ROOT_DEPTH_MAX),
            rootSegmentsMin: 11,
            rootSegmentsRange: 14
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
            trunkColor: k.rgb(L0_BLACK_ORGANIC_TRUNK_R, L0_BLACK_ORGANIC_TRUNK_G, L0_BLACK_ORGANIC_TRUNK_B),
            rootColor: k.rgb(L0_BLACK_ORGANIC_TRUNK_R, L0_BLACK_ORGANIC_TRUNK_G, L0_BLACK_ORGANIC_TRUNK_B),
            leafColor: k.rgb(L0_BLACK_ORGANIC_LEAF_R, L0_BLACK_ORGANIC_LEAF_G, L0_BLACK_ORGANIC_LEAF_B),
            opacity: 1,
            swaySpeed: 0,
            swayAmount: 0,
            swayOffset: 0
          }
          for (const cluster of tree.branchClusters) {
            for (const leaf of cluster.leaves) {
              leaf.r = L0_BLACK_ORGANIC_LEAF_R
              leaf.g = L0_BLACK_ORGANIC_LEAF_G
              leaf.b = L0_BLACK_ORGANIC_LEAF_B
            }
          }
          OrganicParallax.dimOrganicTreeColors(tree, L0_BLACK_LEAF_SILHOUETTE_DIM)
          trees.push(tree)
        }
      }
      //
      // For front layer: create alternating trees and bushes
      //
      if (layerIndex === 3) {
        //
        // Reduced by ~30% from 17 to 12 trees (fewer elements = more visible depth).
        //
        const totalElements = 12
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
          //
          // Reduced bush probability from 35% to 22% so more trees appear
          //
          const isBush = Math.random() < 0.22
          
          if (isBush) {
            const bushWidth = (30 + Math.random() * 30) * scale
            const bushHeight = (25 + Math.random() * 25) * scale
            const bushCenterY = grassY + yOffset - bushHeight * 0.6
            
            const colorType = Math.floor(Math.random() * 4)
            let baseLeafR, baseLeafG, baseLeafB
            //
            // Autumn bush palette: green, deep yellow, orange-red, dark red
            //
            if (colorType === 0) {
              baseLeafR = 35
              baseLeafG = 65
              baseLeafB = 30
            } else if (colorType === 1) {
              baseLeafR = 130
              baseLeafG = 95
              baseLeafB = 25
            } else if (colorType === 2) {
              baseLeafR = 140
              baseLeafG = 60
              baseLeafB = 25
            } else {
              baseLeafR = 110
              baseLeafG = 35
              baseLeafB = 25
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
            //
            // Front colorful row: tall enough to read as the nearest layer.
            //
            const baseTreeHeight = (160 + Math.random() * 120) * scale
            const crownCenterY = grassY + yOffset - baseTreeHeight
            const trunkBottom = grassY
            const trunkActualHeight = baseTreeHeight * (0.55 + Math.random() * 0.1)
            const trunkTop = trunkBottom - trunkActualHeight
            const trunkWidth = (5 + Math.random() * 3) * scale
            //
            // Build organic tree structure: trunk + roots + per-cluster branches/leaves
            //
            const organic = OrganicParallax.buildOrganicTreeData(trunkBottom, trunkTop, {
              includeRoots: false,
              rootAbsoluteMaxY: Math.min(TREE_ROOT_ABSOLUTE_MAX_Y, trunkBottom + L0_ORGANIC_ROOT_DEPTH_MAX),
              rootSegmentsMin: 13,
              rootSegmentsRange: 17
            })
            //
            // Sample leaves from all clusters as crown points so rain can drip
            // from the canopy. Crown offsets are relative to (tree.x, crownCenterY).
            //
            const rainCrowns = []
            for (const cluster of organic.branchClusters) {
              for (let l = 0; l < cluster.leaves.length; l += 3) {
                const leaf = cluster.leaves[l]
                //
                // Convert cluster-local leaf coords to world-relative crown offsets
                //
                const worldLeafX = cluster.pivotX + leaf.x
                const worldLeafY = cluster.pivotY + leaf.y
                rainCrowns.push({ offsetX: worldLeafX, offsetY: worldLeafY - crownCenterY })
              }
            }
            //
            // Trunk keeps varied palette; roots share one unified soil brown.
            //
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
              rootColor: k.rgb(L0_TREE_ROOT_COLOR_R, L0_TREE_ROOT_COLOR_G, L0_TREE_ROOT_COLOR_B),
              //
              // Warm-orange seed leaf colour; far-row tint pulls it toward
              // the cool teal cloud band so a faint amber undertone
              // survives in the foggy silhouettes.
              //
              leafColor: k.rgb(170, 105, 44),
              opacity: 0.95,
              //
              // Whole-tree sway is no longer used; clusters sway independently
              //
              swaySpeed: 0,
              swayAmount: 0,
              swayOffset: 0
            }
            trees.push(tree)
          }
        }
      }
      
      layers.push({ grassBlades, bushes, trees, name: config.name })
    }
    //
    // Bake backgrounds. To improve mobile FPS, all four back/mid sheets
    // (black-back base + far-organic overlay + grey-leaf row + black-leaf row)
    // are composited into a single PNG so the frame only pays fillrate for
    // one full-screen draw instead of four. The front static sheet stays
    // separate so birds (z=6) still fly between mid trees and front bushes.
    //
    const createBackgroundCompositeCanvas = () => {
      return toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
        //
        // Darkened ground band sits below the average back-row crown line.
        //
        if (layers.length > 0 && layers[0].trees.length > 0) {
          const backLayer = layers[0]
          const avgCrownY = backLayer.trees.reduce((sum, t) => sum + t.crownCenterY, 0) / backLayer.trees.length
          ctx.fillStyle = 'rgb(28, 28, 28)'
          ctx.fillRect(0, avgCrownY, k.width(), FLOOR_Y - avgCrownY)
        }
        //
        // Bake in painter order: back base → back organic → grey mid → black mid.
        //
        layers[0] && drawLayerToCanvas(ctx, layers[0], 0, { skipOrganic: true })
        layers[0] && drawLayerToCanvas(ctx, layers[0], 0, { organicOnly: true })
        layers[1] && drawLayerToCanvas(ctx, layers[1], 0, { organicOnly: true })
        layers[2] && drawLayerToCanvas(ctx, layers[2], 0, { organicOnly: true })
      })
    }
    
    const createFrontStaticCanvas = () => {
      return toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
        if (!layers[3]) return
        const staticTrees = layers[3].trees.filter(t => !t.branchClusters)
        const frontLayerStatic = {
          trees: staticTrees,
          bushes: layers[3].bushes,
          grassBlades: layers[3].grassBlades,
          name: layers[3].name
        }
        drawLayerToCanvas(ctx, frontLayerStatic, 0, {})
      })
    }
    //
    // Helper function to draw layer to canvas
    //
    const drawLayerToCanvas = (ctx, layer, time, drawOpts) => {
      const { skipOrganic = false, organicOnly = false } = drawOpts || {}
      //
      // Legacy rectangle + circle crowns (and bushes); skipped when baking transparent organic-only sheet.
      //
      if (!organicOnly) {
        for (const tree of layer.trees) {
          if (tree.branchClusters) continue
          const sway = Math.sin(time * tree.swaySpeed + tree.swayOffset) * tree.swayAmount
          //
          // Legacy back/middle layer trees: roots + rectangle trunk + circle crowns
          // Roots are drawn first so the trunk paints over their tops.
          //
          if (tree.rootSegments) {
            ctx.lineCap = 'round'
            const rr = tree.rootColor ? tree.rootColor.r : tree.trunkColor.r
            const rg = tree.rootColor ? tree.rootColor.g : tree.trunkColor.g
            const rb = tree.rootColor ? tree.rootColor.b : tree.trunkColor.b
            for (const seg of tree.rootSegments) {
              ctx.strokeStyle = `rgba(${rr}, ${rg}, ${rb}, ${tree.opacity})`
              ctx.lineWidth = seg.width
              ctx.beginPath()
              ctx.moveTo(tree.x + seg.startX, seg.startY)
              ctx.lineTo(tree.x + seg.endX, seg.endY)
              ctx.stroke()
            }
          }
          ctx.fillStyle = `rgba(${tree.trunkColor.r}, ${tree.trunkColor.g}, ${tree.trunkColor.b}, ${tree.opacity})`
          ctx.fillRect(
            tree.x + sway * 0.2 - tree.trunkWidth / 2,
            tree.trunkTop,
            tree.trunkWidth,
            tree.trunkHeight
          )
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
          const bushTime = 0
          const sway = Math.sin(bushTime * bush.swaySpeed + bush.swayOffset) * bush.swayAmount
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
      if (!skipOrganic) {
        for (const tree of layer.trees) {
          if (!tree.branchClusters) continue
          const sway = Math.sin(time * tree.swaySpeed + tree.swayOffset) * tree.swayAmount
          OrganicParallax.drawOrganicTreeToCanvas(ctx, tree, sway)
        }
      }
    }
    
    const backgroundCompositeDataURL = createBackgroundCompositeCanvas()
    const frontStaticDataURL = createFrontStaticCanvas()
    loadTouchSprite(k, 'bg-touch-l0-background', backgroundCompositeDataURL)
    loadTouchSprite(k, 'bg-touch-l0-front-static', frontStaticDataURL)
    //
    // Single composite background sheet (z=2..5 layers baked together).
    //
    k.add([
      k.z(L0_PARALLAX_FAR_CIRCLE_Z),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-l0-background',
            pos: k.vec2(0, 0),
            anchor: "topleft"
          })
        }
      }
    ])
    //
    // Front bushes / static circles (organic hinge trees drawn later).
    //
    k.add([
      k.z(L0_PARALLAX_FRONT_STATIC_Z),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-l0-front-static',
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
    //
    // How long the wing eases between flapping motion and the gliding pose.
    // Higher = smoother but more sluggish flap-stop.
    //
    const BIRD_FLAP_GLIDE_BLEND_TIME = 0.45
    //
    // Constant gliding wing angle (matches old static value used before easing)
    //
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
        color: isTreeColor ? k.rgb(L0_CLOUD_CIRCLE_R, L0_CLOUD_CIRCLE_G, L0_CLOUD_CIRCLE_B) : k.rgb(5, 5, 5),
        wingPhase: 0,
        isFlapping: initialFlapping,
        flapTimer: Math.random() * 3,
        flapDuration: 0.8 + Math.random() * 0.4,
        glideDuration: 2.0 + Math.random() * 2.0,
        //
        // Smooth crossfade between flap oscillation and glide pose:
        // 1.0 = pure flapping sine, 0.0 = pure glide pose. Eases over
        // BIRD_FLAP_GLIDE_BLEND_TIME so wing position never snaps.
        //
        modeBlend: initialFlapping ? 1 : 0
      })
    }
    
    birds._topMargin = TOP_MARGIN
    
    k.add([
      k.z(L0_BIRD_LAYER_Z),
      {
        draw() {
          const cameraX = getCameraCenterX(k, birds._heroRef)
          const cullDist = getDistanceThreshold(k, L0_CULL_SCREEN_MULT)
          drawL0Birds(k, birds, cameraX, cullDist)
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
    //
    // Grass push interaction constants — hoisted out of draw() so they are
    // not re-declared every frame. HERO_RADIUS_SQ avoids a sqrt per blade.
    //
    const GRASS_HERO_RADIUS = 50
    const GRASS_PUSH_FORCE = 15
    const GRASS_HERO_RADIUS_SQ = GRASS_HERO_RADIUS * GRASS_HERO_RADIUS
    //
    // Reusable vec2 instances — drawLine requires Vec2 with .sub() method.
    // Mutating them each blade avoids ~640 short-lived allocations/second.
    //
    const grassP1 = k.vec2(0, 0)
    const grassP2 = k.vec2(0, 0)
    const grassDrawer = k.add([
      k.z(20),
      {
        heroRef: null,
        draw() {
          const time = k.time()
          const heroX = this.heroRef ? this.heroRef.character.pos.x : -1000
          const heroY = this.heroRef ? this.heroRef.character.pos.y : -1000
          //
          // Cull grass blades outside ~1 screen width from camera center (hero X).
          // The level is wider than the viewport so far-away blades waste draw calls.
          //
          const cameraX = getCameraCenterX(k, this.heroRef)
          const grassCullDist = getDistanceThreshold(k, 0.65)
          for (const blade of allGrassBlades) {
            if (!isWithinDistance(blade.x1, cameraX, grassCullDist)) continue
            const baseSway = Math.sin(time * blade.swaySpeed + blade.swayOffset) * blade.swayAmount
            //
            // Squared distance check avoids sqrt on every blade every frame.
            //
            const dx = blade.x1 - heroX
            const dy = blade.y1 - heroY
            const distSq = dx * dx + dy * dy
            let pushSway = 0
            if (distSq < GRASS_HERO_RADIUS_SQ) {
              const distance = Math.sqrt(distSq)
              const pushStrength = (1 - distance / GRASS_HERO_RADIUS)
              pushSway = (dx / (distance || 1)) * pushStrength * GRASS_PUSH_FORCE
            }
            grassP1.x = blade.x1
            grassP1.y = blade.y1
            grassP2.x = blade.baseX2 + baseSway + pushSway
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
    // Create dynamic foreground trees drawer (40% of front layer)
    //
    if (layers[3]) {
      const allFrontTrees = layers[3].trees
      //
      // ALL organic trees sway now (per user request). Each tree is split
      // into a trunk+roots sprite (static) plus per-cluster sprites that
      // rotate around their pivot. Cost is bounded since drawSprite is
      // a single GPU draw call regardless of underlying complexity.
      //
      const dynamicTrees = allFrontTrees.filter(t => t.branchClusters)
      dynamicTrees.forEach((tree, idx) => {
        const baseName = `l0-dyn-tree-${idx}`
        OrganicParallax.prerenderOrganicDarkBackdropSprite(
          k,
          tree,
          baseName,
          L0_FRONT_ORGANIC_DARK_DIM_RGB,
          L0_FRONT_ORGANIC_DARK_BACKDROP_OPACITY_SCALE
        )
        OrganicParallax.prerenderOrganicTreeSprites(k, tree, baseName)
      })
      k.add([
        k.z(L0_FRONT_ORGANIC_DARK_BACKDROP_Z),
        {
          draw() {
            for (const tree of dynamicTrees) {
              tree.darkBackdropSpriteName && k.drawSprite({
                sprite: tree.darkBackdropSpriteName,
                pos: k.vec2(tree.darkBackdropX, tree.darkBackdropY),
                anchor: "topleft"
              })
            }
          }
        }
      ])
      k.add([
        k.z(L0_FRONT_ORGANIC_DYNAMIC_Z),
        {
          draw() {
            const time = k.time()
            for (const tree of dynamicTrees) {
              if (!tree.branchClusters) continue
              //
              // Trunk + roots: drawn first, no sway
              //
              if (tree.trunkSpriteName) {
                k.drawSprite({
                  sprite: tree.trunkSpriteName,
                  pos: k.vec2(tree.trunkSpriteX, tree.trunkSpriteY)
                })
              }
              //
              // Each branch cluster rotates around its pivot like a hinge:
              // the cluster's attachment point stays fixed on the trunk and
              // the branch + leaves swing together around that point.
              // angleDeg is small (a few degrees) for a subtle wind effect.
              //
              for (const cluster of tree.branchClusters) {
                if (!cluster.spriteName) continue
                const dt = k.dt()
                const targetDeg = Math.sin(time * cluster.swaySpeed + cluster.swayPhase) * cluster.swayAmount
                const ease = Math.min(1, dt * OrganicParallax.BRANCH_SWAY_SMOOTH_PER_SEC)
                cluster.smoothedAngleDeg = cluster.smoothedAngleDeg == null
                  ? targetDeg
                  : cluster.smoothedAngleDeg + (targetDeg - cluster.smoothedAngleDeg) * ease
                k.drawSprite({
                  sprite: cluster.spriteName,
                  pos: k.vec2(cluster.worldPivotX, cluster.worldPivotY),
                  anchor: k.vec2(cluster.anchorX, cluster.anchorY),
                  angle: cluster.smoothedAngleDeg
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
    //
    // Big bug silhouette — near-black but pulled slightly toward the
    // cool side so the long-legged anti-hero platform reads as part of
    // the teal+orange composition instead of a pure neutral black blob.
    //
    const BIG_BUG_COLOR = "#0F1C20"
    //
    // Calculate back layer tree color for bugs 1, 2, 3
    // Back layer (layerIndex 0) tree color: 12 * 0.2 + 42 * 0.8 = 36 (R), 16 * 0.2 + 42 * 0.8 = 37 (G), 12 * 0.2 + 42 * 0.8 = 36 (B)
    // Mix between black (#1A1C1A = rgb(26, 28, 26)) and tree color (#242524 = rgb(36, 37, 36))
    // Average: rgb(31, 32.5, 31) ≈ rgb(31, 33, 31) = #1F211F
    //
    const BACK_LAYER_TREE_COLOR = "#000000"  // Pure black for long-legged monster bodies and legs
    //
    // Bug4 (anti-hero monster platform) z is in FRONT of hinged foliage (L0_FRONT_ORGANIC_DYNAMIC_Z)
    // monster + the anti-hero on its head are clearly in front of all foliage.
    // Other big bugs (1, 2, 3) keep the original z=8 so they hide behind front trees.
    //
    const BIG_BUG_Z_INDEX = 8
    const ANTIHERO_PLATFORM_Z_INDEX = 27
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
      zIndex: ANTIHERO_PLATFORM_Z_INDEX,
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
    const bug4BackPlatformWidth = bug4Radius * 1.8
    const bug4BackPlatformHeight = 30
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
    // Second trap: make the bug (and its invisible platform) drift slowly.
    //
    trap2Active && activateBug4Movement(k, bigBug4Inst, antiHeroPlatform, null, bug4Radius)
    //
    // Create hero (no annihilation in this lesson — TOUCH letters drive progression)
    //
    const heroInst = Hero.create({
      k,
      x: HERO_SPAWN_X,
      y: HERO_SPAWN_Y,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      antiHero: null,
      currentLevel: 'lesson-touch.0',
      jumpForce: CFG.game.jumpForce,
      addMouth: isWordComplete,
      addArms: isTouchComplete,
      bodyColor: heroBodyColor,
      idleVocalization: 'childSinging'
    })
    //
    // Lock hero controls while life deduction animation plays
    //
    if (sceneLock.locked) {
      heroInst.controlsDisabled = true
      sceneLock.heroInst = heroInst
    }
    //
    // Raise hero z above puddles (z=17) so it renders in front of them
    //
    if (heroInst.character) {
      heroInst.character.z = 20
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
    // Hero vs floor thorns (death + reload level) — merged into main game loop below
    //
    const trapsEnabled = showTrap || trapAlreadyAdded
    const trapRuntime = trapsEnabled ? createTrapSpikes(k, heroInst, levelIndicator, sound) : null
    //
    // Hidden bonus hero on the left side at antihero height
    // Only visible when hero approaches from above (jumping from a bug)
    //
    const BONUS_PLATFORM_X = LEFT_MARGIN + 140
    const BONUS_PLATFORM_Y = ANTIHERO_PLATFORM_Y + 80
    const BONUS_PLATFORM_WIDTH = 80
    const bonusHeroInst = BonusHero.create({
      k,
      x: BONUS_PLATFORM_X,
      y: BONUS_PLATFORM_Y,
      width: BONUS_PLATFORM_WIDTH,
      heroInst,
      levelIndicator,
      sfx: sound,
      approachFromAbove: true,
      revealDistance: 120,
      heroBodyColor,
      storageKey: 'touch.lesson0BonusCollected',
      //
      // Collision box shifted right by half its width so its left edge
      // aligns with the platform anchor point.
      //
      collisionWidth: 82,
      platformCollisionXOffset: 82 / 2,
      platformCollisionYOffset: 9,
      platformZ: ANTIHERO_PLATFORM_Z_INDEX
    })
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
      showOutline: true,
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
      showOutline: true,
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
      showOutline: true,
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
    // Create regular bugs. Touch devices use a reduced count to keep the
    // per-frame IK leg computation light enough to hit 60 FPS on mobile.
    //
    const SMALL_BUG_COUNT_DESKTOP = 12
    const SMALL_BUG_COUNT_TOUCH = 6
    const smallBugCount = isTouchDevice() ? SMALL_BUG_COUNT_TOUCH : SMALL_BUG_COUNT_DESKTOP
    for (let i = 0; i < smallBugCount; i++) {
      //
      // Distribute bugs across the floor (keep the original 11-step spacing
      // so the layout stays visually similar regardless of the count).
      //
      const spacing = (floorWidth - 200) / Math.max(smallBugCount - 1, 1)
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
    // Bug pyramid system — updates run in unified game loop
    //
    const activePyramids = []
    const pyramidRuntime = { timer: 0 }
    const allBugsCombined = [...bugs, ...smallBugs]
    //
    // Create FPS counter
    //
    const fpsCounter = FpsCounter.create({ k })
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
    const monsterBugs = [bigBug0Inst, bigBug1Inst, bigBug2Inst]
    //
    // Small bugs sometimes speak on their own (see SMALL_BUG_PHRASES).
    //
    const smallBugPhraseRuntime = startSmallBugPhrases(k, smallBugs)
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
    // Rain system: depth-layered drops with splashes on objects
    //
    const frontTrees = layers[3] ? layers[3].trees : []
    //
    // Touch devices are fillrate-bound; drop rain particle count to roughly a
    // third of desktop so the splash overdraw doesn't tank mobile frames.
    //
    const rainIntensity = isTouchDevice() ? 0.3 : 1
    const rainInst = Rain.create({
      k,
      topY: TOP_MARGIN,
      floorY: FLOOR_Y,
      leftX: LEFT_MARGIN,
      rightX: CFG.visual.screen.width - RIGHT_MARGIN,
      heroInst,
      monsterBugs: [bigBug0Inst, bigBug1Inst, bigBug2Inst],
      smallBugs,
      trees: frontTrees,
      intensity: rainIntensity
    })
    //
    // Rain drip sounds: retry until AudioContext is running
    //
    Sound.startAudioContext(sound)
    const startRainWhenReady = () => {
      if (rainRef.stop) return
      const ctx = sound.audioContext
      if (ctx && ctx.state === 'running') {
        rainRef.stop = Sound.startRainSound(sound, 0.003)
      }
    }
    startRainWhenReady()
    //
    // Rocks first so puddle placement can avoid their footprints.
    //
    const rocks = createRocks(k, floorThornData)
    //
    // Puddles on the floor: small ellipses with occasional ripple
    //
    const puddleRuntime = createPuddles(k, heroInst, sound, rocks, floorThornData)
    //
    // Distant thunder rumble with lightning flash at random intervals
    //
    const thunderState = {
      timer: THUNDER_INTERVAL_MIN + Math.random() * (THUNDER_INTERVAL_MAX - THUNDER_INTERVAL_MIN),
      flashTimer: 0
    }
    k.add([
      k.z(0),
      {
        draw() {
          drawLightningFlash(k, thunderState)
        }
      }
    ])
    //
    // Cricket/cicada ambient chirps at random intervals
    //
    const cricketState = {
      timer: CRICKET_INTERVAL_MIN + Math.random() * (CRICKET_INTERVAL_MAX - CRICKET_INTERVAL_MIN),
      intervalMin: CRICKET_INTERVAL_MIN,
      intervalMax: CRICKET_INTERVAL_MAX
    }
    //
    // Frog croaks at random intervals
    //
    const frogState = {
      timer: FROG_INTERVAL_MIN + Math.random() * (FROG_INTERVAL_MAX - FROG_INTERVAL_MIN),
      intervalMin: FROG_INTERVAL_MIN,
      intervalMax: FROG_INTERVAL_MAX
    }
    //
    // Owl/bird ambient hoots at random intervals (5-10s)
    //
    const owlState = {
      timer: OWL_INTERVAL_MIN + Math.random() * (OWL_INTERVAL_MAX - OWL_INTERVAL_MIN),
      intervalMin: OWL_INTERVAL_MIN,
      intervalMax: OWL_INTERVAL_MAX
    }
    //
    // Fireflies: small glowing dots drifting over the swamp
    //
    const fireflyRuntime = createL0Fireflies(k)
    //
    // Init firefly flee mode — fireflies flee from hero until letter T is collected
    //
    fireflyRuntime.fireflies._mode = 'flee'
    fireflyRuntime.fireflies._heroRef = null
    //
    // TOUCH letter collection system: T on ground, O on monster head, U+C on hidden platforms
    //
    const touchLetterState = setupTouchLetterSystem(k, {
      bug4X,
      bug4BackPlatformY,
      antiHeroPlatform,
      fireflyRuntime,
      bugs,
      allBugsCombined,
      levelIndicator,
      sound,
      touchMusic,
      wallColorHex: WALL_COLOR_HEX,
      levelHelpInst,
      initialLifeScore
    })
    //
    // Connect hero reference to firefly and letter system (heroInst exists by this point)
    //
    fireflyRuntime.fireflies._heroRef = heroInst
    touchLetterState.heroInst = heroInst
    //
    // End-of-level hint: shown at the top when gather phase is active.
    // Pressing Enter immediately advances to the next level.
    //
    k.add([
      k.z(CFG.visual.zIndex.ui + 5),
      {
        draw() {
          if (!touchLetterState.gatherActive) return
          //
          // Countdown starts as soon as gather phase begins (after C+H)
          //
          const remaining = Math.max(0, Math.ceil(TOUCH_GATHER_POST_ARRIVE_DELAY - touchLetterState.gatherTimer))
          const displayText = L0_GATHER_PROMPT_BASE + remaining
          const cx = CFG.visual.screen.width / 2
          //
          // Drop shadow (single black copy offset right+down), glow-level style.
          //
          const outlineOffsets = [[1.5, 1.5]]
          outlineOffsets.forEach(([dx, dy]) => {
            k.drawText({
              text: displayText,
              pos: k.vec2(cx + dx, L0_END_TEXT_Y + dy),
              size: L0_END_TEXT_FONT,
              font: CFG.visual.fonts.regularFull,
              color: k.rgb(0, 0, 0),
              anchor: 'center',
              opacity: 0.85
            })
          })
          k.drawText({
            text: displayText,
            pos: k.vec2(cx, L0_END_TEXT_Y),
            size: L0_END_TEXT_FONT,
            font: CFG.visual.fonts.regularFull,
            color: k.rgb(220, 200, 160),
            anchor: 'center',
            opacity: 1
          })
        }
      }
    ])
    k.onKeyPress('enter', () => {
      if (touchLetterState.gatherActive && !touchLetterState.levelDone) {
        touchLetterState.enterSkip = true
      }
    })
    k.onKeyPress('space', () => {
      if (touchLetterState.gatherActive && !touchLetterState.levelDone) {
        touchLetterState.enterSkip = true
      }
    })
    //
    // Monster conversation system: context-aware dialogue between the 3 tall monsters.
    // Different acts play based on which TOUCH letters have been collected.
    // Starts after a delay and replays with new lines as player progresses.
    //
    const conversationState = startMonsterConversation(k, monsterBugs, touchLetterState)
    //
    // Small mushrooms on the ground
    //
    const l0Mushrooms = createMushrooms(k, puddleRuntime.puddles)
    const l0MushTooltipTargets = l0Mushrooms
      .filter(m => m.tooltipText)
      .map(m => ({
        x: m.x + m.width * 0.5,
        y: m.y + m.height * 0.45,
        width: Math.max(34, m.width + 6),
        height: Math.max(28, m.height + 4),
        text: m.tooltipText,
        offsetY: -32
      }))
    l0MushTooltipTargets.length && Tooltip.create({ k, targets: l0MushTooltipTargets })
    //
    // Extra grass blades growing at the base of each rock (added to shared array)
    //
    addGrassAroundRocks(k, rocks, allGrassBlades, FLOOR_Y - 2)
    //
    // Trim grass blades whose base falls inside a puddle so grass
    // never grows IN the water. Done after both layer-grass and
    // around-rocks grass are merged into the shared array.
    //
    pruneGrassInPuddles(allGrassBlades, puddleRuntime.puddles)
    //
    // Hanging spider on a thread tied to a tree branch (eyes follow the hero)
    //
    const spiderL0Inst = createHangingSpider({
      k,
      heroInst,
      frontTrees,
      floorY: FLOOR_Y,
      //
      // Place spider on the LEFT side so it hangs near the hero spawn area.
      //
      xRatio: 0.15
    })
    Tooltip.create({
      k,
      targets: [spiderHoverTooltipTarget(spiderL0Inst, L0_SPIDER_TOOLTIP_TEXT)]
    })
    birds._heroRef = heroInst
    const atmosphereAnchorX = LEFT_MARGIN + (CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN) / 2
    k.onUpdate(() => onUpdateLesson0GameLoop(k, {
      heroInst,
      checkFloorThorns,
      floorThornData,
      levelIndicator,
      bigBug4Inst,
      antiHeroPlatform,
      bug4Radius,
      bugs,
      smallBugs,
      allBugsCombined,
      activePyramids,
      pyramidRuntime,
      fpsCounter,
      smallBugDrawObjects,
      rainRef,
      rainInst,
      startRainWhenReady,
      thunderState,
      cricketState,
      frogState,
      owlState,
      trapOnUpdate: trapRuntime?.onUpdate,
      conversationOnUpdate: conversationState?.onUpdate,
      smallBugPhraseOnUpdate: smallBugPhraseRuntime?.onUpdate,
      puddleOnUpdate: puddleRuntime.onUpdate,
      fireflies: fireflyRuntime.fireflies,
      birds,
      birdSkyHeight: SKY_HEIGHT,
      birdFlapBlendTime: BIRD_FLAP_GLIDE_BLEND_TIME,
      birdGlidePose: BIRD_GLIDE_POSE,
      atmosphereAnchorX,
      heroBugCrouchDuration: HERO_BUG_CROUCH_DURATION,
      onUpdateThunder,
      sound,
      touchLetterState
    }))
    //
    // Return to menu on ESC
    //
    k.onKeyPress("escape", () => {
      if (LevelHelp.isAnyPanelOpen()) return
      Sound.stopAmbient(sound)
      goToMenuAfterAssets(k)
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
function checkFloorThorns(k, heroInst, floorThornData, levelIndicator, sound) {
  if (!heroInst.character?.pos) return
  const heroX = heroInst.character.pos.x
  const heroFeetY =
    heroInst.character.pos.y +
    HERO_HITBOX_HEIGHT_FOR_THORNS / 2 +
    HERO_HITBOX_OFFSET_Y_FOR_THORNS
  if (heroFeetY < FLOOR_Y - FLOOR_THORN_FEET_TOLERANCE_LOW ||
      heroFeetY > FLOOR_Y + FLOOR_THORN_FEET_TOLERANCE_HIGH) {
    return
  }
  const heroTopY = heroFeetY - HERO_HITBOX_HEIGHT_FOR_THORNS
  for (const thorn of floorThornData) {
    const thornTopY = thorn.baseY - thorn.height
    const halfW = thorn.width / 2 + HERO_HALF_WIDTH_THORNS
    if (Math.abs(heroX - thorn.x) >= halfW) continue
    if (heroFeetY > thornTopY && heroTopY < thorn.baseY + FLOOR_THORN_FEET_BELOW_BASE_PAD) {
      onHeroFloorThornDeath(k, heroInst, levelIndicator, sound)
      return
    }
  }
}

/**
 * Hero death on floor thorns: life score, gentle sound, reload touch lesson 0
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} levelIndicator - Level indicator inst
 * @param {Object} sound - Sound instance
 */
function onHeroFloorThornDeath(k, heroInst, levelIndicator, sound) {
  if (heroInst.isDying) return
  //
  // Capture hero position before the character object is destroyed by Hero.death()
  //
  const deathX = heroInst.character.pos.x
  const deathY = heroInst.character.pos.y
  //
  // Spawn firefly burst immediately — same frame the hero disappears (no delay).
  // suppressParticles skips the default body/eye particle animation.
  //
  spawnFireflyDeathBurst(k, deathX, deathY)
  Hero.death(heroInst, () => {
    const currentScore = get('lifeScore', 0)
    const newScore = currentScore + 1
    set('lifeScore', newScore)
    levelIndicator?.updateLifeScore?.(newScore)
    if (levelIndicator?.lifeImage?.sprite?.exists?.()) {
      Sound.playGentleLifeSound(sound)
      const originalColor = levelIndicator.lifeImage.sprite.color
      flashLifeImageOnThornDeath(k, levelIndicator, originalColor, 0)
      createLifeParticlesOnThornDeath(k, levelIndicator)
    }
    startL0DeathCountdown(k, 'lesson-touch.0', deathX, deathY)
  }, { suppressParticles: true })
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
    triggered: false,
    ambientSoundTimer: 0,
    dirtParticles: []
  }
  const fillColor = k.rgb(TRAP_SPIKE_FILL_R, TRAP_SPIKE_FILL_G, TRAP_SPIKE_FILL_B)
  const outlineColor = k.rgb(0, 0, 0)
  //
  // Draw trap spikes and dirt particles
  //
  k.add([
    k.z(L0_FLOOR_THORN_DRAW_Z),
    {
      draw() {
        if (inst.progress <= 0 && inst.dirtParticles.length === 0) return
        drawTrapSpikes(k, inst, fillColor, outlineColor, heroInst)
        drawDirtParticles(k, inst.dirtParticles)
      }
    }
  ])
  //
  // Update: detect hero proximity, animate rise/hold/retract, check collision
  //
  const onUpdate = () => onUpdateTrap(k, inst, heroInst, levelIndicator, sound)
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
  return { inst, onUpdate }
}
//
// Animates trap spike phases: hidden -> rising -> holding -> retracting -> hidden
//
function onUpdateTrap(k, inst, heroInst, levelIndicator, sound) {
  if (!heroInst.character?.pos) return
  const dt = k.dt()
  const heroX = heroInst.character.pos.x
  const heroFeetY =
    heroInst.character.pos.y +
    HERO_HITBOX_HEIGHT_FOR_THORNS / 2 +
    HERO_HITBOX_OFFSET_Y_FOR_THORNS
  if (inst.phase === 'hidden') {
    //
    // Trigger when hero walks within the activation radius
    //
    if (!inst.triggered && Math.abs(heroX - TRAP_TRIGGER_X) < TRAP_TRIGGER_RADIUS) {
      inst.phase = 'rising'
      inst.timer = 0
      inst.triggered = true
      sound && Sound.playTentacleSound(sound)
      k.shake(4)
      //
      // Spawn dirt particles from each spike base
      //
      spawnTentacleDirt(inst)
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
    //
    // Play ambient alien sound periodically while tentacles are out
    //
    inst.ambientSoundTimer += dt
    if (inst.ambientSoundTimer >= TRAP_AMBIENT_SOUND_INTERVAL) {
      inst.ambientSoundTimer -= TRAP_AMBIENT_SOUND_INTERVAL
      sound && Sound.playTentacleAmbientSound(sound)
    }
    //
    // Stay out while hero is nearby; only start retracting when hero walks away
    //
    const heroNearby = Math.abs(heroX - TRAP_TRIGGER_X) < TRAP_PROXIMITY_RADIUS
    if (!heroNearby && inst.timer >= TRAP_HOLD_DURATION) {
      inst.phase = 'retracting'
      inst.timer = 0
      inst.ambientSoundTimer = 0
    }
  } else if (inst.phase === 'retracting') {
    inst.progress = Math.max(0, 1 - inst.timer / TRAP_RETRACT_DURATION)
    if (inst.progress <= 0) {
      inst.phase = 'hidden'
      inst.timer = 0
      inst.triggered = false
    }
  }
  //
  // Update dirt particles (gravity + fade)
  //
  onUpdateDirtParticles(inst.dirtParticles, dt)
  //
  // Kill hero when risen spike column overlaps the hero body.
  // Tall trap spikes use a column test (not tip-penetration) so a hero
  // standing on the floor beside an extended spike is still caught.
  //
  if (inst.progress > 0.3) {
    const onFloor = heroFeetY >= FLOOR_Y - FLOOR_THORN_FEET_TOLERANCE_LOW &&
                    heroFeetY <= FLOOR_Y + FLOOR_THORN_FEET_TOLERANCE_HIGH
    if (onFloor) {
      const heroTopY = heroFeetY - HERO_HITBOX_HEIGHT_FOR_THORNS
      for (const spike of inst.spikes) {
        const visibleHeight = spike.height * inst.progress
        const spikeTopY = spike.baseY - visibleHeight
        const halfW = TRAP_SPIKE_WIDTH_BASE + HERO_HALF_WIDTH_THORNS
        if (Math.abs(heroX - spike.x) >= halfW) continue
        if (heroFeetY > spikeTopY && heroTopY < spike.baseY + FLOOR_THORN_FEET_BELOW_BASE_PAD) {
          onHeroFloorThornDeath(k, heroInst, levelIndicator, sound)
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
//
// Spawn dirt particles from each spike base when tentacles rise.
// Mirrors the hero's "splash" landing dust: particles spread to both sides,
// fly mostly horizontal with slight upward angle, then fall under gravity.
//
function spawnTentacleDirt(inst) {
  for (const spike of inst.spikes) {
    for (let i = 0; i < DIRT_PARTICLE_COUNT_PER_SPIKE; i++) {
      const side = i < DIRT_PARTICLE_COUNT_PER_SPIKE / 2 ? -1 : 1
      //
      // Flat splash angle (5-30 degrees from horizontal) like hero dust
      //
      const angleDeg = 5 + Math.random() * 25
      const angleRad = angleDeg * Math.PI / 180
      const speed = DIRT_PARTICLE_SPEED_MIN + Math.random() * (DIRT_PARTICLE_SPEED_MAX - DIRT_PARTICLE_SPEED_MIN)
      const offsetX = side * (5 + Math.random() * 10)
      //
      // Slight color variation per particle for natural dirt look
      //
      const dr = Math.floor((Math.random() - 0.5) * 20)
      const dg = Math.floor((Math.random() - 0.5) * 16)
      const db = Math.floor((Math.random() - 0.5) * 12)
      inst.dirtParticles.push({
        x: spike.x + offsetX,
        y: spike.baseY - 2,
        vx: Math.cos(angleRad) * speed * side,
        vy: -Math.sin(angleRad) * speed,
        life: DIRT_PARTICLE_LIFETIME,
        maxLife: DIRT_PARTICLE_LIFETIME,
        r: Math.max(0, Math.min(255, DIRT_PARTICLE_COLOR_R + dr)),
        g: Math.max(0, Math.min(255, DIRT_PARTICLE_COLOR_G + dg)),
        b: Math.max(0, Math.min(255, DIRT_PARTICLE_COLOR_B + db))
      })
    }
  }
}
//
// Age dirt particles: gravity, horizontal friction, lifetime decay
//
function onUpdateDirtParticles(particles, dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.vy += DIRT_PARTICLE_GRAVITY * dt
    p.vx *= 0.97
    p.life -= dt
    if (p.life <= 0) particles.splice(i, 1)
  }
}
//
// Draw dirt particles as outlined brown squares (matching hero dust style)
//
function drawDirtParticles(k, particles) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife) * 0.9
    k.drawRect({
      pos: k.vec2(p.x, p.y),
      width: DIRT_PARTICLE_SIZE,
      height: DIRT_PARTICLE_SIZE,
      anchor: 'center',
      color: k.rgb(p.r, p.g, p.b),
      opacity: alpha,
      outline: { width: 1.5, color: k.rgb(0, 0, 0) }
    })
  }
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
 * Check if player earned speed bonus for completing level faster than target
 * @param {number} levelTime - Time taken to complete level (seconds)
 * @returns {boolean} True if speed bonus earned
 */
function checkSpeedBonus(levelTime) {
  const targetTime = CFG.gameplay.speedBonusTime
    && CFG.gameplay.speedBonusTime['lesson-touch.0']
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
 * Starts a timed conversation between three monsters (big bugs 0, 1, 2).
 * Each line appears as a speech bubble above the speaking monster.
 * Display duration is based on text length. Plays once after initial delay.
 * @param {Object} k - Kaplay instance
 * @param {Array<Object>} monsterBugs - Array of [bug0, bug1, bug2] instances
 * @param {Object} touchLetterState - Current TOUCH letter collection state
 */
function startMonsterConversation(k, monsterBugs, touchLetterState) {
  //
  // Conversation state
  //
  const inst = {
    phase: 'idle',
    timer: 0,
    lineIndex: 0,
    currentTooltip: null,
    currentAct: null,
    currentDisplayTime: 0,
    idleCheckTimer: 0
  }
  //
  // Find the first act whose condition is met and hasn't been shown yet
  //
  const tryStartAct = () => {
    for (const act of MONSTER_ACTS) {
      if (!get(act.key) && act.condition(touchLetterState)) {
        inst.currentAct = act
        inst.lineIndex = 0
        inst.phase = 'delay'
        inst.timer = 0
        return true
      }
    }
    return false
  }
  //
  // Show a single line as a forced-visible tooltip above the speaking monster
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
    inst.currentTooltip = Tooltip.create({ k, targets: [target], forceVisible: true })
    inst.currentTooltip.activeTarget = target
    inst.currentTooltip.frozenX = Math.round(bug.x)
    inst.currentTooltip.frozenY = Math.round(bug.y)
    inst.currentTooltip.opacity = 1
    const chars = lineData.text.replace(/\n/g, '').length
    inst.currentDisplayTime = Math.max(MONSTER_MIN_DISPLAY_TIME, chars / MONSTER_CHARS_PER_SECOND)
  }
  //
  // Per-frame update drives the conversation timeline
  //
  inst.onUpdate = () => {
    inst.timer += k.dt()
    if (inst.phase === 'idle') {
      //
      // Periodically check if a new act should start
      //
      inst.idleCheckTimer += k.dt()
      if (inst.idleCheckTimer >= MONSTER_IDLE_CHECK_INTERVAL) {
        inst.idleCheckTimer = 0
        tryStartAct()
      }
    } else if (inst.phase === 'delay') {
      if (inst.timer >= inst.currentAct.delay) {
        inst.timer = 0
        inst.phase = 'showing'
        showLine(inst.currentAct.lines[0])
      }
    } else if (inst.phase === 'showing') {
      //
      // Keep frozen position updated so bubble tracks the swaying monster
      //
      if (inst.currentTooltip) {
        const bug = monsterBugs[inst.currentAct.lines[inst.lineIndex].speaker]
        if (bug) {
          inst.currentTooltip.frozenX = Math.round(bug.x)
          inst.currentTooltip.frozenY = Math.round(bug.y)
        }
      }
      if (inst.timer >= inst.currentDisplayTime) {
        inst.currentTooltip && Tooltip.destroy(inst.currentTooltip)
        inst.currentTooltip = null
        inst.lineIndex++
        if (inst.lineIndex >= inst.currentAct.lines.length) {
          //
          // Act complete: persist and return to idle to wait for next act
          //
          set(inst.currentAct.key, true)
          inst.currentAct = null
          inst.phase = 'idle'
          inst.timer = 0
          inst.idleCheckTimer = 0
          return
        }
        inst.phase = 'pause'
        inst.timer = 0
      }
    } else if (inst.phase === 'pause') {
      if (inst.timer >= MONSTER_PAUSE_BETWEEN) {
        inst.timer = 0
        inst.phase = 'showing'
        showLine(inst.currentAct.lines[inst.lineIndex])
      }
    }
  }
  //
  // Check immediately on startup in case an act condition is already met
  //
  tryStartAct()
  return inst
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
    pauseDuration: BUG_PHRASE_MIN_PAUSE + Math.random() * BUG_PHRASE_EXTRA_PAUSE
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
  inst.onUpdate = () => {
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
  }
  return inst
}

//
// Thunder rumble interval (distant thunder every 7-10 seconds)
//
const THUNDER_INTERVAL_MIN = 7
const THUNDER_INTERVAL_MAX = 10
//
// Lightning flash during thunder
//
const LIGHTNING_FLASH_DURATION = 0.3
const LIGHTNING_FLASH_OPACITY = 0.25
//
// Flash Y band: from cloud bottom to back-tree canopy area
//
const LIGHTNING_FLASH_TOP_Y = TOP_MARGIN + 100
const LIGHTNING_FLASH_BOTTOM_Y = FLOOR_Y - 100
//
// Cricket/cicada ambient interval
//
const CRICKET_INTERVAL_MIN = 3
const CRICKET_INTERVAL_MAX = 8
//
// Frog croak interval
//
const FROG_INTERVAL_MIN = 5
const FROG_INTERVAL_MAX = 15
//
// Owl/bird hoot interval (5-10 seconds between calls)
//
const OWL_INTERVAL_MIN = 5
const OWL_INTERVAL_MAX = 10
//
// Firefly configuration for level 0
//
const L0_FIREFLY_COUNT = 22
const L0_FIREFLY_MIN_SPEED = 6
const L0_FIREFLY_MAX_SPEED = 18
const L0_FIREFLY_RADIUS_MIN = 2.8
const L0_FIREFLY_RADIUS_MAX = 4.5
const L0_FIREFLY_GLOW_SPEED_MIN = 0.6
const L0_FIREFLY_GLOW_SPEED_MAX = 2.0
//
// Fireflies — pulled from cool lime green to warm amber gold so the
// little glowing dots become the sparkling warm accent on top of the
// teal field, not a green outlier.
//
const L0_FIREFLY_COLOR_R = 244
const L0_FIREFLY_COLOR_G = 192
const L0_FIREFLY_COLOR_B = 64
//
// Small mushrooms on the ground
//
const MUSHROOM_COUNT = 7
const MUSHROOM_PUDDLE_CLEARANCE = 26
const MUSHROOM_FUNNY_TOOLTIP_CHANCE = 0.38
const L0_SPIDER_TOOLTIP_TEXT = "How many letters\ndid you find?"
const MUSHROOM_FUNNY_LINES = [
  'Talk spore to me',
  'Pay rent in compost',
  'This is not a power-up',
  '404 fungus not found',
  'Slightly psychic, mostly chill'
]
const MUSHROOM_CAP_WIDTH_MIN = 16
const MUSHROOM_CAP_WIDTH_MAX = 32
const MUSHROOM_STEM_HEIGHT_MIN = 12
const MUSHROOM_STEM_HEIGHT_MAX = 24
//
// Rocks scattered on the bottom platform: dark grey blobs with shading and outline.
// Rocks are larger now and frequently appear in clusters of 2-3 next to each other.
//
const ROCK_COUNT = 5
const ROCK_RADIUS_MIN = 26
const ROCK_RADIUS_MAX = 62
const ROCK_BASE_R = 78
const ROCK_BASE_G = 78
const ROCK_BASE_B = 82
const L0_ROCK_Z_BEHIND_COLORFUL_ROW = 8
const L0_ROCK_Z_IN_FRONT_OF_COLORFUL_ROW = 26
//
// Each main rock has a chance of spawning 1-2 smaller satellite rocks beside it
//
const ROCK_CLUSTER_CHANCE = 0.65
const ROCK_CLUSTER_SATELLITES_MIN = 1
const ROCK_CLUSTER_SATELLITES_MAX = 2
const ROCK_SATELLITE_RADIUS_RATIO_MIN = 0.45
const ROCK_SATELLITE_RADIUS_RATIO_MAX = 0.85
//
// Puddle constants
//
const PUDDLE_COUNT = 8
const PUDDLE_WIDTH_MIN = 50
const PUDDLE_WIDTH_MAX = 100
const PUDDLE_HEIGHT_RATIO = 0.12
const PUDDLE_OPACITY = 0.42
const PUDDLE_RIPPLE_INTERVAL_MIN = 1.5
const PUDDLE_RIPPLE_INTERVAL_MAX = 4.0
const PUDDLE_RIPPLE_DURATION = 0.8
//
// Puddles — deep teal so they sit comfortably on the cool side of the
// complementary palette while still reading as reflective water (their
// inner highlights add brightness via per-shade offsets).
//
const PUDDLE_COLOR_R = 26
const PUDDLE_COLOR_G = 110
const PUDDLE_COLOR_B = 128
//
// Puddle splash when hero steps on a puddle
//
const PUDDLE_SPLASH_PARTICLE_COUNT = 6
const PUDDLE_SPLASH_SPEED_MIN = 30
const PUDDLE_SPLASH_SPEED_MAX = 80
const PUDDLE_SPLASH_LIFETIME = 0.5
const PUDDLE_SPLASH_SIZE = 3
const PUDDLE_HERO_DETECT_Y = 35
//
// Creates small floor puddles with rain ripple effect
//
// Creates small floor puddles with rain ripple effect.
// rockDescriptors avoids placing ellipses over rocks.
// thornDescriptors avoids placing puddles under floor thorn spikes.
//
function createPuddles(k, heroInst, sound, rockDescriptors = [], thornDescriptors = []) {
  const playableW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const puddles = []
  //
  // Minimum gap between puddle edges so they don't overlap
  //
  const MIN_GAP = 30
  const padRock = 45
  //
  // Puddle must not cover a floor thorn (blade rises from dry ground).
  // Each thorn has { x, width } so we clear (width/2 + padThorn) on each side.
  //
  const padThorn = 22
  //
  // Rocks use roughly elliptical footprints around worldX / worldY / radius.
  //
  const overlapsRock = (cx, halfW) => {
    for (const rock of rockDescriptors) {
      const dx = Math.abs(cx - rock.worldX)
      if (dx < halfW + rock.radius * 1.25 + padRock) return true
    }
    return false
  }
  const overlapsThorn = (cx, halfW) => {
    for (const thorn of thornDescriptors) {
      const thornHalf = (thorn.width ?? 6) / 2 + padThorn
      if (Math.abs(cx - thorn.x) < halfW + thornHalf) return true
    }
    return false
  }
  for (let i = 0; i < PUDDLE_COUNT; i++) {
    const w = PUDDLE_WIDTH_MIN + Math.random() * (PUDDLE_WIDTH_MAX - PUDDLE_WIDTH_MIN)
    let x = 0
    let placed = false
    //
    // Retry placement until no overlap with existing puddles, rocks, or thorns
    //
    for (let attempt = 0; attempt < 80; attempt++) {
      x = LEFT_MARGIN + 40 + Math.random() * (playableW - 80)
      const overlapsPuddle = puddles.some(p => {
        const edgeDist = Math.abs(x - p.x) - (w / 2 + p.width / 2)
        return edgeDist < MIN_GAP
      })
      const overlapsStone = overlapsRock(x, w / 2)
      const overlapsSpike = overlapsThorn(x, w / 2)
      if (!overlapsPuddle && !overlapsStone && !overlapsSpike) { placed = true; break }
    }
    if (!placed) continue
    puddles.push({
      x,
      y: FLOOR_Y - 2,
      width: w,
      height: w * PUDDLE_HEIGHT_RATIO,
      rippleTimer: Math.random() * PUDDLE_RIPPLE_INTERVAL_MAX,
      rippleT: 0,
      rippling: false,
      heroInside: false,
      dripX: 0,
      dripY: 0,
      dripSplashT: 0
    })
  }
  const splashParticles = []
  //
  // Track previous grounded state for landing detection and accumulated
  // running distance for per-step wet-step splash sounds.
  //
  const groundState = {
    wasGrounded: true,
    lastX: heroInst?.character?.pos?.x ?? 0,
    stepAccum: 0
  }
  k.add([
    k.z(17),
    {
      draw() {
        drawPuddles(k, puddles)
        drawPuddleSplashes(k, splashParticles)
      }
    }
  ])
  const onUpdate = () => {
    onUpdatePuddles(k, puddles)
    onUpdatePuddleSplashes(k, splashParticles)
    checkHeroPuddleCollision(k, heroInst, puddles, splashParticles, groundState)
  }
  return { puddles, onUpdate }
}
//
// Per-frame puddle ripple timer
//
function onUpdatePuddles(k, puddles) {
  const dt = k.dt()
  for (const p of puddles) {
    if (p.rippling) {
      p.rippleT += dt
      p.dripSplashT += dt
      if (p.rippleT >= PUDDLE_RIPPLE_DURATION) {
        p.rippling = false
        p.rippleTimer = PUDDLE_RIPPLE_INTERVAL_MIN + Math.random() * (PUDDLE_RIPPLE_INTERVAL_MAX - PUDDLE_RIPPLE_INTERVAL_MIN)
      }
    } else {
      p.rippleTimer -= dt
      if (p.rippleTimer <= 0) {
        p.rippling = true
        p.rippleT = 0
        p.dripSplashT = 0
        //
        // Set drip impact position inside the puddle
        //
        p.dripX = p.x + (Math.random() - 0.5) * p.width * 0.5
        p.dripY = p.y + (Math.random() - 0.5) * p.height * 0.3
      }
    }
  }
}
//
// Draw elliptical puddles with expanding ripple rings
//
function drawPuddles(k, puddles) {
  for (const p of puddles) {
    k.drawEllipse({
      pos: k.vec2(p.x, p.y),
      radiusX: p.width / 2,
      radiusY: p.height / 2,
      color: k.rgb(PUDDLE_COLOR_R, PUDDLE_COLOR_G, PUDDLE_COLOR_B),
      opacity: PUDDLE_OPACITY
    })
    if (p.rippling) {
      const progress = p.rippleT / PUDDLE_RIPPLE_DURATION
      //
      // Ripple ring expands from the drip impact point
      //
      const rippleScale = 0.1 + progress * 0.9
      const rippleOpacity = (1 - progress) * 0.25
      const rippleRadiusX = p.width * 0.3 * rippleScale
      const rippleRadiusY = p.height * 0.6 * rippleScale
      k.drawEllipse({
        pos: k.vec2(p.dripX, p.dripY),
        radiusX: rippleRadiusX,
        radiusY: rippleRadiusY,
        color: k.rgb(PUDDLE_COLOR_R + 40, PUDDLE_COLOR_G + 40, PUDDLE_COLOR_B + 40),
        opacity: rippleOpacity,
        fill: false,
        outline: { width: 1, color: k.rgb(PUDDLE_COLOR_R + 60, PUDDLE_COLOR_G + 60, PUDDLE_COLOR_B + 60) }
      })
      //
      // Small splash dot at impact point (visible briefly at start)
      //
      if (p.dripSplashT < 0.15) {
        const dotAlpha = (1 - p.dripSplashT / 0.15) * 0.5
        k.drawCircle({
          pos: k.vec2(p.dripX, p.dripY),
          radius: 2,
          color: k.rgb(PUDDLE_COLOR_R + 80, PUDDLE_COLOR_G + 80, PUDDLE_COLOR_B + 55),
          opacity: dotAlpha
        })
      }
    }
  }
}
//
// Detect hero stepping into a puddle and spawn splash particles
//
function checkHeroPuddleCollision(k, heroInst, puddles, splashParticles, groundState) {
  if (!heroInst?.character?.pos) return
  const heroX = heroInst.character.pos.x
  const heroY = heroInst.character.pos.y + PUDDLE_HERO_DETECT_Y
  const grounded = heroInst.character.isGrounded?.() ?? false
  //
  // Detect landing: hero was airborne last frame and now grounded
  //
  const justLanded = grounded && !groundState.wasGrounded
  groundState.wasGrounded = grounded
  let inAnyPuddle = false
  for (const p of puddles) {
    const insideX = Math.abs(heroX - p.x) < p.width / 2
    const insideY = Math.abs(heroY - p.y) < 15
    const isInside = insideX && insideY && grounded
    if (isInside) inAnyPuddle = true
    if (isInside && !p.heroInside) {
      //
      // Hero just entered puddle: spawn splash particles
      //
      for (let i = 0; i < PUDDLE_SPLASH_PARTICLE_COUNT; i++) {
        const angle = -Math.PI * (0.15 + Math.random() * 0.7)
        const speed = PUDDLE_SPLASH_SPEED_MIN + Math.random() * (PUDDLE_SPLASH_SPEED_MAX - PUDDLE_SPLASH_SPEED_MIN)
        splashParticles.push({
          x: heroX + (Math.random() - 0.5) * 10,
          y: p.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: PUDDLE_SPLASH_LIFETIME,
          maxLife: PUDDLE_SPLASH_LIFETIME
        })
      }
      p.rippling = true
      p.rippleT = 0
      //
      // Landing from a jump produces a much louder splash than walking in.
      // Both are bumped up so the wet sound clearly cuts through ambient rain.
      //
      const splashVolume = justLanded ? 0.52 : 0.38
      Sound.playWaterFootstepKaplay?.(k, splashVolume)
    }
    p.heroInside = isInside
  }
  //
  // Per-step wet splash: while running on grounded water, accumulate
  // horizontal travel and play a smaller splash every WET_STEP_DISTANCE px.
  // This gives a continuous "splash, splash, splash" while wading.
  //
  const WET_STEP_DISTANCE = 32
  if (inAnyPuddle && grounded) {
    const dx = Math.abs(heroX - groundState.lastX)
    groundState.stepAccum += dx
    if (groundState.stepAccum >= WET_STEP_DISTANCE) {
      groundState.stepAccum = 0
      //
      // Lighter splash for each running step inside the puddle
      //
      Sound.playWaterFootstepKaplay?.(k, 0.32)
      //
      // Tiny burst of splash droplets so it reads visually too
      //
      const stepSplashCount = 4
      for (let i = 0; i < stepSplashCount; i++) {
        const angle = -Math.PI * (0.2 + Math.random() * 0.6)
        const speed = PUDDLE_SPLASH_SPEED_MIN * 0.6 + Math.random() * (PUDDLE_SPLASH_SPEED_MAX - PUDDLE_SPLASH_SPEED_MIN) * 0.6
        const nearestPuddle = puddles.find(p => Math.abs(heroX - p.x) < p.width / 2)
        if (!nearestPuddle) continue
        splashParticles.push({
          x: heroX + (Math.random() - 0.5) * 8,
          y: nearestPuddle.y,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed,
          life: PUDDLE_SPLASH_LIFETIME * 0.7,
          maxLife: PUDDLE_SPLASH_LIFETIME * 0.7
        })
      }
    }
  } else {
    //
    // Reset accumulator when leaving water so first new wet step doesn't
    // immediately fire a stale accumulated distance.
    //
    groundState.stepAccum = 0
  }
  groundState.lastX = heroX
  //
  // Override dust color to puddle blue while in water
  //
  //
  // When the hero splashes through a puddle his footfall dust takes the
  // puddle's deep-teal tint so the splash reads as on-palette water
  // rather than a stray bright cyan.
  //
  heroInst.dustColor = inAnyPuddle ? '#1A6E80' : null
  //
  // Suppress landing dust when above a puddle (set preemptively so
  // the physics collision callback sees it). Running dust is allowed.
  //
  const aboveAnyPuddle = puddles.some(p => Math.abs(heroInst.character.pos.x - p.x) < p.width / 2)
  heroInst.suppressDust = aboveAnyPuddle && !grounded
}
//
// Update splash particles: apply gravity and age
//
function onUpdatePuddleSplashes(k, particles) {
  const dt = k.dt()
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i]
    p.x += p.vx * dt
    p.vy += 200 * dt
    p.y += p.vy * dt
    p.life -= dt
    if (p.life <= 0) particles.splice(i, 1)
  }
}
//
// Draw puddle splash droplets
//
function drawPuddleSplashes(k, particles) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife)
    k.drawCircle({
      pos: k.vec2(p.x, p.y),
      radius: PUDDLE_SPLASH_SIZE,
      color: k.rgb(PUDDLE_COLOR_R + 30, PUDDLE_COLOR_G + 30, PUDDLE_COLOR_B + 30),
      opacity: alpha * 0.7
    })
  }
}
//
// Update thunder timer and trigger lightning flash
//
function onUpdateThunder(k, state, sound) {
  const dt = k.dt()
  if (state.flashTimer > 0) {
    state.flashTimer = Math.max(0, state.flashTimer - dt)
  }
  state.timer -= dt
  if (state.timer <= 0) {
    Sound.playThunderSound(sound)
    state.flashTimer = LIGHTNING_FLASH_DURATION
    state.timer = THUNDER_INTERVAL_MIN + Math.random() * (THUNDER_INTERVAL_MAX - THUNDER_INTERVAL_MIN)
  }
}
//
// Draw lightning flash between cloud bottom and dark back-tree canopy
//
function drawLightningFlash(k, state) {
  if (state.flashTimer <= 0) return
  const progress = state.flashTimer / LIGHTNING_FLASH_DURATION
  const alpha = progress * LIGHTNING_FLASH_OPACITY
  const screenW = CFG.visual.screen.width
  k.drawRect({
    pos: k.vec2(0, LIGHTNING_FLASH_TOP_Y),
    width: screenW,
    height: LIGHTNING_FLASH_BOTTOM_Y - LIGHTNING_FLASH_TOP_Y,
    color: k.rgb(220, 225, 240),
    opacity: alpha
  })
}
//
// Creates small fireflies drifting over the swamp in level 0
//
function createL0Fireflies(k) {
  const playableW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const fireflies = []
  //
  // Fireflies stay in the lower third of the play area near the ground
  //
  //
  // Keep fireflies within hero jump reach and away from floor-level blades
  //
  const fireflyMinY = FLOOR_Y - TOUCH_FIREFLY_MAX_HEIGHT_ABOVE_FLOOR
  const fireflyMaxY = FLOOR_Y - 20
  //
  // Mobile devices use a much smaller swarm so we cut both the per-firefly
  // glow draws and the onUpdate wander math. ~30% of the desktop count keeps
  // the atmosphere readable while saving lots of overdraw.
  //
  const fireflyCount = isTouchDevice() ? Math.max(6, Math.round(L0_FIREFLY_COUNT * 0.3)) : L0_FIREFLY_COUNT
  for (let i = 0; i < fireflyCount; i++) {
    //
    // Distribute starting positions evenly across the width
    //
    fireflies.push({
      x: LEFT_MARGIN + (i / fireflyCount) * playableW + Math.random() * (playableW / fireflyCount),
      y: fireflyMinY + Math.random() * (fireflyMaxY - fireflyMinY),
      radius: L0_FIREFLY_RADIUS_MIN + Math.random() * (L0_FIREFLY_RADIUS_MAX - L0_FIREFLY_RADIUS_MIN),
      glowSpeed: L0_FIREFLY_GLOW_SPEED_MIN + Math.random() * (L0_FIREFLY_GLOW_SPEED_MAX - L0_FIREFLY_GLOW_SPEED_MIN),
      phase: Math.random() * Math.PI * 2,
      speed: L0_FIREFLY_MIN_SPEED + Math.random() * (L0_FIREFLY_MAX_SPEED - L0_FIREFLY_MIN_SPEED),
      driftVx: (Math.random() - 0.5) * 12,
      driftVy: (Math.random() - 0.5) * 12
    })
  }
  fireflies._bounds = {
    minX: LEFT_MARGIN + 10,
    maxX: CFG.visual.screen.width - RIGHT_MARGIN - 10,
    minY: FLOOR_Y - TOUCH_FIREFLY_MAX_HEIGHT_ABOVE_FLOOR,
    maxY: FLOOR_Y - 20
  }
  k.add([
    //
    // z=26 places fireflies in front of trees (z=25) so they're never hidden
    //
    k.z(26),
    {
      draw() {
        drawL0Fireflies(k, fireflies)
      }
    }
  ])
  return { fireflies }
}
//
// Draw firefly glow dots
//
function drawL0Fireflies(k, fireflies) {
  const t = k.time()
  const touchMode = isTouchDevice()
  //
  // Cache shared color and camera X once per frame to avoid per-firefly allocations.
  // Culling uses hero position (camera proxy) with a half-screen margin.
  //
  const color = k.rgb(L0_FIREFLY_COLOR_R, L0_FIREFLY_COLOR_G, L0_FIREFLY_COLOR_B)
  const heroRef = fireflies._heroRef
  const cameraX = heroRef?.character?.pos?.x ?? k.width() / 2
  const screenHalfW = k.width() / 2 + L0_FIREFLY_DRAW_MARGIN
  for (const f of fireflies) {
    //
    // Skip fireflies that are off-screen (more than half a screen from camera center).
    //
    if (Math.abs(f.x - cameraX) > screenHalfW) continue
    const glow = (Math.sin(t * f.glowSpeed + f.phase) + 1) / 2
    const alpha = 0.15 + glow * 0.7
    if (!touchMode) {
      k.drawCircle({
        pos: k.vec2(f.x, f.y),
        radius: f.radius * 3,
        color,
        opacity: alpha * 0.15
      })
    }
    k.drawCircle({
      pos: k.vec2(f.x, f.y),
      radius: f.radius,
      color,
      opacity: alpha
    })
  }
}
//
// Creates small mushrooms on the ground using toCanvas(); skips floor puddle footprints.
//
function createMushrooms(k, floorPuddles = []) {
  const playableW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const mushrooms = []
  //
  // Horizontal clearance vs puddle ellipse centers (same convention as puddle width along X).
  //
  const overlapsAnyPuddle = (cx, halfFootprintX) => {
    for (const p of floorPuddles) {
      const dx = Math.abs(cx - p.x)
      if (dx < halfFootprintX + p.width / 2 + MUSHROOM_PUDDLE_CLEARANCE) return true
    }
    return false
  }
  //
  // Mushroom cap palette tuned for the touch teal+orange complementary
  // scheme. The warm half dominates (vibrant orange, burnt orange,
  // amber, warm tan) so mushrooms still feel earthy, while two cool
  // steel-teal variants thread through the cluster to echo the cool
  // BG / anti-hero identity. Replaces the previous all-warm autumn
  // set that read as a single colour blob on the new teal floor.
  //
  const capColors = [
    [220, 110, 40],
    [200, 80, 30],
    [240, 180, 70],
    [180, 130, 60],
    [90, 136, 152],
    [60, 100, 120]
  ]
  for (let i = 0; i < MUSHROOM_COUNT; i++) {
    const capW = MUSHROOM_CAP_WIDTH_MIN + Math.random() * (MUSHROOM_CAP_WIDTH_MAX - MUSHROOM_CAP_WIDTH_MIN)
    const capH = capW * (0.4 + Math.random() * 0.3)
    const stemH = MUSHROOM_STEM_HEIGHT_MIN + Math.random() * (MUSHROOM_STEM_HEIGHT_MAX - MUSHROOM_STEM_HEIGHT_MIN)
    const stemW = capW * (0.25 + Math.random() * 0.15)
    const totalW = Math.ceil(capW + 4)
    const totalH = Math.ceil(capH + stemH + 4)
    const halfFx = totalW * 0.5
    let posX = LEFT_MARGIN + playableW * 0.5
    let placedShroom = false
    for (let attempt = 0; attempt < 70; attempt++) {
      posX = LEFT_MARGIN + 60 + Math.random() * (playableW - 120)
      if (!overlapsAnyPuddle(posX, halfFx)) {
        placedShroom = true
        break
      }
    }
    if (!placedShroom) continue
    const color = capColors[Math.floor(Math.random() * capColors.length)]
    //
    // Draw mushroom to off-screen canvas
    //
    const spriteName = `mushroom-l0-${i}`
    //
    // Mushroom drawing is delegated to the shared draw-mushroom
    // primitive (`src/utils/draw-mushroom.js`) so on-screen mushrooms
    // and background-image mushrooms (ready / menu scenes) come out of
    // a single source of truth.
    //
    const dataUrl = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawMushroomToCanvas(ctx, {
        cx: totalW / 2,
        baseY: totalH - 2,
        capWidth: capW,
        capHeight: capH,
        stemWidth: stemW,
        stemHeight: stemH,
        capColor: color
      })
    })
    mushrooms.push({
      spriteName,
      dataUrl,
      x: posX,
      y: FLOOR_Y - totalH + 2,
      width: totalW,
      height: totalH,
      tooltipText: Math.random() < MUSHROOM_FUNNY_TOOLTIP_CHANCE
        ? MUSHROOM_FUNNY_LINES[Math.floor(Math.random() * MUSHROOM_FUNNY_LINES.length)]
        : null
    })
  }
  //
  // Load sprites and draw mushrooms
  //
  mushrooms.forEach(m => {
    loadTouchSprite(k, m.spriteName, m.dataUrl)
    //
    // Free the canvas reference so GC can collect the object after sprite upload
    //
    m.dataUrl = null
  })
  k.add([
    k.z(6),
    {
      draw() {
        drawMushrooms(k, mushrooms)
      }
    }
  ])
  return mushrooms
}
//
// Draw mushroom sprites on the floor
//
function drawMushrooms(k, mushrooms) {
  for (const m of mushrooms) {
    k.drawSprite({
      sprite: m.spriteName,
      pos: k.vec2(m.x, m.y)
    })
  }
}
/**
 * Builds a single grass blade entry suitable for the dynamic grass drawer.
 * Centralises blade visual parameters so both layered and per-rock grass
 * generation produce blades with consistent style.
 *
 * @param {Object} k - Kaplay instance
 * @param {number} baseX - World X for the blade base
 * @param {number} grassY - Ground Y for the blade base
 * @param {number} scale - Layer scale factor
 * @param {number} baseOpacity - Layer base opacity
 * @param {number} baseR - Base R color channel
 * @param {number} baseG - Base G color channel
 * @param {number} baseB - Base B color channel
 * @returns {Object} Blade descriptor consumed by the grass drawer
 */
function buildGrassBlade(k, baseX, grassY, scale, baseOpacity, baseR, baseG, baseB) {
  //
  // Blade height reduced by 30 % from the previous (10–30 px) range
  // so the front-layer grass tufts sit lower on the floor and don't
  // overpower the rest of the scene. Range = (7–21 px) × scale.
  //
  const height = (7 + Math.random() * 14) * scale
  const bendX = (Math.random() - 0.5) * 6
  return {
    x1: baseX,
    y1: grassY,
    baseX2: baseX + bendX,
    y2: grassY - height,
    height,
    swaySpeed: 0.8 + Math.random() * 0.6,
    swayAmount: (2 + Math.random() * 3) * scale,
    swayOffset: Math.random() * Math.PI * 2,
    color: k.rgb(
      baseR + Math.random() * 20,
      baseG + Math.random() * 20,
      baseB + Math.random() * 15
    ),
    opacity: baseOpacity + Math.random() * 0.15,
    width: (0.8 + Math.random() * 0.4) * scale
  }
}
/**
 * Adds extra grass blades around each rock so vegetation looks like it's
 * actually growing out of the soil at the rock base. Blades are pushed into
 * the shared `allBlades` array so the existing grass drawer renders them.
 *
 * @param {Object} k - Kaplay instance
 * @param {Array} rocks - Rocks returned by createRocks
 * @param {Array} allBlades - Shared grass blade array (mutated)
 * @param {number} grassY - Ground Y for blade bases
 */
/**
 * Removes any grass blade whose base X sits inside one of the floor
 * puddles. Mutates `allBlades` in place. Grass blades have a single
 * base position `x1` (anchored to the floor line), so a horizontal
 * range test against each puddle's ellipse width is sufficient — the
 * floor + puddle Y already match by construction.
 *
 * @param {Array<Object>} allBlades - Shared grass-blade list
 * @param {Array<Object>} puddles - Puddle descriptors with x + width
 */
function pruneGrassInPuddles(allBlades, puddles) {
  if (!puddles || puddles.length === 0) return
  //
  // Build {min, max} ranges once so the inner loop is O(blades * puddles)
  // of cheap numeric compares (puddle counts are tiny — 0..8).
  //
  const ranges = puddles.map(p => ({ min: p.x - p.width / 2, max: p.x + p.width / 2 }))
  //
  // In-place filter: walk the array, drop blades inside any puddle range.
  //
  let write = 0
  for (let read = 0; read < allBlades.length; read++) {
    const baseX = allBlades[read].x1
    let inPuddle = false
    for (const r of ranges) {
      if (baseX >= r.min && baseX <= r.max) { inPuddle = true; break }
    }
    if (!inPuddle) {
      allBlades[write++] = allBlades[read]
    }
  }
  allBlades.length = write
}

function addGrassAroundRocks(k, rocks, allBlades, grassY) {
  //
  // Front-layer color palette to match the rest of the front grass
  //
  const touchMode = isTouchDevice()
  const grassBaseR = 60
  const grassBaseG = 85
  const grassBaseB = 40
  for (const rock of rocks) {
    const blades = touchMode
      ? 1 + Math.floor(Math.random() * 2)
      : 3 + Math.floor(Math.random() * 5)
    for (let i = 0; i < blades; i++) {
      //
      // Place blades on either side of the rock base, never directly under
      //
      const sign = Math.random() < 0.5 ? -1 : 1
      const offset = rock.radius * (0.7 + Math.random() * 0.6)
      const baseX = rock.worldX + sign * offset
      allBlades.push(buildGrassBlade(k, baseX, grassY, 1.0, 0.85, grassBaseR, grassBaseG, grassBaseB))
    }
  }
}
/**
 * Generates realistic-looking rocks scattered along the bottom platform.
 * Each rock is rendered once into a PNG sprite (irregular polygon body with a
 * darker bottom shadow + lighter top highlight + thin black outline).
 * Returns an array of rock world positions/sizes so other systems (moss, grass)
 * can cluster around them.
 *
 * @param {Object} k - Kaplay instance
 * @returns {Array} Array of {x, y, radius} for placed rocks
 */
function createRocks(k, thornData) {
  const playableW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  //
  // Reserve enough room so the rock sprite never extends outside the game area walls.
  // Rock sprite width = radius * 2.6; use the max radius so all rocks are safe.
  //
  const maxRockSpriteW = Math.ceil(ROCK_RADIUS_MAX * 2.6)
  //
  // Derive thorn coverage bands: each thorn's X ± half its width plus a clearance margin.
  // Rocks whose footprint overlaps a thorn band are rejected.
  //
  const ROCK_THORN_CLEARANCE = 28
  const thornBands = (thornData ?? []).map(t => ({
    minX: t.x - t.width / 2 - ROCK_THORN_CLEARANCE,
    maxX: t.x + t.width / 2 + ROCK_THORN_CLEARANCE
  }))
  const rockOverlapsThorns = (rx, rw) => {
    const rMin = rx
    const rMax = rx + rw
    return thornBands.some(b => rMax > b.minX && rMin < b.maxX)
  }
  const rocks = []
  let spriteIdx = 0
  for (let i = 0; i < ROCK_COUNT; i++) {
    const radius = ROCK_RADIUS_MIN + Math.random() * (ROCK_RADIUS_MAX - ROCK_RADIUS_MIN)
    const spriteW = Math.ceil(radius * 2.6)
    //
    // Find a base X for the main rock, avoiding hero spawn corridor and thorn clusters.
    // Upper bound ensures sprite right edge stays within the right game wall.
    //
    let posX = LEFT_MARGIN + Math.random() * (playableW - maxRockSpriteW)
    let safety = 0
    while (
      (Math.abs(posX - HERO_SPAWN_X) < HERO_SPAWN_GRASS_THORN_EXCLUDE_HALF_WIDTH
        || rockOverlapsThorns(posX, spriteW))
      && safety < 40
    ) {
      posX = LEFT_MARGIN + Math.random() * (playableW - maxRockSpriteW)
      safety++
    }
    if (rockOverlapsThorns(posX, spriteW)) continue
    const mainRock = buildSingleRock(k, posX, radius, `rock-l0-${spriteIdx++}`)
    rocks.push(mainRock)
    //
    // Cluster: spawn 1-2 smaller satellite rocks beside the main one
    //
    if (Math.random() < ROCK_CLUSTER_CHANCE) {
      const satCount = ROCK_CLUSTER_SATELLITES_MIN + Math.floor(Math.random() * (ROCK_CLUSTER_SATELLITES_MAX - ROCK_CLUSTER_SATELLITES_MIN + 1))
      for (let s = 0; s < satCount; s++) {
        const ratio = ROCK_SATELLITE_RADIUS_RATIO_MIN + Math.random() * (ROCK_SATELLITE_RADIUS_RATIO_MAX - ROCK_SATELLITE_RADIUS_RATIO_MIN)
        const satRadius = radius * ratio
        //
        // Place satellite tucked next to the main rock with slight overlap
        //
        const sign = Math.random() < 0.5 ? -1 : 1
        const horizontalGap = radius * 0.55 + satRadius * 0.4 + Math.random() * 8
        const satSpriteW = Math.ceil(satRadius * 2.6)
        const rawSatX = posX + sign * horizontalGap
        //
        // Clamp satellite so its sprite also stays inside the game area walls.
        //
        const satX = Math.max(LEFT_MARGIN, Math.min(LEFT_MARGIN + playableW - satSpriteW, rawSatX))
        if (Math.abs(satX - HERO_SPAWN_X) < HERO_SPAWN_GRASS_THORN_EXCLUDE_HALF_WIDTH) continue
        if (rockOverlapsThorns(satX, satSpriteW)) continue
        rocks.push(buildSingleRock(k, satX, satRadius, `rock-l0-${spriteIdx++}`))
      }
    }
  }
  rocks.forEach(r => {
    loadTouchSprite(k, r.spriteName, r.dataUrl)
    //
    // Release canvas reference after GPU upload so GC can reclaim the object
    //
    r.dataUrl = null
  })
  const rocksBehind = []
  const rocksInFront = []
  for (const rock of rocks) {
    (Math.random() < 0.5 ? rocksBehind : rocksInFront).push(rock)
  }
  k.add([
    k.z(L0_ROCK_Z_BEHIND_COLORFUL_ROW),
    {
      draw() {
        for (const rock of rocksBehind) {
          k.drawSprite({ sprite: rock.spriteName, pos: k.vec2(rock.x, rock.y) })
        }
      }
    }
  ])
  k.add([
    k.z(L0_ROCK_Z_IN_FRONT_OF_COLORFUL_ROW),
    {
      draw() {
        for (const rock of rocksInFront) {
          k.drawSprite({ sprite: rock.spriteName, pos: k.vec2(rock.x, rock.y) })
        }
      }
    }
  ])
  return rocks
}
/**
 * Builds a single rock sprite + world descriptor. Extracted from createRocks
 * so it can be reused for satellite cluster rocks.
 *
 * @param {Object} k - Kaplay instance
 * @param {number} posX - World X for the rock base center
 * @param {number} radius - Base radius driving the rock outline
 * @param {string} spriteName - Unique sprite name for Kaplay asset cache
 * @returns {Object} Rock descriptor used by drawing + clustering systems
 */
function buildSingleRock(k, posX, radius, spriteName) {
  //
  // Rock silhouette + palette come from the shared `draw-rock`
  // primitive so L0's main rocks, the touch floor-rocks utility and
  // the menu/ready background generator all paint the same boulder.
  //
  const verts = buildRockVertices(radius)
  const palette = buildRockPalette({ baseR: ROCK_BASE_R, baseG: ROCK_BASE_G, baseB: ROCK_BASE_B })
  //
  // Sprite canvas dimensions match the shared rock outline footprint
  // (radius * 2.6 wide, * 1.9 tall, with the silhouette centre at 0.56
  // of the height).
  //
  const totalW = Math.ceil(radius * 2.6)
  const totalH = Math.ceil(radius * 1.9)
  const cx = totalW / 2
  const cy = totalH * 0.56
  //
  // Crop the sprite canvas to the above-ground portion. Anything below
  // FLOOR_Y is clipped by reducing the canvas height. `ROCK_LIFT_FROM_FLOOR`
  // shifts every rock a few pixels above the grass line so their bases
  // stop visibly biting into the ground edge — previously rocks sat
  // tangent to (or slightly below) the floor line, reading as half-
  // buried instead of resting on it.
  //
  const ROCK_LIFT_FROM_FLOOR = 0
  const randSink = Math.random() * 5
  const posY = FLOOR_Y - totalH * 0.62 + randSink - ROCK_LIFT_FROM_FLOOR
  const croppedH = Math.max(8, Math.ceil(totalH * 0.62 - randSink))
  const dataUrl = toCanvas({ width: totalW, height: croppedH, pixelRatio: 1 }, (ctx) => {
    drawRockToCanvas(ctx, { cx, cy, radius, verts, palette })
  })
  return { spriteName, dataUrl, x: posX, y: posY, totalW, totalH: croppedH, radius, worldX: posX + cx - totalW / 2, worldY: posY + cy }
}
//
// Per-tree RGB jitter for Touch L0 grey-leaf parallax band (keeps neutrals from reading flat).
//
function jitterL0GreyOrganicRgb(baseR, baseG, baseB) {
  const j = L0_GREY_ORGANIC_JITTER
  return {
    r: Math.max(14, Math.min(32, Math.round(baseR + (Math.random() - 0.5) * j))),
    g: Math.max(14, Math.min(32, Math.round(baseG + (Math.random() - 0.5) * j))),
    b: Math.max(14, Math.min(32, Math.round(baseB + (Math.random() - 0.5) * j)))
  }
}
//
// Absolute bottom Y for any root in the scene. Computed once from screen height
// and BOTTOM_MARGIN so roots never extend past the visible platform edge.
//
const TREE_ROOT_ABSOLUTE_MAX_Y = CFG.visual.screen.height - 6
//
// Single earthy brown tint kept for trunk/root palette coherence where descriptors still carry rootColor.
//
//
// Foreground tree roots — burnt umber, the warm complement to the teal
// world. Replaces the previous olive tone that fought the new palette.
//
const L0_TREE_ROOT_COLOR_R = 112
const L0_TREE_ROOT_COLOR_G = 64
const L0_TREE_ROOT_COLOR_B = 34
//
// Organic generator depth clamp (L0 draws trunk-only organic silhouettes; no underground roots).
//
const L0_ORGANIC_ROOT_DEPTH_MAX = 123
//
//
// Sets up the TOUCH letter collection system (T → O → U → C).
// Draws letters as glowing world-space objects and checks hero proximity each frame.
//
function setupTouchLetterSystem(k, cfg) {
  const {
    bug4X, bug4BackPlatformY, antiHeroPlatform,
    fireflyRuntime, bugs, allBugsCombined,
    levelIndicator, sound, touchMusic, wallColorHex, levelHelpInst,
    initialLifeScore, monsterBugs
  } = cfg
  const fireflies = fireflyRuntime.fireflies
  //
  // Initialize all fireflies without collected flag
  //
  fireflies.forEach(f => { f.collected = false })
  fireflies._allCollected = false
  //
  // Mutable state
  //
  const tX = bug4X + TOUCH_LETTER_T_X_OFFSET
  //
  // T is "stuck in the ground" — bottom anchor sits below the floor line
  //
  const tY = FLOOR_Y + 28
  const oInitX = antiHeroPlatform?.pos?.x ?? bug4X
  //
  // O rests on the monster head; anchor = 'bot', bottom of letter sinks
  // TOUCH_LETTER_O_Y_OFFSET px below the platform top so it looks embedded
  //
  const oInitY = (antiHeroPlatform?.pos?.y ?? bug4BackPlatformY) + TOUCH_LETTER_O_Y_OFFSET
  const state = {
    tCollected: false,
    oCollected: false,
    uCollected: false,
    cCollected: false,
    heroInst: null,
    gatherActive: false,
    gatherBugsArrived: false,
    gatherWaitTimer: 0,
    gatherTimer: 0,
    gatherSoundTimer: 0,
    gatherSoundInterval: TOUCH_GATHER_SOUND_INTERVAL_MIN,
    //
    // Set to true by the Enter/Space key listener to skip the post-arrive delay.
    //
    enterSkip: false,
    //
    // Tall monster bugs — moved toward hero during gather phase
    //
    monsterBugs: monsterBugs ?? [],
    //
    // Tracks previous hero X to detect idle state during gather
    //
    gatherHeroPrevX: null,
    gatherHeroIdleTimer: 0,
    gatherHeroIsIdle: false,
    //
    // Snapshot taken at level entry; restored on completion so deaths this
    // level do not permanently inflate the teacher's score.
    //
    _initialLifeScore: initialLifeScore ?? 0,
    //
    // Letter game objects (teal outlined, tilt, bottom-anchored at floor)
    //
    tObj: createPickupLetter(k, 'T', tX, tY, TOUCH_LETTER_TILTS[0]),
    //
    // Mask rect drawn above the T letter to clip its below-floor portion
    //
    tMask: createFloorMask(k, tX, tY),
    //
    // O is always visible on the monster from the start
    //
    oObj: createPickupLetter(k, 'O', oInitX, oInitY, TOUCH_LETTER_TILTS[1]),
    uObj: null,
    cObj: null,
    //
    // Firefly platform Kaplay physics object (invisible collision body)
    //
    fireflyPlatformObj: null,
    fireflyPlatformVisible: false,
    //
    // Which side of the monster the platform was locked to ('left'|'right'|null)
    //
    fireflyPlatformSide: null,
    //
    // Frozen X/Y position of the firefly platform — set once on creation, not updated per frame
    //
    fireflyPlatformLockedX: null,
    fireflyPlatformLockedY: null,
    //
    // Seconds the current firefly platform has been active
    //
    fireflyPlatformTimer: 0,
    //
    // Hidden platforms for U and C
    //
    hiddenPlatformU: null,
    hiddenPlatformC: null,
    //
    // X/Y firefly counter displayed near hero head during collect mode
    //
    fireflyCounter: null,
    //
    // Dialog lock: prevent pickup while dialog is open
    //
    dialogOpen: false,
    //
    // Previous frame X of anti-hero platform for hero-carry detection
    //
    prevPlatX: antiHeroPlatform?.pos?.x ?? 0,
    //
    // onUpdate is called by the runtime every frame
    //
    onUpdate: null
  }
  //
  // Shared pulse updater: all letters fade in and out together
  //
  k.onUpdate(() => {
    const t = k.time()
    const pulse = (Math.sin(t * TOUCH_LETTER_PULSE_SPEED) + 1) / 2
    const opacity = TOUCH_LETTER_PULSE_MIN + (1 - TOUCH_LETTER_PULSE_MIN) * pulse
    //
    // Color lerps from teal toward white as pulse peaks, for maximum contrast
    //
    const cr = Math.round(TOUCH_LETTER_COLOR_R + (255 - TOUCH_LETTER_COLOR_R) * pulse)
    const cg = Math.round(TOUCH_LETTER_COLOR_G + (255 - TOUCH_LETTER_COLOR_G) * pulse)
    const cb = Math.round(TOUCH_LETTER_COLOR_B + (255 - TOUCH_LETTER_COLOR_B) * pulse)
    const applyOpacity = (obj) => {
      if (!obj) return
      obj.main.opacity = opacity
      obj.main.color = k.rgb(cr, cg, cb)
      obj.outlines.forEach(o => o.exists?.() && (o.opacity = opacity))
    }
    !state.tCollected && applyOpacity(state.tObj)
    !state.oCollected && applyOpacity(state.oObj)
    //
    // U letter doesn't blink — stays at its semi-transparent static opacity
    //
    !state.cCollected && applyOpacity(state.cObj)
    !state.cCollected && applyOpacity(state.hObj)
  })
  //
  // Frame-by-frame update: letter pickup detection and phase transitions
  //
  state.onUpdate = () => onUpdateTouchLetterSystem(k, state, fireflies, bug4X, bug4BackPlatformY, antiHeroPlatform, bugs, allBugsCombined, levelIndicator, sound, touchMusic, wallColorHex, levelHelpInst)
  return state
}
/**
 * Creates a single pickup letter as Kaplay game objects (outlined teal text with tilt).
 * Returns an object with moveTo(x,y) and destroy() methods.
 * @param {Object} k - Kaplay instance
 * @param {string} letter - Letter to render
 * @param {number} x - World X position (bottom center)
 * @param {number} y - World Y position (bottom of letter = floor level)
 * @param {number} tiltDeg - Rotation in degrees
 * @returns {Object} Letter handle with moveTo and destroy
 */
function createPickupLetter(k, letter, x, y, tiltDeg) {
  const font = CFG.visual.fonts.thinFull.replace(/'/g, '')
  const oo = TOUCH_LETTER_OUTLINE
  //
  // Drop shadow (single black copy offset right+down), glow-level style.
  //
  const offsets = [[oo, oo]]
  const outlines = offsets.map(([dx, dy]) => k.add([
    k.text(letter, { size: TOUCH_LETTER_SIZE, font }),
    k.pos(x + dx, y + dy),
    k.anchor('bot'),
    k.rotate(tiltDeg),
    k.color(0, 0, 0),
    k.z(26)
  ]))
  const main = k.add([
    k.text(letter, { size: TOUCH_LETTER_SIZE, font }),
    k.pos(x, y),
    k.anchor('bot'),
    k.rotate(tiltDeg),
    k.color(TOUCH_LETTER_COLOR_R, TOUCH_LETTER_COLOR_G, TOUCH_LETTER_COLOR_B),
    k.z(27)
  ])
  const moveTo = (nx, ny) => {
    main.pos.x = nx
    main.pos.y = ny
    offsets.forEach(([dx, dy], i) => {
      outlines[i].pos.x = nx + dx
      outlines[i].pos.y = ny + dy
    })
  }
  const destroy = () => {
    main.destroy?.()
    outlines.forEach(o => o.destroy?.())
  }
  return { main, outlines, moveTo, destroy }
}
//
// Main per-frame update for the TOUCH letter system.
//
function onUpdateTouchLetterSystem(k, state, fireflies, bug4X, bug4BackPlatformY, antiHeroPlatform, bugs, allBugsCombined, levelIndicator, sound, touchMusic, wallColorHex, levelHelpInst) {
  if (state.gatherActive) {
    onUpdateGatherPhase(k, state, bugs, allBugsCombined, touchMusic, sound)
    return
  }
  const hero = state.heroInst
  if (!hero?.character?.pos) return
  const heroX = hero.character.pos.x
  const heroY = hero.character.pos.y
  //
  // Carry hero with the walking monster platform (activated during trap 2)
  //
  if (antiHeroPlatform?.pos) {
    const currentPlatX = antiHeroPlatform.pos.x
    const deltaX = currentPlatX - state.prevPlatX
    if (Math.abs(deltaX) > 0.01) {
      const platTopY = antiHeroPlatform.pos.y
      const heroFoot = heroY + HERO_FOOT_OFFSET_Y
      const onPlatY = heroFoot >= platTopY - ANTIHERO_PLATFORM_DETECT_Y_TOL && heroFoot <= platTopY + ANTIHERO_PLATFORM_DETECT_Y_TOL
      const onPlatX = Math.abs(heroX - currentPlatX) < ANTIHERO_PLATFORM_DETECT_HALF_W
      if (onPlatY && onPlatX) {
        hero.character.pos.x += deltaX
      }
    }
    state.prevPlatX = currentPlatX
  }
  if (state.dialogOpen) return
  //
  // O game object always tracks the bug4 monster head position
  //
  if (state.oObj && antiHeroPlatform?.pos) {
    //
    // O tracks monster head; anchor = 'bot', bottom sinks TOUCH_LETTER_O_Y_OFFSET below head top
    //
    state.oObj.moveTo(antiHeroPlatform.pos.x, antiHeroPlatform.pos.y + TOUCH_LETTER_O_Y_OFFSET)
  }
  //
  // Firefly mode state machine
  //
  if (!state.tCollected) {
    //
    // Before T: fireflies flee from hero
    //
    fireflies._mode = 'flee'
  } else if (!state.oCollected) {
    //
    // After T: hero must touch individual fireflies.
    // Check proximity and mark each one as collected.
    //
    fireflies._mode = 'collect'
    const touchRSq = TOUCH_FIREFLY_TOUCH_RADIUS * TOUCH_FIREFLY_TOUCH_RADIUS
    let allDone = true
    let collectedCount = 0
    for (const f of fireflies) {
      if (!f.collected) {
        const dx = heroX - f.x
        const dy = heroY - f.y
        if (dx * dx + dy * dy < touchRSq) {
          f.collected = true
          //
          // Play soft chime for each individually collected firefly
          //
          sound && Sound.playFireflyPickupSound(sound)
        } else {
          allDone = false
        }
      } else {
        collectedCount++
      }
    }
    if (allDone && !fireflies._allCollected) {
      fireflies._allCollected = true
      //
      // Burst chirp when the last firefly is collected
      //
      sound && Sound.playFireflyBurstSound(sound, fireflies.length)
    }
    //
    // Show / update X/Y counter near hero head — hidden while hero is dying
    //
    if (state.heroInst?.isDying) {
      hideFireflyCounter(state)
    } else {
      updateFireflyCounter(k, state, collectedCount, fireflies.length, heroX, heroY)
    }
    //
    // When all collected and hero is near monster: form platform on hero's side
    //
    if (fireflies._allCollected) {
      const monsterX = antiHeroPlatform?.pos?.x ?? bug4X
      const distToMonster = Math.abs(heroX - monsterX)
      if (distToMonster < TOUCH_FIREFLY_PLATFORM_FORM_DIST) {
        //
        // Start timer on the very first frame of this platform session
        //
        if (!state.fireflyPlatformSide) {
          state.fireflyPlatformTimer = 0
        }
        state.fireflyPlatformTimer += k.dt()
        if (state.fireflyPlatformTimer >= TOUCH_FIREFLY_PLATFORM_DURATION) {
          //
          // Timer expired: dissolve platform, fireflies return to hero.
          //
          destroyFireflyPlatform(state, fireflies)
        } else {
          fireflies._mode = 'platform'
          //
          // Determine side from hero's CURRENT position relative to monster each frame
          // until all fireflies arrive. This ensures fireflies always fly directly to
          // the final assembly point without an intermediate leftward/rightward detour.
          //
          const currentSide = heroX < monsterX ? 'left' : 'right'
          const sideSign = currentSide === 'left' ? -1 : 1
          const platX = monsterX + sideSign * TOUCH_FIREFLY_PLATFORM_SIDE_OFFSET
          const platY = TOUCH_FIREFLY_PLATFORM_ACTUAL_Y
          if (!fireflies._allAtPlatform) {
            state.fireflyPlatformSide = currentSide
            state.fireflyPlatformLockedX = platX
            state.fireflyPlatformLockedY = platY
          } else if (!state.fireflyPlatformLockedX) {
            state.fireflyPlatformLockedX = platX
            state.fireflyPlatformLockedY = platY
          }
          state.fireflyPlatformSide = state.fireflyPlatformSide ?? currentSide
          fireflies._platformX = state.fireflyPlatformLockedX
          fireflies._platformY = state.fireflyPlatformLockedY
          //
          // Create collision box only after ALL fireflies have reached their target.
          // Also reset the 5-sec hold timer at this moment — it must count from
          // when the platform is actually formed, not from when the hero first walked near.
          //
          if (!state.fireflyPlatformObj && fireflies._allAtPlatform) {
            state.fireflyPlatformObj = createFireflyPlatform(k, state.fireflyPlatformLockedX, state.fireflyPlatformLockedY)
            state.fireflyPlatformTimer = 0
          }
          state.fireflyPlatformVisible = true
        }
      } else {
        //
        // Hero moved away from monster: dissolve platform and follow hero
        //
        state.fireflyPlatformObj && destroyFireflyPlatform(state, fireflies)
      }
    }
  } else if (!state.uCollected) {
    //
    // O collected: ensure any active firefly platform is cleaned up, then follow hero
    //
    state.fireflyPlatformObj && destroyFireflyPlatform(state, fireflies)
    fireflies._mode = 'follow'
    destroyFireflyCounter(state)
  } else {
    //
    // U collected: randomise each firefly's drift on first frame, then scatter freely
    //
    if (!fireflies._scattered) {
      fireflies._scattered = true
      for (const f of fireflies) {
        f.driftVx = (Math.random() - 0.5) * 90
        f.driftVy = (Math.random() * 55 + 15) * (Math.random() < 0.5 ? 1 : -1)
      }
    }
    fireflies._mode = 'scatter'
    destroyFireflyCounter(state)
  }
  //
  // Check letter pickups using game object positions
  //
  if (!state.tCollected && state.tObj) {
    const tx = state.tObj.main.pos.x
    const ty = state.tObj.main.pos.y
    checkLetterPickup(heroX, heroY, { x: tx, y: ty - TOUCH_LETTER_SIZE / 2 }, () => collectLetterT(k, state, fireflies, levelIndicator, sound, wallColorHex, levelHelpInst))
  }
  if (state.tCollected && !state.oCollected && state.oObj) {
    const ox = state.oObj.main.pos.x
    const oy = state.oObj.main.pos.y
    checkLetterPickup(heroX, heroY, { x: ox, y: oy - TOUCH_LETTER_SIZE / 2 }, () => collectLetterO(k, state, levelIndicator, sound, wallColorHex, levelHelpInst))
  }
  if (state.oCollected && !state.uCollected && state.uObj) {
    const ux = state.uObj.main.pos.x
    const uy = state.uObj.main.pos.y
    checkLetterPickup(heroX, heroY, { x: ux, y: uy - TOUCH_LETTER_SIZE / 2 }, () => collectLetterU(k, state, levelIndicator, sound, wallColorHex, levelHelpInst))
  }
  if (state.uCollected && !state.cCollected && state.cObj) {
    const cx = state.cObj.main.pos.x
    const cy = state.cObj.main.pos.y
    checkLetterPickup(heroX, heroY, { x: cx, y: cy - TOUCH_LETTER_SIZE / 2 }, () => collectLetterC(k, state, fireflies, bugs, allBugsCombined, levelIndicator, sound, touchMusic, wallColorHex, levelHelpInst))
  }
}
//
// Checks if hero is close enough to a letter position to collect it.
//
function checkLetterPickup(heroX, heroY, pos, onCollect) {
  if (!pos) return
  const dx = heroX - pos.x
  const dy = heroY - pos.y
  if (dx * dx + dy * dy < TOUCH_LETTER_COLLECT_RADIUS * TOUCH_LETTER_COLLECT_RADIUS) {
    onCollect()
  }
}
//
// Hero collects letter T — switches to individual collect mode, dialog shown.
//
function collectLetterT(k, state, fireflies, levelIndicator, sound, wallColorHex, levelHelpInst) {
  if (state.tCollected) return
  state.tCollected = true
  state.dialogOpen = true
  state.tObj?.destroy()
  state.tObj = null
  state.tMask?.destroy?.()
  state.tMask = null
  sound && Sound.playLetterPickupSoft(sound)
  //
  // After T: individual collect mode (flee stops)
  //
  fireflies._mode = 'collect'
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, 1)
  LevelIndicator.flashLetterBurst(levelIndicator, 1)
  levelHelpInst && (levelHelpInst.goalText = TOUCH_GOAL_TEXT_T)
  LevelHelp.openStandalonePanel(k, TOUCH_DIALOG_T, {
    fillRgb: { r: 21, g: 37, b: 40 },
    textRgb: { r: TOUCH_LETTER_COLOR_R, g: TOUCH_LETTER_COLOR_G, b: TOUCH_LETTER_COLOR_B },
    borderRgb: { r: TOUCH_LETTER_COLOR_R, g: TOUCH_LETTER_COLOR_G, b: TOUCH_LETTER_COLOR_B },
    sceneBackdropHex: wallColorHex,
    //
    // Yellow highlight for the T in "Trust" via Kaplay inline style tag [hl]
    //
    textStyles: { hl: { color: k.rgb(255, 220, 0), override: true } },
    onClose: () => { state.dialogOpen = false }
  })
}
//
// Hero collects letter O — hidden platform + letter U appear.
//
function collectLetterO(k, state, levelIndicator, sound, wallColorHex, levelHelpInst) {
  if (state.oCollected) return
  state.oCollected = true
  state.dialogOpen = true
  state.oObj?.destroy()
  state.oObj = null
  sound && Sound.playLetterPickupSoft(sound)
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, 2)
  LevelIndicator.flashLetterBurst(levelIndicator, 2)
  levelHelpInst && (levelHelpInst.goalText = TOUCH_GOAL_TEXT_O)
  LevelHelp.openStandalonePanel(k, TOUCH_DIALOG_O, {
    fillRgb: { r: 21, g: 37, b: 40 },
    textRgb: { r: TOUCH_LETTER_COLOR_R, g: TOUCH_LETTER_COLOR_G, b: TOUCH_LETTER_COLOR_B },
    borderRgb: { r: TOUCH_LETTER_COLOR_R, g: TOUCH_LETTER_COLOR_G, b: TOUCH_LETTER_COLOR_B },
    sceneBackdropHex: wallColorHex,
    textStyles: { hl: { color: k.rgb(255, 220, 0), override: true } },
    onClose: () => {
      state.dialogOpen = false
      //
      // Spawn letter U floating in air (no platform beneath it — hero must use bugs to reach)
      //
      const playW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
      const uPlatCX = LEFT_MARGIN + playW * 0.48
      const uFloatY = ANTIHERO_PLATFORM_Y + TOUCH_U_PLATFORM_Y_LOWER
      state.uObj = createPickupLetter(k, 'U', uPlatCX, uFloatY + TOUCH_U_LETTER_Y_EXTRA, TOUCH_LETTER_TILTS[2])
      //
      // U letter is intentionally hard to see — hero must search for it
      //
      state.uObj.main.opacity = TOUCH_U_LETTER_OPACITY
      state.uObj.outlines.forEach(o => { o.opacity = TOUCH_U_LETTER_OPACITY * 0.5 })
    }
  })
}
//
// Hero collects letter U — second hidden platform + letter C appear.
//
function collectLetterU(k, state, levelIndicator, sound, wallColorHex, levelHelpInst) {
  if (state.uCollected) return
  state.uCollected = true
  state.dialogOpen = true
  state.uObj?.destroy()
  state.uObj = null
  sound && Sound.playLetterPickupSoft(sound)
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, 3)
  LevelIndicator.flashLetterBurst(levelIndicator, 3)
  levelHelpInst && (levelHelpInst.goalText = TOUCH_GOAL_TEXT_U)
  LevelHelp.openStandalonePanel(k, TOUCH_DIALOG_U, {
    fillRgb: { r: 21, g: 37, b: 40 },
    textRgb: { r: TOUCH_LETTER_COLOR_R, g: TOUCH_LETTER_COLOR_G, b: TOUCH_LETTER_COLOR_B },
    borderRgb: { r: TOUCH_LETTER_COLOR_R, g: TOUCH_LETTER_COLOR_G, b: TOUCH_LETTER_COLOR_B },
    sceneBackdropHex: wallColorHex,
    textStyles: { hl: { color: k.rgb(255, 220, 0), override: true } },
    onClose: () => {
      state.dialogOpen = false
      //
      // Spawn second hidden platform and letter C (fireflies scatter after this)
      //
      const playW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
      //
      // C platform: same log style and size as U platform, placed slightly right of center
      //
      const cPlatCX = LEFT_MARGIN + playW * 0.72
      const cPlatY = ANTIHERO_PLATFORM_Y + TOUCH_C_PLATFORM_Y_LOWER
      const cLogHalfW = TOUCH_LOG_PLATFORM_W / 2
      state.hiddenPlatformC = LogPlatform.create({ k, x: cPlatCX - cLogHalfW, y: cPlatY, width: TOUCH_LOG_PLATFORM_W, height: TOUCH_LOG_PLATFORM_H })
      //
      // CH are collected together — C on the left, H on the right, side by side on the platform
      //
      state.cObj = createPickupLetter(k, 'C', cPlatCX - TOUCH_CH_SPACING / 2, cPlatY + 12, TOUCH_LETTER_TILTS[3])
      state.hObj = createPickupLetter(k, 'H', cPlatCX + TOUCH_CH_SPACING / 2, cPlatY + 14, TOUCH_LETTER_TILT_H)
    }
  })
}
//
// Hero collects letter C — gather all bugs + fireflies, then transition.
//
function collectLetterC(k, state, fireflies, bugs, allBugsCombined, levelIndicator, sound, touchMusic, wallColorHex, levelHelpInst) {
  if (state.cCollected) return
  state.cCollected = true
  state.dialogOpen = true
  state.cObj?.destroy()
  state.cObj = null
  //
  // H is always collected with C as a pair
  //
  state.hObj?.destroy()
  state.hObj = null
  //
  // Remove the C platform so the hero falls down after collecting the last letter
  //
  state.hiddenPlatformC?.destroy()
  state.hiddenPlatformC = null
  //
  // Clear any lingering scared state on bugs so they walk freely from this point.
  // Also reset state to 'crawling' for any currently scared bug — the scare guard
  // in onUpdateBugScare will now prevent new scares, but bugs already in 'scared'
  // state would stay visually crouched and be skipped by onUpdateGatherPhase.
  //
  const resetBug = (bugInst) => {
    bugInst.isScared = false
    bugInst.justRecovered = false
    bugInst.justRecoveredTimer = 0
    bugInst.dropOffset = 0
    //
    // Reset both 'scared' and 'recovering' states so bugs walk normally
    // and their legs are not held in the crouched/contracted position.
    //
    if (bugInst.state === 'scared' || bugInst.state === 'recovering') {
      bugInst.state = 'crawling'
      bugInst.stateTimer = bugInst.crawlDuration ?? 2
      bugInst.vx = bugInst.crawlSpeed ?? Math.sign(bugInst.vx || 1) * 30
    }
  }
  for (const bugInst of bugs) resetBug(bugInst)
  for (const bugInst of allBugsCombined) resetBug(bugInst)
  sound && Sound.playLetterPickupSoft(sound)
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, 4)
  LevelIndicator.flashLetterBurst(levelIndicator, 4)
  //
  // H is always paired with C — light up both simultaneously
  //
  LevelIndicator.setSectionLabelLetterProgress(levelIndicator, 5)
  LevelIndicator.flashLetterBurst(levelIndicator, 5)
  levelHelpInst && (levelHelpInst.goalText = TOUCH_GOAL_TEXT_C)
  LevelHelp.openStandalonePanel(k, TOUCH_DIALOG_C, {
    fillRgb: { r: 21, g: 37, b: 40 },
    textRgb: { r: TOUCH_LETTER_COLOR_R, g: TOUCH_LETTER_COLOR_G, b: TOUCH_LETTER_COLOR_B },
    borderRgb: { r: TOUCH_LETTER_COLOR_R, g: TOUCH_LETTER_COLOR_G, b: TOUCH_LETTER_COLOR_B },
    sceneBackdropHex: wallColorHex,
    textStyles: { hl: { color: k.rgb(255, 220, 0), override: true } },
    onClose: () => {
      state.dialogOpen = false
      state.gatherActive = true
      state.gatherTimer = 0
      state.gatherBugsArrived = false
      state.gatherWaitTimer = 0
      state.gatherSoundTimer = 0
      state.gatherSoundInterval = TOUCH_GATHER_SOUND_INTERVAL_MIN
      //
      // Monsters keep open white eyes with pupils for the whole countdown
      //
      openBugEyes(state.monsterBugs, [])
      state.gatherHeroIsIdle = false
      state.gatherHeroIdleTimer = 0
      //
      // Fireflies orbit hero (follow mode), bugs walk toward hero
      //
      fireflies._mode = 'follow'
      sound && Sound.playBugScareSound(sound)
      k.wait(0.4, () => { sound && Sound.playBugScareSound(sound) })
      k.wait(0.9, () => { sound && Sound.playBugScareSound(sound) })
    }
  })
}
//
// Updates the post-C "gather" phase: bugs and monsters walk to hero, then 15-second countdown, then transition.
//
function onUpdateGatherPhase(k, state, bugs, allBugsCombined, touchMusic, sound) {
  const dt = k.dt()
  state.gatherTimer += dt
  //
  // Play random bug cheer sounds to simulate excited gathering behaviour
  //
  state.gatherSoundTimer += dt
  if (state.gatherSoundTimer >= state.gatherSoundInterval) {
    state.gatherSoundTimer = 0
    state.gatherSoundInterval = TOUCH_GATHER_SOUND_INTERVAL_MIN + Math.random() * (TOUCH_GATHER_SOUND_INTERVAL_MAX - TOUCH_GATHER_SOUND_INTERVAL_MIN)
    sound && Sound.playBugCheerSound(sound)
  }
  const heroX = state.heroInst?.character?.pos?.x ?? null
  const heroVelX = state.heroInst?.character?.vel?.x ?? 0
  if (heroX !== null) {
    //
    // Direct small bugs toward hero so they walk close and oscillate around him
    //
    for (const bugInst of allBugsCombined) {
      if (bugInst.state === 'pyramid' || bugInst.state === 'scared') continue
      const dist = bugInst.x - heroX
      if (Math.abs(dist) > TOUCH_BUG_GATHER_NEAR_DIST) {
        const crawl = Math.abs(bugInst.crawlSpeed ?? bugInst.vx ?? 30)
        bugInst.vx = dist > 0 ? -crawl : crawl
        bugInst.movementAngle = dist > 0 ? Math.PI : 0
      }
    }
    //
    // Direct monster bugs (tall long-legged ones) toward hero at higher speed
    //
    for (const monsterInst of state.monsterBugs) {
      const dist = monsterInst.x - heroX
      if (Math.abs(dist) > TOUCH_MONSTER_GATHER_NEAR_DIST) {
        monsterInst.vx = dist > 0 ? -TOUCH_MONSTER_GATHER_SPEED : TOUCH_MONSTER_GATHER_SPEED
        monsterInst.movementAngle = dist > 0 ? Math.PI : 0
        //
        // Expand bounds so monster can reach the hero anywhere on the level
        //
        if (monsterInst.bounds) {
          monsterInst.bounds.minX = 40
          monsterInst.bounds.maxX = CFG.visual.screen.width - 40
        }
      }
    }
    //
    // Detect hero idle: vel.x near zero for a sustained period → small bugs
    // close eyes. Long-legged monsters keep white eyes + pupils through the
    // countdown so they stay readable while gathered around the hero.
    //
    const heroIsMoving = Math.abs(heroVelX) > TOUCH_GATHER_HERO_IDLE_VEL_THRESHOLD
    if (heroIsMoving) {
      state.gatherHeroIdleTimer = 0
      if (state.gatherHeroIsIdle) {
        state.gatherHeroIsIdle = false
        openBugEyes([], allBugsCombined)
      }
    } else {
      state.gatherHeroIdleTimer += dt
      if (!state.gatherHeroIsIdle && state.gatherHeroIdleTimer >= 0.6) {
        state.gatherHeroIsIdle = true
        closeBugEyes([], allBugsCombined)
      }
    }
    //
    // Check if all small bugs have arrived near hero
    //
    if (!state.gatherBugsArrived) {
      const allNear = allBugsCombined.every(b => Math.abs(b.x - heroX) <= TOUCH_BUG_GATHER_NEAR_DIST)
      if (allNear) {
        state.gatherBugsArrived = true
        state.gatherWaitTimer = 0
      }
    }
  }
  //
  // Count down 15 s from gather start; bugs may still walk in during the wait.
  // Fallback max wait keeps the level from sticking if something blocks skip.
  //
  const forceTransition = state.gatherTimer >= TOUCH_GATHER_MAX_WAIT
  const waitDone = state.gatherTimer >= TOUCH_GATHER_POST_ARRIVE_DELAY
  if ((waitDone || forceTransition || state.enterSkip) && !state.levelDone) {
    state.levelDone = true
    openBugEyes(state.monsterBugs, allBugsCombined)
    Sound.stopAmbient(sound)
    touchMusic?.stop()
    //
    // Reset life score accumulated during this level so deaths here
    // do not carry over to the next level.
    //
    set('lifeScore', state._initialLifeScore ?? 0)
    createLevelTransition(k, 'lesson-touch.0')
  }
}
//
// Sets closedEyes flag on all bugs — called when hero is idle during gather phase
//
function closeBugEyes(monsterBugs, allBugsCombined) {
  for (const b of monsterBugs) b.closedEyes = true
  for (const b of allBugsCombined) b.closedEyes = true
}
//
// Clears closedEyes flag on all bugs — called when hero starts moving again
//
function openBugEyes(monsterBugs, allBugsCombined) {
  for (const b of monsterBugs) b.closedEyes = false
  for (const b of allBugsCombined) b.closedEyes = false
}
//
// Creates an invisible Kaplay platform for fireflies to form.
//
function createFireflyPlatform(k, x, y) {
  return k.add([
    k.rect(TOUCH_FIREFLY_PLATFORM_W, TOUCH_FIREFLY_PLATFORM_H),
    k.pos(x, y),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
}
//
// Creates a semi-transparent visible platform for hidden letter spots.
//
function createHiddenPlatform(k, x, y) {
  return k.add([
    k.rect(TOUCH_HIDDEN_PLATFORM_W, TOUCH_HIDDEN_PLATFORM_H),
    k.pos(x, y),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.color(k.rgb(TOUCH_LETTER_COLOR_R, TOUCH_LETTER_COLOR_G, TOUCH_LETTER_COLOR_B)),
    k.opacity(0.35),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
}
//
// Log-style visible platform for the U letter — same visual as bonus-hero log.
//
function createFloorMask(k, tX, tY) {
  //
  // Solid rect drawn above the T letter (z=28 > letter z=27) to clip
  // the portion that sticks below the floor line.
  //
  const maskW = TOUCH_LETTER_SIZE * 1.4
  return k.add([
    k.pos(tX - maskW / 2, FLOOR_Y),
    k.z(28),
    {
      draw() {
        k.drawRect({
          pos: k.vec2(0, 0),
          width: maskW,
          height: tY - FLOOR_Y + 4,
          color: k.rgb(WALL_COLOR_R, WALL_COLOR_G, WALL_COLOR_B)
        })
      }
    }
  ])
}
//
// Updates the X/Y firefly counter text and outlines near the hero's head.
// Creates them on first call; repositions and updates text every frame.
//
function updateFireflyCounter(k, state, collected, total, heroX, heroY) {
  if (!state.fireflyCounter) {
    state.fireflyCounter = HeroCounter.create({
      k,
      size: TOUCH_FIREFLY_COUNTER_FONT,
      color: { r: L0_FIREFLY_COLOR_R, g: L0_FIREFLY_COLOR_G, b: L0_FIREFLY_COLOR_B }
    })
  }
  HeroCounter.update(state.fireflyCounter, `${collected}/${total}`, heroX, heroY)
}
//
// Destroys the firefly platform and resets all related state.
// After this call, fireflies follow the hero.
//
function destroyFireflyPlatform(state, fireflies) {
  state.fireflyPlatformObj?.destroy()
  state.fireflyPlatformObj = null
  state.fireflyPlatformSide = null
  state.fireflyPlatformLockedX = null
  state.fireflyPlatformLockedY = null
  state.fireflyPlatformTimer = 0
  state.fireflyPlatformVisible = false
  fireflies._allAtPlatform = false
  fireflies._mode = 'follow'
}
//
// Hides the firefly counter without destroying it (used during hero death).
// The counter stays hidden until the level restarts.
//
function hideFireflyCounter(state) {
  HeroCounter.hide(state.fireflyCounter)
}
//
// Destroys the firefly counter text objects and clears state refs.
//
function destroyFireflyCounter(state) {
  HeroCounter.destroy(state.fireflyCounter)
  state.fireflyCounter = null
}
//
// Slowly oscillates bug4 (the anti-hero's platform bug) and its invisible
// collision platform back and forth within the play area.
// Uses Kaplay's k.onUpdate instead of a physics body because the platform
// is a static body that can only be repositioned manually.
//
function activateBug4Movement(k, bug4Inst, platform, antiHeroInst, bugRadius) {
  const minX = LEFT_MARGIN + bugRadius + 10
  const maxX = CFG.visual.screen.width - RIGHT_MARGIN - bugRadius - 10
  //
  // Platform walker: always crawl left/right between play-area walls
  //
  bug4Inst.isPlatformWalker = true
  bug4Inst.isMother = false
  bug4Inst.crawlSpeed = TRAP2_BUG_SPEED
  bug4Inst.state = 'crawling'
  bug4Inst.movementAngle = 0
  bug4Inst.vx = TRAP2_BUG_SPEED
  bug4Inst.vy = 0
  bug4Inst.bounds = { minX, maxX, minY: bug4Inst.y, maxY: bug4Inst.y }
}
//
// Spawns firefly particles visually identical to the collectible fireflies drawn by
// drawL0Fireflies: tiny golden-yellow pulsing dots with a soft dim halo.
// Core radius 2.8–4.5 px, single color rgb(244, 192, 64), halo at radius*3 opacity*0.15.
//
function spawnFireflyDeathBurst(k, x, y) {
  //
  // Visual constants mirrored from drawL0Fireflies and L0_FIREFLY_* scene constants
  //
  const FIREFLY_RADIUS_MIN = 2.8
  const FIREFLY_RADIUS_MAX = 4.5
  const FIREFLY_GLOW_SPEED_MIN = 0.6
  const FIREFLY_GLOW_SPEED_MAX = 2.0
  //
  // Single golden-yellow color matching L0_FIREFLY_COLOR_R/G/B
  //
  const fireflyColor = k.rgb(L0_FIREFLY_COLOR_R, L0_FIREFLY_COLOR_G, L0_FIREFLY_COLOR_B)
  const particles = []
  for (let i = 0; i < DEATH_FIREFLY_COUNT; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = DEATH_FIREFLY_BURST_SPEED_MIN + Math.random() * (DEATH_FIREFLY_BURST_SPEED_MAX - DEATH_FIREFLY_BURST_SPEED_MIN)
    particles.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      radius: FIREFLY_RADIUS_MIN + Math.random() * (FIREFLY_RADIUS_MAX - FIREFLY_RADIUS_MIN),
      glowSpeed: FIREFLY_GLOW_SPEED_MIN + Math.random() * (FIREFLY_GLOW_SPEED_MAX - FIREFLY_GLOW_SPEED_MIN),
      glowPhase: Math.random() * Math.PI * 2,
      life: DEATH_FIREFLY_LIFETIME * (0.6 + Math.random() * 0.8)
    })
  }
  //
  // Reuse one vec2 instance to avoid per-circle allocation inside the draw loop
  //
  const corePos = k.vec2(0, 0)
  const drawer = k.add([
    k.z(CFG.visual.zIndex.ui + 50),
    {
      draw() {
        const time = k.time()
        for (const p of particles) {
          if (p.life <= 0) continue
          const fade = Math.min(1, p.life / 1.5)
          //
          // Pulsing alpha — identical to drawL0Fireflies: alpha = 0.15 + glow * 0.7
          //
          const glow = (Math.sin(time * p.glowSpeed + p.glowPhase) + 1) / 2
          const alpha = (0.15 + glow * 0.7) * fade
          corePos.x = p.x
          corePos.y = p.y
          //
          // Dim outer halo (radius * 3, opacity * 0.15) — same as drawL0Fireflies
          //
          k.drawCircle({
            pos: corePos,
            radius: p.radius * 3,
            color: fireflyColor,
            opacity: alpha * 0.15
          })
          //
          // Bright core — same as drawL0Fireflies
          //
          k.drawCircle({
            pos: corePos,
            radius: p.radius,
            color: fireflyColor,
            opacity: alpha
          })
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
      p.x += p.vx * dt
      p.y += p.vy * dt
      p.vx *= DEATH_FIREFLY_DRAG
      p.vy *= DEATH_FIREFLY_DRAG
      p.life -= dt
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
function startL0DeathCountdown(k, sceneName, deathX, deathY) {
  let elapsed = 0
  const cx = CFG.visual.screen.width / 2
  const textCfg = { size: L0_DEATH_PROMPT_FONT, font: CFG.visual.fonts.regularFull }
  const initText = L0_DEATH_PROMPT_BASE + DEATH_COUNTDOWN_SECONDS_L0
  //
  // Drop shadow (single black copy offset right+down), glow-level style.
  //
  const offs = [[1.5, 1.5]]
  const outlines = offs.map(([dx, dy]) => k.add([
    k.text(initText, textCfg),
    k.pos(cx + dx, L0_DEATH_PROMPT_Y + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(0.85),
    k.z(CFG.visual.zIndex.ui + 60)
  ]))
  const promptText = k.add([
    k.text(initText, textCfg),
    k.pos(cx, L0_DEATH_PROMPT_Y),
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
    const remaining = Math.max(0, DEATH_COUNTDOWN_SECONDS_L0 - elapsed)
    const newText = L0_DEATH_PROMPT_BASE + Math.ceil(remaining)
    if (promptText.exists()) promptText.text = newText
    outlines.forEach(o => o?.exists?.() && (o.text = newText))
    if (elapsed >= DEATH_COUNTDOWN_SECONDS_L0) doRestart()
  })
}
