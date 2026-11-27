import { applyForestGameplaySharpBake } from '../sections/forest/utils/forest-focus-depth.js'
import { CFG } from '../cfg.js'
import * as Wave from '../utils/water-wave.js'
import * as Surface from './water-surface.js'
//
// A body of water shared by every level's lake (Rain World style): it
// fills given columns of the world (each its top — the surface, or a soil
// ceiling lower down — and its bed) and its surface is a row of springs
// (utils/water-wave.js) across the open water: splashes push it down and
// the waves run off, come back off the banks and settle; the still water
// barely moves.
//
// How it looks: the band round the surface (a faint contour over a softly
// lit strip and a light skin, the water opaque OPAQUE_PX under the surface
// and fading to see-through BODY_ALPHA over BODY_FADE px) is ONE still
// bake bent to the springs, with broken moving highlights over it
// (water-surface.js); under the band the body is one still bake. Both
// carry the depth gradient (lighter under the surface, darker toward the
// water's deepest point) and what the level paints under the surface
// (`paintUnder`, e.g. the forest trees' reflections), baked once per live
// k and grained. Nothing of it is drawn over a column's soil ceiling.
//
// Its tuning is CFG.visual.water, any part of it overridden by the level
// (`tune`); its colours are the level's (`palette`).
//
const TUNE = CFG.visual.water
const SPRITE_VERSION = 'v1'
const BAND_SEED = 8900
const BODY_SEED = 8910
const OPAQUE_PX = 3
const BODY_FADE = 10
const BODY_ALPHA = 0.42
const SKIN_ALPHA = 0.28
const SKIN_DEPTH = 16
const HALF = 0.5
const BYTE_MAX = 255
const HEX_RADIX = 16

/**
 * Creates a body of water and bakes its pictures (once per live k and
 * key).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {string} cfg.key - Sprite name prefix, unique per water
 * @param {Array<{x: number, top: number, y: number}>} cfg.columns - Every world px column from left to right: its water's top and its bed (world Y)
 * @param {number} cfg.surfaceY - World Y of the surface at rest
 * @param {number} cfg.waveX1 - Where the open water starts (the springs' left end)
 * @param {number} cfg.waveX2 - Where it ends (their right end)
 * @param {{water: string, paint: Object}} cfg.palette - Colours: the fill, and paint with light, surfaceLine, surfaceBand, highlight, highlightShade, depthLight, depthDark
 * @param {Object} [cfg.tune] - Overrides of CFG.visual.water ({wave, surface, highlight, gradient}, each in part)
 * @param {function(CanvasRenderingContext2D): void} [cfg.paintUnder] - Paints what shows under the surface, in world coordinates (clipped to the water)
 * @returns {Object} Water instance
 */
export function create(cfg) {
  const { k, key, columns, surfaceY, palette } = cfg
  const x1 = columns[0].x
  const x2 = columns[columns.length - 1].x + 1
  const waveX1 = Math.max(x1, cfg.waveX1)
  const waveX2 = Math.min(x2, cfg.waveX2)
  const tune = tuned(cfg.tune)
  const inst = {
    k,
    columns,
    x1,
    x2,
    surfaceY,
    palette,
    tune,
    paintUnder: cfg.paintUnder ?? null,
    deep: Math.max(surfaceY + Surface.BAND_BELOW + 1, ...columns.map(col => col.y)),
    bandSprite: `${key}-water-band-${SPRITE_VERSION}`,
    bodySprite: `${key}-water-body-${SPRITE_VERSION}`,
    bodyPos: k.vec2(x1, surfaceY + Surface.BAND_BELOW),
    wave: Wave.create({ ...tune.wave, x1: waveX1, x2: waveX2 }),
    surface: null
  }
  inst.surface = Surface.create({ k, x1, x2, restY: surfaceY, wave: inst.wave, sprite: inst.bandSprite, highlight: tune.highlight, paint: palette.paint })
  k.getSprite(inst.bodySprite) || bake(k, inst)
  return inst
}

/**
 * Runs the surface's springs on by this frame's time.
 * @param {Object} inst - Water instance
 */
export function onUpdate(inst) {
  Wave.onUpdate(inst.wave, inst.k.dt())
}

/**
 * Something broke the surface at a world X: the water there is pushed
 * down and the waves run off from it.
 * @param {Object} inst - Water instance
 * @param {number} x - World X
 * @param {number} strength - How hard (1: a full splash)
 */
export function disturb(inst, x, strength) {
  Wave.disturb(inst.wave, x, strength)
}

/**
 * The surface at a world X this moment, for what rides on it.
 * @param {Object} inst - Water instance
 * @param {number} x - World X
 * @returns {number} World Y of the surface
 */
export function surfaceAt(inst, x) {
  return inst.surfaceY + Wave.heightAt(inst.wave, x)
}

/**
 * Draws the water: the band bent to the surface, then the still body.
 * What lies in the water over them goes next, then onDrawHighlights.
 * @param {Object} inst - Water instance
 * @param {{left: number, right: number}} view - Visible world rect
 * @param {number} [opacity=1] - Fade (menu backdrop cross-fade)
 * @returns {boolean} Whether any of it is in view
 */
export function onDraw(inst, view, opacity = 1) {
  if (inst.x2 < view.left || inst.x1 > view.right) return false
  Surface.onDrawBand(inst.surface, view, opacity)
  inst.k.drawSprite({ sprite: inst.bodySprite, pos: inst.bodyPos, opacity })
  return true
}

/**
 * Draws the surface's highlights (after onDraw and what lies over it).
 * @param {Object} inst - Water instance
 */
export function onDrawHighlights(inst) {
  Surface.onDrawHighlights(inst.surface)
}

/**
 * Paints the depth gradient over a world rect, by the water's depth (0 at
 * the surface, 1 at its deepest point; see CFG.visual.water.gradient): the
 * light ramp, then the deep one over it (held at its darkest past
 * `deepTo`) — they overlap, so the water darkens smoothly all the way
 * down.
 * For what a level bakes into its water on its own (the cave's lining).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {Object} inst - Water instance
 * @param {number} x - World X of the rect
 * @param {number} y - World Y of the rect
 * @param {number} w - Width
 * @param {number} h - Height
 */
export function paintDepth(ctx, inst, x, y, w, h) {
  const g = inst.tune.gradient
  const paint = inst.palette.paint
  const top = inst.surfaceY
  const depth = inst.deep - top
  const light = ctx.createLinearGradient(0, top, 0, top + depth * g.lightEnd)
  light.addColorStop(0, hexAlpha(paint.depthLight, g.lightAlpha * g.intensity))
  light.addColorStop(1, hexAlpha(paint.depthLight, 0))
  ctx.fillStyle = light
  ctx.fillRect(x, y, w, h)
  const deep = ctx.createLinearGradient(0, top + depth * g.deepFrom, 0, top + depth * g.deepTo)
  deep.addColorStop(0, hexAlpha(paint.depthDark, 0))
  deep.addColorStop(HALF, hexAlpha(paint.depthDark, g.deepAlpha * g.deepMid * g.intensity))
  deep.addColorStop(1, hexAlpha(paint.depthDark, g.deepAlpha * g.intensity))
  ctx.fillStyle = deep
  ctx.fillRect(x, y, w, h)
}

/**
 * The depth gradient at a world Y, as paintDepth() lays it: how much of
 * the palette's `depthLight` and then of its `depthDark` lies over what
 * is in the water at that depth — for what a level draws live in the
 * water and wants shaded as the water around it is.
 * @param {Object} inst - Water instance
 * @param {number} y - World Y
 * @param {{light: number, dark: number}} out - Written: the two colours' opacity there (0 … 1)
 * @returns {{light: number, dark: number}} out
 */
export function depthTintAt(inst, y, out) {
  const g = inst.tune.gradient
  const t = Math.max(0, Math.min(1, (y - inst.surfaceY) / (inst.deep - inst.surfaceY)))
  const u = Math.max(0, Math.min(1, (t - g.deepFrom) / (g.deepTo - g.deepFrom)))
  const mid = g.deepAlpha * g.deepMid
  out.light = g.lightAlpha * g.intensity * Math.max(0, 1 - t / g.lightEnd)
  out.dark = g.intensity * (u < HALF ? mid * u / HALF : mid + (g.deepAlpha - mid) * (u - HALF) / HALF)
  return out
}

/**
 * '#rrggbb' plus an alpha byte (0 … 1, clamped), for canvas fills.
 * @param {string} hex - '#rrggbb'
 * @param {number} alpha - Opacity
 * @returns {string}
 */
export function hexAlpha(hex, alpha) {
  return hex + Math.round(Math.max(0, Math.min(1, alpha)) * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
//
// CFG.visual.water with a level's overrides, group by group.
//
function tuned(tune) {
  return {
    wave: { ...TUNE.wave, ...tune?.wave },
    surface: { ...TUNE.surface, ...tune?.surface },
    highlight: { ...TUNE.highlight, ...tune?.highlight },
    gradient: { ...TUNE.gradient, ...tune?.gradient }
  }
}
function colAt(inst, x) {
  const cols = inst.columns
  return cols[Math.min(cols.length - 1, Math.max(0, Math.round(x - inst.x1)))]
}
//
// The band and the still body.
//
function bake(k, inst) {
  bakeBand(k, inst)
  bakeBody(k, inst)
}
//
// The band at rest (painted in world coordinates; its layout is
// water-surface.js'), grained, its edge rows repeated into its pads.
//
function bakeBand(k, inst) {
  const pad = Surface.BAND_PAD
  const h = Surface.BAND_ABOVE + Surface.BAND_BELOW
  const canvas = document.createElement('canvas')
  canvas.width = inst.x2 - inst.x1
  canvas.height = Surface.BAND_TEX_H
  const ctx = canvas.getContext('2d')
  ctx.translate(-inst.x1, pad + Surface.BAND_ABOVE - inst.surfaceY)
  paintBand(ctx, inst)
  ctx.setTransform(1, 0, 0, 1, 0, 0)
  applyForestGameplaySharpBake(canvas, BAND_SEED)
  ctx.drawImage(canvas, 0, pad, canvas.width, 1, 0, 0, canvas.width, pad)
  ctx.drawImage(canvas, 0, pad + h - 1, canvas.width, 1, 0, pad + h, canvas.width, pad)
  k.loadSprite(inst.bandSprite, canvas)
}
//
// The water under the flat surface down to the bed, its paint clipped to
// it, then the faint contour; nothing over the soil ceilings.
//
function paintBand(ctx, inst) {
  const { palette, tune } = inst
  const top = inst.surfaceY
  const bottom = top + Surface.BAND_BELOW
  const w = inst.x2 - inst.x1
  ctx.beginPath()
  ctx.moveTo(inst.x1, top)
  ctx.lineTo(inst.x2, top)
  for (let x = inst.x2 - 1; x >= inst.x1; x--) {
    const y = Math.min(bottom, colAt(inst, x).y)
    ctx.lineTo(x + 1, y)
    ctx.lineTo(x, y)
  }
  ctx.closePath()
  const body = ctx.createLinearGradient(0, top + OPAQUE_PX, 0, top + OPAQUE_PX + BODY_FADE)
  body.addColorStop(0, palette.water)
  body.addColorStop(1, hexAlpha(palette.water, BODY_ALPHA))
  ctx.fillStyle = body
  ctx.fill()
  ctx.save()
  ctx.clip()
  paintDepth(ctx, inst, inst.x1, top, w, Surface.BAND_BELOW)
  paintSkin(ctx, inst, top)
  inst.paintUnder?.(ctx)
  const lit = ctx.createLinearGradient(0, top, 0, top + tune.surface.bandDepth)
  lit.addColorStop(0, hexAlpha(palette.paint.surfaceBand, tune.surface.bandAlpha))
  lit.addColorStop(1, hexAlpha(palette.paint.surfaceBand, 0))
  ctx.fillStyle = lit
  ctx.fillRect(inst.x1, top, w, tune.surface.bandDepth)
  ctx.restore()
  ctx.fillStyle = hexAlpha(palette.paint.surfaceLine, tune.surface.contourAlpha)
  ctx.fillRect(inst.x1, top - tune.surface.contourWidth * HALF, w, tune.surface.contourWidth)
  inst.columns.forEach(col => col.top > top && ctx.clearRect(col.x, top - Surface.BAND_ABOVE, 1, col.top - top + Surface.BAND_ABOVE))
}
//
// The light skin under the surface.
//
function paintSkin(ctx, inst, top) {
  const light = inst.palette.paint.light
  const skin = ctx.createLinearGradient(0, top, 0, top + SKIN_DEPTH)
  skin.addColorStop(0, light)
  skin.addColorStop(1, hexAlpha(light, 0))
  ctx.globalAlpha = SKIN_ALPHA
  ctx.fillStyle = skin
  ctx.fillRect(inst.x1, top, inst.x2 - inst.x1, SKIN_DEPTH)
  ctx.globalAlpha = 1
}
//
// The still body under the band: column by column (from a soil ceiling
// where that is lower) down to the bed, the see-through water under the
// depth gradient and what the level paints under the surface, grained.
//
function bakeBody(k, inst) {
  const top = inst.surfaceY + Surface.BAND_BELOW
  const canvas = document.createElement('canvas')
  canvas.width = inst.x2 - inst.x1
  canvas.height = Math.ceil(inst.deep - top) + 1
  const ctx = canvas.getContext('2d')
  ctx.translate(-inst.x1, -top)
  ctx.beginPath()
  inst.columns.forEach(col => {
    const from = Math.max(top, col.top)
    col.y > from && ctx.rect(col.x, from, 1, col.y - from)
  })
  ctx.fillStyle = hexAlpha(inst.palette.water, BODY_ALPHA)
  ctx.fill()
  ctx.clip()
  paintDepth(ctx, inst, inst.x1, top, inst.x2 - inst.x1, inst.deep - top)
  inst.paintUnder?.(ctx)
  applyForestGameplaySharpBake(canvas, BODY_SEED)
  k.loadSprite(inst.bodySprite, canvas)
}
