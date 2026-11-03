import { loadPictureImage, cutSheetPieces } from './forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { FOREST_PAL } from './forest-palette.js'
import { createCanvasAtlasBuilder } from '../../../utils/helper.js'

//
// Parts of the apple bug cut from assets/forest/apple_bug.png: its leafy
// shell, head, two antennae and eighteen leg pieces (six legs of femur,
// tibia and tarsus), baked at world size into one atlas once per live k,
// graded and grained like the forest's other baked material, plus a soft
// belly drawn under the shell. The picture starts loading with this module
// (game boot).
//
// Every part sits in the sheet's own px as the assembled bug faces right:
// the shell where it is on the sheet, the head's box moved to HEAD_AT. The
// body's origin (between the hips) is where the bug's local frame starts;
// it is x forward, y down.
//
const URL = 'forest/apple_bug.png'
const GRAIN_SEED = 6501
const SHELL = { x: 754, y: 134, w: 428, h: 320 }
const HEAD = { x: 1256, y: 224, w: 222, h: 144 }
const HEAD_AT = { x: 1050, y: 326 }
const BODY_ORIGIN = { x: 959, y: 364 }
//
// On the head's box (sheet px): the neck it turns round, the mouth the
// tongue comes out of and the bases of the near and far antennae.
//
const NECK = { x: 1276, y: 314 }
const MOUTH = { x: 1456, y: 351 }
const ANTENNA_NEAR_ON_HEAD = { x: 1346, y: 234 }
const ANTENNA_FAR_ON_HEAD = { x: 1409, y: 232 }
//
// Antennae: the near one rises from its base and bends forward; the far one
// is painted bending back, so it is drawn mirrored.
//
const ANTENNA_NEAR = { x: 1230, y: 410, w: 102, h: 116, base: { x: 1240, y: 518 } }
const ANTENNA_FAR = { x: 1390, y: 412, w: 104, h: 114, base: { x: 1483, y: 518 } }
//
// Leg pieces, one column per leg (femur, tibia, tarsus): box, proximal joint
// a and distal joint b on the sheet.
//
const LEG_PIECES = [
  [
    { x: 116, y: 596, w: 126, h: 120, a: { x: 221, y: 619 }, b: { x: 135, y: 694 } },
    { x: 108, y: 724, w: 96, h: 134, a: { x: 134, y: 741 }, b: { x: 181, y: 839 } },
    { x: 134, y: 854, w: 76, h: 112, a: { x: 189, y: 867 }, b: { x: 150, y: 951 } }
  ],
  [
    { x: 310, y: 598, w: 102, h: 122, a: { x: 385, y: 615 }, b: { x: 334, y: 702 } },
    { x: 292, y: 714, w: 92, h: 118, a: { x: 317, y: 729 }, b: { x: 365, y: 814 } },
    { x: 332, y: 830, w: 62, h: 132, a: { x: 368, y: 842 }, b: { x: 348, y: 944 } }
  ],
  [
    { x: 534, y: 594, w: 118, h: 122, a: { x: 630, y: 616 }, b: { x: 553, y: 696 } },
    { x: 530, y: 724, w: 106, h: 136, a: { x: 555, y: 742 }, b: { x: 615, y: 840 } },
    { x: 560, y: 858, w: 76, h: 108, a: { x: 615, y: 870 }, b: { x: 576, y: 951 } }
  ],
  [
    { x: 724, y: 596, w: 76, h: 120, a: { x: 765, y: 609 }, b: { x: 754, y: 701 } },
    { x: 732, y: 714, w: 104, h: 112, a: { x: 753, y: 733 }, b: { x: 818, y: 808 } },
    { x: 778, y: 828, w: 64, h: 132, a: { x: 818, y: 841 }, b: { x: 794, y: 943 } }
  ],
  [
    { x: 980, y: 596, w: 132, h: 114, a: { x: 1091, y: 620 }, b: { x: 999, y: 690 } },
    { x: 988, y: 714, w: 84, h: 136, a: { x: 1015, y: 729 }, b: { x: 1050, y: 831 } },
    { x: 986, y: 846, w: 84, h: 118, a: { x: 1048, y: 859 }, b: { x: 1004, y: 947 } }
  ],
  [
    { x: 1170, y: 602, w: 102, h: 112, a: { x: 1246, y: 620 }, b: { x: 1191, y: 695 } },
    { x: 1176, y: 710, w: 96, h: 110, a: { x: 1195, y: 727 }, b: { x: 1254, y: 802 } },
    { x: 1202, y: 816, w: 96, h: 134, a: { x: 1273, y: 831 }, b: { x: 1221, y: 932 } }
  ]
]
//
// The six legs rear to front, near side then far side: hip under the shell
// (assembled px), the column of pieces it is drawn from and its place along
// the body (-1 rear, 0 middle, 1 front).
//
const MID_PLACE = -0.25
const LEGS = [
  { hip: { x: 849, y: 366 }, column: 0, place: -1, far: false },
  { hip: { x: 954, y: 370 }, column: 2, place: MID_PLACE, far: false },
  { hip: { x: 1054, y: 366 }, column: 4, place: 1, far: false },
  { hip: { x: 884, y: 356 }, column: 1, place: -1, far: true },
  { hip: { x: 989, y: 360 }, column: 3, place: MID_PLACE, far: true },
  { hip: { x: 1084, y: 356 }, column: 5, place: 1, far: true }
]
//
// Every picture part gets a dark contour OUTLINE_PX wide round its
// silhouette (its tile grows by it on each side).
//
const OUTLINE_PX = 1
//
// The belly under the shell (assembled px) and its lit upper half's share.
//
const BELLY = { x: 969, y: 374, rx: 130, ry: 38 }
const BELLY_LIGHT_SHRINK = 0.72
const BELLY_LIGHT_LIFT = 0.35
const BELLY_PAD = 2
const COLORS = FOREST_PAL.appleBug
const image = loadPictureImage(URL)
const bakedByK = new WeakMap()

/**
 * Bakes the bug's parts once per live k into one atlas (waits for the
 * picture to load). Every part comes with the anchor ({ x, y } in -1..1
 * across its tile) of the point it is drawn round, and every point in the
 * bug's local frame (world px from the body's origin, x forward, y down).
 * @param {Object} k - Kaplay instance
 * @param {number} shellWidth - World px across the shell
 * @returns {Promise<Object|null>} Baked parts: shell, belly and head round
 *   the body's origin and the neck, antennae round their bases, legs (hip,
 *   place, far, pieces round their proximal joints with their axis angle and
 *   length), the neck, mouth and antenna bases, and the shell's box (null if
 *   the picture failed to load)
 */
export async function load(k, shellWidth) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const scale = shellWidth / SHELL.w
  const pieces = LEG_PIECES.flat()
  const rects = [SHELL, HEAD, ANTENNA_NEAR, ANTENNA_FAR, ...pieces]
  const cuts = cutSheetPieces(img, rects)
  const atlas = createCanvasAtlasBuilder()
  const parts = cuts.map((cut, i) => {
    const canvas = scalePart(cut, scale, GRAIN_SEED + i)
    return { tile: atlas.register(canvas), rect: rects[i], w: canvas.width, h: canvas.height }
  })
  const bellyTile = atlas.register(bakeBelly(scale))
  atlas.build(k)
  const head = headToAssembled
  const out = {
    scale,
    shell: { tile: parts[0].tile, anchor: anchorOf(parts[0], SHELL, BODY_ORIGIN) },
    head: { tile: parts[1].tile, anchor: anchorOf(parts[1], HEAD_AT, head(NECK)) },
    antennaNear: { tile: parts[2].tile, anchor: anchorOf(parts[2], ANTENNA_NEAR, ANTENNA_NEAR.base) },
    antennaFar: { tile: parts[3].tile, anchor: anchorOf(parts[3], ANTENNA_FAR, ANTENNA_FAR.base) },
    belly: { tile: bellyTile, anchor: { x: 0, y: 0 } },
    bellyAt: toLocal(BELLY, scale),
    neck: toLocal(head(NECK), scale),
    mouth: toLocal(head(MOUTH), scale),
    antennaNearAt: toLocal(head(ANTENNA_NEAR_ON_HEAD), scale),
    antennaFarAt: toLocal(head(ANTENNA_FAR_ON_HEAD), scale),
    shellBox: shellBox(scale),
    legs: LEGS.map(leg => ({
      hip: toLocal(leg.hip, scale),
      place: leg.place,
      far: leg.far,
      pieces: LEG_PIECES[leg.column].map((piece, i) => legPiece(piece, parts[4 + leg.column * 3 + i], scale))
    }))
  }
  bakedByK.set(k, out)
  return out
}
//
// A sheet piece at world size inside its contour (its silhouette in the
// contour colour stamped round it first), graded and grained (its own seed).
//
function scalePart(cut, scale, seed) {
  const w = Math.max(1, Math.ceil(cut.width * scale))
  const h = Math.max(1, Math.ceil(cut.height * scale))
  const piece = document.createElement('canvas')
  piece.width = w
  piece.height = h
  const pieceCtx = piece.getContext('2d')
  pieceCtx.imageSmoothingQuality = 'high'
  pieceCtx.drawImage(cut, 0, 0, w, h)
  cut.width = 0
  cut.height = 0
  const silhouette = document.createElement('canvas')
  silhouette.width = w
  silhouette.height = h
  const silhouetteCtx = silhouette.getContext('2d')
  silhouetteCtx.drawImage(piece, 0, 0)
  silhouetteCtx.globalCompositeOperation = 'source-in'
  silhouetteCtx.fillStyle = COLORS.outline
  silhouetteCtx.fillRect(0, 0, w, h)
  const canvas = document.createElement('canvas')
  canvas.width = w + OUTLINE_PX * 2
  canvas.height = h + OUTLINE_PX * 2
  const ctx = canvas.getContext('2d')
  for (let dy = -OUTLINE_PX; dy <= OUTLINE_PX; dy++) {
    for (let dx = -OUTLINE_PX; dx <= OUTLINE_PX; dx++) ctx.drawImage(silhouette, OUTLINE_PX + dx, OUTLINE_PX + dy)
  }
  ctx.drawImage(piece, OUTLINE_PX, OUTLINE_PX)
  piece.width = 0
  silhouette.width = 0
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, seed)
  return canvas
}
//
// The belly: a dark oval with a lighter, smaller one on its upper half.
//
function bakeBelly(scale) {
  const rx = BELLY.rx * scale
  const ry = BELLY.ry * scale
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(rx * 2 + BELLY_PAD * 2)
  canvas.height = Math.ceil(ry * 2 + BELLY_PAD * 2)
  const ctx = canvas.getContext('2d')
  const cx = canvas.width * 0.5
  const cy = canvas.height * 0.5
  ctx.fillStyle = COLORS.belly
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = COLORS.bellyLight
  ctx.beginPath()
  ctx.ellipse(cx, cy - ry * BELLY_LIGHT_LIFT, rx * BELLY_LIGHT_SHRINK, ry * BELLY_LIGHT_SHRINK, 0, 0, Math.PI * 2)
  ctx.fill()
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, GRAIN_SEED - 1)
  return canvas
}
//
// A leg piece drawn round its proximal joint: the angle of its own axis
// (a to b) on the sheet and its length in world px.
//
function legPiece(piece, part, scale) {
  return {
    tile: part.tile,
    anchor: anchorOf(part, piece, piece.a),
    axis: Math.atan2(piece.b.y - piece.a.y, piece.b.x - piece.a.x),
    len: Math.hypot(piece.b.x - piece.a.x, piece.b.y - piece.a.y) * scale
  }
}
//
// The anchor of a point on a baked part placed with its sheet box's
// top-left at `box` (assembled px), in -1..1 across its tile (contour
// included).
//
function anchorOf(part, box, point) {
  const px = (point.x - box.x) * (part.w - OUTLINE_PX * 2) / part.rect.w + OUTLINE_PX
  const py = (point.y - box.y) * (part.h - OUTLINE_PX * 2) / part.rect.h + OUTLINE_PX
  return { x: px / part.w * 2 - 1, y: py / part.h * 2 - 1 }
}
//
// A point on the head's sheet box in assembled px.
//
function headToAssembled(p) {
  return { x: p.x - HEAD.x + HEAD_AT.x, y: p.y - HEAD.y + HEAD_AT.y }
}
function toLocal(p, scale) {
  return { x: (p.x - BODY_ORIGIN.x) * scale, y: (p.y - BODY_ORIGIN.y) * scale }
}
function shellBox(scale) {
  const a = toLocal(SHELL, scale)
  return { x1: a.x, y1: a.y, x2: a.x + SHELL.w * scale, y2: a.y + SHELL.h * scale }
}
