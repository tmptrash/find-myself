import { CFG } from '../cfg.js'
import { applyForestGameplaySharpBake } from '../sections/forest/utils/forest-focus-depth.js'
import * as SoilSeam from '../sections/forest/utils/forest-soil-seam.js'
import { FOREST_CFG } from '../sections/forest/cfg.js'
import { getRGB } from '../utils/helper.js'
import * as PolyBatch from '../utils/poly-batch.js'
import * as Water from './water.js'
//
// The forest lake (the forest level and the menu backdrop; the cave's lake
// borrows its algae): the shared water (water.js) over a static bed layer
// (murk, earthy terraces, sand with gravel, pebbles, a sunken snag,
// boulders) and live swaying algae rooted on the floor face. The water
// runs from `waterStartX` (the level's island shore, or the lake's left
// end) to past the core right end, where the shallows fade out; its
// surface's springs run over all of it, the shallows too (the hero falling
// in at the open water's right end still sends waves off). The far-bank
// trees' reflections are baked into it under the surface.
//
// The forest lake's greatest depth: deep enough for the drowning hero to
// go under whole; the water surface sits 2 px under the floor.
//
const LAKE_FULL_SINK_DEPTH = 86
//
// Default water colours (the forest lake); a caller may pass its own.
//
const PAL = CFG.visual.colors.palette
const DEFAULT_PALETTE = { water: PAL.water, paint: PAL.waterPaint }
//
// Leaf midrib width of the algae fronds.
//
const LAKE_ALGAE_MIDRIB_PX = 1
//
// Bake extends past the gameplay shore line so water tapers under the cap
// rocks instead of ending in a vertical sprite edge.
//
export const LAKE_SHORE_EXTEND_PX = 64
//
// The bake's room over the water line and the opaque skin under it, as
// the bed's bake has always measured them (from the old baked waves).
//
const LAKE_TOP_MARGIN_PX = 6.2
export const LAKE_OPAQUE_SKIN_PX = 5.2
//
// Bed bake version (its sprite name).
//
const LAKE_BAKE_GEOMETRY_VERSION = 23
const LAKE_TUNE = FOREST_CFG.lakeWater
const LAKE_BED_SEGMENTS = 160
const LAKE_BED_BACK_RISE_PX = 32
const LAKE_BED_BACK_FULL_DEPTH_PX = 40
const LAKE_BED_BACK_WOBBLE_PX = 3
const LAKE_BED_BACK_WOBBLE_WAVELENGTH = 47
const LAKE_BED_BACK_WOBBLE_SEED = 12.9
const LAKE_BED_EDGE_PX = 2
const LAKE_BED_FLOOR_OVERLAP_PX = 2
const LAKE_BED_SLOPE_PROBE_PX = 3
const LAKE_BED_SAND_MAX_SLOPE = 0.55
//
// The floor face is sand: soft patches of lighter and darker sand
// (LAKE_SAND_BLOTCHES, LAKE_SAND_BLOTCH_R..+RANGE px across, flattened
// LAKE_SAND_BLOTCH_FLAT as it lies, at LAKE_SAND_BLOTCH_ALPHA), then
// LAKE_SAND_GRAINS grains of 1..LAKE_SAND_GRAIN_MAX px, every other one
// light, the rest dark, at LAKE_SAND_GRAIN_ALPHA. On the right bank's wall
// (from LAKE_SAND_WALL_FROM_U along the bed, ramping in over
// LAKE_SAND_WALL_RAMP_U) it lies LAKE_SAND_WALL_PX thick, thinning to
// nothing over its top LAKE_SAND_WALL_FADE_PX under the surface.
//
const LAKE_SAND_BLOTCHES = 70
const LAKE_SAND_BLOTCH_R = 5
const LAKE_SAND_BLOTCH_R_RANGE = 12
const LAKE_SAND_BLOTCH_FLAT = 0.35
const LAKE_SAND_BLOTCH_ALPHA = 0.14
const LAKE_SAND_GRAINS = 1400
const LAKE_SAND_GRAIN_MAX = 2
const LAKE_SAND_WALL_FROM_U = 0.8
const LAKE_SAND_WALL_RAMP_U = 0.06
const LAKE_SAND_WALL_PX = 7
const LAKE_SAND_WALL_FADE_PX = 14
//
// The sand's far rim follows its rise averaged over LAKE_SAND_RISE_SAMPLES
// columns either side, LAKE_SAND_RISE_STEP_PX apart, so it slopes off at
// the steps of the bed instead of ending in an upright wall.
//
const LAKE_SAND_RISE_SAMPLES = 4
const LAKE_SAND_RISE_STEP_PX = 4
const LAKE_SAND_GRAIN_ALPHA = 0.45
const LAKE_BED_PEBBLE_COUNT = 22
const LAKE_BED_PEBBLE_R_MIN = 1.8
const LAKE_BED_PEBBLE_R_RANGE = 2.6
const LAKE_BED_PEBBLE_SQUASH = 0.7
const LAKE_BED_PEBBLE_LIGHT_FRAC = 0.45
const LAKE_BED_PEBBLE_GLINT_SHIFT = 0.3
const LAKE_BED_GRAIN_SEED = 5900
//
// The bed's volume: its floor face, seen from a little above, darkens and
// cools toward its far rim (LAKE_FACE_FAR_ALPHA of bedShadow, gone by
// LAKE_FACE_MID of the way down) and catches light at its near edge
// (LAKE_FACE_NEAR_ALPHA of bedLight); the bowl's back wall is in shadow at
// its foot (LAKE_WALL_FOOT_ALPHA, fading LAKE_WALL_FOOT_PX up), and every
// pebble and stone casts a soft shadow onto the floor (LAKE_CAST_ALPHA,
// LAKE_CAST_DROP of its size down, LAKE_CAST_FLAT tall for its width).
//
const LAKE_FACE_FAR_ALPHA = 0.65
const LAKE_FACE_MID = 0.55
const LAKE_FACE_NEAR_ALPHA = 0.5
const LAKE_WALL_FOOT_ALPHA = 0.6
const LAKE_WALL_FOOT_PX = 22
const LAKE_CAST_ALPHA = 0.45
const LAKE_CAST_DROP = 0.35
const LAKE_CAST_FLAT = 0.3
//
// Depth into the screen on the floor face: LAKE_FACE_LINES sand ripples
// across it (their crests LAKE_FACE_LINE_ALPHA of sandLight with a trough
// of sandDark under each, waving
// LAKE_RIPPLE_AMP px over LAKE_RIPPLE_WAVE px, less toward the far rim),
// closer together toward its far rim (spaced by the square of their
// share), and what lies on it
// drawn LAKE_FAR_SCALE of its size at the far rim, growing to full size at
// the near edge.
//
const LAKE_FACE_LINES = 5
const LAKE_FACE_LINE_ALPHA = 0.4
const LAKE_RIPPLE_AMP = 1.5
const LAKE_RIPPLE_WAVE = 9
const LAKE_FAR_SCALE = 0.55
//
// Faceted boulders on the floor: one large rock and a dark rubble cluster in
// the deep part, a few loose stones on the ledges. Each is a lumpy polygon
// with a lit upper-left facet and a shaded lower-right.
//
const LAKE_BED_BOULDERS = [
  { t: 0.5, r: 7, seed: 41 },
  { t: 0.53, r: 9, seed: 43 },
  { t: 0.57, r: 6, seed: 47 },
  { t: 0.63, r: 22, seed: 11 },
  { t: 0.12, r: 6, seed: 67 },
  { t: 0.3, r: 8, seed: 37 }
]
const LAKE_BED_BOULDER_VERTS = 7
const LAKE_BED_BOULDER_JITTER = 0.22
const LAKE_BED_BOULDER_ANGLE_JITTER = 0.5
const LAKE_BED_BOULDER_SQUASH = 0.72
const LAKE_BED_BOULDER_SINK = 0.35
const LAKE_BED_BOULDER_DEPTH_FRAC = 0.7
const LAKE_BED_BOULDER_CONTOUR_PX = 1.5
const LAKE_BED_BOULDER_MID_SHIFT = 0.14
const LAKE_BED_BOULDER_MID_FRAC = 0.9
const LAKE_BED_BOULDER_LIGHT_SHIFT = 0.3
const LAKE_BED_BOULDER_LIGHT_FRAC = 0.45
//
// Pictured bed stones (when a lake has them) sink this share of their
// height into the sand.
//
const LAKE_BED_STONE_SINK = 0.2
//
// Sunken snag: a branch lying on the floor in the shallower left half, with
// two short side twigs (fractions along it, angle, length fraction).
//
const LAKE_SNAG_T = 0.32
const LAKE_SNAG_LEN = 74
const LAKE_SNAG_W = 6
const LAKE_SNAG_TIP_W = 2
const LAKE_SNAG_TILT = -0.12
const LAKE_SNAG_BOW_PX = 4
const LAKE_SNAG_SEGMENTS = 8
const LAKE_SNAG_TWIGS = [
  { at: 0.35, angle: -0.9, len: 0.28 },
  { at: 0.7, angle: -0.55, len: 0.22 }
]
const LAKE_SNAG_DEPTH_FRAC = 0.6
const LAKE_SNAG_TWIG_W_FRAC = 0.6
const LAKE_SNAG_TWIG_TIP_W = 1
const LAKE_SNAG_LIGHT_FRAC = 0.35
const LAKE_SNAG_LIGHT_LIFT = 0.25
const LAKE_SNAG_CONTOUR_PX = 1.5
const LAKE_ALGAE_TUFTS = [
  { t: 0.05, kind: 'grass' },
  { t: 0.16, kind: 'frond' },
  { t: 0.38, kind: 'grass' },
  { t: 0.48, kind: 'frond' },
  { t: 0.63, kind: 'frond' },
  { t: 0.76, kind: 'grass' },
  { t: 0.88, kind: 'frond' },
  { t: 0.96, kind: 'grass' }
]
const LAKE_ALGAE_KINDS = {
  frond: { bladesMin: 3, bladesRange: 3, hMin: 32, hRange: 30, wMin: 5, wRange: 3, lean: 0.3, spread: 10 },
  grass: { bladesMin: 4, bladesRange: 3, hMin: 10, hRange: 10, wMin: 1.6, wRange: 1, lean: 0.45, spread: 7 }
}
const LAKE_ALGAE_LAYOUT_SEED = 7721
//
// A field's blades root up to this far under its bed line.
//
const LAKE_ALGAE_FIELD_SINK_PX = 3
const LAKE_ALGAE_SHORE_CLEAR_PX = 24
const LAKE_ALGAE_MIN_H = 8
const LAKE_ALGAE_TOP_CLEAR_PX = 8
const LAKE_ALGAE_SEGMENTS = 7
const LAKE_ALGAE_TIP_W_FRAC = 0.15
const LAKE_ALGAE_ROOT_DEPTH_MIN = 0.3
const LAKE_ALGAE_ROOT_DEPTH_RANGE = 0.55
const LAKE_ALGAE_SWAY_PX = 5
const LAKE_ALGAE_SWAY_SPEED = 0.9
const LAKE_ALGAE_SWAY_LAG = 2.2
const LAKE_ALGAE_SWAY_MUL_MIN = 0.65
const LAKE_ALGAE_SWAY_MUL_RANGE = 0.75
const LAKE_ALGAE_WAVE_PX = 1.6
const LAKE_ALGAE_WAVE_FREQ = 9
const LAKE_ALGAE_CULL_PAD = 24
const LAKE_ALGAE_COS_LAG = Array.from({ length: LAKE_ALGAE_SEGMENTS + 1 }, (_, s) => {
  const u = s / LAKE_ALGAE_SEGMENTS
  return Math.cos(u * LAKE_ALGAE_SWAY_LAG) * LAKE_ALGAE_SWAY_PX * u * u
})
const LAKE_ALGAE_SIN_LAG = Array.from({ length: LAKE_ALGAE_SEGMENTS + 1 }, (_, s) => {
  const u = s / LAKE_ALGAE_SEGMENTS
  return Math.sin(u * LAKE_ALGAE_SWAY_LAG) * LAKE_ALGAE_SWAY_PX * u * u
})
const LAKE_REFLECTION_ALPHA = 0.3
const LAKE_REFLECTION_CORE_FRAC = 0.55
const LAKE_REFLECTION_PASS_ALPHA = 0.5
const LAKE_REFLECTION_ROW_PX = 2
const LAKE_REFLECTION_WOBBLE_PX = 1.5
const LAKE_REFLECTION_WOBBLE_ROW_PHASE = 0.7
const HALF = 0.5
const LAKE_REFLECTION_TAPER = 0.35
//
// Reflection columns: lake span fraction, width and length (px). They sit
// under the far-bank trunks, so they are not tied to gameplay trees.
//
const LAKE_REFLECTIONS = [
  { t: 0.24, w: 20, len: 30 },
  { t: 0.47, w: 14, len: 22 },
  { t: 0.68, w: 24, len: 34 },
  { t: 0.88, w: 16, len: 20 }
]
//
// Lake bed profile from the island's shore (where its slope meets the water
// line) to the far end of the shore bake, deep enough for the full drown
// sink. The island side steps down in earthy terraces, the middle is a broad
// floor, and the tree side rises as a steep bank.
// Keypoints are (u along the water, depth fraction); smoothstep between them
// flattens every keypoint into a ledge. Small humps break the regularity.
//
const LAKE_BED_MAX_DEPTH = LAKE_FULL_SINK_DEPTH
const LAKE_BED_PROFILE = [
  { u: 0, d: 0 },
  { u: 0.05, d: 0.2 },
  { u: 0.13, d: 0.24 },
  { u: 0.2, d: 0.52 },
  { u: 0.29, d: 0.58 },
  { u: 0.38, d: 0.88 },
  { u: 0.56, d: 0.97 },
  { u: 0.72, d: 1 },
  { u: 0.85, d: 0.95 },
  { u: 1, d: 0 }
]
const LAKE_BED_HUMP_PX = 12
const LAKE_BED_HUMP_WAVELENGTH = 42
const LAKE_BED_HUMP_SEED = 77.3
//
// Finer lumps on top of the humps, so the bottom line reads ragged and
// organic, not a drawn curve (smooth noise: no steps or cuts).
//
const LAKE_BED_RAG_PX = 2
const LAKE_BED_RAG_WAVELENGTH = 11
const LAKE_BED_RAG_SEED = 23.9
//
// Optional undercut right bank (cfg.bankHollow px): from LAKE_HOLLOW_FROM_U
// along the bed the right wall is one arc — from the bank's lip at the
// water line round under the bank and down into the bed at the wall's
// foot. A cubic curve: it leaves the lip downward (its first handle
// LAKE_HOLLOW_LIP of the wall's depth under the lip), is drawn out under
// the bank by a handle bankHollow × LAKE_HOLLOW_PULL to the right at
// LAKE_HOLLOW_MID of the depth, and ends at the foot. So the water runs
// on under an overhang of soil (its ceiling the arc's upper part, its bed
// the lower part), as by the cave lake's banks, with no straight edge and
// no corner anywhere. Sampled in LAKE_HOLLOW_SAMPLES steps; the bed's
// dark edge runs on along the whole arc up to the lip, one line.
//
const LAKE_HOLLOW_FROM_U = 0.84
const LAKE_HOLLOW_LIP = 0.3
const LAKE_HOLLOW_PULL = 1.8
const LAKE_HOLLOW_MID = 0.66
const LAKE_HOLLOW_SAMPLES = 800

/**
 * Makes the lake (its water, its bed layer baked once per k and sprite
 * key) and grows its algae.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x1 - Left end of the lake (world X)
 * @param {number} cfg.x2Core - Right end of the open water (world X); the shallows run on past it
 * @param {number} cfg.surfaceY - Water line (world Y)
 * @param {number} cfg.floorY - Ground line (world Y)
 * @param {string} cfg.spriteKey - Sprite name prefix, unique per caller (layouts differ)
 * @param {number} [cfg.waterStartX=cfg.x1] - Where the water starts (e.g. an island's shore)
 * @param {Array<{t: number, depth: number, canvas: HTMLCanvasElement, w: number, h: number}>} [cfg.bedStones] -
 *   Pictured stones lying on the bed instead of the drawn boulders: where along the open water
 *   (0..1), how far down the bed face (0 = far rim, 1 = front edge), picture and world size
 * @param {{water: string, paint: Object}} [cfg.palette] - Water colours (fill and CFG waterPaint-shaped paint); default the forest lake's
 * @param {number} [cfg.bankHollow=0] - How far the water runs on under the right bank (px; 0: a plain sloped bank)
 * @returns {Object} Lake inst: geometry (canvas-local frame at x1 / originY) plus algae
 */
export function create(cfg) {
  const { k } = cfg
  const lake = lakeGeometry(cfg)
  lake.bedStones = cfg.bedStones ?? null
  lake.drawPos = k.vec2(lake.x1, lake.originY)
  lake.view = { left: 0, right: 0 }
  lake.water = Water.create({
    k,
    key: cfg.spriteKey,
    columns: waterColumns(lake),
    surfaceY: lake.surfaceY,
    waveX1: lake.x1 + lake.islandShoreLocalX,
    waveX2: lake.x1 + lake.bakeSpan,
    palette: lake.pal,
    tune: LAKE_TUNE,
    paintUnder: ctx => paintReflections(ctx, lake)
  })
  bakeLakeBedSprite(k, lake)
  lake.algae = buildLakeAlgae(k, lake)
  return lake
}

/**
 * Runs the water's surface on by this frame's time.
 * @param {Object} lake - Lake inst
 */
export function onUpdate(lake) {
  Water.onUpdate(lake.water)
}

/**
 * Something broke the lake's surface at a world X (the hero fell in):
 * waves run off from it.
 * @param {Object} lake - Lake inst
 * @param {number} x - World X
 * @param {number} strength - How hard (1: a full splash)
 */
export function disturb(lake, x, strength) {
  Water.disturb(lake.water, x, strength)
}

/**
 * The lake's surface at a world X this moment (its waves).
 * @param {Object} lake - Lake inst
 * @param {number} x - World X
 * @returns {number} World Y of the surface
 */
export function surfaceAt(lake, x) {
  return Water.surfaceAt(lake.water, x)
}

/**
 * Draws the static bed layer (seen through the water).
 * @param {Object} k - Kaplay inst
 * @param {Object} lake - Lake inst
 * @param {number} [opacity=1] - Fade (menu backdrop cross-fade)
 */
export function drawBed(k, lake, opacity = 1) {
  if (!isLakeInView(k, lake)) return
  k.drawSprite({
    sprite: lake.bedSprite,
    pos: lake.drawPos,
    width: lake.canvasW,
    height: lake.canvasH,
    opacity
  })
}

/**
 * Sways and draws the lake's algae (drawAlgaeField).
 * @param {Object} k - Kaplay inst
 * @param {Object} lake - Lake inst
 * @param {number} [opacity=1] - Fade (menu backdrop cross-fade)
 */
export function drawAlgae(k, lake, opacity = 1) {
  drawAlgaeField(k, lake.algae, opacity)
}

/**
 * Algae of the forest lake's look along another water (the cave's lake):
 * the same tufts spread from x1 to x2, rooted on its bed.
 * @param {Object} k - Kaplay inst
 * @param {Object} cfg
 * @param {Object} cfg.paint - Palette with algae / algaeLight / algaeDark
 * @param {number} cfg.x1 - Left end of the water (world)
 * @param {number} cfg.x2 - Right end of the water (world)
 * @param {function(number): number} cfg.bedAt - Bed's world Y at a world X
 * @param {number} cfg.surfaceY - Water surface (world Y)
 * @returns {Object} Algae field
 */
export function createAlgaeField(k, cfg) {
  const span = cfg.x2 - cfg.x1 - LAKE_ALGAE_SHORE_CLEAR_PX * 2
  const field = buildAlgae(k, cfg.paint, t => cfg.x1 + LAKE_ALGAE_SHORE_CLEAR_PX + t * span, (x, rng) => {
    const rootY = cfg.bedAt(x) + rng() * LAKE_ALGAE_FIELD_SINK_PX
    return { x, y: rootY, room: rootY - cfg.surfaceY - LAKE_OPAQUE_SKIN_PX - LAKE_ALGAE_TOP_CLEAR_PX }
  })
  field.x1 = cfg.x1
  field.x2 = cfg.x2
  return field
}

/**
 * Sways and draws an algae field: slow sway with the bend growing toward
 * the tip and lagging behind the base; fronds also ripple along their
 * length. All leaf polygons first, then the frond midribs, in one batched
 * polygon.
 * @param {Object} k - Kaplay inst
 * @param {Object} field - Algae field (a lake's, or createAlgaeField's)
 * @param {number} [opacity=1] - Fade (menu backdrop cross-fade)
 */
export function drawAlgaeField(k, field, opacity = 1) {
  const camX = k.camPos().x
  const scale = k.camScale?.()
  const zoom = (typeof scale === 'object' ? scale.x : scale) || 1
  const half = k.width() / (2 * zoom)
  const minX = camX - half - LAKE_ALGAE_CULL_PAD
  const maxX = camX + half + LAKE_ALGAE_CULL_PAD
  if (field.x2 < minX || field.x1 > maxX) return
  const time = k.time()
  const { blades, indices, batch, visible } = field
  visible.length = 0
  for (let i = 0; i < blades.length; i++) {
    const blade = blades[i]
    if (blade.x < minX || blade.x > maxX) continue
    updateLakeAlgaeBlade(blade, time)
    PolyBatch.addPolygon(batch, blade.poly, indices, blade.color)
    blade.isFrond && visible.push(blade)
  }
  for (let i = 0; i < visible.length; i++) {
    PolyBatch.addTaperedRibbon(batch, visible[i].spine, LAKE_ALGAE_MIDRIB_PX, LAKE_ALGAE_MIDRIB_PX, visible[i].midrib, false)
  }
  PolyBatch.flush(batch, k, opacity)
}

/**
 * Draws the water (over the bed and algae): its band, body and the
 * surface's highlights.
 * @param {Object} k - Kaplay inst
 * @param {Object} lake - Lake inst
 * @param {number} [opacity=1] - Fade (menu backdrop cross-fade)
 */
export function drawFill(k, lake, opacity = 1) {
  if (!isLakeInView(k, lake)) return
  Water.onDraw(lake.water, cameraView(k, lake.view), opacity) && Water.onDrawHighlights(lake.water)
}

/**
 * World X where a lake made with cfg would end its open water at the right
 * bank, before it is made (what stands on the ground keeps right of it).
 * @param {Object} cfg - As for create (x1, x2Core, surfaceY, floorY, spriteKey, waterStartX)
 * @returns {number}
 */
export function openWaterEndXFor(cfg) {
  return openWaterEndX(lakeGeometry(cfg))
}

/**
 * Lake bottom (canvas-local Y) at canvas-local X.
 * @param {Object} lake - Lake inst
 * @param {number} localX - Canvas-local X
 * @returns {number}
 */
export function lakeBottomLocalY(lake, localX) {
  return bottomLocalY(lake, localX)
}

/**
 * The far rim of the lake's floor (canvas-local Y) at canvas-local X: the
 * top line of its sand, behind which what sinks into the bed goes out of
 * sight.
 * @param {Object} lake - Lake inst
 * @param {number} localX - Canvas-local X
 * @returns {number}
 */
export function lakeBedRimLocalY(lake, localX) {
  return lakeBedTopLocalY(lake, localX)
}

/**
 * '#rrggbb' plus an alpha byte, for canvas fills and gradient stops.
 * @param {string} hex - '#rrggbb'
 * @param {number} alpha - 0..1
 * @returns {string}
 */
function hexWithAlpha(hex, alpha) {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0')
}

//
// The lake's frame (canvas-local at x1 / originY, as the bed's bake
// measures it): its spans, the island's shore, sprite
// names and colours.
//
function lakeGeometry(cfg) {
  const { x1, x2Core, surfaceY, floorY, spriteKey } = cfg
  const coreSpan = x2Core - x1
  const bakeSpan = coreSpan + LAKE_SHORE_EXTEND_PX
  const topMargin = LAKE_TOP_MARGIN_PX
  const canvasH = Math.ceil(LAKE_BED_MAX_DEPTH + topMargin) + 2
  const originY = surfaceY - topMargin
  const islandShoreLocalX = (cfg.waterStartX ?? x1) - x1
  const bedSprite = `${spriteKey}-lake-bed-v${LAKE_BAKE_GEOMETRY_VERSION}`
  const lake = { x1, x2Core, surfaceY, floorY, originY, canvasW: 0, canvasH, bakeSpan, spanX: bakeSpan, coreSpan, topMargin, islandShoreLocalX, bedSprite, hollow: null, pal: cfg.palette ?? DEFAULT_PALETTE }
  cfg.bankHollow && (lake.hollow = buildHollow(lake, cfg.bankHollow))
  lake.spanX = lake.hollow ? lake.hollow.x2 : bakeSpan
  lake.canvasW = Math.ceil(lake.spanX) + 1
  return lake
}
//
// The undercut right bank: the wall's arc (line: canvas-local x and depth
// under the water line, from the lip to the foot) and, per column from
// where the wall starts (x0) to the back of the hollow (x2), the water's
// ceiling and bed depths under it.
//
function buildHollow(lake, reach) {
  const x0 = lake.islandShoreLocalX + LAKE_HOLLOW_FROM_U * (lake.bakeSpan - lake.islandShoreLocalX)
  const depth = bottomLocalY(lake, x0, false) - lake.topMargin
  const wall = { x0, x1: lake.bakeSpan, depth, reach }
  const line = Array.from({ length: LAKE_HOLLOW_SAMPLES + 1 }, (_, i) => hollowWallAt(wall, i / LAKE_HOLLOW_SAMPLES))
  const first = Math.floor(x0)
  const last = line.reduce((far, p) => Math.max(far, Math.floor(p.x)), first)
  const ceil = new Float32Array(last - first + 1).fill(Infinity)
  const bed = new Float32Array(last - first + 1).fill(-Infinity)
  line.forEach(p => {
    for (let x = first; x <= Math.floor(p.x); x++) {
      ceil[x - first] = Math.min(ceil[x - first], p.d)
      bed[x - first] = Math.max(bed[x - first], p.d)
    }
  })
  return { x0, first, x2: last + 1, ceil, bed, line }
}
//
// A point of the undercut bank's wall, s of the way along its arc from
// the lip (x1, the water line) to the foot (x0, the full depth).
//
function hollowWallAt(wall, s) {
  const u = 1 - s
  const lip = u * u * u + 3 * u * u * s
  const out = 3 * u * s * s
  const foot = s * s * s
  return {
    x: lip * wall.x1 + out * (wall.x1 + wall.reach * LAKE_HOLLOW_PULL) + foot * wall.x0,
    d: (3 * u * u * s * LAKE_HOLLOW_LIP + out * LAKE_HOLLOW_MID + foot) * wall.depth
  }
}
//
// The water's top at a canvas-local X: the surface, or under the undercut
// bank its soil ceiling.
//
function ceilLocalY(lake, localX) {
  const h = lake.hollow
  if (!h || localX <= lake.bakeSpan || localX >= h.x2) return lake.topMargin
  return lake.topMargin + h.ceil[Math.floor(localX) - h.first]
}
//
// The water's columns for water.js: every world px from the island's shore
// to the end of the shore bake (and on under the undercut bank), from the
// surface (or the bank's soil ceiling) down to the bed.
//
function waterColumns(lake) {
  const cols = []
  for (let localX = Math.ceil(lake.islandShoreLocalX); localX < lake.spanX; localX++) {
    cols.push({ x: lake.x1 + localX, top: lake.originY + ceilLocalY(lake, localX), y: lake.originY + bottomLocalY(lake, localX) })
  }
  return cols
}
//
// World X where the open water ends at the right bank (its last column
// deeper than the surface).
//
function openWaterEndX(lake) {
  let localX = Math.floor(lake.bakeSpan) - 1
  while (localX > 0 && bottomLocalY(lake, localX) <= lake.topMargin) localX--
  return lake.x1 + localX + 1
}
//
// Lake bottom (canvas-local Y) at canvas-local X: zero depth at the island
// shore and at the end of the shore bake, the skewed, uneven parabola in
// between (never deeper than LAKE_BED_MAX_DEPTH); its fine lumps left out
// when not ragged (what the floor face's far rim follows).
//
function bottomLocalY(lake, localX, ragged = true) {
  const h = lake.hollow
  if (h && localX >= h.x0) return localX >= h.x2 ? lake.topMargin : lake.topMargin + h.bed[Math.floor(localX) - h.first]
  const u = (localX - lake.islandShoreLocalX) / (lake.bakeSpan - lake.islandShoreLocalX)
  if (u <= 0 || u >= 1) return lake.topMargin
  const shape = lakeBedProfileAt(u)
  const hump = SoilSeam.seamValueNoise(localX / LAKE_BED_HUMP_WAVELENGTH, LAKE_BED_HUMP_SEED) * LAKE_BED_HUMP_PX
  const rag = ragged ? SoilSeam.seamValueNoise(localX / LAKE_BED_RAG_WAVELENGTH, LAKE_BED_RAG_SEED) * LAKE_BED_RAG_PX : 0
  const depth = (LAKE_BED_MAX_DEPTH + hump + rag) * shape
  return lake.topMargin + Math.min(LAKE_BED_MAX_DEPTH, Math.max(0, depth))
}
//
// Depth fraction at u: smoothstep between neighbouring profile keypoints.
//
function lakeBedProfileAt(u) {
  let i = 1
  while (i < LAKE_BED_PROFILE.length - 1 && LAKE_BED_PROFILE[i].u < u) i++
  const a = LAKE_BED_PROFILE[i - 1]
  const b = LAKE_BED_PROFILE[i]
  const s = Math.min(1, Math.max(0, (u - a.u) / (b.u - a.u)))
  return a.d + (b.d - a.d) * s * s * (3 - 2 * s)
}
//
// Top of the sand that settled on the bed (canvas-local Y). Sand only builds
// up where the bed is flat and deep enough — ledges and the floor — and
// thins to nothing on the terrace steps and the steep banks, so those read
// as bare earth. It follows the bottom without its fine lumps: they would
// read as steep slopes and spike the rim.
//
function lakeBedTopLocalY(lake, localX) {
  const bottom = bottomLocalY(lake, localX, false)
  let rise = 0
  for (let i = -LAKE_SAND_RISE_SAMPLES; i <= LAKE_SAND_RISE_SAMPLES; i++) rise += sandRiseAt(lake, localX + i * LAKE_SAND_RISE_STEP_PX)
  rise /= LAKE_SAND_RISE_SAMPLES * 2 + 1
  return Math.max(lake.topMargin + LAKE_OPAQUE_SKIN_PX, ceilLocalY(lake, localX) + 1, bottom - rise)
}
//
// How high the sand rises over the bottom at one column (none on steep
// ground or in the shallows).
//
function sandRiseAt(lake, localX) {
  const bottom = bottomLocalY(lake, localX, false)
  const slope = Math.abs(bottomLocalY(lake, localX + LAKE_BED_SLOPE_PROBE_PX, false) - bottomLocalY(lake, localX - LAKE_BED_SLOPE_PROBE_PX, false)) / (LAKE_BED_SLOPE_PROBE_PX * 2)
  const flat01 = Math.max(0, 1 - slope / LAKE_BED_SAND_MAX_SLOPE)
  const depth01 = Math.min(1, (bottom - lake.topMargin) / LAKE_BED_BACK_FULL_DEPTH_PX)
  const wobble = SoilSeam.seamValueNoise(localX / LAKE_BED_BACK_WOBBLE_WAVELENGTH, LAKE_BED_BACK_WOBBLE_SEED) * LAKE_BED_BACK_WOBBLE_PX
  const u = (localX - lake.islandShoreLocalX) / (lake.bakeSpan - lake.islandShoreLocalX)
  const wallRamp = Math.min(1, Math.max(0, (u - LAKE_SAND_WALL_FROM_U) / LAKE_SAND_WALL_RAMP_U))
  const wallFade = Math.min(1, (bottom - lake.topMargin) / LAKE_SAND_WALL_FADE_PX)
  return Math.max((LAKE_BED_BACK_RISE_PX + wobble) * depth01 * flat01 * flat01, LAKE_SAND_WALL_PX * wallRamp * wallFade)
}
//
// Static layer seen through the water: darkening murk, the earthy floor face
// with a lit far rim, its volume (shaded from far to near, the back wall's
// foot in shadow), then pebbles, the sunken snag and faceted boulders with
// their shadows (clipped to the bottom line), and a dark front cut along
// the bottom.
//
function bakeLakeBedSprite(k, lake) {
  if (k.getSprite(lake.bedSprite)) return
  const colors = lake.pal.paint
  const canvas = document.createElement('canvas')
  canvas.width = lake.canvasW
  canvas.height = lake.canvasH
  const ctx = canvas.getContext('2d')
  const murkTop = lake.topMargin + LAKE_OPAQUE_SKIN_PX
  const step = bedEndX(lake) / LAKE_BED_SEGMENTS
  const floorY = lake.topMargin + lake.floorY - lake.surfaceY + LAKE_BED_FLOOR_OVERLAP_PX
  const murkPath = new Path2D()
  murkPath.moveTo(0, murkTop)
  murkPath.lineTo(bedEndX(lake), murkTop)
  lake.hollow?.line.forEach(p => murkPath.lineTo(p.x, Math.max(murkTop, lake.topMargin + p.d)))
  for (let i = LAKE_BED_SEGMENTS; i >= 0; i--) murkPath.lineTo(i * step, Math.max(murkTop, bottomLocalY(lake, i * step)))
  murkPath.closePath()
  const murk = ctx.createLinearGradient(0, murkTop, 0, lake.canvasH)
  murk.addColorStop(0, colors.murkTop)
  murk.addColorStop(1, colors.murkDeep)
  ctx.fillStyle = murk
  ctx.fill(murkPath)
  ctx.save()
  ctx.clip(murkPath)
  paintLakeBedFace(ctx, lake, step, floorY, colors)
  ctx.restore()
  ctx.save()
  ctx.clip(murkPath)
  paintLakeBedVolume(ctx, lake, colors)
  paintLakeBedPebbles(ctx, lake, colors)
  paintLakeBedSnag(ctx, lake, colors)
  lake.bedStones ? paintLakeBedStones(ctx, lake) : paintLakeBedBoulders(ctx, lake, colors)
  ctx.restore()
  paintLakeBedFrontEdge(ctx, lake, step, floorY, colors)
  applyForestGameplaySharpBake(canvas, LAKE_BED_GRAIN_SEED)
  k.loadSprite(lake.bedSprite, canvas)
  canvas.width = 0
  canvas.height = 0
}
//
// Earth fill from the bottom down to just under the ground line, so the
// shallow shore ends never leave a gap above the earth band; then the sand
// layer with its light and dark grains.
//
function paintLakeBedFace(ctx, lake, step, floorY, colors) {
  const xs = bedFaceXs(lake, step)
  ctx.beginPath()
  ctx.moveTo(0, bedSeamLocalY(lake, 0, floorY))
  for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], bedSeamLocalY(lake, xs[i], floorY))
  for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], Math.max(floorY, bottomLocalY(lake, xs[i])))
  ctx.closePath()
  ctx.fillStyle = colors.bank
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, lakeBedTopLocalY(lake, 0))
  for (let i = 1; i < xs.length; i++) ctx.lineTo(xs[i], lakeBedTopLocalY(lake, xs[i]))
  for (let i = xs.length - 1; i >= 0; i--) ctx.lineTo(xs[i], bedSeamLocalY(lake, xs[i], floorY))
  ctx.closePath()
  ctx.fillStyle = colors.bed
  ctx.fill()
  ctx.save()
  ctx.clip()
  paintSandBlotches(ctx, lake, colors)
  ctx.restore()
  const rng = lakeBedBakeRng(LAKE_BED_GRAIN_SEED + 5)
  const light = hexWithAlpha(colors.sandLight, LAKE_SAND_GRAIN_ALPHA)
  const dark = hexWithAlpha(colors.sandDark, LAKE_SAND_GRAIN_ALPHA)
  for (let i = 0; i < LAKE_SAND_GRAINS; i++) {
    const x = Math.floor(rng() * lake.spanX)
    const top = lakeBedTopLocalY(lake, x)
    const bottom = bottomLocalY(lake, x)
    const y = Math.floor(top + (bottom - top) * rng())
    if (bottom - top < 1) continue
    ctx.fillStyle = i % 2 ? light : dark
    ctx.fillRect(x, y, 1 + Math.floor(rng() * LAKE_SAND_GRAIN_MAX), 1)
  }
}
//
// Soft patches of lighter and darker sand over the floor face.
//
function paintSandBlotches(ctx, lake, colors) {
  const rng = lakeBedBakeRng(LAKE_BED_GRAIN_SEED + 9)
  const light = hexWithAlpha(colors.sandLight, LAKE_SAND_BLOTCH_ALPHA)
  const dark = hexWithAlpha(colors.sandDark, LAKE_SAND_BLOTCH_ALPHA)
  for (let i = 0; i < LAKE_SAND_BLOTCHES; i++) {
    const x = rng() * lake.spanX
    const top = lakeBedTopLocalY(lake, x)
    const y = top + (bottomLocalY(lake, x) - top) * rng()
    const r = LAKE_SAND_BLOTCH_R + rng() * LAKE_SAND_BLOTCH_R_RANGE
    ctx.fillStyle = i % 2 ? light : dark
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * LAKE_SAND_BLOTCH_FLAT, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}
//
// The floor face shaded column by column from its far rim (dark, cool) to
// its near edge (lit), with sand ripples across it crowding toward the far
// rim (it recedes into the screen), and the back wall's foot in shadow
// above the rim.
//
function paintLakeBedVolume(ctx, lake, colors) {
  const far = hexWithAlpha(colors.bedShadow, LAKE_FACE_FAR_ALPHA)
  const clearShadow = hexWithAlpha(colors.bedShadow, 0)
  const near = hexWithAlpha(colors.bedLight, LAKE_FACE_NEAR_ALPHA)
  const foot = hexWithAlpha(colors.bedShadow, LAKE_WALL_FOOT_ALPHA)
  const line = hexWithAlpha(colors.sandLight, LAKE_FACE_LINE_ALPHA)
  const trough = hexWithAlpha(colors.sandDark, LAKE_FACE_LINE_ALPHA)
  for (let x = 0; x < lake.spanX; x++) {
    const top = lakeBedTopLocalY(lake, x)
    const bottom = bottomLocalY(lake, x)
    if (bottom - top < 1) continue
    const face = ctx.createLinearGradient(0, top, 0, bottom)
    face.addColorStop(0, far)
    face.addColorStop(LAKE_FACE_MID, clearShadow)
    face.addColorStop(1, near)
    ctx.fillStyle = face
    ctx.fillRect(x, top, 1, bottom - top)
    const wall = ctx.createLinearGradient(0, top, 0, top - LAKE_WALL_FOOT_PX)
    wall.addColorStop(0, foot)
    wall.addColorStop(1, clearShadow)
    ctx.fillStyle = wall
    ctx.fillRect(x, top - LAKE_WALL_FOOT_PX, 1, LAKE_WALL_FOOT_PX)
    for (let i = 1; i < LAKE_FACE_LINES; i++) {
      const share = i / LAKE_FACE_LINES
      const wave = Math.sin(x / LAKE_RIPPLE_WAVE + i) * LAKE_RIPPLE_AMP * share
      const y = Math.round(top + (bottom - top) * share * share + wave)
      ctx.fillStyle = line
      ctx.fillRect(x, y, 1, 1)
      ctx.fillStyle = trough
      ctx.fillRect(x, y + 1, 1, 1)
    }
  }
}
//
// A soft shadow on the floor under something of half-width r resting at
// (x, y).
//
function paintCastShadow(ctx, x, y, r, colors) {
  ctx.fillStyle = hexWithAlpha(colors.bedShadow, LAKE_CAST_ALPHA)
  ctx.beginPath()
  ctx.ellipse(x, y + r * LAKE_CAST_DROP * LAKE_CAST_FLAT, r, r * LAKE_CAST_FLAT, 0, 0, Math.PI * 2)
  ctx.fill()
}
//
// Size share of something on the floor face at a share of the way from its
// far rim (0) to its near edge (1).
//
function perspectiveScale(near) {
  return LAKE_FAR_SCALE + (1 - LAKE_FAR_SCALE) * near
}
//
// The columns the floor face is drawn through: its samples, then — under
// an undercut bank — every px of the hollow's bed (its sand runs on along
// the wall; drawn inside the water's own outline, it never leaves it).
//
function bedFaceXs(lake, step) {
  const xs = Array.from({ length: LAKE_BED_SEGMENTS + 1 }, (_, i) => i * step)
  for (let x = lake.hollow ? Math.ceil(lake.hollow.x0) : Infinity; x < lake.spanX; x++) xs.push(x)
  return xs
}
//
// Where the bed's sampled lines end: the end of the shore bake, or — with
// an undercut bank — the wall's foot (the wall's own arc carries on from
// there: the sampled bed would cut its corners and, past the hollow's
// back, leap up to the ground line).
//
function bedEndX(lake) {
  return lake.hollow ? lake.hollow.x0 : lake.spanX
}
//
// Dark cut where the floor face meets the earth band below the lake; with
// an undercut bank it runs on up the wall's arc, round under the bank, to
// its lip: the soil's contour, one line.
//
function paintLakeBedFrontEdge(ctx, lake, step, floorY, colors) {
  ctx.beginPath()
  ctx.moveTo(0, bedSeamLocalY(lake, 0, floorY))
  for (let i = 1; i <= LAKE_BED_SEGMENTS; i++) ctx.lineTo(i * step, bedSeamLocalY(lake, i * step, floorY))
  for (let i = lake.hollow ? lake.hollow.line.length - 1 : -1; i >= 0; i--) ctx.lineTo(lake.hollow.line[i].x, lake.topMargin + lake.hollow.line[i].d)
  ctx.strokeStyle = colors.bedEdge
  ctx.lineWidth = LAKE_BED_EDGE_PX
  ctx.lineJoin = 'round'
  ctx.stroke()
}
//
// Sand / earth contact on the bed: the bottom line itself, smooth (never
// above the ground line).
//
function bedSeamLocalY(lake, localX, floorY) {
  return Math.max(floorY, bottomLocalY(lake, localX))
}
//
// Pebbles scattered across the floor face, east of the island (smaller
// toward its far rim).
//
function paintLakeBedPebbles(ctx, lake, colors) {
  const x1 = lake.islandShoreLocalX + LAKE_ALGAE_SHORE_CLEAR_PX
  const rng = lakeBedBakeRng(LAKE_BED_GRAIN_SEED + 17)
  for (let i = 0; i < LAKE_BED_PEBBLE_COUNT; i++) {
    const x = x1 + rng() * (lake.coreSpan - x1)
    const top = lakeBedTopLocalY(lake, x)
    const near = rng()
    const y = top + (bottomLocalY(lake, x) - top) * near
    const r = (LAKE_BED_PEBBLE_R_MIN + rng() * LAKE_BED_PEBBLE_R_RANGE) * perspectiveScale(near)
    paintCastShadow(ctx, x, y + r * LAKE_BED_PEBBLE_SQUASH, r, colors)
    ctx.fillStyle = colors.pebble
    ctx.beginPath()
    ctx.ellipse(x, y, r, r * LAKE_BED_PEBBLE_SQUASH, 0, 0, Math.PI * 2)
    ctx.fill()
    ctx.fillStyle = colors.pebbleLight
    ctx.beginPath()
    const glint = r * LAKE_BED_PEBBLE_GLINT_SHIFT
    ctx.ellipse(x - glint, y - glint, r * LAKE_BED_PEBBLE_LIGHT_FRAC, r * LAKE_BED_PEBBLE_LIGHT_FRAC * LAKE_BED_PEBBLE_SQUASH, 0, 0, Math.PI * 2)
    ctx.fill()
  }
}
//
// Sunken branch lying across the floor face: tapered, slightly bowed, with
// two side twigs; contour first, then the body, then a lit top line.
//
function paintLakeBedSnag(ctx, lake, colors) {
  const cx = lakeWaterLocalX(lake, LAKE_SNAG_T)
  const top = lakeBedTopLocalY(lake, cx)
  const cy = top + (bottomLocalY(lake, cx) - top) * LAKE_SNAG_DEPTH_FRAC
  const pts = []
  for (let s = 0; s <= LAKE_SNAG_SEGMENTS; s++) {
    const u = s / LAKE_SNAG_SEGMENTS
    const along = (u - 0.5) * LAKE_SNAG_LEN
    pts.push({
      x: cx + along,
      y: cy + along * LAKE_SNAG_TILT - Math.sin(u * Math.PI) * LAKE_SNAG_BOW_PX
    })
  }
  const contour = LAKE_SNAG_CONTOUR_PX * 2
  strokeTaperedPolyline(ctx, pts, LAKE_SNAG_W + contour, LAKE_SNAG_TIP_W + contour, colors.stoneContour)
  for (const twig of LAKE_SNAG_TWIGS) {
    strokeTaperedPolyline(ctx, snagTwigPoints(pts, twig), lerpSnagWidth(twig.at) * LAKE_SNAG_TWIG_W_FRAC + contour, contour, colors.stoneContour)
  }
  strokeTaperedPolyline(ctx, pts, LAKE_SNAG_W, LAKE_SNAG_TIP_W, colors.snag)
  for (const twig of LAKE_SNAG_TWIGS) {
    strokeTaperedPolyline(ctx, snagTwigPoints(pts, twig), lerpSnagWidth(twig.at) * LAKE_SNAG_TWIG_W_FRAC, LAKE_SNAG_TWIG_TIP_W, colors.snag)
  }
  const lit = pts.map((p, s) => ({ x: p.x, y: p.y - lerpSnagWidth(s / LAKE_SNAG_SEGMENTS) * LAKE_SNAG_LIGHT_LIFT }))
  strokeTaperedPolyline(ctx, lit, LAKE_SNAG_W * LAKE_SNAG_LIGHT_FRAC, LAKE_SNAG_TIP_W * LAKE_SNAG_LIGHT_FRAC, colors.snagLight)
}
function lerpSnagWidth(u) {
  return LAKE_SNAG_W + (LAKE_SNAG_TIP_W - LAKE_SNAG_W) * u
}
//
// Straight twig leaving the branch at a fraction of its length.
//
function snagTwigPoints(pts, twig) {
  const idx = Math.round(twig.at * (pts.length - 1))
  const base = pts[idx]
  const len = twig.len * LAKE_SNAG_LEN
  return [
    base,
    { x: base.x + Math.cos(twig.angle) * len, y: base.y + Math.sin(twig.angle) * len }
  ]
}
//
// Polyline whose stroke width shrinks linearly from w0 to w1 (round caps hide
// the joints between segments).
//
function strokeTaperedPolyline(ctx, pts, w0, w1, color) {
  ctx.strokeStyle = color
  ctx.lineCap = 'round'
  for (let i = 1; i < pts.length; i++) {
    ctx.lineWidth = w0 + (w1 - w0) * ((i - 0.5) / (pts.length - 1))
    ctx.beginPath()
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
    ctx.lineTo(pts[i].x, pts[i].y)
    ctx.stroke()
  }
}
//
// Floor boulders half-sunk into the sand layer.
//
function paintLakeBedBoulders(ctx, lake, colors) {
  for (const spec of LAKE_BED_BOULDERS) {
    const cx = lakeWaterLocalX(lake, spec.t)
    const top = lakeBedTopLocalY(lake, cx)
    const baseY = top + (bottomLocalY(lake, cx) - top) * LAKE_BED_BOULDER_DEPTH_FRAC
    paintLakeBoulder(ctx, cx, baseY - spec.r * LAKE_BED_BOULDER_SQUASH * (1 - LAKE_BED_BOULDER_SINK), spec, colors)
  }
}
//
// Pictured stones on the floor, sunk a little into the sand layer.
//
function paintLakeBedStones(ctx, lake) {
  ctx.imageSmoothingQuality = 'high'
  for (const stone of lake.bedStones) {
    const cx = lakeWaterLocalX(lake, stone.t)
    const top = lakeBedTopLocalY(lake, cx)
    const baseY = top + (bottomLocalY(lake, cx) - top) * stone.depth
    const scale = perspectiveScale(stone.depth)
    const w = stone.w * scale
    const h = stone.h * scale
    paintCastShadow(ctx, cx, baseY, w / 2, lake.pal.paint)
    ctx.drawImage(stone.canvas, cx - w / 2, baseY - h * (1 - LAKE_BED_STONE_SINK), w, h)
  }
}
//
// One faceted boulder: dark shadow tone, a mid facet pushed to the upper
// left, a small lit facet, then a dark contour.
//
function paintLakeBoulder(ctx, cx, cy, spec, colors) {
  const rng = lakeBedBakeRng(LAKE_BED_GRAIN_SEED + spec.seed)
  const verts = []
  for (let i = 0; i < LAKE_BED_BOULDER_VERTS; i++) {
    const a = (i + (rng() - 0.5) * LAKE_BED_BOULDER_ANGLE_JITTER) / LAKE_BED_BOULDER_VERTS * Math.PI * 2
    const rr = spec.r * (1 + (rng() * 2 - 1) * LAKE_BED_BOULDER_JITTER)
    verts.push({ x: Math.cos(a) * rr, y: Math.sin(a) * rr * LAKE_BED_BOULDER_SQUASH })
  }
  const outline = boulderPath(verts, cx, cy, 1, 0, 0)
  ctx.fillStyle = colors.stoneDark
  ctx.fill(outline)
  ctx.save()
  ctx.clip(outline)
  const midShift = -spec.r * LAKE_BED_BOULDER_MID_SHIFT
  ctx.fillStyle = colors.stone
  ctx.fill(boulderPath(verts, cx, cy, LAKE_BED_BOULDER_MID_FRAC, midShift, midShift))
  const lightShift = -spec.r * LAKE_BED_BOULDER_LIGHT_SHIFT
  ctx.fillStyle = colors.stoneLight
  ctx.fill(boulderPath(verts, cx, cy, LAKE_BED_BOULDER_LIGHT_FRAC, lightShift, lightShift))
  ctx.restore()
  ctx.strokeStyle = colors.stoneContour
  ctx.lineWidth = LAKE_BED_BOULDER_CONTOUR_PX
  ctx.lineJoin = 'round'
  ctx.stroke(outline)
}
function boulderPath(verts, cx, cy, scale, dx, dy) {
  const path = new Path2D()
  verts.forEach((v, i) => {
    const x = cx + dx + v.x * scale
    const y = cy + dy + v.y * scale
    i === 0 ? path.moveTo(x, y) : path.lineTo(x, y)
  })
  path.closePath()
  return path
}
//
// Canvas-local X at fraction t of the open water, from just clear of the
// island shore to the right end of the lake core.
//
function lakeWaterLocalX(lake, t) {
  const x1 = lake.islandShoreLocalX + LAKE_ALGAE_SHORE_CLEAR_PX
  return x1 + t * (lake.coreSpan - x1)
}
function lakeBedBakeRng(seed) {
  let t = seed >>> 0
  return () => {
    t += 0x6D2B79F5
    let r = Math.imul(t ^ (t >>> 15), 1 | t)
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r)
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296
  }
}
//
// Algae tufts (world space) rooted at random depths of the floor face, so
// they sit "on" the receding floor; heights are capped below the wave band.
//
function buildLakeAlgae(k, lake) {
  const murkTop = lake.topMargin + LAKE_OPAQUE_SKIN_PX
  const field = buildAlgae(k, lake.pal.paint, t => lakeWaterLocalX(lake, t), (x, rng) => {
    const top = lakeBedTopLocalY(lake, x)
    const rootY = top + (bottomLocalY(lake, x) - top) * (LAKE_ALGAE_ROOT_DEPTH_MIN + rng() * LAKE_ALGAE_ROOT_DEPTH_RANGE)
    return { x: lake.x1 + x, y: lake.originY + rootY, room: rootY - murkTop - LAKE_ALGAE_TOP_CLEAR_PX }
  })
  field.x1 = lake.x1
  field.x2 = lake.x1 + lake.canvasW
  return field
}
//
// Algae tufts along a lake (LAKE_ALGAE_TUFTS): `cxAt(t)` places a tuft,
// `rootAt(x, rng)` gives a blade's world root and the room it has to grow
// (it draws from rng once).
//
function buildAlgae(k, paint, cxAt, rootAt) {
  const fronds = []
  const tones = [paint.algaeDark, paint.algae, paint.algaeLight].map((hex) => {
    const c = getRGB(k, hex)
    return k.rgb(c.r, c.g, c.b)
  })
  const rng = lakeBedBakeRng(LAKE_ALGAE_LAYOUT_SEED)
  for (const tuft of LAKE_ALGAE_TUFTS) {
    const cx = cxAt(tuft.t)
    const kind = LAKE_ALGAE_KINDS[tuft.kind]
    const count = kind.bladesMin + Math.floor(rng() * kind.bladesRange)
    for (let b = 0; b < count; b++) {
      const x = cx + (rng() * 2 - 1) * kind.spread
      const root = rootAt(x, rng)
      const h = Math.min(kind.hMin + rng() * kind.hRange, root.room)
      if (h < LAKE_ALGAE_MIN_H) continue
      const width = kind.wMin + rng() * kind.wRange
      const isFrond = tuft.kind === 'frond'
      const lean = (rng() * 2 - 1) * kind.lean
      const phase = rng() * Math.PI * 2
      const worldX = root.x
      const worldY = root.y
      const baseX = new Float32Array(LAKE_ALGAE_SEGMENTS + 1)
      const baseY = new Float32Array(LAKE_ALGAE_SEGMENTS + 1)
      const halfW = new Float32Array(LAKE_ALGAE_SEGMENTS + 1)
      for (let s = 0; s <= LAKE_ALGAE_SEGMENTS; s++) {
        const u = s / LAKE_ALGAE_SEGMENTS
        const ripple = isFrond ? Math.sin(u * LAKE_ALGAE_WAVE_FREQ + phase) * LAKE_ALGAE_WAVE_PX * u : 0
        baseX[s] = worldX + ripple + lean * h * u
        baseY[s] = worldY - h * u
        halfW[s] = width * (1 - (1 - LAKE_ALGAE_TIP_W_FRAC) * u) * 0.5
      }
      fronds.push({
        x: worldX,
        y: worldY,
        h,
        width,
        isFrond,
        lean,
        phase,
        swayMul: LAKE_ALGAE_SWAY_MUL_MIN + rng() * LAKE_ALGAE_SWAY_MUL_RANGE,
        color: tones[Math.floor(rng() * tones.length)],
        midrib: tones[tones.length - 1],
        baseX,
        baseY,
        halfW,
        spine: Array.from({ length: LAKE_ALGAE_SEGMENTS + 1 }, () => ({ x: 0, y: 0 })),
        poly: Array.from({ length: (LAKE_ALGAE_SEGMENTS + 1) * 2 }, () => ({ x: 0, y: 0 }))
      })
    }
  }
  return { blades: fronds, indices: lakeAlgaeStripIndices(), batch: PolyBatch.create(), visible: [], x1: 0, x2: 0 }
}
function isLakeInView(k, lake) {
  const view = cameraView(k, lake.view)
  return lake.x1 + lake.canvasW >= view.left && lake.x1 <= view.right
}
//
// The camera's world X span now, into `out`.
//
function cameraView(k, out) {
  const camX = k.camPos().x
  const scale = k.camScale?.()
  const zoom = (typeof scale === 'object' ? scale.x : scale) || 1
  const half = k.width() / (2 * zoom)
  out.left = camX - half
  out.right = camX + half
  return out
}
//
// Triangle strip between the left and right edges of a leaf polygon (left
// edge bottom→tip, right edge tip→bottom). Kaplay's default fan from vertex
// 0 would fold over on a curved blade.
//
function lakeAlgaeStripIndices() {
  const last = (LAKE_ALGAE_SEGMENTS + 1) * 2 - 1
  const indices = []
  for (let s = 0; s < LAKE_ALGAE_SEGMENTS; s++) {
    indices.push(s, s + 1, last - s, s + 1, last - s - 1, last - s)
  }
  return indices
}
function updateLakeAlgaeBlade(blade, time) {
  const baseAngle = time * LAKE_ALGAE_SWAY_SPEED * blade.swayMul + blade.phase
  const sinA = Math.sin(baseAngle)
  const cosA = Math.cos(baseAngle)
  const { baseX, baseY, halfW, spine, poly } = blade
  const last = poly.length - 1
  for (let s = 0; s <= LAKE_ALGAE_SEGMENTS; s++) {
    const sway = sinA * LAKE_ALGAE_COS_LAG[s] - cosA * LAKE_ALGAE_SIN_LAG[s]
    const x = baseX[s] + sway
    const y = baseY[s]
    const half = halfW[s]
    spine[s].x = x
    spine[s].y = y
    poly[s].x = x - half
    poly[s].y = y
    poly[last - s].x = x + half
    poly[last - s].y = y
  }
}
//
// Soft dark columns under the far-bank trunks (world coordinates, baked
// into the water under its surface), sliced into rows shifted a little
// each, so they read as reflections, not stripes.
//
function paintReflections(ctx, lake) {
  ctx.fillStyle = lake.pal.paint.reflection
  for (const spot of LAKE_REFLECTIONS) {
    const cx = lake.x1 + spot.t * lake.coreSpan
    for (let row = 0; row < spot.len; row += LAKE_REFLECTION_ROW_PX) {
      const u = row / spot.len
      const sway = Math.sin(row * LAKE_REFLECTION_WOBBLE_ROW_PHASE) * LAKE_REFLECTION_WOBBLE_PX
      const w = spot.w * (1 - LAKE_REFLECTION_TAPER * u)
      const y = lake.surfaceY + row
      ctx.globalAlpha = LAKE_REFLECTION_ALPHA * (1 - u) * LAKE_REFLECTION_PASS_ALPHA
      ctx.fillRect(cx + sway - w * HALF, y, w, LAKE_REFLECTION_ROW_PX)
      const coreW = w * LAKE_REFLECTION_CORE_FRAC
      ctx.fillRect(cx + sway - coreW * HALF, y, coreW, LAKE_REFLECTION_ROW_PX)
    }
  }
  ctx.globalAlpha = 1
}
