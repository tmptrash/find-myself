import { FOREST_PAL, forestRgb, forestSkyBandRgb } from './forest-palette.js'
import { groundEarthLayersColor, paintLayeredEarthBand } from './forest-earth-band.js'
import { forestFloorPainterColors, loadForestFloorHill, paintForestFloorHill } from '../components/forest-floor.js'
import { getCrackZone, paintForestPitStill } from './forest-level-atmosphere.js'
import { CFG } from '../../../cfg.js'
import { forestContactShadowRgb, paintForestContactShadow, paintUndergroundDepthVignette } from './forest-atmosphere.js'
import { applyForestFilmGrainToCanvas, applyParallaxPostFxToContext, FOREST_LAYER_GRADE } from './forest-parallax-grain.js'
import { forestDepthBlurRadiusPx } from './forest-focus-depth.js'
import * as TrampMushroom from './forest-tramp-mushroom.js'
import * as Lake from './forest-lake.js'
import { renderBushStrip } from './forest-bush-strip.js'
import { buildUndergroundSpec, renderUndergroundSpec, undergroundStaticEarthTones } from './forest-underground.js'
import { TREE_SHEET, loadForestPictureTrees, drawForestPictureTrees } from './forest-picture-trees.js'
import { BUSH_SHEET, loadForestPictureBushes, drawForestPictureBushes } from './forest-picture-bushes.js'
import { loadForestStones, forestGroundStones, forestBareStones, forestBuriedStones, forestGroundStoneScale, bakeForestGroundStone } from './forest-stones.js'
import { loadForestLeftTreePicture, drawLeftTreeToCanvas, leftTreeBranch } from './forest-left-tree.js'
import { loadForestShoreTree, drawShoreTreeToCanvas, shoreTreeBranchOnCanvas } from './forest-shore-tree.js'
import { drawGroundRimToCanvas } from '../../../utils/draw-ground-rim.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { drawForestPlant, loadForestPlants } from './forest-plants.js'
import { drawForestMushroom, loadForestMushrooms } from './forest-mushrooms.js'
import { FOREST_CFG } from '../cfg.js'
import * as TunnelPicture from './forest-bug-tunnel-picture.js'
//
// Menu backdrop for the forest level, composed from the level's own pieces
// like one still of the level: the bright day sky and three hazy parallax
// rows of the level's picture trees and bushes behind, the level's left big
// apple tree (its picture) as the one vertical anchor on the right with its
// roots in the layered soil, the level's lake to its left (its stone pile on
// the tree-side bank is baked by the menu from forest-stones.js), mossy
// stones, ferns and mushrooms on the ground and the picture stones buried in
// the soil, and at the right end the level's hill with the open cave under
// it. The left third stays calm for the menu column. Layout values are
// design px at REF_HEIGHT and scale with the screen height. The lake water,
// grass, bomb trees, stalk eyes, clouds, the crawler, the apple tree's
// apples, the water flower, the apple bug with its burrow and cave and the
// midges over the lake are live (see forestMenuLayout). The pictures must be loaded first
// (loadForestMenuBackdropArt).
//
const LAYOUT_SEED = 61027
const REF_HEIGHT = 1080
//
// The backdrop is the level's opening view: everything stands where it
// stands in the level (world X, as laid out by forest level0), mapped to the
// screen at the layout scale with world X MENU_WORLD_X0 on the screen's left
// edge; the ground line sits where the level's camera shows it. The scene
// is squeezed at the screen's height, but the apple bug's burrow keeps the
// level's size, so everything east of the lake moves right until the
// burrow's mouth stands BUG_HOLE_LAKE_GAP px clear of the lake.
//
const GROUND_Y_FRAC = 0.755
const MENU_WORLD_X0 = 430
const LEVEL_LAKE_X1 = 100
const LEVEL_LAKE_X2_CORE = 794
const LEVEL_LEFT_TREE_X = 960
//
// The apple bug's burrow stands this far left of the apple tree's trunk,
// as in the level.
//
const LEVEL_BUG_HOLE_X = LEVEL_LEFT_TREE_X - 125
const BUG_HOLE_LAKE_GAP = 24
const BUG_HOLE_LIP = TunnelPicture.layout(FOREST_CFG.appleBug.tunnelWidth).lip
const BUG_HOLE_HALF_W = Math.max(-BUG_HOLE_LIP.x1, BUG_HOLE_LIP.x2)
const LEVEL_BRANCH_TRAMP_X = 1155
const LEVEL_RIGHT_TRAMP_X = 2300
const LEVEL_TRAMPS = [
  { x: LEVEL_BRANCH_TRAMP_X, mushroom: TrampMushroom.TRAMP_MUSHROOM.RED },
  { x: LEVEL_RIGHT_TRAMP_X, mushroom: TrampMushroom.TRAMP_MUSHROOM.RED }
]
//
// The big trees are their pictures at the level's size: the left (apple)
// tree at its own level scale, the right tree at the scale the level fits
// it to.
//
const LEVEL_RIGHT_TREE_X = 1737
const LEVEL_RIGHT_TREE_SCALE = 0.531
//
// The left bomb tree stands right by the right trampoline, on its left (as
// close as the level lets its trunk to the cap).
//
const LEVEL_BOMB_TREE_TRAMP_CLEAR = 100
const LEVEL_BOMB_TREE_XS = [LEVEL_RIGHT_TRAMP_X - LEVEL_BOMB_TREE_TRAMP_CLEAR, 2560]
const LEVEL_CRAWLER_MAX_X = 2614
//
// The level's right end: its mossy hill climbs to the world's right edge and
// the open cave lies under it. The cave keeps the level's size, like the
// burrow, so its rocks and void are the level's own; it is placed by its
// left edge. LEVEL_FLOOR_Y is the level's ground line (its layout is built
// in those world coordinates).
//
const LEVEL_WORLD_W = CFG.visual.forest.worldWidth
const LEVEL_FLOOR_Y = 795
//
// The trampoline mushroom on the cave's floor, at the level's size.
//
const CAVE_MUSHROOM_W = 53
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
// Ground stones as the level scatters them along the centipede's strip
// (from the lake's bank to the cave): the level's ground stones (mossy,
// with plants, bits of wall) one per GROUND_STONE_STEP world px, every
// GROUND_STONE_SMALL_EVERY-th one smaller, and the small bare pebbles one per
// PEBBLE_STEP world px, PEBBLE_H_MIN..+RANGE px tall — each baked like the
// level's, at a random spot in its step, sunk into the soil, and clear of
// the burrow, the trunks and the trampolines (STONE_CLEAR, world X and half
// widths).
//
const GROUND_STONE_STEP = 70
const GROUND_STONE_SMALL_EVERY = 4
const GROUND_STONE_SMALL_SIZE = 0.6
const GROUND_STONE_SINK = 2
const GROUND_STONE_SINK_RANGE = 3
const PEBBLE_STEP = 53
const PEBBLE_H_MIN = 6
const PEBBLE_H_RANGE = 6
const PEBBLE_SINK = 1
const PEBBLE_SINK_RANGE = 2
const STONE_STRIP_LAKE_PAD = 60
const STONE_STRIP_CAVE_PAD = 40
const STONE_SEED = 61029
const STONE_GRAIN_SEED = 7760
const STONE_CLEAR = [
  { x: LEVEL_BUG_HOLE_X, half: 40 },
  { x: LEVEL_LEFT_TREE_X, half: 60 },
  { x: LEVEL_RIGHT_TREE_X, half: 40 },
  { x: LEVEL_BRANCH_TRAMP_X, half: 35 },
  { x: LEVEL_RIGHT_TRAMP_X, half: 35 }
]
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
// The level's two trampoline mushrooms, where they stand in the level and
// at its size (design px) — the warm accents of the ground plane.
//
const TRAMP_MUSHROOM_W = 53
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
  await Promise.all([loadForestPictureTrees(), loadForestPictureBushes(), loadForestPlants(), loadForestMushrooms(), loadForestStones(), loadForestLeftTreePicture(), loadForestShoreTree(), loadForestFloorHill(), TrampMushroom.load()])
}

/**
 * Forest menu layout for a screen size: the ground line, the lake span and
 * the spots of the live decor standing on the ground.
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 * @returns {Object} groundY, scale (of the baked scene to the level), lake {x1, x2Core, x2, surfaceY},
 *   eyeSpots, earTreeSpots [{x}] (the bomb trees), crawler {minX, maxX}, appleTreeX (its trunk),
 *   bugHoleX (the apple bug's burrow), leftBranch {x1 (leafy tip), x2, y} and rightBranch
 *   {x1 (trunk), x2, y}: the flat tops of the two big trees' branches
 */
export function forestMenuLayout(width, height) {
  const groundY = Math.round(height * GROUND_Y_FRAC)
  const toX = menuWorldToScreenX(height)
  const x1 = toX(LEVEL_LAKE_X1)
  const x2Core = toX(LEVEL_LAKE_X2_CORE)
  const scale = height / REF_HEIGHT
  return {
    groundY,
    scale,
    leftBranch: leftTreeBranch({ x: toX(LEVEL_LEFT_TREE_X), y: groundY }, scale),
    rightBranch: shoreTreeBranchOnCanvas({ x: toX(LEVEL_RIGHT_TREE_X), y: groundY }, LEVEL_RIGHT_TREE_SCALE * scale),
    appleTreeX: toX(LEVEL_LEFT_TREE_X),
    bugHoleX: toX(LEVEL_BUG_HOLE_X),
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
// The front scene from one seeded stream: soil band, the cave and the hill
// over it, ground stones and the ground rim (open over the lake), the apple
// tree with its roots over the soil, then the ground plants and mushrooms
// over its foot.
//
function paintFrontScene(ctx, width, height, layout, scale) {
  const { groundY, lake } = layout
  const rng = createSeededRandom(LAYOUT_SEED)
  paintLayeredEarthBand(ctx, groundEarthLayersColor(), 0, groundY, width, height - groundY)
  paintBuriedDecor(ctx, width, height, layout, scale)
  const toX = menuWorldToScreenX(height)
  paintCave(ctx, width, groundY, toX)
  paintForestFloorHill(ctx, toX(LEVEL_WORLD_W), groundY, scale)
  paintGroundStones(ctx, toX, groundY, scale)
  const rimColors = forestFloorPainterColors().rim
  drawGroundRimToCanvas(ctx, { x1: 0, x2: lake.x1, floorY: groundY, rng, colors: rimColors })
  drawGroundRimToCanvas(ctx, { x1: lake.x2, x2: width, floorY: groundY, rng, colors: rimColors })
  drawLeftTreeToCanvas(ctx, { x: toX(LEVEL_LEFT_TREE_X), y: groundY }, scale)
  drawShoreTreeToCanvas(ctx, { x: toX(LEVEL_RIGHT_TREE_X), y: groundY }, LEVEL_RIGHT_TREE_SCALE * scale)
  paintGroundPlants(ctx, rng, width, groundY, lake, toX, scale)
}
//
// The level's open cave, moved from its place in the level to the menu's
// ground line with its crack's left edge where the level's world X maps, and the
// trampoline mushroom on its floor. Its void runs on to the screen's
// right edge (the level's world wall hides where it ends).
//
function paintCave(ctx, width, groundY, toX) {
  const zoneX1 = getCrackZone(LEVEL_WORLD_W, LEVEL_FLOOR_Y).x1
  const dx = toX(zoneX1) - zoneX1
  ctx.save()
  ctx.translate(dx, groundY - LEVEL_FLOOR_Y)
  const cave = paintForestPitStill(ctx, LEVEL_WORLD_W, LEVEL_FLOOR_Y, width - dx)
  paintTrampMushroom(ctx, TrampMushroom.TRAMP_MUSHROOM.ORANGE, cave.trampX, cave.bottomY, CAVE_MUSHROOM_W, forestContactShadowRgb())
  ctx.restore()
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
// The level's ground stones and pebbles along the strip from the lake's
// bank to the cave (see GROUND_STONE_STEP).
//
function paintGroundStones(ctx, toX, groundY, scale) {
  const rng = createSeededRandom(STONE_SEED)
  const x1 = LEVEL_LAKE_X2_CORE + STONE_STRIP_LAKE_PAD
  const x2 = getCrackZone(LEVEL_WORLD_W, LEVEL_FLOOR_Y).x1 - STONE_STRIP_CAVE_PAD
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  scatterStones(forestGroundStones(), x1, x2, GROUND_STONE_STEP, rng)
    .forEach(spot => paintGroundStone(ctx, groundStoneSizing(spot, rng), rng, toX, groundY, scale))
  scatterStones(forestBareStones(), x1, x2, PEBBLE_STEP, rng)
    .forEach(spot => paintGroundStone(ctx, pebbleSizing(spot, rng), rng, toX, groundY, scale))
  ctx.restore()
}
function groundStoneSizing(spot, rng) {
  const small = spot.index % GROUND_STONE_SMALL_EVERY === GROUND_STONE_SMALL_EVERY - 1
  return { ...spot, sizeMul: small ? GROUND_STONE_SMALL_SIZE : 1, sink: GROUND_STONE_SINK + rng() * GROUND_STONE_SINK_RANGE }
}
function pebbleSizing(spot, rng) {
  const height = PEBBLE_H_MIN + rng() * PEBBLE_H_RANGE
  return { ...spot, sizeMul: height / (spot.stone.canvas.height * forestGroundStoneScale()), sink: PEBBLE_SINK + rng() * PEBBLE_SINK_RANGE }
}
//
// One spot per step (level world X) at random inside it, cycling through
// the stones in a shuffled order; none on a clear span.
//
function scatterStones(stones, x1, x2, step, rng) {
  if (!stones.length) return []
  const spots = []
  let round = []
  for (let index = 0, x0 = x1; x0 < x2; index++, x0 += step) {
    round.length || (round = shuffledStones(stones, rng))
    const stone = round.pop()
    const x = x0 + rng() * step
    STONE_CLEAR.some(c => Math.abs(x - c.x) < c.half) || spots.push({ stone, x, index })
  }
  return spots
}
function shuffledStones(stones, rng) {
  return stones.map(stone => ({ stone, order: rng() })).sort((a, b) => a.order - b.order).map(e => e.stone)
}
function paintGroundStone(ctx, spot, rng, toX, groundY, scale) {
  const canvas = bakeForestGroundStone(spot.stone, rng, STONE_GRAIN_SEED + Math.round(spot.x), spot.sizeMul)
  const w = canvas.width * scale
  const h = canvas.height * scale
  ctx.drawImage(canvas, toX(spot.x) - w / 2, groundY + spot.sink * scale - h, w, h)
  canvas.width = 0
  canvas.height = 0
}
//
// Plants, mushrooms and the trampoline mushrooms at their spots,
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
  LEVEL_TRAMPS.forEach(tramp => paintTrampMushroom(ctx, tramp.mushroom, toX(tramp.x), groundY, TRAMP_MUSHROOM_W * scale, shadow))
  MUSHROOM_GROUP_SPOTS.forEach(wx => drawForestMushroom(ctx, { x: toX(wx), baseY: groundY, rng }))
  SPOTTED_MUSHROOM_SPOTS.forEach(wx => drawForestMushroom(ctx, { x: toX(wx), baseY: groundY, rng }))
  for (let i = 0; i < TUFT_COUNT; i++) {
    const t = Math.pow(rng(), TUFT_EDGE_BIAS) * 0.5
    const x = (i % 2 === 0 ? t : 1 - t) * width
    onLake(x) || drawForestPlant(ctx, { x, baseY: groundY, rng })
  }
}
//
// A trampoline mushroom picture over its contact shadow, its cap as high as
// the red one's at `width` (the level bakes them all to one cap height).
//
function paintTrampMushroom(ctx, mushroom, x, groundY, width, shadow) {
  const capH = TrampMushroom.capHeight(TrampMushroom.TRAMP_MUSHROOM.RED, width)
  const w = TrampMushroom.widthForCapHeight(mushroom, capH)
  paintForestContactShadow(ctx, x, groundY, w * 0.45, CONTACT_SHADOW_RY, shadow)
  TrampMushroom.paint(ctx, mushroom, x, groundY, w)
}
//
// Level world X → screen X at the layout scale for a screen height, the
// east bank shifted clear of the burrow.
//
function menuWorldToScreenX(height) {
  const s = height / REF_HEIGHT
  const scaled = wx => (wx - MENU_WORLD_X0) * s
  const lakeEnd = scaled(LEVEL_LAKE_X2_CORE) + Lake.LAKE_SHORE_EXTEND_PX
  const shift = Math.max(0, lakeEnd + BUG_HOLE_LAKE_GAP + BUG_HOLE_HALF_W - scaled(LEVEL_BUG_HOLE_X))
  return wx => Math.round(scaled(wx) + (wx > LEVEL_LAKE_X2_CORE ? shift : 0))
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
