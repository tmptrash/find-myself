import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get, setSectionCompleted } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { initTouchInput } from '../../../utils/touch-input.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import { registerGlowNativeTeardown } from '../../../utils/engine-switch.js'
import { MENU_BG_FRONT_LEAF_RGB } from '../../../utils/menu-bg-generator.js'
import { createLevelTransition } from '../../../utils/transition.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as LevelIndicator from '../../touch/components/lesson-indicator.js'
import { buildRockVertices, drawRockToCanvas } from '../../../utils/draw-rock.js'
import { drawCuteMushroomToCanvas, CUTE_MUSHROOM_ASPECT, TRAMP_FACE_EYE_SCALE } from '../utils/cute-mushroom.js'
import * as Hedgehog from '../components/hedgehog.js'
import { toCanvas, getRGB, createCanvasAtlasBuilder } from '../../../utils/helper.js'
import {
  buildGlowTree,
  renderGlowTreeToCanvas,
  renderGlowTreeIntoContext,
  renderGlowLeafBandIntoContext,
  TREE_SEED
} from '../utils/glow-tree.js'
import * as TreeSegments from '../utils/glow-tree-segments.js'
import {
  GROUND_RIGHT_STRIP_COUNT,
  groundRightStripIndexForX,
  groundRightAppearOpacity,
  groundRightExploredEdgeX
} from '../utils/glow-ground-reveal.js'
import {
  GLOW_PAL,
  glowRgb,
  snapToPalette,
  getTreePaletteGray,
  getTreePaletteLit,
  getTreePaletteFlatDecor,
  getCuteMushroomFlatDecorColors,
  getCuteMushroomFlatWaterColors,
  getTreePaletteColor,
  buildDimmedTreePalette,
  getTreePaletteSolid
} from '../utils/glow-palette.js'
import * as Grass from '../../../components/grass.js'
import * as BonusHero from '../../touch/components/bonus-hero.js'
import * as HeroHint from '../../../utils/hero-hint.js'
import { bindPointerActivate } from '../../../utils/pointer-activate.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as HeroCounter from '../../../utils/hero-counter.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { generateLogDetail, drawLogPlatform, bakeLogPlatformCanvas, packLogPlatformAtlas } from '../../touch/utils/log-platform.js'
import {
  createGlowMidges,
  updateGlowMidges,
  syncGlowMidgesZones,
  createGlowPit,
  updateGlowPit,
  drawGlowPit,
  setGlowPitCracksVisible,
  isCrackGrassExcluded,
  isCrackDecorExcluded,
  getCrackZone,
  KEY_PIT_COLLAPSED,
  KEY_PIT_BONUS
} from '../utils/glow-atmosphere.js'
import * as GlowFootParticles from '../utils/glow-foot-particles.js'
import * as GlowCamera from '../utils/glow-camera.js'
//
// Palette-derived tones — every colour comes from CFG.visual.colors.palette.
//
const VOID = glowRgb('void')
const OUTER = glowRgb('playfieldOuter')
const INNER_GRAY = glowRgb('playfieldGray')
const MID_GRAY = glowRgb('midGray')
const LIGHT_GRAY = glowRgb('lightGray')
const DECOR_GRAY = glowRgb('decorGray')
//
// Warm orange grass — same half-brightness front-row foliage tone as menu.js
//
const GRASS_GREEN = {
  r: Math.round(MENU_BG_FRONT_LEAF_RGB.r / 2),
  g: Math.round(MENU_BG_FRONT_LEAF_RGB.g / 2),
  b: Math.round(MENU_BG_FRONT_LEAF_RGB.b / 2)
}
const WATER_COLOR = glowRgb('water')
const SKY_TOP_GRAY = glowRgb('parallaxSkyTopGray')
const SKY_TOP_COLOR = glowRgb('parallaxSkyTopColor')
const GLOW_GOLD_HEX = GLOW_PAL.gold
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
// Layout. Glow runs on its own native-resolution engine (see game-engine.js /
// engine-switch.js) so the playfield always fills the real window horizontally
// (the world scrolls under a camera, see WORLD_W) — but every element's own
// position is still laid out against the fixed CFG.visual.screen /
// CFG.visual.glow design resolution (1920x1080 view / 3000x1080 world),
// exactly like the other (letterboxed, 1920x1080) scenes: laying elements out
// against the live window size would drift them apart on any monitor wider
// or taller than the design resolution. SCREEN_W/SCREEN_H (the real, live
// window size) and the handful of values that genuinely need to track it —
// the camera viewport width, the HUD row's vertical offset when the window
// is taller than design, and screen-space chrome that must reach the true
// edges of the window — are `let` bindings recomputed from the live
// k.width()/k.height() at scene start (see recomputeGlowScreenLayout).
//
const TOP_MARGIN = 110
const BOTTOM_MARGIN = 50
const LEFT_MARGIN = 100
const RIGHT_MARGIN = 100
const FLOOR_PHYS_H = 20
const DESIGN_SCREEN_W = CFG.visual.screen.width
const DESIGN_SCREEN_H = CFG.visual.screen.height
let SCREEN_W = DESIGN_SCREEN_W
let SCREEN_H = DESIGN_SCREEN_H
const WORLD_W = CFG.visual.glow.worldWidth
const WORLD_H = CFG.visual.glow.worldHeight
let VIEW_W = SCREEN_W - LEFT_MARGIN - RIGHT_MARGIN
//
// Vertical view height stays pinned to the design height — on a taller-
// than-design window the extra height becomes void letterbox padding
// (VOID_PAD_Y) above and below instead of stretching the playfield.
//
const VIEW_H = DESIGN_SCREEN_H - TOP_MARGIN - BOTTOM_MARGIN
const GAME_W = WORLD_W - LEFT_MARGIN - RIGHT_MARGIN
const FLOOR_Y = 680
//
// Half the extra height (window taller than the 1080 design) added above
// and below the playfield so it stays vertically centred instead of
// hugging the top of a tall window. Zero at (or below) the design height.
//
let VOID_PAD_Y = 0
//
// Screen Y where the top void/HUD strip begins — VOID_PAD_Y on a tall
// window, 0 at (or below) design height.
//
let PLAYFIELD_TOP_Y = 0
//
// Playfield bottom on screen — 50 px void strip below the rounded window,
// pushed down by VOID_PAD_Y so the whole playfield stays centred.
//
let PLAYFIELD_BOTTOM_Y = DESIGN_SCREEN_H - BOTTOM_MARGIN
//
// Original 1920-wide layout; right-side gameplay shifts by this amount into
// the extended 3000 px world (lake + main tree stay on the left).
//
const RIGHT_ZONE_SHIFT_X = WORLD_W - 1920
const CORNER_RADIUS = 20
const CORNER_SPRITE_NAME = 'glow0-corner-sprite'
const PLATFORM_HIDE_Y = 9999
//
// Tree. Fixed to the design viewport's own centre (not the live window
// width) so every element positioned off it — branch, hedgehogs, L/O/W
// platforms, mushrooms — lines up identically on any monitor.
//
const TREE_X = Math.round(DESIGN_SCREEN_W * 0.5)
//
// The trunk geometry extends a few px below the ground so its base cannot
// leave a gap above the floor line; rendering clips it at the roots' start
// (ground level), so the trunk is cut exactly by the ground.
//
const TREE_TRUNK_SINK = 0
const TREE_TRUNK_BOTTOM_Y = FLOOR_Y
//
// Roots and trunk clip share the visible ground line — the trunk ends flush
// with the floor and roots continue below without a sunken trunk gap.
//
const TREE_ROOT_START_Y = FLOOR_Y
const TREE_TOP_Y = 30
const ROOT_MAX_Y = 1030
const TREE_SPRITE_NAME = 'glow0-tree-sprite'
const TREE_FLAT_SPRITE_NAME = 'glow0-tree-flat-sprite'
const TREE_LIT_SPRITE_NAME = 'glow0-tree-lit-sprite'
const TRUNK_EXCLUDE_HALF = 50
//
// The left hedgehog stays hidden until the hero runs a stretch past the
// branch trampoline, then pops out abruptly right in his path — at a
// normal run speed there's no time to react before colliding, so the only
// reliable way past it is creeping forward slowly (see
// maybeSpawnLeftHedgehogAmbush): that leaves enough real time between the
// pop and actual contact to spot it and jump. TRIGGER_GAP keeps the pop
// well clear of the branch-tramp ground respawn spot (see
// treeGroundSpawnX) so a fresh respawn there can never insta-trigger it.
//
const HEDGEHOG_LEFT_AMBUSH_TRIGGER_GAP = 170
const HEDGEHOG_LEFT_AMBUSH_POP_LEAD = 70
const HEDGEHOG_LEFT_AMBUSH_WANDER_LEASH = 100
const HEDGEHOG_LEFT_AMBUSH_DANGER_MARGIN = 40
//
// Running covers the extra pop-lead distance in less real time than
// walking does, so a hero sprinting through gets a slightly longer lead
// added on top of the base one — a bit more of a fighting chance to react
// before the hitboxes actually overlap.
//
const HEDGEHOG_LEFT_AMBUSH_RUN_SPEED_THRESHOLD = 200
const HEDGEHOG_LEFT_AMBUSH_RUN_POP_LEAD_BONUS = 35
const HEDGEHOG_SCALE = 1.4
const HEDGEHOG_GROUND_RAISE = 4
const HERO_HEDGEHOG_SPAWN_CLEARANCE = 20
const HEDGEHOG_WANDER_RIGHT_MARGIN = 40
//
// A second, ambush hedgehog waits hidden at the far edge of the L-log
// platform and pops out just before the hero actually lands there (see
// maybeSpawnHedgehogAmbushPreLand), so the reveal reads as a sudden ambush
// instead of appearing only once the hero has already touched down.
//
const HEDGEHOG_AMBUSH_SCALE = 1.4
const HEDGEHOG_AMBUSH_GROUND_RAISE = HEDGEHOG_GROUND_RAISE
const HEDGEHOG_AMBUSH_EDGE_GAP = 18
//
// If the ambush hedgehog pops out but the hero never lands on the L
// platform to trigger it, it gives up and crawls off the edge on its own
// after this many seconds of standing there unused.
//
const HEDGEHOG_AMBUSH_ABANDON_TIMEOUT = 6
const HEDGEHOG_AMBUSH_POP_LEAD_Y = 90
//
// Once dead (ambush kill or death while still standing on the log), the
// hedgehog first walks to whichever platform edge is closer before it
// actually drops, so the tumble reads as stepping off the end of the log
// instead of sinking straight through its middle.
//
const HEDGEHOG_AMBUSH_FALL_EDGE_PAD = 14
//
// Touching either hedgehog is fatal — same disintegration flow as any
// other level's death, then a standard press-any-key countdown reload.
//
const HEDGEHOG_DEATH_PARTICLE_COUNT = 34
const HEDGEHOG_DEATH_HINT_TEXT = 'Life is a complicated thing'
const HEDGEHOG_LEFT_DEATH_HINT_TEXT = 'Shit happens'
const HEDGEHOG_DEATH_HINT_RAISE = 46
const HEDGEHOG_DEATH_COUNTDOWN_SECONDS = 7
const HEDGEHOG_DEATH_PROMPT_BASE = 'Press Space, Enter, or click to continue... '
const HEDGEHOG_DEATH_PROMPT_FONT = 22
//
// The prompt sits down on the amber foliage of the farthest (3rd) parallax
// row rather than up in the empty sky: PAR_LEAF_MAX_Y is that band's hard
// bottom edge, so backing off by this much lands the line inside the leaves.
//
const HEDGEHOG_DEATH_PROMPT_LEAF_RISE = 165
const HEDGEHOG_DEATH_PROMPT_TEXT_GRAY = { r: 220, g: 220, b: 220 }
const HEDGEHOG_DEATH_PROMPT_SHADOW_GRAY = { r: 0, g: 0, b: 0 }
//
// Dark void text + warm cream shadow reads clearly over the orange haze and
// amber parallax foliage in the colour world.
//
const HEDGEHOG_DEATH_PROMPT_TEXT_COLOR_WORLD = VOID
const HEDGEHOG_DEATH_PROMPT_SHADOW_COLOR_WORLD = { r: 255, g: 248, b: 230 }
const PAR_LEAF_MAX_Y_FRACTION = 0.43
//
// Screen-space HUD/prompt Y — starts at the design value and gets
// VOID_PAD_Y added in recomputeGlowScreenLayout so it stays visually
// aligned with the (world-space, camera-shifted) leaf band it sits on.
//
let HEDGEHOG_DEATH_PROMPT_Y = Math.round(DESIGN_SCREEN_H * PAR_LEAF_MAX_Y_FRACTION) -
  HEDGEHOG_DEATH_PROMPT_LEAF_RISE
//
// How fast the post-L world wakes up (grass sway, hedgehog wander, birds,
// mushroom whistle-lean) once the O-meditation countdown starts, and how
// quickly it freezes again when the hero breaks stillness.
//
const MEDITATION_WORLD_WAKE_SPEED = 1.1
const MEDITATION_WORLD_SLEEP_SPEED = 3.2
//
// Darker, thicker rim on glow floor rocks so they read more clearly against
// the ground and never poke a stray pixel below FLOOR_Y.
//
const ROCK_OUTLINE_RGB = glowRgb('void')
const ROCK_OUTLINE_WIDTH = 2
//
// Ground respawn after a hedgehog kill lands just past the wandering
// hedgehog's own leash, so reloading the level never drops the hero right
// back into its path. Kept modest — the leash already runs right up to
// the right trampoline mushroom, so a bigger margin would spawn the hero
// on top of it instead.
//
const HEDGEHOG_DEATH_RESPAWN_MARGIN = 12
//
// Parallax background — sky, 3 tree planes, 3 bush planes (each scrolling
// at its own speed) plus a static ground/underground strip at world speed 1.0.
//
const BG_PAR_SKY_GRAY = 'glow0-bg-par-sky-gray'
const BG_PAR_SKY_COLOR = 'glow0-bg-par-sky-color'
const BG_PAR_TREE3_GRAY = 'glow0-bg-par-tree3-gray'
const BG_PAR_TREE3_COLOR = 'glow0-bg-par-tree3-color'
const BG_PAR_TREE2_GRAY = 'glow0-bg-par-tree2-gray'
const BG_PAR_TREE2_COLOR = 'glow0-bg-par-tree2-color'
const BG_PAR_TREE1_GRAY = 'glow0-bg-par-tree1-gray'
const BG_PAR_TREE1_COLOR = 'glow0-bg-par-tree1-color'
const BG_STATIC_GRAY = 'glow0-bg-static-gray'
const BG_STATIC_COLOR = 'glow0-bg-static-color'
//
// Layer follow speeds — fraction of camera scroll (1.0 = locked to the world).
// Bushes bake onto the matching tree plane so post-O colour world draws
// three forest sprites instead of six full-bleed canvases.
//
const PAR_SKY_SPEED = 0.06
const PAR_TREE3_SPEED = 0.12
const PAR_TREE2_SPEED = 0.26
const PAR_TREE1_SPEED = 0.40
//
// Soft sky-coloured veils between forest rows — atmospheric perspective
// without inventing new tones (opacity only).
//
const HAZE_FAR_OPACITY = 0.2
const HAZE_MID_OPACITY = 0.1
//
// Extra horizontal bleed baked into parallax canvases so trees extend past the
// playfield edges and never run out on the right when the camera scrolls.
//
const PAR_TREE_HORIZ_BLEED = 320
const TREE_COLOR_SPRITE_NAME = 'glow0-tree-color-sprite'
//
// Horizontal branch platform.
//
const HORIZ_PLATFORM_H = 16
//
// Hero branch collision sits slightly below the visible branch surface.
//
const BRANCH_PLAT_COLLISION_DROP_Y = 2
const SPAWN_MODE_BRANCH = 'branch'
const SPAWN_MODE_GROUND = 'ground'
//
// Anti-tunnel band below the start branch — catches falls before lake-floor snap
//
const BRANCH_SNAP_BELOW = 88
const HERO_BRANCH_FRACTION = 0.20
//
// Respawn point at the lower-right ground — used after a death once the
// hero has discovered the lower-right part of the level himself.
//
const GROUND_SPAWN_X = WORLD_W - RIGHT_MARGIN - 180
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
  bark: GLOW_PAL.treeLit.branch,
  barkLight: GLOW_PAL.treeLit.leaf,
  barkDark: GLOW_PAL.treeLit.root,
  ring: GLOW_PAL.treeLit.trunk,
  ringDark: GLOW_PAL.treeLit.root,
  core: GLOW_PAL.treeLit.leaf,
  shadow: GLOW_PAL.void
}
const LOG_TREE_COLOR_COLORS = {
  bark: GLOW_PAL.treeColor.root,
  barkLight: GLOW_PAL.treeLit.branch,
  barkDark: GLOW_PAL.void,
  ring: GLOW_PAL.treeLit.trunk,
  ringDark: GLOW_PAL.treeColor.root,
  core: GLOW_PAL.treeLit.leaf,
  shadow: GLOW_PAL.void
}
//
// The L-log platform stands out from the plain W/O logs: a bare outline
// silhouette with no fill, only its cracks, rounded end cap and grain
// stripes painted in one single accent tone.
//
const L_PLAT_OUTLINE_WIDTH = 2
const L_PLAT_END_STEPS = 16
const L_PLAT_END_SQUASH = 0.55
const L_PLAT_STRIPE_COUNT = 5
const RIGHT_PLAT_OFFSET_X = 100
//
// W platform sits further left so the walking trampoline can dock beside it.
//
const W_PLAT_X_BASE = LEFT_MARGIN + 100
const W_PLAT_Y_BELOW = 90
//
// O platform sits half a log length further right than its original spot,
// pulled 80px back to the left of that spot so the jump from the L platform
// area is shorter. The bonus/fragments platform is anchored to oPlatX, so it
// shifts left by the same amount automatically.
//
const O_PLAT_OFFSET_X = 130 + LOG_W / 2
const O_PLAT_OFFSET_Y = 105
//
// The O letter floats 11 px higher above its log than the default placement.
//
const O_LETTER_RAISE_Y = 18
//
// The L letter floats 13 px higher above its log than the default placement.
//
const L_LETTER_RAISE_Y = 17
const G_LETTER_RAISE_Y = 10
//
// The W letter floats 8 px higher above its log than the default placement.
//
const W_LETTER_RAISE_Y = 8
//
// G letter sits to the right of the hero branch (trunk side), same float height.
// Kept in step with BRANCH_TRAMP_OFFSET_X so the pickup stays above the pad.
//
const G_LETTER_RIGHT_OF_BRANCH_GAP = 256
//
// L letter sits left of its log platform once unveiled.
//
const L_LETTER_LEFT_OF_PLAT_GAP = 56
const BONUS_PLAT_OFFSET_X = 100
//
// Hidden bonus platform sits noticeably lower so it is reachable by jump.
//
const BONUS_PLAT_OFFSET_Y = 40
const BONUS_PLAT_W = 90
//
// Background forest — three planes of big trees baked and drawn fully
// OPAQUE. Depth comes from colour: the far and mid rows sit on their own
// palette swatches (one step darker than the sky), the near colour-world
// row keeps green foliage with a light haze blend.
//
const PAR_L1_COLOR_BLEND = 0.36
//
// Near-row foliage leans extra toward the warm orange haze (leaf-only blend)
// while green stays the leading colour.
//
const PAR_L1_LEAF_WARM_BLEND = 0.4
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
const PAR_BIG_TREE_COUNT = 14
const PAR_BIG_SEED_BASE = 40000
const PAR_FAR_TREE_COUNT = 17
const PAR_FAR_SEED_BASE = 50000
const PAR_FARTHEST_TREE_COUNT = 20
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
// 2nd and 3rd row crowns sit a little lower than the near row, so each
// deeper leaf band starts visibly below the previous one — raised closer
// to the near row than before so the bands overlap with no vertical gap.
//
const PAR_FAR_TOP_MIN_Y = TREE_TOP_Y + 100
const PAR_FAR_TOP_RANGE = 90
const PAR_FARTHEST_TOP_MIN_Y = TREE_TOP_Y + 150
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
const PAR_LEAF_MAX_Y = Math.round(DESIGN_SCREEN_H * PAR_LEAF_MAX_Y_FRACTION)
//
// Row foliage = ONE dense full-width horizontal band per row: every leaf of
// a row sits at roughly the same vertical level with a small random step up
// or down, uniform from the left edge to the right edge. Each deeper row's
// band sits lower than the previous one (its bottom shows under the nearer
// band), so the forest reads as three leaf strips descending with depth.
// The near (1st) band is the thickest and densest.
//
const PAR_BAND_SEED_OFFSET = 7700
//
// Every band uses the same top/bottom margin around its row's trunk range
// so consecutive bands always overlap generously — no thin, sparse seam
// can appear between two depth layers regardless of their vertical offset.
//
const PAR_BAND_MARGIN_TOP = 40
const PAR_BAND_MARGIN_BOTTOM = 140
const PAR_BIG_BAND_TOP = PAR_BIG_TOP_MIN_Y - PAR_BAND_MARGIN_TOP
const PAR_BIG_BAND_BOTTOM = PAR_BIG_TOP_MIN_Y + PAR_BIG_TOP_RANGE + PAR_BAND_MARGIN_BOTTOM
const PAR_BIG_BAND_COUNT = 7200
const PAR_FAR_BAND_TOP = PAR_FAR_TOP_MIN_Y - PAR_BAND_MARGIN_TOP
const PAR_FAR_BAND_BOTTOM = PAR_FAR_TOP_MIN_Y + PAR_FAR_TOP_RANGE + PAR_BAND_MARGIN_BOTTOM
const PAR_FAR_BAND_COUNT = 5600
const PAR_FARTHEST_BAND_TOP = PAR_FARTHEST_TOP_MIN_Y - PAR_BAND_MARGIN_TOP
const PAR_FARTHEST_BAND_BOTTOM = PAR_FARTHEST_TOP_MIN_Y + PAR_FARTHEST_TOP_RANGE + PAR_BAND_MARGIN_BOTTOM
const PAR_FARTHEST_BAND_COUNT = 4200
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
// Colour-world bush tones: the near strip uses the tree-leaf green; the 2nd
// and 3rd strips reuse the flat orange of their tree row so trees and bushes
// of one depth always match. The gray world keeps every bush in the gray family.
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
const BIRD_COUNT = 6
//
// Birds glide below the parallax leaf canopy so they stay visible in the sky band
//
const BIRD_MIN_Y = PAR_LEAF_MAX_Y + 8
const BIRD_Y_RANGE = 110
const BIRD_SPEED_MIN = 22
const BIRD_SPEED_RANGE = 26
const BIRD_SIZE_MIN = 5
const BIRD_SIZE_RANGE = 4
const BIRD_FLAP_SPEED_MIN = 4
const BIRD_FLAP_SPEED_RANGE = 3
//
// Birds scroll with the slowest parallax row plus their own flight speed.
//
const BIRD_PARALLAX_SPEED = PAR_SKY_SPEED
const BIRD_BOB_AMP = 9
const BIRD_WRAP_PAD = 40
const BIRD_LINE_WIDTH = 2
const BIRD_HAZE_BLEND = 0.72
const BIRD_VISIBLE_FADE_MIN = 0.02
const BIRD_UPDATE_INTERVAL = 1 / 24
//
// After the colour world settles, birds update less often (draw every frame).
//
const COLOR_WORLD_BIRD_UPDATE_INTERVAL = 1 / 12
//
// Minimum opacity before skipping a crossfade layer (avoids pops, not steps).
//
const COLOR_CROSSFADE_EPS = 0.001
//
// Underground decor in the root zone: buried rocks, cracks, pebble clusters,
// hanging rootlets, a fossil spiral and one buried skeleton (no burrows or
// holes). Baked once per mode (gray backdrop / dark colour-world earth).
//
const UNDERGROUND_GRAY_SPRITE = 'glow0-underground-gray'
const UNDERGROUND_COLOR_SPRITE = 'glow0-underground-color'
const UG_TOP_PAD = 30
const UG_BOTTOM_PAD = 18
const UG_ROCK_COUNT = 6
const UG_CRACK_COUNT = 9
const UG_PEBBLE_CLUSTER_COUNT = 6
const UG_ROOTLET_COUNT = 10
const UG_CAVE_ROOTLET_COUNT = 6
const OUTER_BG_R = OUTER.r
const OUTER_BG_G = OUTER.g
const OUTER_BG_B = OUTER.b
const OUTER_BG_HEX = GLOW_PAL.playfieldOuter
const WALL_BORDER_R = OUTER.r
const WALL_BORDER_G = OUTER.g
const WALL_BORDER_B = OUTER.b
//
// Two rocks bracket the lake's tree-side end — water sits between them.
//
const WATER_END_ROCK_BEFORE_X = 32
const WATER_END_ROCK_AFTER_X = 14
//
// Shore rock horizontal stretch — extended to the right so it fully covers
// the right edge of the lake.
//
const SHORE_ROCK_WIDTH_SCALE = 2.2
//
// Scatter rocks across the lower-right part of the playfield.
//
const RIGHT_ROCK_COUNT = 8
const COLOR_FADE_DURATION = 0.5
const TREE_REVEAL_FADE_DURATION = 0.85
//
// Any element that snaps from hidden to visible (log platforms, pickup
// letters) fades its opacity in over this long instead of popping at full
// strength, so nothing appears to materialize out of nowhere mid-transition.
//
const POP_REVEAL_FADE_DURATION = 0.35
//
// GLOW HUD row — FPS sits between the section label and the small hero.
// The section label's top Y is derived from the FPS row's vertical CENTER
// (GLOW_HUD_FPS_TOP_Y) so both text baselines read as one aligned row —
// the small hero / life icons then fall into place from the label's Y via
// LevelIndicator's own sectionLabelY-relative offsets.
//
const GLOW_HUD_LABEL_FONT_SIZE = 48
const GLOW_HUD_LABEL_LETTER_SPACING = -5
const GLOW_HUD_LABEL_START_X = LEFT_MARGIN + 40
const GLOW_HUD_LETTER_COUNT = 4
//
// HUD G/L/O/W fill as loaders. Ink-box clip ignores empty font padding.
//
const GLOW_HUD_G_FILL_PARTS = 5
const GLOW_HUD_L_FILL_PARTS = 2
const GLOW_HUD_O_FILL_PARTS = 10
const GLOW_HUD_W_FILL_PARTS = 3
const GLOW_HUD_LABEL_FONT = CFG.visual.fonts.thinFull.replace(/'/g, '')
const GLOW_HUD_INK_ALPHA_MIN = 20
const GLOW_HUD_FILL_CLIP_PAD = 4
const hudLetterInkBoxCache = {}
//
// HUD row lives inside the top void strip (above the playfield). FPS/label
// share one vertical centre so GLOW, FPS, small hero and life sit on one line.
// Screen-space, so both get VOID_PAD_Y added in recomputeGlowScreenLayout to
// stay inside the (possibly pushed-down) top void strip on a tall window.
//
let GLOW_HUD_FPS_TOP_Y = 55
let GLOW_HUD_LABEL_TOP_Y = GLOW_HUD_FPS_TOP_Y - GLOW_HUD_LABEL_FONT_SIZE / 2
const GLOW_HUD_FPS_SLOT_GAP = 24
const GLOW_HUD_SMALL_HERO_HALF_W = 42
//
// Neutral HUD grey after the world colours — palette gray5.
//
const HUD_SCORE_COLOR_SETTLED = glowRgb('hudScore')
//
// Skip lake fill when the camera is well off the water span.
//
const LAKE_SURFACE_CULL_MARGIN = 48
//
// Blinking letters — value 6 fill (or gold for G), value 1 offset-outline.
//
const GLOW_LETTER_FONT = 'JetBrains Mono'
//
// Same size before pickup and inside the pickup caption — one glyph size for
// every letter (G, L, O, W) throughout its whole lifetime.
//
const GLOW_LETTER_SIZE = 54
//
// Pure black drop shadow behind pickup letters in the colour world.
//
const GLOW_LETTER_SHADOW_R = 0
const GLOW_LETTER_SHADOW_G = 0
const GLOW_LETTER_SHADOW_B = 0
const GLOW_LETTER_TILT = 12
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
const KEY_L_LETTER_UNVEILED = 'glow.lLetterUnveiled'
const L_PLAT_SHIFT_LEFT = 140
const KEY_REVEALED_GROUND_DECOR = 'glow.revealedGroundDecor'
const KEY_REVEALED_GROUND_DECOR_RIGHT = 'glow.revealedGroundDecorRight'
const KEY_REVEALED_GROUND_DECOR_LEFT = 'glow.revealedGroundDecorLeft'
const KEY_REVEALED_GROUND_BG = 'glow.revealedGroundBg'
const KEY_TREE_SEGMENTS_REVEALED = 'glow.treeSegmentsRevealed'
const KEY_GROUND_RIGHT_STRIP_MAX = 'glow.groundRightStripMax'
const KEY_LEFT_SHORE_ROCK = 'glow.leftShoreRock'
const KEY_RIGHT_TRAMP_REVEALED = 'glow.rightTrampRevealed'
const KEY_L_PLAT_STEPPED = 'glow.lPlatStepped'
const KEY_LEFT_HEDGEHOG_REVEALED = 'glow.leftHedgehogRevealed'
const KEY_AMBUSH_HEDGEHOG_REVEALED = 'glow.ambushHedgehogRevealed'
const KEY_HUD_G_FILL = 'glow.hudGFillParts'
const KEY_HUD_L_FILL = 'glow.hudLFillParts'
const KEY_HUD_W_FILL = 'glow.hudWFillParts'
//
// Right trampoline walk progress — restored after reload / menu exit.
//
const KEY_TRAMP_WALK_X = 'glow.trampWalkX'
const KEY_TRAMP_WALK_SING_COUNT = 'glow.trampWalkSingCount'
const KEY_TRAMP_WALKED = 'glow.trampWalked'
//
// Trampoline mushrooms appear only after the hero lands within this distance.
//
const TRAMP_MUSH_LAND_REVEAL_DIST = 80
const TRAMP_MISSING_HINT_TEXT = 'Something\'s\nmissing here'
const TRAMP_FIRST_REVEAL_HINT_TEXT = 'It\'s so big. Is that\nreally a mushroom?'
const TRAMP_SECOND_REVEAL_HINT_TEXT = 'Oh, another one'
const TRAMP_REVEAL_HINT_DURATION = 5
const KEY_BONUS_COLLECTED = 'glow.bonusCollected'
const KEY_LIFE_SHOWN = 'glow.lifeShown'
const KEY_DROWN_HINT_SHOWN = 'glow.drownHintShown'
const KEY_INTRO_SHOWN = 'glow.introShown'
const KEY_CAMERA_INTRO_DONE = 'glow.cameraIntroDone'
const KEY_RESPAWN_NEAR_TREE = 'glow.respawnNearTree'
const KEY_LAST_SPAWN_MODE = 'glow.lastSpawnMode'
const KEY_LAST_SPAWN_X = 'glow.lastSpawnX'
const KEY_BRANCH_TRAMP_REVEALED = 'glow.branchTrampRevealed'
const BRANCH_TRAMP_MARIO_HINT_TEXT = 'I\'m not an ordinary\nmushroom'
const BRANCH_TRAMP_MARIO_HINT_DURATION = 6
const BRANCH_TRAMP_MARIO_HINT_INITIAL_DELAY = 10
const BRANCH_TRAMP_MARIO_HINT_REPEAT = 20
const TRAMP_SHALLOW_HINT_TEXT = 'I can\'t drown.\nIt\'s shallow here.'
const TRAMP_SHALLOW_HINT_DURATION = 6
const WRONG_TRAMP_SING_HINT_REPEAT = 20
const LETTER_PROGRESS_HINT_INTERVAL = 30
const LETTER_PROGRESS_HINT_DURATION = 6
const HERO_DEATH_RESPAWN_PAST_BRANCH_TRAMP_X = 88
const HERO_SPAWN_FADE_DURATION = 0.75
const PIT_CAVE_HINT_IDLE = 10
const PIT_CAVE_HINT_TEXT = 'Maybe you want to step on me'
const PIT_CAVE_HINT_DURATION = 5
const O_LETTER_STUCK_HINT_DELAY = 90
const O_LETTER_STUCK_HINT_TEXT = 'In this chaos,\nsometimes I just\nneed to stop'
const O_LETTER_STUCK_HINT_DURATION = 6
const L_LETTER_PEEK_TRAVEL = 0.45
const L_LETTER_PEEK_HOLD = 1
const L_LETTER_PEEK_RETURN = 0.45
const LETTER_OFFSCREEN_ARROW_SIZE = 22
const LETTER_OFFSCREEN_ARROW_STEM_W = 8
const LETTER_OFFSCREEN_ARROW_STEM_LEN = 30
const LETTER_OFFSCREEN_ARROW_SWAY_AMP = 10
const LETTER_OFFSCREEN_ARROW_SWAY_SPEED = 5.5
const LETTER_OFFSCREEN_ARROW_EDGE_INSET = 52
//
// Screen-space HUD arrow — VOID_PAD_Y added in recomputeGlowScreenLayout.
//
let LETTER_OFFSCREEN_ARROW_Y = PLAYFIELD_TOP_Y + TOP_MARGIN + 120
const MENU_ARROW_BODY_RGB = glowRgb('midGray')
const MENU_ARROW_OUTLINE_RGB = glowRgb('void')
const MENU_ARROW_OUTLINE_WIDTH = 2
const MENU_ARROW_DRAW_OPACITY = 1
//
// Intro rain ambience volume (same quiet bed as touch lesson 0)
//
//
// Dialog.
//
const GLOW_DIALOG_G = 'Now I have [hl]G[/hl]round under my feet.\nI have somewhere to start.'
const GLOW_DIALOG_L = '[hl]L[/hl]ight helps me see the shades.\nThe world is rarely just black\nor white. Not everything reveals\nitself in motion.'
const GLOW_DIALOG_O = 'My new skill is [hl]O[/hl]bservation.\nSometimes I need to stop before\nI can truly see. I should speak with\nthe big mushroom.'
//
// Voice-overs played while the matching letter dialog is open
//
const GLOW_DIALOG_SOUND_G = 'glow-g'
const GLOW_DIALOG_SOUND_L = 'glow-l'
const GLOW_DIALOG_SOUND_O = 'glow-ow'
//
// Inline letter pickup caption — the dialog phrase now grows straight down
// from the picked-up letter (tilted to match it) instead of a modal panel.
// See openGlowLetterCaption().
//
const GLOW_LETTER_CAPTION_LINE_SPACING = 8
const GLOW_LETTER_CAPTION_SHADOW_OFFSET = 2
//
// 8-direction outline used instead of the drop shadow while the world is
// monochrome — matches the "void" outline every mushroom uses in the same
// flat/gray decor mode, so the caption reads as one consistent art style.
//
const GLOW_LETTER_CAPTION_OUTLINE_PAD = 1.6
const GLOW_LETTER_CAPTION_OUTLINE_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1]
]
const GLOW_LETTER_CAPTION_FADE_IN = 0.4
const GLOW_LETTER_CAPTION_FADE_OUT = 0.7
const GLOW_LETTER_CAPTION_DURATION_G = 6
const GLOW_LETTER_CAPTION_DURATION_L = 9
const GLOW_LETTER_CAPTION_DURATION_O = 9
const GLOW_LETTER_CAPTION_Z = CFG.visual.zIndex.player + 20
//
// Speech-bubble hints: two intro lines at spawn (the G letter appears only
// after both finish and all three gray zones were explored), one-shot lines
// when the right ground / water zones first open, and a consolation line on
// the first drowning.
//
const HINT_INTRO_1_TEXT = 'Hello, I\'m Yan. I found myself in a\nworld I cannot fully perceive. To\nunderstand where I am and what\'s\nhappening to me, I need to learn\nto see it.'
const HINT_INTRO_1_DURATION = 16
const HINT_INTRO_2_TEXT = 'Use \'awd, ←, →, ↑, space\' keys to\nmove and jump. Use the Mouse to\ninteract with the world.\n\nLook closely. Pay attention.\nSometimes, seeing is more\nthan looking.'
const HINT_INTRO_2_DURATION = 18
//
// Extra beat between the first and second intro speech bubbles.
//
const HINT_INTRO_2_PAUSE = 1.5
const INTRO_HINT_PHASE_ONE = 'one'
const INTRO_HINT_PHASE_PAUSE = 'pause'
const INTRO_HINT_PHASE_TWO = 'two'
const HINT_GROUND_RIGHT_TEXT = 'Curiosity lights the\nway. Keep walking'
const HINT_WATER_TEXT = 'The unknown isn\'t empty.\nIt simply hasn\'t been\ndiscovered yet'
const HINT_ZONE_DURATION = 5
//
// Walking this far from a Glow speech bubble dismisses it early.
//
const GLOW_HINT_DISMISS_DISTANCE = 80
//
// Intro / replay hints ignore the first moments of movement so spawn settle
// and camera snap never clear the bubble before the player walks 80 px away.
//
const GLOW_HINT_MOVEMENT_DISMISS_GRACE = 0.45
//
// Intro advances on deliberate confirm keys — not movement bindings.
//
const INTRO_ADVANCE_KEY_NAMES = ['space', 'enter']
const PARALLAX_DRAW_CULL_PAD = 48
const GLOW_PROXIMITY_SOUND_RADIUS = 120
const GLOW_PROXIMITY_SOUND_MAX_VOLUME = CFG.audio.ambient.volume
const HINT_DROWN_TEXT = 'That\'s not bad. Now I\nknow I can\'t go here.'
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
const HERO_TOOLTIP_TEXT_GRAY_QUIET = "Strange... It's very quiet\nhere. We should explore this\nworld first."
const HERO_TOOLTIP_AFTER_G_RIGHT = 'I think we need\nto go right...'
const HERO_TOOLTIP_AFTER_G_LEFT = 'I think we need\nto go left...'
const HERO_TOOLTIP_AFTER_L = "Don't rush.\nJust stop."
const HERO_TOOLTIP_AFTER_O = 'I need to talk\nto big mushroom.'
const HERO_TOOLTIP_AFTER_TRAMP_WALK = 'I think we need to jump\nto the left of the mushroom.'
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
// O letter hover tooltip — playful surprise before the meditation zone opens
//
const O_TOOLTIP_TEXT = 'Opa pa, what is this?'
const O_TOOLTIP_HOVER_SIZE = 70
const O_TOOLTIP_Y_OFFSET = -80
//
// Branch trampoline hover bubble sits above the cap.
//
const TRAMP_TOOLTIP_Y_OFFSET = -90
//
// Buried skeleton hover — visible once the left underground band is open
//
const SKELETON_TOOLTIP_TEXT = "I'm tired..."
const SKELETON_TOOLTIP_WIDTH = 72
const SKELETON_TOOLTIP_HEIGHT = 104
const SKELETON_TOOLTIP_BODY_CENTER_R = 2.3
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
const GLOW_INDICATOR_TOOLTIP_AFTER_G = 'Explore'
const GLOW_INDICATOR_TOOLTIP_AFTER_L = 'Learn to see the nuances'
const GLOW_INDICATOR_TOOLTIP_AFTER_O = 'Stop and pay attention'
const GLOW_INDICATOR_TOOLTIP_HEIGHT = 50
const GLOW_INDICATOR_TOOLTIP_Y_OFFSET = -30
//
// The 3-fragments collect hint lives longer than the default bubble.
//
const BONUS_HINT_DURATION = 5
//
// After picking up the final W letter the hero shares a closing line for a
// few seconds, then a full-screen fade-out leads back to the menu.
//
const HINT_W_TEXT = 'Gradually I become a witness\nto how the world is made.\nLet\'s move on'
const HINT_W_DURATION = 4
//
// Shown once when the third start-branch jump finishes revealing the tree.
//
const HINT_TREE_REVEAL_TEXT = 'Oh. There\'s\na tree here.'
const HINT_TREE_REVEAL_DURATION = 3
//
// Hint text about the 3 bonus fragments (shown by the bonus-hero component).
//
const BONUS_HINT_TEXT = 'These are 3 Fragments. Every\njourney leaves something behind.\nCollect them. They will help me grow'
//
// Drowning — land on the lake floor, then sink under the fill with the hint.
//
const WATER_SURFACE_Y = FLOOR_Y - 8
//
// Drop from air onto the same floor Y as main-ground snap before sinking.
//
const DROWN_DESCEND_SPEED = 340
//
// Slow sink — the hero stays behind the lake fill and moves down until hidden.
//
const DROWN_UNIFIED_SINK_SPEED = 48
const DROWN_FULL_SINK_FEET_Y = FLOOR_Y + 88
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
const GRASS_TUFT_COUNT = 22
//
// Right-ground discovery fades into the unknown instead of cutting on a strip.
//
const GROUND_REVEAL_FADE_WIDTH = 220
const GROUND_REVEAL_LOOKAHEAD = 80
const GROUND_DETAIL_LOOKAHEAD = 28
const LEFT_DECOR_FADE_DURATION = 0.7
//
// Quiet drifting motes — few, slow, never competing with the hero.
//
const MOTE_COUNT = 14
const MOTE_SPEED_MIN = 4
const MOTE_SPEED_RANGE = 8
const MOTE_SIZE_MIN = 1.2
const MOTE_SIZE_RANGE = 1.6
const MOTE_OPACITY_MIN = 0.12
const MOTE_OPACITY_RANGE = 0.18
//
// Visual ground lip — height variation only, collision stays on FLOOR_Y.
//
const GROUND_LIP_AMP = 4
const GROUND_LIP_STEPS = 36
const GROUND_LIP_FREQ_A = 0.012
const GROUND_LIP_FREQ_B = 0.031
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
// Launch velocity — noticeably higher than a normal jump, not a separate physics mode
//
const TRAMP_BOOST_MULT = 1.85
const TRAMP_DOCKED_BOOST_MULT = 2.0
const TRAMP_COOLDOWN = 0.4
const TRAMP_RADIUS = 38
//
// Horizontal slack on the cap for bounce / pad activation (not ground beside)
//
const TRAMP_ADJACENT_X = 22
//
// Invisible solid pad under the cap — top flush with capTopY
//
const TRAMP_PAD_H = 10
//
// Feet below this offset from capTop keep the pad hidden (walk through stem)
//
const TRAMP_PAD_FEET_BELOW = 20
//
// Horizontal reach for pad placement and fall-through guards
//
const TRAMP_NEAR_X = TRAMP_RADIUS + 80
//
// Anti-tunnel band below the cap when jumping onto the mushroom
//
const TRAMP_SNAP_BELOW = 48
const TRAMP_SQUASH_MAX = 0.35
const TRAMP_SPRITE = 'glow0-trampoline'
const TRAMP_OFFSET_FROM_L_PLAT = 50
//
// Static branch trampoline — right of the main tree (jump onto the start branch).
//
const BRANCH_TRAMP_OFFSET_X = 145
const BRANCH_TRAMP_BOOST_MULT = 1.68
const BRANCH_TRAMP_CHEEKY_EVERY = 6
//
// Opening camera: hero width fills the playfield width at intro hold.
//
const CAMERA_INTRO_HERO_WIDTH = 42
let CAMERA_INTRO_ZOOM_START = VIEW_W / CAMERA_INTRO_HERO_WIDTH
const CAMERA_INTRO_HOLD_DURATION = 0
const CAMERA_INTRO_DURATION = 0.6
//
// After the opening zoom-out finishes, wait this long before the first hint.
//
const CAMERA_INTRO_HINT_DELAY = 1
//
// First spawn on the start branch: glance left, then face right.
//
const BRANCH_LOOK_LEFT_DURATION = 2
const GLOW_CAMERA_SHAKE_AMP = 5
const GLOW_CAMERA_SHAKE_DURATION = 0.22
//
// After O: stand still near the trampoline → countdown → mushroom walks left.
// Three sings: two land steps, then the lake. W appears after the first sing.
//
const TRAMP_WALK_STILL = 3
const TRAMP_WALK_COUNTDOWN = 10
const TRAMP_ENDURE_SHAKE_SPEED = 38
const TRAMP_ENDURE_SHAKE_AMP = 0.7
const TRAMP_ENDURE_SQUASH_MAX = 0.3
const TRAMP_ENDURE_PULSE_SPEED = 16
const TRAMP_ENDURE_PULSE_AMP = 0.035
const TRAMP_WALK_SPEED = 52
const TRAMP_WALK_NEAR = 220
//
// Wider stand-still band while the O-meditation countdown ticks (hero sings)
//
const TRAMP_WALK_NEAR_SINGING = 370
const TRAMP_CHEEKY_EVERY = 5
const TRAMP_CHEEKY_DURATION = 3
const TRAMP_BAD_SING_TEXT = 'I can\'t listen\nto this anymore'
const TRAMP_BAD_SING_TEXT_2 = 'Oh come on.\nYou again'
const TRAMP_BAD_SING_TEXT_3 = 'I\'ll go drown myself'
const TRAMP_BAD_SING_TEXTS = [TRAMP_BAD_SING_TEXT, TRAMP_BAD_SING_TEXT_2, TRAMP_BAD_SING_TEXT_3]
const TRAMP_WALK_SINGS_TO_WATER = 3
const TRAMP_WALK_SHORE_PAD = TRAMP_TOTAL_W / 2 + 24
const TRAMP_BAD_SING_DURATION = 4
const BRANCH_TRAMP_WRONG_SING_TEXT = "I'm not that mushroom!"
const BRANCH_TRAMP_WRONG_SING_DURATION = 5
const LETTER_ARROW_CORNER_RADIUS = 3
const LETTER_ARROW_STEM_HEAD_OVERLAP = 14
const CAVE_ENTRANCE_LANDING_PARTICLE_MULT = 2.4
//
// Rotating quips when the hero keeps bouncing without a break
//
const TRAMP_CHEEKY_LINES = [
  'Getting cheeky, are we?',
  'Boing. Boing. Boing.',
  'Someone\'s got spring fever.',
  'The mushroom is judging you.',
  'Still bouncing? Really?',
  'You\'re wearing me out.',
  'This is not a trampoline park.',
  'Fine. Keep going. See if I care.'
]
const BRANCH_TRAMP_CHEEKY_LINES = [
  'I am a mushroom,\nnot a springboard.',
  'Easy, hero, my cap only bounces so much.',
  'You and me, we have bounced enough today.',
  'Careful up there, I bruise easily.',
  'Again? My stem is getting tired.',
  'Go easy on a fungus, will you?'
]
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
// Extra width of the below-surface drown cover past the lake's right edge.
//
const DROWN_MASK_RIGHT_PAD = 120
//
// Narrow below-bed cover follows the sinking hero — not a full-lake sheet.
//
const DROWN_BELOW_BED_COVER_HALF_W = 44
const LAKE_SEGMENTS = 16
const LAKE_WAVE_FREQ = 0.85
const LAKE_WAVE_AMP = 3
const LAKE_WAVE_PHASE_SCALE = 4
const LAKE_WAVE_SECOND_AMP = 1.2
const LAKE_WAVE_SECOND_FREQ = 1.6
const LAKE_Z = 12
//
// Drowning draw order (back → front): hero, below-surface cover, lake fill.
//
const DROWN_HERO_DRAW_Z = LAKE_Z - 2
const DROWN_COVER_Z = LAKE_Z - 1
//
// Tree-side lake cap rocks must draw above swaying grass or the blades hide
// the shore caps when the left ground decor opens with the lake.
//
const SHORE_END_ROCK_Z = GRASS_Z + 1
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
// Slack around a wood surface when deciding "the hero's feet are on wood"
// for the foot-dust guard — wider than the surface detector's own window so
// a single off-by-a-frame sample can never leak a dust puff onto the branch.
//
const WOOD_FOOT_X_PAD = 14
const WOOD_FOOT_Y_PAD_ABOVE = 26
const WOOD_FOOT_Y_PAD_BELOW = 34
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
const POST_LAND_AIR_LOCK_GLOW = 0.28
const GOLD_RECOLOR_DELAY = 0.55
const DIALOG_INPUT_GRACE = 0
//
// After dialog pin release, keep gravity off and Y pinned briefly so L/O
// wood hitboxes register before physics resume (prevents fall-through).
//
const DIALOG_POST_SETTLE = 0
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
    initGlowLevel0Scene(k)
  })
}
/**
 * Bakes tree + parallax sprites during the menu→Glow transition (single DOM loader).
 * @param {Object} k - Kaplay instance
 * @param {Function} [onProgress] - 0–100 bake progress
 */
export function prewarmGlowLevel0HeavyAssets(k, onProgress) {
  recomputeGlowScreenLayout(k)
  const zones = loadGlowZones()
  const treeData = buildGlowTree(TREE_SEED, TREE_X, TREE_TRUNK_BOTTOM_Y, TREE_TOP_Y, ROOT_MAX_Y, TREE_ROOT_START_Y)
  const prewarmSegmentSave = get(KEY_TREE_SEGMENTS_REVEALED, [])
  const prewarmMonolith = zones.tree && !(Array.isArray(prewarmSegmentSave) && prewarmSegmentSave.length > 0)
  if (prewarmMonolith) {
    bakeMonolithicGlowTreeSprites(k, treeData)
    onProgress?.(50)
  } else {
    const plan = TreeSegments.buildGlowTreeSegmentPlan(treeData)
    const ids = TreeSegments.allGlowTreeSegmentIds(treeData, plan)
    TreeSegments.bakeGlowTreeSegmentSprites(k, treeData, WORLD_W, WORLD_H, ids)
    onProgress?.(70)
  }
  const undergroundSpec = loadUndergroundSprites(k)
  buildParallaxSprites(k, undergroundSpec)
  //
  // Gold hero frames are baked here so collecting O does not hitch the
  // main thread while the colour-world fade is already drawing extra layers.
  //
  Hero.loadHeroSprites({
    k,
    type: Hero.HEROES.HERO,
    bodyColor: GLOW_GOLD_HEX,
    outlineColor: HERO_OUTLINE_COLOR,
    eyeWhiteColor: HERO_EYE_WHITE
  })
  onProgress?.(100)
}
//
// Builds lesson-glow.0 — tree segments, parallax, decor and gameplay hooks.
//
function initGlowLevel0Scene(k) {
    recomputeGlowScreenLayout(k)
    set('lastLesson', 'lesson-glow.0')
    set('lastSection', 'glow')
    CanvasBackdrop.applyCanvasBackdrop(k, GLOW_PAL.void)
    k.onSceneLeave(() => CanvasBackdrop.clearCanvasBackdrop(k))
    k.setGravity(CFG.game.gravity)
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    sound._k = k
    const birdsMusic = k.play('birds', { loop: true, volume: 0, paused: true })
    const stopGlowLoopAudio = () => {
      birdsMusic?.stop?.()
      Sound.stopRainSound(sound)
      Sound.stopTrampWaterStepsLoop(sound)
      Sound.stopWaterStepsLoop(sound)
    }
    k.onSceneLeave(stopGlowLoopAudio)
    const zones = loadGlowZones()
    const colorFadeInit = zones.colorWorld ? 1 : 0
    //
    // Draw callbacks on decor/tramps read zones._sceneRef before inst exists
    // (async bootstrap yields to the engine between setup steps).
    //
    zones._sceneRef = { zones, colorFade: colorFadeInit }
    zones.outerFrame && CanvasBackdrop.applyCanvasBackdrop(k, OUTER_BG_HEX)
    !zones.outerFrame && CanvasBackdrop.applyCanvasBackdrop(k, GLOW_PAL.void)
    const treeData = buildGlowTree(TREE_SEED, TREE_X, TREE_TRUNK_BOTTOM_Y, TREE_TOP_Y, ROOT_MAX_Y, TREE_ROOT_START_Y)
    const savedTreeSegmentsRaw = get(KEY_TREE_SEGMENTS_REVEALED, [])
    const hasPersistedSegmentReveal = Array.isArray(savedTreeSegmentsRaw) && savedTreeSegmentsRaw.length > 0
    const treeDrawMonolith = zones.tree && !hasPersistedSegmentReveal
    let treeSegmentPlan = null
    let treeSegmentIds = []
    let treeSegmentEntries = {}
    const treeSegmentRevealed = new Set()
    let treeSegmentPending = []
    if (treeDrawMonolith) {
      !glowTreeSpritesPrewarmed(k, true, []) && bakeMonolithicGlowTreeSprites(k, treeData)
    } else {
      treeSegmentPlan = TreeSegments.buildGlowTreeSegmentPlan(treeData)
      treeSegmentIds = TreeSegments.allGlowTreeSegmentIds(treeData, treeSegmentPlan)
      const savedRaw = get(KEY_TREE_SEGMENTS_REVEALED, [])
      const savedTreeSegments = TreeSegments.normalizePersistedTreeSegmentIds(savedRaw, treeData, treeSegmentPlan)
      savedTreeSegments.forEach(id => treeSegmentRevealed.add(id))
      treeSegmentPending = treeSegmentPlan.pendingIds.filter(id => !treeSegmentRevealed.has(id))
      !glowTreeSpritesPrewarmed(k, false, treeSegmentIds) &&
        TreeSegments.bakeGlowTreeSegmentSprites(k, treeData, WORLD_W, WORLD_H, treeSegmentIds)
      treeSegmentEntries = TreeSegments.createGlowTreeSegmentObjects(
        k,
        treeSegmentIds,
        CFG.visual.zIndex.platforms - 2,
        zones.lCollected
      )
      applyPersistedTreeSegmentVisibility(treeSegmentEntries, treeSegmentRevealed)
      treeSegmentRevealed.size >= treeSegmentIds.length && (zones.tree = true)
    }
    //
    // Underground decor first: its generated spec is baked both into the
    // standalone sprites (visible before L) and into the combined background.
    //
    const undergroundSpec = loadUndergroundSprites(k)
    !glowParallaxSpritesPrewarmed(k) && buildParallaxSprites(k, undergroundSpec)
    //
    // Main tree: one sprite pair when fully explored, else segment sprites.
    //
    const initialGraySprite = zones.lCollected ? TREE_LIT_SPRITE_NAME : TREE_FLAT_SPRITE_NAME
    let treeObj
    let treeColorObj
    if (treeDrawMonolith) {
      treeObj = k.add([
        k.sprite(initialGraySprite),
        k.pos(0, 0),
        k.z(CFG.visual.zIndex.platforms - 2)
      ])
      treeColorObj = k.add([
        k.sprite(TREE_COLOR_SPRITE_NAME),
        k.pos(0, 0),
        k.z(CFG.visual.zIndex.platforms - 2),
        k.opacity(0)
      ])
      const showColorTree = zones.colorWorld
      treeObj.hidden = showColorTree
      treeColorObj.hidden = !showColorTree
      treeObj.opacity = 1
      treeColorObj.opacity = 1
    } else {
      treeObj = k.add([
        k.pos(-WORLD_W, 0),
        k.z(CFG.visual.zIndex.platforms - 2),
        k.opacity(0)
      ])
      treeObj.hidden = true
      treeColorObj = k.add([
        k.pos(-WORLD_W, 0),
        k.z(CFG.visual.zIndex.platforms - 2),
        k.opacity(0)
      ])
      treeColorObj.hidden = true
    }
    const floorBounds = createLevelBounds(k)
    const floorPlat = floorBounds.floor
    const cornerObjs = createRoundedCorners(k, zones)
    const { horizBranch } = treeData
    //
    // Platform top aligns with physY — the visible branch walk surface
    //
    const branchPlatY = horizBranch.physY + BRANCH_PLAT_COLLISION_DROP_Y
    const branchPlat = k.add([
      k.rect(horizBranch.x2 - horizBranch.x1, HORIZ_PLATFORM_H),
      k.pos(horizBranch.x1, branchPlatY),
      k.anchor('topleft'),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ])
    branchPlat.tag('startBranch')
    const branchPlatHome = { x: horizBranch.x1, y: branchPlatY }
    const branchTrampX = TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X
    //
    // Left hedgehog ambush spot — see HEDGEHOG_LEFT_AMBUSH_TRIGGER_GAP.
    //
    const hedgehogAmbushTriggerX = branchTrampX + HEDGEHOG_LEFT_AMBUSH_TRIGGER_GAP
    const hedgehogAmbushPopX = hedgehogAmbushTriggerX + HEDGEHOG_LEFT_AMBUSH_POP_LEAD
    //
    // Right ambush hedgehog's home spot on the L-log — computed early (it
    // only depends on TREE_X and fixed offsets, not on anything laid out
    // further below) so the spawn-clearance check right after can see it.
    //
    const rightZoneBaseX = TREE_X + RIGHT_PLAT_OFFSET_X + RIGHT_ZONE_SHIFT_X
    const lPlatX = rightZoneBaseX - L_PLAT_SHIFT_LEFT
    const treeGroundSpawnX = branchTrampX + HERO_DEATH_RESPAWN_PAST_BRANCH_TRAMP_X
    const respawnNearTree = get(KEY_RESPAWN_NEAR_TREE, false)
    respawnNearTree && set(KEY_RESPAWN_NEAR_TREE, false)
    const branchSpawnX = horizBranch.x1 + Math.round((horizBranch.x2 - horizBranch.x1) * HERO_BRANCH_FRACTION)
    const lastSpawnMode = get(KEY_LAST_SPAWN_MODE, null)
    const lastSpawnX = get(KEY_LAST_SPAWN_X, null)
    const clampBranchSpawnX = (x) => Math.max(
      horizBranch.x1 + LOG_SNAP_X_SLACK,
      Math.min(horizBranch.x2 - LOG_SNAP_X_SLACK, x)
    )
    //
    // Ground spawn: right of the branch trampoline (never on its cap). After a
    // drowning death or any revisit with explored right ground — same spot.
    // Menu exit / death on branch or ground restores the last saved pose.
    //
    let spawnOnBranch = false
    let heroSpawnX = branchSpawnX
    if (respawnNearTree) {
      heroSpawnX = treeGroundSpawnX
    } else if (lastSpawnMode === SPAWN_MODE_BRANCH && lastSpawnX != null) {
      spawnOnBranch = true
      heroSpawnX = clampBranchSpawnX(lastSpawnX)
    } else if (lastSpawnMode === SPAWN_MODE_GROUND && lastSpawnX != null) {
      heroSpawnX = lastSpawnX
    } else if (zones.groundDecorRight) {
      heroSpawnX = treeGroundSpawnX
    } else {
      spawnOnBranch = true
      heroSpawnX = branchSpawnX
    }
    const heroSpawnY = spawnOnBranch
      ? branchPlatY - SURFACE_DETECT_Y + LOG_SNAP_EMBED
      : FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    //
    // A saved/derived ground spawn landing inside the left hedgehog's
    // ambush danger zone (trigger..pop, plus its touch radius) would pop
    // and kill it the instant the level loads. Pull the spawn back to just
    // before the trigger instead whenever that would happen — landing past
    // the whole zone (already-explored ground further right) is left as is.
    //
    if (!spawnOnBranch) {
      const dangerEndX = hedgehogAmbushPopX + HEDGEHOG_LEFT_AMBUSH_DANGER_MARGIN
      if (heroSpawnX >= hedgehogAmbushTriggerX && heroSpawnX <= dangerEndX) {
        heroSpawnX = hedgehogAmbushTriggerX - HERO_HEDGEHOG_SPAWN_CLEARANCE
      }
    }
    //
    // Second check: the right (L-log) ambush hedgehog. Once L has already
    // been collected in an earlier session it starts already popped and
    // wandering the ground across the log's own footprint (see its
    // minX/maxX below) instead of waiting hidden — landing right on top of
    // it at level load would be an instant, unavoidable death. Same pull-
    // back treatment as the left hedgehog's danger zone above.
    //
    if (!spawnOnBranch && zones.lCollected) {
      const rHogDangerStartX = lPlatX - HEDGEHOG_WANDER_RIGHT_MARGIN
      const rHogDangerEndX = lPlatX + LOG_W + HEDGEHOG_WANDER_RIGHT_MARGIN
      if (heroSpawnX >= rHogDangerStartX && heroSpawnX <= rHogDangerEndX) {
        heroSpawnX = rHogDangerEndX + HERO_HEDGEHOG_SPAWN_CLEARANCE
      }
    }
    //
    // Glow sound effects and the ambient birds are audible from the first
    // frame; collecting G no longer acts as an audio gate.
    //
    sound._glowSfxMuted = false
    sound.glowSfxGain && (sound.glowSfxGain.gain.value = 1)
    Sound.stopRainSound(sound)
    k.onSceneLeave(() => {
      Sound.stopRainSound(sound)
      Sound.stopAmbient(sound)
      k.camScale(1)
    })
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
      suppressDust: true,
      //
      // The hero's quiet humming is available from the start of Glow.
      //
      idleVocalization: 'humming'
    })
    //
    // No footprint trail in the glow level — the ground stays clean.
    //
    heroInst.suppressFootprints = true
    //
    // Glow level: no particle assembly on spawn (first visit or reload).
    //
    Hero.spawn(heroInst, { instant: true })
    spawnOnBranch && (heroInst.direction = -1)
    spawnOnBranch && heroInst.character && (heroInst.character.flipX = true)
    tagWoodPlatform(branchPlat, sound, heroInst)
    tagGroundPlatform(floorPlat, sound, heroInst)
    floorBounds.postCaveFloor && tagGroundPlatform(floorBounds.postCaveFloor, sound, heroInst)
    const rightPlatY = horizBranch.physY
    const wPlatY = Math.min(horizBranch.physY + W_PLAT_Y_BELOW, FLOOR_Y - 50)
    const wPlatX = W_PLAT_X_BASE
    const clusterCenterX = horizBranch.x1 + 40
    const waterX2 = clusterCenterX + CLUSTER_ROCK_RADIUS_MAX + 10 - WATER_RIGHT_TRIM
    const oPlatX = rightZoneBaseX + LOG_W + O_PLAT_OFFSET_X
    const oPlatY = rightPlatY - O_PLAT_OFFSET_Y
    const bonusPlatX = oPlatX + LOG_W + BONUS_PLAT_OFFSET_X
    const bonusPlatY = oPlatY - BONUS_PLAT_OFFSET_Y
    const logAtlas = createLogAtlasCollector()
    const lPlat = createGrayLogPlatform(k, lPlatX, rightPlatY, LOG_W, LOG_H, sound, heroInst, zones, true, logAtlas)
    const wPlat = createGrayLogPlatform(k, wPlatX, wPlatY, LOG_W, LOG_H, sound, heroInst, zones, false, logAtlas)
    const oPlat = createGrayLogPlatform(k, oPlatX, oPlatY, LOG_W, LOG_H, sound, heroInst, zones, true, logAtlas)
    const trampX = rightZoneBaseX + LOG_W + TRAMP_OFFSET_FROM_L_PLAT
    const trampBundle = createMushroomTrampoline(k, trampX, FLOOR_Y, zones, {
      drawZ: CFG.visual.zIndex.player + 1
    })
    const branchTrampBundle = createMushroomTrampoline(k, branchTrampX, FLOOR_Y, zones, {
      gateBranchTramp: true,
      drawZ: CFG.visual.zIndex.platforms + 2
    })
    const gLetterX = horizBranch.x2 + G_LETTER_RIGHT_OF_BRANCH_GAP + GLOW_LETTER_SIZE / 2
    const gLetterY = horizBranch.physY - GLOW_LETTER_SIZE * 0.15 - G_LETTER_RAISE_Y
    const gLetter = zones.gCollected ? null : createGlowLetter(k, 'G', gLetterX, gLetterY, GLOW_LETTER_TILT, GLOW_GOLD_HEX)
    //
    // G sits right against the big tree's canopy — createGlowLetter's
    // default z is below the tree's monolithic sprite (trunk+branches+
    // leaves as one image), so without this it would draw behind the
    // leaves instead of in front of them, same fix already applied to O.
    //
    gLetter?.allObjects?.forEach(obj => { obj.z = CFG.visual.zIndex.platforms - 1 })
    const lLetterX = lPlatX - L_LETTER_LEFT_OF_PLAT_GAP - GLOW_LETTER_SIZE / 2
    const lLetterY = rightPlatY - GLOW_LETTER_SIZE * 0.15 - L_LETTER_RAISE_Y
    const lLetter = zones.lCollected ? null : createGlowLetter(k, 'L', lLetterX, lLetterY, -GLOW_LETTER_TILT, GLOW_GOLD_HEX)
    const wLetterX = wPlatX + LOG_W / 2
    const wLetterY = wPlatY - GLOW_LETTER_SIZE * 0.15 - W_LETTER_RAISE_Y
    const wLetter = zones.wCollected ? null : createGlowLetter(k, 'W', wLetterX, wLetterY, GLOW_LETTER_TILT * 0.7, GLOW_GOLD_HEX)
    const oLetterX = oPlatX + LOG_W / 2
    const oLetterY = oPlatY - GLOW_LETTER_SIZE * 0.15 - O_LETTER_RAISE_Y
    const oLetter = zones.oCollected ? null : createGlowLetter(k, 'O', oLetterX, oLetterY, GLOW_LETTER_TILT * 0.5, GLOW_GOLD_HEX)
    oLetter?.allObjects?.forEach(obj => { obj.z = CFG.visual.zIndex.platforms - 1 })
    const lakeX1 = LEFT_MARGIN
    const lakeX2 = waterX2
    const grassLayer = createGlowGrass(k, lakeX1, waterX2, trampX, branchTrampX, zones)
    //
    // Rocks and mushrooms each bake 2-3 gray/outline canvas variants per
    // instance (dozens of decor pieces total). Registering them all into one
    // shared atlas (built right after both are placed) means every decor
    // sprite on screen shares a single texture bind instead of each piece
    // forcing its own bindTexture/useProgram GPU state change — this is what
    // actually tanks FPS once O opens up the whole level's decor at once.
    //
    const decorAtlas = createCanvasAtlasBuilder()
    const rockObjs = createGlowRocks(k, horizBranch.x1, lakeX2, rightZoneBaseX, trampX, branchTrampX, zones, decorAtlas)
    const mushObjs = createGlowMushrooms(k, lakeX1, waterX2, trampX, branchTrampX, zones, decorAtlas)
    decorAtlas.build(k)
    const leftHedgehogRevealed = get(KEY_LEFT_HEDGEHOG_REVEALED, false)
    const ambushHedgehogRevealed = get(KEY_AMBUSH_HEDGEHOG_REVEALED, false)
    const hedgehog = Hedgehog.create({
      k,
      x: hedgehogAmbushPopX,
      y: FLOOR_Y - HEDGEHOG_GROUND_RAISE,
      scale: HEDGEHOG_SCALE,
      facing: 'left',
      hero: heroInst,
      zones,
      hiddenUntilPopOut: !leftHedgehogRevealed,
      minX: hedgehogAmbushPopX - HEDGEHOG_LEFT_AMBUSH_WANDER_LEASH,
      maxX: Math.min(hedgehogAmbushPopX + HEDGEHOG_LEFT_AMBUSH_WANDER_LEASH, trampX - HEDGEHOG_WANDER_RIGHT_MARGIN)
    })
    //
    // Ambush hedgehog waits hidden at the far edge of the L-log platform and
    // pops into view the moment the hero first lands there (see
    // maybeMarkLPlatStepped). Once L was already collected in an earlier
    // life/session there's no ambush left to spring — it starts already
    // popped and wandering the ground beside the log instead. If it already
    // popped in a prior life (even before L was taken) it stays visible on
    // reload too.
    //
    const ambushHedgehog = Hedgehog.create({
      k,
      x: zones.lCollected ? lPlatX + LOG_W / 2 : lPlatX + LOG_W - HEDGEHOG_AMBUSH_EDGE_GAP,
      y: (zones.lCollected ? FLOOR_Y : rightPlatY) - HEDGEHOG_AMBUSH_GROUND_RAISE,
      scale: HEDGEHOG_AMBUSH_SCALE,
      facing: 'left',
      hero: heroInst,
      zones,
      hiddenUntilPopOut: !(zones.lCollected || ambushHedgehogRevealed),
      minX: zones.lCollected ? lPlatX - HEDGEHOG_WANDER_RIGHT_MARGIN : lPlatX,
      maxX: zones.lCollected ? lPlatX + LOG_W + HEDGEHOG_WANDER_RIGHT_MARGIN : lPlatX + LOG_W
    })
    const waterLayer = createWater(k, lakeX1, waterX2, zones)
    createLakeShoreRockLayer(k, zones)
    createDrownMask(k, lakeX1, lakeX2, zones)
    initTouchInput(k)
    TouchControls.create(k)
    const goldRgb = getRGB(k, GLOW_GOLD_HEX)
    const completedLetterCount = countGlowLettersCollected(zones)
    //
    // GLOW stays hidden until the first yellow G fill (branch landing or
    // a ground side opening). Returning visits restore it with saved fill.
    //
    const bonusCollected = get(KEY_BONUS_COLLECTED, false)
    const pitBonusCollected = get(KEY_PIT_BONUS, false)
    const fragmentsPersisted = bonusCollected || pitBonusCollected
    const lifeShown = get(KEY_LIFE_SHOWN, false)
    const levelIndicator = createGlowLevelIndicator(k, goldRgb, completedLetterCount, zones.colorWorld)
    pinGlowHudFixed(levelIndicator)
    LevelIndicator.setSectionLabelHidden(levelIndicator, true)
    if (levelIndicator && fragmentsPersisted) {
      LevelIndicator.revealSmallHeroHud(levelIndicator)
      levelIndicator.updateHeroScore?.(get('heroScore', 0))
    }
    if (levelIndicator && lifeShown) {
      LevelIndicator.revealLifeHud(levelIndicator, !zones.colorWorld)
      levelIndicator.updateLifeScore?.(get('lifeScore', 0))
    }
    startBirdsMusic(birdsMusic, zones)
    //
    // Hidden bonus platform draws in the same style as the O/L letter logs:
    // flat environment-toned barrel in gray mode, detailed wood after O.
    //
    const bonusLogDetail = generateLogDetail(BONUS_PLAT_W, LOG_H)
    //
    // Fragment platform stays after collection so the right-edge pit jump remains
    //
    let bonusHeroInst = null
    let bonusPlatAlways = null
    if (bonusCollected) {
      bonusPlatAlways = createGrayLogPlatform(k, bonusPlatX, bonusPlatY, BONUS_PLAT_W, LOG_H, sound, heroInst, zones, false, logAtlas)
      bonusPlatAlways.hidden = false
      bonusPlatAlways.pos.x = bonusPlatX + BONUS_PLAT_W / 2
      bonusPlatAlways.pos.y = bonusPlatY + LOG_H / 2
    } else {
      const bonusBakedLit = logAtlas.register(BONUS_PLAT_W, LOG_H, bonusLogDetail, LOG_TREE_LIT_COLORS)
      const bonusBakedColor = logAtlas.register(BONUS_PLAT_W, LOG_H, bonusLogDetail, LOG_TREE_COLOR_COLORS)
      bonusHeroInst = BonusHero.create({
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
        persistStorageOnCollect: true,
        platformCollisionXOffset: Math.round(BONUS_PLAT_W / 2),
        platformCollisionYOffset: 10,
        customPlatformDraw: bonus => drawBonusPlatformLog(k, bonus, zones, bonusBakedLit, bonusBakedColor),
        collectHintText: BONUS_HINT_TEXT,
        collectHintDuration: BONUS_HINT_DURATION,
        tooltipClampInset: glowTooltipClampInset()
      })
    }
    //
    // Build the shared log-platform atlas once every platform (L, W, O, the
    // hidden bonus log) has registered its bake request above.
    //
    logAtlas.build(k)
    //
    // Dock target is mid-lake so the last walk always crosses open water.
    // Walk progress (x, sing count, docked) is restored from storage.
    //
    const trampDockX = (lakeX1 + lakeX2) * 0.5
    const savedTrampSingCount = Number(get(KEY_TRAMP_WALK_SING_COUNT, 0)) || 0
    const savedTrampWalked = Boolean(get(KEY_TRAMP_WALKED, false)) ||
      savedTrampSingCount >= TRAMP_WALK_SINGS_TO_WATER
    const savedTrampXRaw = get(KEY_TRAMP_WALK_X, null)
    const savedTrampX = typeof savedTrampXRaw === 'number' ? savedTrampXRaw : null
    const restoredTrampX = savedTrampWalked
      ? trampDockX
      : (savedTrampX != null
        ? Math.max(trampDockX, Math.min(trampX, savedTrampX))
        : trampX)
    trampBundle.state.homeX = trampX
    trampBundle.state.x = restoredTrampX
    trampBundle.state.hasLegs = savedTrampWalked
    trampBundle.state.walkDir = savedTrampWalked ? -1 : 0
    trampBundle.state._prevX = restoredTrampX
    //
    // Thin solid pad under the walking mushroom (keeps the hero from falling
    // through the lake while riding / bouncing on the cap)
    //
    const trampPad = k.add([
      k.rect(TRAMP_CAP_W, TRAMP_PAD_H),
      k.pos(-500, PLATFORM_HIDE_Y),
      k.anchor('center'),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ])
    const branchTrampPad = k.add([
      k.rect(TRAMP_CAP_W, TRAMP_PAD_H),
      k.pos(-500, PLATFORM_HIDE_Y),
      k.anchor('center'),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ])
    const camera = GlowCamera.create({
      k,
      viewW: VIEW_W,
      viewH: VIEW_H,
      worldW: WORLD_W,
      worldH: WORLD_H,
      leftMargin: LEFT_MARGIN,
      rightMargin: RIGHT_MARGIN,
      topMargin: TOP_MARGIN,
      playfieldBottomY: PLAYFIELD_BOTTOM_Y,
      //
      // Pinned to the design height's own centre (not the live window's) so
      // the world stays laid out at its design position — a taller window
      // grows as letterbox padding above/below instead of revealing more
      // world vertically. See recomputeGlowScreenLayout / VOID_PAD_Y.
      //
      fixedCamY: Math.round(DESIGN_SCREEN_H / 2)
    })
    const inst = {
      k,
      camera,
      cameraIntroPlaying: false,
      pendingGlowIntro: false,
      introHintDelayRemaining: 0,
      birdCamX: null,
      heroSpawnFade: 0,
      cameraLetterPeek: null,
      letterOffscreenArrow: null,
      oZoneRevealTime: null,
      oStuckHintShown: false,
      oStuckHintTooltip: null,
      sound,
      birdsMusic,
      letterDialogMusic: null,
      undergroundSkeleton: undergroundSpec.skeleton,
      dialogHeroPinned: false,
      dialogPinY: 0,
      dialogInputGrace: 0,
      dialogPostSettle: 0,
      heroLockedAfterW: false,
      heroInst,
      zones,
      treeObj,
      treeColorObj,
      treeData,
      treeDrawMonolith,
      treeDrawColorMode: Boolean(zones.colorWorld),
      treeSegmentEntries,
      treeSegmentIds,
      treeSegmentPending,
      treeSegmentRevealed,
      treeRevealLandingCount: 0,
      treeStripEndX: WORLD_W - RIGHT_MARGIN - 20,
      treeGraySpriteName: zones.lCollected ? TREE_LIT_SPRITE_NAME : TREE_FLAT_SPRITE_NAME,
      colorFade: zones.colorWorld || zones.oZone ? 1 : 0,
      colorFadeTarget: zones.colorWorld || zones.oZone ? 1 : 0,
      //
      // Forest fade-in: already-revealed worlds start fully visible; a fresh
      // L pickup starts at 0 and the update loop fades the plane in.
      //
      parallaxFade: zones.lZoneParallax || zones.oZone ? 1 : 0,
      _meditationParallaxPreview: false,
      _meditationPreviewFadingOut: false,
      //
      // Background birds gliding behind the forest (colour world only).
      //
      birds: createBackgroundBirds(),
      birdTime: 0,
      cornerObjs,
      cornerColorHex: isOuterFrameVisible(zones) ? OUTER_BG_HEX : GLOW_PAL.void,
      wallObjs: floorBounds.walls,
      grassLayer,
      rockObjs,
      mushObjs,
      hedgehog,
      hedgehogAmbushTriggerX,
      hedgehogAmbushPopX,
      ambushHedgehog,
      ambushHedgehogIdleTimer: 0,
      lPlatCaptionHiding: false,
      oPlatCaptionHiding: false,
      hedgehogDeathHandled: false,
      waterLayer,
      atmosphereMotes: createAtmosphereMotes(),
      leftDecorFade: zones.groundDecorLeft ? 1 : 0,
      bonusHeroInst,
      bonusPlatAlways,
      trampBundle,
      branchTrampBundle,
      trampPad,
      branchTrampPad,
      branchTrampBounceAir: false,
      treeRevealFromBranchTramp: false,
      trampWalk: {
        stillTimer: 0,
        countdown: null,
        walking: false,
        walked: savedTrampWalked,
        singCount: savedTrampSingCount,
        walkTargetX: trampDockX,
        dockX: trampDockX,
        bounceCount: 0,
        cheekyTimer: 0,
        cheekyLineIdx: 0,
        cheekyTooltip: null,
        badSingTooltip: null,
        wrongSingCooldown: WRONG_TRAMP_SING_HINT_REPEAT,
        waterHintStarted: savedTrampWalked
      },
      branchTrampWalk: {
        bounceCount: 0,
        cheekyTimer: 0,
        cheekyLineIdx: 0,
        cheekyTooltip: null,
        marioEligibleSince: null,
        marioHintCooldown: 0,
        marioHintTooltip: null,
        marioHintSpawnX: null,
        marioHintSpawnY: null
      },
      trampMissingHints: { right: null, branch: null, cave: null },
      trampBounceAir: false,
      trampToLApproach: false,
      lPlat,
      wPlat,
      oPlat,
      lPlatHome: { x: lPlatX, y: rightPlatY },
      wPlatHome: { x: wPlatX, y: wPlatY },
      oPlatHome: { x: oPlatX, y: oPlatY },
      lLetter,
      wLetter,
      oLetter,
      gLetter,
      glowLetters: [lLetter, wLetter, oLetter].filter(Boolean),
      trampState: trampBundle.state,
      branchTrampState: branchTrampBundle.state,
      lakeX1,
      lakeX2,
      waterX2,
      lastHeroX: heroSpawnX,
      logHoverFrames: 0,
      wasGrounded: false,
      wasHeroRunning: false,
      drowning: false,
      drownTimer: 0,
      deathHandled: false,
      wasOnStartBranch: false,
      drownFromStartBranch: false,
      dialogOpen: false,
      levelIndicator,
      goldRgb,
      wTrigger: { x1: wPlatX - PLAT_LAND_TRIGGER_PAD, x2: wPlatX + LOG_W + PLAT_LAND_TRIGGER_PAD, y: wPlatY - 60, y2: wPlatY + LOG_H + 20 },
      bonusPlatHome: { x: bonusPlatX, y: bonusPlatY, w: BONUS_PLAT_W, h: LOG_H },
      //
      // Always false at scene start — the colorWorld branch below rebakes the
      // gold hero even on reload (the hero object itself spawns whitish).
      //
      heroGoldApplied: false,
      fpsCounter: null,
      pendingDialogAction: null,
      treeRevealFade: zones.tree ? 1 : 0,
      treeRevealActive: false,
      //
      // Speech-bubble hints controller (shared white cloud from utils).
      //
      heroHint: HeroHint.create({ k, heroInst, clampInset: glowTooltipClampInset() }),
      //
      // Controls stay locked while the intro hints play; the G letter
      // appears only after both hints finish. introStep tracks which intro
      // hint is on screen for the key-press advance.
      //
      introLock: false,
      introStep: 0,
      introHintPhase: null,
      introHintPause: 0,
      //
      // O-letter meditation state (see MEDITATION_* constants).
      //
      meditation: { idleTimer: 0, requiredIdle: MEDITATION_IDLE_BASE, countdown: null },
      meditationBirdsActive: false,
      meditationWorldLife: zones.oZone || zones.oCollected ? 1 : 0,
      pendingTreeReveal: !treeDrawMonolith && treeSegmentRevealed.size < treeSegmentIds.length,
      treeBranchLeftOnce: false,
      hasStoodOnStartBranch: false,
      startBranch: { x1: horizBranch.x1, x2: horizBranch.x2, y: branchPlatY },
      branchPlat,
      branchPlatHome,
      midges: createGlowMidges(k, FLOOR_Y, WORLD_W, { treeX: TREE_X }),
      pit: null,
      woodSurfaces: [
        { x1: horizBranch.x1, x2: horizBranch.x2, y: branchPlatY, h: HORIZ_PLATFORM_H }
      ],
      letterProgressHintCooldown: LETTER_PROGRESS_HINT_INTERVAL,
      lastLetterCollectTime: null,
      spawnedOnBranch: spawnOnBranch,
      branchLookPhase: spawnOnBranch ? 'left' : null,
      branchLookTimer: spawnOnBranch ? BRANCH_LOOK_LEFT_DURATION : 0,
      pendingReplayIntro2: false,
      hudLetterFillDrawer: null,
      _hudGFillParts: null,
      _hudLFillParts: null,
      _hudOFillParts: null,
      _hudWFillParts: null
    }
    if ((zones.gCollected || zones.lCollected || zones.oCollected) && !zones.wCollected) {
      inst.lastLetterCollectTime = k.time()
      inst.letterProgressHintCooldown = LETTER_PROGRESS_HINT_INTERVAL
    }
    inst.oZoneRevealTime = zones.oZone ? k.time() : null
    zones._lakeX1 = lakeX1
    zones._lakeX2 = lakeX2
    zones._groundStripEndX = WORLD_W - RIGHT_MARGIN - 20
    if (!inst.treeDrawMonolith && isAllTreeSegmentsRevealed(inst)) {
      inst.zones.tree = true
      set(KEY_REVEALED_TREE, true)
    }
    applyZoneVisibility(inst)
    restorePersistedGlowZoneVisuals(inst)
    zones.lCollected && rebakeGlowRockSpritesShaded(inst)
    syncGlowFpsHudVisibility(inst)
    maybeStartGlowCameraIntro(inst, zones)
    updateGlowCamera(inst)
    updatePlayfieldBorderColors(inst)
    inst.zones._sceneRef = inst
    zones.colorWorld && applyColorWorldHero(inst)
    zones.wCollected && revealPostWHud(inst)
    inst.pit = createGlowPit({
      k,
      floorY: FLOOR_Y,
      screenW: WORLD_W,
      heroInst,
      sound,
      levelIndicator,
      heroBodyColor: HERO_BODY_COLOR,
      groundColor: GROUND_DARK,
      alreadyCollapsed: get(KEY_PIT_COLLAPSED, false),
      cracksVisible: isGlowCaveCracksVisible(zones),
      tooltipClampInset: glowTooltipClampInset()
    })
    inst.pit.sceneRef = inst
    inst.pit.onCrackLandingShake = () => triggerGlowCameraShake(inst)
    inst.pit.crackFloor && tagGroundPlatform(inst.pit.crackFloor, sound, heroInst)
    inst.footParticles = GlowFootParticles.create({ k })
    syncGlowMidgesZones(inst.midges, zones, inst.pit.collapsed)
    inst.midges.worldLife = zones.oZone || zones.oCollected ? 1 : 0
    //
    // Permanent fragment log stays in the wood-surface list for step SFX
    //
    inst.bonusPlatAlways && rebuildWoodSurfaces(inst)
    maybeShowGLetter(inst)
    zones.gCollected && !zones.lCollected && zones.lPlatRevealed &&
      maybeStartLetterOffscreenArrowForTarget(inst, getLPlatformArrowTargetX(inst))
    zones.oZone && !zones.lZoneParallax && revealLParallaxZone(inst)
    zones.oZone && maybeStartLetterOffscreenArrow(inst, inst.oLetter)
    zones.lLetterUnveiled && maybeStartLetterOffscreenArrow(inst, inst.lLetter)
    zones.wZone && maybeStartLetterOffscreenArrow(inst, inst.wLetter)
    //
    // First visit: hold hints until the camera intro zoom-out finishes and a
    // short beat passes so the player sees the full level first.
    //
    const deferGlowIntro = !zones.gCollected && !get(KEY_INTRO_SHOWN, false)
    inst.pendingGlowIntro = deferGlowIntro
    inst.pendingReplayIntro2 = spawnOnBranch && !zones.gCollected && get(KEY_INTRO_SHOWN, false)
    inst.introHintDelayRemaining = 0
    !deferGlowIntro && !inst.pendingReplayIntro2 && inst.heroSpawnFade <= 0 &&
      startGlowIntro(inst)
    createSmallHeroTooltip(inst)
    syncGlowHudLetterFills(inst, false)
    inst.letterAppearFxReady = true
    k.onSceneLeave(() => {
      persistGlowFragmentKeysOnLeave(inst)
      stopGlowLetterDialogMusic(inst)
      inst.trampShallowHint && Tooltip.destroy(inst.trampShallowHint)
    })
    registerGlowNativeTeardown(() => {
      persistGlowFragmentKeysOnLeave(inst)
      stopGlowLoopAudio()
    })
    fragmentsPersisted && restoreGlowFragmentHud(inst)
    k.onKeyPress('escape', () => {
      if (inst.dialogOpen) return
      goToMenuAfterAssets(k)
    })
    k.onDraw(() => onDraw(inst))
    k.onUpdate(() => onUpdate(inst))
    createPlayfieldFrameOverlay(k, inst)
    //
    // Dev-only hook for automated wood-foot-particle verification.
    //
    import.meta.env.DEV && (window.__glowFootTest = {
      peek: () => ({
        footParticleCount: inst.footParticles?.particles?.length ?? 0,
        footSpawnTotal: window.__glowFootSpawnTotal || 0,
        heroDustSpawns: window.__heroDustSpawns || 0,
        surface: detectGlowSurface(inst),
        flatDecor: isGlowFlatSingleDecorColor(inst),
        footY: (inst.heroInst?.character?.pos?.y ?? 0) + SURFACE_DETECT_Y,
        allowFootBurst: canSpawnGlowFootBurst(inst, inst.heroInst?.character),
        onWood: isGlowWoodFootPosition(
          inst,
          inst.heroInst?.character?.pos?.x ?? 0,
          (inst.heroInst?.character?.pos?.y ?? 0) + SURFACE_DETECT_Y,
          inst.heroInst?.character
        ),
        onMainGround: isOnGlowMainGroundFoot(
          (inst.heroInst?.character?.pos?.y ?? 0) + SURFACE_DETECT_Y
        ),
        kaplayObjCount: inst.k.get('*').length
      })
    })
}
//
// Fixed overlay drawn on top of every world layer so nothing bleeds into the
// HUD bar, side margins, bottom strip or outside the rounded window.
//
function createPlayfieldFrameOverlay(k, inst) {
  k.add([
    k.pos(0, 0),
    k.z(CFG.visual.zIndex.ui - 1),
    {
      fixed: true,
      draw() {
        isOuterFrameVisible(inst.zones)
          ? drawPlayfieldTopBar(inst)
          : drawPlayfieldVoidTopBar(inst)
      }
    }
  ])
  k.add([
    k.pos(0, 0),
    k.z(CFG.visual.zIndex.ui + 25),
    {
      fixed: true,
      draw() {
        isOuterFrameVisible(inst.zones)
          ? drawPlayfieldSideChrome(inst)
          : drawPlayfieldVoidSideChrome(inst)
      }
    }
  ])
  k.add([
    k.pos(0, 0),
    k.z(CFG.visual.zIndex.ui + 15),
    {
      fixed: true,
      draw() {
        drawLetterOffscreenArrow(inst)
      }
    }
  ])
}
//
// Void top strip before the outer frame is revealed (matches playfield void).
//
function drawPlayfieldVoidTopBar(inst) {
  const k = inst.k
  const voidColor = k.rgb(VOID.r, VOID.g, VOID.b)
  k.drawRect({ pos: k.vec2(0, 0), width: SCREEN_W, height: PLAYFIELD_TOP_Y + TOP_MARGIN, color: voidColor, fixed: true })
}
//
// Void side and bottom pillarbox before the outer frame is revealed. Both
// the top and bottom bars reach all the way to their real screen edge so a
// taller-than-design window's extra letterbox padding is covered too.
//
function drawPlayfieldVoidSideChrome(inst) {
  const k = inst.k
  const voidColor = k.rgb(VOID.r, VOID.g, VOID.b)
  k.drawRect({ pos: k.vec2(0, PLAYFIELD_BOTTOM_Y), width: SCREEN_W, height: SCREEN_H - PLAYFIELD_BOTTOM_Y, color: voidColor, fixed: true })
  k.drawRect({ pos: k.vec2(0, PLAYFIELD_TOP_Y + TOP_MARGIN), width: LEFT_MARGIN, height: VIEW_H, color: voidColor, fixed: true })
  k.drawRect({
    pos: k.vec2(SCREEN_W - RIGHT_MARGIN, PLAYFIELD_TOP_Y + TOP_MARGIN),
    width: RIGHT_MARGIN,
    height: VIEW_H,
    color: voidColor,
    fixed: true
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
  if (inst.heroSpawnFade > 0) return
  //
  // Replays after a death skip the greeting: only the goal reminder shows,
  // controls stay free and the G letter is visible right away.
  //
  if (get(KEY_INTRO_SHOWN, false)) {
    finishGlowIntro(inst)
    //
    // Post-death reminder: timer, Space/Esc, or walking 80 px away. Jump
    // dismissal stays off so the respawn landing itself can't wipe it instantly.
    //
    HeroHint.show(inst.heroHint, HINT_INTRO_2_TEXT, HINT_INTRO_2_DURATION, {
      dismissOnJump: false,
      dismissDistance: GLOW_HINT_DISMISS_DISTANCE,
      dismissHorizontalOnly: true,
      movementDismissGrace: GLOW_HINT_MOVEMENT_DISMISS_GRACE,
      forceAbove: true
    })
    let replayHintDismissed = false
    const dismissReplay = () => {
      if (replayHintDismissed) return
      replayHintDismissed = true
      replayClick.cancel()
      dismissReplayIntroHint(inst, replayKeys)
    }
    const replayKeys = ['space', ...CFG.controls.backToMenu]
      .map(key => inst.k.onKeyPress(key, dismissReplay))
    const replayClick = bindPointerActivate(inst.k, dismissReplay)
    return
  }
  inst.introLock = true
  inst.introStep = 1
  inst.introHintPhase = INTRO_HINT_PHASE_ONE
  inst.introHintPause = 0
  const introCancels = []
  const cancelIntroInput = () => {
    introCancels.forEach(h => h.cancel())
    introCancels.length = 0
  }
  HeroHint.show(inst.heroHint, HINT_INTRO_1_TEXT, HINT_INTRO_1_DURATION, {
    dismissOnJump: false,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE,
    dismissHorizontalOnly: true,
    movementDismissGrace: GLOW_HINT_MOVEMENT_DISMISS_GRACE,
    forceAbove: true
  })
  const finishIntroChain = () => {
    cancelIntroInput()
    inst.introLock && finishGlowIntro(inst)
  }
  inst.introHintOnComplete = finishIntroChain
  //
  // Space / Enter or click advances: 1st → hint 2, 2nd → unlock (timers still work)
  //
  const advance = (key) => {
    INTRO_ADVANCE_KEY_NAMES.includes(key) && advanceGlowIntro(inst, { cancel: cancelIntroInput })
  }
  introCancels.push(inst.k.onKeyPress(advance))
  introCancels.push(bindPointerActivate(inst.k, advance))
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
function advanceGlowIntro(inst, introHandlers) {
  if (!inst.introLock) {
    introHandlers.cancel()
    return
  }
  if (inst.introHintPhase === INTRO_HINT_PHASE_TWO) {
    introHandlers.cancel()
    HeroHint.clear(inst.heroHint)
    finishGlowIntro(inst)
    return
  }
  if (inst.introHintPhase === INTRO_HINT_PHASE_PAUSE) {
    inst.introHintPause = 0
    showGlowIntroSecondHint(inst)
    return
  }
  if (inst.introStep === 1) {
    const onSecondHint = inst.heroHint?.target?.text === HINT_INTRO_2_TEXT
    if (onSecondHint) {
      introHandlers.cancel()
      HeroHint.clear(inst.heroHint)
      finishGlowIntro(inst)
      return
    }
    inst.introStep = 2
    HeroHint.clear(inst.heroHint)
    showGlowIntroSecondHint(inst)
    return
  }
  introHandlers.cancel()
  HeroHint.clear(inst.heroHint)
  finishGlowIntro(inst)
}
//
// Shows the second intro speech bubble and marks the intro phase.
//
function showGlowIntroSecondHint(inst) {
  inst.introHintPhase = INTRO_HINT_PHASE_TWO
  inst.introHintPause = 0
  HeroHint.show(inst.heroHint, HINT_INTRO_2_TEXT, HINT_INTRO_2_DURATION, {
    dismissOnJump: false,
    forceAbove: true,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE,
    dismissHorizontalOnly: true,
    movementDismissGrace: GLOW_HINT_MOVEMENT_DISMISS_GRACE
  })
}
//
// Unlocks the hero and shows the G letter after the intro hints.
//
function finishGlowIntro(inst) {
  set(KEY_INTRO_SHOWN, true)
  inst.introLock = false
  inst.introHintPhase = null
  inst.introHintPause = 0
  inst.introHintOnComplete = null
  inst.heroInst.controlsDisabled = false
  inst.heroInst.jumpDisabled = false
  inst.heroInst.controllable = true
  //
  // G letter appears only after the three gray world parts were explored.
  //
  maybeShowGLetter(inst)
}
//
// After G: left/right nudge toward the L letter or log platform.
//
function heroTooltipAfterG(inst) {
  const targetX = inst.lLetter && !inst.lLetter.main.hidden
    ? inst.lLetter.x
    : (inst.lPlatHome ? inst.lPlatHome.x + LOG_W * 0.5 : null)
  const heroX = inst.heroInst?.character?.pos?.x
  if (targetX == null || heroX == null) return HERO_TOOLTIP_AFTER_G_RIGHT
  if (heroX < targetX) return HERO_TOOLTIP_AFTER_G_RIGHT
  //
  // Once the L letter is on screen the left nudge is no longer needed.
  //
  if (inst.zones.lLetterUnveiled) return null
  return HERO_TOOLTIP_AFTER_G_LEFT
}
//
// Picks the hero tooltip line matching how much colour the world shows.
//
function heroTooltipText(inst) {
  if (inst.trampWalk?.walked) return HERO_TOOLTIP_AFTER_TRAMP_WALK
  if (isTrampSingCountdownActive(inst)) return null
  if (inst.zones.oCollected || inst.zones.colorWorld) return HERO_TOOLTIP_AFTER_O
  if (inst.zones.lCollected) return inst.meditation?.countdown != null ? null : HERO_TOOLTIP_AFTER_L
  if (inst.zones.gCollected) return heroTooltipAfterG(inst)
  if (get(KEY_INTRO_SHOWN, false)) {
    return HERO_TOOLTIP_TEXT_GRAY_QUIET
  }
  return HERO_TOOLTIP_TEXT_GRAY_QUIET
}
//
// Hero hover bubble stays off while any other hint is on the hero.
//
function isGlowHeroHoverTooltipVisible(inst) {
  if (inst.drowning || inst.dialogOpen) return false
  if (inst.heroSpawnFade > 0 || inst.pendingGlowIntro) return false
  if (inst.introLock) return false
  if (HeroHint.isActive(inst.heroHint)) return false
  if (inst.oStuckHintTooltip) return false
  if (!heroTooltipText(inst)) return false
  return true
}
//
// True while the hero is already singing at the big mushroom (visible countdown).
//
function isTrampSingCountdownActive(inst) {
  const tw = inst.trampWalk
  return Boolean(tw && !tw.walked && tw.countdown != null)
}
//
// Resets the periodic post-letter hint timer when a letter is picked up.
//
function markLetterCollectedForProgressHint(inst) {
  inst.lastLetterCollectTime = inst.k.time()
  inst.letterProgressHintCooldown = LETTER_PROGRESS_HINT_INTERVAL
}
//
// Every 30 s after a letter pickup, bubble the same line as the hero hover
// tooltip until the next letter is collected (then the line updates).
//
function updateLetterProgressHint(inst) {
  if (inst.drowning || inst.dialogOpen || inst.introLock) return
  if (inst.pendingGlowIntro || inst.heroSpawnFade > 0) return
  const z = inst.zones
  if (!z.gCollected && !z.lCollected && !z.oCollected) return
  if (z.wCollected || inst.lastLetterCollectTime == null) return
  inst.letterProgressHintCooldown -= inst.k.dt()
  if (inst.letterProgressHintCooldown > 0) return
  inst.letterProgressHintCooldown = LETTER_PROGRESS_HINT_INTERVAL
  if (HeroHint.isActive(inst.heroHint)) return
  const text = heroTooltipText(inst)
  if (!text) return
  HeroHint.show(inst.heroHint, text, LETTER_PROGRESS_HINT_DURATION, {
    dismissOnJump: false,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE
  })
}
//
// Hover tooltips over the HUD (same bubbles as touch lesson 0): the small
// hero (fragments), the life icon (the "teacher") and the GLOW word.
// Each target only activates once its HUD element has been revealed.
//
function createSmallHeroTooltip(inst) {
  inst.worldHoverTooltip = createGlowTooltip({
    k: inst.k,
    targets: [{
      x: () => inst.heroInst?.character?.pos?.x ?? -1000,
      y: () => inst.heroInst?.character?.pos?.y ?? -1000,
      width: HERO_TOOLTIP_HOVER_SIZE,
      height: HERO_TOOLTIP_HOVER_SIZE,
      text: () => heroTooltipText(inst),
      offsetY: HERO_TOOLTIP_Y_OFFSET,
      visible: () => isGlowHeroHoverTooltipVisible(inst)
    }, {
      x: () => inst.levelIndicator?.smallHero?.character?.pos?.x ?? -1000,
      y: () => inst.levelIndicator?.smallHero?.character?.pos?.y ?? -1000,
      width: SMALL_HERO_TOOLTIP_SIZE,
      height: SMALL_HERO_TOOLTIP_SIZE,
      text: SMALL_HERO_TOOLTIP_TEXT,
      offsetY: SMALL_HERO_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => Boolean(inst.levelIndicator?.smallHeroRevealed),
      screenSpace: true
    }, {
      x: () => inst.levelIndicator?.lifeImage?.sprite?.pos?.x ?? -1000,
      y: () => inst.levelIndicator?.lifeImage?.sprite?.pos?.y ?? -1000,
      width: LIFE_TOOLTIP_SIZE,
      height: LIFE_TOOLTIP_SIZE,
      text: LIFE_TOOLTIP_TEXT,
      offsetY: LIFE_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => Boolean(inst.levelIndicator?.lifeRevealed),
      screenSpace: true
    }, {
      x: () => glowHudLetterHoverPos(inst, 0).x,
      y: () => glowHudLetterHoverPos(inst, 0).y,
      width: GLOW_HUD_LABEL_FONT_SIZE,
      height: GLOW_INDICATOR_TOOLTIP_HEIGHT,
      text: GLOW_INDICATOR_TOOLTIP_AFTER_G,
      offsetY: GLOW_INDICATOR_TOOLTIP_Y_OFFSET,
      visible: () => Boolean(inst.levelIndicator) && inst.zones.gCollected,
      screenSpace: true
    }, {
      x: () => glowHudLetterHoverPos(inst, 1).x,
      y: () => glowHudLetterHoverPos(inst, 1).y,
      width: GLOW_HUD_LABEL_FONT_SIZE,
      height: GLOW_INDICATOR_TOOLTIP_HEIGHT,
      text: GLOW_INDICATOR_TOOLTIP_AFTER_L,
      offsetY: GLOW_INDICATOR_TOOLTIP_Y_OFFSET,
      visible: () => Boolean(inst.levelIndicator) && inst.zones.lCollected,
      screenSpace: true
    }, {
      x: () => glowHudLetterHoverPos(inst, 2).x,
      y: () => glowHudLetterHoverPos(inst, 2).y,
      width: GLOW_HUD_LABEL_FONT_SIZE,
      height: GLOW_INDICATOR_TOOLTIP_HEIGHT,
      text: GLOW_INDICATOR_TOOLTIP_AFTER_O,
      offsetY: GLOW_INDICATOR_TOOLTIP_Y_OFFSET,
      visible: () => Boolean(inst.levelIndicator) && inst.zones.oCollected,
      screenSpace: true
    }, {
      x: () => inst.undergroundSkeleton?.x ?? -1000,
      y: () => skeletonTooltipBodyCenterY(inst),
      width: SKELETON_TOOLTIP_WIDTH,
      height: SKELETON_TOOLTIP_HEIGHT,
      text: SKELETON_TOOLTIP_TEXT,
      offsetY: SKELETON_TOOLTIP_Y_OFFSET,
      //
      // Skeleton sits in the left underground band, which opens with the
      // left ground — not only after the L parallax / letter.
      //
      visible: () => Boolean(inst.undergroundSkeleton) &&
        (inst.zones.groundDecorLeft || inst.zones.lZoneParallax || inst.zones.lCollected) &&
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
      x: () => inst.oLetter?.x ?? -1000,
      y: () => inst.oLetter?.y ?? -1000,
      width: O_TOOLTIP_HOVER_SIZE,
      height: O_TOOLTIP_HOVER_SIZE,
      text: O_TOOLTIP_TEXT,
      offsetY: O_TOOLTIP_Y_OFFSET,
      //
      // Only while the O letter is visible and not yet collected.
      //
      visible: () => Boolean(inst.oLetter && !inst.oLetter.main.hidden &&
        inst.zones.oZone && !inst.zones.oCollected)
    }, {
      x: () => inst.branchTrampState?.x ?? -1000,
      y: FLOOR_Y - TRAMP_TOTAL_H / 2,
      width: TRAMP_TOTAL_W,
      height: TRAMP_TOTAL_H,
      text: BRANCH_TRAMP_MARIO_HINT_TEXT,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET,
      hoverId: 'branchTrampMario',
      visible: () => isBranchTrampolineVisible(inst.zones) &&
        !inst.branchTrampWalk?.marioHintTooltip
    }]
  })
}
//
// Shows/hides the meditation countdown via the shared hero counter component.
//
function updateMeditationCounter(inst) {
  const remaining = inst.meditation?.countdown ?? inst.trampWalk?.countdown
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
  HeroCounter.update(
    inst.meditationCounter,
    String(Math.ceil(remaining)),
    char.pos.x,
    char.pos.y,
  )
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
  // Explored ground / water persist across deaths and level reloads.
  //
  const groundDecorRightLegacy = get(KEY_REVEALED_GROUND_DECOR_RIGHT, false)
  let groundRightStripMax = get(KEY_GROUND_RIGHT_STRIP_MAX, -1)
  groundDecorRightLegacy && groundRightStripMax < 0 && (groundRightStripMax = GROUND_RIGHT_STRIP_COUNT - 1)
  const groundDecorRight = groundDecorRightLegacy || groundRightStripMax >= GROUND_RIGHT_STRIP_COUNT - 1
  const waterDiscovered = get(KEY_REVEALED_WATER, false)
  const groundDecorLeft = get(KEY_REVEALED_GROUND_DECOR_LEFT, false)
  const leftShoreRock = get(KEY_LEFT_SHORE_ROCK, false) || waterDiscovered
  const branchTrampRevealed = get(KEY_BRANCH_TRAMP_REVEALED, false)
  const rightTrampRevealed = get(KEY_RIGHT_TRAMP_REVEALED, false)
  const lLetterUnveiled = get(KEY_L_LETTER_UNVEILED, false) || lCollected
  const lZoneParallax = (oCollected || get(KEY_REVEALED_O, false)) &&
    (get(KEY_REVEALED_L, false) || lCollected)
  const lZoneLit = gCollected && lCollected && (get(KEY_REVEALED_L_LIT, false) || lCollected)
  const lPlatRevealed = get(KEY_REVEALED_L_PLAT, false) || lCollected
  const oZone = gCollected && lCollected && (get(KEY_REVEALED_O, false) || oCollected)
  const wZone = gCollected && lCollected && oCollected && (get(KEY_REVEALED_W, false) || wCollected)
  const colorWorld = oCollected
  return {
    gCollected,
    lCollected,
    oCollected,
    wCollected,
    //
    // Big tree only after the hero lands on its branch. Read back from
    // KEY_REVEALED_TREE on purpose: once a real branch landing has revealed
    // it, a level restart must show it immediately again instead of forcing
    // the player to replay the reveal — the spawn-drop false-positive that
    // used to reveal it prematurely on every fresh entry is fixed at the
    // source in updateTreeRevealArm() instead.
    //
    tree: get(KEY_REVEALED_TREE, false),
    outerFrame: get(KEY_REVEALED_OUTER_FRAME, false) || lCollected,
    groundDecorRight,
    groundDecorLeft,
    groundRightStripMax,
    leftShoreRock,
    rightTrampRevealed,
    lPlatStepped: get(KEY_L_PLAT_STEPPED, false) || lCollected,
    groundDecor: groundDecorRight || groundDecorLeft,
    groundBg: get(KEY_REVEALED_GROUND_BG, false) || colorWorld,
    water: false,
    waterRocks: false,
    waterDiscovered,
    branchTrampRevealed,
    lZoneLit,
    lZoneParallax,
    lLetterUnveiled,
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
// True when a glow fragment pickup was saved on a prior visit.
//
function hasGlowPersistedFragments() {
  return get(KEY_BONUS_COLLECTED, false) || get(KEY_PIT_BONUS, false)
}
//
// Reveals the small-hero HUD row and syncs the saved fragment count.
//
function restoreGlowFragmentHud(inst) {
  if (!inst?.levelIndicator || !hasGlowPersistedFragments()) return
  LevelIndicator.revealSmallHeroHud(inst.levelIndicator)
  inst.levelIndicator.updateHeroScore?.(get('heroScore', 0))
  tintGlowHudScoreGrey(inst.levelIndicator, !inst.zones.colorWorld)
  syncGlowFpsHudVisibility(inst)
}
//
// Persists fragment storage keys before scene leave or native engine teardown.
//
function persistGlowFragmentKeysOnLeave(inst) {
  persistGlowLastSpawn(inst)
  persistTrampWalk(inst)
  persistHudLetterFills(inst)
  inst.bonusHeroInst?.collected && BonusHero.finalizeCollection(inst.bonusHeroInst)
  inst.pit?.pitBonus?.collected && BonusHero.finalizeCollection(inst.pit.pitBonus)
}
//
// Remembers how far the right trampoline has walked after singing, so a
// reload or menu exit keeps it at that spot instead of snapping home.
//
function persistTrampWalk(inst) {
  const state = inst.trampState
  const tw = inst.trampWalk
  if (!state || !tw) return
  set(KEY_TRAMP_WALK_X, state.x)
  set(KEY_TRAMP_WALK_SING_COUNT, tw.singCount || 0)
  set(KEY_TRAMP_WALKED, Boolean(tw.walked))
}
//
// Remembers whether the hero was on the start branch or the ground so the
// next visit can resume at the same place (menu exit or level reload).
//
function persistGlowLastSpawn(inst) {
  const char = inst.heroInst?.character
  if (!char?.pos || inst.drowning) return
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (isHeroOverStartBranchX(inst, heroX) &&
    footY <= inst.startBranch.y + LOG_SNAP_STANDING_MAX) {
    set(KEY_LAST_SPAWN_MODE, SPAWN_MODE_BRANCH)
    set(KEY_LAST_SPAWN_X, heroX)
    return
  }
  if (footY <= FLOOR_Y + LOG_SNAP_STANDING_MAX) {
    set(KEY_LAST_SPAWN_MODE, SPAWN_MODE_GROUND)
    set(KEY_LAST_SPAWN_X, heroX)
  }
}
//
// Pins the GLOW HUD letters to screen space so they stay under the top bar
// while the world camera scrolls.
//
function pinGlowHudFixed(indicator) {
  if (!indicator) return
  const pin = (obj) => obj?.exists?.() && (obj.fixed = true)
  indicator.letterObjects?.forEach(pin)
  indicator.letterOutlineObjects?.forEach(pin)
  indicator.scoreboardNodes?.forEach(pin)
  indicator.smallHero?.character && pin(indicator.smallHero.character)
}
//
// Pins and lays out the FPS counter between GLOW and the small hero HUD.
//
function layoutGlowFpsHud(inst) {
  const fps = inst.fpsCounter
  if (!fps) return
  FpsCounter.pinScreenFixed(fps)
  const glowRight = GLOW_HUD_LABEL_START_X +
    GLOW_HUD_LETTER_COUNT * GLOW_HUD_LABEL_FONT_SIZE +
    (GLOW_HUD_LETTER_COUNT - 1) * GLOW_HUD_LABEL_LETTER_SPACING
  const slotLeft = glowRight + GLOW_HUD_FPS_SLOT_GAP
  const heroHud = inst.levelIndicator?.smallHero?.character
  const slotRight = heroHud?.pos
    ? heroHud.pos.x - GLOW_HUD_SMALL_HERO_HALF_W - GLOW_HUD_FPS_SLOT_GAP
    : inst.k.width() - RIGHT_MARGIN - 180
  const centerX = (slotLeft + Math.max(slotLeft + 40, slotRight)) / 2
  FpsCounter.layoutAtScreenCenterX(fps, centerX)
}
//
// Creates the GLOW HUD row. G starts as a five-part loader until collected.
//
function createGlowLevelIndicator(k, goldRgb, completedLetters, colorWorld = false) {
  //
  // The HUD small hero mirrors the playable hero exactly: whitish body with
  // grey eye whites before O, gold inside once the world colours.
  //
  const indicator = LevelIndicator.create({
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
    sectionLabelY: GLOW_HUD_LABEL_TOP_Y,
    sectionLabelCompletedLetters: completedLetters,
    hideScoreboard: true,
    hideInactiveLetterShadow: true,
    scoreboardGreyLife: false,
    greyLife: !colorWorld,
    lifeGreyTintHex: GLOW_PAL.decorGray
  })
  pinGlowHudFixed(indicator)
  LevelIndicator.syncLifeHudGrey(indicator, !colorWorld)
  tintGlowHudScoreGrey(indicator, !colorWorld)
  return indicator
}
//
// Screen-space centre of one GLOW HUD glyph, using the live letter box so
// the tooltip ear leaves the middle of the character rather than its cell.
//
function glowHudLetterHoverPos(inst, index) {
  const letter = inst.levelIndicator?.letterObjects?.[index]
  if (letter?.exists?.()) {
    const measuredW = letter.width || 0
    const w = measuredW > 0 && measuredW < GLOW_HUD_LABEL_FONT_SIZE
      ? measuredW
      : GLOW_HUD_LABEL_FONT_SIZE * 0.6
    return {
      x: letter.pos.x + w / 2,
      y: letter.pos.y + GLOW_HUD_LABEL_FONT_SIZE / 2
    }
  }
  return {
    x: glowHudLetterCenterX(index),
    y: GLOW_HUD_FPS_TOP_Y
  }
}
//
// Screen-space centre of one GLOW HUD letter cell (G=0, L=1, O=2, W=3).
//
function glowHudLetterCenterX(index) {
  return GLOW_HUD_LABEL_START_X +
    index * (GLOW_HUD_LABEL_FONT_SIZE + GLOW_HUD_LABEL_LETTER_SPACING) +
    GLOW_HUD_LABEL_FONT_SIZE / 2
}
//
// Score numerals match the monochrome world gray until colour arrives.
//
function tintGlowHudScoreGrey(indicator, grey) {
  if (!indicator) return
  const c = grey ? DECOR_GRAY : HUD_SCORE_COLOR_SETTLED
  const rgb = indicator.k.rgb(c.r, c.g, c.b)
  indicator.heroScoreText && (indicator.heroScoreText.color = rgb)
  indicator.lifeScoreText && (indicator.lifeScoreText.color = rgb)
}
//
// How many of the five gray-world map parts are open (3 tree landings,
// left ground, right ground). Caps at GLOW_HUD_G_FILL_PARTS.
//
function countGlowHudGFillParts(inst) {
  const z = inst.zones
  if (z?.gCollected) return GLOW_HUD_G_FILL_PARTS
  const treeParts = (z?.tree || inst.treeDrawMonolith)
    ? TreeSegments.TREE_REVEAL_PART_COUNT
    : Math.min(TreeSegments.TREE_REVEAL_PART_COUNT, inst.treeSegmentRevealed?.size || 0)
  const leftPart = z?.groundDecorLeft ? 1 : 0
  const rightPart = (z?.groundRightStripMax ?? -1) >= 0 ? 1 : 0
  return Math.min(GLOW_HUD_G_FILL_PARTS, treeParts + leftPart + rightPart)
}
//
// L HUD fill: half when the right trampoline appears, full on the L log.
//
function countGlowHudLFillParts(inst) {
  const z = inst.zones
  if (z?.lCollected || z?.lPlatStepped) return GLOW_HUD_L_FILL_PARTS
  return z?.rightTrampRevealed ? 1 : 0
}
//
// O HUD fill: one tenth per second of the closed-eye meditation timer.
// A broken countdown wipes the letter back to gray until it finishes.
//
function countGlowHudOFillParts(inst) {
  const z = inst.zones
  if (z?.oCollected || z?.oZone) return GLOW_HUD_O_FILL_PARTS
  const countdown = inst.meditation?.countdown
  if (countdown == null) return 0
  const elapsed = MEDITATION_COUNTDOWN - Math.max(0, countdown)
  return Math.min(GLOW_HUD_O_FILL_PARTS, Math.floor(elapsed + 1e-6))
}
//
// W HUD fill: one third per post-O sing that walks the right trampoline.
//
function countGlowHudWFillParts(inst) {
  const z = inst.zones
  if (z?.wCollected || inst.trampWalk?.walked) return GLOW_HUD_W_FILL_PARTS
  return Math.min(GLOW_HUD_W_FILL_PARTS, inst.trampWalk?.singCount || 0)
}
//
// Opaque-pixel box of a HUD glyph, so gold bands follow the letter ink.
//
function hudLetterInkBox(ch) {
  if (hudLetterInkBoxCache[ch]) return hudLetterInkBoxCache[ch]
  const size = GLOW_HUD_LABEL_FONT_SIZE
  const canvas = toCanvas({ width: size, height: size, pixelRatio: 1 }, (ctx) => {
    ctx.font = `${size}px ${CFG.visual.fonts.thinFull}`
    ctx.textBaseline = 'top'
    ctx.textAlign = 'left'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(ch, 0, 0)
  })
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const image = ctx.getImageData(0, 0, size, size)
  const px = image.data
  let minX = size
  let minY = size
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      if (px[(y * size + x) * 4 + 3] < GLOW_HUD_INK_ALPHA_MIN) continue
      x < minX && (minX = x)
      y < minY && (minY = y)
      x > maxX && (maxX = x)
      y > maxY && (maxY = y)
    }
  }
  canvas.width = 0
  canvas.height = 0
  const box = maxX >= minX
    ? { x: minX, y: minY, w: maxX - minX + 1, h: maxY - minY + 1 }
    : { x: 0, y: 0, w: size * 0.55, h: size * 0.72 }
  hudLetterInkBoxCache[ch] = box
  return box
}
//
// Gold overlay clipped to the bottom n/parts of the HUD letter cell.
// Bands are equal slices of the live glyph box so fill grows from the
// visual foot of the letter upward — the last band is the top, not the base.
//
function drawHudLetterGoldFill(k, letter, ch, n, parts) {
  if (!letter?.exists?.() || n <= 0) return
  const gold = glowRgb('gold')
  const ink = hudLetterInkBox(ch)
  const letterH = letter.height || GLOW_HUD_LABEL_FONT_SIZE
  const fillH = Math.max(1, Math.round(letterH * n / parts))
  k.drawMasked(() => {
    k.drawText({
      text: ch,
      pos: k.vec2(letter.pos.x, letter.pos.y),
      size: GLOW_HUD_LABEL_FONT_SIZE,
      font: GLOW_HUD_LABEL_FONT,
      color: k.rgb(gold.r, gold.g, gold.b),
      align: 'left',
      anchor: 'topleft'
    })
  }, () => {
    k.drawRect({
      pos: k.vec2(
        letter.pos.x + ink.x - GLOW_HUD_FILL_CLIP_PAD,
        letter.pos.y + letterH - fillH
      ),
      width: ink.w + GLOW_HUD_FILL_CLIP_PAD * 2,
      height: fillH
    })
  })
}
//
// Full loader: paint the live HUD glyph gold so every ink pixel fills.
// Partial loader: keep it gray — the gold bands are the clipped overlay.
//
function tintHudLetterByFill(k, letter, n, parts) {
  if (!letter?.exists?.()) return
  const fill = n >= parts ? glowRgb('gold') : glowRgb('decorGray')
  letter.color = k.rgb(fill.r, fill.g, fill.b)
}
//
// Applies G/L/O/W loader tints during update, before the HUD letters draw.
//
function tintGlowHudLoaderLetters(inst) {
  const letters = inst.levelIndicator?.letterObjects
  const k = inst.k
  if (!letters || !k) return
  !inst.zones.gCollected && tintHudLetterByFill(
    k, letters[0], inst._hudGFillParts || 0, GLOW_HUD_G_FILL_PARTS
  )
  !inst.zones.lCollected && tintHudLetterByFill(
    k, letters[1], inst._hudLFillParts || 0, GLOW_HUD_L_FILL_PARTS
  )
  !inst.zones.oCollected && tintHudLetterByFill(
    k, letters[2], inst._hudOFillParts || 0, GLOW_HUD_O_FILL_PARTS
  )
  !inst.zones.wCollected && tintHudLetterByFill(
    k, letters[3], inst._hudWFillParts || 0, GLOW_HUD_W_FILL_PARTS
  )
}
//
// Paints partial G, L, O and W gold bands over the gray HUD letters.
// Complete fill is the letter's own gold tint from tintGlowHudLoaderLetters.
//
function drawGlowHudLetterFills(inst) {
  if (inst.hudLetterFillDrawer?.hidden) return
  const indicator = inst.levelIndicator
  if (!indicator) return
  const k = inst.k
  const letters = indicator.letterObjects
  const gParts = inst._hudGFillParts || 0
  const lParts = inst._hudLFillParts || 0
  const oParts = inst._hudOFillParts || 0
  const wParts = inst._hudWFillParts || 0
  !inst.zones.gCollected && gParts > 0 && gParts < GLOW_HUD_G_FILL_PARTS &&
    drawHudLetterGoldFill(k, letters?.[0], 'G', gParts, GLOW_HUD_G_FILL_PARTS)
  !inst.zones.lCollected && lParts > 0 && lParts < GLOW_HUD_L_FILL_PARTS &&
    drawHudLetterGoldFill(k, letters?.[1], 'L', lParts, GLOW_HUD_L_FILL_PARTS)
  !inst.zones.oCollected && oParts > 0 && oParts < GLOW_HUD_O_FILL_PARTS &&
    drawHudLetterGoldFill(k, letters?.[2], 'O', oParts, GLOW_HUD_O_FILL_PARTS)
  !inst.zones.wCollected && wParts > 0 && wParts < GLOW_HUD_W_FILL_PARTS &&
    drawHudLetterGoldFill(k, letters?.[3], 'W', wParts, GLOW_HUD_W_FILL_PARTS)
}
//
// Hides the gold-band HUD drawer once every letter is fully filled or collected.
//
function syncGlowHudLetterFillDrawerHidden(inst) {
  const drawer = inst.hudLetterFillDrawer
  if (!drawer) return
  const z = inst.zones
  const g = !z.gCollected && (inst._hudGFillParts || 0) > 0 && (inst._hudGFillParts || 0) < GLOW_HUD_G_FILL_PARTS
  const l = !z.lCollected && (inst._hudLFillParts || 0) > 0 && (inst._hudLFillParts || 0) < GLOW_HUD_L_FILL_PARTS
  const o = !z.oCollected && (inst._hudOFillParts || 0) > 0 && (inst._hudOFillParts || 0) < GLOW_HUD_O_FILL_PARTS
  const w = !z.wCollected && (inst._hudWFillParts || 0) > 0 && (inst._hudWFillParts || 0) < GLOW_HUD_W_FILL_PARTS
  drawer.hidden = !(g || l || o || w)
}
//
// Keeps a screen-space drawer above the HUD letters.
//
function ensureGlowHudLetterFillDrawer(inst) {
  if (inst.hudLetterFillDrawer?.exists?.()) return
  inst.hudLetterFillDrawer = inst.k.add([
    inst.k.pos(0, 0),
    inst.k.fixed(),
    inst.k.z(CFG.visual.zIndex.ui + 1),
    { draw() { drawGlowHudLetterFills(inst) } }
  ])
}
//
// Highest fill count from the live world and the last saved visit.
//
function resolvedHudFillParts(worldParts, key, maxParts) {
  const saved = Number(get(key, 0)) || 0
  return Math.min(maxParts, Math.max(worldParts, saved))
}
//
// Writes G/L/W loader progress so a menu exit keeps the yellow bands.
//
function persistHudLetterFills(inst) {
  if (!inst) return
  inst._hudGFillParts != null && set(KEY_HUD_G_FILL, inst._hudGFillParts)
  inst._hudLFillParts != null && set(KEY_HUD_L_FILL, inst._hudLFillParts)
  inst._hudWFillParts != null && set(KEY_HUD_W_FILL, inst._hudWFillParts)
}
//
// Follows the live meditation timer for the HUD O loader. Not persisted —
// a broken countdown returns the letter to gray.
//
function syncGlowHudOFill(inst, burst = true) {
  const indicator = inst.levelIndicator
  if (!indicator) return
  ensureGlowHudLetterFillDrawer(inst)
  const oParts = countGlowHudOFillParts(inst)
  const prevO = inst._hudOFillParts
  inst._hudOFillParts = oParts
  tintGlowHudLoaderLetters(inst)
  burst && prevO != null && oParts > prevO &&
    LevelIndicator.flashLetterBurst(indicator, 3)
  syncGlowHudLetterFillDrawerHidden(inst)
}
//
// GLOW HUD word appears with the first yellow G fill, or once G is collected.
//
function syncGlowHudLabelVisibility(inst) {
  const indicator = inst.levelIndicator
  if (!indicator) return
  const show = inst.zones.gCollected || (inst._hudGFillParts || 0) > 0
  LevelIndicator.setSectionLabelHidden(indicator, !show)
}
//
// Updates G/L/W fill counts and flashes a HUD letter when a new band opens.
//
function syncGlowHudLetterFills(inst, burst = true) {
  const indicator = inst.levelIndicator
  if (!indicator) return
  ensureGlowHudLetterFillDrawer(inst)
  const gParts = resolvedHudFillParts(
    countGlowHudGFillParts(inst), KEY_HUD_G_FILL, GLOW_HUD_G_FILL_PARTS
  )
  const lParts = resolvedHudFillParts(
    countGlowHudLFillParts(inst), KEY_HUD_L_FILL, GLOW_HUD_L_FILL_PARTS
  )
  const wParts = resolvedHudFillParts(
    countGlowHudWFillParts(inst), KEY_HUD_W_FILL, GLOW_HUD_W_FILL_PARTS
  )
  const prevG = inst._hudGFillParts
  const prevL = inst._hudLFillParts
  const prevW = inst._hudWFillParts
  inst._hudGFillParts = gParts
  inst._hudLFillParts = lParts
  inst._hudWFillParts = wParts
  persistHudLetterFills(inst)
  syncGlowHudOFill(inst, burst)
  tintGlowHudLoaderLetters(inst)
  syncGlowHudLabelVisibility(inst)
  burst && prevG != null && gParts > prevG &&
    LevelIndicator.flashLetterBurst(indicator, 1)
  burst && prevL != null && lParts > prevL &&
    LevelIndicator.flashLetterBurst(indicator, 2)
  burst && prevW != null && wParts > prevW &&
    LevelIndicator.flashLetterBurst(indicator, 4)
  syncGlowHudLetterFillDrawerHidden(inst)
}
//
// Starts the Glow birds ambient at level entry.
//
function startBirdsMusic(birdsMusic, zones) {
  const life = zones?.oZone || zones?.oCollected ? 1 : 0
  birdsMusic.paused = life < 0.02
  birdsMusic.volume = life < 0.02 ? 0 : CFG.audio.backgroundMusic.birds
}
//
// Emits the same continuous background ambience the menu scene plays while
// hovering an anti-hero (Sound.startAmbient's drone + noise pad) near still-
// hidden discovery spots. Only the horizontal distance to the nearest spot's
// centre matters: within GLOW_PROXIMITY_SOUND_RADIUS px to either side the
// current grows into a steady stream the closer the hero walks to the centre
// X, and fades back to silence outside that band. The right mushroom's spot
// is excluded from the target list until G is collected.
//
function updateGlowProximitySound(inst, char) {
  if (inst.dialogOpen || inst.drowning || inst.sound?._glowSfxMuted || !char?.pos) {
    Sound.stopAmbient(inst.sound)
    return
  }
  const targetXs = []
  //
  // The right mushroom stays silent until G is collected — before that its
  // spot isn't a discoverable secret yet, it's just empty ground.
  //
  inst.zones.gCollected && !inst.zones.rightTrampRevealed &&
    appendGlowProximityTarget(targetXs, inst.trampState?.x)
  !inst.zones.branchTrampRevealed && appendGlowProximityTarget(targetXs, inst.branchTrampState?.x)
  if (!inst.pit?.collapsed) {
    const cave = getCrackZone(WORLD_W, FLOOR_Y)
    appendGlowProximityTarget(targetXs, (cave.x1 + cave.x2) * 0.5)
  }
  if (!targetXs.length) {
    Sound.stopAmbient(inst.sound)
    return
  }
  let nearestDistance = Infinity
  for (const targetX of targetXs) {
    nearestDistance = Math.min(nearestDistance, Math.abs(char.pos.x - targetX))
  }
  if (nearestDistance >= GLOW_PROXIMITY_SOUND_RADIUS) {
    Sound.stopAmbient(inst.sound)
    return
  }
  const proximity = 1 - nearestDistance / GLOW_PROXIMITY_SOUND_RADIUS
  !Sound.isAmbientPlaying(inst.sound) && Sound.startAmbient(inst.sound)
  Sound.setAmbientVolume(inst.sound, GLOW_PROXIMITY_SOUND_MAX_VOLUME * proximity)
}
//
// Adds a valid hidden discovery point's centre X to the proximity-sound
// target list.
//
function appendGlowProximityTarget(targetXs, x) {
  x != null && targetXs.push(x)
}
//
// Returns the visual centre of the buried skeleton body, not the skull pivot.
//
function skeletonTooltipBodyCenterY(inst) {
  const skeleton = inst.undergroundSkeleton
  return skeleton ? skeleton.y + skeleton.skullR * SKELETON_TOOLTIP_BODY_CENTER_R : -1000
}
//
// Soft birds swell with the post-L meditation world-life fade (0 → full while
// the stillness countdown runs, back to silent when movement breaks it).
//
function updateMeditationBirds(inst) {
  syncGlowWorldBirdsVolume(inst)
}
//
// Keeps birds silent during the post-L stillness wait, then fades them in
// with meditationWorldLife while the countdown runs.
//
function syncGlowWorldBirdsVolume(inst) {
  const birds = inst.birdsMusic
  if (!birds) return
  const life = glowMeditationWorldLife(inst)
  if (life < 0.02) {
    birds.volume = 0
    birds.paused = true
    inst.meditationBirdsActive = false
    return
  }
  birds.paused = false
  birds.volume = CFG.audio.backgroundMusic.birds * life
  inst.meditationBirdsActive = true
}
//
// Mutes the meditation swell (timer interrupted or O already claimed)
//
function stopMeditationBirds(inst) {
  if (!inst.meditationBirdsActive) return
  inst.meditationBirdsActive = false
  if (inst.zones.oCollected) return
  const birds = inst.birdsMusic
  if (!birds) return
  birds.volume = 0
  birds.paused = true
}
//
// True once the permanent colour world has finished fading in.
//
function isColorWorldSettled(inst) {
  const z = inst.zones
  return Boolean(z.colorWorld && (inst.colorFade ?? 0) >= 1 && (inst.parallaxFade ?? 0) >= 1)
}
//
// Hermite ease for meditation colour preview (0 at start, 1 at timer zero).
//
function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}
//
// Linear countdown progress while the post-L stillness timer runs.
//
function meditationCountdownLinear(inst) {
  const remaining = inst.meditation?.countdown
  if (remaining == null) return 0
  return 1 - Math.max(0, remaining) / MEDITATION_COUNTDOWN
}
//
// Colour preview progress while the post-L stillness countdown runs (0 at
// start, 1 when the timer hits zero).
//
function meditationCountdownFade(inst) {
  return smoothstep01(meditationCountdownLinear(inst))
}
//
// Clamped colour-fade value shared by every gray↔colour crossfade.
//
function glowDecorFade(inst) {
  return Math.max(0, Math.min(1, inst?.colorFade ?? 0))
}
//
// True while the post-L stillness countdown drives the colour preview.
//
function isGlowMeditationColorPreview(inst) {
  const z = inst?.zones
  if (!z) return false
  return Boolean(inst.meditation?.countdown != null && !z.colorWorld && !z.oCollected)
}
//
// True while any decor/backdrop layer is still lerping toward full colour.
//
function isGlowColorTransitionActive(inst) {
  if (!inst?.zones) return false
  const fade = glowDecorFade(inst)
  if (fade <= COLOR_CROSSFADE_EPS) return false
  if (inst.zones.colorWorld && fade >= 1 - COLOR_CROSSFADE_EPS) return false
  return isGlowMeditationColorPreview(inst) || Boolean(inst._meditationPreviewFadingOut) ||
    (inst.zones.colorWorld && fade < 1)
}
//
// Drives parallax + warm haze from the live meditation countdown.
//
function syncMeditationColorFade(inst) {
  const z = inst.zones
  if (z.colorWorld || z.oCollected) return
  inst._meditationPreviewFadingOut = false
  const fade = meditationCountdownLinear(inst)
  inst.colorFade = fade
  inst.parallaxFade = fade
  inst.colorFadeTarget = fade
  inst._meditationParallaxPreview = fade > 0.001
  z.lZoneParallax = fade > 0.001 || z.oZone
  syncTreeColorCrossfade(inst)
}
//
// Eases the meditation colour preview back to gray when stillness breaks.
//
function resetMeditationColorPreview(inst) {
  const z = inst.zones
  if (z.colorWorld || z.oCollected) return
  if ((inst.colorFade ?? 0) <= 0.001 && (inst.parallaxFade ?? 0) <= 0.001) {
    finishMeditationColorPreviewReset(inst)
    return
  }
  inst._meditationPreviewFadingOut = true
  stopMeditationBirds(inst)
}
//
// Finishes the meditation preview fade-out and restores the static gray world.
//
function finishMeditationColorPreviewReset(inst) {
  const z = inst.zones
  inst._meditationParallaxPreview = false
  inst._meditationPreviewFadingOut = false
  inst.colorFade = 0
  inst.parallaxFade = 0
  inst.colorFadeTarget = 0
  if (!z.oZone) {
    z.lZoneParallax = false
  }
  inst.meditationWorldLife = 0
  stopMeditationBirds(inst)
  inst.treeDrawColorMode = false
  syncTreeColorCrossfade(inst)
}
//
// Steps the preview fade-out after a broken meditation countdown.
//
function updateMeditationPreviewFadeOut(inst, dt) {
  if (!inst._meditationPreviewFadingOut) return
  const z = inst.zones
  if (z.colorWorld || z.oCollected || inst.meditation?.countdown != null) {
    inst._meditationPreviewFadingOut = false
    return
  }
  const next = Math.max(0, (inst.colorFade ?? 0) - dt * MEDITATION_WORLD_SLEEP_SPEED)
  inst.colorFade = next
  inst.parallaxFade = next
  inst.colorFadeTarget = next
  syncTreeColorCrossfade(inst)
  next <= 0.001 && finishMeditationColorPreviewReset(inst)
}
//
// After L the world stays frozen until the hero's stillness countdown
// starts; once O opens it stays alive for the rest of the level.
//
function updateMeditationWorldLife(inst) {
  const z = inst.zones
  const m = inst.meditation
  //
  // O zone or the permanent colour world lock the world fully awake.
  //
  if (z.oZone || z.oCollected) {
    inst.meditationWorldLife = 1
    return
  }
  //
  // Countdown progress drives birds, grass sway and midges in lockstep with
  // the colour fade — no separate easing curve.
  //
  if (m?.countdown != null) {
    inst.meditationWorldLife = meditationCountdownLinear(inst)
    return
  }
  //
  // Interrupted or idle before the countdown: snap back to frozen stillness.
  //
  const target = 0
  const speed = MEDITATION_WORLD_SLEEP_SPEED
  const next = inst.meditationWorldLife + (target - inst.meditationWorldLife) *
    Math.min(1, inst.k.dt() * speed)
  inst.meditationWorldLife = Math.max(0, Math.min(1, next))
}
//
// Keeps birds silent during the post-L stillness wait, then hands off to
// updateMeditationBirds while the countdown runs.
//
function syncGlowBirdsAfterL(inst) {
  syncGlowWorldBirdsVolume(inst)
}
//
// Rebakes the walking trampoline gray sprites after L (shaded gray caps).
//
function rebakeTrampolineGraySprites(k) {
  bakeTrampolineVariant(k, TRAMP_SPRITE, CUTE_MUSH_GRAY_COLORS, true)
  bakeTrampolineVariant(k, TRAMP_SPRITE + TRAMP_BLINK_SPRITE_SUFFIX, CUTE_MUSH_GRAY_COLORS, false)
}
//
// Rebakes floor rocks with shaded silhouettes after the L letter (pre-L stays flat).
//
function rebakeGlowRockSpritesShaded(inst) {
  const k = inst.k
  const palette = {
    fillR: DECOR_GRAY.r, fillG: DECOR_GRAY.g, fillB: DECOR_GRAY.b,
    lightR: INNER_GRAY.r, lightG: INNER_GRAY.g, lightB: INNER_GRAY.b,
    darkR: VOID.r, darkG: VOID.g, darkB: VOID.b
  }
  //
  // Rebaked into a fresh shared atlas (same trick as the initial bake in
  // createGlowRocks) instead of one loadSprite per rock — otherwise every
  // rock would fall back to its own individual texture the moment L is
  // collected, undoing the shared-atlas GPU win right before the color
  // world (and its full decor reveal) even needs it most.
  //
  const rebakeAtlas = createCanvasAtlasBuilder()
  const toSwap = []
  inst.rockObjs.forEach(obj => {
    const bake = obj._rockBake
    if (!bake) return
    const { cx, cy, radius, verts, widthScale, totalW, croppedH } = bake
    const bakeShaded = () => toCanvas({ width: totalW, height: croppedH, pixelRatio: 1 }, (ctx) => {
      ctx.scale(widthScale, 1)
      drawRockToCanvas(ctx, {
        cx, cy, radius, verts, palette,
        skipShadow: true, skipTexture: true,
        outlineColor: `rgb(${ROCK_OUTLINE_RGB.r}, ${ROCK_OUTLINE_RGB.g}, ${ROCK_OUTLINE_RGB.b})`,
        outlineWidth: ROCK_OUTLINE_WIDTH,
        outlineAlpha: 1
      })
    })
    const bakedGray = rebakeAtlas.register(bakeShaded())
    const bakedOutline = rebakeAtlas.register(bakeShaded())
    toSwap.push({ obj, bakedGray, bakedOutline })
  })
  rebakeAtlas.build(k)
  toSwap.forEach(({ obj, bakedGray, bakedOutline }) => {
    obj._bakedGray = bakedGray
    obj._bakedOutline = bakedOutline
    obj.color = k.rgb(255, 255, 255)
  })
}
//
// Re-applies lake / decor visuals saved in localStorage (first visit stays bare).
//
function restorePersistedGlowZoneVisuals(inst) {
  inst.zones.waterDiscovered && revealWaterZone(inst, false)
}
//
// Shows/hides world layers and toggles platform collision from zone flags.
//
function applyZoneVisibility(inst) {
  const z = inst.zones
  const leftGroundOpen = z.groundDecorLeft
  inst.treeDrawMonolith ? syncMonolithicTreeGraySprite(inst) : syncTreeSegmentGraySprites(inst)
  inst.treeDrawMonolith ? syncMonolithicTreeColorMode(inst) : syncTreeSegmentsVisibility(inst)
  cornerObjsSetHidden(inst.cornerObjs, false)
  refreshPlayfieldCornerSprites(inst)
  //
  // Stay visible/solid forever once revealed, same as W — only hidden for
  // the caption's own duration (lPlatCaptionHiding/oPlatCaptionHiding, set/
  // cleared by collectLetterL/collectLetterO) instead of for good. Gated by
  // their own flags rather than a one-off override so any other
  // applyZoneVisibility() call firing mid-caption (hero wandering into
  // another zone trigger, etc.) can't prematurely bring the log back while
  // the caption is still up.
  //
  setPlatVisible(inst.lPlat, z.lPlatRevealed && !inst.lPlatCaptionHiding, inst.lPlatHome)
  setPlatVisible(inst.oPlat, z.oZone && !inst.oPlatCaptionHiding, inst.oPlatHome, z.lCollected)
  setPlatVisible(inst.wPlat, z.wZone, inst.wPlatHome, z.oCollected)
  setLetterVisible(inst.lLetter, z.lLetterUnveiled && !z.lCollected, inst.letterAppearFxReady)
  setLetterVisible(inst.oLetter, z.oZone && !z.oCollected, inst.letterAppearFxReady)
  setLetterVisible(inst.wLetter, z.wZone && !z.wCollected, inst.letterAppearFxReady)
  inst.trampBundle.drawLayer.hidden = !isRightTrampolineVisible(z)
  inst.branchTrampBundle.drawLayer.hidden = !isBranchTrampolineVisible(z)
  inst.rockObjs.forEach(o => {
    if (o._lakeShoreEnd) {
      //
      // Cap rocks are painted in drawLakeShoreRocksWorld so they always sit
      // above the lake fill and parallax ground band.
      //
      o.hidden = true
      o.pos.y = PLATFORM_HIDE_Y
      return
    }
    if (o._side === 'left') {
      const showLeft = o._waterCluster ? z.water : leftGroundOpen
      setDecorObjVisible(o, showLeft, inst.leftDecorFade ?? 1)
      return
    }
    const rightOp = glowRightDecorOpacity(inst, o)
    setDecorObjVisible(o, rightOp > 0.04, rightOp)
  })
  inst.mushObjs.forEach(o => {
    const wx = o._decorWorldX ?? o._homeX ?? 0
    const inLake = z._lakeX1 != null && z._lakeX2 != null && wx >= z._lakeX1 && wx <= z._lakeX2
    if (o._side === 'left') {
      setDecorObjVisible(o, leftGroundOpen && !inLake, inst.leftDecorFade ?? 1)
      return
    }
    const rightOp = glowRightDecorOpacity(inst, o)
    setDecorObjVisible(o, rightOp > 0.04 && !inLake, rightOp)
  })
  inst.grassLayer.layer.hidden = !leftGroundOpen && z.groundRightStripMax < 0
  inst.waterLayer && (inst.waterLayer.hidden = !z.water)
  rebuildWoodSurfaces(inst)
  z.water && ensureLakeShoreRocksVisible(inst)
  syncGlowMidgeDrawColor(inst)
}
//
// Shows or hides a floor decor sprite — moves off-screen when hidden so nothing
// peeks into the viewport before the zone is revealed.
//
function setDecorObjVisible(obj, visible, opacity = 1) {
  const show = visible && opacity > 0.04
  obj.hidden = !show
  if (obj._homeY != null) {
    obj.pos.y = show ? obj._homeY : PLATFORM_HIDE_Y
  }
  obj._homeX != null && show && (obj.pos.x = obj._homeX)
  obj.opacity = show ? opacity : 1
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
  const wasHidden = plat.hidden
  plat.hidden = !visible
  plat._ghostDraw = visible && !solid
  plat._homeX = home.x
  plat._homeY = home.y
  const collidable = visible && solid
  const cx = home.x + LOG_W / 2
  const cy = home.y + LOG_H / 2
  plat.pos.x = collidable ? cx : -500
  plat.pos.y = collidable ? cy : PLATFORM_HIDE_Y
  visible && wasHidden && (plat._revealFade = 0)
}
//
// Steps a freshly revealed platform's fade-in (see setPlatVisible).
//
function updatePlatformRevealFade(plat, dt) {
  if (!plat || plat._revealFade == null || plat._revealFade >= 1) return
  plat._revealFade = Math.min(1, plat._revealFade + dt / POP_REVEAL_FADE_DURATION)
}
//
// Toggles pickup letter visibility.
//
function setLetterVisible(letterEntry, visible, burst = false) {
  if (!letterEntry || letterEntry.forceVisible) return
  const wasHidden = letterEntry.main?.hidden !== false
  letterEntry.allObjects.forEach(obj => { obj.hidden = !visible })
  if (visible && wasHidden) {
    letterEntry._popFade = 0
    letterEntry.allObjects.forEach(obj => { obj.opacity = 0 })
  }
  if (visible && wasHidden && burst) {
    LevelIndicator.flashWorldLetterBurst(
      letterEntry.k,
      letterEntry.x,
      letterEntry.y,
      letterEntry.colorHex || GLOW_GOLD_HEX
    )
  }
}
//
// Steps a freshly revealed pickup letter's fade-in (see setLetterVisible).
//
function updateLetterPopFade(letterEntry, dt) {
  if (!letterEntry || letterEntry._popFade == null || letterEntry._popFade >= 1) return
  letterEntry._popFade = Math.min(1, letterEntry._popFade + dt / POP_REVEAL_FADE_DURATION)
  letterEntry.allObjects.forEach(obj => { obj.opacity = letterEntry._popFade })
}
//
// Steps every glow pickup letter's pop-in fade.
//
function updateGlowLetterPopFades(inst, dt) {
  updateLetterPopFade(inst.gLetter, dt)
  updateLetterPopFade(inst.lLetter, dt)
  updateLetterPopFade(inst.oLetter, dt)
  updateLetterPopFade(inst.wLetter, dt)
}
//
// The G pickup appears once the full tree, both lake cap rocks, left ground
// decor and at least one right ground strip were revealed in the gray world.
//
function glowThreeZonesExplored(inst) {
  const z = inst.zones
  const treeDone = z.tree && (inst.treeDrawMonolith || isAllTreeSegmentsRevealed(inst))
  return Boolean(
    treeDone &&
    z.leftShoreRock &&
    z.groundDecorLeft &&
    z.groundRightStripMax >= 0
  )
}
//
// Shows or hides the G letter from the three-zone exploration gate.
//
function maybeShowGLetter(inst) {
  if (!inst.gLetter || inst.zones.gCollected) return
  setLetterVisible(inst.gLetter, glowThreeZonesExplored(inst), inst.letterAppearFxReady)
}
//
// Applies the grayscale teacher tint only when the glow world mode changes.
//
function maybeSyncGlowLifeHudGrey(inst) {
  if (!inst.levelIndicator) return
  const wantGrey = !inst.zones.colorWorld
  const needsDesat = wantGrey && inst.levelIndicator._lifeSpriteName !== 'life-desat'
  if (inst._lifeHudGrey === wantGrey && !needsDesat) return
  inst._lifeHudGrey = wantGrey
  LevelIndicator.syncLifeHudGrey(inst.levelIndicator, wantGrey)
  tintGlowHudScoreGrey(inst.levelIndicator, wantGrey)
}
//
// Flat single decor gray until L — no per-object shades before then.
//
function isGlowFlatSingleDecorColor(inst) {
  if (!inst?.zones) return false
  const z = inst.zones
  if (z.lCollected || z.colorWorld) return false
  if ((inst.colorFade ?? 0) >= 0.5) return false
  return true
}
//
// G is collectible only when visible after the three-zone gate.
//
function isGLetterCollectable(inst) {
  return Boolean(
    inst.gLetter &&
    !inst.zones.gCollected &&
    !inst.gLetter.main.hidden &&
    glowThreeZonesExplored(inst)
  )
}
//
// Rebuilds wood-surface list for footstep/dust detection.
//
function rebuildWoodSurfaces(inst) {
  const branch = inst.woodSurfaces[0]
  const list = branch ? [branch] : []
  const z = inst.zones
  z.lPlatRevealed && list.push({ x1: inst.lPlatHome.x, x2: inst.lPlatHome.x + LOG_W, y: inst.lPlatHome.y, h: LOG_H })
  z.oZone && z.lCollected && list.push({ x1: inst.oPlatHome.x, x2: inst.oPlatHome.x + LOG_W, y: inst.oPlatHome.y, h: LOG_H })
  z.wZone && z.oCollected && list.push({ x1: inst.wPlatHome.x, x2: inst.wPlatHome.x + LOG_W, y: inst.wPlatHome.y, h: LOG_H })
  //
  // Fragment log (alive BonusHero or permanent post-collect platform)
  //
  if (inst.bonusPlatHome) {
    const bonusLive = inst.bonusHeroInst && !inst.bonusHeroInst.collected
    const bonusKeep = Boolean(inst.bonusPlatAlways)
    if (bonusLive || bonusKeep) {
      list.push({
        x1: inst.bonusPlatHome.x,
        x2: inst.bonusPlatHome.x + BONUS_PLAT_W,
        y: inst.bonusPlatHome.y,
        h: LOG_H
      })
    }
  }
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
  const mixed = {
    r: Math.round(a.r + (b.r - a.r) * u),
    g: Math.round(a.g + (b.g - a.g) * u),
    b: Math.round(a.b + (b.b - a.b) * u)
  }
  //
  // Identity-white multiply tints must stay unsnapped — white is "no tint"
  // on an already-baked sprite, not a painted fill.
  //
  if (isIdentityWhite(a) || isIdentityWhite(b)) return mixed
  return snapToPalette(mixed)
}
function isIdentityWhite(c) {
  return c.r === 255 && c.g === 255 && c.b === 255
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
  if (!sc?.zones) return { r: 255, g: 255, b: 255 }
  if (isGlowFlatSingleDecorColor(sc)) return { r: 255, g: 255, b: 255 }
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
// Bakes three forest planes (trees + bushes on the same canvas) plus sky
// and the static ground band. Depth comes from scroll speed and palette
// steps: gray3/orange3 farthest, gray2/orange2 mid, gray1 + green nearest.
//
function buildParallaxSprites(k, undergroundSpec) {
  const grayNearPal = getTreePaletteSolid('parallaxGrayNear')
  const grayMidPal = getTreePaletteSolid('parallaxGrayMid')
  const grayFarPal = getTreePaletteSolid('parallaxGrayFar')
  const colorMidPal = getTreePaletteSolid('parallaxColorMid')
  const colorFarPal = getTreePaletteSolid('parallaxColorFar')
  const colorNearBush = glowRgb(GLOW_PAL.treeColor.leaf)
  const maxScroll = WORLD_W - LEFT_MARGIN - RIGHT_MARGIN - VIEW_W
  bakeParallaxLayerPair(k, BG_PAR_SKY_GRAY, BG_PAR_SKY_COLOR, PAR_SKY_SPEED, maxScroll, 0, (grayCtx, colorCtx) => {
    renderSkyBand(grayCtx, colorCtx, INNER_GRAY, WARM_HAZE)
  })
  bakeParallaxLayerPair(k, BG_PAR_TREE3_GRAY, BG_PAR_TREE3_COLOR, PAR_TREE3_SPEED, maxScroll, PAR_TREE_HORIZ_BLEED, (grayCtx, colorCtx, pad) => {
    bakeParallaxTrees(grayCtx, colorCtx, pad, {
      count: PAR_FARTHEST_TREE_COUNT,
      seedBase: PAR_FARTHEST_SEED_BASE,
      topMinY: PAR_FARTHEST_TOP_MIN_Y,
      topRange: PAR_FARTHEST_TOP_RANGE,
      grayPal: grayFarPal,
      colorPal: colorFarPal,
      flatLeaves: true,
      leafDarken: 0,
      uniformWood: true,
      bandTop: PAR_FARTHEST_BAND_TOP,
      bandBottom: PAR_FARTHEST_BAND_BOTTOM,
      bandCount: PAR_FARTHEST_BAND_COUNT
    })
    bakeParallaxBushes(grayCtx, colorCtx, pad, {
      grayRgb: { r: grayFarPal.trunkR, g: grayFarPal.trunkG, b: grayFarPal.trunkB },
      colorRgb: { r: colorFarPal.trunkR, g: colorFarPal.trunkG, b: colorFarPal.trunkB },
      colorFlat: true,
      grayFlat: true,
      heightScale: BUSH_FARTHEST_HEIGHT_SCALE
    })
  })
  bakeParallaxLayerPair(k, BG_PAR_TREE2_GRAY, BG_PAR_TREE2_COLOR, PAR_TREE2_SPEED, maxScroll, PAR_TREE_HORIZ_BLEED, (grayCtx, colorCtx, pad) => {
    bakeParallaxTrees(grayCtx, colorCtx, pad, {
      count: PAR_FAR_TREE_COUNT,
      seedBase: PAR_FAR_SEED_BASE,
      topMinY: PAR_FAR_TOP_MIN_Y,
      topRange: PAR_FAR_TOP_RANGE,
      grayPal: grayMidPal,
      colorPal: colorMidPal,
      flatLeaves: true,
      leafDarken: 0,
      uniformWood: true,
      bandTop: PAR_FAR_BAND_TOP,
      bandBottom: PAR_FAR_BAND_BOTTOM,
      bandCount: PAR_FAR_BAND_COUNT
    })
    bakeParallaxBushes(grayCtx, colorCtx, pad, {
      grayRgb: { r: grayMidPal.trunkR, g: grayMidPal.trunkG, b: grayMidPal.trunkB },
      colorRgb: { r: colorMidPal.trunkR, g: colorMidPal.trunkG, b: colorMidPal.trunkB },
      colorFlat: true,
      grayFlat: true,
      heightScale: BUSH_FAR_HEIGHT_SCALE
    })
  })
  bakeParallaxLayerPair(k, BG_PAR_TREE1_GRAY, BG_PAR_TREE1_COLOR, PAR_TREE1_SPEED, maxScroll, PAR_TREE_HORIZ_BLEED, (grayCtx, colorCtx, pad) => {
    bakeParallaxTrees(grayCtx, colorCtx, pad, {
      count: PAR_BIG_TREE_COUNT,
      seedBase: PAR_BIG_SEED_BASE,
      topMinY: PAR_BIG_TOP_MIN_Y,
      topRange: PAR_BIG_TOP_RANGE,
      grayPal: grayNearPal,
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
    bakeParallaxBushes(grayCtx, colorCtx, pad, {
      grayRgb: { r: grayNearPal.trunkR, g: grayNearPal.trunkG, b: grayNearPal.trunkB },
      colorRgb: colorNearBush,
      colorFlat: false,
      grayFlat: false,
      heightScale: 1
    })
  })
  const staticGray = document.createElement('canvas')
  staticGray.width = WORLD_W
  staticGray.height = WORLD_H
  const staticGrayCtx = staticGray.getContext('2d')
  const staticColor = document.createElement('canvas')
  staticColor.width = WORLD_W
  staticColor.height = WORLD_H
  const staticColorCtx = staticColor.getContext('2d')
  staticGrayCtx.clearRect(0, FLOOR_Y, WORLD_W, WORLD_H - FLOOR_Y)
  staticColorCtx.clearRect(0, FLOOR_Y, WORLD_W, WORLD_H - FLOOR_Y)
  const [ugGray, ugColor] = undergroundPaletteEntries()
  renderCombinedGroundBand(staticGrayCtx, lerpRgb(INNER_GRAY, VOID, GROUND_L_DARKEN), undergroundSpec, ugGray)
  renderCombinedGroundBand(staticColorCtx, GROUND_DARK, undergroundSpec, ugColor)
  k.loadSprite(BG_STATIC_GRAY, staticGray)
  k.loadSprite(BG_STATIC_COLOR, staticColor)
  staticGray.width = 0
  staticGray.height = 0
  staticColor.width = 0
  staticColor.height = 0
}
//
// Paints the sky band into both parallax canvases as a vertical gradient
// (lighter zenith, horizon tone at the ground line).
//
function renderSkyBand(grayCtx, colorCtx, grayRgb, colorRgb) {
  const h = FLOOR_Y - TOP_MARGIN
  paintSkyGradient(grayCtx, grayRgb, SKY_TOP_GRAY, h)
  paintSkyGradient(colorCtx, colorRgb, SKY_TOP_COLOR, h)
}
function paintSkyGradient(ctx, horizonRgb, topRgb, h) {
  const grad = ctx.createLinearGradient(0, TOP_MARGIN, 0, FLOOR_Y)
  grad.addColorStop(0, `rgb(${topRgb.r}, ${topRgb.g}, ${topRgb.b})`)
  grad.addColorStop(1, `rgb(${horizonRgb.r}, ${horizonRgb.g}, ${horizonRgb.b})`)
  ctx.fillStyle = grad
  ctx.fillRect(LEFT_MARGIN, TOP_MARGIN, GAME_W, h)
}
//
// Renders one tree row into a parallax canvas with horizontal bleed.
//
function bakeParallaxTrees(grayCtx, colorCtx, pad, planeCfg) {
  const treeLeft = LEFT_MARGIN - pad
  const treeRight = WORLD_W - RIGHT_MARGIN + pad
  renderGlowTreePlane(grayCtx, colorCtx, {
    ...planeCfg,
    treeX1: treeLeft,
    treeX2: treeRight,
    bandX2: WORLD_W + pad
  })
}
//
// Renders one bush row into a parallax canvas with horizontal bleed.
//
function bakeParallaxBushes(grayCtx, colorCtx, pad, stripCfg) {
  const x1 = LEFT_MARGIN - pad
  const x2 = WORLD_W - RIGHT_MARGIN + pad
  renderBushStrip(grayCtx, colorCtx, { ...stripCfg, x1, x2 })
}
//
// Bakes one parallax depth layer with horizontal padding so it never gaps at
// either scroll limit.
//
function bakeParallaxLayerPair(k, grayName, colorName, speed, maxScroll, horizBleed, drawFn) {
  const pad = Math.ceil(maxScroll * (1 - speed)) + horizBleed
  const canvasW = WORLD_W + pad * 2
  const grayCanvas = document.createElement('canvas')
  grayCanvas.width = canvasW
  grayCanvas.height = WORLD_H
  const grayCtx = grayCanvas.getContext('2d')
  grayCtx.translate(pad, 0)
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = canvasW
  colorCanvas.height = WORLD_H
  const colorCtx = colorCanvas.getContext('2d')
  colorCtx.translate(pad, 0)
  drawFn(grayCtx, colorCtx, pad)
  k.loadSprite(grayName, grayCanvas)
  k.loadSprite(colorName, colorCanvas)
  grayCanvas.width = 0
  grayCanvas.height = 0
  colorCanvas.width = 0
  colorCanvas.height = 0
  return pad
}
//
// Paints the root-zone part of a combined background canvas: the flat earth
// band inside the playfield margins topped with the underground decor.
//
function renderCombinedGroundBand(ctx, bandRgb, undergroundSpec, ugEntry) {
  ctx.fillStyle = `rgb(${bandRgb.r}, ${bandRgb.g}, ${bandRgb.b})`
  ctx.fillRect(LEFT_MARGIN, FLOOR_Y, GAME_W, WORLD_H - FLOOR_Y)
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
    grayPal: grayPalOverride,
    colorPal: colorPalOverride,
    bandTop, bandBottom, bandCount,
    treeX1 = LEFT_MARGIN,
    treeX2 = WORLD_W - RIGHT_MARGIN,
    bandX2 = WORLD_W
  } = planeCfg
  //
  // A ready-made palette skips the haze blend so a row can sit on its own
  // palette swatch instead of disappearing into the sky.
  //
  const grayPal = grayPalOverride || buildDimmedTreePalette(getTreePaletteGray(), INNER_GRAY, grayBlend, flatLeaves, leafDarken, uniformWood)
  const colorPal = colorPalOverride || buildDimmedTreePalette(colorBase, WARM_HAZE, colorBlend, flatLeaves, leafDarken, uniformWood, leafWarmBlend)
  const treeXs = buildParallaxTreeXs(count, treeX1, treeX2)
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
    renderGlowTreeIntoContext(grayCtx, treeData, grayPal, WORLD_W, WORLD_H)
    renderGlowTreeIntoContext(colorCtx, treeData, colorPal, WORLD_W, WORLD_H)
  })
  //
  // Row foliage: one dense full-width horizontal leaf band — every leaf at
  // roughly the same vertical level with a small random step up/down,
  // continuous from the left edge to the right edge.
  //
  const bandOpts = {
    seed: TREE_SEED + seedBase + PAR_BAND_SEED_OFFSET,
    x1: 0,
    x2: bandX2,
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
  const {
    grayRgb, colorRgb, colorFlat, grayFlat, heightScale,
    x1 = LEFT_MARGIN,
    x2 = WORLD_W - RIGHT_MARGIN
  } = stripCfg
  let x = x1
  const right = x2
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
      x: LEFT_MARGIN + Math.random() * GAME_W,
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
  const camX = inst.k.camPos().x
  const prevCamX = inst.birdCamX ?? camX
  const camDelta = camX - prevCamX
  inst.birdCamX = camX
  const parallaxDrift = camDelta * (1 - BIRD_PARALLAX_SPEED)
  inst.birds.forEach(bird => { bird.x += parallaxDrift })
  inst._birdUpdateAcc = (inst._birdUpdateAcc ?? 0) + dt
  const birdInterval = isColorWorldSettled(inst)
    ? COLOR_WORLD_BIRD_UPDATE_INTERVAL
    : BIRD_UPDATE_INTERVAL
  if (inst._birdUpdateAcc < birdInterval) return
  const step = inst._birdUpdateAcc
  inst._birdUpdateAcc = 0
  inst.birdTime += step
  const left = LEFT_MARGIN - BIRD_WRAP_PAD
  const right = WORLD_W - RIGHT_MARGIN + BIRD_WRAP_PAD
  inst.birds.forEach(bird => {
    bird.flap += bird.flapSpeed * step
    bird.x += bird.dir * bird.speed * step
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
  if (fade <= 0.01) return
  const k = inst.k
  if (!inst._birdDrawColor) {
    const c = lerpRgb(VOID, WARM_HAZE, BIRD_HAZE_BLEND)
    inst._birdDrawColor = k.rgb(c.r, c.g, c.b)
  }
  const color = inst._birdDrawColor
  const birdOpacity = fade >= 1 ? 1 : fade
  const camX = k.camPos().x
  const zoom = inst.camera?.zoom || 1
  const half = VIEW_W / (2 * zoom) + 80
  const pts = inst._birdPts || (inst._birdPts = [k.vec2(0, 0), k.vec2(0, 0), k.vec2(0, 0)])
  inst.birds.forEach(bird => {
    if (bird.x < camX - half || bird.x > camX + half) return
    const y = bird.baseY + Math.sin(inst.birdTime * 0.7 + bird.bobPhase) * BIRD_BOB_AMP
    const wingTipY = y + Math.sin(bird.flap) * bird.size * 0.7
    pts[0].x = bird.x - bird.size
    pts[0].y = wingTipY
    pts[1].x = bird.x
    pts[1].y = y
    pts[2].x = bird.x + bird.size
    pts[2].y = wingTipY
    k.drawLines({
      pts,
      width: BIRD_LINE_WIDTH,
      color,
      opacity: birdOpacity,
      join: 'round',
      cap: 'round'
    })
  })
}
//
// Sky-coloured veil over a forest row so farther planes lose contrast.
//
function drawAtmosphereHaze(inst, opacity) {
  if (opacity < 0.01) return
  const k = inst.k
  const c = lerpRgb(INNER_GRAY, WARM_HAZE, inst.colorFade ?? 0)
  k.drawRect({
    pos: k.vec2(LEFT_MARGIN, TOP_MARGIN),
    width: GAME_W,
    height: FLOOR_Y - TOP_MARGIN,
    color: k.rgb(c.r, c.g, c.b),
    opacity
  })
}
//
// Quiet specks that drift through the revealed forest air.
//
function createAtmosphereMotes() {
  const motes = []
  for (let i = 0; i < MOTE_COUNT; i++) {
    motes.push({
      x: LEFT_MARGIN + Math.random() * GAME_W,
      y: TOP_MARGIN + 40 + Math.random() * Math.max(80, FLOOR_Y - TOP_MARGIN - 120),
      vx: (Math.random() - 0.5) * MOTE_SPEED_RANGE,
      vy: -(MOTE_SPEED_MIN + Math.random() * MOTE_SPEED_RANGE),
      size: MOTE_SIZE_MIN + Math.random() * MOTE_SIZE_RANGE,
      phase: Math.random() * Math.PI * 2,
      opacity: MOTE_OPACITY_MIN + Math.random() * MOTE_OPACITY_RANGE
    })
  }
  return motes
}
//
// Wraps motes inside the playfield so the drift never runs off-world.
//
function updateAtmosphereMotes(inst, dt) {
  const motes = inst.atmosphereMotes
  if (!motes) return
  const top = TOP_MARGIN + 20
  const bot = FLOOR_Y - 30
  const left = LEFT_MARGIN
  const right = WORLD_W - RIGHT_MARGIN
  motes.forEach(mote => {
    mote.phase += dt * 0.6
    mote.x += mote.vx * dt + Math.sin(mote.phase) * 4 * dt
    mote.y += mote.vy * dt
    mote.y < top && (mote.y = bot)
    mote.y > bot && (mote.y = top)
    mote.x < left && (mote.x = right)
    mote.x > right && (mote.x = left)
  })
}
//
// Specks stay behind the hero; skipped in the single-tone explore phase.
//
function drawAtmosphereMotes(inst) {
  if (!inst.zones.lZoneParallax) return
  if (isGlowFlatSingleDecorColor(inst)) return
  const k = inst.k
  const colorFade = glowDecorFade(inst)
  const gray = HUD_SCORE_COLOR_SETTLED
  const warm = lerpRgb(WARM_HAZE, LIGHT_GRAY, 0.35)
  const c = inst.zones.colorWorld || colorFade > COLOR_CROSSFADE_EPS ? lerpRgb(gray, warm, colorFade) : gray
  const color = k.rgb(c.r, c.g, c.b)
  const camX = k.camPos().x
  const zoom = inst.camera?.zoom || 1
  const half = VIEW_W / (2 * zoom) + 40
  const moteFade = Math.max(inst.parallaxFade ?? 0, colorFade)
  inst.atmosphereMotes?.forEach(mote => {
    if (mote.x < camX - half || mote.x > camX + half) return
    k.drawCircle({
      pos: k.vec2(mote.x, mote.y),
      radius: mote.size,
      color,
      opacity: mote.opacity * moteFade
    })
  })
}
//
// Visual ground relief only — collision stays on FLOOR_Y. Hidden while the
// world is still a single decor gray.
//
function drawExploredGroundLip(inst) {
  if (isGlowFlatSingleDecorColor(inst)) return
  const z = inst.zones
  if (!z.groundDecorLeft && z.groundRightStripMax < 0 && !z.water) return
  const k = inst.k
  const c = DECOR_OUTLINE_RGB
  const color = k.rgb(c.r, c.g, c.b)
  const x0 = LEFT_MARGIN
  const x1 = WORLD_W - RIGHT_MARGIN
  const step = (x1 - x0) / GROUND_LIP_STEPS
  const lakeX1 = inst.lakeX1
  const lakeX2 = inst.lakeX2
  const crack = getCrackZone(WORLD_W, FLOOR_Y)
  const caveKeepL = crack.x1 - 36
  const caveKeepR = crack.x2 + 8
  for (let i = 0; i < GROUND_LIP_STEPS; i++) {
    const x = x0 + i * step
    if (lakeX1 != null && x >= lakeX1 && x <= lakeX2) continue
    if (x + step > caveKeepL && x < caveKeepR) continue
    const op = x >= TREE_X + TRUNK_EXCLUDE_HALF
      ? glowRightWorldOpacity(inst, x, 'large')
      : (z.groundDecorLeft ? (inst.leftDecorFade ?? 1) : 0)
    if (op < 0.12) continue
    const lip = (Math.sin(x * GROUND_LIP_FREQ_A) + Math.sin(x * GROUND_LIP_FREQ_B) * 0.5) * GROUND_LIP_AMP
    const h = Math.max(2, 3 + lip)
    k.drawRect({
      pos: k.vec2(x, FLOOR_Y - h + 2),
      width: step + 1,
      height: h,
      color,
      opacity: 0.4 * op
    })
  }
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
    canvas.width = WORLD_W
    canvas.height = WORLD_H
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
  const areaX2 = WORLD_W - RIGHT_MARGIN - 40
  const areaY1 = FLOOR_Y + UG_TOP_PAD
  const areaY2 = WORLD_H - UG_BOTTOM_PAD
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
  // Rootlets — thin hair-roots hanging down from dry ground only. The whole
  // left field is the lake, so nothing hangs under the water.
  //
  const dryX1 = TREE_X + TRUNK_EXCLUDE_HALF
  const randRootX = () => dryX1 + Math.random() * Math.max(1, areaX2 - dryX1)
  const rootlets = []
  for (let i = 0; i < UG_ROOTLET_COUNT; i++) {
    const rx = randRootX()
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
  // Extra hair-roots under the cave mouth so the entrance is dressed in
  // both the flat gray world and the shaded/colour earth band.
  //
  const cave = getCrackZone(WORLD_W, FLOOR_Y)
  for (let i = 0; i < UG_CAVE_ROOTLET_COUNT; i++) {
    const rx = cave.x1 - 24 + Math.random() * (cave.width + 16)
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
  // Buried skeleton — always in the lower-left underground band
  //
  const skeleton = {
    x: LEFT_MARGIN + 100 + Math.random() * 120,
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
  spec.rootlets.forEach(pts => {
    if ((pts[0]?.x ?? 0) < TREE_X - TRUNK_EXCLUDE_HALF) return
    strokePolyline(ctx, pts)
  })
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
  const z = inst.zones
  const leftOpen = Boolean(z?.groundDecorLeft)
  const rightOpen = (z?.groundRightStripMax ?? -1) >= 0
  if (!leftOpen && !rightOpen) return
  const fade = inst.colorFade
  if (isGlowFlatSingleDecorColor(inst)) {
    drawUndergroundSpriteClipped(inst, UNDERGROUND_GRAY_SPRITE, 1)
    return
  }
  //
  // Once fully faded, skip the now-invisible gray sprite entirely — drawing
  // a fully transparent full-screen sprite every frame forever after O still
  // costs a full draw call. In practice this function itself now only runs
  // during the brief post-O fade window — see onDraw's parallaxStaticOpaque
  // check, which skips calling it at all once BG_STATIC_COLOR already bakes
  // in the same underground decor.
  //
  if (fade >= 1) {
    drawUndergroundSpriteClipped(inst, UNDERGROUND_COLOR_SPRITE, 1)
    return
  }
  const grayOp = 1 - fade
  grayOp > COLOR_CROSSFADE_EPS && drawUndergroundSpriteClipped(inst, UNDERGROUND_GRAY_SPRITE, grayOp)
  fade > COLOR_CROSSFADE_EPS && drawUndergroundSpriteClipped(inst, UNDERGROUND_COLOR_SPRITE, fade)
}
//
// Paints only the underground under opened ground: left shore, and the
// explored right strips. Hidden on the start branch before either side opens.
//
function drawUndergroundSpriteClipped(inst, sprite, opacity) {
  const z = inst.zones
  z.groundDecorLeft &&
    drawUndergroundSpriteBand(inst.k, sprite, opacity, LEFT_MARGIN, TREE_X)
  if ((z.groundRightStripMax ?? -1) < 0) return
  const stripEnd = inst.treeStripEndX ?? z._groundStripEndX ?? WORLD_W
  const edge = groundRightExploredEdgeX(
    z.groundRightStripMax,
    GROUND_REVEAL_TREE_PAST_X,
    stripEnd
  )
  const x1 = GROUND_REVEAL_TREE_PAST_X
  const x2 = Math.min(WORLD_W - RIGHT_MARGIN, Math.max(x1, edge))
  x2 > x1 && drawUndergroundSpriteBand(inst.k, sprite, opacity, x1, x2)
}
//
// One horizontal slice of a full-world underground sprite.
//
function drawUndergroundSpriteBand(k, sprite, opacity, x1, x2) {
  const w = x2 - x1
  if (w <= 1) return
  k.drawSprite({
    sprite,
    pos: k.vec2(x1, 0),
    width: w,
    height: WORLD_H,
    quad: { x: x1 / WORLD_W, y: 0, w: w / WORLD_W, h: 1 },
    opacity,
    anchor: 'topleft'
  })
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
      k.opacity(0),
      k.z(CFG.visual.zIndex.platforms),
      CFG.game.platformName
    ])
    walls.push(wall)
    return wall
  }
  addWall(LEFT_MARGIN / 2, WORLD_H / 2, LEFT_MARGIN, WORLD_H)
  addWall(WORLD_W - RIGHT_MARGIN / 2, WORLD_H / 2, RIGHT_MARGIN, WORLD_H)
  addWall(WORLD_W / 2, TOP_MARGIN / 2, WORLD_W, TOP_MARGIN)
  //
  // Main floor stops before the right-edge crack band (lid is a separate body)
  //
  const crack = getCrackZone(WORLD_W, FLOOR_Y)
  const floorW = Math.max(40, crack.x1 - LEFT_MARGIN)
  const floor = k.add([
    k.rect(floorW, FLOOR_PHYS_H),
    k.pos(LEFT_MARGIN, FLOOR_Y),
    k.anchor('topleft'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  //
  // Ground strip past the cave mouth — grass and decor continue to the edge.
  //
  const postCaveW = Math.max(0, WORLD_W - RIGHT_MARGIN - crack.x2)
  let postCaveFloor = null
  if (postCaveW > 0) {
    postCaveFloor = k.add([
      k.rect(postCaveW, FLOOR_PHYS_H),
      k.pos(crack.x2, FLOOR_Y),
      k.anchor('topleft'),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ])
  }
  return { floor, postCaveFloor, walls }
}
//
// Rounded corners (value 1) — hidden until ground zone opens.
//
function createRoundedCorners(k, zones) {
  const hex = isOuterFrameVisible(zones) ? OUTER_BG_HEX : GLOW_PAL.void
  const cornerCanvas = makeRoundedCornerCanvas(CORNER_RADIUS, hex)
  k.loadSprite(CORNER_SPRITE_NAME, cornerCanvas)
  cornerCanvas.width = 0
  cornerCanvas.height = 0
  //
  // Centered anchors keep the rotated quarter-cuts aligned to each playfield
  // corner. The mask square must sit INSIDE the playfield rectangle (over the
  // sharp corner pixels being rounded off), not outside in the margin — the
  // margin is already background-coloured, so a mask placed there is a no-op
  // and the corner stays visibly square, which is what made rounding vanish.
  //
  const Z = CFG.visual.zIndex.ui + 30
  const halfRadius = CORNER_RADIUS / 2
  const corners = [
    k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(LEFT_MARGIN + halfRadius, PLAYFIELD_TOP_Y + TOP_MARGIN + halfRadius), k.anchor('center'), k.z(Z), { fixed: true }]),
    k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(SCREEN_W - RIGHT_MARGIN - halfRadius, PLAYFIELD_TOP_Y + TOP_MARGIN + halfRadius), k.rotate(90), k.anchor('center'), k.z(Z), { fixed: true }]),
    k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(LEFT_MARGIN + halfRadius, PLAYFIELD_BOTTOM_Y - halfRadius), k.rotate(270), k.anchor('center'), k.z(Z), { fixed: true }]),
    k.add([k.sprite(CORNER_SPRITE_NAME), k.pos(SCREEN_W - RIGHT_MARGIN - halfRadius, PLAYFIELD_BOTTOM_Y - halfRadius), k.rotate(180), k.anchor('center'), k.z(Z), { fixed: true }])
  ]
  corners.forEach(obj => { obj.hidden = false })
  return corners
}
//
// Reloads corner mask sprites when the playfield chrome switches void → outer.
//
function refreshPlayfieldCornerSprites(inst) {
  const hex = isOuterFrameVisible(inst.zones) ? OUTER_BG_HEX : GLOW_PAL.void
  if (inst.cornerColorHex === hex) return
  inst.cornerColorHex = hex
  const k = inst.k
  const cornerCanvas = makeRoundedCornerCanvas(CORNER_RADIUS, hex)
  k.loadSprite(CORNER_SPRITE_NAME, cornerCanvas)
  cornerCanvas.width = 0
  cornerCanvas.height = 0
  inst.cornerObjs?.forEach(obj => {
    obj?.exists?.() && obj.use(k.sprite(CORNER_SPRITE_NAME))
  })
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
function createGrayLogPlatform(k, x, y, w, h, sound, heroInst, zones, outlineStyle = false, logAtlas) {
  //
  // Log platforms match the main tree's gray trunk tone before L; after L
  // they switch to the fully detailed wood barrel. The L platform itself
  // always uses the bare outline+single-accent style instead (outlineStyle).
  //
  const envColorGray = getRGB(k, GLOW_PAL.treeGray.trunk)
  const logDetail = generateLogDetail(w, h)
  const bakedLit = logAtlas.register(w, h, logDetail, LOG_TREE_LIT_COLORS)
  const bakedColor = logAtlas.register(w, h, logDetail, LOG_TREE_COLOR_COLORS)
  const cx = x + w / 2
  const cy = y + h / 2
  const plat = k.add([
    //
    // fill:false — this rect only supplies the collision shape; every pixel
    // is painted by the custom draw() below. Without it, rect()'s own draw
    // hook still runs alongside draw() and fills the full box white first —
    // invisible once L/O/W's own opaque wood fill covers it completely, but
    // the L platform's bare-outline style leaves most of that box unpainted
    // by design, so the white default showed straight through.
    //
    k.rect(w, h, { fill: false }),
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
        // Freshly revealed platforms fade their own opacity in from 0
        // instead of popping in already fully drawn (see setPlatVisible).
        //
        const reveal = this._revealFade ?? 1
        if (outlineStyle) {
          //
          // Same muted gray rim used for every other gray-phase ground decor
          // piece (rocks, trampoline mushrooms, letter captions — see
          // DECOR_OUTLINE_RGB) instead of plain black, which read as a
          // mismatched stray colour once everything else on screen settled
          // on this softer tone. Void itself would be invisible here — the
          // playfield backdrop during this phase is painted that exact
          // colour, so an outline that dark would vanish into it.
          //
          const outlineRgb = k.rgb(DECOR_OUTLINE_RGB.r, DECOR_OUTLINE_RGB.g, DECOR_OUTLINE_RGB.b)
          //
          // Stays true neutral gray while the world is still flat, same as
          // the other log platforms below — glowLogColors() returns the
          // warm "lit" sand bark tone unconditionally, which read as a
          // stray second colour on top of the black outline while
          // everything else on screen was still strict grayscale.
          //
          const detailHex = (fade > 0.01 || zones.lCollected) ? glowLogColors(zones).bark : GLOW_PAL.treeGray.trunk
          const detailRgb = getRGB(k, detailHex)
          //
          // Crossfades from the bare outline+accent silhouette into a fully
          // filled, coloured barrel as the world turns colourful — same
          // "outline in gray, filled in colour" progression the main tree
          // itself goes through (see getTreePaletteColor()), instead of
          // staying a hollow outline forever once every colour has appeared.
          // Once the crossfade settles (fade >= 0.98) draw a pre-baked
          // sprite instead of the full vector barrel — this steady state
          // holds forever once the world is coloured, and re-drawing dozens
          // of polygons/ovals with fresh trig every frame for every log
          // platform on screen was the main FPS cost after O.
          //
          if (fade >= 0.98 && zones.colorWorld) {
            drawBakedFilledLog(k, fade > 0.5 ? bakedColor : bakedLit, ox, oy, reveal)
            return
          }
          fade < 0.98 && drawLOutlineLogPlatform(k, w, h, ox, oy, this._logDetail, outlineRgb, detailRgb, reveal)
          fade > COLOR_CROSSFADE_EPS && drawLogPlatform(k, w, h, ox, oy, fade * reveal, this._logDetail, glowLogColors(zones))
          return
        }
        //
        // Detailed wood (rings, bark lines) appears once L is collected;
        // before that the log is a flat gray environment silhouette. The
        // filled state never animates its own opacity, so it can always use
        // the pre-baked sprite straight away (see outlineStyle branch above).
        //
        if (fade > COLOR_CROSSFADE_EPS || zones.lCollected) {
          const sc = zones._sceneRef
          if (sc && isGlowColorTransitionActive(sc)) {
            const grayOp = 1 - fade
            grayOp > COLOR_CROSSFADE_EPS && drawBakedFilledLog(k, bakedLit, ox, oy, grayOp * reveal)
            fade > COLOR_CROSSFADE_EPS && drawBakedFilledLog(k, bakedColor, ox, oy, fade * reveal)
            return
          }
          drawBakedFilledLog(k, fade > 0.5 ? bakedColor : bakedLit, ox, oy, reveal)
          return
        }
        drawFlatLog(k, ox, oy, w, h, envColorGray, reveal)
      }
    }
  ])
  plat.hidden = true
  tagWoodPlatform(plat, sound, heroInst)
  return plat
}
//
// Collects filled-log bake requests from every log platform (L, O, W, the
// hidden bonus log) so all of them can be packed into ONE shared atlas
// texture and built once, right after every platform on the level has
// registered — sharing a single sprite means drawing any number of log
// platforms costs one bindTexture/useProgram GPU state change instead of
// one per platform per colour variant, which is what actually tanked FPS
// once O opens up the whole level's decor at once (confirmed by counting
// WebGL draw/texture calls per frame, not just JS self time).
//
function createLogAtlasCollector() {
  const requests = []
  const register = (w, h, detail, colors) => {
    const placeholder = { name: null, offsetX: 0, offsetY: 0, tileW: 0, tileH: 0, quad: null }
    requests.push({ w, h, detail, colors, placeholder })
    return placeholder
  }
  const build = (k) => {
    if (!requests.length) return
    const baked = requests.map(r => bakeLogPlatformCanvas(k, r.w, r.h, r.detail, r.colors))
    const { canvas, tiles } = packLogPlatformAtlas(baked)
    const atlasW = canvas.width
    const atlasH = canvas.height
    const name = 'glow0-logplat-atlas'
    k.loadSprite(name, canvas)
    canvas.width = 0
    canvas.height = 0
    requests.forEach((r, i) => {
      const tile = tiles[i]
      Object.assign(r.placeholder, {
        name,
        offsetX: tile.offsetX,
        offsetY: tile.offsetY,
        tileW: tile.w,
        tileH: tile.h,
        quad: { x: tile.x / atlasW, y: tile.y / atlasH, w: tile.w / atlasW, h: tile.h / atlasH }
      })
    })
  }
  return { register, build }
}
//
// Draws a pre-baked filled-log atlas tile centred at the local (ox, oy) offset.
//
function drawBakedFilledLog(k, baked, ox, oy, opacity = 1) {
  if (!baked.name) return
  k.drawSprite({
    sprite: baked.name,
    pos: k.vec2(ox - baked.offsetX, oy - baked.offsetY),
    width: baked.tileW,
    height: baked.tileH,
    quad: baked.quad,
    opacity
  })
}
//
// Draws one shared-atlas decor tile (a rock or mushroom variant) at a live
// game object's own pos/angle/opacity/color — used instead of a plain
// k.sprite() component so many small decor pieces can share one texture.
//
function drawDecorAtlasSprite(k, baked, pos, anchor, angle, opacity, color) {
  if (!baked?.name) return
  k.drawSprite({
    sprite: baked.name,
    pos,
    anchor,
    angle,
    opacity,
    color,
    width: baked.tileW,
    height: baked.tileH,
    quad: baked.quad
  })
}
//
// Crossfades gray and colour atlas tiles during the meditation preview.
//
function drawDecorAtlasCrossfade(k, grayBaked, colorBaked, pos, anchor, angle, fade, grayColor, colorColor) {
  const f = Math.max(0, Math.min(1, fade))
  const grayOp = 1 - f
  grayOp > COLOR_CROSSFADE_EPS && drawDecorAtlasSprite(k, grayBaked, pos, anchor, angle, grayOp, grayColor)
  f > COLOR_CROSSFADE_EPS && colorBaked && drawDecorAtlasSprite(k, colorBaked, pos, anchor, angle, f, colorColor)
}
function tagGroundPlatform(platform, sound, heroInst) {
  platform.onCollide('player', () => {
    sound._l2Surface = null
    sound._glowSurface = 'ground'
  })
}
//
// Marks wood surface on hero contact so landing/step sounds fire in the same frame.
//
function tagWoodPlatform(platform, sound, heroInst) {
  platform.onCollide('player', () => {
    sound._l2Surface = 'wood'
    sound._glowSurface = 'wood'
  })
}
//
// Flat log barrel — one environment tone, no shading.
//
function drawFlatLog(k, ox, oy, w, h, color, opacity = 1) {
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
  k.drawPolygon({ pts: bodyPts, color, opacity })
}
//
// Hollow outline barrel for the L platform: the body is a bare stroked
// silhouette with no fill, while its cracks, rounded end cap and grain
// stripes are all painted in one single accent tone.
//
function drawLOutlineLogPlatform(k, w, h, ox, oy, detail, outlineColor, detailColor, opacity = 1) {
  const halfW = w / 2
  const halfH = h / 2
  const endR = halfH
  const sq = L_PLAT_END_SQUASH
  const bodyPts = []
  for (let i = 0; i <= L_PLAT_END_STEPS; i++) {
    const a = Math.PI / 2 + Math.PI * i / L_PLAT_END_STEPS
    bodyPts.push(k.vec2(-halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  for (let i = 0; i <= L_PLAT_END_STEPS; i++) {
    const a = -Math.PI / 2 + Math.PI * i / L_PLAT_END_STEPS
    bodyPts.push(k.vec2(halfW + endR * Math.cos(a) * sq + ox, endR * Math.sin(a) + oy))
  }
  k.drawLines({ pts: [...bodyPts, bodyPts[0]], width: L_PLAT_OUTLINE_WIDTH, color: outlineColor, opacity })
  //
  // Rounded end-cap detail only on the right, same convention as the
  // standard filled log style (drawLogPlatform) — the left side stays bare
  // outline, with its own cracks/grain running all the way out to that
  // edge below instead of stopping short at a cap that isn't there.
  //
  drawFilledOvalOutline(k, halfW + ox, oy, endR * 0.82, sq, detailColor, opacity)
  for (let i = 0; i < L_PLAT_STRIPE_COUNT; i++) {
    const ly = -halfH + (h / (L_PLAT_STRIPE_COUNT + 1)) * (i + 1) + oy
    k.drawRect({
      pos: k.vec2(-halfW + ox, ly),
      width: w - endR * sq,
      height: 1,
      color: detailColor,
      opacity: 0.7 * opacity
    })
  }
  for (const crack of detail.cracks) {
    const dx = Math.cos(crack.angle) * crack.len * 0.5
    const dy = Math.sin(crack.angle) * crack.len * 0.5
    k.drawLines({
      pts: [k.vec2(crack.x - dx + ox, crack.y - dy + oy), k.vec2(crack.x + dx + ox, crack.y + dy + oy)],
      width: 1,
      color: detailColor,
      opacity: 0.8 * opacity
    })
  }
}
//
// Fills a squashed oval using polygon approximation (the L platform's
// single-tone rounded end cap).
//
function drawFilledOvalOutline(k, cx, cy, r, squash, color, opacity = 1) {
  const pts = []
  for (let i = 0; i <= L_PLAT_END_STEPS; i++) {
    const a = Math.PI * 2 * i / L_PLAT_END_STEPS
    pts.push(k.vec2(cx + Math.cos(a) * r * squash, cy + Math.sin(a) * r))
  }
  k.drawPolygon({ pts, color, opacity })
}
//
// Draws the revealed hidden bonus platform in the letter-log style: flat
// environment-toned barrel before L, detailed wood once L is collected.
//
function drawBonusPlatformLog(k, bonus, zones, bakedLit, bakedColor) {
  const cx = bonus.x + bonus.shakeOffsetX
  const cy = bonus.y
  const fade = zones._sceneRef?.colorFade ?? 0
  if (fade > 0.01 || zones.lCollected) {
    drawBakedFilledLog(k, fade > 0.5 ? bakedColor : bakedLit, cx, cy, bonus.platformOpacity)
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
// World-space position for a pickup-letter outline / shadow layer.
//
function glowLetterLayerPos(x, y, dx, dy, tiltDeg) {
  const rad = tiltDeg * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: x + dx * cos - dy * sin, y: y + dx * sin + dy * cos }
}
//
// Gray-world void outline vs colour-world drop shadow — shared by world
// letters and their pickup captions.
//
function glowLetterVisualStyle(inst) {
  const worldFade = inst?.zones?._sceneRef?.colorFade ?? (inst?.zones?.colorWorld ? 1 : 0)
  const withShadow = worldFade >= 0.5
  return {
    withShadow,
    withOutline: !withShadow,
    captionTextRgb: worldFade < 0.5 ? DECOR_GRAY : LIGHT_GRAY
  }
}
//
// Toggles void-outline vs drop-shadow layers on a world pickup letter.
//
function syncGlowPickupLetterVisual(entry, style) {
  if (!entry || entry.forceVisible) return
  const visible = !entry.main?.hidden
  entry.outlineObjs?.forEach(obj => { obj.hidden = !visible || !style.withOutline })
  entry.shadowObjs?.forEach(obj => { obj.hidden = !visible || !style.withShadow })
}
//
// Keeps every uncollected pickup letter styled like its caption text.
//
function syncGlowPickupLetterVisuals(inst) {
  const style = glowLetterVisualStyle(inst)
  syncGlowPickupLetterVisual(inst.gLetter, style)
  syncGlowPickupLetterVisual(inst.lLetter, style)
  syncGlowPickupLetterVisual(inst.oLetter, style)
  syncGlowPickupLetterVisual(inst.wLetter, style)
}
//
// Blinking letter — optional gold fill for G, void outline in gray world
// and a drop shadow in the colour world (same rules as the caption).
//
function createGlowLetter(k, char, x, y, tiltDeg, fillHex = GLOW_PAL.letterFill) {
  const fill = getRGB(k, fillHex)
  const outlineObjs = GLOW_LETTER_CAPTION_OUTLINE_OFFSETS.map(([odx, ody]) => {
    const pos = glowLetterLayerPos(
      x,
      y,
      odx * GLOW_LETTER_CAPTION_OUTLINE_PAD,
      ody * GLOW_LETTER_CAPTION_OUTLINE_PAD,
      tiltDeg
    )
    const obj = k.add([
      k.text(char, { size: GLOW_LETTER_SIZE, font: GLOW_LETTER_FONT }),
      k.pos(pos.x, pos.y),
      k.anchor('center'),
      k.rotate(tiltDeg),
      k.color(VOID.r, VOID.g, VOID.b),
      k.opacity(1),
      k.z(CFG.visual.zIndex.player - 2)
    ])
    obj.hidden = true
    return obj
  })
  const shadowPos = glowLetterLayerPos(
    x,
    y,
    GLOW_LETTER_CAPTION_SHADOW_OFFSET,
    GLOW_LETTER_CAPTION_SHADOW_OFFSET,
    tiltDeg
  )
  const shadowObj = k.add([
    k.text(char, { size: GLOW_LETTER_SIZE, font: GLOW_LETTER_FONT }),
    k.pos(shadowPos.x, shadowPos.y),
    k.anchor('center'),
    k.rotate(tiltDeg),
    k.color(GLOW_LETTER_SHADOW_R, GLOW_LETTER_SHADOW_G, GLOW_LETTER_SHADOW_B),
    k.opacity(1),
    k.z(CFG.visual.zIndex.player - 2)
  ])
  shadowObj.hidden = true
  const shadowObjs = [shadowObj]
  const main = k.add([
    k.text(char, { size: GLOW_LETTER_SIZE, font: GLOW_LETTER_FONT }),
    k.pos(x, y),
    k.anchor('center'),
    k.rotate(tiltDeg),
    k.color(fill.r, fill.g, fill.b),
    k.opacity(1),
    k.z(CFG.visual.zIndex.player - 1)
  ])
  main.hidden = true
  return {
    main,
    outlineObjs,
    shadowObjs,
    allObjects: [main, ...outlineObjs, ...shadowObjs],
    char,
    x,
    y,
    k,
    colorHex: fillHex,
    tiltDeg,
    //
    // Held true while the inline pickup caption (openGlowLetterCaption) is
    // showing this same letter — blocks the zone-visibility sync and the
    // idle pulse animation from touching hidden/opacity so the caption's
    // own fade timeline is the only thing driving them.
    //
    forceVisible: false
  }
}
//
// Swaying grass — the shared Grass component, excluding water, trunk and the
// trampoline mushroom band (so no blade ever covers its face). The tint
// callback also hides blades of unexplored ground sides.
//
function createGlowGrass(k, waterX1, waterX2, trampX, branchTrampX, zones) {
  const trunkL = TREE_X - TRUNK_EXCLUDE_HALF
  const trunkR = TREE_X + TRUNK_EXCLUDE_HALF
  const trampL = trampX - TRAMP_GRASS_CLEAR_HALF
  const trampR = trampX + TRAMP_GRASS_CLEAR_HALF
  const branchL = branchTrampX - TRAMP_GRASS_CLEAR_HALF
  const branchR = branchTrampX + TRAMP_GRASS_CLEAR_HALF
  const excluded = (x) => (x >= waterX1 && x <= waterX2) ||
    (x >= trunkL && x <= trunkR) ||
    (x >= trampL && x <= trampR) ||
    (x >= branchL && x <= branchR) ||
    isCrackGrassExcluded(x, WORLD_W)
  const grass = Grass.create({
    k,
    floorY: FLOOR_Y,
    left: LEFT_MARGIN + 20,
    right: WORLD_W - RIGHT_MARGIN - 20,
    tuftCount: GRASS_TUFT_COUNT,
    z: GRASS_Z,
    excluded,
    getTint: (blade) => glowGrassTint(zones, blade),
    getSwayScale: () => glowGrassSwayScale(zones)
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
  const sc = zones._sceneRef
  const lakeX1 = zones._lakeX1
  const lakeX2 = zones._lakeX2
  if (lakeX1 != null && lakeX2 != null && blade.x >= lakeX1 && blade.x <= lakeX2) {
    return null
  }
  if (sc?.k) {
    if (sc._grassCullFrame !== sc.k.time()) {
      sc._grassCullFrame = sc.k.time()
      const camX = sc.k.camPos().x
      const zoom = sc.camera?.zoom || 1
      const half = (sc.camera?.viewW || VIEW_W) / (2 * zoom) + 48
      sc._grassCullMinX = camX - half
      sc._grassCullMaxX = camX + half
    }
    if (blade.x < sc._grassCullMinX || blade.x > sc._grassCullMaxX) return null
  }
  //
  // Settled colour world: one cached tint — skip per-blade lerp work.
  //
  if (sc && zones.colorWorld && (sc.colorFade ?? 0) >= 1) {
    if (isGlowFlatSingleDecorColor(sc)) return DECOR_GRAY
    sc._grassColorSettled ??= lerpRgb(lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc)), GRASS_GREEN, 1)
    if (sc.zones.groundDecorRight) return sc._grassColorSettled
    const side = blade.x >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
    if (side === 'left') {
      if (!zones.groundDecorLeft) return null
      const leftFade = sc.leftDecorFade ?? 1
      if (leftFade < 0.04) return null
      return leftFade >= 1
        ? sc._grassColorSettled
        : { ...sc._grassColorSettled, opacity: leftFade }
    }
    const strip = groundRightStripIndexForX(blade.x, GROUND_REVEAL_TREE_PAST_X, zones._groundStripEndX ?? WORLD_W)
    const op = glowRightWorldOpacity(sc, blade.x, strip >= 3 ? 'small' : 'large')
    if (op < 0.04) return null
    return op >= 1
      ? sc._grassColorSettled
      : { ...sc._grassColorSettled, opacity: op }
  }
  if (sc && (sc.colorFade ?? 0) >= 1 && zones.groundDecorRight && (sc.leftDecorFade ?? 1) >= 1) {
    if (isGlowFlatSingleDecorColor(sc)) return DECOR_GRAY
    sc._grassColorSettled ??= lerpRgb(lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc)), GRASS_GREEN, 1)
    return sc._grassColorSettled
  }
  const side = blade.x >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
  if (side === 'left') {
    if (!zones.groundDecorLeft) return null
    const leftFade = sc?.leftDecorFade ?? 1
    if (leftFade < 0.04) return null
    if (sc && isGlowFlatSingleDecorColor(sc)) return leftFade >= 1 ? DECOR_GRAY : { ...DECOR_GRAY, opacity: leftFade }
    const fade = sc?.colorFade ?? 0
    if (fade >= 1 && leftFade >= 1) {
      sc._grassColorSettled ??= lerpRgb(lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc)), GRASS_GREEN, 1)
      return sc._grassColorSettled
    }
    const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
    const rgb = fade >= 1
      ? (sc._grassColorSettled ??= lerpRgb(gray, GRASS_GREEN, 1))
      : lerpRgb(gray, GRASS_GREEN, fade)
    return { ...rgb, opacity: leftFade }
  }
  const strip = groundRightStripIndexForX(blade.x, GROUND_REVEAL_TREE_PAST_X, zones._groundStripEndX ?? WORLD_W)
  const op = glowRightWorldOpacity(sc, blade.x, strip >= 3 ? 'small' : 'large')
  if (op < 0.04) return null
  if (sc && isGlowFlatSingleDecorColor(sc)) return op >= 1 ? DECOR_GRAY : { ...DECOR_GRAY, opacity: op }
  const fade = sc?.colorFade ?? 0
  if (fade >= 1) {
    sc._grassColorSettled ??= lerpRgb(
      lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc)),
      GRASS_GREEN,
      1
    )
    if (op >= 1) return sc._grassColorSettled
    const settled = sc._grassColorSettled
    return { r: settled.r, g: settled.g, b: settled.b, opacity: op }
  }
  const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
  const rgb = lerpRgb(gray, GRASS_GREEN, fade)
  return op >= 1 ? rgb : { ...rgb, opacity: op }
}
//
// Foreground grass only sways once the meditation countdown is running (or
// after O opens). The whole level stays still from the first frame until
// then — including before the L pickup.
//
function glowGrassSwayScale(zones) {
  const sc = zones._sceneRef
  if (!sc) return 0
  return glowMeditationWorldLife(sc)
}
//
// Shared 0→1 life factor for grass sway, midges, birds and mushroom lean.
// 0 from level start through the post-L stillness wait; fades in while the
// O-meditation countdown runs; locked at 1 once the O zone is open.
//
function glowMeditationWorldLife(inst) {
  const z = inst.zones
  if (z.oZone || z.oCollected) return 1
  if (inst.meditation?.countdown != null) return inst.meditationWorldLife ?? 0
  return 0
}
//
// Rocks — flat value 5 silhouettes.
//
function createGlowRocks(k, treeBaseLeftX, waterRightX, rightPlatX, trampX, branchTrampX, zones, decorAtlas) {
  const objs = []
  const clusterCenterX = treeBaseLeftX + 40
  for (let i = 0; i < 6; i++) {
    const radius = CLUSTER_ROCK_RADIUS_MIN + Math.random() * (CLUSTER_ROCK_RADIUS_MAX - CLUSTER_ROCK_RADIUS_MIN)
    const angle = (Math.PI / 5) * i
    const spread = 35 + Math.random() * 25
    const cx = clusterCenterX + Math.cos(angle) * spread * 0.5
    objs.push(placeRock(k, cx, radius, 'left', true, 7, 1, decorAtlas, zones))
  }
  //
  // Tree-side end of the lake — two rocks with the water edge between them.
  //
  const endRockR = CLUSTER_ROCK_RADIUS_MIN + Math.random() * (CLUSTER_ROCK_RADIUS_MAX - CLUSTER_ROCK_RADIUS_MIN) * 0.85
  //
  // Sits right beside the tree trunk sprite — a higher z than the trunk's
  // full-world canvas (z = platforms - 2) guarantees it always renders on
  // top, regardless of scene-graph insertion order at equal z values.
  //
  const shoreRockBefore = placeRock(k, waterRightX - WATER_END_ROCK_BEFORE_X, endRockR, 'left', false, SHORE_END_ROCK_Z, SHORE_ROCK_WIDTH_SCALE, decorAtlas, zones)
  shoreRockBefore._lakeShoreEnd = true
  shoreRockBefore._shoreTreeSide = true
  objs.push(shoreRockBefore)
  const endRockR2 = CLUSTER_ROCK_RADIUS_MIN + Math.random() * (CLUSTER_ROCK_RADIUS_MAX - CLUSTER_ROCK_RADIUS_MIN) * 0.75
  const shoreRockAfter = placeRock(k, waterRightX + WATER_END_ROCK_AFTER_X, endRockR2, 'left', false, SHORE_END_ROCK_Z, SHORE_ROCK_WIDTH_SCALE * 0.9, decorAtlas, zones)
  shoreRockAfter._lakeShoreEnd = true
  objs.push(shoreRockAfter)
  //
  // Right side — scatter rocks spread across the whole lower-right ground,
  // never in front of the trampoline mushroom (resampled out of its zone).
  //
  //
  // Scatter rocks stay left of the cave mouth (no stone above the entrance)
  //
  const rightEdge = getCrackZone(WORLD_W, FLOOR_Y).x1 - 40
  const stripStartX = GROUND_REVEAL_TREE_PAST_X
  const nearTramp = (x) => Math.abs(x - trampX) <= TRAMP_ROCK_CLEAR_HALF ||
    Math.abs(x - branchTrampX) <= TRAMP_ROCK_CLEAR_HALF
  const badRock = (x) => nearTramp(x) || isCrackDecorExcluded(x, WORLD_W)
  for (let i = 0; i < RIGHT_ROCK_COUNT; i++) {
    const radius = SCATTER_ROCK_RADIUS_MIN + Math.random() * (SCATTER_ROCK_RADIUS_MAX - SCATTER_ROCK_RADIUS_MIN)
    const span = Math.max(40, rightEdge - TREE_X - 80)
    let cx = TREE_X + 80 + Math.random() * span
    let safety = 0
    while (badRock(cx) && safety < 40) {
      cx = TREE_X + 80 + Math.random() * span
      safety++
    }
    if (badRock(cx)) continue
    const rock = placeRock(k, cx, radius, 'right', false, 7, 1, decorAtlas, zones)
    rock._rightStrip = groundRightStripIndexForX(cx, stripStartX, rightEdge)
    objs.push(rock)
  }
  return objs
}
//
// Pre-renders a flat rock sprite.
//
function placeRock(k, worldX, radius, side, waterCluster = false, z = 7, widthScale = 1, decorAtlas, zones) {
  const totalW = Math.ceil(radius * 2.6 * widthScale)
  const totalH = Math.ceil(radius * 1.9)
  const cx = totalW / (2 * widthScale)
  const cy = totalH * 0.56
  const randSink = Math.random() * 3
  const croppedH = Math.max(8, Math.ceil(totalH * 0.62 - randSink))
  const posY = FLOOR_Y - croppedH
  const verts = buildRockVertices(radius)
  //
  // Fill stays a single flat tone (the pre-L world is strictly one decor
  // gray); the dark rim is what makes the silhouette read clearly against
  // the ground — shading only arrives after L via
  // rebakeGlowRockSpritesShaded.
  //
  const flatPalette = {
    fillR: DECOR_GRAY.r, fillG: DECOR_GRAY.g, fillB: DECOR_GRAY.b,
    lightR: DECOR_GRAY.r, lightG: DECOR_GRAY.g, lightB: DECOR_GRAY.b,
    darkR: DECOR_GRAY.r, darkG: DECOR_GRAY.g, darkB: DECOR_GRAY.b
  }
  const bakeRock = () => toCanvas({ width: totalW, height: croppedH, pixelRatio: 1 }, (ctx) => {
    ctx.scale(widthScale, 1)
    drawRockToCanvas(ctx, {
      cx, cy, radius, verts, palette: flatPalette,
      flatFill: true,
      skipShadow: true,
      outlineColor: `rgb(${ROCK_OUTLINE_RGB.r}, ${ROCK_OUTLINE_RGB.g}, ${ROCK_OUTLINE_RGB.b})`,
      outlineWidth: ROCK_OUTLINE_WIDTH,
      outlineAlpha: 1
    })
  })
  const bakedGray = decorAtlas.register(bakeRock())
  const bakedOutline = decorAtlas.register(bakeRock())
  const obj = k.add([
    k.pos(worldX - totalW / 2, posY),
    k.z(z),
    {
      opacity: 1,
      color: k.rgb(255, 255, 255),
      _bakedGray: bakedGray,
      _bakedOutline: bakedOutline,
      _outlined: false,
      draw() {
        if (this.hidden) return
        const sc = zones._sceneRef
        const fade = glowDecorFade(sc)
        const grayBaked = this._bakedGray
        const white = k.rgb(255, 255, 255)
        if (sc && isGlowColorTransitionActive(sc) && this._bakedOutline) {
          drawDecorAtlasCrossfade(k, grayBaked, this._bakedOutline, k.vec2(0, 0), 'topleft', 0, fade, this.color, white)
          return
        }
        drawDecorAtlasSprite(k, this._outlined ? this._bakedOutline : grayBaked, k.vec2(0, 0), 'topleft', 0, this.opacity, this.color)
      }
    }
  ])
  obj._side = side
  obj._waterCluster = waterCluster
  obj._homeX = worldX - totalW / 2
  obj._homeY = posY
  obj._decorWorldX = worldX
  obj._detailRank = radius < 16 ? 'small' : 'large'
  obj._rockBake = {
    cx,
    cy,
    radius,
    verts,
    widthScale,
    totalW,
    croppedH
  }
  obj.hidden = true
  obj.pos.y = PLATFORM_HIDE_Y
  return obj
}
//
// Mushrooms — value 5, excluded from water zone.
//
function createGlowMushrooms(k, waterX1, waterX2, trampX, branchTrampX, zones, decorAtlas) {
  const objs = []
  const left = LEFT_MARGIN + 60
  //
  // Decor mushrooms stay left of the cave mouth (never above the entrance)
  //
  const right = getCrackZone(WORLD_W, FLOOR_Y).x1 - 48
  //
  // A random X is rejected while it falls inside the water band OR inside
  // the keep-out band around the trampoline mushroom (nothing may cover it).
  //
  const isBadSpot = (x) => (x >= waterX1 && x <= waterX2) ||
    Math.abs(x - trampX) <= TRAMP_MUSHROOM_CLEAR_HALF ||
    Math.abs(x - branchTrampX) <= TRAMP_MUSHROOM_CLEAR_HALF ||
    isCrackDecorExcluded(x, WORLD_W)
  for (let i = 0; i < MUSHROOM_COUNT; i++) {
    const capW = MUSHROOM_CAP_W_MIN + Math.random() * (MUSHROOM_CAP_W_MAX - MUSHROOM_CAP_W_MIN)
    const mushW = Math.ceil(capW)
    const totalW = mushW + 2
    const totalH = Math.ceil(mushW * CUTE_MUSHROOM_ASPECT) + 2
    const span = Math.max(40, right - left)
    let posX = left + Math.random() * span
    let safety = 0
    while (isBadSpot(posX) && safety < 40) {
      posX = left + Math.random() * span
      safety++
    }
    if (isBadSpot(posX)) continue
    const posY = FLOOR_Y - totalH + MUSHROOM_EXTRA_LOWER
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
    const bakedGray = decorAtlas.register(mushCanvas)
    const flatMushColors = getCuteMushroomFlatDecorColors()
    const mushFlatCanvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawCuteMushroomToCanvas(ctx, {
        cx: totalW / 2,
        baseY: totalH - 2,
        width: mushW,
        colors: flatMushColors,
        withFace: false
      })
    })
    const bakedFlat = decorAtlas.register(mushFlatCanvas)
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
    const bakedOutline = decorAtlas.register(mushColorCanvas)
    //
    // Anchor at the base so whistle lean rotates around the ground, not the cap
    //
    const baseX = posX
    const baseY = FLOOR_Y + MUSHROOM_EXTRA_LOWER
    const obj = k.add([
      k.pos(baseX, baseY),
      k.z(7),
      {
        opacity: 1,
        color: k.rgb(255, 255, 255),
        angle: 0,
        _bakedGray: bakedGray,
        _bakedFlat: bakedFlat,
        _bakedOutline: bakedOutline,
        _outlined: false,
        draw() {
          if (this.hidden) return
          const sc = zones._sceneRef
          const fade = glowDecorFade(sc)
          const grayBaked = zones.lCollected ? this._bakedGray : this._bakedFlat
          const white = k.rgb(255, 255, 255)
          if (sc && isGlowColorTransitionActive(sc) && this._bakedOutline) {
            drawDecorAtlasCrossfade(k, grayBaked, this._bakedOutline, k.vec2(0, 0), 'bot', this.angle, fade, this.color, white)
            return
          }
          const baked = this._outlined ? this._bakedOutline : grayBaked
          drawDecorAtlasSprite(k, baked, k.vec2(0, 0), 'bot', this.angle, this.opacity, this.color)
        }
      }
    ])
    obj._side = posX >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
    obj._decorWorldX = posX
    obj._rightStrip = obj._side === 'right'
      ? groundRightStripIndexForX(posX, GROUND_REVEAL_TREE_PAST_X, right)
      : -1
    obj._homeX = baseX
    obj._homeY = baseY
    obj._detailRank = capW < 28 ? 'small' : 'large'
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
function createMushroomTrampoline(k, trampX, floorY, zones, opts = {}) {
  const gateBranchTramp = Boolean(opts.gateBranchTramp)
  const trampGrayColors = zones.lCollected
    ? CUTE_MUSH_GRAY_COLORS
    : getCuteMushroomFlatWaterColors()
  bakeTrampolineVariant(k, TRAMP_SPRITE, trampGrayColors, true)
  bakeTrampolineVariant(k, TRAMP_SPRITE + TRAMP_BLINK_SPRITE_SUFFIX, trampGrayColors, false)
  bakeTrampolineVariant(k, TRAMP_OUTLINE_SPRITE, CUTE_MUSH_COLORS, true)
  bakeTrampolineVariant(k, TRAMP_OUTLINE_SPRITE + TRAMP_BLINK_SPRITE_SUFFIX, CUTE_MUSH_COLORS, false)
  const state = {
    squash: 0,
    cooldown: 0,
    x: trampX,
    homeX: trampX,
    hasLegs: false,
    walkPhase: 0,
    blinking: false,
    blinkTimer: TRAMP_BLINK_MIN_INTERVAL + Math.random() * (TRAMP_BLINK_MAX_INTERVAL - TRAMP_BLINK_MIN_INTERVAL),
    leanAngle: 0
  }
  const colliderHome = { x: trampX - TRAMP_CAP_W / 2, y: floorY - TRAMP_TOTAL_H }
  const drawLayer = k.add([
    k.z(opts.drawZ ?? 6),
    {
      draw() {
        if (gateBranchTramp) {
          if (!isBranchTrampolineVisible(zones)) return
        } else if (!isRightTrampolineVisible(zones)) {
          return
        }
        //
        // Colour world swaps in the coloured sprite set; the gray phase
        // applies the after-L darkening tint (white = untinted). A blink
        // swaps to the closed-eyes variant of the current set.
        //
        const previewFade = zones.colorWorld ? 1 : glowDecorFade(zones._sceneRef)
        const graySprite = TRAMP_SPRITE
        const colorSprite = TRAMP_OUTLINE_SPRITE
        const sc = zones._sceneRef
        const flatDecor = sc && isGlowFlatSingleDecorColor(sc)
        const grayTint = grayDecorTint(sc)
        const white = { r: 255, g: 255, b: 255 }
        const untinted = k.rgb(255, 255, 255)
        const grayColor = flatDecor ? untinted : k.rgb(grayTint.r, grayTint.g, grayTint.b)
        const colorTint = lerpRgb(grayTint, white, previewFade)
        const colorColor = flatDecor ? untinted : k.rgb(colorTint.r, colorTint.g, colorTint.b)
        const enduring = Boolean(state.enduring)
        const angle = enduring ? 0 : (state.leanAngle || 0)
        const drawX = state.x + (state.endureShakeX || 0)
        const scaleY = enduring
          ? (state.endureScaleY || 1)
          : (state.squash > 0.01 ? 1 - state.squash * 0.35 : 1)
        const eyesClosed = enduring || state.blinking
        const grayEyes = eyesClosed ? graySprite + TRAMP_BLINK_SPRITE_SUFFIX : graySprite
        const colorEyes = eyesClosed ? colorSprite + TRAMP_BLINK_SPRITE_SUFFIX : colorSprite
        state.hasLegs && drawTrampolineLegs(k, state, floorY, grayColor, flatDecor)
        const drawTrampSprite = (sprite, opacity, color) => {
          k.drawSprite({
            sprite,
            pos: k.vec2(drawX, floorY + TRAMP_SINK_Y),
            anchor: 'bot',
            scale: k.vec2(1, scaleY),
            angle,
            color,
            opacity
          })
        }
        if (!zones.colorWorld && isGlowColorTransitionActive(sc)) {
          const grayOp = 1 - previewFade
          grayOp > COLOR_CROSSFADE_EPS && drawTrampSprite(grayEyes, grayOp, grayColor)
          previewFade > COLOR_CROSSFADE_EPS && drawTrampSprite(colorEyes, previewFade, colorColor)
          return
        }
        const sprite = (zones.colorWorld || previewFade >= 1 - COLOR_CROSSFADE_EPS) ? colorEyes : grayEyes
        const color = (zones.colorWorld || previewFade >= 1 - COLOR_CROSSFADE_EPS) ? colorColor : grayColor
        drawTrampSprite(sprite, 1, color)
      }
    }
  ])
  drawLayer.onUpdate(() => onUpdateTrampolineBlink(k, state))
  drawLayer.hidden = gateBranchTramp
    ? !isBranchTrampolineVisible(zones)
    : !isRightTrampolineVisible(zones)
  return { state, drawLayer, colliderHome, gateBranchTramp }
}
//
// Walking legs — alternating stride with a short shin kick
//
function drawTrampolineLegs(k, state, floorY, color, flatTone = false) {
  const phase = state.walkPhase || 0
  const stride = Math.sin(phase)
  const stride2 = Math.sin(phase + Math.PI)
  const legC = flatTone ? color : k.rgb(DECOR_OUTLINE_RGB.r, DECOR_OUTLINE_RGB.g, DECOR_OUTLINE_RGB.b)
  const footC = flatTone ? color : k.rgb(VOID.r, VOID.g, VOID.b)
  drawOneTrampLeg(k, state.x - 9, floorY, stride, legC, footC)
  drawOneTrampLeg(k, state.x + 9, floorY, stride2, legC, footC)
}
function drawOneTrampLeg(k, hipX, floorY, stride, legC, footC) {
  const kneeX = hipX + stride * 5
  const kneeY = floorY - 10 - Math.max(0, -stride) * 4
  const footX = hipX + stride * 9
  const footY = floorY - 1
  k.drawLine({
    p1: k.vec2(hipX, floorY - 14),
    p2: k.vec2(kneeX, kneeY),
    width: 3.2,
    color: legC
  })
  k.drawLine({
    p1: k.vec2(kneeX, kneeY),
    p2: k.vec2(footX, footY),
    width: 2.6,
    color: legC
  })
  k.drawEllipse({
    pos: k.vec2(footX + 2, footY),
    radiusX: 5.5,
    radiusY: 2.4,
    color: footC
  })
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
      eyesOpen,
      eyeScale: TRAMP_FACE_EYE_SCALE
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
  if (state.enduring) {
    state.blinking = true
    return
  }
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
  const waterY = WATER_SURFACE_Y
  const ptsCache = Array.from({ length: (LAKE_SEGMENTS + 1) * 2 }, () => k.vec2(0, 0))
  const layer = k.add([
    k.z(LAKE_Z),
    {
      draw() {
        if (!zones.water) return
        const sc = zones._sceneRef
        const cam = sc?.camera
        if (cam) {
          const zoom = cam.zoom || 1
          const halfW = cam.viewW / (2 * zoom) + LAKE_SURFACE_CULL_MARGIN
          const camX = k.camPos().x
          if (x2 < camX - halfW || x1 > camX + halfW) return
        }
        const twoTone = sc && isGlowFlatSingleDecorColor(sc)
        const fade = sc?.colorFade ?? 0
        let c
        if (fade >= 1 && sc?._lakeColorSettled) {
          c = sc._lakeColorSettled
        } else {
          const gray = twoTone ? DECOR_GRAY : lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
          const tint = { r: WATER_COLOR.r, g: WATER_COLOR.g, b: WATER_COLOR.b }
          c = twoTone ? DECOR_GRAY : lerpRgb(gray, tint, fade)
          fade >= 1 && sc && (sc._lakeColorSettled = c)
        }
        fillLakeSurfaceAndBed(ptsCache, x1, x2, waterY, k.time())
        const rgb = sc?._lakeDrawRgb
        if (!rgb || rgb.r !== c.r || rgb.g !== c.g || rgb.b !== c.b) {
          sc && (sc._lakeDrawRgb = k.rgb(c.r, c.g, c.b))
        }
        k.drawPolygon({ pts: ptsCache, color: (sc && sc._lakeDrawRgb) || k.rgb(c.r, c.g, c.b) })
      }
    }
  ])
  //
  // Stay off the draw list until the left-of-tree water zone opens.
  //
  layer.hidden = !zones.water
  return layer
}
//
// Draws lake cap rocks above grass and the water fill (sprites stay off-screen).
//
function createLakeShoreRockLayer(k, zones) {
  return k.add([
    k.z(SHORE_END_ROCK_Z),
    {
      draw() {
        const sc = zones._sceneRef
        sc && drawLakeShoreRocksWorld(sc)
      }
    }
  ])
}
//
// Below-surface cover during drowning — same surface-to-bed silhouette as the
// lake fill, drawn at DROWN_COVER_Z so it stays behind LAKE_Z. A separate
// narrow below-bed strip (ground colour) only tracks the sinking hero.
//
function createDrownMask(k, x1, x2, zones) {
  const waterY = WATER_SURFACE_Y
  const maskPts = Array.from({ length: (LAKE_SEGMENTS + 1) * 2 }, () => k.vec2(0, 0))
  return k.add([
    k.z(DROWN_COVER_Z),
    {
      draw() {
        const sc = zones._sceneRef
        if (!sc?.drowning) return
        const fade = sc.colorFade ?? 0
        const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
        const tint = { r: WATER_COLOR.r, g: WATER_COLOR.g, b: WATER_COLOR.b }
        const c = lerpRgb(gray, tint, fade)
        const color = k.rgb(c.r, c.g, c.b)
        fillLakeSurfaceAndBed(maskPts, x1, x2, waterY, k.time())
        k.drawPolygon({ pts: maskPts, color })
        drawDrownBelowBedHeroCover(sc, k, x1, x2, waterY)
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
    const wavePrimary = Math.sin(time * LAKE_WAVE_FREQ + t * LAKE_WAVE_PHASE_SCALE) * LAKE_WAVE_AMP
    const waveSecondary = Math.sin(time * LAKE_WAVE_SECOND_FREQ + t * LAKE_WAVE_PHASE_SCALE * 2.3) * LAKE_WAVE_SECOND_AMP
    const wave = wavePrimary + waveSecondary
    ptsCache[i].x = x
    ptsCache[i].y = waterY + wave
    const bi = (LAKE_SEGMENTS + 1) * 2 - 1 - i
    ptsCache[bi].x = x
    ptsCache[bi].y = waterY + waterBedDepthAt(t)
  }
}
//
// Ground band colour for the below-bed drown cover (matches onDraw earth).
//
function getDrownCoverGroundRgb(inst) {
  const fade = inst.colorFade ?? 0
  const zones = inst.zones
  const innerGray = isOuterFrameVisible(zones) && isPlayfieldInnerGrayVisible(zones, fade)
  const grayGround = zones.lZone && innerGray ? lerpRgb(INNER_GRAY, VOID, GROUND_L_DARKEN) : (innerGray ? INNER_GRAY : VOID)
  return lerpRgb(grayGround, GROUND_DARK, fade)
}
//
// Lake bed world Y at horizontal X inside the lake span.
//
function waterBedYAtX(x, x1, x2, waterY) {
  const span = Math.max(1, x2 - x1)
  const t = Math.max(0, Math.min(1, (x - x1) / span))
  return waterY + waterBedDepthAt(t)
}
//
// Hides the hero only after he sinks past the visible lake bed — narrow
// ground-toned strip at the hero's X, not a full-width sheet over the roots.
//
function drawDrownBelowBedHeroCover(inst, k, x1, x2, waterY) {
  const char = inst.heroInst?.character
  if (!char?.pos) return
  const heroX = char.pos.x
  const lakeRight = x2 + DROWN_MASK_RIGHT_PAD
  if (heroX < x1 - 8 || heroX > lakeRight + 8) return
  const footY = char.pos.y + SURFACE_DETECT_Y
  const bedY = waterBedYAtX(heroX, x1, x2, waterY)
  //
  // The bed's shallow-end chaos wiggle can sit above the hero's own starting
  // stand line (most visible falling into the shore-side shallow water off
  // the tree branch) — clamping the trigger to whichever line is lower stops
  // the cover from snapping in instantly on landing, before any real sink.
  //
  const coverLine = Math.max(bedY, inst.drownCoverStartFootY ?? bedY)
  if (footY <= coverLine + 1) return
  const ground = getDrownCoverGroundRgb(inst)
  const color = k.rgb(ground.r, ground.g, ground.b)
  const halfW = DROWN_BELOW_BED_COVER_HALF_W
  k.drawRect({
    pos: k.vec2(heroX - halfW, bedY),
    width: halfW * 2,
    height: PLAYFIELD_BOTTOM_Y - bedY,
    color
  })
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
// True when the given feet position sits on any wood surface (branch or log
// platform), regardless of the hero's grounded state that frame.
//
function isOverGlowWoodSurface(inst, footX, footY) {
  const list = inst?.woodSurfaces
  if (!list) return false
  return list.some(s => footX >= s.x1 - WOOD_FOOT_X_PAD && footX <= s.x2 + WOOD_FOOT_X_PAD &&
    footY >= s.y - WOOD_FOOT_Y_PAD_ABOVE && footY <= s.y + s.h + WOOD_FOOT_Y_PAD_BELOW)
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
  return zones.groundBg || zones.lZoneParallax || fade > 0 || zones.lCollected || zones.oZone
}
//
// Keeps Kaplay clear colour and page chrome aligned with the outer frame.
//
function syncGlowCanvasBackdrop(k, zones) {
  CanvasBackdrop.applyCanvasBackdrop(k, isOuterFrameVisible(zones) ? OUTER_BG_HEX : GLOW_PAL.void)
}
//
// Visible world X span for culling full-width baked layers to the viewport.
//
function visibleWorldXRange(inst, extraPad = PARALLAX_DRAW_CULL_PAD) {
  const k = inst.k
  const camX = k.camPos().x
  const zoom = inst.camera?.zoom || 1
  const half = (inst.camera?.viewW || VIEW_W) / (2 * zoom) + extraPad
  return { left: camX - half, right: camX + half }
}
//
// Draws only the on-screen slice of a world-anchored sprite (0..WORLD_W).
//
function drawWorldSpriteClipped(k, inst, sprite, opacity = 1) {
  const { left: visLeft, right: visRight } = visibleWorldXRange(inst)
  const clipLeft = Math.max(0, visLeft)
  const clipRight = Math.min(WORLD_W, visRight)
  if (clipRight <= clipLeft + 1) return
  const w = clipRight - clipLeft
  const opts = {
    sprite,
    pos: k.vec2(clipLeft, 0),
    width: w,
    height: WORLD_H,
    quad: { x: clipLeft / WORLD_W, y: 0, w: w / WORLD_W, h: 1 },
    anchor: 'topleft'
  }
  opacity < 0.999 && (opts.opacity = opacity)
  k.drawSprite(opts)
}
//
// Draws only the on-screen slice of one parallax layer sprite.
//
function drawParallaxSpriteClipped(k, inst, spriteName, speed, horizBleed, opacity = 1) {
  const camera = inst.camera
  const drawX = GlowCamera.getParallaxDrawX(camera, speed, horizBleed)
  const pad = GlowCamera.getParallaxLayerPad(camera, speed, horizBleed)
  const spriteW = WORLD_W + pad * 2
  const { left: visLeft, right: visRight } = visibleWorldXRange(inst, horizBleed + PARALLAX_DRAW_CULL_PAD)
  const clipLeft = Math.max(visLeft, drawX)
  const clipRight = Math.min(visRight, drawX + spriteW)
  if (clipRight <= clipLeft + 1) return
  const w = clipRight - clipLeft
  const opts = {
    sprite: spriteName,
    pos: k.vec2(clipLeft, 0),
    width: w,
    height: WORLD_H,
    quad: { x: (clipLeft - drawX) / spriteW, y: 0, w: w / spriteW, h: 1 },
    anchor: 'topleft'
  }
  opacity < 0.999 && (opts.opacity = opacity)
  k.drawSprite(opts)
}
//
// Main draw — void until G opens the outer frame; inner gray after L/O.
//
function onDraw(inst) {
  const k = inst.k
  const fade = inst.colorFade
  const zones = inst.zones
  const outerFrame = isOuterFrameVisible(zones)
  const innerGray = isPlayfieldInnerGrayVisible(zones, fade)
  const flatExplore = isGlowFlatSingleDecorColor(inst)
  //
  // Read again just before the post-parallax ground repaint below — see that
  // call site for why the fill must be reapplied after the tree/bush layers.
  //
  let groundFillC = null
  if (outerFrame) {
    let inner = innerGray ? INNER_GRAY : VOID
    if (flatExplore && !innerGray) {
      inner = DECOR_GRAY
    }
    //
    // Colour world splits the playfield backdrop at the ground line: a
    // bright warm orange haze above it (the glowing distance seen between
    // the trunks at the screen centre), dark earth in the root zone below.
    // Both lerp from the flat inner gray as the colour fade progresses.
    //
    const grayGround = flatExplore && !innerGray
      ? DECOR_GRAY
      : (zones.lZone && innerGray ? lerpRgb(INNER_GRAY, VOID, GROUND_L_DARKEN) : inner)
    const skyC = flatExplore && !innerGray ? DECOR_GRAY : lerpRgb(inner, WARM_HAZE, fade)
    const groundC = flatExplore && !innerGray ? DECOR_GRAY : lerpRgb(grayGround, GROUND_DARK, fade)
    groundFillC = groundC
    //
    // Sky scrolls on its own parallax layer once the forest is revealed.
    // Crossfade flat rects out as parallaxFade rises so the preview never pops.
    //
    const parallaxMix = zones.lZoneParallax ? (inst.parallaxFade ?? 0) : 0
    const fallbackOp = zones.lZoneParallax ? Math.max(0, 1 - parallaxMix) : 1
    fallbackOp > COLOR_CROSSFADE_EPS && k.drawRect({
      pos: k.vec2(LEFT_MARGIN, TOP_MARGIN),
      width: GAME_W,
      height: FLOOR_Y - TOP_MARGIN,
      color: k.rgb(skyC.r, skyC.g, skyC.b),
      opacity: fallbackOp
    })
    //
    // Once the parallax stack is active, its opaque static ground+underground
    // sprite (drawn below) fully repaints this exact band on top — this fill
    // would be immediately hidden and is a wasted full-width draw every frame.
    //
    fallbackOp > COLOR_CROSSFADE_EPS && k.drawRect({
      pos: k.vec2(LEFT_MARGIN, FLOOR_Y),
      width: GAME_W,
      height: WORLD_H - FLOOR_Y,
      color: k.rgb(groundC.r, groundC.g, groundC.b),
      opacity: fallbackOp
    })
  }
  if (inst.zones.lZoneParallax) {
    //
    // Back-to-front: sky → far/mid/near forest (bushes baked onto trees),
    // then static ground. Birds sit right after the opaque sky fill.
    //
    const pf = inst.parallaxFade
    const skyLayer = { gray: BG_PAR_SKY_GRAY, color: BG_PAR_SKY_COLOR, speed: PAR_SKY_SPEED, bleed: 0 }
    const parFar = { gray: BG_PAR_TREE3_GRAY, color: BG_PAR_TREE3_COLOR, speed: PAR_TREE3_SPEED, bleed: PAR_TREE_HORIZ_BLEED }
    const parMid = { gray: BG_PAR_TREE2_GRAY, color: BG_PAR_TREE2_COLOR, speed: PAR_TREE2_SPEED, bleed: PAR_TREE_HORIZ_BLEED }
    const parNear = { gray: BG_PAR_TREE1_GRAY, color: BG_PAR_TREE1_COLOR, speed: PAR_TREE1_SPEED, bleed: PAR_TREE_HORIZ_BLEED }
    const drawParLayer = layer => {
      const colorForest = zones.colorWorld || isGlowMeditationColorPreview(inst) || fade > COLOR_CROSSFADE_EPS
      //
      // Permanent colour world: opaque viewport slices only.
      //
      if (zones.colorWorld) {
        if (fade >= 1 && pf >= 1) {
          drawParallaxSpriteClipped(k, inst, layer.color, layer.speed, layer.bleed)
          return
        }
        const op = fade * pf
        op > COLOR_CROSSFADE_EPS && drawParallaxSpriteClipped(k, inst, layer.color, layer.speed, layer.bleed, op)
        return
      }
      //
      // Meditation preview: crossfade gray forest → colour forest with the
      // hero's stillness countdown.
      //
      if (colorForest) {
        const grayOp = (1 - fade) * pf
        grayOp > COLOR_CROSSFADE_EPS && drawParallaxSpriteClipped(k, inst, layer.gray, layer.speed, layer.bleed, grayOp)
        fade > COLOR_CROSSFADE_EPS && drawParallaxSpriteClipped(k, inst, layer.color, layer.speed, layer.bleed, fade * pf)
        return
      }
      pf > COLOR_CROSSFADE_EPS && drawParallaxSpriteClipped(k, inst, layer.gray, layer.speed, layer.bleed, pf)
    }
    drawParLayer(skyLayer)
    const showBirds = fade > BIRD_VISIBLE_FADE_MIN &&
      (zones.colorWorld || zones.oZone || inst.meditation?.countdown != null)
    showBirds && drawBackgroundBirds(inst)
    drawParLayer(parFar)
    fade < 1 && drawAtmosphereHaze(inst, HAZE_FAR_OPACITY * pf)
    drawParLayer(parMid)
    fade < 1 && drawAtmosphereHaze(inst, HAZE_MID_OPACITY * pf)
    drawParLayer(parNear)
    fade < 1 && drawAtmosphereMotes(inst)
  } else {
    drawBackgroundBirds(inst)
  }
  //
  // Parallax tree sprites extend below the ground line. Cover that bleed
  // with the baked static earth+underground sprite (one draw) instead of a
  // fill rect plus a second underground sprite.
  //
  if (zones.lZoneParallax) {
    const pf = inst.parallaxFade ?? 0
    const groundFallbackOp = Math.max(0, 1 - pf)
    groundFallbackOp > COLOR_CROSSFADE_EPS && groundFillC && k.drawRect({
      pos: k.vec2(LEFT_MARGIN, FLOOR_Y),
      width: GAME_W,
      height: WORLD_H - FLOOR_Y,
      color: k.rgb(groundFillC.r, groundFillC.g, groundFillC.b),
      opacity: groundFallbackOp
    })
    const preview = isGlowMeditationColorPreview(inst) || isGlowColorTransitionActive(inst)
    if (zones.colorWorld || preview || fade > COLOR_CROSSFADE_EPS) {
      const grayOp = (1 - fade) * pf
      grayOp > COLOR_CROSSFADE_EPS && drawWorldSpriteClipped(k, inst, BG_STATIC_GRAY, grayOp)
      fade > COLOR_CROSSFADE_EPS && drawWorldSpriteClipped(k, inst, BG_STATIC_COLOR, fade * pf)
    } else {
      pf > COLOR_CROSSFADE_EPS && drawWorldSpriteClipped(k, inst, BG_STATIC_GRAY, pf)
    }
  } else if (groundFillC) {
    k.drawRect({
      pos: k.vec2(LEFT_MARGIN, FLOOR_Y),
      width: GAME_W,
      height: WORLD_H - FLOOR_Y,
      color: k.rgb(groundFillC.r, groundFillC.g, groundFillC.b)
    })
    drawUndergroundLayer(inst)
  } else {
    drawUndergroundLayer(inst)
  }
  //
  // Surface cracks / open cave on the far-right ground strip
  //
  const groundC = flatExplore && !innerGray
    ? DECOR_GRAY
    : (zones.lZone && innerGray
      ? lerpRgb(lerpRgb(INNER_GRAY, VOID, GROUND_L_DARKEN), GROUND_DARK, fade)
      : (innerGray ? lerpRgb(INNER_GRAY, GROUND_DARK, fade) : VOID))
  drawGlowPit(k, inst.pit, groundC, flatExplore && !innerGray)
  fade < 1 && drawExploredGroundLip(inst)
}
//
// Paints tree-side lake cap rocks when the water zone is open.
//
function drawLakeShoreRocksWorld(inst) {
  const z = inst.zones
  if (!z.water) return
  const k = inst.k
  const fade = glowDecorFade(inst)
  const white = k.rgb(255, 255, 255)
  const grayTint = grayDecorTint(inst)
  const grayColor = k.rgb(grayTint.r, grayTint.g, grayTint.b)
  inst.rockObjs.forEach(o => {
    if (!o._lakeShoreEnd) return
    if (isGlowColorTransitionActive(inst) && o._bakedOutline) {
      drawDecorAtlasCrossfade(k, o._bakedGray, o._bakedOutline, k.vec2(o._homeX, o._homeY), 'topleft', 0, fade, grayColor, white)
      return
    }
    const baked = (z.colorWorld && fade > COLOR_CROSSFADE_EPS) && o._bakedOutline ? o._bakedOutline : o._bakedGray
    drawDecorAtlasSprite(k, baked, k.vec2(o._homeX, o._homeY), 'topleft', 0, 1, white)
  })
}
//
// Draws the fixed HUD bar, bottom margin and side pillarbox strips in screen
// space on top of the scrolling world layer.
//
function drawFixedPlayfieldChrome(inst, outerFrame) {
  const k = inst.k
  if (!outerFrame) {
    k.drawRect({
      pos: k.vec2(0, 0),
      width: SCREEN_W,
      height: SCREEN_H,
      color: k.rgb(VOID.r, VOID.g, VOID.b),
      fixed: true
    })
    return
  }
  drawPlayfieldTopBar(inst)
  drawPlayfieldSideChrome(inst)
}
//
// Top HUD platform strip — sits below HUD letters (z = ui - 1).
//
function drawPlayfieldTopBar(inst) {
  const k = inst.k
  const outerColor = k.rgb(OUTER.r, OUTER.g, OUTER.b)
  k.drawRect({ pos: k.vec2(0, 0), width: SCREEN_W, height: PLAYFIELD_TOP_Y + TOP_MARGIN, color: outerColor, fixed: true })
}
//
// Side and bottom pillarbox — masks world bleeding past the rounded window.
// Both bars reach their real screen edge, covering the letterbox padding
// too on a taller-than-design window.
//
function drawPlayfieldSideChrome(inst) {
  const k = inst.k
  const outerColor = k.rgb(OUTER.r, OUTER.g, OUTER.b)
  k.drawRect({
    pos: k.vec2(0, PLAYFIELD_BOTTOM_Y),
    width: SCREEN_W,
    height: SCREEN_H - PLAYFIELD_BOTTOM_Y,
    color: outerColor,
    fixed: true
  })
  k.drawRect({
    pos: k.vec2(0, PLAYFIELD_TOP_Y + TOP_MARGIN),
    width: LEFT_MARGIN,
    height: VIEW_H,
    color: outerColor,
    fixed: true
  })
  k.drawRect({
    pos: k.vec2(SCREEN_W - RIGHT_MARGIN, PLAYFIELD_TOP_Y + TOP_MARGIN),
    width: RIGHT_MARGIN,
    height: VIEW_H,
    color: outerColor,
    fixed: true
  })
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
  if (inst._playfieldBorderT === t) return
  inst._playfieldBorderT = t
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
  const twoTone = isGlowFlatSingleDecorColor(inst)
  //
  // After L the gray decor phase runs darker — the base tone shifts toward
  // void and dissolves back as the colour world fades in.
  //
  const gray = twoTone ? DECOR_GRAY : lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(inst))
  const white = inst.k.rgb(255, 255, 255)
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
      const c = lerpRgb(gray, white, fade)
      obj.color = inst.k.rgb(c.r, c.g, c.b)
      return
    }
    obj.color = twoTone ? white : inst.k.rgb(grayTint.r, grayTint.g, grayTint.b)
  })
  updateRockTints(inst)
}
//
// Smooth lean toward each whistle note while the heroine sings idle
//
function updateMushroomWhistleLean(inst) {
  const hero = inst.heroInst
  const dt = inst.k.dt()
  const lifeMul = glowMeditationWorldLife(inst)
  //
  // Lean while the idle melody is active — including O-meditation countdown
  // (setEyesClosed clears eyesClosedBySinging, but the whistle keeps playing).
  //
  const singing = (hero?.idleStillTime ?? 0) >= GLOW_MUSHROOM_WHISTLE_IDLE
  const pulse = hero?.whistlePulse ?? 0
  const side = hero?.whistleLeanSide ?? 1
  const skipDecorLean = Boolean(inst.trampWalk?.walking)
  const tramp = inst.trampState
  !skipDecorLean && inst.mushObjs.forEach(obj => {
    if (obj.hidden) {
      obj.leanAngle = 0
      obj.angle = 0
      return
    }
    const target = singing
      ? side * GLOW_MUSHROOM_WHISTLE_AMP_DEG * pulse *
        (0.7 + 0.3 * Math.sin(obj._glowPhase || 0)) * lifeMul
      : 0
    obj.leanAngle += (target - obj.leanAngle) * Math.min(1, dt * GLOW_MUSHROOM_WHISTLE_SMOOTH)
    if (!singing && Math.abs(obj.leanAngle) < 0.15) obj.leanAngle = 0
    obj.angle = obj.leanAngle
  })
  //
  // Right trampoline stays still while the hero sings
  //
  tramp && (tramp.leanAngle = 0)
  const branchTramp = inst.branchTrampState
  if (branchTramp) {
    const target = singing
      ? side * GLOW_MUSHROOM_WHISTLE_AMP_DEG * pulse * 0.75 * lifeMul
      : 0
    branchTramp.leanAngle = (branchTramp.leanAngle ?? 0) +
      (target - (branchTramp.leanAngle ?? 0)) * Math.min(1, dt * GLOW_MUSHROOM_WHISTLE_SMOOTH)
    if (!singing && Math.abs(branchTramp.leanAngle) < 0.15) branchTramp.leanAngle = 0
  }
}
//
// Rocks are baked in DECOR_GRAY, so the after-L darkening is applied as a
// multiply tint. Outlined (colour-world) rocks always render untinted.
//
function updateRockTints(inst) {
  const fade = glowDecorFade(inst)
  const flat = isGlowFlatSingleDecorColor(inst)
  const white = inst.k.rgb(255, 255, 255)
  const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(inst))
  const tint = grayDecorTint(inst)
  inst.rockObjs.forEach(obj => {
    if (obj.hidden) return
    if (flat || !obj._outlined) {
      obj.color = inst.k.rgb(tint.r, tint.g, tint.b)
      return
    }
    const c = lerpRgb(gray, white, fade)
    obj.color = inst.k.rgb(c.r, c.g, c.b)
  })
}
//
// Midge colour follows the same gray→warm fade as the sky haze.
//
function syncGlowMidgeDrawColor(inst) {
  if (!inst.midges) return
  const fade = glowDecorFade(inst)
  if (isGlowFlatSingleDecorColor(inst)) {
    inst.midges.midgeRgb = DECOR_GRAY
    return
  }
  if (fade <= COLOR_CROSSFADE_EPS) {
    inst.midges.midgeRgb = glowRgb('void')
    return
  }
  inst.midges.midgeRgb = lerpRgb(glowRgb('void'), WARM_HAZE, fade)
}
//
// Swaps mushrooms and rocks to their outlined sprite variants once the colour
// world is at least half faded in (dark rims appear after O).
//
function updateDecorOutlines(inst) {
  const fade = glowDecorFade(inst)
  const outlined = (inst.zones.colorWorld || isGlowMeditationColorPreview(inst)) && fade > COLOR_CROSSFADE_EPS
  if (inst._decorOutlineState === outlined) return
  inst._decorOutlineState = outlined
  const swap = obj => {
    if (!obj._bakedOutline || obj._outlined === outlined) return
    obj._outlined = outlined
  }
  inst.mushObjs.forEach(swap)
  inst.rockObjs.forEach(swap)
}
//
// True when hero should drown — anywhere in the lake band at floor level.
//
function shouldDrownInWater(inst, heroX, footY) {
  //
  // Mid-bounce over the lake — never treat as a floor-level drown
  //
  if (inst.trampBounceAir || inst.branchTrampBounceAir) return false
  //
  // Standing / bouncing on the walking trampoline is safe over the lake
  //
  if (isOnTrampolineCap(inst, inst.heroInst?.character) ||
    isOnBranchTrampolineCap(inst, inst.heroInst?.character)) return false
  //
  // Over the start branch above the lake floor — not drowning yet
  //
  if (isHeroOverStartBranchX(inst, heroX) && footY < FLOOR_Y - 12) return false
  return isInWaterZone(inst, heroX, footY) && footY >= FLOOR_Y - LOG_SNAP_STANDING_MAX
}
//
// True when hero X sits over the invisible start branch span
//
function isHeroOverStartBranchX(inst, heroX) {
  const branch = inst.startBranch
  if (!branch) return false
  const w = branch.x2 - branch.x1
  return heroX >= branch.x1 - LOG_SNAP_X_SLACK && heroX <= branch.x1 + w + LOG_SNAP_X_SLACK
}
//
// Launches the hero from a mushroom cap when he lands on it (manual bounce).
//
function tryMushroomTrampBounce(inst, state, boostMult, hero, char, heroX, afterBounce, bounceAirKey = 'trampBounceAir') {
  if (!state || state.cooldown > 0) return false
  const heroFeet = char.pos.y + SURFACE_DETECT_Y
  const onCap = isHeroAtTrampolineCap(inst, heroX, heroFeet, state)
  if (!onCap || (char.vel?.y ?? 0) < -40) return false
  char.vel.y = -Math.round(CFG.game.jumpForce * boostMult)
  state.cooldown = TRAMP_COOLDOWN
  state.squash = TRAMP_SQUASH_MAX
  inst[bounceAirKey] = true
  hero.wasJumping = true
  hero.jumpPhase = 'jumping'
  hero.jumpCeilingBonk = false
  hero.postLandAirLock = 0
  hero.canJump = false
  inst.sound && !inst.sound._glowSfxMuted && Sound.playJumpSound(inst.sound)
  afterBounce?.()
  return true
}
//
// True when the hero's feet sit over a mushroom cap (position only).
//
function isHeroAtTrampolineCap(inst, heroX, footY, state) {
  if (!state) return false
  const capTopY = FLOOR_Y - TRAMP_TOTAL_H
  const mDx = Math.abs(heroX - state.x)
  return mDx < TRAMP_RADIUS + TRAMP_ADJACENT_X &&
    footY >= capTopY - 10 && footY <= capTopY + 22
}
//
// True when hero X is close enough that the trampoline pad should stay active
//
function isHeroNearTrampolineX(inst, heroX, state = inst.trampState) {
  if (!state) return false
  const branchPad = state === inst.branchTrampState
  const active = branchPad
    ? isBranchTrampolineVisible(inst.zones)
    : isRightTrampolineVisible(inst.zones)
  if (!active) return false
  return Math.abs(heroX - state.x) < TRAMP_NEAR_X
}
//
// True while the hero's feet sit on the trampoline mushroom cap
//
function isOnTrampolineCap(inst, char, state = inst.trampState) {
  if (!char?.pos || !state) return false
  const heroX = char.pos.x
  const heroFeet = char.pos.y + SURFACE_DETECT_Y
  if (!isHeroAtTrampolineCap(inst, heroX, heroFeet, state)) return false
  const branchPad = state === inst.branchTrampState
  return branchPad
    ? isBranchTrampolineVisible(inst.zones)
    : isRightTrampolineVisible(inst.zones)
}
//
// True while the hero's feet sit on the branch trampoline cap (right of the tree).
//
function isOnBranchTrampolineCap(inst, char) {
  return isOnTrampolineCap(inst, char, inst.branchTrampState)
}
//
// Keeps the invisible trampoline pad under the mushroom. The pad must NEVER
// teleport to PLATFORM_HIDE_Y / off-screen while the hero could be standing on
// it — Kaplay carries the body with a moved static platform (hero vanishes).
//
function syncTrampolinePad(inst) {
  syncOneTrampolinePad(inst, inst.trampPad, inst.trampState, 'trampBounceAir')
  syncOneTrampolinePad(inst, inst.branchTrampPad, inst.branchTrampState, 'branchTrampBounceAir')
}
//
// Positions one invisible cap collider — never hide it while the hero rides that cap.
//
function syncOneTrampolinePad(inst, pad, state, bounceAirKey) {
  const char = inst.heroInst?.character
  if (!pad || !state) return
  state._prevX = state.x
  const branchPad = state === inst.branchTrampState
  const colliderActive = branchPad
    ? isBranchTrampolineColliderActive(inst.zones)
    : isRightTrampolineColliderActive(inst.zones)
  const capTop = FLOOR_Y - TRAMP_TOTAL_H
  const velY = char?.vel?.y ?? 0
  const onCap = isOnTrampolineCap(inst, char, state)
  const heroFeet = char?.pos ? char.pos.y + SURFACE_DETECT_Y : 0
  const nearX = char?.pos ? Math.abs(char.pos.x - state.x) < TRAMP_NEAR_X : false
  const bounceAir = Boolean(inst[bounceAirKey])
  const grounded = typeof char?.isGrounded === 'function' && char.isGrounded()
  const inCapBand = heroFeet >= capTop - 14 && heroFeet <= capTop + TRAMP_PAD_FEET_BELOW
  //
  // Never yank the invisible pad off-screen while the hero rides the cap —
  // Kaplay carries static bodies with their platform (looks like he vanishes).
  //
  const needsPad = colliderActive && (onCap || bounceAir || (nearX && inCapBand &&
    (grounded || velY > -80)))
  if (!needsPad) {
    pad.pos.x = -500
    pad.pos.y = PLATFORM_HIDE_Y
    return
  }
  pad.pos.x = state.x
  pad.pos.y = capTop + TRAMP_PAD_H / 2
  if (bounceAir) {
    const groundedNow = typeof char?.isGrounded === 'function' && char.isGrounded()
    if ((onCap && velY >= -40) || (groundedNow && !onCap)) {
      inst[bounceAirKey] = false
    }
  }
}
//
// Branch collider always stays active — only the tree sprite toggles visibility.
//
function syncBranchPlatHome(inst) {
  const plat = inst.branchPlat
  const home = inst.branchPlatHome
  if (!plat || !home) return
  plat.pos.x = home.x
  plat.pos.y = home.y
}
//
// Starts the color-world fade after O dialog closes.
//
function startColorWorldFade(inst) {
  inst.zones.colorWorld = true
  inst.zones.groundBg = true
  set(KEY_REVEALED_GROUND_BG, true)
  inst.colorFadeTarget = 1
  inst.colorFade = Math.max(inst.colorFade ?? 0, inst.colorFadeTarget)
  inst.parallaxFade = inst.colorFade
  inst._meditationParallaxPreview = false
  revealLParallaxZone(inst)
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
    if (char?.vel) {
      char.vel.x = 0
      char.vel.y = 0
    }
    if (hero) {
      //
      // O log: gold bake briefly ungrounds — keep idle + Space gate so the
      // crouch→jump loop cannot restart on the wood after dialog.
      //
      forceHeroIdleOnLog(inst)
      Hero.armJumpKeyReleaseGate(hero)
      hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, 0.9)
      hero.canJump = false
      hero.wasJumping = false
      hero.jumpPhase = 'none'
      hero.jumpCeilingBonk = false
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
    if (hero.character.vel) {
      hero.character.vel.x = 0
      hero.character.vel.y = 0
    }
    try {
      Hero.syncPlatformLanding(hero)
      hero.character.use(k.sprite(`${hero.spritePrefix}_0_0`))
      hero.currentEyeSprite = `${hero.spritePrefix}_0_0`
      hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, 0.9)
      Hero.armJumpKeyReleaseGate(hero)
      hero.wasJumping = false
      hero.jumpPhase = 'none'
      hero.canJump = false
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
  inst.parallaxFade = inst.colorFade ?? 0
  set(KEY_REVEALED_L, true)
  syncGlowCanvasBackdrop(inst.k, inst.zones)
  applyZoneVisibility(inst)
}
//
// Short chime when a new world segment unlocks.
//
function playSegmentRevealSound(inst) {
  if (inst.sound?._glowSfxMuted) return
  Sound.playLetterPickupSoft(inst.sound)
}
//
// Rotates a local (dx, dy) offset by tiltDeg — used to keep the caption
// growing "downward" along the letter's own tilted axis instead of straight
// down on screen.
//
function rotateGlowOffset(dx, dy, tiltDeg) {
  const rad = tiltDeg * Math.PI / 180
  const cos = Math.cos(rad)
  const sin = Math.sin(rad)
  return { x: dx * cos - dy * sin, y: dx * sin + dy * cos }
}
//
// Splits a "before[hl]X[/hl]after" caption string into its plain-text parts.
// Falls back to putting everything in "after" if no [hl] marker is found.
//
function splitGlowCaptionText(text) {
  const match = text.match(/^([\s\S]*?)\[hl\](.)\[\/hl\]([\s\S]*)$/)
  return match ? { before: match[1], after: match[3] } : { before: '', after: text }
}
//
// Replaces the old modal letter dialog: the picked-up letter stays exactly
// where it was collected and becomes part of the caption word itself (e.g.
// the collected "G" becomes the "G" of "Ground"), with the rest of the
// sentence built to its left and right on the same tilted baseline. Any
// further wrapped lines grow centered below that first line. Everything
// fades in, holds for holdDuration, then fades out and is destroyed
// together. The pickup voice-over plays exactly as before. The hero keeps
// full control the whole time (runs, jumps, falls normally) — the caption
// never freezes him. The letter itself always keeps its usual gold fill,
// matching how it looked before pickup, in both flat and colour world modes.
//
function openGlowLetterCaption(inst, letterEntry, text, holdDuration, onCloseExtra, dialogSoundName = null) {
  const k = inst.k
  inst.dialogOpen = true
  playGlowLetterDialogMusic(inst, dialogSoundName)
  letterEntry && (letterEntry.forceVisible = true)
  //
  // The picked-up glyph is painted through the same k.text path as the
  // caption phrase so size and font metrics stay identical — the world
  // letter objects stay hidden for the caption's lifetime.
  //
  letterEntry?.allObjects?.forEach(obj => { obj.hidden = true })
  const font = GLOW_LETTER_FONT
  const letterFillRgb = letterEntry ? getRGB(k, letterEntry.colorHex || GLOW_GOLD_HEX) : null
  const { withShadow, withOutline, captionTextRgb } = glowLetterVisualStyle(inst)
  const tiltDeg = letterEntry?.tiltDeg ?? 0
  const { before, after } = splitGlowCaptionText(text)
  const afterLines = after.split('\n')
  const afterFirst = afterLines[0] || ''
  const restText = afterLines.slice(1).join('\n')
  //
  // Caption text matches the letter's own size (unchanged from before pickup)
  // so it reads as one continuous, uniformly sized piece of text.
  //
  const fontSize = GLOW_LETTER_SIZE
  const letterMeasure = k.formatText({ text: letterEntry?.char || '', size: fontSize, font })
  const letterHalfW = letterMeasure.width / 2
  const beforeWidth = before ? k.formatText({ text: before, size: fontSize, font }).width : 0
  const afterFirstWidth = afterFirst ? k.formatText({ text: afterFirst, size: fontSize, font }).width : 0
  const firstRowCenterX = (afterFirstWidth - beforeWidth) / 2
  const originX = letterEntry?.x ?? 0
  const originY = letterEntry?.y ?? 0
  //
  // One consistent row-to-row step for the whole caption: the natural
  // height of a plain text row at this font size plus the same gap
  // k.text's own lineSpacing uses between restText's wrapped lines — so
  // row 1 (the oversized embedded letter + its first line) sits above
  // row 2 at exactly the same rhythm as row 2 sits above row 3, etc. The
  // embedded letter's own taller glyph box is intentionally ignored here.
  //
  // Row 1's pieces (before/afterFirst) are vertically centered on originY,
  // so only half of oneLineHeight sits below the origin — using the full
  // height here would double-count that half and push row 2 needlessly far
  // down. restText itself is top-anchored, so its own internal line-to-line
  // rhythm further down still uses the full oneLineHeight + gap, unaffected.
  //
  const oneLineHeight = k.formatText({ text: afterFirst || before || 'A', size: fontSize, font }).height
  const rowStep = oneLineHeight / 2 + GLOW_LETTER_CAPTION_LINE_SPACING
  const pieces = []
  before && pieces.push({ text: before, anchor: 'right', localX: -letterHalfW, localY: 0 })
  letterEntry && pieces.push({ text: letterEntry.char, anchor: 'center', localX: 0, localY: 0, letterFill: true })
  afterFirst && pieces.push({ text: afterFirst, anchor: 'left', localX: letterHalfW, localY: 0 })
  restText && pieces.push({
    text: restText,
    anchor: 'top',
    align: 'center',
    localX: firstRowCenterX,
    localY: rowStep
  })
  const shadowObjs = []
  const outlineObjs = []
  const mainObjs = []
  pieces.forEach(piece => {
    const localOffset = rotateGlowOffset(piece.localX, piece.localY, tiltDeg)
    const textRgb = piece.letterFill ? letterFillRgb : captionTextRgb
    const shadowOffset = rotateGlowOffset(
      piece.localX + GLOW_LETTER_CAPTION_SHADOW_OFFSET,
      piece.localY + GLOW_LETTER_CAPTION_SHADOW_OFFSET,
      tiltDeg
    )
    withShadow && shadowObjs.push(k.add([
      k.text(piece.text, { size: fontSize, font, align: piece.align, lineSpacing: GLOW_LETTER_CAPTION_LINE_SPACING }),
      k.pos(originX + shadowOffset.x, originY + shadowOffset.y),
      k.anchor(piece.anchor),
      k.rotate(tiltDeg),
      k.color(GLOW_LETTER_SHADOW_R, GLOW_LETTER_SHADOW_G, GLOW_LETTER_SHADOW_B),
      k.opacity(0),
      k.z(GLOW_LETTER_CAPTION_Z)
    ]))
    withOutline && GLOW_LETTER_CAPTION_OUTLINE_OFFSETS.forEach(([odx, ody]) => {
      const outlineOffset = rotateGlowOffset(
        piece.localX + odx * GLOW_LETTER_CAPTION_OUTLINE_PAD,
        piece.localY + ody * GLOW_LETTER_CAPTION_OUTLINE_PAD,
        tiltDeg
      )
      outlineObjs.push(k.add([
        k.text(piece.text, { size: fontSize, font, align: piece.align, lineSpacing: GLOW_LETTER_CAPTION_LINE_SPACING }),
        k.pos(originX + outlineOffset.x, originY + outlineOffset.y),
        k.anchor(piece.anchor),
        k.rotate(tiltDeg),
        k.color(VOID.r, VOID.g, VOID.b),
        k.opacity(0),
        k.z(GLOW_LETTER_CAPTION_Z)
      ]))
    })
    mainObjs.push(k.add([
      k.text(piece.text, { size: fontSize, font, align: piece.align, lineSpacing: GLOW_LETTER_CAPTION_LINE_SPACING }),
      k.pos(originX + localOffset.x, originY + localOffset.y),
      k.anchor(piece.anchor),
      k.rotate(tiltDeg),
      k.color(textRgb.r, textRgb.g, textRgb.b),
      k.opacity(0),
      k.z(GLOW_LETTER_CAPTION_Z + 1)
    ]))
  })
  const state = { timer: 0 }
  const fadeOutStart = GLOW_LETTER_CAPTION_FADE_IN + holdDuration
  const total = fadeOutStart + GLOW_LETTER_CAPTION_FADE_OUT
  const updateHandler = k.onUpdate(() => {
    state.timer += k.dt()
    let opacity = 1
    if (state.timer < GLOW_LETTER_CAPTION_FADE_IN) {
      opacity = state.timer / GLOW_LETTER_CAPTION_FADE_IN
    } else if (state.timer >= fadeOutStart) {
      opacity = Math.max(0, 1 - (state.timer - fadeOutStart) / GLOW_LETTER_CAPTION_FADE_OUT)
    }
    shadowObjs.forEach(obj => { obj.opacity = opacity })
    outlineObjs.forEach(obj => { obj.opacity = opacity })
    mainObjs.forEach(obj => { obj.opacity = opacity })
    if (state.timer < total) return
    updateHandler.cancel()
    shadowObjs.forEach(obj => obj.destroy())
    outlineObjs.forEach(obj => obj.destroy())
    mainObjs.forEach(obj => obj.destroy())
    letterEntry?.allObjects?.forEach(obj => obj.destroy?.())
    stopGlowLetterDialogMusic(inst)
    unpinHeroAfterLetterDialog(inst)
    inst.dialogOpen = false
    onCloseExtra?.()
  })
}
//
// Resets the dialog bookkeeping flags after a letter caption closes. The
// hero was never pinned or stripped of control while it played, so this is
// just cleanup — no position/gravity/control restoration needed.
//
function unpinHeroAfterLetterDialog(inst) {
  const hero = inst.heroInst
  inst.dialogHeroPinned = false
  inst.dialogInputGrace = 0
  inst.dialogPostSettle = 0
  if (hero) {
    hero.controlsDisabled = false
    hero.controllable = true
    hero.canJump = true
  }
  Hero.armJumpKeyReleaseGate(hero)
}
//
// Restores gravity and releases the post-dialog Y pin once the grace ends.
//
function releaseDialogPin(inst) {
  const hero = inst.heroInst
  const char = hero?.character
  inst.dialogHeroPinned = false
  forceHeroIdleOnLog(inst, true)
  char?.pos && forceSettleHeroOnNearestLog(inst, char)
  if (char?.vel) {
    char.vel.x = 0
    char.vel.y = 0
  }
  if (char?.pos) {
    inst.dialogPinY = char.pos.y
  }
  //
  // Gravity stays off until post-settle finishes — restoring it immediately
  // ejected the hero through thin L/O log colliders.
  //
  if (char) {
    char.gravityScale = 0
  }
  inst.dialogPostSettle = DIALOG_POST_SETTLE
  if (hero && !inst.heroLockedAfterW) {
    Hero.armJumpKeyReleaseGate(hero)
    hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, 0.85)
    hero.canJump = false
    hero.isSquashing = false
    hero.landSquashTimer = 0
    hero.jumpPhase = 'none'
    hero.wasJumping = false
    hero.jumpCeilingBonk = false
  }
}
//
// Clears jump/land squash and forces the idle sprite on the nearest log.
//
function forceHeroIdleOnLog(inst, skipHitboxSync = false) {
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
  !skipHitboxSync && Hero.syncPlatformLanding(hero)
}
//
// True when the hero stands over a revealed L/O/W letter log (not the branch).
//
function isHeroOverLetterLog(inst, heroX) {
  const z = inst.zones
  const logs = []
  z.lPlatRevealed && logs.push(inst.lPlatHome)
  z.oZone && z.lCollected && logs.push(inst.oPlatHome)
  z.wZone && z.oCollected && logs.push(inst.wPlatHome)
  for (const home of logs) {
    if (heroX >= home.x - LOG_SNAP_X_SLACK && heroX <= home.x + LOG_W + LOG_SNAP_X_SLACK) {
      return true
    }
  }
  return false
}
//
// Places the hero on the nearest revealed log top, ignoring squash/hover gates
// used by the normal snap path (dialog open must never leave him mid-land).
//
function forceSettleHeroOnNearestLog(inst, char) {
  const heroX = char.pos.x
  const heroY = char.pos.y
  const z = inst.zones
  const homes = []
  //
  // Never snap L/O/W dialog onto the start branch when standing on a letter log
  //
  if (inst.startBranch && !isHeroOverLetterLog(inst, heroX)) {
    homes.push({
      x: inst.startBranch.x1,
      y: inst.startBranch.y,
      w: inst.startBranch.x2 - inst.startBranch.x1,
      dropY: 0
    })
  }
  z.lPlatRevealed && homes.push({ ...inst.lPlatHome, w: LOG_W, dropY: LOG_COLLISION_DROP_Y })
  z.oZone && z.lCollected && homes.push({ ...inst.oPlatHome, w: LOG_W, dropY: LOG_COLLISION_DROP_Y })
  z.wZone && z.oCollected && homes.push({ ...inst.wPlatHome, w: LOG_W, dropY: LOG_COLLISION_DROP_Y })
  //
  // Pick the horizontally aligned surface closest in Y
  //
  let best = null
  let bestDist = Infinity
  for (const home of homes) {
    const w = home.w ?? LOG_W
    if (heroX < home.x - LOG_SNAP_X_SLACK || heroX > home.x + w + LOG_SNAP_X_SLACK) continue
    const platTop = home.y + (home.dropY ?? LOG_COLLISION_DROP_Y)
    const dist = Math.abs(heroY + SURFACE_DETECT_Y - platTop)
    if (dist < bestDist) {
      bestDist = dist
      best = platTop
    }
  }
  if (best == null) return
  //
  // Same 1 px embed as settleHeroOnLog — exact surface placement leaves the
  // hero ungrounded so gravity ejects him through the thin wood hitbox.
  //
  char.pos.y = best - SURFACE_DETECT_Y + LOG_SNAP_EMBED
  if (char.vel) {
    char.vel.x = 0
    char.vel.y = 0
  }
  const hero = inst.heroInst
  if (hero) {
    hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_GLOW)
    hero.landFxCooldown = Math.max(hero.landFxCooldown || 0, 0.2)
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
  if (!isGLetterCollectable(inst) || inst.dialogOpen) return
  triggerGlowCameraShake(inst)
  inst.zones.gCollected = true
  set(KEY_COLLECTED_G, true)
  syncGlowMidgesZones(inst.midges, inst.zones, inst.pit?.collapsed)
  //
  // Intro hints end the moment the first letter is taken.
  //
  HeroHint.clear(inst.heroHint)
  markLetterCollectedForProgressHint(inst)
  const entry = inst.gLetter
  entry && (entry.forceVisible = true)
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
  syncGlowHudLetterFills(inst, false)
  syncGlowFpsHudVisibility(inst)
  LevelIndicator.flashLetterBurst(inst.levelIndicator, 1)
  openGlowLetterCaption(inst, entry, GLOW_DIALOG_G, GLOW_LETTER_CAPTION_DURATION_G, () => {
    inst.gLetter = null
    //
    // Tree waits until the hero lands on the starting branch.
    //
    inst.pendingTreeReveal = !inst.zones.tree
  }, GLOW_DIALOG_SOUND_G)
}
//
// Collects L after landing on the solid L platform.
//
function collectLetterL(inst) {
  if (inst.zones.lCollected || inst.dialogOpen || !inst.zones.gCollected) return
  triggerGlowCameraShake(inst)
  inst.zones.lCollected = true
  set(KEY_COLLECTED_L, true)
  markLetterCollectedForProgressHint(inst)
  inst.zones.outerFrame = true
  set(KEY_REVEALED_OUTER_FRAME, true)
  syncGlowCanvasBackdrop(inst.k, inst.zones)
  refreshPlayfieldCornerSprites(inst)
  updatePlayfieldBorderColors(inst)
  const entry = inst.lLetter
  entry && (entry.forceVisible = true)
  inst.letterOffscreenArrow = null
  Sound.playLetterPickupSoft(inst.sound)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 2, inst.zones.colorWorld)
  } else {
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 2)
  }
  LevelIndicator.flashLetterBurst(inst.levelIndicator, 2)
  syncGlowHudLetterFills(inst, false)
  rebakeTrampolineGraySprites(inst.k)
  rebakeGlowRockSpritesShaded(inst)
  inst.meditationWorldLife = 0
  syncGlowBirdsAfterL(inst)
  //
  // The L-log vanishes for the length of the caption only, same as O —
  // restored once the caption closes below. Gated by its own flag (rather
  // than a one-off setPlatVisible override) so it stays hidden even if some
  // other applyZoneVisibility() call fires while the caption is still up.
  // If the ambush hedgehog is still standing on it and hasn't fallen/walked
  // off yet, send it down now too, otherwise it would be left hovering over
  // empty air where the platform used to be.
  //
  inst.lPlatCaptionHiding = true
  applyZoneVisibility(inst)
  dropAmbushHedgehogIfStrandedOnLPlat(inst)
  openGlowLetterCaption(inst, entry, GLOW_DIALOG_L, GLOW_LETTER_CAPTION_DURATION_L, () => {
    inst.lLetter = null
    inst.glowLetters = inst.glowLetters.filter(e => e !== entry)
    revealLLitZone(inst)
    inst.lPlatCaptionHiding = false
    applyZoneVisibility(inst)
  }, GLOW_DIALOG_SOUND_L)
  revealGlowFpsCounter(inst)
}
//
// Collects O after landing on the solid O platform.
//
function collectLetterO(inst) {
  if (inst.zones.oCollected || inst.dialogOpen || !inst.zones.lCollected) return
  triggerGlowCameraShake(inst)
  inst.zones.oCollected = true
  set(KEY_COLLECTED_O, true)
  markLetterCollectedForProgressHint(inst)
  const entry = inst.oLetter
  entry && (entry.forceVisible = true)
  inst.letterOffscreenArrow = null
  dismissOLetterStuckHint(inst)
  Sound.playLetterPickupSoft(inst.sound)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 3, inst.zones.colorWorld)
  } else {
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 3)
  }
  syncGlowHudLetterFills(inst, false)
  LevelIndicator.flashLetterBurst(inst.levelIndicator, 3)
  //
  // The log the hero just collected O from vanishes for the length of the
  // caption only, same as L — he keeps falling/moving normally through
  // where it used to be, exactly like collecting a letter mid-air never
  // freezes him. No forced snap-back on close: the old pin-to-nearest-log
  // logic used to teleport him back onto this same spot several seconds
  // later no matter where he'd actually ended up by then, which is what
  // made him vanish. Gated by its own flag (rather than a one-off
  // setPlatVisible override) so it stays hidden even if some other
  // applyZoneVisibility() call fires while the caption is still up.
  //
  inst.oPlatCaptionHiding = true
  applyZoneVisibility(inst)
  openGlowLetterCaption(inst, entry, GLOW_DIALOG_O, GLOW_LETTER_CAPTION_DURATION_O, () => {
    inst.oLetter = null
    inst.glowLetters = inst.glowLetters.filter(e => e !== entry)
    startColorWorldFade(inst)
    inst.oPlatCaptionHiding = false
    applyZoneVisibility(inst)
  }, GLOW_DIALOG_SOUND_O)
}
//
// Collects W after landing on the solid W platform.
//
function collectLetterW(inst) {
  if (inst.zones.wCollected || inst.dialogOpen || !inst.zones.oCollected) return
  triggerGlowCameraShake(inst)
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
  syncGlowHudLetterFills(inst, false)
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
  HeroHint.show(inst.heroHint, HINT_W_TEXT, HINT_W_DURATION, {
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE
  })
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
// Shows the top-centre FPS HUD when any top-bar element is visible.
//
function isGlowTopHudElementVisible(inst) {
  const li = inst.levelIndicator
  if (!li) return false
  if (inst.zones.gCollected) return true
  if (li.smallHeroRevealed) return true
  if (li.lifeRevealed) return true
  return false
}
//
// Creates or hides the FPS counter based on visible HUD chrome.
//
function syncGlowFpsHudVisibility(inst) {
  if (!isGlowTopHudElementVisible(inst)) {
    inst.fpsCounter && FpsCounter.setVisible(inst.fpsCounter, false)
    return
  }
  if (!inst.fpsCounter) {
    inst.fpsCounter = FpsCounter.create({
      k: inst.k,
      topY: GLOW_HUD_FPS_TOP_Y,
      textColor: inst.k.rgb(HUD_SCORE_COLOR_SETTLED.r, HUD_SCORE_COLOR_SETTLED.g, HUD_SCORE_COLOR_SETTLED.b),
      outlineColor: inst.k.rgb(VOID.r, VOID.g, VOID.b)
    })
  }
  FpsCounter.setVisible(inst.fpsCounter, true)
  layoutGlowFpsHud(inst)
}
//
// Legacy alias — keeps call sites that reveal the FPS slot explicit.
//
function revealGlowFpsCounter(inst) {
  syncGlowFpsHudVisibility(inst)
}
//
// Lake shore / water-cluster rocks must appear the moment the lake opens.
//
function forceWaterEdgeRocksVisible(inst) {
  inst.zones.waterRocks = true
  inst.rockObjs.forEach(o => {
    o._waterCluster && setDecorObjVisible(o, true)
  })
}
//
// Full HUD after W: FPS counter top-centre plus the small-hero and life icons
// top-right (revealed here if the player has not surfaced them earlier).
//
function revealPostWHud(inst) {
  revealGlowFpsCounter(inst)
  LevelIndicator.revealSmallHeroHud(inst.levelIndicator)
  LevelIndicator.revealLifeHud(inst.levelIndicator, !inst.zones.colorWorld)
  layoutGlowFpsHud(inst)
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
  inst.zones.lPlatRevealed && inst.zones.lLetterUnveiled && !inst.zones.lCollected && inst.zones.gCollected && near(inst.lLetter) && collectLetterL(inst)
  inst.zones.oZone && !inst.zones.oCollected && inst.zones.lCollected && near(inst.oLetter) && collectLetterO(inst)
  inst.zones.wZone && !inst.zones.wCollected && inst.zones.oCollected && near(inst.wLetter) && collectLetterW(inst)
}
//
// Pins the hero to the manual sink tween (body is removed for the sequence).
//
function applyDrownSinkPose(inst) {
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos || inst.drownSinkY == null) return
  const sinkX = Math.round(inst.drownSinkX ?? char.pos.x)
  hero.drownSinkX = sinkX
  hero.drownSinkY = inst.drownSinkY
  //
  // moveTo (not direct pos.x/pos.y mutation) so Kaplay marks the transform
  // dirty and actually redraws the sprite at its new position — a direct
  // char.pos.y = value write silently skips the render-transform cache
  // invalidation, leaving the hero visually frozen while sinking.
  //
  char.moveTo(sinkX, inst.drownSinkY)
  char.vel && (char.vel.x = 0, char.vel.y = 0)
  updateDrownHeroDrawLayer(inst, char)
}
//
// World Y where the hero's feet rest on the main floor in the lake band.
//
function drownFloorStandY() {
  return FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
}
//
// Hero stays behind the lake fill (LAKE_Z) for the whole drowning sequence.
//
function updateDrownHeroDrawLayer(inst, char) {
  char.z = DROWN_HERO_DRAW_Z
}
//
// Late-frame sink pin — runs after the hero body so the tween is not undone.
//
function registerDrownLateSink(inst) {
  if (inst.drownLateSink) return
  const char = inst.heroInst?.character
  //
  // Kaplay runs fixedUpdate (body) before onUpdate; pin Y on the hero object
  // after its normal update so the sink tween wins over floor collision.
  //
  inst.drownLateSink = inst.k.onUpdate(() => {
    inst.drowning && applyDrownSinkPose(inst)
  })
  inst.drownCharSink = char?.onUpdate(() => {
    inst.drowning && applyDrownSinkPose(inst)
  })
}
//
// Slow sink then sad death sound and level restart; water stays revealed.
//
function startDrowning(inst) {
  if (inst.drowning) return
  inst.drownFromStartBranch = Boolean(inst.wasOnStartBranch)
  inst.drowning = true
  inst.drownTimer = 0
  inst.trampBounceAir = false
  inst.branchTrampBounceAir = false
  inst.heroInst.controllable = false
  inst.heroInst.isSubmerging = true
  inst.heroInst.drownHeroDrawZ = DROWN_HERO_DRAW_Z
  //
  // Block jump/move key handlers — drowning is not a controllable state.
  //
  inst.heroInst.controlsDisabled = true
  inst.heroInst.suppressDust = true
  //
  // The sinking hero shuts his eyes and drops into a clean idle pose —
  // enterCalmPose clears any mid-air jump/run frame so the hero never rests
  // on the water surface sideways.
  //
  Hero.enterCalmPose(inst.heroInst)
  Hero.applyCalmIdleSprite(inst.heroInst)
  //
  // One water splash take marks the fall into the lake.
  //
  Sound.playWaterStepsFootstepKaplay(inst.k, WATER_STEPS_VOLUME, inst.sound)
  revealWaterZone(inst)
  forceWaterEdgeRocksVisible(inst)
  inst.footParticles && GlowFootParticles.clear(inst.footParticles)
  const char = inst.heroInst.character
  //
  // Drop the body for the sink tween — floor collision otherwise wins every
  // fixedUpdate and the sprite stays on the surface while drownSinkY advances.
  //
  char.has('body') && char.unuse('body')
  char.gravityScale = 0
  //
  // Sink tween starts at the hero's current pose; feet settle on the lake floor.
  //
  const drownX = Math.round(char.pos.x)
  const floorY = drownFloorStandY()
  const startY = char.pos.y
  inst.drownSinkX = drownX
  inst.drownSinkY = startY
  inst.heroInst.drownSinkX = drownX
  inst.heroInst.drownSinkY = startY
  //
  // The shallow shore end of the lake bed curve can sit above this starting
  // foot line (see drawDrownBelowBedHeroCover) — recorded so the below-bed
  // cover never triggers before he has actually sunk any distance at all.
  //
  inst.drownCoverStartFootY = startY + SURFACE_DETECT_Y
  char.opacity = 1
  applyDrownSinkPose(inst)
  beginDrownSinkTween(inst)
  const drownY = inst.drownSinkY
  registerDrownLateSink(inst)
  const firstDrown = !get(KEY_DROWN_HINT_SHOWN, false)
  firstDrown && set(KEY_DROWN_HINT_SHOWN, true)
  const drownHint = firstDrown
    ? HINT_DROWN_TEXT
    : DROWN_JOKES[Math.floor(Math.random() * DROWN_JOKES.length)]
  HeroHint.show(inst.heroHint, drownHint, HINT_DROWN_DURATION, {
    ignoreMovementDismiss: true,
    followHero: true,
    anchorX: drownX,
    anchorY: drownY,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE
  })
}
//
// Completes drowning sequence and reloads the scene.
//
function finishDrowning(inst) {
  if (inst.deathHandled) return
  inst.deathHandled = true
  inst.drownSinkTween?.cancel?.()
  inst.drownSinkTween = null
  inst.drownLateSink?.cancel?.()
  inst.drownLateSink = null
  inst.drownCharSink?.cancel?.()
  inst.drownCharSink = null
  const char = inst.heroInst?.character
  char && (char.hidden = true)
  bumpGlowLifeHudOnDeath(inst)
  inst.k.wait(DROWN_RESTART_DELAY, () => {
    //
    // A fall straight from the start branch always returns the hero to that
    // branch, no matter how much of the lower-right tree ground has already
    // been discovered. Spawning near the tree ground instead is reserved for
    // the Esc-to-menu resume flow (KEY_LAST_SPAWN_MODE / KEY_LAST_SPAWN_X set
    // on scene leave), never for a drowning death.
    //
    const resumeBranch = inst.drownFromStartBranch
    set(KEY_RESPAWN_NEAR_TREE, !resumeBranch)
    resumeBranch && set(KEY_LAST_SPAWN_MODE, SPAWN_MODE_BRANCH)
    resumeBranch && set(KEY_LAST_SPAWN_X, inst.startBranch.x1 + (inst.startBranch.x2 - inst.startBranch.x1) * HERO_BRANCH_FRACTION)
    inst.k.go('lesson-glow.0')
  })
}
//
// Shared life-HUD bump for any death: +1 lifeScore, reveal/flash/re-tint the
// life icon and its particle burst, gentle chime. Shared by drowning and the
// hedgehog touch-death.
//
function bumpGlowLifeHudOnDeath(inst) {
  const newLife = get('lifeScore', 0) + 1
  set('lifeScore', newLife)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, countGlowLettersCollected(inst.zones), inst.zones.colorWorld)
  }
  syncGlowHudLetterFills(inst, false)
  LevelIndicator.revealLifeHud(inst.levelIndicator, !inst.zones.colorWorld)
  hasGlowPersistedFragments() && LevelIndicator.revealSmallHeroHud(inst.levelIndicator)
  hasGlowPersistedFragments() && inst.levelIndicator.updateHeroScore?.(get('heroScore', 0))
  syncGlowFpsHudVisibility(inst)
  set(KEY_LIFE_SHOWN, true)
  inst.levelIndicator.updateLifeScore?.(newLife)
  Sound.playGentleLifeSound(inst.sound)
  if (inst.levelIndicator?.lifeImage?.sprite?.exists?.()) {
    const greyLife = !inst.zones.colorWorld
    LevelIndicator.syncLifeHudGrey(inst.levelIndicator, greyLife)
    const desatReady = inst.levelIndicator._lifeSpriteName === 'life-desat'
    const canFlash = !greyLife || desatReady
    if (canFlash) {
      inst.levelIndicator._lifeFlashLock = true
      const originalColor = inst.levelIndicator.lifeImage.sprite.color
      flashLifeImageOnDrownDeath(inst.k, inst.levelIndicator, originalColor, 0, greyLife)
    }
    createLifeParticlesOnDrownDeath(inst.k, inst.levelIndicator, greyLife)
  }
}
//
// True once either hedgehog's silhouette overlaps the hero's feet.
//
function checkHedgehogTouchDeath(inst, heroX, heroFootY) {
  if (inst.deathHandled) return
  if (Hedgehog.isTouchingHero(inst.hedgehog, heroX, heroFootY)) {
    triggerHedgehogDeath(inst, false)
    return
  }
  Hedgehog.isTouchingHero(inst.ambushHedgehog, heroX, heroFootY) && triggerHedgehogDeath(inst, true)
}
//
// Touching either hedgehog is fatal — the hero shatters exactly like in any
// other level (Hero.death), but with the level's own dusty ground-burst
// (bigger, and spread upward too) instead of the generic body-square
// explosion. The ambush hedgehog additionally tumbles off its platform and
// keeps crawling while the death countdown runs.
//
function triggerHedgehogDeath(inst, isAmbush) {
  if (inst.deathHandled) return
  inst.deathHandled = true
  inst.hedgehogDeathHandled = true
  const hero = inst.heroInst
  const char = hero.character
  const deathX = char.pos.x
  const deathY = char.pos.y
  hero.controllable = false
  hero.controlsDisabled = true
  triggerGlowCameraShake(inst)
  spawnHedgehogDeathBurst(inst, deathX, deathY)
  isAmbush && Hedgehog.fallAndCrawlAway(inst.ambushHedgehog, FLOOR_Y - HEDGEHOG_AMBUSH_GROUND_RAISE, computeAmbushHedgehogFallEdgeX(inst))
  Hero.death(hero, () => finishHedgehogDeath(inst, isAmbush), { suppressParticles: true })
}
//
// The edge the ambush hedgehog should walk to before dropping off the
// L-log — whichever end (left/right) it's already closer to — so it
// visibly steps off the platform instead of sinking through its middle.
//
function computeAmbushHedgehogFallEdgeX(inst) {
  const home = inst.lPlatHome
  const hog = inst.ambushHedgehog
  if (!home || !hog) return null
  const platCenterX = home.x + LOG_W / 2
  return hog.x >= platCenterX
    ? home.x + LOG_W + HEDGEHOG_AMBUSH_FALL_EDGE_PAD
    : home.x - HEDGEHOG_AMBUSH_FALL_EDGE_PAD
}
//
// Leaf-shaped radial burst at the death spot — green leaf tones in the
// colour world, a few gray shades while the level is flat/monochrome —
// instead of the hero's generic body-square explosion.
//
function spawnHedgehogDeathBurst(inst, x, y) {
  if (!inst.footParticles) return
  const palette = hedgehogDeathLeafPalette(inst)
  GlowFootParticles.spawnLeafBurst(inst.footParticles, x, y, palette, HEDGEHOG_DEATH_PARTICLE_COUNT, FLOOR_Y)
}
//
// Mono world: a few gray shades already used for the level's own decor;
// colour world: the main tree's own green foliage tones, so the burst
// reads as real leaves rather than generic dust.
//
function hedgehogDeathLeafPalette(inst) {
  if (isGlowFlatSingleDecorColor(inst)) return [DECOR_GRAY, MID_GRAY, LIGHT_GRAY]
  return (GLOW_PAL.treeColor.leafShades || [GLOW_PAL.treeColor.leaf]).map(hex => glowRgb(hex))
}
//
// Same life-HUD bump as drowning, then a standard press-any-key countdown
// instead of a silent timed reload. The ambush kill also leaves a hint
// pinned on the culprit hedgehog once the hero is gone.
//
function finishHedgehogDeath(inst, isAmbush) {
  bumpGlowLifeHudOnDeath(inst)
  isAmbush && HeroHint.show(inst.heroHint, HEDGEHOG_DEATH_HINT_TEXT, HEDGEHOG_DEATH_COUNTDOWN_SECONDS, {
    anchorX: inst.ambushHedgehog.x,
    anchorY: inst.ambushHedgehog.y - HEDGEHOG_DEATH_HINT_RAISE,
    ignoreMovementDismiss: true,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE
  })
  !isAmbush && HeroHint.show(inst.heroHint, HEDGEHOG_LEFT_DEATH_HINT_TEXT, HEDGEHOG_DEATH_COUNTDOWN_SECONDS, {
    anchorX: inst.hedgehog.x,
    anchorY: inst.hedgehog.y - HEDGEHOG_DEATH_HINT_RAISE,
    ignoreMovementDismiss: true,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE
  })
  markSafeGroundRespawnAwayFromHedgehog(inst)
  startGlowHedgehogDeathCountdown(inst)
}
//
// Forces the next level reload to spawn the hero on dry ground clearly
// past the main wandering hedgehog's leash — otherwise a ground respawn
// could land right back in its path and kill the hero again immediately.
//
function markSafeGroundRespawnAwayFromHedgehog(inst) {
  const safeX = (inst.hedgehog?.maxX ?? inst.lastHeroX ?? 0) + HEDGEHOG_DEATH_RESPAWN_MARGIN
  set(KEY_RESPAWN_NEAR_TREE, false)
  set(KEY_LAST_SPAWN_MODE, SPAWN_MODE_GROUND)
  set(KEY_LAST_SPAWN_X, safeX)
}
//
// Standard press-any-key countdown reload, same UX as the touch-lesson
// death screens: Space/Enter/click restarts immediately, otherwise it
// auto-restarts once the countdown reaches zero.
//
function startGlowHedgehogDeathCountdown(inst) {
  const k = inst.k
  const font = CFG.visual.fonts.regularFull.replace(/'/g, '')
  const cx = SCREEN_W / 2
  const promptY = HEDGEHOG_DEATH_PROMPT_Y
  const textCfg = { size: HEDGEHOG_DEATH_PROMPT_FONT, font }
  const initText = HEDGEHOG_DEATH_PROMPT_BASE + HEDGEHOG_DEATH_COUNTDOWN_SECONDS
  const colorWorld = inst.zones.colorWorld
  const textRgb = colorWorld ? HEDGEHOG_DEATH_PROMPT_TEXT_COLOR_WORLD : HEDGEHOG_DEATH_PROMPT_TEXT_GRAY
  const shadowRgb = colorWorld ? HEDGEHOG_DEATH_PROMPT_SHADOW_COLOR_WORLD : HEDGEHOG_DEATH_PROMPT_SHADOW_GRAY
  const shadowOpacity = colorWorld ? 0.72 : 0.85
  const shadow = k.add([
    k.text(initText, textCfg),
    k.pos(cx + 1.5, promptY + 1.5),
    k.anchor('center'),
    k.color(shadowRgb.r, shadowRgb.g, shadowRgb.b),
    k.opacity(shadowOpacity),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 60)
  ])
  const promptText = k.add([
    k.text(initText, textCfg),
    k.pos(cx, promptY),
    k.anchor('center'),
    k.color(textRgb.r, textRgb.g, textRgb.b),
    k.opacity(1),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 60.1)
  ])
  let elapsed = 0
  const destroyAll = () => {
    shadow.exists() && k.destroy(shadow)
    promptText.exists() && k.destroy(promptText)
  }
  const doRestart = () => {
    skipHandler.cancel()
    clickHandler.cancel()
    updateTimer.cancel()
    destroyAll()
    inst.k.go('lesson-glow.0')
  }
  const skipHandler = k.onKeyPress((key) => {
    (key === 'space' || key === 'enter') && doRestart()
  })
  const clickHandler = k.onMousePress(() => doRestart())
  const updateTimer = k.onUpdate(() => {
    elapsed += k.dt()
    const remaining = Math.max(0, HEDGEHOG_DEATH_COUNTDOWN_SECONDS - elapsed)
    const newText = HEDGEHOG_DEATH_PROMPT_BASE + Math.ceil(remaining)
    shadow.exists() && (shadow.text = newText)
    promptText.exists() && (promptText.text = newText)
    elapsed >= HEDGEHOG_DEATH_COUNTDOWN_SECONDS && doRestart()
  })
}
function ensureLakeShoreRocksVisible(inst) {
  inst.zones.waterRocks = true
}
//
// Ensures tree-side lake cap rocks are visible as soon as the water zone opens.
//
function showLakeShoreRocks(inst) {
  ensureLakeShoreRocksVisible(inst)
}
//
// Shore rocks appear together with the first-time water discovery hint.
//
function showWaterZoneDiscoveryHint(inst) {
  inst.zones.waterRocks = true
  showLakeShoreRocks(inst)
  forceWaterEdgeRocksVisible(inst)
  applyZoneVisibility(inst)
  HeroHint.show(inst.heroHint, HINT_WATER_TEXT, HINT_ZONE_DURATION, {
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE,
    dismissOnJump: false
  })
}
//
// Reveals the lake once the hero wades or falls into the water band. The
// first-time discovery hint is shown only for a live reveal (never when the
// zone is force-opened by the colour world).
//
function revealWaterZone(inst, showHint = true) {
  const firstOpen = !inst.zones.waterDiscovered
  if (inst.zones.water) {
    ensureLakeShoreRocksVisible(inst)
    forceWaterEdgeRocksVisible(inst)
    applyZoneVisibility(inst)
    return
  }
  inst.zones.water = true
  inst.zones.waterRocks = true
  inst.zones.waterDiscovered = true
  set(KEY_REVEALED_WATER, true)
  revealGroundDecorLeft(inst, true)
  syncGlowAtmosphereZones(inst)
  if (showHint && firstOpen) {
    showWaterZoneDiscoveryHint(inst)
  } else {
    showLakeShoreRocks(inst)
    forceWaterEdgeRocksVisible(inst)
    applyZoneVisibility(inst)
  }
  maybeShowGLetter(inst)
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
  syncGlowAtmosphereZones(inst)
  syncGlowHudLetterFills(inst)
}
//
// Midges + cave cracks follow which sides of the ground the hero has opened
//
function isGlowCaveCracksVisible(z) {
  return Boolean(z.groundDecorRight || z.oZone || z.oCollected || z.lCollected)
}
//
function syncGlowAtmosphereZones(inst) {
  const z = inst.zones
  setGlowPitCracksVisible(inst.pit, isGlowCaveCracksVisible(z))
  syncGlowMidgesZones(inst.midges, inst.zones, Boolean(inst.pit?.collapsed))
}
//
// Checks whether the hero position should unlock left/right ground decor.
// Decor only appears when the hero is on the floor — not on the start branch.
//
function checkGroundDecorReveal(inst, heroX, footY, grounded, justLanded) {
  if (!grounded || footY < FLOOR_Y - 28) return
  updateGroundRightStripReveal(inst, heroX)
  maybeRevealTrampolineMushroomOnLand(inst, heroX, footY, grounded, justLanded)
  const crossedLeft = heroX < TREE_X - TRUNK_EXCLUDE_HALF
  crossedLeft && revealGroundDecorLeft(inst, true)
  crossedLeft && revealLeftShoreRock(inst)
}
//
// Opens the lake when the hero walks left of the main tree on the actual
// ground floor — the elevated starting branch also sits left of the trunk,
// so a floor check keeps this from firing while the hero is still up there.
//
function tryRevealWaterOnLeftSide(inst, heroX, footY, grounded) {
  if (heroX >= TREE_X - TRUNK_EXCLUDE_HALF) return
  if (!grounded || footY < FLOOR_Y - 28) return
  !inst.zones.groundDecorLeft && revealGroundDecorLeft(inst, true)
  revealLeftShoreRock(inst)
}
//
// Persists the branch-trampoline reveal (independent of full right decor).
//
function revealBranchTrampoline(inst) {
  if (inst.zones.branchTrampRevealed) return
  inst.zones.branchTrampRevealed = true
  set(KEY_BRANCH_TRAMP_REVEALED, true)
  clearTrampMissingHint(inst, 'branch')
  Sound.stopAmbient(inst.sound)
  triggerGlowCameraShake(inst)
  applyZoneVisibility(inst)
  showTrampolineRevealHint(inst)
}
//
// First reveal frame: pin the hero on the cap if needed and reset jump /
// landing animation — skipping bounce on this frame left jumpPhase stuck.
//
function settleHeroAfterTrampReveal(inst, char, heroX, footY, right, branch) {
  const hero = inst.heroInst
  if (!hero || !char?.pos) return
  if (right && isHeroAtTrampolineCap(inst, heroX, footY, inst.trampState)) {
    settleHeroOnLog(inst, char, FLOOR_Y - TRAMP_TOTAL_H, true)
  }
  if (branch && isHeroAtTrampolineCap(inst, heroX, footY, inst.branchTrampState)) {
    settleHeroOnLog(inst, char, FLOOR_Y - TRAMP_TOTAL_H, true)
  }
  Hero.syncPlatformLanding(hero)
  hero.wasJumping = false
  hero.canJump = true
  inst.trampBounceAir = false
  inst.branchTrampBounceAir = false
}
//
// Reveals the L log platform after the first bounce on the right trampoline.
//
function revealLPlatZone(inst, silent = false) {
  if (inst.zones.lPlatRevealed) return
  inst.zones.lPlatRevealed = true
  set(KEY_REVEALED_L_PLAT, true)
  !silent && playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
  maybeStartLetterOffscreenArrowForTarget(inst, getLPlatformArrowTargetX(inst))
}
//
// Opens the L log after a bounce (or jump-land) on the right mushroom.
//
function maybeRevealLPlatOnRightTrampBounce(inst) {
  if (inst.zones.lPlatRevealed) return
  revealLPlatZone(inst)
}
//
// Jump-landing on the right cap also opens the L log if the bounce path missed.
//
function maybeRevealLPlatOnRightTrampLand(inst, justLanded, grounded) {
  if (!justLanded || !grounded) return
  if (!isOnTrampolineCap(inst, inst.heroInst?.character, inst.trampState)) return
  maybeRevealLPlatOnRightTrampBounce(inst)
}
//
// Opens the O platform zone and starts birds.mp3 on first landing from above.
//
function revealOZone(inst) {
  if (inst.zones.oZone) return
  inst.zones.oZone = true
  set(KEY_REVEALED_O, true)
  inst.oZoneRevealTime = inst.k.time()
  inst._meditationParallaxPreview = false
  inst.colorFade = 1
  inst.parallaxFade = 1
  inst.colorFadeTarget = 1
  inst.meditationWorldLife = 1
  revealLParallaxZone(inst)
  inst.treeDrawColorMode = true
  syncTreeColorCrossfade(inst)
  playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
  syncGlowAtmosphereZones(inst)
  maybeStartLetterOffscreenArrow(inst, inst.oLetter)
}
//
// Opens the W platform zone (first sing at the big mushroom, or a landing).
//
function revealWZone(inst) {
  if (inst.zones.wZone) return
  inst.zones.wZone = true
  set(KEY_REVEALED_W, true)
  playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
  maybeStartLetterOffscreenArrow(inst, inst.wLetter)
}
//
// Pit bonus collection may happen before the HUD exists — keep the live ref.
//
function syncGlowPitLevelIndicator(inst) {
  if (!inst.pit || !inst.levelIndicator) return
  inst.pit.levelIndicator = inst.levelIndicator
  inst.pit.pitBonus && (inst.pit.pitBonus.levelIndicator = inst.levelIndicator)
}
//
// Per-frame camera follow — horizontal scroll only.
//
function updateGlowCamera(inst) {
  const ch = inst.heroInst?.character
  if (!ch?.pos || !inst.camera) return
  inst.camera && GlowCamera.updateShake(inst.camera, inst.k.dt())
  if (updateCameraLetterPeek(inst, ch)) return
  GlowCamera.followHero(inst.camera, ch.pos.x, ch.pos.y)
  !inst.heroInst?.isSubmerging &&
    GlowCamera.alignHeroToScreenPixels(inst.camera, inst.heroInst, {
      playfieldCenterX: LEFT_MARGIN + VIEW_W / 2,
      playfieldCenterY: inst.camera.fixedCamY
    })
}
//
// First visit with no explored zones: ease the camera from a tight view to full width.
//
function maybeStartGlowCameraIntro(inst, zones) {
  inst.k.camScale(1)
  set(KEY_CAMERA_INTRO_DONE, true)
  if (!zones.gCollected && inst.heroInst?.character) {
    inst.heroInst.character.opacity = 0
    inst.heroSpawnFade = HERO_SPAWN_FADE_DURATION
  }
}
//
// Per-frame update.
//
function onUpdate(inst) {
  const k = inst.k
  inst.zones._sceneRef = inst
  if (inst.drowning) {
    updateGlowCamera(inst)
    return
  }
  if (inst.hedgehogDeathHandled) {
    inst.footParticles && GlowFootParticles.onUpdate(inst.footParticles, k.dt())
    return
  }
  inst.fpsCounter && FpsCounter.onUpdate(inst.fpsCounter)
  if (inst.heroSpawnFade > 0 && inst.heroInst?.character) {
    inst.heroSpawnFade -= k.dt()
    const u = 1 - Math.max(0, inst.heroSpawnFade) / HERO_SPAWN_FADE_DURATION
    inst.heroInst.character.opacity = Math.min(1, u)
    inst.heroSpawnFade <= 0 && (inst.heroInst.character.opacity = 1)
  }
  if (inst.pendingGlowIntro && inst.heroSpawnFade <= 0) {
    inst.introHintDelayRemaining += k.dt()
    if (inst.introHintDelayRemaining >= CAMERA_INTRO_HINT_DELAY) {
      inst.pendingGlowIntro = false
      inst.introHintDelayRemaining = 0
      startGlowIntro(inst)
    }
  }
  if (inst.pendingReplayIntro2 && inst.heroSpawnFade <= 0) {
    inst.introHintDelayRemaining += k.dt()
    if (inst.introHintDelayRemaining >= CAMERA_INTRO_HINT_DELAY) {
      inst.pendingReplayIntro2 = false
      inst.introHintDelayRemaining = 0
      startGlowIntro(inst)
    }
  }
  if (inst.introLock && inst.introHintPhase === INTRO_HINT_PHASE_ONE &&
    !HeroHint.isActive(inst.heroHint)) {
    inst.introHintPhase = INTRO_HINT_PHASE_PAUSE
    inst.introHintPause = HINT_INTRO_2_PAUSE
  }
  if (inst.introLock && inst.introHintPhase === INTRO_HINT_PHASE_PAUSE) {
    inst.introHintPause -= k.dt()
    if (inst.introHintPause <= 0) {
      showGlowIntroSecondHint(inst)
    }
  }
  if (inst.introLock && inst.introHintPhase === INTRO_HINT_PHASE_TWO &&
    !HeroHint.isActive(inst.heroHint)) {
    inst.introHintOnComplete?.()
  }
  const fadingWorldVisuals = inst.colorFade < inst.colorFadeTarget || inst.parallaxFade < 1
  const twoToneWorld = isGlowFlatSingleDecorColor(inst)
  const colorTransition = isGlowColorTransitionActive(inst)
  if (fadingWorldVisuals || twoToneWorld || colorTransition) {
    updateMushroomTints(inst)
    updateDecorOutlines(inst)
    syncGlowMidgeDrawColor(inst)
  }
  syncGlowPickupLetterVisuals(inst)
  const singing = (inst.heroInst?.idleStillTime ?? 0) >= GLOW_MUSHROOM_WHISTLE_IDLE
  const meditating = inst.meditation?.countdown != null
  if (singing || meditating || inst._mushroomLeanActive) {
    updateMushroomWhistleLean(inst)
    inst._mushroomLeanActive = singing || meditating ||
      inst.mushObjs.some(obj => !obj.hidden && Math.abs(obj.leanAngle ?? 0) > 0.2)
  }
  maybeSyncGlowLifeHudGrey(inst)
  const meditationDrivingFade = inst.meditation?.countdown != null && !inst.zones.colorWorld
  if (!meditationDrivingFade && inst.colorFade < inst.colorFadeTarget) {
    inst.colorFade = Math.min(inst.colorFadeTarget, inst.colorFade + k.dt() / COLOR_FADE_DURATION)
    syncTreeColorCrossfade(inst)
  }
  updateMeditationPreviewFadeOut(inst, k.dt())
  //
  // Forest and colour world share one ease — parallax tracks colorFade so
  // trees, mushrooms and underground decor all appear together.
  //
  if (!meditationDrivingFade && inst.zones.lZoneParallax && inst.parallaxFade < inst.colorFadeTarget) {
    inst.parallaxFade = inst.colorFade
  }
  //
  // Birds glide once the meditation preview or colour world is visible.
  //
  const birdFade = inst.colorFade ?? 0
  birdFade > BIRD_VISIBLE_FADE_MIN &&
    (inst.zones.colorWorld || inst.zones.oZone || inst.meditation?.countdown != null) &&
    updateBackgroundBirds(inst, k.dt())
  updateTreeRevealFade(inst, k.dt())
  updateExploreFades(inst, k.dt())
  updateGlowLetterPopFades(inst, k.dt())
  updatePlatformRevealFade(inst.lPlat, k.dt())
  updatePlatformRevealFade(inst.oPlat, k.dt())
  updatePlatformRevealFade(inst.wPlat, k.dt())
  inst.colorFade >= 0.5 && !inst.heroGoldApplied && inst.zones.colorWorld && applyColorWorldHero(inst)
  updatePlayfieldBorderColors(inst)
  if (inst.pit?.pitBonus?.collected && !inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, countGlowLettersCollected(inst.zones), inst.zones.colorWorld)
    pinGlowHudFixed(inst.levelIndicator)
    syncGlowHudLetterFills(inst, false)
    restoreGlowFragmentHud(inst)
  }
  if (inst.pit?.pitBonus?.collected && inst.levelIndicator && !inst.levelIndicator.smallHeroRevealed) {
    restoreGlowFragmentHud(inst)
  }
  syncGlowPitLevelIndicator(inst)
  if (inst.bonusHeroInst?.collected && !inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, countGlowLettersCollected(inst.zones), inst.zones.colorWorld)
    pinGlowHudFixed(inst.levelIndicator)
    syncGlowHudLetterFills(inst, false)
    restoreGlowFragmentHud(inst)
  }
  if (inst.bonusHeroInst?.collected && inst.levelIndicator && !inst.levelIndicator.smallHeroRevealed) {
    restoreGlowFragmentHud(inst)
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
  if (inst.pit?.pitBonus?.collected && !inst.pitBonusFinalized) {
    inst.pitBonusFinalized = true
    BonusHero.finalizeCollection(inst.pit.pitBonus)
  }
  //
  // A letter caption never takes control away from the hero — only the
  // final post-W lock does.
  //
  if (inst.heroLockedAfterW) {
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
  inst.trampState.cooldown > 0 && (inst.trampState.cooldown = Math.max(0, inst.trampState.cooldown - k.dt()))
  inst.branchTrampState?.cooldown > 0 &&
    (inst.branchTrampState.cooldown = Math.max(0, inst.branchTrampState.cooldown - k.dt()))
  inst.trampState.squash > 0 && (inst.trampState.squash = Math.max(0, inst.trampState.squash - k.dt() * 4))
  inst.branchTrampState?.squash > 0 &&
    (inst.branchTrampState.squash = Math.max(0, inst.branchTrampState.squash - k.dt() * 4))
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  //
  // Glow owns all foot FX — block hero.js dust for the whole frame.
  //
  hero.suppressDust = true
  //
  // After dialog pin release: keep Y locked briefly so L/O wood cannot eject
  //
  if (inst.dialogPostSettle > 0) {
    inst.dialogPostSettle -= k.dt()
    hero.controllable = false
    hero.controlsDisabled = true
    forceHeroIdleOnLog(inst, true)
    forceSettleHeroOnNearestLog(inst, char)
    if (char.vel) {
      char.vel.x = 0
      char.vel.y = 0
    }
    char.gravityScale = 0
    inst.dialogPinY = char.pos.y
    if (inst.dialogPostSettle <= 0) {
      inst.dialogPostSettle = 0
      forceSettleHeroOnNearestLog(inst, char)
      forceHeroIdleOnLog(inst)
      if (char && inst._dialogSavedGravityScale !== undefined) {
        char.gravityScale = inst._dialogSavedGravityScale
        inst._dialogSavedGravityScale = undefined
      } else if (char) {
        char.gravityScale = 1
      }
    }
  }
  if (!inst.dialogOpen && !(inst.dialogInputGrace > 0) &&
    !(inst.dialogPostSettle > 0) && !inst.heroLockedAfterW) {
    hero.controllable = true
    hero.controlsDisabled = false
    hero.jumpDisabled = false
  }
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  updateGlowProximitySound(inst, char)
  const heroMoving = Math.abs(heroX - inst.lastHeroX) > 0.5
  updateBranchSpawnLook(inst, hero, heroMoving)
  //
  // G letter pickup on branch.
  //
  if (isGLetterCollectable(inst)) {
    const dx = heroX - inst.gLetter.x
    const dy = char.pos.y - inst.gLetter.y
    Math.hypot(dx, dy) < GLOW_LETTER_PICKUP_RADIUS && collectLetterG(inst)
  }
  !inst.dialogOpen && tryCollectGlowLetters(inst, char)
  const grounded = char.isGrounded?.() ?? false
  const justLanded = grounded && !inst.wasGrounded
  const inStartBranchBand = isHeroOverStartBranchX(inst, heroX) &&
    footY >= inst.startBranch.y - LOG_HOVER_BAND &&
    footY <= inst.startBranch.y + BRANCH_SNAP_BELOW
  //
  // Only a real landing back on the main ground level clears the "fell from
  // the branch" flag — bouncing on the branch trampoline cap on the way down
  // is still mid-air transit, not settling on solid ground, and landing on
  // the lake floor is the drowning trigger itself (must survive to be read
  // by startDrowning() later this same frame).
  //
  const onMainGroundLevel = grounded && !isInWaterZone(inst, heroX, footY) &&
    footY >= FLOOR_Y - LOG_SNAP_STANDING_MAX
  if (inStartBranchBand) {
    inst.wasOnStartBranch = true
  } else if (onMainGroundLevel) {
    inst.wasOnStartBranch = false
  }
  inst.wasGrounded = grounded
  updateTrampolineWalk(inst, char, heroMoving, grounded)
  updateTrampEndure(inst)
  updateTrampWaterSteps(inst)
  //
  // Reveal hidden mushrooms before snap / bounce — the hero must settle on
  // the visible cap first; bouncing on the same frame as reveal felt like an
  // invisible trampoline.
  //
  const rightTrampWasVisible = inst.zones.rightTrampRevealed
  const branchTrampWasVisible = inst.zones.branchTrampRevealed
  maybeRevealTrampolineMushroomOnLand(inst, heroX, footY, grounded, justLanded)
  const rightRevealFrame = !rightTrampWasVisible && inst.zones.rightTrampRevealed
  const branchRevealFrame = !branchTrampWasVisible && inst.zones.branchTrampRevealed
  //
  // Pad / snap / bounce only after the mushroom sprite is shown.
  //
  syncTrampolinePad(inst)
  isRightTrampolineVisible(inst.zones) &&
    snapHeroToOneTrampolineCap(inst, char, heroX, footY, inst.trampState)
  isBranchTrampolineVisible(inst.zones) &&
    snapHeroToOneTrampolineCap(inst, char, heroX, footY, inst.branchTrampState)
  //
  // Bounce whenever the hero is on the cap — except the reveal frame itself
  // (that pass only shows the mushroom and settles the hero).
  //
  if (isRightTrampolineVisible(inst.zones) && !rightRevealFrame &&
    inst.trampState.cooldown <= 0) {
    const walked = inst.trampWalk?.walked
    const mult = walked ? TRAMP_DOCKED_BOOST_MULT : TRAMP_BOOST_MULT
    tryMushroomTrampBounce(inst, inst.trampState, mult, hero, char, heroX,
      () => onTrampolineBounce(inst))
  }
  if (isBranchTrampolineVisible(inst.zones) && !branchRevealFrame &&
    inst.branchTrampState?.cooldown <= 0) {
    tryMushroomTrampBounce(
      inst,
      inst.branchTrampState,
      BRANCH_TRAMP_BOOST_MULT,
      hero,
      char,
      heroX,
      () => onBranchTrampolineBounce(inst),
      'branchTrampBounceAir'
    )
  }
  (rightRevealFrame || branchRevealFrame) &&
    settleHeroAfterTrampReveal(inst, char, heroX, footY, rightRevealFrame, branchRevealFrame)
  //
  // Re-sync after bounce flags are set — the pre-bounce pass can hide the
  // pad one frame too early and Kaplay drags the hero off-screen with it.
  //
  syncTrampolinePad(inst)
  //
  // Bounce is the main L-log trigger; a jump-land on the cap is the backup.
  //
  maybeRevealLPlatOnRightTrampLand(inst, justLanded, grounded)
  const surface = detectGlowSurface(inst)
  inst.sound._l2Surface = surface === 'wood' ? 'wood' : null
  if (surface === 'wood' || surface === 'ground') {
    inst.sound._glowSurface = surface
    inst._glowLastFootSurface = surface
  }
  //
  // Landing SFX backup (collide path can miss on wood flicker / air-lock)
  //
  if (justLanded && (surface === 'wood' || surface === 'ground') && !inst.sound._glowSfxMuted) {
    if ((hero.landFxCooldown || 0) <= 0) {
      hero.landFxCooldown = 0.2
      Sound.playLandSound(inst.sound, 'lesson-glow.0')
    }
  }
  //
  // A small puff also kicks up right as the hero starts running from a
  // standstill, not just on landing — hero.js's own run-start dust is
  // suppressed for glow (suppressDust), so it needs its own trigger here.
  //
  const startedRunning = grounded && hero.isRunning && !inst.wasHeroRunning
  inst.wasHeroRunning = hero.isRunning
  syncBranchPlatHome(inst)
  if (char.hidden) char.hidden = false
  if (typeof char.opacity === 'number' && char.opacity < 1 && inst.heroSpawnFade <= 0) {
    char.opacity = 1
  }
  !inst.dialogOpen && !(inst.dialogInputGrace > 0) && !(inst.dialogPostSettle > 0) &&
    snapHeroToLogPlatforms(inst, char)
  snapHeroToStartBranch(inst, char, heroX, footY)
  snapHeroToMainGround(inst, char, grounded, heroX, footY)
  //
  // Foot bursts run after wood snaps so feet position and surface match the
  // solid collider — spawning earlier misread branch/log landings as ground.
  //
  const snapHeroX = char.pos.x
  const snapFootY = char.pos.y + SURFACE_DETECT_Y
  const snapSurface = detectGlowSurface(inst)
  const allowFootBurst = canSpawnGlowFootBurst(inst, char)
  if (justLanded && hero.wasJumping && allowFootBurst) {
    const lakeFloorLand = isInWaterZone(inst, snapHeroX, snapFootY) &&
      snapFootY >= FLOOR_Y - LOG_SNAP_STANDING_MAX
    !lakeFloorLand &&
      spawnGlowFootLanding(inst.footParticles, snapHeroX, snapFootY, snapSurface, inst, char)
  }
  if (startedRunning && allowFootBurst && !isInWaterZone(inst, snapHeroX, snapFootY)) {
    spawnGlowFootLanding(inst.footParticles, snapHeroX, snapFootY, snapSurface, inst, char)
  }
  maybeSpawnLeftHedgehogAmbush(inst, heroX, char.vel?.x ?? 0)
  maybeSpawnHedgehogAmbushPreLand(inst, heroX, footY, grounded)
  maybeMarkLPlatStepped(inst, char, grounded)
  maybeAbandonStrandedAmbushHedgehog(inst)
  //
  // O-letter meditation: perfect stillness after L summons the countdown.
  //
  updateOMeditation(inst, char, heroMoving, grounded)
  updateMeditationWorldLife(inst)
  syncGlowBirdsAfterL(inst)
  syncGlowWorldBirdsVolume(inst)
  inst.zones.lCollected && !inst.zones.oCollected && syncGlowHudOFill(inst)
  updateMeditationCounter(inst)
  updateTrampCheekyHint(inst)
  updateBranchTrampCheekyHint(inst)
  updateBranchTrampMarioHint(inst)
  updateLetterProgressHint(inst)
  updateWrongTrampSingHint(inst)
  updateLetterOffscreenArrow(inst, k.dt())
  updateTreeRevealArm(inst, char, grounded)
  tryRevealTreeOnBranchLand(inst, char, grounded, justLanded)
  tryUnveilLLetterAfterTramp(inst, heroX, footY, grounded, justLanded)
  updateGlowMidges(inst.midges, k.dt(), glowMeditationWorldLife(inst))
  updateGlowPit(inst.pit, char, grounded, justLanded, {
    x: inst.bonusPlatHome?.x ?? 0,
    y: inst.bonusPlatHome?.y ?? 0,
    w: BONUS_PLAT_W,
    h: inst.bonusPlatHome?.h ?? LOG_H
  }, {
    jumpLanding: justLanded && hero.wasJumping,
    footY,
    footParticles: inst.footParticles
  })
  inst.footParticles && GlowFootParticles.onUpdate(inst.footParticles, k.dt())
  syncGlowMidgesZones(inst.midges, inst.zones, Boolean(inst.pit?.collapsed))
  //
  // Platform zone reveals — detect descending hero over trigger volumes.
  //
  checkPlatformRevealOnDescent(inst, char, grounded, justLanded)
  checkGroundDecorReveal(inst, heroX, footY, grounded, justLanded)
  updateTrampMissingPlaceHints(inst, heroX, footY, grounded)
  tryRevealWaterOnLeftSide(inst, heroX, footY, grounded)
  //
  // Lake drowning — after ground snap so the hero stands on the floor first.
  //
  !inst.deathHandled && !inst.drowning &&
    shouldDrownInWater(inst, heroX, footY) && startDrowning(inst)
  updateHeroGazeAtG(inst)
  //
  // Camera tracks the hero after all movement (drowning may have started above).
  //
  updatePitCaveMushroomHint(inst, char, k.dt())
  updateOLetterStuckHint(inst, k.dt())
  syncHeroTrampDrawOrder(inst)
  updateGlowCamera(inst)
  inst.lastHeroX = char.pos.x
  //
  // Hedgehog touch death — last check of the frame since it may destroy
  // the hero's character outright.
  //
  !inst.deathHandled && checkHedgehogTouchDeath(inst, heroX, footY)
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
  if (inst.branchLookPhase) {
    heroInst.lookAtPos = null
    return
  }
  const g = inst.gLetter
  const branch = inst.woodSurfaces?.[0]
  const onBranch = Boolean(branch &&
    ch.pos.x >= branch.x1 && ch.pos.x <= branch.x2 &&
    Math.abs(ch.pos.y - branch.y) < GAZE_BRANCH_Y_TOLERANCE)
  const shouldGaze = Boolean(g && !g.main.hidden && !inst.zones.gCollected && onBranch)
  heroInst.lookAtPos = shouldGaze ? { x: g.x, y: g.y } : null
}
//
// First appearance on the start branch: face left, then right after a beat.
// Any real step cancels the scripted look.
//
function updateBranchSpawnLook(inst, hero, heroMoving) {
  if (!inst.branchLookPhase) return
  const char = hero?.character
  if (!char) {
    inst.branchLookPhase = null
    return
  }
  if (inst.heroSpawnFade > 0) {
    inst.branchLookPhase === 'left' && (hero.direction = -1)
    inst.branchLookPhase === 'left' && (char.flipX = true)
    return
  }
  if (heroMoving) {
    inst.branchLookPhase = null
    inst.branchLookTimer = 0
    return
  }
  if (inst.branchLookPhase === 'left') {
    hero.direction = -1
    char.flipX = true
    inst.branchLookTimer -= inst.k.dt()
    if (inst.branchLookTimer > 0) return
    inst.branchLookPhase = 'right'
    hero.direction = 1
    char.flipX = false
    return
  }
  inst.branchLookPhase = null
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
      syncMeditationColorFade(inst)
    }
    updateMeditationBirds(inst)
    return
  }
  syncMeditationColorFade(inst)
  m.countdown -= inst.k.dt()
  updateMeditationBirds(inst)
  if (m.countdown <= 0) {
    m.countdown = null
    Hero.setEyesClosed(inst.heroInst, false)
    //
    // Hold birds at full volume into the O reveal; dialog duck handles the rest
    //
    if (inst.birdsMusic) {
      inst.birdsMusic.paused = false
      inst.birdsMusic.volume = CFG.audio.backgroundMusic.birds
      inst.meditationBirdsActive = false
    }
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
    resetMeditationColorPreview(inst)
  }
  m.idleTimer = 0
}
//
// Arms tree reveal only after the hero has left the start branch once (avoids
// showing the big tree on the initial spawn landing). The hero spawns 80px
// ABOVE the branch and free-falls onto it as its very first action — during
// that fall isHeroOnStartBranch is already false (footY is still well above
// the branch surface), which used to satisfy the "left the branch" check
// before the hero had ever actually stood on it, revealing the tree on the
// very first natural landing. Requiring a real grounded stand on the branch
// first closes that spawn-drop loophole.
//
function updateTreeRevealArm(inst, char, grounded) {
  if (!inst.pendingTreeReveal || !char?.pos) return
  const onBranch = isHeroOnStartBranch(inst, char)
  if (onBranch && grounded) inst.hasStoodOnStartBranch = true
  inst.hasStoodOnStartBranch && !onBranch && (inst.treeBranchLeftOnce = true)
}
//
// Tree fades in on the first landing on the big-tree branch after leaving it.
//
function tryRevealTreeOnBranchLand(inst, char, grounded, justLanded) {
  if (!inst.pendingTreeReveal || inst.dialogOpen) return
  const fromBranchTramp = inst.treeRevealFromBranchTramp ||
    (inst.branchTrampBounceAir && grounded && justLanded)
  if (!fromBranchTramp && !inst.treeBranchLeftOnce) return
  if (!grounded || !justLanded || !char?.pos) return
  if (!fromBranchTramp && isOnBranchTrampolineCap(inst, char)) return
  if (!isHeroOnStartBranch(inst, char)) return
  inst.treeRevealFromBranchTramp = false
  revealTreeSegmentsOnBranchLanding(inst)
}
//
// True when the hero's feet stand on the invisible start-branch collider
//
function isHeroOnStartBranch(inst, char) {
  const branch = inst.startBranch
  if (!branch || !char?.pos) return false
  const footY = char.pos.y + SURFACE_DETECT_Y
  return char.pos.x >= branch.x1 && char.pos.x <= branch.x2 &&
    footY >= branch.y - 8 && footY <= branch.y + LOG_SNAP_STANDING_MAX + 6
}
//
// True when the hero's feet stand on a revealed letter log or bonus platform.
//
function isHeroOnLetterLog(inst, char) {
  if (!char?.pos) return false
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  const z = inst.zones
  const homes = []
  z.lPlatRevealed && homes.push(inst.lPlatHome)
  z.oZone && z.lCollected && homes.push(inst.oPlatHome)
  z.wZone && z.oCollected && homes.push(inst.wPlatHome)
  if (inst.bonusPlatHome) {
    const bonusLive = inst.bonusHeroInst && !inst.bonusHeroInst.collected
    const bonusKeep = Boolean(inst.bonusPlatAlways)
    if (bonusLive || bonusKeep) homes.push(inst.bonusPlatHome)
  }
  for (const home of homes) {
    const w = home.w ?? LOG_W
    if (heroX < home.x - LOG_SNAP_X_SLACK || heroX > home.x + w + LOG_SNAP_X_SLACK) continue
    const platTop = home.y + LOG_COLLISION_DROP_Y
    if (footY >= platTop - LOG_HOVER_BAND && footY <= platTop + LOG_SNAP_STANDING_MAX + 6) {
      return true
    }
  }
  return false
}
//
// Blocks foot bursts on any wood collider (branch, L/O/W logs, bonus log).
//
function isGlowWoodFootPosition(inst, footX, footY, char) {
  if (!inst) return false
  if (inst.sound?._glowSurface === 'wood') return true
  if (isOverGlowWoodSurface(inst, footX, footY)) return true
  if (char && isHeroOnStartBranch(inst, char)) return true
  if (char && isHeroOnLetterLog(inst, char)) return true
  if (isHeroOverStartBranchX(inst, footX) && footY < FLOOR_Y - 24) return true
  if (isHeroOverLetterLog(inst, footX) && footY < FLOOR_Y - 24) return true
  return false
}
//
// Foot bursts only belong on the main forest floor — never on the start
// branch, letter logs or any other elevated wood collider.
//
function isOnGlowMainGroundFoot(footY) {
  return footY >= FLOOR_Y - LOG_SNAP_STANDING_MAX && footY <= FLOOR_Y + 36
}
//
// True when a landing/run-start foot burst is allowed this frame.
//
function canSpawnGlowFootBurst(inst, char) {
  if (!char?.pos || inst?.drowning) return false
  const footX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (detectGlowSurface(inst) === 'wood') return false
  if (isGlowWoodFootPosition(inst, footX, footY, char)) return false
  return isOnGlowMainGroundFoot(footY)
}
//
// After O: stand still near the trampoline → 10s countdown → mushroom walks
// left. The first two sings stay on land; the third docks in the lake.
// Once a walk starts it always finishes — chasing the hero cannot interrupt it.
//
function updateTrampolineWalk(inst, char, heroMoving, grounded) {
  const tw = inst.trampWalk
  const z = inst.zones
  if (!tw || !z.oCollected || tw.walked) {
    if (tw && (tw.countdown != null || tw.stillTimer > 0) && (tw.walked || !z.oCollected)) {
      tw.stillTimer = 0
      tw.countdown = null
    }
    return
  }
  const dt = inst.k.dt()
  //
  // In-progress walk always continues to the current stop (dialog / chase
  // ignored) — except while the hero is riding this same mushroom, either
  // mid-flight from a bounce (trampBounceAir) or simply standing grounded
  // on its cap (e.g. having jumped onto it normally rather than bouncing).
  // Letting the solid invisible pad slide sideways under a body resting on
  // top of it makes Kaplay shove him along/off unpredictably (looks like
  // he vanishes), so the walk simply pauses until he's clear of the cap.
  //
  if (tw.walking) {
    if (inst.trampBounceAir || (grounded && isOnTrampolineCap(inst, char, inst.trampState))) return
    inst.trampState.hasLegs = true
    inst.trampState.walkDir = -1
    inst.trampState.walkPhase = (inst.trampState.walkPhase || 0) + dt * 9
    inst.trampState.x -= TRAMP_WALK_SPEED * dt
    const targetX = tw.walkTargetX ?? tw.dockX
    if (inst.trampState.x <= targetX) {
      inst.trampState.x = targetX
      tw.walking = false
      if (tw.singCount >= TRAMP_WALK_SINGS_TO_WATER) {
        tw.walked = true
        inst.trampState.walkDir = -1
        persistTrampWalk(inst)
        startTrampWaterHints(inst)
      } else {
        inst.trampState.hasLegs = false
        inst.trampState.walkDir = 0
        persistTrampWalk(inst)
      }
    }
    return
  }
  if (inst.dialogOpen) return
  const nearRadius = tw.countdown != null ? TRAMP_WALK_NEAR_SINGING : TRAMP_WALK_NEAR
  const near = Math.abs(char.pos.x - inst.trampState.x) < nearRadius &&
    grounded &&
    Math.abs(char.pos.y + SURFACE_DETECT_Y - FLOOR_Y) < 28
  const still = near && !heroMoving && Math.abs(char.vel?.y ?? 0) < 1
  if (!still) {
    tw.stillTimer = 0
    tw.countdown = null
    return
  }
  if (tw.countdown == null) {
    tw.stillTimer += dt
    if (tw.stillTimer >= TRAMP_WALK_STILL) {
      tw.countdown = TRAMP_WALK_COUNTDOWN
      dismissTalkToMushroomHint(inst)
    }
    return
  }
  tw.countdown -= dt
  if (tw.countdown <= 0) {
    tw.countdown = null
    tw.singCount = (tw.singCount || 0) + 1
    const line = TRAMP_BAD_SING_TEXTS[Math.min(tw.singCount, TRAMP_BAD_SING_TEXTS.length) - 1]
    tw.walkTargetX = trampWalkStopX(inst, tw.singCount)
    tw.walking = true
    inst.trampState.hasLegs = true
    inst.trampState.walkDir = -1
    persistTrampWalk(inst)
    syncGlowHudLetterFills(inst)
    showTrampBadSingHint(inst, line)
    tw.singCount === 1 && revealWZone(inst)
    tw.singCount === 1 && maybeStartLetterOffscreenArrow(inst, inst.wLetter)
  }
}
//
// During the post-O sing countdown the right mushroom shuts its eyes,
// shrinks and trembles instead of dancing with the whistle.
//
function updateTrampEndure(inst) {
  const tw = inst.trampWalk
  const state = inst.trampState
  if (!state) return
  const enduring = Boolean(tw && !tw.walked && !tw.walking && tw.countdown != null)
  state.enduring = enduring
  if (!enduring) {
    state.endureShakeX = 0
    state.endureScaleY = 1
    return
  }
  const t = 1 - Math.max(0, tw.countdown) / TRAMP_WALK_COUNTDOWN
  const time = inst.k.time()
  const pulse = Math.sin(time * TRAMP_ENDURE_PULSE_SPEED) * TRAMP_ENDURE_PULSE_AMP
  state.endureScaleY = 1 - t * TRAMP_ENDURE_SQUASH_MAX + pulse
  state.endureShakeX = Math.sin(time * TRAMP_ENDURE_SHAKE_SPEED) *
    (TRAMP_ENDURE_SHAKE_AMP + t * 0.4)
  state.blinking = true
  state.leanAngle = 0
}
//
// Wading loop while the walking mushroom is inside the lake.
//
function updateTrampWaterSteps(inst) {
  const tw = inst.trampWalk
  const state = inst.trampState
  const inWater = Boolean(
    tw?.walking &&
    state &&
    state.x <= inst.lakeX2 &&
    state.x >= inst.lakeX1
  )
  Sound.updateTrampWaterStepsPlayback(inst.sound, inWater)
}
//
// Counts trampoline bounces; every Nth bounce shows a cheeky bubble on the cap
//
function onTrampolineBounce(inst) {
  maybeRevealLPlatOnRightTrampBounce(inst)
  inst.trampToLApproach = true
  const tw = inst.trampWalk
  if (!tw) return
  //
  // Leaving the fragment speech bubbles when bouncing away on the mushroom
  //
  BonusHero.dismissCollectHint(inst.bonusHeroInst)
  BonusHero.dismissCollectHint(inst.pit?.pitBonus)
  tw.bounceCount = (tw.bounceCount || 0) + 1
  if (tw.bounceCount % TRAMP_CHEEKY_EVERY !== 0) return
  tw.cheekyTimer = TRAMP_CHEEKY_DURATION
  const line = TRAMP_CHEEKY_LINES[tw.cheekyLineIdx % TRAMP_CHEEKY_LINES.length]
  tw.cheekyLineIdx = (tw.cheekyLineIdx + 1) % TRAMP_CHEEKY_LINES.length
  tw.cheekyTooltip && Tooltip.destroy(tw.cheekyTooltip)
  tw.cheekyTooltip = createGlowTooltip({
    k: inst.k,
    forceVisible: true,
    targets: [{
      x: () => inst.trampState.x,
      y: FLOOR_Y - TRAMP_TOTAL_H / 2,
      width: TRAMP_TOTAL_W,
      height: TRAMP_TOTAL_H,
      text: line,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET
    }]
  })
  tw.cheekyTooltip.activeTarget = tw.cheekyTooltip.targets[0]
  tw.cheekyTooltip.opacity = 1
}
//
// Cheeky bubble on the branch trampoline every Nth bounce (same lines as the walk tramp).
//
function onBranchTrampolineBounce(inst) {
  inst.pendingTreeReveal && !inst.zones.tree && (inst.treeRevealFromBranchTramp = true)
  const tw = inst.branchTrampWalk
  if (!tw || !inst.branchTrampState) return
  tw.bounceCount = (tw.bounceCount || 0) + 1
  if (tw.bounceCount % BRANCH_TRAMP_CHEEKY_EVERY !== 0) return
  tw.cheekyTimer = TRAMP_CHEEKY_DURATION
  const line = BRANCH_TRAMP_CHEEKY_LINES[tw.cheekyLineIdx % BRANCH_TRAMP_CHEEKY_LINES.length]
  tw.cheekyLineIdx = (tw.cheekyLineIdx + 1) % BRANCH_TRAMP_CHEEKY_LINES.length
  tw.cheekyTooltip && Tooltip.destroy(tw.cheekyTooltip)
  tw.cheekyTooltip = createGlowTooltip({
    k: inst.k,
    forceVisible: true,
    targets: [{
      x: () => inst.branchTrampState.x,
      y: FLOOR_Y - TRAMP_TOTAL_H / 2,
      width: TRAMP_TOTAL_W,
      height: TRAMP_TOTAL_H,
      text: line,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET
    }]
  })
  tw.cheekyTooltip.activeTarget = tw.cheekyTooltip.targets[0]
  tw.cheekyTooltip.opacity = 1
}
//
// Ages the cheeky trampoline bubble and tears it down when the timer ends
//
function updateTrampCheekyHint(inst) {
  const tw = inst.trampWalk
  if (!tw || tw.cheekyTimer <= 0) return
  tw.cheekyTimer -= inst.k.dt()
  if (tw.cheekyTimer > 0) return
  tw.cheekyTooltip && Tooltip.destroy(tw.cheekyTooltip)
  tw.cheekyTooltip = null
}
//
// Drops the branch-tramp "see the tree" bubble if it is on screen.
//
function clearBranchTrampMarioHint(inst) {
  const tw = inst.branchTrampWalk
  if (!tw?.marioHintTooltip) return
  Tooltip.destroy(tw.marioHintTooltip)
  tw.marioHintTooltip = null
  tw.marioHintSpawnX = null
  tw.marioHintSpawnY = null
}
//
// One-shot nudge on the branch trampoline when water and the right ground
// are open but the big tree is still hidden.
//
function updateBranchTrampMarioHint(inst) {
  const tw = inst.branchTrampWalk
  if (!tw || !inst.branchTrampState) return
  const heroX = inst.heroInst?.character?.pos?.x ?? 0
  if (isHeroNearUnrevealedTrampSpot(inst, heroX)) {
    clearBranchTrampMarioHint(inst)
    return
  }
  if (inst.worldHoverTooltip?.activeTarget?.hoverId === 'branchTrampMario') {
    clearBranchTrampMarioHint(inst)
    return
  }
  const z = inst.zones
  const treeOpen = z.tree || (inst.treeSegmentRevealed?.size > 0)
  const eligible = !treeOpen && !inst.zones.gCollected && !glowThreeZonesExplored(inst) &&
    isBranchTrampolineVisible(z)
  if (!eligible) {
    tw.marioEligibleSince = null
    tw.marioHintCooldown = 0
    clearBranchTrampMarioHint(inst)
    return
  }
  const k = inst.k
  if (tw.marioHintTooltip) {
    const ch = inst.heroInst?.character
    const sx = tw.marioHintSpawnX
    const sy = tw.marioHintSpawnY
    ch?.pos && sx != null && sy != null &&
      Math.hypot(ch.pos.x - sx, ch.pos.y - sy) >= GLOW_HINT_DISMISS_DISTANCE &&
      clearBranchTrampMarioHint(inst)
    return
  }
  tw.marioEligibleSince == null && (tw.marioEligibleSince = k.time())
  const since = k.time() - tw.marioEligibleSince
  if (since < BRANCH_TRAMP_MARIO_HINT_INITIAL_DELAY) return
  tw.marioHintCooldown = (tw.marioHintCooldown ?? 0) - k.dt()
  if (tw.marioHintCooldown > 0) return
  tw.marioHintCooldown = BRANCH_TRAMP_MARIO_HINT_REPEAT
  const ch = inst.heroInst?.character
  tw.marioHintSpawnX = ch?.pos?.x ?? heroX
  tw.marioHintSpawnY = ch?.pos?.y ?? FLOOR_Y
  tw.marioHintTooltip = createGlowTooltip({
    k: inst.k,
    forceVisible: true,
    targets: [{
      x: () => inst.branchTrampState.x,
      y: FLOOR_Y - TRAMP_TOTAL_H / 2,
      width: TRAMP_TOTAL_W,
      height: TRAMP_TOTAL_H,
      text: BRANCH_TRAMP_MARIO_HINT_TEXT,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET
    }]
  })
  tw.marioHintTooltip.activeTarget = tw.marioHintTooltip.targets[0]
  tw.marioHintTooltip.opacity = 1
  k.wait(BRANCH_TRAMP_MARIO_HINT_DURATION, () => {
    if (!tw.marioHintTooltip) return
    Tooltip.destroy(tw.marioHintTooltip)
    tw.marioHintTooltip = null
    tw.marioHintSpawnX = null
    tw.marioHintSpawnY = null
  })
}
//
// Ages the branch-tramp cheeky bubble
//
function updateBranchTrampCheekyHint(inst) {
  const tw = inst.branchTrampWalk
  if (!tw || tw.cheekyTimer <= 0) return
  tw.cheekyTimer -= inst.k.dt()
  if (tw.cheekyTimer > 0) return
  tw.cheekyTooltip && Tooltip.destroy(tw.cheekyTooltip)
  tw.cheekyTooltip = null
}
//
// Bubble when the hero whistles away from the walk-trampoline mushroom.
//
function updateWrongTrampSingHint(inst) {
  const tw = inst.trampWalk
  const z = inst.zones
  if (!tw || !z.oCollected || tw.walked || tw.walking) return
  if (inst.dialogOpen) return
  const char = inst.heroInst?.character
  if (!char?.pos || !inst.trampState) return
  const singing = (inst.heroInst?.idleStillTime ?? 0) >= GLOW_MUSHROOM_WHISTLE_IDLE
  const grounded = char.isGrounded?.() ?? false
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (!singing || !grounded || footY > FLOOR_Y + 28) {
    tw.wrongSingCooldown = WRONG_TRAMP_SING_HINT_REPEAT
    return
  }
  const nearCorrect = Math.abs(char.pos.x - inst.trampState.x) < TRAMP_WALK_NEAR_SINGING
  if (nearCorrect) {
    tw.wrongSingCooldown = WRONG_TRAMP_SING_HINT_REPEAT
    return
  }
  tw.wrongSingCooldown -= inst.k.dt()
  if (tw.wrongSingCooldown > 0) return
  if (HeroHint.isActive(inst.heroHint)) return
  tw.wrongSingCooldown = WRONG_TRAMP_SING_HINT_REPEAT
  HeroHint.show(inst.heroHint, BRANCH_TRAMP_WRONG_SING_TEXT, BRANCH_TRAMP_WRONG_SING_DURATION, {
    dismissOnJump: false,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE
  })
}
//
// First hint when the walk-trampoline mushroom reaches the lake; repeats every 30 s.
//
function startTrampWaterHints(inst) {
  const tw = inst.trampWalk
  if (!tw || tw.waterHintStarted) return
  tw.waterHintStarted = true
  showTrampShallowHint(inst)
}
//
// Tooltip on the docked walk-trampoline: the lake here is too shallow to drown.
//
function showTrampShallowHint(inst) {
  inst.trampShallowHint && Tooltip.destroy(inst.trampShallowHint)
  const mushH = TRAMP_TOTAL_H
  const tip = createGlowTooltip({
    k: inst.k,
    forceVisible: true,
    targets: [{
      x: () => inst.trampState?.x ?? -1000,
      y: FLOOR_Y - mushH / 2,
      width: TRAMP_TOTAL_W,
      height: mushH,
      text: TRAMP_SHALLOW_HINT_TEXT,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET
    }]
  })
  tip.activeTarget = tip.targets[0]
  tip.opacity = 1
  inst.trampShallowHint = tip
  inst.k.wait(TRAMP_SHALLOW_HINT_DURATION, () => {
    if (inst.trampShallowHint !== tip) return
    Tooltip.destroy(tip)
    inst.trampShallowHint = null
  })
}
//
// Same shared speech bubble as other Glow hints, pinned to the walking cap.
//
function showTrampBadSingHint(inst, line) {
  const tw = inst.trampWalk
  if (!tw) return
  tw.badSingTooltip && Tooltip.destroy(tw.badSingTooltip)
  const mushH = TRAMP_TOTAL_H
  const tip = createGlowTooltip({
    k: inst.k,
    forceVisible: true,
    targets: [{
      x: () => inst.trampState?.x ?? -1000,
      y: FLOOR_Y - mushH / 2,
      width: TRAMP_TOTAL_W,
      height: mushH,
      text: line,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET
    }]
  })
  tip.activeTarget = tip.targets[0]
  tip.opacity = 1
  tw.badSingTooltip = tip
  inst.k.wait(TRAMP_BAD_SING_DURATION, () => {
    if (tw.badSingTooltip !== tip) return
    Tooltip.destroy(tip)
    tw.badSingTooltip = null
  })
}
//
// Drops the "talk to the mushroom" line once the hero is already singing there.
//
function dismissTalkToMushroomHint(inst) {
  inst.heroHint?.target?.text === HERO_TOOLTIP_AFTER_O && HeroHint.clear(inst.heroHint)
}
//
// True when tree segment sprites were baked during the pre-level transition.
//
function glowTreeSpritesPrewarmed(k, monolith, segmentIds) {
  if (monolith) return Boolean(k.getSprite(TREE_FLAT_SPRITE_NAME))
  const firstId = segmentIds[0]
  if (!firstId) return false
  return Boolean(k.getSprite(TreeSegments.segmentGraySpriteName(firstId, false)))
}
//
// True when parallax static layer exists from prewarm.
//
function glowParallaxSpritesPrewarmed(k) {
  return Boolean(k.getSprite(BG_STATIC_GRAY) && k.getSprite(BG_PAR_TREE1_GRAY))
}
//
// Bakes full-tree sprites (fast draw path — two objects instead of many segments).
//
function bakeMonolithicGlowTreeSprites(k, treeData) {
  const flatCanvas = renderGlowTreeToCanvas(treeData, getTreePaletteFlatDecor(), WORLD_W, WORLD_H)
  k.loadSprite(TREE_FLAT_SPRITE_NAME, flatCanvas)
  flatCanvas.width = 0
  flatCanvas.height = 0
  const litCanvas = renderGlowTreeToCanvas(treeData, getTreePaletteLit(), WORLD_W, WORLD_H)
  k.loadSprite(TREE_LIT_SPRITE_NAME, litCanvas)
  litCanvas.width = 0
  litCanvas.height = 0
  const colorCanvas = renderGlowTreeToCanvas(treeData, getTreePaletteColor(), WORLD_W, WORLD_H)
  k.loadSprite(TREE_COLOR_SPRITE_NAME, colorCanvas)
  colorCanvas.width = 0
  colorCanvas.height = 0
}
//
// Swaps the monolithic gray tree sprite after L.
//
function syncMonolithicTreeGraySprite(inst) {
  const lit = Boolean(inst.zones.lCollected)
  const graySpriteName = lit ? TREE_LIT_SPRITE_NAME : TREE_FLAT_SPRITE_NAME
  if (inst.treeGraySpriteName === graySpriteName) return
  inst.treeGraySpriteName = graySpriteName
  inst.treeObj?.use(inst.k.sprite(graySpriteName))
}
//
// Crossfades gray vs colour monolithic tree sprites from the colour fade.
//
function syncMonolithicTreeColorMode(inst, fade) {
  const tree = inst.treeObj
  const treeColor = inst.treeColorObj
  if (!tree || !treeColor || !inst.treeDrawMonolith) return
  const f = fade ?? glowDecorFade(inst)
  tree.hidden = false
  treeColor.hidden = false
  tree.opacity = 1 - f
  treeColor.opacity = f
  const white = inst.k.rgb(255, 255, 255)
  tree.color = white
  treeColor.color = white
}
//
// Crossfades revealed tree segments between gray and colour palettes.
//
function syncTreeSegmentsColorCrossfade(inst, fade) {
  const f = fade ?? glowDecorFade(inst)
  inst.treeSegmentIds?.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    if (!entry?.revealed || entry.fadeActive) return
    entry.grayObj.pos.x = 0
    entry.colorObj.pos.x = 0
    entry.grayObj.hidden = false
    entry.colorObj.hidden = false
    entry.grayObj.opacity = 1 - f
    entry.colorObj.opacity = f
  })
}
//
// Applies gray→colour tree crossfade for monolith or segmented draw paths.
//
function syncTreeColorCrossfade(inst) {
  const fade = glowDecorFade(inst)
  inst.treeDrawColorMode = fade >= 0.5
  inst.treeDrawMonolith && syncMonolithicTreeColorMode(inst, fade)
  !inst.treeDrawMonolith && syncTreeSegmentsColorCrossfade(inst, fade)
}
//
// Fades newly revealed tree segments in.
//
function updateTreeRevealFade(inst, dt) {
  const ids = inst.treeSegmentIds
  if (!ids?.length) return
  if (!inst._treeRevealFadePending && !ids.some(id => inst.treeSegmentEntries?.[id]?.fadeActive)) return
  const fade = glowDecorFade(inst)
  let anyPending = false
  ids.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    if (!entry?.fadeActive) return
    anyPending = true
    entry.fade = Math.min(1, entry.fade + dt / TREE_REVEAL_FADE_DURATION)
    entry.grayObj.hidden = false
    entry.colorObj.hidden = false
    entry.grayObj.opacity = (1 - fade) * entry.fade
    entry.colorObj.opacity = fade * entry.fade
    entry.grayObj.pos.x = 0
    entry.colorObj.pos.x = 0
    entry.fade >= 1 && (entry.fadeActive = false)
  })
  inst._treeRevealFadePending = anyPending
}
//
// Applies saved segment visibility on scene entry.
//
function applyPersistedTreeSegmentVisibility(entries, revealedSet) {
  revealedSet.forEach(id => {
    const entry = entries[id]
    entry && setTreeSegmentRevealedVisual(entry, 1)
  })
}
//
// True when at least one tree segment is visible.
//
function hasAnyTreeSegmentVisible(inst) {
  return inst.treeSegmentIds?.some(id => inst.treeSegmentEntries?.[id]?.revealed)
}
//
// True when every baked segment has been revealed.
//
function isAllTreeSegmentsRevealed(inst) {
  const ids = inst.treeSegmentIds
  if (!ids?.length) return Boolean(inst.zones.tree)
  return ids.every(id => inst.treeSegmentRevealed?.has(id))
}
//
// Soft right-ground opacity: opened land is solid, the unknown fades out.
//
function glowRightWorldOpacity(sc, x, rank) {
  if (!sc?.zones) return 0
  if (sc.zones.groundDecorRight) return 1
  const stripMax = sc.zones.groundRightStripMax ?? -1
  //
  // Nothing on the right ground peeks in from the start branch. The first
  // landing past the tree opens strip 0 and the fade/lookahead can begin.
  //
  if (stripMax < 0) return 0
  const lookahead = rank === 'small' ? GROUND_DETAIL_LOOKAHEAD : GROUND_REVEAL_LOOKAHEAD
  return groundRightAppearOpacity(x, {
    stripStartX: GROUND_REVEAL_TREE_PAST_X,
    stripEndX: sc.treeStripEndX ?? sc.zones._groundStripEndX ?? WORLD_W,
    stripMax,
    heroX: sc.heroInst?.character?.pos.x ?? GROUND_REVEAL_TREE_PAST_X,
    fadeWidth: GROUND_REVEAL_FADE_WIDTH,
    lookahead
  })
}
function glowRightDecorOpacity(inst, obj) {
  const x = obj._decorWorldX ?? obj._homeX ?? 0
  return glowRightWorldOpacity(inst, x, obj._detailRank === 'small' ? 'small' : 'large')
}
//
// Fades left-shore decor in and keeps the right-side discovery edge soft.
//
function updateExploreFades(inst, dt) {
  const z = inst.zones
  const colorSettled = z.colorWorld && (inst.colorFade ?? 0) >= 1
  const exploreSettled = z.groundDecorRight && (inst.leftDecorFade >= 1 || !z.groundDecorLeft)
  if (exploreSettled && colorSettled) return
  if (z.groundDecorLeft && inst.leftDecorFade < 1) {
    inst.leftDecorFade = Math.min(1, inst.leftDecorFade + dt / LEFT_DECOR_FADE_DURATION)
  }
  if (inst.grassLayer?.layer) {
    inst.grassLayer.layer.hidden = !z.groundDecorLeft && z.groundRightStripMax < 0
  }
  if (!exploreSettled && !z.groundDecorRight) {
    inst.rockObjs?.forEach(o => {
      if (o._side !== 'right' || o._lakeShoreEnd) return
      const op = glowRightDecorOpacity(inst, o)
      setDecorObjVisible(o, op > 0.04, op)
    })
    inst.mushObjs?.forEach(o => {
      if (o._side !== 'right') return
      const wx = o._decorWorldX ?? o._homeX ?? 0
      const inLake = z._lakeX1 != null && z._lakeX2 != null && wx >= z._lakeX1 && wx <= z._lakeX2
      const op = glowRightDecorOpacity(inst, o)
      setDecorObjVisible(o, op > 0.04 && !inLake, op)
    })
  }
  if (!exploreSettled && z.groundDecorLeft && inst.leftDecorFade < 1) {
    inst.rockObjs?.forEach(o => {
      if (o._side !== 'left' || o._lakeShoreEnd) return
      const show = o._waterCluster ? z.water : true
      setDecorObjVisible(o, show, inst.leftDecorFade)
    })
    inst.mushObjs?.forEach(o => {
      if (o._side !== 'left') return
      const wx = o._decorWorldX ?? o._homeX ?? 0
      const inLake = z._lakeX1 != null && z._lakeX2 != null && wx >= z._lakeX1 && wx <= z._lakeX2
      setDecorObjVisible(o, !inLake, inst.leftDecorFade)
    })
  }
  !colorSettled && updateAtmosphereMotes(inst, dt)
}
//
// Opens ground strips to the right of the tree based on hero X.
//
function updateGroundRightStripReveal(inst, heroX) {
  const z = inst.zones
  const idx = groundRightStripIndexForX(heroX, GROUND_REVEAL_TREE_PAST_X, inst.treeStripEndX)
  if (idx < 0 || idx <= z.groundRightStripMax) return
  const firstStrip = z.groundRightStripMax < 0
  z.groundRightStripMax = idx
  set(KEY_GROUND_RIGHT_STRIP_MAX, idx)
  if (idx >= GROUND_RIGHT_STRIP_COUNT - 1) {
    z.groundDecorRight = true
    set(KEY_REVEALED_GROUND_DECOR_RIGHT, true)
    set(KEY_REVEALED_GROUND_DECOR, true)
  }
  firstStrip && playSegmentRevealSound(inst)
  firstStrip && HeroHint.show(inst.heroHint, HINT_GROUND_RIGHT_TEXT, HINT_ZONE_DURATION, {
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE,
    dismissOnJump: false
  })
  applyZoneVisibility(inst)
  syncGlowAtmosphereZones(inst)
  maybeShowGLetter(inst)
  syncGlowHudLetterFills(inst)
}
//
// Shows the tree-side lake cap rock when the hero runs left of the trunk.
//
function revealLeftShoreRock(inst) {
  if (inst.zones.leftShoreRock) return
  inst.zones.leftShoreRock = true
  set(KEY_LEFT_SHORE_ROCK, true)
  applyZoneVisibility(inst)
  maybeShowGLetter(inst)
}
//
// Right trampoline collider — only after the mushroom is revealed (or colour world).
//
function isRightTrampolineColliderActive(z) {
  return isRightTrampolineVisible(z)
}
//
// Branch trampoline collider — only after the mushroom is revealed (or colour world).
//
function isBranchTrampolineColliderActive(z) {
  return isBranchTrampolineVisible(z)
}
//
// Right trampoline mushroom is visible only after a nearby landing (or colour world).
//
function isRightTrampolineVisible(z) {
  return Boolean(z?.rightTrampRevealed || z?.colorWorld)
}
//
// Branch trampoline mushroom uses the same landing gate (or colour world).
//
function isBranchTrampolineVisible(z) {
  return Boolean(z?.branchTrampRevealed || z?.colorWorld)
}
//
// True when the hero stands in the landing-reveal radius of a hidden trampoline.
//
function isHeroNearUnrevealedTrampSpot(inst, heroX) {
  const z = inst.zones
  if (z.colorWorld) return false
  const near = (x) => Math.abs(heroX - x) <= TRAMP_MUSH_LAND_REVEAL_DIST
  if (z.gCollected && !z.rightTrampRevealed && near(inst.trampState?.x ?? -9999)) return true
  if (!z.branchTrampRevealed && near(inst.branchTrampState?.x ?? -9999)) return true
  return false
}
//
// Shows a fixed "missing mushroom" tooltip at each unrevealed trampoline pad.
//
function updateTrampMissingPlaceHints(inst, heroX, footY, grounded) {
  const z = inst.zones
  inst.trampMissingHints = inst.trampMissingHints ?? { right: null, branch: null, cave: null }
  const canShow = grounded && footY >= FLOOR_Y - 28 && !z.colorWorld
  const rightHere = trampMissingPadHere(inst, inst.trampState?.x ?? -9999, z.rightTrampRevealed || !z.gCollected)
  const branchHere = trampMissingPadHere(inst, inst.branchTrampState?.x ?? -9999, z.branchTrampRevealed)
  syncOneTrampMissingHint(inst, 'right', inst.trampState?.x ?? -9999, canShow && rightHere)
  syncOneTrampMissingHint(inst, 'branch', inst.branchTrampState?.x ?? -9999, canShow && branchHere)
  const cave = getCrackZone(WORLD_W, FLOOR_Y)
  const caveMid = (cave.x1 + cave.x2) * 0.5
  const overCave = heroX >= cave.x1 && heroX <= cave.x2 &&
    footY <= FLOOR_Y + 20 &&
    !inst.pit?.collapsed
  syncOneTrampMissingHint(inst, 'cave', caveMid, grounded && overCave)
}
//
// True while the hero stands in the hidden mushroom's landing area.
//
function trampMissingPadHere(inst, trampX, revealed) {
  if (revealed || inst.zones.colorWorld) return false
  const heroX = inst.heroInst?.character?.pos?.x ?? 0
  return Math.abs(heroX - trampX) <= TRAMP_MUSH_LAND_REVEAL_DIST
}
//
// Creates or destroys one trampoline placeholder tooltip. These stay up for
// as long as the hero remains in the mushroom / cave area — they do not use
// the walk-away dismiss radius of other Glow speech bubbles.
//
function syncOneTrampMissingHint(inst, slotKey, worldX, show) {
  const existing = inst.trampMissingHints[slotKey]
  if (!show) {
    existing && Tooltip.destroy(existing)
    inst.trampMissingHints[slotKey] = null
    return
  }
  if (existing) return
  const tip = createGlowTooltip({
    k: inst.k,
    forceVisible: true,
    targets: [{
      x: worldX,
      y: FLOOR_Y - TRAMP_TOTAL_H / 2,
      width: TRAMP_TOTAL_W,
      height: TRAMP_TOTAL_H,
      text: TRAMP_MISSING_HINT_TEXT,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET
    }]
  })
  tip.activeTarget = tip.targets[0]
  tip.opacity = 1
  inst.trampMissingHints[slotKey] = tip
}
//
// Removes a placeholder tooltip when the mushroom appears.
//
function clearTrampMissingHint(inst, slotKey) {
  const tip = inst.trampMissingHints?.[slotKey]
  tip && Tooltip.destroy(tip)
  inst.trampMissingHints && (inst.trampMissingHints[slotKey] = null)
}
//
// First mushroom: wonder at its size. Second: recognition that another exists.
//
function showTrampolineRevealHint(inst) {
  if (inst.zones.colorWorld) return
  const z = inst.zones
  const n = (z.rightTrampRevealed ? 1 : 0) + (z.branchTrampRevealed ? 1 : 0)
  const text = n >= 2 ? TRAMP_SECOND_REVEAL_HINT_TEXT : TRAMP_FIRST_REVEAL_HINT_TEXT
  HeroHint.show(inst.heroHint, text, TRAMP_REVEAL_HINT_DURATION, {
    dismissOnJump: false,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE
  })
}
//
// Reveals trampoline mushrooms when the hero first touches their landing zone.
//
function maybeRevealTrampolineMushroomOnLand(inst, heroX, footY, grounded, justLanded) {
  if (!grounded || !justLanded) return
  const z = inst.zones
  const near = (x) => Math.abs(heroX - x) <= TRAMP_MUSH_LAND_REVEAL_DIST
  const nearRight = Boolean(z.gCollected && near(inst.trampState?.x ?? -9999))
  const nearBranch = near(inst.branchTrampState?.x ?? -9999)
  if (!z.rightTrampRevealed && nearRight) {
    revealRightTrampoline(inst)
  }
  if (!z.branchTrampRevealed && nearBranch) {
    revealBranchTrampoline(inst)
  }
}
//
// Persists the right trampoline mushroom reveal.
//
function revealRightTrampoline(inst) {
  if (inst.zones.rightTrampRevealed) return
  if (!inst.zones.gCollected && !inst.zones.colorWorld) return
  inst.zones.rightTrampRevealed = true
  set(KEY_RIGHT_TRAMP_REVEALED, true)
  clearTrampMissingHint(inst, 'right')
  Sound.stopAmbient(inst.sound)
  triggerGlowCameraShake(inst)
  applyZoneVisibility(inst)
  syncGlowHudLetterFills(inst)
  showTrampolineRevealHint(inst)
}
//
// Reveals tree segments on each start-branch landing (hero branch first).
//
function revealTreeSegmentsOnBranchLanding(inst) {
  inst.treeRevealLandingCount = (inst.treeRevealLandingCount ?? 0) + 1
  inst.treeSegmentPending.length && revealOneTreeSegment(inst, inst.treeSegmentPending.shift())
  if (isAllTreeSegmentsRevealed(inst)) {
    finishTreeRevealIfComplete(inst)
    return
  }
  applyZoneVisibility(inst)
  maybeShowGLetter(inst)
  syncGlowHudLetterFills(inst)
}
//
// Marks one tree segment visible and starts its fade-in.
//
function revealOneTreeSegment(inst, segmentId) {
  if (inst.treeSegmentRevealed.has(segmentId)) return
  inst.treeSegmentRevealed.add(segmentId)
  const entry = inst.treeSegmentEntries[segmentId]
  if (!entry) return
  setTreeSegmentRevealedVisual(entry, 0)
  entry.fadeActive = true
  syncTreeSegmentsVisibility(inst)
  persistTreeSegmentsRevealed(inst)
  playSegmentRevealSound(inst)
  triggerGlowCameraShake(inst)
}
//
// Writes revealed segment ids to localStorage.
//
function persistTreeSegmentsRevealed(inst) {
  set(KEY_TREE_SEGMENTS_REVEALED, [...inst.treeSegmentRevealed])
}
//
// When every segment is open, mark the legacy tree zone complete.
//
function finishTreeRevealIfComplete(inst) {
  if (!isAllTreeSegmentsRevealed(inst)) return
  const justOpened = !inst.zones.tree
  inst.pendingTreeReveal = false
  inst.zones.tree = true
  set(KEY_REVEALED_TREE, true)
  applyZoneVisibility(inst)
  maybeShowGLetter(inst)
  justOpened && HeroHint.show(inst.heroHint, HINT_TREE_REVEAL_TEXT, HINT_TREE_REVEAL_DURATION, {
    dismissOnJump: false,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE
  })
  syncGlowHudLetterFills(inst)
}
//
// Short camera bump for tree reveals, tramp landings and letter pickups.
//
function triggerGlowCameraShake(inst) {
  inst.camera && GlowCamera.triggerShake(inst.camera, GLOW_CAMERA_SHAKE_AMP, GLOW_CAMERA_SHAKE_DURATION)
}
//
// Sets one segment to a given fade opacity.
//
function setTreeSegmentRevealedVisual(entry, opacity) {
  entry.revealed = true
  entry.fade = opacity
  entry.fadeActive = false
  entry.grayObj.hidden = false
  entry.colorObj.hidden = false
  entry.grayObj.opacity = opacity
  entry.colorObj.opacity = opacity
  entry.grayObj.pos.x = 0
  entry.colorObj.pos.x = 0
}
//
// Gray tree segments switch to the warm lit palette after L.
//
function syncTreeSegmentGraySprites(inst) {
  const lit = Boolean(inst.zones.lCollected)
  const want = lit ? 'lit' : 'flat'
  if (inst.treeSegmentGrayVariant === want) return
  inst.treeSegmentGrayVariant = want
  inst.treeSegmentIds?.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    if (!entry) return
    const name = TreeSegments.segmentGraySpriteName(id, lit)
    entry.grayObj.use(inst.k.sprite(name))
  })
}
//
// Hides unrevealed segments; revealed ones respect colour-world cross-fade.
//
function syncTreeSegmentsVisibility(inst) {
  const fade = inst.colorFade ?? 0
  const showColorTree = fade >= 0.5
  inst.treeSegmentIds?.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    if (!entry) return
    if (!entry.revealed) {
      entry.grayObj.hidden = true
      entry.colorObj.hidden = true
      entry.grayObj.opacity = 0
      entry.colorObj.opacity = 0
      entry.grayObj.pos.x = -WORLD_W
      entry.colorObj.pos.x = -WORLD_W
      return
    }
    entry.grayObj.pos.x = 0
    entry.colorObj.pos.x = 0
    if (entry.fadeActive) return
    entry.grayObj.hidden = showColorTree
    entry.colorObj.hidden = !showColorTree
    entry.grayObj.opacity = 1
    entry.colorObj.opacity = 1
  })
}
//
// Catches tunneling onto the mushroom cap before lake-floor / ground snap.
//
function snapHeroToTrampolineCap(inst, char, heroX, footY) {
  if (inst.drowning || inst.dialogPostSettle > 0) return
  isRightTrampolineVisible(inst.zones) &&
    snapHeroToOneTrampolineCap(inst, char, heroX, footY, inst.trampState)
  isBranchTrampolineVisible(inst.zones) &&
    snapHeroToOneTrampolineCap(inst, char, heroX, footY, inst.branchTrampState)
}
//
// Snaps the hero onto one mushroom cap when feet tunnel through the collider.
//
function snapHeroToOneTrampolineCap(inst, char, heroX, footY, state) {
  if (!state) return
  if (Math.abs(heroX - state.x) >= TRAMP_RADIUS + TRAMP_ADJACENT_X) return
  const hero = inst.heroInst
  if (hero?.isSquashing) return
  const velY = char.vel?.y ?? 0
  if (velY < 0) return
  const capTop = FLOOR_Y - TRAMP_TOTAL_H
  const grounded = char.isGrounded?.() ?? false
  if (grounded && footY <= capTop + LOG_SNAP_STANDING_MAX) return
  if (footY >= capTop - LOG_HOVER_BAND && footY <= capTop + TRAMP_SNAP_BELOW) {
    settleHeroOnLog(inst, char, capTop, true)
  }
}
//
// Catches tunneling through the thin start-branch collider before lake-floor snap.
//
function snapHeroToStartBranch(inst, char, heroX, footY) {
  if (!inst.startBranch || inst.drowning || inst.dialogOpen ||
    inst.dialogInputGrace > 0 || inst.dialogPostSettle > 0) return
  if (!isHeroOverStartBranchX(inst, heroX)) return
  const hero = inst.heroInst
  if (hero?.isSquashing) return
  //
  // Never pin mid-air during a real branch jump (caused apex hang / dead jump)
  //
  if (hero?.jumpPhase === 'jumping' && !(char.isGrounded?.() ?? false)) return
  const velY = char.vel?.y ?? 0
  if (velY < 0) return
  const platTop = inst.startBranch.y
  const grounded = char.isGrounded?.() ?? false
  if (grounded && footY <= platTop + LOG_SNAP_STANDING_MAX) return
  if (footY >= platTop - LOG_HOVER_BAND && footY <= platTop + BRANCH_SNAP_BELOW) {
    settleHeroOnLog(inst, char, platTop)
  }
}
//
// Prevents rare fall-through on the main floor (hero sinks below the floor line).
//
function snapHeroToMainGround(inst, char, grounded, heroX, footY) {
  if (inst.drowning || inst.dialogOpen || inst.dialogInputGrace > 0 || inst.dialogPostSettle > 0) return
  const crack = getCrackZone(WORLD_W, FLOOR_Y)
  if (heroX < LEFT_MARGIN + 8 || heroX > crack.x1 - 4) return
  if (isHeroOverLetterLog(inst, heroX)) return
  if (isHeroNearTrampolineX(inst, heroX)) return
  if (isOnTrampolineCap(inst, char)) return
  const velY = char.vel?.y ?? 0
  if (velY < 0) return
  //
  // Standing on the floor — Kaplay owns the pose; never re-pin (caused bounce loops).
  //
  if (footY <= FLOOR_Y + LOG_SNAP_STANDING_MAX) return
  //
  // Feet tunnelled below the visible floor — pull back up once
  //
  if (footY > FLOOR_Y + LOG_SNAP_DEEP_SINK && footY <= FLOOR_Y + 36) {
    char.pos.y = FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    if (char.vel && char.vel.y > 0) char.vel.y = 0
  }
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
  //
  // Start branch — always solid even while the tree sprite is hidden
  //
  if (inst.startBranch) {
    homes.push({
      x: inst.startBranch.x1,
      y: inst.startBranch.y,
      w: inst.startBranch.x2 - inst.startBranch.x1,
      dropY: 0
    })
  }
  z.lPlatRevealed && homes.push(inst.lPlatHome)
  z.oZone && z.lCollected && homes.push(inst.oPlatHome)
  z.wZone && z.oCollected && homes.push(inst.wPlatHome)
  let hoverHome = null
  for (const home of homes) {
    const w = home.w ?? LOG_W
    const dropY = home.dropY ?? LOG_COLLISION_DROP_Y
    const isStartBranch = inst.startBranch &&
      home.x === inst.startBranch.x1 &&
      home.y === inst.startBranch.y
    //
    // Mid-air branch jumps must not be pinned at apex (hover / anti-tunnel)
    //
    if (isStartBranch && hero?.jumpPhase === 'jumping' && !grounded) {
      continue
    }
    if (heroX < home.x - LOG_SNAP_X_SLACK || heroX > home.x + w + LOG_SNAP_X_SLACK) continue
    //
    // Physics top of the log = sprite top + the collision drop offset.
    //
    const platTop = home.y + dropY
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
      // Start branch: always snap — thin collider over the lake must not tunnel.
      //
      if (velY >= LOG_SNAP_FALL_VEL && !isStartBranch) continue
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
  const hoverIsStartBranch = inst.startBranch &&
    hoverHome.x === inst.startBranch.x1 &&
    hoverHome.y === inst.startBranch.y
  if (hoverIsStartBranch && (hero?.jumpPhase === 'jumping' || hero?.wasJumping)) {
    inst.logHoverFrames = 0
    return
  }
  inst.logHoverFrames += 1
  if (inst.logHoverFrames >= LOG_HOVER_FRAMES) {
    const dropY = hoverHome.dropY ?? LOG_COLLISION_DROP_Y
    settleHeroOnLog(inst, char, hoverHome.y + dropY)
    inst.logHoverFrames = 0
  }
}
//
// Pins the hero on a log top with a 1 px embed so Kaplay keeps him grounded
// (exact surface placement left isGrounded false → jump squash never fired).
// postLandAirLock blocks a snap-induced second crouch.
//
function settleHeroOnLog(inst, char, platTop, skipPostLandLock = false) {
  const hero = inst.heroInst
  //
  // During letter dialogs always settle — land-squash must not leave the hero
  // hovering / twitching on wood while controls are locked.
  //
  if (hero?.isSquashing && !inst.dialogOpen) return
  char.pos.y = platTop - SURFACE_DETECT_Y + LOG_SNAP_EMBED
  if (char.vel) char.vel.y = 0
  if (!hero) return
  !skipPostLandLock && (hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_GLOW))
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
// Drives the visible lake sink — Kaplay tween so Y is not fought by physics.
//
function beginDrownSinkTween(inst) {
  const k = inst.k
  const floorY = drownFloorStandY()
  const sinkTargetY = DROWN_FULL_SINK_FEET_Y - SURFACE_DETECT_Y
  const fromY = inst.drownSinkY
  inst.drownSinkTween?.cancel?.()
  const runSinkPhase = (startY, endY, speed, onComplete) => {
    const distance = endY - startY
    if (distance <= 0.01) {
      onComplete?.()
      return
    }
    const duration = distance / speed
    inst.drownSinkTween = k.tween(startY, endY, duration, (y) => {
      inst.drownSinkY = y
      inst.heroInst.drownSinkY = y
      applyDrownSinkPose(inst)
    }, k.easings.linear)
    inst.drownSinkTween.onEnd(() => {
      inst.drownSinkY = endY
      inst.heroInst.drownSinkY = endY
      applyDrownSinkPose(inst)
      onComplete?.()
    })
  }
  const completeDrown = () => !inst.deathHandled && finishDrowning(inst)
  if (fromY < floorY - 0.5) {
    runSinkPhase(fromY, floorY, DROWN_DESCEND_SPEED, () => {
      runSinkPhase(floorY, sinkTargetY, DROWN_UNIFIED_SINK_SPEED, completeDrown)
    })
  } else {
    runSinkPhase(fromY, sinkTargetY, DROWN_UNIFIED_SINK_SPEED, completeDrown)
  }
}
//
// Flashes life icon gold/white on drowning death (touch lesson 0 pattern
// recoloured to the glow gold — perception happens through colour here).
//
function flashLifeImageOnDrownDeath(k, levelIndicator, originalColor, count, greyLife = false) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  if (count >= LIFE_FLASH_COUNT) {
    levelIndicator.lifeImage.sprite.color = originalColor
    levelIndicator.lifeImage.sprite.opacity = 1.0
    levelIndicator._lifeFlashLock = false
    return
  }
  const flashA = greyLife ? glowRgb('decorGray') : glowRgb(GLOW_GOLD_HEX)
  const flashB = greyLife ? glowRgb('decorGray') : glowRgb('brightLight')
  if (count % 2 === 0) {
    levelIndicator.lifeImage.sprite.color = k.rgb(flashA.r, flashA.g, flashA.b)
    levelIndicator.lifeImage.sprite.opacity = 1.0
  } else {
    levelIndicator.lifeImage.sprite.color = k.rgb(flashB.r, flashB.g, flashB.b)
    levelIndicator.lifeImage.sprite.opacity = greyLife ? 0.35 : 0.5
  }
  k.wait(LIFE_FLASH_INTERVAL, () => flashLifeImageOnDrownDeath(k, levelIndicator, originalColor, count + 1, greyLife))
}
//
// Gold square particles radiating from life icon on drowning death.
//
function createLifeParticlesOnDrownDeath(k, levelIndicator, greyLife = false) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  const lifeX = levelIndicator.lifeImage.sprite.pos.x
  const lifeY = levelIndicator.lifeImage.sprite.pos.y
  const tone = greyLife ? glowRgb('decorGray') : glowRgb(GLOW_GOLD_HEX)
  for (let i = 0; i < LIFE_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LIFE_PARTICLE_COUNT
    const speed = LIFE_PARTICLE_SPEED_MIN + Math.random() * LIFE_PARTICLE_SPEED_EXTRA
    const lifetime = LIFE_PARTICLE_LIFETIME_MIN + Math.random() * LIFE_PARTICLE_LIFETIME_EXTRA
    const size = LIFE_PARTICLE_SIZE_MIN + Math.random() * LIFE_PARTICLE_SIZE_EXTRA
    const particle = k.add([
      k.rect(size, size),
      k.pos(lifeX, lifeY),
      k.color(tone.r, tone.g, tone.b),
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
  particle.moveBy(vx * k.dt(), vy * k.dt())
  particle.opacity = 1 - particle._elapsed / lifetime
  particle._elapsed >= lifetime && particle.destroy?.()
}
//
// Spawns a landing/run-start dust burst tinted to the surface under the
// hero's feet — gray while the world is flat/monochrome, earthy colour once
// it isn't (footParticleColor already carries that split), so the puff
// always shows, just recoloured to match the current world state.
//
function spawnGlowFootLanding(inst, footX, footY, surface, sceneInst, char) {
  if (!inst || sceneInst?.drowning || surface === 'wood') return
  //
  // Wood guard: surface tags and foot position can disagree for a frame
  // before/after log snaps — never leave dust on branch or log platforms.
  //
  if (isGlowWoodFootPosition(sceneInst, footX, footY, char)) return
  //
  // Only the main ground gets a puff — branch and log tops stay clean.
  //
  if (!isOnGlowMainGroundFoot(footY)) return
  let atCaveEntrance = false
  const pit = sceneInst?.pit
  if (pit?.cracksVisible && !pit.collapsed) {
    const zone = getCrackZone(WORLD_W, FLOOR_Y)
    if (footX >= zone.x1 && footX <= zone.x2 && footY >= FLOOR_Y - 14) {
      atCaveEntrance = true
    }
  }
  const countMult = atCaveEntrance ? CAVE_ENTRANCE_LANDING_PARTICLE_MULT : 1
  GlowFootParticles.spawnLanding(
    inst,
    footX,
    footY,
    footParticleColor(sceneInst, surface, footX, footY),
    countMult
  )
}
//
// Picks earth or bark tone for foot particles based on the landing surface
//
function footParticleColor(sceneInst, surface, footX = 0, footY = 0) {
  if (sceneInst && isGlowFlatSingleDecorColor(sceneInst)) {
    return DECOR_GRAY
  }
  if (sceneInst?.pit?.cracksVisible && !sceneInst.pit.collapsed) {
    const zone = getCrackZone(WORLD_W, FLOOR_Y)
    if (footX >= zone.x1 && footX <= zone.x2 && footY >= FLOOR_Y - 28) {
      return DECOR_GRAY
    }
  }
  if (surface === 'wood') {
    return glowRgb(GLOW_PAL.treeGray.trunk)
  }
  return lerpRgb(INNER_GRAY, GROUND_DARK, sceneInst?.colorFade || 0)
}
//
// True when a world X lies outside the current horizontal camera view.
//
function isWorldPointOutsideCameraView(inst, worldX, margin = 48) {
  const camX = inst.k.camPos().x
  const zoom = inst.camera?.zoom || 1
  const half = VIEW_W / (2 * zoom)
  return worldX < camX - half + margin || worldX > camX + half - margin
}
//
// World X the edge arrow should point at (W log, L log, O letter, or L platform after G).
//
function getLetterArrowTargetX(inst) {
  if (inst.wLetter && !inst.wLetter.main.hidden && !inst.zones.wCollected && inst.zones.wZone) {
    return inst.wLetter.x
  }
  if (inst.lLetter && !inst.lLetter.main.hidden && !inst.zones.lCollected) return inst.lLetter.x
  if (inst.oLetter && !inst.oLetter.main.hidden && !inst.zones.oCollected && inst.zones.oZone) {
    return inst.oLetter.x
  }
  if (inst.zones.gCollected && !inst.zones.lCollected && inst.zones.lPlatRevealed && inst.lPlatHome) {
    return inst.lPlatHome.x + LOG_W * 0.5
  }
  return null
}
//
// Center of the L log platform — arrow target right after G until L is taken.
//
function getLPlatformArrowTargetX(inst) {
  if (!inst.zones.gCollected || inst.zones.lCollected || !inst.lPlatHome) return null
  return inst.lPlatHome.x + LOG_W * 0.5
}
//
// Points a menu-style edge arrow at an off-screen L or O letter.
//
function maybeStartLetterOffscreenArrow(inst, letter) {
  if (!letter || letter.main.hidden) return
  maybeStartLetterOffscreenArrowForTarget(inst, letter.x)
}
//
// Arms the edge arrow when the target world X lies outside the camera view.
//
function maybeStartLetterOffscreenArrowForTarget(inst, worldX) {
  if (worldX == null) return
  if (!isWorldPointOutsideCameraView(inst, worldX)) return
  const camX = inst.k.camPos().x
  inst.letterOffscreenArrow = {
    side: worldX < camX ? 'left' : 'right',
    phase: 0
  }
}
//
// Keeps the edge arrow while the letter stays off-screen; clears when visible.
//
function updateLetterOffscreenArrow(inst, dt) {
  const hint = inst.letterOffscreenArrow
  if (!hint) return
  const targetX = getLetterArrowTargetX(inst)
  if (targetX == null || !isWorldPointOutsideCameraView(inst, targetX)) {
    inst.letterOffscreenArrow = null
    return
  }
  const camX = inst.k.camPos().x
  hint.side = targetX < camX ? 'left' : 'right'
  hint.phase += dt * LETTER_OFFSCREEN_ARROW_SWAY_SPEED
}
//
// Draws the swaying off-screen letter hint in fixed screen space.
//
function drawLetterOffscreenArrow(inst) {
  const hint = inst.letterOffscreenArrow
  if (!hint || getLetterArrowTargetX(inst) == null) return
  const k = inst.k
  const sway = Math.sin(hint.phase) * LETTER_OFFSCREEN_ARROW_SWAY_AMP
  const baseX = hint.side === 'left'
    ? LEFT_MARGIN + LETTER_OFFSCREEN_ARROW_EDGE_INSET
    : SCREEN_W - RIGHT_MARGIN - LETTER_OFFSCREEN_ARROW_EDGE_INSET
  const cx = baseX + (hint.side === 'left' ? sway : -sway)
  drawMenuStyleEdgeArrow(k, cx, LETTER_OFFSCREEN_ARROW_Y, hint.side, inst.zones.colorWorld)
}
//
// Menu-style metal chevron (body + outline) pointing left or right.
//
function drawMenuStyleEdgeArrow(k, cx, cy, side, colorWorld = false) {
  const s = LETTER_OFFSCREEN_ARROW_SIZE
  const outline = k.rgb(MENU_ARROW_OUTLINE_RGB.r, MENU_ARROW_OUTLINE_RGB.g, MENU_ARROW_OUTLINE_RGB.b)
  const bodyRgb = colorWorld ? glowRgb(GLOW_GOLD_HEX) : MENU_ARROW_BODY_RGB
  const body = k.rgb(bodyRgb.r, bodyRgb.g, bodyRgb.b)
  const o = MENU_ARROW_OUTLINE_WIDTH
  const op = MENU_ARROW_DRAW_OPACITY
  const dir = side === 'left' ? -1 : 1
  const stemHalf = LETTER_OFFSCREEN_ARROW_STEM_W * 0.5
  const headHalf = s * 0.5
  const tipX = cx + dir * s * 0.7
  const headBackX = cx - dir * s * 0.3
  const stemBackX = headBackX - dir * LETTER_OFFSCREEN_ARROW_STEM_LEN
  const stemFrontX = headBackX + dir * LETTER_ARROW_STEM_HEAD_OVERLAP
  const r = LETTER_ARROW_CORNER_RADIUS
  const stemLeft = Math.min(stemBackX, stemFrontX)
  const stemSpan = Math.abs(stemFrontX - stemBackX)
  k.drawRect({
    pos: k.vec2(stemLeft - o, cy - stemHalf - o),
    width: stemSpan + o * 2,
    height: stemHalf * 2 + o * 2,
    radius: r + o,
    color: outline,
    opacity: op,
    fixed: true
  })
  k.drawRect({
    pos: k.vec2(stemLeft, cy - stemHalf),
    width: stemSpan,
    height: stemHalf * 2,
    radius: r,
    color: body,
    opacity: op,
    fixed: true
  })
  const headPts = buildRoundedArrowHeadPolygon(k, headBackX, tipX, cy, headHalf, stemHalf, dir, r, false)
  const headOutlinePts = buildRoundedArrowHeadPolygon(k, headBackX, tipX, cy, headHalf, stemHalf, dir, r, true, o)
  k.drawPolygon({ pts: headOutlinePts, color: outline, opacity: op, fixed: true, triangulate: true })
  k.drawPolygon({ pts: headPts, color: body, opacity: op, fixed: true, triangulate: true })
}
//
// Arrowhead polygon with slightly rounded shoulders and tip (chamfered corners).
//
function buildRoundedArrowHeadPolygon(k, headBackX, tipX, cy, headHalf, stemHalf, dir, cornerR, outline, outlinePad = 0) {
  const pad = outline ? outlinePad : 0
  const hb = headBackX
  const tx = tipX + (outline ? dir * pad : 0)
  const th = headHalf + pad
  const sh = stemHalf + pad
  const tipLeadX = tx - dir * cornerR
  return [
    k.vec2(hb, cy - sh),
    k.vec2(hb, cy - th + cornerR),
    k.vec2(hb + dir * cornerR, cy - th),
    k.vec2(tipLeadX, cy - cornerR * 0.65),
    k.vec2(tx, cy),
    k.vec2(tipLeadX, cy + cornerR * 0.65),
    k.vec2(hb + dir * cornerR, cy + th),
    k.vec2(hb, cy + th - cornerR),
    k.vec2(hb, cy + sh)
  ]
}
//
// After a right-tramp bounce, landing on the L log unveils the letter.
//
function tryUnveilLLetterAfterTramp(inst, heroX, footY, grounded, justLanded) {
  if (!inst.zones.gCollected || inst.zones.lLetterUnveiled || !inst.zones.lPlatRevealed) return
  if (!justLanded || !grounded || !inst.trampToLApproach) return
  const home = inst.lPlatHome
  if (!home) return
  const onLLog = heroX >= home.x - LOG_SNAP_X_SLACK &&
    heroX <= home.x + LOG_W + LOG_SNAP_X_SLACK &&
    footY >= home.y - LOG_SNAP_STANDING_MAX &&
    footY <= home.y + LOG_SNAP_BELOW
  if (!onLLog) return
  inst.trampToLApproach = false
  inst.zones.lLetterUnveiled = true
  set(KEY_L_LETTER_UNVEILED, true)
  markLPlatStepped(inst)
  applyZoneVisibility(inst)
  playSegmentRevealSound(inst)
  maybeStartLetterOffscreenArrow(inst, inst.lLetter)
}
//
// Half-to-full L HUD fill when the hero stands on the log left of the right tramp.
//
function maybeMarkLPlatStepped(inst, char, grounded) {
  if (!grounded || !char?.pos) return
  const home = inst.lPlatHome
  if (!home || !inst.zones.lPlatRevealed) return
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  const onLLog = heroX >= home.x - LOG_SNAP_X_SLACK &&
    heroX <= home.x + LOG_W + LOG_SNAP_X_SLACK &&
    footY >= home.y - LOG_SNAP_STANDING_MAX &&
    footY <= home.y + LOG_SNAP_BELOW
  onLLog && markLPlatStepped(inst)
  onLLog && maybeSpawnHedgehogAmbush(inst)
}
//
// Persists that the left ambush hedgehog has already popped — the next
// level load must show it visible instead of hiding it again.
//
function markLeftHedgehogRevealed() {
  set(KEY_LEFT_HEDGEHOG_REVEALED, true)
}
//
// Same for the L-log ambush hedgehog (independent of whether L was taken).
//
function markAmbushHedgehogRevealed() {
  set(KEY_AMBUSH_HEDGEHOG_REVEALED, true)
}
//
// Left hedgehog ambush: stays hidden until the hero has run a stretch past
// the branch trampoline, then pops out at a fixed spot a bit further
// ahead of him — at running speed there's normally no time to react before
// the hitbox overlaps (a small bonus lead is added while actually
// sprinting so it isn't quite instant-death), but creeping forward slowly
// leaves a real gap between the pop and actual contact, long enough to
// spot it and jump.
//
function maybeSpawnLeftHedgehogAmbush(inst, heroX, heroVelX) {
  if (!inst.hedgehog || inst.hedgehog.popped) return
  if (heroX < inst.hedgehogAmbushTriggerX) return
  const running = Math.abs(heroVelX) > HEDGEHOG_LEFT_AMBUSH_RUN_SPEED_THRESHOLD
  const popX = inst.hedgehogAmbushPopX + (running ? HEDGEHOG_LEFT_AMBUSH_RUN_POP_LEAD_BONUS : 0)
  Hedgehog.popOut(inst.hedgehog, popX, FLOOR_Y - HEDGEHOG_GROUND_RAISE, 'left')
  markLeftHedgehogRevealed()
}
//
// Fallback: if the hero somehow reaches the L-log without tripping the
// pre-land pop below (e.g. walked onto it instead of bouncing there), the
// hidden ambush hedgehog still pops out the moment he actually lands. Once
// L has been collected the ambush no longer makes sense — landing on the
// (now permanently revealed) log again should never surprise-pop it.
//
function maybeSpawnHedgehogAmbush(inst) {
  if (!inst.ambushHedgehog || inst.ambushHedgehog.popped || inst.zones.lCollected) return
  Hedgehog.popOut(inst.ambushHedgehog, null, null, 'left')
  markAmbushHedgehogRevealed()
}
//
// Primary ambush trigger: while still airborne and falling toward the
// L-log after a tramp bounce, the hidden hedgehog pops out an instant
// before the hero's feet actually reach the wood, so it reads as a sudden
// ambush rather than something that only appears after landing.
//
function maybeSpawnHedgehogAmbushPreLand(inst, heroX, footY, grounded) {
  if (grounded) return
  if (!inst.ambushHedgehog || inst.ambushHedgehog.popped) return
  if (!inst.trampToLApproach || inst.zones.lCollected) return
  const home = inst.lPlatHome
  if (!home || !inst.zones.lPlatRevealed) return
  const onLLog = heroX >= home.x - LOG_SNAP_X_SLACK && heroX <= home.x + LOG_W + LOG_SNAP_X_SLACK
  const aboutToLand = footY >= home.y - HEDGEHOG_AMBUSH_POP_LEAD_Y && footY <= home.y + LOG_SNAP_BELOW
  if (!onLLog || !aboutToLand) return
  Hedgehog.popOut(inst.ambushHedgehog, null, null, 'left')
  markAmbushHedgehogRevealed()
}
//
// If the L-log disappears (letter collected) while the ambush hedgehog is
// still standing on it and hasn't already been sent tumbling by a death,
// drop it to the ground instead of leaving it stranded over empty air.
//
function dropAmbushHedgehogIfStrandedOnLPlat(inst) {
  const hog = inst.ambushHedgehog
  if (!hog?.popped || hog.falling) return
  //
  // The log vanishes instantly the moment the letter is collected (see
  // collectLetterL), so there is no edge left to walk to any more — even
  // if the hedgehog was already mid-walk toward one (e.g. the abandon
  // timer in maybeAbandonStrandedAmbushHedgehog kicked in earlier while
  // the hero lingered nearby without landing). Cancel any in-progress
  // walk-to-edge and drop it straight down now, or it would otherwise
  // keep pacing across empty air above the spot the log used to occupy.
  //
  hog.walkingToEdge = false
  Hedgehog.fallAndCrawlAway(hog, FLOOR_Y - HEDGEHOG_AMBUSH_GROUND_RAISE)
}
//
// The ambush only makes sense while the hero might still land on the log —
// once L is collected the platform's own visibility handles it. If the hero
// never lands at all, the popped hedgehog would otherwise just pace back
// and forth on the log forever; this abandons the ambush and sends it
// crawling off the nearest edge after a while unused.
//
function maybeAbandonStrandedAmbushHedgehog(inst) {
  const hog = inst.ambushHedgehog
  if (!hog?.popped || hog.falling || hog.walkingToEdge || inst.zones.lCollected) {
    inst.ambushHedgehogIdleTimer = 0
    return
  }
  inst.ambushHedgehogIdleTimer += inst.k.dt()
  if (inst.ambushHedgehogIdleTimer < HEDGEHOG_AMBUSH_ABANDON_TIMEOUT) return
  Hedgehog.fallAndCrawlAway(hog, FLOOR_Y - HEDGEHOG_AMBUSH_GROUND_RAISE, computeAmbushHedgehogFallEdgeX(inst))
}
//
// Persists the L-log step so the HUD letter stays fully gold after leaving.
//
function markLPlatStepped(inst) {
  if (inst.zones.lPlatStepped || inst.zones.lCollected) return
  inst.zones.lPlatStepped = true
  set(KEY_L_PLAT_STEPPED, true)
  syncGlowHudLetterFills(inst)
}
//
// Draw the hero above log platforms while bouncing on a trampoline.
//
function syncHeroTrampDrawOrder(inst) {
  const ch = inst.heroInst?.character
  if (!ch) return
  const onBranchCap = isOnBranchTrampolineCap(inst, ch)
  const branchInFront = inst.branchTrampBounceAir || onBranchCap
  const rightInFront = inst.trampBounceAir
  const targetZ = branchInFront
    ? CFG.visual.zIndex.platforms + 2
    : rightInFront
      ? CFG.visual.zIndex.player + 2
      : CFG.visual.zIndex.player
  ch.z !== targetZ && (ch.z = targetZ)
}
//
// Brief camera pan to the L letter when it appears off-screen, then back.
//
function maybeStartCameraPeekAtLLetter(inst) {
  const letter = inst.lLetter
  if (!letter || letter.main.hidden || inst.cameraLetterPeek) return
  if (!isWorldPointOutsideCameraView(inst, letter.x)) return
  const ch = inst.heroInst?.character
  if (!ch?.pos) return
  inst.cameraLetterPeek = {
    returnX: ch.pos.x,
    targetX: letter.x,
    phase: 'toTarget',
    elapsed: 0
  }
}
//
// Animates a one-shot camera peek; returns true while the peek owns the camera.
//
function updateCameraLetterPeek(inst, ch) {
  const peek = inst.cameraLetterPeek
  if (!peek) return false
  const k = inst.k
  const cam = inst.camera
  const dt = k.dt()
  const zoom = cam?.zoom || 1
  const half = VIEW_W / (2 * zoom)
  const minX = LEFT_MARGIN + half
  const maxX = WORLD_W - RIGHT_MARGIN - half
  const clampCamX = x => Math.max(minX, Math.min(maxX, x))
  peek.elapsed += dt
  if (peek.phase === 'toTarget') {
    const t = Math.min(1, peek.elapsed / L_LETTER_PEEK_TRAVEL)
    const eased = 1 - (1 - t) * (1 - t)
    const fromX = clampCamX(peek.returnX)
    const toX = clampCamX(peek.targetX)
    k.camPos(Math.round(fromX + (toX - fromX) * eased), cam.fixedCamY)
    if (t >= 1) {
      peek.phase = 'hold'
      peek.elapsed = 0
    }
    return true
  }
  if (peek.phase === 'hold') {
    k.camPos(Math.round(clampCamX(peek.targetX)), cam.fixedCamY)
    if (peek.elapsed >= L_LETTER_PEEK_HOLD) {
      peek.phase = 'return'
      peek.elapsed = 0
    }
    return true
  }
  const t = Math.min(1, peek.elapsed / L_LETTER_PEEK_RETURN)
  const eased = 1 - (1 - t) * (1 - t)
  const fromX = clampCamX(peek.targetX)
  const toX = clampCamX(peek.returnX)
  k.camPos(Math.round(fromX + (toX - fromX) * eased), cam.fixedCamY)
  if (t >= 1) {
    inst.cameraLetterPeek = null
    GlowCamera.followHero(cam, ch.pos.x, ch.pos.y)
    return false
  }
  return true
}
//
// Pit mushroom hint after the hero stays in the open cave without using it.
//
function updatePitCaveMushroomHint(inst, char, dt) {
  const pit = inst.pit
  if (!pit?.collapsed || pit.pitCaveHintShown || !char?.pos) return
  const inCave = char.pos.y >= pit.floorY - 4 &&
    char.pos.x >= pit.zone.x1 + 8 &&
    char.pos.x <= pit.zone.x2 - 8
  pit.pitCaveIdleTime = inCave ? (pit.pitCaveIdleTime || 0) + dt : 0
  if (pit.pitCaveIdleTime < PIT_CAVE_HINT_IDLE) return
  pit.pitCaveHintShown = true
  const mushH = TRAMP_TOTAL_H
  pit.pitCaveHintTooltip && Tooltip.destroy(pit.pitCaveHintTooltip)
  pit.pitCaveHintTooltip = createGlowTooltip({
    k: inst.k,
    forceVisible: true,
    targets: [{
      x: () => pit.trampState.x,
      y: pit.floorY + pit.zone.depth - mushH / 2,
      width: TRAMP_TOTAL_W,
      height: mushH,
      text: PIT_CAVE_HINT_TEXT,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET
    }]
  })
  pit.pitCaveHintTooltip.activeTarget = pit.pitCaveHintTooltip.targets[0]
  pit.pitCaveHintTooltip.opacity = 1
  inst.k.wait(PIT_CAVE_HINT_DURATION, () => {
    pit.pitCaveHintTooltip && Tooltip.destroy(pit.pitCaveHintTooltip)
    pit.pitCaveHintTooltip = null
  })
}
//
// Nudge toward the O letter after the zone has been open a long time.
//
function updateOLetterStuckHint(inst, dt) {
  if (inst.oStuckHintShown || !inst.zones.oZone || inst.zones.oCollected || !inst.oLetter) return
  if (inst.oZoneRevealTime == null) return
  const elapsed = inst.k.time() - inst.oZoneRevealTime
  if (elapsed < O_LETTER_STUCK_HINT_DELAY) return
  inst.oStuckHintShown = true
  inst.oStuckHintTooltip && Tooltip.destroy(inst.oStuckHintTooltip)
  const char = inst.heroInst?.character
  if (!char?.pos) return
  inst.oStuckHintTooltip = createGlowTooltip({
    k: inst.k,
    forceVisible: true,
    targets: [{
      x: () => inst.heroInst?.character?.pos?.x ?? -1000,
      y: () => inst.heroInst?.character?.pos?.y ?? -1000,
      width: HERO_TOOLTIP_HOVER_SIZE,
      height: HERO_TOOLTIP_HOVER_SIZE,
      text: O_LETTER_STUCK_HINT_TEXT,
      offsetY: HERO_TOOLTIP_Y_OFFSET
    }]
  })
  inst.oStuckHintTooltip.activeTarget = inst.oStuckHintTooltip.targets[0]
  inst.oStuckHintTooltip.opacity = 1
  inst.k.wait(O_LETTER_STUCK_HINT_DURATION, () => dismissOLetterStuckHint(inst))
}
//
// Clears the long-idle O letter speech bubble.
//
function dismissOLetterStuckHint(inst) {
  inst.oStuckHintTooltip && Tooltip.destroy(inst.oStuckHintTooltip)
  inst.oStuckHintTooltip = null
}
//
// Playfield chrome inset so Glow tooltips pin to the game window, not the void.
//
function glowTooltipClampInset() {
  return {
    left: LEFT_MARGIN,
    right: RIGHT_MARGIN,
    top: PLAYFIELD_TOP_Y + TOP_MARGIN,
    bottom: SCREEN_H - PLAYFIELD_BOTTOM_Y
  }
}
//
// Glow tooltips clamp to the playfield so off-screen sources stay readable.
//
function createGlowTooltip(cfg) {
  return Tooltip.create({
    ...cfg,
    clampInset: cfg.clampInset ?? glowTooltipClampInset()
  })
}
//
// Land stops for the first two sings; the third walk docks in the lake.
//
function trampWalkStopX(inst, singCount) {
  if (singCount >= TRAMP_WALK_SINGS_TO_WATER) return inst.trampWalk.dockX
  const homeX = inst.trampState.homeX
  const landEndX = inst.lakeX2 + TRAMP_WALK_SHORE_PAD
  const landSpan = Math.max(1, homeX - landEndX)
  return homeX - (landSpan * singCount) / TRAMP_WALK_SINGS_TO_WATER
}
//
// Glow runs on its own native-resolution engine, so the real window size is
// only known once that engine is booted — refreshes SCREEN_W/SCREEN_H and the
// handful of values that legitimately track the live window (camera viewport
// width, vertical letterbox padding on a taller-than-design window, and the
// screen-space HUD/chrome Y's that ride on that padding) right at scene
// start, before any layout math runs. Every element's own world position
// (TREE_X and everything derived from it) stays pinned to the fixed design
// resolution instead — see the Layout comment near TOP_MARGIN/SCREEN_W above.
//
function recomputeGlowScreenLayout(k) {
  SCREEN_W = k.width()
  SCREEN_H = k.height()
  VIEW_W = SCREEN_W - LEFT_MARGIN - RIGHT_MARGIN
  VOID_PAD_Y = Math.max(0, Math.round((SCREEN_H - DESIGN_SCREEN_H) / 2))
  PLAYFIELD_TOP_Y = VOID_PAD_Y
  PLAYFIELD_BOTTOM_Y = VOID_PAD_Y + DESIGN_SCREEN_H - BOTTOM_MARGIN
  GLOW_HUD_FPS_TOP_Y = 55 + VOID_PAD_Y
  GLOW_HUD_LABEL_TOP_Y = GLOW_HUD_FPS_TOP_Y - GLOW_HUD_LABEL_FONT_SIZE / 2
  LETTER_OFFSCREEN_ARROW_Y = PLAYFIELD_TOP_Y + TOP_MARGIN + 120
  HEDGEHOG_DEATH_PROMPT_Y = PAR_LEAF_MAX_Y - HEDGEHOG_DEATH_PROMPT_LEAF_RISE + VOID_PAD_Y
  CAMERA_INTRO_ZOOM_START = VIEW_W / CAMERA_INTRO_HERO_WIDTH
}
