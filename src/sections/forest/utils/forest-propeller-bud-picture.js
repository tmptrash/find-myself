import { loadPictureImage, cutSheetPieces } from './forest-picture.js'
import { FOREST_LAYER_GRADE, applyForestLayerGradeToCanvas, applyForestFilmGrainToCanvas } from './forest-parallax-grain.js'
import { forestFilmGrainBlockPxForTier } from './forest-pixel-density.js'
import { createCanvasAtlasBuilder } from '../../../utils/helper.js'

//
// Parts of the propeller bud cut from assets/forest/propeller.png: six
// frames of its spinning seed propeller, its leafy cone body and its
// hooded head (black eyes painted in, turned a little to the right), baked at
// world size into one atlas once per live k, graded and grained like the
// forest's other baked material. The picture starts loading with this
// module (game boot).
//
// Assembled (sheet px) the bud stands on FEET, a little above the cone's
// tip so it tucks into the ground; the head's middle sits at HEAD_AT so
// its bottom covers the cone's neck (the head is drawn over the body), and
// the stalk grows out of CROWN, right over the feet. NECK is where the
// head meets the body. Its local frame starts at the feet, x right, y down.
//
const URL = 'forest/propeller.png'
const GRAIN_SEED = 7301
const BODY = { x: 300, y: 645, w: 342, h: 400 }
const HEAD = { x: 836, y: 713, w: 276, h: 250 }
const HEAD_MID = { x: 973, y: 839 }
const HEAD_R = 120
const FEET = { x: 471, y: 989 }
const HEAD_AT = { x: 460, y: 613 }
const CROWN_Y = 495
const NECK_Y = 715
//
// The painted black eyes on the head (sheet px): where a pupil rests, how
// far it may roam inside the black (rx, ry) and its own size (pr). The
// near eye is wide, the far one narrow.
// A pupil is only a few world px across, too small for the crisp engine
// to raster round, so each is baked as a smoothed disc with PUPIL_PAD px
// of clear room for its soft edge and drawn 1:1.
//
const EYES = [
  { x: 958, y: 872, rx: 15, ry: 7, pr: 8 },
  { x: 1072, y: 874, rx: 5, ry: 8, pr: 7 }
]
const PUPIL_PAD = 1
//
// Propeller frames from flat (the rest pose) round half a turn: box and the
// hub's middle on the sheet. The propeller draws at PROP_SCALE of the bud.
//
const PROP_FRAMES = [
  { x: 62, y: 132, w: 403, h: 98, hub: { x: 266, y: 184 } },
  { x: 552, y: 67, w: 341, h: 226, hub: { x: 725, y: 179 } },
  { x: 1092, y: 30, w: 220, h: 300, hub: { x: 1204, y: 178 } },
  { x: 203, y: 306, w: 108, h: 329, hub: { x: 262, y: 464 } },
  { x: 615, y: 316, w: 213, h: 306, hub: { x: 726, y: 462 } },
  { x: 1012, y: 355, w: 342, h: 231, hub: { x: 1186, y: 463 } }
]
const PROP_SCALE = 0.875
const image = loadPictureImage(URL)
const bakedByK = new WeakMap()

/**
 * Bakes the bud's parts once per live k into one atlas (waits for the
 * picture to load). Every part comes with the anchor ({ x, y } in -1..1
 * across its tile) of the point it is drawn round, and every point in the
 * bud's local frame (world px from its feet, x right, y down).
 * @param {Object} k - Kaplay instance
 * @param {number} headSize - World px across the head
 * @param {string} pupilHex - Pupil colour ("#xxxxxx")
 * @returns {Promise<Object|null>} Baked parts: body round the feet, head
 *   round its middle (headAt, headR), the crown and neck heights, the
 *   eyes (pupil rest point, roam radii, pupil tile) and the
 *   propeller frames round their hubs (null if the picture failed to load)
 */
export async function load(k, headSize, pupilHex) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const img = await image
  if (!img) return null
  const scale = headSize / (HEAD_R * 2)
  const rects = [BODY, HEAD, ...PROP_FRAMES]
  const scales = [scale, scale, ...PROP_FRAMES.map(() => scale * PROP_SCALE)]
  const cuts = cutSheetPieces(img, rects)
  const atlas = createCanvasAtlasBuilder()
  const tiles = cuts.map((cut, i) => atlas.register(scalePart(cut, scales[i], GRAIN_SEED + i)))
  const pupilTiles = EYES.map((eye, i) => atlas.register(bakePupil(eye.pr * scale, pupilHex, GRAIN_SEED + rects.length + i)))
  atlas.build(k)
  const frameTiles = tiles.slice(2)
  const out = {
    body: { tile: tiles[0], anchor: anchorOf(BODY, FEET) },
    head: { tile: tiles[1], anchor: anchorOf(HEAD, HEAD_MID) },
    headAt: toLocal(HEAD_AT, scale),
    headR: HEAD_R * scale,
    crownY: (CROWN_Y - FEET.y) * scale,
    neckY: (NECK_Y - FEET.y) * scale,
    eyes: EYES.map((eye, i) => ({ at: toLocal(onBud(eye), scale), rx: eye.rx * scale, ry: eye.ry * scale, pupil: pupilTiles[i] })),
    frames: PROP_FRAMES.map((frame, i) => ({ tile: frameTiles[i], anchor: anchorOf(frame, frame.hub) }))
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
// A smoothed disc of the given world radius in the middle of its canvas,
// grained like the rest of the bud.
//
function bakePupil(radius, hex, seed) {
  const canvas = document.createElement('canvas')
  const size = Math.ceil(radius * 2) + PUPIL_PAD * 2
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = hex
  ctx.beginPath()
  ctx.arc(size / 2, size / 2, radius, 0, Math.PI * 2)
  ctx.fill()
  applyForestFilmGrainToCanvas(canvas, seed)
  return canvas
}
//
// The anchor of a point on a sheet box, in -1..1 across it.
//
function anchorOf(box, point) {
  return { x: (point.x - box.x) / box.w * 2 - 1, y: (point.y - box.y) / box.h * 2 - 1 }
}
//
// A point on the head's sheet piece, moved to where the head sits on the bud.
//
function onBud(p) {
  return { x: p.x - HEAD_MID.x + HEAD_AT.x, y: p.y - HEAD_MID.y + HEAD_AT.y }
}
function toLocal(p, scale) {
  return { x: (p.x - FEET.x) * scale, y: (p.y - FEET.y) * scale }
}
