import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import * as Layout from '../utils/cave-layout.js'
import { CAVE_PAL, css } from '../utils/cave-paint.js'
//
// Funnel mushroom clusters (chanterelles): a few trumpets growing from one
// foot, each a single smooth body — its stalk rising from the foot and
// widening without a seam into a flaring cap with a wavy lip. The stalks
// are dark woody brown where they meet at the foot, pale cream higher up,
// the caps warm peach. Soft, wavy false gills run from the lip down the
// outside and on down the stalk; the inside is pale at the lip and darkens
// into a deep hole in the middle. Decor behind the hero, with a soft warm
// halo over every cap. Each cluster is baked once per live k.
//
const SPRITE_PREFIX = 'cave0-funnel-v4'
const GRAIN_SEED = 9600
//
// Bake box (design px, scaled per cluster) and where the foot sits in it
// (shifted a little against the lean so the cluster fits).
//
const BAKE_W = 260
const BAKE_H = 250
const BAKE_PAD = 10
const FOOT_SHIFT = 0.05
//
// A cluster growing from a wall's face is sunk this far into the rock.
//
const WALL_SINK = 6
//
// The trumpets, tallest first (it stands at the back): where its lip's
// centre is from the foot (dx along the lean, h up), lip radius (design
// px), with a little random spread. Their stalks start spread a little
// apart at the foot (share of dx).
//
const FUNNELS = [
  { dx: 52, h: 175, r: 64 },
  { dx: -30, h: 128, r: 52 },
  { dx: 40, h: 92, r: 42 },
  { dx: -18, h: 58, r: 30 }
]
const FUNNEL_SPREAD = 0.12
const FOOT_SPREAD = 0.15
//
// Body: the lip ellipse's flatness (seen a little from above), how deep
// the flare is (share of the lip radius), the stalk's width at the foot /
// at the neck where the flare starts (shares of the lip radius), the
// stalk's bend, the flare's curve (control shares), the lip's waves.
//
const RIM_FLAT = 0.34
const FLARE_DEPTH = 1.25
const STALK_BASE_W = 0.38
const NECK_W = 0.27
const STALK_BEND = 0.5
const STALK_STRAIGHT = 0.3
const FLARE_OUT = 0.1
const FLARE_RISE = 0.6
const FLARE_LIP_IN = 0.6
const FLARE_LIP_DROP = 0.9
const STALK_STEPS = 14
const FLARE_STEPS = 16
const LIP_WAVES = 7
const LIP_WAVE = 0.05
const LIP_STEPS = 56
//
// Colour along the body (shares from the foot up to the lip): woody base,
// a darker band, the pale stalk, then the cap. Light on the left, shade on
// the right.
//
const BASE_TO_MID = 0.12
const MID_TO_STALK = 0.3
const STALK_TO_CAP = 0.62
const LIT_ALPHA = 0.4
const SHADE_ALPHA = 0.5
//
// False gills: ridges from the lip down the outside to the neck and on
// down the stalk (share of its length), softly blurred and wobbling, each
// a dark brown groove with a lit edge beside it.
//
const GILLS = 17
const GILL_SPAN = 0.92
const GILL_STALK = 0.45
const GILL_STEPS = 18
const GILL_WOBBLE = 1.1
const GILL_WOBBLE_FREQ = 2.3
const GILL_W = 2.6
const GILL_ALPHA = 0.7
const GILL_LIT_ALPHA = 0.65
const GILL_LIT_SHIFT = 1.6
const GILL_BLUR = 'blur(0.6px)'
const NO_FILTER = 'none'
//
// Inside: pale at the lip, darkening down the throat into the hole (radial
// shares), ridges running down into it, the hole itself (share of the lip
// radius) set a little toward the front; the lit lip and outline.
//
const INSIDE_LIGHT_AT = 0.95
const INSIDE_AT = 0.7
const THROAT_AT = 0.38
const HOLE_AT = 0.2
const HOLE_R = 0.2
const HOLE_DROP = 0.18
const INNER_RIDGES = 18
const INNER_RIDGE_FROM = 0.25
const INNER_RIDGE_ALPHA = 0.35
const LIP_W = 2
const CONTOUR_W = 1.5
const DROPS = 3
const DROP_LEN_MIN = 4
const DROP_LEN_RANGE = 8
const DROP_R = 1.4
const DROP_ALPHA = 0.7
//
// Halo over every cap (radius per px of lip radius).
//
const GLOW_R = 1.4
const GLOW_OPACITY = 0.18
const CULL_PAD = 160
const HALF = 0.5
const FULL_TURN = Math.PI * 2
const bakedByK = new WeakMap()

/**
 * Creates the funnel mushroom clusters at their spots (baked once per k).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<{x?: number, wall?: string, y: number, scale: number, lean: number, seed: number}>} cfg.spots - Layout.FUNNEL_MUSHROOMS
 * @returns {Object} Funnel mushrooms instance
 */
export function create(cfg) {
  const { k, spots } = cfg
  const items = spots.map(spot => {
    const bake = bakeCluster(k, spot)
    const x = footX(spot)
    return {
      x,
      y: spot.y,
      sprite: bake.name,
      anchor: k.vec2(bake.anchorX, bake.anchorY),
      top: spot.y - bake.above,
      glows: bake.glows.map(g => ({ x: x + g.dx, y: spot.y + g.dy, r: g.r }))
    }
  })
  return { k, items, glowRgb: getRGB(k, CAVE_PAL.funnel.glow) }
}

/**
 * Draws the clusters crossing the view (behind the rock they grow from).
 * @param {Object} inst - Funnel mushrooms instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDraw(inst, top, bottom) {
  const k = inst.k
  inst.items.forEach(item => {
    inView(item, top, bottom) && k.drawSprite({ sprite: item.sprite, pos: k.vec2(item.x, item.y), anchor: item.anchor })
  })
}

/**
 * Soft warm halos over the caps (additive light pass).
 * @param {Object} inst - Funnel mushrooms instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDrawGlow(inst, top, bottom) {
  inst.items.forEach(item => {
    inView(item, top, bottom) && item.glows.forEach(g => Glow.drawGlow(inst.k, g.x, g.y, g.r, inst.glowRgb, GLOW_OPACITY))
  })
}
function inView(item, top, bottom) {
  return item.y + CULL_PAD > top && item.top - CULL_PAD < bottom
}
//
// The cluster's foot: its x on a ledge, or sunk into the wall's face.
//
function footX(spot) {
  if (spot.wall === 'left') return Layout.leftWallX(spot.y) - WALL_SINK
  if (spot.wall === 'right') return Layout.rightWallX(spot.y) + WALL_SINK
  return spot.x
}
//
// One cluster on its canvas: the trumpets tallest first (the low ones in
// front), grained; plus the anchor at its foot, how high it rises and
// where its halos go (from the foot).
//
function bakeCluster(k, spot) {
  let perK = bakedByK.get(k)
  !perK && (perK = new Map(), bakedByK.set(k, perK))
  const key = `${spot.seed}-${spot.scale}-${spot.lean}`
  const cached = perK.get(key)
  if (cached) return cached
  const s = spot.scale
  const w = Math.ceil(BAKE_W * s)
  const h = Math.ceil(BAKE_H * s)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const rng = createSeededRandom(GRAIN_SEED + spot.seed)
  const foot = { x: w * HALF - spot.lean * w * FOOT_SHIFT, y: h - BAKE_PAD * s }
  const funnels = FUNNELS.map(def => funnelShape(def, foot, spot.lean, s, rng))
  funnels.forEach(f => paintFunnel(ctx, f, s, rng))
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + spot.seed)
  const name = `${SPRITE_PREFIX}-${key}`
  k.loadSprite(name, canvas)
  const out = {
    name,
    anchorX: foot.x / w * 2 - 1,
    anchorY: foot.y / h * 2 - 1,
    above: foot.y,
    glows: funnels.map(f => ({ dx: f.lip.x - foot.x, dy: f.lip.y - foot.y, r: f.r * GLOW_R }))
  }
  perK.set(key, out)
  return out
}
//
// One trumpet's geometry: the lip (centre, radius), the neck where the
// flare starts below it, the stalk's centre line from its start at the
// foot to the neck (points with width), and both outer edges of the flare
// from the neck up to the lip's ends.
//
function funnelShape(def, foot, lean, s, rng) {
  const spread = 1 + (rng() - HALF) * 2 * FUNNEL_SPREAD
  const r = def.r * s * spread
  const ry = r * RIM_FLAT
  const lip = { x: foot.x + def.dx * lean * s, y: foot.y - def.h * s * spread }
  const neck = { x: lip.x, y: lip.y + r * FLARE_DEPTH }
  const base = { x: foot.x + def.dx * lean * s * FOOT_SPREAD, y: foot.y }
  const rise = base.y - neck.y
  const c1 = { x: base.x, y: base.y - rise * STALK_STRAIGHT }
  const c2 = { x: neck.x + (base.x - neck.x) * STALK_BEND * HALF, y: neck.y + rise * STALK_BEND }
  const stalk = []
  for (let i = 0; i <= STALK_STEPS; i++) {
    const t = i / STALK_STEPS
    stalk.push({ ...cubic(base, c1, c2, neck, t), w: r * (STALK_BASE_W + (NECK_W - STALK_BASE_W) * t) })
  }
  return { r, ry, lip, neck, base, stalk, left: flareEdge(neck, lip, r, ry, -1), right: flareEdge(neck, lip, r, ry, 1), phase: rng() * FULL_TURN }
}
//
// One outer edge of the flare: from the neck's side curving out and up to
// the lip's end (concave, like a trumpet's bell).
//
function flareEdge(neck, lip, r, ry, side) {
  const n = { x: neck.x + side * r * NECK_W * HALF, y: neck.y }
  const end = { x: lip.x + side * r, y: lip.y }
  const f1 = { x: n.x + side * r * FLARE_OUT, y: n.y - (n.y - end.y) * FLARE_RISE }
  const f2 = { x: lip.x + side * r * FLARE_LIP_IN, y: lip.y + ry * FLARE_LIP_DROP }
  const pts = []
  for (let i = 0; i <= FLARE_STEPS; i++) pts.push(cubic(n, f1, f2, end, i / FLARE_STEPS))
  return pts
}
function cubic(p0, p1, p2, p3, t) {
  const u = 1 - t
  return {
    x: u * u * u * p0.x + 3 * u * u * t * p1.x + 3 * u * t * t * p2.x + t * t * t * p3.x,
    y: u * u * u * p0.y + 3 * u * u * t * p1.y + 3 * u * t * t * p2.y + t * t * t * p3.y
  }
}
//
// One trumpet: its body (stalk and flare in one outline) coloured from the
// woody foot up to the peach cap and shaded, the false gills, the outline,
// then its inside with the hole, the lip and the drops under it.
//
function paintFunnel(ctx, f, s, rng) {
  const pal = CAVE_PAL.funnel
  const body = bodyPath(f)
  const along = ctx.createLinearGradient(0, f.base.y, 0, f.lip.y)
  along.addColorStop(0, css(pal.stemBase))
  along.addColorStop(BASE_TO_MID, css(pal.stemMid))
  along.addColorStop(MID_TO_STALK, css(pal.stem))
  along.addColorStop(STALK_TO_CAP, css(pal.body))
  along.addColorStop(1, css(pal.body))
  ctx.fillStyle = along
  ctx.fill(body)
  ctx.save()
  ctx.clip(body)
  paintSideShade(ctx, f)
  paintGills(ctx, f, s)
  ctx.restore()
  ctx.strokeStyle = css(pal.contour)
  ctx.lineWidth = CONTOUR_W * s
  ctx.stroke(body)
  const lip = lipPath(f)
  ctx.save()
  ctx.clip(lip)
  paintInside(ctx, f, s)
  ctx.restore()
  ctx.strokeStyle = css(pal.light)
  ctx.lineWidth = LIP_W * s
  ctx.stroke(lip)
  ctx.strokeStyle = css(pal.contour)
  ctx.lineWidth = CONTOUR_W * s
  ctx.stroke(lip)
  paintDrops(ctx, f, s, rng)
}
//
// The body's outline: up the stalk's left side, out along the flare to
// the lip's left end, round the lip's front, down the flare and stalk on
// the right.
//
function bodyPath(f) {
  const path = new Path2D()
  f.stalk.forEach((p, i) => (i ? path.lineTo(p.x - p.w * HALF, p.y) : path.moveTo(p.x - p.w * HALF, p.y)))
  f.left.forEach(p => path.lineTo(p.x, p.y))
  const half = LIP_STEPS / 2
  for (let i = 0; i <= half; i++) {
    const p = lipPoint(f, Math.PI - i / half * Math.PI)
    path.lineTo(p.x, p.y)
  }
  f.right.slice().reverse().forEach(p => path.lineTo(p.x, p.y))
  f.stalk.slice().reverse().forEach(p => path.lineTo(p.x + p.w * HALF, p.y))
  path.closePath()
  return path
}
//
// Light on the body's left, shade on its right.
//
function paintSideShade(ctx, f) {
  const pal = CAVE_PAL.funnel
  const across = ctx.createLinearGradient(f.lip.x - f.r, 0, f.lip.x + f.r, 0)
  across.addColorStop(0, css(pal.light, LIT_ALPHA))
  across.addColorStop(HALF, css(pal.light, 0))
  across.addColorStop(1, css(pal.shade, SHADE_ALPHA))
  ctx.fillStyle = across
  ctx.fillRect(f.lip.x - f.r * 2, f.lip.y - f.r, f.r * 4, f.base.y - f.lip.y + f.r * 2)
}
//
// False gills: soft wobbling ridges from points along the lip's front,
// following the flare's surface down to the neck and fading on down the
// stalk; each a dark groove with a lit edge on its left.
//
function paintGills(ctx, f, s) {
  const pal = CAVE_PAL.funnel
  ctx.filter = GILL_BLUR
  for (let i = 0; i < GILLS; i++) {
    const across = (i / (GILLS - 1) * 2 - 1) * GILL_SPAN
    const pts = gillPoints(f, across, i, s)
    strokeLine(ctx, pts.map(p => ({ x: p.x - GILL_LIT_SHIFT * s, y: p.y })), css(pal.light, GILL_LIT_ALPHA), GILL_W * s * HALF)
    strokeLine(ctx, pts, css(pal.throat, GILL_ALPHA), GILL_W * s)
  }
  ctx.filter = NO_FILTER
}
//
// One gill's points: on the flare, between its two edges at the gill's
// place across (-1 left … 1 right), bulging to the front near the lip;
// then down the stalk for a while; wobbling sideways.
//
function gillPoints(f, across, i, s) {
  const share = (across + 1) * HALF
  const front = Math.sqrt(Math.max(0, 1 - across * across))
  const pts = []
  for (let j = GILL_STEPS; j >= 0; j--) {
    const t = j / GILL_STEPS
    const idx = Math.round(t * FLARE_STEPS)
    const l = f.left[idx]
    const r = f.right[idx]
    pts.push({ x: l.x + (r.x - l.x) * share, y: l.y + (r.y - l.y) * share + front * f.ry * t * t })
  }
  const down = Math.round(STALK_STEPS * GILL_STALK)
  for (let j = 1; j <= down; j++) {
    const p = f.stalk[STALK_STEPS - j]
    pts.push({ x: p.x + across * p.w * HALF, y: p.y })
  }
  return pts.map((p, j) => ({ x: p.x + Math.sin(j * GILL_WOBBLE_FREQ + i * GILL_WOBBLE_FREQ * HALF) * GILL_WOBBLE * s, y: p.y }))
}
function strokeLine(ctx, pts, style, width) {
  ctx.strokeStyle = style
  ctx.lineWidth = width
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.stroke()
}
//
// A point on the wavy lip at an angle (sin > 0: its front).
//
function lipPoint(f, a) {
  const m = 1 + Math.sin(a * LIP_WAVES + f.phase) * LIP_WAVE
  return { x: f.lip.x + Math.cos(a) * f.r * m, y: f.lip.y + Math.sin(a) * f.ry * m }
}
function lipPath(f) {
  const path = new Path2D()
  for (let i = 0; i < LIP_STEPS; i++) {
    const p = lipPoint(f, i / LIP_STEPS * FULL_TURN)
    i ? path.lineTo(p.x, p.y) : path.moveTo(p.x, p.y)
  }
  path.closePath()
  return path
}
//
// The inside: pale at the lip, darkening down the throat into the hole
// (an oval gradient), soft ridges running down into it, then the hole.
//
function paintInside(ctx, f, s) {
  const pal = CAVE_PAL.funnel
  const hole = { x: f.lip.x, y: f.lip.y + f.ry * HOLE_DROP }
  ctx.save()
  ctx.translate(hole.x, hole.y)
  ctx.scale(1, RIM_FLAT)
  const deep = ctx.createRadialGradient(0, 0, 0, 0, 0, f.r)
  deep.addColorStop(HOLE_AT, css(pal.hole))
  deep.addColorStop(THROAT_AT, css(pal.throat))
  deep.addColorStop(INSIDE_AT, css(pal.inside))
  deep.addColorStop(INSIDE_LIGHT_AT, css(pal.light))
  ctx.fillStyle = deep
  ctx.fillRect(-f.r * 2, -f.r * 2, f.r * 4, f.r * 4)
  ctx.restore()
  ctx.filter = GILL_BLUR
  for (let i = 0; i < INNER_RIDGES; i++) {
    const edge = lipPoint(f, i / INNER_RIDGES * FULL_TURN + f.phase)
    const from = { x: hole.x + (edge.x - hole.x) * INNER_RIDGE_FROM, y: hole.y + (edge.y - hole.y) * INNER_RIDGE_FROM }
    strokeLine(ctx, [from, edge], css(pal.shade, INNER_RIDGE_ALPHA), GILL_W * s * HALF)
  }
  ctx.filter = NO_FILTER
  ctx.fillStyle = css(pal.hole)
  ctx.beginPath()
  ctx.ellipse(hole.x, hole.y, f.r * HOLE_R, f.ry * HOLE_R, 0, 0, FULL_TURN)
  ctx.fill()
}
//
// A few drops hanging under the lip's front.
//
function paintDrops(ctx, f, s, rng) {
  const pal = CAVE_PAL.funnel
  ctx.strokeStyle = css(pal.light, DROP_ALPHA)
  ctx.fillStyle = css(pal.light, DROP_ALPHA)
  ctx.lineWidth = 1
  for (let i = 0; i < DROPS; i++) {
    const p = lipPoint(f, Math.PI * (HALF + (rng() - HALF) * GILL_SPAN))
    const len = (DROP_LEN_MIN + rng() * DROP_LEN_RANGE) * s
    ctx.beginPath()
    ctx.moveTo(p.x, p.y)
    ctx.lineTo(p.x, p.y + len)
    ctx.stroke()
    ctx.beginPath()
    ctx.arc(p.x, p.y + len, DROP_R * s, 0, FULL_TURN)
    ctx.fill()
  }
}
