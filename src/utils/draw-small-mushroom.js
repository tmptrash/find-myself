import { paintForestContactShadow } from '../sections/forest/utils/forest-atmosphere.js'
//
// Canvas2D small forest mushrooms: slender cream mushrooms in little groups
// and a single red spotted cap. Distinct from draw-mushroom.js (the chunky
// decor / trampoline cap), these read as ordinary ground fungi.
//
const MUSH_COUNT_MIN = 2
const MUSH_COUNT_RANGE = 3
const MUSH_SPREAD = 11
const MUSH_STEM_H_MIN = 6
const MUSH_STEM_H_RANGE = 11
const MUSH_CAP_W_MIN = 7
const MUSH_CAP_W_RANGE = 6
const MUSH_CAP_H_FRAC = 0.55
const MUSH_STEM_W_FRAC = 0.32
const MUSH_STEM_BASE_HALF = 0.55
const MUSH_STEM_MID_HALF = 0.3
const MUSH_STEM_TOP_HALF = 0.35
const MUSH_LEAN_MAX = 0.16
const MUSH_OUTLINE_PX = 1
const MUSH_GILL_H_FRAC = 0.24
const MUSH_HIGHLIGHT_ALPHA = 0.7
const MUSH_BOUNDS_PAD = 4
const SPOT_CAP_W = 15
const SPOT_CAP_H = 8
const SPOT_STEM_H = 9
const SPOT_STEM_W = 5
const SPOT_DOTS = [[-0.22, -0.55, 1.4], [0.15, -0.72, 1.2], [0.3, -0.35, 1.1], [-0.02, -0.3, 1]]

/**
 * Paints two to four slender cream mushrooms around x; taller ones behind.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.x - Group centre X
 * @param {number} opts.baseY - Ground Y
 * @param {() => number} opts.rng - Seeded random in [0, 1)
 * @param {Object} opts.colors - Hex colours
 * @param {string} opts.colors.cap - Cap
 * @param {string} opts.colors.capLight - Cap highlight
 * @param {string} opts.colors.gill - Cap underside
 * @param {string} opts.colors.stem - Stem
 * @param {string} opts.colors.outline - Contour
 */
export function drawSmallMushroomGroupToCanvas(ctx, opts) {
  const { x, baseY, rng, colors } = opts
  colors.contactShadow && paintForestContactShadow(ctx, x, baseY, MUSH_SPREAD * 1.35, 4.2, colors.contactShadow)
  const count = MUSH_COUNT_MIN + Math.floor(rng() * MUSH_COUNT_RANGE)
  const shrooms = []
  for (let i = 0; i < count; i++) {
    shrooms.push({
      x: x + (rng() - 0.5) * 2 * MUSH_SPREAD,
      stemH: MUSH_STEM_H_MIN + rng() * MUSH_STEM_H_RANGE,
      capW: MUSH_CAP_W_MIN + rng() * MUSH_CAP_W_RANGE,
      lean: (rng() - 0.5) * 2 * MUSH_LEAN_MAX
    })
  }
  shrooms.sort((a, b) => b.stemH - a.stemH)
  shrooms.forEach(s => paintSmallMushroom(ctx, s, baseY, colors))
}

/**
 * Conservative world bounds of a small mushroom group.
 * @param {number} x - Group centre X
 * @param {number} baseY - Ground Y
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
export function smallMushroomGroupBounds(x, baseY) {
  const reach = MUSH_STEM_H_MIN + MUSH_STEM_H_RANGE + MUSH_CAP_W_MIN + MUSH_CAP_W_RANGE
  return { x1: x - MUSH_SPREAD - reach, y1: baseY - reach - MUSH_BOUNDS_PAD, x2: x + MUSH_SPREAD + reach, y2: baseY + MUSH_BOUNDS_PAD }
}

/**
 * Paints one red spotted mushroom (rare accent).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.x - Stem X
 * @param {number} opts.baseY - Ground Y
 * @param {Object} opts.colors - Hex colours
 * @param {string} opts.colors.cap - Red cap
 * @param {string} opts.colors.capLight - Cap highlight
 * @param {string} opts.colors.dot - Cap spots
 * @param {string} opts.colors.stem - Stem
 * @param {string} opts.colors.outline - Contour
 */
export function drawSpottedMushroomToCanvas(ctx, opts) {
  const { x, baseY, colors } = opts
  const topY = baseY - SPOT_STEM_H
  ctx.lineWidth = MUSH_OUTLINE_PX
  ctx.strokeStyle = colors.outline
  ctx.fillStyle = colors.stem
  ctx.beginPath()
  ctx.moveTo(x - SPOT_STEM_W * MUSH_STEM_BASE_HALF, baseY)
  ctx.lineTo(x - SPOT_STEM_W * 0.4, topY)
  ctx.lineTo(x + SPOT_STEM_W * 0.4, topY)
  ctx.lineTo(x + SPOT_STEM_W * MUSH_STEM_BASE_HALF, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = colors.cap
  ctx.beginPath()
  ctx.ellipse(x, topY, SPOT_CAP_W / 2, SPOT_CAP_H, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = colors.capLight
  ctx.beginPath()
  ctx.ellipse(x - SPOT_CAP_W * 0.15, topY - SPOT_CAP_H * 0.6, SPOT_CAP_W * 0.2, SPOT_CAP_H * 0.22, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = colors.dot
  SPOT_DOTS.forEach(([dx, dy, r]) => {
    ctx.beginPath()
    ctx.arc(x + dx * SPOT_CAP_W, topY + dy * SPOT_CAP_H, r, 0, Math.PI * 2)
    ctx.fill()
  })
}
//
// Curved stem, gill band, dome cap and a soft highlight, cap tilted with the lean.
//
function paintSmallMushroom(ctx, s, baseY, colors) {
  const capH = s.capW * MUSH_CAP_H_FRAC
  const stemW = s.capW * MUSH_STEM_W_FRAC
  const topX = s.x + Math.sin(s.lean) * s.stemH
  const topY = baseY - Math.cos(s.lean) * s.stemH
  const midY = (baseY + topY) / 2
  ctx.lineWidth = MUSH_OUTLINE_PX
  ctx.strokeStyle = colors.outline
  ctx.fillStyle = colors.stem
  ctx.beginPath()
  ctx.moveTo(s.x - stemW * MUSH_STEM_BASE_HALF, baseY)
  ctx.quadraticCurveTo(s.x - stemW * MUSH_STEM_MID_HALF, midY, topX - stemW * MUSH_STEM_TOP_HALF, topY)
  ctx.lineTo(topX + stemW * MUSH_STEM_TOP_HALF, topY)
  ctx.quadraticCurveTo(s.x + stemW * MUSH_STEM_MID_HALF, midY, s.x + stemW * MUSH_STEM_BASE_HALF, baseY)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.save()
  ctx.translate(topX, topY)
  ctx.rotate(s.lean)
  ctx.fillStyle = colors.gill
  ctx.beginPath()
  ctx.ellipse(0, 0, s.capW / 2, capH * MUSH_GILL_H_FRAC + 1, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.stroke()
  ctx.fillStyle = colors.cap
  ctx.beginPath()
  ctx.ellipse(0, 0, s.capW / 2, capH, 0, Math.PI, 0)
  ctx.closePath()
  ctx.fill()
  ctx.stroke()
  ctx.globalAlpha = MUSH_HIGHLIGHT_ALPHA
  ctx.fillStyle = colors.capLight
  ctx.beginPath()
  ctx.ellipse(-s.capW * 0.14, -capH * 0.55, s.capW * 0.18, capH * 0.26, -0.3, 0, Math.PI * 2)
  ctx.fill()
  ctx.globalAlpha = 1
  ctx.restore()
}
