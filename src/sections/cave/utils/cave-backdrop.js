import { getRGB } from '../../../utils/helper.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Layout from './cave-layout.js'
//
// The back of the cave room, in two parallax layers (the reference's dark
// teal depth): a far layer of terraced rock silhouettes with pale
// waterfalls and their haze, and a mid layer of darker rock masses with
// dim moss, glowing mushrooms and nearer waterfalls. Each layer is painted
// in its own space — as big as the window needs to cross the world at its
// speed — and baked once per live k, in columns under 2048 px. The falling
// water is live: streaks run down every fall over the baked body.
//
const COLORS = CAVE_CFG.backdrop
const SPRITE_PREFIX = 'cave0-backdrop-v2-'
const TILE_MAX = 2048
const GRAIN_SEED = 9100
//
// Layer speeds (share of the camera's travel) and their seeds.
//
const LAYERS = [
  { id: 'far', speed: 0.35, seed: 9101 },
  { id: 'mid', speed: 0.65, seed: 9102 }
]
//
// Ridges of each layer, back to front: base height (share of the layer
// height), wobble, fill and rim colours, and the sheet pieces standing on
// it (height range, shade toward the ridge colour, spacing).
//
const RIDGES = {
  far: [
    { base: 0.4, amp: 40, color: COLORS.far[0], rim: COLORS.farRim, pieces: ['spires', 'slabs', 'stalagmites', 'rockPile'], hMin: 80, hRange: 90, shade: 0.86, gap: 240 },
    { base: 0.6, amp: 34, color: COLORS.far[1], rim: COLORS.farRim, pieces: ['caveRock', 'spires', 'mossRock'], hMin: 70, hRange: 70, shade: 0.84, gap: 280 },
    { base: 0.8, amp: 26, color: COLORS.far[2], rim: COLORS.farRim, pieces: [], hMin: 0, hRange: 0, shade: 0, gap: 0 }
  ],
  mid: [
    { base: 0.56, amp: 50, color: COLORS.mid[0], rim: COLORS.midRim, pieces: ['spires', 'vineSpire', 'stalagmites', 'rootBoulder'], hMin: 100, hRange: 90, shade: 0.76, gap: 300 },
    { base: 0.84, amp: 30, color: COLORS.mid[1], rim: COLORS.midRim, pieces: ['mossBoulder', 'caveMound', 'tealShroomRock', 'rockPile'], hMin: 70, hRange: 60, shade: 0.7, gap: 260 }
  ]
}
const RIDGE_STEP = 8
const RIDGE_WAVE = 0.004
const RIDGE_NOISE = 0.013
const RIDGE_NOISE_SHARE = 0.3
const RIM_W = 2
const RIM_ALPHA = 0.55
const MOSS_W = 4
const MOSS_ALPHA = 0.55
const PIECE_SINK = 0.12
const PIECE_GAP_JITTER = 0.5
//
// Waterfalls per layer: layer X share, the ridge they pour over (they fall
// to the next one, which hides their foot) and width.
//
const FALLS = {
  far: [
    { u: 0.12, ridge: 0, w: 16 },
    { u: 0.47, ridge: 1, w: 12 },
    { u: 0.83, ridge: 0, w: 20 }
  ],
  mid: [
    { u: 0.3, ridge: 0, w: 22 },
    { u: 0.68, ridge: 0, w: 26 }
  ]
}
const FALL_FOOT_PAD = 24
const FALL_BODY_ALPHA = { far: 0.28, mid: 0.4 }
const HAZE_R = 220
const HAZE_ALPHA = 0.32
const FOAM_H = 14
const FOAM_ALPHA = 0.5
const FOAM_W = 1.4
//
// Live streaks: per fall, their speed and length range, opacity.
//
const STREAKS_PER_FALL = 6
const STREAK_SPEED = 150
const STREAK_LEN_MIN = 26
const STREAK_LEN_RANGE = 40
const STREAK_W = 2
const STREAK_SPREAD = 0.8
const STREAK_OPACITY = 0.45
//
// Distant glowing specks on the far layer.
//
const SPECKS = 60
const SPECK_ALPHA = 0.45
const SPECK_R = 1.4
const SPECK_R_MIN = 0.5
const SPECK_Y_FROM = 0.25
const SPECK_Y_RANGE = 0.7
const TAU = Math.PI * 2
const BYTE_MAX = 255
const HEX_RADIX = 16
const bakedFor = new WeakSet()

/**
 * Bakes both layers on this k (once) and sets up the live streaks.
 * @param {Object} k - Kaplay instance
 * @param {{w: number, h: number}} view - Visible world window size
 * @returns {Object} Backdrop instance
 */
export function create(k, view) {
  const rng = createSeededRandom(GRAIN_SEED)
  return {
    k,
    tiles: bakeLayers(k, view),
    batch: PolyBatch.create(),
    streakRgb: getRGB(k, COLORS.waterfallLight),
    streaks: LAYERS.flatMap(layer => FALLS[layer.id].flatMap(fall => Array.from({ length: STREAKS_PER_FALL }, () => ({
      layer,
      span: fallSpan(layer, fall, view),
      x: fall.u * layerSize(layer, view).w + (rng() - 0.5) * fall.w * STREAK_SPREAD,
      phase: rng(),
      len: STREAK_LEN_MIN + rng() * STREAK_LEN_RANGE
    }))))
  }
}

/**
 * Draws both baked layers for the window whose top-left world point is
 * left / top, then the falling streaks over them.
 * @param {Object} inst - Backdrop instance
 * @param {{left: number, top: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  const k = inst.k
  inst.tiles.forEach(tile => k.drawSprite({
    sprite: tile.name,
    pos: k.vec2(Math.round(view.left * (1 - tile.speed)) + tile.x, Math.round(view.top * (1 - tile.speed)))
  }))
  const t = k.time()
  inst.streaks.forEach(streak => addStreak(inst, streak, view, t))
  PolyBatch.flush(inst.batch, k, STREAK_OPACITY)
}

/**
 * Paints both layers into a 2D canvas as seen by a window whose top-left
 * world point is rect.x1 / rect.y1 (the forest's peek, the menu picture).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {{x1: number, y1: number, x2: number, y2: number}} rect - Window rect
 */
export function paintBackdrop(ctx, rect) {
  const view = { w: rect.x2 - rect.x1, h: rect.y2 - rect.y1 }
  LAYERS.forEach(layer => {
    ctx.save()
    ctx.translate(rect.x1 * (1 - layer.speed), rect.y1 * (1 - layer.speed))
    paintLayer(ctx, layer, view)
    ctx.restore()
  })
}
//
// One streak running down its fall, wrapping to the top.
//
function addStreak(inst, streak, view, t) {
  const { y1, y2 } = streak.span
  const span = y2 - y1
  const y = y1 + ((t * STREAK_SPEED / span + streak.phase) % 1) * span
  const ox = view.left * (1 - streak.layer.speed)
  const oy = view.top * (1 - streak.layer.speed)
  PolyBatch.addLine(inst.batch, ox + streak.x, oy + y, ox + streak.x, oy + Math.min(y + streak.len, y2), STREAK_W, inst.streakRgb)
}
//
// Top and foot of a fall in its layer: from the lip of its ridge to just
// past the next ridge's top (that ridge hides the foot).
//
function fallSpan(layer, fall, view) {
  const size = layerSize(layer, view)
  const ridges = RIDGES[layer.id]
  const x = fall.u * size.w
  const next = ridges[fall.ridge + 1]
  return {
    y1: ridgeTop(ridges[fall.ridge], size, layer.seed + fall.ridge, x),
    y2: next ? ridgeTop(next, size, layer.seed + fall.ridge + 1, x) + FALL_FOOT_PAD : size.h
  }
}
//
// Layer size: what a window of this size sees while crossing the world at
// the layer's speed.
//
function layerSize(layer, view) {
  return {
    w: Math.ceil((Layout.WORLD_W - view.w) * layer.speed + view.w),
    h: Math.ceil((Layout.WORLD_H - view.h) * layer.speed + view.h)
  }
}
//
// Each layer painted once, cut into columns under the texture limit (the
// screen size is fixed for a live k: a resize reboots the engine).
//
function bakeLayers(k, view) {
  const tiles = []
  LAYERS.forEach((layer, i) => {
    const size = layerSize(layer, view)
    const count = Math.ceil(size.w / TILE_MAX)
    const tileW = Math.ceil(size.w / count)
    for (let c = 0; c < count; c++) tiles.push({ name: `${SPRITE_PREFIX}${layer.id}-${c}`, speed: layer.speed, x: c * tileW, w: Math.min(tileW, size.w - c * tileW), h: size.h, layer, seed: GRAIN_SEED + i * count + c })
  })
  if (bakedFor.has(k)) return tiles
  bakedFor.add(k)
  tiles.forEach(tile => bakeTile(k, tile, view))
  return tiles
}
function bakeTile(k, tile, view) {
  const canvas = document.createElement('canvas')
  canvas.width = tile.w
  canvas.height = tile.h
  const ctx = canvas.getContext('2d')
  ctx.translate(-tile.x, 0)
  paintLayer(ctx, tile.layer, view)
  applyForestFilmGrainToCanvas(canvas, tile.seed)
  k.loadSprite(tile.name, canvas)
}
function paintLayer(ctx, layer, view) {
  const size = layerSize(layer, view)
  const rng = createSeededRandom(layer.seed)
  if (layer.id === 'far') {
    paintRoom(ctx, size)
    paintHaze(ctx, size, view)
    paintSpecks(ctx, rng, size)
  }
  RIDGES[layer.id].forEach((ridge, i) => {
    paintRidge(ctx, rng, size, ridge, layer.seed + i)
    FALLS[layer.id].filter(fall => fall.ridge === i).forEach(fall => paintFall(ctx, layer, fall, view))
  })
}
//
// Room colour: dark under the ceiling, lighter teal low down.
//
function paintRoom(ctx, size) {
  const g = ctx.createLinearGradient(0, 0, 0, size.h)
  g.addColorStop(0, COLORS.top)
  g.addColorStop(1, COLORS.bottom)
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size.w, size.h)
}
function paintHaze(ctx, size, view) {
  FALLS.far.forEach(fall => {
    const x = fall.u * size.w
    const span = fallSpan(LAYERS[0], fall, view)
    const y = (span.y1 + span.y2) / 2
    const g = ctx.createRadialGradient(x, y, 0, x, y, HAZE_R)
    g.addColorStop(0, hexAlpha(COLORS.haze, HAZE_ALPHA))
    g.addColorStop(1, hexAlpha(COLORS.haze, 0))
    ctx.fillStyle = g
    ctx.fillRect(x - HAZE_R, y - HAZE_R, HAZE_R * 2, HAZE_R * 2)
  })
}
function paintSpecks(ctx, rng, size) {
  ctx.fillStyle = CAVE_CFG.colors.tealGlow
  ctx.globalAlpha = SPECK_ALPHA
  for (let i = 0; i < SPECKS; i++) {
    ctx.beginPath()
    ctx.arc(rng() * size.w, size.h * (SPECK_Y_FROM + rng() * SPECK_Y_RANGE), SPECK_R * (SPECK_R_MIN + rng()), 0, TAU)
    ctx.fill()
  }
  ctx.globalAlpha = 1
}
//
// A ridge across the layer: a wavy top filled down to the bottom, a lit
// rim and dim moss on it, and sheet pieces standing along it, shaded into
// the ridge's colour (silhouettes with a little texture left).
//
function paintRidge(ctx, rng, size, ridge, seed) {
  const topAt = x => ridgeTop(ridge, size, seed, x)
  for (let x = rng() * ridge.gap; ridge.gap > 0 && x < size.w; x += ridge.gap * (1 - PIECE_GAP_JITTER / 2 + rng() * PIECE_GAP_JITTER)) {
    const name = ridge.pieces[Math.floor(rng() * ridge.pieces.length)]
    const h = ridge.hMin + rng() * ridge.hRange
    Atlas.drawPiece(ctx, name, x, topAt(x) + h * PIECE_SINK, h, { flip: rng() < 0.5, shade: ridge.color, shadeAmount: ridge.shade })
  }
  ctx.fillStyle = ridge.color
  ctx.beginPath()
  ctx.moveTo(0, size.h)
  for (let x = 0; x <= size.w + RIDGE_STEP; x += RIDGE_STEP) ctx.lineTo(x, topAt(x))
  ctx.lineTo(size.w + RIDGE_STEP, size.h)
  ctx.closePath()
  ctx.fill()
  strokeRidge(ctx, size, topAt, COLORS.midMoss, MOSS_W, MOSS_ALPHA)
  strokeRidge(ctx, size, topAt, ridge.rim, RIM_W, RIM_ALPHA)
}
function ridgeTop(ridge, size, seed, x) {
  return ridge.base * size.h + Math.sin(x * RIDGE_WAVE + seed) * ridge.amp + Math.sin(x * RIDGE_NOISE + seed * 2) * ridge.amp * RIDGE_NOISE_SHARE
}
function strokeRidge(ctx, size, topAt, color, width, alpha) {
  ctx.globalAlpha = alpha
  ctx.strokeStyle = color
  ctx.lineWidth = width
  ctx.beginPath()
  for (let x = 0; x <= size.w + RIDGE_STEP; x += RIDGE_STEP) ctx.lineTo(x, topAt(x))
  ctx.stroke()
  ctx.globalAlpha = 1
}
//
// One fall: a soft pale band with a brighter core and foam at its foot.
//
function paintFall(ctx, layer, fall, view) {
  const size = layerSize(layer, view)
  const x = fall.u * size.w
  const { y1, y2 } = fallSpan(layer, fall, view)
  ctx.globalAlpha = FALL_BODY_ALPHA[layer.id]
  ctx.fillStyle = COLORS.waterfall
  ctx.fillRect(x - fall.w / 2, y1, fall.w, y2 - y1)
  ctx.fillStyle = COLORS.waterfallLight
  ctx.fillRect(x - fall.w / 6, y1, fall.w / 3, y2 - y1)
  ctx.globalAlpha = FOAM_ALPHA
  ctx.fillStyle = COLORS.foam
  ctx.beginPath()
  ctx.ellipse(x, y2 - FALL_FOOT_PAD - FOAM_H / 2, fall.w * FOAM_W, FOAM_H / 2, 0, 0, TAU)
  ctx.fill()
  ctx.globalAlpha = 1
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
