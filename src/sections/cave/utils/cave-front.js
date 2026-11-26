import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Earth from './cave-earth.js'
import * as Platform from './cave-platform.js'
import * as Plants from './cave-plants.js'
//
// Stones in front of the hero: the big stone of every cluster on the
// platforms' tops (cave-platform.js; the small ones round it are part of
// the platform, walked over). Each lies on the surface on its joints of
// soil, drawn over the hero — he walks behind it, his feet hidden for a
// few steps — a little darker than the soil behind, nearer the eye, out of
// the light. With them, as darkened, the small plants that grow in front
// of him (cave-plants.js: most of the greenery kit's). All are baked once per page into one atlas (each in its own
// cell, clipped to it; a plant's cell is its box and PLANT_PAD px round
// it), loaded once per live k.
//
const SPRITE = 'cave0-front-v6'
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
const ATLAS_W = 2048
const PLANT_PAD = 2
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

/**
 * The front stones (with their joints) as layers, each its cell of the
 * atlas at its world top-left: solid things on the platforms for what
 * climbs (cave-haggy-solid.js). Made when called.
 * @returns {Array<{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number}>}
 */
export function stoneLayers() {
  atlas ??= bakeAtlas()
  return atlas.cells.filter(cell => cell.stone).map(cellLayer)
}
function drawCell(inst, cell, view) {
  if (cell.x >= view.right || cell.x + cell.w <= view.left || cell.y >= view.bottom || cell.y + cell.h <= view.top) return
  inst.k.drawSprite({ sprite: SPRITE, quad: cell.quad, width: cell.w, height: cell.h, pos: inst.pos.set(cell.x, cell.y) })
}
//
// One cell of the atlas on a canvas of its own, at its world place.
//
function cellLayer(cell) {
  const canvas = document.createElement('canvas')
  canvas.width = cell.w
  canvas.height = cell.h
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(atlas.canvas, cell.ax, cell.ay, cell.w, cell.h, 0, 0, cell.w, cell.h)
  return { canvas, ctx, x: cell.x, y: cell.y }
}
//
// Every front stone in its own cell of one canvas (world px), shaded
// toward the room's dark and grained; each cell's world rect and quad.
//
function bakeAtlas() {
  const shelves = { ax: CELL_GAP, ay: CELL_GAP, shelf: 0 }
  const cells = Platform.frontStones().map(stone => {
    const w = Math.ceil(Atlas.widthAt(stone.name, stone.h) * CELL_W_SHARE)
    const up = Math.ceil(stone.h * CELL_UP)
    return { stone, ...shelve(shelves, w, up + CELL_DOWN), x: Math.round(stone.x - w / 2), y: Math.round(stone.foot - up) }
  })
  const plantCells = Plants.frontPlants().map(plant => {
    const x = Math.floor(plant.box.x1) - PLANT_PAD
    const y = Math.floor(plant.box.y1) - PLANT_PAD
    return { plant, ...shelve(shelves, Math.ceil(plant.box.x2) + PLANT_PAD - x, Math.ceil(plant.box.y2) + PLANT_PAD - y), x, y }
  })
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_W
  canvas.height = shelves.ay + shelves.shelf + CELL_GAP
  const ctx = canvas.getContext('2d')
  cells.forEach((cell, i) => paintCell(ctx, cell, i))
  plantCells.forEach(cell => paintPlantCell(ctx, cell))
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = COLOR.shadeAmount
  ctx.fillStyle = COLOR.shade
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  cells.push(...plantCells)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  cells.forEach(cell => (cell.quad = { x: cell.ax / canvas.width, y: cell.ay / canvas.height, w: cell.w / canvas.width, h: cell.h / canvas.height }))
  return { canvas, cells }
}
//
// The next free cell of w × h on the atlas's shelves (a new shelf once the
// row is full); its place on the atlas.
//
function shelve(shelves, w, h) {
  if (shelves.ax + w + CELL_GAP > ATLAS_W) {
    shelves.ax = CELL_GAP
    shelves.ay += shelves.shelf + CELL_GAP
    shelves.shelf = 0
  }
  const cell = { ax: shelves.ax, ay: shelves.ay, w, h }
  shelves.ax += w + CELL_GAP
  shelves.shelf = Math.max(shelves.shelf, h)
  return cell
}
//
// A plant drawn at its world place shifted into its cell (clipped to it);
// darkened with the stones after, nearer the eye and out of the light.
//
function paintPlantCell(ctx, cell) {
  ctx.save()
  ctx.beginPath()
  ctx.rect(cell.ax, cell.ay, cell.w, cell.h)
  ctx.clip()
  ctx.translate(cell.ax - cell.x, cell.ay - cell.y)
  Plants.paintPlant(ctx, cell.plant)
  ctx.restore()
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
  const stone = cell.stone
  Earth.restStone(ctx, createSeededRandom(GRAIN_SEED + i), stone, stone.surface, x => Platform.surfaceAt(stone.p, x))
  ctx.restore()
}
