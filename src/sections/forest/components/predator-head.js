import * as PolyBatch from '../../../utils/poly-batch.js'

//
// The centipede's head, after the reference picture: a rust-brown dome seen
// three-quarters on, two angry cream eyes under heavy brow ridges (the far one
// small at the front edge), a dark nose with tiny teeth, two thick curved
// mandibles that end in golden fangs, and two long ringed antennae arching
// forward over the face.
//
// Shapes are written in head units (fwd, y): fwd grows toward the way the
// centipede faces, y grows down, and one unit is the head's radius (`r`).
// The curves are sampled once at load; every frame only moves them.
//
const HEAD_R_MULT = 0.95
const HEAD_RX = 1.1
const HEAD_RY = 0.92
const HEAD_RIM_PX = 1
const HEAD_BASE_INSET_PX = 0.9
const HEAD_BASE_LIFT_PX = 0.6
const HEAD_LIGHT = { f: 0.1, y: -0.5, rx: 0.5, ry: 0.2 }
const ELLIPSE_STEPS = 26
const ELLIPSE_INDICES = Array.from({ length: ELLIPSE_STEPS - 2 }, (_, i) => [0, i + 1, i + 2]).flat()
//
// Eyes: far one first. The pupil rests a little toward the front and follows
// the creature's look (eye.px / eye.py, about -1..1).
//
const EYES = [
  { f: 0.86, y: 0.33, rx: 0.2, ry: 0.18, pupilRx: 0.1, pupilRy: 0.13, lookScale: 0.58 },
  { f: -0.15, y: 0.22, rx: 0.34, ry: 0.3, pupilRx: 0.16, pupilRy: 0.2, lookScale: 1 }
]
const EYE_RIM_PX = 0.9
const PUPIL_REST_F = 0.1
const PUPIL_LOOK_F = 0.12
const PUPIL_LOOK_Y = 0.08
const PUPIL_LOOK_MAX = 1.1
const GLINT_RX = 0.05
const GLINT_RY = 0.06
const GLINT_DF = -0.04
const GLINT_DY = -0.07
//
// Brow ridges: from the outer end (up) to the inner one (down), meeting in a V
// over the nose; a lit edge runs along the top of each.
//
const BROWS = [
  { from: { f: 1.1, y: -0.02 }, to: { f: 0.6, y: 0.38 }, w0: 0.2, w1: 0.17 },
  { from: { f: -0.66, y: -0.24 }, to: { f: 0.3, y: 0.2 }, w0: 0.3, w1: 0.22 }
]
const BROW_RIM_PX = 0.7
const BROW_LIT_PX = 0.45
const BROW_LIT_SHARE = 0.32
//
// The nose bump and the tiny teeth hanging under it.
//
const NOSE = [{ f: 0.26, y: 0.5 }, { f: 0.64, y: 0.5 }, { f: 0.45, y: 0.76 }]
const NOSE_RIM_PX = 0.6
const TEETH_FS = [0.3, 0.45, 0.6]
const TEETH_TOP_Y = 0.72
const TEETH_BOTTOM_Y = 0.92
const TEETH_HALF_F = 0.05
//
// Mandibles: control points of the arm and its fang, squashed vertically so the
// tips just reach the ground under a raised head. The far one (at the front)
// opens forward, the near one backward (JAW_OPEN_GAIN rad per rad of jaw drop).
//
const MANDIBLE_Y0 = 0.7
const MANDIBLE_Y_SCALE = 0.62
const MANDIBLE_RIM_PX = 0.8
const MANDIBLE_FANG_FROM = 0.6
const MANDIBLE_FANG_BASE_SHARE = 0.95
const MANDIBLE_TOOTH_BASE_SHARE = 0.7
const MANDIBLE_JOINT_AT = 0.38
const MANDIBLE_JOINT_PX = 0.6
const MANDIBLE_TEETH_AT = [0.5, 0.64]
const MANDIBLE_TOOTH_LEN = 0.16
const MANDIBLE_TOOTH_HALF = 0.05
const JAW_OPEN_GAIN = 0.9
const MANDIBLES = [
  { ctrl: [[0.9, 0.55], [1.03, 1.03], [1.1, 1.3], [1.0, 1.43], [0.8, 1.51]], wBase: 0.34, wEnd: 0.21, open: -1, inner: -1 },
  { ctrl: [[0.02, 0.7], [0.1, 1.07], [0.23, 1.27], [0.4, 1.43], [0.53, 1.51]], wBase: 0.4, wEnd: 0.24, open: 1, inner: 1 }
]
//
// How far the jaws hang open this frame (rad of jaw drop): barely at rest, a
// little while it stalks and hunts, wide in a lunge, chewing while it eats.
//
const JAW_DROP = { rest: 0.05, stalk: 0.14, hunt: 0.2, lunge: 0.62 }
const CHEW_MIN = 0.06
const CHEW_MAX = 0.5
const CHEW_HZ = 2.6
//
// Antennae: the far one first. Both rise from the forehead and arc forward,
// ringed, tapering to a pale curved tip; they sway a little.
//
const ANTENNAE = [
  {
    ctrl: [[0.73, -0.17], [1.0, -0.53], [1.4, -0.87], [1.87, -1.1], [2.33, -1.2], [2.87, -0.97], [3.4, -0.3]],
    phase: 1.7
  },
  {
    ctrl: [[0.3, -0.27], [0.4, -0.77], [0.63, -1.3], [1.0, -1.77], [1.47, -2.07], [2.0, -2.15], [2.53, -1.9], [2.93, -1.53]],
    phase: 0
  }
]
const ANTENNA_W_BASE = 0.27
const ANTENNA_W_TIP = 0.04
const ANTENNA_RIM_PX = 0.7
const ANTENNA_TIP_FROM = 0.86
const ANTENNA_RINGS = 9
const ANTENNA_RING_PX = 0.55
const ANTENNA_SWAY_HZ = 1.3
const ANTENNA_SWAY_F = 0.07
const ANTENNA_SWAY_Y = 0.14
const ANTENNA_SWAY_WAVE = 2.4
const SPAN_STEPS = 4
const ANTENNA_SHAPES = ANTENNAE.map(a => sampleCurve(a.ctrl))
const MANDIBLE_SHAPES = MANDIBLES.map(m => sampleCurve(m.ctrl.map(([f, y]) => [f, MANDIBLE_Y0 + (y - MANDIBLE_Y0) * MANDIBLE_Y_SCALE])))

/**
 * Builds the head's reusable point buffers (nothing is allocated per frame).
 * @param {Object} inst - Predator inst
 */
export function initHead(inst) {
  inst.headScratch = {
    view: { x: 0, y: 0, dir: 1, r: 1 },
    ellipse: Array.from({ length: ELLIPSE_STEPS }, () => ({ x: 0, y: 0 })),
    antennae: ANTENNA_SHAPES.map(shape => buildCurveBuffer(shape, ANTENNA_TIP_FROM)),
    mandibles: MANDIBLE_SHAPES.map(shape => buildCurveBuffer(shape, MANDIBLE_FANG_FROM))
  }
}

/**
 * Draws the head into the body's batch: antennae and dome, brows and eyes, nose,
 * then the mandibles in front.
 * @param {Object} inst - Predator inst
 * @param {Object} batch - PolyBatch the body is drawn into
 * @param {Object} colors - Predator colours
 */
export function drawHead(inst, batch, colors) {
  const head = inst.segments[0]
  const view = inst.headScratch.view
  view.x = head.x
  view.y = head.y
  view.dir = inst.dir
  view.r = head.radius * HEAD_R_MULT
  drawDome(inst, batch, view, colors)
  drawAntennae(inst, batch, view, colors)
  drawEyes(inst, batch, view, colors)
  drawBrows(batch, view, colors)
  drawNose(batch, view, colors)
  drawMandibles(inst, batch, view, colors)
}

// The dome: contour, shade, the lit base shifted up, and a soft highlight
function drawDome(inst, batch, view, colors) {
  const { x, y, r } = view
  const rx = HEAD_RX * r
  const ry = HEAD_RY * r
  addEllipse(inst, batch, x, y, rx + HEAD_RIM_PX, ry + HEAD_RIM_PX, colors.contour)
  addEllipse(inst, batch, x, y, rx, ry, colors.legFar)
  addEllipse(inst, batch, x, y - HEAD_BASE_LIFT_PX, rx - HEAD_BASE_INSET_PX, ry - HEAD_BASE_INSET_PX, colors.leg)
  addEllipse(inst, batch, headX(view, HEAD_LIGHT.f), y + HEAD_LIGHT.y * r, HEAD_LIGHT.rx * r, HEAD_LIGHT.ry * r, colors.legLight)
}

// Both eyes: contour, cream, a pupil that follows the look, a glint
function drawEyes(inst, batch, view, colors) {
  const eye = inst.eyes[0]
  const lookF = Math.max(-PUPIL_LOOK_MAX, Math.min(PUPIL_LOOK_MAX, eye.px))
  const lookY = Math.max(-PUPIL_LOOK_MAX, Math.min(PUPIL_LOOK_MAX, eye.py))
  for (const e of EYES) {
    const cx = headX(view, e.f)
    const cy = view.y + e.y * view.r
    const pupilF = e.f + (PUPIL_REST_F + lookF * PUPIL_LOOK_F) * e.lookScale
    const pupilY = cy + lookY * PUPIL_LOOK_Y * view.r * e.lookScale
    addEllipse(inst, batch, cx, cy, e.rx * view.r + EYE_RIM_PX, e.ry * view.r + EYE_RIM_PX, colors.contour)
    addEllipse(inst, batch, cx, cy, e.rx * view.r, e.ry * view.r, colors.eye)
    addEllipse(inst, batch, headX(view, pupilF), pupilY, e.pupilRx * view.r, e.pupilRy * view.r, colors.pupil)
    addEllipse(inst, batch, headX(view, pupilF + GLINT_DF), pupilY + GLINT_DY * view.r, GLINT_RX * view.r, GLINT_RY * view.r, colors.eye)
  }
}

// Brow ridges over the eyes: contour, dark ridge, lit top edge
function drawBrows(batch, view, colors) {
  const { r } = view
  for (const b of BROWS) {
    const x1 = headX(view, b.from.f)
    const y1 = view.y + b.from.y * r
    const x2 = headX(view, b.to.f)
    const y2 = view.y + b.to.y * r
    const lift = -b.w0 * r * BROW_LIT_SHARE
    PolyBatch.addLine(batch, x1, y1, x2, y2, b.w0 * r + BROW_RIM_PX * 2, colors.contour)
    PolyBatch.addLine(batch, x1, y1, x2, y2, b.w0 * r, colors.brow)
    PolyBatch.addLine(batch, x1, y1 + lift, x2, y2 + lift, BROW_LIT_PX, colors.leg)
  }
}

// The nose bump with its tiny teeth under it
function drawNose(batch, view, colors) {
  const { r } = view
  const at = i => [headX(view, NOSE[i].f), view.y + NOSE[i].y * r]
  const [ax, ay] = at(0)
  const [bx, by] = at(1)
  const [cx, cy] = at(2)
  PolyBatch.addTriangle(batch, ax, ay - NOSE_RIM_PX, bx, by - NOSE_RIM_PX, cx, cy + NOSE_RIM_PX, colors.contour)
  PolyBatch.addTriangle(batch, ax, ay, bx, by, cx, cy, colors.brow)
  for (const f of TEETH_FS) {
    const half = TEETH_HALF_F * r * view.dir
    const tx = headX(view, f)
    PolyBatch.addTriangle(batch, tx - half, view.y + TEETH_TOP_Y * r, tx + half, view.y + TEETH_TOP_Y * r, tx, view.y + TEETH_BOTTOM_Y * r, colors.contour)
  }
}

// Both mandibles: the arm (contour, fill, joint, inner teeth), then the golden fang
function drawMandibles(inst, batch, view, colors) {
  const open = jawDrop(inst) * JAW_OPEN_GAIN
  MANDIBLES.forEach((m, i) => {
    const buf = inst.headScratch.mandibles[i]
    const last = buf.all.length - 1
    placeCurve(MANDIBLE_SHAPES[i], buf.all, view, { pivot: MANDIBLE_SHAPES[i][0], angle: m.open * open })
    const armEnd = m.wEnd * view.r
    const fangBase = armEnd * MANDIBLE_FANG_BASE_SHARE
    const rim = MANDIBLE_RIM_PX * 2
    PolyBatch.addTaperedRibbon(batch, buf.first, m.wBase * view.r + rim, armEnd + rim, colors.contour, false)
    PolyBatch.addTaperedRibbon(batch, buf.second, fangBase + rim, 0, colors.contour, false)
    PolyBatch.addTaperedRibbon(batch, buf.first, m.wBase * view.r, armEnd, colors.leg, false)
    PolyBatch.addTaperedRibbon(batch, buf.second, fangBase, 0, colors.fang, false)
    addCurveRing(batch, buf.all, Math.round(MANDIBLE_JOINT_AT * last), mandibleWidth(m, MANDIBLE_JOINT_AT) * view.r, MANDIBLE_JOINT_PX, colors.legFar)
    MANDIBLE_TEETH_AT.forEach(u => addMandibleTooth(batch, buf.all, Math.round(u * last), mandibleWidth(m, u) * view.r * 0.5, view, m, colors))
  })
}

// Width (head units) of a mandible at its length share u: the arm, then the tapering fang
function mandibleWidth(mandible, u) {
  if (u < MANDIBLE_FANG_FROM) return mandible.wBase + (mandible.wEnd - mandible.wBase) * (u / MANDIBLE_FANG_FROM)
  return mandible.wEnd * MANDIBLE_FANG_BASE_SHARE * (1 - (u - MANDIBLE_FANG_FROM) / (1 - MANDIBLE_FANG_FROM))
}

// A tiny dark spike standing out of a mandible's inner edge
function addMandibleTooth(batch, pts, index, halfWidth, view, mandible, colors) {
  const p = pts[index]
  const next = pts[Math.min(pts.length - 1, index + 1)]
  const prev = pts[Math.max(0, index - 1)]
  const len = Math.hypot(next.x - prev.x, next.y - prev.y) || 1
  const tx = (next.x - prev.x) / len
  const ty = (next.y - prev.y) / len
  const side = Math.sign(-ty * mandible.inner * view.dir) || 1
  const nx = -ty * side
  const ny = tx * side
  const half = MANDIBLE_TOOTH_HALF * view.r
  const reach = halfWidth + MANDIBLE_TOOTH_LEN * view.r
  const bx = p.x + nx * halfWidth * MANDIBLE_TOOTH_BASE_SHARE
  const by = p.y + ny * halfWidth * MANDIBLE_TOOTH_BASE_SHARE
  PolyBatch.addTriangle(batch, bx - tx * half, by - ty * half, p.x + nx * reach, p.y + ny * reach, bx + tx * half, by + ty * half, colors.contour)
}

// Both antennae: contour, body, rings, pale tip; swaying
function drawAntennae(inst, batch, view, colors) {
  const t = inst.k.time() * ANTENNA_SWAY_HZ * Math.PI * 2
  ANTENNAE.forEach((a, i) => {
    const buf = inst.headScratch.antennae[i]
    placeCurve(ANTENNA_SHAPES[i], buf.all, view, { sway: { t: t + a.phase } })
    const wBase = ANTENNA_W_BASE * view.r
    const wTip = ANTENNA_W_TIP * view.r
    PolyBatch.addTaperedRibbon(batch, buf.all, wBase + ANTENNA_RIM_PX * 2, wTip + ANTENNA_RIM_PX * 2, colors.contour, false)
    PolyBatch.addTaperedRibbon(batch, buf.all, wBase, wTip, colors.leg, false)
    for (let ring = 1; ring <= ANTENNA_RINGS; ring++) {
      const u = ring / (ANTENNA_RINGS + 1)
      addCurveRing(batch, buf.all, Math.round(u * (buf.all.length - 1)), wBase + (wTip - wBase) * u, ANTENNA_RING_PX, colors.legFar)
    }
    PolyBatch.addTaperedRibbon(batch, buf.second, wBase + (wTip - wBase) * ANTENNA_TIP_FROM, wTip, colors.fang, false)
  })
}

// How far the jaws hang open this frame (see JAW_DROP)
function jawDrop(inst) {
  if (inst.state === 'feast' && inst.feastPhase !== 'eat') return JAW_DROP.hunt
  if (inst.state !== 'feast') return JAW_DROP[inst.state] ?? JAW_DROP.rest
  const chew = 0.5 + 0.5 * Math.sin(inst.k.time() * CHEW_HZ * Math.PI * 2)
  return CHEW_MIN + (CHEW_MAX - CHEW_MIN) * chew
}

// World X of a head-unit forward offset
function headX(view, f) {
  return view.x + view.dir * f * view.r
}

// A filled ellipse (a fan over the reused unit-circle buffer)
function addEllipse(inst, batch, cx, cy, rx, ry, color) {
  const pts = inst.headScratch.ellipse
  for (let i = 0; i < ELLIPSE_STEPS; i++) {
    const a = (i / ELLIPSE_STEPS) * Math.PI * 2
    pts[i].x = cx + Math.cos(a) * rx
    pts[i].y = cy + Math.sin(a) * ry
  }
  PolyBatch.addPolygon(batch, pts, ELLIPSE_INDICES, color)
}

// A short band across a curve at a sample: a joint or ring on an antenna or mandible
function addCurveRing(batch, pts, index, width, thickness, color) {
  const p = pts[index]
  const a = pts[Math.max(0, index - 1)]
  const b = pts[Math.min(pts.length - 1, index + 1)]
  const dx = b.x - a.x
  const dy = b.y - a.y
  const len = Math.hypot(dx, dy) || 1
  const nx = (-dy / len) * width * 0.5
  const ny = (dx / len) * width * 0.5
  PolyBatch.addLine(batch, p.x - nx, p.y - ny, p.x + nx, p.y + ny, thickness, color)
}

// Writes a sampled shape into world points: optionally swayed (antennae) or turned about a pivot (mandibles)
function placeCurve(shape, out, view, motion) {
  const { pivot, angle = 0, sway } = motion
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  for (let i = 0; i < shape.length; i++) {
    const p = shape[i]
    let f = p.f
    let y = p.y
    if (pivot) {
      const dx = f - pivot.f
      const dy = y - pivot.y
      f = pivot.f + dx * cos - dy * sin
      y = pivot.y + dx * sin + dy * cos
    }
    if (sway) {
      const w = p.u * p.u
      f += Math.cos(sway.t + p.u * ANTENNA_SWAY_WAVE) * ANTENNA_SWAY_F * w
      y += Math.sin(sway.t + p.u * ANTENNA_SWAY_WAVE) * ANTENNA_SWAY_Y * w
    }
    out[i].x = view.x + view.dir * f * view.r
    out[i].y = view.y + y * view.r
  }
}

// A world-point buffer for a shape, with views on its arm (first) and tip (second) parts that share the same points
function buildCurveBuffer(shape, splitAt) {
  const all = shape.map(() => ({ x: 0, y: 0 }))
  const split = Math.max(1, shape.findIndex(p => p.u >= splitAt))
  return { all, first: all.slice(0, split + 1), second: all.slice(split) }
}

// Catmull-Rom samples through control points [f, y], each with its share of the length (u)
function sampleCurve(ctrl) {
  const pts = []
  const last = ctrl.length - 1
  for (let i = 0; i < last; i++) {
    const p0 = ctrl[Math.max(0, i - 1)]
    const p1 = ctrl[i]
    const p2 = ctrl[i + 1]
    const p3 = ctrl[Math.min(last, i + 2)]
    for (let s = 0; s < SPAN_STEPS; s++) {
      const t = s / SPAN_STEPS
      pts.push({ f: catmull(p0[0], p1[0], p2[0], p3[0], t), y: catmull(p0[1], p1[1], p2[1], p3[1], t), u: 0 })
    }
  }
  pts.push({ f: ctrl[last][0], y: ctrl[last][1], u: 0 })
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    total += Math.hypot(pts[i].f - pts[i - 1].f, pts[i].y - pts[i - 1].y)
    pts[i].u = total
  }
  pts.forEach(p => { p.u /= total })
  return pts
}

function catmull(p0, p1, p2, p3, t) {
  const t2 = t * t
  const t3 = t2 * t
  return 0.5 * (2 * p1 + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t2 + (-p0 + 3 * p1 - 3 * p2 + p3) * t3)
}
