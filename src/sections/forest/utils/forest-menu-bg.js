import { buildForestTree, renderForestTreeIntoContext } from './forest-tree.js'
import {
  FOREST_PAL,
  forestRgb,
  forestSkyBandRgb,
  forestRockShadedDrawPalette,
  forestContourRgb,
  buildDimmedTreePalette,
  getTreePaletteParallaxCorner,
  getTreePaletteColor
} from './forest-palette.js'
import { groundEarthLayersColor, paintLayeredEarthBand } from './forest-earth-band.js'
import { forestFloorPainterColors } from '../components/forest-floor.js'
import { forestContactShadowRgb, paintForestContactShadow } from './forest-atmosphere.js'
import { applyForestFilmGrainToCanvas, applyForestLayerGradeToCanvas, FOREST_LAYER_GRADE } from './forest-parallax-grain.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import { drawFeatherPlumeToCanvas } from '../../../utils/draw-feather-plume.js'
import { drawMossyTuftToCanvas } from '../../../utils/draw-mossy-hill.js'
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
// Sky: a plain smooth gradient through palette stops of the level's sky ramp
// (dark teal zenith → dawn-gold horizon), no grain. It runs a little below
// the ground line so the soil band always covers its lower edge.
//
const SKY_STOP_COUNT = 6
const SKY_GROUND_OVERLAP = 8
//
// Parallax rows behind the edge trees: full-width rows of trees with bushes
// at their feet, graded far/mid (low contrast, low saturation) and drawn at a
// low alpha so they stay a quiet backdrop with no focus. `depth` scales the
// cursor drift of each row; trees are spread evenly over the row width
// (jittered), plants every `plantStep` px.
//
const PARALLAX_ROWS = [
  {
    seed: 51307,
    count: 12,
    heightMin: 0.5,
    heightRange: 0.16,
    scale: 0.34,
    haze: 0.5,
    grade: 'far',
    alpha: 0.34,
    depth: 0.35,
    sink: 0,
    plants: 'tufts',
    plantStep: 40,
    cornerKey: 'parallaxTreeCornerTL'
  },
  {
    seed: 51419,
    count: 9,
    heightMin: 0.4,
    heightRange: 0.12,
    scale: 0.4,
    haze: 0.32,
    grade: 'mid',
    alpha: 0.42,
    depth: 0.7,
    sink: 4,
    plants: 'ferns',
    plantStep: 62,
    cornerKey: 'parallaxTreeCornerBR'
  }
]
const PARALLAX_TREE_JITTER = 0.4
const PARALLAX_TUFT_R_MIN = 12
const PARALLAX_TUFT_R_RANGE = 14
const PARALLAX_TUFT_SINK = 0.35
const PARALLAX_FERN_SIZE_MIN = 30
const PARALLAX_FERN_SIZE_RANGE = 22
const PARALLAX_PLUME_CHANCE = 0.3
const PARALLAX_PLUME_H_MIN = 34
const PARALLAX_PLUME_H_RANGE = 20
const PARALLAX_GRAIN_SEED = 7907
//
// Parallax rows are painted only down to just below the ground line (the
// soil band covers everything lower); the soil piece starts this far above
// the ground line to keep the rim, grass, ferns and rocks on it.
//
const PARALLAX_BOTTOM_PAD = 24
const GROUND_DECOR_TOP_PAD = 140
const RGBA_STRIDE = 4
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
  { count: 5, heightMin: 0.42, heightRange: 0.08, scale: 0.48, haze: 0.2, uniformWood: false, flatLeaves: false, sink: 6, green: true },
  { count: 3, heightMin: 0.34, heightRange: 0.06, scale: 0.55, haze: 0.04, uniformWood: false, flatLeaves: false, sink: 12, green: true }
]
//
// Tree height follows the distance from the screen edge: full height (times
// the edge factor) at the outer edge, shrinking toward the open centre.
//
const TREE_EDGE_HEIGHT_FACTOR = 1.25
const TREE_CENTER_HEIGHT_FACTOR = 0.3
//
// Back edge row palette per side (left, right); the nearer rows use the
// green big-tree palette of the level.
//
const TREE_CORNER_KEYS = ['parallaxTreeCornerTL', 'parallaxTreeCornerTR']
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
const GROUND_GRAIN_SEED = 7741
//
// Monochrome variant: every pixel is mapped by luminance onto the palette's
// gray ramp (Rec. 601 luma weights).
//
const LUMA_R = 0.299
const LUMA_G = 0.587
const LUMA_B = 0.114
const GRAY_RAMP = FOREST_PAL.grayRamp.map(hex => forestRgb(hex))

/**
 * Paints both forest menu backdrops in one pass. Colour: separate baked
 * layers, back to front — sky, parallax rows (wider than the screen by
 * `overscan` on both sides so they can drift), then the left / right edge
 * trees and the soil band with its dressing; every piece except the sky is
 * trimmed to its painted area so drawing it never covers empty screen.
 * Gray: the same edge trees and soil (no sky, no parallax rows) recoloured
 * onto the palette's gray ramp as one canvas — reusing the colour paint
 * instead of growing the trees twice.
 * @param {Object} cfg - Configuration
 * @param {number} cfg.width - Screen width
 * @param {number} cfg.height - Screen height
 * @param {number} cfg.groundY - Horizon / ground line Y
 * @param {number} cfg.overscan - Extra parallax width on each side (px)
 * @returns {{sky: Object, parallax: Object[], front: Object[], gray: HTMLCanvasElement}}
 *   Colour pieces `{ canvas, x, y }` in screen px (parallax pieces also carry
 *   `depth`, the cursor drift factor, and `alpha`, the draw opacity) plus the
 *   full-screen gray canvas
 */
export function generateForestMenuBackdrops(cfg) {
  const { width, height, groundY, overscan } = cfg
  const sky = { canvas: paintSkyCanvas(width, groundY + SKY_GROUND_OVERLAP), x: 0, y: 0 }
  const parallax = PARALLAX_ROWS.map(row => {
    const rowCanvas = paintParallaxRow(row, width + overscan * 2, groundY + PARALLAX_BOTTOM_PAD, groundY)
    const piece = cropToContent(rowCanvas, 0, rowCanvas.width)
    releaseCanvas(rowCanvas)
    return { ...piece, x: piece.x - overscan, depth: row.depth, alpha: row.alpha }
  })
  const trees = newCanvas(width, height)
  const ground = newCanvas(width, height)
  paintFrontScene(trees.getContext('2d', { willReadFrequently: true }), ground.getContext('2d', { willReadFrequently: true }), width, height, groundY)
  const gray = composeGrayCanvas(trees, ground)
  applyForestFilmGrainToCanvas(trees, GRAIN_SEED)
  applyForestFilmGrainToCanvas(ground, GROUND_GRAIN_SEED)
  const groundTop = Math.max(0, groundY - GROUND_DECOR_TOP_PAD)
  const front = [
    cropToContent(trees, 0, width / 2),
    cropToContent(trees, width / 2, width),
    { canvas: copyRegion(ground, 0, groundTop, width, height - groundTop), x: 0, y: groundTop }
  ].filter(piece => piece.canvas)
  releaseCanvas(trees)
  releaseCanvas(ground)
  return { sky, parallax: parallax.filter(piece => piece.canvas), front, gray }
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
// Edge trees into treeCtx, then the soil band and its dressing into
// groundCtx (both the same context for the one-canvas gray bake), all from
// one seeded stream so both variants share the layout.
//
function paintFrontScene(treeCtx, groundCtx, width, height, groundY) {
  const rng = createSeededRandom(LAYOUT_SEED)
  const zones = buildEdgeZones(width, 0)
  const treeZones = buildEdgeZones(width, TREE_CROWN_CLEAR)
  TREE_ROWS.forEach((row, i) => paintTreeRow(treeCtx, rng, row, i, treeZones, width, height, groundY))
  paintLayeredEarthBand(groundCtx, groundEarthLayersColor(), 0, groundY, width, height - groundY)
  paintGroundDressing(groundCtx, rng, zones, width, groundY)
}
//
// Smooth sky gradient through palette-snapped stops of the level's ramp.
//
function paintSkyCanvas(width, height) {
  const canvas = newCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  for (let i = 0; i < SKY_STOP_COUNT; i++) {
    const t = i / (SKY_STOP_COUNT - 1)
    const c = forestSkyBandRgb(t)
    gradient.addColorStop(t, `rgb(${c.r}, ${c.g}, ${c.b})`)
  }
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  return canvas
}
//
// One full-width parallax row: evenly spread trees in the parallax palette,
// plants along their feet, then the row's depth grade (contrast /
// saturation pulled toward the hued haze, little or no grain).
//
function paintParallaxRow(row, width, height, groundY) {
  const canvas = newCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const rng = createSeededRandom(row.seed)
  const haze = forestRgb(FOREST_PAL.forestLift)
  const palette = buildDimmedTreePalette(getTreePaletteParallaxCorner(row.cornerKey), haze, row.haze, true, 0, true)
  const bottomY = groundY + row.sink
  const slot = width / row.count
  for (let i = 0; i < row.count; i++) {
    const x = Math.round(slot * (i + 0.5 + (rng() - 0.5) * PARALLAX_TREE_JITTER))
    const treeH = groundY * (row.heightMin + rng() * row.heightRange) / row.scale
    const treeData = buildForestTree(nextSeed(rng), x, bottomY, Math.round(bottomY - treeH), bottomY, bottomY, TREE_BUILD_OPTS)
    paintScaledTree(ctx, treeData, palette, x, bottomY, row.scale, width, height)
  }
  paintParallaxPlants(ctx, rng, row, width, bottomY)
  applyForestLayerGradeToCanvas(canvas, FOREST_LAYER_GRADE[row.grade], PARALLAX_GRAIN_SEED + row.seed)
  return canvas
}
//
// Bushes at the row's feet: round mossy clumps on the far row, ferns with an
// occasional spike bush on the nearer one.
//
function paintParallaxPlants(ctx, rng, row, width, baseY) {
  const colors = forestFloorPainterColors()
  for (let x = rng() * row.plantStep; x < width; x += row.plantStep * (0.6 + rng() * 0.8)) {
    if (row.plants === 'tufts') {
      const r = PARALLAX_TUFT_R_MIN + rng() * PARALLAX_TUFT_R_RANGE
      drawMossyTuftToCanvas(ctx, x, baseY - r * PARALLAX_TUFT_SINK, r, rng, colors.hill)
      continue
    }
    rng() < PARALLAX_PLUME_CHANCE
      ? drawFeatherPlumeToCanvas(ctx, { x, baseY, height: PARALLAX_PLUME_H_MIN + rng() * PARALLAX_PLUME_H_RANGE, rng, colors: colors.plume })
      : drawFernToCanvas(ctx, { x, baseY, size: PARALLAX_FERN_SIZE_MIN + rng() * PARALLAX_FERN_SIZE_RANGE, rng, colors: colors.fern })
  }
}
//
// Trees are grown at level size (the generator's crown spread is tuned for
// it) and scaled down around their base, so the crowns keep their shape.
//
function paintScaledTree(ctx, treeData, palette, x, bottomY, scale, width, height) {
  ctx.save()
  ctx.translate(x, bottomY)
  ctx.scale(scale, scale)
  ctx.translate(-x, -bottomY)
  renderForestTreeIntoContext(ctx, treeData, palette, width / scale, height / scale)
  ctx.restore()
}
//
// Copy of the painted pixels of canvas columns [x1, x2) trimmed to their
// alpha bounding box — one pixel read per bake. Null when nothing is there.
//
function cropToContent(canvas, x1, x2) {
  const sx = Math.max(0, Math.floor(x1))
  const sw = Math.min(canvas.width, Math.ceil(x2)) - sx
  const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(sx, 0, sw, canvas.height).data
  let minX = sw
  let minY = canvas.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < sw; x++) {
      if (data[(y * sw + x) * RGBA_STRIDE + 3] === 0) continue
      x < minX && (minX = x)
      x > maxX && (maxX = x)
      y < minY && (minY = y)
      y > maxY && (maxY = y)
    }
  }
  if (maxX < 0) return { canvas: null, x: 0, y: 0 }
  const out = newCanvas(maxX - minX + 1, maxY - minY + 1)
  out.getContext('2d').drawImage(canvas, sx + minX, minY, out.width, out.height, 0, 0, out.width, out.height)
  return { canvas: out, x: sx + minX, y: minY }
}
//
// Edge trees over the soil band, recoloured onto the gray ramp, with grain.
//
function composeGrayCanvas(trees, ground) {
  const canvas = newCanvas(trees.width, trees.height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(trees, 0, 0)
  ctx.drawImage(ground, 0, 0)
  mapCanvasToGrayRamp(ctx, canvas.width, canvas.height)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return canvas
}
function copyRegion(canvas, x, y, width, height) {
  const out = newCanvas(width, height)
  out.getContext('2d').drawImage(canvas, x, y, width, height, 0, 0, width, height)
  return out
}
function newCanvas(width, height) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(width))
  canvas.height = Math.max(1, Math.round(height))
  return canvas
}
function releaseCanvas(canvas) {
  canvas.width = 0
  canvas.height = 0
}
//
// One edge tree row on both sides — the back row dissolves into the forest
// air colour like the level's background rows, the nearer rows wear the
// green leaves of the level's big trees.
//
function paintTreeRow(ctx, rng, row, rowIndex, zones, width, height, groundY) {
  const haze = forestRgb(FOREST_PAL.forestLift)
  const bottomY = groundY + row.sink
  zones.forEach((zone, side) => {
    for (let i = 0; i < row.count; i++) {
      const x = Math.round(pickEdgeX(rng, zone))
      const centerT = edgeDistanceT(zone, x)
      const heightFactor = TREE_EDGE_HEIGHT_FACTOR + (TREE_CENTER_HEIGHT_FACTOR - TREE_EDGE_HEIGHT_FACTOR) * centerT
      const base = row.green ? getTreePaletteColor() : getTreePaletteParallaxCorner(TREE_CORNER_KEYS[side])
      const palette = buildDimmedTreePalette(base, haze, row.haze, row.flatLeaves, 0, row.uniformWood)
      const treeH = groundY * (row.heightMin + rng() * row.heightRange) * heightFactor / row.scale
      const treeData = buildForestTree(
        nextSeed(rng), x, bottomY, Math.round(bottomY - treeH), bottomY, bottomY, TREE_BUILD_OPTS
      )
      paintScaledTree(ctx, treeData, palette, x, bottomY, row.scale, width, height)
    }
  })
}
//
// Rocks first (cut flat by the ground line), then the ragged rim along the
// whole ground line over their feet, then ferns, straw tufts and mushroom
// groups on the edges only, each on its own contact shadow.
//
function paintGroundDressing(ctx, rng, zones, width, groundY) {
  const colors = forestFloorPainterColors()
  const shadow = forestContactShadowRgb()
  zones.forEach(zone => repeat(ROCK_COUNT, () => paintRock(ctx, rng, pickEdgeX(rng, zone), groundY, width)))
  drawGroundRimToCanvas(ctx, { x1: 0, x2: width, floorY: groundY, rng, colors: colors.rim })
  const tuftColors = {
    grass: FOREST_PAL.forestFloor.rimDry,
    dry: FOREST_PAL.forestFloor.grassDry,
    contactShadow: shadow
  }
  zones.forEach(zone => {
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
// Shaded forest rock seated in the soil, with the forest contour. Only its
// part above the ground line is drawn: the soil cuts it horizontally, the
// ground rim then covers the cut.
//
function paintRock(ctx, rng, x, groundY, width) {
  const radius = ROCK_RADIUS_MIN + rng() * ROCK_RADIUS_RANGE
  const contour = forestContourRgb('forest')
  ctx.save()
  ctx.beginPath()
  ctx.rect(0, 0, width, groundY)
  ctx.clip()
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
  ctx.restore()
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
