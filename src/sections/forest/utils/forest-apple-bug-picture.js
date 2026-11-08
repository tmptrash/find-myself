import { loadPictureImage, cutSheetPieces } from './forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { createCanvasAtlasBuilder } from '../../../utils/helper.js'

//
// Parts of the apple bug cut from assets/forest/apple_bug.png: its hood of
// leaves, long body, mossy one-eyed head, two antennae and one leg (a thigh
// and a foot) that every one of its eight legs is drawn from, baked at
// world size into one atlas once per live k and graded and grained like the
// forest's other baked material. The picture starts loading with this
// module (game boot).
//
// Every part sits in the sheet's own px as the assembled bug faces right,
// seen from its side: the leaf hood's box moved to SHELL_AT (down onto the
// body's back, its front arch over the back of the head), the body's box
// moved to BODY_AT under the hood (its belly shows below the hood's rim) and
// the head's box moved to HEAD_AT so the head looks out of the hood's open
// front. The body's origin (low in the body, under the hips) is where the
// bug's local frame starts; it is x forward, y down.
//
const URL = 'forest/apple_bug.png'
const GRAIN_SEED = 6501
const SHELL = { x: 64, y: 119, w: 596, h: 323 }
const SHELL_AT = { x: 64, y: 154 }
const BODY = { x: 654, y: 215, w: 499, h: 214 }
const BODY_AT = { x: 150, y: 280 }
const HEAD = { x: 1178, y: 211, w: 271, h: 218 }
const HEAD_AT = { x: 555, y: 250 }
const BODY_ORIGIN = { x: 395, y: 480 }
//
// On the head's box (sheet px): the neck at the back of the head it turns
// round, the mouth low on its front the tongue comes out of and the bases
// of the near and far antennae on its crown (the far one a little further
// back).
//
const NECK = { x: 1215, y: 330 }
const MOUTH = { x: 1430, y: 385 }
const ANTENNA_NEAR_ON_HEAD = { x: 1345, y: 232 }
const ANTENNA_FAR_ON_HEAD = { x: 1300, y: 225 }
//
// Antennae: both rise from their base at the lower end and bend forward
// (the far one lower and flatter).
//
const ANTENNA_NEAR = { x: 1481, y: 230, w: 155, h: 170, base: { x: 1498, y: 384 } }
const ANTENNA_FAR = { x: 1551, y: 287, w: 159, h: 127, base: { x: 1565, y: 398 } }
//
// The leg's pieces (thigh, curled foot): box, proximal joint a and distal
// joint b on the sheet. The foot's b is its tip on the ground.
//
const LEG_PIECES = [
  { x: 174, y: 504, w: 135, h: 163, a: { x: 275, y: 529 }, b: { x: 199, y: 636 } },
  { x: 194, y: 675, w: 69, h: 126, a: { x: 231, y: 694 }, b: { x: 224, y: 794 } }
]
//
// The legs are baked this much smaller than the sheet draws them next to
// the body: slim, short legs that keep the bug low over the ground.
//
const LEG_SCALE = 0.55
//
// Its eight legs, four a side, rear to front, near side then far side: hip
// high in the body (assembled px), place along the body (-1 rear, 0 middle,
// 1 front) and step group (neighbours on a side and the legs across from
// them step in turn).
//
const LEGS = [
  { hip: { x: 230, y: 445 }, place: -1, far: false, group: 0 },
  { hip: { x: 340, y: 445 }, place: -0.4, far: false, group: 1 },
  { hip: { x: 450, y: 445 }, place: 0.3, far: false, group: 0 },
  { hip: { x: 560, y: 445 }, place: 1, far: false, group: 1 },
  { hip: { x: 255, y: 433 }, place: -1, far: true, group: 1 },
  { hip: { x: 365, y: 433 }, place: -0.4, far: true, group: 0 },
  { hip: { x: 475, y: 433 }, place: 0.3, far: true, group: 1 },
  { hip: { x: 585, y: 433 }, place: 1, far: true, group: 0 }
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
 *   place, far, step group, the shared pieces round their proximal joints with their axis angle and
 *   length), the neck, mouth and antenna bases, and the shell's box (null if
 *   the picture failed to load)
 */
export async function load(k, shellWidth) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const scale = shellWidth / SHELL.w
  const rects = [SHELL, BODY, HEAD, ANTENNA_NEAR, ANTENNA_FAR, ...LEG_PIECES]
  const cuts = cutSheetPieces(img, rects)
  const atlas = createCanvasAtlasBuilder()
  const firstLegPart = rects.length - LEG_PIECES.length
  const parts = cuts.map((cut, i) => {
    const canvas = scalePart(cut, i >= firstLegPart ? scale * LEG_SCALE : scale, GRAIN_SEED + i)
    return { tile: atlas.register(canvas), rect: rects[i] }
  })
  atlas.build(k)
  const legPieces = LEG_PIECES.map((piece, i) => legPiece(piece, parts[firstLegPart + i], scale * LEG_SCALE))
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
      group: leg.group,
      pieces: legPieces
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
