import { applyParallaxPostFxToContext, FOREST_LAYER_GRADE } from '../../forest/utils/forest-parallax-grain.js'
import { forestDepthBlurRadiusPx } from '../../forest/utils/forest-focus-depth.js'
import { forestRgb } from '../../forest/utils/forest-palette.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from './cave-layout.js'
import { paintRubble, paintLedge as paintRockLedge } from './cave-ledge.js'
import {
  CAVE_PAL,
  css,
  paintRockMass,
  paintEdgeFern,
  paintHangingVine,
  sampleEdge,
  smoothPath,
  polygonBounds,
  insidePath
} from './cave-paint.js'
//
// Back parallax of cave lesson 0 in the look of the cave reference: a deep
// blue-teal far wall, then rock ledges in the very look of the gameplay
// ones (light grey rubble, moss, grass, flowers, ferns, vines) reaching in
// from the sides and floating free — the row's grade, shade and blur make
// them darker and softer — and the darkest rubble masses nearest the camera. Plants only grow
// out of rock (nothing hangs in mid air). Three rows lag behind the camera
// on both axes; all bake at half resolution and draw stretched back.
//
const BAKE_SCALE = 0.5
const SPRITE_PREFIX = 'cave0-parallax-v10'
const GRAIN_SEED_BASE = 8400
const EDGE_STEP = 8
const OUTSIDE_PAD = 12
const HALF_PI = Math.PI / 2
const HALF = 0.5
//
// The forest depth blur is softened here so the back rows stay readable.
//
const BLUR_SCALE = 0.45
//
// Rows: camera-follow fraction, seed, the forest depth rules (grade = lower
// contrast / saturation toward the row's haze, blur tier) and how far each
// is pushed into the cave shade (far deepest, so the gameplay plane reads
// first).
//
const LAYERS = [
  { id: 'far', speed: 0.22, seed: 601, shade: 0.72, grade: FOREST_LAYER_GRADE.far, blurTier: 'background' },
  { id: 'mid', speed: 0.46, seed: 602, shade: 0.55, grade: FOREST_LAYER_GRADE.mid, blurTier: 'midground' },
  { id: 'near', speed: 0.7, seed: 603, shade: 0.6, grade: FOREST_LAYER_GRADE.near, blurTier: 'nearground' }
]
const RGBA_STRIDE = 4
const BYTE = 255
//
// Far wall: stone size.
//
const FAR_STONE_SCALE = 3.4
//
// Mid row: rock ledges growing from both side walls, and free-floating
// ones in between (sizes in layer px; reach as a share of the row width).
//
const MID_LEDGES = 9
const MID_LEDGE_REACH_MIN = 0.18
const MID_LEDGE_REACH_RANGE = 0.18
const MID_LEDGE_THICK_MIN = 70
const MID_LEDGE_THICK_RANGE = 60
const MID_FLOATERS = 7
const MID_FLOATER_W_MIN = 130
const MID_FLOATER_W_RANGE = 150
const MID_FLOATER_THICK_MIN = 50
const MID_FLOATER_THICK_RANGE = 40
const MID_FLOATER_MARGIN = 150
const MID_SEED_STEP = 7
const MID_VINE_LEN_MIN = 40
const MID_VINE_LEN_RANGE = 200
//
// Near row: darkest rubble side masses, dark vines hanging from their faces
// and big leafy silhouettes along them.
//
const NEAR_SIDE_W = 110
const NEAR_SIDE_AMP = 60
const NEAR_SIDE_FREQ = 0.6
const NEAR_VINE_COUNT = 22
const NEAR_VINE_SCALE = 1.6
const NEAR_FERN_COUNT = 14
const NEAR_FERN_SCALE = 2.4
const NEAR_FACE_TUCK = 6
//
// Spots on a ledge's top (share of its span from the wall end): a
// background mushroom, and on every other ledge an eye.
//
const LEDGE_MUSHROOM_AT = 0.35
//
// Eyes growing from the tops of the mid row's rocks (not all of them),
// at the far side from the mushroom spot.
//
const BACK_EYE_EVERY = 2
const BACK_EYE_AT = 0.82
const LEDGE_SEED_SPREAD = 10
const parallaxByK = new WeakMap()

/**
 * Bakes (once per live k) the three back rows.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @returns {Object} Parallax instance
 */
export function create(cfg) {
  const { k } = cfg
  const cached = parallaxByK.get(k)
  if (cached) return cached
  const layers = LAYERS.map((layer, i) => bakeLayer(k, layer, i))
  const inst = { k, layers, backEyes: layers.find(l => l.id === 'mid').eyes }
  parallaxByK.set(k, inst)
  return inst
}

/**
 * World position of a point given in a row's own (layer) coordinates for
 * the current view — used for live props that ride with a row.
 * @param {Object} inst - Parallax instance
 * @param {string} id - Row id ('far' | 'mid' | 'near')
 * @param {number} lx - Layer X
 * @param {number} ly - Layer Y
 * @param {number} viewLeft - View left world X
 * @param {number} viewTop - View top world Y
 * @returns {{x: number, y: number}}
 */
export function toWorld(inst, id, lx, ly, viewLeft, viewTop) {
  const layer = inst.layers.find(l => l.id === id)
  return { x: lx + Math.round(viewLeft * (1 - layer.speed)), y: ly + Math.round(viewTop * (1 - layer.speed)) }
}

/**
 * Ground points on the mid row's ledges and platforms (layer coordinates)
 * where background mushrooms can stand.
 * @param {Object} inst - Parallax instance
 * @returns {Array<{x: number, y: number}>}
 */
export function mushroomAnchors(inst) {
  return inst.layers.find(l => l.id === 'mid').anchors
}

/**
 * Anchors for eyes growing from the mid row's rocks (layer coordinates).
 * @param {Object} inst - Parallax instance
 * @returns {Array<{x: number, y: number}>}
 */
export function backEyeAnchors(inst) {
  return inst.backEyes
}

/**
 * Draws every row for the current view.
 * @param {Object} inst - Parallax instance
 * @param {number} viewLeft - View left world X
 * @param {number} viewTop - View top world Y
 * @param {string[]|null} [ids] - Only these rows (all when null)
 */
export function onDraw(inst, viewLeft, viewTop, ids = null) {
  const k = inst.k
  inst.layers.forEach(layer => {
    if (ids && !ids.includes(layer.id)) return
    k.drawSprite({
      sprite: layer.name,
      pos: k.vec2(Math.round(viewLeft * (1 - layer.speed)), Math.round(viewTop * (1 - layer.speed))),
      width: layer.w,
      height: layer.h
    })
  })
}
//
// One row canvas sized so the lagging layer still covers the tallest view
// at the bottom of the world.
//
function bakeLayer(k, layer, index) {
  const w = Layout.WORLD_W
  const h = Math.ceil((Layout.WORLD_H - Layout.MAX_VIEW_H) * layer.speed + Layout.MAX_VIEW_H)
  const canvas = document.createElement('canvas')
  canvas.width = Math.ceil(w * BAKE_SCALE)
  canvas.height = Math.ceil(h * BAKE_SCALE)
  const ctx = canvas.getContext('2d')
  ctx.scale(BAKE_SCALE, BAKE_SCALE)
  const rng = createSeededRandom(layer.seed)
  layer.id === 'far' && paintFar(ctx, w, h, rng)
  const anchors = []
  const eyes = []
  layer.id === 'mid' && paintMid(ctx, w, h, rng, anchors, eyes)
  layer.id === 'near' && paintNear(ctx, w, h, rng)
  applyParallaxPostFxToContext(ctx, canvas.width, canvas.height, {
    blurRadius: forestDepthBlurRadiusPx(layer.blurTier) * BAKE_SCALE * BLUR_SCALE,
    grade: { ...layer.grade, haze: forestRgb(CAVE_PAL.backHaze[layer.id]) },
    grainSeedOffset: GRAIN_SEED_BASE + index
  })
  shadeCanvas(canvas, layer.shade)
  const name = `${SPRITE_PREFIX}-${layer.id}`
  k.loadSprite(name, canvas)
  return { id: layer.id, name, speed: layer.speed, seed: layer.seed, w, h, anchors, eyes }
}
//
// Opaque far wall: one big mass of large, low-contrast stones.
//
function paintFar(ctx, w, h, rng) {
  const tones = CAVE_PAL.backWall
  ctx.fillStyle = css(tones[1])
  ctx.fillRect(0, 0, w, h)
  const pad = OUTSIDE_PAD
  paintRockMass(ctx, [{ x: -pad, y: -pad }, { x: w + pad, y: -pad }, { x: w + pad, y: h + pad }, { x: -pad, y: h + pad }], rng,
    { tones, stoneScale: FAR_STONE_SCALE, contour: false })
}
//
// Mid row: free-floating ledges first (further back), then ledges from
// alternating side walls, all in the gameplay ledge look.
//
function paintMid(ctx, w, h, rng, anchors, eyes) {
  const style = CAVE_CFG.ledge.back
  for (let i = 0; i < MID_FLOATERS; i++) {
    const width = MID_FLOATER_W_MIN + rng() * MID_FLOATER_W_RANGE
    const x1 = MID_FLOATER_MARGIN + rng() * (w - MID_FLOATER_MARGIN * 2 - width)
    const y = h * (i + rng()) / MID_FLOATERS
    const thick = MID_FLOATER_THICK_MIN + rng() * MID_FLOATER_THICK_RANGE
    paintBackLedge(ctx, { x1, x2: x1 + width, y, wall: rng() < HALF ? 'left' : 'right' }, { ...style, seed: style.seed + i * MID_SEED_STEP, thick }, i, anchors, eyes)
  }
  const step = h / MID_LEDGES
  for (let i = 0; i < MID_LEDGES; i++) {
    const left = i % 2 === 0
    const y = step * (i + HALF) + (rng() - HALF) * step * HALF
    const reach = w * (MID_LEDGE_REACH_MIN + rng() * MID_LEDGE_REACH_RANGE)
    const thick = MID_LEDGE_THICK_MIN + rng() * MID_LEDGE_THICK_RANGE
    const p = { x1: left ? 0 : w - reach, x2: left ? reach : w, y, wall: left ? 'left' : 'right' }
    paintBackLedge(ctx, p, { ...style, seed: style.seed + (MID_FLOATERS + i) * MID_SEED_STEP, thick }, i, anchors, eyes)
  }
}
//
// One back ledge (fully baked) and its mushroom / eye spots on top.
//
function paintBackLedge(ctx, p, style, i, anchors, eyes) {
  const span = p.x2 - p.x1
  const fromWall = share => (p.wall === 'left' ? p.x1 + span * share : p.x2 - span * share)
  paintRockLedge(ctx, { ...p, h: style.thick, kind: Layout.PLATFORM_KIND.LEDGE }, style, { x1: p.x1, x2: p.x2 })
  anchors.push({ x: fromWall(LEDGE_MUSHROOM_AT), y: p.y })
  i % BACK_EYE_EVERY || eyes.push({ x: fromWall(BACK_EYE_AT), y: p.y })
}
//
// Dark rubble mass inside an outline, stones sinking into shadow below its
// top line.
//
function paintBackRubble(ctx, pts, colors, topAt, rng) {
  const path = smoothPath(pts)
  paintRubble(ctx, {
    path,
    bounds: polygonBounds(pts),
    sizes: colors.stones,
    colors,
    inside: (x, y) => insidePath(ctx, path, x, y),
    shadeAt: st => Math.min(1, Math.max(0, st.y - topAt(st.x)) / CAVE_CFG.parallax.shadeDepth)
  }, rng)
}
//
// Near row: darkest rubble side masses, dark vines hanging from their faces
// and big leafy silhouettes along them.
//
function paintNear(ctx, w, h, rng) {
  const colors = CAVE_CFG.parallax.near
  const seed = rng() * LEDGE_SEED_SPREAD
  const leftX = y => NEAR_SIDE_W + Layout.profileNoise(y * NEAR_SIDE_FREQ, seed) * NEAR_SIDE_AMP
  const rightX = y => w - NEAR_SIDE_W - Layout.profileNoise(y * NEAR_SIDE_FREQ, seed + 4) * NEAR_SIDE_AMP
  const left = sampleEdge(-OUTSIDE_PAD, h + OUTSIDE_PAD, EDGE_STEP, y => ({ x: leftX(y), y }))
  const right = sampleEdge(-OUTSIDE_PAD, h + OUTSIDE_PAD, EDGE_STEP, y => ({ x: rightX(y), y }))
  paintBackRubble(ctx, [{ x: -OUTSIDE_PAD, y: -OUTSIDE_PAD }, ...left, { x: -OUTSIDE_PAD, y: h + OUTSIDE_PAD }], colors, () => -h, rng)
  paintBackRubble(ctx, [{ x: w + OUTSIDE_PAD, y: -OUTSIDE_PAD }, ...right, { x: w + OUTSIDE_PAD, y: h + OUTSIDE_PAD }], colors, () => -h, rng)
  for (let i = 0; i < NEAR_VINE_COUNT; i++) {
    const onLeft = i % 2 === 0
    const y = rng() * h
    const x = onLeft ? leftX(y) - NEAR_FACE_TUCK : rightX(y) + NEAR_FACE_TUCK
    paintHangingVine(ctx, x, y, MID_VINE_LEN_MIN + rng() * MID_VINE_LEN_RANGE, rng, { tones: CAVE_PAL.backVineDark, scale: NEAR_VINE_SCALE, contour: false, crown: true })
  }
  for (let i = 0; i < NEAR_FERN_COUNT; i++) {
    const onLeft = i % 2 === 0
    const y = rng() * h
    paintEdgeFern(ctx, onLeft ? leftX(y) : rightX(y), y, onLeft ? HALF_PI : -HALF_PI, rng, NEAR_FERN_SCALE, CAVE_PAL.backNear.slice(1))
  }
}
//
// Pulls every painted pixel toward the cave shade (multiplies it by the
// darkness swatch by `amount`), keeping alpha.
//
function shadeCanvas(canvas, amount) {
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const data = image.data
  const tint = forestRgb(CAVE_PAL.darkness)
  const mul = [tint.r, tint.g, tint.b].map(c => 1 - amount * (1 - c / BYTE))
  for (let i = 0; i < data.length; i += RGBA_STRIDE) {
    data[i] = Math.round(data[i] * mul[0])
    data[i + 1] = Math.round(data[i + 1] * mul[1])
    data[i + 2] = Math.round(data[i + 2] * mul[2])
  }
  ctx.putImageData(image, 0, 0)
}
