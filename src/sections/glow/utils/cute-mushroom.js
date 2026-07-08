import { glowRgb } from './glow-palette.js'

//
// Cute chubby mushroom drawing primitive for the glow section: a cream blob
// body under a rounded wavy-edged spotted cap, with an optional blushy face
// (eyes + smile). Ported from a 420x420 Canvas2D reference sketch and
// normalized so callers control the size and the palette colours. The face
// is baked in two variants (eyes open / eyes closed) so blinking can be done
// programmatically by swapping sprites.
//
// Reference geometry (original sketch coordinates, CX = 210).
//
const REF_CX = 210
const REF_BASE_Y = 354
const REF_WIDTH = 264
const REF_HEIGHT = 228
//
// Shading / detail alphas from the reference sketch.
//
const BODY_SHADE_ALPHA = 0.35
const CAP_BOTTOM_SHADE_ALPHA = 0.4
const CAP_SIDE_SHADE_ALPHA = 0.35
const CAP_HIGHLIGHT_ALPHA = 0.5
const BLUSH_ALPHA = 0.55
//
// Stroke widths in reference pixels (scaled with the mushroom).
//
const BODY_LINE_WIDTH = 5
const CAP_LINE_WIDTH = 6
const MOUTH_LINE_WIDTH = 3.4
const CLOSED_EYE_LINE_WIDTH = 3
const MIN_LINE_WIDTH = 1
//
// White cap spots: [refX, refY, refRadius].
//
const SPOTS = [
  [REF_CX - 72, 186, 17], [REF_CX - 18, 154, 13], [REF_CX + 42, 170, 19],
  [REF_CX + 92, 222, 12], [REF_CX - 102, 238, 11], [REF_CX - 38, 222, 8],
  [REF_CX + 16, 210, 7], [REF_CX + 66, 260, 9], [REF_CX - 64, 266, 12],
  [REF_CX + 2, 266, 10]
]
//
// Overall height/width ratio — callers size their canvases with this.
//
export const CUTE_MUSHROOM_ASPECT = REF_HEIGHT / REF_WIDTH

/**
 * Draws one cute mushroom onto a 2D canvas context.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.cx - Horizontal centre of the mushroom (canvas px)
 * @param {number} opts.baseY - Bottom Y of the body (canvas px)
 * @param {number} opts.width - Full cap width (canvas px); height follows CUTE_MUSHROOM_ASPECT
 * @param {Object} opts.colors - Palette hex set: body, bodyShade, cap, capDark, capLight, spot, outline, face, blush
 * @param {boolean} [opts.withFace=false] - Draw the eyes/smile/blush face
 * @param {boolean} [opts.eyesOpen=true] - Face variant: open pupils or closed-arc eyelids
 */
export function drawCuteMushroomToCanvas(ctx, opts) {
  const { cx, baseY, width, colors, withFace = false, eyesOpen = true } = opts
  const s = width / REF_WIDTH
  const inst = {
    ctx,
    s,
    //
    // Reference-to-canvas coordinate mappers.
    //
    x: (v) => cx + (v - REF_CX) * s,
    y: (v) => baseY + (v - REF_BASE_Y) * s,
    colors
  }
  ctx.save()
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  drawBody(inst)
  drawCap(inst)
  drawSpots(inst)
  withFace && drawFace(inst, eyesOpen)
  ctx.restore()
}
//
// Converts a palette hex into a css rgb()/rgba() string.
//
function css(hex, alpha = 1) {
  const c = glowRgb(hex)
  return alpha >= 1 ? `rgb(${c.r}, ${c.g}, ${c.b})` : `rgba(${c.r}, ${c.g}, ${c.b}, ${alpha})`
}
//
// Chubby cream body blob with a soft shade on the right side.
//
function drawBody(inst) {
  const { ctx, s, x, y, colors } = inst
  tracePath(inst, bodyPath)
  ctx.fillStyle = css(colors.body)
  ctx.fill()
  ctx.lineWidth = Math.max(MIN_LINE_WIDTH, BODY_LINE_WIDTH * s)
  ctx.strokeStyle = css(colors.outline)
  ctx.stroke()
  ctx.save()
  tracePath(inst, bodyPath)
  ctx.clip()
  ctx.beginPath()
  ctx.ellipse(x(REF_CX + 58), y(320), 48 * s, 70 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = css(colors.bodyShade, BODY_SHADE_ALPHA)
  ctx.fill()
  ctx.restore()
}
//
// Rounded cap dome with a wavy bottom edge, shaded bottom/side and a soft
// top-left highlight.
//
function drawCap(inst) {
  const { ctx, s, x, y, colors } = inst
  tracePath(inst, capPath)
  ctx.fillStyle = css(colors.cap)
  ctx.fill()
  ctx.lineWidth = Math.max(MIN_LINE_WIDTH, CAP_LINE_WIDTH * s)
  ctx.strokeStyle = css(colors.outline)
  ctx.stroke()
  ctx.save()
  tracePath(inst, capPath)
  ctx.clip()
  ctx.beginPath()
  ctx.ellipse(x(REF_CX), y(320), 140 * s, 46 * s, 0, 0, Math.PI * 2)
  ctx.fillStyle = css(colors.capDark, CAP_BOTTOM_SHADE_ALPHA)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x(REF_CX + 95), y(230), 70 * s, 110 * s, 0.3, 0, Math.PI * 2)
  ctx.fillStyle = css(colors.capDark, CAP_SIDE_SHADE_ALPHA)
  ctx.fill()
  ctx.beginPath()
  ctx.ellipse(x(REF_CX - 55), y(170), 70 * s, 48 * s, -0.3, 0, Math.PI * 2)
  ctx.fillStyle = css(colors.capLight, CAP_HIGHLIGHT_ALPHA)
  ctx.fill()
  ctx.restore()
}
//
// Pale spots scattered on the cap, each clipped by the cap silhouette.
//
function drawSpots(inst) {
  const { ctx, s, x, y, colors } = inst
  ctx.save()
  tracePath(inst, capPath)
  ctx.clip()
  ctx.fillStyle = css(colors.spot)
  for (const [sx, sy, sr] of SPOTS) {
    ctx.beginPath()
    ctx.arc(x(sx), y(sy), sr * s, 0, Math.PI * 2)
    ctx.fill()
  }
  ctx.restore()
}
//
// Face on the body: two eyes (open ovals with a light glint, or closed
// smiling eyelid arcs), a small smile and blush cheeks.
//
function drawFace(inst, eyesOpen) {
  const { ctx, s, x, y, colors } = inst
  for (const ex of [REF_CX - 24, REF_CX + 24]) {
    if (eyesOpen) {
      ctx.beginPath()
      ctx.ellipse(x(ex), y(312), 5.5 * s, 7 * s, 0, 0, Math.PI * 2)
      ctx.fillStyle = css(colors.face)
      ctx.fill()
      ctx.beginPath()
      ctx.arc(x(ex + 1.6), y(309.5), 1.8 * s, 0, Math.PI * 2)
      ctx.fillStyle = css(colors.spot)
      ctx.fill()
    } else {
      //
      // Closed eye: a downward eyelid arc in the face tone.
      //
      ctx.beginPath()
      ctx.arc(x(ex), y(308), 6 * s, 0.2 * Math.PI, 0.8 * Math.PI)
      ctx.lineWidth = Math.max(MIN_LINE_WIDTH, CLOSED_EYE_LINE_WIDTH * s)
      ctx.strokeStyle = css(colors.face)
      ctx.stroke()
    }
  }
  ctx.beginPath()
  ctx.arc(x(REF_CX), y(320), 8 * s, 0.25 * Math.PI, 0.75 * Math.PI)
  ctx.lineWidth = Math.max(MIN_LINE_WIDTH, MOUTH_LINE_WIDTH * s)
  ctx.strokeStyle = css(colors.face)
  ctx.stroke()
  for (const bx of [REF_CX - 44, REF_CX + 44]) {
    ctx.beginPath()
    ctx.ellipse(x(bx), y(324), 10 * s, 6.5 * s, 0, 0, Math.PI * 2)
    ctx.fillStyle = css(colors.blush, BLUSH_ALPHA)
    ctx.fill()
  }
}
//
// Begins and traces one of the reference bezier paths in canvas coordinates.
//
function tracePath(inst, pathFn) {
  inst.ctx.beginPath()
  pathFn(inst)
  inst.ctx.closePath()
}
//
// Chubby body blob outline (reference bezier control points).
//
function bodyPath(inst) {
  const { ctx, x, y } = inst
  ctx.moveTo(x(REF_CX - 62), y(350))
  ctx.bezierCurveTo(x(REF_CX - 70), y(290), x(REF_CX - 58), y(252), x(REF_CX), y(250))
  ctx.bezierCurveTo(x(REF_CX + 58), y(252), x(REF_CX + 70), y(290), x(REF_CX + 62), y(350))
  ctx.bezierCurveTo(x(REF_CX + 40), y(358), x(REF_CX - 40), y(358), x(REF_CX - 62), y(350))
}
//
// Rounded cap dome with the wavy bottom edge (reference bezier control points).
//
function capPath(inst) {
  const { ctx, x, y } = inst
  ctx.moveTo(x(REF_CX - 118), y(288))
  ctx.bezierCurveTo(x(REF_CX - 132), y(260), x(REF_CX - 120), y(190), x(REF_CX - 70), y(154))
  ctx.bezierCurveTo(x(REF_CX - 30), y(126), x(REF_CX + 30), y(126), x(REF_CX + 70), y(154))
  ctx.bezierCurveTo(x(REF_CX + 120), y(190), x(REF_CX + 132), y(260), x(REF_CX + 118), y(288))
  ctx.bezierCurveTo(x(REF_CX + 92), y(302), x(REF_CX + 76), y(288), x(REF_CX + 52), y(296))
  ctx.bezierCurveTo(x(REF_CX + 26), y(306), x(REF_CX - 26), y(306), x(REF_CX - 52), y(296))
  ctx.bezierCurveTo(x(REF_CX - 76), y(288), x(REF_CX - 92), y(302), x(REF_CX - 118), y(288))
}
