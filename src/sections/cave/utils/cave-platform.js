import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as Atlas from './cave-atlas.js'
import * as Earth from './cave-earth.js'
import * as Layout from './cave-layout.js'
//
// The cave's platforms, assembled from the soil kit (cave-earth.js):
//
// - a ledge is a slab of soil hanging in the air: the soil block inside,
//   a ragged underside (edgeB pieces) along its lobed bottom, at each free
//   end a ragged face (edgeB pieces on their side) with corner pieces,
//   the top strips along its base line (Layout) — fading out over the top
//   corner at a free end, running on into a wall or into the mass it joins
//   — and a slope piece on each of its rises and falls;
// - a ground is the same soil down to the world's bottom;
// - a float is a short stone platform of platforms.png hanging in the air,
//   its flat top on its line.
//
// A ledge's or a ground's top carries stones half sunk in it, a heap of
// soil behind each, sitting on the art's own surface, so the walking
// surface is uneven. Each platform is built once per page into its own
// layer; cave-ground.js reads the walkable line off its top.
//
const ART_PAD = 40
const OUTLINE_STEP = 6
//
// The top: a soft wave over the base line (Layout's knots), so no top
// runs ruler-straight.
//
const TOP_WAVE = 8
const TOP_WAVE_STRETCH = 1.6
const TOP_WAVE_SEED_MUL = 2.9
//
// A ledge: its thickness under the top line (unless it gives its
// underside), how far it runs on into a mass it joins. Its underside is
// never straight: broad lobes and fine ones, and soil bulging down here
// and there (a bulge every BULGE_GAP..+RANGE px, BULGE_DEPTH..+RANGE deep,
// BULGE_HALF..+RANGE px either side).
//
const LEDGE_THICK = 140
const JOIN_PAD = 40
const LOBE_AMP = 20
const LOBE_STRETCH = 1.2
const LOBE_SEED_MUL = 1.7
const LOBE_FINE_AMP = 6
const LOBE_FINE_STRETCH = 0.6
const LOBE_FINE_SEED_MUL = 3.3
const BULGE_GAP = 110
const BULGE_GAP_RANGE = 150
const BULGE_DEPTH = 8
const BULGE_DEPTH_RANGE = 18
const BULGE_HALF = 55
const BULGE_HALF_RANGE = 55
const BULGE_SEED = 9
//
// A free end is no square cut: over END_TAPER px the ledge thins to
// END_SHARE of its depth at the end (rounding), and its face leans in by
// END_LEAN px toward the bottom. Only ledges up to TAPER_MAX_THICK thick
// taper (a deep mass keeps its face whole).
//
const END_TAPER = 130
const END_SHARE = 0.55
const END_LEAN = 14
const TAPER_MAX_THICK = 220
//
// A free end's face, shaped like an underside (broad lobes and fine ones,
// nothing sticking out) and edged with the underside's own ragged pieces
// turned on their side: its points' spacing, two waves of noise (stretch,
// height, seed), and how far down from the top corner it starts to wave.
//
const FACE_STEP = 6
const FACE_STRETCH = 1.2
const FACE_AMP = 12
const FACE_SEED_MUL = 4.1
const FACE_FINE_STRETCH = 0.6
const FACE_FINE_AMP = 4
const FACE_FINE_SEED_MUL = 6.7
const FACE_CALM = 24
//
// At a free end the core reaches this close to the ends (the corner
// pieces there are see-through toward the inside; the core must fill
// under them so no slit shows).
//
const END_CORE_INSET = 6
//
// The core reaches this close to the underside (the underside's pieces
// fade into it, so it must fill right up to them, no holes); nothing of
// a ledge reaches more than ENVELOPE px out of its outline (ENVELOPE_TOP
// over its top, where the top strips' lumps stand) — a piece's end
// sticking farther out is cut.
//
const UNDER_CORE_INSET = 4
const ENVELOPE = 10
const ENVELOPE_TOP = 14
//
// A ledge running on under the mass beside it fades out over this many px.
//
const JOIN_FEATHER = 50
const FEATHER_ABOVE_UNDER = 40
//
// How far in from its end a bottom corner piece reaches (world px).
//
const CORNER_REACH = 110
//
// A top run steeper than this (px over the run) gets a slope piece.
//
const SLOPE_MIN_RISE = 10
//
// Stones half sunk in the top: spacing with its spread, height (world px,
// never bigger than on the sheet), the share of it under the soil, turn,
// how far from a free end the first one sits; a pixel this opaque is the
// surface they sit on.
//
const SURFACE_GAP = 95
const SURFACE_GAP_JITTER = 0.9
const SURFACE_H_MIN = 9
const SURFACE_H_RANGE = 32
const SURFACE_SINK_MIN = 0.55
const SURFACE_SINK_RANGE = 0.2
const SURFACE_TURN = 0.2
const SURFACE_END_CLEAR = 40
const SOLID_ALPHA = 128
const RGBA = 4
const ALPHA_OFFSET = 3
//
// A float's layer reaches this far round its piece.
//
const FLOAT_PAD = 8
const layers = new Map()
const bulges = new Map()

/**
 * Paints a platform (its layer, built once per page) where it reaches into
 * a world rect.
 * @param {CanvasRenderingContext2D} ctx - World-translated context
 * @param {{x1: number, y1: number, x2: number, y2: number}} rect - World rect to cover
 * @param {Object} p - PLATFORMS entry
 */
export function paint(ctx, rect, p) {
  const layer = layerOf(p)
  const fits = layer.x < rect.x2 && layer.x + layer.canvas.width > rect.x1 && layer.y < rect.y2 && layer.y + layer.canvas.height > rect.y1
  fits && ctx.drawImage(layer.canvas, layer.x, layer.y)
}

/**
 * A platform's layer (built once per page): its canvas (its 2D context
 * reads back fast) and the world point of its top-left.
 * @param {Object} p - PLATFORMS entry
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D, x: number, y: number}}
 */
export function layerOf(p) {
  if (layers.has(p.id)) return layers.get(p.id)
  const float = p.kind === Layout.PLATFORM_KIND.FLOAT
  const layer = float ? floatLayer(p) : Earth.soilLayer(bodyOf(p), p.seed)
  layer.surface = scanSurface(layer)
  float || surfaceStones(layer, p)
  layers.set(p.id, layer)
  return layer
}

/**
 * The platform's own surface at world X before anything was laid on it
 * (its soil's top, not the stones half sunk in it); its base line where
 * the art has no column.
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - World X
 * @returns {number}
 */
export function surfaceAt(p, x) {
  const layer = layerOf(p)
  const y = layer.surface[Math.round(x - layer.x)]
  return y === undefined || Number.isNaN(y) ? baseAt(p, x) : y
}

/**
 * A ledge's underside line at X (its ragged bottom runs along it).
 * @param {Object} p - PLATFORMS entry (a ledge)
 * @param {number} x - World X
 * @returns {number}
 */
export function undersideAt(p, x) {
  const top = baseAt(p, x)
  const base = p.bottom ?? top + LEDGE_THICK
  const shape = p.under ? Layout.PLATFORMS.find(q => q.id === p.under) : p
  const y = base +
    Layout.profileNoise(x / LOBE_STRETCH, shape.seed * LOBE_SEED_MUL) * LOBE_AMP +
    Layout.profileNoise(x / LOBE_FINE_STRETCH, shape.seed * LOBE_FINE_SEED_MUL) * LOBE_FINE_AMP +
    bulgeAt(shape, x)
  return top + (y - top) * endShare(p, x, base - top)
}

/**
 * A platform's top line at X: its base line (Layout) with a soft wave.
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - World X
 * @returns {number}
 */
export function baseAt(p, x) {
  return Layout.topAt(p, x) + Layout.profileNoise(x / TOP_WAVE_STRETCH, p.seed * TOP_WAVE_SEED_MUL) * TOP_WAVE
}
//
// The soil body of a platform.
//
function bodyOf(p) {
  return p.kind === Layout.PLATFORM_KIND.LEDGE ? ledgeBody(p) : groundBody(p)
}
//
// Where the art runs: past the world's side at an end that runs into a
// wall, on into the mass a joined end runs into, else the platform's own
// end.
//
function artSpan(p) {
  const wallR = p.x2 >= Layout.WORLD_W
  return {
    x1: p.x1 <= 0 ? -ART_PAD : p.x1,
    x2: wallR ? Layout.WORLD_W + ART_PAD : p.x2 + (p.joinR ? JOIN_PAD : 0),
    freeL: p.x1 > 0,
    freeR: !wallR && !p.joinR
  }
}
//
// The top strips along the base line, rounded at a free end, with a
// slope piece on every rise and fall of its knots.
//
function topOf(p, span) {
  return { x1: span.x1, x2: span.x2, at: x => baseAt(p, x), fadeL: span.freeL, fadeR: span.freeR }
}
function slopesOf(p) {
  return Layout.baseSegments(p).filter(s => Math.abs(s.y2 - s.y1) > SLOPE_MIN_RISE).map(s => ({ x1: s.x1, x2: s.x2 }))
}
//
// A ledge: its core between the top and the lobed underside, the
// underside's ragged chain, a ragged face with corners at each free end
// (a left end with `faceTo` shows its face and top corner only down to
// that Y and runs on into the mass beside it below).
//
function ledgeBody(p) {
  const span = artSpan(p)
  const bottomAt = x => undersideAt(p, x)
  const joinedBelow = span.freeL && p.faceTo !== undefined
  const leanL = span.freeL && !joinedBelow ? END_LEAN : 0
  const leanR = span.freeR ? END_LEAN : 0
  const underL = joinedBelow ? span.x1 - JOIN_PAD : span.x1 + leanL
  const inL = span.freeL ? span.x1 + END_CORE_INSET : span.x1
  const inR = span.freeR ? span.x2 - END_CORE_INSET : span.x2
  const xl = span.x1 + leanL
  const xr = span.x2 - leanR
  const faceL = span.freeL ? facePoints(p, 1, span.x1, baseAt(p, span.x1), joinedBelow ? span.x1 : xl, joinedBelow ? p.faceTo : bottomAt(xl)) : []
  const faceR = span.freeR ? facePoints(p, -1, span.x2, baseAt(p, span.x2), xr, bottomAt(xr)) : []
  const top = line(inL, inR, x => baseAt(p, x) + Earth.TOP_INSET)
  const under = line(joinedBelow ? underL : inL + leanL, inR - leanR, x => bottomAt(x) - UNDER_CORE_INSET).reverse()
  const coreR = faceR.map(pt => ({ x: pt.x - END_CORE_INSET, y: pt.y }))
  const coreL = faceL.map(pt => ({ x: pt.x + END_CORE_INSET, y: pt.y })).reverse()
  const core = joinedBelow
    ? [...top, ...coreR, ...under, { x: underL, y: p.faceTo }, ...coreL]
    : [...top, ...coreR, ...under, ...coreL]
  const edges = [{ name: 'edgeB', pts: line(underL, xr, bottomAt) }]
  const corners = []
  span.freeL && edges.push({ name: 'edgeB', pts: faceL })
  span.freeR && edges.push({ name: 'edgeB', pts: faceR.slice().reverse() })
  span.freeL && corners.push({ name: 'cornerTL', x: span.x1, y: baseAt(p, span.x1) })
  span.freeL && !joinedBelow && corners.push({ name: 'cornerBL', x: xl, y: highestUnder(p, xl, 1) })
  span.freeR && corners.push({ name: 'cornerTR', x: span.x2, y: baseAt(p, span.x2) }, { name: 'cornerBR', x: xr, y: highestUnder(p, xr, -1) })
  const envelope = [
    ...line(span.x1, span.x2, x => baseAt(p, x) - ENVELOPE_TOP),
    ...faceR.map(pt => ({ x: pt.x + ENVELOPE, y: pt.y })),
    ...line(underL - (joinedBelow ? ENVELOPE : 0), xr, x => bottomAt(x) + ENVELOPE).reverse(),
    ...(joinedBelow ? [{ x: underL - ENVELOPE, y: p.faceTo }] : []),
    ...faceL.map(pt => ({ x: pt.x - ENVELOPE, y: pt.y })).reverse()
  ]
  return { core, edges, corners, top: topOf(p, span), slopes: slopesOf(p), envelope, feathers: joinedBelow ? [joinFeather(p, underL)] : [] }
}
//
// A free end's face from its top corner (x0, y0) down to its bottom
// (x1, y1): never a straight cut — it waves out and in (two waves of
// noise, FACE_AMP and FACE_FINE_AMP px), calm right at its top corner
// (over FACE_CALM px) so the top strips meet it. `inward` is +1 for a left
// end, -1 for a right one.
//
function facePoints(p, inward, x0, y0, x1, y1) {
  const pts = []
  const n = Math.max(1, Math.round((y1 - y0) / FACE_STEP))
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const y = y0 + (y1 - y0) * u
    const calm = Math.min(1, (y - y0) / FACE_CALM)
    const wave = Layout.profileNoise(y / FACE_STRETCH, p.seed * FACE_SEED_MUL + inward) * FACE_AMP +
      Layout.profileNoise(y / FACE_FINE_STRETCH, p.seed * FACE_FINE_SEED_MUL + inward) * FACE_FINE_AMP
    pts.push({ x: x0 + (x1 - x0) * u + wave * calm * inward, y })
  }
  return pts
}
//
// A ground: its core from its top down to the world's bottom, wall to
// wall.
//
function groundBody(p) {
  const span = artSpan(p)
  const bottom = Layout.WORLD_H + ART_PAD
  const core = [...line(span.x1, span.x2, x => baseAt(p, x) + Earth.TOP_INSET), { x: span.x2, y: bottom }, { x: span.x1, y: bottom }]
  return { core, top: topOf(p, span), slopes: slopesOf(p) }
}
//
// A float: its piece of platforms.png scaled to its width, the middle of
// its flat top on the platform's line.
//
function floatLayer(p) {
  const src = Atlas.piece(p.piece)
  const scale = p.w / src.width
  const top = Atlas.profile(p.piece).top
  const mid = []
  for (let c = Math.floor(src.width / 4); c < src.width * 3 / 4; c++) Number.isNaN(top[c]) || mid.push(top[c])
  mid.sort((a, b) => a - b)
  const topRow = (mid[Math.floor(mid.length / 2)] ?? 0) * scale
  const h = src.height * scale
  const x = Math.floor(p.x1 - FLOAT_PAD)
  const y = Math.floor(p.y - topRow - FLOAT_PAD)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(p.w + FLOAT_PAD * 2)
  canvas.height = Math.ceil(h + FLOAT_PAD * 2)
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.translate(-x, -y)
  Atlas.drawPiece(ctx, p.piece, p.x, p.y - topRow + h, h, { flip: p.seed % 2 === 0 })
  return { canvas, ctx, x, y }
}
//
// Where a ledge runs on into the mass beside it below its face, its soil
// fades out over JOIN_FEATHER px toward its end, so no straight seam shows
// over the mass's own soil — down to FEATHER_ABOVE_UNDER px over its
// underside (its ragged underside stays whole there).
//
function joinFeather(p, x) {
  return { x1: x, x2: x + JOIN_FEATHER, y1: p.faceTo, y2: Math.min(undersideAt(p, x), undersideAt(p, x + JOIN_FEATHER)) - FEATHER_ABOVE_UNDER }
}
//
// The share of a ledge's depth kept at X: thinning toward a free end (not
// a joined one, not for a deep mass).
//
function endShare(p, x, thick) {
  if (p.kind !== Layout.PLATFORM_KIND.LEDGE || thick > TAPER_MAX_THICK) return 1
  const fromL = p.x1 > 0 && p.faceTo === undefined ? x - p.x1 : Infinity
  const fromR = p.x2 < Layout.WORLD_W && !p.joinR ? p.x2 - x : Infinity
  const f = Math.max(0, Math.min(1, Math.min(fromL, fromR) / END_TAPER))
  return END_SHARE + (1 - END_SHARE) * Math.sqrt(1 - (1 - f) * (1 - f))
}
//
// Soil bulging down from a ledge's underside at X: the sum of its bulges
// (placed once per platform), each a smooth bump.
//
function bulgeAt(p, x) {
  if (!bulges.has(p.id)) bulges.set(p.id, placeBulges(p))
  return bulges.get(p.id).reduce((sum, b) => {
    const u = Math.abs(x - b.x) / b.half
    return u >= 1 ? sum : sum + b.depth * (1 + Math.cos(Math.PI * u)) / 2
  }, 0)
}
function placeBulges(p) {
  const rng = createSeededRandom(p.seed + BULGE_SEED)
  const out = []
  for (let x = p.x1 + rng() * BULGE_GAP; x < p.x2; x += BULGE_GAP + rng() * BULGE_GAP_RANGE) {
    out.push({ x, depth: BULGE_DEPTH + rng() * BULGE_DEPTH_RANGE, half: BULGE_HALF + rng() * BULGE_HALF_RANGE })
  }
  return out
}
//
// The highest point of a ledge's underside within a corner piece's reach
// in from its end (dir 1: rightward from a left end), where a bottom
// corner sits so its fading tail never hangs under the underside.
//
function highestUnder(p, x, dir) {
  let y = Infinity
  for (let d = 0; d <= CORNER_REACH; d += OUTLINE_STEP) y = Math.min(y, undersideAt(p, x + dir * d))
  return y
}
//
// Points along a function of X from x1 to x2 (both ends included).
//
function line(x1, x2, yAt) {
  const pts = []
  for (let x = x1; x < x2; x += OUTLINE_STEP) pts.push({ x, y: yAt(x) })
  pts.push({ x: x2, y: yAt(x2) })
  return pts
}
//
// Stones of mixed sizes half sunk in the top here and there, on the art's
// own surface under each, a heap of soil behind each.
//
function surfaceStones(layer, p) {
  const rng = createSeededRandom(p.seed + 5)
  const span = artSpan(p)
  const names = Earth.soilRocks()
  const from = span.freeL ? span.x1 + SURFACE_END_CLEAR : Math.max(span.x1, Layout.WALL_COLLIDE_W)
  const to = span.freeR ? span.x2 - SURFACE_END_CLEAR : Math.min(span.x2, Layout.WORLD_W - Layout.WALL_COLLIDE_W)
  for (let x = from + rng() * SURFACE_GAP; x < to; x += SURFACE_GAP * (1 + (rng() - 0.5) * SURFACE_GAP_JITTER)) {
    const name = names[Math.floor(rng() * names.length)]
    const h = Math.min(Atlas.naturalHeight(name), SURFACE_H_MIN + rng() * SURFACE_H_RANGE)
    const sink = SURFACE_SINK_MIN + rng() * SURFACE_SINK_RANGE
    const y = layer.surface[Math.round(x - layer.x)]
    const surface = Number.isNaN(y) || y === undefined ? baseAt(p, x) : y
    Earth.embedStone(layer.ctx, rng, { name, h, x, y: surface + h * (sink - 0.5), flip: rng() < 0.5, angle: (rng() * 2 - 1) * SURFACE_TURN }, surface)
  }
}
//
// The layer's surface: the first solid pixel down each column (one read
// of a canvas made for reading back), NaN where a column is empty.
//
function scanSurface(layer) {
  const { width: w, height: h } = layer.canvas
  const data = layer.ctx.getImageData(0, 0, w, h).data
  const tops = new Float32Array(w).fill(NaN)
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      if (data[(y * w + x) * RGBA + ALPHA_OFFSET] < SOLID_ALPHA) continue
      tops[x] = layer.y + y
      break
    }
  }
  return tops
}
