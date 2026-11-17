import { applyForestGameplaySharpBake } from '../../forest/utils/forest-focus-depth.js'
import * as Lake from '../../../components/lake.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from './cave-layout.js'
import * as Ground from './cave-ground.js'
//
// The lake in the hall's floor, painted like the forest lake
// (components/lake.js): its water fills the floor's bowl from the surface
// down to the bowl's own soil, so its edges run along both banks to the
// very bottom, and its surface ends exactly at the columns where the
// banks' soil drops under it (found pixel by pixel). The band round the
// surface is baked as a wave cycle of FRAME_COUNT frames, as the forest's:
// the water opaque across the waves and fading to see-through under them,
// a light skin, the band between a bright top line and a fainter inner
// line (each riding its own wave, dying out toward the banks), ripples
// running off both banks. Under the band the body is one still bake. The
// forest lake's swaying algae stand on the bed, drawn under the water.
//
const COLORS = CAVE_CFG.water
const PAINT = COLORS.paint
const SPRITE_PREFIX = 'cave0-lake-v3-'
const BODY_SPRITE = `${SPRITE_PREFIX}body`
const FRAME_SPRITE = `${SPRITE_PREFIX}frame-`
//
// Where the bowl is sought (past the lake's ends); the water reaches this
// far under the bowl's top so no gap shows under the soil's lumps.
//
const BANK_REACH = 40
const BED_OVERLAP = 6
//
// The baked band: from BAND_ABOVE px over the surface to BAND_BELOW under
// it; FRAME_COUNT frames over one wave cycle (all wave speeds are whole
// multiples of WAVE_SPEED, so the cycle loops).
//
const BAND_ABOVE = 6
const BAND_BELOW = 22
const FRAME_COUNT = 90
const FRAME_SEED = 8900
//
// Waves (as the forest lake's): the top line's two waves (speed, height,
// phase across the lake), the inner line's two and its lag; they die out
// over SHORE_FADE px at the banks.
//
const WAVE_SPEED = 0.85
const WAVE_AMP = 3
const WAVE_PHASE = 4
const WAVE_SECOND_SPEED = 1.7
const WAVE_SECOND_AMP = 1.2
const WAVE_SECOND_PHASE = 9.2
const INNER_AMP = 2.6
const INNER_PHASE = 3.4
const INNER_SECOND_AMP = 1.35
const INNER_SECOND_PHASE = 7.4
const INNER_SECOND_SHIFT = 0.9
const INNER_LAG = 0.48
const SHORE_FADE = 60
const CYCLE = Math.PI * 2 / WAVE_SPEED
//
// Water paint (as the forest lake's): opaque OPAQUE_PX under the waves,
// then fading to BODY_ALPHA over BODY_FADE px; a light skin (SKIN_ALPHA
// over SKIN_DEPTH px); the deep tint toward the bed (DEEP_ALPHA); the
// band between the lines; the lines' widths and the inner one's opacity.
//
const OPAQUE_PX = WAVE_AMP + WAVE_SECOND_AMP + 1
const BODY_FADE = 10
const BODY_ALPHA = 0.42
const SKIN_ALPHA = 0.28
const SKIN_DEPTH = 16
const DEEP_ALPHA = 0.2
const BAND_ALPHA = 0.32
const LINE_W = 1.5
const INNER_W = 1
const INNER_ALPHA = 0.55
const POINT_STEP = 4
//
// Ripples running off each bank: count, start, spacing, length, height,
// drop, how they shrink, opacity.
//
const RIPPLES = 3
const RIPPLE_START = 10
const RIPPLE_SPACING = 18
const RIPPLE_LEN = 16
const RIPPLE_H = 1
const RIPPLE_DROP = 3
const RIPPLE_DROP_STEP = 1.5
const RIPPLE_SHRINK = 0.5
const RIPPLE_ALPHA = 0.5
const RIPPLE_BANKS = [1, -1]
const BYTE_MAX = 255
const HEX_RADIX = 16
const bakedFor = new WeakSet()

/**
 * The lake on this k: its bowl, its baked water and its algae.
 * @param {Object} k - Kaplay instance
 * @returns {Object} Lake instance
 */
export function create(k) {
  const bed = bowlLine()
  const x1 = bed[0].x
  const x2 = bed[bed.length - 1].x + 1
  const inst = {
    k,
    bed,
    x1,
    x2,
    framePos: k.vec2(x1, Layout.LAKE_SURFACE_Y - BAND_ABOVE),
    bodyPos: k.vec2(x1, Layout.LAKE_SURFACE_Y + BAND_BELOW),
    algae: null
  }
  inst.algae = Lake.createAlgaeField(k, { paint: PAINT, x1, x2, surfaceY: Layout.LAKE_SURFACE_Y, bedAt: x => bedAt(inst, x) - BED_OVERLAP })
  bakedFor.has(k) || bake(k, inst)
  bakedFor.add(k)
  return inst
}

/**
 * Draws the swaying algae (under the water).
 * @param {Object} inst - Lake instance
 */
export function onDrawAlgae(inst) {
  Lake.drawAlgaeField(inst.k, inst.algae)
}

/**
 * Draws the water: the band's frame of the moment, then the still body.
 * @param {Object} inst - Lake instance
 * @param {{left: number, right: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  if (inst.x2 < view.left || inst.x1 > view.right) return
  const k = inst.k
  const frame = Math.floor((k.time() % CYCLE) / CYCLE * FRAME_COUNT) % FRAME_COUNT
  k.drawSprite({ sprite: FRAME_SPRITE + frame, pos: inst.framePos })
  k.drawSprite({ sprite: BODY_SPRITE, pos: inst.bodyPos })
}
//
// The bowl under the water: the floor's art top, column by column, from
// the first to the last column where it lies under the surface (the
// banks' soil meets the surface right at its ends).
//
function bowlLine() {
  const floor = Layout.lakeFloor()
  const cols = []
  for (let x = Layout.LAKE_X1 - BANK_REACH; x <= Layout.LAKE_X2 + BANK_REACH; x++) cols.push({ x, y: Ground.topAt(floor, x) })
  const first = cols.findIndex(c => c.y > Layout.LAKE_SURFACE_Y)
  const last = cols.findLastIndex(c => c.y > Layout.LAKE_SURFACE_Y)
  return cols.slice(first, last + 1).map(c => ({ x: c.x, y: Math.max(Layout.LAKE_SURFACE_Y, c.y + BED_OVERLAP) }))
}
function bedAt(inst, x) {
  return inst.bed[Math.min(inst.bed.length - 1, Math.max(0, Math.round(x - inst.x1)))].y
}
//
// Every frame of the band and the still body, once per live k.
//
function bake(k, inst) {
  for (let f = 0; f < FRAME_COUNT; f++) {
    const canvas = document.createElement('canvas')
    canvas.width = inst.x2 - inst.x1
    canvas.height = BAND_ABOVE + BAND_BELOW
    paintFrame(canvas.getContext('2d'), inst, f / FRAME_COUNT * CYCLE)
    applyForestGameplaySharpBake(canvas, FRAME_SEED + f)
    k.loadSprite(FRAME_SPRITE + f, canvas)
  }
  bakeBody(k, inst)
}
//
// One moment of the band (canvas Y 0 is BAND_ABOVE over the surface): the
// water under the waving top line down to the bowl, its paint clipped to
// it, then the two lines.
//
function paintFrame(ctx, inst, t) {
  const surface = BAND_ABOVE
  const bottom = BAND_ABOVE + BAND_BELOW
  const bandY = x => Math.min(bottom, bedAt(inst, x) - Layout.LAKE_SURFACE_Y + surface)
  ctx.translate(-inst.x1, 0)
  const top = waveLine(inst, t, topWave, surface)
  const inner = waveLine(inst, t + INNER_LAG, innerWave, surface)
  ctx.beginPath()
  top.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)))
  for (let x = inst.x2 - 1; x >= inst.x1; x--) {
    ctx.lineTo(x + 1, bandY(x))
    ctx.lineTo(x, bandY(x))
  }
  ctx.closePath()
  const body = ctx.createLinearGradient(0, surface + OPAQUE_PX, 0, surface + OPAQUE_PX + BODY_FADE)
  body.addColorStop(0, COLORS.water)
  body.addColorStop(1, hexAlpha(COLORS.water, BODY_ALPHA))
  ctx.fillStyle = body
  ctx.fill()
  ctx.save()
  ctx.clip()
  paintSkin(ctx, inst, surface)
  paintRipples(ctx, inst, t, surface)
  paintBand(ctx, top, inner)
  ctx.restore()
  strokeLine(ctx, top, PAINT.surfaceLine, LINE_W)
  strokeLine(ctx, inner, hexAlpha(PAINT.surfaceLine, INNER_ALPHA), INNER_W)
}
//
// The light skin under the surface.
//
function paintSkin(ctx, inst, surface) {
  const skin = ctx.createLinearGradient(0, surface, 0, surface + SKIN_DEPTH)
  skin.addColorStop(0, PAINT.light)
  skin.addColorStop(1, hexAlpha(PAINT.light, 0))
  ctx.globalAlpha = SKIN_ALPHA
  ctx.fillStyle = skin
  ctx.fillRect(inst.x1, 0, inst.x2 - inst.x1, surface + SKIN_DEPTH)
  ctx.globalAlpha = 1
}
//
// Short bright dashes drifting off both banks as the cycle runs.
//
function paintRipples(ctx, inst, t, surface) {
  ctx.fillStyle = PAINT.surfaceLine
  RIPPLE_BANKS.forEach(dir => {
    const from = dir > 0 ? inst.x1 : inst.x2
    for (let i = 0; i < RIPPLES; i++) {
      const u = (t / CYCLE + i / RIPPLES) % 1
      const cx = from + dir * (RIPPLE_START + u * RIPPLE_SPACING * RIPPLES)
      const len = RIPPLE_LEN * (1 - RIPPLE_SHRINK * u)
      ctx.globalAlpha = RIPPLE_ALPHA * Math.sin(u * Math.PI)
      ctx.fillRect(cx - len / 2, surface + RIPPLE_DROP + u * RIPPLE_DROP_STEP * RIPPLES, len, RIPPLE_H)
    }
  })
  ctx.globalAlpha = 1
}
//
// The light band between the top line and the inner one.
//
function paintBand(ctx, top, inner) {
  ctx.beginPath()
  top.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)))
  for (let i = inner.length - 1; i >= 0; i--) ctx.lineTo(inner[i].x, inner[i].y)
  ctx.closePath()
  ctx.fillStyle = hexAlpha(PAINT.surfaceBand, BAND_ALPHA)
  ctx.fill()
}
function strokeLine(ctx, pts, color, width) {
  ctx.beginPath()
  pts.forEach((pt, i) => (i ? ctx.lineTo(pt.x, pt.y) : ctx.moveTo(pt.x, pt.y)))
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.lineJoin = 'round'
  ctx.stroke()
}
//
// A surface line at time t along the lake (its wave dying out at the
// banks), at rest on Y `rest`.
//
function waveLine(inst, t, wave, rest) {
  const span = inst.x2 - inst.x1
  const pts = []
  for (let x = inst.x1; ; x = Math.min(inst.x2, x + POINT_STEP)) {
    const fade = Math.max(0, Math.min(1, (x - inst.x1) / SHORE_FADE, (inst.x2 - x) / SHORE_FADE))
    pts.push({ x, y: rest + wave((x - inst.x1) / span, t) * fade })
    if (x >= inst.x2) break
  }
  return pts
}
function topWave(u, t) {
  return Math.sin(t * WAVE_SPEED + u * WAVE_PHASE) * WAVE_AMP + Math.sin(t * WAVE_SECOND_SPEED + u * WAVE_SECOND_PHASE) * WAVE_SECOND_AMP
}
function innerWave(u, t) {
  return Math.sin(t * WAVE_SPEED + u * INNER_PHASE) * INNER_AMP + Math.sin(t * WAVE_SECOND_SPEED + u * INNER_SECOND_PHASE + INNER_SECOND_SHIFT) * INNER_SECOND_AMP
}
//
// The still body under the band: column by column down to the bowl, the
// see-through water deepening toward the bed.
//
function bakeBody(k, inst) {
  const top = Layout.LAKE_SURFACE_Y + BAND_BELOW
  const deep = Math.max(top + 1, ...inst.bed.map(pt => pt.y))
  const canvas = document.createElement('canvas')
  canvas.width = inst.x2 - inst.x1
  canvas.height = Math.ceil(deep - top) + 1
  const ctx = canvas.getContext('2d')
  ctx.translate(-inst.x1, -top)
  const tint = ctx.createLinearGradient(0, top, 0, deep)
  tint.addColorStop(0, hexAlpha(PAINT.deep, 0))
  tint.addColorStop(1, hexAlpha(PAINT.deep, DEEP_ALPHA))
  inst.bed.forEach(pt => {
    if (pt.y <= top) return
    ctx.fillStyle = hexAlpha(COLORS.water, BODY_ALPHA)
    ctx.fillRect(pt.x, top, 1, pt.y - top)
    ctx.fillStyle = tint
    ctx.fillRect(pt.x, top, 1, pt.y - top)
  })
  k.loadSprite(BODY_SPRITE, canvas)
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
