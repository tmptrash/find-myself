import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from './cave-layout.js'
//
// How the lake's surface looks (its springs: utils/water-wave.js), after
// Rain World's pools: no glowing outline but a thin layer of water — the
// baked band (a faint contour over a softly lit strip, the water fading
// to see-through under it, cave-lake.js bakes it) bent to the springs —
// with broken moving highlights on it. The band's top rows down to
// BAND_RIGID px under the surface ride the wave whole, the rest
// stretches down to the still body's top, so no gap opens between them.
//
// The highlights: where one shows is a slow value noise sliding along the
// surface (HL.drift px/s), two octaves mixed by HL.lengthVariation, cut at
// HL.density with soft ends — short and long pieces, never in step; how
// bright, by the water there: HL.calm on still water, more on a sharp
// crest, a steep slope or moving water (which also wakes more of them).
// The main ones lie on the contour, thicker where brighter, each with a
// darker strip of HL.shade under it; two fainter, thinner ones run under
// the surface at depths of their own wandering with another noise
// (FAINT_DEPTH ± FAINT_DEPTH_VAR), shorter, sliding their own ways — never
// a copy of the surface line.
//
// Drawing: the lake's columns (its ends and every spring) are cut into
// chunks of CHUNK_COLS, each with its vectors, colours, opacities and
// indices made once and reused; only chunks in view are worked out and
// drawn: the band's textured strip, then (once the body and lining are
// drawn over the band) the highlights, untextured with an opacity per
// vertex — Kaplay's fast path, nothing allocated.
//
const HL = CAVE_CFG.water.highlight
export const BAND_ABOVE = 6
export const BAND_BELOW = 36
export const BAND_PAD = 1
export const BAND_TEX_H = BAND_ABOVE + BAND_BELOW + BAND_PAD * 2
const BAND_RIGID = 12
const BAND_ROWS = 3
const CHUNK_COLS = 16
//
// The highlight strips: the main one, its shade (SHADE_W px under it) and
// the two faint ones (each a strip of LAYER_ROWS vertices a column); the
// main one starts CONTOUR_UP px over the surface (on the contour).
//
const MAIN = 0
const SHADE = 1
const FAINT = 2
const FAINT_COUNT = 2
const LAYERS = FAINT + FAINT_COUNT
const LAYER_ROWS = 2
const SHADE_W = 2
const CONTOUR_UP = 0.5
//
// The faint ones: depth under the surface and how far it wanders, their
// pieces' length and drift (shares of the main ones'), their thickness
// (share of the main one's), and how slowly their depths wander (noise
// units/s).
//
const FAINT_DEPTH = [3.5, 8]
const FAINT_DEPTH_VAR = [2, 3.5]
const FAINT_LEN = [0.45, 0.3]
const FAINT_DRIFT = [-1.6, 1.3]
const FAINT_THICK = 0.7
const DEPTH_LEN = 2
const DEPTH_DRIFT = 0.15
//
// The noise: NOISE_SIZE values (seeded), the finer octave OCTAVE times
// shorter, each layer read OCTAVE_OFFSET / LAYER_OFFSET / DEPTH_OFFSET
// noise units apart; a highlight's ends fade over FADE_SOFT of it.
//
const NOISE_SIZE = 256
const NOISE_MASK = NOISE_SIZE - 1
const NOISE_SEED = 9120
const OCTAVE = 2.7
const OCTAVE_OFFSET = 37.3
const LAYER_OFFSET = 61.7
const DEPTH_OFFSET = 113.9
const FADE_SOFT = 0.12
//
// The water's motion counts in full at ENERGY_V px/s; the highlights die
// out over SHORE_TAPER springs at the banks.
//
const ENERGY_V = 40
const SHORE_TAPER = 5
const HALF = 0.5

/**
 * Creates the surface's look over the lake's span.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x1 - World X of the lake's left end
 * @param {number} cfg.x2 - World X of the lake's right end
 * @param {Object} cfg.wave - The surface's springs (water-wave.js)
 * @param {string} cfg.sprite - The baked band's sprite
 * @returns {Object} Surface instance
 */
export function create(cfg) {
  const { k, x1, x2, wave, sprite } = cfg
  const cols = columns(x1, x2, wave)
  const n = cols.xs.length
  const inst = {
    k,
    x1,
    x2,
    wave,
    sprite,
    xs: cols.xs,
    springs: cols.springs,
    y: new Float32Array(n),
    main: new Float32Array(n),
    faint: [new Float32Array(n), new Float32Array(n)],
    depth: [new Float32Array(n), new Float32Array(n)],
    noise: noiseTable(),
    color: getRGB(k, HL.color),
    shade: getRGB(k, HL.shade),
    chunks: [],
    from: 0,
    to: -1
  }
  for (let a = 0; a < n - 1; a += CHUNK_COLS) inst.chunks.push(createChunk(inst, a, Math.min(n - 1, a + CHUNK_COLS)))
  return inst
}

/**
 * Works out the surface in view this frame and draws its band.
 * @param {Object} inst - Surface instance
 * @param {{left: number, right: number}} view - Visible world rect
 */
export function onDrawBand(inst, view) {
  inView(inst, view)
  if (inst.to < inst.from) return
  surfaceY(inst)
  lightUp(inst)
  const frame = inst.k.getSprite(inst.sprite)?.data?.frames?.[0]
  if (!frame) return
  for (const chunk of inst.chunks) chunk.seen && drawBandChunk(inst, chunk, frame)
}

/**
 * Draws the highlights over the surface in view (after onDrawBand).
 * @param {Object} inst - Surface instance
 */
export function onDrawHighlights(inst) {
  for (const chunk of inst.chunks) chunk.seen && drawHighlightChunk(inst, chunk)
}
//
// The lake's columns: its ends (where they lie off the springs) and every
// spring between them.
//
function columns(x1, x2, wave) {
  const xs = []
  const springs = []
  if (x1 < wave.x1) {
    xs.push(x1)
    springs.push(-1)
  }
  for (let i = 0; i < wave.count; i++) {
    xs.push(wave.x1 + i * wave.dx)
    springs.push(i)
  }
  if (x2 > wave.x2) {
    xs.push(x2)
    springs.push(-1)
  }
  return { xs: Float32Array.from(xs), springs: Int16Array.from(springs) }
}
//
// One chunk of columns `a`..`b`: its band strip (BAND_ROWS vertices a
// column, the bottom row still) and its highlight strips (LAYERS strips
// of LAYER_ROWS vertices a column, their colours set once).
//
function createChunk(inst, a, b) {
  const k = inst.k
  const cols = b - a + 1
  const bandPts = []
  const pts = []
  const colors = []
  const opacities = []
  for (let c = a; c <= b; c++) bandPts.push(k.vec2(inst.xs[c], 0), k.vec2(inst.xs[c], 0), k.vec2(inst.xs[c], Layout.LAKE_SURFACE_Y + BAND_BELOW))
  const indices = []
  for (let layer = 0; layer < LAYERS; layer++) {
    gridIndices(indices, layer * cols * LAYER_ROWS, cols, LAYER_ROWS)
    const color = layer === SHADE ? inst.shade : inst.color
    for (let c = a; c <= b; c++) {
      pts.push(k.vec2(inst.xs[c], 0), k.vec2(inst.xs[c], 0))
      colors.push(color, color)
      opacities.push(0, 0)
    }
  }
  return {
    a,
    b,
    cols,
    left: inst.xs[a],
    right: inst.xs[b],
    seen: false,
    band: { pts: bandPts, uv: null, tex: null, indices: gridIndices([], 0, cols, BAND_ROWS) },
    lights: { pts, colors, opacities, indices }
  }
}
//
// Quads (two triangles each) between every two columns and rows of a grid
// of `cols` columns of `rows` vertices from vertex `base`, onto `out`.
//
function gridIndices(out, base, cols, rows) {
  for (let c = 0; c + 1 < cols; c++) {
    for (let r = 0; r + 1 < rows; r++) {
      const v = base + c * rows + r
      const w = v + rows
      out.push(v, w, v + 1, w, w + 1, v + 1)
    }
  }
  return out
}
//
// Which chunks are in view, and the columns they cover (with one more
// each side, for the slopes).
//
function inView(inst, view) {
  inst.from = inst.xs.length
  inst.to = -1
  for (const chunk of inst.chunks) {
    chunk.seen = chunk.right >= view.left && chunk.left <= view.right
    if (!chunk.seen) continue
    inst.from = Math.min(inst.from, Math.max(0, chunk.a - 1))
    inst.to = Math.max(inst.to, Math.min(inst.xs.length - 1, chunk.b + 1))
  }
}
//
// The surface's world Y at every column in view.
//
function surfaceY(inst) {
  const { springs, y, wave } = inst
  for (let c = inst.from; c <= inst.to; c++) y[c] = Layout.LAKE_SURFACE_Y + (springs[c] < 0 ? 0 : wave.y[springs[c]])
}
//
// How bright the highlights are at every column in view (see HL), and
// where the faint ones lie.
//
function lightUp(inst) {
  const { xs, springs, y, wave } = inst
  const t = inst.k.time()
  for (let c = inst.from; c <= inst.to; c++) {
    const s = springs[c]
    if (s < 0) {
      inst.main[c] = 0
      inst.faint[0][c] = 0
      inst.faint[1][c] = 0
      continue
    }
    const l = y[Math.max(0, c - 1)]
    const r = y[Math.min(xs.length - 1, c + 1)]
    const slope = Math.abs(r - l) / (2 * wave.dx)
    const crest = Math.max(0, l + r - 2 * y[c])
    const energy = Math.min(1, Math.abs(wave.v[s]) / ENERGY_V)
    const shore = Math.min(1, s / SHORE_TAPER, (wave.count - 1 - s) / SHORE_TAPER)
    const lit = shore * Math.min(1, HL.calm + HL.crestGain * crest + HL.slopeGain * slope + HL.motionGain * energy)
    const excite = HL.exciteGain * energy
    inst.main[c] = lit * pieces(inst, xs[c], t, 0, HL.length, HL.drift, HL.density + excite)
    for (let f = 0; f < FAINT_COUNT; f++) {
      inst.faint[f][c] = lit * pieces(inst, xs[c], t, f + 1, HL.length * FAINT_LEN[f], HL.drift * FAINT_DRIFT[f], HL.secondaryDensity + excite)
      const wander = sample(inst.noise, xs[c] / (HL.length * DEPTH_LEN) + DEPTH_OFFSET * (f + 1) + t * DEPTH_DRIFT)
      inst.depth[f][c] = FAINT_DEPTH[f] + FAINT_DEPTH_VAR[f] * (2 * wander - 1)
    }
  }
}
//
// Whether a layer's highlight lies at world X now (0 … 1, soft at its
// ends): its noise sliding `drift` px/s, pieces about `length` px long,
// `density` of the surface covered.
//
function pieces(inst, x, t, layer, length, drift, density) {
  const u = (x - drift * t) / length + layer * LAYER_OFFSET
  const lv = HL.lengthVariation
  const n = (1 - lv) * sample(inst.noise, u) + lv * sample(inst.noise, u * OCTAVE + OCTAVE_OFFSET)
  return Math.max(0, Math.min(1, (n - 1 + density) / FADE_SOFT))
}
//
// Smooth value noise at `u` (0 … 1), wrapping round its table.
//
function sample(noise, u) {
  const i = Math.floor(u)
  const f = u - i
  const a = noise[i & NOISE_MASK]
  const b = noise[(i + 1) & NOISE_MASK]
  return a + (b - a) * f * f * (3 - 2 * f)
}
function noiseTable() {
  const rng = createSeededRandom(NOISE_SEED)
  return Float32Array.from({ length: NOISE_SIZE }, () => rng())
}
//
// A chunk of the band bent to the surface: its top and rigid rows moved
// to each column's surface (the texture coordinates set on its first
// draw, once the bake's place on its texture is known).
//
function drawBandChunk(inst, chunk, frame) {
  const band = chunk.band
  if (!band.uv) {
    band.uv = bandUv(inst, chunk, frame.q)
    band.tex = frame.tex
  }
  for (let c = chunk.a; c <= chunk.b; c++) {
    const v = (c - chunk.a) * BAND_ROWS
    band.pts[v].y = inst.y[c] - BAND_ABOVE
    band.pts[v + 1].y = inst.y[c] + BAND_RIGID
  }
  inst.k.drawPolygon(band)
}
//
// Where a chunk's band vertices take their colour from in the bake
// (inside its pads), on its texture quad `q`.
//
function bandUv(inst, chunk, q) {
  const rows = [BAND_PAD, BAND_PAD + BAND_ABOVE + BAND_RIGID, BAND_PAD + BAND_ABOVE + BAND_BELOW]
  const uv = []
  for (let c = chunk.a; c <= chunk.b; c++) {
    const u = q.x + (inst.xs[c] - inst.x1) / (inst.x2 - inst.x1) * q.w
    for (const row of rows) uv.push(inst.k.vec2(u, q.y + row / BAND_TEX_H * q.h))
  }
  return uv
}
//
// A chunk's highlights this moment: the main one on the contour (thicker
// where brighter) with its shade under it, the faint ones at their depths.
//
function drawHighlightChunk(inst, chunk) {
  const lights = chunk.lights
  for (let c = chunk.a; c <= chunk.b; c++) {
    const i = c - chunk.a
    const y = inst.y[c]
    const main = inst.main[c]
    const top = y - CONTOUR_UP
    const thick = HL.thickness * Math.max(0, 1 + HL.thicknessVariation * (main - HALF))
    setPair(lights, chunk.cols, MAIN, i, top, top + thick, HL.brightness * main)
    setPair(lights, chunk.cols, SHADE, i, top + thick, top + thick + SHADE_W, HL.shadeAlpha * main)
    for (let f = 0; f < FAINT_COUNT; f++) {
      const faint = inst.faint[f][c]
      const mid = y + inst.depth[f][c]
      const half = HL.thickness * FAINT_THICK * Math.max(0, 1 + HL.thicknessVariation * (faint - HALF)) * HALF
      setPair(lights, chunk.cols, FAINT + f, i, mid - half, mid + half, HL.brightness * HL.secondaryBrightness * faint)
    }
  }
  inst.k.drawPolygon(lights)
}
//
// One column's two vertices of a highlight strip: their Ys and opacity.
//
function setPair(lights, cols, layer, i, top, bottom, alpha) {
  const v = (layer * cols + i) * LAYER_ROWS
  lights.pts[v].y = top
  lights.pts[v + 1].y = bottom
  lights.opacities[v] = alpha
  lights.opacities[v + 1] = alpha
}
