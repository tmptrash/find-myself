import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Earth from './cave-earth.js'
import * as Layout from './cave-layout.js'
//
// The back of the cave room in three parallax layers: the far wall — the
// forest's ground stones pulled deep into the dark, set in dark brown
// soil — and two layers of distant rock platforms floating in front of
// it, smaller, dimmer and softer the farther they are. Softness comes
// from painting a layer small and scaling it up (the wall the softest).
// The layers move only with the camera — each its share (its speed) of
// the camera's travel — so where the world in front stands still, so does
// the back. Each layer is painted in its own space — the window plus its
// share of the travel — and baked once per live k, in columns under
// 2048 px.
//
const COLORS = CAVE_CFG.backdrop
const SPRITE_PREFIX = 'cave0-backdrop-v6-'
const TILE_MAX = 2048
const GRAIN_SEED = 9100
//
// Layers back to front: speed (share of the travel), seed and what they
// hold.
//
const KIND = { WALL: 'wall', ISLES: 'isles' }
const LAYERS = [
  { id: 'wall', kind: KIND.WALL, speed: 0.25, seed: 9101, blurDown: 3 },
  { id: 'far', kind: KIND.ISLES, speed: 0.45, seed: 9102, scaleMin: 0.32, scaleRange: 0.18, shade: COLORS.farIsles, shadeAmount: 0.8, blurDown: 1.5, gap: 240, rows: [0.22, 0.42, 0.62, 0.82] },
  { id: 'mid', kind: KIND.ISLES, speed: 0.68, seed: 9103, scaleMin: 0.5, scaleRange: 0.25, shade: COLORS.midIsles, shadeAmount: 0.72, blurDown: 1, gap: 380, rows: [0.35, 0.6, 0.85] }
]
//
// The far wall: stones of mixed sizes scattered at random (see
// Earth.scatter), pulled toward the shade colour, with dark brown soil
// showing between them.
//
const WALL_SIZES = [
  { sMin: 0.4, sRange: 0.35, tries: 2 },
  { sMin: 0.22, sRange: 0.16, tries: 3 },
  { sMin: 0.1, sRange: 0.1, tries: 4 },
  { sMin: 0.05, sRange: 0.05, tries: 5 }
]
const WALL_CLOSEST = 0.7
const WALL_SHADE = 0.72
//
// Distant platforms: row jitter (share of the layer height), spacing
// jitter, the kinds of pieces.
//
const ISLE_ROW_JITTER = 0.08
const ISLE_GAP_JITTER = 0.6
const ISLE_PIECES = [...Atlas.FLATS, ...Atlas.BLOCKS, ...Atlas.RISES, ...Atlas.FALLS]
const bakedFor = new WeakSet()

/**
 * Bakes the layers on this k (once).
 * @param {Object} k - Kaplay instance
 * @param {{w: number, h: number}} view - Visible world window size
 * @returns {Object} Backdrop instance
 */
export function create(k, view) {
  return { k, tiles: bakeLayers(k, view) }
}

/**
 * Draws the baked layers for the window whose top-left world point is
 * left / top.
 * @param {Object} inst - Backdrop instance
 * @param {{left: number, top: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  const k = inst.k
  inst.tiles.forEach(tile => k.drawSprite({
    sprite: tile.name,
    pos: k.vec2(Math.round(view.left * (1 - tile.speed)) + tile.x, Math.round(view.top * (1 - tile.speed)))
  }))
}

/**
 * Paints the layers into a 2D canvas as seen by a window over rect (the
 * forest's peek, the menu picture).
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
// Layer size: the window plus its share of the camera's travel.
//
function layerSize(layer, view) {
  return {
    w: Math.ceil(view.w + Math.max(0, Layout.WORLD_W - view.w) * layer.speed),
    h: Math.ceil(view.h + Math.max(0, Layout.WORLD_H - view.h) * layer.speed)
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
//
// A layer painted small (blurDown times) on a scratch canvas, then scaled
// up into place, which softens it.
//
function paintLayer(ctx, layer, view) {
  const size = layerSize(layer, view)
  const rng = createSeededRandom(layer.seed)
  const down = layer.blurDown
  const scratch = document.createElement('canvas')
  scratch.width = Math.ceil(size.w / down)
  scratch.height = Math.ceil(size.h / down)
  const sctx = scratch.getContext('2d')
  sctx.scale(1 / down, 1 / down)
  layer.kind === KIND.WALL ? paintWall(sctx, rng, size) : paintIsles(sctx, rng, size, layer)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(scratch, 0, 0, size.w, size.h)
  ctx.restore()
}
//
// The far wall: the forest's ground stones scattered, pulled toward the
// shade colour, then the soil filled in behind them.
//
function paintWall(ctx, rng, size) {
  Earth.scatter(rng, { x1: 0, y1: 0, w: size.w, h: size.h }, Atlas.GROUND_ROCKS, WALL_SIZES, WALL_CLOSEST, () => true)
    .forEach(stone => Earth.drawStone(ctx, stone))
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = WALL_SHADE
  ctx.fillStyle = COLORS.wallShade
  ctx.fillRect(0, 0, size.w, size.h)
  ctx.globalCompositeOperation = 'destination-over'
  ctx.globalAlpha = 1
  ctx.fillStyle = COLORS.wallSoil
  ctx.fillRect(0, 0, size.w, size.h)
  ctx.restore()
}
//
// Distant platforms along the layer's rows, dimmed toward its colour.
//
function paintIsles(ctx, rng, size, layer) {
  layer.rows.forEach(row => {
    for (let x = rng() * layer.gap; x < size.w; x += layer.gap * (1 + (rng() - 0.5) * ISLE_GAP_JITTER)) {
      const name = ISLE_PIECES[Math.floor(rng() * ISLE_PIECES.length)]
      const scale = layer.scaleMin + rng() * layer.scaleRange
      const y = size.h * (row + (rng() - 0.5) * ISLE_ROW_JITTER)
      Atlas.drawScaled(ctx, name, x, y, scale, rng() < 0.5)
    }
  })
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = layer.shadeAmount
  ctx.fillStyle = layer.shade
  ctx.fillRect(0, 0, size.w, size.h)
  ctx.restore()
}
