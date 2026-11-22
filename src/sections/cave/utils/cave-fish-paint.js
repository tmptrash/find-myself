import { parseHex } from '../../../utils/helper.js'
import { CAVE_CFG } from '../cfg.js'
//
// The lake fish painted in code after cave0/fish.png: soft mauve fish with
// peach spots, a warm rim of light along the back, a peach glow low on
// the flank, a big black eye with a glint, a small smile and a dark plum
// contour; their fins low, broad round lobes swept back (a long bowed
// leading edge, a round end, a short trailing edge), mauve warming to
// peach toward the end, with a few faint veins, edged like the body.
// Several kinds (FISH_TYPES), each side on, facing right, TEX_L px from
// the tail's root (u = 0) to the snout (u = 1), all in pictures of one
// size so they bend on the same spine:
//
// - round: deep and round, two lobes on the back, a forked tail;
// - slim: longer, one big swept-back lobe on the back, a forked tail;
// - curl: slender, its tail a long thin stalk curling into a spiral (one
//   outline with the body, so its contour runs on unbroken);
// - frill: small, a crown of little lobes on the back, a forked tail.
//
// Each picture is one whole fish (fins on its back and belly and its tail
// painted on), so the fish bends as one piece; apart from it a pectoral
// and a pelvic fin, and the whole picture again with its mouth wide open
// (drawn instead while the fish snaps).
//
// FISH_ART tells cave-fish.js where everything is: the whole picture's
// size, where the body's length starts on it (the tail's root) and how
// long it is, the spine line (MID), the side fins' roots on the body (u,
// px off the spine) and on their own pictures.
//
const C = CAVE_CFG.fish
const TEX_L = 200
const PAD = 3
const BODY_W = TEX_L + PAD * 2
const BODY_H = 168
const MID = 90
const STEP = 0.01
//
// The tail's room left of the body (its root tucked TAIL_TUCK px under
// the body).
//
const TAIL_W = 64
const TAIL_TUCK = 8
const TAIL_X = TAIL_W - TAIL_TUCK
const WHOLE_W = TAIL_X + BODY_W
const TAIL_RX = TAIL_W - 2
//
// The kinds. Body: half heights over (up) and under (down) the spine at
// the deepest (deepU), the tail's root at `root` share of it (`rootPow`:
// how long it stays thin), rounding off bluntly (nosePow) to the snout,
// the head dropping snoutDrop px from headU on. Tail: forked (two round
// lobes reaching `reach` px back and `spread` px up and down, their ends
// `round` px round) or curled (a stalk running `reach` px back into a
// spiral `r` px round over `turns` turns, thinning to `tipW` px). Fins on
// the back (dorsal) and belly (anal): lobes from u0..u1 out to their far
// end `h` px off the body at tipU, `round` px round there. Spots: u along,
// v the share of the half height off the spine (minus: over it), radius.
// The eye: u, px off the spine, radius.
//
export const FISH_TYPES = ['round', 'slim', 'curl', 'frill']
const TYPES = {
  round: {
    up: 46, down: 44, deepU: 0.55, root: 0.22, rootPow: 1.3, nosePow: 2.6, headU: 0.72, snoutDrop: 4,
    tail: { kind: 'fork', reach: 50, spread: 36, round: 18 },
    dorsal: [{ u0: 0.38, u1: 0.52, tipU: 0.3, h: 24, round: 13 }, { u0: 0.55, u1: 0.73, tipU: 0.49, h: 32, round: 16 }],
    anal: [{ u0: 0.3, u1: 0.44, tipU: 0.24, h: 20, round: 11 }],
    spots: [{ u: 0.62, v: -0.22, r: 15 }, { u: 0.45, v: 0.02, r: 8 }, { u: 0.52, v: 0.48, r: 9 }, { u: 0.72, v: 0.45, r: 9 }, { u: 0.3, v: 0.08, r: 5 }, { u: 0.8, v: -0.55, r: 6 }, { u: 0.42, v: -0.5, r: 4 }, { u: 0.36, v: 0.55, r: 3 }],
    eye: { u: 0.86, dy: -4, r: 10 }
  },
  slim: {
    up: 36, down: 34, deepU: 0.58, root: 0.26, rootPow: 1.2, nosePow: 2.4, headU: 0.72, snoutDrop: 3,
    tail: { kind: 'fork', reach: 52, spread: 32, round: 17 },
    dorsal: [{ u0: 0.4, u1: 0.5, tipU: 0.32, h: 18, round: 10 }, { u0: 0.52, u1: 0.72, tipU: 0.45, h: 34, round: 16 }],
    anal: [{ u0: 0.3, u1: 0.42, tipU: 0.22, h: 17, round: 10 }],
    spots: [{ u: 0.62, v: -0.25, r: 12 }, { u: 0.46, v: 0.05, r: 7 }, { u: 0.55, v: 0.5, r: 7 }, { u: 0.74, v: 0.42, r: 7 }, { u: 0.34, v: 0.15, r: 4 }, { u: 0.82, v: -0.5, r: 5 }, { u: 0.4, v: -0.45, r: 3 }],
    eye: { u: 0.87, dy: -3, r: 9 }
  },
  curl: {
    up: 32, down: 30, deepU: 0.64, root: 0.16, rootPow: 2.2, nosePow: 2.4, headU: 0.74, snoutDrop: 3,
    tail: { kind: 'curl', reach: 40, r: 14, turns: 1.25, tipW: 3 },
    dorsal: [{ u0: 0.48, u1: 0.58, tipU: 0.41, h: 17, round: 9 }, { u0: 0.58, u1: 0.7, tipU: 0.51, h: 27, round: 13 }, { u0: 0.7, u1: 0.78, tipU: 0.66, h: 16, round: 8 }],
    anal: [{ u0: 0.44, u1: 0.55, tipU: 0.36, h: 15, round: 9 }],
    spots: [{ u: 0.7, v: -0.2, r: 11 }, { u: 0.56, v: 0.05, r: 6 }, { u: 0.64, v: 0.5, r: 7 }, { u: 0.78, v: 0.45, r: 6 }, { u: 0.46, v: 0.35, r: 4 }, { u: 0.84, v: -0.55, r: 4 }, { u: 0.5, v: -0.4, r: 3 }],
    eye: { u: 0.88, dy: -3, r: 9 }
  },
  frill: {
    up: 38, down: 34, deepU: 0.56, root: 0.24, rootPow: 1.2, nosePow: 2.4, headU: 0.72, snoutDrop: 3,
    tail: { kind: 'fork', reach: 48, spread: 32, round: 16 },
    dorsal: [{ u0: 0.4, u1: 0.48, tipU: 0.35, h: 15, round: 8 }, { u0: 0.47, u1: 0.56, tipU: 0.43, h: 22, round: 10 }, { u0: 0.55, u1: 0.64, tipU: 0.53, h: 21, round: 10 }, { u0: 0.63, u1: 0.7, tipU: 0.62, h: 14, round: 7 }],
    anal: [{ u0: 0.32, u1: 0.44, tipU: 0.25, h: 16, round: 10 }],
    spots: [{ u: 0.62, v: -0.15, r: 11 }, { u: 0.46, v: 0.1, r: 7 }, { u: 0.55, v: 0.52, r: 6 }, { u: 0.74, v: 0.42, r: 6 }, { u: 0.34, v: 0.2, r: 4 }, { u: 0.8, v: -0.5, r: 4 }, { u: 0.4, v: -0.45, r: 4 }, { u: 0.66, v: -0.6, r: 3 }],
    eye: { u: 0.86, dy: -4, r: 11 }
  }
}
//
// Paint: the flank gradient's stop (share of the body's height), the
// peach glow low on the flank (from its share of the height down, its
// opacity), the rim of light along the back (px in from the edge, width,
// opacity, u span), the spots' soft edge (share of their radius where the
// edge colour starts), the contour (body, fins and tail alike), the eye
// (its dark rim, its glints: share of its radius off its middle and
// size), the mouth (slit length, width and smile, a gape's depth back and
// its rise and drop).
//
const STOP_BODY = 0.45
const GLOW_FROM = 0.55
const GLOW_ALPHA = 0.55
const RIM_IN = 3
const RIM_W = 3.5
const RIM_ALPHA = 0.5
const RIM_U0 = 0.2
const RIM_U1 = 0.94
const SPOT_EDGE = 0.88
const CONTOUR_W = 2.2
const CONTOUR_ALPHA = 0.9
const EYE_RIM = 1.4
const GLINT = { x: 0.32, y: -0.36, r: 0.32 }
const GLINT_SMALL = { x: -0.3, y: 0.35, r: 0.14 }
const MOUTH_L = 9
const MOUTH_W = 1.6
const MOUTH_SMILE = 2.5
const OPEN_BACK = 15
const OPEN_UP = 6
const OPEN_DOWN = 9
//
// Fin lobes: a round end `round` px round, its middle that far in from
// the lobe's far point; the long (leading) edge bows out by LEAD_BOW of
// the lobe's length, the short (trailing) edge in by TRAIL_BOW; each edge
// leaves its root along the lobe (EDGE_PULL of its length) and meets the
// round end square to it (END_PULL of its radius); how far its root
// reaches into the body; its veins (count, how far apart as a share of
// its roundness, how far toward the end, opacity, width).
//
const LEAD_BOW = 0.22
const TRAIL_BOW = 0.06
const EDGE_PULL = 0.4
const END_PULL = 0.8
const FIN_ROOT_IN = 4
const VEINS = 3
const VEIN_SPREAD = 0.6
const VEIN_REACH = 0.8
const VEIN_ALPHA = 0.28
const VEIN_W = 1
//
// A forked tail's lower lobe reaches LOWER_REACH of the upper one's
// length and LOWER_SPREAD of its spread; the lobes' roots overlap
// LOBE_OVERLAP px at the middle. A curled tail's line is sampled at
// CURL_SAMPLES points, half on its stalk (rising CURL_RISE px on its way
// back), half round its spiral (shrinking to 1 - CURL_SHRINK of its
// radius, so its last coil never folds over itself).
//
const LOWER_REACH = 0.92
const LOWER_SPREAD = 0.9
const LOBE_OVERLAP = 1
const CURL_SAMPLES = 120
const CURL_RISE = 6
const CURL_SHRINK = 0.78
//
// Side fins apart: picture size, the lobe's root half height, its far
// point's drop and its roundness (px), its far point's inset from the
// picture's left edge.
//
const PECT = { w: 44, h: 32, root: 7, drop: 6, round: 12 }
const PELV = { w: 38, h: 28, root: 6, drop: 5, round: 11 }
const SIDE_FIN_INSET = 3
const GAP = 4
const FULL_TURN = Math.PI * 2
const HALF = 0.5

export const FISH_ART = {
  picture: { w: WHOLE_W, h: BODY_H },
  bodyX: TAIL_X + PAD,
  texL: TEX_L,
  mid: MID,
  pectRoot: { x: PECT.w - 3, y: PECT.h * HALF },
  pelvRoot: { x: PELV.w - 3, y: PELV.h * HALF },
  pectAt: { u: 0.68, dy: 10 },
  pelvAt: { u: 0.52, dy: 22 }
}

/**
 * How far a kind's belly reaches under its spine at u (picture px).
 * @param {string} type - One of FISH_TYPES
 * @param {number} u - Along the body (0: the tail's root, 1: the snout)
 * @returns {number}
 */
export function bellyAt(type, u) {
  const b = bodyAt(TYPES[type], u)
  return b.down + b.drop
}

/**
 * Paints every fish picture of every kind into one atlas canvas (no
 * grain yet): per kind `${kind}.body` and `${kind}.bodyOpen`, and the
 * side fins `pectoral` and `pelvic` (shared by all kinds).
 * @returns {{canvas: HTMLCanvasElement, parts: Object<string, {x: number, y: number, w: number, h: number}>}}
 */
export function paintFishAtlas() {
  const parts = {}
  FISH_TYPES.forEach(type => {
    parts[`${type}.body`] = { w: WHOLE_W, h: BODY_H }
    parts[`${type}.bodyOpen`] = { w: WHOLE_W, h: BODY_H }
  })
  parts.pectoral = { w: PECT.w, h: PECT.h }
  parts.pelvic = { w: PELV.w, h: PELV.h }
  let y = GAP
  Object.values(parts).forEach(p => {
    p.x = GAP
    p.y = y
    y += p.h + GAP
  })
  const canvas = document.createElement('canvas')
  canvas.width = WHOLE_W + GAP * 2
  canvas.height = y
  const ctx = canvas.getContext('2d')
  FISH_TYPES.forEach(type => {
    paintPart(ctx, parts[`${type}.body`], c => paintWhole(c, TYPES[type], false))
    paintPart(ctx, parts[`${type}.bodyOpen`], c => paintWhole(c, TYPES[type], true))
  })
  paintPart(ctx, parts.pectoral, c => paintSideFin(c, PECT))
  paintPart(ctx, parts.pelvic, c => paintSideFin(c, PELV))
  return { canvas, parts }
}
function paintPart(ctx, part, paint) {
  ctx.save()
  ctx.translate(part.x, part.y)
  paint(ctx)
  ctx.restore()
}
//
// A forked tail first (the body over its root; a curled one is part of
// the body's own outline), then the body.
//
function paintWhole(ctx, t, open) {
  t.tail.kind === 'fork' && paintFork(ctx, t)
  ctx.save()
  ctx.translate(TAIL_X, 0)
  paintBody(ctx, t, open)
  ctx.restore()
}
//
// Half heights of the body at u (over and under the spine) and the
// spine's drop there.
//
function bodyAt(t, u) {
  const depth = u < t.deepU
    ? t.root + (1 - t.root) * Math.pow(Math.sin(u / t.deepU * Math.PI * HALF), t.rootPow)
    : Math.pow(Math.max(0, 1 - Math.pow((u - t.deepU) / (1 - t.deepU), t.nosePow)), HALF)
  const drop = t.snoutDrop * Math.pow(Math.max(0, (u - t.headU) / (1 - t.headU)), 2)
  return { up: t.up * depth, down: t.down * depth, drop }
}
function xOf(u) {
  return PAD + u * TEX_L
}
function topOf(t, u) {
  const b = bodyAt(t, u)
  return MID - b.up + b.drop
}
function bottomOf(t, u) {
  const b = bodyAt(t, u)
  return MID + b.down + b.drop
}
//
// The body's outline (body px): along the back to the snout, back under
// the belly — then, for a curled tail, on along the stalk's and the
// spiral's lower edge to its tip and back along their upper edge, one
// closed line. A forked tail's body is shut across its root for filling
// (`closed`) and left open there for its contour, so no seam shows where
// the tail runs on.
//
function bodyPath(ctx, t, closed = true) {
  ctx.beginPath()
  for (let u = 0; u <= 1; u += STEP) ctx.lineTo(xOf(u), topOf(t, u))
  ctx.lineTo(xOf(1), topOf(t, 1))
  for (let u = 1; u >= 0; u -= STEP) ctx.lineTo(xOf(u), bottomOf(t, u))
  ctx.lineTo(xOf(0), bottomOf(t, 0))
  if (t.tail.kind === 'curl') {
    const { upper, lower } = curlEdges(t)
    lower.forEach(p => ctx.lineTo(p.x - TAIL_X, p.y))
    for (let i = upper.length - 1; i >= 0; i--) ctx.lineTo(upper[i].x - TAIL_X, upper[i].y)
    ctx.closePath()
    return
  }
  closed && ctx.closePath()
}
//
// Fins behind the body, the body's paint (clipped to it), the contour,
// the eye, the mouth (shut, or gaping).
//
function paintBody(ctx, t, open) {
  t.dorsal.forEach(f => paintBodyFin(ctx, t, f, -1))
  t.anal.forEach(f => paintBodyFin(ctx, t, f, 1))
  ctx.save()
  bodyPath(ctx, t)
  ctx.clip()
  paintFlanks(ctx, t)
  paintRim(ctx, t)
  t.spots.forEach(s => paintSpot(ctx, t, s))
  ctx.restore()
  bodyPath(ctx, t, false)
  contour(ctx)
  paintEye(ctx, t)
  open ? paintOpenMouth(ctx, t) : paintMouth(ctx, t)
}
function contour(ctx) {
  ctx.strokeStyle = rgba(C.contour, CONTOUR_ALPHA)
  ctx.lineWidth = CONTOUR_W
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  ctx.stroke()
}
//
// Mauve from the back down to a warmer belly, a peach glow low on the
// flank (over the whole picture, the tail's room too).
//
function paintFlanks(ctx, t) {
  const g = ctx.createLinearGradient(0, MID - t.up, 0, MID + t.down)
  g.addColorStop(0, C.back)
  g.addColorStop(STOP_BODY, C.body)
  g.addColorStop(1, C.belly)
  ctx.fillStyle = g
  ctx.fillRect(-TAIL_X, 0, WHOLE_W, BODY_H)
  const glowTop = MID - t.up + (t.up + t.down) * GLOW_FROM
  const glow = ctx.createLinearGradient(0, glowTop, 0, MID + t.down)
  glow.addColorStop(0, rgba(C.glow, 0))
  glow.addColorStop(1, rgba(C.glow, GLOW_ALPHA))
  ctx.fillStyle = glow
  ctx.fillRect(-TAIL_X, glowTop, WHOLE_W, BODY_H)
}
//
// A soft warm line of light just inside the back.
//
function paintRim(ctx, t) {
  ctx.strokeStyle = rgba(C.rim, RIM_ALPHA)
  ctx.lineWidth = RIM_W
  ctx.lineCap = 'round'
  ctx.beginPath()
  for (let u = RIM_U0; u <= RIM_U1; u += STEP) ctx.lineTo(xOf(u), topOf(t, u) + RIM_IN)
  ctx.stroke()
}
function paintSpot(ctx, t, s) {
  const b = bodyAt(t, s.u)
  const x = xOf(s.u)
  const y = MID + b.drop + s.v * (s.v < 0 ? b.up : b.down)
  const g = ctx.createRadialGradient(x, y, 0, x, y, s.r)
  g.addColorStop(0, C.spot)
  g.addColorStop(SPOT_EDGE, C.spotEdge)
  g.addColorStop(1, rgba(C.spotEdge, 0))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(x, y, s.r, 0, FULL_TURN)
  ctx.fill()
}
//
// A big black eye with a thin dark rim and two glints.
//
function paintEye(ctx, t) {
  const { u, dy, r } = t.eye
  const x = xOf(u)
  const y = MID + bodyAt(t, u).drop + dy
  disc(ctx, x, y, r + EYE_RIM, C.contour)
  disc(ctx, x, y, r, C.eye)
  disc(ctx, x + GLINT.x * r, y + GLINT.y * r, GLINT.r * r, C.glint)
  disc(ctx, x + GLINT_SMALL.x * r, y + GLINT_SMALL.y * r, GLINT_SMALL.r * r, C.glint)
}
function disc(ctx, x, y, r, fill) {
  ctx.fillStyle = fill
  ctx.beginPath()
  ctx.arc(x, y, r, 0, FULL_TURN)
  ctx.fill()
}
//
// Shut: a small smile back from the snout.
//
function paintMouth(ctx, t) {
  const tip = xOf(1)
  const y = MID + bodyAt(t, 1).drop
  ctx.lineCap = 'round'
  ctx.strokeStyle = C.contour
  ctx.lineWidth = MOUTH_W
  ctx.beginPath()
  ctx.moveTo(tip - 1, y + 1)
  ctx.quadraticCurveTo(tip - MOUTH_L * HALF, y + MOUTH_SMILE * 2, tip - MOUTH_L, y + MOUTH_SMILE)
  ctx.stroke()
}
//
// Gaping: a dark wedge cut back into the snout, edged.
//
function paintOpenMouth(ctx, t) {
  const tip = xOf(1) + 1
  const y = MID + bodyAt(t, 1).drop
  ctx.beginPath()
  ctx.moveTo(tip, y - OPEN_UP)
  ctx.lineTo(tip - OPEN_BACK, y)
  ctx.lineTo(tip - 1, y + OPEN_DOWN)
  ctx.closePath()
  ctx.fillStyle = C.gape
  ctx.fill()
  ctx.strokeStyle = C.contour
  ctx.lineWidth = MOUTH_W
  ctx.lineJoin = 'round'
  ctx.stroke()
}
//
// A fin on the back (side -1) or the belly (1): a lobe from its root
// along the body out to its round end.
//
function paintBodyFin(ctx, t, f, side) {
  const edge = side < 0 ? u => topOf(t, u) + FIN_ROOT_IN : u => bottomOf(t, u) - FIN_ROOT_IN
  const a = { x: xOf(f.u0), y: edge(f.u0) }
  const b = { x: xOf(f.u1), y: edge(f.u1) }
  const mid = (f.u0 + f.u1) * HALF
  const tip = { x: xOf(f.tipU), y: (side < 0 ? topOf(t, mid) : bottomOf(t, mid)) + side * f.h }
  lobe(ctx, a, b, tip, f.round)
}
//
// Forked tail: an upper and a lower round lobe from the root.
//
function paintFork(ctx, t) {
  const f = t.tail
  const half = t.up * t.root
  const lowHalf = t.down * t.root
  lobe(ctx, { x: TAIL_RX, y: MID - half }, { x: TAIL_RX, y: MID + LOBE_OVERLAP }, { x: TAIL_RX - f.reach, y: MID - f.spread }, f.round)
  lobe(ctx, { x: TAIL_RX, y: MID - LOBE_OVERLAP }, { x: TAIL_RX, y: MID + lowHalf }, { x: TAIL_RX - f.reach * LOWER_REACH, y: MID + f.spread * LOWER_SPREAD }, f.round)
}
//
// A curled tail's two edges (picture px): its line from the body's root
// (as thick as the root there, centred on it) back along the stalk and
// round the spiral, thinning to its tip, offset either way.
//
function curlEdges(t) {
  const f = t.tail
  const top = MID - t.up * t.root
  const bottom = MID + t.down * t.root
  const w0 = bottom - top
  const pts = curlLine(f, TAIL_X + PAD, (top + bottom) * HALF)
  const upper = []
  const lower = []
  pts.forEach((p, i) => {
    const q = pts[Math.min(pts.length - 1, i + 1)]
    const o = pts[Math.max(0, i - 1)]
    const len = Math.hypot(q.x - o.x, q.y - o.y) || 1
    const nx = -(q.y - o.y) / len
    const ny = (q.x - o.x) / len
    const w = (w0 + (f.tipW - w0) * i / (pts.length - 1)) * HALF
    upper.push({ x: p.x + nx * w, y: p.y + ny * w })
    lower.push({ x: p.x - nx * w, y: p.y - ny * w })
  })
  return { upper, lower }
}
//
// The curled tail's line from (x0, y0): half its samples on the stalk (a
// gentle arc back to the spiral's top), half round the spiral (its radius
// shrinking over its turns).
//
function curlLine(f, x0, y0) {
  const cx = TAIL_RX - f.reach
  const half = CURL_SAMPLES >> 1
  const pts = []
  for (let i = 0; i < half; i++) {
    const s = i / half
    pts.push({ x: x0 + (cx - x0) * s, y: y0 + (MID - f.r - y0) * s - CURL_RISE * Math.sin(s * Math.PI) })
  }
  for (let i = 0; i <= half; i++) {
    const s = i / half
    const a = -Math.PI * HALF - s * f.turns * FULL_TURN
    const r = f.r * (1 - s * CURL_SHRINK)
    pts.push({ x: cx + Math.cos(a) * r, y: MID + Math.sin(a) * r })
  }
  return pts
}
//
// A side fin apart: a lobe from its root on the right, swept back.
//
function paintSideFin(ctx, f) {
  const rx = f.w - 3
  const ry = f.h * HALF
  lobe(ctx, { x: rx, y: ry - f.root }, { x: rx, y: ry + f.root }, { x: SIDE_FIN_INSET, y: ry + f.drop }, f.round)
}
//
// A fin lobe from two root points out to `tip` (its farthest point): a
// round end `round` px round there; the edge from the root point farther
// from it (the long, leading one) bowing out, the other bowing in a
// little; mauve at the root warming to peach at the end, edged like the
// body, a few faint veins.
//
function lobe(ctx, a, b, tip, round) {
  const mx = (a.x + b.x) * HALF
  const my = (a.y + b.y) * HALF
  const full = Math.hypot(tip.x - mx, tip.y - my)
  const dx = (tip.x - mx) / full
  const dy = (tip.y - my) / full
  const nx = -dy
  const ny = dx
  const cx = tip.x - dx * round
  const cy = tip.y - dy * round
  const [p, q] = (a.x - mx) * nx + (a.y - my) * ny > 0 ? [a, b] : [b, a]
  const pLeads = Math.hypot(cx - p.x, cy - p.y) >= Math.hypot(cx - q.x, cy - q.y)
  const len = full - round
  const pBow = (pLeads ? LEAD_BOW : -TRAIL_BOW) * len
  const qBow = (pLeads ? -TRAIL_BOW : LEAD_BOW) * len
  const tp = { x: cx + nx * round, y: cy + ny * round }
  const tq = { x: cx - nx * round, y: cy - ny * round }
  const turn = Math.atan2(ny, nx)
  ctx.beginPath()
  ctx.moveTo(p.x, p.y)
  ctx.bezierCurveTo(p.x + dx * len * EDGE_PULL + nx * pBow, p.y + dy * len * EDGE_PULL + ny * pBow, tp.x - dx * round * END_PULL + nx * pBow * HALF, tp.y - dy * round * END_PULL + ny * pBow * HALF, tp.x, tp.y)
  ctx.arc(cx, cy, round, turn, turn - Math.PI, true)
  ctx.bezierCurveTo(tq.x - dx * round * END_PULL - nx * qBow * HALF, tq.y - dy * round * END_PULL - ny * qBow * HALF, q.x + dx * len * EDGE_PULL - nx * qBow, q.y + dy * len * EDGE_PULL - ny * qBow, q.x, q.y)
  ctx.closePath()
  const g = ctx.createLinearGradient(mx, my, tip.x, tip.y)
  g.addColorStop(0, C.fin)
  g.addColorStop(1, C.finTip)
  ctx.fillStyle = g
  ctx.fill()
  contour(ctx)
  ctx.strokeStyle = rgba(C.vein, VEIN_ALPHA)
  ctx.lineWidth = VEIN_W
  for (let i = 0; i < VEINS; i++) {
    const o = (i / (VEINS - 1) * 2 - 1) * round * VEIN_SPREAD
    ctx.beginPath()
    ctx.moveTo(mx, my)
    ctx.quadraticCurveTo(mx + dx * len * HALF + nx * o * HALF, my + dy * len * HALF + ny * o * HALF, mx + dx * full * VEIN_REACH + nx * o, my + dy * full * VEIN_REACH + ny * o)
    ctx.stroke()
  }
}
function rgba(hex, alpha) {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${Math.max(0, Math.min(1, alpha))})`
}
