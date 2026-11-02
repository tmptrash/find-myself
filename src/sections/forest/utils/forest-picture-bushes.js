import { shuffledCopy } from '../../../utils/helper.js'
import { loadPictureImage, wipePictureFringe } from './forest-picture.js'
//
// Bushes of the parallax rows, cut from pictures (their stray backdrop
// fringe wiped): the near row from assets/forest/bushes.png, the middle row
// from assets/forest/bushes_mid.png. A row is a hedge of a sheet's bushes in turn (each
// round in a new random order), each a little bigger or smaller and some
// mirrored, overlapping their neighbours, their bottoms sunk a little under
// the ground line. The row's baked canvas then gets its depth blur, grade
// and haze. The sheets start loading with this module (game boot).
//
export const BUSH_SHEET = { NEAR: 'near', MID: 'mid' }
//
// The bushes on each sheet (px).
//
const NEAR_BUSHES = [
  { x: 79, y: 193, w: 423, h: 154 },
  { x: 566, y: 166, w: 321, h: 188 },
  { x: 964, y: 204, w: 409, h: 149 },
  { x: 1438, y: 126, w: 274, h: 226 },
  { x: 64, y: 408, w: 381, h: 202 },
  { x: 485, y: 439, w: 392, h: 167 },
  { x: 934, y: 401, w: 403, h: 214 },
  { x: 1380, y: 475, w: 335, h: 133 },
  { x: 62, y: 694, w: 422, h: 139 },
  { x: 554, y: 678, w: 335, h: 147 },
  { x: 965, y: 710, w: 392, h: 120 },
  { x: 1410, y: 671, w: 314, h: 161 }
]
const MID_BUSHES = [
  { x: 48, y: 262, w: 305, h: 159 },
  { x: 377, y: 217, w: 300, h: 204 },
  { x: 700, y: 271, w: 289, h: 147 },
  { x: 1012, y: 238, w: 289, h: 181 },
  { x: 1325, y: 243, w: 308, h: 176 },
  { x: 47, y: 513, w: 317, h: 191 },
  { x: 390, y: 526, w: 280, h: 175 },
  { x: 694, y: 496, w: 293, h: 203 },
  { x: 1009, y: 573, w: 307, h: 130 },
  { x: 1333, y: 499, w: 300, h: 203 }
]
const SHEETS = {
  [BUSH_SHEET.NEAR]: { url: 'forest/bushes.png', bushes: NEAR_BUSHES },
  [BUSH_SHEET.MID]: { url: 'forest/bushes_mid.png', bushes: MID_BUSHES }
}
//
// Per bush: its size varies this much around the row's scale, this share is
// mirrored, the next one starts STEP_MIN..STEP_MIN+STEP_RANGE of its width
// further on, and its bottom sinks SINK_SHARE of its height into the ground.
//
const SCALE_JITTER = 0.12
const MIRROR_SHARE = 0.5
const STEP_MIN = 0.5
const STEP_RANGE = 0.3
const SINK_SHARE = 0.08
const pictures = Object.fromEntries(Object.entries(SHEETS).map(([id, sheet]) =>
  [id, loadPictureImage(sheet.url).then(img => img && wipePictureFringe(img))]))
const ready = {}

/**
 * Waits for every bush sheet (once per page).
 * @returns {Promise<void>}
 */
export async function loadForestPictureBushes() {
  await Promise.all(Object.entries(pictures).map(async ([id, picture]) => { ready[id] ??= await picture }))
}

/**
 * Draws a hedge of picture bushes along the ground line (nothing until
 * loadForestPictureBushes() has resolved).
 * @param {CanvasRenderingContext2D} ctx - The row's canvas (world coordinates)
 * @param {string} sheetId - BUSH_SHEET.*
 * @param {number} x1 - Hedge left X
 * @param {number} x2 - Hedge right X
 * @param {number} baseY - Ground line Y
 * @param {number} scale - World px per sheet px
 */
export function drawForestPictureBushes(ctx, sheetId, x1, x2, baseY, scale) {
  const sheet = ready[sheetId]
  if (!sheet) return
  const bushes = SHEETS[sheetId].bushes
  let round = []
  let x = x1
  ctx.save()
  ctx.imageSmoothingQuality = 'high'
  while (x < x2) {
    round.length || (round = shuffledCopy(bushes))
    const bush = round.pop()
    const s = scale * (1 + (Math.random() * 2 - 1) * SCALE_JITTER)
    const w = bush.w * s
    const h = bush.h * s
    const mirror = Math.random() < MIRROR_SHARE ? -1 : 1
    ctx.save()
    ctx.translate(x + w / 2, baseY + h * SINK_SHARE)
    ctx.scale(mirror, 1)
    ctx.drawImage(sheet, bush.x, bush.y, bush.w, bush.h, -w / 2, -h, w, h)
    ctx.restore()
    x += w * (STEP_MIN + Math.random() * STEP_RANGE)
  }
  ctx.restore()
}
