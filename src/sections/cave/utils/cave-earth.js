import { CAVE_CFG } from '../cfg.js'
import { soilTintedPicture } from '../../forest/utils/forest-underground.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as Atlas from './cave-atlas.js'
//
// Canvas2D assembly of the cave's soil (the platforms, the walls, the
// ceiling and the lake bed) out of the painted soil kit (cave-atlas.js),
// in the order of the cave0 assembly rules (art_style_cave0.md):
//
// 1. the soil block (ground_block.png), tiled seamlessly in world space,
//    fills the body's core outline;
// 2. stones of both stone sheets of mixed sizes are laid into it, each
//    on a soft contact shadow with a soil patch (joints.png) over its
//    foot, so it sits in the earth; a few soil patches and the forest's
//    buried elements lie loose in it;
// 3. ragged edge pieces (corners.png) run in chains along the body's
//    free sides and underside, fading inward into the core;
// 4. corner pieces close its corners;
// 5. the top strips (ground_top.png) run along its top — copied column by
//    column so they follow its line, cut and cross-faded where one strip
//    meets the next, their own rounded ends kept at a free end;
// 6. a rising (or, mirrored, falling) top piece lies on each slope.
//
// A body's layer is built once per page; a shaded mass (the lake bed) is
// also shaded deeper toward its bottom so it stays behind the
// platforms. Everything is drawn at SOIL_SCALE world px per sheet px.
//
const COLORS = CAVE_CFG.earth
const SOIL_SCALE = 0.375
//
// How far the core sits inside a ragged face (world px), and under the
// top line (both stay under the edge pieces' solid part).
//
export const CORE_INSET = 16
export const TOP_INSET = 22
//
// Stones laid into the soil, big to small: height in world px (never more
// than on the sheet) and how many tries per 100×100 px of soil; how close
// two may come (share of their summed radii — over 1 they keep apart),
// how far one sits in from the core outline (share of its radius).
//
const SOIL_STONES = [
  { hMin: 34, hRange: 30, density: 0.28 },
  { hMin: 16, hRange: 14, density: 1 },
  { hMin: 8, hRange: 6, density: 1.6 }
]
const STONE_CLOSEST = 1.15
const STONE_INSET = 1.1
//
// A laid stone: pulled toward the shade (it sits in the dark earth), on a
// contact shadow (its size and place as shares of the stone, opacity),
// with its joint — width as a share of the stone's, its pivot (share of
// its height down from its top), opacity:
// - in the soil, over its foot at `up` (share of the stone's height up
//   from its foot): a ground stone lies in an arc turned upside down (its
//   tips hugging the stone's sides), a stone of stones.png on a long bed
//   (its middle);
// - on a top, either kind has a heap of soil behind it, the heap's bottom
//   HEAP_SINK px under the surface (no contact shadow: the heap grounds
//   it).
//
const STONE_SHADE = 0.3
const SHADOW_W = 0.65
const SHADOW_H = 0.32
const SHADOW_UP = 0.3
const SHADOW_ALPHA = 0.55
const JOINT_W_MIN = 1.1
const JOINT_W_RANGE = 0.35
const JOINT_ALPHA = 0.95
const JOINT_KIND = { ARC: 'arc', BED: 'bed', HEAP: 'heap' }
const JOINT_PIVOT = { [JOINT_KIND.ARC]: 0, [JOINT_KIND.BED]: 0.5, [JOINT_KIND.HEAP]: 1 }
const JOINT_UP = { [JOINT_KIND.ARC]: 0.6, [JOINT_KIND.BED]: 0.2 }
const HEAP_SINK = 3
//
// Loose soil patches (tries per 100×100 px, width in world px, opacity)
// and the forest's buried elements (tries, longest side, turn, how
// close).
//
const PATCH_DENSITY = 0.12
const PATCH_W_MIN = 40
const PATCH_W_RANGE = 60
const PATCH_ALPHA = 0.8
const ELEMENT_DENSITY = 0.22
const ELEMENT_MIN = 20
const ELEMENT_RANGE = 24
const ELEMENT_TURN = 1.1
const ELEMENT_CLOSEST = 1.3
const AREA_UNIT = 10000
//
// Edge pieces: step between two in a chain (share of a piece's length
// along it), how far in from the box the ragged face runs (sheet px),
// jitter across the chain (world px).
//
const EDGE_STEP = 0.42
const FACE_IN = 14
const EDGE_JITTER = 2
const EDGE_AXIS = { edgeT: 'x', edgeB: 'x', edgeL: 'y', edgeR: 'y' }
//
// Top strips: a strip's cut-off ends (world px, never used), the length a
// strip is cut to, the cross-fade where two meet, the fade-out at a free
// end (over the corner piece there), the column width copied at a time,
// how many cuts are tried for the best meeting, the share of a strip whose
// top sets its base line.
//
const TOP_END_W = 30
const TOP_END_FADE = 16
const TOP_SEG = 420
const TOP_BLEND = 60
const TOP_BLEND_SHARE = 0.25
const TOP_COL = 2
const TOP_TRIES = 16
const TOP_BASE_FROM = 0.1
const TOP_BASE_TO = 0.9
//
// The slope pieces (slopeUp rising to the right, slopeDown falling): the
// points of its top this far in from either end (sheet px) are laid on the
// run's line, and the share of it at its low end that fades out into the
// top strips.
//
const SLOPE_END_IN = 40
const SLOPE_FADE = 0.12
//
// A scattered stone's footprint radius (share of its smaller side), its
// turn either way; a layer reaches LAYER_PAD past the body.
//
const RADIUS_SHARE = 0.46
const TURN = 0.28
const GRID_CELL = 48
const GRID_REACH = 3
const LAYER_PAD = 60
//
// Shade over a mass, so it stays behind the platforms: an even pull toward
// the shade colour, then deeper from the top down.
//
const TINT_ALPHA = 0.5
const SHADE_FROM = 0.1
const SHADE_ALPHA = 0.45
const BYTE_MAX = 255
const HEX_RADIX = 16
const layers = new Map()
const baselines = new Map()
let blockTile = null
const slopeFits = new Map()
const slopesFaded = new Map()

/**
 * A soil body's layer (built fresh): core, laid stones, edges, corners,
 * top and slopes; its 2D context reads back fast (for a scan of its top).
 * @param {Object} body
 * @param {Array<{x: number, y: number}>} body.core - Outline the soil block fills (inside the ragged edges)
 * @param {Array<{name: string, pts: Array<{x: number, y: number}>}>} [body.edges] - Edge chains along a ragged face (edgeT / edgeB left to right, edgeL / edgeR top to bottom)
 * @param {Array<{name: string, x: number, y: number}>} [body.corners] - Corner pieces at their outer corner point
 * @param {{x1: number, x2: number, at: function(number): number, fadeL: boolean, fadeR: boolean}} [body.top] - Top strips along a line, fading out at a free end
 * @param {Array<{x1: number, x2: number}>} [body.slopes] - Runs where the top rises or falls
 * @param {Array<{x1: number, x2: number, y1: number, y2: number}>} [body.feathers] - Rects where the body fades out, gone at x1, whole at x2
 * @param {boolean} [body.bare=false] - Nothing laid in the core (no stones, patches or elements)
 * @param {number} seed - Body seed
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number}}
 */
export function soilLayer(body, seed) {
  const rng = createSeededRandom(seed)
  const box = bodyBounds(body)
  const x = Math.floor(box.x1 - LAYER_PAD)
  const y = Math.floor(box.y1 - LAYER_PAD)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(box.w + LAYER_PAD * 2)
  canvas.height = Math.ceil(box.h + LAYER_PAD * 2)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.translate(-x, -y)
  paintCore(ctx, rng, body.core, body.bare)
  body.edges?.forEach(edge => paintEdgeChain(ctx, rng, edge))
  body.corners?.forEach(corner => paintCorner(ctx, corner))
  body.top && paintTopBand(ctx, rng, body.top)
  body.top && body.slopes?.forEach(run => paintSlope(ctx, body.top, run))
  body.feathers?.forEach(f => featherOut(ctx, f))
  return { canvas, ctx, x, y }
}

/**
 * Paints a soil mass (its layer is built once per page under `opts.key`
 * and reused), shaded behind the platforms unless it is plain.
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {Object} body - soilLayer() body
 * @param {Object} opts
 * @param {string} opts.key - Cache key of the mass
 * @param {number} opts.seed - Mass seed
 * @param {boolean} [opts.plain=false] - Left unshaded, the platforms' own colour (the ceiling, the walls)
 */
export function paintMass(ctx, body, opts) {
  const layer = layers.get(opts.key) ?? massLayer(body, opts)
  layers.set(opts.key, layer)
  ctx.drawImage(layer.canvas, layer.x, layer.y)
}

/**
 * Lays a stone into the soil — its contact shadow, the stone (pulled
 * toward the shade), an upside-down arc (ground stones) or a long bed
 * (stones.png) over its foot — or on a top: a heap of soil behind it,
 * then the stone.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {function(): number} rng - Seeded random
 * @param {{name: string, x: number, y: number, h: number, flip: boolean, angle: number}} stone - Centred on its point
 * @param {number|null} [surfaceY=null] - The top's Y when it lies half sunk in a walkable top
 */
export function embedStone(ctx, rng, stone, surfaceY = null) {
  const w = Atlas.widthAt(stone.name, stone.h)
  const foot = stone.y + stone.h / 2
  const ground = Atlas.GROUND_ROCKS.includes(stone.name)
  const onTop = surfaceY !== null
  onTop && drawJoint(ctx, rng, stone.x, w, JOINT_KIND.HEAP, ground, surfaceY + HEAP_SINK)
  onTop || paintShadow(ctx, stone.x, foot - stone.h * SHADOW_UP, w * SHADOW_W, stone.h * SHADOW_H)
  Atlas.drawPiece(ctx, stone.name, stone.x, foot, stone.h, { flip: stone.flip, angle: stone.angle, shade: COLORS.shade, shadeAmount: STONE_SHADE })
  const kind = ground ? JOINT_KIND.ARC : JOINT_KIND.BED
  onTop || drawJoint(ctx, rng, stone.x, w, kind, ground, foot - stone.h * JOINT_UP[kind])
}

/**
 * Stones of mixed sizes scattered at random over a box (big ones first,
 * then smaller ones into the gaps), each at a height in its class but
 * never bigger than on its sheet, turned and maybe mirrored; sorted top
 * to bottom.
 * @param {function(): number} rng - Seeded random
 * @param {{x1: number, y1: number, w: number, h: number}} box - Area
 * @param {Array<string>} names - Stone pieces to pick from
 * @param {Array<{hMin: number, hRange: number, density: number}>} sizes - Size classes (height in px, tries per 100×100 px), big to small
 * @param {number} closest - How close two may come (share of their summed radii)
 * @param {function(number, number, number): boolean} inside - Whether a stone at (x, y) with radius r may stay
 * @returns {Array<{name: string, x: number, y: number, h: number, flip: boolean, angle: number}>}
 */
export function scatter(rng, box, names, sizes, closest, inside) {
  const grid = new Map()
  const stones = []
  sizes.forEach(size => {
    const tries = Math.round(box.w * box.h / AREA_UNIT * size.density)
    for (let i = 0; i < tries; i++) {
      const name = names[Math.floor(rng() * names.length)]
      const h = Math.min(Atlas.naturalHeight(name), size.hMin + rng() * size.hRange)
      const stone = { name, h, x: box.x1 + rng() * box.w, y: box.y1 + rng() * box.h, flip: rng() < 0.5, angle: (rng() * 2 - 1) * TURN }
      stone.r = Math.min(h, Atlas.widthAt(name, h)) * RADIUS_SHARE
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
 * The stones the soil is laid with: both stone sheets.
 * @returns {Array<string>}
 */
export function soilRocks() {
  return [...Atlas.GROUND_ROCKS, ...Atlas.ROCKS]
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
// Everything a body reaches: its core, its edge lines, its top line.
//
function bodyBounds(body) {
  const pts = [...body.core, ...(body.edges ?? []).flatMap(e => e.pts), ...(body.corners ?? [])]
  if (body.top) {
    for (let x = body.top.x1; x <= body.top.x2; x += TOP_SEG / 4) pts.push({ x, y: body.top.at(x) })
    pts.push({ x: body.top.x2, y: body.top.at(body.top.x2) })
  }
  return bounds(pts)
}
//
// A mass: its body's layer, shaded unless plain.
//
function massLayer(body, opts) {
  const layer = soilLayer(body, opts.seed)
  opts.plain || paintShade(layer.ctx, layer.x, layer.y, layer.canvas.width, layer.canvas.height)
  return layer
}
//
// The core: the soil block, then (unless bare) the stones, loose patches
// and elements laid into it (kept inside it).
//
function paintCore(ctx, rng, core, bare) {
  const box = bounds(core)
  ctx.save()
  tracePoly(ctx, core)
  ctx.fillStyle = ctx.createPattern(soilTile(), 'repeat')
  ctx.fill()
  ctx.clip()
  if (bare) {
    ctx.restore()
    return
  }
  const inside = (sx, sy, r) => fitsInside(core, sx, sy, r * STONE_INSET)
  paintPatches(ctx, rng, box, core)
  scatter(rng, box, soilRocks(), SOIL_STONES, STONE_CLOSEST, inside).forEach(stone => embedStone(ctx, rng, stone))
  paintElements(ctx, rng, box, core)
  ctx.restore()
}
//
// The block resized to SOIL_SCALE, once per page: the block over a copy of
// it turned upside down, so its light top and dark bottom never meet when
// it repeats down (the tile is twice its height).
//
function soilTile() {
  if (blockTile) return blockTile
  const src = Atlas.soilBlock()
  const size = Math.round(src.width * SOIL_SCALE)
  blockTile = document.createElement('canvas')
  blockTile.width = size
  blockTile.height = size * 2
  const ctx = blockTile.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(src, 0, 0, size, size)
  ctx.translate(0, size * 2)
  ctx.scale(1, -1)
  ctx.drawImage(src, 0, 0, size, size)
  return blockTile
}
//
// Loose soil patches here and there in the core.
//
function paintPatches(ctx, rng, box, core) {
  const tries = Math.round(box.w * box.h / AREA_UNIT * PATCH_DENSITY)
  for (let i = 0; i < tries; i++) {
    const name = Atlas.JOINT_LOOSE[Math.floor(rng() * Atlas.JOINT_LOOSE.length)]
    const w = PATCH_W_MIN + rng() * PATCH_W_RANGE
    const h = w / Atlas.widthAt(name, 1)
    const x = box.x1 + rng() * box.w
    const y = box.y1 + rng() * box.h
    fitsInside(core, x, y, h / 2) && Atlas.drawPiece(ctx, name, x, y + h / 2, h, { flip: rng() < 0.5, alpha: PATCH_ALPHA })
  }
}
//
// The forest's buried elements lying in the soil (a few), kept apart,
// each tinted with the soil.
//
function paintElements(ctx, rng, box, poly) {
  const pictures = Atlas.elements()
  if (!pictures.length) return
  const soil = Atlas.soilColor()
  const placed = []
  const tries = Math.round(box.w * box.h / AREA_UNIT * ELEMENT_DENSITY)
  for (let i = 0; i < tries; i++) {
    const picture = pictures[Math.floor(rng() * pictures.length)]
    const k = Math.min(1, (ELEMENT_MIN + rng() * ELEMENT_RANGE) / Math.max(picture.width, picture.height))
    const e = { w: picture.width * k, h: picture.height * k, x: box.x1 + rng() * box.w, y: box.y1 + rng() * box.h }
    const r = Math.max(e.w, e.h) / 2
    if (!fitsInside(poly, e.x, e.y, r) || placed.some(o => Math.hypot(o.x - e.x, o.y - e.y) < (o.r + r) * ELEMENT_CLOSEST)) continue
    placed.push({ x: e.x, y: e.y, r })
    ctx.save()
    ctx.translate(e.x, e.y)
    ctx.rotate((rng() * 2 - 1) * ELEMENT_TURN)
    rng() < 0.5 && ctx.scale(-1, 1)
    ctx.drawImage(soilTintedPicture(picture, e.w, e.h, soil), -e.w / 2, -e.h / 2)
    ctx.restore()
  }
}
//
// A soft dark ellipse (a stone's contact shadow).
//
function paintShadow(ctx, x, y, rx, ry) {
  const g = ctx.createRadialGradient(0, 0, 0, 0, 0, 1)
  g.addColorStop(0, hexAlpha(COLORS.shade, SHADOW_ALPHA))
  g.addColorStop(1, hexAlpha(COLORS.shade, 0))
  ctx.save()
  ctx.translate(x, y)
  ctx.scale(rx, ry)
  ctx.fillStyle = g
  ctx.beginPath()
  ctx.arc(0, 0, 1, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
}
//
// A joint of a kind for a stone `w` px wide at x, its pivot on y.
//
function drawJoint(ctx, rng, x, w, kind, ground, y) {
  const names = jointNames(kind, ground)
  const joint = names[Math.floor(rng() * names.length)]
  const src = Atlas.piece(joint)
  Atlas.drawSlice(ctx, joint, {
    u: 0,
    w: src.width,
    flip: rng() < 0.5,
    flipY: kind === JOINT_KIND.ARC,
    scale: w * (JOINT_W_MIN + rng() * JOINT_W_RANGE) / src.width,
    angle: 0,
    px: src.width / 2,
    py: src.height * JOINT_PIVOT[kind],
    x,
    y,
    alpha: JOINT_ALPHA
  })
}
//
// The joints of a kind for a ground stone or a stone of stones.png.
//
function jointNames(kind, ground) {
  if (kind === JOINT_KIND.HEAP) return ground ? Atlas.GROUND_HEAPS : Atlas.JOINT_MOUNDS
  return kind === JOINT_KIND.ARC ? Atlas.GROUND_ARCS : Atlas.JOINT_BEDS
}
//
// Edge pieces along a chain line, evenly spaced from end to end (none
// reaching past an end), each turned to the line and maybe mirrored along
// it.
//
function paintEdgeChain(ctx, rng, edge) {
  const src = Atlas.piece(edge.name)
  if (!src || edge.pts.length < 2) return
  const alongX = EDGE_AXIS[edge.name] === 'x'
  const piece = (alongX ? src.width : src.height) * SOIL_SCALE
  const path = pathOf(edge.pts)
  const run = Math.max(0, path.length - piece)
  const n = Math.ceil(run / (piece * EDGE_STEP))
  for (let i = 0; i <= n; i++) {
    const at = pointAt(path, n ? piece / 2 + run * i / n : path.length / 2)
    const flip = rng() < 0.5
    const jitter = (rng() * 2 - 1) * EDGE_JITTER
    Atlas.drawSlice(ctx, edge.name, {
      u: 0,
      w: src.width,
      flip: alongX && flip,
      flipY: !alongX && flip,
      scale: SOIL_SCALE,
      angle: alongX ? at.angle : at.angle - Math.PI / 2,
      px: edgePivotX(edge.name, src),
      py: edgePivotY(edge.name, src),
      x: at.x - Math.sin(at.angle) * jitter,
      y: at.y + Math.cos(at.angle) * jitter
    })
  }
}
function edgePivotX(name, src) {
  if (name === 'edgeL') return FACE_IN
  return name === 'edgeR' ? src.width - FACE_IN : src.width / 2
}
function edgePivotY(name, src) {
  if (name === 'edgeT') return FACE_IN
  return name === 'edgeB' ? src.height - FACE_IN : src.height / 2
}
//
// A corner piece with its outer corner on the point.
//
function paintCorner(ctx, corner) {
  const src = Atlas.piece(corner.name)
  if (!src) return
  const right = corner.name === 'cornerTR' || corner.name === 'cornerBR'
  const bottom = corner.name === 'cornerBL' || corner.name === 'cornerBR'
  Atlas.drawSlice(ctx, corner.name, {
    u: 0,
    w: src.width,
    scale: SOIL_SCALE,
    angle: 0,
    px: right ? src.width - FACE_IN : FACE_IN,
    py: bottom ? src.height - FACE_IN : FACE_IN,
    x: corner.x,
    y: corner.y
  })
}
//
// A polyline with its running length, for points along it.
//
function pathOf(pts) {
  const acc = [0]
  for (let i = 1; i < pts.length; i++) acc.push(acc[i - 1] + Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y))
  return { pts, acc, length: acc[acc.length - 1] }
}
function pointAt(path, d) {
  const i = Math.max(1, Math.min(path.pts.length - 1, path.acc.findIndex(a => a >= d)))
  const a = path.pts[i - 1]
  const b = path.pts[i]
  const seg = path.acc[i] - path.acc[i - 1]
  const u = seg ? Math.max(0, Math.min(1, (d - path.acc[i - 1]) / seg)) : 0
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u, angle: Math.atan2(b.y - a.y, b.x - a.x) }
}
//
// The top: strips cut to about TOP_SEG each (their cut-off ends never
// used) and cross-faded where they meet, fading out at a free end over the
// corner piece there. Of TOP_TRIES cuts
// the one whose top best meets the strip before it over the cross-fade is
// taken (so the meeting leaves no step).
//
function paintTopBand(ctx, rng, top) {
  const len = Math.round(top.x2 - top.x1)
  const blend = Math.round(Math.min(TOP_BLEND, len * TOP_BLEND_SHARE))
  const n = Math.max(1, Math.ceil((len - blend) / (TOP_SEG - blend)))
  const segLen = Math.ceil((len + (n - 1) * blend) / n)
  let prev = null
  for (let i = 0; i < n; i++) {
    const tries = Array.from({ length: prev ? TOP_TRIES : 1 }, () => topCut(rng, segLen))
    const cut = prev ? tries.reduce((best, c) => (seamGap(prev, c, blend) < seamGap(prev, best, blend) ? c : best)) : tries[0]
    const strip = Atlas.scaledPiece(cut.name, SOIL_SCALE, cut.flip)
    drawTopSegment(ctx, strip, stripBase(cut.name), top, {
      x: Math.round(top.x1) + i * (segLen - blend),
      u: cut.u,
      len: segLen,
      blend: i ? blend : 0,
      fadeIn: i === 0 && top.fadeL,
      fadeOut: i === n - 1 && top.fadeR
    })
    prev = cut
  }
}
//
// A random cut of a strip for one segment: which strip, mirrored or not,
// its first column (clear of the strip's cut-off ends).
//
function topCut(rng, segLen) {
  const name = Atlas.TOPS[Math.floor(rng() * Atlas.TOPS.length)]
  const flip = rng() < 0.5
  const width = Atlas.scaledPiece(name, SOIL_SCALE, flip).width
  const free = width - TOP_END_W * 2 - segLen
  return { name, flip, width, u: TOP_END_W + Math.floor(rng() * Math.max(0, free)), segLen }
}
//
// How far apart two cuts' tops run over the cross-fade (mean px, each
// over its own base line).
//
function seamGap(a, b, blend) {
  let sum = 0
  for (let c = 0; c < blend; c += TOP_COL) sum += Math.abs(cutTop(a, a.u + a.segLen - blend + c) - cutTop(b, b.u + c))
  return sum / Math.max(1, blend / TOP_COL)
}
//
// A cut's top at a column of its scaled strip, over the strip's base line.
//
function cutTop(cut, col) {
  const top = Atlas.profile(cut.name).top
  const sheetCol = Math.round((cut.flip ? cut.width - 1 - col : col) / SOIL_SCALE)
  const y = top[Math.max(0, Math.min(top.length - 1, sheetCol))]
  return (Number.isNaN(y) ? 0 : y) * SOIL_SCALE - stripBase(cut.name)
}
//
// One cut of a strip, a column at a time, each column on the line; its
// first `blend` px fade in over the strip before it, and it fades in / out
// over TOP_END_FADE px at a free end.
//
function drawTopSegment(ctx, strip, base, top, seg) {
  ctx.save()
  for (let c = 0; c < seg.len; c += TOP_COL) {
    const x = seg.x + c
    const w = Math.min(TOP_COL, seg.len - c, strip.width - seg.u - c)
    if (w <= 0) break
    const blend = seg.blend ? Math.min(1, c / seg.blend) : 1
    const fadeIn = seg.fadeIn ? Math.min(1, c / TOP_END_FADE) : 1
    const fadeOut = seg.fadeOut ? Math.min(1, (seg.len - c) / TOP_END_FADE) : 1
    ctx.globalAlpha = blend * fadeIn * fadeOut
    ctx.drawImage(strip, seg.u + c, 0, w, strip.height, x, Math.round(top.at(x + w / 2) - base), w, strip.height)
  }
  ctx.restore()
}
//
// A strip's base line (its top's median over its middle, scaled): the
// row that runs on the body's top line.
//
function stripBase(name) {
  if (baselines.has(name)) return baselines.get(name)
  const top = Atlas.profile(name).top
  const ys = []
  for (let i = Math.floor(top.length * TOP_BASE_FROM); i < top.length * TOP_BASE_TO; i++) Number.isNaN(top[i]) || ys.push(top[i])
  ys.sort((a, b) => a - b)
  const base = (ys[Math.floor(ys.length / 2)] ?? 0) * SOIL_SCALE
  baselines.set(name, base)
  return base
}
//
// A slope piece on a run of the top: its high rounded end at the run's
// high end, turned so its top follows the run.
//
function paintSlope(ctx, top, run) {
  const y1 = top.at(run.x1)
  const y2 = top.at(run.x2)
  const rising = y2 < y1
  const name = rising ? 'slopeUp' : 'slopeDown'
  const src = Atlas.piece(name)
  if (!src) return
  const fit = slopeOf(name, src, rising)
  Atlas.drawSlice(ctx, name, {
    src: fadedSlope(name, src, rising),
    u: 0,
    w: src.width,
    scale: SOIL_SCALE,
    angle: Math.atan2(y2 - y1, run.x2 - run.x1) - fit.angle,
    px: fit.endX,
    py: fit.endY,
    x: rising ? run.x2 : run.x1,
    y: rising ? y2 : y1
  })
}
//
// A slope piece faded out toward its low end, once per page.
//
function fadedSlope(name, src, rising) {
  if (slopesFaded.has(name)) return slopesFaded.get(name)
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = src.height
  const ctx = canvas.getContext('2d')
  ctx.drawImage(src, 0, 0)
  const fade = src.width * SLOPE_FADE
  const from = rising ? 0 : src.width
  const g = ctx.createLinearGradient(from, 0, rising ? fade : src.width - fade, 0)
  g.addColorStop(0, hexAlpha(COLORS.shade, 0))
  g.addColorStop(1, COLORS.shade)
  ctx.globalCompositeOperation = 'destination-in'
  ctx.fillStyle = g
  ctx.fillRect(rising ? 0 : src.width - fade, 0, fade, src.height)
  slopesFaded.set(name, canvas)
  return canvas
}
//
// A slope piece's top: the angle of the chord between its points
// SLOPE_END_IN in from either end, and its high point (the pivot).
//
function slopeOf(name, src, rising) {
  if (slopeFits.has(name)) return slopeFits.get(name)
  const top = Atlas.profile(name).top
  const left = SLOPE_END_IN
  const right = src.width - SLOPE_END_IN
  const yl = topNear(top, left)
  const yr = topNear(top, right)
  const fit = { angle: Math.atan2(yr - yl, right - left), endX: rising ? right : left, endY: rising ? yr : yl }
  slopeFits.set(name, fit)
  return fit
}
//
// A profile's top at a column, or the nearest column that has one.
//
function topNear(top, col) {
  for (let d = 0; d < top.length; d++) {
    if (!Number.isNaN(top[col + d])) return top[col + d]
    if (!Number.isNaN(top[col - d])) return top[col - d]
  }
  return 0
}
//
// The body faded out across a rect: gone at its x1, whole at its x2.
//
function featherOut(ctx, f) {
  const g = ctx.createLinearGradient(f.x1, 0, f.x2, 0)
  g.addColorStop(0, hexAlpha(COLORS.shade, 1))
  g.addColorStop(1, hexAlpha(COLORS.shade, 0))
  ctx.save()
  ctx.globalCompositeOperation = 'destination-out'
  ctx.fillStyle = g
  ctx.fillRect(f.x1, f.y1, f.x2 - f.x1, f.y2 - f.y1)
  ctx.restore()
}
function tracePoly(ctx, poly) {
  ctx.beginPath()
  ctx.moveTo(poly[0].x, poly[0].y)
  for (let i = 1; i < poly.length; i++) ctx.lineTo(poly[i].x, poly[i].y)
  ctx.closePath()
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
//
// Whether a disc of radius r round (x, y) lies inside the outline (its
// centre and four points round it).
//
function fitsInside(poly, x, y, r) {
  return insidePoly(poly, x, y) && insidePoly(poly, x - r, y) && insidePoly(poly, x + r, y) && insidePoly(poly, x, y - r) && insidePoly(poly, x, y + r)
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
// Shade over everything painted in the layer, deepening toward its
// bottom.
//
function paintShade(ctx, x, y, w, h) {
  const g = ctx.createLinearGradient(0, y, 0, y + h)
  g.addColorStop(SHADE_FROM, hexAlpha(COLORS.shade, 0))
  g.addColorStop(1, COLORS.shade)
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = TINT_ALPHA
  ctx.fillStyle = COLORS.shade
  ctx.fillRect(x, y, w, h)
  ctx.globalAlpha = SHADE_ALPHA
  ctx.fillStyle = g
  ctx.fillRect(x, y, w, h)
  ctx.restore()
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
