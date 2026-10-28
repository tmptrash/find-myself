import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import * as Layout from '../utils/cave-layout.js'
import { FOREST_PAL } from '../../forest/utils/forest-palette.js'
//
// Water drops gathering on stalactite tips and falling: each source swells
// a drop, lets it go under gravity, and on impact the drop bursts into a
// few tiny splashes and reports the landing (for its sound). Drops take the
// lake's water colour with a lit edge.
//
const GRAVITY = 1500
const GROW_TIME = 0.9
const WAIT_MIN = 6
const WAIT_RANGE = 14
const DROP_W = 2
const DROP_LEN_MIN = 3
const DROP_STRETCH = 0.012
const DROP_LEN_MAX = 9
const DROP_GLOW_R = 4
const DROP_OPACITY = 0.85
const GLOW_OPACITY = 0.35
const SPLASH_COUNT = 4
const SPLASH_SPEED_X = 60
const SPLASH_SPEED_Y = 90
const SPLASH_LIFE = 0.35
const SPLASH_SIZE = 1.5
const CULL_PAD = 60

/**
 * Creates the drip sources.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<{x: number, y: number}>} cfg.tips - Stalactite tip points
 * @param {(x: number, y: number, water: boolean) => void} cfg.onLand - Called when a drop lands
 * @returns {Object} Drips instance
 */
export function create(cfg) {
  const { k, tips, onLand } = cfg
  Glow.create(k)
  return {
    k,
    onLand,
    sources: tips.map(tip => ({ ...tip, land: Layout.dropLandAt(tip.x, tip.y), wait: Math.random() * WAIT_RANGE, grow: -1 })),
    drops: [],
    splashes: [],
    dropRgb: getRGB(k, FOREST_PAL.water),
    lightRgb: getRGB(k, FOREST_PAL.waterPaint.ripple)
  }
}

/**
 * Grows, drops and lands the drips.
 * @param {Object} inst - Drips instance
 */
export function onUpdate(inst) {
  const dt = inst.k.dt()
  inst.sources.forEach(src => tickSource(inst, src, dt))
  inst.drops.forEach(d => {
    d.vy += GRAVITY * dt
    d.y += d.vy * dt
  })
  inst.drops.filter(d => d.y >= d.land.y).forEach(d => land(inst, d))
  inst.drops = inst.drops.filter(d => d.y < d.land.y)
  inst.splashes.forEach(p => {
    p.vy += GRAVITY * dt
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.life -= dt
  })
  inst.splashes = inst.splashes.filter(p => p.life > 0)
}

/**
 * Draws growing drops, falling drops and splashes in the visible band.
 * @param {Object} inst - Drips instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDraw(inst, top, bottom) {
  const k = inst.k
  const inView = y => y > top - CULL_PAD && y < bottom + CULL_PAD
  inst.sources.forEach(src => {
    src.grow >= 0 && inView(src.y) && drawDrop(inst, src.x, src.y, DROP_LEN_MIN * src.grow)
  })
  inst.drops.forEach(d => inView(d.y) && drawDrop(inst, d.x, d.y, Math.min(DROP_LEN_MAX, DROP_LEN_MIN + d.vy * DROP_STRETCH)))
  inst.splashes.forEach(p => {
    inView(p.y) && k.drawRect({
      pos: k.vec2(p.x, p.y),
      width: SPLASH_SIZE,
      height: SPLASH_SIZE,
      color: inst.dropRgb,
      opacity: DROP_OPACITY * p.life / SPLASH_LIFE
    })
  })
}
//
// Waits, then swells a drop on the tip; when full it falls.
//
function tickSource(inst, src, dt) {
  if (src.grow >= 0) {
    src.grow += dt / GROW_TIME
    if (src.grow < 1) return
    src.grow = -1
    src.wait = WAIT_MIN + Math.random() * WAIT_RANGE
    inst.drops.push({ x: src.x, y: src.y, vy: 0, land: src.land })
    return
  }
  src.wait -= dt
  src.wait <= 0 && (src.grow = 0)
}
function land(inst, d) {
  for (let i = 0; i < SPLASH_COUNT; i++) {
    inst.splashes.push({
      x: d.x,
      y: d.land.y - 1,
      vx: (Math.random() - 0.5) * 2 * SPLASH_SPEED_X,
      vy: -Math.random() * SPLASH_SPEED_Y,
      life: SPLASH_LIFE
    })
  }
  inst.onLand(d.x, d.land.y, d.land.water)
}
//
// Lake-coloured drop with a one-pixel lit edge and a faint glint around it.
//
function drawDrop(inst, x, y, len) {
  const k = inst.k
  const h = Math.max(1, len)
  Glow.drawGlow(k, x, y + h / 2, DROP_GLOW_R, inst.dropRgb, GLOW_OPACITY)
  k.drawRect({ pos: k.vec2(x - DROP_W / 2, y), width: DROP_W, height: h, color: inst.dropRgb, opacity: DROP_OPACITY })
  k.drawRect({ pos: k.vec2(x - DROP_W / 2, y), width: 1, height: h, color: inst.lightRgb, opacity: DROP_OPACITY })
}
