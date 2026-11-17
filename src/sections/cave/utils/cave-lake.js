import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Layout from './cave-layout.js'
import * as Ground from './cave-ground.js'
//
// The lake in the hall's floor: its water fills the floor's bowl from the
// surface down to the bowl's own soil, so its edges run along both banks
// to the very bottom; its surface ends exactly at the columns where the
// banks' soil drops under it (found pixel by pixel). The surface is the
// forest lake's: a bright top line and a fainter inner line, each riding
// its own slow wave, a light band between them — the waves die out
// toward the banks so the ends stay put. Under the waves the body is a
// still see-through bake (deeper water a little denser); the strip
// between the waving top and the bake is filled live. Algae (plants.png,
// pulled toward the water's dark green) stand on the bed and sway, drawn
// under the water.
//
const COLORS = CAVE_CFG.water
const SPRITE_PREFIX = 'cave0-lake-v2-'
const BODY_SPRITE = `${SPRITE_PREFIX}body`
const ALGA_SPRITE = `${SPRITE_PREFIX}alga-`
//
// Where the bowl is sought (past the lake's ends); the water reaches this
// far under the bowl's top so no gap shows under the soil's lumps.
//
const BANK_REACH = 40
const BED_OVERLAP = 6
//
// Water body: opacity at the surface and at the bed.
//
const BODY_TOP_ALPHA = 0.5
const BODY_DEEP_ALPHA = 0.7
const BYTE_MAX = 255
const HEX_RADIX = 16
//
// Surface (as the forest lake's): the top line's two waves (speed, height,
// phase across the lake), the inner line's two waves and its lag, both
// lines' widths and the inner one's opacity, the band's opacity; the waves
// die out over SHORE_FADE px at the banks. The still body starts STILL_DY
// under the surface (under the deepest trough); points every
// SURFACE_STEP px.
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
const INNER_SECOND_PHASE = 7.8
const INNER_LAG = 0.48
const LINE_W = 1.5
const INNER_W = 1
const INNER_OPACITY = 0.55
const BAND_OPACITY = 0.32
const SHORE_FADE = 60
const STILL_DY = 6
const SURFACE_STEP = 4
//
// Algae: how many, which plants, height (world px), how far they sink into
// the bed, how strongly they are pulled toward the algae colour; sway
// (radians, speed, phase spread).
//
const ALGA_COUNT = 16
const ALGA_KINDS = ['grow', 'bush', 'sprout']
const ALGA_H_MIN = 18
const ALGA_H_RANGE = 22
const ALGA_SINK = 4
const ALGA_SHADE = 0.55
const ALGA_SWAY = 0.12
const ALGA_SWAY_SPEED = 1.1
const ALGA_PHASE = 6
const ALGA_BANK_CLEAR = 40
const SEED = 8800
const RAD_TO_DEG = 180 / Math.PI
const bakedFor = new WeakSet()

/**
 * The lake on this k: its bowl, its baked body and its algae.
 * @param {Object} k - Kaplay instance
 * @returns {Object} Lake instance
 */
export function create(k) {
  const bed = bowlLine()
  const inst = {
    k,
    bed,
    x1: bed[0].x,
    x2: bed[bed.length - 1].x + 1,
    colors: { line: getRGB(k, COLORS.paint.surfaceLine), band: getRGB(k, COLORS.paint.surfaceBand), water: getRGB(k, COLORS.water) },
    batches: { water: PolyBatch.create(), band: PolyBatch.create(), line: PolyBatch.create(), inner: PolyBatch.create() },
    top: [],
    inner: [],
    algae: placeAlgae(k, bed)
  }
  bakedFor.has(k) || bake(k, inst)
  bakedFor.add(k)
  return inst
}

/**
 * Draws the swaying algae (under the water).
 * @param {Object} inst - Lake instance
 * @param {{left: number, right: number}} view - Visible world rect
 */
export function onDrawAlgae(inst, view) {
  if (inst.x2 < view.left || inst.x1 > view.right) return
  const t = inst.k.time()
  inst.algae.forEach(alga => drawAlga(inst.k, alga, t))
}

/**
 * Draws the water: the still body, the strip over it up to the waving
 * top, the band between the two surface lines, then the lines.
 * @param {Object} inst - Lake instance
 * @param {{left: number, right: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  if (inst.x2 < view.left || inst.x1 > view.right) return
  const k = inst.k
  const t = k.time()
  const { water, band, line, inner } = inst.batches
  k.drawSprite({ sprite: BODY_SPRITE, pos: k.vec2(inst.x1, Layout.LAKE_SURFACE_Y) })
  waveLine(inst, inst.top, t, topWave)
  waveLine(inst, inst.inner, t + INNER_LAG, innerWave)
  fillBetween(water, inst.top, inst.top.map(pt => ({ x: pt.x, y: stillTop(inst, pt.x) })), inst.colors.water)
  fillBetween(band, inst.top, inst.inner, inst.colors.band)
  PolyBatch.addPolyline(line, inst.top, LINE_W, inst.colors.line)
  PolyBatch.addPolyline(inner, inst.inner, INNER_W, inst.colors.line)
  PolyBatch.flush(water, k, BODY_TOP_ALPHA)
  PolyBatch.flush(band, k, BAND_OPACITY)
  PolyBatch.flush(line, k)
  PolyBatch.flush(inner, k, INNER_OPACITY)
}
function drawAlga(k, alga, t) {
  k.drawSprite({
    sprite: alga.sprite,
    pos: alga.pos,
    anchor: 'bot',
    flipX: alga.flip,
    angle: Math.sin(t * ALGA_SWAY_SPEED + alga.phase) * ALGA_SWAY * RAD_TO_DEG
  })
}
//
// The bowl under the water: the floor's art top, column by column, from
// the first to the last column where it lies under the surface (the
// banks' soil meets the surface right at its ends).
//
function bowlLine() {
  const floor = Layout.PLATFORMS.find(p => p.top && Layout.LAKE_X1 >= p.x1 && Layout.LAKE_X2 <= p.x2)
  const cols = []
  for (let x = Layout.LAKE_X1 - BANK_REACH; x <= Layout.LAKE_X2 + BANK_REACH; x++) cols.push({ x, y: Ground.topAt(floor, x) })
  const first = cols.findIndex(c => c.y > Layout.LAKE_SURFACE_Y)
  const last = cols.findLastIndex(c => c.y > Layout.LAKE_SURFACE_Y)
  return cols.slice(first, last + 1).map(c => ({ x: c.x, y: Math.max(Layout.LAKE_SURFACE_Y, c.y + BED_OVERLAP) }))
}
//
// A surface line at time t along the lake (its wave dying out at the
// banks), into `pts` (reused every frame).
//
function waveLine(inst, pts, t, wave) {
  const span = inst.x2 - inst.x1
  let i = 0
  for (let x = inst.x1; ; x = Math.min(inst.x2, x + SURFACE_STEP)) {
    const u = (x - inst.x1) / span
    const fade = Math.min(1, (x - inst.x1) / SHORE_FADE, (inst.x2 - x) / SHORE_FADE)
    pts[i] ??= { x: 0, y: 0 }
    pts[i].x = x
    pts[i].y = Layout.LAKE_SURFACE_Y + wave(u, t) * fade
    i++
    if (x >= inst.x2) break
  }
  pts.length = i
}
function topWave(u, t) {
  return Math.sin(t * WAVE_SPEED + u * WAVE_PHASE) * WAVE_AMP + Math.sin(t * WAVE_SECOND_SPEED + u * WAVE_SECOND_PHASE) * WAVE_SECOND_AMP
}
function innerWave(u, t) {
  return Math.sin(t * WAVE_SPEED + u * INNER_PHASE) * INNER_AMP + Math.sin(t * WAVE_SECOND_SPEED + u * INNER_SECOND_PHASE) * INNER_SECOND_AMP
}
//
// Where the still body starts under the surface at X (never under the
// bowl's own soil).
//
function stillTop(inst, x) {
  const bed = inst.bed[Math.min(inst.bed.length - 1, Math.max(0, Math.round(x - inst.x1)))]
  return Math.min(bed.y, Layout.LAKE_SURFACE_Y + STILL_DY)
}
//
// Quads between two lines over the same X points.
//
function fillBetween(batch, a, b, color) {
  for (let i = 0; i < a.length - 1; i++) {
    PolyBatch.addQuad(batch, a[i].x, a[i].y, a[i + 1].x, a[i + 1].y, b[i + 1].x, b[i + 1].y, b[i].x, b[i].y, color)
  }
}
//
// Algae spread along the bed, clear of the banks.
//
function placeAlgae(k, bed) {
  const rng = createSeededRandom(SEED)
  const inner = bed.filter(pt => pt.x > bed[0].x + ALGA_BANK_CLEAR && pt.x < bed[bed.length - 1].x - ALGA_BANK_CLEAR)
  return Array.from({ length: ALGA_COUNT }, (_, i) => {
    const pt = inner[Math.floor(rng() * inner.length)]
    const kind = ALGA_KINDS[Math.floor(rng() * ALGA_KINDS.length)]
    const names = Atlas.pieceNames(kind)
    return {
      name: names[Math.floor(rng() * names.length)],
      sprite: `${ALGA_SPRITE}${i}`,
      h: ALGA_H_MIN + rng() * ALGA_H_RANGE,
      pos: k.vec2(pt.x, pt.y - BED_OVERLAP + ALGA_SINK),
      flip: rng() < 0.5,
      phase: rng() * ALGA_PHASE
    }
  })
}
//
// The body and every alga, once per live k.
//
function bake(k, inst) {
  bakeBody(k, inst)
  inst.algae.forEach(alga => bakeAlga(k, alga))
}
//
// The still body under the waves: column by column from STILL_DY under
// the surface down to the bowl.
//
function bakeBody(k, inst) {
  const top = Layout.LAKE_SURFACE_Y
  const deep = Math.max(...inst.bed.map(pt => pt.y))
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(inst.x2 - inst.x1)
  canvas.height = Math.ceil(deep - top) + 1
  const ctx = canvas.getContext('2d')
  ctx.translate(-inst.x1, -top)
  const g = ctx.createLinearGradient(0, top, 0, deep)
  g.addColorStop(0, hexAlpha(COLORS.water, BODY_TOP_ALPHA))
  g.addColorStop(1, hexAlpha(COLORS.paint.deep, BODY_DEEP_ALPHA))
  ctx.fillStyle = g
  inst.bed.forEach(pt => {
    const y = stillTop(inst, pt.x)
    pt.y > y && ctx.fillRect(pt.x, y, 1, pt.y - y)
  })
  k.loadSprite(BODY_SPRITE, canvas)
}
function bakeAlga(k, alga) {
  const w = Math.ceil(Atlas.widthAt(alga.name, alga.h))
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, w)
  canvas.height = Math.ceil(alga.h)
  Atlas.drawPiece(canvas.getContext('2d'), alga.name, w / 2, alga.h, alga.h, { shade: COLORS.paint.algaeDark, shadeAmount: ALGA_SHADE })
  k.loadSprite(alga.sprite, canvas)
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
