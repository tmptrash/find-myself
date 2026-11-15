import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import * as Layout from '../utils/cave-layout.js'
import { CAVE_CFG } from '../cfg.js'
//
// The exit: warm gold light rising out of the crevice between the upper
// ledges (Layout.EXIT) — discovery, the way on. Soft glow blobs stacked up
// the crevice from its glow point to its mouth, breathing slowly
// (BREATH_SEC, ±BREATH of their strength), a brighter heart at the glow
// point, and dust motes drifting up through it. Drawn additively.
//
const GLOWS = [
  { at: 0, r: 230, opacity: 0.32 },
  { at: 0.35, r: 170, opacity: 0.26 },
  { at: 0.7, r: 130, opacity: 0.22 },
  { at: 1, r: 110, opacity: 0.2 }
]
const HEART_R = 70
const HEART_OPACITY = 0.35
const BREATH_SEC = 4.5
const BREATH = 0.18
//
// Motes: count, size, rise speed range, side drift, how wide a band of the
// crevice they fill, fade at both ends of their climb.
//
const MOTES = 26
const MOTE_R_MIN = 1.2
const MOTE_R_RANGE = 1.4
const MOTE_GLOW = 3.5
const MOTE_GLOW_ALPHA = 0.3
const MOTE_RISE_MIN = 14
const MOTE_RISE_RANGE = 22
const MOTE_DRIFT = 9
const MOTE_DRIFT_HZ = 0.35
const MOTE_BAND = 0.8
const MOTE_FADE = 0.2
const CULL_PAD = 260
const HALF = 0.5

/**
 * Creates the exit's light.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @returns {Object} Exit inst
 */
export function create(cfg) {
  const { k } = cfg
  Glow.create(k)
  const pal = CAVE_CFG.exit
  return {
    k,
    glowRgb: getRGB(k, pal.glow),
    coreRgb: getRGB(k, pal.core),
    moteRgb: getRGB(k, pal.mote),
    motes: Array.from({ length: MOTES }, () => newMote(Math.random()))
  }
}

/**
 * Drifts the motes up the crevice. Call once per frame.
 * @param {Object} inst - Exit inst
 */
export function onUpdate(inst) {
  const dt = inst.k.dt()
  inst.motes.forEach((m, i) => {
    m.y -= m.rise * dt
    m.age += dt
    m.y < Layout.EXIT.y1 && (inst.motes[i] = newMote(0))
  })
}

/**
 * Draws the light and the motes (additive; call in the lights pass).
 * @param {Object} inst - Exit inst
 * @param {{left: number, top: number, right: number, bottom: number}} view - Visible world rect
 */
export function onDraw(inst, view) {
  const e = Layout.EXIT
  if (e.glowX + CULL_PAD < view.left || e.glowX - CULL_PAD > view.right || e.y1 - CULL_PAD > view.bottom || e.y2 + CULL_PAD < view.top) return
  const k = inst.k
  const breath = 1 + Math.sin(k.time() / BREATH_SEC * Math.PI * 2) * BREATH
  GLOWS.forEach(g => Glow.drawGlow(k, e.glowX, e.glowY + (e.y1 - e.glowY) * g.at, g.r, inst.glowRgb, g.opacity * breath))
  Glow.drawGlow(k, e.glowX, e.glowY, HEART_R, inst.coreRgb, HEART_OPACITY * breath)
  inst.motes.forEach(m => drawMote(inst, m))
}
//
// A mote somewhere in the crevice band (`climbed`: share of the climb it
// has already done).
//
function newMote(climbed) {
  const e = Layout.EXIT
  const band = (e.x2 - e.x1) * MOTE_BAND
  return {
    x: e.glowX + (Math.random() - HALF) * band,
    y: e.y2 - (e.y2 - e.y1) * climbed,
    r: MOTE_R_MIN + Math.random() * MOTE_R_RANGE,
    rise: MOTE_RISE_MIN + Math.random() * MOTE_RISE_RANGE,
    phase: Math.random() * Math.PI * 2,
    age: 0
  }
}
//
// A mote fades in at the crevice's foot and out at its mouth, drifting side
// to side.
//
function drawMote(inst, m) {
  const e = Layout.EXIT
  const u = (e.y2 - m.y) / (e.y2 - e.y1)
  const fade = Math.min(1, u / MOTE_FADE, (1 - u) / MOTE_FADE)
  if (fade <= 0) return
  const x = m.x + Math.sin(m.phase + m.age * MOTE_DRIFT_HZ * Math.PI * 2) * MOTE_DRIFT
  Glow.drawGlow(inst.k, x, m.y, m.r * MOTE_GLOW, inst.moteRgb, fade * MOTE_GLOW_ALPHA)
  Glow.drawGlow(inst.k, x, m.y, m.r, inst.moteRgb, fade)
}
