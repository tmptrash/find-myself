import { loadPictureImage } from '../../forest/utils/forest-picture.js'
import { loadForestGroundElements, forestBuriedElements } from '../../forest/utils/forest-ground-element.js'
//
// The cave's painted art cut into named pieces. The soil the cave is built
// of: ground_block.png (a block of soil, tiled), ground_top.png (two long
// top strips the hero walks on), corners.png (the soil's top, side and
// bottom edges, its corners, a rising and a falling top), ground_stones.png
// and stones.png (stones laid into the soil), joints_ground_stones.png
// (arcs that bed a ground stone, heaps at its foot) and joints.png (the
// same for the stones of stones.png: heaps, long beds, and loose wedges
// and patches); plants.png (plants growing up, out of a wall sideways and
// hanging down) and plants2.png (more of each kind: upB, sideB, hangB,
// sproutB, tinyB), roots.png (roots hanging from soil, their strands
// drawn together at each one's top: root), small_plants.png (a kit of
// greenery without soil, to be put together on the platforms: moss
// cushions kitMoss, leafy plants and grass tufts kitLeaf, hanging vines
// kitVine, tiny sprouts kitSprout),
// platforms.png (short soil platforms hanging in the
// air), runner.png (the runner insect taken apart: its body, head, tail
// leaf, two feelers, and per pair of legs a hip ball, a thigh, a shin and
// a clawed foot, rear pair first; its neck is a second cut of a shin),
// mushroom.png (the lantern mushroom, its cap and stem full of holes),
// strider.png (the water strider taken apart: its body under its wings,
// its head with one big eye, a feeler — the sheet's right one, the left
// one is its mirror —, a bent femur and a straight tibia), creature.png
// (the lake's giant taken apart: its body — bent as a mesh — with the
// sockets of its paddles, and the front and the hind paddle); plus the
// forest's buried elements
// (bones, fossils, shells: elements_ground.png, cut by the forest).
//
// The sheets are not clean, so each is prepared as it is cut: faint haze
// and fringes at low alpha are remapped away (below lo gone, above hi
// solid), the soil sheets' colour is pulled to the block's (their own
// soil is lighter), the white haze corners.png fades into is turned into
// transparency, and a stone or a patch keeps only its own island (a
// neighbour reaching into its box is cleared). Pieces are plain canvases,
// cached per page (they do not belong to a Kaplay instance); the bakes
// that use them carry the grain.
//
const SHEET = {
  PLANTS: 'plants',
  PLANTS2: 'plants2',
  ROOTS: 'roots',
  SMALL: 'smallPlants',
  ROCKS: 'rocks',
  GROUND_STONES: 'groundStones',
  JOINTS: 'joints',
  GROUND_JOINTS: 'groundJoints',
  CORNERS: 'corners',
  FLOATS: 'floats',
  TOP: 'top',
  RUNNER: 'runner',
  MUSHROOM: 'mushroom',
  STRIDER: 'strider',
  CREATURE: 'creature'
}
//
// Per sheet: its file, its alpha remap [lo, hi], whether its colour is
// pulled to the soil block's, whether its white haze is turned into
// transparency (`dewhite`: the outer band in px, see OUTER_SIDES), how much its fades are shortened (alpha to that power: a
// long soft fade over the textured block reads as a flat veil), and the
// island a piece keeps: solid from `alpha` up, with `keep` px of soft
// edge round it. The greenery kit's plants have leaves standing apart
// from their stems: a kit piece keeps all within SMALL_KEEP px of its
// biggest island (as it was cut out of the sheet), not only its soft edge.
//
const SMALL_KEEP = 14
const SHEETS = {
  [SHEET.PLANTS]: { url: 'cave0/plants.png', alpha: [40, 200] },
  [SHEET.PLANTS2]: { url: 'cave0/plants2.png', alpha: [40, 200], isolate: { alpha: 20, keep: 4 } },
  [SHEET.ROOTS]: { url: 'cave0/roots.png', alpha: [40, 200], isolate: { alpha: 20, keep: 4 } },
  [SHEET.SMALL]: { url: 'cave0/small_plants.png', alpha: [40, 200], isolate: { alpha: 20, keep: SMALL_KEEP } },
  [SHEET.ROCKS]: { url: 'cave0/stones.png', alpha: [40, 200], isolate: { alpha: 128, keep: 2 } },
  [SHEET.GROUND_STONES]: { url: 'cave0/ground_stones.png', alpha: [40, 200], isolate: { alpha: 128, keep: 2 } },
  [SHEET.JOINTS]: { url: 'cave0/joints.png', alpha: [6, 170], soil: true, isolate: { alpha: 100, keep: 8 } },
  [SHEET.GROUND_JOINTS]: { url: 'cave0/joints_ground_stones.png', alpha: [6, 170], soil: true, isolate: { alpha: 100, keep: 8 } },
  [SHEET.CORNERS]: { url: 'cave0/corners.png', soil: true, dewhite: 30, sharpen: 2.5 },
  [SHEET.FLOATS]: { url: 'cave0/platforms.png', alpha: [40, 200], isolate: { alpha: 128, keep: 2 } },
  [SHEET.TOP]: { url: 'cave0/ground_top.png', alpha: [6, 250], soil: true, dewhite: 170, sharpen: 3 },
  [SHEET.RUNNER]: { url: 'cave0/runner.png', alpha: [40, 200], isolate: { alpha: 128, keep: 2 } },
  [SHEET.MUSHROOM]: { url: 'cave0/mushroom.png', alpha: [40, 200] },
  [SHEET.STRIDER]: { url: 'cave0/strider.png', alpha: [40, 200], isolate: { alpha: 128, keep: 2 } },
  [SHEET.CREATURE]: { url: 'cave0/creature.png', alpha: [8, 240] }
}
const BLOCK_URL = 'cave0/ground_block.png'
const BYTE_MAX = 255
const HALF_SHARE = 0.5
const RGBA = 4
//
// Soil colour match: a sheet's soil is its opaque pixels darker than
// SOIL_LUM_MAX (every SAMPLE_STEP-th pixel read); its mean is pulled onto
// the block's mean.
//
const SOIL_ALPHA_MIN = 240
const SOIL_LUM_MAX = 130
const SAMPLE_STEP = 7
//
// White haze into transparency: a pixel is read as the sheet's soil mixed
// with white — its white share from how far its luminance lies above the
// soil's toward white. Within the sheet's outer band (px) of a piece's
// ragged outer sides (OUTER_SIDES) an opaque pixel (alpha from HAZE_ALPHA
// up) is the soil's own lit lump and is kept as it is, less and less so
// over OUTER_SOFT px past the band. The white is taken
// out of its colour (the share kept at least WHITE_KEEP) and it loses
// alpha by (1 - share × WHITE_ALPHA_GAIN)^WHITE_FADE_POW. The top strips'
// fades are lighter dust and are cleared the same way.
//
const HAZE_ALPHA = 240
const OUTER_SOFT = 30
const WHITE_FADE_POW = 3
const WHITE_ALPHA_GAIN = 2
const WHITE_KEEP = 0.15
const OUTER_SIDES = {
  top0: 't',
  top1: 't',
  edgeT: 't',
  edgeL: 'l',
  edgeR: 'r',
  edgeB: 'b',
  slopeUp: 'tr',
  slopeDown: 'tl',
  cornerTL: 'tl',
  cornerTR: 'tr',
  cornerBL: 'bl',
  cornerBR: 'br'
}
//
// A soil sheet's see-through pixels (its fades) are lighter dust over
// nothing; their colour goes toward the block's the more see-through they
// are: weight 1 - alpha^FADE_POW.
//
const FADE_POW = 2.5
//
// A pixel this opaque counts as solid in a piece's outline.
//
const SOLID_ALPHA = 128
const NEIGHBOURS = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
//
// Pieces: sheet, then x, y, w, h of the piece on its sheet (found by
// cutting the sheet's solid parts into islands). The soil edges: edgeT /
// edgeL / edgeR / edgeB have their ragged face on the top / left / right /
// bottom and fade into the soil on the other side; a corner (cornerTL...)
// is ragged on its two outer sides; slopeUp / slopeDown are top edges
// rising / falling to the right. Joints: jointMound (heaps), jointBed
// (long beds), jointWedge and jointPatch (loose) for stones.png;
// groundArc (arcs, bedding a stone upside down) and groundHeap (heaps)
// for ground_stones.png. float: short soil platforms of platforms.png
// that hang in the air (flat tops), narrowest first.
//
const PIECES = {
  top0: [SHEET.TOP, 5, 39, 2162, 306],
  top1: [SHEET.TOP, 5, 402, 2162, 302],
  edgeT: [SHEET.CORNERS, 17, 168, 373, 212],
  edgeL: [SHEET.CORNERS, 420, 75, 179, 378],
  edgeR: [SHEET.CORNERS, 737, 73, 181, 377],
  edgeB: [SHEET.CORNERS, 951, 254, 378, 206],
  slopeUp: [SHEET.CORNERS, 1362, 136, 397, 274],
  cornerTL: [SHEET.CORNERS, 24, 516, 311, 319],
  cornerTR: [SHEET.CORNERS, 381, 516, 287, 322],
  cornerBL: [SHEET.CORNERS, 702, 517, 294, 315],
  cornerBR: [SHEET.CORNERS, 1032, 523, 290, 307],
  slopeDown: [SHEET.CORNERS, 1355, 527, 404, 283],
  rock0: [SHEET.ROCKS, 18, 13, 289, 232],
  rock1: [SHEET.ROCKS, 349, 29, 133, 78],
  rock2: [SHEET.ROCKS, 468, 13, 392, 231],
  rock3: [SHEET.ROCKS, 887, 27, 175, 122],
  rock4: [SHEET.ROCKS, 1118, 12, 391, 245],
  rock5: [SHEET.ROCKS, 328, 129, 105, 70],
  rock6: [SHEET.ROCKS, 754, 173, 209, 114],
  rock7: [SHEET.ROCKS, 1023, 134, 69, 43],
  rock8: [SHEET.ROCKS, 205, 233, 160, 81],
  rock9: [SHEET.ROCKS, 372, 231, 160, 143],
  rock10: [SHEET.ROCKS, 977, 203, 173, 117],
  rock11: [SHEET.ROCKS, 20, 282, 162, 106],
  rock12: [SHEET.ROCKS, 547, 278, 155, 96],
  rock13: [SHEET.ROCKS, 1183, 241, 114, 91],
  rock14: [SHEET.ROCKS, 1298, 261, 220, 155],
  rock15: [SHEET.ROCKS, 136, 339, 211, 174],
  rock16: [SHEET.ROCKS, 583, 320, 384, 230],
  rock17: [SHEET.ROCKS, 856, 300, 97, 52],
  rock18: [SHEET.ROCKS, 1062, 344, 208, 168],
  rock19: [SHEET.ROCKS, 362, 401, 187, 104],
  rock20: [SHEET.ROCKS, 967, 362, 81, 49],
  rock21: [SHEET.ROCKS, 13, 422, 98, 91],
  rock22: [SHEET.ROCKS, 992, 461, 65, 47],
  rock23: [SHEET.ROCKS, 1239, 444, 283, 193],
  rock24: [SHEET.ROCKS, 272, 519, 181, 93],
  rock25: [SHEET.ROCKS, 490, 535, 92, 64],
  rock26: [SHEET.ROCKS, 797, 535, 259, 224],
  rock27: [SHEET.ROCKS, 37, 539, 189, 169],
  rock28: [SHEET.ROCKS, 563, 576, 227, 129],
  rock29: [SHEET.ROCKS, 1087, 542, 111, 59],
  rock30: [SHEET.ROCKS, 241, 636, 76, 69],
  rock31: [SHEET.ROCKS, 316, 627, 233, 150],
  rock32: [SHEET.ROCKS, 1072, 631, 201, 114],
  rock33: [SHEET.ROCKS, 1324, 637, 187, 129],
  rock34: [SHEET.ROCKS, 22, 744, 289, 234],
  rock35: [SHEET.ROCKS, 29, 736, 91, 58],
  rock36: [SHEET.ROCKS, 553, 731, 139, 96],
  rock37: [SHEET.ROCKS, 723, 720, 69, 55],
  rock38: [SHEET.ROCKS, 977, 750, 143, 93],
  rock39: [SHEET.ROCKS, 1222, 740, 99, 53],
  rock40: [SHEET.ROCKS, 338, 792, 74, 51],
  rock41: [SHEET.ROCKS, 344, 816, 236, 176],
  rock42: [SHEET.ROCKS, 606, 816, 203, 142],
  rock43: [SHEET.ROCKS, 829, 784, 110, 65],
  rock44: [SHEET.ROCKS, 1209, 784, 304, 215],
  rock45: [SHEET.ROCKS, 874, 867, 207, 132],
  rock46: [SHEET.ROCKS, 1097, 841, 128, 80],
  rock47: [SHEET.ROCKS, 249, 945, 78, 42],
  rock48: [SHEET.ROCKS, 772, 921, 74, 45],
  ground0: [SHEET.GROUND_STONES, 8, 9, 259, 202],
  ground1: [SHEET.GROUND_STONES, 268, 22, 79, 60],
  ground2: [SHEET.GROUND_STONES, 327, 23, 229, 138],
  ground3: [SHEET.GROUND_STONES, 573, 16, 54, 39],
  ground4: [SHEET.GROUND_STONES, 619, 24, 158, 164],
  ground5: [SHEET.GROUND_STONES, 797, 22, 53, 38],
  ground6: [SHEET.GROUND_STONES, 843, 9, 181, 136],
  ground7: [SHEET.GROUND_STONES, 1067, 21, 79, 65],
  ground8: [SHEET.GROUND_STONES, 1133, 10, 202, 170],
  ground9: [SHEET.GROUND_STONES, 1363, 23, 90, 62],
  ground10: [SHEET.GROUND_STONES, 1437, 14, 228, 162],
  ground11: [SHEET.GROUND_STONES, 1004, 111, 107, 70],
  ground12: [SHEET.GROUND_STONES, 281, 157, 52, 39],
  ground13: [SHEET.GROUND_STONES, 530, 121, 81, 62],
  ground14: [SHEET.GROUND_STONES, 784, 124, 45, 36],
  ground15: [SHEET.GROUND_STONES, 941, 143, 42, 30],
  ground16: [SHEET.GROUND_STONES, 1344, 123, 66, 44],
  ground17: [SHEET.GROUND_STONES, 18, 228, 62, 52],
  ground18: [SHEET.GROUND_STONES, 177, 214, 97, 66],
  ground19: [SHEET.GROUND_STONES, 303, 223, 69, 56],
  ground20: [SHEET.GROUND_STONES, 395, 187, 134, 95],
  ground21: [SHEET.GROUND_STONES, 575, 194, 89, 75],
  ground22: [SHEET.GROUND_STONES, 686, 216, 43, 35],
  ground23: [SHEET.GROUND_STONES, 751, 188, 80, 65],
  ground24: [SHEET.GROUND_STONES, 847, 179, 94, 79],
  ground25: [SHEET.GROUND_STONES, 958, 222, 50, 40],
  ground26: [SHEET.GROUND_STONES, 1032, 203, 94, 71],
  ground27: [SHEET.GROUND_STONES, 1149, 216, 65, 44],
  ground28: [SHEET.GROUND_STONES, 1227, 193, 124, 85],
  ground29: [SHEET.GROUND_STONES, 1374, 184, 141, 91],
  ground30: [SHEET.GROUND_STONES, 1525, 228, 39, 30],
  ground31: [SHEET.GROUND_STONES, 1582, 198, 77, 68],
  ground32: [SHEET.GROUND_STONES, 14, 291, 101, 99],
  ground33: [SHEET.GROUND_STONES, 102, 240, 48, 39],
  ground34: [SHEET.GROUND_STONES, 541, 258, 32, 30],
  ground35: [SHEET.GROUND_STONES, 669, 273, 179, 142],
  ground36: [SHEET.GROUND_STONES, 872, 281, 78, 68],
  ground37: [SHEET.GROUND_STONES, 971, 288, 31, 24],
  ground38: [SHEET.GROUND_STONES, 1125, 287, 97, 70],
  ground39: [SHEET.GROUND_STONES, 1332, 289, 40, 33],
  ground40: [SHEET.GROUND_STONES, 1368, 286, 184, 133],
  ground41: [SHEET.GROUND_STONES, 142, 300, 125, 98],
  ground42: [SHEET.GROUND_STONES, 285, 302, 38, 33],
  ground43: [SHEET.GROUND_STONES, 343, 300, 92, 65],
  ground44: [SHEET.GROUND_STONES, 465, 301, 77, 54],
  ground45: [SHEET.GROUND_STONES, 575, 298, 85, 59],
  ground46: [SHEET.GROUND_STONES, 994, 303, 99, 71],
  ground47: [SHEET.GROUND_STONES, 1255, 311, 56, 42],
  ground48: [SHEET.GROUND_STONES, 1582, 302, 76, 56],
  ground49: [SHEET.GROUND_STONES, 14, 414, 70, 51],
  ground50: [SHEET.GROUND_STONES, 105, 400, 45, 33],
  ground51: [SHEET.GROUND_STONES, 179, 417, 53, 35],
  ground52: [SHEET.GROUND_STONES, 271, 372, 116, 88],
  ground53: [SHEET.GROUND_STONES, 402, 402, 29, 27],
  ground54: [SHEET.GROUND_STONES, 449, 371, 130, 87],
  ground55: [SHEET.GROUND_STONES, 604, 392, 48, 36],
  ground56: [SHEET.GROUND_STONES, 844, 385, 47, 40],
  ground57: [SHEET.GROUND_STONES, 913, 370, 91, 74],
  ground58: [SHEET.GROUND_STONES, 1021, 399, 32, 24],
  ground59: [SHEET.GROUND_STONES, 1079, 373, 78, 61],
  ground60: [SHEET.GROUND_STONES, 1197, 375, 55, 38],
  ground61: [SHEET.GROUND_STONES, 1279, 379, 70, 58],
  ground62: [SHEET.GROUND_STONES, 1551, 386, 39, 32],
  ground63: [SHEET.GROUND_STONES, 1614, 399, 41, 31],
  ground64: [SHEET.GROUND_STONES, 63, 468, 142, 101],
  ground65: [SHEET.GROUND_STONES, 225, 469, 75, 61],
  ground66: [SHEET.GROUND_STONES, 333, 466, 94, 58],
  ground67: [SHEET.GROUND_STONES, 528, 464, 106, 84],
  ground68: [SHEET.GROUND_STONES, 648, 445, 67, 49],
  ground69: [SHEET.GROUND_STONES, 755, 421, 57, 37],
  ground70: [SHEET.GROUND_STONES, 812, 453, 133, 114],
  ground71: [SHEET.GROUND_STONES, 975, 455, 100, 66],
  ground72: [SHEET.GROUND_STONES, 1106, 458, 54, 41],
  ground73: [SHEET.GROUND_STONES, 1187, 439, 112, 97],
  ground74: [SHEET.GROUND_STONES, 1332, 450, 73, 51],
  ground75: [SHEET.GROUND_STONES, 1439, 423, 86, 63],
  ground76: [SHEET.GROUND_STONES, 1500, 456, 160, 133],
  ground77: [SHEET.GROUND_STONES, 16, 493, 37, 27],
  ground78: [SHEET.GROUND_STONES, 361, 530, 165, 110],
  ground79: [SHEET.GROUND_STONES, 455, 483, 45, 30],
  ground80: [SHEET.GROUND_STONES, 724, 491, 66, 41],
  ground81: [SHEET.GROUND_STONES, 1014, 533, 191, 110],
  ground82: [SHEET.GROUND_STONES, 1378, 518, 96, 77],
  ground83: [SHEET.GROUND_STONES, 14, 569, 47, 36],
  ground84: [SHEET.GROUND_STONES, 166, 565, 79, 53],
  ground85: [SHEET.GROUND_STONES, 275, 547, 67, 55],
  ground86: [SHEET.GROUND_STONES, 565, 578, 47, 31],
  ground87: [SHEET.GROUND_STONES, 631, 545, 120, 84],
  ground88: [SHEET.GROUND_STONES, 778, 562, 46, 31],
  ground89: [SHEET.GROUND_STONES, 901, 571, 37, 36],
  ground90: [SHEET.GROUND_STONES, 954, 550, 44, 35],
  ground91: [SHEET.GROUND_STONES, 1237, 577, 53, 38],
  ground92: [SHEET.GROUND_STONES, 1297, 539, 55, 36],
  ground93: [SHEET.GROUND_STONES, 13, 610, 191, 133],
  ground94: [SHEET.GROUND_STONES, 224, 631, 72, 51],
  ground95: [SHEET.GROUND_STONES, 335, 637, 44, 31],
  ground96: [SHEET.GROUND_STONES, 481, 631, 102, 76],
  ground97: [SHEET.GROUND_STONES, 614, 642, 37, 27],
  ground98: [SHEET.GROUND_STONES, 687, 654, 64, 60],
  ground99: [SHEET.GROUND_STONES, 779, 600, 129, 99],
  ground100: [SHEET.GROUND_STONES, 943, 625, 69, 48],
  ground101: [SHEET.GROUND_STONES, 1175, 638, 93, 66],
  ground102: [SHEET.GROUND_STONES, 1291, 614, 167, 116],
  ground103: [SHEET.GROUND_STONES, 1480, 611, 37, 28],
  ground104: [SHEET.GROUND_STONES, 1522, 626, 92, 78],
  ground105: [SHEET.GROUND_STONES, 1624, 599, 32, 25],
  ground106: [SHEET.GROUND_STONES, 288, 694, 62, 40],
  ground107: [SHEET.GROUND_STONES, 382, 671, 71, 57],
  ground108: [SHEET.GROUND_STONES, 595, 697, 67, 41],
  ground109: [SHEET.GROUND_STONES, 892, 691, 56, 38],
  ground110: [SHEET.GROUND_STONES, 973, 693, 93, 82],
  ground111: [SHEET.GROUND_STONES, 1080, 660, 62, 53],
  ground112: [SHEET.GROUND_STONES, 1461, 689, 56, 46],
  ground113: [SHEET.GROUND_STONES, 1625, 675, 36, 27],
  ground114: [SHEET.GROUND_STONES, 17, 749, 59, 38],
  ground115: [SHEET.GROUND_STONES, 54, 770, 138, 101],
  ground116: [SHEET.GROUND_STONES, 186, 744, 38, 32],
  ground117: [SHEET.GROUND_STONES, 239, 745, 77, 59],
  ground118: [SHEET.GROUND_STONES, 350, 748, 62, 38],
  ground119: [SHEET.GROUND_STONES, 448, 735, 113, 81],
  ground120: [SHEET.GROUND_STONES, 576, 765, 35, 36],
  ground121: [SHEET.GROUND_STONES, 639, 741, 152, 112],
  ground122: [SHEET.GROUND_STONES, 800, 727, 71, 53],
  ground123: [SHEET.GROUND_STONES, 876, 763, 69, 60],
  ground124: [SHEET.GROUND_STONES, 1080, 747, 50, 35],
  ground125: [SHEET.GROUND_STONES, 1150, 729, 146, 101],
  ground126: [SHEET.GROUND_STONES, 1326, 763, 54, 45],
  ground127: [SHEET.GROUND_STONES, 1406, 747, 64, 51],
  ground128: [SHEET.GROUND_STONES, 1474, 733, 182, 141],
  ground129: [SHEET.GROUND_STONES, 212, 824, 41, 28],
  ground130: [SHEET.GROUND_STONES, 246, 816, 150, 106],
  ground131: [SHEET.GROUND_STONES, 398, 808, 38, 28],
  ground132: [SHEET.GROUND_STONES, 527, 829, 86, 71],
  ground133: [SHEET.GROUND_STONES, 957, 811, 48, 35],
  ground134: [SHEET.GROUND_STONES, 1020, 803, 138, 115],
  ground135: [SHEET.GROUND_STONES, 1308, 837, 125, 82],
  ground136: [SHEET.GROUND_STONES, 13, 871, 60, 38],
  ground137: [SHEET.GROUND_STONES, 162, 880, 57, 40],
  ground138: [SHEET.GROUND_STONES, 427, 847, 71, 62],
  ground139: [SHEET.GROUND_STONES, 625, 874, 56, 46],
  ground140: [SHEET.GROUND_STONES, 727, 855, 93, 61],
  ground141: [SHEET.GROUND_STONES, 839, 863, 60, 46],
  ground142: [SHEET.GROUND_STONES, 918, 862, 75, 48],
  ground143: [SHEET.GROUND_STONES, 1181, 865, 71, 47],
  ground144: [SHEET.GROUND_STONES, 1264, 842, 37, 28],
  ground145: [SHEET.GROUND_STONES, 1455, 880, 36, 27],
  ground146: [SHEET.GROUND_STONES, 1598, 877, 50, 34],
  jointMound0: [SHEET.JOINTS, 11, 10, 257, 122],
  jointMound1: [SHEET.JOINTS, 287, 16, 180, 104],
  jointMound2: [SHEET.JOINTS, 485, 19, 188, 106],
  jointMound3: [SHEET.JOINTS, 697, 10, 199, 113],
  jointMound4: [SHEET.JOINTS, 909, 6, 227, 114],
  jointMound5: [SHEET.JOINTS, 1155, 22, 171, 99],
  jointMound6: [SHEET.JOINTS, 1379, 11, 208, 101],
  jointMound7: [SHEET.JOINTS, 1601, 25, 165, 86],
  jointMound8: [SHEET.JOINTS, 1226, 75, 250, 133],
  jointMound9: [SHEET.JOINTS, 23, 142, 161, 92],
  jointMound10: [SHEET.JOINTS, 196, 135, 151, 86],
  jointMound11: [SHEET.JOINTS, 365, 139, 145, 92],
  jointMound12: [SHEET.JOINTS, 530, 127, 144, 100],
  jointMound13: [SHEET.JOINTS, 688, 136, 104, 77],
  jointMound14: [SHEET.JOINTS, 811, 137, 172, 74],
  jointMound15: [SHEET.JOINTS, 1002, 135, 201, 85],
  jointMound16: [SHEET.JOINTS, 1496, 130, 244, 90],
  jointBed0: [SHEET.JOINTS, 563, 222, 358, 106],
  jointBed1: [SHEET.JOINTS, 1308, 222, 453, 104],
  jointBed2: [SHEET.JOINTS, 11, 251, 546, 115],
  jointBed3: [SHEET.JOINTS, 934, 250, 364, 109],
  jointBed4: [SHEET.JOINTS, 348, 337, 557, 117],
  jointBed5: [SHEET.JOINTS, 853, 346, 542, 127],
  jointBed6: [SHEET.JOINTS, 1409, 333, 349, 122],
  jointBed7: [SHEET.JOINTS, 12, 372, 372, 106],
  jointWedge0: [SHEET.JOINTS, 20, 492, 172, 112],
  jointWedge1: [SHEET.JOINTS, 178, 521, 166, 58],
  jointWedge2: [SHEET.JOINTS, 316, 483, 220, 129],
  jointWedge3: [SHEET.JOINTS, 500, 476, 151, 113],
  jointWedge4: [SHEET.JOINTS, 612, 524, 192, 74],
  jointWedge5: [SHEET.JOINTS, 779, 491, 225, 122],
  jointWedge6: [SHEET.JOINTS, 974, 492, 177, 115],
  jointWedge7: [SHEET.JOINTS, 1170, 495, 173, 114],
  jointWedge8: [SHEET.JOINTS, 1366, 476, 187, 126],
  jointWedge9: [SHEET.JOINTS, 1545, 481, 214, 105],
  jointPatch0: [SHEET.JOINTS, 14, 614, 380, 189],
  jointPatch1: [SHEET.JOINTS, 391, 645, 175, 74],
  jointPatch2: [SHEET.JOINTS, 498, 622, 299, 207],
  jointPatch3: [SHEET.JOINTS, 826, 630, 122, 67],
  jointPatch4: [SHEET.JOINTS, 941, 633, 299, 171],
  jointPatch5: [SHEET.JOINTS, 1204, 636, 73, 46],
  jointPatch6: [SHEET.JOINTS, 1285, 619, 234, 118],
  jointPatch7: [SHEET.JOINTS, 1585, 616, 176, 74],
  jointPatch8: [SHEET.JOINTS, 1437, 694, 320, 175],
  jointPatch9: [SHEET.JOINTS, 701, 724, 208, 127],
  jointPatch10: [SHEET.JOINTS, 1138, 754, 273, 113],
  jointPatch11: [SHEET.JOINTS, 19, 786, 101, 77],
  jointPatch12: [SHEET.JOINTS, 135, 828, 55, 46],
  jointPatch13: [SHEET.JOINTS, 200, 815, 79, 57],
  jointPatch14: [SHEET.JOINTS, 337, 779, 169, 81],
  jointPatch15: [SHEET.JOINTS, 468, 819, 79, 54],
  jointPatch16: [SHEET.JOINTS, 896, 803, 103, 64],
  jointPatch17: [SHEET.JOINTS, 1645, 815, 103, 58],
  groundArc0: [SHEET.GROUND_JOINTS, 31, 15, 88, 35],
  groundArc1: [SHEET.GROUND_JOINTS, 144, 17, 75, 31],
  groundArc2: [SHEET.GROUND_JOINTS, 242, 17, 73, 36],
  groundArc3: [SHEET.GROUND_JOINTS, 331, 13, 73, 35],
  groundArc4: [SHEET.GROUND_JOINTS, 421, 15, 91, 39],
  groundArc5: [SHEET.GROUND_JOINTS, 531, 12, 110, 42],
  groundArc6: [SHEET.GROUND_JOINTS, 664, 12, 114, 44],
  groundArc7: [SHEET.GROUND_JOINTS, 796, 11, 103, 44],
  groundArc8: [SHEET.GROUND_JOINTS, 916, 10, 88, 40],
  groundArc9: [SHEET.GROUND_JOINTS, 1017, 8, 129, 55],
  groundArc10: [SHEET.GROUND_JOINTS, 1162, 8, 105, 63],
  groundArc11: [SHEET.GROUND_JOINTS, 1282, 9, 119, 46],
  groundArc12: [SHEET.GROUND_JOINTS, 1417, 7, 100, 51],
  groundArc13: [SHEET.GROUND_JOINTS, 1548, 10, 113, 49],
  groundArc14: [SHEET.GROUND_JOINTS, 1677, 8, 95, 55],
  groundArc15: [SHEET.GROUND_JOINTS, 1789, 8, 110, 50],
  groundArc16: [SHEET.GROUND_JOINTS, 17, 88, 58, 33],
  groundArc17: [SHEET.GROUND_JOINTS, 92, 78, 85, 42],
  groundArc18: [SHEET.GROUND_JOINTS, 191, 75, 93, 45],
  groundArc19: [SHEET.GROUND_JOINTS, 300, 72, 106, 54],
  groundArc20: [SHEET.GROUND_JOINTS, 422, 74, 111, 48],
  groundArc21: [SHEET.GROUND_JOINTS, 549, 75, 109, 48],
  groundArc22: [SHEET.GROUND_JOINTS, 676, 72, 127, 54],
  groundArc23: [SHEET.GROUND_JOINTS, 817, 73, 153, 60],
  groundArc24: [SHEET.GROUND_JOINTS, 986, 75, 140, 51],
  groundArc25: [SHEET.GROUND_JOINTS, 1153, 80, 125, 44],
  groundArc26: [SHEET.GROUND_JOINTS, 1295, 72, 136, 59],
  groundArc27: [SHEET.GROUND_JOINTS, 1449, 71, 139, 58],
  groundArc28: [SHEET.GROUND_JOINTS, 1619, 79, 134, 45],
  groundArc29: [SHEET.GROUND_JOINTS, 1774, 77, 123, 51],
  groundArc30: [SHEET.GROUND_JOINTS, 15, 148, 116, 53],
  groundArc31: [SHEET.GROUND_JOINTS, 147, 149, 103, 52],
  groundArc32: [SHEET.GROUND_JOINTS, 264, 149, 110, 51],
  groundArc33: [SHEET.GROUND_JOINTS, 392, 149, 123, 53],
  groundArc34: [SHEET.GROUND_JOINTS, 531, 149, 126, 52],
  groundArc35: [SHEET.GROUND_JOINTS, 673, 151, 131, 51],
  groundArc36: [SHEET.GROUND_JOINTS, 823, 142, 163, 70],
  groundArc37: [SHEET.GROUND_JOINTS, 999, 146, 149, 67],
  groundArc38: [SHEET.GROUND_JOINTS, 1165, 153, 154, 61],
  groundArc39: [SHEET.GROUND_JOINTS, 1333, 147, 177, 64],
  groundArc40: [SHEET.GROUND_JOINTS, 1525, 149, 175, 64],
  groundArc41: [SHEET.GROUND_JOINTS, 1713, 148, 184, 66],
  groundArc42: [SHEET.GROUND_JOINTS, 14, 228, 179, 69],
  groundArc43: [SHEET.GROUND_JOINTS, 390, 228, 179, 77],
  groundArc44: [SHEET.GROUND_JOINTS, 586, 224, 201, 89],
  groundArc45: [SHEET.GROUND_JOINTS, 808, 217, 206, 98],
  groundArc46: [SHEET.GROUND_JOINTS, 1033, 224, 172, 103],
  groundArc47: [SHEET.GROUND_JOINTS, 1599, 229, 155, 77],
  groundArc48: [SHEET.GROUND_JOINTS, 1772, 221, 134, 95],
  groundArc49: [SHEET.GROUND_JOINTS, 212, 236, 160, 61],
  groundArc50: [SHEET.GROUND_JOINTS, 1219, 234, 143, 83],
  groundArc51: [SHEET.GROUND_JOINTS, 1378, 237, 204, 63],
  groundArc52: [SHEET.GROUND_JOINTS, 14, 322, 109, 72],
  groundArc53: [SHEET.GROUND_JOINTS, 124, 329, 149, 63],
  groundArc54: [SHEET.GROUND_JOINTS, 290, 329, 150, 64],
  groundArc55: [SHEET.GROUND_JOINTS, 457, 326, 194, 84],
  groundArc56: [SHEET.GROUND_JOINTS, 668, 325, 208, 84],
  groundArc57: [SHEET.GROUND_JOINTS, 894, 324, 266, 70],
  groundArc58: [SHEET.GROUND_JOINTS, 1188, 326, 219, 89],
  groundArc59: [SHEET.GROUND_JOINTS, 1421, 321, 150, 98],
  groundArc60: [SHEET.GROUND_JOINTS, 1587, 329, 159, 71],
  groundArc61: [SHEET.GROUND_JOINTS, 1761, 325, 143, 68],
  groundArc62: [SHEET.GROUND_JOINTS, 13, 411, 185, 96],
  groundArc63: [SHEET.GROUND_JOINTS, 213, 409, 193, 108],
  groundArc64: [SHEET.GROUND_JOINTS, 1698, 410, 207, 113],
  groundArc65: [SHEET.GROUND_JOINTS, 426, 419, 198, 78],
  groundArc66: [SHEET.GROUND_JOINTS, 642, 416, 218, 85],
  groundArc67: [SHEET.GROUND_JOINTS, 878, 417, 219, 102],
  groundArc68: [SHEET.GROUND_JOINTS, 1114, 415, 152, 105],
  groundArc69: [SHEET.GROUND_JOINTS, 1288, 433, 168, 65],
  groundArc70: [SHEET.GROUND_JOINTS, 1473, 418, 199, 103],
  groundArc71: [SHEET.GROUND_JOINTS, 13, 526, 192, 126],
  groundArc72: [SHEET.GROUND_JOINTS, 212, 510, 237, 157],
  groundArc73: [SHEET.GROUND_JOINTS, 462, 515, 214, 105],
  groundArc74: [SHEET.GROUND_JOINTS, 692, 518, 276, 132],
  groundArc75: [SHEET.GROUND_JOINTS, 960, 520, 276, 174],
  groundArc76: [SHEET.GROUND_JOINTS, 1238, 519, 276, 164],
  groundArc77: [SHEET.GROUND_JOINTS, 1531, 524, 202, 142],
  groundArc78: [SHEET.GROUND_JOINTS, 1732, 535, 175, 117],
  groundHeap0: [SHEET.GROUND_JOINTS, 534, 649, 212, 70],
  groundHeap1: [SHEET.GROUND_JOINTS, 17, 669, 185, 55],
  groundHeap2: [SHEET.GROUND_JOINTS, 226, 687, 97, 44],
  groundHeap3: [SHEET.GROUND_JOINTS, 347, 655, 161, 66],
  groundHeap4: [SHEET.GROUND_JOINTS, 776, 669, 168, 59],
  groundHeap5: [SHEET.GROUND_JOINTS, 1001, 677, 121, 52],
  groundHeap6: [SHEET.GROUND_JOINTS, 1139, 668, 129, 53],
  groundHeap7: [SHEET.GROUND_JOINTS, 1305, 667, 147, 54],
  groundHeap8: [SHEET.GROUND_JOINTS, 1477, 672, 141, 47],
  groundHeap9: [SHEET.GROUND_JOINTS, 1647, 673, 137, 47],
  groundHeap10: [SHEET.GROUND_JOINTS, 1791, 679, 103, 39],
  groundHeap11: [SHEET.GROUND_JOINTS, 17, 768, 61, 34],
  groundHeap12: [SHEET.GROUND_JOINTS, 90, 756, 87, 45],
  groundHeap13: [SHEET.GROUND_JOINTS, 188, 756, 100, 46],
  groundHeap14: [SHEET.GROUND_JOINTS, 302, 752, 142, 51],
  groundHeap15: [SHEET.GROUND_JOINTS, 468, 740, 199, 67],
  groundHeap16: [SHEET.GROUND_JOINTS, 691, 738, 213, 69],
  groundHeap17: [SHEET.GROUND_JOINTS, 927, 740, 222, 70],
  groundHeap18: [SHEET.GROUND_JOINTS, 1174, 742, 208, 67],
  groundHeap19: [SHEET.GROUND_JOINTS, 1413, 729, 254, 77],
  groundHeap20: [SHEET.GROUND_JOINTS, 1696, 743, 197, 62],
  float0: [SHEET.FLOATS, 1184, 712, 92, 82],
  float1: [SHEET.FLOATS, 26, 453, 104, 85],
  float2: [SHEET.FLOATS, 35, 30, 123, 95],
  float3: [SHEET.FLOATS, 231, 300, 124, 90],
  float4: [SHEET.FLOATS, 969, 517, 128, 72],
  float5: [SHEET.FLOATS, 611, 712, 133, 99],
  float6: [SHEET.FLOATS, 437, 504, 139, 83],
  float7: [SHEET.FLOATS, 1038, 23, 165, 108],
  float8: [SHEET.FLOATS, 198, 27, 171, 107],
  float9: [SHEET.FLOATS, 1206, 291, 177, 116],
  float10: [SHEET.FLOATS, 15, 306, 177, 123],
  float11: [SHEET.FLOATS, 1213, 563, 189, 122],
  float12: [SHEET.FLOATS, 586, 170, 192, 99],
  float13: [SHEET.FLOATS, 1093, 427, 197, 115],
  float14: [SHEET.FLOATS, 685, 302, 198, 95],
  float15: [SHEET.FLOATS, 371, 710, 199, 97],
  float16: [SHEET.FLOATS, 1111, 160, 203, 119],
  float17: [SHEET.FLOATS, 1434, 593, 221, 94],
  float18: [SHEET.FLOATS, 1430, 324, 224, 92],
  float19: [SHEET.FLOATS, 418, 292, 224, 123],
  upB0: [SHEET.PLANTS2, 2, 16, 172, 126],
  upB1: [SHEET.PLANTS2, 170, 26, 189, 118],
  upB2: [SHEET.PLANTS2, 360, 22, 148, 119],
  upB3: [SHEET.PLANTS2, 504, 15, 174, 126],
  upB4: [SHEET.PLANTS2, 681, 4, 183, 136],
  upB5: [SHEET.PLANTS2, 861, 12, 161, 129],
  upB6: [SHEET.PLANTS2, 1016, 33, 175, 109],
  upB7: [SHEET.PLANTS2, 1176, 7, 202, 144],
  upB8: [SHEET.PLANTS2, 1366, 21, 168, 112],
  upB9: [SHEET.PLANTS2, 4, 163, 155, 117],
  upB10: [SHEET.PLANTS2, 162, 164, 162, 114],
  upB11: [SHEET.PLANTS2, 331, 182, 133, 100],
  upB12: [SHEET.PLANTS2, 469, 159, 155, 122],
  upB13: [SHEET.PLANTS2, 625, 164, 139, 118],
  upB14: [SHEET.PLANTS2, 767, 167, 157, 114],
  upB15: [SHEET.PLANTS2, 926, 164, 134, 118],
  upB16: [SHEET.PLANTS2, 1071, 171, 137, 109],
  upB17: [SHEET.PLANTS2, 1212, 169, 157, 111],
  upB18: [SHEET.PLANTS2, 1368, 164, 164, 116],
  sideB0: [SHEET.PLANTS2, 3, 290, 146, 188],
  sideB1: [SHEET.PLANTS2, 152, 290, 121, 183],
  sideB2: [SHEET.PLANTS2, 276, 291, 122, 183],
  sideB3: [SHEET.PLANTS2, 408, 293, 141, 181],
  sideB4: [SHEET.PLANTS2, 561, 295, 131, 178],
  sideB5: [SHEET.PLANTS2, 702, 294, 120, 176],
  sideB6: [SHEET.PLANTS2, 839, 301, 147, 167],
  sideB7: [SHEET.PLANTS2, 996, 290, 135, 183],
  sideB8: [SHEET.PLANTS2, 1142, 292, 130, 180],
  sideB9: [SHEET.PLANTS2, 1279, 292, 137, 177],
  sideB10: [SHEET.PLANTS2, 1423, 295, 111, 173],
  hangB0: [SHEET.PLANTS2, 7, 483, 145, 225],
  hangB1: [SHEET.PLANTS2, 154, 481, 122, 237],
  hangB2: [SHEET.PLANTS2, 284, 479, 127, 238],
  hangB3: [SHEET.PLANTS2, 410, 483, 109, 226],
  hangB4: [SHEET.PLANTS2, 654, 478, 150, 228],
  hangB5: [SHEET.PLANTS2, 795, 481, 145, 237],
  hangB6: [SHEET.PLANTS2, 937, 481, 103, 229],
  hangB7: [SHEET.PLANTS2, 1045, 481, 119, 234],
  hangB8: [SHEET.PLANTS2, 1279, 485, 107, 227],
  hangB9: [SHEET.PLANTS2, 525, 484, 122, 239],
  hangB10: [SHEET.PLANTS2, 1167, 484, 107, 233],
  hangB11: [SHEET.PLANTS2, 1387, 484, 143, 234],
  upB19: [SHEET.PLANTS2, 4, 713, 147, 123],
  upB20: [SHEET.PLANTS2, 155, 716, 152, 119],
  upB21: [SHEET.PLANTS2, 309, 691, 119, 146],
  upB22: [SHEET.PLANTS2, 432, 721, 145, 115],
  upB23: [SHEET.PLANTS2, 581, 706, 128, 130],
  upB24: [SHEET.PLANTS2, 716, 697, 117, 138],
  upB25: [SHEET.PLANTS2, 838, 724, 134, 110],
  upB26: [SHEET.PLANTS2, 972, 699, 137, 137],
  upB27: [SHEET.PLANTS2, 1112, 712, 121, 123],
  upB28: [SHEET.PLANTS2, 1241, 714, 128, 122],
  upB29: [SHEET.PLANTS2, 1373, 722, 159, 116],
  sproutB0: [SHEET.PLANTS2, 7, 866, 93, 65],
  sproutB1: [SHEET.PLANTS2, 105, 861, 78, 71],
  sproutB2: [SHEET.PLANTS2, 190, 859, 79, 71],
  sproutB3: [SHEET.PLANTS2, 281, 860, 70, 75],
  sproutB4: [SHEET.PLANTS2, 361, 863, 101, 68],
  sproutB5: [SHEET.PLANTS2, 547, 865, 90, 67],
  sproutB6: [SHEET.PLANTS2, 645, 863, 85, 68],
  sproutB7: [SHEET.PLANTS2, 902, 865, 76, 64],
  sproutB8: [SHEET.PLANTS2, 986, 854, 74, 78],
  sproutB9: [SHEET.PLANTS2, 1068, 866, 75, 65],
  sproutB10: [SHEET.PLANTS2, 1151, 864, 94, 65],
  sproutB11: [SHEET.PLANTS2, 1258, 864, 73, 69],
  sproutB12: [SHEET.PLANTS2, 1349, 860, 65, 71],
  sproutB13: [SHEET.PLANTS2, 1423, 863, 101, 69],
  sproutB14: [SHEET.PLANTS2, 467, 873, 69, 59],
  sproutB15: [SHEET.PLANTS2, 736, 872, 87, 59],
  sproutB16: [SHEET.PLANTS2, 833, 871, 59, 61],
  tinyB0: [SHEET.PLANTS2, 7, 955, 64, 53],
  tinyB1: [SHEET.PLANTS2, 77, 957, 75, 52],
  tinyB2: [SHEET.PLANTS2, 165, 953, 58, 58],
  tinyB3: [SHEET.PLANTS2, 235, 961, 79, 48],
  tinyB4: [SHEET.PLANTS2, 323, 963, 51, 46],
  tinyB5: [SHEET.PLANTS2, 383, 958, 59, 51],
  tinyB6: [SHEET.PLANTS2, 452, 963, 49, 43],
  tinyB7: [SHEET.PLANTS2, 513, 954, 55, 56],
  tinyB8: [SHEET.PLANTS2, 580, 957, 63, 52],
  tinyB9: [SHEET.PLANTS2, 652, 954, 65, 55],
  tinyB10: [SHEET.PLANTS2, 726, 956, 56, 55],
  tinyB11: [SHEET.PLANTS2, 789, 963, 66, 46],
  tinyB12: [SHEET.PLANTS2, 863, 964, 60, 43],
  tinyB13: [SHEET.PLANTS2, 932, 958, 66, 50],
  tinyB14: [SHEET.PLANTS2, 1009, 954, 65, 58],
  tinyB15: [SHEET.PLANTS2, 1084, 958, 77, 51],
  tinyB16: [SHEET.PLANTS2, 1167, 963, 67, 46],
  tinyB17: [SHEET.PLANTS2, 1239, 958, 73, 52],
  tinyB18: [SHEET.PLANTS2, 1318, 956, 54, 55],
  tinyB19: [SHEET.PLANTS2, 1381, 956, 70, 54],
  tinyB20: [SHEET.PLANTS2, 1459, 955, 67, 55],
  root0: [SHEET.ROOTS, 9, 28, 192, 347],
  root1: [SHEET.ROOTS, 200, 30, 148, 331],
  root2: [SHEET.ROOTS, 358, 29, 181, 330],
  root3: [SHEET.ROOTS, 541, 30, 142, 340],
  root4: [SHEET.ROOTS, 690, 30, 183, 347],
  root5: [SHEET.ROOTS, 881, 29, 121, 344],
  root6: [SHEET.ROOTS, 1010, 28, 176, 339],
  root7: [SHEET.ROOTS, 1189, 30, 105, 343],
  root8: [SHEET.ROOTS, 1298, 31, 148, 342],
  root9: [SHEET.ROOTS, 8, 374, 115, 177],
  root10: [SHEET.ROOTS, 134, 373, 96, 193],
  root11: [SHEET.ROOTS, 246, 372, 121, 183],
  root12: [SHEET.ROOTS, 379, 371, 124, 191],
  root13: [SHEET.ROOTS, 517, 374, 106, 195],
  root14: [SHEET.ROOTS, 644, 373, 128, 203],
  root15: [SHEET.ROOTS, 776, 374, 145, 206],
  root16: [SHEET.ROOTS, 937, 374, 103, 197],
  root17: [SHEET.ROOTS, 1054, 372, 160, 192],
  root18: [SHEET.ROOTS, 1230, 376, 92, 194],
  root19: [SHEET.ROOTS, 1332, 381, 114, 181],
  root20: [SHEET.ROOTS, 10, 575, 134, 295],
  root21: [SHEET.ROOTS, 143, 578, 84, 234],
  root22: [SHEET.ROOTS, 211, 579, 124, 275],
  root23: [SHEET.ROOTS, 340, 577, 112, 290],
  root24: [SHEET.ROOTS, 450, 579, 142, 291],
  root25: [SHEET.ROOTS, 586, 577, 119, 280],
  root26: [SHEET.ROOTS, 705, 581, 174, 279],
  root27: [SHEET.ROOTS, 886, 577, 118, 282],
  root28: [SHEET.ROOTS, 1013, 581, 98, 249],
  root29: [SHEET.ROOTS, 1120, 577, 156, 293],
  root30: [SHEET.ROOTS, 1279, 579, 164, 311],
  root31: [SHEET.ROOTS, 9, 884, 78, 168],
  root32: [SHEET.ROOTS, 97, 882, 84, 184],
  root33: [SHEET.ROOTS, 194, 884, 80, 159],
  root34: [SHEET.ROOTS, 282, 881, 119, 194],
  root35: [SHEET.ROOTS, 413, 881, 101, 196],
  root36: [SHEET.ROOTS, 530, 882, 98, 191],
  root37: [SHEET.ROOTS, 648, 878, 95, 183],
  root38: [SHEET.ROOTS, 754, 883, 120, 193],
  root39: [SHEET.ROOTS, 887, 883, 112, 182],
  root40: [SHEET.ROOTS, 1017, 882, 92, 195],
  root41: [SHEET.ROOTS, 1126, 883, 107, 195],
  root42: [SHEET.ROOTS, 1248, 880, 94, 181],
  root43: [SHEET.ROOTS, 1350, 888, 94, 187],
kitMoss0: [SHEET.SMALL, 35, 18, 241, 91],
kitMoss0: [SHEET.SMALL, 33, 16, 245, 95],
  kitMoss1: [SHEET.SMALL, 295, 35, 169, 82],
  kitMoss2: [SHEET.SMALL, 480, 22, 161, 75],
  kitMoss3: [SHEET.SMALL, 657, 23, 184, 91],
  kitMoss4: [SHEET.SMALL, 861, 38, 155, 67],
  kitMoss5: [SHEET.SMALL, 1030, 16, 209, 105],
  kitMoss6: [SHEET.SMALL, 1259, 29, 166, 65],
  kitMoss7: [SHEET.SMALL, 459, 108, 104, 58],
  kitMoss8: [SHEET.SMALL, 714, 116, 78, 51],
  kitMoss9: [SHEET.SMALL, 1292, 98, 135, 88],
  kitMoss10: [SHEET.SMALL, 28, 124, 136, 62],
  kitMoss11: [SHEET.SMALL, 183, 131, 163, 54],
  kitMoss12: [SHEET.SMALL, 367, 127, 68, 40],
  kitMoss13: [SHEET.SMALL, 578, 120, 109, 58],
  kitMoss14: [SHEET.SMALL, 814, 123, 106, 44],
  kitMoss15: [SHEET.SMALL, 936, 118, 93, 52],
  kitMoss16: [SHEET.SMALL, 1060, 128, 72, 34],
  kitMoss17: [SHEET.SMALL, 1163, 139, 43, 32],
  kitMoss18: [SHEET.SMALL, 1230, 130, 39, 29],
  kitLeaf0: [SHEET.SMALL, 13, 225, 81, 50],
  kitLeaf1: [SHEET.SMALL, 106, 211, 95, 56],
  kitLeaf2: [SHEET.SMALL, 216, 203, 102, 69],
  kitLeaf3: [SHEET.SMALL, 333, 195, 88, 74],
  kitLeaf4: [SHEET.SMALL, 432, 187, 156, 94],
  kitLeaf5: [SHEET.SMALL, 600, 202, 92, 73],
  kitLeaf6: [SHEET.SMALL, 706, 181, 115, 103],
  kitLeaf7: [SHEET.SMALL, 839, 190, 154, 94],
  kitLeaf8: [SHEET.SMALL, 1003, 179, 119, 104],
  kitLeaf9: [SHEET.SMALL, 1129, 214, 82, 65],
  kitLeaf10: [SHEET.SMALL, 1222, 182, 89, 94],
  kitLeaf11: [SHEET.SMALL, 1316, 202, 118, 75],
  kitLeaf12: [SHEET.SMALL, 125, 289, 143, 85],
  kitLeaf13: [SHEET.SMALL, 272, 289, 132, 83],
  kitLeaf14: [SHEET.SMALL, 665, 293, 87, 80],
  kitLeaf15: [SHEET.SMALL, 742, 248, 33, 32],
  kitLeaf16: [SHEET.SMALL, 933, 295, 97, 79],
  kitLeaf17: [SHEET.SMALL, 13, 310, 66, 64],
  kitLeaf18: [SHEET.SMALL, 78, 327, 52, 48],
  kitLeaf19: [SHEET.SMALL, 416, 298, 82, 77],
  kitLeaf20: [SHEET.SMALL, 425, 352, 32, 23],
  kitLeaf21: [SHEET.SMALL, 513, 298, 139, 79],
  kitLeaf22: [SHEET.SMALL, 766, 305, 157, 77],
  kitLeaf23: [SHEET.SMALL, 1045, 305, 95, 69],
  kitLeaf24: [SHEET.SMALL, 1148, 301, 91, 71],
  kitLeaf25: [SHEET.SMALL, 1210, 341, 30, 30],
  kitLeaf26: [SHEET.SMALL, 1255, 317, 42, 55],
  kitLeaf27: [SHEET.SMALL, 1305, 298, 130, 75],
  kitLeaf28: [SHEET.SMALL, 19, 396, 89, 80],
  kitLeaf29: [SHEET.SMALL, 151, 395, 55, 82],
  kitLeaf30: [SHEET.SMALL, 216, 385, 103, 92],
  kitLeaf31: [SHEET.SMALL, 324, 412, 47, 49],
  kitLeaf32: [SHEET.SMALL, 382, 384, 66, 89],
  kitLeaf33: [SHEET.SMALL, 463, 382, 83, 104],
  kitLeaf34: [SHEET.SMALL, 561, 411, 51, 65],
  kitLeaf35: [SHEET.SMALL, 626, 379, 110, 107],
  kitLeaf36: [SHEET.SMALL, 755, 397, 53, 75],
  kitLeaf37: [SHEET.SMALL, 822, 399, 79, 84],
  kitLeaf38: [SHEET.SMALL, 909, 405, 85, 68],
  kitLeaf39: [SHEET.SMALL, 1009, 386, 93, 98],
  kitLeaf40: [SHEET.SMALL, 1117, 402, 44, 75],
  kitLeaf41: [SHEET.SMALL, 1183, 391, 47, 88],
  kitLeaf42: [SHEET.SMALL, 1244, 396, 110, 84],
  kitLeaf43: [SHEET.SMALL, 1367, 403, 63, 76],
  kitLeaf44: [SHEET.SMALL, 103, 426, 33, 46],
  kitLeaf45: [SHEET.SMALL, 741, 432, 36, 46],
  kitLeaf46: [SHEET.SMALL, 13, 497, 107, 83],
  kitLeaf47: [SHEET.SMALL, 126, 534, 34, 51],
  kitLeaf48: [SHEET.SMALL, 169, 490, 168, 97],
  kitLeaf49: [SHEET.SMALL, 339, 494, 157, 92],
  kitLeaf50: [SHEET.SMALL, 513, 501, 148, 86],
  kitLeaf51: [SHEET.SMALL, 680, 491, 152, 98],
  kitLeaf52: [SHEET.SMALL, 839, 493, 122, 96],
  kitLeaf53: [SHEET.SMALL, 979, 500, 91, 82],
  kitLeaf54: [SHEET.SMALL, 1088, 496, 137, 91],
  kitLeaf55: [SHEET.SMALL, 1242, 509, 99, 67],
  kitLeaf56: [SHEET.SMALL, 1356, 511, 71, 61],
  kitLeaf57: [SHEET.SMALL, 17, 598, 119, 70],
  kitLeaf58: [SHEET.SMALL, 156, 608, 84, 54],
  kitLeaf59: [SHEET.SMALL, 259, 605, 79, 63],
  kitLeaf60: [SHEET.SMALL, 351, 608, 81, 51],
  kitLeaf61: [SHEET.SMALL, 449, 609, 74, 55],
  kitLeaf62: [SHEET.SMALL, 539, 608, 93, 59],
  kitLeaf63: [SHEET.SMALL, 646, 611, 100, 59],
  kitLeaf64: [SHEET.SMALL, 761, 600, 102, 71],
  kitLeaf65: [SHEET.SMALL, 884, 613, 36, 53],
  kitLeaf66: [SHEET.SMALL, 936, 603, 118, 64],
  kitLeaf67: [SHEET.SMALL, 1070, 605, 142, 60],
  kitLeaf68: [SHEET.SMALL, 1226, 603, 94, 64],
  kitLeaf69: [SHEET.SMALL, 1333, 600, 99, 61],
  kitVine0: [SHEET.SMALL, 14, 694, 77, 112],
  kitVine1: [SHEET.SMALL, 97, 680, 78, 144],
  kitVine2: [SHEET.SMALL, 197, 680, 114, 157],
  kitVine3: [SHEET.SMALL, 334, 679, 77, 156],
  kitVine4: [SHEET.SMALL, 429, 681, 108, 177],
  kitVine5: [SHEET.SMALL, 557, 684, 85, 126],
  kitVine6: [SHEET.SMALL, 660, 680, 87, 178],
  kitVine7: [SHEET.SMALL, 765, 699, 72, 60],
  kitVine8: [SHEET.SMALL, 795, 694, 24, 19],
  kitVine9: [SHEET.SMALL, 860, 683, 89, 123],
  kitVine10: [SHEET.SMALL, 981, 683, 67, 139],
  kitVine11: [SHEET.SMALL, 1083, 680, 59, 152],
  kitVine12: [SHEET.SMALL, 1163, 676, 76, 137],
  kitVine13: [SHEET.SMALL, 1253, 694, 54, 118],
  kitVine14: [SHEET.SMALL, 1327, 683, 108, 168],
  kitVine15: [SHEET.SMALL, 786, 767, 51, 55],
  kitVine16: [SHEET.SMALL, 27, 828, 45, 113],
  kitVine17: [SHEET.SMALL, 109, 814, 64, 134],
  kitVine18: [SHEET.SMALL, 185, 829, 29, 97],
  kitVine19: [SHEET.SMALL, 302, 778, 51, 144],
  kitVine20: [SHEET.SMALL, 478, 828, 92, 105],
  kitVine21: [SHEET.SMALL, 625, 807, 61, 142],
  kitVine22: [SHEET.SMALL, 822, 806, 47, 106],
  kitVine23: [SHEET.SMALL, 893, 802, 89, 140],
  kitVine24: [SHEET.SMALL, 1010, 834, 86, 117],
  kitVine25: [SHEET.SMALL, 1190, 828, 92, 128],
  kitVine26: [SHEET.SMALL, 244, 858, 45, 70],
  kitVine27: [SHEET.SMALL, 391, 840, 59, 104],
  kitVine28: [SHEET.SMALL, 555, 873, 44, 75],
  kitVine29: [SHEET.SMALL, 709, 862, 119, 83],
  kitVine30: [SHEET.SMALL, 1118, 851, 54, 97],
  kitVine31: [SHEET.SMALL, 1303, 848, 47, 99],
  kitVine32: [SHEET.SMALL, 1374, 864, 58, 92],
  kitSprout0: [SHEET.SMALL, 26, 962, 62, 37],
  kitSprout1: [SHEET.SMALL, 114, 971, 53, 37],
  kitSprout2: [SHEET.SMALL, 191, 968, 52, 34],
  kitSprout3: [SHEET.SMALL, 274, 960, 39, 42],
  kitSprout4: [SHEET.SMALL, 351, 964, 39, 38],
  kitSprout5: [SHEET.SMALL, 418, 968, 50, 38],
  kitSprout6: [SHEET.SMALL, 492, 958, 36, 41],
  kitSprout7: [SHEET.SMALL, 562, 971, 87, 35],
  kitSprout8: [SHEET.SMALL, 675, 965, 38, 41],
  kitSprout9: [SHEET.SMALL, 740, 966, 43, 34],
  kitSprout10: [SHEET.SMALL, 811, 970, 49, 38],
  kitSprout11: [SHEET.SMALL, 887, 968, 63, 43],
  kitSprout12: [SHEET.SMALL, 981, 970, 52, 43],
  kitSprout13: [SHEET.SMALL, 1060, 971, 49, 41],
  kitSprout14: [SHEET.SMALL, 1141, 972, 56, 40],
  kitSprout15: [SHEET.SMALL, 1226, 969, 51, 43],
  kitSprout16: [SHEET.SMALL, 1303, 974, 49, 32],
  kitSprout17: [SHEET.SMALL, 1380, 981, 45, 24],
  kitSprout18: [SHEET.SMALL, 20, 1020, 57, 42],
  kitSprout19: [SHEET.SMALL, 100, 1026, 58, 34],
  kitSprout20: [SHEET.SMALL, 181, 1022, 41, 42],
  kitSprout21: [SHEET.SMALL, 242, 1021, 47, 42],
  kitSprout22: [SHEET.SMALL, 312, 1022, 50, 40],
  kitSprout23: [SHEET.SMALL, 384, 1025, 48, 39],
  kitSprout24: [SHEET.SMALL, 454, 1019, 39, 42],
  kitSprout25: [SHEET.SMALL, 517, 1023, 55, 41],
  kitSprout26: [SHEET.SMALL, 596, 1027, 51, 36],
  kitSprout27: [SHEET.SMALL, 674, 1028, 42, 34],
  kitSprout28: [SHEET.SMALL, 748, 1019, 53, 43],
  kitSprout29: [SHEET.SMALL, 822, 1032, 34, 31],
  kitSprout30: [SHEET.SMALL, 873, 1026, 36, 38],
  kitSprout31: [SHEET.SMALL, 933, 1032, 41, 30],
  kitSprout32: [SHEET.SMALL, 999, 1033, 40, 31],
  kitSprout33: [SHEET.SMALL, 1064, 1034, 42, 28],
  kitSprout34: [SHEET.SMALL, 1125, 1039, 23, 21],
  kitSprout35: [SHEET.SMALL, 1171, 1032, 35, 29],
  kitSprout36: [SHEET.SMALL, 1229, 1029, 42, 33],
  kitSprout37: [SHEET.SMALL, 1289, 1037, 29, 23],
  kitSprout38: [SHEET.SMALL, 1339, 1037, 32, 25],
  kitSprout39: [SHEET.SMALL, 1395, 1035, 34, 27],
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
  tiny23: [SHEET.PLANTS, 1466, 963, 55, 43],
  runnerBody: [SHEET.RUNNER, 238, 52, 749, 364],
  runnerHead: [SHEET.RUNNER, 1059, 236, 194, 181],
  runnerTail: [SHEET.RUNNER, 51, 237, 187, 111],
  runnerNeck: [SHEET.RUNNER, 417, 701, 87, 207],
  runnerFeeler0: [SHEET.RUNNER, 1055, 33, 142, 201],
  runnerFeeler1: [SHEET.RUNNER, 1220, 58, 198, 178],
  runnerHip0: [SHEET.RUNNER, 162, 424, 92, 92],
  runnerHip1: [SHEET.RUNNER, 508, 426, 92, 92],
  runnerHip2: [SHEET.RUNNER, 837, 426, 94, 92],
  runnerHip3: [SHEET.RUNNER, 1170, 426, 93, 92],
  runnerThigh0: [SHEET.RUNNER, 111, 513, 152, 174],
  runnerThigh1: [SHEET.RUNNER, 440, 515, 175, 187],
  runnerThigh2: [SHEET.RUNNER, 779, 515, 156, 189],
  runnerThigh3: [SHEET.RUNNER, 1182, 514, 109, 182],
  runnerShin0: [SHEET.RUNNER, 83, 696, 88, 200],
  runnerShin1: [SHEET.RUNNER, 417, 701, 87, 207],
  runnerShin2: [SHEET.RUNNER, 784, 709, 90, 198],
  runnerShin3: [SHEET.RUNNER, 1225, 694, 92, 203],
  runnerFoot0: [SHEET.RUNNER, 46, 896, 104, 142],
  runnerFoot1: [SHEET.RUNNER, 380, 903, 110, 143],
  runnerFoot2: [SHEET.RUNNER, 832, 903, 99, 143],
  runnerFoot3: [SHEET.RUNNER, 1259, 899, 109, 142],
  lantern: [SHEET.MUSHROOM, 46, 94, 1167, 1128],
  striderBody: [SHEET.STRIDER, 97, 34, 656, 311],
  striderHead: [SHEET.STRIDER, 811, 159, 201, 167],
  striderFeeler: [SHEET.STRIDER, 1255, 176, 175, 120],
  striderFemur: [SHEET.STRIDER, 584, 305, 254, 323],
  striderTibia: [SHEET.STRIDER, 587, 634, 44, 371],
  giantBody: [SHEET.CREATURE, 78, 5, 2053, 421],
  giantFinFront: [SHEET.CREATURE, 627, 426, 406, 293],
  giantFinHind: [SHEET.CREATURE, 1244, 415, 283, 252]
}
const sheets = new Map()
const pieces = new Map()
const scaledPieces = new Map()
const shadedPieces = new Map()
const profiles = new Map()
const matches = new Map()
let block = null
let blockMean = null
let loading = null
//
// The stones of ground_stones.png and of stones.png, their joints, the top
// strips. Plants are named by how they grow: up from the ground
// (grow, shroom, bush, sprout, tiny), out of a wall sideways (side: their
// root on the left, growing right), hanging down (hang).
//
export const GROUND_ROCKS = pieceNames('ground')
export const ROCKS = pieceNames('rock')
export const JOINT_MOUNDS = pieceNames('jointMound')
export const JOINT_BEDS = pieceNames('jointBed')
export const JOINT_LOOSE = [...pieceNames('jointWedge'), ...pieceNames('jointPatch')]
export const GROUND_ARCS = pieceNames('groundArc')
export const GROUND_HEAPS = pieceNames('groundHeap')
export const TOPS = pieceNames('top')
export const FLOATS = pieceNames('float')

/**
 * Names of the pieces called prefix + number (plants by how they grow:
 * 'grow', 'hang', 'side'...).
 * @param {string} prefix - Name prefix
 * @returns {Array<string>}
 */
export function pieceNames(prefix) {
  return Object.keys(PIECES).filter(name => new RegExp(`^${prefix}\\d+$`).test(name))
}

/**
 * Loads every sheet and the soil block (once per page).
 * @returns {Promise<void>}
 */
export function load() {
  const keys = Object.keys(SHEETS)
  loading ??= Promise.all([...keys.map(key => loadPictureImage(SHEETS[key].url)), loadPictureImage(BLOCK_URL), loadForestGroundElements()]).then(images => {
    keys.forEach((key, i) => images[i] && sheets.set(key, images[i]))
    block = images[keys.length]
  })
  return loading
}

/**
 * True once every sheet is loaded.
 * @returns {boolean}
 */
export function isLoaded() {
  return sheets.size === Object.keys(SHEETS).length && Boolean(block) && forestBuriedElements().length > 0
}

/**
 * The seamless soil block (ground_block.png) every soil mass is tiled
 * with; null before load().
 * @returns {HTMLImageElement|null}
 */
export function soilBlock() {
  return block
}

/**
 * Mean colour of the soil block (what the soil sheets are matched to).
 * @returns {{r: number, g: number, b: number}}
 */
export function soilColor() {
  const [r, g, b] = soilMean()
  return { r, g, b }
}

/**
 * The forest's buried elements (bones, fossils, shells...), cut at sheet
 * size; empty before load().
 * @returns {Array<HTMLCanvasElement>}
 */
export function elements() {
  return forestBuriedElements()
}

/**
 * A piece's outline per column of its own pixels: the first and the last
 * solid row (NaN where the column is empty).
 * @param {string} name - PIECES key
 * @returns {{top: Float32Array, bottom: Float32Array}|null}
 */
export function profile(name) {
  if (profiles.has(name)) return profiles.get(name)
  const src = piece(name)
  if (!src) return null
  const { width: w, height: h } = src
  const data = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, w, h).data
  const top = new Float32Array(w).fill(NaN)
  const bottom = new Float32Array(w).fill(NaN)
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (data[(y * w + x) * RGBA + 3] < SOLID_ALPHA) continue
      Number.isNaN(top[x]) && (top[x] = y)
      bottom[x] = y
    }
  }
  const out = { top, bottom }
  profiles.set(name, out)
  return out
}

/**
 * Draws columns u…u+w of a piece (optionally mirrored, so column 0 of the
 * slice is its right end on the sheet), scaled and turned round a pivot
 * of the slice that lands on x / y.
 * @param {CanvasRenderingContext2D} ctx - Target context (world-translated)
 * @param {string} name - PIECES key
 * @param {Object} slice
 * @param {number} slice.u - First sheet column of the slice (in the piece)
 * @param {number} slice.w - Columns in the slice
 * @param {boolean} [slice.flip=false] - Mirrored
 * @param {boolean} [slice.flipY=false] - Upside down
 * @param {number} slice.scale - World px per piece px
 * @param {number} slice.angle - Turn (radians)
 * @param {number} slice.px - Pivot X in the slice (piece px, from its left as drawn)
 * @param {number} slice.py - Pivot Y in the slice (piece px)
 * @param {number} slice.x - World X of the pivot
 * @param {number} slice.y - World Y of the pivot
 * @param {HTMLCanvasElement} [slice.src] - A prepared copy of the piece to draw instead
 * @param {number} [slice.alpha=1] - Opacity
 */
export function drawSlice(ctx, name, slice) {
  const src = slice.src ?? piece(name)
  if (!src) return
  const h = src.height
  ctx.save()
  ctx.globalAlpha = slice.alpha ?? 1
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(slice.x, slice.y)
  ctx.rotate(slice.angle)
  ctx.scale(slice.scale, slice.scale)
  ctx.translate(-slice.px, -slice.py)
  slice.flip && ctx.translate(slice.w, 0)
  slice.flip && ctx.scale(-1, 1)
  slice.flipY && ctx.translate(0, h)
  slice.flipY && ctx.scale(1, -1)
  ctx.drawImage(src, slice.u, 0, slice.w, h, 0, 0, slice.w, h)
  ctx.restore()
}

/**
 * A cut piece, prepared for its sheet (null before load()).
 * @param {string} name - PIECES key
 * @returns {HTMLCanvasElement|null}
 */
export function piece(name) {
  if (pieces.has(name)) return pieces.get(name)
  const spec = PIECES[name]
  const img = spec && sheets.get(spec[0])
  if (!img) return null
  const [key, sx, sy, w, h] = spec
  const sheet = SHEETS[key]
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, sx, sy, w, h, 0, 0, w, h)
  const image = ctx.getImageData(0, 0, w, h)
  sheet.soil && matchSoil(image.data, soilMatchOf(key), sheet.dewhite && { w, h, sides: OUTER_SIDES[name] ?? '', band: sheet.dewhite })
  sheet.alpha && remapAlpha(image.data, sheet.alpha)
  sheet.sharpen && sharpenFades(image.data, sheet.sharpen)
  sheet.isolate && isolate(image.data, w, h, sheet.isolate)
  ctx.putImageData(image, 0, 0)
  pieces.set(name, canvas)
  return canvas
}

/**
 * A piece resized once to `scale`, maybe mirrored (cached per page), for
 * bakes that copy it pixel for pixel.
 * @param {string} name - PIECES key
 * @param {number} scale - Drawn px per piece px
 * @param {boolean} [flip=false] - Mirrored
 * @returns {HTMLCanvasElement|null}
 */
export function scaledPiece(name, scale, flip = false) {
  const key = `${name}@${scale}${flip ? 'f' : ''}`
  if (scaledPieces.has(key)) return scaledPieces.get(key)
  const src = piece(name)
  if (!src) return null
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(src.width * scale))
  canvas.height = Math.max(1, Math.round(src.height * scale))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  flip && ctx.translate(canvas.width, 0)
  flip && ctx.scale(-1, 1)
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height)
  scaledPieces.set(key, canvas)
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
 * @param {number} [opts.angle=0] - Turn (radians) round a point on its centre line
 * @param {number} [opts.pivot=0.5] - That point's share of the height down from the top
 * @param {number} [opts.alpha=1] - Opacity
 * @param {string} [opts.shade] - Colour to shade toward ('#rrggbb')
 * @param {number} [opts.shadeAmount=0] - 0 = untouched, 1 = flat colour
 */
export function drawPiece(ctx, name, x, y, h, opts = {}) {
  const src = piece(name)
  if (!src) return
  const w = widthAt(name, h)
  const img = opts.shade && opts.shadeAmount > 0 ? shaded(name, src, opts.shade, opts.shadeAmount) : src
  ctx.save()
  ctx.globalAlpha = opts.alpha ?? 1
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(x, opts.hang ? y : y - h)
  if (opts.angle) {
    const pivot = h * (opts.pivot ?? HALF_SHARE)
    ctx.translate(0, pivot)
    ctx.rotate(opts.angle)
    ctx.translate(0, -pivot)
  }
  opts.flip && ctx.scale(-1, 1)
  ctx.drawImage(img, -w / 2, 0, w, h)
  ctx.restore()
}
//
// Haze and fringes out: alpha below lo gone, above hi solid.
//
function remapAlpha(data, [lo, hi]) {
  for (let i = 3; i < data.length; i += RGBA) {
    data[i] = Math.max(0, Math.min(BYTE_MAX, (data[i] - lo) * BYTE_MAX / (hi - lo)))
  }
}
//
// Fades shortened: alpha raised to a power.
//
function sharpenFades(data, pow) {
  for (let i = 3; i < data.length; i += RGBA) data[i] = BYTE_MAX * Math.pow(data[i] / BYTE_MAX, pow)
}
//
// A soil sheet's colour pulled onto the block's, its fades toward the
// block's colour; with `dewhite`, its white haze turned into transparency
// over the block's colour.
//
function matchSoil(data, match, dewhite) {
  const target = soilMean()
  for (let i = 0; i < data.length; i += RGBA) {
    const t = dewhite ? whiteShare(data, i, match, dewhite) : 0
    const keep = Math.max(WHITE_KEEP, 1 - t)
    const alpha = data[i + 3] * Math.pow(Math.max(0, 1 - t * WHITE_ALPHA_GAIN), WHITE_FADE_POW)
    const toSoil = 1 - Math.pow(alpha / BYTE_MAX, FADE_POW)
    for (let c = 0; c < 3; c++) {
      const own = Math.max(0, (data[i + c] - BYTE_MAX * t) / keep) * match.gain[c]
      data[i + c] = own + (target[c] - own) * toSoil
    }
    data[i + 3] = alpha
  }
}
//
// A pixel's white share (see WHITE_FADE_POW).
//
function whiteShare(data, i, match, piece) {
  const p = i / RGBA
  const x = p % piece.w
  const y = (p - x) / piece.w
  const fromOuter = Math.min(
    piece.sides.includes('l') ? x : Infinity,
    piece.sides.includes('r') ? piece.w - 1 - x : Infinity,
    piece.sides.includes('t') ? y : Infinity,
    piece.sides.includes('b') ? piece.h - 1 - y : Infinity
  )
  const lum = (data[i] + data[i + 1] + data[i + 2]) / 3
  const share = Math.max(0, Math.min(1, (lum - match.lum) / (BYTE_MAX - match.lum)))
  if (data[i + 3] < HAZE_ALPHA) return share
  return share * Math.max(0, Math.min(1, (fromOuter - piece.band) / OUTER_SOFT))
}
//
// A sheet's soil: the per-channel gain that takes its mean onto the
// block's and its own mean luminance (once per sheet).
//
function soilMatchOf(key) {
  if (matches.has(key)) return matches.get(key)
  const target = soilMean()
  const mean = meanSoil(imageData(sheets.get(key)))
  const match = { gain: mean.map((m, c) => m ? target[c] / m : 1), lum: (mean[0] + mean[1] + mean[2]) / 3 }
  matches.set(key, match)
  return match
}
function soilMean() {
  blockMean ??= meanSoil(imageData(block))
  return blockMean
}
function imageData(img) {
  const canvas = document.createElement('canvas')
  canvas.width = img.width
  canvas.height = img.height
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(img, 0, 0)
  return ctx.getImageData(0, 0, img.width, img.height).data
}
//
// Mean colour of the opaque, dark (soil) pixels.
//
function meanSoil(data) {
  const sum = [0, 0, 0]
  let n = 0
  for (let i = 0; i < data.length; i += RGBA * SAMPLE_STEP) {
    if (data[i + 3] < SOIL_ALPHA_MIN || (data[i] + data[i + 1] + data[i + 2]) / 3 >= SOIL_LUM_MAX) continue
    sum[0] += data[i]
    sum[1] += data[i + 1]
    sum[2] += data[i + 2]
    n++
  }
  return sum.map(s => n ? s / n : 0)
}
//
// Only the piece's own island stays: the biggest solid island and `keep`
// px round it; whatever else reaches into the box is cleared.
//
function isolate(data, w, h, opts) {
  const solid = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) solid[p] = data[p * RGBA + 3] >= opts.alpha ? 1 : 0
  const label = new Int32Array(w * h)
  let best = 0
  let bestSize = 0
  let id = 0
  for (let p = 0; p < w * h; p++) {
    if (!solid[p] || label[p]) continue
    id++
    const size = floodFill(solid, label, w, h, p, id)
    size > bestSize && (best = id)
    bestSize = Math.max(bestSize, size)
  }
  const own = new Uint8Array(w * h)
  for (let p = 0; p < w * h; p++) own[p] = label[p] === best ? 1 : 0
  const kept = dilate(dilate(own, w, h, opts.keep, 1, w), w, h, opts.keep, w, 1)
  for (let p = 0; p < w * h; p++) kept[p] || (data[p * RGBA + 3] = 0)
}
//
// Labels the solid island round `start` (8-connected); its size.
//
function floodFill(solid, label, w, h, start, id) {
  const stack = [start]
  label[start] = id
  let size = 0
  while (stack.length) {
    const p = stack.pop()
    size++
    const x = p % w
    const y = (p - x) / w
    for (const [dx, dy] of NEIGHBOURS) {
      const nx = x + dx
      const ny = y + dy
      const q = ny * w + nx
      if (nx < 0 || ny < 0 || nx >= w || ny >= h || !solid[q] || label[q]) continue
      label[q] = id
      stack.push(q)
    }
  }
  return size
}
//
// A mask grown by r along one axis (step: index distance between
// neighbours along it, line: between lines across it).
//
function dilate(mask, w, h, r, step, line) {
  const out = new Uint8Array(w * h)
  const along = step === 1 ? w : h
  const lines = step === 1 ? h : w
  for (let l = 0; l < lines; l++) {
    let last = -Infinity
    let next = Infinity
    for (let i = along - 1; i >= 0; i--) {
      mask[l * line + i * step] && (next = i)
      out[l * line + i * step] = next - i <= r ? 1 : 0
    }
    for (let i = 0; i < along; i++) {
      mask[l * line + i * step] && (last = i)
      i - last <= r && (out[l * line + i * step] = 1)
    }
  }
  return out
}
//
// Copy of a piece pulled toward a colour (its silhouette kept), cached.
//
function shaded(name, src, color, amount) {
  const key = `${name}|${color}|${amount}`
  if (shadedPieces.has(key)) return shadedPieces.get(key)
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(src, 0, 0)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = amount
  ctx.fillStyle = color
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  shadedPieces.set(key, canvas)
  return canvas
}
