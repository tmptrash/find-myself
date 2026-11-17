import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Earth from './cave-earth.js'
import * as Layout from './cave-layout.js'
//
// The back of the cave room: one parallax layer, the far wall — the soil
// block (ground_block.png) studded with the stones of ground_stones.png,
// each laid in it as in the platforms, all pulled deep into the dark. It
// is softened by
// painting it small and scaling it up. The layer moves only with the
// camera — its share (its speed) of the camera's travel — so where the
// world in front stands still, so does the back. It is painted in its own
// space — the window plus its share of the travel — and baked once per
// live k, in columns under 2048 px.
//
const COLORS = CAVE_CFG.backdrop
const SPRITE_PREFIX = 'cave0-backdrop-v11-'
const TILE_MAX = 2048
const GRAIN_SEED = 9100
//
// The layers back to front: speed (share of the travel), seed, how much
// smaller it is painted.
//
const LAYERS = [
  { id: 'wall', speed: 0.25, seed: 9101, blurDown: 3 }
]
//
// The far wall: ground stones of mixed sizes scattered at random over the
// soil (see Earth.scatter) and laid into it (Earth.embedStone), then all
// pulled toward the shade colour.
//
const WALL_SIZES = [
  { hMin: 30, hRange: 30, density: 0.6 },
  { hMin: 14, hRange: 12, density: 2.4 },
  { hMin: 6, hRange: 6, density: 6 }
]
const WALL_CLOSEST = 1
const WALL_SHADE = 0.7
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
  paintWall(sctx, rng, size)
  ctx.save()
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(scratch, 0, 0, size.w, size.h)
  ctx.restore()
}
//
// The far wall: the soil block, the ground stones laid into it, then all
// pulled toward the shade colour.
//
function paintWall(ctx, rng, size) {
  ctx.fillStyle = Earth.soilPattern(ctx)
  ctx.fillRect(0, 0, size.w, size.h)
  Earth.scatter(rng, { x1: 0, y1: 0, w: size.w, h: size.h }, Atlas.GROUND_ROCKS, WALL_SIZES, WALL_CLOSEST, () => true)
    .forEach(stone => Earth.embedStone(ctx, rng, stone))
  ctx.save()
  ctx.globalAlpha = WALL_SHADE
  ctx.fillStyle = COLORS.wallShade
  ctx.fillRect(0, 0, size.w, size.h)
  ctx.restore()
}
