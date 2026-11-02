import { FOREST_PAL, forestRgb, forestSkyBandRgb } from './forest-palette.js'
import { groundEarthLayersColor, paintLayeredEarthBand } from './forest-earth-band.js'
import { forestFloorPainterColors } from '../components/forest-floor.js'
import { forestContactShadowRgb, paintForestContactShadow, paintUndergroundDepthVignette } from './forest-atmosphere.js'
import { applyForestFilmGrainToCanvas, applyParallaxPostFxToContext, FOREST_LAYER_GRADE } from './forest-parallax-grain.js'
import { forestDepthBlurRadiusPx } from './forest-focus-depth.js'
import { TRAMP_FACE_EYE_SCALE, drawCuteMushroomToCanvas } from './cute-mushroom.js'
import * as Lake from './forest-lake.js'
import { renderBushStrip } from './forest-bush-strip.js'
import { buildUndergroundSpec, renderUndergroundSpec, undergroundStaticEarthTones } from './forest-underground.js'
import { TREE_SHEET, loadForestPictureTrees, drawForestPictureTrees } from './forest-picture-trees.js'
import { BUSH_SHEET, loadForestPictureBushes, drawForestPictureBushes } from './forest-picture-bushes.js'
import { loadForestStones, forestGroundStones, forestBuriedStones } from './forest-stones.js'
import { loadForestLeftTreePicture, drawLeftTreeToCanvas } from './forest-left-tree.js'
import { loadForestShoreTree, drawShoreTreeToCanvas } from './forest-shore-tree.js'
import { drawGroundRimToCanvas } from '../../../utils/draw-ground-rim.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { drawForestPlant, loadForestPlants } from './forest-plants.js'
import { drawForestMushroom, loadForestMushrooms } from './forest-mushrooms.js'
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
// The backdrop is the level's opening view: everything stands where it
// stands in the level (world X, as laid out by forest level0), mapped to the
// screen at the layout scale with world X MENU_WORLD_X0 on the screen's left
// edge; the ground line sits where the level's camera shows it.
//
const GROUND_Y_FRAC = 0.755
const MENU_WORLD_X0 = 430
const LEVEL_LAKE_X1 = 100
const LEVEL_LAKE_X2_CORE = 794
const LEVEL_LEFT_TREE_X = 960
const LEVEL_BRANCH_TRAMP_X = 1155
const LEVEL_RIGHT_TRAMP_X = 2300
const LEVEL_TRAMP_XS = [LEVEL_BRANCH_TRAMP_X, LEVEL_RIGHT_TRAMP_X]
//
// The big trees are their pictures at the level's size: the left (apple)
// tree at its own level scale, the right tree at the scale the level fits
// it to.
//
const LEVEL_RIGHT_TREE_X = 1737
const LEVEL_RIGHT_TREE_SCALE = 0.528
const LEVEL_BOMB_TREE_XS = [1339, 2560]
const LEVEL_CRAWLER_MAX_X = 2614
//
// Sky: a smooth gradient through palette stops of the level's sky ramp,
// toned by the far row's grade like the level's sky (baked into that row). It runs a little below
// the ground line so the soil band always covers its lower edge.
//
const SKY_STOP_COUNT = 6
const SKY_GROUND_OVERLAP = 8
//
// Parallax rows behind the scene — as many as the level has (far, mid,
// near): full-width rows of the level's picture trees (tree sheet, count,
// scale as in the level) with bushes at their feet (the nearer rows' picture
// hedges, the far row's leafy bush strip), finished exactly like the
// level's rows: the depth blur of their tier and their grade (contrast /
// saturation pulled toward the hued haze). Trees are spread evenly over the
// row width (jittered).
//
const PARALLAX_ROWS = [
  {
    seed: 51307,
    sheet: TREE_SHEET.FAR,
    count: 20,
    treeScale: 0.62,
    grade: 'far',
    depth: 'background',
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
    depth: 'midground',
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
    depth: 'nearground',
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
// The level's lake: its water line sits LAKE_SURFACE_LIFT px above the
// ground line, as in the level; the shallows run on past the core right end.
//
const LAKE_SURFACE_LIFT = 8
//
// Ground stones like the level's: the sheet's mossy stones, stones with
// plants and bits of wall, in small groups (level world X, how many, spread
// in design px; none on the apple's strip by the tree), each at the level's
// ground stone size (a little random) and sunk STONE_SINK design px into the
// soil.
//
const STONE_GROUPS = [
  { x: 1260, count: 2, spread: 50 },
  { x: 1520, count: 2, spread: 60 },
  { x: 1860, count: 2, spread: 50 },
  { x: 2180, count: 2, spread: 60 },
  { x: 2440, count: 1, spread: 20 },
  { x: 2680, count: 2, spread: 50 }
]
const STONE_SCALE = 0.34
const STONE_SCALE_JITTER = 0.15
const STONE_SINK = 3
//
// Ground plants (level world X): fern patches over both big trees' feet
// (hiding the seams of their trunks and roots) and along the ground, straw
// tufts thickening toward the screen edges, mushroom groups by the trees.
//
const FERN_SPOTS = [905, 935, 990, 1020, 1230, 1420, 1600, 1705, 1720, 1770, 1990, 2120, 2380, 2620]
const FERN_SIZE_MIN = 42
const FERN_SIZE_RANGE = 26
const TUFT_COUNT = 34
const TUFT_EDGE_BIAS = 1.6
const MUSHROOM_GROUP_SPOTS = [1060, 1660, 2230, 2700]
const SPOTTED_MUSHROOM_SPOTS = [1080, 1790]
//
// The level's two trampoline mushrooms, asleep, where they stand in the
// level and at its size (design px) — the warm accents of the ground plane.
//
const CUTE_MUSHROOM_W = 49
const CONTACT_SHADOW_RY = 4.5
//
// Live decor (level world X): the stalk eyes as the level plants them
// (segments of their stalks), the two bomb trees, and the crawler's roaming
// strip from the lake's bank to the cave.
//
const LEVEL_EYES = [
  { x: 1912, segmentCount: 11, segmentLen: 26 },
  { x: 2060, segmentCount: 6, segmentLen: 26 },
  { x: 2450, segmentCount: 11, segmentLen: 26, prizeEye: true }
]
const CRAWLER_LAKE_PAD = 28
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
  await Promise.all([loadForestPictureTrees(), loadForestPictureBushes(), loadForestPlants(), loadForestMushrooms(), loadForestStones(), loadForestLeftTreePicture(), loadForestShoreTree()])
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
  const toX = menuWorldToScreenX(height)
  const x1 = toX(LEVEL_LAKE_X1)
  const x2Core = toX(LEVEL_LAKE_X2_CORE)
  return {
    groundY,
    lake: { x1, x2Core, x2: x2Core + Lake.LAKE_SHORE_EXTEND_PX, surfaceY: groundY - LAKE_SURFACE_LIFT },
    eyeSpots: LEVEL_EYES.map(eye => ({ ...eye, x: toX(eye.x), groundY })),
    earTreeSpots: LEVEL_BOMB_TREE_XS.map(x => ({ x: toX(x) })),
    crawler: { minX: x2Core + Lake.LAKE_SHORE_EXTEND_PX + CRAWLER_LAKE_PAD, maxX: Math.min(width, toX(LEVEL_CRAWLER_MAX_X)) }
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
  const skyCanvas = paintSkyCanvas(width, skyH)
  applyParallaxPostFxToContext(skyCanvas.getContext('2d'), width, skyH, { grade: FOREST_LAYER_GRADE.far, grainSeedOffset: PARALLAX_GRAIN_SEED })
  const sky = { canvas: skyCanvas, x: 0, y: 0 }
  const parallax = PARALLAX_ROWS.map(row => {
    const rowCanvas = paintParallaxRow(row, width, groundY + PARALLAX_BOTTOM_PAD, groundY)
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
  const toX = menuWorldToScreenX(height)
  STONE_GROUPS.forEach(group => paintStoneGroup(ctx, rng, group, toX(group.x), groundY, scale))
  const rimColors = forestFloorPainterColors().rim
  drawGroundRimToCanvas(ctx, { x1: 0, x2: lake.x1, floorY: groundY, rng, colors: rimColors })
  drawGroundRimToCanvas(ctx, { x1: lake.x2, x2: width, floorY: groundY, rng, colors: rimColors })
  drawLeftTreeToCanvas(ctx, { x: toX(LEVEL_LEFT_TREE_X), y: groundY }, scale)
  drawShoreTreeToCanvas(ctx, { x: toX(LEVEL_RIGHT_TREE_X), y: groundY }, LEVEL_RIGHT_TREE_SCALE * scale)
  paintGroundPlants(ctx, rng, width, groundY, lake, toX, scale)
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
    treeX: menuWorldToScreenX(height)(LEVEL_LEFT_TREE_X),
    treeClearHalf: BURIED_TREE_CLEAR_HALF * scale,
    stones: forestBuriedStones()
  })
  renderUndergroundSpec(ctx, spec, undergroundStaticEarthTones())
  paintUndergroundDepthVignette(ctx, 0, layout.groundY, width, height - layout.groundY)
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
// One full-width parallax row: evenly spread picture trees, bushes along
// their feet, then the level's finish for the row: its depth blur and
// grade (contrast / saturation pulled toward the hued haze, little or no
// grain).
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
  applyParallaxPostFxToContext(ctx, width, height, {
    blurRadius: forestDepthBlurRadiusPx(row.depth),
    grade: FOREST_LAYER_GRADE[row.grade],
    grainSeedOffset: PARALLAX_GRAIN_SEED + row.seed
  })
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
// Plants, mushrooms and the sleeping trampoline mushrooms at their spots,
// then small plants thickening toward the edges; nothing grows on the lake.
//
function paintGroundPlants(ctx, rng, width, groundY, lake, toX, scale) {
  const shadow = forestContactShadowRgb()
  const onLake = x => x > lake.x1 && x < lake.x2
  FERN_SPOTS.forEach(wx => {
    const x = toX(wx)
    const size = FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE
    paintForestContactShadow(ctx, x, groundY, size * 0.42, CONTACT_SHADOW_RY, shadow)
    drawForestPlant(ctx, { x, baseY: groundY, size, rng })
  })
  LEVEL_TRAMP_XS.forEach(wx => paintCuteMushroom(ctx, toX(wx), groundY, CUTE_MUSHROOM_W * scale, shadow))
  MUSHROOM_GROUP_SPOTS.forEach(wx => drawForestMushroom(ctx, { x: toX(wx), baseY: groundY, rng }))
  SPOTTED_MUSHROOM_SPOTS.forEach(wx => drawForestMushroom(ctx, { x: toX(wx), baseY: groundY, rng }))
  for (let i = 0; i < TUFT_COUNT; i++) {
    const t = Math.pow(rng(), TUFT_EDGE_BIAS) * 0.5
    const x = (i % 2 === 0 ? t : 1 - t) * width
    onLake(x) || drawForestPlant(ctx, { x, baseY: groundY, rng })
  }
}
//
// The level's trampoline mushroom with its face, eyes closed (asleep).
//
function paintCuteMushroom(ctx, x, groundY, width, shadow) {
  paintForestContactShadow(ctx, x, groundY, width * 0.45, CONTACT_SHADOW_RY, shadow)
  drawCuteMushroomToCanvas(ctx, {
    cx: x,
    baseY: groundY,
    width,
    colors: FOREST_PAL.cuteMushroomMenu,
    withFace: true,
    eyesOpen: false,
    eyeScale: TRAMP_FACE_EYE_SCALE,
    simpleShade: true
  })
}
//
// Level world X → screen X at the layout scale for a screen height.
//
function menuWorldToScreenX(height) {
  const s = height / REF_HEIGHT
  return wx => Math.round((wx - MENU_WORLD_X0) * s)
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
