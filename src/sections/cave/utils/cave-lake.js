import { applyForestGameplaySharpBake } from '../../forest/utils/forest-focus-depth.js'
import * as Lake from '../../../components/lake.js'
import * as Wave from '../../../utils/water-wave.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from './cave-layout.js'
import * as Ground from './cave-ground.js'
import * as LakeBed from './cave-lake-bed.js'
import * as Surface from './cave-water-surface.js'
//
// The lake in the hall's floor, painted like the forest lake
// (components/lake.js): its water fills the floor's bowl from the surface
// down to the bowl's own soil, so its edges run along both banks to the
// very bottom, and its surface ends exactly at the columns where the
// banks' soil drops under it (found pixel by pixel, Ground.waterColumns);
// under each bank it runs on into the hollow there, under the hollow's
// soil (no water is painted over that soil).
//
// Its surface is a row of springs (utils/water-wave.js) across the open
// water between the banks' tips: splashes push it down and the waves run
// off, come back off the banks and settle; the still water barely moves.
// How the surface looks (cave-water-surface.js): the band round it (a
// faint contour over a softly lit strip and the light skin, the water
// fading to see-through under it: ONE still bake, here) bent to the
// springs, and broken moving highlights over it.
// Under the band the body is one still bake, and over it the stones
// lining the hollows, drawn again under only a light haze of water
// (LINING_TINT): they stay light, and the water's edge runs along the
// stones, not along the soil's smooth arc (none of it over the surface).
// All three carry the same depth gradient (lighter under the surface,
// darker toward the lake's deepest point), baked once. The forest lake's
// swaying algae stand on the bed, drawn under the water.
//
const COLORS = CAVE_CFG.water
const PAINT = COLORS.paint
const GRADIENT = COLORS.gradient
const SPRITE_PREFIX = 'cave0-lake-v5-'
const BAND_SPRITE = `${SPRITE_PREFIX}band`
const BODY_SPRITE = `${SPRITE_PREFIX}body`
const LINING_SPRITE = `${SPRITE_PREFIX}lining`
//
// The water reaches this far under the bowl's top so no gap shows under
// the soil's lumps.
//
const BED_OVERLAP = 6
const BAND_SEED = 8900
//
// Water paint (as the forest lake's): opaque OPAQUE_PX under the surface,
// then fading to BODY_ALPHA over BODY_FADE px; a light skin (SKIN_ALPHA
// over SKIN_DEPTH px); the contour and the lit band under it (SURFACE).
//
const SURFACE = COLORS.surface
const OPAQUE_PX = 3
const BODY_FADE = 10
const BODY_ALPHA = 0.42
const LINING_TINT = 0.18
const SKIN_ALPHA = 0.28
const SKIN_DEPTH = 16
const HALF = 0.5
const BYTE_MAX = 255
const HEX_RADIX = 16
const bakedFor = new WeakSet()

/**
 * The lake on this k: its bowl, its baked water, its surface's springs
 * and its algae.
 * @param {Object} k - Kaplay instance
 * @returns {Object} Lake instance
 */
export function create(k) {
  const bed = bowlLine()
  const x1 = bed[0].x
  const x2 = bed[bed.length - 1].x + 1
  const waveX1 = Math.max(x1, Layout.BANK_TIP_X)
  const waveX2 = Math.min(x2, Layout.BANK_TIP_X2)
  const inst = {
    k,
    bed,
    x1,
    x2,
    waveX1,
    waveX2,
    deep: 0,
    wave: Wave.create({ ...COLORS.wave, x1: waveX1, x2: waveX2 }),
    surface: null,
    bodyPos: k.vec2(x1, Layout.LAKE_SURFACE_Y + Surface.BAND_BELOW),
    liningPos: null,
    algae: null
  }
  inst.deep = bodyDeep(inst)
  inst.surface = Surface.create({ k, x1, x2, wave: inst.wave, sprite: BAND_SPRITE })
  inst.algae = Lake.createAlgaeField(k, { paint: PAINT, x1: Math.max(x1, Layout.LAKE_X1), x2, surfaceY: Layout.LAKE_SURFACE_Y, bedAt: x => bedAt(inst, x) - BED_OVERLAP })
  const box = LakeBed.liningBox()
  inst.liningPos = k.vec2(box.x1, box.y1)
  bakedFor.has(k) || bake(k, inst, box)
  bakedFor.add(k)
  return inst
}

/**
 * Runs the surface's springs on by this frame's time.
 * @param {Object} inst - Lake instance
 */
export function onUpdate(inst) {
  Wave.onUpdate(inst.wave, inst.k.dt())
}

/**
 * Something broke the surface at a world X: the water there is pushed
 * down and the waves run off from it.
 * @param {Object} inst - Lake instance
 * @param {number} x - World X
 * @param {number} strength - How hard (1: a full splash)
 */
export function disturb(inst, x, strength) {
  Wave.disturb(inst.wave, x, strength)
}

/**
 * Draws the swaying algae (under the water).
 * @param {Object} inst - Lake instance
 */
export function onDrawAlgae(inst) {
  Lake.drawAlgaeField(inst.k, inst.algae)
}

/**
 * Draws the water: the band bent to the surface, the still body, the
 * lining stones, then the surface's highlights.
 * @param {Object} inst - Lake instance
 * @param {{left: number, right: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  if (inst.x2 < view.left || inst.x1 > view.right) return
  const k = inst.k
  Surface.onDrawBand(inst.surface, view)
  k.drawSprite({ sprite: BODY_SPRITE, pos: inst.bodyPos })
  k.drawSprite({ sprite: LINING_SPRITE, pos: inst.liningPos })
  Surface.onDrawHighlights(inst.surface)
}

/**
 * The water's top line at a world X this moment (its springs), for what
 * rides on it.
 * @param {Object} inst - Lake instance
 * @param {number} x - World X
 * @returns {number} World Y of the surface
 */
export function surfaceAt(inst, x) {
  return Layout.LAKE_SURFACE_Y + Wave.heightAt(inst.wave, x)
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
// The band, the still body and the lining, once per live k.
//
function bake(k, inst, liningBox) {
  bakeBand(k, inst)
  bakeBody(k, inst)
  bakeLining(k, inst, liningBox)
}
//
// The band at rest (painted in world coordinates; its layout is
// cave-water-surface.js'), grained, its edge rows repeated into its pads.
//
function bakeBand(k, inst) {
  const pad = Surface.BAND_PAD
  const h = Surface.BAND_ABOVE + Surface.BAND_BELOW
  const canvas = document.createElement('canvas')
  canvas.width = inst.x2 - inst.x1
  canvas.height = Surface.BAND_TEX_H
  const ctx = canvas.getContext('2d')
  ctx.translate(-inst.x1, pad + Surface.BAND_ABOVE - Layout.LAKE_SURFACE_Y)
  paintBand(ctx, inst)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  applyForestGameplaySharpBake(canvas, BAND_SEED)
  ctx.drawImage(canvas, 0, pad, canvas.width, 1, 0, 0, canvas.width, pad)
  ctx.drawImage(canvas, 0, pad + h - 1, canvas.width, 1, 0, pad + h, canvas.width, pad)
  k.loadSprite(BAND_SPRITE, canvas)
}
//
// The water under the flat surface down to the bowl, its paint clipped
// to it, then the faint contour; nothing over the soil ceiling of the
// hollows.
//
function paintBand(ctx, inst) {
  const top = Layout.LAKE_SURFACE_Y
  const bottom = top + Surface.BAND_BELOW
  const w = inst.x2 - inst.x1
  ctx.beginPath()
  ctx.moveTo(inst.x1, top)
  ctx.lineTo(inst.x2, top)
  for (let x = inst.x2 - 1; x >= inst.x1; x--) {
    const y = Math.min(bottom, bedAt(inst, x))
    ctx.lineTo(x + 1, y)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  const body = ctx.createLinearGradient(0, top + OPAQUE_PX, 0, top + OPAQUE_PX + BODY_FADE)
  body.addColorStop(0, COLORS.water)
  body.addColorStop(1, hexAlpha(COLORS.water, BODY_ALPHA))
  ctx.fillStyle = body
  ctx.fill()
  ctx.save()
  ctx.clip()
  paintDepth(ctx, inst, inst.x1, top, w, Surface.BAND_BELOW)
  paintSkin(ctx, inst, top)
  const lit = ctx.createLinearGradient(0, top, 0, top + SURFACE.bandDepth)
  lit.addColorStop(0, hexAlpha(PAINT.surfaceBand, SURFACE.bandAlpha))
  lit.addColorStop(1, hexAlpha(PAINT.surfaceBand, 0))
  ctx.fillStyle = lit
  ctx.fillRect(inst.x1, top, w, SURFACE.bandDepth)
  ctx.restore()
  ctx.fillStyle = hexAlpha(PAINT.surfaceLine, SURFACE.contourAlpha)
  ctx.fillRect(inst.x1, top - SURFACE.contourWidth * HALF, w, SURFACE.contourWidth)
  inst.bed.forEach(col => col.top > top && ctx.clearRect(col.x, top - Surface.BAND_ABOVE, 1, col.top - top + Surface.BAND_ABOVE))
}
//
// The light skin under the surface.
//
function paintSkin(ctx, inst, top) {
  const skin = ctx.createLinearGradient(0, top, 0, top + SKIN_DEPTH)
  skin.addColorStop(0, PAINT.light)
  skin.addColorStop(1, hexAlpha(PAINT.light, 0))
  ctx.globalAlpha = SKIN_ALPHA
  ctx.fillStyle = skin
  ctx.fillRect(inst.x1, top, inst.x2 - inst.x1, SKIN_DEPTH)
  ctx.globalAlpha = 1
}
//
// The depth gradient over a world rect, by the lake's depth (0 at the
// surface, 1 at its deepest point; see CAVE_CFG.water.gradient): the
// light ramp, then the deep one over it — they overlap, so the water
// darkens smoothly all the way down, the dark gathering at the bottom.
//
function paintDepth(ctx, inst, x, y, w, h) {
  const top = Layout.LAKE_SURFACE_Y
  const depth = inst.deep - top
  const light = ctx.createLinearGradient(0, top, 0, top + depth * GRADIENT.lightEnd)
  light.addColorStop(0, hexAlpha(GRADIENT.surface, GRADIENT.lightAlpha * GRADIENT.intensity))
  light.addColorStop(1, hexAlpha(GRADIENT.surface, 0))
  ctx.fillStyle = light
  ctx.fillRect(x, y, w, h)
  const deep = ctx.createLinearGradient(0, top + depth * GRADIENT.deepFrom, 0, inst.deep)
  deep.addColorStop(0, hexAlpha(GRADIENT.deep, 0))
  deep.addColorStop(HALF, hexAlpha(GRADIENT.deep, GRADIENT.deepAlpha * GRADIENT.deepMid * GRADIENT.intensity))
  deep.addColorStop(1, hexAlpha(GRADIENT.deep, GRADIENT.deepAlpha * GRADIENT.intensity))
  ctx.fillStyle = deep
  ctx.fillRect(x, y, w, h)
}
//
// The still body under the band: column by column (from the hollow's
// ceiling where that is lower) down to the bowl, the see-through water
// under the depth gradient.
//
function bakeBody(k, inst) {
  const top = Layout.LAKE_SURFACE_Y + Surface.BAND_BELOW
  const canvas = document.createElement('canvas')
  canvas.width = inst.x2 - inst.x1
  canvas.height = Math.ceil(inst.deep - top) + 1
  const ctx = canvas.getContext('2d')
  ctx.translate(-inst.x1, -top)
  ctx.beginPath()
  inst.bed.forEach(pt => {
    const from = Math.max(top, pt.top)
    pt.y > from && ctx.rect(pt.x, from, 1, pt.y - from)
  })
  ctx.fillStyle = hexAlpha(COLORS.water, BODY_ALPHA)
  ctx.fill()
  ctx.clip()
  paintDepth(ctx, inst, inst.x1, top, inst.x2 - inst.x1, inst.deep - top)
  k.loadSprite(BODY_SPRITE, canvas)
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
  ctx.fillStyle = hexAlpha(COLORS.water, LINING_TINT)
  ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1)
  paintDepth(ctx, inst, box.x1, box.y1, box.x2 - box.x1, box.y2 - box.y1)
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = COLORS.water
  ctx.fillRect(box.x1, box.y1, box.x2 - box.x1, Layout.LAKE_SURFACE_Y - box.y1)
  k.loadSprite(LINING_SPRITE, canvas)
}
//
// The body's deepest row (the bowl's bottom).
//
function bodyDeep(inst) {
  return Math.max(Layout.LAKE_SURFACE_Y + Surface.BAND_BELOW + 1, ...inst.bed.map(pt => pt.y))
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(Math.max(0, Math.min(1, alpha)) * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
