import { FOREST_PAL } from './forest-palette.js'
import { applyForestGameplaySharpBake } from './forest-focus-depth.js'
import * as SoilSeam from './forest-soil-seam.js'
import { getRGB } from '../../../utils/helper.js'
//
// Forest lake, shared by the forest level and the menu backdrop: a
// see-through water body baked as an animated wave cycle, over a static bed
// layer (murk, earthy terraces, sand with gravel, pebbles, a sunken snag,
// boulders) and live swaying algae rooted on the floor face. The water runs
// from `waterStartX` (the level's island shore, or the lake's left end) to
// past the core right end, where the shallows fade out.
//
// Full drown sink of the forest level: the hero's feet end 88 px under the
// floor, the water surface sits 8 px above it.
//
const LAKE_FULL_SINK_DEPTH = 96
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
const LAKE_SEGMENTS = 16
const LAKE_WAVE_FREQ = 0.85
const LAKE_WAVE_AMP = 3
const LAKE_WAVE_PHASE_SCALE = 4
const LAKE_WAVE_SECOND_AMP = 1.2
const LAKE_WAVE_SECOND_FREQ = 1.6
//
// Baked lake surface frames (painted water + grain), drawn untinted.
//
export const LAKE_BAKE_GEOMETRY_VERSION = 15
const LAKE_BAKE_FRAME_COUNT = 24
export const LAKE_BAKE_CYCLE = (Math.PI * 2) / LAKE_WAVE_FREQ
//
// Lake paint: every layer is a low-opacity palette swatch over the base
// fill, so the water reads painted while the surface stays calm next to
// the centipede ride.
//
const LAKE_SKIN_ALPHA = 0.28
const LAKE_SKIN_DEPTH_PX = 16
const LAKE_DEEP_ALPHA = 0.2
//
// See-through water: opaque only across the wave band at the surface, then
// fading to a light tint so the bed, algae and island slope show through.
//
const LAKE_OPAQUE_SKIN_PX = LAKE_WAVE_AMP + LAKE_WAVE_SECOND_AMP + 1
const LAKE_BODY_FADE_PX = 10
const LAKE_BODY_ALPHA = 0.42
//
// Double surface: a bright top line, a light band and a second fainter line
// under it, both riding the wave.
//
const LAKE_SURFACE_LINE_PX = 1.5
const LAKE_SURFACE_BAND_ALPHA = 0.32
const LAKE_SURFACE_SECOND_LINE_PX = 1
const LAKE_SURFACE_SECOND_LINE_ALPHA = 0.55
//
// Inner surface line uses its own wave frequencies and a time lag so the two
// bright lines and the band between them do not stay parallel.
//
const LAKE_SURFACE_INNER_WAVE_FREQ = 1.12
const LAKE_SURFACE_INNER_WAVE_AMP = 2.6
const LAKE_SURFACE_INNER_WAVE_PHASE_SCALE = 3.4
const LAKE_SURFACE_INNER_SECOND_FREQ = 2.05
const LAKE_SURFACE_INNER_SECOND_AMP = 1.35
const LAKE_SURFACE_INNER_TIME_LAG = 0.48
const LAKE_BED_SEGMENTS = 160
const LAKE_BED_BACK_RISE_PX = 11
const LAKE_BED_BACK_FULL_DEPTH_PX = 40
const LAKE_BED_BACK_WOBBLE_PX = 3
const LAKE_BED_BACK_WOBBLE_WAVELENGTH = 47
const LAKE_BED_BACK_WOBBLE_SEED = 12.9
const LAKE_BED_RIM_PX = 2
const LAKE_BED_EDGE_PX = 2
const LAKE_BED_SEAM_INDEX = 5
export const LAKE_BED_FLOOR_OVERLAP_PX = 2
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
const LAKE_REFLECTION_ALPHA = 0.3
const LAKE_REFLECTION_CORE_FRAC = 0.55
const LAKE_REFLECTION_PASS_ALPHA = 0.5
const LAKE_REFLECTION_ROW_PX = 2
const LAKE_REFLECTION_WOBBLE_PX = 1.5
const LAKE_REFLECTION_WOBBLE_ROW_PHASE = 0.7
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
const LAKE_RIPPLE_COUNT = 3
const LAKE_RIPPLE_SPACING_PX = 12
const LAKE_RIPPLE_START_PX = 6
const LAKE_RIPPLE_LEN_PX = 12
const LAKE_RIPPLE_LEN_SHRINK = 0.5
const LAKE_RIPPLE_DROP_PX = 3
const LAKE_RIPPLE_DROP_STEP_PX = 1.5
const LAKE_RIPPLE_ALPHA = 0.6
const LAKE_RIPPLE_PX = 1
//
// Lake bed profile from the island's shore (where its slope meets the water
// line) to the far end of the shore bake, deep enough for the full drown
// sink. The island side steps down in earthy terraces, the middle is a broad
// floor, and the tree side rises as a steep bank under the shore rocks.
// Keypoints are (u along the water, depth fraction); smoothstep between them
// flattens every keypoint into a ledge. Small humps break the regularity.
//
export const LAKE_BED_MAX_DEPTH = LAKE_FULL_SINK_DEPTH
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

/**
 * Bakes the lake (water frames and bed layer, once per k and sprite key)
 * and grows its algae.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x1 - Left end of the lake (world X)
 * @param {number} cfg.x2Core - Right end of the open water (world X); the shallows run on past it
 * @param {number} cfg.surfaceY - Water line (world Y)
 * @param {number} cfg.floorY - Ground line (world Y)
 * @param {string} cfg.spriteKey - Sprite name prefix, unique per caller (layouts differ)
 * @param {number} [cfg.waterStartX=cfg.x1] - Where the water starts (e.g. an island's shore)
 * @returns {Object} Lake inst: geometry (canvas-local frame at x1 / originY) plus algae
 */
export function create(cfg) {
  const { k } = cfg
  const lake = bakeLakeWaterSprites(k, cfg)
  bakeLakeBedSprite(k, lake)
  lake.algae = buildLakeAlgae(k, lake)
  return lake
}

/**
 * Draws the static bed layer (seen through the water).
 * @param {Object} k - Kaplay inst
 * @param {Object} lake - Lake inst
 * @param {number} [opacity=1] - Fade (menu backdrop cross-fade)
 */
export function drawBed(k, lake, opacity = 1) {
  k.drawSprite({
    sprite: lake.bedSprite,
    pos: k.vec2(lake.x1, lake.originY),
    width: lake.canvasW,
    height: lake.canvasH,
    opacity
  })
}

/**
 * Sways and draws the algae: slow sway with the bend growing toward the tip
 * and lagging behind the base; fronds also ripple along their length. All
 * leaf polygons first, then the frond midribs, to keep the primitive batch
 * unbroken.
 * @param {Object} k - Kaplay inst
 * @param {Object} lake - Lake inst
 * @param {number} [opacity=1] - Fade (menu backdrop cross-fade)
 */
export function drawAlgae(k, lake, opacity = 1) {
  const time = k.time()
  for (const blade of lake.algae.blades) {
    updateLakeAlgaeBlade(blade, time)
    k.drawPolygon({ pts: blade.poly, indices: lake.algae.indices, color: blade.color, opacity })
  }
  for (const blade of lake.algae.blades) {
    blade.isFrond && k.drawLines({ pts: blade.spine, width: LAKE_ALGAE_MIDRIB_PX, color: blade.midrib, opacity })
  }
}

/**
 * Sprite name of the water frame showing now in the baked wave cycle.
 * @param {Object} k - Kaplay inst
 * @param {Object} lake - Lake inst
 * @returns {string}
 */
export function fillFrameSprite(k, lake) {
  const frame = Math.floor((k.time() % LAKE_BAKE_CYCLE) / LAKE_BAKE_CYCLE * LAKE_BAKE_FRAME_COUNT) % LAKE_BAKE_FRAME_COUNT
  return lake.waterSpritePrefix + frame
}

/**
 * Draws the current water frame of the baked wave cycle.
 * @param {Object} k - Kaplay inst
 * @param {Object} lake - Lake inst
 * @param {number} [opacity=1] - Fade (menu backdrop cross-fade)
 */
export function drawFill(k, lake, opacity = 1) {
  k.drawSprite({
    sprite: fillFrameSprite(k, lake),
    pos: k.vec2(lake.x1, lake.originY),
    width: lake.canvasW,
    height: lake.canvasH,
    opacity
  })
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
 * Sand / earth contact line on the bed (canvas-local Y).
 * @param {Object} lake - Lake inst
 * @param {number} localX - Canvas-local X
 * @param {number} floorY - Canvas-local floor Y
 * @returns {number}
 */
export function lakeBedSeamLocalY(lake, localX, floorY) {
  return bedSeamLocalY(lake, localX, floorY)
}

/**
 * Surface wave offset at fraction t of the core span, at a time.
 * @param {number} t - 0..1 along the core span
 * @param {number} time - Seconds
 * @returns {number}
 */
export function lakeWaveOffsetAt(t, time) {
  return waveOffsetAt(t, time)
}

/**
 * Canvas-local Y of the bed's front line (sand / earth seam) under a lake —
 * the floor reference the bed bake and shore rocks sit on.
 * @param {Object} lake - Lake inst
 * @returns {number}
 */
export function bedFloorLocalY(lake) {
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
 */
export function tintUnderwater(ctx, width, height, waterY) {
  if (waterY >= height) return
  const tint = ctx.createLinearGradient(0, waterY, 0, height)
  tint.addColorStop(0, hexWithAlpha(FOREST_PAL.water, LAKE_SHORE_ROCK_TINT_TOP_ALPHA))
  tint.addColorStop(1, hexWithAlpha(FOREST_PAL.waterPaint.deep, LAKE_SHORE_ROCK_TINT_DEEP_ALPHA))
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
export function hexWithAlpha(hex, alpha) {
  return hex + Math.round(alpha * 255).toString(16).padStart(2, '0')
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
function bakeLakeWaterSprites(k, cfg) {
  const { x1, x2Core, surfaceY, floorY, spriteKey } = cfg
  const coreSpan = x2Core - x1
  const bakeSpan = coreSpan + LAKE_SHORE_EXTEND_PX
  const canvasW = Math.ceil(bakeSpan)
  const topMargin = LAKE_WAVE_AMP + LAKE_WAVE_SECOND_AMP + 2
  const canvasH = Math.ceil(LAKE_BED_MAX_DEPTH + topMargin) + 2
  const originY = surfaceY - topMargin
  const islandShoreLocalX = (cfg.waterStartX ?? x1) - x1
  const waterSpritePrefix = `${spriteKey}-lake-bake-v${LAKE_BAKE_GEOMETRY_VERSION}-`
  const bedSprite = `${spriteKey}-lake-bed-v${LAKE_BAKE_GEOMETRY_VERSION}`
  const geom = { x1, x2Core, surfaceY, floorY, originY, canvasW, canvasH, bakeSpan, coreSpan, topMargin, islandShoreLocalX, waterSpritePrefix, bedSprite }
  //
  // Frames already loaded on this k (menu revisit) are reused as they are.
  //
  if (k.getSprite(waterSpritePrefix + 0)) return geom
  for (let f = 0; f < LAKE_BAKE_FRAME_COUNT; f++) {
    const time = (f / LAKE_BAKE_FRAME_COUNT) * LAKE_BAKE_CYCLE
    const canvas = document.createElement('canvas')
    canvas.width = canvasW
    canvas.height = canvasH
    const ctx = canvas.getContext('2d')
    //
    // The water starts at the island's shore: further left the island's rocks
    // hold the water line, so no surface strip runs across them.
    //
    const waterSpan = bakeSpan - islandShoreLocalX
    const surfaceTop = buildLakeSurfaceLinePts(geom, time, waveOffsetAt)
    const surfaceInner = buildLakeSurfaceLinePts(geom, time + LAKE_SURFACE_INNER_TIME_LAG, lakeSurfaceInnerWaveOffsetAt)
    const pts = [...surfaceTop]
    for (let i = LAKE_SEGMENTS; i >= 0; i--) {
      const localX = islandShoreLocalX + (i / LAKE_SEGMENTS) * waterSpan
      pts.push([localX, bottomLocalY(geom, localX)])
    }
    const bodyY = topMargin + LAKE_OPAQUE_SKIN_PX
    const body = ctx.createLinearGradient(0, bodyY, 0, bodyY + LAKE_BODY_FADE_PX)
    body.addColorStop(0, FOREST_PAL.water)
    body.addColorStop(1, hexWithAlpha(FOREST_PAL.water, LAKE_BODY_ALPHA))
    ctx.fillStyle = body
    ctx.beginPath()
    ctx.moveTo(pts[0][0], pts[0][1])
    for (let p = 1; p < pts.length; p++) {
      ctx.lineTo(pts[p][0], pts[p][1])
    }
    ctx.closePath()
    ctx.fill()
    ctx.save()
    ctx.clip()
    const paint = { ctx, coreSpan, bakeSpan, topMargin, canvasW, canvasH, time }
    paintLakeGradient(paint)
    paintLakeReflections(paint)
    paintLakeShoreRipples(paint, islandShoreLocalX, 1)
    paintLakeShoreRipples(paint, coreSpan, -1)
    paintLakeSurfaceBand(ctx, surfaceTop, surfaceInner)
    ctx.restore()
    strokeLakeSurfaceLine(ctx, surfaceTop, 0, FOREST_PAL.waterPaint.surfaceLine, LAKE_SURFACE_LINE_PX)
    strokeLakeSurfaceLine(ctx, surfaceInner, 0, hexWithAlpha(FOREST_PAL.waterPaint.surfaceLine, LAKE_SURFACE_SECOND_LINE_ALPHA), LAKE_SURFACE_SECOND_LINE_PX)
    applyForestGameplaySharpBake(canvas, 5000 + f)
    k.loadSprite(waterSpritePrefix + f, canvas)
    canvas.width = 0
    canvas.height = 0
  }
  return geom
}
//
// Light band between the top surface line and the inner line (each has its
// own wave phase so the band breathes).
//
function buildLakeSurfaceLinePts(geom, time, waveOffsetAt) {
  const { islandShoreLocalX, bakeSpan, coreSpan, topMargin } = geom
  const waterSpan = bakeSpan - islandShoreLocalX
  const line = []
  for (let i = 0; i <= LAKE_SEGMENTS; i++) {
    const localX = islandShoreLocalX + (i / LAKE_SEGMENTS) * waterSpan
    const coreT = Math.min(1, localX / coreSpan)
    const shoreFade = lakeShoreFadeAtLocalX(localX, coreSpan, bakeSpan)
    line.push([localX, topMargin + waveOffsetAt(coreT, time) * shoreFade])
  }
  return line
}
function paintLakeSurfaceBand(ctx, surfaceTop, surfaceInner) {
  const colors = FOREST_PAL.waterPaint
  ctx.beginPath()
  ctx.moveTo(surfaceTop[0][0], surfaceTop[0][1])
  for (let i = 1; i < surfaceTop.length; i++) ctx.lineTo(surfaceTop[i][0], surfaceTop[i][1])
  for (let i = surfaceInner.length - 1; i >= 0; i--) ctx.lineTo(surfaceInner[i][0], surfaceInner[i][1])
  ctx.closePath()
  ctx.fillStyle = hexWithAlpha(colors.surfaceBand, LAKE_SURFACE_BAND_ALPHA)
  ctx.fill()
}
function strokeLakeSurfaceLine(ctx, surface, offsetY, color, width) {
  ctx.beginPath()
  ctx.moveTo(surface[0][0], surface[0][1] + offsetY)
  for (let i = 1; i < surface.length; i++) ctx.lineTo(surface[i][0], surface[i][1] + offsetY)
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.stroke()
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
  const depth = (LAKE_BED_MAX_DEPTH + hump) * shape
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
  const colors = FOREST_PAL.waterPaint
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
  paintLakeBedBoulders(ctx, lake, colors)
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
  const fronds = []
  const murkTop = lake.topMargin + LAKE_OPAQUE_SKIN_PX
  const palette = FOREST_PAL.waterPaint
  const tones = [palette.algaeDark, palette.algae, palette.algaeLight].map((hex) => {
    const c = getRGB(k, hex)
    return k.rgb(c.r, c.g, c.b)
  })
  const rng = lakeBedBakeRng(LAKE_ALGAE_LAYOUT_SEED)
  for (const tuft of LAKE_ALGAE_TUFTS) {
    const cx = lakeWaterLocalX(lake, tuft.t)
    const kind = LAKE_ALGAE_KINDS[tuft.kind]
    const count = kind.bladesMin + Math.floor(rng() * kind.bladesRange)
    for (let b = 0; b < count; b++) {
      const x = cx + (rng() * 2 - 1) * kind.spread
      const top = lakeBedTopLocalY(lake, x)
      const rootY = top + (bottomLocalY(lake, x) - top) * (LAKE_ALGAE_ROOT_DEPTH_MIN + rng() * LAKE_ALGAE_ROOT_DEPTH_RANGE)
      const h = Math.min(kind.hMin + rng() * kind.hRange, rootY - murkTop - LAKE_ALGAE_TOP_CLEAR_PX)
      if (h < LAKE_ALGAE_MIN_H) continue
      const width = kind.wMin + rng() * kind.wRange
      fronds.push({
        x: lake.x1 + x,
        y: lake.originY + rootY,
        h,
        width,
        isFrond: tuft.kind === 'frond',
        lean: (rng() * 2 - 1) * kind.lean,
        phase: rng() * Math.PI * 2,
        swayMul: LAKE_ALGAE_SWAY_MUL_MIN + rng() * LAKE_ALGAE_SWAY_MUL_RANGE,
        color: tones[Math.floor(rng() * tones.length)],
        midrib: tones[tones.length - 1],
        spine: Array.from({ length: LAKE_ALGAE_SEGMENTS + 1 }, () => k.vec2(0, 0)),
        poly: Array.from({ length: (LAKE_ALGAE_SEGMENTS + 1) * 2 }, () => k.vec2(0, 0))
      })
    }
  }
  return { blades: fronds, indices: lakeAlgaeStripIndices() }
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
  const swayRate = LAKE_ALGAE_SWAY_SPEED * blade.swayMul
  const last = blade.poly.length - 1
  for (let s = 0; s <= LAKE_ALGAE_SEGMENTS; s++) {
    const u = s / LAKE_ALGAE_SEGMENTS
    const sway = Math.sin(time * swayRate + blade.phase - u * LAKE_ALGAE_SWAY_LAG) * LAKE_ALGAE_SWAY_PX * u * u
    const ripple = blade.isFrond ? Math.sin(u * LAKE_ALGAE_WAVE_FREQ + blade.phase) * LAKE_ALGAE_WAVE_PX * u : 0
    const x = blade.x + sway + ripple + blade.lean * blade.h * u
    const y = blade.y - blade.h * u
    const half = blade.width * (1 - (1 - LAKE_ALGAE_TIP_W_FRAC) * u) * 0.5
    blade.spine[s].x = x
    blade.spine[s].y = y
    blade.poly[s].x = x - half
    blade.poly[s].y = y
    blade.poly[last - s].x = x + half
    blade.poly[last - s].y = y
  }
}
//
// Calm depth read: a light skin just under the surface, darkening with depth.
//
function paintLakeGradient(paint) {
  const { ctx, topMargin, canvasW, canvasH } = paint
  const colors = FOREST_PAL.waterPaint
  ctx.globalAlpha = LAKE_SKIN_ALPHA
  const skin = ctx.createLinearGradient(0, topMargin, 0, topMargin + LAKE_SKIN_DEPTH_PX)
  skin.addColorStop(0, colors.light)
  skin.addColorStop(1, `${colors.light}00`)
  ctx.fillStyle = skin
  ctx.fillRect(0, 0, canvasW, topMargin + LAKE_SKIN_DEPTH_PX)
  ctx.globalAlpha = LAKE_DEEP_ALPHA
  const deep = ctx.createLinearGradient(0, topMargin + LAKE_SKIN_DEPTH_PX, 0, topMargin + LAKE_BED_MAX_DEPTH)
  deep.addColorStop(0, `${colors.deep}00`)
  deep.addColorStop(1, colors.deep)
  ctx.fillStyle = deep
  ctx.fillRect(0, topMargin, canvasW, canvasH - topMargin)
  ctx.globalAlpha = 1
}
//
// Soft dark columns under the far-bank trunks, sliced into rows that sway
// with the frame time so they read as reflections, not stripes.
//
function paintLakeReflections(paint) {
  const { ctx, coreSpan, bakeSpan, topMargin, time } = paint
  ctx.fillStyle = FOREST_PAL.waterPaint.reflection
  for (const spot of LAKE_REFLECTIONS) {
    const cx = spot.t * coreSpan
    const surfaceY = topMargin + waveOffsetAt(spot.t, time) * lakeShoreFadeAtLocalX(cx, coreSpan, bakeSpan)
    for (let row = 0; row < spot.len; row += LAKE_REFLECTION_ROW_PX) {
      const u = row / spot.len
      const sway = Math.sin(time * LAKE_WAVE_FREQ + row * LAKE_REFLECTION_WOBBLE_ROW_PHASE) * LAKE_REFLECTION_WOBBLE_PX
      const w = spot.w * (1 - LAKE_REFLECTION_TAPER * u)
      const y = surfaceY + row
      ctx.globalAlpha = LAKE_REFLECTION_ALPHA * (1 - u) * LAKE_REFLECTION_PASS_ALPHA
      ctx.fillRect(cx + sway - w * 0.5, y, w, LAKE_REFLECTION_ROW_PX)
      const coreW = w * LAKE_REFLECTION_CORE_FRAC
      ctx.fillRect(cx + sway - coreW * 0.5, y, coreW, LAKE_REFLECTION_ROW_PX)
    }
  }
  ctx.globalAlpha = 1
}
//
// Thin light dashes drifting away from a shore line toward open water
// (`dir` = +1 east, -1 west); one full drift per bake cycle keeps the loop
// seamless.
//
function paintLakeShoreRipples(paint, shoreLocalX, dir) {
  const { ctx, coreSpan, bakeSpan, topMargin, time } = paint
  const cycleU = time / LAKE_BAKE_CYCLE
  ctx.fillStyle = FOREST_PAL.waterPaint.ripple
  for (let i = 0; i < LAKE_RIPPLE_COUNT; i++) {
    const u = (cycleU + i / LAKE_RIPPLE_COUNT) % 1
    const dist = LAKE_RIPPLE_START_PX + u * LAKE_RIPPLE_SPACING_PX * LAKE_RIPPLE_COUNT
    const cx = shoreLocalX + dir * dist
    const coreT = Math.max(0, Math.min(1, cx / coreSpan))
    const surfaceY = topMargin + waveOffsetAt(coreT, time) * lakeShoreFadeAtLocalX(cx, coreSpan, bakeSpan)
    const len = LAKE_RIPPLE_LEN_PX * (1 - LAKE_RIPPLE_LEN_SHRINK * u)
    ctx.globalAlpha = LAKE_RIPPLE_ALPHA * Math.sin(u * Math.PI)
    ctx.fillRect(cx - len * 0.5, surfaceY + LAKE_RIPPLE_DROP_PX + u * LAKE_RIPPLE_DROP_STEP_PX * LAKE_RIPPLE_COUNT, len, LAKE_RIPPLE_PX)
  }
  ctx.globalAlpha = 1
}
//
// Animated lake surface height at normalized shore span (0 = left).
//
function waveOffsetAt(t, time) {
  const wavePrimary = Math.sin(time * LAKE_WAVE_FREQ + t * LAKE_WAVE_PHASE_SCALE) * LAKE_WAVE_AMP
  const waveSecondary = Math.sin(time * LAKE_WAVE_SECOND_FREQ + t * LAKE_WAVE_PHASE_SCALE * 2.3) * LAKE_WAVE_SECOND_AMP
  return wavePrimary + waveSecondary
}
function lakeSurfaceInnerWaveOffsetAt(t, time) {
  const wavePrimary = Math.sin(time * LAKE_SURFACE_INNER_WAVE_FREQ + t * LAKE_SURFACE_INNER_WAVE_PHASE_SCALE) * LAKE_SURFACE_INNER_WAVE_AMP
  const waveSecondary = Math.sin(time * LAKE_SURFACE_INNER_SECOND_FREQ + t * LAKE_WAVE_PHASE_SCALE * 1.85 + 0.9) * LAKE_SURFACE_INNER_SECOND_AMP
  return wavePrimary + waveSecondary
}
