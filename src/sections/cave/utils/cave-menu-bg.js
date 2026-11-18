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
  Lantern.setPose(lantern, toScreenX(place, Layout.LANTERN.x), toScreenY(place, Layout.LANTERN.y), place.scale)
  const ready = Atlas.isLoaded()
  return {
    k,
    place,
    world: { left: place.x1, top: place.y1, right: place.x2, bottom: place.y2 },
    tiles: bake(k, w, h, place),
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
 * Draws the picture, the lantern, then the additive glows.
 * @param {Object} inst - Backdrop instance
 * @param {number} opacity - Cross-fade 0 … 1
 */
export function onDraw(inst, opacity) {
  const k = inst.k
  inst.tiles.forEach(tile => k.drawSprite({ sprite: tile.name, pos: k.vec2(tile.x, 0), opacity }))
  if (opacity < 1) return
  Lantern.onDraw(inst.lantern)
  drawWorldLife(inst)
  Lantern.onDrawHalo(inst.lantern)
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
function toScreenX(place, x) {
  return (x - place.x1) * place.scale
}
function toScreenY(place, y) {
  return (y - place.y1) * place.scale
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
  })
  bakedFor.has(k) || bakedFor.set(k, new Set())
  bakedFor.get(k).add(key)
  return tiles
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
