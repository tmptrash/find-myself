import { loadPictureImage, cutSheetPieces } from './forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { createCanvasAtlasBuilder } from '../../../utils/helper.js'

//
// Parts of the apple bug cut from assets/forest/apple_bug.png: its hood of
// leaves, round body, mossy head, two antennae and twelve leg pieces (six
// legs of a thigh and a foot), baked at world size into one atlas once per
// live k and graded and grained like the forest's other baked material.
// The picture starts loading with this module (game boot).
//
// Every part sits in the sheet's own px as the assembled bug faces right,
// seen from its side: the leaf hood where it is on the sheet, the body's box
// moved to BODY_AT under the hood (its belly shows below the hood's rim) and
// the head's box moved to HEAD_AT so the head looks out of the hood's open
// front. The body's origin (low in the body, under the hips) is where the bug's local
// frame starts; it is x forward, y down.
//
const URL = 'forest/apple_bug.png'
const GRAIN_SEED = 6501
const SHELL = { x: 46, y: 160, w: 561, h: 307 }
const SHELL_AT = { x: 46, y: 160 }
const BODY = { x: 602, y: 241, w: 343, h: 207 }
const BODY_AT = { x: 250, y: 290 }
const HEAD = { x: 963, y: 239, w: 250, h: 204 }
const HEAD_AT = { x: 515, y: 268 }
const BODY_ORIGIN = { x: 420, y: 480 }
//
// On the head's box (sheet px): the neck at the back of the head it turns
// round, the mouth low on its front the tongue comes out of and the bases
// of the near and far antennae on its crown (the far one a little further
// back).
//
const NECK = { x: 995, y: 350 }
const MOUTH = { x: 1200, y: 405 }
const ANTENNA_NEAR_ON_HEAD = { x: 1125, y: 262 }
const ANTENNA_FAR_ON_HEAD = { x: 1085, y: 252 }
//
// Antennae: both rise from their base at the lower end and bend forward
// (the far one lower and flatter).
//
const ANTENNA_NEAR = { x: 1239, y: 237, w: 162, h: 193, base: { x: 1257, y: 414 } }
const ANTENNA_FAR = { x: 1312, y: 301, w: 177, h: 133, base: { x: 1327, y: 418 } }
//
// Leg pieces, one column per leg (thigh, curled foot): box, proximal joint
// a and distal joint b on the sheet. The foot's b is its tip on the ground.
//
const LEG_PIECES = [
  [
    { x: 175, y: 541, w: 158, h: 161, a: { x: 299, y: 569 }, b: { x: 197, y: 670 } },
    { x: 199, y: 774, w: 89, h: 107, a: { x: 262, y: 797 }, b: { x: 221, y: 877 } }
  ],
  [
    { x: 383, y: 540, w: 153, h: 164, a: { x: 500, y: 566 }, b: { x: 406, y: 674 } },
    { x: 403, y: 774, w: 94, h: 108, a: { x: 471, y: 799 }, b: { x: 426, y: 879 } }
  ],
  [
    { x: 584, y: 540, w: 153, h: 162, a: { x: 700, y: 566 }, b: { x: 606, y: 672 } },
    { x: 612, y: 774, w: 89, h: 107, a: { x: 675, y: 798 }, b: { x: 633, y: 877 } }
  ],
  [
    { x: 793, y: 540, w: 150, h: 162, a: { x: 907, y: 568 }, b: { x: 815, y: 672 } },
    { x: 817, y: 776, w: 90, h: 106, a: { x: 880, y: 800 }, b: { x: 838, y: 878 } }
  ],
  [
    { x: 1002, y: 540, w: 153, h: 163, a: { x: 1119, y: 567 }, b: { x: 1024, y: 673 } },
    { x: 1024, y: 774, w: 88, h: 108, a: { x: 1086, y: 797 }, b: { x: 1047, y: 878 } }
  ],
  [
    { x: 1214, y: 540, w: 166, h: 163, a: { x: 1344, y: 567 }, b: { x: 1235, y: 671 } },
    { x: 1250, y: 774, w: 89, h: 108, a: { x: 1313, y: 797 }, b: { x: 1272, y: 878 } }
  ]
]
//
// The legs are baked this much smaller than the sheet draws them next to
// the body: slim, short legs that keep the bug low over the ground.
//
const LEG_SCALE = 0.55
//
// The six legs rear to front, near side then far side: hip high in the body
// (assembled px), the column of pieces it is drawn from and its place along
// the body (-1 rear, 0 middle, 1 front).
//
const MID_PLACE = -0.25
const LEGS = [
  { hip: { x: 300, y: 435 }, column: 0, place: -1, far: false },
  { hip: { x: 420, y: 440 }, column: 2, place: MID_PLACE, far: false },
  { hip: { x: 540, y: 435 }, column: 4, place: 1, far: false },
  { hip: { x: 325, y: 422 }, column: 1, place: -1, far: true },
  { hip: { x: 445, y: 427 }, column: 3, place: MID_PLACE, far: true },
  { hip: { x: 565, y: 422 }, column: 5, place: 1, far: true }
]
const image = loadPictureImage(URL)
const bakedByK = new WeakMap()

/**
 * Bakes the bug's parts once per live k into one atlas (waits for the
 * picture to load). Every part comes with the anchor ({ x, y } in -1..1
 * across its tile) of the point it is drawn round, and every point in the
 * bug's local frame (world px from the body's origin, x forward, y down).
 * @param {Object} k - Kaplay instance
 * @param {number} shellWidth - World px across the shell
 * @returns {Promise<Object|null>} Baked parts: shell and body round the
 *   body's origin, the head round the neck, antennae round their bases, legs (hip,
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
  const piecesPerLeg = LEG_PIECES[0].length
  const rects = [SHELL, BODY, HEAD, ANTENNA_NEAR, ANTENNA_FAR, ...pieces]
  const cuts = cutSheetPieces(img, rects)
  const atlas = createCanvasAtlasBuilder()
  const firstLegPart = rects.length - pieces.length
  const parts = cuts.map((cut, i) => {
    const canvas = scalePart(cut, i >= firstLegPart ? scale * LEG_SCALE : scale, GRAIN_SEED + i)
    return { tile: atlas.register(canvas), rect: rects[i] }
  })
  atlas.build(k)
  const head = headToAssembled
  const out = {
    scale,
    shell: { tile: parts[0].tile, anchor: anchorOf(parts[0], SHELL_AT, BODY_ORIGIN) },
    body: { tile: parts[1].tile, anchor: anchorOf(parts[1], BODY_AT, BODY_ORIGIN) },
    head: { tile: parts[2].tile, anchor: anchorOf(parts[2], HEAD_AT, head(NECK)) },
    antennaNear: { tile: parts[3].tile, anchor: anchorOf(parts[3], ANTENNA_NEAR, ANTENNA_NEAR.base) },
    antennaFar: { tile: parts[4].tile, anchor: anchorOf(parts[4], ANTENNA_FAR, ANTENNA_FAR.base) },
    neck: toLocal(head(NECK), scale),
    mouth: toLocal(head(MOUTH), scale),
    antennaNearAt: toLocal(head(ANTENNA_NEAR_ON_HEAD), scale),
    antennaFarAt: toLocal(head(ANTENNA_FAR_ON_HEAD), scale),
    shellBox: shellBox(scale),
    legs: LEGS.map(leg => ({
      hip: toLocal(leg.hip, scale),
      place: leg.place,
      far: leg.far,
      pieces: LEG_PIECES[leg.column].map((piece, i) => legPiece(piece, parts[firstLegPart + leg.column * piecesPerLeg + i], scale * LEG_SCALE))
    }))
  }
  bakedByK.set(k, out)
  return out
}
//
// A sheet piece at world size, graded and grained (its own seed).
//
function scalePart(cut, scale, seed) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.ceil(cut.width * scale))
  canvas.height = Math.max(1, Math.ceil(cut.height * scale))
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(cut, 0, 0, canvas.width, canvas.height)
  cut.width = 0
  cut.height = 0
  applyForestLayerGradeToCanvas(canvas, {
    ...FOREST_LAYER_GRADE.material,
    grainBlockSize: forestFilmGrainBlockPxForTier('gameplay')
  }, seed)
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
// top-left at `box` (assembled px), in -1..1 across its tile.
//
function anchorOf(part, box, point) {
  const px = (point.x - box.x) / part.rect.w
  const py = (point.y - box.y) / part.rect.h
  return { x: px * 2 - 1, y: py * 2 - 1 }
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
  const a = toLocal(SHELL_AT, scale)
  return { x1: a.x, y1: a.y, x2: a.x + SHELL.w * scale, y2: a.y + SHELL.h * scale }
}
