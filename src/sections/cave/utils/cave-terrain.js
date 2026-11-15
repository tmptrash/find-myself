import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import * as Layout from './cave-layout.js'
import * as Scene from './cave-scene.js'
//
// The cave's solid world (cave-scene.js) baked into tiles once per live k
// — each tile well under the 2048 px texture limit of mobile GPUs — with
// the film grain, and drawn as far as the window reaches.
//
const SPRITE_PREFIX = 'cave0-terrain-v1-'
const TILE_W = 1200
const TILE_H = 750
const GRAIN_SEED = 9200
const bakedFor = new WeakSet()

/**
 * Bakes the terrain tiles on this k (once).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake inst (its bed line shapes the basin)
 * @returns {Object} Terrain instance
 */
export function create(cfg) {
  const { k, lake } = cfg
  const tiles = []
  for (let y = 0; y < Layout.WORLD_H; y += TILE_H) {
    for (let x = 0; x < Layout.WORLD_W; x += TILE_W) {
      tiles.push({ name: `${SPRITE_PREFIX}${x}-${y}`, x, y, w: Math.min(TILE_W, Layout.WORLD_W - x), h: Math.min(TILE_H, Layout.WORLD_H - y) })
    }
  }
  bakedFor.has(k) || bakeTiles(k, tiles, lake)
  bakedFor.add(k)
  return { k, tiles }
}

/**
 * Draws the tiles the window overlaps.
 * @param {Object} inst - Terrain instance
 * @param {{left: number, top: number, right: number, bottom: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  inst.tiles.forEach(tile => drawTile(inst.k, tile, view))
}
function drawTile(k, t, view) {
  t.x < view.right && t.x + t.w > view.left && t.y < view.bottom && t.y + t.h > view.top &&
    k.drawSprite({ sprite: t.name, pos: k.vec2(t.x, t.y) })
}
function bakeTiles(k, tiles, lake) {
  tiles.forEach((t, i) => {
    const canvas = document.createElement('canvas')
    canvas.width = t.w
    canvas.height = t.h
    const ctx = canvas.getContext('2d')
    ctx.translate(-t.x, -t.y)
    Scene.paintTerrain(ctx, { x1: t.x, y1: t.y, x2: t.x + t.w, y2: t.y + t.h }, lake)
    applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + i)
    k.loadSprite(t.name, canvas)
  })
}
