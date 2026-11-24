import * as Lake from '../../../components/lake.js'
import * as Water from '../../../components/water.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from './cave-layout.js'
import * as Ground from './cave-ground.js'
import * as LakeBed from './cave-lake-bed.js'
//
// The lake in the hall's floor: the shared water (components/water.js)
// filling the floor's bowl from the surface down to the bowl's own soil,
// so its edges run along both banks to the very bottom, and its surface
// ends exactly at the columns where the banks' soil drops under it (found
// pixel by pixel, Ground.waterColumns); under each bank it runs on into
// the hollow there, under the hollow's soil (no water is painted over
// that soil). Its surface's springs run across the open water between the
// banks' tips.
//
// Over the water's body the stones lining the hollows are drawn again
// under only a light haze of water (LINING_TINT) and its depth gradient:
// they stay light, and the water's edge runs along the stones, not along
// the soil's smooth arc (none of it over the surface); the surface's
// highlights go over them. The forest lake's swaying algae stand on the
// bed, drawn under the water.
//
const COLORS = CAVE_CFG.water
const PAINT = COLORS.paint
const WATER_KEY = 'cave0-lake'
const LINING_SPRITE = 'cave0-lake-lining-v1'
//
// The water reaches this far under the bowl's top so no gap shows under
// the soil's lumps.
//
const BED_OVERLAP = 6
const LINING_TINT = 0.18
const bakedFor = new WeakSet()

/**
 * The lake on this k: its bowl, its water and its algae.
 * @param {Object} k - Kaplay instance
 * @returns {Object} Lake instance
 */
export function create(k) {
  const bed = bowlLine()
  const x1 = bed[0].x
  const x2 = bed[bed.length - 1].x + 1
  const water = Water.create({
    k,
    key: WATER_KEY,
    columns: bed,
    surfaceY: Layout.LAKE_SURFACE_Y,
    waveX1: Layout.BANK_TIP_X,
    waveX2: Layout.BANK_TIP_X2,
    palette: { water: COLORS.water, paint: PAINT },
    tune: COLORS.tune
  })
  const inst = {
    k,
    bed,
    x1,
    x2,
    water,
    waveX1: water.wave.x1,
    waveX2: water.wave.x2,
    liningPos: null,
    algae: null
  }
  inst.algae = Lake.createAlgaeField(k, { paint: PAINT, x1: Math.max(x1, Layout.LAKE_X1), x2, surfaceY: Layout.LAKE_SURFACE_Y, bedAt: x => bedAt(inst, x) - BED_OVERLAP })
  const box = LakeBed.liningBox()
  inst.liningPos = k.vec2(box.x1, box.y1)
  bakedFor.has(k) || bakeLining(k, inst, box)
  bakedFor.add(k)
  return inst
}

/**
 * Runs the surface's springs on by this frame's time.
 * @param {Object} inst - Lake instance
 */
export function onUpdate(inst) {
  Water.onUpdate(inst.water)
}

/**
 * Something broke the surface at a world X: the water there is pushed
 * down and the waves run off from it.
 * @param {Object} inst - Lake instance
 * @param {number} x - World X
 * @param {number} strength - How hard (1: a full splash)
 */
export function disturb(inst, x, strength) {
  Water.disturb(inst.water, x, strength)
}

/**
 * Draws the swaying algae (under the water).
 * @param {Object} inst - Lake instance
 */
export function onDrawAlgae(inst) {
  Lake.drawAlgaeField(inst.k, inst.algae)
}

/**
 * Draws the water (its band and body), the lining stones, then the
 * surface's highlights.
 * @param {Object} inst - Lake instance
 * @param {{left: number, right: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  if (!Water.onDraw(inst.water, view)) return
  inst.k.drawSprite({ sprite: LINING_SPRITE, pos: inst.liningPos })
  Water.onDrawHighlights(inst.water)
}

/**
 * The water's top line at a world X this moment (its springs), for what
 * rides on it.
 * @param {Object} inst - Lake instance
 * @param {number} x - World X
 * @returns {number} World Y of the surface
 */
export function surfaceAt(inst, x) {
  return Water.surfaceAt(inst.water, x)
}

/**
 * The water's top at a world X this moment: its surface, or in a bank's
 * hollow the soil ceiling over the water there.
 * @param {Object} inst - Lake instance
 * @param {number} x - World X
 * @returns {number} World Y
 */
export function waterTopAt(inst, x) {
  const col = colAt(inst, x)
  return col.top > Layout.LAKE_SURFACE_Y ? col.top : surfaceAt(inst, x)
}

/**
 * The lake's bed under a world X (the bowl's soil top).
 * @param {Object} inst - Lake instance
 * @param {number} x - World X
 * @returns {number} World Y of the bed
 */
export function bottomAt(inst, x) {
  return bedAt(inst, x)
}

/**
 * The bed's visible top under a world X (the soil's own top, where the
 * water reaches BED_OVERLAP px under it).
 * @param {Object} inst - Lake instance
 * @param {number} x - World X
 * @returns {number} World Y of the soil's top
 */
export function bedTopAt(inst, x) {
  return Math.max(Layout.LAKE_SURFACE_Y, bedAt(inst, x) - BED_OVERLAP)
}

/**
 * The water's span (its ends where the banks' soil drops under it; on the
 * left, the back of the hollow under the bank).
 * @param {Object} inst - Lake instance
 * @returns {{x1: number, x2: number}}
 */
export function span(inst) {
  return { x1: inst.x1, x2: inst.x2 }
}

/**
 * The span of the water open to the hall (out from under the left bank's
 * lip): what lives on the surface or over it keeps to it.
 * @param {Object} inst - Lake instance
 * @returns {{x1: number, x2: number}}
 */
export function openSpan(inst) {
  return { x1: inst.waveX1, x2: inst.waveX2 }
}
//
// The water column by column (Ground.waterColumns), from the first to the
// last column that has any: its top (the surface, or the soil ceiling of
// the hollow under the bank) and its bed (reached BED_OVERLAP px into).
//
function bowlLine() {
  const { x0, tops, beds } = Ground.waterColumns()
  const first = tops.findIndex(y => !Number.isNaN(y))
  const last = tops.findLastIndex(y => !Number.isNaN(y))
  const cols = []
  for (let i = first; i <= last; i++) {
    const top = Number.isNaN(tops[i]) ? Layout.LAKE_SURFACE_Y : tops[i]
    cols.push({ x: x0 + i, top, y: Number.isNaN(beds[i]) ? top : beds[i] + BED_OVERLAP })
  }
  return cols
}
function colAt(inst, x) {
  return inst.bed[Math.min(inst.bed.length - 1, Math.max(0, Math.round(x - inst.x1)))]
}
function bedAt(inst, x) {
  return colAt(inst, x).y
}
//
// The hollows' lining stones over the water: as they look, under a light
// haze of the water (LINING_TINT) and the depth gradient, none of them
// over the surface.
//
function bakeLining(k, inst, box) {
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, box.x2 - box.x1)
  canvas.height = Math.max(1, box.y2 - box.y1)
  const ctx = canvas.getContext('2d')
  ctx.translate(-box.x1, -box.y1)
  LakeBed.paintLining(ctx)
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = Water.hexAlpha(COLORS.water, LINING_TINT)
  ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1)
  Water.paintDepth(ctx, inst.water, box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = COLORS.water
  ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, Layout.LAKE_SURFACE_Y - box.y1)
  k.loadSprite(LINING_SPRITE, canvas)
}
