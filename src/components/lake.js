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
// Full drown sink of the forest level: the hero's feet end 88 px under the
// floor, the water surface sits 8 px above it.
//
const LAKE_FULL_SINK_DEPTH = 96
//
// Default water colours (the forest lake); a caller may pass its own.
//
const PAL = CFG.visual.colors.palette
const DEFAULT_PALETTE = { water: PAL.water, paint: PAL.waterPaint }
//
// Shore rocks sunk into the lake: bed clip sampling step and the water tint
// on their submerged part (top of the water / near the bed).
//
const LAKE_SHORE_ROCK_CLIP_STEP_PX = 2
const LAKE_SHORE_ROCK_TINT_TOP_ALPHA = 0.18
const LAKE_SHORE_ROCK_TINT_DEEP_ALPHA = 0.34
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
const LAKE_OPAQUE_SKIN_PX = 5.2
//
// Bed bake version (its sprite name).
//
const LAKE_BAKE_GEOMETRY_VERSION = 16
const LAKE_TUNE = FOREST_CFG.lakeWater
const LAKE_BED_SEGMENTS = 160
const LAKE_BED_BACK_RISE_PX = 11
const LAKE_BED_BACK_FULL_DEPTH_PX = 40
const LAKE_BED_BACK_WOBBLE_PX = 3
const LAKE_BED_BACK_WOBBLE_WAVELENGTH = 47
const LAKE_BED_BACK_WOBBLE_SEED = 12.9
const LAKE_BED_RIM_PX = 2
const LAKE_BED_EDGE_PX = 2
const LAKE_BED_SEAM_INDEX = 5
const LAKE_BED_FLOOR_OVERLAP_PX = 2
const LAKE_BED_SLOPE_PROBE_PX = 3
const LAKE_BED_SAND_MAX_SLOPE = 0.55
const LAKE_BED_GRAVEL_COUNT = 140
const LAKE_BED_GRAVEL_R_MIN = 0.8
const LAKE_BED_GRAVEL_R_RANGE = 1.2
const LAKE_BED_GRAVEL_STRETCH = 1.4
const LAKE_BED_GRAVEL_ALPHA = 0.85
const LAKE_BED_PEBBLE_COUNT = 22
const LAKE_BED_PEBBLE_R_MIN = 1.8
const LAKE_BED_PEBBLE_R_RANGE = 2.6
const LAKE_BED_PEBBLE_SQUASH = 0.7
const LAKE_BED_PEBBLE_LIGHT_FRAC = 0.45
const LAKE_BED_PEBBLE_GLINT_SHIFT = 0.3
const LAKE_BED_GRAIN_SEED = 5900
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
// floor, and the tree side rises as a steep bank under the shore rocks.
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
const LAKE_BED_HUMP_PX = 4
const LAKE_BED_HUMP_WAVELENGTH = 58
const LAKE_BED_HUMP_SEED = 77.3
//
// Optional ragged right bank (cfg.bankJag px): from LAKE_BANK_JAG_FROM_U
// along the bed the bottom line gets a short-wave noise plus sharp
// sample-and-hold steps (LAKE_BANK_JAG_STEP_SHARE of it), ramping in over
// LAKE_BANK_JAG_RAMP_U, so the steep bank reads as a cut, broken edge
// instead of one smooth slope.
//
const LAKE_BANK_JAG_FROM_U = 0.86
const LAKE_BANK_JAG_RAMP_U = 0.03
const LAKE_BANK_JAG_WAVE = 9
const LAKE_BANK_JAG_STEP_SHARE = 0.6
const LAKE_BANK_JAG_SEED = 41.7
const LAKE_BANK_JAG_STEP_INDEX = 23

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
 * @param {number} [cfg.bankJag=0] - How ragged the right bank's edge is (px)
 * @param {{water: string, paint: Object}} [cfg.palette] - Water colours (fill and CFG waterPaint-shaped paint); default the forest lake's
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
 * Lake bottom (canvas-local Y) at canvas-local X.
 * @param {Object} lake - Lake inst
 * @param {number} localX - Canvas-local X
 * @returns {number}
 */
export function lakeBottomLocalY(lake, localX) {
  return bottomLocalY(lake, localX)
}


/**
 * Canvas-local Y of the bed's front line (sand / earth seam) under a lake —
 * the floor reference the bed bake and shore rocks sit on.
 * @param {Object} lake - Lake inst
 * @returns {number}
 */
function bedFloorLocalY(lake) {
  return lake.topMargin + lake.floorY - lake.surfaceY + LAKE_BED_FLOOR_OVERLAP_PX
}

/**
 * World Y of the bed front line at a world X, or just under the ground line
 * outside the lake's bake span.
 * @param {Object} lake - Lake inst
 * @param {number} worldX - World X
 * @returns {number}
 */
export function bedWorldY(lake, worldX) {
  const localX = worldX - lake.x1
  if (localX < 0 || localX > lake.bakeSpan) return lake.floorY + LAKE_BED_FLOOR_OVERLAP_PX
  return lake.originY + bedSeamLocalY(lake, localX, bedFloorLocalY(lake))
}

/**
 * Clips a canvas (placed at world x0 / y0) to everything above the lake bed,
 * so shore rocks sunk into the lake stop at the bed.
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {Object} lake - Lake inst
 * @param {number} x0 - World X of the canvas
 * @param {number} y0 - World Y of the canvas
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 */
export function clipToBed(ctx, lake, x0, y0, width, height) {
  ctx.beginPath()
  ctx.moveTo(0, 0)
  ctx.lineTo(width, 0)
  for (let x = width; x >= 0; x -= LAKE_SHORE_ROCK_CLIP_STEP_PX) {
    ctx.lineTo(x, Math.min(height, bedWorldY(lake, x0 + x) - y0))
  }
  ctx.lineTo(0, Math.min(height, bedWorldY(lake, x0) - y0))
  ctx.closePath()
  ctx.clip()
}

/**
 * Water colour over the drawn pixels below the water line, deepening toward
 * the bed (source-atop keeps the silhouette and stays opaque).
 * @param {CanvasRenderingContext2D} ctx - Canvas context
 * @param {number} width - Canvas width
 * @param {number} height - Canvas height
 * @param {number} waterY - Canvas Y of the water line
 * @param {{water: string, paint: Object}} [palette] - Water colours (default: the forest lake's)
 */
export function tintUnderwater(ctx, width, height, waterY, palette = DEFAULT_PALETTE) {
  if (waterY >= height) return
  const tint = ctx.createLinearGradient(0, waterY, 0, height)
  tint.addColorStop(0, hexWithAlpha(palette.water, LAKE_SHORE_ROCK_TINT_TOP_ALPHA))
  tint.addColorStop(1, hexWithAlpha(palette.paint.deep, LAKE_SHORE_ROCK_TINT_DEEP_ALPHA))
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = tint
  ctx.fillRect(0, waterY, width, height - waterY)
  ctx.globalCompositeOperation = 'source-over'
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
// The lake's frame (canvas-local at x1 / originY, as the bed's bake and
// the shore rocks measure it): its spans, the island's shore, sprite
// names and colours.
//
function lakeGeometry(cfg) {
  const { x1, x2Core, surfaceY, floorY, spriteKey } = cfg
  const coreSpan = x2Core - x1
  const bakeSpan = coreSpan + LAKE_SHORE_EXTEND_PX
  const canvasW = Math.ceil(bakeSpan)
  const topMargin = LAKE_TOP_MARGIN_PX
  const canvasH = Math.ceil(LAKE_BED_MAX_DEPTH + topMargin) + 2
  const originY = surfaceY - topMargin
  const islandShoreLocalX = (cfg.waterStartX ?? x1) - x1
  const bedSprite = `${spriteKey}-lake-bed-v${LAKE_BAKE_GEOMETRY_VERSION}`
  return { x1, x2Core, surfaceY, floorY, originY, canvasW, canvasH, bakeSpan, coreSpan, topMargin, islandShoreLocalX, bedSprite, bankJag: cfg.bankJag ?? 0, pal: cfg.palette ?? DEFAULT_PALETTE }
}
//
// The water's columns for water.js: every world px from the island's shore
// to the end of the shore bake, from the surface down to the bed.
//
function waterColumns(lake) {
  const cols = []
  for (let localX = Math.ceil(lake.islandShoreLocalX); localX < lake.bakeSpan; localX++) {
    cols.push({ x: lake.x1 + localX, top: lake.surfaceY, y: lake.originY + bottomLocalY(lake, localX) })
  }
  return cols
}
//
// Lake bottom (canvas-local Y) at canvas-local X: zero depth at the island
// shore and at the end of the shore bake, the skewed, uneven parabola in
// between (never deeper than LAKE_BED_MAX_DEPTH).
//
function bottomLocalY(lake, localX) {
  const u = (localX - lake.islandShoreLocalX) / (lake.bakeSpan - lake.islandShoreLocalX)
  if (u <= 0 || u >= 1) return lake.topMargin
  const shape = lakeBedProfileAt(u)
  const hump = SoilSeam.seamValueNoise(localX / LAKE_BED_HUMP_WAVELENGTH, LAKE_BED_HUMP_SEED) * LAKE_BED_HUMP_PX
  const depth = (LAKE_BED_MAX_DEPTH + hump) * shape + bankJagAt(lake, localX, u)
  return lake.topMargin + Math.min(LAKE_BED_MAX_DEPTH, Math.max(0, depth))
}
//
// Ragged offset of the right bank's bottom line at canvas-local X (0 off
// the bank or without cfg.bankJag).
//
function bankJagAt(lake, localX, u) {
  if (!lake.bankJag || u <= LAKE_BANK_JAG_FROM_U) return 0
  const ramp = Math.min(1, (u - LAKE_BANK_JAG_FROM_U) / LAKE_BANK_JAG_RAMP_U)
  const wave = SoilSeam.seamValueNoise(localX / LAKE_BANK_JAG_WAVE, LAKE_BANK_JAG_SEED)
  const step = SoilSeam.seamJag(lake.x1 + localX, LAKE_BANK_JAG_STEP_INDEX)
  return (wave * (1 - LAKE_BANK_JAG_STEP_SHARE) + step * LAKE_BANK_JAG_STEP_SHARE) * lake.bankJag * ramp
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
// as bare earth.
//
function lakeBedTopLocalY(lake, localX) {
  const bottom = bottomLocalY(lake, localX)
  const slope = Math.abs(bottomLocalY(lake, localX + LAKE_BED_SLOPE_PROBE_PX) - bottomLocalY(lake, localX - LAKE_BED_SLOPE_PROBE_PX)) / (LAKE_BED_SLOPE_PROBE_PX * 2)
  const flat01 = Math.max(0, 1 - slope / LAKE_BED_SAND_MAX_SLOPE)
  const depth01 = Math.min(1, (bottom - lake.topMargin) / LAKE_BED_BACK_FULL_DEPTH_PX)
  const wobble = SoilSeam.seamValueNoise(localX / LAKE_BED_BACK_WOBBLE_WAVELENGTH, LAKE_BED_BACK_WOBBLE_SEED) * LAKE_BED_BACK_WOBBLE_PX
  const rise = (LAKE_BED_BACK_RISE_PX + wobble) * depth01 * flat01 * flat01
  return Math.max(lake.topMargin + LAKE_OPAQUE_SKIN_PX, bottom - rise)
}
//
// Static layer seen through the water: darkening murk, the earthy floor face
// with a lit far rim, then pebbles, the sunken snag and faceted boulders
// (clipped to the bottom line), and a dark front cut along the bottom.
//
function bakeLakeBedSprite(k, lake) {
  if (k.getSprite(lake.bedSprite)) return
  const colors = lake.pal.paint
  const canvas = document.createElement('canvas')
  canvas.width = lake.canvasW
  canvas.height = lake.canvasH
  const ctx = canvas.getContext('2d')
  const murkTop = lake.topMargin + LAKE_OPAQUE_SKIN_PX
  const step = lake.bakeSpan / LAKE_BED_SEGMENTS
  const floorY = lake.topMargin + lake.floorY - lake.surfaceY + LAKE_BED_FLOOR_OVERLAP_PX
  ctx.beginPath()
  ctx.moveTo(0, murkTop)
  ctx.lineTo(lake.bakeSpan, murkTop)
  for (let i = LAKE_BED_SEGMENTS; i >= 0; i--) {
    const x = i * step
    ctx.lineTo(x, Math.max(murkTop, bottomLocalY(lake, x)))
  }
  ctx.closePath()
  const murk = ctx.createLinearGradient(0, murkTop, 0, lake.canvasH)
  murk.addColorStop(0, colors.murkTop)
  murk.addColorStop(1, colors.murkDeep)
  ctx.fillStyle = murk
  ctx.fill()
  const murkPath = new Path2D()
  murkPath.moveTo(0, murkTop)
  murkPath.lineTo(lake.bakeSpan, murkTop)
  for (let i = LAKE_BED_SEGMENTS; i >= 0; i--) murkPath.lineTo(i * step, Math.max(murkTop, bottomLocalY(lake, i * step)))
  murkPath.closePath()
  paintLakeBedFace(ctx, lake, step, floorY, colors)
  ctx.save()
  ctx.clip(murkPath)
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
// layer with dark gravel specks and a lit top edge.
//
function paintLakeBedFace(ctx, lake, step, floorY, colors) {
  ctx.beginPath()
  ctx.moveTo(0, bedSeamLocalY(lake, 0, floorY))
  for (let i = 1; i <= LAKE_BED_SEGMENTS; i++) ctx.lineTo(i * step, bedSeamLocalY(lake, i * step, floorY))
  for (let i = LAKE_BED_SEGMENTS; i >= 0; i--) ctx.lineTo(i * step, Math.max(floorY, bottomLocalY(lake, i * step)))
  ctx.closePath()
  ctx.fillStyle = colors.bank
  ctx.fill()
  ctx.beginPath()
  ctx.moveTo(0, lakeBedTopLocalY(lake, 0))
  for (let i = 1; i <= LAKE_BED_SEGMENTS; i++) ctx.lineTo(i * step, lakeBedTopLocalY(lake, i * step))
  for (let i = LAKE_BED_SEGMENTS; i >= 0; i--) ctx.lineTo(i * step, bedSeamLocalY(lake, i * step, floorY))
  ctx.closePath()
  ctx.fillStyle = colors.bed
  ctx.fill()
  const x1 = lake.islandShoreLocalX + LAKE_ALGAE_SHORE_CLEAR_PX
  const rng = lakeBedBakeRng(LAKE_BED_GRAIN_SEED + 5)
  ctx.fillStyle = hexWithAlpha(colors.bedGravel, LAKE_BED_GRAVEL_ALPHA)
  for (let i = 0; i < LAKE_BED_GRAVEL_COUNT; i++) {
    const x = x1 + rng() * (lake.bakeSpan - x1)
    const top = lakeBedTopLocalY(lake, x)
    const bottom = bottomLocalY(lake, x)
    const r = LAKE_BED_GRAVEL_R_MIN + rng() * LAKE_BED_GRAVEL_R_RANGE
    if (bottom - top < r * 2) continue
    ctx.beginPath()
    ctx.ellipse(x, top + r + (bottom - top - r * 2) * rng(), r * LAKE_BED_GRAVEL_STRETCH, r, 0, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.beginPath()
  ctx.moveTo(0, lakeBedTopLocalY(lake, 0))
  for (let i = 1; i <= LAKE_BED_SEGMENTS; i++) ctx.lineTo(i * step, lakeBedTopLocalY(lake, i * step))
  ctx.strokeStyle = colors.bedRim
  ctx.lineWidth = LAKE_BED_RIM_PX
  ctx.stroke()
}
//
// Dark cut where the floor face meets the earth band below the lake.
//
function paintLakeBedFrontEdge(ctx, lake, step, floorY, colors) {
  ctx.beginPath()
  ctx.moveTo(0, bedSeamLocalY(lake, 0, floorY))
  for (let i = 1; i <= LAKE_BED_SEGMENTS; i++) ctx.lineTo(i * step, bedSeamLocalY(lake, i * step, floorY))
  ctx.strokeStyle = colors.bedEdge
  ctx.lineWidth = LAKE_BED_EDGE_PX
  ctx.lineJoin = 'round'
  ctx.stroke()
}
//
// Sand / earth contact on the bed: same soft tongues and pixel grit as the
// topsoil/subsoil seam in the ground band.
//
function bedSeamLocalY(lake, localX, floorY) {
  const worldX = lake.x1 + localX
  const base = bottomLocalY(lake, localX)
  const jag = SoilSeam.seamFringeOffset(worldX, LAKE_BED_SEAM_INDEX)
  return Math.max(floorY, base + jag)
}
//
// Pebbles scattered across the floor face, east of the island.
//
function paintLakeBedPebbles(ctx, lake, colors) {
  const x1 = lake.islandShoreLocalX + LAKE_ALGAE_SHORE_CLEAR_PX
  const rng = lakeBedBakeRng(LAKE_BED_GRAIN_SEED + 17)
  for (let i = 0; i < LAKE_BED_PEBBLE_COUNT; i++) {
    const x = x1 + rng() * (lake.coreSpan - x1)
    const r = LAKE_BED_PEBBLE_R_MIN + rng() * LAKE_BED_PEBBLE_R_RANGE
    const top = lakeBedTopLocalY(lake, x)
    const y = top + (bottomLocalY(lake, x) - top) * rng()
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
    ctx.drawImage(stone.canvas, cx - stone.w / 2, baseY - stone.h * (1 - LAKE_BED_STONE_SINK), stone.w, stone.h)
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
