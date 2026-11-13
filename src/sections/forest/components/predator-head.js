import * as PolyBatch from '../../../utils/poly-batch.js'

//
// The centipede's head, after the reference picture: a round rust-brown head
// seen three-quarters on, two blank, angry cream eyes (no pupils) under heavy
// brow ridges slanting down to the middle (the far eye smaller at the front
// edge), a small frowning mouth between them that gapes when it attacks or
// chews, and two thick curved brown pincers under it, hooking in towards each
// other, each with a spur on its inner edge.
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
// Eyes: far one first, blank cream almonds. In a rage (inst.anger, 0..1) the
// upper lid comes down by up to EYE_SQUINT of the eye's height. browFrom /
// browTo (deg, -90 = straight up) bound the arc of its brow, from the outer
// end to the inner one; inner is the way the inner end lies (+1 front).
//
const EYES = [
  { f: 0.68, y: 0.14, rx: 0.28, ry: 0.24, browFrom: -35, browTo: -165, inner: -1 },
  { f: 0.0, y: 0.08, rx: 0.4, ry: 0.32, browFrom: -172, browTo: -25, inner: 1 }
]
const EYE_RIM_PX = 0.9
const EYE_SQUINT = 0.35
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
const BROW_TILT_CALM = 0.45
const BROW_TILT_ANGRY = 0.75
const BROW_LOWER = 0.1
const BROW_RIM_PX = 0.7
const BROW_LIT_PX = 0.45
const BROW_LIT_SHARE = 0.3
//
// The frowning mouth: a short arc from MOUTH_F0 to MOUTH_F1 at MOUTH_Y, its
// middle MOUTH_ARCH higher; as the jaws drop past MOUTH_OPEN_FROM it gapes
// into a dark oval up to MOUTH_OPEN_RY tall.
//
const MOUTH_F0 = 0.14
const MOUTH_F1 = 0.66
const MOUTH_Y = 0.56
const MOUTH_ARCH = 0.1
const MOUTH_STEPS = 6
const MOUTH_W = 0.1
const MOUTH_OPEN_FROM = 0.12
const MOUTH_OPEN_RY = 0.2
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
const MANDIBLE_TEETH_AT = [0.66]
const MANDIBLE_TOOTH_LEN = 0.22
const MANDIBLE_TOOTH_HALF = 0.09
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
const SPAN_STEPS = 4
//
// Rage (inst.anger, 0..1) by state, eased at ANGER_EASE per second: it
// drives the squint, the brows, the gaping mouth and the pincers.
//
const ANGER_BY_STATE = { stalk: 0.6, hunt: 0.85, lunge: 1 }
const ANGER_EASE = 10
const MANDIBLE_SHAPES = MANDIBLES.map(m => sampleCurve(m.ctrl.map(([f, y]) => [f, MANDIBLE_Y0 + (y - MANDIBLE_Y0) * MANDIBLE_Y_SCALE])))

/**
 * Builds the head's reusable point buffers (nothing is allocated per frame)
 * and its rage level.
 * @param {Object} inst - Predator inst
 */
export function initHead(inst) {
  inst.anger = 0
  inst.headScratch = {
    view: { x: 0, y: 0, dir: 1, r: 1 },
    brows: EYES.map(() => Array.from({ length: BROW_STEPS + 1 }, () => ({ x: 0, y: 0 }))),
    mouth: Array.from({ length: MOUTH_STEPS + 1 }, () => ({ x: 0, y: 0 })),
    ellipse: Array.from({ length: ELLIPSE_STEPS }, () => ({ x: 0, y: 0 })),
    mandibles: MANDIBLE_SHAPES.map(shape => buildCurveBuffer(shape, MANDIBLE_FANG_FROM))
  }
}

/**
 * Eases the head's rage towards the one its state carries.
 * @param {Object} inst - Predator inst
 * @param {number} dt - Seconds since the last frame
 */
export function tickHead(inst, dt) {
  inst.anger += ((ANGER_BY_STATE[inst.state] ?? 0) - inst.anger) * Math.min(1, dt * ANGER_EASE)
}

/**
 * Draws the head into the body's batch: dome, eyes, brows, mouth, then the
 * pincers in front. The squint, brows and jaws follow inst.anger.
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
  drawEyes(inst, batch, view, colors)
  drawBrows(inst, batch, view, colors)
  drawMouth(inst, batch, view, colors)
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

// Both eyes: blank cream ovals in a contour. A rage lowers the upper lid, the lower edge stays.
function drawEyes(inst, batch, view, colors) {
  const { r } = view
  for (const e of EYES) {
    const cx = headX(view, e.f)
    const cy = view.y + eyeCenterY(e, inst.anger) * r
    const ry = eyeRy(e, inst.anger) * r
    addEllipse(inst, batch, cx, cy, e.rx * r + EYE_RIM_PX, ry + EYE_RIM_PX, colors.contour)
    addEllipse(inst, batch, cx, cy, e.rx * r, ry, colors.eye)
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

// The frowning mouth; it gapes (a dark oval) as the jaws drop
function drawMouth(inst, batch, view, colors) {
  const { r } = view
  const open = Math.max(0, jawDrop(inst) - MOUTH_OPEN_FROM) / (1 - MOUTH_OPEN_FROM)
  if (open > 0) {
    const cx = headX(view, (MOUTH_F0 + MOUTH_F1) / 2)
    const ry = MOUTH_OPEN_RY * Math.min(1, open) * r
    const rx = (MOUTH_F1 - MOUTH_F0) / 2 * r
    addEllipse(inst, batch, cx, view.y + MOUTH_Y * r, rx + EYE_RIM_PX, ry + EYE_RIM_PX, colors.contour)
    addEllipse(inst, batch, cx, view.y + MOUTH_Y * r, rx, ry, colors.maw)
    return
  }
  const pts = inst.headScratch.mouth
  for (let i = 0; i <= MOUTH_STEPS; i++) {
    const u = i / MOUTH_STEPS
    pts[i].x = headX(view, MOUTH_F0 + (MOUTH_F1 - MOUTH_F0) * u)
    pts[i].y = view.y + (MOUTH_Y - Math.sin(Math.PI * u) * MOUTH_ARCH) * r
  }
  PolyBatch.addTaperedRibbon(batch, pts, MOUTH_W * r, MOUTH_W * r, colors.contour, false)
}

// Both pincers: the arm (contour, fill, joint, inner spur), then the hooked tip
function drawMandibles(inst, batch, view, colors) {
  const open = jawDrop(inst) * JAW_OPEN_GAIN
  MANDIBLES.forEach((m, i) => {
    const buf = inst.headScratch.mandibles[i]
    const last = buf.all.length - 1
    placeCurve(MANDIBLE_SHAPES[i], buf.all, view, MANDIBLE_SHAPES[i][0], m.open * open)
    const armEnd = m.wEnd * view.r
    const fangBase = armEnd * MANDIBLE_FANG_BASE_SHARE
    const rim = MANDIBLE_RIM_PX * 2
    PolyBatch.addTaperedRibbon(batch, buf.first, m.wBase * view.r + rim, armEnd + rim, colors.contour, false)
    PolyBatch.addTaperedRibbon(batch, buf.second, fangBase + rim, 0, colors.contour, false)
    PolyBatch.addTaperedRibbon(batch, buf.first, m.wBase * view.r, armEnd, colors.leg, false)
    PolyBatch.addTaperedRibbon(batch, buf.second, fangBase, 0, colors.leg, false)
    addCurveRing(batch, buf.all, Math.round(MANDIBLE_JOINT_AT * last), mandibleWidth(m, MANDIBLE_JOINT_AT) * view.r, MANDIBLE_JOINT_PX, colors.legFar)
    MANDIBLE_TEETH_AT.forEach(u => addMandibleTooth(batch, buf.all, Math.round(u * last), mandibleWidth(m, u) * view.r * 0.5, view, m, colors))
  })
}

// Width (head units) of a mandible at its length share u: the arm, then the tapering fang
function mandibleWidth(mandible, u) {
  if (u < MANDIBLE_FANG_FROM) return mandible.wBase + (mandible.wEnd - mandible.wBase) * (u / MANDIBLE_FANG_FROM)
  return mandible.wEnd * MANDIBLE_FANG_BASE_SHARE * (1 - (u - MANDIBLE_FANG_FROM) / (1 - MANDIBLE_FANG_FROM))
}

// A spur standing out of a pincer's inner edge: contour, then the brown
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
  const pad = MANDIBLE_RIM_PX
  PolyBatch.addTriangle(batch, bx - tx * (half + pad), by - ty * (half + pad), p.x + nx * (reach + pad), p.y + ny * (reach + pad), bx + tx * (half + pad), by + ty * (half + pad), colors.contour)
  PolyBatch.addTriangle(batch, bx - tx * half, by - ty * half, p.x + nx * reach, p.y + ny * reach, bx + tx * half, by + ty * half, colors.leg)
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

// A short band across a curve at a sample: a pincer's joint
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

// Writes a sampled shape into world points, turned about a pivot (a pincer opening)
function placeCurve(shape, out, view, pivot, angle) {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  for (let i = 0; i < shape.length; i++) {
    const dx = shape[i].f - pivot.f
    const dy = shape[i].y - pivot.y
    out[i].x = view.x + view.dir * (pivot.f + dx * cos - dy * sin) * view.r
    out[i].y = view.y + (pivot.y + dx * sin + dy * cos) * view.r
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
