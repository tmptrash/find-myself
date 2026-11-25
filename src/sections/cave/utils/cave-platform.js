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
// A ledge's or a ground's top carries clusters of stones — one big, a
// few small round it — resting on the art's own surface, each on a heap
// of soil under it. The small ones are baked into the platform, so the
// walking surface is uneven (the hero walks over them); the big one is
// only recorded here (frontStones): cave-front.js draws it in front of
// the hero, who walks behind it. Each platform is built once per page into its own
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
// underside) — LEDGE_THICK give or take THICK_AMP, wandering slowly along
// it (THICK_STRETCH, THICK_SEED_MUL), so no slab is the same depth all
// along — how far it runs on into a mass it joins. Its underside is
// never straight: broad lobes and fine ones, and soil bulging down here
// and there (a bulge every BULGE_GAP..+RANGE px, BULGE_DEPTH..+RANGE deep,
// BULGE_HALF..+RANGE px either side).
//
const LEDGE_THICK = 140
const THICK_AMP = 65
const THICK_STRETCH = 1.5
const THICK_SEED_MUL = 5.3
const JOIN_PAD = 40
const LOBE_AMP = 9
const LOBE_STRETCH = 1.2
const LOBE_SEED_MUL = 1.7
const LOBE_FINE_AMP = 2
const LOBE_FINE_STRETCH = 0.6
const LOBE_FINE_SEED_MUL = 3.3
const BULGE_GAP = 110
const BULGE_GAP_RANGE = 150
const BULGE_DEPTH = 3
const BULGE_DEPTH_RANGE = 7
const BULGE_HALF = 80
const BULGE_HALF_RANGE = 60
const BULGE_SEED = 9
//
// A free end is no square cut, and no two ends alike (each end's shape is
// picked from the platform's seed and its side): its top rounds down into
// the face over END_ROUND..+RANGE px; the face leans in by
// END_LEAN..+RANGE px toward the bottom and bows out by up to END_BOW px
// on the way; over END_TAPER..+RANGE px the ledge thins to
// END_SHARE..+RANGE of its depth at the end (rounding its bottom corner),
// and its underside curves up into the face too (END_UNDER_ROUND times
// the top's radius: the only rounding a deep mass's bottom corner gets).
// Only ledges up to TAPER_MAX_THICK thick taper (a deep mass keeps its
// face whole). Where a platform runs into a side wall its top rises and
// its underside comes down into the wall's face (Layout.wallFillet, sized
// WALL_FILLET_MIN..+RANGE of it by the platform's seed).
//
const END_ROUND = 22
const END_ROUND_RANGE = 38
const END_TAPER = 90
const END_TAPER_RANGE = 130
const END_SHARE = 0.35
const END_SHARE_RANGE = 0.3
const END_LEAN = 8
const END_LEAN_RANGE = 34
const END_BOW = 20
const END_SEED = 13
const END_UNDER_ROUND = 1.6
const WALL_FILLET_MIN = 0.7
const WALL_FILLET_RANGE = 0.6
const WALL_FILLET_STEPS = 7
const TAPER_MAX_THICK = 220
//
// A free end's face, shaped like an underside (broad lobes and fine ones,
// nothing sticking out) and edged with the underside's own ragged pieces
// turned on their side: its points' spacing, two waves of noise (stretch,
// height, seed), and how far down from the top corner it starts to wave.
//
const FACE_STEP = 6
const FACE_STRETCH = 1.2
const FACE_AMP = 6
const FACE_SEED_MUL = 4.1
const FACE_FINE_STRETCH = 0.6
const FACE_FINE_AMP = 1.5
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
const ENVELOPE = 5
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
// A top run steeper than this (px over the run) gets a slope piece — not
// one steeper than SLOPE_MAX (px per px): a drop that sheer (into a bank's
// hollow) is no slope a piece could lie on.
//
const SLOPE_MIN_RISE = 10
const SLOPE_MAX = 5
//
// A hollow (Layout.BANK_HOLLOW_L / _R) is cut out of the soil, its arc edged
// with the underside's ragged pieces; once the top strips are on, it is
// cut again HOLLOW_SPILL px inside its arc (so the edge pieces' ragged rim
// stays, and nothing else of the top reaches into it).
//
const HOLLOW_SPILL = 4
//
// Stone clusters on the top, CLUSTER_GAP px apart (with its spread): one
// big stone and SMALL_MIN..+SMALL_RANGE small ones (heights in world px,
// never bigger than on the sheet), the small ones either side of the big
// one, from SMALL_NEAR of its half width out to SMALL_SPREAD px past it.
// Each rests on the lowest soil under its foot (FOOT_SHARE of its half
// width either side of its middle, read every FOOT_STEP px — on a lumpy
// top no side of it hangs in the air), its foot REST_SINK of its height
// into it, bedded, its joints hiding the rest; turn; how far from a free
// end the first cluster sits, how far from the lake's banks and from a
// creature, the lantern or the hero's landing spot; a pixel this opaque is
// the surface they rest on.
//
const CLUSTER_GAP = 230
const CLUSTER_GAP_JITTER = 0.6
const BIG_H_MIN = 30
const BIG_H_RANGE = 18
const SMALL_H_MIN = 6
const SMALL_H_RANGE = 6
const SMALL_MIN = 2
const SMALL_RANGE = 2
const SMALL_NEAR = 0.8
const SMALL_SPREAD = 22
const REST_SINK = 0.25
const FOOT_SHARE = 0.8
const FOOT_STEP = 2
const SURFACE_TURN = 0.2
const SURFACE_END_CLEAR = 50
const LAKE_CLEAR = 30
const SPOT_CLEAR = 75
const SPOTS = [Layout.LANTERN, Layout.STALK_EYE, { x: Layout.ENTRY_X, on: Layout.START_PLATFORM }]
const SOLID_ALPHA = 128
const RGBA = 4
const ALPHA_OFFSET = 3
//
// A float's layer reaches this far round its piece.
//
const FLOAT_PAD = 8
const layers = new Map()
const surfaces = new Map()
const bulges = new Map()
const bigStones = new Map()
const stoneSpans = new Map()
const endShapes = new Map()

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
  surfaces.set(p.id, { x0: layer.x, tops: layer.surface })
  //
  // Built again after releaseLayers(): its stones are laid anew, not twice.
  //
  bigStones.delete(p.id)
  stoneSpans.delete(p.id)
  float || surfaceStones(layer, p)
  layers.set(p.id, layer)
  return layer
}

/**
 * Lets go of every platform's layer picture (bake inputs: once the scene's
 * pictures are baked nothing reads them); what was read off them (their
 * surfaces, stones, spans) stays, and a later bake builds them again.
 */
export function releaseLayers() {
  layers.clear()
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
  surfaces.has(p.id) || layerOf(p)
  const surface = surfaces.get(p.id)
  const y = surface.tops[Math.round(x - surface.x0)]
  return y === undefined || Number.isNaN(y) ? baseAt(p, x) : y
}

/**
 * The big stones of every platform's clusters, resting on its top (drawn
 * in front of the hero by cave-front.js); builds the platforms' layers if
 * they are not yet built.
 * @returns {Array<{name: string, h: number, x: number, p: Object, surface: number, foot: number, flip: boolean, angle: number}>}
 */
export function frontStones() {
  Layout.PLATFORMS.forEach(p => layerOf(p))
  return [...bigStones.values()].flat()
}

/**
 * The stretches of a platform's top its cluster stones and their joints
 * take (plants keep off them); builds its layer if it is not yet built.
 * @param {Object} p - PLATFORMS entry
 * @returns {Array<{x1: number, x2: number}>}
 */
export function stoneSpansOn(p) {
  layerOf(p)
  return stoneSpans.get(p.id) ?? []
}

/**
 * A ledge's underside line at X (its ragged bottom runs along it).
 * @param {Object} p - PLATFORMS entry (a ledge)
 * @param {number} x - World X
 * @returns {number}
 */
export function undersideAt(p, x) {
  const top = baseAt(p, x)
  const base = p.bottom ?? top + LEDGE_THICK + Layout.profileNoise(x / THICK_STRETCH, p.seed * THICK_SEED_MUL) * THICK_AMP
  const shape = p.under ? Layout.PLATFORMS.find(q => q.id === p.under) : p
  const y = base +
    Layout.profileNoise(x / LOBE_STRETCH, shape.seed * LOBE_SEED_MUL) * LOBE_AMP +
    Layout.profileNoise(x / LOBE_FINE_STRETCH, shape.seed * LOBE_FINE_SEED_MUL) * LOBE_FINE_AMP +
    bulgeAt(shape, x)
  return top + (y - top) * endShare(p, x, base - top) - endRound(p, x, END_UNDER_ROUND) + Layout.wallFillet(x, y, wallScale(p))
}

/**
 * A ledge's free end face as painted (side -1: its left end, 1: its
 * right one): the Y span from its top corner to its bottom and its X at
 * a Y on that span. Null where that end runs into a wall or a mass.
 * @param {Object} p - PLATFORMS entry (a ledge)
 * @param {number} side - -1 left end, 1 right end
 * @returns {{y1: number, y2: number, at: Function}|null}
 */
export function endFace(p, side) {
  const span = artSpan(p)
  const free = side < 0 ? span.freeL && p.faceTo === undefined : span.freeR
  if (!free) return null
  const x0 = side < 0 ? span.x1 : span.x2
  const x1 = x0 - side * endShape(p, side).lean
  const pts = facePoints(p, -side, x0, baseAt(p, x0), x1, undersideAt(p, x1))
  return { y1: pts[0].y, y2: pts[pts.length - 1].y, at: y => faceXAt(pts, y) }
}

/**
 * A platform's top line at X: its base line (Layout) with a soft wave.
 * @param {Object} p - PLATFORMS entry
 * @param {number} x - World X
 * @returns {number}
 */
export function baseAt(p, x) {
  const y = Layout.topAt(p, x) + Layout.profileNoise(x / TOP_WAVE_STRETCH, p.seed * TOP_WAVE_SEED_MUL) * TOP_WAVE
  return y + endRound(p, x, 1) - Layout.wallFillet(x, y, wallScale(p))
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
  return Layout.baseSegments(p).filter(s => Math.abs(s.y2 - s.y1) > SLOPE_MIN_RISE && Math.abs(s.y2 - s.y1) <= SLOPE_MAX * (s.x2 - s.x1)).map(s => ({ x1: s.x1, x2: s.x2 }))
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
  const leanL = span.freeL && !joinedBelow ? endShape(p, -1).lean : 0
  const leanR = span.freeR ? endShape(p, 1).lean : 0
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
  const hollows = p.hollows ?? []
  hollows.forEach(h => edges.push({ name: 'edgeB', pts: Layout.hollowArc(h) }))
  const holes = hollows.map(h => ({ first: Layout.hollowOutline(h), last: Layout.hollowOutline(h, HOLLOW_SPILL) }))
  return { core, edges, corners, top: topOf(p, span), slopes: slopesOf(p), envelope, holes, feathers: joinedBelow ? [joinFeather(p, underL)] : [] }
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
  const bow = endShape(p, -inward).bow
  const n = Math.max(1, Math.round((y1 - y0) / FACE_STEP))
  for (let i = 0; i <= n; i++) {
    const u = i / n
    const y = y0 + (y1 - y0) * u
    const calm = Math.min(1, (y - y0) / FACE_CALM)
    const wave = Layout.profileNoise(y / FACE_STRETCH, p.seed * FACE_SEED_MUL + inward) * FACE_AMP +
      Layout.profileNoise(y / FACE_FINE_STRETCH, p.seed * FACE_FINE_SEED_MUL + inward) * FACE_FINE_AMP
    pts.push({ x: x0 + (x1 - x0) * u + (wave * calm - bow * Math.sin(Math.PI * u)) * inward, y })
  }
  return pts
}
//
// A free end's own shape (side -1: the left end, 1: the right one), picked
// once from the platform's seed: how its top rounds down, how its face
// leans and bows, how it tapers.
//
function endShape(p, side) {
  const key = `${p.id}${side}`
  if (endShapes.has(key)) return endShapes.get(key)
  const rng = createSeededRandom(p.seed * END_SEED + side + END_SEED)
  const shape = {
    round: END_ROUND + rng() * END_ROUND_RANGE,
    lean: END_LEAN + rng() * END_LEAN_RANGE,
    bow: rng() * END_BOW,
    taper: END_TAPER + rng() * END_TAPER_RANGE,
    share: END_SHARE + rng() * END_SHARE_RANGE
  }
  endShapes.set(key, shape)
  return shape
}
//
// How far a ledge's top (or underside) curves in at X as it rounds into a
// free end's face: a quarter circle of the end's radius times `scale`.
//
function endRound(p, x, scale) {
  if (p.kind !== Layout.PLATFORM_KIND.LEDGE) return 0
  const span = artSpan(p)
  const fromL = span.freeL ? x - span.x1 : Infinity
  const fromR = span.freeR ? span.x2 - x : Infinity
  if (fromL === Infinity && fromR === Infinity) return 0
  const r = endShape(p, fromL < fromR ? -1 : 1).round * scale
  const d = Math.max(0, Math.min(fromL, fromR))
  return d >= r ? 0 : r - Math.sqrt(r * r - (r - d) * (r - d))
}
//
// A platform's own wall-fillet size (by its seed).
//
function wallScale(p) {
  return WALL_FILLET_MIN + (p.seed % WALL_FILLET_STEPS) / WALL_FILLET_STEPS * WALL_FILLET_RANGE
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
  if (fromL === Infinity && fromR === Infinity) return 1
  const end = endShape(p, fromL < fromR ? -1 : 1)
  const f = Math.max(0, Math.min(1, Math.min(fromL, fromR) / end.taper))
  return end.share + (1 - end.share) * Math.sqrt(1 - (1 - f) * (1 - f))
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
// Clusters of stones resting on the top here and there (none in the lake
// or by the level's creatures), each stone on the art's own surface.
//
function surfaceStones(layer, p) {
  const rng = createSeededRandom(p.seed + 5)
  const span = artSpan(p)
  const names = Earth.soilRocks()
  const from = span.freeL ? span.x1 + SURFACE_END_CLEAR : Math.max(span.x1, Layout.WALL_COLLIDE_W)
  const to = span.freeR ? span.x2 - SURFACE_END_CLEAR : Math.min(span.x2, Layout.WORLD_W - Layout.WALL_COLLIDE_W)
  const spots = SPOTS.filter(spot => spot.on === p.id)
  for (let x = from + rng() * CLUSTER_GAP; x < to; x += CLUSTER_GAP * (1 + (rng() - 0.5) * CLUSTER_GAP_JITTER)) {
    const clear = !spots.some(spot => Math.abs(spot.x - x) < SPOT_CLEAR) && !(p === Layout.lakeFloor() && x > Layout.LAKE_X1 - LAKE_CLEAR && x < Layout.LAKE_X2 + LAKE_CLEAR)
    clear && stoneCluster(layer, p, rng, names, x)
  }
}
//
// One cluster round x: the big stone (recorded for the front), the small
// ones either side of it baked into the platform.
//
function stoneCluster(layer, p, rng, names, x) {
  const big = restingStone(layer, p, rng, names, x, BIG_H_MIN + rng() * BIG_H_RANGE)
  bigStones.has(p.id) ? bigStones.get(p.id).push(big) : bigStones.set(p.id, [big])
  stoneSpans.has(p.id) || stoneSpans.set(p.id, [])
  stoneSpans.get(p.id).push(spanOf(big))
  const halfW = Atlas.widthAt(big.name, big.h) / 2
  const count = SMALL_MIN + Math.floor(rng() * (SMALL_RANGE + 1))
  for (let n = 0; n < count; n++) {
    const side = n % 2 ? -1 : 1
    const small = restingStone(layer, p, rng, names, x + side * (halfW * SMALL_NEAR + rng() * (halfW * (1 - SMALL_NEAR) + SMALL_SPREAD)), SMALL_H_MIN + rng() * SMALL_H_RANGE)
    Earth.restStone(layer.ctx, rng, small, small.surface, gx => layerSurfaceAt(layer, p, gx))
    stoneSpans.get(p.id).push(spanOf(small))
  }
}
//
// The stretch of top a stone and its joints take.
//
function spanOf(stone) {
  const half = Earth.restSpread(Atlas.widthAt(stone.name, stone.h)) / 2
  return { x1: stone.x - half, x2: stone.x + half }
}
//
// A stone of the given height resting at x on the lowest soil under its
// foot (`surface`).
//
function restingStone(layer, p, rng, names, x, height) {
  const name = names[Math.floor(rng() * names.length)]
  const h = Math.min(Atlas.naturalHeight(name), height)
  const half = Atlas.widthAt(name, h) / 2 * FOOT_SHARE
  let surface = -Infinity
  for (let dx = -half; dx <= half; dx += FOOT_STEP) surface = Math.max(surface, layerSurfaceAt(layer, p, x + dx))
  return { name, h, x, p, surface, foot: surface + h * REST_SINK, flip: rng() < 0.5, angle: (rng() * 2 - 1) * SURFACE_TURN }
}
//
// The soil's top in a layer at X (its scanned surface; the base line where
// a column is empty).
//
function layerSurfaceAt(layer, p, x) {
  const y = layer.surface[Math.round(x - layer.x)]
  return y === undefined || Number.isNaN(y) ? baseAt(p, x) : y
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
//
// A face's X at a Y (between its points, held at its ends).
//
function faceXAt(pts, y) {
  const i = Math.min(pts.length - 1, Math.max(1, pts.findIndex(pt => pt.y >= y)))
  const a = pts[i - 1]
  const b = pts[i]
  const u = b.y === a.y ? 0 : Math.max(0, Math.min(1, (y - a.y) / (b.y - a.y)))
  return a.x + (b.x - a.x) * u
}
