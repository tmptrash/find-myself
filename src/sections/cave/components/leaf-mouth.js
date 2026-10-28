import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_PAL, css } from '../utils/cave-paint.js'
//
// The red mouth grown into a trap leaf: a dark recessed throat ringed by
// fleshy lips, a collar of green leaves where it leaves the pad, and curved
// pointed tendrils around it. Open, the tendrils lean out and back like a
// flower; shut, they fold in over the throat into a low bud. A few openness
// frames are baked once per live k and picked by the trap's state; while
// open it breathes, and it quivers when prey is near.
//
const SPRITE_PREFIX = 'cave0-mouth-v1'
const GRAIN_SEED = 9400
const FRAMES = 8
const BAKE_W = 2.2
const BAKE_H = 1.6
const CENTER_Y = 0.62
//
// Tendrils: count, base ring (share of R, flattened in depth), width, how
// far they reach open (out / up) and where their tips meet shut.
//
const TENDRILS = 11
const TENDRIL_JITTER = 0.35
const RING_RX = 0.55
const RING_RY = 0.24
const TENDRIL_W = 0.17
const TENDRIL_LEN_MIN = 0.85
const TENDRIL_LEN_RANGE = 0.35
const OPEN_OUT = 0.6
const OPEN_UP = 0.55
const OPEN_CURL = 0.18
const SHUT_UP = 0.3
const SHUT_SPREAD = 0.06
const CTRL_UP = 0.55
const CTRL_OUT = 0.15
const TENDRIL_STEPS = 10
const TENDRIL_LIT_W = 0.35
const TENDRIL_CONTOUR_W = 1.2
const TIP_R = 1.2
//
// Throat and lips: throat size closed / open (share of R), depth squash,
// lip ring widths.
//
const THROAT_MIN = 0.06
const THROAT_RANGE = 0.44
const THROAT_SQUASH = 0.42
const LIP_W = 0.14
const LIP_LIT_W = 2
const THROAT_GLOW = 0.45
//
// Green collar where the mouth leaves the pad.
//
const COLLAR_LEAVES = 13
const COLLAR_RX = 0.78
const COLLAR_RY = 0.32
const COLLAR_LEN = 0.38
const COLLAR_W = 0.16
const COLLAR_TILT = 0.4
//
// Breathing while open, quiver when prey is near, swell before opening.
//
const BREATH = 0.03
const BREATH_SPEED = 1.4
const QUIVER_SPEED = 9
const QUIVER = 0.025
const FULL_TURN = Math.PI * 2
const bakedByK = new WeakMap()

/**
 * Creates a mouth on a trap leaf.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Throat centre X (world)
 * @param {number} cfg.y - Throat centre Y (world)
 * @param {number} cfg.r - Mouth radius
 * @param {number} [cfg.seed=1] - Tendril layout seed
 * @returns {Object} Mouth instance
 */
export function create(cfg) {
  const { k, x, y, r, seed = 1 } = cfg
  return {
    k,
    x,
    y,
    frames: bakeFrames(k, r, seed),
    open: 1,
    swell: 0,
    alert: false,
    phase: createSeededRandom(seed)() * FULL_TURN
  }
}

/**
 * Sets how open the mouth is, how much it swells and whether prey is near.
 * @param {Object} inst - Mouth instance
 * @param {number} open - 0 (shut bud) … 1 (wide open)
 * @param {number} swell - Extra size share (anticipation before opening)
 * @param {boolean} alert - Prey close by (quiver)
 */
export function setState(inst, open, swell, alert) {
  inst.open = open
  inst.swell = swell
  inst.alert = alert
}

/**
 * Draws the frame closest to the current openness, breathing while open.
 * @param {Object} inst - Mouth instance
 */
export function onDraw(inst) {
  const k = inst.k
  const t = k.time()
  const frame = inst.frames.names[Math.round(inst.open * (FRAMES - 1))]
  const breath = Math.sin(t * BREATH_SPEED + inst.phase) * BREATH * inst.open
  const quiver = inst.alert ? Math.sin(t * QUIVER_SPEED + inst.phase) * QUIVER : 0
  const s = 1 + inst.swell + breath + quiver
  k.drawSprite({
    sprite: frame,
    pos: k.vec2(inst.x, inst.y),
    anchor: k.vec2(0, CENTER_Y * 2 - 1),
    scale: k.vec2(s, 1 + inst.swell + breath)
  })
}
//
// Openness frames for one radius, once per live k.
//
function bakeFrames(k, r, seed) {
  let perK = bakedByK.get(k)
  !perK && (perK = new Map(), bakedByK.set(k, perK))
  const key = `${r}-${seed}`
  const cached = perK.get(key)
  if (cached) return cached
  const w = Math.ceil(r * BAKE_W)
  const h = Math.ceil(r * BAKE_H)
  const names = []
  for (let f = 0; f < FRAMES; f++) {
    const canvas = document.createElement('canvas')
    canvas.width = w
    canvas.height = h
    paintMouth(canvas.getContext('2d'), w / 2, h * CENTER_Y, r, f / (FRAMES - 1), createSeededRandom(seed))
    applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + seed + f)
    const name = `${SPRITE_PREFIX}-${key}-${f}`
    k.loadSprite(name, canvas)
    names.push(name)
  }
  const out = { names }
  perK.set(key, out)
  return out
}
//
// One frame: green collar, tendrils behind the throat, lips and throat,
// tendrils in front.
//
function paintMouth(ctx, cx, cy, r, open, rng) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  const tendrils = []
  for (let i = 0; i < TENDRILS; i++) {
    const a = (i + (rng() - 0.5) * TENDRIL_JITTER) / TENDRILS * FULL_TURN
    tendrils.push({ a, len: TENDRIL_LEN_MIN + rng() * TENDRIL_LEN_RANGE, shut: (rng() - 0.5) * SHUT_SPREAD })
  }
  paintCollar(ctx, cx, cy, r, rng)
  tendrils.filter(td => Math.sin(td.a) < 0).forEach(td => paintTendril(ctx, cx, cy, r, open, td))
  paintThroat(ctx, cx, cy, r, open)
  tendrils.filter(td => Math.sin(td.a) >= 0).forEach(td => paintTendril(ctx, cx, cy, r, open, td))
}
//
// Pointed dark-green leaves fanning flat around the mouth's base.
//
function paintCollar(ctx, cx, cy, r, rng) {
  const [contour, shadow, dark, mid] = CAVE_PAL.plantRosette
  for (let i = 0; i < COLLAR_LEAVES; i++) {
    const a = (i + rng() * TENDRIL_JITTER) / COLLAR_LEAVES * FULL_TURN
    const base = { x: cx + Math.cos(a) * r * RING_RX, y: cy + Math.sin(a) * r * RING_RY }
    const tip = { x: cx + Math.cos(a) * r * (COLLAR_RX + COLLAR_LEN), y: cy + Math.sin(a) * r * (COLLAR_RY + COLLAR_LEN * RING_RY) }
    const side = { x: -(tip.y - base.y), y: tip.x - base.x }
    const len = Math.hypot(side.x, side.y) || 1
    const half = r * COLLAR_W / 2
    const n = { x: side.x / len * half, y: side.y / len * half }
    const mid1 = { x: (base.x + tip.x) / 2, y: (base.y + tip.y) / 2 - r * COLLAR_TILT * COLLAR_W }
    ctx.beginPath()
    ctx.moveTo(base.x, base.y)
    ctx.quadraticCurveTo(mid1.x + n.x * 2, mid1.y + n.y * 2, tip.x, tip.y)
    ctx.quadraticCurveTo(mid1.x - n.x * 2, mid1.y - n.y * 2, base.x, base.y)
    ctx.closePath()
    ctx.fillStyle = css(Math.sin(a) > 0 ? mid : i % 2 ? dark : shadow)
    ctx.fill()
    ctx.strokeStyle = css(contour)
    ctx.lineWidth = 1
    ctx.stroke()
  }
}
//
// Fleshy lip ring, then the dark recessed throat with a faint inner glow.
//
function paintThroat(ctx, cx, cy, r, open) {
  const [contour, deep, dark, mid, light] = CAVE_PAL.trapLeaf3d
  const rx = r * (THROAT_MIN + THROAT_RANGE * open)
  const ry = rx * THROAT_SQUASH
  const lip = r * LIP_W
  ctx.fillStyle = css(mid)
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx + lip, ry + lip * THROAT_SQUASH, 0, 0, FULL_TURN)
  ctx.fill()
  ctx.strokeStyle = css(contour)
  ctx.lineWidth = TENDRIL_CONTOUR_W
  ctx.stroke()
  ctx.strokeStyle = css(light)
  ctx.lineWidth = LIP_LIT_W
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx + lip / 2, ry + lip * THROAT_SQUASH / 2, 0, Math.PI, FULL_TURN)
  ctx.stroke()
  const g = ctx.createRadialGradient(cx, cy + ry * THROAT_GLOW, 0, cx, cy, rx)
  g.addColorStop(0, css(dark))
  g.addColorStop(THROAT_GLOW, css(deep))
  g.addColorStop(1, css(contour))
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.ellipse(cx, cy, rx, ry, 0, 0, FULL_TURN)
  ctx.fill()
}
//
// One tendril: a tapered curved spike from the lip ring; open it leans out
// and up with a curled tip, shut it folds in over the throat.
//
function paintTendril(ctx, cx, cy, r, open, td) {
  const [contour, , dark, mid, light, high] = CAVE_PAL.trapLeaf3d
  const c = Math.cos(td.a)
  const s = Math.sin(td.a)
  const base = { x: cx + c * r * RING_RX, y: cy + s * r * RING_RY }
  const openTip = { x: base.x + c * r * OPEN_OUT * td.len, y: base.y + s * r * RING_RY * OPEN_OUT - r * OPEN_UP * td.len + r * OPEN_CURL }
  const shutTip = { x: cx + r * td.shut, y: cy - r * SHUT_UP * td.len }
  const tip = { x: shutTip.x + (openTip.x - shutTip.x) * open, y: shutTip.y + (openTip.y - shutTip.y) * open }
  const ctrl = { x: base.x + c * r * CTRL_OUT * open, y: base.y - r * CTRL_UP * td.len * (open + (1 - open) * SHUT_UP) }
  const left = []
  const right = []
  for (let i = 0; i <= TENDRIL_STEPS; i++) {
    const t = i / TENDRIL_STEPS
    const u = 1 - t
    const p = { x: u * u * base.x + 2 * u * t * ctrl.x + t * t * tip.x, y: u * u * base.y + 2 * u * t * ctrl.y + t * t * tip.y }
    const d = { x: 2 * u * (ctrl.x - base.x) + 2 * t * (tip.x - ctrl.x), y: 2 * u * (ctrl.y - base.y) + 2 * t * (tip.y - ctrl.y) }
    const len = Math.hypot(d.x, d.y) || 1
    const half = r * TENDRIL_W / 2 * (1 - t)
    left.push({ x: p.x - d.y / len * half, y: p.y + d.x / len * half })
    right.push({ x: p.x + d.y / len * half, y: p.y - d.x / len * half })
  }
  const path = new Path2D()
  left.forEach((q, i) => (i ? path.lineTo(q.x, q.y) : path.moveTo(q.x, q.y)))
  right.slice().reverse().forEach(q => path.lineTo(q.x, q.y))
  path.closePath()
  ctx.fillStyle = css(s < 0 ? dark : mid)
  ctx.fill(path)
  ctx.strokeStyle = css(light)
  ctx.lineWidth = r * TENDRIL_W * TENDRIL_LIT_W
  ctx.beginPath()
  left.forEach((q, i) => (i ? ctx.lineTo(q.x, q.y) : ctx.moveTo(q.x, q.y)))
  ctx.stroke()
  ctx.strokeStyle = css(contour)
  ctx.lineWidth = TENDRIL_CONTOUR_W
  ctx.stroke(path)
  ctx.fillStyle = css(high)
  ctx.beginPath()
  ctx.arc(tip.x, tip.y, TIP_R, 0, FULL_TURN)
  ctx.fill()
}
