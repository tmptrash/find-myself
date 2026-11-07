import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import * as Lake from './forest-lake.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { loadPictureImage, pictureFringeAlpha } from './forest-picture.js'
//
// Stones of forest level 0, cut from assets/forest/stones.png (its stray
// backdrop fringe wiped). Bare stones lie in the lake (a pile on the
// tree-side bank, a few on the bed); mossy ones, the ones with plants and
// the bits of dry-stone wall stand on the ground. The stones buried in the
// earth band come from assets/forest/stones_ground.png. The sheets start
// loading with this module (game boot) and are cut once per page; sprites
// are baked per live k.
//
const URL = 'forest/stones.png'
const GROUND_URL = 'forest/stones_ground.png'
//
// Each stone is cut from its rect plus CROP_PAD; what touches that crop's
// border, apart from the stone itself (the biggest piece), belongs to a
// neighbour and is dropped. A pixel is solid from SOLID_SHARE of opacity on.
//
const CROP_PAD = 2
const SOLID_SHARE = 0.5
export const STONE_KIND = { BARE: 'bare', MOSSY: 'mossy', WALL: 'wall' }
//
// The stones on the sheet (px), left to right, row by row.
//
const STONES = [
  { x: 12, y: 6, w: 379, h: 228, kind: STONE_KIND.MOSSY },
  { x: 401, y: 39, w: 334, h: 195, kind: STONE_KIND.MOSSY },
  { x: 746, y: 9, w: 338, h: 225, kind: STONE_KIND.MOSSY },
  { x: 1094, y: 10, w: 316, h: 223, kind: STONE_KIND.MOSSY },
  { x: 1417, y: 6, w: 295, h: 228, kind: STONE_KIND.MOSSY },
  { x: 1722, y: 13, w: 399, h: 221, kind: STONE_KIND.MOSSY },
  { x: 14, y: 243, w: 365, h: 146, kind: STONE_KIND.MOSSY },
  { x: 392, y: 243, w: 307, h: 145, kind: STONE_KIND.MOSSY },
  { x: 714, y: 245, w: 315, h: 144, kind: STONE_KIND.MOSSY },
  { x: 1050, y: 246, w: 338, h: 144, kind: STONE_KIND.BARE },
  { x: 1917, y: 253, w: 243, h: 137, kind: STONE_KIND.MOSSY },
  { x: 1405, y: 252, w: 254, h: 139, kind: STONE_KIND.MOSSY },
  { x: 1677, y: 250, w: 224, h: 141, kind: STONE_KIND.MOSSY },
  { x: 14, y: 399, w: 376, h: 116, kind: STONE_KIND.MOSSY },
  { x: 400, y: 402, w: 351, h: 116, kind: STONE_KIND.MOSSY },
  { x: 751, y: 407, w: 337, h: 111, kind: STONE_KIND.MOSSY },
  { x: 1111, y: 402, w: 320, h: 121, kind: STONE_KIND.MOSSY },
  { x: 1434, y: 420, w: 231, h: 97, kind: STONE_KIND.MOSSY },
  { x: 1681, y: 422, w: 186, h: 96, kind: STONE_KIND.MOSSY },
  { x: 1881, y: 403, w: 278, h: 117, kind: STONE_KIND.MOSSY },
  { x: 402, y: 535, w: 303, h: 88, kind: STONE_KIND.WALL },
  { x: 715, y: 536, w: 213, h: 86, kind: STONE_KIND.WALL },
  { x: 938, y: 536, w: 240, h: 84, kind: STONE_KIND.WALL },
  { x: 1190, y: 537, w: 409, h: 79, kind: STONE_KIND.WALL },
  { x: 1616, y: 529, w: 241, h: 85, kind: STONE_KIND.WALL },
  { x: 1866, y: 532, w: 293, h: 79, kind: STONE_KIND.WALL },
  { x: 13, y: 524, w: 187, h: 137, kind: STONE_KIND.WALL },
  { x: 209, y: 524, w: 185, h: 117, kind: STONE_KIND.WALL },
  { x: 13, y: 693, w: 31, h: 20, kind: STONE_KIND.BARE },
  { x: 51, y: 687, w: 43, h: 26, kind: STONE_KIND.BARE },
  { x: 105, y: 674, w: 68, h: 40, kind: STONE_KIND.BARE },
  { x: 186, y: 654, w: 97, h: 60, kind: STONE_KIND.BARE },
  { x: 299, y: 655, w: 93, h: 59, kind: STONE_KIND.BARE },
  { x: 403, y: 638, w: 118, h: 76, kind: STONE_KIND.BARE },
  { x: 531, y: 651, w: 129, h: 63, kind: STONE_KIND.BARE },
  { x: 673, y: 638, w: 134, h: 76, kind: STONE_KIND.BARE },
  { x: 818, y: 655, w: 106, h: 58, kind: STONE_KIND.BARE },
  { x: 937, y: 632, w: 131, h: 82, kind: STONE_KIND.BARE },
  { x: 1079, y: 628, w: 117, h: 85, kind: STONE_KIND.BARE },
  { x: 1208, y: 642, w: 106, h: 71, kind: STONE_KIND.BARE },
  { x: 1324, y: 660, w: 81, h: 53, kind: STONE_KIND.BARE },
  { x: 1415, y: 690, w: 37, h: 23, kind: STONE_KIND.BARE },
  { x: 1465, y: 628, w: 136, h: 85, kind: STONE_KIND.BARE },
  { x: 1617, y: 622, w: 151, h: 91, kind: STONE_KIND.BARE },
  { x: 1786, y: 619, w: 196, h: 94, kind: STONE_KIND.BARE },
  { x: 1996, y: 628, w: 163, h: 85, kind: STONE_KIND.BARE }
]
//
// World px per sheet px: ground stones (a little random per stone) and the
// stones in the lake.
//
const GROUND_SCALE = 0.34
const GROUND_SCALE_JITTER = 0.15
const LAKE_SCALE = 0.3
//
// The pile on the tree-side bank of the lake (stones: index in STONES,
// biggest first). It runs from PILE_FROM_X to PILE_TO_X off the bank's foot
// (where the bed meets the ground line, world px; the right end stays clear
// of the big tree) and slopes evenly from its top at the left end
// (PILE_TOP_LEFT_DOWN under the ground line, in the water) up to its top at
// the right end (PILE_TOP_RIGHT_DOWN: above the ground). Stones are dropped
// one by one and come to rest on the bed, the ground or the stones under
// them, settled PILE_SINK px into them: each where it fills the most room
// under the slope while leaving the least empty space under itself
// (PILE_GAP_WEIGHT), as if it slid down until it sat snug, and sticking out
// over the slope the least (PILE_OVER_WEIGHT), so the pile's top follows it.
// The bare stones lie in the water and reach PILE_SHORE_X onto the bank:
// after the listed ones the smaller half of them is dropped again at
// PILE_REUSE_SCALES (one per round). Then mossy stones and ones with plants
// (PILE_LAND) fill the part on land from PILE_LAND_FROM_X. Extra stones only
// go in while the pile has room under the slope (PILE_FULL_ROOM px or more),
// only where they leave at most PILE_MAX_GAP px of empty space under
// themselves, and while fewer than PILE_MAX_STONES lie in it. Behind the
// pile a bed of small bare stones (PILE_FILL: stones, rows PILE_FILL_STEP of
// their size apart, PILE_FILL_INSET px under the pile's top) fills its whole
// body down to the bed, so no hole between the stones ever shows through;
// the lower stones are drawn over the ones resting on them. Everything under the bed
// is clipped away, everything under the water line is tinted with the water.
//
const LAKE_PILE = [44, 43, 9, 45, 42, 37, 38, 35, 33, 34, 39]
const PILE_REUSE_SCALES = [0.85, 0.7, 1, 0.6]
const PILE_GAP_WEIGHT = 1.6
const PILE_OVER_WEIGHT = 1.2
const PILE_FULL_ROOM = 3
const PILE_MAX_GAP = 5
const PILE_MAX_STONES = 46
const PILE_SEED = 7311
const PILE_LAND = [18, 17, 12, 11, 10, 19]
const PILE_FROM_X = -160
const PILE_TO_X = 55
const PILE_SHORE_X = 0
const PILE_LAND_FROM_X = -6
const PILE_TOP_LEFT_DOWN = 74
const PILE_TOP_RIGHT_DOWN = -24
const PILE_SINK = 3
const PILE_SOLID_ALPHA = 128
const PILE_FILL = [28, 29, 30, 40, 41, 31, 32, 36]
const PILE_FILL_SCALE = 0.32
const PILE_FILL_STEP = 0.55
const PILE_FILL_JITTER = 0.3
const PILE_FILL_INSET = 4
const PILE_FILL_SEED = 7312
const LAKE_PILE_PAD = 2
const LAKE_PILE_GRAIN_SEED = 7310
//
// Stones lying on the lake bed (seen through the water): stone, where along
// the open water (0 = island shore, 1 = tree side) and how far down the bed
// face (0 = far rim, 1 = front edge).
//
const LAKE_BED = [
  { id: 36, t: 0.63, depth: 0.7 },
  { id: 31, t: 0.55, depth: 0.75 },
  { id: 40, t: 0.58, depth: 0.9 },
  { id: 41, t: 0.5, depth: 0.9 },
  { id: 30, t: 0.45, depth: 0.8 },
  { id: 29, t: 0.66, depth: 0.85 },
  { id: 32, t: 0.3, depth: 0.7 },
  { id: 28, t: 0.15, depth: 0.85 }
]
//
// The buried stones on their sheet (px), smallest first.
//
const GROUND_STONES = [
  { x: 1104, y: 25, w: 24, h: 27 },
  { x: 27, y: 32, w: 36, h: 20 },
  { x: 452, y: 31, w: 34, h: 21 },
  { x: 585, y: 28, w: 35, h: 21 },
  { x: 144, y: 30, w: 33, h: 23 },
  { x: 840, y: 26, w: 38, h: 27 },
  { x: 88, y: 25, w: 32, h: 28 },
  { x: 1148, y: 24, w: 32, h: 28 },
  { x: 268, y: 24, w: 30, h: 31 },
  { x: 712, y: 25, w: 35, h: 30 },
  { x: 971, y: 22, w: 37, h: 30 },
  { x: 900, y: 24, w: 42, h: 28 },
  { x: 388, y: 25, w: 40, h: 31 },
  { x: 1206, y: 23, w: 40, h: 31 },
  { x: 320, y: 23, w: 41, h: 34 },
  { x: 773, y: 23, w: 41, h: 34 },
  { x: 1350, y: 23, w: 47, h: 30 },
  { x: 644, y: 19, w: 42, h: 40 },
  { x: 1424, y: 21, w: 48, h: 30 },
  { x: 1035, y: 22, w: 46, h: 32 },
  { x: 198, y: 20, w: 45, h: 39 },
  { x: 1272, y: 16, w: 49, h: 39 },
  { x: 509, y: 19, w: 49, h: 40 },
  { x: 484, y: 83, w: 54, h: 41 },
  { x: 393, y: 82, w: 61, h: 36 },
  { x: 659, y: 80, w: 55, h: 41 },
  { x: 120, y: 81, w: 54, h: 41 },
  { x: 566, y: 80, w: 63, h: 38 },
  { x: 1497, y: 16, w: 66, h: 42 },
  { x: 1589, y: 15, w: 58, h: 45 },
  { x: 740, y: 80, w: 60, h: 44 },
  { x: 827, y: 79, w: 65, h: 43 },
  { x: 199, y: 79, w: 61, h: 45 },
  { x: 1580, y: 81, w: 66, h: 46 },
  { x: 1365, y: 76, w: 70, h: 44 },
  { x: 24, y: 77, w: 73, h: 46 },
  { x: 919, y: 74, w: 84, h: 47 },
  { x: 286, y: 77, w: 80, h: 54 },
  { x: 1140, y: 75, w: 86, h: 57 },
  { x: 1251, y: 71, w: 88, h: 60 },
  { x: 1028, y: 75, w: 86, h: 57 },
  { x: 1461, y: 77, w: 94, h: 55 },
  { x: 266, y: 152, w: 95, h: 66 },
  { x: 1410, y: 155, w: 95, h: 69 },
  { x: 882, y: 145, w: 107, h: 64 },
  { x: 1143, y: 152, w: 110, h: 66 },
  { x: 752, y: 149, w: 105, h: 64 },
  { x: 509, y: 147, w: 98, h: 75 },
  { x: 1011, y: 152, w: 112, h: 61 },
  { x: 387, y: 149, w: 99, h: 77 },
  { x: 631, y: 144, w: 101, h: 72 },
  { x: 1276, y: 150, w: 108, h: 72 },
  { x: 18, y: 150, w: 104, h: 75 },
  { x: 142, y: 147, w: 104, h: 79 },
  { x: 1526, y: 149, w: 128, h: 75 },
  { x: 401, y: 249, w: 135, h: 89 },
  { x: 657, y: 365, w: 164, h: 89 },
  { x: 1241, y: 364, w: 165, h: 97 },
  { x: 1040, y: 377, w: 176, h: 82 },
  { x: 449, y: 372, w: 180, h: 90 },
  { x: 846, y: 364, w: 170, h: 94 },
  { x: 202, y: 245, w: 176, h: 93 },
  { x: 258, y: 365, w: 166, h: 96 },
  { x: 18, y: 250, w: 160, h: 91 },
  { x: 1287, y: 241, w: 161, h: 104 },
  { x: 756, y: 232, w: 157, h: 114 },
  { x: 1098, y: 242, w: 178, h: 104 },
  { x: 552, y: 244, w: 189, h: 103 },
  { x: 1466, y: 244, w: 173, h: 103 },
  { x: 932, y: 230, w: 146, h: 127 },
  { x: 1430, y: 369, w: 231, h: 97 },
  { x: 16, y: 363, w: 211, h: 106 },
  { x: 11, y: 482, w: 232, h: 148 },
  { x: 815, y: 475, w: 264, h: 143 },
  { x: 257, y: 474, w: 243, h: 156 },
  { x: 1116, y: 476, w: 263, h: 154 },
  { x: 535, y: 469, w: 249, h: 164 },
  { x: 1404, y: 474, w: 258, h: 173 },
  { x: 340, y: 655, w: 277, h: 234 },
  { x: 992, y: 654, w: 284, h: 229 },
  { x: 1270, y: 672, w: 392, h: 215 },
  { x: 8, y: 638, w: 326, h: 256 },
  { x: 635, y: 623, w: 351, h: 278 }
]
const sheet = loadPictureImage(URL)
const groundSheet = loadPictureImage(GROUND_URL)
let cuts = null
//
// The lake's stone pile, baked once per live k and place (a scene restart
// reuses it).
//
const pileByK = new WeakMap()
let groundCuts = null

/**
 * Cuts the stones out of the sheet (once per page; waits for it to load).
 * @returns {Promise<Array<{canvas: HTMLCanvasElement, kind: string}>|null>} Stones in
 *   sheet order at sheet size (null if the sheet failed to load)
 */
export async function loadForestStones() {
  if (cuts) return cuts
  const [img, groundImg] = await Promise.all([sheet, groundSheet])
  groundImg && (groundCuts ??= cutSheet(groundImg, GROUND_STONES).map(c => c.canvas))
  if (!img) return null
  cuts ??= cutSheet(img, STONES)
  return cuts
}

/**
 * The stones buried in the earth band, cut at sheet size, smallest first;
 * empty until loadForestStones() has resolved.
 * @returns {Array<HTMLCanvasElement>}
 */
export function forestBuriedStones() {
  return groundCuts ?? []
}

/**
 * The stones that stand on the ground (mossy ones, the ones with plants and
 * the bits of wall), cut at sheet size; empty until loadForestStones() has
 * resolved.
 * @returns {Array<{canvas: HTMLCanvasElement, kind: string}>}
 */
export function forestGroundStones() {
  return (cuts ?? []).filter(s => s.kind !== STONE_KIND.BARE)
}

/**
 * One ground stone at world size (its sheet size times the ground scale and
 * a random tweak), graded and grained like the forest's baked material.
 * @param {{canvas: HTMLCanvasElement}} stone - A cut stone
 * @param {() => number} rng - Random in [0, 1)
 * @param {number} seed - Grain seed
 * @param {number} [sizeMul=1] - Extra size factor
 * @returns {HTMLCanvasElement}
 */
export function bakeForestGroundStone(stone, rng, seed, sizeMul = 1) {
  const scale = GROUND_SCALE * sizeMul * (1 + (rng() * 2 - 1) * GROUND_SCALE_JITTER)
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(stone.canvas.width * scale))
  canvas.height = Math.max(1, Math.round(stone.canvas.height * scale))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(stone.canvas, 0, 0, canvas.width, canvas.height)
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, seed)
  return canvas
}

/**
 * The stones lying on the lake bed, for Lake.create's bedStones (ungrained:
 * the bed bake grains them with the bed); empty until loadForestStones()
 * has resolved.
 * @returns {Array<{t: number, depth: number, canvas: HTMLCanvasElement, w: number, h: number}>}
 */
export function forestLakeBedStones() {
  if (!cuts) return []
  return LAKE_BED.map(spot => {
    const canvas = cuts[spot.id].canvas
    return { t: spot.t, depth: spot.depth, canvas, w: canvas.width * LAKE_SCALE, h: canvas.height * LAKE_SCALE }
  })
}

/**
 * Bakes the stone pile on the lake's tree-side bank into one sprite: its
 * stones rest down the bank into the bed (clipped at the bed), tinted with
 * the water below the water line.
 * @param {Object} k - Kaplay instance
 * @param {Object} lake - Lake inst
 * @param {number} waterY - World Y of the water line
 * @returns {{name: string, x: number, y: number, width: number, height: number}|null}
 *   Sprite and world rect (null until loadForestStones() has resolved)
 */
export function bakeForestLakeStonePile(k, lake, waterY) {
  if (!cuts) return null
  const key = `${lake.x1}|${lake.bakeSpan}|${waterY}`
  const cached = pileByK.get(k)
  if (cached?.key === key && k.getSprite(cached.pile.name)) return cached.pile
  const pile = bakeLakeStonePile(k, lake, waterY)
  pileByK.set(k, { key, pile })
  return pile
}
function bakeLakeStonePile(k, lake, waterY) {
  const footX = lake.x1 + lake.bakeSpan
  const xa = Math.round(footX + PILE_FROM_X)
  const xb = Math.round(footX + PILE_TO_X)
  const target = x => lake.floorY + PILE_TOP_LEFT_DOWN + (PILE_TOP_RIGHT_DOWN - PILE_TOP_LEFT_DOWN) * (x - xa) / (xb - xa)
  const surface = new Map()
  const surfaceAt = x => surface.get(x) ?? Lake.bedWorldY(lake, x)
  const stones = []
  const phases = [
    { shapes: pileStoneShapes(), x1: xa, x2: Math.round(footX + PILE_SHORE_X), forced: LAKE_PILE.length },
    { shapes: PILE_LAND.map(id => pileStoneShape(cuts[id].canvas, LAKE_SCALE)), x1: Math.round(footX + PILE_LAND_FROM_X), x2: xb, forced: 0 }
  ]
  phases.forEach(phase => phase.shapes.forEach((shape, i) => {
    if (stones.length >= PILE_MAX_STONES) return
    const forced = i < phase.forced
    const drop = bestPileDrop(shape, phase.x1, phase.x2, target, surfaceAt, forced ? Infinity : PILE_MAX_GAP)
    if (!drop || (!forced && drop.room < PILE_FULL_ROOM)) return
    stones.push(settlePileStone(shape, drop, surfaceAt, surface))
  }))
  const x0 = Math.floor(Math.min(...stones.map(s => s.x)) - LAKE_PILE_PAD)
  const y0 = Math.floor(Math.min(...stones.map(s => s.y)) - LAKE_PILE_PAD)
  const width = Math.ceil(Math.max(...stones.map(s => s.x + s.w)) + LAKE_PILE_PAD) - x0
  const height = Math.ceil(Math.max(...stones.map(s => s.gapBottom)) + LAKE_PILE_PAD) - y0
  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.save()
  Lake.clipToBed(ctx, lake, x0, y0, width, height)
  paintPileFill(ctx, surface, x0, y0, width, height)
  stones.slice().reverse().forEach(s => ctx.drawImage(s.canvas, s.x - x0, s.y - y0))
  ctx.restore()
  Lake.tintUnderwater(ctx, width, height, waterY - y0)
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, LAKE_PILE_GRAIN_SEED)
  const name = `forest0-lake-stone-pile-${Math.round(footX)}`
  k.loadSprite(name, canvas)
  return { name, x: x0, y: y0, width, height }
}
//
// The bed of small stones behind the pile, clipped to its body: from just
// under its top down to the canvas bottom (the bed clip trims the rest).
//
function paintPileFill(ctx, surface, x0, y0, width, height) {
  const xs = [...surface.keys()].sort((a, b) => a - b)
  if (!xs.length) return
  ctx.save()
  ctx.beginPath()
  ctx.moveTo(xs[0] - x0, height)
  xs.forEach(x => ctx.lineTo(x - x0, surface.get(x) + PILE_FILL_INSET - y0))
  ctx.lineTo(xs[xs.length - 1] - x0, height)
  ctx.closePath()
  ctx.clip()
  const rng = createSeededRandom(PILE_FILL_SEED)
  const fills = PILE_FILL.map(id => cuts[id].canvas)
  const cell = Math.max(...fills.map(c => c.height)) * PILE_FILL_SCALE * PILE_FILL_STEP
  for (let y = height + cell; y > -cell; y -= cell) {
    for (let x = -cell; x < width + cell; x += cell) {
      const c = fills[Math.floor(rng() * fills.length)]
      const w = c.width * PILE_FILL_SCALE
      const h = c.height * PILE_FILL_SCALE
      ctx.drawImage(c, x + (rng() - 0.5) * cell * PILE_FILL_JITTER - w / 2, y + (rng() - 0.5) * cell * PILE_FILL_JITTER - h / 2, w, h)
    }
  }
  ctx.restore()
}
//
// The pile's stones in drop order: the listed ones, then rounds of the
// smaller half of them (shuffled, a new size each round).
//
function pileStoneShapes() {
  const rng = createSeededRandom(PILE_SEED)
  const shapes = LAKE_PILE.map(id => pileStoneShape(cuts[id].canvas, LAKE_SCALE))
  const small = LAKE_PILE.slice(Math.floor(LAKE_PILE.length / 2))
  PILE_REUSE_SCALES.forEach(scale => {
    small
      .map(id => ({ id, order: rng() }))
      .sort((a, b) => a.order - b.order)
      .forEach(({ id }) => shapes.push(pileStoneShape(cuts[id].canvas, LAKE_SCALE * scale)))
  })
  return shapes
}
//
// A pile stone at a scale and, per column, the rows of its top and bottom
// solid pixels (null where the column is empty).
//
function pileStoneShape(src, scale) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(src.width * scale))
  canvas.height = Math.max(1, Math.round(src.height * scale))
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  const cols = []
  for (let x = 0; x < canvas.width; x++) {
    let top = null
    let bottom = null
    for (let y = 0; y < canvas.height; y++) {
      if (data[(y * canvas.width + x) * 4 + 3] < PILE_SOLID_ALPHA) continue
      top ??= y
      bottom = y
    }
    cols.push(top == null ? null : { top, bottom })
  }
  return { canvas, w: canvas.width, h: canvas.height, cols }
}
//
// Where a stone dropped with its left edge at each spot along its stretch
// (its right edge never past that stretch's end, at most maxGap px of empty
// space under it on average; null if no spot qualifies)
// would come to rest (y: its top), how much room under the slope it covers
// there, how much empty space it leaves under itself and how far it sticks
// out over the slope (all per column); the spot that fills most and leaves
// and sticks out least wins.
//
function bestPileDrop(shape, xa, xb, target, surfaceAt, maxGap) {
  let best = null
  for (let left = xa - Math.round(shape.w / 2); left <= xb - shape.w; left++) {
    let y = Infinity
    shape.cols.forEach((col, c) => { col && (y = Math.min(y, surfaceAt(left + c) - col.bottom)) })
    y += PILE_SINK
    let room = 0
    let gap = 0
    let over = 0
    let n = 0
    shape.cols.forEach((col, c) => {
      if (!col) return
      const under = surfaceAt(left + c)
      room += under - target(left + c)
      gap += Math.max(0, under - y - col.bottom)
      over += Math.max(0, target(left + c) - y - col.top)
      n++
    })
    if (gap / Math.max(1, n) > maxGap) continue
    const drop = { left, y, room: room / Math.max(1, n) }
    drop.score = drop.room - (PILE_GAP_WEIGHT * gap + PILE_OVER_WEIGHT * over) / Math.max(1, n)
    if (!best || drop.score > best.score) best = drop
  }
  return best
}
//
// Lays a stone where it was dropped and raises the pile's surface to its
// top. Returns where it lies and the room left under it (gaps per column).
//
function settlePileStone(shape, drop, surfaceAt, surface) {
  const { left: x, y } = drop
  const gaps = []
  shape.cols.forEach((col, c) => {
    if (!col) return
    const under = surfaceAt(x + c)
    under > y + col.bottom && gaps.push({ x: x + c, y1: y + col.bottom, y2: under })
    surface.set(x + c, Math.min(under, y + col.top))
  })
  const gapBottom = Math.max(y + shape.h, ...gaps.map(g => g.y2))
  return { canvas: shape.canvas, x, y, w: shape.w, h: shape.h, gaps, gapBottom }
}
//
// Every stone of a sheet cut out onto its own canvas, its backdrop fringe
// wiped (one pixel read of the loaded image, never of a drawn GPU canvas).
//
function cutSheet(img, rects) {
  const canvas = document.createElement('canvas')
  canvas.width = img.naturalWidth
  canvas.height = img.naturalHeight
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data
  return rects.map(rect => ({ canvas: cutStone(data, canvas.width, canvas.height, rect), kind: rect.kind }))
}
//
// One stone: its crop's pixels keyed, the stone's pieces kept (the biggest
// and every one clear of the crop border) with their soft edges.
//
function cutStone(data, sheetW, sheetH, rect) {
  const x0 = Math.max(0, rect.x - CROP_PAD)
  const y0 = Math.max(0, rect.y - CROP_PAD)
  const w = Math.min(sheetW, rect.x + rect.w + CROP_PAD) - x0
  const h = Math.min(sheetH, rect.y + rect.h + CROP_PAD) - y0
  const alpha = new Float32Array(w * h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) alpha[y * w + x] = pictureFringeAlpha(data, ((y0 + y) * sheetW + x0 + x) * 4)
  }
  const kept = keptPieces(alpha, w, h)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  const out = ctx.createImageData(w, h)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = y * w + x
      if (!kept[i]) continue
      const src = ((y0 + y) * sheetW + x0 + x) * 4
      out.data[i * 4] = data[src]
      out.data[i * 4 + 1] = data[src + 1]
      out.data[i * 4 + 2] = data[src + 2]
      out.data[i * 4 + 3] = Math.round(alpha[i] * 255)
    }
  }
  ctx.putImageData(out, 0, 0)
  return canvas
}
//
// Which crop pixels belong to the stone: solid pixels are grouped into
// 8-connected pieces; the biggest piece and the pieces clear of the border
// are kept, plus the soft pixels next to a kept one.
//
function keptPieces(alpha, w, h) {
  const label = new Int32Array(w * h).fill(-1)
  const pieces = []
  const stack = []
  for (let start = 0; start < w * h; start++) {
    if (label[start] >= 0 || alpha[start] < SOLID_SHARE) continue
    const piece = { size: 0, border: false }
    const id = pieces.push(piece) - 1
    label[start] = id
    stack.push(start)
    while (stack.length) {
      const i = stack.pop()
      const x = i % w
      const y = (i - x) / w
      piece.size++
      piece.border ||= x === 0 || y === 0 || x === w - 1 || y === h - 1
      forNeighbours(x, y, w, h, n => {
        if (label[n] >= 0 || alpha[n] < SOLID_SHARE) return
        label[n] = id
        stack.push(n)
      })
    }
  }
  const biggest = pieces.reduce((best, p, id) => (p.size > (pieces[best]?.size ?? -1) ? id : best), -1)
  const keepPiece = pieces.map((p, id) => id === biggest || !p.border)
  const kept = new Uint8Array(w * h)
  for (let i = 0; i < w * h; i++) label[i] >= 0 && keepPiece[label[i]] && (kept[i] = 1)
  for (let i = 0; i < w * h; i++) {
    if (kept[i] || label[i] >= 0 || alpha[i] <= 0) continue
    const x = i % w
    forNeighbours(x, (i - x) / w, w, h, n => { label[n] >= 0 && keepPiece[label[n]] && (kept[i] = 2) })
  }
  return kept
}
//
// Calls fn with the index of each of the 8 neighbours of (x, y) in a w x h grid.
//
function forNeighbours(x, y, w, h, fn) {
  for (let dy = -1; dy <= 1; dy++) {
    for (let dx = -1; dx <= 1; dx++) {
      const nx = x + dx
      const ny = y + dy
      if ((dx || dy) && nx >= 0 && ny >= 0 && nx < w && ny < h) fn(ny * w + nx)
    }
  }
}
