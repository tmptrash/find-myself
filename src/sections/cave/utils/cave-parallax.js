import { applyParallaxPostFxToContext, FOREST_LAYER_GRADE } from '../../forest/utils/forest-parallax-grain.js'
import { forestDepthBlurRadiusPx } from '../../forest/utils/forest-focus-depth.js'
import { forestRgb } from '../../forest/utils/forest-palette.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as Layout from './cave-layout.js'
import {
  CAVE_PAL,
  css,
  paintRockMass,
  paintMossRim,
  paintRoot,
  paintEdgeFern,
  paintHangingVine,
  paintBoulder,
  paintPlatformSlab,
  sampleEdge
} from './cave-paint.js'
//
// Back parallax of cave lesson 0 in the look of the cave reference: a deep
// blue-teal wall streaked with old roots, curtains of roots and vines
// hanging from above, mossy earth ledges with roots dripping under them,
// and the darkest silhouettes nearest the camera. Three rows lag behind the
// camera on both axes; all bake at half resolution and draw stretched back.
//
const BAKE_SCALE = 0.5
const SPRITE_PREFIX = 'cave0-parallax-v8'
const GRAIN_SEED_BASE = 8400
const EDGE_STEP = 8
const OUTSIDE_PAD = 12
const HALF_PI = Math.PI / 2
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
// Mid row: mossy earth ledges reaching in from the sides, roots and vines
// dripping from them, and vine curtains between.
//
const MID_LEDGES = 7
const MID_LEDGE_REACH_MIN = 0.22
const MID_LEDGE_REACH_RANGE = 0.22
const MID_LEDGE_THICK_MIN = 46
const MID_LEDGE_THICK_RANGE = 60
const MID_STONE_SCALE = 1.7
const MID_LEDGE_ROOTS = 4
const MID_LEDGE_VINES = 6
const MID_LEDGE_FERNS = 3
const MID_FERN_SCALE = 1.3
const MID_CURTAIN_COUNT = 40
const MID_VINE_LEN_MIN = 60
const MID_VINE_LEN_RANGE = 220
const MID_VINE_SCALE = 1.2
const DARK_VINE_EVERY = 2
//
// Near row: darkest side masses with big hanging root clusters and dark
// leafy silhouettes.
//
const NEAR_SIDE_W = 110
const NEAR_SIDE_AMP = 60
const NEAR_SIDE_FREQ = 0.6
const NEAR_STONE_SCALE = 1.4
const NEAR_ROOT_CLUSTERS = 10
const NEAR_ROOTS_PER_CLUSTER = 4
const NEAR_ROOT_THICK_MIN = 4
const NEAR_ROOT_THICK_RANGE = 5
const NEAR_ROOT_SPREAD = 40
const NEAR_VINE_COUNT = 26
const NEAR_VINE_SCALE = 1.6
const NEAR_FERN_COUNT = 14
const NEAR_FERN_SCALE = 2.4
//
// Ledges: ragged top / bottom, rounded tip, Y jitter inside their band.
//
const LEDGE_TOP_AMP = 6
const LEDGE_BOTTOM_AMP = 18
const LEDGE_TIP_ROUND = 0.3
const LEDGE_Y_JITTER = 0.4
const LEDGE_ROOT_THICK_MIN = 2.5
const LEDGE_ROOT_THICK_RANGE = 3
const LEDGE_SEED_SPREAD = 10
//
// Boulders on ledges and platforms: count range and radius range.
//
const LEDGE_BOULDERS_MAX = 3
const BOULDER_R_MIN = 12
const BOULDER_R_RANGE = 22
const BOULDER_EDGE_KEEP = 0.15
//
// Background mushrooms stand on the flat wall-side part of a ledge (share
// of its span from the wall), clear of the rounded tip.
//
const LEDGE_MUSHROOM_FROM = 0.25
const LEDGE_MUSHROOM_RANGE = 0.3
//
// Darkened copies of the gameplay platforms floating in the mid row, with
// vines and an occasional boulder.
//
const BACK_PLATFORM_COUNT = 9
const BACK_PLATFORM_W_MIN = 150
const BACK_PLATFORM_W_RANGE = 130
const BACK_PLATFORM_H_MIN = 34
const BACK_PLATFORM_H_RANGE = 18
const BACK_PLATFORM_MARGIN = 120
const BACK_PLATFORM_VINES = 2
const BACK_PLATFORM_BOULDER_CHANCE = 0.5
const BACK_PLATFORM_STONE_SCALE = 1.2
const BACK_BOULDER_AT = 0.35
const BACK_MUSHROOM_BESIDE_BOULDER = 0.72
const BACK_MUSHROOM_AT = 0.5
//
// Eyes peering from the mid row's back wall (layer-space anchors).
//
const BACK_EYE_COUNT = 7
const BACK_EYE_MARGIN_X = 200
const BACK_EYE_MARGIN_Y = 80
const ROOT_DOWN_SPREAD = 0.4
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
  const inst = { k, layers, backEyes: buildBackEyes(layers.find(l => l.id === 'mid')) }
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
 * Anchors for eyes on the mid row's back wall (layer coordinates).
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
  layer.id === 'mid' && paintMid(ctx, w, h, rng, anchors)
  layer.id === 'near' && paintNear(ctx, w, h, rng)
  applyParallaxPostFxToContext(ctx, canvas.width, canvas.height, {
    blurRadius: forestDepthBlurRadiusPx(layer.blurTier) * BAKE_SCALE,
    grade: { ...layer.grade, haze: forestRgb(CAVE_PAL.backHaze[layer.id]) },
    grainSeedOffset: GRAIN_SEED_BASE + index
  })
  shadeCanvas(canvas, layer.shade)
  const name = `${SPRITE_PREFIX}-${layer.id}`
  k.loadSprite(name, canvas)
  return { id: layer.id, name, speed: layer.speed, seed: layer.seed, w, h, anchors }
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
// Mid row: vine curtains first (behind), then mossy earth ledges reaching
// in from alternating sides with roots, vines and ferns.
//
function paintMid(ctx, w, h, rng, anchors) {
  for (let i = 0; i < MID_CURTAIN_COUNT; i++) {
    const tones = i % DARK_VINE_EVERY === 0 ? CAVE_PAL.backVineDark : CAVE_PAL.backVine
    paintHangingVine(ctx, rng() * w, rng() * h, MID_VINE_LEN_MIN + rng() * MID_VINE_LEN_RANGE, rng,
      { tones, scale: MID_VINE_SCALE, contour: false, crown: true })
  }
  paintBackPlatforms(ctx, w, h, rng, anchors)
  const step = h / MID_LEDGES
  for (let i = 0; i < MID_LEDGES; i++) {
    const fromLeft = i % 2 === 0
    const y = step * (i + 0.5) + (rng() - 0.5) * step * LEDGE_Y_JITTER
    const reach = w * (MID_LEDGE_REACH_MIN + rng() * MID_LEDGE_REACH_RANGE)
    const thick = MID_LEDGE_THICK_MIN + rng() * MID_LEDGE_THICK_RANGE
    paintLedge(ctx, rng, fromLeft ? -OUTSIDE_PAD : w - reach, fromLeft ? reach : w + OUTSIDE_PAD, y, thick, fromLeft, anchors)
  }
}
//
// Mossy earth ledge: earth body, moss rim, roots and vines dripping below,
// a few ferns on top.
//
function paintLedge(ctx, rng, x1, x2, y, thick, fromLeft, anchors) {
  const seed = rng() * LEDGE_SEED_SPREAD
  const tipX = fromLeft ? x2 : x1
  const span = x2 - x1
  const taper = x => Math.min(1, Math.abs(x - tipX) / span / LEDGE_TIP_ROUND)
  const topAt = x => y + Layout.profileNoise(x, seed) * LEDGE_TOP_AMP + thick * (1 - taper(x)) / 2
  const bottomAt = x => y + thick * (0.5 + taper(x) / 2) + Layout.profileNoise(x, seed + 1) * LEDGE_BOTTOM_AMP * taper(x)
  const top = sampleEdge(x1, x2, EDGE_STEP, x => ({ x, y: topAt(x) }))
  const bottom = sampleEdge(x2, x1, EDGE_STEP, x => ({ x, y: bottomAt(x) }))
  paintRockMass(ctx, [...top, ...bottom], rng, { tones: CAVE_PAL.backRock, stoneScale: MID_STONE_SCALE, edgeStones: true, smooth: true })
  paintMossRim(ctx, x1, x2, topAt, rng)
  for (let i = 0; i < MID_LEDGE_ROOTS; i++) {
    const x = x1 + span * rng()
    paintRoot(ctx, x, bottomAt(x) - EDGE_STEP, HALF_PI + (rng() - 0.5) * ROOT_DOWN_SPREAD, LEDGE_ROOT_THICK_MIN + rng() * LEDGE_ROOT_THICK_RANGE, rng)
  }
  for (let i = 0; i < MID_LEDGE_VINES; i++) {
    const x = x1 + span * rng()
    paintHangingVine(ctx, x, bottomAt(x) - EDGE_STEP, MID_VINE_LEN_MIN + rng() * MID_VINE_LEN_RANGE, rng,
      { tones: CAVE_PAL.backVine, scale: MID_VINE_SCALE, contour: false, crown: true })
  }
  for (let i = 0; i < MID_LEDGE_FERNS; i++) {
    const x = x1 + span * rng()
    paintEdgeFern(ctx, x, topAt(x), 0, rng, MID_FERN_SCALE, CAVE_PAL.backPlant)
  }
  const mushT = LEDGE_MUSHROOM_FROM + rng() * LEDGE_MUSHROOM_RANGE
  const mushX = fromLeft ? x1 + span * mushT : x2 - span * mushT
  anchors.push({ x: mushX, y: topAt(mushX) })
  const boulders = 1 + Math.floor(rng() * LEDGE_BOULDERS_MAX)
  for (let i = 0; i < boulders; i++) {
    const x = x1 + span * (BOULDER_EDGE_KEEP + rng() * (1 - BOULDER_EDGE_KEEP * 2))
    paintBoulder(ctx, x, topAt(x), BOULDER_R_MIN + rng() * BOULDER_R_RANGE, rng, CAVE_PAL.backBoulder, CAVE_PAL.backMoss)
  }
}
//
// Near row: darkest side walls, clusters of thick roots hanging from the
// top, dark vines, and big leafy silhouettes along both sides.
//
function paintNear(ctx, w, h, rng) {
  const tones = CAVE_PAL.backNear
  const opts = { tones, stoneScale: NEAR_STONE_SCALE, contour: false }
  const seed = rng() * LEDGE_SEED_SPREAD
  const leftX = y => NEAR_SIDE_W + Layout.profileNoise(y * NEAR_SIDE_FREQ, seed) * NEAR_SIDE_AMP
  const rightX = y => w - NEAR_SIDE_W - Layout.profileNoise(y * NEAR_SIDE_FREQ, seed + 4) * NEAR_SIDE_AMP
  const left = sampleEdge(-OUTSIDE_PAD, h + OUTSIDE_PAD, EDGE_STEP, y => ({ x: leftX(y), y }))
  const right = sampleEdge(-OUTSIDE_PAD, h + OUTSIDE_PAD, EDGE_STEP, y => ({ x: rightX(y), y }))
  paintRockMass(ctx, [{ x: -OUTSIDE_PAD, y: -OUTSIDE_PAD }, ...left, { x: -OUTSIDE_PAD, y: h + OUTSIDE_PAD }], rng, opts)
  paintRockMass(ctx, [{ x: w + OUTSIDE_PAD, y: -OUTSIDE_PAD }, ...right, { x: w + OUTSIDE_PAD, y: h + OUTSIDE_PAD }], rng, opts)
  for (let i = 0; i < NEAR_ROOT_CLUSTERS; i++) {
    const cx = rng() * w
    const cy = rng() * h
    for (let j = 0; j < NEAR_ROOTS_PER_CLUSTER; j++) {
      paintRoot(ctx, cx + (rng() - 0.5) * NEAR_ROOT_SPREAD, cy, HALF_PI + (rng() - 0.5) * ROOT_DOWN_SPREAD,
        NEAR_ROOT_THICK_MIN + rng() * NEAR_ROOT_THICK_RANGE, rng)
    }
  }
  for (let i = 0; i < NEAR_VINE_COUNT; i++) {
    paintHangingVine(ctx, rng() * w, rng() * h, MID_VINE_LEN_MIN + rng() * MID_VINE_LEN_RANGE, rng,
      { tones: CAVE_PAL.backVineDark, scale: NEAR_VINE_SCALE, contour: false, crown: true })
  }
  for (let i = 0; i < NEAR_FERN_COUNT; i++) {
    const onLeft = i % 2 === 0
    const y = rng() * h
    paintEdgeFern(ctx, onLeft ? leftX(y) : rightX(y), y, onLeft ? HALF_PI : -HALF_PI, rng, NEAR_FERN_SCALE, tones.slice(1))
  }
}
//
// Gameplay-looking slabs scattered in the mid row (darkened with the row),
// vines hanging from them and sometimes a boulder on top.
//
function paintBackPlatforms(ctx, w, h, rng, anchors) {
  for (let i = 0; i < BACK_PLATFORM_COUNT; i++) {
    const width = BACK_PLATFORM_W_MIN + rng() * BACK_PLATFORM_W_RANGE
    const x1 = BACK_PLATFORM_MARGIN + rng() * (w - BACK_PLATFORM_MARGIN * 2 - width)
    const p = {
      x1,
      x2: x1 + width,
      y: h * (i + rng()) / BACK_PLATFORM_COUNT,
      h: BACK_PLATFORM_H_MIN + rng() * BACK_PLATFORM_H_RANGE,
      kind: Layout.PLATFORM_KIND.SMALL
    }
    const bottomAt = paintPlatformSlab(ctx, p, rng, { tones: CAVE_PAL.backRock, stoneScale: BACK_PLATFORM_STONE_SCALE })
    for (let v = 0; v < BACK_PLATFORM_VINES; v++) {
      const x = p.x1 + width * (v + 1) / (BACK_PLATFORM_VINES + 1)
      paintHangingVine(ctx, x, bottomAt(x) - EDGE_STEP, MID_VINE_LEN_MIN + rng() * MID_VINE_LEN_RANGE, rng,
        { tones: CAVE_PAL.backVine, scale: MID_VINE_SCALE, contour: false, crown: true })
    }
    const hasBoulder = rng() < BACK_PLATFORM_BOULDER_CHANCE
    hasBoulder && paintBoulder(ctx, p.x1 + width * BACK_BOULDER_AT, p.y, BOULDER_R_MIN + rng() * BOULDER_R_MIN, rng, CAVE_PAL.backBoulder, CAVE_PAL.backMoss)
    anchors.push({ x: p.x1 + width * (hasBoulder ? BACK_MUSHROOM_BESIDE_BOULDER : BACK_MUSHROOM_AT), y: p.y })
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
//
// Seeded spots for the back-wall eyes, spread down the mid row.
//
function buildBackEyes(layer) {
  const rng = createSeededRandom(layer.seed + 1)
  return Array.from({ length: BACK_EYE_COUNT }, (_, i) => ({
    x: BACK_EYE_MARGIN_X + rng() * (layer.w - BACK_EYE_MARGIN_X * 2),
    y: BACK_EYE_MARGIN_Y + (layer.h - BACK_EYE_MARGIN_Y * 2) * (i + rng()) / BACK_EYE_COUNT
  }))
}
