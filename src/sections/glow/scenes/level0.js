import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get, setSectionCompleted } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { initTouchInput } from '../../../utils/touch-input.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import { createLevelTransition } from '../../../utils/transition.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as LevelIndicator from '../../touch/components/lesson-indicator.js'
import * as LevelHelp from '../../../utils/lesson-help.js'
import { buildRockVertices, drawRockToCanvas } from '../../../utils/draw-rock.js'
import { drawCuteMushroomToCanvas, CUTE_MUSHROOM_ASPECT } from '../utils/cute-mushroom.js'
import { toCanvas, getRGB } from '../../../utils/helper.js'
import {
  buildGlowTree,
  renderGlowTreeToCanvas,
  renderGlowTreeIntoContext,
  renderGlowLeafBandIntoContext,
  TREE_SEED
} from '../utils/glow-tree.js'
import {
  GLOW_PAL,
  glowRgb,
  getTreePaletteGray,
  getTreePaletteLit,
  getTreePaletteColor,
  getTreePaletteAmber,
  buildDimmedTreePalette
} from '../utils/glow-palette.js'
import * as Grass from '../../../components/grass.js'
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
const GLOW_GOLD_HEX = GLOW_PAL.gold
const DIALOG_FILL = glowRgb('dialogFill')
//
// Colour-world backdrop split: sky above the ground line, dark earth below.
//
const GROUND_DARK = glowRgb('groundDark')
//
// Golden haze the colour-world background forest dissolves into.
//
const WARM_HAZE = glowRgb('warmHaze')
//
// Dark rim tone for gray decor (rocks, trampoline) in the colour world.
//
const DECOR_OUTLINE_RGB = glowRgb('decorOutline')
//
// Cap colour families for the cute decor mushrooms (palette hex sets): the
// cap tone, its dark counterpart (shading) and a lighter highlight tone.
//
const MUSHROOM_CAP_HEX = GLOW_PAL.mushrooms
const MUSHROOM_CAP_DARK_HEX = GLOW_PAL.mushroomsDark
const MUSHROOM_CAP_LIGHT_HEX = GLOW_PAL.mushroomsLight
//
// Cute mushroom palette sets: full colour and the gray-family mirror.
//
const CUTE_MUSH_COLORS = GLOW_PAL.cuteMushroom
const CUTE_MUSH_GRAY_COLORS = GLOW_PAL.cuteMushroomGray
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
//
// The trunk geometry extends a few px below the ground so its base cannot
// leave a gap above the floor line; rendering clips it at the roots' start
// (ground level), so the trunk is cut exactly by the ground.
//
const TREE_TRUNK_SINK = 4
const TREE_TRUNK_BOTTOM_Y = FLOOR_Y + TREE_TRUNK_SINK
const TREE_ROOT_START_Y = FLOOR_Y
const TREE_TOP_Y = 30
const ROOT_MAX_Y = 1030
const TREE_SPRITE_NAME = 'glow0-tree-sprite'
const TREE_LIT_SPRITE_NAME = 'glow0-tree-lit-sprite'
const TRUNK_EXCLUDE_HALF = 50
//
// Combined background sprites — ONE full-screen image per mode holding all
// three tree planes, all three bush strips, the underground decor and the
// dark earth band, so the whole backdrop costs two draw calls at most.
//
const BG_COMBINED_GRAY_SPRITE = 'glow0-bg-gray'
const BG_COMBINED_COLOR_SPRITE = 'glow0-bg-color'
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
//
// Letter-log platforms mirror the main tree wood: warm sand tones in the lit
// gray world (after L) and the tree's browns once the world gains colour.
//
const LOG_TREE_LIT_COLORS = {
  bark: GLOW_PAL.treeLit.trunk,
  barkLight: GLOW_PAL.treeLit.branch,
  barkDark: GLOW_PAL.treeLit.root,
  ring: GLOW_PAL.treeLit.branch,
  ringDark: GLOW_PAL.treeLit.root,
  core: GLOW_PAL.treeLit.leaf
}
const LOG_TREE_COLOR_COLORS = {
  bark: GLOW_PAL.treeColor.trunk,
  barkLight: GLOW_PAL.treeLit.trunk,
  barkDark: GLOW_PAL.treeColor.root,
  ring: GLOW_PAL.treeLit.trunk,
  ringDark: GLOW_PAL.treeColor.root,
  core: GLOW_PAL.treeLit.leaf
}
const RIGHT_PLAT_OFFSET_X = 100
const W_PLAT_X_BASE = LEFT_MARGIN + 140 + LOG_W + 70
const W_PLAT_Y_BELOW = 90
//
// O platform sits half a log length further right than its original spot.
//
const O_PLAT_OFFSET_X = 210 + LOG_W / 2
const O_PLAT_OFFSET_Y = 105
//
// The O letter floats 7 px higher above its log than the default placement.
//
const O_LETTER_RAISE_Y = 7
//
// The L letter floats 9 px higher above its log than the default placement.
//
const L_LETTER_RAISE_Y = 9
const BONUS_PLAT_OFFSET_X = 100
//
// Hidden bonus platform sits noticeably lower so it is reachable by jump.
//
const BONUS_PLAT_OFFSET_Y = 40
const BONUS_PLAT_W = 90
//
// Background forest — three planes of big trees baked and drawn fully
// OPAQUE. Depth comes from colour only: the tones are pre-blended toward the
// backdrop before baking. Gray mode blends every row toward the playfield
// gray; the colour mode blends toward the warm orange haze, so each deeper
// row reads more orange and brighter — like the reference forest picture.
//
const PAR_L1_BG_BLEND = 0.62
const PAR_L1_COLOR_BLEND = 0.3
//
// Near-row foliage leans extra toward the warm orange haze (leaf-only blend)
// while green stays the leading colour.
//
const PAR_L1_LEAF_WARM_BLEND = 0.3
//
// Second (far) plane behind the near one — dimmer still, foliage collapsed
// to a single tone.
//
const PAR_L2_BG_BLEND = 0.87
const PAR_L2_COLOR_BLEND = 0.32
//
// Third (farthest) plane — almost dissolved into the backdrop haze.
//
const PAR_L3_BG_BLEND = 0.94
const PAR_L3_COLOR_BLEND = 0.48
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
const PAR_BIG_TREE_COUNT = 6
const PAR_BIG_SEED_BASE = 40000
const PAR_FAR_TREE_COUNT = 7
const PAR_FAR_SEED_BASE = 50000
const PAR_FARTHEST_TREE_COUNT = 8
const PAR_FARTHEST_SEED_BASE = 60000
const PAR_BIG_SEED_STEP = 101
//
// Row heights: the near (1st) row holds the tallest trees, the far (2nd) row
// sits lower, the farthest (3rd) row is the lowest of all. The steps are
// kept tight so even the lowest crown stays well above the screen middle —
// the horizontal centre band shows only bare trunks, no foliage.
//
const PAR_BIG_TOP_MIN_Y = TREE_TOP_Y - 20
const PAR_BIG_TOP_RANGE = 110
//
// 2nd and 3rd row crowns sit an extra ~10% of their tree height lower, so
// each deeper leaf band starts visibly below the previous one.
//
const PAR_FAR_TOP_MIN_Y = TREE_TOP_Y + 130
const PAR_FAR_TOP_RANGE = 90
const PAR_FARTHEST_TOP_MIN_Y = TREE_TOP_Y + 190
const PAR_FARTHEST_TOP_RANGE = 80
const PAR_BIG_WIDTH_SCALE_MIN = 1.1
const PAR_BIG_WIDTH_SCALE_RANGE = 0.3
//
// Background-tree branches sprout only from the very top band of the trunk
// and grow upward, so all the foliage gathers at the crown and never dips
// into the screen middle.
//
const PAR_BRANCH_FRAC_MIN = 0.78
const PAR_BRANCH_FRAC_MAX = 0.97
//
// Hard foliage floor: no background leaf (branch cluster or band leaf) may
// ever paint below this line — the horizontal middle band of the screen
// stays trunk-only in every row and every mode.
//
const PAR_LEAF_MAX_Y = Math.round(SCREEN_H * 0.43)
//
// Row foliage = ONE dense full-width horizontal band per row: every leaf of
// a row sits at roughly the same vertical level with a small random step up
// or down, uniform from the left edge to the right edge. Each deeper row's
// band sits lower than the previous one (its bottom shows under the nearer
// band), so the forest reads as three leaf strips descending with depth.
// The near (1st) band is the thickest and densest.
//
const PAR_BAND_SEED_OFFSET = 7700
const PAR_BIG_BAND_TOP = PAR_BIG_TOP_MIN_Y - 40
const PAR_BIG_BAND_BOTTOM = PAR_BIG_TOP_MIN_Y + PAR_BIG_TOP_RANGE + 140
const PAR_BIG_BAND_COUNT = 4200
const PAR_FAR_BAND_TOP = PAR_FAR_TOP_MIN_Y + 60
const PAR_FAR_BAND_BOTTOM = PAR_FAR_TOP_MIN_Y + PAR_FAR_TOP_RANGE + 100
const PAR_FAR_BAND_COUNT = 3200
const PAR_FARTHEST_BAND_TOP = PAR_FARTHEST_TOP_MIN_Y + 110
const PAR_FARTHEST_BAND_BOTTOM = PAR_FARTHEST_TOP_MIN_Y + PAR_FARTHEST_TOP_RANGE + 130
const PAR_FARTHEST_BAND_COUNT = 2400
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
// Background bushes — leafy mounds cut by the ground line, drawn IN FRONT of
// the tree planes. Each mound is a filled dome scattered with small oval
// leaves (a different leaf shape than the tree teardrops), so the strip
// reads as real bushes instead of plain semicircles — in every mode.
// The radius spread is kept narrow, so every strip holds one roughly even
// height with only a small random step up/down — three uniform horizontal
// hedge bands, like the reference picture.
//
const BUSH_RADIUS_MIN = 72
const BUSH_RADIUS_MAX = 96
const BUSH_STEP_MIN_FRAC = 0.45
const BUSH_STEP_RANGE_FRAC = 0.5
//
// Bush leaf texture: oval leaves scattered across each dome plus a ragged
// leafy rim along the arc. Shades vary only in brightness (darkened base
// tone), so the colour composition of every strip stays unchanged.
//
const BUSH_LEAF_SIZE_MIN = 9
const BUSH_LEAF_SIZE_RANGE = 8
const BUSH_LEAF_DENSITY = 0.014
const BUSH_RIM_LEAF_SPACING = 14
const BUSH_LEAF_DARKEN_STEPS = [0, 0.1, 0.2]
//
// Colour-world bush tones: the near (1st) strip leans mostly toward the warm
// orange haze while keeping a clear green tint; the 2nd and 3rd
// strips reuse the exact flat orange trunk tone of their tree row (see
// buildParallaxSprites), so trees and bushes of one row always match. The
// gray world keeps every bush inside the gray family.
//
const BUSH_COLOR_HAZE_BLEND_NEAR = 0.55
//
// Colour-world 2nd/3rd bush strips are pushed this much further toward the
// haze than the trees of their row, so each row's bushes read as a slightly
// different (warmer) shade than the trunks behind them.
//
const BUSH_ROW_TINT_DELTA = 0.14
//
// Bush heights run OPPOSITE to the tree rows: the near (1st) strip is the
// lowest, each deeper strip is ~25% taller than the previous one. Even the
// tallest strip stays below the screen-middle band, keeping it leaf-free.
//
const BUSH_FAR_HEIGHT_SCALE = 1.38
const BUSH_FARTHEST_HEIGHT_SCALE = 1.72
//
// Background birds — dim silhouettes gliding BEHIND the forest planes; they
// appear with the colour world (after O). Their tone is blended almost all
// the way into the warm haze backdrop so they read as faint specks.
//
const BIRD_COUNT = 5
//
// Birds glide through the bare-trunk band below the crowns, not at the very
// top of the screen.
//
const BIRD_MIN_Y = TOP_MARGIN + 150
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
const BIRD_HAZE_BLEND = 0.72
//
// Underground decor in the root zone: buried rocks, cracks, pebble clusters,
// hanging rootlets, a fossil spiral and one buried skeleton (no burrows or
// holes). Baked once per mode (gray backdrop / dark colour-world earth).
//
const UNDERGROUND_GRAY_SPRITE = 'glow0-underground-gray'
const UNDERGROUND_COLOR_SPRITE = 'glow0-underground-color'
const UG_TOP_PAD = 30
const UG_BOTTOM_PAD = 18
//
// The skeleton keeps clear of the main tree trunk: the root network spreads
// about this far to each side, and no root may cover the bones.
//
const UG_SKELETON_TREE_CLEAR = 520
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
//
// Pure black drop shadow behind every pickup letter (G, L, O, W): a single
// copy of the glyph offset right+down, like classic pixel-text shadows.
//
const GLOW_LETTER_SHADOW = 2
const GLOW_LETTER_SHADOW_R = 0
const GLOW_LETTER_SHADOW_G = 0
const GLOW_LETTER_SHADOW_B = 0
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
//
// First step of the two-step L reveal (ground darkening + reveal chime).
// The storage key keeps its historical name so old saves stay valid.
//
const KEY_REVEALED_L_LIT = 'glow.revealedLSun'
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
const GLOW_DIALOG_G = '[hl]G[/hl]round is beneath you. Every\njourney begins with a single\nstep. Keep your research.'
const GLOW_DIALOG_L = '[hl]L[/hl]ight helps you see the shades.\nThe world is rarely just black\nor white. Not everything reveals\nitself in motion.'
const GLOW_DIALOG_O = '[hl]O[/hl]bservation is your new skill.\nSometimes you need to stop before\nyou can truly see. Find [hl]W[/hl] by\nyourself. Look left...'
//
// Voice-overs played while the matching letter dialog is open
//
const GLOW_DIALOG_SOUND_G = 'glow-g'
const GLOW_DIALOG_SOUND_L = 'glow-l'
const GLOW_DIALOG_SOUND_O = 'glow-ow'
//
// Speech-bubble hints: two intro lines at spawn (the G letter appears only
// after both finish), one-shot lines when the right ground / water zones
// first open, and a consolation line on the first drowning.
//
const HINT_INTRO_1_TEXT = 'I\'m Yan. You don\'t need\nanswers yet. Just be curious.'
const HINT_INTRO_1_DURATION = 6
const HINT_INTRO_2_TEXT = 'To truly see this world, you\'ll\nneed to collect every letter of\nthe word GLOW. Each one will\nreveal another part of what\nyour eyes have yet to discover.\nUse the mouse to learn more\nabout the world around you.'
const HINT_INTRO_2_DURATION = 13
const HINT_GROUND_RIGHT_TEXT = 'Curiosity lights the\nway. Keep walking'
const HINT_WATER_TEXT = 'The unknown isn\'t empty.\nIt simply hasn\'t been\ndiscovered yet'
const HINT_ZONE_DURATION = 5
const HINT_DROWN_TEXT = 'That\'s not bad. Now you\nknow you can\'t go here.'
const HINT_DROWN_DURATION = 4
//
// Repeat drownings get a random self-ironic joke over the sinking hero.
//
const DROWN_JOKES = [
  'But I\'m still so young...',
  'Tell the birds\nmy story...',
  'Note to self:\nI am not a fish.',
  'Okay, the lake wins.\nThis round.',
  'I regret nothing.\nWell... one thing.'
]
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
// Hero hover tooltip — the line follows how much colour the hero can see:
// plain gray world, gray shades after L, full colour after O.
//
const HERO_TOOLTIP_TEXT_GRAY = "Hi, I'm Yan"
const HERO_TOOLTIP_TEXT_SHADES = 'Wow! So many\ndetails around!'
const HERO_TOOLTIP_TEXT_COLOR = 'I never thought the world\ncould be this beautiful'
const HERO_TOOLTIP_HOVER_SIZE = 80
const HERO_TOOLTIP_Y_OFFSET = -100
//
// G letter hover tooltip — a playful nudge to simply touch the letter.
//
const G_TOOLTIP_TEXT = "Ground? Glow? Geometry?\nDon't think too much.\nJust touch it."
const G_TOOLTIP_HOVER_SIZE = 70
const G_TOOLTIP_Y_OFFSET = -80
//
// L letter hover tooltip — the letter's silhouette really does look like one.
//
const L_TOOLTIP_TEXT = 'Looks like a leg :)'
const L_TOOLTIP_HOVER_SIZE = 70
const L_TOOLTIP_Y_OFFSET = -80
//
// Trampoline mushroom hover tooltip — its own baffled reaction.
//
const TRAMP_TOOLTIP_TEXT = 'Wwhaaat!?'
const TRAMP_TOOLTIP_Y_OFFSET = -90
//
// Buried skeleton hover — sits in the underground root band after L
//
const SKELETON_TOOLTIP_TEXT = "I'm tired..."
const SKELETON_TOOLTIP_WIDTH = 56
const SKELETON_TOOLTIP_HEIGHT = 90
const SKELETON_TOOLTIP_Y_OFFSET = -70
//
// While the hero stands on the start branch and G is still uncollected his
// eyes stay locked on the letter (vertical slack around the branch top).
//
const GAZE_BRANCH_Y_TOLERANCE = 60
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
// After picking up the final W letter the hero shares a closing line for a
// few seconds, then a full-screen fade-out leads back to the menu.
//
const HINT_W_TEXT = 'Now I see everything.\nI\'m ready to move on.'
const HINT_W_DURATION = 4
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
const MUSHROOM_CAP_W_MIN = 22
const MUSHROOM_CAP_W_MAX = 38
const MUSHROOM_EXTRA_LOWER = 2
//
// Mushroom trampoline — right of the L platform. A cute chubby mushroom with
// a blushy face; the eyes blink by swapping pre-baked open/closed variants.
//
const TRAMP_CAP_W = 56
const TRAMP_W = 70
const TRAMP_TOTAL_W = TRAMP_W + 4
const TRAMP_TOTAL_H = Math.ceil(TRAMP_W * CUTE_MUSHROOM_ASPECT) + 4
//
// No grass grows in front of the trampoline mushroom — blades this close to
// its centre are skipped so nothing covers the face.
//
const TRAMP_GRASS_CLEAR_HALF = TRAMP_TOTAL_W / 2 + 12
//
// Small decor mushrooms keep the same distance from the trampoline centre —
// wide enough that even the widest cap never overlaps the trampoline face.
//
const TRAMP_MUSHROOM_CLEAR_HALF = TRAMP_TOTAL_W / 2 + MUSHROOM_CAP_W_MAX / 2 + 10
//
// Scatter rocks keep clear of the trampoline too — even the widest rock
// silhouette (radius * 1.3 half-width) never covers the mushroom face.
//
const TRAMP_ROCK_CLEAR_HALF = TRAMP_TOTAL_W / 2 + Math.ceil(SCATTER_ROCK_RADIUS_MAX * 1.3) + 10
//
// Blinking: random pause between blinks, short eyelid-down hold.
//
const TRAMP_BLINK_SPRITE_SUFFIX = '-blink'
const TRAMP_BLINK_MIN_INTERVAL = 2.5
const TRAMP_BLINK_MAX_INTERVAL = 6
const TRAMP_BLINK_DURATION = 0.14
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
// Sink the trampoline sprite 2 px into the ground so it does not float.
//
const TRAMP_SINK_Y = 2
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
// Water depth grows toward the left: shallow by the tree shore, 60 px at the left edge
//
const WATER_DEPTH_LEFT = 60
const WATER_DEPTH_RIGHT = 8
//
// Deterministic bed roughness (seeded by segment index — no Math.random in draw)
//
const WATER_BED_CHAOS_A = 7.3
const WATER_BED_CHAOS_B = 19.1
const WATER_BED_CHAOS_AMP_A = 9
const WATER_BED_CHAOS_AMP_B = 5
const WATER_BED_DEPTH_POWER = 0.62
//
// Decor mushrooms lean with the heroine's idle whistle (same pulse as touch L1)
//
const GLOW_MUSHROOM_WHISTLE_IDLE = 5
const GLOW_MUSHROOM_WHISTLE_AMP_DEG = 14
const GLOW_MUSHROOM_WHISTLE_SMOOTH = 7
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
// While Kaplay already grounds the hero on a log, ignore shallow foot
// penetration — fighting it every frame caused constant twitch.
//
const LOG_SNAP_STANDING_MAX = 10
//
// Anti-tunnel only when feet are clearly inside the log body. Shallow
// contact (landing / standing) stays pure Kaplay — same as the branch —
// so snap cannot zero jump velocity or cancel the crouch→jump squash.
//
const LOG_SNAP_DEEP_SINK = 14
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
// After snapping onto a log, lock out a second jump/land crouch briefly
//
const POST_LAND_AIR_LOCK_GLOW = 1.1
const GOLD_RECOLOR_DELAY = 0.55
const DIALOG_INPUT_GRACE = 0.85
//
// Hover watchdog: a hero suspended above a log with zero vertical velocity
// and no ground contact for this many consecutive frames gets pulled down
// onto the log top. Normal jumps never trigger it (velocity is only ~0 for
// a single frame at the apex).
//
const LOG_HOVER_BAND = 30
const LOG_HOVER_FRAMES = 3
//
// Still falling through a jump arc — do not pin / idle-reset mid-air
//
const LOG_SNAP_FALL_VEL = 80
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
    //
    // Underground decor first: its generated spec is baked both into the
    // standalone sprites (visible before L) and into the combined background.
    //
    const undergroundSpec = loadUndergroundSprites(k)
    buildParallaxSprites(k, undergroundSpec)
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
    const grassLayer = createGlowGrass(k, lakeX1, waterX2, trampX, zones)
    const rockObjs = createGlowRocks(k, horizBranch.x1, rightPlatX, trampX, zones)
    const mushObjs = createGlowMushrooms(k, lakeX1, waterX2, trampX, zones)
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
      letterDialogMusic: null,
      undergroundSkeleton: undergroundSpec.skeleton,
      dialogHeroPinned: false,
      dialogPinY: 0,
      dialogInputGrace: 0,
      heroLockedAfterW: false,
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
      // appears only after both hints finish. introStep tracks which intro
      // hint is on screen for the key-press advance.
      //
      introLock: false,
      introStep: 0,
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
    k.onSceneLeave(() => stopGlowLetterDialogMusic(inst))
    k.onKeyPress('escape', () => {
      if (inst.dialogOpen) return
      goToMenuAfterAssets(k)
    })
    k.onDraw(() => onDraw(inst))
    k.onUpdate(() => onUpdate(inst))
  })
}
//
// Plays the two intro hints with locked controls, advanced by key presses:
// the first hint waits for ANY key, the next key swaps it for the second
// hint, and one more key dismisses it and hands the run/jump keys back to
// the player (the G letter appears at that moment). Each hint still expires
// on its own timer as a fallback, so a keyboard-less player is never stuck.
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
    //
    // Any run/jump key dismisses the reminder right away — a player who
    // already died knows the goal and should not wait out the long hint.
    //
    const replayKeys = [...CFG.controls.moveLeft, ...CFG.controls.moveRight, ...CFG.controls.jump]
      .map(key => inst.k.onKeyPress(key, () => dismissReplayIntroHint(inst, replayKeys)))
    return
  }
  inst.introLock = true
  inst.introStep = 1
  inst.heroInst.controllable = false
  inst.heroInst.controlsDisabled = true
  HeroHint.queue(inst.heroHint, [
    { text: HINT_INTRO_1_TEXT, duration: HINT_INTRO_1_DURATION },
    { text: HINT_INTRO_2_TEXT, duration: HINT_INTRO_2_DURATION }
  ], () => inst.introLock && finishGlowIntro(inst))
  const introKeys = inst.k.onKeyPress(() => advanceGlowIntro(inst, introKeys))
}
//
// Clears the post-death goal reminder as soon as the player starts moving
// and detaches all the run/jump key handlers registered for it.
//
function dismissReplayIntroHint(inst, handlers) {
  handlers.forEach(handler => handler.cancel())
  HeroHint.clear(inst.heroHint)
}
//
// One key press moves the intro forward: 1st press shows the second hint,
// 2nd press closes it and unlocks the controls immediately.
//
function advanceGlowIntro(inst, introKeys) {
  if (!inst.introLock) {
    introKeys.cancel()
    return
  }
  if (inst.introStep === 1) {
    inst.introStep = 2
    //
    // Re-queue (not show) so the timer fallback keeps its completion hook.
    //
    HeroHint.queue(inst.heroHint, [
      { text: HINT_INTRO_2_TEXT, duration: HINT_INTRO_2_DURATION }
    ], () => inst.introLock && finishGlowIntro(inst))
    return
  }
  introKeys.cancel()
  HeroHint.clear(inst.heroHint)
  finishGlowIntro(inst)
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
// Picks the hero tooltip line matching how much colour the world shows.
//
function heroTooltipText(inst) {
  if (inst.zones.oCollected || inst.zones.colorWorld) return HERO_TOOLTIP_TEXT_COLOR
  if (inst.zones.lCollected) return HERO_TOOLTIP_TEXT_SHADES
  return HERO_TOOLTIP_TEXT_GRAY
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
      text: () => heroTooltipText(inst),
      offsetY: HERO_TOOLTIP_Y_OFFSET,
      //
      // Suppressed while any speech-bubble hint is on screen so two bubbles
      // never fight above the hero's head.
      //
      visible: () => !inst.drowning && !inst.dialogOpen && !HeroHint.isActive(inst.heroHint)
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
    }, {
      x: () => inst.undergroundSkeleton?.x ?? -1000,
      y: () => inst.undergroundSkeleton?.y ?? -1000,
      width: SKELETON_TOOLTIP_WIDTH,
      height: SKELETON_TOOLTIP_HEIGHT,
      text: SKELETON_TOOLTIP_TEXT,
      offsetY: SKELETON_TOOLTIP_Y_OFFSET,
      //
      // Skeleton lives in the underground band revealed with the L parallax.
      //
      visible: () => Boolean(inst.undergroundSkeleton) &&
        (inst.zones.lZoneParallax || inst.zones.lCollected) &&
        !inst.dialogOpen
    }, {
      x: () => inst.gLetter?.x ?? -1000,
      y: () => inst.gLetter?.y ?? -1000,
      width: G_TOOLTIP_HOVER_SIZE,
      height: G_TOOLTIP_HOVER_SIZE,
      text: G_TOOLTIP_TEXT,
      offsetY: G_TOOLTIP_Y_OFFSET,
      //
      // Only while the G letter is visible and not yet collected.
      //
      visible: () => Boolean(inst.gLetter && !inst.gLetter.main.hidden && !inst.zones.gCollected)
    }, {
      x: () => inst.lLetter?.x ?? -1000,
      y: () => inst.lLetter?.y ?? -1000,
      width: L_TOOLTIP_HOVER_SIZE,
      height: L_TOOLTIP_HOVER_SIZE,
      text: L_TOOLTIP_TEXT,
      offsetY: L_TOOLTIP_Y_OFFSET,
      //
      // Only while the L letter is visible and not yet collected.
      //
      visible: () => Boolean(inst.lLetter && !inst.lLetter.main.hidden && !inst.zones.lCollected)
    }, {
      x: () => inst.trampState?.x ?? -1000,
      y: FLOOR_Y - TRAMP_TOTAL_H / 2,
      width: TRAMP_TOTAL_W,
      height: TRAMP_TOTAL_H,
      text: TRAMP_TOOLTIP_TEXT,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET,
      //
      // Only once the right ground decor (the trampoline) has been revealed.
      //
      visible: () => Boolean(inst.zones.groundDecorRight)
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
  const lZoneLit = gCollected && lCollected && (get(KEY_REVEALED_L_LIT, false) || lCollected)
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
    lZoneLit,
    lZoneParallax,
    lPlatRevealed,
    lZone: lZoneLit || lZoneParallax,
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
  // grey eye whites before O, gold inside once the world colours.
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
  inst.grassLayer.layer.hidden = !z.groundDecorRight && !z.groundDecorLeft
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
// Builds the combined background — ONE full-screen canvas per mode (gray +
// colour) holding all three tree planes interleaved with all three bush
// strips, plus the dark earth band and the underground decor of the root
// zone. Everything is baked once and drawn as a single opaque image per
// mode, so the whole backdrop costs at most two draw calls per frame. Each
// deeper plane is dimmer and lower; in the colour world the near row keeps
// the green foreground foliage while the deeper rows dissolve into the warm
// amber haze, so each farther row reads more orange and brighter.
//
function buildParallaxSprites(k, undergroundSpec) {
  const grayCanvas = document.createElement('canvas')
  grayCanvas.width = SCREEN_W
  grayCanvas.height = SCREEN_H
  const grayCtx = grayCanvas.getContext('2d')
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = SCREEN_W
  colorCanvas.height = SCREEN_H
  const colorCtx = colorCanvas.getContext('2d')
  //
  // Depth order, back to front, tree row BEHIND the bush row of the same
  // depth: farthest plane → farthest bushes → far plane → far bushes →
  // near plane → near bushes.
  //
  const bushColorBase = glowRgb(GLOW_PAL.treeColor.leaf)
  const grayNearPal = buildDimmedTreePalette(getTreePaletteGray(), INNER_GRAY, PAR_L1_BG_BLEND)
  //
  // Gray-phase 2nd/3rd rows collapse to uniform wood: leaves take the exact
  // trunk tone, so each deeper row reads as one flat gray silhouette.
  //
  const grayFarPal = buildDimmedTreePalette(getTreePaletteGray(), INNER_GRAY, PAR_L2_BG_BLEND, true, 0, true)
  const grayFarthestPal = buildDimmedTreePalette(getTreePaletteGray(), INNER_GRAY, PAR_L3_BG_BLEND, true, 0, true)
  //
  // Colour-world tones of the 2nd and 3rd rows: uniform-wood amber palettes
  // whose trunk tone IS the single flat orange of the whole row — the far
  // bushes take these tones pushed a touch further toward the haze, so the
  // bushes of a row read slightly warmer than the trees of the same row.
  //
  const colorFarPal = buildDimmedTreePalette(getTreePaletteAmber(), WARM_HAZE, PAR_L2_COLOR_BLEND, true, 0, true)
  const colorFarthestPal = buildDimmedTreePalette(getTreePaletteAmber(), WARM_HAZE, PAR_L3_COLOR_BLEND, true, 0, true)
  renderGlowTreePlane(grayCtx, colorCtx, {
    count: PAR_FARTHEST_TREE_COUNT,
    seedBase: PAR_FARTHEST_SEED_BASE,
    topMinY: PAR_FARTHEST_TOP_MIN_Y,
    topRange: PAR_FARTHEST_TOP_RANGE,
    grayBlend: PAR_L3_BG_BLEND,
    colorBase: getTreePaletteAmber(),
    colorBlend: PAR_L3_COLOR_BLEND,
    flatLeaves: true,
    leafDarken: 0,
    uniformWood: true,
    bandTop: PAR_FARTHEST_BAND_TOP,
    bandBottom: PAR_FARTHEST_BAND_BOTTOM,
    bandCount: PAR_FARTHEST_BAND_COUNT
  })
  renderBushStrip(grayCtx, colorCtx, {
    grayRgb: { r: grayFarthestPal.trunkR, g: grayFarthestPal.trunkG, b: grayFarthestPal.trunkB },
    colorRgb: lerpRgb({ r: colorFarthestPal.trunkR, g: colorFarthestPal.trunkG, b: colorFarthestPal.trunkB }, WARM_HAZE, BUSH_ROW_TINT_DELTA),
    colorFlat: true,
    grayFlat: true,
    heightScale: BUSH_FARTHEST_HEIGHT_SCALE
  })
  renderGlowTreePlane(grayCtx, colorCtx, {
    count: PAR_FAR_TREE_COUNT,
    seedBase: PAR_FAR_SEED_BASE,
    topMinY: PAR_FAR_TOP_MIN_Y,
    topRange: PAR_FAR_TOP_RANGE,
    grayBlend: PAR_L2_BG_BLEND,
    colorBase: getTreePaletteAmber(),
    colorBlend: PAR_L2_COLOR_BLEND,
    flatLeaves: true,
    leafDarken: 0,
    uniformWood: true,
    bandTop: PAR_FAR_BAND_TOP,
    bandBottom: PAR_FAR_BAND_BOTTOM,
    bandCount: PAR_FAR_BAND_COUNT
  })
  renderBushStrip(grayCtx, colorCtx, {
    grayRgb: { r: grayFarPal.trunkR, g: grayFarPal.trunkG, b: grayFarPal.trunkB },
    colorRgb: lerpRgb({ r: colorFarPal.trunkR, g: colorFarPal.trunkG, b: colorFarPal.trunkB }, WARM_HAZE, BUSH_ROW_TINT_DELTA),
    colorFlat: true,
    grayFlat: true,
    heightScale: BUSH_FAR_HEIGHT_SCALE
  })
  renderGlowTreePlane(grayCtx, colorCtx, {
    count: PAR_BIG_TREE_COUNT,
    seedBase: PAR_BIG_SEED_BASE,
    topMinY: PAR_BIG_TOP_MIN_Y,
    topRange: PAR_BIG_TOP_RANGE,
    grayBlend: PAR_L1_BG_BLEND,
    colorBase: getTreePaletteColor(),
    colorBlend: PAR_L1_COLOR_BLEND,
    flatLeaves: false,
    leafDarken: 0,
    uniformWood: false,
    leafWarmBlend: PAR_L1_LEAF_WARM_BLEND,
    bandTop: PAR_BIG_BAND_TOP,
    bandBottom: PAR_BIG_BAND_BOTTOM,
    bandCount: PAR_BIG_BAND_COUNT
  })
  renderBushStrip(grayCtx, colorCtx, {
    grayRgb: { r: grayNearPal.trunkR, g: grayNearPal.trunkG, b: grayNearPal.trunkB },
    colorRgb: lerpRgb(bushColorBase, WARM_HAZE, BUSH_COLOR_HAZE_BLEND_NEAR),
    colorFlat: false,
    grayFlat: false,
    heightScale: 1
  })
  //
  // Nothing below the ground line — trunks must never cross the ground band.
  // The cleared root zone is then filled with the earth band plus the
  // underground decor, matching the backdrop tones the image lies on: the
  // gray band uses the after-L darkened gray (the image only exists after
  // L), the colour band uses the dark colour-world earth.
  //
  grayCtx.clearRect(0, FLOOR_Y, SCREEN_W, SCREEN_H - FLOOR_Y)
  colorCtx.clearRect(0, FLOOR_Y, SCREEN_W, SCREEN_H - FLOOR_Y)
  const [ugGray, ugColor] = undergroundPaletteEntries()
  renderCombinedGroundBand(grayCtx, lerpRgb(INNER_GRAY, VOID, GROUND_L_DARKEN), undergroundSpec, ugGray)
  renderCombinedGroundBand(colorCtx, GROUND_DARK, undergroundSpec, ugColor)
  k.loadSprite(BG_COMBINED_GRAY_SPRITE, grayCanvas)
  k.loadSprite(BG_COMBINED_COLOR_SPRITE, colorCanvas)
  grayCanvas.width = 0
  grayCanvas.height = 0
  colorCanvas.width = 0
  colorCanvas.height = 0
}
//
// Paints the root-zone part of a combined background canvas: the flat earth
// band inside the playfield margins topped with the underground decor.
//
function renderCombinedGroundBand(ctx, bandRgb, undergroundSpec, ugEntry) {
  ctx.fillStyle = `rgb(${bandRgb.r}, ${bandRgb.g}, ${bandRgb.b})`
  ctx.fillRect(LEFT_MARGIN, FLOOR_Y, SCREEN_W - LEFT_MARGIN - RIGHT_MARGIN, PLAYFIELD_BOTTOM_Y - FLOOR_Y)
  renderUndergroundSpec(ctx, undergroundSpec, ugEntry)
}
//
// Renders one parallax plane into both combined canvases: BIG trees
// generated with the same glow-tree algorithm as the main tree (wider
// trunks, no roots, no hero branch, upward branches gathered at the trunk
// top). The tones are pre-blended toward the backdrop so the image stays
// opaque. Every trunk apex gets a lush baked canopy — neighbouring crowns
// merge into a solid leaf band across the top, while the screen middle
// keeps only the bare trunks. Trees grow across the entire width, including
// behind the main tree.
//
function renderGlowTreePlane(grayCtx, colorCtx, planeCfg) {
  const {
    count, seedBase, topMinY, topRange,
    grayBlend, colorBase, colorBlend, flatLeaves, leafDarken, uniformWood,
    leafWarmBlend = 0,
    bandTop, bandBottom, bandCount
  } = planeCfg
  //
  // Gray mode keeps the forest gray; the colour mode (after O) paints the
  // given colour base blended toward the warm haze, so deeper rows read
  // more orange and brighter, like the reference forest picture. From the
  // 2nd row on BOTH palettes collapse to uniform wood: leaves, wood and
  // bark all share the exact trunk tone — one flat silhouette per row.
  //
  const grayPal = buildDimmedTreePalette(getTreePaletteGray(), INNER_GRAY, grayBlend, flatLeaves, leafDarken, uniformWood)
  const colorPal = buildDimmedTreePalette(colorBase, WARM_HAZE, colorBlend, flatLeaves, leafDarken, uniformWood, leafWarmBlend)
  const treeXs = buildParallaxTreeXs(count, LEFT_MARGIN, SCREEN_W - RIGHT_MARGIN)
  treeXs.forEach((treeX, i) => {
    const trunkTopY = topMinY + Math.random() * topRange
    const treeSeed = TREE_SEED + seedBase + i * PAR_BIG_SEED_STEP
    const treeData = buildGlowTree(
      treeSeed,
      Math.round(treeX),
      PAR_TRUNK_BOTTOM_Y,
      Math.round(trunkTopY),
      PAR_TRUNK_BOTTOM_Y,
      PAR_TRUNK_BOTTOM_Y,
      {
        includeRoots: false,
        includeHeroBranch: false,
        branchFracMin: PAR_BRANCH_FRAC_MIN,
        branchFracMax: PAR_BRANCH_FRAC_MAX,
        branchUpward: true
      }
    )
    //
    // Background trees read even bigger than the main tree via wider wood.
    //
    const widthScale = PAR_BIG_WIDTH_SCALE_MIN + Math.random() * PAR_BIG_WIDTH_SCALE_RANGE
    scaleGlowTreeWidths(treeData, widthScale)
    //
    // Branch-cluster leaves stay inside the row's own leaf band — a
    // wandering branch may end low, but its leaves never sink below the
    // band bottom, so the whole row keeps one vertical leaf level.
    //
    const rowLeafFloor = Math.min(bandBottom, PAR_LEAF_MAX_Y)
    treeData.leaves = treeData.leaves.filter(leaf => leaf.y <= rowLeafFloor)
    renderGlowTreeIntoContext(grayCtx, treeData, grayPal, SCREEN_W, SCREEN_H)
    renderGlowTreeIntoContext(colorCtx, treeData, colorPal, SCREEN_W, SCREEN_H)
  })
  //
  // Row foliage: one dense full-width horizontal leaf band — every leaf at
  // roughly the same vertical level with a small random step up/down,
  // continuous from the left edge to the right edge.
  //
  const bandOpts = {
    seed: TREE_SEED + seedBase + PAR_BAND_SEED_OFFSET,
    x1: 0,
    x2: SCREEN_W,
    yTop: bandTop,
    yBottom: Math.min(bandBottom, PAR_LEAF_MAX_Y),
    count: bandCount
  }
  renderGlowLeafBandIntoContext(grayCtx, { ...bandOpts, palette: grayPal })
  renderGlowLeafBandIntoContext(colorCtx, { ...bandOpts, palette: colorPal })
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
// Renders one bush strip into both combined canvases: leafy mounds of
// varying radii centred on the ground line (everything below FLOOR_Y is
// cleared afterwards, so every mound is cut by the ground). The layout and
// every leaf placement are generated ONCE and painted with the gray and
// colour tones, so the two mode images stay pixel-aligned. Each mound is a
// filled dome plus scattered oval leaves and a ragged leaf rim, so the
// strip reads as real bushes in every mode.
//
function renderBushStrip(grayCtx, colorCtx, stripCfg) {
  const { grayRgb, colorRgb, colorFlat, grayFlat, heightScale } = stripCfg
  let x = LEFT_MARGIN
  const right = SCREEN_W - RIGHT_MARGIN
  while (x < right) {
    const radius = (BUSH_RADIUS_MIN + Math.random() * (BUSH_RADIUS_MAX - BUSH_RADIUS_MIN)) * heightScale
    const mound = buildLeafyBushMoundSpec(x, radius)
    drawLeafyBushMound(grayCtx, mound, grayRgb, grayFlat)
    drawLeafyBushMound(colorCtx, mound, colorRgb, colorFlat)
    //
    // Advance less than a radius so each mound overlaps the next one.
    //
    x += radius * (BUSH_STEP_MIN_FRAC + Math.random() * BUSH_STEP_RANGE_FRAC)
  }
}
//
// Generates the geometry of one leafy bush mound: the dome plus the exact
// position, size, tilt and shade index of every inner and rim leaf, so the
// same mound can be painted identically with different tones.
//
function buildLeafyBushMoundSpec(x, radius) {
  const leaves = []
  //
  // Inner leaves — density scales with the dome area; sqrt keeps the radial
  // distribution uniform so no thin spots appear near the rim.
  //
  const innerCount = Math.round(radius * radius * BUSH_LEAF_DENSITY)
  for (let i = 0; i < innerCount; i++) {
    const a = Math.PI + Math.random() * Math.PI
    const dist = radius * Math.sqrt(Math.random())
    leaves.push({
      x: x + Math.cos(a) * dist,
      y: FLOOR_Y + Math.sin(a) * dist,
      size: BUSH_LEAF_SIZE_MIN + Math.random() * BUSH_LEAF_SIZE_RANGE,
      angle: Math.random() * Math.PI * 2,
      shadeIdx: Math.floor(Math.random() * BUSH_LEAF_DARKEN_STEPS.length)
    })
  }
  //
  // Rim leaves — spaced along the arc, tilted along it, poking past the dome
  // edge so the silhouette gets an organic leafy fringe.
  //
  const rimCount = Math.max(4, Math.round(Math.PI * radius / BUSH_RIM_LEAF_SPACING))
  for (let i = 0; i < rimCount; i++) {
    const a = Math.PI + ((i + 0.5) / rimCount) * Math.PI + (Math.random() - 0.5) * 0.14
    leaves.push({
      x: x + Math.cos(a) * radius,
      y: FLOOR_Y + Math.sin(a) * radius,
      size: BUSH_LEAF_SIZE_MIN + Math.random() * BUSH_LEAF_SIZE_RANGE,
      angle: a + Math.PI / 2 + (Math.random() - 0.5) * 0.6,
      shadeIdx: Math.floor(Math.random() * 2)
    })
  }
  return { x, radius, leaves }
}
//
// Paints one prebuilt mound spec: a solid dome in the base tone (keeps the
// silhouette closed) and the leaf scatter with brightness-only shade
// variation resolved from the shade index of each leaf. With `flat` set all
// leaves take the exact dome tone, so the mound reads as one flat colour
// (the 2nd+ colour-world strips have no leaf details).
//
function drawLeafyBushMound(ctx, mound, rgb, flat = false) {
  const shades = BUSH_LEAF_DARKEN_STEPS.map(t => flat ? rgb : lerpRgb(rgb, VOID, t))
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  ctx.arc(mound.x, FLOOR_Y, mound.radius, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  mound.leaves.forEach(leaf => drawBushLeaf(ctx, leaf.x, leaf.y, leaf.size, leaf.angle, shades[leaf.shadeIdx]))
}
//
// One bush leaf — a plain rounded oval, deliberately a different shape than
// the teardrop tree leaves.
//
function drawBushLeaf(ctx, x, y, size, angle, rgb) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  ctx.ellipse(0, 0, size * 0.55, size * 0.32, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
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
  // warm haze backdrop, so the birds read as barely-there distant specks.
  //
  const c = lerpRgb(VOID, WARM_HAZE, BIRD_HAZE_BLEND)
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
// crossfade never shifts a single stone. Returns the generated spec so the
// combined background canvases can bake the exact same decor into their
// root zones.
//
function loadUndergroundSprites(k) {
  const spec = buildUndergroundSpec()
  const entries = undergroundPaletteEntries()
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
  return spec
}
//
// Underground decor palettes: the gray world sits on the playfield-gray
// earth band; the colour world sits on the near-black earth, so its
// features read as slightly lighter tones.
//
function undergroundPaletteEntries() {
  return [
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
  //
  // One buried skeleton sitting upright among the roots, facing the viewer
  // (reference-picture pose): a big front-view skull with dark eye sockets,
  // nasal hole and teeth, a vertical vertebra spine and a wide front-view
  // ribcage with arm bones along the sides. Tilted a touch, like it settled
  // there long ago. x/y is the skull centre. Placed well to the SIDE of the
  // main tree trunk, so the root network never covers it (resampled out of
  // the root spread zone).
  //
  const nearTreeRoots = (x) => Math.abs(x - TREE_X) < UG_SKELETON_TREE_CLEAR
  let skeletonX = areaX1 + 120 + Math.random() * (areaX2 - areaX1 - 240)
  let skeletonSafety = 0
  while (nearTreeRoots(skeletonX) && skeletonSafety < 40) {
    skeletonX = areaX1 + 120 + Math.random() * (areaX2 - areaX1 - 240)
    skeletonSafety++
  }
  const skeleton = {
    x: skeletonX,
    y: areaY1 + (areaY2 - areaY1) * (0.18 + Math.random() * 0.2),
    angle: (Math.random() - 0.5) * 0.16,
    skullR: 13 + Math.random() * 3
  }
  return { rocks, cracks, pebbles, rootlets, fossil, skeleton }
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
  //
  // Buried skeleton lying among the roots.
  //
  drawUndergroundSkeleton(ctx, spec.skeleton, tones)
}
//
// Draws the buried skeleton in the reference-picture pose: sitting upright
// and facing the viewer. A filled front-view skull with big dark eye
// sockets, a nasal hole and a toothy jaw; below it a vertical spine of
// vertebra ticks, a clavicle line, a wide front-view ribcage (paired rib
// arcs curving out and down from the spine) and two arm bones hanging along
// the sides. Light bone tone on the dark earth.
//
function drawUndergroundSkeleton(ctx, sk, tones) {
  const boneCss = `rgb(${tones.light.r}, ${tones.light.g}, ${tones.light.b})`
  const deepCss = `rgb(${tones.deep.r}, ${tones.deep.g}, ${tones.deep.b})`
  const r = sk.skullR
  ctx.save()
  ctx.translate(sk.x, sk.y)
  ctx.rotate(sk.angle)
  ctx.globalAlpha = 0.85
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  //
  // Skull — filled cranium dome plus a narrower jaw block below it, so the
  // head reads as one solid bone mass facing the viewer.
  //
  ctx.fillStyle = boneCss
  ctx.beginPath()
  ctx.arc(0, 0, r, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(-r * 0.62, r * 0.4)
  ctx.lineTo(r * 0.62, r * 0.4)
  ctx.lineTo(r * 0.5, r * 1.35)
  ctx.lineTo(-r * 0.5, r * 1.35)
  ctx.closePath()
  ctx.fill()
  //
  // Face — two big round eye sockets, the triangular nasal hole and the
  // mouth: a dark band across the jaw split by vertical bone teeth.
  //
  ctx.fillStyle = deepCss
  ctx.beginPath()
  ctx.arc(-r * 0.42, -r * 0.08, r * 0.3, 0, Math.PI * 2)
  ctx.arc(r * 0.42, -r * 0.08, r * 0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, r * 0.28)
  ctx.lineTo(-r * 0.14, r * 0.62)
  ctx.lineTo(r * 0.14, r * 0.62)
  ctx.closePath()
  ctx.fill()
  ctx.fillRect(-r * 0.48, r * 0.88, r * 0.96, r * 0.34)
  ctx.strokeStyle = boneCss
  ctx.lineWidth = 1.4
  for (let t = -1; t <= 1; t++) {
    ctx.beginPath()
    ctx.moveTo(t * r * 0.26, r * 0.84)
    ctx.lineTo(t * r * 0.26, r * 1.26)
    ctx.stroke()
  }
  //
  // Spine — a vertical run of vertebra ticks from the jaw down through the
  // chest, each tick a short horizontal bar so the column reads segmented.
  //
  const spineTopY = r * 1.5
  const spineBottomY = r * 5.6
  ctx.strokeStyle = boneCss
  ctx.lineWidth = r * 0.16
  ctx.beginPath()
  ctx.moveTo(0, spineTopY)
  ctx.lineTo(0, spineBottomY)
  ctx.stroke()
  ctx.lineWidth = r * 0.13
  for (let v = 0; v < 7; v++) {
    const vy = spineTopY + (spineBottomY - spineTopY) * (v / 6)
    ctx.beginPath()
    ctx.moveTo(-r * 0.24, vy)
    ctx.lineTo(r * 0.24, vy)
    ctx.stroke()
  }
  //
  // Clavicles — a shallow V from the spine top out to both shoulders.
  //
  const shoulderX = r * 1.9
  const shoulderY = r * 1.75
  ctx.lineWidth = r * 0.16
  ctx.beginPath()
  ctx.moveTo(-shoulderX, shoulderY)
  ctx.quadraticCurveTo(0, r * 2.05, shoulderX, shoulderY)
  ctx.stroke()
  //
  // Ribcage — four rib pairs curving out and down from the spine, the upper
  // pairs the widest, so the chest reads wide and rounded from the front.
  //
  ctx.lineWidth = r * 0.18
  for (let rib = 0; rib < 4; rib++) {
    const ribY = r * (2.35 + rib * 0.78)
    const ribW = r * (2.15 - rib * 0.22)
    const ribDrop = r * (0.85 - rib * 0.08)
    for (const side of [-1, 1]) {
      ctx.beginPath()
      ctx.moveTo(0, ribY)
      ctx.quadraticCurveTo(side * ribW, ribY + ribDrop * 0.2, side * ribW * 0.82, ribY + ribDrop)
      ctx.stroke()
    }
  }
  //
  // Arms — humerus bones hanging from the shoulders slightly outward, with
  // knobbed joints, like the arms rest at the skeleton's sides.
  //
  drawSkeletonBone(ctx, boneCss, -shoulderX, shoulderY, -shoulderX - r * 0.45, shoulderY + r * 2.6)
  drawSkeletonBone(ctx, boneCss, shoulderX, shoulderY, shoulderX + r * 0.45, shoulderY + r * 2.6)
  ctx.globalAlpha = 1
  ctx.restore()
}
//
// One bone: a line with small knob circles at both ends.
//
function drawSkeletonBone(ctx, boneCss, x1, y1, x2, y2) {
  ctx.strokeStyle = boneCss
  ctx.lineWidth = 1.5
  ctx.beginPath()
  ctx.moveTo(x1, y1)
  ctx.lineTo(x2, y2)
  ctx.stroke()
  ctx.beginPath()
  ctx.arc(x1, y1, 1.7, 0, Math.PI * 2)
  ctx.arc(x2, y2, 1.7, 0, Math.PI * 2)
  ctx.stroke()
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
          ? drawLogPlatform(k, w, h, ox, oy, 1, this._logDetail, glowLogColors(zones))
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
    drawLogPlatform(k, BONUS_PLAT_W, LOG_H, cx, cy, bonus.platformOpacity, logDetail, glowLogColors(zones))
    return
  }
  drawFlatLog(k, cx, cy, BONUS_PLAT_W, LOG_H, getRGB(k, GLOW_PAL.treeGray.trunk))
}
//
// Picks the log wood tones matching the main tree for the current phase:
// sand tones while the world is gray-lit, brown tones in the colour world.
//
function glowLogColors(zones) {
  const fade = zones._sceneRef?.colorFade ?? (zones.colorWorld ? 1 : 0)
  return fade > 0.5 ? LOG_TREE_COLOR_COLORS : LOG_TREE_LIT_COLORS
}
//
// Blinking letter — optional gold fill for G, with a hard drop shadow (one
// black copy offset right+down) instead of a full outline.
//
function createGlowLetter(k, char, x, y, tiltDeg, fillHex = GLOW_PAL.letterFill) {
  const fill = getRGB(k, fillHex)
  const offsets = [[GLOW_LETTER_SHADOW, GLOW_LETTER_SHADOW]]
  const outlines = offsets.map(([dx, dy]) => {
    const obj = k.add([
      k.text(char, { size: GLOW_LETTER_SIZE, font: GLOW_LETTER_FONT }),
      k.pos(x + dx, y + dy),
      k.anchor('center'),
      k.rotate(tiltDeg),
      k.color(GLOW_LETTER_SHADOW_R, GLOW_LETTER_SHADOW_G, GLOW_LETTER_SHADOW_B),
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
// Swaying grass — the shared Grass component, excluding water, trunk and the
// trampoline mushroom band (so no blade ever covers its face). The tint
// callback also hides blades of unexplored ground sides.
//
function createGlowGrass(k, waterX1, waterX2, trampX, zones) {
  const trunkL = TREE_X - TRUNK_EXCLUDE_HALF
  const trunkR = TREE_X + TRUNK_EXCLUDE_HALF
  const trampL = trampX - TRAMP_GRASS_CLEAR_HALF
  const trampR = trampX + TRAMP_GRASS_CLEAR_HALF
  const excluded = (x) => (x >= waterX1 && x <= waterX2) || (x >= trunkL && x <= trunkR) || (x >= trampL && x <= trampR)
  const grass = Grass.create({
    k,
    floorY: FLOOR_Y,
    left: LEFT_MARGIN + 20,
    right: SCREEN_W - RIGHT_MARGIN - 20,
    tuftCount: GRASS_TUFT_COUNT,
    z: GRASS_Z,
    excluded,
    getTint: (blade) => glowGrassTint(zones, blade)
  })
  grass.layer.hidden = true
  return grass
}
//
// Resolves the tint of one grass blade for the current frame: null while the
// blade's ground side is unexplored; otherwise the shared decor tone — plain
// decor gray before L, darkened toward void after L, cross-fading to green
// in the colour world.
//
function glowGrassTint(zones, blade) {
  const side = blade.x >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
  if (side === 'left' && !zones.groundDecorLeft) return null
  if (side === 'right' && !zones.groundDecorRight) return null
  const fade = zones._sceneRef?.colorFade ?? 0
  const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(zones._sceneRef))
  return lerpRgb(gray, GRASS_GREEN, fade)
}
//
// Rocks — flat value 5 silhouettes.
//
function createGlowRocks(k, treeBaseLeftX, rightPlatX, trampX, zones) {
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
  // Right side — scatter rocks spread across the whole lower-right ground,
  // never in front of the trampoline mushroom (resampled out of its zone).
  //
  const rightEdge = SCREEN_W - RIGHT_MARGIN - 40
  const nearTramp = (x) => Math.abs(x - trampX) <= TRAMP_ROCK_CLEAR_HALF
  for (let i = 0; i < RIGHT_ROCK_COUNT; i++) {
    const radius = SCATTER_ROCK_RADIUS_MIN + Math.random() * (SCATTER_ROCK_RADIUS_MAX - SCATTER_ROCK_RADIUS_MIN)
    let cx = TREE_X + 80 + Math.random() * (rightEdge - TREE_X - 80)
    let safety = 0
    while (nearTramp(cx) && safety < 40) {
      cx = TREE_X + 80 + Math.random() * (rightEdge - TREE_X - 80)
      safety++
    }
    if (nearTramp(cx)) continue
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
function createGlowMushrooms(k, waterX1, waterX2, trampX, zones) {
  const objs = []
  const left = LEFT_MARGIN + 60
  const right = SCREEN_W - RIGHT_MARGIN - 60
  //
  // A random X is rejected while it falls inside the water band OR inside
  // the keep-out band around the trampoline mushroom (nothing may cover it).
  //
  const isBadSpot = (x) => (x >= waterX1 && x <= waterX2) || Math.abs(x - trampX) <= TRAMP_MUSHROOM_CLEAR_HALF
  for (let i = 0; i < MUSHROOM_COUNT; i++) {
    const capW = MUSHROOM_CAP_W_MIN + Math.random() * (MUSHROOM_CAP_W_MAX - MUSHROOM_CAP_W_MIN)
    const mushW = Math.ceil(capW)
    const totalW = mushW + 2
    const totalH = Math.ceil(mushW * CUTE_MUSHROOM_ASPECT) + 2
    let posX = left + Math.random() * (right - left)
    let safety = 0
    while (isBadSpot(posX) && safety < 40) {
      posX = left + Math.random() * (right - left)
      safety++
    }
    if (isBadSpot(posX)) continue
    const posY = FLOOR_Y - totalH + MUSHROOM_EXTRA_LOWER
    const spriteName = `glow0-mush-${i}`
    //
    // Gray-phase variant — the same cute mushroom painted entirely inside the
    // gray palette family (no face on the small decor mushrooms).
    //
    const mushCanvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawCuteMushroomToCanvas(ctx, {
        cx: totalW / 2,
        baseY: totalH - 2,
        width: mushW,
        colors: CUTE_MUSH_GRAY_COLORS,
        withFace: false
      })
    })
    k.loadSprite(spriteName, mushCanvas)
    mushCanvas.width = 0
    mushCanvas.height = 0
    //
    // Colour-world variant — cap tones from this mushroom's colour family,
    // cream body shared with the trampoline mushroom.
    //
    const capIdx = i % MUSHROOM_CAP_HEX.length
    const mushColorCanvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawCuteMushroomToCanvas(ctx, {
        cx: totalW / 2,
        baseY: totalH - 2,
        width: mushW,
        colors: {
          ...CUTE_MUSH_COLORS,
          cap: MUSHROOM_CAP_HEX[capIdx],
          capDark: MUSHROOM_CAP_DARK_HEX[capIdx],
          capLight: MUSHROOM_CAP_LIGHT_HEX[capIdx]
        },
        withFace: false
      })
    })
    k.loadSprite(spriteName + DECOR_OUTLINE_SUFFIX, mushColorCanvas)
    mushColorCanvas.width = 0
    mushColorCanvas.height = 0
    //
    // Anchor at the base so whistle lean rotates around the ground, not the cap
    //
    const baseX = posX
    const baseY = FLOOR_Y + MUSHROOM_EXTRA_LOWER
    const obj = k.add([
      k.sprite(spriteName),
      k.pos(baseX, baseY),
      k.anchor('bot'),
      k.z(7)
    ])
    obj._graySprite = spriteName
    obj._outlineSprite = spriteName + DECOR_OUTLINE_SUFFIX
    obj._outlined = false
    obj._side = posX >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
    obj._homeX = baseX
    obj._homeY = baseY
    obj._glowPhase = Math.random() * Math.PI * 2
    obj.leanAngle = 0
    obj.hidden = true
    obj.pos.y = PLATFORM_HIDE_Y
    objs.push(obj)
  }
  return objs
}
//
// Mushroom trampoline — the cute chubby mushroom with a blushy face. Four
// pre-baked variants cover both worlds and both eye states: gray family in
// the gray phase, warm colours after O; the eyes blink by sprite swap.
//
function createMushroomTrampoline(k, trampX, floorY, zones) {
  bakeTrampolineVariant(k, TRAMP_SPRITE, CUTE_MUSH_GRAY_COLORS, true)
  bakeTrampolineVariant(k, TRAMP_SPRITE + TRAMP_BLINK_SPRITE_SUFFIX, CUTE_MUSH_GRAY_COLORS, false)
  bakeTrampolineVariant(k, TRAMP_OUTLINE_SPRITE, CUTE_MUSH_COLORS, true)
  bakeTrampolineVariant(k, TRAMP_OUTLINE_SPRITE + TRAMP_BLINK_SPRITE_SUFFIX, CUTE_MUSH_COLORS, false)
  const spritePos = k.vec2(trampX - TRAMP_TOTAL_W / 2, floorY - TRAMP_TOTAL_H + TRAMP_SINK_Y)
  const state = {
    squash: 0,
    cooldown: 0,
    x: trampX,
    blinking: false,
    blinkTimer: TRAMP_BLINK_MIN_INTERVAL + Math.random() * (TRAMP_BLINK_MAX_INTERVAL - TRAMP_BLINK_MIN_INTERVAL),
    leanAngle: 0
  }
  const colliderHome = { x: trampX - TRAMP_CAP_W / 2, y: floorY - TRAMP_TOTAL_H }
  const drawLayer = k.add([
    k.z(6),
    {
      draw() {
        if (!zones.groundDecorRight) return
        //
        // Colour world swaps in the coloured sprite set; the gray phase
        // applies the after-L darkening tint (white = untinted). A blink
        // swaps to the closed-eyes variant of the current set.
        //
        const outlined = (zones._sceneRef?.colorFade ?? 0) >= 0.5
        const base = outlined ? TRAMP_OUTLINE_SPRITE : TRAMP_SPRITE
        const sprite = state.blinking ? base + TRAMP_BLINK_SPRITE_SUFFIX : base
        const tint = outlined ? { r: 255, g: 255, b: 255 } : grayDecorTint(zones._sceneRef)
        const color = k.rgb(tint.r, tint.g, tint.b)
        const angle = state.leanAngle || 0
        if (state.squash > 0.01) {
          const scaleY = 1 - state.squash * 0.35
          const baseY = floorY - TRAMP_TOTAL_H * scaleY + TRAMP_SINK_Y
          k.drawSprite({
            sprite,
            pos: k.vec2(trampX, floorY + TRAMP_SINK_Y),
            anchor: 'bot',
            scale: k.vec2(1, scaleY),
            angle,
            color
          })
          spritePos.y = baseY
        } else {
          spritePos.y = floorY - TRAMP_TOTAL_H + TRAMP_SINK_Y
          k.drawSprite({
            sprite,
            pos: k.vec2(trampX, floorY + TRAMP_SINK_Y),
            anchor: 'bot',
            angle,
            color
          })
        }
      }
    }
  ])
  drawLayer.onUpdate(() => onUpdateTrampolineBlink(k, state))
  drawLayer.hidden = true
  return { state, drawLayer, colliderHome }
}
//
// Bakes one static PNG variant of the trampoline mushroom (with face).
//
function bakeTrampolineVariant(k, name, colors, eyesOpen) {
  const canvas = toCanvas({ width: TRAMP_TOTAL_W, height: TRAMP_TOTAL_H, pixelRatio: 1 }, (ctx) => {
    drawCuteMushroomToCanvas(ctx, {
      cx: TRAMP_TOTAL_W / 2,
      baseY: TRAMP_TOTAL_H - 2,
      width: TRAMP_W,
      colors,
      withFace: true,
      eyesOpen
    })
  })
  k.loadSprite(name, canvas)
  canvas.width = 0
  canvas.height = 0
}
//
// Advances the trampoline blink cycle: long random pause with open eyes,
// then a short closed-eyes hold.
//
function onUpdateTrampolineBlink(k, state) {
  state.blinkTimer -= k.dt()
  if (state.blinkTimer > 0) return
  if (state.blinking) {
    state.blinking = false
    state.blinkTimer = TRAMP_BLINK_MIN_INTERVAL + Math.random() * (TRAMP_BLINK_MAX_INTERVAL - TRAMP_BLINK_MIN_INTERVAL)
  } else {
    state.blinking = true
    state.blinkTimer = TRAMP_BLINK_DURATION
  }
}
//
// Water — value 5 fill bounded by wave polygon.
//
function createWater(k, x1, x2, zones) {
  const waterY = FLOOR_Y - 8
  const p1 = k.vec2(0, 0)
  const p2 = k.vec2(0, 0)
  //
  // Top wave samples + mirrored bottom samples for a sloping lake bed
  //
  const ptsCache = Array.from({ length: (LAKE_SEGMENTS + 1) * 2 }, () => k.vec2(0, 0))
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
        fillLakeSurfaceAndBed(ptsCache, x1, x2, waterY, time)
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
// Below-ground mask under the lake bed — hides the hero once he sinks past
// the water fill. Must follow the same sloping/chaotic bed as createWater so
// drowning never flattens the visible depth ramp back to a rectangle.
//
function createDrownMask(k, x1, x2, zones) {
  const waterY = FLOOR_Y - 8
  const bedPts = Array.from({ length: (LAKE_SEGMENTS + 1) * 2 }, () => k.vec2(0, 0))
  return k.add([
    k.z(LAKE_Z + 1),
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
        const color = k.rgb(c.r, c.g, c.b)
        //
        // Top edge of the mask = water bed (same depth function as the lake).
        // Bottom edge = playfield floor. Water polygon stays fully visible.
        //
        const span = x2 - x1
        for (let i = 0; i <= LAKE_SEGMENTS; i++) {
          const t = i / LAKE_SEGMENTS
          const x = x1 + t * span
          const depth = waterBedDepthAt(t)
          bedPts[i].x = x
          bedPts[i].y = waterY + depth
          const bi = (LAKE_SEGMENTS + 1) * 2 - 1 - i
          bedPts[bi].x = x
          bedPts[bi].y = PLAYFIELD_BOTTOM_Y
        }
        k.drawPolygon({ pts: bedPts, color })
        //
        // Shore pad past the lake's right edge — flat cover below the ground
        // line so a drowning hero near the bank stays hidden.
        //
        if (DROWN_MASK_RIGHT_PAD > 0) {
          k.drawRect({
            pos: k.vec2(x2, FLOOR_Y),
            width: DROWN_MASK_RIGHT_PAD,
            height: PLAYFIELD_BOTTOM_Y - FLOOR_Y,
            color
          })
        }
      }
    }
  ])
}
//
// Shared lake bed depth at normalized x (0 = left/deep, 1 = right/shallow)
//
function waterBedDepthAt(t) {
  const u = Math.pow(t, WATER_BED_DEPTH_POWER)
  const base = WATER_DEPTH_LEFT + (WATER_DEPTH_RIGHT - WATER_DEPTH_LEFT) * u
  const chaos = Math.sin(t * WATER_BED_CHAOS_A + 0.4) * WATER_BED_CHAOS_AMP_A +
    Math.sin(t * WATER_BED_CHAOS_B + 1.7) * WATER_BED_CHAOS_AMP_B
  return Math.max(WATER_DEPTH_RIGHT, base + chaos * (1 - t))
}
//
// Fills surface wave + bed samples into ptsCache (same layout as createWater)
//
function fillLakeSurfaceAndBed(ptsCache, x1, x2, waterY, time) {
  const span = x2 - x1
  for (let i = 0; i <= LAKE_SEGMENTS; i++) {
    const t = i / LAKE_SEGMENTS
    const x = x1 + t * span
    const wave = Math.sin(time * LAKE_WAVE_FREQ + t * LAKE_WAVE_PHASE_SCALE) * LAKE_WAVE_AMP
    ptsCache[i].x = x
    ptsCache[i].y = waterY + wave
    const bi = (LAKE_SEGMENTS + 1) * 2 - 1 - i
    ptsCache[bi].x = x
    ptsCache[bi].y = waterY + waterBedDepthAt(t)
  }
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
    // Colour world splits the playfield backdrop at the ground line: a
    // bright warm orange haze above it (the glowing distance seen between
    // the trunks at the screen centre), dark earth in the root zone below.
    // Both lerp from the flat inner gray as the colour fade progresses.
    //
    const grayGround = zones.lZone && innerGray ? lerpRgb(INNER_GRAY, VOID, GROUND_L_DARKEN) : inner
    const skyC = lerpRgb(inner, WARM_HAZE, fade)
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
  // Birds glide across the sky behind the combined forest (colour world only).
  //
  drawBackgroundBirds(inst)
  if (inst.zones.lZoneParallax) {
    //
    // The whole background (forest planes, bush strips, earth band and the
    // underground decor) lives in ONE opaque image per mode. The only
    // transparencies are transient: the fade-in reveal after L and the
    // gray↔colour crossfade after O.
    //
    const pf = inst.parallaxFade
    k.drawSprite({ sprite: BG_COMBINED_GRAY_SPRITE, pos: k.vec2(0, 0), opacity: (1 - fade) * pf })
    fade > 0 && k.drawSprite({ sprite: BG_COMBINED_COLOR_SPRITE, pos: k.vec2(0, 0), opacity: fade * pf })
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
  updateMushroomWhistleLean(inst)
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
  const grayTint = grayDecorTint(inst)
  inst.mushObjs.forEach(obj => {
    if (obj.hidden) return
    //
    // Colour-world sprite is pre-baked in the real cap colours — fade its
    // multiply tint from gray toward white so the true colours emerge as the
    // world colours in. The gray-family sprite only takes the after-L
    // darkening multiply (white = untinted).
    //
    if (obj._outlined) {
      const t = Math.max(0, (fade - 0.5) * 2)
      const c = lerpRgb(gray, white, t)
      obj.color = inst.k.rgb(c.r, c.g, c.b)
      return
    }
    obj.color = inst.k.rgb(grayTint.r, grayTint.g, grayTint.b)
  })
  updateRockTints(inst)
  updateDecorOutlines(inst)
}
//
// Smooth lean toward each whistle note while the heroine sings idle
//
function updateMushroomWhistleLean(inst) {
  const hero = inst.heroInst
  const dt = inst.k.dt()
  //
  // Lean while the idle melody is active — including O-meditation countdown
  // (setEyesClosed clears eyesClosedBySinging, but the whistle keeps playing).
  //
  const singing = (hero?.idleStillTime ?? 0) >= GLOW_MUSHROOM_WHISTLE_IDLE
  const pulse = hero?.whistlePulse ?? 0
  const side = hero?.whistleLeanSide ?? 1
  inst.mushObjs.forEach(obj => {
    if (obj.hidden) {
      obj.leanAngle = 0
      obj.angle = 0
      return
    }
    const target = singing
      ? side * GLOW_MUSHROOM_WHISTLE_AMP_DEG * pulse *
        (0.7 + 0.3 * Math.sin(obj._glowPhase || 0))
      : 0
    obj.leanAngle += (target - obj.leanAngle) * Math.min(1, dt * GLOW_MUSHROOM_WHISTLE_SMOOTH)
    if (!singing && Math.abs(obj.leanAngle) < 0.15) obj.leanAngle = 0
    obj.angle = obj.leanAngle
  })
  //
  // Trampoline mushroom sways with the same pulse when visible
  //
  const tramp = inst.trampState
  if (tramp && inst.zones.groundDecorRight) {
    const target = singing
      ? side * GLOW_MUSHROOM_WHISTLE_AMP_DEG * pulse * 0.85
      : 0
    tramp.leanAngle = (tramp.leanAngle ?? 0) +
      (target - (tramp.leanAngle ?? 0)) * Math.min(1, dt * GLOW_MUSHROOM_WHISTLE_SMOOTH)
    if (!singing && Math.abs(tramp.leanAngle) < 0.15) tramp.leanAngle = 0
  }
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
  applyZoneVisibility(inst)
  //
  // Defer gold recolour — immediate sprite/hitbox swap on the O log restarts
  // the crouch→land loop right after the dialog Space release.
  //
  inst.k.wait(GOLD_RECOLOR_DELAY, () => {
    applyColorWorldHero(inst)
    const hero = inst.heroInst
    const char = hero?.character
    if (hero) {
      forceHeroIdleOnLog(inst)
      hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_GLOW)
    }
    char?.pos && forceSettleHeroOnNearestLog(inst, char)
    //
    // Gold sprite/hitbox swap can nudge Y — refresh the post-dialog pin
    //
    if (inst.dialogInputGrace > 0 && char?.pos) {
      inst.dialogPinY = char.pos.y
      inst.dialogHeroPinned = true
    }
  })
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
  Hero.syncPlatformLanding(hero)
  //
  // Sprite/hitbox swap briefly ungrounds on wood — lock out jump/land crouch
  //
  hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_GLOW)
  hero.landFxCooldown = Math.max(hero.landFxCooldown || 0, 0.25)
  k.wait(GOLD_SWAP_DELAY, () => {
    if (!hero.character?.exists?.()) return
    try {
      Hero.syncPlatformLanding(hero)
      hero.character.use(k.sprite(`${hero.spritePrefix}_0_0`))
      hero.currentEyeSprite = `${hero.spritePrefix}_0_0`
      hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_GLOW)
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
    + `${hero.outlineOnly ? '_outline' : ''}${eyeWhite ? '_ew' + eyeWhite : ''}`
}
//
// First L reveal step after the dialog closes: the ground darkens and the
// reveal chime plays; the forest follows a second later.
//
function revealLLitZone(inst) {
  if (inst.zones.lZoneLit) return
  inst.zones.lZoneLit = true
  inst.zones.lZone = true
  set(KEY_REVEALED_L_LIT, true)
  //
  // Silent: the lit/sun step and the forest fade-in have no reveal chime
  //
}
//
// Reveals the combined background forest one second after the first L step.
// Trees fade in via parallaxFade — no reveal sound.
//
function revealLParallaxZone(inst) {
  if (inst.zones.lZoneParallax) return
  inst.zones.lZoneParallax = true
  set(KEY_REVEALED_L, true)
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
// Opens a letter dialog with glow styling. Optional voice-over starts with
// the panel and stops on any close path (Esc / Space / Enter / click).
//
function openGlowLetterDialog(inst, text, onCloseExtra, dialogSoundName = null) {
  inst.dialogOpen = true
  pinHeroForLetterDialog(inst)
  playGlowLetterDialogMusic(inst, dialogSoundName)
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
    onCloseStart: () => {
      stopGlowLetterDialogMusic(inst)
      //
      // Kill squash immediately on Space/Esc — do not wait for fade-out,
      // or the same press can leave jump-0 looping on the wood log.
      //
      forceHeroIdleOnLog(inst)
      Hero.armJumpKeyReleaseGate(inst.heroInst)
      inst.heroInst.controlsDisabled = true
      inst.heroInst.controllable = false
      inst.heroInst.canJump = false
    },
    onClose: () => {
      stopGlowLetterDialogMusic(inst)
      unpinHeroAfterLetterDialog(inst)
      inst.dialogOpen = false
      onCloseExtra?.()
    }
  })
}
//
// Settles jump/land squash and pins the hero so wood-platform physics cannot
// fight the dialog freeze (landing + dialog used to twitch up/down forever).
//
function pinHeroForLetterDialog(inst) {
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  //
  // Clear jump tuck / land squash once, then hard-settle on the log under
  // the hero. Calling syncPlatformLanding every pinned frame fought Kaplay
  // and made O/L platforms twitch up and down.
  //
  forceHeroIdleOnLog(inst)
  if (char.vel) {
    char.vel.x = 0
    char.vel.y = 0
  }
  forceSettleHeroOnNearestLog(inst, char)
  inst.dialogPinY = char.pos.y
  inst.dialogHeroPinned = true
  if (typeof char.gravityScale === 'number') {
    inst._dialogSavedGravityScale = char.gravityScale
    char.gravityScale = 0
  }
}
//
// Restores gravity after a letter dialog closes.
//
function unpinHeroAfterLetterDialog(inst) {
  const hero = inst.heroInst
  const char = hero?.character
  //
  // Keep gravity off and Y pinned through the grace window — restoring
  // gravity on Esc/Space used to drop the hero 1 px onto the log and
  // trigger a land-crouch (or Space crouch→jump) on wood platforms.
  //
  inst.dialogInputGrace = DIALOG_INPUT_GRACE
  if (hero) {
    forceHeroIdleOnLog(inst)
    Hero.armJumpKeyReleaseGate(hero)
    hero.controlsDisabled = true
    hero.controllable = false
    hero.canJump = false
  }
  if (char?.pos) {
    forceSettleHeroOnNearestLog(inst, char)
    inst.dialogPinY = char.pos.y
    inst.dialogHeroPinned = true
  }
}
//
// Restores gravity and releases the post-dialog Y pin once the grace ends.
//
function releaseDialogPin(inst) {
  const hero = inst.heroInst
  const char = hero?.character
  inst.dialogHeroPinned = false
  //
  // Settle on the log top first (no embed), then restore gravity so Kaplay
  // does not resolve an overlapping hitbox by pushing the hero through wood.
  //
  forceHeroIdleOnLog(inst)
  char?.pos && forceSettleHeroOnNearestLog(inst, char)
  if (char && inst._dialogSavedGravityScale !== undefined) {
    char.gravityScale = inst._dialogSavedGravityScale
    inst._dialogSavedGravityScale = undefined
  }
  if (hero && !inst.heroLockedAfterW) {
    hero.canJump = true
  }
}
//
// Clears jump/land squash and forces the idle sprite on the nearest log.
//
function forceHeroIdleOnLog(inst) {
  const hero = inst.heroInst
  if (!hero) return
  hero.isSquashing = false
  hero.squashTimer = 0
  hero.landSquashTimer = 0
  hero.isRunning = false
  hero.wasJumping = false
  hero.jumpPhase = 'none'
  hero.jumpFrame = 0
  hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_GLOW)
  Hero.syncPlatformLanding(hero)
}
//
// Places the hero on the nearest revealed log top, ignoring squash/hover gates
// used by the normal snap path (dialog open must never leave him mid-land).
//
function forceSettleHeroOnNearestLog(inst, char) {
  const heroX = char.pos.x
  const z = inst.zones
  const homes = []
  z.lPlatRevealed && z.gCollected && homes.push(inst.lPlatHome)
  z.oZone && z.lCollected && homes.push(inst.oPlatHome)
  z.wZone && z.oCollected && homes.push(inst.wPlatHome)
  for (const home of homes) {
    if (heroX < home.x - LOG_SNAP_X_SLACK || heroX > home.x + LOG_W + LOG_SNAP_X_SLACK) continue
    const platTop = home.y + LOG_COLLISION_DROP_Y
    //
    // Sit on the wood top without embedding. Dialog pin + LOG_SNAP_EMBED used
    // to leave the hitbox overlapping the thin log; restoring gravity then
    // ejected the hero downward through the platform.
    //
    char.pos.y = platTop - SURFACE_DETECT_Y
    if (char.vel) {
      char.vel.x = 0
      char.vel.y = 0
    }
    const hero = inst.heroInst
    if (hero) {
      hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_GLOW)
      hero.landFxCooldown = Math.max(hero.landFxCooldown || 0, 0.2)
      hero.canJump = true
    }
    return
  }
}
//
// Starts a letter dialog voice-over (stops any previous one first).
//
function playGlowLetterDialogMusic(inst, soundName) {
  stopGlowLetterDialogMusic(inst)
  if (!soundName) return
  Sound.duckBackgroundMusic(inst.birdsMusic, CFG.audio.backgroundMusic.dialogMusicDuck)
  inst.letterDialogMusic = Sound.playInScene(
    inst.k,
    soundName,
    CFG.audio.backgroundMusic.glowLetterDialog
  )
}
//
// Stops the active letter dialog voice-over, if any.
//
function stopGlowLetterDialogMusic(inst) {
  inst.letterDialogMusic?.stop?.()
  inst.letterDialogMusic = null
  Sound.unduckBackgroundMusic(inst.birdsMusic)
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
  }, GLOW_DIALOG_SOUND_G)
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
    revealLLitZone(inst)
    inst.lParallaxTimer = L_PARALLAX_DELAY
  }, GLOW_DIALOG_SOUND_L)
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
    forceHeroIdleOnLog(inst)
    const char = inst.heroInst?.character
    if (char?.pos) {
      forceSettleHeroOnNearestLog(inst, char)
      inst.dialogPinY = char.pos.y
      inst.dialogHeroPinned = true
    }
  }, GLOW_DIALOG_SOUND_O)
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
  //
  // Closing line above the hero, then transition straight into touch lesson 0
  // (no menu stop, no pre-level phrase).
  //
  //
  // Lock run/jump until the scene transitions — W is the end of glow
  //
  inst.heroLockedAfterW = true
  const hero = inst.heroInst
  if (hero) {
    hero.controllable = false
    hero.controlsDisabled = true
    hero.canJump = false
    forceHeroIdleOnLog(inst)
  }
  HeroHint.show(inst.heroHint, HINT_W_TEXT, HINT_W_DURATION)
  inst.k.wait(HINT_W_DURATION, () => {
    Sound.stopAmbient(inst.sound)
    inst.birdsMusic?.stop?.()
    stopGlowLetterDialogMusic(inst)
    set('lastLesson', 'lesson-touch.0')
    //
    // menu-touch → lesson-touch.0 transition path (no pre-level phrase)
    //
    createLevelTransition(inst.k, 'menu-touch')
  })
}
//
// Converts an { r, g, b } tone to the hex string the backdrop helper expects.
//
function rgbToHex(c) {
  return `#${((1 << 24) + (c.r << 16) + (c.g << 8) + c.b).toString(16).slice(1)}`
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
  // The sinking hero shuts his eyes and drops into a clean idle pose —
  // enterCalmPose clears any mid-air jump/run frame so the hero never rests
  // on the water surface sideways.
  //
  Hero.enterCalmPose(inst.heroInst)
  //
  // One water splash take marks the fall into the lake.
  //
  Sound.playWaterStepsFootstepKaplay(inst.k, WATER_STEPS_VOLUME)
  revealWaterZone(inst)
  //
  // First drowning ever: a consolation hint over the sinking hero. Every
  // drowning after that gets a random self-ironic joke instead.
  //
  if (!get(KEY_DROWN_HINT_SHOWN, false)) {
    set(KEY_DROWN_HINT_SHOWN, true)
    HeroHint.show(inst.heroHint, HINT_DROWN_TEXT, HINT_DROWN_DURATION)
  } else {
    HeroHint.show(inst.heroHint, DROWN_JOKES[Math.floor(Math.random() * DROWN_JOKES.length)], HINT_DROWN_DURATION)
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
  if (inst.dialogOpen || inst.introLock || inst.heroLockedAfterW) {
    inst.heroInst.controllable = false
    inst.heroInst.controlsDisabled = true
  }
  if (inst.dialogInputGrace > 0) {
    inst.dialogInputGrace -= k.dt()
    inst.heroInst.controllable = false
    inst.heroInst.controlsDisabled = true
    if (inst.dialogInputGrace <= 0) {
      inst.dialogInputGrace = 0
      releaseDialogPin(inst)
    }
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
  if (!inst.dialogOpen && !inst.introLock && !(inst.dialogInputGrace > 0) && !inst.heroLockedAfterW) {
    hero.controllable = true
    hero.controlsDisabled = false
  }
  //
  // While a letter dialog is open (or during post-close grace) the hero must
  // stand still. Continuous log snap fought Kaplay physics and made him twitch
  // up/down on wood platforms. Pin Y once, then freeze velocity every frame.
  //
  if (inst.dialogOpen || inst.dialogInputGrace > 0) {
    if (char.vel) {
      char.vel.x = 0
      char.vel.y = 0
    }
    if (inst.dialogOpen && !inst.dialogHeroPinned) {
      pinHeroForLetterDialog(inst)
    } else if (inst.dialogHeroPinned) {
      //
      // Hold the settled Y only — never re-run syncPlatformLanding here
      // (it resizes the hitbox and shifts pos.y, fighting the pin).
      //
      char.pos.y = inst.dialogPinY
    }
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
  !inst.dialogOpen && !(inst.dialogInputGrace > 0) && snapHeroToLogPlatforms(inst, char)
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
  updateHeroGazeAtG(inst)
  inst.lastHeroX = heroX
}
//
// Locks the hero's gaze on the G letter while he stands on the start branch
// and the letter is still uncollected; releases the eyes to their normal
// wander everywhere else.
//
function updateHeroGazeAtG(inst) {
  const heroInst = inst.heroInst
  const ch = heroInst?.character
  if (!ch?.pos) return
  const g = inst.gLetter
  const branch = inst.woodSurfaces?.[0]
  const onBranch = Boolean(branch &&
    ch.pos.x >= branch.x1 && ch.pos.x <= branch.x2 &&
    Math.abs(ch.pos.y - branch.y) < GAZE_BRANCH_Y_TOLERANCE)
  const shouldGaze = Boolean(g && !g.main.hidden && !inst.zones.gCollected && onBranch)
  heroInst.lookAtPos = shouldGaze ? { x: g.x, y: g.y } : null
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
  const hero = inst.heroInst
  //
  // Never interrupt crouch→jump squash — that left the hero unable to leave
  // the log (jump "broke" after landing on wood).
  //
  if (hero?.isSquashing) {
    inst.logHoverFrames = 0
    return
  }
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
  const grounded = typeof char.isGrounded === 'function' && char.isGrounded()
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
    // Standing on the log like on the branch / ground: Kaplay owns the pose.
    //
    if (grounded && footY <= platTop + LOG_SNAP_STANDING_MAX) {
      inst.logHoverFrames = 0
      return
    }
    //
    // Anti-tunnel: only deep sinks. Shallow overlap is normal landing contact.
    //
    if (footY > platTop + LOG_SNAP_DEEP_SINK && footY <= platTop + LOG_SNAP_BELOW) {
      //
      // Still in a real fall — let Kaplay land; pinning mid-fall broke jumps.
      //
      if (velY >= LOG_SNAP_FALL_VEL) continue
      settleHeroOnLog(inst, char, platTop)
      inst.logHoverFrames = 0
      return
    }
    //
    // Hover candidate: suspended above the log, no vertical motion, no ground
    // contact — counted across frames by the watchdog below.
    //
    const suspended = footY < platTop - LOG_SNAP_TOLERANCE && footY >= platTop - LOG_HOVER_BAND
    suspended && velY < 1 && !grounded && (hoverHome = home)
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
    settleHeroOnLog(inst, char, hoverHome.y + LOG_COLLISION_DROP_Y)
    inst.logHoverFrames = 0
  }
}
//
// Pins the hero on a log top with a 1 px embed so Kaplay keeps him grounded
// (exact surface placement left isGrounded false → jump squash never fired).
// postLandAirLock blocks a snap-induced second crouch.
//
function settleHeroOnLog(inst, char, platTop) {
  const hero = inst.heroInst
  //
  // During letter dialogs always settle — land-squash must not leave the hero
  // hovering / twitching on wood while controls are locked.
  //
  if (hero?.isSquashing && !inst.dialogOpen) return
  char.pos.y = platTop - SURFACE_DETECT_Y + LOG_SNAP_EMBED
  if (char.vel) char.vel.y = 0
  if (!hero) return
  hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_GLOW)
  hero.landFxCooldown = Math.max(hero.landFxCooldown || 0, 0.2)
  hero.canJump = true
  //
  // Only force idle when still marked airborne after a deep snap — never
  // mid-fall (caller already gated on low velY).
  //
  if (hero.jumpPhase === 'jumping' || inst.dialogOpen) {
    Hero.syncPlatformLanding(hero)
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
// Flashes life icon gold/white on drowning death (touch lesson 0 pattern
// recoloured to the glow gold — perception happens through colour here).
//
function flashLifeImageOnDrownDeath(k, levelIndicator, originalColor, count) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  if (count >= LIFE_FLASH_COUNT) {
    levelIndicator.lifeImage.sprite.color = originalColor
    levelIndicator.lifeImage.sprite.opacity = 1.0
    return
  }
  const flashGold = glowRgb(GLOW_GOLD_HEX)
  const flashLight = glowRgb('brightLight')
  if (count % 2 === 0) {
    levelIndicator.lifeImage.sprite.color = k.rgb(flashGold.r, flashGold.g, flashGold.b)
    levelIndicator.lifeImage.sprite.opacity = 1.0
  } else {
    levelIndicator.lifeImage.sprite.color = k.rgb(flashLight.r, flashLight.g, flashLight.b)
    levelIndicator.lifeImage.sprite.opacity = 0.5
  }
  k.wait(LIFE_FLASH_INTERVAL, () => flashLifeImageOnDrownDeath(k, levelIndicator, originalColor, count + 1))
}
//
// Gold square particles radiating from life icon on drowning death.
//
function createLifeParticlesOnDrownDeath(k, levelIndicator) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  const lifeX = levelIndicator.lifeImage.sprite.pos.x
  const lifeY = levelIndicator.lifeImage.sprite.pos.y
  const gold = glowRgb(GLOW_GOLD_HEX)
  for (let i = 0; i < LIFE_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LIFE_PARTICLE_COUNT
    const speed = LIFE_PARTICLE_SPEED_MIN + Math.random() * LIFE_PARTICLE_SPEED_EXTRA
    const lifetime = LIFE_PARTICLE_LIFETIME_MIN + Math.random() * LIFE_PARTICLE_LIFETIME_EXTRA
    const size = LIFE_PARTICLE_SIZE_MIN + Math.random() * LIFE_PARTICLE_SIZE_EXTRA
    const particle = k.add([
      k.rect(size, size),
      k.pos(lifeX, lifeY),
      k.color(gold.r, gold.g, gold.b),
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
