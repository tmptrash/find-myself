import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Earth from './cave-earth.js'
import * as Platform from './cave-platform.js'
//
// Stones in front of the hero: the big stone of every cluster on the
// platforms' tops (cave-platform.js; the small ones round it are part of
// the platform, walked over). Each lies on the surface on its joints of
// soil, drawn over the hero — he walks behind it, his feet hidden for a
// few steps — a little darker than the soil behind, nearer the eye, out of
// the light. All are baked once per page into one atlas (each in its own
// cell, clipped to it), loaded once per live k.
//
const SPRITE = 'cave0-front-v5'
const GRAIN_SEED = 9600
const COLOR = CAVE_CFG.front
//
// A stone's cell round its foot (world px): its width is the stone's
// times CELL_W_SHARE (its joints spread past it), its top CELL_UP of the
// stone's height over the foot, its bottom CELL_DOWN px under it; cells
// lie CELL_GAP px apart on shelves ATLAS_W px wide.
//
const CELL_W_SHARE = 2.4
const CELL_UP = 1.3
const CELL_DOWN = 10
const CELL_GAP = 2
const ATLAS_W = 1024
let atlas = null
const loadedFor = new WeakSet()

/**
 * Bakes the front stones (once per page) and loads them on this k.
 * @param {Object} k - Kaplay instance
 * @returns {Object} Front stones instance
 */
export function create(k) {
  atlas ??= bakeAtlas()
  loadedFor.has(k) || k.loadSprite(SPRITE, atlas.canvas)
  loadedFor.add(k)
  return { k, cells: atlas.cells, pos: k.vec2(0, 0) }
}

/**
 * Draws the stones the window overlaps (over the hero).
 * @param {Object} inst - Front stones instance
 * @param {{left: number, top: number, right: number, bottom: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  inst.cells.forEach(cell => drawCell(inst, cell, view))
}
function drawCell(inst, cell, view) {
  if (cell.x >= view.right || cell.x + cell.w <= view.left || cell.y >= view.bottom || cell.y + cell.h <= view.top) return
  inst.k.drawSprite({ sprite: SPRITE, quad: cell.quad, width: cell.w, height: cell.h, pos: inst.pos.set(cell.x, cell.y) })
}
//
// Every front stone in its own cell of one canvas (world px), shaded
// toward the room's dark and grained; each cell's world rect and quad.
//
function bakeAtlas() {
  const stones = Platform.frontStones()
  const cells = []
  let ax = CELL_GAP
  let ay = CELL_GAP
  let shelf = 0
  stones.forEach(stone => {
    const w = Math.ceil(Atlas.widthAt(stone.name, stone.h) * CELL_W_SHARE)
    const up = Math.ceil(stone.h * CELL_UP)
    const h = up + CELL_DOWN
    if (ax + w + CELL_GAP > ATLAS_W) {
      ax = CELL_GAP
      ay += shelf + CELL_GAP
      shelf = 0
    }
    cells.push({ stone, ax, ay, w, h, x: Math.round(stone.x - w / 2), y: Math.round(stone.foot - up) })
    ax += w + CELL_GAP
    shelf = Math.max(shelf, h)
  })
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_W
  canvas.height = ay + shelf + CELL_GAP
  const ctx = canvas.getContext('2d')
  cells.forEach((cell, i) => paintCell(ctx, cell, i))
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = COLOR.shadeAmount
  ctx.fillStyle = COLOR.shade
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  cells.forEach(cell => (cell.quad = { x: cell.ax / canvas.width, y: cell.ay / canvas.height, w: cell.w / canvas.width, h: cell.h / canvas.height }))
  return { canvas, cells }
}
//
// One stone on its joints, drawn at its world place shifted into its cell
// (clipped to it).
//
function paintCell(ctx, cell, i) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(cell.ax, cell.ay, cell.w, cell.h)
  ctx.clip()
  ctx.translate(cell.ax - cell.x, cell.ay - cell.y)
  Earth.restStone(ctx, createSeededRandom(GRAIN_SEED + i), cell.stone, cell.stone.surface)
  ctx.restore()
}
