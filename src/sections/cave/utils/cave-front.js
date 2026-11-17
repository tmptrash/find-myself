import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
import * as Layout from './cave-layout.js'
import * as Platform from './cave-platform.js'
//
// Stones in front of the hero: small heaps lying along the near edge
// of a walkable top, drawn over him (he walks behind them, his feet
// hidden for a step), a little darker than the soil behind — nearer the
// eye, out of the light. Kept clear of the creatures, the lantern and the
// exit. Each heap is baked once per live k into its own sprite.
//
const SPRITE_PREFIX = 'cave0-front-v4-'
const GRAIN_SEED = 9600
const COLOR = CAVE_CFG.front
//
// Heaps: platform, X, seed.
//
const HEAPS = [
  { on: 'upper', x: 90, seed: 1 },
  { on: 'flowerLedge', x: 1100, seed: 2 },
  { on: 'flowerLedge', x: 1400, seed: 3 },
  { on: 'eyeLedge', x: 1760, seed: 4 },
  { on: 'hallFloor', x: 160, seed: 7 },
  { on: 'hallFloor', x: 1540, seed: 8 },
  { on: 'passage', x: 380, seed: 9 },
  { on: 'passage', x: 1150, seed: 10 },
  { on: 'passage', x: 1700, seed: 11 }
]
//
// A heap: its stones (count, width in world px — never bigger than on
// the sheet — each next one smaller, spread across, tilt), how far the
// biggest rises over the walking line, how far the rest sit lower.
//
const STONES_MIN = 2
const STONES_RANGE = 2
const WIDTH_MIN = 80
const WIDTH_RANGE = 40
const SHRINK = 0.75
const SPREAD = 70
const TILT = 0.2
const RISE_MIN = 8
const RISE_RANGE = 8
const DROP = 10
//
// Canvas round a heap: the walking line under its middle sits ANCHOR_Y px
// down from its top.
//
const CANVAS_W = 300
const CANVAS_H = 140
const ANCHOR_Y = 50
const bakedFor = new WeakSet()

/**
 * Bakes the heaps on this k (once).
 * @param {Object} k - Kaplay instance
 * @returns {Object} Front stones instance
 */
export function create(k) {
  const items = HEAPS.map((heap, i) => {
    const p = Layout.PLATFORMS.find(pl => pl.id === heap.on)
    return { name: `${SPRITE_PREFIX}${i}`, heap, p, x: heap.x - CANVAS_W / 2, y: Platform.surfaceAt(p, heap.x) - ANCHOR_Y }
  })
  bakedFor.has(k) || items.forEach((item, i) => bakeHeap(k, item, i))
  bakedFor.add(k)
  return { k, items }
}

/**
 * Draws the heaps the window overlaps (over the hero).
 * @param {Object} inst - Front stones instance
 * @param {{left: number, top: number, right: number, bottom: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  inst.items.forEach(item => drawHeap(inst.k, item, view))
}
function drawHeap(k, item, view) {
  item.x < view.right && item.x + CANVAS_W > view.left && item.y < view.bottom && item.y + CANVAS_H > view.top &&
    k.drawSprite({ sprite: item.name, pos: k.vec2(item.x, item.y) })
}
//
// One heap: the biggest stone rising over the line in the middle, smaller
// ones either side a little lower — each on the platform's surface under
// it — then the shade and the grain.
//
function bakeHeap(k, item, i) {
  const rng = createSeededRandom(GRAIN_SEED + item.heap.seed)
  const canvas = document.createElement('canvas')
  canvas.width = CANVAS_W
  canvas.height = CANVAS_H
  const ctx = canvas.getContext('2d')
  const count = STONES_MIN + Math.floor(rng() * (STONES_RANGE + 1))
  const stones = Array.from({ length: count }, (_, n) => {
    const width = (WIDTH_MIN + rng() * WIDTH_RANGE) * Math.pow(SHRINK, n)
    const side = n === 0 ? 0 : (n % 2 ? -1 : 1)
    const x = CANVAS_W / 2 + side * SPREAD * (0.5 + rng() * 0.5)
    const under = Platform.surfaceAt(item.p, item.x + x) - item.y - ANCHOR_Y
    return { width, x, under, rise: n === 0 ? RISE_MIN + rng() * RISE_RANGE : RISE_MIN - DROP * rng() }
  })
  stones.reverse().forEach(s => drawStone(ctx, rng, s))
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = COLOR.shadeAmount
  ctx.fillStyle = COLOR.shade
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + i)
  k.loadSprite(item.name, canvas)
}
//
// A stone with the top of its middle `rise` px over the surface under it
// (`under` px below the heap's anchor).
//
function drawStone(ctx, rng, s) {
  const name = Atlas.GROUND_ROCKS[Math.floor(rng() * Atlas.GROUND_ROCKS.length)]
  const src = Atlas.piece(name)
  const top = Atlas.profile(name).top[Math.floor(src.width / 2)]
  Atlas.drawSlice(ctx, name, {
    u: 0,
    w: src.width,
    flip: rng() < 0.5,
    scale: Math.min(1, s.width / src.width),
    angle: (rng() * 2 - 1) * TILT,
    px: src.width / 2,
    py: Number.isNaN(top) ? 0 : top,
    x: s.x,
    y: ANCHOR_Y + s.under - s.rise
  })
}
