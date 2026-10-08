import { CFG } from '../../../cfg.js'
import * as Hero from '../../../components/hero.js'
import { set, get, setSectionCompleted } from '../../../utils/progress.js'
import * as Sound from '../../../utils/sound.js'
import { initTouchInput } from '../../../utils/touch-input.js'
import * as TouchControls from '../../../utils/touch-controls.js'
import { goToMenuAfterAssets } from '../../../utils/lesson-assets.js'
import { registerGlowNativeTeardown } from '../../../utils/engine-switch.js'
import { eyeHudSpriteIsDesat } from '../../../utils/eye-hud.js'
import { yieldForGpu, setLoaderBarPct, setLoaderBarCreepBoost } from '../../../utils/boot-loader.js'
import { MENU_BG_FRONT_LEAF_RGB } from '../../../utils/menu-bg-generator.js'
import { createLevelTransition } from '../../../utils/transition.js'
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
import * as SwampSpirit from '../components/swamp-spirit.js'
import { toCanvas, getRGB, createCanvasAtlasBuilder, bindBackToMenuKeys, bindStartGameKeys, onPhysicalKeyPress, releaseGamePhysicalKeys, isAnyKeyDown } from '../../../utils/helper.js'
import {
  buildGlowTree,
  renderGlowTreeToCanvas,
  renderGlowTreeIntoContext,
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
  glowCaveEarthDeepRgb,
  glowCaveEarthFloorRgb,
  glowPreludeBackdropRgb,
  glowGroundEarthBottomLayerRgb,
  glowRgb,
  glowRockShadedDrawPalette,
  glowContourRgb,
  snapToPalette,
  getTreePaletteGray,
  getTreePaletteLit,
  getTreePaletteFlatDecor,
  getTreePaletteFlatDecorRootsVisible,
  getCuteMushroomFlatDecorColors,
  getCuteMushroomFlatWaterColors,
  getTreePaletteColor,
  getTreePaletteColorForCorner,
  getTreePaletteParallaxCorner,
  buildDimmedTreePalette,
  getTreePaletteSolid,
  getGlowLightRgb,
  isGlowGrayExploreBeforeL
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
import * as HeroCounter from '../../../utils/hero-counter.js'
import * as FpsCounter from '../../../utils/fps-counter.js'
import { generateLogDetail, drawLogPlatform, bakeLogPlatformCanvas, packLogPlatformAtlas } from '../../touch/utils/log-platform.js'
import { ensurePitCaveSkeletonLayout } from '../utils/glow-cave-skeleton.js'
import {
  createGlowMidges,
  updateGlowMidges,
  syncGlowMidgesZones,
  createGlowPit,
  updateGlowPit,
  drawGlowPit,
  drawGlowPitBareCave,
  drawGlowPitCaveSkeletonScene,
  drawGlowPitCaveForegroundDecor,
  drawGlowPitCaveSeamCoverRocks,
  drawGlowPitCaveMushroom,
  drawGlowPitEyeIntroInterior,
  shouldShowPitCaveSkeleton,
  isHeroOnPitCaveFloor,
  setGlowPitCracksVisible,
  isCrackGrassExcluded,
  isCrackDecorExcluded,
  getCrackZone,
  KEY_PIT_COLLAPSED,
  ensureGlowPitOpenForEyesCollected,
  ensureGlowPitCollapsedOnReload,
  restoreGlowPitEyeIntroInterior,
  getGlowPitHeroStandY,
  getGlowPitEarthBandMouthCutoutForPit,
  isGlowOpenPitMouthWorldX,
  getGlowPitFloorCollider,
  getGlowCaveMouthFloorLeftX,
  shouldGlowPitBeOpenForZones,
  glowHeroHasCollectedEyes,
  invalidateGlowPitCaveInteriorBake
} from '../utils/glow-atmosphere.js'
import {
  initGlowTeacherHintState,
  showGlowTeacherHintNow,
  tickGlowTeacherContextHints,
  onGlowTeacherLifeHudRevealed,
  glowTeacherHudAnchor,
  GLOW_TEACHER_HINT_MOVE_SEC,
  GLOW_TEACHER_HINT_DURATION
} from '../utils/glow-teacher-hint.js'
import {
  syncSwampSpiritProximityHint,
  destroySwampSpiritProximityHint
} from '../utils/swamp-spirit-proximity-hint.js'
import * as ChainEyeTramp from '../utils/glow-chain-eye-trampoline.js'
import {
  KEY_EYES_COLLECTED,
  createGlowEyeIntroState,
  initGlowHeroWithoutEyes,
  isGlowEyeIntroPending,
  isGlowEyesGameplayUnlocked,
  isGlowPitMushroomUnlocked,
  isGlowEyeIntroBareWorld,
  shouldGlowSuppressFootDetails,
  shouldGlowBlockWorldReveal,
  isGlowEyeIntroCaveActive,
  syncGlowEyeIntroMidges,
  onUpdateGlowEyeIntro,
  updateGlowCaveFloorEyeReveal,
  onDrawGlowEyeIntro,
  drawGlowCavePickupEyesOnPitLayer,
  unlockGlowEyesGameplayFromBranchLaunch,
  snapGlowHeroToPitFloor,
  restoreGlowEyeIntroFromPersistedState
} from '../utils/glow-eye-intro.js'
import {
  markGlowHudGCaveEntered,
  markGlowHudGPitMushLaunch,
  countGlowHudGCaveIntroParts,
  KEY_HUD_G_CAVE_ENTERED,
  KEY_HUD_G_PIT_MUSH_LAUNCH
} from '../utils/glow-hud-g-progress.js'
import {
  getGlowHeroFillProgress,
  GLOW_HERO_FILL_G,
  GLOW_HERO_FILL_L,
  syncGlowHeroFillVisual,
  updateGlowHeroFillBurst,
  updateGlowHeroWitnessGlow,
  drawGlowHeroFillBurst,
  drawGlowHeroWitnessGlow,
  setGlowHeroWitnessGlow,
  clearGlowHeroFillPreview,
  triggerGlowHeroFillBurst,
  resolveGlowHeroFilledSpriteKey,
  applyGlowHeroEyesOpenedBake,
  commitGlowHeroBodyFill
} from '../utils/glow-hero-fill.js'
import * as GlowFootParticles from '../utils/glow-foot-particles.js'
import * as ChainBuoy from '../utils/glow-chain-buoy.js'
import * as EarTree from '../utils/glow-ear-tree.js'
import * as GlowCamera from '../utils/glow-camera.js'
import {
  applyParallaxPostFxToContext,
  applyGlowLayerGradeToCanvas,
  drawGlowHiResFoliageCluster,
  GLOW_LAYER_GRADE
} from '../utils/glow-parallax-grain.js'
import { finishGlowLifeDesatCanvas } from '../utils/glow-ui-bake.js'
import {
  measureCanvasContentBounds,
  cropCanvasToBounds,
  releaseCanvas
} from '../utils/glow-canvas-crop.js'
import {
  bakeGlowTooltipCanvas,
  glowUiHash,
  createGlowBakedTextHolder,
  syncGlowBakedTextHolder,
  destroyGlowBakedTextHolder
} from '../utils/glow-ui-bake.js'
//
// Palette-derived tones — every colour comes from CFG.visual.colors.palette.
//
const VOID = glowRgb('void')
const PRELUDE_BACKDROP = glowPreludeBackdropRgb()
const GLOW_SHADOW = glowRgb('glowShadow')
const OUTER = glowRgb('playfieldOuter')
const INNER_GRAY = glowRgb('playfieldGray')
const MID_GRAY = glowRgb('midGray')
const LIGHT_GRAY = glowRgb('lightGray')
const DECOR_GRAY = glowRgb('decorGray')
//
// Warm orange grass — same half-brightness front-row foliage tone as menu.js
//
const GRASS_GREEN = glowRgb(GLOW_PAL.treeColor.leafShades[0])
//
// Yellow-brown foreground grass from L onward (same straw as the G peek band).
//
const GRASS_WARM = glowRgb(GLOW_PAL.gold)
const GRASS_STRAW_LIGHT = glowRgb('glowLightBright')
const GRASS_STRAW_MID = glowRgb('gold')
const GRASS_STRAW_DARK = glowRgb('groundChernozem')
//
// Shifts blades toward a deeper autumn tone on top of the per-blade straw tint.
//
const GLOW_GRASS_HUE_VARY_MAX = 1
const GLOW_GRASS_HUE_VARY_SKEW = 1
const GRASS_WARM_BLADE_SKEW = 1.55
const WATER_COLOR = glowRgb('water')
const GLOW_GOLD_HEX = GLOW_PAL.gold
//
// Colour-world backdrop split: sky above the ground line, dark earth below.
//
const GROUND_DARK = glowRgb('groundDark')
//
// Wet mud patch fill under the mud zone's tall grass — visible year-round
// (gray and colour mode alike), a distinct darker/warmer tone than plain
// groundDark so the soft-mud band reads as its own surface, not just taller
// grass over the same ground everywhere else.
//
const MUD_GROUND_RGB = glowRgb('mudGround')
//
// Extra wave height blended into the mud zone's stretch of the ground-line
// wave (see drawGlowMudZoneGroundLine) so mud reads taller than plain ground.
//
const MUD_GROUND_EXTRA_H = 6
//
// Cool forest air — parallax trees fade into teal/green sky, not gold (70/20/10).
//
const PARALLAX_FOLIAGE_HAZE = glowRgb(GLOW_PAL.glowForestLift)
const GLOW_LIGHT_CORE = getGlowLightRgb('core')
const GLOW_LIGHT_BRIGHT = getGlowLightRgb('bright')
//
// Forest contour ink for trees, mushrooms, rocks, letters (not pure black).
//
const DECOR_OUTLINE_RGB = glowContourRgb('forest')
const PLATFORM_OUTLINE_RGB = glowContourRgb('platform')
//
// Cap colour families for the cute decor mushrooms (palette hex sets): the
// cap tone, its dark counterpart (shading) and a lighter highlight tone.
//
const MUSHROOM_CAP_HEX = GLOW_PAL.mushrooms
const MUSHROOM_CAP_SHADOW_HEX = GLOW_PAL.mushroomsDark
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
//
// Both colour variants are baked once at scene setup (see
// loadPlayfieldCornerSprites) and kept loaded for the whole level, so the
// void <-> outer-frame switch (e.g. on L collection) only ever swaps which
// already-resident sprite a corner object uses — reloading a sprite here
// instead would leave the old-colour mask on screen for a stray frame while
// the backdrop already switched, flashing a visibly mismatched corner.
//
const CORNER_SPRITE_VOID = 'glow0-corner-mask-void'
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
const TREE_FLAT_SPRITE_NAME = 'glow0-tree-flat-v5'
const TREE_FLAT_ROOTS_SPRITE_NAME = 'glow0-tree-flat-roots-v5'
const TREE_LIT_SPRITE_NAME = 'glow0-tree-lit-v5'
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
//
// Mud band east of the branch trampoline — predator anchor layout.
//
const MUD_ZONE_BRANCH_TRIGGER_GAP = 170
const MUD_ZONE_PREDATOR_POP_LEAD = 70
const MUD_ZONE_PREDATOR_DANGER_MARGIN = 40
//
// Soft muddy ground band in flat gray explore mode. Jump is lower than
// normal with a snappy takeoff (no low-gravity hang). Footsteps sound wet;
// foot bursts are off.
//
const MUD_BRANCH_TRAMP_GAP = 42
const MUD_ZONE_RIGHT_EXTENT = 170
const MUD_ZONE_CREATURE_MARGIN = 14
const MUD_MAX_DEPTH = 42
const MUD_MOVE_SPEED_MULT = 0.5
const MUD_JUMP_FORCE_MULT = 0.68
const MUD_GRAVITY_MULT = 1
const MUD_JUMP_SQUASH_TIME_MULT = 1
//
// Letter-caption world freeze: birds + proximity ambient fade duration (sec).
//
const GLOW_DIALOG_AUDIO_FADE_SEC = 0.55
const GLOW_CHAIN_BUOY_Z = CFG.visual.zIndex.player - 1
const GLOW_EAR_TREE_Z = CFG.visual.zIndex.player - 1
//
// Horizontal band for crediting a jump over the mud predator (HUD L step 1).
//
const MUD_PREDATOR_JUMP_CLEARANCE_X = 52
//
// Hero must clear this far past the predator anchor X before the L HUD step credits.
//
const MUD_PREDATOR_JUMP_PASS_MARGIN = 36
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
// Wooden spikes hide under a patch of grass at the far edge of the L-log
// platform. Falling onto them from above is fatal — they blink once at the
// moment of contact, then the hero shatters into leaves like any other
// touch-death burst.
//
const RIGHT_SPIKE_COUNT = 5
const RIGHT_SPIKE_ZONE_W = 60
const RIGHT_SPIKE_EDGE_GAP = 0
const RIGHT_SPIKE_H = 22
const RIGHT_SPIKE_BLINK_DURATION = 0.8
const RIGHT_SPIKE_GRASS_TUFT_COUNT = 8
//
// Tall enough blades to hide spike tips; still slightly varied via grass.js scale.
//
const RIGHT_SPIKE_GRASS_SCALE_MULT = 1.02
//
// Right silhouette tip of the L log (halfW + endR*sq semicircle — drawLOutlineLogPlatform).
//
const RIGHT_SPIKE_GRASS_LOG_TIP_INSET = 2
//
// Touching the predator or falling on the spikes is fatal — same
// disintegration flow as any other level's death, then in-level respawn.
//
const GLOW_TOUCH_DEATH_PARTICLE_COUNT = 34
//
// One new line per spike death, then the list repeats.
//
const RIGHT_SPIKE_DEATH_HINT_TEXTS = [
  'Life is a complicated thing.\nNext time, be careful.',
  "And here's 'next time'.",
  'The log grew teeth.\nYou offered a foot.',
  'Spikes do not negotiate.',
  'Same wood. Same lesson.\nSharper this time.',
  'Gravity is loyal.\nThe spikes are too.',
  'You can see them now.\nThat was the easy part.',
  'Careful is a direction.\nYou picked the other one.'
]
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
const GLOW_TOUCH_DEATH_HINT_RAISE = 96
const GLOW_TOUCH_HINT_BUBBLE_OFFSET_Y = -58
//
// Low crawler — anchor the bubble just above the body, not hero-height.
//
const PREDATOR_DEATH_HINT_RAISE = 28
const PREDATOR_DEATH_HINT_OFFSET_Y = -36
const GLOW_TOUCH_DEATH_HINT_DURATION = 5
const HERO_TOUCH_DEATH_RESPAWN_SIDE_OFFSET = 80
const GLOW_TOUCH_DEATH_RESPAWN_DELAY = 2.48
//
// In-level respawn after a predator kill — farther than a generic side step so
// the hero does not land back inside the body on reload.
//
const HERO_PREDATOR_RESPAWN_PUSH =
  HERO_TOUCH_DEATH_RESPAWN_SIDE_OFFSET + HERO_TOUCH_DEATH_RESPAWN_CLEARANCE + GLOW_HERO_HITBOX_HALF_W
//
// How fast the post-L world wakes up (grass sway, predator patrol, birds,
// mushroom whistle-lean) once the O-meditation countdown starts, and how
// quickly it freezes again when the hero breaks stillness.
//
const MEDITATION_WORLD_SLEEP_SPEED = 3.2
//
// Rock rim — green-brown shadow tone (not neutral gray).
//
const ROCK_OUTLINE_RGB = DECOR_OUTLINE_RGB
const ROCK_OUTLINE_WIDTH = 2.5
//
//
// Parallax background — sky baked into the far row plus 2 forest planes (each
// scrolling at its own speed), then a static ground/underground strip at
// world speed 1.0. A depth row's bushes share their trees' canvas: same
// scroll speed, same horizontal bleed, and the bush strip sits entirely
// inside the tree row's world-Y crop, so one sprite covers both and the
// row costs a single draw call per frame instead of two.
//
const BG_PAR_TREE3_GRAY = 'glow0-bg-par-tree3-gray'
const BG_PAR_TREE3_COLOR = 'glow0-bg-par-tree3-color'
const BG_PAR_TREE2_GRAY = 'glow0-bg-par-tree2-gray'
const BG_PAR_TREE2_COLOR = 'glow0-bg-par-tree2-color'
const BG_PAR_TREE1_GRAY = 'glow0-bg-par-tree1-gray'
const BG_PAR_TREE1_COLOR = 'glow0-bg-par-tree1-color'
const BG_STATIC_GRAY = 'glow0-bg-static-gray-v2'
const BG_STATIC_COLOR = 'glow0-bg-static-color'
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
// Soft sky-coloured veils between forest rows — atmospheric perspective
// without inventing new tones (opacity only).
//
const HAZE_FAR_OPACITY = 0.055
const HAZE_MID_OPACITY = 0.028
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
// L-letter log collision top sits 2 px higher than other letter logs.
//
const L_PLAT_COLLISION_DROP_Y = LOG_COLLISION_DROP_Y - 2
//
// Letter-log platforms mirror the main tree wood: warm sand tones in the lit
// gray world (after L) and the tree's browns once the world gains colour.
//
const LOG_TREE_LIT_COLORS = {
  bark: GLOW_PAL.treeLit.branch,
  barkLight: GLOW_PAL.treeLit.trunk,
  barkDark: GLOW_PAL.treeLit.root,
  ring: GLOW_PAL.treeLit.trunk,
  ringDark: GLOW_PAL.glowContour.platform,
  core: GLOW_PAL.treeLit.branch,
  shadow: GLOW_PAL.void
}
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
const L_PLAT_OUTLINE_WIDTH = 3
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
// area is shorter.
//
const O_PLAT_OFFSET_X = 130 + LOG_W / 2
const O_PLAT_OFFSET_Y = 105
//
// The O letter floats above its log — subtracted from default on-log placement.
//
const O_LETTER_RAISE_Y = 13
//
// The L letter floats 13 px higher above its log than the default placement.
//
const L_LETTER_RAISE_Y = 17
//
// World L pickup — white on the log; HUD L uses decorGray until collected (like O/W).
//
const L_LETTER_FILL_HEX = CFG.visual.colors.hero.eyeWhite
const G_LETTER_RAISE_Y = 36
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
const PAR_LEAF_BAND_H_FAR = 118
const PAR_LEAF_TIER_OVERLAP = 24
const PAR_NEAR_BAND_TOP = PAR_LEAF_SKY_FLOOR_Y
const PAR_NEAR_BAND_BOTTOM = PAR_NEAR_BAND_TOP + PAR_LEAF_BAND_H_NEAR
const PAR_MID_BAND_TOP = PAR_NEAR_BAND_BOTTOM - PAR_LEAF_TIER_OVERLAP
const PAR_MID_BAND_BOTTOM = PAR_MID_BAND_TOP + PAR_LEAF_BAND_H_MID
const PAR_FAR_BAND_TOP = PAR_MID_BAND_BOTTOM - PAR_LEAF_TIER_OVERLAP
const PAR_FAR_BAND_BOTTOM = PAR_FAR_BAND_TOP + PAR_LEAF_BAND_H_FAR
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
// row (leaf swatch per mound centre X). The gray world keeps every bush gray.
//
// Bush heights run OPPOSITE to the tree rows: the near (1st) strip is the
// lowest, each deeper strip is taller — three readable ground-level tiers.
//
const BUSH_NEAR_HEIGHT_SCALE = 0.78
const BUSH_FAR_HEIGHT_SCALE = 1.18
const BUSH_FARTHEST_HEIGHT_SCALE = 1.55
const PAR_FARTHEST_BAND_TOP = PAR_FAR_BAND_TOP
//
// Hard foliage floor: no background leaf (branch cluster or band leaf) may
// ever paint below this line — the horizontal middle band of the screen
// stays trunk-only in every row and every mode.
//
const PAR_LEAF_MAX_Y = PAR_FAR_BAND_BOTTOM + 8
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
  gray: BG_PAR_TREE3_GRAY,
  color: BG_PAR_TREE3_COLOR,
  speed: PAR_SKY_SPEED,
  bleed: PAR_TREE_HORIZ_BLEED,
  worldY: PAR_SKY_WORLD_Y,
  worldH: PAR_SKY_WORLD_H
}
const PAR_LAYER_MID = {
  gray: BG_PAR_TREE2_GRAY,
  color: BG_PAR_TREE2_COLOR,
  speed: PAR_TREE2_SPEED,
  bleed: PAR_TREE_HORIZ_BLEED,
  worldY: parTreeRowWorldY(PAR_MID_BAND_TOP),
  worldH: parTreeRowWorldH(PAR_MID_BAND_TOP)
}
const PAR_LAYER_NEAR = {
  gray: BG_PAR_TREE1_GRAY,
  color: BG_PAR_TREE1_COLOR,
  speed: PAR_TREE1_SPEED,
  bleed: PAR_TREE_HORIZ_BLEED,
  worldY: parTreeRowWorldY(PAR_BIG_BAND_TOP),
  worldH: parTreeRowWorldH(PAR_BIG_BAND_TOP)
}
//
// Minimum opacity before skipping a crossfade layer (avoids pops, not steps).
//
const COLOR_CROSSFADE_EPS = 0.001
//
// Underground decor in the root zone: buried rocks, cracks, pebble clusters,
// hanging rootlets, a fossil spiral and one buried skeleton (no burrows or
// holes). Baked once per mode (gray backdrop / dark colour-world earth).
//
const UNDERGROUND_GRAY_SPRITE = 'glow0-underground-gray-v4'
const UNDERGROUND_POST_L_BROWN_SPRITE = 'glow0-underground-postl-brown-v1'
const UNDERGROUND_COLOR_SPRITE = 'glow0-underground-color'
const UG_TOP_PAD = 30
const UG_BOTTOM_PAD = 2
const UG_ROCK_COUNT = 6
const UG_CRACK_COUNT = 9
const UG_PEBBLE_CLUSTER_COUNT = 6
const UG_ROOTLET_COUNT = 10
const UG_SHELL_COUNT = 5
const UG_BONE_COUNT = 3
const UG_COIN_COUNT = 4
const UG_BOTTLE_COUNT = 2
const UG_WORM_COUNT = 4
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
const GLOW_HUD_G_FILL_PARTS = 8
const GLOW_HUD_L_FILL_PARTS = 5
const GLOW_HUD_O_FILL_PARTS = 5
//
// W loader: one segment per right-trampoline bounce after O (10 total).
//
const GLOW_HUD_W_FILL_PARTS = 10
const GLOW_HUD_LABEL_FONT = CFG.visual.fonts.thinFull.replace(/'/g, '')
//
// Baked GLOW letters use the same canvas metrics as lesson-indicator's
// bakeHudLetterCanvas (fontSize * 1.2 + pad * 2 tall).
//
const GLOW_HUD_LABEL_CANVAS_PAD = 4
const GLOW_HUD_LABEL_BAKED_HALF_H =
  (GLOW_HUD_LABEL_FONT_SIZE * 1.2 + GLOW_HUD_LABEL_CANVAS_PAD * 2) / 2
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
let GLOW_HUD_LABEL_TOP_Y = GLOW_HUD_FPS_TOP_Y - GLOW_HUD_LABEL_BAKED_HALF_H
const GLOW_HUD_FPS_SLOT_GAP = 24
//
// Neutral HUD grey after the world colours — palette gray5.
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
// Blinking letters — value 6 fill (or gold for G), value 1 offset-outline.
//
const GLOW_LETTER_FONT = 'JetBrains Mono'
//
// World pickup letters use the same metrics as the inline pickup caption.
//
const GLOW_LETTER_SIZE = 46
const GLOW_LETTER_CAPTION_FONT_SIZE = 46
//
// Pure black drop shadow behind pickup letters in the colour world.
//
const GLOW_LETTER_SHADOW_R = 0
const GLOW_LETTER_SHADOW_G = 0
const GLOW_LETTER_SHADOW_B = 0
const GLOW_LETTER_TILT = 12
const GLOW_LETTER_PICKUP_RADIUS = 52
//
// Hero body / outline tones for lesson-glow.0 — lighter than the shared
// heroOutline (menu.js still uses that one directly for its own hero).
//
const HERO_OUTLINE_COLOR = GLOW_PAL.glowContour.gameplay
const HERO_BODY_COLOR = GLOW_PAL.heroBodyGray
const HERO_HOLLOW_OUTLINE_COLOR = HERO_BODY_COLOR
//
// Collected GLOW HUD glyphs — pure white, not hero gray or gold loaders.
//
const GLOW_HUD_COLLECTED_LETTER_HEX = CFG.visual.colors.hero.eyeWhite
//
// Life HUD eye pupil before L — dark gray so it reads with the gray world.
//
const GLOW_HUD_EYE_PUPIL_PRE_L_RGB = glowRgb(GLOW_PAL.dialogFill)
//
// Filled glow hero body after the post-L colour reveal — white inside, dark rim.
//
const HERO_FILLED_BODY_COLOR = String(CFG.visual.colors.hero.eyeWhite).replace('#', '')
const HERO_FILLED_OUTLINE_COLOR = CFG.visual.colors.outline
//
// Hollow glow eyes: outline ring + matching pupil, clear socket.
// Filled glow eyes: white sclera + black pupils (standard hero bake).
//
function getGlowHeroEyeBakeColors(outlineOnly) {
  if (outlineOnly) {
    return {
      pupilColor: HERO_HOLLOW_OUTLINE_COLOR,
      transparentEyeInterior: true
    }
  }
  return {
    eyeWhiteColor: CFG.visual.colors.hero.eyeWhite,
    pupilColor: CFG.visual.colors.hero.eyePupil,
    transparentEyeInterior: false
  }
}
//
// Zone persistence keys (glow.* prefix).
//
const KEY_COLLECTED_G = 'glow.collectedG'
const KEY_G_UNDERGROUND_LIVE = 'glow.gUndergroundLive'
const KEY_COLLECTED_L = 'glow.collectedL'
const KEY_COLLECTED_O = 'glow.collectedO'
const KEY_COLLECTED_W = 'glow.collectedW'
const KEY_REVEALED_TREE = 'glow.revealedTree'
const KEY_REVEALED_OUTER_FRAME = 'glow.revealedOuterFrame'
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
const L_PLAT_RAISE_Y = 58
const GLOW_CHAIN_TRAMP_EYE_STEP_X = 108
const GLOW_CHAIN_TRAMP_LEFT_EYE_EXTRA_LEFT = 40
const GLOW_CHAIN_TRAMP_MUSH_STEP_X = 168
const GLOW_CHAIN_TRAMP_PAIR_SHIFT_LEFT = 72
const GLOW_CHAIN_TRAMP_SEGMENT_LEN = 26
const GLOW_CHAIN_TRAMP_MIDDLE_SEGMENTS = 6
const GLOW_CHAIN_TRAMP_LEFT_SEGMENTS = 11
const GLOW_CHAIN_TRAMP_WEST_MARGIN = 64
const GLOW_CHAIN_TRAMP_SWAY_AMP = 0.11
const GLOW_CHAIN_TRAMP_SWAY_SPEED = 1.1
const GLOW_CHAIN_TRAMP_SWAY_LAG = 0.55
const L_PLAT_ABOVE_LEFT_CHAIN_EYE = 108
const L_PLAT_LEFT_OF_LEFT_CHAIN_EYE_GAP = 36
const KEY_CHAIN_MIDDLE_EYE_STEPPED = 'glow.chainMiddleEyeStepped'
const KEY_CHAIN_LEFT_EYE_STEPPED = 'glow.chainLeftEyeStepped'
const KEY_REVEALED_GROUND_DECOR = 'glow.revealedGroundDecor'
const KEY_REVEALED_GROUND_DECOR_RIGHT = 'glow.revealedGroundDecorRight'
const KEY_REVEALED_GROUND_DECOR_LEFT = 'glow.revealedGroundDecorLeft'
const KEY_REVEALED_GROUND_BG = 'glow.revealedGroundBg'
const KEY_TREE_SEGMENTS_REVEALED = 'glow.treeSegmentsRevealed'
const KEY_GROUND_RIGHT_STRIP_MAX = 'glow.groundRightStripMax'
const KEY_LEFT_SHORE_ROCK = 'glow.leftShoreRock'
const KEY_RIGHT_TRAMP_REVEALED = 'glow.rightTrampRevealed'
//
// Right mushroom cap collider / bounce — only after a second landing on the spot.
//
const KEY_RIGHT_TRAMP_BOUNCE_LIVE = 'glow.rightTrampBounceLive'
const KEY_BRANCH_TRAMP_BOUNCE_LIVE = 'glow.branchTrampBounceLive'
const KEY_L_PLAT_STEPPED = 'glow.lPlatStepped'
const KEY_MUD_PREDATOR_JUMPED_OVER = 'glow.mudPredatorJumpedOver'
const KEY_MUD_PREDATOR_JUMPED_OVER_LEGACY = 'glow.leftHedgehogJumpedOver'
const KEY_HUD_G_FILL = 'glow.hudGFillParts'
const KEY_HUD_L_FILL = 'glow.hudLFillParts'
const KEY_HUD_L_TRAMP_JUMPED = 'glow.hudLTrampJumped'
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
const KEY_LIFE_SHOWN = 'glow.lifeShown'
const KEY_DROWN_HINT_SHOWN = 'glow.drownHintShown'
const KEY_INTRO_SHOWN = 'glow.introShown'
const KEY_CAMERA_INTRO_DONE = 'glow.cameraIntroDone'
const KEY_RESPAWN_NEAR_TREE = 'glow.respawnNearTree'
const KEY_LAST_SPAWN_MODE = 'glow.lastSpawnMode'
const KEY_LAST_SPAWN_X = 'glow.lastSpawnX'
const KEY_LAST_SPAWN_Y = 'glow.lastSpawnY'
const KEY_BRANCH_TRAMP_REVEALED = 'glow.branchTrampRevealed'
const BRANCH_TRAMP_MARIO_HINT_TEXT = 'I\'m not an ordinary\nmushroom'
const BRANCH_TRAMP_MARIO_HINT_DURATION = 6
const BRANCH_TRAMP_MARIO_HINT_INITIAL_DELAY = 10
const BRANCH_TRAMP_MARIO_HINT_REPEAT = 20
const TRAMP_SHALLOW_HINT_TEXT = 'I can\'t drown.\nWho made this lake so shallow?!'
const TRAMP_SHALLOW_HINT_DURATION = 6
const HERO_DEATH_RESPAWN_PAST_BRANCH_TRAMP_X = 88
const HERO_SPAWN_FADE_DURATION = 0.75
//
// Seconds of idle on the ground after L before the O countdown starts.
//
const MEDITATION_IDLE_BEFORE_COUNTDOWN = 10
const PIT_CAVE_HINT_TEXT = 'Maybe you want to\nstep on a mushroom?'
const GLOW_TEACHER_HINT_G_PART_TEXT = 'Open the next zone.\nIt\'s nearby.'
const GLOW_TEACHER_HINT_G_NEED_CAVE_TEXT = 'That cave mouth\nfeels important.'
const GLOW_TEACHER_HINT_G_NEED_PIT_MUSH_TEXT = 'Maybe step on a\nmushroom down there?'
const GLOW_TEACHER_HINT_G_SWIM_TEXT = 'You might want\nto go swimming.'
const GLOW_TEACHER_HINT_G_RIGHT_STRIP_TEXT = 'Keep walking.\nSomething\'s farther right.'
const GLOW_TEACHER_HINT_G_BRANCH_TRAMP_TEXT = 'There\'s another mushroom\non that branch.'
const GLOW_TEACHER_HINT_G_CLIMB_TREE_TEXT = 'Why not climb\nonto the tree?'
const GLOW_TEACHER_HINT_L_PLAT_TEXT = 'That platform isn\'t there\nfor nothing ;)'
const GLOW_TEACHER_HINT_L_STALL_MAX_SHOWS = 2
//
// Feet may rise above the mouth lip while jumping inside the collapsed pit.
//
const PIT_CAVE_AIR_ABOVE_LIP = 148
const DROWN_RESPAWN_LAKE_CLEARANCE = 56
const O_LETTER_STUCK_HINT_DELAY = 90
const L_LETTER_PEEK_TRAVEL = 0.45
const L_LETTER_PEEK_HOLD = 1
const L_LETTER_PEEK_RETURN = 0.45
//
// Intro rain ambience volume (same quiet bed as touch lesson 0)
//
//
// Dialog.
//
const GLOW_DIALOG_G = '[hl]G[/hl]round'
const GLOW_DIALOG_L = '[hl]L[/hl]ook'
const GLOW_DIALOG_O = '[hl]O[/hl]bserve'
const GLOW_INLINE_WORD_CAPTION_LETTERS = new Set(['G', 'L', 'O'])
const GLOW_BIRDS_AUDIO_SRC = './sounds/birds.mp3'
const GLOW_BIRDS_PLAYBACK_RATE = 1
let glowBirdsLoopHandle = null
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
const GLOW_LETTER_CAPTION_OUTLINE_PAD_MONO = 2.4
const GLOW_LETTER_CAPTION_OUTLINE_OFFSETS = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1]
]
const GLOW_LETTER_CAPTION_FADE_IN = 0.4
const GLOW_LETTER_CAPTION_FADE_OUT = 0.7
const GLOW_INLINE_WORD_CAPTION_SUFFIX_CHAR_STAGGER_SEC = 0.07
const GLOW_INLINE_WORD_CAPTION_CRUMBLE_SEC = 0.9
const GLOW_INLINE_WORD_CAPTION_CRUMBLE_PARTICLE_COUNT = 104
const GLOW_LETTER_CAPTION_DURATION_G = 6
const GLOW_LETTER_CAPTION_DURATION_L = 6
const GLOW_LETTER_CAPTION_DURATION_O = 6
const GLOW_LETTER_CAPTION_Z = CFG.visual.zIndex.player + 20
//
// Speech-bubble hints: two intro lines at spawn (the G letter appears only
// after both finish and all three gray zones were explored), one-shot lines
// when the right ground / water zones first open, and a consolation line on
// the first drowning.
//
const HINT_INTRO_1_TEXT = 'Hello, I\'m Yan. I found myself\nin a world I cannot fully see.\nTo understand where I am, I\nneed to learn to see it.'
const HINT_INTRO_1_DURATION = 16
const HINT_INTRO_2_TEXT = '\'awd, ←, →, ↑, space & mouse\'\nto move, jump & interact\nwith the world.'
const HINT_INTRO_2_DURATION = 18
//
// Extra beat between the first and second intro speech bubbles.
//
const HINT_INTRO_2_PAUSE = 1.5
const INTRO_HINT_PHASE_ONE = 'one'
const INTRO_HINT_PHASE_PAUSE = 'pause'
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
const HERO_CONFIDENT_HINT_DURATION = 4
//
// Self-growth lines on the hero after each letter fill step (less transparent body).
//
const GLOW_CONFIDENCE_HINT_G = 'I have weight.\nI stand.'
const GLOW_CONFIDENCE_HINT_L = 'Now I feel more\nfulfilled inside.'
const GLOW_CONFIDENCE_HINT_W = 'I\'m a Witness now. What I see is mine —\neven if no one wants to hear it.'
const GLOW_CONFIDENCE_HINT_O = 'Now I feel more alive\nin every color.'
const GLOW_HERO_FILL_L_EPS = 0.02
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
// Baked static-ground band: flat earth sits on FLOOR_Y; underground detail
// (rootlets, skeleton) starts slightly below — mask uses this offset.
//
const UNDERGROUND_DETAIL_MASK_Y = 10
//
// After L the gray ground decor (mushrooms, grass, water, rocks) also
// darkens toward void; the effect fades away with the colour-world fade.
//
const L_DECOR_DARKEN = 0.22
//
// O-letter meditation: after L, the hero must stand still for
// MEDITATION_IDLE_BEFORE_COUNTDOWN seconds, then the heartbeat countdown runs.
// Movement cancels the countdown and resets the idle wait.
//
const MEDITATION_IDLE_BASE = MEDITATION_IDLE_BEFORE_COUNTDOWN
const MEDITATION_COUNTDOWN = 5
//
// Keep in sync with the second thump delay in Sound.playHeartbeatSound().
//
const MEDITATION_HEARTBEAT_SECOND_BEAT_S = 0.2
const MEDITATION_TIMER_FONT = 22
const GLOW_HERO_COUNTER_Y_OFFSET = -44
//
// Hero hover — only the eyeless beat; nudges live on the life-icon teacher.
//
const HERO_TOOLTIP_EYELESS_TEXT = "I can't see anything"
const HERO_TOOLTIP_Y_OFFSET = -72
//
// Teacher (life HUD) hints — indirect nudges, not orders.
//
const GLOW_TEACHER_HINT_G_STALL_MAX_SHOWS = 2
const GLOW_TEACHER_HINT_POST_G_CUCUMBER = 'A timid little beast\nhides in the reeds.'
const GLOW_TEACHER_HINT_POST_G_CUCUMBER_MAX_SHOWS = 2
const GLOW_TEACHER_HINT_AFTER_L = 'Don\'t rush. Just\nstop and think...'
const GLOW_TEACHER_HINT_POST_L_STOP_MAX_SHOWS = 2
const GLOW_TEACHER_HINT_AFTER_O = 'That big mushroom seems\nawfully attentive.'
const GLOW_TEACHER_HINT_POST_O_MAX_SHOWS = 2
//
// Eyeless intro: nudge toward the right-edge cave mouth (max two, 10 s active each).
//
const GLOW_TEACHER_HINT_CAVE_ENTRANCE_TEXT = 'Something feels different\nover there ⤵'
const GLOW_TEACHER_HINT_CAVE_ENTRANCE_MAX_SHOWS = 2
//
// Lake + right mushroom open but the big tree is still hidden (max two).
//
const GLOW_TEACHER_HINT_TREE_NEAR_MUSH_TEXT = 'Look for the big tree\nnear the mushroom.'
const GLOW_TEACHER_HINT_TREE_NEAR_MUSH_MAX_SHOWS = 2
const MUD_TOOLTIP_TEXT = 'Ew. Mud!'
const MUD_TOOLTIP_SIZE = 80
const MUD_TOOLTIP_Y_OFFSET = -50
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
const SKELETON_TOOLTIP_TEXT = 'Time to get some sleep...'
const SKELETON_TOOLTIP_NEED_EYES_TEXT = 'You need eyes, buddy?'
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
// HUD life-icon (the "teacher") hover tooltip — same as touch lesson 0.
//
const LIFE_TOOLTIP_TEXT = 'Your experience'
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50
const LIFE_SCORE_TOOLTIP_SIZE = 44
const LIFE_SCORE_TOOLTIP_Y_OFFSET = 50
const LIFE_SCORE_TOOLTIP_CENTER_Y_OFFSET = -6
const LIFE_SCORE_TOOLTIP_CENTER_Y_LIFT_FRAC = 0.5
const PIT_CAVE_SKELETON_AUTO_HINT_DELAY = 0.5
const PIT_CAVE_SKELETON_AUTO_HINT_DURATION = 6
//
// GLOW word (top-left HUD) hover tooltip — same style as touch lesson 0.
//
const GLOW_INDICATOR_TOOLTIP_AFTER_G = 'Ground under my feet'
const GLOW_INDICATOR_TOOLTIP_AFTER_L = 'Look closer to see the nuances'
const GLOW_INDICATOR_TOOLTIP_AFTER_O = 'Observe, stop & listen'
const GLOW_INDICATOR_TOOLTIP_AFTER_W = 'Witness of the world'
const GLOW_INDICATOR_TOOLTIP_Y_OFFSET = 36
//
// After picking up the final W letter the hero shares a closing line for a
// few seconds, then a full-screen fade-out leads back to the menu.
//
const HINT_W_TEXT = GLOW_CONFIDENCE_HINT_W
const HINT_W_DURATION = 5.5
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
const GLOW_EAR_TREE_ROOTS_Z = GRASS_Z + 1
const GLOW_EAR_TREE_TRUNK_OVERLAY_Z = GRASS_Z + 2
const GLOW_EAR_TREE_BRANCHES_Z = GRASS_Z + 3
const GLOW_EAR_TREE_COUNT = 2
const GRASS_TUFT_COUNT = 22
//
// Right-spikes' warning-flash z — steps in front of the grass (GRASS_Z) for
// the blink window only; see drawGlowRightSpikes.
//
const RIGHT_SPIKE_BLINK_Z = GRASS_Z + 1
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
// Mud grass stays darker than the peek band when the post-L colour fade starts.
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
const MUD_BEHIND_ROCK_Z = 6
const MUD_DRAW_Z = 7
const MUD_FRONT_ROCK_Z = CFG.visual.zIndex.player - 2
const MUD_WALK_BIG_ROCK_COUNT = 2
const MUD_WALK_SMALL_ROCK_COUNT = 4
const MUD_WALK_BRANCH_COUNT = 2
const MUD_WALK_LOG_MIN_W = 62
const MUD_WALK_LOG_MAX_W = 96
const MUD_BLOB_STEPS = 24
const MUD_ROCK_SINK = 6
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
const MOTE_COUNT = 7
const MOTE_SPEED_MIN = 4
const MOTE_SPEED_RANGE = 8
const MOTE_SIZE_MIN = 1.2
const MOTE_SIZE_RANGE = 1.4
const MOTE_OPACITY_MIN = 0.07
const MOTE_OPACITY_RANGE = 0.1
//
// Visual ground lip — height variation only, collision stays on FLOOR_Y.
//
const GROUND_LIP_AMP = 6
const GROUND_LIP_STEPS = 36
const GROUND_LIP_STEPS_PARALLAX_STABLE = 22
const GROUND_LIP_FREQ_A = 0.012
const GROUND_LIP_FREQ_B = 0.031
//
// Bright “living” strip along the walkable ground line (§16 top edge).
//
const GROUND_TOP_RIM_H = 3
const GROUND_TOP_RIM_OPACITY = 0.62
//
// Wavy bottom of the baked earth band (organic silhouette, not a flat rect).
//
const GROUND_BOTTOM_WAVE_AMP = 7
const GROUND_BOTTOM_WAVE_STEPS = 40
const GROUND_BOTTOM_WAVE_FREQ_A = 0.018
const GROUND_BOTTOM_WAVE_FREQ_B = 0.041
//
// Underground earth band: two soil layers split at 50% depth (wavy seam at
// mid-height of CAVE_BAND_H). Top = chernozem, bottom = deeper sand/clay.
//
const GROUND_LAYER_FRACS = [0.5]
//
// High-frequency jagged seams between soil layers (sample-and-hold noise, like
// a dense irregular time series — not smooth sine waves).
//
const GROUND_LAYER_JAG_CELL_PX = glowFilmGrainBlockPxForTier('gameplay')
const GROUND_LAYER_INTERIOR_BOUNDARY_AMP = 12
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
// Lake bake — horizontal reflection ripples in the mask (tinted at draw time).
//
//
// Suppress orange forest haze when the camera sits over lake or cave beats.
//
const HAZE_LAKE_CAM_MARGIN = 96
const HAZE_CAVE_CAM_MARGIN = 140
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
const TRAMP_DOCKED_BOOST_MULT = 2.0
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
// How far above capTop counts as "closing in on the cap" — used by the
// predictive edge-catch in snapHeroToOneTrampolineCap (see its own comment).
//
const TRAMP_PAD_APPROACH_ABOVE = 90
//
// Horizontal reach for pad placement and fall-through guards
//
const TRAMP_NEAR_X = TRAMP_RADIUS + 80
//
// Anti-tunnel band below the cap when jumping onto the mushroom
//
const TRAMP_SNAP_BELOW = 48
const TRAMP_SQUASH_MAX = 0.35
const TRAMP_SPRITE = 'glow0-trampoline-gray-v4'
const TRAMP_OFFSET_FROM_L_PLAT = 50
//
// Static branch trampoline — right of the main tree (jump onto the start branch).
//
const BRANCH_TRAMP_OFFSET_X = 145
const BRANCH_TRAMP_BOOST_MULT = 1.68
//
// Ignore crack collapse right after a branch-trampoline bounce (prevents
// accidental cave opens while farming hops on the left mushroom).
//
const BRANCH_TRAMP_PIT_GUARD_SEC = 5
const BRANCH_TRAMP_CHEEKY_EVERY = 6
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
// After O: ten bounces on the right trampoline — at 5 it walks left and
// stops; at 10 it marches into the lake and reveals W.
//
const TRAMP_SING_ARM_DELAY_AFTER_O_CAPTION = 1
const TRAMP_WALK_BOUNCES_TOTAL = 10
const TRAMP_WALK_BOUNCES_MID_STOP = 5
const TRAMP_WALK_SINGS_TO_WATER = TRAMP_WALK_BOUNCES_TOTAL
const TRAMP_WALK_SPEED = 52
//
// Keeps the invisible cap alive briefly after a shaky on-cap read (prevents yank to hide Y).
//
const TRAMP_CAP_PAD_LATCH_SEC = 0.28
const TRAMP_CHEEKY_EVERY = 5
const TRAMP_CHEEKY_DURATION = 3
//
// Right-trampoline bubble after the fifth bounce (mid walk stop).
//
const TRAMP_MUSH_BOUNCE_HINT_MID = 'How can one work\nin such conditions?!'
//
// Bubble on the tenth bounce before the mushroom docks in the lake.
//
const TRAMP_MUSH_BOUNCE_HINT_FINAL = 'I\'ll go drown myself'
const TRAMP_WALK_SHORE_PAD = TRAMP_TOTAL_W / 2 + 24
const TRAMP_BAD_SING_DURATION = 4
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
  const zones = loadGlowZones()
  const treeData = buildGlowTree(TREE_SEED, TREE_X, TREE_TRUNK_BOTTOM_Y, TREE_TOP_Y, TREE_ROOT_MAX_Y, TREE_ROOT_START_Y, {
    ...glowTreeBuildOptsForDensity('nearground')
  })
  scaleGlowTreeTrunkWidths(treeData, MAIN_TREE_TRUNK_WIDTH_SCALE)
  const prewarmSegmentSave = get(KEY_TREE_SEGMENTS_REVEALED, [])
  const prewarmMonolith = zones.tree && !(Array.isArray(prewarmSegmentSave) && prewarmSegmentSave.length > 0)
  onProgress?.(12)
  await yieldForGpu(1)
  if (prewarmMonolith) {
    bakeMonolithicGlowTreeSprites(k, treeData)
    onProgress?.(42)
  } else {
    const plan = TreeSegments.buildGlowTreeSegmentPlan(treeData)
    const ids = TreeSegments.allGlowTreeSegmentIds(treeData, plan)
    TreeSegments.bakeGlowTreeSegmentSprites(k, treeData, WORLD_W, WORLD_H, ids)
    onProgress?.(48)
  }
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
  if (!glowUndergroundSpritesReady(k) || !glowParallaxSpritesPrewarmed(k)) {
    const undergroundSpec = await loadUndergroundSprites(k, async (done, total) => {
      onProgress?.(55 + Math.round(13 * done / total))
      await yieldForGpu(1)
    })
    onProgress?.(68)
    await yieldForGpu(1)
    if (!glowParallaxSpritesPrewarmed(k)) {
      await buildParallaxSprites(k, undergroundSpec, async (done, total) => {
        onProgress?.(68 + Math.round(10 * done / total))
        await yieldForGpu(1)
      })
    }
  }
  onProgress?.(78)
  await yieldForGpu(1)
  //
  // Gray hero frames (outline + filled) bake here so spawn / body-fill fade
  // never hitch the main thread mid-gameplay. Three separate bakes — ticking
  // and yielding between each keeps the bar moving instead of holding at
  // 78% for all three back to back.
  //
  Hero.loadHeroSprites({
    k,
    type: Hero.HEROES.HERO,
    ...getGlowHeroEyeBakeColors(true),
    bodyColor: HERO_BODY_COLOR,
    outlineColor: HERO_HOLLOW_OUTLINE_COLOR,
    outlineOnly: true,
    noEyes: true,
    postBakeCanvas: applyGlowGameplaySharpBake
  })
  onProgress?.(82)
  await yieldForGpu(1)
  Hero.loadHeroSprites({
    k,
    type: Hero.HEROES.HERO,
    ...getGlowHeroEyeBakeColors(true),
    bodyColor: HERO_BODY_COLOR,
    outlineColor: HERO_HOLLOW_OUTLINE_COLOR,
    outlineOnly: true,
    postBakeCanvas: applyGlowGameplaySharpBake
  })
  onProgress?.(86)
  await yieldForGpu(1)
  Hero.loadHeroSprites({
    k,
    type: Hero.HEROES.HERO,
    ...getGlowHeroEyeBakeColors(false),
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
    CanvasBackdrop.applyCanvasBackdrop(k, GLOW_PAL.glowPreludeBackdrop)
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
    const colorFadeInit = zones.colorWorld ? 1 : 0
    //
    // Draw callbacks on decor/tramps read zones._sceneRef before inst exists
    // (async bootstrap yields to the engine between setup steps).
    //
    zones._sceneRef = { zones, colorFade: colorFadeInit }
    zones.outerFrame && CanvasBackdrop.applyCanvasBackdrop(k, OUTER_BG_HEX)
    !zones.outerFrame && CanvasBackdrop.applyCanvasBackdrop(k, GLOW_PAL.glowPreludeBackdrop)
    const treeData = buildGlowTree(TREE_SEED, TREE_X, TREE_TRUNK_BOTTOM_Y, TREE_TOP_Y, TREE_ROOT_MAX_Y, TREE_ROOT_START_Y, {
    ...glowTreeBuildOptsForDensity('nearground')
  })
    scaleGlowTreeTrunkWidths(treeData, MAIN_TREE_TRUNK_WIDTH_SCALE)
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
        zones.lCollected,
        zones.gCollected
      )
      applyPersistedTreeSegmentVisibility(treeSegmentEntries, treeSegmentRevealed)
      treeSegmentRevealed.size >= treeSegmentIds.length && (zones.tree = true)
    }
    if (await glowBootstrapPause(bootstrap, 14, session)) return
    //
    // Underground decor first: its generated spec is baked both into the
    // standalone sprites (visible before L) and into the combined background.
    //
    const undergroundReady = glowUndergroundSpritesReady(k)
    const parallaxReady = glowParallaxSpritesPrewarmed(k)
    if (!undergroundReady || !parallaxReady) {
      const undergroundSpec = await loadUndergroundSprites(k, async (done, total) => {
        const pct = 15 + Math.round(2 * (done - 1) / Math.max(1, total - 1))
        if (await glowBootstrapPause(bootstrap, pct, session)) return
      })
      if (glowInitStale(session)) return
      if (!parallaxReady) {
        await buildParallaxSprites(k, undergroundSpec, async (done, total) => {
          const pct = 18 + Math.round(3 * (done - 1) / Math.max(1, total - 1))
          if (await glowBootstrapPause(bootstrap, pct, session)) return
        })
        if (glowInitStale(session)) return
      }
    }
    if (await glowBootstrapPause(bootstrap, 20, session)) return
    if (await glowBootstrapPause(bootstrap, 24, session)) return
    //
    // Main tree: one sprite pair when fully explored, else segment sprites.
    //
    const initialGraySprite = glowMonolithTreeGraySpriteName(zones)
    let treeObj
    let treeColorObj
    if (treeDrawMonolith) {
      //
      // Both sprites are cropped to the same bake bounds, so they share one
      // draw offset that puts the artwork back on its world position.
      //
      const treeBake = monolithicTreeBakeOffset(k)
      treeObj = k.add([
        k.sprite(initialGraySprite),
        k.pos(treeBake.x, treeBake.y),
        k.z(CFG.visual.zIndex.platforms - 2)
      ])
      treeColorObj = k.add([
        k.sprite(TREE_COLOR_SPRITE_NAME),
        k.pos(treeBake.x, treeBake.y),
        k.z(CFG.visual.zIndex.platforms - 2),
        k.opacity(0)
      ])
      //
      // Stay hidden until syncMonolithicTreeColorMode() runs — async bootstrap
      // can yield before applyZoneVisibility(), and a visible colour sprite
      // here flashes green for a frame on a gray-phase load.
      //
      treeObj.hidden = true
      treeColorObj.hidden = true
      treeObj.opacity = 1
      treeColorObj.opacity = 0
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
    if (await glowBootstrapPause(bootstrap, 27, session)) return
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
    const earTreeSpots = buildGlowEarTreeSpots(horizBranch.x1)
    //
    // Mud predator band east of the branch trampoline.
    //
    const mudPredatorAmbushTriggerX = branchTrampX + MUD_ZONE_BRANCH_TRIGGER_GAP
    const mudPredatorPopX = mudPredatorAmbushTriggerX + MUD_ZONE_PREDATOR_POP_LEAD
    const mudZoneX1 = branchTrampX + TRAMP_GRASS_CLEAR_HALF + MUD_BRANCH_TRAMP_GAP
    const mudZoneX2 = mudPredatorPopX + MUD_ZONE_RIGHT_EXTENT
    //
    // L-log platform's home spot — computed early (it only depends on
    // TREE_X and fixed offsets, not on anything laid out further below) so
    // the spawn-clearance check right after can see it.
    //
    const rightZoneBaseX = TREE_X + RIGHT_PLAT_OFFSET_X + RIGHT_ZONE_SHIFT_X
    const rightPlatY = horizBranch.physY
    const trampXForLayout = rightZoneBaseX + LOG_W + TRAMP_OFFSET_FROM_L_PLAT
    const chainTrampLayout = computeGlowChainTrampLayoutForTramp(trampXForLayout)
    const lPlatX = chainTrampLayout.lPlatX
    const lPlatY = chainTrampLayout.lPlatY
    //
    // Right spike zone's X range — computed early alongside lPlatX so the
    // spawn-clearance check right after can see it too.
    //
    const rightSpikesX2 = lPlatX + LOG_W - RIGHT_SPIKE_EDGE_GAP
    const rightSpikesX1 = rightSpikesX2 - RIGHT_SPIKE_ZONE_W
    //
    // Right mushroom trampoline's X — computed early (same reason as
    // rightZoneBaseX above) so the spawn-clearance check right after can see
    // it; createMushroomTrampoline() reuses this same value further below.
    //
    const trampX = rightZoneBaseX + LOG_W + TRAMP_OFFSET_FROM_L_PLAT
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
    // Ground spawn: right of the branch trampoline (never on its cap). After a
    // drowning death or any revisit with explored right ground — same spot.
    // Menu exit / level reload restores the last saved pose (X + Y).
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
        heroSpawnX = clampBranchSpawnX(lastSpawnX)
        heroSpawnY = lastSpawnY
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
      spawnOnBranch = true
      heroSpawnX = branchSpawnX
      heroSpawnY = branchPlatY - SURFACE_DETECT_Y + LOG_SNAP_EMBED
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
        lPlatX,
        rightPlatY,
        rightSpikes: { x1: rightSpikesX1, x2: rightSpikesX2 },
        mudZoneX1,
        mudZoneX2
      }))
    //
    // Glow SFX only from the first frame; birds.mp3 waits for the post-L stillness countdown.
    //
    sound._glowSfxMuted = false
    sound.glowSfxGain && (sound.glowSfxGain.gain.value = 1)
    Sound.stopRainSound(sound)
    k.onSceneLeave(() => {
      Sound.stopRainSound(sound)
      Sound.stopAmbient(sound)
      k.camScale(1)
    })
    const heroStartFilled = zones.colorWorld || zones.oZone
    const heroEyes = getGlowHeroEyeBakeColors(!heroStartFilled)
    if (glowInitStale(session)) return
    destroyStrayGlowHeroBody(k)
    const glowHeroCreateCfg = {
      type: Hero.HEROES.HERO,
      controllable: true,
      sfx: sound,
      bodyColor: HERO_BODY_COLOR,
      outlineColor: heroStartFilled ? HERO_OUTLINE_COLOR : HERO_HOLLOW_OUTLINE_COLOR,
      ...heroEyes,
      outlineOnly: !heroStartFilled,
      footFx: false,
      stepSoundScene: 'lesson-glow.0',
      suppressFootprints: true,
      airAnimDuringFlicker: true,
      runDuringFlicker: true,
      noEyes: !zones.eyesCollected,
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
    !zones.eyesCollected && initGlowHeroWithoutEyes(heroInst)
    zones.eyesCollected && applyGlowHeroEyesOpenedBake(k, heroInst, heroInst.postBakeCanvas)
    spawnOnBranch && (heroInst.direction = -1)
    spawnOnBranch && heroInst.character && (heroInst.character.flipX = true)
    tagWoodPlatform(branchPlat, sound, heroInst)
    tagGroundPlatform(floorPlat, sound, heroInst)
    floorBounds.postCaveFloor && tagGroundPlatform(floorBounds.postCaveFloor, sound, heroInst)
    const wPlatY = Math.min(horizBranch.physY + W_PLAT_Y_BELOW, FLOOR_Y - 50)
    const wPlatX = W_PLAT_X_BASE
    const clusterCenterX = horizBranch.x1 + 40
    const waterX2 = clusterCenterX + CLUSTER_ROCK_RADIUS_MAX + 10 - WATER_RIGHT_TRIM
    const oPlatX = rightZoneBaseX + LOG_W + O_PLAT_OFFSET_X
    const oPlatY = rightPlatY - O_PLAT_OFFSET_Y
    const logAtlas = createLogAtlasCollector()
    const lPlat = createGrayLogPlatform(
      k, lPlatX, lPlatY, LOG_W, LOG_H, sound, heroInst, zones, true, logAtlas,
      L_PLAT_COLLISION_DROP_Y
    )
    const wPlat = createGrayLogPlatform(k, wPlatX, wPlatY, LOG_W, LOG_H, sound, heroInst, zones, false, logAtlas)
    const oPlat = createGrayLogPlatform(k, oPlatX, oPlatY, LOG_W, LOG_H, sound, heroInst, zones, false, logAtlas)
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
    const gLetterX = horizBranch.x2 + G_LETTER_RIGHT_OF_BRANCH_GAP + GLOW_LETTER_SIZE / 2
    const gLetterY = horizBranch.physY - GLOW_LETTER_SIZE * 0.15 - G_LETTER_RAISE_Y
    const gLetter = zones.gCollected ? null : createGlowLetter(
      k, 'G', gLetterX, gLetterY, GLOW_LETTER_TILT, CFG.visual.colors.hero.eyeWhite
    )
    //
    // G sits right against the big tree's canopy — createGlowLetter's
    // default z is below the tree's monolithic sprite (trunk+branches+
    // leaves as one image), so without this it would draw behind the
    // leaves instead of in front of them, same fix already applied to O.
    //
    gLetter?.allObjects?.forEach(obj => { obj.z = CFG.visual.zIndex.platforms - 1 })
    const lLetterX = lPlatX - L_LETTER_LEFT_OF_PLAT_GAP - GLOW_LETTER_SIZE / 2
    const lLetterY = lPlatY - GLOW_LETTER_SIZE * 0.15 - L_LETTER_RAISE_Y
    const lLetter = zones.lCollected ? null : createGlowLetter(
      k, 'L', lLetterX, lLetterY, -GLOW_LETTER_TILT, L_LETTER_FILL_HEX, { noShadow: false, noOutline: true }
    )
    const wLetterX = wPlatX + LOG_W / 2
    const wLetterY = wPlatY - GLOW_LETTER_SIZE * 0.15 - W_LETTER_RAISE_Y
    const wLetter = zones.wCollected ? null : createGlowLetter(k, 'W', wLetterX, wLetterY, GLOW_LETTER_TILT * 0.7, HERO_BODY_COLOR)
    const oLetterX = oPlatX + LOG_W / 2
    const oLetterY = oPlatY - GLOW_LETTER_SIZE * 0.15 - O_LETTER_RAISE_Y
    const oLetter = zones.oCollected ? null : createGlowLetter(
      k, 'O', oLetterX, oLetterY, GLOW_LETTER_TILT * 0.5, GLOW_PAL.lightGray, { noShadow: true }
    )
    oLetter?.allObjects?.forEach(obj => { obj.z = CFG.visual.zIndex.platforms - 1 })
    const lakeX1 = LEFT_MARGIN
    const lakeX2 = waterX2
    //
    // Computed here (before grass) so the grass field can exclude the same
    // spots the ear-trees will actually plant at - see EAR_TREE_TRUNK_GRASS_CLEAR_HALF.
    //
    const grassLayer = createGlowGrass(k, lakeX1, waterX2, trampX, branchTrampX, zones, mudZoneX1, mudZoneX2, earTreeSpots)
    const mudExtraGrass = GLOW_DEBUG_HIDE_GRASS_BEFORE_MUD
      ? null
      : createGlowMudExtraGrass(k, zones, mudZoneX1, mudZoneX2)
    //
    // Rocks and mushrooms each bake 2-3 gray/outline canvas variants per
    // instance (dozens of decor pieces total). Registering them all into one
    // shared atlas (built right after both are placed) means every decor
    // sprite on screen shares a single texture bind instead of each piece
    // forcing its own bindTexture/useProgram GPU state change — this is what
    // actually tanks FPS once O opens up the whole level's decor at once.
    //
    const decorAtlas = createCanvasAtlasBuilder()
    const rockObjs = createGlowRocks(k, horizBranch.x1, lakeX2, rightZoneBaseX, trampX, branchTrampX, zones, decorAtlas, mudZoneX2)
    const mudWalkClutter = createGlowMudZoneWalkClutter(k, mudZoneX1, mudZoneX2, zones, decorAtlas)
    rockObjs.push(...mudWalkClutter.rocks)
    const mushObjs = createGlowMushrooms(k, lakeX1, waterX2, trampX, branchTrampX, zones, decorAtlas)
    decorAtlas.build(k)
    if (await glowBootstrapPause(bootstrap, 54, session)) return
    const predator = Predator.create({
      k,
      x: mudPredatorPopX,
      dir: -1,
      minX: mudZoneX1 + MUD_ZONE_CREATURE_MARGIN,
      maxX: mudZoneX2 - MUD_ZONE_CREATURE_MARGIN,
      groundAt: (x) => glowPredatorSurfaceY(rockObjs, mudWalkClutter.surfaces, mudZoneX1, mudZoneX2, x),
      hero: heroInst,
      zones,
      sfx: sound
    })
    const swampSpirit = SwampSpirit.create({
      k,
      x: branchTrampX,
      minX: LEFT_MARGIN + 40,
      maxX: WORLD_W - RIGHT_MARGIN - 40,
      holdRadius: TRAMP_MUSH_LAND_REVEAL_DIST,
      branchMushroomX: () => branchTrampBundle.state?.x ?? branchTrampX,
      rightMushroomX: () => trampBundle.state?.x ?? trampX,
      branchMushroomShown: () => isBranchTrampolineVisible(zones),
      rightMushroomShown: () => isRightTrampolineVisible(zones),
      groundAt: glowGroundSurfaceY,
      hero: heroInst,
      zones,
      sfx: sound,
      notePostBake: applyGlowGameplaySharpBake
    })
    if (!spawnOnBranch && zones.gCollected && isGlowEyesGameplayUnlocked(zones)) {
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
    //
    // Wooden spikes sit fixed on the right end of the L-log platform,
    // concealed under their own patch of grass — no reveal/pop state, they
    // are simply part of the platform's surface.
    //
    const rightSpikes = createGlowRightSpikes(k, zones, rightSpikesX1, rightSpikesX2, lPlatY)
    const spikeGrass = createGlowSpikeGrass(k, zones, rightSpikesX1, rightSpikesX2, lPlatY)
    const waterLayer = createWater(k, lakeX1, waterX2, zones)
    createLakeShoreRockLayer(k, zones)
    if (await glowBootstrapPause(bootstrap, 72, session)) return
    if (await glowBootstrapPause(bootstrap, 74, session)) return
    initTouchInput(k)
    TouchControls.create(k)
    const goldRgb = getRGB(k, GLOW_GOLD_HEX)
    const completedLetterCount = countGlowLettersCollected(zones)
    //
    // GLOW (the section label) stays hidden until the first yellow G fill —
    // the life/eye icon is independent of that and shows from the very
    // start of the level (see revealLifeHud below); only its death-count
    // numeral stays hidden until the first death (syncGlowLifeScoreVisibility).
    //
    const levelIndicator = createGlowLevelIndicator(k, goldRgb, completedLetterCount, zones.colorWorld)
    LevelIndicator.bindEyeHudLookAtHero(levelIndicator, heroInst)
    pinGlowHudFixed(levelIndicator)
    LevelIndicator.setSectionLabelHidden(levelIndicator, true)
    LevelIndicator.revealLifeHud(levelIndicator, !zones.colorWorld)
    const startingLifeScore = get('lifeScore', 0)
    levelIndicator.updateLifeScore?.(startingLifeScore)
    syncGlowLifeScoreVisibility(levelIndicator, startingLifeScore)
    set(KEY_LIFE_SHOWN, true)
    if (await glowBootstrapPause(bootstrap, 76, session)) return
    if (await glowBootstrapPause(bootstrap, 78, session)) return
    logAtlas.build(k)
    if (await glowBootstrapPause(bootstrap, 80, session)) return
    if (await glowBootstrapPause(bootstrap, 82, session)) return
    //
    // Dock target is mid-lake so the last walk always crosses open water.
    // Walk progress (x, sing count, docked) is restored from storage.
    //
    const trampDockX = (lakeX1 + lakeX2) * 0.5
    let savedTrampSingCount = Number(get(KEY_TRAMP_WALK_SING_COUNT, 0)) || 0
    //
    // Legacy saves used 1–2 “sings” instead of bounce counts 5 / 10.
    //
    if (savedTrampSingCount > 0 && savedTrampSingCount <= 2) {
      savedTrampSingCount = savedTrampSingCount >= 2
        ? TRAMP_WALK_BOUNCES_TOTAL
        : TRAMP_WALK_BOUNCES_MID_STOP
    }
    const savedTrampWalked = Boolean(get(KEY_TRAMP_WALKED, false)) ||
      savedTrampSingCount >= TRAMP_WALK_BOUNCES_TOTAL
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
    const chainEyePads = ChainEyeTramp.createPads(k)
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
      heroSpawnFade: 0,
      pendingHeroFillReveal: null,
      cameraLetterPeek: null,
      oZoneRevealTime: null,
      oStuckHintShown: false,
      sound,
      birdsMusic,
      letterDialogMusic: null,
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
      treeDrawColorMode: Boolean(zones.colorWorld || zones.lCollected),
      treeSegmentEntries,
      treeSegmentIds,
      treeSegmentPending,
      treeSegmentRevealed,
      treeRevealLandingCount: 0,
      treeStripEndX: WORLD_W - RIGHT_MARGIN - 20,
      treeGraySpriteName: glowMonolithTreeGraySpriteName(zones),
      colorFade: zones.colorWorld || zones.oZone || zones.lCollected ? 1 : 0,
      colorFadeTarget: zones.lCollected || zones.colorWorld || zones.oZone ? 1 : 0,
      //
      // Post-L uses the same full colour beat as the reachable O zone (see
      // applyGlowPostLLitState) — not a separate preview ramp on pickup.
      //
      parallaxFade: zones.colorWorld || zones.oZone || zones.lCollected ? 1 : 0,
      _meditationParallaxPreview: false,
      _meditationPreviewFadingOut: false,
      //
      cornerObjs,
      cornerColorHex: isOuterFrameVisible(zones) ? OUTER_BG_HEX : GLOW_PAL.glowPreludeBackdrop,
      wallObjs: floorBounds.walls,
      grassLayer,
      mudExtraGrass,
      rockObjs,
      mudWalkSurfaces: mudWalkClutter.surfaces,
      mudWalkClutter,
      mushObjs,
      predator,
      swampSpirit,
      mudPredatorAmbushTriggerX,
      mudPredatorPopX,
      mudZoneX1,
      mudZoneX2,
      rightSpikes,
      spikeGrass,
      lPlatCaptionHiding: false,
      _lPlatVisibleLastFrame: false,
      oPlatCaptionHiding: false,
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
        lPlatX,
        rightPlatY: lPlatY,
        mudZoneX1,
        mudZoneX2
      },
      waterLayer,
      pitDrawLayer: null,
      pitCaveHeroForeground: false,
      pendingLetterPickup: null,
      earTreeRevealFade: zones.lCollected ? 1 : null,
      atmosphereMotes: createAtmosphereMotes(),
      leftDecorFade: zones.groundDecorLeft ? 1 : 0,
      trampBundle,
      branchTrampBundle,
      trampPad,
      branchTrampPad,
      chainEyeTramp: {
        ...chainEyePads,
        ...ChainEyeTramp.createChainEyeTrampStates(zones)
      },
      lChainFromRightTramp: false,
      lChainFromMiddleEye: get(KEY_CHAIN_MIDDLE_EYE_STEPPED, false),
      chainEyeBounceAir: null,
      branchTrampBounceAir: false,
      branchTrampPitGuardTimer: 0,
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
        waterHintStarted: savedTrampWalked,
        singAllowedAt: zones.oCollected ? 0 : null
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
      lPlatHome: { x: lPlatX, y: lPlatY, dropY: L_PLAT_COLLISION_DROP_Y },
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
      wasGroundedOnBranch: false,
      expectBranchWoodLandSound: false,
      wasHeroRunning: false,
      drowning: false,
      drownTimer: 0,
      glowDrownHeroClipLock: false,
      deathHandled: false,
      wasOnStartBranch: false,
      drownFromStartBranch: false,
      dialogOpen: false,
      letterCaptionActive: false,
      mudJumpTakeoff: false,
      levelIndicator,
      goldRgb,
      wTrigger: { x1: wPlatX - PLAT_LAND_TRIGGER_PAD, x2: wPlatX + LOG_W + PLAT_LAND_TRIGGER_PAD, y: wPlatY - 60, y2: wPlatY + LOG_H + 20 },
      //
      // Tracks whether the playable hero has left outline-only mode.
      //
      heroBodyFillApplied: heroStartFilled,
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
      meditation: {
        idleTimer: 0,
        requiredIdle: MEDITATION_IDLE_BASE,
        countdown: null,
        stillnessCompleted: false,
        lFillRingPlayed: zones.lCollected
      },
      meditationBirdsActive: false,
      meditationWorldLife: zones.oZone || zones.oCollected ? 1 : 0,
      pendingTreeReveal: !treeDrawMonolith && treeSegmentRevealed.size < treeSegmentIds.length,
      treeBranchLeftOnce: false,
      hasStoodOnStartBranch: false,
      startBranch: { x1: horizBranch.x1, x2: horizBranch.x2, y: branchPlatY },
      branchPlat,
      branchPlatHome,
      midges: createGlowMidges(k, FLOOR_Y, WORLD_W, { treeX: TREE_X, mudZoneX1, mudZoneX2 }),
      pit: null,
      woodSurfaces: [
        { x1: horizBranch.x1, x2: horizBranch.x2, y: branchPlatY, h: HORIZ_PLATFORM_H }
      ],
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
    initGlowTeacherHintState(inst)
    if (await glowBootstrapPause(bootstrap, 87, session)) return
    inst.eyeIntro = zones.eyesCollected ? null : createGlowEyeIntroState()
    inst.oZoneRevealTime = zones.oZone ? k.time() : null
    zones._lakeX1 = lakeX1
    zones._lakeX2 = lakeX2
    zones._groundStripEndX = WORLD_W - RIGHT_MARGIN - 20
    if (!inst.treeDrawMonolith && isAllTreeSegmentsRevealed(inst)) {
      inst.zones.tree = true
      set(KEY_REVEALED_TREE, true)
    }
    if (await glowBootstrapPause(bootstrap, 89, session)) return
    applyZoneVisibility(inst)
    syncGlowLifeHudPupil(inst)
    restorePersistedGlowZoneVisuals(inst)
    zones.lCollected && rebakeGlowRockSpritesShaded(inst)
    syncGlowFpsHudVisibility(inst)
    maybeStartGlowCameraIntro(inst, zones)
    updateGlowCamera(inst)
    updatePlayfieldBorderColors(inst)
    inst.zones._sceneRef = inst
    zones.wCollected && revealPostWHud(inst)
    setGlowHeroWitnessGlow(inst, zones.wCollected)
    const wasInCaveSpawn = lastSpawnMode === SPAWN_MODE_CAVE
    const pitShouldBeOpen = shouldGlowPitBeOpenForZones(zones, lastSpawnMode, heroInst)
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
      zones,
      lastSpawnMode,
      alreadyCollapsed: pitShouldBeOpen,
      cracksVisible: isGlowCaveCracksVisible(zones),
      tooltipClampInset: glowTooltipClampInset()
    })
    inst.pit.sceneRef = inst
    k._glowSceneInst = inst
    pitShouldBeOpen && !inst.pit.collapsed &&
      ensureGlowPitCollapsedOnReload(
        inst.pit,
        isGlowEyeIntroPending(zones) && !glowHeroHasCollectedEyes(zones, heroInst)
      )
    wasInCaveSpawn && isGlowEyeIntroPending(zones) && !glowHeroHasCollectedEyes(zones, heroInst) &&
      restoreGlowPitEyeIntroInterior(inst.pit)
    applyGlowCaveSpawnResume(inst, heroSpawnX, heroSpawnY, wasInCaveSpawn)
    restoreGlowEyeIntroFromPersistedState(inst)
    restoreGlowHudGCaveIntroFromPersisted(inst)
    ensureGlowPitOpenForEyesCollected(inst.pit)
    inst.pit.onCrackLandingShake = () => {
      shouldGlowCrackLandingCameraShake(inst) && triggerGlowCameraShake(inst)
    }
    inst.pit.onPitMushroomLaunch = (_pit, char) => launchHeroFromPitMushroomToBranch(inst, char)
    inst.pit.crackFloor && tagGroundPlatform(inst.pit.crackFloor, sound, heroInst)
    inst.footParticles = GlowFootParticles.create({ k })
    const chainBuoyWoodBands = buildGlowChainBuoyWoodBands({
      horizBranch: treeData.horizBranch,
      lPlatX,
      wPlatX,
      oPlatX
    })
    inst.chainBuoys = ChainBuoy.create({
      k,
      spots: buildGlowChainBuoySpots(inst.lakeX1, inst.lakeX2, chainBuoyWoodBands, earTreeSpots, trampX, branchTrampX),
      woodPlatformBands: chainBuoyWoodBands,
      platformXMargin: GLOW_CHAIN_BUOY_PLATFORM_X_MARGIN
    })
    inst.earTrees = EarTree.create({ k, spots: earTreeSpots })
    inst.onChainMiddleEyeStepped = () => {
      set(KEY_CHAIN_MIDDLE_EYE_STEPPED, true)
      inst.zones.chainMiddleEyeStepped = true
      inst.lChainFromMiddleEye = true
      ChainEyeTramp.refreshChainEyeTrampActiveFlags(inst)
      syncGlowHudLetterFills(inst)
    }
    inst.onChainLeftEyeStepped = () => {
      set(KEY_CHAIN_LEFT_EYE_STEPPED, true)
      inst.zones.chainLeftEyeStepped = true
      syncGlowHudLetterFills(inst)
    }
    inst.onLeftChainEyeTouchForLPlat = () => revealLPlatZone(inst)
    ChainEyeTramp.refreshChainEyeTrampActiveFlags(inst)
    createGlowChainBuoyLayer(k, zones)
    createGlowEarTreeLayer(k, inst)
    if (await glowBootstrapPause(bootstrap, 93, session)) return
    syncGlowAtmosphereZones(inst)
    inst.midges.worldLife = 1
    inst.k.wait(0, () => syncGlowHeroFillVisual(inst, {
      filledBodyColor: HERO_FILLED_BODY_COLOR,
      filledOutlineColor: HERO_FILLED_OUTLINE_COLOR,
      postBakeCanvas: applyGlowGameplaySharpBake
    }, glowHeroFillOpts(inst)))
    maybeShowGLetter(inst)
    //
    // First visit: hold hints until the camera intro zoom-out finishes and a
    // short beat passes so the player sees the full level first.
    //
    const deferGlowIntro = !zones.gCollected && !get(KEY_INTRO_SHOWN, false)
    inst.pendingGlowIntro = deferGlowIntro
    inst.pendingReplayIntro2 = spawnOnBranch && !zones.gCollected &&
      get(KEY_INTRO_SHOWN, false)
    inst.introHintDelayRemaining = 0
    !deferGlowIntro && !inst.pendingReplayIntro2 && inst.heroSpawnFade <= 0 &&
      startGlowIntro(inst)
    createSmallHeroTooltip(inst)
    syncGlowHudLetterFills(inst, false)
    inst.letterAppearFxReady = true
    applyZoneVisibility(inst)
    syncGlowPickupLetterVisuals(inst)
    restoreGlowRightTrampProgressAfterSpawn(inst)
    zones.lCollected && !zones.oZone && applyGlowPostLLitState(inst)
    zones.lZoneLit && applyGlowPostLStillnessReveal(inst)
    zones.lCollected && ensureGlowTreeRootsSegment(inst)
    Hero.suppressIdleVocalization()
    if ((zones.oZone || zones.oCollected) && !inst.heroBodyFillApplied) {
      applyGlowHeroBodyFill(inst)
    }
    (zones.colorWorld || zones.oZone || zones.oCollected) && ensureGlowBirdsBackgroundPlaying(inst)
    inst._glowBirdsBootstrapKick = zones.colorWorld || zones.oZone || zones.oCollected
    ensureGlowPitOpenForEyesCollected(inst.pit)
    registerGlowNativeTeardown(() => {
      glowLevel0LiveHeroChar = null
      persistGlowOnLeave(inst)
      clearGlowHeroFillPreview(inst)
      stopGlowLoopAudio()
    })
    const backToMenuCancel = bindBackToMenuKeys(k, () => {
      if (inst.dialogOpen) return
      goToMenuAfterAssets(k)
    })
    k.onSceneLeave(() => {
      backToMenuCancel.cancel()
      inst.touchDeathRespawnWait?.cancel?.()
      inst.touchDeathRespawnWait = null
      clearGlowHeroFillPreview(inst)
      persistGlowOnLeave(inst)
      stopGlowLetterDialogMusic(inst)
      stopGlowLoopAudio()
      inst._dialogCaptionRaf && cancelAnimationFrame(inst._dialogCaptionRaf)
      inst._dialogAudioRestoreRaf && cancelAnimationFrame(inst._dialogAudioRestoreRaf)
      inst.trampShallowHint && Tooltip.destroy(inst.trampShallowHint)
      destroySwampSpiritProximityHint(inst)
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
    // Letter-fill burst halo — drawn just above the hero sprite.
    //
    k.add([
      k.z(CFG.visual.zIndex.player + 0.5),
      {
        draw() {
          drawGlowHeroWitnessGlow(k, inst.heroInst, inst)
          drawGlowHeroFillBurst(k, inst.heroInst, inst)
        }
      }
    ])
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
    //
    // Dev-only hook for automated wood-foot-particle verification.
    //
    if (await glowBootstrapPause(bootstrap, 99, session)) return
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
// Void top strip before the outer frame is revealed (matches playfield void).
//
function drawPlayfieldVoidTopBar(inst) {
  const k = inst.k
  const backdrop = glowPlayfieldBackdropRgb(inst)
  const voidColor = k.rgb(backdrop.r, backdrop.g, backdrop.b)
  k.drawRect({ pos: k.vec2(0, 0), width: SCREEN_W, height: PLAYFIELD_TOP_Y + TOP_MARGIN, color: voidColor, fixed: true })
}
//
// Void side and bottom pillarbox before the outer frame is revealed. Both
// the top and bottom bars reach all the way to their real screen edge so a
// taller-than-design window's extra letterbox padding is covered too.
//
function drawPlayfieldVoidSideChrome(inst) {
  const k = inst.k
  const backdrop = glowPlayfieldBackdropRgb(inst)
  const voidColor = k.rgb(backdrop.r, backdrop.g, backdrop.b)
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
    const replayClick = bindPointerActivate(inst.k, () => {
      if (replayHintDismissed) return false
      dismissReplay()
      return true
    })
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
// Hero hover — eyeless intro only.
//
function heroTooltipText(inst) {
  if (!isGlowEyesGameplayUnlocked(inst.zones)) return HERO_TOOLTIP_EYELESS_TEXT
  return null
}
function glowHeroCollisionHoverZone(inst) {
  return Hero.getHeroCollisionHoverZone(inst.heroInst)
}
//
// Hero hover bubble stays off while any other hint is on the hero.
//
function isGlowHeroHoverTooltipVisible(inst) {
  if (inst.drowning || inst.dialogOpen) return false
  if (inst.heroSpawnFade > 0 || inst.pendingGlowIntro) return false
  if (inst.introLock && isGlowEyesGameplayUnlocked(inst.zones)) return false
  if (HeroHint.isActive(inst.heroHint)) return false
  if (!heroTooltipText(inst)) return false
  return true
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
      x: () => glowHeroCollisionHoverZone(inst).x,
      y: () => glowHeroCollisionHoverZone(inst).y,
      width: () => glowHeroCollisionHoverZone(inst).w,
      height: () => glowHeroCollisionHoverZone(inst).h,
      pointerWorldX: () => glowHeroCollisionHoverZone(inst).pointerX,
      pointerWorldY: () => glowHeroCollisionHoverZone(inst).pointerY,
      pinBubbleToPointer: true,
      forceAbove: true,
      text: () => heroTooltipText(inst),
      offsetY: HERO_TOOLTIP_Y_OFFSET,
      visible: () => isGlowHeroHoverTooltipVisible(inst)
    }, {
      x: () => (inst.mudZoneX1 + inst.mudZoneX2) * 0.5,
      y: () => FLOOR_Y - MUD_MAX_DEPTH * 0.5,
      width: Math.max(40, inst.mudZoneX2 - inst.mudZoneX1),
      height: MUD_TOOLTIP_SIZE,
      text: MUD_TOOLTIP_TEXT,
      offsetY: MUD_TOOLTIP_Y_OFFSET,
      visible: () => inst.zones.gCollected &&
        isGlowEyesGameplayUnlocked(inst.zones) &&
        inst.mudZoneX1 != null &&
        !inst.dialogOpen
    }, {
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
      visible: () => Boolean(inst.levelIndicator?.lifeRevealed),
      screenSpace: true
    }, {
      x: () => glowHudLetterHoverPos(inst, 0).x,
      y: () => glowHudLetterHoverPos(inst, 0).y,
      width: () => glowHudLetterHoverSize(inst, 0).w,
      height: () => glowHudLetterHoverSize(inst, 0).h,
      text: () => glowHudLetterTooltipText(inst, 0),
      offsetY: GLOW_INDICATOR_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => glowHudLetterTooltipVisible(inst, 0),
      screenSpace: true
    }, {
      x: () => glowHudLetterHoverPos(inst, 1).x,
      y: () => glowHudLetterHoverPos(inst, 1).y,
      width: () => glowHudLetterHoverSize(inst, 1).w,
      height: () => glowHudLetterHoverSize(inst, 1).h,
      text: () => glowHudLetterTooltipText(inst, 1),
      offsetY: GLOW_INDICATOR_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => glowHudLetterTooltipVisible(inst, 1),
      screenSpace: true
    }, {
      x: () => glowHudLetterHoverPos(inst, 2).x,
      y: () => glowHudLetterHoverPos(inst, 2).y,
      width: () => glowHudLetterHoverSize(inst, 2).w,
      height: () => glowHudLetterHoverSize(inst, 2).h,
      text: () => glowHudLetterTooltipText(inst, 2),
      offsetY: GLOW_INDICATOR_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => glowHudLetterTooltipVisible(inst, 2),
      screenSpace: true
    }, {
      x: () => glowHudLetterHoverPos(inst, 3).x,
      y: () => glowHudLetterHoverPos(inst, 3).y,
      width: () => glowHudLetterHoverSize(inst, 3).w,
      height: () => glowHudLetterHoverSize(inst, 3).h,
      text: () => glowHudLetterTooltipText(inst, 3),
      offsetY: GLOW_INDICATOR_TOOLTIP_Y_OFFSET,
      forceBelow: true,
      visible: () => glowHudLetterTooltipVisible(inst, 3),
      screenSpace: true
    }, {
      x: () => pitCaveSkeletonTooltipPos(inst).x,
      y: () => pitCaveSkeletonTooltipPos(inst).y,
      width: SKELETON_TOOLTIP_WIDTH,
      height: SKELETON_TOOLTIP_HEIGHT,
      text: () => pitCaveSkeletonTooltipText(inst),
      offsetY: SKELETON_TOOLTIP_Y_OFFSET,
      visible: () => pitCaveSkeletonTooltipVisible(inst),
      screenSpace: false
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
      visible: () => isBranchTrampDrawnVisible(inst) &&
        !inst.branchTrampWalk?.marioHintTooltip
    }]
  })
}
//
// Face counter for the post-O right-trampoline bounce quest (hidden once W opens).
//
function isGlowRightTrampHeroCounterRetired(inst) {
  const z = inst.zones
  if (!z?.oCollected) return false
  if (z.wCollected) return true
  return isGlowWZoneUnlocked(inst)
}
//
// Shows/hides the meditation countdown via the shared hero counter component.
//
function isTrampBounceHeroCounterActive(inst) {
  const tw = inst.trampWalk
  if (!tw || !inst.zones?.oCollected || tw.walked) return false
  if (isGlowRightTrampHeroCounterRetired(inst)) return false
  if ((tw.singCount || 0) >= TRAMP_WALK_BOUNCES_TOTAL) return false
  const char = inst.heroInst?.character
  if (char?.pos && inst.trampState &&
    isOnTrampolineCap(inst, char, inst.trampState)) {
    return true
  }
  return (tw.singCount || 0) > 0
}
function updateMeditationCounter(inst) {
  const tw = inst.trampWalk
  const trampBounceUi = isTrampBounceHeroCounterActive(inst)
  const remaining = inst.meditation?.countdown
  const char = inst.heroInst?.character
  if ((remaining == null && !trampBounceUi) || !char?.pos) {
    inst.meditationCounter && HeroCounter.hide(inst.meditationCounter)
    inst._heroCountdownTickSecond = null
    return
  }
  if (remaining != null) {
    const displaySecond = Math.ceil(remaining)
    if (inst._heroCountdownTickSecond !== displaySecond) {
      inst._heroCountdownTickSecond = displaySecond
      if (inst.sound) {
        //
        // Post-L stillness countdown: menu-style heartbeat while the world
        // crossfades to colour; tramp sing keeps the letter-pickup tick.
        //
        Sound.playHeartbeatSound(inst.sound)
      }
    }
  } else {
    inst._heroCountdownTickSecond = null
  }
  if (!inst.meditationCounter) {
    inst.meditationCounter = HeroCounter.create({
      k: inst.k,
      size: MEDITATION_TIMER_FONT,
      font: GLOW_LETTER_FONT,
      color: inst.goldRgb,
      outlineColor: VOID,
      yOffset: GLOW_HERO_COUNTER_Y_OFFSET
    })
  }
  const hx = Math.round(char.pos.x)
  const hy = Math.round(char.pos.y)
  let label
  if (inst.meditation?.countdown != null) {
    label = formatGlowHudFillProgress(countGlowHudOFillParts(inst), GLOW_HUD_O_FILL_PARTS)
  } else if (trampBounceUi) {
    label = formatGlowHudFillProgress(tw.singCount || 0, TRAMP_WALK_BOUNCES_TOTAL)
  } else {
    label = String(Math.ceil(remaining))
  }
  const useGold = isGlowHeroCounterGold(inst)
  const color = useGold ? inst.goldRgb : getRGB(inst.k, CFG.visual.colors.hero.eyeWhite)
  const outline = useGold ? VOID : getRGB(inst.k, GLOW_PAL.void)
  inst.meditationCounter.color = color
  inst.meditationCounter.outlineColor = outline
  HeroCounter.update(inst.meditationCounter, label, hx, hy)
  syncHeroCounterPalette(inst.meditationCounter, color, outline)
}
//
// Hero-attached counters use gold in the colour world (and after L lights decor).
//
function isGlowHeroCounterGold(inst) {
  const z = inst.zones
  return Boolean(z?.colorWorld || z?.lCollected || z?.oZone || z?.oCollected)
}
//
// Reads persisted zone flags from localStorage.
//
function loadGlowZones() {
  const gCollected = get(KEY_COLLECTED_G, false)
  const gUndergroundLive = get(KEY_G_UNDERGROUND_LIVE, false)
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
  //
  // Left shore decor opens only with the lake — after the first drowning.
  //
  const groundDecorLeft = waterDiscovered
  const leftShoreRock = waterDiscovered || get(KEY_LEFT_SHORE_ROCK, false)
  const branchTrampRevealed = get(KEY_BRANCH_TRAMP_REVEALED, false)
  let branchTrampBounceLive = get(KEY_BRANCH_TRAMP_BOUNCE_LIVE, false)
  if (!branchTrampBounceLive && branchTrampRevealed) {
    const branchAlreadyUsed = get(KEY_TRAMP_WALKED, false) ||
      get(KEY_REVEALED_L_PLAT, false) ||
      lCollected
    if (branchAlreadyUsed) {
      branchTrampBounceLive = true
      set(KEY_BRANCH_TRAMP_BOUNCE_LIVE, true)
    }
  }
  const rightTrampRevealed = get(KEY_RIGHT_TRAMP_REVEALED, false)
  let rightTrampBounceLive = get(KEY_RIGHT_TRAMP_BOUNCE_LIVE, false)
  if (!rightTrampBounceLive && rightTrampRevealed) {
    const trampAlreadyUsed = get(KEY_TRAMP_WALKED, false) ||
      get(KEY_REVEALED_L_PLAT, false) ||
      lCollected
    if (trampAlreadyUsed) {
      rightTrampBounceLive = true
      set(KEY_RIGHT_TRAMP_BOUNCE_LIVE, true)
    }
  }
  const lLetterUnveiled = get(KEY_L_LETTER_UNVEILED, false) || lCollected
  const oZone = gCollected && lCollected && (get(KEY_REVEALED_O, false) || oCollected)
  const lZoneParallax = get(KEY_REVEALED_L, false) || oZone
  const lZoneLit = gCollected && lCollected && get(KEY_REVEALED_L_LIT, false)
  const lPlatRevealed = get(KEY_REVEALED_L_PLAT, false) || lCollected
  const wZone = gCollected && lCollected && oCollected && (get(KEY_REVEALED_W, false) || wCollected)
  const colorWorld = oCollected
  const eyesCollectedSaved = get(KEY_EYES_COLLECTED, false)
  const eyesCollected = eyesCollectedSaved ||
    gCollected || lCollected || oCollected || wCollected
  eyesCollected && !eyesCollectedSaved && (set(KEY_EYES_COLLECTED, true), set(KEY_PIT_COLLAPSED, true))
  return {
    gCollected,
    gUndergroundLive,
    lCollected,
    oCollected,
    wCollected,
    eyesCollected,
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
    branchTrampBounceLive,
    rightTrampRevealed,
    rightTrampBounceLive,
    chainMiddleEyeStepped: get(KEY_CHAIN_MIDDLE_EYE_STEPPED, false) || lCollected,
    chainLeftEyeStepped: get(KEY_CHAIN_LEFT_EYE_STEPPED, false) || lCollected,
    lPlatStepped: get(KEY_L_PLAT_STEPPED, false) || lCollected,
    mudPredatorJumpedOver: get(KEY_MUD_PREDATOR_JUMPED_OVER, false) ||
      get(KEY_MUD_PREDATOR_JUMPED_OVER_LEGACY, false) ||
      lCollected,
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
// Persists glow storage keys before scene leave or native engine teardown.
//
function persistGlowOnLeave(inst) {
  persistGlowLastSpawn(inst)
  persistTrampWalk(inst)
  persistHudLetterFills(inst)
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
    if (footY >= pit.floorY - 6) return true
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
    set(KEY_PIT_COLLAPSED, true)
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
// Pins the GLOW HUD letters to screen space so they stay under the top bar
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
// Pins and lays out the FPS counter beside the GLOW HUD label.
//
function layoutGlowFpsHud(inst) {
  const fps = inst.fpsCounter
  if (!fps) return
  FpsCounter.pinScreenFixed(fps)
  const centerX = CFG.debug?.showPerformanceHud
    ? inst.k.width() / 2
    : (() => {
      const glowRight = GLOW_HUD_LABEL_START_X +
        GLOW_HUD_LETTER_COUNT * GLOW_HUD_LABEL_FONT_SIZE +
        (GLOW_HUD_LETTER_COUNT - 1) * GLOW_HUD_LABEL_LETTER_SPACING
      const slotLeft = glowRight + GLOW_HUD_FPS_SLOT_GAP
      const slotRight = inst.k.width() - RIGHT_MARGIN - 40
      return (slotLeft + Math.max(slotLeft + 40, slotRight)) / 2
    })()
  FpsCounter.layoutAtScreenCenterX(fps, centerX)
}
//
// Creates the GLOW HUD row. G starts as a five-part loader until collected.
//
function createGlowLevelIndicator(k, goldRgb, completedLetters, colorWorld = false) {
  //
  // Rebake the gray teacher silhouette with glow-specific fringe cleanup.
  //
  k._lifeDesatReady = false
  k._lifeDesatPromise = null
  //
  // The HUD small hero and GLOW label mirror the playable hero: whitish body
  // with grey eye whites — they stay white even once the world colours.
  //
  const indicator = LevelIndicator.create({
    k,
    levelNumber: -1,
    sectionLabel: 'GLOW',
    activeColor: HERO_BODY_COLOR,
    inactiveColor: GLOW_PAL.decorGray,
    completedColor: GLOW_HUD_COLLECTED_LETTER_HEX,
    heroBodyColor: HERO_BODY_COLOR,
    heroOutlineColor: HERO_OUTLINE_COLOR,
    heroEyeWhiteColor: HERO_BODY_COLOR,
    heroPostBakeCanvas: applyGlowHudSharpBake,
    hudPostBakeCanvas: applyGlowHudSharpBake,
    lifeDesatPostBake: finishGlowLifeDesatCanvas,
    //
    // Same white-with-black-shadow look as the GLOW HUD letters, always on —
    // the score numerals no longer drop their shadow before colour world.
    //
    scoreColorHex: HERO_BODY_COLOR,
    hudScoreFlat: false,
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
  //
  // G stays gray until the x/8 loader fills or the letter is collected.
  //
  LevelIndicator.setHudLetterColor(
    indicator.letterObjects?.[0],
    completedLetters >= 1 ? GLOW_HUD_COLLECTED_LETTER_HEX : GLOW_PAL.decorGray
  )
  return indicator
}
//
// Screen-space centre of one GLOW HUD glyph, using the live letter box so
// the tooltip ear leaves the middle of the character rather than its cell.
//
function glowHudLetterHoverPos(inst, index) {
  const letter = inst.levelIndicator?.letterObjects?.[index]
  if (letter?.exists?.()) {
    return { x: letter.pos.x, y: letter.pos.y }
  }
  return {
    x: glowHudLetterCenterX(index),
    y: GLOW_HUD_FPS_TOP_Y
  }
}
//
// Screen-space hit box for one baked GLOW HUD glyph (sprite anchor is center).
//
function glowHudLetterHoverSize(inst, index) {
  const letter = inst.levelIndicator?.letterObjects?.[index]
  const fallbackW = GLOW_HUD_LABEL_FONT_SIZE * 0.65
  const fallbackH = GLOW_HUD_LABEL_FONT_SIZE * 1.2
  if (!letter?.exists?.()) {
    return { w: fallbackW, h: fallbackH }
  }
  const w = letter.width > 0 ? letter.width : fallbackW
  const h = letter.height > 0 ? letter.height : fallbackH
  return { w, h }
}
//
// Base HUD letter tooltip lines plus partial fill progress (e.g. "Explore — 2/6").
//
const GLOW_HUD_FILL_PROGRESS_SEP = ' — '
const GLOW_HUD_LETTER_TOOLTIP_BASE = [
  GLOW_INDICATOR_TOOLTIP_AFTER_G,
  GLOW_INDICATOR_TOOLTIP_AFTER_L,
  GLOW_INDICATOR_TOOLTIP_AFTER_O,
  GLOW_INDICATOR_TOOLTIP_AFTER_W
]
function glowHudLetterFillProgress(inst, index) {
  const z = inst.zones
  if (index === 0) {
    const total = GLOW_HUD_G_FILL_PARTS
    const parts = z.gCollected ? total : (inst._hudGFillParts || 0)
    return {
      parts,
      total,
      collected: z.gCollected,
      blocked: isGlowGLetterUnveiled(inst)
    }
  }
  if (index === 1) {
    const total = GLOW_HUD_L_FILL_PARTS
    const parts = z.lCollected ? total : (inst._hudLFillParts || 0)
    return {
      parts,
      total,
      collected: z.lCollected,
      blocked: false
    }
  }
  if (index === 2) {
    const total = GLOW_HUD_O_FILL_PARTS
    const parts = z.oCollected ? total : (inst._hudOFillParts || 0)
    return {
      parts,
      total,
      collected: z.oCollected,
      blocked: false
    }
  }
  const total = GLOW_HUD_W_FILL_PARTS
  const parts = z.wCollected ? total : countGlowHudWFillParts(inst)
  return {
    parts,
    total,
    collected: z.wCollected,
    blocked: false
  }
}
function glowHudLetterTooltipVisible(inst, index) {
  const letter = inst.levelIndicator?.letterObjects?.[index]
  if (!letter?.exists?.() || letter.hidden) return false
  return true
}
function formatGlowHudFillProgress(parts, total) {
  return `${parts}/${total}`
}
function glowHudLetterTooltipText(inst, index) {
  const base = GLOW_HUD_LETTER_TOOLTIP_BASE[index] || ''
  const p = glowHudLetterFillProgress(inst, index)
  if (p.total <= 0) return base
  return `${base}${GLOW_HUD_FILL_PROGRESS_SEP}${formatGlowHudFillProgress(p.parts, p.total)}`
}
//
// Active partial HUD letter fill for the hero-attached counter (one at a time).
//
function activeGlowHudLetterFillForHero(inst) {
  if (isGlowRightTrampHeroCounterRetired(inst)) return null
  const eyesUnlocked = isGlowEyesGameplayUnlocked(inst.zones)
  if (!eyesUnlocked) {
    const gOnly = glowHudLetterFillProgress(inst, 0)
    if (!gOnly.collected && gOnly.parts > 0 && gOnly.parts < gOnly.total) return gOnly
    return null
  }
  const tw = inst.trampWalk
  const trampBounceOnHero = tw && inst.zones?.oCollected && !tw.walked &&
    (tw.singCount || 0) > 0 && (tw.singCount || 0) < TRAMP_WALK_BOUNCES_TOTAL
  if (trampBounceOnHero) return null
  if (!inst.zones.lCollected) {
    const lProgress = glowHudLetterFillProgress(inst, 1)
    if (lProgress.parts > 0 && lProgress.parts < lProgress.total) return lProgress
  }
  for (let i = 0; i < GLOW_HUD_LETTER_COUNT; i++) {
    const p = glowHudLetterFillProgress(inst, i)
    if (p.blocked || p.collected) continue
    if (p.parts > 0 && p.parts < p.total) return p
  }
  return null
}
//
// Shows "n / total" beside the hero while a HUD letter is partially filled.
//
function hideGlowHudLetterFillCounter(inst) {
  inst.hudLetterFillCounter && HeroCounter.hide(inst.hudLetterFillCounter)
}
function updateGlowHudLetterFillCounter(inst) {
  if (inst.deathHandled || inst.touchDeathHandled) {
    hideGlowHudLetterFillCounter(inst)
    return
  }
  const char = inst.heroInst?.character
  const fill = activeGlowHudLetterFillForHero(inst)
  if (!fill || !char?.pos) {
    hideGlowHudLetterFillCounter(inst)
    return
  }
  const label = formatGlowHudFillProgress(fill.parts, fill.total)
  const useGold = isGlowHeroCounterGold(inst)
  const color = useGold ? inst.goldRgb : getRGB(inst.k, CFG.visual.colors.hero.eyeWhite)
  const outline = useGold ? VOID : getRGB(inst.k, GLOW_PAL.void)
  if (!inst.hudLetterFillCounter) {
    inst.hudLetterFillCounter = HeroCounter.create({
      k: inst.k,
      size: MEDITATION_TIMER_FONT,
      font: GLOW_LETTER_FONT,
      color,
      outlineColor: outline,
      yOffset: GLOW_HERO_COUNTER_Y_OFFSET
    })
  }
  const ctr = inst.hudLetterFillCounter
  ctr.color = color
  ctr.outlineColor = outline
  const hx = Math.round(char.pos.x)
  const hy = Math.round(char.pos.y)
  HeroCounter.update(ctr, label, hx, hy)
  syncHeroCounterPalette(ctr, color, outline)
}
//
// Re-applies counter colours when the world toggles gray ↔ gold.
//
function syncHeroCounterPalette(ctr, color, outline) {
  if (!ctr?.textObj?.exists?.()) return
  const k = ctr.k
  ctr.textObj.color = k.rgb(color.r, color.g, color.b)
  ctr.outlineObjs.forEach(obj => {
    obj.exists?.() && (obj.color = k.rgb(outline.r, outline.g, outline.b))
  })
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
// Burst centred on a baked GLOW HUD glyph (pos is already the sprite centre).
//
function flashGlowHudLetterBurst(inst, letterIndex) {
  const letter = inst.levelIndicator?.letterObjects?.[letterIndex - 1]
  if (!letter?.exists?.() || !inst.k) return
  const colorHex = inst.levelIndicator?.sectionLabelActiveColor || HERO_BODY_COLOR
  LevelIndicator.flashWorldLetterBurst(inst.k, letter.pos.x, letter.pos.y, colorHex, true)
}
//
// World pickup burst + soft chime on the letter glyph (not the hero fill FX).
//
function playGlowLetterWorldPickupFx(inst, entry) {
  if (!entry) return
  Sound.playLetterPickupSoft(inst.sound)
  LevelIndicator.flashWorldLetterBurst(
    inst.k,
    entry.x,
    entry.y,
    entry.colorHex || HERO_BODY_COLOR,
    false
  )
}
//
// Backfills G HUD cave steps after reload (pit open / branch launch).
//
function restoreGlowHudGCaveIntroFromPersisted(inst) {
  const pit = inst.pit
  if (pit?.collapsed) markGlowHudGCaveEntered()
  if (pit?.pitCaveMushroomDone || inst.treeRevealFromBranchTramp) markGlowHudGPitMushLaunch()
}
//
// How many gray-world map parts are open (cave intro, 3 tree landings, lake
// shore, right ground strip, branch trampoline). Caps at GLOW_HUD_G_FILL_PARTS.
//
function isGlowGLetterUnveiled(inst) {
  if (!inst?.zones || inst.zones.gCollected) return false
  return glowThreeZonesExplored(inst)
}
function countGlowHudGFillParts(inst) {
  const introParts = countGlowHudGCaveIntroParts()
  if (!isGlowEyesGameplayUnlocked(inst.zones)) {
    return Math.min(GLOW_HUD_G_FILL_PARTS, introParts)
  }
  const z = inst.zones
  if (z?.gCollected) return GLOW_HUD_G_FILL_PARTS
  if (isGlowGLetterUnveiled(inst)) return GLOW_HUD_G_FILL_PARTS
  const treeParts = (z?.tree || inst.treeDrawMonolith)
    ? TreeSegments.TREE_REVEAL_PART_COUNT
    : Math.min(TreeSegments.TREE_REVEAL_PART_COUNT, countGlowBranchTreePartsRevealed(inst))
  const leftPart = z?.waterDiscovered ? 1 : 0
  const rightPart = (z?.groundRightStripMax ?? -1) >= 0 ? 1 : 0
  const branchPart = z?.branchTrampRevealed ? 1 : 0
  const worldParts = introParts + treeParts + leftPart + rightPart + branchPart
  return Math.min(GLOW_HUD_G_FILL_PARTS, worldParts)
}
//
// L HUD fill (x/5): mud jump, right spirit/tramp reveal, middle chain eye, left chain eye, L log.
//
function countGlowHudLFillParts(inst) {
  const z = inst.zones
  if (z?.lCollected) return GLOW_HUD_L_FILL_PARTS
  let n = 0
  z?.mudPredatorJumpedOver && n++
  (z?.rightTrampRevealed || isRightTrampolineVisible(z)) && n++
  z?.chainMiddleEyeStepped && n++
  z?.chainLeftEyeStepped && n++
  z?.lPlatStepped && n++
  return Math.min(GLOW_HUD_L_FILL_PARTS, n)
}
function glowHudLTrampJumped(z) {
  if (get(KEY_HUD_L_TRAMP_JUMPED, false)) return true
  if (!z?.rightTrampBounceLive) return false
  if (z.lPlatRevealed || z.lPlatStepped || get(KEY_TRAMP_WALKED, false)) {
    set(KEY_HUD_L_TRAMP_JUMPED, true)
    return true
  }
  return false
}
//
// O HUD fill: same stepped progress as meditationCountdownFade (2nd heartbeat
// beat each second). A broken countdown wipes the letter back to gray.
//
function countGlowHudOFillParts(inst) {
  const z = inst.zones
  if (z?.oCollected || z?.oZone) return GLOW_HUD_O_FILL_PARTS
  if (inst.meditation?.countdown == null) return 0
  const fade = meditationCountdownFade(inst)
  return Math.min(GLOW_HUD_O_FILL_PARTS, Math.round(fade * GLOW_HUD_O_FILL_PARTS))
}
//
// W HUD fill: one segment per post-O bounce on the right trampoline.
//
function countGlowHudWFillParts(inst) {
  const z = inst.zones
  if (z?.wCollected || inst.trampWalk?.walked) return GLOW_HUD_W_FILL_PARTS
  if (!z?.oCollected) return 0
  const tw = inst.trampWalk
  if (!tw) return 0
  const completed = tw.singCount || 0
  return Math.min(GLOW_HUD_W_FILL_PARTS, completed)
}
//
// Opaque-pixel box of a HUD glyph, so gold bands follow the letter ink.
//
function hudLetterInkBox(ch) {
  if (hudLetterInkBoxCache[ch]) return hudLetterInkBoxCache[ch]
  const fontSize = GLOW_HUD_LABEL_FONT_SIZE
  const pad = 4
  const probe = document.createElement('canvas').getContext('2d')
  probe.font = `${fontSize}px ${CFG.visual.fonts.thinFull}`
  const bakedW = Math.ceil(probe.measureText(ch).width + pad * 2)
  const bakedH = Math.ceil(fontSize * 1.2 + pad * 2)
  const canvas = toCanvas({ width: bakedW, height: bakedH, pixelRatio: 1 }, (ctx) => {
    ctx.font = `${fontSize}px ${CFG.visual.fonts.thinFull}`
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = '#ffffff'
    ctx.fillText(ch, bakedW / 2, bakedH / 2)
  })
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const image = ctx.getImageData(0, 0, bakedW, bakedH)
  const px = image.data
  let minX = bakedW
  let minY = bakedH
  let maxX = 0
  let maxY = 0
  for (let y = 0; y < bakedH; y++) {
    for (let x = 0; x < bakedW; x++) {
      if (px[(y * bakedW + x) * 4 + 3] < GLOW_HUD_INK_ALPHA_MIN) continue
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
    : { x: 0, y: 0, w: bakedW * 0.55, h: bakedH * 0.72 }
  hudLetterInkBoxCache[ch] = box
  return box
}
//
// Gold overlay clipped to the bottom n/parts of the HUD letter cell.
// Bands are equal slices of the live glyph box so fill grows from the
// visual foot of the letter upward — the last band is the top, not the base.
//
function drawHudLetterGoldFill(k, letter, ch, n, parts, fillHex = HERO_BODY_COLOR) {
  if (!letter?.exists?.() || n <= 0) return
  const bake = letter._hudLetterBake
  if (!bake) return
  const ink = hudLetterInkBox(ch)
  const fillH = Math.max(1, Math.round(ink.h * n / parts))
  const clipX = bake.x + ink.x - GLOW_HUD_FILL_CLIP_PAD
  const clipY = bake.y + ink.y + ink.h - fillH
  const clipW = ink.w + GLOW_HUD_FILL_CLIP_PAD * 2
  const goldSprite = LevelIndicator.ensureHudLetterGoldFillSprite(
    k,
    ch,
    GLOW_HUD_LABEL_FONT_SIZE,
    GLOW_HUD_LABEL_FONT,
    fillHex,
    applyGlowHudSharpBake
  )
  k.drawMasked(() => {
    k.drawSprite({
      sprite: goldSprite,
      pos: letter.pos,
      anchor: 'center',
      width: bake.bakedW,
      height: bake.bakedH
    })
  }, () => {
    k.drawRect({
      pos: k.vec2(clipX, clipY),
      width: clipW,
      height: fillH
    })
  })
}
//
// Rebakes every GLOW HUD glyph — gray until partial fill or collection, white
// when a letter is complete (G: 8/8 loader or picked up).
//
function glowHudLetterFillPartsLive(inst, index) {
  if (index === 0) return inst._hudGFillParts || 0
  if (index === 1) return inst._hudLFillParts || 0
  if (index === 2) return inst._hudOFillParts || 0
  return inst._hudWFillParts || 0
}
function glowHudLetterFillTotal(index) {
  if (index === 0) return GLOW_HUD_G_FILL_PARTS
  if (index === 1) return GLOW_HUD_L_FILL_PARTS
  if (index === 2) return GLOW_HUD_O_FILL_PARTS
  return GLOW_HUD_W_FILL_PARTS
}
function syncGlowHudLetterColors(inst) {
  const letters = inst.levelIndicator?.letterObjects
  if (!letters?.length) return
  const z = inst.zones
  const collected = [z.gCollected, z.lCollected, z.oCollected, z.wCollected]
  letters.forEach((letter, i) => {
    const parts = glowHudLetterFillPartsLive(inst, i)
    const total = glowHudLetterFillTotal(i)
    let colorHex = GLOW_PAL.decorGray
    if (collected[i] || parts >= total) {
      colorHex = GLOW_HUD_COLLECTED_LETTER_HEX
    }
    LevelIndicator.setHudLetterColor(letter, colorHex)
  })
}
//
// Drop shadow only after the letter is actually collected — not while the
// loader is merely full.
//
function syncGlowHudLetterShadows(inst) {
  const indicator = inst.levelIndicator
  if (!indicator?.hideInactiveLetterShadow) return
  const collected = [
    inst.zones.gCollected,
    inst.zones.lCollected,
    inst.zones.oCollected,
    inst.zones.wCollected
  ]
  const gParts = inst._hudGFillParts || 0
  const gLoaderComplete = !inst.zones.gCollected && gParts >= GLOW_HUD_G_FILL_PARTS
  indicator.letterOutlineObjects?.forEach((outline, i) => {
    const showShadow = collected[i] || (i === 0 && gLoaderComplete)
    outline?.exists?.() && (outline.hidden = !showShadow)
  })
}
//
// Applies G/L/O/W loader tints during update, before the HUD letters draw.
//
function tintGlowHudLoaderLetters(inst) {
  syncGlowHudLetterColors(inst)
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
    drawHudLetterGoldFill(
      k,
      letters?.[0],
      'G',
      gParts,
      GLOW_HUD_G_FILL_PARTS,
      GLOW_HUD_COLLECTED_LETTER_HEX
    )
  !inst.zones.lCollected && lParts > 0 && lParts < GLOW_HUD_L_FILL_PARTS &&
    drawHudLetterGoldFill(k, letters?.[1], 'L', lParts, GLOW_HUD_L_FILL_PARTS)
  !inst.zones.oCollected && oParts > 0 && oParts < GLOW_HUD_O_FILL_PARTS &&
    drawHudLetterGoldFill(k, letters?.[2], 'O', oParts, GLOW_HUD_O_FILL_PARTS)
  !inst.zones.wCollected && wParts > 0 &&
    drawHudLetterGoldFill(
      k,
      letters?.[3],
      'W',
      Math.min(wParts, GLOW_HUD_W_FILL_PARTS),
      GLOW_HUD_W_FILL_PARTS
    )
}
//
// Hides the gold-band HUD drawer once every letter is fully filled or collected.
//
function syncGlowHudLetterFillDrawerHidden(inst) {
  const drawer = inst.hudLetterFillDrawer
  if (!drawer) return
  const z = inst.zones
  const gParts = inst._hudGFillParts || 0
  const g = !z.gCollected && gParts > 0 && gParts < GLOW_HUD_G_FILL_PARTS
  const l = !z.lCollected && (inst._hudLFillParts || 0) > 0 && (inst._hudLFillParts || 0) < GLOW_HUD_L_FILL_PARTS
  const o = !z.oCollected && (inst._hudOFillParts || 0) > 0 && (inst._hudOFillParts || 0) < GLOW_HUD_O_FILL_PARTS
  const w = !z.wCollected && (inst._hudWFillParts || 0) > 0
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
    flashGlowHudLetterBurst({ levelIndicator: indicator, k: inst.k }, 3)
  syncGlowHudLetterFillDrawerHidden(inst)
}
//
// W loader: one segment per post-O bounce on the right trampoline.
//
function syncGlowHudWFill(inst, burst = true) {
  const z = inst.zones
  if (!z?.oCollected) {
    inst._hudWFillParts = 0
    return
  }
  const indicator = inst.levelIndicator
  if (!indicator) return
  ensureGlowHudLetterFillDrawer(inst)
  const live = countGlowHudWFillParts(inst)
  if (inst._hudWFillSaved == null) {
    inst._hudWFillSaved = Math.min(
      GLOW_HUD_W_FILL_PARTS,
      Number(get(KEY_HUD_W_FILL, 0)) || 0
    )
  }
  const wParts = Math.max(live, inst._hudWFillSaved)
  const prevBand = Math.floor(inst._hudWFillParts ?? 0)
  const nextBand = Math.floor(wParts)
  const prevW = inst._hudWFillParts
  inst._hudWFillParts = wParts
  const persist = Math.min(GLOW_HUD_W_FILL_PARTS, inst.trampWalk?.singCount || 0)
  if (persist !== inst._hudWFillPersisted) {
    inst._hudWFillPersisted = persist
    inst._hudWFillSaved = persist
    set(KEY_HUD_W_FILL, persist)
  }
  tintGlowHudLoaderLetters(inst)
  burst && prevW != null && nextBand > prevBand &&
    flashGlowHudLetterBurst({ levelIndicator: indicator, k: inst.k }, 4)
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
  show && revealGlowTeacherHudIfNeeded(inst)
}
//
// Life icon appears together with the GLOW label — teacher hints anchor here.
//
function revealGlowTeacherHudIfNeeded(inst) {
  const indicator = inst.levelIndicator
  if (!indicator || indicator.lifeRevealed) return
  LevelIndicator.revealLifeHud(indicator, !inst.zones.colorWorld)
  const score = get('lifeScore', 0)
  indicator.updateLifeScore?.(score)
  syncGlowLifeScoreVisibility(indicator, score)
  set(KEY_LIFE_SHOWN, true)
  syncGlowPitCaveFlagForTeacherHints(inst)
  onGlowTeacherLifeHudRevealed(inst)
}
//
// The death-count numeral next to the eye only makes sense once the hero has
// actually died at least once — showing "0" from the start reads as noise.
//
function syncGlowLifeScoreVisibility(indicator, score) {
  if (!indicator) return
  const show = score > 0
  indicator.lifeScoreText && (indicator.lifeScoreText.hidden = !show)
  indicator.lifeScoreOutlines?.forEach(o => { o.hidden = !show })
}
//
// Life HUD for pit-mushroom nudges — eyes can be collected before any G fill.
//
function revealGlowTeacherHudForExplorationHintsIfNeeded(inst) {
  const indicator = inst.levelIndicator
  if (!indicator || indicator.lifeRevealed) return
  const z = inst.zones
  const gProgress =
    isGlowEyesGameplayUnlocked(z) && !z.gCollected && !isGlowGLetterUnveiled(inst)
  const caveEntranceProgress = glowTeacherCaveEntranceAutoHintEligible(inst, false)
  const postTreeMushProgress = glowTeacherPostTreeMushAutoHintEligible(inst, false)
  const bigTreeOnlyGStall = glowTeacherBigTreeBranchOnlyStall(inst)
  if (!gProgress && !isGlowPitMushroomUnlocked(inst) && !caveEntranceProgress &&
    !postTreeMushProgress && !bigTreeOnlyGStall) {
    return
  }
  LevelIndicator.revealLifeHud(indicator, !inst.zones.colorWorld)
  const score = get('lifeScore', 0)
  indicator.updateLifeScore?.(score)
  syncGlowLifeScoreVisibility(indicator, score)
  set(KEY_LIFE_SHOWN, true)
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
}
//
// Updates G/L/W fill counts and flashes a HUD letter when a new band opens.
//
function syncGlowHudLetterFills(inst, burst = true) {
  const indicator = inst.levelIndicator
  if (!indicator) return
  if (!isGlowEyesGameplayUnlocked(inst.zones)) {
    const gParts = resolvedHudFillParts(
      countGlowHudGFillParts(inst), KEY_HUD_G_FILL, GLOW_HUD_G_FILL_PARTS
    )
    const prevG = inst._hudGFillParts
    inst._hudGFillParts = gParts
    inst._hudLFillParts = 0
    inst._hudWFillParts = 0
    gParts > 0 && persistHudLetterFills(inst)
    ensureGlowHudLetterFillDrawer(inst)
    syncGlowHudLabelVisibility(inst)
    syncGlowHudLetterFillDrawerHidden(inst)
    burst && prevG != null && gParts > prevG && flashGlowHudLetterBurst(inst, 1)
    gParts > 0 && updateGlowHudLetterFillCounter(inst)
    return
  }
  ensureGlowHudLetterFillDrawer(inst)
  const gParts = resolvedHudFillParts(
    countGlowHudGFillParts(inst), KEY_HUD_G_FILL, GLOW_HUD_G_FILL_PARTS
  )
  const lParts = resolvedHudFillParts(
    countGlowHudLFillParts(inst), KEY_HUD_L_FILL, GLOW_HUD_L_FILL_PARTS
  )
  const prevG = inst._hudGFillParts
  const prevL = inst._hudLFillParts
  inst._hudGFillParts = gParts
  inst._hudLFillParts = lParts
  persistHudLetterFills(inst)
  syncGlowHudOFill(inst, burst)
  syncGlowHudWFill(inst, burst)
  tintGlowHudLoaderLetters(inst)
  syncGlowHudLetterShadows(inst)
  syncGlowHudLabelVisibility(inst)
  burst && prevG != null && gParts > prevG &&
    flashGlowHudLetterBurst(inst, 1)
  burst && prevL != null && lParts > prevL &&
    flashGlowHudLetterBurst(inst, 2)
  syncGlowHudLetterFillDrawerHidden(inst)
  updateGlowHudLetterFillCounter(inst)
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
//
// Letter-caption duck/fade owns birds volume until restore finishes.
//
function isGlowBirdsVolumeCaptionManaged(inst) {
  if (!inst) return false
  if (inst.letterCaptionActive) return true
  if (inst._dialogAudioRestoreRaf) return true
  const birds = inst.birdsMusic
  return birds?._dialogDuckSaved != null
}
function createGlowBirdsLoopAudio() {
  const audio = new Audio(GLOW_BIRDS_AUDIO_SRC)
  audio.loop = true
  audio.volume = 0
  ensureGlowBirdsPlaybackRate(audio)
  return audio
}
function stopGlowBirdsLoopAudio(audio) {
  if (!audio) return
  audio._dialogDuckSaved = null
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
// Resets birds.mp3 before the post-L stillness countdown swells them in.
//
function startBirdsMusic(birdsMusic) {
  birdsMusic && (birdsMusic.volume = 0)
}
//
// Snaps birds.mp3 to the volume implied by glowBirdsMusicLife (reload / colour world).
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
// pads stay silent — the swamp spirit covers the branch beat.
//
function updateGlowProximitySound(inst, char) {
  if (inst.dialogOpen || inst.drowning || inst.sound?._glowSfxMuted || !char?.pos) {
    Sound.stopAmbient(inst.sound)
    return
  }
  const targetXs = []
  //
  // Eyeless intro: hum at the cave mouth once the hero reaches the right edge.
  //
  isGlowEyeIntroCaveActive(inst) && !inst.pit?.collapsed &&
    appendGlowProximityTarget(targetXs, (getCrackZone(WORLD_W, FLOOR_Y).x1 + getCrackZone(WORLD_W, FLOOR_Y).x2) * 0.5)
  if (!inst.pit?.collapsed) {
    const cave = getCrackZone(WORLD_W, FLOOR_Y)
    !isGlowEyeIntroPending(inst.zones) &&
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
function pitCaveSkeletonTooltipPos(inst) {
  const pit = inst.pit
  if (!pit) return { x: -1000, y: -1000 }
  const sk = ensurePitCaveSkeletonLayout(pit)
  return {
    x: sk.x,
    y: sk.y + sk.skullR * SKELETON_TOOLTIP_BODY_CENTER_R
  }
}
//
// Cave skeleton tooltip: visible once the pit mouth or cracks can be seen.
//
function pitCaveSkeletonTooltipVisible(inst) {
  if (!inst.pit || inst.dialogOpen) return false
  if (inst.pit.pitCaveSkeletonAutoHintTooltip) return false
  return shouldShowPitCaveSkeleton(inst.pit)
}
//
// Life-icon hover replays the latest teacher nudge (if any).
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
  const text = inst.lastGlowTeacherHintText ?? ''
  return glowTeacherHudHoverReplayAllowed(inst, text) ? text : ''
}
function glowTeacherHudHoverVisible(inst) {
  if (!inst.levelIndicator?.lifeRevealed || inst.dialogOpen) return false
  if (inst._glowTeacherHintActive && HeroHint.isActive(inst.heroHint)) return false
  if (glowTeacherCaveMushroomHoverEligible(inst)) return true
  return Boolean(glowTeacherHudHoverText(inst))
}
//
// Stale post-L copy must not replay on the life icon once O exists or is taken.
//
function glowTeacherHudHoverReplayAllowed(inst, text) {
  if (!text) return false
  if (text === GLOW_TEACHER_HINT_AFTER_L && (inst.zones.oZone || inst.zones.oCollected)) return false
  if (text === GLOW_TEACHER_HINT_CAVE_ENTRANCE_TEXT &&
    !glowTeacherCaveEntranceAutoHintEligible(inst, false)) {
    return false
  }
  return true
}
//
// After two auto mushroom hints, hover on the teacher replays it while still in the cave.
//
function glowTeacherCaveMushroomHoverEligible(inst) {
  const pit = inst.pit
  if (!pit?.collapsed || !inst._inGlowPitCave) return false
  if (!isGlowPitMushroomUnlocked(inst) || pit.pitCaveMushroomDone) return false
  return Boolean(pit.pitCaveMushroomHintPausedUntilExit)
}
//
// Skeleton hover copy — eyes request before pickup, tired line after.
//
function pitCaveSkeletonTooltipText(inst) {
  const hasEyes = glowHeroHasCollectedEyes(inst.zones, inst.heroInst)
  return hasEyes ? SKELETON_TOOLTIP_TEXT : SKELETON_TOOLTIP_NEED_EYES_TEXT
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
  if (isGlowBirdsVolumeCaptionManaged(inst)) return
  const birds = inst.birdsMusic
  if (!birds) return
  const life = glowBirdsMusicLife(inst)
  if (life < 0.02) {
    birds.volume = 0
    inst.meditationBirdsActive = false
    return
  }
  inst.sound && Sound.resumeAudioContext(inst.sound)
  setGlowBirdsLoopVolume(birds, CFG.audio.backgroundMusic.birds * life)
  inst.meditationBirdsActive = true
}
//
// Mutes the meditation swell (timer interrupted or O already claimed)
//
function stopMeditationBirds(inst) {
  if (!inst.meditationBirdsActive) return
  inst.meditationBirdsActive = false
  if (inst.zones.oCollected || inst.zones.oZone || inst.zones.colorWorld) return
  const birds = inst.birdsMusic
  if (!birds) return
  birds.volume = 0
}
//
// Hermite ease for meditation colour preview (0 at start, 1 at timer zero).
//
function smoothstep01(t) {
  const x = Math.max(0, Math.min(1, t))
  return x * x * (3 - 2 * x)
}
//
// Colour preview progress while the post-L stillness countdown runs — steps
// on the second beat of each heartbeat pair (see playHeartbeatSound).
//
function meditationCountdownFade(inst) {
  const remaining = inst.meditation?.countdown
  if (remaining == null) return 0
  const elapsed = MEDITATION_COUNTDOWN - Math.max(0, remaining)
  const fullSec = Math.floor(elapsed)
  const frac = elapsed - fullSec
  const stepsDone = fullSec + (frac >= MEDITATION_HEARTBEAT_SECOND_BEAT_S ? 1 : 0)
  const step = Math.min(MEDITATION_COUNTDOWN, stepsDone) / MEDITATION_COUNTDOWN
  return step
}
//
// 0→1 while the post-L stillness countdown runs; 0 before it starts so grass,
// rocks and birds ease in with the timer (underground uses glowPostLUndergroundRevealFade).
//
function glowPostLRevealFade(inst) {
  const z = inst?.zones
  if (!z?.lCollected || z.oZone || z.oCollected) return 1
  return inst.meditation?.countdown != null ? meditationCountdownFade(inst) : 0
}
//
// Underground bones, rocks and rootlets appear the instant L is collected.
//
function glowPostLUndergroundRevealFade(inst) {
  const z = inst?.zones
  if (!z?.lCollected || z.oZone || z.oCollected) return 1
  return 1
}
//
// Post-L ground darkening toward the root-zone earth tone — applied at full
// strength the instant L is collected, independent of the later stillness
// countdown (that countdown still gates the separate roots/decor reveal via
// glowPostLRevealFade).
//
function glowGroundDarkenAmount(inst) {
  return inst?.zones?.lCollected ? GROUND_L_DARKEN : 0
}
//
// Gray-phase ground colour before the colour-world fade lerps in.
//
function glowGrayGroundRgb(inst, innerGray) {
  if (!innerGray) return VOID
  const darken = glowGroundDarkenAmount(inst)
  return darken > 0 ? lerpRgb(INNER_GRAY, VOID, darken) : INNER_GRAY
}
//
// Root mass fades in with the post-L stillness countdown; locked at full after O.
//
function glowTreeRootRevealFade(inst) {
  const z = inst?.zones
  if (!z?.gCollected && !z?.lCollected) return 0
  if (z.lCollected) return 1
  return z.gUndergroundLive ? 1 : 0
}
//
// True once the post-L stillness countdown (or later beats) unlock surface decor.
//
function isGlowWorldSurfaceDecorUnlocked(inst) {
  const z = inst?.zones
  return Boolean(z?.lCollected)
}
//
// Underground roots/rocks preview after G (full strip once the hero is on the ground).
//
function isGlowUndergroundLayerVisible(inst) {
  if (isGlowEyeIntroBareWorld(inst)) return false
  const z = inst?.zones
  if (!z?.gCollected) return false
  if (isGlowWorldSurfaceDecorUnlocked(inst)) return true
  return Boolean(z.gUndergroundLive)
}
//
// First grounded landing after G reveals the underground decor band.
//
function maybeRevealGlowUndergroundAfterG(inst, grounded) {
  const z = inst.zones
  if (!z.gCollected || z.gUndergroundLive) return
  if (!grounded) return
  z.gUndergroundLive = true
  set(KEY_G_UNDERGROUND_LIVE, true)
  !inst.treeDrawMonolith && ensureGlowTreeRootsSegment(inst)
  applyZoneVisibility(inst)
  inst.treeDrawMonolith ? syncMonolithicTreeGraySprite(inst) : syncTreeSegmentGraySprites(inst)
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
  if (worldX == null || !inst.zones?.gCollected) return false
  const floorEndX = getGlowCaveMouthFloorLeftX(getCrackZone(WORLD_W, FLOOR_Y))
  return worldX >= LEFT_MARGIN && worldX <= floorEndX
}
//
// 0 before the post-L countdown except the ground-peek band after G.
//
function glowSurfaceDecorFadeAt(inst, worldX) {
  if (isGlowWorldSurfaceDecorUnlocked(inst)) {
    const z = inst.zones
    if (z.lCollected && !z.oZone && !z.oCollected) return glowPostLRevealFade(inst)
    return 1
  }
  return isGlowWorldXInGroundPeekZone(inst, worldX) ? 1 : 0
}
//
// Platform / log decor switches to shaded silhouettes immediately on L.
//
function glowPostLPlatformShadeReveal(sc) {
  return sc?.zones?.lCollected ? 1 : 0
}
//
// Grass colour crossfade runs only while the post-L countdown is active.
//
function glowGrassColorFade(sc, zones) {
  if (!sc) return 0
  const fade = sc.colorFade ?? 0
  if (zones.colorWorld || zones.oZone || zones.oCollected) return fade
  if (glowGrassPostLStrawFieldReady(zones, sc)) return 1
  if (zones.lCollected && fade >= 1 - COLOR_CROSSFADE_EPS) return fade
  if (!zones.lCollected) return fade
  if (sc.meditation?.countdown == null) return 0
  return fade
}
//
// Foreground grass turns leaf-green as soon as it starts swaying (meditation
// countdown), even before the full colour world has finished fading in.
//
function glowGrassGreenFade(sc, zones) {
  if (zones.colorWorld) return 1
  if (sc && isGlowFlatSingleDecorColor(sc)) return 0
  const base = glowGrassColorFade(sc, zones)
  const sway = glowMeditationWorldLife(sc)
  return sway > 0 ? Math.max(base, sway) : base
}
//
// Crossfades flat pre-L decor sprites into their shaded post-L variants.
//
function drawPostLGrayDecorBaked(k, sc, flatBaked, shadedBaked, pos, anchor, angle, opacity, color) {
  const reveal = glowPostLPlatformShadeReveal(sc)
  const z = sc?.zones
  if (!z?.lCollected || reveal >= 1) {
    const baked = z?.lCollected ? shadedBaked : flatBaked
    drawDecorAtlasSprite(k, baked, pos, anchor, angle, opacity, color)
    return
  }
  if (reveal <= 0) {
    drawDecorAtlasSprite(k, flatBaked, pos, anchor, angle, opacity, color)
    return
  }
  drawDecorAtlasSprite(k, flatBaked, pos, anchor, angle, opacity * (1 - reveal), color)
  drawDecorAtlasSprite(k, shadedBaked, pos, anchor, angle, opacity * reveal, color)
}
//
// Clamped colour-fade value shared by every gray↔colour crossfade.
//
function glowDecorFade(inst) {
  return Math.max(0, Math.min(1, inst?.colorFade ?? 0))
}
//
// Lake, and trampolines share the same colour fade as the O-beat
// world (full once L is taken — see applyGlowPostLLitState / revealOZone).
//
function glowLZoneDecorFade(inst) {
  const z = inst?.zones
  if (z?.colorWorld || z?.oCollected || z?.oZone) return 1
  if (z?.lCollected) return glowDecorFade(inst)
  return glowDecorFade(inst)
}
//
// Tree colour crossfade: the tree switches to its warm lit (sand) palette
// the instant L is collected (see syncMonolithicTreeGraySprite), but only
// turns green once the post-L stillness countdown actually starts — an
// immediate green crown on an otherwise flat gray world reads as a jarring
// colour clash instead of a gradual "light reveals colour" beat.
//
function glowTreeColorFade(inst) {
  const z = inst?.zones
  if (z?.oZone || z?.oCollected || z?.colorWorld) return 1
  if (z?.lCollected && glowDecorFade(inst) >= 1 - COLOR_CROSSFADE_EPS) return 1
  if (z?.lCollected && inst?.meditation?.countdown == null) return 0
  return glowDecorFade(inst)
}
//
// True while the post-L stillness countdown drives the colour preview.
//
function isGlowMeditationColorPreview(inst) {
  const z = inst?.zones
  if (!z) return false
  return z.lCollected && !z.oZone && !z.oCollected && inst.meditation?.countdown != null
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
  if (z.lCollected) {
    inst._meditationPreviewFadingOut = false
    const held = glowDecorFade(inst)
    const fade = z.oZone ? 1 : (held >= 1 - COLOR_CROSSFADE_EPS ? 1 : held)
    inst.colorFade = fade
    inst.parallaxFade = fade
    inst.colorFadeTarget = 1
    !z.lZoneParallax && revealLParallaxZone(inst)
    syncTreeColorCrossfade(inst)
    applyZoneVisibility(inst)
    return
  }
  inst._meditationPreviewFadingOut = false
  const fade = meditationCountdownFade(inst)
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
  if (z.lCollected) {
    inst._meditationPreviewFadingOut = false
    inst._meditationParallaxPreview = false
    stopMeditationBirds(inst)
    applyGlowPostLLitState(inst)
    return
  }
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
  if (z.lCollected) {
    inst._meditationParallaxPreview = false
    inst._meditationPreviewFadingOut = false
    stopMeditationBirds(inst)
    applyGlowPostLLitState(inst)
    return
  }
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
  syncTreeColorCrossfade(inst)
}
//
// Steps the preview fade-out after a broken meditation countdown.
//
function updateMeditationPreviewFadeOut(inst, dt) {
  if (!inst._meditationPreviewFadingOut) return
  const z = inst.zones
  if (z.lCollected || z.colorWorld || z.oCollected || inst.meditation?.countdown != null) {
    inst._meditationPreviewFadingOut = false
    z.lCollected && (stopMeditationBirds(inst), applyGlowPostLLitState(inst))
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
  if (z.lCollected && (inst.colorFade ?? 0) >= 1 - COLOR_CROSSFADE_EPS) {
    inst.meditationWorldLife = 1
    return
  }
  //
  // Countdown progress drives birds, grass sway and midges in lockstep with
  // the colour fade — no separate easing curve.
  //
  if (m?.countdown != null) {
    inst.meditationWorldLife = meditationCountdownFade(inst)
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
  const palette = glowRockShadedDrawPalette()
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
    const bakeShaded = (seedOffset) => {
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
    const bakedGray = rebakeAtlas.register(bakeShaded(obj._decorWorldX * 3 | 0))
    const bakedOutline = rebakeAtlas.register(bakeShaded(obj._decorWorldX * 3 + 1 | 0))
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
  if (shouldGlowBlockWorldReveal(inst)) {
    applyGlowEyeIntroZoneVisibility(inst)
    return
  }
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
  const lPlatWantVisible = z.lPlatRevealed && !inst.lPlatCaptionHiding
  setPlatVisible(inst.lPlat, lPlatWantVisible, inst.lPlatHome)
  inst._lPlatVisibleLastFrame = lPlatWantVisible
  inst.rightSpikes && (inst.rightSpikes.drawObj.hidden = !lPlatWantVisible)
  inst.spikeGrass && (inst.spikeGrass.layer.hidden = !lPlatWantVisible)
  setPlatVisible(inst.oPlat, z.oZone && !inst.oPlatCaptionHiding, inst.oPlatHome, z.lCollected)
  const wZoneUnlocked = isGlowWZoneUnlocked(inst)
  setPlatVisible(inst.wPlat, z.wZone && wZoneUnlocked, inst.wPlatHome, z.oCollected)
  setLetterVisible(inst.lLetter, z.lLetterUnveiled && !z.lCollected, inst.letterAppearFxReady)
  setLetterVisible(inst.oLetter, z.oZone && !z.oCollected, inst.letterAppearFxReady)
  setLetterVisible(inst.wLetter, z.wZone && wZoneUnlocked && !z.wCollected, inst.letterAppearFxReady)
  inst.trampBundle.drawLayer.hidden = !isRightTrampolineVisible(z)
  inst.branchTrampBundle.drawLayer.hidden = !isBranchTrampolineVisible(z)
  inst.rockObjs.forEach(o => {
    if (o._mudZoneWalk) {
      setDecorObjVisible(o, z.gCollected)
      return
    }
    if (o._rightOfMud) {
      if (!z.gCollected) {
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
      const decorOp = glowSurfaceDecorFadeAt(inst, wxRock)
      const showLeft = (o._waterCluster ? z.water : leftGroundOpen) && decorOp > 0.04
      setDecorObjVisible(o, showLeft, decorOp * (inst.leftDecorFade ?? 1))
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
    const decorOp = glowSurfaceDecorFadeAt(inst, wx)
    if (o._side === 'left') {
      setDecorObjVisible(o, leftGroundOpen && !inLake && decorOp > 0.04, decorOp * (inst.leftDecorFade ?? 1))
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
  maybeShowGLetter(inst)
  syncGlowPredatorVisibility(inst)
}
function isGlowGrassLayerVisible(inst) {
  const z = inst.zones
  if (isGlowWorldSurfaceDecorUnlocked(inst)) {
    return z.groundDecorLeft || z.groundRightStripMax >= 0
  }
  //
  // After G the layer stays on (mud-zone blades only until L countdown — tint culls the rest).
  //
  return z.gCollected
}
//
// The mud zone's own tall-grass overlay (createGlowMudExtraGrass) stays tied
// to gCollected alone, unlike the general grassLayer above — that layer's
// visibility switches to groundDecorLeft (gated behind waterDiscovered, "the
// left shore decor only opens after the first drowning" — see loadGlowZones)
// once world surface decor unlocks (post-L), which has nothing to do with the
// mud zone itself. A player who reaches full colour world without ever
// drowning (entirely possible) hid mudExtraGrass along with the rest of the
// left decor, making the mud patch invisible in colour mode — confirmed live
// (same mud-zone camera position, gray vs colour screenshots: color showed
// only thin ordinary grass, no tall mud tufts at all).
//
function isGlowMudExtraGrassVisible(inst) {
  return Boolean(inst.zones?.gCollected)
}
//
// Hides every world layer during the eyeless intro — only the start branch,
// floor colliders and midges stay active.
//
function applyGlowEyeIntroZoneVisibility(inst) {
  const z = inst.zones
  inst.treeDrawMonolith ? syncMonolithicTreeGraySprite(inst) : syncTreeSegmentGraySprites(inst)
  inst.treeDrawMonolith ? syncMonolithicTreeColorMode(inst) : syncTreeSegmentsVisibility(inst)
  cornerObjsSetHidden(inst.cornerObjs, true)
  setPlatVisible(inst.lPlat, false, inst.lPlatHome)
  inst.rightSpikes && (inst.rightSpikes.drawObj.hidden = true)
  inst.spikeGrass && (inst.spikeGrass.layer.hidden = true)
  setPlatVisible(inst.oPlat, false, inst.oPlatHome, z.lCollected)
  setPlatVisible(inst.wPlat, false, inst.wPlatHome, z.oCollected)
  setLetterVisible(inst.lLetter, false, inst.letterAppearFxReady)
  setLetterVisible(inst.oLetter, false, inst.letterAppearFxReady)
  setLetterVisible(inst.wLetter, false, inst.letterAppearFxReady)
  inst.gLetter && setLetterVisible(inst.gLetter, false, inst.letterAppearFxReady)
  inst.trampBundle.drawLayer.hidden = true
  inst.branchTrampBundle.drawLayer.hidden = true
  inst.rockObjs.forEach(o => setDecorObjVisible(o, false))
  inst.mushObjs.forEach(o => setDecorObjVisible(o, false))
  inst.grassLayer.layer.hidden = true
  inst.mudExtraGrass && (inst.mudExtraGrass.layer.hidden = true)
  inst.waterLayer && (inst.waterLayer.hidden = true)
  inst.treeObj && (inst.treeObj.hidden = true)
  inst.treeColorObj && (inst.treeColorObj.hidden = true)
  inst.treeSegmentIds?.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    entry?.obj && (entry.obj.hidden = true)
    entry?.colorObj && (entry.colorObj.hidden = true)
  })
  rebuildWoodSurfaces(inst)
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
function concealGlowLetterPickupVisual(entry) {
  if (!entry) return
  entry._pickupQueued = true
  entry._popFade = null
  entry.allObjects?.forEach(obj => {
    obj.hidden = true
    obj.opacity = 0
  })
}
function glowLetterPickupNear(inst, entry, kind, heroX, heroY) {
  if (!entry) return false
  const queued = entry._pickupQueued || inst.pendingLetterPickup?.kind === kind
  if (entry.main.hidden && !queued) return false
  return Math.hypot(heroX - entry.x, heroY - entry.y) < GLOW_LETTER_PICKUP_RADIUS
}
function hideGlowLetterPickupInWorld(entry) {
  if (!entry) return
  entry.pickedUp = true
  concealGlowLetterPickupVisual(entry)
}
function setLetterVisible(letterEntry, visible, burst = false) {
  if (!letterEntry) return
  if (letterEntry.pickedUp && !letterEntry.forceVisible) {
    letterEntry.allObjects?.forEach(obj => { obj.hidden = true })
    return
  }
  if (letterEntry.forceVisible) return
  const wasHidden = letterEntry.main?.hidden !== false
  letterEntry.allObjects.forEach(obj => { obj.hidden = !visible })
  if (!visible) {
    letterEntry._popFade = null
    return
  }
  const sc = letterEntry.k?._glowSceneInst
  const instantReveal = sc?.drowning || sc?.deathHandled
  wasHidden && sc && dismissGlowTeacherHintForLetterAppear(sc)
  if (instantReveal) {
    letterEntry._popFade = null
    letterEntry.allObjects.forEach(obj => { obj.opacity = 1 })
  } else if (wasHidden) {
    const flatGInstant = sc && isGlowWorldLetterFlatBeforeL(sc, letterEntry.char)
    if (flatGInstant) {
      letterEntry._popFade = null
      glowLetterPopFadeTargets(letterEntry, sc).forEach(obj => { obj.opacity = 1 })
      letterEntry.outlineObjs?.forEach(obj => { obj.hidden = true, obj.opacity = 0 })
    } else {
      letterEntry._popFade = 0
      const fadeTargets = glowLetterPopFadeTargets(letterEntry, sc)
      fadeTargets.forEach(obj => { obj.opacity = 0 })
      letterEntry.outlineObjs?.forEach(obj => { obj.hidden = true, obj.opacity = 0 })
    }
  } else if (letterEntry._popFade == null) {
    const fadeTargets = glowLetterPopFadeTargets(letterEntry, sc)
    const minOp = Math.min(...fadeTargets.map(obj =>
      typeof obj.opacity === 'number' ? obj.opacity : 1
    ))
    minOp < 0.99 && (letterEntry._popFade = minOp)
  }
  if (visible && !wasHidden && sc && isGlowWorldLetterFlatBeforeL(sc, letterEntry.char)) {
    letterEntry._popFade = null
    glowLetterPopFadeTargets(letterEntry, sc).forEach(obj => { obj.opacity = 1 })
  }
  if (visible && wasHidden && burst) {
    const flatG = sc && isGlowWorldLetterFlatBeforeL(sc, letterEntry.char)
    !flatG && LevelIndicator.flashWorldLetterBurst(
      letterEntry.k,
      letterEntry.x,
      letterEntry.y,
      letterEntry.colorHex || HERO_BODY_COLOR
    )
  }
  visible && sc && isGlowWorldLetterFlatBeforeL(sc, letterEntry.char) &&
    syncGlowPickupLetterVisual(letterEntry, glowLetterVisualStyle(sc), sc)
}
//
// Steps a freshly revealed pickup letter's fade-in (see setLetterVisible).
//
function updateLetterPopFade(letterEntry, dt) {
  if (!letterEntry || letterEntry.main?.hidden || letterEntry.forceVisible) return
  const sc = letterEntry.k?._glowSceneInst
  if (sc && isGlowWorldLetterFlatBeforeL(sc, letterEntry.char)) {
    letterEntry._popFade = null
    glowLetterPopFadeTargets(letterEntry, sc).forEach(obj => { obj.opacity = 1 })
    letterEntry.outlineObjs?.forEach(obj => { obj.hidden = true, obj.opacity = 0 })
    return
  }
  if (sc?.drowning || sc?.deathHandled) {
    letterEntry._popFade = null
    letterEntry.allObjects.forEach(obj => { obj.opacity = 1 })
    return
  }
  if (letterEntry._popFade == null) {
    const fadeTargets = glowLetterPopFadeTargets(letterEntry, sc)
    const minOp = Math.min(...fadeTargets.map(obj =>
      typeof obj.opacity === 'number' ? obj.opacity : 1
    ))
    if (minOp >= 0.99) return
    letterEntry._popFade = minOp
  }
  if (letterEntry._popFade >= 1) return
  letterEntry._popFade = Math.min(1, letterEntry._popFade + dt / POP_REVEAL_FADE_DURATION)
  const fadeTargets = glowLetterPopFadeTargets(letterEntry, sc)
  fadeTargets.forEach(obj => { obj.opacity = letterEntry._popFade })
  letterEntry._popFade >= 1 && (letterEntry._popFade = null)
}
//
// Flat G uses white fill + void shadow only — outline layers stay hidden
// during the pop-in so they never stack on the main glyph.
//
function glowLetterPopFadeTargets(letterEntry, sc) {
  if (sc && isGlowWorldLetterFlatBeforeL(sc, letterEntry?.char)) {
    return [letterEntry.main, ...(letterEntry.shadowObjs ?? [])].filter(Boolean)
  }
  return letterEntry.allObjects
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
// The G pickup appears once every HUD exploration slice is open: tree (3),
// lake shore, first right-ground strip, and the branch-trampoline mushroom.
//
function glowThreeZonesExplored(inst) {
  const z = inst.zones
  const treeDone = z.tree && (inst.treeDrawMonolith || isAllTreeSegmentsRevealed(inst))
  return Boolean(
    treeDone &&
    z.waterDiscovered &&
    z.groundRightStripMax >= 0 &&
    z.branchTrampRevealed
  )
}
//
// Shows or hides the G letter from the three-zone exploration gate.
//
function maybeShowGLetter(inst) {
  if (!inst.gLetter || inst.zones.gCollected || !inst.zones.eyesCollected) return
  const show = glowThreeZonesExplored(inst)
  if (!show) {
    setLetterVisible(inst.gLetter, false, inst.letterAppearFxReady)
    inst.gLetter._glowRevealedStable = false
    return
  }
  if (!inst.gLetter.main.hidden && inst.gLetter._glowRevealedStable) return
  setLetterVisible(inst.gLetter, true, false)
  inst.gLetter._glowRevealedStable = true
  syncGlowHudLetterFills(inst, false)
}
//
// World G stays flat white (no void-outline pop) until L unlocks colour decor.
//
function isGlowWorldLetterFlatBeforeL(sc, char) {
  if (!sc?.zones || char !== 'G') return false
  return !sc.zones.lCollected && !sc.zones.colorWorld
}
//
// Life HUD stays grey until the world colour preview (post-L countdown) or
// full colour world has faded in far enough to read as the same beat.
//
function glowLifeHudWantGrey(inst) {
  if (inst.zones.colorWorld) return false
  return (inst.colorFade ?? 0) < 0.85
}
//
// Applies the grayscale teacher tint when the glow colour fade changes.
//
function maybeSyncGlowLifeHudGrey(inst) {
  if (!inst.levelIndicator) return
  syncGlowLifeHudPupil(inst)
  const wantGrey = glowLifeHudWantGrey(inst)
  const needsDesat = wantGrey && !eyeHudSpriteIsDesat(inst.levelIndicator._lifeSpriteName)
  if (inst._lifeHudGrey === wantGrey && !needsDesat) return
  inst._lifeHudGrey = wantGrey
  LevelIndicator.syncLifeHudGrey(inst.levelIndicator, wantGrey)
}
//
// HUD eye pupil stays dark gray in the gray world, black once L is taken.
//
function syncGlowLifeHudPupil(inst) {
  const indicator = inst.levelIndicator
  if (!indicator) return
  indicator._eyeHudPupilRgb = inst.zones.lCollected ? null : GLOW_HUD_EYE_PUPIL_PRE_L_RGB
}
//
// Flat single decor gray until L — no per-object shades before then.
//
function isGlowFlatSingleDecorColor(inst) {
  return isGlowGrayExploreBeforeL(inst?.zones, inst?.colorFade ?? 0)
}
//
// Cave interior rocks/skeleton use flat gray before colour world and during
// the eyeless intro (no green earth tones in the pit mouth).
//
function isGlowPitFlatDecorMode(inst) {
  return isGlowFlatSingleDecorColor(inst) || isGlowEyeIntroBareWorld(inst)
}
//
// Single neutral backdrop for sky + earth before the colour world opens.
//
function isGlowPreludeBackdropWorld(inst) {
  return isGlowFlatSingleDecorColor(inst) || isGlowEyeIntroBareWorld(inst)
}
function glowPlayfieldBackdropRgb(inst) {
  return isGlowPreludeBackdropWorld(inst) ? PRELUDE_BACKDROP : VOID
}
//
//
// Stalk-eyes on the right shore — visible once G opens the east; pupil grey
// until L, then black (see chainBuoyPupilRgb in glow-chain-buoy.js).
//
function isGlowChainBuoyLayerVisible(inst) {
  if (!inst?.chainBuoys) return false
  if (isGlowEyeIntroBareWorld(inst)) return false
  const z = inst.zones
  return Boolean(z.gCollected || z.lCollected || z.oZone || z.oCollected || z.colorWorld)
}
//
// Stalk-eye colours — gray stalk + eye ring before L, black after L; roots use
// the same palette as ear-tree roots (glowEarTreeRootKaplayRgb). Colour world:
// white sclera + black stalk and eye ring (hero eye white / pupil palette).
//
function glowChainBuoyColors(inst, k) {
  const zones = inst?.zones
  const stalkTriplet = glowRgb(zones?.lCollected ? CFG.visual.colors.hero.eyePupil : GLOW_PAL.decorGray)
  const stalk = k.rgb(stalkTriplet.r, stalkTriplet.g, stalkTriplet.b)
  const root = glowEarTreeRootKaplayRgb(inst, k)
  const sclera = glowRgb('lightGray')
  const highlight = glowRgb('lightGray')
  const grayStack = {
    body: stalk,
    sclera: k.rgb(sclera.r, sclera.g, sclera.b),
    pupil: k.rgb(sclera.r, sclera.g, sclera.b),
    highlight: k.rgb(highlight.r, highlight.g, highlight.b),
    contour: stalk,
    root
  }
  if (!zones?.colorWorld) {
    return grayStack
  }
  //
  // Colour world: black stalk + ring (same as post-L grey stalk), white
  // sclera — not the warm green-black eyeCreature stack used elsewhere.
  //
  const whiteTriplet = glowRgb(CFG.visual.colors.hero.eyeWhite)
  const white = k.rgb(whiteTriplet.r, whiteTriplet.g, whiteTriplet.b)
  return {
    body: stalk,
    sclera: white,
    highlight: white,
    contour: stalk,
    pupil: grayStack.pupil,
    root
  }
}
//
// Ear-tree colors — dark outline always, gray decor fill before the color
// world, wood bark + living green ears after.
//
function glowEarTreeRootRgb(inst) {
  const flat = isGlowFlatSingleDecorColor(inst)
  return flat ? DECOR_GRAY : glowRgb(GLOW_PAL.treeColor.root)
}
function glowEarTreeRootKaplayRgb(inst, k) {
  const c = glowEarTreeRootRgb(inst)
  return k.rgb(c.r, c.g, c.b)
}
function glowEarTreeColors(inst, k) {
  const flat = isGlowFlatSingleDecorColor(inst)
  const bark = flat ? DECOR_GRAY : glowRgb(GLOW_PAL.treeGray.trunk)
  const lip = flat ? DECOR_GRAY : glowRgb(GLOW_PAL.glowAttention.lip)
  const root = glowEarTreeRootKaplayRgb(inst, k)
  return {
    outline: k.rgb(DECOR_OUTLINE_RGB.r, DECOR_OUTLINE_RGB.g, DECOR_OUTLINE_RGB.b),
    bark: k.rgb(bark.r, bark.g, bark.b),
    lip: k.rgb(lip.r, lip.g, lip.b),
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
        if (!sc || !isGlowChainBuoyLayerVisible(sc)) return
        const c = glowChainBuoyColors(sc, k)
        const pupilZones = sc.chainBuoys?.pupilZones ?? sc.zones
        ChainBuoy.onDraw(sc.chainBuoys, c, pupilZones, glowCameraViewXRange(k, sc, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
}
function glowEarTreeRevealOpacity(inst) {
  if (!inst?.zones?.lCollected) return 0
  return inst.earTreeRevealFade ?? 0
}
//
// Fades lip-trees in after L is collected.
//
function updateEarTreeRevealFade(inst, dt) {
  if (!inst.zones.lCollected) return
  if (inst.earTreeRevealFade == null || inst.earTreeRevealFade >= 1) return
  inst.earTreeRevealFade = Math.min(1, inst.earTreeRevealFade + dt / POP_REVEAL_FADE_DURATION)
}
function createGlowEarTreeLayer(k, inst) {
  k.add([
    k.z(GLOW_EAR_TREE_Z),
    {
      draw() {
        const op = glowEarTreeRevealOpacity(inst)
        if (!inst.earTrees || op <= COLOR_CROSSFADE_EPS) return
        const c = glowEarTreeColors(inst, k)
        EarTree.onDrawTrunks(inst.earTrees, c.bark, c.outline, op, glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
  k.add([
    k.z(GLOW_EAR_TREE_ROOTS_Z),
    {
      draw() {
        const op = glowEarTreeRevealOpacity(inst)
        if (!inst.earTrees || op <= COLOR_CROSSFADE_EPS) return
        const c = glowEarTreeColors(inst, k)
        EarTree.onDrawRoots(inst.earTrees, c.root, op, glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
  k.add([
    k.z(GLOW_EAR_TREE_TRUNK_OVERLAY_Z),
    {
      draw() {
        const op = glowEarTreeRevealOpacity(inst)
        if (!inst.earTrees || op <= COLOR_CROSSFADE_EPS) return
        const c = glowEarTreeColors(inst, k)
        EarTree.onDrawTrunksAboveGrass(inst.earTrees, c.bark, c.outline, op,
          glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
  k.add([
    k.z(GLOW_EAR_TREE_BRANCHES_Z),
    {
      draw() {
        const op = glowEarTreeRevealOpacity(inst)
        if (!inst.earTrees || op <= COLOR_CROSSFADE_EPS) return
        const c = glowEarTreeColors(inst, k)
        EarTree.onDrawBranches(inst.earTrees, c.bark, c.outline, c.lip, op,
          glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN))
      }
    }
  ])
}
//
// G is collectible only when visible after the three-zone gate.
//
function isGLetterCollectable(inst) {
  return Boolean(
    inst.gLetter &&
    !inst.zones.gCollected &&
    glowThreeZonesExplored(inst) &&
    (!inst.gLetter.main.hidden || inst.gLetter._pickupQueued || inst.pendingLetterPickup?.kind === 'g')
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
  isGlowWZoneActive(inst) && z.oCollected &&
    list.push({ x1: inst.wPlatHome.x, x2: inst.wPlatHome.x + LOG_W, y: inst.wPlatHome.y, h: LOG_H })
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
// Amount the gray-phase ground decor darkens toward void after L. The push
// dissolves together with the gray world as the colour fade progresses.
//
function grayDecorDarken(sc) {
  if (!sc?.zones?.lCollected) return 0
  const reveal = glowPostLRevealFade(sc)
  if (reveal <= 0) return 0
  return L_DECOR_DARKEN * (1 - (sc.colorFade ?? 0)) * reveal
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
// Bakes three forest planes (each one's trees AND bushes on a single shared
// canvas) plus the haze backdrop and the static ground band. Depth comes from
// scroll speed and haze-blend steps; colour-world trees use the four reference
// corner palettes by playfield quadrant and canopy row.
//
async function buildParallaxSprites(k, undergroundSpec, onStep) {
  const grayNearPal = getTreePaletteSolid('parallaxGrayNear')
  const grayMidPal = getTreePaletteSolid('parallaxGrayMid')
  const grayFarPal = getTreePaletteSolid('parallaxGrayFar')
  const maxScroll = WORLD_W - LEFT_MARGIN - RIGHT_MARGIN - VIEW_W
  bakeParallaxLayerPair(k, BG_PAR_TREE3_GRAY, BG_PAR_TREE3_COLOR, PAR_SKY_SPEED, maxScroll, PAR_TREE_HORIZ_BLEED,
    PAR_SKY_WORLD_Y, PAR_SKY_WORLD_H, (grayCtx, colorCtx, pad) => {
      renderSkyBand(grayCtx, colorCtx)
      bakeParallaxBushes(grayCtx, colorCtx, pad, {
        grayRgb: { r: grayFarPal.trunkR, g: grayFarPal.trunkG, b: grayFarPal.trunkB },
        cornerBandTop: PAR_FARTHEST_BAND_TOP,
        foliageDensityTier: 'background',
        colorFlat: false,
        grayFlat: true,
        heightScale: BUSH_FARTHEST_HEIGHT_SCALE
      })
    }, { blurRadius: glowDepthBlurRadiusPx('background'), grade: GLOW_LAYER_GRADE.far })
  onStep && await onStep(1, 4)
  bakeParallaxLayerPair(k, BG_PAR_TREE2_GRAY, BG_PAR_TREE2_COLOR, PAR_TREE2_SPEED, maxScroll, PAR_TREE_HORIZ_BLEED,
    parTreeRowWorldY(PAR_MID_BAND_TOP), parTreeRowWorldH(PAR_MID_BAND_TOP), (grayCtx, colorCtx, pad) => {
      bakeParallaxTrees(grayCtx, colorCtx, pad, {
        count: PAR_FAR_TREE_COUNT,
        seedBase: PAR_FAR_SEED_BASE,
        topMinY: PAR_FAR_TOP_MIN_Y,
        topRange: PAR_FAR_TOP_RANGE,
        bandTop: PAR_MID_BAND_TOP,
        foliageDensityTier: 'midground',
        grayPal: grayMidPal,
        colorBlend: PAR_MID_COLOR_BLEND,
        flatLeaves: true,
        leafDarken: 0.1,
        uniformWood: true,
        treeFocusBias: PAR_TREE_FOCUS_BIAS_MID,
        trunkWidthScale: PAR_TRUNK_WIDTH_SCALE_MID
      })
      bakeParallaxBushes(grayCtx, colorCtx, pad, {
        grayRgb: { r: grayMidPal.trunkR, g: grayMidPal.trunkG, b: grayMidPal.trunkB },
        cornerBandTop: PAR_MID_BAND_TOP,
        foliageDensityTier: 'midground',
        colorFlat: false,
        grayFlat: true,
        heightScale: BUSH_FAR_HEIGHT_SCALE
      })
    }, { blurRadius: glowDepthBlurRadiusPx('midground'), grade: GLOW_LAYER_GRADE.mid })
  onStep && await onStep(2, 4)
  bakeParallaxLayerPair(k, BG_PAR_TREE1_GRAY, BG_PAR_TREE1_COLOR, PAR_TREE1_SPEED, maxScroll, PAR_TREE_HORIZ_BLEED,
    parTreeRowWorldY(PAR_BIG_BAND_TOP), parTreeRowWorldH(PAR_BIG_BAND_TOP), (grayCtx, colorCtx, pad) => {
      bakeParallaxTrees(grayCtx, colorCtx, pad, {
        count: PAR_BIG_TREE_COUNT,
        seedBase: PAR_BIG_SEED_BASE,
        topMinY: PAR_BIG_TOP_MIN_Y,
        topRange: PAR_BIG_TOP_RANGE,
        bandTop: PAR_NEAR_BAND_TOP,
        foliageDensityTier: 'nearground',
        grayPal: grayNearPal,
        colorBlend: PAR_L1_COLOR_BLEND,
        flatLeaves: false,
        leafDarken: 0,
        uniformWood: false,
        leafWarmBlend: PAR_L1_LEAF_WARM_BLEND,
        treeFocusBias: PAR_TREE_FOCUS_BIAS_NEAR,
        trunkWidthScale: PAR_TRUNK_WIDTH_SCALE_NEAR
      })
      bakeParallaxBushes(grayCtx, colorCtx, pad, {
        grayRgb: { r: grayNearPal.trunkR, g: grayNearPal.trunkG, b: grayNearPal.trunkB },
        cornerBandTop: PAR_NEAR_BAND_TOP,
        foliageDensityTier: 'nearground',
        colorFlat: false,
        grayFlat: false,
        heightScale: BUSH_NEAR_HEIGHT_SCALE
      })
    }, { blurRadius: glowDepthBlurRadiusPx('nearground'), grade: GLOW_LAYER_GRADE.near })
  onStep && await onStep(3, 4)
  const staticGray = document.createElement('canvas')
  staticGray.width = WORLD_W
  staticGray.height = PAR_STATIC_WORLD_H
  const staticGrayCtx = staticGray.getContext('2d')
  staticGrayCtx.translate(0, -PAR_STATIC_WORLD_Y)
  const staticColor = document.createElement('canvas')
  staticColor.width = WORLD_W
  staticColor.height = PAR_STATIC_WORLD_H
  const staticColorCtx = staticColor.getContext('2d')
  staticColorCtx.translate(0, -PAR_STATIC_WORLD_Y)
  const [ugGray, ugColor] = undergroundPaletteEntries()
  renderCombinedGroundBand(staticGrayCtx, groundEarthLayersGray(), undergroundSpec, ugGray)
  renderCombinedGroundBand(staticColorCtx, groundEarthLayersColor(), undergroundSpec, ugColor)
  applyGlowLayerGradeToCanvas(staticGray, GLOW_LAYER_GRADE.decor, 9100)
  applyGlowMaterialBake(staticColor, 9101)
  k.loadSprite(BG_STATIC_GRAY, staticGray)
  k.loadSprite(BG_STATIC_COLOR, staticColor)
  staticGray.width = 0
  staticGray.height = 0
  staticColor.width = 0
  staticColor.height = 0
  onStep && await onStep(4, 4)
}
//
// Flat explore phase sky — void to playfield gray (no green-teal forest air).
//
function glowGraySkyBandRgb(mixT) {
  return glowPreludeBackdropRgb()
}
//
// Samples the dark teal sky gradient; optional dawn gold in the lower band.
//
function glowSkyBandRgb(mixT, colorFade, includeDawn) {
  if (colorFade <= COLOR_CROSSFADE_EPS && !includeDawn) {
    return glowGraySkyBandRgb(mixT)
  }
  const zenith = glowRgb('glowSkyZenith')
  const mid = glowRgb('glowSkyMid')
  const horizon = glowRgb('glowSkyHorizon')
  let c = mixT < 0.5
    ? lerpRgb(zenith, mid, mixT * 2)
    : lerpRgb(mid, horizon, (mixT - 0.5) * 2)
  if (includeDawn && colorFade > COLOR_CROSSFADE_EPS) {
    const dawnStart = 1 - SKY_DAWN_BOTTOM_FRAC
    if (mixT > dawnStart) {
      const u = (mixT - dawnStart) / (1 - dawnStart)
      const dawn = GLOW_LIGHT_CORE
      const strength = SKY_DAWN_GLOW_STRENGTH * colorFade * u
      c = lerpRgb(c, dawn, strength)
    }
  }
  return snapToPalette(c)
}
//
// Paints the sky band into both parallax canvases: same dark green-teal base;
// colour bake adds golden dawn at the trunk line only.
//
function renderSkyBand(grayCtx, colorCtx) {
  const h = FLOOR_Y - TOP_MARGIN
  paintGlowSkyGradient(grayCtx, h, 0, false)
  paintGlowSkyGradient(colorCtx, h, 1, true)
}
//
// Shared vertical sky fill for baked canvases and live playfield fallback.
//
function paintGlowSkyGradient(ctx, skyHeight, colorFade, includeDawn) {
  const bands = SKY_DITHER_BAND_COUNT
  for (let b = 0; b < bands; b++) {
    const t0 = b / bands
    const t1 = (b + 1) / bands
    const mix = (t0 + t1) * 0.5
    const c = glowSkyBandRgb(mix, colorFade, includeDawn)
    ctx.fillStyle = `rgb(${c.r}, ${c.g}, ${c.b})`
    const y = TOP_MARGIN + t0 * skyHeight
    const bandH = Math.ceil(t1 * skyHeight - t0 * skyHeight) + 1
    ctx.fillRect(LEFT_MARGIN, y, GAME_W, bandH)
  }
}
//
// Live playfield sky before / between parallax crossfades.
//
function drawGlowPlayfieldSky(k, opacity, colorFade) {
  if (opacity < COLOR_CROSSFADE_EPS) return
  const skyH = FLOOR_Y - TOP_MARGIN
  const bands = SKY_DITHER_BAND_COUNT
  const includeDawn = colorFade > COLOR_CROSSFADE_EPS
  for (let b = 0; b < bands; b++) {
    const t0 = b / bands
    const t1 = (b + 1) / bands
    const mix = (t0 + t1) * 0.5
    const c = glowSkyBandRgb(mix, colorFade, includeDawn)
    const y = TOP_MARGIN + t0 * skyH
    const bandH = Math.ceil(t1 * skyH - t0 * skyH) + 1
    k.drawRect({
      pos: k.vec2(LEFT_MARGIN, y),
      width: GAME_W,
      height: bandH,
      color: k.rgb(c.r, c.g, c.b),
      opacity
    })
  }
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
    treeX2: treeRight
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
// either scroll limit. Optional postFxCfg bakes depth blur and film grain into
// both gray and colour canvases after trees and bushes are painted.
//
function bakeParallaxLayerPair(k, grayName, colorName, speed, maxScroll, horizBleed, worldY, worldH, drawFn, postFxCfg = null) {
  const pad = Math.ceil(maxScroll * (1 - speed)) + horizBleed
  const canvasW = WORLD_W + pad * 2
  const canvasH = worldH
  const grayCanvas = document.createElement('canvas')
  grayCanvas.width = canvasW
  grayCanvas.height = canvasH
  const grayCtx = grayCanvas.getContext('2d')
  grayCtx.translate(pad, -worldY)
  const colorCanvas = document.createElement('canvas')
  colorCanvas.width = canvasW
  colorCanvas.height = canvasH
  const colorCtx = colorCanvas.getContext('2d')
  colorCtx.translate(pad, -worldY)
  drawFn(grayCtx, colorCtx, pad)
  postFxCfg && applyParallaxPostFxToContext(grayCtx, canvasW, canvasH, postFxCfg)
  postFxCfg && applyParallaxPostFxToContext(colorCtx, canvasW, canvasH, postFxCfg)
  const bounds = parallaxColumnBoundsMap(k)
  bounds.set(grayName, measureParallaxColumnBounds(grayCanvas, false))
  bounds.set(colorName, measureParallaxColumnBounds(colorCanvas, colorName === PAR_LAYER_NEAR.color))
  k.loadSprite(grayName, grayCanvas)
  k.loadSprite(colorName, colorCanvas)
  grayCanvas.width = 0
  grayCanvas.height = 0
  colorCanvas.width = 0
  colorCanvas.height = 0
  return pad
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
// Fills one horizontal band across the full width, flat top edge — used for
// every earth layer except the deepest, which gets the wavy silhouette.
//
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
  const seed = layerIndex * 97.13 + 3.7
  const cell = GROUND_LAYER_JAG_CELL_PX
  const bx = Math.floor(x / cell)
  const h = groundLayerJagHash01(bx * 13.7 + seed * 100.3)
  return (h * 2 - 1) * GROUND_LAYER_INTERIOR_BOUNDARY_AMP
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
function paintWavyBoundedEarthLayer(ctx, rgb, x0, width, y0, height, topFrac, bottomFrac, topLayerIndex, bottomLayerIndex) {
  const steps = Math.max(2, Math.ceil(width / GROUND_LAYER_JAG_CELL_PX))
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
    let y = groundLayerBoundaryY(x, y0, height, bottomFrac, bottomLayerIndex)
    if (bottomLayerIndex < 0) {
      const wave = (Math.sin(x * GROUND_BOTTOM_WAVE_FREQ_A) +
        Math.sin(x * GROUND_BOTTOM_WAVE_FREQ_B) * 0.55) * GROUND_BOTTOM_WAVE_AMP
      y = y0 + height + wave
    }
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  ctx.fill()
}
//
// Stacks soil layers top to bottom — flat top on FLOOR_Y, wavy coastline
// seams between strata; the deepest edge keeps the extra bottom swell.
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
// earth band (two layers at 50% depth, see groundEarthLayers) inside the
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
function groundEarthLayersGray() {
  const topsoil = glowRgb('groundChernozem')
  const deep = glowRgb('groundSand')
  return softenGroundEarthLayers([
    { rgb: lerpRgb(topsoil, GLOW_SHADOW, 0.1), frac: GROUND_LAYER_FRACS[0] },
    { rgb: lerpRgb(deep, VOID, 0.28) }
  ])
}
function groundEarthLayersColor() {
  return softenGroundEarthLayers([
    { rgb: glowRgb('groundChernozem'), frac: GROUND_LAYER_FRACS[0] },
    { rgb: glowRgb('groundSand') }
  ])
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
// Renders one parallax plane into both combined canvases: each tree uses the
// same glow-tree generator as the main tree (default trunk taper, fractal
// branches, crown clusters). Only trunk height and a light width scale differ
// per row so the forest sits lower without a flat canopy fill band.
//
function renderGlowTreePlane(grayCtx, colorCtx, planeCfg) {
  const {
    count, seedBase, topMinY, topRange,
    grayBlend, colorBase, colorBlend, flatLeaves, leafDarken, uniformWood,
    leafWarmBlend = 0,
    grayPal: grayPalOverride,
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
    // Gray row tone is shared; colour row picks one of the four corner families.
    //
    const grayPal = grayPalOverride || buildDimmedTreePalette(getTreePaletteGray(), INNER_GRAY, grayBlend, flatLeaves, leafDarken, uniformWood)
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
    const grayPalDraw = applyFoliageDensityToPalette(grayPal, foliageDensityTier)
    const colorPalDraw = applyFoliageDensityToPalette(colorPal, foliageDensityTier)
    renderGlowTreeIntoContext(grayCtx, treeData, grayPalDraw, WORLD_W, WORLD_H)
    renderGlowTreeIntoContext(colorCtx, treeData, colorPalDraw, WORLD_W, WORLD_H)
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
    grayRgb, colorRgb, colorFlat, grayFlat, heightScale, hiResClusters,
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
    drawLeafyBushMound(grayCtx, mound, grayRgb, grayFlat)
    drawLeafyBushMound(colorCtx, mound, moundColorRgb, colorFlat)
    useHiResClusters && drawHiResBushClusters(colorCtx, mound, moundColorRgb, foliageDensityTier)
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
// True when the camera centres on lake or cave beats — forest haze stays off.
//
function isForestHazeSuppressedAtCam(inst) {
  const camX = inst.k.camPos().x
  const lakeX1 = inst.lakeX1
  const lakeX2 = inst.lakeX2
  if (lakeX1 != null && lakeX2 != null && inst.zones.water) {
    if (camX >= lakeX1 - HAZE_LAKE_CAM_MARGIN && camX <= lakeX2 + HAZE_LAKE_CAM_MARGIN) {
      return true
    }
  }
  const crack = getCrackZone(WORLD_W, FLOOR_Y)
  return camX >= crack.x1 - HAZE_CAVE_CAM_MARGIN
}
//
// Sky-coloured veil over a forest row so farther planes lose contrast.
//
function drawAtmosphereHaze(inst, opacity) {
  if (opacity < 0.01) return
  if (isForestHazeSuppressedAtCam(inst)) return
  const k = inst.k
  const fade = inst.colorFade ?? 0
  if (fade < COLOR_CROSSFADE_EPS) return
  const c = GLOW_LIGHT_CORE
  const skyH = FLOOR_Y - TOP_MARGIN
  const bandH = skyH * SKY_DAWN_BOTTOM_FRAC
  k.drawRect({
    pos: k.vec2(LEFT_MARGIN, FLOOR_Y - bandH),
    width: GAME_W,
    height: bandH,
    color: k.rgb(c.r, c.g, c.b),
    opacity: opacity * fade * 0.1
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
  if (isForestHazeSuppressedAtCam(inst)) return
  const k = inst.k
  const colorFade = glowDecorFade(inst)
  const gray = HUD_SCORE_COLOR_SETTLED
  const warm = lerpRgb(GLOW_LIGHT_CORE, GLOW_LIGHT_BRIGHT, 0.55)
  const c = inst.zones.colorWorld || colorFade > COLOR_CROSSFADE_EPS
    ? lerpRgb(gray, warm, colorFade * colorFade)
    : gray
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
  if (!isGlowWorldSurfaceDecorUnlocked(inst)) return
  const z = inst.zones
  if (!z.groundDecorLeft && z.groundRightStripMax < 0 && !z.water) return
  const k = inst.k
  const fade = inst.colorFade ?? 0
  const bodyC = DECOR_OUTLINE_RGB
  const bodyColor = k.rgb(bodyC.r, bodyC.g, bodyC.b)
  const rimRgb = fade > COLOR_CROSSFADE_EPS
    ? lerpRgb(bodyC, glowGrassColourTarget(inst.zones), 0.82)
    : lerpRgb(bodyC, LIGHT_GRAY, 0.45)
  const rimColor = k.rgb(rimRgb.r, rimRgb.g, rimRgb.b)
  const x0 = LEFT_MARGIN
  const x1 = WORLD_W - RIGHT_MARGIN
  const lipSteps = isGlowFullParallaxStable(inst) ? GROUND_LIP_STEPS_PARALLAX_STABLE : GROUND_LIP_STEPS
  const step = (x1 - x0) / lipSteps
  const lakeX1 = inst.lakeX1
  const lakeX2 = inst.lakeX2
  const pitMouthCut = inst.pit?.collapsed && inst.pit.zone
    ? getGlowPitEarthBandMouthCutoutForPit(inst.pit)
    : null
  const view = glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN)
  for (let i = 0; i < lipSteps; i++) {
    const x = x0 + i * step
    if (view && (x + step < view.x1 || x > view.x2)) continue
    if (lakeX1 != null && x >= lakeX1 && x <= lakeX2) continue
    if (pitMouthCut && x >= pitMouthCut.leftX && x <= pitMouthCut.rightX) continue
    const op = x >= TREE_X + TRUNK_EXCLUDE_HALF
      ? glowRightWorldOpacity(inst, x, 'large')
      : (z.groundDecorLeft ? (inst.leftDecorFade ?? 1) : 0)
    if (op < 0.12) continue
    const lip = (Math.sin(x * GROUND_LIP_FREQ_A) + Math.sin(x * GROUND_LIP_FREQ_B) * 0.5) * GROUND_LIP_AMP
    const h = Math.max(2, 4 + lip)
    const bodyPos = inst._lipBodyPos ??= k.vec2(0, 0)
    const rimPos = inst._lipRimPos ??= k.vec2(0, 0)
    bodyPos.x = x
    bodyPos.y = FLOOR_Y - h + 2
    rimPos.x = x
    rimPos.y = FLOOR_Y - GROUND_TOP_RIM_H
    k.drawRect({
      pos: bodyPos,
      width: step + 1,
      height: h,
      color: bodyColor,
      opacity: 0.48 * op
    })
    k.drawRect({
      pos: rimPos,
      width: step + 1,
      height: GROUND_TOP_RIM_H,
      color: rimColor,
      opacity: GROUND_TOP_RIM_OPACITY * op
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
const undergroundSpecByK = new WeakMap()
//
// Full-world earth bakes. Reused after prewarm so scene init does not grade
// three WORLD canvases again while the loader sits still.
//
async function loadUndergroundSprites(k, onStep) {
  const entries = undergroundPaletteEntries()
  const cached = undergroundSpecByK.get(k)
  if (cached && glowUndergroundSpritesReady(k)) {
    onStep && await onStep(entries.length, entries.length)
    return cached
  }
  const spec = cached || buildUndergroundSpec()
  for (let i = 0; i < entries.length; i++) {
    const entry = entries[i]
    if (!k.getSprite(entry.name)) {
      const canvas = document.createElement('canvas')
      canvas.width = WORLD_W
      canvas.height = WORLD_H
      const ctx = canvas.getContext('2d')
      renderUndergroundSpec(ctx, spec, entry)
      applyGlowMaterialBake(canvas, entry.name.length * 41)
      k.loadSprite(entry.name, canvas)
      canvas.width = 0
      canvas.height = 0
    }
    onStep && await onStep(i + 1, entries.length)
  }
  undergroundSpecByK.set(k, spec)
  return spec
}
//
// Underground decor palettes: the gray world sits on the playfield-gray
// earth band; the colour world sits on the near-black earth, so its
// features read as slightly lighter tones.
//
function undergroundEarthDecorSprite(z) {
  if (!z?.lCollected) return UNDERGROUND_GRAY_SPRITE
  if (z.colorWorld) return UNDERGROUND_COLOR_SPRITE
  return UNDERGROUND_POST_L_BROWN_SPRITE
}
function undergroundPaletteEntries() {
  const flatGray = glowRgb(GLOW_PAL.decorGray)
  const flatDeep = glowRgb(GLOW_PAL.lightGray)
  const brownFill = glowRgb('groundSand')
  const brownDeep = glowRgb(GLOW_PAL.log.bark)
  const brownLight = glowRgb(GLOW_PAL.log.barkLight)
  return [
    {
      name: UNDERGROUND_GRAY_SPRITE,
      fill: flatGray,
      deep: flatDeep,
      light: glowRgb(GLOW_PAL.brightLight),
      monoStrokes: true
    },
    {
      name: UNDERGROUND_POST_L_BROWN_SPRITE,
      fill: brownFill,
      deep: brownDeep,
      light: brownLight,
      monoStrokes: true
    },
    {
      name: UNDERGROUND_COLOR_SPRITE,
      fill: glowRgb('groundChernozem'),
      deep: glowRgb('mudGround'),
      light: glowRgb('groundSand')
    }
  ]
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
// The two right-side ear-trees can sit as close as ~350-460px apart — at the
// old 240px-per-side clearance their exclusion zones combined ate almost the
// whole (now much narrower, right-of-mud-only) placement span, leaving too
// little room to ever reach the 5-7 buoy target. A thin chain doesn't need
// nearly as much clearance from a tree as it did when buoys could spawn
// anywhere in the world; the dedicated between-right-trees placement (see
// addGlowChainBuoysBetweenRightTrees) already handles the gap between the
// two trees specifically with its own tighter 40px margin.
//
//
// Only block buoys directly in front of an ear-tree (west of the trunk —
// hero walks left-to-right). Beside/behind the trunk stays valid.
//
const GLOW_CHAIN_BUOY_EAR_TREE_ON_TRUNK_HALF = 16
const GLOW_CHAIN_BUOY_EAR_TREE_FRONT_DEPTH = 72
const GLOW_CHAIN_BUOY_EAR_TREE_BEHIND_DEPTH = 72
const GLOW_CHAIN_BUOY_EAR_TREE_FAR_CLEAR = 118
const GLOW_CHAIN_BUOY_MUD_EAST_MIN = 4
//
// All buoys stay right of the mud zone (the lake sits to the mud's own
// left) — same gap the ear-trees use right of the mud.
//
const GLOW_CHAIN_BUOY_MUD_RIGHT_GAP = 56
//
// A couple of buoys deliberately placed between the two right-side ear-trees
// (see addGlowChainBuoysBetweenRightTrees) — the general clearance above
// keeps ordinary random buoys away from ear-trees, but that same clearance
// would also swallow the whole gap between two trees only GLOW_EAR_TREE_MIN_GAP
// apart, so this placement bypasses it on purpose.
//
const GLOW_CHAIN_BUOY_BETWEEN_TREE_MARGIN = 40
const GLOW_CHAIN_BUOY_PLATFORM_X_MARGIN = 36
const GLOW_CHAIN_BUOY_PLATFORM_SIDE_MIN = 88
const GLOW_CHAIN_BUOY_PLATFORM_SIDE_JITTER = 56
const GLOW_EAR_TREE_RIGHT_COUNT = 2
const GLOW_EAR_TREE_MUD_RIGHT_GAP = 56
const GLOW_EAR_TREE_RIGHT_CAVE_MARGIN = 48
const GLOW_EAR_TREE_MIN_GAP = 240
const GLOW_EAR_TREE_MUD_CLEAR = 36
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
const GLOW_EAR_TREE_WHISPER_RADIUS = 300
const GLOW_EAR_TREE_WHISPER_MAX_VOLUME = 0.42
//
// Minimum change in proximity (0..1) per frame to count as moving toward or
// away from the nearest lip-tree — ignores sub-pixel jitter.
//
const GLOW_EAR_TREE_WHISPER_PROX_DELTA = 0.002
//
// Lip-tree whispers only apply on the forest floor — below the lip (cave /
// pit) horizontal nearness must not keep the loop audible.
//
const GLOW_EAR_TREE_WHISPER_SURFACE_FOOT_Y = FLOOR_Y - 10
const GLOW_EARLY_LAND_FOOT_ABOVE = 26
//
// Clearance kept around the cave crack zone for both decor kinds — neither
// should ever spawn over the cave entrance.
//
const GLOW_CAVE_DECOR_CLEAR = 140
function buildGlowChainBuoyWoodBands(cfg) {
  const { horizBranch, lPlatX, wPlatX, oPlatX } = cfg
  const bands = []
  horizBranch && bands.push({ x1: horizBranch.x1, x2: horizBranch.x2 })
  lPlatX != null && bands.push({ x1: lPlatX, x2: lPlatX + LOG_W })
  wPlatX != null && bands.push({ x1: wPlatX, x2: wPlatX + LOG_W })
  oPlatX != null && bands.push({ x1: oPlatX, x2: oPlatX + LOG_W })
  return bands
}
function glowChainBuoyXUnderWoodPlatform(x, woodBands) {
  const margin = GLOW_CHAIN_BUOY_PLATFORM_X_MARGIN
  return (woodBands ?? []).some(b => x >= b.x1 - margin && x <= b.x2 + margin)
}
function buildGlowChainBuoySpot(x, opts = null) {
  return {
    x,
    groundY: FLOOR_Y,
    chainTrampRole: opts?.chainTrampRole ?? null,
    seed: opts?.seed ?? Math.random() * Math.PI * 2,
    segmentCount: opts?.segmentCount ?? 5 + Math.floor(Math.random() * 4),
    segmentLen: opts?.segmentLen ?? 22 + Math.random() * 10,
    segmentWidth: opts?.segmentWidth ?? 3.85 + Math.random() * 0.55,
    swayAmp: opts?.swayAmp ?? 0.09 + Math.random() * 0.12,
    swaySpeed: opts?.swaySpeed ?? 0.75 + Math.random() * 0.65,
    swayLag: opts?.swayLag ?? 0.35 + Math.random() * 0.35
  }
}
function computeGlowChainTrampLayoutForTramp(trampX) {
  return ChainEyeTramp.computeGlowChainTrampLayout(
    trampX,
    FLOOR_Y,
    GLOW_CHAIN_TRAMP_EYE_STEP_X,
    GLOW_CHAIN_TRAMP_LEFT_EYE_EXTRA_LEFT,
    GLOW_CHAIN_TRAMP_MUSH_STEP_X,
    GLOW_CHAIN_TRAMP_PAIR_SHIFT_LEFT,
    GLOW_CHAIN_TRAMP_SEGMENT_LEN,
    GLOW_CHAIN_TRAMP_LEFT_SEGMENTS,
    GLOW_CHAIN_TRAMP_MIDDLE_SEGMENTS,
    L_PLAT_ABOVE_LEFT_CHAIN_EYE,
    L_PLAT_LEFT_OF_LEFT_CHAIN_EYE_GAP,
    L_PLAT_SHIFT_LEFT,
    LOG_W
  )
}
function glowChainTrampReservedX(x, trampX) {
  if (trampX == null) return false
  const layout = computeGlowChainTrampLayoutForTramp(trampX)
  if (x < layout.leftX - GLOW_CHAIN_TRAMP_WEST_MARGIN) return true
  return Math.abs(x - layout.middleX) < GLOW_CHAIN_BUOY_MIN_GAP ||
    Math.abs(x - layout.leftX) < GLOW_CHAIN_BUOY_MIN_GAP
}
function pruneGlowChainBuoysWestOfTrampPair(spots, trampX) {
  if (trampX == null || !spots?.length) return
  const layout = computeGlowChainTrampLayoutForTramp(trampX)
  const westBound = layout.leftX - GLOW_CHAIN_TRAMP_WEST_MARGIN
  for (let i = spots.length - 1; i >= 0; i--) {
    const spot = spots[i]
    if (spot.chainTrampRole) continue
    if (spot.x < westBound) spots.splice(i, 1)
  }
}
function tryAddGlowChainBuoySpot(spots, x, lakeX1, lakeX2, mud, cave, woodBands, earTreeSpots, trampX, branchTrampX) {
  if (Math.abs(x - TREE_X) < GLOW_CHAIN_BUOY_TREE_CLEAR_HALF) return false
  if (glowChainBuoyXUnderWoodPlatform(x, woodBands)) return false
  if (glowChainTrampReservedX(x, trampX)) return false
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
  addGlowChainBuoysBetweenRightTrees(spots, trampX)
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
  spots.sort((a, b) => a.x - b.x)
  return spots
}
//
// Blocks buoys on the trunk, directly in front, or directly behind an
// ear-tree — beside (left/right offset) or far away stays valid.
//
function glowChainBuoyXBlockedNearEarTree(x, treeX) {
  const dx = x - treeX
  if (Math.abs(dx) >= GLOW_CHAIN_BUOY_EAR_TREE_FAR_CLEAR) return false
  if (Math.abs(dx) <= GLOW_CHAIN_BUOY_EAR_TREE_ON_TRUNK_HALF) return true
  if (dx < 0 && dx > -GLOW_CHAIN_BUOY_EAR_TREE_FRONT_DEPTH) return true
  if (dx > 0 && dx < GLOW_CHAIN_BUOY_EAR_TREE_BEHIND_DEPTH) return true
  return false
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
// A couple of chain-buoys nestled specifically between the two right-side
// ear-trees — the ordinary random placement above always excludes this
// ear-tree trunk/front/behind clearance (see glowChainBuoyXBlockedNearEarTree), so it's added here
// on purpose instead, clear of each trunk by only a small margin.
//
function addGlowChainBuoysBetweenRightTrees(spots, trampX) {
  const layout = computeGlowChainTrampLayoutForTramp(trampX)
  for (let i = spots.length - 1; i >= 0; i--) {
    const sx = spots[i].x
    if (Math.abs(sx - layout.middleX) < GLOW_CHAIN_BUOY_MIN_GAP ||
      Math.abs(sx - layout.leftX) < GLOW_CHAIN_BUOY_MIN_GAP) {
      spots.splice(i, 1)
    }
  }
  const pushChainTrampSpot = (x, role, segmentCount, seed) => {
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
  pushChainTrampSpot(
    layout.middleX,
    ChainEyeTramp.CHAIN_EYE_ROLE_MIDDLE,
    GLOW_CHAIN_TRAMP_MIDDLE_SEGMENTS,
    2.17
  )
  pushChainTrampSpot(
    layout.leftX,
    ChainEyeTramp.CHAIN_EYE_ROLE_LEFT,
    GLOW_CHAIN_TRAMP_LEFT_SEGMENTS,
    4.83
  )
}
//
// Ear-tree decor spots — two trees clustered right of the big tree (never over mud).
//
function glowEarTreeSpotXAllowed(spots, x, branchTrampX) {
  if (Math.abs(x - branchTrampX) < TRAMP_GRASS_CLEAR_HALF) return false
  return !spots.some(s => Math.abs(s.x - x) < GLOW_EAR_TREE_MIN_GAP)
}
function tryAddGlowEarTreeSpot(spots, x, branchTrampX, heightTier) {
  if (!glowEarTreeSpotXAllowed(spots, x, branchTrampX)) return false
  spots.push(buildGlowEarTreeSpot(x, heightTier))
  return true
}
function buildGlowEarTreeSpots(treeBaseLeftX) {
  const mud = computeGlowMudZoneX()
  const cave = getCrackZone(WORLD_W, FLOOR_Y)
  //
  // The branch (left) mushroom trampoline sits at TREE_X + a modest offset —
  // well inside the right-side placement range below — and its own footprint
  // was never excluded, so a spot could land right on top of it: the
  // mushroom's cap/stem then visually covers the tree's thin trunk column
  // while its wider branches remain visible above, reading as "no trunk".
  //
  const branchTrampX = TREE_X + TRUNK_EXCLUDE_HALF + BRANCH_TRAMP_OFFSET_X
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
    tryAddGlowEarTreeSpot(spots, x, branchTrampX, rightHeightTiers[spots.length])
  }
  if (spots.length < GLOW_EAR_TREE_RIGHT_COUNT && rightXMax > rightXMin + minSpan) {
    const span = rightXMax - rightXMin
    const fallbackXs = [
      rightXMin + span * 0.2,
      rightXMin + span * 0.8
    ]
    for (let i = spots.length; i < GLOW_EAR_TREE_RIGHT_COUNT; i++) {
      tryAddGlowEarTreeSpot(spots, fallbackXs[i], branchTrampX, rightHeightTiers[i])
    }
  }
  spots.sort((a, b) => a.x - b.x)
  if (spots.length < GLOW_EAR_TREE_COUNT && rightXMax > rightXMin + minSpan) {
    const span = rightXMax - rightXMin
    let tier = 0
    for (let slot = 1; spots.length < GLOW_EAR_TREE_COUNT && slot <= GLOW_EAR_TREE_COUNT; slot++) {
      const x = rightXMin + span * (slot / (GLOW_EAR_TREE_COUNT + 1))
      tryAddGlowEarTreeSpot(spots, x, branchTrampX, rightHeightTiers[tier % rightHeightTiers.length]) &&
        (tier += 1)
    }
    spots.sort((a, b) => a.x - b.x)
  }
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
// Ear-tree whisper volume from hero distance to the nearest lip-tree.
//
function resetGlowEarTreeWhisperProximityState(inst) {
  if (!inst.earWhisperProximityState) return
  inst.earWhisperProximityState.last = 0
  inst.earWhisperProximityState.wasReceding = false
}
function fadeOutGlowEarTreeWhisper(inst) {
  Sound.setEarTreeWhisperVolume(0)
  resetGlowEarTreeWhisperProximityState(inst)
}
function setGlowEarTreeWhisperVolume(inst, volume) {
  const vol = Math.max(0, Math.min(1, volume))
  Sound.setEarTreeWhisperVolume(vol)
}
function updateGlowEarTreeWhisperSound(inst, char) {
  const fadeOut = () => fadeOutGlowEarTreeWhisper(inst)
  if (!char?.pos || !inst.zones.lCollected || !inst.earTrees?.trees?.length) {
    fadeOut()
    return
  }
  if (inst.dialogOpen || inst.drowning) {
    fadeOut()
    return
  }
  const footY = char.pos.y + SURFACE_DETECT_Y
  if (isHeroInsideGlowPitCave(inst, char.pos.x, char.pos.y, footY)) {
    fadeOut()
    return
  }
  inst.sound && Sound.resumeAudioContext(inst.sound)
  const hx = char.pos.x
  const surfaceDy = Math.max(0, footY - GLOW_EAR_TREE_WHISPER_SURFACE_FOOT_Y)
  let nearestDist = Infinity
  for (const tree of inst.earTrees.trees) {
    const dx = hx - tree.x
    nearestDist = Math.min(nearestDist, Math.hypot(dx, surfaceDy))
  }
  const proximity = nearestDist >= GLOW_EAR_TREE_WHISPER_RADIUS
    ? 0
    : 1 - nearestDist / GLOW_EAR_TREE_WHISPER_RADIUS
  const whisperMax = CFG.audio.backgroundMusic.whisper ?? GLOW_EAR_TREE_WHISPER_MAX_VOLUME
  const vol = whisperMax * proximity
  if (vol <= 0.001) {
    fadeOut()
    return
  }
  if (!inst.earWhisperProximityState) {
    inst.earWhisperProximityState = { last: proximity, wasReceding: false }
  }
  const proxState = inst.earWhisperProximityState
  const approaching = proximity > proxState.last + GLOW_EAR_TREE_WHISPER_PROX_DELTA
  const receding = proximity < proxState.last - GLOW_EAR_TREE_WHISPER_PROX_DELTA
  receding && (proxState.wasReceding = true)
  if (approaching && proxState.wasReceding) {
    Sound.rewindEarTreeWhisperToStart()
    proxState.wasReceding = false
  }
  proxState.last = proximity
  setGlowEarTreeWhisperVolume(inst, vol)
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
  const fossil = { x: randX(), y: randY(), r: 9 + Math.random() * 5 }
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
  return { rocks, cracks, pebbles, rootlets, fossil, shells, bones, coins, bottles, worms, skeleton: null }
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
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.globalAlpha = 0.85
    ctx.beginPath()
    ctx.moveTo(-bone.len * 0.5, 0)
    ctx.lineTo(bone.len * 0.5, 0)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(-bone.len * 0.5, 0, 2.5, 0, Math.PI * 2)
    ctx.arc(bone.len * 0.5, 0, 2.5, 0, Math.PI * 2)
    ctx.fillStyle = lightCss
    ctx.fill()
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
// Strokes an open polyline through the given points.
//
function strokePolyline(ctx, pts) {
  ctx.beginPath()
  pts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  ctx.stroke()
}
//
// Hides baked underground detail in the static parallax band until the live
// layer or colour fade has caught up (post-L underground is immediate).
//
function maskGlowUndergroundDecorUntilReveal(inst, k, groundFillC) {
  const z = inst.zones
  if (!z.lCollected || z.oZone || z.oCollected || !groundFillC) return
  const reveal = glowPostLUndergroundRevealFade(inst)
  if (reveal >= 1 - COLOR_CROSSFADE_EPS) return
  const cover = 1 - reveal
  if (cover <= COLOR_CROSSFADE_EPS) return
  //
  // Routed through drawGlowHorizontalBand (cutCaveMouth: true) instead of a
  // raw full-width k.drawRect — this mask used to paint straight across the
  // whole ground band with no awareness of the crack/cave-mouth cutout,
  // covering drawGlowPit's own void-fill/cracks with a flat grey rect
  // whenever this reveal-fade mask was active (post-L, pre-O) right where
  // the hero could be falling into the cave.
  //
  const innerGray = isPlayfieldInnerGrayVisible(inst.zones, inst.colorFade ?? 0)
  const maskRgb = innerGray ? glowGrayGroundRgb(inst, true) : INNER_GRAY
  drawGlowHorizontalBand(
    k, inst, FLOOR_Y + UNDERGROUND_DETAIL_MASK_Y, CAVE_BAND_H - UNDERGROUND_DETAIL_MASK_Y,
    k.rgb(maskRgb.r, maskRgb.g, maskRgb.b), cover, true
  )
}
//
// Hides monolithic-tree roots until the post-L stillness countdown reveals them.
//
function maskGlowMonolithTreeRootsUntilReveal(inst, k, groundC) {
  if (!inst.treeDrawMonolith || inst.treeObj?.hidden) return
  const z = inst.zones
  if ((!z.lCollected && !z.gCollected) || !groundC) return
  const reveal = glowTreeRootRevealFade(inst)
  if (reveal >= 1 - COLOR_CROSSFADE_EPS) return
  const cover = 1 - reveal
  if (cover <= COLOR_CROSSFADE_EPS) return
  k.drawRect({
    pos: k.vec2(TREE_X - TRUNK_EXCLUDE_HALF, FLOOR_Y),
    width: TRUNK_EXCLUDE_HALF * 2,
    height: TREE_ROOT_MAX_Y - FLOOR_Y + 4,
    color: k.rgb(groundC.r, groundC.g, groundC.b),
    opacity: cover
  })
}
//
// True when the live underground sprites should paint (not fully replaced by
// an opaque static parallax earth band).
//
function shouldDrawGlowLiveUnderground(inst) {
  if (!isGlowUndergroundLayerVisible(inst)) return false
  if (isGlowFullParallaxStable(inst)) return false
  const z = inst.zones
  if (!z.lZoneParallax) return true
  return (inst.parallaxFade ?? 0) <= COLOR_CROSSFADE_EPS
}
//
// Draws the baked underground decor with the gray↔colour crossfade.
//
function drawUndergroundLayer(inst) {
  if (!shouldDrawGlowLiveUnderground(inst)) return
  const z = inst.zones
  const fade = inst.colorFade ?? 0
  const ugLife = glowPostLUndergroundRevealFade(inst)
  const playfieldX1 = LEFT_MARGIN
  const playfieldX2 = WORLD_W - RIGHT_MARGIN
  const drawBands = (sprite, opacity) => {
    if (z.lCollected && !z.colorWorld) {
      drawGlowUndergroundPlayfieldBands(inst, inst.k, sprite, opacity, playfieldX1, playfieldX2)
      return
    }
    drawUndergroundSpriteClipped(inst, sprite, opacity)
  }
  if (isGlowFlatSingleDecorColor(inst) || isGlowGrayExploreBeforeL(z, inst.colorFade ?? 0) || !z.lCollected) {
    drawBands(UNDERGROUND_GRAY_SPRITE, 1)
    return
  }
  if (!z.colorWorld) {
    drawBands(UNDERGROUND_POST_L_BROWN_SPRITE, 1)
    return
  }
  //
  // Once fully faded, skip the now-invisible gray sprite entirely — drawing
  // a fully transparent full-screen sprite every frame forever after O still
  // costs a full draw call. In practice this function itself now only runs
  // during the brief post-O fade window — see shouldDrawGlowLiveUnderground,
  // which skips calling it at all once BG_STATIC_COLOR already bakes in the
  // same underground decor.
  //
  if (fade >= 1 && z.colorWorld) {
    drawBands(UNDERGROUND_COLOR_SPRITE, 1)
    return
  }
  const grayOp = (1 - fade) * ugLife
  grayOp > COLOR_CROSSFADE_EPS && drawBands(UNDERGROUND_GRAY_SPRITE, grayOp)
  fade > COLOR_CROSSFADE_EPS && drawBands(UNDERGROUND_COLOR_SPRITE, fade * ugLife)
}
//
// Paints the underground under opened ground: left shore and explored right
// strips before L; after L the full playfield band is painted in drawBands.
//
//
// Skips the pit mouth cutout so the flat earth gap can match the strip left
// of the cave (no film-grain underground peek inside the opening).
//
function drawGlowUndergroundPlayfieldBands(inst, k, sprite, opacity, x1, x2) {
  const pit = inst.pit
  if (pit?.collapsed && pit.zone) {
    const cut = getGlowPitEarthBandMouthCutoutForPit(pit)
    cut.leftX > x1 + 1 &&
      drawUndergroundSpriteBand(k, sprite, opacity, x1, cut.leftX)
    cut.rightX < x2 - 1 &&
      drawUndergroundSpriteBand(k, sprite, opacity, cut.rightX, x2)
    return
  }
  drawUndergroundSpriteBand(k, sprite, opacity, x1, x2)
}
function drawUndergroundSpriteClipped(inst, sprite, opacity) {
  const z = inst.zones
  if (z.gUndergroundLive && !z.lCollected) {
    const x1 = LEFT_MARGIN
    const x2 = getGlowCaveMouthFloorLeftX(getCrackZone(WORLD_W, FLOOR_Y))
    x2 > x1 && drawUndergroundSpriteBand(inst.k, sprite, opacity, x1, x2)
    return
  }
  z.groundDecorLeft &&
    drawUndergroundSpriteBand(inst.k, sprite, opacity, LEFT_MARGIN, TREE_X)
  if (!z.gCollected || (z.groundRightStripMax ?? -1) < 0) return
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
function createRoundedCorners(k, zones) {
  loadPlayfieldCornerSprites(k)
  const spriteName = cornerSpriteNameForZones(zones)
  const TOP_CORNER_Z = CFG.visual.zIndex.ui + 30
  const { topY, bottomY, leftX, rightX } = playfieldCornerPositions()
  const corners = [
    k.add([k.sprite(spriteName), k.pos(leftX, topY), k.anchor('topleft'), k.z(TOP_CORNER_Z), { fixed: true }]),
    k.add([k.sprite(spriteName), k.pos(rightX, topY), k.rotate(90), k.anchor('topleft'), k.z(TOP_CORNER_Z), { fixed: true }]),
    k.add([k.sprite(spriteName), k.pos(leftX, bottomY), k.rotate(270), k.anchor('topleft'), k.z(PLAYFIELD_BOTTOM_CORNER_Z), { fixed: true }]),
    k.add([k.sprite(spriteName), k.pos(rightX, bottomY), k.rotate(180), k.anchor('topleft'), k.z(PLAYFIELD_BOTTOM_CORNER_Z), { fixed: true }])
  ]
  //
  // Stay hidden until applyZoneVisibility()/applyGlowEyeIntroZoneVisibility()
  // run — async bootstrap can yield several frames before either fires, and
  // a visible corner here (picked from whatever zones.outerFrame reads at
  // this exact instant) flashes a mismatched void/outer colour at the
  // bottom corners for a moment on a colour-phase load.
  //
  corners.forEach(obj => { obj.hidden = true })
  glowPlayfieldCornerObjs = corners
  updatePlayfieldCornerPositions()
  return corners
}
//
// Which pre-baked corner sprite matches the current outer-frame state.
//
function cornerSpriteNameForZones(zones) {
  return isOuterFrameVisible(zones) ? CORNER_SPRITE_OUTER : CORNER_SPRITE_VOID
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
// Swaps the corner objects to the other pre-baked sprite when the playfield
// chrome switches void → outer. Both variants are already loaded (see
// loadPlayfieldCornerSprites), so this is an instant sprite-name swap with no
// reload gap that could flash a stale-colour corner for a frame.
//
function refreshPlayfieldCornerSprites(inst) {
  const hex = isOuterFrameVisible(inst.zones) ? OUTER_BG_HEX : GLOW_PAL.glowPreludeBackdrop
  if (inst.cornerColorHex === hex) return
  inst.cornerColorHex = hex
  const spriteName = cornerSpriteNameForZones(inst.zones)
  inst.cornerObjs?.forEach(obj => {
    obj?.exists?.() && obj.use(inst.k.sprite(spriteName))
  })
}
//
// Bakes both playfield corner mask variants (void fill + outer-frame fill,
// each with the inner quarter-circle cut) once per scene entry.
//
function loadPlayfieldCornerSprites(k) {
  const voidCanvas = makeRoundedCornerCanvas(CORNER_RADIUS, GLOW_PAL.glowPreludeBackdrop)
  k.loadSprite(CORNER_SPRITE_VOID, voidCanvas)
  voidCanvas.width = 0
  voidCanvas.height = 0
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
// Log-style platform — value 5 environment silhouette (same shape as touch logs).
//
function createGrayLogPlatform(
  k, x, y, w, h, sound, heroInst, zones, outlineStyle = false, logAtlas,
  collisionDropY = LOG_COLLISION_DROP_Y
) {
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
    k.area({ offset: k.vec2(0, collisionDropY) }),
    k.body({ isStatic: true }),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName,
    {
      _ghostDraw: false,
      _homeX: x,
      _homeY: y,
      _collisionDropY: collisionDropY,
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
          const sc = zones._sceneRef
          const meditationFade = sc?.zones?.lCollected && sc.meditation?.countdown != null
            ? meditationCountdownFade(sc)
            : 0
          const flatMonoLog = sc && (isGlowFlatSingleDecorColor(sc) || (!zones.lCollected && !zones.colorWorld))
          const contourDefault = flatMonoLog
            ? DECOR_GRAY
            : fade > COLOR_CROSSFADE_EPS
              ? PLATFORM_OUTLINE_RGB
              : DECOR_OUTLINE_RGB
          const outlineBase = meditationFade > 0
            ? {
              r: Math.round(contourDefault.r + (getRGB(k, glowLogColors(zones).bark).r - contourDefault.r) * meditationFade),
              g: Math.round(contourDefault.g + (getRGB(k, glowLogColors(zones).bark).g - contourDefault.g) * meditationFade),
              b: Math.round(contourDefault.b + (getRGB(k, glowLogColors(zones).bark).b - contourDefault.b) * meditationFade)
            }
            : contourDefault
          const outlineRgb = k.rgb(outlineBase.r, outlineBase.g, outlineBase.b)
          //
          // Stays true neutral gray while the world is still flat, same as
          // the other log platforms below — glowLogColors() returns the
          // warm "lit" sand bark tone unconditionally, which read as a
          // stray second colour on top of the black outline while
          // everything else on screen was still strict grayscale.
          //
          const detailHex = flatMonoLog
            ? GLOW_PAL.decorGray
            : (fade > 0.01 || zones.lCollected)
              ? glowLogColors(zones).bark
              : GLOW_PAL.void
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
          fade < 0.98 && drawLOutlineLogPlatform(k, w, h, ox, oy, this._logDetail, outlineRgb, detailRgb, reveal, flatMonoLog)
          !flatMonoLog && fade > COLOR_CROSSFADE_EPS &&
            drawLogPlatform(k, w, h, ox, oy, fade * reveal, this._logDetail, glowLogColors(zones))
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
        drawMonoLogPlatformDetails(k, ox, oy, w, h, this._logDetail, getRGB(k, GLOW_PAL.void), reveal)
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
    const baked = requests.map((r, i) => {
      const canvas = bakeLogPlatformCanvas(k, r.w, r.h, r.detail, r.colors)
      applyGlowMaterialBake(canvas, 8000 + i)
      return canvas
    })
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
// Cracks, knots and grain on gray log platforms — void tone like the backdrop.
//
function drawMonoLogPlatformDetails(k, ox, oy, w, h, detail, color, opacity = 1) {
  if (!detail) return
  const halfH = h / 2
  const halfW = w / 2
  const stripeCount = 5
  for (let i = 0; i < stripeCount; i++) {
    const ly = -halfH + (h / (stripeCount + 1)) * (i + 1) + oy
    k.drawRect({
      pos: k.vec2(-halfW + ox, ly),
      width: w * 0.82,
      height: 1,
      color,
      opacity: 0.55 * opacity
    })
  }
  for (const crack of detail.cracks) {
    const dx = Math.cos(crack.angle) * crack.len * 0.5
    const dy = Math.sin(crack.angle) * crack.len * 0.5
    k.drawLines({
      pts: [
        k.vec2(crack.x - dx + ox, crack.y - dy + oy),
        k.vec2(crack.x + dx + ox, crack.y + dy + oy)
      ],
      width: 1,
      color,
      opacity: 0.85 * opacity
    })
  }
  for (const knot of detail.knots || []) {
    k.drawCircle({
      pos: k.vec2(knot.x + ox, knot.y + oy),
      radius: knot.r,
      color,
      opacity: 0.45 * opacity
    })
  }
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
function drawLOutlineLogPlatform(k, w, h, ox, oy, detail, outlineColor, detailColor, opacity = 1, filledBody = false) {
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
  filledBody && bodyPts.length > 2 && k.drawPolygon({
    pts: bodyPts,
    color: detailColor,
    opacity: 0.94 * opacity
  })
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
function glowCaptionTextRgb() {
  //
  // Same light gray the world letters and every dialog use, in both worlds:
  // the darker tree-trunk gray sank into the monochrome backdrop and left the
  // caption unreadable.
  //
  return LIGHT_GRAY
}
//
// Gray-world void outline vs colour-world drop shadow — shared by world
// letters (not baked pickup captions).
//
function glowLetterVisualStyle(inst) {
  const zones = inst?.zones
  const sc = zones?._sceneRef
  const colorWorld = Boolean(zones?.colorWorld)
  const colorFade = sc?.colorFade ?? (colorWorld ? 1 : 0)
  const useColorCaptionStyle = colorWorld && colorFade >= 0.85
  return {
    withShadow: useColorCaptionStyle,
    withOutline: !useColorCaptionStyle,
    outlinePad: useColorCaptionStyle ? GLOW_LETTER_CAPTION_OUTLINE_PAD : GLOW_LETTER_CAPTION_OUTLINE_PAD_MONO
  }
}
//
// Toggles void-outline vs drop-shadow layers on a world pickup letter.
//
function syncGlowPickupLetterVisual(entry, style, inst) {
  if (!entry || entry.forceVisible) return
  const visible = !entry.main?.hidden
  const flatPickup = inst && (isGlowFlatSingleDecorColor(inst) || isGlowWorldLetterFlatBeforeL(inst, entry?.char))
  const gFlatWhite = isGlowWorldLetterFlatBeforeL(inst, entry?.char) && visible
  const skipOutline = flatPickup && (entry.char === 'G' || entry.char === 'L')
  if (gFlatWhite) {
    const white = getRGB(inst.k, CFG.visual.colors.hero.eyeWhite)
    entry.main && (entry.main.color = inst.k.rgb(white.r, white.g, white.b))
    entry.outlineObjs?.forEach(obj => { obj.hidden = true })
    entry.shadowObjs?.forEach(obj => { obj.hidden = false })
    return
  }
  entry.outlineObjs?.forEach(obj => { obj.hidden = !visible || !style.withOutline || skipOutline })
  entry.shadowObjs?.forEach(obj => { obj.hidden = !visible || !style.withShadow })
}
//
// Void outline reads green in flat explore — use a neutral gray rim instead.
//
function glowPickupLetterOutlineColor(k, inst) {
  if (inst && isGlowFlatSingleDecorColor(inst)) {
    return getRGB(k, GLOW_PAL.lightGray)
  }
  return k.rgb(VOID.r, VOID.g, VOID.b)
}
function applyGlowPickupLetterOutlineColors(inst, entry) {
  if (!entry?.outlineObjs?.length) return
  if (entry.char === 'G' && isGlowWorldLetterFlatBeforeL(inst, 'G')) return
  const c = glowPickupLetterOutlineColor(inst.k, inst)
  entry.outlineObjs.forEach(obj => { obj.color = c })
}
//
// Keeps every uncollected pickup letter styled like its caption text.
//
function syncGlowPickupLetterVisuals(inst) {
  const style = glowLetterVisualStyle(inst)
  const entries = [inst.gLetter, inst.lLetter, inst.oLetter, inst.wLetter]
  entries.forEach(entry => {
    syncGlowPickupLetterVisual(entry, style, inst)
    applyGlowPickupLetterOutlineColors(inst, entry)
  })
}
//
// Blinking letter — optional gold fill for G, void outline in gray world
// and a drop shadow in the colour world (same rules as the caption).
//
function createGlowLetter(k, char, x, y, tiltDeg, fillHex = GLOW_PAL.letterFill, opts = {}) {
  const noShadow = Boolean(opts.noShadow)
  const noOutline = Boolean(opts.noOutline)
  const fill = getRGB(k, fillHex)
  const outlineObjs = noOutline ? [] : GLOW_LETTER_CAPTION_OUTLINE_OFFSETS.map(([odx, ody]) => {
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
  const shadowObjs = []
  if (!noShadow) {
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
    shadowObjs.push(shadowObj)
  }
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
    getSwayScale: () => glowGrassSwayScale(zones),
    roots: true,
    getRootColor: () => glowGrassRootColor(zones),
    getRootVisible: (worldX) => glowGrassRootVisible(zones, worldX),
    hueVaryMax: zones.lCollected || zones.oCollected || zones.colorWorld ? GLOW_GRASS_HUE_VARY_MAX : 0,
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
    getTint: (blade) => glowMudZoneGrassTint(zones._sceneRef, zones, blade),
    getSwayScale: () => glowGrassSwayScale(zones),
    roots: true,
    getRootColor: () => glowGrassRootColor(zones),
    getRootVisible: (worldX) => glowGrassRootVisible(zones, worldX),
    hueVaryMax: zones.lCollected || zones.oCollected || zones.colorWorld ? GLOW_GRASS_HUE_VARY_MAX : 0,
    hueVarySkew: GLOW_GRASS_HUE_VARY_SKEW
  })
  grass.layer.hidden = true
  return grass
}
//
// Small tuft patch hiding the right spikes on the L-log platform's edge.
//
function glowSpikeGrassLogRightX(spikeZoneRightX) {
  const endR = LOG_H * 0.5
  return spikeZoneRightX + endR * L_PLAT_END_SQUASH - RIGHT_SPIKE_GRASS_LOG_TIP_INSET
}
function createGlowSpikeGrass(k, zones, x1, x2, y) {
  const logRightX = glowSpikeGrassLogRightX(x2)
  const grass = Grass.create({
    k,
    floorY: y,
    left: x1,
    right: logRightX,
    tuftCount: RIGHT_SPIKE_GRASS_TUFT_COUNT,
    z: GRASS_Z,
    getScaleMult: () => RIGHT_SPIKE_GRASS_SCALE_MULT,
    postBakeCanvas: applyGlowGameplaySharpBake,
    getTint: () => glowSpikeGrassTint(zones._sceneRef, zones),
    getSwayScale: () => glowGrassSwayScale(zones),
    hueVaryMax: zones.lCollected || zones.oCollected || zones.colorWorld ? GLOW_GRASS_HUE_VARY_MAX : 0,
    hueVarySkew: GLOW_GRASS_HUE_VARY_SKEW
  })
  ensureGlowSpikeGrassCoversRightSpike(grass, x2, logRightX)
  clampGlowSpikeGrassToLogRight(grass, logRightX)
  grass.layer.hidden = true
  return grass
}
//
// Keeps blade silhouettes inside the L-log's right silhouette tip.
//
function clampGlowSpikeGrassToLogRight(grass, logRightX) {
  const blades = grass?.blades
  if (!blades?.length) return
  for (const blade of blades) {
    const halfW = blade.width * 0.5
    blade.x + halfW > logRightX && (blade.x = logRightX - halfW)
  }
  blades.sort((a, b) => a.x - b.x)
}
//
// Guarantees at least one tuft over the rightmost spike.
//
function ensureGlowSpikeGrassCoversRightSpike(grass, spikeZoneRightX, logRightX) {
  const blades = grass?.blades
  if (!blades?.length) return
  const coverMinX = spikeZoneRightX - 12
  if (blades.some(b => b.x >= coverMinX)) return
  const maxX = blades.reduce((m, b) => Math.max(m, b.x), blades[0].x)
  const shift = Math.min(coverMinX - maxX, logRightX - maxX - 4)
  if (shift <= 0) return
  const tuftBand = 28
  for (const blade of blades) {
    blade.x >= maxX - tuftBand && (blade.x += shift)
  }
  blades.sort((a, b) => a.x - b.x)
}
//
// Grass tint hiding the right spikes — same gray/green crossfade as the mud
// band, but only while the L-log platform itself is visible.
//
function glowSpikeGrassTint(sc, zones) {
  if (!zones.lPlatRevealed) return null
  if (sc && isGlowFlatSingleDecorColor(sc)) return DECOR_GRAY
  return glowPeekStrawGrassTint(sc, zones, null)
}
//
// Fixed wooden spikes on the L-log's right edge — a static hazard drawn
// directly (no baking; a handful of triangles redrawn every frame), same
// gray-outline/wood-bark crossfade as the log platform itself. Blinks white
// for RIGHT_SPIKE_BLINK_DURATION when the L log first appears (revealLPlatZone)
// and again when the hero touches them (checkGlowRightSpikeDeath).
//
function createGlowRightSpikes(k, zones, x1, x2, y) {
  const spikes = { x1, x2, y, triggered: false, blinkUntil: 0 }
  spikes.drawObj = k.add([
    k.pos(0, 0),
    k.z(CFG.visual.zIndex.platforms),
    {
      draw() {
        drawGlowRightSpikes(k, zones, spikes)
      }
    }
  ])
  spikes.drawObj.hidden = true
  return spikes
}
function drawGlowRightSpikes(k, zones, spikes) {
  if (spikes.drawObj.hidden) return
  const blinking = k.time() < spikes.blinkUntil
  //
  // Normally behind the grass (platforms z < GRASS_Z), same as any other
  // ground hazard — but the warning flash needs to actually be seen, so it
  // steps in front of the grass for exactly the blink window.
  //
  spikes.drawObj.z = blinking ? RIGHT_SPIKE_BLINK_Z : CFG.visual.zIndex.platforms
  const sc = zones._sceneRef
  const fade = sc?.colorFade ?? (zones.colorWorld ? 1 : 0)
  const flatMono = sc && isGlowFlatSingleDecorColor(sc)
  const fillHex = flatMono
    ? GLOW_PAL.decorGray
    : (fade > 0.01 || zones.lCollected) ? glowLogColors(zones).bark : GLOW_PAL.void
  const fillRgb = blinking ? k.rgb(255, 255, 255) : getRGB(k, fillHex)
  const outlineRgb = blinking ? k.rgb(255, 255, 255) : DECOR_OUTLINE_RGB
  const w = spikes.x2 - spikes.x1
  const step = w / RIGHT_SPIKE_COUNT
  const pad = 2
  for (let i = 0; i < RIGHT_SPIKE_COUNT; i++) {
    const baseX = spikes.x1 + step * (i + 0.5)
    const halfW = step * 0.42
    //
    // Base corners sit flush with spikes.y (matching the fill triangle's own
    // base below) instead of pad px lower — that extra dip below the
    // platform surface used to poke a thin gray line through the gaps
    // between grass tufts along the whole spike zone width.
    //
    k.drawPolygon({
      pts: [
        k.vec2(baseX - halfW - pad, spikes.y),
        k.vec2(baseX, spikes.y - RIGHT_SPIKE_H - pad),
        k.vec2(baseX + halfW + pad, spikes.y)
      ],
      color: outlineRgb
    })
    k.drawPolygon({
      pts: [
        k.vec2(baseX - halfW, spikes.y),
        k.vec2(baseX, spikes.y - RIGHT_SPIKE_H),
        k.vec2(baseX + halfW, spikes.y)
      ],
      color: fillRgb
    })
  }
}
//
// Grass tint for the mud band only — visible after G until the post-L countdown opens the rest.
//
function glowGrassColourTarget(zones) {
  if (zones.colorWorld) return GRASS_GREEN
  return zones.lCollected || zones.oCollected ? GRASS_WARM : GRASS_GREEN
}
//
// Grass hue variation is baked into the layer inst at create() — refresh it
// when L opens the warm straw field mid-session (reload already had it).
//
function syncGlowGrassHueVariation(inst) {
  const max = inst.zones.lCollected || inst.zones.oCollected || inst.zones.colorWorld
    ? GLOW_GRASS_HUE_VARY_MAX
    : 0
  const layers = [inst.grassLayer, inst.mudExtraGrass, inst.spikeGrass]
  for (const layer of layers) {
    layer && (layer.hueVaryMax = max)
  }
}
//
// Post-L straw field — gold tips, ochre mid, brown shadow blades (no gray wash).
//
function glowGrassWarmStrawActive(zones, sc) {
  return Boolean(
    (zones.lCollected || zones.oCollected) && !zones.colorWorld && sc && !isGlowFlatSingleDecorColor(sc)
  )
}
//
// Post-L straw colours match a fresh reload (full warm field, no gray wash).
//
function glowGrassPostLStrawFieldReady(zones, sc) {
  if (!zones?.lCollected || zones.colorWorld || zones.oCollected) return false
  if (!sc) return false
  const fade = sc.colorFade ?? 0
  const target = sc.colorFadeTarget ?? 0
  return fade >= 1 - COLOR_CROSSFADE_EPS || target >= 1 - COLOR_CROSSFADE_EPS
}
function glowGrassWarmColourFade(sc, zones) {
  if (!glowGrassWarmStrawActive(zones, sc)) return glowGrassGreenFade(sc, zones)
  if (glowGrassPostLStrawFieldReady(zones, sc)) return 1
  if ((sc.colorFade ?? 0) >= 1 - COLOR_CROSSFADE_EPS) return 1
  return Math.max(glowGrassGreenFade(sc, zones), sc.colorFade ?? 0)
}
function glowGrassBladeWarmTint(blade) {
  const t = Math.pow(blade.colorSeed ?? 0, GRASS_WARM_BLADE_SKEW)
  if (t < 0.34) return GRASS_STRAW_MID
  if (t < 0.67) return lerpRgb(GRASS_STRAW_MID, GRASS_STRAW_LIGHT, (t - 0.34) / 0.33)
  return lerpRgb(GRASS_STRAW_MID, GRASS_STRAW_DARK, (t - 0.67) / 0.33)
}
function glowGrassWarmTintFromGray(sc, zones, blade, fade) {
  const warm = glowGrassBladeWarmTint(blade)
  if (glowGrassPostLStrawFieldReady(zones, sc)) return warm
  const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
  return fade >= 1 - COLOR_CROSSFADE_EPS ? warm : lerpRgb(gray, warm, fade)
}
function glowMudZoneGrassTint(sc, zones, blade) {
  if (!sc?.zones.gCollected || !isGlowDecorWorldXInMudZone(sc, blade.x)) return null
  if (isGlowFlatSingleDecorColor(sc)) return DECOR_GRAY
  const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
  const fade = glowGrassWarmColourFade(sc, zones)
  if (glowGrassWarmStrawActive(zones, sc)) {
    const mudWarm = lerpRgb(
      glowGrassBladeWarmTint(blade),
      GRASS_STRAW_DARK,
      MUD_ZONE_GRASS_GREEN_VOID_LERP
    )
    if (glowGrassPostLStrawFieldReady(zones, sc)) return mudWarm
    return fade >= 1 - COLOR_CROSSFADE_EPS ? mudWarm : lerpRgb(gray, mudWarm, fade)
  }
  const grassTarget = glowGrassColourTarget(zones)
  const mudGreen = lerpRgb(grassTarget, GLOW_SHADOW, MUD_ZONE_GRASS_GREEN_VOID_LERP)
  if (fade >= 1) {
    sc._grassMudColorSettled ??= lerpRgb(gray, mudGreen, 1)
    return sc._grassMudColorSettled
  }
  return lerpRgb(gray, mudGreen, fade)
}
//
// Grass tint for the wider early ground-peek band (mud zone through the cave
// mouth) — same gray/green crossfade as the mud band itself, just without
// the taller mud-specific blade scale (see glowMudZoneGrassTint).
//
function glowPeekStrawGrassTint(sc, zones, blade) {
  if (isGlowFlatSingleDecorColor(sc)) return DECOR_GRAY
  const fade = glowGrassWarmColourFade(sc, zones)
  const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
  if (glowGrassWarmStrawActive(zones, sc)) {
    return blade
      ? glowGrassWarmTintFromGray(sc, zones, blade, fade)
      : (fade >= 1 - COLOR_CROSSFADE_EPS ? GRASS_STRAW_MID : lerpRgb(gray, GRASS_STRAW_MID, fade))
  }
  const straw = glowRgb(GLOW_GOLD_HEX)
  if (fade >= 1) return straw
  return lerpRgb(gray, straw, fade)
}
function glowGroundPeekGrassTint(sc, zones, blade) {
  if (!isGlowWorldXInGroundPeekZone(sc, blade.x)) return null
  return glowPeekStrawGrassTint(sc, zones, blade)
}
//
// Resolves the tint of one grass blade for the current frame: null while the
// blade's ground side is unexplored; otherwise the shared decor tone — plain
// decor gray before L, darkened toward void after L, cross-fading to green
// in the colour world.
//
//
// Short static root ticks under ground grass tufts — same gray/big-tree-root
// color switch as the ear-tree and chain-buoy roots.
//
function glowGrassRootColor(zones) {
  if (!zones.lCollected) return DECOR_GRAY
  const sc = zones._sceneRef
  if (sc && isGlowFlatSingleDecorColor(sc)) return DECOR_GRAY
  const c = glowRgb('mudGround')
  return { r: c.r, g: c.g, b: c.b }
}
//
// Grass roots stay visible for every explored ground strip — unlike blades,
// they must not fade with glowRightWorldOpacity while the hero walks in.
//
function glowGrassRootVisible(zones, worldX) {
  const sc = zones._sceneRef
  if (!sc || !isGlowWorldSurfaceDecorUnlocked(sc)) return false
  const lakeX1 = zones._lakeX1
  const lakeX2 = zones._lakeX2
  if (lakeX1 != null && lakeX2 != null && worldX >= lakeX1 && worldX <= lakeX2) return false
  if (isGlowOpenPitMouthWorldX(sc.pit, worldX)) return false
  if (isGlowDecorWorldXInMudZone(sc, worldX)) return zones.gCollected
  if (isGlowWorldXInGroundPeekZone(sc, worldX)) return true
  const side = worldX >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
  if (side === 'left') return zones.groundDecorLeft
  return (zones.groundRightStripMax ?? -1) >= 0
}
function glowGrassTint(zones, blade) {
  const sc = zones._sceneRef
  const lakeX1 = zones._lakeX1
  const lakeX2 = zones._lakeX2
  if (lakeX1 != null && lakeX2 != null && blade.x >= lakeX1 && blade.x <= lakeX2) {
    return null
  }
  if (sc && isGlowOpenPitMouthWorldX(sc.pit, blade.x)) return null
  if (sc && isGlowFlatSingleDecorColor(sc)) {
    const mudTint = glowMudZoneGrassTint(sc, zones, blade)
    if (mudTint) return mudTint
    const peekTint = glowGroundPeekGrassTint(sc, zones, blade)
    if (peekTint) return peekTint
    if (!isGlowWorldSurfaceDecorUnlocked(sc)) {
      if (!isGlowWorldXInGroundPeekZone(sc, blade.x)) return null
      return DECOR_GRAY
    }
    const side = blade.x >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
    if (side === 'left' && !zones.groundDecorLeft) return null
    if (side === 'right' && (zones.groundRightStripMax ?? -1) < 0) return null
    return DECOR_GRAY
  }
  const mudTint = sc && glowMudZoneGrassTint(sc, zones, blade)
  if (mudTint) return mudTint
  const peekTint = sc && glowGroundPeekGrassTint(sc, zones, blade)
  if (peekTint) return peekTint
  if (sc && !isGlowWorldSurfaceDecorUnlocked(sc)) {
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
    sc._grassColorSettled ??= lerpRgb(lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc)), glowGrassColourTarget(zones), 1)
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
    if (glowGrassWarmStrawActive(zones, sc)) return glowGrassBladeWarmTint(blade)
    sc._grassColorSettled ??= lerpRgb(lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc)), glowGrassColourTarget(zones), 1)
    return sc._grassColorSettled
  }
  const side = blade.x >= TREE_X + TRUNK_EXCLUDE_HALF ? 'right' : 'left'
  if (side === 'left') {
    if (!zones.groundDecorLeft) return null
    const leftFade = sc?.leftDecorFade ?? 1
    if (leftFade < 0.04) return null
    if (sc && isGlowFlatSingleDecorColor(sc)) return leftFade >= 1 ? DECOR_GRAY : { ...DECOR_GRAY, opacity: leftFade }
    if (glowGrassWarmStrawActive(zones, sc)) {
      const fade = glowGrassWarmColourFade(sc, zones)
      const rgb = glowGrassWarmTintFromGray(sc, zones, blade, fade)
      return leftFade >= 1 ? rgb : { ...rgb, opacity: leftFade }
    }
    const fade = glowGrassGreenFade(sc, zones)
    const grassTarget = glowGrassColourTarget(zones)
    if (fade >= 1 && leftFade >= 1) {
      sc._grassColorSettled ??= lerpRgb(lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc)), grassTarget, 1)
      return sc._grassColorSettled
    }
    const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
    const rgb = fade >= 1
      ? (sc._grassColorSettled ??= lerpRgb(gray, grassTarget, 1))
      : lerpRgb(gray, grassTarget, fade)
    return { ...rgb, opacity: leftFade }
  }
  const strip = groundRightStripIndexForX(blade.x, GROUND_REVEAL_TREE_PAST_X, zones._groundStripEndX ?? WORLD_W)
  const op = glowRightWorldOpacity(sc, blade.x, strip >= 3 ? 'small' : 'large')
  if (op < 0.04) return null
  if (sc && isGlowFlatSingleDecorColor(sc)) return op >= 1 ? DECOR_GRAY : { ...DECOR_GRAY, opacity: op }
  if (glowGrassWarmStrawActive(zones, sc)) {
    const fade = glowGrassWarmColourFade(sc, zones)
    const rgb = glowGrassWarmTintFromGray(sc, zones, blade, fade)
    return op >= 1 ? rgb : { ...rgb, opacity: op }
  }
  const fade = glowGrassGreenFade(sc, zones)
  const grassTarget = glowGrassColourTarget(zones)
  if (fade >= 1) {
    sc._grassColorSettled ??= lerpRgb(
      lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc)),
      grassTarget,
      1
    )
    if (op >= 1) return sc._grassColorSettled
    const settled = sc._grassColorSettled
    return { r: settled.r, g: settled.g, b: settled.b, opacity: op }
  }
  const gray = lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
  const rgb = lerpRgb(gray, grassTarget, fade)
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
  if (isGlowEyeIntroPending(z)) return 1
  if (z.oZone || z.oCollected) return 1
  if (z.lCollected && (inst.colorFade ?? 0) >= 1 - COLOR_CROSSFADE_EPS) return 1
  if (inst.meditation?.countdown != null) return inst.meditationWorldLife ?? 0
  return 0
}
//
// birds.mp3 swells with the post-L stillness countdown, stays on through the
// O platform, and keeps playing in the permanent colour world.
//
function glowBirdsMusicLife(inst) {
  const z = inst.zones
  if (z.colorWorld || z.oZone || z.oCollected) return 1
  if (z.lCollected && inst.meditation?.countdown != null) {
    //
    // Stepped swell only — linear countdown was louder earlier than the O HUD
    // and colour beats, which read as birds "speeding up" before Observe.
    //
    return inst.meditationWorldLife ?? 0
  }
  return 0
}
//
// Rocks — flat value 5 silhouettes.
//
function createGlowRocks(k, treeBaseLeftX, waterRightX, rightPlatX, trampX, branchTrampX, zones, decorAtlas, mudZoneX2) {
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
  // Extra scatter east of the mud band — visible once G opens the mud peek,
  // not gated behind the right-ground discovery strips.
  //
  if (mudZoneX2 != null) {
    const eastLeft = mudZoneX2 + MUD_EAST_ROCK_INSET
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
  // Flat mid stone before L; shaded glowRock tones after rebakeGlowRockSpritesShaded.
  //
  const decorFlat = glowRgb(GLOW_PAL.decorGray)
  const flatPalette = {
    fillR: decorFlat.r, fillG: decorFlat.g, fillB: decorFlat.b,
    lightR: decorFlat.r, lightG: decorFlat.g, lightB: decorFlat.b,
    darkR: decorFlat.r, darkG: decorFlat.g, darkB: decorFlat.b
  }
  const bakeRock = (seedOffset) => {
    const canvas = toCanvas({ width: totalW, height: croppedH, pixelRatio: 1 }, (ctx) => {
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
    return canvas
  }
  const bakedGray = decorAtlas.register(bakeRock(worldX * 3 | 0))
  const bakedOutline = decorAtlas.register(bakeRock(worldX * 3 + 1 | 0))
  const obj = k.add([
    k.pos(worldX - totalW / 2, posY),
    k.z(z),
    {
      opacity: 1,
      color: k.rgb(255, 255, 255),
      _bakedFlat: bakedGray,
      _bakedGray: bakedGray,
      _bakedOutline: bakedOutline,
      _outlined: false,
      draw() {
        if (this.hidden) return
        const sc = zones._sceneRef
        const fade = glowDecorFade(sc)
        const white = k.rgb(255, 255, 255)
        if (sc && isGlowColorTransitionActive(sc) && this._bakedOutline) {
          drawDecorAtlasCrossfade(k, this._bakedGray, this._bakedOutline, k.vec2(0, 0), 'topleft', 0, fade, this.color, white)
          return
        }
        if (sc && isGlowFlatSingleDecorColor(sc)) {
          drawDecorAtlasSprite(k, this._bakedFlat, k.vec2(0, 0), 'topleft', 0, this.opacity, this.color)
          return
        }
        if (sc?.zones?.lCollected && this._bakedFlat) {
          drawPostLGrayDecorBaked(k, sc, this._bakedFlat, this._bakedGray, k.vec2(0, 0), 'topleft', 0, this.opacity, this.color)
          return
        }
        drawDecorAtlasSprite(k, this._outlined ? this._bakedOutline : this._bakedGray, k.vec2(0, 0), 'topleft', 0, this.opacity, this.color)
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
// Plants a mud rock so its bottom sits in the crest, not above it.
//
function seatMudWalkRock(rock, mudX1, mudX2) {
  const croppedH = rock._rockBake?.croppedH || 16
  const mudY = glowMudCrestY(rock._decorWorldX, mudX1, mudX2)
  rock._homeY = mudY - croppedH + MUD_ROCK_SINK
  rock._surfaceTop = rock._homeY + 1
}
//
// Rocks, a half-buried log and two twigs. Bottoms meet the mud crest.
//
function createGlowMudZoneWalkClutter(k, mudX1, mudX2, zones, decorAtlas) {
  const rocks = []
  const surfaces = []
  const branches = []
  const span = Math.max(40, mudX2 - mudX1)
  const logW = MUD_WALK_LOG_MIN_W + Math.random() * (MUD_WALK_LOG_MAX_W - MUD_WALK_LOG_MIN_W)
  const logH = 12 + Math.random() * 4
  const logCenterX = mudX1 + span * 0.56
  const logMud = glowMudCrestY(logCenterX, mudX1, mudX2)
  const logTop = logMud - logH * 0.62
  surfaces.push({ x1: logCenterX - logW * 0.46, x2: logCenterX + logW * 0.46, topY: logTop })
  const log = {
    cx: logCenterX,
    cy: logTop + logH * 0.5,
    w: logW,
    h: logH,
    detail: generateLogDetail(logW, logH, false)
  }
  const logX1 = logCenterX - logW * 0.55
  const logX2 = logCenterX + logW * 0.55
  const slots = [0.1, 0.24, 0.78, 0.9, 0.16, 0.86]
  const counts = MUD_WALK_BIG_ROCK_COUNT + MUD_WALK_SMALL_ROCK_COUNT
  for (let i = 0; i < counts; i++) {
    const big = i < MUD_WALK_BIG_ROCK_COUNT
    let cx = mudX1 + span * slots[i]
    if (cx > logX1 - 8 && cx < logX2 + 8) cx = i % 2 === 0 ? logX1 - 28 : logX2 + 28
    const radius = big ? 16 + Math.random() * 8 : 7 + Math.random() * 5
    const behind = i % 2 === 0
    const rock = placeRock(
      k, cx, radius, 'right', false,
      behind ? MUD_BEHIND_ROCK_Z : MUD_FRONT_ROCK_Z,
      big ? 1.05 : 0.82, decorAtlas, zones
    )
    rock._mudZoneWalk = true
    seatMudWalkRock(rock, mudX1, mudX2)
    rocks.push(rock)
  }
  const branchSlots = [0.34, 0.72]
  for (let b = 0; b < MUD_WALK_BRANCH_COUNT; b++) {
    const bx = mudX1 + span * branchSlots[b]
    const by = glowMudCrestY(bx, mudX1, mudX2) + 1
    const len = 18 + Math.random() * 10
    const tilt = b === 0 ? -0.35 : 0.42
    const x2 = bx + Math.cos(tilt) * len
    const y2 = by - Math.sin(Math.abs(tilt)) * len * 0.45
    branches.push({ x1: bx, y1: by, x2, y2 })
    const top = Math.min(by, y2) - 3
    surfaces.push({
      x1: Math.min(bx, x2),
      x2: Math.max(bx, x2),
      topY: top
    })
  }
  k.add([
    k.z(MUD_DRAW_Z),
    {
      draw() {
        drawGlowMudLayer(zones._sceneRef)
      }
    }
  ])
  return { rocks, surfaces, log, branches }
}
//
// Mud puddle and the log/twigs on it, one layer between the two rock groups.
//
function drawGlowMudLayer(inst) {
  if (!inst?.mudZoneX1) return
  drawGlowViscousMud(inst)
  drawGlowMudWalkClutter(inst)
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
  if (x1 == null || x2 == null || !inst.zones.gCollected) return
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
  const flat = isGlowFlatSingleDecorColor(inst)
  const fade = inst.colorFade ?? 0
  const lower = glowLowerSoilRgb()
  const fillRgb = flat ? DECOR_GRAY : lerpRgb(DECOR_GRAY, lower, Math.max(fade, inst.zones.colorWorld ? 1 : fade))
  const seamRgb = flat ? DECOR_GRAY : lerpRgb(lower, glowRgb('groundChernozem'), 0.35)
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
  if (!inst.zones.gCollected || !clutter) return
  const k = inst.k
  const fade = glowDecorFade(inst)
  const flat = isGlowFlatSingleDecorColor(inst)
  const logTone = glowLogColors(inst.zones)
  const branchRgb = flat ? DECOR_GRAY : glowRgb(logTone.barkDark)
  const branchColor = k.rgb(branchRgb.r, branchRgb.g, branchRgb.b)
  const logColors = glowLogColors(inst.zones)
  if (clutter.log) {
    const { log } = clutter
    drawLogPlatform(k, log.w, log.h, log.cx, log.cy, fade, log.detail, logColors)
  }
  clutter.branches?.forEach(branch => {
    k.drawLine({
      p1: k.vec2(branch.x1, branch.y1),
      p2: k.vec2(branch.x2, branch.y2),
      width: 2.2,
      color: branchColor,
      opacity: fade
    })
  })
}
//
// Top of the drawn ground lip at x — the same edge the floor silhouette uses.
//
function glowGroundSurfaceY(x) {
  const lip = (Math.sin(x * GROUND_LIP_FREQ_A) + Math.sin(x * GROUND_LIP_FREQ_B) * 0.5) * GROUND_LIP_AMP
  const h = Math.max(2, 4 + lip)
  return FLOOR_Y - h + 2
}
//
// Walk surface: mud crest, then the top of a log, twig or rock under x.
// Up is a smaller Y. Rock tops blend in so the body climbs instead of stepping a wall.
//
function glowPredatorSurfaceY(rocks, walkSurfaces, mudX1, mudX2, x) {
  const inMud = mudX1 != null && mudX2 != null && x >= mudX1 && x <= mudX2
  let y
  if (inMud) {
    y = glowMudCrestY(x, mudX1, mudX2)
  } else {
    const lip = (Math.sin(x * GROUND_LIP_FREQ_A) + Math.sin(x * GROUND_LIP_FREQ_B) * 0.5) * GROUND_LIP_AMP
    y = FLOOR_Y - Math.max(0, lip)
  }
  if (walkSurfaces) {
    for (let i = 0; i < walkSurfaces.length; i++) {
      y = raiseTowardBand(y, x, walkSurfaces[i].x1, walkSurfaces[i].x2, (walkSurfaces[i].x1 + walkSurfaces[i].x2) * 0.5, walkSurfaces[i].topY)
    }
  }
  if (!rocks) return y
  for (let i = 0; i < rocks.length; i++) {
    const rock = rocks[i]
    if (!rock?._mudZoneWalk || rock._surfaceTop == null || rock._decorWorldX == null) continue
    const half = rock._surfaceHalfW || 12
    y = raiseTowardBand(y, x, rock._decorWorldX - half, rock._decorWorldX + half, rock._decorWorldX, rock._surfaceTop)
  }
  return y
}
//
// Smooths a step onto a rock or log: full height at the middle, crest at the edges.
//
function raiseTowardBand(y, x, x1, x2, mid, topY) {
  if (x < x1 || x > x2 || topY >= y) return y
  const half = Math.max(1, (x2 - x1) * 0.5)
  const edge = Math.abs(x - mid) / half
  const blend = 1 - edge * edge
  return y + (topY - y) * Math.max(0, blend)
}
//
// Mushrooms — value 5, excluded from water zone.
//
function createGlowMushrooms(k, waterX1, waterX2, trampX, branchTrampX, zones, decorAtlas) {
  const objs = []
  const left = LEFT_MARGIN + 60
  const decorGrayRgb = (() => {
    const c = glowRgb(GLOW_PAL.decorGray)
    return [c.r, c.g, c.b]
  })()
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
    // Gray-phase variant — same draw-mushroom primitive as touch lesson 0,
    // single-tone flat silhouette.
    //
    const mushCanvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawMushroomToCanvas(ctx, { ...mushDrawOpts, capColor: decorGrayRgb, flat: true })
    })
    applyGlowGameplaySharpBake(mushCanvas, posX * 2 | 0)
    const bakedGray = decorAtlas.register(mushCanvas)
    const mushFlatCanvas = toCanvas({ width: totalW, height: totalH, pixelRatio: 1 }, (ctx) => {
      drawMushroomToCanvas(ctx, { ...mushDrawOpts, capColor: decorGrayRgb, flat: true })
    })
    applyGlowGameplaySharpBake(mushFlatCanvas, posX * 2 + 1 | 0)
    const bakedFlat = decorAtlas.register(mushFlatCanvas)
    //
    // Colour-world variant — cap tones from this mushroom's palette family.
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
          const white = k.rgb(255, 255, 255)
          if (sc && isGlowColorTransitionActive(sc) && this._bakedOutline) {
            drawDecorAtlasCrossfade(k, this._bakedGray, this._bakedOutline, k.vec2(0, 0), 'bot', this.angle, fade, this.color, white)
            return
          }
          if (sc?.zones?.lCollected && this._bakedOutline) {
            drawDecorAtlasSprite(k, this._bakedOutline, k.vec2(0, 0), 'bot', this.angle, this.opacity, this.color)
            return
          }
          if (sc?.zones?.lCollected) {
            drawPostLGrayDecorBaked(k, sc, this._bakedFlat, this._bakedGray, k.vec2(0, 0), 'bot', this.angle, this.opacity, this.color)
            return
          }
          const baked = this._outlined ? this._bakedOutline : this._bakedFlat
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
  //
  // Each trampoline mushroom gets its own cap-colour family (opts.colors,
  // opts.spriteKey) so the branch/right/pit characters read as distinct
  // little guys instead of three identical orange caps — the gray phase
  // stays shared since it's the same neutral tone for every decor object.
  //
  const colorColors = opts.colors ?? CUTE_MUSH_COLORS
  const colorSpriteBase = TRAMP_OUTLINE_SPRITE + (opts.spriteKey ? `-${opts.spriteKey}` : '')
  bakeTrampolineVariant(k, TRAMP_SPRITE, trampGrayColors, true)
  bakeTrampolineVariant(k, TRAMP_SPRITE + TRAMP_BLINK_SPRITE_SUFFIX, trampGrayColors, false)
  bakeTrampolineVariant(k, colorSpriteBase, colorColors, true)
  bakeTrampolineVariant(k, colorSpriteBase + TRAMP_BLINK_SPRITE_SUFFIX, colorColors, false)
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
        const previewFade = zones.colorWorld ? 1 : glowLZoneDecorFade(zones._sceneRef)
        const graySprite = TRAMP_SPRITE
        const colorSprite = colorSpriteBase
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
        if (!zones.colorWorld && isGlowColorTransitionActive(sc)) {
          const grayOp = 1 - previewFade
          grayOp > COLOR_CROSSFADE_EPS && drawTrampSprite(grayEyes, grayOp, grayColor)
          previewFade > COLOR_CROSSFADE_EPS && drawTrampSprite(colorEyes, previewFade, colorColor)
          drawTrampPupils()
          return
        }
        const sprite = (zones.colorWorld || previewFade >= 1 - COLOR_CROSSFADE_EPS) ? colorEyes : grayEyes
        const color = (zones.colorWorld || previewFade >= 1 - COLOR_CROSSFADE_EPS) ? colorColor : grayColor
        drawTrampSprite(sprite, 1, color)
        drawTrampPupils()
      }
    }
  ])
  drawLayer.onUpdate(() => {
    zones._sceneRef?.dialogOpen || onUpdateTrampolineBlink(k, state)
  })
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
  const twoTone = sc && isGlowFlatSingleDecorColor(sc)
  const fade = glowLZoneDecorFade(sc)
  let c
  if (fade >= 1 && sc?._lakeColorSettled) {
    c = sc._lakeColorSettled
  } else {
    const gray = twoTone ? DECOR_GRAY : lerpRgb(DECOR_GRAY, VOID, grayDecorDarken(sc))
    const tint = { r: WATER_COLOR.r, g: WATER_COLOR.g, b: WATER_COLOR.b }
    c = twoTone ? DECOR_GRAY : lerpRgb(gray, tint, fade)
    fade >= 1 && sc && (sc._lakeColorSettled = c)
  }
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
  const fillFade = glowHeroFillFade(inst)
  const layers = []
  if (inst.heroBodyFillApplied || !hero.outlineOnly) {
    k.getSprite(outlineClosed) && layers.push({ sprite: outlineClosed, opacity: 1 })
  } else if (fillFade > 0.001) {
    const filledClosed = resolveGlowHeroFilledSpriteKey(
      inst, GLOW_LEVEL_FILL_CFG, outlineClosed
    )
    filledClosed && k.getSprite(filledClosed) &&
      layers.push({ sprite: filledClosed, opacity: fillFade })
  } else {
    k.getSprite(outlineClosed) && layers.push({ sprite: outlineClosed, opacity: 1 })
  }
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
  if (footY >= FLOOR_Y - 30 && isHeroInMudZone(inst, x)) return 'mud'
  if (footY >= FLOOR_Y - 30) return 'ground'
  return 'air'
}
//
// True when the hero's feet sit on the soft muddy band in the mud band.
//
function isHeroInMudZone(inst, footX) {
  if (!inst.zones.gCollected) return false
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
  CanvasBackdrop.applyCanvasBackdrop(
    k,
    isOuterFrameVisible(zones) ? OUTER_BG_HEX : GLOW_PAL.glowPreludeBackdrop
  )
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
// True after L until the full parallax stack is fading in (stillness countdown
// or colour world) — the nearest tree+bush row stays visible in gray.
//
function shouldDrawGlowPostLNearParallaxGray(inst) {
  const z = inst?.zones
  if (!z?.lCollected || z.oZone || z.oCollected || z.colorWorld) return false
  const pf = inst.parallaxFade ?? 0
  if (!z.lZoneParallax) return true
  return pf <= COLOR_CROSSFADE_EPS
}
//
// Nearest parallax row only (trees + first bush strip), gray bake — matches
// the post-L sand/gray decor policy before the stillness countdown.
//
function drawGlowPostLNearParallaxGray(inst) {
  const layer = PAR_LAYER_NEAR
  drawParallaxLayerSlice(inst, layer, layer.gray, 1, glowPostLNearParallaxGrayTint(inst))
}
//
// Matches the post-L inner ground band (INNER_GRAY → void) on the nearest
// parallax bake so bushes and trunks sit in the same muted sand/gray world.
//
function glowPostLNearParallaxGrayTint(inst) {
  const z = inst?.zones
  if (!z?.lCollected || z.oZone || z.oCollected || z.colorWorld) return null
  const fade = inst.colorFade ?? 0
  let t = GROUND_L_DARKEN * (1 - fade)
  const reveal = glowPostLRevealFade(inst)
  reveal > 0 && (t = Math.max(t, L_DECOR_DARKEN * (1 - fade) * reveal))
  if (t <= COLOR_CROSSFADE_EPS) return null
  const target = lerpRgb(INNER_GRAY, VOID, t)
  return {
    r: Math.round(255 * target.r / INNER_GRAY.r),
    g: Math.round(255 * target.g / INNER_GRAY.g),
    b: Math.round(255 * target.b / INNER_GRAY.b)
  }
}
//
// Keeps the near row at full gray strength while farther rows ramp with
// parallaxFade so collecting L does not flash away when the countdown starts.
//
function glowParallaxNearGrayOpacity(inst, layer, pf) {
  const z = inst?.zones
  if (layer !== PAR_LAYER_NEAR) return pf
  if (!z?.lCollected || z.oZone || z.oCollected || z.colorWorld) return pf
  return 1
}
//
// After L, only the nearest tree/bush row is visible until the O zone opens.
//
function shouldDrawGlowParallaxForestRow(inst, layer) {
  const z = inst?.zones
  if (!z?.lCollected || z.oZone || z.oCollected || z.colorWorld) return true
  return layer === PAR_LAYER_NEAR
}
//
// Draws one parallax layer for the current world mode: a single opaque slice
// in the settled colour world, or a gray↔colour crossfade while the world is
// still turning colourful (meditation preview or the post-O fade).
//
function drawParallaxLayer(inst, layer) {
  if (!shouldDrawGlowParallaxForestRow(inst, layer)) return
  const zones = inst.zones
  const fade = inst.colorFade
  const pf = inst.parallaxFade
  if (isGlowFullParallaxStable(inst)) {
    const occluderY = layer === PAR_LAYER_NEAR ? Infinity : inst._parOccluderY ?? Infinity
    drawParallaxLayerSlice(inst, layer, layer.color, 1, null, occluderY)
    return
  }
  const grayTint = layer === PAR_LAYER_NEAR ? glowPostLNearParallaxGrayTint(inst) : null
  if (isGlowFlatSingleDecorColor(inst)) {
    const grayOp = glowParallaxNearGrayOpacity(inst, layer, pf)
    grayOp > COLOR_CROSSFADE_EPS && drawParallaxLayerSlice(inst, layer, layer.gray, grayOp, grayTint)
    return
  }
  //
  // Permanent colour world: opaque viewport slices only.
  //
  if (zones.colorWorld) {
    const op = fade >= 1 && pf >= 1 ? 1 : fade * pf
    op > COLOR_CROSSFADE_EPS && drawParallaxLayerSlice(inst, layer, layer.color, op)
    return
  }
  //
  // Meditation preview: gray forest stays at its own strength underneath and
  // the colour forest fades in on top — a true lerp with no mid-fade dip
  // where the backdrop shows through both half-transparent copies. Once the
  // colour copy is opaque the gray pass is skipped entirely.
  //
  const colorForest = isGlowMeditationColorPreview(inst) || fade > COLOR_CROSSFADE_EPS
  if (colorForest) {
    const colorOp = fade * pf
    const grayOp = colorOp < 1 - COLOR_CROSSFADE_EPS ? glowParallaxNearGrayOpacity(inst, layer, pf) : 0
    grayOp > COLOR_CROSSFADE_EPS && drawParallaxLayerSlice(inst, layer, layer.gray, grayOp, grayTint)
    colorOp > COLOR_CROSSFADE_EPS && drawParallaxLayerSlice(inst, layer, layer.color, colorOp)
    return
  }
  const grayOp = glowParallaxNearGrayOpacity(inst, layer, pf)
  grayOp > COLOR_CROSSFADE_EPS && drawParallaxLayerSlice(inst, layer, layer.gray, grayOp, grayTint)
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
// True when the colour forest and parallax stack are fully opaque.
//
function isGlowFullParallaxStable(inst) {
  const z = inst.zones
  return Boolean(
    z.colorWorld &&
    z.lZoneParallax &&
    (inst.colorFade ?? 0) >= 1 &&
    (inst.parallaxFade ?? 0) >= 1
  )
}
//
// Pit mouth gap for onDraw earth/static layers (includes floor extended west).
//
function glowPitEarthBandCutoutForInst(inst) {
  const pit = inst.pit
  if (!pit?.zone) return null
  if (!pit.collapsed && !pit.cracksVisible) return null
  return getGlowPitEarthBandMouthCutoutForPit(pit)
}
//
// Full-width horizontal band with a cave-mouth gap once the pit is open.
//
function drawGlowHorizontalBand(k, inst, y, height, color, opacity = 1, cutCaveMouth = false) {
  const pitOpen = inst.pit && (inst.pit.collapsed || inst.pit.cracksVisible)
  const cutout = cutCaveMouth && pitOpen && inst.pit?.zone
    ? glowPitEarthBandCutoutForInst(inst)
    : null
  if (!cutout) {
    k.drawRect({
      pos: k.vec2(LEFT_MARGIN, y),
      width: GAME_W,
      height,
      color,
      opacity
    })
    return
  }
  const mouthL = cutout.leftX
  const rightX = cutout.rightX
  //
  // Collapsed pit: keep the full earth-band height open — the lower slice used
  // to peek light static ground through the cutout under the hero's feet.
  //
  if (inst.pit?.collapsed) {
    drawGlowHorizontalBandRow(k, LEFT_MARGIN, GAME_W, y, height, color, opacity, mouthL, rightX)
    return
  }
  const pitDepth = inst.pit?.zone?.depth ?? 0
  const caveVoidH = Math.min(height, Math.max(0, pitDepth))
  const earthBelowH = height - caveVoidH
  caveVoidH > 0 &&
    drawGlowHorizontalBandRow(k, LEFT_MARGIN, GAME_W, y, caveVoidH, color, opacity, mouthL, rightX)
  earthBelowH > 0 &&
    drawGlowHorizontalBandRow(
      k, LEFT_MARGIN, GAME_W, y + caveVoidH, earthBelowH, color, opacity, mouthL, rightX
    )
}
//
// One earth-band row with a pit mouth gap (void + floor west of the crack lip).
//
function drawGlowHorizontalBandRow(k, marginX, bandW, y, h, color, opacity, mouthL, rightX) {
  const leftW = Math.max(0, mouthL - marginX)
  leftW > 0 && k.drawRect({
    pos: k.vec2(marginX, y),
    width: leftW,
    height: h,
    color,
    opacity
  })
  const rightW = Math.max(0, marginX + bandW - rightX)
  rightW > 0 && k.drawRect({
    pos: k.vec2(rightX, y),
    width: rightW,
    height: h,
    color,
    opacity
  })
}
//
// Paints the earth band below FLOOR_Y, leaving a mouth hole while the pit is open.
//
function drawGlowEarthBand(k, inst, color, opacity = 1) {
  drawGlowHorizontalBand(k, inst, FLOOR_Y, CAVE_BAND_H, color, opacity, true)
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
  if (isGlowEyeIntroBareWorld(inst)) {
    drawGlowPitEyeIntroInterior(k, inst.pit, isGlowPitFlatDecorMode(inst))
    return
  }
  const fade = inst.colorFade ?? 0
  const zones = inst.zones
  const innerGray = isPlayfieldInnerGrayVisible(zones, fade)
  const flatExplore = isGlowFlatSingleDecorColor(inst)
  const groundC = flatExplore
    ? DECOR_GRAY
    : lerpRgb(glowGrayGroundRgb(inst, innerGray), GROUND_DARK, fade)
  drawGlowPitInteriorVoidBackdrop(inst, k)
  const flatDecor = isGlowPitFlatDecorMode(inst)
  drawGlowPit(k, inst.pit, groundC, flatDecor)
}
//
// Pickup eyes sit in the skull sockets — draw on the pit layer above the skeleton.
//
function drawGlowPitCaveLyingEyes(inst, k) {
  drawGlowCavePickupEyesOnPitLayer(inst, k)
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
  const voidRgb = isGlowPitFlatDecorMode(inst) ? PRELUDE_BACKDROP : glowCaveEarthDeepRgb()
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
  // Always prefer the same baked static-earth slice the strip left of the
  // cave uses (film grain included) — only the flat gray phase (before any
  // grain sprite exists yet) falls back to a flat void fill below.
  //
  const slice = isGlowFlatSingleDecorColor(inst)
    ? null
    : resolveGlowPitBelowFloorSprite(inst, k)
  if (slice?.sprite) {
    drawWorldSpriteBandSlice(k, leftX, rightX, bottomY, bandEndY, slice.sprite, slice.opacity)
    return
  }
  const rgb = glowPitBelowCaveEarthRgb(inst)
  k.drawRect({
    pos: k.vec2(leftX, bottomY),
    width: rightX - leftX,
    height: bandEndY - bottomY,
    color: k.rgb(rgb.r, rgb.g, rgb.b)
  })
}
//
// Earth-band fill under the cave floor — same baked static band as left of
// the crack (film grain included), not flat void fill.
//
function glowPitBelowCaveEarthRgb(inst) {
  if (inst.pit?.collapsed) {
    const fade = inst.colorFade ?? 0
    const z = inst.zones
    const innerGray = isPlayfieldInnerGrayVisible(z, fade)
    if (isGlowFlatSingleDecorColor(inst) && !innerGray) return PRELUDE_BACKDROP
    const colorBottom = glowGroundEarthBottomLayerRgb(false)
    const grayBottom = glowGroundEarthBottomLayerRgb(true)
    if (z.colorWorld || fade >= 1 - COLOR_CROSSFADE_EPS) return colorBottom
    return lerpRgb(grayBottom, colorBottom, fade)
  }
  if (inst._surfaceEarthRgb) return inst._surfaceEarthRgb
  const fade = inst.colorFade ?? 0
  const z = inst.zones
  const innerGray = isPlayfieldInnerGrayVisible(z, fade)
  const caveEarth = glowCaveEarthFloorRgb()
  if (isGlowFlatSingleDecorColor(inst) && !innerGray) return PRELUDE_BACKDROP
  if (z.colorWorld || z.oCollected || fade >= 1 - COLOR_CROSSFADE_EPS) return caveEarth
  return lerpRgb(glowGrayGroundRgb(inst, innerGray), caveEarth, fade)
}
//
// Picks the same static earth sprite slice the main playfield uses beside the pit.
//
function resolveGlowPitBelowFloorSprite(inst, k) {
  const fade = inst.colorFade ?? 0
  const zones = inst.zones
  const pf = inst.parallaxFade ?? 0
  if (!zones.lCollected && !zones.colorWorld && k.getSprite(BG_STATIC_GRAY)) {
    return { sprite: BG_STATIC_GRAY, opacity: 1 }
  }
  if (isGlowFullParallaxStable(inst) && k.getSprite(BG_STATIC_COLOR)) {
    return { sprite: BG_STATIC_COLOR, opacity: 1 }
  }
  if (zones.oCollected && k.getSprite(BG_STATIC_COLOR)) {
    return { sprite: BG_STATIC_COLOR, opacity: 1 }
  }
  const preview = isGlowMeditationColorPreview(inst) || isGlowColorTransitionActive(inst)
  if (zones.colorWorld || preview || fade > COLOR_CROSSFADE_EPS) {
    if (fade > COLOR_CROSSFADE_EPS && k.getSprite(BG_STATIC_COLOR)) {
      const op = fade * pf
      if (op > COLOR_CROSSFADE_EPS) return { sprite: BG_STATIC_COLOR, opacity: op }
    }
    const grayOp = (1 - fade) * pf
    if (grayOp > COLOR_CROSSFADE_EPS && k.getSprite(BG_STATIC_GRAY)) {
      return { sprite: BG_STATIC_GRAY, opacity: grayOp }
    }
  }
  if (pf > COLOR_CROSSFADE_EPS && k.getSprite(BG_STATIC_GRAY)) {
    return { sprite: BG_STATIC_GRAY, opacity: pf }
  }
  if (k.getSprite(BG_STATIC_GRAY)) {
    return { sprite: BG_STATIC_GRAY, opacity: 1 }
  }
  return null
}
//
// Horizontal slice of the baked underground band (wavy gray + grain).
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
// Crack-lid stomp shake — not while bouncing on or jumping over the mushrooms.
//
function shouldGlowCrackLandingCameraShake(inst) {
  const char = inst.heroInst?.character
  if (!char?.pos) return false
  const hero = inst.heroInst
  if (hero?.jumpPhase === 'jumping' || hero?.wasJumping) return false
  if (inst.trampBounceAir || inst.branchTrampBounceAir) return false
  if (isOnTrampolineCap(inst, char, inst.trampState)) return false
  if (isOnTrampolineCap(inst, char, inst.branchTrampState)) return false
  const heroX = char.pos.x
  if (isHeroNearTrampolineX(inst, heroX, inst.trampState)) return false
  if (isHeroNearTrampolineX(inst, heroX, inst.branchTrampState)) return false
  return true
}
//
// Cave rocks/pebbles/seams — last world pass so earth-band fills never clip them.
//
function drawGlowPitCaveRocksOverEarthBand(inst) {
  const pit = inst.pit
  if (!pit?.collapsed) return
  const k = inst.k
  if (isGlowEyeIntroBareWorld(inst)) return
  const flatDecor = isGlowPitFlatDecorMode(inst)
  drawGlowPitCaveForegroundDecor(k, pit, flatDecor)
  drawGlowPitCaveSeamCoverRocks(k, pit, isGlowPitFlatDecorMode(inst))
}
//
// Skeleton, mushroom and seam rocks — above earth/static, below the hero.
//
function drawGlowPitCaveForegroundPass(inst) {
  const pit = inst.pit
  if (!pit?.collapsed) return
  const k = inst.k
  if (isGlowEyeIntroBareWorld(inst)) {
    drawGlowPitCaveSkeletonScene(k, pit, true)
    drawGlowPitCaveLyingEyes(inst, k)
    return
  }
  const flatDecor = isGlowPitFlatDecorMode(inst)
  drawGlowPitCaveSkeletonScene(k, pit, flatDecor)
  drawGlowPitCaveMushroom(k, pit)
  drawGlowPitCaveLyingEyes(inst, k)
}
//
// Main draw — void until G opens the outer frame; inner gray after L/O.
//
function onDraw(inst) {
  onDrawWorld(inst)
  drawGlowPitCaveForegroundPass(inst)
  drawGlowPitCaveHeroForeground(inst)
  drawGlowPitCaveRocksOverEarthBand(inst)
}
//
// World-layer draw pass (everything that scrolls with the camera).
//
function onDrawWorld(inst) {
  const k = inst.k
  const fade = inst.colorFade
  const zones = inst.zones
  const parallaxStable = isGlowFullParallaxStable(inst)
  const outerFrame = isOuterFrameVisible(zones)
  const innerGray = isPlayfieldInnerGrayVisible(zones, fade)
  const flatExplore = isGlowFlatSingleDecorColor(inst)
  //
  // Read again just before the post-parallax ground repaint below — see that
  // call site for why the fill must be reapplied after the tree/bush layers.
  //
  let groundFillC = null
  //
  // Before the outer frame opens (pre-L), still paint a dark sky band so
  // parallax/tree gaps never flash the old green inner playfield through.
  //
  if (!outerFrame && flatExplore) {
    const backdrop = PRELUDE_BACKDROP
    k.drawRect({
      pos: k.vec2(LEFT_MARGIN, TOP_MARGIN),
      width: GAME_W,
      height: FLOOR_Y - TOP_MARGIN,
      color: k.rgb(backdrop.r, backdrop.g, backdrop.b)
    })
    groundFillC = backdrop
    inst._surfaceEarthRgb = backdrop
    drawGlowEarthBand(k, inst, k.rgb(backdrop.r, backdrop.g, backdrop.b), 1)
  }
  if (outerFrame) {
    let inner = innerGray ? INNER_GRAY : VOID
    if (flatExplore && !innerGray) {
      inner = PRELUDE_BACKDROP
    }
    //
    // Colour world splits the playfield at the ground line: warm haze between
    // the trunks above, dark forest earth below — both lerp up from the deep
    // green inner base as the colour fade progresses.
    //
    const grayGround = flatExplore && !innerGray
      ? PRELUDE_BACKDROP
      : glowGrayGroundRgb(inst, innerGray)
    const groundC = flatExplore && !innerGray ? PRELUDE_BACKDROP : lerpRgb(grayGround, GROUND_DARK, fade)
    groundFillC = groundC
    inst._surfaceEarthRgb = innerGray ? glowGrayGroundRgb(inst, true) : groundC
    //
    // Sky scrolls on its own parallax layer once the forest is revealed.
    // Crossfade the dark teal + dawn gradient out as parallaxFade rises.
    //
    const parallaxMix = zones.lZoneParallax ? (inst.parallaxFade ?? 0) : 0
    const fallbackOp = parallaxStable ? 0 : (zones.lZoneParallax ? Math.max(0, 1 - parallaxMix) : 1)
    if (fallbackOp > COLOR_CROSSFADE_EPS) {
      if (isGlowFlatSingleDecorColor(inst) || (!zones.colorWorld && fade <= COLOR_CROSSFADE_EPS)) {
        const backdrop = isGlowFlatSingleDecorColor(inst) ? PRELUDE_BACKDROP : glowRgb('void')
        k.drawRect({
          pos: k.vec2(LEFT_MARGIN, TOP_MARGIN),
          width: GAME_W,
          height: FLOOR_Y - TOP_MARGIN,
          color: k.rgb(backdrop.r, backdrop.g, backdrop.b),
          opacity: fallbackOp
        })
      } else if (flatExplore && !innerGray) {
        k.drawRect({
          pos: k.vec2(LEFT_MARGIN, TOP_MARGIN),
          width: GAME_W,
          height: FLOOR_Y - TOP_MARGIN,
          color: k.rgb(PRELUDE_BACKDROP.r, PRELUDE_BACKDROP.g, PRELUDE_BACKDROP.b),
          opacity: fallbackOp
        })
      } else {
        drawGlowPlayfieldSky(k, fallbackOp, fade)
      }
    }
    //
    // Once the parallax stack is active, its opaque static ground+underground
    // sprite (drawn below) fully repaints this exact band on top — this fill
    // would be immediately hidden and is a wasted full-width draw every frame.
    //
    fallbackOp > COLOR_CROSSFADE_EPS && drawGlowEarthBand(
      k, inst, k.rgb(inst._surfaceEarthRgb.r, inst._surfaceEarthRgb.g, inst._surfaceEarthRgb.b), fallbackOp
    )
  }
  if (inst.zones.lZoneParallax) {
    //
    // Back-to-front: sky+far bushes → mid/near forest (each row's bushes
    // are baked onto its trees, so one draw covers both), then static
    // ground. In the settled colour world everything behind the near row goes
    // through one half-resolution offscreen pass instead.
    //
    if (parallaxStable) {
      drawGlowParallaxBackdropOffscreen(inst)
    } else {
      const pf = inst.parallaxFade
      drawParallaxLayer(inst, PAR_LAYER_FAR)
      fade < 1 && drawAtmosphereHaze(inst, HAZE_FAR_OPACITY * pf)
      drawParallaxLayer(inst, PAR_LAYER_MID)
      fade < 1 && drawAtmosphereHaze(inst, HAZE_MID_OPACITY * pf)
    }
    drawParallaxLayer(inst, PAR_LAYER_NEAR)
    !parallaxStable && fade < 0.92 && drawAtmosphereMotes(inst)
  }
  shouldDrawGlowPostLNearParallaxGray(inst) &&
    (inst.parallaxFade ?? 0) <= COLOR_CROSSFADE_EPS &&
    drawGlowPostLNearParallaxGray(inst)
  //
  // Parallax tree sprites extend below the ground line. Cover that bleed
  // with the baked static earth+underground sprite (one draw) instead of a
  // fill rect plus a second underground sprite.
  //
  if (zones.lZoneParallax) {
    const pf = inst.parallaxFade ?? 0
    const groundFallbackOp = parallaxStable ? 0 : Math.max(0, 1 - pf)
    groundFallbackOp > COLOR_CROSSFADE_EPS && inst._surfaceEarthRgb && drawGlowEarthBand(
      k, inst, k.rgb(inst._surfaceEarthRgb.r, inst._surfaceEarthRgb.g, inst._surfaceEarthRgb.b), groundFallbackOp
    )
    const preview = isGlowMeditationColorPreview(inst) || isGlowColorTransitionActive(inst)
    if (isGlowFlatSingleDecorColor(inst) || (!zones.lCollected && !zones.colorWorld)) {
      !parallaxStable && drawWorldSpriteClipped(k, inst, BG_STATIC_GRAY, 1)
    } else if (parallaxStable) {
      drawWorldSpriteClipped(k, inst, BG_STATIC_COLOR, 1)
    } else if (zones.colorWorld || preview || fade > COLOR_CROSSFADE_EPS) {
      const grayOp = (1 - fade) * pf
      grayOp > COLOR_CROSSFADE_EPS && drawWorldSpriteClipped(k, inst, BG_STATIC_GRAY, grayOp)
      fade > COLOR_CROSSFADE_EPS && drawWorldSpriteClipped(k, inst, BG_STATIC_COLOR, fade * pf)
    } else {
      pf > COLOR_CROSSFADE_EPS && drawWorldSpriteClipped(k, inst, BG_STATIC_GRAY, pf)
    }
    maskGlowUndergroundDecorUntilReveal(inst, k, groundFillC)
  } else if (groundFillC) {
    const earthRgb = inst._surfaceEarthRgb || groundFillC
    drawGlowEarthBand(k, inst, k.rgb(earthRgb.r, earthRgb.g, earthRgb.b))
  }
  drawUndergroundLayer(inst)
  //
  // Cave mouth ground tint + surface decor (pit interior draws after parallax).
  //
  const groundC = flatExplore && !innerGray
    ? PRELUDE_BACKDROP
    : lerpRgb(glowGrayGroundRgb(inst, innerGray), GROUND_DARK, fade)
  maskGlowMonolithTreeRootsUntilReveal(inst, k, groundFillC || groundC)
  onDrawGlowEyeIntro(inst, k)
  !isGlowEyeIntroBareWorld(inst) && drawExploredGroundLip(inst)
  !isGlowEyeIntroBareWorld(inst) && drawMudGroundZone(inst)
  drawGlowPitMouthEarthGapFill(inst, k)
  inst.k && drawGlowPitCutoutBelowFloorFill(inst, k)
  //
  // Last in onDrawWorld — earth/static/parallax must not repaint over the pit;
  // pixel-snapped cave bake avoids a shimmering left wall while the hero jumps.
  //
  inst._glowPitDrawInOnDrawWorld && inst.pit && drawGlowPitPass(inst)
}
//
// Bottom corners — redrawn after world onDraw and from the ui+2500 fixed layer.
//
function drawPlayfieldBottomCornerOverlay(inst) {
  if (!isOuterFrameVisible(inst.zones)) return
  const k = inst.k
  const transitionOverlay = k._transitionOverlay
  if (transitionOverlay?.exists?.() && transitionOverlay.opacity > 0.02) return
  const { bottomY, leftX, rightX } = playfieldCornerPositions()
  drawPlayfieldCornerMask(k, leftX, bottomY, 270)
  drawPlayfieldCornerMask(k, rightX, bottomY, 180)
}
//
// Starts the normal pre-G exploration flow after the eyeless intro ends.
//
function maybeBootstrapGlowPostEyes(inst) {
  if (!inst.eyeIntro || inst.eyeIntro.bootstrapped) return
  if (inst.eyeIntro.phase !== 'complete') return
  inst.eyeIntro.bootstrapped = true
  inst.eyeIntro = null
  applyZoneVisibility(inst)
  syncGlowAtmosphereZones(inst)
  finishGlowIntro(inst)
}
//
// Ground-peek band on the soft-mud zone (flat gray explore, after G) — a
// live slice of the SAME underground sprite (buried rocks, roots, cracks)
// the full underground layer shows after water is discovered, clipped to
// just the mud zone as an early preview, plus a ground-line rim on top.
// Once the colour parallax is opaque, BG_STATIC_COLOR already contains
// that band, so the live sprite is skipped and only the rim remains.
//
function drawMudGroundZone(inst) {
  if (!inst.zones.gCollected) return
  //
  // Not just the narrow mud band itself — the whole ground strip from the
  // world's left edge (same LEFT_MARGIN..TREE_X span the full underground
  // layer normally only shows once water is discovered — see
  // drawUndergroundSpriteClipped, previewed early here instead), stopping
  // the same clear distance before the cave mouth as the decor mushrooms
  // mouth-shelf left edge — same right bound isGlowWorldXInGroundPeekZone
  // uses for the surface decor above this band, so nothing (line, texture,
  // rocks, grass) ever reads as reaching the cave.
  //
  const x1 = LEFT_MARGIN
  const x2 = getGlowCaveMouthFloorLeftX(getCrackZone(WORLD_W, FLOOR_Y))
  const k = inst.k
  if (isGlowFlatSingleDecorColor(inst) && !inst.zones.gUndergroundLive) {
    k.drawRect({
      pos: k.vec2(x1, FLOOR_Y),
      width: x2 - x1,
      height: CAVE_BAND_H,
      color: k.rgb(PRELUDE_BACKDROP.r, PRELUDE_BACKDROP.g, PRELUDE_BACKDROP.b)
    })
  } else if (!isGlowFullParallaxStable(inst)) {
    drawUndergroundSpriteBand(k, undergroundEarthDecorSprite(inst.zones), 1, x1, x2)
  }
  drawGlowMudZoneGroundLine(inst, x1, x2)
}
//
// Flat earth in the pit mouth cutout (earth band only) — matches the strip
// left of the cave; drawn in onDrawWorld before the pit void, not over the
// cave interior in onDraw.
//
function drawGlowPitMouthEarthGapFill(inst, k) {
  const z = inst.zones
  if (!z.gCollected || isGlowFlatSingleDecorColor(inst)) return
  const pit = inst.pit
  if (!pit?.collapsed || !pit.zone) return
  const { leftX, rightX } = getGlowPitEarthBandMouthCutoutForPit(pit)
  const w = rightX - leftX
  if (w <= 0) return
  const interiorH = Math.min(pit.zone.depth, CAVE_BAND_H)
  const belowH = CAVE_BAND_H - interiorH
  const voidRgb = glowCaveEarthDeepRgb()
  const bottomRgb = glowPitBelowCaveEarthRgb(inst)
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
// Same rim look as drawExploredGroundLip (mono-safe outline + lighter top
// strip), confined to the previewed left band.
//
function drawGlowMudZoneGroundLine(inst, x1, x2) {
  const k = inst.k
  const fade = inst.colorFade ?? 0
  const flatMono = isGlowFlatSingleDecorColor(inst)
  const bodyC = flatMono ? DECOR_GRAY : DECOR_OUTLINE_RGB
  const bodyColor = k.rgb(bodyC.r, bodyC.g, bodyC.b)
  const rimRgb = flatMono
    ? lerpRgb(DECOR_GRAY, LIGHT_GRAY, 0.35)
    : fade > COLOR_CROSSFADE_EPS
      ? lerpRgb(bodyC, glowGrassColourTarget(inst.zones), 0.82)
      : lerpRgb(bodyC, LIGHT_GRAY, 0.45)
  const rimColor = k.rgb(rimRgb.r, rimRgb.g, rimRgb.b)
  const mudX1 = inst.mudZoneX1
  const mudX2 = inst.mudZoneX2
  const step = (x2 - x1) / GROUND_LIP_STEPS
  if (step <= 0) return
  const view = glowCameraViewXRange(k, inst, GLOW_DECOR_CULL_MARGIN)
  for (let x = x1; x < x2; x += step) {
    if (view && (x + step < view.x1 || x > view.x2)) continue
    const inMud = mudX1 != null && mudX2 != null && x >= mudX1 && x <= mudX2
    if (inMud) continue
    const lip = (Math.sin(x * GROUND_LIP_FREQ_A) + Math.sin(x * GROUND_LIP_FREQ_B) * 0.5) * GROUND_LIP_AMP
    const h = Math.max(2, 4 + lip)
    k.drawRect({
      pos: k.vec2(x, FLOOR_Y - h + 2),
      width: step + 1,
      height: h,
      color: bodyColor,
      opacity: 0.48
    })
    k.drawRect({
      pos: k.vec2(x, FLOOR_Y - GROUND_TOP_RIM_H),
      width: step + 1,
      height: GROUND_TOP_RIM_H,
      color: rimColor,
      opacity: GROUND_TOP_RIM_OPACITY
    })
  }
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
// Tints border walls toward playfield gray as the ground zone opens.
//
function updatePlayfieldBorderColors(inst) {
  const fade = inst.colorFade
  if (!inst.wallObjs?.length) return
  const backdrop = glowPlayfieldBackdropRgb(inst)
  const dark = { r: backdrop.r, g: backdrop.g, b: backdrop.b }
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
  const singing = false
  const pulse = 0
  const side = 1
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
// Midge fill: near-black before colour; warm gold in the colour world.
//
function syncGlowMidgeDrawColor(inst) {
  if (!inst.midges) return
  if (isGlowFlatSingleDecorColor(inst)) {
    inst.midges.midgeRgb = DECOR_GRAY
    return
  }
  const colorFade = glowDecorFade(inst)
  if (inst.zones?.colorWorld || colorFade > 0.45) {
    inst.midges.midgeRgb = getGlowLightRgb('bright')
    return
  }
  inst.midges.midgeRgb = glowRgb('void')
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
  if (isGlowEyeIntroPending(inst.zones)) return false
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
  const heroFeet = char.pos.y + SURFACE_DETECT_Y
  const onCap = isHeroAtTrampolineCap(inst, heroX, heroFeet, state)
  if (!wantsTrampolineCapLaunch(inst, char, onCap, state)) return false
  if ((char.vel?.y ?? 0) < -40) return false
  const branchPad = state === inst.branchTrampState
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
  branchPad && (inst.branchTrampPitGuardTimer = BRANCH_TRAMP_PIT_GUARD_SEC)
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
function isHeroAtTrampolineCap(inst, heroX, footY, state) {
  if (!state) return false
  const capTopY = FLOOR_Y - TRAMP_TOTAL_H
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
// True when hero X is close enough that the trampoline pad should stay active
//
function isHeroNearTrampolineX(inst, heroX, state = inst.trampState) {
  if (!state) return false
  const branchPad = state === inst.branchTrampState
  const active = branchPad
    ? isBranchTrampolineColliderActive(inst.zones)
    : isRightTrampolineColliderActive(inst.zones)
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
  if (!colliderActive) {
    state._capPadLatch = 0
    inst[bounceAirKey] = false
    parkTrampolinePad(char, pad)
    return
  }
  const capTop = FLOOR_Y - TRAMP_TOTAL_H
  const velY = char?.vel?.y ?? 0
  const onCap = isOnTrampolineCap(inst, char, state)
  const heroFeet = char?.pos ? char.pos.y + SURFACE_DETECT_Y : 0
  const nearX = char?.pos ? Math.abs(char.pos.x - state.x) < TRAMP_NEAR_X : false
  const bounceAir = Boolean(inst[bounceAirKey])
  const grounded = typeof char?.isGrounded === 'function' && char.isGrounded()
  const inCapBand = heroFeet >= capTop - 14 && heroFeet <= capTop + TRAMP_PAD_FEET_BELOW
  const onMainFloorLane = isHeroFeetOnMainFloorLane(heroFeet)
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
  //
  // Any walk march: mushroom art moves alone — no invisible pad under the
  // hero or Kaplay carries him sideways with the cap.
  //
  const tw = inst.trampWalk
  const trampMarching = state === inst.trampState && tw?.walking
  if (trampMarching && onCap) {
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
  ensureGlowRightTrampHudProgress(inst)
  applyZoneVisibility(inst)
  //
  // Defer body fill until the hero actually lands (maybeApplyPendingHeroFillOnLand)
  // instead of a fixed timer — an immediate sprite/hitbox swap mid-air or
  // mid-crouch restarts the crouch→land loop right after the dialog Space
  // release.
  //
  inst.pendingHeroFillOnLand = true
  invalidateGlowPitCaveInteriorBake(inst.pit)
  ensureGlowBirdsBackgroundPlaying(inst)
}
//
// Fires once the hero is grounded after collecting O — fills the hero body,
// plays a confirming chime and shows an English hint. See startColorWorldFade.
//
function maybeApplyPendingHeroFillOnLand(inst, grounded, justLanded) {
  if (!inst.pendingHeroFillOnLand) return
  //
  // grounded alone, not justLanded — the O caption very often closes while
  // the hero is already standing still on the log (not mid-jump), so a
  // justLanded-only check could wait for the next unrelated jump before
  // firing, arriving long after and disconnected from the actual pickup.
  //
  if (!grounded) return
  inst.pendingHeroFillOnLand = false
  applyGlowHeroBodyFill(inst)
  const hero = inst.heroInst
  if (hero) {
    //
    // Sprite bake briefly ungrounds on wood — keep idle + Space gate so the
    // crouch→jump loop cannot restart after the sprite swap.
    //
    forceHeroIdleOnLog(inst)
    Hero.armJumpKeyReleaseGate(hero)
    hero.postLandAirLock = Math.max(hero.postLandAirLock || 0, 0.9)
    hero.canJump = false
    hero.wasJumping = false
    hero.jumpPhase = 'none'
    hero.jumpCeilingBonk = false
  }
  Sound.playLetterPickupSoft(inst.sound)
  HeroHint.show(inst.heroHint, GLOW_CONFIDENCE_HINT_O, HERO_CONFIDENT_HINT_DURATION, {
    followHero: true,
    anchorX: hero?.character?.pos?.x ?? 0,
    anchorY: hero?.character?.pos?.y ?? 0,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE
  })
}
//
// Arms a confidence hint (+ sparkle burst + chime) for the next time the
// hero is grounded — a letter taken mid-air shows nothing until he lands.
//
// Fills the hero body once the world gains full colour (after O).
// The hero stays whitish — never turns gold when the world colours.
//
function applyGlowHeroBodyFill(inst) {
  commitGlowHeroBodyFill(inst, GLOW_LEVEL_FILL_CFG)
  const hero = inst.heroInst
  if (!hero) return
  hero.canJump = true
  hero.jumpDisabled = false
}
//
// Zone flags for the shared letter-by-letter hero fill curve.
//
function glowHeroFillOpts(inst) {
  const z = inst.zones
  return {
    gCollected: z.gCollected,
    lCollected: z.lCollected,
    lZoneLit: z.lZoneLit,
    oCollected: z.oCollected,
    wCollected: z.wCollected,
    meditationCountdown: inst.meditation?.countdown
  }
}
const GLOW_LEVEL_FILL_CFG = {
  filledBodyColor: HERO_FILLED_BODY_COLOR,
  filledOutlineColor: HERO_FILLED_OUTLINE_COLOR,
  postBakeCanvas: applyGlowGameplaySharpBake,
  onFullFill: applyGlowHeroBodyFill
}
//
// 0→1 while letters unlock and the post-L stillness countdown whitens the hero.
//
function glowHeroFillFade(inst) {
  if (inst.heroBodyFillApplied) return 1
  if (inst.zones.colorWorld) return inst.colorFade ?? 0
  return getGlowHeroFillProgress(glowHeroFillOpts(inst))
}
//
// Crossfades the hollow hero into a white filled body while letters unlock.
//
function syncGlowHeroBodyFill(inst) {
  const fillOverride = effectiveGlowHeroFillAmount(inst)
  syncGlowHeroFillVisual(inst, GLOW_LEVEL_FILL_CFG, {
    ...glowHeroFillOpts(inst),
    fillOverride,
    holdAutoBurst: Boolean(inst.pendingHeroFillReveal)
  })
  updateGlowHeroFillBurst(inst, inst.k.dt())
  updateGlowHeroWitnessGlow(inst, inst.k.dt())
}
//
// Fill amount shown on the hero — held at the pre-pickup level until the
// delayed reveal fires.
//
function effectiveGlowHeroFillAmount(inst) {
  const pending = inst.pendingHeroFillReveal
  if (!pending) return glowHeroFillFade(inst)
  return pending.from
}
//
// After a letter is collected, wait before the white body preview steps up.
//
function queueGlowHeroFillReveal(inst, to) {
  const from = effectiveGlowHeroFillAmount(inst)
  const target = to ?? getGlowHeroFillProgress(glowHeroFillOpts(inst))
  if (target <= from + 0.001) return
  inst.pendingHeroFillReveal = { from, to: target, hintText: null }
}
//
// Ring + chime + body fill step once the letter caption has fully closed.
//
function completeGlowHeroFillRevealAfterCaption(inst, hintText) {
  const pending = inst.pendingHeroFillReveal
  if (!pending) return
  hintText && (pending.hintText = hintText)
  fireGlowHeroFillReveal(inst, pending)
}
//
// Menu-style expanding ring + chime when the hero lands after a letter.
//
function fireGlowHeroFillReveal(inst, pending) {
  inst.pendingHeroFillReveal = null
  inst._lastHeroFillAmount = pending.to
  triggerGlowHeroFillBurst(inst)
  Sound.playLetterPickupSoft(inst.sound)
  const voiceHintOpts = {
    followHero: true,
    faceAnchorYOffset: GLOW_HERO_COUNTER_Y_OFFSET,
    dismissDistance: GLOW_HINT_DISMISS_DISTANCE,
    dismissOnJump: false
  }
  pending.hintText &&
    HeroHint.show(inst.heroHint, pending.hintText, HERO_CONFIDENT_HINT_DURATION, voiceHintOpts)
  const isLFill = Math.abs(pending.to - GLOW_HERO_FILL_L) <= GLOW_HERO_FILL_L_EPS
  if (Math.abs(pending.to - GLOW_HERO_FILL_L) <= GLOW_HERO_FILL_L_EPS) {
    inst.meditation.lFillRingPlayed = true
  }
  syncGlowHeroBodyFill(inst)
}
// Persists the post-L lit-ground beat once the stillness countdown starts.
//
function persistLLitZoneProgress(inst) {
  if (inst.zones.lZoneLit) return
  inst.zones.lZoneLit = true
  inst.zones.lZone = true
  set(KEY_REVEALED_L_LIT, true)
}
//
// Rebakes shaded decor that belongs to the post-L stillness reveal.
//
function applyGlowPostLStillnessReveal(inst) {
  rebakeTrampolineGraySprites(inst.k)
  rebakeGlowRockSpritesShaded(inst)
  persistLLitZoneProgress(inst)
  if (!inst.zones.oZone) {
    inst.colorFade = 1
    inst.parallaxFade = 1
    inst.meditationWorldLife = 1
    syncTreeColorCrossfade(inst)
  }
  applyZoneVisibility(inst)
}
//
// After L: same full-colour world beat as when the O letter is reachable
// (revealOZone) — stillness countdown only gates O platform + birds, not a
// second palette on pickup.
//
function applyGlowPostLLitState(inst) {
  const z = inst.zones
  inst.colorFadeTarget = 1
  inst._meditationParallaxPreview = false
  inst._meditationPreviewFadingOut = false
  if (z.lCollected && !z.oCollected && !z.colorWorld) {
    inst.colorFade = 1
    inst.parallaxFade = 1
    inst.meditationWorldLife = 1
    inst.earTreeRevealFade = 1
    !z.lZoneParallax && revealLParallaxZone(inst)
  }
  inst._grassColorSettled = null
  inst._grassMudColorSettled = null
  syncGlowGrassHueVariation(inst)
  syncTreeColorCrossfade(inst)
  syncGlowCanvasBackdrop(inst.k, inst.zones)
  applyZoneVisibility(inst)
}
//
// Reveals the combined background forest when the stillness countdown runs.
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
// World systems skip updates via dialogOpen; hero keeps full movement.
//
function beginGlowWorldFreeze(inst) {
  inst._letterCaptionGrainBoost = true
  syncGlowPredatorVisibility(inst)
}
//
// No hero state to restore — dialog freeze is world-only.
//
function endGlowWorldFreeze(inst) {
  inst._letterCaptionGrainBoost = false
  syncGlowPredatorVisibility(inst)
}
//
// Snapshot of birds + proximity ambient volumes for dialog fade.
//
function createGlowDialogAudioFadeState(inst) {
  return {
    birdsVol: Sound.getKaplaySoundVolume(inst.birdsMusic),
    whisperVol: Sound.getEarTreeWhisperVolume(),
    ambientVol: Sound.getAmbientVolume(inst.sound)
  }
}
//
// Fades birds and proximity ambient out during the caption fade-in window.
//
function updateGlowDialogAudioFadeOut(inst, state, elapsedSec) {
  const fade = GLOW_DIALOG_AUDIO_FADE_SEC
  const t = Math.min(1, elapsedSec / fade)
  const birds = state.birdsVol * (1 - t)
  inst.birdsMusic && (inst.birdsMusic.volume = birds)
  inst.sound && Sound.setAmbientVolume(inst.sound, state.ambientVol * (1 - t))
}
//
// Fades birds and proximity ambient back after the caption closes.
//
function restoreGlowDialogAudioFadeIn(inst, state) {
  inst._dialogAudioRestoreRaf && cancelAnimationFrame(inst._dialogAudioRestoreRaf)
  const startMs = performance.now()
  const fadeMs = GLOW_DIALOG_AUDIO_FADE_SEC * 1000
  const tick = () => {
    const t = Math.min(1, (performance.now() - startMs) / fadeMs)
    setGlowBirdsLoopVolume(inst.birdsMusic, state.birdsVol * t)
    inst.sound && Sound.setAmbientVolume(inst.sound, state.ambientVol * t)
    if (t < 1) {
      inst._dialogAudioRestoreRaf = requestAnimationFrame(tick)
      return
    }
    inst._dialogAudioRestoreRaf = null
    syncGlowWorldBirdsVolume(inst)
  }
  inst._dialogAudioRestoreRaf = requestAnimationFrame(tick)
}
//
// Tears down caption objects and unfreezes the world after the hold ends.
//
//
// Gray crumble crumbs — decor tones only (no brown soil swatches).
//
function glowCaptionEarthCrumbleColors() {
  //
  // True neutrals only — playfieldGray/midGray are green-tinted role aliases in cfg.
  //
  return [
    glowRgb('decorGray'),
    glowRgb('captionLetterGInk')
  ]
}
//
// True when the picked-up letter stays in the world and the suffix crumbles away.
//
function isGlowInlineWordCaptionLetter(char) {
  return GLOW_INLINE_WORD_CAPTION_LETTERS.has(char)
}
//
// Lowest world Y inside the tilted crumble spawn rectangle (Kaplay Y grows down).
//
function glowCaptionCrumbleRegionVerticalExtents(centerX, centerY, halfW, halfH, tiltDeg) {
  const rad = tiltDeg * Math.PI / 180
  const sin = Math.sin(rad)
  const cos = Math.cos(rad)
  let minY = centerY
  let maxY = centerY
  for (let i = 0; i < 4; i++) {
    const lx = i < 2 ? -halfW : halfW
    const ly = i % 2 === 0 ? -halfH : halfH
    const wy = centerY + lx * sin + ly * cos
    wy < minY && (minY = wy)
    wy > maxY && (maxY = wy)
  }
  return { minY, maxY, midY: (minY + maxY) * 0.5 }
}
//
// Spawns a crumble burst over the tilted inline-word caption bounds.
//
function spawnGlowInlineWordCaptionCrumble(inst, centerX, centerY, halfW, halfH, tiltDeg) {
  if (!inst.footParticles) return
  const regionY = glowCaptionCrumbleRegionVerticalExtents(centerX, centerY, halfW, halfH, tiltDeg)
  const bulkImpactSec = GlowFootParticles.estimateCaptionCrumbleBulkGroundSec(regionY.midY, FLOOR_Y)
  GlowFootParticles.spawnEarthCrumbleFromRegion(inst.footParticles, {
    centerX,
    centerY,
    halfW,
    halfH,
    tiltDeg,
    colors: glowCaptionEarthCrumbleColors(),
    count: GLOW_INLINE_WORD_CAPTION_CRUMBLE_PARTICLE_COUNT,
    groundY: FLOOR_Y,
    captionCrumble: true
  })
  //
  // Short sand burst centred on bulk ground impact (delayed from spawn).
  //
  if (inst.sound && !inst.sound._glowSfxMuted) {
    Sound.resumeAudioContext(inst.sound)
    Sound.playGlowCaptionSandCrumble(inst.sound, bulkImpactSec)
  }
}
//
function closeGlowLetterCaption(inst, captionObjs, letterEntry, onCloseExtra, audioFade) {
  inst._dialogCaptionRaf && cancelAnimationFrame(inst._dialogCaptionRaf)
  inst._dialogCaptionRaf = null
  captionObjs.forEach(obj => obj.destroy())
  letterEntry?.allObjects?.forEach(obj => obj.destroy?.())
  stopGlowLetterDialogMusic(inst)
  restoreGlowDialogAudioFadeIn(inst, audioFade)
  endGlowWorldFreeze(inst)
  unpinHeroAfterLetterDialog(inst)
  inst.letterCaptionActive = false
  inst.dialogOpen = false
  onCloseExtra?.()
}
//
// Replaces the old modal letter dialog: the picked-up letter stays exactly
// where it was collected and becomes part of the caption word itself.
// The world keeps running during every letter caption; timing uses wall-clock ms.
//
function openGlowLetterCaption(inst, letterEntry, text, holdDuration, onCloseExtra, dialogSoundName = null) {
  const k = inst.k
  inst.letterCaptionActive = true
  beginGlowWorldFreeze(inst)
  const audioFade = createGlowDialogAudioFadeState(inst)
  playGlowLetterDialogMusic(inst, dialogSoundName)
  const keepWorldLetter = isGlowInlineWordCaptionLetter(letterEntry?.char)
  letterEntry && (letterEntry.forceVisible = true)
  //
  // G/L/O keep the world glyph; only the suffix is painted as caption text.
  // W and legacy paths hide the pickup and repaint the glyph through k.text.
  //
  if (keepWorldLetter) {
    letterEntry?.allObjects?.forEach(obj => {
      obj.hidden = false
      obj.opacity = 1
    })
  } else {
    letterEntry?.allObjects?.forEach(obj => { obj.hidden = true })
  }
  const font = GLOW_LETTER_FONT
  const flatMonoCaption = isGlowFlatSingleDecorColor(inst)
  const decorCaptionRgb = getRGB(k, GLOW_PAL.decorGray)
  const gCaptionTextRgb = getRGB(k, GLOW_PAL.captionLetterGInk)
  const gCaptionLetterRgb = getRGB(k, CFG.visual.colors.hero.eyeWhite)
  const grayCaptionNoShadow = keepWorldLetter
  const captionLetterLInkRgb = getRGB(k, GLOW_PAL.captionLetterLInk)
  const captionTextRgb = keepWorldLetter
    ? gCaptionTextRgb
    : letterEntry?.char === 'L'
      ? captionLetterLInkRgb
      : glowCaptionTextRgb()
  const letterFillRgb = letterEntry?.char === 'G'
    ? gCaptionLetterRgb
    : flatMonoCaption && letterEntry?.char === 'L'
      ? decorCaptionRgb
      : letterEntry?.char === 'L'
        ? getRGB(k, GLOW_PAL.gold)
        : getRGB(k, CFG.visual.colors.hero.eyeWhite)
  const captionUseShadow = !grayCaptionNoShadow
  const tiltDeg = letterEntry?.tiltDeg ?? 0
  const { before, after } = splitGlowCaptionText(text)
  const afterLines = after.split('\n')
  const afterFirst = afterLines[0] || ''
  const restText = afterLines.slice(1).join('\n')
  //
  // Caption text matches the letter's own size (unchanged from before pickup)
  // so it reads as one continuous, uniformly sized piece of text.
  //
  const fontSize = GLOW_LETTER_CAPTION_FONT_SIZE
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
  !keepWorldLetter && letterEntry &&
    pieces.push({ text: letterEntry.char, anchor: 'center', localX: 0, localY: 0, letterFill: true })
  if (keepWorldLetter && afterFirst) {
    let suffixX = letterHalfW
    for (let i = 0; i < afterFirst.length; i++) {
      const ch = afterFirst[i]
      pieces.push({
        text: ch,
        anchor: 'left',
        localX: suffixX,
        localY: 0,
        suffixIndex: i
      })
      suffixX += k.formatText({ text: ch, size: fontSize, font }).width
    }
  } else if (afterFirst) {
    pieces.push({ text: afterFirst, anchor: 'left', localX: letterHalfW, localY: 0 })
  }
  restText && pieces.push({
    text: restText,
    anchor: 'top',
    align: 'center',
    localX: firstRowCenterX,
    localY: rowStep
  })
  const captionPieces = []
  //
  // Live k.text (not a rotated bitmap bake) keeps every glyph edge sharp at
  // the caption's tilt angle — baking to a sprite and rotating it re-samples
  // the pixels and leaves the stair-stepped, rubbed look on curves.
  //
  pieces.forEach(piece => {
    const localOffset = rotateGlowOffset(piece.localX, piece.localY, tiltDeg)
    const textRgb = piece.letterFill ? letterFillRgb : captionTextRgb
    const shadowOffset = rotateGlowOffset(
      piece.localX + GLOW_LETTER_CAPTION_SHADOW_OFFSET,
      piece.localY + GLOW_LETTER_CAPTION_SHADOW_OFFSET,
      tiltDeg
    )
    const group = { suffixIndex: piece.suffixIndex ?? null, objs: [] }
    captionUseShadow && group.objs.push(k.add([
      k.text(piece.text, { size: fontSize, font, align: piece.align, lineSpacing: GLOW_LETTER_CAPTION_LINE_SPACING }),
      k.pos(originX + shadowOffset.x, originY + shadowOffset.y),
      k.anchor(piece.anchor),
      k.rotate(tiltDeg),
      k.color(GLOW_LETTER_SHADOW_R, GLOW_LETTER_SHADOW_G, GLOW_LETTER_SHADOW_B),
      k.opacity(0),
      k.z(GLOW_LETTER_CAPTION_Z)
    ]))
    group.objs.push(k.add([
      k.text(piece.text, { size: fontSize, font, align: piece.align, lineSpacing: GLOW_LETTER_CAPTION_LINE_SPACING }),
      k.pos(originX + localOffset.x, originY + localOffset.y),
      k.anchor(piece.anchor),
      k.rotate(tiltDeg),
      k.color(textRgb.r, textRgb.g, textRgb.b),
      k.opacity(0),
      k.z(GLOW_LETTER_CAPTION_Z + 1)
    ]))
    captionPieces.push(group)
  })
  const captionObjs = captionPieces.flatMap(group => group.objs)
  const fadeOutStartSec = GLOW_LETTER_CAPTION_FADE_IN + holdDuration
  const fadeOutDuration = keepWorldLetter ? GLOW_INLINE_WORD_CAPTION_CRUMBLE_SEC : GLOW_LETTER_CAPTION_FADE_OUT
  const totalSec = fadeOutStartSec + fadeOutDuration
  const inlineWordCrumbleHalfW = letterHalfW + afterFirstWidth * 0.5
  const inlineWordCrumbleHalfH = oneLineHeight * 0.42
  const inlineWordCrumbleCenter = rotateGlowOffset(afterFirstWidth * 0.5, 0, tiltDeg)
  const inlineWordCrumbleCenterX = originX + inlineWordCrumbleCenter.x
  const inlineWordCrumbleCenterY = originY + inlineWordCrumbleCenter.y
  let inlineWordCrumbleSpawned = false
  const tickStartMs = performance.now()
  const tick = () => {
    if (!inst.letterCaptionActive) return
    const elapsed = (performance.now() - tickStartMs) / 1000
    updateGlowDialogAudioFadeOut(inst, audioFade, elapsed)
    const inFadeOut = elapsed >= fadeOutStartSec
    const fadeOutOpacity = inFadeOut && !keepWorldLetter
      ? Math.max(0, 1 - (elapsed - fadeOutStartSec) / GLOW_LETTER_CAPTION_FADE_OUT)
      : null
    if (keepWorldLetter && inFadeOut && !inlineWordCrumbleSpawned) {
      inlineWordCrumbleSpawned = true
      captionObjs.forEach(obj => {
        obj.hidden = true
        obj.opacity = 0
      })
      letterEntry?.allObjects?.forEach(obj => {
        obj.hidden = true
        obj.opacity = 0
      })
      const crumbleCx = inlineWordCrumbleCenterX
      const crumbleCy = inlineWordCrumbleCenterY
      const crumbleHalfW = inlineWordCrumbleHalfW
      const crumbleHalfH = inlineWordCrumbleHalfH
      const crumbleTilt = tiltDeg
      inst.k.wait(0, () => {
        if (!inst.letterCaptionActive) return
        spawnGlowInlineWordCaptionCrumble(
          inst,
          crumbleCx,
          crumbleCy,
          crumbleHalfW,
          crumbleHalfH,
          crumbleTilt
        )
      })
    }
    if (!inlineWordCrumbleSpawned) {
      captionPieces.forEach(group => {
        let pieceOpacity = 1
        if (fadeOutOpacity != null) {
          pieceOpacity = fadeOutOpacity
        } else if (keepWorldLetter && group.suffixIndex != null) {
          const delay = group.suffixIndex * GLOW_INLINE_WORD_CAPTION_SUFFIX_CHAR_STAGGER_SEC
          const t = elapsed - delay
          pieceOpacity = t <= 0 ? 0 : Math.min(1, t / GLOW_LETTER_CAPTION_FADE_IN)
        } else if (elapsed < GLOW_LETTER_CAPTION_FADE_IN) {
          pieceOpacity = elapsed / GLOW_LETTER_CAPTION_FADE_IN
        }
        group.objs.forEach(obj => { obj.opacity = pieceOpacity })
      })
      if (keepWorldLetter && letterEntry?.allObjects) {
        letterEntry.allObjects.forEach(obj => {
          obj.hidden = false
          obj.opacity = 1
        })
      }
    }
    if (elapsed < totalSec) {
      inst._dialogCaptionRaf = requestAnimationFrame(tick)
      return
    }
    closeGlowLetterCaption(inst, captionObjs, letterEntry, onCloseExtra, audioFade)
  }
  inst._dialogCaptionRaf = requestAnimationFrame(tick)
}
//
// Resets dialog bookkeeping after a letter caption closes.
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
  isGlowWZoneActive(inst) && z.oCollected && logs.push(inst.wPlatHome)
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
  z.lPlatRevealed && homes.push({ ...inst.lPlatHome, w: LOG_W })
  z.oZone && z.lCollected && homes.push({ ...inst.oPlatHome, w: LOG_W, dropY: LOG_COLLISION_DROP_Y })
  isGlowWZoneActive(inst) && z.oCollected &&
    homes.push({ ...inst.wPlatHome, w: LOG_W, dropY: LOG_COLLISION_DROP_Y })
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
  char.pos.y = best - SURFACE_DETECT_Y + WOOD_LOG_SNAP_EMBED
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
  inst.sound && Sound.resumeAudioContext(inst.sound)
  const birds = inst.birdsMusic
  //
  // Duck BEFORE forcing volume to 0 — duckBackgroundMusic saves the current
  // volume to restore later, but bails out without saving whenever it's
  // called on an already-silent track (current <= 0). Zeroing first made
  // every duck here a no-op, so unduckBackgroundMusic on dialog close could
  // never restore anything and birds stayed silent for good afterwards.
  //
  Sound.duckBackgroundMusic(birds, CFG.audio.backgroundMusic.dialogMusicDuck)
  birds && (birds.volume = 0)
  const vol = CFG.audio.backgroundMusic.glowLetterDialog
  //
  // Kaplay k.play() can return null while assets are still loading — play the
  // glow dialog clips directly via HTML5 Audio (same path as loadSound).
  //
  const voice = new Audio(`./sounds/${soundName}.mp3`)
  voice.volume = Math.min(1, vol)
  inst.letterDialogMusic = {
    stop() {
      voice.pause()
      voice.currentTime = 0
    }
  }
  voice.play().catch(() => {})
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
  if (!isGLetterCollectable(inst) || inst.letterCaptionActive) return
  triggerGlowCameraShake(inst)
  queueGlowHeroFillReveal(inst, GLOW_HERO_FILL_G)
  inst.zones.gCollected = true
  inst._postGCucumberHintShows = 0
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
  set(KEY_COLLECTED_G, true)
  syncGlowMidgesZones(inst.midges, inst.zones, inst.pit?.collapsed)
  //
  // Intro hints end the moment the first letter is taken.
  //
  HeroHint.clear(inst.heroHint)
  const entry = inst.gLetter
  if (entry) {
    entry.pickedUp = true
    entry._pickupQueued = false
  }
  syncGlowHudLetterFills(inst, false)
  flashGlowHudLetterBurst(inst, 1)
  syncGlowPredatorVisibility(inst)
  reconcileMudPredatorJumpCredit(inst)
  //
  // The big tree's roots normally wait for L — moved up to G here too (see
  // glowTreeRootRevealFade), gray only since colour world is still far off.
  // In monolith mode (the common case this early) the sprite swap in
  // syncMonolithicTreeGraySprite alone already handles it; only call this
  // (with its localStorage write) once segmented mode is already active —
  // calling it from a fresh monolith session would flip the next reload
  // into segmented mode with just the roots revealed and everything else
  // still hidden, a worse regression than the roots simply waiting for L.
  //
  applyZoneVisibility(inst)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 1, inst.zones.colorWorld)
  } else {
    //
    // The indicator may pre-exist with a hidden GLOW word (fragment / life
    // HUD before G) — taking G finally names the level.
    //
    LevelIndicator.setSectionLabelHidden(inst.levelIndicator, false)
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 1)
    syncGlowHudLetterColors(inst)
  }
  syncGlowFpsHudVisibility(inst)
  openGlowLetterCaption(inst, entry, GLOW_DIALOG_G, GLOW_LETTER_CAPTION_DURATION_G, () => {
    inst.gLetter = null
    //
    // Tree waits until the hero lands on the starting branch.
    //
    inst.pendingTreeReveal = !inst.zones.tree
    completeGlowHeroFillRevealAfterCaption(inst, GLOW_CONFIDENCE_HINT_G)
  })
}
//
// Collects L after landing on the solid L platform.
//
function collectLetterL(inst) {
  if (inst.zones.lCollected || inst.letterCaptionActive || !inst.zones.gCollected) return
  triggerGlowCameraShake(inst)
  queueGlowHeroFillReveal(inst, GLOW_HERO_FILL_L)
  inst.zones.lCollected = true
  dismissGlowLPlatTeacherHint(inst)
  inst._postLStopHintShows = 0
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
  inst._lakeColorSettled = null
  inst._lakeDrawRgb = null
  inst._grassColorSettled = null
  inst._grassMudColorSettled = null
  set(KEY_COLLECTED_L, true)
  inst.zones.outerFrame = true
  set(KEY_REVEALED_OUTER_FRAME, true)
  recomputeGlowScreenLayout(inst.k)
  syncGlowCanvasBackdrop(inst.k, inst.zones)
  refreshPlayfieldCornerSprites(inst)
  updatePlayfieldBorderColors(inst)
  const entry = inst.lLetter
  if (entry) {
    entry.pickedUp = true
    entry._pickupQueued = false
  }
  syncGlowHudLetterFills(inst, false)
  flashGlowHudLetterBurst(inst, 2)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 2, inst.zones.colorWorld)
  } else {
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 2)
    syncGlowHudLetterColors(inst)
  }
  syncGlowLifeHudPupil(inst)
  inst.meditationWorldLife = 0
  syncGlowBirdsAfterL(inst)
  //
  // The L-log vanishes for the length of the caption only, same as O —
  // restored once the caption closes below. Gated by its own flag (rather
  // than a one-off setPlatVisible override) so it stays hidden even if some
  // other applyZoneVisibility() call fires while the caption is still up.
  //
  inst.lPlatCaptionHiding = true
  applyZoneVisibility(inst)
  ensureGlowTreeRootsSegment(inst)
  syncTreeColorCrossfade(inst)
  applyGlowPostLLitState(inst)
  openGlowLetterCaption(inst, entry, GLOW_DIALOG_L, GLOW_LETTER_CAPTION_DURATION_L, () => {
    inst.lLetter = null
    inst.glowLetters = inst.glowLetters.filter(e => e !== entry)
    inst.lPlatCaptionHiding = false
    applyZoneVisibility(inst)
    completeGlowHeroFillRevealAfterCaption(inst, GLOW_CONFIDENCE_HINT_L)
  })
  revealGlowFpsCounter(inst)
}
//
// Collects O after landing on the solid O platform.
//
function collectLetterO(inst) {
  if (inst.zones.oCollected || inst.letterCaptionActive || !inst.zones.lCollected) return
  triggerGlowCameraShake(inst)
  queueGlowHeroFillReveal(inst, 1)
  inst.zones.oCollected = true
  set(KEY_COLLECTED_O, true)
  inst._grassColorSettled = null
  inst._grassMudColorSettled = null
  dismissGlowPostLStopTeacherHint(inst)
  inst._postOBigMushHintShows = 0
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
  ensureGlowTreeRootsSegment(inst)
  syncTreeColorCrossfade(inst)
  const entry = inst.oLetter
  if (entry) {
    entry.pickedUp = true
    entry._pickupQueued = false
  }
  syncGlowHudLetterFills(inst, false)
  flashGlowHudLetterBurst(inst, 3)
  inst.trampWalk.singAllowedAt = Number.POSITIVE_INFINITY
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 3, inst.zones.colorWorld)
  } else {
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 3)
    syncGlowHudLetterColors(inst)
  }
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
    completeGlowHeroFillRevealAfterCaption(inst)
    startColorWorldFade(inst)
    inst.oPlatCaptionHiding = false
    applyZoneVisibility(inst)
    const tw = inst.trampWalk
    tw && (tw.singAllowedAt = inst.k.time() + TRAMP_SING_ARM_DELAY_AFTER_O_CAPTION)
  })
}
//
// Collects W after landing on the solid W platform.
//
function collectLetterW(inst) {
  if (inst.zones.wCollected || inst.letterCaptionActive || !inst.zones.oCollected) return
  triggerGlowCameraShake(inst)
  queueGlowHeroFillReveal(inst, 1)
  completeGlowHeroFillRevealAfterCaption(inst)
  inst.zones.wCollected = true
  setGlowHeroWitnessGlow(inst, true)
  set(KEY_COLLECTED_W, true)
  const entry = inst.wLetter
  hideGlowLetterPickupInWorld(entry)
  inst.wLetter = null
  syncGlowHudLetterFills(inst, false)
  flashGlowHudLetterBurst(inst, 4)
  entry?.allObjects?.forEach(obj => obj.destroy?.())
  inst.glowLetters = inst.glowLetters.filter(e => e !== entry)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, 4, inst.zones.colorWorld)
  } else {
    LevelIndicator.setSectionLabelLetterProgress(inst.levelIndicator, 4)
    syncGlowHudLetterColors(inst)
  }
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
// Shows the top-centre FPS HUD when any top-bar element is visible.
//
function isGlowTopHudElementVisible(inst) {
  const li = inst.levelIndicator
  if (!li) return false
  if (CFG.debug?.showPerformanceHud) return true
  if (inst.zones.gCollected) return true
  if (li.lifeRevealed) return true
  return isGlowEyesGameplayUnlocked(inst.zones)
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
// Full HUD after W: FPS counter top-centre plus the life icon top-right.
//
function revealPostWHud(inst) {
  revealGlowFpsCounter(inst)
  revealGlowTeacherHudIfNeeded(inst)
  layoutGlowFpsHud(inst)
}
//
// L/O/W defer collect until landing; G collects on touch. Burst + chime on first touch.
//
function glowLetterEntryByKind(inst, kind) {
  if (kind === 'g') return inst.gLetter
  if (kind === 'l') return inst.lLetter
  if (kind === 'o') return inst.oLetter
  if (kind === 'w') return inst.wLetter
  return null
}
//
function queueGlowLetterPickup(inst, kind, grounded) {
  if (inst.letterCaptionActive) return
  if (inst.pendingLetterPickup?.kind === kind) {
    grounded && (inst.pendingLetterPickup.pickedOnGround = true)
    const flushGrounded = kind === 'g' || grounded
    flushPendingGlowLetterPickup(inst, flushGrounded, true)
    return
  }
  if (inst.pendingLetterPickup) return
  const entry = glowLetterEntryByKind(inst, kind)
  const collectOnTouch = kind === 'g'
  !collectOnTouch && entry && concealGlowLetterPickupVisual(entry)
  entry && playGlowLetterWorldPickupFx(inst, entry)
  inst.pendingLetterPickup = { kind, pickedOnGround: grounded }
  if (collectOnTouch) {
    flushPendingGlowLetterPickup(inst, true, true)
    return
  }
  grounded && flushPendingGlowLetterPickup(inst, true, true)
}
//
// Runs a queued letter pickup once the hero has landed.
//
function flushPendingGlowLetterPickup(inst, grounded, justLanded) {
  const pending = inst.pendingLetterPickup
  if (!pending || !grounded) return
  const lVisibleReady = pending.kind === 'l' && inst.zones.lLetterUnveiled
  if (!justLanded && !pending.pickedOnGround && !lVisibleReady) return
  inst.pendingLetterPickup = null
  pending.kind === 'g' && collectLetterG(inst)
  pending.kind === 'l' && collectLetterL(inst)
  pending.kind === 'o' && collectLetterO(inst)
  pending.kind === 'w' && collectLetterW(inst)
}
//
// Proximity pickup for L/O/W letters on their platforms.
//
function tryCollectGlowLetters(inst, char, grounded, justLanded) {
  flushPendingGlowLetterPickup(inst, grounded, justLanded)
  if (inst.pendingLetterPickup || inst.letterCaptionActive) return
  const heroX = char.pos.x
  const heroY = char.pos.y
  inst.zones.lPlatRevealed && inst.zones.lLetterUnveiled && !inst.zones.lCollected && inst.zones.gCollected &&
    glowLetterPickupNear(inst, inst.lLetter, 'l', heroX, heroY) && queueGlowLetterPickup(inst, 'l', grounded)
  inst.zones.oZone && !inst.zones.oCollected && inst.zones.lCollected &&
    glowLetterPickupNear(inst, inst.oLetter, 'o', heroX, heroY) && queueGlowLetterPickup(inst, 'o', grounded)
  isGlowWZoneActive(inst) && !inst.zones.wCollected && inst.zones.oCollected &&
    glowLetterPickupNear(inst, inst.wLetter, 'w', heroX, heroY) && queueGlowLetterPickup(inst, 'w', grounded)
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
  if (inst.drowning || inst.dialogOpen || inst.touchDeathHandled) return
  if (inst.dialogInputGrace > 0 || inst.dialogPostSettle > 0) return
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  clampHeroIntoTrampolineCapX(char, inst.trampState)
  clampHeroIntoTrampolineCapX(char, inst.branchTrampState)
  const heroX = char.pos.x
  const onRightTrampCap = isOnTrampolineCap(inst, char, inst.trampState)
  const onBranchTrampCap = isOnTrampolineCap(inst, char, inst.branchTrampState)
  let bounced = false
  if (isRightTrampolineColliderActive(inst.zones) &&
    wantsTrampolineCapLaunch(inst, char, onRightTrampCap, inst.trampState)) {
    const walked = inst.trampWalk?.walked
    const mult = walked ? TRAMP_DOCKED_BOOST_MULT : TRAMP_BOOST_MULT
    bounced = tryMushroomTrampBounce(inst, inst.trampState, mult, hero, char, heroX,
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
  if (inst.zones?.gCollected) return
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
  inst.drownFromStartBranch = Boolean(inst.wasOnStartBranch)
  inst.drowning = true
  hideGlowHudLetterFillCounter(inst)
  inst.glowDrownHeroClipLock = true
  inst.heroFillBurst = 0
  clearGlowHeroFillPreview(inst)
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
  hideGlowHudLetterFillCounter(inst)
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
// Shared life-HUD bump for any death: +1 lifeScore, reveal/flash/re-tint the
// life icon and its particle burst, gentle chime. Shared by drowning and the
// touch death.
//
function bumpGlowLifeHudOnDeath(inst) {
  const newLife = get('lifeScore', 0) + 1
  set('lifeScore', newLife)
  if (!inst.levelIndicator) {
    inst.levelIndicator = createGlowLevelIndicator(inst.k, inst.goldRgb, countGlowLettersCollected(inst.zones), inst.zones.colorWorld)
  }
  syncGlowHudLetterFills(inst, false)
  syncGlowFpsHudVisibility(inst)
  if (!inst.levelIndicator?.lifeRevealed) return
  inst.levelIndicator.updateLifeScore?.(newLife)
  syncGlowLifeScoreVisibility(inst.levelIndicator, newLife)
  Sound.playGentleLifeSound(inst.sound)
  if (inst.levelIndicator?.lifeImage?.sprite?.exists?.()) {
    const greyLife = glowLifeHudWantGrey(inst)
    LevelIndicator.syncLifeHudGrey(inst.levelIndicator, greyLife)
    const desatReady = eyeHudSpriteIsDesat(inst.levelIndicator._lifeSpriteName)
    const canFlash = !greyLife || desatReady
    if (canFlash) {
      inst.levelIndicator._lifeFlashLock = true
      const originalColor = inst.levelIndicator.lifeImage.sprite.color
      flashLifeImageOnDrownDeath(inst.k, inst.levelIndicator, originalColor, 0, greyLife)
    }
    createLifeParticlesOnDrownDeath(inst.k, inst.levelIndicator, greyLife)
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
  if (inst.k.time() < (inst.touchDeathGraceUntil ?? 0)) return
  if (Predator.isTouchingHero(inst.predator, heroX, heroFootY)) {
    inst._predatorDeathHintContext = capturePredatorDeathHintContext(inst, heroX)
    Predator.notifyKill(inst.predator)
    triggerGlowTouchDeath(inst, 'predator')
    return
  }
  checkGlowRightSpikeDeath(inst, heroX, heroFootY)
}
//
// Landing on the spike zone arms a brief blink before the actual kill, so
// the hazard reads as "spikes flash, then hero shatters" instead of an
// instant, unreadable death.
//
function checkGlowRightSpikeDeath(inst, heroX, heroFootY) {
  const spikes = inst.rightSpikes
  if (!spikes || spikes.triggered) return
  const withinX = heroX >= spikes.x1 - LOG_SNAP_X_SLACK && heroX <= spikes.x2 + LOG_SNAP_X_SLACK
  //
  // Triggers as soon as the feet reach the visual spike tips (RIGHT_SPIKE_H
  // above the platform surface), not only once fully landed/settled on the
  // platform itself — the spikes stick up above the surface, so death has to
  // arrive at that height, not at normal standing height.
  //
  const withinY = heroFootY >= spikes.y - RIGHT_SPIKE_H && heroFootY <= spikes.y + LOG_SNAP_BELOW
  if (!withinX || !withinY) return
  spikes.triggered = true
  //
  // The blink keeps drawing on its own timer (see drawGlowRightSpikes) well
  // past this point — it doesn't need the death itself delayed to be seen.
  //
  spikes.blinkUntil = inst.k.time() + RIGHT_SPIKE_BLINK_DURATION
  triggerGlowTouchDeath(inst, 'spikes')
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
  clearGlowHeroFillPreview(inst)
  hideGlowHudLetterFillCounter(inst)
  inst.heroFillBurst = 0
  char.exists() && inst.k.destroy(char)
  glowLevel0LiveHeroChar = null
  hero.character = null
  triggerGlowCameraShake(inst)
  spawnGlowTouchDeathBurst(inst, deathX, deathY)
  finishGlowTouchDeath(inst, cause, deathX, deathY)
}
//
// Leaf-shaped radial burst at the death spot — green leaf tones in the
// colour world, a few gray shades while the level is flat/monochrome —
// instead of the hero's generic body-square explosion.
//
function spawnGlowTouchDeathBurst(inst, x, y) {
  if (!inst.footParticles) return
  const palette = glowTouchDeathLeafPalette(inst)
  GlowFootParticles.spawnLeafBurst(inst.footParticles, x, y, palette, GLOW_TOUCH_DEATH_PARTICLE_COUNT, FLOOR_Y)
}
//
// Mono world: a few gray shades already used for the level's own decor;
// colour world: the main tree's own green foliage tones, so the burst
// reads as real leaves rather than generic dust.
//
function glowTouchDeathLeafPalette(inst) {
  if (!inst?.zones?.lCollected) {
    return [DECOR_GRAY, LIGHT_GRAY, glowRgb('brightLight')]
  }
  if (!inst?.zones?.colorWorld) {
    return [DECOR_GRAY, LIGHT_GRAY, glowRgb('brightLight')]
  }
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
  const fastAttack = pred?.state === 'charge' || pred?.state === 'orient'
  const inMudBand = isGlowMudBandFootX(inst, heroFootX)
  const inConcealingGrass = isGlowPredatorConcealingGrassFootX(inst, heroFootX)
  return { fastAttack, inMudBand, inConcealingGrass }
}
//
// Soft mud band under the hero's feet (hint-only — ignores gCollected gate).
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
// Picks the wooden-spike death line for this kill (cycles through the set).
//
function spikeDeathHintText(deathOrdinal) {
  const idx = Math.max(0, deathOrdinal - 1) % RIGHT_SPIKE_DEATH_HINT_TEXTS.length
  return RIGHT_SPIKE_DEATH_HINT_TEXTS[idx]
}
//
// Life-HUD bump, death hint, then in-level respawn beside the kill.
//
function finishGlowTouchDeath(inst, cause, deathX, deathY) {
  bumpGlowLifeHudOnDeath(inst)
  inst.touchDeathCount = (inst.touchDeathCount || 0) + 1
  if (cause === 'spikes') {
    inst.spikeDeathCount = (inst.spikeDeathCount || 0) + 1
    const spikes = inst.rightSpikes
    HeroHint.show(
      inst.heroHint,
      spikeDeathHintText(inst.spikeDeathCount),
      GLOW_TOUCH_DEATH_HINT_DURATION,
      {
        anchorX: spikes ? (spikes.x1 + spikes.x2) / 2 : deathX,
        anchorY: (spikes?.y ?? deathY) - GLOW_TOUCH_DEATH_HINT_RAISE,
        offsetY: GLOW_TOUCH_HINT_BUBBLE_OFFSET_Y,
        forceAbove: true,
        ignoreMovementDismiss: true,
        dismissDistance: GLOW_HINT_DISMISS_DISTANCE
      }
    )
  } else if (cause === 'predator') {
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
// Spawn clear of the spike zone: offset away from its centre, then pushed
// past its edge (plus clearance) if that offset still lands inside it.
//
function computeGlowSpikeRespawnX(inst, deathX) {
  const spikes = inst.rightSpikes
  if (!spikes) return deathX
  //
  // The spikes occupy nearly the whole right portion of the platform (see
  // RIGHT_SPIKE_ZONE_W/RIGHT_SPIKE_EDGE_GAP) — there is no clearance left on
  // their right within the log's own bounds, only on their left. Respawning
  // "away from the death spot" there used to clamp straight back onto the
  // spikes and re-trigger the same death every time (the reported loop).
  //
  let spawnX = spikes.x1 - HERO_TOUCH_DEATH_RESPAWN_CLEARANCE - GLOW_HERO_HITBOX_HALF_W
  const home = inst.lPlatHome
  home && (spawnX = Math.max(home.x + LOG_SNAP_X_SLACK, spawnX))
  //
  // Staying on the platform (clamp above) can still land inside
  // checkGlowRightSpikeDeath's own trigger margin when the platform is
  // narrow — always keep strictly clear of that boundary too, even if it
  // means spawning past the platform's own left edge.
  //
  spawnX = Math.min(spawnX, spikes.x1 - LOG_SNAP_X_SLACK - GLOW_HERO_HITBOX_HALF_W)
  return spawnX
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
      lPlatX: nudge.lPlatX,
      rightPlatY: nudge.rightPlatY,
      rightSpikes: inst.rightSpikes,
      mudZoneX1: nudge.mudZoneX1,
      mudZoneX2: nudge.mudZoneX2,
      predator: pred
    })
    spawnX = resolveGlowPredatorRespawnX(inst, spawnX, spawnY, pred)
    return { x: spawnX, y: spawnY }
  }
  if (cause === 'spikes') {
    const spawnX = computeGlowSpikeRespawnX(inst, deathX)
    //
    // A spike death here must never gently set the hero back down on the
    // platform itself (a safe redo right past the hazard) — always drop him
    // to the main floor below instead.
    //
    const spawnY = FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    return { x: spawnX, y: spawnY }
  }
  return { x: deathX, y: deathY }
}
//
// Picks a ground X on the far side of the predator from the death spot, then
// slides along the mud band until the hitbox clears the body.
//
function resolveGlowPredatorRespawnX(inst, deathX, deathY, pred) {
  const predX = pred.x
  const away = deathX <= predX ? -1 : 1
  const footY = deathY + SURFACE_DETECT_Y
  const pad = MUD_ZONE_CREATURE_MARGIN + 4
  const minX = pred.minX ?? (inst.mudZoneX1 != null ? inst.mudZoneX1 + pad : deathX - 200)
  const maxX = pred.maxX ?? (inst.mudZoneX2 != null ? inst.mudZoneX2 - pad : deathX + 200)
  let spawnX = predX + away * HERO_PREDATOR_RESPAWN_PUSH
  spawnX = Math.max(minX, Math.min(maxX, spawnX))
  let sign = away
  for (let i = 0; i < 12 && Predator.overlapsHeroHitbox(pred, spawnX, footY); i++) {
    spawnX += sign * 24
    spawnX = Math.max(minX, Math.min(maxX, spawnX))
  }
  if (Predator.overlapsHeroHitbox(pred, spawnX, footY)) {
    sign = -away
    spawnX = predX + sign * HERO_PREDATOR_RESPAWN_PUSH
    spawnX = Math.max(minX, Math.min(maxX, spawnX))
    for (let i = 0; i < 12 && Predator.overlapsHeroHitbox(pred, spawnX, footY); i++) {
      spawnX += sign * 24
      spawnX = Math.max(minX, Math.min(maxX, spawnX))
    }
  }
  return spawnX
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
  const filled = inst.zones.colorWorld || inst.zones.oZone || inst.heroBodyFillApplied
  const heroEyes = getGlowHeroEyeBakeColors(!filled)
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
    outlineColor: filled ? HERO_OUTLINE_COLOR : HERO_HOLLOW_OUTLINE_COLOR,
    ...heroEyes,
    outlineOnly: !filled,
    noEyes: !inst.zones.eyesCollected
  })
  Hero.spawn(fresh, { instant: true })
  fresh.onPlayStepSound = stepSound
  fresh.onPlayLandSound = landSound
  inst.heroInst = fresh
  inst.heroHint && (inst.heroHint.heroInst = fresh)
  inst.predator && (inst.predator.hero = fresh)
  inst.swampSpirit && (inst.swampSpirit.hero = fresh)
  inst.rightSpikes && (inst.rightSpikes.triggered = false)
  glowLevel0LiveHeroChar = fresh.character
  inst.deathHandled = false
  inst.touchDeathHandled = false
  inst.touchDeathGraceUntil = inst.k.time() + TOUCH_DEATH_RESPAWN_GRACE_SEC
  restoreGlowRightTrampProgressAfterSpawn(inst)
  inst.lastHeroX = pose.x
  inst.wasGrounded = false
  inst.trampBounceAir = false
  inst.branchTrampBounceAir = false
  registerGlowTrampolineLateBounce(inst)
  snapGlowCameraToHero(k, fresh)
  !inst.zones.eyesCollected && initGlowHeroWithoutEyes(fresh)
  inst.zones.eyesCollected && applyGlowHeroEyesOpenedBake(k, fresh, fresh.postBakeCanvas)
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
// Pulls a saved spawn X away from mud hazard bands, and clear of the
// L-log's right-edge spike zone, so a reload cannot drop the hero straight
// onto either hazard.
//
function nudgeGlowHeroSpawnAwayFromMudHazards(cfg) {
  const {
    inst,
    spawnX,
    spawnY,
    spawnOnBranch,
    mudPredatorAmbushTriggerX,
    mudPredatorPopX,
    lPlatX,
    rightPlatY,
    rightSpikes,
    predator
  } = cfg
  let x = spawnX
  const heroFootY = spawnY + SURFACE_DETECT_Y
  if (!spawnOnBranch && predator && inst) {
    Predator.overlapsHeroHitbox(predator, x, heroFootY) &&
      (x = resolveGlowPredatorRespawnX(inst, x, spawnY, predator))
  }
  if (!spawnOnBranch) {
    const dangerEndX = mudPredatorPopX + MUD_ZONE_PREDATOR_DANGER_MARGIN
    x >= mudPredatorAmbushTriggerX && x <= dangerEndX &&
      (x = mudPredatorAmbushTriggerX - HERO_MUD_HAZARD_SPAWN_CLEARANCE)
  }
  if (!spawnOnBranch && rightSpikes) {
    const platLeft = lPlatX + LOG_SNAP_X_SLACK
    const platHeroY = rightPlatY - SURFACE_DETECT_Y + LOG_SNAP_EMBED
    //
    // Matches checkGlowRightSpikeDeath's own Y window (spike tip height down
    // to below the log), so a saved pose anywhere in the death-trigger band
    // gets nudged clear, not only one saved at normal standing height.
    //
    const onLPlat = spawnY >= platHeroY - RIGHT_SPIKE_H && spawnY <= platHeroY + LOG_SNAP_BELOW
    if (onLPlat && x >= rightSpikes.x1 - HERO_MUD_HAZARD_SPAWN_CLEARANCE && x <= rightSpikes.x2 + HERO_MUD_HAZARD_SPAWN_CLEARANCE) {
      //
      // The spikes occupy nearly the whole right portion of the platform —
      // there is no clearance on their right within the log's own bounds,
      // only on their left (see computeGlowSpikeRespawnX for the same fix
      // applied to the in-place respawn). Same clearance math as there too,
      // so both land the same safe distance from the death-trigger boundary.
      //
      x = Math.max(platLeft, rightSpikes.x1 - LOG_SNAP_X_SLACK - GLOW_HERO_HITBOX_HALF_W)
    }
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
  maybeShowGLetter(inst)
}
//
// Reveals ground decor on the left side (water / branch area).
//
function revealGroundDecorLeft(inst, silent = false) {
  if (!isGlowEyesGameplayUnlocked(inst.zones)) return
  if (inst.zones.groundDecorLeft) return
  inst.zones.groundDecorLeft = true
  inst.zones.groundDecor = true
  set(KEY_REVEALED_GROUND_DECOR_LEFT, true)
  !silent && playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
  syncGlowAtmosphereZones(inst)
  syncGlowHudLetterFills(inst, false)
}
//
// Midges + cave cracks follow which sides of the ground the hero has opened
//
function isGlowCaveCracksVisible(z) {
  return Boolean(z.gCollected && (z.groundDecorRight || z.oZone || z.oCollected || z.lCollected))
}
//
function syncGlowAtmosphereZones(inst) {
  const z = inst.zones
  if (isGlowEyeIntroPending(z)) {
    syncGlowEyeIntroMidges(inst.midges)
    setGlowPitCracksVisible(inst.pit, isGlowEyeIntroCaveActive(inst) || Boolean(inst.pit?.collapsed))
    return
  }
  setGlowPitCracksVisible(inst.pit, isGlowCaveCracksVisible(z))
  syncGlowMidgesZones(inst.midges, inst.zones, Boolean(inst.pit?.collapsed))
}
//
// Checks whether the hero position should unlock left/right ground decor.
// Decor only appears when the hero is on the floor — not on the start branch.
//
function checkGroundDecorReveal(inst, heroX, footY, grounded, justLanded) {
  if (shouldGlowBlockWorldReveal(inst)) return
  if (!grounded || footY < FLOOR_Y - 28) return
  updateGroundRightStripReveal(inst, heroX)
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
  syncGlowHudLetterFills(inst, false)
  showTrampolineRevealHint(inst)
}
//
// First reveal frame: pin the hero on the cap if needed and reset jump /
// landing animation — skipping bounce on this frame left jumpPhase stuck.
//
function settleHeroAfterTrampReveal(inst, char, heroX, footY, right, branch) {
  const hero = inst.heroInst
  if (!hero || !char?.pos) return
  const grounded = char.isGrounded?.() ?? false
  const landingPose = glowHeroInTrampLandingPose(hero)
  //
  // No branch-only shortcut here (there used to be one, skipping straight to
  // a pad reset without ever repositioning the hero) — pinHeroToMainFloorOverTrampoline
  // already bails on its own while landingPose is true (glowHeroInTrampLandingPose),
  // and every call below is additionally gated by !landingPose, so mid-jump
  // (the original concern: "pin/sync would cancel jump-6 mid-air") is already
  // safe without a special case. Skipping the pin left the hero's collider
  // reset (resetTrampolineCapPadState moves the pad off-screen) with nothing
  // repositioning the hero onto solid ground, which is what actually froze
  // the animation — landing on the branch mushroom (revealed or not) left
  // the hero standing over empty space with an inconsistent grounded state
  // every frame after.
  //
  const capTop = FLOOR_Y - TRAMP_TOTAL_H
  if (right) {
    resetTrampolineCapPadState(inst, inst.trampState, 'trampBounceAir', inst.trampPad)
    !landingPose &&
      inst.zones.rightTrampBounceLive &&
      isHeroAtTrampolineCap(inst, heroX, footY, inst.trampState) &&
      pinHeroOnTrampolineCap(inst, char, capTop, inst.trampState)
    !landingPose &&
      !inst.zones.rightTrampBounceLive &&
      pinHeroToMainFloorOverTrampoline(inst, char, inst.trampState)
  }
  if (branch) {
    resetTrampolineCapPadState(inst, inst.branchTrampState, 'branchTrampBounceAir', inst.branchTrampPad)
    !landingPose &&
      inst.zones.branchTrampBounceLive &&
      isHeroAtTrampolineCap(inst, heroX, footY, inst.branchTrampState) &&
      pinHeroOnTrampolineCap(inst, char, capTop, inst.branchTrampState)
    !landingPose &&
      !inst.zones.branchTrampBounceLive &&
      pinHeroToMainFloorOverTrampoline(inst, char, inst.branchTrampState)
  }
  inst.trampBounceAir = false
  inst.branchTrampBounceAir = false
  inst.chainEyeBounceAir = null
  grounded && !landingPose && (hero.canJump = true)
}
//
// Reveals the L log platform after the hero steps the left chain-eye cap on the valid chain.
//
function revealLPlatZone(inst, silent = false) {
  if (inst.zones.lPlatRevealed) return
  inst.zones.lPlatRevealed = true
  set(KEY_REVEALED_L_PLAT, true)
  !silent && playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
  const spikes = inst.rightSpikes
  spikes && (spikes.blinkUntil = inst.k.time() + RIGHT_SPIKE_BLINK_DURATION)
}
//
// Opens the L log after a bounce (or jump-land) on the right mushroom.
//
//
// Legacy no-ops — L log now opens from the left chain-eye after the tramp chain.
//
function maybeRevealLPlatOnRightTrampBounce(inst) {}
function maybeRevealLPlatIfOnRightTrampCap(inst, heroX, footY) {}
function maybeRevealLPlatOnRightTrampLand(inst, justLanded, grounded) {}
//
// Opens the O platform zone after the post-L stillness countdown completes.
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
  syncTreeColorCrossfade(inst)
  playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
  syncGlowAtmosphereZones(inst)
  HeroHint.clear(inst.heroHint)
  dismissGlowPostLStopTeacherHint(inst)
  //
  // Body fill itself waits for the O letter to actually be collected and the
  // hero to land afterward (see maybeApplyPendingHeroFillOnLand) — the zone
  // just being reachable isn't "I feel more confident now" yet.
  //
}
//
// Opens the W platform zone (after ten bounces on the right trampoline).
//
//
// W platform/letter stay hidden until ten post-O bounces finish.
//
function isGlowWZoneUnlocked(inst) {
  const tw = inst.trampWalk
  return Boolean(tw?.walked || (tw?.singCount || 0) >= TRAMP_WALK_BOUNCES_TOTAL)
}
//
// Saved wZone flags can be set early — gameplay treats W as hidden until sings finish.
//
function isGlowWZoneActive(inst) {
  const z = inst?.zones
  return Boolean(z?.wZone && isGlowWZoneUnlocked(inst))
}
function revealWZone(inst) {
  if (!isGlowWZoneUnlocked(inst)) return
  if (inst.zones.wZone) return
  inst.zones.wZone = true
  set(KEY_REVEALED_W, true)
  playSegmentRevealSound(inst)
  applyZoneVisibility(inst)
  inst.meditationCounter && HeroCounter.hide(inst.meditationCounter)
  inst._heroCountdownTickSecond = null
  hideGlowHudLetterFillCounter(inst)
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
  if (hero.jumpPhase !== 'jumping') return
  Hero.syncPlatformLanding(hero)
  hero.wasJumping = false
  hero.postLandAirLock = 0
}
//
// Per-frame camera follow — horizontal scroll only.
//
function updateGlowCamera(inst) {
  const ch = inst.heroInst?.character
  if (!ch?.pos || !inst.camera) return
  inst.camera && GlowCamera.updateShake(inst.camera, inst.k.dt())
  if (updateCameraLetterPeek(inst, ch)) return
  const inPitCave = Boolean(inst._inGlowPitCave)
  const grounded = typeof ch.isGrounded === 'function' && ch.isGrounded()
  const pixelAlignCamX = !inPitCave && grounded
  GlowCamera.followHero(inst.camera, ch.pos.x, ch.pos.y, pixelAlignCamX)
  !inst.heroInst?.isSubmerging && !inPitCave &&
    GlowCamera.snapHeroScreenY(inst.k, inst.heroInst, inst.k.camPos().y)
}
//
// First visit with no explored zones: ease the camera from a tight view to full width.
//
function maybeStartGlowCameraIntro(inst, zones) {
  const k = inst.k
  k.camScale(1)
  set(KEY_CAMERA_INTRO_DONE, true)
  snapGlowCameraToHero(k, inst.heroInst)
  if (!zones.gCollected && inst.heroInst?.character) {
    inst.heroInst.character.opacity = 0
    inst.heroSpawnFade = HERO_SPAWN_FADE_DURATION
    inst.worldHiddenForSpawnFade = true
    hideGlowWorldForSpawnFade(inst)
  }
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
  const voidColor = k.rgb(PRELUDE_BACKDROP.r, PRELUDE_BACKDROP.g, PRELUDE_BACKDROP.b)
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
function hideGlowWorldForSpawnFade(inst) {
  inst.treeObj && (inst.treeObj.hidden = true)
  inst.treeColorObj && (inst.treeColorObj.hidden = true)
  inst.treeSegmentIds?.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    entry?.obj && (entry.obj.hidden = true)
    entry?.colorObj && (entry.colorObj.hidden = true)
  })
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
  const groundedOnMud = grounded && isHeroInMudZone(inst, heroX)
  hero.moveSpeedMult = groundedOnMud ? MUD_MOVE_SPEED_MULT : 1
  hero.jumpSquashTimeMult = groundedOnMud ? MUD_JUMP_SQUASH_TIME_MULT : 1
  hero.jumpForceMult = groundedOnMud ? MUD_JUMP_FORCE_MULT : 1
  groundedOnMud && hero.isSquashing && (inst.mudJumpTakeoff = true)
  !groundedOnMud && !hero.mudJumpActive && (inst.mudJumpTakeoff = false)
  hero.jumpPhase === 'jumping' && inst.mudJumpTakeoff &&
    (hero.mudJumpActive = true, inst.mudJumpTakeoff = false)
  justLanded && (hero.mudJumpActive = false)
  if (!(inst.dialogPostSettle > 0) && !(inst.dialogInputGrace > 0)) {
    char.gravityScale = hero.mudJumpActive ? MUD_GRAVITY_MULT : 1
  }
}
//
// Trampoline pad sync + cap snap — must run every frame (including during
// letter captions) so the invisible cap moves off once the hero walks away.
//
function syncGlowHeroTrampolinePads(inst, char, heroX, footY) {
  isRightTrampolineColliderActive(inst.zones) &&
    snapHeroToOneTrampolineCap(inst, char, heroX, footY, inst.trampState)
  isBranchTrampolineColliderActive(inst.zones) &&
    snapHeroToOneTrampolineCap(inst, char, heroX, footY, inst.branchTrampState)
  pinHeroToMainFloorOverTrampoline(inst, char, inst.trampState)
  pinHeroToMainFloorOverTrampoline(inst, char, inst.branchTrampState)
  syncTrampolinePad(inst)
}
//
// Hero movement helpers while a letter caption is up — world stays frozen.
//
function updateGlowDialogHero(inst) {
  const k = inst.k
  const hero = inst.heroInst
  const char = hero?.character
  if (!char?.pos) return
  hero.controllable = true
  hero.controlsDisabled = false
  hero.jumpDisabled = false
  hero.suppressDust = true
  inst.trampState.cooldown > 0 && (inst.trampState.cooldown = Math.max(0, inst.trampState.cooldown - k.dt()))
  inst.branchTrampState?.cooldown > 0 &&
    (inst.branchTrampState.cooldown = Math.max(0, inst.branchTrampState.cooldown - k.dt()))
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  const grounded = char.isGrounded?.() ?? false
  const justLanded = grounded && !inst.wasGrounded
  inst.wasGrounded = grounded
  syncGlowHeroTrampolinePads(inst, char, heroX, footY)
  snapHeroToLogPlatforms(inst, char)
  snapHeroToStartBranch(inst, char, heroX, footY)
  snapHeroToMainGround(inst, char, grounded, heroX, footY)
  applyGlowHeroMudPhysics(inst, hero, char, heroX, grounded, justLanded)
  !inst.touchDeathHandled && checkGlowTouchDeath(inst, heroX, footY)
  inst.lastHeroX = heroX
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
    updateGlowLetterPopFades(inst, k.dt())
    updateGlowCamera(inst)
    return
  }
  inst.predator && !inst.predator.obj?.hidden && Predator.update(inst.predator, k.dt())
  inst.swampSpirit && SwampSpirit.update(inst.swampSpirit, k.dt())
  syncSwampSpiritProximityHint(inst, glowTooltipClampInset())
  if (inst.dialogOpen) {
    updateGlowCamera(inst)
    updateGlowDialogHero(inst)
    return
  }
  if (inst.touchDeathHandled) {
    inst.footParticles && GlowFootParticles.onUpdate(inst.footParticles, k.dt())
    inst.fpsCounter && FpsCounter.onUpdate(inst.fpsCounter)
    return
  }
  inst.fpsCounter && FpsCounter.onUpdate(inst.fpsCounter)
  if (inst.heroSpawnFade > 0 && inst.heroInst?.character) {
    inst.heroSpawnFade -= k.dt()
    const u = 1 - Math.max(0, inst.heroSpawnFade) / HERO_SPAWN_FADE_DURATION
    inst.heroInst.character.opacity = Math.min(1, u)
    if (inst.heroSpawnFade <= 0) {
      inst.heroInst.character.opacity = 1
      inst.worldHiddenForSpawnFade && (inst.worldHiddenForSpawnFade = false, applyZoneVisibility(inst))
    }
    refreshGlowBranchJumpState(inst, inst.heroInst.character)
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
  const parallaxStable = isGlowFullParallaxStable(inst)
  if (!parallaxStable && (fadingWorldVisuals || twoToneWorld || colorTransition)) {
    updateMushroomTints(inst)
    updateDecorOutlines(inst)
    syncGlowMidgeDrawColor(inst)
  }
  syncGlowPickupLetterVisuals(inst)
  //
  // Cheap self-correcting check (early-exits on no change) so the tree's
  // roots-visible-from-G gray sprite always reflects current zone state even
  // if some specific event path forgets to call applyZoneVisibility.
  //
  if (!parallaxStable || inst.treeGraySpriteName !== glowMonolithTreeGraySpriteName(inst.zones)) {
    inst.treeDrawMonolith ? syncMonolithicTreeGraySprite(inst) : syncTreeSegmentGraySprites(inst)
  }
  const meditating = inst.meditation?.countdown != null
  if (meditating || inst._mushroomLeanActive) {
    updateMushroomWhistleLean(inst)
    inst._mushroomLeanActive = meditating ||
      inst.mushObjs.some(obj => !obj.hidden && Math.abs(obj.leanAngle ?? 0) > 0.2)
  }
  maybeSyncGlowLifeHudGrey(inst)
  const z = inst.zones
  const postLCountdown = z.lCollected && !z.oZone && !z.oCollected && inst.meditation?.countdown != null
  const blockAutoColorFade = z.lCollected && !z.oZone && !z.oCollected && !postLCountdown
  const meditationDrivingFade = postLCountdown && !z.colorWorld && !z.oCollected
  if (!meditationDrivingFade && !blockAutoColorFade && inst.colorFade < inst.colorFadeTarget) {
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
  updateTreeRevealFade(inst, k.dt())
  updateExploreFades(inst, k.dt())
  updateGlowLetterPopFades(inst, k.dt())
  updatePlatformRevealFade(inst.lPlat, k.dt())
  updatePlatformRevealFade(inst.oPlat, k.dt())
  updatePlatformRevealFade(inst.wPlat, k.dt())
  updateEarTreeRevealFade(inst, k.dt())
  syncGlowHeroBodyFill(inst)
  updatePlayfieldBorderColors(inst)
  syncGlowPitLevelIndicator(inst)
  //
  // A letter caption freezes the world; only the final post-W lock blocks
  // control outside of that.
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
  if (!(inst.dialogInputGrace > 0) &&
    !(inst.dialogPostSettle > 0) &&
    !inst.heroLockedAfterW) {
    hero.controllable = true
    hero.controlsDisabled = false
    hero.jumpDisabled = false
  }
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  isGlowChainBuoyLayerVisible(inst) &&
    ChainBuoy.onUpdate(inst.chainBuoys, heroX, char.pos.y, k.dt())
  inst.chainBuoys && (inst.chainBuoys.pupilZones = inst.zones)
  ChainEyeTramp.syncChainEyeTrampPads(inst)
  inst.zones.lCollected && inst.earTrees && EarTree.onUpdate(inst.earTrees, heroX, char.pos.y, k.dt())
  updateGlowEarTreeWhisperSound(inst, char)
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
  //
  // G letter pickup on branch — caption starts on touch (suffix builds in place).
  //
  if (isGLetterCollectable(inst)) {
    const dx = heroX - inst.gLetter.x
    const dy = char.pos.y - inst.gLetter.y
    Math.hypot(dx, dy) < GLOW_LETTER_PICKUP_RADIUS && queueGlowLetterPickup(inst, 'g', grounded)
  }
  grounded && ChainEyeTramp.maybeRevealLPlatOnLeftChainEyeTouch(inst, heroX, footY)
  tryUnveilLLetterAfterTramp(inst, heroX, footY, grounded, justLanded)
  !inst.letterCaptionActive && tryCollectGlowLetters(inst, char, grounded, justLanded)
  maybeRevealGlowUndergroundAfterG(inst, grounded)
  refreshGlowBranchJumpState(inst, char)
  refreshGlowMainGroundJumpState(inst, char, grounded, footY)
  syncGlowBranchJumpReady(inst, char, grounded)
  onUpdateGlowEyeIntro(inst, char, hero, FLOOR_Y, WORLD_W, TREE_X, grounded, justLanded, footY)
  isGlowEyeIntroPending(inst.zones) && syncGlowHudLetterFills(inst, false)
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
  updateTrampolineWalk(inst)
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
  rightRevealFrame && syncGlowHudLetterFills(inst, false)
  branchRevealFrame && syncGlowHudLetterFills(inst, false)
  //
  // Pad / snap / bounce only after the mushroom sprite is shown.
  //
  syncGlowHeroTrampolinePads(inst, char, heroX, footY)
  const groundedAfterPad = char.isGrounded?.() ?? false
  const onRightTrampCap = isOnTrampolineCap(inst, char, inst.trampState)
  const onBranchTrampCap = isOnTrampolineCap(inst, char, inst.branchTrampState)
  inst.wasGrounded = groundedAfterPad
  if (rightRevealFrame || branchRevealFrame) {
    //
    // Cap landing on the reveal frame bounces above — settle would cancel vel.y
    // and clear branchTrampBounceAir, leaving the hero frozen on the mushroom.
    //
    const landedOnRevealedCap =
      (rightRevealFrame && wantsTrampolineCapLaunch(inst, char, onRightTrampCap, inst.trampState)) ||
      (branchRevealFrame && wantsTrampolineCapLaunch(inst, char, onBranchTrampCap, inst.branchTrampState))
    !landedOnRevealedCap &&
      settleHeroAfterTrampReveal(inst, char, heroX, footY, rightRevealFrame, branchRevealFrame)
  }
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
  //
  // Never override opacity while the body-fill crossfade is running — it
  // deliberately holds the hollow layer below 1 so the filled preview can
  // show through. Stomping it back to 1 here doubled-exposed both layers
  // at once, which read as a stray light-coloured contour beside the body.
  //
  if (typeof char.opacity === 'number' && char.opacity < 1 && inst.heroSpawnFade <= 0 &&
    !inst.heroFillPreview?.exists?.() && !inst.heroBodyFillApplied) {
    char.opacity = 1
  }
  inst.heroBodyFillApplied && char.opacity < 1 && (char.opacity = 1)
  !(inst.dialogInputGrace > 0) && !(inst.dialogPostSettle > 0) &&
    snapHeroToLogPlatforms(inst, char)
  snapHeroToStartBranch(inst, char, heroX, footY)
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
  //
  // L unveil + pickup after log snaps — isGrounded and feet Y match the
  // platform collider so the letter can be taken the same frame it appears.
  //
  const snapGrounded = char.isGrounded?.() ?? false
  tryUnveilLLetterAfterTramp(inst, snapHeroX, snapFootY, snapGrounded, landingFootBurst)
  !inst.letterCaptionActive &&
    tryCollectGlowLetters(inst, char, snapGrounded, landingFootBurst || justLanded)
  maybeMarkLPlatStepped(inst, char, grounded)
  maybeMarkMudPredatorJumpedOver(inst, char, grounded)
  //
  // O-letter meditation: perfect stillness after L summons the countdown.
  //
  updateOMeditation(inst, char, heroMoving, grounded)
  updateMeditationWorldLife(inst)
  syncGlowBirdsAfterL(inst)
  syncGlowWorldBirdsVolume(inst)
  inst.zones.lCollected && !inst.zones.oCollected && syncGlowHudOFill(inst)
  inst.zones.oCollected && !inst.zones.wCollected && syncGlowHudWFill(inst)
  updateMeditationCounter(inst)
  updateGlowHudLetterFillCounter(inst)
  syncGlowPredatorVisibility(inst)
  updateTrampCheekyHint(inst)
  updateBranchTrampCheekyHint(inst)
  updateBranchTrampMarioHint(inst)
  syncGlowPitCaveFlagForTeacherHints(inst)
  updateGlowTeacherContextHints(inst, char, hero, heroMoving, k.dt())
  updateTreeRevealArm(inst, char, grounded)
  tryRevealTreeOnBranchLand(inst, char, grounded, justLanded)
  maybeApplyPendingHeroFillOnLand(inst, grounded, justLanded)
  maybeBootstrapGlowPostEyes(inst)
  updateGlowMidges(inst.midges, k.dt(), 1)
  inst.branchTrampPitGuardTimer > 0 &&
    (inst.branchTrampPitGuardTimer = Math.max(0, inst.branchTrampPitGuardTimer - k.dt()))
  updateGlowPit(inst.pit, char, grounded, justLanded, null, {
    jumpLanding: justLanded && hero.wasJumping,
    footY,
    footParticles: inst.footParticles,
    skipCrackCollapse: inst.branchTrampPitGuardTimer > 0
  })
  updateGlowCaveFloorEyeReveal(inst, char)
  refreshGlowPitFloorJumpState(inst, char, grounded, footY)
  inst.footParticles && GlowFootParticles.onUpdate(inst.footParticles, k.dt())
  syncGlowAtmosphereZones(inst)
  //
  // Platform zone reveals — detect descending hero over trigger volumes.
  //
  checkPlatformRevealOnDescent(inst, char, grounded, justLanded)
  checkGroundDecorReveal(inst, heroX, footY, grounded, justLanded)
  updateTrampMissingPlaceHints(inst, heroX, footY, grounded)
  //
  // Lake drowning — after ground snap so the hero stands on the floor first.
  //
  syncTrampBounceAirForLakeFloor(inst, heroX, footY)
  !inst.deathHandled && !inst.drowning &&
    shouldDrownInWater(inst, heroX, footY) && startDrowning(inst)
  updateHeroGazeAtG(inst)
  //
  // Camera tracks the hero after all movement (drowning may have started above).
  //
  updatePitCaveSkeletonAutoHint(inst, char, k.dt())
  updateOLetterStuckHint(inst, k.dt())
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
// Locks the hero's gaze on the G letter while he stands on the start branch
// and the letter is still uncollected; releases the eyes to their normal
// wander everywhere else.
//
function updateHeroGazeAtG(inst) {
  if (!inst.zones.eyesCollected) return
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
// Advances the O-letter meditation: after L, standing still arms a short delay
// then starts the heartbeat countdown near the hero's head (eyes closed).
// Movement cancels the countdown; the next stop uses the same delay again.
// When the countdown reaches zero the O platform and letter appear.
//
function updateOMeditation(inst, char, heroMoving, grounded) {
  const m = inst.meditation
  const z = inst.zones
  //
  // The mechanic runs only between the L pickup and the O zone reveal.
  //
  if (!z.lCollected || z.oZone || m.stillnessCompleted || inst.dialogOpen ||
    inst.letterCaptionActive) {
    cancelMeditation(inst, false)
    return
  }
  const still = grounded && !heroMoving && Math.abs(char.vel?.y ?? 0) < 1
  if (!still) {
    cancelMeditation(inst, true)
    return
  }
  if (!m.lFillRingPlayed) {
    m.idleTimer = 0
    updateMeditationBirds(inst)
    return
  }
  if (m.countdown == null) {
    m.idleTimer += inst.k.dt()
    if (m.idleTimer < m.requiredIdle) {
      updateMeditationBirds(inst)
      return
    }
    m.idleTimer = 0
    m.countdown = MEDITATION_COUNTDOWN
    //
    // Just clears the bubble on screen — does NOT permanently max out
    // _postLStopHintShows the way dismissGlowPostLStopTeacherHint does.
    // Starting the countdown doesn't guarantee it finishes (movement can
    // still cancel it below), and permanently maxing the counter here used
    // to silently disable this hint for the rest of the session on every
    // cancelled attempt, even though the meditation itself never completed.
    //
    dismissGlowTeacherHintByText(inst, GLOW_TEACHER_HINT_AFTER_L)
    Hero.setEyesClosed(inst.heroInst, true)
    applyGlowPostLStillnessReveal(inst)
    syncMeditationColorFade(inst)
    startBirdsMusic(inst.birdsMusic)
    updateMeditationBirds(inst)
    return
  }
  syncMeditationColorFade(inst)
  m.countdown -= inst.k.dt()
  updateMeditationBirds(inst)
  if (m.countdown <= 0) {
    m.countdown = null
    m.stillnessCompleted = true
    Hero.setEyesClosed(inst.heroInst, false)
    //
    // Hold birds at full volume into the O reveal; letter-caption duck handles dips.
    //
    setGlowBirdsLoopVolume(inst.birdsMusic, CFG.audio.backgroundMusic.birds)
    inst.meditationBirdsActive = false
    revealOZone(inst)
  }
}
//
// Stops a running countdown (opening the hero's eyes) and resets the idle timer.
//
function cancelMeditation(inst, interrupted) {
  const m = inst.meditation
  if (m.countdown != null) {
    m.countdown = null
    Hero.setEyesClosed(inst.heroInst, false)
    resetMeditationColorPreview(inst)
  }
  m.idleTimer = 0
  m.requiredIdle = MEDITATION_IDLE_BASE
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
  if (shouldGlowBlockWorldReveal(inst)) return
  if (!inst.pendingTreeReveal || !char?.pos) return
  const onBranch = isHeroOnStartBranch(inst, char)
  if (onBranch && grounded) inst.hasStoodOnStartBranch = true
  inst.hasStoodOnStartBranch && !onBranch && (inst.treeBranchLeftOnce = true)
}
//
// Tree fades in on the first landing on the big-tree branch after leaving it.
//
function tryRevealTreeOnBranchLand(inst, char, grounded, justLanded) {
  if (shouldGlowBlockWorldReveal(inst)) return
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
// True when the hero's feet stand on a revealed letter log.
//
function isHeroOnLetterLog(inst, char) {
  if (!char?.pos) return false
  const heroX = char.pos.x
  const footY = char.pos.y + SURFACE_DETECT_Y
  const z = inst.zones
  const homes = []
  z.lPlatRevealed && homes.push(inst.lPlatHome)
  z.oZone && z.lCollected && homes.push(inst.oPlatHome)
  isGlowWZoneActive(inst) && z.oCollected && homes.push(inst.wPlatHome)
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
  if (shouldGlowSuppressFootDetails(inst)) return false
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
// Clears the active teacher-hint bubble on the eye HUD outright, regardless
// of which line is showing — a letter popping into view should always
// retire whatever nudge was on screen for it.
//
function dismissGlowTeacherHintForLetterAppear(inst) {
  inst.lastGlowTeacherHintText = null
  if (!HeroHint.isActive(inst.heroHint) || !inst._glowTeacherHintActive) return
  HeroHint.clear(inst.heroHint)
  inst._glowTeacherHintActive = false
}
//
// Clears the post-L "stop and think" teacher line once O is opening or visible.
//
function dismissGlowPostLStopTeacherHint(inst) {
  inst._postLStopHintShows = GLOW_TEACHER_HINT_POST_L_STOP_MAX_SHOWS
  dismissGlowTeacherHintByText(inst, GLOW_TEACHER_HINT_AFTER_L)
}
//
// Stops the post-O big-mushroom teacher line once the hero bounces there.
//
function dismissGlowPostOBigMushTeacherHint(inst) {
  inst._postOBigMushHintShows = GLOW_TEACHER_HINT_POST_O_MAX_SHOWS
  dismissGlowTeacherHintByText(inst, GLOW_TEACHER_HINT_AFTER_O)
}
//
// Retires the L-platform nudge the moment L is actually collected.
//
function dismissGlowLPlatTeacherHint(inst) {
  inst._lHudStallHintShows = GLOW_TEACHER_HINT_L_STALL_MAX_SHOWS
  dismissGlowTeacherHintByText(inst, GLOW_TEACHER_HINT_L_PLAT_TEXT)
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
// Cheeky cap lines only before O or after the post-O walk quest finishes.
//
function shouldGlowRightTrampShowCheekyHints(inst) {
  const z = inst.zones
  if (!z?.oCollected) return true
  const tw = inst.trampWalk
  return Boolean(tw?.walked)
}
//
// Tears down the rotating cheeky bubble on the right trampoline cap.
//
function clearGlowRightTrampCheekyHint(inst) {
  const tw = inst.trampWalk
  if (!tw) return
  tw.cheekyTimer = 0
  tw.cheekyTooltip && Tooltip.destroy(tw.cheekyTooltip)
  tw.cheekyTooltip = null
}
//
// Counts one post-O bounce on the right cap; walks left at 5 and 10.
//
function tryGlowRightTrampBounceQuest(inst) {
  const tw = inst.trampWalk
  const z = inst.zones
  if (!tw || !z.oCollected || tw.walked || tw.walking) return
  if (inst.dialogOpen || inst.letterCaptionActive) return
  if (tw.singAllowedAt != null && inst.k.time() < tw.singAllowedAt) return
  if ((tw.singCount || 0) >= TRAMP_WALK_BOUNCES_TOTAL) return
  tw.singCount = (tw.singCount || 0) + 1
  dismissGlowPostOBigMushTeacherHint(inst)
  persistTrampWalk(inst)
  syncGlowHudWFill(inst)
  if (tw.singCount === TRAMP_WALK_BOUNCES_MID_STOP) {
    clearGlowRightTrampCheekyHint(inst)
    showTrampBadSingHint(inst, TRAMP_MUSH_BOUNCE_HINT_MID)
    tw.walkTargetX = trampWalkStopX(inst, tw.singCount)
    tw.walking = true
    inst.trampState.hasLegs = true
    inst.trampState.walkDir = -1
    return
  }
  if (tw.singCount >= TRAMP_WALK_BOUNCES_TOTAL) {
    clearGlowRightTrampCheekyHint(inst)
    showTrampBadSingHint(inst, TRAMP_MUSH_BOUNCE_HINT_FINAL)
    tw.walkTargetX = trampWalkStopX(inst, tw.singCount)
    tw.walking = true
    inst.trampState.hasLegs = true
    inst.trampState.walkDir = -1
    revealWZone(inst)
  }
}
//
// Mushroom walk after bounce milestones — always runs to completion.
//
function updateTrampolineWalk(inst) {
  const tw = inst.trampWalk
  const z = inst.zones
  if (!tw || !z.oCollected || tw.walked || !tw.walking) return
  const dt = inst.k.dt()
  inst.trampState.hasLegs = true
  inst.trampState.walkDir = -1
  inst.trampState.walkPhase = (inst.trampState.walkPhase || 0) + dt * 9
  inst.trampState.x -= TRAMP_WALK_SPEED * dt
  const targetX = tw.walkTargetX ?? tw.dockX
  if (inst.trampState.x > targetX) return
  inst.trampState.x = targetX
  tw.walking = false
  if (tw.singCount >= TRAMP_WALK_BOUNCES_TOTAL) {
    tw.walked = true
    inst.trampState.walkDir = -1
    persistTrampWalk(inst)
    startTrampWaterHints(inst)
    return
  }
  inst.trampState.hasLegs = false
  inst.trampState.walkDir = 0
  persistTrampWalk(inst)
}
//
// Legacy endure squash (idle sing removed — keep cap state neutral).
//
function updateTrampEndure(inst) {
  const state = inst.trampState
  if (!state) return
  state.enduring = false
  state.endureShakeX = 0
  state.endureScaleY = 1
}
//
// Wading loop while the walking mushroom is inside the lake.
//
function updateTrampWaterSteps(inst) {
  const tw = inst.trampWalk
  const state = inst.trampState
  const dockMarch = (tw?.singCount || 0) >= TRAMP_WALK_BOUNCES_TOTAL
  const inWater = Boolean(
    tw?.walking &&
    dockMarch &&
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
  markGlowHudLTrampJumped(inst)
  inst.lChainFromRightTramp = true
  ChainEyeTramp.refreshChainEyeTrampActiveFlags(inst)
  const holdingLeft = isAnyKeyDown(inst.k, CFG.controls.moveLeft) ||
    TouchControls.isMoveLeftHeld()
  holdingLeft && (inst.trampToLApproach = true)
  tryGlowRightTrampBounceQuest(inst)
  const tw = inst.trampWalk
  if (!tw) return
  tw.bounceCount = (tw.bounceCount || 0) + 1
  if (!shouldGlowRightTrampShowCheekyHints(inst)) return
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
    isBranchTrampDrawnVisible(inst)
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
// True when tree segment sprites were baked during the pre-level transition.
//
function glowTreeSpritesPrewarmed(k, monolith, segmentIds) {
  //
  // Also checks the roots-visible variant — a k instance that baked trees
  // before that sprite existed (still live from an earlier visit this
  // session, e.g. menu <-> glow without a full reload) would otherwise read
  // as "already prewarmed" from the older TREE_FLAT_SPRITE_NAME alone and
  // skip baking forever, silently keeping the roots invisible.
  //
  if (monolith) {
    return Boolean(k.getSprite(TREE_FLAT_SPRITE_NAME)) && Boolean(k.getSprite(TREE_FLAT_ROOTS_SPRITE_NAME))
  }
  const firstId = segmentIds[0]
  if (!firstId) return false
  const rootsId = segmentIds.find(id => TreeSegments.isGlowTreeRootsSegmentId(id)) ?? firstId
  return Boolean(k.getSprite(TreeSegments.segmentGraySpriteName(firstId, false))) &&
    Boolean(k.getSprite(TreeSegments.segmentGraySpriteName(rootsId, false, true)))
}
//
// True when parallax static layer exists from prewarm.
//
function glowParallaxSpritesPrewarmed(k) {
  return Boolean(k.getSprite(BG_STATIC_GRAY) && k.getSprite(BG_PAR_TREE1_GRAY))
}
//
// True when the three full-world underground sprites are already on this k.
//
function glowUndergroundSpritesReady(k) {
  return undergroundPaletteEntries().every(entry => k.getSprite(entry.name))
}
//
// Bakes full-tree sprites (fast draw path — two objects instead of many
// segments). Like the segment bake, all three palettes paint identical
// geometry, so one measured bounding box crops every variant and the
// flat/lit/colour swaps stay pixel-aligned. The crop offset is stashed for
// the tree objects to draw at (see monolithicTreeBakeOffset).
//
function bakeMonolithicGlowTreeSprites(k, treeData) {
  const flatCanvas = renderGlowTreeToCanvas(treeData, getTreePaletteFlatDecor(), WORLD_W, WORLD_H)
  const bounds = measureCanvasContentBounds(flatCanvas, TREE_CROP_PAD)
  monolithicTreeOffsets.set(k, { x: bounds?.x ?? 0, y: bounds?.y ?? 0 })
  loadCroppedGlowTreeSprite(k, TREE_FLAT_SPRITE_NAME, flatCanvas, bounds, 6000)
  const foliageCorner = MAIN_TREE_PARALLAX_FOLIAGE_CORNER
  loadCroppedGlowTreeSprite(k, TREE_LIT_SPRITE_NAME,
    renderGlowTreeToCanvas(treeData, getTreePaletteLit(), WORLD_W, WORLD_H), bounds, 6001)
  loadCroppedGlowTreeSprite(k, TREE_COLOR_SPRITE_NAME,
    renderGlowTreeToCanvas(treeData, getTreePaletteColorForCorner(foliageCorner), WORLD_W, WORLD_H), bounds, 6002)
  loadCroppedGlowTreeSprite(k, TREE_FLAT_ROOTS_SPRITE_NAME,
    renderGlowTreeToCanvas(treeData, getTreePaletteFlatDecorRootsVisible(), WORLD_W, WORLD_H), bounds, 6003)
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
// Picks the monolith gray tree sprite for the current zone state: full lit
// palette after L, roots-visible-only flat tone from G (see
// getTreePaletteFlatDecorRootsVisible), plain flat before that.
//
function glowMonolithTreeGraySpriteName(zones) {
  if (zones.lCollected) return TREE_LIT_SPRITE_NAME
  if (zones.gCollected) return TREE_FLAT_ROOTS_SPRITE_NAME
  return TREE_FLAT_SPRITE_NAME
}
//
// Swaps the monolithic gray tree sprite after G (roots) / L (full lit).
//
function syncMonolithicTreeGraySprite(inst) {
  const graySpriteName = glowMonolithTreeGraySpriteName(inst.zones)
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
  const f = fade ?? glowTreeColorFade(inst)
  //
  // A fully transparent monolith is still a full-screen textured draw.
  // Hide the side that has faded out so the settled colour world pays for
  // one tree blit, not two.
  //
  if (f >= 0.98) {
    tree.hidden = true
    tree.opacity = 0
    treeColor.hidden = false
    treeColor.opacity = 1
    return
  }
  if (f < 0.02) {
    tree.hidden = false
    treeColor.hidden = true
    tree.opacity = 1
    treeColor.opacity = 0
    return
  }
  const white = glowTreeCrossfadeWhite(inst)
  tree.hidden = false
  treeColor.hidden = false
  tree.opacity = 1 - f
  treeColor.opacity = f
  tree.color = white
  treeColor.color = white
}
function glowTreeCrossfadeWhite(inst) {
  inst._treeCrossfadeWhite ??= inst.k.rgb(255, 255, 255)
  return inst._treeCrossfadeWhite
}
//
// Crossfades revealed tree segments between gray and colour palettes.
//
function syncTreeSegmentsColorCrossfade(inst, fade) {
  const f = fade ?? glowTreeColorFade(inst)
  const rootFade = glowTreeRootRevealFade(inst)
  inst.treeSegmentIds?.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    if (!entry?.revealed || entry.fadeActive) return
    TreeSegments.restoreSegmentHomePos(entry)
    entry.grayObj.hidden = false
    entry.colorObj.hidden = false
    const partMul = TreeSegments.isGlowTreeRootsSegmentId(id) ? rootFade : 1
    const grayOp = (1 - f) * partMul
    const colorOp = f * partMul
    entry.grayObj.hidden = grayOp < 0.02
    entry.colorObj.hidden = colorOp < 0.02
    entry.grayObj.opacity = grayOp
    entry.colorObj.opacity = colorOp
  })
}
//
// Applies gray→colour tree crossfade for monolith or segmented draw paths.
//
function syncTreeColorCrossfade(inst) {
  const fade = glowTreeColorFade(inst)
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
  const fade = glowTreeColorFade(inst)
  let anyPending = false
  ids.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    if (!entry?.fadeActive) return
    anyPending = true
    entry.fade = Math.min(1, entry.fade + dt / TREE_REVEAL_FADE_DURATION)
    entry.grayObj.hidden = false
    entry.colorObj.hidden = false
    const partMul = TreeSegments.isGlowTreeRootsSegmentId(id) ? glowTreeRootRevealFade(inst) : 1
    entry.grayObj.opacity = (1 - fade) * entry.fade * partMul
    entry.colorObj.opacity = fade * entry.fade * partMul
    TreeSegments.restoreSegmentHomePos(entry)
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
// True when every baked segment has been revealed.
//
function isAllTreeSegmentsRevealed(inst) {
  const ids = inst.treeSegmentIds
  if (!ids?.length) return Boolean(inst.zones.tree)
  return ids
    .filter(id => !TreeSegments.isGlowTreeRootsSegmentId(id))
    .every(id => inst.treeSegmentRevealed?.has(id))
}
//
// Soft right-ground opacity: opened land is solid, the unknown fades out.
//
function glowRightWorldOpacity(sc, x, rank) {
  if (!sc?.zones) return 0
  if (!sc.zones.gCollected) return 0
  const lakeX1 = sc.zones._lakeX1
  const lakeX2 = sc.zones._lakeX2
  if (sc.zones.water && lakeX1 != null && lakeX2 != null && x >= lakeX1 - 48 && x <= lakeX2 + 120) {
    return 1
  }
  if (!sc.zones.lCollected) return isGlowWorldXInGroundPeekZone(sc, x) ? 1 : 0
  if (sc.zones.lCollected && !sc.zones.oZone && !sc.zones.oCollected &&
    glowPostLRevealFade(sc) <= 0.04) {
    return 0
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
  let op = glowRightWorldOpacity(inst, x, obj._detailRank === 'small' ? 'small' : 'large')
  op *= glowSurfaceDecorFadeAt(inst, x)
  return op
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
    inst.grassLayer.layer.hidden = !isGlowGrassLayerVisible(inst)
    inst.mudExtraGrass && (inst.mudExtraGrass.layer.hidden = !isGlowMudExtraGrassVisible(inst))
  }
  if (!exploreSettled && !z.groundDecorRight) {
    inst.rockObjs?.forEach(o => {
      if (o._rightOfMud && z.gCollected) {
        const op = glowRightDecorOpacity(inst, o)
        setDecorObjVisible(o, op > 0.04, op)
        return
      }
      if (o._mudZoneWalk || o._rightOfMud || o._side !== 'right' || o._lakeShoreEnd) return
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
      const wx = o._decorWorldX ?? o._homeX ?? 0
      const decorOp = glowSurfaceDecorFadeAt(inst, wx)
      const show = (o._waterCluster ? z.water : true) && decorOp > 0.04
      setDecorObjVisible(o, show, decorOp * inst.leftDecorFade)
    })
    inst.mushObjs?.forEach(o => {
      if (o._side !== 'left') return
      const wx = o._decorWorldX ?? o._homeX ?? 0
      const inLake = z._lakeX1 != null && z._lakeX2 != null && wx >= z._lakeX1 && wx <= z._lakeX2
      const decorOp = glowSurfaceDecorFadeAt(inst, wx)
      setDecorObjVisible(o, !inLake && decorOp > 0.04, decorOp * inst.leftDecorFade)
    })
  }
  !colorSettled && updateAtmosphereMotes(inst, dt)
}
//
// Opens ground strips to the right of the tree based on hero X.
//
function updateGroundRightStripReveal(inst, heroX) {
  if (!isGlowEyesGameplayUnlocked(inst.zones)) return
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
// Right trampoline collider — visible mushroom plus second landing (or colour world).
//
function isRightTrampolineColliderActive(z) {
  if (!isRightTrampolineVisible(z)) return false
  if (z?.colorWorld) return true
  return Boolean(z?.rightTrampBounceLive)
}
//
// Branch trampoline collider — only after the mushroom is revealed (or colour world).
//
function isBranchTrampolineColliderActive(z) {
  if (!isBranchTrampolineVisible(z)) return false
  if (z?.colorWorld) return true
  return Boolean(z?.branchTrampBounceLive)
}
//
// Right trampoline mushroom is visible only after a nearby landing (or colour world).
//
function isRightTrampolineVisible(z) {
  return Boolean(z?.colorWorld || (z?.eyesCollected && z?.rightTrampRevealed))
}
//
// Branch trampoline mushroom uses the same landing gate (or colour world).
//
function isBranchTrampolineVisible(z) {
  return Boolean(z?.eyesCollected && (z?.branchTrampRevealed || z?.colorWorld))
}
//
// True when the branch trampoline sprite is actually on screen (revealed and
// not hidden by the eyeless intro or zone visibility pass).
//
function isBranchTrampDrawnVisible(inst) {
  return isGlowEyesGameplayUnlocked(inst.zones) &&
    isBranchTrampolineVisible(inst.zones) &&
    !inst.branchTrampBundle?.drawLayer?.hidden
}
//
// Right trampoline sprite is on screen (post-landing reveal or colour world).
//
function isRightTrampDrawnVisible(inst) {
  return isRightTrampolineVisible(inst.zones) &&
    !inst.trampBundle?.drawLayer?.hidden
}
//
// True when the hero stands in the landing-reveal radius of a hidden trampoline.
//
function isHeroNearUnrevealedTrampSpot(inst, heroX) {
  const z = inst.zones
  if (z.colorWorld) return false
  const near = (x) => Math.abs(heroX - x) <= TRAMP_MUSH_LAND_REVEAL_DIST
  if (z.gCollected && !z.rightTrampRevealed && near(inst.trampState?.x ?? -9999)) return true
  if (!z.branchTrampRevealed && isGlowEyesGameplayUnlocked(z) && near(inst.branchTrampState?.x ?? -9999)) return true
  return false
}
//
// Shows a fixed "missing mushroom" tooltip at each unrevealed trampoline pad.
//
function updateTrampMissingPlaceHints(inst, heroX, footY, grounded) {
  inst.trampMissingHints = inst.trampMissingHints ?? { right: null, branch: null, cave: null }
  syncOneTrampMissingHint(inst, 'right', inst.trampState?.x ?? -9999, false)
  //
  // Branch pad — no "missing" bubble; the swamp spirit marks the G-route spot.
  //
  syncOneTrampMissingHint(inst, 'branch', inst.branchTrampState?.x ?? -9999, false)
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
}
//
// Reveals trampoline mushrooms when the hero first touches their landing zone.
//
function maybeRevealTrampolineMushroomOnLand(inst, heroX, footY, grounded, justLanded) {
  const z = inst.zones
  if (!grounded) return
  //
  // Opening beat from the start branch — let the real ground landing crouch
  // finish before mushroom reveal / pad logic runs on the same frame.
  //
  if (inst.spawnedOnBranch && (inst.branchLookPhase || inst.heroSpawnFade > 0)) return
  const near = (x) => Math.abs(heroX - x) <= TRAMP_MUSH_LAND_REVEAL_DIST
  const nearRight = Boolean(
    isGlowEyesGameplayUnlocked(z) && z.gCollected && near(inst.trampState?.x ?? -9999)
  )
  const nearBranch = isGlowEyesGameplayUnlocked(z) && near(inst.branchTrampState?.x ?? -9999)
  const nearAnyTramp = nearRight || nearBranch
  if (!justLanded && !inst._finishBranchSpawnTrampReveal) return
  if (inst.spawnedOnBranch && nearAnyTramp && glowHeroInTrampLandingPose(inst.heroInst)) {
    inst._finishBranchSpawnTrampReveal = true
    return
  }
  if (inst._finishBranchSpawnTrampReveal) {
    if (glowHeroInTrampLandingPose(inst.heroInst)) return
    inst._finishBranchSpawnTrampReveal = false
  }
  if (!z.rightTrampRevealed && nearRight) {
    revealRightTrampoline(inst)
    z.rightTrampBounceLive = true
    set(KEY_RIGHT_TRAMP_BOUNCE_LIVE, true)
    return
  }
  //
  // The reveal branch above always returns before reaching here on the
  // reveal frame itself (rightTrampRevealed only just became true), so this
  // only ever runs on a later, genuinely separate justLanded event — the
  // first real landing after the reveal. Arming bounceLive right here, still
  // inside this frame's main onUpdate and before the late bounce pass runs,
  // is what lets that same landing actually bounce.
  //
  if (z.rightTrampRevealed && !z.rightTrampBounceLive && nearRight) {
    z.rightTrampBounceLive = true
    set(KEY_RIGHT_TRAMP_BOUNCE_LIVE, true)
    ChainEyeTramp.refreshChainEyeTrampActiveFlags(inst)
  }
  if (!z.branchTrampRevealed && nearBranch) {
    revealBranchTrampoline(inst)
    z.branchTrampBounceLive = true
    set(KEY_BRANCH_TRAMP_BOUNCE_LIVE, true)
    return
  }
  if (z.branchTrampRevealed && !z.branchTrampBounceLive && nearBranch) {
    z.branchTrampBounceLive = true
    set(KEY_BRANCH_TRAMP_BOUNCE_LIVE, true)
  }
}
//
// Persists the right trampoline mushroom reveal.
//
//
// After reload/death: restore L HUD band, hero 1/2 counter, and L letter if on the log.
//
function restoreGlowRightTrampProgressAfterSpawn(inst) {
  ensureGlowRightTrampHudProgress(inst)
  syncGlowHudLetterFills(inst, false)
  const char = inst.heroInst?.character
  if (!char?.pos) {
    updateGlowHudLetterFillCounter(inst)
    return
  }
  const footY = char.pos.y + SURFACE_DETECT_Y
  tryUnveilLLetterAfterTramp(inst, char.pos.x, footY, true, false)
  if (inst.zones.lLetterUnveiled && inst.lLetter && !inst.zones.lCollected) {
    setLetterVisible(inst.lLetter, true, inst.letterAppearFxReady)
    inst.lLetter._popFade = null
    inst.lLetter.allObjects?.forEach(obj => { obj.opacity = 1 })
  }
  applyZoneVisibility(inst)
  updateGlowHudLetterFillCounter(inst)
}
function ensureGlowRightTrampHudProgress(inst) {
  if (inst.zones.rightTrampRevealed) return
  if (!isGlowEyesGameplayUnlocked(inst.zones)) return
  if (!isRightTrampolineVisible(inst.zones)) return
  inst.zones.rightTrampRevealed = true
  set(KEY_RIGHT_TRAMP_REVEALED, true)
  ChainEyeTramp.refreshChainEyeTrampActiveFlags(inst)
  syncGlowHudLetterFills(inst)
}
function revealRightTrampoline(inst) {
  if (!isGlowEyesGameplayUnlocked(inst.zones)) return
  if (inst.zones.rightTrampRevealed) return
  if (!inst.zones.gCollected && !inst.zones.colorWorld) return
  inst.zones.rightTrampRevealed = true
  set(KEY_RIGHT_TRAMP_REVEALED, true)
  ChainEyeTramp.refreshChainEyeTrampActiveFlags(inst)
  inst._postGCucumberHintShows = GLOW_TEACHER_HINT_POST_G_CUCUMBER_MAX_SHOWS
  if (inst._glowTeacherHintActive && inst.lastGlowTeacherHintText === GLOW_TEACHER_HINT_POST_G_CUCUMBER) {
    HeroHint.clear(inst.heroHint)
    inst._glowTeacherHintActive = false
  }
  clearTrampMissingHint(inst, 'right')
  Sound.stopAmbient(inst.sound)
  triggerGlowCameraShake(inst)
  applyZoneVisibility(inst)
  syncGlowHudLetterFills(inst)
  showTrampolineRevealHint(inst)
}
//
// Branch-jump segments revealed so far (roots excluded).
//
function countGlowBranchTreePartsRevealed(inst) {
  let n = 0
  inst.treeSegmentRevealed?.forEach(id => {
    !TreeSegments.isGlowTreeRootsSegmentId(id) && n++
  })
  return n
}
//
// Registers the root segment after L without a branch landing reveal.
//
function ensureGlowTreeRootsSegment(inst) {
  if (!inst.zones.lCollected && !inst.zones.gCollected) return
  const id = TreeSegments.TREE_SEGMENT_ROOTS
  if (inst.treeSegmentRevealed.has(id)) {
    syncTreeColorCrossfade(inst)
    return
  }
  inst.treeSegmentRevealed.add(id)
  const entry = inst.treeSegmentEntries?.[id]
  entry && setTreeSegmentRevealedVisual(entry, 0)
  persistTreeSegmentsRevealed(inst)
  syncTreeColorCrossfade(inst)
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
  //
  // Colour sprites stay hidden until syncTreeSegmentsColorCrossfade() runs —
  // showing both layers at full opacity on a gray-phase load flashes green.
  //
  entry.colorObj.hidden = true
  entry.grayObj.opacity = opacity
  entry.colorObj.opacity = 0
  TreeSegments.restoreSegmentHomePos(entry)
}
//
// Gray tree segments switch to the warm lit palette after L.
//
function syncTreeSegmentGraySprites(inst) {
  const lit = Boolean(inst.zones.lCollected)
  const rootsVisible = !lit && Boolean(inst.zones.gCollected)
  const want = `${lit}:${rootsVisible}`
  if (inst.treeSegmentGrayVariant === want) return
  inst.treeSegmentGrayVariant = want
  inst.treeSegmentIds?.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    if (!entry) return
    const name = TreeSegments.segmentGraySpriteName(id, lit, rootsVisible && TreeSegments.isGlowTreeRootsSegmentId(id))
    entry.grayObj.use(inst.k.sprite(name))
  })
}
//
// Hides unrevealed segments; revealed ones respect colour-world cross-fade.
//
function syncTreeSegmentsVisibility(inst) {
  const fade = glowTreeColorFade(inst)
  inst.treeSegmentIds?.forEach(id => {
    const entry = inst.treeSegmentEntries?.[id]
    if (!entry) return
    if (!entry.revealed) {
      entry.grayObj.hidden = true
      entry.colorObj.hidden = true
      entry.grayObj.opacity = 0
      entry.colorObj.opacity = 0
      TreeSegments.parkSegmentOffscreen(entry)
      return
    }
    TreeSegments.restoreSegmentHomePos(entry)
    //
    // A segment mid reveal-fade owns its own opacity via updateTreeRevealFade
    // (entry.fade ramping 0->1) — forcing it to 1 here every time this runs
    // (applyZoneVisibility fires from many unrelated events) snapped it fully
    // visible immediately, then the very next fade tick pulled it back down
    // toward 0 and back up again: the segment visibly flashed on, off, on.
    //
    if (entry.fadeActive) return
    if (fade < 0.02) {
      entry.grayObj.hidden = false
      entry.colorObj.hidden = true
      entry.grayObj.opacity = 1
      entry.colorObj.opacity = 0
      return
    }
  })
  syncTreeSegmentsColorCrossfade(inst, fade)
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
  if (isHeroWalkingPastTrampOnMainFloor(inst, char, footY)) return false
  if ((char.isGrounded?.() ?? false) && isHeroFeetOnMainFloorLane(footY)) return false
  if (state === inst.trampState && inst.trampWalk?.walking &&
    footY >= FLOOR_Y - LOG_SNAP_STANDING_MAX) return false
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
  const branchPad = state === inst.branchTrampState
  const colliderActive = branchPad
    ? isBranchTrampolineColliderActive(inst.zones)
    : isRightTrampolineColliderActive(inst.zones)
  if (!colliderActive) return
  if (glowHeroInTrampLandingPose(inst.heroInst)) return
  if (isHeroWalkingPastTrampOnMainFloor(inst, char, footY)) return
  if (isHeroFeetOnMainFloorLane(footY)) return
  if (Math.abs(heroX - state.x) >= TRAMP_CAP_HALF) return
  const velY = char.vel?.y ?? 0
  if (velY < 0) return
  const capTop = FLOOR_Y - TRAMP_TOTAL_H
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
  const sunkPastCap = footY > capTop + TRAMP_SNAP_BELOW && footY < TRAMP_MAIN_LANE_FEET_MIN
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
  const footY = char.pos.y + SURFACE_DETECT_Y
  const sunkThroughFloor = footY > FLOOR_Y + LOG_SNAP_STANDING_MAX
  if (!sunkThroughFloor) return
  char.pos.y = FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED
  char.vel && (char.vel.y = 0)
}
//
// Drops the invisible cap off-screen when bounce physics are not armed yet.
//
function resetTrampolineCapPadState(inst, state, bounceAirKey, pad) {
  if (!state) return
  state._capPadLatch = 0
  inst[bounceAirKey] = false
  pad && parkTrampolinePad(inst.heroInst?.character, pad)
}
//
// Catches tunneling through the thin start-branch collider before lake-floor snap.
//
// The catch band (LOG_HOVER_BAND above .. BRANCH_SNAP_BELOW below platTop) is
// intentionally wide so a single fast physics tick can't slip through the
// branch's thin collider. That width is also wide enough to still contain the
// hero right after settleHeroOnLog pins him there — so without the "armed"
// latch below, this refired every single frame for as long as the hero
// stayed in that X/Y band. Confirmed live: a branch-trampoline bounce with
// sideways drift toward the tree arcs straight through this band (this is a
// column of open air the hero is only ever passing through mid-flight, not
// actually landing in), got caught mid-arc, and settleHeroOnLog re-pinned
// him to the exact same Y every frame after — footY landed back inside the
// same band each time (isGrounded() never resolved true at the branch's
// ragged edge, so the grounded-only early exit above never released him) —
// a permanent freeze, hero motionless and unresponsive to jump. The latch
// makes the catch fire once per approach: it disarms on a successful catch
// and only re-arms once the hero is genuinely outside the band again (or
// truly grounded), so a hero who doesn't actually come to rest there falls
// on through under normal gravity instead of being re-pinned forever.
//
function snapHeroToStartBranch(inst, char, heroX, footY) {
  if (!inst.startBranch || inst.drowning ||
    inst.dialogInputGrace > 0 || inst.dialogPostSettle > 0) return
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
  if (inst.drowning || inst.dialogInputGrace > 0 || inst.dialogPostSettle > 0) return
  const crack = getCrackZone(WORLD_W, FLOOR_Y)
  //
  // Never snap over the crack mouth — the hero must fall through into the pit.
  //
  const floorEndX = getGlowCaveMouthFloorLeftX(crack)
  if (heroX < LEFT_MARGIN + 8 || heroX >= floorEndX - 16) return
  if (isHeroOverOpenCaveMouth(inst, heroX)) return
  if (isHeroOverLetterLog(inst, heroX)) return
  if (isHeroStandingOnTrampolineCap(inst, heroX, footY, inst.trampState)) return
  if (isHeroStandingOnTrampolineCap(inst, heroX, footY, inst.branchTrampState)) return
  const velY = char.vel?.y ?? 0
  if (velY < 0) return
  //
  // Standing on the floor — Kaplay owns the pose; never re-pin (caused bounce loops).
  //
  if (footY <= FLOOR_Y + LOG_SNAP_STANDING_MAX) return
  //
  // Feet under the floor line, including a shallow sink beside a mushroom.
  //
  if (footY <= FLOOR_Y + 64) {
    moveGlowHeroTo(char, char.pos.x, FLOOR_Y - SURFACE_DETECT_Y + LOG_SNAP_EMBED)
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
  isGlowWZoneActive(inst) && z.oCollected && homes.push(inst.wPlatHome)
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
  if (hero?.isSquashing && !inst.dialogOpen && !skipPostLandLock) return
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
  if (z.gCollected && z.lCollected && z.oCollected && z.oZone && !z.wZone &&
    isGlowWZoneUnlocked(inst) && inPlatTrigger(heroX, y, inst.wTrigger)) {
    revealWZone(inst)
    //
    // Embed 1 px into the fresh platform and let Kaplay resolve the contact —
    // the regular physics path grounds the hero and plays the normal landing.
    //
    char.pos.y = inst.wPlatHome.y + LOG_COLLISION_DROP_Y - SURFACE_DETECT_Y + WOOD_LOG_SNAP_EMBED
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
  if (shouldGlowSuppressFootDetails(sceneInst)) return
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
// True when the hero's feet are in the spike kill band (not a valid L reveal).
//
function isHeroStandingOnGlowRightSpikes(inst, heroX, footY) {
  const spikes = inst.rightSpikes
  if (!spikes || !inst.zones.lPlatRevealed) return false
  const withinX = heroX >= spikes.x1 - LOG_SNAP_X_SLACK && heroX <= spikes.x2 + LOG_SNAP_X_SLACK
  const withinY = footY >= spikes.y - RIGHT_SPIKE_H && footY <= spikes.y + LOG_SNAP_BELOW
  return withinX && withinY
}
//
// First landing on the L log (with the L log) unveils the letter —
// any route counts (tramp arc, spike platform hop, reload revisit).
//
function tryUnveilLLetterAfterTramp(inst, heroX, footY, grounded, justLanded) {
  if (!inst.zones.gCollected || inst.zones.lLetterUnveiled || !inst.zones.lPlatRevealed) return
  if (!grounded) return
  if (isHeroStandingOnGlowRightSpikes(inst, heroX, footY)) return
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
  if (inst.lLetter && !inst.zones.lCollected) {
    setLetterVisible(inst.lLetter, true, inst.letterAppearFxReady)
    inst.lLetter._popFade = null
    inst.lLetter.allObjects?.forEach(obj => { obj.opacity = 1 })
  }
  playSegmentRevealSound(inst)
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
}
//
// One HUD step for clearing the mud predator: hero was grounded on one side
// of its anchor, then crosses to the other side while airborne.
//
function maybeMarkMudPredatorJumpedOver(inst, char, grounded) {
  const pred = inst.predator
  if (!pred || !char?.pos || inst.zones.mudPredatorJumpedOver) return
  const heroX = char.pos.x
  const anchorX = pred.x
  const side = heroX < anchorX ? -1 : 1
  heroX < anchorX - MUD_PREDATOR_JUMP_PASS_MARGIN && (inst._mudPredatorWasWest = true)
  if (!inst.zones.gCollected) return
  if (inst._mudPredatorWasWest && heroX > anchorX + MUD_PREDATOR_JUMP_PASS_MARGIN) {
    finishMudPredatorJumpedOver(inst)
    return
  }
  if (grounded) {
    const prevSide = inst._mudPredatorGroundSide
    inst._mudPredatorGroundSide = side
    prevSide && prevSide !== side && finishMudPredatorJumpedOver(inst)
  } else {
    const groundSide = inst._mudPredatorGroundSide
    const prevX = inst.lastHeroX
    const crossed = prevX != null &&
      ((prevX < anchorX && heroX >= anchorX) || (prevX > anchorX && heroX <= anchorX))
    const nearAnchor = Math.abs(heroX - anchorX) <= MUD_PREDATOR_JUMP_CLEARANCE_X
    const jumpedOver = Boolean(groundSide && side !== groundSide) ||
      (crossed && nearAnchor)
    jumpedOver && finishMudPredatorJumpedOver(inst)
  }
}
//
// Credits a jump-over taken in the air right when G is collected mid-flight.
//
function reconcileMudPredatorJumpCredit(inst) {
  if (inst.zones.mudPredatorJumpedOver || !inst.zones.gCollected) return
  const pred = inst.predator
  const char = inst.heroInst?.character
  if (!pred || !char?.pos) return
  const heroX = char.pos.x
  const anchorX = pred.x
  const prevX = inst.lastHeroX
  if (inst._mudPredatorWasWest && heroX > anchorX + MUD_PREDATOR_JUMP_PASS_MARGIN) {
    finishMudPredatorJumpedOver(inst)
    return
  }
  if (prevX != null &&
    prevX < anchorX - MUD_PREDATOR_JUMP_PASS_MARGIN &&
    heroX > anchorX + MUD_PREDATOR_JUMP_PASS_MARGIN) {
    finishMudPredatorJumpedOver(inst)
  }
}
//
// Persists the mud-predator jump-over for the L HUD loader.
//
function finishMudPredatorJumpedOver(inst) {
  if (inst.deathHandled || inst.touchDeathHandled) return
  markMudPredatorJumpedOver(inst)
}
//
// Shows the mud predator once G unlocks eyes gameplay.
//
function syncGlowPredatorVisibility(inst) {
  const pred = inst.predator
  pred?.obj &&
    (pred.obj.hidden = !(inst.zones.gCollected && isGlowEyesGameplayUnlocked(inst.zones)))
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
// Persists a right-trampoline bounce (legacy flag; not counted toward L x/5).
//
function markGlowHudLTrampJumped(inst) {
  if (get(KEY_HUD_L_TRAMP_JUMPED, false)) return
  set(KEY_HUD_L_TRAMP_JUMPED, true)
  syncGlowHudLetterFills(inst)
}
//
// Persists the left-mud predator jump-over so the HUD L counter stays at 1/5+
// after leaving.
//
function markMudPredatorJumpedOver(inst) {
  if (inst.zones.mudPredatorJumpedOver) return
  inst.zones.mudPredatorJumpedOver = true
  set(KEY_MUD_PREDATOR_JUMPED_OVER, true)
  syncGlowHudLetterFills(inst)
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
  if (!char?.pos || inst.dialogOpen || inst.meditation?.countdown != null) return
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
  const footY = ch.pos.y + SURFACE_DETECT_Y
  !inst.pitCaveHeroForeground &&
    isHeroInsideGlowPitCave(inst, ch.pos.x, ch.pos.y, footY) &&
    (targetZ = CFG.visual.zIndex.player + 24)
  ch.z !== targetZ && (ch.z = targetZ)
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
    GlowCamera.setCamPosForPixelAlignedSubjectX(
      k, ch.pos.x, fromX + (toX - fromX) * eased, cam.fixedCamY
    )
    GlowCamera.snapHeroScreenY(k, inst.heroInst, k.camPos().y)
    if (t >= 1) {
      peek.phase = 'hold'
      peek.elapsed = 0
    }
    return true
  }
  if (peek.phase === 'hold') {
    GlowCamera.setCamPosForPixelAlignedSubjectX(k, ch.pos.x, clampCamX(peek.targetX), cam.fixedCamY)
    GlowCamera.snapHeroScreenY(k, inst.heroInst, k.camPos().y)
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
  GlowCamera.setCamPosForPixelAlignedSubjectX(
    k, ch.pos.x, fromX + (toX - fromX) * eased, cam.fixedCamY
  )
  GlowCamera.snapHeroScreenY(k, inst.heroInst, k.camPos().y)
  if (t >= 1) {
    inst.cameraLetterPeek = null
    GlowCamera.followHero(cam, ch.pos.x, ch.pos.y)
    return false
  }
  return true
}
//
// Pit cave mushroom: teleport to the big-tree branch and bounce from there.
//
const PIT_MUSH_LAUNCH_COOLDOWN = 0.55
function launchHeroFromPitMushroomToBranch(inst, char) {
  const branch = inst.startBranch
  const hero = inst.heroInst
  if (!branch || !char?.pos || !hero) return false
  dismissPitCaveMushroomHint(inst.pit)
  dismissGlowCaveMushroomTeacherHint(inst)
  markGlowHudGPitMushLaunch()
  syncGlowHudLetterFills(inst, true)
  const teleportX = branch.x1 + Math.round((branch.x2 - branch.x1) * HERO_BRANCH_FRACTION)
  const teleportY = branch.y - SURFACE_DETECT_Y + WOOD_LOG_SNAP_EMBED
  moveGlowHeroTo(char, teleportX, teleportY)
  const launch = Math.round(CFG.game.jumpForce * BRANCH_TRAMP_BOOST_MULT)
  if (typeof char.jump === 'function') char.jump(launch)
  else char.vel.y = -launch
  char.vel.x = 0
  inst.branchTrampBounceAir = true
  hero.wasJumping = true
  hero.jumpPhase = 'jumping'
  hero.jumpCeilingBonk = false
  hero.postLandAirLock = 0
  hero.canJump = false
  inst._pitMushroomBranchLaunchLatch = true
  inst.wasOnStartBranch = true
  inst.treeRevealFromBranchTramp = true
  inst.expectBranchWoodLandSound = true
  inst.pit.trampState.cooldown = PIT_MUSH_LAUNCH_COOLDOWN
  inst.pit.trampState.squash = 1
  inst.sound && !inst.sound._glowSfxMuted && Sound.playJumpSound(inst.sound)
  unlockGlowEyesGameplayFromBranchLaunch(inst)
  inst.pit && ensureGlowPitOpenForEyesCollected(inst.pit)
  applyZoneVisibility(inst)
  syncGlowAtmosphereZones(inst)
  maybeBootstrapGlowPostEyes(inst)
  return true
}
function dismissPitCaveMushroomHint(pit) {
  if (!pit) return
  pit.pitCaveMushroomDone = true
  pit.pitCaveMushroomMoveAccum = 0
  pit.pitCaveMushroomHintShows = 2
  pit.pitCaveMushroomHintPausedUntilExit = true
}
//
// Shared 10 s teacher gate: G-zone progress outside the cave, mushroom nudge inside.
//
function updateGlowTeacherContextHints(inst, char, hero, heroMoving, dt) {
  const blocked =
    inst.drowning || inst.dialogOpen || inst.introLock ||
    inst.pendingGlowIntro || inst.heroSpawnFade > 0
  if (blocked || !char?.pos) return
  const footY = char.pos.y + SURFACE_DETECT_Y
  const inCave = isHeroInsideGlowPitCave(inst, char.pos.x, char.pos.y, footY)
  const pit = inst.pit
  const heroActive = isGlowHeroActiveForTeacherHint(inst, hero, char, heroMoving)
  const caveEligible = glowTeacherCaveMushroomAutoHintEligible(inst, char, footY, inCave)
  const gEligible = glowTeacherGZoneAutoHintEligible(inst, inCave)
  const lEligible = glowTeacherLZoneAutoHintEligible(inst, inCave)
  const postGCucumberEligible = glowTeacherPostGCucumberHintEligible(inst, inCave)
  const postLStopEligible = glowTeacherPostLStopHintEligible(inst, inCave)
  const postOBigMushEligible = glowTeacherPostOBigMushHintEligible(inst, inCave)
  const caveEntranceEligible = glowTeacherCaveEntranceAutoHintEligible(inst, inCave)
  const postTreeMushEligible = glowTeacherPostTreeMushAutoHintEligible(inst, inCave)
  if (caveEligible || gEligible || lEligible || postGCucumberEligible || postLStopEligible ||
    postOBigMushEligible || caveEntranceEligible || postTreeMushEligible) {
    revealGlowTeacherHudForExplorationHintsIfNeeded(inst)
  }
  tickGlowTeacherContextHints(inst, {
    dt,
    blocked,
    heroMoving,
    heroActive,
    inCave,
    caveEligible,
    gEligible,
    lEligible,
    postGCucumberEligible,
    postLStopEligible,
    postOBigMushEligible,
    caveEntranceEligible,
    postTreeMushEligible,
    onCaveHint: () => fireGlowTeacherCaveMushroomHint(inst),
    onGHint: () => fireGlowTeacherGZoneHint(inst),
    onLHint: () => fireGlowTeacherLZoneHint(inst),
    onPostGCucumberHint: () => fireGlowTeacherPostGCucumberHint(inst),
    onPostLStopHint: () => fireGlowTeacherPostLStopHint(inst),
    onPostOBigMushHint: () => fireGlowTeacherPostOBigMushHint(inst),
    onCaveEntranceHint: () => fireGlowTeacherCaveEntranceHint(inst),
    onPostTreeMushHint: () => fireGlowTeacherPostTreeMushHint(inst)
  })
}
//
// True while the eyeless intro cave-mouth nudge may auto-fire — from level
// start until the hero actually jumps through the cracks. 'runRight' is the
// whole pre-approach phase; 'awaitJump' starts the moment heroX comes within
// EYE_INTRO_CAVE_APPROACH_X of the crack zone (enterGlowEyeIntroCaveApproach
// in glow-eye-intro.js), well before the hero visually finds the entrance —
// excluding it here used to silently retire this hint for the rest of the
// playthrough as soon as the hero explored anywhere near the right side of
// the level, regardless of whether he'd actually found the cave, which read
// as "hint never shows when running right". Both phases count as "hasn't
// entered the cave yet"; pit.collapsed above already ends eligibility the
// moment he actually jumps in.
//
function glowTeacherCaveEntranceAutoHintEligible(inst, inCave) {
  if (inCave || inst._inGlowPitCave) return false
  if (inst.pit?.collapsed) return false
  if (!isGlowEyeIntroPending(inst.zones)) return false
  const phase = inst.eyeIntro?.phase
  if (phase !== 'runRight' && phase !== 'awaitJump') return false
  if (inst.letterCaptionActive || inst.dialogOpen) return false
  return (inst._caveEntranceHintShows || 0) < GLOW_TEACHER_HINT_CAVE_ENTRANCE_MAX_SHOWS
}
//
// Shows the cave-mouth teacher line (max two per intro, 10 s active movement each).
//
function fireGlowTeacherCaveEntranceHint(inst) {
  if (!glowTeacherCaveEntranceAutoHintEligible(inst, false)) return
  if (!showGlowTeacherHintNow(
    inst,
    GLOW_TEACHER_HINT_CAVE_ENTRANCE_TEXT,
    GLOW_TEACHER_HINT_DURATION,
    { caveEntrance: true }
  )) return
  inst._caveEntranceHintShows = (inst._caveEntranceHintShows || 0) + 1
  inst.lastGlowTeacherHintText = GLOW_TEACHER_HINT_CAVE_ENTRANCE_TEXT
}
//
// Alias for teacher-hint eligibility — only the three tree landings remain.
//
function glowTeacherBigTreeBranchOnlyStall(inst) {
  return glowTeacherOnlyBigTreeGZonesRemain(inst)
}
//
// Every G map slice is open except the three big-tree branch landings.
//
function glowTeacherOnlyBigTreeGZonesRemain(inst) {
  const z = inst.zones
  if (!z || z.gCollected) return false
  if (z.tree || inst.treeDrawMonolith) return false
  if (!isGlowEyesGameplayUnlocked(z)) return false
  if (countGlowBranchTreePartsRevealed(inst) > 0) return false
  if (countGlowHudGCaveIntroParts() < 2) return false
  if (!z.waterDiscovered) return false
  if ((z.groundRightStripMax ?? -1) < 0) return false
  if (!z.branchTrampRevealed) return false
  return true
}
//
// G HUD stall should nudge the hidden big tree, not a generic zone line.
//
function glowTeacherGZoneShouldUseTreeNudge(inst) {
  return glowTeacherOnlyBigTreeGZonesRemain(inst)
}
//
// Picks a G HUD stall line from whatever map slice is still missing.
//
function glowTeacherGZoneStallHintText(inst) {
  if (glowTeacherGZoneShouldUseTreeNudge(inst)) {
    return GLOW_TEACHER_HINT_G_CLIMB_TREE_TEXT
  }
  const introParts = countGlowHudGCaveIntroParts()
  if (introParts < 1 && !get(KEY_HUD_G_CAVE_ENTERED, false)) {
    return GLOW_TEACHER_HINT_G_NEED_CAVE_TEXT
  }
  if (introParts < 2 && !get(KEY_HUD_G_PIT_MUSH_LAUNCH, false)) {
    return GLOW_TEACHER_HINT_G_NEED_PIT_MUSH_TEXT
  }
  const z = inst.zones
  const treeFull = z?.tree || inst.treeDrawMonolith
  if (!treeFull) {
    const treeParts = countGlowBranchTreePartsRevealed(inst)
    if (treeParts === 0 && !z?.waterDiscovered) {
      return GLOW_TEACHER_HINT_G_SWIM_TEXT
    }
    const lakeMushOpen = z?.waterDiscovered && z?.rightTrampRevealed
    if (treeParts === 0 && lakeMushOpen) {
      return GLOW_TEACHER_HINT_TREE_NEAR_MUSH_TEXT
    }
    if (treeParts < TreeSegments.TREE_REVEAL_PART_COUNT) {
      return GLOW_TEACHER_HINT_G_CLIMB_TREE_TEXT
    }
  }
  if (!z?.waterDiscovered) return GLOW_TEACHER_HINT_G_SWIM_TEXT
  if ((z?.groundRightStripMax ?? -1) < 0) return GLOW_TEACHER_HINT_G_RIGHT_STRIP_TEXT
  if (!z?.branchTrampRevealed) return GLOW_TEACHER_HINT_G_BRANCH_TRAMP_TEXT
  return GLOW_TEACHER_HINT_G_PART_TEXT
}
//
// True while lake + right mushroom are open but the big tree is still hidden.
//
function glowTeacherPostTreeMushAutoHintEligible(inst, inCave) {
  if (inCave || inst._inGlowPitCave) return false
  if (!isGlowEyesGameplayUnlocked(inst.zones)) return false
  if (inst.zones.gCollected) return false
  if (inst.zones.tree || inst.treeDrawMonolith) return false
  if (inst.letterCaptionActive || inst.dialogOpen) return false
  const bigTreeOnly = glowTeacherOnlyBigTreeGZonesRemain(inst)
  const lakeMushOpen =
    inst.zones.waterDiscovered && inst.zones.rightTrampRevealed
  if (!bigTreeOnly && !lakeMushOpen) return false
  if (bigTreeOnly) return true
  return (inst._postTreeMushHintShows || 0) < GLOW_TEACHER_HINT_TREE_NEAR_MUSH_MAX_SHOWS
}
//
// Nudges toward the hidden big tree after the lake and right mushroom open.
//
function fireGlowTeacherPostTreeMushHint(inst) {
  if (!glowTeacherPostTreeMushAutoHintEligible(inst, false)) return
  if (!showGlowTeacherHintNow(
    inst,
    GLOW_TEACHER_HINT_TREE_NEAR_MUSH_TEXT,
    GLOW_TEACHER_HINT_DURATION,
    { postTreeMush: true }
  )) return
  inst._postTreeMushHintShows = (inst._postTreeMushHintShows || 0) + 1
  inst.lastGlowTeacherHintText = GLOW_TEACHER_HINT_TREE_NEAR_MUSH_TEXT
}
//
// True while the pit-mushroom teacher line may auto-fire in the cave.
//
function glowTeacherCaveMushroomAutoHintEligible(inst, char, footY, inCave) {
  const pit = inst.pit
  if (!isGlowPitMushroomUnlocked(inst)) return false
  if (!pit?.collapsed || pit.pitCaveMushroomDone || !char?.pos) return false
  if (!inCave) return false
  if ((pit.pitCaveMushroomHintShows || 0) >= 2) {
    pit.pitCaveMushroomHintPausedUntilExit = true
    return false
  }
  return !pit.pitCaveMushroomHintPausedUntilExit
}
//
// True while the G-zone teacher line may auto-fire (outside cave, ≥1 HUD band).
//
function glowTeacherGZoneAutoHintEligible(inst, inCave) {
  if (inCave || inst._inGlowPitCave) return false
  if (!isGlowEyesGameplayUnlocked(inst.zones)) return false
  if (inst.zones.gCollected || isGlowGLetterUnveiled(inst)) return false
  const parts = countGlowHudGFillParts(inst)
  if (parts < 1 || parts >= GLOW_HUD_G_FILL_PARTS) return false
  if (inst._gHudStallWatchParts == null) {
    inst._gHudStallWatchParts = parts
    inst._gHudStallHintShows = 0
  }
  if (parts > inst._gHudStallWatchParts) {
    inst._gHudStallWatchParts = parts
    inst._gHudStallHintShows = 0
    inst.teacherContextAccum = 0
    inst.teacherIdleStreak = 0
  }
  return (inst._gHudStallHintShows || 0) < GLOW_TEACHER_HINT_G_STALL_MAX_SHOWS
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
// Shows the G-zone progress teacher line (max two per stall without a new band).
//
function fireGlowTeacherGZoneHint(inst) {
  if (!glowTeacherGZoneAutoHintEligible(inst, false)) return
  const text = glowTeacherGZoneStallHintText(inst)
  const treeNearMushLine = text === GLOW_TEACHER_HINT_TREE_NEAR_MUSH_TEXT
  const opts = treeNearMushLine ? { postTreeMush: true } : { gHudStall: true }
  if (!showGlowTeacherHintNow(inst, text, GLOW_TEACHER_HINT_DURATION, opts)) return
  treeNearMushLine
    ? (inst._postTreeMushHintShows = (inst._postTreeMushHintShows || 0) + 1)
    : (inst._gHudStallHintShows = (inst._gHudStallHintShows || 0) + 1)
  inst.lastGlowTeacherHintText = text
}
//
// True while the L-platform teacher line may auto-fire (1/2 HUD band, pre-log step).
//
function glowTeacherLZoneAutoHintEligible(inst, inCave) {
  if (inCave || inst._inGlowPitCave) return false
  if (!inst.zones.gCollected || inst.zones.lCollected) return false
  //
  // The hint references the L-log platform by name — showing it before the
  // platform itself is even revealed (e.g. right after only the mud band
  // jump-over step, the first of 5) reads as nonsense.
  //
  if (!inst.zones.lPlatRevealed) return false
  const parts = countGlowHudLFillParts(inst)
  if (parts < 1 || parts >= GLOW_HUD_L_FILL_PARTS) return false
  if (inst._lHudStallWatchParts == null) {
    inst._lHudStallWatchParts = parts
    inst._lHudStallHintShows = 0
  }
  if (parts > inst._lHudStallWatchParts) {
    inst._lHudStallWatchParts = parts
    inst._lHudStallHintShows = 0
    inst.teacherContextAccum = 0
    inst.teacherIdleStreak = 0
  }
  return (inst._lHudStallHintShows || 0) < GLOW_TEACHER_HINT_L_STALL_MAX_SHOWS
}
//
// Shows the L-platform teacher line (max two per stall without the log step).
//
function fireGlowTeacherLZoneHint(inst) {
  if (!glowTeacherLZoneAutoHintEligible(inst, false)) return
  if (!showGlowTeacherHintNow(
    inst,
    GLOW_TEACHER_HINT_L_PLAT_TEXT,
    GLOW_TEACHER_HINT_DURATION,
    { lHudStall: true }
  )) return
  inst._lHudStallHintShows = (inst._lHudStallHintShows || 0) + 1
  inst.lastGlowTeacherHintText = GLOW_TEACHER_HINT_L_PLAT_TEXT
}
//
// After G the swamp spirit is out on the right. 10 active seconds, then the
// life-eye nudge, twice — only while the right mushroom is still hidden.
//
function glowTeacherPostGCucumberHintEligible(inst, inCave) {
  if (inCave || inst._inGlowPitCave) return false
  if (!inst.zones.gCollected || inst.zones.lCollected) return false
  if (isRightTrampDrawnVisible(inst)) return false
  if (inst.letterCaptionActive || inst.dialogOpen) return false
  return (inst._postGCucumberHintShows || 0) < GLOW_TEACHER_HINT_POST_G_CUCUMBER_MAX_SHOWS
}
function fireGlowTeacherPostGCucumberHint(inst) {
  if (!glowTeacherPostGCucumberHintEligible(inst, false)) return
  if (!showGlowTeacherHintNow(
    inst,
    GLOW_TEACHER_HINT_POST_G_CUCUMBER,
    GLOW_TEACHER_HINT_DURATION,
    { postGCucumber: true }
  )) return
  inst._postGCucumberHintShows = (inst._postGCucumberHintShows || 0) + 1
  inst.lastGlowTeacherHintText = GLOW_TEACHER_HINT_POST_G_CUCUMBER
}
//
// After L: 10 active seconds outside the cave → nudge to slow down and stand still.
//
function glowTeacherPostLStopHintEligible(inst, inCave) {
  if (inCave || inst._inGlowPitCave) return false
  if (!inst.zones.lCollected || inst.zones.oCollected || inst.zones.oZone) return false
  if (inst.meditation?.countdown != null || inst.meditation?.stillnessCompleted) return false
  if (inst.letterCaptionActive || inst.dialogOpen) return false
  return (inst._postLStopHintShows || 0) < GLOW_TEACHER_HINT_POST_L_STOP_MAX_SHOWS
}
function fireGlowTeacherPostLStopHint(inst) {
  if (!glowTeacherPostLStopHintEligible(inst, false)) return
  if (!showGlowTeacherHintNow(
    inst,
    GLOW_TEACHER_HINT_AFTER_L,
    GLOW_TEACHER_HINT_DURATION,
    { postLStop: true }
  )) return
  inst._postLStopHintShows = (inst._postLStopHintShows || 0) + 1
  inst.lastGlowTeacherHintText = GLOW_TEACHER_HINT_AFTER_L
}
//
// After O: 10 active seconds outside the cave → nudge to speak to the big mushroom.
//
function glowTeacherPostOBigMushHintEligible(inst, inCave) {
  if (inCave || inst._inGlowPitCave) return false
  if (!inst.zones.oCollected || inst.zones.wCollected) return false
  const tw = inst.trampWalk
  if (tw?.walked || (tw?.singCount || 0) > 0 || tw?.countdown != null) return false
  if (inst.letterCaptionActive || inst.dialogOpen) return false
  return (inst._postOBigMushHintShows || 0) < GLOW_TEACHER_HINT_POST_O_MAX_SHOWS
}
function fireGlowTeacherPostOBigMushHint(inst) {
  if (!glowTeacherPostOBigMushHintEligible(inst, false)) return
  if (!showGlowTeacherHintNow(
    inst,
    GLOW_TEACHER_HINT_AFTER_O,
    GLOW_TEACHER_HINT_DURATION,
    { postOBigMush: true }
  )) return
  inst._postOBigMushHintShows = (inst._postOBigMushHintShows || 0) + 1
  inst.lastGlowTeacherHintText = GLOW_TEACHER_HINT_AFTER_O
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
  const pit = inst.pit
  if (!pit?.collapsed || glowHeroHasCollectedEyes(inst.zones, inst.heroInst)) return
  if (pit.pitCaveSkeletonAutoHintShown || pit.pitCaveSkeletonAutoHintTooltip || !char?.pos) return
  if (!isHeroOnPitCaveFloor(pit, char)) {
    pit.pitCaveSkeletonFloorHintTimer = 0
    return
  }
  pit.pitCaveSkeletonFloorHintTimer = (pit.pitCaveSkeletonFloorHintTimer || 0) + dt
  if (pit.pitCaveSkeletonFloorHintTimer < PIT_CAVE_SKELETON_AUTO_HINT_DELAY) return
  pit.pitCaveSkeletonAutoHintShown = true
  showPitCaveSkeletonAutoHint(inst)
}
//
// Forced skeleton bubble — hover stays off while this is visible.
//
function showPitCaveSkeletonAutoHint(inst) {
  const pit = inst.pit
  if (!pit || pit.pitCaveSkeletonAutoHintTooltip) return
  pit.pitCaveSkeletonAutoHintTooltip = createGlowTooltip({
    k: inst.k,
    forceVisible: true,
    targets: [{
      x: () => pitCaveSkeletonTooltipPos(inst).x,
      y: () => pitCaveSkeletonTooltipPos(inst).y,
      width: SKELETON_TOOLTIP_WIDTH,
      height: SKELETON_TOOLTIP_HEIGHT,
      text: SKELETON_TOOLTIP_NEED_EYES_TEXT,
      offsetY: SKELETON_TOOLTIP_Y_OFFSET,
      forceAbove: true
    }]
  })
  pit.pitCaveSkeletonAutoHintTooltip.activeTarget = pit.pitCaveSkeletonAutoHintTooltip.targets[0]
  pit.pitCaveSkeletonAutoHintTooltip.opacity = 1
  inst.k.wait(PIT_CAVE_SKELETON_AUTO_HINT_DURATION, () => {
    pit.pitCaveSkeletonAutoHintTooltip && Tooltip.destroy(pit.pitCaveSkeletonAutoHintTooltip)
    pit.pitCaveSkeletonAutoHintTooltip = null
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
}
//
// Playfield chrome inset so Glow tooltips pin to the game window, not the void.
//
function glowTooltipClampInset() {
  return {
    left: LEFT_MARGIN,
    right: RIGHT_MARGIN,
    //
    // HUD letters sit in the top void strip above PLAYFIELD_TOP_Y + TOP_MARGIN.
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
// Mid stop at five bounces; ten docks in the lake.
//
function trampWalkStopX(inst, bounceCount) {
  if (bounceCount >= TRAMP_WALK_BOUNCES_TOTAL) return inst.trampWalk.dockX
  const homeX = inst.trampState.homeX
  const landEndX = inst.lakeX2 + TRAMP_WALK_SHORE_PAD
  const landSpan = Math.max(1, homeX - landEndX)
  return homeX - (landSpan * bounceCount) / TRAMP_WALK_BOUNCES_TOTAL
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
