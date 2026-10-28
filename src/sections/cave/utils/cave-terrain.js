import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import * as Lake from '../../forest/utils/forest-lake.js'
import * as Layout from './cave-layout.js'
import { paintPlant } from './cave-plant-art.js'
import { paintLedge, paintGround, paintRubble } from './cave-ledge.js'
import { CAVE_CFG } from '../cfg.js'
import {
  paintSpike,
  paintEdgeFern,
  sampleEdge,
  smoothPath,
  polygonBounds,
  insidePath
} from './cave-paint.js'
//
// Gameplay-plane terrain of cave lesson 0, baked once per live k into
// horizontal tiles (only the tiles crossing the view are drawn): ragged
// walls of stones and dark ferns, the ceiling with the entry shaft,
// platforms with moss rims and stalactites, the stalagmite floor and the
// lake basin.
//
const TILE_H = 540
const TILE_SPRITE_PREFIX = 'cave0-terrain-v15'
const TERRAIN_SEED = 7301
const GRAIN_SEED_BASE = 8100
const FRONT_GRAIN_SEED = 500
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
// Dark ferns jutting out of the wall edges.
//
const WALL_FERN_STEP = 44
const WALL_FERN_CHANCE = 0.55
const WALL_FERN_TILT = 0.5
const WALL_FERN_SINK = 2
const HALF_PI = Math.PI / 2
const terrainByK = new WeakMap()

/**
 * Bakes (once per live k) and returns the terrain tile set.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array} cfg.stalactites - Deadly stalactites from Layout.buildStalactites()
 * @param {Object} cfg.lake - Forest lake inst; the rock basin starts under its bed
 * @returns {Object} Terrain instance (tiles, decorTips: tip points of
 *   the harmless ceiling / floor-underside stalactites, swayAnchors: pin
 *   points of the rock ledges' vines that sway, drawn live, fronts: the
 *   ledges' top greens drawn in front of the hero)
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
  const ledges = { swayAnchors: [], fronts: [] }
  const decorTips = paintTerrain(ctx, rng, stalactites, lake, ledges)
  const tiles = sliceTiles(k, canvas)
  canvas.width = 0
  canvas.height = 0
  const fronts = ledges.fronts.map((f, i) => {
    applyForestFilmGrainToCanvas(f.canvas, GRAIN_SEED_BASE + FRONT_GRAIN_SEED + i)
    const name = `${TILE_SPRITE_PREFIX}-front-${i}`
    k.loadSprite(name, f.canvas)
    return { name, x: f.x, y: f.y, h: f.canvas.height }
  })
  const inst = { k, tiles, decorTips, swayAnchors: ledges.swayAnchors, fronts }
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
/**
 * Draws the rock ledges' top greens that stand in front of the hero.
 * @param {Object} inst - Terrain instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDrawFront(inst, top, bottom) {
  const k = inst.k
  inst.fronts.forEach(f => {
    f.y + f.h > top && f.y < bottom && k.drawSprite({ sprite: f.name, pos: k.vec2(f.x, f.y) })
  })
}
//
// Every terrain layer, back to front: walls and the lake basin, ceiling,
// the monster plant, platforms, stalactites, then ferns on the rock.
//
function paintTerrain(ctx, rng, stalactites, lake, ledges) {
  const rubbleRng = createSeededRandom(CAVE_CFG.rubble.seed)
  paintBasin(ctx, rubbleRng, lake)
  paintWall(ctx, leftWallOutline(), y => Layout.leftWallX(y), 1, rubbleRng)
  paintWall(ctx, rightWallOutline(), y => Layout.rightWallX(y), -1, rubbleRng)
  paintCeiling(ctx, rubbleRng)
  paintPlant(ctx, rng, lake)
  Layout.PLATFORMS.forEach(p => paintPlatform(ctx, p, ledges))
  stalactites.forEach(s => paintSpike(ctx, s.x, s.y, s.w, s.len, 1, rng))
  const decorTips = paintDecorStalactites(ctx, rng)
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
function paintCeiling(ctx, rubbleRng) {
  const bottomAt = Layout.ceilingBottomAt
  const lip = (x, edgeX) => {
    const d = Math.abs(x - edgeX)
    return d < SHAFT_LIP_DROP ? (1 - d / SHAFT_LIP_DROP) * SHAFT_LIP_DROP : 0
  }
  const left = sampleEdge(-OUTSIDE_PAD, Layout.ENTRY_X1, EDGE_STEP, x => ({ x, y: bottomAt(x) - lip(x, Layout.ENTRY_X1) }))
  paintCeilingRubble(ctx, [{ x: -OUTSIDE_PAD, y: -OUTSIDE_PAD }, ...left, { x: Layout.ENTRY_X1, y: -OUTSIDE_PAD }], rubbleRng)
  const right = sampleEdge(Layout.ENTRY_X2, Layout.WORLD_W + OUTSIDE_PAD, EDGE_STEP, x => ({ x, y: bottomAt(x) - lip(x, Layout.ENTRY_X2) }))
  paintCeilingRubble(ctx, [{ x: Layout.ENTRY_X2, y: -OUTSIDE_PAD }, ...right, { x: Layout.WORLD_W + OUTSIDE_PAD, y: -OUTSIDE_PAD }], rubbleRng)
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
// One platform in its rubble style (cave-ledge.js): ledges grow out of
// their wall, ground fills down; collects swaying vines and front greens.
//
function paintPlatform(ctx, p, ledges) {
  const { x1, x2 } = Layout.platformArtSpan(p)
  const moss = { x1: Math.max(x1, Layout.leftWallX(p.y) - EDGE_STEP), x2: Math.min(x2, Layout.rightWallX(p.y) + EDGE_STEP) }
  const paint = p.kind === Layout.PLATFORM_KIND.GROUND ? paintGround : paintLedge
  const ledge = paint(ctx, p, CAVE_CFG.ledge[p.style], moss)
  ledges.swayAnchors.push(...ledge.swaying)
  ledges.fronts.push(ledge.front)
}
//
// Lake basin rock under the lake bed, between both shores.
//
function paintBasin(ctx, rng, lake) {
  const x1 = Layout.LAKE_X1 - BASIN_SHORE_OVERLAP
  const x2 = Layout.LAKE_X2 + BASIN_SHORE_OVERLAP
  const bed = sampleEdge(x1, x2, EDGE_STEP, x => ({ x, y: Lake.bedWorldY(lake, x) + BASIN_UNDER_BED }))
  const pts = [...bed, { x: x2, y: Layout.WORLD_H + OUTSIDE_PAD }, { x: x1, y: Layout.WORLD_H + OUTSIDE_PAD }]
  const path = smoothPath(pts)
  const bedAt = x => Lake.bedWorldY(lake, x) + BASIN_UNDER_BED
  ctx.save()
  ctx.clip(path)
  paintRubble(ctx, {
    path,
    bounds: polygonBounds(pts),
    sizes: CAVE_CFG.rubble.stones,
    inside: (x, y) => x > x1 && x < x2 && y > bedAt(x),
    shadeAt: st => rubbleShade(st.y - bedAt(st.x))
  }, rng)
  ctx.restore()
}
//
// A side wall in rubble, stones sinking into shadow away from its face
// (dir: +1 for the left wall, whose rock is left of the face).
//
function paintWall(ctx, pts, faceAt, dir, rng) {
  paintRubble(ctx, {
    path: smoothPath(pts),
    bounds: polygonBounds(pts),
    sizes: CAVE_CFG.rubble.stones,
    inside: (x, y) => (faceAt(y) - x) * dir > 0,
    shadeAt: st => rubbleShade((faceAt(st.y) - st.x) * dir)
  }, rng)
}
//
// One side of the ceiling in rubble, darker up from its lower edge.
//
function paintCeilingRubble(ctx, pts, rng) {
  const path = smoothPath(pts)
  paintRubble(ctx, {
    path,
    bounds: polygonBounds(pts),
    sizes: CAVE_CFG.rubble.stones,
    inside: (x, y) => insidePath(ctx, path, x, y),
    shadeAt: st => rubbleShade(Layout.ceilingBottomAt(st.x) - st.y)
  }, rng)
}
//
// Shadow of a rubble stone this deep into the rock (0 lit … 1 darkest).
//
function rubbleShade(depth) {
  const r = CAVE_CFG.rubble
  return Math.min(1, r.shadeMin + (1 - r.shadeMin) * Math.max(0, depth) / r.shadeDepth)
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
