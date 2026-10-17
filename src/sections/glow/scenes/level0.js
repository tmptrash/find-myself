import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { initTouchInput } from '../../../utils/touch-input.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import { registerGlowNativeTeardown } from '../../../utils/engine-switch.js'
import { yieldForGpu, setLoaderBarPct, setLoaderBarCreepBoost } from '../../../utils/boot-loader.js'
import * as CanvasBackdrop from '../../../utils/canvas-backdrop.js'
import * as LevelIndicator from '../../touch/components/lesson-indicator.js'
import { buildRockVertices, drawRockToCanvas } from '../../../utils/draw-rock.js'
import { drawMushroomToCanvas } from '../../../utils/draw-mushroom.js'
import {
  drawCuteMushroomToCanvas,
  drawCuteMushroomPupilOverlay,
  CUTE_MUSHROOM_ASPECT,
  TRAMP_FACE_EYE_SCALE
} from '../utils/cute-mushroom.js'
import * as Predator from '../components/predator.js'
import { toCanvas, getRGB, createCanvasAtlasBuilder, bindBackToMenuKeys, bindStartGameKeys, releaseGamePhysicalKeys, isAnyKeyDown } from '../../../utils/helper.js'
import {
  buildGlowTree,
  renderGlowTreeToCanvas,
  renderGlowTreeIntoContext,
  TREE_SEED
} from '../utils/glow-tree.js'
import {
  GROUND_RIGHT_STRIP_COUNT,
  groundRightStripIndexForX,
  groundRightAppearOpacity
} from '../utils/glow-ground-reveal.js'
import {
  GLOW_PAL,
  glowCaveEarthDeepRgb,
  glowGroundEarthBottomLayerRgb,
  glowRgb,
  glowRockShadedDrawPalette,
  glowContourRgb,
  snapToPalette,
  getTreePaletteColorForCorner,
  getTreePaletteParallaxCorner,
  buildDimmedTreePalette,
  getGlowLightRgb
} from '../utils/glow-palette.js'
import {
  applyFoliageDensityToPalette,
  glowBushHiResClusterRadiusRangeForTier,
  glowBushLeafDensityScaleForTier,
  glowBushLeafSizeScaleForTier,
  glowFilmGrainBlockPxForTier,
  glowHiResBushClustersForTier,
  glowTreeBuildOptsForDensity
} from '../utils/glow-pixel-density.js'
import {
  applyGlowGameplaySharpBake,
  applyGlowHudSharpBake,
  glowDepthBlurRadiusPx
} from '../utils/glow-focus-depth.js'
import * as Grass from '../../../components/grass.js'
import * as HeroHint from '../../../utils/hero-hint.js'
import { bindPointerActivate } from '../../../utils/pointer-activate.js'
import * as Tooltip from '../../../utils/tooltip.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { drawLogPlatform } from '../../touch/utils/log-platform.js'
import {
  createGlowMidges,
  updateGlowMidges,
  syncGlowMidgesZones,
  createGlowPit,
  updateGlowPit,
  drawGlowPit,
  drawGlowPitCaveForegroundDecor,
  drawGlowPitCaveSeamCoverRocks,
  isCrackGrassExcluded,
  isCrackDecorExcluded,
  getCrackZone,
  getGlowPitHeroStandY,
  getGlowPitEarthBandMouthCutoutForPit,
  isGlowOpenPitMouthWorldX,
  getGlowPitFloorCollider,
  getGlowCaveMouthFloorLeftX,
  getGlowPitCaveTrampolineX
} from '../utils/glow-atmosphere.js'
import {
  initGlowTeacherHintState,
  showGlowTeacherHintNow,
  tickGlowTeacherContextHints,
  onGlowTeacherLifeHudRevealed,
  glowTeacherHudAnchor,
  GLOW_TEACHER_HINT_DURATION
} from '../utils/glow-teacher-hint.js'
import {
  buildGlowTreeFruitSpots,
  computeGlowAnchorFruitDropX,
  mountGlowTreeFruitLayer,
  releaseGlowAnchorFruit,
  tickGlowTreeFruits
} from '../utils/glow-tree-fruit.js'
import { applyGlowExperienceDelta, readGlowExperience } from '../utils/glow-experience.js'
import * as GlowFootParticles from '../utils/glow-foot-particles.js'
import * as ChainBuoy from '../utils/glow-chain-buoy.js'
import * as ChainEyeTramp from '../utils/glow-chain-eye-trampoline.js'
import * as EarTree from '../utils/glow-ear-tree.js'
import * as EyeFlower from '../components/eye-flower.js'
import * as ShoreTree from '../utils/glow-shore-tree.js'
import * as HorizFallTwig from '../utils/glow-horiz-fall-twig.js'
import * as SpikyTomato from '../components/spiky-tomato.js'
import * as ForestFloor from '../components/forest-floor.js'
import * as LightShaft from '../components/light-shaft.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import * as GlowCamera from '../utils/glow-camera.js'
import {
  applyParallaxPostFxToContext,
  applyGlowLayerGradeToCanvas,
  drawGlowHiResFoliageCluster,
  GLOW_LAYER_GRADE
} from '../utils/glow-parallax-grain.js'
import {
  measureCanvasContentBounds,
  cropCanvasToBounds,
  releaseCanvas
} from '../utils/glow-canvas-crop.js'
import {
  bakeGlowTooltipCanvas,
  glowUiHash
} from '../utils/glow-ui-bake.js'
//
// Palette-derived tones — every colour comes from CFG.visual.colors.palette.
//
const VOID = glowRgb('void')
const GLOW_SHADOW = glowRgb('glowShadow')
const OUTER = glowRgb('playfieldOuter')
//
// Warm orange grass — same half-brightness front-row foliage tone as menu.js
//
const GRASS_GREEN = glowRgb(GLOW_PAL.treeColor.leafShades[0])
//
// Yellow-brown foreground grass from L onward (same straw as the G peek band).
//
const GRASS_WARM = glowRgb(GLOW_PAL.gold)
//
// Shifts blades toward a deeper autumn tone on top of the per-blade straw tint.
//
const GLOW_GRASS_HUE_VARY_MAX = 1
const GLOW_GRASS_HUE_VARY_SKEW = 1
const WATER_COLOR = glowRgb('water')
const GLOW_GOLD_HEX = GLOW_PAL.gold
//
// Colour-world backdrop split: sky above the ground line, dark earth below.
//
const GROUND_DARK = glowRgb('groundDark')
//
// Wet mud patch fill under the mud zone's tall grass — a distinct
// darker/warmer tone than plain
// groundDark so the soft-mud band reads as its own surface, not just taller
// grass over the same ground everywhere else.
//
const MUD_GROUND_RGB = glowRgb('mudGround')
//
// Cool forest air — parallax trees fade into teal/green sky, not gold (70/20/10).
//
const PARALLAX_FOLIAGE_HAZE = glowRgb(GLOW_PAL.glowForestLift)
const GLOW_LIGHT_CORE = getGlowLightRgb('core')
//
// Forest contour ink for trees, mushrooms, rocks, letters (not pure black).
//
const DECOR_OUTLINE_RGB = glowContourRgb('forest')
//
// Cap colour families for the cute decor mushrooms (palette hex sets): the
// cap tone, its dark counterpart (shading) and a lighter highlight tone.
//
const MUSHROOM_CAP_HEX = GLOW_PAL.mushrooms
const MUSHROOM_CAP_SHADOW_HEX = GLOW_PAL.mushroomsDark
const MUSHROOM_CAP_LIGHT_HEX = GLOW_PAL.mushroomsLight
//
// Cute mushroom palette set (full colour).
//
const CUTE_MUSH_COLORS = GLOW_PAL.cuteMushroom
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
const GROUND_SURFACE_BASE_Y = 680
//
// Ground line sits lower in the playfield; the dark earth band below it
// fills the rest of the playfield down to the 50 px bottom margin.
//
const GROUND_LEVEL_OFFSET = 115
const PLAYFIELD_BOTTOM_WORLD_Y = TOP_MARGIN + VIEW_H
const FLOOR_Y = GROUND_SURFACE_BASE_Y + GROUND_LEVEL_OFFSET
//
// Dark earth band runs from the ground line to the playfield bottom (50 px
// void strip below — BOTTOM_MARGIN). Tree roots stay shorter and spread wide.
//
const PLAYFIELD_EARTH_BOTTOM_Y = PLAYFIELD_BOTTOM_WORLD_Y
const CAVE_BAND_H = PLAYFIELD_EARTH_BOTTOM_Y - FLOOR_Y
const TREE_ROOT_MAX_Y = PLAYFIELD_EARTH_BOTTOM_Y
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
let glowPlayfieldCornerObjs = null
//
// Original 1920-wide layout; right-side gameplay shifts by this amount into
// the extended 3000 px world (lake + main tree stay on the left).
//
const RIGHT_ZONE_SHIFT_X = WORLD_W - 1920
const CORNER_RADIUS = 20
const CORNER_SPRITE_OUTER = 'glow0-corner-mask-outer'
const PLAYFIELD_BOTTOM_CORNER_Z = CFG.visual.zIndex.ui + 2500
const PLATFORM_HIDE_Y = 9999
//
// Tree. Fixed to the design viewport's own centre (not the live window
// width) so every element positioned off it — branch, mud band, L/O/W
// platforms, mushrooms — lines up identically on any monitor.
//
const TREE_X = Math.round(DESIGN_SCREEN_W * 0.5)
//
// The trunk geometry extends a few px below the ground so its base cannot
// leave a gap above the floor line; rendering clips it at the roots' start
// (ground level), so the trunk is cut exactly by the ground.
//
const TREE_TRUNK_BOTTOM_Y = FLOOR_Y
//
// Roots and trunk clip share the visible ground line — the trunk ends flush
// with the floor and roots continue below without a sunken trunk gap.
//
const TREE_ROOT_START_Y = FLOOR_Y
const TREE_TOP_Y = 430
//
// Main tree trunk wood reads slightly narrower; hero branch width is tuned
// separately in glow-tree.js (HORIZ_W).
//
const MAIN_TREE_TRUNK_WIDTH_SCALE = 0.9
//
// Hero branch ~205 px above the floor — a plain jump tops out just over
// 150 px at the feet, so the branch is reachable only via the left mushroom.
//
const MAIN_TREE_HERO_BRANCH_FRAC = 0.5
//
// The tree is painted in world space onto a full 3000x1080 canvas, but the
// trunk and canopy only cover a slice of it. Cropping the bake to that slice
// (and drawing the sprite at the crop offset) keeps the same pixels on
// screen while shrinking the quad the GPU has to blend across the viewport.
//
const TREE_CROP_PAD = 2
//
// Crop offsets of the monolithic tree bake, keyed by the live Kaplay
// instance — a resolution-mode swap rebakes into a fresh sprite registry, so
// these must never survive into the next engine (see the native-resolution
// notes in .cursorrules).
//
const monolithicTreeOffsets = new WeakMap()
const TRUNK_EXCLUDE_HALF = 50
const TREE_FRUIT_VIEW_TOP_PAD = 16
//
// Mud band east of the branch trampoline — predator anchor layout.
//
const MUD_ZONE_BRANCH_TRIGGER_GAP = 170
const MUD_ZONE_PREDATOR_POP_LEAD = 70
const MUD_ZONE_PREDATOR_DANGER_MARGIN = 40
//
// Soft muddy ground band. Jump is lower than
// normal with a snappy takeoff (no low-gravity hang). Footsteps sound wet;
// foot bursts are off.
//
const MUD_BRANCH_TRAMP_GAP = 42
const MUD_ZONE_RIGHT_EXTENT = 170
const MUD_ZONE_CREATURE_MARGIN = 14
const MUD_MOVE_SPEED_MULT = 0.5
const MUD_JUMP_FORCE_MULT = 0.68
const MUD_GRAVITY_MULT = 1
const MUD_JUMP_SQUASH_TIME_MULT = 1
const GLOW_CHAIN_BUOY_Z = CFG.visual.zIndex.player - 1
const GLOW_EAR_TREE_Z = CFG.visual.zIndex.player - 1
//
// Hero must clear this far past the predator anchor X before the L HUD step credits.
//
const HERO_MUD_HAZARD_SPAWN_CLEARANCE = 20
//
// Respawn uses a wider gap than bootstrap spawn — hero body half-width matches hero.js COLLISION_WIDTH.
//
const GLOW_HERO_HITBOX_HALF_W = 15
const HERO_TOUCH_DEATH_RESPAWN_CLEARANCE = 32
const TOUCH_DEATH_RESPAWN_GRACE_SEC = 0.5
//
// Extra margin kept past the mushroom's bounce-trigger band (see
// isHeroAtTrampolineCap's TRAMP_RADIUS + TRAMP_ADJACENT_X) when nudging a
// ground spawn clear of a trampoline — landing on the cap launches the hero
// immediately on level load.
//
const HERO_TRAMPOLINE_SPAWN_CLEARANCE = 20
//
// Touching the predator or falling on the spikes is fatal — same
// disintegration flow as any other level's death, then in-level respawn.
//
const GLOW_TOUCH_DEATH_PARTICLE_COUNT = 34
//
// Contextual predator death lines (mud, tall grass, charge) plus a generic pool.
//
const PREDATOR_DEATH_HINT_MUD = 'The mud slowed me down.\nShe did not wait.'
const PREDATOR_DEATH_HINT_BUSHES = 'I can\'t see anything\nin these bushes.'
const PREDATOR_DEATH_HINT_FAST = 'This predator is\nso fast.'
const PREDATOR_DEATH_HINT_TEXTS = [
  'Too many legs.\nNot enough caution.',
  'The grass hid her.\nI walked right in.',
  'Sticky ground.\nOne slow step too many.',
  'You hear the tapping.\nThen she\'s on you.',
  'She wasn\'t a log.\nNow I know.'
]
//
// Low crawler — anchor the bubble just above the body, not hero-height.
//
const PREDATOR_DEATH_HINT_RAISE = 28
const PREDATOR_DEATH_HINT_OFFSET_Y = -36
const GLOW_TOUCH_DEATH_HINT_DURATION = 5
const HERO_TOUCH_DEATH_RESPAWN_SIDE_OFFSET = 80
const GLOW_TOUCH_DEATH_RESPAWN_DELAY = 2.48
//
// In-level respawn after a predator kill — past the tail plus a runway so the
// hero is not inside the body and has time to run before hunt speed closes
// the gap (see resolveGlowPredatorRespawnX).
//
const GLOW_PREDATOR_BODY_LENGTH_PX = 84
const HERO_PREDATOR_RESPAWN_RUNWAY_PX = 110
const HERO_PREDATOR_RESPAWN_MIN_FROM_HEAD =
  GLOW_PREDATOR_BODY_LENGTH_PX +
  HERO_TOUCH_DEATH_RESPAWN_SIDE_OFFSET +
  HERO_TOUCH_DEATH_RESPAWN_CLEARANCE +
  GLOW_HERO_HITBOX_HALF_W +
  HERO_PREDATOR_RESPAWN_RUNWAY_PX
//
// Rock rim — green-brown shadow tone (not neutral gray).
//
const ROCK_OUTLINE_RGB = DECOR_OUTLINE_RGB
const ROCK_OUTLINE_WIDTH = 1.4
//
// Parallax background — sky baked into the far row plus 2 forest planes (each
// scrolling at its own speed), then a static ground/underground strip at
// world speed 1.0. A depth row's bushes share their trees' canvas: same
// scroll speed, same horizontal bleed, and the bush strip sits entirely
// inside the tree row's world-Y crop, so one sprite covers both and the
// row costs a single draw call per frame instead of two.
//
const BG_PAR_TREE3_COLOR = 'glow0-bg-par-tree3-color'
const BG_PAR_TREE2_COLOR = 'glow0-bg-par-tree2-color'
const BG_PAR_TREE1_COLOR = 'glow0-bg-par-tree1-color'
const BG_STATIC_COLOR = 'glow0-bg-static-color-v8'
//
// Cropped parallax sprites only bake the world-Y band they actually paint —
// a depth row reaches from its own crown band down to the ground line rather
// than sharing a full 1080px-tall forest canvas. Underground earth (below
// FLOOR_Y) lives on BG_STATIC_*.
//
const PAR_LAYER_V_PAD = 12
const PAR_SKY_WORLD_Y = TOP_MARGIN
const PAR_SKY_WORLD_H = FLOOR_Y - TOP_MARGIN
const PAR_STATIC_WORLD_Y = FLOOR_Y
const PAR_STATIC_WORLD_H = CAVE_BAND_H
//
// Layer follow speeds — fraction of camera scroll (1.0 = locked to the world).
// One speed per depth row, shared by that row's trees and bushes (they sit on
// the same baked canvas).
//
const PAR_SKY_SPEED = 0.06
const PAR_TREE2_SPEED = 0.26
const PAR_TREE1_SPEED = 0.40
//
// Extra horizontal bleed baked into parallax canvases so trees extend past the
// playfield edges and never run out on the right when the camera scrolls.
// Kept as tight as the widest crown reaches past a trunk: the bleed is paid
// twice per layer in texture width.
//
const PAR_TREE_HORIZ_BLEED = 200
//
// Safety margin added to the viewport when culling a layer's on-screen slice.
// The slice is already positioned via the layer's parallax drawX, so this
// only has to absorb camera shake — never the bake bleed.
//
const PARALLAX_DRAW_CULL_PAD = 48
//
// Width of one baked parallax column (px). Each column remembers the
// vertical span of its non-transparent pixels, so empty sky above short
// crowns and gaps between trunks are never blitted.
//
const PAR_COLUMN_W = 128
//
// Fully opaque alpha — rows below a near-row column's solid run hide every
// farther layer, so those rows are trimmed from sky/far/mid draws.
//
const PAR_ALPHA_OPAQUE = 255
//
// Render scale of the offscreen backdrop (sky/far + mid rows) in
// the settled colour world. Those layers are depth-blurred at bake time, so
// half resolution quarters their fill cost without visible softening.
//
const PAR_OFFSCREEN_SCALE = 0.5
//
// Extra pixels below the near-row occluder so the cropped backdrop blit
// still covers the seam where the nearer trees become opaque.
//
const PAR_BACKDROP_CROP_PAD = 4
//
// Per live Kaplay instance: baked parallax sprite name → column bounds.
// Keyed by k so a native-resolution engine reboot re-measures fresh bakes.
//
const parallaxColumnBoundsByK = new WeakMap()
//
// Per live Kaplay instance: offscreen backdrop framebuffer (GPU resource
// tied to that engine's GL context).
//
const parallaxOffscreenByK = new WeakMap()
//
// Parallax depth blur radii live in glow-focus-depth.js (background → nearground).
// Static ground / gameplay sprites stay sharp at bake time.
//
const TREE_COLOR_SPRITE_NAME = 'glow0-tree-color-v5'
const TREE_COLOR_GRAIN_SEED = 6002
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
const SPAWN_MODE_CAVE = 'cave'
//
// Anti-tunnel band below the start branch — catches falls before lake-floor snap
//
const BRANCH_SNAP_BELOW = 88
const HERO_BRANCH_FRACTION = 0.20
//
// Respawn point at the lower-right ground — used after a death once the
// hero has discovered the lower-right part of the level himself.
//
const LOG_W = 110
const LOG_H = 28
//
// The wooden log collision box sits slightly lower than the sprite so the
// hero visually stands ON the wood instead of hovering above it.
//
const LOG_COLLISION_DROP_Y = 2
//
// Letter-log platforms: tree browns matching the main colour tree.
//
const LOG_TREE_COLOR_COLORS = {
  bark: GLOW_PAL.treeColor.root,
  barkLight: GLOW_PAL.treeColor.branch,
  barkDark: GLOW_PAL.treeColor.root,
  ring: GLOW_PAL.treeColor.trunk,
  ringDark: GLOW_PAL.glowContour.platform,
  core: GLOW_PAL.treeColor.branch,
  shadow: GLOW_PAL.void
}
//
// The L-log platform stands out from the plain W/O logs: a bare outline
// silhouette with no fill, only its cracks, rounded end cap and grain
// stripes painted in one single accent tone.
//
const RIGHT_PLAT_OFFSET_X = 100
//
// Background forest — three planes of big trees baked and drawn fully
// OPAQUE. Depth comes from colour: the far and mid rows sit on their own
// palette swatches (one step darker than the sky), the near colour-world
// row keeps green foliage with a light haze blend.
//
const PAR_L1_COLOR_BLEND = 0.22
const PAR_MID_COLOR_BLEND = 0.28
//
// Near-row foliage leans slightly toward the warm sky haze (leaf-only blend)
// while green stays the leading colour — kept low so parallax stays muted.
//
const PAR_L1_LEAF_WARM_BLEND = 0
//
// Reference corner tree families — left/right from playfield midline; top/bottom
// from canopy row (far + mid = upper pair, near = lower pair on screen).
//
const PAR_TREE_CORNER_KEYS = [
  'parallaxTreeCornerTL',
  'parallaxTreeCornerTR',
  'parallaxTreeCornerBL',
  'parallaxTreeCornerBR'
]
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
const PAR_BIG_SEED_STEP = 101
//
// Three overlapping canopy bands: each deeper row starts lower so the strips
// stack with shared height. A sky gap above the nearest band stays bare.
//
const PAR_CANOPY_SKY_GAP = 132
const PAR_LEAF_SKY_FLOOR_Y = TOP_MARGIN + PAR_CANOPY_SKY_GAP
const PAR_LEAF_BAND_H_NEAR = 148
const PAR_LEAF_BAND_H_MID = 132
const PAR_LEAF_TIER_OVERLAP = 24
const PAR_NEAR_BAND_TOP = PAR_LEAF_SKY_FLOOR_Y
const PAR_NEAR_BAND_BOTTOM = PAR_NEAR_BAND_TOP + PAR_LEAF_BAND_H_NEAR
const PAR_MID_BAND_TOP = PAR_NEAR_BAND_BOTTOM - PAR_LEAF_TIER_OVERLAP
const PAR_MID_BAND_BOTTOM = PAR_MID_BAND_TOP + PAR_LEAF_BAND_H_MID
const PAR_FAR_BAND_TOP = PAR_MID_BAND_BOTTOM - PAR_LEAF_TIER_OVERLAP
//
// Trunk apex sits above each row's canopy so branches sprout inside the
// band. The margin has to clear the crown clusters buildGlowTree grows from
// the trunk apex (three stubs 28-50px long, see glow-tree.js) — the old
// 42/35/28 margins were smaller than that reach, so at unlucky random rolls
// a tree's own crown (not just the safety clip) could already poke past its
// row's intended band, including the near row punching into the sky gap.
//
const PAR_BIG_TOP_MIN_Y = PAR_NEAR_BAND_TOP - 120
const PAR_BIG_TOP_RANGE = 28
const PAR_FAR_TOP_MIN_Y = PAR_MID_BAND_TOP - 70
const PAR_FAR_TOP_RANGE = 18
const PAR_BIG_WIDTH_SCALE_MIN = 0.96
const PAR_BIG_WIDTH_SCALE_RANGE = 0.06
//
// Pull parallax trunks toward the main tree; nearer rows hug the centre more.
//
const PAR_TREE_FOCUS_BIAS_NEAR = 0.46
const PAR_TREE_FOCUS_BIAS_MID = 0.32
const PAR_BIG_BAND_TOP = PAR_NEAR_BAND_TOP
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
const BUSH_RADIUS_MIN = 54
const BUSH_RADIUS_MAX = 72
const BUSH_STEP_MIN_FRAC = 0.45
const BUSH_STEP_RANGE_FRAC = 0.5
//
// Bush leaf texture: oval leaves scattered across each dome plus a ragged
// leafy rim along the arc. Shades vary only in brightness (darkened base
// tone), so the colour composition of every strip stays unchanged.
//
const BUSH_LEAF_SIZE_MIN = 9
const BUSH_LEAF_SIZE_RANGE = 8
const BUSH_LEAF_DENSITY = 0.009
const BUSH_RIM_LEAF_SPACING = 18
const BUSH_LEAF_DARKEN_STEPS = [0, 0.08]
const BUSH_HIRES_CLUSTER_DENSITY = 0.3
//
// Colour-world bush tones follow the same corner quadrant as the trees in that
// row (leaf swatch per mound centre X).
//
// Bush heights run OPPOSITE to the tree rows: the near (1st) strip is the
// lowest, each deeper strip is taller — three readable ground-level tiers.
//
const BUSH_NEAR_HEIGHT_SCALE = 0.78
const BUSH_FAR_HEIGHT_SCALE = 1.18
const BUSH_FARTHEST_HEIGHT_SCALE = 1.55
//
// Pinnate ferns tucked into the two nearest bush rows (reference detail);
// the per-row value is the average fern count per mound.
//
const BUSH_FERNS_NEAR = 1.8
const BUSH_FERNS_MID = 1.4
const BUSH_FERN_OFFSET = 0.75
const BUSH_FERN_SIZE_MIN = 1.05
const BUSH_FERN_SIZE_RANGE = 0.6
const BUSH_FERN_SEED_RANGE = 1e9
const BUSH_FERN_STEM = 0.66
const BUSH_FERN_DARK = 0.5
const BUSH_FERN_MID = 0.34
const BUSH_FERN_LIGHT = 0.14
const PAR_FARTHEST_BAND_TOP = PAR_FAR_BAND_TOP
//
// Headroom kept above each row's own band top when clipping its canopy
// ceiling (see clipParallaxCanopyCeiling). The PAR_*_TOP_MIN_Y margins
// (near/mid/far) now already keep each row's own tree crowns (28-50px
// clusters off the trunk apex, see buildGlowTree) naturally inside their
// band — a real hedgehog... er, tree, not a shape with its top sliced off —
// so this clip is a rare backstop for an unlucky outlier, not the everyday
// shaping mechanism. Sized to sit above where those margins already put the
// crowns so it essentially never engages in normal play.
//
const PAR_CANOPY_CEILING_HEADROOM = 100
//
// Amplitude of the layered-sine wobble on the canopy ceiling clip line.
//
const PAR_CLIP_PAD = 4000
//
// Clips away anything drawn above ceilingWorldY on this baked-layer canvas
// (world-space Y — the context is already translated so this lines up).
// Callers must ctx.save() before calling this and ctx.restore() once the
// tree/bush drawing is done, BEFORE bakeParallaxLayerPair's post-bake blur
// pass (applyParallaxPostFxToContext) runs on the whole canvas — the blur
// needs the clip lifted so it can spread pixels upward across the hard
// clip line, which is what turns it into the fuzzy top edge the parallax
// bands want instead of a razor-straight one.
//
function clipParallaxCanopyCeiling(ctx, bandTop) {
  const ceilingWorldY = bandTop - PAR_CANOPY_CEILING_HEADROOM
  ctx.beginPath()
  ctx.rect(-PAR_CLIP_PAD, ceilingWorldY, WORLD_W + PAR_CLIP_PAD * 2, PAR_CLIP_PAD + WORLD_H)
  ctx.clip()
}
//
// World-Y crop for one parallax tree row (crowns + trunks down to ground).
//
function parTreeRowWorldY(_bandTop) {
  return TOP_MARGIN - PAR_LAYER_V_PAD
}
//
// Height from the playfield top through the ground line (no underground).
//
function parTreeRowWorldH(_bandTop) {
  return FLOOR_Y - (TOP_MARGIN - PAR_LAYER_V_PAD) + PAR_LAYER_V_PAD
}
//
// The three runtime parallax layers, back to front. The far row bake also
// carries the sky gradient (one draw, one scroll speed). Built once at module
// load instead of per frame.
//
const PAR_LAYER_FAR = {
  color: BG_PAR_TREE3_COLOR,
  speed: PAR_SKY_SPEED,
  bleed: PAR_TREE_HORIZ_BLEED,
  worldY: PAR_SKY_WORLD_Y,
  worldH: PAR_SKY_WORLD_H
}
const PAR_LAYER_MID = {
  color: BG_PAR_TREE2_COLOR,
  speed: PAR_TREE2_SPEED,
  bleed: PAR_TREE_HORIZ_BLEED,
  worldY: parTreeRowWorldY(PAR_MID_BAND_TOP),
  worldH: parTreeRowWorldH(PAR_MID_BAND_TOP)
}
const PAR_LAYER_NEAR = {
  color: BG_PAR_TREE1_COLOR,
  speed: PAR_TREE1_SPEED,
  bleed: PAR_TREE_HORIZ_BLEED,
  worldY: parTreeRowWorldY(PAR_BIG_BAND_TOP),
  worldH: parTreeRowWorldH(PAR_BIG_BAND_TOP)
}
//
// Underground decor in the root zone: buried rocks, cracks, pebble clusters,
// hanging rootlets, fossil spirals and one buried skeleton (no burrows).
//
const UG_TOP_PAD = 30
const UG_BOTTOM_PAD = 2
const UG_ROCK_COUNT = 14
const UG_CRACK_COUNT = 18
const UG_PEBBLE_CLUSTER_COUNT = 22
const UG_ROOTLET_COUNT = 26
const UG_SHELL_COUNT = 9
const UG_BONE_COUNT = 9
const UG_COIN_COUNT = 6
const UG_BOTTLE_COUNT = 2
const UG_WORM_COUNT = 8
const UG_FOSSIL_COUNT = 4
//
// Colour-world extras from the reference: loose groups of dark slate stones
// in the deep clay (a dense group guaranteed at each end of the band, a few
// scattered singles between), sediment streaks, dark voids with a lit lip,
// warm pebbles in the topsoil and fine grit.
//
const UG_BOULDER_PILE_COUNT = 4
const UG_BOULDER_PILE_EDGE_INSET = 60
const UG_BOULDER_PILE_STONES_MIN = 4
const UG_BOULDER_PILE_STONES_RANGE = 4
const UG_BOULDER_EDGE_PILE_STONES_MIN = 8
const UG_BOULDER_EDGE_PILE_STONES_RANGE = 4
const UG_BOULDER_SCATTER_COUNT = 14
const UG_BOULDER_R_MIN = 5
const UG_BOULDER_R_RANGE = 13
const UG_BOULDER_PILE_SPREAD = 150
const UG_BOULDER_DEEP_FRAC = 0.72
const UG_BOULDER_MIN_GAP_MULT = 0.85
const UG_BOULDER_PLACE_ATTEMPTS = 12
const UG_BOULDER_OUTLINE_PX = 1.5
//
// Lumpy, rounded silhouette: random-radius lobes joined by quadratic curves.
//
const UG_BOULDER_LOBES_MIN = 7
const UG_BOULDER_LOBES_RANGE = 5
const UG_BOULDER_LOBE_R_MIN = 0.8
const UG_BOULDER_LOBE_R_RANGE = 0.28
const UG_BOULDER_SQUASH_MIN = 0.78
const UG_BOULDER_SQUASH_RANGE = 0.2
//
// Mottled face: a soft lit cap toward the top-left plus a few light speckles.
//
const UG_BOULDER_CAP_OFFSET = 0.22
const UG_BOULDER_CAP_SCALE = 0.68
const UG_BOULDER_CAP_ALPHA = 0.35
const UG_BOULDER_SPECKLES_MIN = 2
const UG_BOULDER_SPECKLES_RANGE = 4
const UG_BOULDER_SPECKLE_R_MIN = 0.7
const UG_BOULDER_SPECKLE_R_RANGE = 1.1
const UG_BOULDER_SPECKLE_ALPHA = 0.55
const UG_STREAK_COUNT = 80
const UG_STREAK_LEN_MIN = 30
const UG_STREAK_LEN_RANGE = 110
const UG_STREAK_PX = 1.5
const UG_STREAK_ALPHA = 0.4
const UG_POCKET_COUNT = 30
const UG_POCKET_R_MIN = 2.5
const UG_POCKET_R_RANGE = 5
const UG_POCKET_LIP_ALPHA = 0.55
const UG_POCKET_VOID_ALPHA = 0.7
const UG_WARM_PEBBLE_COUNT = 160
const UG_WARM_PEBBLE_R_MIN = 1.2
const UG_WARM_PEBBLE_R_RANGE = 1.6
const UG_WARM_PEBBLE_TOP_FRAC = 0.45
const UG_GRIT_COUNT = 900
const UG_GRIT_PX_MIN = 1
const UG_GRIT_PX_RANGE = 2
const UG_GRIT_ALPHA = 0.55
const UG_BONE_KNOB_R = 2.3
const UG_BONE_KNOB_SPLIT = 1.7
const UG_BONE_SHAFT_PX = 2.4
//
// Guaranteed extra detail inside the mud zone specifically — the normal
// counts above are spread across the whole world width, so that one narrow
// band would otherwise get little to nothing by pure chance (see
// drawMudGroundZone, which previews this same sprite there right after G).
//
const UG_MUD_ZONE_EXTRA_ROCK_COUNT = 5
const UG_MUD_ZONE_EXTRA_ROOTLET_COUNT = 6
const UG_MUD_ZONE_EXTRA_SHELL_COUNT = 2
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
// Scatter rocks across the lower-right part of the playfield, grouped into
// a few clusters rather than spread uniformly (same idea as the left
// 6-rock cluster near the tree).
//
const RIGHT_ROCK_COUNT = 16
const RIGHT_ROCK_CLUSTER_COUNT = 6
const RIGHT_ROCK_CLUSTER_SPREAD_MIN = 28
const RIGHT_ROCK_CLUSTER_SPREAD_RANGE = 36
const MUD_EAST_ROCK_INSET = 6
const MUD_EAST_ROCK_COUNT = 34
//
// Glow HUD row — the (empty) section label's top Y is derived from the FPS
// row's vertical CENTER (GLOW_HUD_FPS_TOP_Y) so the small hero / life icons
// fall into place from that Y via LevelIndicator's own sectionLabelY-relative
// offsets.
//
const GLOW_HUD_LABEL_FONT_SIZE = 48
//
// Same canvas metrics as lesson-indicator's bakeHudLetterCanvas
// (fontSize * 1.2 + pad * 2 tall), which the icon offsets assume.
//
const GLOW_HUD_LABEL_CANVAS_PAD = 4
const GLOW_HUD_LABEL_BAKED_HALF_H =
  (GLOW_HUD_LABEL_FONT_SIZE * 1.2 + GLOW_HUD_LABEL_CANVAS_PAD * 2) / 2
//
// HUD row lives inside the top void strip (above the playfield). FPS/label
// share one vertical centre so FPS, small hero and life sit on one line.
// Screen-space, so both get VOID_PAD_Y added in recomputeGlowScreenLayout to
// stay inside the (possibly pushed-down) top void strip on a tall window.
//
let GLOW_HUD_FPS_TOP_Y = 55
let GLOW_HUD_LABEL_TOP_Y = GLOW_HUD_FPS_TOP_Y - GLOW_HUD_LABEL_BAKED_HALF_H
//
// Neutral HUD grey for HUD text — palette gray5.
//
const HUD_SCORE_COLOR_SETTLED = glowRgb('hudScore')
//
// Skip lake fill when the camera is well off the water span.
//
const LAKE_SURFACE_CULL_MARGIN = 48
//
// Off-screen slack for world decor culling (ear-trees, chain-buoys).
//
const GLOW_DECOR_CULL_MARGIN = 64
//
// Hero body / outline tones for lesson-glow.0 — lighter than the shared
// heroOutline (menu.js still uses that one directly for its own hero).
//
const HERO_OUTLINE_COLOR = GLOW_PAL.glowContour.gameplay
const HERO_BODY_COLOR = GLOW_PAL.heroBodyGray
//
// Glow hero: white body, dark rim, two open eyes from the first frame.
//
const HERO_FILLED_BODY_COLOR = String(CFG.visual.colors.hero.eyeWhite).replace('#', '')
const HERO_FILLED_OUTLINE_COLOR = CFG.visual.colors.outline
const HERO_EYE_BAKE_COLORS = {
  eyeWhiteColor: CFG.visual.colors.hero.eyeWhite,
  pupilColor: CFG.visual.colors.hero.eyePupil,
  transparentEyeInterior: false
}
//
// Zone persistence keys (glow.* prefix).
//
const KEY_REVEALED_WATER = 'glow.revealedWater'
//
// Prize stalk-eye east of the right mushroom: tall enough that a plain jump
// never reaches the cap, close enough for a mushroom bounce with air control.
//
const GLOW_PRIZE_EYE_OFFSET_X = 150
const GLOW_PRIZE_EYE_SEGMENTS = 11
const GLOW_PRIZE_EYE_SEGMENT_LEN = 26
const GLOW_PRIZE_EYE_SEGMENT_WIDTH = 4.1
const GLOW_PRIZE_EYE_SWAY_AMP = 0.06
const GLOW_PRIZE_EYE_SWAY_SPEED = 0.9
const GLOW_PRIZE_EYE_SWAY_LAG = 0.55
const GLOW_PRIZE_EYE_SEED = 2.17
const GLOW_PRIZE_EYE_SCLERA_RADIUS = 6.2
const GLOW_PRIZE_EYE_PUPIL_RADIUS = 2.4
const GLOW_SHORE_TREE_BUOY_CLEAR_X = 78
//
// Two leftmost stalk-eyes form a bounce chain onto the shore-tree branch.
// The first (west) eye sits higher; the second sits lower, one jump east.
//
const GLOW_CHAIN_TRAMP_EYE_STEP_X = 148
const GLOW_CHAIN_TRAMP_MUSH_STEP_X = 168
const GLOW_CHAIN_TRAMP_PAIR_SHIFT_LEFT = 72
const GLOW_CHAIN_TRAMP_SEGMENT_LEN = 26
const GLOW_CHAIN_TRAMP_SECOND_SEGMENTS = 6
const GLOW_CHAIN_TRAMP_FIRST_SEGMENTS = 11
const GLOW_CHAIN_TRAMP_WEST_MARGIN = 240
const GLOW_CHAIN_TRAMP_SWAY_AMP = 0.11
const GLOW_CHAIN_TRAMP_SWAY_SPEED = 1.1
const GLOW_CHAIN_TRAMP_SWAY_LAG = 0.55
const SHORE_BRANCH_PLAT_HIDE_X = -500
const SHORE_BRANCH_PLAT_HIDE_Y = -5000
//
// Extra offset for the L log + right spikes — landing arc from the walking
// trampoline reads cleaner slightly higher and east of the chain-eye layout.
//
const KEY_REVEALED_GROUND_DECOR = 'glow.revealedGroundDecor'
const KEY_REVEALED_GROUND_DECOR_RIGHT = 'glow.revealedGroundDecorRight'
const KEY_REVEALED_GROUND_DECOR_LEFT = 'glow.revealedGroundDecorLeft'
const KEY_GROUND_RIGHT_STRIP_MAX = 'glow.groundRightStripMax'
const KEY_LEFT_SHORE_ROCK = 'glow.leftShoreRock'
const KEY_LIFE_SHOWN = 'glow.lifeShown'
const KEY_DROWN_HINT_SHOWN = 'glow.drownHintShown'
const KEY_INTRO_SHOWN = 'glow.introShown'
const KEY_CAMERA_INTRO_DONE = 'glow.cameraIntroDone'
const KEY_RESPAWN_NEAR_TREE = 'glow.respawnNearTree'
const KEY_LAST_SPAWN_MODE = 'glow.lastSpawnMode'
const KEY_LAST_SPAWN_X = 'glow.lastSpawnX'
const KEY_LAST_SPAWN_Y = 'glow.lastSpawnY'
const BRANCH_TRAMP_MARIO_HINT_TEXT = 'I\'m not an ordinary\nmushroom'
const HERO_DEATH_RESPAWN_PAST_BRANCH_TRAMP_X = 88
const PIT_CAVE_HINT_TEXT = 'Something hums\nunder the cave floor.'
//
// Feet may rise above the mouth lip while jumping inside the collapsed pit.
//
const PIT_CAVE_AIR_ABOVE_LIP = 148
//
// Main playfield in front of the mouth — hero stays on the normal sprite here.
//
const PIT_CAVE_APPROACH_GROUND_FEET = 20
const DROWN_RESPAWN_LAKE_CLEARANCE = 56
//
// Ambient birds loop for the whole level.
//
const GLOW_BIRDS_AUDIO_SRC = './sounds/birds.mp3'
const GLOW_BIRDS_PLAYBACK_RATE = 1
//
// Birds low-pass cutoff — high enough to keep the full, bright mix.
//
const GLOW_BIRDS_COLOR_LOWPASS_HZ = 14000
let glowBirdsLoopHandle = null
//
// Speech-bubble hints: two intro lines at spawn, one-shot lines
// when the right ground / water zones first open, and a consolation line on
// the first drowning.
//
const HINT_INTRO_2_TEXT = '\'awd, ←, →, ↑, space & mouse\'\nto move, jump & interact\nwith the world.'
const HINT_INTRO_2_DURATION = 18
const INTRO_HINT_PHASE_TWO = 'two'
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
// Branch trampoline hover bubble sits above the cap.
//
const TRAMP_TOOLTIP_Y_OFFSET = -90
//
// HUD life-icon (the "teacher") hover tooltip — same as touch lesson 0.
//
const LIFE_TOOLTIP_TEXT = 'Your experience (exp)'
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50
const LIFE_SCORE_TOOLTIP_SIZE = 44
const LIFE_SCORE_TOOLTIP_Y_OFFSET = 50
const LIFE_SCORE_TOOLTIP_CENTER_Y_OFFSET = -6
const LIFE_SCORE_TOOLTIP_CENTER_Y_LIFT_FRAC = 0.5
//
// Drowning — land on the lake floor, then sink under the fill with the hint.
//
const WATER_SURFACE_Y = FLOOR_Y - 8
//
// How far the fleeing head stops from the left playfield edge before it turns.
// The stick swings to the other side of the head, so the hero needs this much
// room or he slides under the side frame and off the stick.
//
const PREDATOR_FLEE_LEFT_EDGE_PAD = 170
const PREDATOR_GROUND_CLEARANCE = 0
const PREDATOR_STICK_EXTRA_LIFT = 4
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
//
// Colour-world forest floor: hill and cream mushrooms behind the hero (under
// the decor mushrooms at z 7), ferns and plumes in front of him under grass.
//
const GLOW_FOREST_FLOOR_BACK_Z = 6.5
const GLOW_FOREST_FLOOR_FRONT_Z = GRASS_Z - 1
const GLOW_FOREST_FLOOR_STALK_EYE_CLEAR_HALF = 22
const GLOW_FOREST_FLOOR_SHORE_TRUNK_CLEAR_HALF = 30
//
// Sunlight rays from one sun high above the upper-left corner (colour world
// only). Each ray is a wedge from that point with its own angular width, so
// ray edges spread apart with distance and the rays fan from a single source.
// They reach the ground line and screen-lighten everything they cross, so the
// z sits above the topmost world decor (ear-tree branches / spiky tomatoes at
// GRASS_Z + 3.5) but far below HUD and speech bubbles.
//
const GLOW_LIGHT_SHAFT_Z = GRASS_Z + 5
const GLOW_LIGHT_SUN_OFFSET_X = -300
const GLOW_LIGHT_SUN_LIFT = 900
const GLOW_LIGHT_RAYS = [
  { angle: 0.45, spread: 0.11, opacity: 0.42 },
  { angle: 0.61, spread: 0.045, opacity: 0.3 },
  { angle: 0.79, spread: 0.08, opacity: 0.36 }
]
const GLOW_EAR_TREE_ROOTS_Z = GRASS_Z + 1
const GLOW_EAR_TREE_TRUNK_OVERLAY_Z = GRASS_Z + 2
const GLOW_EAR_TREE_BRANCHES_Z = GRASS_Z + 3
const GLOW_SPIKY_TOMATO_Z = GLOW_EAR_TREE_BRANCHES_Z + 0.5
const TOMATO_BURST_HERO_SAFE_RADIUS = 100
const TOMATO_BURST_HERO_SAFE_SEC = 3.2
const GLOW_EAR_TREE_COUNT = 2
const GRASS_TUFT_COUNT = 22
//
// Blades in the mud zone grow this much bigger/taller than everywhere
// else — the predator hides there and should be hard to spot
// through the grass rather than standing out clearly.
//
const MUD_ZONE_GRASS_SCALE_MULT = 2
//
// Taller blades on the walk from the branch trampoline up to the mud lip.
//
const MUD_APPROACH_GRASS_SCALE_MULT = 1.62
//
// Mud grass stays darker than the plain field grass.
//
const MUD_ZONE_GRASS_GREEN_VOID_LERP = 0.42
//
// Extra tuft count layered on top of the main field just inside the mud
// zone — see createGlowMudExtraGrass.
//
const MUD_ZONE_EXTRA_GRASS_TUFT_COUNT = 15
//
// DEBUG — true hides grass from the branch trampoline up through the mud
// band (easy restore: set back to false).
//
const GLOW_DEBUG_HIDE_GRASS_BEFORE_MUD = false
//
// Surface clutter the predator crawls over — drawn under tall grass.
//
const MUD_BLOB_STEPS = 24
const MUD_ROCK_SINK = 6
//
// Right-ground discovery fades into the unknown instead of cutting on a strip.
//
const GROUND_REVEAL_FADE_WIDTH = 220
const GROUND_REVEAL_LOOKAHEAD = 80
const GROUND_DETAIL_LOOKAHEAD = 28
//
// Underground earth band: topsoil, subsoil and deep clay (fractions of
// CAVE_BAND_H for the first two; the last fills the rest). The deep clay is
// darkened by GROUND_LAYER_DEEP_SHADE_ALPHA of the glow shadow swatch.
//
const GROUND_LAYER_FRACS = [0.36, 0.3]
const GROUND_LAYER_DEEP_SHADE_ALPHA = 0.3
//
// High-frequency jagged seams between soil layers (sample-and-hold noise, like
// a dense irregular time series — not smooth sine waves).
//
const GROUND_LAYER_JAG_CELL_PX = glowFilmGrainBlockPxForTier('gameplay')
const GROUND_LAYER_SAMPLE_PX = 1
const GROUND_LAYER_INTERIOR_BOUNDARY_AMP = 10
//
// Large rolling hills along every interior seam (reference cross-section) —
// separate seed per boundary so strata do not share the same silhouette.
// Wavelength ratios are non-integer and the lattice is domain-warped, so the
// crests never settle into a regular, sine-like rhythm.
//
const GROUND_LAYER_MACRO_OCTAVES = [
  { wavelength: 347, amp: 24 },
  { wavelength: 151, amp: 15 },
  { wavelength: 63, amp: 8 }
]
const GROUND_LAYER_MACRO_WARP_WAVELENGTH = 229
const GROUND_LAYER_MACRO_WARP_AMP = 120
//
// Slow envelope over the macro sway: calm stretches alternate with wild ones.
//
const GROUND_LAYER_MACRO_ENVELOPE_WAVELENGTH = 610
const GROUND_LAYER_MACRO_ENVELOPE_MIN = 0.45
//
// Topsoil hangs into subsoil as soft rounded tongues (not needle teeth).
//
const GROUND_LAYER_FRINGE_INDEX = 1
const GROUND_LAYER_FRINGE_LOBE_OCTAVES = [
  { wavelength: 27, amp: 6 },
  { wavelength: 13, amp: 2.5 }
]
const GROUND_LAYER_FRINGE_JAG_AMP = 2.5
//
// Pull each soil swatch toward the layer average so strata read softer.
//
const GROUND_LAYER_CONTRAST_PULL = 0.52
//
// Sky bake uses stacked palette bands instead of a smooth CSS gradient.
//
const SKY_DITHER_BAND_COUNT = 7
//
// Lower sky fraction that picks up dawn gold (between the trunks, not zenith).
//
const SKY_DAWN_BOTTOM_FRAC = 0.28
const SKY_DAWN_GLOW_STRENGTH = 0.34
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
const MUSHROOM_CAP_WIDTH_MIN = 16
const MUSHROOM_CAP_WIDTH_MAX = 32
const MUSHROOM_STEM_HEIGHT_MIN = 12
const MUSHROOM_STEM_HEIGHT_MAX = 24
const MUSHROOM_CAP_W_MIN = MUSHROOM_CAP_WIDTH_MIN
const MUSHROOM_CAP_W_MAX = MUSHROOM_CAP_WIDTH_MAX
const MUSHROOM_EXTRA_LOWER = 2
//
// Mushroom trampoline — right of the L platform. A cute chubby mushroom with
// a blushy face; the eyes blink by swapping pre-baked open/closed variants.
//
const TRAMP_SIZE_SCALE = 0.7
const TRAMP_CAP_W = Math.round(56 * TRAMP_SIZE_SCALE)
const TRAMP_W = Math.round(70 * TRAMP_SIZE_SCALE)
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
const TRAMP_COOLDOWN = 0.4
const TRAMP_RADIUS = Math.round(38 * TRAMP_SIZE_SCALE)
//
// Collider matches the painted cap. Extra side slack used to hold the hero
// in the air beside the mushroom and then drop him through the floor.
//
const TRAMP_CAP_HALF = TRAMP_RADIUS
//
// Hero centre X span where his hitbox still rests on the cap pad — the pad is
// TRAMP_CAP_HALF wide each side, the body overhangs it by its own half-width.
// Bounce / on-cap checks use this so an edge landing launches too.
//
const TRAMP_CAP_STAND_HALF = TRAMP_CAP_HALF + GLOW_HERO_HITBOX_HALF_W
//
// Spawn clearance still steps back from the old wider band.
//
const TRAMP_ADJACENT_X = 22
//
// Invisible solid pad under the cap — top flush with capTopY, no wider than the art.
//
const TRAMP_PAD_W = TRAMP_CAP_HALF * 2
const TRAMP_PAD_H = Math.round(10 * TRAMP_SIZE_SCALE)
//
// Feet below this offset from capTop keep the pad hidden (walk through stem)
//
const TRAMP_PAD_FEET_BELOW = Math.round(20 * TRAMP_SIZE_SCALE)
//
// Horizontal reach for pad placement and fall-through guards
//
const TRAMP_NEAR_X = TRAMP_RADIUS + 80
//
// Anti-tunnel band below the cap when jumping onto the mushroom
//
const TRAMP_SNAP_BELOW = 48
const TRAMP_SQUASH_MAX = 0.35
const TRAMP_SPRITE = 'glow0-trampoline-v4'
const TRAMP_OFFSET_FROM_L_PLAT = 50
//
// Static branch trampoline — right of the main tree (jump onto the start branch).
//
const BRANCH_TRAMP_OFFSET_X = 145
const BRANCH_TRAMP_BOOST_MULT = 1.68
const BRANCH_TRAMP_CHEEKY_EVERY = 6
//
// After the opening zoom-out finishes, wait this long before the first hint.
//
const CAMERA_INTRO_HINT_DELAY = 1
//
// Branch landing only: glance left, then face right (not used on first ground spawn).
//
const BRANCH_LOOK_LEFT_DURATION = 2
const GLOW_CAMERA_SHAKE_AMP = 5
const GLOW_CAMERA_SHAKE_DURATION = 0.22
const GLOW_BRANCH_JUMP_SHAKE_AMP = 4.5
const GLOW_BRANCH_JUMP_SHAKE_DURATION = 0.2
const GLOW_BRANCH_LANDINGS_TO_BREAK = 3
//
// Every second landing on the big tree's branch shakes one fruit loose.
//
const GLOW_START_BRANCH_LANDINGS_TO_DROP_FRUIT = 2
const PREDATOR_LAKE_EDGE_PAD = 28
const PREDATOR_CAVE_MOUTH_PAD = 24
//
// Predator only tracks the hero when feet sit on the same ground band (branch / cave / air are other planes).
//
const GLOW_PREDATOR_HERO_VERTICAL_BAND_PX = 46
//
// Keeps the invisible cap alive briefly after a shaky on-cap read (prevents yank to hide Y).
//
const TRAMP_CAP_PAD_LATCH_SEC = 0.28
const TRAMP_CHEEKY_EVERY = 5
const TRAMP_CHEEKY_DURATION = 3
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
const TRAMP_OUTLINE_SPRITE = TRAMP_SPRITE + DECOR_OUTLINE_SUFFIX
//
// Sink the trampoline sprite 2 px into the ground so it does not float.
//
const TRAMP_SINK_Y = Math.round(2 * TRAMP_SIZE_SCALE) + 2
//
// Lake. The right edge is trimmed a little so the water ends just before
// the shore rock instead of poking past it.
//
const WATER_RIGHT_TRIM = 10
//
// Bake extends past the gameplay shore line so water tapers under the cap
// rocks instead of ending in a vertical sprite edge.
//
const LAKE_SHORE_EXTEND_PX = 64
const LAKE_Z = 12
const LAKE_SEGMENTS = 16
const LAKE_WAVE_FREQ = 0.85
const LAKE_WAVE_AMP = 3
const LAKE_WAVE_PHASE_SCALE = 4
const LAKE_WAVE_SECOND_AMP = 1.2
const LAKE_WAVE_SECOND_FREQ = 1.6
//
// Baked lake surface frames (white mask + grain) — tinted at draw time.
//
const LAKE_BAKE_GEOMETRY_VERSION = 2
const LAKE_BAKE_SPRITE_PREFIX = `glow0-lake-bake-v${LAKE_BAKE_GEOMETRY_VERSION}-`
const LAKE_BAKE_FRAME_COUNT = 24
const LAKE_BAKE_CYCLE = (Math.PI * 2) / LAKE_WAVE_FREQ
//
// Drowning: default hero sprite hidden; clipped draw shows only above the wave.
//
const DROWN_HERO_DRAW_Z = CFG.visual.zIndex.playerShadow
const GLOW_DROWN_HERO_CLIP_Z = LAKE_Z + 1
const PAR_TRUNK_WIDTH_SCALE_NEAR = 0.68
const PAR_TRUNK_WIDTH_SCALE_MID = 0.76
//
// Blocks every bootstrap yield frame until zone visibility and camera are ready.
//
const GLOW_BOOTSTRAP_CURTAIN_Z = CFG.visual.zIndex.ui + 50
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
// Baked lake bed is shifted down so the full drown sink stays inside the
// water mask without spawning any runtime fill under the lake.
//
const LAKE_BED_BAKE_PAD = Math.max(
  0,
  DROWN_FULL_SINK_FEET_Y - WATER_SURFACE_Y - WATER_DEPTH_LEFT - WATER_BED_CHAOS_AMP_A - WATER_BED_CHAOS_AMP_B - 6
)
//
// Decor mushrooms lean with the heroine's idle whistle (same pulse as touch L1)
//
const GLOW_MUSHROOM_WHISTLE_AMP_DEG = 14
const GLOW_MUSHROOM_WHISTLE_SMOOTH = 7
//
// Hero foot offset — matches COLLISION_HEIGHT/2 + COLLISION_OFFSET_Y in hero.js.
//
const SURFACE_DETECT_Y = 38
//
// Hero pos is above his feet by SURFACE_DETECT_Y; the plant aims at mid-body.
//
const GLOW_EYE_FLOWER_HERO_CENTER_DY = 12
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
const MAIN_GROUND_SINK_RESCUE_MAX = 64 // deeper sinks are real falls (crack, water)
//
// Feet at or below this Y are on the main floor lane — never snap onto the
// cap or keep the invisible pad active while strolling past the stem.
//
const TRAMP_MAIN_LANE_FEET_MIN = FLOOR_Y - LOG_SNAP_STANDING_MAX - 6
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
// Wood logs sit 2 px above the collision top so the hero is not buried in the plank.
//
const WOOD_LOG_SNAP_EMBED = LOG_SNAP_EMBED - 2
//
// After snapping onto a log, lock out a second jump/land crouch briefly
//
const POST_LAND_AIR_LOCK_GLOW = 0.28
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
let glowLevel0BootstrapReporter = null
let glowLevel0BootstrapSlice = { start: 38, end: 100 }
let glowLevel0BootstrapPromise = null
let glowLevel0SceneSession = 0
let glowLevel0LiveHeroChar = null
const glowLevel0SceneRegisteredFor = new WeakSet()
//
// Maps scene-bootstrap local 0–100 progress onto the DOM loader bar slice
// reserved for initGlowLevel0Scene (prewarm uses 5–38 %).
//
export function setGlowLevel0BootstrapReporter(reporter, slice = { start: 38, end: 100 }) {
  glowLevel0BootstrapReporter = reporter
  glowLevel0BootstrapSlice = slice
  glowLevel0BootstrapLocalMax = 0
  setLoaderBarCreepBoost(true)
}
export function clearGlowLevel0BootstrapReporter() {
  glowLevel0BootstrapReporter = null
  setLoaderBarCreepBoost(false)
}
export function waitForGlowLevel0Bootstrap() {
  return glowLevel0BootstrapPromise || Promise.resolve()
}
let glowLevel0BootstrapLocalMax = 0
function reportGlowLevel0Bootstrap(localPct) {
  if (!glowLevel0BootstrapReporter) return
  const clamped = Math.min(100, Math.max(0, localPct))
  if (clamped <= glowLevel0BootstrapLocalMax) return
  glowLevel0BootstrapLocalMax = clamped
  const start = glowLevel0BootstrapSlice.start
  const end = glowLevel0BootstrapSlice.end
  const t = glowLevel0BootstrapLocalMax / 100
  glowLevel0BootstrapReporter(start + (end - start) * t)
}
function glowInitStale(session) {
  return session !== glowLevel0SceneSession
}
async function glowBootstrapPause(bootstrap, localPct, session) {
  if (glowInitStale(session)) return true
  bootstrap?.report?.(localPct)
  bootstrap?.yieldStep && await bootstrap.yieldStep()
  bootstrap?.yieldStep && await bootstrap.yieldStep()
  return glowInitStale(session)
}
function beginGlowLevel0Scene(k) {
  const session = ++glowLevel0SceneSession
  glowLevel0BootstrapPromise = runGlowLevel0SceneInit(k, session)
}
async function runGlowLevel0SceneInit(k, session) {
  glowLevel0BootstrapLocalMax = 0
  const bootstrap = glowLevel0BootstrapReporter ? {
    report: reportGlowLevel0Bootstrap,
    yieldStep: () => yieldForGpu(1)
  } : null
  try {
    await initGlowLevel0Scene(k, bootstrap, session)
    if (!glowInitStale(session)) {
      bootstrap && reportGlowLevel0Bootstrap(100)
      setLoaderBarPct(100)
    }
  } finally {
    !glowInitStale(session) && (glowLevel0BootstrapPromise = null)
    !glowInitStale(session) && clearGlowLevel0BootstrapReporter()
  }
}
/**
 * Registers the GLOW section level 0 scene.
 * @param {Object} k - Kaplay instance
 */
export function sceneGlowLevel0(k) {
  if (glowLevel0SceneRegisteredFor.has(k)) return
  glowLevel0SceneRegisteredFor.add(k)
  k.scene('lesson-glow.0', () => {
    beginGlowLevel0Scene(k)
  })
}
/**
 * Bakes tree + parallax sprites during the menu→Glow transition (single DOM loader).
 * @param {Object} k - Kaplay instance
 * @param {Function} [onProgress] - 0–100 bake progress
 */
export async function prewarmGlowLevel0HeavyAssets(k, onProgress) {
  recomputeGlowScreenLayout(k)
  onProgress?.(5)
  await yieldForGpu(1)
  const treeData = buildGlowTree(TREE_SEED, TREE_X, TREE_TRUNK_BOTTOM_Y, TREE_TOP_Y, TREE_ROOT_MAX_Y, TREE_ROOT_START_Y, {
    ...glowTreeBuildOptsForDensity('nearground'),
    heroBranchFrac: MAIN_TREE_HERO_BRANCH_FRAC
  })
  scaleGlowTreeTrunkWidths(treeData, MAIN_TREE_TRUNK_WIDTH_SCALE)
  onProgress?.(12)
  await yieldForGpu(1)
  bakeMonolithicGlowTreeSprites(k, treeData)
  onProgress?.(42)
  await yieldForGpu(1)
  onProgress?.(55)
  //
  // Every onProgress() above is followed by a yield before the next heavy
  // synchronous bake — without it, the DOM never gets a chance to actually
  // paint the updated percentage before the main thread blocks again, so
  // the bar visually sits frozen at the previous number for the whole bake
  // instead of advancing smoothly.
  //
  await yieldForGpu(1)
  if (!glowParallaxSpritesPrewarmed(k)) {
    await buildParallaxSprites(k, glowUndergroundSpec(k), async (done, total) => {
      onProgress?.(55 + Math.round(23 * done / total))
      await yieldForGpu(1)
    })
  }
  onProgress?.(78)
  await yieldForGpu(1)
  //
  // Hero frames bake here so the spawn never hitches the main thread.
  //
  Hero.loadHeroSprites({
    k,
    type: Hero.HEROES.HERO,
    ...HERO_EYE_BAKE_COLORS,
    bodyColor: HERO_FILLED_BODY_COLOR,
    outlineColor: HERO_FILLED_OUTLINE_COLOR,
    outlineOnly: false,
    postBakeCanvas: applyGlowGameplaySharpBake
  })
  onProgress?.(90)
  await yieldForGpu(1)
  onProgress?.(100)
}
//
// Builds lesson-glow.0 — tree segments, parallax, decor and gameplay hooks.
//
async function initGlowLevel0Scene(k, bootstrap, session) {
    if (glowInitStale(session)) return
    if (await glowBootstrapPause(bootstrap, 2, session)) return
    recomputeGlowScreenLayout(k)
    const bootstrapCurtain = createGlowBootstrapCurtain(k)
    set('lastLesson', 'lesson-glow.0')
    set('lastSection', 'glow')
    CanvasBackdrop.applyCanvasBackdrop(k, OUTER_BG_HEX)
    k.onSceneLeave(() => CanvasBackdrop.clearCanvasBackdrop(k))
    k.setGravity(CFG.game.gravity)
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    sound._k = k
    const birdsMusic = createGlowBirdsLoopAudio()
    bindGlowBirdsLoopAudio(birdsMusic)
    const stopGlowLoopAudio = () => {
      leaveGlowBirdsLoopAudio()
      Sound.setEarTreeWhisperVolume(0)
      Sound.stopRainSound(sound)
      Sound.stopTrampWaterStepsLoop(sound)
      Sound.stopWaterStepsLoop(sound)
    }
    const zones = loadGlowZones()
    if (await glowBootstrapPause(bootstrap, 6, session)) return
    //
    // Draw callbacks on decor/tramps read zones._sceneRef before inst exists
    // (async bootstrap yields to the engine between setup steps).
    //
    zones._sceneRef = { zones }
    const treeData = buildGlowTree(TREE_SEED, TREE_X, TREE_TRUNK_BOTTOM_Y, TREE_TOP_Y, TREE_ROOT_MAX_Y, TREE_ROOT_START_Y, {
    ...glowTreeBuildOptsForDensity('nearground'),
    heroBranchFrac: MAIN_TREE_HERO_BRANCH_FRAC
  })
    scaleGlowTreeTrunkWidths(treeData, MAIN_TREE_TRUNK_WIDTH_SCALE)
    const treeFruitAnchorCfg = {
      trunkX: TREE_X,
      trunkHalf: TRUNK_EXCLUDE_HALF,
      branchTrampX: TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X,
      trampClearHalf: TRAMP_GRASS_CLEAR_HALF,
      minHangY: glowTreeFruitMinHangY()
    }
    !glowTreeSpritesPrewarmed(k) && bakeMonolithicGlowTreeSprites(k, treeData)
    //
    // One build per scene run — it paints the whole crown into a canvas and
    // reads it back, so it never runs from a per-frame path.
    //
    const treeFruitSpots = buildGlowTreeFruitSpots(treeData, treeFruitAnchorCfg)
    if (await glowBootstrapPause(bootstrap, 14, session)) return
    //
    // The underground decor spec is baked into the combined static earth band.
    //
    if (!glowParallaxSpritesPrewarmed(k)) {
      await buildParallaxSprites(k, glowUndergroundSpec(k), async (done, total) => {
        const pct = 15 + Math.round(6 * (done - 1) / Math.max(1, total - 1))
        if (await glowBootstrapPause(bootstrap, pct, session)) return
      })
      if (glowInitStale(session)) return
    }
    if (await glowBootstrapPause(bootstrap, 20, session)) return
    if (await glowBootstrapPause(bootstrap, 24, session)) return
    //
    // Main tree: one full colour sprite, cropped to its artwork and drawn at
    // the crop offset that puts it back on its world position.
    //
    const treeBake = monolithicTreeBakeOffset(k)
    const treeObj = k.add([
      k.sprite(TREE_COLOR_SPRITE_NAME),
      k.pos(treeBake.x, treeBake.y),
      k.z(CFG.visual.zIndex.platforms - 2)
    ])
    const floorBounds = createLevelBounds(k)
    if (await glowBootstrapPause(bootstrap, 27, session)) return
    const floorPlat = floorBounds.floor
    createRoundedCorners(k)
    const { horizBranch } = treeData
    //
    // Platform top aligns with physY — the visible branch walk surface
    //
    const branchPlatBundle = createGlowHorizBranchPlatforms(k, horizBranch, 'startBranch', BRANCH_PLAT_COLLISION_DROP_Y)
    const branchPlat = branchPlatBundle.plats[0]
    const branchPlatHome = branchPlatBundle.homes[0]
    const branchPlatY = branchPlatHome.y
    const branchTrampX = TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X
    const rightZoneBaseXEarly = TREE_X + RIGHT_PLAT_OFFSET_X + RIGHT_ZONE_SHIFT_X
    const trampXEarly = rightZoneBaseXEarly + LOG_W + TRAMP_OFFSET_FROM_L_PLAT
    const earTreeSpots = buildGlowEarTreeSpots({ branchTrampX, trampX: trampXEarly })
    const mudPredatorAmbushTriggerX = null
    const mudPredatorPopX = null
    const mudZoneX1 = null
    const mudZoneX2 = null
    const eastGroundRockMinX = branchTrampX + TRAMP_GRASS_CLEAR_HALF + MUD_BRANCH_TRAMP_GAP
    const PREDATOR_GROUND_PAD = 36
    const rightZoneBaseX = rightZoneBaseXEarly
    //
    // Right mushroom trampoline's X — computed early (same reason as
    // rightZoneBaseX above) so the spawn-clearance check right after can see
    // it; createMushroomTrampoline() reuses this same value further below.
    //
    const trampX = trampXEarly
    const treeGroundSpawnX = branchTrampX + HERO_DEATH_RESPAWN_PAST_BRANCH_TRAMP_X
    const respawnNearTree = get(KEY_RESPAWN_NEAR_TREE, false)
    respawnNearTree && set(KEY_RESPAWN_NEAR_TREE, false)
    const branchSpawnX = horizBranch.x1 + Math.round((horizBranch.x2 - horizBranch.x1) * HERO_BRANCH_FRACTION)
    const lastSpawnMode = get(KEY_LAST_SPAWN_MODE, null)
    const lastSpawnX = get(KEY_LAST_SPAWN_X, null)
    const lastSpawnY = get(KEY_LAST_SPAWN_Y, null)
    const clampBranchSpawnX = (x) => Math.max(
      horizBranch.x1 + LOG_SNAP_X_SLACK,
      Math.min(horizBranch.x2 - LOG_SNAP_X_SLACK, x)
    )
    //
    // First visit: ground under the start branch (same X as the old branch
    // spawn). Later: right of the branch trampoline after drowning or once
    // lower-right ground is open. Menu exit restores the last saved pose.
    //
    let spawnOnBranch = false
    let heroSpawnX = branchSpawnX
    let heroSpawnY = branchPlatY - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    const hasSavedPose = lastSpawnX != null && lastSpawnY != null && lastSpawnMode
    if (respawnNearTree) {
      heroSpawnX = treeGroundSpawnX
      heroSpawnY = FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    } else if (hasSavedPose) {
      if (lastSpawnMode === SPAWN_MODE_CAVE) {
        heroSpawnX = lastSpawnX
        heroSpawnY = lastSpawnY
        spawnOnBranch = false
      } else if (lastSpawnMode === SPAWN_MODE_BRANCH) {
        //
        // Y comes from the live branch — a saved height outlives any change to it.
        //
        heroSpawnX = clampBranchSpawnX(lastSpawnX)
        spawnOnBranch = true
      } else {
        heroSpawnX = lastSpawnX
        heroSpawnY = lastSpawnY
        spawnOnBranch = false
      }
    } else if (zones.groundDecorRight) {
      heroSpawnX = treeGroundSpawnX
      heroSpawnY = FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    } else {
      heroSpawnX = branchSpawnX
      heroSpawnY = FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
      spawnOnBranch = false
    }
    //
    // A saved/derived ground spawn landing right on a mushroom's bounce cap
    // (branch tramp near the tree, or the far right tramp) would launch the
    // hero into the air the instant the level loads — pull it clear to
    // whichever side is closer before the mud-hazard check below.
    //
    lastSpawnMode !== SPAWN_MODE_CAVE &&
      (heroSpawnX = nudgeGlowHeroSpawnAwayFromTrampolines({
        spawnX: heroSpawnX,
        spawnOnBranch,
        branchTrampX,
        trampX,
        branchTrampVisible: isBranchTrampolineVisible(zones),
        trampVisible: isRightTrampolineVisible(zones)
      }))
    //
    // A saved ground spawn inside the mud ambush band would overlap the
    // predator the instant the level loads — pull it west of the trigger.
    //
    lastSpawnMode !== SPAWN_MODE_CAVE &&
      (heroSpawnX = nudgeGlowHeroSpawnAwayFromMudHazards({
        spawnX: heroSpawnX,
        spawnY: heroSpawnY,
        spawnOnBranch,
        mudPredatorAmbushTriggerX,
        mudPredatorPopX,
        mudZoneX1,
        mudZoneX2
      }))
    //
    // Glow SFX and birds.mp3 from the first frame (see syncGlowWorldBirdsVolume).
    //
    sound._glowSfxMuted = false
    sound.glowSfxGain && (sound.glowSfxGain.gain.value = 1)
    Sound.stopRainSound(sound)
    k.onSceneLeave(() => {
      Sound.stopRainSound(sound)
      Sound.stopAmbient(sound)
      k.camScale(1)
    })
    if (glowInitStale(session)) return
    destroyStrayGlowHeroBody(k)
    const glowHeroCreateCfg = {
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      bodyColor: HERO_FILLED_BODY_COLOR,
      outlineColor: HERO_FILLED_OUTLINE_COLOR,
      ...HERO_EYE_BAKE_COLORS,
      outlineOnly: false,
      footFx: false,
      stepSoundScene: 'lesson-glow.0',
      suppressFootprints: true,
      airAnimDuringFlicker: true,
      runDuringFlicker: true,
      suppressDust: true,
      postBakeCanvas: applyGlowGameplaySharpBake,
      //
      // No idle humming until the level's late-game beats — keeps the early
      // world quiet while the hero learns to see.
      //
      idleVocalization: null,
      idleNotePostBake: applyGlowGameplaySharpBake
    }
    const heroInst = Hero.create({
      k,
      x: heroSpawnX,
      y: heroSpawnY,
      ...glowHeroCreateCfg
    })
    //
    // No footprint trail in the glow level — the ground stays clean.
    //
    //
    // Glow level: no particle assembly on spawn (first visit or reload).
    //
    Hero.spawn(heroInst, { instant: true })
    glowLevel0LiveHeroChar = heroInst.character
    snapGlowCameraToHero(k, heroInst)
    if (await glowBootstrapPause(bootstrap, 29, session)) return
    if (await glowBootstrapPause(bootstrap, 30, session)) return
    if (await glowBootstrapPause(bootstrap, 36, session)) return
    //
    // footFx stays off (no dust) but run-step sounds still route through glow
    // ground/wood/mud detection via sound._glowSurface.
    //
    bindGlowHeroFootSounds(heroInst, sound)
    spawnOnBranch && (heroInst.direction = -1)
    spawnOnBranch && heroInst.character && (heroInst.character.flipX = true)
    branchPlatBundle.plats.forEach(plat => tagWoodPlatform(plat, sound, heroInst))
    tagGroundPlatform(floorPlat, sound, heroInst)
    floorBounds.postCaveFloor && tagGroundPlatform(floorBounds.postCaveFloor, sound, heroInst)
    const clusterCenterX = horizBranch.x1 + 40
    const waterX2 = clusterCenterX + CLUSTER_ROCK_RADIUS_MAX + 10 - WATER_RIGHT_TRIM
    const trampBundle = createMushroomTrampoline(k, trampX, FLOOR_Y, zones, {
      drawZ: CFG.visual.zIndex.player + 1,
      colors: GLOW_PAL.cuteMushroomRed,
      spriteKey: 'right'
    })
    const branchTrampBundle = createMushroomTrampoline(k, branchTrampX, FLOOR_Y, zones, {
      gateBranchTramp: true,
      drawZ: CFG.visual.zIndex.platforms + 2
    })
    if (await glowBootstrapPause(bootstrap, 44, session)) return
    const lakeX1 = LEFT_MARGIN
    const lakeX2 = waterX2
    //
    // Computed here (before grass) so the grass field can exclude the same
    // spots the ear-trees will actually plant at - see EAR_TREE_TRUNK_GRASS_CLEAR_HALF.
    //
    const grassLayer = createGlowGrass(k, lakeX1, waterX2, trampX, branchTrampX, zones, null, null, earTreeSpots)
    const mudExtraGrass = null
    //
    // Rocks and mushrooms bake one or two canvases per instance (dozens of
    // decor pieces total). Registering them all into one shared atlas (built
    // right after both are placed) means every decor sprite on screen shares
    // a single texture bind instead of each piece forcing its own
    // bindTexture/useProgram GPU state change.
    //
    const decorAtlas = createCanvasAtlasBuilder()
    const rockObjs = createGlowRocks(k, horizBranch.x1, lakeX2, rightZoneBaseX, trampX, branchTrampX, zones, decorAtlas, eastGroundRockMinX)
    const mudWalkClutter = { rocks: [], surfaces: [], log: null, branches: [] }
    const mushObjs = createGlowMushrooms(k, lakeX1, waterX2, trampX, branchTrampX, zones, decorAtlas)
    decorAtlas.build(k)
    if (await glowBootstrapPause(bootstrap, 54, session)) return
    const predatorPatrolBounds = computeGlowPredatorPatrolBounds(lakeX2)
    const predator = Predator.create({
      k,
      x: trampX,
      homeX: trampX,
      dir: -1,
      minX: predatorPatrolBounds.minX,
      maxX: predatorPatrolBounds.maxX,
      groundAt: () => FLOOR_Y - PREDATOR_GROUND_CLEARANCE,
      hero: heroInst,
      zones,
      sfx: sound,
      water: { x1: lakeX1, x2: lakeX2, surfaceY: WATER_SURFACE_Y },
      fleeLeftX: LEFT_MARGIN + PREDATOR_FLEE_LEFT_EDGE_PAD
    })
    if (!spawnOnBranch && zones.predatorAwake) {
      const footY = heroSpawnY + SURFACE_DETECT_Y
      Predator.overlapsHeroHitbox(predator, heroSpawnX, footY) &&
        heroInst.character?.pos &&
        (heroInst.character.pos.x = resolveGlowPredatorRespawnX(
          { mudZoneX1, mudZoneX2 },
          heroSpawnX,
          heroSpawnY,
          predator
        ))
    }
    if (await glowBootstrapPause(bootstrap, 62, session)) return
    const waterLayer = createWater(k, lakeX1, waterX2, zones)
    createLakeShoreRockLayer(k, zones)
    if (await glowBootstrapPause(bootstrap, 72, session)) return
    if (await glowBootstrapPause(bootstrap, 74, session)) return
    initTouchInput(k)
    TouchControls.create(k)
    const goldRgb = getRGB(k, GLOW_GOLD_HEX)
    const levelIndicator = createGlowLevelIndicator(k)
    LevelIndicator.bindEyeHudLookAtHero(levelIndicator, heroInst)
    pinGlowHudFixed(levelIndicator)
    LevelIndicator.revealLifeHud(levelIndicator, false)
    levelIndicator.updateLifeScore?.(readGlowExperience())
    syncGlowLifeScoreVisibility(levelIndicator)
    set(KEY_LIFE_SHOWN, true)
    if (await glowBootstrapPause(bootstrap, 76, session)) return
    if (await glowBootstrapPause(bootstrap, 78, session)) return
    if (await glowBootstrapPause(bootstrap, 80, session)) return
    if (await glowBootstrapPause(bootstrap, 82, session)) return
    trampBundle.state.homeX = trampX
    trampBundle.state.x = trampX
    trampBundle.state.hasLegs = false
    trampBundle.state.walkDir = 0
    trampBundle.state._prevX = trampX
    //
    // Thin solid pad under the right mushroom cap (bounce collider).
    //
    const trampPad = k.add([
      k.rect(TRAMP_PAD_W, TRAMP_PAD_H),
      k.pos(-500, PLATFORM_HIDE_Y),
      k.anchor('center'),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ])
    const branchTrampPad = k.add([
      k.rect(TRAMP_PAD_W, TRAMP_PAD_H),
      k.pos(-500, PLATFORM_HIDE_Y),
      k.anchor('center'),
      k.area(),
      k.body({ isStatic: true }),
      k.opacity(0),
      CFG.game.platformName
    ])
    if (await glowBootstrapPause(bootstrap, 84, session)) return
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
    if (await glowBootstrapPause(bootstrap, 86, session)) return
    const inst = {
      k,
      camera,
      cameraIntroPlaying: false,
      pendingGlowIntro: false,
      introHintDelayRemaining: 0,
      sound,
      birdsMusic,
      heroInst,
      zones,
      treeObj,
      treeData,
      treeStripEndX: WORLD_W - RIGHT_MARGIN - 20,
      wallObjs: floorBounds.walls,
      grassLayer,
      mudExtraGrass,
      rockObjs,
      mudWalkSurfaces: mudWalkClutter.surfaces,
      mudWalkClutter,
      mushObjs,
      predator,
      mudPredatorAmbushTriggerX,
      mudPredatorPopX,
      mudZoneX1,
      mudZoneX2,
      touchDeathHandled: false,
      touchDeathCount: 0,
      predatorDeathCount: 0,
      touchDeathGraceUntil: 0,
      touchDeathRespawnWait: null,
      glowHeroCreateCfg,
      heroSpawnNudge: {
        branchTrampX,
        trampX,
        mudPredatorAmbushTriggerX,
        mudPredatorPopX,
        mudZoneX1,
        mudZoneX2
      },
      waterLayer,
      pitDrawLayer: null,
      pitCaveHeroForeground: false,
      leftDecorFade: zones.groundDecorLeft ? 1 : 0,
      trampBundle,
      branchTrampBundle,
      trampPad,
      branchTrampPad,
      branchTrampBounceAir: false,
      branchTrampWalk: {
        bounceCount: 0,
        cheekyTimer: 0,
        cheekyLineIdx: 0,
        cheekyTooltip: null
      },
      trampBounceAir: false,
      rightTrampCheeky: { bounceCount: 0, cheekyTimer: 0, cheekyLineIdx: 0, cheekyTooltip: null },
      trampState: trampBundle.state,
      branchTrampState: branchTrampBundle.state,
      lakeX1,
      lakeX2,
      waterX2,
      lastHeroX: heroSpawnX,
      heroSpawnX,
      logHoverFrames: 0,
      wasGrounded: false,
      wasGroundedOnBranch: false,
      expectBranchWoodLandSound: false,
      wasHeroRunning: false,
      drowning: false,
      drownTimer: 0,
      glowDrownHeroClipLock: false,
      deathHandled: false,
      wasOnStartBranch: false,
      drownFromStartBranch: false,
      levelIndicator,
      goldRgb,
      //
      // Tracks whether the playable hero has left outline-only mode.
      //
      fpsCounter: null,
      //
      // Speech-bubble hints controller (shared white cloud from utils).
      //
      heroHint: HeroHint.create({ k, heroInst, clampInset: glowTooltipClampInset() }),
      //
      // Controls stay locked while the intro hints play. introStep tracks
      // which intro hint is on screen for the key-press advance.
      //
      introLock: false,
      introStep: 0,
      introHintPhase: null,
      introHintPause: 0,
      startBranch: branchPlatBundle.startBranch,
      branchPlat,
      branchPlatHome,
      branchPlatSegs: branchPlatBundle,
      midges: createGlowMidges(k, FLOOR_Y, WORLD_W, { treeX: TREE_X, mudZoneX1, mudZoneX2 }),
      pit: null,
      woodSurfaces: [
        { x1: horizBranch.x1, x2: horizBranch.x2, y: branchPlatY, h: HORIZ_PLATFORM_H }
      ],
      spawnedOnBranch: spawnOnBranch,
      branchLookPhase: spawnOnBranch ? 'left' : null,
      branchLookTimer: spawnOnBranch ? BRANCH_LOOK_LEFT_DURATION : 0,
      pendingReplayIntro2: false,
      treeFruitSpots,
      treeFruitAnchorCfg,
      branchTrampX,
      _branchLandingsSinceTree: 0
    }
    predator.levelInst = inst
    predator.landAt = (x) => glowPredatorGroundAt(inst, x)
    predator.canHuntHero = () => glowPredatorCanHuntHero(inst)
    mountGlowTreeFruitLayer(k, inst)
    inst.lakeSurfaceAt = (x) => lakeSurfaceWorldYAt(inst, x)
    inst.treeX = TREE_X
    inst.trunkExcludeHalf = TRUNK_EXCLUDE_HALF
    inst.floorY = FLOOR_Y
    inst.eyeFlower = EyeFlower.create({
      k,
      x: EyeFlower.islandWorldX(lakeX1),
      waterY: WATER_SURFACE_Y,
      reachTriggerX: TREE_X,
      getHeroPos: () => glowEyeFlowerHeroPos(inst),
      isVisible: () => isGlowEyeFlowerVisible(inst)
    })
    tagGroundPlatform(inst.eyeFlower.collider, sound, heroInst)
    createGlowHorizFallTwigLayer(k, inst)
    initGlowTeacherHintState(inst)
    if (await glowBootstrapPause(bootstrap, 87, session)) return
    zones._lakeX1 = lakeX1
    zones._lakeX2 = lakeX2
    zones._groundStripEndX = WORLD_W - RIGHT_MARGIN - 20
    if (await glowBootstrapPause(bootstrap, 89, session)) return
    applyZoneVisibility(inst)
    revealWaterZone(inst, false)
    syncGlowFpsHudVisibility(inst)
    maybeStartGlowCameraIntro(inst)
    updateGlowCamera(inst)
    updatePlayfieldBorderColors(inst)
    inst.zones._sceneRef = inst
    const wasInCaveSpawn = lastSpawnMode === SPAWN_MODE_CAVE
    if (await glowBootstrapPause(bootstrap, 91, session)) return
    inst.pit = createGlowPit({
      k,
      floorY: FLOOR_Y,
      screenW: WORLD_W,
      heroInst,
      sound,
      levelIndicator,
      heroBodyColor: HERO_BODY_COLOR,
      groundColor: GROUND_DARK,
      tooltipClampInset: glowTooltipClampInset()
    })
    inst.pit.sceneRef = inst
    k._glowSceneInst = inst
    applyGlowCaveSpawnResume(inst, heroSpawnX, heroSpawnY, wasInCaveSpawn)
    setupGlowPitCaveTrampoline(inst)
    inst.footParticles = GlowFootParticles.create({ k })
    const chainBuoyWoodBands = buildGlowChainBuoyWoodBands({
      horizBranch: treeData.horizBranch
    })
    const chainBuoySpots = buildGlowChainBuoySpots(
      inst.lakeX1,
      inst.lakeX2,
      chainBuoyWoodBands,
      earTreeSpots,
      trampX,
      branchTrampX
    )
    inst.chainBuoys = ChainBuoy.create({
      k,
      spots: chainBuoySpots,
      woodPlatformBands: chainBuoyWoodBands,
      platformXMargin: GLOW_CHAIN_BUOY_PLATFORM_X_MARGIN
    })
    const shoreTreeLayout = ShoreTree.buildGlowShoreTreeLayout(chainBuoySpots, FLOOR_Y)
    inst.shoreTree = shoreTreeLayout ? ShoreTree.create({ k, layout: shoreTreeLayout }) : null
    const shoreBranch = inst.shoreTree?.treeData?.horizBranch
    if (shoreBranch) {
      const shorePlatBundle = createGlowHorizBranchPlatforms(
        k, shoreBranch, 'shoreBranch', BRANCH_PLAT_COLLISION_DROP_Y, SHORE_BRANCH_PLAT_HIDE_X, SHORE_BRANCH_PLAT_HIDE_Y
      )
      inst.shoreBranchPlat = shorePlatBundle.plats[0]
      inst.shoreBranchPlatSegs = shorePlatBundle
      inst.shoreBranchPlatHome = {
        x: shoreBranch.x1,
        y: shorePlatBundle.homes[0].y,
        x2: shoreBranch.x2,
        homes: shorePlatBundle.homes
      }
      inst.shoreFallTwigs = HorizFallTwig.create({
        k,
        branchX1: shoreBranch.x1,
        branchX2: shoreBranch.x2,
        branchY: shorePlatBundle.homes[0].y
      })
      inst.shoreFallTwigs.onCycleReset = () => {
        inst._shoreBranchLandingCount = 0
      }
      inst._shoreBranchTunnelArmed = true
    }
    const chainEyePads = ChainEyeTramp.createPads(k)
    inst.chainEyeTramp = {
      ...chainEyePads,
      ...ChainEyeTramp.createChainEyeTrampStates()
    }
    inst.chainEyeBounceAir = null
    inst.earTrees = EarTree.create({ k, spots: earTreeSpots })
    inst.spikyTomatoes = SpikyTomato.create({
      k,
      earTrees: inst.earTrees,
      particles: inst.footParticles,
      sfx: sound,
      groundY: FLOOR_Y,
      onExplode: (x, y) => onGlowTomatoExplode(inst, x, y)
    })
    createGlowChainBuoyLayer(k, zones)
    createGlowEarTreeLayer(k, inst)
    createGlowShoreTreeLayer(k, inst)
    const forestFloorBlockers = buildGlowForestFloorBlockers(trampX, branchTrampX, chainBuoySpots, shoreTreeLayout, earTreeSpots)
    const caveLeftX = getGlowCaveMouthFloorLeftX(getCrackZone(WORLD_W, FLOOR_Y))
    inst.forestFloor = ForestFloor.create({
      k,
      floorY: FLOOR_Y,
      xMin: TREE_X + TRUNK_EXCLUDE_HALF,
      xMax: WORLD_W - RIGHT_MARGIN,
      hillX2: WORLD_W,
      rimSpans: [{ x1: inst.lakeX2, x2: caveLeftX }],
      isSpotFree: (x, halfW) => isGlowForestFloorSpotFree(inst, forestFloorBlockers, x, halfW),
      getOpacity: () => 1,
      backZ: GLOW_FOREST_FLOOR_BACK_Z,
      frontZ: GLOW_FOREST_FLOOR_FRONT_Z
    })
    inst.lightShafts = LightShaft.create({
      k,
      sun: { x: LEFT_MARGIN + GLOW_LIGHT_SUN_OFFSET_X, y: TOP_MARGIN - GLOW_LIGHT_SUN_LIFT },
      rays: GLOW_LIGHT_RAYS,
      topY: TOP_MARGIN,
      groundY: FLOOR_Y,
      getOpacity: () => 1,
      z: GLOW_LIGHT_SHAFT_Z
    })
    if (await glowBootstrapPause(bootstrap, 93, session)) return
    syncGlowAtmosphereZones(inst)
    inst.midges.worldLife = 1
    //
    // First visit: hold hints until the camera intro zoom-out finishes and a
    // short beat passes so the player sees the full level first.
    //
    const deferGlowIntro = !zones.predatorAwake && !get(KEY_INTRO_SHOWN, false)
    inst.pendingGlowIntro = deferGlowIntro
    inst.pendingReplayIntro2 = spawnOnBranch && !zones.predatorAwake &&
      get(KEY_INTRO_SHOWN, false)
    inst.introHintDelayRemaining = 0
    !deferGlowIntro && !inst.pendingReplayIntro2 &&
      startGlowIntro(inst)
    createSmallHeroTooltip(inst)
    applyZoneVisibility(inst)
    Hero.suppressIdleVocalization()
    ensureGlowBirdsBackgroundPlaying(inst)
    inst._glowBirdsBootstrapKick = true
    registerGlowNativeTeardown(() => {
      glowLevel0LiveHeroChar = null
      persistGlowOnLeave(inst)
      stopGlowLoopAudio()
    })
    const backToMenuCancel = bindBackToMenuKeys(k, () => {
      goToMenuAfterAssets(k)
    })
    k.onSceneLeave(() => {
      backToMenuCancel.cancel()
      inst.touchDeathRespawnWait?.cancel?.()
      inst.touchDeathRespawnWait = null
      persistGlowOnLeave(inst)
      stopGlowLoopAudio()
    })
    if (await glowBootstrapPause(bootstrap, 95, session)) return
    if (glowInitStale(session)) return
    destroyGlowBootstrapCurtain(bootstrapCurtain)
    ensureGlowPitDrawLayer(inst)
    if (await glowBootstrapPause(bootstrap, 96, session)) return
    k.onDraw(() => onDraw(inst))
    k.onUpdate(() => onUpdate(inst))
    registerGlowTrampolineLateBounce(inst)
    if (await glowBootstrapPause(bootstrap, 97, session)) return
    createPlayfieldFrameOverlay(k, inst)
    //
    // Drowning — clipped hero blit (no extra water geometry on screen).
    //
    k.add([
      k.z(GLOW_DROWN_HERO_CLIP_Z),
      {
        draw() {
          drawGlowDrownHeroClipped(inst)
        }
      }
    ])
    await glowBootstrapPause(bootstrap, 100, session)
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
        drawPlayfieldTopBar(inst)
      }
    }
  ])
  k.add([
    k.pos(0, 0),
    k.z(CFG.visual.zIndex.ui + 25),
    {
      fixed: true,
      draw() {
        drawPlayfieldSideChrome(inst)
      }
    }
  ])
  k.add([
    k.pos(0, 0),
    k.z(PLAYFIELD_BOTTOM_CORNER_Z),
    {
      fixed: true,
      draw() {
        drawPlayfieldBottomCornerOverlay(inst)
      }
    }
  ])
}
//
// Plays the controls intro hint with locked movement until the player
// dismisses it (key, click, timer, or walk-away fallback on replays).
//
function startGlowIntro(inst) {
  if (inst.zones.predatorAwake) return
  //
  // Replays after a death skip the greeting: only the goal reminder shows,
  // controls stay free right away.
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
    const replayClick = bindPointerActivate(inst.k, () => {
      if (replayHintDismissed) return false
      dismissReplay()
      return true
    })
    return
  }
  inst.introLock = true
  inst.introHintPhase = INTRO_HINT_PHASE_TWO
  inst.introHintPause = 0
  const introCancels = []
  const cancelIntroInput = () => {
    introCancels.forEach(h => h.cancel())
    introCancels.length = 0
  }
  HeroHint.show(inst.heroHint, HINT_INTRO_2_TEXT, HINT_INTRO_2_DURATION, {
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
  // Space / Enter or click dismisses and unlocks (timer still works as fallback).
  //
  const advance = (key) => {
    INTRO_ADVANCE_KEY_NAMES.includes(key) && advanceGlowIntro(inst, { cancel: cancelIntroInput })
  }
  introCancels.push(bindStartGameKeys(inst.k, advance))
  introCancels.push(bindPointerActivate(inst.k, () => {
    if (!inst.introLock) return false
    advance('space')
    return true
  }))
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
// One key press closes the intro hint and unlocks controls immediately.
//
function advanceGlowIntro(inst, introHandlers) {
  if (!inst.introLock) {
    introHandlers.cancel()
    return
  }
  introHandlers.cancel()
  HeroHint.clear(inst.heroHint)
  finishGlowIntro(inst)
}
//
// Unlocks the hero after the intro hints.
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
}
//
// Hover tooltips over the HUD (same bubbles as touch lesson 0): the playable
// hero, the life icon (the "teacher") and the GLOW word.
// Each target only activates once its HUD element has been revealed.
//
function createSmallHeroTooltip(inst) {
  inst.worldHoverTooltip = createGlowTooltip({
    k: inst.k,
    targets: [{
      x: () => glowTeacherHudHoverPos(inst).x,
      y: () => glowTeacherHudHoverPos(inst).y,
      width: LIFE_TOOLTIP_SIZE,
      height: LIFE_TOOLTIP_SIZE,
      text: () => glowTeacherHudHoverText(inst),
      offsetY: LIFE_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => glowTeacherHudHoverVisible(inst),
      screenSpace: true
    }, {
      x: () => glowLifeScoreTooltipCenter(inst).x,
      y: () => glowLifeScoreTooltipCenter(inst).y,
      width: LIFE_SCORE_TOOLTIP_SIZE,
      height: LIFE_SCORE_TOOLTIP_SIZE,
      text: LIFE_TOOLTIP_TEXT,
      offsetY: LIFE_SCORE_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => glowTeacherHudHoverVisible(inst),
      screenSpace: true
    }, {
      x: () => inst.branchTrampState?.x ?? -1000,
      y: FLOOR_Y - TRAMP_TOTAL_H / 2,
      width: TRAMP_TOTAL_W,
      height: TRAMP_TOTAL_H,
      text: BRANCH_TRAMP_MARIO_HINT_TEXT,
      offsetY: TRAMP_TOOLTIP_Y_OFFSET,
      hoverId: 'branchTrampMario',
      visible: () => isBranchTrampDrawnVisible(inst)
    }]
  })
}
//
// The whole world is open from the first frame: colour, big tree, lake,
// both shores, every mushroom and the awake crawler.
//
function loadGlowZones() {
  return {
    predatorAwake: true,
    groundDecorRight: true,
    groundDecorLeft: true,
    groundRightStripMax: GROUND_RIGHT_STRIP_COUNT - 1,
    leftShoreRock: true,
    branchTrampBounceLive: true,
    rightTrampRevealed: true,
    rightTrampBounceLive: true,
    groundDecor: true,
    water: false,
    waterRocks: false,
    waterDiscovered: true,
    branchTrampRevealed: true
  }
}
//
// Persists glow storage keys before scene leave or native engine teardown.
//
function persistGlowOnLeave(inst) {
  persistGlowLastSpawn(inst)
}
//
// True while the hero stands inside the open pit cave (collapsed mouth).
//
function isHeroInsideGlowPitCave(inst, heroX, heroY, footY = heroY + SURFACE_DETECT_Y) {
  const pit = inst.pit
  if (pit?.zone && pit.collapsed) {
    const { leftX, rightX } = getGlowPitEarthBandMouthCutoutForPit(pit)
    const { innerX, innerW } = getGlowPitFloorCollider(pit.zone)
    const minX = Math.min(leftX + 6, innerX + 6)
    const maxX = Math.max(rightX - 6, innerX + innerW - 6)
    if (heroX < minX || heroX > maxX) return false
    //
    // Walking on the outdoor lip left of the mouth is not “inside” — only past
    // the drop or airborne within the mouth column counts.
    //
    if (footY <= pit.floorY + PIT_CAVE_APPROACH_GROUND_FEET) return false
    return footY >= pit.floorY - PIT_CAVE_AIR_ABOVE_LIP
  }
  return isHeroInGlowCaveVolume(heroX, footY)
}
//
// Keeps teacher-hint gating aligned with the hero pose (incl. mid-air jumps in the pit).
//
function syncGlowPitCaveFlagForTeacherHints(inst) {
  const char = inst.heroInst?.character
  if (!char?.pos) {
    inst._inGlowPitCave = false
    return
  }
  const footY = char.pos.y + SURFACE_DETECT_Y
  inst._inGlowPitCave = isHeroInsideGlowPitCave(inst, char.pos.x, char.pos.y, footY)
}
//
// Crack-mouth volume before the pit inst exists (spawn persist on teardown).
//
function isHeroInGlowCaveVolume(heroX, footY, floorY = FLOOR_Y, screenW = WORLD_W) {
  const zone = getCrackZone(screenW, floorY)
  if (heroX < zone.x1 + 8 || heroX > zone.x2 - 8) return false
  return footY >= floorY - 6
}
//
// Restores a saved cave pose after the pit collider is ready.
//
function applyGlowCaveSpawnResume(inst, heroSpawnX, heroSpawnY, wasInCave) {
  if (!wasInCave) return
  const ch = inst.heroInst?.character
  if (!ch?.exists?.()) return
  ch.pos.x = heroSpawnX
  ch.pos.y = inst.pit?.collapsed ? getGlowPitHeroStandY(inst.pit) : heroSpawnY
  snapGlowCameraToHero(inst.k, inst.heroInst)
}
//
// Remembers whether the hero was on the start branch or the ground so the
// next visit can resume at the same place (menu exit or level reload).
//
function persistGlowLastSpawn(inst) {
  const char = inst.heroInst?.character
  if (!char?.pos || inst.drowning || inst.deathHandled || inst.touchDeathHandled) return
  writeGlowLastSpawnKeys(inst, char.pos.x, char.pos.y)
}
//
// Stores spawn pose for the next reload (menu exit, death, or scene leave).
//
function writeGlowLastSpawnKeys(inst, heroX, heroY) {
  const footY = heroY + SURFACE_DETECT_Y
  set(KEY_LAST_SPAWN_X, heroX)
  set(KEY_LAST_SPAWN_Y, heroY)
  const inCave = isHeroInsideGlowPitCave(inst, heroX, heroY, footY) ||
    isHeroInGlowCaveVolume(heroX, footY)
  if (inCave) {
    set(KEY_LAST_SPAWN_MODE, SPAWN_MODE_CAVE)
    return
  }
  if (isHeroOverStartBranchX(inst, heroX) &&
    footY <= inst.startBranch.y + LOG_SNAP_STANDING_MAX) {
    set(KEY_LAST_SPAWN_MODE, SPAWN_MODE_BRANCH)
    return
  }
  set(KEY_LAST_SPAWN_MODE, SPAWN_MODE_GROUND)
}
//
// Death reload: same pose as at the kill, then bootstrap nudges clear hazards.
//
function persistGlowDeathSpawn(inst, deathX, deathY) {
  set(KEY_RESPAWN_NEAR_TREE, false)
  writeGlowLastSpawnKeys(inst, deathX, deathY)
}
//
// Pins the Glow HUD nodes to screen space so they stay under the top bar
// while the world camera scrolls.
//
function pinGlowHudFixed(indicator) {
  if (!indicator) return
  const pin = (obj) => obj?.exists?.() && (obj.fixed = true)
  indicator.letterObjects?.forEach(pin)
  indicator.letterOutlineObjects?.forEach(pin)
  indicator.scoreboardNodes?.forEach(pin)
}
//
// Pins the FPS counter to the top-centre of the screen.
//
function layoutGlowFpsHud(inst) {
  const fps = inst.fpsCounter
  if (!fps) return
  FpsCounter.pinScreenFixed(fps)
  FpsCounter.layoutAtScreenCenterX(fps, inst.k.width() / 2)
}
//
// Creates the glow HUD row — life/eye icon only, no section label.
//
function createGlowLevelIndicator(k) {
  //
  // The HUD small hero mirrors the playable hero: whitish body with grey eye
  // whites — it stays white even once the world colours.
  //
  const indicator = LevelIndicator.create({
    k,
    levelNumber: -1,
    sectionLabel: '',
    heroBodyColor: HERO_BODY_COLOR,
    heroOutlineColor: HERO_OUTLINE_COLOR,
    heroEyeWhiteColor: HERO_BODY_COLOR,
    heroPostBakeCanvas: applyGlowHudSharpBake,
    hudPostBakeCanvas: applyGlowHudSharpBake,
    //
    // White score numerals with a black shadow, always on.
    //
    scoreColorHex: HERO_BODY_COLOR,
    hudScoreFlat: false,
    topPlatformHeight: TOP_MARGIN,
    sideWallWidth: LEFT_MARGIN,
    sectionLabelY: GLOW_HUD_LABEL_TOP_Y,
    hideScoreboard: true
  })
  pinGlowHudFixed(indicator)
  return indicator
}
//
// Experience numeral is shown whenever the life HUD is revealed (including 0).
//
function syncGlowLifeScoreVisibility(indicator) {
  if (!indicator) return
  const show = indicator.lifeRevealed
  indicator.lifeScoreText && (indicator.lifeScoreText.hidden = !show)
  indicator.lifeScoreOutlines?.forEach(o => { o.hidden = !show })
}
//
// Life HUD for pit-mushroom nudges — shown as soon as an exploration hint applies.
//
function revealGlowTeacherHudForExplorationHintsIfNeeded(inst) {
  const indicator = inst.levelIndicator
  if (!indicator || indicator.lifeRevealed || !inst.pit) return
  LevelIndicator.revealLifeHud(indicator, false)
  const score = readGlowExperience()
  indicator.updateLifeScore?.(score)
  syncGlowLifeScoreVisibility(indicator)
  set(KEY_LIFE_SHOWN, true)
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
}
//
// HTML5 loop for birds.mp3 — Kaplay k.play().stop() does not reliably restart
// the same asset after lesson-glow.0 reloads.
//
function ensureGlowBirdsPlaybackRate(audio) {
  if (!audio) return
  audio.playbackRate = GLOW_BIRDS_PLAYBACK_RATE
  audio.defaultPlaybackRate = GLOW_BIRDS_PLAYBACK_RATE
  if ('preservesPitch' in audio) {
    audio.preservesPitch = true
  }
}
function createGlowBirdsLoopAudio() {
  const audio = new Audio(GLOW_BIRDS_AUDIO_SRC)
  audio.loop = true
  audio.preload = 'auto'
  audio.volume = 0
  ensureGlowBirdsPlaybackRate(audio)
  return audio
}
function stopGlowBirdsLoopAudio(audio) {
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
}
function bindGlowBirdsLoopAudio(audio) {
  glowBirdsLoopHandle && stopGlowBirdsLoopAudio(glowBirdsLoopHandle)
  glowBirdsLoopHandle = audio
}
function leaveGlowBirdsLoopAudio() {
  stopGlowBirdsLoopAudio(glowBirdsLoopHandle)
  glowBirdsLoopHandle = null
}
function setGlowBirdsLoopVolume(audio, volume) {
  if (!audio) return
  ensureGlowBirdsPlaybackRate(audio)
  const vol = Math.max(0, Math.min(1, volume))
  audio.volume = vol
  vol >= 0.001 && audio.paused && audio.play().catch(() => {})
}
//
// Web Audio chain for birds — volume on gain (not the element) so muffling works.
//
function ensureGlowBirdsWebAudio(inst, audio) {
  if (!audio || audio._glowBirdsChain) return audio._glowBirdsChain
  const ctx = inst?.sound?.audioContext
  //
  // createMediaElementSource detaches the element from the default output —
  // only wire the graph once the procedural context is running or birds stay
  // silent while suspended (common on level load before the first gesture).
  //
  if (!ctx || ctx.state !== 'running') return null
  try {
    const source = ctx.createMediaElementSource(audio)
    const filter = ctx.createBiquadFilter()
    filter.type = 'lowpass'
    filter.frequency.value = GLOW_BIRDS_COLOR_LOWPASS_HZ
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    audio._glowBirdsChain = { filter, gain }
    audio.volume = 1
    return audio._glowBirdsChain
  } catch (_) {
    return null
  }
}
//
// Snaps birds.mp3 to its full volume (reload).
//
function ensureGlowBirdsBackgroundPlaying(inst) {
  syncGlowWorldBirdsVolume(inst)
}
//
// Emits the same continuous background ambience the menu scene plays while
// hovering an anti-hero (Sound.startAmbient's drone + noise pad) near still-
// hidden discovery spots. Only the horizontal distance to the nearest spot's
// centre matters: within GLOW_PROXIMITY_SOUND_RADIUS px to either side the
// current grows into a steady stream the closer the hero walks to the centre
// X, and fades back to silence outside that band. Branch and right mushroom
// pads stay silent.
//
function updateGlowProximitySound(inst, char) {
  if (inst.drowning || inst.sound?._glowSfxMuted || !char?.pos) {
    Sound.stopAmbient(inst.sound)
    return
  }
  const targetXs = []
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
// Life-icon hover — "Your experience" (cave mushroom line when that beat is active).
//
function glowTeacherHudHoverPos(inst) {
  const anchor = glowTeacherHudAnchor(inst)
  return anchor ?? { x: -1000, y: -1000 }
}
//
// Baked life-score sprites anchor left; tooltip pointer needs the numeral centre.
//
function glowLifeScoreTooltipCenter(inst) {
  const t = inst.levelIndicator?.lifeScoreText
  if (!t?.pos) return { x: -1000, y: -1000 }
  const w = t.width ?? LIFE_SCORE_TOOLTIP_SIZE
  const h = t.height ?? LIFE_SCORE_TOOLTIP_SIZE
  return {
    x: t.pos.x + w * 0.5,
    y: t.pos.y + h * (0.5 - LIFE_SCORE_TOOLTIP_CENTER_Y_LIFT_FRAC) + LIFE_SCORE_TOOLTIP_CENTER_Y_OFFSET
  }
}
function glowTeacherHudHoverText(inst) {
  if (glowTeacherCaveMushroomHoverEligible(inst)) return PIT_CAVE_HINT_TEXT
  return LIFE_TOOLTIP_TEXT
}
function glowTeacherHudHoverVisible(inst) {
  if (!inst.levelIndicator?.lifeRevealed) return false
  if (inst._glowTeacherHintActive && HeroHint.isActive(inst.heroHint)) return false
  return true
}
//
// After two auto mushroom hints, hover on the teacher replays it while still in the cave.
//
function glowTeacherCaveMushroomHoverEligible(inst) {
  const pit = inst.pit
  if (!pit?.collapsed || !inst._inGlowPitCave) return false
  if (!pit || pit.pitCaveMushroomDone) return false
  return Boolean(pit.pitCaveMushroomHintPausedUntilExit)
}
//
// Full dry birds mix. Until the shared AudioContext runs, the bare element
// plays unfiltered so the start is never silent; the filtered chain takes
// over once it resumes.
//
function syncGlowWorldBirdsVolume(inst) {
  const birds = inst.birdsMusic
  if (!birds) return
  const targetVol = CFG.audio.backgroundMusic.birds
  const ctx = inst.sound?.audioContext
  ctx?.state === 'suspended' && ctx.resume().catch(ignoreGlowBirdsAudioError)
  const chain = ensureGlowBirdsWebAudio(inst, birds)
  ensureGlowBirdsPlaybackRate(birds)
  if (!chain) {
    setGlowBirdsLoopVolume(birds, targetVol)
    return
  }
  chain.filter.frequency.value = GLOW_BIRDS_COLOR_LOWPASS_HZ
  chain.gain.gain.value = targetVol
  birds.volume = 1
  birds.paused && birds.play().catch(ignoreGlowBirdsAudioError)
}
//
// Autoplay rejections are retried by the next frame's sync.
//
function ignoreGlowBirdsAudioError() {}
//
// Hermite ease for meditation colour preview (0 at start, 1 at timer zero).
//
function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}
//
// True when world X lies in the soft-mud band (grass + baked pebbles stay after G).
//
function isGlowDecorWorldXInMudZone(inst, worldX) {
  if (worldX == null || inst.mudZoneX1 == null || inst.mudZoneX2 == null) return false
  return worldX >= inst.mudZoneX1 && worldX <= inst.mudZoneX2
}
//
// True when world X lies in the early ground-peek band after G — same
// LEFT_MARGIN..mouth-shelf span drawMudGroundZone previews underground,
// mirrored here for the surface decor (rocks/mushrooms/grass) above it.
//
function isGlowWorldXInGroundPeekZone(inst, worldX) {
  if (worldX == null || !inst.zones?.predatorAwake) return false
  const floorEndX = getGlowCaveMouthFloorLeftX(getCrackZone(WORLD_W, FLOOR_Y))
  return worldX >= LEFT_MARGIN && worldX <= floorEndX
}
function applyZoneVisibility(inst) {
  const z = inst.zones
  const leftGroundOpen = z.groundDecorLeft
  inst.trampBundle.drawLayer.hidden = !isRightTrampolineVisible(z)
  inst.branchTrampBundle.drawLayer.hidden = !isBranchTrampolineVisible(z)
  syncPitCaveTrampolineDrawLayer(inst)
  inst.rockObjs.forEach(o => {
    if (o._mudZoneWalk) {
      setDecorObjVisible(o, z.predatorAwake)
      return
    }
    if (o._rightOfMud) {
      if (!z.predatorAwake) {
        setDecorObjVisible(o, false)
        return
      }
      const rightOp = glowRightDecorOpacity(inst, o)
      setDecorObjVisible(o, rightOp > 0.04, rightOp)
      return
    }
    if (o._lakeShoreEnd) {
      //
      // Cap rocks are painted in drawLakeShoreRocksWorld so they always sit
      // above the lake fill and parallax ground band.
      //
      o.hidden = true
      o.pos.y = PLATFORM_HIDE_Y
      return
    }
    const wxRock = o._decorWorldX ?? o._homeX ?? 0
    if (isGlowOpenPitMouthWorldX(inst.pit, wxRock)) {
      setDecorObjVisible(o, false)
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
    if (isGlowOpenPitMouthWorldX(inst.pit, wx)) {
      setDecorObjVisible(o, false)
      return
    }
    const inLake = z._lakeX1 != null && z._lakeX2 != null && wx >= z._lakeX1 && wx <= z._lakeX2
    if (o._side === 'left') {
      setDecorObjVisible(o, leftGroundOpen && !inLake, inst.leftDecorFade ?? 1)
      return
    }
    const rightOp = glowRightDecorOpacity(inst, o)
    setDecorObjVisible(o, rightOp > 0.04 && !inLake, rightOp)
  })
  inst.grassLayer.layer.hidden = !isGlowGrassLayerVisible(inst)
  inst.mudExtraGrass && (inst.mudExtraGrass.layer.hidden = !isGlowMudExtraGrassVisible(inst))
  inst.waterLayer && (inst.waterLayer.hidden = !z.water)
  rebuildWoodSurfaces(inst)
  z.water && ensureLakeShoreRocksVisible(inst)
  syncGlowMidgeDrawColor(inst)
  syncGlowPredatorVisibility(inst)
}
function isGlowGrassLayerVisible(inst) {
  const z = inst.zones
  return z.groundDecorLeft || z.groundRightStripMax >= 0
}
//
// The mud zone's own tall-grass overlay (createGlowMudExtraGrass) stays tied
// to predatorAwake alone, unlike the general grassLayer above — that layer
// follows the opened shore decor, which has nothing to do with the mud zone.
//
function isGlowMudExtraGrassVisible(inst) {
  return Boolean(inst.zones?.predatorAwake)
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
// Stalk-eye colours — eyeCreature.body stalk ink.
//
function glowChainBuoyColors(k) {
  const root = glowEarTreeRootKaplayRgb(k)
  //
  // Stalk + roots: eyeCreature.body (green-black segment ink). Eye ring only:
  // eyeCreature.contour. Sclera is hero white; the pupil is set by ChainBuoy.
  //
  const stalkTriplet = glowRgb(GLOW_PAL.eyeCreature.body)
  const ringTriplet = glowRgb(GLOW_PAL.eyeCreature.contour)
  const stalk = k.rgb(stalkTriplet.r, stalkTriplet.g, stalkTriplet.b)
  const ring = k.rgb(ringTriplet.r, ringTriplet.g, ringTriplet.b)
  const whiteTriplet = glowRgb(CFG.visual.colors.hero.eyeWhite)
  const white = k.rgb(whiteTriplet.r, whiteTriplet.g, whiteTriplet.b)
  return {
    body: stalk,
    sclera: white,
    highlight: white,
    contour: ring,
    root
  }
}
//
// Ear-tree colors — dark outline, wood bark and living green ears.
//
function glowEarTreeRootKaplayRgb(k) {
  const c = glowRgb(GLOW_PAL.treeColor.root)
  return k.rgb(c.r, c.g, c.b)
}
function glowEarTreeColors(k) {
  const bark = glowRgb(GLOW_PAL.treeColor.trunk)
  const leaf = glowRgb(GLOW_PAL.glowAttention.leaf)
  const leafLight = glowRgb(GLOW_PAL.glowAttention.leafLight)
  const leafVein = glowRgb(GLOW_PAL.glowAttention.leafVein)
  const root = glowEarTreeRootKaplayRgb(k)
  return {
    outline: k.rgb(DECOR_OUTLINE_RGB.r, DECOR_OUTLINE_RGB.g, DECOR_OUTLINE_RGB.b),
    bark: k.rgb(bark.r, bark.g, bark.b),
    leaves: {
      base: k.rgb(leaf.r, leaf.g, leaf.b),
      light: k.rgb(leafLight.r, leafLight.g, leafLight.b),
      vein: k.rgb(leafVein.r, leafVein.g, leafVein.b)
    },
    root
  }
}
//
// World-layer draw hooks for the chain-buoy and ear-tree decor — created
// once in bootstrap, colors resolved live each frame from the current mode.
//
function createGlowChainBuoyLayer(k, zones) {
  return k.add([
    k.z(GLOW_CHAIN_BUOY_Z),
    {
      draw() {
        const sc = zones._sceneRef
        if (!sc?.chainBuoys) return
        const c = glowChainBuoyColors(k)
        ChainBuoy.onDraw(sc.chainBuoys, c, glowCameraViewXRange(k, sc, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
}
//
// The shore branch is created parked off-screen; pin it to its home each frame.
//
function syncShoreBranchPlatform(inst) {
  const bundle = inst.shoreBranchPlatSegs
  if (bundle?.plats?.length) {
    bundle.plats.forEach((plat, i) => {
      const home = bundle.homes[i]
      if (!plat || !home) return
      plat.pos.x = home.x
      plat.pos.y = home.y
    })
    return
  }
  const plat = inst.shoreBranchPlat
  const home = inst.shoreBranchPlatHome
  if (!plat || !home) return
  plat.pos.x = home.x
  plat.pos.y = home.y
}
function createGlowHorizFallTwigLayer(k, inst) {
  k.add([
    k.z(HorizFallTwig.HORIZ_FALL_TWIG_DRAW_Z),
    {
      draw() {
        if (!inst.shoreFallTwigs) return
        HorizFallTwig.onDraw(
          inst.shoreFallTwigs,
          1,
          glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN)
        )
      }
    }
  ])
}
//
// Shore horizontal branch: camera shake on jump, dry twigs drop on 3rd landing.
//
function tickGlowShoreBranchTwigs(inst, char, hero, grounded, justLanded) {
  if (!inst?.shoreFallTwigs) return
  const onShore = isHeroOnShoreBranch(inst, char)
  const jumpStarted = inst._shoreBranchGrounded && onShore && !grounded &&
    (hero?.jumpPhase === 'jumping' || (char?.vel?.y ?? 0) < -60)
  jumpStarted && triggerGlowBranchLandingShake(inst)
  if (justLanded && grounded && onShore) {
    triggerGlowBranchLandingShake(inst)
    inst._shoreBranchLandingCount = (inst._shoreBranchLandingCount || 0) + 1
    inst._shoreBranchLandingCount >= GLOW_BRANCH_LANDINGS_TO_BREAK &&
      HorizFallTwig.dropHorizFallTwigs(inst.shoreFallTwigs)
  }
  inst._shoreBranchGrounded = onShore && grounded
}
//
// True when the hero stands on the shore tree's horizontal branch platform.
//
function isHeroOnShoreBranch(inst, char) {
  const home = inst.shoreBranchPlatHome
  if (!home || !char?.pos) return false
  const bundle = inst.shoreBranchPlatSegs
  const plats = bundle?.plats ?? (inst.shoreBranchPlat ? [inst.shoreBranchPlat] : [])
  const cur = char.curPlatform?.()
  if (cur && plats.some(plat => plat === cur && plat.pos.y > SHORE_BRANCH_PLAT_HIDE_Y + 1)) return true
  const footY = char.pos.y + SURFACE_DETECT_Y
  const homes = home.homes ?? bundle?.homes ?? [home]
  return homes.some(seg => {
    const x2 = seg.x2 ?? seg.x
    return char.pos.x >= seg.x && char.pos.x <= x2 &&
      footY >= seg.y - 8 && footY <= seg.y + LOG_SNAP_STANDING_MAX + 6
  })
}
//
// Ground spans the forest-floor plants must leave clear: trunks, both
// trampolines, stalk eyes and ear-trees (the hero needs to read all of them).
//
function buildGlowForestFloorBlockers(trampX, branchTrampX, buoySpots, shoreTreeLayout, earTreeSpots) {
  const blockers = [
    { x: TREE_X, half: TRUNK_EXCLUDE_HALF },
    { x: trampX, half: TRAMP_MUSHROOM_CLEAR_HALF },
    { x: branchTrampX, half: TRAMP_MUSHROOM_CLEAR_HALF },
    ...(buoySpots ?? []).map(s => ({ x: s.x, half: GLOW_FOREST_FLOOR_STALK_EYE_CLEAR_HALF })),
    ...(earTreeSpots ?? []).map(s => ({ x: s.x, half: EAR_TREE_TRUNK_GRASS_CLEAR_HALF }))
  ]
  shoreTreeLayout && blockers.push({ x: shoreTreeLayout.x, half: GLOW_FOREST_FLOOR_SHORE_TRUNK_CLEAR_HALF })
  return blockers
}
function isGlowForestFloorSpotFree(inst, blockers, x, halfW) {
  const x1 = x - halfW
  const x2 = x + halfW
  if (x2 >= inst.lakeX1 && x1 <= inst.lakeX2) return false
  if (isCrackDecorExcluded(x1, WORLD_W) || isCrackDecorExcluded(x2, WORLD_W)) return false
  return blockers.every(b => x2 < b.x - b.half || x1 > b.x + b.half)
}
function createGlowShoreTreeLayer(k, inst) {
  k.add([
    k.z(GLOW_EAR_TREE_TRUNK_OVERLAY_Z),
    {
      draw() {
        inst.shoreTree && ShoreTree.onDraw(inst.shoreTree, 1, glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
}
function createGlowEarTreeLayer(k, inst) {
  k.add([
    k.z(GLOW_EAR_TREE_Z),
    {
      draw() {
        if (!inst.earTrees) return
        const c = glowEarTreeColors(k)
        EarTree.onDrawTrunks(inst.earTrees, c.bark, c.outline, 1, glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
  k.add([
    k.z(GLOW_EAR_TREE_ROOTS_Z),
    {
      draw() {
        if (!inst.earTrees) return
        const c = glowEarTreeColors(k)
        EarTree.onDrawRoots(inst.earTrees, c.root, 1, glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
  k.add([
    k.z(GLOW_EAR_TREE_TRUNK_OVERLAY_Z),
    {
      draw() {
        if (!inst.earTrees) return
        const c = glowEarTreeColors(k)
        EarTree.onDrawTrunksAboveGrass(inst.earTrees, c.bark, c.outline, 1,
          glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
  k.add([
    k.z(GLOW_EAR_TREE_BRANCHES_Z),
    {
      draw() {
        if (!inst.earTrees) return
        const c = glowEarTreeColors(k)
        EarTree.onDrawBranches(inst.earTrees, c.bark, c.outline, c.leaves, 1,
          glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
  //
  // Above both trunk passes (under-hero and above-grass) and the branches —
  // the crown top must stay hidden behind the tomato sitting on it.
  //
  k.add([
    k.z(GLOW_SPIKY_TOMATO_Z),
    {
      draw() {
        inst.spikyTomatoes && SpikyTomato.onDraw(inst.spikyTomatoes, 1)
      }
    }
  ])
}
//
// Rebuilds wood-surface list for footstep/dust detection.
//
function rebuildWoodSurfaces(inst) {
  const branch = inst.woodSurfaces[0]
  const list = branch ? [branch] : []
  inst.woodSurfaces = list
}
//
// Horizontal positions — random-walk placement: each next trunk advances by
// a random fraction of the average cell width, so the gaps between trees
// vary irregularly across the whole playfield width. Trees near the centre
// are removed / shrunk later by the centre-clearing height factor.
//
function buildParallaxTreeXs(count, gameLeft, gameRight, focusX = null, focusBias = 0) {
  const xs = []
  const left = gameLeft + PAR_TREE_EDGE_PAD
  const right = gameRight - PAR_TREE_EDGE_PAD
  const cell = (right - left) / count
  let x = left + Math.random() * cell * 0.6
  while (x < right) {
    const placed = focusX != null && focusBias > 0
      ? x + (focusX - x) * focusBias * (0.35 + Math.random() * 0.45)
      : x
    xs.push(placed)
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
// Bakes three forest planes (each one's trees AND bushes on a single shared
// canvas) plus the haze backdrop and the static ground band. Depth comes from
// scroll speed and haze-blend steps; colour-world trees use the four reference
// corner palettes by playfield quadrant and canopy row.
//
async function buildParallaxSprites(k, undergroundSpec, onStep) {
  const maxScroll = WORLD_W - LEFT_MARGIN - RIGHT_MARGIN - VIEW_W
  bakeParallaxLayer(k, BG_PAR_TREE3_COLOR, PAR_SKY_SPEED, maxScroll, PAR_TREE_HORIZ_BLEED,
    PAR_SKY_WORLD_Y, PAR_SKY_WORLD_H, (ctx, pad) => {
      renderSkyBand(ctx)
      bakeParallaxBushes(ctx, pad, {
        cornerBandTop: PAR_FARTHEST_BAND_TOP,
        foliageDensityTier: 'background',
        colorFlat: false,
        heightScale: BUSH_FARTHEST_HEIGHT_SCALE
      })
    }, { blurRadius: glowDepthBlurRadiusPx('background'), grade: GLOW_LAYER_GRADE.far })
  onStep && await onStep(1, 4)
  bakeParallaxLayer(k, BG_PAR_TREE2_COLOR, PAR_TREE2_SPEED, maxScroll, PAR_TREE_HORIZ_BLEED,
    parTreeRowWorldY(PAR_MID_BAND_TOP), parTreeRowWorldH(PAR_MID_BAND_TOP), (ctx, pad) => {
      bakeParallaxTrees(ctx, pad, {
        count: PAR_FAR_TREE_COUNT,
        seedBase: PAR_FAR_SEED_BASE,
        topMinY: PAR_FAR_TOP_MIN_Y,
        topRange: PAR_FAR_TOP_RANGE,
        bandTop: PAR_MID_BAND_TOP,
        foliageDensityTier: 'midground',
        colorBlend: PAR_MID_COLOR_BLEND,
        flatLeaves: true,
        leafDarken: 0.1,
        uniformWood: true,
        treeFocusBias: PAR_TREE_FOCUS_BIAS_MID,
        trunkWidthScale: PAR_TRUNK_WIDTH_SCALE_MID
      })
      bakeParallaxBushes(ctx, pad, {
        cornerBandTop: PAR_MID_BAND_TOP,
        foliageDensityTier: 'midground',
        colorFlat: false,
        ferns: BUSH_FERNS_MID,
        heightScale: BUSH_FAR_HEIGHT_SCALE
      })
    }, { blurRadius: glowDepthBlurRadiusPx('midground'), grade: GLOW_LAYER_GRADE.mid })
  onStep && await onStep(2, 4)
  bakeParallaxLayer(k, BG_PAR_TREE1_COLOR, PAR_TREE1_SPEED, maxScroll, PAR_TREE_HORIZ_BLEED,
    parTreeRowWorldY(PAR_BIG_BAND_TOP), parTreeRowWorldH(PAR_BIG_BAND_TOP), (ctx, pad) => {
      bakeParallaxTrees(ctx, pad, {
        count: PAR_BIG_TREE_COUNT,
        seedBase: PAR_BIG_SEED_BASE,
        topMinY: PAR_BIG_TOP_MIN_Y,
        topRange: PAR_BIG_TOP_RANGE,
        bandTop: PAR_NEAR_BAND_TOP,
        foliageDensityTier: 'nearground',
        colorBlend: PAR_L1_COLOR_BLEND,
        flatLeaves: false,
        leafDarken: 0,
        uniformWood: false,
        leafWarmBlend: PAR_L1_LEAF_WARM_BLEND,
        treeFocusBias: PAR_TREE_FOCUS_BIAS_NEAR,
        trunkWidthScale: PAR_TRUNK_WIDTH_SCALE_NEAR
      })
      bakeParallaxBushes(ctx, pad, {
        cornerBandTop: PAR_NEAR_BAND_TOP,
        foliageDensityTier: 'nearground',
        colorFlat: false,
        ferns: BUSH_FERNS_NEAR,
        heightScale: BUSH_NEAR_HEIGHT_SCALE
      })
    }, { blurRadius: glowDepthBlurRadiusPx('nearground'), grade: GLOW_LAYER_GRADE.near })
  onStep && await onStep(3, 4)
  const staticColor = document.createElement('canvas')
  staticColor.width = WORLD_W
  staticColor.height = PAR_STATIC_WORLD_H
  const staticColorCtx = staticColor.getContext('2d')
  staticColorCtx.translate(0, -PAR_STATIC_WORLD_Y)
  renderCombinedGroundBand(staticColorCtx, groundEarthLayersColor(), undergroundSpec, undergroundStaticEarthTones())
  applyGlowMaterialBake(staticColor, 9101)
  k.loadSprite(BG_STATIC_COLOR, staticColor)
  staticColor.width = 0
  staticColor.height = 0
  onStep && await onStep(4, 4)
}
//
// Samples the dark teal sky gradient with dawn gold in the lower band.
//
function glowSkyBandRgb(mixT) {
  const zenith = glowRgb('glowSkyZenith')
  const mid = glowRgb('glowSkyMid')
  const horizon = glowRgb('glowSkyHorizon')
  let c = mixT < 0.5
    ? lerpRgb(zenith, mid, mixT * 2)
    : lerpRgb(mid, horizon, (mixT - 0.5) * 2)
  const dawnStart = 1 - SKY_DAWN_BOTTOM_FRAC
  if (mixT > dawnStart) {
    const u = (mixT - dawnStart) / (1 - dawnStart)
    c = lerpRgb(c, GLOW_LIGHT_CORE, SKY_DAWN_GLOW_STRENGTH * u)
  }
  return snapToPalette(c)
}
//
// Paints the dark green-teal sky band with golden dawn at the trunk line.
//
function renderSkyBand(ctx) {
  const skyHeight = FLOOR_Y - TOP_MARGIN
  const bands = SKY_DITHER_BAND_COUNT
  for (let b = 0; b < bands; b++) {
    const t0 = b / bands
    const t1 = (b + 1) / bands
    const c = glowSkyBandRgb((t0 + t1) * 0.5)
    ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`
    const y = TOP_MARGIN + t0 * skyHeight
    const bandH = Math.ceil(t1 * skyHeight - t0 * skyHeight) + 1
    ctx.fillRect(LEFT_MARGIN, y, GAME_W, bandH)
  }
}
//
// Renders one tree row into a parallax canvas with horizontal bleed.
//
function bakeParallaxTrees(ctx, pad, planeCfg) {
  const treeLeft = LEFT_MARGIN - pad
  const treeRight = WORLD_W - RIGHT_MARGIN + pad
  renderGlowTreePlane(ctx, {
    ...planeCfg,
    treeX1: treeLeft,
    treeX2: treeRight
  })
}
//
// Renders one bush row into a parallax canvas with horizontal bleed.
//
function bakeParallaxBushes(ctx, pad, stripCfg) {
  const x1 = LEFT_MARGIN - pad
  const x2 = WORLD_W - RIGHT_MARGIN + pad
  renderBushStrip(ctx, { ...stripCfg, x1, x2 })
}
//
// Bakes one parallax depth layer with horizontal padding so it never gaps at
// either scroll limit. Optional postFxCfg bakes depth blur and film grain
// after trees and bushes are painted.
//
function bakeParallaxLayer(k, name, speed, maxScroll, horizBleed, worldY, worldH, drawFn, postFxCfg = null) {
  const pad = Math.ceil(maxScroll * (1 - speed)) + horizBleed
  const canvasW = WORLD_W + pad * 2
  const canvasH = worldH
  const canvas = document.createElement('canvas')
  canvas.width = canvasW
  canvas.height = canvasH
  const ctx = canvas.getContext('2d')
  ctx.translate(pad, -worldY)
  drawFn(ctx, pad)
  postFxCfg && applyParallaxPostFxToContext(ctx, canvasW, canvasH, postFxCfg)
  parallaxColumnBoundsMap(k).set(name, measureParallaxColumnBounds(canvas, name === PAR_LAYER_NEAR.color))
  k.loadSprite(name, canvas)
  canvas.width = 0
  canvas.height = 0
}
//
// Column bounds registry for the live Kaplay instance (created on demand).
//
function parallaxColumnBoundsMap(k) {
  let bounds = parallaxColumnBoundsByK.get(k)
  if (!bounds) {
    bounds = new Map()
    parallaxColumnBoundsByK.set(k, bounds)
  }
  return bounds
}
//
// Scans one baked parallax canvas in PAR_COLUMN_W strips: top/bottom rows
// holding any ink, plus (optionally) the top of the fully opaque run that
// reaches the canvas bottom — used to hide farther layers behind the near row.
//
function measureParallaxColumnBounds(canvas, withSolid) {
  const w = canvas.width
  const h = canvas.height
  const data = canvas.getContext('2d').getImageData(0, 0, w, h).data
  const count = Math.ceil(w / PAR_COLUMN_W)
  const top = new Int32Array(count)
  const bottom = new Int32Array(count)
  const solidTop = withSolid ? new Int32Array(count) : null
  for (let c = 0; c < count; c++) {
    const x0 = c * PAR_COLUMN_W
    const x1 = Math.min(w, x0 + PAR_COLUMN_W)
    top[c] = firstInkRow(data, w, h, x0, x1, 0, 1)
    bottom[c] = top[c] >= h ? 0 : firstInkRow(data, w, h, x0, x1, h - 1, -1) + 1
    withSolid && (solidTop[c] = columnSolidTop(data, w, h, x0, x1))
  }
  return { top, bottom, solidTop, count, height: h }
}
//
// First row (scanning from startY by step) with any non-transparent pixel
// in [x0, x1); h when scanning down finds nothing, -1 when scanning up.
//
function firstInkRow(data, w, h, x0, x1, startY, step) {
  for (let y = startY; y >= 0 && y < h; y += step) {
    const row = y * w
    for (let x = x0; x < x1; x++) {
      if (data[(row + x) * 4 + 3] > 0) return y
    }
  }
  return step > 0 ? h : -1
}
//
// Top row of the fully opaque run touching the canvas bottom in [x0, x1);
// h when the bottom row itself has a see-through pixel.
//
function columnSolidTop(data, w, h, x0, x1) {
  for (let y = h - 1; y >= 0; y--) {
    const row = y * w
    for (let x = x0; x < x1; x++) {
      if (data[(row + x) * 4 + 3] < PAR_ALPHA_OPAQUE) return y + 1
    }
  }
  return 0
}
//
// Deterministic hash for layer-boundary jitter (stable across bakes).
//
function groundLayerJagHash01(n) {
  const s = Math.sin(n * 127.1 + 311.7) * 43758.5453
  return s - Math.floor(s)
}
//
// Per-column sample-and-hold offset — sharp vertical micro-spikes along X.
//
function groundLayerInteriorBoundaryWave(x, layerIndex) {
  if (layerIndex <= 0) return 0
  const macro = groundLayerMacroSeamSway(x, layerIndex)
  if (layerIndex === GROUND_LAYER_FRINGE_INDEX) {
    return macro + groundLayerFringeLobeOffset(x, layerIndex)
  }
  return macro + groundLayerJag(x, layerIndex) * GROUND_LAYER_INTERIOR_BOUNDARY_AMP
}
//
// Slow undulation on every interior seam — reads as soil rising and falling.
//
function groundLayerMacroSeamSway(x, layerIndex) {
  const seed = layerIndex * 19.1
  const warpedX = x + groundLayerValueNoise(x / GROUND_LAYER_MACRO_WARP_WAVELENGTH, seed + 7.7) * GROUND_LAYER_MACRO_WARP_AMP
  let sum = 0
  for (let i = 0; i < GROUND_LAYER_MACRO_OCTAVES.length; i++) {
    const octave = GROUND_LAYER_MACRO_OCTAVES[i]
    sum += groundLayerValueNoise(warpedX / octave.wavelength, seed + i * 41.3) * octave.amp
  }
  const envelope01 = (groundLayerValueNoise(x / GROUND_LAYER_MACRO_ENVELOPE_WAVELENGTH, seed + 3.3) + 1) * 0.5
  return sum * (GROUND_LAYER_MACRO_ENVELOPE_MIN + (1 - GROUND_LAYER_MACRO_ENVELOPE_MIN) * envelope01)
}
function groundLayerJag(x, layerIndex) {
  const seed = layerIndex * 97.13 + 3.7
  const bx = Math.floor(x / GROUND_LAYER_JAG_CELL_PX)
  return groundLayerJagHash01(bx * 13.7 + seed * 100.3) * 2 - 1
}
//
// Rounded tongues of topsoil plus a little pixel grit — centred on zero so the
// stratum fractions still hold on average.
//
function groundLayerFringeLobeOffset(x, layerIndex) {
  let sum = 0
  for (let i = 0; i < GROUND_LAYER_FRINGE_LOBE_OCTAVES.length; i++) {
    const octave = GROUND_LAYER_FRINGE_LOBE_OCTAVES[i]
    sum += groundLayerValueNoise(x / octave.wavelength, layerIndex * 5.1 + i * 13.9) * octave.amp
  }
  return sum + groundLayerJag(x, layerIndex) * GROUND_LAYER_FRINGE_JAG_AMP
}
//
// Smooth 1D value noise in [-1, 1]: hashed lattice values, smoothstep blend.
//
function groundLayerValueNoise(t, seed) {
  const i = Math.floor(t)
  const a = groundLayerJagHash01(i * 17.31 + seed)
  const b = groundLayerJagHash01((i + 1) * 17.31 + seed)
  return (a + (b - a) * smoothstep01(t - i)) * 2 - 1
}
function groundLayerBoundaryY(x, y0, height, cumFrac, layerIndex) {
  //
  // Top of the earth band is always a flat horizontal seam on FLOOR_Y.
  //
  if (cumFrac <= 0) return y0
  return y0 + height * cumFrac + groundLayerInteriorBoundaryWave(x, layerIndex)
}
//
// Fills one soil stratum between two wavy horizontal curves (top + bottom).
//
function paintWavyBoundedEarthLayer(ctx, rgb, shade, x0, width, y0, height, topFrac, bottomFrac, topLayerIndex, bottomLayerIndex) {
  const steps = Math.max(2, Math.ceil(width / GROUND_LAYER_SAMPLE_PX))
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x = x0 + t * width
    const y = groundLayerBoundaryY(x, y0, height, topFrac, topLayerIndex)
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  }
  for (let i = steps; i >= 0; i--) {
    const t = i / steps
    const x = x0 + t * width
    const y = bottomLayerIndex < 0
      ? y0 + height
      : groundLayerBoundaryY(x, y0, height, bottomFrac, bottomLayerIndex)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
  if (!shade) return
  ctx.fillStyle = `rgb(${shade.rgb.r}, ${shade.rgb.g}, ${shade.rgb.b})`
  ctx.globalAlpha = shade.alpha
  ctx.fill()
  ctx.globalAlpha = 1
}
//
// Stacks soil layers top to bottom — flat top on FLOOR_Y, jaggy seams
// between strata, flat bottom on the playfield earth floor.
//
function paintLayeredEarthBand(ctx, layers, x0, y0, width, height) {
  let cumFrac = 0
  for (let i = 0; i < layers.length; i++) {
    const nextFrac = i < layers.length - 1
      ? cumFrac + layers[i].frac
      : 1
    paintWavyBoundedEarthLayer(
      ctx,
      layers[i].rgb,
      layers[i].shade,
      x0,
      width,
      y0,
      height,
      cumFrac,
      nextFrac,
      i,
      i < layers.length - 1 ? i + 1 : -1
    )
    cumFrac = nextFrac
  }
}
//
// Paints the root-zone part of a combined background canvas: the layered
// earth band (three strata, see withMidEarthStratum) inside the
// playfield margins, topped with the underground decor.
//
function renderCombinedGroundBand(ctx, layers, undergroundSpec, ugEntry) {
  paintLayeredEarthBand(ctx, layers, LEFT_MARGIN, FLOOR_Y, GAME_W, CAVE_BAND_H)
  //
  // Flat seal along FLOOR_Y so the topsoil always meets the walkable ground
  // line with no sub-pixel gaps from the wavy interior seams below.
  //
  const topRgb = layers[0]?.rgb
  topRgb && paintFlatEarthGroundSeal(ctx, topRgb, LEFT_MARGIN, FLOOR_Y, GAME_W)
  renderUndergroundSpec(ctx, undergroundSpec, ugEntry)
  topRgb && paintFlatEarthGroundSeal(ctx, topRgb, LEFT_MARGIN, FLOOR_Y, GAME_W)
  //
  // Flat seal on the playfield earth floor — keeps the deepest stratum edge
  // perfectly horizontal after bake (no AA ripple along the bottom).
  //
  const bottomRgb = layers[layers.length - 1]?.rgb
  const earthFloorY = FLOOR_Y + CAVE_BAND_H
  bottomRgb && paintFlatEarthGroundSeal(ctx, bottomRgb, LEFT_MARGIN, earthFloorY - 4, GAME_W)
}
//
// Flat strip flush with the walkable ground line (covers sub-pixel gaps).
//
function paintFlatEarthGroundSeal(ctx, rgb, x0, y0, width) {
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.fillRect(x0, y0, width, 4)
}
//
// Three soil layers for the underground earth band, top to bottom, each
// { rgb, frac } (frac of the total band height; the last layer just fills
// whatever remains so rounding never leaves a gap). Both modes use brown soil
// tones; shadows lean on glowShadow / void (green-teal), not neutral gray.
//
function softenGroundEarthLayers(layers) {
  const avg = layers.reduce((acc, layer) => ({
    r: acc.r + layer.rgb.r,
    g: acc.g + layer.rgb.g,
    b: acc.b + layer.rgb.b
  }), { r: 0, g: 0, b: 0 })
  avg.r = Math.round(avg.r / layers.length)
  avg.g = Math.round(avg.g / layers.length)
  avg.b = Math.round(avg.b / layers.length)
  const pull = GROUND_LAYER_CONTRAST_PULL
  return layers.map(layer => ({
    ...layer,
    rgb: lerpRgb(layer.rgb, avg, pull)
  }))
}
//
// Colour-world earth strata for the static ground band.
//
function groundEarthLayersColor() {
  return withMidEarthStratum(softenGroundEarthLayers([
    { rgb: glowRgb('groundChernozem') },
    { rgb: glowRgb('groundSand') }
  ]))
}
//
// Topsoil / subsoil / deep clay, as in the reference. The palette has no
// brown between the two soil swatches (a lerp snaps to olive in the bake),
// so the subsoil takes the bottom tone and the deep clay is that same tone
// under a translucent shadow. The bottom tone itself stays unchanged
// (glowGroundEarthBottomLayerRgb fills under the cave floor with it).
//
function withMidEarthStratum([top, deep]) {
  return [
    { rgb: top.rgb, frac: GROUND_LAYER_FRACS[0] },
    { rgb: deep.rgb, frac: GROUND_LAYER_FRACS[1] },
    { rgb: deep.rgb, shade: { rgb: GLOW_SHADOW, alpha: GROUND_LAYER_DEEP_SHADE_ALPHA } }
  ]
}
//
// Picks one of the four reference corner tree palettes from world X and row.
//
function parallaxForestCornerKey(treeX, bandTop) {
  const midX = (LEFT_MARGIN + WORLD_W - RIGHT_MARGIN) * 0.5
  const left = treeX < midX
  const top = bandTop <= PAR_MID_BAND_TOP
  if (left && top) return PAR_TREE_CORNER_KEYS[0]
  if (!left && top) return PAR_TREE_CORNER_KEYS[1]
  if (left && !top) return PAR_TREE_CORNER_KEYS[2]
  return PAR_TREE_CORNER_KEYS[3]
}
//
// Main tree shares the nearest parallax row's corner foliage palette.
//
const MAIN_TREE_PARALLAX_FOLIAGE_CORNER = parallaxForestCornerKey(TREE_X, PAR_NEAR_BAND_TOP)
//
// Dominant leaf swatch for a quadrant (bushes and flat colour strips).
//
function parallaxCornerLeafRgb(treeX, bandTop) {
  const corner = GLOW_PAL[parallaxForestCornerKey(treeX, bandTop)]
  return glowRgb(corner.leaf)
}
//
// Renders one parallax plane into its combined canvas: each tree uses the
// same glow-tree generator as the main tree (default trunk taper, fractal
// branches, crown clusters). Only trunk height and a light width scale differ
// per row so the forest sits lower without a flat canopy fill band.
//
function renderGlowTreePlane(ctx, planeCfg) {
  const {
    count, seedBase, topMinY, topRange,
    colorBase, colorBlend, flatLeaves, leafDarken, uniformWood,
    leafWarmBlend = 0,
    colorPal: colorPalOverride,
    bandTop = PAR_NEAR_BAND_TOP,
    treeX1 = LEFT_MARGIN,
    treeX2 = WORLD_W - RIGHT_MARGIN,
    treeFocusBias = 0,
    trunkWidthScale = 1,
    foliageDensityTier = 'midground'
  } = planeCfg
  const treeDensityOpts = glowTreeBuildOptsForDensity(foliageDensityTier)
  const treeXs = buildParallaxTreeXs(count, treeX1, treeX2, TREE_X, treeFocusBias)
  treeXs.forEach((treeX, i) => {
    //
    // Each tree picks one of the four corner colour families.
    //
    const colorPal = colorPalOverride || buildDimmedTreePalette(
      colorBase || getTreePaletteParallaxCorner(parallaxForestCornerKey(treeX, bandTop)),
      PARALLAX_FOLIAGE_HAZE,
      colorBlend,
      flatLeaves,
      leafDarken,
      uniformWood,
      leafWarmBlend
    )
    const trunkTopY = topMinY + Math.random() * topRange
    const treeSeed = TREE_SEED + seedBase + i * PAR_BIG_SEED_STEP
    const treeData = buildGlowTree(
      treeSeed,
      Math.round(treeX),
      PAR_TRUNK_BOTTOM_Y,
      Math.round(trunkTopY),
      PAR_TRUNK_BOTTOM_Y,
      PAR_TRUNK_BOTTOM_Y,
      { includeRoots: false, includeHeroBranch: false, ...treeDensityOpts }
    )
    //
    // Slight width scale so a row of main-style trees does not overpower the hero tree.
    //
    const widthScale = PAR_BIG_WIDTH_SCALE_MIN + Math.random() * PAR_BIG_WIDTH_SCALE_RANGE
    scaleGlowTreeWidths(treeData, widthScale)
    trunkWidthScale < 1 && scaleGlowTreeTrunkWidths(treeData, trunkWidthScale)
    const colorPalDraw = applyFoliageDensityToPalette(colorPal, foliageDensityTier)
    renderGlowTreeIntoContext(ctx, treeData, colorPalDraw, WORLD_W, WORLD_H)
  })
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
    seg.w2 != null && (seg.w2 *= scale)
  })
}
//
// Narrows only the main trunk wood — hero branch width stays in glow-tree.js.
//
function scaleGlowTreeTrunkWidths(treeData, scale) {
  treeData.trunkSegs.forEach(seg => {
    seg.w *= scale
    seg.w2 *= scale
  })
}
//
// Earth / bark / stone bakes — stronger film grain where texture is expected.
//
function applyGlowMaterialBake(canvas, seedOffset = 0, densityTier = 'gameplay') {
  applyGlowLayerGradeToCanvas(canvas, {
    ...GLOW_LAYER_GRADE.material,
    grainBlockSize: glowFilmGrainBlockPxForTier(densityTier)
  }, seedOffset)
}
//
// Renders one bush strip into its combined canvas: leafy mounds of varying
// radii centred on the ground line (everything below FLOOR_Y is cleared
// afterwards, so every mound is cut by the ground). Each mound is a filled
// dome plus scattered oval leaves and a ragged leaf rim, so the strip reads
// as real bushes.
//
function renderBushStrip(ctx, stripCfg) {
  const {
    colorRgb, colorFlat, heightScale, hiResClusters,
    ferns = 0,
    foliageDensityTier = 'midground',
    cornerBandTop = null,
    x1 = LEFT_MARGIN,
    x2 = WORLD_W - RIGHT_MARGIN
  } = stripCfg
  let x = x1
  const right = x2
  while (x < right) {
    const radius = (BUSH_RADIUS_MIN + Math.random() * (BUSH_RADIUS_MAX - BUSH_RADIUS_MIN)) * heightScale
    const leafSizeScale = glowBushLeafSizeScaleForTier(foliageDensityTier)
    const leafDensityScale = glowBushLeafDensityScaleForTier(foliageDensityTier)
    const mound = buildLeafyBushMoundSpec(x, radius, leafSizeScale, leafDensityScale)
    const moundColorRgb = cornerBandTop != null
      ? parallaxCornerLeafRgb(mound.x, cornerBandTop)
      : colorRgb
    const useHiResClusters = hiResClusters ?? glowHiResBushClustersForTier(foliageDensityTier)
    const fernCount = Math.floor(ferns) + (Math.random() < ferns % 1 ? 1 : 0)
    for (let f = 0; f < fernCount; f++) paintBushStripFern(ctx, mound, moundColorRgb)
    drawLeafyBushMound(ctx, mound, moundColorRgb, colorFlat)
    useHiResClusters && drawHiResBushClusters(ctx, mound, moundColorRgb, foliageDensityTier)
    //
    // Advance less than a radius so each mound overlaps the next one.
    //
    x += radius * (BUSH_STEP_MIN_FRAC + Math.random() * BUSH_STEP_RANGE_FRAC)
  }
}
//
// Dark pinnate fern behind a bush mound, poking out above its dome.
//
function paintBushStripFern(ctx, mound, rgb) {
  const seed = Math.floor(Math.random() * BUSH_FERN_SEED_RANGE)
  const x = mound.x + (Math.random() * 2 - 1) * mound.radius * BUSH_FERN_OFFSET
  const size = mound.radius * (BUSH_FERN_SIZE_MIN + Math.random() * BUSH_FERN_SIZE_RANGE)
  paintBushFernOnto(ctx, x, size, seed, rgb)
}
function paintBushFernOnto(ctx, x, size, seed, rgb) {
  drawFernToCanvas(ctx, {
    x,
    baseY: FLOOR_Y,
    size,
    rng: createSeededRandom(seed),
    colors: {
      stem: bushFernTone(rgb, BUSH_FERN_STEM),
      dark: bushFernTone(rgb, BUSH_FERN_DARK),
      mid: bushFernTone(rgb, BUSH_FERN_MID),
      light: bushFernTone(rgb, BUSH_FERN_LIGHT)
    }
  })
}
function bushFernTone(rgb, shade) {
  const c = lerpRgb(rgb, GLOW_SHADOW, shade)
  return `rgb(${c.r}, ${c.g}, ${c.b})`
}
//
// Generates the geometry of one leafy bush mound: the dome plus the exact
// position, size, tilt and shade index of every inner and rim leaf, so the
// same mound can be painted identically with different tones.
//
function buildLeafyBushMoundSpec(x, radius, leafSizeScale = 1, leafDensityScale = 1) {
  const leaves = []
  //
  // Inner leaves — density scales with the dome area; sqrt keeps the radial
  // distribution uniform so no thin spots appear near the rim.
  //
  const innerCount = Math.round(radius * radius * BUSH_LEAF_DENSITY * leafDensityScale)
  for (let i = 0; i < innerCount; i++) {
    const a = Math.PI + Math.random() * Math.PI
    const dist = radius * Math.sqrt(Math.random())
    leaves.push({
      x: x + Math.cos(a) * dist,
      y: FLOOR_Y + Math.sin(a) * dist,
      size: (BUSH_LEAF_SIZE_MIN + Math.random() * BUSH_LEAF_SIZE_RANGE) * leafSizeScale,
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
      size: (BUSH_LEAF_SIZE_MIN + Math.random() * BUSH_LEAF_SIZE_RANGE) * leafSizeScale,
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
  const shades = BUSH_LEAF_DARKEN_STEPS.map(t => flat ? rgb : lerpRgb(rgb, GLOW_SHADOW, t))
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
// Clustered pixel-style foliage on the nearest parallax bush row (puffy
// clumps with a darker shadow base and a highlight rim), scattered evenly
// across the whole dome — sqrt(random()) for the radial sample keeps the
// density uniform per unit area (same trick buildLeafyBushMoundSpec uses
// for its inner leaves) instead of bunching everything near the base.
//
function drawHiResBushClusters(ctx, mound, baseRgb, foliageDensityTier = 'nearground') {
  const { minPx, maxPx } = glowBushHiResClusterRadiusRangeForTier(foliageDensityTier)
  const clusterCount = Math.max(10, Math.round(mound.radius * BUSH_HIRES_CLUSTER_DENSITY))
  for (let i = 0; i < clusterCount; i++) {
    const a = Math.PI + Math.random() * Math.PI
    const dist = mound.radius * Math.sqrt(Math.random())
    const cx = mound.x + Math.cos(a) * dist
    const cy = FLOOR_Y + Math.sin(a) * dist
    const r = minPx + Math.random() * (maxPx - minPx)
    drawGlowHiResFoliageCluster(ctx, cx, cy, r, baseRgb, mound.x * 17 + i * 991)
  }
}
//
// Underground decor spec that dresses up the root-zone earth band: buried
// rocks, cracks, pebble clusters, hanging rootlets and a fossil spiral. It is
// generated once per live Kaplay instance and baked into the combined static
// earth band, so a prewarmed engine never regenerates it.
//
const undergroundSpecByK = new WeakMap()
function glowUndergroundSpec(k) {
  const cached = undergroundSpecByK.get(k)
  if (cached) return cached
  const spec = buildUndergroundSpec()
  undergroundSpecByK.set(k, spec)
  return spec
}
//
// Brown underground tones baked into the static colour earth band.
//
function undergroundStaticEarthTones() {
  return {
    fill: glowRgb('groundSand'),
    deep: glowRgb(GLOW_PAL.log.bark),
    light: glowRgb(GLOW_PAL.log.barkLight),
    monoStrokes: true,
    ...undergroundColorExtraTones()
  }
}
//
// Cobble, void, pebble and grit tones for the static colour earth band.
//
function undergroundColorExtraTones() {
  const tones = GLOW_PAL.glowUnderground
  return {
    stone: glowRgb(tones.stone),
    stoneLight: glowRgb(tones.stoneLight),
    contour: glowRgb(tones.contour),
    grit: glowRgb(tones.grit),
    pebble: glowRgb(tones.pebble)
  }
}
//
// Chain-buoy decor spots — spread across the level, skipping the band around
// the big tree (which gets the ear-trees instead, see buildGlowEarTreeSpots).
//
const GLOW_CHAIN_BUOY_COUNT_MIN = 5
const GLOW_CHAIN_BUOY_COUNT_MAX = 7
const GLOW_CHAIN_BUOY_TREE_CLEAR_HALF = 260
const GLOW_CHAIN_BUOY_MIN_GAP = 150
const GLOW_CHAIN_BUOY_PLACE_ATTEMPTS = 80
//
// No stalk-eye within this distance of an ear-tree trunk, on either side.
//
const GLOW_CHAIN_BUOY_EAR_TREE_FAR_CLEAR = 118
const GLOW_CHAIN_BUOY_MUD_EAST_MIN = 4
//
// All buoys stay right of the mud zone (the lake sits to the mud's own
// left) — same gap the ear-trees use right of the mud.
//
const GLOW_CHAIN_BUOY_MUD_RIGHT_GAP = 56
const GLOW_CHAIN_BUOY_PLATFORM_X_MARGIN = 36
const GLOW_CHAIN_BUOY_PLATFORM_SIDE_MIN = 88
const GLOW_CHAIN_BUOY_PLATFORM_SIDE_JITTER = 56
const GLOW_EAR_TREE_RIGHT_COUNT = 2
const GLOW_EAR_TREE_MUD_RIGHT_GAP = 56
const GLOW_EAR_TREE_RIGHT_CAVE_MARGIN = 0
const GLOW_EAR_TREE_MIN_GAP = 240
const GLOW_EAR_TREE_SCAN_STEP = 4
//
// Lip-trees must not sit on the shore accent trunk, through a mushroom
// trampoline cap, or on a fixed stalk-eye (bounce chain, prize eye). The
// mushroom is short, so the tree's branches pass above it — only the trunk
// needs to clear the cap.
//
const GLOW_SHORE_TREE_EAR_TREE_CLEAR_HALF = 210
const GLOW_EAR_TREE_MUSHROOM_TRAMP_CLEAR_HALF = 100
const GLOW_EAR_TREE_STALK_EYE_CLEAR_HALF = 110
//
// Keeps grass blades from spawning over an ear-tree's trunk footprint - the
// trunk polygon (z = player - 1) sits BELOW the grass layer (GRASS_Z = 20),
// so an unexcluded blade fully hides it, leaving only the branches (which
// reach up and out past the grass silhouette) visible - looking exactly like
// "floating branches" or "no trunk at all". Covers the widest possible trunk
// base (EAR_TREE_TRUNK_W_BASE * max trunkWScale * base taper mult + wobble +
// outline pad) plus a blade's own half-width.
//
const EAR_TREE_TRUNK_GRASS_CLEAR_HALF = 26
const GLOW_PLANT_WHISPER_MAX_VOLUME = 0.42
//
// Minimum change in proximity (0..1) per frame to count as moving toward or
// away from the eye-flower — ignores sub-pixel jitter.
//
const GLOW_PLANT_WHISPER_PROX_DELTA = 0.002
const GLOW_EARLY_LAND_FOOT_ABOVE = 26
//
// Clearance kept around the cave crack zone for both decor kinds — neither
// should ever spawn over the cave entrance.
//
const GLOW_CAVE_DECOR_CLEAR = 140
function buildGlowChainBuoyWoodBands(cfg) {
  const { horizBranch } = cfg
  return horizBranch ? [{ x1: horizBranch.x1, x2: horizBranch.x2 }] : []
}
function glowChainBuoyXUnderWoodPlatform(x, woodBands) {
  const margin = GLOW_CHAIN_BUOY_PLATFORM_X_MARGIN
  return (woodBands ?? []).some(b => x >= b.x1 - margin && x <= b.x2 + margin)
}
function buildGlowChainBuoySpot(x, opts = null) {
  return {
    x,
    groundY: FLOOR_Y,
    prizeEye: Boolean(opts?.prizeEye),
    chainTrampRole: opts?.chainTrampRole ?? null,
    seed: opts?.seed ?? Math.random() * Math.PI * 2,
    segmentCount: opts?.segmentCount ?? 5 + Math.floor(Math.random() * 4),
    segmentLen: opts?.segmentLen ?? 22 + Math.random() * 10,
    segmentWidth: opts?.segmentWidth ?? 3.85 + Math.random() * 0.55,
    swayAmp: opts?.swayAmp ?? 0.09 + Math.random() * 0.12,
    swaySpeed: opts?.swaySpeed ?? 0.75 + Math.random() * 0.65,
    swayLag: opts?.swayLag ?? 0.35 + Math.random() * 0.35,
    eyeRadius: opts?.eyeRadius,
    pupilRadius: opts?.pupilRadius
  }
}
function tryAddGlowChainBuoySpot(spots, x, lakeX1, lakeX2, mud, cave, woodBands, earTreeSpots, trampX, branchTrampX) {
  if (Math.abs(x - TREE_X) < GLOW_CHAIN_BUOY_TREE_CLEAR_HALF) return false
  if (glowChainBuoyXUnderWoodPlatform(x, woodBands)) return false
  if (x > glowPrizeEyeX(trampX) - GLOW_CHAIN_BUOY_MIN_GAP) return false
  if ((earTreeSpots ?? []).some(s => glowChainBuoyXBlockedNearEarTree(x, s.x))) return false
  //
  // Never right on top of a mushroom trampoline — the random search just
  // lands the buoy somewhere else nearby instead (left or right of it).
  //
  if (trampX != null && Math.abs(x - trampX) < TRAMP_ROCK_CLEAR_HALF) return false
  if (branchTrampX != null && Math.abs(x - branchTrampX) < TRAMP_ROCK_CLEAR_HALF) return false
  //
  // Every buoy stays right of the mud (which itself sits right of the lake),
  // never in or near the water — a hard rule now, not just one exclusion
  // among several, since the old whole-world random search let a spot land
  // inside the lake whenever the passed lakeX1/lakeX2 didn't quite track the
  // water's actual current extent.
  //
  if (x < mud.x2 + GLOW_CHAIN_BUOY_MUD_RIGHT_GAP) return false
  if (x >= lakeX1 && x <= lakeX2) return false
  if (x >= mud.x1 - 24 && x <= mud.x2 + 24) return false
  if (x >= cave.x1 - GLOW_CAVE_DECOR_CLEAR && x <= cave.x2 + GLOW_CAVE_DECOR_CLEAR) return false
  if (spots.some(s => Math.abs(s.x - x) < GLOW_CHAIN_BUOY_MIN_GAP)) return false
  spots.push(buildGlowChainBuoySpot(x))
  return true
}
function buildGlowChainBuoySpots(lakeX1, lakeX2, woodBands, earTreeSpots, trampX, branchTrampX) {
  const spots = []
  const mud = computeGlowMudZoneX()
  const cave = getCrackZone(WORLD_W, FLOOR_Y)
  const target = GLOW_CHAIN_BUOY_COUNT_MIN +
    Math.floor(Math.random() * (GLOW_CHAIN_BUOY_COUNT_MAX - GLOW_CHAIN_BUOY_COUNT_MIN + 1))
  const sideXs = []
  for (const band of woodBands ?? []) {
    const jitter = () => Math.random() * GLOW_CHAIN_BUOY_PLATFORM_SIDE_JITTER
    sideXs.push(band.x1 - GLOW_CHAIN_BUOY_PLATFORM_SIDE_MIN - jitter())
    sideXs.push(band.x2 + GLOW_CHAIN_BUOY_PLATFORM_SIDE_MIN + jitter())
  }
  for (let i = sideXs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = sideXs[i]
    sideXs[i] = sideXs[j]
    sideXs[j] = tmp
  }
  for (const x of sideXs) {
    if (spots.length >= target) break
    tryAddGlowChainBuoySpot(spots, x, lakeX1, lakeX2, mud, cave, woodBands, earTreeSpots, trampX, branchTrampX)
  }
  //
  // Random fill now only searches right of the mud through to the cave —
  // matches the "all buoys right of the mud" rule above and, being a much
  // smaller span than the whole world, reliably hits the 5-7 target instead
  // of frequently running out of attempts against every exclusion combined.
  //
  const fillX1 = mud.x2 + GLOW_CHAIN_BUOY_MUD_RIGHT_GAP
  const fillX2 = cave.x1 - GLOW_CAVE_DECOR_CLEAR
  let attempts = 0
  while (spots.length < target && attempts < GLOW_CHAIN_BUOY_PLACE_ATTEMPTS && fillX2 > fillX1) {
    attempts += 1
    const x = fillX1 + Math.random() * (fillX2 - fillX1)
    tryAddGlowChainBuoySpot(spots, x, lakeX1, lakeX2, mud, cave, woodBands, earTreeSpots, trampX, branchTrampX)
  }
  addGlowPrizeEyeSpot(spots, trampX)
  addGlowChainTrampEyes(spots, trampX)
  ensureGlowChainBuoysEastOfMud(
    spots,
    fillX1,
    fillX2,
    lakeX1,
    lakeX2,
    mud,
    cave,
    woodBands,
    earTreeSpots,
    trampX,
    branchTrampX
  )
  pruneGlowChainBuoysWestOfTrampPair(spots, trampX)
  pruneGlowChainBuoysOverlappingShoreTree(spots)
  spots.sort((a, b) => a.x - b.x)
  return spots
}
//
// First (higher, west) and second (lower) stalk-eyes of the bounce chain.
//
function glowChainTrampLayout(trampX) {
  const secondX = trampX - GLOW_CHAIN_TRAMP_MUSH_STEP_X - GLOW_CHAIN_TRAMP_PAIR_SHIFT_LEFT
  const firstX = secondX - GLOW_CHAIN_TRAMP_EYE_STEP_X
  return { firstX, secondX }
}
function addGlowChainTrampEyes(spots, trampX) {
  if (trampX == null) return
  const layout = glowChainTrampLayout(trampX)
  for (let i = spots.length - 1; i >= 0; i--) {
    const sx = spots[i].x
    if (spots[i].prizeEye) continue
    if (Math.abs(sx - layout.secondX) < GLOW_CHAIN_BUOY_MIN_GAP ||
      Math.abs(sx - layout.firstX) < GLOW_CHAIN_BUOY_MIN_GAP) {
      spots.splice(i, 1)
    }
  }
  const push = (x, role, segmentCount, seed) => {
    spots.push(buildGlowChainBuoySpot(x, {
      chainTrampRole: role,
      segmentCount,
      segmentLen: GLOW_CHAIN_TRAMP_SEGMENT_LEN,
      segmentWidth: 4.1,
      swayAmp: GLOW_CHAIN_TRAMP_SWAY_AMP,
      swaySpeed: GLOW_CHAIN_TRAMP_SWAY_SPEED,
      swayLag: GLOW_CHAIN_TRAMP_SWAY_LAG,
      seed
    }))
  }
  push(layout.secondX, ChainEyeTramp.CHAIN_EYE_ROLE_SECOND, GLOW_CHAIN_TRAMP_SECOND_SEGMENTS, 2.17)
  push(layout.firstX, ChainEyeTramp.CHAIN_EYE_ROLE_FIRST, GLOW_CHAIN_TRAMP_FIRST_SEGMENTS, 4.83)
}
//
// Nothing else grows west of the first tramp eye — that span is the shore tree.
//
function pruneGlowChainBuoysWestOfTrampPair(spots, trampX) {
  if (trampX == null || !spots?.length) return
  const westBound = glowChainTrampLayout(trampX).firstX - GLOW_CHAIN_TRAMP_WEST_MARGIN
  for (let i = spots.length - 1; i >= 0; i--) {
    if (spots[i].chainTrampRole || spots[i].prizeEye) continue
    spots[i].x < westBound && spots.splice(i, 1)
  }
}
//
// Keeps stalk-eyes off the shore tree trunk (left of the first tramp eye).
//
function pruneGlowChainBuoysOverlappingShoreTree(spots) {
  const layout = ShoreTree.buildGlowShoreTreeLayout(spots, FLOOR_Y)
  if (!layout) return
  for (let i = spots.length - 1; i >= 0; i--) {
    if (spots[i].prizeEye || spots[i].chainTrampRole) continue
    Math.abs(spots[i].x - layout.x) < GLOW_SHORE_TREE_BUOY_CLEAR_X && spots.splice(i, 1)
  }
}
//
// Stalk-eyes and ear-trees never share a spot — the tree's branches spread
// over a nearby stalk and read as one tangled prop.
//
function glowChainBuoyXBlockedNearEarTree(x, treeX) {
  return Math.abs(x - treeX) < GLOW_CHAIN_BUOY_EAR_TREE_FAR_CLEAR
}
//
// Guarantees at least four buoys east of the mud — random fill often misses
// targets once platform/trampoline exclusions eat the span.
//
function ensureGlowChainBuoysEastOfMud(
  spots,
  fillX1,
  fillX2,
  lakeX1,
  lakeX2,
  mud,
  cave,
  woodBands,
  earTreeSpots,
  trampX,
  branchTrampX
) {
  const span = fillX2 - fillX1
  if (span <= GLOW_CHAIN_BUOY_MIN_GAP) return
  let eastCount = spots.filter(s => s.x >= fillX1).length
  if (eastCount >= GLOW_CHAIN_BUOY_MUD_EAST_MIN) return
  const slots = [0.14, 0.36, 0.58, 0.82]
  for (const slot of slots) {
    if (eastCount >= GLOW_CHAIN_BUOY_MUD_EAST_MIN) break
    let x = fillX1 + span * slot
    for (let attempt = 0; attempt < 6; attempt++) {
      if (tryAddGlowChainBuoySpot(
        spots,
        x,
        lakeX1,
        lakeX2,
        mud,
        cave,
        woodBands,
        earTreeSpots,
        trampX,
        branchTrampX
      )) {
        eastCount += 1
        break
      }
      x += (Math.random() - 0.5) * GLOW_CHAIN_BUOY_MIN_GAP * 0.45
    }
  }
}
//
// The tall prize stalk-eye just east of the right mushroom — only a mushroom
// bounce reaches its cap, and it stays the rightmost stalk-eye in the level
// (every random buoy east of it is dropped).
//
function glowPrizeEyeX(trampX) {
  return trampX + GLOW_PRIZE_EYE_OFFSET_X
}
function addGlowPrizeEyeSpot(spots, trampX) {
  const prizeX = glowPrizeEyeX(trampX)
  for (let i = spots.length - 1; i >= 0; i--) {
    spots[i].x > prizeX - GLOW_CHAIN_BUOY_MIN_GAP && spots.splice(i, 1)
  }
  spots.push(buildGlowChainBuoySpot(prizeX, {
    prizeEye: true,
    segmentCount: GLOW_PRIZE_EYE_SEGMENTS,
    segmentLen: GLOW_PRIZE_EYE_SEGMENT_LEN,
    segmentWidth: GLOW_PRIZE_EYE_SEGMENT_WIDTH,
    swayAmp: GLOW_PRIZE_EYE_SWAY_AMP,
    swaySpeed: GLOW_PRIZE_EYE_SWAY_SPEED,
    swayLag: GLOW_PRIZE_EYE_SWAY_LAG,
    seed: GLOW_PRIZE_EYE_SEED,
    eyeRadius: GLOW_PRIZE_EYE_SCLERA_RADIUS,
    pupilRadius: GLOW_PRIZE_EYE_PUPIL_RADIUS
  }))
}
//
// Ear-tree decor spots — two trees clustered right of the big tree (never over mud).
//
function glowShoreTreeTrunkXFromTramp(trampX) {
  if (trampX == null) return null
  const layout = glowChainTrampLayout(trampX)
  const shoreLayout = ShoreTree.buildGlowShoreTreeLayout([
    buildGlowChainBuoySpot(layout.firstX, {
      chainTrampRole: ChainEyeTramp.CHAIN_EYE_ROLE_FIRST,
      segmentCount: GLOW_CHAIN_TRAMP_FIRST_SEGMENTS,
      segmentLen: GLOW_CHAIN_TRAMP_SEGMENT_LEN
    })
  ], FLOOR_Y)
  return shoreLayout?.x ?? null
}
function glowEarTreeSpotXAllowed(spots, x, branchTrampX, trampX, shoreTrunkX) {
  if (Math.abs(x - branchTrampX) < GLOW_EAR_TREE_MUSHROOM_TRAMP_CLEAR_HALF) return false
  if (trampX != null && Math.abs(x - trampX) < GLOW_EAR_TREE_MUSHROOM_TRAMP_CLEAR_HALF) return false
  if (glowEarTreeXOnFixedStalkEye(x, trampX)) return false
  if (shoreTrunkX != null && Math.abs(x - shoreTrunkX) < GLOW_SHORE_TREE_EAR_TREE_CLEAR_HALF) return false
  return !spots.some(s => Math.abs(s.x - x) < GLOW_EAR_TREE_MIN_GAP)
}
//
// The bounce-chain eyes and the prize eye are placed after the ear-trees
// without checking them, so the trees have to keep off those fixed spots.
//
function glowEarTreeXOnFixedStalkEye(x, trampX) {
  if (trampX == null) return false
  const layout = glowChainTrampLayout(trampX)
  const eyeXs = [layout.firstX, layout.secondX, glowPrizeEyeX(trampX)]
  return eyeXs.some(eyeX => Math.abs(x - eyeX) < GLOW_EAR_TREE_STALK_EYE_CLEAR_HALF)
}
function tryAddGlowEarTreeSpot(spots, x, branchTrampX, trampX, shoreTrunkX, heightTier) {
  if (!glowEarTreeSpotXAllowed(spots, x, branchTrampX, trampX, shoreTrunkX)) return false
  spots.push(buildGlowEarTreeSpot(x, heightTier))
  return true
}
function buildGlowEarTreeSpots(layoutCfg) {
  const branchTrampX = layoutCfg?.branchTrampX ??
    TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X
  const trampX = layoutCfg?.trampX ?? null
  const shoreTrunkX = glowShoreTreeTrunkXFromTramp(trampX)
  const mud = computeGlowMudZoneX()
  const cave = getCrackZone(WORLD_W, FLOOR_Y)
  //
  // The branch (left) mushroom trampoline sits at TREE_X + a modest offset —
  // well inside the right-side placement range below — and its own footprint
  // was never excluded, so a spot could land right on top of it: the
  // mushroom's cap/stem then visually covers the tree's thin trunk column
  // while its wider branches remain visible above, reading as "no trunk".
  //
  const rightXMin = mud.x2 + GLOW_EAR_TREE_MUD_RIGHT_GAP
  const rightXMax = cave.x1 - GLOW_CAVE_DECOR_CLEAR - GLOW_EAR_TREE_RIGHT_CAVE_MARGIN
  const rightHeightTiers = ['short', 'tall']
  const minSpan = GLOW_EAR_TREE_MIN_GAP * (GLOW_EAR_TREE_RIGHT_COUNT - 1) + 48
  const spots = []
  let attempts = 0
  while (spots.length < GLOW_EAR_TREE_RIGHT_COUNT && attempts < 80) {
    attempts += 1
    if (rightXMax <= rightXMin + minSpan) break
    const x = rightXMin + Math.random() * (rightXMax - rightXMin)
    tryAddGlowEarTreeSpot(spots, x, branchTrampX, trampX, shoreTrunkX, rightHeightTiers[spots.length])
  }
  //
  // The free windows between the shore tree, stalk-eyes and the mushroom are
  // only a few dozen px wide — random picks often miss them, so scan for
  // every allowed X and fill the remaining trees from those.
  //
  while (spots.length < GLOW_EAR_TREE_COUNT) {
    const free = []
    for (let x = rightXMin; x <= rightXMax; x += GLOW_EAR_TREE_SCAN_STEP) {
      glowEarTreeSpotXAllowed(spots, x, branchTrampX, trampX, shoreTrunkX) && free.push(x)
    }
    if (!free.length) break
    const x = free[Math.floor(Math.random() * free.length)]
    tryAddGlowEarTreeSpot(spots, x, branchTrampX, trampX, shoreTrunkX, rightHeightTiers[spots.length % rightHeightTiers.length])
  }
  spots.sort((a, b) => a.x - b.x)
  return spots
}
//
// Shared per-spot randomized trunk/branch variation.
//
function buildGlowEarTreeSpot(x, heightTier) {
  const trunkScale = heightTier === 'short'
    ? 0.8 + Math.random() * 0.12
    : heightTier === 'tall'
      ? 1.1 + Math.random() * 0.2
      : 0.92 + Math.random() * 0.28
  return {
    x,
    groundY: FLOOR_Y,
    trunkScale,
    trunkWScale: 0.85 + Math.random() * 0.35,
    branchScale: 0.9 + Math.random() * 0.25,
    branchCount: 4 + Math.floor(Math.random() * 2),
    seed: Math.random() * Math.PI * 2
  }
}
//
// Whisper volume from hero distance to the eye-flower head (2D, so the tree
// branch above the lake counts as well).
//
function resetGlowPlantWhisperProximityState(inst) {
  if (!inst.plantWhisperProximityState) return
  inst.plantWhisperProximityState.last = 0
  inst.plantWhisperProximityState.wasReceding = false
}
function fadeOutGlowPlantWhisper(inst) {
  Sound.setEarTreeWhisperVolume(0)
  resetGlowPlantWhisperProximityState(inst)
}
function updateGlowPlantWhisperSound(inst, char) {
  if (!char?.pos || inst.drowning) {
    fadeOutGlowPlantWhisper(inst)
    return
  }
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (isHeroInsideGlowPitCave(inst, char.pos.x, char.pos.y, footY)) {
    fadeOutGlowPlantWhisper(inst)
    return
  }
  const proximity = EyeFlower.whisperProximity(inst.eyeFlower, char.pos.x, char.pos.y)
  const whisperMax = CFG.audio.backgroundMusic.whisper ?? GLOW_PLANT_WHISPER_MAX_VOLUME
  const vol = whisperMax * proximity
  if (vol <= 0.001) {
    fadeOutGlowPlantWhisper(inst)
    return
  }
  inst.sound && Sound.resumeAudioContext(inst.sound)
  inst.plantWhisperProximityState ??= { last: proximity, wasReceding: false }
  const proxState = inst.plantWhisperProximityState
  const approaching = proximity > proxState.last + GLOW_PLANT_WHISPER_PROX_DELTA
  const receding = proximity < proxState.last - GLOW_PLANT_WHISPER_PROX_DELTA
  receding && (proxState.wasReceding = true)
  if (approaching && proxState.wasReceding) {
    Sound.rewindEarTreeWhisperToStart()
    proxState.wasReceding = false
  }
  proxState.last = proximity
  Sound.setEarTreeWhisperVolume(Math.min(1, vol))
}
//
// Plays ground/wood land SFX a few pixels before isGrounded flips — Kaplay
// collision often lags the visible foot plant by a frame.
//
function maybePlayGlowEarlyLandSfx(inst, char, hero, footY, grounded) {
  if (inst.sound?._glowSfxMuted) return
  if (grounded) {
    inst._glowEarlyLandSfxDone = false
    return
  }
  if (inst._glowEarlyLandSfxDone) return
  const vy = char.vel?.y ?? 0
  if (vy < 52 || !hero.wasJumping || (hero.landFxCooldown ?? 0) > 0) return
  const onBranch = isHeroOnStartBranch(inst, char)
  const overWood = isOverGlowWoodSurface(inst, char.pos.x, footY)
  if (onBranch && overWood) {
    inst._glowEarlyLandSfxDone = true
    hero.landFxCooldown = 0.2
    inst.sound._glowSurface = 'wood'
    Sound.playLandSound(inst.sound, 'lesson-glow.0')
    inst.expectBranchWoodLandSound = false
    return
  }
  const nearGround = footY >= FLOOR_Y - GLOW_EARLY_LAND_FOOT_ABOVE && footY <= FLOOR_Y + 8
  if (!onBranch && nearGround && !isInWaterZone(inst, char.pos.x, footY)) {
    inst._glowEarlyLandSfxDone = true
    hero.landFxCooldown = 0.2
    Sound.playStepSound(inst.sound, 'lesson-glow.0')
  }
}
//
// Mud zone's X bounds — pure function of TREE_X and fixed offsets, so it can
// be computed this early (before the scene layout that normally derives it).
//
function computeGlowMudZoneX() {
  const branchTrampX = TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X
  const mudPredatorAmbushTriggerX = branchTrampX + MUD_ZONE_BRANCH_TRIGGER_GAP
  const mudPredatorPopX = mudPredatorAmbushTriggerX + MUD_ZONE_PREDATOR_POP_LEAD
  return {
    x1: branchTrampX + TRAMP_GRASS_CLEAR_HALF + MUD_BRANCH_TRAMP_GAP,
    x2: mudPredatorPopX + MUD_ZONE_RIGHT_EXTENT
  }
}
//
// Generates the random layout of all underground features once, so both
// colour variants can be rendered from identical geometry.
//
function buildUndergroundSpec() {
  const areaX1 = LEFT_MARGIN + 40
  const areaX2 = WORLD_W - RIGHT_MARGIN - 40
  const areaY1 = FLOOR_Y + UG_TOP_PAD
  const areaY2 = PLAYFIELD_EARTH_BOTTOM_Y - UG_BOTTOM_PAD
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
  // One fossil spiral — a small ammonite curled among the stones.
  //
  const fossils = []
  for (let i = 0; i < UG_FOSSIL_COUNT; i++) fossils.push({ x: randX(), y: randY(), r: 7 + Math.random() * 7 })
  //
  // Boulder piles sit on the band floor; grit specks are spread everywhere.
  //
  const deepY1 = FLOOR_Y + CAVE_BAND_H * UG_BOULDER_DEEP_FRAC
  const placedStones = []
  const boulderPiles = [
    buildUndergroundStoneGroup(areaX1 + UG_BOULDER_PILE_EDGE_INSET, deepY1, areaY2, true, placedStones),
    buildUndergroundStoneGroup(areaX2 - UG_BOULDER_PILE_EDGE_INSET, deepY1, areaY2, true, placedStones)
  ]
  for (let i = 0; i < UG_BOULDER_PILE_COUNT; i++) {
    boulderPiles.push(buildUndergroundStoneGroup(randX(), deepY1, areaY2, false, placedStones))
  }
  boulderPiles.push(buildUndergroundScatteredStones(randX, deepY1, areaY2, placedStones))
  const grit = []
  for (let i = 0; i < UG_GRIT_COUNT; i++) {
    grit.push({ x: randX(), y: randY(), px: UG_GRIT_PX_MIN + Math.floor(Math.random() * UG_GRIT_PX_RANGE), light: Math.random() < 0.5 })
  }
  const streaks = []
  for (let i = 0; i < UG_STREAK_COUNT; i++) {
    streaks.push({ x: randX(), y: randY(), len: UG_STREAK_LEN_MIN + Math.random() * UG_STREAK_LEN_RANGE, tilt: (Math.random() - 0.5) * 0.06 })
  }
  const pockets = []
  for (let i = 0; i < UG_POCKET_COUNT; i++) {
    const r = UG_POCKET_R_MIN + Math.random() * UG_POCKET_R_RANGE
    pockets.push({ x: randX(), y: randY(), rx: r * (1.2 + Math.random() * 0.6), ry: r })
  }
  const warmPebbles = []
  const topsoilY2 = FLOOR_Y + CAVE_BAND_H * UG_WARM_PEBBLE_TOP_FRAC
  for (let i = 0; i < UG_WARM_PEBBLE_COUNT; i++) {
    const y = Math.random() < 0.75 ? areaY1 + Math.random() * (topsoilY2 - areaY1) : randY()
    warmPebbles.push({ x: randX(), y, r: UG_WARM_PEBBLE_R_MIN + Math.random() * UG_WARM_PEBBLE_R_RANGE })
  }
  //
  // Shells, bones, coins, bottles, worms — simple silhouettes for humour.
  //
  const shells = []
  for (let i = 0; i < UG_SHELL_COUNT; i++) {
    shells.push({
      x: randX(),
      y: randY(),
      w: 10 + Math.random() * 8,
      h: 7 + Math.random() * 5,
      flip: Math.random() < 0.5
    })
  }
  const bones = []
  for (let i = 0; i < UG_BONE_COUNT; i++) {
    const x = randX()
    const y = randY()
    const angle = (Math.random() - 0.5) * 0.8
    bones.push({ x, y, angle, len: 18 + Math.random() * 14 })
  }
  const coins = []
  for (let i = 0; i < UG_COIN_COUNT; i++) {
    coins.push({ x: randX(), y: randY(), r: 3 + Math.random() * 2 })
  }
  const bottles = []
  for (let i = 0; i < UG_BOTTLE_COUNT; i++) {
    bottles.push({ x: randX(), y: randY(), h: 14 + Math.random() * 6, tilt: (Math.random() - 0.5) * 0.5 })
  }
  const worms = []
  for (let i = 0; i < UG_WORM_COUNT; i++) {
    const x = randX()
    const y = randY()
    const pts = [{ x, y }]
    for (let s = 0; s < 4; s++) {
      const last = pts[pts.length - 1]
      pts.push({ x: last.x + 6 + Math.random() * 8, y: last.y + (Math.random() - 0.5) * 6 })
    }
    worms.push(pts)
  }
  //
  // Guaranteed extra rocks/roots/shells inside the mud zone — see
  // UG_MUD_ZONE_EXTRA_* above.
  //
  const mudZone = computeGlowMudZoneX()
  const randMudX = () => mudZone.x1 + Math.random() * (mudZone.x2 - mudZone.x1)
  for (let i = 0; i < UG_MUD_ZONE_EXTRA_ROCK_COUNT; i++) {
    const radius = 10 + Math.random() * 16
    rocks.push({ x: randMudX(), y: randY(), radius, verts: buildRockVertices(radius) })
  }
  for (let i = 0; i < UG_MUD_ZONE_EXTRA_ROOTLET_COUNT; i++) {
    const rx = randMudX()
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
  for (let i = 0; i < UG_MUD_ZONE_EXTRA_SHELL_COUNT; i++) {
    shells.push({
      x: randMudX(),
      y: randY(),
      w: 10 + Math.random() * 8,
      h: 7 + Math.random() * 5,
      flip: Math.random() < 0.5
    })
  }
  const mudPebbleStones = []
  const mudPebbleCx = randMudX()
  const mudPebbleCy = randY()
  for (let s = 0; s < 4; s++) {
    mudPebbleStones.push({
      x: mudPebbleCx + (Math.random() - 0.5) * 26,
      y: mudPebbleCy + (Math.random() - 0.5) * 14,
      r: 2 + Math.random() * 3
    })
  }
  pebbles.push(mudPebbleStones)
  return {
    rocks, cracks, pebbles, rootlets, fossils, boulderPiles, grit, streaks, pockets, warmPebbles,
    shells, bones, coins, bottles, worms, skeleton: null
  }
}
//
// One loose group of slate stones in the deep clay — spaced apart (only a
// slight touch between neighbours), denser toward the group centre.
//
function buildUndergroundStoneGroup(cx, y1, y2, edgeGroup, placed) {
  const countMin = edgeGroup ? UG_BOULDER_EDGE_PILE_STONES_MIN : UG_BOULDER_PILE_STONES_MIN
  const countRange = edgeGroup ? UG_BOULDER_EDGE_PILE_STONES_RANGE : UG_BOULDER_PILE_STONES_RANGE
  const count = countMin + Math.floor(Math.random() * countRange)
  const stones = []
  for (let s = 0; s < count; s++) {
    const u = (Math.random() + Math.random()) * 0.5 - 0.5
    const stone = placeUndergroundStone(cx + u * UG_BOULDER_PILE_SPREAD, y1, y2, placed)
    stone && stones.push(stone)
  }
  return stones
}
//
// Single stones spread along the deep layer between the groups.
//
function buildUndergroundScatteredStones(randX, y1, y2, placed) {
  const stones = []
  for (let s = 0; s < UG_BOULDER_SCATTER_COUNT; s++) {
    const stone = placeUndergroundStone(randX(), y1, y2, placed)
    stone && stones.push(stone)
  }
  return stones
}
//
// Tries a few jittered spots around x until one does not overlap earlier stones.
//
function placeUndergroundStone(x, y1, y2, placed) {
  const r = UG_BOULDER_R_MIN + Math.random() * UG_BOULDER_R_RANGE
  for (let attempt = 0; attempt < UG_BOULDER_PLACE_ATTEMPTS; attempt++) {
    const sx = x + (Math.random() - 0.5) * r * 2 * attempt
    const sy = y1 + r + Math.random() * Math.max(1, y2 - y1 - r * 2)
    const clear = placed.every(o => Math.hypot(o.x - sx, o.y - sy) >= (o.r + r) * UG_BOULDER_MIN_GAP_MULT)
    if (!clear) continue
    const stone = buildUndergroundStoneShape(sx, sy, r)
    placed.push(stone)
    return stone
  }
  return null
}
//
// Lumpy rounded outline (lobe radii vary) plus speckle positions on the face.
//
function buildUndergroundStoneShape(x, y, r) {
  const lobes = UG_BOULDER_LOBES_MIN + Math.floor(Math.random() * UG_BOULDER_LOBES_RANGE)
  const squash = UG_BOULDER_SQUASH_MIN + Math.random() * UG_BOULDER_SQUASH_RANGE
  const phase = Math.random() * Math.PI * 2
  const verts = []
  for (let i = 0; i < lobes; i++) {
    const angle = phase + (i + (Math.random() - 0.5) * 0.5) / lobes * Math.PI * 2
    const lr = UG_BOULDER_LOBE_R_MIN + Math.random() * UG_BOULDER_LOBE_R_RANGE
    verts.push({ x: Math.cos(angle) * lr, y: Math.sin(angle) * lr * squash })
  }
  const speckles = []
  const speckleCount = UG_BOULDER_SPECKLES_MIN + Math.floor(Math.random() * UG_BOULDER_SPECKLES_RANGE)
  for (let i = 0; i < speckleCount; i++) {
    const a = Math.random() * Math.PI * 2
    const d = Math.sqrt(Math.random()) * 0.6
    speckles.push({
      x: Math.cos(a) * d,
      y: Math.sin(a) * d * squash,
      r: UG_BOULDER_SPECKLE_R_MIN + Math.random() * UG_BOULDER_SPECKLE_R_RANGE
    })
  }
  return { x, y, r, verts, speckles }
}
//
// Renders the shared underground layout with one mode's tones.
//
function renderUndergroundSpec(ctx, spec, tones) {
  const fillCss = `rgb(${tones.fill.r}, ${tones.fill.g}, ${tones.fill.b})`
  const deepCss = `rgb(${tones.deep.r}, ${tones.deep.g}, ${tones.deep.b})`
  const lightCss = `rgb(${tones.light.r}, ${tones.light.g}, ${tones.light.b})`
  tones.stone && paintUndergroundSediment(ctx, spec, tones, deepCss)
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
  const strokeCss = tones.monoStrokes ? fillCss : deepCss
  ctx.strokeStyle = strokeCss
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
  ctx.strokeStyle = strokeCss
  ctx.globalAlpha = 0.6
  ctx.lineWidth = 1.6
  const cave = getCrackZone(WORLD_W, FLOOR_Y)
  spec.rootlets.forEach(pts => {
    const rx = pts[0]?.x ?? 0
    if (rx < TREE_X - TRUNK_EXCLUDE_HALF) return
    //
    // No hanging hair-roots over the cave mouth / pit back wall — they read
    // as stray sticks on the interior void edge.
    //
    if (rx >= cave.x1 - 32 && rx <= cave.x2 + 48) return
    strokePolyline(ctx, pts)
  })
  ctx.globalAlpha = 1
  //
  // Fossil spiral — a small two-turn ammonite drawn in the light tone.
  //
  ctx.strokeStyle = lightCss
  ctx.globalAlpha = 0.75
  ctx.lineWidth = 1.5
  spec.fossils?.forEach(fossil => strokeUndergroundFossil(ctx, fossil))
  ctx.globalAlpha = 1
  tones.stone && paintUndergroundBoulderPiles(ctx, spec.boulderPiles, tones)
  tones.grit && paintUndergroundGrit(ctx, spec.grit, tones, deepCss)
  tones.pebble && paintUndergroundWarmPebbles(ctx, spec.warmPebbles, tones)
  //
  // Buried shells — half-ovals with a split line.
  //
  spec.shells?.forEach(shell => {
    ctx.save()
    ctx.translate(shell.x, shell.y)
    shell.flip && ctx.scale(-1, 1)
    ctx.fillStyle = lightCss
    ctx.globalAlpha = 0.8
    ctx.beginPath()
    ctx.ellipse(0, 0, shell.w * 0.5, shell.h * 0.45, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.strokeStyle = deepCss
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(-shell.w * 0.35, 0)
    ctx.lineTo(shell.w * 0.35, 0)
    ctx.stroke()
    ctx.restore()
  })
  ctx.globalAlpha = 1
  //
  // Bones — two short segments with knobs.
  //
  spec.bones?.forEach(bone => {
    ctx.save()
    ctx.translate(bone.x, bone.y)
    ctx.rotate(bone.angle)
    ctx.strokeStyle = lightCss
    ctx.lineWidth = UG_BONE_SHAFT_PX
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.moveTo(-bone.len * 0.5, 0)
    ctx.lineTo(bone.len * 0.5, 0)
    ctx.stroke()
    ctx.fillStyle = lightCss
    for (const end of [-0.5, 0.5]) {
      for (const side of [-1, 1]) {
        ctx.beginPath()
        ctx.arc(bone.len * end, side * UG_BONE_KNOB_SPLIT, UG_BONE_KNOB_R, 0, Math.PI * 2)
        ctx.fill()
      }
    }
    ctx.restore()
  })
  ctx.globalAlpha = 1
  //
  // Coins — tiny buried discs.
  //
  ctx.fillStyle = lightCss
  spec.coins?.forEach(coin => {
    ctx.globalAlpha = 0.75
    ctx.beginPath()
    ctx.arc(coin.x, coin.y, coin.r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
  //
  // Bottles — stuck at an angle (message in a bottle vibes).
  //
  spec.bottles?.forEach(bottle => {
    ctx.save()
    ctx.translate(bottle.x, bottle.y)
    ctx.rotate(bottle.tilt)
    ctx.fillStyle = lightCss
    ctx.globalAlpha = 0.7
    ctx.fillRect(-3, -bottle.h * 0.5, 6, bottle.h * 0.65)
    ctx.fillRect(-2, -bottle.h * 0.5 - 4, 4, 4)
    ctx.restore()
  })
  ctx.globalAlpha = 1
  //
  // Worms — wavy polylines.
  //
  ctx.strokeStyle = deepCss
  ctx.lineWidth = 1.4
  ctx.lineCap = 'round'
  spec.worms?.forEach(pts => {
    ctx.globalAlpha = 0.65
    strokePolyline(ctx, pts)
  })
  ctx.globalAlpha = 1
}
//
// Two-turn ammonite spiral in the current stroke style.
//
function strokeUndergroundFossil(ctx, fossil) {
  const turns = 2
  const steps = 40
  ctx.beginPath()
  for (let s = 0; s <= steps; s++) {
    const t = s / steps
    const angle = t * turns * Math.PI * 2
    const px = fossil.x + Math.cos(angle) * fossil.r * t
    const py = fossil.y + Math.sin(angle) * fossil.r * t
    s === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.stroke()
}
//
// Sediment streaks along the strata and dark voids with a lit lower lip,
// painted first so every other buried feature sits on top of them.
//
function paintUndergroundSediment(ctx, spec, tones, deepCss) {
  const lipCss = `rgb(${tones.grit.r}, ${tones.grit.g}, ${tones.grit.b})`
  const voidCss = `rgb(${tones.contour.r}, ${tones.contour.g}, ${tones.contour.b})`
  ctx.strokeStyle = deepCss
  ctx.lineWidth = UG_STREAK_PX
  ctx.lineCap = 'round'
  ctx.globalAlpha = UG_STREAK_ALPHA
  spec.streaks?.forEach(streak => {
    ctx.beginPath()
    ctx.moveTo(streak.x, streak.y)
    ctx.quadraticCurveTo(streak.x + streak.len * 0.5, streak.y - 2, streak.x + streak.len, streak.y + streak.len * streak.tilt)
    ctx.stroke()
  })
  spec.pockets?.forEach(pocket => {
    ctx.globalAlpha = UG_POCKET_LIP_ALPHA
    ctx.fillStyle = lipCss
    ctx.beginPath()
    ctx.ellipse(pocket.x, pocket.y + 1.5, pocket.rx, pocket.ry, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.globalAlpha = UG_POCKET_VOID_ALPHA
    ctx.fillStyle = voidCss
    ctx.beginPath()
    ctx.ellipse(pocket.x, pocket.y, pocket.rx, pocket.ry, 0, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.globalAlpha = 1
}
//
// Small warm pebbles, mostly in the topsoil.
//
function paintUndergroundWarmPebbles(ctx, pebbles, tones) {
  ctx.fillStyle = `rgb(${tones.pebble.r}, ${tones.pebble.g}, ${tones.pebble.b})`
  pebbles?.forEach(p => {
    ctx.beginPath()
    ctx.ellipse(p.x, p.y, p.r * 1.25, p.r, 0, 0, Math.PI * 2)
    ctx.fill()
  })
}
//
// Dark slate stones in the deep clay: contour, body, soft lit cap, speckles.
//
function paintUndergroundBoulderPiles(ctx, piles, tones) {
  const stoneCss = `rgb(${tones.stone.r}, ${tones.stone.g}, ${tones.stone.b})`
  const lightCss = `rgb(${tones.stoneLight.r}, ${tones.stoneLight.g}, ${tones.stoneLight.b})`
  const contourCss = `rgb(${tones.contour.r}, ${tones.contour.g}, ${tones.contour.b})`
  piles?.forEach(stones => stones.forEach(stone => paintUndergroundStone(ctx, stone, stoneCss, lightCss, contourCss)))
}
function paintUndergroundStone(ctx, stone, stoneCss, lightCss, contourCss) {
  ctx.fillStyle = contourCss
  traceUndergroundStonePath(ctx, stone, stone.x, stone.y, stone.r + UG_BOULDER_OUTLINE_PX)
  ctx.fill()
  ctx.fillStyle = stoneCss
  traceUndergroundStonePath(ctx, stone, stone.x, stone.y, stone.r)
  ctx.fill()
  ctx.save()
  ctx.clip()
  ctx.globalAlpha = UG_BOULDER_CAP_ALPHA
  ctx.fillStyle = lightCss
  const capR = stone.r * UG_BOULDER_CAP_SCALE
  const capShift = stone.r * UG_BOULDER_CAP_OFFSET
  traceUndergroundStonePath(ctx, stone, stone.x - capShift, stone.y - capShift, capR)
  ctx.fill()
  ctx.globalAlpha = UG_BOULDER_SPECKLE_ALPHA
  stone.speckles.forEach(sp => {
    ctx.beginPath()
    ctx.arc(stone.x + sp.x * stone.r, stone.y + sp.y * stone.r, sp.r, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.restore()
}
//
// Closed lumpy outline: quadratic curves through lobe midpoints keep it rounded.
//
function traceUndergroundStonePath(ctx, stone, cx, cy, r) {
  const verts = stone.verts
  const n = verts.length
  const first = verts[0]
  const last = verts[n - 1]
  ctx.beginPath()
  ctx.moveTo(cx + (last.x + first.x) * 0.5 * r, cy + (last.y + first.y) * 0.5 * r)
  for (let i = 0; i < n; i++) {
    const v = verts[i]
    const next = verts[(i + 1) % n]
    ctx.quadraticCurveTo(cx + v.x * r, cy + v.y * r, cx + (v.x + next.x) * 0.5 * r, cy + (v.y + next.y) * 0.5 * r)
  }
  ctx.closePath()
}
//
// Fine soil grit: half light specks, half dark, so the earth reads textured.
//
function paintUndergroundGrit(ctx, grit, tones, deepCss) {
  const gritCss = `rgb(${tones.grit.r}, ${tones.grit.g}, ${tones.grit.b})`
  ctx.globalAlpha = UG_GRIT_ALPHA
  grit?.forEach(g => {
    ctx.fillStyle = g.light ? gritCss : deepCss
    ctx.fillRect(Math.round(g.x), Math.round(g.y), g.px, g.px)
  })
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
  const floorEndX = getGlowCaveMouthFloorLeftX(crack)
  const floorW = Math.max(40, floorEndX - LEFT_MARGIN)
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
// Rounded corners — one baked mask sprite per corner, rotated like lesson-time.2.
//
function createRoundedCorners(k) {
  loadPlayfieldCornerSprites(k)
  const spriteName = CORNER_SPRITE_OUTER
  const TOP_CORNER_Z = CFG.visual.zIndex.ui + 30
  const { topY, bottomY, leftX, rightX } = playfieldCornerPositions()
  const corners = [
    k.add([k.sprite(spriteName), k.pos(leftX, topY), k.anchor('topleft'), k.z(TOP_CORNER_Z), { fixed: true }]),
    k.add([k.sprite(spriteName), k.pos(rightX, topY), k.rotate(90), k.anchor('topleft'), k.z(TOP_CORNER_Z), { fixed: true }]),
    k.add([k.sprite(spriteName), k.pos(leftX, bottomY), k.rotate(270), k.anchor('topleft'), k.z(PLAYFIELD_BOTTOM_CORNER_Z), { fixed: true }]),
    k.add([k.sprite(spriteName), k.pos(rightX, bottomY), k.rotate(180), k.anchor('topleft'), k.z(PLAYFIELD_BOTTOM_CORNER_Z), { fixed: true }])
  ]
  glowPlayfieldCornerObjs = corners
  updatePlayfieldCornerPositions()
}
//
// Screen-space anchor for each playfield corner mask (matches time lesson2 layout).
//
function playfieldCornerPositions() {
  const topY = PLAYFIELD_TOP_Y + TOP_MARGIN - CORNER_RADIUS
  const bottomY = PLAYFIELD_BOTTOM_Y + CORNER_RADIUS
  const leftX = LEFT_MARGIN - CORNER_RADIUS
  const rightX = SCREEN_W - RIGHT_MARGIN + CORNER_RADIUS
  return { topY, bottomY, leftX, rightX }
}
//
// Repositions all four rounded-corner masks after a native-resolution relayout.
//
function updatePlayfieldCornerPositions() {
  if (!glowPlayfieldCornerObjs?.length || glowPlayfieldCornerObjs.length < 4) return
  const { topY, bottomY, leftX, rightX } = playfieldCornerPositions()
  glowPlayfieldCornerObjs[0].pos.x = leftX
  glowPlayfieldCornerObjs[0].pos.y = topY
  glowPlayfieldCornerObjs[1].pos.x = rightX
  glowPlayfieldCornerObjs[1].pos.y = topY
  glowPlayfieldCornerObjs[2].pos.x = leftX
  glowPlayfieldCornerObjs[2].pos.y = bottomY
  glowPlayfieldCornerObjs[3].pos.x = rightX
  glowPlayfieldCornerObjs[3].pos.y = bottomY
}
//
// Bakes the outer-frame corner mask (inner quarter-circle cut) once per
// scene entry.
//
function loadPlayfieldCornerSprites(k) {
  const outerCanvas = makeRoundedCornerCanvas(CORNER_RADIUS, OUTER_BG_HEX)
  k.loadSprite(CORNER_SPRITE_OUTER, outerCanvas)
  outerCanvas.width = 0
  outerCanvas.height = 0
}
//
// Quarter-circle cut-out corner canvas — same geometry as time lesson2.
//
function makeRoundedCornerCanvas(radius, colorHex) {
  const rgb = glowRgb(colorHex)
  const size = radius * 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.fillRect(0, 0, size, size)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.beginPath()
  ctx.moveTo(size, size)
  ctx.arc(size, size, radius, Math.PI, Math.PI * 1.5, false)
  ctx.closePath()
  ctx.fill()
  return canvas
}
//
// Draws one rotated corner mask in fixed screen space.
//
function drawPlayfieldCornerMask(k, x, y, angleDeg) {
  const size = CORNER_RADIUS * 2
  k.drawSprite({
    sprite: CORNER_SPRITE_OUTER,
    pos: k.vec2(x, y),
    anchor: 'topleft',
    angle: angleDeg,
    width: size,
    height: size,
    fixed: true
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
// Log wood tones matching the main colour tree.
//
function glowLogColors() {
  return LOG_TREE_COLOR_COLORS
}
//
// Swaying grass — the shared Grass component, excluding water, trunk, the
// trampoline mushroom band and every ear-tree's trunk footprint (so no blade
// ever covers its face). The tint callback also hides blades of unexplored
// ground sides.
//
function createGlowGrass(k, waterX1, waterX2, trampX, branchTrampX, zones, mudZoneX1, mudZoneX2, earTreeSpots) {
  const trunkL = TREE_X - TRUNK_EXCLUDE_HALF
  const trunkR = TREE_X + TRUNK_EXCLUDE_HALF
  const trampL = trampX - TRAMP_GRASS_CLEAR_HALF
  const trampR = trampX + TRAMP_GRASS_CLEAR_HALF
  const branchL = branchTrampX - TRAMP_GRASS_CLEAR_HALF
  const branchR = branchTrampX + TRAMP_GRASS_CLEAR_HALF
  const earTreeExcluded = (x) => (earTreeSpots ?? []).some(spot =>
    x >= spot.x - EAR_TREE_TRUNK_GRASS_CLEAR_HALF && x <= spot.x + EAR_TREE_TRUNK_GRASS_CLEAR_HALF)
  const mudApproachGrassOff = GLOW_DEBUG_HIDE_GRASS_BEFORE_MUD &&
    mudZoneX1 != null && mudZoneX2 != null
  const excluded = (x) => (x >= waterX1 && x <= waterX2) ||
    (x >= trunkL && x <= trunkR) ||
    (x >= trampL && x <= trampR) ||
    (x >= branchL && x <= branchR) ||
    earTreeExcluded(x) ||
    isCrackGrassExcluded(x, WORLD_W) ||
    (mudApproachGrassOff && x >= branchR && x <= mudZoneX2)
  const grass = Grass.create({
    k,
    floorY: FLOOR_Y,
    left: LEFT_MARGIN + 20,
    right: WORLD_W - RIGHT_MARGIN - 20,
    tuftCount: GRASS_TUFT_COUNT,
    z: GRASS_Z,
    excluded,
    //
    // Bigger blades over the mud zone — the predator hides there
    // and should stay hard to spot through the grass.
    //
    getScaleMult: (x) => {
      if (GLOW_DEBUG_HIDE_GRASS_BEFORE_MUD) return 1
      if (mudZoneX1 != null && mudZoneX2 != null && x >= mudZoneX1 && x <= mudZoneX2) {
        return MUD_ZONE_GRASS_SCALE_MULT
      }
      if (mudZoneX1 != null && x >= branchR && x < mudZoneX1) {
        return MUD_APPROACH_GRASS_SCALE_MULT
      }
      return 1
    },
    postBakeCanvas: applyGlowGameplaySharpBake,
    getTint: (blade) => glowGrassTint(zones, blade),
    roots: true,
    getRootColor: glowGrassRootColor,
    getRootVisible: (worldX) => glowGrassRootVisible(zones, worldX),
    hueVaryMax: GLOW_GRASS_HUE_VARY_MAX,
    hueVarySkew: GLOW_GRASS_HUE_VARY_SKEW
  })
  grass.layer.hidden = true
  return grass
}
//
// Extra tuft density just for the mud band — the main field's tuftCount is
// spread across the whole ground strip, so only a handful naturally land in
// the (much narrower) mud zone. This overlay adds more blades on top of it,
// same tint/sway as the main field's own mud-zone blades.
//
function createGlowMudExtraGrass(k, zones, mudZoneX1, mudZoneX2) {
  const grass = Grass.create({
    k,
    floorY: FLOOR_Y,
    left: mudZoneX1,
    right: mudZoneX2,
    tuftCount: MUD_ZONE_EXTRA_GRASS_TUFT_COUNT,
    z: GRASS_Z,
    getScaleMult: () => MUD_ZONE_GRASS_SCALE_MULT,
    postBakeCanvas: applyGlowGameplaySharpBake,
    getTint: (blade) => glowMudZoneGrassTint(zones._sceneRef, blade),
    roots: true,
    getRootColor: glowGrassRootColor,
    getRootVisible: (worldX) => glowGrassRootVisible(zones, worldX),
    hueVaryMax: GLOW_GRASS_HUE_VARY_MAX,
    hueVarySkew: GLOW_GRASS_HUE_VARY_SKEW
  })
  grass.layer.hidden = true
  return grass
}
//
// Grass tint for the mud band only — darker green over the soft mud.
//
function glowMudZoneGrassTint(sc, blade) {
  if (!sc?.zones.predatorAwake || !isGlowDecorWorldXInMudZone(sc, blade.x)) return null
  sc._grassMudColorSettled ??= lerpRgb(GRASS_GREEN, GLOW_SHADOW, MUD_ZONE_GRASS_GREEN_VOID_LERP)
  return sc._grassMudColorSettled
}
//
// Grass tint for the wider ground-peek band (mud zone through the cave
// mouth) — warm straw, without the taller mud-specific blade scale.
//
function glowGroundPeekGrassTint(sc, blade) {
  if (!isGlowWorldXInGroundPeekZone(sc, blade.x)) return null
  return GRASS_WARM
}
//
// Short static root ticks under ground grass tufts — same tone as the mud.
//
function glowGrassRootColor() {
  return MUD_GROUND_RGB
}
//
// Grass roots stay visible for every explored ground strip — unlike blades,
// they must not fade with glowRightWorldOpacity while the hero walks in.
//
function glowGrassRootVisible(zones, worldX) {
  const sc = zones._sceneRef
  if (!sc) return false
  const lakeX1 = zones._lakeX1
  const lakeX2 = zones._lakeX2
  if (lakeX1 != null && lakeX2 != null && worldX >= lakeX1 && worldX <= lakeX2) return false
  if (isGlowOpenPitMouthWorldX(sc.pit, worldX)) return false
  if (isGlowDecorWorldXInMudZone(sc, worldX)) return zones.predatorAwake
  if (isGlowWorldXInGroundPeekZone(sc, worldX)) return true
  const side = worldX >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
  if (side === 'left') return zones.groundDecorLeft
  return (zones.groundRightStripMax ?? -1) >= 0
}
//
// Resolves the tint of one grass blade for the current frame: null while the
// blade's ground side is unexplored or off camera, otherwise grass green.
//
function glowGrassTint(zones, blade) {
  const sc = zones._sceneRef
  if (!sc) return null
  const lakeX1 = zones._lakeX1
  const lakeX2 = zones._lakeX2
  if (lakeX1 != null && lakeX2 != null && blade.x >= lakeX1 && blade.x <= lakeX2) {
    return null
  }
  if (isGlowOpenPitMouthWorldX(sc.pit, blade.x)) return null
  const mudTint = glowMudZoneGrassTint(sc, blade)
  if (mudTint) return mudTint
  const peekTint = glowGroundPeekGrassTint(sc, blade)
  if (peekTint) return peekTint
  if (sc.k) {
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
  if (zones.groundDecorRight) return GRASS_GREEN
  const side = blade.x >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
  if (side === 'left') {
    if (!zones.groundDecorLeft) return null
    const leftFade = sc.leftDecorFade ?? 1
    if (leftFade < 0.04) return null
    return leftFade >= 1 ? GRASS_GREEN : { ...GRASS_GREEN, opacity: leftFade }
  }
  const strip = groundRightStripIndexForX(blade.x, GROUND_REVEAL_TREE_PAST_X, zones._groundStripEndX ?? WORLD_W)
  const op = glowRightWorldOpacity(sc, blade.x, strip >= 3 ? 'small' : 'large')
  if (op < 0.04) return null
  return op >= 1 ? GRASS_GREEN : { ...GRASS_GREEN, opacity: op }
}
//
// Rocks — flat value 5 silhouettes.
//
function createGlowRocks(k, treeBaseLeftX, waterRightX, rightPlatX, trampX, branchTrampX, zones, decorAtlas, eastGroundRockMinX) {
  const objs = []
  const clusterCenterX = treeBaseLeftX + 40
  for (let i = 0; i < 10; i++) {
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
  // Right side — a few small clusters spread across the whole lower-right
  // ground (same jittered-around-a-center technique as the left 6-rock
  // cluster above, just smaller groups), never in front of the trampoline
  // mushroom (resampled out of its zone).
  //
  //
  // Scatter rocks stay left of the cave mouth (no stone above the entrance)
  //
  const rightEdge = getCrackZone(WORLD_W, FLOOR_Y).x1 - 40
  const stripStartX = GROUND_REVEAL_TREE_PAST_X
  const nearTramp = (x) => Math.abs(x - trampX) <= TRAMP_ROCK_CLEAR_HALF ||
    Math.abs(x - branchTrampX) <= TRAMP_ROCK_CLEAR_HALF
  const badRock = (x) => nearTramp(x) || isCrackDecorExcluded(x, WORLD_W)
  const rightSpan = Math.max(40, rightEdge - TREE_X - 80)
  const rightClusterCenters = []
  for (let c = 0; c < RIGHT_ROCK_CLUSTER_COUNT; c++) {
    const t = (c + 0.5) / RIGHT_ROCK_CLUSTER_COUNT
    rightClusterCenters.push(TREE_X + 80 + rightSpan * t + (Math.random() * 2 - 1) * rightSpan * 0.08)
  }
  for (let i = 0; i < RIGHT_ROCK_COUNT; i++) {
    const radius = SCATTER_ROCK_RADIUS_MIN + Math.random() * (SCATTER_ROCK_RADIUS_MAX - SCATTER_ROCK_RADIUS_MIN)
    const clusterCenterX = rightClusterCenters[i % RIGHT_ROCK_CLUSTER_COUNT]
    const clusterSpread = RIGHT_ROCK_CLUSTER_SPREAD_MIN + Math.random() * RIGHT_ROCK_CLUSTER_SPREAD_RANGE
    let cx = clusterCenterX + (Math.random() * 2 - 1) * clusterSpread
    let safety = 0
    while (badRock(cx) && safety < 40) {
      cx = clusterCenterX + (Math.random() * 2 - 1) * clusterSpread
      safety++
    }
    if (badRock(cx)) continue
    const rock = placeRock(k, cx, radius, 'right', false, 7, 1, decorAtlas, zones)
    rock._rightStrip = groundRightStripIndexForX(cx, stripStartX, rightEdge)
    objs.push(rock)
  }
  //
  // Extra scatter on the east ground strip (branch trampoline → crack mouth).
  //
  if (eastGroundRockMinX != null) {
    const eastLeft = eastGroundRockMinX + MUD_EAST_ROCK_INSET
    const crackZone = getCrackZone(WORLD_W, FLOOR_Y)
    const eastRockClear = (x) => nearTramp(x) || x >= crackZone.x1 - 52
    const eastSpan = Math.max(50, rightEdge - eastLeft)
    for (let i = 0; i < MUD_EAST_ROCK_COUNT; i++) {
      const t = (i + 0.5) / MUD_EAST_ROCK_COUNT
      const radius = SCATTER_ROCK_RADIUS_MIN + Math.random() * (SCATTER_ROCK_RADIUS_MAX - SCATTER_ROCK_RADIUS_MIN)
      let cx = eastLeft + eastSpan * t + (Math.random() - 0.5) * eastSpan * 0.22
      let safety = 0
      while (eastRockClear(cx) && safety < 48) {
        cx = eastLeft + Math.random() * eastSpan
        safety++
      }
      if (eastRockClear(cx) || cx < eastLeft) continue
      const rock = placeRock(k, cx, radius, 'right', false, 7, 0.85 + Math.random() * 0.35, decorAtlas, zones)
      rock._rightOfMud = true
      rock._rightStrip = groundRightStripIndexForX(cx, stripStartX, rightEdge)
      objs.push(rock)
    }
  }
  return objs
}
//
// Pre-renders a shaded rock sprite (shared decor atlas).
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
  const palette = glowRockShadedDrawPalette()
  const bakeRock = (seedOffset) => {
    const canvas = toCanvas({ width: totalW, height: croppedH, pixelRatio: 1 }, (ctx) => {
      ctx.scale(widthScale, 1)
      drawRockToCanvas(ctx, {
        cx, cy, radius, verts, palette,
        skipShadow: true, skipTexture: false,
        outlineColor: `rgb(${ROCK_OUTLINE_RGB.r}, ${ROCK_OUTLINE_RGB.g}, ${ROCK_OUTLINE_RGB.b})`,
        outlineWidth: ROCK_OUTLINE_WIDTH,
        outlineAlpha: 1
      })
    })
    applyGlowMaterialBake(canvas, seedOffset)
    return canvas
  }
  const baked = decorAtlas.register(bakeRock(worldX * 3 | 0))
  const bakedLakeCap = decorAtlas.register(bakeRock(worldX * 3 + 1 | 0))
  const obj = k.add([
    k.pos(worldX - totalW / 2, posY),
    k.z(z),
    {
      opacity: 1,
      color: k.rgb(255, 255, 255),
      _baked: baked,
      _bakedLakeCap: bakedLakeCap,
      draw() {
        if (this.hidden) return
        drawDecorAtlasSprite(k, this._baked, k.vec2(0, 0), 'topleft', 0, this.opacity, this.color)
      }
    }
  ])
  obj._side = side
  obj._waterCluster = waterCluster
  obj._homeX = worldX - totalW / 2
  obj._homeY = posY
  obj._surfaceHalfW = totalW * 0.5
  obj._surfaceTop = posY
  obj._decorWorldX = worldX
  obj._detailRank = radius < 16 ? 'small' : 'large'
  obj.hidden = true
  obj.pos.y = PLATFORM_HIDE_Y
  return obj
}
//
// Viscous mud crest. Smooth sine peaks, pinched to the ground line at the
// band edges. Up is a smaller Y. Shared by the blob and the walk surface.
//
function glowMudCrestY(x, mudX1, mudX2) {
  const span = Math.max(1, mudX2 - mudX1)
  const t = (x - mudX1) / span
  if (t <= 0 || t >= 1) return FLOOR_Y
  const edge = Math.sin(t * Math.PI)
  const swell = Math.sin(x * 0.022) * 8 + Math.sin(x * 0.009 + 1.4) * 5
  return FLOOR_Y - edge * Math.max(5, 10 + swell)
}
//
// Rounded stratum line inside the mud, softer than the underground jag.
//
function glowMudSeamY(x, mudX1, mudX2) {
  const crest = glowMudCrestY(x, mudX1, mudX2)
  return crest + (FLOOR_Y - crest) * 0.42
}
//
// Lower soil swatch, same brown the underground band uses for its deep layer.
//
function glowLowerSoilRgb() {
  if (!glowLowerSoilRgb.cached) {
    const layers = groundEarthLayersColor()
    glowLowerSoilRgb.cached = layers[layers.length - 1].rgb
  }
  return glowLowerSoilRgb.cached
}
//
// One filled puddle plus a soft inner seam. Reuses point buffers.
//
function drawGlowViscousMud(inst) {
  const x1 = inst.mudZoneX1
  const x2 = inst.mudZoneX2
  if (x1 == null || x2 == null || !inst.zones.predatorAwake) return
  const k = inst.k
  const view = glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN)
  if (view && (x2 < view.x1 || x1 > view.x2)) return
  const steps = MUD_BLOB_STEPS
  const fill = inst._mudFillPts ??= []
  const seam = inst._mudSeamPts ??= []
  const fillNeed = (steps + 1) * 2
  while (fill.length < fillNeed) fill.push(k.vec2(0, 0))
  while (seam.length < steps + 1) seam.push(k.vec2(0, 0))
  fill.length = fillNeed
  seam.length = steps + 1
  const span = x2 - x1
  for (let i = 0; i <= steps; i++) {
    const x = x1 + span * (i / steps)
    const top = fill[i]
    top.x = x
    top.y = glowMudCrestY(x, x1, x2)
    const line = seam[i]
    line.x = x
    line.y = glowMudSeamY(x, x1, x2)
  }
  for (let i = 0; i <= steps; i++) {
    const bottom = fill[steps + 1 + i]
    bottom.x = x2 - span * (i / steps)
    bottom.y = FLOOR_Y + 1
  }
  const fillRgb = glowLowerSoilRgb()
  const seamRgb = lerpRgb(fillRgb, glowRgb('groundChernozem'), 0.35)
  k.drawPolygon({
    pts: fill,
    color: k.rgb(fillRgb.r, fillRgb.g, fillRgb.b)
  })
  k.drawLines({
    pts: seam,
    width: 1.6,
    color: k.rgb(seamRgb.r, seamRgb.g, seamRgb.b),
    opacity: 0.55
  })
}
//
// Draws the mud walk log and branches on top of the puddle.
//
function drawGlowMudWalkClutter(inst) {
  const clutter = inst.mudWalkClutter
  if (!inst.zones.predatorAwake || !clutter) return
  const k = inst.k
  const logColors = glowLogColors()
  const branchRgb = glowRgb(logColors.barkDark)
  const branchColor = k.rgb(branchRgb.r, branchRgb.g, branchRgb.b)
  if (clutter.log) {
    const { log } = clutter
    drawLogPlatform(k, log.w, log.h, log.cx, log.cy, 1, log.detail, logColors)
  }
  clutter.branches?.forEach(branch => {
    k.drawLine({
      p1: k.vec2(branch.x1, branch.y1),
      p2: k.vec2(branch.x2, branch.y2),
      width: 2.2,
      color: branchColor
    })
  })
}
//
// Flat ground line for the centipede. Up is a smaller Y.
//
function glowPredatorGroundAt(levelInst) {
  let y = FLOOR_Y - PREDATOR_GROUND_CLEARANCE
  const mounted = levelInst.shoreFallTwigs?.twigs?.some(twig => twig.phase === 'predatorMount')
  mounted && (y -= PREDATOR_STICK_EXTRA_LIFT)
  return y
}
//
// Mushrooms — value 5, excluded from water zone.
//
function createGlowMushrooms(k, waterX1, waterX2, trampX, branchTrampX, zones, decorAtlas) {
  const objs = []
  const left = LEFT_MARGIN + 60
  const capColorsRgb = MUSHROOM_CAP_HEX.map(hex => {
    const c = glowRgb(hex)
    return [c.r, c.g, c.b]
  })
  const capLightRgb = MUSHROOM_CAP_LIGHT_HEX.map(hex => {
    const c = glowRgb(hex)
    return [c.r, c.g, c.b]
  })
  const capShadowRgb = MUSHROOM_CAP_SHADOW_HEX.map(hex => {
    const c = glowRgb(hex)
    return [c.r, c.g, c.b]
  })
  const shuffledCapIdx = capColorsRgb.map((_, i) => i)
  for (let i = shuffledCapIdx.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = shuffledCapIdx[i]
    shuffledCapIdx[i] = shuffledCapIdx[j]
    shuffledCapIdx[j] = tmp
  }
  //
  // Decor mushrooms stay left of the cave mouth (never above the entrance)
  //
  const right = getCrackZone(WORLD_W, FLOOR_Y).x1 - 88
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
    const capH = capW * (0.4 + Math.random() * 0.3)
    const stemH = MUSHROOM_STEM_HEIGHT_MIN + Math.random() * (MUSHROOM_STEM_HEIGHT_MAX - MUSHROOM_STEM_HEIGHT_MIN)
    const stemW = capW * (0.25 + Math.random() * 0.15)
    const totalW = Math.ceil(capW + 4)
    const totalH = Math.ceil(capH + stemH + 4)
    const span = Math.max(40, right - left)
    let posX = left + Math.random() * span
    let safety = 0
    while (isBadSpot(posX) && safety < 40) {
      posX = left + Math.random() * span
      safety++
    }
    if (isBadSpot(posX)) continue
    const posY = FLOOR_Y - totalH + MUSHROOM_EXTRA_LOWER
    const mushDrawOpts = {
      cx: totalW / 2,
      baseY: totalH - 2,
      capWidth: capW,
      capHeight: capH,
      stemWidth: stemW,
      stemHeight: stemH
    }
    //
    // Cap tones from this mushroom's palette family.
    //
    const capIdx = shuffledCapIdx[i % shuffledCapIdx.length]
    const mushColorCanvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawMushroomToCanvas(ctx, {
        ...mushDrawOpts,
        capColor: capColorsRgb[capIdx],
        capLight: capLightRgb[capIdx],
        capShadow: capShadowRgb[capIdx]
      })
    })
    applyGlowGameplaySharpBake(mushColorCanvas, posX * 2 + 2 | 0)
    const baked = decorAtlas.register(mushColorCanvas)
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
        _baked: baked,
        draw() {
          if (this.hidden) return
          drawDecorAtlasSprite(k, this._baked, k.vec2(0, 0), 'bot', this.angle, this.opacity, this.color)
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
// Mushroom trampoline — the cute chubby mushroom with a blushy face. Two
// pre-baked variants cover both eye states; the eyes blink by sprite swap.
//
function createMushroomTrampoline(k, trampX, floorY, zones, opts = {}) {
  const pitCaveTramp = Boolean(opts.pitCaveTramp)
  const gateBranchTramp = Boolean(opts.gateBranchTramp)
  //
  // Each trampoline mushroom gets its own cap-colour family (opts.colors,
  // opts.spriteKey) so the branch/right/pit characters read as distinct
  // little guys instead of three identical orange caps.
  //
  const colorColors = opts.colors ?? CUTE_MUSH_COLORS
  const colorSpriteBase = TRAMP_OUTLINE_SPRITE + (opts.spriteKey ? `-${opts.spriteKey}` : '')
  bakeTrampolineVariant(k, colorSpriteBase, colorColors, true)
  bakeTrampolineVariant(k, colorSpriteBase + TRAMP_BLINK_SPRITE_SUFFIX, colorColors, false)
  const state = {
    squash: 0,
    cooldown: 0,
    x: trampX,
    homeX: trampX,
    floorY,
    pitCaveTramp,
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
        const sc = zones._sceneRef
        if (pitCaveTramp) {
          if (!isPitCaveTrampolineVisible(sc)) return
        } else if (gateBranchTramp) {
          if (!isBranchTrampolineVisible(zones)) return
        } else if (!isRightTrampolineVisible(zones)) {
          return
        }
        //
        // A blink swaps to the closed-eyes variant of the sprite set.
        //
        const untinted = k.rgb(255, 255, 255)
        const enduring = Boolean(state.enduring)
        const angle = enduring ? 0 : (state.leanAngle || 0)
        const drawX = state.x + (state.endureShakeX || 0)
        const scaleY = enduring
          ? (state.endureScaleY || 1)
          : (state.squash > 0.01 ? 1 - state.squash * 0.35 : 1)
        const eyesClosed = enduring || state.blinking
        const colorEyes = eyesClosed ? colorSpriteBase + TRAMP_BLINK_SPRITE_SUFFIX : colorSpriteBase
        state.hasLegs && drawTrampolineLegs(k, state, floorY)
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
        const drawTrampPupils = () => {
          if (eyesClosed) return
          const hero = sc?.heroInst?.character
          drawCuteMushroomPupilOverlay(k, {
            cx: drawX,
            baseY: floorY + TRAMP_SINK_Y,
            width: TRAMP_W,
            eyeScale: TRAMP_FACE_EYE_SCALE,
            angle,
            scaleY,
            lookX: hero?.pos?.x,
            lookY: hero?.pos?.y
          })
        }
        drawTrampSprite(colorEyes, 1, untinted)
        drawTrampPupils()
      }
    }
  ])
  drawLayer.onUpdate(() => {
    onUpdateTrampolineBlink(k, state)
  })
  drawLayer.hidden = pitCaveTramp
    ? !isPitCaveTrampolineVisible(zones._sceneRef)
    : gateBranchTramp
      ? !isBranchTrampolineVisible(zones)
      : !isRightTrampolineVisible(zones)
  return { state, drawLayer, colliderHome, gateBranchTramp, pitCaveTramp }
}
//
// Walking legs — alternating stride with a short shin kick
//
function drawTrampolineLegs(k, state, floorY) {
  const phase = state.walkPhase || 0
  const stride = Math.sin(phase)
  const stride2 = Math.sin(phase + Math.PI)
  const legC = k.rgb(DECOR_OUTLINE_RGB.r, DECOR_OUTLINE_RGB.g, DECOR_OUTLINE_RGB.b)
  const footC = k.rgb(VOID.r, VOID.g, VOID.b)
  const s = TRAMP_SIZE_SCALE
  drawOneTrampLeg(k, state.x - 9 * s, floorY, stride, legC, footC, s)
  drawOneTrampLeg(k, state.x + 9 * s, floorY, stride2, legC, footC, s)
}
function drawOneTrampLeg(k, hipX, floorY, stride, legC, footC, scale = 1) {
  const kneeX = hipX + stride * 5 * scale
  const kneeY = floorY - 10 * scale - Math.max(0, -stride) * 4 * scale
  const footX = hipX + stride * 9 * scale
  const footY = floorY - 1
  k.drawLine({
    p1: k.vec2(hipX, floorY - 14 * scale),
    p2: k.vec2(kneeX, kneeY),
    width: 3.2 * scale,
    color: legC
  })
  k.drawLine({
    p1: k.vec2(kneeX, kneeY),
    p2: k.vec2(footX, footY),
    width: 2.6 * scale,
    color: legC
  })
  k.drawEllipse({
    pos: k.vec2(footX + 2 * scale, footY),
    radiusX: 5.5 * scale,
    radiusY: 2.4 * scale,
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
      eyeScale: TRAMP_FACE_EYE_SCALE,
      dynamicPupils: eyesOpen,
      simpleShade: true
    })
  })
  applyGlowGameplaySharpBake(canvas, name.length * 13)
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
function lakeShoreFadeAtLocalX(localX, coreSpan, bakeSpan) {
  if (localX <= coreSpan) return 1
  if (bakeSpan <= coreSpan) return 0
  const u = (localX - coreSpan) / (bakeSpan - coreSpan)
  return Math.max(0, 1 - u)
}
//
function bakeLakeWaterSprites(k, x1, x2Core) {
  const coreSpan = x2Core - x1
  const bakeSpan = coreSpan + LAKE_SHORE_EXTEND_PX
  const canvasW = Math.ceil(bakeSpan)
  const topMargin = LAKE_WAVE_AMP + LAKE_WAVE_SECOND_AMP + 2
  const maxDepth = WATER_DEPTH_LEFT + WATER_BED_CHAOS_AMP_A + WATER_BED_CHAOS_AMP_B + LAKE_BED_BAKE_PAD + 2
  const canvasH = Math.ceil(maxDepth + topMargin)
  const originY = WATER_SURFACE_Y - topMargin
  for (let f = 0; f < LAKE_BAKE_FRAME_COUNT; f++) {
    const time = (f / LAKE_BAKE_FRAME_COUNT) * LAKE_BAKE_CYCLE
    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    const pts = []
    for (let i = 0; i <= LAKE_SEGMENTS; i++) {
      const t = i / LAKE_SEGMENTS
      const localX = t * bakeSpan
      const coreT = Math.min(1, localX / coreSpan)
      const shoreFade = lakeShoreFadeAtLocalX(localX, coreSpan, bakeSpan)
      const wave = lakeWaveOffsetAt(coreT, time) * shoreFade
      pts.push([localX, topMargin + wave])
    }
    for (let i = LAKE_SEGMENTS; i >= 0; i--) {
      const t = i / LAKE_SEGMENTS
      const localX = t * bakeSpan
      const coreT = Math.min(1, localX / coreSpan)
      const shoreFade = lakeShoreFadeAtLocalX(localX, coreSpan, bakeSpan)
      const bed = (waterBedDepthAt(coreT) + LAKE_BED_BAKE_PAD) * shoreFade
      pts.push([localX, topMargin + bed])
    }
    ctx.fillStyle = '#ffffff'
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let p = 1; p < pts.length; p++) {
      ctx.lineTo(pts[p][0], pts[p][1])
    }
    ctx.closePath()
    ctx.fill()
    applyGlowGameplaySharpBake(canvas, 5000 + f)
    k.loadSprite(LAKE_BAKE_SPRITE_PREFIX + f, canvas)
    canvas.width = 0
    canvas.height = 0
  }
  return { x1, x2Core, originY, canvasW, canvasH, bakeSpan }
}
//
// Water — value 5 fill bounded by wave polygon.
//
function createWater(k, x1, x2Core, zones) {
  const lakeBake = bakeLakeWaterSprites(k, x1, x2Core)
  const x2Bake = x1 + lakeBake.bakeSpan
  const drawLakeFill = () => {
    if (!zones.water) return
    const sc = zones._sceneRef
    if (!isLakeFillInCameraView(k, sc, x1, x2Bake)) return
    const lakeRgb = resolveGlowLakeDrawRgb(k, sc)
    const frame = Math.floor((k.time() % LAKE_BAKE_CYCLE) / LAKE_BAKE_CYCLE * LAKE_BAKE_FRAME_COUNT) % LAKE_BAKE_FRAME_COUNT
    k.drawSprite({
      sprite: LAKE_BAKE_SPRITE_PREFIX + frame,
      pos: k.vec2(lakeBake.x1, lakeBake.originY),
      width: lakeBake.canvasW,
      height: lakeBake.canvasH,
      color: lakeRgb
    })
  }
  const layer = k.add([
    k.z(LAKE_Z),
    {
      draw() {
        drawLakeFill()
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
// Shared lake bed depth at normalized x (0 = left/deep, 1 = right/shallow)
//
function isLakeFillInCameraView(k, sc, x1, x2) {
  const view = glowCameraViewXRange(k, sc, LAKE_SURFACE_CULL_MARGIN)
  return !view || !(x2 < view.x1 || x1 > view.x2)
}
//
// Visible world X range of the glow camera (null before the camera exists,
// which callers treat as "everything visible").
//
function glowCameraViewXRange(k, sc, margin) {
  const cam = sc?.camera
  if (!cam) return null
  const halfW = cam.viewW / (2 * (cam.zoom || 1)) + margin
  const camX = k.camPos().x
  return { x1: camX - halfW, x2: camX + halfW }
}
//
// Lake tint at draw time (shared by the baked sprite).
//
function resolveGlowLakeDrawRgb(k, sc) {
  const c = WATER_COLOR
  const rgb = sc?._lakeDrawRgb
  if (!rgb || rgb.r !== c.r || rgb.g !== c.g || rgb.b !== c.b) {
    sc && (sc._lakeDrawRgb = k.rgb(c.r, c.g, c.b))
  }
  return (sc && sc._lakeDrawRgb) || k.rgb(c.r, c.g, c.b)
}
//
// Animated lake surface height at normalized shore span (0 = left).
//
function lakeWaveOffsetAt(t, time) {
  const wavePrimary = Math.sin(time * LAKE_WAVE_FREQ + t * LAKE_WAVE_PHASE_SCALE) * LAKE_WAVE_AMP
  const waveSecondary = Math.sin(time * LAKE_WAVE_SECOND_FREQ + t * LAKE_WAVE_PHASE_SCALE * 2.3) * LAKE_WAVE_SECOND_AMP
  return wavePrimary + waveSecondary
}
//
// Lake surface world Y at hero X (same wave as the baked lake animation).
//
function lakeSurfaceWorldYAt(inst, worldX) {
  const x1 = inst.lakeX1 ?? inst.zones?._lakeX1
  const x2Core = inst.lakeX2 ?? inst.zones?._lakeX2
  if (x1 == null || x2Core == null || worldX < x1 || worldX > x2Core) {
    return WATER_SURFACE_Y
  }
  const t = (worldX - x1) / (x2Core - x1)
  const time = inst.k.time() % LAKE_BAKE_CYCLE
  return WATER_SURFACE_Y + lakeWaveOffsetAt(t, time)
}
//
// Full hero blit above onDraw while the default sprite stays hidden in the pit.
//
function drawGlowPitCaveHeroForeground(inst) {
  if (!inst.pitCaveHeroForeground) return
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  const k = inst.k
  const sprite = Hero.getActiveSpriteKey(hero)
  if (!k.getSprite(sprite)) return
  const scale = char.scale?.x ?? 1
  const fullH = Hero.HERO_BAKE_SPRITE_SIZE * scale
  k.drawSprite({
    sprite,
    pos: char.pos,
    anchor: 'center',
    width: fullH,
    height: fullH,
    flipX: char.flipX,
    opacity: char.opacity ?? 1
  })
}
//
// Draws only the hero pixels above the lake surface (default sprite stays hidden).
//
function drawGlowDrownHeroClipped(inst) {
  if (!inst.glowDrownHeroClipLock) return
  const hero = inst.heroInst
  const char = hero.character
  if (!char?.pos) return
  const k = inst.k
  const surfaceY = lakeSurfaceWorldYAt(inst, char.pos.x)
  const prefix = hero.spritePrefix || hero.type
  const outlineClosed = `${prefix}_closed`
  const layers = []
  k.getSprite(outlineClosed) && layers.push({ sprite: outlineClosed, opacity: 1 })
  if (!layers.length) return
  const scale = char.scale?.x ?? 1
  const fullH = Hero.HERO_BAKE_SPRITE_SIZE * scale
  const fullW = fullH
  const halfH = fullH * 0.5
  const topY = char.pos.y - halfH
  const bottomY = char.pos.y + halfH
  //
  // Fully submerged — nothing should draw below the wave (avoid painting the
  // whole hidden sprite once the sink tween has passed the surface).
  //
  if (topY >= surfaceY - 0.25) return
  if (bottomY <= surfaceY + 0.25) return
  if (surfaceY >= bottomY) return
  let visibleH = fullH
  let drawY = char.pos.y
  let quad = null
  if (surfaceY > topY) {
    visibleH = surfaceY - topY
    if (visibleH <= 0) return
    quad = { x: 0, y: 0, w: 1, h: visibleH / fullH }
    drawY = topY + visibleH * 0.5
  }
  const baseOpacity = char.opacity ?? 1
  for (const layer of layers) {
    const opts = {
      sprite: layer.sprite,
      pos: k.vec2(char.pos.x, drawY),
      anchor: 'center',
      width: fullW,
      height: visibleH,
      flipX: char.flipX,
      opacity: baseOpacity * layer.opacity
    }
    quad && (opts.quad = quad)
    k.drawSprite(opts)
  }
}
//
function waterBedDepthAt(t) {
  const u = Math.pow(t, WATER_BED_DEPTH_POWER)
  const base = WATER_DEPTH_LEFT + (WATER_DEPTH_RIGHT - WATER_DEPTH_LEFT) * u
  const chaos = Math.sin(t * WATER_BED_CHAOS_A + 0.4) * WATER_BED_CHAOS_AMP_A +
    Math.sin(t * WATER_BED_CHAOS_B + 1.7) * WATER_BED_CHAOS_AMP_B
  return Math.max(WATER_DEPTH_RIGHT, base + chaos * (1 - t))
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
  if (EyeFlower.isOnIsland(inst.eyeFlower, x, footY)) return 'ground'
  if (footY >= FLOOR_Y - 30 && isHeroInMudZone(inst, x)) return 'mud'
  if (footY >= FLOOR_Y - 30) return 'ground'
  return 'air'
}
//
// True when the hero's feet sit on the soft muddy band in the mud band.
//
function isHeroInMudZone(inst, footX) {
  if (!inst.zones.predatorAwake) return false
  if (inst.mudZoneX1 == null || inst.mudZoneX2 == null) return false
  return footX >= inst.mudZoneX1 && footX <= inst.mudZoneX2
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
  if (isOnGlowLakeDryFooting(inst, x, footY)) return false
  return x >= inst.lakeX1 && x <= inst.lakeX2 && footY >= FLOOR_Y - 40
}
//
// The eye-flower island is the only dry footing inside the lake band.
//
function isOnGlowLakeDryFooting(inst, x, footY) {
  return EyeFlower.isOnIsland(inst.eyeFlower, x, footY)
}
//
// The island and its plant exist only in the colour world once the lake is open.
//
function isGlowEyeFlowerVisible(inst) {
  return !!inst.zones.water
}
//
// Hero body centre for the eye-flower to watch and reach (null while gone).
//
function glowEyeFlowerHeroPos(inst) {
  const char = inst.heroInst?.character
  if (!char?.pos || inst.drowning || inst.deathHandled) return null
  return { x: char.pos.x, y: char.pos.y + GLOW_EYE_FLOWER_HERO_CENTER_DY }
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
  const cutout = glowPitEarthBandCutoutForInst(inst)
  if (cutout && cutout.leftX < clipRight && cutout.rightX > clipLeft) {
    const leftEnd = Math.min(clipRight, cutout.leftX)
    leftEnd > clipLeft + 1 &&
      drawWorldSpriteSlice(k, clipLeft, leftEnd, sprite, opacity)
    const rightStart = Math.max(clipLeft, cutout.rightX)
    clipRight > rightStart + 1 &&
      drawWorldSpriteSlice(k, rightStart, clipRight, sprite, opacity)
    return
  }
  drawWorldSpriteSlice(k, clipLeft, clipRight, sprite, opacity)
}
//
// One horizontal slice of the baked static underground band.
//
function drawWorldSpriteSlice(k, x1, x2, sprite, opacity = 1) {
  const w = x2 - x1
  const opts = {
    sprite,
    pos: k.vec2(x1, PAR_STATIC_WORLD_Y),
    width: w,
    height: PAR_STATIC_WORLD_H,
    quad: { x: x1 / WORLD_W, y: 0, w: w / WORLD_W, h: 1 },
    anchor: 'topleft'
  }
  opacity < 0.999 && (opts.opacity = opacity)
  k.drawSprite(opts)
}
//
// Draws only the on-screen slice of one parallax layer sprite, split into
// baked columns so fully transparent rows are skipped. Rows at or below
// bottomWorldY are hidden by an opaque nearer layer and are not drawn.
//
function drawParallaxLayerSlice(inst, layer, spriteName, opacity = 1, rgbTint = null, bottomWorldY = Infinity) {
  const k = inst.k
  const drawX = GlowCamera.getParallaxDrawX(inst.camera, layer.speed, layer.bleed)
  const pad = GlowCamera.getParallaxLayerPad(inst.camera, layer.speed, layer.bleed)
  const spriteW = WORLD_W + pad * 2
  const { left: visLeft, right: visRight } = visibleWorldXRange(inst)
  const sx0 = Math.max(visLeft, drawX) - drawX
  const sx1 = Math.min(visRight, drawX + spriteW) - drawX
  if (sx1 <= sx0 + 1) return
  const slice = inst._parSlice ?? (inst._parSlice = {})
  slice.sprite = spriteName
  slice.drawX = drawX
  slice.spriteW = spriteW
  slice.worldY = layer.worldY
  slice.worldH = layer.worldH
  slice.opacity = opacity
  slice.color = rgbTint ? k.rgb(rgbTint.r, rgbTint.g, rgbTint.b) : null
  const yLimit = Math.min(layer.worldH, bottomWorldY - layer.worldY)
  const cols = parallaxColumnBoundsByK.get(k)?.get(spriteName)
  if (!cols) {
    drawParallaxColumnRun(k, slice, sx0, sx1, 0, yLimit)
    return
  }
  drawParallaxColumns(k, slice, cols, sx0, sx1, yLimit)
}
//
// Walks the visible baked columns and merges neighbours with identical
// vertical bounds into one draw — all runs share one texture, so they stay
// in a single GPU batch.
//
function drawParallaxColumns(k, slice, cols, sx0, sx1, yLimit) {
  const c0 = Math.max(0, Math.floor(sx0 / PAR_COLUMN_W))
  const c1 = Math.min(cols.count - 1, Math.floor((sx1 - 1) / PAR_COLUMN_W))
  let runX = sx0
  let runY0 = 0
  let runY1 = 0
  for (let c = c0; c <= c1; c++) {
    const y0 = cols.top[c]
    const y1 = Math.min(cols.bottom[c], yLimit)
    if (y0 === runY0 && y1 === runY1) continue
    const x0 = Math.max(sx0, c * PAR_COLUMN_W)
    drawParallaxColumnRun(k, slice, runX, x0, runY0, runY1)
    runX = x0
    runY0 = y0
    runY1 = y1
  }
  drawParallaxColumnRun(k, slice, runX, sx1, runY0, runY1)
}
//
// One sprite-space rectangle [x0, x1) × [y0, y1) of a parallax layer.
//
function drawParallaxColumnRun(k, slice, x0, x1, y0, y1) {
  if (x1 <= x0 || y1 <= y0) return
  const w = x1 - x0
  const h = y1 - y0
  const opts = {
    sprite: slice.sprite,
    pos: k.vec2(slice.drawX + x0, slice.worldY + y0),
    width: w,
    height: h,
    quad: { x: x0 / slice.spriteW, y: y0 / slice.worldH, w: w / slice.spriteW, h: h / slice.worldH },
    anchor: 'topleft'
  }
  slice.opacity < 0.999 && (opts.opacity = slice.opacity)
  slice.color && (opts.color = slice.color)
  k.drawSprite(opts)
}
//
// World Y from which the opaque near row hides everything behind it across
// the whole visible slice (deepest solid column top wins).
//
function parallaxNearOccluderWorldY(inst) {
  const layer = PAR_LAYER_NEAR
  const cols = parallaxColumnBoundsByK.get(inst.k)?.get(layer.color)
  if (!cols?.solidTop) return Infinity
  const drawX = GlowCamera.getParallaxDrawX(inst.camera, layer.speed, layer.bleed)
  const { left, right } = visibleWorldXRange(inst)
  const c0 = Math.max(0, Math.floor((left - drawX) / PAR_COLUMN_W))
  const c1 = Math.min(cols.count - 1, Math.floor((right - drawX) / PAR_COLUMN_W))
  if (c1 < c0) return Infinity
  let solid = 0
  for (let c = c0; c <= c1; c++) {
    solid = Math.max(solid, cols.solidTop[c])
  }
  return layer.worldY + solid
}
//
// Draws one parallax layer as a single opaque colour slice. Rows behind the
// near row are culled below the near row's solid top.
//
function drawParallaxLayer(inst, layer) {
  const occluderY = layer === PAR_LAYER_NEAR ? Infinity : inst._parOccluderY ?? Infinity
  drawParallaxLayerSlice(inst, layer, layer.color, 1, null, occluderY)
}
//
// Settled colour world: renders the sky+far and mid tree rows into a
// half-resolution framebuffer (same camera, viewport scaled down) and blits
// it once over the whole screen. Nothing is drawn before this in the frame,
// and the framebuffer clears to the same backdrop as the screen, so the
// blit is equivalent to drawing those layers directly at a quarter of the
// fill cost.
//
function drawGlowParallaxBackdropOffscreen(inst) {
  const k = inst.k
  inst._parOffscreen = glowParallaxOffscreenCanvas(k)
  inst._parOccluderY = parallaxNearOccluderWorldY(inst)
  inst._drawParBackdrop ??= () => drawGlowParallaxBackdropLayers(inst)
  inst._parOffscreen.draw(inst._drawParBackdrop)
  drawGlowParallaxBackdropBlit(inst)
}
//
// Blits the half-resolution backdrop. The near row hides everything below
// its solid top, so the blit stops there instead of filling the ground.
// drawCanvas flips the framebuffer around the full screen height, so a
// shorter quad is shifted up by the cropped amount and samples the top
// of the texture (high UV, which lands on screen y = 0).
//
function drawGlowParallaxBackdropBlit(inst) {
  const k = inst.k
  const fullH = k.height()
  const cropH = glowParallaxBackdropScreenH(inst)
  if (cropH >= fullH - 1) {
    k.drawCanvas({
      canvas: inst._parOffscreen,
      width: k.width(),
      height: fullH,
      fixed: true
    })
    return
  }
  const frac = cropH / fullH
  const pos = inst._parBlitPos ??= k.vec2(0, 0)
  pos.x = 0
  pos.y = cropH - fullH
  const quad = inst._parBlitQuad ??= { x: 0, y: 0, w: 1, h: 1 }
  quad.y = 1 - frac
  quad.h = frac
  k.drawCanvas({
    canvas: inst._parOffscreen,
    pos,
    width: k.width(),
    height: cropH,
    quad,
    fixed: true
  })
}
//
// Screen-space height of the backdrop that is not covered by the near row.
//
function glowParallaxBackdropScreenH(inst) {
  const worldY = inst._parOccluderY
  if (!Number.isFinite(worldY)) return inst.k.height()
  const screenY = glowWorldToScreenY(inst, worldY) + PAR_BACKDROP_CROP_PAD
  return Math.max(1, Math.min(inst.k.height(), Math.ceil(screenY)))
}
//
// Kaplay's camera is centre-anchored: world Y maps to screen Y around camPos.
//
function glowWorldToScreenY(inst, worldY) {
  const k = inst.k
  const scale = k.camScale?.()
  const zoom = (typeof scale === 'object' ? scale.y : scale) || 1
  return (worldY - k.camPos().y) * zoom + k.height() / 2
}
//
// Offscreen pass body — runs with the framebuffer bound.
//
function drawGlowParallaxBackdropLayers(inst) {
  inst._parOffscreen.clear()
  drawParallaxLayer(inst, PAR_LAYER_FAR)
  drawParallaxLayer(inst, PAR_LAYER_MID)
}
//
// Offscreen backdrop framebuffer for the live engine, recreated when the
// native window size changes.
//
function glowParallaxOffscreenCanvas(k) {
  const w = Math.max(1, Math.ceil(k.width() * PAR_OFFSCREEN_SCALE))
  const h = Math.max(1, Math.ceil(k.height() * PAR_OFFSCREEN_SCALE))
  const cached = parallaxOffscreenByK.get(k)
  if (cached && cached.width === w && cached.height === h) return cached
  cached?.free()
  const canvas = k.makeCanvas(w, h)
  enableCanvasLinearFilter(canvas)
  parallaxOffscreenByK.set(k, canvas)
  return canvas
}
//
// Kaplay creates framebuffer textures with the engine's crisp (nearest)
// filter; the upscaled backdrop needs bilinear sampling or every half-res
// texel turns into a hard 2×2 block.
//
function enableCanvasLinearFilter(canvas) {
  const tex = canvas.fb.tex
  const gl = tex.ctx.gl
  tex.bind()
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR)
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR)
  tex.unbind()
}
//
// Pit mouth gap for onDraw earth/static layers (includes floor extended west).
//
function glowPitEarthBandCutoutForInst(inst) {
  const pit = inst.pit
  if (!pit?.zone) return null
  return getGlowPitEarthBandMouthCutoutForPit(pit)
}
//
// Pit interior is painted at the start of onDrawWorld so earth/static and the
// cave hero blit at the end of onDraw can stack in the right order.
//
function ensureGlowPitDrawLayer(inst) {
  inst._glowPitDrawInOnDrawWorld = true
}
//
// Paints the open cave and interior rocks at a low z-index.
//
function drawGlowPitPass(inst) {
  if (!inst.pit) return
  const k = inst.k
  drawGlowPitInteriorVoidBackdrop(inst, k)
  drawGlowPit(k, inst.pit)
}
//
// Fills the earth-band cutout with cave void — never light playfield gray inside
// the open pit (that read as a wall in front of the hero).
//
function drawGlowPitInteriorVoidBackdrop(inst, k) {
  const pit = inst.pit
  if (!pit?.collapsed || !pit.zone) return
  const { leftX, rightX } = getGlowPitEarthBandMouthCutoutForPit(pit)
  const w = rightX - leftX
  const interiorH = pit.zone.depth
  const voidRgb = glowCaveEarthDeepRgb()
  interiorH > 0 && k.drawRect({
    pos: k.vec2(leftX, pit.floorY),
    width: w,
    height: interiorH,
    color: k.rgb(voidRgb.r, voidRgb.g, voidRgb.b)
  })
}
function drawGlowPitCutoutBelowFloorFill(inst, k) {
  const pit = inst.pit
  if (!pit?.collapsed || !pit.zone) return
  const bottomY = pit.floorY + pit.zone.depth
  const bandEndY = pit.floorY + CAVE_BAND_H
  if (bandEndY <= bottomY) return
  const { leftX, rightX } = getGlowPitEarthBandMouthCutoutForPit(pit)
  //
  // Prefer the same baked static-earth slice the strip left of the cave uses
  // (film grain included).
  //
  if (k.getSprite(BG_STATIC_COLOR)) {
    drawWorldSpriteBandSlice(k, leftX, rightX, bottomY, bandEndY, BG_STATIC_COLOR)
    return
  }
  const rgb = glowPitBelowCaveEarthRgb()
  k.drawRect({
    pos: k.vec2(leftX, bottomY),
    width: rightX - leftX,
    height: bandEndY - bottomY,
    color: k.rgb(rgb.r, rgb.g, rgb.b)
  })
}
//
// Earth-band fill under the cave floor — bottom tone of the baked static band.
//
function glowPitBelowCaveEarthRgb() {
  return glowGroundEarthBottomLayerRgb()
}
//
// Horizontal slice of the baked underground band (wavy strata + grain).
//
function drawWorldSpriteBandSlice(k, x1, x2, y1, y2, sprite, opacity = 1) {
  const w = x2 - x1
  const h = y2 - y1
  if (w <= 0 || h <= 0) return
  const opts = {
    sprite,
    pos: k.vec2(x1, y1),
    width: w,
    height: h,
    quad: {
      x: x1 / WORLD_W,
      y: (y1 - PAR_STATIC_WORLD_Y) / PAR_STATIC_WORLD_H,
      w: w / WORLD_W,
      h: h / PAR_STATIC_WORLD_H
    },
    anchor: 'topleft'
  }
  opacity < 0.999 && (opts.opacity = opacity)
  k.drawSprite(opts)
}
//
// Cave rocks/pebbles/seams — last world pass so earth-band fills never clip them.
//
function drawGlowPitCaveRocksOverEarthBand(inst) {
  const pit = inst.pit
  if (!pit) return
  drawGlowPitCaveForegroundDecor(inst.k, pit)
  drawGlowPitCaveSeamCoverRocks(inst.k, pit)
}
//
// Main draw — world layers, then the pit cave rocks and cave hero on top.
//
function onDraw(inst) {
  onDrawWorld(inst)
  drawGlowPitCaveRocksOverEarthBand(inst)
  drawGlowPitCaveHeroForeground(inst)
}
//
// World-layer draw pass (everything that scrolls with the camera).
//
function onDrawWorld(inst) {
  const k = inst.k
  //
  // Back-to-front: everything behind the near forest row goes through one
  // half-resolution offscreen pass, then the near row (its bushes are baked
  // onto its trees). Parallax tree sprites extend below the ground line, so
  // the baked static earth+underground sprite covers that bleed in one draw.
  //
  drawGlowParallaxBackdropOffscreen(inst)
  drawParallaxLayer(inst, PAR_LAYER_NEAR)
  drawWorldSpriteClipped(k, inst, BG_STATIC_COLOR, 1)
  drawGlowPitMouthEarthGapFill(inst, k)
  drawGlowPitCutoutBelowFloorFill(inst, k)
  //
  // Last in onDrawWorld — earth/static/parallax must not repaint over the pit;
  // pixel-snapped cave bake avoids a shimmering left wall while the hero jumps.
  //
  inst._glowPitDrawInOnDrawWorld && inst.pit && drawGlowPitPass(inst)
}
function drawPlayfieldBottomCornerOverlay(inst) {
  const k = inst.k
  const transitionOverlay = k._transitionOverlay
  if (transitionOverlay?.exists?.() && transitionOverlay.opacity > 0.02) return
  const { bottomY, leftX, rightX } = playfieldCornerPositions()
  drawPlayfieldCornerMask(k, leftX, bottomY, 270)
  drawPlayfieldCornerMask(k, rightX, bottomY, 180)
}
//
// Flat earth in the pit mouth cutout (earth band only) — matches the strip
// left of the cave; drawn in onDrawWorld before the pit void, not over the
// cave interior in onDraw.
//
function drawGlowPitMouthEarthGapFill(inst, k) {
  if (!inst.zones.predatorAwake) return
  const pit = inst.pit
  if (!pit?.collapsed || !pit.zone) return
  const { leftX, rightX } = getGlowPitEarthBandMouthCutoutForPit(pit)
  const w = rightX - leftX
  if (w <= 0) return
  const interiorH = Math.min(pit.zone.depth, CAVE_BAND_H)
  const belowH = CAVE_BAND_H - interiorH
  const voidRgb = glowCaveEarthDeepRgb()
  const bottomRgb = glowPitBelowCaveEarthRgb()
  interiorH > 0 && k.drawRect({
    pos: k.vec2(leftX, FLOOR_Y),
    width: w,
    height: interiorH,
    color: k.rgb(voidRgb.r, voidRgb.g, voidRgb.b)
  })
  belowH > 0 && k.drawRect({
    pos: k.vec2(leftX, FLOOR_Y + interiorH),
    width: w,
    height: belowH,
    color: k.rgb(bottomRgb.r, bottomRgb.g, bottomRgb.b)
  })
}
//
// Paints tree-side lake cap rocks when the water zone is open.
//
function drawLakeShoreRocksWorld(inst) {
  const z = inst.zones
  if (!z.water) return
  const k = inst.k
  const white = k.rgb(255, 255, 255)
  inst.rockObjs.forEach(o => {
    if (!o._lakeShoreEnd) return
    drawDecorAtlasSprite(k, o._bakedLakeCap, k.vec2(o._homeX, o._homeY), 'topleft', 0, 1, white)
  })
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
  drawPlayfieldBottomCornerOverlay(inst)
}
//
// Tints border walls with the playfield border tone.
//
function updatePlayfieldBorderColors(inst) {
  if (!inst.wallObjs?.length) return
  const c = snapToPalette({ r: WALL_BORDER_R, g: WALL_BORDER_G, b: WALL_BORDER_B })
  inst.wallObjs.forEach(wall => {
    wall.color = inst.k.rgb(c.r, c.g, c.b)
  })
}
//
// Smooth lean toward each whistle note while the heroine sings idle
//
function updateMushroomWhistleLean(inst) {
  const hero = inst.heroInst
  const dt = inst.k.dt()
  const lifeMul = 1
  //
  // Lean while the idle melody is active — including O-meditation countdown
  // (setEyesClosed clears eyesClosedBySinging, but the whistle keeps playing).
  //
  const singing = false
  const pulse = 0
  const side = 1
  const tramp = inst.trampState
  inst.mushObjs.forEach(obj => {
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
// Midge fill: warm gold.
//
function syncGlowMidgeDrawColor(inst) {
  inst.midges && (inst.midges.midgeRgb = getGlowLightRgb('bright'))
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
  // Only the painted cap counts — isHeroAtTrampolineCap's foot band reaches the
  // lake floor under a docked mushroom, which used to block drowning there.
  //
  if (isHeroStandingOnTrampolineCap(inst, heroX, footY, inst.trampState) ||
    isHeroStandingOnTrampolineCap(inst, heroX, footY, inst.branchTrampState)) return false
  //
  // Over the start branch above the lake floor — not drowning yet
  //
  if (isHeroOverStartBranchX(inst, heroX) && footY < FLOOR_Y - 12) return false
  return isInWaterZone(inst, heroX, footY) && footY >= FLOOR_Y - LOG_SNAP_STANDING_MAX
}
//
// Feet on the cap surface only — not the lake floor under the mushroom's X.
//
function isHeroStandingOnTrampolineCap(inst, heroX, footY, state) {
  if (!state) return false
  const capTopY = FLOOR_Y - TRAMP_TOTAL_H
  if (Math.abs(heroX - state.x) >= TRAMP_CAP_STAND_HALF) return false
  if (footY < capTopY - 10 || footY > capTopY + LOG_SNAP_STANDING_MAX) return false
  const branchPad = state === inst.branchTrampState
  return branchPad
    ? isBranchTrampolineColliderActive(inst.zones)
    : isRightTrampolineColliderActive(inst.zones)
}
//
// Branch-to-lake arcs can leave bounce-air latched while the hero stands in water.
//
function syncTrampBounceAirForLakeFloor(inst, heroX, footY) {
  if (!isInWaterZone(inst, heroX, footY)) return
  if (footY < FLOOR_Y - LOG_SNAP_STANDING_MAX) return
  if (isHeroStandingOnTrampolineCap(inst, heroX, footY, inst.trampState)) return
  if (isHeroStandingOnTrampolineCap(inst, heroX, footY, inst.branchTrampState)) return
  inst.trampBounceAir = false
  inst.branchTrampBounceAir = false
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
  if (HorizFallTwig.isHeroRidingPredator(inst.shoreFallTwigs, char)) return false
  const heroFeet = char.pos.y + SURFACE_DETECT_Y
  const onCap = isHeroAtTrampolineCap(inst, heroX, heroFeet, state)
  if (!wantsTrampolineCapLaunch(inst, char, onCap, state)) return false
  if ((char.vel?.y ?? 0) < -40) return false
  const launch = Math.round(CFG.game.jumpForce * boostMult)
  //
  // jump() drops the platform stick. A raw vel write left the hero glued to the
  // cap, so the next pad move carried him off the view and the camera followed.
  //
  if (typeof char.jump === 'function') char.jump(launch)
  else char.vel.y = -launch
  char.vel.x = 0
  state.cooldown = TRAMP_COOLDOWN
  state.squash = TRAMP_SQUASH_MAX
  inst[bounceAirKey] = true
  hero.wasJumping = true
  hero.jumpPhase = 'jumping'
  hero.jumpCeilingBonk = false
  hero.postLandAirLock = 0
  hero.landSquashTimer = 0
  hero.isSquashing = false
  hero.squashTimer = 0
  hero.canJump = false
  inst.sound && !inst.sound._glowSfxMuted && Sound.playJumpSound(inst.sound)
  afterBounce?.()
  return true
}
//
// True when the hero's feet sit over a mushroom cap (position only).
//
function trampolineCapFloorY(state) {
  return state?.floorY ?? FLOOR_Y
}
//
// Walk surface Y at the top of a mushroom cap (main floor or pit cave).
//
function trampolineCapTopY(state) {
  return trampolineCapFloorY(state) - TRAMP_TOTAL_H
}
function isHeroAtTrampolineCap(inst, heroX, footY, state) {
  if (!state) return false
  const capTopY = trampolineCapTopY(state)
  const mDx = Math.abs(heroX - state.x)
  //
  // Below-cap tolerance widened to match TRAMP_SNAP_BELOW (the tunnel-through
  // rescue's own margin) — it used to be much tighter (+22) than what the
  // rescue considers "still on the cap" (+48), so a hero settling anywhere
  // in that gap (most likely landing near the cap's edge, off dead-centre)
  // read as "not on cap" here and never got a bounce, just stood there.
  //
  return mDx < TRAMP_CAP_STAND_HALF &&
    footY >= capTopY - 10 && footY <= capTopY + TRAMP_SNAP_BELOW
}
//
// True while the hero's feet sit on the trampoline mushroom cap
//
function isOnTrampolineCap(inst, char, state = inst.trampState) {
  if (!char?.pos || !state) return false
  const heroX = char.pos.x
  const heroFeet = char.pos.y + SURFACE_DETECT_Y
  if (!isHeroAtTrampolineCap(inst, heroX, heroFeet, state)) return false
  if (state.pitCaveTramp) return isPitCaveTrampolineColliderActive(inst)
  const branchPad = state === inst.branchTrampState
  return branchPad
    ? isBranchTrampolineColliderActive(inst.zones)
    : isRightTrampolineColliderActive(inst.zones)
}
//
// True while the hero's feet sit on the branch trampoline cap (right of the tree).
//
function isOnBranchTrampolineCap(inst, char) {
  return isOnTrampolineCap(inst, char, inst.branchTrampState)
}
//
// moveTo marks the sprite transform dirty. A raw pos write can leave the
// drawing behind while the camera follows the new coordinates.
//
function moveGlowHeroTo(char, x, y) {
  if (!char?.pos) return
  if (typeof char.moveTo === 'function') {
    char.moveTo(x, y)
    return
  }
  char.pos.x = x
  char.pos.y = y
}
//
// True while Kaplay still treats this pad as the ground under the hero.
//
function heroBodyOnPad(char, pad) {
  const platform = char?.curPlatform?.()
  return Boolean(pad && platform === pad)
}
//
// Drops the stick without changing the launch velocity.
//
function releaseHeroFromPad(char, pad) {
  if (!heroBodyOnPad(char, pad)) return
  const vx = char.vel?.x ?? 0
  const vy = char.vel?.y ?? 0
  if (typeof char.jump === 'function') char.jump(1)
  char.vel && (char.vel.x = vx, char.vel.y = vy)
}
//
// Unsticks the hero, then parks the cap collider off the playfield.
//
function parkTrampolinePad(char, pad) {
  if (!pad) return
  releaseHeroFromPad(char, pad)
  pad.pos.x = -500
  pad.pos.y = PLATFORM_HIDE_Y
}
//
// Keeps the invisible trampoline pad under the mushroom. The pad must NEVER
// teleport to PLATFORM_HIDE_Y / off-screen while the hero could be standing on
// it — Kaplay carries the body with a moved static platform (hero vanishes).
//
function syncTrampolinePad(inst) {
  syncOneTrampolinePad(inst, inst.trampPad, inst.trampState, 'trampBounceAir')
  syncOneTrampolinePad(inst, inst.branchTrampPad, inst.branchTrampState, 'branchTrampBounceAir')
  syncOneTrampolinePad(inst, inst.pitCaveTrampPad, inst.pitCaveTrampState, 'pitCaveTrampBounceAir')
}
//
// Positions one invisible cap collider — never hide it while the hero rides that cap.
//
function syncOneTrampolinePad(inst, pad, state, bounceAirKey) {
  const char = inst.heroInst?.character
  if (!pad || !state) return
  state._prevX = state.x
  const pitPad = state.pitCaveTramp
  const branchPad = !pitPad && state === inst.branchTrampState
  const colliderActive = pitPad
    ? isPitCaveTrampolineColliderActive(inst)
    : branchPad
      ? isBranchTrampolineColliderActive(inst.zones)
      : isRightTrampolineColliderActive(inst.zones)
  //
  // A hero riding the centipede's stick passes the cap — a live pad here
  // shoved him up over the mushroom.
  //
  const riding = HorizFallTwig.isHeroRidingPredator(inst.shoreFallTwigs, char)
  if (!colliderActive || riding) {
    state._capPadLatch = 0
    inst[bounceAirKey] = false
    parkTrampolinePad(char, pad)
    return
  }
  const capTop = trampolineCapTopY(state)
  const velY = char?.vel?.y ?? 0
  const onCap = isOnTrampolineCap(inst, char, state)
  const heroFeet = char?.pos ? char.pos.y + SURFACE_DETECT_Y : 0
  const nearX = char?.pos ? Math.abs(char.pos.x - state.x) < TRAMP_NEAR_X : false
  const grounded = typeof char?.isGrounded === 'function' && char.isGrounded()
  //
  // A bounce that lands away from the cap must end here — the clear further
  // down only runs while the pad is near, so the latch kept the hero drawn
  // in front of the mushroom for good.
  //
  grounded && !onCap && velY >= 0 && (inst[bounceAirKey] = false)
  const bounceAir = Boolean(inst[bounceAirKey])
  const inCapBand = heroFeet >= capTop - 14 && heroFeet <= capTop + TRAMP_PAD_FEET_BELOW
  const onMainFloorLane = !pitPad && isHeroFeetOnMainFloorLane(heroFeet)
  const stickyCap = !onMainFloorLane && nearX && inCapBand &&
    (onCap || bounceAir || grounded || velY > -160)
  if (stickyCap || onCap || bounceAir) {
    state._capPadLatch = TRAMP_CAP_PAD_LATCH_SEC
  } else if (state._capPadLatch > 0) {
    state._capPadLatch = Math.max(0, state._capPadLatch - inst.k.dt())
  }
  //
  // Never yank the invisible pad off-screen while the hero rides the cap —
  // Kaplay carries static bodies with their platform (looks like he vanishes).
  //
  const walkingPastOnFloor = isHeroWalkingPastTrampOnMainFloor(inst, char, heroFeet)
  const fallingOntoCap = !inst.wasGrounded && nearX && inCapBand && velY >= -40 && !onMainFloorLane
  const padLatch = (state._capPadLatch ?? 0) > 0
  const needsPad = colliderActive && !onMainFloorLane && (onCap || bounceAir || padLatch || stickyCap ||
    !walkingPastOnFloor && nearX && inCapBand &&
    (grounded || velY > -80 || fallingOntoCap))
  if (!needsPad) {
    parkTrampolinePad(char, pad)
    return
  }
  const nextX = state.x
  const nextY = capTop + TRAMP_PAD_H / 2
  //
  // A far pad jump while the hero still stands on it drags him with the body.
  //
  if (heroBodyOnPad(char, pad) && Math.hypot(nextX - pad.pos.x, nextY - pad.pos.y) > 24) {
    return
  }
  pad.pos.x = nextX
  pad.pos.y = nextY
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
  const bundle = inst.branchPlatSegs
  if (bundle?.plats?.length) {
    bundle.plats.forEach((plat, i) => {
      const home = bundle.homes[i]
      if (!plat || !home) return
      plat.pos.x = home.x
      plat.pos.y = home.y
    })
    return
  }
  const plat = inst.branchPlat
  const home = inst.branchPlatHome
  if (!plat || !home) return
  plat.pos.x = home.x
  plat.pos.y = home.y
}
//
// One or more static colliders that follow a curved horizontal branch.
//
function createGlowHorizBranchPlatforms(k, horizBranch, platTag, dropY, hideX = null, hideY = null) {
  const segs = horizBranch.platSegs ?? [{
    x1: horizBranch.x1,
    x2: horizBranch.x2,
    y: horizBranch.physY
  }]
  //
  // One flat collider for the whole branch — segment Y drift is visual only.
  //
  const spanX1 = Math.min(...segs.map(s => s.x1))
  const spanX2 = Math.max(...segs.map(s => s.x2))
  const walkTopY = Math.min(...segs.map(s => s.y)) + dropY
  const w = Math.max(4, spanX2 - spanX1)
  const plat = k.add([
    k.rect(w, HORIZ_PLATFORM_H),
    k.pos(hideX ?? spanX1, hideY ?? walkTopY),
    k.anchor('topleft'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  plat.tag(platTag)
  const plats = [plat]
  const homes = [{ x: spanX1, y: walkTopY, x2: spanX2 }]
  const startBranchY = walkTopY
  return {
    plats,
    homes,
    startBranch: { x1: horizBranch.x1, x2: horizBranch.x2, y: startBranchY }
  }
}
//
// Short chime when a new world segment unlocks.
//
function playSegmentRevealSound(inst) {
  if (inst.sound?._glowSfxMuted) return
  Sound.playLetterPickupSoft(inst.sound)
}
//
// Shows the top-centre FPS HUD when any top-bar element is visible.
//
function isGlowTopHudElementVisible(inst) {
  const li = inst.levelIndicator
  if (!li) return false
  if (CFG.debug?.showPerformanceHud) return true
  return true
}
//
// Creates or hides the FPS counter based on visible HUD chrome.
//
function syncGlowFpsHudVisibility(inst) {
  if (!CFG.debug?.showPerformanceHud && !isGlowTopHudElementVisible(inst)) {
    inst.fpsCounter && FpsCounter.setVisible(inst.fpsCounter, false)
    return
  }
  if (!inst.fpsCounter) {
    inst.fpsCounter = FpsCounter.create({
      k: inst.k,
      topY: GLOW_HUD_FPS_TOP_Y,
      textColor: inst.k.rgb(HUD_SCORE_COLOR_SETTLED.r, HUD_SCORE_COLOR_SETTLED.g, HUD_SCORE_COLOR_SETTLED.b),
      outlineColor: inst.k.rgb(VOID.r, VOID.g, VOID.b),
      postBakeCanvas: applyGlowHudSharpBake
    })
  }
  FpsCounter.setVisible(inst.fpsCounter, true)
  layoutGlowFpsHud(inst)
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
  char.hidden = true
  char.opacity = 1
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
// Late-frame trampoline bounce — runs after hero.js land-squash.
//
function registerGlowTrampolineLateBounce(inst) {
  inst.trampLateBounce?.cancel?.()
  inst.trampLateBounce = null
  const char = inst.heroInst?.character
  if (!char) return
  //
  // Scene onUpdate runs before the hero body — bounce must fire after land-squash
  // or jump-6 freezes the hero above the mushroom cap.
  //
  inst.trampLateBounce = char.onUpdate(() => runGlowTrampolineLatePass(inst))
}
//
// Launches from mushroom caps after hero.js has finished its grounded pose.
//
function runGlowTrampolineLatePass(inst) {
  if (inst.drowning || inst.touchDeathHandled) return
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  clampHeroIntoTrampolineCapX(char, inst.trampState)
  clampHeroIntoTrampolineCapX(char, inst.branchTrampState)
  clampHeroIntoTrampolineCapX(char, inst.pitCaveTrampState)
  const heroX = char.pos.x
  const onRightTrampCap = isOnTrampolineCap(inst, char, inst.trampState)
  const onBranchTrampCap = isOnTrampolineCap(inst, char, inst.branchTrampState)
  let bounced = false
  if (isRightTrampolineColliderActive(inst.zones) &&
    wantsTrampolineCapLaunch(inst, char, onRightTrampCap, inst.trampState)) {
    bounced = tryMushroomTrampBounce(inst, inst.trampState, TRAMP_BOOST_MULT, hero, char, heroX,
      () => onTrampolineBounce(inst)) || bounced
  }
  if (isBranchTrampolineColliderActive(inst.zones) &&
    wantsTrampolineCapLaunch(inst, char, onBranchTrampCap, inst.branchTrampState)) {
    bounced = tryMushroomTrampBounce(
      inst,
      inst.branchTrampState,
      BRANCH_TRAMP_BOOST_MULT,
      hero,
      char,
      heroX,
      () => onBranchTrampolineBounce(inst),
      'branchTrampBounceAir'
    ) || bounced
  }
  const onPitCaveTrampCap = isOnTrampolineCap(inst, char, inst.pitCaveTrampState)
  if (isPitCaveTrampolineColliderActive(inst) &&
    wantsTrampolineCapLaunch(inst, char, onPitCaveTrampCap, inst.pitCaveTrampState)) {
    bounced = tryPitCaveTrampTeleport(inst, inst.pitCaveTrampState, hero, char) || bounced
  }
  bounced = ChainEyeTramp.tryChainEyeTrampBounces(inst) || bounced
  bounced && syncTrampolinePad(inst)
  bounced && ChainEyeTramp.syncChainEyeTrampPads(inst)
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
    if (!inst.glowDrownHeroClipLock) return
    const ch = inst.heroInst?.character
    ch && (ch.hidden = true)
    inst.drowning && !inst.deathHandled && applyDrownSinkPose(inst)
  })
  inst.drownCharSink = char?.onUpdate(() => {
    if (!inst.glowDrownHeroClipLock) return
    char.hidden = true
    inst.drowning && !inst.deathHandled && applyDrownSinkPose(inst)
  })
}
//
// Rebakes closed-eye sprites with hollow sockets before the first-G lake sink.
//
function ensureGlowHollowDrownClosedEyes(inst) {
  if (inst.zones?.predatorAwake) return
  const hero = inst.heroInst
  if (!hero?.outlineOnly || hero.transparentEyeInterior) return
  hero.transparentEyeInterior = true
  Hero.loadHeroSprites(hero)
}
//
// Slow sink then sad death sound and level restart; water stays revealed.
//
function startDrowning(inst) {
  if (inst.drowning) return
  if (inst.deathHandled || inst.touchDeathHandled) return
  inst.drownFromStartBranch = Boolean(inst.wasOnStartBranch)
  inst.drowning = true
  inst.glowDrownHeroClipLock = true
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
  ensureGlowHollowDrownClosedEyes(inst)
  Hero.enterCalmPose(inst.heroInst)
  Hero.applyCalmIdleSprite(inst.heroInst)
  //
  // One water-steps take marks the fall into the lake (no loop while sinking).
  //
  Sound.unmuteProceduralSounds()
  Sound.resumeGlobalAudio()
  inst.sound && Sound.resumeAudioContext(inst.sound)
  Sound.stopWaterStepsLoop(inst.sound)
  Sound.playWaterStepsOnce(inst.sound, WATER_STEPS_VOLUME)
  revealWaterZone(inst)
  forceWaterEdgeRocksVisible(inst)
  inst.footParticles && GlowFootParticles.clear(inst.footParticles)
  const char = inst.heroInst.character
  destroyStrayGlowHeroBody(inst.k, char)
  //
  // Drop the body for the sink tween — floor collision otherwise wins every
  // fixedUpdate and the sprite stays on the surface while drownSinkY advances.
  //
  char.has('body') && char.unuse('body')
  char.gravityScale = 0
  char.hidden = true
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
  inst.sound && Sound.stopWaterStepsLoop(inst.sound)
  inst.drownSinkTween?.cancel?.()
  inst.drownSinkTween = null
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
    set(KEY_RESPAWN_NEAR_TREE, false)
    if (resumeBranch) {
      set(KEY_LAST_SPAWN_MODE, SPAWN_MODE_BRANCH)
      set(KEY_LAST_SPAWN_X, inst.startBranch.x1 + (inst.startBranch.x2 - inst.startBranch.x1) * HERO_BRANCH_FRACTION)
      set(KEY_LAST_SPAWN_Y, inst.startBranch.y - SURFACE_DETECT_Y + LOG_SNAP_EMBED)
    } else if (char?.pos) {
      const deathX = char.pos.x
      const deathFootY = char.pos.y + SURFACE_DETECT_Y
      const spawnX = isInWaterZone(inst, deathX, deathFootY)
        ? inst.lakeX2 + DROWN_RESPAWN_LAKE_CLEARANCE
        : deathX
      const spawnY = FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
      persistGlowDeathSpawn(inst, spawnX, spawnY)
    }
    inst.k.go('lesson-glow.0')
  })
}
//
// Shared life-HUD update for any death: −1 experience (floor 0), reveal/flash/
// re-tint the life icon and its particle burst, gentle chime. Shared by drowning
// and touch death.
//
function bumpGlowLifeHudOnDeath(inst) {
  const newLife = applyGlowExperienceDelta(-1)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k)
  }
  syncGlowFpsHudVisibility(inst)
  if (!inst.levelIndicator?.lifeRevealed) return
  inst.levelIndicator.updateLifeScore?.(newLife)
  syncGlowLifeScoreVisibility(inst.levelIndicator)
  Sound.playGentleLifeSound(inst.sound)
  if (inst.levelIndicator?.lifeImage?.sprite?.exists?.()) {
    LevelIndicator.syncLifeHudGrey(inst.levelIndicator, false)
    inst.levelIndicator._lifeFlashLock = true
    const originalColor = inst.levelIndicator.lifeImage.sprite.color
    flashLifeImageOnDrownDeath(inst.k, inst.levelIndicator, originalColor, 0)
    createLifeParticlesOnDrownDeath(inst.k, inst.levelIndicator)
  }
  syncGlowPitCaveFlagForTeacherHints(inst)
  onGlowTeacherLifeHudRevealed(inst)
}
//
// True once the predator's body overlaps the hero's feet, or the hero
// has landed on the hidden spikes at the L-log's right edge.
//
function checkGlowTouchDeath(inst, heroX, heroFootY) {
  if (inst.deathHandled) return
  if (inst.drowning) return
  //
  // Lake drown beats predator overlap — same frame used to start drowning and
  // trigger touch death, which left drowning stuck with no hero and no respawn.
  //
  if (shouldDrownInWater(inst, heroX, heroFootY)) return
  if (inst.k.time() < (inst.touchDeathGraceUntil ?? 0)) return
  if (inst.shoreFallTwigs?.riderLocked) return
  if (HorizFallTwig.isHeroShieldedByTwig(inst.shoreFallTwigs, inst.heroInst?.character)) return
  if (isOnGlowLakeDryFooting(inst, heroX, heroFootY)) return
  if (Predator.isTouchingHero(inst.predator, heroX, heroFootY)) {
    inst._predatorDeathHintContext = capturePredatorDeathHintContext(inst, heroX)
    Predator.notifyKill(inst.predator)
    triggerGlowTouchDeath(inst, 'predator')
    return
  }
}
//
// Touching the predator or falling on the spikes is fatal — the hero
// shatters exactly like in any other level (Hero.death), but with the
// level's own dusty ground-burst (bigger, and spread upward too) instead of
// the generic body-square explosion.
//
function triggerGlowTouchDeath(inst, cause) {
  if (inst.deathHandled) return
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  inst.deathHandled = true
  inst.touchDeathHandled = true
  const deathX = char.pos.x
  const deathY = char.pos.y
  hero.isDying = true
  hero.controllable = false
  hero.controlsDisabled = true
  destroyStrayGlowHeroBody(inst.k, char)
  char.exists() && inst.k.destroy(char)
  glowLevel0LiveHeroChar = null
  hero.character = null
  triggerGlowCameraShake(inst)
  spawnGlowTouchDeathBurst(inst, deathX, deathY)
  finishGlowTouchDeath(inst, cause, deathX, deathY)
}
//
// Leaf-shaped radial burst at the death spot — green leaf tones instead of
// the hero's generic body-square explosion.
//
function spawnGlowTouchDeathBurst(inst, x, y) {
  if (!inst.footParticles) return
  const palette = glowTouchDeathLeafPalette()
  GlowFootParticles.spawnLeafBurst(inst.footParticles, x, y, palette, GLOW_TOUCH_DEATH_PARTICLE_COUNT, FLOOR_Y)
}
//
// The main tree's own green foliage tones, so the burst reads as real leaves
// rather than generic dust.
//
function glowTouchDeathLeafPalette() {
  return (GLOW_PAL.treeColor.leafShades || [GLOW_PAL.treeColor.leaf]).map(hex => glowRgb(hex))
}
//
// Picks the predator death line for this kill (cycles through the set).
//
function predatorDeathHintText(deathOrdinal) {
  const idx = Math.max(0, deathOrdinal - 1) % PREDATOR_DEATH_HINT_TEXTS.length
  return PREDATOR_DEATH_HINT_TEXTS[idx]
}
//
// Picks a predator death line from how the kill happened (mud, grass, charge).
//
function predatorDeathHintTextForKill(deathOrdinal, ctx) {
  const lines = []
  ctx?.fastAttack && lines.push(PREDATOR_DEATH_HINT_FAST)
  ctx?.inMudBand && lines.push(PREDATOR_DEATH_HINT_MUD)
  ctx?.inConcealingGrass && lines.push(PREDATOR_DEATH_HINT_BUSHES)
  if (lines.length) {
    return lines[Math.max(0, deathOrdinal - 1) % lines.length]
  }
  return predatorDeathHintText(deathOrdinal)
}
//
// Snapshot at the touch frame — before notifyKill resets predator state.
//
function capturePredatorDeathHintContext(inst, heroFootX) {
  const pred = inst.predator
  const fastAttack = pred?.state === 'lunge' || pred?.state === 'hunt'
  const inMudBand = isGlowMudBandFootX(inst, heroFootX)
  const inConcealingGrass = isGlowPredatorConcealingGrassFootX(inst, heroFootX)
  return { fastAttack, inMudBand, inConcealingGrass }
}
//
// Soft mud band under the hero's feet (hint-only — ignores predatorAwake gate).
//
function isGlowMudBandFootX(inst, footX) {
  if (inst.mudZoneX1 == null || inst.mudZoneX2 == null) return false
  return footX >= inst.mudZoneX1 && footX <= inst.mudZoneX2
}
//
// Tall grass east of the branch trampoline through the mud band.
//
function isGlowPredatorConcealingGrassFootX(inst, footX) {
  if (isGlowMudBandFootX(inst, footX)) return true
  if (inst.mudZoneX1 == null || inst.branchTrampX == null) return false
  const branchGrassRight = inst.branchTrampX + TRAMP_GRASS_CLEAR_HALF
  return footX >= branchGrassRight && footX < inst.mudZoneX1
}
//
// Life-HUD bump, death hint, then in-level respawn beside the kill.
//
function finishGlowTouchDeath(inst, cause, deathX, deathY) {
  bumpGlowLifeHudOnDeath(inst)
  inst.touchDeathCount = (inst.touchDeathCount || 0) + 1
  if (cause === 'predator') {
    inst.predatorDeathCount = (inst.predatorDeathCount || 0) + 1
    const predatorHint = predatorDeathHintTextForKill(
      inst.predatorDeathCount,
      inst._predatorDeathHintContext
    )
    inst._predatorDeathHintContext = null
    HeroHint.show(
      inst.heroHint,
      predatorHint,
      GLOW_TOUCH_DEATH_HINT_DURATION,
      {
        anchorX: inst.predator?.x ?? deathX,
        anchorY: (inst.predator?.y ?? deathY) - PREDATOR_DEATH_HINT_RAISE,
        offsetY: PREDATOR_DEATH_HINT_OFFSET_Y,
        forceAbove: true,
        ignoreMovementDismiss: true,
        dismissDistance: GLOW_HINT_DISMISS_DISTANCE
      }
    )
  }
  inst.touchDeathRespawnWait?.cancel?.()
  inst.touchDeathRespawnWait = inst.k.wait(GLOW_TOUCH_DEATH_RESPAWN_DELAY, () => {
    inst.touchDeathRespawnWait = null
    inst.touchDeathHandled && respawnGlowHeroAfterTouchDeath(inst, deathX, deathY, cause)
  })
}
//
// Respawn beside the death spot (offset away from the hog, or clear of the
// spike zone), with bootstrap nudges.
//
function computeGlowTouchDeathRespawnPose(inst, deathX, deathY, cause) {
  if (cause === 'predator') {
    const pred = inst.predator
    if (!pred) return { x: deathX, y: deathY }
    let spawnX = resolveGlowPredatorRespawnX(inst, deathX, deathY, pred)
    const spawnY = deathY
    const footY = spawnY + SURFACE_DETECT_Y
    const spawnOnBranch = isHeroOverStartBranchX(inst, spawnX) &&
      footY <= inst.startBranch.y + LOG_SNAP_STANDING_MAX
    const nudge = inst.heroSpawnNudge
    spawnX = nudgeGlowHeroSpawnAwayFromTrampolines({
      spawnX,
      spawnOnBranch,
      branchTrampX: nudge.branchTrampX,
      trampX: nudge.trampX,
      branchTrampVisible: isBranchTrampolineVisible(inst.zones),
      trampVisible: isRightTrampolineVisible(inst.zones)
    })
    spawnX = nudgeGlowHeroSpawnAwayFromMudHazards({
      inst,
      spawnX,
      spawnY,
      spawnOnBranch,
      mudPredatorAmbushTriggerX: nudge.mudPredatorAmbushTriggerX,
      mudPredatorPopX: nudge.mudPredatorPopX,
      mudZoneX1: nudge.mudZoneX1,
      mudZoneX2: nudge.mudZoneX2,
      predator: pred
    })
    spawnX = resolveGlowPredatorRespawnX(inst, spawnX, spawnY, pred)
    return { x: spawnX, y: spawnY }
  }
  return { x: deathX, y: deathY }
}
//
// Picks ground X behind the crawler (opposite its facing) at the current head
// position, then slides along the mud band until the hitbox clears the body.
//
function resolveGlowPredatorRespawnX(inst, deathX, deathY, pred) {
  const predX = pred.x
  const footY = deathY + SURFACE_DETECT_Y
  const pad = MUD_ZONE_CREATURE_MARGIN + 4
  const minX = pred.minX ?? (inst.mudZoneX1 != null ? inst.mudZoneX1 + pad : deathX - 200)
  const maxX = pred.maxX ?? (inst.mudZoneX2 != null ? inst.mudZoneX2 - pad : deathX + 200)
  const push = HERO_PREDATOR_RESPAWN_MIN_FROM_HEAD
  const awayFromDeath = deathX <= predX ? -1 : 1
  let away = -(pred.dir || awayFromDeath)
  let spawnX = clampGlowPredatorRespawnX(predX + away * push, minX, maxX)
  if (Math.abs(spawnX - predX) < push * 0.55) {
    away = -away
    spawnX = clampGlowPredatorRespawnX(predX + away * push, minX, maxX)
  }
  spawnX = slideGlowPredatorRespawnClearOfBody(pred, spawnX, footY, away, minX, maxX)
  if (Predator.overlapsHeroHitbox(pred, spawnX, footY)) {
    away = -away
    spawnX = clampGlowPredatorRespawnX(predX + away * push, minX, maxX)
    spawnX = slideGlowPredatorRespawnClearOfBody(pred, spawnX, footY, away, minX, maxX)
  }
  return spawnX
}
//
// Keeps a respawn X inside the predator patrol band.
//
function clampGlowPredatorRespawnX(x, minX, maxX) {
  return Math.max(minX, Math.min(maxX, x))
}
//
// Nudges spawn along the mud band until the hero feet box clears the body.
//
function slideGlowPredatorRespawnClearOfBody(pred, spawnX, footY, sign, minX, maxX) {
  let x = spawnX
  for (let i = 0; i < 16 && Predator.overlapsHeroHitbox(pred, x, footY); i++) {
    x += sign * 28
    x = clampGlowPredatorRespawnX(x, minX, maxX)
  }
  return x
}
//
// Glow routes landings through the same step timbre as running (footFx is off).
//
function bindGlowHeroFootSounds(heroInst, sound) {
  heroInst.onPlayStepSound = (h) => {
    h.sfx && !sound._glowSfxMuted && Sound.playStepSound(h.sfx, h.stepSoundScene)
  }
  heroInst.onPlayLandSound = (h) => {
    h.sfx && !sound._glowSfxMuted && Sound.playStepSound(h.sfx, h.stepSoundScene)
  }
}
//
// Rebuilds the hero body in-place after a touch death (no scene reload).
//
function respawnGlowHeroAfterTouchDeath(inst, deathX, deathY, cause) {
  const k = inst.k
  const cfg = inst.glowHeroCreateCfg
  if (!cfg) return
  inst.heroHint && HeroHint.clear(inst.heroHint)
  releaseGamePhysicalKeys()
  const pose = computeGlowTouchDeathRespawnPose(inst, deathX, deathY, cause)
  writeGlowLastSpawnKeys(inst, pose.x, pose.y)
  const prev = inst.heroInst
  const stepSound = prev?.onPlayStepSound
  const landSound = prev?.onPlayLandSound
  destroyStrayGlowHeroBody(k)
  prev?.character?.exists?.() && k.destroy(prev.character)
  const fresh = Hero.create({
    ...cfg,
    k,
    x: pose.x,
    y: pose.y,
  })
  Hero.spawn(fresh, { instant: true })
  fresh.onPlayStepSound = stepSound
  fresh.onPlayLandSound = landSound
  inst.heroInst = fresh
  inst.heroHint && (inst.heroHint.heroInst = fresh)
  inst.predator && (inst.predator.hero = fresh)
  glowLevel0LiveHeroChar = fresh.character
  inst.deathHandled = false
  inst.touchDeathHandled = false
  inst.drowning = false
  inst.glowDrownHeroClipLock = false
  inst.drownSinkTween?.cancel?.()
  inst.drownSinkTween = null
  inst.touchDeathGraceUntil = inst.k.time() + TOUCH_DEATH_RESPAWN_GRACE_SEC
  inst.lastHeroX = pose.x
  inst.wasGrounded = false
  inst.trampBounceAir = false
  inst.branchTrampBounceAir = false
  registerGlowTrampolineLateBounce(inst)
  snapGlowCameraToHero(k, fresh)
}
//
// Pulls a ground spawn X clear of an active mushroom trampoline's bounce cap
// (same horizontal band as isHeroAtTrampolineCap) — landing on it would fire
// the automatic bounce the instant the level loads. Branch spawns are left
// alone: the branch sits well above floor Y, outside either cap's Y band.
//
function nudgeGlowHeroSpawnAwayFromTrampolines(cfg) {
  const { spawnX, spawnOnBranch, branchTrampX, trampX, branchTrampVisible, trampVisible } = cfg
  if (spawnOnBranch) return spawnX
  let x = spawnX
  const clearHalf = TRAMP_RADIUS + TRAMP_ADJACENT_X + HERO_TRAMPOLINE_SPAWN_CLEARANCE
  const clearOf = (capX) => {
    if (Math.abs(x - capX) >= clearHalf) return
    x = x >= capX ? capX + clearHalf : capX - clearHalf
  }
  branchTrampVisible && clearOf(branchTrampX)
  trampVisible && clearOf(trampX)
  return x
}
//
// Pulls a saved spawn X away from the mud hazard band so a reload cannot drop
// the hero straight onto the crawler.
//
function nudgeGlowHeroSpawnAwayFromMudHazards(cfg) {
  const {
    inst,
    spawnX,
    spawnY,
    spawnOnBranch,
    mudPredatorAmbushTriggerX,
    mudPredatorPopX,
    predator
  } = cfg
  let x = spawnX
  const heroFootY = spawnY + SURFACE_DETECT_Y
  if (!spawnOnBranch && predator && inst) {
    Predator.overlapsHeroHitbox(predator, x, heroFootY) &&
      (x = resolveGlowPredatorRespawnX(inst, x, spawnY, predator))
  }
  if (!spawnOnBranch && mudPredatorAmbushTriggerX != null && mudPredatorPopX != null) {
    const dangerEndX = mudPredatorPopX + MUD_ZONE_PREDATOR_DANGER_MARGIN
    x >= mudPredatorAmbushTriggerX && x <= dangerEndX &&
      (x = mudPredatorAmbushTriggerX - HERO_MUD_HAZARD_SPAWN_CLEARANCE)
  }
  return x
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
}
//
// Reveals the lake after the hero drowns in it (or when reloading a save that
// already discovered water). The first-time hint plays on the live drowning.
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
  revealLeftShoreRock(inst)
  syncGlowAtmosphereZones(inst)
  if (showHint && firstOpen) {
    showWaterZoneDiscoveryHint(inst)
  } else {
    showLakeShoreRocks(inst)
    forceWaterEdgeRocksVisible(inst)
    applyZoneVisibility(inst)
  }
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
}
//
// Midges follow which sides of the ground the hero has opened.
//
function syncGlowAtmosphereZones(inst) {
  syncGlowMidgesZones(inst.midges, inst.zones, Boolean(inst.pit?.collapsed))
}
//
// Checks whether the hero position should unlock left/right ground decor.
// Decor only appears when the hero is on the floor — not on the start branch.
//
function checkGroundDecorReveal(inst, heroX, footY, grounded, justLanded) {
  if (!grounded || footY < FLOOR_Y - 28) return
  updateGroundRightStripReveal(inst, heroX)
}
//
// Pit level indicator ref — keep the live HUD pointer on the pit state.
//
function syncGlowPitLevelIndicator(inst) {
  if (!inst.pit || !inst.levelIndicator) return
  inst.pit.levelIndicator = inst.levelIndicator
}
//
// True when the hero's feet are on the open cave pit floor collider.
//
function isHeroOnGlowPitFloor(inst, char, grounded, footY) {
  const pit = inst.pit
  if (!pit?.collapsed || !char?.pos) return false
  const bottomY = pit.floorY + pit.zone.depth
  return grounded && footY >= bottomY - 28 && footY <= bottomY + 10
}
//
// Keeps jump input alive on the cave pit floor — Kaplay grounded flicker
// there used to leave canJump false between frames.
//
function refreshGlowPitFloorJumpState(inst, char, grounded, footY) {
  if (!isHeroOnGlowPitFloor(inst, char, grounded, footY)) return
  const hero = inst.heroInst
  if (!hero || hero.isSquashing || hero.jumpPhase === 'jumping') return
  hero.canJump = true
  hero.jumpDisabled = false
  hero.controllable = true
  hero.controlsDisabled = false
}
//
// Kaplay grounded flicker on the thin start-branch collider can leave
// canJump false — refresh every frame while the hero stands on the branch.
//
function refreshGlowBranchJumpState(inst, char) {
  if (!char?.pos || !isHeroOnStartBranch(inst, char)) return
  const hero = inst.heroInst
  if (!hero || hero.isSquashing) return
  const grounded = char.isGrounded?.() ?? false
  const velY = char.vel?.y ?? 0
  if (!grounded && Math.abs(velY) > 64) return
  if (grounded && inst._pitMushroomBranchLaunchLatch) {
    Hero.syncPlatformLanding(hero)
    hero.jumpPhase = 'none'
    hero.wasJumping = false
    hero.postLandAirLock = 0
    inst._pitMushroomBranchLaunchLatch = false
  }
  hero.canJump = true
  hero.jumpKeyReleaseGate = false
  hero.jumpDisabled = false
  hero.controllable = true
  hero.controlsDisabled = false
}
//
// Thin colliders near the branch trampoline can flicker isGrounded — clear a
// stuck jump pose once the hero is firmly on the main floor (not the cap).
//
function refreshGlowMainGroundJumpState(inst, char, grounded, footY) {
  if (!char?.pos || !grounded) return
  if (footY < FLOOR_Y - LOG_SNAP_STANDING_MAX) return
  if (isInWaterZone(inst, char.pos.x, footY)) return
  if (isHeroOnStartBranch(inst, char)) return
  if (inst.trampBounceAir || inst.branchTrampBounceAir) return
  if (isOnTrampolineCap(inst, char, inst.trampState)) return
  if (isOnTrampolineCap(inst, char, inst.branchTrampState)) return
  const hero = inst.heroInst
  if (!hero || hero.isSquashing || glowHeroInTrampLandingPose(hero)) return
  const velY = char.vel?.y ?? 0
  if (Math.abs(velY) > 48) return
  if (grounded && inst._pitMushroomBranchLaunchLatch) {
    Hero.syncPlatformLanding(hero)
    hero.jumpPhase = 'none'
    hero.wasJumping = false
    hero.postLandAirLock = 0
    inst._pitMushroomBranchLaunchLatch = false
    hero.canJump = true
    hero.jumpKeyReleaseGate = false
    hero.jumpDisabled = false
    hero.controllable = true
    hero.controlsDisabled = false
    return
  }
  if (hero.jumpPhase !== 'jumping') return
  Hero.syncPlatformLanding(hero)
  hero.wasJumping = false
  hero.postLandAirLock = 0
}
//
// Per-frame camera follow — horizontal scroll only.
//
const RIDE_CAM_STEP_PX = 1

//
// Whole-pixel camera while the hero rides the centipede. Only advances once
// the head has actually travelled a pixel, so decor never shimmers.
//
function stepGlowRideCameraX(inst, raw) {
  const prev = inst._rideCamX
  if (prev == null) {
    inst._rideCamX = Math.round(raw)
    return inst._rideCamX
  }
  if (raw >= prev + RIDE_CAM_STEP_PX) inst._rideCamX = Math.floor(raw)
  else if (raw <= prev - RIDE_CAM_STEP_PX) inst._rideCamX = Math.ceil(raw)
  return inst._rideCamX
}

function updateGlowCamera(inst) {
  const ch = inst.heroInst?.character
  if (!ch?.pos || !inst.camera) return
  inst.camera && GlowCamera.updateShake(inst.camera, inst.k.dt())
  const inPitCave = Boolean(inst._inGlowPitCave)
  const grounded = typeof ch.isGrounded === 'function' && ch.isGrounded()
  //
  // Riding the stick is not a Kaplay ground contact, so the camera dropped
  // pixel alignment and the whole ground layer shimmered by a pixel.
  //
  const ridingStick = HorizFallTwig.isHeroRidingPredator(inst.shoreFallTwigs, ch)
  //
  // The stick point the hero is pinned to wobbles by a fraction of a pixel.
  // Following that wobble made every ground sprite shimmer. The camera steps
  // in whole pixels with the centipede's head instead.
  //
  const followX = ridingStick
    ? stepGlowRideCameraX(inst, inst.predator?.x ?? ch.pos.x)
    : (inst._rideCamX = null, ch.pos.x)
  const pixelAlignCamX = !ridingStick && !inPitCave && grounded
  GlowCamera.followHero(inst.camera, followX, ch.pos.y, pixelAlignCamX)
  !inst.heroInst?.isSubmerging && !inPitCave && !ridingStick &&
    GlowCamera.snapHeroScreenY(inst.k, inst.heroInst, inst.k.camPos().y)
}
//
// First visit with no explored zones: ease the camera from a tight view to full width.
//
function maybeStartGlowCameraIntro(inst) {
  const k = inst.k
  k.camScale(1)
  set(KEY_CAMERA_INTRO_DONE, true)
  snapGlowCameraToHero(k, inst.heroInst)
  updateGlowCamera(inst)
}
function snapGlowCameraToHero(k, heroInst) {
  const ch = heroInst?.character
  if (!ch?.pos) return
  const half = VIEW_W / 2
  const minX = LEFT_MARGIN + half
  const maxX = WORLD_W - RIGHT_MARGIN - half
  const camX = Math.max(minX, Math.min(maxX, ch.pos.x))
  GlowCamera.setCamPosForPixelAlignedSubjectX(
    k, ch.pos.x, camX, Math.round(DESIGN_SCREEN_H / 2)
  )
}
//
// Full-screen void curtain — async bootstrap yields to the engine between
// k.add() calls, so without this the wrong colour phase can flash for a frame.
//
function createGlowBootstrapCurtain(k) {
  const voidColor = k.rgb(OUTER.r, OUTER.g, OUTER.b)
  return k.add([
    k.fixed(),
    k.pos(0, 0),
    k.z(GLOW_BOOTSTRAP_CURTAIN_Z),
    k.rect(k.width(), k.height()),
    k.color(voidColor)
  ])
}
function destroyGlowBootstrapCurtain(curtain) {
  curtain?.destroy?.()
}
//
// Removes a duplicate hero body left by an aborted scene bootstrap.
//
function destroyStrayGlowHeroBody(k, keep = null) {
  const stray = glowLevel0LiveHeroChar
  if (!stray || stray === keep || !stray.exists?.()) return
  k.destroy(stray)
  glowLevel0LiveHeroChar = keep
}
//
// Mud run/jump tuning — only when grounded on the band (see onUpdate hero pass).
//
function applyGlowHeroMudPhysics(inst, hero, char, heroX, grounded, justLanded) {
  if (!hero || !char) return
  if (inst.mudZoneX1 == null) {
    hero.moveSpeedMult = 1
    hero.jumpSquashTimeMult = 1
    hero.jumpForceMult = 1
    hero.mudJumpActive = false
    inst.mudJumpTakeoff = false
    return
  }
  const groundedOnMud = grounded && isHeroInMudZone(inst, heroX)
  hero.moveSpeedMult = groundedOnMud ? MUD_MOVE_SPEED_MULT : 1
  hero.jumpSquashTimeMult = groundedOnMud ? MUD_JUMP_SQUASH_TIME_MULT : 1
  hero.jumpForceMult = groundedOnMud ? MUD_JUMP_FORCE_MULT : 1
  groundedOnMud && hero.isSquashing && (inst.mudJumpTakeoff = true)
  !groundedOnMud && !hero.mudJumpActive && (inst.mudJumpTakeoff = false)
  hero.jumpPhase === 'jumping' && inst.mudJumpTakeoff &&
    (hero.mudJumpActive = true, inst.mudJumpTakeoff = false)
  justLanded && (hero.mudJumpActive = false)
  char.gravityScale = hero.mudJumpActive ? MUD_GRAVITY_MULT : 1
}
//
// Trampoline pad sync + cap snap — must run every frame so the invisible cap
// moves off once the hero walks away.
//
function syncGlowHeroTrampolinePads(inst, char, heroX, footY) {
  isRightTrampolineColliderActive(inst.zones) &&
    snapHeroToOneTrampolineCap(inst, char, heroX, footY, inst.trampState)
  isBranchTrampolineColliderActive(inst.zones) &&
    snapHeroToOneTrampolineCap(inst, char, heroX, footY, inst.branchTrampState)
  isPitCaveTrampolineColliderActive(inst) &&
    snapHeroToOneTrampolineCap(inst, char, heroX, footY, inst.pitCaveTrampState)
  pinHeroToMainFloorOverTrampoline(inst, char, inst.trampState)
  pinHeroToMainFloorOverTrampoline(inst, char, inst.branchTrampState)
  syncTrampolinePad(inst)
}
//
// Per-frame update.
//
function onUpdate(inst) {
  const k = inst.k
  inst.zones._sceneRef = inst
  if (inst._glowBirdsBootstrapKick) {
    inst._glowBirdsBootstrapKick = false
    ensureGlowBirdsBackgroundPlaying(inst)
  }
  if (inst.drowning) {
    const drownChar = inst.heroInst?.character
    inst.glowDrownHeroClipLock && drownChar && (drownChar.hidden = true)
    updateGlowCamera(inst)
    return
  }
  syncGlowPredatorPatrolBounds(inst)
  tickGlowTreeFruits(inst, k.dt(), FLOOR_Y)
  inst.spikyTomatoes && SpikyTomato.onUpdate(inst.spikyTomatoes, k.dt())
  inst.shoreFallTwigs && HorizFallTwig.tickTwigPredatorRide(inst.shoreFallTwigs, k.dt())
  inst.predator && (inst.predator.homeX = inst.trampState?.x ?? inst.predator.homeX)
  inst.predator && !inst.predator.obj?.hidden && Predator.update(inst.predator, k.dt())
  inst.shoreFallTwigs && HorizFallTwig.onUpdate(
    inst.shoreFallTwigs, k.dt(), FLOOR_Y, inst.predator, inst.heroInst?.character
  )
  if (inst.touchDeathHandled) {
    inst.footParticles && GlowFootParticles.onUpdate(inst.footParticles, k.dt())
    inst.fpsCounter && FpsCounter.onUpdate(inst.fpsCounter)
    return
  }
  inst.fpsCounter && FpsCounter.onUpdate(inst.fpsCounter)
  if (inst.pendingGlowIntro) {
    inst.introHintDelayRemaining += k.dt()
    if (inst.introHintDelayRemaining >= CAMERA_INTRO_HINT_DELAY) {
      inst.pendingGlowIntro = false
      inst.introHintDelayRemaining = 0
      startGlowIntro(inst)
    }
  }
  if (inst.pendingReplayIntro2) {
    inst.introHintDelayRemaining += k.dt()
    if (inst.introHintDelayRemaining >= CAMERA_INTRO_HINT_DELAY) {
      inst.pendingReplayIntro2 = false
      inst.introHintDelayRemaining = 0
      startGlowIntro(inst)
    }
  }
  if (inst.introLock && inst.introHintPhase === INTRO_HINT_PHASE_TWO &&
    !HeroHint.isActive(inst.heroHint)) {
    inst.introHintOnComplete?.()
  }
  if (inst._mushroomLeanActive) {
    updateMushroomWhistleLean(inst)
    inst._mushroomLeanActive = inst.mushObjs.some(obj => !obj.hidden && Math.abs(obj.leanAngle ?? 0) > 0.2)
  }
  syncShoreBranchPlatform(inst)
  ChainEyeTramp.syncChainEyeTrampPads(inst)
  syncGlowPitLevelIndicator(inst)
  inst.trampState.cooldown > 0 && (inst.trampState.cooldown = Math.max(0, inst.trampState.cooldown - k.dt()))
  inst.branchTrampState?.cooldown > 0 &&
    (inst.branchTrampState.cooldown = Math.max(0, inst.branchTrampState.cooldown - k.dt()))
  inst.pitCaveTrampState?.cooldown > 0 &&
    (inst.pitCaveTrampState.cooldown = Math.max(0, inst.pitCaveTrampState.cooldown - k.dt()))
  inst.trampState.squash > 0 && (inst.trampState.squash = Math.max(0, inst.trampState.squash - k.dt() * 4))
  inst.branchTrampState?.squash > 0 &&
    (inst.branchTrampState.squash = Math.max(0, inst.branchTrampState.squash - k.dt() * 4))
  inst.pitCaveTrampState?.squash > 0 &&
    (inst.pitCaveTrampState.squash = Math.max(0, inst.pitCaveTrampState.squash - k.dt() * 4))
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  //
  // Glow owns all foot FX — block hero.js dust for the whole frame.
  //
  hero.suppressDust = true
  hero.controllable = true
  hero.controlsDisabled = false
  hero.jumpDisabled = false
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  inst.chainBuoys &&
    ChainBuoy.onUpdate(inst.chainBuoys, heroX, char.pos.y, k.dt())
  inst.earTrees && EarTree.onUpdate(inst.earTrees, k.dt())
  updateGlowPlantWhisperSound(inst, char)
  updateGlowProximitySound(inst, char)
  const heroMoving = Math.abs(heroX - inst.lastHeroX) > 0.5
  updateBranchSpawnLook(inst, hero, heroMoving)
  const grounded = char.isGrounded?.() ?? false
  const justLanded = grounded && !inst.wasGrounded
  //
  // refreshGlowMainGroundJumpState clears wasJumping before foot bursts run —
  // latch landing dust here while jump state is still intact.
  //
  const landingFootBurst = justLanded && (hero.wasJumping || hero.jumpPhase === 'jumping')
  refreshGlowBranchJumpState(inst, char)
  refreshGlowMainGroundJumpState(inst, char, grounded, footY)
  syncGlowBranchJumpReady(inst, char, grounded)
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
  syncGlowHeroTrampolinePads(inst, char, heroX, footY)
  inst.wasGrounded = char.isGrounded?.() ?? false
  //
  // Bounce is the main L-log trigger; a jump-land on the cap is the backup.
  //
  const surface = detectGlowSurface(inst)
  inst.sound._l2Surface = surface === 'wood' ? 'wood' : null
  if (surface === 'wood' || surface === 'ground' || surface === 'mud') {
    inst.sound._glowSurface = surface
    inst._glowLastFootSurface = surface
  }
  //
  // Mud movement/jump only when grounded on the band; airborne over mud keeps
  // the takeoff arc from a mushroom bounce or a mud launch already in flight.
  //
  applyGlowHeroMudPhysics(inst, hero, char, heroX, grounded, justLanded)
  maybePlayGlowEarlyLandSfx(inst, char, hero, footY, grounded)
  //
  // Landing SFX backup (collide path can miss on wood flicker / air-lock).
  // The start branch has its own dedicated wood-land trigger below — this
  // backup must skip it, or the very first landing (and any later branch
  // landing) fires both, smearing a single thump into an audible double-hit.
  //
  if (justLanded && !inst._glowEarlyLandSfxDone && (surface === 'wood' || surface === 'ground') &&
    !inst.sound._glowSfxMuted &&
    !inst.expectBranchWoodLandSound && !isHeroOnStartBranch(inst, char)) {
    if ((hero.landFxCooldown || 0) <= 0) {
      hero.landFxCooldown = 0.2
      surface === 'ground'
        ? Sound.playStepSound(inst.sound, 'lesson-glow.0')
        : Sound.playLandSound(inst.sound, 'lesson-glow.0')
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
  char.hidden && !inst.glowDrownHeroClipLock && !inst.pitCaveHeroForeground &&
    (char.hidden = false)
  typeof char.opacity === 'number' && char.opacity < 1 &&
    (char.opacity = 1)
  snapHeroToLogPlatforms(inst, char)
  !isOnGlowLakeDryFooting(inst, heroX, footY) && HorizFallTwig.snapHeroPredatorTwigRide(inst.shoreFallTwigs, char, inst.heroInst)
  inst.shoreFallTwigs && HorizFallTwig.tryPredatorTurnTowardIslandAfterLanding(
    inst.shoreFallTwigs,
    inst,
    char,
    isOnGlowLakeDryFooting
  )
  inst.shoreFallTwigs && HorizFallTwig.tickPredatorIslandRetreatFallback(
    inst.shoreFallTwigs,
    inst,
    char,
    isOnGlowLakeDryFooting
  )
  snapHeroToStartBranch(inst, char, heroX, footY)
  snapHeroToShoreBranch(inst, char, heroX, footY)
  snapHeroToMainGround(inst, char, grounded, heroX, footY)
  refreshGlowBranchJumpState(inst, char)
  refreshGlowMainGroundJumpState(inst, char, grounded, footY)
  const groundedOnBranch = (char.isGrounded?.() ?? false) && isHeroOnStartBranch(inst, char)
  const wantBranchWoodLand = groundedOnBranch &&
    (!inst.wasGroundedOnBranch || inst.expectBranchWoodLandSound)
  if (wantBranchWoodLand && !inst.sound._glowSfxMuted && !inst._glowEarlyLandSfxDone) {
    const branchHero = inst.heroInst
    if (branchHero) {
      branchHero.landFxCooldown = 0.2
      inst.sound._glowSurface = 'wood'
      Sound.playLandSound(inst.sound, 'lesson-glow.0')
    }
    inst.expectBranchWoodLandSound = false
  }
  inst.wasGroundedOnBranch = groundedOnBranch
  //
  // Foot bursts run after wood snaps so feet position and surface match the
  // solid collider — spawning earlier misread branch/log landings as ground.
  //
  const snapHeroX = char.pos.x
  const snapFootY = char.pos.y + SURFACE_DETECT_Y
  const snapSurface = detectGlowSurface(inst)
  const allowFootBurst = canSpawnGlowFootBurst(inst, char)
  if (landingFootBurst && allowFootBurst) {
    const lakeFloorLand = isInWaterZone(inst, snapHeroX, snapFootY) &&
      snapFootY >= FLOOR_Y - LOG_SNAP_STANDING_MAX
    !lakeFloorLand &&
      spawnGlowFootLanding(inst.footParticles, snapHeroX, snapFootY, snapSurface, inst, char)
  }
  if (startedRunning && allowFootBurst && !isInWaterZone(inst, snapHeroX, snapFootY)) {
    spawnGlowFootLanding(inst.footParticles, snapHeroX, snapFootY, snapSurface, inst, char)
  }
  syncGlowWorldBirdsVolume(inst)
  syncGlowPredatorVisibility(inst)
  updateTrampCheekyHint(inst)
  updateBranchTrampCheekyHint(inst)
  syncGlowPitCaveFlagForTeacherHints(inst)
  updateGlowTeacherContextHints(inst, char, hero, heroMoving, k.dt())
  tickGlowStartBranchFatigue(inst, char, grounded, justLanded)
  tickGlowShoreBranchTwigs(inst, char, hero, grounded, justLanded)
  tickGlowTomatoTreeLanding(inst, char, grounded, justLanded)
  updateGlowMidges(inst.midges, k.dt(), 1)
  updateGlowPit(inst.pit, char)
  maybeLaunchFromPitCaveMushroomOnLand(inst, char, grounded, justLanded)
  refreshGlowPitFloorJumpState(inst, char, grounded, footY)
  inst.footParticles && GlowFootParticles.onUpdate(inst.footParticles, k.dt())
  syncGlowAtmosphereZones(inst)
  //
  // Platform zone reveals — detect descending hero over trigger volumes.
  //
  checkGroundDecorReveal(inst, heroX, footY, grounded, justLanded)
  //
  // Lake drowning — after ground snap so the hero stands on the floor first.
  //
  syncTrampBounceAirForLakeFloor(inst, heroX, footY)
  !inst.deathHandled && !inst.drowning &&
    shouldDrownInWater(inst, heroX, footY) && startDrowning(inst)
  //
  // Camera tracks the hero after all movement (drowning may have started above).
  //
  updatePitCaveSkeletonAutoHint(inst, char, k.dt())
  syncGlowBranchJumpReady(inst, char, grounded)
  syncHeroTrampDrawOrder(inst)
  syncGlowPitCaveHeroForegroundDraw(inst, char, footY)
  syncGlowPitHeroDrawOrder(inst, char, footY)
  updateGlowCamera(inst)
  inst.lastHeroX = char.pos.x
  //
  // Predator touch death — last check of the frame since it may destroy
  // the hero's character outright.
  //
  !inst.deathHandled && checkGlowTouchDeath(inst, heroX, footY)
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
// Predator patrol strip — between the lake's east edge and the cave mouth.
//
function computeGlowPredatorPatrolBounds(lakeX2) {
  const crack = getCrackZone(WORLD_W, FLOOR_Y)
  const caveMouthX = getGlowCaveMouthFloorLeftX(crack)
  let minX = LEFT_MARGIN + 36
  let maxX = caveMouthX - PREDATOR_CAVE_MOUTH_PAD
  if (lakeX2 != null) {
    minX = Math.max(minX, lakeX2 + PREDATOR_LAKE_EDGE_PAD)
  }
  if (maxX <= minX + 80) {
    maxX = minX + 80
  }
  return { minX, maxX }
}
function syncGlowPredatorPatrolBounds(inst) {
  const pred = inst.predator
  if (!pred) return
  const bounds = computeGlowPredatorPatrolBounds(inst.lakeX2)
  pred.minX = bounds.minX
  pred.maxX = bounds.maxX
  //
  // A fleeing centipede may swim past the patrol strip across the lake, and so
  // may one swimming back from the island — clamping that one snapped its
  // head onto the shore and dragged the body across the water.
  //
  if (pred.state === 'flee' || pred.islandRetreatX != null) return
  pred.x < pred.minX && (pred.x = pred.minX)
  pred.x > pred.maxX && (pred.x = pred.maxX)
}
function glowPredatorCanHuntHero(inst) {
  const char = inst.heroInst?.character
  const pred = inst.predator
  if (!char?.pos || inst.drowning || inst.deathHandled || !pred) return false
  if (HorizFallTwig.isHeroShieldedByTwig(inst.shoreFallTwigs, char)) return false
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (isOnGlowLakeDryFooting(inst, char.pos.x, footY)) return false
  const predatorGroundY = pred.groundAt(char.pos.x)
  return Math.abs(footY - predatorGroundY) <= GLOW_PREDATOR_HERO_VERTICAL_BAND_PX
}
function triggerGlowBranchLandingShake(inst) {
  inst.camera && GlowCamera.triggerShake(inst.camera, GLOW_BRANCH_JUMP_SHAKE_AMP, GLOW_BRANCH_JUMP_SHAKE_DURATION)
}
//
// Ground landings near a lip-tree jolt it; the third jolt drops its tomato.
//
function tickGlowTomatoTreeLanding(inst, char, grounded, justLanded) {
  if (!justLanded || !grounded || !inst.spikyTomatoes) return
  if (!isOnGlowMainGroundFoot(char.pos.y + SURFACE_DETECT_Y)) return
  SpikyTomato.onHeroLanded(inst.spikyTomatoes, char.pos.x)
}
//
// Tomato burst on the ground — camera jolt, and a nearby centipede bolts away.
//
function onGlowTomatoExplode(inst, x, y) {
  triggerGlowCameraShake(inst)
  grantGlowTomatoBurstHeroSafety(inst, x, y)
  inst.predator && !inst.predator.obj?.hidden && Predator.startFlee(inst.predator, x)
}
//
// A burst under the hero used to overlap with flee touch-kill — keep him alive
// and in place while the centipede bolts away.
//
function grantGlowTomatoBurstHeroSafety(inst, burstX, burstY) {
  const char = inst.heroInst?.character
  if (!char?.pos) return
  const footY = char.pos.y + SURFACE_DETECT_Y
  const by = burstY ?? FLOOR_Y
  const d = Math.hypot(char.pos.x - burstX, footY - by)
  if (d > TOMATO_BURST_HERO_SAFE_RADIUS) return
  inst.touchDeathGraceUntil = inst.k.time() + TOMATO_BURST_HERO_SAFE_SEC
}
function tickGlowStartBranchFatigue(inst, char, grounded, justLanded) {
  if (!justLanded || !grounded || !isHeroOnStartBranch(inst, char)) return
  triggerGlowBranchLandingShake(inst)
  if (!inst.treeFruitSpots?.some(f => f.anchor && f.attached)) return
  inst._branchLandingsSinceTree = (inst._branchLandingsSinceTree || 0) + 1
  inst._branchLandingsSinceTree >= GLOW_START_BRANCH_LANDINGS_TO_DROP_FRUIT &&
    releaseGlowAnchorFruit(inst)
}
//
// True when the hero's feet stand on the invisible start-branch collider
//
function isHeroOnStartBranch(inst, char) {
  if (!char?.pos) return false
  const bundle = inst.branchPlatSegs
  const plats = bundle?.plats ?? (inst.branchPlat ? [inst.branchPlat] : [])
  const cur = char.curPlatform?.()
  if (cur && plats.some(plat => plat === cur)) return true
  const branch = inst.startBranch
  if (!branch) return false
  const footY = char.pos.y + SURFACE_DETECT_Y
  const homes = bundle?.homes
  if (homes?.length) {
    return homes.some(seg => {
      const x2 = seg.x2 ?? seg.x
      return char.pos.x >= seg.x && char.pos.x <= x2 &&
        footY >= seg.y - 8 && footY <= seg.y + LOG_SNAP_STANDING_MAX + 6
    })
  }
  return char.pos.x >= branch.x1 && char.pos.x <= branch.x2 &&
    footY >= branch.y - 8 && footY <= branch.y + LOG_SNAP_STANDING_MAX + 6
}
//
// Blocks foot bursts on any wood collider (branch, L/O/W logs, bonus log).
//
function isGlowWoodFootPosition(inst, footX, footY, char) {
  if (!inst) return false
  if (inst.sound?._glowSurface === 'wood') return true
  if (isOverGlowWoodSurface(inst, footX, footY)) return true
  if (char && isHeroOnStartBranch(inst, char)) return true
  if (isHeroOverStartBranchX(inst, footX) && footY < FLOOR_Y - 24) return true
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
  if (isHeroInMudZone(inst, footX)) return false
  if (detectGlowSurface(inst) === 'wood') return false
  if (isGlowWoodFootPosition(inst, footX, footY, char)) return false
  return isOnGlowMainGroundFoot(footY)
}
//
// Clears the active teacher-hint bubble on the eye HUD if its text matches
// (no-op otherwise) — shared by every "retire this specific hint early"
// caller below, since a hint reaching its max show count only blocks FUTURE
// fires and never touches a bubble already on screen.
//
function dismissGlowTeacherHintByText(inst, text) {
  if (inst.lastGlowTeacherHintText !== text) return
  inst.lastGlowTeacherHintText = null
  if (!HeroHint.isActive(inst.heroHint) || !inst._glowTeacherHintActive) return
  HeroHint.clear(inst.heroHint)
  inst._glowTeacherHintActive = false
}
//
// Retires the "step on a mushroom?" cave nudge once the hero actually
// launches off the pit mushroom (dismissPitCaveMushroomHint already blocks
// it from firing again, but does not hide a bubble already on screen).
//
function dismissGlowCaveMushroomTeacherHint(inst) {
  dismissGlowTeacherHintByText(inst, PIT_CAVE_HINT_TEXT)
}
//
// Counts trampoline bounces; every Nth bounce shows a cheeky bubble on the cap
//
function onTrampolineBounce(inst) {
  const tw = inst.rightTrampCheeky
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
  inst.expectBranchWoodLandSound = true
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
  const tw = inst.rightTrampCheeky
  if (!tw || tw.cheekyTimer <= 0) return
  tw.cheekyTimer -= inst.k.dt()
  if (tw.cheekyTimer > 0) return
  tw.cheekyTooltip && Tooltip.destroy(tw.cheekyTooltip)
  tw.cheekyTooltip = null
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
// True when the main tree sprite was baked during the pre-level transition.
//
function glowTreeSpritesPrewarmed(k) {
  return Boolean(k.getSprite(TREE_COLOR_SPRITE_NAME))
}
//
// True when parallax static layer exists from prewarm.
//
function glowParallaxSpritesPrewarmed(k) {
  return Boolean(k.getSprite(BG_STATIC_COLOR) && k.getSprite(BG_PAR_TREE1_COLOR))
}
//
// Bakes the full colour tree as one sprite cropped to its artwork. The crop
// offset is stashed for the tree object to draw at (see
// monolithicTreeBakeOffset).
//
function bakeMonolithicGlowTreeSprites(k, treeData) {
  const colorCanvas = renderGlowTreeToCanvas(treeData, getTreePaletteColorForCorner(MAIN_TREE_PARALLAX_FOLIAGE_CORNER), WORLD_W, WORLD_H)
  const bounds = measureCanvasContentBounds(colorCanvas, TREE_CROP_PAD)
  monolithicTreeOffsets.set(k, { x: bounds?.x ?? 0, y: bounds?.y ?? 0 })
  loadCroppedGlowTreeSprite(k, TREE_COLOR_SPRITE_NAME, colorCanvas, bounds, TREE_COLOR_GRAIN_SEED)
}
//
// Loads one monolithic tree canvas cropped to its artwork, with film grain
// baked in afterwards (grain only touches opaque pixels, so cropping first
// changes nothing visually and scans far fewer pixels).
//
function loadCroppedGlowTreeSprite(k, name, canvas, bounds, grainSeed) {
  const cropped = bounds ? cropCanvasToBounds(canvas, bounds) : canvas
  bounds && releaseCanvas(canvas)
  applyGlowMaterialBake(cropped, grainSeed)
  k.loadSprite(name, cropped)
  releaseCanvas(cropped)
}
//
// Crop offset of the monolithic tree sprites for the live Kaplay instance.
//
function monolithicTreeBakeOffset(k) {
  return monolithicTreeOffsets.get(k) || { x: 0, y: 0 }
}
//
// Soft right-ground opacity: opened land is solid, the unknown fades out.
//
function glowRightWorldOpacity(sc, x, rank) {
  if (!sc?.zones) return 0
  if (!sc.zones.predatorAwake) return 0
  const lakeX1 = sc.zones._lakeX1
  const lakeX2 = sc.zones._lakeX2
  if (sc.zones.water && lakeX1 != null && lakeX2 != null && x >= lakeX1 - 48 && x <= lakeX2 + 120) {
    return 1
  }
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
  applyZoneVisibility(inst)
  syncGlowAtmosphereZones(inst)
}
//
// Shows the tree-side lake cap rock when the hero runs left of the trunk.
//
function revealLeftShoreRock(inst) {
  if (inst.zones.leftShoreRock) return
  inst.zones.leftShoreRock = true
  set(KEY_LEFT_SHORE_ROCK, true)
  applyZoneVisibility(inst)
}
//
// Right trampoline collider — visible mushroom with a live bounce.
//
function isRightTrampolineColliderActive(z) {
  return isRightTrampolineVisible(z) && Boolean(z?.rightTrampBounceLive)
}
//
// Branch trampoline collider — visible mushroom with a live bounce.
//
function isBranchTrampolineColliderActive(z) {
  return isBranchTrampolineVisible(z) && Boolean(z?.branchTrampBounceLive)
}
//
// Right trampoline mushroom is visible once revealed.
//
function isRightTrampolineVisible(z) {
  return Boolean(z?.rightTrampRevealed)
}
//
// Branch trampoline mushroom uses the same reveal gate.
//
function isBranchTrampolineVisible(z) {
  return Boolean(z?.branchTrampRevealed)
}
//
// True when the branch trampoline sprite is actually on screen (revealed and
// not hidden by the zone visibility pass).
//
function isBranchTrampDrawnVisible(inst) {
  return isBranchTrampolineVisible(inst.zones) &&
    !inst.branchTrampBundle?.drawLayer?.hidden
}
//
// Camera Y is pinned to the design centre, so a window shorter than the
// design crops the top of the world, and the top HUD bar covers another
// TOP_MARGIN below that. Fruit hung above this line was never on screen.
//
function glowTreeFruitMinHangY() {
  const viewTop = Math.round(DESIGN_SCREEN_H / 2) - Math.min(SCREEN_H, DESIGN_SCREEN_H) / 2
  return viewTop + TOP_MARGIN + TREE_FRUIT_VIEW_TOP_PAD
}
//
// Short camera bump for tree reveals, tramp landings and letter pickups.
//
function triggerGlowCameraShake(inst) {
  inst.camera && GlowCamera.triggerShake(inst.camera, GLOW_CAMERA_SHAKE_AMP, GLOW_CAMERA_SHAKE_DURATION)
}
//
// True while hero.js holds the landing crouch (jump-6) or pre-jump squash.
//
function glowHeroInTrampLandingPose(hero) {
  if (!hero) return false
  return (hero.landSquashTimer ?? 0) > 0 || hero.isSquashing
}
//
// True when the hero should launch from a mushroom cap (not stroll past on
// the floor). Landing on the cap always launches — no "already grounded last
// frame" / "hasn't jumped recently" exception. onCap itself already requires
// footY within a tight band right at the cap surface (isHeroAtTrampolineCap),
// which a main-floor walker's footY (~47px lower, at FLOOR_Y) can never
// satisfy, and isHeroWalkingPastTrampOnMainFloor below excludes that lane by
// height too — so nothing here needs an extra "was this a real air landing"
// guard, and adding one (a wasGroundedRef / hero.jumpPhase check) only
// re-introduces the "hero can stand motionless on part of the cap without
// bouncing" bug: once landSquashTimer/jumpPhase reset a few frames after
// settling, such a guard silently stops firing again for as long as the hero
// stays there, exactly the "no dead zones — the whole cap must always work
// as a trampoline" requirement this must not regress.
//
function wantsTrampolineCapLaunch(inst, char, onCap, state) {
  if (!onCap || !state || state.cooldown > 0) return false
  const footY = char.pos.y + SURFACE_DETECT_Y
  //
  // Pit-cave caps sit on the underground floor — not the main-lane band the
  // surface tramps use to ignore walkers on FLOOR_Y.
  //
  if (state.pitCaveTramp) return true
  if (isHeroWalkingPastTrampOnMainFloor(inst, char, footY)) return false
  if ((char.isGrounded?.() ?? false) && isHeroFeetOnMainFloorLane(footY)) return false
  return true
}
//
// True while the hero strolls on the main floor lane (not a drop onto the
// cap) — true for ANY main-floor-grounded walker regardless of X, including
// directly under/beside a mushroom. The trampoline must only ever engage
// once the hero's feet are actually up at cap height (onCap in
// wantsTrampolineCapLaunch requires a tight footY band right at the cap
// surface, which main-floor footY never reaches); walking through or past a
// mushroom at floor level (scenario 2) must never snap the hero's Y up onto
// the cap or launch a bounce, no matter how close he passes. A previous
// round carved an exception out of this for hero X inside the cap's own
// footprint, intending to fix "walking onto the cap doesn't bounce" — that
// turned out to be a misdiagnosis: per the confirmed spec, walking near/into
// a mushroom is supposed to do nothing at all, so that carve-out was itself
// the bug (it let snapHeroToOneTrampolineCap's rescue logic run for plain
// floor walkers and yank them up onto the cap mid-stride).
//
function isHeroFeetOnMainFloorLane(footY) {
  return footY >= TRAMP_MAIN_LANE_FEET_MIN
}
function isHeroWalkingPastTrampOnMainFloor(inst, char, footY) {
  const grounded = char.isGrounded?.() ?? false
  return grounded && isHeroFeetOnMainFloorLane(footY)
}
//
// Snaps the hero onto one mushroom cap when feet tunnel through the collider.
//
function snapHeroToOneTrampolineCap(inst, char, heroX, footY, state) {
  if (!state) return
  const pitPad = state.pitCaveTramp
  const branchPad = !pitPad && state === inst.branchTrampState
  const colliderActive = pitPad
    ? isPitCaveTrampolineColliderActive(inst)
    : branchPad
      ? isBranchTrampolineColliderActive(inst.zones)
      : isRightTrampolineColliderActive(inst.zones)
  if (!colliderActive) return
  if (glowHeroInTrampLandingPose(inst.heroInst)) return
  if (isHeroWalkingPastTrampOnMainFloor(inst, char, footY)) return
  if (!pitPad && isHeroFeetOnMainFloorLane(footY)) return
  if (Math.abs(heroX - state.x) >= TRAMP_CAP_HALF) return
  const velY = char.vel?.y ?? 0
  if (velY < 0) return
  const capTop = trampolineCapTopY(state)
  //
  // syncTrampolinePad already keeps a real static collider under the cap, so
  // Kaplay resolves an ordinary landing there on its own — this only needs to
  // rescue a genuine high-speed tunnel-through (feet clearly *below* the cap
  // surface), not repin every frame the feet are merely hovering near it.
  // Re-pinning every frame here used to fight Kaplay's own landing resolve
  // exactly like the old pinHeroToMainFloorOverTrampoline bug: forcing pos.y
  // / vel.y back every frame never gave isGrounded() a frame to settle true,
  // so every grounded-gated follow-up (the late bounce pass, hero.js's own
  // land-squash) never fired and the hero froze in mid-air above the cap —
  // jumpPhase stuck on 'jumping' forever, most visible right after a bounce
  // launches the hero back down onto its own still-cooling-down cap.
  //
  // A previous round added a second, unbounded clause here ("grounded and
  // below cap Y, pin regardless of margin") to catch a walking approach — but
  // per the confirmed spec (see isHeroWalkingPastTrampOnMainFloor) walking
  // near/onto a mushroom must never snap the hero onto the cap at all, and
  // that clause was true for virtually any grounded hero in the X-zone
  // (main-floor footY sits only ~1px under the TRAMP_SNAP_BELOW margin),
  // which is exactly what made the hero appear to "walk onto the trampoline"
  // instead of walking past it. Removed — this rescue only ever needs the
  // narrow high-speed-tunnel margin below.
  //
  const sunkPastCap = pitPad
    ? footY > capTop + TRAMP_SNAP_BELOW
    : footY > capTop + TRAMP_SNAP_BELOW && footY < TRAMP_MAIN_LANE_FEET_MIN
  //
  // Only a fall that already passed through the cap from above. A sideways
  // pass must not be pinned onto the pad — that left the hero standing in
  // the air beside the mushroom, then sinking through the floor.
  //
  sunkPastCap && pinHeroOnTrampolineCap(inst, char, capTop, state)
}
//
// Margin kept inside the existing cap X-zone when the late bounce pass
// clamps X back in after an edge-catch pin (see clampHeroIntoTrampolineCapX
// below) — not a zone widening, just slack so the clamped position reliably
// still reads as "on cap" (a strict `<` compare against the same zone
// half-width) on the check that follows.
//
const TRAMP_PIN_X_CLAMP_MARGIN = 4
//
// Pins feet on the mushroom cap — bypasses land-squash guards in settleHeroOnLog.
// Flags state._edgeCatchPinned so runGlowTrampolineLatePass (which runs
// later in the SAME frame, after hero.js's character.move() has already
// applied this frame's horizontal step — horizontal movement never goes
// through char.vel.x in this game, so it cannot be caught/clamped here) can
// clamp X back into the zone before checking onCap. Without that, the Y-snap
// alone left X free to keep sliding out of the zone via that same-frame
// move() call, so a fast horizontal approach carried the hero back outside
// the cap's X range before the bounce check ever saw him "on" it — he'd sink
// onto the main floor beside the mushroom without ever bouncing, and sit
// there motionless afterward.
//
function pinHeroOnTrampolineCap(inst, char, capTop, state = null) {
  moveGlowHeroTo(char, char.pos.x, capTop - SURFACE_DETECT_Y + WOOD_LOG_SNAP_EMBED)
  char.vel && (char.vel.y = 0)
  state && (state._edgeCatchPinned = true)
}
//
// Clamps the hero's X back into a pad's cap zone after an edge-catch pin —
// called from the late bounce pass, after this frame's character.move() has
// already run, so it undoes exactly the drift described above. Only ever
// pulls the hero toward the cap center, never past its existing radius —
// not a zone widening.
//
function clampHeroIntoTrampolineCapX(char, state) {
  if (!state?._edgeCatchPinned || !char?.pos) return
  state._edgeCatchPinned = false
  const half = TRAMP_CAP_HALF - TRAMP_PIN_X_CLAMP_MARGIN
  //
  // Never drag a hero who only brushed the side of the pad onto the cap.
  //
  if (Math.abs(char.pos.x - state.x) > TRAMP_CAP_HALF) return
  const clamped = Math.min(state.x + half, Math.max(state.x - half, char.pos.x))
  clamped !== char.pos.x && moveGlowHeroTo(char, clamped, char.pos.y)
}
//
// First mushroom reveal — collider off, hero passes through to FLOOR_Y.
//
function pinHeroToMainFloorOverTrampoline(inst, char, state) {
  if (!state || !char?.pos) return
  const branchPad = state === inst.branchTrampState
  const colliderActive = branchPad
    ? isBranchTrampolineColliderActive(inst.zones)
    : isRightTrampolineColliderActive(inst.zones)
  if (colliderActive) return
  const hero = inst.heroInst
  if (glowHeroInTrampLandingPose(hero)) return
  const heroX = char.pos.x
  if (Math.abs(heroX - state.x) >= TRAMP_NEAR_X) return
  //
  // createLevelBounds's real "floor" body already spans this X with no gap,
  // so an ordinary jump or fall near an inactive/unarmed trampoline lands on
  // it exactly like anywhere else in the level — this only needs to catch a
  // genuine tunnel-through-the-floor glitch (feet clearly *below* FLOOR_Y),
  // not the whole "mushroom cap height down to the floor" band a normal
  // jump's descent naturally passes through. This used to force-write pos.y
  // / zero vel.y every single frame the feet were anywhere in that generous
  // band — cancelling every takeoff outright (jumpPhase snapped back to
  // 'none' next frame with the hero still glued to the ground) and, even
  // once only guarded on the way up, still fighting Kaplay's own landing
  // resolve on the way down (isGrounded stuck oscillating a few px above
  // the floor forever, jumpPhase wedged on 'jumping').
  //
  // Mid-jump frames tuck the hitbox up, so pos.y + SURFACE_DETECT_Y sits well
  // below the real collider bottom. Testing that sprite foot line pinned a
  // slow fall over a hidden mushroom back up every few frames before the
  // tucked box ever reached the floor — the hero never grounded and hung on
  // a jump frame.
  //
  const bottomY = glowHeroHitboxBottomY(char)
  const sunkThroughFloor = bottomY > FLOOR_Y + LOG_SNAP_STANDING_MAX
  if (!sunkThroughFloor) return
  moveGlowHeroTo(char, char.pos.x, char.pos.y - (bottomY - FLOOR_Y))
  char.vel && (char.vel.y = 0)
}
//
// World Y of the hero collider's bottom edge (follows the jump tuck).
//
function glowHeroHitboxBottomY(char) {
  const box = char.worldArea?.()?.bbox?.()
  return box ? box.pos.y + box.height : char.pos.y + SURFACE_DETECT_Y
}
//
// Catches the hero on the shore tree horizontal branch (same band logic as start branch).
//
function snapHeroToShoreBranch(inst, char, heroX, footY) {
  const home = inst.shoreBranchPlatHome
  if (!home || inst.drowning) return
  const x2 = home.x2 ?? home.x
  if (heroX < home.x || heroX > x2) {
    inst._shoreBranchTunnelArmed = true
    return
  }
  const hero = inst.heroInst
  if (hero?.isSquashing || hero?.jumpPhase === 'jumping') return
  const velY = char.vel?.y ?? 0
  if (velY < 0) {
    inst._shoreBranchTunnelArmed = true
    return
  }
  const platTop = home.y
  const grounded = char.isGrounded?.() ?? false
  if (grounded && footY <= platTop + LOG_SNAP_STANDING_MAX) {
    inst._shoreBranchTunnelArmed = true
    return
  }
  const inCatchBand = footY >= platTop - LOG_HOVER_BAND && footY <= platTop + BRANCH_SNAP_BELOW
  if (!inCatchBand) {
    inst._shoreBranchTunnelArmed = true
    return
  }
  if (inst._shoreBranchTunnelArmed === false) return
  inst._shoreBranchTunnelArmed = false
  settleHeroOnLog(inst, char, platTop)
}
function snapHeroToStartBranch(inst, char, heroX, footY) {
  if (!inst.startBranch || inst.drowning) return
  if (!isHeroOverStartBranchX(inst, heroX)) {
    inst._startBranchTunnelArmed = true
    return
  }
  const hero = inst.heroInst
  if (hero?.isSquashing || hero?.jumpPhase === 'jumping') return
  const velY = char.vel?.y ?? 0
  if (velY < 0) {
    inst._startBranchTunnelArmed = true
    return
  }
  const platTop = inst.startBranch.y
  const grounded = char.isGrounded?.() ?? false
  if (grounded && footY <= platTop + LOG_SNAP_STANDING_MAX) {
    inst._startBranchTunnelArmed = true
    return
  }
  const inCatchBand = footY >= platTop - LOG_HOVER_BAND && footY <= platTop + BRANCH_SNAP_BELOW
  if (!inCatchBand) {
    inst._startBranchTunnelArmed = true
    return
  }
  if (inst._startBranchTunnelArmed === false) return
  inst._startBranchTunnelArmed = false
  settleHeroOnLog(inst, char, platTop)
}
//
// Prevents rare fall-through on the main floor (hero sinks below the floor line).
//
function isHeroOverOpenCaveMouth(inst, heroX) {
  const pit = inst.pit
  if (!pit?.collapsed) return false
  const crack = getCrackZone(WORLD_W, FLOOR_Y)
  return heroX >= crack.x1 - 12 && heroX <= crack.x2 + 12
}
function snapHeroToMainGround(inst, char, grounded, heroX, footY) {
  if (inst.drowning) return
  const crack = getCrackZone(WORLD_W, FLOOR_Y)
  //
  // Never snap over the crack mouth — the hero must fall through into the pit.
  //
  const floorEndX = getGlowCaveMouthFloorLeftX(crack)
  if (heroX < LEFT_MARGIN + 8 || heroX >= floorEndX - 16) return
  if (isHeroOverOpenCaveMouth(inst, heroX)) return
  if (isHeroStandingOnTrampolineCap(inst, heroX, footY, inst.trampState)) return
  if (isHeroStandingOnTrampolineCap(inst, heroX, footY, inst.branchTrampState)) return
  const velY = char.vel?.y ?? 0
  if (velY < 0) return
  //
  // Standing on the floor — Kaplay owns the pose; never re-pin (caused bounce loops).
  //
  // The sink test reads the collider bottom, not footY: a slow fall keeps the
  // jump-tucked hitbox well above the sprite feet, and footY used to repin the
  // hero up before the box ever touched the floor (endless frozen jump frame).
  //
  const bottomY = glowHeroHitboxBottomY(char)
  if (bottomY <= FLOOR_Y + LOG_SNAP_STANDING_MAX) return
  //
  // Feet under the floor line, including a shallow sink beside a mushroom.
  //
  if (bottomY <= FLOOR_Y + MAIN_GROUND_SINK_RESCUE_MAX) {
    moveGlowHeroTo(char, char.pos.x, char.pos.y - (bottomY - FLOOR_Y))
    char.vel && char.vel.y > 0 && (char.vel.y = 0)
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
    // Trampoline arcs onto the thin L log can rest in this band without
    // isGrounded — jump-6 stays up and Space never arms. One settle, then idle.
    //
    const stuckOnContact = !isStartBranch && !grounded && velY >= 0 && velY < LOG_SNAP_FALL_VEL &&
      footY >= platTop - LOG_SNAP_TOLERANCE && footY <= platTop + LOG_SNAP_DEEP_SINK &&
      (hero?.jumpPhase === 'jumping' || hero?.wasJumping || (hero?.landSquashTimer ?? 0) > 0)
    if (stuckOnContact) {
      settleHeroOnLog(inst, char, platTop)
      inst.trampBounceAir = false
      inst.branchTrampBounceAir = false
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
  if (hero?.isSquashing && !skipPostLandLock) return
  char.pos.y = platTop - SURFACE_DETECT_Y + WOOD_LOG_SNAP_EMBED
  if (char.vel) char.vel.y = 0
  if (!hero) return
  !skipPostLandLock && (hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_GLOW))
  hero.landFxCooldown = Math.max(hero.landFxCooldown || 0, 0.2)
  hero.canJump = true
  //
  // Only force idle when still marked airborne after a deep snap — never
  // mid-fall (caller already gated on low velY).
  //
  if (hero.jumpPhase === 'jumping') {
    Hero.syncPlatformLanding(hero)
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
function flashLifeImageOnDrownDeath(k, levelIndicator, originalColor, count) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  if (count >= LIFE_FLASH_COUNT) {
    levelIndicator.lifeImage.sprite.color = originalColor
    levelIndicator.lifeImage.sprite.opacity = 1.0
    levelIndicator._lifeFlashLock = false
    return
  }
  const flashA = glowRgb(GLOW_GOLD_HEX)
  const flashB = glowRgb('brightLight')
  if (count % 2 === 0) {
    levelIndicator.lifeImage.sprite.color = k.rgb(flashA.r, flashA.g, flashA.b)
    levelIndicator.lifeImage.sprite.opacity = 1.0
  } else {
    levelIndicator.lifeImage.sprite.color = k.rgb(flashB.r, flashB.g, flashB.b)
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
  const tone = glowRgb(GLOW_GOLD_HEX)
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
// hero's feet.
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
  GlowFootParticles.spawnLanding(
    inst,
    footX,
    footY,
    footParticleColor(surface)
  )
}
//
// Picks earth or bark tone for foot particles based on the landing surface
//
function footParticleColor(surface) {
  return surface === 'wood' ? glowRgb(GLOW_PAL.treeGray.trunk) : GROUND_DARK
}
//
// Shows the mud predator once the branch mushroom has woken it.
//
function syncGlowPredatorVisibility(inst) {
  const pred = inst.predator
  pred?.obj &&
    (pred.obj.hidden = !(inst.zones.predatorAwake))
}
//
// Hides the Kaplay hero sprite; onDraw redraws it after all world layers.
//
function syncGlowPitCaveHeroForegroundDraw(inst, char, footY) {
  if (!char?.pos || inst.drowning || inst.deathHandled || inst.touchDeathHandled ||
    inst.glowDrownHeroClipLock) {
    inst.pitCaveHeroForeground && (char.hidden = false, inst.pitCaveHeroForeground = false)
    return
  }
  const inCave = isHeroInsideGlowPitCave(inst, char.pos.x, char.pos.y, footY)
  if (inCave) {
    inst.pitCaveHeroForeground = true
    char.hidden = true
    return
  }
  if (inst.pitCaveHeroForeground) {
    char.hidden = false
    inst.pitCaveHeroForeground = false
  }
}
//
// Lifts the hero above the cave mouth lip drawn in onDrawWorld.
//
function syncGlowPitHeroDrawOrder(inst, char, footY) {
  if (!char?.pos || inst.drowning || inst.deathHandled || inst.touchDeathHandled) return
  const pit = inst.pit
  if (!pit?.zone || !pit.collapsed) return
  if (inst.pitCaveHeroForeground) return
  if (isHeroInsideGlowPitCave(inst, char.pos.x, char.pos.y, footY)) {
    char.z = CFG.visual.zIndex.player + 24
    return
  }
  const inMouthX = char.pos.x >= pit.zone.x1 && char.pos.x <= pit.zone.x2
  const pastLip = footY > pit.floorY + 3
  inMouthX && pastLip && (char.z = CFG.visual.zIndex.player + 8)
}
//
// Start-branch collider is thin — keep jump armed whenever the hero stands on it.
//
function syncGlowBranchJumpReady(inst, char, grounded) {
  if (!char?.pos) return
  if (!isHeroOnStartBranch(inst, char)) return
  const hero = inst.heroInst
  if (!hero || hero.isSquashing) return
  const velY = char.vel?.y ?? 0
  if (!grounded && Math.abs(velY) > 48) return
  if (grounded && (hero.jumpPhase === 'jumping' || hero.wasJumping)) {
    Hero.syncPlatformLanding(hero)
    hero.jumpPhase = 'none'
    hero.wasJumping = false
    hero.postLandAirLock = 0
  }
  hero.canJump = true
  hero.jumpKeyReleaseGate = false
  hero.jumpDisabled = false
}
//
// Draw the hero above log platforms while bouncing on a trampoline.
//
function syncHeroTrampDrawOrder(inst) {
  const ch = inst.heroInst?.character
  if (!ch) return
  if (inst.drowning) {
    const drownZ = inst.heroInst.drownHeroDrawZ ?? DROWN_HERO_DRAW_Z
    ch.z !== drownZ && (ch.z = drownZ)
    return
  }
  const onBranch = isHeroOnStartBranch(inst, ch)
  const onBranchCap = isOnBranchTrampolineCap(inst, ch)
  onBranch && !onBranchCap && inst.branchTrampBounceAir &&
    (inst.branchTrampBounceAir = false)
  const branchTrampBoost = inst.branchTrampBounceAir || onBranchCap
  const rightInFront = inst.trampBounceAir
  let targetZ = CFG.visual.zIndex.player
  //
  // On the start branch the canopy must always cover the hero; only the
  // branch-trampoline bounce lifts him above the cap draw layer briefly.
  //
  onBranch && !branchTrampBoost &&
    (targetZ = CFG.visual.zIndex.platforms - 3)
  branchTrampBoost &&
    (targetZ = CFG.visual.zIndex.platforms + 2)
  !onBranch && rightInFront &&
    (targetZ = CFG.visual.zIndex.player + 2)
  //
  // On the centipede's stick he passes behind both trampoline caps.
  //
  if (HorizFallTwig.isHeroRidingPredator(inst.shoreFallTwigs, ch)) {
    const nearRight = inst.trampState && Math.abs(ch.pos.x - inst.trampState.x) < TRAMP_NEAR_X
    const nearBranch = inst.branchTrampState && Math.abs(ch.pos.x - inst.branchTrampState.x) < TRAMP_NEAR_X
    nearRight && (targetZ = Math.min(targetZ, CFG.visual.zIndex.player))
    nearBranch && (targetZ = Math.min(targetZ, CFG.visual.zIndex.platforms + 1))
  }
  const footY = ch.pos.y + SURFACE_DETECT_Y
  !inst.pitCaveHeroForeground &&
    isHeroInsideGlowPitCave(inst, ch.pos.x, ch.pos.y, footY) &&
    (targetZ = CFG.visual.zIndex.player + 24)
  ch.z !== targetZ && (ch.z = targetZ)
}
//
// Pit cave mushroom trampoline — same exit as the old ground portal: the hero
// pops onto the strip between the big tree and the branch trampoline.
//
const PIT_MUSH_GROUND_LAUNCH_MULT = 1.12
function setupGlowPitCaveTrampoline(inst) {
  const pit = inst.pit
  if (!pit?.zone) return
  const k = inst.k
  const pitFloorY = pit.floorY + pit.zone.depth
  const trampX = getGlowPitCaveTrampolineX(pit) ?? pit.portalX
  const bundle = createMushroomTrampoline(k, trampX, pitFloorY, inst.zones, {
    pitCaveTramp: true,
    drawZ: CFG.visual.zIndex.player + 22,
    colors: GLOW_PAL.cuteMushroom,
    spriteKey: 'pit'
  })
  inst.pitCaveTrampBundle = bundle
  inst.pitCaveTrampState = bundle.state
  inst.pitCaveTrampPad = k.add([
    k.rect(TRAMP_PAD_W, TRAMP_PAD_H),
    k.pos(-500, PLATFORM_HIDE_Y),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    CFG.game.platformName
  ])
  inst.pitCaveTrampBounceAir = false
  syncPitCaveTrampolineDrawLayer(inst)
}
function isPitCaveTrampolineVisible(inst) {
  return Boolean(inst?.pit)
}
function isPitCaveTrampolineColliderActive(inst) {
  return isPitCaveTrampolineVisible(inst)
}
function syncPitCaveTrampolineDrawLayer(inst) {
  const layer = inst.pitCaveTrampBundle?.drawLayer
  layer && (layer.hidden = !isPitCaveTrampolineVisible(inst))
}
function maybeLaunchFromPitCaveMushroomOnLand(inst, char, grounded, justLanded) {
  const state = inst.pitCaveTrampState
  const hero = inst.heroInst
  if (!state || !char?.pos || !justLanded || !grounded || !hero) return
  if (!isPitCaveTrampolineColliderActive(inst)) return
  tryPitCaveTrampTeleport(inst, state, hero, char)
}
//
// Pit cave mushroom — same exit as the old ground portal: teleport between the
// big tree and the branch trampoline, then launch upward.
//
function tryPitCaveTrampTeleport(inst, state, hero, char) {
  if (!state || state.cooldown > 0 || !char?.pos) return false
  const heroX = char.pos.x
  const heroFeet = char.pos.y + SURFACE_DETECT_Y
  const onCap = isHeroAtTrampolineCap(inst, heroX, heroFeet, state)
  if (!wantsTrampolineCapLaunch(inst, char, onCap, state)) return false
  if ((char.vel?.y ?? 0) < -40) return false
  launchHeroFromPitCaveMushroom(inst)
  state.cooldown = TRAMP_COOLDOWN
  state.squash = TRAMP_SQUASH_MAX
  inst.pitCaveTrampBounceAir = true
  return true
}
function glowPitCaveExitX(inst) {
  const cfg = inst.treeFruitAnchorCfg
  if (cfg) return computeGlowAnchorFruitDropX(cfg)
  const trunkX = inst.treeX ?? TREE_X
  const trunkHalf = inst.trunkExcludeHalf ?? TRUNK_EXCLUDE_HALF
  const branchTrampX = inst.branchTrampX ?? trunkX + trunkHalf + BRANCH_TRAMP_OFFSET_X
  return computeGlowAnchorFruitDropX({
    trunkX,
    trunkHalf,
    branchTrampX,
    trampClearHalf: TRAMP_GRASS_CLEAR_HALF
  })
}
function launchHeroFromPitCaveMushroom(inst) {
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  dismissPitCaveMushroomHint(inst.pit)
  dismissGlowCaveMushroomTeacherHint(inst)
  const exitX = glowPitCaveExitX(inst)
  moveGlowHeroTo(char, exitX, FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED)
  char.vel.x = 0
  char.hidden = false
  inst._inGlowPitCave = false
  inst.pitCaveHeroForeground = false
  const launch = Math.round(CFG.game.jumpForce * PIT_MUSH_GROUND_LAUNCH_MULT)
  if (typeof char.jump === 'function') char.jump(launch)
  else char.vel.y = -launch
  hero.wasJumping = true
  hero.jumpPhase = 'jumping'
  hero.jumpCeilingBonk = false
  hero.postLandAirLock = 0
  hero.canJump = false
  inst._pitMushroomBranchLaunchLatch = true
  snapGlowCameraToHero(inst.k, inst.heroInst)
  updateGlowCamera(inst)
  inst.sound && !inst.sound._glowSfxMuted && Sound.playJumpSound(inst.sound)
  applyZoneVisibility(inst)
  syncGlowAtmosphereZones(inst)
}
function dismissPitCaveMushroomHint(pit) {
  if (!pit) return
  pit.pitCaveMushroomDone = true
  pit.pitCaveMushroomMoveAccum = 0
  pit.pitCaveMushroomHintShows = 2
  pit.pitCaveMushroomHintPausedUntilExit = true
}
//
// Shared 10 s teacher gate: exploration nudges outside the cave, mushroom nudge inside.
//
function updateGlowTeacherContextHints(inst, char, hero, heroMoving, dt) {
  const blocked =
    inst.drowning || inst.introLock ||
    inst.pendingGlowIntro
  if (blocked || !char?.pos) return
  const footY = char.pos.y + SURFACE_DETECT_Y
  const inCave = isHeroInsideGlowPitCave(inst, char.pos.x, char.pos.y, footY)
  const heroActive = isGlowHeroActiveForTeacherHint(inst, hero, char, heroMoving)
  const caveEligible = glowTeacherCaveMushroomAutoHintEligible(inst, char, footY, inCave)
  caveEligible && revealGlowTeacherHudForExplorationHintsIfNeeded(inst)
  tickGlowTeacherContextHints(inst, {
    dt,
    blocked,
    heroMoving,
    heroActive,
    inCave,
    caveEligible,
    onCaveHint: () => fireGlowTeacherCaveMushroomHint(inst)
  })
}
//
// True while the pit-mushroom teacher line may auto-fire in the cave.
//
function glowTeacherCaveMushroomAutoHintEligible(inst, char, footY, inCave) {
  const pit = inst.pit
  if (!pit || pit.pitCaveMushroomDone || !char?.pos) return false
  if (!inCave) return false
  if ((pit.pitCaveMushroomHintShows || 0) >= 2) {
    pit.pitCaveMushroomHintPausedUntilExit = true
    return false
  }
  return !pit.pitCaveMushroomHintPausedUntilExit
}
//
// Shows the in-cave mushroom teacher line (max two auto shows per visit streak).
//
function fireGlowTeacherCaveMushroomHint(inst) {
  const pit = inst.pit
  if (!pit || pit.pitCaveMushroomDone || pit.pitCaveMushroomHintPausedUntilExit) return
  if (!showGlowTeacherHintNow(
    inst,
    PIT_CAVE_HINT_TEXT,
    GLOW_TEACHER_HINT_DURATION,
    { pitCaveMushroom: true }
  )) return
  pit.pitCaveMushroomHintShows = (pit.pitCaveMushroomHintShows || 0) + 1
  inst.lastGlowTeacherHintText = PIT_CAVE_HINT_TEXT
  pit.pitCaveMushroomHintShows >= 2 && (pit.pitCaveMushroomHintPausedUntilExit = true)
}
//
// Running and jumping both count toward teacher-hint movement gates.
//
function isGlowHeroActiveForTeacherHint(inst, hero, char, heroMoving) {
  if (heroMoving) return true
  if (!hero || !char) return false
  if (hero._effectivelyMoving || hero.isRunning) return true
  const k = inst.k
  if (k) {
    const left = isAnyKeyDown(k, CFG.controls.moveLeft)
    const right = isAnyKeyDown(k, CFG.controls.moveRight)
    if (left || right) return true
    if (isAnyKeyDown(k, CFG.controls.jump)) return true
  }
  if (hero.jumpPhase && hero.jumpPhase !== 'none') return true
  if (hero.isSquashing || hero.wasJumping) return true
  const vx = char.vel?.x ?? 0
  const vy = char.vel?.y ?? 0
  return Math.abs(vx) > 24 || Math.abs(vy) > 24
}
//
// Once the hero stands on the pit floor, nudge the skeleton line after a
// short beat (no long idle wait).
//
function updatePitCaveSkeletonAutoHint(inst, char, dt) {
  //
  // Skeleton proximity / hover hints removed — eyes beat is read from the pickups.
  //
}
//
// Playfield chrome inset so Glow tooltips pin to the game window, not the void.
//
function glowTooltipClampInset() {
  return {
    left: LEFT_MARGIN,
    right: RIGHT_MARGIN,
    //
    // HUD icons sit in the top void strip above PLAYFIELD_TOP_Y + TOP_MARGIN.
    //
    top: PLAYFIELD_TOP_Y,
    bottom: SCREEN_H - PLAYFIELD_BOTTOM_Y
  }
}
//
// Glow tooltips clamp to the playfield so off-screen sources stay readable.
//
function createGlowTooltip(cfg) {
  return Tooltip.create({
    ...cfg,
    clampInset: cfg.clampInset ?? glowTooltipClampInset(),
    customDraw: drawGlowBakedTooltip
  })
}
//
// Draws a tooltip from a grain-baked canvas sprite (re-bakes when layout changes).
//
function drawGlowBakedTooltip(inst, layout) {
  const k = inst.k
  const key = `${layout.labelText}|${layout.bubbleX}|${layout.bubbleY}|${layout.showBelow}`
  if (inst._glowTipKey !== key) {
    inst._glowTipKey = key
    inst._glowTipSprite = `glow-tip-${glowUiHash(key)}`
    const canvas = bakeGlowTooltipCanvas(layout, inst.font, 26, 6)
    k.loadSprite(inst._glowTipSprite, canvas)
    const bounds = glowTooltipBakeBounds(layout)
    inst._glowTipDrawX = bounds.minX
    inst._glowTipDrawY = bounds.minY
    inst._glowTipDrawW = bounds.w
    inst._glowTipDrawH = bounds.h
    canvas.width = 0
    canvas.height = 0
  }
  k.drawSprite({
    sprite: inst._glowTipSprite,
    pos: k.vec2(inst._glowTipDrawX, inst._glowTipDrawY),
    width: inst._glowTipDrawW,
    height: inst._glowTipDrawH,
    opacity: inst.opacity,
    fixed: true
  })
  return true
}
//
// Tight bounds for a baked tooltip canvas (bubble + pointer).
//
function glowTooltipBakeBounds(layout) {
  const BUBBLE_BORDER_WIDTH = 3
  const POINTER_WIDTH = 12
  const halfW = POINTER_WIDTH / 2
  const bx = layout.bubbleX - BUBBLE_BORDER_WIDTH
  const by = layout.bubbleY - BUBBLE_BORDER_WIDTH
  const px = layout.clampedPointerX
  const tipY = layout.pointerTipY
  const baseY = layout.pointerBaseEdge
  let minX = Math.min(bx, px - halfW - BUBBLE_BORDER_WIDTH)
  let maxX = Math.max(bx + layout.totalW, px + halfW + BUBBLE_BORDER_WIDTH)
  let minY = Math.min(by, tipY, baseY)
  let maxY = Math.max(by + layout.totalH, tipY, baseY)
  const pad = 4
  return { minX: minX - pad, minY: minY - pad, w: maxX - minX + pad * 2, h: maxY - minY + pad * 2 }
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
  GLOW_HUD_LABEL_TOP_Y = GLOW_HUD_FPS_TOP_Y - GLOW_HUD_LABEL_BAKED_HALF_H
  updatePlayfieldCornerPositions()
}
