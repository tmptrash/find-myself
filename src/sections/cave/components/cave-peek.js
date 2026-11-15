import { getRGB } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Backdrop from '../utils/cave-backdrop.js'
import * as Glow from '../utils/cave-glow.js'
import * as Layout from '../utils/cave-layout.js'
import * as Scene from '../utils/cave-scene.js'
import { LANTERN_H } from './cave-lantern.js'
//
// A glimpse of the cave from the forest: when the eye-flower's roots have
// dragged the hero down their tunnel, its floor gives way and under it
// opens the cave's start — the roots' hole in the ceiling, the room below
// it, the earth ledge with its moss, the dim lantern mushroom. It is the
// level's own picture (the same painters), cut out as a ragged hollow in
// the forest's earth whose top is the cave's own earth ceiling with the
// hole at the tunnel's end, baked once per live k. Nothing of it is drawn
// before setOpen().
//
const SPRITE = 'cave0-peek-v1'
const GRAIN_SEED = 9500
//
// Cave rect painted and the hollow cut from it (cave coordinates): an
// uneven blob reaching from just over the hole down past the ledge's top.
//
const RECT = { x1: Layout.ENTRY_X - 190, y1: Layout.ENTRY_Y - 70, x2: Layout.ENTRY_X + 300, y2: Layout.ENTRY_Y + 330 }
const BLOB = { cx: Layout.ENTRY_X + 50, cy: Layout.ENTRY_Y + 132, rx: 236, ry: 196 }
const EDGE_STEPS = 80
const EDGE_JAGS = [{ amp: 0.06, freq: 5, phase: 0.7 }, { amp: 0.03, freq: 13, phase: 2.1 }]
const SHADOW_W = 14
const SHADOW_ALPHA = 0.5
const CONTOUR_W = 3
//
// The lantern mushroom stands dim in it (it lights only when bounced on).
//
const LANTERN_SHADE = 0.4
const LANTERN_SINK = 3
//
// Glows inside the hollow: the lantern's faint halo, the teal mushrooms,
// daylight from the roots' hole (cave x, y, radius, opacity, colour key).
//
const GLOWS = [
  { x: Layout.LANTERN.x, y: Layout.LANTERN.y - 56, r: 46, opacity: 0.25, color: 'lanternGlow' },
  { x: 430, y: 532, r: 60, opacity: 0.35, color: 'tealGlow' },
  { x: Layout.ENTRY_X, y: Layout.ENTRY_Y + 30, r: 110, opacity: 0.35, color: 'rootLight' }
]
const bakedFor = new WeakSet()

/**
 * Creates the glimpse with the cave's hole at a forest point (the root
 * tunnel's end), baking it if this k has not yet.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Forest X of the cave's hole
 * @param {number} cfg.y - Forest Y of the cave's hole (its lower lip)
 * @returns {Object} Peek instance
 */
export function create(cfg) {
  const { k, x, y } = cfg
  bake(k)
  Glow.create(k)
  return {
    k,
    ready: bakedFor.has(k),
    ox: x - Layout.ENTRY_X,
    oy: y - Layout.ENTRY_Y,
    open: 0,
    glows: GLOWS.map(g => ({ ...g, rgb: getRGB(k, CAVE_CFG.colors[g.color]) }))
  }
}

/**
 * Bakes the glimpse ahead of time (level setup), so the grab never stalls
 * on it.
 * @param {Object} k - Kaplay instance
 */
export function prewarm(k) {
  bake(k)
}

/**
 * Shows the glimpse (0 hidden … 1 fully open).
 * @param {Object} inst - Peek instance
 * @param {number} u - Openness
 */
export function setOpen(inst, u) {
  inst.open = Math.max(0, Math.min(1, u))
}

/**
 * Forest Y of the cave ledge's top under the hole (where a falling hero lands).
 * @param {Object} inst - Peek instance
 * @returns {number}
 */
export function landingY(inst) {
  return Layout.PLATFORMS.find(p => p.id === 'upper').y + inst.oy
}

/**
 * Forest Y of the hollow's bottom edge (for the camera).
 * @param {Object} inst - Peek instance
 * @returns {number}
 */
export function bottomY(inst) {
  return BLOB.cy + BLOB.ry + inst.oy
}

/**
 * Draws the hollow, then its glows (additive).
 * @param {Object} inst - Peek instance
 */
export function onDraw(inst) {
  if (inst.open <= 0 || !inst.ready) return
  const k = inst.k
  k.drawSprite({ sprite: SPRITE, pos: k.vec2(RECT.x1 + inst.ox, RECT.y1 + inst.oy), opacity: inst.open })
  inst.glows.forEach(g => Glow.drawGlow(k, g.x + inst.ox, g.y + inst.oy, g.r, g.rgb, g.opacity * inst.open))
}
//
// The cave picture over the rect, the dim lantern, cut to the hollow with
// a shadowed rim and a dark contour; grain once.
//
function bake(k) {
  if (bakedFor.has(k) || !Atlas.isLoaded()) return
  const canvas = document.createElement('canvas')
  canvas.width = RECT.x2 - RECT.x1
  canvas.height = RECT.y2 - RECT.y1
  const ctx = canvas.getContext('2d')
  ctx.translate(-RECT.x1, -RECT.y1)
  Backdrop.paintBackdrop(ctx, RECT)
  Scene.paintTerrain(ctx, RECT, null)
  Atlas.drawPiece(ctx, 'chanterelle', Layout.LANTERN.x, Layout.LANTERN.y + LANTERN_SINK, LANTERN_H, {
    shade: CAVE_CFG.colors.frame,
    shadeAmount: LANTERN_SHADE
  })
  const outline = hollowOutline()
  ctx.globalCompositeOperation = 'destination-in'
  tracePath(ctx, outline)
  ctx.fill()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = SHADOW_ALPHA
  ctx.strokeStyle = CAVE_CFG.colors.contour
  ctx.lineWidth = SHADOW_W
  tracePath(ctx, outline)
  ctx.stroke()
  ctx.globalCompositeOperation = 'source-over'
  ctx.globalAlpha = 1
  ctx.lineWidth = CONTOUR_W
  ctx.stroke()
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  k.loadSprite(SPRITE, canvas)
  bakedFor.add(k)
}
//
// The blob's ragged outline.
//
function hollowOutline() {
  const pts = []
  for (let i = 0; i < EDGE_STEPS; i++) {
    const a = Math.PI * 2 * i / EDGE_STEPS
    const r = 1 + EDGE_JAGS.reduce((sum, j) => sum + Math.sin(a * j.freq + j.phase) * j.amp, 0)
    pts.push({ x: BLOB.cx + Math.cos(a) * BLOB.rx * r, y: Math.max(RECT.y1, BLOB.cy + Math.sin(a) * BLOB.ry * r) })
  }
  return pts
}
function tracePath(ctx, pts) {
  ctx.beginPath()
  pts.forEach((p, i) => (i ? ctx.lineTo(p.x, p.y) : ctx.moveTo(p.x, p.y)))
  ctx.closePath()
}
