import { GLOW_PAL } from '../sections/glow/utils/glow-palette.js'

//
// Umbrella stroller in three-quarter view (traced from the reference photo):
// the front with the footrest faces left, the cane handles curl back to the
// right. The far side frame is the near one shifted by FAR_OFFSET.
//
const STROLLER_W = 104
const STROLLER_H = 126
//
// Headroom so the far cane hook and its contour are not clipped at the top.
//
const TOP_PAD = 6
const FAR_OFFSET = { x: 20, y: -6 }
//
// Near main tube: front wheel up to the handle top; joints sit at fractions.
//
const MAIN_TUBE_BOTTOM = { x: 16, y: 104 }
const MAIN_TUBE_TOP = { x: 68, y: 16 }
const FOOTREST_T1 = 0.03
const FOOTREST_T2 = 0.14
const LOW_BRACE_T = 0.12
const SEAT_FRONT_T = 0.3
const REAR_HINGE_T = 0.44
const BACK_TOP_T = 0.82
const GRIP_START_T = 0.9
//
// Rear leg runs from the rear wheel up to the hinge on the main tube.
//
const REAR_LEG_BOTTOM = { x: 50, y: 104 }
const LOW_BRACE_REAR_Y = 92
const SEAT_REAR = { x: 47, y: 70 }
//
// Cane hook at the handle top.
//
const GRIP_CTRL = { x: 72, y: 2 }
const GRIP_END = { x: 79, y: 8 }
const GRIP_W = 5
const GRIP_OUTLINE_W = 7
const GRIP_RIB_COUNT = 5
const GRIP_RIB_HALF = 2.4
//
// Tube stroke widths (outline, body, glint).
//
const TUBE_OUTLINE_W = 3.6
const TUBE_W = 2.2
const TUBE_GLINT_W = 0.8
const TUBE_GLINT_SHIFT = 0.6
//
// Fabric sling detail.
//
const HEM_W = 3
const FOLD_COUNT = 3
const FOLD_ALPHA = 0.7
const STRAP_T = 0.45
const STRAP_W = 2.4
const BUCKLE_SIZE = 4
//
// Wheels: each corner carries a twin pair along the axle direction.
//
const WHEEL_R = 6
const WHEEL_RIM_R = 3.6
const WHEEL_HUB_R = 1.4
const WHEEL_SQUASH = 0.92
const WHEEL_TWIN_GAP = 3.6
const CASTER_H = 3
const RIVET_SIZE = 3

/**
 * Paints a detailed gray umbrella stroller (anchor bottom-centre at canvas bottom).
 * @param {CanvasRenderingContext2D} ctx - Target 2D context
 * @param {Object} colors - Hex strings, see babyStrollerGrayColors()
 */
export function drawBabyStrollerToCanvas(ctx, colors) {
  ctx.clearRect(0, 0, STROLLER_W, STROLLER_H)
  ctx.save()
  ctx.translate(0, TOP_PAD)
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const near = buildSideFrame({ x: 0, y: 0 })
  const far = buildSideFrame(FAR_OFFSET)
  const farTone = { outline: colors.outline, body: colors.farTube, shade: colors.farTubeShade }
  const nearTone = { outline: colors.outline, body: colors.tube, shade: colors.tubeShade, glint: colors.tubeGlint }
  //
  // Far side first: it sits behind the fabric and the near frame.
  //
  paintWheelCorner(ctx, far.frontWheel, far.mainBottom, colors.farTire, colors.farRim, farTone, colors)
  paintWheelCorner(ctx, far.rearWheel, far.rearBottom, colors.farTire, colors.farRim, farTone, colors)
  paintSideFrame(ctx, far, farTone)
  paintGrip(ctx, far, colors)
  //
  // Cross members linking both sides.
  //
  strokeTube(ctx, farTone, near.rearWheelTop, far.rearWheelTop)
  strokeTube(ctx, farTone, near.lowBraceFront, far.lowBraceFront)
  paintFootrest(ctx, near, far, colors)
  paintSling(ctx, near, far, colors)
  strokeTube(ctx, nearTone, near.seatFront, far.seatFront)
  strokeTube(ctx, nearTone, near.backTop, far.backTop)
  //
  // Near side on top, then strap and grips.
  //
  paintSideFrame(ctx, near, nearTone)
  paintStrap(ctx, near, far, colors)
  paintRivets(ctx, near, colors)
  paintGrip(ctx, near, colors)
  paintWheelCorner(ctx, near.frontWheel, near.mainBottom, colors.tire, colors.rim, nearTone, colors)
  paintWheelCorner(ctx, near.rearWheel, near.rearBottom, colors.tire, colors.rim, nearTone, colors)
  ctx.restore()
}

/**
 * Baked stroller sprite size in px.
 * @returns {{ w: number, h: number }}
 */
export function babyStrollerSpriteSize() {
  return { w: STROLLER_W, h: STROLLER_H }
}

/**
 * Gray stroller tones from the glowStroller palette block.
 * @returns {Object} Hex colour map for drawBabyStrollerToCanvas()
 */
export function babyStrollerGrayColors() {
  return { ...GLOW_PAL.glowStroller }
}

/**
 * Paints the stroller into a new canvas for sprite baking.
 * @param {Object} [colors] - Optional colour overrides
 * @returns {HTMLCanvasElement}
 */
export function bakeBabyStrollerCanvas(colors = babyStrollerGrayColors()) {
  const canvas = document.createElement('canvas')
  canvas.width = STROLLER_W
  canvas.height = STROLLER_H
  const ctx = canvas.getContext('2d')
  drawBabyStrollerToCanvas(ctx, colors)
  return canvas
}
//
// Key points of one side frame, shifted by the given offset.
//
function buildSideFrame(offset) {
  const shift = p => ({ x: p.x + offset.x, y: p.y + offset.y })
  const onMain = t => shift({
    x: MAIN_TUBE_BOTTOM.x + (MAIN_TUBE_TOP.x - MAIN_TUBE_BOTTOM.x) * t,
    y: MAIN_TUBE_BOTTOM.y + (MAIN_TUBE_TOP.y - MAIN_TUBE_BOTTOM.y) * t
  })
  const rearHinge = onMain(REAR_HINGE_T)
  const rearBottom = shift(REAR_LEG_BOTTOM)
  const braceT = (rearBottom.y - offset.y - LOW_BRACE_REAR_Y) / (REAR_LEG_BOTTOM.y - (rearHinge.y - offset.y))
  return {
    mainBottom: shift(MAIN_TUBE_BOTTOM),
    mainTop: shift(MAIN_TUBE_TOP),
    gripStart: onMain(GRIP_START_T),
    gripCtrl: shift(GRIP_CTRL),
    gripEnd: shift(GRIP_END),
    footrest1: onMain(FOOTREST_T1),
    footrest2: onMain(FOOTREST_T2),
    lowBraceFront: onMain(LOW_BRACE_T),
    lowBraceRear: {
      x: rearBottom.x + (rearHinge.x - rearBottom.x) * braceT,
      y: rearBottom.y + (rearHinge.y - rearBottom.y) * braceT
    },
    seatFront: onMain(SEAT_FRONT_T),
    seatRear: shift(SEAT_REAR),
    rearHinge,
    rearBottom,
    rearWheelTop: rearBottom,
    backTop: onMain(BACK_TOP_T),
    frontWheel: { x: MAIN_TUBE_BOTTOM.x + offset.x, y: MAIN_TUBE_BOTTOM.y + offset.y + CASTER_H + WHEEL_R },
    rearWheel: { x: REAR_LEG_BOTTOM.x + offset.x, y: REAR_LEG_BOTTOM.y + offset.y + CASTER_H + WHEEL_R }
  }
}
//
// Main tube, rear leg, low brace and seat rail of one side.
//
function paintSideFrame(ctx, side, tone) {
  strokeTube(ctx, tone, side.mainBottom, side.gripStart)
  strokeTube(ctx, tone, side.rearBottom, side.rearHinge)
  strokeTube(ctx, tone, side.lowBraceFront, side.lowBraceRear)
  strokeTube(ctx, tone, side.seatFront, side.seatRear)
}
//
// Three-pass tube: dark contour, shaded body, thin glint on the lit side.
//
function strokeTube(ctx, tone, a, b) {
  strokeLine(ctx, tone.outline, TUBE_OUTLINE_W, a, b)
  strokeLine(ctx, tone.shade, TUBE_W, a, b)
  const glint = tone.glint ?? tone.body
  strokeLine(ctx, glint, TUBE_GLINT_W, { x: a.x - TUBE_GLINT_SHIFT, y: a.y - TUBE_GLINT_SHIFT }, { x: b.x - TUBE_GLINT_SHIFT, y: b.y - TUBE_GLINT_SHIFT })
}
function strokeLine(ctx, color, width, a, b) {
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.stroke()
}
//
// Cane hook with ribbed foam grip.
//
function paintGrip(ctx, side, colors) {
  const path = () => {
    ctx.beginPath()
    ctx.moveTo(side.gripStart.x, side.gripStart.y)
    ctx.quadraticCurveTo(side.gripCtrl.x, side.gripCtrl.y, side.gripEnd.x, side.gripEnd.y)
  }
  ctx.strokeStyle = colors.outline
  ctx.lineWidth = GRIP_OUTLINE_W
  path()
  ctx.stroke()
  ctx.strokeStyle = colors.grip
  ctx.lineWidth = GRIP_W
  path()
  ctx.stroke()
  ctx.strokeStyle = colors.gripRib
  ctx.lineWidth = 1
  for (let i = 1; i <= GRIP_RIB_COUNT; i++) {
    const t = i / (GRIP_RIB_COUNT + 1)
    const p = quadPoint(side.gripStart, side.gripCtrl, side.gripEnd, t)
    const d = quadTangent(side.gripStart, side.gripCtrl, side.gripEnd, t)
    const len = Math.hypot(d.x, d.y) || 1
    const nx = -d.y / len * GRIP_RIB_HALF
    const ny = d.x / len * GRIP_RIB_HALF
    ctx.beginPath()
    ctx.moveTo(p.x - nx, p.y - ny)
    ctx.lineTo(p.x + nx, p.y + ny)
    ctx.stroke()
  }
}
function quadPoint(a, c, b, t) {
  const u = 1 - t
  return { x: u * u * a.x + 2 * u * t * c.x + t * t * b.x, y: u * u * a.y + 2 * u * t * c.y + t * t * b.y }
}
function quadTangent(a, c, b, t) {
  return { x: 2 * (1 - t) * (c.x - a.x) + 2 * t * (b.x - c.x), y: 2 * (1 - t) * (c.y - a.y) + 2 * t * (b.y - c.y) }
}
//
// Flat footrest plate between both front legs.
//
function paintFootrest(ctx, near, far, colors) {
  fillQuad(ctx, colors.plate, colors.outline, near.footrest1, near.footrest2, far.footrest2, far.footrest1)
  strokeLine(ctx, colors.plateLight, 1, near.footrest2, far.footrest2)
}
//
// Back sling hanging from the top bar, then the lighter seat pan.
//
function paintSling(ctx, near, far, colors) {
  fillQuad(ctx, colors.fabric, colors.outline, near.backTop, far.backTop, far.seatRear, near.seatRear)
  fillQuad(ctx, colors.fabricLight, colors.outline, near.seatRear, far.seatRear, far.seatFront, near.seatFront)
  //
  // Hem under the top bar and soft vertical folds down the back.
  //
  const hemNear = { x: near.backTop.x, y: near.backTop.y + HEM_W }
  const hemFar = { x: far.backTop.x, y: far.backTop.y + HEM_W }
  strokeLine(ctx, colors.fabricShade, HEM_W, hemNear, hemFar)
  ctx.globalAlpha = FOLD_ALPHA
  for (let i = 1; i <= FOLD_COUNT; i++) {
    const t = i / (FOLD_COUNT + 1)
    strokeLine(ctx, colors.fabricShade, 1, lerpPoint(hemNear, hemFar, t), lerpPoint(near.seatRear, far.seatRear, t * 0.9))
  }
  ctx.globalAlpha = 1
  strokeLine(ctx, colors.fabricShade, 1.2, near.seatRear, far.seatRear)
}
//
// Lap strap across the back with a crotch strap down to the seat and a buckle.
//
function paintStrap(ctx, near, far, colors) {
  const a = lerpPoint(near.backTop, near.seatRear, STRAP_T)
  const b = lerpPoint(far.backTop, far.seatRear, STRAP_T)
  const mid = lerpPoint(a, b, 0.5)
  const seatMid = lerpPoint(near.seatFront, far.seatFront, 0.5)
  strokeLine(ctx, colors.outline, STRAP_W + 1.2, a, b)
  strokeLine(ctx, colors.outline, STRAP_W + 1.2, mid, seatMid)
  strokeLine(ctx, colors.strap, STRAP_W, a, b)
  strokeLine(ctx, colors.strap, STRAP_W, mid, seatMid)
  ctx.fillStyle = colors.outline
  ctx.fillRect(mid.x - BUCKLE_SIZE * 0.5 - 1, mid.y - BUCKLE_SIZE * 0.5 - 1, BUCKLE_SIZE + 2, BUCKLE_SIZE + 2)
  ctx.fillStyle = colors.buckle
  ctx.fillRect(mid.x - BUCKLE_SIZE * 0.5, mid.y - BUCKLE_SIZE * 0.5, BUCKLE_SIZE, BUCKLE_SIZE)
}
//
// Hinge rivets on the near frame joints.
//
function paintRivets(ctx, side, colors) {
  const joints = [side.seatFront, side.rearHinge, side.lowBraceRear, side.backTop]
  joints.forEach(p => {
    ctx.fillStyle = colors.outline
    ctx.fillRect(p.x - RIVET_SIZE * 0.5 - 1, p.y - RIVET_SIZE * 0.5 - 1, RIVET_SIZE + 2, RIVET_SIZE + 2)
    ctx.fillStyle = colors.hub
    ctx.fillRect(p.x - RIVET_SIZE * 0.5, p.y - RIVET_SIZE * 0.5, RIVET_SIZE, RIVET_SIZE)
  })
}
//
// Caster fork from the leg end down to the axle, plus a twin wheel pair
// along the axle direction.
//
function paintWheelCorner(ctx, center, legEnd, tire, rim, tone, colors) {
  const len = Math.hypot(FAR_OFFSET.x, FAR_OFFSET.y)
  const twin = { x: FAR_OFFSET.x / len * WHEEL_TWIN_GAP, y: FAR_OFFSET.y / len * WHEEL_TWIN_GAP }
  const axleMid = { x: center.x + twin.x * 0.5, y: center.y + twin.y * 0.5 }
  strokeTube(ctx, tone, legEnd, axleMid)
  paintWheel(ctx, { x: center.x + twin.x, y: center.y + twin.y }, tire, rim, colors)
  paintWheel(ctx, center, tire, rim, colors)
}
function paintWheel(ctx, c, tire, rim, colors) {
  ctx.fillStyle = colors.outline
  ctx.beginPath()
  ctx.ellipse(c.x, c.y, WHEEL_R + 1, (WHEEL_R + 1) * WHEEL_SQUASH, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = tire
  ctx.beginPath()
  ctx.ellipse(c.x, c.y, WHEEL_R, WHEEL_R * WHEEL_SQUASH, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = rim
  ctx.beginPath()
  ctx.ellipse(c.x, c.y, WHEEL_RIM_R, WHEEL_RIM_R * WHEEL_SQUASH, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = colors.hub
  ctx.beginPath()
  ctx.arc(c.x, c.y, WHEEL_HUB_R, 0, Math.PI * 2)
  ctx.fill()
}
function fillQuad(ctx, fill, outline, a, b, c, d) {
  ctx.beginPath()
  ctx.moveTo(a.x, a.y)
  ctx.lineTo(b.x, b.y)
  ctx.lineTo(c.x, c.y)
  ctx.lineTo(d.x, d.y)
  ctx.closePath()
  ctx.fillStyle = fill
  ctx.fill()
  ctx.strokeStyle = outline
  ctx.lineWidth = 1
  ctx.stroke()
}
function lerpPoint(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }
}
