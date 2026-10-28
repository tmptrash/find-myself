import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as Lake from '../../forest/utils/forest-lake.js'
import * as Layout from './cave-layout.js'
import { paintPlant } from './cave-plant-art.js'
import {
  paintRockMass,
  paintPlatformSlab,
  paintSpike,
  paintRoot,
  paintEdgeFern,
  sampleEdge
} from './cave-paint.js'
//
// Gameplay-plane terrain of cave lesson 0, baked once per live k into
// horizontal tiles (only the tiles crossing the view are drawn): ragged
// walls of stones, roots and dark ferns, the ceiling with the entry shaft,
// platforms with moss rims and stalactites, the stalagmite floor and the
// lake basin.
//
const TILE_H = 540
const TILE_SPRITE_PREFIX = 'cave0-terrain-v14'
const TERRAIN_SEED = 7301
const GRAIN_SEED_BASE = 8100
const EDGE_STEP = 6
const OUTSIDE_PAD = 12
//
// Ceiling: ragged lower edge, rounded lips around the entry shaft.
//
const SHAFT_LIP_DROP = 34
//
// Decorative (harmless) stalactites under the ceiling.
//
const CEILING_DECOR_X1 = 520
const CEILING_DECOR_X2 = 1180
const DECOR_SPIKE_STEP = 34
const DECOR_SPIKE_CHANCE = 0.6
const CEILING_DECOR_LEN_MIN = 26
const CEILING_DECOR_LEN_RANGE = 44
const DECOR_SPIKE_W_MIN = 10
const DECOR_SPIKE_W_RANGE = 12
const DECOR_SPIKE_SINK = 7
//
// Lake basin: rock starts this far under the lake bed.
//
const BASIN_SHORE_OVERLAP = 40
const BASIN_UNDER_BED = 4
//
// Roots crawling down both walls and hanging from the ceiling.
//
const WALL_ROOT_COUNT = 18
const WALL_ROOT_MAX_Y = 1700
const WALL_ROOT_THICK_MIN = 3
const WALL_ROOT_THICK_RANGE = 5
const WALL_ROOT_INSET = 14
const WALL_ROOT_BIAS = 0.05
const CEILING_ROOT_COUNT = 9
const CEILING_ROOT_THICK_MIN = 4
const CEILING_ROOT_THICK_RANGE = 5
const LEDGE_ROOT_CHANCE = 0.7
const LEDGE_ROOT_THICK = 2.6
const LEDGE_ROOT_FROM = 0.3
const LEDGE_ROOT_SPAN = 0.4
const LEDGE_ROOT_SINK = 2
const ROOT_DOWN_SPREAD = 0.5
//
// Dark ferns jutting out of the wall edges and ledge corners.
//
const WALL_FERN_STEP = 44
const WALL_FERN_CHANCE = 0.55
const WALL_FERN_TILT = 0.5
const WALL_FERN_SINK = 2
const LEDGE_FERN_SCALE = 0.8
const HALF_PI = Math.PI / 2
const terrainByK = new WeakMap()

/**
 * Bakes (once per live k) and returns the terrain tile set.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array} cfg.stalactites - Deadly stalactites from Layout.buildStalactites()
 * @param {Object} cfg.lake - Forest lake inst; the rock basin starts under its bed
 * @returns {Object} Terrain instance (tiles, and decorTips: tip points of
 *   the harmless ceiling / floor-underside stalactites)
 */
export function create(cfg) {
  const { k, stalactites, lake } = cfg
  const cached = terrainByK.get(k)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = Layout.WORLD_W
  canvas.height = Layout.WORLD_H
  const ctx = canvas.getContext('2d')
  const rng = createSeededRandom(TERRAIN_SEED)
  const decorTips = paintTerrain(ctx, rng, stalactites, lake)
  const tiles = sliceTiles(k, canvas)
  canvas.width = 0
  canvas.height = 0
  const inst = { k, tiles, decorTips }
  terrainByK.set(k, inst)
  return inst
}

/**
 * Draws the terrain tiles crossing the visible world band.
 * @param {Object} inst - Terrain instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDraw(inst, top, bottom) {
  const k = inst.k
  inst.tiles.forEach(tile => {
    tile.y + tile.h > top && tile.y < bottom && k.drawSprite({ sprite: tile.name, pos: k.vec2(0, tile.y) })
  })
}
//
// Every terrain layer, back to front: walls and the lake basin, ceiling,
// the monster plant, platforms, stalactites, then roots and ferns on the rock.
//
function paintTerrain(ctx, rng, stalactites, lake) {
  paintBasin(ctx, rng, lake)
  paintRockMass(ctx, leftWallOutline(), rng, { edgeStones: true })
  paintRockMass(ctx, rightWallOutline(), rng, { edgeStones: true })
  paintCeiling(ctx, rng)
  paintPlant(ctx, rng, lake)
  Layout.PLATFORMS.forEach(p => paintPlatform(ctx, p, rng))
  stalactites.forEach(s => paintSpike(ctx, s.x, s.y, s.w, s.len, 1, rng))
  const decorTips = paintDecorStalactites(ctx, rng)
  paintWallRoots(ctx, rng)
  paintWallFerns(ctx, rng)
  return decorTips
}
function leftWallOutline() {
  const edge = sampleEdge(-OUTSIDE_PAD, Layout.WORLD_H + OUTSIDE_PAD, EDGE_STEP, y => ({ x: Layout.leftWallX(y), y }))
  return [{ x: -OUTSIDE_PAD, y: -OUTSIDE_PAD }, ...edge, { x: -OUTSIDE_PAD, y: Layout.WORLD_H + OUTSIDE_PAD }]
}
function rightWallOutline() {
  const edge = sampleEdge(-OUTSIDE_PAD, Layout.WORLD_H + OUTSIDE_PAD, EDGE_STEP, y => ({ x: Layout.rightWallX(y), y }))
  const outerX = Layout.WORLD_W + OUTSIDE_PAD
  return [{ x: outerX, y: -OUTSIDE_PAD }, ...edge, { x: outerX, y: Layout.WORLD_H + OUTSIDE_PAD }]
}
//
// Ceiling split by the entry shaft; its lips bend up into the shaft.
//
function paintCeiling(ctx, rng) {
  const bottomAt = Layout.ceilingBottomAt
  const lip = (x, edgeX) => {
    const d = Math.abs(x - edgeX)
    return d < SHAFT_LIP_DROP ? (1 - d / SHAFT_LIP_DROP) * SHAFT_LIP_DROP : 0
  }
  const left = sampleEdge(-OUTSIDE_PAD, Layout.ENTRY_X1, EDGE_STEP, x => ({ x, y: bottomAt(x) - lip(x, Layout.ENTRY_X1) }))
  paintRockMass(ctx, [{ x: -OUTSIDE_PAD, y: -OUTSIDE_PAD }, ...left, { x: Layout.ENTRY_X1, y: -OUTSIDE_PAD }], rng)
  const right = sampleEdge(Layout.ENTRY_X2, Layout.WORLD_W + OUTSIDE_PAD, EDGE_STEP, x => ({ x, y: bottomAt(x) - lip(x, Layout.ENTRY_X2) }))
  paintRockMass(ctx, [{ x: Layout.ENTRY_X2, y: -OUTSIDE_PAD }, ...right, { x: Layout.WORLD_W + OUTSIDE_PAD, y: -OUTSIDE_PAD }], rng)
  for (let i = 0; i < CEILING_ROOT_COUNT; i++) {
    const x = Layout.ENTRY_X2 + rng() * (Layout.WORLD_W - Layout.ENTRY_X2 - Layout.WALL_COLLIDE_W * 2)
    paintRoot(ctx, x, bottomAt(x) - EDGE_STEP, HALF_PI + (rng() - 0.5) * ROOT_DOWN_SPREAD, CEILING_ROOT_THICK_MIN + rng() * CEILING_ROOT_THICK_RANGE, rng)
  }
  paintRoot(ctx, Layout.ENTRY_X1 - EDGE_STEP, bottomAt(Layout.ENTRY_X1) - SHAFT_LIP_DROP, HALF_PI, CEILING_ROOT_THICK_MIN, rng)
  paintRoot(ctx, Layout.ENTRY_X2 + EDGE_STEP, bottomAt(Layout.ENTRY_X2) - SHAFT_LIP_DROP, HALF_PI, CEILING_ROOT_THICK_MIN, rng)
}
function paintDecorStalactites(ctx, rng) {
  const tips = []
  for (let x = CEILING_DECOR_X1; x < CEILING_DECOR_X2; x += DECOR_SPIKE_STEP) {
    const sx = x + rng() * DECOR_SPIKE_STEP
    const sw = DECOR_SPIKE_W_MIN + rng() * DECOR_SPIKE_W_RANGE
    const len = CEILING_DECOR_LEN_MIN + rng() * CEILING_DECOR_LEN_RANGE
    const rootY = rootUnder(Layout.ceilingBottomAt, sx, sw)
    rng() < DECOR_SPIKE_CHANCE && (paintSpike(ctx, sx, rootY, sw, len, 1, rng), tips.push({ x: sx, y: rootY + len }))
  }
  return tips
}
//
// Root Y for a spike hanging under a ragged edge: the higher of its two
// base corners, sunk into the rock so neither corner floats.
//
function rootUnder(edgeAt, x, w) {
  return Math.min(edgeAt(x - w / 2), edgeAt(x + w / 2)) - DECOR_SPIKE_SINK
}
//
// One platform: flat walkable top, tapered wavy underside, moss rim and a
// few hanging rootlets. Ledges run into their wall; ground fills down.
//
function paintPlatform(ctx, p, rng) {
  const { x1, x2 } = Layout.platformArtSpan(p)
  const span = x2 - x1
  const bottomAt = paintPlatformSlab(ctx, p, rng, {
    mossX1: Math.max(x1, Layout.leftWallX(p.y) - EDGE_STEP),
    mossX2: Math.min(x2, Layout.rightWallX(p.y) + EDGE_STEP)
  })
  if (p.kind === Layout.PLATFORM_KIND.GROUND || p.stalactites) return
  rng() < LEDGE_ROOT_CHANCE && paintRoot(ctx, p.x1 + span * LEDGE_ROOT_FROM + rng() * span * LEDGE_ROOT_SPAN, bottomAt(p.x1 + span / 2) - LEDGE_ROOT_SINK, HALF_PI, LEDGE_ROOT_THICK, rng)
  p.kind === Layout.PLATFORM_KIND.LEDGE && paintEdgeFern(ctx, p.wall === 'left' ? p.x2 - EDGE_STEP : p.x1 + EDGE_STEP, p.y, 0, rng, LEDGE_FERN_SCALE)
}
//
// Lake basin rock under the lake bed, between both shores.
//
function paintBasin(ctx, rng, lake) {
  const x1 = Layout.LAKE_X1 - BASIN_SHORE_OVERLAP
  const x2 = Layout.LAKE_X2 + BASIN_SHORE_OVERLAP
  const bed = sampleEdge(x1, x2, EDGE_STEP, x => ({ x, y: Lake.bedWorldY(lake, x) + BASIN_UNDER_BED }))
  paintRockMass(ctx, [...bed, { x: x2, y: Layout.WORLD_H + OUTSIDE_PAD }, { x: x1, y: Layout.WORLD_H + OUTSIDE_PAD }], rng)
}
//
// Thick roots crawling down the wall faces.
//
function paintWallRoots(ctx, rng) {
  for (let i = 0; i < WALL_ROOT_COUNT; i++) {
    const y = Layout.CEILING_Y + rng() * (WALL_ROOT_MAX_Y - Layout.CEILING_Y)
    const leftSide = i % 2 === 0
    const x = leftSide ? Layout.leftWallX(y) - WALL_ROOT_INSET : Layout.rightWallX(y) + WALL_ROOT_INSET
    const bias = leftSide ? -WALL_ROOT_BIAS : WALL_ROOT_BIAS
    paintRoot(ctx, x, y, HALF_PI + (rng() - 0.5) * ROOT_DOWN_SPREAD, WALL_ROOT_THICK_MIN + rng() * WALL_ROOT_THICK_RANGE, rng, bias)
  }
}
//
// Dark ferns growing sideways out of both wall edges.
//
function paintWallFerns(ctx, rng) {
  for (let y = Layout.CEILING_Y + WALL_FERN_STEP; y < Layout.WORLD_H; y += WALL_FERN_STEP) {
    rng() < WALL_FERN_CHANCE && paintEdgeFern(ctx, Layout.leftWallX(y) - WALL_FERN_SINK, y, HALF_PI - rng() * WALL_FERN_TILT, rng)
    rng() < WALL_FERN_CHANCE && paintEdgeFern(ctx, Layout.rightWallX(y) + WALL_FERN_SINK, y, -HALF_PI + rng() * WALL_FERN_TILT, rng)
  }
}
//
// Cuts the world bake into graded, grained tiles and registers them.
//
function sliceTiles(k, canvas) {
  const tiles = []
  for (let y = 0, i = 0; y < canvas.height; y += TILE_H, i++) {
    const h = Math.min(TILE_H, canvas.height - y)
    const tile = document.createElement('canvas')
    tile.width = canvas.width
    tile.height = h
    tile.getContext('2d').drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h)
    applyForestFilmGrainToCanvas(tile, GRAIN_SEED_BASE + i)
    const name = `${TILE_SPRITE_PREFIX}-${i}`
    k.loadSprite(name, tile)
    tiles.push({ name, y, h })
  }
  return tiles
}
