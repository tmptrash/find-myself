import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get, setSectionCompleted } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { initTouchInput } from '../../../utils/touch-input.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as LevelIndicator from '../../touch/components/lesson-indicator.js'
import * as LevelHelp from '../../../utils/lesson-help.js'
import { buildRockVertices, drawRockToCanvas } from '../../../utils/draw-rock.js'
import { drawMushroomToCanvas } from '../../../utils/draw-mushroom.js'
import { toCanvas, getRGB } from '../../../utils/helper.js'
import {
  buildGlowTree,
  renderGlowTreeToCanvas,
  renderGlowTreeIntoContext,
  TREE_SEED
} from '../utils/glow-tree.js'
import {
  GLOW_PAL,
  glowRgb,
  getTreePaletteGray,
  getTreePaletteLit,
  getTreePaletteColor,
  buildDimmedTreePalette
} from '../utils/glow-palette.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import * as HeroHint from '../../../utils/hero-hint.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as HeroCounter from '../../../utils/hero-counter.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { generateLogDetail, drawLogPlatform } from '../../touch/utils/log-platform.js'
//
// Palette-derived tones — every colour comes from CFG.visual.colors.palette.
//
const VOID = glowRgb('void')
const OUTER = glowRgb('playfieldOuter')
const INNER_GRAY = glowRgb('playfieldGray')
const MID_GRAY = glowRgb('midGray')
const LIGHT_GRAY = glowRgb('lightGray')
const DECOR_GRAY = glowRgb('decorGray')
const GRASS_GREEN = glowRgb('grassGreen')
const WATER_COLOR = glowRgb('water')
const SUN_CORE = glowRgb('sunCore')
const SUN_BRIGHT = glowRgb('sunBright')
const GLOW_GOLD_HEX = GLOW_PAL.gold
const DIALOG_FILL = glowRgb('dialogFill')
//
// Colour-world backdrop split: sky above the ground line, dark earth below.
//
const SKY_COLOR = glowRgb('sky')
const GROUND_DARK = glowRgb('groundDark')
//
// Dark rim tone for gray decor (rocks, trampoline) in the colour world.
//
const DECOR_OUTLINE_RGB = glowRgb('decorOutline')
const MUSHROOM_CAP_COLORS = GLOW_PAL.mushrooms.map(hex => {
  const c = glowRgb(hex)
  return [c.r, c.g, c.b]
})
//
// Dark counterpart of each cap colour — mushroom outlines in the colour world.
//
const MUSHROOM_CAP_DARK_COLORS = GLOW_PAL.mushroomsDark.map(hex => {
  const c = glowRgb(hex)
  return [c.r, c.g, c.b]
})
//
// Layout.
//
const TOP_MARGIN = 110
const LEFT_MARGIN = 100
const RIGHT_MARGIN = 100
const FLOOR_PHYS_H = 20
const SCREEN_W = CFG.visual.screen.width
const SCREEN_H = CFG.visual.screen.height
const FLOOR_Y = 680
//
// Playfield bottom = bottom of the side wall strips (screen bottom), so the
// tree roots and the root zone are fully inside the rounded playfield.
//
const PLAYFIELD_BOTTOM_Y = SCREEN_H
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'glow0-corner-sprite'
const PLATFORM_HIDE_Y = 9999
//
// Tree.
//
const TREE_X = Math.round(SCREEN_W * 0.5)
const TREE_TRUNK_BOTTOM_Y = FLOOR_Y
const TREE_ROOT_START_Y = FLOOR_Y
const TREE_BOTTOM_Y = TREE_TRUNK_BOTTOM_Y
const TREE_TOP_Y = 30
const ROOT_MAX_Y = 1030
const TREE_SPRITE_NAME = 'glow0-tree-sprite'
const TREE_LIT_SPRITE_NAME = 'glow0-tree-lit-sprite'
const TRUNK_EXCLUDE_HALF = 50
//
// Sun — value 4 mid-distance decoration; trees near it are kept shorter.
//
const SUN_X = SCREEN_W - RIGHT_MARGIN - 100
const SUN_Y = TOP_MARGIN + 80
const SUN_RADIUS = 44
const SUN_HALO_EXTRA = 14
const SUN_HALO_SPRITE = 'glow0-sun-halo'
//
// Keep-clear zone around the sun: parallax trees in this X band are capped so
// their whole canopy (which reaches above the trunk apex) ends below the sun.
//
const SUN_ZONE_X = SUN_X - SUN_RADIUS - 110
const SUN_CANOPY_CLEARANCE = 130
const SUN_MAX_TOP_Y = SUN_Y + SUN_RADIUS + SUN_CANOPY_CLEARANCE
//
// Parallax sprites — two background planes of big trees (gray + colour).
//
const PAR_NEAR_SPRITE = 'glow0-par-near'
const PAR_NEAR_COLOR_SPRITE = 'glow0-par-near-color'
const PAR_FAR_SPRITE = 'glow0-par-far'
const PAR_FAR_COLOR_SPRITE = 'glow0-par-far-color'
const TREE_COLOR_SPRITE_NAME = 'glow0-tree-color-sprite'
//
// Horizontal branch platform.
//
const HORIZ_PLATFORM_H = 10
const HERO_SPAWN_OFFSET_ABOVE_BRANCH = 80
const HERO_BRANCH_FRACTION = 0.20
//
// Respawn point at the lower-right ground — used after a death once the
// hero has discovered the lower-right part of the level himself.
//
const GROUND_SPAWN_X = SCREEN_W - RIGHT_MARGIN - 180
const LOG_W = 110
const LOG_H = 28
//
// The wooden log collision box sits slightly lower than the sprite so the
// hero visually stands ON the wood instead of hovering above it.
//
const LOG_COLLISION_DROP_Y = 2
const RIGHT_PLAT_OFFSET_X = 100
const W_PLAT_X_BASE = LEFT_MARGIN + 140 + LOG_W + 70
const W_PLAT_Y_BELOW = 90
//
// O platform sits half a log length further right than its original spot.
//
const O_PLAT_OFFSET_X = 210 + LOG_W / 2
const O_PLAT_OFFSET_Y = 105
//
// The O letter floats 5 px higher above its log than the default placement.
//
const O_LETTER_RAISE_Y = 5
//
// The L letter floats 6 px higher above its log than the default placement.
//
const L_LETTER_RAISE_Y = 6
const BONUS_PLAT_OFFSET_X = 100
//
// Hidden bonus platform sits noticeably lower so it is reachable by jump.
//
const BONUS_PLAT_OFFSET_Y = 40
const BONUS_PLAT_W = 90
//
// Background forest — ONE plane of big trees baked and drawn fully OPAQUE.
// Depth comes from colour only: the tones are pre-blended toward the backdrop
// (gray mode → playfield gray, colour mode → sky) before baking, so the
// forest reads dimmer without any draw transparency.
//
const PAR_L1_BG_BLEND = 0.62
//
// Second (far) plane behind the near one — dimmer still, foliage collapsed
// to a single tone.
//
const PAR_L2_BG_BLEND = 0.87
//
// Far-plane foliage is pushed slightly toward the darkest swatch so the
// leaves stay readable against the backdrop after L (never fully vanish).
//
const PAR_FAR_LEAF_DARKEN = 0.1
//
// Big trees sink slightly below the ground line (and get clipped at it), so
// the wobbly trunk base never leaves a gap above the ground — and never
// pokes below it either.
//
const PAR_BIG_GROUND_SINK = 8
const PAR_TRUNK_BOTTOM_Y = FLOOR_Y + PAR_BIG_GROUND_SINK
//
// The plane holds a handful of BIG trees built with the same glow-tree
// generator as the main tree (wider trunks, no roots, no hero branch), all
// baked onto one shared full-screen canvas per mode, drawn behind the main tree.
//
const PAR_BIG_TREE_COUNT = 5
const PAR_BIG_SEED_BASE = 40000
const PAR_FAR_TREE_COUNT = 6
const PAR_FAR_SEED_BASE = 50000
const PAR_BIG_SEED_STEP = 101
const PAR_BIG_TOP_MIN_Y = TREE_TOP_Y - 20
const PAR_BIG_TOP_RANGE = 130
const PAR_FAR_TOP_MIN_Y = TREE_TOP_Y - 40
const PAR_FAR_TOP_RANGE = 160
const PAR_BIG_WIDTH_SCALE_MIN = 1.1
const PAR_BIG_WIDTH_SCALE_RANGE = 0.3
//
// Centre clearing: no background trees at all within one sixth of the game
// zone on each side of the main tree; beyond the band they grow at full
// height with no restriction.
//
const PAR_CENTER_CLEAR_HALF = Math.round((SCREEN_W - LEFT_MARGIN - RIGHT_MARGIN) / 6)
//
// Forest fade-in duration (s) after the L letter reveals the parallax plane.
//
const PARALLAX_FADE_DURATION = 1.6
//
// Random tree spacing: each next trunk advances by a random fraction of the
// average cell, so gaps between trees vary irregularly.
//
const PAR_TREE_EDGE_PAD = 30
const PAR_TREE_STEP_MIN_FRAC = 0.55
const PAR_TREE_STEP_RANGE_FRAC = 0.9
//
// Background bushes — overlapping circles cut by the ground line, drawn IN
// FRONT of the tree planes: leaf tone of the near trees in the gray world,
// dark bark tone of the background trees in the colour world.
//
const BUSH_GRAY_SPRITE = 'glow0-bush-gray'
const BUSH_GREEN_SPRITE = 'glow0-bush-green'
const BUSH_FAR_GRAY_SPRITE = 'glow0-bush-far-gray'
const BUSH_FAR_GREEN_SPRITE = 'glow0-bush-far-green'
const BUSH_RADIUS_MIN = 44
const BUSH_RADIUS_MAX = 125
const BUSH_STEP_MIN_FRAC = 0.45
const BUSH_STEP_RANGE_FRAC = 0.5
//
// Bush tinting: a light green cast on every bush. The near strip matches the
// trunk tone of the near tree plane exactly; the far strip is taller and
// takes the leaf tone of the far tree plane.
//
const BUSH_GREEN_TINT = 0.16
const BUSH_FAR_HEIGHT_SCALE = 1.6
//
// Background birds — dim silhouettes gliding across the sky BEHIND the
// forest planes; they appear with the colour world (after O). Their tone is
// blended almost all the way into the sky so they read as faint specks.
//
const BIRD_COUNT = 5
const BIRD_MIN_Y = TOP_MARGIN + 10
const BIRD_Y_RANGE = 170
const BIRD_SPEED_MIN = 22
const BIRD_SPEED_RANGE = 26
const BIRD_SIZE_MIN = 5
const BIRD_SIZE_RANGE = 4
const BIRD_FLAP_SPEED_MIN = 4
const BIRD_FLAP_SPEED_RANGE = 3
const BIRD_BOB_AMP = 9
const BIRD_WRAP_PAD = 40
const BIRD_LINE_WIDTH = 2
const BIRD_SKY_BLEND = 0.72
//
// Underground decor in the root zone: buried rocks, cracks, pebble clusters,
// hanging rootlets and a fossil spiral (no burrows or holes). Baked once per
// mode (gray backdrop / dark colour-world earth).
//
const UNDERGROUND_GRAY_SPRITE = 'glow0-underground-gray'
const UNDERGROUND_COLOR_SPRITE = 'glow0-underground-color'
const UG_TOP_PAD = 30
const UG_BOTTOM_PAD = 18
const UG_ROCK_COUNT = 6
const UG_CRACK_COUNT = 9
const UG_PEBBLE_CLUSTER_COUNT = 6
const UG_ROOTLET_COUNT = 10
const OUTER_BG_R = OUTER.r
const OUTER_BG_G = OUTER.g
const OUTER_BG_B = OUTER.b
const OUTER_BG_HEX = GLOW_PAL.playfieldOuter
const WALL_BORDER_R = OUTER.r
const WALL_BORDER_G = OUTER.g
const WALL_BORDER_B = OUTER.b
const WATER_SHORE_ROCK_OFFSET_X = 12
//
// Shore rock horizontal stretch — extended to the right so it fully covers
// the right edge of the lake.
//
const SHORE_ROCK_WIDTH_SCALE = 2.2
//
// Scatter rocks across the lower-right part of the playfield.
//
const RIGHT_ROCK_COUNT = 5
const COLOR_FADE_DURATION = 2.4
const TREE_REVEAL_FADE_DURATION = 1.8
const L_PARALLAX_DELAY = 1.0
const DROWN_FADE_OUT_SPEED = 2.4
//
// Blinking letters — value 6 fill (or gold for G), value 1 offset-outline.
//
const GLOW_LETTER_FONT = 'JetBrains Mono'
const GLOW_LETTER_SIZE = 68
const GLOW_LETTER_OUTLINE = 2
//
// Pure black rim around every pickup letter (G, L, O, W).
//
const GLOW_LETTER_OUTLINE_R = 0
const GLOW_LETTER_OUTLINE_G = 0
const GLOW_LETTER_OUTLINE_B = 0
const GLOW_LETTER_TILT = 12
const GLOW_LETTER_PULSE_SPEED = 1.8
const GLOW_LETTER_PULSE_MIN = 0.35
const GLOW_LETTER_GAP = 70
const GLOW_LETTER_PICKUP_RADIUS = 52
//
// Hero — value 6 body and eye whites, value 1 pupils.
//
const HERO_OUTLINE_COLOR = GLOW_PAL.heroOutline
const HERO_BODY_COLOR = GLOW_PAL.heroBodyGray
const HERO_EYE_WHITE = GLOW_PAL.heroBodyGray
//
// Zone persistence keys (glow.* prefix).
//
const KEY_COLLECTED_G = 'glow.collectedG'
const KEY_COLLECTED_L = 'glow.collectedL'
const KEY_COLLECTED_O = 'glow.collectedO'
const KEY_COLLECTED_W = 'glow.collectedW'
const KEY_REVEALED_TREE = 'glow.revealedTree'
const KEY_REVEALED_OUTER_FRAME = 'glow.revealedOuterFrame'
const KEY_REVEALED_GROUND = 'glow.revealedGround'
const KEY_REVEALED_WATER = 'glow.revealedWater'
const KEY_REVEALED_L = 'glow.revealedL'
const KEY_REVEALED_W = 'glow.revealedW'
const KEY_REVEALED_O = 'glow.revealedO'
const KEY_REVEALED_L_SUN = 'glow.revealedLSun'
const KEY_REVEALED_L_PLAT = 'glow.revealedLPlat'
const KEY_REVEALED_GROUND_DECOR = 'glow.revealedGroundDecor'
const KEY_REVEALED_GROUND_DECOR_RIGHT = 'glow.revealedGroundDecorRight'
const KEY_REVEALED_GROUND_DECOR_LEFT = 'glow.revealedGroundDecorLeft'
const KEY_REVEALED_GROUND_BG = 'glow.revealedGroundBg'
const KEY_BONUS_COLLECTED = 'glow.bonusCollected'
const KEY_LIFE_SHOWN = 'glow.lifeShown'
const KEY_DROWN_HINT_SHOWN = 'glow.drownHintShown'
const KEY_INTRO_SHOWN = 'glow.introShown'
//
// Dialog.
//
const GLOW_DIALOG_G = 'Just [hl]Go[/hl]... Sometimes the first\nstep is all you have to do.'
const GLOW_DIALOG_L = '[hl]L[/hl]ight helps you see the shades. The\nworld is rarely just black or white'
const GLOW_DIALOG_O = '[hl]O[/hl]bservation is your new skill.\nSometimes you need to stop before\nyou can truly see. Find [hl]W[/hl] by yourself.'
//
// Speech-bubble hints: two intro lines at spawn (the G letter appears only
// after both finish), one-shot lines when the right ground / water zones
// first open, and a consolation line on the first drowning.
//
const HINT_INTRO_1_TEXT = 'I\'m Yuna. You don\'t need\nanswers yet. Just be curious.'
const HINT_INTRO_1_DURATION = 6
const HINT_INTRO_2_TEXT = 'To truly see this world, you\'ll\nneed to collect every letter of\nthe word GLOW. Each one will\nreveal another part of what\nyour eyes have yet to discover.'
const HINT_INTRO_2_DURATION = 9
const HINT_GROUND_RIGHT_TEXT = 'Curiosity lights the\nway. Keep walking'
const HINT_WATER_TEXT = 'The unknown isn\'t empty.\nIt simply hasn\'t been\ndiscovered yet'
const HINT_ZONE_DURATION = 5
const HINT_DROWN_TEXT = 'That\'s not bad. Now you\nknow you can\'t go here.'
const HINT_DROWN_DURATION = 4
//
// After L the gray root zone darkens toward void by this amount.
//
const GROUND_L_DARKEN = 0.22
//
// After L the gray ground decor (mushrooms, grass, water, rocks) also
// darkens toward void; the effect fades away with the colour-world fade.
//
const L_DECOR_DARKEN = 0.22
//
// O-letter meditation: once L is collected, standing perfectly still for
// MEDITATION_IDLE_BASE seconds starts a countdown near the hero's head (the
// hero closes his eyes). Any move/jump cancels it and adds
// MEDITATION_IDLE_PENALTY seconds to the required stillness. When the
// countdown reaches zero the O platform and letter appear.
//
const MEDITATION_IDLE_BASE = 7
const MEDITATION_IDLE_PENALTY = 2
const MEDITATION_COUNTDOWN = 10
const MEDITATION_TIMER_FONT = 22
//
// Hero hover tooltip — the hero introduces herself.
//
const HERO_TOOLTIP_TEXT = "Hi, I'm Yuna"
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -100
//
// HUD small-hero hover tooltip (same as touch lesson 0).
//
const SMALL_HERO_TOOLTIP_TEXT = 'Your fragments'
const SMALL_HERO_TOOLTIP_SIZE = 60
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
//
// HUD life-icon (the "teacher") hover tooltip — same as touch lesson 0.
//
const LIFE_TOOLTIP_TEXT = 'Your experience'
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50
//
// GLOW word (top-left HUD) hover tooltip — same style as touch lesson 0.
//
const GLOW_INDICATOR_TOOLTIP_TEXT = 'Here you can see how far\nyou have come in learning\ncolor perception'
const GLOW_INDICATOR_TOOLTIP_WIDTH = 200
const GLOW_INDICATOR_TOOLTIP_HEIGHT = 50
const GLOW_INDICATOR_TOOLTIP_Y_OFFSET = -30
//
// The 3-fragments collect hint lives longer than the default bubble.
//
const BONUS_HINT_DURATION = 6
//
// Pause between picking up the final W letter and returning to the menu,
// followed by a full-screen fade-out before the scene switch.
//
const W_MENU_TRANSITION_DELAY = 2.5
const W_MENU_FADE_DURATION = 1.2
const W_MENU_FADE_Z = 1000
//
// Hint text about the 3 bonus fragments (shown by the bonus-hero component).
//
const BONUS_HINT_TEXT = 'These are 3 Fragments. Every\njourney leaves something behind.\nCollect them. They will help you grow'
//
// Drowning — land on water surface, then submerge under the fill.
//
const WATER_SURFACE_Y = FLOOR_Y - 8
const DROWN_SURFACE_HOLD = 0.45
const DROWN_SUBMERGE_SPEED = 48
const DROWN_FULL_SINK_FEET_Y = FLOOR_Y + 72
//
// Extra depth of the initial water landing: the falling hero plunges this
// many pixels below the surface line and only then starts to sink.
//
const DROWN_LANDING_DEPTH = 12
const DROWN_RESTART_DELAY = 1.1
const WATER_STEPS_VOLUME = 0.42
//
// Life HUD flash on drowning death (same timing as touch lesson 0).
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
const GROUND_REVEAL_TREE_PAST_X = TREE_X + TRUNK_EXCLUDE_HALF
//
// Grass grows in tufts: baked blade sprites (several silhouette variants,
// tinted at draw time) clustered around random tuft centres instead of an
// even spread across the ground.
//
const GRASS_Z = 20
const GRASS_TUFT_COUNT = 26
const GRASS_TUFT_BLADES_MIN = 3
const GRASS_TUFT_BLADES_RANGE = 4
const GRASS_TUFT_SPREAD = 14
const GRASS_BLADE_VARIANTS = 5
const GRASS_BLADE_W = 14
const GRASS_BLADE_H = 34
const GRASS_BLADE_SCALE_MIN = 0.55
const GRASS_BLADE_SCALE_RANGE = 0.65
const GRASS_SWAY_DEG = 4
const GRASS_SWAY_SPEED_MIN = 0.8
const GRASS_SWAY_SPEED_RANGE = 0.7
const GRASS_SPRITE_PREFIX = 'glow0-grass-blade-'
//
// Rocks.
//
const CLUSTER_ROCK_RADIUS_MIN = 26
const CLUSTER_ROCK_RADIUS_MAX = 60
const SCATTER_ROCK_RADIUS_MIN = 10
const SCATTER_ROCK_RADIUS_MAX = 24
//
// Mushrooms.
//
const MUSHROOM_COUNT = 4
const MUSHROOM_CAP_W_MIN = 18
const MUSHROOM_CAP_W_MAX = 32
const MUSHROOM_STEM_H_MIN = 10
const MUSHROOM_STEM_H_MAX = 22
const MUSHROOM_EXTRA_LOWER = 2
//
// Mushroom trampoline — right of the L platform.
//
const TRAMP_CAP_W = 56
const TRAMP_CAP_H = 24
const TRAMP_STEM_H = 34
const TRAMP_STEM_W = 16
const TRAMP_TOTAL_W = Math.ceil(TRAMP_CAP_W + 4)
const TRAMP_TOTAL_H = Math.ceil(TRAMP_CAP_H + TRAMP_STEM_H + 4)
//
// Launch velocity tuned so the bounce apex is 30% lower than the original
// 1350 px/s launch (height scales with velocity squared: 1350 * sqrt(0.7)).
//
const TRAMP_FORCE = 1130
const TRAMP_COOLDOWN = 0.4
const TRAMP_RADIUS = 38
const TRAMP_SQUASH_MAX = 0.35
const TRAMP_SPRITE = 'glow0-trampoline'
const TRAMP_OFFSET_FROM_L_PLAT = 50
//
// Colour-phase outlines for ground decor (appear after O). Each decor object
// bakes a second "-o" sprite variant with a thin dark rim in a tone derived
// from the object itself (dark palette neighbour of its fill colour).
//
const DECOR_OUTLINE_SUFFIX = '-o'
const DECOR_OUTLINE_WIDTH = 1
const TRAMP_OUTLINE_SPRITE = TRAMP_SPRITE + DECOR_OUTLINE_SUFFIX
//
// Sink the trampoline sprite 1 px into the ground so it does not float.
//
const TRAMP_SINK_Y = 1
//
// Lake. The right edge is trimmed a little so the water ends just before
// the shore rock instead of poking past it.
//
const WATER_RIGHT_TRIM = 10
//
// Extra width of the below-ground drown mask past the lake's right edge —
// covers the sinking hero body when he drowns near the shore.
//
const DROWN_MASK_RIGHT_PAD = 120
const LAKE_SEGMENTS = 70
const LAKE_WAVE_FREQ = 1.2
const LAKE_WAVE_AMP = 4
const LAKE_WAVE_PHASE_SCALE = 8
const LAKE_Z = 12
//
// Hero foot offset — matches COLLISION_HEIGHT/2 + COLLISION_OFFSET_Y in hero.js.
//
const SURFACE_DETECT_Y = 38
const PLAT_LAND_TRIGGER_PAD = 24
//
// Log platform snap: anti-tunnel correction ONLY. Landing and standing are
// pure Kaplay physics — identical to the start branch, which never hovers.
// The snap merely lifts a hero whose feet sank INTO the log body back to
// the top; a hero above the log is always left to gravity.
//
const LOG_SNAP_TOLERANCE = 2
//
// Horizontal slack beyond the log edges where the snap still applies — the
// hero's collider lets him stand with his centre slightly past the log end.
//
const LOG_SNAP_X_SLACK = 16
//
// How far below the log top the anti-tunnel check still catches the hero.
//
const LOG_SNAP_BELOW = LOG_H + 24
//
// The snap embeds the hero's feet this many px INTO the log top instead of
// placing them exactly on it: the 1 px overlap makes Kaplay resolve the
// contact itself (grounding, velocity zeroing, landing animation) — placing
// the hero exactly on top left him airborne with the jump tuck stuck on.
//
const LOG_SNAP_EMBED = 1
//
// Hover watchdog: a hero suspended above a log with zero vertical velocity
// and no ground contact for this many consecutive frames gets pulled down
// onto the log top. Normal jumps never trigger it (velocity is only ~0 for
// a single frame at the apex).
//
const LOG_HOVER_BAND = 30
const LOG_HOVER_FRAMES = 3
//
// Delay before swapping the freshly baked gold hero sprite in (one frame).
//
const GOLD_SWAP_DELAY = 0.05

/**
 * Registers the GLOW section level 0 scene.
 * @param {Object} k - Kaplay instance
 */
export function sceneGlowLevel0(k) {
  k.scene('lesson-glow.0', () => {
    set('lastLesson', 'lesson-glow.0')
    set('lastSection', 'glow')
    CanvasBackdrop.applyCanvasBackdrop(k, GLOW_PAL.void)
    k.onSceneLeave(() => CanvasBackdrop.clearCanvasBackdrop(k))
    k.setGravity(CFG.game.gravity)
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    sound._k = k
    const birdsMusic = k.play('birds', { loop: true, volume: 0, paused: true })
    k.onSceneLeave(() => birdsMusic.stop())
    const zones = loadGlowZones()
    zones.outerFrame && CanvasBackdrop.applyCanvasBackdrop(k, OUTER_BG_HEX)
    const treeData = buildGlowTree(TREE_SEED, TREE_X, TREE_TRUNK_BOTTOM_Y, TREE_TOP_Y, ROOT_MAX_Y, TREE_ROOT_START_Y)
    const treeCanvas = renderGlowTreeToCanvas(treeData, getTreePaletteGray(), SCREEN_W, SCREEN_H)
    k.loadSprite(TREE_SPRITE_NAME, treeCanvas)
    treeCanvas.width = 0
    treeCanvas.height = 0
    //
    // Warm "lit" variant shown after L — the main tree stands out from the forest.
    //
    const treeLitCanvas = renderGlowTreeToCanvas(treeData, getTreePaletteLit(), SCREEN_W, SCREEN_H)
    k.loadSprite(TREE_LIT_SPRITE_NAME, treeLitCanvas)
    treeLitCanvas.width = 0
    treeLitCanvas.height = 0
    const treeColorCanvas = renderGlowTreeToCanvas(treeData, getTreePaletteColor(), SCREEN_W, SCREEN_H)
    k.loadSprite(TREE_COLOR_SPRITE_NAME, treeColorCanvas)
    treeColorCanvas.width = 0
    treeColorCanvas.height = 0
    buildParallaxSprites(k)
    loadBushSprites(k)
    loadUndergroundSprites(k)
    loadSunHaloSprite(k)
    const initialGraySprite = zones.lCollected ? TREE_LIT_SPRITE_NAME : TREE_SPRITE_NAME
    const treeObj = k.add([
      k.sprite(initialGraySprite),
      k.pos(0, 0),
      k.z(CFG.visual.zIndex.platforms - 2)
    ])
    const treeColorObj = k.add([
      k.sprite(TREE_COLOR_SPRITE_NAME),
      k.pos(0, 0),
      k.z(CFG.visual.zIndex.platforms - 2),
      k.opacity(0)
    ])
    treeObj.hidden = !zones.tree
    treeColorObj.hidden = !zones.tree
    const floorBounds = createLevelBounds(k)
    const floorPlat = floorBounds.floor
    const cornerObjs = createRoundedCorners(k)
    const { horizBranch } = treeData
    const branchPlatY = horizBranch.physY + Math.round(HORIZ_PLATFORM_H / 2)
    const branchPlat = k.add([
      k.rect(horizBranch.x2 - horizBranch.x1, HORIZ_PLATFORM_H),
      k.pos(horizBranch.x1, branchPlatY),
      k.anchor('topleft'),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ])
    const branchSpawnX = horizBranch.x1 + Math.round((horizBranch.x2 - horizBranch.x1) * HERO_BRANCH_FRACTION)
    //
    // Deaths respawn the hero at the lower-right ground ONLY once he has
    // discovered that part of the level himself; before that he always
    // returns to the branch next to the G letter.
    //
    const spawnOnGround = zones.groundDecorRight
    const heroSpawnX = spawnOnGround ? GROUND_SPAWN_X : branchSpawnX
    const heroSpawnY = spawnOnGround
      ? FLOOR_Y - HERO_SPAWN_OFFSET_ABOVE_BRANCH
      : horizBranch.physY - HERO_SPAWN_OFFSET_ABOVE_BRANCH
    const heroInst = Hero.create({
      k,
      x: heroSpawnX,
      y: heroSpawnY,
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      bodyColor: HERO_BODY_COLOR,
      outlineColor: HERO_OUTLINE_COLOR,
      eyeWhiteColor: HERO_EYE_WHITE,
      addLegStrip: true,
      currentLevel: 'lesson-glow.0',
      suppressDust: true
    })
    //
    // No footprint trail in the glow level — the ground stays clean.
    //
    heroInst.suppressFootprints = true
    Hero.spawn(heroInst)
    tagWoodPlatform(branchPlat, sound, heroInst)
    tagGroundPlatform(floorPlat, sound, heroInst)
    const rightPlatY = horizBranch.physY
    const rightPlatX = TREE_X + RIGHT_PLAT_OFFSET_X
    const wPlatY = Math.min(horizBranch.physY + W_PLAT_Y_BELOW, FLOOR_Y - 50)
    const wPlatX = W_PLAT_X_BASE
    const clusterCenterX = horizBranch.x1 + 40
    const waterX2 = clusterCenterX + CLUSTER_ROCK_RADIUS_MAX + 10 - WATER_RIGHT_TRIM
    const oPlatX = rightPlatX + LOG_W + O_PLAT_OFFSET_X
    const oPlatY = rightPlatY - O_PLAT_OFFSET_Y
    const bonusPlatX = oPlatX + LOG_W + BONUS_PLAT_OFFSET_X
    const bonusPlatY = oPlatY - BONUS_PLAT_OFFSET_Y
    const lPlat = createGrayLogPlatform(k, rightPlatX, rightPlatY, LOG_W, LOG_H, sound, heroInst, zones)
    const wPlat = createGrayLogPlatform(k, wPlatX, wPlatY, LOG_W, LOG_H, sound, heroInst, zones)
    const oPlat = createGrayLogPlatform(k, oPlatX, oPlatY, LOG_W, LOG_H, sound, heroInst, zones)
    const trampX = rightPlatX + LOG_W + TRAMP_OFFSET_FROM_L_PLAT
    const trampBundle = createMushroomTrampoline(k, trampX, FLOOR_Y, zones)
    const gLetterX = branchSpawnX + GLOW_LETTER_GAP + GLOW_LETTER_SIZE / 2
    const gLetterY = horizBranch.physY - GLOW_LETTER_SIZE * 0.15
    const gLetter = zones.gCollected ? null : createGlowLetter(k, 'G', gLetterX, gLetterY, GLOW_LETTER_TILT, GLOW_GOLD_HEX)
    const lLetterX = rightPlatX + LOG_W / 2
    const lLetterY = rightPlatY - GLOW_LETTER_SIZE * 0.15 - L_LETTER_RAISE_Y
    const lLetter = zones.lCollected ? null : createGlowLetter(k, 'L', lLetterX, lLetterY, -GLOW_LETTER_TILT, GLOW_GOLD_HEX)
    const wLetterX = wPlatX + LOG_W / 2
    const wLetterY = wPlatY - GLOW_LETTER_SIZE * 0.15
    const wLetter = zones.wCollected ? null : createGlowLetter(k, 'W', wLetterX, wLetterY, GLOW_LETTER_TILT * 0.7, GLOW_GOLD_HEX)
    const oLetterX = oPlatX + LOG_W / 2
    const oLetterY = oPlatY - GLOW_LETTER_SIZE * 0.15 - O_LETTER_RAISE_Y
    const oLetter = zones.oCollected ? null : createGlowLetter(k, 'O', oLetterX, oLetterY, GLOW_LETTER_TILT * 0.5, GLOW_GOLD_HEX)
    oLetter?.allObjects?.forEach(obj => { obj.z = CFG.visual.zIndex.platforms - 1 })
    const lakeX1 = LEFT_MARGIN
    const lakeX2 = waterX2
    const grassLayer = createGlowGrass(k, lakeX1, waterX2, zones)
    const rockObjs = createGlowRocks(k, horizBranch.x1, rightPlatX, zones)
    const mushObjs = createGlowMushrooms(k, lakeX1, waterX2, zones)
    const waterLayer = createWater(k, lakeX1, waterX2, zones)
    createDrownMask(k, lakeX1, lakeX2, zones)
    initTouchInput(k)
    TouchControls.create(k)
    const goldRgb = getRGB(k, GLOW_GOLD_HEX)
    const completedLetterCount = countGlowLettersCollected(zones)
    //
    // The HUD indicator also exists before any letter when the fragment
    // teacher or the life counter were already revealed on a previous life —
    // in that case only the scoreboard shows, the GLOW word stays hidden.
    //
    const bonusCollected = get(KEY_BONUS_COLLECTED, false)
    const lifeShown = get(KEY_LIFE_SHOWN, false)
    let levelIndicator = completedLetterCount > 0 || bonusCollected || lifeShown
      ? createGlowLevelIndicator(k, goldRgb, completedLetterCount, zones.colorWorld)
      : null
    //
    // Before the G letter the level is unnamed — no GLOW word in the HUD.
    //
    levelIndicator && !zones.gCollected && LevelIndicator.setSectionLabelHidden(levelIndicator, true)
    if (levelIndicator && bonusCollected) {
      LevelIndicator.revealSmallHeroHud(levelIndicator)
      levelIndicator.updateHeroScore?.(get('heroScore', 0))
    }
    if (levelIndicator && lifeShown) {
      LevelIndicator.revealLifeHud(levelIndicator, !zones.colorWorld)
      levelIndicator.updateLifeScore?.(get('lifeScore', 0))
    }
    zones.oCollected && startBirdsMusic(birdsMusic)
    //
    // Hidden bonus platform draws in the same style as the O/L letter logs:
    // flat environment-toned barrel in gray mode, detailed wood after O.
    //
    const bonusLogDetail = generateLogDetail(BONUS_PLAT_W, LOG_H)
    const bonusHeroInst = BonusHero.create({
      k,
      x: bonusPlatX + BONUS_PLAT_W / 2,
      y: bonusPlatY,
      width: BONUS_PLAT_W,
      heroInst,
      levelIndicator,
      sfx: sound,
      approachFromAbove: true,
      heroBodyColor: HERO_BODY_COLOR,
      storageKey: KEY_BONUS_COLLECTED,
      platformCollisionXOffset: Math.round(BONUS_PLAT_W / 2),
      platformCollisionYOffset: 10,
      customPlatformDraw: bonus => drawBonusPlatformLog(k, bonus, zones, bonusLogDetail),
      collectHintText: BONUS_HINT_TEXT,
      collectHintDuration: BONUS_HINT_DURATION
    })
    const inst = {
      k,
      sound,
      birdsMusic,
      heroInst,
      zones,
      treeObj,
      treeColorObj,
      treeGraySpriteName: initialGraySprite,
      colorFade: zones.colorWorld ? 1 : 0,
      colorFadeTarget: zones.colorWorld ? 1 : 0,
      //
      // Forest fade-in: already-revealed worlds start fully visible; a fresh
      // L pickup starts at 0 and the update loop fades the plane in.
      //
      parallaxFade: zones.lZoneParallax ? 1 : 0,
      //
      // Background birds gliding behind the forest (colour world only).
      //
      birds: createBackgroundBirds(),
      birdTime: 0,
      cornerObjs,
      wallObjs: floorBounds.walls,
      grassLayer,
      rockObjs,
      mushObjs,
      waterLayer,
      bonusHeroInst,
      trampBundle,
      lPlat,
      wPlat,
      oPlat,
      lPlatHome: { x: rightPlatX, y: rightPlatY },
      wPlatHome: { x: wPlatX, y: wPlatY },
      oPlatHome: { x: oPlatX, y: oPlatY },
      lLetter,
      wLetter,
      oLetter,
      gLetter,
      glowLetters: [lLetter, wLetter, oLetter].filter(Boolean),
      trampState: trampBundle.state,
      lakeX1,
      lakeX2,
      waterX2,
      lastHeroX: heroSpawnX,
      logHoverFrames: 0,
      wasGrounded: true,
      drowning: false,
      drownPhase: null,
      drownTimer: 0,
      drownSubmergeTimer: 0,
      deathHandled: false,
      dialogOpen: false,
      levelIndicator,
      goldRgb,
      wTrigger: { x1: wPlatX - PLAT_LAND_TRIGGER_PAD, x2: wPlatX + LOG_W + PLAT_LAND_TRIGGER_PAD, y: wPlatY - 60, y2: wPlatY + LOG_H + 20 },
      bonusPlatHome: { x: bonusPlatX, y: bonusPlatY },
      //
      // Always false at scene start — the colorWorld branch below rebakes the
      // gold hero even on reload (the hero object itself spawns whitish).
      //
      heroGoldApplied: false,
      fpsCounter: null,
      lParallaxTimer: null,
      pendingDialogAction: null,
      treeRevealFade: zones.tree ? 1 : 0,
      treeRevealActive: false,
      //
      // Speech-bubble hints controller (shared white cloud from utils).
      //
      heroHint: HeroHint.create({ k, heroInst }),
      //
      // Controls stay locked while the intro hints play; the G letter
      // appears only after both hints finish.
      //
      introLock: false,
      //
      // O-letter meditation state (see MEDITATION_* constants).
      //
      meditation: { idleTimer: 0, requiredIdle: MEDITATION_IDLE_BASE, countdown: null },
      woodSurfaces: [
        { x1: horizBranch.x1, x2: horizBranch.x2, y: branchPlatY, h: HORIZ_PLATFORM_H }
      ]
    }
    applyZoneVisibility(inst)
    updatePlayfieldBorderColors(inst)
    inst.zones._sceneRef = inst
    zones.colorWorld && applyColorWorldHero(inst)
    zones.wCollected && revealPostWHud(inst)
    //
    // The L platform may already be owed to the player (all three zones
    // explored on a previous life) — reveal it silently on scene start.
    //
    maybeRevealLPlat(inst, true)
    startGlowIntro(inst)
    createSmallHeroTooltip(inst)
    k.onKeyPress('escape', () => {
      if (inst.dialogOpen) return
      goToMenuAfterAssets(k)
    })
    k.onDraw(() => onDraw(inst))
    k.onUpdate(() => onUpdate(inst))
  })
}
//
// Plays the two intro hints with locked controls; the G letter appears once
// both hints have finished. Skipped entirely after G is collected.
//
function startGlowIntro(inst) {
  if (inst.zones.gCollected) return
  //
  // Replays after a death skip the greeting: only the goal reminder shows,
  // controls stay free and the G letter is visible right away.
  //
  if (get(KEY_INTRO_SHOWN, false)) {
    finishGlowIntro(inst)
    HeroHint.show(inst.heroHint, HINT_INTRO_2_TEXT, HINT_INTRO_2_DURATION)
    return
  }
  inst.introLock = true
  inst.heroInst.controllable = false
  inst.heroInst.controlsDisabled = true
  HeroHint.queue(inst.heroHint, [
    { text: HINT_INTRO_1_TEXT, duration: HINT_INTRO_1_DURATION },
    { text: HINT_INTRO_2_TEXT, duration: HINT_INTRO_2_DURATION }
  ], () => finishGlowIntro(inst))
}
//
// Unlocks the hero and shows the G letter after the intro hints.
//
function finishGlowIntro(inst) {
  set(KEY_INTRO_SHOWN, true)
  inst.introLock = false
  inst.heroInst.controlsDisabled = false
  //
  // The G letter materializes with the same reveal chime as the zone opens.
  //
  if (inst.gLetter) {
    setLetterVisible(inst.gLetter, true)
    playSegmentRevealSound(inst)
  }
}
//
// Hover tooltips over the HUD (same bubbles as touch lesson 0): the small
// hero (fragments), the life icon (the "teacher") and the GLOW word.
// Each target only activates once its HUD element has been revealed.
//
function createSmallHeroTooltip(inst) {
  Tooltip.create({
    k: inst.k,
    targets: [{
      x: () => inst.heroInst?.character?.pos?.x ?? -1000,
      y: () => inst.heroInst?.character?.pos?.y ?? -1000,
      width: HERO_TOOLTIP_HOVER_SIZE,
      height: HERO_TOOLTIP_HOVER_SIZE,
      text: HERO_TOOLTIP_TEXT,
      offsetY: HERO_TOOLTIP_Y_OFFSET,
      visible: () => !inst.drowning && !inst.dialogOpen
    }, {
      x: () => inst.levelIndicator?.smallHero?.character?.pos?.x ?? -1000,
      y: () => inst.levelIndicator?.smallHero?.character?.pos?.y ?? -1000,
      width: SMALL_HERO_TOOLTIP_SIZE,
      height: SMALL_HERO_TOOLTIP_SIZE,
      text: SMALL_HERO_TOOLTIP_TEXT,
      offsetY: SMALL_HERO_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => Boolean(inst.levelIndicator?.smallHeroRevealed)
    }, {
      x: () => inst.levelIndicator?.lifeImage?.sprite?.pos?.x ?? -1000,
      y: () => inst.levelIndicator?.lifeImage?.sprite?.pos?.y ?? -1000,
      width: LIFE_TOOLTIP_SIZE,
      height: LIFE_TOOLTIP_SIZE,
      text: LIFE_TOOLTIP_TEXT,
      offsetY: LIFE_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => Boolean(inst.levelIndicator?.lifeRevealed)
    }, {
      x: LEFT_MARGIN + 40 + GLOW_INDICATOR_TOOLTIP_WIDTH / 2,
      y: TOP_MARGIN / 2,
      width: GLOW_INDICATOR_TOOLTIP_WIDTH,
      height: GLOW_INDICATOR_TOOLTIP_HEIGHT,
      text: GLOW_INDICATOR_TOOLTIP_TEXT,
      offsetY: GLOW_INDICATOR_TOOLTIP_Y_OFFSET,
      //
      // The GLOW word only exists in the HUD once the G letter names it.
      //
      visible: () => Boolean(inst.levelIndicator) && inst.zones.gCollected
    }]
  })
}
//
// Shows/hides the meditation countdown via the shared hero counter component.
//
function updateMeditationCounter(inst) {
  const remaining = inst.meditation?.countdown
  const char = inst.heroInst?.character
  if (remaining == null || !char?.pos) {
    inst.meditationCounter && HeroCounter.hide(inst.meditationCounter)
    return
  }
  if (!inst.meditationCounter) {
    inst.meditationCounter = HeroCounter.create({
      k: inst.k,
      size: MEDITATION_TIMER_FONT,
      font: GLOW_LETTER_FONT,
      color: inst.goldRgb,
      outlineColor: VOID
    })
  }
  HeroCounter.update(inst.meditationCounter, String(Math.ceil(remaining)), char.pos.x, char.pos.y)
}
//
// Reads persisted zone flags from localStorage.
//
function loadGlowZones() {
  const gCollected = get(KEY_COLLECTED_G, false)
  const lCollected = get(KEY_COLLECTED_L, false)
  const oCollected = get(KEY_COLLECTED_O, false)
  const wCollected = get(KEY_COLLECTED_W, false)
  //
  // Ground decor reveals persist unconditionally: the right side can open
  // BEFORE the G letter, and a death must never hide an explored zone.
  //
  const groundDecorRight = get(KEY_REVEALED_GROUND_DECOR_RIGHT, false)
  //
  // The left decor and the water are one "left part": an open lake implies
  // open left decor (covers saves made before the zones were coupled).
  //
  const groundDecorLeft = get(KEY_REVEALED_GROUND_DECOR_LEFT, false) || get(KEY_REVEALED_WATER, false)
  const lZoneParallax = gCollected && lCollected && get(KEY_REVEALED_L, false)
  const lZoneSun = gCollected && lCollected && (get(KEY_REVEALED_L_SUN, false) || lCollected)
  const lPlatRevealed = gCollected && (get(KEY_REVEALED_L_PLAT, false) || lCollected)
  const oZone = gCollected && lCollected && (get(KEY_REVEALED_O, false) || oCollected)
  const wZone = gCollected && lCollected && oCollected && (get(KEY_REVEALED_W, false) || wCollected)
  const colorWorld = oCollected
  return {
    gCollected,
    lCollected,
    oCollected,
    wCollected,
    tree: gCollected || get(KEY_REVEALED_TREE, false),
    outerFrame: get(KEY_REVEALED_OUTER_FRAME, false) || (gCollected && get(KEY_REVEALED_TREE, false)),
    groundDecorRight,
    groundDecorLeft,
    groundDecor: groundDecorRight || groundDecorLeft,
    groundBg: get(KEY_REVEALED_GROUND_BG, false) || colorWorld,
    water: get(KEY_REVEALED_WATER, false),
    waterRocks: get(KEY_REVEALED_WATER, false),
    lZoneSun,
    lZoneParallax,
    lPlatRevealed,
    lZone: lZoneSun || lZoneParallax,
    wZone,
    oZone,
    colorWorld
  }
}
//
// Counts how many GLOW letters are already collected (for HUD restore).
//
function countGlowLettersCollected(zones) {
  let n = 0
  zones.gCollected && n++
  zones.lCollected && n++
  zones.oCollected && n++
  zones.wCollected && n++
  return n
}
//
// Creates the GLOW HUD row (G gold, LOW gray).
//
function createGlowLevelIndicator(k, goldRgb, completedLetters, colorWorld = false) {
  //
  // The HUD small hero mirrors the playable hero exactly: whitish body with
  // grey eye whites and leg strip before O, gold inside once the world colours.
  //
  return LevelIndicator.create({
    k,
    levelNumber: -1,
    sectionLabel: 'GLOW',
    activeColor: GLOW_GOLD_HEX,
    inactiveColor: GLOW_PAL.decorGray,
    completedColor: GLOW_GOLD_HEX,
    heroBodyColor: colorWorld ? GLOW_GOLD_HEX : HERO_BODY_COLOR,
    heroOutlineColor: HERO_OUTLINE_COLOR,
    heroEyeWhiteColor: HERO_EYE_WHITE,
    heroLegStrip: true,
    topPlatformHeight: TOP_MARGIN,
    sideWallWidth: LEFT_MARGIN,
    sectionLabelCompletedLetters: completedLetters,
    hideScoreboard: true,
    scoreboardGreyLife: true
  })
}
//
// Starts birds ambient once the O zone opens.
//
function startBirdsMusic(birdsMusic) {
  birdsMusic.paused = false
  birdsMusic.volume = CFG.audio.backgroundMusic.birds
}
//
// Shows/hides world layers and toggles platform collision from zone flags.
//
function applyZoneVisibility(inst) {
  const z = inst.zones
  inst.treeObj.hidden = !z.tree
  inst.treeColorObj.hidden = !z.tree
  //
  // After L the gray main tree switches to the warm "lit" palette variant.
  //
  const graySpriteName = z.lCollected ? TREE_LIT_SPRITE_NAME : TREE_SPRITE_NAME
  if (inst.treeGraySpriteName !== graySpriteName) {
    inst.treeGraySpriteName = graySpriteName
    inst.treeObj.use(inst.k.sprite(graySpriteName))
  }
  cornerObjsSetHidden(inst.cornerObjs, !isOuterFrameVisible(z))
  setPlatVisible(inst.lPlat, z.lPlatRevealed, inst.lPlatHome, z.gCollected)
  setPlatVisible(inst.oPlat, z.oZone, inst.oPlatHome, z.lCollected)
  setPlatVisible(inst.wPlat, z.wZone, inst.wPlatHome, z.oCollected)
  setLetterVisible(inst.lLetter, z.lPlatRevealed && !z.lCollected)
  setLetterVisible(inst.oLetter, z.oZone && !z.oCollected)
  setLetterVisible(inst.wLetter, z.wZone && !z.wCollected)
  inst.trampBundle.drawLayer.hidden = !z.groundDecorRight
  inst.rockObjs.forEach(o => {
    const showLeft = o._waterCluster ? z.waterRocks : z.groundDecorLeft
    const show = o._side === 'left' ? showLeft : z.groundDecorRight
    setDecorObjVisible(o, show)
  })
  inst.mushObjs.forEach(o => {
    setDecorObjVisible(o, o._side === 'left' ? z.groundDecorLeft : z.groundDecorRight)
  })
  inst.grassLayer.hidden = !z.groundDecorRight && !z.groundDecorLeft
  rebuildWoodSurfaces(inst)
}
//
// Shows or hides a floor decor sprite — moves off-screen when hidden so nothing
// peeks into the viewport before the zone is revealed.
//
function setDecorObjVisible(obj, visible) {
  obj.hidden = !visible
  obj._homeY != null && (obj.pos.y = visible ? obj._homeY : PLATFORM_HIDE_Y)
}
//
// Toggles corner sprite visibility.
//
function cornerObjsSetHidden(cornerObjs, hidden) {
  cornerObjs.forEach(obj => { obj.hidden = hidden })
}
//
// Toggles platform visibility; ghost platforms draw at home but collider stays off-screen.
//
function setPlatVisible(plat, visible, home, solid = true) {
  plat.hidden = !visible
  plat._ghostDraw = visible && !solid
  plat._homeX = home.x
  plat._homeY = home.y
  const collidable = visible && solid
  const cx = home.x + LOG_W / 2
  const cy = home.y + LOG_H / 2
  plat.pos.x = collidable ? cx : -500
  plat.pos.y = collidable ? cy : PLATFORM_HIDE_Y
}
//
// Toggles pickup letter visibility.
//
function setLetterVisible(letterEntry, visible) {
  if (!letterEntry) return
  letterEntry.allObjects.forEach(obj => { obj.hidden = !visible })
}
//
// Rebuilds wood-surface list for footstep/dust detection.
//
function rebuildWoodSurfaces(inst) {
  const branch = inst.woodSurfaces[0]
  const list = branch ? [branch] : []
  const z = inst.zones
  z.lPlatRevealed && z.gCollected && list.push({ x1: inst.lPlatHome.x, x2: inst.lPlatHome.x + LOG_W, y: inst.lPlatHome.y, h: LOG_H })
  z.oZone && z.lCollected && list.push({ x1: inst.oPlatHome.x, x2: inst.oPlatHome.x + LOG_W, y: inst.oPlatHome.y, h: LOG_H })
  z.wZone && z.oCollected && list.push({ x1: inst.wPlatHome.x, x2: inst.wPlatHome.x + LOG_W, y: inst.wPlatHome.y, h: LOG_H })
  inst.woodSurfaces = list
}
//
// Horizontal positions — random-walk placement: each next trunk advances by
// a random fraction of the average cell width, so the gaps between trees
// vary irregularly across the whole playfield width. Trees near the centre
// are removed / shrunk later by the centre-clearing height factor.
//
function buildParallaxTreeXs(count, gameLeft, gameRight) {
  const xs = []
  const left = gameLeft + PAR_TREE_EDGE_PAD
  const right = gameRight - PAR_TREE_EDGE_PAD
  const cell = (right - left) / count
  let x = left + Math.random() * cell * 0.6
  while (x < right) {
    xs.push(x)
    x += cell * (PAR_TREE_STEP_MIN_FRAC + Math.random() * PAR_TREE_STEP_RANGE_FRAC)
  }
  return xs
}
//
// Centre clearing test: true inside the tree-free band around the main tree.
//
function isInCenterClearBand(treeX) {
  return Math.abs(treeX - TREE_X) <= PAR_CENTER_CLEAR_HALF
}
//
// Linearly blends two RGB triplets.
//
function lerpRgb(a, b, t) {
  const u = Math.max(0, Math.min(1, t))
  return {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u)
  }
}
//
// Amount the gray-phase ground decor darkens toward void after L. The push
// dissolves together with the gray world as the colour fade progresses.
//
function grayDecorDarken(sc) {
  if (!sc?.zones?.lCollected) return 0
  return L_DECOR_DARKEN * (1 - (sc.colorFade ?? 0))
}
//
// Multiply-tint that turns a sprite baked in DECOR_GRAY into the current
// (possibly darkened) gray decor tone. White = no change.
//
function grayDecorTint(sc) {
  const t = grayDecorDarken(sc)
  if (t <= 0) return { r: 255, g: 255, b: 255 }
  const target = lerpRgb(DECOR_GRAY, VOID, t)
  return {
    r: Math.round(255 * target.r / DECOR_GRAY.r),
    g: Math.round(255 * target.g / DECOR_GRAY.g),
    b: Math.round(255 * target.b / DECOR_GRAY.b)
  }
}
//
// Preloads a radial spectrum halo sprite for the sun (half the previous size).
//
function loadSunHaloSprite(k) {
  const outerR = SUN_RADIUS + SUN_HALO_EXTRA
  const size = outerR * 2 + 4
  const cx = size / 2
  const cy = size / 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const grad = ctx.createRadialGradient(cx, cy, SUN_RADIUS * 0.82, cx, cy, outerR)
  const haloStops = [
    [0, GLOW_PAL.sunHalo[0], 0.38],
    [0.18, GLOW_PAL.sunHalo[1], 0.3],
    [0.36, GLOW_PAL.sunHalo[2], 0.22],
    [0.52, GLOW_PAL.sunHalo[3], 0.16],
    [0.68, GLOW_PAL.sunHalo[4], 0.12],
    [0.84, GLOW_PAL.sunHalo[5], 0.08],
    [1, GLOW_PAL.sunHalo[6], 0]
  ]
  haloStops.forEach(([pos, hex, alpha]) => {
    const c = glowRgb(hex)
    grad.addColorStop(pos, `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`)
  })
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(cx, cy, outerR, 0, Math.PI * 2)
  ctx.fill()
  k.loadSprite(SUN_HALO_SPRITE, canvas)
  canvas.width = 0
  canvas.height = 0
}
//
// Caps trunk top Y so trees in the sun zone stay below the sun disc.
//
function capTrunkTopForSun(treeX, trunkTopY) {
  if (treeX < SUN_ZONE_X) return trunkTopY
  return Math.max(trunkTopY, SUN_MAX_TOP_Y)
}
//
// Builds the background forest — two planes of big glow trees baked with
// pre-dimmed tones (gray + colour variants), drawn fully opaque. The far
// plane is dimmer and its foliage is painted with a single flat tone.
//
function buildParallaxSprites(k) {
  bakeGlowTreePlane(k, {
    grayName: PAR_FAR_SPRITE,
    colorName: PAR_FAR_COLOR_SPRITE,
    count: PAR_FAR_TREE_COUNT,
    seedBase: PAR_FAR_SEED_BASE,
    topMinY: PAR_FAR_TOP_MIN_Y,
    topRange: PAR_FAR_TOP_RANGE,
    bgBlend: PAR_L2_BG_BLEND,
    flatLeaves: true,
    leafDarken: PAR_FAR_LEAF_DARKEN
  })
  bakeGlowTreePlane(k, {
    grayName: PAR_NEAR_SPRITE,
    colorName: PAR_NEAR_COLOR_SPRITE,
    count: PAR_BIG_TREE_COUNT,
    seedBase: PAR_BIG_SEED_BASE,
    topMinY: PAR_BIG_TOP_MIN_Y,
    topRange: PAR_BIG_TOP_RANGE,
    bgBlend: PAR_L1_BG_BLEND,
    flatLeaves: false,
    leafDarken: 0
  })
}
//
// Bakes one parallax plane: BIG trees generated with the same glow-tree
// algorithm as the main tree (wider trunks, no roots, no hero branch). All
// trees of the layer share ONE full-screen canvas per mode; the tones are
// pre-blended toward the backdrop so the sprite is drawn opaque — gray tones
// in the gray world, sky-tinted gray tones in the colour world. Trees shrink
// toward the centre of the screen and vanish inside the clear band around
// the main tree.
//
function bakeGlowTreePlane(k, planeCfg) {
  const { grayName, colorName, count, seedBase, topMinY, topRange, bgBlend, flatLeaves, leafDarken } = planeCfg
  const grayCanvas = document.createElement('canvas')
  grayCanvas.width = SCREEN_W
  grayCanvas.height = SCREEN_H
  const grayCtx = grayCanvas.getContext('2d')
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = SCREEN_W
  colorCanvas.height = SCREEN_H
  const colorCtx = colorCanvas.getContext('2d')
  //
  // Both modes keep the background forest gray (never green): the colour-mode
  // palette is the same gray tree palette blended toward the sky colour.
  //
  const grayPal = buildDimmedTreePalette(getTreePaletteGray(), INNER_GRAY, bgBlend, flatLeaves, leafDarken)
  const colorPal = buildDimmedTreePalette(getTreePaletteGray(), SKY_COLOR, bgBlend, flatLeaves, leafDarken)
  const treeXs = buildParallaxTreeXs(count, LEFT_MARGIN, SCREEN_W - RIGHT_MARGIN)
  treeXs.forEach((treeX, i) => {
    //
    // Centre clearing — no trees at all in the band around the main tree;
    // outside the band every tree grows at its full random height.
    //
    if (isInCenterClearBand(treeX)) return
    let trunkTopY = topMinY + Math.random() * topRange
    trunkTopY = capTrunkTopForSun(treeX, trunkTopY)
    const treeData = buildGlowTree(
      TREE_SEED + seedBase + i * PAR_BIG_SEED_STEP,
      Math.round(treeX),
      PAR_TRUNK_BOTTOM_Y,
      Math.round(trunkTopY),
      PAR_TRUNK_BOTTOM_Y,
      PAR_TRUNK_BOTTOM_Y,
      { includeRoots: false, includeHeroBranch: false }
    )
    //
    // Background trees read even bigger than the main tree via wider wood.
    //
    const widthScale = PAR_BIG_WIDTH_SCALE_MIN + Math.random() * PAR_BIG_WIDTH_SCALE_RANGE
    scaleGlowTreeWidths(treeData, widthScale)
    renderGlowTreeIntoContext(grayCtx, treeData, grayPal, SCREEN_W, SCREEN_H)
    renderGlowTreeIntoContext(colorCtx, treeData, colorPal, SCREEN_W, SCREEN_H)
  })
  //
  // Nothing below the ground line — trunks must never cross the ground band.
  //
  grayCtx.clearRect(0, FLOOR_Y, SCREEN_W, SCREEN_H - FLOOR_Y)
  colorCtx.clearRect(0, FLOOR_Y, SCREEN_W, SCREEN_H - FLOOR_Y)
  k.loadSprite(grayName, grayCanvas)
  k.loadSprite(colorName, colorCanvas)
  grayCanvas.width = 0
  grayCanvas.height = 0
  colorCanvas.width = 0
  colorCanvas.height = 0
}
//
// Scales trunk and branch widths of a glow tree (geometry stays the same).
//
function scaleGlowTreeWidths(treeData, scale) {
  treeData.trunkSegs.forEach(seg => {
    seg.w *= scale
    seg.w2 *= scale
  })
  treeData.branchSegs.forEach(seg => {
    seg.w *= scale
  })
}
//
// Bakes the background bush strip: overlapping circles of varying radii
// centred on the ground line — the canvas ends at FLOOR_Y so every circle is
// cut by the ground. One continuous band from the left margin to the right.
// The bushes use the exact same dimmed tone as the big background trees.
//
function loadBushSprites(k) {
  const grayNearPal = buildDimmedTreePalette(getTreePaletteGray(), INNER_GRAY, PAR_L1_BG_BLEND)
  const colorNearPal = buildDimmedTreePalette(getTreePaletteGray(), SKY_COLOR, PAR_L1_BG_BLEND)
  const grayFarPal = buildDimmedTreePalette(getTreePaletteGray(), INNER_GRAY, PAR_L2_BG_BLEND, true, PAR_FAR_LEAF_DARKEN)
  const colorFarPal = buildDimmedTreePalette(getTreePaletteGray(), SKY_COLOR, PAR_L2_BG_BLEND, true, PAR_FAR_LEAF_DARKEN)
  //
  // Near bushes match the brightness of the near tree plane exactly (trunk
  // tone + a light green cast, no extra darkening). Far bushes take the leaf
  // tone of the far tree plane so both strips sit in their own depth layers.
  // Colour world (after O): the same near/far dimming applied over the
  // sky-blended palettes — the bushes stay as muted as the trees.
  //
  const grayTone = tintBushTone({ r: grayNearPal.trunkR, g: grayNearPal.trunkG, b: grayNearPal.trunkB })
  const colorTone = tintBushTone({ r: colorNearPal.trunkR, g: colorNearPal.trunkG, b: colorNearPal.trunkB })
  const entries = [
    { name: BUSH_GRAY_SPRITE, rgb: grayTone, heightScale: 1 },
    { name: BUSH_GREEN_SPRITE, rgb: colorTone, heightScale: 1 },
    { name: BUSH_FAR_GRAY_SPRITE, rgb: { r: grayFarPal.leafR, g: grayFarPal.leafG, b: grayFarPal.leafB }, heightScale: BUSH_FAR_HEIGHT_SCALE },
    { name: BUSH_FAR_GREEN_SPRITE, rgb: { r: colorFarPal.leafR, g: colorFarPal.leafG, b: colorFarPal.leafB }, heightScale: BUSH_FAR_HEIGHT_SCALE }
  ]
  entries.forEach(entry => {
    const canvas = document.createElement('canvas')
    canvas.width = SCREEN_W
    canvas.height = FLOOR_Y
    const ctx = canvas.getContext('2d')
    ctx.fillStyle = `rgb(${entry.rgb.r}, ${entry.rgb.g}, ${entry.rgb.b})`
    let x = LEFT_MARGIN
    const right = SCREEN_W - RIGHT_MARGIN
    while (x < right) {
      const radius = (BUSH_RADIUS_MIN + Math.random() * (BUSH_RADIUS_MAX - BUSH_RADIUS_MIN)) * entry.heightScale
      ctx.beginPath()
      ctx.arc(x, FLOOR_Y, radius, Math.PI, 0)
      ctx.closePath()
      ctx.fill()
      //
      // Advance less than a radius so each circle overlaps the next one.
      //
      x += radius * (BUSH_STEP_MIN_FRAC + Math.random() * BUSH_STEP_RANGE_FRAC)
    }
    k.loadSprite(entry.name, canvas)
    canvas.width = 0
    canvas.height = 0
  })
}
//
// Applies the shared bush tinting: a light green cast over the base tone.
//
function tintBushTone(rgb) {
  return lerpRgb(rgb, GRASS_GREEN, BUSH_GREEN_TINT)
}
//
// Creates the background bird flock — each bird gets its own lane, flight
// direction, speed, size and wing-flap phase.
//
function createBackgroundBirds() {
  const birds = []
  for (let i = 0; i < BIRD_COUNT; i++) {
    birds.push({
      x: LEFT_MARGIN + Math.random() * (SCREEN_W - LEFT_MARGIN - RIGHT_MARGIN),
      baseY: BIRD_MIN_Y + Math.random() * BIRD_Y_RANGE,
      dir: Math.random() < 0.5 ? -1 : 1,
      speed: BIRD_SPEED_MIN + Math.random() * BIRD_SPEED_RANGE,
      size: BIRD_SIZE_MIN + Math.random() * BIRD_SIZE_RANGE,
      flap: Math.random() * Math.PI * 2,
      flapSpeed: BIRD_FLAP_SPEED_MIN + Math.random() * BIRD_FLAP_SPEED_RANGE,
      bobPhase: Math.random() * Math.PI * 2
    })
  }
  return birds
}
//
// Moves birds along their lanes, wrapping around the playfield edges.
//
function updateBackgroundBirds(inst, dt) {
  inst.birdTime += dt
  const left = LEFT_MARGIN - BIRD_WRAP_PAD
  const right = SCREEN_W - RIGHT_MARGIN + BIRD_WRAP_PAD
  inst.birds.forEach(bird => {
    bird.x += bird.dir * bird.speed * dt
    bird.flap += bird.flapSpeed * dt
    bird.x < left && (bird.x = right)
    bird.x > right && (bird.x = left)
  })
}
//
// Draws the bird silhouettes — two wing strokes forming a shallow "v" whose
// tips swing with the flap phase. Drawn in the background pass BEHIND the
// forest planes; visible only as the colour world fades in (after O).
//
function drawBackgroundBirds(inst) {
  const fade = inst.colorFade
  if (!inst.zones.colorWorld || fade <= 0.01) return
  const k = inst.k
  //
  // Minimal brightness: the silhouette tone sits most of the way toward the
  // sky colour, so the birds read as barely-there distant specks.
  //
  const c = lerpRgb(VOID, SKY_COLOR, BIRD_SKY_BLEND)
  inst.birds.forEach(bird => {
    const y = bird.baseY + Math.sin(inst.birdTime * 0.7 + bird.bobPhase) * BIRD_BOB_AMP
    const wingTipY = y + Math.sin(bird.flap) * bird.size * 0.7
    k.drawLines({
      pts: [
        k.vec2(bird.x - bird.size, wingTipY),
        k.vec2(bird.x, y),
        k.vec2(bird.x + bird.size, wingTipY)
      ],
      width: BIRD_LINE_WIDTH,
      color: k.rgb(c.r, c.g, c.b),
      opacity: fade,
      join: 'round',
      cap: 'round'
    })
  })
}
//
// Bakes the underground decor sprites (gray + colour-world variants) that
// dress up the root-zone earth band: buried rocks, burrows with winding
// tunnels, cracks, pebble clusters, hanging rootlets and a fossil spiral.
// Both variants share the same generated geometry so the gray↔colour
// crossfade never shifts a single stone.
//
function loadUndergroundSprites(k) {
  const spec = buildUndergroundSpec()
  //
  // Gray world sits on the playfield-gray earth band; the colour world sits
  // on the near-black earth, so its features read as slightly lighter tones.
  //
  const entries = [
    {
      name: UNDERGROUND_GRAY_SPRITE,
      fill: glowRgb('midGray'),
      deep: glowRgb('playfieldOuter'),
      light: glowRgb('lightGray')
    },
    {
      name: UNDERGROUND_COLOR_SPRITE,
      fill: glowRgb('dialogFill'),
      deep: glowRgb('void'),
      light: glowRgb('playfieldOuter')
    }
  ]
  entries.forEach(entry => {
    const canvas = document.createElement('canvas')
    canvas.width = SCREEN_W
    canvas.height = SCREEN_H
    const ctx = canvas.getContext('2d')
    renderUndergroundSpec(ctx, spec, entry)
    k.loadSprite(entry.name, canvas)
    canvas.width = 0
    canvas.height = 0
  })
}
//
// Generates the random layout of all underground features once, so both
// colour variants can be rendered from identical geometry.
//
function buildUndergroundSpec() {
  const areaX1 = LEFT_MARGIN + 40
  const areaX2 = SCREEN_W - RIGHT_MARGIN - 40
  const areaY1 = FLOOR_Y + UG_TOP_PAD
  const areaY2 = PLAYFIELD_BOTTOM_Y - UG_BOTTOM_PAD
  const randX = () => areaX1 + Math.random() * (areaX2 - areaX1)
  const randY = () => areaY1 + Math.random() * (areaY2 - areaY1)
  //
  // Buried rocks — reuse the shared rock silhouette generator.
  //
  const rocks = []
  for (let i = 0; i < UG_ROCK_COUNT; i++) {
    const radius = 12 + Math.random() * 22
    rocks.push({ x: randX(), y: randY(), radius, verts: buildRockVertices(radius) })
  }
  //
  // Cracks — thin polylines with one smaller side branch each.
  //
  const cracks = []
  for (let i = 0; i < UG_CRACK_COUNT; i++) {
    const pts = [{ x: randX(), y: randY() }]
    for (let s = 0; s < 3; s++) {
      const last = pts[pts.length - 1]
      pts.push({ x: last.x + (Math.random() - 0.5) * 46, y: last.y + 8 + Math.random() * 22 })
    }
    const mid = pts[1]
    const branch = [
      { x: mid.x, y: mid.y },
      { x: mid.x + (Math.random() - 0.5) * 36, y: mid.y + 10 + Math.random() * 16 }
    ]
    cracks.push({ pts, branch })
  }
  //
  // Pebble clusters — a handful of tiny stones packed together.
  //
  const pebbles = []
  for (let i = 0; i < UG_PEBBLE_CLUSTER_COUNT; i++) {
    const cx = randX()
    const cy = randY()
    const stones = []
    const count = 3 + Math.floor(Math.random() * 4)
    for (let s = 0; s < count; s++) {
      stones.push({ x: cx + (Math.random() - 0.5) * 26, y: cy + (Math.random() - 0.5) * 14, r: 2 + Math.random() * 3 })
    }
    pebbles.push(stones)
  }
  //
  // Rootlets — thin hair-roots hanging down from the ground line.
  //
  const rootlets = []
  for (let i = 0; i < UG_ROOTLET_COUNT; i++) {
    const rx = randX()
    const pts = [{ x: rx, y: FLOOR_Y + 4 }]
    let px = rx
    let py = FLOOR_Y + 4
    const segs = 2 + Math.floor(Math.random() * 2)
    for (let s = 0; s < segs; s++) {
      px += (Math.random() - 0.5) * 14
      py += 10 + Math.random() * 16
      pts.push({ x: px, y: py })
    }
    rootlets.push(pts)
  }
  //
  // One fossil spiral — a small ammonite curled among the stones.
  //
  const fossil = { x: randX(), y: randY(), r: 9 + Math.random() * 5 }
  return { rocks, cracks, pebbles, rootlets, fossil }
}
//
// Renders the shared underground layout with one mode's tones.
//
function renderUndergroundSpec(ctx, spec, tones) {
  const fillCss = `rgb(${tones.fill.r}, ${tones.fill.g}, ${tones.fill.b})`
  const deepCss = `rgb(${tones.deep.r}, ${tones.deep.g}, ${tones.deep.b})`
  const lightCss = `rgb(${tones.light.r}, ${tones.light.g}, ${tones.light.b})`
  //
  // Buried rocks — flat single-tone silhouettes, no outline.
  //
  const rockPalette = {
    fillR: tones.fill.r, fillG: tones.fill.g, fillB: tones.fill.b,
    lightR: tones.fill.r, lightG: tones.fill.g, lightB: tones.fill.b,
    darkR: tones.fill.r, darkG: tones.fill.g, darkB: tones.fill.b
  }
  spec.rocks.forEach(rock => {
    drawRockToCanvas(ctx, { cx: rock.x, cy: rock.y, radius: rock.radius, verts: rock.verts, palette: rockPalette, skipOutline: true, skipShadow: true })
  })
  //
  // Cracks — thin fissures with a short side branch.
  //
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = deepCss
  ctx.globalAlpha = 0.7
  ctx.lineWidth = 1.4
  spec.cracks.forEach(crack => {
    strokePolyline(ctx, crack.pts)
    strokePolyline(ctx, crack.branch)
  })
  ctx.globalAlpha = 1
  //
  // Pebble clusters.
  //
  ctx.fillStyle = fillCss
  spec.pebbles.forEach(stones => {
    stones.forEach(stone => {
      ctx.beginPath()
      ctx.arc(stone.x, stone.y, stone.r, 0, Math.PI * 2)
      ctx.fill()
    })
  })
  //
  // Hair-roots hanging from the ground line.
  //
  ctx.strokeStyle = deepCss
  ctx.globalAlpha = 0.6
  ctx.lineWidth = 1.6
  spec.rootlets.forEach(pts => strokePolyline(ctx, pts))
  ctx.globalAlpha = 1
  //
  // Fossil spiral — a small two-turn ammonite drawn in the light tone.
  //
  ctx.strokeStyle = lightCss
  ctx.globalAlpha = 0.75
  ctx.lineWidth = 1.5
  ctx.beginPath()
  const turns = 2
  const steps = 40
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const angle = t * turns * Math.PI * 2
    const radius = spec.fossil.r * t
    const px = spec.fossil.x + Math.cos(angle) * radius
    const py = spec.fossil.y + Math.sin(angle) * radius
    s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.stroke()
  ctx.globalAlpha = 1
}
//
// Strokes an open polyline through the given points.
//
function strokePolyline(ctx, pts) {
  ctx.beginPath()
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.stroke()
}
//
// Draws the baked underground decor with the gray↔colour crossfade.
//
function drawUndergroundLayer(inst) {
  const k = inst.k
  const fade = inst.colorFade
  k.drawSprite({ sprite: UNDERGROUND_GRAY_SPRITE, pos: k.vec2(0, 0), opacity: 1 - fade })
  fade > 0 && k.drawSprite({ sprite: UNDERGROUND_COLOR_SPRITE, pos: k.vec2(0, 0), opacity: fade })
}
//
// Physics boundary walls, ceiling, and floor.
//
function createLevelBounds(k) {
  const walls = []
  const addWall = (x, y, w, h) => {
    const wall = k.add([
      k.rect(w, h),
      k.pos(x, y),
      k.anchor('center'),
      k.area(),
      k.body({ isStatic: true }),
      k.color(VOID.r, VOID.g, VOID.b),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    walls.push(wall)
    return wall
  }
  addWall(LEFT_MARGIN / 2, SCREEN_H / 2, LEFT_MARGIN, SCREEN_H)
  addWall(SCREEN_W - RIGHT_MARGIN / 2, SCREEN_H / 2, RIGHT_MARGIN, SCREEN_H)
  addWall(SCREEN_W / 2, TOP_MARGIN / 2, SCREEN_W, TOP_MARGIN)
  const floor = k.add([
    k.rect(SCREEN_W - LEFT_MARGIN - RIGHT_MARGIN, FLOOR_PHYS_H),
    k.pos(LEFT_MARGIN, FLOOR_Y),
    k.anchor('topleft'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  return { floor, walls }
}
//
// Rounded corners (value 1) — hidden until ground zone opens.
//
function createRoundedCorners(k) {
  const cornerCanvas = makeRoundedCornerCanvas(CORNER_RADIUS, OUTER_BG_HEX)
  k.loadSprite(CORNER_SPRITE_NAME, cornerCanvas)
  cornerCanvas.width = 0
  cornerCanvas.height = 0
  const Z = CFG.visual.zIndex.platforms + 2
  const corners = [
    k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(LEFT_MARGIN, TOP_MARGIN), k.z(Z)]),
    k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(SCREEN_W - RIGHT_MARGIN, TOP_MARGIN), k.rotate(90), k.z(Z)]),
    k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(LEFT_MARGIN, PLAYFIELD_BOTTOM_Y), k.rotate(270), k.z(Z)]),
    k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(SCREEN_W - RIGHT_MARGIN, PLAYFIELD_BOTTOM_Y), k.rotate(180), k.z(Z)])
  ]
  corners.forEach(obj => { obj.hidden = true })
  return corners
}
//
// Quarter-circle cut-out corner canvas.
//
function makeRoundedCornerCanvas(radius, color) {
  const canvas = document.createElement('canvas')
  canvas.width = radius
  canvas.height = radius
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = color
  ctx.fillRect(0, 0, radius, radius)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.arc(radius, radius, radius, 0, Math.PI * 2)
  ctx.fill()
  return canvas
}
//
// Log-style platform — value 5 environment silhouette (same shape as touch logs).
//
function createGrayLogPlatform(k, x, y, w, h, sound, heroInst, zones) {
  //
  // Log platforms match the main tree's gray trunk tone before L; after L
  // they switch to the fully detailed wood barrel.
  //
  const envColorGray = getRGB(k, GLOW_PAL.treeGray.trunk)
  const logDetail = generateLogDetail(w, h)
  const cx = x + w / 2
  const cy = y + h / 2
  const plat = k.add([
    k.rect(w, h),
    k.pos(cx, cy),
    k.anchor('center'),
    //
    // Collision box dropped a couple of pixels below the sprite (see
    // LOG_COLLISION_DROP_Y) so the hero's feet meet the visible wood top.
    //
    k.area({ offset: k.vec2(0, LOG_COLLISION_DROP_Y) }),
    k.body({ isStatic: true }),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName,
    {
      _ghostDraw: false,
      _homeX: x,
      _homeY: y,
      _logDetail: logDetail,
      draw() {
        if (this.hidden) return
        const homeCx = this._homeX + w / 2
        const homeCy = this._homeY + h / 2
        const ox = this._ghostDraw ? (homeCx - this.pos.x) : 0
        const oy = this._ghostDraw ? (homeCy - this.pos.y) : 0
        const fade = zones._sceneRef?.colorFade ?? 0
        //
        // Detailed wood (rings, bark lines) appears once L is collected;
        // before that the log is a flat gray environment silhouette.
        //
        fade > 0.01 || zones.lCollected
          ? drawLogPlatform(k, w, h, ox, oy, 1, this._logDetail)
          : drawFlatLog(k, ox, oy, w, h, envColorGray)
      }
    }
  ])
  plat.hidden = true
  tagWoodPlatform(plat, sound, heroInst)
  return plat
}
function tagGroundPlatform(platform, sound, heroInst) {
  platform.onCollide('player', () => {
    sound._l2Surface = null
  })
}
//
// Marks wood surface on hero contact so landing/step sounds fire in the same frame.
//
function tagWoodPlatform(platform, sound, heroInst) {
  platform.onCollide('player', () => {
    sound._l2Surface = 'wood'
    heroInst && Hero.syncPlatformLanding(heroInst)
  })
}
//
// Flat log barrel — one environment tone, no shading.
//
function drawFlatLog(k, ox, oy, w, h, color) {
  const LOG_END_STEPS = 16
  const LOG_END_SQUASH = 0.55
  const halfW = w / 2
  const halfH = h / 2
  const endR = halfH
  const sq = LOG_END_SQUASH
  const bodyPts = []
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(-halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  for (let i = 0; i <= LOG_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / LOG_END_STEPS
    bodyPts.push(k.vec2(halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  k.drawPolygon({ pts: bodyPts, color })
}
//
// Draws the revealed hidden bonus platform in the letter-log style: flat
// environment-toned barrel before L, detailed wood once L is collected.
//
function drawBonusPlatformLog(k, bonus, zones, logDetail) {
  const cx = bonus.x + bonus.shakeOffsetX
  const cy = bonus.y
  const fade = zones._sceneRef?.colorFade ?? 0
  if (fade > 0.01 || zones.lCollected) {
    drawLogPlatform(k, BONUS_PLAT_W, LOG_H, cx, cy, bonus.platformOpacity, logDetail)
    return
  }
  drawFlatLog(k, cx, cy, BONUS_PLAT_W, LOG_H, getRGB(k, GLOW_PAL.treeGray.trunk))
}
//
// Blinking letter — optional gold fill for G, value 1 offset-outline.
//
function createGlowLetter(k, char, x, y, tiltDeg, fillHex = GLOW_PAL.letterFill) {
  const fill = getRGB(k, fillHex)
  const oo = GLOW_LETTER_OUTLINE
  const offsets = [
    [-oo, -oo], [0, -oo], [oo, -oo],
    [-oo, 0], [oo, 0],
    [-oo, oo], [0, oo], [oo, oo]
  ]
  const outlines = offsets.map(([dx, dy]) => {
    const obj = k.add([
      k.text(char, { size: GLOW_LETTER_SIZE, font: GLOW_LETTER_FONT }),
      k.pos(x + dx, y + dy),
      k.anchor('center'),
      k.rotate(tiltDeg),
      k.color(GLOW_LETTER_OUTLINE_R, GLOW_LETTER_OUTLINE_G, GLOW_LETTER_OUTLINE_B),
      k.z(CFG.visual.zIndex.player - 2)
    ])
    obj.hidden = true
    return obj
  })
  const main = k.add([
    k.text(char, { size: GLOW_LETTER_SIZE, font: GLOW_LETTER_FONT }),
    k.pos(x, y),
    k.anchor('center'),
    k.rotate(tiltDeg),
    k.color(fill.r, fill.g, fill.b),
    k.z(CFG.visual.zIndex.player - 1)
  ])
  main.hidden = true
  return { main, outlines, allObjects: [main, ...outlines], char, x, y }
}
//
// Swaying grass — thick baked blade sprites growing in tufts (never an even
// spread), excludes water and trunk. Blades are baked white and tinted at
// draw time so gray and green modes share the same sprites.
//
function createGlowGrass(k, waterX1, waterX2, zones) {
  loadGrassBladeSprites(k)
  const left = LEFT_MARGIN + 20
  const right = SCREEN_W - RIGHT_MARGIN - 20
  const trunkL = TREE_X - TRUNK_EXCLUDE_HALF
  const trunkR = TREE_X + TRUNK_EXCLUDE_HALF
  const excluded = (x) => (x >= waterX1 && x <= waterX2) || (x >= trunkL && x <= trunkR)
  const blades = []
  let tufts = 0
  let attempts = 0
  while (tufts < GRASS_TUFT_COUNT && attempts < GRASS_TUFT_COUNT * 8) {
    attempts++
    const centerX = left + Math.random() * (right - left)
    if (excluded(centerX)) continue
    tufts++
    //
    // Each tuft packs several blades close around its centre with mixed
    // variants, scales and flips so no two tufts look alike.
    //
    const count = GRASS_TUFT_BLADES_MIN + Math.floor(Math.random() * (GRASS_TUFT_BLADES_RANGE + 1))
    for (let b = 0; b < count; b++) {
      const x = centerX + (Math.random() - 0.5) * 2 * GRASS_TUFT_SPREAD
      if (excluded(x)) continue
      blades.push({
        x,
        variant: Math.floor(Math.random() * GRASS_BLADE_VARIANTS),
        scale: GRASS_BLADE_SCALE_MIN + Math.random() * GRASS_BLADE_SCALE_RANGE,
        flipX: Math.random() < 0.5,
        swaySpeed: GRASS_SWAY_SPEED_MIN + Math.random() * GRASS_SWAY_SPEED_RANGE,
        swayPhase: Math.random() * Math.PI * 2,
        side: x >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
      })
    }
  }
  const layer = k.add([
    k.z(GRASS_Z),
    {
      draw() {
        drawGlowGrassBlades(k, zones, blades)
      }
    }
  ])
  layer.hidden = true
  return layer
}
//
// Bakes the white grass-blade sprite variants (tapered curved silhouettes,
// some with a shorter side leaf) used by the tuft renderer.
//
function loadGrassBladeSprites(k) {
  for (let i = 0; i < GRASS_BLADE_VARIANTS; i++) {
    const canvas = document.createElement('canvas')
    canvas.width = GRASS_BLADE_W
    canvas.height = GRASS_BLADE_H
    const ctx = canvas.getContext('2d')
    drawGrassBladeShape(ctx, GRASS_BLADE_W / 2, GRASS_BLADE_H, GRASS_BLADE_H)
    //
    // Roughly half the variants carry a shorter side leaf for variety.
    //
    Math.random() < 0.5 && drawGrassBladeShape(ctx, GRASS_BLADE_W / 2 + (Math.random() < 0.5 ? -3 : 3), GRASS_BLADE_H, GRASS_BLADE_H * (0.45 + Math.random() * 0.2))
    k.loadSprite(GRASS_SPRITE_PREFIX + i, canvas)
    canvas.width = 0
    canvas.height = 0
  }
}
//
// Draws one tapered blade silhouette in white: wide at the base, curving to
// a sharp tip, filled as a closed path so the blade reads thick.
//
function drawGrassBladeShape(ctx, baseX, baseY, height) {
  const bend = (Math.random() - 0.5) * 9
  const tipX = baseX + bend
  const tipY = baseY - height + 2
  const halfW = 1.6 + Math.random() * 1.5
  ctx.fillStyle = '#ffffff'
  ctx.beginPath()
  ctx.moveTo(baseX - halfW, baseY)
  ctx.quadraticCurveTo(baseX - halfW + bend * 0.35, baseY - height * 0.55, tipX, tipY)
  ctx.quadraticCurveTo(baseX + halfW + bend * 0.35, baseY - height * 0.55, baseX + halfW, baseY)
  ctx.closePath()
  ctx.fill()
}
//
// Per-frame tuft renderer: each blade is a tinted sprite anchored at its
// base, swaying by a few degrees of rotation.
//
function drawGlowGrassBlades(k, zones, blades) {
  if (!zones.groundDecorRight && !zones.groundDecorLeft) return
  const fade = zones._sceneRef?.colorFade ?? 0
  //
  // Grass shares the mushroom/rock decor tone: plain decor gray before L,
  // darkened toward void after L, cross-fading to green in the colour world.
  //
  const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(zones._sceneRef))
  const c = lerpRgb(gray, GRASS_GREEN, fade)
  const color = k.rgb(c.r, c.g, c.b)
  const time = k.time()
  for (const blade of blades) {
    if (blade.side === 'left' && !zones.groundDecorLeft) continue
    if (blade.side === 'right' && !zones.groundDecorRight) continue
    const angle = Math.sin(time * blade.swaySpeed + blade.swayPhase) * GRASS_SWAY_DEG
    k.drawSprite({
      sprite: GRASS_SPRITE_PREFIX + blade.variant,
      pos: k.vec2(blade.x, FLOOR_Y),
      anchor: 'bot',
      width: GRASS_BLADE_W * blade.scale,
      height: GRASS_BLADE_H * blade.scale,
      angle,
      flipX: blade.flipX,
      color
    })
  }
}
//
// Rocks — flat value 5 silhouettes.
//
function createGlowRocks(k, treeBaseLeftX, rightPlatX, zones) {
  const objs = []
  let spriteIdx = 0
  const clusterCenterX = treeBaseLeftX + 40
  for (let i = 0; i < 6; i++) {
    const radius = CLUSTER_ROCK_RADIUS_MIN + Math.random() * (CLUSTER_ROCK_RADIUS_MAX - CLUSTER_ROCK_RADIUS_MIN)
    const angle = (Math.PI / 5) * i
    const spread = 35 + Math.random() * 25
    const cx = clusterCenterX + Math.cos(angle) * spread * 0.5
    objs.push(placeRock(k, cx, radius, `glow0-rock-${spriteIdx++}`, 'left', true))
  }
  const waterShoreEndX = clusterCenterX + CLUSTER_ROCK_RADIUS_MAX + 10
  const shoreRockX = waterShoreEndX - WATER_SHORE_ROCK_OFFSET_X
  const shoreRockR = CLUSTER_ROCK_RADIUS_MIN + Math.random() * (CLUSTER_ROCK_RADIUS_MAX - CLUSTER_ROCK_RADIUS_MIN) * 0.85
  //
  // Shore rock is horizontally stretched so it fully hides the water edge.
  //
  objs.push(placeRock(k, shoreRockX, shoreRockR, `glow0-rock-${spriteIdx++}`, 'left', true, LAKE_Z + 2, SHORE_ROCK_WIDTH_SCALE))
  //
  // Right side — scatter rocks spread across the whole lower-right ground.
  //
  const rightEdge = SCREEN_W - RIGHT_MARGIN - 40
  for (let i = 0; i < RIGHT_ROCK_COUNT; i++) {
    const radius = SCATTER_ROCK_RADIUS_MIN + Math.random() * (SCATTER_ROCK_RADIUS_MAX - SCATTER_ROCK_RADIUS_MIN)
    const cx = TREE_X + 80 + Math.random() * (rightEdge - TREE_X - 80)
    objs.push(placeRock(k, cx, radius, `glow0-rock-${spriteIdx++}`, 'right'))
  }
  return objs
}
//
// Pre-renders a flat rock sprite.
//
function placeRock(k, worldX, radius, spriteName, side, waterCluster = false, z = 7, widthScale = 1) {
  const totalW = Math.ceil(radius * 2.6 * widthScale)
  const totalH = Math.ceil(radius * 1.9)
  const cx = totalW / (2 * widthScale)
  const cy = totalH * 0.56
  const randSink = Math.random() * 4
  const posY = FLOOR_Y - totalH * 0.62 + randSink
  const croppedH = Math.max(8, Math.ceil(totalH * 0.62 - randSink))
  const verts = buildRockVertices(radius)
  const flatPalette = {
    fillR: DECOR_GRAY.r, fillG: DECOR_GRAY.g, fillB: DECOR_GRAY.b,
    lightR: DECOR_GRAY.r, lightG: DECOR_GRAY.g, lightB: DECOR_GRAY.b,
    darkR: DECOR_GRAY.r, darkG: DECOR_GRAY.g, darkB: DECOR_GRAY.b
  }
  const rockCanvas = toCanvas({ width: totalW, height: croppedH, pixelRatio: 1 }, (ctx) => {
    ctx.scale(widthScale, 1)
    drawRockToCanvas(ctx, { cx, cy, radius, verts, palette: flatPalette, skipOutline: true })
  })
  k.loadSprite(spriteName, rockCanvas)
  rockCanvas.width = 0
  rockCanvas.height = 0
  //
  // Outlined variant for the colour world — same silhouette with a thin rim
  // in the dark palette neighbour of the rock's gray fill.
  //
  const rockOutlineCanvas = toCanvas({ width: totalW, height: croppedH, pixelRatio: 1 }, (ctx) => {
    ctx.scale(widthScale, 1)
    drawRockToCanvas(ctx, {
      cx, cy, radius, verts, palette: flatPalette,
      outlineColor: `rgb(${DECOR_OUTLINE_RGB.r}, ${DECOR_OUTLINE_RGB.g}, ${DECOR_OUTLINE_RGB.b})`,
      outlineWidth: DECOR_OUTLINE_WIDTH
    })
  })
  k.loadSprite(spriteName + DECOR_OUTLINE_SUFFIX, rockOutlineCanvas)
  rockOutlineCanvas.width = 0
  rockOutlineCanvas.height = 0
  const obj = k.add([k.sprite(spriteName), k.pos(worldX - totalW / 2, posY), k.z(z)])
  obj._graySprite = spriteName
  obj._outlineSprite = spriteName + DECOR_OUTLINE_SUFFIX
  obj._outlined = false
  obj._side = side
  obj._waterCluster = waterCluster
  obj._homeX = worldX - totalW / 2
  obj._homeY = posY
  obj.hidden = true
  obj.pos.y = PLATFORM_HIDE_Y
  return obj
}
//
// Mushrooms — value 5, excluded from water zone.
//
function createGlowMushrooms(k, waterX1, waterX2, zones) {
  const objs = []
  const left = LEFT_MARGIN + 60
  const right = SCREEN_W - RIGHT_MARGIN - 60
  for (let i = 0; i < MUSHROOM_COUNT; i++) {
    const capW = MUSHROOM_CAP_W_MIN + Math.random() * (MUSHROOM_CAP_W_MAX - MUSHROOM_CAP_W_MIN)
    const capH = capW * (0.38 + Math.random() * 0.25)
    const stemH = MUSHROOM_STEM_H_MIN + Math.random() * (MUSHROOM_STEM_H_MAX - MUSHROOM_STEM_H_MIN)
    const stemW = capW * (0.25 + Math.random() * 0.15)
    const totalW = Math.ceil(capW + 4)
    const totalH = Math.ceil(capH + stemH + 4)
    let posX = left + Math.random() * (right - left)
    let safety = 0
    while ((posX >= waterX1 && posX <= waterX2) && safety < 40) {
      posX = left + Math.random() * (right - left)
      safety++
    }
    if (posX >= waterX1 && posX <= waterX2) continue
    const posY = FLOOR_Y - totalH + MUSHROOM_EXTRA_LOWER
    const spriteName = `glow0-mush-${i}`
    //
    // Bake a WHITE flat silhouette — the per-frame tint (updateMushroomTints)
    // multiplies it to the exact palette tone: DECOR_GRAY in the gray phase
    // (same tone as the trampoline mushroom), cap colour after O.
    //
    const mushCanvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawMushroomToCanvas(ctx, {
        cx: totalW / 2,
        baseY: totalH - 2,
        capWidth: capW,
        capHeight: capH,
        stemWidth: stemW,
        stemHeight: stemH,
        capColor: [255, 255, 255],
        outlineAlpha: 0,
        flat: true
      })
    })
    k.loadSprite(spriteName, mushCanvas)
    mushCanvas.width = 0
    mushCanvas.height = 0
    //
    // Colour-world variant — baked in the real cap colour with full detail
    // (highlight arc, cap dots) and a thin outline in the dark counterpart of
    // the cap colour. Displayed untinted (white tint) once the world colours.
    //
    const capIdx = i % MUSHROOM_CAP_COLORS.length
    const capDark = MUSHROOM_CAP_DARK_COLORS[capIdx]
    const mushColorCanvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawMushroomToCanvas(ctx, {
        cx: totalW / 2,
        baseY: totalH - 2,
        capWidth: capW,
        capHeight: capH,
        stemWidth: stemW,
        stemHeight: stemH,
        capColor: MUSHROOM_CAP_COLORS[capIdx],
        outlineColor: `rgb(${capDark[0]}, ${capDark[1]}, ${capDark[2]})`,
        outlineWidth: DECOR_OUTLINE_WIDTH
      })
    })
    k.loadSprite(spriteName + DECOR_OUTLINE_SUFFIX, mushColorCanvas)
    mushColorCanvas.width = 0
    mushColorCanvas.height = 0
    const obj = k.add([k.sprite(spriteName), k.pos(posX - totalW / 2, posY), k.z(7)])
    obj._graySprite = spriteName
    obj._outlineSprite = spriteName + DECOR_OUTLINE_SUFFIX
    obj._outlined = false
    obj._colorCap = MUSHROOM_CAP_COLORS[capIdx]
    obj._side = posX >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
    obj._homeX = posX - totalW / 2
    obj._homeY = posY
    obj.hidden = true
    obj.pos.y = PLATFORM_HIDE_Y
    objs.push(obj)
  }
  return objs
}
//
// Mushroom trampoline — flat value 5 silhouette (no outline in the gray phase).
//
function createMushroomTrampoline(k, trampX, floorY, zones) {
  const mushCanvas = toCanvas({ width: TRAMP_TOTAL_W, height: TRAMP_TOTAL_H, pixelRatio: 1 }, (ctx) => {
    drawTrampolineShape(ctx)
  })
  k.loadSprite(TRAMP_SPRITE, mushCanvas)
  mushCanvas.width = 0
  mushCanvas.height = 0
  //
  // Colour-world variant — same silhouette drawn through the shared mushroom
  // primitive, so the cap carries the highlight + dots pattern and the rim.
  //
  const mushOutlineCanvas = toCanvas({ width: TRAMP_TOTAL_W, height: TRAMP_TOTAL_H, pixelRatio: 1 }, (ctx) => {
    drawMushroomToCanvas(ctx, {
      cx: TRAMP_TOTAL_W / 2,
      baseY: TRAMP_TOTAL_H - 2,
      capWidth: TRAMP_CAP_W,
      capHeight: TRAMP_CAP_H,
      stemWidth: TRAMP_STEM_W,
      stemHeight: TRAMP_STEM_H,
      capColor: [DECOR_GRAY.r, DECOR_GRAY.g, DECOR_GRAY.b],
      outlineColor: `rgb(${DECOR_OUTLINE_RGB.r}, ${DECOR_OUTLINE_RGB.g}, ${DECOR_OUTLINE_RGB.b})`,
      outlineWidth: DECOR_OUTLINE_WIDTH
    })
  })
  k.loadSprite(TRAMP_OUTLINE_SPRITE, mushOutlineCanvas)
  mushOutlineCanvas.width = 0
  mushOutlineCanvas.height = 0
  const spritePos = k.vec2(trampX - TRAMP_TOTAL_W / 2, floorY - TRAMP_TOTAL_H + TRAMP_SINK_Y)
  const state = { squash: 0, cooldown: 0, x: trampX }
  const colliderHome = { x: trampX - TRAMP_CAP_W / 2, y: floorY - TRAMP_TOTAL_H }
  const drawLayer = k.add([
    k.z(6),
    {
      draw() {
        if (!zones.groundDecorRight) return
        //
        // Colour world swaps in the outlined sprite variant; the gray phase
        // applies the after-L darkening tint (white = untinted).
        //
        const outlined = (zones._sceneRef?.colorFade ?? 0) >= 0.5
        const sprite = outlined ? TRAMP_OUTLINE_SPRITE : TRAMP_SPRITE
        const tint = outlined ? { r: 255, g: 255, b: 255 } : grayDecorTint(zones._sceneRef)
        const color = k.rgb(tint.r, tint.g, tint.b)
        if (state.squash > 0.01) {
          const scaleY = 1 - state.squash * 0.35
          spritePos.y = floorY - TRAMP_TOTAL_H * scaleY + TRAMP_SINK_Y
          k.drawSprite({ sprite, pos: spritePos, scale: k.vec2(1, scaleY), color })
        } else {
          spritePos.y = floorY - TRAMP_TOTAL_H + TRAMP_SINK_Y
          k.drawSprite({ sprite, pos: spritePos, color })
        }
      }
    }
  ])
  drawLayer.hidden = true
  return { state, drawLayer, colliderHome }
}
//
// Draws the gray-phase trampoline mushroom silhouette (stem trapezoid + cap
// half-ellipse) in the flat decor tone with no outline and no cap details.
//
function drawTrampolineShape(ctx) {
  const cx = TRAMP_TOTAL_W / 2
  const stemTop = TRAMP_TOTAL_H - TRAMP_STEM_H - 2
  ctx.fillStyle = `rgb(${DECOR_GRAY.r}, ${DECOR_GRAY.g}, ${DECOR_GRAY.b})`
  ctx.lineJoin = 'round'
  ctx.beginPath()
  ctx.moveTo(cx - TRAMP_STEM_W / 2, TRAMP_TOTAL_H - 2)
  ctx.lineTo(cx - TRAMP_STEM_W * 0.4, stemTop)
  ctx.lineTo(cx + TRAMP_STEM_W * 0.4, stemTop)
  ctx.lineTo(cx + TRAMP_STEM_W / 2, TRAMP_TOTAL_H - 2)
  ctx.closePath()
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(cx, stemTop, TRAMP_CAP_W / 2, TRAMP_CAP_H, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
}
//
// Water — value 5 fill bounded by wave polygon.
//
function createWater(k, x1, x2, zones) {
  const waterY = FLOOR_Y - 8
  const p1 = k.vec2(0, 0)
  const p2 = k.vec2(0, 0)
  const ptsCache = Array.from({ length: LAKE_SEGMENTS + 3 }, () => k.vec2(0, 0))
  return k.add([
    k.z(LAKE_Z),
    {
      draw() {
        if (!zones.water) return
        const fade = zones._sceneRef?.colorFade ?? 0
        const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(zones._sceneRef))
        const tint = { r: WATER_COLOR.r, g: WATER_COLOR.g, b: WATER_COLOR.b }
        const c = lerpRgb(gray, tint, fade)
        const time = k.time()
        for (let i = 0; i <= LAKE_SEGMENTS; i++) {
          const t = i / LAKE_SEGMENTS
          ptsCache[i].x = x1 + t * (x2 - x1)
          ptsCache[i].y = waterY + Math.sin(time * LAKE_WAVE_FREQ + t * LAKE_WAVE_PHASE_SCALE) * LAKE_WAVE_AMP
        }
        ptsCache[LAKE_SEGMENTS + 1].x = x2
        ptsCache[LAKE_SEGMENTS + 1].y = FLOOR_Y
        ptsCache[LAKE_SEGMENTS + 2].x = x1
        ptsCache[LAKE_SEGMENTS + 2].y = FLOOR_Y
        k.drawPolygon({ pts: ptsCache, color: k.rgb(c.r, c.g, c.b) })
        for (let i = 0; i < LAKE_SEGMENTS; i++) {
          p1.x = ptsCache[i].x
          p1.y = ptsCache[i].y
          p2.x = ptsCache[i + 1].x
          p2.y = ptsCache[i + 1].y
          k.drawLine({ p1, p2, width: 2, color: k.rgb(c.r, c.g, c.b) })
        }
      }
    }
  ])
}
//
// Below-ground mask over the lake band — hides the sinking part of the hero
// once it crosses the ground line while drowning. Painted in the same colour
// as the below-ground playfield so it is invisible as a shape.
//
function createDrownMask(k, x1, x2, zones) {
  return k.add([
    k.z(LAKE_Z),
    {
      draw() {
        const sc = zones._sceneRef
        if (!sc?.drowning) return
        const innerGray = isOuterFrameVisible(zones) && isPlayfieldInnerGrayVisible(zones, sc.colorFade)
        //
        // Match the below-ground playfield tone exactly (same formula as the
        // main draw): inner gray, darkened after L, fading toward the dark
        // earth band once the colour world is in.
        //
        const grayGround = zones.lZone && innerGray ? lerpRgb(INNER_GRAY, VOID, GROUND_L_DARKEN) : (innerGray ? INNER_GRAY : VOID)
        const c = innerGray ? lerpRgb(grayGround, GROUND_DARK, sc.colorFade) : grayGround
        //
        // The mask extends past the lake's right edge so a hero drowning by
        // the shore is fully covered below the ground line.
        //
        k.drawRect({
          pos: k.vec2(x1, FLOOR_Y),
          width: x2 - x1 + DROWN_MASK_RIGHT_PAD,
          height: PLAYFIELD_BOTTOM_Y - FLOOR_Y,
          color: k.rgb(c.r, c.g, c.b)
        })
      }
    }
  ])
}
//
// Sun — drawn inside the background pass BEHIND the forest plane, so trees
// near the right edge can overlap the disc instead of the sun floating in
// front of them.
//
function drawSunLayer(inst) {
  const k = inst.k
  const zones = inst.zones
  if (!zones.lZoneSun) return
  const fade = inst.colorFade
  //
  // After L the sun matches the main tree's lit foliage tone; the colour
  // world fades it toward the warm orange.
  //
  const litLeaf = glowRgb(GLOW_PAL.treeLit.leaf)
  const orange = { r: SUN_BRIGHT.r, g: SUN_BRIGHT.g, b: SUN_BRIGHT.b }
  const c = lerpRgb(litLeaf, orange, fade)
  fade > 0.05 && k.drawSprite({
    sprite: SUN_HALO_SPRITE,
    pos: k.vec2(SUN_X, SUN_Y),
    anchor: 'center',
    opacity: 0.85 * fade
  })
  k.drawCircle({ pos: k.vec2(SUN_X, SUN_Y), radius: SUN_RADIUS, color: k.rgb(c.r, c.g, c.b) })
}
//
// Detects which surface the hero stands on.
//
function detectGlowSurface(inst) {
  const hero = inst.heroInst?.character
  if (!hero?.pos) return 'air'
  const grounded = hero.isGrounded?.() ?? false
  if (!grounded) return 'air'
  const x = hero.pos.x
  const footY = hero.pos.y + SURFACE_DETECT_Y
  for (const s of inst.woodSurfaces) {
    if (x >= s.x1 - 8 && x <= s.x2 + 8 && footY >= s.y - 18 && footY <= s.y + s.h + 28) {
      return 'wood'
    }
  }
  if (footY >= FLOOR_Y - 30) return 'ground'
  return 'air'
}
//
// True when hero feet are inside the lake band at floor level — the whole
// lake is deep now, drowning applies from the left margin to the shore rocks.
//
function isInWaterZone(inst, x, footY) {
  return x >= inst.lakeX1 && x <= inst.lakeX2 && footY >= FLOOR_Y - 40
}
//
// True when hero landed inside a platform reveal trigger.
//
function inPlatTrigger(x, y, trig) {
  return x >= trig.x1 && x <= trig.x2 && y >= trig.y && y <= trig.y2
}
//
// Outer margin frame — visible after G (tree reveal), before inner gray fill.
//
function isOuterFrameVisible(zones) {
  return zones.outerFrame
}
//
// Inner playfield gray — parallax after L or colour world after O.
//
function isPlayfieldInnerGrayVisible(zones, fade) {
  return zones.lZoneParallax || zones.groundBg || fade > 0
}
//
// Keeps Kaplay clear colour and page chrome aligned with the outer frame.
//
function syncGlowCanvasBackdrop(k, zones) {
  CanvasBackdrop.applyCanvasBackdrop(k, isOuterFrameVisible(zones) ? OUTER_BG_HEX : GLOW_PAL.void)
}
//
// Main draw — void until G opens the outer frame; inner gray after L/O.
//
function onDraw(inst) {
  const k = inst.k
  const fade = inst.colorFade
  const zones = inst.zones
  const gameW = SCREEN_W - LEFT_MARGIN - RIGHT_MARGIN
  const outerFrame = isOuterFrameVisible(zones)
  const innerGray = isPlayfieldInnerGrayVisible(zones, fade)
  if (outerFrame) {
    k.drawRect({ pos: k.vec2(0, 0), width: SCREEN_W, height: SCREEN_H, color: k.rgb(OUTER.r, OUTER.g, OUTER.b) })
    const inner = innerGray ? INNER_GRAY : VOID
    //
    // Colour world splits the playfield backdrop at the ground line: light
    // blue sky above it, dark earth in the root zone below. Both lerp from
    // the flat inner gray as the colour fade progresses. After L the gray
    // root zone already reads darker than the sky band above it.
    //
    const grayGround = zones.lZone && innerGray ? lerpRgb(INNER_GRAY, VOID, GROUND_L_DARKEN) : inner
    const skyC = lerpRgb(inner, SKY_COLOR, fade)
    const groundC = lerpRgb(grayGround, GROUND_DARK, fade)
    k.drawRect({
      pos: k.vec2(LEFT_MARGIN, TOP_MARGIN),
      width: gameW,
      height: FLOOR_Y - TOP_MARGIN,
      color: k.rgb(skyC.r, skyC.g, skyC.b)
    })
    k.drawRect({
      pos: k.vec2(LEFT_MARGIN, FLOOR_Y),
      width: gameW,
      height: PLAYFIELD_BOTTOM_Y - FLOOR_Y,
      color: k.rgb(groundC.r, groundC.g, groundC.b)
    })
    //
    // Underground decor (buried rocks, burrows, tunnels, cracks) sits right
    // on top of the earth band, behind the main-tree roots.
    //
    innerGray && drawUndergroundLayer(inst)
  } else {
    k.drawRect({ pos: k.vec2(0, 0), width: SCREEN_W, height: SCREEN_H, color: k.rgb(VOID.r, VOID.g, VOID.b) })
  }
  //
  // Sun is part of the background pass — BEHIND the birds and the forest.
  //
  drawSunLayer(inst)
  //
  // Birds glide across the sky behind both forest planes (colour world only).
  //
  drawBackgroundBirds(inst)
  if (inst.zones.lZoneParallax) {
    //
    // The forest is OPAQUE — brightness is baked into the sprite colours.
    // The only transparencies are transient: the fade-in reveal after L and
    // the gray↔colour crossfade after O.
    //
    const pf = inst.parallaxFade
    //
    // Depth order: far bushes → far plane → near plane → near bushes.
    //
    k.drawSprite({ sprite: BUSH_FAR_GRAY_SPRITE, pos: k.vec2(0, 0), opacity: (1 - fade) * pf })
    fade > 0 && k.drawSprite({ sprite: BUSH_FAR_GREEN_SPRITE, pos: k.vec2(0, 0), opacity: fade * pf })
    k.drawSprite({ sprite: PAR_FAR_SPRITE, pos: k.vec2(0, 0), width: SCREEN_W, height: SCREEN_H, opacity: (1 - fade) * pf })
    fade > 0 && k.drawSprite({ sprite: PAR_FAR_COLOR_SPRITE, pos: k.vec2(0, 0), width: SCREEN_W, height: SCREEN_H, opacity: fade * pf })
    k.drawSprite({ sprite: PAR_NEAR_SPRITE, pos: k.vec2(0, 0), width: SCREEN_W, height: SCREEN_H, opacity: (1 - fade) * pf })
    fade > 0 && k.drawSprite({ sprite: PAR_NEAR_COLOR_SPRITE, pos: k.vec2(0, 0), width: SCREEN_W, height: SCREEN_H, opacity: fade * pf })
    k.drawSprite({ sprite: BUSH_GRAY_SPRITE, pos: k.vec2(0, 0), opacity: (1 - fade) * pf })
    fade > 0 && k.drawSprite({ sprite: BUSH_GREEN_SPRITE, pos: k.vec2(0, 0), opacity: fade * pf })
  }
  if (inst.zones.tree) {
    const showColorTree = fade >= 0.5
    inst.treeObj.hidden = showColorTree
    inst.treeColorObj.hidden = !showColorTree
    if (!inst.treeRevealActive) {
      inst.treeObj.opacity = 1
      inst.treeColorObj.opacity = 1
    }
  }
  updateMushroomTints(inst)
}
//
// Tints border walls toward playfield gray as the ground zone opens.
//
function updatePlayfieldBorderColors(inst) {
  const fade = inst.colorFade
  if (!inst.wallObjs?.length) return
  const dark = { r: VOID.r, g: VOID.g, b: VOID.b }
  const border = { r: WALL_BORDER_R, g: WALL_BORDER_G, b: WALL_BORDER_B }
  const t = isOuterFrameVisible(inst.zones) ? 1 : fade
  const c = lerpRgb(dark, border, t)
  inst.wallObjs.forEach(wall => {
    wall.color = inst.k.rgb(c.r, c.g, c.b)
  })
}
//
// Tints mushroom sprites toward their color caps as the world fades in.
//
function updateMushroomTints(inst) {
  const fade = inst.colorFade
  //
  // After L the gray decor phase runs darker — the base tone shifts toward
  // void and dissolves back as the colour world fades in.
  //
  const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(inst))
  const white = { r: 255, g: 255, b: 255 }
  inst.mushObjs.forEach(obj => {
    if (obj.hidden || !obj._colorCap) return
    //
    // Colour-world sprite is pre-baked in the real cap colour with details —
    // fade its multiply tint from gray toward white so the true colours and
    // the cap dots/highlight appear as the world colours in.
    //
    if (obj._outlined) {
      const t = Math.max(0, (fade - 0.5) * 2)
      const c = lerpRgb(gray, white, t)
      obj.color = inst.k.rgb(c.r, c.g, c.b)
      return
    }
    const cap = obj._colorCap
    const color = { r: cap[0], g: cap[1], b: cap[2] }
    const c = lerpRgb(gray, color, fade)
    obj.color = inst.k.rgb(c.r, c.g, c.b)
  })
  updateRockTints(inst)
  updateDecorOutlines(inst)
}
//
// Rocks are baked in DECOR_GRAY, so the after-L darkening is applied as a
// multiply tint. Outlined (colour-world) rocks always render untinted.
//
function updateRockTints(inst) {
  const tint = grayDecorTint(inst)
  inst.rockObjs.forEach(obj => {
    if (obj.hidden) return
    const c = obj._outlined ? { r: 255, g: 255, b: 255 } : tint
    obj.color = inst.k.rgb(c.r, c.g, c.b)
  })
}
//
// Swaps mushrooms and rocks to their outlined sprite variants once the colour
// world is at least half faded in (dark rims appear after O).
//
function updateDecorOutlines(inst) {
  const outlined = inst.colorFade >= 0.5
  const swap = obj => {
    if (!obj._outlineSprite || obj._outlined === outlined) return
    obj._outlined = outlined
    obj.use(inst.k.sprite(outlined ? obj._outlineSprite : obj._graySprite))
  }
  inst.mushObjs.forEach(swap)
  inst.rockObjs.forEach(swap)
}
//
// True when hero should drown — anywhere in the lake band at floor level.
//
function shouldDrownInWater(inst, heroX, footY) {
  return isInWaterZone(inst, heroX, footY)
}
//
// Starts the color-world fade after O dialog closes.
//
function startColorWorldFade(inst) {
  inst.zones.colorWorld = true
  inst.zones.groundBg = true
  set(KEY_REVEALED_GROUND_BG, true)
  inst.colorFadeTarget = 1
  CanvasBackdrop.applyCanvasBackdrop(inst.k, OUTER_BG_HEX)
  !inst.zones.water && revealWaterZone(inst, false)
  applyColorWorldHero(inst)
  applyZoneVisibility(inst)
}
//
// Turns the hero gold when the forest gains colour (menu glow anti-hero tone).
// The HUD small hero (top-right scoreboard) is recoloured in sync so both
// always show the same variant: whitish before O, gold inside after.
//
function applyColorWorldHero(inst) {
  if (inst.heroGoldApplied) return
  inst.heroGoldApplied = true
  recolorHeroToGold(inst.k, inst.heroInst)
  inst.levelIndicator?.smallHero && recolorHeroToGold(inst.k, inst.levelIndicator.smallHero)
}
//
// Rebakes a hero instance in the glow gold body colour and swaps the sprite.
// The sprite prefix MUST be rebuilt with the same formula hero.js uses
// (including the eye-white and leg-strip suffixes) — otherwise `use()` keeps
// pointing at the old whitish sprites and the hero never turns gold.
//
function recolorHeroToGold(k, hero) {
  if (!hero?.character?.exists?.()) return
  hero.bodyColor = GLOW_GOLD_HEX.replace('#', '')
  hero.spritePrefix = buildHeroSpritePrefix(hero)
  Hero.loadHeroSprites(hero)
  k.wait(GOLD_SWAP_DELAY, () => {
    if (!hero.character?.exists?.()) return
    try {
      hero.character.use(k.sprite(`${hero.spritePrefix}_0_0`))
    } catch (error) {
      //
      // Sprite bake may lag one frame — tint still snaps via bodyColor on next load
      //
    }
    //
    // Neutral tint — the sprite is baked in the menu anti-hero gold already;
    // any grey multiply here would dull the gold to a washed-out white.
    //
    hero.character.color = k.rgb(255, 255, 255)
  })
}
//
// Mirrors the sprite prefix formula from hero.js create()/loadHeroSprites().
//
function buildHeroSpritePrefix(hero) {
  const body = String(hero.bodyColor || CFG.visual.colors.hero.body).replace('#', '')
  const outline = String(hero.outlineColor || CFG.visual.colors.outline).replace('#', '')
  const eyeWhite = hero.eyeWhiteColor ? String(hero.eyeWhiteColor).replace('#', '') : ''
  return `${hero.type}_${body}_${outline}`
    + `${hero.addMouth ? '_mouth' : ''}${hero.addArms ? '_arms' : ''}${hero.addWatch ? '_watch' : ''}`
    + `${hero.outlineOnly ? '_outline' : ''}${eyeWhite ? '_ew' + eyeWhite : ''}${hero.addLegStrip ? '_ls' : ''}`
}
//
// Reveals the sun after L dialog closes.
//
function revealLSunZone(inst) {
  if (inst.zones.lZoneSun) return
  inst.zones.lZoneSun = true
  inst.zones.lZone = true
  set(KEY_REVEALED_L_SUN, true)
  playSegmentRevealSound(inst)
}
//
// Reveals parallax one second after the sun.
//
function revealLParallaxZone(inst) {
  if (inst.zones.lZoneParallax) return
  inst.zones.lZoneParallax = true
  set(KEY_REVEALED_L, true)
  playSegmentRevealSound(inst)
  syncGlowCanvasBackdrop(inst.k, inst.zones)
  applyZoneVisibility(inst)
}
//
// Short chime when a new world segment unlocks.
//
function playSegmentRevealSound(inst) {
  Sound.playLetterPickupSoft(inst.sound)
}
//
// Opens a letter dialog with glow styling.
//
function openGlowLetterDialog(inst, text, onCloseExtra) {
  inst.dialogOpen = true
  //
  // Letterbox bars must match the current level background: gray once the
  // outer frame is revealed, void before it — no stripes around the canvas.
  //
  const backdropHex = isOuterFrameVisible(inst.zones) ? OUTER_BG_HEX : GLOW_PAL.void
  LevelHelp.openStandalonePanel(inst.k, text, {
    fillRgb: { r: DIALOG_FILL.r, g: DIALOG_FILL.g, b: DIALOG_FILL.b },
    textRgb: { r: LIGHT_GRAY.r, g: LIGHT_GRAY.g, b: LIGHT_GRAY.b },
    borderRgb: { r: DECOR_GRAY.r, g: DECOR_GRAY.g, b: DECOR_GRAY.b },
    sceneBackdropHex: backdropHex,
    textStyles: { hl: { color: inst.k.rgb(inst.goldRgb.r, inst.goldRgb.g, inst.goldRgb.b), override: true } },
    onClose: () => {
      inst.dialogOpen = false
      onCloseExtra?.()
    }
  })
}
//
// Hero touches the G pickup letter — dialog, HUD, tree reveal only (no ground/parallax).
//
function collectLetterG(inst) {
  if (inst.zones.gCollected || inst.dialogOpen) return
  inst.zones.gCollected = true
  set(KEY_COLLECTED_G, true)
  //
  // Intro hints end the moment the first letter is taken.
  //
  HeroHint.clear(inst.heroHint)
  inst.gLetter?.allObjects?.forEach(obj => obj.destroy?.())
  inst.gLetter = null
  Sound.playLetterPickupSoft(inst.sound)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 1, inst.zones.colorWorld)
  } else {
    //
    // The indicator may pre-exist with a hidden GLOW word (fragment / life
    // HUD before G) — taking G finally names the level.
    //
    LevelIndicator.setSectionLabelHidden(inst.levelIndicator, false)
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 1)
  }
  LevelIndicator.flashLetterBurst(inst.levelIndicator, 1)
  openGlowLetterDialog(inst, GLOW_DIALOG_G, () => {
    set(KEY_REVEALED_TREE, true)
    inst.zones.tree = true
    inst.zones.outerFrame = true
    set(KEY_REVEALED_OUTER_FRAME, true)
    syncGlowCanvasBackdrop(inst.k, inst.zones)
    updatePlayfieldBorderColors(inst)
    inst.treeRevealFade = 0
    inst.treeRevealActive = true
    inst.treeObj.hidden = false
    inst.treeColorObj.hidden = false
    inst.treeObj.opacity = 0
    inst.treeColorObj.opacity = 0
    applyZoneVisibility(inst)
    //
    // If the water and right ground were already explored before G, the
    // three-zone condition is now complete — surface the L platform.
    //
    maybeRevealLPlat(inst)
  })
}
//
// Collects L after landing on the solid L platform.
//
function collectLetterL(inst) {
  if (inst.zones.lCollected || inst.dialogOpen || !inst.zones.gCollected) return
  inst.zones.lCollected = true
  set(KEY_COLLECTED_L, true)
  const entry = inst.lLetter
  inst.lLetter = null
  entry?.allObjects?.forEach(obj => obj.destroy?.())
  inst.glowLetters = inst.glowLetters.filter(e => e !== entry)
  Sound.playLetterPickupSoft(inst.sound)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 2, inst.zones.colorWorld)
  } else {
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 2)
  }
  LevelIndicator.flashLetterBurst(inst.levelIndicator, 2)
  applyZoneVisibility(inst)
  openGlowLetterDialog(inst, GLOW_DIALOG_L, () => {
    revealLSunZone(inst)
    inst.lParallaxTimer = L_PARALLAX_DELAY
  })
}
//
// Collects O after landing on the solid O platform.
//
function collectLetterO(inst) {
  if (inst.zones.oCollected || inst.dialogOpen || !inst.zones.lCollected) return
  inst.zones.oCollected = true
  set(KEY_COLLECTED_O, true)
  const entry = inst.oLetter
  inst.oLetter = null
  entry?.allObjects?.forEach(obj => obj.destroy?.())
  inst.glowLetters = inst.glowLetters.filter(e => e !== entry)
  Sound.playLetterPickupSoft(inst.sound)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 3, inst.zones.colorWorld)
  } else {
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 3)
  }
  LevelIndicator.flashLetterBurst(inst.levelIndicator, 3)
  applyZoneVisibility(inst)
  openGlowLetterDialog(inst, GLOW_DIALOG_O, () => {
    startColorWorldFade(inst)
    startBirdsMusic(inst.birdsMusic)
  })
}
//
// Collects W after landing on the solid W platform.
//
function collectLetterW(inst) {
  if (inst.zones.wCollected || inst.dialogOpen || !inst.zones.oCollected) return
  inst.zones.wCollected = true
  set(KEY_COLLECTED_W, true)
  const entry = inst.wLetter
  inst.wLetter = null
  entry?.allObjects?.forEach(obj => obj.destroy?.())
  inst.glowLetters = inst.glowLetters.filter(e => e !== entry)
  Sound.playLetterPickupSoft(inst.sound)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 4, inst.zones.colorWorld)
  } else {
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 4)
  }
  LevelIndicator.flashLetterBurst(inst.levelIndicator, 4)
  revealPostWHud(inst)
  applyZoneVisibility(inst)
  //
  // GLOW is complete: mark the section done and return to the menu after a
  // short pause. The menu then shows the arrow toward the touch section and
  // lights the T letter of its progress label.
  //
  setSectionCompleted('glow')
  set('lastLesson', 'glow-complete')
  inst.k.wait(W_MENU_TRANSITION_DELAY, () => startMenuFadeOut(inst))
}
//
// Fades the whole screen to void, then switches to the menu scene.
//
function startMenuFadeOut(inst) {
  const k = inst.k
  const overlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(VOID.r, VOID.g, VOID.b),
    k.opacity(0),
    k.fixed(),
    k.z(W_MENU_FADE_Z)
  ])
  overlay.onUpdate(() => onUpdateMenuFade(inst, overlay))
}
//
// Raises the overlay opacity every frame; jumps to the menu once fully dark.
//
function onUpdateMenuFade(inst, overlay) {
  overlay.opacity = Math.min(1, overlay.opacity + inst.k.dt() / W_MENU_FADE_DURATION)
  if (overlay.opacity >= 1 && !inst.menuFadeStarted) {
    inst.menuFadeStarted = true
    inst.k.go('menu')
  }
}
//
// Full HUD after W: FPS counter top-centre plus the small-hero and life icons
// top-right (revealed here if the player has not surfaced them earlier).
//
function revealPostWHud(inst) {
  if (!inst.fpsCounter) {
    inst.fpsCounter = FpsCounter.create({ k: inst.k })
  }
  LevelIndicator.revealSmallHeroHud(inst.levelIndicator)
  LevelIndicator.revealLifeHud(inst.levelIndicator, !inst.zones.colorWorld)
}
//
// Proximity pickup for L/O/W letters on their platforms.
//
function tryCollectGlowLetters(inst, char) {
  const heroX = char.pos.x
  const heroY = char.pos.y
  const near = (entry) => {
    if (!entry || entry.main.hidden) return false
    return Math.hypot(heroX - entry.x, heroY - entry.y) < GLOW_LETTER_PICKUP_RADIUS
  }
  inst.zones.lPlatRevealed && !inst.zones.lCollected && inst.zones.gCollected && near(inst.lLetter) && collectLetterL(inst)
  inst.zones.oZone && !inst.zones.oCollected && inst.zones.lCollected && near(inst.oLetter) && collectLetterO(inst)
  inst.zones.wZone && !inst.zones.wCollected && inst.zones.oCollected && near(inst.wLetter) && collectLetterW(inst)
}
//
// Slow sink then sad death sound and level restart; water stays revealed.
//
function startDrowning(inst) {
  inst.drowning = true
  inst.drownPhase = 'surface'
  inst.drownTimer = 0
  inst.drownSubmergeTimer = 0
  inst.heroInst.controllable = false
  //
  // Block jump/move key handlers entirely — the drowned hero has no body
  // component, and executeJump would crash on the missing isGrounded().
  //
  inst.heroInst.controlsDisabled = true
  inst.heroInst.suppressDust = true
  //
  // The sinking hero shuts his eyes — the idle animation holds the baked
  // closed-eyes frame for the whole drowning sequence.
  //
  Hero.setEyesClosed(inst.heroInst, true)
  //
  // One water splash take marks the fall into the lake.
  //
  Sound.playWaterStepsFootstepKaplay(inst.k, WATER_STEPS_VOLUME)
  revealWaterZone(inst)
  //
  // First drowning ever: a consolation hint over the sinking hero.
  //
  if (!get(KEY_DROWN_HINT_SHOWN, false)) {
    set(KEY_DROWN_HINT_SHOWN, true)
    HeroHint.show(inst.heroHint, HINT_DROWN_TEXT, HINT_DROWN_DURATION)
  }
  const char = inst.heroInst.character
  char.unuse('body')
  char.use(inst.k.fixed())
  char.z = LAKE_Z - 1
  char.opacity = 1
  char.pos.y = WATER_SURFACE_Y - SURFACE_DETECT_Y + DROWN_LANDING_DEPTH
}
//
// Completes drowning sequence and reloads the scene.
//
function finishDrowning(inst) {
  if (inst.deathHandled) return
  inst.deathHandled = true
  const newLife = get('lifeScore', 0) + 1
  set('lifeScore', newLife)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, countGlowLettersCollected(inst.zones), inst.zones.colorWorld)
  }
  //
  // Before the G letter the player has not "named" the level yet — the death
  // HUD shows only the life counter, never the GLOW word (fills + outlines).
  //
  !inst.zones.gCollected && LevelIndicator.setSectionLabelHidden(inst.levelIndicator, true)
  LevelIndicator.revealLifeHud(inst.levelIndicator, !inst.zones.colorWorld)
  set(KEY_LIFE_SHOWN, true)
  inst.levelIndicator.updateLifeScore?.(newLife)
  Sound.playGentleLifeSound(inst.sound)
  if (inst.levelIndicator?.lifeImage?.sprite?.exists?.()) {
    const originalColor = inst.levelIndicator.lifeImage.sprite.color
    flashLifeImageOnDrownDeath(inst.k, inst.levelIndicator, originalColor, 0)
    createLifeParticlesOnDrownDeath(inst.k, inst.levelIndicator)
  }
  inst.k.wait(DROWN_RESTART_DELAY, () => inst.k.go('lesson-glow.0'))
}
//
// Reveals the lake once the hero wades or falls into the water band. The
// first-time discovery hint is shown only for a live reveal (never when the
// zone is force-opened by the colour world).
//
function revealWaterZone(inst, showHint = true) {
  if (inst.zones.water) return
  inst.zones.water = true
  inst.zones.waterRocks = true
  set(KEY_REVEALED_WATER, true)
  //
  // The water and the left ground decor form one "left part" of the level —
  // opening the lake silently uncovers the decor too, so running over it
  // later never re-triggers the zone-reveal sound.
  //
  revealGroundDecorLeft(inst, true)
  applyZoneVisibility(inst)
  showHint && HeroHint.show(inst.heroHint, HINT_WATER_TEXT, HINT_ZONE_DURATION)
  maybeRevealLPlat(inst)
}
//
// Reveals ground decor on the right side (past the foreground tree).
//
function revealGroundDecorRight(inst) {
  if (inst.zones.groundDecorRight) return
  inst.zones.groundDecorRight = true
  inst.zones.groundDecor = true
  set(KEY_REVEALED_GROUND_DECOR_RIGHT, true)
  set(KEY_REVEALED_GROUND_DECOR, true)
  playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
  //
  // First-time discovery message for the lower-right ground.
  //
  HeroHint.show(inst.heroHint, HINT_GROUND_RIGHT_TEXT, HINT_ZONE_DURATION)
  maybeRevealLPlat(inst)
}
//
// Reveals ground decor on the left side (water / branch area).
//
function revealGroundDecorLeft(inst, silent = false) {
  if (inst.zones.groundDecorLeft) return
  inst.zones.groundDecorLeft = true
  inst.zones.groundDecor = true
  set(KEY_REVEALED_GROUND_DECOR_LEFT, true)
  !silent && playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
}
//
// Checks whether the hero position should unlock left/right ground decor.
// Decor only appears when the hero is on the floor — not on the start branch.
//
function checkGroundDecorReveal(inst, heroX, footY, grounded) {
  if (!grounded || footY < FLOOR_Y - 28) return
  heroX > GROUND_REVEAL_TREE_PAST_X && revealGroundDecorRight(inst)
  //
  // Crossing to the left side of the tree by land uncovers the whole left
  // part at once: the ground decor AND the entire water zone.
  //
  const crossedLeft = inst.zones.gCollected && heroX < TREE_X - TRUNK_EXCLUDE_HALF
  crossedLeft && revealGroundDecorLeft(inst)
  crossedLeft && revealWaterZone(inst)
}
//
// Reveals the L log platform once all three prerequisite zones are open.
//
function revealLPlatZone(inst, silent = false) {
  if (inst.zones.lPlatRevealed) return
  inst.zones.lPlatRevealed = true
  set(KEY_REVEALED_L_PLAT, true)
  !silent && playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
}
//
// The L platform appears only after the hero has explored all three zones:
// the tree (G collected), the water and the lower-right ground.
//
function maybeRevealLPlat(inst, silent = false) {
  const z = inst.zones
  z.gCollected && z.water && z.groundDecorRight && revealLPlatZone(inst, silent)
}
//
// Opens the O platform zone and starts birds.mp3 on first landing from above.
//
function revealOZone(inst) {
  if (inst.zones.oZone) return
  inst.zones.oZone = true
  set(KEY_REVEALED_O, true)
  playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
}
//
// Opens the W platform zone on first landing from above.
//
function revealWZone(inst) {
  if (inst.zones.wZone) return
  inst.zones.wZone = true
  set(KEY_REVEALED_W, true)
  playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
}
//
// Per-frame update.
//
function onUpdate(inst) {
  const k = inst.k
  inst.zones._sceneRef = inst
  inst.fpsCounter && FpsCounter.onUpdate(inst.fpsCounter)
  if (inst.colorFade < inst.colorFadeTarget) {
    inst.colorFade = Math.min(inst.colorFadeTarget, inst.colorFade + k.dt() / COLOR_FADE_DURATION)
  }
  //
  // Forest fade-in after the L reveal — the plane eases from 0 to opaque.
  //
  if (inst.zones.lZoneParallax && inst.parallaxFade < 1) {
    inst.parallaxFade = Math.min(1, inst.parallaxFade + k.dt() / PARALLAX_FADE_DURATION)
  }
  //
  // Birds only fly in the colour world (after the O letter).
  //
  inst.zones.colorWorld && updateBackgroundBirds(inst, k.dt())
  updateTreeRevealFade(inst, k.dt())
  inst.colorFade >= 0.5 && !inst.heroGoldApplied && inst.zones.colorWorld && applyColorWorldHero(inst)
  updatePlayfieldBorderColors(inst)
  if (inst.lParallaxTimer != null) {
    inst.lParallaxTimer -= k.dt()
    inst.lParallaxTimer <= 0 && (inst.lParallaxTimer = null, revealLParallaxZone(inst))
  }
  if (inst.bonusHeroInst?.collected && !inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, countGlowLettersCollected(inst.zones), inst.zones.colorWorld)
    //
    // The fragment pickup may happen before G — the GLOW word stays hidden.
    //
    !inst.zones.gCollected && LevelIndicator.setSectionLabelHidden(inst.levelIndicator, true)
  }
  if (inst.bonusHeroInst?.collected && inst.levelIndicator && !inst.levelIndicator.smallHeroRevealed) {
    LevelIndicator.revealSmallHeroHud(inst.levelIndicator)
    const score = get('heroScore', 0)
    inst.levelIndicator.updateHeroScore?.(score)
  }
  //
  // Fragments are collected once and forever: persist the storage key right
  // away so the hidden platform never reappears after a death (the score is
  // already saved by collectBonus and carries over between deaths).
  //
  if (inst.bonusHeroInst?.collected && !inst.bonusFinalized) {
    inst.bonusFinalized = true
    BonusHero.finalizeCollection(inst.bonusHeroInst)
  }
  if (inst.drowning) {
    onUpdateDrowning(inst)
    return
  }
  if (inst.dialogOpen || inst.introLock) {
    inst.heroInst.controllable = false
  }
  const t = k.time()
  const pulse = (Math.sin(t * GLOW_LETTER_PULSE_SPEED) + 1) / 2
  const opacity = GLOW_LETTER_PULSE_MIN + (1 - GLOW_LETTER_PULSE_MIN) * pulse
  inst.glowLetters.forEach(entry => {
    if (entry.main.hidden) return
    entry.allObjects.forEach(obj => { obj.opacity = opacity })
  })
  if (inst.gLetter && !inst.gLetter.main.hidden) {
    inst.gLetter.allObjects.forEach(obj => { obj.opacity = opacity })
  }
  inst.trampState.cooldown > 0 && (inst.trampState.cooldown = Math.max(0, inst.trampState.cooldown - k.dt()))
  inst.trampState.squash > 0 && (inst.trampState.squash = Math.max(0, inst.trampState.squash - k.dt() * 4))
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  if (!inst.dialogOpen && !inst.introLock) {
    hero.controllable = true
  }
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  //
  // G letter pickup on branch.
  //
  if (inst.gLetter && !inst.zones.gCollected) {
    const dx = heroX - inst.gLetter.x
    const dy = char.pos.y - inst.gLetter.y
    Math.hypot(dx, dy) < GLOW_LETTER_PICKUP_RADIUS && collectLetterG(inst)
  }
  !inst.dialogOpen && tryCollectGlowLetters(inst, char)
  //
  // Trampoline bounce — manual only (no static collider blocking jumps).
  //
  if (inst.zones.groundDecorRight && inst.trampState.cooldown <= 0) {
    const mDx = Math.abs(heroX - inst.trampState.x)
    const capTopY = FLOOR_Y - TRAMP_TOTAL_H
    const heroFeet = char.pos.y + SURFACE_DETECT_Y
    const onCap = mDx < TRAMP_RADIUS && heroFeet >= capTopY - 8 && heroFeet <= capTopY + 14
    if (onCap && (char.vel?.y ?? 0) >= -40) {
      char.vel.y = -TRAMP_FORCE
      inst.trampState.cooldown = TRAMP_COOLDOWN
      inst.trampState.squash = TRAMP_SQUASH_MAX
      inst.sound && Sound.playJumpSound(inst.sound)
    }
  }
  const surface = detectGlowSurface(inst)
  const grounded = char.isGrounded?.() ?? false
  const justLanded = grounded && !inst.wasGrounded
  inst.wasGrounded = grounded
  inst.sound._l2Surface = surface === 'wood' ? 'wood' : null
  inst.sound._glowSurface = surface
  hero.suppressDust = true
  //
  // Landing footstep — same timbre as running on every surface.
  //
  justLanded && !inst.drowning && !inst.dialogOpen && inst.sound && Sound.playStepSound(inst.sound, 'lesson-glow.0')
  snapHeroToLogPlatforms(inst, char)
  const heroMoving = Math.abs(heroX - inst.lastHeroX) > 0.5
  //
  // O-letter meditation: perfect stillness after L summons the countdown.
  //
  updateOMeditation(inst, char, heroMoving, grounded)
  updateMeditationCounter(inst)
  //
  // Platform zone reveals — detect descending hero over trigger volumes.
  //
  checkPlatformRevealOnDescent(inst, char, grounded, justLanded)
  checkGroundDecorReveal(inst, heroX, footY, grounded)
  //
  // Water drowning — full submerge in the lake band.
  //
  if (!inst.deathHandled && !inst.drowning && shouldDrownInWater(inst, heroX, footY) && grounded) {
    startDrowning(inst)
  }
  //
  // Reveal water visuals the first time the hero enters the lake band.
  //
  isInWaterZone(inst, heroX, footY) && footY >= FLOOR_Y - 35 && revealWaterZone(inst)
  inst.lastHeroX = heroX
}
//
// Advances the O-letter meditation: standing perfectly still (grounded, no
// horizontal or vertical motion) for the required time starts a countdown
// near the hero's head and closes his eyes. Any movement cancels it and
// raises the required stillness by MEDITATION_IDLE_PENALTY. When the
// countdown reaches zero the O platform and letter appear.
//
function updateOMeditation(inst, char, heroMoving, grounded) {
  const m = inst.meditation
  const z = inst.zones
  //
  // The mechanic runs only between the L pickup and the O zone reveal.
  //
  if (!z.lCollected || z.oZone || inst.dialogOpen) {
    cancelMeditation(inst, false)
    return
  }
  const still = grounded && !heroMoving && Math.abs(char.vel?.y ?? 0) < 1
  if (!still) {
    cancelMeditation(inst, true)
    return
  }
  if (m.countdown == null) {
    m.idleTimer += inst.k.dt()
    if (m.idleTimer >= m.requiredIdle) {
      m.countdown = MEDITATION_COUNTDOWN
      Hero.setEyesClosed(inst.heroInst, true)
    }
    return
  }
  m.countdown -= inst.k.dt()
  if (m.countdown <= 0) {
    m.countdown = null
    Hero.setEyesClosed(inst.heroInst, false)
    revealOZone(inst)
  }
}
//
// Stops a running countdown (opening the hero's eyes) and resets the idle
// timer. An interruption by movement also raises the required stillness.
//
function cancelMeditation(inst, interrupted) {
  const m = inst.meditation
  if (m.countdown != null) {
    interrupted && (m.requiredIdle += MEDITATION_IDLE_PENALTY)
    m.countdown = null
    Hero.setEyesClosed(inst.heroInst, false)
  }
  m.idleTimer = 0
}
//
// Fades the foreground tree in after collecting G.
//
function updateTreeRevealFade(inst, dt) {
  if (!inst.treeRevealActive) return
  inst.treeRevealFade = Math.min(1, inst.treeRevealFade + dt / TREE_REVEAL_FADE_DURATION)
  const op = inst.treeRevealFade
  inst.treeObj.opacity = op
  inst.treeColorObj.opacity = op
  inst.treeRevealFade >= 1 && (inst.treeRevealActive = false)
}
//
// Keeps the hero standing on solid log platforms (prevents fall-through).
//
function snapHeroToLogPlatforms(inst, char) {
  //
  // The snap keeps running while a dialog is open — otherwise a hero that
  // tunnelled into a log during the pickup frame stays sunk until close.
  //
  if (inst.drowning) return
  const velY = char.vel?.y ?? 0
  //
  // Never touch a rising hero — jumps must launch untouched, like on the branch.
  //
  if (velY < 0) {
    inst.logHoverFrames = 0
    return
  }
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  const z = inst.zones
  const homes = []
  z.lPlatRevealed && z.gCollected && homes.push(inst.lPlatHome)
  z.oZone && z.lCollected && homes.push(inst.oPlatHome)
  z.wZone && z.oCollected && homes.push(inst.wPlatHome)
  let hoverHome = null
  for (const home of homes) {
    if (heroX < home.x - LOG_SNAP_X_SLACK || heroX > home.x + LOG_W + LOG_SNAP_X_SLACK) continue
    //
    // Physics top of the log = sprite top + the collision drop offset.
    //
    const platTop = home.y + LOG_COLLISION_DROP_Y
    //
    // Anti-tunnel: the hero's feet sank INTO the log body — lift him back so
    // they overlap the top by 1 px and let Kaplay resolve the contact. The
    // regular physics path then grounds him and plays the normal landing
    // (velocity zeroing, tuck release, idle sprite) — exactly like the branch.
    //
    if (footY > platTop + LOG_SNAP_TOLERANCE && footY <= platTop + LOG_SNAP_BELOW) {
      char.pos.y = platTop - SURFACE_DETECT_Y + LOG_SNAP_EMBED
      inst.logHoverFrames = 0
      return
    }
    //
    // Hover candidate: suspended above the log, no vertical motion, no ground
    // contact — counted across frames by the watchdog below.
    //
    const suspended = footY < platTop - LOG_SNAP_TOLERANCE && footY >= platTop - LOG_HOVER_BAND
    suspended && velY < 1 && !char.isGrounded?.() && (hoverHome = home)
  }
  //
  // Hover watchdog: only a genuinely stuck hero stays motionless above a log
  // for several consecutive frames — pull him down onto the surface.
  //
  if (!hoverHome) {
    inst.logHoverFrames = 0
    return
  }
  inst.logHoverFrames += 1
  if (inst.logHoverFrames >= LOG_HOVER_FRAMES) {
    //
    // Same principle as the anti-tunnel above: embed 1 px into the log and
    // let Kaplay ground the hero through the regular landing path.
    //
    char.pos.y = hoverHome.y + LOG_COLLISION_DROP_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    inst.logHoverFrames = 0
  }
}
//
// Reveals the W platform when the hero enters its trigger volume. (The L
// platform appears via the three explored zones and the O platform via the
// meditation countdown — neither uses a descent trigger anymore.)
//
function checkPlatformRevealOnDescent(inst, char, grounded, justLanded) {
  const descending = (char.vel?.y ?? 0) > 40
  if (!descending && !justLanded) return
  const heroX = char.pos.x
  const y = char.pos.y
  const z = inst.zones
  if (z.gCollected && z.lCollected && z.oCollected && z.oZone && !z.wZone && inPlatTrigger(heroX, y, inst.wTrigger)) {
    revealWZone(inst)
    //
    // Embed 1 px into the fresh platform and let Kaplay resolve the contact —
    // the regular physics path grounds the hero and plays the normal landing.
    //
    char.pos.y = inst.wPlatHome.y + LOG_COLLISION_DROP_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
  }
}
//
// Two-phase drowning: rest on the water surface, then sink beneath the fill.
//
function onUpdateDrowning(inst) {
  const k = inst.k
  const char = inst.heroInst.character
  inst.drownTimer += k.dt()
  if (inst.drownPhase === 'surface') {
    char.pos.y = WATER_SURFACE_Y - SURFACE_DETECT_Y + DROWN_LANDING_DEPTH
    inst.drownTimer >= DROWN_SURFACE_HOLD && (inst.drownPhase = 'submerge')
    return
  }
  inst.drownSubmergeTimer += k.dt()
  const sinkTargetY = DROWN_FULL_SINK_FEET_Y - SURFACE_DETECT_Y
  char.pos.y = Math.min(sinkTargetY, char.pos.y + DROWN_SUBMERGE_SPEED * k.dt())
  const fullyUnder = char.pos.y >= sinkTargetY - 4
  if (fullyUnder) {
    const opacity = char.opacity ?? 1
    char.opacity = Math.max(0, opacity - DROWN_FADE_OUT_SPEED * k.dt())
  }
  if ((fullyUnder && (char.opacity ?? 1) <= 0.05) || inst.drownSubmergeTimer >= 3.4 || inst.drownTimer >= 4.5) {
    finishDrowning(inst)
  }
}
//
// Flashes life icon red/white on drowning death (touch lesson 0 pattern).
//
function flashLifeImageOnDrownDeath(k, levelIndicator, originalColor, count) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  if (count >= LIFE_FLASH_COUNT) {
    levelIndicator.lifeImage.sprite.color = originalColor
    levelIndicator.lifeImage.sprite.opacity = 1.0
    return
  }
  const flashRed = glowRgb(GLOW_PAL.mushrooms[0])
  const flashLight = glowRgb('brightLight')
  if (count % 2 === 0) {
    levelIndicator.lifeImage.sprite.color = k.rgb(flashRed.r, flashRed.g, flashRed.b)
    levelIndicator.lifeImage.sprite.opacity = 1.0
  } else {
    levelIndicator.lifeImage.sprite.color = k.rgb(flashLight.r, flashLight.g, flashLight.b)
    levelIndicator.lifeImage.sprite.opacity = 0.5
  }
  k.wait(LIFE_FLASH_INTERVAL, () => flashLifeImageOnDrownDeath(k, levelIndicator, originalColor, count + 1))
}
//
// Red square particles radiating from life icon on drowning death.
//
function createLifeParticlesOnDrownDeath(k, levelIndicator) {
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
    particle.onUpdate(() => onUpdateDrownLifeParticle(particle, k, vx, vy, lifetime))
  }
}
//
// Ages a single life-icon burst particle.
//
function onUpdateDrownLifeParticle(particle, k, vx, vy, lifetime) {
  particle._elapsed = (particle._elapsed ?? 0) + k.dt()
  particle.pos.x += vx * k.dt()
  particle.pos.y += vy * k.dt()
  particle.opacity = 1 - particle._elapsed / lifetime
  particle._elapsed >= lifetime && particle.destroy?.()
}
