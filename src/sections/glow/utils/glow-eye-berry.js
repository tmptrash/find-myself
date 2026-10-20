import * as PolyBatch from '../../../utils/poly-batch.js'
import { getRGB } from '../../../utils/helper.js'
import { GLOW_PAL } from './glow-palette.js'
//
// Shared look of the island eye-flower and the stalk-eyes on the right:
// white eye-berries with a shaded underside and a dark pupil on red,
// contoured stalks with a lit line.
//
//
// Sun from the upper-left — shaded disc at centre, lit face up-left (berries,
// loader eye, canopy apples).
//
export const GLOW_SUN_LIT_OFFSET_X = -0.14
export const GLOW_SUN_LIT_OFFSET_Y = -0.22
export const GLOW_SUN_LIT_FRAC = 0.86
const BERRY_LID_SPAN = 0.85
const BERRY_LID_W = 1.1
const COLOR_KEYS = ['contour', 'berry', 'berryShade', 'pupil', 'stem', 'stemLight']
const colorCache = new WeakMap()

/**
 * Kaplay rgb colours of the eye-berry look, resolved once per live Kaplay inst.
 * @param {Object} k - Kaplay inst
 * @returns {{ contour: Object, berry: Object, berryShade: Object, pupil: Object, stem: Object, stemLight: Object }}
 */
export function glowEyeBerryColors(k) {
  let colors = colorCache.get(k)
  if (colors) return colors
  const pal = GLOW_PAL.glowEyeFlower
  colors = Object.fromEntries(COLOR_KEYS.map(key => [key, getRGB(k, pal[key])]))
  colorCache.set(k, colors)
  return colors
}

/**
 * Queues one eye-berry: contour ring, shaded underside, lit face, then the pupil.
 * @param {Object} batch - PolyBatch inst
 * @param {number} x - Berry centre X
 * @param {number} y - Berry centre Y
 * @param {number} r - Berry radius
 * @param {number} pupilX - Pupil centre X
 * @param {number} pupilY - Pupil centre Y
 * @param {number} pupilR - Pupil radius
 * @param {Object} colors - From glowEyeBerryColors()
 * @param {number} contourW - Contour ring width
 */
export function addEyeBerry(batch, x, y, r, pupilX, pupilY, pupilR, colors, contourW) {
  addBerryBall(batch, x, y, r, colors, contourW)
  PolyBatch.addDisc(batch, pupilX, pupilY, pupilR, colors.pupil)
}

/**
 * Queues a shut eye-berry: the same ball with a contour lid line across it.
 * @param {Object} batch - PolyBatch inst
 * @param {number} x - Berry centre X
 * @param {number} y - Berry centre Y
 * @param {number} r - Berry radius
 * @param {Object} colors - From glowEyeBerryColors()
 * @param {number} contourW - Contour ring width
 */
export function addClosedEyeBerry(batch, x, y, r, colors, contourW) {
  addBerryBall(batch, x, y, r, colors, contourW)
  PolyBatch.addLine(batch, x - r * BERRY_LID_SPAN, y, x + r * BERRY_LID_SPAN, y, BERRY_LID_W, colors.contour)
}

/**
 * Queues one round-jointed tapered polyline pass (run it once in the contour
 * colour, wider, then once in the fill colour).
 * @param {Object} batch - PolyBatch inst
 * @param {Array<{x: number, y: number}>} pts - Path points, root first
 * @param {number} wBase - Width at the root
 * @param {number} wTip - Width at the tip
 * @param {Object} color - Kaplay rgb
 */
export function addTaperedPass(batch, pts, wBase, wTip, color) {
  const last = pts.length - 1
  for (let i = 0; i < last; i++) {
    const w = wBase + (wTip - wBase) * (i / last)
    PolyBatch.addLine(batch, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y, w, color)
    PolyBatch.addDisc(batch, pts[i + 1].x, pts[i + 1].y, w * 0.5, color)
  }
}

function addBerryBall(batch, x, y, r, colors, contourW) {
  PolyBatch.addDisc(batch, x, y, r + contourW, colors.contour)
  PolyBatch.addDisc(batch, x, y, r, colors.berryShade)
  PolyBatch.addDisc(
    batch,
    x + r * GLOW_SUN_LIT_OFFSET_X,
    y + r * GLOW_SUN_LIT_OFFSET_Y,
    r * GLOW_SUN_LIT_FRAC,
    colors.berry
  )
}
