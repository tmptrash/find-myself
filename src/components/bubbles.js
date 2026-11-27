import { getRGB } from '../utils/helper.js'
import * as Ring from '../utils/ring-draw.js'
//
// Bubbles rising from a lake's bed (the cave's lake, the forest's): now
// and then a few come up off the bed somewhere along the bottom, one
// after another — and, where fish swim, now and then one or two out of a
// fish's mouth — and rise wobbling, faster as they go, to the top of the
// water — popping on the surface with a tiny ring (onPop), or gone under
// a soil ceiling over the water. The lake tells where: a spot on its bed
// (pickSpot), its water's top and its open surface over an X (topAt,
// surfaceAt). Drawn over the water's paint, faint — and shaded as the
// water round them is: a bubble takes the lake's own depth gradient
// (tintAt: its light colour near the top, its dark one growing toward the
// bed, DEPTH_SHADE of it: they catch a little light), so it is dark down
// by the bed and bright under the surface.
//
const DEPTH_SHADE = 0.9
//
// A burst every BURST_EVERY..+RANGE s (times the lake's `pace`):
// BURST_MIN..+RANGE bubbles out of one spot on the bed (the lake picks
// it), BURST_STAGGER..+RANGE s apart, each R_MIN..+RANGE px round.
//
const BURST_EVERY = 0.75
const BURST_EVERY_RANGE = 2.5
const BURST_MIN = 1
const BURST_RANGE = 4
const BURST_STAGGER = 0.12
const BURST_STAGGER_RANGE = 0.25
const R_MIN = 1.5
const R_RANGE = 2
//
// Rising at RISE..+RANGE px/s, speeding up RISE_ACC px/s² up to RISE_MAX,
// wobbling WOBBLE..+RANGE px across at WOBBLE_HZ..+RANGE.
//
const RISE = 24
const RISE_RANGE = 18
const RISE_ACC = 14
const RISE_MAX = 70
const WOBBLE = 0.8
const WOBBLE_RANGE = 1.6
const WOBBLE_HZ = 1.4
const WOBBLE_HZ_RANGE = 1.4
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
 * Creates a lake's bubbles.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {{body: string, rim: string, depthLight: string, depthDark: string}} cfg.colors - A bubble's body and bright rim; the water's depth gradient colours (hex)
 * @param {() => ({x: number, y: number}|null)} cfg.pickSpot - A spot on the bed for a burst to leave (null: none this time)
 * @param {(x: number) => number} cfg.topAt - World Y of the water's top over a world X (its surface, or a ceiling over it)
 * @param {(x: number) => number} cfg.surfaceAt - World Y of the open surface over a world X
 * @param {(y: number, out: {light: number, dark: number}) => Object} cfg.tintAt - The water's depth gradient at a world Y (how much of its light, then of its dark colour lies over what is there), written to `out`
 * @param {(x: number, r: number) => void} [cfg.onPop] - A bubble popped on the surface (its X, its radius)
 * @param {number} [cfg.pace=1] - How many times longer the gaps between bursts are (a small lake bubbles less)
 * @returns {Object} Bubbles instance
 */
export function create(cfg) {
  const { k, colors } = cfg
  return {
    k,
    pickSpot: cfg.pickSpot,
    topAt: cfg.topAt,
    surfaceAt: cfg.surfaceAt,
    tintAt: cfg.tintAt,
    onPop: cfg.onPop ?? null,
    pace: cfg.pace ?? 1,
    burstIn: BURST_EVERY * Math.random(),
    queue: [],
    bubbles: [],
    pops: [],
    mouths: new WeakMap(),
    bodyRgb: getRGB(k, colors.body),
    rimRgb: getRGB(k, colors.rim),
    lightRgb: getRGB(k, colors.depthLight),
    darkRgb: getRGB(k, colors.depthDark),
    bodyShade: getRGB(k, colors.body),
    rimShade: getRGB(k, colors.rim),
    tint: { light: 0, dark: 0 }
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
 * rim, both shaded by the water's depth there; each pop a fading ring on
 * the surface.
 * @param {Object} inst - Bubbles instance
 * @param {{left: number, right: number, top: number, bottom: number}|null} [view=null] - World rect in view (null: all of them are drawn)
 */
export function onDraw(inst, view = null) {
  const k = inst.k
  inst.bubbles.forEach(b => {
    if (view && (b.x < view.left || b.x > view.right || b.y < view.top || b.y > view.bottom)) return
    const x = b.x + Math.sin(b.phase) * b.wobble
    const tint = inst.tintAt(b.y, inst.tint)
    Ring.disc(k, x, b.y, b.r, b.r, shade(inst, inst.bodyRgb, tint, inst.bodyShade), BODY_ALPHA)
    Ring.ring(k, x, b.y, b.r, b.r, RIM_W, shade(inst, inst.rimRgb, tint, inst.rimShade), RIM_ALPHA)
  })
  inst.pops.forEach(p => {
    const u = p.t / POP_TIME
    Ring.ring(k, p.x, p.y, POP_R * u + p.r, (POP_R * u + p.r) * POP_FLAT, RIM_W, inst.rimRgb, RIM_ALPHA * (1 - u))
  })
}
//
// A colour as the water's depth gradient leaves it (written to `out`):
// the lake's light colour laid over it, then its dark one, DEPTH_SHADE of
// each.
//
function shade(inst, base, tint, out) {
  const light = tint.light * DEPTH_SHADE
  const dark = tint.dark * DEPTH_SHADE
  out.r = (base.r + (inst.lightRgb.r - base.r) * light) * (1 - dark) + inst.darkRgb.r * dark
  out.g = (base.g + (inst.lightRgb.g - base.g) * light) * (1 - dark) + inst.darkRgb.g * dark
  out.b = (base.b + (inst.lightRgb.b - base.b) * light) * (1 - dark) + inst.darkRgb.b * dark
  return out
}
//
// A burst: a few bubbles queued to leave one spot on the bed one after
// another.
//
function burst(inst) {
  inst.burstIn = (BURST_EVERY + Math.random() * BURST_EVERY_RANGE) * inst.pace
  const spot = inst.pickSpot()
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
// A bubble rising, wobbling; at the water's top it pops (on the open
// surface) or is gone (under a soil ceiling).
//
function rise(inst, b, dt) {
  b.vy = Math.min(RISE_MAX, b.vy + RISE_ACC * dt)
  b.y -= b.vy * dt
  b.phase += b.hz * FULL_TURN * dt
  const top = inst.topAt(b.x)
  if (b.y - b.r > top) return
  b.gone = true
  if (top > inst.surfaceAt(b.x)) return
  inst.pops.push({ x: b.x, y: top, r: b.r, t: 0 })
  inst.onPop?.(b.x, b.r)
}
