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
// Every part sits in the sheet's own px as the assembled bug faces right,
// seen from its side: the shell where it is on the sheet, the head's box
// moved to HEAD_AT so the back of the head tucks in under the shell's front
// flap and the face (one eye) sticks out in front of it. The body's origin
// (at the hips) is where the bug's local frame starts; it is x forward, y
// down.
//
const URL = 'forest/apple_bug.png'
const GRAIN_SEED = 6501
const SHELL = { x: 753, y: 130, w: 415, h: 325 }
const HEAD = { x: 1223, y: 223, w: 224, h: 161 }
const HEAD_AT = { x: 1040, y: 292 }
const BODY_ORIGIN = { x: 957, y: 411 }
//
// On the head's box (sheet px): the neck at the back of the head it turns
// round, the mouth low on its front the tongue comes out of and the bases
// of the near and far antennae on its crown above the eye (the far one a
// little further back).
//
const NECK = { x: 1262, y: 311 }
const MOUTH = { x: 1429, y: 365 }
const ANTENNA_NEAR_ON_HEAD = { x: 1387, y: 255 }
const ANTENNA_FAR_ON_HEAD = { x: 1344, y: 241 }
//
// Antennae: the near one rises from its base and bends forward; the far one
// is painted bending back, so it is drawn mirrored.
//
const ANTENNA_NEAR = { x: 1203, y: 417, w: 113, h: 113, base: { x: 1214, y: 522 } }
const ANTENNA_FAR = { x: 1355, y: 418, w: 108, h: 113, base: { x: 1450, y: 523 } }
//
// Leg pieces, one column per leg (femur, tibia, tarsus): box, proximal joint
// a and distal joint b on the sheet.
//
const LEG_PIECES = [
  [
    { x: 138, y: 607, w: 105, h: 103, a: { x: 225, y: 624 }, b: { x: 153, y: 695 } },
    { x: 130, y: 706, w: 83, h: 110, a: { x: 155, y: 720 }, b: { x: 193, y: 800 } },
    { x: 148, y: 813, w: 72, h: 93, a: { x: 204, y: 823 }, b: { x: 162, y: 892 } }
  ],
  [
    { x: 319, y: 607, w: 93, h: 103, a: { x: 392, y: 621 }, b: { x: 335, y: 695 } },
    { x: 319, y: 711, w: 78, h: 96, a: { x: 338, y: 724 }, b: { x: 380, y: 793 } },
    { x: 336, y: 806, w: 65, h: 100, a: { x: 384, y: 817 }, b: { x: 350, y: 891 } }
  ],
  [
    { x: 537, y: 607, w: 97, h: 103, a: { x: 615, y: 623 }, b: { x: 552, y: 695 } },
    { x: 537, y: 708, w: 85, h: 105, a: { x: 557, y: 722 }, b: { x: 605, y: 798 } },
    { x: 554, y: 812, w: 71, h: 94, a: { x: 609, y: 823 }, b: { x: 567, y: 892 } }
  ],
  [
    { x: 739, y: 607, w: 69, h: 101, a: { x: 785, y: 618 }, b: { x: 756, y: 695 } },
    { x: 734, y: 707, w: 93, h: 95, a: { x: 751, y: 724 }, b: { x: 810, y: 786 } },
    { x: 769, y: 805, w: 60, h: 101, a: { x: 810, y: 815 }, b: { x: 782, y: 891 } }
  ],
  [
    { x: 962, y: 607, w: 95, h: 102, a: { x: 1038, y: 623 }, b: { x: 976, y: 694 } },
    { x: 962, y: 708, w: 80, h: 104, a: { x: 982, y: 722 }, b: { x: 1024, y: 797 } },
    { x: 971, y: 811, w: 74, h: 95, a: { x: 1029, y: 822 }, b: { x: 985, y: 892 } }
  ],
  [
    { x: 1169, y: 607, w: 85, h: 102, a: { x: 1234, y: 621 }, b: { x: 1184, y: 695 } },
    { x: 1166, y: 707, w: 86, h: 96, a: { x: 1183, y: 723 }, b: { x: 1235, y: 788 } },
    { x: 1191, y: 804, w: 69, h: 102, a: { x: 1241, y: 815 }, b: { x: 1204, y: 891 } }
  ]
]
//
// The six legs rear to front, near side then far side: hip under the shell
// (assembled px), the column of pieces it is drawn from and its place along
// the body (-1 rear, 0 middle, 1 front).
//
const MID_PLACE = -0.25
const LEGS = [
  { hip: { x: 856, y: 416 }, column: 0, place: -1, far: false },
  { hip: { x: 955, y: 419 }, column: 2, place: MID_PLACE, far: false },
  { hip: { x: 1052, y: 414 }, column: 4, place: 1, far: false },
  { hip: { x: 889, y: 405 }, column: 1, place: -1, far: true },
  { hip: { x: 988, y: 408 }, column: 3, place: MID_PLACE, far: true },
  { hip: { x: 1083, y: 403 }, column: 5, place: 1, far: true }
]
//
// The belly under the shell (assembled px) and its lit upper half's share.
//
const BELLY = { x: 962, y: 407, rx: 129, ry: 32 }
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
    return { tile: atlas.register(canvas), rect: rects[i] }
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
  const a = toLocal(SHELL, scale)
  return { x1: a.x, y1: a.y, x2: a.x + SHELL.w * scale, y2: a.y + SHELL.h * scale }
}
