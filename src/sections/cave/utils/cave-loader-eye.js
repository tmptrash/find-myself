import * as Motion from '../../../utils/loader-eye-motion.js'
import { CAVE_CFG } from '../cfg.js'
//
// The loader's eye for the cave (boot-loader.js draws it while a cave level
// loads): the cave's stalk-eye (cave-stalk-eye.js) lying on its side — a
// blood-red stalk tapering from its root to the eye, contoured, with a lit
// line along it and dark thorns tipped bone-pale on either side, topped
// by a bloodshot eye (a pinkish shaded
// side, red veins running in from the rim, a red iris ring round a small
// pupil with a glint). The stalk grows with the loading progress; it
// sways, the eye looks about and blinks (loader-eye-motion.js). SVG units
// are CSS px.
//
const C = CAVE_CFG.creature
const SVG_NS = 'http://www.w3.org/2000/svg'
//
// The picture: VIEW_W × VIEW_H; the stalk's root at ROOT_X on the middle
// line, its widths W_BASE → W_TIP (with CONTOUR more for its outline), its
// lit line LIGHT_FRAC of its width, LIGHT_UP of its half width toward its
// top; drawn through a point every PATH_STEP px. It reaches at most
// STALK_MAX_LEN (the eye at its tip).
//
const VIEW_W = 360
const VIEW_H = 110
const MAX_VW = 62
const ROOT_X = 14
const MID_Y = VIEW_H / 2
const W_BASE = 11
const W_TIP = 5
const CONTOUR = 2.4
const LIGHT_FRAC = 0.35
const LIGHT_UP = 0.3
const PATH_STEP = 3
//
// Sway: a main wave and a slower, weaker one, growing from nothing at the
// root (so it stays planted) to full at the tip.
//
const WAVE_AMP = 6
const WAVE_FREQ = 0.04
const WAVE_SPEED = 1.8
const WAVE2_AMP = 2.5
const WAVE2_FREQ = 0.019
const WAVE2_SPEED = 0.8
const WAVE2_PHASE = 1.4
//
// Thorns every THORN_STEP px of the stalk (from THORN_FROM px past the
// root), sides taking turns, THORN_LEN → THORN_LEN_TIP long toward the
// tip, THORN_W wide at the base, leaning THORN_LEAN of their length toward
// the tip; the last THORN_TIP_SHARE of each bone-pale.
//
const THORN_STEP = 17
const THORN_FROM = 14
const THORN_LEN = 12
const THORN_LEN_TIP = 7
const THORN_W = 5
const THORN_LEAN = 0.45
const THORN_TIP_SHARE = 0.35
//
// The eye: radius, contour, its lit face (off its middle by LIT_OFFSET of
// the radius, LIT_FRAC of it across), VEINS veins in from the rim to
// VEIN_IN..+RANGE of the radius from the middle, wandering VEIN_BEND, VEIN_W
// wide; the pupil (PUPIL_FRAC of the radius) in an iris ring IRIS_FRAC of
// it, with a glint; how far the pupil looks off the middle. The lid (stalk
// red) slides down with its lower edge bowed LID_BULGE.
//
const EYE_R = 16
const EYE_CONTOUR = 1.8
const LIT_OFFSET = -0.12
const LIT_FRAC = 0.82
const VEINS = 8
const VEIN_IN = 0.35
const VEIN_IN_RANGE = 0.3
const VEIN_BEND = 0.35
const VEIN_W = 1.1
const PUPIL_FRAC = 0.22
const IRIS_FRAC = 1.9
const GLINT_X = -0.35
const GLINT_Y = -0.35
const GLINT_R = 0.35
const LOOK_FRAC = 0.4
const LID_BULGE = EYE_R * 0.9
const LID_OVERHANG = 2
const LID_CLIP_ID = 'loader-cave-eye-lid-clip'
const STALK_MAX_LEN = VIEW_W - ROOT_X - EYE_R * 2 - EYE_CONTOUR * 2
const FULL = 100
const HALF = 0.5

/**
 * Builds the cave's loader eye.
 * @param {string} id - The SVG's element id
 * @returns {Object} Eye instance (its `svg` goes into the loader panel)
 */
export function create(id) {
  const svg = svgEl('svg', { id, width: VIEW_W, height: VIEW_H, viewBox: `0 0 ${VIEW_W} ${VIEW_H}` })
  svg.style.overflow = 'visible'
  svg.style.width = `min(${VIEW_W}px, ${MAX_VW}vw)`
  svg.style.height = 'auto'
  const inst = {
    svg,
    time: 0,
    motion: Motion.create(EYE_R * LOOK_FRAC),
    thornsContour: svgEl('path', { fill: C.contour, stroke: C.contour, 'stroke-width': EYE_CONTOUR, 'stroke-linejoin': 'round' }),
    thorns: svgEl('path', { fill: C.thorn }),
    thornTips: svgEl('path', { fill: C.thornTip }),
    stalkContour: svgEl('path', { fill: C.contour }),
    stalk: svgEl('path', { fill: C.stem }),
    stalkLight: svgEl('path', { fill: C.stemLight }),
    eye: svgEl('g', {}),
    iris: svgEl('circle', { r: EYE_R * PUPIL_FRAC * IRIS_FRAC, fill: C.iris }),
    pupil: svgEl('circle', { r: EYE_R * PUPIL_FRAC, fill: C.pupil }),
    glint: svgEl('circle', { r: EYE_R * PUPIL_FRAC * GLINT_R, fill: C.glint }),
    lid: svgEl('g', { 'clip-path': `url(#${LID_CLIP_ID})`, display: 'none' }),
    lidFill: svgEl('path', { fill: C.stem }),
    lidEdge: svgEl('path', { fill: 'none', stroke: C.contour, 'stroke-width': EYE_CONTOUR })
  }
  buildEye(inst)
  const layers = [inst.thornsContour, inst.stalkContour, inst.thorns, inst.thornTips, inst.stalk, inst.stalkLight, inst.eye]
  layers.forEach(node => svg.appendChild(node))
  return inst
}

/**
 * Redraws the eye: the stalk grown to the shown progress, swaying, the
 * eye at its tip looking about and blinking.
 * @param {Object} inst - Eye instance
 * @param {number} dt - Seconds since the last frame
 * @param {number} pct - Shown progress (0..100)
 */
export function onDraw(inst, dt, pct) {
  inst.time += dt
  const close = Motion.onUpdate(inst.motion, dt)
  const pts = stalkPoints(inst, ROOT_X + STALK_MAX_LEN * pct / FULL)
  inst.stalkContour.setAttribute('d', ribbonPath(pts, CONTOUR, 1, 0))
  inst.stalk.setAttribute('d', ribbonPath(pts, 0, 1, 0))
  inst.stalkLight.setAttribute('d', ribbonPath(pts, 0, LIGHT_FRAC, LIGHT_UP))
  const thorns = thornShapes(pts)
  inst.thornsContour.setAttribute('d', thorns.body)
  inst.thorns.setAttribute('d', thorns.body)
  inst.thornTips.setAttribute('d', thorns.tips)
  const tip = pts[pts.length - 1]
  inst.eye.setAttribute('transform', `translate(${(tip.x + EYE_R).toFixed(1)} ${tip.y.toFixed(1)})`)
  const px = inst.motion.pupilX
  const py = inst.motion.pupilY
  setCenter(inst.iris, px, py)
  setCenter(inst.pupil, px, py)
  setCenter(inst.glint, px + EYE_R * PUPIL_FRAC * GLINT_X, py + EYE_R * PUPIL_FRAC * GLINT_Y)
  drawLid(inst, close)
}
//
// The eye's still parts (contour, shaded white, its lit face, the veins)
// under the moving ones (iris, pupil, glint) and the lid.
//
function buildEye(inst) {
  const g = inst.eye
  g.appendChild(svgEl('circle', { r: EYE_R + EYE_CONTOUR, fill: C.contour }))
  g.appendChild(svgEl('circle', { r: EYE_R, fill: C.scleraShade }))
  g.appendChild(svgEl('circle', { cx: EYE_R * LIT_OFFSET, cy: EYE_R * LIT_OFFSET, r: EYE_R * LIT_FRAC, fill: C.sclera }))
  g.appendChild(svgEl('path', { d: veinsPath(), fill: 'none', stroke: C.vein, 'stroke-width': VEIN_W, 'stroke-linecap': 'round' }))
  const moving = [inst.iris, inst.pupil, inst.glint]
  moving.forEach(node => g.appendChild(node))
  const clip = svgEl('clipPath', { id: LID_CLIP_ID })
  clip.appendChild(svgEl('circle', { r: EYE_R + EYE_CONTOUR }))
  g.appendChild(clip)
  inst.lid.appendChild(inst.lidFill)
  inst.lid.appendChild(inst.lidEdge)
  g.appendChild(inst.lid)
}
//
// Veins from the rim in toward the middle, each a little crooked.
//
function veinsPath() {
  let d = ''
  for (let i = 0; i < VEINS; i++) {
    const a = (i + Math.random() * HALF) / VEINS * Math.PI * 2
    const to = VEIN_IN + Math.random() * VEIN_IN_RANGE
    const bend = (Math.random() * 2 - 1) * VEIN_BEND
    const mid = (1 + to) * HALF
    const p0 = polar(a, EYE_R)
    const p1 = polar(a + bend * HALF, EYE_R * mid)
    const p2 = polar(a - bend * HALF, EYE_R * to)
    d += `M${p0.x.toFixed(1)} ${p0.y.toFixed(1)} Q${p1.x.toFixed(1)} ${p1.y.toFixed(1)} ${p2.x.toFixed(1)} ${p2.y.toFixed(1)} `
  }
  return d
}
function polar(a, r) {
  return { x: Math.cos(a) * r, y: Math.sin(a) * r }
}
//
// The stalk's middle line from the root to the tip, swaying more toward
// the tip; each point with its share along the full stalk and its unit
// normal (toward the stalk's top).
//
function stalkPoints(inst, tipX) {
  const pts = []
  for (let x = ROOT_X; x < tipX; x += PATH_STEP) pts.push({ x, y: stalkY(inst, x) })
  pts.push({ x: tipX, y: stalkY(inst, tipX) })
  pts.length < 2 && pts.push({ x: tipX + 1, y: stalkY(inst, tipX + 1) })
  pts.forEach((p, i) => {
    const a = pts[Math.max(0, i - 1)]
    const b = pts[Math.min(pts.length - 1, i + 1)]
    const l = Math.hypot(b.x - a.x, b.y - a.y) || 1
    p.tx = (b.x - a.x) / l
    p.ty = (b.y - a.y) / l
    p.nx = p.ty
    p.ny = -p.tx
    p.u = (p.x - ROOT_X) / STALK_MAX_LEN
    p.w = W_BASE + (W_TIP - W_BASE) * p.u
  })
  return pts
}
function stalkY(inst, x) {
  const along = (x - ROOT_X) / STALK_MAX_LEN
  const wave = Math.sin(x * WAVE_FREQ - inst.time * WAVE_SPEED) * WAVE_AMP
  const drift = Math.sin(x * WAVE2_FREQ - inst.time * WAVE2_SPEED + WAVE2_PHASE) * WAVE2_AMP
  return MID_Y + (wave + drift) * along
}
//
// A tapered ribbon along the stalk: its width (plus `pad`) times `share`,
// shifted `up` of its half width toward the top; round at both ends.
//
function ribbonPath(pts, pad, share, up) {
  const top = pts.map(p => ribbonEdge(p, pad, share, up, 1))
  const bottom = pts.map(p => ribbonEdge(p, pad, share, up, -1)).reverse()
  const end = capRadius(pts[pts.length - 1], pad, share)
  const start = capRadius(pts[0], pad, share)
  return `M${top[0]} L${top.join(' L')} A${end} ${end} 0 0 1 ${bottom[0]} L${bottom.join(' L')} A${start} ${start} 0 0 1 ${top[0]} Z`
}
//
// A ribbon's edge point at a stalk point (`sign` 1 its top, -1 its bottom).
//
function ribbonEdge(p, pad, share, up, sign) {
  const off = p.w * HALF * up + sign * capRadius(p, pad, share)
  return `${(p.x + p.nx * off).toFixed(1)} ${(p.y + p.ny * off).toFixed(1)}`
}
function capRadius(p, pad, share) {
  return (p.w * share + pad) * HALF
}
//
// Thorns along the stalk, sides taking turns, leaning toward the tip:
// their bodies, and their bone-pale tips.
//
function thornShapes(pts) {
  let body = ''
  let tips = ''
  let walked = 0
  let next = THORN_FROM
  let n = 0
  for (let i = 1; i < pts.length - 1; i++) {
    walked += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    if (walked < next) continue
    next += THORN_STEP
    const p = pts[i]
    const side = n++ % 2 === 0 ? 1 : -1
    const len = THORN_LEN + (THORN_LEN_TIP - THORN_LEN) * p.u
    const bx = p.x + p.nx * side * p.w * HALF
    const by = p.y + p.ny * side * p.w * HALF
    const tipX = bx + p.nx * side * len + p.tx * len * THORN_LEAN
    const tipY = by + p.ny * side * len + p.ty * len * THORN_LEAN
    const ax = bx - p.tx * THORN_W * HALF - p.nx * side
    const ay = by - p.ty * THORN_W * HALF - p.ny * side
    const cx = bx + p.tx * THORN_W * HALF - p.nx * side
    const cy = by + p.ty * THORN_W * HALF - p.ny * side
    body += tri(ax, ay, tipX, tipY, cx, cy)
    const k = 1 - THORN_TIP_SHARE
    tips += tri(ax + (tipX - ax) * k, ay + (tipY - ay) * k, tipX, tipY, cx + (tipX - cx) * k, cy + (tipY - cy) * k)
  }
  return { body, tips }
}
function tri(ax, ay, bx, by, cx, cy) {
  return `M${ax.toFixed(1)} ${ay.toFixed(1)} L${bx.toFixed(1)} ${by.toFixed(1)} L${cx.toFixed(1)} ${cy.toFixed(1)} Z `
}
//
// The lid: down by `close` (0 open, 1 shut), its lower edge bowed.
//
function drawLid(inst, close) {
  if (close <= 0) {
    inst.lid.setAttribute('display', 'none')
    return
  }
  const side = EYE_R + LID_OVERHANG
  const edgeY = -EYE_R - LID_BULGE * HALF + (EYE_R * 2 + LID_BULGE * HALF) * close
  const arc = `Q0 ${(edgeY + LID_BULGE).toFixed(2)} ${-side} ${edgeY.toFixed(2)}`
  inst.lid.setAttribute('display', 'inline')
  inst.lidFill.setAttribute('d', `M${-side} ${-side} L${side} ${-side} L${side} ${edgeY.toFixed(2)} ${arc} Z`)
  inst.lidEdge.setAttribute('d', `M${side} ${edgeY.toFixed(2)} ${arc}`)
}
function setCenter(node, x, y) {
  node.setAttribute('cx', x.toFixed(2))
  node.setAttribute('cy', y.toFixed(2))
}
function svgEl(tag, attrs) {
  const el = document.createElementNS(SVG_NS, tag)
  Object.entries(attrs).forEach(([name, value]) => el.setAttribute(name, String(value)))
  return el
}
