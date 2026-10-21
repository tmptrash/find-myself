import { drawMossyTuftToCanvas } from '../../../utils/draw-mossy-hill.js'
import { forestFloorPainterColors } from '../components/forest-floor.js'
import { FOREST_PAL } from './forest-palette.js'

//
// Lake-shore dry-stone pile (reference art: right end of the lake). The
// rock silhouette only decides where stones lie — it never clips them, so
// every stone keeps its whole rounded outline. Two layers: a far row of
// smaller, darker stones that backs the whole heap without holes, then a
// near row of bigger, lighter stones with gaps through which the far row
// shows.
// Each layer goes top row first, so lower stones sit in front of upper
// ones. Every stone is a rounded polygon cut into flat facets around an
// off-centre point: light facets up-left, shadow facets down-right, its
// own dark outline and a thin lit top edge. Moss is rare: a speck on a
// few near stones and a couple of small tufts on top.
//
const FAR_LAYER = {
  width: 30,
  aspect: 0.74,
  sizeJitter: 0.25,
  stepX: 0.74,
  stepY: 0.62,
  rowShift: 0.5,
  posJitter: 0.12,
  skip: 0,
  mossy: false
}
const NEAR_LAYER = {
  width: 40,
  aspect: 0.7,
  sizeJitter: 0.3,
  stepX: 1.05,
  stepY: 0.85,
  rowShift: 0.55,
  posJitter: 0.18,
  skip: 0.15,
  mossy: true
}
//
// Stones whose centre misses the silhouette are dropped; stones near the
// bake edge shrink to fit instead of being cut, and tiny leftovers vanish.
//
const STONE_FIT_PAD = 1.5
const STONE_MIN_FIT = 0.55
//
// Stone outline: jittered ellipse vertices, some of them flattened so the
// stone reads as split rock rather than a pebble.
//
const STONE_SIDES_MIN = 6
const STONE_SIDES_RANGE = 3
const STONE_RADIUS_MIN = 0.8
const STONE_RADIUS_RANGE = 0.3
const STONE_FLAT_CHANCE = 0.35
const STONE_FLAT_PULL = 0.86
const STONE_CORNER_ROUND = 0.28
//
// Facets meet at a point up-left of the centre; facet tone by the direction
// its outer edge faces (angles in radians, 0 = right, y down).
//
const FACET_CENTER_DX = -0.16
const FACET_CENTER_DY = -0.22
const FACET_LIGHT_FROM = -2.7
const FACET_LIGHT_TO = -0.55
const FACET_SHADOW_FROM = -0.05
const FACET_SHADOW_TO = 1.9
//
// Stone contour, lit top edge, occasional crack.
//
const STONE_CONTOUR_W = 1.3
const GLINT_W = 1
const GLINT_ALPHA = 0.8
const GLINT_INSET = 1.2
const CRACK_CHANCE = 0.35
const CRACK_W = 1
const CRACK_LEN = 0.5
//
// Rare moss: a flat speck on top of a few stones above the water line.
//
const MOSS_CHANCE = 0.16
const MOSS_RX = 0.32
const MOSS_RY = 0.13
const MOSS_TOP = 0.62
//
// A couple of small tufts along the rock top above the water.
//
const TUFT_STEP_PX = 14
const TUFT_CHANCE = 0.22
const TUFT_R_MIN = 3
const TUFT_R_RANGE = 3
const TUFT_SINK = 0.2

/**
 * Paints the dry-stone pile into a canvas context. Several overlapping rock
 * outlines merge into one placement area, so the pile reads as one heap of
 * whole stones in two depth layers. The caller is responsible for any clip
 * (lake bed) and post passes.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} cfg
 * @param {Array<Array<{ x: number, y: number }>>} cfg.loops - Rock outlines (canvas px)
 * @param {number} cfg.waterY - Canvas Y of the water line (moss stays above it)
 * @param {() => number} cfg.rng - Seeded random in [0, 1)
 * @param {number} cfg.outlineWidth - Outer contour width (px)
 */
export function paintForestShoreRock(ctx, cfg) {
  const pal = FOREST_PAL.forestShoreRock
  const { loops, rng, waterY } = cfg
  const bounds = loopBounds(loops, cfg.outlineWidth)
  ctx.lineJoin = 'round'
  ctx.lineCap = 'round'
  buildStones(loops, bounds, rng, FAR_LAYER).forEach(stone => paintStone(ctx, stone, rng, pal.far, waterY, FAR_LAYER.mossy))
  buildStones(loops, bounds, rng, NEAR_LAYER).forEach(stone => paintStone(ctx, stone, rng, pal.near, waterY, NEAR_LAYER.mossy))
  paintTopTufts(ctx, loops, rng, forestFloorPainterColors().hill, waterY)
}

//
// Bake area: the outlines' box grown by the caller's contour pad.
//
function loopBounds(loops, outlineWidth) {
  const pts = loops.flat()
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const pad = outlineWidth * 2 - STONE_FIT_PAD
  return {
    x1: Math.min(...xs) - pad,
    y1: Math.min(...ys) - pad,
    x2: Math.max(...xs) + pad,
    y2: Math.max(...ys) + pad
  }
}
//
// Rows of jittered stones over the bounds, top row first; a stone is kept
// when its centre lies inside an outline, then shrunk to stay whole.
//
function buildStones(loops, bounds, rng, layer) {
  const baseW = layer.width
  const baseH = baseW * layer.aspect
  const stones = []
  let row = 0
  for (let y = bounds.y1 + baseH * 0.5; y < bounds.y2; y += baseH * layer.stepY) {
    const shift = row % 2 ? baseW * layer.rowShift : 0
    for (let x = bounds.x1 + baseW * 0.5 - shift; x < bounds.x2; x += baseW * layer.stepX) {
      const size = 1 + (rng() * 2 - 1) * layer.sizeJitter
      const stone = fitStone(bounds, {
        cx: x + (rng() * 2 - 1) * baseW * layer.posJitter,
        cy: y + (rng() * 2 - 1) * baseH * layer.posJitter,
        rx: baseW * 0.5 * size,
        ry: baseH * 0.5 * size
      })
      const keep = rng() >= layer.skip
      keep && stone && insideLoops(loops, stone.cx, stone.cy) && stones.push(stone)
    }
    row++
  }
  return stones
}
//
// Shrinks a stone (keeping its proportions) so its widest jittered outline
// and contour stay inside the bake; null when too little would remain.
//
function fitStone(bounds, stone) {
  const reach = STONE_RADIUS_MIN + STONE_RADIUS_RANGE
  const room = Math.min(
    (stone.cx - bounds.x1) / (stone.rx * reach),
    (bounds.x2 - stone.cx) / (stone.rx * reach),
    (stone.cy - bounds.y1) / (stone.ry * reach),
    (bounds.y2 - stone.cy) / (stone.ry * reach)
  )
  const scale = Math.min(1, room)
  if (scale < STONE_MIN_FIT) return null
  stone.rx *= scale
  stone.ry *= scale
  return stone
}
//
// Even-odd point test against every outline (raw vertices).
//
function insideLoops(loops, x, y) {
  return loops.some(pts => {
    let inside = false
    for (let i = 0, j = pts.length - 1; i < pts.length; j = i++) {
      const a = pts[i]
      const b = pts[j]
      const crosses = (a.y > y) !== (b.y > y) && x < (b.x - a.x) * (y - a.y) / (b.y - a.y) + a.x
      crosses && (inside = !inside)
    }
    return inside
  })
}
//
// One stone: rounded faceted body, light and shadow facets, outline, lit
// top edge, maybe a crack and (near layer only) a moss speck.
//
function paintStone(ctx, stone, rng, pal, waterY, mossy) {
  const verts = stoneVerts(stone, rng)
  const fx = stone.cx + stone.rx * FACET_CENTER_DX
  const fy = stone.cy + stone.ry * FACET_CENTER_DY
  ctx.save()
  traceRounded(ctx, verts)
  ctx.fillStyle = pal.faces[Math.floor(rng() * pal.faces.length)]
  ctx.fill()
  ctx.clip()
  paintFacets(ctx, verts, fx, fy, FACET_LIGHT_FROM, FACET_LIGHT_TO, pal.light)
  paintFacets(ctx, verts, fx, fy, FACET_SHADOW_FROM, FACET_SHADOW_TO, pal.shadow)
  paintGlint(ctx, verts, stone, pal.glint)
  rng() < CRACK_CHANCE && paintCrack(ctx, stone, rng, pal.crevice)
  mossy && stone.cy < waterY && rng() < MOSS_CHANCE && paintMoss(ctx, stone, pal)
  ctx.restore()
  traceRounded(ctx, verts)
  ctx.strokeStyle = pal.contour
  ctx.lineWidth = STONE_CONTOUR_W
  ctx.stroke()
}
function stoneVerts(stone, rng) {
  const sides = STONE_SIDES_MIN + Math.floor(rng() * STONE_SIDES_RANGE)
  const rot = rng() * Math.PI * 2
  return Array.from({ length: sides }, (_, i) => {
    const a = rot + (i / sides) * Math.PI * 2
    const r = (STONE_RADIUS_MIN + rng() * STONE_RADIUS_RANGE) * (rng() < STONE_FLAT_CHANCE ? STONE_FLAT_PULL : 1)
    return { x: stone.cx + Math.cos(a) * stone.rx * r, y: stone.cy + Math.sin(a) * stone.ry * r }
  })
}
//
// Polygon with its corners eased off (straight facet edges, soft corners).
//
function traceRounded(ctx, verts) {
  const n = verts.length
  ctx.beginPath()
  verts.forEach((v, i) => {
    const prev = verts[(i + n - 1) % n]
    const next = verts[(i + 1) % n]
    const inX = v.x + (prev.x - v.x) * STONE_CORNER_ROUND
    const inY = v.y + (prev.y - v.y) * STONE_CORNER_ROUND
    i ? ctx.lineTo(inX, inY) : ctx.moveTo(inX, inY)
    ctx.quadraticCurveTo(v.x, v.y, v.x + (next.x - v.x) * STONE_CORNER_ROUND, v.y + (next.y - v.y) * STONE_CORNER_ROUND)
  })
  ctx.closePath()
}
//
// Triangles from the facet point to every outer edge whose middle faces
// into [from, to].
//
function paintFacets(ctx, verts, fx, fy, from, to, color) {
  const n = verts.length
  ctx.fillStyle = color
  ctx.beginPath()
  verts.forEach((v, i) => {
    const next = verts[(i + 1) % n]
    const mid = Math.atan2((v.y + next.y) * 0.5 - fy, (v.x + next.x) * 0.5 - fx)
    if (mid < from || mid > to) return
    ctx.moveTo(fx, fy)
    ctx.lineTo(v.x, v.y)
    ctx.lineTo(next.x, next.y)
    ctx.closePath()
  })
  ctx.fill()
}
//
// Thin lit line just inside the upper-left edges.
//
function paintGlint(ctx, verts, stone, color) {
  const n = verts.length
  ctx.strokeStyle = color
  ctx.lineWidth = GLINT_W
  ctx.globalAlpha = GLINT_ALPHA
  ctx.beginPath()
  verts.forEach((v, i) => {
    const next = verts[(i + 1) % n]
    const mid = Math.atan2((v.y + next.y) * 0.5 - stone.cy, (v.x + next.x) * 0.5 - stone.cx)
    if (mid < FACET_LIGHT_FROM || mid > FACET_LIGHT_TO) return
    ctx.moveTo(v.x + (stone.cx - v.x) / stone.rx * GLINT_INSET, v.y + (stone.cy - v.y) / stone.ry * GLINT_INSET)
    ctx.lineTo(next.x + (stone.cx - next.x) / stone.rx * GLINT_INSET, next.y + (stone.cy - next.y) / stone.ry * GLINT_INSET)
  })
  ctx.stroke()
  ctx.globalAlpha = 1
}
function paintCrack(ctx, stone, rng, color) {
  const a = rng() * Math.PI
  const len = stone.rx * CRACK_LEN
  const x = stone.cx + (rng() * 2 - 1) * stone.rx * 0.3
  const y = stone.cy + (rng() * 2 - 1) * stone.ry * 0.3
  ctx.strokeStyle = color
  ctx.lineWidth = CRACK_W
  ctx.beginPath()
  ctx.moveTo(x - Math.cos(a) * len * 0.5, y - Math.sin(a) * len * 0.5)
  ctx.lineTo(x + Math.cos(a) * len * 0.2, y + Math.sin(a) * len * 0.3)
  ctx.lineTo(x + Math.cos(a) * len * 0.5, y + Math.sin(a) * len * 0.5)
  ctx.stroke()
}
function paintMoss(ctx, stone, pal) {
  const x = stone.cx - stone.rx * 0.1
  const y = stone.cy - stone.ry * MOSS_TOP
  ctx.fillStyle = pal.moss
  ctx.beginPath()
  ctx.ellipse(x, y, stone.rx * MOSS_RX, stone.ry * MOSS_RY * 2, 0, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = pal.mossLight
  ctx.beginPath()
  ctx.ellipse(x - stone.rx * 0.05, y - stone.ry * MOSS_RY * 0.6, stone.rx * MOSS_RX * 0.6, stone.ry * MOSS_RY, 0, 0, Math.PI * 2)
  ctx.fill()
}
//
// A few small tufts on the rock top, only where the top is above the water.
//
function paintTopTufts(ctx, loops, rng, colors, waterY) {
  const xs = loops.flat().map(p => p.x)
  const maxX = Math.max(...xs)
  for (let x = Math.min(...xs); x <= maxX; x += TUFT_STEP_PX) {
    const top = silhouetteTopY(loops, x)
    if (top == null || top > waterY || rng() > TUFT_CHANCE) continue
    const r = TUFT_R_MIN + rng() * TUFT_R_RANGE
    drawMossyTuftToCanvas(ctx, x, top + r * TUFT_SINK, r, rng, colors)
  }
}
//
// Topmost Y of the merged outlines at X (straight-edge approximation of the
// smoothed loops), or null when X misses every outline.
//
function silhouetteTopY(loops, x) {
  let top = null
  loops.forEach(pts => {
    for (let i = 0; i < pts.length; i++) {
      const a = pts[i]
      const b = pts[(i + 1) % pts.length]
      if ((x < a.x && x < b.x) || (x > a.x && x > b.x) || a.x === b.x) continue
      const y = a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x)
      top = top == null ? y : Math.min(top, y)
    }
  })
  return top
}
