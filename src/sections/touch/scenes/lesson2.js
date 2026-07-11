import { CFG } from '../cfg.js'
import { CFG as GLOBAL_CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { toCanvas, getRGB } from '../../../utils/helper.js'
import { drawFirTree } from '../components/fir-tree.js'
import * as Dust from '../components/dust.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import * as LevelIndicator from '../components/lesson-indicator.js'
import * as LevelHelp from '../../../utils/lesson-help.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { createLevelTransition } from '../../../utils/transition.js'
import { goToMenuAfterAssets, goAfterPreparingAssets } from '../../../utils/lesson-assets.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'
import { arcY } from '../utils/trees.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as LifeDeduction from '../utils/life-deduction.js'
import * as BonusHero from '../components/bonus-hero.js'
import * as TouchLevel2Ambience from '../utils/touch-level2-ambience.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
//
// Platform dimensions (minimal margins for large play area)
//
const TOP_MARGIN = CFG.visual.gameArea.topMargin
const PLAY_AREA_BOTTOM_TRIM = 100
const BOTTOM_MARGIN = CFG.visual.gameArea.bottomMargin + PLAY_AREA_BOTTOM_TRIM
const LEFT_MARGIN = CFG.visual.gameArea.leftMargin
const RIGHT_MARGIN = CFG.visual.gameArea.rightMargin
//
// Scene fill — deep teal, the dominant cool half of the touch section's
// teal+orange complementary palette. Matches L0 / L1 so the whole touch
// run shares one cool atmospheric base. Cold-blue snow/ice elements
// already live on the cool side, while warm log bark + hero accents
// drive the orange complement.
//
const L2_SCENE_BG_R = 28
const L2_SCENE_BG_G = 50
const L2_SCENE_BG_B = 58
//
// Rounded corner configuration for game area
//
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'touch2-corner-sprite'
//
// Wall / canvas / corner tint locked to the playfield teal so the L2
// frame reads as a single flush surface — kills the previous darker
// letterbox bars that floated at the top + bottom of the play area.
//
const WALL_COLOR_HEX = '#1C323A'
const WALL_COLOR_R = 28
const WALL_COLOR_G = 50
const WALL_COLOR_B = 58
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
// Single killer icicle placed just to the left of the frozen lake.
// Uses the same icicle kill-check path as the right-side icicles.
//
const LEFT_LAKE_KILLER_ICICLE_X_OFFSET = 10
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
  LEFT_MARGIN + 560,
  ICICLE_SAFE_ZONE_X + 198
]
const DECOR_LOG_Z = 5
const CROW_TREE_EXCLUDE_RADIUS = 80
const DECOR_LOG_WIDTH = 120
const L2_CROW_TOOLTIP_TEXT = 'will you ever calm down?'
const L2_CROW_TOOLTIP_HOVER_W = 52
const L2_CROW_TOOLTIP_HOVER_H = 48
const L2_CROW_TOOLTIP_OFFSET_Y = -52
//
// Crow hover zone is raised above perchY: drawCrow raises the body ~30px
// (BODY_RAISE * scale) above the foot level, so the hover box must be
// centered on the body, not the feet.
//
const L2_CROW_TOOLTIP_HOVER_Y_OFFSET = -34
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
const ICICLE_TOOLTIP_TEXT = "I'm an icicle.\nCome closer and lick me"
const ICICLE_TOOLTIP_Y_OFFSET = -30
const TOUCH_INDICATOR_TOOLTIP_TEXT = "here you see how far you have\ncome in learning touch"
const TOUCH_INDICATOR_TOOLTIP_WIDTH = 250
const TOUCH_INDICATOR_TOOLTIP_HEIGHT = 50
const TOUCH_INDICATOR_TOOLTIP_Y_OFFSET = -30
const FPS_COUNTER_TOP_Y = 55
const SMALL_HERO_TOOLTIP_TEXT = "your fragments"
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
const MOON_HOVER_GLOW_EXTRA = 28
const MOON_HOVER_GLOW_SPEED = 1.4
const MOON_AMBIENT_PULSE_SPEED = 0.65
//
// First platform tooltip (topmost always-visible log)
//
const FIRST_PLATFORM_TOOLTIP_TEXT = "there are other\nplatforms below..."
//
// Snowman hover tooltip
//
const SNOWMAN_TOOLTIP_TEXT = "want some cold?"
const SNOWMAN_TOOLTIP_HOVER_SIZE = 90
const SNOWMAN_TOOLTIP_Y_OFFSET = -110
//
// Center icicle zone: fills the safe corridor when trap is active
//
const CENTER_ICICLE_START_X_OFFSET = 520
const CENTER_ICICLE_END_MARGIN = 30
const CENTER_ICICLE_SNOWMAN_CLEARANCE = 80
//
// Gap in the center icicle row so the hero can cross to the other side.
// Positioned at the actual middle of the populated icicle section (after log-pile clearance).
//
const CENTER_ICICLE_GAP_CENTER_X = 1040
const CENTER_ICICLE_GAP_HALF_WIDTH = 80
const FIRST_PLATFORM_TOOLTIP_Y_OFFSET = 40
//
// Stuck-hero hints shown above the hero when the player hasn't finished the level
//
const STUCK_HINT_1_DELAY = 30
const STUCK_HINT_1_TEXT = "Use platform edges"
const STUCK_HINT_2_TEXT = "Think where you jump —\nlife often fools you"
const STUCK_HINT_REPEAT_INTERVAL = 30
const STUCK_HINT_DISPLAY_TIME = 6
const STUCK_HINT_Y_OFFSET = -110
//
// Cold idle: gentle screen shake and hint when the hero stands still too long
//
const COLD_IDLE_STILL_TIME = 10
const COLD_IDLE_MOVE_THRESHOLD = 4
const COLD_HINT_TEXT = "It's so cold..."
const COLD_HINT_Y_OFFSET = -100
const COLD_SHAKE_WAVE_SPEED = 2.2
const COLD_SHAKE_MAX = 0.38
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
// Same window as hero land-FX debounce — blocks a second ring from a
// one-frame grounded flicker after hitbox resize
//
const LAND_RING_COOLDOWN = 0.2
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
const LIFE_DEDUCT_THRESHOLD = 5
const LIFE_DEDUCT_FLAG = 'touch.lesson2TrapCount'
const LIFE_DEDUCT_VISITED_FLAG = 'touch.lesson2Visited'
const LIFE_DEDUCT_ICICLES_FLAG = 'touch.lesson2IciclesActive'
const LIFE_DEDUCT_TRAP_FLAG = 'touch.lesson2TrapActive'
const LIFE_DEDUCT_MAX_COUNT = 2
//
// Music volume multiplier for L2 — background music should sit quieter so
// ambient wildlife and sound effects feel more prominent.
//
const L2_MUSIC_VOLUME_MULT = 0.6
//
// Trap platform: the 2nd log (index 1) slides left while the hero stands on the 3rd (index 2)
//
const TRAP_PLATFORM_INDEX = 1
const TRAP_TRIGGER_PLATFORM_INDEX = 2
const TRAP_PLATFORM_SLIDE_SPEED = 1200
const TRAP_PLATFORM_RETURN_SPEED = 600
const TRAP_PLATFORM_SLIDE_DISTANCE = 400
const TRAP_PLATFORM_PAUSE_DURATION = 0.3
const TRAP_CORRIDOR_DURATION = 6
const TRAP_PLATFORM_TOP_TOLERANCE = 30
//
// Screen shake on hero death and extra wall height to prevent
// dark canvas strips from showing during shake
//
const DEATH_SHAKE_STRENGTH = 6
const SHAKE_BUFFER = 80
//
// Breath vapor: small white puffs from hero's mouth in cold air
//
const BREATH_INTERVAL = 2.0
const BREATH_PARTICLE_COUNT = 5
const BREATH_PARTICLE_SPEED = 15
const BREATH_PARTICLE_LIFETIME = 0.8
const BREATH_PARTICLE_SIZE_MIN = 2
const BREATH_PARTICLE_SIZE_MAX = 5
const BREATH_OFFSET_X = 12
const BREATH_OFFSET_Y = -20
//
// Tree creak sound interval
//
const TREE_CREAK_INTERVAL_MIN = 2
const TREE_CREAK_INTERVAL_MAX = 5
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
//
// Moon disc tinted warm amber — this is the dominant orange accent on
// the cool teal sky and the strongest single complementary-palette
// landmark in L2. The same RGB triplet also feeds the radial glow and
// crater shading so the warm light spreads consistently outward.
//
const MOON_COLOR_R = 232
const MOON_COLOR_G = 200
const MOON_COLOR_B = 145
const MOON_GLOW_RADIUS = 22
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
//
// TOUCH letter quest: T on the left logs, O after freeing the spruces,
// U after melting the lake, C after rubbing the snowman, H on the platform.
// Collected letter count persists so a death mid-quest keeps progress.
//
const QUEST_LETTERS_FLAG = 'touch.lesson2Letters'
//
// Set right before a death reload so the quest progress survives the death,
// but a fresh entry into the level (menu, previous level) starts from zero
//
const QUEST_RESUME_FLAG = 'touch.lesson2Resume'
const QUEST_LETTER_SIZE = 68
const QUEST_LETTER_COLLECT_RADIUS = 58
const QUEST_LETTER_COLOR_R = 90
const QUEST_LETTER_COLOR_G = 136
const QUEST_LETTER_COLOR_B = 152
const QUEST_LETTER_OUTLINE = 2
const QUEST_LETTER_TILTS = [-8, 12, 6, -5, 7]
//
// Pickup letter draw order: O/C/H sit behind snow drifts; T/U stay in front
//
const QUEST_LETTER_Z_BEHIND_SNOW = 10
const QUEST_LETTER_Z_FRONT = 27
const QUEST_LETTER_BEHIND_SNOW = new Set(['O', 'C', 'H'])
//
// Letter pickup pulse (same look as touch L0 letters)
//
const QUEST_LETTER_PULSE_SPEED = 1.8
const QUEST_LETTER_PULSE_MIN = 0.35
//
// T rests ON the top log of the left pile (glyph bottom sinks into the
// top log barrel so the letter reads as lying on the logs, not above them)
//
const QUEST_LETTER_T_Y = FLOOR_Y - 72
//
// Ground letters (C) sink a few pixels below the floor line so they
// read as lying in the snow instead of hovering above it
//
const QUEST_LETTER_SNOW_SINK = 10
//
// O sits deeper in the snow drift than the other ground letters
//
const QUEST_LETTER_O_SINK = 22
//
// U sits directly in the water surface and rises from below when it spawns
//
const QUEST_LETTER_U_SINK = 14
const QUEST_LETTER_RISE_DURATION = 1.1
//
// Quest dialog panel colors (same style as touch L0 letter dialogs)
//
const QUEST_DIALOG_FILL_R = 21
const QUEST_DIALOG_FILL_G = 37
const QUEST_DIALOG_FILL_B = 40
const QUEST_DIALOG_HL_R = 255
const QUEST_DIALOG_HL_G = 220
const QUEST_DIALOG_HL_B = 0
//
// Quest dialogs shown after each letter pickup
//
const QUEST_DIALOG_T = "[hl]T[/hl]ouch can remove even the\nlightest burdens. Touch all\nthe spruces to set them free."
const QUEST_DIALOG_O = "However hard the ice may be,\nit melts [hl]O[/hl]vertime. Break the\nice and so will you."
const QUEST_DIALOG_U = "[hl]U[/hl]nfreeze the frozen, reveal\nthe hidden. And who else\nis frozen here?"
const QUEST_DIALOG_C = "[hl]C[/hl]limb higher to see farther."
const QUEST_DIALOG_H = "Every touch brings the world\ncloser to [hl]H[/hl]armony."
//
// Spruce freeing: hero lands near a white fir — it shakes, sheds
// snowflakes and fades to green
//
const FIR_TOUCH_RADIUS = 60
const FIR_SHAKE_DURATION = 0.6
const FIR_SHAKE_AMPLITUDE = 4
const FIR_WHITE_FADE_SPEED = 2
const FIR_WHITE_COLOR = [230, 240, 248]
const FIR_TRUNK_WHITE_BLEND = 0.75
const FIR_BURST_SNOWFLAKE_COUNT = 26
//
// How close the hero's feet must be to the floor line for ground-level
// quest interactions (firs, ice, snowman)
//
const QUEST_FLOOR_TOLERANCE = 20
//
// Ice cracking: distance the hero must run on the lake per crack step.
// A landing on the lake also counts as one crack step. When the hero
// pauses, the cracks slowly refreeze (progress decays back to zero).
//
const ICE_CRACK_DISTANCE_STEP = 60
const ICE_CRACK_TOTAL_STEPS = 22
const ICE_CRACK_MOVE_EPSILON = 0.5
const ICE_CRACK_DECAY_DELAY = 0.6
const ICE_CRACK_DECAY_PER_SEC = 0.12
//
// Melted lake: refreezes back to ice when the hero stops running on the
// water; running on the water plays splashy step sounds
//
const LAKE_REFREEZE_DELAY = 5
const WATER_STEP_DISTANCE = 32
const WATER_STEP_VOLUME = 0.32
const WATER_LAND_VOLUME = 0.5
//
// Snowman rub sound (friction noise burst)
//
const RUB_SOUND_DURATION = 0.22
const RUB_SOUND_PEAK = 0.35
const RUB_SOUND_FREQ_START = 950
const RUB_SOUND_FREQ_END = 480
const RUB_COUNTER_Z = 30
//
// Delay between the snowman collapsing and the C letter appearing
//
const SNOWMAN_C_APPEAR_DELAY = 0.8
//
// C tips out of the snowman mid-body toward the left and settles in the snow
//
const QUEST_LETTER_C_OFFSET_X = -36
const QUEST_LETTER_C_TILT = -22
const QUEST_LETTER_C_START_Y = FLOOR_Y - 66
const QUEST_LETTER_C_FALL_DURATION = 0.55
//
// Snowman rubbing: pass-by zone, counters and reset gap
//
const RUB_ZONE_HALF_WIDTH = 46
const RUB_EXIT_HALF_WIDTH = 90
const RUB_TARGET_COUNT = 10
const RUB_HINT_THRESHOLD = 3
const RUB_RESET_GAP = 3
const RUB_HINT_TEXT = "Mmm, it's getting hot..."
const RUB_HINT_DISPLAY_TIME = 3
const RUB_HINT_Y_OFFSET = -150
const RUB_COUNTER_Y_OFFSET = -160
const RUB_COUNTER_FONT_SIZE = 36
//
// Quest snowflake bursts (fir shake + hero death): particles scatter,
// then fall down like the ambient snow and fade out
//
const SNOWFLAKE_BURST_SPEED_MIN = 50
const SNOWFLAKE_BURST_SPEED_RANGE = 130
const SNOWFLAKE_BURST_DAMPING = 2.4
const SNOWFLAKE_FALL_SPEED = 42
const SNOWFLAKE_DRIFT_SPEED = 14
const SNOWFLAKE_LIFETIME_MIN = 1.6
const SNOWFLAKE_LIFETIME_RANGE = 1.4
const SNOWFLAKE_SIZE_MIN = 1.4
const SNOWFLAKE_SIZE_RANGE = 2
const DEATH_SNOWFLAKE_COUNT = 44
//
// Pause between closing the final H dialog and the level transition
//
const QUEST_COMPLETE_TRANSITION_DELAY = 2
//
// Death restart countdown (same prompt style as touch lesson 1)
//
const DEATH_COUNTDOWN_SECONDS = 7
const DEATH_PROMPT_BASE = 'Press Space or Enter to continue... '
const DEATH_PROMPT_Y = TOP_MARGIN + 62
const DEATH_PROMPT_FONT = 22
/**
 * Level 2 scene for touch section - Simple level without obstacles
 * @param {Object} k - Kaplay instance
 */
export function sceneLesson2(k) {
  k.scene("lesson-touch.2", () => {
    //
    // Save progress
    //
    set('lastLesson', 'lesson-touch.2')
    //
    // Set gravity
    //
    k.setGravity(CFG.game.gravity)
    //
    // Create sound instance
    //
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    let stopTouchL2Wildlife = () => {}
    //
    // Start touch.mp3 background music with same volume as level 0
    // Use global CFG to ensure same volume as level 0
    //
    const touchMusic = k.play('touch', {
      loop: true,
      volume: GLOBAL_CFG.audio.backgroundMusic.touch * L2_MUSIC_VOLUME_MULT
    })
    k.wait(0.1, () => {
      touchMusic.volume = GLOBAL_CFG.audio.backgroundMusic.touch * L2_MUSIC_VOLUME_MULT
    })
    //
    // Stop music when leaving the scene
    //
    k.onSceneLeave(() => {
      touchMusic.stop()
      stopTouchL2Wildlife()
      k.canvas?.style.removeProperty('background-color')
    })
    //
    // Set background + CSS canvas backing (matches gameplay grey; letterboxing stays even).
    //
    //
    // Sync canvas + CSS backdrop so letterbox bars match the scene background.
    //
    CanvasBackdrop.applyCanvasBackdrop(k, WALL_COLOR_HEX)
    k.onSceneLeave(() => CanvasBackdrop.clearCanvasBackdrop(k))
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
    // Create foreground trees; pass lake right edge so trees don't grow on the lake.
    // Returns the touchable fir list used by the spruce-freeing quest phase.
    //
    const { maxX: lakeMaxX } = TouchLevel2Ambience.getLakeBounds(FLOOR_Y, LEFT_MARGIN)
    const questFirs = createForegroundTrees(k, DECOR_LOG_PILE_POSITIONS[1], lakeMaxX)
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
    // Top wall extends SHAKE_BUFFER above y=0 so camera shake cannot
    // reveal the canvas background through the top edge
    //
    k.add([
      k.rect(CFG.visual.screen.width, TOP_MARGIN + SHAKE_BUFFER),
      k.pos(0, -SHAKE_BUFFER),
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
    // Default silver hero. After completing touch he adopts the touch
    // identity colour (steel teal — the cool complement of silver).
    //
    const heroBodyColor = isWordComplete ? "#E74C3C" : isTimeComplete ? "#FF8C00" : isTouchComplete ? "#5A8898" : "#C0C0C0"
    //
    // Restore quest progress only when reloading after a death (resume flag
    // set by onHeroDeath). A fresh entry resets the quest so all TOUCH
    // letters start gray and the hunt begins from T again.
    //
    const questResumed = get(QUEST_RESUME_FLAG, false)
    set(QUEST_RESUME_FLAG, false)
    const questLettersCollected = questResumed ? get(QUEST_LETTERS_FLAG, 0) : 0
    set(QUEST_LETTERS_FLAG, questLettersCollected)
    //
    // Shared with LevelHelp Goal button: text of the last quest dialog shown
    //
    const questGoalState = { lastDialog: null }
    //
    // Restore the last dialog text from already-collected letters on death resume
    //
    const questDialogByCount = [null, QUEST_DIALOG_T, QUEST_DIALOG_O, QUEST_DIALOG_U, QUEST_DIALOG_C, QUEST_DIALOG_H]
    if (questLettersCollected > 0) {
      questGoalState.lastDialog = stripQuestHlTags(questDialogByCount[questLettersCollected])
    }
    //
    // Create level indicator (TOUCH letters). All letters start gray and
    // light up one by one as the hero finds them in the level.
    //
    const levelIndicator = LevelIndicator.create({
      k,
      levelNumber: 2,
      //
      // TOUCH letters tint matches the section's steel-teal identity so
      // the HUD agrees with the touch-completed hero progression colour.
      //
      activeColor: '#5A8898',
      inactiveColor: '#B0B0B0',
      completedColor: '#5A8898',
      heroBodyColor,
      topPlatformHeight: TOP_MARGIN,
      sideWallWidth: LEFT_MARGIN,
      sectionLabelCompletedLetters: questLettersCollected
    })
    LevelHelp.create({
      k,
      levelName: 'lesson-touch.2',
      sideWallWidth: LEFT_MARGIN,
      floorY: FLOOR_Y,
      levelIndicator,
      sound,
      sceneBackdropHex: '#1C323A',
      //
      // Goal shows the most recent quest dialog (last letter collected);
      // falls back to the static level goal until the first letter is taken
      //
      getGoalText: () => questGoalState.lastDialog || LevelHelp.LESSON_GOAL_TEXTS['lesson-touch.2']
    })
    TouchControls.create({
      k,
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN
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
    // Active states: icicles after 1st deduction, sliding trap after 2nd
    //
    let iciclesActive = iciclesAlreadyActive
    let trapPlatformActive = trapAlreadyActive
    if (showTrap) {
      const nextCount = trapCount + 1
      nextCount >= 1 && (iciclesActive = true)
      nextCount >= 2 && (trapPlatformActive = true)
    }
    const displayTrapCount = showTrap ? trapCount + 1 : trapCount
    levelIndicator.updateTrapCount(displayTrapCount)
    //
    // Scene-level lock: hero controls disabled during life deduction animation
    //
    const sceneLock = { locked: showTrap }
    //
    // Bottom platform extends SHAKE_BUFFER below screen height
    //
    k.add([
      k.rect(CFG.visual.screen.width, BOTTOM_MARGIN + SHAKE_BUFFER),
      k.pos(0, CFG.visual.screen.height - BOTTOM_MARGIN),
      k.area(),
      k.body({ isStatic: true }),
      k.color(WALL_COLOR_R, WALL_COLOR_G, WALL_COLOR_B),
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
      antiHero: null,
      dustColor: snowColor,
      //
      // Cold breath puffs occupy the mouth in this winter scene, so the
      // default idle hum + music notes are disabled to avoid layering.
      //
      idleVocalization: null,
      currentLevel: 'lesson-touch.2',
      jumpForce: CFG.game.jumpForce,
      addMouth: isWordComplete,
      addArms: isTouchComplete,
      bodyColor: heroBodyColor
    })
    //
    // Raise hero z above lake/decor layer (L2_DECOR_ABOVE_PLATFORMS_Z = 17) so hero renders on top.
    //
    heroInst.character.z = 20
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
      nextCount >= 1 && extraFlags.push(LIFE_DEDUCT_ICICLES_FLAG)
      nextCount >= 2 && extraFlags.push(LIFE_DEDUCT_TRAP_FLAG)
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        deductFlagValue: nextCount,
        extraFlags,
        sceneLock,
        sceneBgRgb: { r: L2_SCENE_BG_R, g: L2_SCENE_BG_G, b: L2_SCENE_BG_B },
        textColorRgb: { r: 90, g: 136, b: 152 },
        noDeduct: true,
        hideScore: true,
        introTextOverride: 'Life made corrections.',
        resultTextOverride: 'Learn this lesson.',
        onComplete: () => {
          if (!iciclesAlreadyActive) {
            //
            // First deduction: center corridor icicles appear after animation.
            // Hanging icicles are already in hangingIcicleData from line 675 — don't duplicate.
            //
            generateCenterIcicles(snowmanWorldX).forEach(ic => icicleData.push(ic))
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
    // Compute lake bounds before snow drifts so the lake area is kept snow-free.
    //
    const lakeBoundsForSnow = TouchLevel2Ambience.getLakeBounds(FLOOR_Y, LEFT_MARGIN)
    //
    // Create blue snow drifts on bottom platform floor
    //
    createSnowDrifts(k, lakeBoundsForSnow)
    //
    // Mutable quest states shared with the ambience module: ice cracking /
    // melting and snowman collapse. Restored from saved letter progress.
    //
    const lakeState = {
      crackProgress: 0,
      melted: false,
      meltFade: 0
    }
    const snowmanState = {
      collapsed: questLettersCollected >= 4,
      collapseTime: questLettersCollected >= 4 ? 10 : 0
    }
    const touchL2AmbienceInst = TouchLevel2Ambience.setupTouchLevel2Ambience({
      k,
      floorY: FLOOR_Y,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN,
      topMargin: TOP_MARGIN,
      heroInst,
      sound,
      logPileX: DECOR_LOG_PILE_POSITIONS[0],
      rightLogPileX: DECOR_LOG_PILE_POSITIONS[1],
      lakeState,
      snowmanState
    })
    stopTouchL2Wildlife = touchL2AmbienceInst.stopWildlife
    const snowmanWorldX = touchL2AmbienceInst.snowmanX
    //
    // Tooltip: hovering over the crow. Hover box is raised so it wraps the
    // crow's body (drawCrow raises the body above the perch level).
    //
    const crowInfo = touchL2AmbienceInst.crowInfo
    crowInfo && Tooltip.create({
      k,
      targets: [{
        x: crowInfo.cx,
        y: crowInfo.perchY + L2_CROW_TOOLTIP_HOVER_Y_OFFSET,
        width: L2_CROW_TOOLTIP_HOVER_W,
        height: L2_CROW_TOOLTIP_HOVER_H,
        text: L2_CROW_TOOLTIP_TEXT,
        offsetY: L2_CROW_TOOLTIP_OFFSET_Y
      }]
    })
    //
    // Track which surface the hero stands on so land/step sounds match the material.
    //
    const iceSlideState = { vel: 0 }
    k.onUpdate(() => {
      onUpdateSurfaceTracker(heroInst, sound, lakeBoundsForSnow, lakeState)
      onUpdateIceSlide(k, heroInst, lakeBoundsForSnow, iceSlideState, lakeState)
    })
    //
    // Hidden bonus hero on left wall, above the icicles.
    // Only reachable by jumping from an upper platform and flying left.
    //
    const BONUS_PLATFORM_X = LEFT_MARGIN + 50
    const BONUS_PLATFORM_Y = FLOOR_Y - 200
    //
    // Collision box covers the visible log: width spans body + endcaps,
    // and the box is nudged right + down so it lines up under the log
    // barrel instead of sitting left/above it.
    //
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
      storageKey: 'touch.lesson2BonusCollected',
      //
      // Collider shifted right by half its width so the walkable box
      // starts at the log center and extends right of it
      //
      collisionWidth: 82,
      platformCollisionXOffset: 41,
      platformCollisionYOffset: 9,
      revealWidth: 120
    })
    //
    // Right-side floor icicles always present from the start.
    // Left-side floor icicles appear only after the first life deduction.
    //
    //
    // Left icicles are always off — the frozen lake occupies the left zone.
    //
    const leftIcicles = [generateLeftLakeKillerIcicle()]
    const icicleData = [...generateRightIcicles(), ...leftIcicles]
    //
    // Center corridor icicles appear after first life deduction.
    // Generate immediately on scene load when the flag was already saved from a previous visit.
    //
    if (iciclesAlreadyActive) {
      generateCenterIcicles(snowmanWorldX).forEach(ic => icicleData.push(ic))
    }
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
      // Push snowflakes in hero's movement direction (like leaves in level 1).
      // Skip when hero is on the frozen lake — ice is smooth, no snow disturbance.
      //
      if (heroInst.character?.pos) {
        const heroX = heroInst.character.pos.x
        const heroY = heroInst.character.pos.y
        const heroVx = heroX - lastHeroX
        lastHeroX = heroX
        const heroOnLake = Math.abs(heroY - FLOOR_Y) < SURFACE_FLOOR_THRESHOLD
          && heroX >= lakeBoundsForSnow.minX && heroX <= lakeBoundsForSnow.maxX
        if (!heroOnLake && Math.abs(heroVx) > 0.5) {
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
        checkIcicleCollision(k, heroInst, icicleData, levelIndicator, quest)
        checkHangingIcicleCollision(k, heroInst, hangingIcicleData, levelIndicator, platformStates, quest)
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
      // Platforms appear ONLY on landing, not when touching from below.
      // The jump-reveal system stays dormant until the hero collects the
      // C letter (final H phase) so no logs appear during earlier phases.
      //
      if (justLanded && quest.lettersCollected >= 4) {
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
      // Trap platform: while the hero stands on the 3rd log, the 2nd log slides
      // left, pauses, returns, then waits before it can flee again.
      //
      updateTrapPlatformSlide(k, platformStates, heroX, heroY, dt)
      //
      // Update platform visibility timers and opacity
      //
      platformStates.forEach((state, index) => {
        //
        // First platform (where the H letter appears) stays hidden until
        // the H letter itself spawns, then becomes permanently visible
        //
        if (index === 0) {
          if (!quest.hSpawned) {
            state.opacity = 0
            return
          }
          state.opacity = 1.0
          state.visibilityTimer = VISIBILITY_DURATION
          state.jumpCount = MAX_JUMPS
          //
          // Always enable collision for first platform once visible
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
    // Create FPS counter (no level timer in this quest level)
    //
    const fpsCounter = FpsCounter.create({
      k,
      showTimer: false
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
    // Tooltip: first platform (topmost always-visible log, where H appears).
    // Only visible once at least one lower platform has been revealed so the
    // hint is meaningful (the referenced invisible platforms are already found).
    //
    Tooltip.create({
      k,
      targets: [{
        x: firstPlatform.x,
        y: firstPlatform.y,
        width: firstPlatform.width,
        height: 30,
        text: FIRST_PLATFORM_TOOLTIP_TEXT,
        offsetY: FIRST_PLATFORM_TOOLTIP_Y_OFFSET,
        forceBelow: true,
        visible: () => platformStates.slice(1).some(ps => ps.opacity > 0.05)
      }]
    })
    //
    // Tooltip: snowman (hidden once it collapses into pieces)
    //
    Tooltip.create({
      k,
      targets: [{
        x: snowmanWorldX,
        y: FLOOR_Y - 60,
        width: SNOWMAN_TOOLTIP_HOVER_SIZE,
        height: 120,
        text: SNOWMAN_TOOLTIP_TEXT,
        offsetY: SNOWMAN_TOOLTIP_Y_OFFSET,
        visible: () => !snowmanState.collapsed
      }]
    })
    //
    // Landing ring system: expanding circle of particles on hero landing
    //
    const jumpRings = []
    let prevGroundedForRing = true
    let landRingCooldown = 0
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
      landRingCooldown = Math.max(0, landRingCooldown - k.dt())
      const grounded = heroInst.character?.isGrounded?.() ?? true
      if (!prevGroundedForRing && grounded && landRingCooldown <= 0 && heroInst.character?.pos) {
        landRingCooldown = LAND_RING_COOLDOWN
        spawnLandingRing(jumpRings, heroInst.character.pos.x, heroInst.character.pos.y + JUMP_RING_FOOT_OFFSET_Y)
      }
      onUpdateLandingRings(k, jumpRings)
      prevGroundedForRing = grounded
    })
    //
    // Stuck-hero hints: progressive platform hints, only relevant during the
    // final H phase (jumping across the invisible platforms)
    //
    const stuckHintState = {
      timer: 0,
      phase: 0,
      repeatTimer: 0,
      levelDone: false,
      currentHint: null
    }
    //
    // TOUCH letter quest: shared context + state machine driving letters,
    // spruces, ice melting, snowman rubbing and the final transition
    //
    const quest = createQuest({
      k,
      lettersCollected: questLettersCollected,
      heroInst,
      sound,
      levelIndicator,
      firstPlatform,
      snowmanWorldX,
      lakeBounds: lakeBoundsForSnow,
      lakeState,
      snowmanState,
      firs: questFirs,
      touchMusic,
      stuckHintState,
      wallColorHex: WALL_COLOR_HEX,
      goalState: questGoalState
    })
    k.onUpdate(() => onUpdateQuest(quest))
    //
    // Quest snowflake particles (fir bursts + hero death) render above the hero
    //
    k.add([
      k.z(CFG.visual.zIndex.player + 3),
      {
        draw() {
          drawQuestSnowflakes(k, quest.snowflakes)
        }
      }
    ])
    k.onUpdate(() => {
      if (quest.lettersCollected >= 4) onUpdateStuckHeroHint(k, stuckHintState, heroInst)
    })
    //
    // Breath vapor: periodic white puffs from hero's mouth
    //
    const breathState = { timer: BREATH_INTERVAL, particles: [] }
    k.add([
      k.z(CFG.visual.zIndex.player + 2),
      {
        draw() {
          drawBreathVapor(k, breathState.particles)
        }
      }
    ])
    k.onUpdate(() => onUpdateBreathVapor(k, heroInst, breathState))
    //
    // Cold idle shake and hint when the hero stands still for a long time
    //
    const coldIdleState = {
      stillTimer: 0,
      active: false,
      lastX: heroInst.character?.pos?.x ?? 0,
      lastY: heroInst.character?.pos?.y ?? 0,
      currentHint: null
    }
    k.onUpdate(() => onUpdateColdIdle(k, coldIdleState, heroInst, stuckHintState))
    //
    // Tree creak: periodic procedural creak sound
    //
    const creakState = { timer: TREE_CREAK_INTERVAL_MIN + Math.random() * (TREE_CREAK_INTERVAL_MAX - TREE_CREAK_INTERVAL_MIN) }
    k.onUpdate(() => {
      creakState.timer -= k.dt()
      if (creakState.timer <= 0) {
        Sound.playTreeCreakSound(sound)
        creakState.timer = TREE_CREAK_INTERVAL_MIN + Math.random() * (TREE_CREAK_INTERVAL_MAX - TREE_CREAK_INTERVAL_MIN)
      }
    })
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
 * Creates scrolling clouds under the top platform (seamless loop, same as level 0/1)
 * @param {Object} k - Kaplay instance
 */
function createCloudsUnderTopPlatform(k) {
  const CLOUD_SCROLL_SPEED = 6
  const CLOUD_TOP_Y = TOP_MARGIN + 15
  const CLOUD_BOTTOM_Y = TOP_MARGIN + 55
  const CLOUD_COUNT = 22
  const CLOUD_RANDOMNESS = 15
  //
  // Cloud band tint matches the muted teal used by Touch L0's distance
  // fog circles so all three touch levels share one cool-side cloud
  // colour and the L2 sky reads as part of the same atmosphere.
  //
  const baseCloudColor = k.rgb(32, 60, 68)
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

function drawSnowcapHighlightEllipse(k, cx, cy, rx, ry, color, opacity) {
  const segs = 22
  const pts = []
  for (let i = 0; i <= segs; i++) {
    const a = (i / segs) * Math.PI * 2
    pts.push(k.vec2(cx + Math.cos(a) * rx, cy + Math.sin(a) * ry))
  }
  k.drawPolygon({ pts, color, opacity })
}

/**
 * Creates blue snow drifts on bottom platform floor
 * @param {Object} k - Kaplay instance
 */
function createSnowDrifts(k, lakeBounds) {
  //
  // Snow drift configurations for bottom platform
  //
  const floorY = FLOOR_Y
  //
  // Generate many snow drifts with random sizes covering entire floor.
  // Skip drifts whose centre falls within the frozen lake band.
  //
  const drifts = []
  const lakeMinX = lakeBounds ? lakeBounds.minX : -1
  const lakeMaxX = lakeBounds ? lakeBounds.maxX : -1
  //
  // Fill entire bottom platform with drifts
  //
  const corridorStart = LEFT_MARGIN
  const corridorEnd = k.width() - RIGHT_MARGIN
  
  for (let x = corridorStart; x < corridorEnd; x += 40 + Math.random() * 30) {
    if (x >= lakeMinX - 20 && x <= lakeMaxX + 20) continue
    const width = 50 + Math.random() * 90
    const height = 8 + Math.random() * 15
    const zIndex = Math.random() > 0.5 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
    drifts.push({ x, width, height, y: floorY, z: zIndex, shapeType, skew })
  }
  //
  // Add some extra smaller drifts between main ones for more coverage
  //
  for (let x = corridorStart; x < corridorEnd; x += 30 + Math.random() * 25) {
    if (x >= lakeMinX - 20 && x <= lakeMaxX + 20) continue
    const width = 30 + Math.random() * 50
    const height = 5 + Math.random() * 8
    const zIndex = Math.random() > 0.3 ? 12 : 25
    const shapeType = Math.floor(Math.random() * 3)
    const skew = -0.3 + Math.random() * 0.6
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
            drawSnowcapHighlightEllipse(
              k,
              highlightOffset,
              highlightY,
              highlightRadius * 1.38,
              highlightRadius * 0.62,
              k.rgb(200, 220, 255),
              highlightOpacity
            )
          }
        }
      }
    ])
  })
}

/**
 * Creates platforms forming a path from top-left to bottom-right
 * All platforms are arranged so hero can jump from one to another
 * Leading to the final platform where the H letter appears
 * Platforms are invisible by default and become visible when hero lands nearby
 * @param {Object} k - Kaplay instance
 * @returns {Object} Object with first platform position and platform states array
 */
function createDiagonalPlatforms(k, enableTrap = false) {
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
    // First platform hosts the H letter later; it gets a snow cap but starts
    // hidden like the rest — it only appears when the H letter spawns
    //
    const isFirstPlatform = index === 0
    //
    // Initialize platform state (all platforms start invisible)
    //
    const platformState = {
      x,
      y,
      width,
      opacity: 0,
      jumpCount: 0,
      visibilityTimer: 0,
      visualObject: null,  // Will store visual object reference
      collisionObject: null,  // Will store collision object reference
      hasCollision: false,  // Track if collision is enabled
      shakeTimer: 0,  // Timer for shake effect (400ms)
      shakeOffsetX: 0,  // Current shake offset X
      shakeOffsetY: 0  // Current shake offset Y
    }
    platformStates.push(platformState)
    //
    // Create collision platform (collision enabled once the platform shows)
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
  const startX = LEFT_MARGIN + 272
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
  // Mark the 2nd log (index 1) as a trap that slides away while the hero
  // stands on the 3rd log (index 2).
  //
  const trapState = platformStates[TRAP_PLATFORM_INDEX]
  if (trapState && enableTrap) {
    trapState.isTrap = true
    trapState.trapTriggered = false
    trapState.trapPhase = 'idle'
    trapState.trapSlideProgress = 0
    trapState.trapPauseTimer = 0
    trapState.trapOriginalX = platforms[TRAP_PLATFORM_INDEX].x
    trapState.trapCorridorTimer = 0
    trapState.trapHasPassed = false
  }
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
  // Create canvas and draw bushes on it using toCanvas
  //
  const createBushesCanvas = () => {
    //
    // Calculate arc multiplier for bushes (higher at edges, lower in center)
    //
    const screenCenter = k.width() / 2
    const maxDistance = Math.max(screenCenter - LEFT_MARGIN, k.width() - RIGHT_MARGIN - screenCenter)
    
    return toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
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
  loadTouchSprite(k, 'bg-touch-level2-background-bushes-near', bushesDataURL)
  
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
  // Mountain palette tuned for the touch teal+orange complementary
  // scheme: rock faces sit on the cool side (steel-teal saturated)
  // while the snow caps catch a warm cream highlight so the moonlight
  // reads as the orange complement that the rest of the level frames.
  // Sky stays black — it's the canvas the warm moon and snow glow sit
  // on top of.
  //
  const colors = {
    sky: '#000000',
    snow: 'rgb(244, 232, 210)',
    rockLeft: 'rgb(60, 118, 142)',
    rockRight: 'rgb(48, 100, 122)',
    rockRightLight: 'rgb(112, 168, 202)'
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
  // Create canvas for mountains using toCanvas
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
    
    return toCanvas({ width: screenWidth, height: screenHeight, pixelRatio: 1 }, (ctx) => {
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
      // Left (shadow-side) mountain: deeper cool-teal rock, slightly
      // duller snow (it's not catching the moonlight).
      //
      drawMountain(ctx, leftMountainX, horizonY, leftMountainWidth, leftMountainHeight, leftMountainParams, 1.0, {
        snow: 'rgb(196, 196, 198)',
        rockLeft: 'rgb(40, 80, 100)',
        rockRight: 'rgb(28, 64, 86)',
        rockRightLight: 'rgb(78, 124, 148)'
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
      // Right (lit-side) mountain: brighter cool-teal rock + a warm
      // cream snow cap so the strongest moonlit peak doubles as the
      // dominant warm accent in the parallax band.
      //
      drawMountain(ctx, rightMountainX, horizonY, rightMountainWidth, rightMountainHeight, rightMountainParams, 1.0, {
        snow: 'rgb(248, 232, 196)',
        rockLeft: 'rgb(82, 144, 168)',
        rockRight: 'rgb(70, 130, 156)',
        rockRightLight: 'rgb(140, 196, 224)'
      })
      //
      // Draw moon in front of mountains
      //
      drawLevel2Moon(ctx)
    })
  }
  
  const mountainsDataURL = createMountainsCanvas()
  loadTouchSprite(k, 'bg-touch-level2-mountains', mountainsDataURL)
  
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
      //
      // Furthest fir-tree silhouettes: very dark teal so the deepest
      // parallax band stays cool and recessive on the new teal sky,
      // instead of reading as pure neutral black holes.
      //
      trunkColor: '#0E1A1E',
      leftColor: [12, 22, 26],
      rightColor: [16, 28, 32],
      layer0WidthPercent: .5,
      layersDecWidthPercent: .15,
      layersSharpness: Math.floor(Math.random() * 10 + 10)
    })
  }
}
function createBackgroundDarkestTrees(k) {
  const png = toCanvas({ width: k.width(), height: k.height() }, drawBackgroundDarkestTrees)
  loadTouchSprite(k, 'bg-touch-level2-darkest-trees', png)  
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
      //
      // Mid-distance fir-trees: slightly brighter dark teal so they
      // separate from the deepest band while staying on the cool side
      // of the complementary palette.
      //
      trunkColor: '#152830',
      leftColor: [18, 36, 42],
      rightColor: [28, 48, 54],
      layer0WidthPercent: .3,
      layersDecWidthPercent: .15,
      layersSharpness: Math.floor(Math.random() * 10 + 10)
    })
  }
}

function createBackgroundDarkTrees(k) {
  const png = toCanvas({ width: k.width(), height: k.height() }, drawBackgroundDarkTrees)
  loadTouchSprite(k, 'bg-touch-level2-background-dark-trees', png)
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
 * @param {number} crowExcludeX - X position of the crow; trees are cleared around it
 * @returns {Array} Combined tree data list (front row + overlay) for the spruce quest
 */
function createForegroundTrees(k, crowExcludeX, lakeMaxX) {
  const screenWidth = CFG.visual.screen.width
  //
  // Pre-generate layer data for 15 foreground trees (behind hero); exclude crow and lake areas
  //
  const foregroundTrees = generateForegroundTreeData(crowExcludeX, lakeMaxX)
  k.add([
    k.z(CFG.visual.zIndex.player - 1),
    {
      draw() {
        drawOverlayTreesSway(k, foregroundTrees)
      }
    }
  ])
  //
  // Pre-generate layer data for 2 overlay trees that sway in front of hero; exclude crow area
  //
  const overlayTrees = generateOverlayTreeData(screenWidth, crowExcludeX)
  k.add([
    k.z(CFG.visual.zIndex.player + 1),
    {
      draw() {
        drawOverlayTreesSway(k, overlayTrees)
      }
    }
  ])
  //
  // All near-ground firs are quest targets (frozen white until freed)
  //
  return [...foregroundTrees, ...overlayTrees]
}

/**
 * Pre-generates layer geometry for 15 foreground trees (behind hero)
 * Same data format as overlay trees so drawOverlayTreesSway can render both
 * @param {number} [crowExcludeX] - Skip trees within CROW_TREE_EXCLUDE_RADIUS of this X
 * @param {number} [lakeMaxX] - Skip trees whose x falls within the frozen lake
 * @returns {Array} Array of tree data objects
 */
function generateForegroundTreeData(crowExcludeX, lakeMaxX) {
  const w = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const treesAmount = 15
  const treePeriod = w / treesAmount
  const treeDefs = []
  for (let i = 0; i < treesAmount; i++) {
    const x = i * treePeriod + Math.random() * treePeriod + LEFT_MARGIN
    //
    // Skip tree slots too close to where the crow perches so no fir tree occludes the crow
    //
    if (crowExcludeX != null && Math.abs(x - crowExcludeX) < CROW_TREE_EXCLUDE_RADIUS) continue
    //
    // Skip trees on or left of the frozen lake
    //
    if (lakeMaxX != null && x < lakeMaxX + 20) continue
    //
    // Skip trees standing where floor icicles grow (right band + the
    // center corridor that fills with icicles after a life deduction)
    //
    if (isInFloorIcicleZone(x)) continue
    const height = arcY(x, LEFT_MARGIN, w, 200, 280)
    const layerCount = Math.floor(Math.random() * 4 + 4)
    treeDefs.push({
      x,
      height,
      layers: layerCount,
      trunkWidthPercent: 0.03,
      trunkHeightPercent: Math.random() * 0.2 + 0.1,
      //
      // Foreground fir-trees: pushed from pure spring-green toward warm
      // olive / amber-green so the closest forest band carries a faint
      // warm undertone — the warm complement to the cool teal sky and
      // mountain rock.
      //
      leftColor: [62, 110, 50],
      rightColor: [86, 142, 56],
      layer0WidthPercent: 0.3,
      layersDecWidthPercent: 0.15,
      layersSharpness: Math.floor(Math.random() * 10 + 10),
      phase: Math.random() * Math.PI * 2
    })
  }
  return treeDefs.map(def => buildTreeLayerData(def))
}
//
// Padding around floor icicle bands where no fir tree may grow
//
const FIR_ICICLE_EXCLUDE_PAD = 30
//
// True when x falls inside a floor icicle band: the always-present right
// band or the center corridor (icicles appear there after a life
// deduction — the safe passage gap in the middle stays tree-friendly)
//
function isInFloorIcicleZone(x) {
  const pad = FIR_ICICLE_EXCLUDE_PAD
  //
  // Right-side icicle band (always present)
  //
  if (x > RIGHT_ICICLE_START_X - pad && x < RIGHT_ICICLE_END_X + pad) return true
  //
  // Center corridor band (post-deduction icicles), minus the walk-through gap
  //
  const snowmanX = TouchLevel2Ambience.getSnowmanX(DECOR_LOG_PILE_POSITIONS[0], RIGHT_MARGIN)
  const centerStart = snowmanX + CENTER_ICICLE_SNOWMAN_CLEARANCE
  const centerEnd = ICICLE_SAFE_ZONE_X - CENTER_ICICLE_END_MARGIN
  const inGap = Math.abs(x - CENTER_ICICLE_GAP_CENTER_X) < CENTER_ICICLE_GAP_HALF_WIDTH - pad
  if (x > centerStart - pad && x < centerEnd + pad && !inGap) return true
  return false
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
    phase: def.phase,
    //
    // Spruce quest state: firs start frozen white; freeing fades whiteness
    // to 0 while the tree shakes and sheds snowflakes
    //
    whiteness: 1,
    freed: false,
    shakeTimer: 0
  }
}

/**
 * Pre-generates static layer geometry for overlay trees (computed once)
 * Each tree stores its trunk rect and layer triangles for per-frame drawing
 * @param {number} screenWidth - Screen width for positioning
 * @param {number} [crowExcludeX] - Skip trees within CROW_TREE_EXCLUDE_RADIUS of this X
 * @returns {Array} Array of tree data objects
 */
function generateOverlayTreeData(screenWidth, crowExcludeX) {
  const treeDefs = [
    {
      x: screenWidth - RIGHT_MARGIN - 180,
      height: 220,
      layers: 5,
      trunkWidthPercent: 0.03,
      trunkHeightPercent: 0.15,
      //
      // Overlay fir-trees: same warm olive / amber-green tuning as
      // the foreground row so the closest two trees stay on the warm
      // side of the complementary palette.
      //
      leftColor: [58, 96, 46],
      rightColor: [82, 128, 50],
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
      leftColor: [62, 104, 50],
      rightColor: [88, 134, 54],
      layer0WidthPercent: 0.3,
      layersDecWidthPercent: 0.15,
      layersSharpness: 12,
      phase: Math.random() * Math.PI * 2
    }
  ]
  return treeDefs
    .filter(def => crowExcludeX == null || Math.abs(def.x - crowExcludeX) >= CROW_TREE_EXCLUDE_RADIUS)
    .map(def => buildTreeLayerData(def))
}

/**
 * Draws overlay trees each frame with wind sway applied to each layer
 * Higher layers sway more than lower ones for realistic branch movement
 * @param {Object} k - Kaplay instance
 * @param {Array} trees - Pre-generated tree data
 */
function drawOverlayTreesSway(k, trees) {
  const time = k.time()
  const dt = k.dt()
  for (const tree of trees) {
    //
    // Advance quest animations: shake decays, whiteness fades after freeing
    //
    if (tree.shakeTimer > 0) tree.shakeTimer = Math.max(0, tree.shakeTimer - dt)
    if (tree.freed && tree.whiteness > 0) {
      tree.whiteness = Math.max(0, tree.whiteness - dt * FIR_WHITE_FADE_SPEED)
    }
    const swayBase = Math.sin(time * TREE_SWAY_SPEED + tree.phase) * TREE_SWAY_AMPLITUDE * (tree.height / 200)
    //
    // Shake offset: random jitter that fades with the remaining shake time
    //
    const shakeAmp = FIR_SHAKE_AMPLITUDE * (tree.shakeTimer / FIR_SHAKE_DURATION)
    const shakeX = tree.shakeTimer > 0 ? (Math.random() - 0.5) * 2 * shakeAmp : 0
    //
    // Draw trunk (no sway); trunk also whitens while the fir is frozen
    //
    const trunkBlend = tree.whiteness * FIR_TRUNK_WHITE_BLEND
    k.drawRect({
      pos: k.vec2(tree.trunkX, tree.trunkY),
      width: tree.trunkWidth,
      height: tree.trunkHeight,
      color: k.rgb(
        Math.round(74 + (FIR_WHITE_COLOR[0] - 74) * trunkBlend),
        Math.round(46 + (FIR_WHITE_COLOR[1] - 46) * trunkBlend),
        Math.round(31 + (FIR_WHITE_COLOR[2] - 31) * trunkBlend)
      )
    })
    //
    // Draw each layer with increasing sway; foliage lerps from snow-white
    // (whiteness = 1) to the tree's own green (whiteness = 0)
    //
    const lc = lerpTreeColor(tree.leftColor, tree.whiteness)
    const rc = lerpTreeColor(tree.rightColor, tree.whiteness)
    for (const layer of tree.layerData) {
      const sway = swayBase * (layer.index + 1) / tree.layers + shakeX
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
//
// Lerps a fir foliage color toward snow-white by the given blend (0-1)
//
function lerpTreeColor(rgbArr, blend) {
  return [
    Math.round(rgbArr[0] + (FIR_WHITE_COLOR[0] - rgbArr[0]) * blend),
    Math.round(rgbArr[1] + (FIR_WHITE_COLOR[1] - rgbArr[1]) * blend),
    Math.round(rgbArr[2] + (FIR_WHITE_COLOR[2] - rgbArr[2]) * blend)
  ]
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
function checkIcicleCollision(k, heroInst, icicleData, levelIndicator, quest) {
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
      onHeroDeath(k, heroInst, levelIndicator, quest)
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
  // Middle row: 2 logs resting in the gaps of the bottom row (overlap by 1px to close gaps)
  //
  const midY = FLOOR_Y - h - halfH + 1
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
  // Top: 1 log balanced on the middle row (overlap by 1px to close gaps)
  //
  logs.push({
    x: baseX + (Math.random() - 0.5) * 6,
    y: midY - h + 1,
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

/**
 * Handles hero death: hero scatters into snowflakes that fall like the
 * ambient snow, life score increments, then the level reloads
 * @param {Object} k - Kaplay instance
 * @param {Object} heroInst - Hero instance
 * @param {Object} levelIndicator - Level indicator with lifeImage and updateLifeScore
 * @param {Object} [quest] - Quest inst (hosts the snowflake particle pool)
 */
function onHeroDeath(k, heroInst, levelIndicator, quest) {
  if (heroInst.isDying) return
  k.shake(DEATH_SHAKE_STRENGTH)
  //
  // Mark the upcoming reload as a death resume so quest progress survives.
  // If H was already collected (or completeQuest already zeroed the flag),
  // keep progress at 4 so the level restarts on the H hunt — not from T.
  //
  const storedLetters = get(QUEST_LETTERS_FLAG, 0)
  const questLetters = quest?.lettersCollected ?? storedLetters
  const finishedH = questLetters >= 5 ||
    quest?.stuckHintState?.levelDone ||
    quest?.levelDone ||
    storedLetters >= 5
  if (finishedH) {
    set(QUEST_LETTERS_FLAG, 4)
  } else if (questLetters > 0) {
    set(QUEST_LETTERS_FLAG, questLetters)
  }
  set(QUEST_RESUME_FLAG, true)
  //
  // Scatter the hero into snowflakes instead of the default body particles
  //
  if (quest && heroInst.character?.pos) {
    spawnSnowflakeBurst(quest.snowflakes, heroInst.character.pos.x, heroInst.character.pos.y, DEATH_SNOWFLAKE_COUNT)
  }
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
    //
    // 7-second restart pause with the standard countdown prompt on top
    //
    startDeathCountdown(k, 'lesson-touch.2')
  }, { suppressParticles: !!quest })
}
//
// Shows "Press Space or Enter to continue... N" at the top after hero death.
// The countdown number is inline, same color as the prompt text.
// Auto-restarts when the countdown reaches 0 (same as touch lesson 1).
//
function startDeathCountdown(k, sceneName) {
  let elapsed = 0
  const cx = CFG.visual.screen.width / 2
  const textCfg = { size: DEATH_PROMPT_FONT, font: CFG.visual.fonts.regularFull }
  const initText = DEATH_PROMPT_BASE + DEATH_COUNTDOWN_SECONDS
  //
  // Drop shadow (single black copy offset right+down), glow-level style
  //
  const offs = [[1.5, 1.5]]
  const outlines = offs.map(([dx, dy]) => k.add([
    k.text(initText, textCfg),
    k.pos(cx + dx, DEATH_PROMPT_Y + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(0.85),
    k.z(CFG.visual.zIndex.ui + 60)
  ]))
  const promptText = k.add([
    k.text(initText, textCfg),
    k.pos(cx, DEATH_PROMPT_Y),
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
    const newText = DEATH_PROMPT_BASE + Math.ceil(remaining)
    if (promptText.exists()) promptText.text = newText
    outlines.forEach(o => o?.exists?.() && (o.text = newText))
    if (elapsed >= DEATH_COUNTDOWN_SECONDS) doRestart()
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
  gradient.addColorStop(0, `rgba(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B}, 0.11)`)
  gradient.addColorStop(0.4, `rgba(${MOON_COLOR_R}, ${MOON_COLOR_G}, ${MOON_COLOR_B}, 0.045)`)
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
 * Updates moon ambient glow with a smooth always-on pulse (no mouse hover).
 * @param {Object} k - Kaplay instance
 * @param {Object} state - Moon glow state { intensity: 0-1 }
 */
function updateMoonHoverGlow(k, state) {
  const pulse = 0.72 + 0.28 * (0.5 + 0.5 * Math.sin(k.time() * MOON_AMBIENT_PULSE_SPEED))
  const dt = k.dt()
  state.intensity += (pulse - state.intensity) * MOON_HOVER_GLOW_SPEED * dt
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
  const rings = 12
  for (let i = rings; i > 0; i--) {
    const t = i / rings
    const radius = MOON_RADIUS + MOON_HOVER_GLOW_EXTRA * t * 1.1
    k.drawCircle({
      pos: k.vec2(MOON_X, MOON_Y),
      radius,
      color: glowColor,
      opacity: state.intensity * 0.07 * (1 - t * t)
    })
  }
}

/**
 * Spawns one expanding ring of particles under the hero's feet
 * @param {Array} rings - Ring array (mutated)
 * @param {number} hx - Foot world X
 * @param {number} hy - Foot world Y
 */
function spawnLandingRing(rings, hx, hy) {
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

/**
 * Advances existing landing rings (expand + fade). Spawn is handled by the scene.
 * @param {Object} k - Kaplay instance
 * @param {Array} rings - Ring array (mutated in place)
 */
function onUpdateLandingRings(k, rings) {
  const dt = k.dt()
  for (let i = rings.length - 1; i >= 0; i--) {
    const ring = rings[i]
    ring.life -= dt
    if (ring.life <= 0) {
      rings.splice(i, 1)
      continue
    }
    ring.radius += JUMP_RING_EXPAND_SPEED * dt
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
 * Shows progressive hints above the hero when the player seems stuck.
 * Phase 0: first hint after STUCK_HINT_1_DELAY seconds.
 * Phase 1+: second hint every STUCK_HINT_REPEAT_INTERVAL seconds.
 * @param {Object} k - Kaplay instance
 * @param {Object} state - Stuck hint state
 * @param {Object} heroInst - Hero instance
 */
function onUpdateStuckHeroHint(k, state, heroInst) {
  if (state.levelDone) return
  const dt = k.dt()
  state.timer += dt
  if (state.phase === 0) {
    //
    // Phase 0: show first hint after initial delay
    //
    if (state.timer < STUCK_HINT_1_DELAY) return
    state.phase = 1
    state.repeatTimer = STUCK_HINT_REPEAT_INTERVAL
    showStuckHint(k, state, heroInst, STUCK_HINT_1_TEXT)
  } else {
    //
    // Phase 1+: show second hint every STUCK_HINT_REPEAT_INTERVAL seconds
    //
    state.repeatTimer -= dt
    if (state.repeatTimer > 0) return
    state.repeatTimer = STUCK_HINT_REPEAT_INTERVAL
    showStuckHint(k, state, heroInst, STUCK_HINT_2_TEXT)
  }
}
//
// Shows a brief forced tooltip above the hero, replacing any active stuck hint
//
function showStuckHint(k, state, heroInst, text) {
  state.currentHint && Tooltip.destroy(state.currentHint)
  state.currentHint = null
  if (state.levelDone) return
  const target = {
    x: () => heroInst.character?.pos?.x ?? 0,
    y: () => heroInst.character?.pos?.y ?? 0,
    width: 0,
    height: 0,
    text,
    offsetY: STUCK_HINT_Y_OFFSET
  }
  const tip = Tooltip.create({ k, targets: [target], forceVisible: true })
  tip.activeTarget = target
  tip.frozenX = Math.round(heroInst.character?.pos?.x ?? 0)
  tip.frozenY = Math.round(heroInst.character?.pos?.y ?? 0)
  tip.opacity = 1
  state.currentHint = tip
  k.wait(STUCK_HINT_DISPLAY_TIME, () => {
    if (state.currentHint === tip) {
      Tooltip.destroy(tip)
      state.currentHint = null
    }
  })
}
//
// Detects long idle standing and triggers cold screen shake plus a hint above the hero.
//
function onUpdateColdIdle(k, state, heroInst, stuckHintState) {
  if (stuckHintState.levelDone || !heroInst.character?.pos) return
  const x = heroInst.character.pos.x
  const y = heroInst.character.pos.y
  const moved = Math.abs(x - state.lastX) + Math.abs(y - state.lastY)
  state.lastX = x
  state.lastY = y
  if (moved > COLD_IDLE_MOVE_THRESHOLD) {
    state.stillTimer = 0
    state.active = false
    state.currentHint && Tooltip.destroy(state.currentHint)
    state.currentHint = null
    return
  }
  state.stillTimer += k.dt()
  if (state.stillTimer < COLD_IDLE_STILL_TIME) return
  state.active = true
  if (!state.currentHint) {
    const target = {
      x: () => heroInst.character?.pos?.x ?? 0,
      y: () => heroInst.character?.pos?.y ?? 0,
      width: 0,
      height: 0,
      text: COLD_HINT_TEXT,
      offsetY: COLD_HINT_Y_OFFSET
    }
    const tip = Tooltip.create({ k, targets: [target], forceVisible: true })
    tip.activeTarget = target
    tip.frozenX = Math.round(x)
    tip.frozenY = Math.round(y)
    tip.opacity = 1
    state.currentHint = tip
  }
  //
  // Wave-shaped micro-shake while the hero stays frozen in the cold.
  //
  const wave = 0.5 + 0.5 * Math.sin(k.time() * COLD_SHAKE_WAVE_SPEED)
  const secondary = 0.5 + 0.5 * Math.sin(k.time() * COLD_SHAKE_WAVE_SPEED * 0.67 + 1.2)
  const strength = COLD_SHAKE_MAX * wave * secondary * k.dt() * 60
  k.shake(strength)
}

/**
 * Generates center floor icicles that appear when the life-deduction trap activates.
 * Fills the safe corridor from the snowman zone to the right icicle boundary.
 * @param {number} snowmanX - World X of the snowman (icicles start after it)
 * @returns {Array} Array of icicle objects
 */
function generateCenterIcicles(snowmanX) {
  const icicles = []
  const startX = (snowmanX ?? LEFT_MARGIN + CENTER_ICICLE_START_X_OFFSET) + CENTER_ICICLE_SNOWMAN_CLEARANCE
  const endX = ICICLE_SAFE_ZONE_X - CENTER_ICICLE_END_MARGIN
  for (let x = startX; x < endX; x += ICICLE_SPACING) {
    const nearLog = DECOR_LOG_PILE_POSITIONS.some(logX => Math.abs(x - logX) < DECOR_LOG_WIDTH * 1.5)
    if (nearLog) continue
    //
    // Leave a passage in the middle so the hero can cross to the other side
    //
    if (Math.abs(x - CENTER_ICICLE_GAP_CENTER_X) < CENTER_ICICLE_GAP_HALF_WIDTH) continue
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
 * Generates right-side floor icicles (bottom platform right portion).
 * Always present from the start of the level.
 * @returns {Array} Array of icicle objects
 */
function generateLeftLakeKillerIcicle() {
  return {
    x: LEFT_MARGIN + LEFT_LAKE_KILLER_ICICLE_X_OFFSET,
    baseY: FLOOR_Y,
    width: ICICLE_WIDTH_MAX,
    height: ICICLE_HEIGHT_MAX,
    tipOffset: 0
  }
}
//
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
    if (state.isFake) return
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
// True when the hero's feet are grounded on a visible log platform state.
//
function isHeroOnLogPlatform(heroX, heroFeetY, state, platformHeight) {
  if (!state || state.opacity <= 0) return false
  const platformTopY = state.y - platformHeight / 2
  return Math.abs(heroX - state.x) < state.width / 2 + 20
    && heroFeetY >= platformTopY - 5
    && heroFeetY <= platformTopY + TRAP_PLATFORM_TOP_TOLERANCE
}
//
// Slides the 2nd log left while the hero stands on the 3rd log, then returns it.
//
function updateTrapPlatformSlide(k, platformStates, heroX, heroY, dt) {
  const triggerPlatform = platformStates[TRAP_TRIGGER_PLATFORM_INDEX]
  const heroFeetY = heroY + 35
  const heroOnThird = isHeroOnLogPlatform(heroX, heroFeetY, triggerPlatform, 30)
  platformStates.forEach(state => {
    if (!state.isTrap) return
    if (state.trapHasPassed) return
    const platformTopY = state.y - 15
    const onTrap = Math.abs(heroX - state.x) < state.width / 2 + 20
      && heroFeetY > platformTopY && heroFeetY < platformTopY + TRAP_PLATFORM_TOP_TOLERANCE
      && state.opacity > 0
    if (onTrap && (state.trapPhase === 'sliding-out' || state.trapPhase === 'pausing' || state.trapPhase === 'corridor')) {
      state.trapHasPassed = true
      return
    }
    if (state.trapPhase === 'corridor') {
      state.trapCorridorTimer -= dt
      if (state.trapCorridorTimer <= 0) {
        state.trapTriggered = false
        state.trapPhase = 'idle'
      }
      return
    }
    if (!state.trapTriggered && heroOnThird && state.opacity > 0) {
      state.trapTriggered = true
      state.trapPhase = 'sliding-out'
      state.trapSlideProgress = 0
      state.trapPauseTimer = 0
    }
    if (state.trapPhase === 'sliding-out') {
      state.trapSlideProgress += TRAP_PLATFORM_SLIDE_SPEED * dt
      if (state.trapSlideProgress >= TRAP_PLATFORM_SLIDE_DISTANCE) {
        state.trapSlideProgress = TRAP_PLATFORM_SLIDE_DISTANCE
        state.trapPhase = 'pausing'
        state.trapPauseTimer = 0
      }
      syncTrapPlatformX(state, state.trapOriginalX - state.trapSlideProgress)
    } else if (state.trapPhase === 'pausing') {
      state.trapPauseTimer += dt
      if (state.trapPauseTimer >= TRAP_PLATFORM_PAUSE_DURATION) {
        state.trapPhase = 'sliding-back'
      }
    } else if (state.trapPhase === 'sliding-back') {
      state.trapSlideProgress -= TRAP_PLATFORM_RETURN_SPEED * dt
      if (state.trapSlideProgress <= 0) {
        state.trapSlideProgress = 0
        state.trapPhase = 'corridor'
        state.trapCorridorTimer = TRAP_CORRIDOR_DURATION
        state.trapTriggered = false
      }
      syncTrapPlatformX(state, state.trapOriginalX - state.trapSlideProgress)
    }
  })
}
//
// Moves a trap platform's collision + visual objects together.
//
function syncTrapPlatformX(state, newX) {
  state.x = newX
  state.visualObject && (state.visualObject.pos.x = newX)
  state.collisionObject && (state.collisionObject.pos.x = newX)
}
//
// Checks if hero collides with hanging icicles.
// Uses hero's head position (center minus offset) for accurate vertical overlap.
// Only checks icicles whose parent platform is visible.
//
function checkHangingIcicleCollision(k, heroInst, data, levelIndicator, platformStates, quest) {
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
      onHeroDeath(k, heroInst, levelIndicator, quest)
      return
    }
  }
}
//
// Update breath vapor: spawn puffs periodically, age existing particles
//
function onUpdateBreathVapor(k, heroInst, state) {
  const dt = k.dt()
  //
  // Age and remove expired particles
  //
  for (let i = state.particles.length - 1; i >= 0; i--) {
    const p = state.particles[i]
    p.life -= dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.size += 2 * dt
    if (p.life <= 0) state.particles.splice(i, 1)
  }
  if (!heroInst?.character?.pos) return
  state.timer -= dt
  if (state.timer > 0) return
  state.timer = BREATH_INTERVAL
  //
  // Spawn breath puff from hero's mouth area
  //
  const dir = heroInst.direction ?? 1
  const baseX = heroInst.character.pos.x + BREATH_OFFSET_X * dir
  const baseY = heroInst.character.pos.y + BREATH_OFFSET_Y
  for (let i = 0; i < BREATH_PARTICLE_COUNT; i++) {
    const angle = (dir > 0 ? 0 : Math.PI) + (Math.random() - 0.5) * 0.8
    const speed = BREATH_PARTICLE_SPEED * (0.5 + Math.random())
    state.particles.push({
      x: baseX + (Math.random() - 0.5) * 4,
      y: baseY + (Math.random() - 0.5) * 4,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed - 8,
      size: BREATH_PARTICLE_SIZE_MIN + Math.random() * (BREATH_PARTICLE_SIZE_MAX - BREATH_PARTICLE_SIZE_MIN),
      life: BREATH_PARTICLE_LIFETIME * (0.6 + Math.random() * 0.4),
      maxLife: BREATH_PARTICLE_LIFETIME
    })
  }
}
//
// Draw breath vapor puffs
//
const SURFACE_FLOOR_THRESHOLD = 80
//
// Sets sound._l2Surface based on the surface the hero stands on:
//   'ice'   — frozen lake (no sounds)
//   'water' — melted lake (quest handler plays the splashes)
//   'snow'  — ground floor outside the lake
//   'wood'  — elevated log platform
//
function onUpdateSurfaceTracker(heroInst, sound, lakeBounds, lakeState) {
  if (!heroInst?.character?.exists?.()) return
  const hx = heroInst.character.pos.x
  const hy = heroInst.character.pos.y
  const distFromFloor = Math.abs(hy - FLOOR_Y)
  if (distFromFloor < SURFACE_FLOOR_THRESHOLD) {
    //
    // Frozen lake mutes steps entirely; melted lake switches to water
    // (splash sounds are played by the quest water-run handler instead)
    //
    const onLakeArea = lakeBounds && hx >= lakeBounds.minX && hx <= lakeBounds.maxX
    sound._l2Surface = onLakeArea ? (lakeState?.melted ? 'water' : 'ice') : 'snow'
  } else {
    sound._l2Surface = 'wood'
  }
}
//
// Ice-slide constant: friction per frame (1.0 = no deceleration, lower = faster stop).
//
const ICE_SLIDE_FRICTION = 0.96
const ICE_SLIDE_MIN_VEL = 2
//
// While hero is grounded on the frozen lake, preserve horizontal momentum so the
// character slides instead of stopping the instant keys are released.
//
function onUpdateIceSlide(k, heroInst, lakeBounds, state, lakeState) {
  if (!heroInst?.character?.exists?.()) return
  //
  // No sliding once the ice has melted into open water
  //
  if (lakeState?.melted) {
    state.vel = 0
    return
  }
  const hx = heroInst.character.pos.x
  const hy = heroInst.character.pos.y
  const onGround = Math.abs(hy - FLOOR_Y) < SURFACE_FLOOR_THRESHOLD
  const onLake = onGround && hx >= lakeBounds.minX && hx <= lakeBounds.maxX
  if (onLake) {
    const leftDown = k.isKeyDown('left') || k.isKeyDown('a')
    const rightDown = k.isKeyDown('right') || k.isKeyDown('d')
    if (leftDown || rightDown) {
      //
      // Record velocity direction while keys are held.
      //
      state.vel = (rightDown ? 1 : -1) * (heroInst.speed ?? 0)
    } else if (Math.abs(state.vel) > ICE_SLIDE_MIN_VEL) {
      //
      // No key pressed on ice: carry slide velocity forward with slow friction.
      //
      heroInst.character.move(state.vel, 0)
      state.vel *= ICE_SLIDE_FRICTION
    } else {
      state.vel = 0
    }
  } else {
    state.vel = 0
  }
}
//
function drawBreathVapor(k, particles) {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife) * 0.4
    k.drawCircle({
      pos: k.vec2(p.x, p.y),
      radius: p.size,
      color: k.rgb(220, 230, 240),
      opacity: alpha
    })
    k.drawCircle({
      pos: k.vec2(p.x, p.y),
      radius: p.size * 1.8,
      color: k.rgb(200, 210, 220),
      opacity: alpha * 0.3
    })
  }
}

/**
 * Creates the TOUCH letter quest state and spawns the letter matching the
 * saved progress (T on left logs at start, H on the first platform late).
 * @param {Object} cfg - Quest configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.lettersCollected - Restored letter count (0-5)
 * @param {Object} cfg.heroInst - Hero instance
 * @param {Object} cfg.sound - Sound instance
 * @param {Object} cfg.levelIndicator - HUD letter indicator
 * @param {Object} cfg.firstPlatform - First (always visible) platform data
 * @param {number} cfg.snowmanWorldX - Snowman world X
 * @param {Object} cfg.lakeBounds - Frozen lake bounds
 * @param {Object} cfg.lakeState - Mutable ice state shared with ambience
 * @param {Object} cfg.snowmanState - Mutable snowman state shared with ambience
 * @param {Array} cfg.firs - Touchable fir tree data list
 * @param {Object} cfg.touchMusic - Background music handle
 * @param {Object} cfg.stuckHintState - Stuck hint state (levelDone flag)
 * @param {string} cfg.wallColorHex - Scene backdrop hex for dialogs
 * @returns {Object} Quest inst
 */
function createQuest(cfg) {
  const quest = {
    ...cfg,
    dialogOpen: false,
    levelDone: false,
    letterObjs: { T: null, O: null, U: null, C: null, H: null },
    wasGrounded: false,
    iceRunLastX: null,
    iceCrackAccum: 0,
    icePauseTime: 0,
    waterStillTimer: 0,
    waterStepAccum: 0,
    waterRunLastX: null,
    waterStepLastX: null,
    rubCount: 0,
    rubGapTimer: 0,
    rubLastSide: null,
    hSpawned: false,
    snowflakes: []
  }
  //
  // Restore world state for completed phases: firs already freed after O
  //
  if (quest.lettersCollected >= 2) {
    quest.firs.forEach(fir => {
      fir.freed = true
      fir.whiteness = 0
    })
  }
  //
  // After C (letters >= 4) the snowman stays collapsed for the H hunt
  //
  if (quest.lettersCollected >= 4 && quest.snowmanState) {
    quest.snowmanState.collapsed = true
    quest.snowmanState.collapseTime = Math.max(quest.snowmanState.collapseTime || 0, 10)
  }
  //
  // Spawn the letter the hero is currently hunting (phases without a letter
  // on screen spawn theirs when the phase condition is met)
  //
  if (quest.lettersCollected === 0) {
    quest.letterObjs.T = createPickupLetter(quest.k, 'T', DECOR_LOG_PILE_POSITIONS[0], QUEST_LETTER_T_Y, QUEST_LETTER_TILTS[0])
  } else if (quest.lettersCollected === 4) {
    spawnQuestLetterH(quest, true)
  }
  //
  // Rub countdown display above the snowman (hidden until 3 rubs)
  //
  quest.rubCounter = createRubCounter(quest.k, quest.snowmanWorldX, FLOOR_Y + RUB_COUNTER_Y_OFFSET)
  return quest
}
//
// Main per-frame quest update: snowflake particles, letter pulsing,
// pickups and the phase-specific interactions
//
function onUpdateQuest(quest) {
  const k = quest.k
  updateQuestSnowflakes(k, quest.snowflakes)
  pulseQuestLetters(k, quest)
  if (quest.levelDone || quest.dialogOpen) return
  const hero = quest.heroInst
  if (!hero?.character?.pos || hero.isDying) return
  const heroX = hero.character.pos.x
  const heroY = hero.character.pos.y
  const grounded = hero.character.isGrounded?.() ?? false
  const justLanded = grounded && !quest.wasGrounded
  quest.wasGrounded = grounded
  //
  // Splashy water steps only while the lake is open water AND the hero
  // has not yet collected U (after U the lake freezes on leave)
  //
  quest.lakeState.melted && quest.lettersCollected === 2 && handleWaterRun(quest, heroX, heroY, grounded, justLanded)
  //
  // After U is collected, leaving the lake freezes it back to ice so the
  // hero slides again and water sounds stay off
  //
  quest.lettersCollected >= 3 && quest.lakeState.melted && freezeLakeIfHeroLeft(quest, heroX, heroY)
  const n = quest.lettersCollected
  if (n === 0) {
    checkQuestPickup(heroX, heroY, quest.letterObjs.T, () => collectLetterT(quest))
  } else if (n === 1) {
    handleFirTouch(quest, heroX, heroY, justLanded)
    checkQuestPickup(heroX, heroY, quest.letterObjs.O, () => collectLetterO(quest))
  } else if (n === 2) {
    handleIceCracking(quest, heroX, heroY, grounded, justLanded)
    checkQuestPickup(heroX, heroY, quest.letterObjs.U, () => collectLetterU(quest))
  } else if (n === 3) {
    handleSnowmanRubbing(quest, heroX, heroY, k.dt())
    checkQuestPickup(heroX, heroY, quest.letterObjs.C, () => collectLetterC(quest))
  } else if (n === 4) {
    checkQuestPickup(heroX, heroY, quest.letterObjs.H, () => collectLetterH(quest))
  }
}
//
// Creates a single pickup letter (outlined teal text with tilt), same
// visual style as the touch L0 letters
//
function createPickupLetter(k, letter, x, y, tiltDeg) {
  const font = CFG.visual.fonts.thinFull.replace(/'/g, '')
  const oo = QUEST_LETTER_OUTLINE
  const behindSnow = QUEST_LETTER_BEHIND_SNOW.has(letter)
  const zMain = behindSnow ? QUEST_LETTER_Z_BEHIND_SNOW : QUEST_LETTER_Z_FRONT
  const zOutline = zMain - 1
  //
  // Drop shadow (single black copy offset right+down)
  //
  const offsets = [[oo, oo]]
  const outlines = offsets.map(([dx, dy]) => k.add([
    k.text(letter, { size: QUEST_LETTER_SIZE, font }),
    k.pos(x + dx, y + dy),
    k.anchor('bot'),
    k.rotate(tiltDeg),
    k.scale(1, 1),
    k.color(0, 0, 0),
    k.z(zOutline)
  ]))
  const main = k.add([
    k.text(letter, { size: QUEST_LETTER_SIZE, font }),
    k.pos(x, y),
    k.anchor('bot'),
    k.rotate(tiltDeg),
    k.scale(1, 1),
    k.color(QUEST_LETTER_COLOR_R, QUEST_LETTER_COLOR_G, QUEST_LETTER_COLOR_B),
    k.z(zMain)
  ])
  const destroy = () => {
    main.destroy?.()
    outlines.forEach(o => o.destroy?.())
  }
  return { main, outlines, destroy }
}
//
// Emerge animation: the letter grows upward from its bottom anchor so it
// reads as rising out of the water instead of fading in
//
function animateLetterRise(k, obj) {
  const applyScale = (v) => {
    obj.main?.exists?.() && (obj.main.scale = k.vec2(1, v))
    obj.outlines.forEach(o => o?.exists?.() && (o.scale = k.vec2(1, v)))
  }
  applyScale(0.01)
  k.tween(0.01, 1, QUEST_LETTER_RISE_DURATION, applyScale, k.easings.easeOutCubic)
}
//
// Tips a letter out of the snowman: from (startX, startY) diagonally to
// its resting spot in the snow (left and down).
//
function animateLetterFall(k, obj, startX, startY, endX, endY) {
  const oo = QUEST_LETTER_OUTLINE
  const setAllPos = (x, y) => {
    if (obj.main?.exists?.()) {
      obj.main.pos.x = x
      obj.main.pos.y = y
    }
    obj.outlines.forEach(o => {
      if (!o?.exists?.()) return
      o.pos.x = x + oo
      o.pos.y = y + oo
    })
  }
  setAllPos(startX, startY)
  const ease = k.easings?.easeOutCubic ?? ((t) => 1 - Math.pow(1 - t, 3))
  k.tween(0, 1, QUEST_LETTER_C_FALL_DURATION, (t) => {
    setAllPos(startX + (endX - startX) * t, startY + (endY - startY) * t)
  }, ease)
}
//
// Pulses letter opacity/color between teal and white (L0-style shimmer)
//
function pulseQuestLetters(k, quest) {
  const t = k.time()
  const pulse = (Math.sin(t * QUEST_LETTER_PULSE_SPEED) + 1) / 2
  const opacity = QUEST_LETTER_PULSE_MIN + (1 - QUEST_LETTER_PULSE_MIN) * pulse
  const cr = Math.round(QUEST_LETTER_COLOR_R + (255 - QUEST_LETTER_COLOR_R) * pulse)
  const cg = Math.round(QUEST_LETTER_COLOR_G + (255 - QUEST_LETTER_COLOR_G) * pulse)
  const cb = Math.round(QUEST_LETTER_COLOR_B + (255 - QUEST_LETTER_COLOR_B) * pulse)
  for (const key of Object.keys(quest.letterObjs)) {
    const obj = quest.letterObjs[key]
    if (!obj) continue
    obj.main.opacity = opacity
    obj.main.color = k.rgb(cr, cg, cb)
    obj.outlines.forEach(o => { o.opacity = opacity * 0.5 })
  }
}
//
// Distance check between the hero and a letter's visual center
//
function checkQuestPickup(heroX, heroY, obj, onCollect) {
  if (!obj?.main?.pos) return
  const dx = heroX - obj.main.pos.x
  const dy = heroY - (obj.main.pos.y - QUEST_LETTER_SIZE / 2)
  if (dx * dx + dy * dy < QUEST_LETTER_COLLECT_RADIUS * QUEST_LETTER_COLLECT_RADIUS) {
    onCollect()
  }
}
//
// Shared collect logic: destroy the letter, light the HUD letter with a
// burst, persist progress and open the quest dialog
//
function collectQuestLetter(quest, letterKey, dialogText, onDialogClose) {
  const obj = quest.letterObjs[letterKey]
  obj?.destroy()
  quest.letterObjs[letterKey] = null
  quest.lettersCollected += 1
  set(QUEST_LETTERS_FLAG, quest.lettersCollected)
  //
  // Remember the dialog for the Goal button (plain text, no [hl] tags)
  //
  if (quest.goalState) quest.goalState.lastDialog = stripQuestHlTags(dialogText)
  quest.sound && Sound.playLetterPickupSoft(quest.sound)
  LevelIndicator.setSectionLabelLetterProgress(quest.levelIndicator, quest.lettersCollected)
  LevelIndicator.flashLetterBurst(quest.levelIndicator, quest.lettersCollected)
  quest.dialogOpen = true
  LevelHelp.openStandalonePanel(quest.k, dialogText, {
    fillRgb: { r: QUEST_DIALOG_FILL_R, g: QUEST_DIALOG_FILL_G, b: QUEST_DIALOG_FILL_B },
    textRgb: { r: QUEST_LETTER_COLOR_R, g: QUEST_LETTER_COLOR_G, b: QUEST_LETTER_COLOR_B },
    borderRgb: { r: QUEST_LETTER_COLOR_R, g: QUEST_LETTER_COLOR_G, b: QUEST_LETTER_COLOR_B },
    sceneBackdropHex: quest.wallColorHex,
    //
    // Yellow highlight for the quest letter via Kaplay inline style tag [hl]
    //
    textStyles: { hl: { color: quest.k.rgb(QUEST_DIALOG_HL_R, QUEST_DIALOG_HL_G, QUEST_DIALOG_HL_B), override: true } },
    onClose: () => {
      quest.dialogOpen = false
      onDialogClose?.()
    }
  })
}
//
// Strips [hl]…[/hl] markup so Goal panel shows plain dialog copy
//
function stripQuestHlTags(text) {
  return String(text || '').replace(/\[\/?hl\]/g, '')
}
//
// T collected on the left logs — spruce-freeing phase begins
//
function collectLetterT(quest) {
  collectQuestLetter(quest, 'T', QUEST_DIALOG_T)
}
//
// O collected at the hero's start point — ice-breaking phase begins
//
function collectLetterO(quest) {
  collectQuestLetter(quest, 'O', QUEST_DIALOG_O)
}
//
// U collected on the melted lake — snowman-rubbing phase begins
//
function collectLetterU(quest) {
  collectQuestLetter(quest, 'U', QUEST_DIALOG_U)
}
//
// C collected at the collapsed snowman — H appears on the first platform
//
function collectLetterC(quest) {
  collectQuestLetter(quest, 'C', QUEST_DIALOG_C, () => spawnQuestLetterH(quest))
}
//
// H collected on the first platform — level complete
//
function collectLetterH(quest) {
  quest.stuckHintState.levelDone = true
  collectQuestLetter(quest, 'H', QUEST_DIALOG_H, () => completeQuest(quest))
}
//
// Spawns the final H letter lying on the first platform; the platform
// itself only becomes visible once this letter exists (hSpawned flag)
//
function spawnQuestLetterH(quest, silent = false) {
  if (quest.letterObjs.H) return
  //
  // Glyph bottom sinks slightly below the platform top edge so the letter
  // rests ON the log instead of hovering above it
  //
  const platTopY = quest.firstPlatform.y - 15 + QUEST_LETTER_SNOW_SINK
  quest.letterObjs.H = createPickupLetter(quest.k, 'H', quest.firstPlatform.x, platTopY, QUEST_LETTER_TILTS[4])
  quest.hSpawned = true
  !silent && playLetterAppearSound(quest)
}
//
// Soft chime marking a new quest letter appearing in the world
//
function playLetterAppearSound(quest) {
  quest.sound && Sound.playLetterPickupSoft(quest.sound)
}
//
// Level completion: score, victory sound and transition to the next level
//
function completeQuest(quest) {
  quest.levelDone = true
  //
  // Keep letters at 4 until the transition actually leaves — if the hero
  // dies after the H dialog, death resume must still restart on the H phase.
  // Cleared when the next level loads or on a fresh menu entry (resume flag).
  //
  set(QUEST_LETTERS_FLAG, 4)
  const newScore = get('heroScore', 0) + 1
  set('heroScore', newScore)
  quest.levelIndicator?.updateHeroScore?.(newScore)
  quest.sound && Sound.playVictorySound(quest.sound)
  quest.k.wait(QUEST_COMPLETE_TRANSITION_DELAY, () => {
    set(QUEST_LETTERS_FLAG, 0)
    set(QUEST_RESUME_FLAG, false)
    Sound.stopAmbient(quest.sound)
    quest.touchMusic.stop()
    createLevelTransition(quest.k, 'lesson-touch.2')
  })
}
//
// Spruce freeing: a landing near a frozen fir shakes it, sheds a snowflake
// burst and fades it to green. When all firs are free, O appears at spawn.
//
function handleFirTouch(quest, heroX, heroY, justLanded) {
  if (!justLanded) return
  //
  // Only ground-level landings count (not the log platforms above)
  //
  if (Math.abs(heroY + HERO_FEET_OFFSET - FLOOR_Y) > QUEST_FLOOR_TOLERANCE) return
  let freedAny = false
  for (const fir of quest.firs) {
    if (fir.freed) continue
    if (Math.abs(heroX - fir.x) > FIR_TOUCH_RADIUS) continue
    fir.freed = true
    fir.shakeTimer = FIR_SHAKE_DURATION
    freedAny = true
    //
    // Shed snow along the full fir height (not a single mid-tree point)
    //
    spawnSnowflakeBurstAlongFir(quest.snowflakes, fir.x, fir.height, FIR_BURST_SNOWFLAKE_COUNT)
  }
  freedAny && quest.sound && Sound.playTreeCreakSound(quest.sound)
  //
  // All firs green — the O letter appears lying in the snow at the start point
  //
  if (!quest.letterObjs.O && quest.firs.every(fir => fir.freed)) {
    quest.letterObjs.O = createPickupLetter(quest.k, 'O', HERO_SPAWN_X, FLOOR_Y + QUEST_LETTER_O_SINK, QUEST_LETTER_TILTS[1])
    playLetterAppearSound(quest)
  }
}
//
// Ice cracking: running (and landing from jumps) on the frozen lake
// accumulates crack progress. Pausing lets the cracks slowly refreeze
// and fade — the hero has to start over. Once the lake melts, standing
// still on the water for LAKE_REFREEZE_DELAY freezes it back.
//
function handleIceCracking(quest, heroX, heroY, grounded, justLanded) {
  const lake = quest.lakeState
  const dt = quest.k.dt()
  const onLake = Math.abs(heroY + HERO_FEET_OFFSET - FLOOR_Y) < QUEST_FLOOR_TOLERANCE
    && heroX >= quest.lakeBounds.minX && heroX <= quest.lakeBounds.maxX
  //
  // Melted phase: watch for the refreeze (no running on the water)
  //
  if (lake.melted) {
    updateLakeRefreeze(quest, heroX, grounded && onLake, dt)
    return
  }
  //
  // A jump landing on the ice cracks it just like a running step
  //
  if (justLanded && grounded && onLake) {
    quest.icePauseTime = 0
    advanceIceCrack(quest)
  }
  //
  // Distance-based cracking while running on the ice
  //
  let movedDist = 0
  if (grounded && onLake) {
    if (quest.iceRunLastX != null) movedDist = Math.abs(heroX - quest.iceRunLastX)
    quest.iceRunLastX = heroX
  } else {
    quest.iceRunLastX = null
  }
  if (movedDist > ICE_CRACK_MOVE_EPSILON) {
    quest.icePauseTime = 0
    quest.iceCrackAccum += movedDist
    if (quest.iceCrackAccum >= ICE_CRACK_DISTANCE_STEP) {
      quest.iceCrackAccum = 0
      advanceIceCrack(quest)
    }
    return
  }
  //
  // Hero paused (or left the lake): cracks gradually refreeze and vanish
  //
  quest.icePauseTime += dt
  if (quest.icePauseTime > ICE_CRACK_DECAY_DELAY && lake.crackProgress > 0) {
    lake.crackProgress = Math.max(0, lake.crackProgress - ICE_CRACK_DECAY_PER_SEC * dt)
    lake.crackProgress === 0 && (quest.iceCrackAccum = 0)
  }
}
//
// Adds one crack step with a creak sound; at full progress the ice melts
// into open water and the U letter rises from under the surface
//
function advanceIceCrack(quest) {
  const lake = quest.lakeState
  lake.crackProgress = Math.min(1, lake.crackProgress + 1 / ICE_CRACK_TOTAL_STEPS)
  quest.sound && playIceCreakSound(quest.sound, 1)
  if (lake.crackProgress < 1) return
  lake.melted = true
  quest.waterStillTimer = 0
  quest.waterRunLastX = null
  //
  // The U letter surfaces from under the water in the lake center
  //
  if (!quest.letterObjs.U) {
    const lakeCX = (quest.lakeBounds.minX + quest.lakeBounds.maxX) / 2
    quest.letterObjs.U = createPickupLetter(quest.k, 'U', lakeCX, FLOOR_Y + QUEST_LETTER_U_SINK, QUEST_LETTER_TILTS[2])
    animateLetterRise(quest.k, quest.letterObjs.U)
    playLetterAppearSound(quest)
  }
}
//
// After U is collected: the moment the hero leaves the lake band the water
// freezes back to ice (no splash sounds, ice slide resumes)
//
function freezeLakeIfHeroLeft(quest, heroX, heroY) {
  const onLake = Math.abs(heroY + HERO_FEET_OFFSET - FLOOR_Y) < QUEST_FLOOR_TOLERANCE
    && heroX >= quest.lakeBounds.minX && heroX <= quest.lakeBounds.maxX
  if (onLake) return
  freezeLakeSolid(quest)
}
//
// Resets the lake to solid ice and clears any U letter still floating there
//
function freezeLakeSolid(quest) {
  const lake = quest.lakeState
  if (!lake.melted && lake.crackProgress === 0) return
  lake.melted = false
  lake.crackProgress = 0
  quest.iceCrackAccum = 0
  quest.icePauseTime = 0
  quest.iceRunLastX = null
  quest.waterStillTimer = 0
  quest.waterRunLastX = null
  quest.waterStepLastX = null
  quest.waterStepAccum = 0
  quest.letterObjs.U?.destroy()
  quest.letterObjs.U = null
  quest.sound && playIceCreakSound(quest.sound, 1)
}
//
// Refreeze watch: while the lake is open water (U not collected yet), the
// hero must keep running on it. Standing still for LAKE_REFREEZE_DELAY
// turns the water back to solid ice and the cracking starts over.
//
function updateLakeRefreeze(quest, heroX, onWater, dt) {
  let moved = false
  if (onWater) {
    if (quest.waterRunLastX != null) {
      moved = Math.abs(heroX - quest.waterRunLastX) > ICE_CRACK_MOVE_EPSILON
    }
    quest.waterRunLastX = heroX
  } else {
    quest.waterRunLastX = null
  }
  if (moved) {
    quest.waterStillTimer = 0
    return
  }
  quest.waterStillTimer += dt
  if (quest.waterStillTimer < LAKE_REFREEZE_DELAY) return
  freezeLakeSolid(quest)
}
//
// Splashy water step sounds while the hero runs on the melted lake
// (same water sample as the touch L0 puddles); landings splash louder
//
function handleWaterRun(quest, heroX, heroY, grounded, justLanded) {
  const onWater = grounded
    && Math.abs(heroY + HERO_FEET_OFFSET - FLOOR_Y) < QUEST_FLOOR_TOLERANCE
    && heroX >= quest.lakeBounds.minX && heroX <= quest.lakeBounds.maxX
  if (!onWater) {
    quest.waterStepLastX = null
    return
  }
  justLanded && Sound.playWaterFootstepKaplay?.(quest.k, WATER_LAND_VOLUME)
  if (quest.waterStepLastX == null) {
    quest.waterStepLastX = heroX
    return
  }
  quest.waterStepAccum += Math.abs(heroX - quest.waterStepLastX)
  quest.waterStepLastX = heroX
  if (quest.waterStepAccum < WATER_STEP_DISTANCE) return
  quest.waterStepAccum = 0
  Sound.playWaterFootstepKaplay?.(quest.k, WATER_STEP_VOLUME)
}
//
// Snowman rubbing: every left/right pass across the snowman counts as one
// rub — the rub triggers on each side change inside the rub zone, so
// Counts a rub only when the hero crosses the snowman's vertical center.
// Entering the zone from one side is silent; the next center crossing
// plays friction audio and advances the counter. Gaps longer than
// RUB_RESET_GAP reset the streak. At 3 rubs a hint + countdown appear;
// at 10 the snowman collapses revealing C.
//
function handleSnowmanRubbing(quest, heroX, heroY, dt) {
  if (quest.snowmanState.collapsed) return
  //
  // Reset the streak when rubs are spaced too far apart
  //
  if (quest.rubCount > 0) {
    quest.rubGapTimer += dt
    if (quest.rubGapTimer > RUB_RESET_GAP) {
      quest.rubCount = 0
      quest.rubLastSide = null
      updateRubCounter(quest)
    }
  }
  const onGround = Math.abs(heroY + HERO_FEET_OFFSET - FLOOR_Y) < QUEST_FLOOR_TOLERANCE
  const dx = heroX - quest.snowmanWorldX
  if (!onGround || Math.abs(dx) >= RUB_ZONE_HALF_WIDTH) {
    //
    // Leaving the wide exit zone clears the side memory so re-entry rubs again
    //
    Math.abs(dx) > RUB_EXIT_HALF_WIDTH && (quest.rubLastSide = null)
    return
  }
  //
  // One rub only when the hero crosses the snowman's center line.
  // First observation of a side just remembers it — entry alone is silent.
  //
  const side = dx >= 0 ? 1 : -1
  if (quest.rubLastSide == null) {
    quest.rubLastSide = side
    return
  }
  if (quest.rubLastSide === side) return
  quest.rubLastSide = side
  quest.rubCount += 1
  quest.rubGapTimer = 0
  playRubSound(quest.sound)
  quest.rubCount === RUB_HINT_THRESHOLD && showSnowmanHint(quest)
  updateRubCounter(quest)
  quest.rubCount >= RUB_TARGET_COUNT && collapseSnowman(quest)
}
//
// Collapses the snowman into head + 2 body pieces and reveals the C letter
//
function collapseSnowman(quest) {
  quest.snowmanState.collapsed = true
  quest.snowmanState.collapseTime = 0
  updateRubCounter(quest)
  spawnSnowflakeBurst(quest.snowflakes, quest.snowmanWorldX, FLOOR_Y - 70, FIR_BURST_SNOWFLAKE_COUNT)
  quest.sound && playIceCreakSound(quest.sound, 1)
  quest.k.wait(SNOWMAN_C_APPEAR_DELAY, () => {
    const startX = quest.snowmanWorldX
    const startY = QUEST_LETTER_C_START_Y
    const cX = quest.snowmanWorldX + QUEST_LETTER_C_OFFSET_X
    const cY = FLOOR_Y + QUEST_LETTER_SNOW_SINK
    quest.letterObjs.C = createPickupLetter(quest.k, 'C', startX, startY, QUEST_LETTER_C_TILT)
    animateLetterFall(quest.k, quest.letterObjs.C, startX, startY, cX, cY)
    playLetterAppearSound(quest)
  })
}
//
// Forced tooltip above the snowman after the 3rd rub
//
function showSnowmanHint(quest) {
  const k = quest.k
  const target = {
    x: quest.snowmanWorldX,
    y: FLOOR_Y - 60,
    width: 0,
    height: 0,
    text: RUB_HINT_TEXT,
    offsetY: RUB_HINT_Y_OFFSET
  }
  const tip = Tooltip.create({ k, targets: [target], forceVisible: true })
  tip.activeTarget = target
  tip.frozenX = Math.round(quest.snowmanWorldX)
  tip.frozenY = FLOOR_Y - 60
  tip.opacity = 1
  k.wait(RUB_HINT_DISPLAY_TIME, () => Tooltip.destroy(tip))
}
//
// Creates the (initially empty) rub countdown text above the snowman
//
function createRubCounter(k, x, y) {
  const font = CFG.visual.fonts.thinFull.replace(/'/g, '')
  const shadow = k.add([
    k.text('', { size: RUB_COUNTER_FONT_SIZE, font }),
    k.pos(x + 2, y + 2),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.z(RUB_COUNTER_Z)
  ])
  const main = k.add([
    k.text('', { size: RUB_COUNTER_FONT_SIZE, font }),
    k.pos(x, y),
    k.anchor('center'),
    k.color(QUEST_LETTER_COLOR_R, QUEST_LETTER_COLOR_G, QUEST_LETTER_COLOR_B),
    k.z(RUB_COUNTER_Z + 1)
  ])
  return { shadow, main }
}
//
// Shows remaining rubs after the hint threshold; hides otherwise
//
function updateRubCounter(quest) {
  const show = quest.rubCount >= RUB_HINT_THRESHOLD && !quest.snowmanState.collapsed
  const text = show ? String(RUB_TARGET_COUNT - quest.rubCount) : ''
  quest.rubCounter.main.text = text
  quest.rubCounter.shadow.text = text
}
//
// Friction noise burst heard when the hero rubs past the snowman
//
function playRubSound(instance) {
  if (!instance?.audioContext) return
  const ctx = instance.audioContext
  const now = ctx.currentTime
  //
  // White noise through a falling bandpass — reads as a snowy rub/scrape
  //
  const bufferSize = ctx.sampleRate * RUB_SOUND_DURATION
  const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate)
  const noiseData = noiseBuffer.getChannelData(0)
  for (let i = 0; i < bufferSize; i++) {
    noiseData[i] = Math.random() * 2 - 1
  }
  const noiseSource = ctx.createBufferSource()
  noiseSource.buffer = noiseBuffer
  const filter = ctx.createBiquadFilter()
  filter.type = 'bandpass'
  filter.frequency.setValueAtTime(RUB_SOUND_FREQ_START, now)
  filter.frequency.linearRampToValueAtTime(RUB_SOUND_FREQ_END, now + RUB_SOUND_DURATION)
  filter.Q.value = 0.9
  const envelope = ctx.createGain()
  envelope.gain.setValueAtTime(0, now)
  envelope.gain.linearRampToValueAtTime(RUB_SOUND_PEAK, now + 0.02)
  envelope.gain.exponentialRampToValueAtTime(0.001, now + RUB_SOUND_DURATION)
  noiseSource.connect(filter)
  filter.connect(envelope)
  envelope.connect(ctx.destination)
  noiseSource.start(now)
  noiseSource.stop(now + RUB_SOUND_DURATION)
}
//
// Adds a burst of snowflakes that scatter outward, then drift down like
// the ambient snow while fading out
//
function spawnSnowflakeBurst(pool, x, y, count) {
  for (let i = 0; i < count; i++) {
    const angle = Math.random() * Math.PI * 2
    const speed = SNOWFLAKE_BURST_SPEED_MIN + Math.random() * SNOWFLAKE_BURST_SPEED_RANGE
    const life = SNOWFLAKE_LIFETIME_MIN + Math.random() * SNOWFLAKE_LIFETIME_RANGE
    pool.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed,
      drift: (Math.random() - 0.5) * 2 * SNOWFLAKE_DRIFT_SPEED,
      size: SNOWFLAKE_SIZE_MIN + Math.random() * SNOWFLAKE_SIZE_RANGE,
      life,
      maxLife: life
    })
  }
}
//
// Sheds snow along the full fir height so the burst reads as snow leaving
// the whole tree, not a single mid-point explosion.
//
function spawnSnowflakeBurstAlongFir(pool, firX, firHeight, count) {
  const topY = FLOOR_Y - firHeight
  const bottomY = FLOOR_Y - 8
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    const y = topY + (bottomY - topY) * t + (Math.random() - 0.5) * 10
    const x = firX + (Math.random() - 0.5) * 28
    const angle = Math.random() * Math.PI * 2
    const speed = SNOWFLAKE_BURST_SPEED_MIN + Math.random() * SNOWFLAKE_BURST_SPEED_RANGE
    const life = SNOWFLAKE_LIFETIME_MIN + Math.random() * SNOWFLAKE_LIFETIME_RANGE
    pool.push({
      x,
      y,
      vx: Math.cos(angle) * speed,
      vy: Math.sin(angle) * speed * 0.7 - 20,
      drift: (Math.random() - 0.5) * 2 * SNOWFLAKE_DRIFT_SPEED,
      size: SNOWFLAKE_SIZE_MIN + Math.random() * SNOWFLAKE_SIZE_RANGE,
      life,
      maxLife: life
    })
  }
}
//
// Ages burst snowflakes: initial scatter velocity damps toward a gentle
// snowfall (slow downward drift), particles fade and expire
//
function updateQuestSnowflakes(k, flakes) {
  const dt = k.dt()
  for (let i = flakes.length - 1; i >= 0; i--) {
    const p = flakes[i]
    p.life -= dt
    if (p.life <= 0) {
      flakes.splice(i, 1)
      continue
    }
    const damp = Math.max(0, 1 - SNOWFLAKE_BURST_DAMPING * dt)
    p.vx = p.vx * damp + p.drift * (1 - damp)
    p.vy = p.vy * damp + SNOWFLAKE_FALL_SPEED * (1 - damp)
    p.x += p.vx * dt
    p.y += p.vy * dt
  }
}
//
// Draws burst snowflakes as fading white dots
//
function drawQuestSnowflakes(k, flakes) {
  for (const p of flakes) {
    k.drawCircle({
      pos: k.vec2(p.x, p.y),
      radius: p.size,
      color: k.rgb(255, 255, 255),
      opacity: Math.min(1, p.life / p.maxLife) * 0.9
    })
  }
}
