import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { addTaperedPass } from '../../forest/utils/forest-eye-berry.js'
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
// Breathing while open (the whole mouth swells evenly), a small trembling
// tilt when prey is near (degrees), swell before opening.
//
const BREATH = 0.03
const BREATH_SPEED = 1.4
const QUIVER_SPEED = 9
const QUIVER_DEG = 2.5
//
// Grab: while the mouth seizes prey its own tendrils are drawn live (the
// baked frame then shows only collar and throat). Every other tendril
// grabs: it whips out to the prey and coils around him in a band seen a
// little from above (flat ellipse, spiralling down a bit); the band's
// lower half passes in front of him, the upper half behind. The others
// lean in toward the prey. Band heights are in prey half-heights from his
// centre (negative = up).
//
const GRAB_BANDS = [-0.55, 0.05, -0.25, 0.4, -0.75, 0.2]
const GRAB_EVERY = 2
const BAND_RX = 1.2
const BAND_RY = 0.3
const BAND_SPIRAL = 0.25
const WRAP_SWEEP = Math.PI * 1.7
const COIL_STEPS = 12
const REACH_STEPS = 10
const REACH_ARC = 0.45
const REACH_OVERSHOOT = 1.7
const LEAN = 0.35
//
// Closing over the prey: the free tendrils' tips meet above his head
// (prey half-heights above his centre), the coils tighten.
//
const CLOSE_TOP = 1.15
const CLOSE_SQUEEZE = 0.15
const COIL_W = 0.45
const GRAB_TIP_W = 1.5
const GRAB_OUTLINE = 2.4
const GRAB_LIT_SHARE = 0.35
const PREY_HALF_W = 15
const PREY_HALF_H = 32
const FULL_TURN = Math.PI * 2
const HALF = 0.5
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
  const [contour, , dark, mid, light, high] = CAVE_PAL.trapLeaf3d
  return {
    k,
    x,
    y,
    r,
    tendrils: tendrilLayout(createSeededRandom(seed)),
    frames: bakeFrames(k, r, seed),
    open: 1,
    swell: 0,
    alert: false,
    grab: null,
    lines: [],
    batch: PolyBatch.create(),
    grabRgb: { contour: getRGB(k, contour), dark: getRGB(k, dark), mid: getRGB(k, mid), light: getRGB(k, light), high: getRGB(k, high) },
    phase: createSeededRandom(seed)() * FULL_TURN
  }
}

/**
 * Starts, moves or ends the grab and lays out the live tendrils for it.
 * @param {Object} inst - Mouth instance
 * @param {{reach: number, wrap: number, squeeze: number, close: number, x: number, y: number, sx: number, sy: number}|null} grab
 *   reach 0 … 1 (tips out to the prey), wrap 0 … 1 (coils round him), squeeze
 *   (band tightening share), close 0 … 1 (all tendrils shut over him), prey
 *   centre and width / height scale; null ends the grab
 */
export function setGrab(inst, grab) {
  inst.grab = grab
  inst.lines = grab ? inst.tendrils.map((td, i) => grabLine(inst, td, i)) : []
}

/**
 * Draws the parts of the grabbing tendrils that lie behind the prey
 * (call before the prey is drawn).
 * @param {Object} inst - Mouth instance
 */
export function onDrawBack(inst) {
  inst.grab && drawLines(inst, false)
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
  const frame = inst.grab ? inst.frames.base : inst.frames.names[Math.round(inst.open * (FRAMES - 1))]
  const breath = inst.grab ? 0 : Math.sin(t * BREATH_SPEED + inst.phase) * BREATH * inst.open
  const s = 1 + inst.swell + breath
  k.drawSprite({
    sprite: frame,
    pos: k.vec2(inst.x, inst.y),
    anchor: k.vec2(0, CENTER_Y * 2 - 1),
    scale: k.vec2(s, s),
    angle: inst.alert ? Math.sin(t * QUIVER_SPEED + inst.phase) * QUIVER_DEG : 0
  })
  inst.grab && drawLines(inst, true)
}
//
// Tendril layout (angle round the lip ring, length, where it meets when
// shut), the same for the bake and the live grab.
//
function tendrilLayout(rng) {
  const tendrils = []
  for (let i = 0; i < TENDRILS; i++) {
    const a = (i + (rng() - HALF) * TENDRIL_JITTER) / TENDRILS * FULL_TURN
    tendrils.push({ a, len: TENDRIL_LEN_MIN + rng() * TENDRIL_LEN_RANGE, shut: (rng() - HALF) * SHUT_SPREAD })
  }
  return tendrils
}
//
// Root on the lip ring and open tip of a tendril, in world space.
//
function tendrilPose(inst, td) {
  const c = Math.cos(td.a)
  const s = Math.sin(td.a)
  const r = inst.r
  const base = { x: inst.x + c * r * RING_RX, y: inst.y + s * r * RING_RY }
  const tip = { x: base.x + c * r * OPEN_OUT * td.len, y: base.y + s * r * RING_RY * OPEN_OUT - r * OPEN_UP * td.len + r * OPEN_CURL }
  return { base, tip, front: s >= 0 }
}
//
// One live tendril: points with width and depth. A grabber reaches from its
// root to the start of its band on the prey (overshooting a little), then
// coils round him; the others only lean their tips toward him.
//
function grabLine(inst, td, i) {
  const g = inst.grab
  const { base, tip, front } = tendrilPose(inst, td)
  const w0 = inst.r * TENDRIL_W
  const grabber = i % GRAB_EVERY === 0
  if (!grabber) {
    const lean = { x: tip.x + (g.x - tip.x) * LEAN * g.reach, y: tip.y + (g.y - tip.y) * LEAN * g.reach }
    const top = { x: g.x + (tip.x - g.x) * (1 - g.close), y: g.y - PREY_HALF_H * CLOSE_TOP * g.sy }
    const end = { x: lean.x + (top.x - lean.x) * g.close, y: lean.y + (top.y - lean.y) * g.close }
    return reachPoints(inst, base, end, w0, GRAB_TIP_W, front)
  }
  const band = GRAB_BANDS[(i / GRAB_EVERY) % GRAB_BANDS.length]
  const startA = base.x < g.x ? Math.PI : 0
  const dir = base.x < g.x ? -1 : 1
  const coil = coilPoints(g, band, startA, dir)
  const out = 1 - Math.pow(1 - g.reach, 3) * (1 - REACH_OVERSHOOT * g.reach * (1 - g.reach))
  const end = { x: tip.x + (coil[0].x - tip.x) * out, y: tip.y + (coil[0].y - tip.y) * out }
  const wMid = w0 * COIL_W
  const reach = reachPoints(inst, base, end, w0, wMid, front)
  if (g.wrap <= 0) return reach
  const coilW = coil.map((p, k) => ({ ...p, w: wMid + (GRAB_TIP_W - wMid) * k / (coil.length - 1) }))
  return [...reach, ...coilW.slice(1)]
}
//
// Quadratic arc from the root to an end point, rising over the middle,
// tapering from w0 to w1, in front or behind the prey by the root's side.
//
function reachPoints(inst, base, end, w0, w1, front) {
  const ctrl = { x: (base.x + end.x) / 2, y: Math.min(base.y, end.y) - inst.r * REACH_ARC }
  const pts = []
  for (let k = 0; k <= REACH_STEPS; k++) {
    const t = k / REACH_STEPS
    const u = 1 - t
    pts.push({
      x: u * u * base.x + 2 * u * t * ctrl.x + t * t * end.x,
      y: u * u * base.y + 2 * u * t * ctrl.y + t * t * end.y,
      w: w0 + (w1 - w0) * t,
      front
    })
  }
  return pts
}
//
// Coil band round the prey from a side, sweeping as far as the wrap has
// gone; points on the band's lower half are in front of him.
//
function coilPoints(g, band, startA, dir) {
  const rx = PREY_HALF_W * BAND_RX * g.sx * (1 - g.squeeze - CLOSE_SQUEEZE * g.close)
  const ry = PREY_HALF_H * BAND_RY * g.sy * HALF
  const cy = g.y + band * PREY_HALF_H * g.sy
  const pts = []
  for (let k = 0; k <= COIL_STEPS; k++) {
    const t = k / COIL_STEPS
    const a = startA + dir * WRAP_SWEEP * g.wrap * t
    pts.push({ x: g.x + Math.cos(a) * rx, y: cy + Math.sin(a) * ry + BAND_SPIRAL * PREY_HALF_H * g.sy * g.wrap * t, front: Math.sin(a) > 0 })
  }
  return pts
}
//
// Draws the runs of every live tendril on one side of the prey (front or
// back), in one polygon batch: outline, body, lit edge, tip.
//
function drawLines(inst, front) {
  const { k, batch, grabRgb } = inst
  inst.lines.forEach((pts, i) => {
    tendrilRuns(pts, front).forEach(run => {
      const a = run[0]
      const b = run[run.length - 1]
      const body = Math.sin(inst.tendrils[i].a) < 0 ? grabRgb.dark : grabRgb.mid
      addTaperedPass(batch, run, a.w + GRAB_OUTLINE, b.w + GRAB_OUTLINE, grabRgb.contour)
      addTaperedPass(batch, run, a.w, b.w, body)
      addTaperedPass(batch, run.map(p => ({ x: p.x - 1, y: p.y - 1 })), a.w * GRAB_LIT_SHARE, 1, grabRgb.light)
    })
    const tip = pts[pts.length - 1]
    tip.front === front && PolyBatch.addDisc(batch, tip.x, tip.y, TIP_R, grabRgb.high)
  })
  PolyBatch.flush(batch, k)
}
//
// Consecutive points on one side of the prey, each run sharing its end
// point with the next so the tendril has no gap.
//
function tendrilRuns(pts, front) {
  const runs = []
  let cur = null
  pts.forEach((p, i) => {
    if (p.front === front) {
      !cur && (cur = i > 0 ? [pts[i - 1]] : [])
      cur.push(p)
      return
    }
    cur && (cur.push(p), runs.push(cur), (cur = null))
  })
  cur && cur.length > 1 && runs.push(cur)
  return runs.filter(run => run.length > 1)
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
  const base = document.createElement('canvas')
  base.width = w
  base.height = h
  paintMouth(base.getContext('2d'), w / 2, h * CENTER_Y, r, 1, createSeededRandom(seed), false)
  applyForestFilmGrainToCanvas(base, GRAIN_SEED + seed + FRAMES)
  k.loadSprite(`${SPRITE_PREFIX}-${key}-base`, base)
  const out = { names, base: `${SPRITE_PREFIX}-${key}-base` }
  perK.set(key, out)
  return out
}
//
// One frame: green collar, tendrils behind the throat, lips and throat,
// tendrils in front (or no tendrils: the base shown while they grab live).
//
function paintMouth(ctx, cx, cy, r, open, rng, withTendrils = true) {
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  //
  // The layout is always drawn from rng, so the collar after it comes out
  // the same in the frames and in the tendril-less base.
  //
  const layout = tendrilLayout(rng)
  const tendrils = withTendrils ? layout : []
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
