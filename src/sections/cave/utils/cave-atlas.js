import { loadPictureImage } from '../../forest/utils/forest-picture.js'
//
// The cave's painted props: two sheets (assets/cave0/plants.png and
// stones.png) cut into named pieces. A sheet's background is not clean —
// faint coloured haze and red / yellow / green fringes sit round every
// piece at low alpha — so each cut piece has its alpha remapped once
// (below ALPHA_LO gone, above ALPHA_HI solid). Pieces are plain canvases,
// cached per page (they do not belong to a Kaplay instance); the bakes
// that use them (terrain tiles, backdrop, live sprites) carry the grain.
//
const PLANTS_URL = 'cave0/plants.png'
const STONES_URL = 'cave0/stones.png'
const SHEET = { PLANTS: 'plants', STONES: 'stones' }
const ALPHA_LO = 40
const ALPHA_HI = 200
const BYTE_MAX = 255
//
// Pieces: sheet, then x, y, w, h of the piece on its sheet (found by
// cutting the sheet's solid parts into islands).
//
const PIECES = {
  trapFlower: [SHEET.PLANTS, 15, 13, 297, 299],
  chanterelle: [SHEET.PLANTS, 327, 79, 213, 231],
  tealMushrooms: [SHEET.PLANTS, 547, 152, 140, 158],
  umbrellaTree: [SHEET.PLANTS, 698, 74, 224, 237],
  hangingVines: [SHEET.PLANTS, 1086, 29, 197, 291],
  redBulbs: [SHEET.PLANTS, 1302, 88, 134, 221],
  mossMound: [SHEET.PLANTS, 12, 336, 215, 190],
  tealBubbles: [SHEET.PLANTS, 260, 358, 132, 161],
  puffballs: [SHEET.PLANTS, 435, 348, 115, 179],
  monstera: [SHEET.PLANTS, 595, 362, 190, 159],
  redStarFlower: [SHEET.PLANTS, 822, 386, 180, 131],
  ferns: [SHEET.PLANTS, 1046, 356, 151, 161],
  lilyPads: [SHEET.PLANTS, 1231, 358, 194, 158],
  leafArch: [SHEET.PLANTS, 16, 560, 233, 151],
  pitchers: [SHEET.PLANTS, 284, 550, 153, 165],
  glowMoss: [SHEET.PLANTS, 465, 556, 193, 158],
  tealTrumpets: [SHEET.PLANTS, 693, 554, 134, 158],
  seedPods: [SHEET.PLANTS, 881, 546, 140, 165],
  whiteFlowers: [SHEET.PLANTS, 1045, 598, 203, 115],
  bigLeaf: [SHEET.PLANTS, 1253, 551, 179, 166],
  redTentacles: [SHEET.PLANTS, 19, 738, 136, 140],
  tealLeaves: [SHEET.PLANTS, 185, 759, 142, 116],
  mossStump: [SHEET.PLANTS, 349, 751, 174, 130],
  orangeMushrooms: [SHEET.PLANTS, 569, 742, 144, 134],
  rootArch: [SHEET.PLANTS, 742, 735, 251, 144],
  monsteraLow: [SHEET.PLANTS, 1023, 749, 203, 129],
  redCoral: [SHEET.PLANTS, 1266, 752, 168, 129],
  tealBulbs: [SHEET.PLANTS, 26, 910, 105, 145],
  glowBerries: [SHEET.PLANTS, 176, 916, 140, 140],
  shelfFungus: [SHEET.PLANTS, 332, 920, 193, 138],
  droopBulbs: [SHEET.PLANTS, 562, 914, 136, 138],
  tealMushroomsBig: [SHEET.PLANTS, 730, 917, 151, 135],
  goldFlower: [SHEET.PLANTS, 918, 912, 173, 144],
  holeyMoss: [SHEET.PLANTS, 1126, 915, 137, 137],
  redSprouts: [SHEET.PLANTS, 1306, 923, 126, 130],
  mossBoulder: [SHEET.STONES, 14, 12, 266, 177],
  rockPile: [SHEET.STONES, 289, 5, 230, 186],
  caveRock: [SHEET.STONES, 531, 29, 224, 163],
  spires: [SHEET.STONES, 770, 6, 203, 183],
  slabs: [SHEET.STONES, 980, 21, 247, 171],
  mossRock: [SHEET.STONES, 1228, 15, 206, 179],
  vineLedge: [SHEET.STONES, 12, 201, 275, 161],
  flatSlab: [SHEET.STONES, 281, 220, 261, 141],
  mossLedge: [SHEET.STONES, 544, 209, 222, 153],
  stepSlabs: [SHEET.STONES, 784, 215, 236, 135],
  flatRocks: [SHEET.STONES, 1025, 224, 256, 122],
  smallMossRock: [SHEET.STONES, 1287, 224, 149, 119],
  boulder: [SHEET.STONES, 8, 378, 162, 142],
  crackedRock: [SHEET.STONES, 176, 376, 191, 148],
  emberRock: [SHEET.STONES, 367, 370, 162, 150],
  pumice: [SHEET.STONES, 526, 377, 172, 143],
  mossHump: [SHEET.STONES, 704, 382, 167, 138],
  tealShroomRock: [SHEET.STONES, 874, 371, 189, 153],
  rootRock: [SHEET.STONES, 1073, 372, 197, 148],
  goldCrystalRock: [SHEET.STONES, 1274, 385, 168, 136],
  stalagmites: [SHEET.STONES, 12, 526, 168, 145],
  spike: [SHEET.STONES, 192, 532, 110, 144],
  spikes: [SHEET.STONES, 318, 545, 149, 129],
  mound: [SHEET.STONES, 471, 537, 148, 136],
  wetSpike: [SHEET.STONES, 625, 533, 126, 136],
  spikeSmall: [SHEET.STONES, 769, 568, 86, 109],
  spikesThin: [SHEET.STONES, 867, 558, 101, 117],
  fernSpire: [SHEET.STONES, 991, 541, 161, 135],
  vineSpire: [SHEET.STONES, 1166, 534, 141, 143],
  rockHeap: [SHEET.STONES, 1312, 556, 134, 114],
  goldCrystals: [SHEET.STONES, 7, 682, 157, 136],
  tealCrystals: [SHEET.STONES, 181, 694, 143, 123],
  whiteCrystals: [SHEET.STONES, 333, 693, 133, 123],
  copperOre: [SHEET.STONES, 473, 695, 145, 120],
  tealOre: [SHEET.STONES, 623, 693, 151, 122],
  goldOre: [SHEET.STONES, 782, 693, 138, 124],
  geode: [SHEET.STONES, 928, 693, 167, 123],
  pumiceRound: [SHEET.STONES, 1105, 695, 152, 120],
  rockSlant: [SHEET.STONES, 1266, 693, 174, 121],
  pebblePile: [SHEET.STONES, 10, 831, 168, 92],
  cobbles: [SHEET.STONES, 186, 843, 156, 78],
  cobblesSmall: [SHEET.STONES, 348, 856, 106, 62],
  flatPebbles: [SHEET.STONES, 468, 859, 182, 55],
  mossCobble: [SHEET.STONES, 655, 839, 150, 83],
  wetSlab: [SHEET.STONES, 816, 856, 134, 64],
  mossPebble: [SHEET.STONES, 965, 857, 103, 62],
  rockSharp: [SHEET.STONES, 1078, 836, 112, 83],
  rockSmall: [SHEET.STONES, 1200, 848, 97, 71],
  caveMound: [SHEET.STONES, 13, 938, 203, 138],
  archRock: [SHEET.STONES, 233, 938, 219, 136],
  fernMound: [SHEET.STONES, 462, 937, 157, 139],
  orangeShroomMound: [SHEET.STONES, 627, 955, 178, 122],
  holeyMound: [SHEET.STONES, 814, 941, 161, 137],
  vineBoulder: [SHEET.STONES, 982, 939, 128, 136],
  tealBulbRock: [SHEET.STONES, 1122, 953, 106, 122],
  rootBoulder: [SHEET.STONES, 1246, 939, 201, 138],
  pebbles: [SHEET.STONES, 1300, 862, 135, 52]
}
const sheets = new Map()
const pieces = new Map()
let loading = null

/**
 * Loads both sheets (once per page).
 * @returns {Promise<void>}
 */
export function load() {
  loading ??= Promise.all([PLANTS_URL, STONES_URL].map(loadPictureImage)).then(([plants, stones]) => {
    plants && sheets.set(SHEET.PLANTS, plants)
    stones && sheets.set(SHEET.STONES, stones)
  })
  return loading
}

/**
 * True once both sheets are loaded.
 * @returns {boolean}
 */
export function isLoaded() {
  return sheets.size === 2
}

/**
 * A cut piece with its haze and fringes removed (null before load()).
 * @param {string} name - PIECES key
 * @returns {HTMLCanvasElement|null}
 */
export function piece(name) {
  if (pieces.has(name)) return pieces.get(name)
  const spec = PIECES[name]
  const img = spec && sheets.get(spec[0])
  if (!img) return null
  const [, sx, sy, w, h] = spec
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h)
  const image = ctx.getImageData(0, 0, w, h)
  const data = image.data
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(BYTE_MAX, (data[i] - ALPHA_LO) * BYTE_MAX / (ALPHA_HI - ALPHA_LO)))
  }
  ctx.putImageData(image, 0, 0)
  pieces.set(name, canvas)
  return canvas
}

/**
 * Width a piece gets when drawn at a given height (its aspect kept).
 * @param {string} name - PIECES key
 * @param {number} h - Drawn height
 * @returns {number}
 */
export function widthAt(name, h) {
  const spec = PIECES[name]
  return spec ? h * spec[3] / spec[4] : 0
}

/**
 * Draws a piece into a 2D canvas: its foot (bottom centre) at x / y, or
 * hanging from that point when `hang` is set; optionally mirrored, faded
 * and shaded toward a colour (distance, darkness).
 * @param {CanvasRenderingContext2D} ctx - Target context (world-translated)
 * @param {string} name - PIECES key
 * @param {number} x - Foot X
 * @param {number} y - Foot Y (top Y when hanging)
 * @param {number} h - Drawn height
 * @param {Object} [opts]
 * @param {boolean} [opts.flip=false] - Mirror horizontally
 * @param {boolean} [opts.hang=false] - Anchor at the top centre instead
 * @param {number} [opts.alpha=1] - Opacity
 * @param {string} [opts.shade] - Colour to shade toward ('#rrggbb')
 * @param {number} [opts.shadeAmount=0] - 0 = untouched, 1 = flat colour
 */
export function drawPiece(ctx, name, x, y, h, opts = {}) {
  const src = piece(name)
  if (!src) return
  const w = widthAt(name, h)
  const img = opts.shade && opts.shadeAmount > 0 ? shaded(src, opts.shade, opts.shadeAmount) : src
  ctx.save()
  ctx.globalAlpha = opts.alpha ?? 1
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(x, opts.hang ? y : y - h)
  opts.flip && ctx.scale(-1, 1)
  ctx.drawImage(img, -w / 2, 0, w, h)
  ctx.restore()
}
//
// Copy of a piece pulled toward a colour (its silhouette kept).
//
function shaded(src, color, amount) {
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(src, 0, 0)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = amount
  ctx.fillStyle = color
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  return canvas
}
