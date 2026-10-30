import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from './cave-layout.js'
import * as Parallax from './cave-parallax.js'
import { paintPlantPicture } from './cave-plant-art.js'
import { plantShape } from './cave-plant-shape.js'
import { paintGround } from './cave-ledge.js'
import { paintRubbleMass } from './cave-terrain.js'
import { CAVE_PAL, css, sampleEdge, paintEdgeFern, paintHangingVine, paintMossStrand } from './cave-paint.js'
import * as GiantPlant from '../components/giant-plant.js'
import * as WallEye from '../components/wall-eye.js'
import * as GlowMushroom from '../components/glow-mushroom.js'
import * as Fireflies from '../components/cave-fireflies.js'
//
// The cave level as a living menu backdrop, built for the screen size from
// the level's own pieces: the three dark back rows (rubble far wall,
// ledges and bridges, near side masses), still behind everything,
// a room of the walls' light-grey rubble (side walls, ceiling with hanging
// vines, a rubble floor with moss, grass and flowers), the monster plant in
// the middle (twisted trunk, pad leaves, red trap flowers that now and
// then snap shut, eyes on the trunk following the menu hero), glowing
// mushrooms on the floor and fireflies. Everything baked is baked once per
// live k and screen size.
//
const SPRITE_PREFIX = 'cave0-menu-v2'
const GRAIN_SEED = 8800
const ROOM_SEED = 8811
const PLANT_SEED = 7301
const FRONT_GRAIN_SEED = 8822
//
// Room layout (shares of the screen): floor top, ceiling depth, side wall
// depth and how much the rock faces wander.
//
const FLOOR_Y = 0.9
//
// The floor sinks into the cave's shade toward the screen bottom, so the
// menu's key hints over it stay readable: from this far under its top,
// reaching FLOOR_SHADE of the darkness swatch at FLOOR_SHADE_FULL of the
// way down and staying there.
//
const FLOOR_SHADE_FROM = 16
const FLOOR_SHADE = 0.9
const FLOOR_SHADE_FULL = 0.55
const CEIL_DEPTH = 0.05
const WALL_DEPTH = 0.06
const FACE_WANDER = 0.45
const FACE_FREQ = 0.006
const OUTSIDE_PAD = 16
const EDGE_STEP = 6
//
// The plant: its trunk's foot at this share of the width (the middle of
// the room right of the level descriptions), standing on the
// floor (world point PLANT_FOOT_Y sits a little into it), scaled so its top
// (the big flower) clears the ceiling by PLANT_TOP_GAP of the height.
//
const PLANT_X = 0.7
const PLANT_FOOT_Y = 1800
const PLANT_TOP_Y = 360
const PLANT_SINK = 6
const PLANT_TOP_GAP = 0.1
//
// Greens on the rock: ferns along the wall faces, vines and moss strands
// hanging from the ceiling (counts per 1000 px of edge).
//
const WALL_FERN_STEP = 44
const WALL_FERN_CHANCE = 0.55
const WALL_FERN_TILT = 0.5
const CEIL_VINES = 9
const CEIL_STRANDS = 12
const CEIL_VINE_MIN = 40
const CEIL_VINE_RANGE = 160
const CEIL_STRAND_MIN = 20
const CEIL_STRAND_RANGE = 60
const CEIL_HANG_SINK = 4
const PER_EDGE = 1000
//
// The baked room is cut into pieces that never overlap (so a cross-fade
// shows no seams) and skip the empty middle: the ceiling band with its
// hanging greens, the floor band with its grass, and between them the two
// walls with their ferns and the plant's box. Reach of the greens past the
// rock (px).
//
const FERN_REACH = 70
const GRASS_REACH = 90
//
// Glowing mushrooms on the floor (x share, size), their stems sunk this deep
// into the grass (the floor's front grass is drawn over them), and fireflies
// over the room.
//
const GLOW_MUSHROOMS = [
  { x: 0.09, scale: 0.9, seed: 31 },
  { x: 0.4, scale: 0.7, seed: 32 },
  { x: 0.79, scale: 1, seed: 33 },
  { x: 0.92, scale: 0.75, seed: 34 }
]
const MUSHROOM_SINK = 14
const FIREFLY_COUNT = 30
const HALF_PI = Math.PI / 2
const roomByK = new WeakMap()

/**
 * Builds the cave menu backdrop for a screen size (bakes are reused per
 * live k and size).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.width - Screen width
 * @param {number} cfg.height - Screen height
 * @returns {Object} Backdrop instance
 */
export function create(cfg) {
  const { k, width, height } = cfg
  const w = Math.round(width)
  const h = Math.round(height)
  const place = plantPlacement(w, h)
  const floorY = h * FLOOR_Y
  const room = bakeRoom(k, w, h, place)
  return {
    k,
    w,
    h,
    rows: Parallax.bakeScreenRows(k, w, h),
    pieces: room.pieces,
    grass: room.grass,
    plant: GiantPlant.createDecor({ k, toScreen: place.toScreen, scale: place.scale }),
    eyes: WallEye.createEmbedded({ k, spots: plantShape().eyes.map(e => ({ ...place.toScreen(e.x, e.y), r: Math.max(1, Math.round(e.r * place.scale)) })) }),
    mushrooms: GLOW_MUSHROOMS.map(m => GlowMushroom.create({ k, x: w * m.x, y: floorY + MUSHROOM_SINK, scale: m.scale, seed: m.seed, moss: false })),
    fireflies: Fireflies.create({ k, bounds: { x1: 0, y1: h * CEIL_DEPTH, x2: w, y2: floorY }, count: FIREFLY_COUNT })
  }
}

/**
 * Bakes the backdrop ahead of time (under the boot loader) so the menu
 * only reuses loaded sprites.
 * @param {Object} k - Kaplay instance
 * @param {number} width - Screen width
 * @param {number} height - Screen height
 */
export function prewarm(k, width, height) {
  create({ k, width, height })
}

/**
 * Moves the living parts: traps snap, eyes follow the focus, mushrooms
 * squat now and then, fireflies wander (the back rows stay still).
 * @param {Object} inst - Backdrop instance
 * @param {{x: number, y: number}} focus - Screen point the eyes look at
 */
export function onUpdate(inst, focus) {
  GiantPlant.onUpdateDecor(inst.plant)
  WallEye.onUpdate(inst.eyes, focus, { left: 0, top: 0 })
  inst.mushrooms.forEach(m => GlowMushroom.onUpdate(m, null))
  Fireflies.onUpdate(inst.fireflies)
}

/**
 * Draws the backdrop back to front: rows, the rubble room with the plant's
 * body, the plant's leaves and traps, its eyes, the floor mushrooms, the
 * floor's front grass over their stems, then the additive glows (mushroom
 * halos, fireflies).
 * @param {Object} inst - Backdrop instance
 * @param {number} opacity - Cross-fade 0 … 1
 */
export function onDraw(inst, opacity) {
  const k = inst.k
  const origin = k.vec2(0, 0)
  inst.rows.forEach(row => k.drawSprite({ sprite: row.name, pos: origin, opacity }))
  inst.pieces.forEach(piece => k.drawSprite({ sprite: piece.name, pos: k.vec2(piece.x, piece.y), opacity }))
  GiantPlant.onDrawDecor(inst.plant, opacity)
  WallEye.onDrawWall(inst.eyes, { top: -Infinity, bottom: Infinity }, opacity)
  inst.mushrooms.forEach(m => {
    GlowMushroom.setFade(m, opacity)
    GlowMushroom.onDraw(m)
  })
  k.drawSprite({ sprite: inst.grass.name, pos: k.vec2(inst.grass.x, inst.grass.y), opacity })
  inst.mushrooms.forEach(m => GlowMushroom.onDrawHalo(m))
  Fireflies.onDraw(inst.fireflies, -Infinity, Infinity, opacity)
}
//
// Where the plant stands and how big: world → screen mapping keeping the
// trunk's foot on the floor and the big flower under the ceiling.
//
function plantPlacement(w, h) {
  const footX = w * PLANT_X
  const footY = h * FLOOR_Y + PLANT_SINK
  const scale = (footY - h * PLANT_TOP_GAP) / (PLANT_FOOT_Y - PLANT_TOP_Y)
  return {
    scale,
    toScreen: (x, y) => ({ x: footX + (x - Layout.PLANT_TRUNK.x) * scale, y: footY + (y - PLANT_FOOT_Y) * scale })
  }
}
//
// The rubble room with the plant's body in it, once per live k and size:
// side walls and ceiling, the plant, then the floor over its foot, grained
// and cut into pieces; the floor's front grass is its own sprite.
//
function bakeRoom(k, w, h, place) {
  let perK = roomByK.get(k)
  !perK && (perK = new Map(), roomByK.set(k, perK))
  const key = `${w}x${h}`
  const cached = perK.get(key)
  if (cached) return cached
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  const rng = createSeededRandom(ROOM_SEED)
  paintWalls(ctx, w, h, rng)
  paintCeiling(ctx, w, h, rng)
  const plantBox = paintPlant(ctx, place)
  const front = paintFloor(ctx, w, h)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  applyForestFilmGrainToCanvas(front.canvas, FRONT_GRAIN_SEED)
  const grassName = `${SPRITE_PREFIX}-grass-${key}`
  k.loadSprite(grassName, front.canvas)
  const pieces = roomPieces(w, h, plantBox).map((r, i) => {
    const name = `${SPRITE_PREFIX}-room-${key}-${i}`
    k.loadSprite(name, cutCanvas(canvas, r))
    return { name, x: r.x, y: r.y }
  })
  canvas.width = 0
  const room = { pieces, grass: { name: grassName, x: front.x, y: front.y } }
  perK.set(key, room)
  return room
}
//
// Non-overlapping rects covering everything painted in the room: ceiling
// band, left wall, plant box, right wall, floor band.
//
function roomPieces(w, h, plantBox) {
  const ceilB = Math.min(h, Math.ceil(h * CEIL_DEPTH * (1 + FACE_WANDER) + CEIL_VINE_MIN + CEIL_VINE_RANGE + OUTSIDE_PAD))
  const floorT = Math.max(ceilB, Math.floor(h * FLOOR_Y - GRASS_REACH))
  const wallW = Math.ceil(w * WALL_DEPTH * (1 + FACE_WANDER) + FERN_REACH)
  const px1 = Math.max(wallW, Math.floor(plantBox.x1))
  const px2 = Math.min(w - wallW, Math.ceil(plantBox.x2))
  const band = floorT - ceilB
  return [
    { x: 0, y: 0, w, h: ceilB },
    { x: 0, y: ceilB, w: wallW, h: band },
    { x: px1, y: ceilB, w: px2 - px1, h: band },
    { x: w - wallW, y: ceilB, w: wallW, h: band },
    { x: 0, y: floorT, w, h: h - floorT }
  ].filter(r => r.w > 0 && r.h > 0)
}
function cutCanvas(src, r) {
  const canvas = document.createElement('canvas')
  canvas.width = r.w
  canvas.height = r.h
  canvas.getContext('2d').drawImage(src, r.x, r.y, r.w, r.h, 0, 0, r.w, r.h)
  return canvas
}
//
// Both side walls in rubble with ferns along their faces.
//
function paintWalls(ctx, w, h, rng) {
  const seed = rng() * PER_EDGE
  const depth = w * WALL_DEPTH
  const leftAt = y => depth * (1 + Layout.profileNoise(y * FACE_FREQ * PER_EDGE, seed) * FACE_WANDER)
  const rightAt = y => w - depth * (1 + Layout.profileNoise(y * FACE_FREQ * PER_EDGE, seed + 1) * FACE_WANDER)
  const pad = OUTSIDE_PAD
  const leftEdge = sampleEdge(-pad, h + pad, EDGE_STEP, y => ({ x: leftAt(y), y }))
  const rightEdge = sampleEdge(h + pad, -pad, EDGE_STEP, y => ({ x: rightAt(y), y }))
  paintRubbleMass(ctx, [{ x: -pad, y: -pad }, ...leftEdge, { x: -pad, y: h + pad }], (x, y) => leftAt(y) - x, rng)
  paintRubbleMass(ctx, [{ x: w + pad, y: h + pad }, ...rightEdge, { x: w + pad, y: -pad }], (x, y) => x - rightAt(y), rng)
  for (let y = h * CEIL_DEPTH + WALL_FERN_STEP; y < h * FLOOR_Y; y += WALL_FERN_STEP) {
    rng() < WALL_FERN_CHANCE && paintEdgeFern(ctx, leftAt(y), y, HALF_PI - rng() * WALL_FERN_TILT, rng)
    rng() < WALL_FERN_CHANCE && paintEdgeFern(ctx, rightAt(y), y, -HALF_PI + rng() * WALL_FERN_TILT, rng)
  }
}
//
// The ceiling in rubble with vines and moss strands hanging from it.
//
function paintCeiling(ctx, w, h, rng) {
  const seed = rng() * PER_EDGE
  const bottomAt = x => h * CEIL_DEPTH * (1 + Layout.profileNoise(x * FACE_FREQ * PER_EDGE, seed) * FACE_WANDER)
  const pad = OUTSIDE_PAD
  const edge = sampleEdge(w + pad, -pad, EDGE_STEP, x => ({ x, y: bottomAt(x) }))
  paintRubbleMass(ctx, [{ x: -pad, y: -pad }, { x: w + pad, y: -pad }, ...edge], (x, y) => bottomAt(x) - y, rng)
  const perEdge = w / PER_EDGE
  for (let i = 0; i < CEIL_VINES * perEdge; i++) {
    const x = rng() * w
    paintHangingVine(ctx, x, bottomAt(x) - CEIL_HANG_SINK, CEIL_VINE_MIN + rng() * CEIL_VINE_RANGE, rng, { crown: true })
  }
  for (let i = 0; i < CEIL_STRANDS * perEdge; i++) {
    const x = rng() * w
    paintMossStrand(ctx, x, bottomAt(x) - CEIL_HANG_SINK, CEIL_STRAND_MIN + rng() * CEIL_STRAND_RANGE, rng)
  }
}
//
// The plant's body (trunk, vines, foot stones) scaled into the room;
// returns the screen span it covers.
//
function paintPlant(ctx, place) {
  const picture = paintPlantPicture(createSeededRandom(PLANT_SEED))
  const at = place.toScreen(picture.x, picture.y)
  const pw = picture.canvas.width * place.scale
  ctx.imageSmoothingQuality = 'high'
  ctx.drawImage(picture.canvas, at.x, at.y, pw, picture.canvas.height * place.scale)
  picture.canvas.width = 0
  return { x1: at.x, x2: at.x + pw }
}
//
// The rubble floor across the whole width (moss, grass, flowers and small
// mushrooms on top), over the plant's foot, sinking into shade toward the
// bottom; returns its front greens (canvas at screen x / y).
//
function paintFloor(ctx, w, h) {
  const style = CAVE_CFG.ledge.ground
  const y = h * FLOOR_Y
  const p = { x1: 0, x2: w, y, h: h - y, kind: Layout.PLATFORM_KIND.GROUND, span: { x1: -OUTSIDE_PAD, x2: w + OUTSIDE_PAD }, bottom: h }
  const floor = paintGround(ctx, p, style, { x1: 0, x2: w })
  const shade = ctx.createLinearGradient(0, y + FLOOR_SHADE_FROM, 0, h)
  shade.addColorStop(0, css(CAVE_PAL.darkness, 0))
  shade.addColorStop(FLOOR_SHADE_FULL, css(CAVE_PAL.darkness, FLOOR_SHADE))
  shade.addColorStop(1, css(CAVE_PAL.darkness, FLOOR_SHADE))
  ctx.save()
  ctx.globalCompositeOperation = 'source-atop'
  ctx.fillStyle = shade
  ctx.fillRect(0, y, w, h - y)
  ctx.restore()
  return floor.front
}
