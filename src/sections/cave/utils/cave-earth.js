import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from './cave-atlas.js'
//
// Canvas2D painters for the cave's earth: under every walkable top
// (cave-platform.js), in the walls, the ceiling and under the lake, the
// platforms sheet's loose stones packed in brown soil (the forest's deep
// earth tones) that shows in the small gaps between them like mortar.
// Stones of four size classes — every stone at its own size on the sheet
// or smaller, never enlarged — are scattered at random, big ones first,
// then medium and small ones into the gaps left, each turned a little and
// maybe mirrored, so no two patches repeat; they break the outline, so the silhouette is lumpy, not
// cut. Under a walkable top a band of stones bites up into the platform's
// underside, so the joint is a broken line, not a seam. A mass is painted
// once per page into its own layer (keyed by element) and reused by every
// tile, the menu and the forest's glimpse.
//
const COLORS = CAVE_CFG.earth
//
// Size classes, big to small: the share of a stone's own size it is drawn
// at (at most 1) and tries per stone footprint of area (the packing fills
// what is left).
//
const SIZES = [
  { sMin: 0.7, sRange: 0.3, tries: 2.5 },
  { sMin: 0.42, sRange: 0.26, tries: 4 },
  { sMin: 0.22, sRange: 0.18, tries: 6 },
  { sMin: 0.1, sRange: 0.1, tries: 8 }
]
//
// A stone's footprint radius (share of its smaller side), how close two
// may come (share of their summed radii — well under 1 they touch and
// overlap, so only slivers of soil show), how far it turns either way.
//
const RADIUS_SHARE = 0.46
const CLOSEST_SHARE = 0.66
const TURN = 0.55
const GRID_CELL = 48
const GRID_REACH = 2
const LAYER_PAD = 40
//
// Soil: mottled patches over its base.
//
const MOTTLE_AREA = 700
const MOTTLE_R_MIN = 4
const MOTTLE_R_RANGE = 14
const MOTTLE_ALPHA = 0.5
const MOTTLE_DARK_CHANCE = 0.5
//
// Depth shade over the whole mass, from its lit side to the far side.
//
const SHADE_FROM = 0.1
const SHADE_ALPHA = 0.5
//
// The bite under a walkable top: stones whose centres lie this far under
// it (none reaching higher than BITE_CLEAR under the top), packed denser
// and allowed to overlap, kept off the free ends.
//
const BITE_FROM = 46
const BITE_RANGE = 34
const BITE_CLEAR = 22
const BITE_SIZES = [
  { sMin: 0.3, sRange: 0.25, tries: 5 },
  { sMin: 0.16, sRange: 0.14, tries: 6 },
  { sMin: 0.08, sRange: 0.08, tries: 8 }
]
const BITE_CLOSEST_SHARE = 0.55
const BITE_END_INSET = 16
const OUTLINE_STEP = 8
const TAU = Math.PI * 2
const layers = new Map()

/**
 * Paints a mass of stones packed in soil over a closed outline (its layer
 * is built once per page under `opts.key` and reused).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {Array<{x: number, y: number}>} poly - Outline
 * @param {Object} opts
 * @param {string} opts.key - Cache key of the element
 * @param {number} opts.seed - Element seed
 * @param {function(number): number} opts.topAt - Highest Y the mass may reach at X
 * @param {boolean} [opts.litFromBelow=false] - Shade gathers at the top (the ceiling)
 */
export function paintMass(ctx, poly, opts) {
  const layer = layers.get(opts.key) ?? buildLayer(poly, opts)
  layers.set(opts.key, layer)
  ctx.drawImage(layer.canvas, layer.x, layer.y)
}

/**
 * Stones biting up into a walkable top's underside from x1 to x2 (paint
 * after the platform pieces, so they cover its lower edge).
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {number} x1 - Left end
 * @param {number} x2 - Right end
 * @param {function(number): number} topAt - Walkable top Y at X
 * @param {number} seed - Element seed
 */
export function paintBite(ctx, x1, x2, topAt, seed) {
  const rng = createSeededRandom(seed + 11)
  const a = x1 + BITE_END_INSET
  const b = x2 - BITE_END_INSET
  const box = { x1: a, y1: 0, w: b - a, h: BITE_RANGE }
  const inside = (x, y, r) => y - r >= topAt(x) + BITE_CLEAR
  scatter(rng, box, Atlas.ROCKS, BITE_SIZES, BITE_CLOSEST_SHARE, inside, s => (s.y += topAt(s.x) + BITE_FROM - BITE_RANGE / 2))
    .forEach(stone => drawStone(ctx, stone))
}

/**
 * Stones of mixed sizes scattered at random over a box (big ones first,
 * then smaller ones into the gaps), each at its own size or smaller,
 * turned and maybe mirrored; sorted top to bottom.
 * @param {function(): number} rng - Seeded random
 * @param {{x1: number, y1: number, w: number, h: number}} box - Area
 * @param {Array<string>} names - Stone pieces to pick from
 * @param {Array<{sMin: number, sRange: number, tries: number}>} sizes - Size classes (shares of a stone's own size), big to small
 * @param {number} closest - How close two may come (share of their summed radii)
 * @param {function(number, number, number): boolean} inside - Whether a stone at (x, y) with radius r may stay
 * @param {function(Object): void} [place] - Moves a stone into place before the checks
 * @returns {Array<{name: string, x: number, y: number, h: number, flip: boolean, angle: number}>}
 */
export function scatter(rng, box, names, sizes, closest, inside, place) {
  const grid = new Map()
  const stones = []
  const meanH = names.reduce((sum, name) => sum + Atlas.naturalHeight(name), 0) / names.length
  sizes.forEach(size => {
    const avgH = meanH * (size.sMin + size.sRange / 2)
    const tries = Math.round(box.w * box.h / (avgH * avgH) * size.tries)
    for (let i = 0; i < tries; i++) {
      const name = names[Math.floor(rng() * names.length)]
      const h = Atlas.naturalHeight(name) * Math.min(1, size.sMin + rng() * size.sRange)
      const stone = { name, h, x: box.x1 + rng() * box.w, y: box.y1 + rng() * box.h, flip: rng() < 0.5, angle: (rng() * 2 - 1) * TURN }
      stone.r = Math.min(h, Atlas.widthAt(name, h)) * RADIUS_SHARE
      place?.(stone)
      if (!inside(stone.x, stone.y, stone.r) || crowds(grid, stone, closest)) continue
      addToGrid(grid, stone)
      stones.push(stone)
    }
  })
  return stones.sort((p, q) => p.y - q.y)
}

/**
 * Draws a scattered stone (centred on its point).
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {{name: string, x: number, y: number, h: number, flip: boolean, angle: number}} stone
 */
export function drawStone(ctx, stone) {
  Atlas.drawPiece(ctx, stone.name, stone.x, stone.y + stone.h / 2, stone.h, { flip: stone.flip, angle: stone.angle })
}

/**
 * Bounding box of a point list.
 * @param {Array<{x: number, y: number}>} poly
 * @returns {{x1: number, y1: number, x2: number, y2: number, w: number, h: number}}
 */
export function bounds(poly) {
  let x1 = Infinity
  let y1 = Infinity
  let x2 = -Infinity
  let y2 = -Infinity
  poly.forEach(p => {
    x1 = Math.min(x1, p.x)
    y1 = Math.min(y1, p.y)
    x2 = Math.max(x2, p.x)
    y2 = Math.max(y2, p.y)
  })
  return { x1, y1, x2, y2, w: x2 - x1, h: y2 - y1 }
}
//
// The mass on its own canvas, clipped under its top line: soil, the
// scattered stones, then depth shade.
//
function buildLayer(poly, opts) {
  const rng = createSeededRandom(opts.seed)
  const box = bounds(poly)
  const x = Math.floor(box.x1 - LAYER_PAD)
  const y = Math.floor(box.y1 - LAYER_PAD)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(box.w + LAYER_PAD * 2)
  canvas.height = Math.ceil(box.h + LAYER_PAD * 2)
  const ctx = canvas.getContext('2d')
  ctx.translate(-x, -y)
  ctx.save()
  ctx.beginPath()
  for (let cx = x; cx <= x + canvas.width + OUTLINE_STEP; cx += OUTLINE_STEP) ctx.lineTo(cx, opts.topAt(cx))
  ctx.lineTo(x + canvas.width + OUTLINE_STEP, y + canvas.height)
  ctx.lineTo(x, y + canvas.height)
  ctx.closePath()
  ctx.clip()
  paintSoil(ctx, rng, poly, box)
  scatter(rng, box, Atlas.ROCKS, SIZES, CLOSEST_SHARE, (sx, sy) => insidePoly(poly, sx, sy)).forEach(stone => drawStone(ctx, stone))
  ctx.restore()
  paintShade(ctx, x, y, canvas.width, canvas.height, opts.litFromBelow)
  return { canvas, x, y }
}
//
// Brown soil over the outline, mottled.
//
function paintSoil(ctx, rng, poly, box) {
  ctx.save()
  tracePoly(ctx, poly)
  ctx.clip()
  ctx.fillStyle = COLORS.soil[1]
  ctx.fillRect(box.x1, box.y1, box.w, box.h)
  ctx.globalAlpha = MOTTLE_ALPHA
  const count = Math.floor(box.w * box.h / MOTTLE_AREA)
  for (let i = 0; i < count; i++) {
    ctx.fillStyle = COLORS.soil[rng() < MOTTLE_DARK_CHANCE ? 0 : 2]
    ctx.beginPath()
    ctx.arc(box.x1 + rng() * box.w, box.y1 + rng() * box.h, MOTTLE_R_MIN + rng() * MOTTLE_R_RANGE, 0, TAU)
    ctx.fill()
  }
  ctx.restore()
}
function crowds(grid, stone, closest) {
  const cx = Math.floor(stone.x / GRID_CELL)
  const cy = Math.floor(stone.y / GRID_CELL)
  for (let gx = cx - GRID_REACH; gx <= cx + GRID_REACH; gx++) {
    for (let gy = cy - GRID_REACH; gy <= cy + GRID_REACH; gy++) {
      const cell = grid.get(`${gx},${gy}`)
      if (cell && cell.some(o => Math.hypot(o.x - stone.x, o.y - stone.y) < (o.r + stone.r) * closest)) return true
    }
  }
  return false
}
function addToGrid(grid, stone) {
  const key = `${Math.floor(stone.x / GRID_CELL)},${Math.floor(stone.y / GRID_CELL)}`
  grid.has(key) || grid.set(key, [])
  grid.get(key).push(stone)
}
//
// Shade over everything painted in the layer, deepening away from the
// lit side.
//
function paintShade(ctx, x, y, w, h, fromBelow) {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(fromBelow ? 1 - SHADE_FROM : SHADE_FROM, `${COLORS.shade}00`)
  g.addColorStop(fromBelow ? 0 : 1, COLORS.shade)
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = SHADE_ALPHA
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.restore()
}
function tracePoly(ctx, poly) {
  ctx.beginPath()
  ctx.moveTo(poly[0].x, poly[0].y)
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y)
  ctx.closePath()
}
//
// Even-odd point test against an outline.
//
function insidePoly(poly, x, y) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const a = poly[i]
    const b = poly[j]
    a.y > y !== b.y > y && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x && (inside = !inside)
  }
  return inside
}
