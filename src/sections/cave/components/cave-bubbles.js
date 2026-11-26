import { getRGB } from '../../../utils/helper.js'
import * as Ring from '../../../utils/ring-draw.js'
import { CAVE_CFG } from '../cfg.js'
import * as CaveLake from '../utils/cave-lake.js'
import * as Ground from '../utils/cave-ground.js'
//
// Bubbles rising from the lake's bed: now and then a few come up off the
// soil somewhere along the bottom, one after another — and now and then
// one or two out of a swimming fish's mouth — and rise wobbling,
// faster as they go, to the top of the water — popping on the surface
// with a tiny ring and a plip (onPop), or gone under a hollow's soil
// ceiling. Drawn over the
// water's paint (they catch the light), faint.
//
const C = CAVE_CFG.bubbles
//
// A burst every BURST_EVERY..+RANGE s: BURST_MIN..+RANGE bubbles out of
// one spot on the bed (where the water is DEEP_MIN px deep or more, read
// at most PICK_TRIES times), BURST_STAGGER..+RANGE s apart, each
// R_MIN..+RANGE px round.
//
const BURST_EVERY = 0.75
const BURST_EVERY_RANGE = 2.5
const BURST_MIN = 1
const BURST_RANGE = 4
const BURST_STAGGER = 0.12
const BURST_STAGGER_RANGE = 0.25
const DEEP_MIN = 40
const PICK_TRIES = 12
const R_MIN = 1.5
const R_RANGE = 2
//
// Rising at RISE..+RANGE px/s, speeding up RISE_ACC px/s² up to RISE_MAX,
// wobbling WOBBLE..+RANGE px across at WOBBLE_HZ..+RANGE; leaving the bed
// BED_OFF px up from its top.
//
const RISE = 24
const RISE_RANGE = 18
const RISE_ACC = 14
const RISE_MAX = 70
const WOBBLE = 0.8
const WOBBLE_RANGE = 1.6
const WOBBLE_HZ = 1.4
const WOBBLE_HZ_RANGE = 1.4
const BED_OFF = 2
//
// A fish breathes out a bubble or two (MOUTH_MIN..+RANGE) every
// MOUTH_EVERY..+RANGE s, smaller ones (MOUTH_R of a bed bubble's size,
// times the fish's own size: a big fish's bigger, a small one's smaller).
//
const MOUTH_EVERY = 6
const MOUTH_EVERY_RANGE = 14
const MOUTH_MIN = 1
const MOUTH_RANGE = 2
const MOUTH_R = 0.8
//
// Look: BODY_ALPHA see-through, its rim RIM_W wide at RIM_ALPHA; a pop is a
// ring growing to POP_R px over POP_TIME s, POP_FLAT as high as wide.
//
const BODY_ALPHA = 0.35
const RIM_ALPHA = 0.8
const RIM_W = 0.8
const POP_R = 4
const POP_TIME = 0.4
const POP_FLAT = 0.3
const FULL_TURN = Math.PI * 2

/**
 * Creates the lake's bubbles.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake instance (cave-lake.js)
 * @param {(x: number, r: number) => void} [cfg.onPop] - A bubble popped on the surface (its X, its radius), to be heard
 * @returns {Object} Bubbles instance
 */
export function create(cfg) {
  const { k, lake } = cfg
  return {
    k,
    lake,
    onPop: cfg.onPop ?? null,
    burstIn: BURST_EVERY * Math.random(),
    queue: [],
    bubbles: [],
    pops: [],
    mouths: new WeakMap(),
    bodyRgb: getRGB(k, C.body),
    rimRgb: getRGB(k, C.rim)
  }
}

/**
 * Runs them on: a new burst now and then off the bed, a breath now and
 * then out of a fish's mouth, every bubble rising, the pops fading.
 * @param {Object} inst - Bubbles instance
 * @param {Array<{at: {x: number, y: number}, size: number}>} [mouths=[]] - The swimming fish's mouths (their head, their size; the same object for a fish all along)
 */
export function onUpdate(inst, mouths = []) {
  const dt = inst.k.dt()
  if (dt <= 0) return
  inst.burstIn -= dt
  inst.burstIn <= 0 && burst(inst)
  mouths.forEach(m => breathe(inst, m, dt))
  inst.queue.forEach(b => { b.wait -= dt })
  inst.queue.filter(b => b.wait <= 0).forEach(b => inst.bubbles.push(b))
  inst.queue = inst.queue.filter(b => b.wait > 0)
  inst.bubbles.forEach(b => rise(inst, b, dt))
  inst.bubbles = inst.bubbles.filter(b => !b.gone)
  inst.pops.forEach(p => { p.t += dt })
  inst.pops = inst.pops.filter(p => p.t < POP_TIME)
}

/**
 * Draws them (over the water's paint): each bubble faint with a bright
 * rim, each pop a fading ring on the surface.
 * @param {Object} inst - Bubbles instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 */
export function onDraw(inst, view) {
  const k = inst.k
  inst.bubbles.forEach(b => {
    if (b.x < view.left || b.x > view.right || b.y < view.top || b.y > view.bottom) return
    const x = b.x + Math.sin(b.phase) * b.wobble
    Ring.disc(k, x, b.y, b.r, b.r, inst.bodyRgb, BODY_ALPHA)
    Ring.ring(k, x, b.y, b.r, b.r, RIM_W, inst.rimRgb, RIM_ALPHA)
  })
  inst.pops.forEach(p => {
    const u = p.t / POP_TIME
    Ring.ring(k, p.x, p.y, POP_R * u + p.r, (POP_R * u + p.r) * POP_FLAT, RIM_W, inst.rimRgb, RIM_ALPHA * (1 - u))
  })
}
//
// A burst: a few bubbles queued to leave one spot on the bed one after
// another.
//
function burst(inst) {
  inst.burstIn = BURST_EVERY + Math.random() * BURST_EVERY_RANGE
  const spot = pickSpot()
  spot && queue(inst, spot, BURST_MIN + Math.floor(Math.random() * BURST_RANGE), 1)
}
//
// A fish breathing out now and then (its own wait, kept by its head).
//
function breathe(inst, mouth, dt) {
  const left = (inst.mouths.get(mouth) ?? MOUTH_EVERY * Math.random()) - dt
  inst.mouths.set(mouth, left > 0 ? left : MOUTH_EVERY + Math.random() * MOUTH_EVERY_RANGE)
  left > 0 || queue(inst, mouth.at, MOUTH_MIN + Math.floor(Math.random() * MOUTH_RANGE), MOUTH_R * mouth.size)
}
//
// Bubbles queued to leave a spot one after another, `size` times a bed
// bubble's size.
//
function queue(inst, spot, count, size) {
  let wait = 0
  for (let i = 0; i < count; i++) {
    inst.queue.push({
      x: spot.x,
      y: spot.y,
      r: (R_MIN + Math.random() * R_RANGE) * size,
      vy: RISE + Math.random() * RISE_RANGE,
      wobble: WOBBLE + Math.random() * WOBBLE_RANGE,
      hz: WOBBLE_HZ + Math.random() * WOBBLE_HZ_RANGE,
      phase: Math.random() * FULL_TURN,
      wait,
      gone: false
    })
    wait += BURST_STAGGER + Math.random() * BURST_STAGGER_RANGE
  }
}
//
// A spot on the bed under deep enough water (null if none was found).
//
function pickSpot() {
  const water = Ground.waterColumns()
  for (let i = 0; i < PICK_TRIES; i++) {
    const c = Math.floor(Math.random() * water.tops.length)
    const top = water.tops[c]
    const bed = water.beds[c]
    if (Number.isNaN(top) || Number.isNaN(bed) || bed - top < DEEP_MIN) continue
    return { x: water.x0 + c, y: bed - BED_OFF }
  }
  return null
}
//
// A bubble rising, wobbling; at the water's top it pops (on the open
// surface) or is gone (under a soil ceiling).
//
function rise(inst, b, dt) {
  b.vy = Math.min(RISE_MAX, b.vy + RISE_ACC * dt)
  b.y -= b.vy * dt
  b.phase += b.hz * FULL_TURN * dt
  const top = CaveLake.waterTopAt(inst.lake, b.x)
  if (b.y - b.r > top) return
  b.gone = true
  if (top > CaveLake.surfaceAt(inst.lake, b.x)) return
  inst.pops.push({ x: b.x, y: top, r: b.r, t: 0 })
  inst.onPop?.(b.x, b.r)
}
