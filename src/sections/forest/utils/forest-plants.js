import { cutSheetPieces, loadPictureImage } from './forest-picture.js'
//
// Forest plants cut from assets/forest/grass.png (its stray backdrop fringe
// wiped, each plant cut on its own): every call picks one of the sheet's
// plants with its seeded random (mirrored at random) and stands it on the
// base point, as tall as asked. The sheet starts loading with this module
// (game boot) and is cut once per page; nothing is drawn before.
//
const URL = 'forest/grass.png'
//
// The plants on the sheet (px).
//
const PLANTS = [
  { x: 146, y: 165, w: 64, h: 39 },
  { x: 242, y: 144, w: 92, h: 60 },
  { x: 363, y: 139, w: 94, h: 65 },
  { x: 487, y: 120, w: 95, h: 86 },
  { x: 620, y: 124, w: 77, h: 81 },
  { x: 856, y: 110, w: 84, h: 98 },
  { x: 969, y: 86, w: 127, h: 119 },
  { x: 1113, y: 93, w: 124, h: 113 },
  { x: 1271, y: 115, w: 84, h: 90 },
  { x: 1386, y: 133, w: 122, h: 71 },
  { x: 1536, y: 77, w: 198, h: 132 },
  { x: 1765, y: 137, w: 119, h: 67 },
  { x: 1910, y: 33, w: 113, h: 172 },
  { x: 732, y: 147, w: 98, h: 63 },
  { x: 27, y: 317, w: 44, h: 40 },
  { x: 97, y: 264, w: 105, h: 93 },
  { x: 225, y: 255, w: 81, h: 104 },
  { x: 325, y: 228, w: 84, h: 131 },
  { x: 428, y: 229, w: 110, h: 131 },
  { x: 566, y: 269, w: 59, h: 92 },
  { x: 646, y: 319, w: 109, h: 39 },
  { x: 778, y: 246, w: 85, h: 114 },
  { x: 895, y: 240, w: 101, h: 121 },
  { x: 1011, y: 259, w: 121, h: 103 },
  { x: 1158, y: 288, w: 75, h: 69 },
  { x: 1254, y: 281, w: 72, h: 75 },
  { x: 1355, y: 278, w: 89, h: 81 },
  { x: 1471, y: 246, w: 66, h: 115 },
  { x: 1561, y: 259, w: 98, h: 102 },
  { x: 1684, y: 251, w: 150, h: 107 },
  { x: 1857, y: 266, w: 98, h: 91 },
  { x: 1980, y: 170, w: 160, h: 186 },
  { x: 1400, y: 416, w: 144, h: 92 },
  { x: 1567, y: 427, w: 57, h: 81 },
  { x: 1644, y: 421, w: 73, h: 88 },
  { x: 1743, y: 419, w: 68, h: 89 },
  { x: 1834, y: 418, w: 137, h: 91 },
  { x: 22, y: 414, w: 113, h: 101 },
  { x: 162, y: 425, w: 121, h: 90 },
  { x: 306, y: 386, w: 143, h: 129 },
  { x: 465, y: 447, w: 85, h: 67 },
  { x: 576, y: 392, w: 135, h: 123 },
  { x: 736, y: 419, w: 107, h: 97 },
  { x: 865, y: 453, w: 48, h: 63 },
  { x: 918, y: 376, w: 133, h: 139 },
  { x: 1070, y: 430, w: 91, h: 85 },
  { x: 1179, y: 374, w: 98, h: 138 },
  { x: 1303, y: 415, w: 77, h: 98 },
  { x: 1991, y: 380, w: 143, h: 141 },
  { x: 28, y: 611, w: 181, h: 69 },
  { x: 217, y: 549, w: 124, h: 127 },
  { x: 353, y: 565, w: 86, h: 110 },
  { x: 454, y: 613, w: 97, h: 63 },
  { x: 571, y: 543, w: 113, h: 133 },
  { x: 712, y: 579, w: 134, h: 98 },
  { x: 868, y: 542, w: 98, h: 133 },
  { x: 984, y: 615, w: 53, h: 61 },
  { x: 1054, y: 570, w: 83, h: 106 },
  { x: 1152, y: 557, w: 118, h: 120 },
  { x: 1288, y: 553, w: 98, h: 123 },
  { x: 1402, y: 569, w: 135, h: 107 },
  { x: 1551, y: 525, w: 188, h: 152 },
  { x: 1760, y: 561, w: 73, h: 115 },
  { x: 1857, y: 546, w: 137, h: 131 },
  { x: 2013, y: 576, w: 118, h: 101 }
]
//
// A plant's foot sinks SINK_SHARE of its height into the ground; no plant
// is wider than MAX_ASPECT times its height (bounds); MIRROR_SHARE of them
// are drawn mirrored.
//
const SINK_SHARE = 0.04
//
// Height of a plant when the caller asks for none: a small one standing in
// for a grass tuft (a little random).
//
const DEFAULT_SIZE_MIN = 14
const DEFAULT_SIZE_RANGE = 8
const MAX_ASPECT = 2.84
const MIRROR_SHARE = 0.5
const BOUNDS_PAD = 4
const sheet = loadPictureImage(URL)
let cuts = null

/**
 * Waits for the plant sheet and cuts it (once per page).
 * @returns {Promise<void>}
 */
export async function loadForestPlants() {
  if (cuts) return
  const img = await sheet
  cuts ??= img && cutSheetPieces(img, PLANTS)
}

/**
 * Paints one plant rooted at (x, baseY), as tall as size.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.x - Base X
 * @param {number} opts.baseY - Base Y (ground contact)
 * @param {number} [opts.size] - Plant height (px; default a random small one)
 * @param {() => number} opts.rng - Seeded random in [0, 1)
 */
export function drawForestPlant(ctx, opts) {
  if (!cuts) return
  const { x, baseY, rng } = opts
  const size = opts.size ?? DEFAULT_SIZE_MIN + rng() * DEFAULT_SIZE_RANGE
  const plant = cuts[Math.floor(rng() * cuts.length)]
  const scale = size / plant.height
  const mirror = rng() < MIRROR_SHARE ? -1 : 1
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(x, baseY + size * SINK_SHARE)
  ctx.scale(scale * mirror, scale)
  ctx.drawImage(plant, -plant.width / 2, -plant.height)
  ctx.restore()
}

/**
 * Conservative world bounds of a plant (for bake canvases).
 * @param {number} x - Base X
 * @param {number} baseY - Base Y
 * @param {number} [size] - Plant height (px; default the tallest default one)
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
export function forestPlantBounds(x, baseY, size = DEFAULT_SIZE_MIN + DEFAULT_SIZE_RANGE) {
  const half = size * MAX_ASPECT / 2 + BOUNDS_PAD
  return { x1: x - half, y1: baseY - size - BOUNDS_PAD, x2: x + half, y2: baseY + BOUNDS_PAD }
}
