import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Lantern from '../components/cave-lantern.js'
import * as Fireflies from '../components/cave-fireflies.js'
import * as Runner from '../components/cave-runner.js'
import * as Front from './cave-front.js'
import * as Atlas from './cave-atlas.js'
import * as Backdrop from './cave-backdrop.js'
import * as Layout from './cave-layout.js'
import * as Scene from './cave-scene.js'
//
// The cave level as the menu's backdrop: the room round the hero's landing
// spot (back layers, the earth ledge with its moss and props, the ceiling
// with the roots' hole), painted by the level's own painters scaled to
// cover the screen and baked once per live k and screen size, with the
// lantern mushroom glowing on it, the level's runners scurrying over it
// and its big stones in front (both drawn live in its world, scaled onto
// the screen), and fireflies drifting over it. The bottom sinks into shade
// so the menu's key hints stay readable.
//
const SPRITE_PREFIX = 'cave0-menu-v4-'
const GRAIN_SEED = 9400
const MIN_SCREEN_PX = 64
const TILE_MAX = 2048
//
// World rect shown: its top and height; the middle ledge's left end
// (FOCUS_IN px in from it) sits at FOCUS_SHARE of the screen width (right
// of the level list).
//
const VIEW_Y1 = 20
const VIEW_H = 620
const FOCUS_IN = 40
const FOCUS_X = Layout.MID_LEDGE_X1 + FOCUS_IN
const FOCUS_SHARE = 0.68
//
// Shade over the bottom: from this share of the height down, reaching
// SHADE_ALPHA at the bottom edge.
//
const SHADE_FROM = 0.72
const SHADE_ALPHA = 0.85
const FIREFLY_COUNT = 34
//
// The lantern stands behind its ledge's front edge, as if planted in the
// soil: the soil round its foot (FOOT_PATCH_W px either side of it,
// FOOT_PATCH_UP over its foot and FOOT_PATCH_DOWN under it, world px) is
// cut out of the baked picture — its own pixels, only where there is
// soil, so no seam shows — and drawn again over the mushroom.
//
const FOOT_PATCH_W = 70
const FOOT_PATCH_UP = 40
const FOOT_PATCH_DOWN = 24
const FOOT_PATCH_NAME = 'foot'
const bakedFor = new WeakMap()

/**
 * Creates the backdrop for a screen size (baking it on first use).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.width - Screen width
 * @param {number} cfg.height - Screen height
 * @returns {Object} Backdrop instance
 */
export function create(cfg) {
  const { k } = cfg
  const w = Math.max(MIN_SCREEN_PX, Math.round(cfg.width))
  const h = Math.max(MIN_SCREEN_PX, Math.round(cfg.height))
  const place = placement(w, h)
  const lantern = Lantern.create({ k, x: 0, y: 0, collide: false, lit: true })
  Lantern.setPose(lantern, toScreenX(place, Layout.LANTERN.x), toScreenY(place, lanternFootY()), place.scale)
  const ready = Atlas.isLoaded()
  const baked = bake(k, w, h, place)
  return {
    k,
    place,
    world: { left: place.x1, top: place.y1, right: place.x2, bottom: place.y2 },
    tiles: baked.tiles,
    footPatch: baked.footPatch,
    front: ready ? Front.create(k) : null,
    runners: ready ? Runner.createAll(k) : [],
    lantern,
    fireflies: Fireflies.create({ k, bounds: { x1: 0, y1: 0, x2: w, y2: h * SHADE_FROM }, count: FIREFLY_COUNT })
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
 * Moves the living parts: the lantern breathes and squats, fireflies wander.
 * @param {Object} inst - Backdrop instance
 */
export function onUpdate(inst) {
  Lantern.onUpdate(inst.lantern, null)
  inst.runners.forEach(runner => Runner.onUpdate(runner, null))
  Fireflies.onUpdate(inst.fireflies)
}

/**
 * Draws the picture, the lantern and its halo behind the soil round its
 * foot, the runners and stones, then the fireflies.
 * @param {Object} inst - Backdrop instance
 * @param {number} opacity - Cross-fade 0 … 1
 */
export function onDraw(inst, opacity) {
  const k = inst.k
  inst.tiles.forEach(tile => k.drawSprite({ sprite: tile.name, pos: k.vec2(tile.x, 0), opacity }))
  if (opacity < 1) return
  Lantern.onDraw(inst.lantern)
  Lantern.onDrawHalo(inst.lantern)
  const patch = inst.footPatch
  k.getSprite(patch.name) && k.drawSprite({ sprite: patch.name, pos: k.vec2(patch.x, patch.y) })
  drawWorldLife(inst)
  Fireflies.onDraw(inst.fireflies, -Infinity, Infinity, opacity)
}
//
// The runners, then the big stones in front of them, in the level's world
// scaled onto the screen the way the picture is.
//
function drawWorldLife(inst) {
  const k = inst.k
  const { place } = inst
  k.pushTransform()
  k.pushScale(k.vec2(place.scale, place.scale))
  k.pushTranslate(k.vec2(-place.x1, -place.y1))
  inst.runners.forEach(runner => Runner.onDraw(runner, inst.world))
  inst.front && Front.onDraw(inst.front, inst.world)
  k.popTransform()
}
//
// World → screen: the shown rect's height fills the screen; it is placed so
// FOCUS_X sits at FOCUS_SHARE of the width (kept in the world).
//
function placement(w, h) {
  const scale = h / VIEW_H
  const viewW = w / scale
  const x1 = Math.max(0, Math.min(Layout.WORLD_W - viewW, FOCUS_X - viewW * FOCUS_SHARE))
  return { scale, x1, y1: VIEW_Y1, x2: x1 + viewW, y2: VIEW_Y1 + VIEW_H }
}
//
// The lantern's foot on its ledge's top, as in the level (its base is
// hidden behind the soil's front edge, see FOOT_PATCH_*).
//
function lanternFootY() {
  return Lantern.footYOn(Layout.PLATFORMS.find(p => p.id === Layout.LANTERN.on), Layout.LANTERN.x)
}
//
// The soil patch round the lantern's foot: its world rect and its screen
// rect (whole px).
//
function footPatchRect(place) {
  const foot = lanternFootY()
  const world = { x1: Layout.LANTERN.x - FOOT_PATCH_W, y1: foot - FOOT_PATCH_UP, x2: Layout.LANTERN.x + FOOT_PATCH_W, y2: foot + FOOT_PATCH_DOWN }
  const x = Math.floor(toScreenX(place, world.x1))
  const y = Math.floor(toScreenY(place, world.y1))
  return { world, x, y, w: Math.ceil(toScreenX(place, world.x2)) - x, h: Math.ceil(toScreenY(place, world.y2)) - y }
}
//
// Cuts the soil round the lantern's foot out of the baked tiles: their
// pixels in its rect, kept only where the terrain paints soil.
//
function bakeFootPatch(k, name, canvases, place) {
  const r = footPatchRect(place)
  if (r.w <= 0 || r.h <= 0) return
  const patch = document.createElement('canvas')
  patch.width = r.w
  patch.height = r.h
  const pctx = patch.getContext('2d')
  canvases.forEach(c => pctx.drawImage(c.canvas, c.x - r.x, -r.y))
  const mask = document.createElement('canvas')
  mask.width = r.w
  mask.height = r.h
  const mctx = mask.getContext('2d')
  mctx.translate(-r.x, -r.y)
  mctx.scale(place.scale, place.scale)
  mctx.translate(-place.x1, -place.y1)
  Scene.paintTerrain(mctx, r.world)
  pctx.globalCompositeOperation = 'destination-in'
  pctx.drawImage(mask, 0, 0)
  k.loadSprite(name, patch)
}
function toScreenX(place, x) {
  return (x - place.x1) * place.scale
}
function toScreenY(place, y) {
  return (y - place.y1) * place.scale
}
//
// Screen-wide columns, each under the texture limit, painted at screen
// resolution, and the soil patch round the lantern's foot cut out of
// them; once per live k and size.
//
function bake(k, w, h, place) {
  const key = `${w}x${h}`
  const tiles = []
  const count = Math.ceil(w / TILE_MAX)
  const tileW = Math.ceil(w / count)
  for (let i = 0; i < count; i++) tiles.push({ name: `${SPRITE_PREFIX}${key}-${i}`, x: i * tileW, w: Math.min(tileW, w - i * tileW) })
  const rect = footPatchRect(place)
  const footPatch = { name: `${SPRITE_PREFIX}${key}-${FOOT_PATCH_NAME}`, x: rect.x, y: rect.y }
  if (bakedFor.get(k)?.has(key) || !Atlas.isLoaded()) return { tiles, footPatch }
  const canvases = []
  tiles.forEach((tile, i) => {
    const canvas = document.createElement('canvas')
    canvas.width = tile.w
    canvas.height = h
    const ctx = canvas.getContext('2d')
    ctx.translate(-tile.x, 0)
    ctx.scale(place.scale, place.scale)
    ctx.translate(-place.x1, -place.y1)
    Backdrop.paintBackdrop(ctx, place)
    Scene.paintTerrain(ctx, place)
    ctx.setTransform(1, 0, 0, 1, -tile.x, 0)
    paintShade(ctx, w, h)
    applyForestFilmGrainToCanvas(canvas, GRAIN_SEED + i)
    k.loadSprite(tile.name, canvas)
    canvases.push({ canvas, x: tile.x })
  })
  bakeFootPatch(k, footPatch.name, canvases, place)
  bakedFor.has(k) || bakedFor.set(k, new Set())
  bakedFor.get(k).add(key)
  return { tiles, footPatch }
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
