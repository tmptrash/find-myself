import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { unloadSprite } from '../../../utils/sprite-unload.js'
import * as Fireflies from '../components/cave-fireflies.js'
import * as Runner from '../components/cave-runner.js'
import * as Atlas from './cave-atlas.js'
import * as Backdrop from './cave-backdrop.js'
import * as Earth from './cave-earth.js'
import * as Surface from './cave-surface.js'
//
// The inside of the menu's level panel when the cave level is chosen: the
// level's far parallax wall with the cave's soil over its lower part — its
// line runs through the foot of the cave level's eye, so the eye grows out
// of it — a few yellow fireflies in the air over it, and one runner
// scurrying along the soil's top, now and then leaping for a firefly (an
// eaten one lights up again at once somewhere else, so they never run
// out). It runs on the soil as painted: its legs' rays (Surface.raycastIn)
// meet the painted soil's own pixels, lumps and all. Drawn inside the
// panel's rounded shape by the menu; the picture (wall and soil) is baked
// once per live k and panel size, the soil's solid shape kept once per
// page.
//
const SPRITE_PREFIX = 'cave0-menu-panel-v1-'
const GRAIN_SEED = 9450
//
// The soil's top: a gentle wave GROUND_WAVE_AMP px high, GROUND_WAVE_LEN px
// long, level with the line at the eye's foot. The soil runs GROUND_PAD px
// past the panel's sides (its painted edges never show), its top line
// sampled every GROUND_STEP px.
//
const GROUND_WAVE_AMP = 3
const GROUND_WAVE_LEN = 120
const GROUND_PAD = 32
const GROUND_STEP = 6
const GROUND_SEED = 9460
//
// Fireflies: how many, kept FIREFLY_PAD px clear of the soil and inside
// the panel by FIREFLY_INSET px, over the soil's line by
// FIREFLY_GROUND_CLEAR px.
//
const FIREFLY_COUNT = 7
const FIREFLY_PAD = 8
const FIREFLY_INSET = 10
const FIREFLY_GROUND_CLEAR = 14
//
// The runner: its size, its seed; it starts RUNNER_START of the way along
// the soil's top.
//
const RUNNER_SIZE = 0.85
const RUNNER_SEED = 4521
const RUNNER_START = 0.5
const bakedFor = new WeakMap()
const soilFor = new Map()

/**
 * Creates the panel's cave inside for the panel's card (baking its picture
 * on first use).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {{x1: number, y1: number, w: number, h: number}} cfg.panel - The panel's card (screen)
 * @param {{y: number, eyeX: number}} cfg.ground - The soil's line (screen Y) through the eye's foot at eyeX
 * @returns {Object} Panel inside instance
 */
export function create(cfg) {
  const { k, panel, ground } = cfg
  const local = { y: ground.y - panel.y1, eyeX: ground.eyeX - panel.x1 }
  const ready = Atlas.isLoaded()
  const soil = ready ? soilOf(panel.w, panel.h, local) : null
  const mask = soil ? Surface.maskFromCanvas(soil, panel.x1, panel.y1) : null
  const inst = {
    k,
    panel,
    mask,
    sprite: bake(k, panel.w, panel.h, local, soil),
    view: { left: panel.x1, top: panel.y1, right: panel.x1 + panel.w, bottom: panel.y1 + panel.h },
    fireflies: null,
    runner: mask ? createRunner(k, mask) : null,
    food: { prey: [], onEat: null }
  }
  inst.fireflies = Fireflies.create({
    k,
    bounds: { x1: panel.x1 + FIREFLY_INSET, y1: panel.y1 + FIREFLY_INSET, x2: panel.x1 + panel.w - FIREFLY_INSET, y2: ground.y - FIREFLY_GROUND_CLEAR },
    count: FIREFLY_COUNT,
    isOpen: (x, y) => isOpenAir(inst, x, y)
  })
  inst.food.onEat = f => Fireflies.eat(inst.fireflies, f)
  return inst
}

/**
 * Frees the baked picture on this engine (the menu is left for a level).
 * @param {Object} k - Kaplay instance
 */
export function release(k) {
  bakedFor.get(k)?.forEach(name => unloadSprite(k, name))
  bakedFor.delete(k)
}

/**
 * Moves the living parts: the fireflies wander, the runner scurries and
 * hunts them.
 * @param {Object} inst - Panel inside instance
 */
export function onUpdate(inst) {
  Fireflies.onUpdate(inst.fireflies)
  if (!inst.runner) return
  inst.food.prey.length = 0
  Fireflies.forEachLit(inst.fireflies, f => inst.food.prey.push(f))
  Runner.onUpdate(inst.runner, null, inst.food)
}

/**
 * Draws the inside (the menu masks it to the panel's shape), all of it
 * opaque — the menu fades the other look over it: the wall and soil, the
 * fireflies, the runner.
 * @param {Object} inst - Panel inside instance
 */
export function onDraw(inst) {
  const k = inst.k
  k.drawSprite({ sprite: inst.sprite, pos: k.vec2(inst.panel.x1, inst.panel.y1) })
  Fireflies.onDraw(inst.fireflies, inst.view.top, inst.view.bottom)
  inst.runner && Runner.onDraw(inst.runner, inst.view)
}
//
// The runner, on the soil's top.
//
function createRunner(k, mask) {
  const runs = Surface.crawlRunsOf(mask)
  if (!runs.length) return null
  const run = runs.reduce((a, b) => (b.len > a.len ? b : a))
  return Runner.create({ k, run, s: run.len * RUNNER_START, dir: 1, size: RUNNER_SIZE, seed: RUNNER_SEED, mask })
}
//
// Open air for the fireflies: clear of the soil by FIREFLY_PAD px.
//
function isOpenAir(inst, x, y) {
  const m = inst.mask
  return !m || (!Surface.isSoilIn(m, x, y) && !Surface.isSoilIn(m, x, y + FIREFLY_PAD))
}
//
// The soil's top line at a panel-local X: level with the eye's foot there,
// waving gently either side.
//
function groundTopAt(ground, x) {
  return ground.y + GROUND_WAVE_AMP * Math.sin((x - ground.eyeX) / GROUND_WAVE_LEN * Math.PI * 2)
}
//
// The panel's soil (panel-local, see-through over it): the cave's soil —
// its block, stones, the top strips along its line — painted once per
// page and size; the runner's ground and the picture's lower part.
//
function soilOf(w, h, ground) {
  const key = `${w}x${h}-${Math.round(ground.y)}-${Math.round(ground.eyeX)}`
  const cached = soilFor.get(key)
  if (cached) return cached
  const x1 = -GROUND_PAD
  const x2 = w + GROUND_PAD
  const core = []
  for (let x = x1; x <= x2; x += GROUND_STEP) core.push({ x, y: groundTopAt(ground, x) + Earth.TOP_INSET })
  core.push({ x: x2, y: h + GROUND_PAD }, { x: x1, y: h + GROUND_PAD })
  const layer = Earth.soilLayer({ core, top: { x1, x2, at: x => groundTopAt(ground, x), fadeL: false, fadeR: false } }, GROUND_SEED)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d', { willReadFrequently: true }).drawImage(layer.canvas, layer.x, layer.y)
  layer.canvas.width = 0
  layer.canvas.height = 0
  soilFor.set(key, canvas)
  return canvas
}
//
// The picture, once per live k and panel size: the far wall over the whole
// card, the soil over its lower part, film grain.
//
function bake(k, w, h, ground, soil) {
  const name = `${SPRITE_PREFIX}${w}x${h}-${Math.round(ground.y)}-${Math.round(ground.eyeX)}`
  if (k.getSprite(name) || !soil) return name
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  Backdrop.paintBackdrop(ctx, { x1: 0, y1: 0, x2: w, y2: h })
  ctx.drawImage(soil, 0, 0)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  k.loadSprite(name, canvas)
  canvas.width = 0
  canvas.height = 0
  bakedFor.has(k) || bakedFor.set(k, new Set())
  bakedFor.get(k).add(name)
  return name
}
