import { createSeededRandom } from '../../../utils/seeded-random.js'
import { parseHex } from '../../../utils/helper.js'
import { CAVE_CFG } from '../cfg.js'
//
// The lake fish painted in code (after the reference picture), side on,
// facing right, TEX_L px from the tail's root (u = 0) to the snout
// (u = 1): a deep body narrowing to the tail's root, a blunt rounded head
// with the snout a little under the middle; a blue-teal back with darker
// blotches and pale blue spots over most of the flank, warming into gold
// low on the flank and a cream-orange belly, a warm orange face, a big
// gold-ringed eye, gold speckles and a soft sheen along the back, a gill
// arc, a small lipped mouth and a dark contour; the dorsal fin (a fan
// swept back) and the anal fin painted on, see-through blue with pale
// gold rays. Apart from it: the rounded tail fan, a pectoral and a pelvic
// fin, and the body again with its mouth wide open (the head's slice is
// swapped for it while the fish snaps).
//
// FISH_ART tells cave-fish.js where everything is: the spine line (MID)
// in the body picture, the fins' roots on the body (u, px off the spine)
// and each fin picture's root point.
//
const C = CAVE_CFG.fish
const TEX_L = 200
const PAD = 3
const BODY_W = TEX_L + PAD * 2
const BODY_H = 168
const MID = 90
//
// Body outline: half heights over (UP) and under (DOWN) the spine at the
// deepest (u = DEEP_U), the tail's root at ROOT share of it, rounding off
// bluntly (NOSE_POW) to the snout; the head drops SNOUT_DROP px from
// HEAD_U on.
//
const UP = 40
const DOWN = 38
const DEEP_U = 0.48
const ROOT = 0.25
const ROOT_POW = 1.1
const NOSE_POW = 3
const HEAD_U = 0.7
const SNOUT_DROP = 6
const STEP = 0.01
//
// Paint: the flank gradient's stops (share of the body's height), the
// face's warm glow (centre u, radius px, opacity), the blotches (count, u
// span, size, how far down the back they lie, opacity), pale spots and
// gold speckles (count, size, from u on, down to SPOT_LOW px under the
// spine), the sheen along the back.
//
const STOP_FLANK = 0.42
const STOP_GOLD = 0.74
const FACE_U = 0.87
const FACE_R = 66
const FACE_ALPHA = 0.62
const BLOTCHES = 12
const BLOTCH_U0 = 0.1
const BLOTCH_U1 = 0.72
const BLOTCH_RX = 10
const BLOTCH_RY = 7
const BLOTCH_SIZE_MIN = 0.6
const BLOTCH_SIZE_RANGE = 0.6
const BLOTCH_DOWN_MIN = 0.3
const BLOTCH_DOWN_RANGE = 0.6
const BLOTCH_TILT = 0.5
const BLOTCH_ALPHA = 0.38
const SPOTS = 18
const SPOT_R = 1.7
const SPOT_FROM = 0.12
const SPOT_ALPHA = 0.6
const SPECKLES = 24
const SPECKLE_R = 1.4
const SPECKLE_FROM = 0.2
const SPECKLE_ALPHA = 0.85
const DOT_TO = 0.8
const DOT_SIZE_MIN = 0.6
const DOT_SIZE_RANGE = 0.8
const SPOT_LOW = 8
const SHEEN_ALPHA = 0.22
const SHEEN_W = 3
const SHEEN_IN = 7
const SHEEN_U0 = 0.08
const SHEEN_U1 = 0.8
const SEED = 4721
//
// Gill arc (u, bend px, width, opacity, ends' inset); the eye (u, px off
// the spine, ring, iris and pupil radii, glints); the mouth (slit length
// and width, lip width, a gape's depth back and its rise and drop).
//
const GILL_U = 0.74
const GILL_BEND = 10
const GILL_W = 1.6
const GILL_ALPHA = 0.55
const GILL_INSET = 4
const EYE_U = 0.845
const EYE_DY = -8
const EYE_RING = 13
const EYE_RING_EDGE = 1.6
const EYE_LIGHT = 2
const EYE_IRIS = 9.2
const EYE_PUPIL = 6.4
const GLINT = { x: -2.8, y: -3.2, r: 2.8 }
const GLINT_SMALL = { x: 2.8, y: 2.4, r: 1.2 }
const MOUTH_L = 10
const MOUTH_W = 1.8
const LIP_W = 2.4
const OPEN_BACK = 16
const OPEN_UP = 6
const OPEN_DOWN = 9
//
// Fins: fill, edge and ray look; the fins painted on the body (root span
// in u, how far out and back they reach, px) and the ones apart (picture
// size, root height, spread); CURVE_STEPS points per edge curve.
//
const FIN_ALPHA = 0.55
const FIN_ROOT_ALPHA = 0.8
const FIN_EDGE_ALPHA = 0.6
const FIN_EDGE_W = 1.2
const RAY_ALPHA = 0.6
const RAY_W = 1
const CONTOUR_W = 2
const CONTOUR_ALPHA = 0.85
const CURVE_STEPS = 10
const DORSAL = { u0: 0.4, u1: 0.7, peakU: 0.6, peak: 42, rear: 16, rearBack: 12, rays: 9 }
const ANAL = { u0: 0.2, u1: 0.42, drop: 26, back: 14, rays: 7 }
const TAIL = { w: 92, h: 150, root: 24, spread: 66, notch: 5, rays: 15 }
const PECT = { w: 58, h: 34, root: 10, rays: 7 }
const PELV = { w: 42, h: 26, root: 8, rays: 6 }
const GAP = 4
const FULL_TURN = Math.PI * 2
const HALF = 0.5

export const FISH_ART = {
  texL: TEX_L,
  pad: PAD,
  bodyW: BODY_W,
  mid: MID,
  tailRoot: { x: TAIL.w - 2, y: TAIL.h * HALF },
  pectRoot: { x: PECT.w - 3, y: PECT.h * HALF },
  pelvRoot: { x: PELV.w - 3, y: PELV.h * HALF },
  pectAt: { u: 0.7, dy: 12 },
  pelvAt: { u: 0.57, dy: DOWN - 6 }
}

/**
 * Paints every fish picture into one atlas canvas (no grain yet).
 * @returns {{canvas: HTMLCanvasElement, parts: Object<string, {x: number, y: number, w: number, h: number}>}}
 */
export function paintFishAtlas() {
  const parts = {
    body: { w: BODY_W, h: BODY_H },
    bodyOpen: { w: BODY_W, h: BODY_H },
    tail: { w: TAIL.w, h: TAIL.h },
    pectoral: { w: PECT.w, h: PECT.h },
    pelvic: { w: PELV.w, h: PELV.h }
  }
  let y = GAP
  Object.values(parts).forEach(p => {
    p.x = GAP
    p.y = y
    y += p.h + GAP
  })
  const canvas = document.createElement('canvas')
  canvas.width = BODY_W + GAP * 2
  canvas.height = y
  const ctx = canvas.getContext('2d')
  paintPart(ctx, parts.body, paintBody, false)
  paintPart(ctx, parts.bodyOpen, paintBody, true)
  paintPart(ctx, parts.tail, paintTail)
  paintPart(ctx, parts.pectoral, paintSideFin, PECT)
  paintPart(ctx, parts.pelvic, paintSideFin, PELV)
  return { canvas, parts }
}
function paintPart(ctx, part, paint, arg) {
  ctx.save()
  ctx.translate(part.x, part.y)
  paint(ctx, arg)
  ctx.restore()
}
//
// Half heights of the body at u (over and under the spine) and the
// spine's drop there.
//
function bodyAt(u) {
  const depth = u < DEEP_U
    ? ROOT + (1 - ROOT) * Math.pow(Math.sin(u / DEEP_U * Math.PI * HALF), ROOT_POW)
    : Math.pow(Math.max(0, 1 - Math.pow((u - DEEP_U) / (1 - DEEP_U), NOSE_POW)), HALF)
  const drop = SNOUT_DROP * Math.pow(Math.max(0, (u - HEAD_U) / (1 - HEAD_U)), 2)
  return { up: UP * depth, down: DOWN * depth, drop }
}
function xOf(u) {
  return PAD + u * TEX_L
}
function topOf(u) {
  const b = bodyAt(u)
  return MID - b.up + b.drop
}
function bottomOf(u) {
  const b = bodyAt(u)
  return MID + b.down + b.drop
}
//
// The body's outline: along the back to the snout, back under the belly.
//
function bodyPath(ctx) {
  ctx.beginPath()
  for (let u = 0; u <= 1; u += STEP) ctx.lineTo(xOf(u), topOf(u))
  ctx.lineTo(xOf(1), topOf(1))
  for (let u = 1; u >= 0; u -= STEP) ctx.lineTo(xOf(u), bottomOf(u))
  ctx.lineTo(xOf(0), bottomOf(0))
  ctx.closePath()
}
//
// Fins behind the body, the body's paint (clipped to it), the contour,
// the eye, the mouth (shut, or gaping).
//
function paintBody(ctx, open) {
  paintDorsal(ctx)
  paintAnal(ctx)
  ctx.save()
  bodyPath(ctx)
  ctx.clip()
  paintFlanks(ctx)
  paintMarks(ctx)
  paintGill(ctx)
  ctx.restore()
  bodyPath(ctx)
  ctx.globalAlpha = CONTOUR_ALPHA
  ctx.strokeStyle = C.contour
  ctx.lineWidth = CONTOUR_W
  ctx.stroke()
  ctx.globalAlpha = 1
  paintEye(ctx)
  open ? paintOpenMouth(ctx) : paintMouth(ctx)
}
function paintFlanks(ctx) {
  const g = ctx.createLinearGradient(0, MID - UP, 0, MID + DOWN)
  g.addColorStop(0, C.back)
  g.addColorStop(STOP_FLANK, C.flank)
  g.addColorStop(STOP_GOLD, C.gold)
  g.addColorStop(1, C.belly)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, BODY_W, BODY_H)
  const fx = xOf(FACE_U)
  const face = ctx.createRadialGradient(fx, MID, 0, fx, MID, FACE_R)
  face.addColorStop(0, rgba(C.face, FACE_ALPHA))
  face.addColorStop(1, rgba(C.face, 0))
  ctx.fillStyle = face
  ctx.fillRect(0, 0, BODY_W, BODY_H)
}
//
// Blotches over the back, pale blue spots and gold speckles over the
// flank, a sheen along the back (seeded: every fish alike).
//
function paintMarks(ctx) {
  const rng = createSeededRandom(SEED)
  ctx.fillStyle = C.blotch
  ctx.globalAlpha = BLOTCH_ALPHA
  for (let i = 0; i < BLOTCHES; i++) {
    const u = BLOTCH_U0 + (BLOTCH_U1 - BLOTCH_U0) * (i + rng() * HALF) / BLOTCHES
    const y = topOf(u) + (MID - topOf(u)) * (BLOTCH_DOWN_MIN + rng() * BLOTCH_DOWN_RANGE)
    const size = BLOTCH_SIZE_MIN + rng() * BLOTCH_SIZE_RANGE
    ctx.beginPath()
    ctx.ellipse(xOf(u), y, BLOTCH_RX * size, BLOTCH_RY * size, rng() * BLOTCH_TILT, 0, FULL_TURN)
    ctx.fill()
  }
  dots(ctx, rng, { count: SPOTS, color: C.spot, alpha: SPOT_ALPHA, r: SPOT_R, from: SPOT_FROM })
  dots(ctx, rng, { count: SPECKLES, color: C.speckle, alpha: SPECKLE_ALPHA, r: SPECKLE_R, from: SPECKLE_FROM })
  ctx.globalAlpha = SHEEN_ALPHA
  ctx.strokeStyle = C.sheen
  ctx.lineWidth = SHEEN_W
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let u = SHEEN_U0; u <= SHEEN_U1; u += STEP) ctx.lineTo(xOf(u), topOf(u) + SHEEN_IN)
  ctx.stroke()
  ctx.globalAlpha = 1
}
function dots(ctx, rng, spec) {
  ctx.fillStyle = spec.color
  ctx.globalAlpha = spec.alpha
  for (let i = 0; i < spec.count; i++) {
    const u = spec.from + rng() * (DOT_TO - spec.from)
    const y = topOf(u) + (MID + SPOT_LOW - topOf(u)) * rng()
    ctx.beginPath()
    ctx.arc(xOf(u), y, spec.r * (DOT_SIZE_MIN + rng() * DOT_SIZE_RANGE), 0, FULL_TURN)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
function paintGill(ctx) {
  const x = xOf(GILL_U)
  ctx.globalAlpha = GILL_ALPHA
  ctx.strokeStyle = C.gill
  ctx.lineWidth = GILL_W
  ctx.beginPath()
  ctx.moveTo(x, topOf(GILL_U) + GILL_INSET)
  ctx.quadraticCurveTo(x + GILL_BEND, MID, x, bottomOf(GILL_U) - GILL_INSET)
  ctx.stroke()
  ctx.globalAlpha = 1
}
function paintEye(ctx) {
  const x = xOf(EYE_U)
  const y = MID + EYE_DY
  const ring = ctx.createRadialGradient(x - EYE_LIGHT, y - EYE_LIGHT, 1, x, y, EYE_RING)
  ring.addColorStop(0, C.eyeRing)
  ring.addColorStop(1, C.eyeRingDark)
  disc(ctx, x, y, EYE_RING, ring)
  ctx.strokeStyle = C.contour
  ctx.lineWidth = EYE_RING_EDGE
  ctx.stroke()
  disc(ctx, x, y, EYE_IRIS, C.iris)
  disc(ctx, x, y, EYE_PUPIL, C.pupil)
  disc(ctx, x + GLINT.x, y + GLINT.y, GLINT.r, C.glint)
  disc(ctx, x + GLINT_SMALL.x, y + GLINT_SMALL.y, GLINT_SMALL.r, C.glint)
}
function disc(ctx, x, y, r, fill) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(x, y, r, 0, FULL_TURN)
  ctx.fill()
}
//
// Shut: a short dark slit back from the snout under an orange lip.
//
function paintMouth(ctx) {
  const tip = xOf(1)
  const y = MID + bodyAt(1).drop
  ctx.lineCap = 'round'
  ctx.strokeStyle = C.lip
  ctx.lineWidth = LIP_W
  ctx.beginPath()
  ctx.moveTo(tip - 1, y - 1)
  ctx.lineTo(tip - MOUTH_L, y + 1)
  ctx.stroke()
  ctx.strokeStyle = C.mouth
  ctx.lineWidth = MOUTH_W
  ctx.beginPath()
  ctx.moveTo(tip, y)
  ctx.lineTo(tip - MOUTH_L, y + 2)
  ctx.stroke()
}
//
// Gaping: a dark wedge cut back into the snout, lipped.
//
function paintOpenMouth(ctx) {
  const tip = xOf(1) + 1
  const y = MID + bodyAt(1).drop
  ctx.beginPath()
  ctx.moveTo(tip, y - OPEN_UP)
  ctx.lineTo(tip - OPEN_BACK, y)
  ctx.lineTo(tip - 1, y + OPEN_DOWN)
  ctx.closePath()
  ctx.fillStyle = C.mouth
  ctx.fill()
  ctx.strokeStyle = C.lip
  ctx.lineWidth = LIP_W
  ctx.lineJoin = 'round'
  ctx.stroke()
}
//
// Dorsal fin: a fan from its root along the back, up steeply at the front
// to its peak and sweeping down and back past the root's end.
//
function paintDorsal(ctx) {
  const d = DORSAL
  const root = sampleRoot(d.u1, d.u0, u => topOf(u) + 2)
  const front = root[0]
  const peak = { x: xOf(d.peakU), y: topOf(d.peakU) - d.peak }
  const rear = { x: xOf(d.u0) - d.rearBack, y: topOf(d.u0) - d.rear }
  const outer = curve(front, { x: front.x + 4, y: peak.y + 4 }, peak).concat(curve(peak, { x: rear.x + d.rearBack, y: peak.y + 2 }, rear).slice(1))
  fan(ctx, root, outer, d.rays)
}
//
// Anal fin: a fan from its root under the belly, dropping and swept back.
//
function paintAnal(ctx) {
  const a = ANAL
  const root = sampleRoot(a.u1, a.u0, u => bottomOf(u) - 2)
  const front = root[0]
  const low = { x: xOf((a.u0 + a.u1) * HALF) - a.back, y: bottomOf(a.u1) + a.drop }
  const rear = { x: xOf(a.u0) - a.back, y: bottomOf(a.u0) + a.drop * HALF }
  const outer = curve(front, { x: front.x - 2, y: low.y }, low).concat(curve(low, { x: rear.x + 2, y: low.y + 2 }, rear).slice(1))
  fan(ctx, root, outer, a.rays)
}
//
// Tail fan: its root up the right edge, rounded out to the left with a
// slight notch at the middle.
//
function paintTail(ctx) {
  const t = TAIL
  const rx = t.w - 2
  const ry = t.h * HALF
  const root = [{ x: rx, y: ry - t.root * HALF }, { x: rx, y: ry + t.root * HALF }]
  const top = { x: 8, y: ry - t.spread }
  const bottom = { x: 8, y: ry + t.spread }
  const notch = { x: 2 + t.notch, y: ry }
  const outer = curve({ x: rx - 4, y: ry - t.root * HALF - 2 }, { x: rx - 34, y: ry - t.spread * 0.8 }, top)
    .concat(curve(top, { x: 0, y: ry - t.spread * HALF }, notch).slice(1))
    .concat(curve(notch, { x: 0, y: ry + t.spread * HALF }, bottom).slice(1))
    .concat(curve(bottom, { x: rx - 34, y: ry + t.spread * 0.8 }, { x: rx - 4, y: ry + t.root * HALF + 2 }).slice(1))
  fan(ctx, spread(root, outer.length), outer, t.rays)
}
//
// A side fin: a leaf-like fan from its short root on the right, swept back
// and a little down.
//
function paintSideFin(ctx, f) {
  const rx = f.w - 3
  const ry = f.h * HALF
  const root = [{ x: rx, y: ry - f.root * HALF }, { x: rx, y: ry + f.root * HALF }]
  const tip = { x: 3, y: ry + f.h * 0.12 }
  const outer = curve({ x: rx - 2, y: ry - f.root * HALF - 1 }, { x: f.w * HALF, y: -f.h * 0.08 }, tip)
    .concat(curve(tip, { x: f.w * 0.4, y: f.h }, { x: rx - 2, y: ry + f.root * HALF + 1 }).slice(1))
  fan(ctx, spread(root, outer.length), outer, f.rays)
}
//
// Root points along the body from one u to the other.
//
function sampleRoot(from, to, yOf) {
  const pts = []
  const step = from > to ? -STEP : STEP
  for (let u = from; step < 0 ? u >= to : u <= to; u += step) pts.push({ x: xOf(u), y: yOf(u) })
  return pts
}
//
// A short root (two ends) spread into as many points as the edge has.
//
function spread(root, count) {
  const pts = []
  for (let i = 0; i < count; i++) {
    const t = i / Math.max(1, count - 1)
    pts.push({ x: root[0].x + (root[1].x - root[0].x) * t, y: root[0].y + (root[1].y - root[0].y) * t })
  }
  return pts
}
//
// A fan fin: the membrane between its root and its outer edge (both run
// the same way), denser at the root, its edge, and rays from the root out
// to the edge, spaced evenly along both.
//
function fan(ctx, root, outer, rayCount) {
  ctx.beginPath()
  root.forEach(p => ctx.lineTo(p.x, p.y))
  for (let i = outer.length - 1; i >= 0; i--) ctx.lineTo(outer[i].x, outer[i].y)
  ctx.closePath()
  const a = root[Math.floor(root.length * HALF)]
  const b = outer[Math.floor(outer.length * HALF)]
  const g = ctx.createLinearGradient(a.x, a.y, b.x, b.y)
  g.addColorStop(0, rgba(C.flank, FIN_ROOT_ALPHA))
  g.addColorStop(1, rgba(C.fin, FIN_ALPHA))
  ctx.fillStyle = g
  ctx.fill()
  ctx.strokeStyle = rgba(C.finEdge, FIN_EDGE_ALPHA)
  ctx.lineWidth = FIN_EDGE_W
  ctx.lineJoin = 'round'
  ctx.stroke()
  ctx.strokeStyle = rgba(C.finRay, RAY_ALPHA)
  ctx.lineWidth = RAY_W
  for (let i = 0; i < rayCount; i++) {
    const t = (i + HALF) / rayCount
    const from = root[Math.round(t * (root.length - 1))]
    const to = outer[Math.round(t * (outer.length - 1))]
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }
}
//
// Points along a quadratic curve from a to b (control c).
//
function curve(a, c, b) {
  const pts = []
  for (let i = 0; i <= CURVE_STEPS; i++) {
    const t = i / CURVE_STEPS
    const s = 1 - t
    pts.push({ x: s * s * a.x + 2 * s * t * c.x + t * t * b.x, y: s * s * a.y + 2 * s * t * c.y + t * t * b.y })
  }
  return pts
}
function rgba(hex, alpha) {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
