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
const DEG = Math.PI / 180
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
// the creature's look (eye.px / eye.py, about -1..1). In a rage (inst.anger,
// 0..1) the upper lid comes down by up to EYE_SQUINT of the eye's height.
// browFrom / browTo (deg, -90 = straight up) bound the arc of its brow, from
// the outer end to the inner one; inner is the way the inner end lies (+1 front).
//
const EYES = [
  { f: 0.7, y: 0.3, rx: 0.25, ry: 0.23, pupilRx: 0.12, pupilRy: 0.16, lookScale: 0.58, browFrom: -35, browTo: -165, inner: -1 },
  { f: -0.15, y: 0.22, rx: 0.4, ry: 0.36, pupilRx: 0.19, pupilRy: 0.24, lookScale: 1, browFrom: -172, browTo: -25, inner: 1 }
]
const EYE_RIM_PX = 0.9
const EYE_SQUINT = 0.55
const PUPIL_FIT = 0.85
const PUPIL_REST_F = 0.1
const PUPIL_LOOK_F = 0.12
const PUPIL_LOOK_Y = 0.08
const PUPIL_LOOK_MAX = 1.1
const GLINT_RX = 0.05
const GLINT_RY = 0.06
const GLINT_DF = -0.04
const GLINT_DY = -0.07
//
// Brow ridges: an arc around the top of each eye, thick at the outer end and
// thin at the inner one, with a lit edge. Calm, they stand off the eye with a
// slight frown; in a rage they press on the lid, drop and slant steeply so
// the inner ends point down to the nose.
//
const BROW_STEPS = 7
const BROW_W_OUTER = 0.26
const BROW_W_INNER = 0.14
const BROW_GAP = 0.12
const BROW_GAP_PRESSED = 0.02
const BROW_TILT_CALM = 0.14
const BROW_TILT_ANGRY = 0.75
const BROW_LOWER = 0.1
const BROW_RIM_PX = 0.7
const BROW_LIT_PX = 0.45
const BROW_LIT_SHARE = 0.3
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
// How far the jaws hang open (rad of jaw drop): barely at rest, a little while
// it stalks, wide open in a rage (hunt and lunge), chewing while it eats.
//
const JAW_DROP = { rest: 0.05, stalk: 0.14, feastApproach: 0.2, angry: 0.85 }
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
 * Builds the head's reusable point buffers (nothing is allocated per frame)
 * and its rage level.
 * @param {Object} inst - Predator inst
 */
export function initHead(inst) {
  inst.headScratch = {
    view: { x: 0, y: 0, dir: 1, r: 1 },
    brows: EYES.map(() => Array.from({ length: BROW_STEPS + 1 }, () => ({ x: 0, y: 0 }))),
    ellipse: Array.from({ length: ELLIPSE_STEPS }, () => ({ x: 0, y: 0 })),
    antennae: ANTENNA_SHAPES.map(shape => buildCurveBuffer(shape, ANTENNA_TIP_FROM)),
    mandibles: MANDIBLE_SHAPES.map(shape => buildCurveBuffer(shape, MANDIBLE_FANG_FROM))
  }
}

/**
 * Draws the head into the body's batch: dome, antennae, eyes, brows, nose,
 * then the mandibles in front. The look follows inst.eyes, the squint, brows
 * and jaws follow inst.anger.
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
  drawBrows(inst, batch, view, colors)
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

// Both eyes: contour, cream, a pupil that follows the look, a glint. A rage lowers the upper lid, the lower edge stays.
function drawEyes(inst, batch, view, colors) {
  const eye = inst.eyes[0]
  const lookF = Math.max(-PUPIL_LOOK_MAX, Math.min(PUPIL_LOOK_MAX, eye.px))
  const lookY = Math.max(-PUPIL_LOOK_MAX, Math.min(PUPIL_LOOK_MAX, eye.py))
  const { r } = view
  for (const e of EYES) {
    const cx = headX(view, e.f)
    const cy = view.y + eyeCenterY(e, inst.anger) * r
    const ry = eyeRy(e, inst.anger) * r
    const pupilF = e.f + (PUPIL_REST_F + lookF * PUPIL_LOOK_F) * e.lookScale
    const pupilY = cy + lookY * PUPIL_LOOK_Y * r * e.lookScale
    const pupilRy = Math.min(e.pupilRy * r, ry * PUPIL_FIT)
    addEllipse(inst, batch, cx, cy, e.rx * r + EYE_RIM_PX, ry + EYE_RIM_PX, colors.contour)
    addEllipse(inst, batch, cx, cy, e.rx * r, ry, colors.eye)
    addEllipse(inst, batch, headX(view, pupilF), pupilY, e.pupilRx * r, pupilRy, colors.pupil)
    addEllipse(inst, batch, headX(view, pupilF + GLINT_DF), pupilY + GLINT_DY * r, GLINT_RX * r, GLINT_RY * r, colors.eye)
  }
}

// Eye height (head units) after the squint
function eyeRy(eye, anger) {
  return eye.ry * (1 - EYE_SQUINT * anger)
}

// Eye centre (head units): sinks as the upper lid comes down, so the lower edge stays
function eyeCenterY(eye, anger) {
  return eye.y + eye.ry * EYE_SQUINT * anger
}

// Brow arcs over the eyes: contour, dark ridge, lit top edge
function drawBrows(inst, batch, view, colors) {
  const { r } = view
  const { anger } = inst
  const gap = BROW_GAP + (BROW_GAP_PRESSED - BROW_GAP) * anger
  const tilt = BROW_TILT_CALM + (BROW_TILT_ANGRY - BROW_TILT_CALM) * anger
  EYES.forEach((e, i) => {
    const pts = inst.headScratch.brows[i]
    const cy = eyeCenterY(e, anger)
    const rx = e.rx + gap
    const ry = eyeRy(e, anger) + gap
    for (let j = 0; j <= BROW_STEPS; j++) {
      const a = (e.browFrom + (e.browTo - e.browFrom) * (j / BROW_STEPS)) * DEG
      const df = Math.cos(a) * rx
      pts[j].x = headX(view, e.f + df)
      pts[j].y = view.y + (cy + Math.sin(a) * ry + e.inner * tilt * df + BROW_LOWER * anger) * r
    }
    const wOuter = BROW_W_OUTER * r
    const wInner = BROW_W_INNER * r
    PolyBatch.addTaperedRibbon(batch, pts, wOuter + BROW_RIM_PX * 2, wInner + BROW_RIM_PX * 2, colors.contour, false)
    PolyBatch.addTaperedRibbon(batch, pts, wOuter, wInner, colors.brow, false)
    const lift = wOuter * BROW_LIT_SHARE
    pts.forEach(p => { p.y -= lift })
    PolyBatch.addTaperedRibbon(batch, pts, BROW_LIT_PX, BROW_LIT_PX, colors.leg, false)
  })
}

// The nose bump with its tiny teeth under it
function drawNose(batch, view, colors) {
  const { r } = view
  const at = i => [headX(view, NOSE[i].f), view.y + NOSE[i].y * r]
  const [ax, ay] = at(0)
  const [bx, by] = at(1)
  const [cx, cy] = at(2)
  PolyBatch.addTriangle(batch, ax, ay, bx, by, cx, cy, colors.contour)
  PolyBatch.addTriangle(batch, ax + view.dir * NOSE_RIM_PX, ay + NOSE_RIM_PX, bx - view.dir * NOSE_RIM_PX, by + NOSE_RIM_PX, cx, cy - NOSE_RIM_PX, colors.brow)
  for (const f of TEETH_FS) {
    const x = headX(view, f)
    const half = TEETH_HALF_F * r
    PolyBatch.addTriangle(batch, x - half, view.y + TEETH_TOP_Y * r, x + half, view.y + TEETH_TOP_Y * r, x, view.y + TEETH_BOTTOM_Y * r, colors.contour)
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

// Both antennae: swayed curves with rings and a pale tip
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

// How far the jaws hang open this frame (see JAW_DROP): the calm opening grows to the wide one with the rage
function jawDrop(inst) {
  if (inst.state === 'feast' && inst.feastPhase === 'eat') {
    const chew = 0.5 + 0.5 * Math.sin(inst.k.time() * CHEW_HZ * Math.PI * 2)
    return CHEW_MIN + (CHEW_MAX - CHEW_MIN) * chew
  }
  const calm = inst.state === 'feast' ? JAW_DROP.feastApproach : (JAW_DROP[inst.state] ?? JAW_DROP.rest)
  return calm + (JAW_DROP.angry - calm) * inst.anger
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
