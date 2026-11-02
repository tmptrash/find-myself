import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import { CAVE_PAL, css } from '../utils/cave-paint.js'
//
// Umbrella plants: a slim golden stalk curving up from the ground (or the
// lake bed) to a wide pale pad seen a little from below — its underside
// glowing at the heart, golden veins fanning out to a wavy rim that droops
// at both ends. Decor behind the hero. They sway a little in the cave's
// draught: the stalk leans around its foot on a spring that follows a slow
// wave whose swing grows with the gusts, and the pad tips a little more
// than the stalk. Stalk and pad are baked once per live k.
//
const SPRITE_PREFIX = 'cave0-umbrella-v1'
const GRAIN_SEED = 9700
const BAKE_PAD = 8
//
// Stalk: width at the foot / under the pad (per px of pad radius, at
// least / at most), how it curves (controls: shares of its height and
// lean), outline, lit streak.
//
const STALK_W0 = 0.1
const STALK_W1 = 0.05
const STALK_W_MIN = 3
const STALK_C1_UP = 0.45
const STALK_C1_BACK = 0.12
const STALK_C2_UP = 0.85
const STALK_STEPS = 24
const STALK_CONTOUR = 2.4
const STALK_LIT_SHIFT = 0.3
const STALK_LIT_SHARE = 0.35
const STALK_HIGH_SHARE = 0.12
const STALK_LIT_ALPHA = 0.6
//
// Pad: the underside's flatness, how its ends droop (share of the radius),
// the rim's waves, where the stalk meets it (share of the flat radius
// below its centre), the glowing heart, veins (main ones and short ones
// between, how they bow), the lit rim and the outline.
//
const PAD_FLAT = 0.26
const PAD_DROOP = 0.12
const PAD_WAVES = 11
const PAD_WAVE = 0.025
const PAD_STEPS = 72
const ATTACH_DOWN = 0.25
const HEART_R = 0.5
const HEART_ALPHA = 0.6
const VEINS = 18
const VEIN_W = 1.6
const VEIN_ALPHA = 0.75
const VEIN_BOW = 0.08
const SUB_VEIN_REACH = 0.55
const SUB_VEIN_ALPHA = 0.4
const RIM_W = 2.2
const RIM_ALPHA = 0.9
const CONTOUR_W = 1.3
const COLLAR_RX = 0.08
const COLLAR_RY = 0.04
//
// Sway (degrees): a slow wave always there (BASE) plus a bigger one with
// the gusts, followed by a spring; the pad tips PAD_FOLLOW times the
// stalk's angle.
//
const SWAY_BASE_DEG = 0.3
const SWAY_GUST_DEG = 3.2
const SWAY_SPEED_MIN = 0.5
const SWAY_SPEED_RANGE = 0.4
const SWAY_STIFF = 9
const SWAY_DAMP = 2.6
const PAD_FOLLOW = 1.6
const MAX_DT = 0.05
//
// Pale halo at the pad's heart (radius per px of pad radius).
//
const GLOW_R = 1.1
const GLOW_OPACITY = 0.16
const CULL_PAD = 140
const HALF = 0.5
const FULL_TURN = Math.PI * 2
const DEG = Math.PI / 180
const bakedByK = new WeakMap()

/**
 * Creates the umbrella plants at their spots (baked once per k).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<{x: number, y: number, h: number, r: number, lean: number, seed: number}>} cfg.spots - Layout.UMBRELLA_PLANTS
 * @returns {Object} Umbrella plants instance
 */
export function create(cfg) {
  const { k, spots } = cfg
  const plants = spots.map(spot => {
    const bake = bakePlant(k, spot)
    const rng = createSeededRandom(GRAIN_SEED + spot.seed)
    return {
      ...bake,
      x: spot.x,
      y: spot.y,
      r: spot.r,
      top: spot.y - spot.h - spot.r,
      angle: 0,
      angV: 0,
      phase: rng() * FULL_TURN,
      speed: SWAY_SPEED_MIN + rng() * SWAY_SPEED_RANGE
    }
  })
  return { k, plants, glowRgb: getRGB(k, CAVE_PAL.umbrella.glow) }
}

/**
 * Sways every plant toward the draught's wave (bigger with the gusts).
 * @param {Object} inst - Umbrella plants instance
 * @param {number} gust - Draught strength 0..1
 */
export function onUpdate(inst, gust) {
  const dt = Math.min(MAX_DT, inst.k.dt())
  const t = inst.k.time()
  const amp = SWAY_BASE_DEG + SWAY_GUST_DEG * gust
  inst.plants.forEach(p => {
    const target = Math.sin(t * p.speed + p.phase) * amp
    p.angV += (SWAY_STIFF * (target - p.angle) - SWAY_DAMP * p.angV) * dt
    p.angle += p.angV * dt
  })
}

/**
 * Draws the plants crossing the view: each stalk leaning around its foot,
 * its pad on the stalk's top tipping a little more.
 * @param {Object} inst - Umbrella plants instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDraw(inst, top, bottom) {
  const k = inst.k
  inst.plants.forEach(p => {
    if (!inView(p, top, bottom)) return
    const tip = padSpot(p)
    k.drawSprite({ sprite: p.stalk, pos: k.vec2(p.x, p.y), anchor: k.vec2(p.stalkAnchorX, p.stalkAnchorY), angle: p.angle })
    k.drawSprite({ sprite: p.pad, pos: k.vec2(tip.x, tip.y), anchor: k.vec2(p.padAnchorX, p.padAnchorY), angle: p.angle * PAD_FOLLOW })
  })
}

/**
 * Pale halos at the pads' hearts (additive light pass).
 * @param {Object} inst - Umbrella plants instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDrawGlow(inst, top, bottom) {
  inst.plants.forEach(p => {
    if (!inView(p, top, bottom)) return
    const tip = padSpot(p)
    Glow.drawGlow(inst.k, tip.x, tip.y, p.r * GLOW_R, inst.glowRgb, GLOW_OPACITY)
  })
}
function inView(p, top, bottom) {
  return p.y + CULL_PAD > top && p.top - CULL_PAD < bottom
}
//
// The stalk's top in the world, turned with the stalk around its foot.
//
function padSpot(p) {
  const a = p.angle * DEG
  return {
    x: p.x + p.tip.x * Math.cos(a) - p.tip.y * Math.sin(a),
    y: p.y + p.tip.x * Math.sin(a) + p.tip.y * Math.cos(a)
  }
}
//
// Stalk and pad of one plant on their own canvases, with the anchors (the
// stalk's foot, the pad's meeting point) and the stalk's top from its foot.
//
function bakePlant(k, spot) {
  let perK = bakedByK.get(k)
  !perK && (perK = new Map(), bakedByK.set(k, perK))
  const key = `${spot.seed}-${spot.h}-${spot.r}-${spot.lean}`
  const cached = perK.get(key)
  if (cached) return cached
  const stalk = bakeStalk(spot)
  const pad = bakePad(spot)
  const name = `${SPRITE_PREFIX}-${key}`
  k.loadSprite(`${name}-stalk`, stalk.canvas)
  k.loadSprite(`${name}-pad`, pad.canvas)
  const out = {
    stalk: `${name}-stalk`,
    pad: `${name}-pad`,
    stalkAnchorX: stalk.foot.x / stalk.canvas.width * 2 - 1,
    stalkAnchorY: stalk.foot.y / stalk.canvas.height * 2 - 1,
    padAnchorX: pad.attach.x / pad.canvas.width * 2 - 1,
    padAnchorY: pad.attach.y / pad.canvas.height * 2 - 1,
    tip: { x: stalk.tip.x - stalk.foot.x, y: stalk.tip.y - stalk.foot.y }
  }
  perK.set(key, out)
  return out
}
//
// The stalk: from the foot rising almost straight, then curving over to
// its top (an S), thinning; outline, golden body, lit streak, highlight.
//
function bakeStalk(spot) {
  const [contour, body, lit, high] = CAVE_PAL.umbrella.stalk
  const lean = spot.lean * spot.h
  const w0 = Math.max(STALK_W_MIN, spot.r * STALK_W0)
  const w1 = Math.max(STALK_W_MIN, spot.r * STALK_W1)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(Math.abs(lean) + (w0 + BAKE_PAD) * 2)
  canvas.height = Math.ceil(spot.h + BAKE_PAD * 2)
  const ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'
  const foot = { x: w0 + BAKE_PAD + Math.max(0, -lean), y: spot.h + BAKE_PAD }
  const tip = { x: foot.x + lean, y: BAKE_PAD }
  const c1 = { x: foot.x - lean * STALK_C1_BACK, y: foot.y - spot.h * STALK_C1_UP }
  const c2 = { x: tip.x, y: foot.y - spot.h * STALK_C2_UP }
  const pts = []
  for (let i = 0; i <= STALK_STEPS; i++) {
    const t = i / STALK_STEPS
    const u = 1 - t
    pts.push({
      x: u * u * u * foot.x + 3 * u * u * t * c1.x + 3 * u * t * t * c2.x + t * t * t * tip.x,
      y: u * u * u * foot.y + 3 * u * u * t * c1.y + 3 * u * t * t * c2.y + t * t * t * tip.y,
      w: w0 + (w1 - w0) * t
    })
  }
  strokeTapered(ctx, pts, contour, STALK_CONTOUR, 1)
  strokeTapered(ctx, pts, body, 0, 1)
  strokeTapered(ctx, pts.map(p => ({ x: p.x - p.w * STALK_LIT_SHIFT, y: p.y, w: p.w * STALK_LIT_SHARE })), lit, 0, STALK_LIT_ALPHA)
  strokeTapered(ctx, pts.map(p => ({ x: p.x - p.w * STALK_LIT_SHIFT, y: p.y, w: p.w * STALK_HIGH_SHARE })), high, 0, STALK_LIT_ALPHA)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + spot.seed)
  return { canvas, foot, tip }
}
function strokeTapered(ctx, pts, color, extra, alpha) {
  ctx.strokeStyle = css(color, alpha)
  for (let i = 1; i < pts.length; i++) {
    ctx.lineWidth = (pts[i - 1].w + pts[i].w) * HALF + extra
    ctx.beginPath()
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y)
    ctx.lineTo(pts[i].x, pts[i].y)
    ctx.stroke()
  }
}
//
// The pad seen a little from below: the pale underside with its glowing
// heart, veins from where the stalk meets it out to the wavy rim (and
// short ones between), the lit rim, the outline and the stalk's collar.
//
function bakePad(spot) {
  const pal = CAVE_PAL.umbrella
  const r = spot.r
  const ry = r * PAD_FLAT
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(r * (1 + PAD_WAVE) * 2 + BAKE_PAD * 2)
  canvas.height = Math.ceil((ry + r * PAD_DROOP) * 2 + BAKE_PAD * 2)
  const ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const center = { x: canvas.width / 2, y: BAKE_PAD + ry + r * PAD_DROOP }
  const attach = { x: center.x, y: center.y + ry * ATTACH_DOWN }
  const rng = createSeededRandom(GRAIN_SEED + spot.seed)
  const phase = rng() * FULL_TURN
  const rim = []
  for (let i = 0; i < PAD_STEPS; i++) {
    const a = i / PAD_STEPS * FULL_TURN
    const m = 1 + Math.sin(a * PAD_WAVES + phase) * PAD_WAVE
    rim.push({ x: center.x + Math.cos(a) * r * m, y: center.y + Math.sin(a) * ry * m + Math.cos(a) * Math.cos(a) * r * PAD_DROOP })
  }
  const outline = new Path2D()
  rim.forEach((p, i) => (i ? outline.lineTo(p.x, p.y) : outline.moveTo(p.x, p.y)))
  outline.closePath()
  ctx.fillStyle = css(pal.under)
  ctx.fill(outline)
  ctx.save()
  ctx.clip(outline)
  const heart = ctx.createRadialGradient(attach.x, attach.y, 0, attach.x, attach.y, r * HEART_R)
  heart.addColorStop(0, css(pal.heart, HEART_ALPHA))
  heart.addColorStop(1, css(pal.heart, 0))
  ctx.fillStyle = heart
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  paintVeins(ctx, attach, rim, pal)
  ctx.restore()
  ctx.strokeStyle = css(pal.rim, RIM_ALPHA)
  ctx.lineWidth = RIM_W
  ctx.stroke(outline)
  ctx.strokeStyle = css(pal.contour)
  ctx.lineWidth = CONTOUR_W
  ctx.stroke(outline)
  ctx.fillStyle = css(CAVE_PAL.umbrella.stalk[2])
  ctx.beginPath()
  ctx.ellipse(attach.x, attach.y, r * COLLAR_RX, r * COLLAR_RY, 0, 0, FULL_TURN)
  ctx.fill()
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + spot.seed + 1)
  return { canvas, attach }
}
//
// Veins fanning from where the stalk meets the pad to its rim, each bowed a
// little; a short one between every two.
//
function paintVeins(ctx, from, rim, pal) {
  ctx.strokeStyle = css(pal.vein, VEIN_ALPHA)
  ctx.lineWidth = VEIN_W
  for (let i = 0; i < VEINS; i++) {
    const to = rim[Math.floor(i / VEINS * rim.length)]
    const mx = (from.x + to.x) * HALF
    const my = (from.y + to.y) * HALF
    ctx.beginPath()
    ctx.moveTo(from.x, from.y)
    ctx.quadraticCurveTo(mx - (to.y - from.y) * VEIN_BOW, my + (to.x - from.x) * VEIN_BOW, to.x, to.y)
    ctx.stroke()
  }
  ctx.strokeStyle = css(pal.vein, SUB_VEIN_ALPHA)
  ctx.lineWidth = VEIN_W * HALF
  for (let i = 0; i < VEINS; i++) {
    const to = rim[Math.floor((i + HALF) / VEINS * rim.length)]
    const start = { x: to.x + (from.x - to.x) * SUB_VEIN_REACH, y: to.y + (from.y - to.y) * SUB_VEIN_REACH }
    ctx.beginPath()
    ctx.moveTo(start.x, start.y)
    ctx.lineTo(to.x, to.y)
    ctx.stroke()
  }
}
