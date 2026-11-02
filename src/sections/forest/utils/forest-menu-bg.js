import { FOREST_PAL, forestRgb, forestSkyBandRgb } from './forest-palette.js'
import { groundEarthLayersColor, paintLayeredEarthBand } from './forest-earth-band.js'
import { forestFloorPainterColors } from '../components/forest-floor.js'
import { forestContactShadowRgb, paintForestContactShadow, paintUndergroundDepthVignette } from './forest-atmosphere.js'
import { applyForestFilmGrainToCanvas, applyForestLayerGradeToCanvas, FOREST_LAYER_GRADE } from './forest-parallax-grain.js'
import { TRAMP_FACE_EYE_SCALE, drawCuteMushroomToCanvas } from './cute-mushroom.js'
import * as Lake from './forest-lake.js'
import { renderBushStrip } from './forest-bush-strip.js'
import { buildUndergroundSpec, renderUndergroundSpec, undergroundStaticEarthTones } from './forest-underground.js'
import { TREE_SHEET, loadForestPictureTrees, drawForestPictureTrees } from './forest-picture-trees.js'
import { BUSH_SHEET, loadForestPictureBushes, drawForestPictureBushes } from './forest-picture-bushes.js'
import { drawForestFern, loadForestFerns } from './forest-ferns.js'
import { loadForestStones, forestGroundStones, forestBuriedStones } from './forest-stones.js'
import { loadForestLeftTreePicture, drawLeftTreeToCanvas } from './forest-left-tree.js'
import { drawGrassTuftToCanvas } from '../../../utils/draw-grass-tuft.js'
import { drawGroundRimToCanvas } from '../../../utils/draw-ground-rim.js'
import { drawSmallMushroomGroupToCanvas, drawSpottedMushroomToCanvas } from '../../../utils/draw-small-mushroom.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
//
// Menu backdrop for the forest level, composed from the level's own pieces
// like one still of the level: the bright day sky and three hazy parallax
// rows of the level's picture trees and bushes behind, the level's left big
// apple tree (its picture) as the one vertical anchor on the right with its
// roots in the layered soil, the level's lake to its left (its stone pile on
// the tree-side bank is baked by the menu from forest-stones.js), mossy
// stones, ferns and mushrooms on the ground and the picture stones buried in
// the soil. The left third stays calm for the menu column. Layout values are
// design px at REF_HEIGHT and scale with the screen height. The lake water,
// grass, bomb trees, stalk eyes, clouds and the crawler are live (see
// forestMenuLayout). The pictures must be loaded first
// (loadForestMenuBackdropArt).
//
const LAYOUT_SEED = 61027
const REF_HEIGHT = 1080
//
// Ground line as a fraction of the screen height.
//
const GROUND_Y_FRAC = 0.78
//
// Sky: a plain smooth gradient through palette stops of the level's sky ramp
// (dark teal zenith → dawn-gold horizon), no grain. It runs a little below
// the ground line so the soil band always covers its lower edge.
//
const SKY_STOP_COUNT = 6
const SKY_GROUND_OVERLAP = 8
//
// Parallax rows behind the scene — as many as the level has (far, mid,
// near): full-width rows of the level's picture trees (tree sheet, count,
// scale as in the level) with bushes at their feet (the nearer rows' picture
// hedges, the far row's leafy bush strip), graded by depth (contrast /
// saturation pulled toward the hued haze). Rows are opaque; `alpha` is how
// much of a row's own colour survives its mix toward the sky (rising toward
// the front), so the far row stays a quiet backdrop. Trees are spread evenly
// over the row width (jittered).
//
const PARALLAX_ROWS = [
  {
    seed: 51307,
    sheet: TREE_SHEET.FAR,
    count: 20,
    treeScale: 0.62,
    grade: 'far',
    alpha: 0.34,
    sink: 0,
    tier: 'background',
    bushScale: 1.55,
    cornerKey: 'parallaxTreeCornerTL'
  },
  {
    seed: 51419,
    sheet: TREE_SHEET.MID,
    count: 9,
    treeScale: 0.8,
    grade: 'mid',
    alpha: 0.42,
    sink: 4,
    bushSheet: BUSH_SHEET.MID,
    bushScale: 0.56
  },
  {
    seed: 51533,
    sheet: TREE_SHEET.MID,
    count: 7,
    treeScale: 0.96,
    grade: 'near',
    alpha: 0.6,
    sink: 6,
    bushSheet: BUSH_SHEET.NEAR,
    bushScale: 0.36
  }
]
const PARALLAX_TREE_JITTER = 0.4
const PARALLAX_GRAIN_SEED = 7907
//
// Parallax rows are painted only down to just below the ground line (the
// soil band covers everything lower).
//
const PARALLAX_BOTTOM_PAD = 24
const RGBA_STRIDE = 4
//
// The apple tree — the level's left big tree (its picture) at
// APPLE_TREE_SIZE of its level size, its foot at APPLE_TREE_X_FRAC.
//
const APPLE_TREE_X_FRAC = 0.66
const APPLE_TREE_SIZE = 1.1
//
// The level's lake to the left of the apple tree (x as fractions of the
// screen width): its water line sits LAKE_SURFACE_LIFT px above the ground
// line (a little lower than in the level, so the bank shows); the shallows
// run on past the core right end.
//
const LAKE_X1_FRAC = 0.24
const LAKE_X2_CORE_FRAC = 0.44
const LAKE_SURFACE_LIFT = 2
//
// Ground stones like the level's: the sheet's mossy stones, stones with
// plants and bits of wall, in small groups (x as a fraction of the screen
// width, how many, spread in design px), each at the level's ground stone
// size (a little random) and sunk STONE_SINK design px into the soil.
//
const STONE_GROUPS = [
  { xFrac: 0.765, count: 2, spread: 50 },
  { xFrac: 0.85, count: 2, spread: 40 },
  { xFrac: 0.92, count: 3, spread: 60 },
  { xFrac: 0.99, count: 1, spread: 20 },
  { xFrac: 0.06, count: 2, spread: 50 },
  { xFrac: 0.53, count: 1, spread: 20 }
]
const STONE_SCALE = 0.34
const STONE_SCALE_JITTER = 0.15
const STONE_SINK = 3
//
// Ground plants: ferns and straw tufts thicken toward the screen edges and
// around the apple tree's foot (hiding the seam of its trunk and roots),
// mushroom groups gather at the tree.
//
const FERN_SPOTS = [0.02, 0.09, 0.15, 0.5, 0.61, 0.645, 0.68, 0.74, 0.8, 0.87, 0.97]
const FERN_SIZE_MIN = 42
const FERN_SIZE_RANGE = 26
const TUFT_COUNT = 34
const TUFT_EDGE_BIAS = 1.6
const MUSHROOM_GROUP_SPOTS = [0.58, 0.77, 0.95, 0.12]
const SPOTTED_MUSHROOM_SPOTS = [0.6, 0.79, 0.22]
//
// The level's trampoline mushroom, sleeping by the tree — the big warm
// accent of the ground plane (echoes the menu icon).
//
const CUTE_MUSHROOM_X_FRAC = 0.575
const CUTE_MUSHROOM_W = 76
const CONTACT_SHADOW_RY = 4.5
//
// Live decor spots (fractions of the screen width): stalk eyes watching the
// menu hero, the two bomb trees and the crawler's roaming strip
// on the ground east of the lake.
//
const EYE_SPOT_FRACS = [0.52, 0.735]
const BOMB_TREE_X_FRACS = [0.79, 0.93]
const CRAWLER_MIN_X_FRAC = 0.5
const CRAWLER_MAX_X_FRAC = 0.98
const FRONT_GRAIN_SEED = 7741
//
// Half-width of the apple tree's trunk zone for the buried decor (thinner
// small decor there, hair-roots only east of it).
//
const BURIED_TREE_CLEAR_HALF = 50

/**
 * Waits for every picture the backdrop paints (once per page).
 * @returns {Promise<void>}
 */
export async function loadForestMenuBackdropArt() {
  await Promise.all([loadForestPictureTrees(), loadForestPictureBushes(), loadForestFerns(), loadForestStones(), loadForestLeftTreePicture()])
}

/**
 * Forest menu layout for a screen size: the ground line, the lake span and
 * the spots of the live decor standing on the ground.
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @returns {Object} groundY, lake {x1, x2Core, x2, surfaceY}, eyeSpots,
 *   earTreeSpots [{x}] (the bomb trees), crawler {minX, maxX}
 */
export function forestMenuLayout(width, height) {
  const groundY = Math.round(height * GROUND_Y_FRAC)
  const x1 = Math.round(width * LAKE_X1_FRAC)
  const x2Core = Math.round(width * LAKE_X2_CORE_FRAC)
  return {
    groundY,
    lake: { x1, x2Core, x2: x2Core + Lake.LAKE_SHORE_EXTEND_PX, surfaceY: groundY - LAKE_SURFACE_LIFT },
    eyeSpots: EYE_SPOT_FRACS.map(f => ({ x: Math.round(width * f), groundY })),
    earTreeSpots: BOMB_TREE_X_FRACS.map(f => ({ x: Math.round(width * f) })),
    crawler: { minX: Math.round(width * CRAWLER_MIN_X_FRAC), maxX: Math.round(width * CRAWLER_MAX_X_FRAC) }
  }
}

/**
 * Paints the forest menu backdrop as baked layers that go under the live
 * lake, back to front: sky, the three parallax rows, then the front scene
 * (framing trees, soil, apple tree, ground dressing). Every piece except the
 * sky is trimmed to its painted area so drawing it never covers empty screen.
 * @param {Object} cfg - Configuration
 * @param {number} cfg.width - Screen width
 * @param {number} cfg.height - Screen height
 * @returns {Array<Object>} Pieces `{ canvas, x, y }`
 */
export function generateForestMenuBackdrop(cfg) {
  const { width, height } = cfg
  const layout = forestMenuLayout(width, height)
  const { groundY } = layout
  const scale = height / REF_HEIGHT
  const skyH = groundY + SKY_GROUND_OVERLAP
  const sky = { canvas: paintSkyCanvas(width, skyH), x: 0, y: 0 }
  const parallax = PARALLAX_ROWS.map(row => {
    const rowCanvas = paintParallaxRow(row, width, groundY + PARALLAX_BOTTOM_PAD, groundY)
    hazeRowOverSky(rowCanvas, row.alpha, skyH)
    const piece = cropToContent(rowCanvas)
    releaseCanvas(rowCanvas)
    return piece
  })
  const front = newCanvas(width, height)
  paintFrontScene(front.getContext('2d', { willReadFrequently: true }), width, height, layout, scale)
  applyForestFilmGrainToCanvas(front, FRONT_GRAIN_SEED)
  const frontPiece = cropToContent(front)
  releaseCanvas(front)
  return [sky, ...parallax, frontPiece].filter(piece => piece.canvas)
}

//
// The front scene from one seeded stream: soil band, ground stones and the
// ground rim (open over the lake), the apple tree with its roots over the
// soil, then the ground plants and mushrooms over its foot.
//
function paintFrontScene(ctx, width, height, layout, scale) {
  const { groundY, lake } = layout
  const rng = createSeededRandom(LAYOUT_SEED)
  paintLayeredEarthBand(ctx, groundEarthLayersColor(), 0, groundY, width, height - groundY)
  paintBuriedDecor(ctx, width, height, layout, scale)
  STONE_GROUPS.forEach(group => paintStoneGroup(ctx, rng, group, width * group.xFrac, groundY, scale))
  const rimColors = forestFloorPainterColors().rim
  drawGroundRimToCanvas(ctx, { x1: 0, x2: lake.x1, floorY: groundY, rng, colors: rimColors })
  drawGroundRimToCanvas(ctx, { x1: lake.x2, x2: width, floorY: groundY, rng, colors: rimColors })
  drawLeftTreeToCanvas(ctx, { x: Math.round(width * APPLE_TREE_X_FRAC), y: groundY }, scale * APPLE_TREE_SIZE)
  paintGroundPlants(ctx, rng, width, groundY, lake)
}
//
// The level's buried decor (picture stones, cracks, hair-roots under the
// apple tree side, fossils, shells, bones, coins, bottles, worms) and its
// depth vignette over the soil band.
//
function paintBuriedDecor(ctx, width, height, layout, scale) {
  const spec = buildUndergroundSpec({
    x1: 0,
    x2: width,
    surfaceY: layout.groundY,
    bandH: height - layout.groundY,
    bottomY: height,
    treeX: Math.round(width * APPLE_TREE_X_FRAC),
    treeClearHalf: BURIED_TREE_CLEAR_HALF * scale,
    stones: forestBuriedStones()
  })
  renderUndergroundSpec(ctx, spec, undergroundStaticEarthTones())
  paintUndergroundDepthVignette(ctx, 0, layout.groundY, width, height - layout.groundY)
}
//
// Opaque haze for a parallax row: every painted pixel is mixed toward the
// sky colour at its height by (1 - strength) instead of drawing the row
// semi-transparent, so a nearer row's bushes fully cover the trunks of the
// rows behind (no see-through) while the row still fades into the air.
// Edge pixels keep their own alpha (anti-aliasing).
//
function hazeRowOverSky(canvas, strength, skyH) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  const stops = skyGradientStops()
  for (let y = 0; y < canvas.height; y++) {
    const sky = skyGradientRgb(stops, Math.min(1, y / skyH))
    for (let x = 0; x < canvas.width; x++) {
      const i = (y * canvas.width + x) * RGBA_STRIDE
      if (data[i + 3] === 0) continue
      data[i] = Math.round(sky.r + (data[i] - sky.r) * strength)
      data[i + 1] = Math.round(sky.g + (data[i + 1] - sky.g) * strength)
      data[i + 2] = Math.round(sky.b + (data[i + 2] - sky.b) * strength)
    }
  }
  ctx.putImageData(image, 0, 0)
}
//
// Smooth sky gradient through palette-snapped stops of the level's ramp.
//
function paintSkyCanvas(width, height) {
  const canvas = newCanvas(width, height)
  const ctx = canvas.getContext('2d')
  const gradient = ctx.createLinearGradient(0, 0, 0, height)
  skyGradientStops().forEach((c, i) => gradient.addColorStop(i / (SKY_STOP_COUNT - 1), `rgb(${c.r}, ${c.g}, ${c.b})`))
  ctx.fillStyle = gradient
  ctx.fillRect(0, 0, width, height)
  return canvas
}
//
// Palette-snapped sky stops, top to bottom.
//
function skyGradientStops() {
  return Array.from({ length: SKY_STOP_COUNT }, (_, i) => forestSkyBandRgb(i / (SKY_STOP_COUNT - 1)))
}
//
// Sky colour at height fraction t, interpolated between the stops exactly
// like the sky canvas gradient (no per-row palette snap, so no steps).
//
function skyGradientRgb(stops, t) {
  const pos = t * (stops.length - 1)
  const i = Math.min(stops.length - 2, Math.floor(pos))
  const f = pos - i
  const a = stops[i]
  const b = stops[i + 1]
  return { r: a.r + (b.r - a.r) * f, g: a.g + (b.g - a.g) * f, b: a.b + (b.b - a.b) * f }
}
//
// One full-width parallax row: evenly spread picture trees, bushes along
// their feet, then the row's depth grade (contrast / saturation pulled
// toward the hued haze, little or no grain).
//
function paintParallaxRow(row, width, height, groundY) {
  const canvas = newCanvas(width, height)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const rng = createSeededRandom(row.seed)
  const s = height / REF_HEIGHT
  const bottomY = groundY + row.sink
  const slot = width / row.count
  const xs = Array.from({ length: row.count }, (_, i) => Math.round(slot * (i + 0.5 + (rng() - 0.5) * PARALLAX_TREE_JITTER)))
  drawForestPictureTrees(ctx, row.sheet, xs, bottomY, row.treeScale * s)
  row.bushSheet
    ? drawForestPictureBushes(ctx, row.bushSheet, 0, width, bottomY, row.bushScale * s)
    : renderBushStrip(ctx, {
      x1: 0,
      x2: width,
      baseY: bottomY,
      heightScale: row.bushScale * s,
      colorAt: () => forestRgb(FOREST_PAL[row.cornerKey].leaf),
      foliageDensityTier: row.tier
    })
  applyForestLayerGradeToCanvas(canvas, FOREST_LAYER_GRADE[row.grade], PARALLAX_GRAIN_SEED + row.seed)
  return canvas
}
//
// A small group of the level's ground stone pictures around one spot.
//
function paintStoneGroup(ctx, rng, group, cx, groundY, scale) {
  const stones = forestGroundStones()
  if (!stones.length) return
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  for (let i = 0; i < group.count; i++) {
    const stone = stones[Math.floor(rng() * stones.length)].canvas
    const s = STONE_SCALE * scale * (1 + (rng() * 2 - 1) * STONE_SCALE_JITTER)
    const w = stone.width * s
    const h = stone.height * s
    const x = cx + (rng() - 0.5) * group.spread * scale
    ctx.drawImage(stone, x - w / 2, groundY + STONE_SINK * scale - h, w, h)
  }
  ctx.restore()
}
//
// Ferns, mushroom groups, spotted mushrooms and the sleeping trampoline
// mushroom at their spots, then straw tufts thickening toward the edges;
// nothing grows on the lake.
//
function paintGroundPlants(ctx, rng, width, groundY, lake) {
  const colors = forestFloorPainterColors()
  const shadow = forestContactShadowRgb()
  const onLake = x => x > lake.x1 && x < lake.x2
  FERN_SPOTS.forEach(f => {
    const x = width * f
    const size = FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE
    paintForestContactShadow(ctx, x, groundY, size * 0.42, CONTACT_SHADOW_RY, shadow)
    drawForestFern(ctx, { x, baseY: groundY, size, rng, colors: colors.fern })
  })
  paintCuteMushroom(ctx, width * CUTE_MUSHROOM_X_FRAC, groundY, shadow)
  MUSHROOM_GROUP_SPOTS.forEach(f => drawSmallMushroomGroupToCanvas(ctx, {
    x: width * f,
    baseY: groundY,
    rng,
    colors: { ...colors.mushroom, contactShadow: shadow }
  }))
  SPOTTED_MUSHROOM_SPOTS.forEach(f => drawSpottedMushroomToCanvas(ctx, { x: width * f, baseY: groundY, colors: colors.spotted }))
  const tuftColors = {
    grass: FOREST_PAL.forestFloor.rimDry,
    dry: FOREST_PAL.forestFloor.grassDry,
    contactShadow: shadow
  }
  for (let i = 0; i < TUFT_COUNT; i++) {
    const t = Math.pow(rng(), TUFT_EDGE_BIAS) * 0.5
    const x = (i % 2 === 0 ? t : 1 - t) * width
    onLake(x) || drawGrassTuftToCanvas(ctx, { x, baseY: groundY, rng, colors: tuftColors })
  }
}
//
// The level's trampoline mushroom with its face, eyes closed (asleep).
//
function paintCuteMushroom(ctx, x, groundY, shadow) {
  paintForestContactShadow(ctx, x, groundY, CUTE_MUSHROOM_W * 0.45, CONTACT_SHADOW_RY, shadow)
  drawCuteMushroomToCanvas(ctx, {
    cx: x,
    baseY: groundY,
    width: CUTE_MUSHROOM_W,
    colors: FOREST_PAL.cuteMushroomMenu,
    withFace: true,
    eyesOpen: false,
    eyeScale: TRAMP_FACE_EYE_SCALE,
    simpleShade: true
  })
}
//
// Copy of the painted pixels of a canvas trimmed to their alpha bounding
// box — one pixel read per bake. Null canvas when nothing is there.
//
function cropToContent(canvas) {
  const data = canvas.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, canvas.width, canvas.height).data
  let minX = canvas.width
  let minY = canvas.height
  let maxX = -1
  let maxY = -1
  for (let y = 0; y < canvas.height; y++) {
    for (let x = 0; x < canvas.width; x++) {
      if (data[(y * canvas.width + x) * RGBA_STRIDE + 3] === 0) continue
      x < minX && (minX = x)
      x > maxX && (maxX = x)
      y < minY && (minY = y)
      y > maxY && (maxY = y)
    }
  }
  if (maxX < 0) return { canvas: null, x: 0, y: 0 }
  const out = newCanvas(maxX - minX + 1, maxY - minY + 1)
  out.getContext('2d').drawImage(canvas, minX, minY, out.width, out.height, 0, 0, out.width, out.height)
  return { canvas: out, x: minX, y: minY }
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
