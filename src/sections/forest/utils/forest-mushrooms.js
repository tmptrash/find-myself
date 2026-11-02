import { cutSheetPieces, loadPictureImage } from './forest-picture.js'
//
// Forest mushrooms cut from assets/forest/mushrooms.png (its stray backdrop
// fringe wiped, each mushroom cut on its own): every call picks one of the
// sheet's mushrooms with its seeded random (mirrored at random) and stands
// it on the base point, as tall as asked. The sheet starts loading with this
// module (game boot) and is cut once per page; nothing is drawn before.
//
const URL = 'forest/mushrooms.png'
//
// The mushrooms on the sheet (px).
//
const MUSHROOMS = [
  { x: 26, y: 63, w: 70, h: 63 },
  { x: 104, y: 61, w: 71, h: 66 },
  { x: 187, y: 70, w: 56, h: 49 },
  { x: 256, y: 72, w: 58, h: 47 },
  { x: 326, y: 73, w: 57, h: 48 },
  { x: 394, y: 72, w: 52, h: 46 },
  { x: 457, y: 74, w: 48, h: 48 },
  { x: 512, y: 70, w: 52, h: 53 },
  { x: 574, y: 74, w: 57, h: 48 },
  { x: 642, y: 64, w: 68, h: 60 },
  { x: 726, y: 68, w: 60, h: 56 },
  { x: 804, y: 65, w: 53, h: 58 },
  { x: 871, y: 65, w: 66, h: 62 },
  { x: 940, y: 71, w: 63, h: 54 },
  { x: 1013, y: 74, w: 63, h: 50 },
  { x: 1089, y: 69, w: 49, h: 56 },
  { x: 1148, y: 76, w: 55, h: 49 },
  { x: 1212, y: 66, w: 61, h: 60 },
  { x: 1283, y: 67, w: 63, h: 56 },
  { x: 1354, y: 69, w: 62, h: 56 },
  { x: 29, y: 154, w: 50, h: 54 },
  { x: 94, y: 148, w: 60, h: 57 },
  { x: 167, y: 152, w: 67, h: 53 },
  { x: 243, y: 156, w: 68, h: 46 },
  { x: 321, y: 154, w: 68, h: 52 },
  { x: 402, y: 151, w: 49, h: 55 },
  { x: 469, y: 151, w: 49, h: 58 },
  { x: 530, y: 156, w: 67, h: 55 },
  { x: 608, y: 150, w: 56, h: 56 },
  { x: 680, y: 152, w: 54, h: 58 },
  { x: 745, y: 158, w: 65, h: 48 },
  { x: 821, y: 147, w: 48, h: 63 },
  { x: 882, y: 149, w: 68, h: 60 },
  { x: 960, y: 155, w: 59, h: 58 },
  { x: 1023, y: 150, w: 68, h: 53 },
  { x: 1097, y: 161, w: 58, h: 45 },
  { x: 1164, y: 157, w: 56, h: 49 },
  { x: 1228, y: 155, w: 59, h: 53 },
  { x: 1295, y: 155, w: 51, h: 52 },
  { x: 1359, y: 153, w: 53, h: 54 },
  { x: 34, y: 232, w: 68, h: 64 },
  { x: 113, y: 235, w: 58, h: 61 },
  { x: 186, y: 240, w: 69, h: 54 },
  { x: 270, y: 231, w: 60, h: 62 },
  { x: 343, y: 233, w: 65, h: 62 },
  { x: 420, y: 235, w: 62, h: 58 },
  { x: 495, y: 240, w: 72, h: 54 },
  { x: 582, y: 240, w: 78, h: 54 },
  { x: 680, y: 232, w: 43, h: 65 },
  { x: 737, y: 242, w: 62, h: 52 },
  { x: 809, y: 236, w: 50, h: 57 },
  { x: 869, y: 235, w: 66, h: 63 },
  { x: 947, y: 237, w: 68, h: 59 },
  { x: 1028, y: 240, w: 67, h: 55 },
  { x: 1104, y: 241, w: 64, h: 53 },
  { x: 1185, y: 237, w: 59, h: 58 },
  { x: 1258, y: 233, w: 79, h: 62 },
  { x: 1355, y: 239, w: 68, h: 58 },
  { x: 27, y: 315, w: 59, h: 73 },
  { x: 99, y: 320, w: 67, h: 65 },
  { x: 175, y: 319, w: 78, h: 64 },
  { x: 265, y: 321, w: 66, h: 61 },
  { x: 344, y: 323, w: 74, h: 62 },
  { x: 432, y: 325, w: 63, h: 59 },
  { x: 503, y: 330, w: 61, h: 50 },
  { x: 573, y: 320, w: 76, h: 65 },
  { x: 659, y: 330, w: 71, h: 58 },
  { x: 740, y: 322, w: 49, h: 65 },
  { x: 802, y: 319, w: 68, h: 63 },
  { x: 882, y: 327, w: 64, h: 57 },
  { x: 956, y: 330, w: 71, h: 54 },
  { x: 1035, y: 325, w: 59, h: 62 },
  { x: 1103, y: 325, w: 66, h: 59 },
  { x: 1181, y: 327, w: 65, h: 58 },
  { x: 1261, y: 320, w: 80, h: 66 },
  { x: 1354, y: 335, w: 68, h: 54 },
  { x: 26, y: 418, w: 67, h: 55 },
  { x: 106, y: 417, w: 73, h: 58 },
  { x: 191, y: 411, w: 78, h: 68 },
  { x: 277, y: 414, w: 81, h: 60 },
  { x: 369, y: 418, w: 61, h: 55 },
  { x: 440, y: 420, w: 68, h: 53 },
  { x: 517, y: 418, w: 79, h: 56 },
  { x: 605, y: 418, w: 59, h: 56 },
  { x: 681, y: 416, w: 64, h: 63 },
  { x: 756, y: 421, w: 64, h: 59 },
  { x: 832, y: 423, w: 65, h: 55 },
  { x: 908, y: 420, w: 70, h: 59 },
  { x: 993, y: 416, w: 54, h: 58 },
  { x: 1064, y: 423, w: 69, h: 57 },
  { x: 1143, y: 418, w: 73, h: 58 },
  { x: 1222, y: 422, w: 56, h: 58 },
  { x: 1285, y: 416, w: 62, h: 59 },
  { x: 1360, y: 419, w: 62, h: 57 },
  { x: 26, y: 501, w: 65, h: 54 },
  { x: 104, y: 504, w: 63, h: 52 },
  { x: 180, y: 507, w: 63, h: 53 },
  { x: 256, y: 506, w: 54, h: 51 },
  { x: 330, y: 502, w: 76, h: 58 },
  { x: 421, y: 501, w: 62, h: 60 },
  { x: 497, y: 506, w: 70, h: 55 },
  { x: 583, y: 505, w: 65, h: 56 },
  { x: 661, y: 504, w: 68, h: 60 },
  { x: 746, y: 503, w: 67, h: 57 },
  { x: 827, y: 509, w: 71, h: 53 },
  { x: 912, y: 510, w: 58, h: 50 },
  { x: 984, y: 503, w: 75, h: 58 },
  { x: 1069, y: 513, w: 53, h: 46 },
  { x: 1131, y: 504, w: 64, h: 57 },
  { x: 1209, y: 509, w: 54, h: 55 },
  { x: 1278, y: 503, w: 58, h: 63 },
  { x: 1348, y: 501, w: 73, h: 63 },
  { x: 26, y: 585, w: 62, h: 55 },
  { x: 105, y: 590, w: 54, h: 49 },
  { x: 176, y: 587, w: 68, h: 53 },
  { x: 260, y: 586, w: 60, h: 55 },
  { x: 336, y: 584, w: 60, h: 54 },
  { x: 409, y: 584, w: 75, h: 55 },
  { x: 501, y: 585, w: 69, h: 55 },
  { x: 583, y: 583, w: 54, h: 57 },
  { x: 651, y: 592, w: 61, h: 53 },
  { x: 724, y: 591, w: 62, h: 56 },
  { x: 800, y: 592, w: 53, h: 54 },
  { x: 867, y: 591, w: 51, h: 53 },
  { x: 929, y: 596, w: 52, h: 46 },
  { x: 993, y: 593, w: 55, h: 53 },
  { x: 1060, y: 601, w: 62, h: 48 },
  { x: 1132, y: 596, w: 53, h: 50 },
  { x: 1195, y: 596, w: 63, h: 52 },
  { x: 1274, y: 598, w: 64, h: 49 },
  { x: 1353, y: 591, w: 69, h: 58 },
  { x: 30, y: 673, w: 67, h: 47 },
  { x: 113, y: 672, w: 65, h: 49 },
  { x: 195, y: 673, w: 58, h: 47 },
  { x: 269, y: 670, w: 58, h: 51 },
  { x: 341, y: 669, w: 57, h: 51 },
  { x: 411, y: 669, w: 56, h: 48 },
  { x: 485, y: 660, w: 54, h: 61 },
  { x: 557, y: 666, w: 60, h: 55 },
  { x: 630, y: 674, w: 56, h: 47 },
  { x: 698, y: 667, w: 56, h: 54 },
  { x: 769, y: 673, w: 76, h: 50 },
  { x: 859, y: 674, w: 47, h: 50 },
  { x: 919, y: 673, w: 46, h: 51 },
  { x: 982, y: 671, w: 58, h: 55 },
  { x: 1055, y: 673, w: 63, h: 54 },
  { x: 1131, y: 676, w: 60, h: 47 },
  { x: 1204, y: 671, w: 56, h: 57 },
  { x: 1274, y: 669, w: 65, h: 56 },
  { x: 1354, y: 671, w: 67, h: 54 },
  { x: 34, y: 745, w: 69, h: 56 },
  { x: 117, y: 752, w: 52, h: 49 },
  { x: 182, y: 742, w: 54, h: 57 },
  { x: 251, y: 754, w: 59, h: 50 },
  { x: 322, y: 748, w: 61, h: 59 },
  { x: 397, y: 746, w: 66, h: 59 },
  { x: 470, y: 757, w: 48, h: 51 },
  { x: 527, y: 754, w: 66, h: 55 },
  { x: 601, y: 750, w: 68, h: 61 },
  { x: 682, y: 758, w: 57, h: 50 },
  { x: 753, y: 755, w: 55, h: 56 },
  { x: 819, y: 747, w: 54, h: 55 },
  { x: 885, y: 757, w: 56, h: 49 },
  { x: 955, y: 752, w: 60, h: 52 },
  { x: 1029, y: 752, w: 64, h: 54 },
  { x: 1108, y: 747, w: 64, h: 59 },
  { x: 1184, y: 757, w: 62, h: 50 },
  { x: 1260, y: 749, w: 76, h: 62 },
  { x: 1352, y: 747, w: 69, h: 59 },
  { x: 38, y: 824, w: 64, h: 59 },
  { x: 117, y: 828, w: 72, h: 54 },
  { x: 204, y: 825, w: 67, h: 56 },
  { x: 285, y: 829, w: 60, h: 52 },
  { x: 356, y: 828, w: 59, h: 57 },
  { x: 429, y: 830, w: 62, h: 55 },
  { x: 505, y: 833, w: 51, h: 50 },
  { x: 570, y: 833, w: 71, h: 51 },
  { x: 654, y: 839, w: 51, h: 46 },
  { x: 722, y: 837, w: 63, h: 51 },
  { x: 799, y: 832, w: 60, h: 56 },
  { x: 874, y: 832, w: 62, h: 59 },
  { x: 950, y: 828, w: 58, h: 61 },
  { x: 1021, y: 836, w: 56, h: 56 },
  { x: 1090, y: 835, w: 68, h: 55 },
  { x: 1170, y: 841, w: 56, h: 45 },
  { x: 1235, y: 832, w: 54, h: 54 },
  { x: 1300, y: 839, w: 58, h: 49 },
  { x: 1369, y: 834, w: 52, h: 50 },
  { x: 25, y: 907, w: 61, h: 51 },
  { x: 97, y: 911, w: 57, h: 52 },
  { x: 168, y: 907, w: 51, h: 56 },
  { x: 230, y: 915, w: 58, h: 48 },
  { x: 299, y: 909, w: 57, h: 53 },
  { x: 367, y: 910, w: 61, h: 55 },
  { x: 441, y: 911, w: 72, h: 55 },
  { x: 525, y: 913, w: 62, h: 48 },
  { x: 599, y: 910, w: 58, h: 53 },
  { x: 669, y: 909, w: 56, h: 53 },
  { x: 737, y: 913, w: 66, h: 54 },
  { x: 814, y: 918, w: 55, h: 46 },
  { x: 880, y: 913, w: 53, h: 51 },
  { x: 944, y: 915, w: 62, h: 51 },
  { x: 1014, y: 914, w: 55, h: 51 },
  { x: 1079, y: 920, w: 60, h: 46 },
  { x: 1149, y: 915, w: 49, h: 50 },
  { x: 1207, y: 910, w: 71, h: 54 },
  { x: 1291, y: 909, w: 57, h: 58 },
  { x: 1359, y: 915, w: 64, h: 55 },
  { x: 27, y: 986, w: 68, h: 56 },
  { x: 107, y: 989, w: 64, h: 47 },
  { x: 183, y: 986, w: 54, h: 53 },
  { x: 247, y: 990, w: 57, h: 52 },
  { x: 314, y: 990, w: 48, h: 48 },
  { x: 374, y: 994, w: 52, h: 45 },
  { x: 438, y: 989, w: 60, h: 50 },
  { x: 512, y: 989, w: 45, h: 51 },
  { x: 572, y: 989, w: 60, h: 50 },
  { x: 642, y: 993, w: 54, h: 50 },
  { x: 709, y: 989, w: 48, h: 51 },
  { x: 766, y: 997, w: 58, h: 44 },
  { x: 835, y: 994, w: 60, h: 47 },
  { x: 908, y: 987, w: 55, h: 53 },
  { x: 977, y: 989, w: 62, h: 49 },
  { x: 1056, y: 990, w: 60, h: 46 },
  { x: 1130, y: 990, w: 68, h: 48 },
  { x: 1208, y: 990, w: 58, h: 49 },
  { x: 1279, y: 995, w: 56, h: 44 },
  { x: 1350, y: 994, w: 67, h: 47 }
]
//
// A mushroom's foot sinks SINK_SHARE of its height into the ground; none is
// wider than MAX_ASPECT times its height (bounds); MIRROR_SHARE of them are
// drawn mirrored.
//
const SINK_SHARE = 0.06
//
// Height of a mushroom when the caller asks for none (a little random).
//
const DEFAULT_SIZE_MIN = 16
const DEFAULT_SIZE_RANGE = 10
const MAX_ASPECT = 1.57
const MIRROR_SHARE = 0.5
const BOUNDS_PAD = 4
const sheet = loadPictureImage(URL)
let cuts = null

/**
 * Waits for the mushroom sheet and cuts it (once per page).
 * @returns {Promise<void>}
 */
export async function loadForestMushrooms() {
  if (cuts) return
  const img = await sheet
  cuts ??= img && cutSheetPieces(img, MUSHROOMS)
}

/**
 * Paints one mushroom rooted at (x, baseY), as tall as size.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.x - Base X
 * @param {number} opts.baseY - Base Y (ground contact)
 * @param {number} [opts.size] - Mushroom height (px; default a random small one)
 * @param {() => number} opts.rng - Seeded random in [0, 1)
 */
export function drawForestMushroom(ctx, opts) {
  if (!cuts) return
  const { x, baseY, rng } = opts
  const size = opts.size ?? DEFAULT_SIZE_MIN + rng() * DEFAULT_SIZE_RANGE
  const mushroom = cuts[Math.floor(rng() * cuts.length)]
  const scale = size / mushroom.height
  const mirror = rng() < MIRROR_SHARE ? -1 : 1
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(x, baseY + size * SINK_SHARE)
  ctx.scale(scale * mirror, scale)
  ctx.drawImage(mushroom, -mushroom.width / 2, -mushroom.height)
  ctx.restore()
}

/**
 * Conservative world bounds of a mushroom (for bake canvases).
 * @param {number} x - Base X
 * @param {number} baseY - Base Y
 * @param {number} [size] - Mushroom height (px; default the largest default one)
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
export function forestMushroomBounds(x, baseY, size = DEFAULT_SIZE_MIN + DEFAULT_SIZE_RANGE) {
  const half = size * MAX_ASPECT / 2 + BOUNDS_PAD
  return { x1: x - half, y1: baseY - size - BOUNDS_PAD, x2: x + half, y2: baseY + BOUNDS_PAD }
}
