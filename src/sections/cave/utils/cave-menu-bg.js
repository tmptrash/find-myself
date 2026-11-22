import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Fireflies from '../components/cave-fireflies.js'
import * as Fish from '../components/cave-fish.js'
import * as Runner from '../components/cave-runner.js'
import * as Strider from '../components/cave-strider.js'
import * as Front from './cave-front.js'
import * as Atlas from './cave-atlas.js'
import * as Backdrop from './cave-backdrop.js'
import * as CaveLake from './cave-lake.js'
import * as Layout from './cave-layout.js'
import * as Scene from './cave-scene.js'
import * as Surface from './cave-surface.js'
//
// The cave level as the menu's backdrop: the room round the hero's landing
// spot (back layers, the earth ledge with its moss and props, the ceiling
// with the roots' hole), painted by the level's own painters at the
// level's own size (one world px to one screen unit, as in the level) and
// baked once per live k and screen size (the lake's bed tinted under its
// water as in the level), with the lake's life — its fish, leaping for the
// yellow fireflies over the water, its algae, water and striders running
// about on it (no giant) —, the level's runners scurrying over it,
// fireflies drifting in the open air between its platforms (never over
// the soil) and its big stones in front (all drawn live in its world).
// The bottom sinks into shade so the menu's key hints stay readable. The
// picture is baked in two layers — the back, then the soil over it — so
// the fish swim between them, behind the soil, as in the level.
//
const SPRITE_PREFIX = 'cave0-menu-v6-'
const BACK = '-back'
const SOIL = '-soil'
const GRAIN_SEED = 9400
const MIN_SCREEN_PX = 64
const TILE_MAX = 2048
//
// World rect shown, as big as the screen: the lake's left end (FOCUS_IN px
// in from it) sits at FOCUS_SHARE of the screen width (right of the level
// list), the hall FOCUS_UP px over the lake's surface at FOCUS_Y_SHARE of
// its height (kept in the world).
//
const FOCUS_IN = 40
const FOCUS_X = Layout.LAKE_X1 + FOCUS_IN
const FOCUS_SHARE = 0.68
const FOCUS_UP = 120
const FOCUS_Y = Layout.LAKE_SURFACE_Y - FOCUS_UP
const FOCUS_Y_SHARE = 0.5
//
// Shade over the bottom: from this share of the height down, reaching
// SHADE_ALPHA at the bottom edge.
//
const SHADE_FROM = 0.72
const SHADE_ALPHA = 0.85
//
// Fireflies: how many, kept WATER_CLEAR px over the lake's surface; one a
// fish ate lights up again over the lake (in view) from LAKE_SKY_TOP down
// to LAKE_SKY_LOW px over the surface (where the fish can reach it). They
// keep FIREFLY_PAD px clear of the soil and the water.
//
const FIREFLY_COUNT = 34
const FIREFLY_PAD = 10
const WATER_CLEAR = 20
const LAKE_SKY_TOP = 140
const LAKE_SKY_LOW = 30
//
// A fish's splash is heard full at the view's middle, gone SPLASH_HEAR px
// off it (as from the hero in the level).
//
const SPLASH_HEAR = 900
const bakedFor = new WeakMap()

/**
 * Creates the backdrop for a screen size (baking it on first use).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.width - Screen width
 * @param {number} cfg.height - Screen height
 * @param {(strength: number, near: number) => void} [cfg.onSplash] - A fish broke the lake's surface (its strength, how near the view's middle: 0 … 1), to be heard as in the level
 * @returns {Object} Backdrop instance
 */
export function create(cfg) {
  const { k } = cfg
  const w = Math.max(MIN_SCREEN_PX, Math.round(cfg.width))
  const h = Math.max(MIN_SCREEN_PX, Math.round(cfg.height))
  const place = placement(w, h)
  const ready = Atlas.isLoaded()
  const lake = ready ? CaveLake.create(k) : null
  const inst = {
    k,
    place,
    world: { left: place.x1, top: place.y1, right: place.x2, bottom: place.y2 },
    tiles: bake(k, w, h, place),
    front: ready ? Front.create(k) : null,
    lake,
    fish: lake ? Fish.createAll(k, lake) : [],
    striders: lake ? Strider.createAll(k, lake) : [],
    strideFears: [],
    fishCtx: null,
    lakeSky: { x1: Math.max(Layout.LAKE_X1, place.x1), x2: Math.min(Layout.LAKE_X2, place.x2), y1: Layout.LAKE_SURFACE_Y - LAKE_SKY_TOP, y2: Layout.LAKE_SURFACE_Y - LAKE_SKY_LOW },
    runners: ready ? Runner.createAll(k) : [],
    fireflies: Fireflies.create({
      k,
      bounds: { x1: place.x1, y1: place.y1, x2: place.x2, y2: Math.min(place.y1 + (place.y2 - place.y1) * SHADE_FROM, Layout.LAKE_SURFACE_Y - WATER_CLEAR) },
      count: FIREFLY_COUNT,
      isOpen: ready ? isOpenAir : undefined
    })
  }
  inst.fishCtx = { prey: [], swarmPrey: [], swarm: null, threats: [], school: inst.fish, onCatch: prey => Fireflies.eat(inst.fireflies, prey, inst.lakeSky), onSplash: (x, strength) => splash(inst, cfg.onSplash, x, strength) }
  return inst
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
 * Moves the living parts: the runners scurry, fireflies wander, the fish
 * hunt them, the striders run about the water.
 * @param {Object} inst - Backdrop instance
 */
export function onUpdate(inst) {
  inst.runners.forEach(runner => Runner.onUpdate(runner, null))
  Fireflies.onUpdate(inst.fireflies)
  inst.lake && updateLakeLife(inst)
}

/**
 * Draws the picture's back, the fish, its soil, then the lake's algae and
 * water and what is on it, the runners, the fireflies and the stones in
 * front (only the picture while it cross-fades).
 * @param {Object} inst - Backdrop instance
 * @param {number} opacity - Cross-fade 0 … 1
 */
export function onDraw(inst, opacity) {
  if (opacity < 1) {
    drawTiles(inst, BACK, opacity)
    drawTiles(inst, SOIL, opacity)
    return
  }
  drawTiles(inst, BACK, 1)
  inWorld(inst, drawFish)
  drawTiles(inst, SOIL, 1)
  inWorld(inst, drawWorldLife)
}
function drawTiles(inst, layer, opacity) {
  inst.tiles.forEach(tile => inst.k.drawSprite({ sprite: tile.name + layer, pos: inst.k.vec2(tile.x, 0), opacity }))
}
//
// Runs a draw pass in the level's world placed on the screen the way the
// picture is.
//
function inWorld(inst, draw) {
  const k = inst.k
  const { place } = inst
  k.pushTransform()
  k.pushScale(k.vec2(place.scale, place.scale))
  k.pushTranslate(k.vec2(-place.x1, -place.y1))
  draw(inst)
  k.popTransform()
}
//
// The fish (far to near) and the sand they spill: behind the soil, so the
// lake's bowl hides what of them goes into its bed.
//
function drawFish(inst) {
  inst.fish.sort((a, b) => Fish.depth(b) - Fish.depth(a))
  inst.fish.forEach(fish => Fish.onDraw(fish, inst.world))
  inst.fish.forEach(fish => Fish.onDrawSand(fish))
}
//
// Over the soil: the lake's algae, water and what is on it, the runners,
// the fireflies, then the big stones in front of them.
//
function drawWorldLife(inst) {
  inst.lake && drawLake(inst)
  inst.runners.forEach(runner => Runner.onDraw(runner, inst.world))
  Fireflies.onDraw(inst.fireflies, inst.world.top, inst.world.bottom)
  inst.front && Front.onDraw(inst.front, inst.world)
}
//
// The lake as in the level (its fish are under the soil): the algae, the
// see-through water, the fish's splashes and the striders on it.
//
function drawLake(inst) {
  const view = inst.world
  CaveLake.onDrawAlgae(inst.lake)
  CaveLake.onDraw(inst.lake, view)
  inst.fish.forEach(fish => Fish.onDrawSplash(fish))
  inst.striders.forEach(strider => Strider.onDrawWater(strider, view))
  inst.striders.forEach(strider => Strider.onDraw(strider, view))
}
//
// A fish broke the surface: heard as in the level, fading over SPLASH_HEAR
// px from the view's middle (nothing to hear while baking ahead).
//
function splash(inst, onSplash, x, strength) {
  onSplash?.(strength, 1 - Math.abs(x - (inst.place.x1 + inst.place.x2) / 2) / SPLASH_HEAR)
}
//
// The fish hunt the yellow fireflies (nothing hunts them); the striders
// shy from the runners and the fish breaking the surface.
//
function updateLakeLife(inst) {
  const ctx = inst.fishCtx
  ctx.prey.length = 0
  Fireflies.forEachLit(inst.fireflies, f => ctx.prey.push(f))
  inst.fish.forEach(fish => Fish.onUpdate(fish, ctx))
  const fears = inst.strideFears
  fears.length = 0
  inst.runners.forEach(runner => fears.push(runner.pos))
  inst.fish.forEach(fish => {
    const head = Fish.surfacePoint(fish)
    head && fears.push(head)
  })
  inst.striders.forEach(strider => Strider.onUpdate(strider, fears, inst.striders))
}
//
// Open air for the fireflies: clear of the soil and the water by
// FIREFLY_PAD px.
//
function isOpenAir(x, y) {
  return Surface.isOpenAir(x, y, FIREFLY_PAD)
}
//
// World → screen, one to one: the shown rect is the screen's size, placed
// so FOCUS_X sits at FOCUS_SHARE of its width and FOCUS_Y at FOCUS_Y_SHARE
// of its height (kept in the world; centred on it where the screen is the
// bigger).
//
function placement(w, h) {
  const x1 = keptIn(FOCUS_X - w * FOCUS_SHARE, w, Layout.WORLD_W)
  const y1 = keptIn(FOCUS_Y - h * FOCUS_Y_SHARE, h, Layout.WORLD_H)
  return { scale: 1, x1, y1, x2: x1 + w, y2: y1 + h }
}
function keptIn(from, size, worldSize) {
  return size >= worldSize ? (worldSize - size) / 2 : Math.max(0, Math.min(worldSize - size, from))
}
//
// Screen-wide columns, each under the texture limit, painted at screen
// resolution; once per live k and size.
//
function bake(k, w, h, place) {
  const key = `${w}x${h}`
  const tiles = []
  const count = Math.ceil(w / TILE_MAX)
  const tileW = Math.ceil(w / count)
  for (let i = 0; i < count; i++) tiles.push({ name: `${SPRITE_PREFIX}${key}-${i}`, x: i * tileW, w: Math.min(tileW, w - i * tileW) })
  if (bakedFor.get(k)?.has(key) || !Atlas.isLoaded()) return tiles
  tiles.forEach((tile, i) => {
    const back = tileCanvas(tile, h, place)
    Backdrop.paintBackdrop(back.ctx, place)
    applyForestFilmGrainToCanvas(back.canvas, GRAIN_SEED + i)
    k.loadSprite(tile.name + BACK, back.canvas)
    const soil = tileCanvas(tile, h, place)
    Scene.paintTerrain(soil.ctx, place, true)
    soil.ctx.setTransform(1, 0, 0, 1, -tile.x, 0)
    paintShade(soil.ctx, w, h)
    applyForestFilmGrainToCanvas(soil.canvas, GRAIN_SEED + i)
    k.loadSprite(tile.name + SOIL, soil.canvas)
  })
  bakedFor.has(k) || bakedFor.set(k, new Set())
  bakedFor.get(k).add(key)
  return tiles
}
//
// A tile's canvas, its context set to paint the world into it.
//
function tileCanvas(tile, h, place) {
  const canvas = document.createElement('canvas')
  canvas.width = tile.w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.translate(-tile.x, 0)
  ctx.scale(place.scale, place.scale)
  ctx.translate(-place.x1, -place.y1)
  return { canvas, ctx }
}
function paintShade(ctx, w, h) {
  const g = ctx.createLinearGradient(0, h * SHADE_FROM, 0, h)
  g.addColorStop(0, `${CAVE_CFG.colors.frame}00`)
  g.addColorStop(1, CAVE_CFG.colors.frame)
  ctx.globalAlpha = SHADE_ALPHA
  ctx.fillStyle = g
  ctx.fillRect(0, h * SHADE_FROM, w, h * (1 - SHADE_FROM))
  ctx.globalAlpha = 1
}
