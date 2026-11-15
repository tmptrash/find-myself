import { loadPictureImage } from '../../forest/utils/forest-picture.js'
//
// The cave's painted art: three sheets in assets/cave0 — plants, stones
// (its crystals) and rock platforms (flat, block, sloped and hanging
// platforms plus loose stones) — and the forest's ground stones (the
// cave's far wall), cut into named pieces. The sheets' backgrounds are not
// clean: faint coloured haze and fringes sit round every piece at low
// alpha, so its alpha is remapped once (below ALPHA_LO gone, above
// ALPHA_HI solid). Pieces
// are plain canvases, cached per page (they do not belong to a Kaplay
// instance); the bakes that use them carry the grain.
//
const SHEET = { PLANTS: 'plants', STONES: 'stones', PLATFORMS: 'platforms', GROUND_STONES: 'groundStones' }
const SHEET_URLS = {
  [SHEET.PLANTS]: 'cave0/plants.png',
  [SHEET.STONES]: 'cave0/stones.png',
  [SHEET.PLATFORMS]: 'cave0/platforms.png',
  [SHEET.GROUND_STONES]: 'forest/stones_ground.png'
}
const ALPHA_LO = 40
const ALPHA_HI = 200
const BYTE_MAX = 255
//
// Pieces: sheet, then x, y, w, h of the piece on its sheet (found by
// cutting the sheet's solid parts into islands). Flat, block and hanging
// platforms also carry their top line (its Y in the piece) and where it
// starts and ends (X in the piece); sloped ones the top's left end (Y, X),
// its right end X and Y.
//
const PIECES = {
  goldCrystals: [SHEET.STONES, 7, 682, 157, 136],
  flat0: [SHEET.PLATFORMS, 8, 4, 108, 101, 13, 13, 97],
  flat1: [SHEET.PLATFORMS, 122, 4, 115, 102, 13, 14, 101],
  flat2: [SHEET.PLATFORMS, 238, 2, 161, 106, 14, 17, 147],
  flat3: [SHEET.PLATFORMS, 402, 2, 235, 111, 14, 17, 222],
  flat4: [SHEET.PLATFORMS, 638, 2, 292, 116, 14, 19, 278],
  flat5: [SHEET.PLATFORMS, 930, 2, 511, 116, 13, 18, 494],
  flat6: [SHEET.PLATFORMS, 5, 120, 352, 113, 13, 27, 339],
  flat7: [SHEET.PLATFORMS, 359, 110, 471, 124, 14, 26, 439],
  flat8: [SHEET.PLATFORMS, 831, 116, 612, 121, 14, 21, 584],
  block0: [SHEET.PLATFORMS, 3, 237, 174, 124, 14, 19, 161],
  block1: [SHEET.PLATFORMS, 180, 236, 174, 127, 14, 20, 161],
  block2: [SHEET.PLATFORMS, 357, 238, 169, 125, 13, 19, 156],
  block3: [SHEET.PLATFORMS, 530, 237, 175, 125, 13, 19, 160],
  block4: [SHEET.PLATFORMS, 714, 236, 184, 124, 14, 17, 169],
  block5: [SHEET.PLATFORMS, 903, 236, 181, 126, 14, 16, 167],
  block6: [SHEET.PLATFORMS, 1094, 237, 173, 114, 13, 15, 160],
  block7: [SHEET.PLATFORMS, 1277, 236, 167, 111, 14, 14, 151],
  cone0: [SHEET.PLATFORMS, 248, 615, 149, 114, 14, 17, 135],
  cone1: [SHEET.PLATFORMS, 397, 615, 144, 117, 14, 14, 130],
  cone2: [SHEET.PLATFORMS, 541, 614, 212, 133, 13, 22, 195],
  cone3: [SHEET.PLATFORMS, 755, 615, 244, 120, 13, 17, 227],
  cone4: [SHEET.PLATFORMS, 1004, 613, 260, 126, 14, 17, 242],
  cone5: [SHEET.PLATFORMS, 1267, 614, 175, 124, 14, 18, 159],
  rise0: [SHEET.PLATFORMS, 4, 367, 176, 100, 39, 19, 157, 20],
  rise1: [SHEET.PLATFORMS, 179, 351, 226, 124, 53, 18, 207, 19],
  rise2: [SHEET.PLATFORMS, 406, 347, 241, 121, 55, 18, 222, 20],
  rise3: [SHEET.PLATFORMS, 638, 334, 337, 138, 8, 12, 317, 21],
  rise4: [SHEET.PLATFORMS, 968, 334, 477, 142, 8, 19, 457, 20],
  fall0: [SHEET.PLATFORMS, 7, 469, 366, 125, 23, 18, 346, 49],
  fall1: [SHEET.PLATFORMS, 373, 466, 300, 123, 23, 18, 281, 52],
  fall2: [SHEET.PLATFORMS, 675, 472, 346, 133, 23, 19, 333, 63],
  fall3: [SHEET.PLATFORMS, 1010, 467, 435, 144, 28, 12, 415, 69],
  rock0: [SHEET.PLATFORMS, 6, 740, 139, 126],
  rock1: [SHEET.PLATFORMS, 164, 766, 112, 98],
  rock2: [SHEET.PLATFORMS, 289, 767, 118, 97],
  rock3: [SHEET.PLATFORMS, 423, 758, 151, 105],
  rock4: [SHEET.PLATFORMS, 595, 767, 121, 97],
  rock5: [SHEET.PLATFORMS, 746, 769, 115, 95],
  rock6: [SHEET.PLATFORMS, 878, 769, 115, 92],
  rock7: [SHEET.PLATFORMS, 1011, 771, 118, 90],
  rock8: [SHEET.PLATFORMS, 1145, 763, 117, 102],
  rock9: [SHEET.PLATFORMS, 1282, 773, 138, 92],
  rock10: [SHEET.PLATFORMS, 10, 976, 52, 40],
  rock11: [SHEET.PLATFORMS, 17, 871, 119, 89],
  rock12: [SHEET.PLATFORMS, 81, 963, 75, 56],
  rock13: [SHEET.PLATFORMS, 155, 881, 84, 66],
  rock14: [SHEET.PLATFORMS, 172, 957, 70, 62],
  rock15: [SHEET.PLATFORMS, 255, 886, 101, 62],
  rock16: [SHEET.PLATFORMS, 263, 960, 71, 58],
  rock17: [SHEET.PLATFORMS, 351, 969, 82, 48],
  rock18: [SHEET.PLATFORMS, 372, 873, 103, 78],
  rock19: [SHEET.PLATFORMS, 454, 966, 75, 52],
  rock20: [SHEET.PLATFORMS, 492, 878, 95, 73],
  rock21: [SHEET.PLATFORMS, 547, 960, 65, 57],
  rock22: [SHEET.PLATFORMS, 602, 881, 84, 72],
  rock23: [SHEET.PLATFORMS, 634, 967, 70, 53],
  rock24: [SHEET.PLATFORMS, 702, 881, 96, 70],
  rock25: [SHEET.PLATFORMS, 717, 964, 78, 54],
  rock26: [SHEET.PLATFORMS, 814, 962, 70, 56],
  rock27: [SHEET.PLATFORMS, 815, 879, 81, 68],
  rock28: [SHEET.PLATFORMS, 903, 974, 73, 42],
  rock29: [SHEET.PLATFORMS, 912, 870, 88, 83],
  rock30: [SHEET.PLATFORMS, 998, 960, 83, 55],
  rock31: [SHEET.PLATFORMS, 1015, 881, 90, 66],
  rock32: [SHEET.PLATFORMS, 1099, 966, 66, 49],
  rock33: [SHEET.PLATFORMS, 1122, 881, 77, 67],
  rock34: [SHEET.PLATFORMS, 1182, 963, 79, 52],
  rock35: [SHEET.PLATFORMS, 1218, 876, 106, 70],
  rock36: [SHEET.PLATFORMS, 1277, 962, 72, 54],
  rock37: [SHEET.PLATFORMS, 1342, 885, 81, 62],
  rock38: [SHEET.PLATFORMS, 1367, 964, 69, 49],
  rock39: [SHEET.PLATFORMS, 13, 1032, 57, 42],
  rock40: [SHEET.PLATFORMS, 95, 1028, 61, 47],
  rock41: [SHEET.PLATFORMS, 186, 1028, 61, 47],
  rock42: [SHEET.PLATFORMS, 270, 1029, 55, 45],
  rock43: [SHEET.PLATFORMS, 344, 1030, 51, 42],
  rock44: [SHEET.PLATFORMS, 416, 1026, 53, 47],
  rock45: [SHEET.PLATFORMS, 492, 1028, 56, 44],
  rock46: [SHEET.PLATFORMS, 571, 1027, 61, 45],
  rock47: [SHEET.PLATFORMS, 654, 1033, 46, 36],
  rock48: [SHEET.PLATFORMS, 723, 1030, 54, 43],
  rock49: [SHEET.PLATFORMS, 799, 1036, 41, 33],
  rock50: [SHEET.PLATFORMS, 858, 1029, 50, 43],
  rock51: [SHEET.PLATFORMS, 930, 1033, 45, 36],
  rock52: [SHEET.PLATFORMS, 995, 1034, 45, 35],
  rock53: [SHEET.PLATFORMS, 1061, 1034, 47, 35],
  rock54: [SHEET.PLATFORMS, 1130, 1034, 44, 34],
  rock55: [SHEET.PLATFORMS, 1195, 1033, 52, 36],
  rock56: [SHEET.PLATFORMS, 1269, 1035, 45, 33],
  rock57: [SHEET.PLATFORMS, 1337, 1035, 39, 32],
  ground0: [SHEET.GROUND_STONES, 198, 21, 47, 34],
  ground1: [SHEET.GROUND_STONES, 386, 23, 40, 33],
  ground2: [SHEET.GROUND_STONES, 770, 21, 46, 37],
  ground3: [SHEET.GROUND_STONES, 1042, 20, 40, 35],
  ground4: [SHEET.GROUND_STONES, 1272, 15, 51, 38],
  ground5: [SHEET.GROUND_STONES, 1348, 21, 50, 34],
  ground6: [SHEET.GROUND_STONES, 1429, 19, 44, 33],
  ground7: [SHEET.GROUND_STONES, 1506, 14, 59, 44],
  ground8: [SHEET.GROUND_STONES, 1588, 13, 59, 45],
  ground9: [SHEET.GROUND_STONES, 26, 76, 73, 47],
  ground10: [SHEET.GROUND_STONES, 118, 79, 50, 44],
  ground11: [SHEET.GROUND_STONES, 205, 78, 57, 48],
  ground12: [SHEET.GROUND_STONES, 285, 76, 83, 57],
  ground13: [SHEET.GROUND_STONES, 394, 81, 60, 38],
  ground14: [SHEET.GROUND_STONES, 482, 81, 58, 42],
  ground15: [SHEET.GROUND_STONES, 510, 18, 49, 43],
  ground16: [SHEET.GROUND_STONES, 564, 78, 53, 42],
  ground17: [SHEET.GROUND_STONES, 658, 78, 57, 45],
  ground18: [SHEET.GROUND_STONES, 738, 78, 62, 48],
  ground19: [SHEET.GROUND_STONES, 825, 78, 62, 45],
  ground20: [SHEET.GROUND_STONES, 918, 75, 85, 48],
  ground21: [SHEET.GROUND_STONES, 1027, 75, 89, 59],
  ground22: [SHEET.GROUND_STONES, 1152, 76, 73, 58],
  ground23: [SHEET.GROUND_STONES, 1251, 72, 89, 60],
  ground24: [SHEET.GROUND_STONES, 1364, 78, 72, 44],
  ground25: [SHEET.GROUND_STONES, 1460, 77, 97, 57],
  ground26: [SHEET.GROUND_STONES, 1577, 79, 67, 48],
  ground27: [SHEET.GROUND_STONES, 16, 149, 108, 78],
  ground28: [SHEET.GROUND_STONES, 141, 148, 106, 80],
  ground29: [SHEET.GROUND_STONES, 264, 151, 95, 64],
  ground30: [SHEET.GROUND_STONES, 385, 149, 102, 79],
  ground31: [SHEET.GROUND_STONES, 511, 145, 93, 77],
  ground32: [SHEET.GROUND_STONES, 631, 143, 103, 73],
  ground33: [SHEET.GROUND_STONES, 752, 147, 106, 68],
  ground34: [SHEET.GROUND_STONES, 881, 143, 107, 67],
  ground35: [SHEET.GROUND_STONES, 1010, 151, 115, 64],
  ground36: [SHEET.GROUND_STONES, 1141, 151, 114, 69],
  ground37: [SHEET.GROUND_STONES, 1280, 149, 106, 75],
  ground38: [SHEET.GROUND_STONES, 1409, 153, 97, 73],
  ground39: [SHEET.GROUND_STONES, 1524, 147, 132, 79],
  ground40: [SHEET.GROUND_STONES, 20, 249, 160, 94],
  ground41: [SHEET.GROUND_STONES, 205, 243, 174, 96],
  ground42: [SHEET.GROUND_STONES, 399, 247, 139, 93],
  ground43: [SHEET.GROUND_STONES, 550, 242, 193, 107],
  ground44: [SHEET.GROUND_STONES, 754, 230, 161, 116],
  ground45: [SHEET.GROUND_STONES, 930, 228, 150, 131],
  ground46: [SHEET.GROUND_STONES, 1099, 240, 179, 107],
  ground47: [SHEET.GROUND_STONES, 1285, 239, 165, 108],
  ground48: [SHEET.GROUND_STONES, 1465, 242, 176, 107],
  ground49: [SHEET.GROUND_STONES, 14, 363, 213, 108],
  ground50: [SHEET.GROUND_STONES, 256, 364, 167, 99],
  ground51: [SHEET.GROUND_STONES, 448, 370, 177, 93],
  ground52: [SHEET.GROUND_STONES, 656, 364, 165, 92],
  ground53: [SHEET.GROUND_STONES, 850, 362, 167, 97],
  ground54: [SHEET.GROUND_STONES, 1041, 375, 177, 86],
  ground55: [SHEET.GROUND_STONES, 1244, 363, 164, 98],
  ground56: [SHEET.GROUND_STONES, 1428, 368, 234, 101],
  ground57: [SHEET.GROUND_STONES, 11, 480, 234, 151],
  ground58: [SHEET.GROUND_STONES, 255, 474, 247, 158],
  ground59: [SHEET.GROUND_STONES, 533, 467, 254, 168],
  ground60: [SHEET.GROUND_STONES, 816, 473, 264, 147],
  ground61: [SHEET.GROUND_STONES, 1114, 474, 267, 157],
  ground62: [SHEET.GROUND_STONES, 1403, 473, 261, 175],
  ground63: [SHEET.GROUND_STONES, 7, 636, 329, 260],
  ground64: [SHEET.GROUND_STONES, 338, 655, 281, 237],
  ground65: [SHEET.GROUND_STONES, 633, 621, 355, 282],
  ground66: [SHEET.GROUND_STONES, 990, 653, 289, 231],
  ground67: [SHEET.GROUND_STONES, 1269, 671, 392, 218],
  grow0: [SHEET.PLANTS, 9, 60, 128, 76],
  grow1: [SHEET.PLANTS, 139, 38, 105, 95],
  grow2: [SHEET.PLANTS, 242, 21, 177, 114],
  grow3: [SHEET.PLANTS, 423, 50, 120, 85],
  grow4: [SHEET.PLANTS, 549, 14, 189, 118],
  grow5: [SHEET.PLANTS, 738, 9, 115, 127],
  grow6: [SHEET.PLANTS, 847, 72, 78, 61],
  grow7: [SHEET.PLANTS, 919, 27, 80, 104],
  grow8: [SHEET.PLANTS, 995, 17, 143, 116],
  grow9: [SHEET.PLANTS, 1139, 29, 149, 104],
  grow10: [SHEET.PLANTS, 1282, 8, 129, 123],
  grow11: [SHEET.PLANTS, 1408, 39, 117, 88],
  shroom0: [SHEET.PLANTS, 14, 168, 83, 92],
  shroom1: [SHEET.PLANTS, 107, 168, 133, 92],
  shroom2: [SHEET.PLANTS, 252, 165, 156, 97],
  shroom3: [SHEET.PLANTS, 422, 167, 96, 93],
  shroom4: [SHEET.PLANTS, 528, 175, 114, 87],
  shroom5: [SHEET.PLANTS, 655, 167, 120, 96],
  shroom6: [SHEET.PLANTS, 786, 188, 95, 73],
  shroom7: [SHEET.PLANTS, 878, 156, 149, 105],
  shroom8: [SHEET.PLANTS, 1021, 176, 35, 82],
  shroom9: [SHEET.PLANTS, 1069, 155, 81, 107],
  shroom10: [SHEET.PLANTS, 1161, 155, 127, 105],
  shroom11: [SHEET.PLANTS, 1292, 167, 117, 94],
  shroom12: [SHEET.PLANTS, 1418, 175, 107, 83],
  side0: [SHEET.PLANTS, 11, 292, 119, 155],
  side1: [SHEET.PLANTS, 152, 285, 121, 157],
  side2: [SHEET.PLANTS, 287, 284, 114, 166],
  side3: [SHEET.PLANTS, 408, 288, 149, 159],
  side4: [SHEET.PLANTS, 569, 285, 122, 177],
  side5: [SHEET.PLANTS, 704, 288, 114, 164],
  side6: [SHEET.PLANTS, 839, 289, 144, 153],
  side7: [SHEET.PLANTS, 998, 282, 109, 167],
  side8: [SHEET.PLANTS, 1126, 291, 117, 142],
  side9: [SHEET.PLANTS, 1255, 281, 150, 171],
  side10: [SHEET.PLANTS, 1418, 289, 108, 163],
  hang0: [SHEET.PLANTS, 14, 479, 130, 216],
  hang1: [SHEET.PLANTS, 157, 475, 112, 225],
  hang2: [SHEET.PLANTS, 280, 475, 93, 233],
  hang3: [SHEET.PLANTS, 385, 479, 132, 216],
  hang4: [SHEET.PLANTS, 520, 479, 124, 224],
  hang5: [SHEET.PLANTS, 647, 477, 125, 221],
  hang6: [SHEET.PLANTS, 787, 477, 124, 200],
  hang7: [SHEET.PLANTS, 926, 480, 109, 221],
  hang8: [SHEET.PLANTS, 1056, 480, 88, 227],
  hang9: [SHEET.PLANTS, 1159, 475, 93, 233],
  hang10: [SHEET.PLANTS, 1266, 477, 115, 212],
  hang11: [SHEET.PLANTS, 1391, 479, 133, 226],
  bush0: [SHEET.PLANTS, 10, 708, 114, 118],
  bush1: [SHEET.PLANTS, 136, 716, 113, 111],
  bush2: [SHEET.PLANTS, 260, 702, 90, 121],
  bush3: [SHEET.PLANTS, 364, 705, 117, 136],
  bush4: [SHEET.PLANTS, 501, 711, 105, 116],
  bush5: [SHEET.PLANTS, 615, 713, 129, 118],
  bush6: [SHEET.PLANTS, 753, 710, 115, 117],
  bush7: [SHEET.PLANTS, 878, 716, 105, 110],
  bush8: [SHEET.PLANTS, 996, 710, 87, 114],
  bush9: [SHEET.PLANTS, 1086, 719, 141, 106],
  bush10: [SHEET.PLANTS, 1230, 719, 82, 99],
  bush11: [SHEET.PLANTS, 1318, 710, 120, 115],
  bush12: [SHEET.PLANTS, 1449, 717, 81, 112],
  sprout0: [SHEET.PLANTS, 16, 873, 65, 67],
  sprout1: [SHEET.PLANTS, 80, 862, 76, 75],
  sprout2: [SHEET.PLANTS, 159, 873, 42, 63],
  sprout3: [SHEET.PLANTS, 213, 873, 71, 63],
  sprout4: [SHEET.PLANTS, 291, 870, 61, 69],
  sprout5: [SHEET.PLANTS, 357, 864, 94, 75],
  sprout6: [SHEET.PLANTS, 462, 873, 98, 59],
  sprout7: [SHEET.PLANTS, 570, 864, 60, 72],
  sprout8: [SHEET.PLANTS, 636, 866, 75, 64],
  sprout9: [SHEET.PLANTS, 722, 868, 89, 64],
  sprout10: [SHEET.PLANTS, 821, 860, 81, 78],
  sprout11: [SHEET.PLANTS, 908, 877, 80, 59],
  sprout12: [SHEET.PLANTS, 990, 876, 62, 60],
  sprout13: [SHEET.PLANTS, 1060, 864, 85, 63],
  sprout14: [SHEET.PLANTS, 1157, 865, 58, 71],
  sprout15: [SHEET.PLANTS, 1228, 868, 49, 68],
  sprout16: [SHEET.PLANTS, 1298, 863, 70, 74],
  sprout17: [SHEET.PLANTS, 1378, 874, 83, 55],
  sprout18: [SHEET.PLANTS, 1469, 851, 54, 85],
  tiny0: [SHEET.PLANTS, 16, 957, 51, 52],
  tiny1: [SHEET.PLANTS, 81, 960, 51, 50],
  tiny2: [SHEET.PLANTS, 153, 960, 61, 51],
  tiny3: [SHEET.PLANTS, 228, 964, 61, 42],
  tiny4: [SHEET.PLANTS, 306, 963, 46, 44],
  tiny5: [SHEET.PLANTS, 368, 957, 52, 53],
  tiny6: [SHEET.PLANTS, 433, 968, 62, 41],
  tiny7: [SHEET.PLANTS, 509, 966, 43, 38],
  tiny8: [SHEET.PLANTS, 567, 956, 52, 56],
  tiny9: [SHEET.PLANTS, 633, 962, 44, 47],
  tiny10: [SHEET.PLANTS, 686, 966, 38, 42],
  tiny11: [SHEET.PLANTS, 733, 959, 62, 51],
  tiny12: [SHEET.PLANTS, 815, 958, 42, 48],
  tiny13: [SHEET.PLANTS, 872, 967, 28, 40],
  tiny14: [SHEET.PLANTS, 920, 962, 33, 46],
  tiny15: [SHEET.PLANTS, 969, 961, 55, 43],
  tiny16: [SHEET.PLANTS, 1038, 962, 54, 44],
  tiny17: [SHEET.PLANTS, 1104, 964, 68, 39],
  tiny18: [SHEET.PLANTS, 1176, 958, 66, 51],
  tiny19: [SHEET.PLANTS, 1252, 957, 43, 52],
  tiny20: [SHEET.PLANTS, 1311, 966, 38, 40],
  tiny21: [SHEET.PLANTS, 1357, 964, 37, 41],
  tiny22: [SHEET.PLANTS, 1410, 964, 43, 42],
  tiny23: [SHEET.PLANTS, 1466, 963, 55, 43]
}
const sheets = new Map()
const pieces = new Map()
let loading = null

//
// Platform pieces by kind (flat slabs, chunky blocks, rising and falling
// slopes, platforms with hanging drips), the loose stones of the platforms
// sheet and the forest's ground stones. Plants are named by how they grow:
// up from the ground (grow, shroom, bush, sprout, tiny), out of a wall
// sideways (side), hanging down (hang).
//
export const FLATS = pieceNames('flat')
export const BLOCKS = pieceNames('block')
export const RISES = pieceNames('rise')
export const FALLS = pieceNames('fall')
export const CONES = pieceNames('cone')
export const ROCKS = pieceNames('rock')
export const GROUND_ROCKS = pieceNames('ground')

/**
 * Loads every sheet (once per page).
 * @returns {Promise<void>}
 */
export function load() {
  const keys = Object.keys(SHEET_URLS)
  loading ??= Promise.all(keys.map(key => loadPictureImage(SHEET_URLS[key]))).then(images => {
    images.forEach((img, i) => img && sheets.set(keys[i], img))
  })
  return loading
}

/**
 * True once every sheet is loaded.
 * @returns {boolean}
 */
export function isLoaded() {
  return sheets.size === Object.keys(SHEET_URLS).length
}

/**
 * A platform piece's rim in its own pixels: its left end (rimL, top) and
 * right end (rimR, topR — the same as top on a flat one).
 * @param {string} name - PIECES key of a platform
 * @returns {{w: number, h: number, top: number, rimL: number, rimR: number, topR: number}}
 */
export function platformRim(name) {
  const [, , , w, h, top, rimL, rimR, topR] = PIECES[name]
  return { w, h, top, rimL, rimR, topR: topR ?? top }
}

/**
 * Draws a piece with its top-left at x / y, scaled, optionally mirrored.
 * @param {CanvasRenderingContext2D} ctx - Target context (world-translated)
 * @param {string} name - PIECES key
 * @param {number} x - Left X
 * @param {number} y - Top Y
 * @param {number} scale - World px per sheet px
 * @param {boolean} [flip=false] - Mirror horizontally (in place)
 */
export function drawScaled(ctx, name, x, y, scale, flip = false) {
  drawStretched(ctx, name, x, y, scale, scale, flip)
}

/**
 * Draws a piece with its top-left at x / y, scaled apart on each axis (a
 * slope fitted to a rise), optionally mirrored.
 * @param {CanvasRenderingContext2D} ctx - Target context (world-translated)
 * @param {string} name - PIECES key
 * @param {number} x - Left X
 * @param {number} y - Top Y
 * @param {number} sx - Horizontal scale
 * @param {number} sy - Vertical scale
 * @param {boolean} [flip=false] - Mirror horizontally (in place)
 */
export function drawStretched(ctx, name, x, y, sx, sy, flip = false) {
  const src = piece(name)
  if (!src) return
  const w = src.width * sx
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(flip ? x + w : x, y)
  flip && ctx.scale(-1, 1)
  ctx.drawImage(src, 0, 0, w, src.height * sy)
  ctx.restore()
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
  remapAlpha(image.data)
  ctx.putImageData(image, 0, 0)
  pieces.set(name, canvas)
  return canvas
}

/**
 * A piece's own height on its sheet (the most it may be drawn at).
 * @param {string} name - PIECES key
 * @returns {number}
 */
export function naturalHeight(name) {
  return PIECES[name]?.[4] ?? 0
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
 * @param {number} [opts.angle=0] - Turn round the piece's centre (radians)
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
  if (opts.angle) {
    ctx.translate(0, h / 2)
    ctx.rotate(opts.angle)
    ctx.translate(0, -h / 2)
  }
  opts.flip && ctx.scale(-1, 1)
  ctx.drawImage(img, -w / 2, 0, w, h)
  ctx.restore()
}
//
// Haze and fringes out: alpha below ALPHA_LO gone, above ALPHA_HI solid.
//
function remapAlpha(data) {
  for (let i = 3; i < data.length; i += 4) {
    data[i] = Math.max(0, Math.min(BYTE_MAX, (data[i] - ALPHA_LO) * BYTE_MAX / (ALPHA_HI - ALPHA_LO)))
  }
}
function pieceNames(prefix) {
  return Object.keys(PIECES).filter(name => new RegExp(`^${prefix}\\d+$`).test(name))
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
