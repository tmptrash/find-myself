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
import { goToMenuAfterAssets, goAfterPreparingAssets } from '../../../utils/level-assets.js'
import { loadTouchSprite } from '../../../utils/touch-sprite-registry.js'
import { drawRealisticBird } from '../utils/realistic-bird.js'
import * as OrganicParallax from '../utils/organic-parallax-tree.js'
import { createHangingSpider, spiderHoverTooltipTarget } from '../utils/hanging-spider.js'
import { toCanvas, getRGB } from '../../../utils/helper.js'
import * as LifeDeduction from '../utils/life-deduction.js'
import { drawThorns } from '../components/jungle-decor.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as Rain from '../components/rain.js'
import * as BonusHero from '../components/bonus-hero.js'
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
const FLOOR_THORN_DEATH_RELOAD_DELAY = 0.8
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
// Far circle crowns blend toward Touch L1 cloud grey (scrolling clouds base rgb).
//
const L0_CLOUD_CIRCLE_R = 36
const L0_CLOUD_CIRCLE_G = 37
const L0_CLOUD_CIRCLE_B = 36
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
// Leafy grey band — cooler mid-grey, clearly lighter than cloud-circle crowns (~36) and than scene fill (~42).
//
const L0_GREY_ORGANIC_TRUNK_R = 22
const L0_GREY_ORGANIC_TRUNK_G = 22
const L0_GREY_ORGANIC_TRUNK_B = 22
const L0_GREY_ORGANIC_LEAF_R = 24
const L0_GREY_ORGANIC_LEAF_G = 24
const L0_GREY_ORGANIC_LEAF_B = 24
const L0_GREY_ORGANIC_JITTER = 4
const L0_BLACK_LEAF_SILHOUETTE_DIM = 0.48
const L0_BLACK_ORGANIC_TRUNK_R = 11
const L0_BLACK_ORGANIC_TRUNK_G = 11
const L0_BLACK_ORGANIC_TRUNK_B = 15
const L0_BLACK_ORGANIC_LEAF_R = 15
const L0_BLACK_ORGANIC_LEAF_G = 15
const L0_BLACK_ORGANIC_LEAF_B = 20
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
// Floor hazards: rusted metal spikes / shattered rebar stubs jutting from damp soil (not magical blue blades)
//
const FLOOR_THORN_BLADE_FILL_R = 196
const FLOOR_THORN_BLADE_FILL_G = 38
const FLOOR_THORN_BLADE_FILL_B = 42
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
// Life trap (level-specific flags and threshold)
//
const LIFE_DEDUCT_THRESHOLD = 10
const LIFE_DEDUCT_FLAG = 'touch.trapAdded'
//
// Flat playfield fill (matches rain sheet); letterbox dimmer uses same RGB as visible backdrop.
//
const L0_PLAYFIELD_BG_R = 42
const L0_PLAYFIELD_BG_G = 42
const L0_PLAYFIELD_BG_B = 42
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
  { speaker: 0, text: "why did the bug cross\nthe screen?\nbetter latency" },
  { speaker: 1, text: "that's not a joke.\nthat's just commuting" },
  { speaker: 2, text: "I laughed.\ninternally.\nI'm subtle" },
  { speaker: 0, text: "hey.\nsee the small ones?\nscattered everywhere" },
  { speaker: 1, text: "they need someone\nto nudge them\ncloser together" },
  { speaker: 2, text: "push them into a pile.\nsomething good\nhappens when they meet" },
  { speaker: 0, text: "that's literally\nhow connection works.\ntry it" },
  { speaker: 1, text: "my therapist says\nI stack trauma\nlike pancakes" },
  { speaker: 0, text: "mine says\nstop borrowing trouble\nfrom tomorrow" },
  { speaker: 2, text: "tomorrow said\n'already booked'" },
  { speaker: 1, text: "I'm not lazy.\nI'm on standby" },
  { speaker: 0, text: "standing by\nis still standing.\ncount it" }
]
const MONSTERS_TALKED_KEY = 'touch.monstersTalked'
//
// TOUCH indicator tooltip
//
const TOUCH_INDICATOR_TOOLTIP_TEXT = "here you see how far you have\ncome in learning touch"
const TOUCH_INDICATOR_TOOLTIP_WIDTH = 250
const TOUCH_INDICATOR_TOOLTIP_HEIGHT = 50
const TOUCH_INDICATOR_TOOLTIP_Y_OFFSET = -30
//
const ANTIHERO_TOOLTIP_TEXT = "try to reach me"
const ANTIHERO_TOOLTIP_HOVER_WIDTH = 80
const ANTIHERO_TOOLTIP_HOVER_HEIGHT = 60
const ANTIHERO_TOOLTIP_Y_OFFSET = -60
//
// Hero tooltip (raised higher so it sits above bug tooltips)
//
const HERO_TOOLTIP_TEXT = "who am I?"
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
const SMALL_HERO_TOOLTIP_TEXT = "your points"
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
// Long-legged monster hover tooltip (shown only when not in conversation)
//
const MONSTER_HOVER_TOOLTIP_TEXT = "collect bugs together\nto reach the goal"
const MONSTER_HOVER_TOOLTIP_W = 70
const MONSTER_HOVER_TOOLTIP_H = 80
const MONSTER_HOVER_TOOLTIP_Y_OFFSET = -90
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
const DIRT_PARTICLE_COLOR_R = 95
const DIRT_PARTICLE_COLOR_G = 65
const DIRT_PARTICLE_COLOR_B = 40
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
    // Reset scores when entering from a different section.
    // Uses lastSection key (not lastLevel) so the check survives section-complete pre-routing.
    //
    if (get('lastSection', null) !== 'touch') {
      set('heroScore', 0)
      set('lifeScore', 0)
    }
    set('lastSection', 'touch')
    //
    // Save progress
    //
    set('lastLevel', 'level-touch.0')
    //
    // Set background to match wall color (prevents visible bars at top/bottom)
    //
    k.setBackground(k.rgb(31, 31, 31))
    //
    // Visible playfield fill is L0_PLAYFIELD_BG_*; canvas backing matches so letterboxing stays invisible.
    //
    k.canvas?.style.setProperty(
      'background-color',
      `rgb(${L0_PLAYFIELD_BG_R}, ${L0_PLAYFIELD_BG_G}, ${L0_PLAYFIELD_BG_B})`,
      'important'
    )
    k.onSceneLeave(() => {
      k.canvas?.style.removeProperty('background-color')
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
    const trapAlreadyAdded = get(LIFE_DEDUCT_FLAG, false)
    const showTrap = !trapAlreadyAdded && currentLifeScore >= LIFE_DEDUCT_THRESHOLD
    const trapCount = (showTrap || trapAlreadyAdded) ? 1 : 0
    levelIndicator.updateTrapCount(trapCount)
    //
    // Scene-level lock: hero controls are disabled during the life deduction animation
    //
    const sceneLock = { locked: showTrap }
    //
    // Show keyboard controls instructions (delayed if life deduction animation plays)
    //
    showInstructions(k, showTrap ? LifeDeduction.TOTAL_DURATION : 0)
    if (showTrap) {
      LifeDeduction.show({
        k,
        currentScore: currentLifeScore,
        levelIndicator,
        sound,
        deductFlag: LIFE_DEDUCT_FLAG,
        sceneLock,
        sceneBgRgb: { r: L0_PLAYFIELD_BG_R, g: L0_PLAYFIELD_BG_G, b: L0_PLAYFIELD_BG_B }
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
    k.add([
      k.z(L0_FLOOR_THORN_DRAW_Z),
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
      const grassBaseR = layerIndex === 3 ? 28 : 50 * colorMix + bgColor.r * (1 - colorMix)
      const grassBaseG = layerIndex === 3 ? 95 : 80 * colorMix + bgColor.g * (1 - colorMix)
      const grassBaseB = layerIndex === 3 ? 24 : 50 * colorMix + bgColor.b * (1 - colorMix)
      
      const bushBaseR = layerIndex === 3 ? 24 : 35 * colorMix + bgColor.r * (1 - colorMix)
      const bushBaseG = layerIndex === 3 ? 82 : 55 * colorMix + bgColor.g * (1 - colorMix)
      const bushBaseB = layerIndex === 3 ? 20 : 35 * colorMix + bgColor.b * (1 - colorMix)
      
      const treeLeafR = layerIndex === 3 ? 28 : 12 * colorMix + bgColor.r * (1 - colorMix)
      const treeLeafG = layerIndex === 3 ? 95 : 16 * colorMix + bgColor.g * (1 - colorMix)
      const treeLeafB = layerIndex === 3 ? 24 : 12 * colorMix + bgColor.b * (1 - colorMix)
      
      const treeTrunkR = layerIndex === 3 ? 78 : 10 * colorMix + bgColor.r * (1 - colorMix)
      const treeTrunkG = layerIndex === 3 ? 48 : 10 * colorMix + bgColor.g * (1 - colorMix)
      const treeTrunkB = layerIndex === 3 ? 20 : 10 * colorMix + bgColor.b * (1 - colorMix)
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
        // Front layer: 6-9 organic patches scattered along the platform.
        //
        const clusterCount = 6 + Math.floor(Math.random() * 4)
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
          const bladesInCluster = 4 + Math.floor(Math.random() * 8)
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
        const clusterCount = layerIndex === 0
          ? 22 + Math.floor(Math.random() * 12)
          : layerIndex === 1
            ? 13 + Math.floor(Math.random() * 9)
            : layerIndex === 2
              ? 11 + Math.floor(Math.random() * 7)
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
          const bladesInCluster = layerIndex === 0
            ? 5 + Math.floor(Math.random() * 14)
            : layerIndex === 1
              ? 4 + Math.floor(Math.random() * 11)
              : 4 + Math.floor(Math.random() * 9)
          if (Math.random() < 0.08) continue
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
              leafColor: k.rgb(120, 90, 40),
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
              leafColor: k.rgb(120, 90, 40),
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
    // Bake backgrounds: far circle crowns + strip, far grey organics on PNG overlays,
    // baked grey/black leaf mid bands, front bushes/static circles (hinged organics at runtime).
    //
    const createBlackBackBaseCanvas = () => {
      return toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
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
        // 2. Back layer base only (grey fill above + circle-crown trees; organic goes on a separate PNG sheet).
        //
        layers[0] && drawLayerToCanvas(ctx, layers[0], 0, { skipOrganic: true })
      })
    }
    
    const createBackOrganicOverlayCanvas = () => {
      return toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
        ctx.clearRect(0, 0, k.width(), k.height())
        layers[0] && drawLayerToCanvas(ctx, layers[0], 0, { organicOnly: true })
      })
    }
    
    const createGreyLeafMidCanvas = () => {
      return toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
        layers[1] && drawLayerToCanvas(ctx, layers[1], 0, { organicOnly: true })
      })
    }
    
    const createBlackLeafMidCanvas = () => {
      return toCanvas({ width: k.width(), height: k.height(), pixelRatio: 1 }, (ctx) => {
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
    
    const greyLeafMidDataURL = createGreyLeafMidCanvas()
    const blackBackBaseDataURL = createBlackBackBaseCanvas()
    const backOrganicOverlayDataURL = createBackOrganicOverlayCanvas()
    const blackLeafMidDataURL = createBlackLeafMidCanvas()
    const frontStaticDataURL = createFrontStaticCanvas()
    loadTouchSprite(k, 'bg-touch-l0-black-back', blackBackBaseDataURL)
    loadTouchSprite(k, 'bg-touch-l0-back-organic', backOrganicOverlayDataURL)
    loadTouchSprite(k, 'bg-touch-l0-grey-leaf-mid', greyLeafMidDataURL)
    loadTouchSprite(k, 'bg-touch-l0-black-leaf-mid', blackLeafMidDataURL)
    loadTouchSprite(k, 'bg-touch-l0-front-static', frontStaticDataURL)
    //
    // Far circles → far grey silhouettes → grey-leaf band → black-leaf band (birds sit above black-leaf z).
    //
    k.add([
      k.z(L0_PARALLAX_FAR_CIRCLE_Z),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-l0-black-back',
            pos: k.vec2(0, 0),
            anchor: "topleft"
          })
        }
      }
    ])
    k.add([
      k.z(L0_PARALLAX_FAR_ORGANIC_Z),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-l0-back-organic',
            pos: k.vec2(0, 0),
            anchor: "topleft"
          })
        }
      }
    ])
    k.add([
      k.z(L0_PARALLAX_GREY_LEAF_ROW_Z),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-l0-grey-leaf-mid',
            pos: k.vec2(0, 0),
            anchor: "topleft"
          })
        }
      }
    ])
    k.add([
      k.z(L0_PARALLAX_BLACK_LEAF_ROW_Z),
      {
        draw() {
          k.drawSprite({
            sprite: 'bg-touch-l0-black-leaf-mid',
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
        color: isTreeColor ? k.rgb(36, 37, 36) : k.rgb(5, 5, 5),
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
    
    k.add([
      k.z(L0_BIRD_LAYER_Z),
      {
        draw() {
          const time = k.time()
          const dt = k.dt()
          for (const bird of birds) {
            //
            // Position update + screen wrap
            //
            bird.x += bird.speed * dt
            if (bird.x > k.width() + 50) {
              bird.x = -50
              bird.baseY = TOP_MARGIN + Math.random() * SKY_HEIGHT
            }
            //
            // Sine wave flight path
            //
            bird.y = bird.baseY + Math.sin((time + bird.timeOffset) * bird.frequency + bird.phaseOffset) * bird.amplitude
            //
            // Flap/glide state machine
            //
            bird.flapTimer += dt
            const currentDuration = bird.isFlapping ? bird.flapDuration : bird.glideDuration
            if (bird.flapTimer > currentDuration) {
              bird.isFlapping = !bird.isFlapping
              bird.flapTimer = 0
            }
            //
            // Smoothly ease modeBlend toward the current state's target so
            // the wing transition into/out of gliding is gradual instead of
            // snapping at the end of the last flap cycle.
            //
            const targetBlend = bird.isFlapping ? 1 : 0
            const blendStep = dt / BIRD_FLAP_GLIDE_BLEND_TIME
            if (bird.modeBlend < targetBlend) {
              bird.modeBlend = Math.min(targetBlend, bird.modeBlend + blendStep)
            } else if (bird.modeBlend > targetBlend) {
              bird.modeBlend = Math.max(targetBlend, bird.modeBlend - blendStep)
            }
            //
            // Wing position: linear blend between sine flap and glide pose.
            // When modeBlend=0 the wing sits at the static glide pose; when
            // modeBlend=1 it follows the full sine; in-between it eases.
            //
            const flapWave = Math.sin((time + bird.timeOffset) * 8 + bird.phaseOffset)
            const wingFlap = BIRD_GLIDE_POSE + (flapWave - BIRD_GLIDE_POSE) * bird.modeBlend
            bird.wingPhase = wingFlap
            drawRealisticBird(k, bird, wingFlap)
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
            // Use squared distance to avoid sqrt on every blade every frame.
            //
            const dx = blade.x1 - heroX
            const dy = blade.y1 - heroY
            const distSq = dx * dx + dy * dy
            //
            // Add push effect if hero is close
            //
            let pushSway = 0
            if (distSq < HERO_RADIUS * HERO_RADIUS) {
              const distance = Math.sqrt(distSq)
              const pushStrength = (1 - distance / HERO_RADIUS)
              pushSway = (dx / (distance || 1)) * pushStrength * PUSH_FORCE
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
    const BIG_BUG_COLOR = "#1A1C1A"  // Black color for bug4 (anti-hero platform)
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
      //
      // Bump anti-hero z so it's drawn in front of dynamic trees (z=25)
      //
      antiHeroInst.character.z = ANTIHERO_PLATFORM_Z_INDEX
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
        const transitionDelay = speedBonusEarned ? 2.8 : 1.8
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
    const trapsEnabled = showTrap || trapAlreadyAdded
    trapsEnabled && createTrapSpikes(k, heroInst, levelIndicator, sound)
    //
    // Hidden bonus hero on the left side at antihero height
    // Only visible when hero approaches from above (jumping from a bug)
    //
    const BONUS_PLATFORM_X = LEFT_MARGIN + 140
    const BONUS_PLATFORM_Y = ANTIHERO_PLATFORM_Y + 10
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
      heroBodyColor,
      storageKey: 'touch.level0BonusCollected'
    })
    //
    // Push the bonus mini hero in front of front-line trees (dynamic trees z=25)
    // so the sparkly hint and revealed mini hero are not occluded by foliage.
    //
    if (bonusHeroInst?.miniHero?.character) {
      bonusHeroInst.miniHero.character.z = ANTIHERO_PLATFORM_Z_INDEX
    }
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
        //
        // Squared distance avoids sqrt on every bug every frame.
        //
        const distSq = dx * dx + dy * dy
        
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
        
        if (distSq < HERO_RADIUS * HERO_RADIUS) {
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
      if (heroInst.isAnnihilating) return
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
            // Use squared distance to avoid sqrt in hot path.
            //
            const dx = bug.x - pyramid.centerX
            const dy = bug.y - pyramid.centerY
            const distSq = dx * dx + dy * dy
            
            if (distSq <= 60 * 60) {  // JOIN_DETECTION_RADIUS
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
    const conversationState = startMonsterConversation(k, monsterBugs)
    //
    // Hover tooltips for long-legged monsters (only when not in conversation)
    //
    createMonsterHoverTooltips(k, monsterBugs, conversationState)
    //
    // Small bugs sometimes speak on their own (see SMALL_BUG_PHRASES).
    //
    startSmallBugPhrases(k, smallBugs)
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
    // Rain system: depth-layered drops with splashes on objects
    //
    const frontTrees = layers[3] ? layers[3].trees : []
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
    k.onUpdate(() => startRainWhenReady())
    //
    // Rocks first so puddle placement can avoid their footprints.
    //
    const rocks = createRocks(k, floorThornData)
    //
    // Puddles on the floor: small ellipses with occasional ripple
    //
    const l0Puddles = createPuddles(k, heroInst, sound, rocks, floorThornData)
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
    k.onUpdate(() => onUpdateThunder(k, thunderState, sound))
    //
    // Cricket/cicada ambient chirps at random intervals
    //
    const cricketState = { timer: CRICKET_INTERVAL_MIN + Math.random() * (CRICKET_INTERVAL_MAX - CRICKET_INTERVAL_MIN) }
    k.onUpdate(() => {
      cricketState.timer -= k.dt()
      if (cricketState.timer <= 0) {
        Sound.playCricketSound(sound)
        cricketState.timer = CRICKET_INTERVAL_MIN + Math.random() * (CRICKET_INTERVAL_MAX - CRICKET_INTERVAL_MIN)
      }
    })
    //
    // Frog croaks at random intervals
    //
    const frogState = { timer: FROG_INTERVAL_MIN + Math.random() * (FROG_INTERVAL_MAX - FROG_INTERVAL_MIN) }
    k.onUpdate(() => {
      frogState.timer -= k.dt()
      if (frogState.timer <= 0) {
        Sound.playFrogSound(sound)
        frogState.timer = FROG_INTERVAL_MIN + Math.random() * (FROG_INTERVAL_MAX - FROG_INTERVAL_MIN)
      }
    })
    //
    // Owl/bird ambient hoots at random intervals (5-10s)
    //
    const owlState = { timer: OWL_INTERVAL_MIN + Math.random() * (OWL_INTERVAL_MAX - OWL_INTERVAL_MIN) }
    k.onUpdate(() => {
      owlState.timer -= k.dt()
      if (owlState.timer <= 0) {
        //
        // Mix between owl hoots and lighter bird chirps for variety
        //
        Math.random() < 0.6 ? Sound.playOwlSound(sound) : Sound.playBirdChirpSound(sound)
        owlState.timer = OWL_INTERVAL_MIN + Math.random() * (OWL_INTERVAL_MAX - OWL_INTERVAL_MIN)
      }
    })
    //
    // Fireflies: small glowing dots drifting over the swamp
    //
    createL0Fireflies(k)
    //
    // Small mushrooms on the ground
    //
    const l0Mushrooms = createMushrooms(k, l0Puddles)
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
    // Moss patches: clustered near rocks plus standalone clumps for realism
    //
    createMoss(k, rocks)
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
    //
    // Return to menu on ESC
    //
    k.onKeyPress("escape", () => {
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
function checkFloorThorns(k, heroInst, floorThornData, levelIndicator) {
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
  for (const thorn of floorThornData) {
    const collisionTipY = thorn.baseY - thorn.height + FLOOR_THORN_COLLISION_TIP_BIAS_DOWN
    if (heroFeetY < collisionTipY + FLOOR_THORN_FEET_MIN_PENETRATION_PAST_TIP ||
        heroFeetY > thorn.baseY + FLOOR_THORN_FEET_BELOW_BASE_PAD) {
      continue
    }
    //
    // Hero half-width + thorn half-width for proper AABB overlap
    //
    if (Math.abs(heroX - thorn.x) < thorn.width / 2 + HERO_HALF_WIDTH_THORNS) {
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
    k.wait(FLOOR_THORN_DEATH_RELOAD_DELAY, () => goAfterPreparingAssets(k, 'level-touch.0'))
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
  // Kill hero if feet overlap any risen spike
  //
  if (inst.progress > 0.3) {
    const onFloor = heroFeetY >= FLOOR_Y - FLOOR_THORN_FEET_TOLERANCE_LOW &&
                    heroFeetY <= FLOOR_Y + FLOOR_THORN_FEET_TOLERANCE_HIGH
    if (onFloor) {
      for (const spike of inst.spikes) {
        const visibleHeight = spike.height * inst.progress
        const collisionTipY = spike.baseY - visibleHeight + FLOOR_THORN_COLLISION_TIP_BIAS_DOWN
        if (heroFeetY < collisionTipY + FLOOR_THORN_FEET_MIN_PENETRATION_PAST_TIP ||
            heroFeetY > spike.baseY + FLOOR_THORN_FEET_BELOW_BASE_PAD) {
          continue
        }
        if (Math.abs(heroX - spike.x) < TRAP_SPIKE_WIDTH_BASE + HERO_HALF_WIDTH_THORNS) {
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
  if (get(MONSTERS_TALKED_KEY)) return { phase: 'done' }
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
          set(MONSTERS_TALKED_KEY, true)
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
  //
  // Return state so callers can check inst.phase to know if conversation is active
  //
  return inst
}

/**
 * Creates hover tooltips for the three long-legged monsters.
 * The tooltip only appears when the conversation is not currently displaying a line.
 * @param {Object} k - Kaplay instance
 * @param {Array<Object>} monsterBugs - Array of [bug0, bug1, bug2] instances
 * @param {Object|undefined} conversationState - Conversation inst (may be undefined)
 */
function createMonsterHoverTooltips(k, monsterBugs, conversationState) {
  const targets = monsterBugs.map(bug => ({
    x: () => bug.x,
    y: () => bug.y,
    width: MONSTER_HOVER_TOOLTIP_W,
    height: MONSTER_HOVER_TOOLTIP_H,
    text: MONSTER_HOVER_TOOLTIP_TEXT,
    offsetY: MONSTER_HOVER_TOOLTIP_Y_OFFSET,
    //
    // Hide during the entire active conversation (showing and pause phases)
    //
    visible: () => !conversationState || conversationState.phase === 'done' || conversationState.phase === 'delay'
  }))
  Tooltip.create({ k, targets })
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
const L0_FIREFLY_RADIUS_MIN = 1.5
const L0_FIREFLY_RADIUS_MAX = 2.5
const L0_FIREFLY_GLOW_SPEED_MIN = 0.6
const L0_FIREFLY_GLOW_SPEED_MAX = 2.0
const L0_FIREFLY_COLOR_R = 180
const L0_FIREFLY_COLOR_G = 230
const L0_FIREFLY_COLOR_B = 120
//
// Small mushrooms on the ground
//
const MUSHROOM_COUNT = 7
const MUSHROOM_PUDDLE_CLEARANCE = 26
const MUSHROOM_FUNNY_TOOLTIP_CHANCE = 0.38
const L0_SPIDER_TOOLTIP_TEXT = "psst.\nnudge those little bugs\ncloser to each other"
const MUSHROOM_FUNNY_LINES = [
  'talk spore to me',
  'pay rent in compost',
  'this is not a power-up',
  '404 fungus not found',
  'slightly psychic, mostly chill'
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
const L0_ROCK_Z_BEHIND_COLORFUL_ROW = 6
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
// Moss patches on the bottom platform: small green clumps
//
const MOSS_PATCH_COUNT = 28
const MOSS_PATCH_RADIUS_MIN = 8
const MOSS_PATCH_RADIUS_MAX = 22
const MOSS_DOT_COUNT_MIN = 6
const MOSS_DOT_COUNT_MAX = 14
const MOSS_BASE_R = 50
const MOSS_BASE_G = 90
const MOSS_BASE_B = 35
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
const PUDDLE_COLOR_R = 8
const PUDDLE_COLOR_G = 132
const PUDDLE_COLOR_B = 255
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
  k.onUpdate(() => {
    onUpdatePuddles(k, puddles)
    onUpdatePuddleSplashes(k, splashParticles)
    checkHeroPuddleCollision(k, heroInst, puddles, splashParticles, groundState)
  })
  return puddles
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
  heroInst.dustColor = inAnyPuddle ? '#0896FF' : null
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
  const fireflyMinY = FLOOR_Y - 150
  const fireflyMaxY = FLOOR_Y - 20
  for (let i = 0; i < L0_FIREFLY_COUNT; i++) {
    //
    // Distribute starting positions evenly across the width
    //
    fireflies.push({
      x: LEFT_MARGIN + (i / L0_FIREFLY_COUNT) * playableW + Math.random() * (playableW / L0_FIREFLY_COUNT),
      y: fireflyMinY + Math.random() * (fireflyMaxY - fireflyMinY),
      radius: L0_FIREFLY_RADIUS_MIN + Math.random() * (L0_FIREFLY_RADIUS_MAX - L0_FIREFLY_RADIUS_MIN),
      glowSpeed: L0_FIREFLY_GLOW_SPEED_MIN + Math.random() * (L0_FIREFLY_GLOW_SPEED_MAX - L0_FIREFLY_GLOW_SPEED_MIN),
      phase: Math.random() * Math.PI * 2,
      speed: L0_FIREFLY_MIN_SPEED + Math.random() * (L0_FIREFLY_MAX_SPEED - L0_FIREFLY_MIN_SPEED),
      driftVx: (Math.random() - 0.5) * 12
    })
  }
  k.add([
    k.z(24),
    {
      draw() {
        drawL0Fireflies(k, fireflies)
      }
    }
  ])
  k.onUpdate(() => onUpdateL0Fireflies(k, fireflies))
}
//
// Per-frame firefly drift: gentle sine-wave wander
//
function onUpdateL0Fireflies(k, fireflies) {
  const dt = k.dt()
  const t = k.time()
  const minX = LEFT_MARGIN + 10
  const maxX = CFG.visual.screen.width - RIGHT_MARGIN - 10
  const minY = FLOOR_Y - 150
  const maxY = FLOOR_Y - 20
  for (const f of fireflies) {
    //
    // Horizontal drift + sine wobble for natural wandering across the screen
    //
    f.x += f.driftVx * dt + Math.sin(t * f.glowSpeed + f.phase) * f.speed * 0.3 * dt
    f.y += Math.cos(t * f.glowSpeed * 0.7 + f.phase) * f.speed * 0.6 * dt
    //
    // Wrap around when reaching screen edges
    //
    if (f.x < minX) f.x = maxX
    if (f.x > maxX) f.x = minX
    if (f.y < minY) f.y = minY
    if (f.y > maxY) f.y = maxY
  }
}
//
// Draw firefly glow dots
//
function drawL0Fireflies(k, fireflies) {
  const t = k.time()
  for (const f of fireflies) {
    const glow = (Math.sin(t * f.glowSpeed + f.phase) + 1) / 2
    const alpha = 0.15 + glow * 0.7
    k.drawCircle({
      pos: k.vec2(f.x, f.y),
      radius: f.radius * 3,
      color: k.rgb(L0_FIREFLY_COLOR_R, L0_FIREFLY_COLOR_G, L0_FIREFLY_COLOR_B),
      opacity: alpha * 0.15
    })
    k.drawCircle({
      pos: k.vec2(f.x, f.y),
      radius: f.radius,
      color: k.rgb(L0_FIREFLY_COLOR_R, L0_FIREFLY_COLOR_G, L0_FIREFLY_COLOR_B),
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
  // Possible mushroom cap hues (earth tones, reds, browns, yellows)
  //
  const capColors = [
    [140, 60, 30], [180, 80, 40], [200, 50, 50],
    [160, 130, 60], [100, 80, 50], [180, 40, 60]
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
    const dataUrl = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      const cx = totalW / 2
      const stemTop = totalH - stemH - 2
      //
      // Outline stroke shared by stem and cap
      //
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.82)'
      ctx.lineWidth = 1.5
      ctx.lineJoin = 'round'
      //
      // Stem: slightly tapered rectangle with black outline
      //
      ctx.fillStyle = `rgb(${Math.min(255, color[0] + 40)}, ${Math.min(255, color[1] + 50)}, ${Math.min(255, color[2] + 30)})`
      ctx.beginPath()
      ctx.moveTo(cx - stemW / 2, totalH - 2)
      ctx.lineTo(cx - stemW * 0.4, stemTop)
      ctx.lineTo(cx + stemW * 0.4, stemTop)
      ctx.lineTo(cx + stemW / 2, totalH - 2)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      //
      // Cap: half-ellipse with black outline
      //
      ctx.fillStyle = `rgb(${color[0]}, ${color[1]}, ${color[2]})`
      ctx.beginPath()
      ctx.ellipse(cx, stemTop, capW / 2, capH, 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      ctx.stroke()
      //
      // Cap highlight: lighter arc near the top
      //
      ctx.fillStyle = `rgba(255, 255, 255, 0.15)`
      ctx.beginPath()
      ctx.ellipse(cx - capW * 0.1, stemTop - capH * 0.3, capW * 0.25, capH * 0.3, 0, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      //
      // Small dots on cap for texture
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
  const height = (10 + Math.random() * 20) * scale
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
function addGrassAroundRocks(k, rocks, allBlades, grassY) {
  //
  // Front-layer color palette to match the rest of the front grass
  //
  const grassBaseR = 60
  const grassBaseG = 85
  const grassBaseB = 40
  for (const rock of rocks) {
    const blades = 3 + Math.floor(Math.random() * 5)
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
  rocks.forEach(r => loadTouchSprite(k, r.spriteName, r.dataUrl))
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
  // Build irregular rock outline with more vertices (14-22) and per-vertex
  // angular jitter so the silhouette is smoother but still asymmetric. The
  // bottom half is wider to suggest weight resting on the ground.
  //
  const vertCount = 14 + Math.floor(Math.random() * 9)
  const verts = []
  for (let v = 0; v < vertCount; v++) {
    const t = v / vertCount
    const a = t * Math.PI * 2 + (Math.random() - 0.5) * 0.18
    //
    // Bottom-half radius bonus: pushes ground-touching points outward
    //
    const heavySide = Math.sin(a) > 0 ? 1.05 : 0.92
    const r = radius * (0.82 + Math.random() * 0.28) * heavySide
    verts.push({ x: Math.cos(a) * r, y: Math.sin(a) * r * 0.62 })
  }
  //
  // Slight per-rock color jitter for variety
  //
  const tint = -8 + Math.floor(Math.random() * 24)
  const fillR = Math.max(0, Math.min(255, ROCK_BASE_R + tint))
  const fillG = Math.max(0, Math.min(255, ROCK_BASE_G + tint))
  const fillB = Math.max(0, Math.min(255, ROCK_BASE_B + tint + 4))
  //
  // Slightly lighter shade for the top facets and darker for the bottom
  //
  const lightR = Math.max(0, Math.min(255, fillR + 32))
  const lightG = Math.max(0, Math.min(255, fillG + 32))
  const lightB = Math.max(0, Math.min(255, fillB + 32))
  const darkR = Math.max(0, Math.min(255, fillR - 28))
  const darkG = Math.max(0, Math.min(255, fillG - 28))
  const darkB = Math.max(0, Math.min(255, fillB - 28))
  //
  // Sprite canvas: room for outline shadow halo plus padding
  //
  const totalW = Math.ceil(radius * 2.6)
  const totalH = Math.ceil(radius * 1.9)
  const cx = totalW / 2
  const cy = totalH * 0.56
  //
  // Compute posY first so we can crop the sprite canvas to the above-ground portion.
  // Anything below FLOOR_Y is clipped by reducing the canvas height.
  //
  const randSink = Math.random() * 5
  const posY = FLOOR_Y - totalH * 0.62 + randSink
  const croppedH = Math.max(8, Math.ceil(totalH * 0.62 - randSink))
  //
  // Helper to trace the rock outline as a smooth quadratic path
  //
  const traceOutline = (ctx) => {
    ctx.beginPath()
    const v0 = verts[0]
    ctx.moveTo(cx + v0.x, cy + v0.y)
    for (let v = 0; v < verts.length; v++) {
      const cur = verts[v]
      const next = verts[(v + 1) % verts.length]
      const midX = cx + (cur.x + next.x) / 2
      const midY = cy + (cur.y + next.y) / 2
      ctx.quadraticCurveTo(cx + cur.x, cy + cur.y, midX, midY)
    }
    ctx.closePath()
  }
  const dataUrl = toCanvas({ width: totalW, height: croppedH, pixelRatio: 1 }, (ctx) => {
    //
    // Soft drop shadow underneath the rock
    //
    ctx.fillStyle = 'rgba(0, 0, 0, 0.28)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + radius * 0.42, radius * 1.0, radius * 0.18, 0, 0, Math.PI * 2)
    ctx.closePath()
    ctx.fill()
    //
    // Vertical fill gradient: lighter on top, darker at bottom — gives
    // immediate volume cue and reads as a 3D rounded shape.
    //
    const grad = ctx.createLinearGradient(0, cy - radius * 0.7, 0, cy + radius * 0.7)
    grad.addColorStop(0, `rgb(${lightR}, ${lightG}, ${lightB})`)
    grad.addColorStop(0.55, `rgb(${fillR}, ${fillG}, ${fillB})`)
    grad.addColorStop(1, `rgb(${darkR}, ${darkG}, ${darkB})`)
    ctx.fillStyle = grad
    traceOutline(ctx)
    ctx.fill()
    //
    // Mottled texture: scatter a handful of subtle darker / lighter blotches
    // inside the silhouette so the surface doesn't look flat.
    //
    ctx.save()
    traceOutline(ctx)
    ctx.clip()
    const blotchCount = 6 + Math.floor(Math.random() * 6)
    for (let b = 0; b < blotchCount; b++) {
      const bx = cx + (Math.random() - 0.5) * radius * 1.4
      const by = cy + (Math.random() - 0.5) * radius * 0.9
      const br = radius * (0.08 + Math.random() * 0.18)
      const lighter = Math.random() < 0.5
      const a = 0.06 + Math.random() * 0.08
      ctx.fillStyle = lighter
        ? `rgba(255, 255, 255, ${a})`
        : `rgba(0, 0, 0, ${a + 0.02})`
      ctx.beginPath()
      ctx.ellipse(bx, by, br, br * (0.6 + Math.random() * 0.4), Math.random() * Math.PI, 0, Math.PI * 2)
      ctx.fill()
    }
    //
    // A couple of subtle crack lines for stone texture
    //
    const crackCount = 1 + Math.floor(Math.random() * 3)
    for (let c = 0; c < crackCount; c++) {
      const startA = Math.random() * Math.PI * 2
      const startR = radius * (0.1 + Math.random() * 0.5)
      let cxp = cx + Math.cos(startA) * startR
      let cyp = cy + Math.sin(startA) * startR * 0.5
      ctx.strokeStyle = `rgba(0, 0, 0, ${0.18 + Math.random() * 0.18})`
      ctx.lineWidth = 0.8 + Math.random() * 0.7
      ctx.beginPath()
      ctx.moveTo(cxp, cyp)
      const segs = 2 + Math.floor(Math.random() * 3)
      let ang = Math.random() * Math.PI * 2
      for (let s = 0; s < segs; s++) {
        ang += (Math.random() - 0.5) * 1.2
        cxp += Math.cos(ang) * radius * (0.18 + Math.random() * 0.18)
        cyp += Math.sin(ang) * radius * 0.12
        ctx.lineTo(cxp, cyp)
      }
      ctx.stroke()
    }
    ctx.restore()
    //
    // Top-left highlight (key light) for sheen
    //
    ctx.fillStyle = 'rgba(255, 255, 255, 0.12)'
    ctx.beginPath()
    ctx.ellipse(cx - radius * 0.32, cy - radius * 0.28, radius * 0.55, radius * 0.18, -0.45, 0, Math.PI * 2)
    ctx.fill()
    //
    // Bottom rim contact shadow (where the rock meets the ground)
    //
    ctx.fillStyle = 'rgba(0, 0, 0, 0.22)'
    ctx.beginPath()
    ctx.ellipse(cx, cy + radius * 0.34, radius * 0.78, radius * 0.18, 0, 0, Math.PI)
    ctx.fill()
    //
    // Outline for clean definition against the soil
    //
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.55)'
    ctx.lineWidth = 1.4
    traceOutline(ctx)
    ctx.stroke()
  })
  return { spriteName, dataUrl, x: posX, y: posY, totalW, totalH: croppedH, radius, worldX: posX + cx - totalW / 2, worldY: posY + cy }
}
/**
 * Generates moss patches on the bottom platform. Some patches are placed near
 * rocks (clinging to the rock base) and others are scattered standalone for
 * realism. Each patch is several small green dots clustered together.
 *
 * @param {Object} k - Kaplay instance
 * @param {Array} rocks - Rocks returned from createRocks (used as anchors)
 */
function createMoss(k, rocks) {
  const playableW = CFG.visual.screen.width - LEFT_MARGIN - RIGHT_MARGIN
  const patches = []
  for (let i = 0; i < MOSS_PATCH_COUNT; i++) {
    const patchRadius = MOSS_PATCH_RADIUS_MIN + Math.random() * (MOSS_PATCH_RADIUS_MAX - MOSS_PATCH_RADIUS_MIN)
    //
    // 60% of patches are anchored next to a rock, 40% are standalone
    //
    let cx, cy
    if (rocks.length > 0 && Math.random() < 0.6) {
      const rock = rocks[Math.floor(Math.random() * rocks.length)]
      const offsetAngle = Math.PI + (Math.random() - 0.5) * Math.PI * 0.9
      const dist = rock.radius * (0.7 + Math.random() * 0.4)
      cx = rock.worldX + Math.cos(offsetAngle) * dist
      cy = rock.worldY + Math.abs(Math.sin(offsetAngle)) * dist * 0.4
    } else {
      let candidateX = LEFT_MARGIN + 40 + Math.random() * (playableW - 80)
      let safety = 0
      while (Math.abs(candidateX - HERO_SPAWN_X) < HERO_SPAWN_GRASS_THORN_EXCLUDE_HALF_WIDTH && safety < 20) {
        candidateX = LEFT_MARGIN + 40 + Math.random() * (playableW - 80)
        safety++
      }
      cx = candidateX
      cy = FLOOR_Y + Math.random() * 12
    }
    //
    // Build a cluster of small moss dots
    //
    const dotCount = MOSS_DOT_COUNT_MIN + Math.floor(Math.random() * (MOSS_DOT_COUNT_MAX - MOSS_DOT_COUNT_MIN))
    const dots = []
    for (let d = 0; d < dotCount; d++) {
      const angle = Math.random() * Math.PI * 2
      const dist = Math.random() * patchRadius
      const dr = Math.max(0, Math.min(255, MOSS_BASE_R + Math.floor((Math.random() - 0.5) * 30)))
      const dg = Math.max(0, Math.min(255, MOSS_BASE_G + Math.floor((Math.random() - 0.5) * 35)))
      const db = Math.max(0, Math.min(255, MOSS_BASE_B + Math.floor((Math.random() - 0.5) * 25)))
      dots.push({
        offsetX: Math.cos(angle) * dist,
        offsetY: Math.sin(angle) * dist * 0.5,
        radius: 1.6 + Math.random() * 2.2,
        color: k.rgb(dr, dg, db),
        opacity: 0.6 + Math.random() * 0.35
      })
    }
    patches.push({ x: cx, y: cy, dots })
  }
  k.add([
    k.z(7.5),
    {
      draw() {
        for (const p of patches) {
          for (const dot of p.dots) {
            k.drawCircle({
              pos: k.vec2(p.x + dot.offsetX, p.y + dot.offsetY),
              radius: dot.radius,
              color: dot.color,
              opacity: dot.opacity
            })
          }
        }
      }
    }
  ])
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
const L0_TREE_ROOT_COLOR_R = 48
const L0_TREE_ROOT_COLOR_G = 58
const L0_TREE_ROOT_COLOR_B = 42
//
// Organic generator depth clamp (L0 draws trunk-only organic silhouettes; no underground roots).
//
const L0_ORGANIC_ROOT_DEPTH_MAX = 123
