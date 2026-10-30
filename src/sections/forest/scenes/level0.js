import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { initTouchInput } from '../../../utils/touch-input.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import { registerForestNativeTeardown } from '../../../utils/engine-switch.js'
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
import { toCanvas, getRGB, createCanvasAtlasBuilder, bindBackToMenuKeys, bindStartGameKeys, releaseGamePhysicalKeys } from '../../../utils/helper.js'
import {
  buildForestTree,
  renderForestTreeToCanvas,
  renderForestTreeIntoContext,
  TREE_SEED
} from '../utils/forest-tree.js'
import {
  GROUND_RIGHT_STRIP_COUNT,
  groundRightStripIndexForX,
  groundRightAppearOpacity
} from '../utils/forest-ground-reveal.js'
import {
  FOREST_PAL,
  forestCaveEarthDeepRgb,
  forestGroundEarthBottomLayerRgb,
  forestRgb,
  forestRockShadedDrawPalette,
  forestContourRgb,
  snapToPalette,
  lerpForestRgb,
  getTreePaletteColor,
  getForestGameplayTreeVolumeShades,
  getTreePaletteParallaxCorner,
  buildDimmedTreePalette,
  getForestLightRgb,
  forestSkyBandRgb
} from '../utils/forest-palette.js'
import {
  applyFoliageDensityToPalette,
  forestFilmGrainBlockPxForTier,
  forestTreeBuildOptsForDensity
} from '../utils/forest-pixel-density.js'
import {
  applyForestGameplaySharpBake,
  applyForestHudSharpBake,
  forestDepthBlurRadiusPx
} from '../utils/forest-focus-depth.js'
import * as Grass from '../../../components/grass.js'
import * as HeroHint from '../../../utils/hero-hint.js'
import { bindPointerActivate } from '../../../utils/pointer-activate.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import {
  createForestMidges,
  updateForestMidges,
  syncForestMidgesZones,
  createForestPit,
  updateForestPit,
  drawForestPit,
  drawForestPitCaveForegroundDecor,
  drawForestPitCaveSeamCoverRocks,
  isCrackGrassExcluded,
  isCrackDecorExcluded,
  getCrackZone,
  getForestPitHeroStandY,
  getForestPitEarthBandMouthCutoutForPit,
  isForestOpenPitMouthWorldX,
  getForestPitFloorCollider,
  getForestCaveMouthFloorLeftX,
  getForestPitCaveTrampolineX
} from '../utils/forest-level-atmosphere.js'
import {
  buildForestTreeFruitSpots,
  computeForestAnchorFruitDropX,
  forestAnchorFruitGroundClearSpan,
  isForestAnchorFruitGroundX,
  mountForestTreeFruitLayer,
  hasForestAnchorFruitDropInWorld,
  releaseForestAnchorFruit,
  getFallenAnchorFruit,
  restoreFallenAnchorFruit,
  tickForestTreeFruits
} from '../utils/forest-tree-fruit.js'
import * as ForestFootParticles from '../utils/forest-foot-particles.js'
import * as ChainBuoy from '../utils/forest-chain-buoy.js'
import { forestEyeBerryColors } from '../utils/forest-eye-berry.js'
import * as ChainEyeTramp from '../utils/forest-chain-eye-trampoline.js'
import * as EarTree from '../utils/forest-ear-tree.js'
import * as EyeFlower from '../components/eye-flower.js'
import * as SoilSeam from '../utils/forest-soil-seam.js'
import * as Lake from '../utils/forest-lake.js'
import * as Underground from '../utils/forest-underground.js'
import * as BushStrip from '../utils/forest-bush-strip.js'
import { GROUND_LAYER_FRACS, groundEarthLayersColor, paintLayeredEarthBand } from '../utils/forest-earth-band.js'
import * as FlowerGrab from '../components/flower-grab.js'
import { createLevelTransition } from '../../../utils/transition.js'
import * as ShoreTree from '../utils/forest-shore-tree.js'
import { paintForestShoreRock } from '../utils/forest-shore-rock.js'
import * as HorizFallTwig from '../utils/forest-horiz-fall-twig.js'
import * as SpikyTomato from '../components/spiky-tomato.js'
import * as ForestFloor from '../components/forest-floor.js'
import { paintUndergroundDepthVignette } from '../utils/forest-atmosphere.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as ForestCamera from '../utils/forest-camera.js'
import {
  applyParallaxPostFxToContext,
  applyForestLayerGradeToCanvas,
  FOREST_LAYER_GRADE
} from '../utils/forest-parallax-grain.js'
import {
  measureCanvasContentBounds,
  cropCanvasToBounds,
  releaseCanvas
} from '../utils/forest-canvas-crop.js'
//
// Palette-derived tones — every colour comes from CFG.visual.colors.palette.
//
const VOID = forestRgb('void')
const OUTER = forestRgb('playfieldOuter')
//
// Warm orange grass — same half-brightness front-row foliage tone as menu.js
//
const GRASS_GREEN = forestRgb(FOREST_PAL.treeColor.leafShades[0])
//
// Yellow-brown foreground grass from L onward (same straw as the G peek band).
//
const GRASS_WARM = forestRgb(FOREST_PAL.gold)
//
// Shifts blades toward a deeper autumn tone on top of the per-blade straw tint.
//
const FOREST_GRASS_HUE_VARY_MAX = 1
const FOREST_GRASS_HUE_VARY_SKEW = 1
const FOREST_GOLD_HEX = FOREST_PAL.gold
//
// Colour-world backdrop split: sky above the ground line, dark earth below.
//
const GROUND_DARK = forestRgb('groundDark')
//
// Dark warm soil tone of the short static root ticks under the grass tufts.
//
const GRASS_ROOT_RGB = forestRgb('groundLoam')
//
// Cool forest air — parallax trees fade into teal/green sky, not gold (70/20/10).
//
const PARALLAX_FOLIAGE_HAZE = forestRgb(FOREST_PAL.forestLift)
//
// Forest contour ink for trees, mushrooms, rocks, letters (not pure black).
//
const DECOR_OUTLINE_RGB = forestContourRgb('forest')
//
// Cap colour families for the cute decor mushrooms (palette hex sets): the
// cap tone, its dark counterpart (shading) and a lighter highlight tone.
//
const MUSHROOM_CAP_HEX = FOREST_PAL.mushrooms
const MUSHROOM_CAP_SHADOW_HEX = FOREST_PAL.mushroomsDark
const MUSHROOM_CAP_LIGHT_HEX = FOREST_PAL.mushroomsLight
//
// Cute mushroom palette set (full colour).
//
const CUTE_MUSH_COLORS = FOREST_PAL.cuteMushroom
//
// Layout. Forest runs on its own native-resolution engine (see game-engine.js /
// engine-switch.js) so the playfield always fills the real window horizontally
// (the world scrolls under a camera, see WORLD_W) — but every element's own
// position is still laid out against the fixed CFG.visual.screen /
// CFG.visual.forest design resolution (1920x1080 view / 3000x1080 world),
// exactly like the other (letterboxed, 1920x1080) scenes: laying elements out
// against the live window size would drift them apart on any monitor wider
// or taller than the design resolution. SCREEN_W/SCREEN_H (the real, live
// window size) and the handful of values that genuinely need to track it —
// the camera viewport width, the HUD row's vertical offset when the window
// is taller than design, and screen-space chrome that must reach the true
// edges of the window — are `let` bindings recomputed from the live
// k.width()/k.height() at scene start (see recomputeForestScreenLayout).
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
const WORLD_W = CFG.visual.forest.worldWidth
const WORLD_H = CFG.visual.forest.worldHeight
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
let forestPlayfieldCornerObjs = null
//
// Original 1920-wide layout; right-side gameplay shifts by this amount into
// the extended 3000 px world (lake + main tree stay on the left).
//
const RIGHT_ZONE_SHIFT_X = WORLD_W - 1920
const CORNER_RADIUS = 20
const CORNER_SPRITE_OUTER = 'forest0-corner-mask-outer'
const PLAYFIELD_BOTTOM_CORNER_Z = CFG.visual.zIndex.ui + 2500
const PLATFORM_HIDE_Y = 9999
//
// Tree. Fixed to the design viewport's own centre (not the live window
// width) so every element positioned off it — branch, east ground, L/O/W
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
// separately in forest-tree.js (HORIZ_W).
//
const MAIN_TREE_TRUNK_WIDTH_SCALE = 0.9
//
// Hero branch ~205 px above the floor — a plain jump tops out just over
// 150 px at the feet, so the branch is reachable only via the left mushroom.
//
const MAIN_TREE_HERO_BRANCH_FRAC = 0.5
const MAIN_TREE_FOLIAGE_DETAIL_LEAVES_MIN = 0
const MAIN_TREE_FOLIAGE_DETAIL_LEAVES_MAX = 0
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
// The east ground starts this far past the branch trampoline's grass
// clearing; the stalk eyes, ear-trees and east rocks are laid out from there.
//
const EAST_GROUND_TRAMP_GAP = 42
const FOREST_CHAIN_BUOY_Z = CFG.visual.zIndex.player - 1
const FOREST_EAR_TREE_Z = CFG.visual.zIndex.player - 1
//
// Respawn uses a wider gap than bootstrap spawn — hero body half-width matches hero.js COLLISION_WIDTH.
//
const FOREST_HERO_HITBOX_HALF_W = 15
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
const FOREST_TOUCH_DEATH_PARTICLE_COUNT = 34
const HERO_TOUCH_DEATH_RESPAWN_SIDE_OFFSET = 80
const FOREST_TOUCH_DEATH_RESPAWN_DELAY = 2.48
//
// In-level respawn after a predator kill — past the tail plus a runway so the
// hero is not inside the body and has time to run before hunt speed closes
// the gap (see resolveForestPredatorRespawnX).
//
const FOREST_PREDATOR_BODY_LENGTH_PX = 84
const HERO_PREDATOR_RESPAWN_RUNWAY_PX = 110
const HERO_PREDATOR_RESPAWN_MIN_FROM_HEAD =
  FOREST_PREDATOR_BODY_LENGTH_PX +
  HERO_TOUCH_DEATH_RESPAWN_SIDE_OFFSET +
  HERO_TOUCH_DEATH_RESPAWN_CLEARANCE +
  FOREST_HERO_HITBOX_HALF_W +
  HERO_PREDATOR_RESPAWN_RUNWAY_PX
//
// Respawn strip half-width around the death spot when the crawler has no
// patrol bounds of its own.
//
const HERO_PREDATOR_RESPAWN_FALLBACK_SPAN = 200
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
const BG_PAR_TREE3_COLOR = 'forest0-bg-par-tree3-color'
const BG_PAR_TREE2_COLOR = 'forest0-bg-par-tree2-color'
const BG_PAR_TREE1_COLOR = 'forest0-bg-par-tree1-color'
const BG_STATIC_COLOR = 'forest0-bg-static-color-v14'
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
// Parallax depth blur radii live in forest-focus-depth.js (background → nearground).
// Static ground / gameplay sprites stay sharp at bake time.
//
const TREE_COLOR_SPRITE_NAME = 'forest0-tree-color-v10'
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
const PAR_L1_COLOR_BLEND = 0.14
const PAR_MID_COLOR_BLEND = 0.34
//
// Near-row foliage leans slightly toward the warm sky haze (leaf-only blend)
// while green stays the leading colour — kept low so parallax stays muted.
//
const PAR_L1_LEAF_WARM_BLEND = 0.08
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
// The plane holds a handful of BIG trees built with the same forest-tree
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
// band. The margin has to clear the crown clusters buildForestTree grows from
// the trunk apex (three stubs 28-50px long, see forest-tree.js) — the old
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
// East-half canopy thinning: leaves past CANOPY_THIN_RIM (normalised crown
// radius) are the silhouette and stay; inside, noise patches of about
// CANOPY_THIN_CELL_PX open where the noise falls under the hole threshold.
//
const CANOPY_THIN_RIM = 0.78
const CANOPY_THIN_CELL_PX = 64
const CANOPY_THIN_CLUSTER_HOLE = 0.44
const CANOPY_THIN_DETAIL_HOLE = 0.5
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
const PAR_FARTHEST_BAND_TOP = PAR_FAR_BAND_TOP
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
const OUTER_BG_HEX = FOREST_PAL.playfieldOuter
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
const EAST_ROCK_INSET = 6
const EAST_ROCK_COUNT = 34
//
// Forest HUD row — the (empty) section label's top Y is derived from the FPS
// row's vertical CENTER (FOREST_HUD_FPS_TOP_Y) so the small hero / life icons
// fall into place from that Y via LevelIndicator's own sectionLabelY-relative
// offsets.
//
const FOREST_HUD_LABEL_FONT_SIZE = 48
//
// Same canvas metrics as lesson-indicator's bakeHudLetterCanvas
// (fontSize * 1.2 + pad * 2 tall), which the icon offsets assume.
//
const FOREST_HUD_LABEL_CANVAS_PAD = 4
const FOREST_HUD_LABEL_BAKED_HALF_H =
  (FOREST_HUD_LABEL_FONT_SIZE * 1.2 + FOREST_HUD_LABEL_CANVAS_PAD * 2) / 2
//
// HUD row lives inside the top void strip (above the playfield). FPS/label
// share one vertical centre so FPS, small hero and life sit on one line.
// Screen-space, so both get VOID_PAD_Y added in recomputeForestScreenLayout to
// stay inside the (possibly pushed-down) top void strip on a tall window.
//
let FOREST_HUD_FPS_TOP_Y = 55
let FOREST_HUD_LABEL_TOP_Y = FOREST_HUD_FPS_TOP_Y - FOREST_HUD_LABEL_BAKED_HALF_H
//
// Neutral HUD grey for HUD text — palette gray5.
//
const HUD_SCORE_COLOR_SETTLED = forestRgb('hudScore')
//
// Skip lake fill when the camera is well off the water span.
//
const LAKE_SURFACE_CULL_MARGIN = 48
//
// Off-screen slack for world decor culling (ear-trees, chain-buoys).
//
const FOREST_DECOR_CULL_MARGIN = 64
//
// Hero body / outline tones for lesson-forest.0 — lighter than the shared
// heroOutline (menu.js still uses that one directly for its own hero).
//
const HERO_OUTLINE_COLOR = FOREST_PAL.forestContour.gameplay
const HERO_BODY_COLOR = FOREST_PAL.heroBodyGray
//
// Forest hero: white body, dark rim, two open eyes from the first frame.
//
const HERO_FILLED_BODY_COLOR = String(CFG.visual.colors.hero.eyeWhite).replace('#', '')
const HERO_FILLED_OUTLINE_COLOR = CFG.visual.colors.outline
const HERO_EYE_BAKE_COLORS = {
  eyeWhiteColor: CFG.visual.colors.hero.eyeWhite,
  pupilColor: CFG.visual.colors.hero.eyePupil,
  transparentEyeInterior: false
}
//
// Zone persistence keys (forest.* prefix).
//
const KEY_REVEALED_WATER = 'forest.revealedWater'
//
// Prize stalk-eye east of the right mushroom: tall enough that a plain jump
// never reaches the cap, close enough for a mushroom bounce with air control.
//
const FOREST_PRIZE_EYE_OFFSET_X = 150
const FOREST_PRIZE_EYE_SEGMENTS = 11
const FOREST_PRIZE_EYE_SEGMENT_LEN = 26
const FOREST_PRIZE_EYE_SEGMENT_WIDTH = 4.1
const FOREST_PRIZE_EYE_SWAY_AMP = 0.06
const FOREST_PRIZE_EYE_SWAY_SPEED = 0.9
const FOREST_PRIZE_EYE_SWAY_LAG = 0.55
const FOREST_PRIZE_EYE_SEED = 2.17
const FOREST_PRIZE_EYE_SCLERA_RADIUS = 6.2
const FOREST_PRIZE_EYE_PUPIL_RADIUS = 2.4
const FOREST_SHORE_TREE_BUOY_CLEAR_X = 78
//
// Two leftmost stalk-eyes form a bounce chain onto the shore-tree branch.
// The first (west) eye sits higher; the second sits lower, one jump east.
//
const FOREST_CHAIN_TRAMP_EYE_STEP_X = 148
const FOREST_CHAIN_TRAMP_MUSH_STEP_X = 168
const FOREST_CHAIN_TRAMP_PAIR_SHIFT_LEFT = 72
const FOREST_CHAIN_TRAMP_SEGMENT_LEN = 26
const FOREST_CHAIN_TRAMP_SECOND_SEGMENTS = 6
const FOREST_CHAIN_TRAMP_FIRST_SEGMENTS = 11
const FOREST_CHAIN_TRAMP_WEST_MARGIN = 240
const FOREST_CHAIN_TRAMP_SWAY_AMP = 0.11
const FOREST_CHAIN_TRAMP_SWAY_SPEED = 1.1
const FOREST_CHAIN_TRAMP_SWAY_LAG = 0.55
const SHORE_BRANCH_PLAT_HIDE_X = -500
const SHORE_BRANCH_PLAT_HIDE_Y = -5000
//
// Extra offset for the L log + right spikes — landing arc from the walking
// trampoline reads cleaner slightly higher and east of the chain-eye layout.
//
const KEY_REVEALED_GROUND_DECOR = 'forest.revealedGroundDecor'
const KEY_REVEALED_GROUND_DECOR_RIGHT = 'forest.revealedGroundDecorRight'
const KEY_REVEALED_GROUND_DECOR_LEFT = 'forest.revealedGroundDecorLeft'
const KEY_GROUND_RIGHT_STRIP_MAX = 'forest.groundRightStripMax'
const KEY_LEFT_SHORE_ROCK = 'forest.leftShoreRock'
const KEY_LIFE_SHOWN = 'forest.lifeShown'
const KEY_INTRO_SHOWN = 'forest.introShown'
const KEY_LEVEL_STATE = 'forest.levelState'
const KEY_CAMERA_INTRO_DONE = 'forest.cameraIntroDone'
const KEY_RESPAWN_NEAR_TREE = 'forest.respawnNearTree'
const KEY_LAST_SPAWN_MODE = 'forest.lastSpawnMode'
const KEY_LAST_SPAWN_X = 'forest.lastSpawnX'
const KEY_LAST_SPAWN_Y = 'forest.lastSpawnY'
//
// Feet may rise above the mouth lip while jumping inside the collapsed pit.
//
const PIT_CAVE_AIR_ABOVE_LIP = 210
//
// Main playfield in front of the mouth — hero stays on the normal sprite here.
//
const PIT_CAVE_APPROACH_GROUND_FEET = 20
const DROWN_RESPAWN_LAKE_CLEARANCE = 56
//
// Ambient birds loop for the whole level.
//
const FOREST_BIRDS_AUDIO_SRC = './sounds/birds.mp3'
const FOREST_BIRDS_PLAYBACK_RATE = 1
//
// Birds low-pass cutoff — high enough to keep the full, bright mix.
//
const FOREST_BIRDS_COLOR_LOWPASS_HZ = 14000
let forestBirdsLoopHandle = null
//
// Intro advances on deliberate confirm keys — not movement bindings.
//
//
// First-visit controls hint: a speech bubble on the hero with the hot keys.
// The hero can move while it is up (walking away is one way to close it).
//
const HINT_INTRO_TEXT = '\'awd, ←, →, ↑ & space\'\nto move, jump & interact\nwith the world.'
const HINT_INTRO_DURATION = 18
//
// Walking this far from the bubble dismisses it early; the first moments of
// movement are ignored so spawn settle and camera snap never clear it.
//
const FOREST_HINT_DISMISS_DISTANCE = 80
const FOREST_HINT_MOVEMENT_DISMISS_GRACE = 0.45
//
// The hint closes on deliberate confirm keys — not movement bindings.
//
const INTRO_ADVANCE_KEY_NAMES = ['space', 'enter']
//
// After the opening camera settles, wait this long before showing the hint.
//
const CAMERA_INTRO_HINT_DELAY = 1
const FOREST_PROXIMITY_SOUND_RADIUS = 120
const FOREST_PROXIMITY_SOUND_MAX_VOLUME = CFG.audio.ambient.volume
//
// Drowning — land on the lake floor, then sink under the fill.
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
// Pit-cave hero blit — above trampoline bake (player + 22) and forest-floor front decor.
//
const PIT_CAVE_HERO_FOREGROUND_Z = GRASS_Z + 14
//
// Colour-world forest floor: hill and cream mushrooms behind the hero (under
// the decor mushrooms at z 7), ferns and plumes in front of him under grass.
//
const FOREST_FLOOR_BACK_Z = 6.5
const FOREST_FLOOR_FRONT_Z = GRASS_Z - 1
const FOREST_FLOOR_STALK_EYE_CLEAR_HALF = 22
const FOREST_FLOOR_SHORE_TRUNK_CLEAR_HALF = 30
const FOREST_EAR_TREE_ROOTS_Z = GRASS_Z + 1
const FOREST_EAR_TREE_TRUNK_OVERLAY_Z = GRASS_Z + 2
const FOREST_EAR_TREE_BRANCHES_Z = GRASS_Z + 3
const FOREST_SPIKY_TOMATO_Z = FOREST_EAR_TREE_BRANCHES_Z + 0.5
const TOMATO_BURST_HERO_SAFE_RADIUS = 100
const TOMATO_BURST_HERO_SAFE_SEC = 3.2
const FOREST_EAR_TREE_COUNT = 2
const GRASS_TUFT_COUNT = 22
//
// Right-ground discovery fades into the unknown instead of cutting on a strip.
//
const GROUND_REVEAL_FADE_WIDTH = 220
const GROUND_REVEAL_LOOKAHEAD = 80
const GROUND_DETAIL_LOOKAHEAD = 28
//
// Fine organic specks in the upper topsoil (reference cross-section) — not
// square grit or coarse film-grain blocks.
//
const TOPSOIL_ORGANIC_SPECK_COUNT = 3200
const TOPSOIL_ORGANIC_SEED = 41827
const TOPSOIL_ORGANIC_ALPHA = 0.42
const EARTH_STATIC_BAKE_GRAIN = 0.26
const EARTH_STATIC_BAKE_GRAIN_BLOCK_PX = 2
//
// Sky bake uses stacked palette bands instead of a smooth CSS gradient.
//
const SKY_DITHER_BAND_COUNT = 7
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
const TRAMP_CAP_STAND_HALF = TRAMP_CAP_HALF + FOREST_HERO_HITBOX_HALF_W
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
const TRAMP_SPRITE = 'forest0-trampoline-v4'
const TRAMP_OFFSET_FROM_L_PLAT = 50
//
// Static branch trampoline — right of the main tree (jump onto the start branch).
//
const BRANCH_TRAMP_OFFSET_X = 145
const BRANCH_TRAMP_BOOST_MULT = 1.68
const FOREST_CAMERA_SHAKE_AMP = 5
const FOREST_CAMERA_SHAKE_DURATION = 0.22
const FOREST_BRANCH_JUMP_SHAKE_AMP = 4.5
const FOREST_BRANCH_JUMP_SHAKE_DURATION = 0.2
//
// Second landing on a big tree's branch drops its payload: the apple on the
// left tree, the dry stick onto the centipede's back on the right tree.
//
const FOREST_BRANCH_LANDINGS_TO_DROP = 2
const PREDATOR_LAKE_EDGE_PAD = 28
const PREDATOR_CAVE_MOUTH_PAD = 24
//
// Predator only tracks the hero when feet sit on the same ground band (branch / cave / air are other planes).
//
const FOREST_PREDATOR_HERO_VERTICAL_BAND_PX = 46
//
// Keeps the invisible cap alive briefly after a shaky on-cap read (prevents yank to hide Y).
//
const TRAMP_CAP_PAD_LATCH_SEC = 0.28
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
// The lake's right shore (and its rock cluster) is laid out from the hero
// branch root at the trunk, this far to the left — independent of how long
// the branch itself is drawn.
//
const LAKE_SHORE_ANCHOR_FROM_TRUNK = 200
const LAKE_Z = 12
//
// Tree-side shore rocks baked as one tall rock reaching the lake bed: how
// steeply the flanks drop, how far past the bed they sink and how much the
// base spreads outward (bed clip and underwater tint: forest-lake.js).
//
const LAKE_SHORE_ROCK_FLANK_EXP = 0.6
const LAKE_SHORE_ROCK_BED_OVERSHOOT_PX = 14
const LAKE_SHORE_ROCK_BASE_SPREAD = 1.55
//
// Pinch the dry cap and flare the submerged base so the pile is wider at
// the bed than above the water line.
//
const LAKE_SHORE_ROCK_TOP_PINCH = 0.22
const LAKE_SHORE_ROCK_BOTTOM_FLARE = 2.4
//
// The whole merged rock shrinks toward the lake's right shore (between the
// water core end and the bake end) so it only caps the shoreline instead of
// reaching far into the lake.
//
const LAKE_SHORE_ROCK_SCALE = 0.3
const LAKE_SHORE_ROCK_ANCHOR_T = 0.5
//
// The stone pile rises well above the water line, like a heap against the bank.
//
const LAKE_SHORE_ROCK_LIFT_PX = 24
//
// Lake layers (see forest-lake.js): the bed and the algae under the water
// fill. The sprite key keeps the level's baked lake names.
//
const LAKE_BED_Z = 11.6
const LAKE_ALGAE_Z = 11.7
const LAKE_SPRITE_KEY = 'forest0'
//
// Hair-root clearance around the cave mouth (left / right of the crack zone).
//
const FOREST_UG_CAVE_ROOTLET_CLEAR_L = 32
const FOREST_UG_CAVE_ROOTLET_CLEAR_R = 48
//
// Drowning: default hero sprite hidden; clipped draw shows only above the wave.
//
const DROWN_HERO_DRAW_Z = CFG.visual.zIndex.playerShadow
const FOREST_DROWN_HERO_CLIP_Z = LAKE_Z + 1
//
// The sunk part of a drowning hero is drawn under the see-through water.
//
const FOREST_DROWN_HERO_UNDERWATER_Z = LAKE_Z - 0.1
const PAR_TRUNK_WIDTH_SCALE_NEAR = 0.68
const PAR_TRUNK_WIDTH_SCALE_MID = 0.76
//
// Blocks every bootstrap yield frame until zone visibility and camera are ready.
//
const FOREST_BOOTSTRAP_CURTAIN_Z = CFG.visual.zIndex.ui + 50
//
// Tree-side lake cap rocks must draw above swaying grass or the blades hide
// the shore caps when the left ground decor opens with the lake.
//
const SHORE_END_ROCK_Z = GRASS_Z + 1
//
// Decor mushrooms lean with the heroine's idle whistle (same pulse as touch L1)
//
const FOREST_MUSHROOM_WHISTLE_AMP_DEG = 14
const FOREST_MUSHROOM_WHISTLE_SMOOTH = 7
//
// Hero foot offset — matches COLLISION_HEIGHT/2 + COLLISION_OFFSET_Y in hero.js.
//
const SURFACE_DETECT_Y = 38
//
// Hero pos is above his feet by SURFACE_DETECT_Y; the plant aims at mid-body.
//
const FOREST_EYE_FLOWER_HERO_CENTER_DY = 12
//
// Eye-flower grab ends the level: hand-off into the touch section.
//
const FLOWER_GRAB_TRANSITION_FROM = 'lesson-forest.0'
const FLOWER_GRAB_NEXT_LESSON = 'lesson-cave.0'
const KEY_FOREST_COMPLETED = 'forest.completed'
const KEY_LAST_LESSON = 'lastLesson'
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
const POST_LAND_AIR_LOCK_FOREST = 0.28
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
let forestLevel0BootstrapReporter = null
let forestLevel0BootstrapSlice = { start: 38, end: 100 }
let forestLevel0BootstrapPromise = null
let forestLevel0SceneSession = 0
let forestLevel0LiveHeroChar = null
const forestLevel0SceneRegisteredFor = new WeakSet()
//
// Maps scene-bootstrap local 0–100 progress onto the DOM loader bar slice
// reserved for initForestLevel0Scene (prewarm uses 5–38 %).
//
export function setForestLevel0BootstrapReporter(reporter, slice = { start: 38, end: 100 }) {
  forestLevel0BootstrapReporter = reporter
  forestLevel0BootstrapSlice = slice
  forestLevel0BootstrapLocalMax = 0
  setLoaderBarCreepBoost(true)
}
export function clearForestLevel0BootstrapReporter() {
  forestLevel0BootstrapReporter = null
  setLoaderBarCreepBoost(false)
}
export function waitForForestLevel0Bootstrap() {
  return forestLevel0BootstrapPromise || Promise.resolve()
}
let forestLevel0BootstrapLocalMax = 0
function reportForestLevel0Bootstrap(localPct) {
  if (!forestLevel0BootstrapReporter) return
  const clamped = Math.min(100, Math.max(0, localPct))
  if (clamped <= forestLevel0BootstrapLocalMax) return
  forestLevel0BootstrapLocalMax = clamped
  const start = forestLevel0BootstrapSlice.start
  const end = forestLevel0BootstrapSlice.end
  const t = forestLevel0BootstrapLocalMax / 100
  forestLevel0BootstrapReporter(start + (end - start) * t)
}
function forestInitStale(session) {
  return session !== forestLevel0SceneSession
}
async function forestBootstrapPause(bootstrap, localPct, session) {
  if (forestInitStale(session)) return true
  bootstrap?.report?.(localPct)
  bootstrap?.yieldStep && await bootstrap.yieldStep()
  bootstrap?.yieldStep && await bootstrap.yieldStep()
  return forestInitStale(session)
}
function beginForestLevel0Scene(k) {
  const session = ++forestLevel0SceneSession
  forestLevel0BootstrapPromise = runForestLevel0SceneInit(k, session)
}
async function runForestLevel0SceneInit(k, session) {
  forestLevel0BootstrapLocalMax = 0
  const bootstrap = forestLevel0BootstrapReporter ? {
    report: reportForestLevel0Bootstrap,
    yieldStep: () => yieldForGpu(1)
  } : null
  try {
    await initForestLevel0Scene(k, bootstrap, session)
    if (!forestInitStale(session)) {
      bootstrap && reportForestLevel0Bootstrap(100)
      setLoaderBarPct(100)
    }
  } finally {
    !forestInitStale(session) && (forestLevel0BootstrapPromise = null)
    !forestInitStale(session) && clearForestLevel0BootstrapReporter()
  }
}
/**
 * Registers the FOREST section level 0 scene.
 * @param {Object} k - Kaplay instance
 */
export function sceneForestLevel0(k) {
  if (forestLevel0SceneRegisteredFor.has(k)) return
  forestLevel0SceneRegisteredFor.add(k)
  k.scene('lesson-forest.0', () => {
    beginForestLevel0Scene(k)
  })
}
/**
 * Bakes tree + parallax sprites during the menu→Forest transition (single DOM loader).
 * @param {Object} k - Kaplay instance
 * @param {Function} [onProgress] - 0–100 bake progress
 */
export async function prewarmForestLevel0HeavyAssets(k, onProgress) {
  recomputeForestScreenLayout(k)
  onProgress?.(5)
  await yieldForGpu(1)
  const treeData = buildForestTree(TREE_SEED, TREE_X, TREE_TRUNK_BOTTOM_Y, TREE_TOP_Y, TREE_ROOT_MAX_Y, TREE_ROOT_START_Y, {
    ...forestTreeBuildOptsForDensity('nearground'),
    foliageDetailLeavesMin: MAIN_TREE_FOLIAGE_DETAIL_LEAVES_MIN,
    foliageDetailLeavesMax: MAIN_TREE_FOLIAGE_DETAIL_LEAVES_MAX,
    heroBranchFrac: MAIN_TREE_HERO_BRANCH_FRAC,
    structuredCrown: true
  })
  scaleForestTreeTrunkWidths(treeData, MAIN_TREE_TRUNK_WIDTH_SCALE)
  onProgress?.(12)
  await yieldForGpu(1)
  bakeMonolithicForestTreeSprites(k, treeData)
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
  if (!forestParallaxSpritesPrewarmed(k)) {
    await buildParallaxSprites(k, forestUndergroundSpec(k), async (done, total) => {
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
    postBakeCanvas: applyForestGameplaySharpBake
  })
  onProgress?.(90)
  await yieldForGpu(1)
  onProgress?.(100)
}
//
// Builds lesson-forest.0 — tree segments, parallax, decor and gameplay hooks.
//
async function initForestLevel0Scene(k, bootstrap, session) {
    if (forestInitStale(session)) return
    if (await forestBootstrapPause(bootstrap, 2, session)) return
    recomputeForestScreenLayout(k)
    const bootstrapCurtain = createForestBootstrapCurtain(k)
    set('lastLesson', 'lesson-forest.0')
    set('lastSection', 'forest')
    CanvasBackdrop.applyCanvasBackdrop(k, OUTER_BG_HEX)
    k.onSceneLeave(() => CanvasBackdrop.clearCanvasBackdrop(k))
    k.setGravity(CFG.game.gravity)
    const sound = Sound.create()
    Sound.startAudioContext(sound)
    sound._k = k
    const birdsMusic = createForestBirdsLoopAudio()
    bindForestBirdsLoopAudio(birdsMusic)
    const stopForestLoopAudio = () => {
      leaveForestBirdsLoopAudio()
      Sound.setEarTreeWhisperVolume(0)
      Sound.stopRainSound(sound)
      Sound.stopTrampWaterStepsLoop(sound)
      Sound.stopWaterStepsLoop(sound)
    }
    const zones = loadForestZones()
    if (await forestBootstrapPause(bootstrap, 6, session)) return
    //
    // Draw callbacks on decor/tramps read zones._sceneRef before inst exists
    // (async bootstrap yields to the engine between setup steps).
    //
    zones._sceneRef = { zones }
    const treeData = buildForestTree(TREE_SEED, TREE_X, TREE_TRUNK_BOTTOM_Y, TREE_TOP_Y, TREE_ROOT_MAX_Y, TREE_ROOT_START_Y, {
    ...forestTreeBuildOptsForDensity('nearground'),
    foliageDetailLeavesMin: MAIN_TREE_FOLIAGE_DETAIL_LEAVES_MIN,
    foliageDetailLeavesMax: MAIN_TREE_FOLIAGE_DETAIL_LEAVES_MAX,
    heroBranchFrac: MAIN_TREE_HERO_BRANCH_FRAC,
    structuredCrown: true
  })
    scaleForestTreeTrunkWidths(treeData, MAIN_TREE_TRUNK_WIDTH_SCALE)
    const treeFruitAnchorCfg = buildForestTreeFruitAnchorCfg()
    !forestTreeSpritesPrewarmed(k) && bakeMonolithicForestTreeSprites(k, treeData)
    //
    // One build per scene run — it paints the whole crown into a canvas and
    // reads it back, so it never runs from a per-frame path.
    //
    const treeFruitSpots = buildForestTreeFruitSpots(treeData, treeFruitAnchorCfg)
    if (await forestBootstrapPause(bootstrap, 14, session)) return
    //
    // The underground decor spec is baked into the combined static earth band.
    //
    if (!forestParallaxSpritesPrewarmed(k)) {
      await buildParallaxSprites(k, forestUndergroundSpec(k), async (done, total) => {
        const pct = 15 + Math.round(6 * (done - 1) / Math.max(1, total - 1))
        if (await forestBootstrapPause(bootstrap, pct, session)) return
      })
      if (forestInitStale(session)) return
    }
    if (await forestBootstrapPause(bootstrap, 20, session)) return
    if (await forestBootstrapPause(bootstrap, 24, session)) return
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
    if (await forestBootstrapPause(bootstrap, 27, session)) return
    const floorPlat = floorBounds.floor
    createRoundedCorners(k)
    const { horizBranch } = treeData
    //
    // Platform top aligns with physY — the visible branch walk surface
    //
    const branchPlatBundle = createForestHorizBranchPlatforms(k, horizBranch, 'startBranch', BRANCH_PLAT_COLLISION_DROP_Y)
    const branchPlat = branchPlatBundle.plats[0]
    const branchPlatHome = branchPlatBundle.homes[0]
    const branchPlatY = branchPlatHome.y
    const branchTrampX = TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X
    const rightZoneBaseXEarly = TREE_X + RIGHT_PLAT_OFFSET_X + RIGHT_ZONE_SHIFT_X
    const trampXEarly = rightZoneBaseXEarly + LOG_W + TRAMP_OFFSET_FROM_L_PLAT
    const earTreeSpots = buildForestEarTreeSpots({ branchTrampX, trampX: trampXEarly })
    const eastGroundRockMinX = forestEastGroundStartX()
    const rightZoneBaseX = rightZoneBaseXEarly
    //
    // Right mushroom trampoline's X — computed early (same reason as
    // rightZoneBaseX above) so the spawn-clearance check right after can see
    // it; createMushroomTrampoline() reuses this same value further below.
    //
    const trampX = trampXEarly
    const heroGroundCenterY = FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    let heroSpawnY = FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    const forestFirstStartGroundSpawnX = computeForestFirstStartGroundSpawnX({
      branchTrampX,
      trampX,
      branchTrampVisible: isBranchTrampolineVisible(zones),
      trampVisible: isRightTrampolineVisible(zones),
      heroGroundCenterY
    })
    const respawnNearTree = get(KEY_RESPAWN_NEAR_TREE, false)
    respawnNearTree && set(KEY_RESPAWN_NEAR_TREE, false)
    const lastSpawnMode = get(KEY_LAST_SPAWN_MODE, null)
    const lastSpawnX = get(KEY_LAST_SPAWN_X, null)
    const lastSpawnY = get(KEY_LAST_SPAWN_Y, null)
    //
    // Default start: on the ground right of the left mushroom, outside the
    // island flower's whisper. A saved pose (ground, branch, tree, cave) from
    // a menu exit or reload is restored as is.
    //
    let heroSpawnX = forestFirstStartGroundSpawnX
    const hasSavedPose = !respawnNearTree && lastSpawnX != null && lastSpawnY != null && lastSpawnMode
    if (hasSavedPose) {
      heroSpawnX = lastSpawnX
      heroSpawnY = lastSpawnY
    }
    const spawnElevated = hasSavedPose && lastSpawnMode !== SPAWN_MODE_CAVE &&
      heroSpawnY + SURFACE_DETECT_Y < FLOOR_Y - LOG_SNAP_STANDING_MAX
    //
    // A saved/derived ground spawn landing right on a mushroom's bounce cap
    // (branch tramp near the tree, or the far right tramp) would launch the
    // hero into the air the instant the level loads — pull it clear to
    // whichever side is closer.
    //
    lastSpawnMode !== SPAWN_MODE_CAVE && hasSavedPose && !spawnElevated &&
      (heroSpawnX = nudgeForestHeroSpawnAwayFromTrampolines({
        spawnX: heroSpawnX,
        spawnOnBranch: false,
        branchTrampX,
        trampX,
        branchTrampVisible: isBranchTrampolineVisible(zones),
        trampVisible: isRightTrampolineVisible(zones)
      }))
    //
    // Forest SFX and birds.mp3 from the first frame (see syncForestWorldBirdsVolume).
    //
    sound._forestSfxMuted = false
    sound.forestSfxGain && (sound.forestSfxGain.gain.value = 1)
    Sound.stopRainSound(sound)
    k.onSceneLeave(() => {
      Sound.stopRainSound(sound)
      Sound.stopAmbient(sound)
      k.camScale(1)
    })
    if (forestInitStale(session)) return
    destroyStrayForestHeroBody(k)
    const forestHeroCreateCfg = {
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      bodyColor: HERO_FILLED_BODY_COLOR,
      outlineColor: HERO_FILLED_OUTLINE_COLOR,
      ...HERO_EYE_BAKE_COLORS,
      outlineOnly: false,
      footFx: false,
      stepSoundScene: 'lesson-forest.0',
      suppressFootprints: true,
      airAnimDuringFlicker: true,
      runDuringFlicker: true,
      suppressDust: true,
      postBakeCanvas: applyForestGameplaySharpBake,
      //
      // No idle humming until the level's late-game beats — keeps the early
      // world quiet while the hero learns to see.
      //
      idleVocalization: null,
      idleNotePostBake: applyForestGameplaySharpBake
    }
    const heroInst = Hero.create({
      k,
      x: heroSpawnX,
      y: heroSpawnY,
      ...forestHeroCreateCfg
    })
    //
    // Forest level: no particle assembly on spawn (first visit or reload).
    //
    Hero.spawn(heroInst, { instant: true })
    spawnElevated && holdForestHeroForElevatedSpawn(heroInst)
    forestLevel0LiveHeroChar = heroInst.character
    snapForestCameraToHero(k, heroInst)
    if (await forestBootstrapPause(bootstrap, 29, session)) return
    if (await forestBootstrapPause(bootstrap, 30, session)) return
    if (await forestBootstrapPause(bootstrap, 36, session)) return
    //
    // footFx stays off (no dust) but run-step sounds still route through forest
    // ground/wood detection via sound._forestSurface.
    //
    bindForestHeroFootSounds(heroInst, sound)
    branchPlatBundle.plats.forEach(plat => tagWoodPlatform(plat, sound, heroInst))
    tagGroundPlatform(floorPlat, sound, heroInst)
    floorBounds.postCaveFloor && tagGroundPlatform(floorBounds.postCaveFloor, sound, heroInst)
    const lakeShoreAnchorX = horizBranch.x2 - LAKE_SHORE_ANCHOR_FROM_TRUNK
    const clusterCenterX = lakeShoreAnchorX + 40
    const waterX2 = clusterCenterX + CLUSTER_ROCK_RADIUS_MAX + 10 - WATER_RIGHT_TRIM
    const trampBundle = createMushroomTrampoline(k, trampX, FLOOR_Y, zones, {
      drawZ: CFG.visual.zIndex.player + 1,
      colors: FOREST_PAL.cuteMushroomRed,
      spriteKey: 'right'
    })
    const branchTrampBundle = createMushroomTrampoline(k, branchTrampX, FLOOR_Y, zones, {
      gateBranchTramp: true,
      drawZ: CFG.visual.zIndex.platforms + 2
    })
    if (await forestBootstrapPause(bootstrap, 44, session)) return
    const lakeX1 = LEFT_MARGIN
    const lakeX2 = waterX2
    //
    // Computed here (before grass) so the grass field can exclude the same
    // spots the ear-trees will actually plant at - see EAR_TREE_TRUNK_GRASS_CLEAR_HALF.
    //
    const grassLayer = createForestGrass(k, lakeX1, waterX2, trampX, branchTrampX, zones, earTreeSpots, treeFruitAnchorCfg)
    //
    // Rocks and mushrooms bake one or two canvases per instance (dozens of
    // decor pieces total). Registering them all into one shared atlas (built
    // right after both are placed) means every decor sprite on screen shares
    // a single texture bind instead of each piece forcing its own
    // bindTexture/useProgram GPU state change.
    //
    const decorAtlas = createCanvasAtlasBuilder()
    const rockObjs = createForestRocks(k, lakeShoreAnchorX, lakeX2, rightZoneBaseX, trampX, branchTrampX, zones, decorAtlas, eastGroundRockMinX)
    const mushObjs = createForestMushrooms(k, lakeX1, waterX2, trampX, branchTrampX, zones, decorAtlas)
    decorAtlas.build(k)
    if (await forestBootstrapPause(bootstrap, 54, session)) return
    const predatorPatrolBounds = computeForestPredatorPatrolBounds(lakeX2)
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
    if (zones.predatorAwake) {
      isForestSpawnTooCloseToPredator(predator, heroSpawnX, heroSpawnY) &&
        heroInst.character?.pos &&
        (heroInst.character.pos.x = resolveForestPredatorRespawnX(
          heroSpawnX,
          heroSpawnY,
          predator
        ))
    }
    if (await forestBootstrapPause(bootstrap, 62, session)) return
    const waterLayer = createWater(k, lakeX1, waterX2, zones, rockObjs)
    createLakeShoreRockLayer(k, zones)
    if (await forestBootstrapPause(bootstrap, 72, session)) return
    if (await forestBootstrapPause(bootstrap, 74, session)) return
    initTouchInput(k)
    TouchControls.create(k)
    const goldRgb = getRGB(k, FOREST_GOLD_HEX)
    const levelIndicator = createForestLevelIndicator(k)
    LevelIndicator.bindEyeHudLookAtHero(levelIndicator, heroInst)
    pinForestHudFixed(levelIndicator)
    LevelIndicator.revealLifeHud(levelIndicator, false)
    set(KEY_LIFE_SHOWN, true)
    if (await forestBootstrapPause(bootstrap, 76, session)) return
    if (await forestBootstrapPause(bootstrap, 78, session)) return
    if (await forestBootstrapPause(bootstrap, 80, session)) return
    if (await forestBootstrapPause(bootstrap, 82, session)) return
    trampBundle.state.homeX = trampX
    trampBundle.state.x = trampX
    trampBundle.state.hasLegs = false
    trampBundle.state.walkDir = 0
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
    if (await forestBootstrapPause(bootstrap, 84, session)) return
    const camera = ForestCamera.create({
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
      // world vertically. See recomputeForestScreenLayout / VOID_PAD_Y.
      //
      fixedCamY: Math.round(DESIGN_SCREEN_H / 2)
    })
    if (await forestBootstrapPause(bootstrap, 86, session)) return
    const inst = {
      k,
      camera,
      cameraIntroPlaying: false,
      sound,
      birdsMusic,
      heroInst,
      zones,
      treeObj,
      treeData,
      treeStripEndX: WORLD_W - RIGHT_MARGIN - 20,
      wallObjs: floorBounds.walls,
      grassLayer,
      rockObjs,
      mushObjs,
      predator,
      touchDeathHandled: false,
      touchDeathCount: 0,
      predatorDeathCount: 0,
      touchDeathGraceUntil: 0,
      touchDeathRespawnWait: null,
      forestHeroCreateCfg,
      heroSpawnNudge: {
        branchTrampX,
        trampX
      },
      waterLayer,
      pitDrawLayer: null,
      pitCaveHeroForeground: false,
      pitCaveTrampWasAboveCap: false,
      leftDecorFade: zones.groundDecorLeft ? 1 : 0,
      trampBundle,
      branchTrampBundle,
      trampPad,
      branchTrampPad,
      branchTrampBounceAir: false,
      trampBounceAir: false,
      trampState: trampBundle.state,
      branchTrampState: branchTrampBundle.state,
      lakeX1,
      lakeX2,
      waterX2,
      lastHeroX: heroSpawnX,
      heroSpawnX,
      forestFirstStartGroundSpawnX,
      logHoverFrames: 0,
      wasGrounded: false,
      wasGroundedOnBranch: false,
      expectBranchWoodLandSound: false,
      wasHeroRunning: false,
      drowning: false,
      forestDrownHeroClipLock: false,
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
      // Speech bubble for the controls hint (introLock: it is on screen).
      //
      heroHint: HeroHint.create({ k, heroInst, clampInset: forestTooltipClampInset() }),
      pendingForestIntro: false,
      introHintDelayRemaining: 0,
      introLock: false,
      introHintOnComplete: null,
      startBranch: branchPlatBundle.startBranch,
      branchPlat,
      branchPlatHome,
      branchPlatSegs: branchPlatBundle,
      midges: createForestMidges(k, FLOOR_Y, WORLD_W, { treeX: TREE_X }),
      pit: null,
      woodSurfaces: [
        { x1: horizBranch.x1, x2: horizBranch.x2, y: branchPlatY, h: HORIZ_PLATFORM_H }
      ],
      treeFruitSpots,
      treeFruitAnchorCfg,
      branchTrampX,
      _startBranchLandingCount: 0
    }
    predator.levelInst = inst
    predator.landAt = (x) => forestPredatorGroundAt(inst, x)
    predator.canHuntHero = () => forestPredatorCanHuntHero(inst)
    mountForestTreeFruitLayer(k, inst)
    inst.treeX = TREE_X
    inst.trunkExcludeHalf = TRUNK_EXCLUDE_HALF
    inst.floorY = FLOOR_Y
    inst.eyeFlower = EyeFlower.create({
      k,
      x: EyeFlower.islandWorldX(lakeX1),
      waterY: WATER_SURFACE_Y,
      lakeX1,
      lakeX2,
      reachTriggerX: TREE_X,
      getHeroPos: () => forestEyeFlowerHeroPos(inst),
      isVisible: () => isForestEyeFlowerVisible(inst)
    })
    tagGroundPlatform(inst.eyeFlower.collider, sound, heroInst)
    createForestHorizFallTwigLayer(k, inst)
    if (await forestBootstrapPause(bootstrap, 87, session)) return
    zones._lakeX1 = lakeX1
    zones._lakeX2 = lakeX2
    zones._groundStripEndX = WORLD_W - RIGHT_MARGIN - 20
    if (await forestBootstrapPause(bootstrap, 89, session)) return
    applyZoneVisibility(inst)
    revealWaterZone(inst)
    syncForestFpsHudVisibility(inst)
    maybeStartForestCameraIntro(inst)
    updateForestCamera(inst)
    updatePlayfieldBorderColors(inst)
    inst.zones._sceneRef = inst
    const wasInCaveSpawn = lastSpawnMode === SPAWN_MODE_CAVE
    if (await forestBootstrapPause(bootstrap, 91, session)) return
    inst.pit = createForestPit({
      k,
      floorY: FLOOR_Y,
      screenW: WORLD_W,
      heroInst,
      sound,
      levelIndicator,
      heroBodyColor: HERO_BODY_COLOR,
      groundColor: GROUND_DARK
    })
    inst.pit.sceneRef = inst
    applyForestCaveSpawnResume(inst, heroSpawnX, heroSpawnY, wasInCaveSpawn)
    setupForestPitCaveTrampoline(inst)
    inst.footParticles = ForestFootParticles.create({ k })
    inst.flowerGrab = FlowerGrab.create({
      k,
      flower: inst.eyeFlower,
      heroInst,
      earthBottomY: PLAYFIELD_EARTH_BOTTOM_Y,
      footParticles: inst.footParticles,
      camera,
      sound,
      onFinished: finishForestFlowerGrab
    })
    const chainBuoyWoodBands = buildForestChainBuoyWoodBands({
      horizBranch: treeData.horizBranch
    })
    const chainBuoySpots = buildForestChainBuoySpots(
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
      platformXMargin: FOREST_CHAIN_BUOY_PLATFORM_X_MARGIN,
      earthBottomY: PLAYFIELD_EARTH_BOTTOM_Y
    })
    const shoreTreeLayout = ShoreTree.buildForestShoreTreeLayout(chainBuoySpots, FLOOR_Y)
    inst.shoreTree = shoreTreeLayout ? ShoreTree.create({ k, layout: shoreTreeLayout }) : null
    const shoreBranch = inst.shoreTree?.treeData?.horizBranch
    if (shoreBranch) {
      const shorePlatBundle = createForestHorizBranchPlatforms(
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
      onExplode: (x, y) => onForestTomatoExplode(inst, x, y)
    })
    createForestChainBuoyLayer(k, zones)
    createForestEarTreeLayer(k, inst)
    createForestShoreTreeLayer(k, inst)
    const forestFloorBlockers = buildForestFloorBlockers(trampX, branchTrampX, chainBuoySpots, shoreTreeLayout, earTreeSpots, treeFruitAnchorCfg)
    const caveLeftX = getForestCaveMouthFloorLeftX(getCrackZone(WORLD_W, FLOOR_Y))
    inst.forestFloor = ForestFloor.create({
      k,
      floorY: FLOOR_Y,
      xMin: TREE_X + TRUNK_EXCLUDE_HALF,
      xMax: WORLD_W - RIGHT_MARGIN,
      hillX2: WORLD_W,
      rimSpans: [{ x1: inst.lakeX2, x2: caveLeftX }],
      isSpotFree: (x, halfW) => isForestFloorSpotFree(inst, forestFloorBlockers, x, halfW),
      accentXs: earTreeSpots.map(spot => spot.x),
      getOpacity: () => 1,
      backZ: FOREST_FLOOR_BACK_Z,
      frontZ: FOREST_FLOOR_FRONT_Z
    })
    if (await forestBootstrapPause(bootstrap, 93, session)) return
    syncForestAtmosphereZones(inst)
    inst.midges.worldLife = 1
    inst.pendingForestIntro = !get(KEY_INTRO_SHOWN, false)
    applyZoneVisibility(inst)
    restoreForestLevelState(inst)
    spawnElevated && releaseForestHeroOnElevatedSpawn(inst, heroSpawnY)
    bindForestUnloadPersist(inst)
    Hero.suppressIdleVocalization()
    ensureForestBirdsBackgroundPlaying(inst)
    inst._forestBirdsBootstrapKick = true
    registerForestNativeTeardown(() => {
      forestLevel0LiveHeroChar = null
      unbindForestUnloadPersist(inst)
      persistForestOnLeave(inst)
      stopForestLoopAudio()
    })
    const backToMenuCancel = bindBackToMenuKeys(k, () => {
      goToMenuAfterAssets(k)
    })
    k.onSceneLeave(() => {
      backToMenuCancel.cancel()
      inst.touchDeathRespawnWait?.cancel?.()
      inst.touchDeathRespawnWait = null
      unbindForestUnloadPersist(inst)
      persistForestOnLeave(inst)
      stopForestLoopAudio()
    })
    if (await forestBootstrapPause(bootstrap, 95, session)) return
    if (forestInitStale(session)) return
    destroyForestBootstrapCurtain(bootstrapCurtain)
    ensureForestPitDrawLayer(inst)
    if (await forestBootstrapPause(bootstrap, 96, session)) return
    k.onDraw(() => onDraw(inst))
    k.onUpdate(() => onUpdate(inst))
    registerForestTrampolineLateBounce(inst)
    if (await forestBootstrapPause(bootstrap, 97, session)) return
    createPlayfieldFrameOverlay(k, inst)
    //
    // Drowning — clipped hero blit (no extra water geometry on screen).
    //
    k.add([
      k.z(FOREST_DROWN_HERO_CLIP_Z),
      {
        draw() {
          drawForestDrownHeroClipped(inst)
        }
      }
    ])
    k.add([
      k.z(FOREST_DROWN_HERO_UNDERWATER_Z),
      {
        draw() {
          drawForestDrownHeroUnderwater(inst)
        }
      }
    ])
    //
    // Pit cave — hero blit after world decor (onDraw runs before the object tree).
    //
    k.add([
      k.z(PIT_CAVE_HERO_FOREGROUND_Z),
      {
        draw() {
          drawForestPitCaveHeroForeground(inst)
        }
      }
    ])
    await forestBootstrapPause(bootstrap, 100, session)
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
// Shows the controls hint once the opening delay has passed, and marks it
// shown as soon as the bubble is gone (timer or walk-away fallback).
//
function updateForestIntroHint(inst, dt) {
  if (inst.pendingForestIntro) {
    inst.introHintDelayRemaining += dt
    if (inst.introHintDelayRemaining < CAMERA_INTRO_HINT_DELAY) return
    inst.pendingForestIntro = false
    inst.introHintDelayRemaining = 0
    startForestIntro(inst)
  }
  inst.introLock && !HeroHint.isActive(inst.heroHint) && inst.introHintOnComplete?.()
}
//
// Plays the controls hint until the player dismisses it (key, click,
// timer, or walking away).
//
function startForestIntro(inst) {
  if (get(KEY_INTRO_SHOWN, false)) return
  inst.introLock = true
  const introCancels = []
  const cancelIntroInput = () => {
    introCancels.forEach(h => h.cancel())
    introCancels.length = 0
  }
  HeroHint.show(inst.heroHint, HINT_INTRO_TEXT, HINT_INTRO_DURATION, {
    dismissOnJump: false,
    dismissDistance: FOREST_HINT_DISMISS_DISTANCE,
    dismissHorizontalOnly: true,
    movementDismissGrace: FOREST_HINT_MOVEMENT_DISMISS_GRACE,
    forceAbove: true
  })
  inst.introHintOnComplete = () => {
    cancelIntroInput()
    inst.introLock && finishForestIntro(inst)
  }
  //
  // Space / Enter or click dismisses and unlocks (timer still works as fallback).
  //
  const advance = (key) => {
    INTRO_ADVANCE_KEY_NAMES.includes(key) && advanceForestIntro(inst, { cancel: cancelIntroInput })
  }
  introCancels.push(bindStartGameKeys(inst.k, advance))
  introCancels.push(bindPointerActivate(inst.k, () => {
    if (!inst.introLock) return false
    advance(INTRO_ADVANCE_KEY_NAMES[0])
    return true
  }))
}
//
// One key press closes the hint immediately.
//
function advanceForestIntro(inst, introHandlers) {
  introHandlers.cancel()
  if (!inst.introLock) return
  HeroHint.clear(inst.heroHint)
  finishForestIntro(inst)
}
//
// Closes the controls hint for good; it never shows again.
//
function finishForestIntro(inst) {
  set(KEY_INTRO_SHOWN, true)
  inst.introLock = false
  inst.introHintOnComplete = null
}
//
// Playfield chrome inset so the hint bubble pins to the game window, not the void.
//
function forestTooltipClampInset() {
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
// The whole world is open from the first frame: colour, big tree, lake,
// both shores, every mushroom and the awake crawler.
//
function loadForestZones() {
  return {
    predatorAwake: true,
    groundDecorRight: true,
    groundDecorLeft: true,
    groundRightStripMax: GROUND_RIGHT_STRIP_COUNT - 1,
    leftShoreRock: true,
    branchTrampBounceLive: true,
    rightTrampRevealed: true,
    rightTrampBounceLive: true,
    water: false,
    waterDiscovered: true,
    branchTrampRevealed: true
  }
}
//
// Persists forest storage keys before scene leave or native engine teardown.
//
function persistForestOnLeave(inst) {
  if (FlowerGrab.isActive(inst.flowerGrab)) return
  persistForestLastSpawn(inst)
  persistForestLevelState(inst)
}
//
// World state that survives a reload: branch / bomb-tree landing counts, the
// knocked apple on the ground and the stick on the centipede's back.
//
function persistForestLevelState(inst) {
  set(KEY_LEVEL_STATE, {
    startBranchLandings: inst._startBranchLandingCount ?? 0,
    shoreBranchLandings: inst._shoreBranchLandingCount ?? 0,
    tomatoHits: inst.spikyTomatoes ? SpikyTomato.getHits(inst.spikyTomatoes) : [],
    fallenApple: getFallenAnchorFruit(inst, FLOOR_Y),
    twigOnPredator: HorizFallTwig.isTwigOnPredator(inst.shoreFallTwigs)
  })
}
//
// Puts the saved world state back once every object it touches exists.
//
function restoreForestLevelState(inst) {
  const state = get(KEY_LEVEL_STATE, null)
  if (!state) return
  inst._startBranchLandingCount = state.startBranchLandings ?? 0
  inst._shoreBranchLandingCount = state.shoreBranchLandings ?? 0
  inst.spikyTomatoes && SpikyTomato.restoreHits(inst.spikyTomatoes, state.tomatoHits)
  state.fallenApple && restoreFallenAnchorFruit(inst, state.fallenApple.x, state.fallenApple.floorY)
  state.twigOnPredator && inst.zones?.predatorAwake &&
    HorizFallTwig.restoreTwigOnPredator(inst.shoreFallTwigs, inst.predator)
}
//
// A closed window or reload skips scene leave, so the same save runs on unload.
//
function bindForestUnloadPersist(inst) {
  inst.unloadPersist = persistForestOnLeave.bind(null, inst)
  window.addEventListener('pagehide', inst.unloadPersist)
  window.addEventListener('beforeunload', inst.unloadPersist)
}
//
// Drops the unload save once this level instance is gone.
//
function unbindForestUnloadPersist(inst) {
  if (!inst.unloadPersist) return
  window.removeEventListener('pagehide', inst.unloadPersist)
  window.removeEventListener('beforeunload', inst.unloadPersist)
  inst.unloadPersist = null
}
//
// Last pose where a reload may put the hero back: on solid ground, not on the
// centipede's stick, not in the lake and not on the flower island.
//
function trackForestSafeHeroPose(inst, char, heroX, footY, grounded) {
  if (!grounded || isInWaterZone(inst, heroX, footY)) return
  if (HorizFallTwig.isHeroRidingPredator(inst.shoreFallTwigs, char)) return
  if (EyeFlower.isOnIsland(inst.eyeFlower, heroX, footY)) return
  if (inst.predator && Predator.overlapsHeroHitbox(inst.predator, heroX, footY)) return
  inst.safeHeroPose ??= { x: heroX, y: char.pos.y }
  inst.safeHeroPose.x = heroX
  inst.safeHeroPose.y = char.pos.y
}
//
// True while the hero stands inside the open pit cave (collapsed mouth).
//
function isHeroInsideForestPitCave(inst, heroX, heroY, footY = heroY + SURFACE_DETECT_Y) {
  const pit = inst.pit
  if (pit?.zone && pit.collapsed) {
    const { leftX, rightX } = getForestPitEarthBandMouthCutoutForPit(pit)
    const { innerX, innerW } = getForestPitFloorCollider(pit.zone)
    const minX = Math.min(leftX + 6, innerX + 6)
    const maxX = Math.max(rightX - 6, innerX + innerW - 6)
    if (heroX < minX || heroX > maxX) return false
    //
    // Walking on the outdoor lip left of the mouth is not “inside” — only past
    // the drop or airborne within the mouth column counts.
    //
    if (footY <= pit.floorY + PIT_CAVE_APPROACH_GROUND_FEET) return false
    const halfH = Hero.HERO_BAKE_SPRITE_SIZE * 0.5
    const topY = heroY - halfH
    return topY >= pit.floorY - PIT_CAVE_AIR_ABOVE_LIP
  }
  return isHeroInForestCaveVolume(heroX, footY)
}
//
// Keeps the in-pit-cave flag (camera follow) aligned with the hero pose,
// including mid-air jumps in the pit.
//
function syncForestPitCaveFlag(inst) {
  const char = inst.heroInst?.character
  if (!char?.pos) {
    inst._inForestPitCave = false
    return
  }
  const footY = char.pos.y + SURFACE_DETECT_Y
  inst._inForestPitCave = isHeroInsideForestPitCave(inst, char.pos.x, char.pos.y, footY)
}
//
// Crack-mouth volume before the pit inst exists (spawn persist on teardown).
//
function isHeroInForestCaveVolume(heroX, footY, floorY = FLOOR_Y, screenW = WORLD_W) {
  const zone = getCrackZone(screenW, floorY)
  if (heroX < zone.x1 + 8 || heroX > zone.x2 - 8) return false
  return footY >= floorY - 6
}
//
// Restores a saved cave pose after the pit collider is ready.
//
function applyForestCaveSpawnResume(inst, heroSpawnX, heroSpawnY, wasInCave) {
  if (!wasInCave) return
  const ch = inst.heroInst?.character
  if (!ch?.exists?.()) return
  ch.pos.x = heroSpawnX
  ch.pos.y = inst.pit?.collapsed ? getForestPitHeroStandY(inst.pit) : heroSpawnY
  snapForestCameraToHero(inst.k, inst.heroInst)
}
//
// Tree branches and other raised platforms are built later in the bootstrap,
// so a hero saved up there would fall to the ground during loading frames.
// He hangs in place without gravity until they exist.
//
function holdForestHeroForElevatedSpawn(heroInst) {
  const char = heroInst?.character
  if (!char) return
  char.gravityScale = 0
  char.vel && (char.vel.x = 0, char.vel.y = 0)
}
//
// Every platform exists now: put the hero back on the saved spot and let
// gravity settle him onto it.
//
function releaseForestHeroOnElevatedSpawn(inst, heroSpawnY) {
  const char = inst.heroInst?.character
  if (!char?.exists?.()) return
  syncShoreBranchPlatform(inst)
  char.pos.y = heroSpawnY
  char.vel && (char.vel.x = 0, char.vel.y = 0)
  char.gravityScale = 1
  snapForestCameraToHero(inst.k, inst.heroInst)
}
//
// Remembers whether the hero was on the start branch or the ground so the
// next visit can resume at the same place (menu exit or level reload).
//
function persistForestLastSpawn(inst) {
  const char = inst.heroInst?.character
  if (!char?.pos || inst.drowning || inst.deathHandled || inst.touchDeathHandled) return
  const pose = inst.safeHeroPose
  pose ? writeForestLastSpawnKeys(inst, pose.x, pose.y) : writeForestLastSpawnKeys(inst, char.pos.x, char.pos.y)
}
//
// Stores spawn pose for the next reload (menu exit, death, or scene leave).
//
function writeForestLastSpawnKeys(inst, heroX, heroY) {
  const footY = heroY + SURFACE_DETECT_Y
  set(KEY_LAST_SPAWN_X, heroX)
  set(KEY_LAST_SPAWN_Y, heroY)
  const inCave = isHeroInsideForestPitCave(inst, heroX, heroY, footY) ||
    isHeroInForestCaveVolume(heroX, footY)
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
function persistForestDeathSpawn(inst, deathX, deathY) {
  set(KEY_RESPAWN_NEAR_TREE, false)
  writeForestLastSpawnKeys(inst, deathX, deathY)
}
//
// Pins the Forest HUD nodes to screen space so they stay under the top bar
// while the world camera scrolls.
//
function pinForestHudFixed(indicator) {
  if (!indicator) return
  const pin = (obj) => obj?.exists?.() && (obj.fixed = true)
  indicator.letterObjects?.forEach(pin)
  indicator.letterOutlineObjects?.forEach(pin)
  indicator.scoreboardNodes?.forEach(pin)
}
//
// Pins the FPS counter to the top-centre of the screen.
//
function layoutForestFpsHud(inst) {
  const fps = inst.fpsCounter
  if (!fps) return
  FpsCounter.pinScreenFixed(fps)
  FpsCounter.layoutAtScreenCenterX(fps, inst.k.width() / 2)
}
//
// Creates the forest HUD row — life/eye icon only, no section label.
//
function createForestLevelIndicator(k) {
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
    heroPostBakeCanvas: applyForestHudSharpBake,
    hudPostBakeCanvas: applyForestHudSharpBake,
    hudScoreFlat: false,
    topPlatformHeight: TOP_MARGIN,
    sideWallWidth: LEFT_MARGIN,
    sectionLabelY: FOREST_HUD_LABEL_TOP_Y,
    hideScoreboard: true,
    hideLifeScore: true,
    lifeHudPlayfieldRightX: SCREEN_W - RIGHT_MARGIN
  })
  pinForestHudFixed(indicator)
  return indicator
}
//
// HTML5 loop for birds.mp3 — Kaplay k.play().stop() does not reliably restart
// the same asset after lesson-forest.0 reloads.
//
function ensureForestBirdsPlaybackRate(audio) {
  if (!audio) return
  audio.playbackRate = FOREST_BIRDS_PLAYBACK_RATE
  audio.defaultPlaybackRate = FOREST_BIRDS_PLAYBACK_RATE
  if ('preservesPitch' in audio) {
    audio.preservesPitch = true
  }
}
function createForestBirdsLoopAudio() {
  const audio = new Audio(FOREST_BIRDS_AUDIO_SRC)
  audio.loop = true
  audio.preload = 'auto'
  audio.volume = 0
  ensureForestBirdsPlaybackRate(audio)
  return audio
}
function stopForestBirdsLoopAudio(audio) {
  if (!audio) return
  audio.pause()
  audio.currentTime = 0
}
function bindForestBirdsLoopAudio(audio) {
  forestBirdsLoopHandle && stopForestBirdsLoopAudio(forestBirdsLoopHandle)
  forestBirdsLoopHandle = audio
}
function leaveForestBirdsLoopAudio() {
  stopForestBirdsLoopAudio(forestBirdsLoopHandle)
  forestBirdsLoopHandle = null
}
function setForestBirdsLoopVolume(audio, volume) {
  if (!audio) return
  ensureForestBirdsPlaybackRate(audio)
  const vol = Math.max(0, Math.min(1, volume))
  audio.volume = vol
  vol >= 0.001 && audio.paused && audio.play().catch(() => {})
}
//
// Web Audio chain for birds — volume on gain (not the element) so muffling works.
//
function ensureForestBirdsWebAudio(inst, audio) {
  if (!audio || audio._forestBirdsChain) return audio._forestBirdsChain
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
    filter.frequency.value = FOREST_BIRDS_COLOR_LOWPASS_HZ
    const gain = ctx.createGain()
    gain.gain.value = 0
    source.connect(filter)
    filter.connect(gain)
    gain.connect(ctx.destination)
    audio._forestBirdsChain = { filter, gain }
    audio.volume = 1
    return audio._forestBirdsChain
  } catch {
    return null
  }
}
//
// Snaps birds.mp3 to its full volume (reload).
//
function ensureForestBirdsBackgroundPlaying(inst) {
  syncForestWorldBirdsVolume(inst)
}
//
// Emits the same continuous background ambience the menu scene plays while
// hovering an anti-hero (Sound.startAmbient's drone + noise pad) near still-
// hidden discovery spots. Only the horizontal distance to the nearest spot's
// centre matters: within FOREST_PROXIMITY_SOUND_RADIUS px to either side the
// current grows into a steady stream the closer the hero walks to the centre
// X, and fades back to silence outside that band. Branch and right mushroom
// pads stay silent.
//
function updateForestProximitySound(inst, char) {
  if (inst.drowning || inst.sound?._forestSfxMuted || !char?.pos) {
    Sound.stopAmbient(inst.sound)
    return
  }
  const targetXs = []
  if (!inst.pit?.collapsed) {
    const cave = getCrackZone(WORLD_W, FLOOR_Y)
    appendForestProximityTarget(targetXs, (cave.x1 + cave.x2) * 0.5)
  }
  if (!targetXs.length) {
    Sound.stopAmbient(inst.sound)
    return
  }
  let nearestDistance = Infinity
  for (const targetX of targetXs) {
    nearestDistance = Math.min(nearestDistance, Math.abs(char.pos.x - targetX))
  }
  if (nearestDistance >= FOREST_PROXIMITY_SOUND_RADIUS) {
    Sound.stopAmbient(inst.sound)
    return
  }
  const proximity = 1 - nearestDistance / FOREST_PROXIMITY_SOUND_RADIUS
  !Sound.isAmbientPlaying(inst.sound) && Sound.startAmbient(inst.sound)
  Sound.setAmbientVolume(inst.sound, FOREST_PROXIMITY_SOUND_MAX_VOLUME * proximity)
}
//
// Adds a valid hidden discovery point's centre X to the proximity-sound
// target list.
//
function appendForestProximityTarget(targetXs, x) {
  x != null && targetXs.push(x)
}
//
// Full dry birds mix. Until the shared AudioContext runs, the bare element
// plays unfiltered so the start is never silent; the filtered chain takes
// over once it resumes.
//
function syncForestWorldBirdsVolume(inst) {
  const birds = inst.birdsMusic
  if (!birds) return
  const targetVol = CFG.audio.backgroundMusic.birds
  const ctx = inst.sound?.audioContext
  ctx?.state === 'suspended' && ctx.resume().catch(ignoreForestBirdsAudioError)
  const chain = ensureForestBirdsWebAudio(inst, birds)
  ensureForestBirdsPlaybackRate(birds)
  if (!chain) {
    setForestBirdsLoopVolume(birds, targetVol)
    return
  }
  chain.filter.frequency.value = FOREST_BIRDS_COLOR_LOWPASS_HZ
  chain.gain.gain.value = targetVol
  birds.volume = 1
  birds.paused && birds.play().catch(ignoreForestBirdsAudioError)
}
//
// Autoplay rejections are retried by the next frame's sync.
//
function ignoreForestBirdsAudioError() {}
//
// Hermite ease for meditation colour preview (0 at start, 1 at timer zero).
//
function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}
//
// True when world X lies in the early ground-peek band after G — the
// LEFT_MARGIN..mouth-shelf span of the surface decor (rocks, mushrooms,
// grass).
//
function isForestWorldXInGroundPeekZone(inst, worldX) {
  if (worldX == null || !inst.zones?.predatorAwake) return false
  const floorEndX = getForestCaveMouthFloorLeftX(getCrackZone(WORLD_W, FLOOR_Y))
  return worldX >= LEFT_MARGIN && worldX <= floorEndX
}
function applyZoneVisibility(inst) {
  const z = inst.zones
  const leftGroundOpen = z.groundDecorLeft
  inst.trampBundle.drawLayer.hidden = !isRightTrampolineVisible(z)
  inst.branchTrampBundle.drawLayer.hidden = !isBranchTrampolineVisible(z)
  syncPitCaveTrampolineDrawLayer(inst)
  inst.rockObjs.forEach(o => {
    if (o._lakeShoreEnd || o._lakeMerged) {
      //
      // Cap rocks (and the cluster merged into them) are painted in
      // drawLakeShoreRocksWorld so they always sit above the lake fill and
      // parallax ground band.
      //
      o.hidden = true
      o.pos.y = PLATFORM_HIDE_Y
      return
    }
    const wxRock = o._decorWorldX ?? o._homeX ?? 0
    if (isForestOpenPitMouthWorldX(inst.pit, wxRock)) {
      setDecorObjVisible(o, false)
      return
    }
    if (o._side === 'left') {
      const showLeft = o._waterCluster ? z.water : leftGroundOpen
      setDecorObjVisible(o, showLeft, inst.leftDecorFade ?? 1)
      return
    }
    const rightOp = forestRightDecorOpacity(inst, o)
    setDecorObjVisible(o, rightOp > 0.04, rightOp)
  })
  inst.mushObjs.forEach(o => {
    const wx = o._decorWorldX ?? o._homeX ?? 0
    if (isForestOpenPitMouthWorldX(inst.pit, wx)) {
      setDecorObjVisible(o, false)
      return
    }
    const inLake = z._lakeX1 != null && z._lakeX2 != null && wx >= z._lakeX1 && wx <= z._lakeX2
    if (o._side === 'left') {
      setDecorObjVisible(o, leftGroundOpen && !inLake, inst.leftDecorFade ?? 1)
      return
    }
    const rightOp = forestRightDecorOpacity(inst, o)
    setDecorObjVisible(o, rightOp > 0.04 && !inLake, rightOp)
  })
  inst.grassLayer.layer.hidden = !isForestGrassLayerVisible(inst)
  inst.waterLayer && (inst.waterLayer.hidden = !z.water)
  rebuildWoodSurfaces(inst)
  syncForestMidgeDrawColor(inst)
  syncForestPredatorVisibility(inst)
}
function isForestGrassLayerVisible(inst) {
  const z = inst.zones
  return z.groundDecorLeft || z.groundRightStripMax >= 0
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
// Stalk-eye colours — the island eye-flower's berry look, tree-root ink below.
//
function forestChainBuoyColors(k) {
  return { ...forestEyeBerryColors(k), root: forestEarTreeRootKaplayRgb(k) }
}
//
// Root tone of the eye-berry stalks (the level's tree roots).
//
function forestEarTreeRootKaplayRgb(k) {
  const c = forestRgb(FOREST_PAL.treeColor.root)
  return k.rgb(c.r, c.g, c.b)
}
//
// World-layer draw hooks for the chain-buoy and ear-tree decor — created
// once in bootstrap, colors resolved live each frame from the current mode.
//
function createForestChainBuoyLayer(k, zones) {
  return k.add([
    k.z(FOREST_CHAIN_BUOY_Z),
    {
      draw() {
        const sc = zones._sceneRef
        if (!sc?.chainBuoys) return
        const c = forestChainBuoyColors(k)
        ChainBuoy.onDraw(sc.chainBuoys, c, forestCameraViewXRange(k, sc, FOREST_DECOR_CULL_MARGIN))
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
function createForestHorizFallTwigLayer(k, inst) {
  k.add([
    k.z(HorizFallTwig.HORIZ_FALL_TWIG_DRAW_Z),
    {
      draw() {
        if (!inst.shoreFallTwigs) return
        HorizFallTwig.onDraw(
          inst.shoreFallTwigs,
          1,
          forestCameraViewXRange(k, inst, FOREST_DECOR_CULL_MARGIN)
        )
      }
    }
  ])
}
//
// Shore horizontal branch: camera shake on jump, dry twigs drop on 2nd landing.
// Landings while the stick is down or regrowing do not count.
//
function tickForestShoreBranchTwigs(inst, char, hero, grounded, justLanded) {
  if (!inst?.shoreFallTwigs) return
  const onShore = isHeroOnShoreBranch(inst, char)
  const jumpStarted = inst._shoreBranchGrounded && onShore && !grounded &&
    (hero?.jumpPhase === 'jumping' || (char?.vel?.y ?? 0) < -60)
  jumpStarted && triggerForestBranchLandingShake(inst)
  if (justLanded && grounded && onShore) {
    triggerForestBranchLandingShake(inst)
    const twigs = inst.shoreFallTwigs
    if (!twigs.dropped && !twigs.regrowing) {
      inst._shoreBranchLandingCount = (inst._shoreBranchLandingCount || 0) + 1
      inst._shoreBranchLandingCount >= FOREST_BRANCH_LANDINGS_TO_DROP &&
        HorizFallTwig.dropHorizFallTwigs(twigs)
      twigs.dropped && (inst._shoreBranchLandingCount = 0)
    }
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
function buildForestFloorBlockers(trampX, branchTrampX, buoySpots, shoreTreeLayout, earTreeSpots, treeFruitAnchorCfg) {
  const blockers = [
    { x: TREE_X, half: TRUNK_EXCLUDE_HALF },
    { x: trampX, half: TRAMP_MUSHROOM_CLEAR_HALF },
    { x: branchTrampX, half: TRAMP_MUSHROOM_CLEAR_HALF },
    ...(buoySpots ?? []).map(s => ({ x: s.x, half: FOREST_FLOOR_STALK_EYE_CLEAR_HALF })),
    ...(earTreeSpots ?? []).map(s => ({ x: s.x, half: EAR_TREE_TRUNK_GRASS_CLEAR_HALF }))
  ]
  treeFruitAnchorCfg && blockers.push(forestAnchorFruitForestFloorBlocker(treeFruitAnchorCfg))
  shoreTreeLayout && blockers.push({ x: shoreTreeLayout.x, half: FOREST_FLOOR_SHORE_TRUNK_CLEAR_HALF })
  return blockers
}
//
// Fern / plume patches and hill plants skip the anchor-apple landing strip.
//
function forestAnchorFruitForestFloorBlocker(cfg) {
  const { x1, x2 } = forestAnchorFruitGroundClearSpan(cfg)
  return { x: (x1 + x2) * 0.5, half: (x2 - x1) * 0.5 }
}
function isForestFloorSpotFree(inst, blockers, x, halfW) {
  const x1 = x - halfW
  const x2 = x + halfW
  if (x2 >= inst.lakeX1 && x1 <= inst.lakeX2) return false
  if (isCrackDecorExcluded(x1, WORLD_W) || isCrackDecorExcluded(x2, WORLD_W)) return false
  return blockers.every(b => x2 < b.x - b.half || x1 > b.x + b.half)
}
function createForestShoreTreeLayer(k, inst) {
  k.add([
    k.z(FOREST_EAR_TREE_TRUNK_OVERLAY_Z),
    {
      draw() {
        inst.shoreTree && ShoreTree.onDraw(inst.shoreTree, 1, forestCameraViewXRange(k, inst, FOREST_DECOR_CULL_MARGIN))
      }
    }
  ])
}
function createForestEarTreeLayer(k, inst) {
  k.add([
    k.z(FOREST_EAR_TREE_Z),
    {
      draw() {
        if (!inst.earTrees) return
        const c = EarTree.earTreeColors(k)
        EarTree.onDrawTrunks(inst.earTrees, c.bark, c.barkShades, c.outline, 1, forestCameraViewXRange(k, inst, FOREST_DECOR_CULL_MARGIN))
      }
    }
  ])
  k.add([
    k.z(FOREST_EAR_TREE_ROOTS_Z),
    {
      draw() {
        if (!inst.earTrees) return
        const c = EarTree.earTreeColors(k)
        EarTree.onDrawRoots(inst.earTrees, c.root, 1, forestCameraViewXRange(k, inst, FOREST_DECOR_CULL_MARGIN))
      }
    }
  ])
  k.add([
    k.z(FOREST_EAR_TREE_TRUNK_OVERLAY_Z),
    {
      draw() {
        if (!inst.earTrees) return
        const c = EarTree.earTreeColors(k)
        EarTree.onDrawTrunksAboveGrass(inst.earTrees, c.bark, c.barkShades, c.outline, 1,
          forestCameraViewXRange(k, inst, FOREST_DECOR_CULL_MARGIN))
      }
    }
  ])
  k.add([
    k.z(FOREST_EAR_TREE_BRANCHES_Z),
    {
      draw() {
        if (!inst.earTrees) return
        const c = EarTree.earTreeColors(k)
        EarTree.onDrawBranches(inst.earTrees, c.bark, c.barkShades, c.outline, c.leaves, 1,
          forestCameraViewXRange(k, inst, FOREST_DECOR_CULL_MARGIN))
      }
    }
  ])
  //
  // Above both trunk passes (under-hero and above-grass) and the branches —
  // the crown top must stay hidden behind the tomato sitting on it.
  //
  k.add([
    k.z(FOREST_SPIKY_TOMATO_Z),
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
    }, { blurRadius: forestDepthBlurRadiusPx('background'), grade: FOREST_LAYER_GRADE.far })
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
        leafDarken: 0.14,
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
    }, { blurRadius: forestDepthBlurRadiusPx('midground'), grade: FOREST_LAYER_GRADE.mid })
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
    }, { blurRadius: forestDepthBlurRadiusPx('nearground'), grade: FOREST_LAYER_GRADE.near })
  onStep && await onStep(3, 4)
  const staticColor = document.createElement('canvas')
  staticColor.width = WORLD_W
  staticColor.height = PAR_STATIC_WORLD_H
  const staticColorCtx = staticColor.getContext('2d')
  staticColorCtx.translate(0, -PAR_STATIC_WORLD_Y)
  renderCombinedGroundBand(staticColorCtx, groundEarthLayersColor(), undergroundSpec, Underground.undergroundStaticEarthTones())
  applyForestLayerGradeToCanvas(staticColor, {
    ...FOREST_LAYER_GRADE.material,
    grain: EARTH_STATIC_BAKE_GRAIN,
    grainBlockSize: EARTH_STATIC_BAKE_GRAIN_BLOCK_PX
  }, 9101)
  k.loadSprite(BG_STATIC_COLOR, staticColor)
  staticColor.width = 0
  staticColor.height = 0
  onStep && await onStep(4, 4)
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
    const c = forestSkyBandRgb((t0 + t1) * 0.5)
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
  renderForestTreePlane(ctx, {
    ...planeCfg,
    treeX1: treeLeft,
    treeX2: treeRight
  })
}
//
// Renders one bush row into a parallax canvas with horizontal bleed.
//
function bakeParallaxBushes(ctx, pad, stripCfg) {
  const { cornerBandTop, ...rest } = stripCfg
  BushStrip.renderBushStrip(ctx, {
    ...rest,
    x1: LEFT_MARGIN - pad,
    x2: WORLD_W - RIGHT_MARGIN + pad,
    baseY: FLOOR_Y,
    eastX: (LEFT_MARGIN + WORLD_W - RIGHT_MARGIN) * 0.5,
    colorAt: cornerBandTop != null ? x => parallaxCornerLeafRgb(x, cornerBandTop) : null
  })
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
// Paints the root-zone part of a combined background canvas: the layered
// earth band (three strata, groundEarthLayersColor) inside the
// playfield margins, topped with the underground decor.
//
function renderCombinedGroundBand(ctx, layers, undergroundSpec, ugEntry) {
  paintLayeredEarthBand(ctx, layers, LEFT_MARGIN, FLOOR_Y, GAME_W, CAVE_BAND_H)
  paintTopsoilOrganicTexture(ctx, layers, LEFT_MARGIN, FLOOR_Y, GAME_W, CAVE_BAND_H)
  //
  // Flat seal along FLOOR_Y so the topsoil always meets the walkable ground
  // line with no sub-pixel gaps from the wavy interior seams below.
  //
  const topRgb = layers[0]?.rgb
  topRgb && paintFlatEarthGroundSeal(ctx, topRgb, LEFT_MARGIN, FLOOR_Y, GAME_W)
  Underground.renderUndergroundSpec(ctx, undergroundSpec, ugEntry)
  paintUndergroundDepthVignette(ctx, LEFT_MARGIN, FLOOR_Y, GAME_W, CAVE_BAND_H)
  topRgb && paintFlatEarthGroundSeal(ctx, topRgb, LEFT_MARGIN, FLOOR_Y, GAME_W)
}
//
// Flat strip flush with the walkable ground line (covers sub-pixel gaps).
//
function paintFlatEarthGroundSeal(ctx, rgb, x0, y0, width) {
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.fillRect(x0, y0, width, 4)
}
//
// Soft elliptical flecks in the upper topsoil — reads like the reference
// cross-section instead of square grit or coarse grain blocks.
//
function paintTopsoilOrganicTexture(ctx, layers, x0, y0, width, height) {
  const base = layers[0]?.rgb
  if (!base) return
  const y1 = y0 + 5
  const y2 = y0 + height * GROUND_LAYER_FRACS[0] - 3
  if (y2 <= y1) return
  const darkRgb = forestRgb('groundLoam')
  const lightRgb = forestRgb('groundClay')
  for (let i = 0; i < TOPSOIL_ORGANIC_SPECK_COUNT; i++) {
    const seed = TOPSOIL_ORGANIC_SEED + i * 17.31
    const u = SoilSeam.seamHash01(seed)
    const v = SoilSeam.seamHash01(seed * 1.73)
    const x = x0 + u * width
    const y = y1 + v * (y2 - y1)
    const tone = SoilSeam.seamHash01(seed * 2.41)
    const rgb = tone < 0.52
      ? lerpForestRgb(base, darkRgb, 0.1 + tone * 0.55)
      : lerpForestRgb(base, lightRgb, (tone - 0.52) * 1.05)
    const rx = 0.75 + SoilSeam.seamHash01(seed * 3.17) * 2.4
    const ry = rx * (0.62 + SoilSeam.seamHash01(seed * 4.91) * 0.5)
    ctx.globalAlpha = TOPSOIL_ORGANIC_ALPHA * (0.3 + SoilSeam.seamHash01(seed * 5.83) * 0.7)
    ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
    ctx.beginPath()
    ctx.ellipse(x, y, rx, ry, SoilSeam.seamHash01(seed * 6.07) * Math.PI, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.globalAlpha = 1
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
// Dominant leaf swatch for a quadrant (bushes and flat colour strips).
//
function parallaxCornerLeafRgb(treeX, bandTop) {
  const corner = FOREST_PAL[parallaxForestCornerKey(treeX, bandTop)]
  return forestRgb(corner.leaf)
}
//
// Renders one parallax plane into its combined canvas: each tree uses the
// same forest-tree generator as the main tree (default trunk taper, fractal
// branches, crown clusters). Only trunk height and a light width scale differ
// per row so the forest sits lower without a flat canopy fill band.
//
function renderForestTreePlane(ctx, planeCfg) {
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
  const treeDensityOpts = forestTreeBuildOptsForDensity(foliageDensityTier)
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
    const treeData = buildForestTree(
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
    scaleForestTreeWidths(treeData, widthScale)
    treeX >= (LEFT_MARGIN + WORLD_W - RIGHT_MARGIN) * 0.5 && thinForestTreeCanopy(treeData, treeSeed)
    trunkWidthScale < 1 && scaleForestTreeTrunkWidths(treeData, trunkWidthScale)
    const colorPalDraw = applyFoliageDensityToPalette(colorPal, foliageDensityTier)
    renderForestTreeIntoContext(ctx, treeData, colorPalDraw, WORLD_W, WORLD_H)
  })
}
//
// Opens irregular holes inside an east-half canopy so branches and the haze
// behind show through. Leaves near the crown's outer edge always stay, so the
// silhouette is kept; inside it a smooth 2D noise picks whole patches to drop
// (clusters and their small detail leaves together), never a uniform sieve.
//
function thinForestTreeCanopy(treeData, seed) {
  const leaves = treeData.leaves
  if (!leaves?.length) return
  const xs = leaves.map(l => l.x)
  const ys = leaves.map(l => l.y)
  const minX = Math.min(...xs)
  const maxX = Math.max(...xs)
  const minY = Math.min(...ys)
  const maxY = Math.max(...ys)
  const cx = (minX + maxX) * 0.5
  const cy = (minY + maxY) * 0.5
  const halfW = Math.max(1, (maxX - minX) * 0.5)
  const halfH = Math.max(1, (maxY - minY) * 0.5)
  treeData.leaves = leaves.filter(leaf => {
    const d = Math.hypot((leaf.x - cx) / halfW, (leaf.y - cy) / halfH)
    if (d > CANOPY_THIN_RIM) return true
    const n = canopyThinNoise01(leaf.x / CANOPY_THIN_CELL_PX, leaf.y / CANOPY_THIN_CELL_PX, seed)
    return n >= (leaf.type === 'detail' ? CANOPY_THIN_DETAIL_HOLE : CANOPY_THIN_CLUSTER_HOLE)
  })
}
function canopyThinNoise01(u, v, seed) {
  const iu = Math.floor(u)
  const iv = Math.floor(v)
  const fu = smoothstep01(u - iu)
  const fv = smoothstep01(v - iv)
  const corner = (a, b) => SoilSeam.seamHash01(a * 57.31 + b * 113.17 + seed * 0.013)
  const top = corner(iu, iv) + (corner(iu + 1, iv) - corner(iu, iv)) * fu
  const bottom = corner(iu, iv + 1) + (corner(iu + 1, iv + 1) - corner(iu, iv + 1)) * fu
  return top + (bottom - top) * fv
}
//
// Scales trunk and branch widths of a forest tree (geometry stays the same).
//
function scaleForestTreeWidths(treeData, scale) {
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
// Narrows only the main trunk wood — hero branch width stays in forest-tree.js.
//
function scaleForestTreeTrunkWidths(treeData, scale) {
  treeData.trunkSegs.forEach(seg => {
    seg.w *= scale
    seg.w2 *= scale
  })
}
//
// Earth / bark / stone bakes — stronger film grain where texture is expected.
//
function applyForestMaterialBake(canvas, seedOffset = 0, densityTier = 'gameplay') {
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier(densityTier)
  }, seedOffset)
}
//
// Underground decor spec that dresses up the root-zone earth band: buried
// rocks, cracks, pebble clusters, hanging rootlets and a fossil spiral. It is
// generated once per live Kaplay instance and baked into the combined static
// earth band, so a prewarmed engine never regenerates it.
//
const undergroundSpecByK = new WeakMap()
//
// Level layout for the buried decor: the playfield band, the main tree, and
// no hair-roots west of the tree (the lake) or over the cave mouth / pit
// back wall, where they read as stray sticks on the void edge.
//
function forestUndergroundLayout() {
  const cave = getCrackZone(WORLD_W, FLOOR_Y)
  return {
    x1: LEFT_MARGIN,
    x2: WORLD_W - RIGHT_MARGIN,
    surfaceY: FLOOR_Y,
    bandH: CAVE_BAND_H,
    bottomY: PLAYFIELD_EARTH_BOTTOM_Y,
    treeX: TREE_X,
    treeClearHalf: TRUNK_EXCLUDE_HALF,
    skipRootlet: rx => rx >= cave.x1 - FOREST_UG_CAVE_ROOTLET_CLEAR_L && rx <= cave.x2 + FOREST_UG_CAVE_ROOTLET_CLEAR_R
  }
}
function forestUndergroundSpec(k) {
  const cached = undergroundSpecByK.get(k)
  if (cached) return cached
  const spec = Underground.buildUndergroundSpec(forestUndergroundLayout())
  undergroundSpecByK.set(k, spec)
  return spec
}
//
// Chain-buoy decor spots — spread across the level, skipping the band around
// the big tree (which gets the ear-trees instead, see buildForestEarTreeSpots).
//
const FOREST_CHAIN_BUOY_COUNT_MIN = 5
const FOREST_CHAIN_BUOY_COUNT_MAX = 7
const FOREST_CHAIN_BUOY_TREE_CLEAR_HALF = 260
const FOREST_CHAIN_BUOY_MIN_GAP = 150
const FOREST_CHAIN_BUOY_PLACE_ATTEMPTS = 80
//
// No stalk-eye within this distance of an ear-tree trunk, on either side.
//
const FOREST_CHAIN_BUOY_EAR_TREE_FAR_CLEAR = 118
const FOREST_CHAIN_BUOY_EAST_MIN = 4
//
// All buoys stand on the east ground, this far past its start — the same gap
// the ear-trees keep.
//
const FOREST_CHAIN_BUOY_EAST_GAP = 56
const FOREST_CHAIN_BUOY_PLATFORM_X_MARGIN = 36
const FOREST_CHAIN_BUOY_PLATFORM_SIDE_MIN = 88
const FOREST_CHAIN_BUOY_PLATFORM_SIDE_JITTER = 56
const FOREST_EAR_TREE_RIGHT_COUNT = 2
const FOREST_EAR_TREE_EAST_GAP = 56
const FOREST_EAR_TREE_RIGHT_CAVE_MARGIN = 0
const FOREST_EAR_TREE_MIN_GAP = 240
const FOREST_EAR_TREE_SCAN_STEP = 4
//
// Lip-trees must not sit on the shore accent trunk, through a mushroom
// trampoline cap, or on a fixed stalk-eye (bounce chain, prize eye). The
// mushroom is short, so the tree's branches pass above it — only the trunk
// needs to clear the cap.
//
const FOREST_SHORE_TREE_EAR_TREE_CLEAR_HALF = 210
const FOREST_EAR_TREE_MUSHROOM_TRAMP_CLEAR_HALF = 100
const FOREST_EAR_TREE_STALK_EYE_CLEAR_HALF = 110
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
const FOREST_PLANT_WHISPER_MAX_VOLUME = 0.42
//
// Minimum change in proximity (0..1) per frame to count as moving toward or
// away from the eye-flower — ignores sub-pixel jitter.
//
const FOREST_PLANT_WHISPER_PROX_DELTA = 0.002
const FOREST_EARLY_LAND_FOOT_ABOVE = 26
//
// Clearance kept around the cave crack zone for both decor kinds — neither
// should ever spawn over the cave entrance.
//
const FOREST_CAVE_DECOR_CLEAR = 140
function buildForestChainBuoyWoodBands(cfg) {
  const { horizBranch } = cfg
  return horizBranch ? [{ x1: horizBranch.x1, x2: horizBranch.x2 }] : []
}
function forestChainBuoyXUnderWoodPlatform(x, woodBands) {
  const margin = FOREST_CHAIN_BUOY_PLATFORM_X_MARGIN
  return (woodBands ?? []).some(b => x >= b.x1 - margin && x <= b.x2 + margin)
}
function buildForestChainBuoySpot(x, opts = null) {
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
function tryAddForestChainBuoySpot(spots, x, lakeX1, lakeX2, eastX1, cave, woodBands, earTreeSpots, trampX, branchTrampX) {
  if (Math.abs(x - TREE_X) < FOREST_CHAIN_BUOY_TREE_CLEAR_HALF) return false
  if (forestChainBuoyXUnderWoodPlatform(x, woodBands)) return false
  if (x > forestPrizeEyeX(trampX) - FOREST_CHAIN_BUOY_MIN_GAP) return false
  if ((earTreeSpots ?? []).some(s => forestChainBuoyXBlockedNearEarTree(x, s.x))) return false
  //
  // Never right on top of a mushroom trampoline — the random search just
  // lands the buoy somewhere else nearby instead (left or right of it).
  //
  if (trampX != null && Math.abs(x - trampX) < TRAMP_ROCK_CLEAR_HALF) return false
  if (branchTrampX != null && Math.abs(x - branchTrampX) < TRAMP_ROCK_CLEAR_HALF) return false
  //
  // Every buoy stands on the east ground, never in or near the water — a
  // hard rule, not just one exclusion among several, since a whole-world
  // random search let a spot land inside the lake whenever the passed
  // lakeX1/lakeX2 didn't quite track the water's actual current extent.
  //
  if (x < eastX1 + FOREST_CHAIN_BUOY_EAST_GAP) return false
  if (x >= lakeX1 && x <= lakeX2) return false
  if (x >= cave.x1 - FOREST_CAVE_DECOR_CLEAR && x <= cave.x2 + FOREST_CAVE_DECOR_CLEAR) return false
  if (spots.some(s => Math.abs(s.x - x) < FOREST_CHAIN_BUOY_MIN_GAP)) return false
  spots.push(buildForestChainBuoySpot(x))
  return true
}
function buildForestChainBuoySpots(lakeX1, lakeX2, woodBands, earTreeSpots, trampX, branchTrampX) {
  const spots = []
  const eastX1 = forestEastGroundStartX()
  const cave = getCrackZone(WORLD_W, FLOOR_Y)
  const target = FOREST_CHAIN_BUOY_COUNT_MIN +
    Math.floor(Math.random() * (FOREST_CHAIN_BUOY_COUNT_MAX - FOREST_CHAIN_BUOY_COUNT_MIN + 1))
  const sideXs = []
  for (const band of woodBands ?? []) {
    const jitter = () => Math.random() * FOREST_CHAIN_BUOY_PLATFORM_SIDE_JITTER
    sideXs.push(band.x1 - FOREST_CHAIN_BUOY_PLATFORM_SIDE_MIN - jitter())
    sideXs.push(band.x2 + FOREST_CHAIN_BUOY_PLATFORM_SIDE_MIN + jitter())
  }
  for (let i = sideXs.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = sideXs[i]
    sideXs[i] = sideXs[j]
    sideXs[j] = tmp
  }
  for (const x of sideXs) {
    if (spots.length >= target) break
    tryAddForestChainBuoySpot(spots, x, lakeX1, lakeX2, eastX1, cave, woodBands, earTreeSpots, trampX, branchTrampX)
  }
  //
  // Random fill only searches the east ground through to the cave — matches
  // the rule above and, being a much smaller span than the whole world,
  // reliably hits the 5-7 target instead of frequently running out of
  // attempts against every exclusion combined.
  //
  const fillX1 = eastX1 + FOREST_CHAIN_BUOY_EAST_GAP
  const fillX2 = cave.x1 - FOREST_CAVE_DECOR_CLEAR
  let attempts = 0
  while (spots.length < target && attempts < FOREST_CHAIN_BUOY_PLACE_ATTEMPTS && fillX2 > fillX1) {
    attempts += 1
    const x = fillX1 + Math.random() * (fillX2 - fillX1)
    tryAddForestChainBuoySpot(spots, x, lakeX1, lakeX2, eastX1, cave, woodBands, earTreeSpots, trampX, branchTrampX)
  }
  addForestPrizeEyeSpot(spots, trampX)
  addForestChainTrampEyes(spots, trampX)
  ensureForestChainBuoysOnEastGround(
    spots,
    fillX1,
    fillX2,
    lakeX1,
    lakeX2,
    eastX1,
    cave,
    woodBands,
    earTreeSpots,
    trampX,
    branchTrampX
  )
  pruneForestChainBuoysWestOfTrampPair(spots, trampX)
  pruneForestChainBuoysOverlappingShoreTree(spots)
  spots.sort((a, b) => a.x - b.x)
  return spots
}
//
// First (higher, west) and second (lower) stalk-eyes of the bounce chain.
//
function forestChainTrampLayout(trampX) {
  const secondX = trampX - FOREST_CHAIN_TRAMP_MUSH_STEP_X - FOREST_CHAIN_TRAMP_PAIR_SHIFT_LEFT
  const firstX = secondX - FOREST_CHAIN_TRAMP_EYE_STEP_X
  return { firstX, secondX }
}
function addForestChainTrampEyes(spots, trampX) {
  if (trampX == null) return
  const layout = forestChainTrampLayout(trampX)
  for (let i = spots.length - 1; i >= 0; i--) {
    const sx = spots[i].x
    if (spots[i].prizeEye) continue
    if (Math.abs(sx - layout.secondX) < FOREST_CHAIN_BUOY_MIN_GAP ||
      Math.abs(sx - layout.firstX) < FOREST_CHAIN_BUOY_MIN_GAP) {
      spots.splice(i, 1)
    }
  }
  const push = (x, role, segmentCount, seed) => {
    spots.push(buildForestChainBuoySpot(x, {
      chainTrampRole: role,
      segmentCount,
      segmentLen: FOREST_CHAIN_TRAMP_SEGMENT_LEN,
      segmentWidth: 4.1,
      swayAmp: FOREST_CHAIN_TRAMP_SWAY_AMP,
      swaySpeed: FOREST_CHAIN_TRAMP_SWAY_SPEED,
      swayLag: FOREST_CHAIN_TRAMP_SWAY_LAG,
      seed
    }))
  }
  push(layout.secondX, ChainEyeTramp.CHAIN_EYE_ROLE_SECOND, FOREST_CHAIN_TRAMP_SECOND_SEGMENTS, 2.17)
  push(layout.firstX, ChainEyeTramp.CHAIN_EYE_ROLE_FIRST, FOREST_CHAIN_TRAMP_FIRST_SEGMENTS, 4.83)
}
//
// Nothing else grows west of the first tramp eye — that span is the shore tree.
//
function pruneForestChainBuoysWestOfTrampPair(spots, trampX) {
  if (trampX == null || !spots?.length) return
  const westBound = forestChainTrampLayout(trampX).firstX - FOREST_CHAIN_TRAMP_WEST_MARGIN
  for (let i = spots.length - 1; i >= 0; i--) {
    if (spots[i].chainTrampRole || spots[i].prizeEye) continue
    spots[i].x < westBound && spots.splice(i, 1)
  }
}
//
// Keeps stalk-eyes off the shore tree trunk (left of the first tramp eye).
//
function pruneForestChainBuoysOverlappingShoreTree(spots) {
  const layout = ShoreTree.buildForestShoreTreeLayout(spots, FLOOR_Y)
  if (!layout) return
  for (let i = spots.length - 1; i >= 0; i--) {
    if (spots[i].prizeEye || spots[i].chainTrampRole) continue
    Math.abs(spots[i].x - layout.x) < FOREST_SHORE_TREE_BUOY_CLEAR_X && spots.splice(i, 1)
  }
}
//
// Stalk-eyes and ear-trees never share a spot — the tree's branches spread
// over a nearby stalk and read as one tangled prop.
//
function forestChainBuoyXBlockedNearEarTree(x, treeX) {
  return Math.abs(x - treeX) < FOREST_CHAIN_BUOY_EAR_TREE_FAR_CLEAR
}
//
// Guarantees at least four buoys on the east ground — random fill often misses
// targets once platform/trampoline exclusions eat the span.
//
function ensureForestChainBuoysOnEastGround(
  spots,
  fillX1,
  fillX2,
  lakeX1,
  lakeX2,
  eastX1,
  cave,
  woodBands,
  earTreeSpots,
  trampX,
  branchTrampX
) {
  const span = fillX2 - fillX1
  if (span <= FOREST_CHAIN_BUOY_MIN_GAP) return
  let eastCount = spots.filter(s => s.x >= fillX1).length
  if (eastCount >= FOREST_CHAIN_BUOY_EAST_MIN) return
  const slots = [0.14, 0.36, 0.58, 0.82]
  for (const slot of slots) {
    if (eastCount >= FOREST_CHAIN_BUOY_EAST_MIN) break
    let x = fillX1 + span * slot
    for (let attempt = 0; attempt < 6; attempt++) {
      if (tryAddForestChainBuoySpot(
        spots,
        x,
        lakeX1,
        lakeX2,
        eastX1,
        cave,
        woodBands,
        earTreeSpots,
        trampX,
        branchTrampX
      )) {
        eastCount += 1
        break
      }
      x += (Math.random() - 0.5) * FOREST_CHAIN_BUOY_MIN_GAP * 0.45
    }
  }
}
//
// The tall prize stalk-eye just east of the right mushroom — only a mushroom
// bounce reaches its cap, and it stays the rightmost stalk-eye in the level
// (every random buoy east of it is dropped).
//
function forestPrizeEyeX(trampX) {
  return trampX + FOREST_PRIZE_EYE_OFFSET_X
}
function addForestPrizeEyeSpot(spots, trampX) {
  const prizeX = forestPrizeEyeX(trampX)
  for (let i = spots.length - 1; i >= 0; i--) {
    spots[i].x > prizeX - FOREST_CHAIN_BUOY_MIN_GAP && spots.splice(i, 1)
  }
  spots.push(buildForestChainBuoySpot(prizeX, {
    prizeEye: true,
    segmentCount: FOREST_PRIZE_EYE_SEGMENTS,
    segmentLen: FOREST_PRIZE_EYE_SEGMENT_LEN,
    segmentWidth: FOREST_PRIZE_EYE_SEGMENT_WIDTH,
    swayAmp: FOREST_PRIZE_EYE_SWAY_AMP,
    swaySpeed: FOREST_PRIZE_EYE_SWAY_SPEED,
    swayLag: FOREST_PRIZE_EYE_SWAY_LAG,
    seed: FOREST_PRIZE_EYE_SEED,
    eyeRadius: FOREST_PRIZE_EYE_SCLERA_RADIUS,
    pupilRadius: FOREST_PRIZE_EYE_PUPIL_RADIUS
  }))
}
//
// Ear-tree decor spots — two trees clustered on the east ground.
//
function forestShoreTreeTrunkXFromTramp(trampX) {
  if (trampX == null) return null
  const layout = forestChainTrampLayout(trampX)
  const shoreLayout = ShoreTree.buildForestShoreTreeLayout([
    buildForestChainBuoySpot(layout.firstX, {
      chainTrampRole: ChainEyeTramp.CHAIN_EYE_ROLE_FIRST,
      segmentCount: FOREST_CHAIN_TRAMP_FIRST_SEGMENTS,
      segmentLen: FOREST_CHAIN_TRAMP_SEGMENT_LEN
    })
  ], FLOOR_Y)
  return shoreLayout?.x ?? null
}
function forestEarTreeSpotXAllowed(spots, x, branchTrampX, trampX, shoreTrunkX) {
  if (Math.abs(x - branchTrampX) < FOREST_EAR_TREE_MUSHROOM_TRAMP_CLEAR_HALF) return false
  if (trampX != null && Math.abs(x - trampX) < FOREST_EAR_TREE_MUSHROOM_TRAMP_CLEAR_HALF) return false
  if (forestEarTreeXOnFixedStalkEye(x, trampX)) return false
  if (shoreTrunkX != null && Math.abs(x - shoreTrunkX) < FOREST_SHORE_TREE_EAR_TREE_CLEAR_HALF) return false
  return !spots.some(s => Math.abs(s.x - x) < FOREST_EAR_TREE_MIN_GAP)
}
//
// The bounce-chain eyes and the prize eye are placed after the ear-trees
// without checking them, so the trees have to keep off those fixed spots.
//
function forestEarTreeXOnFixedStalkEye(x, trampX) {
  if (trampX == null) return false
  const layout = forestChainTrampLayout(trampX)
  const eyeXs = [layout.firstX, layout.secondX, forestPrizeEyeX(trampX)]
  return eyeXs.some(eyeX => Math.abs(x - eyeX) < FOREST_EAR_TREE_STALK_EYE_CLEAR_HALF)
}
function tryAddForestEarTreeSpot(spots, x, branchTrampX, trampX, shoreTrunkX, heightTier) {
  if (!forestEarTreeSpotXAllowed(spots, x, branchTrampX, trampX, shoreTrunkX)) return false
  spots.push(EarTree.buildSpot(x, FLOOR_Y, heightTier))
  return true
}
function buildForestEarTreeSpots(layoutCfg) {
  const branchTrampX = layoutCfg?.branchTrampX ??
    TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X
  const trampX = layoutCfg?.trampX ?? null
  const shoreTrunkX = forestShoreTreeTrunkXFromTramp(trampX)
  const cave = getCrackZone(WORLD_W, FLOOR_Y)
  //
  // The branch (left) mushroom trampoline sits at TREE_X + a modest offset —
  // well inside the right-side placement range below — and its own footprint
  // was never excluded, so a spot could land right on top of it: the
  // mushroom's cap/stem then visually covers the tree's thin trunk column
  // while its wider branches remain visible above, reading as "no trunk".
  //
  const rightXMin = forestEastGroundStartX() + FOREST_EAR_TREE_EAST_GAP
  const rightXMax = cave.x1 - FOREST_CAVE_DECOR_CLEAR - FOREST_EAR_TREE_RIGHT_CAVE_MARGIN
  const rightHeightTiers = ['short', 'tall']
  const minSpan = FOREST_EAR_TREE_MIN_GAP * (FOREST_EAR_TREE_RIGHT_COUNT - 1) + 48
  const spots = []
  let attempts = 0
  while (spots.length < FOREST_EAR_TREE_RIGHT_COUNT && attempts < 80) {
    attempts += 1
    if (rightXMax <= rightXMin + minSpan) break
    const x = rightXMin + Math.random() * (rightXMax - rightXMin)
    tryAddForestEarTreeSpot(spots, x, branchTrampX, trampX, shoreTrunkX, rightHeightTiers[spots.length])
  }
  //
  // The free windows between the shore tree, stalk-eyes and the mushroom are
  // only a few dozen px wide — random picks often miss them, so scan for
  // every allowed X and fill the remaining trees from those.
  //
  while (spots.length < FOREST_EAR_TREE_COUNT) {
    const free = []
    for (let x = rightXMin; x <= rightXMax; x += FOREST_EAR_TREE_SCAN_STEP) {
      forestEarTreeSpotXAllowed(spots, x, branchTrampX, trampX, shoreTrunkX) && free.push(x)
    }
    if (!free.length) break
    const x = free[Math.floor(Math.random() * free.length)]
    tryAddForestEarTreeSpot(spots, x, branchTrampX, trampX, shoreTrunkX, rightHeightTiers[spots.length % rightHeightTiers.length])
  }
  spots.sort((a, b) => a.x - b.x)
  return spots
}
//
// Whisper volume from hero distance to the eye-flower root (2D, so the tree
// branch above the lake counts as well).
//
function resetForestPlantWhisperProximityState(inst) {
  if (!inst.plantWhisperProximityState) return
  inst.plantWhisperProximityState.last = 0
  inst.plantWhisperProximityState.wasReceding = false
}
function fadeOutForestPlantWhisper(inst) {
  Sound.setEarTreeWhisperVolume(0)
  EyeFlower.setWhisper(inst.eyeFlower, 0)
  resetForestPlantWhisperProximityState(inst)
}
function updateForestPlantWhisperSound(inst, char) {
  if (!char?.pos || inst.drowning) {
    fadeOutForestPlantWhisper(inst)
    return
  }
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (isHeroInsideForestPitCave(inst, char.pos.x, char.pos.y, footY)) {
    fadeOutForestPlantWhisper(inst)
    return
  }
  const proximity = EyeFlower.whisperProximity(inst.eyeFlower, char.pos.x, char.pos.y)
  const whisperMax = CFG.audio.backgroundMusic.whisper ?? FOREST_PLANT_WHISPER_MAX_VOLUME
  const vol = whisperMax * proximity
  if (vol <= 0.001) {
    fadeOutForestPlantWhisper(inst)
    return
  }
  inst.sound && Sound.resumeAudioContext(inst.sound)
  inst.plantWhisperProximityState ??= { last: proximity, wasReceding: false }
  const proxState = inst.plantWhisperProximityState
  const approaching = proximity > proxState.last + FOREST_PLANT_WHISPER_PROX_DELTA
  const receding = proximity < proxState.last - FOREST_PLANT_WHISPER_PROX_DELTA
  receding && (proxState.wasReceding = true)
  if (approaching && proxState.wasReceding) {
    Sound.rewindEarTreeWhisperToStart()
    proxState.wasReceding = false
  }
  proxState.last = proximity
  Sound.setEarTreeWhisperVolume(Math.min(1, vol))
  EyeFlower.setWhisper(inst.eyeFlower, proximity)
}
//
// Plays ground/wood land SFX a few pixels before isGrounded flips — Kaplay
// collision often lags the visible foot plant by a frame.
//
function maybePlayForestEarlyLandSfx(inst, char, hero, footY, grounded) {
  if (inst.sound?._forestSfxMuted) return
  if (grounded) {
    inst._forestEarlyLandSfxDone = false
    return
  }
  if (inst._forestEarlyLandSfxDone) return
  const vy = char.vel?.y ?? 0
  if (vy < 52 || !hero.wasJumping || (hero.landFxCooldown ?? 0) > 0) return
  const onBranch = isHeroOnStartBranch(inst, char)
  const overWood = isOverForestWoodSurface(inst, char.pos.x, footY)
  if (onBranch && overWood) {
    inst._forestEarlyLandSfxDone = true
    hero.landFxCooldown = 0.2
    inst.sound._forestSurface = 'wood'
    Sound.playLandSound(inst.sound, 'lesson-forest.0')
    inst.expectBranchWoodLandSound = false
    return
  }
  const nearGround = footY >= FLOOR_Y - FOREST_EARLY_LAND_FOOT_ABOVE && footY <= FLOOR_Y + 8
  if (!onBranch && nearGround && !isInWaterZone(inst, char.pos.x, footY)) {
    inst._forestEarlyLandSfxDone = true
    hero.landFxCooldown = 0.2
    Sound.playStepSound(inst.sound, 'lesson-forest.0')
  }
}
//
// X where the east ground starts (past the branch trampoline's grass
// clearing) — a pure function of TREE_X and fixed offsets, so it can be
// computed this early in the bootstrap.
//
function forestEastGroundStartX() {
  const branchTrampX = TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X
  return branchTrampX + TRAMP_GRASS_CLEAR_HALF + EAST_GROUND_TRAMP_GAP
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
  const floorEndX = getForestCaveMouthFloorLeftX(crack)
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
  forestPlayfieldCornerObjs = corners
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
  if (!forestPlayfieldCornerObjs?.length || forestPlayfieldCornerObjs.length < 4) return
  const { topY, bottomY, leftX, rightX } = playfieldCornerPositions()
  forestPlayfieldCornerObjs[0].pos.x = leftX
  forestPlayfieldCornerObjs[0].pos.y = topY
  forestPlayfieldCornerObjs[1].pos.x = rightX
  forestPlayfieldCornerObjs[1].pos.y = topY
  forestPlayfieldCornerObjs[2].pos.x = leftX
  forestPlayfieldCornerObjs[2].pos.y = bottomY
  forestPlayfieldCornerObjs[3].pos.x = rightX
  forestPlayfieldCornerObjs[3].pos.y = bottomY
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
  const rgb = forestRgb(colorHex)
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
    sound._forestSurface = 'ground'
  })
}
//
// Marks wood surface on hero contact so landing/step sounds fire in the same frame.
//
function tagWoodPlatform(platform, sound, heroInst) {
  platform.onCollide('player', () => {
    sound._l2Surface = 'wood'
    sound._forestSurface = 'wood'
  })
}
//
// Swaying grass — the shared Grass component, excluding water, trunk, the
// trampoline mushroom band, the anchor-apple landing strip, and every
// ear-tree's trunk footprint (so no blade ever covers its face). The tint
// callback also hides blades of unexplored ground sides.
//
function createForestGrass(k, waterX1, waterX2, trampX, branchTrampX, zones, earTreeSpots, treeFruitAnchorCfg) {
  const trunkL = TREE_X - TRUNK_EXCLUDE_HALF
  const trunkR = TREE_X + TRUNK_EXCLUDE_HALF
  const trampL = trampX - TRAMP_GRASS_CLEAR_HALF
  const trampR = trampX + TRAMP_GRASS_CLEAR_HALF
  const branchL = branchTrampX - TRAMP_GRASS_CLEAR_HALF
  const branchR = branchTrampX + TRAMP_GRASS_CLEAR_HALF
  const earTreeExcluded = (x) => (earTreeSpots ?? []).some(spot =>
    x >= spot.x - EAR_TREE_TRUNK_GRASS_CLEAR_HALF && x <= spot.x + EAR_TREE_TRUNK_GRASS_CLEAR_HALF)
  const excluded = (x) => (x >= waterX1 && x <= waterX2) ||
    (x >= trunkL && x <= trunkR) ||
    (x >= trampL && x <= trampR) ||
    (x >= branchL && x <= branchR) ||
    earTreeExcluded(x) ||
    (treeFruitAnchorCfg && isForestAnchorFruitGroundX(x, treeFruitAnchorCfg)) ||
    isCrackGrassExcluded(x, WORLD_W)
  const grass = Grass.create({
    k,
    floorY: FLOOR_Y,
    left: LEFT_MARGIN + 20,
    right: WORLD_W - RIGHT_MARGIN - 20,
    tuftCount: GRASS_TUFT_COUNT,
    z: GRASS_Z,
    excluded,
    postBakeCanvas: applyForestGameplaySharpBake,
    getTint: (blade) => forestGrassTint(zones, blade),
    roots: true,
    getRootColor: forestGrassRootColor,
    getRootVisible: (worldX) => forestGrassRootVisible(zones, worldX),
    hueVaryMax: FOREST_GRASS_HUE_VARY_MAX,
    hueVarySkew: FOREST_GRASS_HUE_VARY_SKEW
  })
  grass.layer.hidden = true
  return grass
}
//
// Grass tint for the ground-peek band (through the cave mouth) — warm straw.
//
function forestGroundPeekGrassTint(sc, blade) {
  if (!isForestWorldXInGroundPeekZone(sc, blade.x)) return null
  return GRASS_WARM
}
//
// Short static root ticks under ground grass tufts — dark loam tone.
//
function forestGrassRootColor() {
  return GRASS_ROOT_RGB
}
//
// Grass roots stay visible for every explored ground strip — unlike blades,
// they must not fade with forestRightWorldOpacity while the hero walks in.
//
function forestGrassRootVisible(zones, worldX) {
  const sc = zones._sceneRef
  if (!sc) return false
  const lakeX1 = zones._lakeX1
  const lakeX2 = zones._lakeX2
  if (lakeX1 != null && lakeX2 != null && worldX >= lakeX1 && worldX <= lakeX2) return false
  if (isForestOpenPitMouthWorldX(sc.pit, worldX)) return false
  if (isForestWorldXInGroundPeekZone(sc, worldX)) return true
  const side = worldX >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
  if (side === 'left') return zones.groundDecorLeft
  return (zones.groundRightStripMax ?? -1) >= 0
}
//
// Resolves the tint of one grass blade for the current frame: null while the
// blade's ground side is unexplored or off camera, otherwise grass green.
//
function forestGrassTint(zones, blade) {
  const sc = zones._sceneRef
  if (!sc) return null
  const lakeX1 = zones._lakeX1
  const lakeX2 = zones._lakeX2
  if (lakeX1 != null && lakeX2 != null && blade.x >= lakeX1 && blade.x <= lakeX2) {
    return null
  }
  if (isForestOpenPitMouthWorldX(sc.pit, blade.x)) return null
  const peekTint = forestGroundPeekGrassTint(sc, blade)
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
  const op = forestRightWorldOpacity(sc, blade.x, strip >= 3 ? 'small' : 'large')
  if (op < 0.04) return null
  return op >= 1 ? GRASS_GREEN : { ...GRASS_GREEN, opacity: op }
}
//
// Rocks — flat value 5 silhouettes.
//
function createForestRocks(k, treeBaseLeftX, waterRightX, rightPlatX, trampX, branchTrampX, zones, decorAtlas, eastGroundRockMinX) {
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
  // mushroom (resampled out of its zone). Scatter rocks stay left of the
  // cave mouth (no stone above the entrance).
  //
  const rightEdge = getCrackZone(WORLD_W, FLOOR_Y).x1 - 40
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
    objs.push(rock)
  }
  //
  // Extra scatter on the east ground strip (branch trampoline → crack mouth).
  //
  if (eastGroundRockMinX != null) {
    const eastLeft = eastGroundRockMinX + EAST_ROCK_INSET
    const crackZone = getCrackZone(WORLD_W, FLOOR_Y)
    const eastRockClear = (x) => nearTramp(x) || x >= crackZone.x1 - 52
    const eastSpan = Math.max(50, rightEdge - eastLeft)
    for (let i = 0; i < EAST_ROCK_COUNT; i++) {
      const t = (i + 0.5) / EAST_ROCK_COUNT
      const radius = SCATTER_ROCK_RADIUS_MIN + Math.random() * (SCATTER_ROCK_RADIUS_MAX - SCATTER_ROCK_RADIUS_MIN)
      let cx = eastLeft + eastSpan * t + (Math.random() - 0.5) * eastSpan * 0.22
      let safety = 0
      while (eastRockClear(cx) && safety < 48) {
        cx = eastLeft + Math.random() * eastSpan
        safety++
      }
      if (eastRockClear(cx) || cx < eastLeft) continue
      const rock = placeRock(k, cx, radius, 'right', false, 7, 0.85 + Math.random() * 0.35, decorAtlas, zones)
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
  const palette = forestRockShadedDrawPalette()
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
    applyForestMaterialBake(canvas, seedOffset)
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
  obj._decorWorldX = worldX
  obj._detailRank = radius < 16 ? 'small' : 'large'
  if (z === SHORE_END_ROCK_Z || waterCluster) {
    obj._rockWidthScale = widthScale
    obj._rockVerts = verts
    obj._lakeBakeW = totalW
    obj._rockBakeCy = cy
  }
  obj.hidden = true
  obj.pos.y = PLATFORM_HIDE_Y
  return obj
}
//
// Flat ground line for the centipede. Up is a smaller Y.
//
function forestPredatorGroundAt(levelInst) {
  let y = FLOOR_Y - PREDATOR_GROUND_CLEARANCE
  const mounted = levelInst.shoreFallTwigs?.twigs?.some(twig => twig.phase === 'predatorMount')
  mounted && (y -= PREDATOR_STICK_EXTRA_LIFT)
  return y
}
//
// Mushrooms — value 5, excluded from water zone.
//
function createForestMushrooms(k, waterX1, waterX2, trampX, branchTrampX, zones, decorAtlas) {
  const objs = []
  const left = LEFT_MARGIN + 60
  const capColorsRgb = MUSHROOM_CAP_HEX.map(hex => {
    const c = forestRgb(hex)
    return [c.r, c.g, c.b]
  })
  const capLightRgb = MUSHROOM_CAP_LIGHT_HEX.map(hex => {
    const c = forestRgb(hex)
    return [c.r, c.g, c.b]
  })
  const capShadowRgb = MUSHROOM_CAP_SHADOW_HEX.map(hex => {
    const c = forestRgb(hex)
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
    applyForestGameplaySharpBake(mushColorCanvas, posX * 2 + 2 | 0)
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
  applyForestGameplaySharpBake(canvas, name.length * 13)
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
// Water — see-through fill bounded by the wave polygon, over the bed layer
// (murk, sandy bed, pebbles) and the swaying algae.
//
function createWater(k, x1, x2Core, zones, rockObjs) {
  const lake = Lake.create({
    k,
    x1,
    x2Core,
    surfaceY: WATER_SURFACE_Y,
    floorY: FLOOR_Y,
    spriteKey: LAKE_SPRITE_KEY,
    waterStartX: EyeFlower.islandShoreWorldX(x1, WATER_SURFACE_Y)
  })
  rockObjs && bakeLakeShoreRockFullSprites(k, lake, rockObjs)
  lake.x2Bake = x1 + lake.bakeSpan
  zones._lake = lake
  k.add([
    k.z(LAKE_BED_Z),
    {
      draw() {
        isLakeLayerVisible(k, zones, lake) && Lake.drawBed(k, lake)
      }
    }
  ])
  k.add([
    k.z(LAKE_ALGAE_Z),
    {
      draw() {
        isLakeLayerVisible(k, zones, lake) && Lake.drawAlgae(k, lake)
      }
    }
  ])
  const layer = k.add([
    k.z(LAKE_Z),
    {
      draw() {
        isLakeLayerVisible(k, zones, lake) && Lake.drawFill(k, lake)
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
// True while the lake is open and any part of it is on screen.
//
function isLakeLayerVisible(k, zones, lake) {
  return !!zones.water && isLakeFillInCameraView(k, zones._sceneRef, lake.x1, lake.x2Bake)
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
// Bakes the tree-side shore cap rocks and the water-edge rock cluster as ONE
// mossy rock sprite: all silhouettes merge into a single outline, their
// lower halves pulled down
// (and spread outward) until they sink into the lake bed. Everything below
// the bed / bank line is clipped away (the earth band sits in front), and
// the part under the water line is tinted with the water colour so it reads
// as submerged but stays opaque. The sprite hangs on the tree-side rock.
//
function bakeLakeShoreRockFullSprites(k, lake, rockObjs) {
  const rocks = rockObjs.filter(o => (o._lakeShoreEnd || o._waterCluster) && o._rockVerts)
  const main = rocks.find(o => o._shoreTreeSide)
  if (!main) return
  const anchorX = lake.x1 + lake.coreSpan + (lake.bakeSpan - lake.coreSpan) * LAKE_SHORE_ROCK_ANCHOR_T
  const loops = rocks.map(rock => lakeShoreRockWorldLoop(lake, rock, anchorX))
  const pts = loops.flat()
  const pad = ROCK_OUTLINE_WIDTH * 2
  const x0 = Math.floor(Math.min(...pts.map(p => p.x)) - pad)
  const y0 = Math.floor(Math.min(...pts.map(p => p.y)) - pad)
  const width = Math.ceil(Math.max(...pts.map(p => p.x)) + pad) - x0
  const height = Math.ceil(Math.max(...pts.map(p => p.y)) + pad) - y0
  const waterY = WATER_SURFACE_Y - y0
  const canvas = toCanvas({ width, height, pixelRatio: 1 }, (ctx) => {
    ctx.save()
    Lake.clipToBed(ctx, lake, x0, y0, width, height)
    paintForestShoreRock(ctx, {
      loops: loops.map(loop => loop.map(p => ({ x: p.x - x0, y: p.y - y0 }))),
      waterY,
      rng: createSeededRandom((main._decorWorldX * 13 | 0) + Lake.LAKE_BAKE_GEOMETRY_VERSION),
      outlineWidth: ROCK_OUTLINE_WIDTH
    })
    ctx.restore()
    Lake.tintUnderwater(ctx, width, height, waterY)
  })
  applyForestLayerGradeToCanvas(canvas, FOREST_LAYER_GRADE.decor, (main._decorWorldX * 7 | 0) + 91)
  const name = `forest0-lake-shore-rock-v${Lake.LAKE_BAKE_GEOMETRY_VERSION}-${main._decorWorldX | 0}`
  k.loadSprite(name, canvas)
  canvas.width = 0
  canvas.height = 0
  rocks.forEach(rock => { rock._lakeMerged = true })
  main._lakeFullSprite = { name, x: x0, y: y0, width, height }
}
//
// Sunk outline of one shore rock in world coordinates, scaled toward the
// shore anchor (x) and the ground line (y) before sinking into the bed.
//
function lakeShoreRockWorldLoop(lake, rock, anchorX) {
  const ox = anchorX + (rock._homeX + rock._lakeBakeW / 2 - anchorX) * LAKE_SHORE_ROCK_SCALE
  const oy = FLOOR_Y + (rock._homeY + rock._rockBakeCy - FLOOR_Y) * LAKE_SHORE_ROCK_SCALE - LAKE_SHORE_ROCK_LIFT_PX
  const ws = rock._rockWidthScale
  return lakeShoreRockSunkVerts(lake, rock, ox, oy).map(v => ({ x: ox + v.x * ws, y: oy + v.y }))
}
//
// Scaled lower-half rock verts pulled down past the bed under each vertex
// (the bed clip trims the overshoot) and spread outward on the way down, so
// the rock widens into the bed like a pile and leaves no water gap under it.
//
function lakeShoreRockSunkVerts(lake, rock, ox, oy) {
  const ws = rock._rockWidthScale
  const verts = rock._rockVerts.map(v => ({ x: v.x * LAKE_SHORE_ROCK_SCALE, y: v.y * LAKE_SHORE_ROCK_SCALE }))
  const minY = Math.min(...verts.map(v => v.y))
  const maxLowerY = Math.max(...verts.map(v => v.y))
  const ySpan = Math.max(1, maxLowerY - minY)
  return verts.map(v => {
    const depthT = (v.y - minY) / ySpan
    const topNarrow = 1 - LAKE_SHORE_ROCK_TOP_PINCH * (1 - depthT)
    let x = v.x * topNarrow
    let y = v.y
    if (v.y <= 0) return { x, y }
    const reach = Math.pow(v.y / maxLowerY, LAKE_SHORE_ROCK_FLANK_EXP)
    x = x * (1 + LAKE_SHORE_ROCK_BASE_SPREAD * reach * LAKE_SHORE_ROCK_BOTTOM_FLARE)
    const bedY = Lake.bedWorldY(lake, ox + x * ws) + LAKE_SHORE_ROCK_BED_OVERSHOOT_PX - oy
    return { x, y: Math.max(y, y + (bedY - y) * reach) }
  })
}
//
// Shared lake bed depth at normalized x (0 = left/deep, 1 = right/shallow)
//
function isLakeFillInCameraView(k, sc, x1, x2) {
  const view = forestCameraViewXRange(k, sc, LAKE_SURFACE_CULL_MARGIN)
  return !view || !(x2 < view.x1 || x1 > view.x2)
}
//
// Visible world X range of the forest camera (null before the camera exists,
// which callers treat as "everything visible").
//
function forestCameraViewXRange(k, sc, margin) {
  const cam = sc?.camera
  if (!cam) return null
  const halfW = cam.viewW / (2 * (cam.zoom || 1)) + margin
  const camX = k.camPos().x
  return { x1: camX - halfW, x2: camX + halfW }
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
  const time = inst.k.time() % Lake.LAKE_BAKE_CYCLE
  return WATER_SURFACE_Y + Lake.lakeWaveOffsetAt(t, time)
}
//
// Full hero blit while the default sprite stays hidden in the pit (high-z draw pass).
//
function drawForestPitCaveHeroForeground(inst) {
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
function drawForestDrownHeroClipped(inst) {
  if (!inst.forestDrownHeroClipLock) return
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
// Part of the drowning hero below the wave, under the water fill so it reads
// through the tint (the part above is drawn by drawForestDrownHeroClipped).
//
function drawForestDrownHeroUnderwater(inst) {
  if (!inst.forestDrownHeroClipLock) return
  const char = inst.heroInst?.character
  if (!char?.pos) return
  const k = inst.k
  const sprite = `${inst.heroInst.spritePrefix || inst.heroInst.type}_closed`
  if (!k.getSprite(sprite)) return
  const lake = inst.zones._lake
  if (!lake) return
  const fullH = Hero.HERO_BAKE_SPRITE_SIZE * (char.scale?.x ?? 1)
  const topY = char.pos.y - fullH * 0.5
  const surfaceY = Math.max(topY, lakeSurfaceWorldYAt(inst, char.pos.x))
  const bottomY = Math.min(topY + fullH, lake.originY + Lake.lakeBottomLocalY(lake, char.pos.x - lake.x1))
  const visibleH = bottomY - surfaceY
  if (visibleH <= 0) return
  const quadY = (surfaceY - topY) / fullH
  k.drawSprite({
    sprite,
    pos: k.vec2(char.pos.x, surfaceY + visibleH * 0.5),
    anchor: 'center',
    width: fullH,
    height: visibleH,
    flipX: char.flipX,
    opacity: char.opacity ?? 1,
    quad: { x: 0, y: quadY, w: 1, h: visibleH / fullH }
  })
}
//
// Detects which surface the hero stands on.
//
function detectForestSurface(inst) {
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
  if (footY >= FLOOR_Y - 30) return 'ground'
  return 'air'
}
//
// True when the given feet position sits on any wood surface (branch or log
// platform), regardless of the hero's grounded state that frame.
//
function isOverForestWoodSurface(inst, footX, footY) {
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
  if (isOnForestLakeDryFooting(inst, x, footY)) return false
  return x >= inst.lakeX1 && x <= inst.lakeX2 && footY >= FLOOR_Y - 40
}
//
// The eye-flower island is the only dry footing inside the lake band.
//
function isOnForestLakeDryFooting(inst, x, footY) {
  return EyeFlower.isOnIsland(inst.eyeFlower, x, footY)
}
//
// The island and its plant exist only in the colour world once the lake is open.
//
function isForestEyeFlowerVisible(inst) {
  return !!inst.zones.water
}
//
// Hero body centre for the eye-flower to watch and reach (null while gone).
//
function forestEyeFlowerHeroPos(inst) {
  const char = inst.heroInst?.character
  if (!char?.pos || inst.drowning || inst.deathHandled) return null
  return { x: char.pos.x, y: char.pos.y + FOREST_EYE_FLOWER_HERO_CENTER_DY }
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
  const cutout = forestPitEarthBandCutoutForInst(inst)
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
  const drawX = ForestCamera.getParallaxDrawX(inst.camera, layer.speed, layer.bleed)
  const pad = ForestCamera.getParallaxLayerPad(inst.camera, layer.speed, layer.bleed)
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
  const drawX = ForestCamera.getParallaxDrawX(inst.camera, layer.speed, layer.bleed)
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
function drawForestParallaxBackdropOffscreen(inst) {
  const k = inst.k
  inst._parOffscreen = forestParallaxOffscreenCanvas(k)
  inst._parOccluderY = parallaxNearOccluderWorldY(inst)
  inst._drawParBackdrop ??= () => drawForestParallaxBackdropLayers(inst)
  inst._parOffscreen.draw(inst._drawParBackdrop)
  drawForestParallaxBackdropBlit(inst)
}
//
// Blits the half-resolution backdrop. The near row hides everything below
// its solid top, so the blit stops there instead of filling the ground.
// drawCanvas flips the framebuffer around the full screen height, so a
// shorter quad is shifted up by the cropped amount and samples the top
// of the texture (high UV, which lands on screen y = 0).
//
function drawForestParallaxBackdropBlit(inst) {
  const k = inst.k
  const fullH = k.height()
  const cropH = forestParallaxBackdropScreenH(inst)
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
function forestParallaxBackdropScreenH(inst) {
  const worldY = inst._parOccluderY
  if (!Number.isFinite(worldY)) return inst.k.height()
  const screenY = forestWorldToScreenY(inst, worldY) + PAR_BACKDROP_CROP_PAD
  return Math.max(1, Math.min(inst.k.height(), Math.ceil(screenY)))
}
//
// Kaplay's camera is centre-anchored: world Y maps to screen Y around camPos.
//
function forestWorldToScreenY(inst, worldY) {
  const k = inst.k
  const scale = k.camScale?.()
  const zoom = (typeof scale === 'object' ? scale.y : scale) || 1
  return (worldY - k.camPos().y) * zoom + k.height() / 2
}
//
// Offscreen pass body — runs with the framebuffer bound.
//
function drawForestParallaxBackdropLayers(inst) {
  inst._parOffscreen.clear()
  drawParallaxLayer(inst, PAR_LAYER_FAR)
  drawParallaxLayer(inst, PAR_LAYER_MID)
}
//
// Offscreen backdrop framebuffer for the live engine, recreated when the
// native window size changes.
//
function forestParallaxOffscreenCanvas(k) {
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
function forestPitEarthBandCutoutForInst(inst) {
  const pit = inst.pit
  if (!pit?.zone) return null
  return getForestPitEarthBandMouthCutoutForPit(pit)
}
//
// Pit interior is painted at the start of onDrawWorld; the cave hero blit uses
// PIT_CAVE_HERO_FOREGROUND_Z so it stacks above mouth rocks and forest decor.
//
function ensureForestPitDrawLayer(inst) {
  inst._forestPitDrawInOnDrawWorld = true
}
//
// Paints the open cave and interior rocks at a low z-index.
//
function drawForestPitPass(inst) {
  if (!inst.pit) return
  const k = inst.k
  drawForestPitInteriorVoidBackdrop(inst, k)
  drawForestPit(k, inst.pit)
}
//
// Fills the earth-band cutout with cave void — never light playfield gray inside
// the open pit (that read as a wall in front of the hero).
//
function drawForestPitInteriorVoidBackdrop(inst, k) {
  const pit = inst.pit
  if (!pit?.collapsed || !pit.zone) return
  const { leftX, rightX } = getForestPitEarthBandMouthCutoutForPit(pit)
  const w = rightX - leftX
  const interiorH = pit.zone.depth
  const voidRgb = forestCaveEarthDeepRgb()
  interiorH > 0 && k.drawRect({
    pos: k.vec2(leftX, pit.floorY),
    width: w,
    height: interiorH,
    color: k.rgb(voidRgb.r, voidRgb.g, voidRgb.b)
  })
}
function drawForestPitCutoutBelowFloorFill(inst, k) {
  const pit = inst.pit
  if (!pit?.collapsed || !pit.zone) return
  const bottomY = pit.floorY + pit.zone.depth
  const bandEndY = pit.floorY + CAVE_BAND_H
  if (bandEndY <= bottomY) return
  const { leftX, rightX } = getForestPitEarthBandMouthCutoutForPit(pit)
  //
  // Prefer the same baked static-earth slice the strip left of the cave uses
  // (film grain included).
  //
  if (k.getSprite(BG_STATIC_COLOR)) {
    drawWorldSpriteBandSlice(k, leftX, rightX, bottomY, bandEndY, BG_STATIC_COLOR)
    return
  }
  const rgb = forestPitBelowCaveEarthRgb()
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
function forestPitBelowCaveEarthRgb() {
  return forestGroundEarthBottomLayerRgb()
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
function drawForestPitCaveRocksOverEarthBand(inst) {
  const pit = inst.pit
  if (!pit) return
  drawForestPitCaveForegroundDecor(inst.k, pit)
  drawForestPitCaveSeamCoverRocks(inst.k, pit)
}
//
// Main draw — world layers, then pit cave mouth rocks over the earth band.
//
function onDraw(inst) {
  onDrawWorld(inst)
  drawForestPitCaveRocksOverEarthBand(inst)
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
  drawForestParallaxBackdropOffscreen(inst)
  drawParallaxLayer(inst, PAR_LAYER_NEAR)
  drawWorldSpriteClipped(k, inst, BG_STATIC_COLOR, 1)
  drawForestPitMouthEarthGapFill(inst, k)
  drawForestPitCutoutBelowFloorFill(inst, k)
  //
  // Last in onDrawWorld — earth/static/parallax must not repaint over the pit;
  // pixel-snapped cave bake avoids a shimmering left wall while the hero jumps.
  //
  inst._forestPitDrawInOnDrawWorld && inst.pit && drawForestPitPass(inst)
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
function drawForestPitMouthEarthGapFill(inst, k) {
  if (!inst.zones.predatorAwake) return
  const pit = inst.pit
  if (!pit?.collapsed || !pit.zone) return
  const { leftX, rightX } = getForestPitEarthBandMouthCutoutForPit(pit)
  const w = rightX - leftX
  if (w <= 0) return
  const interiorH = Math.min(pit.zone.depth, CAVE_BAND_H)
  const belowH = CAVE_BAND_H - interiorH
  const voidRgb = forestCaveEarthDeepRgb()
  const bottomRgb = forestPitBelowCaveEarthRgb()
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
// Paints tree-side lake cap rocks when the water zone is open: one merged
// mossy rock reaching the lake bed (the other shore rocks are part of it).
//
function drawLakeShoreRocksWorld(inst) {
  const z = inst.zones
  if (!z.water) return
  const k = inst.k
  const white = k.rgb(255, 255, 255)
  inst.rockObjs.forEach(o => {
    if (!o._lakeShoreEnd) return
    const full = o._lakeFullSprite
    if (full) {
      k.drawSprite({ sprite: full.name, pos: k.vec2(full.x, full.y), width: full.width, height: full.height, color: white })
      return
    }
    o._lakeMerged || drawDecorAtlasSprite(k, o._bakedLakeCap, k.vec2(o._homeX, o._homeY), 'topleft', 0, 1, white)
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
      ? side * FOREST_MUSHROOM_WHISTLE_AMP_DEG * pulse *
        (0.7 + 0.3 * Math.sin(obj._glowPhase || 0)) * lifeMul
      : 0
    obj.leanAngle += (target - obj.leanAngle) * Math.min(1, dt * FOREST_MUSHROOM_WHISTLE_SMOOTH)
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
      ? side * FOREST_MUSHROOM_WHISTLE_AMP_DEG * pulse * 0.75 * lifeMul
      : 0
    branchTramp.leanAngle = (branchTramp.leanAngle ?? 0) +
      (target - (branchTramp.leanAngle ?? 0)) * Math.min(1, dt * FOREST_MUSHROOM_WHISTLE_SMOOTH)
    if (!singing && Math.abs(branchTramp.leanAngle) < 0.15) branchTramp.leanAngle = 0
  }
}
//
// Midge fill: warm gold.
//
function syncForestMidgeDrawColor(inst) {
  inst.midges && (inst.midges.midgeRgb = getForestLightRgb('bright'))
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
  inst.sound && !inst.sound._forestSfxMuted && Sound.playJumpSound(inst.sound)
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
function moveForestHeroTo(char, x, y) {
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
  const onPitFloorLane = pitPad && grounded && isHeroOnForestPitFloor(inst, char, grounded, heroFeet)
  const onWalkLane = onMainFloorLane || onPitFloorLane
  const stickyCap = !onWalkLane && nearX && inCapBand &&
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
  const walkingPastOnFloor = pitPad
    ? isHeroWalkingPastPitCaveTrampOnFloor(inst, char, heroFeet)
    : isHeroWalkingPastTrampOnMainFloor(inst, char, heroFeet)
  const fallingOntoCap = !inst.wasGrounded && nearX && inCapBand && velY >= -40 && !onWalkLane
  const padLatch = (state._capPadLatch ?? 0) > 0
  const needsPad = colliderActive && !onWalkLane && (onCap || bounceAir || padLatch || stickyCap ||
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
function createForestHorizBranchPlatforms(k, horizBranch, platTag, dropY, hideX = null, hideY = null) {
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
  if (inst.sound?._forestSfxMuted) return
  Sound.playLetterPickupSoft(inst.sound)
}
//
// Shows the top-centre FPS HUD when any top-bar element is visible.
//
function isForestTopHudElementVisible(inst) {
  const li = inst.levelIndicator
  if (!li) return false
  if (CFG.debug?.showPerformanceHud) return true
  return true
}
//
// Creates or hides the FPS counter based on visible HUD chrome.
//
function syncForestFpsHudVisibility(inst) {
  if (!CFG.debug?.showPerformanceHud && !isForestTopHudElementVisible(inst)) {
    inst.fpsCounter && FpsCounter.setVisible(inst.fpsCounter, false)
    return
  }
  if (!inst.fpsCounter) {
    inst.fpsCounter = FpsCounter.create({
      k: inst.k,
      topY: FOREST_HUD_FPS_TOP_Y,
      textColor: inst.k.rgb(HUD_SCORE_COLOR_SETTLED.r, HUD_SCORE_COLOR_SETTLED.g, HUD_SCORE_COLOR_SETTLED.b),
      outlineColor: inst.k.rgb(VOID.r, VOID.g, VOID.b),
      postBakeCanvas: applyForestHudSharpBake
    })
  }
  FpsCounter.setVisible(inst.fpsCounter, true)
  layoutForestFpsHud(inst)
}
//
// Lake shore / water-cluster rocks must appear the moment the lake opens.
//
function forceWaterEdgeRocksVisible(inst) {
  inst.rockObjs.forEach(o => {
    o._waterCluster && !o._lakeMerged && setDecorObjVisible(o, true)
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
function registerForestTrampolineLateBounce(inst) {
  inst.trampLateBounce?.cancel?.()
  inst.trampLateBounce = null
  const char = inst.heroInst?.character
  if (!char) return
  //
  // Scene onUpdate runs before the hero body — bounce must fire after land-squash
  // or jump-6 freezes the hero above the mushroom cap.
  //
  inst.trampLateBounce = char.onUpdate(() => runForestTrampolineLatePass(inst))
}
//
// Launches from mushroom caps after hero.js has finished its grounded pose.
//
function runForestTrampolineLatePass(inst) {
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
    bounced = tryMushroomTrampBounce(inst, inst.trampState, TRAMP_BOOST_MULT, hero, char, heroX, null) || bounced
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
    if (!inst.forestDrownHeroClipLock) return
    const ch = inst.heroInst?.character
    ch && (ch.hidden = true)
    inst.drowning && !inst.deathHandled && applyDrownSinkPose(inst)
  })
  inst.drownCharSink = char?.onUpdate(() => {
    if (!inst.forestDrownHeroClipLock) return
    char.hidden = true
    inst.drowning && !inst.deathHandled && applyDrownSinkPose(inst)
  })
}
//
// Rebakes closed-eye sprites with hollow sockets before the first-G lake sink.
//
function ensureForestHollowDrownClosedEyes(inst) {
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
  inst.forestDrownHeroClipLock = true
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
  ensureForestHollowDrownClosedEyes(inst)
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
  inst.footParticles && ForestFootParticles.clear(inst.footParticles)
  const char = inst.heroInst.character
  destroyStrayForestHeroBody(inst.k, char)
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
  const startY = char.pos.y
  inst.drownSinkX = drownX
  inst.drownSinkY = startY
  inst.heroInst.drownSinkX = drownX
  inst.heroInst.drownSinkY = startY
  char.opacity = 1
  applyDrownSinkPose(inst)
  beginDrownSinkTween(inst)
  registerDrownLateSink(inst)
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
  bumpForestLifeHudOnDeath(inst)
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
      persistForestDeathSpawn(inst, spawnX, spawnY)
    }
    inst.k.go('lesson-forest.0')
  })
}
//
// Shared life-HUD update for any death: reveal/flash/re-tint the life icon and
// its particle burst, gentle chime. Shared by drowning and touch death.
//
function bumpForestLifeHudOnDeath(inst) {
  if (!inst.levelIndicator) {
    inst.levelIndicator = createForestLevelIndicator(inst.k)
  }
  syncForestFpsHudVisibility(inst)
  if (!inst.levelIndicator?.lifeRevealed) return
  Sound.playGentleLifeSound(inst.sound)
  if (inst.levelIndicator?.lifeImage?.sprite?.exists?.()) {
    LevelIndicator.syncLifeHudGrey(inst.levelIndicator, false)
    inst.levelIndicator._lifeFlashLock = true
    const originalColor = inst.levelIndicator.lifeImage.sprite.color
    flashLifeImageOnDrownDeath(inst.k, inst.levelIndicator, originalColor, 0)
    createLifeParticlesOnDrownDeath(inst.k, inst.levelIndicator)
  }
  syncForestPitCaveFlag(inst)
}
//
// True once the predator's body overlaps the hero's feet, or the hero
// has landed on the hidden spikes at the L-log's right edge.
//
function checkForestTouchDeath(inst, heroX, heroFootY) {
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
  if (isOnForestLakeDryFooting(inst, heroX, heroFootY)) return
  if (Predator.isTouchingHero(inst.predator, heroX, heroFootY)) {
    Predator.notifyKill(inst.predator)
    triggerForestTouchDeath(inst, 'predator')
    return
  }
}
//
// Touching the predator or falling on the spikes is fatal — the hero
// shatters exactly like in any other level (Hero.death), but with the
// level's own dusty ground-burst (bigger, and spread upward too) instead of
// the generic body-square explosion.
//
function triggerForestTouchDeath(inst, cause) {
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
  destroyStrayForestHeroBody(inst.k, char)
  char.exists() && inst.k.destroy(char)
  forestLevel0LiveHeroChar = null
  hero.character = null
  triggerForestCameraShake(inst)
  spawnForestTouchDeathBurst(inst, deathX, deathY)
  finishForestTouchDeath(inst, cause, deathX, deathY)
}
//
// Leaf-shaped radial burst at the death spot — white leaves instead of the
// hero's generic body-square explosion.
//
function spawnForestTouchDeathBurst(inst, x, y) {
  if (!inst.footParticles) return
  const palette = forestTouchDeathLeafPalette()
  ForestFootParticles.spawnLeafBurst(inst.footParticles, x, y, palette, FOREST_TOUCH_DEATH_PARTICLE_COUNT, FLOOR_Y)
}
//
// The main tree's own green foliage tones, so the burst reads as real leaves
// rather than generic dust.
//
function forestTouchDeathLeafPalette() {
  return FOREST_PAL.heroDeathLeaves.map(hex => forestRgb(hex))
}
//
// Life-HUD bump, then in-level respawn beside the kill.
//
function finishForestTouchDeath(inst, cause, deathX, deathY) {
  bumpForestLifeHudOnDeath(inst)
  inst.touchDeathCount = (inst.touchDeathCount || 0) + 1
  if (cause === 'predator') {
    inst.predatorDeathCount = (inst.predatorDeathCount || 0) + 1
  }
  inst.touchDeathRespawnWait?.cancel?.()
  inst.touchDeathRespawnWait = inst.k.wait(FOREST_TOUCH_DEATH_RESPAWN_DELAY, () => {
    inst.touchDeathRespawnWait = null
    inst.touchDeathHandled && respawnForestHeroAfterTouchDeath(inst, deathX, deathY, cause)
  })
}
//
// Respawn beside the death spot (offset away from the hog, or clear of the
// spike zone), with bootstrap nudges.
//
function computeForestTouchDeathRespawnPose(inst, deathX, deathY, cause) {
  if (cause === 'predator') {
    const pred = inst.predator
    if (!pred) return { x: deathX, y: deathY }
    let spawnX = resolveForestPredatorRespawnX(deathX, deathY, pred)
    const spawnY = deathY
    const footY = spawnY + SURFACE_DETECT_Y
    const spawnOnBranch = isHeroOverStartBranchX(inst, spawnX) &&
      footY <= inst.startBranch.y + LOG_SNAP_STANDING_MAX
    const nudge = inst.heroSpawnNudge
    spawnX = nudgeForestHeroSpawnAwayFromTrampolines({
      spawnX,
      spawnOnBranch,
      branchTrampX: nudge.branchTrampX,
      trampX: nudge.trampX,
      branchTrampVisible: isBranchTrampolineVisible(inst.zones),
      trampVisible: isRightTrampolineVisible(inst.zones)
    })
    spawnX = resolveForestPredatorRespawnX(spawnX, spawnY, pred)
    return { x: spawnX, y: spawnY }
  }
  return { x: deathX, y: deathY }
}
//
// Picks ground X behind the crawler (opposite its facing) at the current head
// position, then slides along its patrol strip until the hitbox clears the
// body.
//
function resolveForestPredatorRespawnX(deathX, deathY, pred) {
  const predX = pred.x
  const footY = deathY + SURFACE_DETECT_Y
  const minX = pred.minX ?? deathX - HERO_PREDATOR_RESPAWN_FALLBACK_SPAN
  const maxX = pred.maxX ?? deathX + HERO_PREDATOR_RESPAWN_FALLBACK_SPAN
  const push = HERO_PREDATOR_RESPAWN_MIN_FROM_HEAD
  const awayFromDeath = deathX <= predX ? -1 : 1
  let away = -(pred.dir || awayFromDeath)
  let spawnX = clampForestPredatorRespawnX(predX + away * push, minX, maxX)
  if (Math.abs(spawnX - predX) < push * 0.55) {
    away = -away
    spawnX = clampForestPredatorRespawnX(predX + away * push, minX, maxX)
  }
  spawnX = slideForestPredatorRespawnClearOfBody(pred, spawnX, footY, away, minX, maxX)
  if (Predator.overlapsHeroHitbox(pred, spawnX, footY)) {
    away = -away
    spawnX = clampForestPredatorRespawnX(predX + away * push, minX, maxX)
    spawnX = slideForestPredatorRespawnClearOfBody(pred, spawnX, footY, away, minX, maxX)
  }
  return spawnX
}
//
// A restored spawn must not drop the hero into the crawler's body or right
// in front of its head on the ground it patrols (branches above are fine).
//
function isForestSpawnTooCloseToPredator(pred, heroX, heroY) {
  const footY = heroY + SURFACE_DETECT_Y
  if (Predator.overlapsHeroHitbox(pred, heroX, footY)) return true
  if (footY < FLOOR_Y - LOG_SNAP_STANDING_MAX) return false
  if (heroX < pred.minX || heroX > pred.maxX) return false
  return Math.abs(heroX - pred.x) < HERO_PREDATOR_RESPAWN_MIN_FROM_HEAD
}
//
// Keeps a respawn X inside the predator patrol band.
//
function clampForestPredatorRespawnX(x, minX, maxX) {
  return Math.max(minX, Math.min(maxX, x))
}
//
// Nudges spawn along the patrol strip until the hero feet box clears the body.
//
function slideForestPredatorRespawnClearOfBody(pred, spawnX, footY, sign, minX, maxX) {
  let x = spawnX
  for (let i = 0; i < 16 && Predator.overlapsHeroHitbox(pred, x, footY); i++) {
    x += sign * 28
    x = clampForestPredatorRespawnX(x, minX, maxX)
  }
  return x
}
//
// Forest routes landings through the same step timbre as running (footFx is off).
//
function bindForestHeroFootSounds(heroInst, sound) {
  heroInst.onPlayStepSound = (h) => {
    h.sfx && !sound._forestSfxMuted && Sound.playStepSound(h.sfx, h.stepSoundScene)
  }
  heroInst.onPlayLandSound = (h) => {
    h.sfx && !sound._forestSfxMuted && Sound.playStepSound(h.sfx, h.stepSoundScene)
  }
}
//
// Rebuilds the hero body in-place after a touch death (no scene reload).
//
function respawnForestHeroAfterTouchDeath(inst, deathX, deathY, cause) {
  const k = inst.k
  const cfg = inst.forestHeroCreateCfg
  if (!cfg) return
  inst.heroHint && HeroHint.clear(inst.heroHint)
  releaseGamePhysicalKeys()
  const pose = computeForestTouchDeathRespawnPose(inst, deathX, deathY, cause)
  writeForestLastSpawnKeys(inst, pose.x, pose.y)
  const prev = inst.heroInst
  const stepSound = prev?.onPlayStepSound
  const landSound = prev?.onPlayLandSound
  destroyStrayForestHeroBody(k)
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
  inst.flowerGrab && (inst.flowerGrab.heroInst = fresh)
  inst.pit && (inst.pit.heroInst = fresh)
  inst.predator && (inst.predator.hero = fresh)
  //
  // The HUD eye keeps watching the respawned hero, not the destroyed body.
  //
  inst.levelIndicator && LevelIndicator.bindEyeHudLookAtHero(inst.levelIndicator, fresh)
  forestLevel0LiveHeroChar = fresh.character
  inst.deathHandled = false
  inst.touchDeathHandled = false
  inst.drowning = false
  inst.forestDrownHeroClipLock = false
  inst.drownSinkTween?.cancel?.()
  inst.drownSinkTween = null
  inst.touchDeathGraceUntil = inst.k.time() + TOUCH_DEATH_RESPAWN_GRACE_SEC
  inst.lastHeroX = pose.x
  inst.wasGrounded = false
  inst.trampBounceAir = false
  inst.branchTrampBounceAir = false
  registerForestTrampolineLateBounce(inst)
  snapForestCameraToHero(k, fresh)
}
//
// First-visit ground X: right of the branch tramp, outside the island
// flower whisper, then the same trampoline nudge as the hero spawn.
// Light shafts stay anchored here for the whole level.
//
function computeForestFirstStartGroundSpawnX(cfg) {
  const {
    branchTrampX,
    trampX,
    branchTrampVisible,
    trampVisible,
    heroGroundCenterY
  } = cfg
  const branchTrampSpawnClearX =
    branchTrampX + TRAMP_RADIUS + TRAMP_ADJACENT_X + HERO_TRAMPOLINE_SPAWN_CLEARANCE
  const whisperSilentSpawnX = EyeFlower.minHeroXOutsidePlantWhisper(
    LEFT_MARGIN,
    WATER_SURFACE_Y,
    heroGroundCenterY
  )
  const x = Math.max(branchTrampSpawnClearX, whisperSilentSpawnX)
  return nudgeForestHeroSpawnAwayFromTrampolines({
    spawnX: x,
    spawnOnBranch: false,
    branchTrampX,
    trampX,
    branchTrampVisible,
    trampVisible
  })
}
//
// Pulls a ground spawn X clear of an active mushroom trampoline's bounce cap
// (same horizontal band as isHeroAtTrampolineCap) — landing on it would fire
// the automatic bounce the instant the level loads. Branch spawns are left
// alone: the branch sits well above floor Y, outside either cap's Y band.
//
function nudgeForestHeroSpawnAwayFromTrampolines(cfg) {
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
// Reveals the lake after the hero drowns in it (or when reloading a save that
// already discovered water), with its shore rocks.
//
function revealWaterZone(inst) {
  if (inst.zones.water) {
    forceWaterEdgeRocksVisible(inst)
    applyZoneVisibility(inst)
    return
  }
  inst.zones.water = true
  inst.zones.waterDiscovered = true
  set(KEY_REVEALED_WATER, true)
  revealGroundDecorLeft(inst, true)
  revealLeftShoreRock(inst)
  syncForestAtmosphereZones(inst)
  forceWaterEdgeRocksVisible(inst)
  applyZoneVisibility(inst)
}
//
// Reveals ground decor on the left side (water / branch area).
//
function revealGroundDecorLeft(inst, silent = false) {
  if (inst.zones.groundDecorLeft) return
  inst.zones.groundDecorLeft = true
  set(KEY_REVEALED_GROUND_DECOR_LEFT, true)
  !silent && playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
  syncForestAtmosphereZones(inst)
}
//
// Midges follow which sides of the ground the hero has opened.
//
function syncForestAtmosphereZones(inst) {
  syncForestMidgesZones(inst.midges, inst.zones, Boolean(inst.pit?.collapsed))
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
function syncForestPitLevelIndicator(inst) {
  if (!inst.pit || !inst.levelIndicator) return
  inst.pit.levelIndicator = inst.levelIndicator
}
//
// True when the hero's feet are on the open cave pit floor collider.
//
function isHeroOnForestPitFloor(inst, char, grounded, footY) {
  const pit = inst.pit
  if (!pit?.collapsed || !char?.pos) return false
  const bottomY = pit.floorY + pit.zone.depth
  return grounded && footY >= bottomY - 28 && footY <= bottomY + 10
}
//
// Keeps jump input alive on the cave pit floor — Kaplay grounded flicker
// there used to leave canJump false between frames.
//
function refreshForestPitFloorJumpState(inst, char, grounded, footY) {
  if (!isHeroOnForestPitFloor(inst, char, grounded, footY)) return
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
function refreshForestBranchJumpState(inst, char) {
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
function refreshForestMainGroundJumpState(inst, char, grounded, footY) {
  if (!char?.pos || !grounded) return
  if (footY < FLOOR_Y - LOG_SNAP_STANDING_MAX) return
  if (isInWaterZone(inst, char.pos.x, footY)) return
  if (isHeroOnStartBranch(inst, char)) return
  if (inst.trampBounceAir || inst.branchTrampBounceAir) return
  if (isOnTrampolineCap(inst, char, inst.trampState)) return
  if (isOnTrampolineCap(inst, char, inst.branchTrampState)) return
  const hero = inst.heroInst
  if (!hero || hero.isSquashing || forestHeroInTrampLandingPose(hero)) return
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
function stepForestRideCameraX(inst, raw) {
  const prev = inst._rideCamX
  if (prev == null) {
    inst._rideCamX = Math.round(raw)
    return inst._rideCamX
  }
  if (raw >= prev + RIDE_CAM_STEP_PX) inst._rideCamX = Math.floor(raw)
  else if (raw <= prev - RIDE_CAM_STEP_PX) inst._rideCamX = Math.ceil(raw)
  return inst._rideCamX
}

function updateForestCamera(inst) {
  const ch = inst.heroInst?.character
  if (!ch?.pos || !inst.camera) return
  inst.camera && ForestCamera.updateShake(inst.camera, inst.k.dt())
  const inPitCave = Boolean(inst._inForestPitCave)
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
    ? stepForestRideCameraX(inst, inst.predator?.x ?? ch.pos.x)
    : (inst._rideCamX = null, ch.pos.x)
  const pixelAlignCamX = !ridingStick && !inPitCave && grounded
  ForestCamera.followHero(inst.camera, followX, ch.pos.y, pixelAlignCamX)
  !inst.heroInst?.isSubmerging && !inPitCave && !ridingStick &&
    ForestCamera.snapHeroScreenY(inst.k, inst.heroInst, inst.k.camPos().y)
}
//
// First visit with no explored zones: ease the camera from a tight view to full width.
//
function maybeStartForestCameraIntro(inst) {
  const k = inst.k
  k.camScale(1)
  set(KEY_CAMERA_INTRO_DONE, true)
  snapForestCameraToHero(k, inst.heroInst)
  updateForestCamera(inst)
}
function snapForestCameraToHero(k, heroInst) {
  const ch = heroInst?.character
  if (!ch?.pos) return
  const half = VIEW_W / 2
  const minX = LEFT_MARGIN + half
  const maxX = WORLD_W - RIGHT_MARGIN - half
  const camX = Math.max(minX, Math.min(maxX, ch.pos.x))
  ForestCamera.setCamPosForPixelAlignedSubjectX(
    k, ch.pos.x, camX, Math.round(DESIGN_SCREEN_H / 2)
  )
}
//
// Full-screen void curtain — async bootstrap yields to the engine between
// k.add() calls, so without this the wrong colour phase can flash for a frame.
//
function createForestBootstrapCurtain(k) {
  const voidColor = k.rgb(OUTER.r, OUTER.g, OUTER.b)
  return k.add([
    k.fixed(),
    k.pos(0, 0),
    k.z(FOREST_BOOTSTRAP_CURTAIN_Z),
    k.rect(k.width(), k.height()),
    k.color(voidColor)
  ])
}
function destroyForestBootstrapCurtain(curtain) {
  curtain?.destroy?.()
}
//
// Removes a duplicate hero body left by an aborted scene bootstrap.
//
function destroyStrayForestHeroBody(k, keep = null) {
  const stray = forestLevel0LiveHeroChar
  if (!stray || stray === keep || !stray.exists?.()) return
  k.destroy(stray)
  forestLevel0LiveHeroChar = keep
}
//
// Trampoline pad sync + cap snap — must run every frame so the invisible cap
// moves off once the hero walks away.
//
function syncForestHeroTrampolinePads(inst, char, heroX, footY) {
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
  EyeFlower.syncVisible(inst.eyeFlower)
  if (inst._forestBirdsBootstrapKick) {
    inst._forestBirdsBootstrapKick = false
    ensureForestBirdsBackgroundPlaying(inst)
  }
  if (inst.drowning) {
    const drownChar = inst.heroInst?.character
    inst.forestDrownHeroClipLock && drownChar && (drownChar.hidden = true)
    updateForestCamera(inst)
    return
  }
  if (!inst.deathHandled && tryStartForestFlowerGrab(inst)) return
  syncForestPredatorPatrolBounds(inst)
  tickForestTreeFruits(inst, k.dt(), FLOOR_Y)
  inst.spikyTomatoes && SpikyTomato.onUpdate(inst.spikyTomatoes, k.dt())
  inst.shoreFallTwigs && HorizFallTwig.tickTwigPredatorRide(inst.shoreFallTwigs, k.dt())
  inst.predator && (inst.predator.homeX = inst.trampState?.x ?? inst.predator.homeX)
  inst.predator && !inst.predator.obj?.hidden && Predator.update(inst.predator, k.dt())
  inst.shoreFallTwigs && HorizFallTwig.onUpdate(
    inst.shoreFallTwigs, k.dt(), FLOOR_Y, inst.predator, inst.heroInst?.character
  )
  if (inst.touchDeathHandled) {
    inst.footParticles && ForestFootParticles.onUpdate(inst.footParticles, k.dt())
    inst.fpsCounter && FpsCounter.onUpdate(inst.fpsCounter)
    return
  }
  if (FlowerGrab.isActive(inst.flowerGrab)) {
    updateForestFlowerGrabFrame(inst)
    return
  }
  inst.fpsCounter && FpsCounter.onUpdate(inst.fpsCounter)
  updateForestIntroHint(inst, k.dt())
  if (inst._mushroomLeanActive) {
    updateMushroomWhistleLean(inst)
    inst._mushroomLeanActive = inst.mushObjs.some(obj => !obj.hidden && Math.abs(obj.leanAngle ?? 0) > 0.2)
  }
  syncShoreBranchPlatform(inst)
  ChainEyeTramp.syncChainEyeTrampPads(inst)
  syncForestPitLevelIndicator(inst)
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
  // Forest owns all foot FX — block hero.js dust for the whole frame.
  //
  hero.suppressDust = true
  //
  // The hero is playable from the first frame, the controls hint included.
  //
  hero.controllable = true
  hero.controlsDisabled = false
  hero.jumpDisabled = false
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  inst.chainBuoys &&
    ChainBuoy.onUpdate(inst.chainBuoys, heroX, char.pos.y, k.dt())
  inst.earTrees && EarTree.onUpdate(inst.earTrees, k.dt())
  updateForestPlantWhisperSound(inst, char)
  updateForestProximitySound(inst, char)
  const grounded = char.isGrounded?.() ?? false
  const justLanded = grounded && !inst.wasGrounded
  trackForestSafeHeroPose(inst, char, heroX, footY, grounded)
  //
  // refreshForestMainGroundJumpState clears wasJumping before foot bursts run —
  // latch landing dust here while jump state is still intact.
  //
  const landingFootBurst = justLanded && (hero.wasJumping || hero.jumpPhase === 'jumping')
  refreshForestBranchJumpState(inst, char)
  refreshForestMainGroundJumpState(inst, char, grounded, footY)
  syncForestBranchJumpReady(inst, char, grounded)
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
  syncForestHeroTrampolinePads(inst, char, heroX, footY)
  inst.wasGrounded = char.isGrounded?.() ?? false
  //
  // Bounce is the main L-log trigger; a jump-land on the cap is the backup.
  //
  const surface = detectForestSurface(inst)
  inst.sound._l2Surface = surface === 'wood' ? 'wood' : null
  if (surface === 'wood' || surface === 'ground') {
    inst.sound._forestSurface = surface
  }
  maybePlayForestEarlyLandSfx(inst, char, hero, footY, grounded)
  //
  // Landing SFX backup (collide path can miss on wood flicker / air-lock).
  // The start branch has its own dedicated wood-land trigger below — this
  // backup must skip it, or the very first landing (and any later branch
  // landing) fires both, smearing a single thump into an audible double-hit.
  //
  if (justLanded && !inst._forestEarlyLandSfxDone && (surface === 'wood' || surface === 'ground') &&
    !inst.sound._forestSfxMuted &&
    !inst.expectBranchWoodLandSound && !isHeroOnStartBranch(inst, char)) {
    if ((hero.landFxCooldown || 0) <= 0) {
      hero.landFxCooldown = 0.2
      surface === 'ground'
        ? Sound.playStepSound(inst.sound, 'lesson-forest.0')
        : Sound.playLandSound(inst.sound, 'lesson-forest.0')
    }
  }
  //
  // A small puff also kicks up right as the hero starts running from a
  // standstill, not just on landing — hero.js's own run-start dust is
  // suppressed for forest (suppressDust), so it needs its own trigger here.
  //
  const startedRunning = grounded && hero.isRunning && !inst.wasHeroRunning
  inst.wasHeroRunning = hero.isRunning
  syncBranchPlatHome(inst)
  char.hidden && !inst.forestDrownHeroClipLock && !inst.pitCaveHeroForeground &&
    (char.hidden = false)
  typeof char.opacity === 'number' && char.opacity < 1 &&
    (char.opacity = 1)
  snapHeroToLogPlatforms(inst, char)
  !isOnForestLakeDryFooting(inst, heroX, footY) && HorizFallTwig.snapHeroPredatorTwigRide(inst.shoreFallTwigs, char, inst.heroInst)
  inst.shoreFallTwigs && HorizFallTwig.tryPredatorTurnTowardIslandAfterLanding(
    inst.shoreFallTwigs,
    inst,
    char,
    isOnForestLakeDryFooting
  )
  inst.shoreFallTwigs && HorizFallTwig.tickPredatorIslandRetreatFallback(
    inst.shoreFallTwigs,
    inst,
    char,
    isOnForestLakeDryFooting
  )
  snapHeroToStartBranch(inst, char, heroX, footY)
  snapHeroToShoreBranch(inst, char, heroX, footY)
  snapHeroToMainGround(inst, char, grounded, heroX, footY)
  refreshForestBranchJumpState(inst, char)
  refreshForestMainGroundJumpState(inst, char, grounded, footY)
  const groundedOnBranch = (char.isGrounded?.() ?? false) && isHeroOnStartBranch(inst, char)
  const wantBranchWoodLand = groundedOnBranch &&
    (!inst.wasGroundedOnBranch || inst.expectBranchWoodLandSound)
  if (wantBranchWoodLand && !inst.sound._forestSfxMuted && !inst._forestEarlyLandSfxDone) {
    const branchHero = inst.heroInst
    if (branchHero) {
      branchHero.landFxCooldown = 0.2
      inst.sound._forestSurface = 'wood'
      Sound.playLandSound(inst.sound, 'lesson-forest.0')
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
  const snapSurface = detectForestSurface(inst)
  const allowFootBurst = canSpawnForestFootBurst(inst, char)
  if (landingFootBurst && allowFootBurst) {
    const lakeFloorLand = isInWaterZone(inst, snapHeroX, snapFootY) &&
      snapFootY >= FLOOR_Y - LOG_SNAP_STANDING_MAX
    !lakeFloorLand &&
      spawnForestFootLanding(inst.footParticles, snapHeroX, snapFootY, snapSurface, inst, char)
  }
  if (startedRunning && allowFootBurst && !isInWaterZone(inst, snapHeroX, snapFootY)) {
    spawnForestFootLanding(inst.footParticles, snapHeroX, snapFootY, snapSurface, inst, char)
  }
  syncForestWorldBirdsVolume(inst)
  syncForestPredatorVisibility(inst)
  syncForestPitCaveFlag(inst)
  tickForestStartBranchFatigue(inst, char, grounded, justLanded)
  tickForestShoreBranchTwigs(inst, char, hero, grounded, justLanded)
  tickForestTomatoTreeLanding(inst, char, grounded, justLanded)
  updateForestMidges(inst.midges, k.dt(), 1)
  updateForestPit(inst.pit, char)
  refreshForestPitFloorJumpState(inst, char, grounded, footY)
  inst.footParticles && ForestFootParticles.onUpdate(inst.footParticles, k.dt())
  syncForestAtmosphereZones(inst)
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
  syncForestBranchJumpReady(inst, char, grounded)
  syncHeroTrampDrawOrder(inst)
  syncForestPitCaveHeroForegroundDraw(inst, char, footY)
  syncForestPitHeroDrawOrder(inst, char, footY)
  updateForestCamera(inst)
  inst.lastHeroX = char.pos.x
  //
  // Predator touch death — last check of the frame since it may destroy
  // the hero's character outright.
  //
  !inst.deathHandled && checkForestTouchDeath(inst, heroX, footY)
}
//
// Predator patrol strip — between the lake's east edge and the cave mouth.
//
function computeForestPredatorPatrolBounds(lakeX2) {
  const crack = getCrackZone(WORLD_W, FLOOR_Y)
  const caveMouthX = getForestCaveMouthFloorLeftX(crack)
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
function syncForestPredatorPatrolBounds(inst) {
  const pred = inst.predator
  if (!pred) return
  const bounds = computeForestPredatorPatrolBounds(inst.lakeX2)
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
//
// Hero on the island means grabbed — however he got there and whatever the
// physics, stick or input state says. Runs first in the level update, before
// the stick, the centipede and the lake checks can move or drown him.
//
function tryStartForestFlowerGrab(inst) {
  if (!inst.flowerGrab || FlowerGrab.isActive(inst.flowerGrab)) return false
  const char = inst.heroInst?.character
  if (!char?.pos) return false
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (!EyeFlower.containsHero(inst.eyeFlower, char.pos.x, footY)) return false
  //
  // The bank strip reaches the centipede's head: a rider still on the stick
  // there has not left it yet.
  //
  if (HorizFallTwig.isHeroRidingPredator(inst.shoreFallTwigs, char) &&
    !EyeFlower.isOnIsland(inst.eyeFlower, char.pos.x, footY)) return false
  destroyStrayForestHeroBody(inst.k, char)
  FlowerGrab.start(inst.flowerGrab)
  HorizFallTwig.releasePredatorAtIsland(inst.shoreFallTwigs, inst)
  return true
}
//
// While the flower drags the hero away the level only runs the sequence,
// particles, whisper, FPS and camera. The camera follows him a little way
// down the root tunnel on top of its regular horizontal follow.
//
function updateForestFlowerGrabFrame(inst) {
  const k = inst.k
  FlowerGrab.onUpdate(inst.flowerGrab, k.dt())
  inst.footParticles && ForestFootParticles.onUpdate(inst.footParticles, k.dt())
  inst.fpsCounter && FpsCounter.onUpdate(inst.fpsCounter)
  updateForestPlantWhisperSound(inst, inst.heroInst.character)
  updateForestCamera(inst)
  const drop = FlowerGrab.cameraDropY(inst.flowerGrab)
  drop > 0 && k.camPos(k.camPos().x, k.camPos().y + drop)
}
//
// The swallowed hero ends the forest section: he drops into the cave below.
//
function finishForestFlowerGrab(k) {
  set(KEY_FOREST_COMPLETED, true)
  set(KEY_LAST_LESSON, FLOWER_GRAB_NEXT_LESSON)
  createLevelTransition(k, FLOWER_GRAB_TRANSITION_FROM)
}
function forestPredatorCanHuntHero(inst) {
  const char = inst.heroInst?.character
  const pred = inst.predator
  if (!char?.pos || inst.drowning || inst.deathHandled || !pred) return false
  if (FlowerGrab.isActive(inst.flowerGrab)) return false
  if (HorizFallTwig.isHeroShieldedByTwig(inst.shoreFallTwigs, char)) return false
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (isOnForestLakeDryFooting(inst, char.pos.x, footY)) return false
  const predatorGroundY = pred.groundAt(char.pos.x)
  return Math.abs(footY - predatorGroundY) <= FOREST_PREDATOR_HERO_VERTICAL_BAND_PX
}
function triggerForestBranchLandingShake(inst) {
  inst.camera && ForestCamera.triggerShake(inst.camera, FOREST_BRANCH_JUMP_SHAKE_AMP, FOREST_BRANCH_JUMP_SHAKE_DURATION)
}
//
// Ground landings near a lip-tree jolt it; the third jolt drops its tomato.
//
function tickForestTomatoTreeLanding(inst, char, grounded, justLanded) {
  if (!justLanded || !grounded || !inst.spikyTomatoes) return
  if (!isOnForestMainGroundFoot(char.pos.y + SURFACE_DETECT_Y)) return
  SpikyTomato.onHeroLanded(inst.spikyTomatoes, char.pos.x)
}
//
// Tomato burst on the ground — camera jolt, and a nearby centipede bolts away.
//
function onForestTomatoExplode(inst, x, y) {
  triggerForestCameraShake(inst)
  grantForestTomatoBurstHeroSafety(inst, x, y)
  inst.predator && !inst.predator.obj?.hidden && Predator.startFlee(inst.predator, x)
}
//
// A burst under the hero used to overlap with flee touch-kill — keep him alive
// and in place while the centipede bolts away.
//
function grantForestTomatoBurstHeroSafety(inst, burstX, burstY) {
  const char = inst.heroInst?.character
  if (!char?.pos) return
  const footY = char.pos.y + SURFACE_DETECT_Y
  const by = burstY ?? FLOOR_Y
  const d = Math.hypot(char.pos.x - burstX, footY - by)
  if (d > TOMATO_BURST_HERO_SAFE_RADIUS) return
  inst.touchDeathGraceUntil = inst.k.time() + TOMATO_BURST_HERO_SAFE_SEC
}
//
// Left big tree: every second landing on its branch knocks the anchor apple
// loose. Landings while the last apple still waits for the centipede do not count.
//
function tickForestStartBranchFatigue(inst, char, grounded, justLanded) {
  if (!justLanded || !grounded || !isHeroOnStartBranch(inst, char)) return
  triggerForestBranchLandingShake(inst)
  if (hasForestAnchorFruitDropInWorld(inst)) return
  inst._startBranchLandingCount = (inst._startBranchLandingCount || 0) + 1
  if (inst._startBranchLandingCount < FOREST_BRANCH_LANDINGS_TO_DROP) return
  releaseForestAnchorFruit(inst) && (inst._startBranchLandingCount = 0)
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
function isForestWoodFootPosition(inst, footX, footY, char) {
  if (!inst) return false
  if (inst.sound?._forestSurface === 'wood') return true
  if (isOverForestWoodSurface(inst, footX, footY)) return true
  if (char && isHeroOnStartBranch(inst, char)) return true
  if (isHeroOverStartBranchX(inst, footX) && footY < FLOOR_Y - 24) return true
  return false
}
//
// Foot bursts only belong on the main forest floor — never on the start
// branch, letter logs or any other elevated wood collider.
//
function isOnForestMainGroundFoot(footY) {
  return footY >= FLOOR_Y - LOG_SNAP_STANDING_MAX && footY <= FLOOR_Y + 36
}
//
// True when a landing/run-start foot burst is allowed this frame.
//
function canSpawnForestFootBurst(inst, char) {
  if (!char?.pos || inst?.drowning) return false
  const footX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (detectForestSurface(inst) === 'wood') return false
  if (isForestWoodFootPosition(inst, footX, footY, char)) return false
  return isOnForestMainGroundFoot(footY)
}
//
// A branch-trampoline bounce lands on wood next — arm the wood land sound.
//
function onBranchTrampolineBounce(inst) {
  inst.expectBranchWoodLandSound = true
}
//
// True when the main tree sprite was baked during the pre-level transition.
//
function forestTreeSpritesPrewarmed(k) {
  return Boolean(k.getSprite(TREE_COLOR_SPRITE_NAME))
}
//
// True when parallax static layer exists from prewarm.
//
function forestParallaxSpritesPrewarmed(k) {
  return Boolean(k.getSprite(BG_STATIC_COLOR) && k.getSprite(BG_PAR_TREE1_COLOR))
}
//
// Bakes the full colour tree as one sprite cropped to its artwork. The crop
// offset is stashed for the tree object to draw at (see
// monolithicTreeBakeOffset).
//
function bakeMonolithicForestTreeSprites(k, treeData) {
  const palette = {
    ...getTreePaletteColor(),
    woodVolume: getForestGameplayTreeVolumeShades()
  }
  const colorCanvas = renderForestTreeToCanvas(treeData, palette, WORLD_W, WORLD_H)
  const bounds = measureCanvasContentBounds(colorCanvas, TREE_CROP_PAD)
  monolithicTreeOffsets.set(k, { x: bounds?.x ?? 0, y: bounds?.y ?? 0 })
  loadCroppedForestTreeSprite(k, TREE_COLOR_SPRITE_NAME, colorCanvas, bounds, TREE_COLOR_GRAIN_SEED)
}
//
// Loads one monolithic tree canvas cropped to its artwork, with film grain
// baked in afterwards (grain only touches opaque pixels, so cropping first
// changes nothing visually and scans far fewer pixels).
//
function loadCroppedForestTreeSprite(k, name, canvas, bounds, grainSeed) {
  const cropped = bounds ? cropCanvasToBounds(canvas, bounds) : canvas
  bounds && releaseCanvas(canvas)
  applyForestMaterialBake(cropped, grainSeed)
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
function forestRightWorldOpacity(sc, x, rank) {
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
function forestRightDecorOpacity(inst, obj) {
  const x = obj._decorWorldX ?? obj._homeX ?? 0
  return forestRightWorldOpacity(inst, x, obj._detailRank === 'small' ? 'small' : 'large')
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
  syncForestAtmosphereZones(inst)
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
// Camera Y is pinned to the design centre, so a window shorter than the
// design crops the top of the world, and the top HUD bar covers another
// TOP_MARGIN below that. Fruit hung above this line was never on screen.
//
function forestTreeFruitMinHangY() {
  const viewTop = Math.round(DESIGN_SCREEN_H / 2) - Math.min(SCREEN_H, DESIGN_SCREEN_H) / 2
  return viewTop + TOP_MARGIN + TREE_FRUIT_VIEW_TOP_PAD
}
//
// Layout for anchor-fruit placement on the main tree canopy.
//
function buildForestTreeFruitAnchorCfg() {
  return {
    trunkX: TREE_X,
    trunkHalf: TRUNK_EXCLUDE_HALF,
    branchTrampX: TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X,
    trampClearHalf: TRAMP_GRASS_CLEAR_HALF,
    minHangY: forestTreeFruitMinHangY()
  }
}
//
// Short camera bump for tree reveals, tramp landings and letter pickups.
//
function triggerForestCameraShake(inst) {
  inst.camera && ForestCamera.triggerShake(inst.camera, FOREST_CAMERA_SHAKE_AMP, FOREST_CAMERA_SHAKE_DURATION)
}
//
// True while hero.js holds the landing crouch (jump-6) or pre-jump squash.
//
function forestHeroInTrampLandingPose(hero) {
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
  if (state.pitCaveTramp) return wantsPitCaveTrampolineCapLaunch(inst, char, onCap, state)
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
// Pit cave — grounded on the cave floor but not on the mushroom cap (walk past).
//
function isHeroWalkingPastPitCaveTrampOnFloor(inst, char, footY) {
  const grounded = char.isGrounded?.() ?? false
  if (!grounded || !isHeroOnForestPitFloor(inst, char, grounded, footY)) return false
  const state = inst.pitCaveTrampState
  if (!state) return false
  const onCap = isHeroAtTrampolineCap(inst, char.pos.x, footY, state)
  !onCap && (inst.pitCaveTrampWasAboveCap = false)
  return !onCap
}
//
// Pit cave mushroom — teleport only after a fall/jump onto the cap from above.
//
function wantsPitCaveTrampolineCapLaunch(inst, char, onCap, state) {
  if (!onCap || !char?.pos) return false
  const footY = char.pos.y + SURFACE_DETECT_Y
  const capTopY = trampolineCapTopY(state)
  if (footY > capTopY + TRAMP_SNAP_BELOW) return false
  if (isHeroWalkingPastPitCaveTrampOnFloor(inst, char, footY)) return false
  const heroX = char.pos.x
  const grounded = char.isGrounded?.() ?? false
  const velY = char.vel?.y ?? 0
  const overCapX = Math.abs(heroX - state.x) < TRAMP_CAP_STAND_HALF
  const descendingOntoCap = overCapX && !grounded && velY > 24
  const aboveCap = overCapX && footY < capTopY + 6
  if (descendingOntoCap || aboveCap) inst.pitCaveTrampWasAboveCap = true
  if (!inst.pitCaveTrampWasAboveCap) return false
  inst.pitCaveTrampWasAboveCap = false
  return true
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
  if (forestHeroInTrampLandingPose(inst.heroInst)) return
  if (isHeroWalkingPastTrampOnMainFloor(inst, char, footY)) return
  if (pitPad && isHeroWalkingPastPitCaveTrampOnFloor(inst, char, footY)) return
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
  const pitFloorFeetY = trampolineCapFloorY(state)
  const sunkPastCap = pitPad
    ? footY > capTop + TRAMP_SNAP_BELOW && footY < pitFloorFeetY - PIT_CAVE_TRAMP_TUNNEL_FLOOR_CLEAR
    : footY > capTop + TRAMP_SNAP_BELOW && footY < TRAMP_MAIN_LANE_FEET_MIN
  //
  // Only a fall that already passed through the cap from above. A sideways
  // pass must not be pinned onto the pad — that left the hero standing in
  // the air beside the mushroom, then sinking through the floor.
  //
  if (sunkPastCap) {
    pitPad && (inst.pitCaveTrampWasAboveCap = true)
    pinHeroOnTrampolineCap(inst, char, capTop, state)
  }
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
// Flags state._edgeCatchPinned so runForestTrampolineLatePass (which runs
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
  moveForestHeroTo(char, char.pos.x, capTop - SURFACE_DETECT_Y + WOOD_LOG_SNAP_EMBED)
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
  clamped !== char.pos.x && moveForestHeroTo(char, clamped, char.pos.y)
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
  if (forestHeroInTrampLandingPose(hero)) return
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
  const bottomY = forestHeroHitboxBottomY(char)
  const sunkThroughFloor = bottomY > FLOOR_Y + LOG_SNAP_STANDING_MAX
  if (!sunkThroughFloor) return
  moveForestHeroTo(char, char.pos.x, char.pos.y - (bottomY - FLOOR_Y))
  char.vel && (char.vel.y = 0)
}
//
// World Y of the hero collider's bottom edge (follows the jump tuck).
//
function forestHeroHitboxBottomY(char) {
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
  const floorEndX = getForestCaveMouthFloorLeftX(crack)
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
  const bottomY = forestHeroHitboxBottomY(char)
  if (bottomY <= FLOOR_Y + LOG_SNAP_STANDING_MAX) return
  //
  // Feet under the floor line, including a shallow sink beside a mushroom.
  //
  if (bottomY <= FLOOR_Y + MAIN_GROUND_SINK_RESCUE_MAX) {
    moveForestHeroTo(char, char.pos.x, char.pos.y - (bottomY - FLOOR_Y))
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
  !skipPostLandLock && (hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, POST_LAND_AIR_LOCK_FOREST))
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
// recoloured to the forest gold — perception happens through colour here).
//
function flashLifeImageOnDrownDeath(k, levelIndicator, originalColor, count) {
  if (!levelIndicator?.lifeImage?.sprite?.exists?.()) return
  if (count >= LIFE_FLASH_COUNT) {
    levelIndicator.lifeImage.sprite.color = originalColor
    levelIndicator.lifeImage.sprite.opacity = 1.0
    levelIndicator._lifeFlashLock = false
    return
  }
  const flashA = forestRgb(FOREST_GOLD_HEX)
  const flashB = forestRgb('brightLight')
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
  const tone = forestRgb(FOREST_GOLD_HEX)
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
function spawnForestFootLanding(inst, footX, footY, surface, sceneInst, char) {
  if (!inst || sceneInst?.drowning || surface === 'wood') return
  //
  // Wood guard: surface tags and foot position can disagree for a frame
  // before/after log snaps — never leave dust on branch or log platforms.
  //
  if (isForestWoodFootPosition(sceneInst, footX, footY, char)) return
  //
  // Only the main ground gets a puff — branch and log tops stay clean.
  //
  if (!isOnForestMainGroundFoot(footY)) return
  ForestFootParticles.spawnLanding(
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
  return surface === 'wood' ? forestRgb(FOREST_PAL.treeGray.trunk) : GROUND_DARK
}
//
// Shows the crawler once the branch mushroom has woken it.
//
function syncForestPredatorVisibility(inst) {
  const pred = inst.predator
  pred?.obj &&
    (pred.obj.hidden = !(inst.zones.predatorAwake))
}
//
// Hides the Kaplay hero sprite; PIT_CAVE_HERO_FOREGROUND_Z redraws it above decor.
//
function syncForestPitCaveHeroForegroundDraw(inst, char, footY) {
  if (!char?.pos || inst.drowning || inst.deathHandled || inst.touchDeathHandled ||
    inst.forestDrownHeroClipLock) {
    inst.pitCaveHeroForeground && (char.hidden = false, inst.pitCaveHeroForeground = false)
    return
  }
  const inCave = isHeroInsideForestPitCave(inst, char.pos.x, char.pos.y, footY)
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
function syncForestPitHeroDrawOrder(inst, char, footY) {
  if (!char?.pos || inst.drowning || inst.deathHandled || inst.touchDeathHandled) return
  const pit = inst.pit
  if (!pit?.zone || !pit.collapsed) return
  if (inst.pitCaveHeroForeground) return
  if (isHeroInsideForestPitCave(inst, char.pos.x, char.pos.y, footY)) {
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
function syncForestBranchJumpReady(inst, char, grounded) {
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
    isHeroInsideForestPitCave(inst, ch.pos.x, ch.pos.y, footY) &&
    (targetZ = CFG.visual.zIndex.player + 24)
  ch.z !== targetZ && (ch.z = targetZ)
}
//
// Pit cave mushroom trampoline — same exit as the old ground portal: the hero
// pops onto the strip between the big tree and the branch trampoline.
//
const PIT_MUSH_GROUND_LAUNCH_MULT = 1.12
//
// Pit cave snap — only between the cap lip and the cave floor, never while
// walking the pit floor under the mushroom (that used to yank him onto the cap).
//
const PIT_CAVE_TRAMP_TUNNEL_FLOOR_CLEAR = LOG_SNAP_STANDING_MAX + 6
function setupForestPitCaveTrampoline(inst) {
  const pit = inst.pit
  if (!pit?.zone) return
  const k = inst.k
  const pitFloorY = pit.floorY + pit.zone.depth
  const trampX = getForestPitCaveTrampolineX(pit) ?? pit.portalX
  const bundle = createMushroomTrampoline(k, trampX, pitFloorY, inst.zones, {
    pitCaveTramp: true,
    drawZ: CFG.visual.zIndex.player + 22,
    colors: FOREST_PAL.cuteMushroom,
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
//
// Pit cave mushroom — same exit as the old ground portal: teleport between the
// big tree and the branch trampoline, then launch upward (cap landing only,
// same late pass as the other trampoline mushrooms).
//
function tryPitCaveTrampTeleport(inst, state, hero, char) {
  if (!state || state.cooldown > 0 || !char?.pos) return false
  const onCap = isOnTrampolineCap(inst, char, state)
  if (!wantsTrampolineCapLaunch(inst, char, onCap, state)) return false
  if ((char.vel?.y ?? 0) < -40) return false
  launchHeroFromPitCaveMushroom(inst)
  state.cooldown = TRAMP_COOLDOWN
  state.squash = TRAMP_SQUASH_MAX
  inst.pitCaveTrampBounceAir = true
  return true
}
function forestPitCaveExitX(inst) {
  const cfg = inst.treeFruitAnchorCfg
  if (cfg) return computeForestAnchorFruitDropX(cfg)
  const trunkX = inst.treeX ?? TREE_X
  const trunkHalf = inst.trunkExcludeHalf ?? TRUNK_EXCLUDE_HALF
  const branchTrampX = inst.branchTrampX ?? trunkX + trunkHalf + BRANCH_TRAMP_OFFSET_X
  return computeForestAnchorFruitDropX({
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
  const exitX = forestPitCaveExitX(inst)
  moveForestHeroTo(char, exitX, FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED)
  char.vel.x = 0
  char.hidden = false
  inst._inForestPitCave = false
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
  snapForestCameraToHero(inst.k, inst.heroInst)
  updateForestCamera(inst)
  inst.sound && !inst.sound._forestSfxMuted && Sound.playJumpSound(inst.sound)
  applyZoneVisibility(inst)
  syncForestAtmosphereZones(inst)
}
//
// Forest runs on its own native-resolution engine, so the real window size is
// only known once that engine is booted — refreshes SCREEN_W/SCREEN_H and the
// handful of values that legitimately track the live window (camera viewport
// width, vertical letterbox padding on a taller-than-design window, and the
// screen-space HUD/chrome Y's that ride on that padding) right at scene
// start, before any layout math runs. Every element's own world position
// (TREE_X and everything derived from it) stays pinned to the fixed design
// resolution instead — see the Layout comment near TOP_MARGIN/SCREEN_W above.
//
function recomputeForestScreenLayout(k) {
  SCREEN_W = k.width()
  SCREEN_H = k.height()
  VIEW_W = SCREEN_W - LEFT_MARGIN - RIGHT_MARGIN
  VOID_PAD_Y = Math.max(0, Math.round((SCREEN_H - DESIGN_SCREEN_H) / 2))
  PLAYFIELD_TOP_Y = VOID_PAD_Y
  PLAYFIELD_BOTTOM_Y = VOID_PAD_Y + DESIGN_SCREEN_H - BOTTOM_MARGIN
  FOREST_HUD_FPS_TOP_Y = 55 + VOID_PAD_Y
  FOREST_HUD_LABEL_TOP_Y = FOREST_HUD_FPS_TOP_Y - FOREST_HUD_LABEL_BAKED_HALF_H
  updatePlayfieldCornerPositions()
}
