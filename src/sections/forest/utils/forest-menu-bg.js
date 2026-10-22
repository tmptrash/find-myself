import { buildForestTree, renderForestTreeIntoContext } from './forest-tree.js'
import {
  FOREST_PAL,
  forestRgb,
  forestSkyBandRgb,
  forestRockShadedDrawPalette,
  forestContourRgb,
  buildDimmedTreePalette,
  getTreePaletteParallaxCorner,
  getTreePaletteColorForCorner
} from './forest-palette.js'
import { groundEarthLayersColor, paintLayeredEarthBand } from './forest-earth-band.js'
import { forestFloorPainterColors } from '../components/forest-floor.js'
import { forestContactShadowRgb, paintForestContactShadow } from './forest-atmosphere.js'
import { applyForestFilmGrainToCanvas } from './forest-parallax-grain.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import { drawGrassTuftToCanvas } from '../../../utils/draw-grass-tuft.js'
import { drawGroundRimToCanvas } from '../../../utils/draw-ground-rim.js'
import { drawSmallMushroomGroupToCanvas, drawSpottedMushroomToCanvas } from '../../../utils/draw-small-mushroom.js'
import { buildRockVertices, drawRockToCanvas } from '../../../utils/draw-rock.js'
import { createSeededRandom, nextSeed } from '../../../utils/seeded-random.js'
//
// Menu backdrop for the forest level: the level's own colour-world pieces
// (sky gradient, parallax tree rows, layered soil with its ragged rim,
// rocks, ferns, straw grass, mushroom groups) composed like the old menu
// picture — everything pulled to the left and right edges, the centre kept
// open for the section ring. Seeded, so every visit paints the same scene.
//
const LAYOUT_SEED = 61027
//
// Sky gradient: the palette-snapped zenith→horizon ramp is sampled once; each
// pixel reads it at its own height pushed by a seeded triangular jitter of up
// to SKY_DITHER_SPREAD (fraction of the sky height). Every swatch hand-over is
// spread over that whole band as fine hi-res grain instead of a hard edge.
//
const SKY_RAMP_SAMPLES = 256
const SKY_DITHER_SPREAD = 0.16
const SKY_DITHER_SEED = 40213
const RGBA_STRIDE = 4
const OPAQUE_ALPHA = 255
//
// Open centre — no tree trunk, rock or plant root inside this half-width.
// Edge zones fill the rest of each side.
//
const CENTER_KEEPOUT_HALF = 400
const EDGE_OVERHANG = 60
//
// Trunks stand farther out than the ground decor so the crowns (which
// spread well past the trunk) still stop short of the open centre.
//
const TREE_CROWN_CLEAR = 150
//
// Three tree rows, back to front: each nearer row is less dissolved into the
// sky haze, slightly shorter and stands a little lower so the rows overlap
// like the level's parallax.
//
const TREE_ROWS = [
  { count: 6, heightMin: 0.5, heightRange: 0.1, scale: 0.42, haze: 0.62, uniformWood: true, flatLeaves: true, sink: 0 },
  { count: 5, heightMin: 0.42, heightRange: 0.08, scale: 0.48, haze: 0.34, uniformWood: false, flatLeaves: false, sink: 6 },
  { count: 3, heightMin: 0.34, heightRange: 0.06, scale: 0.55, haze: 0.06, uniformWood: false, flatLeaves: false, sink: 12 }
]
//
// Tree height follows the distance from the screen edge: full height (times
// the edge factor) at the outer edge, shrinking toward the open centre.
//
const TREE_EDGE_HEIGHT_FACTOR = 1.25
const TREE_CENTER_HEIGHT_FACTOR = 0.3
const TREE_CORNER_KEYS = ['parallaxTreeCornerTL', 'parallaxTreeCornerTR', 'parallaxTreeCornerBL', 'parallaxTreeCornerBR']
const TREE_BUILD_OPTS = { includeRoots: false, includeHeroBranch: false }
//
// Ground dressing per side (counts are for one side; density grows toward
// the outer edge through EDGE_BIAS).
//
const EDGE_BIAS = 1.8
const ROCK_COUNT = 3
const ROCK_RADIUS_MIN = 22
const ROCK_RADIUS_RANGE = 22
const ROCK_SINK = 0.28
const ROCK_OUTLINE_WIDTH = 2
const FERN_COUNT = 5
const FERN_SIZE_MIN = 42
const FERN_SIZE_RANGE = 26
const TUFT_COUNT = 12
const MUSHROOM_GROUP_COUNT = 3
const SPOTTED_MUSHROOM_COUNT = 1
const CONTACT_SHADOW_RY = 4.5
const GRAIN_SEED = 7731
//
// Monochrome variant: every pixel is mapped by luminance onto the palette's
// gray ramp (Rec. 601 luma weights).
//
const LUMA_R = 0.299
const LUMA_G = 0.587
const LUMA_B = 0.114
const GRAY_RAMP = FOREST_PAL.grayRamp.map(hex => forestRgb(hex))

/**
 * Paints the forest-level menu backdrop into a fresh canvas.
 * @param {Object} cfg - Configuration
 * @param {number} cfg.width - Canvas width
 * @param {number} cfg.height - Canvas height
 * @param {number} cfg.groundY - Horizon / ground line Y
 * @param {boolean} [cfg.mono=false] - Gray-phase variant: no sky, the rest
 *   recoloured onto the palette's gray ramp (same layout and seed)
 * @returns {HTMLCanvasElement} Baked canvas (film grain applied)
 */
export function generateForestMenuBackgroundCanvas(cfg) {
  const { width, height, groundY, mono = false } = cfg
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  //
  // The gray variant reads its pixels back once (see mapCanvasToGrayRamp).
  //
  const ctx = canvas.getContext('2d', { willReadFrequently: mono })
  const rng = createSeededRandom(LAYOUT_SEED)
  const zones = buildEdgeZones(width, 0)
  const treeZones = buildEdgeZones(width, TREE_CROWN_CLEAR)
  !mono && paintSky(ctx, width, groundY)
  TREE_ROWS.forEach((row, i) => paintTreeRow(ctx, rng, row, i, treeZones, width, height, groundY))
  paintLayeredEarthBand(ctx, groundEarthLayersColor(), 0, groundY, width, height - groundY)
  paintGroundDressing(ctx, rng, zones, width, groundY)
  mono && mapCanvasToGrayRamp(ctx, width, height)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return canvas
}

/**
 * Ground-anchored X spots on both screen edges (outside the open centre),
 * for decor drawn live on top of the baked backdrop (e.g. stalk eyes).
 * @param {number} width - Canvas width
 * @param {number} count - Spots per side
 * @param {number} seed - Layout seed
 * @returns {number[]} World X positions, left side first
 */
export function forestMenuEdgeSpotXs(width, count, seed) {
  const rng = createSeededRandom(seed)
  const zones = buildEdgeZones(width, 0)
  return zones.flatMap(zone => Array.from({ length: count }, () => pickEdgeX(rng, zone)))
}
//
// Left and right decor zones; `outer` is the screen edge each zone leans to,
// `extraClear` widens the open centre further for that kind of decor.
//
function buildEdgeZones(width, extraClear) {
  const centerX = width / 2
  const keepout = CENTER_KEEPOUT_HALF + extraClear
  return [
    { x1: -EDGE_OVERHANG, x2: centerX - keepout, outer: -EDGE_OVERHANG },
    { x1: centerX + keepout, x2: width + EDGE_OVERHANG, outer: width + EDGE_OVERHANG }
  ]
}
//
// Random X inside a zone, skewed toward its outer screen edge so the decor
// thickens outward and thins toward the open centre.
//
function pickEdgeX(rng, zone) {
  const t = Math.pow(rng(), EDGE_BIAS)
  return zone.outer + (zoneInnerX(zone) - zone.outer) * t
}
//
// 0 at the zone's outer screen edge, 1 at its inner (centre-facing) end.
//
function edgeDistanceT(zone, x) {
  const t = (x - zone.outer) / (zoneInnerX(zone) - zone.outer)
  return Math.min(1, Math.max(0, t))
}
function zoneInnerX(zone) {
  return zone.outer === zone.x1 ? zone.x2 : zone.x1
}
//
// Same stacked palette bands as the level's sky bake (dark teal zenith down
// to the dawn-gold horizon).
//
function paintSky(ctx, width, groundY) {
  const ramp = buildSkyRamp()
  const last = ramp.length - 1
  const rng = createSeededRandom(SKY_DITHER_SEED)
  const image = ctx.createImageData(width, groundY)
  const data = image.data
  for (let y = 0; y < groundY; y++) {
    const t = (y + 0.5) / groundY
    for (let x = 0; x < width; x++) {
      const jittered = t + (rng() + rng() - 1) * SKY_DITHER_SPREAD
      const c = ramp[Math.min(last, Math.max(0, Math.floor(jittered * ramp.length)))]
      const i = (y * width + x) * RGBA_STRIDE
      data[i] = c.r
      data[i + 1] = c.g
      data[i + 2] = c.b
      data[i + 3] = OPAQUE_ALPHA
    }
  }
  ctx.putImageData(image, 0, 0)
}
//
// Palette-snapped sky colour at evenly spaced heights, zenith first.
//
function buildSkyRamp() {
  return Array.from({ length: SKY_RAMP_SAMPLES }, (_, i) => forestSkyBandRgb((i + 0.5) / SKY_RAMP_SAMPLES))
}
//
// One parallax row on both edges — farther rows dissolve into the forest
// air colour exactly like the level's background rows. Trees are grown at
// level size (the generator's crown spread is tuned for it) and scaled down
// around their base, so the crowns keep their proportions.
//
function paintTreeRow(ctx, rng, row, rowIndex, zones, width, height, groundY) {
  const haze = forestRgb(FOREST_PAL.forestLift)
  const bottomY = groundY + row.sink
  zones.forEach((zone, side) => {
    for (let i = 0; i < row.count; i++) {
      const x = Math.round(pickEdgeX(rng, zone))
      const centerT = edgeDistanceT(zone, x)
      const heightFactor = TREE_EDGE_HEIGHT_FACTOR + (TREE_CENTER_HEIGHT_FACTOR - TREE_EDGE_HEIGHT_FACTOR) * centerT
      const cornerKey = TREE_CORNER_KEYS[side + (rowIndex > 0 ? 2 : 0)]
      const base = rowIndex === TREE_ROWS.length - 1
        ? getTreePaletteColorForCorner(cornerKey)
        : getTreePaletteParallaxCorner(cornerKey)
      const palette = buildDimmedTreePalette(base, haze, row.haze, row.flatLeaves, 0, row.uniformWood)
      const treeH = groundY * (row.heightMin + rng() * row.heightRange) * heightFactor / row.scale
      const treeData = buildForestTree(
        nextSeed(rng), x, bottomY, Math.round(bottomY - treeH), bottomY, bottomY, TREE_BUILD_OPTS
      )
      ctx.save()
      ctx.translate(x, bottomY)
      ctx.scale(row.scale, row.scale)
      ctx.translate(-x, -bottomY)
      renderForestTreeIntoContext(ctx, treeData, palette, width / row.scale, height / row.scale)
      ctx.restore()
    }
  })
}
//
// Ragged rim along the whole ground line, then rocks, ferns, straw tufts and
// mushroom groups on the edges only, each on its own contact shadow.
//
function paintGroundDressing(ctx, rng, zones, width, groundY) {
  const colors = forestFloorPainterColors()
  const shadow = forestContactShadowRgb()
  drawGroundRimToCanvas(ctx, { x1: 0, x2: width, floorY: groundY, rng, colors: colors.rim })
  const tuftColors = {
    grass: FOREST_PAL.forestFloor.rimDry,
    dry: FOREST_PAL.forestFloor.grassDry,
    contactShadow: shadow
  }
  zones.forEach(zone => {
    repeat(ROCK_COUNT, () => paintRock(ctx, rng, pickEdgeX(rng, zone), groundY, shadow))
    repeat(FERN_COUNT, () => {
      const x = pickEdgeX(rng, zone)
      const size = FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE
      paintForestContactShadow(ctx, x, groundY, size * 0.42, CONTACT_SHADOW_RY, shadow)
      drawFernToCanvas(ctx, { x, baseY: groundY, size, rng, colors: colors.fern })
    })
    repeat(MUSHROOM_GROUP_COUNT, () => {
      const x = pickEdgeX(rng, zone)
      drawSmallMushroomGroupToCanvas(ctx, { x, baseY: groundY, rng, colors: { ...colors.mushroom, contactShadow: shadow } })
    })
    repeat(SPOTTED_MUSHROOM_COUNT, () => {
      drawSpottedMushroomToCanvas(ctx, { x: pickEdgeX(rng, zone), baseY: groundY, colors: colors.spotted })
    })
    repeat(TUFT_COUNT, () => {
      drawGrassTuftToCanvas(ctx, { x: pickEdgeX(rng, zone), baseY: groundY, rng, colors: tuftColors })
    })
  })
}
//
// Shaded forest rock seated a little into the soil, with the forest contour.
//
function paintRock(ctx, rng, x, groundY, shadow) {
  const radius = ROCK_RADIUS_MIN + rng() * ROCK_RADIUS_RANGE
  const contour = forestContourRgb('forest')
  paintForestContactShadow(ctx, x, groundY, radius, CONTACT_SHADOW_RY, shadow)
  drawRockToCanvas(ctx, {
    cx: x,
    cy: groundY - radius * ROCK_SINK,
    radius,
    verts: buildRockVertices(radius),
    palette: forestRockShadedDrawPalette(),
    skipShadow: true,
    skipTexture: true,
    outlineColor: `rgb(${contour.r}, ${contour.g}, ${contour.b})`,
    outlineWidth: ROCK_OUTLINE_WIDTH,
    outlineAlpha: 1
  })
}
function repeat(count, fn) {
  for (let i = 0; i < count; i++) fn()
}
//
// Gray-phase recolour: each opaque pixel takes the ramp swatch closest to its
// luminance, alpha is kept so edges stay soft.
//
function mapCanvasToGrayRamp(ctx, width, height) {
  const lut = buildGrayRampLut()
  const image = ctx.getImageData(0, 0, width, height)
  const data = image.data
  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] === 0) continue
    const c = lut[Math.round(data[i] * LUMA_R + data[i + 1] * LUMA_G + data[i + 2] * LUMA_B)]
    data[i] = c.r
    data[i + 1] = c.g
    data[i + 2] = c.b
  }
  ctx.putImageData(image, 0, 0)
}
//
// Luminance 0–255 → nearest gray-ramp swatch.
//
function buildGrayRampLut() {
  const rampLuma = GRAY_RAMP.map(c => c.r * LUMA_R + c.g * LUMA_G + c.b * LUMA_B)
  return Array.from({ length: 256 }, (_, l) => {
    let best = 0
    rampLuma.forEach((luma, i) => Math.abs(luma - l) < Math.abs(rampLuma[best] - l) && (best = i))
    return GRAY_RAMP[best]
  })
}
