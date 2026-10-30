import * as Lake from '../../forest/utils/forest-lake.js'
import { paintForestShoreRock } from '../../forest/utils/forest-shore-rock.js'
import * as Layout from './cave-layout.js'
import { plantShape, axisAt, PLANT_FOOT } from './cave-plant-shape.js'
import { CAVE_PAL, css, paintMossStrand, paintEdgeFern } from './cave-paint.js'
//
// Bake of the monster plant's body into the terrain canvas, aiming at the
// reference: a mossy rock island in the lake, one main woody vine with
// many thinner ones winding around it, vines peeling off toward the leaves
// and splitting into a brush under each pad. Every vine is shaded as a
// cylinder lit from the upper left and carries real bark: furrows meeting
// in a diamond net, broken plates, knots. The vines are cut into pieces by
// depth and painted back to front, so the thin ones pass behind and in
// front of the main one; pieces behind it are darker, nearer ones cast a
// soft shadow and carry small leaves. Ivy patches and leafy moss strands
// hang over it all.
//
const LIGHT = { x: -0.7, y: -0.7 }
//
// Depth: vines are cut where their depth crosses one of Z_BINS bands and
// the pieces are painted back to front, overlapping a few points at the
// cuts (flat ends there). Pieces behind the main vine get a dark veil;
// nearer ones shade what lies behind them and carry moss and leaves.
//
const Z_BINS = 6
const PIECE_OVERLAP = 2
const DEPTH_SHADE = 0.6
const AO_MIN_Z = 0
const PLATE_MIN_Z = -0.2
const MOSS_MIN_Z = 0.4
//
// Small leaves growing right on the near vines: one try every LEAF_EVERY
// px (with LEAF_CHANCE), a cluster of 1–LEAF_CLUSTER leaves on one side of
// the vine pointing out and down.
//
const LEAF_MIN_Z = 0.1
const LEAF_EVERY = 14
const LEAF_CHANCE = 0.55
const LEAF_CLUSTER = 3
const LEAF_SIZE_MIN = 4
const LEAF_SIZE_RANGE = 3
const LEAF_OUT = 0.45
const LEAF_SPREAD = 4
const LEAF_TILT = 0.9
const LEAF_DROOP = 0.5
const LEAF_LIGHT_CHANCE = 0.4
const ROUND_CAPS = { start: true, end: true }
//
// Trunk stems: lit oak-bark plates in the vine wood tones; the thin vines
// winding around them stand apart by their outline and shadow.
//
const MAIN_STEP = 0
//
// Dark shadow between the stems (share of the bundle width, height span).
//
const GAP_W = 0.55
//
// Stems get a heavier outline and a deeper shadow on what lies behind
// them, so each one reads as its own round stem.
//
const STEM_CONTOUR_EXTRA = 5
const STEM_AO_ALPHA = 0.55
const GAP_FROM = 0.04
const GAP_TO = 0.85
//
// Cylinder shading: band widths (share of the strand width) and offsets.
//
const CONTOUR_EXTRA = 2.6
const SHADOW_W = 0.5
const SHADOW_OFF = 0.26
const EDGE_W = 0.18
const EDGE_OFF = 0.42
const EDGE_ALPHA = 0.7
const LIT_W = 0.34
const LIT_OFF = 0.22
const LIT_ALPHA = 0.7
//
// Rough silhouette: the contour and base swell and shift by a pixel or two
// along the strand (noise over the distance along it).
//
const ROUGH_AMP = 1.6
const ROUGH_FREQ = 4
const ROUGH_SEED = 2.9
const ROUGH_SHIFT_SEED = 6.3
//
// Soft shadow a near piece casts on what is already painted behind it.
//
const AO_W = 1.6
const AO_OFF = 0.35
const AO_ALPHA = 0.32
//
// Bark on every strand: deep furrows that wave in opposite phase so
// neighbours meet and part again (diamond plates), then fine short cracks.
// Angles go around the strand axis; the visible face is cos(angle) > 0, so
// furrows crowd and narrow toward the silhouette like on a real cylinder.
// Furrow width follows the strand width up to BARK_REF_W.
//
const DEEP_FURROWS = {
  wave: 0.22,
  waveLenMin: 55,
  waveLenRange: 50,
  drift: 0.012,
  width: 4.5,
  breakChance: 0.015,
  gapMin: 2,
  gapRange: 5,
  alpha: 1,
  rim: true
}
const FINE_FURROWS = {
  wave: 0.08,
  waveLenMin: 30,
  waveLenRange: 30,
  drift: 0.02,
  width: 1.6,
  breakChance: 0.12,
  gapMin: 1,
  gapRange: 4,
  alpha: 0.55,
  rim: false
}
//
// Light fibres: thin pale streaks running along the wood between the
// furrows (the reference's ropey grain).
//
const FIBRES = {
  wave: 0.1,
  waveLenMin: 40,
  waveLenRange: 40,
  drift: 0.02,
  width: 1.2,
  breakChance: 0.06,
  gapMin: 2,
  gapRange: 6,
  alpha: 0.5,
  rim: false,
  light: true
}
const FIBRES_PER_DEEP = 2
const BARK_REF_W = 44
const FACE_INSET = 0.92
const FACE_MIN = 0.12
const FURROW_MIN_W = 0.7
const FURROW_SHADE_W = 2.2
const FURROW_SHADE_ALPHA = 0.45
const RIM_OFF = 1.2
const RIM_W = 1.8
const RIM_ALPHA = 0.75
const DRIFT_LIMIT = 0.25
const BASE_JITTER = 0.5
const RIM_MIN_W = 0.5
const MIN_DETAIL_W = 6
//
// Furrow count by vine width; the bark twists along each vine like wrung
// wood.
//
const FURROW_PX = 6
const DEEP_MIN = 2
const DEEP_MAX = 9
const FINE_PER_DEEP = 2
const BARK_TWIST = 0.03
//
// Trunk stems and thicker vines carry oak-like bark: a fractal net of fissures laid
// out around the stem (angle) and along it (point index). Long wandering
// fissures run along the stem (midpoint displacement sideways), fork into
// thinner, fainter ones again and again, and short cross breaks split the
// ridges between them into uneven plates. A second, finer net of short
// forking micro-cracks breaks the plates up again, and clusters of tiny
// bark scales (themselves grouped in sub-clusters) sit on them. Grain is
// almost straight.
//
// Each net: one fissure per `px` of stem width around it, run length
// (points along the stem), sideways drift and wander, subdivision levels,
// fork depth, line width share.
//
const MAIN_TWIST = 0.004
const OAK_NET = { px: 4.5, runMin: 14, runRange: 34, runAvg: 24, drift: 0.3, wander: 0.6, subdiv: 4, depth: 3, w: 1 }
const OAK_FINE_NET = { px: 2.2, runMin: 4, runRange: 9, runAvg: 7, drift: 0.5, wander: 0.8, subdiv: 3, depth: 3, w: 0.55 }
//
// Every vine at least this wide (trunk stems, the branches to the leaves,
// their brushes, the thicker winding vines) gets the oak bark; thinner
// ones keep plain grooves.
//
const OAK_MIN_VINE_W = 9
const OAK_FORKS = 2
const OAK_FORK_FROM = 0.15
const OAK_FORK_SPAN = 0.7
const OAK_FORK_TURN = 0.25
const OAK_FORK_TURN_RANGE = 0.35
const OAK_FORK_LEN = 0.35
const OAK_FORK_LEN_RANGE = 0.3
const OAK_FADE = 0.62
const OAK_CROSS_EVERY = 1
const OAK_CROSS_CHANCE = 0.6
const OAK_CROSS_SPAN = 0.15
const OAK_CROSS_SPAN_RANGE = 0.25
const OAK_CROSS_SAG = 0.6
const OAK_CROSS_W = 0.55
const OAK_W = 2.8
const OAK_MIN_W = 0.5
const OAK_SHADE_W = 1.3
const OAK_SHADE_ALPHA = 0.3
//
// Bark scales: clusters per point of stem length and per px of width,
// sub-clusters per cluster, scales per sub-cluster, their spread (points
// along / angle around, halving each level), size across the stem.
//
const SCALE_CLUSTERS = 0.025
const SCALE_SUBS = 3
const SCALE_PER_SUB = 4
const SCALE_SPREAD_V = 4
const SCALE_SPREAD_U = 0.5
const SCALE_LEN = 0.09
const SCALE_LEN_RANGE = 0.08
const SCALE_TILT = 0.4
const SCALE_LIT_ALPHA = 0.75
const SCALE_SHADOW_ALPHA = 0.6
const SCALE_W = 1
const TWIST_FLIP_CHANCE = 0.5
//
// Broken plates: short cross cracks between neighbouring deep furrows,
// with a lit lip on their far side.
//
const PLATE_CRACK_CHANCE = 0.035
const PLATE_CRACK_W = 1.6
const PLATE_CRACK_SAG = 2.5
const PLATE_LIP_ALPHA = 0.5
const PLATE_MAX_ANGLE = 1
//
// Knots on the near faces of thick vines: hollow, growth rings, lit rim.
//
const KNOT_CHANCE = 0.35
const KNOT_MIN_W = 22
const KNOT_MIN_Z = 0.6
const KNOT_R_SHARE = 0.16
const KNOT_FLAT = 0.62
const KNOT_RINGS = [1.6, 2.3]
const KNOT_RING_ALPHA = 0.55
const KNOT_RING_W = 1.5
const KNOT_HOLE = 0.6
const KNOT_HOLE_SHIFT = 1
const KNOT_LIT_R = 1.15
const KNOT_LIT_W = 1.2
const KNOT_EYE_CLEAR = 6
const KNOT_LIT_FROM = Math.PI * 1.05
const KNOT_LIT_TO = Math.PI * 1.7
//
// Lichen speckles on the bark (rare warm accent).
//
const LICHEN_CLUSTERS = 9
const LICHEN_DOTS = 6
const LICHEN_SPREAD = 7
const LICHEN_R_MIN = 0.8
const LICHEN_R_RANGE = 1.2
const LICHEN_ACROSS = 0.35
//
// Ivy patches clinging to the main vine, thicker toward the foot.
//
const IVY_PATCHES = 10
const IVY_LOW_BIAS = 1.6
const IVY_T_MAX = 0.92
const IVY_ACROSS = 0.45
const IVY_RX_MIN = 14
const IVY_RX_RANGE = 18
const IVY_RY_MIN = 22
const IVY_RY_RANGE = 26
const IVY_DENSITY = 0.014
const IVY_LEAF_MIN = 4.5
const IVY_LEAF_RANGE = 3
const IVY_DROOP = 0.7
const IVY_SHADOW = { x: 1, y: 1.6 }
const IVY_LIT_SHARE = 0.35
const IVY_DARK_SHARE = 0.75
const IVY_GLOW_CHANCE = 0.06
//
// Real leaves (on the vines and in the leafy patches): a pointed oval a
// little bent and lopsided, its lower half in shade, a lit midrib and side
// veins that wander and fork once more (a small fractal net), a thin dark
// edge, over a drop shadow. Sizes are shares of the leaf size.
//
const FOLIAGE_LEN = 2.3
const FOLIAGE_HALF_W = 0.55
const FOLIAGE_BEND = 0.25
const FOLIAGE_SKEW = 0.35
const FOLIAGE_SHADE_ALPHA = 0.35
const FOLIAGE_EDGE_ALPHA = 0.6
const FOLIAGE_EDGE_W = 0.8
const FOLIAGE_RIB_W = 0.16
const FOLIAGE_RIB_MIN_W = 0.7
const FOLIAGE_VEIN_ALPHA = 0.75
const FOLIAGE_PAIRS_MIN = 3
const FOLIAGE_PAIRS_RANGE = 2
const FOLIAGE_VEIN_FROM = 0.12
const FOLIAGE_VEIN_SPAN = 0.7
const FOLIAGE_VEIN_AHEAD = 0.2
const FOLIAGE_VEIN_REACH = 0.85
const FOLIAGE_VEIN_WANDER = 0.15
const FOLIAGE_VEIN_DEPTH = 2
const FOLIAGE_FORK_TURN = 0.5
const FOLIAGE_FORK_LEN = 0.5
const FOLIAGE_FORK_FADE = 0.6
const FOLIAGE_CTRL_NEAR = 0.25
const FOLIAGE_CTRL_FAR = 0.7
const FOLIAGE_CTRL_NEAR_W = 1.2
const FOLIAGE_CTRL_FAR_W = 0.9
//
// Other plants on the trunk stems' near faces: fern clumps and tufts of
// narrow blades growing out sideways and up (tilt from upright), clear of
// the eyes.
//
const STEM_PLANT_MIN_Z = 0.2
const STEM_PLANT_OUT = 0.4
const STEM_PLANT_TILT_MIN = 0.4
const STEM_PLANT_TILT_RANGE = 0.7
const STEM_PLANT_EYE_CLEAR = 2.5
const STEM_PLANT_TRIES = 6
const FERNS = 12
const FERN_SCALE_MIN = 0.45
const FERN_SCALE_RANGE = 0.3
const TUFTS = 12
const TUFT_BLADES_MIN = 5
const TUFT_BLADES_RANGE = 4
const TUFT_SPREAD = 1.1
const TUFT_LEN_MIN = 10
const TUFT_LEN_RANGE = 14
const TUFT_W = 2.6
const TUFT_DROOP = 0.35
const TUFT_STEPS = 8
//
// Moss on the near vine pieces: clump chance, blob count / size.
//
const MOSS_CHANCE = 0.05
const MOSS_LIT_BIAS = 1.6
const MOSS_ACROSS_SHIFT = 0.55
const MOSS_BLOBS = 12
const MOSS_SPREAD = 0.45
const MOSS_R_MIN = 1.4
const MOSS_R_RANGE = 3
//
// The plant is painted on its own layer (world box below), tinted with the
// lake's water under the surface and clipped at the lake bed, so its foot
// stands in the water and grows out of the bed.
//
const LAYER = { x1: 280, y1: 360, x2: 1040 }
//
// Big separate stones on the lake bed around the foot (the forest shore
// pile's look), lying at random: each at an offset from the foot across
// BED_SPREAD, its own half-width, its top above or below the water line
// (negative: breaking the surface), some tilted. Back stones are behind
// the stems, front ones before them.
//
const BED_BACK_COUNT = 7
const BED_FRONT_COUNT = 5
const BED_SPREAD = 130
const BED_RX_MIN = 26
const BED_RX_RANGE = 42
const BED_TOP_MIN = -48
const BED_TOP_RANGE = 66
const BED_FRONT_LOWER = 10
const BED_TILT = 0.35
const STONE_ARC_POW = 0.7
//
// Scree under the bed stones: a heap widening downward like a triangle
// from just under the stones' tops, its left flank running far down-left
// (offsets from the foot; apex relative to the water line).
//
const SCREE_APEX_DX = -10
const SCREE_APEX_TOP = -6
const SCREE_LEFT_DX = -330
const SCREE_RIGHT_DX = 190
const SCREE_FLANK_STEPS = 8
const SCREE_FLANK_BULGE = 14
const STONE_ARC_STEPS = 18
const STONE_OUTLINE_W = 2
//
// Plants on the stone tops above the water.
//
const STONE_GREENS = 4
const STONE_GREEN_SPAN = 0.9
const STONE_GREEN_ABOVE = 3
const STONE_FERN_SCALE = 0.4
const STONE_FERN_RANGE = 0.25
const STONE_FERN_TILT = 0.5
//
// Greens over the trunk's foot: very dense at the waterline, thinning as
// the vines climb (bias pushes picks toward the foot).
//
const FOOT_CLUSTERS = 90
const FOOT_BIAS = 2.4
const FOOT_T_MAX = 0.42
const FOOT_ACROSS = 1.3
const FOOT_LEAVES_MIN = 5
const FOOT_LEAVES_RANGE = 5
const FOOT_SPREAD = 14
const FOOT_LEAF_MIN = 4.5
const FOOT_LEAF_RANGE = 3
const FOOT_HANG = 0.9
const FOOT_FERNS = 22
const FOOT_TUFTS = 22
const FOOT_FERN_SCALE = 0.45
const FOOT_FERN_RANGE = 0.35
const FOOT_TILT = 0.9
const LEAF_THIN = 0.75
const STEM_PLANT_BIAS = 1.8
//
// Short moss strands baked onto the vines (the long ones sway, see
// plant-strands.js): count, where along the host, length.
//
const ROPE_STRANDS = 26
const ROPE_STRAND_MIN_Z = 0.2
const ROPE_STRAND_LEN_MIN = 18
const ROPE_STRAND_LEN_RANGE = 70
//
// Thorns right of the second leaf.
//
const THORN_STEP_MIN = 9
const THORN_STEP_RANGE = 8
const THORN_LEN_MIN = 12
const THORN_LEN_RANGE = 16
const THORN_W_MIN = 5
const THORN_W_RANGE = 4
const THORN_SINK = 0.42
const THORN_TILT = 0.45
const THORN_CURL = 0.3
const THORN_BELLY = 0.35
const THORN_CONTOUR_W = 1.2
const THORN_LIT_FROM = 0.15
const THORN_LIT_TO = 0.75
const THORN_LIT_SHIFT = 0.22
const THORN_RIGHT_CHANCE = 0.35
const THORN_STEP_DENSE = 7
const THORN_STEP_DENSE_RANGE = 6
const FULL_TURN = Math.PI * 2
const HALF = 0.5

/**
 * Paints the whole plant body (no leaves) into a world-sized canvas: on its
 * own layer, tinted under the water line and clipped at the lake bed.
 * @param {CanvasRenderingContext2D} ctx
 * @param {() => number} rng - Seeded random
 * @param {Object} lake - Lake instance (bed line)
 */
export function paintPlant(ctx, rng, lake) {
  const layer = document.createElement('canvas')
  layer.width = LAYER.x2 - LAYER.x1
  layer.height = Layout.WORLD_H - LAYER.y1
  const lctx = layer.getContext('2d')
  lctx.translate(-LAYER.x1, -LAYER.y1)
  paintPlantLayer(lctx, rng)
  lctx.setTransform(1, 0, 0, 1, 0, 0)
  Lake.tintUnderwater(lctx, layer.width, layer.height, Layout.LAKE_SURFACE_Y - LAYER.y1)
  ctx.save()
  Lake.clipToBed(ctx, lake, 0, 0, Layout.WORLD_W, Layout.WORLD_H)
  ctx.drawImage(layer, LAYER.x1, LAYER.y1)
  ctx.restore()
  layer.width = 0
}
//
// Everything of the plant, in world coordinates: bed stones behind, the
// vines back to front, bed stones in front, then the greens.
//
function paintPlantLayer(ctx, rng) {
  const shape = plantShape()
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const backStones = bedStones(BED_BACK_COUNT, 0, rng)
  const frontStones = bedStones(BED_FRONT_COUNT, BED_FRONT_LOWER, rng)
  paintScree(ctx, rng)
  paintBedStones(ctx, backStones, rng)
  paintGaps(ctx, shape.axis)
  const vines = shape.vines.map((pts, i) => prepareVine(pts, rng, i < shape.stemCount))
  vines.flatMap(depthPieces).sort((a, b) => a.z - b.z).forEach(piece => paintPiece(ctx, piece, shape.eyes, rng))
  paintBedStones(ctx, frontStones, rng)
  paintLichen(ctx, shape.axis, rng)
  paintIvy(ctx, shape.axis, rng)
  paintStoneGreens(ctx, [...backStones, ...frontStones], rng)
  paintFootFoliage(ctx, shape, rng)
  paintStemPlants(ctx, shape, rng)
  paintRopeStrands(ctx, shape.vines, rng)
  paintThorns(ctx, shape.axis, rng)
}

/**
 * Points on the plant's near vines where long swaying strands hang from.
 * @param {number} count - How many
 * @param {() => number} rng - Seeded random
 * @returns {Array<{x: number, y: number}>}
 */
export function ropeStrandAnchors(count, rng) {
  return ropeStrandAnchorsFrom(plantShape().vines, count, rng)
}
//
// Deep shadow inside the stem rope: the gaps between the stems read dark.
//
function paintGaps(ctx, axis) {
  const pts = axis.filter(p => p.t > GAP_FROM && p.t < GAP_TO)
  band(ctx, pts, GAP_W, 0, 0, css(CAVE_PAL.plantWood[0]), ROUND_CAPS)
}
//
// Wood tones (contour, deep, dark, mid, light) shifted darker by a number
// of steps; the contour stays.
//
function woodTones(step) {
  const wood = CAVE_PAL.plantWood
  return wood.map((tone, i) => (i === 0 ? tone : wood[Math.max(1, i - step)]))
}
//
// A vine ready to paint in pieces: its tones, rough silhouette and bark
// worked out on the whole vine, so neither restarts at a cut.
//
function prepareVine(pts, rng, main) {
  const step = main ? MAIN_STEP : 0
  const maxW = Math.max(...pts.map(p => p.w))
  const deep = Math.max(DEEP_MIN, Math.min(DEEP_MAX, Math.round(maxW / FURROW_PX)))
  const twist = (rng() < TWIST_FLIP_CHANCE ? -1 : 1) * (main ? MAIN_TWIST : BARK_TWIST)
  const bark = maxW >= OAK_MIN_VINE_W ? oakBarkFor(pts, rng, maxW) : barkFor(pts, rng, deep, deep * FINE_PER_DEEP, twist)
  return { pts, stem: main, tones: woodTones(step), rough: roughen(pts), bark }
}
//
// Index spans of one vine where its depth stays in one band, padded past
// the cuts; a cut end is flat, a real vine end round.
//
function depthPieces(vine) {
  const pts = vine.pts
  const last = pts.length - 1
  const out = []
  let from = 0
  for (let i = 1; i <= pts.length; i++) {
    if (i <= last && depthBin(pts[i].z) === depthBin(pts[from].z)) continue
    const to = i - 1
    const a = Math.max(0, from - PIECE_OVERLAP)
    const b = Math.min(last, to + PIECE_OVERLAP)
    const z = pts.slice(from, to + 1).reduce((sum, p) => sum + p.z, 0) / (to - from + 1)
    out.push({ vine, a, b, z, caps: { start: a === 0, end: b === last } })
    from = i
  }
  return out
}
function depthBin(z) {
  return Math.min(Z_BINS - 1, Math.floor((z + 1) / 2 * Z_BINS))
}
//
// One piece: shadow on what is behind (near pieces), cylinder shading,
// bark, a dark veil by depth, a knot and moss on the nearest faces.
//
function paintPiece(ctx, piece, eyes, rng) {
  const { vine, a, b, z, caps } = piece
  const pts = vine.pts.slice(a, b + 1)
  const rough = vine.rough.slice(a, b + 1)
  const tones = vine.tones
  z > AO_MIN_Z && paintOcclusion(ctx, pts, tones[0], caps, vine.stem ? STEM_AO_ALPHA : AO_ALPHA)
  paintCylinder(ctx, pts, rough, tones, caps, vine.stem ? STEM_CONTOUR_EXTRA : CONTOUR_EXTRA)
  paintBarkSpan(ctx, vine.pts, vine.bark, tones, a, b, z > PLATE_MIN_Z, rng)
  z < 0 && band(ctx, rough, 1, CONTOUR_EXTRA, 0, css(tones[0], DEPTH_SHADE * -z), caps)
  z > KNOT_MIN_Z && rng() < KNOT_CHANCE && paintPieceKnot(ctx, pts, eyes, tones)
  z > MOSS_MIN_Z && paintMoss(ctx, pts, rng)
  z > LEAF_MIN_Z && paintVineLeaves(ctx, pts, rng)
}
//
// Contour and base on the rough silhouette, then shadow band, dark edge
// and a soft lit band (bark has no gloss; the light gathers on plate lips).
//
function paintCylinder(ctx, pts, rough, tones, caps, outline = CONTOUR_EXTRA) {
  const [contour, deep, dark, mid, light] = tones
  band(ctx, rough, 1, outline, 0, css(contour), caps)
  band(ctx, rough, 1, 0, 0, css(mid), caps)
  band(ctx, pts, SHADOW_W, 0, SHADOW_OFF, css(dark), caps)
  band(ctx, pts, EDGE_W, 0, EDGE_OFF, css(deep, EDGE_ALPHA), caps)
  band(ctx, pts, LIT_W, 0, -LIT_OFF, css(light, LIT_ALPHA), caps)
}
//
// Strand points with a lumpy width and a slightly wandering centre.
//
function roughen(pts) {
  return strandFrames(pts).map((fr, i) => {
    const p = pts[i]
    const shift = Layout.profileNoise(fr.along * ROUGH_FREQ, ROUGH_SHIFT_SEED) * ROUGH_AMP / 2
    return { ...p, x: p.x + fr.g.x * shift, y: p.y + fr.g.y * shift, w: p.w + Layout.profileNoise(fr.along * ROUGH_FREQ, ROUGH_SEED) * ROUGH_AMP }
  })
}
//
// Soft shadow a near strand casts on what is already painted behind it
// (other vines, the core, rock) — never on empty canvas, where the cave
// backdrop shows through and a shadow tone would read lighter than the dark.
//
function paintOcclusion(ctx, pts, contour, caps, alpha) {
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  band(ctx, pts, AO_W, 1, AO_OFF, css(contour, alpha), caps)
  ctx.restore()
}
//
// Ribbon along the strand, offset across it toward the shadow side (positive
// offset) or the lit side (negative); filled once as one tapered shape (round
// or flat ends) so translucent tones do not stack up where segments overlap.
//
function band(ctx, pts, wShare, extra, offShare, color, caps) {
  const left = []
  const right = []
  const ends = []
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const n = shadowNormal(a, b)
    const g = sideNormal(a, b)
    const c = { x: p.x + n.x * p.w * offShare, y: p.y + n.y * p.w * offShare }
    const half = Math.max(0, p.w * wShare + extra) / 2
    left.push({ x: c.x + g.x * half, y: c.y + g.y * half })
    right.push({ x: c.x - g.x * half, y: c.y - g.y * half })
    ends.push({ c, half, angle: Math.atan2(g.y, g.x) })
  })
  const first = ends[0]
  const last = ends[ends.length - 1]
  const path = new Path2D()
  left.forEach((q, i) => (i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y)))
  caps.end && path.arc(last.c.x, last.c.y, last.half, last.angle, last.angle - Math.PI, true)
  right.reverse().forEach(q => path.lineTo(q.x, q.y))
  caps.start && path.arc(first.c.x, first.c.y, first.half, first.angle - Math.PI, first.angle - FULL_TURN, true)
  path.closePath()
  ctx.fillStyle = color
  ctx.fill(path)
}
//
// Unit normal of a segment, always on the same side of its direction
// (stable along a strand, unlike the light-facing normal).
//
function sideNormal(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  return { x: -dy / len, y: dx / len }
}
//
// Unit normal of a segment pointing away from the light.
//
function shadowNormal(a, b) {
  const n = sideNormal(a, b)
  const toLight = n.x * LIGHT.x + n.y * LIGHT.y
  return toLight > 0 ? { x: -n.x, y: -n.y } : n
}
//
// Bark of a whole strand: per-point frames and the angles of its deep
// furrows, fine cracks and pale fibres.
//
function barkFor(pts, rng, deep, fine, twist) {
  const frames = strandFrames(pts)
  return {
    frames,
    deep: furrowAngles(frames, rng, DEEP_FURROWS, deep, twist),
    fine: furrowAngles(frames, rng, FINE_FURROWS, fine, twist),
    fibres: furrowAngles(frames, rng, FIBRES, deep * FIBRES_PER_DEEP, twist),
    oak: [],
    scales: null
  }
}
//
// Oak bark of a trunk stem: no regular furrows or fibres, only the fissure
// net between lit plates.
//
function oakBarkFor(pts, rng, maxW) {
  const len = pts.length
  return {
    frames: strandFrames(pts),
    deep: [],
    fine: [],
    fibres: [],
    oak: [...oakFissures(len, maxW, OAK_NET, rng), ...crossBreaks(len, rng), ...oakFissures(len, maxW, OAK_FINE_NET, rng)],
    scales: barkScales(len, maxW, rng)
  }
}
//
// The fissure net in (v: point index, u: angle) space: long runs that fork,
// plus short cross breaks between them.
//
function oakFissures(len, maxW, net, rng) {
  const lines = []
  const runs = Math.round(maxW / net.px * len / net.runAvg)
  for (let r = 0; r < runs; r++) {
    const u = rng() * FULL_TURN
    const v = rng() * len
    const to = { v: Math.min(len - 1, v + net.runMin + rng() * net.runRange), u: u + (rng() - HALF) * net.drift }
    addFissure(lines, { v, u }, to, net, net.depth, net.w, rng)
  }
  return lines
}
//
// Short sagging breaks across the ridges, splitting them into plates.
//
function crossBreaks(len, rng) {
  const lines = []
  for (let v = 0; v < len - 1; v += OAK_CROSS_EVERY) {
    if (rng() > OAK_CROSS_CHANCE) continue
    const u = rng() * FULL_TURN
    const span = OAK_CROSS_SPAN + rng() * OAK_CROSS_SPAN_RANGE
    lines.push({ pts: [{ v, u }, { v: v + OAK_CROSS_SAG, u: u + span / 2 }, { v, u: u + span }], w: OAK_CROSS_W })
  }
  return lines
}
//
// One fissure from a to b wandering sideways, then forks leaving it part
// way, turning off around the stem, thinner each level.
//
function addFissure(lines, a, b, net, depth, w, rng) {
  const pts = [a, b]
  let wander = net.wander
  for (let l = 0; l < net.subdiv; l++) {
    for (let i = pts.length - 1; i > 0; i--) {
      const p = pts[i - 1]
      const q = pts[i]
      pts.splice(i, 0, { v: (p.v + q.v) / 2, u: (p.u + q.u) / 2 + (rng() - HALF) * wander })
    }
    wander *= HALF
  }
  lines.push({ pts, w })
  if (depth <= 1) return
  for (let f = 0; f < OAK_FORKS; f++) {
    const from = pts[Math.floor(pts.length * (OAK_FORK_FROM + rng() * OAK_FORK_SPAN))]
    const len = (b.v - a.v) * (OAK_FORK_LEN + rng() * OAK_FORK_LEN_RANGE)
    const turn = (rng() < HALF ? -1 : 1) * (OAK_FORK_TURN + rng() * OAK_FORK_TURN_RANGE)
    addFissure(lines, from, { v: from.v + len, u: from.u + turn }, net, depth - 1, w * OAK_FADE, rng)
  }
}
//
// Tiny bark scales in clusters of sub-clusters (each level half as spread
// out), each a short flake across the stem.
//
function barkScales(len, maxW, rng) {
  const scales = []
  const clusters = Math.round(len * maxW * SCALE_CLUSTERS)
  for (let c = 0; c < clusters; c++) {
    const centre = { v: rng() * len, u: rng() * FULL_TURN }
    for (let s = 0; s < SCALE_SUBS; s++) {
      const sub = { v: centre.v + (rng() - HALF) * SCALE_SPREAD_V, u: centre.u + (rng() - HALF) * SCALE_SPREAD_U }
      for (let k = 0; k < SCALE_PER_SUB; k++) {
        scales.push({
          v: sub.v + (rng() - HALF) * SCALE_SPREAD_V * HALF,
          u: sub.u + (rng() - HALF) * SCALE_SPREAD_U * HALF,
          len: SCALE_LEN + rng() * SCALE_LEN_RANGE,
          tilt: (rng() - HALF) * SCALE_TILT
        })
      }
    }
  }
  return scales.filter(sc => sc.v >= 0 && sc.v < len - 1)
}
//
// Bark scales between two point indices on the visible face: a dark
// shadow under each flake, its lit upper edge.
//
function paintScales(ctx, pts, frames, scales, tones, from, to) {
  const [contour, , , , light] = tones
  scales.forEach(sc => {
    if (sc.v < from || sc.v > to) return
    const a = onStem(pts, frames, { v: sc.v, u: sc.u - sc.len / 2 })
    const b = onStem(pts, frames, { v: sc.v + sc.tilt, u: sc.u + sc.len / 2 })
    if (a.face < FACE_MIN || b.face < FACE_MIN) return
    const scale = Math.min(1, a.w / BARK_REF_W)
    const down = { x: -a.g.y, y: a.g.x }
    const shift = { x: down.x * SCALE_W, y: down.y * SCALE_W }
    ctx.lineWidth = SCALE_W * scale + RIM_MIN_W
    ctx.strokeStyle = css(contour, SCALE_SHADOW_ALPHA * a.face)
    ctx.beginPath()
    ctx.moveTo(a.x + shift.x, a.y + shift.y)
    ctx.lineTo(b.x + shift.x, b.y + shift.y)
    ctx.stroke()
    ctx.strokeStyle = css(light, SCALE_LIT_ALPHA * a.face)
    ctx.beginPath()
    ctx.moveTo(a.x, a.y)
    ctx.lineTo(b.x, b.y)
    ctx.stroke()
  })
}
//
// Fissure segments that fall between two point indices, on the visible
// face: soft shade toward the light, the dark crack, a lit lip beyond it.
//
function paintFissures(ctx, pts, frames, lines, tones, from, to) {
  const [contour, deep, , , light] = tones
  const last = pts.length - 1
  lines.forEach(line => {
    for (let i = 1; i < line.pts.length; i++) {
      const p = line.pts[i - 1]
      const q = line.pts[i]
      if (p.v < from || q.v < from || p.v > to || q.v > to || p.v > last || q.v > last) continue
      const a = onStem(pts, frames, p)
      const b = onStem(pts, frames, q)
      if (a.face < FACE_MIN || b.face < FACE_MIN) continue
      const g = a.g
      const away = g.x * LIGHT.x + g.y * LIGHT.y > 0 ? -1 : 1
      const scale = Math.min(1, a.w / BARK_REF_W)
      const w = (OAK_MIN_W + OAK_W * Math.min(a.face, b.face)) * scale * line.w
      strokeSeg(ctx, a, b, g, -away * w / 2, w * OAK_SHADE_W, css(deep, OAK_SHADE_ALPHA * line.w))
      strokeSeg(ctx, a, b, g, away * (w / 2 + RIM_OFF), RIM_W * scale * line.w + RIM_MIN_W, css(light, RIM_ALPHA * a.face * line.w))
      strokeSeg(ctx, a, b, g, 0, w, css(contour, Math.max(HALF, line.w)))
    }
  })
}
//
// Screen point of (v: fractional point index, u: angle) on a stem.
//
function onStem(pts, frames, at) {
  const v = Math.max(0, Math.min(pts.length - 1, at.v))
  const i = Math.min(pts.length - 2, Math.floor(v))
  const f = v - i
  const p = pts[i]
  const q = pts[i + 1]
  const c = { x: p.x + (q.x - p.x) * f, y: p.y + (q.y - p.y) * f, w: p.w + (q.w - p.w) * f }
  const s = onStrand(c, frames[i], at.u)
  return { ...s, g: frames[i].g, w: c.w }
}
//
// Bark between two point indices: deep furrows, broken plates between
// them, fine cracks, pale fibres, then the oak net and bark scales.
//
function paintBarkSpan(ctx, pts, bark, tones, a, b, plates, rng) {
  bark.deep.forEach(row => paintFurrow(ctx, pts, bark.frames, row, tones, DEEP_FURROWS, a, b))
  plates && paintPlateCracks(ctx, pts, bark.frames, bark.deep, tones, rng, a, b)
  bark.fine.forEach(row => paintFurrow(ctx, pts, bark.frames, row, tones, FINE_FURROWS, a, b))
  bark.fibres.forEach(row => paintFurrow(ctx, pts, bark.frames, row, tones, FIBRES, a, b))
  paintFissures(ctx, pts, bark.frames, bark.oak, tones, a, b)
  bark.scales && paintScales(ctx, pts, bark.frames, bark.scales, tones, a, b)
}
//
// Side normal, unit tangent and distance along the strand at every point.
//
function strandFrames(pts) {
  let along = 0
  return pts.map((p, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    along += i ? Math.hypot(p.x - pts[i - 1].x, p.y - pts[i - 1].y) : 0
    return { g: sideNormal(a, b), t: { x: (b.x - a.x) / len, y: (b.y - a.y) / len }, along }
  })
}
//
// Angle of every furrow at every point (null inside a break). Each furrow
// waves around its own angle (odd ones in opposite phase), drifts slowly,
// turns with the strand's twist and breaks off now and then.
//
function furrowAngles(frames, rng, def, count, twist) {
  const rows = []
  for (let f = 0; f < count; f++) {
    const base = f / count * FULL_TURN + (rng() - 0.5) * FULL_TURN / count * BASE_JITTER
    const waveLen = def.waveLenMin + rng() * def.waveLenRange
    const phase = (f % 2) * Math.PI + (rng() - 0.5)
    let drift = 0
    let gap = 0
    rows.push(frames.map(fr => {
      drift = Math.max(-DRIFT_LIMIT, Math.min(DRIFT_LIMIT, drift + (rng() - 0.5) * def.drift * 2))
      gap = gap > 0 ? gap - 1 : rng() < def.breakChance ? def.gapMin + Math.floor(rng() * def.gapRange) : 0
      return gap > 0 ? null : base + Math.sin(fr.along / waveLen + phase) * def.wave + drift + fr.along * twist
    }))
  }
  return rows
}
//
// Screen point of an angle around the strand and how much it faces the
// viewer (0 … 1).
//
function onStrand(p, fr, angle) {
  const off = Math.sin(angle) * p.w / 2 * FACE_INSET
  return { x: p.x + fr.g.x * off, y: p.y + fr.g.y * off, face: Math.cos(angle) }
}
//
// One furrow between two indices: a soft shade on its light side, the dark
// groove, and the lit lip of the plate on its far side.
//
function paintFurrow(ctx, pts, frames, row, tones, def, from, to) {
  const [contour, deep, , , light] = tones
  for (let i = from + 1; i <= to; i++) {
    if (row[i - 1] === null || row[i] === null || pts[i].w < MIN_DETAIL_W) continue
    const a = onStrand(pts[i - 1], frames[i - 1], row[i - 1])
    const b = onStrand(pts[i], frames[i], row[i])
    if (a.face < FACE_MIN || b.face < FACE_MIN) continue
    const g = frames[i].g
    const away = g.x * LIGHT.x + g.y * LIGHT.y > 0 ? -1 : 1
    const scale = Math.min(1, pts[i].w / BARK_REF_W)
    const w = (FURROW_MIN_W + def.width * Math.min(a.face, b.face)) * scale
    def.rim && strokeSeg(ctx, a, b, g, -away * w / 2, w * FURROW_SHADE_W, css(deep, FURROW_SHADE_ALPHA * def.alpha))
    def.rim && strokeSeg(ctx, a, b, g, away * (w / 2 + RIM_OFF), RIM_W * scale + RIM_MIN_W, css(light, RIM_ALPHA * a.face))
    strokeSeg(ctx, a, b, g, 0, w, css(furrowTone(def, contour, deep, light), def.alpha * (def.light ? a.face : 1)))
  }
}
//
// Groove colour: deep furrows near black, fine cracks dark, fibres pale.
//
function furrowTone(def, contour, deep, light) {
  if (def.light) return light
  return def.rim ? contour : deep
}
//
// Short line segment shifted sideways along the strand normal.
//
function strokeSeg(ctx, a, b, g, shift, width, color) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(a.x + g.x * shift, a.y + g.y * shift)
  ctx.lineTo(b.x + g.x * shift, b.y + g.y * shift)
  ctx.stroke()
}
//
// Cross cracks splitting the plates between neighbouring deep furrows,
// sagging a little back along the strand, with a lit lip beside them.
//
function paintPlateCracks(ctx, pts, frames, angles, tones, rng, from, to) {
  const [contour, , , , light] = tones
  for (let i = from; i <= to; i++) {
    if (pts[i].w < MIN_DETAIL_W) continue
    const fr = frames[i]
    const scale = Math.min(1, pts[i].w / BARK_REF_W)
    angles.forEach((row, f) => {
      const next = angles[(f + 1) % angles.length][i]
      if (row[i] === null || next === null || rng() > PLATE_CRACK_CHANCE) return
      const end = next < row[i] ? next + FULL_TURN : next
      if (end - row[i] > PLATE_MAX_ANGLE) return
      const a = onStrand(pts[i], fr, row[i])
      const b = onStrand(pts[i], fr, end)
      if (a.face < FACE_MIN || b.face < FACE_MIN) return
      const sag = PLATE_CRACK_SAG * scale
      const mid = { x: (a.x + b.x) / 2 - fr.t.x * sag, y: (a.y + b.y) / 2 - fr.t.y * sag }
      plateCrack(ctx, a, b, mid, { x: -fr.t.x, y: -fr.t.y }, css(light, PLATE_LIP_ALPHA), 1)
      plateCrack(ctx, a, b, mid, { x: 0, y: 0 }, css(contour), PLATE_CRACK_W * scale)
    })
  }
}
//
// One sagging crack (or its lip, when shifted) between two plate corners.
//
function plateCrack(ctx, a, b, mid, shift, color, width) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(a.x + shift.x, a.y + shift.y)
  ctx.quadraticCurveTo(mid.x + shift.x, mid.y + shift.y, b.x + shift.x, b.y + shift.y)
  ctx.stroke()
}
//
// A knot in the middle of a thick near piece, clear of the eyes.
//
function paintPieceKnot(ctx, pts, eyes, tones) {
  const p = pts[Math.floor(pts.length / 2)]
  if (p.w < KNOT_MIN_W) return
  const r = p.w * KNOT_R_SHARE
  const clear = eyes.every(e => Math.hypot(e.x - p.x, e.y - p.y) > (e.r + r) * KNOT_RINGS[1] + KNOT_EYE_CLEAR)
  clear && paintKnot(ctx, { x: p.x, y: p.y, r }, tones)
}
//
// One knot: growth rings, the hollow with a deeper core, lit upper rim.
//
function paintKnot(ctx, n, tones) {
  const [contour, deep, dark, , light] = tones
  ctx.strokeStyle = css(dark, KNOT_RING_ALPHA)
  ctx.lineWidth = KNOT_RING_W
  KNOT_RINGS.forEach(scale => {
    ctx.beginPath()
    ctx.ellipse(n.x, n.y, n.r * scale * KNOT_FLAT, n.r * scale, 0, 0, FULL_TURN)
    ctx.stroke()
  })
  ctx.fillStyle = css(deep)
  ctx.beginPath()
  ctx.ellipse(n.x, n.y, n.r * KNOT_FLAT, n.r, 0, 0, FULL_TURN)
  ctx.fill()
  ctx.fillStyle = css(contour)
  ctx.beginPath()
  ctx.ellipse(n.x + KNOT_HOLE_SHIFT, n.y + KNOT_HOLE_SHIFT, n.r * KNOT_FLAT * KNOT_HOLE, n.r * KNOT_HOLE, 0, 0, FULL_TURN)
  ctx.fill()
  ctx.strokeStyle = css(light)
  ctx.lineWidth = KNOT_LIT_W
  ctx.beginPath()
  ctx.ellipse(n.x, n.y, n.r * KNOT_FLAT * KNOT_LIT_R, n.r * KNOT_LIT_R, 0, KNOT_LIT_FROM, KNOT_LIT_TO)
  ctx.stroke()
}
//
// Point on the main vine's face, a share of its half-width left (-) or right.
//
function onRope(axis, t, across) {
  const p = axisAt(axis, t)
  return { x: p.x + across * p.w / 2, y: p.y }
}
//
// Small clusters of lichen dots on the main vine's lit side.
//
function paintLichen(ctx, axis, rng) {
  ctx.fillStyle = css(CAVE_PAL.plantLichen)
  for (let c = 0; c < LICHEN_CLUSTERS; c++) {
    const at = onRope(axis, rng(), -rng() * LICHEN_ACROSS)
    for (let d = 0; d < LICHEN_DOTS; d++) {
      ctx.beginPath()
      ctx.arc(at.x + (rng() - 0.5) * LICHEN_SPREAD, at.y + (rng() - 0.5) * LICHEN_SPREAD, LICHEN_R_MIN + rng() * LICHEN_R_RANGE, 0, FULL_TURN)
      ctx.fill()
    }
  }
}
//
// Leafy patches: real leaves hanging down in a loose oval; lighter on the
// patch's upper left, darker below right.
//
function paintIvy(ctx, axis, rng) {
  const [, dark, mid, light, glow] = CAVE_PAL.plantIvy
  for (let i = 0; i < IVY_PATCHES; i++) {
    const c = onRope(axis, Math.pow(rng(), IVY_LOW_BIAS) * IVY_T_MAX, (rng() * 2 - 1) * IVY_ACROSS)
    const rx = IVY_RX_MIN + rng() * IVY_RX_RANGE
    const ry = IVY_RY_MIN + rng() * IVY_RY_RANGE
    const count = Math.round(rx * ry * IVY_DENSITY)
    const leaves = []
    for (let l = 0; l < count; l++) {
      const a = rng() * FULL_TURN
      const d = Math.sqrt(rng())
      leaves.push({ u: Math.cos(a) * d, v: Math.sin(a) * d, s: IVY_LEAF_MIN + rng() * IVY_LEAF_RANGE, tilt: (rng() - 0.5) * IVY_DROOP * 2 })
    }
    leaves.sort((a, b) => a.v - b.v)
    leaves.forEach(leaf => {
      const x = c.x + leaf.u * rx
      const y = c.y + leaf.v * ry
      const lit = (leaf.u + leaf.v) / 2
      const tone = rng() < IVY_GLOW_CHANCE ? glow : lit < -IVY_LIT_SHARE ? light : lit > IVY_DARK_SHARE / 2 ? dark : mid
      paintRealLeaf(ctx, x, y, leaf.s, Math.PI / 2 + leaf.tilt, tone, rng)
    })
  }
}
//
// One real leaf from its stalk point, pointing along an angle.
//
function paintRealLeaf(ctx, x, y, size, angle, tone, rng) {
  const [shadow, dark, , light] = CAVE_PAL.plantIvy
  const len = size * FOLIAGE_LEN
  const half = size * FOLIAGE_HALF_W
  const bend = (rng() - HALF) * len * FOLIAGE_BEND
  const path = leafPath(len, half, half * (1 + (rng() - HALF) * FOLIAGE_SKEW), bend)
  ctx.save()
  ctx.translate(x + IVY_SHADOW.x, y + IVY_SHADOW.y)
  ctx.rotate(angle)
  ctx.fillStyle = css(shadow)
  ctx.fill(path)
  ctx.restore()
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  ctx.fillStyle = css(tone)
  ctx.fill(path)
  ctx.save()
  ctx.clip(path)
  ctx.fillStyle = css(dark, FOLIAGE_SHADE_ALPHA)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len / 2, 0, len, bend)
  ctx.lineTo(len, half * 2)
  ctx.lineTo(0, half * 2)
  ctx.fill()
  paintLeafVeins(ctx, len, half, bend, size, light, rng)
  ctx.restore()
  ctx.strokeStyle = css(shadow, FOLIAGE_EDGE_ALPHA)
  ctx.lineWidth = FOLIAGE_EDGE_W
  ctx.stroke(path)
  ctx.restore()
}
//
// Pointed lopsided oval from (0, 0) to the tip (len, bend).
//
function leafPath(len, top, bottom, bend) {
  const path = new Path2D()
  path.moveTo(0, 0)
  path.bezierCurveTo(len * FOLIAGE_CTRL_NEAR, -top * FOLIAGE_CTRL_NEAR_W, len * FOLIAGE_CTRL_FAR, -top * FOLIAGE_CTRL_FAR_W + bend * HALF, len, bend)
  path.bezierCurveTo(len * FOLIAGE_CTRL_FAR, bottom * FOLIAGE_CTRL_FAR_W + bend * HALF, len * FOLIAGE_CTRL_NEAR, bottom * FOLIAGE_CTRL_NEAR_W, 0, 0)
  path.closePath()
  return path
}
//
// Lit midrib along the bent leaf axis and pairs of side veins reaching
// forward to the edge, each wandering and forking once more.
//
function paintLeafVeins(ctx, len, half, bend, size, light, rng) {
  const mid = t => ({ x: t * len, y: bend * t * t })
  ctx.strokeStyle = css(light, FOLIAGE_VEIN_ALPHA)
  ctx.lineWidth = Math.max(FOLIAGE_RIB_MIN_W, size * FOLIAGE_RIB_W)
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.quadraticCurveTo(len / 2, 0, len, bend)
  ctx.stroke()
  const pairs = FOLIAGE_PAIRS_MIN + Math.floor(rng() * FOLIAGE_PAIRS_RANGE)
  for (let k = 0; k < pairs; k++) {
    const t = FOLIAGE_VEIN_FROM + FOLIAGE_VEIN_SPAN * k / Math.max(1, pairs - 1)
    const from = mid(t)
    const ahead = mid(Math.min(1, t + FOLIAGE_VEIN_AHEAD))
    const reach = half * FOLIAGE_VEIN_REACH * Math.sin(Math.PI * Math.min(1, t + FOLIAGE_VEIN_AHEAD))
    ;[-1, 1].forEach(side => leafVein(ctx, from, { x: ahead.x, y: ahead.y + side * reach }, ctx.lineWidth * FOLIAGE_FORK_FADE, FOLIAGE_VEIN_DEPTH, rng))
  }
}
//
// One side vein: a slightly wandering line, then a fork off its middle.
//
function leafVein(ctx, a, b, width, depth, rng) {
  const d = Math.hypot(b.x - a.x, b.y - a.y)
  const m = { x: (a.x + b.x) / 2 + (rng() - HALF) * d * FOLIAGE_VEIN_WANDER, y: (a.y + b.y) / 2 + (rng() - HALF) * d * FOLIAGE_VEIN_WANDER }
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.quadraticCurveTo(m.x, m.y, b.x, b.y)
  ctx.stroke()
  if (depth <= 1) return
  const turn = (rng() < HALF ? -1 : 1) * FOLIAGE_FORK_TURN
  const dx = (b.x - m.x) * FOLIAGE_FORK_LEN
  const dy = (b.y - m.y) * FOLIAGE_FORK_LEN
  leafVein(ctx, m, { x: m.x + dx * Math.cos(turn) - dy * Math.sin(turn), y: m.y + dx * Math.sin(turn) + dy * Math.cos(turn) }, width * FOLIAGE_FORK_FADE, depth - 1, rng)
}
//
// Small real leaves sprouting from the sides of a near vine piece,
// pointing out and a little down.
//
function paintVineLeaves(ctx, pts, rng) {
  const [, , mid, light] = CAVE_PAL.plantIvy
  let walked = 0
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    walked += Math.hypot(pts[i].x - a.x, pts[i].y - a.y)
    if (walked < LEAF_EVERY) continue
    walked = 0
    if (rng() > LEAF_CHANCE * (1 - heightShare(a.y) * LEAF_THIN)) continue
    const g = sideNormal(a, pts[i])
    const side = rng() < HALF ? -1 : 1
    const n = 1 + Math.floor(rng() * LEAF_CLUSTER)
    for (let l = 0; l < n; l++) {
      const s = LEAF_SIZE_MIN + rng() * LEAF_SIZE_RANGE
      const x = a.x + g.x * side * a.w * LEAF_OUT + (rng() - HALF) * LEAF_SPREAD
      const y = a.y + g.y * side * a.w * LEAF_OUT + (rng() - HALF) * LEAF_SPREAD
      const out = Math.atan2(g.y * side, g.x * side)
      const angle = out + Math.sign(Math.cos(out) || 1) * (LEAF_DROOP + (rng() - HALF) * LEAF_TILT)
      paintRealLeaf(ctx, x, y, s, angle, rng() < LEAF_LIGHT_CHANCE ? light : mid, rng)
    }
  }
}
//
// Moss clumps on the lit top of a near vine piece.
//
function paintMoss(ctx, pts, rng) {
  const [dark, mid, light] = CAVE_PAL.plantMoss
  const tones = [dark, dark, mid, light]
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]
    if (a.w < MIN_DETAIL_W || rng() > MOSS_CHANCE) continue
    const n = shadowNormal(a, pts[i])
    const across = (Math.pow(rng(), MOSS_LIT_BIAS) - MOSS_ACROSS_SHIFT) * a.w
    const cx = a.x + n.x * across
    const cy = a.y + n.y * across
    for (let b = 0; b < MOSS_BLOBS; b++) {
      ctx.fillStyle = css(tones[Math.floor(rng() * tones.length)])
      ctx.beginPath()
      ctx.arc(cx + (rng() - 0.5) * a.w * MOSS_SPREAD * 2, cy + (rng() - 0.5) * a.w * MOSS_SPREAD, MOSS_R_MIN + rng() * MOSS_R_RANGE, 0, FULL_TURN)
      ctx.fill()
    }
  }
}
//
// Random bed stones: offset, half-width, top (front ones sit a bit lower)
// and tilt (one side of the top raised).
//
function bedStones(count, lower, rng) {
  const out = []
  for (let i = 0; i < count; i++) {
    out.push({
      dx: (rng() * 2 - 1) * BED_SPREAD,
      rx: BED_RX_MIN + rng() * BED_RX_RANGE,
      top: BED_TOP_MIN + rng() * BED_TOP_RANGE + lower,
      tilt: (rng() * 2 - 1) * BED_TILT
    })
  }
  return out.sort((a, b) => a.top - b.top)
}
//
// Big stones on the lake bed, each painted on its own (tallest first, so
// lower ones lie in front): a rounded hump from the bed up to its top,
// filled with whole faceted stones like the forest shore pile.
//
function paintBedStones(ctx, defs, rng) {
  defs.forEach(def => paintForestShoreRock(ctx, { loops: [stoneLoop(def)], waterY: Layout.LAKE_SURFACE_Y, rng, outlineWidth: STONE_OUTLINE_W }))
}
//
// Outline of one bed stone: an arch from its foot on one side, over its
// top, down to the other side, closed along the world bottom.
//
//
// The scree heap behind the bed stones: a triangle from an apex near the
// foot down to the world bottom, its flanks bulging a little.
//
function paintScree(ctx, rng) {
  const apex = { x: PLANT_FOOT.x + SCREE_APEX_DX, y: Layout.LAKE_SURFACE_Y + SCREE_APEX_TOP }
  const flank = dx => {
    const pts = []
    for (let i = 1; i <= SCREE_FLANK_STEPS; i++) {
      const t = i / SCREE_FLANK_STEPS
      pts.push({ x: apex.x + (PLANT_FOOT.x + dx - apex.x) * t, y: apex.y + (Layout.WORLD_H - apex.y) * t - Math.sin(Math.PI * t) * SCREE_FLANK_BULGE })
    }
    return pts
  }
  const loop = [...flank(SCREE_LEFT_DX).reverse(), apex, ...flank(SCREE_RIGHT_DX)]
  paintForestShoreRock(ctx, { loops: [loop], waterY: Layout.LAKE_SURFACE_Y, rng, outlineWidth: STONE_OUTLINE_W })
}
function stoneLoop(def) {
  const pts = []
  for (let i = 0; i <= STONE_ARC_STEPS; i++) {
    const a = i / STONE_ARC_STEPS * Math.PI
    const x = PLANT_FOOT.x + def.dx + Math.cos(a) * def.rx
    pts.push({ x, y: stoneTopAt(def, x) })
  }
  return [...pts, { x: PLANT_FOOT.x + def.dx - def.rx, y: Layout.WORLD_H }, { x: PLANT_FOOT.x + def.dx + def.rx, y: Layout.WORLD_H }]
}
//
// Top of a bed stone at a world X (an arch falling to the world bottom,
// tilted to one side).
//
function stoneTopAt(def, x) {
  const d = (x - PLANT_FOOT.x - def.dx) / def.rx
  const u = Math.min(1, Math.abs(d))
  const top = Layout.LAKE_SURFACE_Y + def.top + d * def.tilt * def.rx
  return Layout.WORLD_H - (Layout.WORLD_H - top) * Math.pow(Math.sqrt(1 - u * u), STONE_ARC_POW)
}
//
// Ferns, blade tufts and leaf clusters on the stone tops above the water.
//
function paintStoneGreens(ctx, defs, rng) {
  const [, dark, mid, light] = CAVE_PAL.plantIvy
  defs.forEach(def => {
    for (let g = 0; g < STONE_GREENS; g++) {
      const x = PLANT_FOOT.x + def.dx + (rng() - HALF) * def.rx * STONE_GREEN_SPAN * 2
      const y = stoneTopAt(def, x)
      y < Layout.LAKE_SURFACE_Y - STONE_GREEN_ABOVE && paintStoneGreen(ctx, x, y, rng, [dark, mid, light])
    }
  })
}
//
// One plant on a stone's top: a fern, a tuft of blades or a leaf cluster.
//
function paintStoneGreen(ctx, x, y, rng, fernTones) {
  const kind = rng()
  const tilt = (rng() - HALF) * STONE_FERN_TILT * 2
  if (kind < 1 / 3) return paintEdgeFern(ctx, x, y, tilt, rng, STONE_FERN_SCALE + rng() * STONE_FERN_RANGE, fernTones)
  if (kind < 2 / 3) return paintBladeTuft(ctx, x, y, tilt, rng)
  paintLeafCluster(ctx, x, y, rng)
}
//
// Dense leaves, ferns and blade tufts over the trunk's foot, thinning with
// height (picks biased toward the bottom), so at the foot they hide even
// the thick stems.
//
function paintFootFoliage(ctx, shape, rng) {
  const [, dark, mid, light] = CAVE_PAL.plantIvy
  for (let i = 0; i < FOOT_CLUSTERS; i++) {
    const p = footSpot(shape.axis, rng)
    paintLeafCluster(ctx, p.x, p.y, rng)
  }
  for (let i = 0; i < FOOT_FERNS; i++) {
    const p = footSpot(shape.axis, rng)
    paintEdgeFern(ctx, p.x, p.y, (rng() - HALF) * FOOT_TILT * 2, rng, FOOT_FERN_SCALE + rng() * FOOT_FERN_RANGE, [dark, mid, light])
  }
  for (let i = 0; i < FOOT_TUFTS; i++) {
    const p = footSpot(shape.axis, rng)
    paintBladeTuft(ctx, p.x, p.y, (rng() - HALF) * FOOT_TILT * 2, rng)
  }
}
//
// A random point on the trunk's face near its foot (biased low).
//
function footSpot(axis, rng) {
  return onRope(axis, Math.pow(rng(), FOOT_BIAS) * FOOT_T_MAX, (rng() * 2 - 1) * FOOT_ACROSS)
}
//
// A small bunch of real leaves hanging and spreading from one point.
//
function paintLeafCluster(ctx, x, y, rng) {
  const [, dark, mid, light] = CAVE_PAL.plantIvy
  const tones = [dark, mid, mid, light]
  const n = FOOT_LEAVES_MIN + Math.floor(rng() * FOOT_LEAVES_RANGE)
  for (let l = 0; l < n; l++) {
    const a = Math.PI / 2 + (rng() - HALF) * Math.PI * FOOT_HANG * 2
    const lx = x + (rng() - HALF) * FOOT_SPREAD
    const ly = y + (rng() - HALF) * FOOT_SPREAD
    paintRealLeaf(ctx, lx, ly, FOOT_LEAF_MIN + rng() * FOOT_LEAF_RANGE, a, tones[Math.floor(rng() * tones.length)], rng)
  }
}
//
// Height share of a world Y on the plant (0 at the foot, 1 at the top leaf).
//
function heightShare(y) {
  const top = Math.min(...Layout.PLANT_LEAVES.map(l => l.y))
  return Math.max(0, Math.min(1, (PLANT_FOOT.y - y) / (PLANT_FOOT.y - top)))
}
//
// Ferns and blade tufts growing out of the trunk stems' near faces.
//
function paintStemPlants(ctx, shape, rng) {
  const stems = shape.vines.slice(0, shape.stemCount)
  const [, dark, mid, , light] = CAVE_PAL.plantIvy
  for (let i = 0; i < FERNS; i++) {
    const spot = stemPlantSpot(stems, shape.eyes, rng)
    spot && paintEdgeFern(ctx, spot.x, spot.y, spot.angle, rng, FERN_SCALE_MIN + rng() * FERN_SCALE_RANGE, [dark, mid, light])
  }
  for (let i = 0; i < TUFTS; i++) {
    const spot = stemPlantSpot(stems, shape.eyes, rng)
    spot && paintBladeTuft(ctx, spot.x, spot.y, spot.angle, rng)
  }
}
//
// A root point on the side of a stem's near face, its growing angle
// (0 = up, positive = right) and clear of the eyes; null if none found.
//
function stemPlantSpot(stems, eyes, rng) {
  for (let t = 0; t < STEM_PLANT_TRIES; t++) {
    const stem = stems[Math.floor(rng() * stems.length)]
    const i = 1 + Math.floor(Math.pow(rng(), STEM_PLANT_BIAS) * (stem.length - 2))
    const p = stem[i]
    if (p.z < STEM_PLANT_MIN_Z) continue
    const g = sideNormal(stem[i - 1], stem[i + 1])
    const side = rng() < HALF ? -1 : 1
    const x = p.x + g.x * side * p.w * STEM_PLANT_OUT
    const y = p.y + g.y * side * p.w * STEM_PLANT_OUT
    const clear = eyes.every(e => Math.hypot(e.x - x, e.y - y) > e.r * STEM_PLANT_EYE_CLEAR)
    if (clear) return { x, y, angle: side * (STEM_PLANT_TILT_MIN + rng() * STEM_PLANT_TILT_RANGE) }
  }
  return null
}
//
// A tuft of narrow curved blades fanning out from one root and drooping
// at their tips; back blades darker.
//
function paintBladeTuft(ctx, x, y, angle, rng) {
  const [shadow, dark, mid, light] = CAVE_PAL.plantIvy
  const n = TUFT_BLADES_MIN + Math.floor(rng() * TUFT_BLADES_RANGE)
  for (let b = 0; b < n; b++) {
    const a = angle + (b / Math.max(1, n - 1) - HALF) * TUFT_SPREAD * 2 + (rng() - HALF) * TUFT_SPREAD / 2
    const len = TUFT_LEN_MIN + rng() * TUFT_LEN_RANGE
    const tone = b % 2 ? dark : rng() < HALF ? mid : light
    const left = []
    const right = []
    for (let s = 0; s <= TUFT_STEPS; s++) {
      const t = s / TUFT_STEPS
      const dir = a + Math.sign(a || 1) * TUFT_DROOP * t * t
      const px = x + Math.sin(dir) * len * t
      const py = y - Math.cos(dir) * len * t
      const w = TUFT_W * (1 - t) / 2
      left.push({ x: px - Math.cos(dir) * w, y: py - Math.sin(dir) * w })
      right.push({ x: px + Math.cos(dir) * w, y: py + Math.sin(dir) * w })
    }
    const path = new Path2D()
    left.forEach((q, i) => (i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y)))
    right.reverse().forEach(q => path.lineTo(q.x, q.y))
    path.closePath()
    ctx.fillStyle = css(tone)
    ctx.fill(path)
    ctx.strokeStyle = css(shadow, FOLIAGE_EDGE_ALPHA)
    ctx.lineWidth = FOLIAGE_EDGE_W
    ctx.stroke(path)
  }
}
//
// Short leafy moss strands hanging off the near faces of the vines.
//
function paintRopeStrands(ctx, vines, rng) {
  ropeStrandAnchorsFrom(vines, ROPE_STRANDS, rng).forEach(p => {
    paintMossStrand(ctx, p.x, p.y, ROPE_STRAND_LEN_MIN + rng() * ROPE_STRAND_LEN_RANGE, rng)
  })
}
//
// Random points under the near faces of the vines (cycling through them).
//
function ropeStrandAnchorsFrom(vines, count, rng) {
  const hosts = vines.map(pts => pts.filter(p => p.z > ROPE_STRAND_MIN_Z && p.w >= MIN_DETAIL_W)).filter(h => h.length)
  const out = []
  for (let i = 0; i < count; i++) {
    const host = hosts[i % hosts.length]
    const p = host[Math.floor(rng() * host.length)]
    out.push({ x: p.x, y: p.y + p.w / 2 })
  }
  return out
}
//
// Curved red thorns along the thorny bands of the trunk, rooted in its
// surface (mostly on the left side, some on the right) and sticking out
// perpendicular to the trunk's direction there, each tilted a little at
// random and its tip curling upward along the trunk.
//
function paintThorns(ctx, axis, rng) {
  paintThornBand(ctx, axis, Layout.PLANT_THORNS, THORN_STEP_MIN, THORN_STEP_RANGE, THORN_RIGHT_CHANCE, rng)
  paintThornBand(ctx, axis, Layout.PLANT_THORNS_DENSE, THORN_STEP_DENSE, THORN_STEP_DENSE_RANGE, 0, rng)
}
//
// Thorns down one band of the trunk: one per step (plus a random part up
// to stepRange),
// on the right side with the given chance, else on the left.
//
function paintThornBand(ctx, axis, t, step, stepRange, rightChance, rng) {
  for (let y = t.y1; y < t.y2; y += step + rng() * stepRange) {
    const i = axisIndexAtY(axis, y)
    const a = axis[Math.max(0, i - 1)]
    const b = axis[Math.min(axis.length - 1, i + 1)]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const up = { x: (b.x - a.x) / len, y: (b.y - a.y) / len }
    const side = rng() < rightChance ? 1 : -1
    const out = { x: -up.y * side, y: up.x * side }
    const p = axis[i]
    const base = { x: p.x + out.x * p.w * THORN_SINK, y: p.y + out.y * p.w * THORN_SINK }
    const tilt = (rng() - HALF) * THORN_TILT * 2
    const dir = { x: out.x * Math.cos(tilt) - out.y * Math.sin(tilt), y: out.x * Math.sin(tilt) + out.y * Math.cos(tilt) }
    paintThorn(ctx, base, dir, up, THORN_LEN_MIN + rng() * THORN_LEN_RANGE, THORN_W_MIN + rng() * THORN_W_RANGE)
  }
}
//
// Index of the trunk axis point nearest to a world Y.
//
function axisIndexAtY(axis, y) {
  let best = 0
  axis.forEach((q, k) => Math.abs(q.y - y) < Math.abs(axis[best].y - y) && (best = k))
  return best
}
//
// One thorn: a tapered hook from a base on the bark along a direction,
// its tip curling toward `up`; dark rim, lit streak along its upper side.
//
function paintThorn(ctx, base, dir, up, len, w) {
  const [dark, mid, light] = CAVE_PAL.plantThorn
  const side = { x: -dir.y, y: dir.x }
  const tip = { x: base.x + dir.x * len + up.x * len * THORN_CURL, y: base.y + dir.y * len + up.y * len * THORN_CURL }
  const mid1 = { x: base.x + dir.x * len * HALF, y: base.y + dir.y * len * HALF }
  const a = { x: base.x + side.x * w / 2, y: base.y + side.y * w / 2 }
  const b = { x: base.x - side.x * w / 2, y: base.y - side.y * w / 2 }
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.quadraticCurveTo(mid1.x + side.x * w * THORN_BELLY, mid1.y + side.y * w * THORN_BELLY, tip.x, tip.y)
  ctx.quadraticCurveTo(mid1.x - side.x * w * THORN_BELLY, mid1.y - side.y * w * THORN_BELLY, b.x, b.y)
  ctx.closePath()
  ctx.fillStyle = css(mid)
  ctx.fill()
  ctx.strokeStyle = css(dark)
  ctx.lineWidth = THORN_CONTOUR_W
  ctx.stroke()
  const litSide = side.x * LIGHT.x + side.y * LIGHT.y > 0 ? 1 : -1
  const from = { x: base.x + (tip.x - base.x) * THORN_LIT_FROM + side.x * litSide * w * THORN_LIT_SHIFT, y: base.y + (tip.y - base.y) * THORN_LIT_FROM + side.y * litSide * w * THORN_LIT_SHIFT }
  const to = { x: base.x + (tip.x - base.x) * THORN_LIT_TO, y: base.y + (tip.y - base.y) * THORN_LIT_TO }
  ctx.strokeStyle = css(light)
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(from.x, from.y)
  ctx.lineTo(to.x, to.y)
  ctx.stroke()
}
