/**
 * Forest section — deterministic organic tree generator.
 * All randomness is seeded so the same seed always produces the same tree.
 * Change the seed constant exported below to get a different tree shape.
 *
 * The tree is rendered once to an HTMLCanvasElement via renderForestTreeToCanvas()
 * and loaded as a Kaplay sprite so that per-frame drawing cost is zero.
 */

import { growTreeRootSegments } from '../../../utils/grow-tree-root.js'
import { getTreeBarkPalette } from './forest-palette.js'
//
// Default seed — modify this value to reshape the entire tree.
//
export const TREE_SEED = 3712
//
// Root rendering tuning — taper zones near the ends of every root run.
//
const ROOT_BOTTOM_TAPER_ZONE = 38
const ROOT_GROUND_TAPER_ZONE = 42
//
// Right at the trunk base every root's drawn width is pulled toward the
// trunk's own local cross-section width (see rootSegWidth) instead of its
// thin natural stroke width, so the roots begin exactly as wide as the trunk
// with no separate connector shape — this merge fades out over this many px
// of depth, after which each strand only shows its own tapering width.
//
const ROOT_TRUNK_MERGE_DEPTH = 40
//
// Roots are hard-clipped this many px BELOW the ground line — no root stroke
// (taper aside) can ever poke above the ground surface.
//
const ROOT_CLIP_BELOW_GROUND = 2
//
// Root relief — the roots are drawn in three passes so they read as round
// wood instead of flat lines: a darker contour underdraw (silhouette rim),
// the base fill strokes, then a thin light streak along the upper-left of
// each segment (the lit side).
//
const ROOT_CONTOUR_EXTRA_W = 2.6
const ROOT_CONTOUR_DARKEN = 0.45
const ROOT_HIGHLIGHT_LIGHTEN = 0.32
const ROOT_HIGHLIGHT_ALPHA = 0.58
const ROOT_HIGHLIGHT_OFFSET_X = -1.6
const ROOT_HIGHLIGHT_OFFSET_Y = -1.6
const ROOT_HIGHLIGHT_MIN_W = 3
//
// Foliage — large asymmetric pixel-cloud masses (not circles or teardrop fields).
//
const FOLIAGE_CLUSTER_CELL_PX_DEFAULT = 10
const FOLIAGE_MASK_RGB = { r: 255, g: 255, b: 255 }
const FOLIAGE_CLUSTER_LEAF_SIZE_FRAC = 1.55
//
// Star leaves (palette.sprigLeaves, reference apple tree): every leaf unit
// is a small star of 5–7 round leaflets fanning out of one joint, flat
// colour, no outline — depth comes only from darker stars behind lighter
// ones and the gaps between the leaflets. Only a jittered subset of each
// cluster's cells become stars. Leaflet sizes are fractions of the star size.
//
const SPRIG_SIZE_FRAC = 2.4
const SPRIG_SIZE_JITTER = 0.2
const SPRIG_POS_JITTER = 0.45
const SPRIG_CELL_KEEP = 0.3
const SPRIG_BACK_CHANCE = 0.4
const SPRIG_FRONT_CHANCE = 0.2
const SPRIG_CLUSTER_HASH_X = 83492791
const SPRIG_CLUSTER_HASH_Y = 2654435761
const SPRIG_LEAFLETS_MIN = 5
const SPRIG_LEAFLETS_RANGE = 3
const SPRIG_LEAFLET_LEN = 0.5
const SPRIG_LEAFLET_WID = 0.28
const SPRIG_LEAFLET_LEN_JITTER = 0.2
const SPRIG_LEAFLET_ANGLE_JITTER = 0.2
const SPRIG_WOBBLE_ANGLE_FREQ = 7
const SPRIG_WOBBLE_STEP = 2.39
const SPRIG_LEN_ANGLE_FREQ = 5
const SPRIG_LEN_STEP = 1.7
const SPRIG_CORE_R = 0.07
const SPRIG_DROP_NECK = 0.75
const SPRIG_DETAIL_SIZE_SCALE = 1.6
const FOLIAGE_CLOUD_CELLS_MIN = 34
const FOLIAGE_CLOUD_CELLS_MAX = 54
const FOLIAGE_CLOUD_LOBE_CELLS_MIN = 12
const FOLIAGE_CLOUD_LOBE_CELLS_MAX = 22
const FOLIAGE_CLOUD_EDGE_ERODE_FRAC = 0.14
const FOLIAGE_CLOUD_GROWTH_SKIP = 0.1
const FOLIAGE_CLUSTER_DETAIL_CELL_FRAC = 0.07
const FOLIAGE_CLOUD_LOBE_CHANCE = 0.62
const FOLIAGE_DETAIL_LEAVES_MIN = 1
const FOLIAGE_DETAIL_LEAVES_MAX = 2
const FOLIAGE_DENSE_CLOUD_CELL_BONUS = 10
const FOLIAGE_DENSE_DETAIL_BONUS = 0
const FOLIAGE_LUSH_CLOUD_CELL_BONUS = 32
const FOLIAGE_LUSH_LOBE_CHANCE_BOOST = 0.35
const FOLIAGE_LUSH_EXTRA_LOBE_CHANCE = 0.55
const FOLIAGE_LUSH_CROWN_LEN_MIN = 34
const FOLIAGE_LUSH_CROWN_LEN_RANGE = 28
//
// Side shading — the sun sits top-right, so trunk and branches carry a soft
// dark band along their lower-left side. The band follows each segment (no
// straight screen-space gradient), so the wobbly silhouette keeps its shape.
//
const SHADE_LIGHT_DIR_X = 0.66
const SHADE_LIGHT_DIR_Y = -0.75
const SHADE_ALPHA = 0.16
const SHADE_WIDTH_FRAC = 0.4
const SHADE_MIN_SEG_W = 6
//
// Trunk bark texture — the sun sits top-RIGHT, so the trunk carries a dark
// shade band along its left edge and a soft highlight along its right edge.
// Wavy bark lines follow the trunk centreline at these half-width fractions.
//
const BARK_SHADOW_BAND_FRAC = 0.42
const BARK_SHADOW_ALPHA = 0.2
const BARK_HIGHLIGHT_BAND_FRAC = 0.3
const BARK_HIGHLIGHT_ALPHA = 0.16
const BARK_LINE_FRACS = [-0.74, -0.52, -0.3, -0.1, 0.12, 0.34, 0.55, 0.76]
const BARK_LINE_ALPHA_MIN = 0.1
const BARK_LINE_ALPHA_RANGE = 0.12
const BARK_LINE_JITTER = 3
const BARK_LINE_WIDTH_MIN = 1
const BARK_LINE_WIDTH_RANGE = 1.2
const BARK_NOTCH_COUNT = 32
const BARK_NOTCH_ALPHA = 0.16
const BARK_KNOT_COUNT = 7
const BARK_KNOT_ALPHA = 0.22
//
// Horizontal ridge bands — the reference foreground trees show the trunk
// segmented by sagging horizontal ridges. Each ridge is a dark wavy curve
// crossing the full trunk width with a thin highlight right below it, so the
// bark reads as stacked plates.
//
const BARK_RIDGE_COUNT = 26
const BARK_RIDGE_ALPHA = 0.26
const BARK_RIDGE_SAG_MIN = 2
const BARK_RIDGE_SAG_RANGE = 6
const BARK_RIDGE_WIDTH_MIN = 1.4
const BARK_RIDGE_WIDTH_RANGE = 1.4
const BARK_RIDGE_EDGE_FRAC = 0.94
const BARK_RIDGE_HIGHLIGHT_ALPHA = 0.14
const BARK_RIDGE_HIGHLIGHT_OFFSET = 2.4
//
// Vertical fissures — short near-vertical dark cuts between the ridge
// plates, so the bark splits into separate slabs like the reference trees.
//
const BARK_FISSURE_COUNT = 34
const BARK_FISSURE_ALPHA = 0.2
const BARK_FISSURE_LEN_MIN = 8
const BARK_FISSURE_LEN_RANGE = 28
//
// Vertical tonal streaks — long, soft dark/light bands following the trunk
// centreline whose alpha swells and fades smoothly along the run, so the
// bark tone drifts gradually in the vertical plane instead of jumping.
//
const BARK_STREAK_COUNT = 6
const BARK_STREAK_ALPHA_MAX = 0.11
const BARK_STREAK_WIDTH_FRAC_MIN = 0.22
const BARK_STREAK_WIDTH_FRAC_RANGE = 0.18
const BARK_STREAK_FRAC_SPAN = 0.6
//
// Deep vertical furrows — continuous dark grooves running down most of the
// trunk with a thin lit rim beside each one, splitting the bark into long
// vertical plates like the reference tree.
//
const BARK_FURROW_COUNT = 5
const BARK_FURROW_ALPHA = 0.3
const BARK_FURROW_WIDTH_MIN = 1.6
const BARK_FURROW_WIDTH_RANGE = 1.6
const BARK_FURROW_FRAC_SPAN = 0.7
const BARK_FURROW_JITTER = 2.2
const BARK_FURROW_HIGHLIGHT_ALPHA = 0.16
const BARK_FURROW_HIGHLIGHT_OFFSET = 1.8
//
// Some knots grow a spiral curl inside instead of the plain inner ring —
// the wood-grain swirl of the reference tree.
//
const BARK_CURL_KNOT_CHANCE = 0.4
const BARK_CURL_TURNS = 2.2
const BARK_CURL_POINTS = 26
//
// Branch bark — thick branches carry the same plate ridges as the trunk:
// short dark curves crossing the branch width with a soft highlight beside
// them. Only segments at least this wide get ridges (twigs stay clean).
//
const BRANCH_RIDGE_MIN_W = 8
const BRANCH_RIDGE_CHANCE = 0.55
const BRANCH_RIDGE_EDGE_FRAC = 0.8
const BRANCH_RIDGE_ALPHA = 0.24
const BRANCH_RIDGE_HIGHLIGHT_ALPHA = 0.12
//
// Outline width for the trunk/branch silhouette (palette.woodOutline tone).
// Implemented as an underdraw: the wood is painted first with widths grown by
// this many px per side, then the normal fills cover everything but the rim.
//
const WOOD_OUTLINE_PX = 2
//
// Wood volume (palette.woodVolume, gameplay trees only): sun from the left.
// Side bands are measured as a fraction of the full trunk width from their
// edge; the inner border wobbles so light and shade never meet on a ruler
// line. side 1 = shaded flank, -1 = sunlit flank. Shade bands are light
// washes (alpha < 1) so the shaded flank stays a warm mid brown; the deep
// band stacks on the shade band near the edge.
//
const TRUNK_VOLUME_BANDS = [
  { side: 1, frac: 0.34, tone: 'shade', alpha: 0.4, wobble: 0.08, phase: 0.7 },
  { side: 1, frac: 0.1, tone: 'deep', alpha: 0.3, wobble: 0.04, phase: 2.3 },
  { side: -1, frac: 0.34, tone: 'lit', alpha: 0.9, wobble: 0.08, phase: 4.1 },
  { side: -1, frac: 0.09, tone: 'rim', alpha: 1, wobble: 0.04, phase: 5.6 }
]
const TRUNK_VOLUME_EDGE_OVERSHOOT = 1.15
const TRUNK_VOLUME_SUBSTEPS = 4
const TRUNK_VOLUME_WAVE_FREQ = 0.45
const TRUNK_VOLUME_WAVE2_FREQ = 1.3
const TRUNK_VOLUME_WAVE2_AMP = 0.5
//
// Uneven bark daubs: short vertical strokes that cross the band borders —
// warm on the lit flank, deep brown on the shaded one, mixed in the middle.
//
const TRUNK_DAUB_COUNT = 16
const TRUNK_DAUB_SEED = 3313
const TRUNK_DAUB_SPAN = 0.9
const TRUNK_DAUB_MIN_HW = 6
const TRUNK_DAUB_FRAC_SPAN = 0.85
const TRUNK_DAUB_SIDE_FRAC = 0.3
const TRUNK_DAUB_LEN_MIN = 10
const TRUNK_DAUB_LEN_RANGE = 38
const TRUNK_DAUB_W_MIN = 1.5
const TRUNK_DAUB_W_RANGE = 2.8
const TRUNK_DAUB_BEND = 6
const TRUNK_DAUB_ALPHA_MIN = 0.2
const TRUNK_DAUB_ALPHA_RANGE = 0.25
//
// Crack net on gameplay trunks (reference apple tree): a few long thin dark
// cracks run along the trunk with gaps, short cross cracks join neighbours
// into big irregular plates, and a faint lit line hugs each crack on its
// sun side. Lengths are px along the trunk, fracs are of the half-width.
//
const BARK_CRACK_SEED = 7193
const BARK_CRACK_COLUMNS = 6
const BARK_CRACK_COL_JITTER = 0.45
const BARK_CRACK_MIN_HW = 6
const BARK_CRACK_W = 1.3
const BARK_CRACK_W_SCALE_MIN = 0.75
const BARK_CRACK_ALPHA = 0.55
const BARK_CRACK_RUN_MIN = 50
const BARK_CRACK_RUN_RANGE = 90
const BARK_CRACK_GAP_MIN = 6
const BARK_CRACK_GAP_RANGE = 18
const BARK_CRACK_WOBBLE = 0.08
const BARK_CRACK_WOBBLE_FREQ = 0.035
const BARK_CRACK_JITTER_PX = 0.9
const BARK_CRACK_LIT_W = 1
const BARK_CRACK_LIT_ALPHA = 0.3
const BARK_CRACK_LIT_OFFSET = 1.8
const BARK_CROSS_STEP_MIN = 18
const BARK_CROSS_STEP_RANGE = 40
const BARK_CROSS_CHANCE = 0.6
const BARK_CROSS_REACH_MIN = 0.55
const BARK_CROSS_SLANT_PX = 7
const BARK_CROSS_SAG_MIN = 1
const BARK_CROSS_SAG_RANGE = 2.5
//
// Branch collars: where a limb leaves the trunk the wood flares out and
// tapers into the limb instead of meeting the trunk as a straight tube.
//
const BRANCH_COLLAR_MIN_W = 5
const BRANCH_COLLAR_BASE_FRAC = 0.6
const BRANCH_COLLAR_FLARE = 1.9
const BRANCH_COLLAR_LEN_FRAC = 1.2
//
// Branch bulges: width swells and pinches along a limb on a position-based
// wave (shared joints get the same factor, so no steps). Draw-only — the
// limb centrelines and walk surfaces stay where they are.
//
const BRANCH_BULGE_MIN_W = 3
const BRANCH_BULGE_AMP = 0.16
const BRANCH_BULGE_FREQ_X = 0.09
const BRANCH_BULGE_FREQ_Y = 0.07
const BRANCH_BULGE2_FREQ_X = 0.051
const BRANCH_BULGE2_FREQ_Y = 0.113
const BRANCH_BULGE_MIX = 0.6
//
// Sparse knots on thick limbs: a dark eye with a lit lip toward the sun.
//
const BRANCH_KNOT_MIN_W = 10
const BRANCH_KNOT_CHANCE = 0.05
const BRANCH_KNOT_SEED = 4421
const BRANCH_KNOT_RX_FRAC = 0.24
const BRANCH_KNOT_RY_FRAC = 0.15
const BRANCH_KNOT_LIP_SHIFT = 0.6
const BRANCH_LIGHT_DIR_X = -0.5
const BRANCH_LIGHT_DIR_Y = -0.87
//
// Limb bark reuses the trunk passes; crack columns and stroke sizes scale
// with limb half-width relative to BRANCH_BARK_REF_HW.
//
const BRANCH_BARK_SEED = 5167
const BRANCH_BARK_CHAIN_SEED_STEP = 131
const BRANCH_BARK_MIN_HW = 1.5
const BRANCH_BARK_REF_HW = 14
const BRANCH_BARK_HW_PER_COLUMN = 5
const BRANCH_BARK_COLUMNS_MIN = 2
const BRANCH_BARK_COLUMNS_MAX = 3
const BRANCH_BARK_CRACK_MIN_HW = 3.5
const BRANCH_BARK_CRACK_LEN_SCALE_MIN = 0.6
const BRANCH_BARK_DAUB_MIN_HW = 2.5
const BRANCH_BARK_DAUBS_PER_PX = 0.035
const BRANCH_BARK_CHAIN_WIDTH_JUMP = 1.3
//
// Default trunk-height band (fractions of the trunk) branches sprout from.
// Background trees pass a higher minimum so their foliage gathers at the top.
//
//
// Hero platform branch height as a fraction of the trunk, from the bottom.
//
const HORIZ_BRANCH_FRAC_DEFAULT = 0.42
const BRANCH_FRAC_MIN = 0.5
const BRANCH_FRAC_MAX = 0.92
//
// Upward branch mode (background trees): branches leave the trunk close to
// vertical instead of sideways, so their leaves stay near the crown.
//
const BRANCH_UP_SPREAD_MIN = 0.2
const BRANCH_UP_SPREAD_RANGE = 0.45
//
// Extra upward branches added near the trunk top of EVERY tree so the crown
// reads as reaching upward rather than only fanning sideways.
//
//
// Main-tree crown (structuredCrown): scripted limbs instead of random ones —
// one long upper-left limb above the hero branch, a central fan toward the
// top and several shorter right limbs. frac = height on the trunk from the
// bottom, len = growth steps, wFrac = base width as a share of the trunk
// width at the attach point, so limbs read as splits of the trunk rather
// than twigs stuck onto it.
//
const STRUCTURED_CROWN_LIMBS = [
  { frac: 0.62, angle: -Math.PI + 0.55, len: 9, wFrac: 0.5 },
  { frac: 0.74, angle: -Math.PI / 2 - 0.62, len: 20, wFrac: 0.62 },
  { frac: 0.84, angle: -Math.PI / 2 - 0.15, len: 14, wFrac: 0.6 },
  { frac: 0.92, angle: -Math.PI / 2 + 0.35, len: 13, wFrac: 0.6 },
  { frac: 0.58, angle: -0.26, len: 20, wFrac: 0.6 },
  { frac: 0.68, angle: -0.55, len: 17, wFrac: 0.55 },
  { frac: 0.8, angle: -0.9, len: 14, wFrac: 0.55 }
]
const STRUCTURED_LIMB_ANGLE_JITTER = 0.08
const STRUCTURED_LIMB_SEED_RANGE = 1000000
const STRUCTURED_LIMB_SEED_STEP = 7919
//
// Scripted limbs taper to 60% of their base width before forking; the main
// fork keeps most of that width, the side fork is thinner.
//
const STRUCTURED_LEAF_STYLE = { midChance: 0.32, massScale: 0.7, tipTaper: 0.4, childW: [0.95, 0.75], twigs: true }
//
// Thin twigs sprouting along the main-tree limbs (trunk → limb → twig →
// leaves): every TWIG_STEP_EVERY-th limb step on the first two limb levels
// may grow a short twig that leaves the limb at a slant (biased upward) and
// ends in its own leaf group. Twigs draw from their own position-seeded
// stream so the limbs keep their exact shape.
//
const TWIG_STEP_EVERY = 2
const TWIG_MAX_DEPTH = 1
const TWIG_CHANCE = 0.32
const TWIG_LEN_MIN = 2
const TWIG_LEN_RANGE = 3
const TWIG_W_FRAC = 0.32
const TWIG_W_MIN = 1.2
const TWIG_ANGLE_MIN = 0.55
const TWIG_ANGLE_RANGE = 0.6
const TWIG_UP_BIAS = 0.35
const TWIG_HASH_X = 73856093
const TWIG_HASH_Y = 19349663
const TWIG_LEAF_STYLE = { midChance: 0.35, massScale: 0.66, tipTaper: 0.5, childW: [0.8, 0.65] }
const BRANCH_CHILD_W = [0.66, 0.56]
//
// Main-tree structured crown: smaller pixel clouds and fewer side lobes so
// the canopy stays open and star leaves stay readable.
//
const STRUCTURED_CROWN_CLOUD_CELL_BONUS = -18
const STRUCTURED_CROWN_LOBE_CHANCE_DELTA = -0.2
const STRUCTURED_CROWN_EXTRA_LOBE_CHANCE = 0.05
//
// Crown light: groups low in the crown take the shadow mass shade, groups
// near the top the light one; inside every group the lowest cells drop one
// shade and the top cells gain one.
//
const CROWN_SHADE_LOW_T = 0.62
const CROWN_SHADE_HIGH_T = 0.32
const CLUSTER_SHADE_LOW_FRAC = 0.62
const CLUSTER_SHADE_HIGH_FRAC = 0.3
const BRANCH_TOP_EXTRA_COUNT = 4
const BRANCH_TOP_FRAC_MIN = 0.78
const BRANCH_TOP_FRAC_RANGE = 0.16
//
// Leaf-band teardrops — size/opacity ranges of the dense row-foliage leaves.
//
//
// Horizontal branch length (px) — the branch that extends left from the trunk.
//
const HORIZ_BRANCH_LENGTH = 200
//
// Load-bearing look of the hero branch: drawn thick at the trunk and tapering
// toward the tip. The extra width grows downward only, so the walkable top
// edge (platSegs / physY) stays where the thin collision branch puts it.
//
const HORIZ_BRANCH_BEAR_W_BASE = 22
const HORIZ_BRANCH_BEAR_W_TIP = 7
//
// Thin twigs along the hero branch (fraction along it, angle off vertical,
// steps) carry small leaf groups; the hero branch foliage is scaled down so
// the left crown is not heavier than the branch can hold.
//
const HORIZ_BRANCH_TWIGS = [
  { frac: 0.3, tilt: -0.35, len: 6 },
  { frac: 0.52, tilt: 0.25, len: 5 },
  { frac: 0.74, tilt: -0.5, len: 6 }
]
const HORIZ_BRANCH_TWIG_W_FRAC = 0.42
const HORIZ_BRANCH_TIP_LEN_MIN = 6
const HORIZ_BRANCH_TIP_LEN_RANGE = 2
const HORIZ_BRANCH_LEAF_MASS_SCALE = 0.75
//
// Branch shape: every step bends a little toward vertical (limbs arc up to
// the light) plus a slow position-based wave, so limbs read as curved wood
// instead of straight sticks. Deterministic — no extra rng draws.
//
const BRANCH_UPCURVE = 0.012
const BRANCH_SWAY_AMP = 0.045
const BRANCH_SWAY_STEP_FREQ = 0.45
const BRANCH_SWAY_POS_FREQ_X = 0.013
const BRANCH_SWAY_POS_FREQ_Y = 0.017
//
// Leaf mass size follows the endpoint radius (twig tips small, limb ends
// big) so the crown is not a stack of identical balls.
//
const FOLIAGE_MASS_REF_R = 44
const FOLIAGE_MASS_SCALE_MIN = 0.65
const FOLIAGE_MASS_SCALE_MAX = 1.2
//
// Trunk falloff (main and shore trees): foliage thins toward the main trunk
// and fills out toward the crown edge. Each leaf group's distance to the
// trunk line, normalised by the farthest group, scales its mass between the
// near and far factors; groups close to the trunk may be dropped entirely
// (chance fades from TRUNK_NEAR_SKIP at the trunk to 0 at TRUNK_SKIP_REACH).
// The drop roll is hashed from the group position, not drawn from the
// shared stream, so the remaining layout stays put.
//
const TRUNK_NEAR_MASS = 0.55
const TRUNK_FAR_MASS = 1.25
const TRUNK_NEAR_SKIP = 0.6
const TRUNK_SKIP_REACH = 0.45
const TRUNK_SKIP_HASH_X = 2246822519
const TRUNK_SKIP_HASH_Y = 3266489917

/**
 * Creates a seeded pseudo-random number generator.
 * @param {number} seed - Integer seed; different values produce different trees.
 * @returns {function(): number} Returns a float in [0, 1).
 */
function createRng(seed) {
  let s = (seed >>> 0)
  return () => {
    s = ((s * 1664525 + 1013904223) >>> 0)
    return s / 4294967296
  }
}

/**
 * Builds complete static tree data from a seed value.
 * @param {number} seed - Shape seed (integer)
 * @param {number} trunkX - Horizontal centre of the trunk base
 * @param {number} trunkBottomY - Y coordinate of the trunk base (ground level)
 * @param {number} trunkTopY - Y coordinate of the trunk apex
 * @param {number} rootMaxY - Furthest Y down roots are allowed to reach
 * @param {number} [rootStartY] - Y where roots start (defaults to trunk base)
 * @param {Object} [opts] - { includeRoots, includeHeroBranch, branchFracMin,
 *   branchFracMax, branchUpward, includeCrownClusters, skipTopExtraBranches,
 *   trunkProfile, branchThicknessScale, branchLengthScale, branchCount,
 *   heroBranchFrac }
 *   — background parallax trees skip roots and the hero platform branch;
 *   branchFracMin/Max limit sprout height; branchUpward=false matches the
 *   main tree's sideways fractal canopy.
 * @returns {Object} { seed, trunkSegs, rootSegs, branchSegs, leaves, horizBranch }
 */
export function buildForestTree(seed, trunkX, trunkBottomY, trunkTopY, rootMaxY, rootStartY, opts = {}) {
  const {
    includeRoots = true,
    includeHeroBranch = true,
    branchFracMin = BRANCH_FRAC_MIN,
    branchFracMax = BRANCH_FRAC_MAX,
    branchUpward = false,
    includeCrownClusters = true,
    skipTopExtraBranches = false,
    trunkProfile = null,
    branchThicknessScale = 1,
    branchLengthScale = 1,
    branchCount = null,
    denseBranchCanopyLeaves = false,
    lushCanopy = false,
    heroBranchFrac = HORIZ_BRANCH_FRAC_DEFAULT,
    structuredCrown = false
  } = opts
  const rng = createRng(seed)
  const treeH = trunkBottomY - trunkTopY
  const rootBaseY = rootStartY !== undefined ? rootStartY : trunkBottomY
  const maxRootY = rootMaxY !== undefined ? rootMaxY : rootBaseY + 80
  const trunkSegs = buildTrunk(rng, trunkX, trunkBottomY, trunkTopY, trunkProfile)
  const groundClipY = rootBaseY + ROOT_CLIP_BELOW_GROUND
  const trunkBase = computeTrunkBaseAtClip(trunkSegs, groundClipY)
  const rootSegs = includeRoots ? buildRoots(rng, trunkBase, trunkBottomY, treeH, maxRootY) : []
  const branchSegs = []
  const leafEndpoints = []
  //
  // Seeded branches sprout from random heights along the configured trunk
  // band — or, for the main tree, from a scripted asymmetric limb layout.
  //
  structuredCrown
    ? buildStructuredCrown(rng, trunkSegs, branchSegs, leafEndpoints)
    : buildBranchesFromTrunk(
      rng, trunkSegs, branchSegs, leafEndpoints,
      branchFracMin, branchFracMax, branchUpward, skipTopExtraBranches,
      branchThicknessScale, branchLengthScale, branchCount, denseBranchCanopyLeaves || lushCanopy
    )
  //
  // Top crown — three clusters grow from the trunk apex for a full canopy.
  //
  if (includeCrownClusters && !structuredCrown) {
    const trunkTop = trunkSegs[trunkSegs.length - 1]
    const crownAngles = lushCanopy
      ? [-Math.PI / 2, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55, -Math.PI / 2 - 0.28, -Math.PI / 2 + 0.28]
      : [-Math.PI / 2, -Math.PI / 2 - 0.55, -Math.PI / 2 + 0.55]
    crownAngles.forEach(angle => {
      const len = lushCanopy
        ? FOLIAGE_LUSH_CROWN_LEN_MIN + rng() * FOLIAGE_LUSH_CROWN_LEN_RANGE
        : 28 + rng() * 22
      growBranch(rng, trunkTop.ex, trunkTop.ey, angle, Math.round(len), 10, branchSegs, leafEndpoints, 0, denseBranchCanopyLeaves || lushCanopy)
    })
  }
  const heroBranchSegFrom = branchSegs.length
  //
  // Special horizontal branch in the lower-left: starts horizontal then turns organic.
  // This branch has a physics collision box — the hero starts here.
  //
  const horizBranch = includeHeroBranch
    ? buildHorizBranch(rng, trunkSegs, branchSegs, leafEndpoints, heroBranchFrac)
    : null
  const leaves = buildLeaves(rng, leafEndpoints, 3, denseBranchCanopyLeaves || lushCanopy, {
    detailMin: opts.foliageDetailLeavesMin,
    detailMax: opts.foliageDetailLeavesMax,
    cloudCellBonus: (lushCanopy ? FOLIAGE_LUSH_CLOUD_CELL_BONUS : 0) + (structuredCrown ? STRUCTURED_CROWN_CLOUD_CELL_BONUS : 0),
    lobeChanceBoost: (lushCanopy ? FOLIAGE_LUSH_LOBE_CHANCE_BOOST : 0) + (structuredCrown ? STRUCTURED_CROWN_LOBE_CHANCE_DELTA : 0),
    extraLobeChance: (lushCanopy ? FOLIAGE_LUSH_EXTRA_LOBE_CHANCE : 0) + (structuredCrown ? STRUCTURED_CROWN_EXTRA_LOBE_CHANCE : 0),
    massByRadius: true,
    shadeByHeight: structuredCrown,
    trunkFalloffSegs: structuredCrown ? trunkSegs : null
  })
  return {
    seed,
    trunkSegs,
    rootSegs,
    branchSegs,
    leaves,
    horizBranch,
    rootStartY: rootBaseY,
    heroBranchSegFrom,
    groundClipY: rootBaseY,
    trunkBase
  }
}

const SHORE_ACCENT_TRUNK_PROFILE = { steps: 16, wBase: 46, wTop: 9, wobble: 6, taperPower: 1.06 }
const SHORE_ACCENT_BRANCH_W = 8
const SHORE_ACCENT_BRANCH_TIP_W_FRAC = 0.52
const SHORE_ACCENT_HORIZ_SEGS = 6
const HORIZ_BRANCH_TAPER = 0.44
const HORIZ_BRANCH_CURVE_AMP = 12
const SHORE_ACCENT_ROOT_MAX_DEPTH = 48
const SHORE_ACCENT_ATTACH_MIN_BELOW_TOP = 14
const SHORE_ACCENT_BRANCH_LEAF_R_FRAC = 0.22
const SHORE_ACCENT_CROWN_LEAF_R = 26
//
// Trunk side limbs (between ground and the hero branch) — short stubs only.
//
const SHORE_ACCENT_TRUNK_SIDE_BRANCH_SPECS = [
  { t: 0.32, angle: Math.PI - 0.24, len: 7, w: 3.2 },
  { t: 0.52, angle: -0.2, len: 6, w: 2.8 },
  { t: 0.72, angle: Math.PI - 0.38, len: 5, w: 2.5 }
]
const SHORE_ACCENT_SIDE_LEAF_R = 8
//
// Fuller shore-tree canopy: extra leaf masses around the trunk apex (offsets
// from the apex) and masses hanging under the walkable branch (fraction along
// it, drop below it). The apex sits just above that branch, so the apex
// masses grow up and to the left, away from the walkable wood.
//
const SHORE_ACCENT_CROWN_EXTRA = [
  { dx: -30, dy: -4 },
  { dx: -8, dy: -30 },
  { dx: 14, dy: -38 },
  { dx: -44, dy: 26 },
  { dx: -34, dy: 58 }
]
const SHORE_ACCENT_CROWN_EXTRA_R = 24
const SHORE_ACCENT_BRANCH_HANG = [
  { t: 0.45, dy: 30 },
  { t: 0.72, dy: 34 }
]
const SHORE_ACCENT_BRANCH_HANG_R = 18
const SHORE_ACCENT_LEAF_OPTS = {
  cloudCellBonus: 12,
  detailMin: 3,
  detailMax: 7,
  lobeChanceBoost: 0.35,
  extraLobeChance: 0.5
}

/**
 * Minimal main-tree-style accent: tapered trunk, roots, one horizontal branch
 * the hero can stand on, with a leaf mass at its tip and a small crown.
 * @param {Object} cfg - Layout
 * @param {number} cfg.seed - Deterministic layout seed
 * @param {number} cfg.trunkX - Trunk centre X
 * @param {number} cfg.groundY - Ground line Y
 * @param {number} cfg.trunkH - Trunk height above ground
 * @param {number} cfg.branchAttachY - World Y where the branch leaves the trunk
 * @param {number} cfg.branchAngle - Branch angle (radians, 0 = horizontal to the right)
 * @param {number} cfg.branchLen - Branch length
 * @returns {Object} Tree data compatible with renderForestTreeIntoContext()
 */
export function buildForestShoreAccentTree(cfg) {
  const { seed, trunkX, groundY, trunkH, branchAttachY, branchAngle, branchLen } = cfg
  const trunkTopY = groundY - trunkH
  const rng = createRng(seed)
  const trunkSegs = buildTrunk(rng, trunkX, groundY, trunkTopY, SHORE_ACCENT_TRUNK_PROFILE)
  const groundClipY = groundY
  const trunkBase = computeTrunkBaseAtClip(trunkSegs, groundClipY)
  const rootSegs = buildRoots(rng, trunkBase, groundY, trunkH, groundY + SHORE_ACCENT_ROOT_MAX_DEPTH)
  const branchSegs = []
  const leafEndpoints = []
  const attachY = Math.max(trunkTopY + SHORE_ACCENT_ATTACH_MIN_BELOW_TOP, Math.min(branchAttachY, groundY))
  addShoreAccentTrunkSideBranches(rng, trunkSegs, branchSegs, leafEndpoints, attachY, groundY)
  const trunkSegAtAttach = trunkSegs.find(seg => attachY <= seg.sy && attachY >= seg.ey) ?? trunkSegs[trunkSegs.length - 1]
  const startX = trunkSegAtAttach.ex
  const endX = startX + Math.cos(branchAngle) * branchLen
  const horizPlatSegs = []
  let prevX = startX
  let prevY = attachY
  for (let i = 0; i < SHORE_ACCENT_HORIZ_SEGS; i++) {
    const t0 = i / SHORE_ACCENT_HORIZ_SEGS
    const t1 = (i + 1) / SHORE_ACCENT_HORIZ_SEGS
    const ex = startX + (endX - startX) * t1
    const sag = Math.sin(t1 * Math.PI) * 2.8
    const ey = attachY + sag + (i > 0 && i < SHORE_ACCENT_HORIZ_SEGS - 1 ? (rng() - 0.5) * 4 : 0)
    const w0 = SHORE_ACCENT_BRANCH_W * (1 - t0 * (1 - SHORE_ACCENT_BRANCH_TIP_W_FRAC))
    const w1 = SHORE_ACCENT_BRANCH_W * (1 - t1 * (1 - SHORE_ACCENT_BRANCH_TIP_W_FRAC))
    branchSegs.push({
      sx: prevX,
      sy: prevY,
      ex,
      ey,
      w: w0,
      w2: w1,
      //
      // Gameplay branch reads as continuation of the trunk, not a lighter limb.
      //
      trunkTone: true
    })
    horizPlatSegs.push({
      x1: Math.min(prevX, ex),
      x2: Math.max(prevX, ex),
      y: Math.min(prevY, ey) - Math.max(w0, w1) * 0.5
    })
    prevX = ex
    prevY = ey
  }
  leafEndpoints.push({ x: endX, y: prevY, r: branchLen * SHORE_ACCENT_BRANCH_LEAF_R_FRAC })
  SHORE_ACCENT_BRANCH_HANG.forEach(hang => leafEndpoints.push({
    x: startX + (endX - startX) * hang.t,
    y: attachY + hang.dy,
    r: SHORE_ACCENT_BRANCH_HANG_R
  }))
  const trunkTop = trunkSegs[trunkSegs.length - 1]
  leafEndpoints.push({ x: trunkTop.ex, y: trunkTop.ey, r: SHORE_ACCENT_CROWN_LEAF_R })
  SHORE_ACCENT_CROWN_EXTRA.forEach(off => leafEndpoints.push({
    x: trunkTop.ex + off.dx,
    y: trunkTop.ey + off.dy,
    r: SHORE_ACCENT_CROWN_EXTRA_R
  }))
  const leaves = buildLeaves(rng, leafEndpoints, 3, true, { ...SHORE_ACCENT_LEAF_OPTS, trunkFalloffSegs: trunkSegs })
  const branchW = SHORE_ACCENT_BRANCH_W
  return {
    seed,
    trunkSegs,
    rootSegs,
    branchSegs,
    leaves,
    horizBranch: {
      x1: Math.min(startX, endX),
      x2: Math.max(startX, endX),
      y: attachY,
      physY: Math.min(...horizPlatSegs.map(s => s.y)),
      w: branchW,
      platSegs: horizPlatSegs
    },
    rootStartY: groundY,
    heroBranchSegFrom: 0,
    groundClipY,
    trunkBase
  }
}

/**
 * Paints every foliage item of a tree in one opaque colour — a coverage mask
 * that matches the baked canopy pixel for pixel (same cluster cell size).
 * @param {CanvasRenderingContext2D} ctx - Target context (world coordinates)
 * @param {Object} treeData - Output of buildForestTree()
 * @param {number} clusterCellPx - Foliage cluster cell size used by the bake palette
 */
export function paintForestTreeFoliageMask(ctx, treeData, clusterCellPx) {
  const shades = [FOLIAGE_MASK_RGB, FOLIAGE_MASK_RGB, FOLIAGE_MASK_RGB]
  treeData.leaves.forEach(item => drawFoliageItemToCanvas(ctx, item, shades, null, 1, clusterCellPx))
}

/**
 * Lists every cluster leaf of a tree exactly as the bake paints it (position,
 * size, angle, colour, draw order) — lets decor re-paint a few canopy leaves
 * in front of objects that hang inside the crown.
 * @param {Object} treeData - Output of buildForestTree()
 * @param {Object} palette - Bake palette (leafShades, foliageClusterCellPx)
 * @returns {Array<{x: number, y: number, size: number, angle: number, rgb: Object}>}
 */
export function collectForestTreeClusterLeaves(treeData, palette) {
  const leafShades = palette.leafShades ?? [{ r: palette.leafR, g: palette.leafG, b: palette.leafB }]
  const cell = palette.foliageClusterCellPx ?? FOLIAGE_CLUSTER_CELL_PX_DEFAULT
  const sprig = sprigLook(palette)
  const out = []
  treeData.leaves.forEach(item => {
    if (item.type !== 'cluster') return
    const ox = Math.round(item.x)
    const oy = Math.round(item.y)
    clusterLeafDraws(item, leafShades, cell, sprig).forEach(d => out.push({
      ...d,
      x: ox + d.x,
      y: oy + d.y,
      sprig: Boolean(sprig)
    }))
  })
  return out
}

/**
 * Paints leaves from collectForestTreeClusterLeaves() with the bake's leaf shape.
 * @param {CanvasRenderingContext2D} ctx - Target context (world coordinates)
 * @param {Array<Object>} leaves - Leaf descriptors
 * @param {number} [opacity=1] - Leaf opacity used by the tree bake
 */
export function paintForestTreeClusterLeaves(ctx, leaves, opacity = 1) {
  leaves.forEach(l => l.sprig
    ? drawSprigLeafToCanvas(ctx, l.x, l.y, l.size, l.angle, l.leaflets, l.rgb, opacity)
    : drawLeafToCanvas(ctx, l.x, l.y, l.size, l.angle, l.rgb.r, l.rgb.g, l.rgb.b, opacity, null))
}

/**
 * Renders the complete tree to an HTMLCanvasElement using canvas2D.
 * The canvas is transparent except for the tree pixels.
 * Load the returned canvas with k.loadSprite() and display it as a full-screen sprite.
 * @param {Object} treeData - Output of buildForestTree()
 * @param {Object} palette - Color palette (e.g. TREE_PALETTE_GRAY)
 * @param {number} w - Canvas width (should match screen width)
 * @param {number} h - Canvas height (should match screen height)
 * @returns {HTMLCanvasElement} Ready-to-load canvas
 */
export function renderForestTreeToCanvas(treeData, palette, w, h) {
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  renderForestTreeIntoContext(ctx, treeData, palette, w, h)
  return canvas
}

/**
 * Renders the complete tree into an EXISTING canvas2D context — several trees
 * can share one layer canvas (used by the big background parallax trees).
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {Object} treeData - Output of buildForestTree()
 * @param {Object} palette - Color palette (e.g. getTreePaletteColor())
 * @param {number} w - Canvas width
 * @param {number} h - Canvas height
 */
export function renderForestTreeIntoContext(ctx, treeData, palette, w, h) {
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  //
  // Per-part colors — gray uses one tone; color palette splits roots/trunk/leaves.
  //
  const rootR = palette.rootR ?? palette.treeR ?? 144
  const rootG = palette.rootG ?? palette.treeG ?? 144
  const rootB = palette.rootB ?? palette.treeB ?? 144
  const trunkR = palette.trunkR ?? palette.treeR ?? rootR
  const trunkG = palette.trunkG ?? palette.treeG ?? rootG
  const trunkB = palette.trunkB ?? palette.treeB ?? rootB
  const branchR = palette.branchR ?? trunkR
  const branchG = palette.branchG ?? trunkG
  const branchB = palette.branchB ?? trunkB
  const leafR = palette.leafR ?? palette.treeR ?? trunkR
  const leafG = palette.leafG ?? palette.treeG ?? trunkG
  const leafB = palette.leafB ?? palette.treeB ?? trunkB
  //
  // Bark tones come from the palette per phase — gray phase stays grayscale.
  //
  const fallbackBark = getTreeBarkPalette()
  const barkDark = palette.barkShades?.dark ?? forestHexToRgb(fallbackBark.dark)
  const barkHighlight = palette.barkShades?.highlight ?? forestHexToRgb(fallbackBark.highlight)
  //
  // Roots — organic stroke network (same primitive as the ready/menu trees).
  // Width tapers with proximity to the ground surface so no root ever reads
  // above the ground line, while segments under the trunk base keep full
  // width — the trunk fill painted afterwards makes the joint seamless.
  //
  const groundY = treeData.groundClipY ?? treeData.rootStartY ?? (treeData.trunkSegs[0]?.sy ?? h)
  const trunkBase = treeData.trunkBase ?? treeData.trunkSegs[0]
  const trunkBaseX = trunkBase?.sx ?? 0
  const trunkHalfW = (trunkBase?.w ?? 74) * 0.5
  ctx.lineCap = 'round'
  //
  // Roots are optional — background parallax trees are built without them.
  //
  if (treeData.rootSegs.length) {
    ctx.save()
    ctx.beginPath()
    ctx.rect(0, groundY + ROOT_CLIP_BELOW_GROUND, w, h - groundY - ROOT_CLIP_BELOW_GROUND)
    ctx.clip()
    const rootRgb = { r: rootR, g: rootG, b: rootB }
    if (palette.flatSilhouette) {
      drawRootStrokes(ctx, treeData, rootRgb, h, groundY, trunkBaseX, trunkHalfW)
    } else if (palette.woodMassStyle || palette.simpleRoots) {
      drawRootStrokes(ctx, treeData, rootRgb, h, groundY, trunkBaseX, trunkHalfW)
    } else {
      const rootContourRgb = scaleRgbBrightness(rootRgb, 1 - ROOT_CONTOUR_DARKEN)
      const rootHighlightRgb = lightenRgb(rootRgb, ROOT_HIGHLIGHT_LIGHTEN)
      drawRootStrokes(ctx, treeData, rootContourRgb, h, groundY, trunkBaseX, trunkHalfW, ROOT_CONTOUR_EXTRA_W)
      drawRootStrokes(ctx, treeData, rootRgb, h, groundY, trunkBaseX, trunkHalfW)
      drawRootHighlights(ctx, treeData, rootHighlightRgb, h, groundY, trunkBaseX, trunkHalfW)
    }
    ctx.restore()
  }
  //
  // Wood clip line extends ROOT_CLIP_BELOW_GROUND px past the visible ground
  // line — exactly matching where the root clip rect starts (see above) — so
  // the trunk fill and the root fan share one continuous boundary with no
  // unpainted seam between them.
  //
  const trunkClipY = groundY + ROOT_CLIP_BELOW_GROUND
  const trunkRgb = { r: trunkR, g: trunkG, b: trunkB }
  const branchRgb = { r: branchR, g: branchG, b: branchB }
  //
  // Branches — filled capsule segments in the light branch tone. Drawn BEFORE
  // the trunk so every branch base is covered by the trunk silhouette: bases
  // emerge organically from the trunk edge instead of showing rectangular
  // butts, and no branch run reads as a stripe inside the trunk.
  //
  //
  // Optional 1 px outline around trunk + branches (NOT leaves, NOT roots):
  // underdraw the whole wood silhouette slightly wider in the outline tone —
  // the regular fills painted next leave only the outer rim visible, so no
  // internal seams appear at branch/trunk junctions.
  //
  const foliageCellPx = palette.foliageClusterCellPx ?? FOLIAGE_CLUSTER_CELL_PX_DEFAULT
  if (palette.flatSilhouette) {
    fillWoodChain(ctx, treeData.trunkSegs, trunkRgb, trunkClipY)
    treeData.branchSegs.forEach(seg => {
      drawFilledWoodSegment(ctx, seg, woodRgbForBranchSeg(seg, trunkRgb, branchRgb), trunkClipY)
    })
    ctx.globalAlpha = 1
    if (!palette.skipLeaves) {
      const flatRgb = { r: leafR, g: leafG, b: leafB }
      treeData.leaves.forEach(item => {
        drawFoliageItemToCanvas(ctx, item, [flatRgb], null, palette.leafOpacity ?? 1, foliageCellPx)
      })
    }
    return
  }
  const treeSeed = treeData.seed ?? TREE_SEED
  const branchesOverTrunk = palette.branchesOverTrunk ?? false
  const woodMass = palette.woodMassStyle ?? false
  const volume = palette.woodVolume ?? null
  const limbs = volume ? treeData.branchSegs.map(bulgeBranchSeg) : treeData.branchSegs
  const branchWood = volume ? [...buildBranchCollars(treeData), ...limbs] : limbs
  if (palette.woodOutline) {
    const ol = palette.woodOutline
    if (!branchesOverTrunk) {
      branchWood.forEach(seg => {
        drawFilledWoodSegment(ctx, { ...seg, w: seg.w + WOOD_OUTLINE_PX * 2 }, ol, trunkClipY)
      })
    }
    fillWoodChain(ctx, expandChainWidths(treeData.trunkSegs, WOOD_OUTLINE_PX * 2), ol, trunkClipY)
  }
  if (branchesOverTrunk) {
    //
    // Parallax trees: trunk first, branches on top so sideways wood stays visible
    // even when branch and trunk share one flat tone.
    //
    fillWoodChain(ctx, treeData.trunkSegs, trunkRgb, trunkClipY)
    treeData.branchSegs.forEach(seg => {
      drawFilledWoodSegment(ctx, seg, woodRgbForBranchSeg(seg, trunkRgb, branchRgb), trunkClipY)
    })
    if (!woodMass) {
      drawWoodShading(ctx, treeData.trunkSegs, barkDark, trunkClipY)
      const { segs: barkSegs, clipY: barkClipY } = buildTrunkCollarBarkExtension(treeData, trunkClipY)
      drawTrunkBark(ctx, barkSegs, barkDark, barkHighlight, treeSeed + 557, barkClipY)
      drawTrunkCracks(ctx, treeData.trunkSegs, barkDark, treeSeed + 991, trunkClipY)
      drawBranchCracks(ctx, treeData.branchSegs, barkDark, treeSeed + 1777, trunkClipY)
      drawBranchRidges(ctx, treeData.branchSegs, barkDark, barkHighlight, treeSeed + 2317, trunkClipY)
      drawWoodShading(ctx, treeData.branchSegs, barkDark, trunkClipY)
    }
  } else {
    //
    // Gameplay trees paint limbs in the trunk tone and bark so the whole
    // tree reads as one material.
    //
    branchWood.forEach(seg => {
      drawFilledWoodSegment(ctx, seg, volume ? trunkRgb : woodRgbForBranchSeg(seg, trunkRgb, branchRgb), trunkClipY)
    })
    //
    // Branch bark goes under the trunk fill so limb bases stay hidden
    // inside the trunk silhouette.
    //
    volume && !woodMass && drawBranchBark(ctx, branchWood, volume, barkDark, treeSeed + BRANCH_BARK_SEED, trunkClipY)
    volume && !woodMass && drawBranchKnots(ctx, limbs, volume, treeSeed + BRANCH_KNOT_SEED, trunkClipY)
    fillWoodChain(ctx, treeData.trunkSegs, trunkRgb, trunkClipY)
    if (!woodMass) {
      drawBranchCracks(ctx, treeData.branchSegs, barkDark, treeSeed + 1777, trunkClipY)
      volume || drawBranchRidges(ctx, treeData.branchSegs, barkDark, barkHighlight, treeSeed + 2317, trunkClipY)
      //
      // The volume pass owns the trunk's light direction; the generic shading
      // darkens the opposite flank and would flatten it again.
      //
      volume || drawWoodShading(ctx, treeData.trunkSegs, barkDark, trunkClipY)
      const { segs: barkSegs, clipY: barkClipY } = buildTrunkCollarBarkExtension(treeData, trunkClipY)
      if (volume) {
        //
        // Volume trees: smooth side light, a few faint daubs and the crack
        // net on top — the generic bark's dense lines and seams would turn
        // the trunk into stripes.
        //
        drawTrunkVolumeBands(ctx, barkSegs, volume, barkClipY)
        drawTrunkVolumeDaubs(ctx, barkSegs, volume, treeSeed + TRUNK_DAUB_SEED, barkClipY)
        drawTrunkCrackNet(ctx, barkSegs, volume, barkDark, treeSeed + BARK_CRACK_SEED, barkClipY)
      } else {
        drawTrunkBark(ctx, barkSegs, barkDark, barkHighlight, treeSeed + 557, barkClipY)
        drawTrunkCracks(ctx, treeData.trunkSegs, barkDark, treeSeed + 991, trunkClipY)
        drawWoodShading(ctx, treeData.branchSegs, barkDark, trunkClipY)
      }
    }
  }
  //
  // Leaves — note-tree style teardrop leaves with a centre vein.
  //
  ctx.globalAlpha = 1
  const leafShades = palette.leafShades ?? [{ r: leafR, g: leafG, b: leafB }]
  //
  // Background palettes disable leaf details — plain teardrops, no vein line.
  //
  const vein = palette.noLeafDetails ? null : (palette.leafVein ?? barkDark)
  const leafOpacity = palette.leafOpacity ?? 1
  const sprig = sprigLook(palette)
  treeData.leaves.forEach(item => {
    drawFoliageItemToCanvas(ctx, item, leafShades, vein, leafOpacity, foliageCellPx, sprig)
  })
}

/**
 * Shared gameplay bark on a trunk segment chain (big trees, lip-trees).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Array<Object>} segs - Trunk segments { sx, sy, ex, ey, w, w2? }
 * @param {number} seed - Per-tree bake seed
 * @param {number} clipY - Ground clip Y
 * @param {{ dark: Object, highlight: Object }} barkShades
 */
export function paintForestGameplayBarkOnTrunk(ctx, segs, seed, clipY, barkShades) {
  if (!segs?.length || !barkShades) return
  const dark = barkShades.dark
  const highlight = barkShades.highlight
  drawWoodShading(ctx, segs, dark, clipY)
  drawTrunkBark(ctx, segs, dark, highlight, seed, clipY)
  drawTrunkCracks(ctx, segs, dark, seed + 991, clipY)
}

//
// Builds the trunk as tapered segments drifting organically from base to apex.
//
function buildTrunk(rng, trunkX, bottomY, topY, profile = null) {
  const STEPS = profile?.steps ?? 18
  const TRUNK_W_BASE = profile?.wBase ?? 74
  const TRUNK_W_TOP = profile?.wTop ?? 10
  const WOBBLE = profile?.wobble ?? 9
  const TAPER_POWER = profile?.taperPower ?? 1
  const segs = []
  const stepH = (bottomY - topY) / STEPS
  let cx = trunkX
  let cy = bottomY
  for (let i = 0; i < STEPS; i++) {
    const prevX = cx
    const prevY = cy
    cx += (rng() - 0.5) * WOBBLE
    cy -= stepH
    //
    // Width tapers along the segment; taperPower > 1 keeps the base wide
    // longer and pinches the crown faster (parallax rows).
    //
    const t0 = Math.pow(i / STEPS, TAPER_POWER)
    const t1 = Math.pow((i + 1) / STEPS, TAPER_POWER)
    const w = TRUNK_W_BASE + (TRUNK_W_TOP - TRUNK_W_BASE) * t0
    const w2 = TRUNK_W_BASE + (TRUNK_W_TOP - TRUNK_W_BASE) * t1
    segs.push({ sx: prevX, sy: prevY, ex: cx, ey: cy, w, w2 })
  }
  return segs
}
//
// Clamps a segment so nothing draws below the trunk base line.
//
function clampSegmentToMaxY(seg, maxY) {
  let sx = seg.sx
  let sy = seg.sy
  let ex = seg.ex
  let ey = seg.ey
  if (Math.min(sy, ey) > maxY + 0.5) return null
  if (sy > maxY + 0.5) {
    const t = (maxY - ey) / (sy - ey)
    sx = ex + (sx - ex) * t
    sy = maxY
  }
  if (ey > maxY + 0.5) {
    const t = (maxY - sy) / (ey - sy)
    ex = sx + (ex - sx) * t
    ey = maxY
  }
  return { sx, sy, ex, ey, w: seg.w, w2: seg.w2 }
}
function woodRgbForBranchSeg(seg, trunkRgb, branchRgb) {
  return seg.trunkTone ? trunkRgb : branchRgb
}
//
// Fills one wood segment as a capsule (tapered quad + round end caps) —
// joints between segments and branch bases read rounded, not rectangular.
//
function drawFilledWoodSegment(ctx, seg, rgb, maxY) {
  const clipped = clampSegmentToMaxY(seg, maxY)
  if (!clipped) return
  const { sx, sy, ex, ey, w } = clipped
  const wEnd = clipped.w2 ?? w
  const dx = ex - sx
  const dy = ey - sy
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const hw0 = w * 0.5
  const hw1 = wEnd * 0.5
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  ctx.moveTo(sx + nx * hw0, sy + ny * hw0)
  ctx.lineTo(ex + nx * hw1, ey + ny * hw1)
  ctx.lineTo(ex - nx * hw1, ey - ny * hw1)
  ctx.lineTo(sx - nx * hw0, sy - ny * hw0)
  ctx.closePath()
  ctx.fill()
  //
  // Round caps at both segment ends soften every junction.
  //
  ctx.beginPath()
  ctx.arc(sx, sy, hw0, 0, Math.PI * 2)
  ctx.arc(ex, ey, hw1, 0, Math.PI * 2)
  ctx.fill()
}
//
// Builds left/right outline points for a chain of tapered segments.
// One point pair per JOINT with the averaged normal of the adjacent segments
// and the interpolated width — the silhouette stays perfectly smooth with no
// per-segment steps or kinks. Also returns the centreline spine (for bark).
//
function buildChainOutline(segs, maxY) {
  const left = []
  const right = []
  const spine = []
  const clipped = []
  segs.forEach(seg => {
    const c = clampSegmentToMaxY(seg, maxY)
    c && clipped.push(c)
  })
  if (!clipped.length) return { left, right, spine }
  //
  // Per-segment normals, then one joint entry per chain vertex.
  //
  clipped.forEach(seg => {
    const dx = seg.ex - seg.sx
    const dy = seg.ey - seg.sy
    const len = Math.hypot(dx, dy) || 1
    seg.nx = -dy / len
    seg.ny = dx / len
  })
  const joints = [{ x: clipped[0].sx, y: clipped[0].sy, nx: clipped[0].nx, ny: clipped[0].ny, hw: clipped[0].w * 0.5 }]
  clipped.forEach((seg, i) => {
    const next = clipped[i + 1]
    //
    // Interior joints blend the normals of both adjacent segments.
    //
    let nx = seg.nx
    let ny = seg.ny
    if (next) {
      nx = (seg.nx + next.nx) * 0.5
      ny = (seg.ny + next.ny) * 0.5
      const nLen = Math.hypot(nx, ny) || 1
      nx /= nLen
      ny /= nLen
    }
    joints.push({ x: seg.ex, y: seg.ey, nx, ny, hw: (seg.w2 ?? seg.w) * 0.5 })
  })
  joints.forEach(j => {
    left.push({ x: j.x + j.nx * j.hw, y: j.y + j.ny * j.hw })
    right.push({ x: j.x - j.nx * j.hw, y: j.y - j.ny * j.hw })
    spine.push(j)
  })
  //
  // Force the base edge flush against maxY on BOTH sides. The base joint's
  // own y can sit above maxY (a short trunk run), and its normal offset can
  // also push one side lower than the other (a tilted base) — either one
  // would leave an unpainted gap between the trunk polygon and the root
  // clip rect below it. Snapping both edge points to the exact same y
  // guarantees a flat, gap-free seam on both sides at once.
  //
  if (left.length && Number.isFinite(maxY)) {
    left[0].y = maxY
    right[0].y = maxY
    spine[0].y = maxY
  }
  return { left, right, spine }
}
//
// Trunk centre and width at the ground clip line — matches the filled trunk
// silhouette exactly so roots merge flush with the trunk base, not with the
// raw first segment centre (which drifts and tilts away from the clip edge).
//
function computeTrunkBaseAtClip(trunkSegs, clipY) {
  const { left, right } = buildChainOutline(trunkSegs, clipY)
  if (!left.length) {
    return {
      sx: trunkSegs[0]?.sx ?? 0,
      sy: clipY,
      w: trunkSegs[0]?.w ?? 74
    }
  }
  const leftX = left[0].x
  const rightX = right[0].x
  return {
    sx: (leftX + rightX) * 0.5,
    sy: clipY,
    w: Math.abs(rightX - leftX)
  }
}
//
// Paints the shadow-side band on wood segments (trunk + branches). All capsules
// are accumulated into ONE path and filled once, so overlapping joints do not
// double the alpha. The band hugs the segment edge facing away from the sun.
//
function drawWoodShading(ctx, segs, rgb, maxY) {
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${SHADE_ALPHA})`
  ctx.beginPath()
  segs.forEach(seg => {
    if (seg.w < SHADE_MIN_SEG_W) return
    const clipped = clampSegmentToMaxY(seg, maxY)
    if (!clipped) return
    const { sx, sy, ex, ey, w } = clipped
    const dx = ex - sx
    const dy = ey - sy
    const len = Math.hypot(dx, dy) || 1
    const nx = -dy / len
    const ny = dx / len
    //
    // Pick the normal that points AWAY from the light direction.
    //
    const sign = (nx * SHADE_LIGHT_DIR_X + ny * SHADE_LIGHT_DIR_Y) < 0 ? 1 : -1
    const off = w * (1 - SHADE_WIDTH_FRAC) * 0.5 * sign
    const hw = w * SHADE_WIDTH_FRAC * 0.5
    const ax = sx + nx * off
    const ay = sy + ny * off
    const bx = ex + nx * off
    const by = ey + ny * off
    ctx.moveTo(ax + nx * hw, ay + ny * hw)
    ctx.lineTo(bx + nx * hw, by + ny * hw)
    ctx.lineTo(bx - nx * hw, by - ny * hw)
    ctx.lineTo(ax - nx * hw, ay - ny * hw)
    ctx.closePath()
    ctx.moveTo(ax + hw, ay)
    ctx.arc(ax, ay, hw, 0, Math.PI * 2)
    ctx.moveTo(bx + hw, by)
    ctx.arc(bx, by, hw, 0, Math.PI * 2)
  })
  ctx.fill()
}
//
// Side-lit trunk: stacked bands per flank (lit + rim on the left, shade +
// deep on the right), clipped to the trunk silhouette.
//
function drawTrunkVolumeBands(ctx, segs, vol, maxY) {
  const { spine } = buildChainOutline(segs, maxY)
  if (spine.length < 2) return
  const dense = densifySpine(orientSpineToShade(spine), TRUNK_VOLUME_SUBSTEPS)
  withChainClip(ctx, segs, maxY, () => {
    TRUNK_VOLUME_BANDS.forEach(band => fillTrunkSideBand(ctx, dense, band, vol[band.tone]))
  })
}
//
// One flank band: outer border sits past the trunk edge (the clip trims it),
// inner border wobbles on two slow sine waves.
//
function fillTrunkSideBand(ctx, spine, band, rgb) {
  const outer = []
  const inner = []
  spine.forEach((j, i) => {
    const r = shadeSideNormal(j)
    const wave = Math.sin(i * TRUNK_VOLUME_WAVE_FREQ + band.phase) +
      Math.sin(i * TRUNK_VOLUME_WAVE2_FREQ + band.phase * 1.7) * TRUNK_VOLUME_WAVE2_AMP
    const innerFrac = 1 - 2 * band.frac + band.wobble * wave
    outer.push({ x: j.x + r.x * band.side * j.hw * TRUNK_VOLUME_EDGE_OVERSHOOT, y: j.y + r.y * band.side * j.hw * TRUNK_VOLUME_EDGE_OVERSHOOT })
    inner.push({ x: j.x + r.x * band.side * j.hw * innerFrac, y: j.y + r.y * band.side * j.hw * innerFrac })
  })
  ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${band.alpha})`
  ctx.beginPath()
  outer.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y)
  ctx.closePath()
  ctx.fill()
}
//
// Short uneven bark strokes along the trunk, toned by which flank they sit on.
//
function drawTrunkVolumeDaubs(ctx, segs, vol, seed, maxY, opts = {}) {
  const { count = TRUNK_DAUB_COUNT, minHw = TRUNK_DAUB_MIN_HW, scale = 1 } = opts
  const { spine } = buildChainOutline(segs, maxY)
  if (spine.length < 2) return
  orientSpineToShade(spine)
  const rng = createRng(seed)
  withChainClip(ctx, segs, maxY, () => {
    ctx.lineCap = 'round'
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(rng() * (spine.length - 1) * TRUNK_DAUB_SPAN)
      const a = spine[idx]
      const b = spine[idx + 1]
      if (a.hw < minHw) continue
      const r = shadeSideNormal(a)
      const frac = (rng() * 2 - 1) * TRUNK_DAUB_FRAC_SPAN
      const tone = vol[trunkDaubTone(frac, rng())]
      const segLen = Math.hypot(b.x - a.x, b.y - a.y) || 1
      const tx = (b.x - a.x) / segLen
      const ty = (b.y - a.y) / segLen
      const len = (TRUNK_DAUB_LEN_MIN + rng() * TRUNK_DAUB_LEN_RANGE) * scale
      const bend = (rng() - 0.5) * TRUNK_DAUB_BEND * scale
      const sx = a.x + r.x * a.hw * frac
      const sy = a.y + r.y * a.hw * frac
      const ex = sx + tx * len
      const ey = sy + ty * len
      ctx.strokeStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${TRUNK_DAUB_ALPHA_MIN + rng() * TRUNK_DAUB_ALPHA_RANGE})`
      ctx.lineWidth = (TRUNK_DAUB_W_MIN + rng() * TRUNK_DAUB_W_RANGE) * scale
      ctx.beginPath()
      ctx.moveTo(sx, sy)
      ctx.quadraticCurveTo((sx + ex) * 0.5 + r.x * bend, (sy + ey) * 0.5 + r.y * bend, ex, ey)
      ctx.stroke()
    }
  })
}
//
// Crack net (reference apple tree): long thin dark cracks run along the
// trunk in broken runs, short sagging cross cracks join neighbouring columns
// into big irregular plates, and a faint lit line hugs each long crack on
// its sun side.
//
function drawTrunkCrackNet(ctx, segs, vol, dark, seed, maxY, opts = {}) {
  const { columns = BARK_CRACK_COLUMNS, minHw = BARK_CRACK_MIN_HW, scale = 1 } = opts
  const { spine } = buildChainOutline(segs, maxY)
  if (spine.length < 2) return
  const dense = densifySpine(orientSpineToShade(spine), TRUNK_VOLUME_SUBSTEPS)
  const cum = spineArcLengths(dense)
  const rng = createRng(seed)
  const bounds = buildCrackBounds(rng, dense, columns)
  const net = {
    dense,
    cum,
    minHw,
    scale,
    width: BARK_CRACK_W * Math.max(BARK_CRACK_W_SCALE_MIN, scale),
    dark,
    lit: vol.lit
  }
  withChainClip(ctx, segs, maxY, () => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    bounds.slice(1, -1).forEach(bound => drawLongCrack(ctx, rng, net, bound))
    for (let c = 0; c < columns; c++) drawCrossCracks(ctx, rng, net, bounds[c], bounds[c + 1])
  })
}
//
// Column borders across the width: the two trunk edges plus jittered inner
// crack lines. Per-joint jitter is stored so the dark crack, its lit line
// and the cross cracks ending on it all share one jagged path.
//
function buildCrackBounds(rng, dense, columns) {
  const bounds = []
  for (let b = 0; b <= columns; b++) {
    const edge = b === 0 || b === columns
    bounds.push({
      frac: -1 + (2 * b) / columns + (edge ? 0 : (rng() * 2 - 1) * BARK_CRACK_COL_JITTER / columns),
      phase: rng() * Math.PI * 2,
      jitter: dense.map(() => edge ? 0 : (rng() * 2 - 1) * BARK_CRACK_JITTER_PX)
    })
  }
  return bounds
}
function crackPoint(net, bound, i) {
  const j = net.dense[i]
  const r = shadeSideNormal(j)
  const frac = bound.frac + Math.sin(net.cum[i] * BARK_CRACK_WOBBLE_FREQ + bound.phase) * BARK_CRACK_WOBBLE
  const off = j.hw * frac + bound.jitter[i]
  return { x: j.x + r.x * off, y: j.y + r.y * off, nx: r.x, ny: r.y }
}
//
// One long crack, broken into runs with short gaps so it never reads as a
// ruler line down the whole trunk.
//
function drawLongCrack(ctx, rng, net, bound) {
  const total = net.cum[net.cum.length - 1]
  let s = rng() * BARK_CRACK_GAP_RANGE * net.scale
  while (s < total) {
    const end = s + (BARK_CRACK_RUN_MIN + rng() * BARK_CRACK_RUN_RANGE) * net.scale
    const pts = []
    for (let i = 0; i < net.dense.length; i++) {
      if (net.cum[i] < s || net.cum[i] > end || net.dense[i].hw < net.minHw) continue
      pts.push(crackPoint(net, bound, i))
    }
    pts.length > 1 && strokeCrackRun(ctx, net, pts)
    s = end + (BARK_CRACK_GAP_MIN + rng() * BARK_CRACK_GAP_RANGE) * net.scale
  }
}
//
// Lit line first (offset toward the sun), dark crack over it.
//
function strokeCrackRun(ctx, net, pts) {
  const { lit, dark } = net
  ctx.strokeStyle = `rgba(${lit.r}, ${lit.g}, ${lit.b}, ${BARK_CRACK_LIT_ALPHA})`
  ctx.lineWidth = BARK_CRACK_LIT_W
  strokeOffsetPolyline(ctx, pts, -BARK_CRACK_LIT_OFFSET)
  ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BARK_CRACK_ALPHA})`
  ctx.lineWidth = net.width
  strokeOffsetPolyline(ctx, pts, 0)
}
function strokeOffsetPolyline(ctx, pts, offset) {
  ctx.beginPath()
  pts.forEach((p, i) => {
    const x = p.x + p.nx * offset
    const y = p.y + p.ny * offset
    i === 0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y)
  })
  ctx.stroke()
}
//
// Sparse cross cracks inside one column, stepping along the trunk.
//
function drawCrossCracks(ctx, rng, net, left, right) {
  const { dark } = net
  const total = net.cum[net.cum.length - 1]
  ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BARK_CRACK_ALPHA})`
  ctx.lineWidth = net.width
  let i = 0
  let s = rng() * BARK_CROSS_STEP_RANGE * net.scale
  while (s < total) {
    while (i < net.cum.length - 1 && net.cum[i] < s) i++
    net.dense[i].hw >= net.minHw && rng() < BARK_CROSS_CHANCE && drawCrossCrack(ctx, rng, net, left, right, i)
    s += (BARK_CROSS_STEP_MIN + rng() * BARK_CROSS_STEP_RANGE) * net.scale
  }
}
//
// Starts on one column border and reaches part or all of the way across,
// slanted along the trunk and sagging down on screen.
//
function drawCrossCrack(ctx, rng, net, left, right, i) {
  const fromLeft = rng() < 0.5
  const a = crackPoint(net, fromLeft ? left : right, i)
  const far = crackPoint(net, fromLeft ? right : left, i)
  const reach = BARK_CROSS_REACH_MIN + rng() * (1 - BARK_CROSS_REACH_MIN)
  const slant = (rng() * 2 - 1) * BARK_CROSS_SLANT_PX * net.scale
  const sag = (BARK_CROSS_SAG_MIN + rng() * BARK_CROSS_SAG_RANGE) * net.scale
  const bx = a.x + (far.x - a.x) * reach - a.ny * slant
  const by = a.y + (far.y - a.y) * reach + a.nx * slant
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.quadraticCurveTo((a.x + bx) * 0.5, (a.y + by) * 0.5 + sag, bx, by)
  ctx.stroke()
}
function spineArcLengths(spine) {
  const cum = [0]
  for (let i = 1; i < spine.length; i++) {
    cum.push(cum[i - 1] + Math.hypot(spine[i].x - spine[i - 1].x, spine[i].y - spine[i - 1].y))
  }
  return cum
}
//
// Lit flank gets warm daubs, shaded flank deep ones, the middle mixes both.
//
function trunkDaubTone(frac, roll) {
  if (frac < -TRUNK_DAUB_SIDE_FRAC) return roll < 0.7 ? 'lit' : 'rim'
  if (frac > TRUNK_DAUB_SIDE_FRAC) return roll < 0.6 ? 'deep' : 'shade'
  return roll < 0.5 ? 'shade' : 'lit'
}
//
// Joint normal of a spine already oriented by orientSpineToShade(): it points
// to the shaded flank, so negative fractions are the sunlit side.
//
function shadeSideNormal(j) {
  return { x: j.nx, y: j.ny }
}
//
// Flips every joint normal of a chain together so they point away from the
// sun: a vertical trunk gets its screen-right flank shaded, a sideways limb
// its underside. One sign per chain — per-joint flips would swap light and
// shade halfway along a limb that runs parallel to the light.
//
function orientSpineToShade(spine) {
  let dot = 0
  spine.forEach(j => {
    dot += j.nx * BRANCH_LIGHT_DIR_X + j.ny * BRANCH_LIGHT_DIR_Y
  })
  dot > 0 && spine.forEach(j => {
    j.nx = -j.nx
    j.ny = -j.ny
  })
  return spine
}
//
// Linear sub-steps between spine joints so band borders curve smoothly
// instead of kinking once per trunk segment.
//
function densifySpine(spine, substeps) {
  const out = [spine[0]]
  for (let i = 1; i < spine.length; i++) {
    const a = spine[i - 1]
    const b = spine[i]
    for (let s = 1; s <= substeps; s++) {
      const t = s / substeps
      out.push({
        x: a.x + (b.x - a.x) * t,
        y: a.y + (b.y - a.y) * t,
        nx: a.nx + (b.nx - a.nx) * t,
        ny: a.ny + (b.ny - a.ny) * t,
        hw: a.hw + (b.hw - a.hw) * t
      })
    }
  }
  return out
}
//
// Flared wedges at every limb base that starts on the trunk spine: wide at
// the trunk, tapering to the limb width a little way out.
//
function buildBranchCollars(treeData) {
  const collars = []
  treeData.branchSegs.forEach(seg => {
    if (seg.w < BRANCH_COLLAR_MIN_W) return
    const trunk = trunkCrossSectionAtY(treeData.trunkSegs, seg.sy)
    if (!trunk || Math.abs(seg.sx - trunk.x) > trunk.hw * BRANCH_COLLAR_BASE_FRAC) return
    const dx = seg.ex - seg.sx
    const dy = seg.ey - seg.sy
    const len = Math.hypot(dx, dy) || 1
    const reach = trunk.hw + seg.w * BRANCH_COLLAR_LEN_FRAC
    collars.push({
      sx: seg.sx,
      sy: seg.sy,
      ex: seg.sx + dx / len * reach,
      ey: seg.sy + dy / len * reach,
      w: seg.w * BRANCH_COLLAR_FLARE,
      w2: seg.w,
      trunkTone: true
    })
  })
  return collars
}
//
// Trunk centre X and half-width at one height (null outside the trunk).
//
function trunkCrossSectionAtY(trunkSegs, y) {
  const seg = trunkSegs.find(s => y <= s.sy && y >= s.ey)
  if (!seg) return null
  const t = seg.sy === seg.ey ? 0 : (seg.sy - y) / (seg.sy - seg.ey)
  return {
    x: seg.sx + (seg.ex - seg.sx) * t,
    hw: (seg.w + ((seg.w2 ?? seg.w) - seg.w) * t) * 0.5
  }
}
//
// Limb bark = the trunk's bark passes run on every limb chain: wavy flank
// bands, short daubs and the crack net. Crack columns, run length and daub
// size scale down with the limb so twigs stay readable.
//
function drawBranchBark(ctx, segs, vol, dark, seed, maxY) {
  buildBranchChains(segs).forEach((chain, i) => {
    const maxHw = Math.max(...chain.map(s => s.w)) * 0.5
    if (maxHw < BRANCH_BARK_MIN_HW) return
    const chainSeed = seed + i * BRANCH_BARK_CHAIN_SEED_STEP
    const len = chain.reduce((sum, s) => sum + Math.hypot(s.ex - s.sx, s.ey - s.sy), 0)
    const scale = Math.min(1, maxHw / BRANCH_BARK_REF_HW)
    const columns = Math.max(BRANCH_BARK_COLUMNS_MIN, Math.min(BRANCH_BARK_COLUMNS_MAX, Math.round(maxHw / BRANCH_BARK_HW_PER_COLUMN)))
    const clipY = Math.max(...chain.map(s => Math.max(s.sy, s.ey))) <= maxY ? Infinity : maxY
    drawTrunkVolumeBands(ctx, chain, vol, clipY)
    drawTrunkVolumeDaubs(ctx, chain, vol, chainSeed + 1, clipY, {
      count: Math.round(len * BRANCH_BARK_DAUBS_PER_PX),
      minHw: BRANCH_BARK_DAUB_MIN_HW,
      scale
    })
    drawTrunkCrackNet(ctx, chain, vol, dark, chainSeed, clipY, {
      columns,
      minHw: BRANCH_BARK_CRACK_MIN_HW,
      scale: Math.max(BRANCH_BARK_CRACK_LEN_SCALE_MIN, scale)
    })
  })
}
//
// Splits limb segments into continuous runs. A run breaks where the next
// segment does not start at the previous end, or where it is much wider
// (a child limb starting at its parent's thin tip).
//
function buildBranchChains(segs) {
  const chains = []
  let cur = null
  segs.forEach(seg => {
    const last = cur?.[cur.length - 1]
    const joined = last && last.ex === seg.sx && last.ey === seg.sy &&
      seg.w <= (last.w2 ?? last.w) * BRANCH_BARK_CHAIN_WIDTH_JUMP
    if (joined) {
      cur.push(seg)
      return
    }
    cur = [seg]
    chains.push(cur)
  })
  return chains
}
//
// Limb copy with both end widths scaled by the bulge wave at that point.
//
function bulgeBranchSeg(seg) {
  if (seg.w < BRANCH_BULGE_MIN_W) return seg
  return {
    ...seg,
    w: seg.w * branchBulgeAt(seg.sx, seg.sy),
    w2: (seg.w2 ?? seg.w) * branchBulgeAt(seg.ex, seg.ey)
  }
}
function branchBulgeAt(x, y) {
  const a = Math.sin(x * BRANCH_BULGE_FREQ_X + y * BRANCH_BULGE_FREQ_Y)
  const b = Math.sin(x * BRANCH_BULGE2_FREQ_X - y * BRANCH_BULGE2_FREQ_Y)
  return 1 + BRANCH_BULGE_AMP * (a * BRANCH_BULGE_MIX + b * (1 - BRANCH_BULGE_MIX))
}
//
// A few knots on thick limbs, oriented along the limb.
//
function drawBranchKnots(ctx, segs, vol, seed, maxY) {
  const rng = createRng(seed)
  segs.forEach(seg => {
    if (seg.w < BRANCH_KNOT_MIN_W || rng() > BRANCH_KNOT_CHANCE) return
    const c = clampSegmentToMaxY(seg, maxY)
    if (!c) return
    const angle = Math.atan2(c.ey - c.sy, c.ex - c.sx)
    const cx = (c.sx + c.ex) * 0.5
    const cy = (c.sy + c.ey) * 0.5
    const rx = c.w * BRANCH_KNOT_RX_FRAC
    const ry = c.w * BRANCH_KNOT_RY_FRAC
    ctx.fillStyle = `rgb(${vol.rim.r}, ${vol.rim.g}, ${vol.rim.b})`
    ctx.beginPath()
    ctx.ellipse(cx + BRANCH_LIGHT_DIR_X * ry * BRANCH_KNOT_LIP_SHIFT, cy + BRANCH_LIGHT_DIR_Y * ry * BRANCH_KNOT_LIP_SHIFT, rx, ry, angle, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = `rgb(${vol.deep.r}, ${vol.deep.g}, ${vol.deep.b})`
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, ry, angle, 0, Math.PI * 2)
    ctx.fill()
  })
}
//
// Resolves the drawn width of one root segment: its own natural taper near
// the canvas bottom and the ground surface, merged with the trunk's local
// cross-section width right at the trunk base so the roots begin exactly as
// wide as the trunk itself (no separate connector shape needed) and only
// show their own thinner width once they clear the merge zone below ground.
//
export function rootSegWidth(seg, h, groundY, trunkBaseX, trunkHalfW) {
  const segBottomY = Math.max(seg.sy, seg.ey)
  const segTopY = Math.min(seg.sy, seg.ey)
  const bottomTaper = Math.min(1, (h - segBottomY) / ROOT_BOTTOM_TAPER_ZONE)
  //
  // Thinner the closer the segment is to the ground surface.
  //
  const groundTaper = Math.max(0, Math.min(1, (segTopY - groundY) / ROOT_GROUND_TAPER_ZONE))
  const naturalW = Math.max(0.6, seg.w * Math.max(0.08, groundTaper) * Math.max(0.35, bottomTaper))
  //
  // Widest a stroke centred at this X can be WITHOUT poking past either
  // trunk edge: the remaining room to the trunk edge on the near side,
  // mirrored — so at the trunk centre this equals the full trunk width, and
  // it shrinks to zero exactly at the trunk edge. Several roots starting
  // across the base width then tile it without ever reading wider than the
  // trunk itself. Measured at the segment's shallowest (top) endpoint —
  // the point that actually sits against the trunk cross-section — instead
  // of the segment midpoint, so a sloped first segment doesn't throw the
  // merge width off right where it matters most.
  //
  const topX = seg.sy <= seg.ey ? seg.sx : seg.ex
  const offset = Math.min(trunkHalfW, Math.abs(topX - trunkBaseX))
  const trunkLocalW = 2 * (trunkHalfW - offset)
  const mergeT = Math.max(0, Math.min(1, 1 - (segTopY - groundY) / ROOT_TRUNK_MERGE_DEPTH))
  //
  // Blended (not maxed) between the trunk-contained width right at the seam
  // (mergeT 1) and the root's own natural taper once fully clear of the
  // trunk (mergeT 0). Math.max(naturalW, trunkLocalW * mergeT) let a chunky
  // root's own natural width win over the trunk-contained width even a few
  // px below ground — before mergeT had faded enough — which is exactly
  // what let roots balloon past the trunk's actual edge right at the
  // visible seam instead of matching it pixel for pixel.
  //
  const blended = trunkLocalW + (naturalW - trunkLocalW) * (1 - mergeT)
  return Math.min(trunkHalfW * 2, Math.max(0.6, blended))
}
//
// Strokes all root segments with the ground/trunk-proximity taper applied.
// The optional extra width turns the same pass into a contour underdraw.
//
function drawRootStrokes(ctx, treeData, rgb, h, groundY, trunkBaseX, trunkHalfW, extraW = 0) {
  ctx.strokeStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  treeData.rootSegs.forEach(seg => {
    ctx.lineWidth = rootSegWidth(seg, h, groundY, trunkBaseX, trunkHalfW) + extraW
    ctx.beginPath()
    ctx.moveTo(seg.sx, seg.sy)
    ctx.lineTo(seg.ex, seg.ey)
    ctx.stroke()
  })
}
//
// Thin light streak along the upper-left of every thick-enough root segment —
// the lit side that makes the root read as a round volume.
//
function drawRootHighlights(ctx, treeData, rgb, h, groundY, trunkBaseX, trunkHalfW) {
  ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${ROOT_HIGHLIGHT_ALPHA})`
  treeData.rootSegs.forEach(seg => {
    const width = rootSegWidth(seg, h, groundY, trunkBaseX, trunkHalfW)
    if (width < ROOT_HIGHLIGHT_MIN_W) return
    ctx.lineWidth = Math.max(1, width * 0.28)
    ctx.beginPath()
    ctx.moveTo(seg.sx + ROOT_HIGHLIGHT_OFFSET_X, seg.sy + ROOT_HIGHLIGHT_OFFSET_Y)
    ctx.lineTo(seg.ex + ROOT_HIGHLIGHT_OFFSET_X, seg.ey + ROOT_HIGHLIGHT_OFFSET_Y)
    ctx.stroke()
  })
}
//
// Brightness-only helpers for the root relief tones: scale toward black or
// blend toward white (allowed by the palette rule — no new hues appear).
//
function scaleRgbBrightness(c, f) {
  return {
    r: Math.round(c.r * f),
    g: Math.round(c.g * f),
    b: Math.round(c.b * f)
  }
}
function lightenRgb(c, t) {
  return {
    r: Math.round(c.r + (255 - c.r) * t),
    g: Math.round(c.g + (255 - c.g) * t),
    b: Math.round(c.b + (255 - c.b) * t)
  }
}
//
// Returns a copy of a segment chain with widths grown by the given amount
// (both per-side) — used for the outline underdraw of the trunk.
//
function expandChainWidths(segs, extra) {
  return segs.map(seg => ({
    ...seg,
    w: seg.w + extra,
    w2: (seg.w2 ?? seg.w) + extra
  }))
}
//
// Trunk bark uses the real segments only — clip at the ground line.
//
function buildTrunkCollarBarkExtension(treeData, groundY) {
  return { segs: treeData.trunkSegs, clipY: groundY }
}
//
// Fills a connected wood chain (trunk or thick branch run).
//
function fillWoodChain(ctx, segs, rgb, maxY) {
  const { left, right } = buildChainOutline(segs, maxY)
  if (!left.length) return
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  left.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y)
  ctx.closePath()
  ctx.fill()
}
//
// Clips the context to a wood chain silhouette and runs a paint callback.
//
function withChainClip(ctx, segs, maxY, paint) {
  const { left, right } = buildChainOutline(segs, maxY)
  if (!left.length) return
  ctx.save()
  ctx.beginPath()
  left.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y)
  ctx.closePath()
  ctx.clip()
  paint()
  ctx.restore()
}
//
// One fractal crack — a wobbly line that recursively spawns thinner child
// cracks, each of which splits again, so cracks divide into smaller cracks.
//
function drawFractalCrack(ctx, rng, x, y, angle, length, width, tone, alpha, depth) {
  if (length < 4 || width < 0.25 || depth > 4) return
  ctx.strokeStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${alpha})`
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(x, y)
  let cx = x
  let cy = y
  const steps = 3 + Math.floor(rng() * 3)
  const stepLen = length / steps
  for (let i = 0; i < steps; i++) {
    angle += (rng() - 0.5) * 0.5
    cx += Math.cos(angle) * stepLen
    cy += Math.sin(angle) * stepLen
    ctx.lineTo(cx, cy)
    //
    // Mid-crack fork — a smaller crack peels off sideways.
    //
    if (rng() < 0.4) {
      drawFractalCrack(ctx, rng, cx, cy, angle + (rng() > 0.5 ? 0.7 : -0.7) + (rng() - 0.5) * 0.4, length * 0.45, width * 0.55, tone, alpha * 0.85, depth + 1)
    }
  }
  ctx.stroke()
  //
  // Tip split — the crack ends by dividing into finer cracks.
  //
  if (rng() < 0.75) {
    drawFractalCrack(ctx, rng, cx, cy, angle + (rng() - 0.5) * 0.9, length * 0.55, width * 0.6, tone, alpha * 0.85, depth + 1)
  }
}
//
// Sparse fractal cracks over the trunk, mostly running downward.
//
function drawTrunkCracks(ctx, segs, dark, seed, maxY) {
  const rng = createRng(seed)
  withChainClip(ctx, segs, maxY, () => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    const CRACK_COUNT = 9
    for (let i = 0; i < CRACK_COUNT; i++) {
      const segIdx = Math.floor(rng() * segs.length)
      const seg = segs[segIdx]
      const t = rng()
      const sx = seg.sx + (seg.ex - seg.sx) * t + (rng() - 0.5) * seg.w * 0.6
      const sy = seg.sy + (seg.ey - seg.sy) * t
      const angle = Math.PI / 2 + (rng() - 0.5) * 0.6
      drawFractalCrack(ctx, rng, sx, sy, angle, 26 + rng() * 46, 1 + rng() * 0.8, dark, 0.3 + rng() * 0.2, 0)
    }
  })
}
//
// Full trunk bark pass: sun-side shading bands (dark LEFT edge / highlight
// RIGHT edge — the sun sits top-right), wavy bark lines that follow the trunk
// centreline, short horizontal notches and a few knots. Everything is clipped
// to the trunk silhouette and follows the spine, so no straight screen-space
// seams appear on the wobbly trunk.
//
function drawTrunkBark(ctx, segs, dark, highlight, seed, maxY) {
  const { left, right, spine } = buildChainOutline(segs, maxY)
  if (!spine.length) return
  const rng = createRng(seed)
  withChainClip(ctx, segs, maxY, () => {
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    //
    // Shadow band along the left edge (away from the sun) and a soft
    // highlight band along the right edge (facing the sun).
    //
    fillEdgeBand(ctx, left, spine, BARK_SHADOW_BAND_FRAC, dark, BARK_SHADOW_ALPHA)
    fillEdgeBand(ctx, right, spine, BARK_HIGHLIGHT_BAND_FRAC, highlight, BARK_HIGHLIGHT_ALPHA)
    //
    // Wavy bark lines — one per half-width fraction, following the centreline
    // with per-point jitter. Lines on the sunny side use the highlight tone.
    //
    BARK_LINE_FRACS.forEach(frac => {
      const tone = frac > 0.3 ? highlight : dark
      ctx.strokeStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${BARK_LINE_ALPHA_MIN + rng() * BARK_LINE_ALPHA_RANGE})`
      ctx.lineWidth = BARK_LINE_WIDTH_MIN + rng() * BARK_LINE_WIDTH_RANGE
      ctx.beginPath()
      spine.forEach((j, i) => {
        const px = j.x + j.nx * j.hw * frac + (rng() - 0.5) * BARK_LINE_JITTER
        const py = j.y + j.ny * j.hw * frac + (rng() - 0.5) * BARK_LINE_JITTER
        i === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
      })
      ctx.stroke()
    })
    drawBarkStreaks(ctx, rng, spine, dark, highlight)
    drawBarkFurrows(ctx, rng, spine, dark, highlight)
    drawBarkRidges(ctx, rng, spine, dark, highlight)
    drawBarkFissures(ctx, rng, spine, dark)
    drawBarkNotches(ctx, rng, spine, dark)
    drawBarkKnots(ctx, rng, spine, dark)
  })
}
//
// Continuous vertical furrows: each groove follows one half-width fraction
// down the whole trunk with per-point jitter, and a thin lit rim runs right
// beside it — the bark splits into long vertical plates.
//
function drawBarkFurrows(ctx, rng, spine, dark, highlight) {
  for (let i = 0; i < BARK_FURROW_COUNT; i++) {
    const frac = (rng() * 2 - 1) * BARK_FURROW_FRAC_SPAN
    const width = BARK_FURROW_WIDTH_MIN + rng() * BARK_FURROW_WIDTH_RANGE
    //
    // Groove path — one jittered polyline reused for both passes so the lit
    // rim always hugs the same wiggle.
    //
    const pts = spine.map(j => ({
      x: j.x + j.nx * j.hw * frac + (rng() - 0.5) * BARK_FURROW_JITTER,
      y: j.y + j.ny * j.hw * frac + (rng() - 0.5) * BARK_FURROW_JITTER
    }))
    ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BARK_FURROW_ALPHA})`
    ctx.lineWidth = width
    ctx.beginPath()
    pts.forEach((p, idx) => idx === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
    ctx.stroke()
    ctx.strokeStyle = `rgba(${highlight.r}, ${highlight.g}, ${highlight.b}, ${BARK_FURROW_HIGHLIGHT_ALPHA})`
    ctx.lineWidth = 1
    ctx.beginPath()
    pts.forEach((p, idx) => {
      const px = p.x + BARK_FURROW_HIGHLIGHT_OFFSET
      idx === 0 ? ctx.moveTo(px, p.y) : ctx.lineTo(px, p.y)
    })
    ctx.stroke()
  }
}
//
// Long vertical tonal streaks following the trunk centreline: each streak
// hugs one half-width fraction and its alpha swells and fades smoothly
// along the trunk (sin² envelope), so the bark tone transitions gradually
// in the vertical plane — no hard seams between light and dark patches.
//
function drawBarkStreaks(ctx, rng, spine, dark, highlight) {
  for (let i = 0; i < BARK_STREAK_COUNT; i++) {
    const frac = (rng() * 2 - 1) * BARK_STREAK_FRAC_SPAN
    const tone = rng() < 0.5 ? dark : highlight
    const widthFrac = BARK_STREAK_WIDTH_FRAC_MIN + rng() * BARK_STREAK_WIDTH_FRAC_RANGE
    const phase = rng() * Math.PI * 2
    const cycles = 1 + rng()
    for (let j = 0; j < spine.length - 1; j++) {
      const a = spine[j]
      const b = spine[j + 1]
      const t = j / (spine.length - 1)
      //
      // sin² keeps the alpha non-negative and rises/falls without kinks.
      //
      const swell = Math.sin(phase + t * Math.PI * cycles)
      const alpha = BARK_STREAK_ALPHA_MAX * swell * swell
      if (alpha < 0.01) continue
      ctx.strokeStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${alpha})`
      ctx.lineWidth = Math.max(1, a.hw * widthFrac)
      ctx.beginPath()
      ctx.moveTo(a.x + a.nx * a.hw * frac, a.y + a.ny * a.hw * frac)
      ctx.lineTo(b.x + b.nx * b.hw * frac, b.y + b.ny * b.hw * frac)
      ctx.stroke()
    }
  }
}
//
// Horizontal ridge bands crossing the trunk: each ridge follows the local
// trunk normal from edge to edge and sags in the middle, with a soft
// highlight below the dark curve — the stacked-plates bark of the reference
// picture's foreground trees.
//
function drawBarkRidges(ctx, rng, spine, dark, highlight) {
  for (let i = 0; i < BARK_RIDGE_COUNT; i++) {
    //
    // Skip the thin apex joints — ridges live on the readable trunk body.
    //
    const j = spine[Math.floor(rng() * spine.length * 0.85)]
    if (!j || j.hw < 7) continue
    const sag = BARK_RIDGE_SAG_MIN + rng() * BARK_RIDGE_SAG_RANGE
    const edge = BARK_RIDGE_EDGE_FRAC
    const x1 = j.x + j.nx * j.hw * edge
    const y1 = j.y + j.ny * j.hw * edge + (rng() - 0.5) * 3
    const x2 = j.x - j.nx * j.hw * edge
    const y2 = j.y - j.ny * j.hw * edge + (rng() - 0.5) * 3
    const mx = j.x + (rng() - 0.5) * j.hw * 0.3
    const my = (y1 + y2) * 0.5 + sag
    ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BARK_RIDGE_ALPHA})`
    ctx.lineWidth = BARK_RIDGE_WIDTH_MIN + rng() * BARK_RIDGE_WIDTH_RANGE
    ctx.beginPath()
    ctx.moveTo(x1, y1)
    ctx.quadraticCurveTo(mx, my, x2, y2)
    ctx.stroke()
    //
    // Thin light line right below the ridge — the lit top of the next plate.
    //
    ctx.strokeStyle = `rgba(${highlight.r}, ${highlight.g}, ${highlight.b}, ${BARK_RIDGE_HIGHLIGHT_ALPHA})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x1, y1 + BARK_RIDGE_HIGHLIGHT_OFFSET)
    ctx.quadraticCurveTo(mx, my + BARK_RIDGE_HIGHLIGHT_OFFSET, x2, y2 + BARK_RIDGE_HIGHLIGHT_OFFSET)
    ctx.stroke()
  }
}
//
// Short near-vertical fissures between the ridge plates — dark wiggly cuts
// running down the trunk face, splitting the bark into separate slabs.
//
function drawBarkFissures(ctx, rng, spine, dark) {
  ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BARK_FISSURE_ALPHA})`
  for (let i = 0; i < BARK_FISSURE_COUNT; i++) {
    const j = spine[Math.floor(rng() * spine.length * 0.9)]
    if (!j || j.hw < 6) continue
    const frac = (rng() * 2 - 1) * 0.65
    const sx = j.x + j.nx * j.hw * frac
    const sy = j.y + j.ny * j.hw * frac
    const len = BARK_FISSURE_LEN_MIN + rng() * BARK_FISSURE_LEN_RANGE
    ctx.lineWidth = 1 + rng() * 1.1
    ctx.beginPath()
    ctx.moveTo(sx, sy)
    ctx.quadraticCurveTo(sx + (rng() - 0.5) * 4, sy + len * 0.5, sx + (rng() - 0.5) * 5, sy + len)
    ctx.stroke()
  }
}
//
// Plate ridges crossing the thick branches: a short dark curve spanning the
// branch width (perpendicular to the run) that sags toward the branch tip,
// with a thin highlight right after it — the branch version of the trunk's
// stacked-plate bark.
//
function drawBranchRidges(ctx, segs, dark, highlight, seed, maxY) {
  const rng = createRng(seed)
  ctx.lineCap = 'round'
  segs.forEach(seg => {
    if (seg.w < BRANCH_RIDGE_MIN_W || rng() > BRANCH_RIDGE_CHANCE) return
    const dx = seg.ex - seg.sx
    const dy = seg.ey - seg.sy
    const len = Math.hypot(dx, dy) || 1
    const ux = dx / len
    const uy = dy / len
    const nx = -uy
    const ny = ux
    //
    // One or two ridges per qualifying segment, placed along the run.
    //
    const ridgeCount = 1 + Math.floor(rng() * 2)
    for (let i = 0; i < ridgeCount; i++) {
      const t = 0.2 + rng() * 0.6
      const px = seg.sx + dx * t
      const py = seg.sy + dy * t
      if (py > maxY) continue
      const hw = seg.w * 0.5 * BRANCH_RIDGE_EDGE_FRAC
      const sag = 1 + rng() * 2.5
      const x1 = px + nx * hw
      const y1 = py + ny * hw
      const x2 = px - nx * hw
      const y2 = py - ny * hw
      const mx = px + ux * sag
      const my = py + uy * sag
      ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BRANCH_RIDGE_ALPHA})`
      ctx.lineWidth = 1 + rng() * 1.2
      ctx.beginPath()
      ctx.moveTo(x1, y1)
      ctx.quadraticCurveTo(mx, my, x2, y2)
      ctx.stroke()
      //
      // Thin light line right after the ridge — the lit rim of the next plate.
      //
      ctx.strokeStyle = `rgba(${highlight.r}, ${highlight.g}, ${highlight.b}, ${BRANCH_RIDGE_HIGHLIGHT_ALPHA})`
      ctx.lineWidth = 1
      ctx.beginPath()
      ctx.moveTo(x1 + ux * 1.6, y1 + uy * 1.6)
      ctx.quadraticCurveTo(mx + ux * 1.6, my + uy * 1.6, x2 + ux * 1.6, y2 + uy * 1.6)
      ctx.stroke()
    }
  })
}
//
// Short horizontal notches — small curved ridge marks crossing the bark lines.
//
function drawBarkNotches(ctx, rng, spine, dark) {
  ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BARK_NOTCH_ALPHA})`
  for (let i = 0; i < BARK_NOTCH_COUNT; i++) {
    const j = spine[Math.floor(rng() * spine.length)]
    const frac = (rng() * 2 - 1) * 0.7
    const cx = j.x + j.nx * j.hw * frac
    const cy = j.y + j.ny * j.hw * frac
    const len = 3 + rng() * j.hw * 0.35
    ctx.lineWidth = 1 + rng() * 0.8
    ctx.beginPath()
    ctx.moveTo(cx - len * 0.5, cy + (rng() - 0.5) * 2)
    ctx.quadraticCurveTo(cx, cy + 1 + rng() * 2, cx + len * 0.5, cy + (rng() - 0.5) * 2)
    ctx.stroke()
  }
}
//
// A few dark knots — small elongated bark "eyes" on the lower trunk half.
//
function drawBarkKnots(ctx, rng, spine, dark) {
  ctx.strokeStyle = `rgba(${dark.r}, ${dark.g}, ${dark.b}, ${BARK_KNOT_ALPHA})`
  for (let i = 0; i < BARK_KNOT_COUNT; i++) {
    const j = spine[1 + Math.floor(rng() * Math.max(1, spine.length * 0.55))]
    if (!j || j.hw < 8) continue
    const frac = (rng() * 2 - 1) * 0.45
    const cx = j.x + j.nx * j.hw * frac
    const cy = j.y + j.ny * j.hw * frac
    const rx = 2.5 + rng() * 3
    ctx.lineWidth = 1.2
    ctx.beginPath()
    ctx.ellipse(cx, cy, rx, rx * (1.5 + rng()), 0, 0, Math.PI * 2)
    ctx.stroke()
    //
    // Some knots carry a wood-grain spiral curl inside; the rest keep the
    // plain inner ring.
    //
    if (rng() < BARK_CURL_KNOT_CHANCE) {
      drawKnotCurl(ctx, rng, cx, cy, rx)
    } else {
      ctx.beginPath()
      ctx.ellipse(cx, cy, rx * 0.45, rx * 0.8, 0, 0, Math.PI * 2)
      ctx.stroke()
    }
  }
}
//
// A spiral curl inside a knot: the radius shrinks steadily while the angle
// winds through a couple of turns — the grain swirl of a sawn-off branch.
//
function drawKnotCurl(ctx, rng, cx, cy, rx) {
  const startAngle = rng() * Math.PI * 2
  ctx.beginPath()
  for (let p = 0; p <= BARK_CURL_POINTS; p++) {
    const t = p / BARK_CURL_POINTS
    const angle = startAngle + t * Math.PI * 2 * BARK_CURL_TURNS
    const r = rx * (0.9 - 0.7 * t)
    const px = cx + Math.cos(angle) * r
    const py = cy + Math.sin(angle) * r * 1.4
    p === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py)
  }
  ctx.stroke()
}
//
// Fills a soft band hugging one silhouette edge: outer points are the edge
// itself, inner points sit a width-fraction toward the centreline.
//
function fillEdgeBand(ctx, edge, spine, bandFrac, tone, alpha) {
  if (edge.length < 2) return
  ctx.fillStyle = `rgba(${tone.r}, ${tone.g}, ${tone.b}, ${alpha})`
  ctx.beginPath()
  edge.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y))
  for (let i = edge.length - 1; i >= 0; i--) {
    const p = edge[i]
    const c = spine[i]
    ctx.lineTo(p.x + (c.x - p.x) * bandFrac, p.y + (c.y - p.y) * bandFrac)
  }
  ctx.closePath()
  ctx.fill()
}
//
// A few short fractal cracks along the thicker branch runs.
//
function drawBranchCracks(ctx, segs, dark, seed, maxY) {
  const rng = createRng(seed)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  segs.forEach(seg => {
    //
    // Only thick branch segments get cracks — twigs stay clean.
    //
    if (seg.w < 9 || rng() > 0.16) return
    const dx = seg.ex - seg.sx
    const dy = seg.ey - seg.sy
    const along = Math.atan2(dy, dx)
    const sx = seg.sx + dx * rng()
    const sy = seg.sy + dy * rng()
    drawFractalCrack(ctx, rng, sx, sy, along + (rng() - 0.5) * 0.5, 10 + rng() * 16, 0.7 + rng() * 0.5, dark, 0.25 + rng() * 0.15, 1)
  })
}
//
// Parses a hex string into RGB components for bark drawing.
//
function forestHexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16)
  }
}
//
// Builds spreading roots from the trunk base using the shared grow-tree-root
// algorithm — the same one used by the menu background side trees.
// Each root starts nearly vertical and gradually curls outward (left or right)
// via a lateral bias, just like menu trees curl toward the canvas centre.
//
function buildRoots(rng, trunkBase, trunkBottomY, treeH, rootMaxY) {
  const ROOT_COUNT = 5 + Math.floor(rng() * 3)
  const ROOT_W_BASE = 15
  const ROOT_SEGMENTS = 16
  //
  // Roots start slightly above the trunk base line, spread across the trunk
  // base width, so the trunk fill painted after them hides every junction.
  //
  const ROOT_START_LIFT = 6
  const baseSpread = (trunkBase?.w ?? 74) * 0.52
  //
  // Inject seeded random so the whole root network is deterministic — any
  // unseeded draw here would shift every later rng() call and reshape the crown.
  //
  const rand = (min, max) => min + rng() * (max - min)
  const baseX = trunkBase.sx
  const allSegs = []
  for (let r = 0; r < ROOT_COUNT; r++) {
    //
    // Alternate sides: even indices go right (+1), odd go left (-1).
    // lateralBias curves each root outward from the trunk centre.
    //
    const side = r % 2 === 0 ? 1 : -1
    const xJitter = side * rng() * baseSpread
    const startAngle = Math.PI / 2 + side * (0.08 + rng() * 0.14)
    //
    // Positive bias curves LEFT (angle → π), negative bias curves RIGHT (angle → 0).
    //
    const lateralBias = side * 0.028
    //
    // Left-side roots start deeper and must not climb back toward the water line
    //
    const ROOT_LEFT_EXTRA_DROP = 36
    const startY = trunkBottomY - ROOT_START_LIFT + (side === -1 ? ROOT_LEFT_EXTRA_DROP : 0)
    const rootSegs = growTreeRootSegments({
      x: baseX + xJitter,
      y: startY,
      angle: startAngle,
      segments: ROOT_SEGMENTS,
      thickness: ROOT_W_BASE,
      lateralBiasPerSegment: lateralBias,
      rand
    })
    for (const seg of rootSegs) {
      //
      // Left bank: reject upward creep toward the water surface
      //
      if (side === -1) {
        const minY = trunkBottomY + 28
        if (seg.startY < minY - 4 || seg.endY < minY - 4) continue
        if (seg.endY < seg.startY - 3) continue
      } else if (seg.startY < trunkBottomY - ROOT_START_LIFT - 2 || seg.endY < trunkBottomY - ROOT_START_LIFT - 2) {
        continue
      }
      if (seg.endY <= rootMaxY) {
        allSegs.push({ sx: seg.startX, sy: seg.startY, ex: seg.endX, ey: seg.endY, w: seg.width })
      }
    }
  }
  return allSegs
}
//
// Short side limbs on the shore trunk (between ground and the hero branch).
//
function addShoreAccentTrunkSideBranches(rng, trunkSegs, branchSegs, leafEndpoints, branchAttachY, groundY) {
  const trunkBottomY = trunkSegs[0]?.sy ?? groundY
  const span = trunkBottomY - branchAttachY
  SHORE_ACCENT_TRUNK_SIDE_BRANCH_SPECS.forEach(spec => {
    const y = trunkBottomY - span * spec.t
    const seg = trunkSegs.find(s => y <= s.sy && y >= s.ey) ??
      trunkSegs[Math.min(trunkSegs.length - 1, Math.floor(trunkSegs.length * (1 - spec.t)))]
    growShoreAccentLimb(rng, seg.ex, seg.ey, spec.angle, spec.len, spec.w, branchSegs, leafEndpoints)
  })
}
//
// One short leafy stub — no fractal forks, so trunk limbs stay small.
//
function growShoreAccentLimb(rng, x, y, angle, length, thickness, branchSegs, leafEndpoints) {
  const STEP = 4.2
  let cx = x
  let cy = y
  let ang = angle
  const steps = Math.max(3, Math.round(length))
  for (let i = 0; i < steps; i++) {
    const px = cx
    const py = cy
    const t = i / steps
    ang += (rng() - 0.5) * 0.12
    cx += Math.cos(ang) * STEP
    cy += Math.sin(ang) * STEP
    const w = Math.max(1.1, thickness * (1 - t * 0.55))
    branchSegs.push({ sx: px, sy: py, ex: cx, ey: cy, w, w2: Math.max(1, w * 0.82) })
  }
  leafEndpoints.push({ x: cx, y: cy, r: SHORE_ACCENT_SIDE_LEAF_R })
  const fork = ang + (rng() < 0.5 ? -0.7 : 0.7)
  const fx = cx + Math.cos(fork) * STEP * 1.6
  const fy = cy + Math.sin(fork) * STEP * 1.6
  branchSegs.push({ sx: cx, sy: cy, ex: fx, ey: fy, w: 1.6, w2: 1.1 })
  leafEndpoints.push({ x: fx, y: fy, r: SHORE_ACCENT_SIDE_LEAF_R * 0.75 })
}
//
// Main-tree limbs from STRUCTURED_CROWN_LIMBS: each limb grows and forks like
// any branch, but carries fewer, smaller leaf groups so gaps between them
// show the wood and the forest behind.
//
function buildStructuredCrown(rng, trunkSegs, branchSegs, leafEndpoints) {
  const baseSeed = Math.floor(rng() * STRUCTURED_LIMB_SEED_RANGE)
  STRUCTURED_CROWN_LIMBS.forEach((limb, i) => {
    //
    // Own stream per limb: retuning one limb keeps the others' forks as-is.
    //
    const limbRng = createRng(baseSeed + i * STRUCTURED_LIMB_SEED_STEP)
    const segIdx = Math.min(Math.floor(limb.frac * trunkSegs.length), trunkSegs.length - 1)
    const seg = trunkSegs[segIdx]
    const angle = limb.angle + (limbRng() - 0.5) * STRUCTURED_LIMB_ANGLE_JITTER * 2
    growBranch(limbRng, seg.ex, seg.ey, angle, limb.len, seg.w * limb.wFrac, branchSegs, leafEndpoints, 0, false, STRUCTURED_LEAF_STYLE)
  })
}
//
// Sprouts branches from the main trunk at RANDOM heights (upper part of the
// tree). Sides alternate so the canopy stays balanced, but the exact position
// of every branch on the trunk is seeded-random. Each branch then splits
// fractally into smaller leafy branches inside growBranch().
//
function buildBranchesFromTrunk(
  rng, trunkSegs, branchSegs, leafEndpoints,
  fracMin = BRANCH_FRAC_MIN, fracMax = BRANCH_FRAC_MAX, upward = false, skipTopExtra = false,
  thicknessScale = 1, lengthScale = 1, branchCountOverride = null, denseCanopyLeaves = false
) {
  const BRANCH_COUNT = branchCountOverride ?? (7 + Math.floor(rng() * 3))
  for (let i = 0; i < BRANCH_COUNT; i++) {
    const frac = fracMin + rng() * (fracMax - fracMin)
    const segIdx = Math.min(Math.floor(frac * trunkSegs.length), trunkSegs.length - 1)
    const seg = trunkSegs[segIdx]
    const side = i % 2 === 0 ? -1 : 1
    //
    // Upward mode keeps every branch within a narrow fan around vertical, so
    // the foliage climbs above the sprout point instead of spreading sideways.
    //
    const angleBase = upward
      ? -Math.PI / 2 + side * (BRANCH_UP_SPREAD_MIN + rng() * BRANCH_UP_SPREAD_RANGE)
      : (side < 0 ? -Math.PI + 0.3 + rng() * 0.55 : -0.3 - rng() * 0.55)
    const len = (14 + rng() * 20 - frac * 5) * lengthScale
    const w = (8 + (1 - frac) * 16) * thicknessScale
    growBranch(rng, seg.ex, seg.ey, angleBase, Math.max(7, Math.round(len)), w, branchSegs, leafEndpoints, 0, denseCanopyLeaves)
  }
  //
  // Extra near-vertical branches in the top band of the trunk: they thicken
  // the crown with upward growth on every tree (foreground and parallax).
  //
  if (!skipTopExtra) {
    for (let i = 0; i < BRANCH_TOP_EXTRA_COUNT; i++) {
      const frac = BRANCH_TOP_FRAC_MIN + rng() * BRANCH_TOP_FRAC_RANGE
      const segIdx = Math.min(Math.floor(frac * trunkSegs.length), trunkSegs.length - 1)
      const seg = trunkSegs[segIdx]
      const side = i % 2 === 0 ? -1 : 1
      const angle = -Math.PI / 2 + side * (BRANCH_UP_SPREAD_MIN + rng() * BRANCH_UP_SPREAD_RANGE)
      const len = 16 + rng() * 18
      const w = 7 + (1 - frac) * 10
      growBranch(rng, seg.ex, seg.ey, angle, Math.max(8, Math.round(len)), w, branchSegs, leafEndpoints, 0, denseCanopyLeaves)
    }
  }
}
//
// Recursively grows a branch segment, spawning sub-branches and leaf endpoints.
//
function growBranch(rng, x, y, angle, length, thickness, branchSegs, leafEndpoints, depth, denseCanopyLeaves = false, leafStyle = null) {
  if (length <= 2 || thickness < 0.45 || depth > 7) {
    leafEndpoints.push({ x, y, r: 32 + depth * 6, massScale: leafStyle?.massScale })
    return
  }
  const midLeafChance = leafStyle?.midChance ?? (denseCanopyLeaves ? 0.62 : 0.5)
  const STEP = 5 + rng() * 4
  const TIP_TAPER = leafStyle?.tipTaper ?? 0.93
  let cx = x
  let cy = y
  const twigSpots = []
  for (let i = 0; i < length; i++) {
    const px = cx
    const py = cy
    const t = length <= 1 ? 0 : i / (length - 1)
    const nextT = length <= 1 ? 1 : Math.min(1, (i + 1) / (length - 1))
    const segW = thickness * (1 - t * TIP_TAPER)
    const nextSegW = thickness * (1 - nextT * TIP_TAPER)
    angle += (rng() - 0.5) * 0.28 + branchShapeTurn(angle, i, cx, cy)
    cx += Math.cos(angle) * STEP
    cy += Math.sin(angle) * STEP
    branchSegs.push({
      sx: px, sy: py, ex: cx, ey: cy,
      w: Math.max(1.2, segW),
      w2: Math.max(1, nextSegW)
    })
    denseCanopyLeaves && depth <= 2 && i > 0 && i % 2 === 0 && rng() < (0.52 - depth * 0.08) &&
      leafEndpoints.push({ x: cx, y: cy, r: 20 + depth * 4 + rng() * 18 })
    if (depth >= 1 && i > 0 && i % 2 === 0 && rng() < midLeafChance) {
      leafEndpoints.push({ x: cx, y: cy, r: 20 + depth * 5 + rng() * 14, massScale: leafStyle?.massScale })
    }
    leafStyle?.twigs && depth <= TWIG_MAX_DEPTH && i > 0 && i % TWIG_STEP_EVERY === 1 &&
      twigSpots.push({ x: cx, y: cy, angle, w: segW })
  }
  //
  // Twigs grow after the limb loop so the limb's segments stay one
  // contiguous chain (bark / outline chains join consecutive segments).
  //
  twigSpots.forEach(spot => growTwig(spot, branchSegs, leafEndpoints, depth))
  //
  // Scripted limbs fork from their tapered end width (each fork thinner than
  // the wood it grows from); other branches restart from their base width.
  //
  const forkW = leafStyle?.childW ? thickness * (1 - TIP_TAPER) : thickness
  const childW = leafStyle?.childW ?? BRANCH_CHILD_W
  if (rng() < 0.82) {
    growBranch(rng, cx, cy, angle - 0.35 - rng() * 0.2, Math.round(length * 0.65), forkW * childW[0], branchSegs, leafEndpoints, depth + 1, denseCanopyLeaves, leafStyle)
  }
  if (rng() < 0.65) {
    growBranch(rng, cx, cy, angle + 0.35 + rng() * 0.2, Math.round(length * 0.55), forkW * childW[1], branchSegs, leafEndpoints, depth + 1, denseCanopyLeaves, leafStyle)
  }
}
//
// One thin side twig off a limb step, seeded by its position.
//
function growTwig(spot, branchSegs, leafEndpoints, depth) {
  const twigRng = createRng(Math.floor(spot.x * TWIG_HASH_X) ^ Math.floor(spot.y * TWIG_HASH_Y))
  if (twigRng() > TWIG_CHANCE) return
  const side = twigRng() < 0.5 ? -1 : 1
  const off = TWIG_ANGLE_MIN + twigRng() * TWIG_ANGLE_RANGE
  const up = -Math.PI / 2
  const toUp = Math.atan2(Math.sin(up - spot.angle), Math.cos(up - spot.angle))
  const angle = spot.angle + side * off + toUp * TWIG_UP_BIAS
  const len = TWIG_LEN_MIN + Math.floor(twigRng() * (TWIG_LEN_RANGE + 1))
  const w = Math.max(TWIG_W_MIN, spot.w * TWIG_W_FRAC)
  growBranch(twigRng, spot.x, spot.y, angle, len, w, branchSegs, leafEndpoints, depth + 2, false, TWIG_LEAF_STYLE)
}
//
// Per-step turn: gentle pull toward straight up plus a slow wave.
//
function branchShapeTurn(angle, step, x, y) {
  const up = -Math.PI / 2
  const toUp = Math.atan2(Math.sin(up - angle), Math.cos(up - angle))
  const sway = Math.sin(step * BRANCH_SWAY_STEP_FREQ + x * BRANCH_SWAY_POS_FREQ_X + y * BRANCH_SWAY_POS_FREQ_Y)
  return toUp * BRANCH_UPCURVE + sway * BRANCH_SWAY_AMP
}
//
// Builds the special lower-left horizontal branch.
// The horizontal portion has a physics collision box (returned in horizBranch).
// After the horizontal extent the branch turns organic, starting at full HORIZ_W.
//
function buildHorizBranch(rng, trunkSegs, branchSegs, leafEndpoints, horizFrac) {
  const segIdx = Math.min(Math.floor(horizFrac * trunkSegs.length), trunkSegs.length - 1)
  const seg = trunkSegs[segIdx]
  const startX = seg.ex
  const startY = seg.ey
  const endX = startX - HORIZ_BRANCH_LENGTH
  const HORIZ_W = 8
  const N_SEGS = 7
  const xStep = (endX - startX) / N_SEGS
  const horizPlatSegs = []
  let hcx = startX
  let hcy = startY
  //
  // Break horizontal portion into N_SEGS mini-segments with slight y-drift for
  // organic unevenness. First and last segments stay at startY to keep the
  // junction with the trunk and the organic ending clean.
  //
  for (let i = 0; i < N_SEGS; i++) {
    const hpx = hcx
    const hpy = hcy
    hcx = startX + (i + 1) * xStep
    const t0 = i / N_SEGS
    const t1 = (i + 1) / N_SEGS
    const w0 = HORIZ_W * (1 - t0 * HORIZ_BRANCH_TAPER)
    const w1 = HORIZ_W * (1 - t1 * HORIZ_BRANCH_TAPER)
    if (i > 0 && i < N_SEGS - 1) {
      hcy = startY + Math.sin(t1 * Math.PI) * 2.5 + (rng() - 0.5) * HORIZ_BRANCH_CURVE_AMP
    } else {
      hcy = startY
    }
    const bw0 = horizBearWidth(t0)
    const bw1 = horizBearWidth(t1)
    branchSegs.push({
      sx: hpx,
      sy: hpy + (bw0 - w0) * 0.5,
      ex: hcx,
      ey: hcy + (bw1 - w1) * 0.5,
      w: bw0,
      w2: bw1
    })
    horizPlatSegs.push({
      x1: Math.min(hpx, hcx),
      x2: Math.max(hpx, hcx),
      y: Math.min(hpy, hcy) - Math.max(w0, w1) * 0.5
    })
  }
  //
  // Thin twigs leave the top of the load-bearing branch and carry small leaf
  // groups; a tapering continuation off the left tip ends the limb.
  //
  const heroLeaves = []
  HORIZ_BRANCH_TWIGS.forEach(twig => {
    const sx = startX + (endX - startX) * twig.frac
    const twigW = horizBearWidth(twig.frac) * HORIZ_BRANCH_TWIG_W_FRAC
    growBranch(rng, sx, startY - HORIZ_W * 0.3, -Math.PI / 2 + twig.tilt, twig.len, twigW, branchSegs, heroLeaves, 1)
  })
  const tipW = horizBearWidth(1)
  const tipLen = HORIZ_BRANCH_TIP_LEN_MIN + Math.round(rng() * HORIZ_BRANCH_TIP_LEN_RANGE)
  growBranch(rng, endX, startY + (tipW - HORIZ_W * (1 - HORIZ_BRANCH_TAPER)) * 0.5, Math.PI + 0.18 + rng() * 0.2, tipLen, tipW, branchSegs, heroLeaves, 1)
  heroLeaves.forEach(ep => leafEndpoints.push({ ...ep, massScale: HORIZ_BRANCH_LEAF_MASS_SCALE }))
  //
  // physY is the top of the branch visual (center line - half width),
  // so the hero stands on the visible surface rather than floating above it.
  //
  const physY = Math.min(...horizPlatSegs.map(s => s.y))
  return {
    x1: endX,
    x2: startX,
    y: startY,
    physY,
    w: HORIZ_W,
    platSegs: horizPlatSegs
  }
}
//
// Drawn width of the hero branch at fraction t from the trunk.
//
function horizBearWidth(t) {
  return HORIZ_BRANCH_BEAR_W_BASE + (HORIZ_BRANCH_BEAR_W_TIP - HORIZ_BRANCH_BEAR_W_BASE) * t
}
//
// Builds foliage at each branch endpoint: one or two pixel-cloud masses plus
// a few small teardrop accents inside the canopy volume.
//
function buildLeaves(rng, endpoints, shadeCount = 3, denseCanopy = false, detailOpts = {}) {
  const detailMin = detailOpts.detailMin ?? FOLIAGE_DETAIL_LEAVES_MIN
  const detailMax = detailOpts.detailMax ?? FOLIAGE_DETAIL_LEAVES_MAX
  const cloudBonus = detailOpts.cloudCellBonus ?? 0
  const lobeChance = FOLIAGE_CLOUD_LOBE_CHANCE + (detailOpts.lobeChanceBoost ?? 0)
  const extraLobeChance = detailOpts.extraLobeChance ?? 0
  const byHeight = detailOpts.shadeByHeight ?? false
  const crownTop = Math.min(...endpoints.map(ep => ep.y))
  const crown = byHeight ? { top: crownTop, span: Math.max(1, Math.max(...endpoints.map(ep => ep.y)) - crownTop) } : null
  const out = []
  const trunkReach = buildTrunkReach(endpoints, detailOpts.trunkFalloffSegs)
  endpoints.forEach(ep => {
    const trunkT = trunkReach ? trunkReach(ep) : 1
    if (trunkReach && isNearTrunkSkipped(ep, trunkT)) return
    const mass = foliageMassScale(ep, detailOpts.massByRadius) *
      (trunkReach ? TRUNK_NEAR_MASS + (TRUNK_FAR_MASS - TRUNK_NEAR_MASS) * trunkT : 1)
    const spread = Math.min(72, ep.r * 1.08) * Math.sqrt(mass)
    const mainShade = pickEndpointShadeIdx(rng, shadeCount, ep, crown)
    const mainCells = buildAsymmetricPixelCloud(
      rng,
      Math.round((FOLIAGE_CLOUD_CELLS_MIN + (denseCanopy ? FOLIAGE_DENSE_CLOUD_CELL_BONUS : 0) + cloudBonus) * mass),
      Math.round((FOLIAGE_CLOUD_CELLS_MAX + (denseCanopy ? FOLIAGE_DENSE_CLOUD_CELL_BONUS : 0) + cloudBonus) * mass)
    )
    out.push({
      type: 'cluster',
      x: ep.x + (rng() - 0.5) * spread * 0.2,
      y: ep.y + (rng() - 0.5) * spread * 0.12,
      shadeIdx: mainShade,
      vertShade: byHeight,
      cells: mainCells
    })
    const lobeRoll = rng()
    if (lobeRoll < lobeChance) {
      const a = (rng() - 0.5) * Math.PI * 0.9
      const dist = spread * (0.35 + rng() * 0.35)
      out.push({
        type: 'cluster',
        x: ep.x + Math.cos(a) * dist,
        y: ep.y + Math.sin(a) * dist * 0.5,
        shadeIdx: pickEndpointShadeIdx(rng, shadeCount, ep, crown),
        vertShade: byHeight,
        cells: buildAsymmetricPixelCloud(rng, Math.round(FOLIAGE_CLOUD_LOBE_CELLS_MIN * mass), Math.round(FOLIAGE_CLOUD_LOBE_CELLS_MAX * mass))
      })
    }
    extraLobeChance > 0 && rng() < extraLobeChance && out.push({
      type: 'cluster',
      x: ep.x + (rng() - 0.5) * spread * 0.5,
      y: ep.y + (rng() - 0.5) * spread * 0.35,
      shadeIdx: pickEndpointShadeIdx(rng, shadeCount, ep, crown),
      vertShade: byHeight,
      cells: buildAsymmetricPixelCloud(rng, Math.round(FOLIAGE_CLOUD_LOBE_CELLS_MIN * mass), Math.round(FOLIAGE_CLOUD_LOBE_CELLS_MAX * mass))
    })
    const detailSpan = Math.max(0, detailMax - detailMin + 1)
    const detailCount = detailSpan > 0
      ? detailMin + Math.floor(rng() * detailSpan) + (denseCanopy ? FOLIAGE_DENSE_DETAIL_BONUS : 0)
      : 0
    for (let i = 0; i < detailCount; i++) {
      const a = rng() * Math.PI * 2 - Math.PI
      const dist = rng() * spread * 0.75
      const shadeIdx = pickLeafMassShadeIdx(rng, shadeCount)
      out.push({
        type: 'detail',
        x: ep.x + Math.cos(a) * dist,
        y: ep.y + Math.sin(a) * dist * 0.55,
        size: 7 + rng() * 4,
        angle: (rng() - 0.5) * 1.1,
        opacity: 1,
        shadeIdx
      })
    }
  })
  return out
}
//
// Returns ep → 0..1 (0 on the trunk line, 1 at the farthest leaf group), or
// null when the tree has no trunk falloff.
//
function buildTrunkReach(endpoints, trunkSegs) {
  if (!trunkSegs?.length || !endpoints.length) return null
  const dist = ep => Math.min(...trunkSegs.map(s => pointSegmentDistance(ep.x, ep.y, s)))
  const far = Math.max(1, ...endpoints.map(dist))
  return ep => Math.min(1, dist(ep) / far)
}
function pointSegmentDistance(x, y, s) {
  const dx = s.ex - s.sx
  const dy = s.ey - s.sy
  const lenSq = dx * dx + dy * dy
  const u = lenSq > 0 ? Math.max(0, Math.min(1, ((x - s.sx) * dx + (y - s.sy) * dy) / lenSq)) : 0
  return Math.hypot(x - (s.sx + dx * u), y - (s.sy + dy * u))
}
function isNearTrunkSkipped(ep, trunkT) {
  if (trunkT >= TRUNK_SKIP_REACH) return false
  const chance = TRUNK_NEAR_SKIP * (1 - trunkT / TRUNK_SKIP_REACH)
  const roll = createRng(Math.floor(ep.x * TRUNK_SKIP_HASH_X) ^ Math.floor(ep.y * TRUNK_SKIP_HASH_Y))()
  return roll < chance
}
//
// Relative size of one leaf mass: endpoint radius around the reference,
// times an optional per-endpoint scale (hero branch foliage).
//
function foliageMassScale(ep, byRadius) {
  const byR = byRadius ? Math.max(FOLIAGE_MASS_SCALE_MIN, Math.min(FOLIAGE_MASS_SCALE_MAX, ep.r / FOLIAGE_MASS_REF_R)) : 1
  return byR * (ep.massScale ?? 1)
}
//
// Eight-way drift-biased growth → jagged pixel cloud (asymmetric, not round).
//
function buildAsymmetricPixelCloud(rng, cellsMin, cellsMax) {
  const target = cellsMin + Math.floor(rng() * (cellsMax - cellsMin + 1))
  const driftX = (rng() - 0.5) * 2.4
  const driftY = -0.25 - rng() * 1.1
  const dirs = [
    [1, 0], [-1, 0], [0, 1], [0, -1],
    [1, 1], [1, -1], [-1, 1], [-1, -1]
  ]
  const dirWeights = dirs.map(([nx, ny]) => {
    const dot = nx * driftX + ny * driftY
    return Math.max(0.12, 0.45 + dot * 0.38)
  })
  const key = (dx, dy) => `${dx},${dy}`
  const cells = new Map()
  const addCell = (dx, dy) => {
    const k = key(dx, dy)
    if (cells.has(k)) return false
    const detail = rng() < FOLIAGE_CLUSTER_DETAIL_CELL_FRAC
    cells.set(k, { dx, dy, detail })
    return true
  }
  addCell(0, 0)
  const frontier = [{ dx: 0, dy: 0 }]
  let guard = 0
  while (cells.size < target && frontier.length && guard < target * 40) {
    guard++
    const pick = frontier[Math.floor(rng() * frontier.length)]
    const dirIdx = pickWeightedIndex(rng, dirWeights)
    const [nx, ny] = dirs[dirIdx]
    const dx = pick.dx + nx
    const dy = pick.dy + ny
    if (rng() < FOLIAGE_CLOUD_GROWTH_SKIP) continue
    if (!addCell(dx, dy)) continue
    frontier.push({ dx, dy })
    if (frontier.length > target * 3) {
      frontier.splice(0, Math.floor(frontier.length * 0.25))
    }
  }
  return normalizeAndErodeCloudCells(cells, rng)
}
//
// Centers the cloud on its anchor and bites random edge voxels for chaos.
//
function normalizeAndErodeCloudCells(cells, rng) {
  const list = [...cells.values()]
  if (!list.length) return list
  let minX = list[0].dx
  let maxX = list[0].dx
  let minY = list[0].dy
  let maxY = list[0].dy
  list.forEach(c => {
    minX = Math.min(minX, c.dx)
    maxX = Math.max(maxX, c.dx)
    minY = Math.min(minY, c.dy)
    maxY = Math.max(maxY, c.dy)
  })
  const cx = Math.round((minX + maxX) * 0.5)
  const cy = Math.round((minY + maxY) * 0.5)
  const keyed = new Map()
  list.forEach(c => {
    const dx = c.dx - cx
    const dy = c.dy - cy
    keyed.set(`${dx},${dy}`, { dx, dy, detail: c.detail })
  })
  const edge = []
  keyed.forEach((c, k) => {
    const { dx, dy } = c
    const touch =
      !keyed.has(`${dx + 1},${dy}`) ||
      !keyed.has(`${dx - 1},${dy}`) ||
      !keyed.has(`${dx},${dy + 1}`) ||
      !keyed.has(`${dx},${dy - 1}`)
    touch && edge.push(k)
  })
  const removeN = Math.floor(edge.length * FOLIAGE_CLOUD_EDGE_ERODE_FRAC)
  for (let i = 0; i < removeN && edge.length; i++) {
    const idx = Math.floor(rng() * edge.length)
    keyed.delete(edge[idx])
    edge.splice(idx, 1)
  }
  return [...keyed.values()]
}
//
// Picks an index from a weight table.
//
function pickWeightedIndex(rng, weights) {
  let sum = 0
  for (let i = 0; i < weights.length; i++) sum += weights[i]
  let roll = rng() * sum
  for (let i = 0; i < weights.length; i++) {
    roll -= weights[i]
    if (roll <= 0) return i
  }
  return weights.length - 1
}
//
// Draws one foliage entry (pixel cluster or small detail leaf).
//
function drawFoliageItemToCanvas(ctx, item, leafShades, vein, leafOpacity, clusterCellPx, sprig = null) {
  if (item.type === 'cluster') {
    drawFoliageClusterToCanvas(ctx, item, leafShades, leafOpacity, clusterCellPx, sprig)
    return
  }
  const shade = leafShades[item.shadeIdx ?? 0] ?? leafShades[0]
  const opacity = (item.opacity ?? 1) * leafOpacity
  if (sprig) {
    drawSprigLeafToCanvas(ctx, item.x, item.y, item.size * SPRIG_DETAIL_SIZE_SCALE, item.angle, SPRIG_LEAFLETS_MIN, shade, opacity)
    return
  }
  drawLeafToCanvas(ctx, item.x, item.y, item.size, item.angle, shade.r, shade.g, shade.b, opacity, vein)
}
//
// Paints a cluster as snapped pixel blocks; a few cells use the accent shade.
//
function drawFoliageClusterToCanvas(ctx, cluster, leafShades, leafOpacity, clusterCellPx, sprig) {
  const cell = clusterCellPx ?? FOLIAGE_CLUSTER_CELL_PX_DEFAULT
  const ox = Math.round(cluster.x)
  const oy = Math.round(cluster.y)
  clusterLeafDraws(cluster, leafShades, cell, sprig).forEach(d => sprig
    ? drawSprigLeafToCanvas(ctx, ox + d.x, oy + d.y, d.size, d.angle, d.leaflets, d.rgb, leafOpacity)
    : drawLeafToCanvas(ctx, ox + d.x, oy + d.y, d.size, d.angle, d.rgb.r, d.rgb.g, d.rgb.b, leafOpacity, null))
}
//
// Leaf draws of one cluster, relative to its origin. Star crowns keep a
// jittered subset of cells; some stars drop one shade and paint first as a
// back layer that shows through the gaps, a few gain one shade and paint
// last as lit front stars, and inside each layer bottom cells paint first,
// so the upper (lit) stars overlap the lower ones.
//
function clusterLeafDraws(cluster, leafShades, cell, sprig) {
  const rgbs = clusterCellRgbs(cluster, leafShades)
  const clusterHash = (Math.round(cluster.x) * SPRIG_CLUSTER_HASH_X) ^ (Math.round(cluster.y) * SPRIG_CLUSTER_HASH_Y)
  const draws = []
  cluster.cells.forEach((c, i) => {
    const hash = ((c.dx * 73856093) ^ (c.dy * 19349663)) | 0
    const rgb = rgbs[i]
    if (!sprig) {
      draws.push({
        x: c.dx * cell + cell * 0.5,
        y: c.dy * cell + cell * 0.5,
        size: cell * FOLIAGE_CLUSTER_LEAF_SIZE_FRAC,
        angle: ((hash % 628) / 100) - Math.PI,
        rgb
      })
      return
    }
    const starHash = hash ^ clusterHash
    if (hashUnit(starHash, 4) > SPRIG_CELL_KEEP) return
    const jy = (hashUnit(starHash, 2) - 0.5) * 2 * SPRIG_POS_JITTER * cell
    const layerRoll = hashUnit(starHash, 7)
    const layer = layerRoll < SPRIG_BACK_CHANCE ? -1 : layerRoll > 1 - SPRIG_FRONT_CHANCE ? 1 : 0
    const shadeIdx = Math.max(0, Math.min(leafShades.length - 1, leafShades.indexOf(rgb) + layer))
    draws.push({
      x: c.dx * cell + cell * 0.5 + (hashUnit(starHash, 1) - 0.5) * 2 * SPRIG_POS_JITTER * cell,
      y: c.dy * cell + cell * 0.5 + jy,
      dy: c.dy + jy / cell,
      layer,
      size: cell * SPRIG_SIZE_FRAC * (1 + (hashUnit(starHash, 3) - 0.5) * 2 * SPRIG_SIZE_JITTER),
      angle: hashUnit(starHash, 5) * Math.PI * 2,
      leaflets: SPRIG_LEAFLETS_MIN + Math.floor(hashUnit(starHash, 6) * SPRIG_LEAFLETS_RANGE),
      rgb: leafShades.includes(rgb) ? leafShades[shadeIdx] : rgb
    })
  })
  sprig && draws.sort((p, q) => (p.layer - q.layer) || (q.dy - p.dy))
  return draws
}
//
// Stable 0..1 value per cell hash and channel (position / size jitter).
//
function hashUnit(hash, channel) {
  const h = Math.imul(hash ^ (channel * 0x9e3779b1), 0x85ebca6b) >>> 0
  return (h % 10007) / 10007
}
//
// Whether a bake palette uses star leaves instead of classic teardrops.
//
function sprigLook(palette) {
  return Boolean(palette.sprigLeaves)
}
//
// One star leaf: leaflets spread evenly around the joint with a small
// per-leaflet wobble in angle and length (stable per star angle), plus a
// round core that closes the joint. The core winds the same way as the
// drops, otherwise the nonzero fill would punch a hole in the middle.
//
function drawSprigLeafToCanvas(ctx, x, y, size, angle, leaflets, rgb, opacity) {
  ctx.globalAlpha = opacity
  ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
  ctx.beginPath()
  const step = (Math.PI * 2) / leaflets
  for (let k = 0; k < leaflets; k++) {
    const wobble = Math.sin(angle * SPRIG_WOBBLE_ANGLE_FREQ + k * SPRIG_WOBBLE_STEP)
    const a = angle + k * step + wobble * SPRIG_LEAFLET_ANGLE_JITTER
    const shrink = 0.5 + 0.5 * Math.cos(angle * SPRIG_LEN_ANGLE_FREQ + k * SPRIG_LEN_STEP)
    const len = size * SPRIG_LEAFLET_LEN * (1 - SPRIG_LEAFLET_LEN_JITTER * shrink)
    addLeafletDrop(ctx, x, y, len, size * SPRIG_LEAFLET_WID, a)
  }
  ctx.moveTo(x + size * SPRIG_CORE_R, y)
  ctx.arc(x, y, size * SPRIG_CORE_R, 0, Math.PI * 2, true)
  ctx.fill()
  ctx.globalAlpha = 1
}
//
// Adds one drop leaflet to the current path: the point sits on the joint,
// the sides swell out and close in a round end. Every drop winds the same
// way, so overlaps inside one path never punch holes.
//
function addLeafletDrop(ctx, x, y, len, wid, angle) {
  const r = wid * 0.5
  const dx = Math.cos(angle)
  const dy = Math.sin(angle)
  const cx = x + dx * (len - r)
  const cy = y + dy * (len - r)
  const kx = x + dx * len * SPRIG_DROP_NECK
  const ky = y + dy * len * SPRIG_DROP_NECK
  ctx.moveTo(x, y)
  ctx.quadraticCurveTo(kx - dy * r, ky + dx * r, cx - dy * r, cy + dx * r)
  ctx.arc(cx, cy, r, angle + Math.PI / 2, angle - Math.PI / 2, true)
  ctx.quadraticCurveTo(kx + dy * r, ky - dx * r, x, y)
}
//
// Per-cell colours of a cluster: detail cells take the accent shade; with
// vertShade the lowest cells drop one shade and the top cells gain one, so
// every leaf group reads lit from above.
//
function clusterCellRgbs(cluster, leafShades) {
  const shadeIdx = cluster.shadeIdx ?? 1
  const maxIdx = leafShades.length - 1
  const accentIdx = shadeIdx <= 0 ? Math.min(maxIdx, 1) : Math.max(0, shadeIdx - 1)
  const dys = cluster.cells.map(c => c.dy)
  const minDy = Math.min(...dys)
  const spanDy = Math.max(1, Math.max(...dys) - minDy)
  return cluster.cells.map(c => {
    if (c.detail) return leafShades[accentIdx] ?? leafShades[0]
    if (!cluster.vertShade) return leafShades[shadeIdx] ?? leafShades[0]
    const t = (c.dy - minDy) / spanDy
    const shift = t > CLUSTER_SHADE_LOW_FRAC ? -1 : t < CLUSTER_SHADE_HIGH_FRAC ? 1 : 0
    return leafShades[Math.max(0, Math.min(maxIdx, shadeIdx + shift))] ?? leafShades[0]
  })
}
//
// Main-tree crowns shade masses by height; other trees keep the random mix.
//
function pickEndpointShadeIdx(rng, shadeCount, ep, crown) {
  if (!crown) return pickLeafMassShadeIdx(rng, shadeCount)
  return pickCrownHeightShadeIdx(rng, shadeCount, (ep.y - crown.top) / crown.span)
}
//
// t = 0 at the crown top … 1 at its lowest leaf group.
//
function pickCrownHeightShadeIdx(rng, shadeCount, t) {
  const maxIdx = Math.max(0, Math.min(2, shadeCount - 1))
  const u = rng()
  if (t > CROWN_SHADE_LOW_T) return u < 0.75 ? 0 : Math.min(1, maxIdx)
  if (t < CROWN_SHADE_HIGH_T) return u < 0.6 ? maxIdx : Math.min(1, maxIdx)
  if (u < 0.15) return 0
  return u < 0.85 ? Math.min(1, maxIdx) : maxIdx
}
function pickLeafMassShadeIdx(rng, shadeCount) {
  const maxIdx = Math.max(0, Math.min(2, shadeCount - 1))
  if (maxIdx === 0) return 0
  const u = rng()
  if (maxIdx === 1) return u < 0.72 ? 0 : 1
  if (u < 0.18) return 0
  if (u < 0.78) return 1
  return maxIdx >= 2 ? 2 : 1
}
//
// Draws a single leaf to a canvas2D context — same shape as the touch L1
// note trees: quadratic-curve teardrop with a centre vein line.
//
function drawLeafToCanvas(ctx, x, y, size, angle, r, g, b, opacity, vein) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${opacity})`
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(-size * 0.6, -size * 0.3, 0, -size)
  ctx.quadraticCurveTo(size * 0.6, -size * 0.3, 0, 0)
  ctx.closePath()
  ctx.fill()
  //
  // Centre vein — skipped entirely when the palette disables leaf details.
  //
  if (vein) {
    ctx.strokeStyle = `rgba(${vein.r}, ${vein.g}, ${vein.b}, ${0.35 * opacity})`
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(0, 0)
    ctx.lineTo(0, -size)
    ctx.stroke()
  }
  ctx.restore()
}
