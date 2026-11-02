import { drawFernToCanvas, fernBounds } from '../../../utils/draw-fern.js'
import { loadPictureImage, wipePictureFringe } from './forest-picture.js'
//
// Forest ferns cut from assets/forest/ferns.png (its stray backdrop fringe
// wiped): drop-in for drawFernToCanvas / fernBounds. Each call picks one of
// the sheet's ferns with its seeded random (mirrored at random) and stands
// it on the base point, as tall as the asked frond length. Until the sheet
// has loaded the procedural fern is drawn instead. The sheet starts loading
// with this module (game boot) and is prepared once per page.
//
const URL = 'forest/ferns.png'
//
// The ferns on the sheet (px).
//
const FERNS = [
  { x: 46, y: 37, w: 115, h: 99 },
  { x: 221, y: 42, w: 153, h: 95 },
  { x: 429, y: 50, w: 158, h: 88 },
  { x: 642, y: 40, w: 138, h: 97 },
  { x: 831, y: 39, w: 144, h: 97 },
  { x: 1029, y: 40, w: 120, h: 98 },
  { x: 1225, y: 54, w: 127, h: 81 },
  { x: 1403, y: 28, w: 146, h: 109 },
  { x: 1602, y: 34, w: 147, h: 102 },
  { x: 1785, y: 44, w: 176, h: 92 },
  { x: 2000, y: 39, w: 129, h: 97 },
  { x: 431, y: 176, w: 150, h: 94 },
  { x: 626, y: 187, w: 150, h: 83 },
  { x: 52, y: 186, w: 136, h: 85 },
  { x: 245, y: 176, w: 125, h: 96 },
  { x: 840, y: 177, w: 121, h: 95 },
  { x: 1011, y: 180, w: 166, h: 91 },
  { x: 1226, y: 189, w: 123, h: 82 },
  { x: 1419, y: 186, w: 119, h: 86 },
  { x: 1599, y: 180, w: 137, h: 91 },
  { x: 1784, y: 191, w: 150, h: 80 },
  { x: 1984, y: 188, w: 149, h: 84 },
  { x: 56, y: 310, w: 125, h: 97 },
  { x: 247, y: 318, w: 148, h: 88 },
  { x: 450, y: 313, w: 145, h: 93 },
  { x: 648, y: 311, w: 118, h: 95 },
  { x: 826, y: 329, w: 134, h: 78 },
  { x: 1025, y: 309, w: 122, h: 98 },
  { x: 1212, y: 313, w: 131, h: 95 },
  { x: 1405, y: 322, w: 143, h: 84 },
  { x: 1595, y: 315, w: 156, h: 92 },
  { x: 1808, y: 313, w: 134, h: 94 },
  { x: 2003, y: 314, w: 123, h: 93 },
  { x: 41, y: 459, w: 139, h: 80 },
  { x: 246, y: 454, w: 124, h: 87 },
  { x: 446, y: 448, w: 117, h: 93 },
  { x: 619, y: 463, w: 140, h: 76 },
  { x: 815, y: 448, w: 145, h: 92 },
  { x: 1025, y: 455, w: 124, h: 85 },
  { x: 1203, y: 462, w: 152, h: 78 },
  { x: 1419, y: 450, w: 119, h: 91 },
  { x: 1611, y: 464, w: 133, h: 77 },
  { x: 1803, y: 457, w: 130, h: 83 },
  { x: 1989, y: 470, w: 143, h: 70 },
  { x: 47, y: 577, w: 124, h: 98 },
  { x: 233, y: 588, w: 138, h: 86 },
  { x: 442, y: 579, w: 130, h: 94 },
  { x: 641, y: 579, w: 120, h: 97 },
  { x: 833, y: 585, w: 141, h: 91 },
  { x: 1030, y: 579, w: 117, h: 97 },
  { x: 1207, y: 583, w: 158, h: 90 },
  { x: 1412, y: 580, w: 134, h: 94 },
  { x: 1617, y: 580, w: 121, h: 96 },
  { x: 1793, y: 600, w: 153, h: 77 },
  { x: 1997, y: 584, w: 135, h: 92 }
]
//
// A fern is FERN_HEIGHT_PER_SIZE of the asked size tall, its foot sunk
// FERN_SINK_SHARE of its height into the ground; it is never wider than
// FERN_MAX_ASPECT times its height (bounds), and is mirrored at
// FERN_MIRROR_SHARE.
//
const FERN_HEIGHT_PER_SIZE = 1
const FERN_SINK_SHARE = 0.04
const FERN_MAX_ASPECT = 2.1
const FERN_MIRROR_SHARE = 0.5
const FERN_BOUNDS_PAD = 4
//
// Each fern is cut with this much of the sheet round its rect, so its soft
// leaf tips are kept (neighbours are far further apart).
//
const FERN_CUT_PAD = 3
const picture = loadPictureImage(URL).then(img => img && wipePictureFringe(img))
let sheet = null

/**
 * Waits for the fern sheet (once per page).
 * @returns {Promise<void>}
 */
export async function loadForestFerns() {
  sheet ??= await picture
}

/**
 * Paints one fern rooted at (x, baseY), same options as drawFernToCanvas
 * (colours only matter for the procedural fallback).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.x - Base X
 * @param {number} opts.baseY - Base Y (ground contact)
 * @param {number} opts.size - Fern height (px)
 * @param {() => number} opts.rng - Seeded random in [0, 1)
 * @param {Object} opts.colors - Procedural fern colours (fallback)
 */
export function drawForestFern(ctx, opts) {
  if (!sheet) return drawFernToCanvas(ctx, opts)
  const { x, baseY, size, rng } = opts
  const fern = FERNS[Math.floor(rng() * FERNS.length)]
  const scale = size * FERN_HEIGHT_PER_SIZE / fern.h
  const mirror = rng() < FERN_MIRROR_SHARE ? -1 : 1
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  ctx.translate(x, baseY + fern.h * scale * FERN_SINK_SHARE)
  ctx.scale(scale * mirror, scale)
  const pad = FERN_CUT_PAD
  ctx.drawImage(sheet, fern.x - pad, fern.y - pad, fern.w + pad * 2, fern.h + pad * 2, -fern.w / 2 - pad, -fern.h - pad, fern.w + pad * 2, fern.h + pad * 2)
  ctx.restore()
}

/**
 * Conservative world bounds of a fern (for bake canvases), same as fernBounds.
 * @param {number} x - Base X
 * @param {number} baseY - Base Y
 * @param {number} size - Fern height (px)
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
export function forestFernBounds(x, baseY, size) {
  if (!sheet) return fernBounds(x, baseY, size)
  const h = size * FERN_HEIGHT_PER_SIZE
  const half = h * FERN_MAX_ASPECT / 2 + FERN_BOUNDS_PAD
  return { x1: x - half, y1: baseY - h - FERN_BOUNDS_PAD, x2: x + half, y2: baseY + FERN_BOUNDS_PAD }
}
