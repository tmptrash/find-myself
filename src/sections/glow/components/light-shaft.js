import { GLOW_PAL } from '../utils/glow-palette.js'
//
// Soft sunlight rays falling from one sun point above the upper-left corner.
// Every ray is a wedge cut from that point, so its edges drift apart the
// farther they get from the sun, and the rays fan out slightly from each
// other — one source, perspective spread. Each wedge is clipped to the band
// between the playfield top and the ground line, so the light always lands
// on the ground. Softness comes from per-vertex opacity (across the width
// and along the length), and a warm pool of light is laid where the ray
// meets the ground. Everything is drawn with Screen blending above the world
// decor, so whatever the ray crosses — grass, mushrooms, the hero, the
// ground lip — is lightened, never darkened.
//
const SHAFT_COLUMNS = 18
const SHAFT_ACROSS_POW = 1.4
const SHAFT_HEAD_FRAC = 0.1
const SHAFT_BOTTOM_ALPHA = 0.7
//
// Inner structure: a few brighter streaks and dimmer gaps across each ray
// (deterministic per ray), as in the reference.
//
const SHAFT_STREAK_DEPTH = 0.6
const SHAFT_STREAK_FREQS = [2.3, 5.1]
const SHAFT_STREAK_WEIGHTS = [0.65, 0.35]
const SHAFT_STREAK_SHAFT_PHASE = 0.37
const SHAFT_STREAK_OCTAVE_PHASE = 0.61
const SHAFT_SHIMMER_AMP = 0.22
const SHAFT_SHIMMER_SPEED = 0.35
const SHAFT_SHIMMER_PHASE_STEP = 1.7
const SHAFT_MIN_DRAW_OPACITY = 0.01
//
// Ground pool: a flat ellipse centred on the ray foot, slightly sunk into
// the topsoil so the lit patch covers both the ground lip and the soil below.
//
const POOL_SEGMENTS = 20
const POOL_RX_MULT = 0.6
const POOL_RY = 16
const POOL_SINK_PX = 4
const POOL_ALPHA_MULT = 1.15

/**
 * Creates the light-shaft layer.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {{x: number, y: number}} cfg.sun - World point every ray starts from
 * @param {Array<{angle: number, spread: number, opacity: number}>} cfg.rays - Ray centre angle from straight down (radians, positive leans right), angular width and peak opacity
 * @param {number} cfg.topY - World Y where the rays become visible (playfield top)
 * @param {number} cfg.groundY - World Y of the ground line every ray lands on
 * @param {Function} cfg.getOpacity - () => number, global layer opacity
 * @param {number} cfg.z - Layer z (above the world decor the light should brighten)
 * @returns {Object} Light-shaft inst
 */
export function create(cfg) {
  const { k, sun, rays, topY, groundY, getOpacity, z } = cfg
  const rgb = hexToRgb(GLOW_PAL.glowForestFloor.shaft)
  const inst = {
    k,
    getOpacity,
    color: k.rgb(rgb.r, rgb.g, rgb.b),
    blend: k.BlendMode.Screen,
    shafts: rays.map((ray, i) => buildShaftGeometry(k, sun, ray, topY, groundY, i))
  }
  k.add([k.z(z), { draw() { onDraw(inst) } }])
  return inst
}

/**
 * Draws every shaft and its ground pool with a slow per-shaft shimmer.
 * All passes share one colour and Screen blend, so they batch together.
 * @param {Object} inst - Light-shaft inst
 */
export function onDraw(inst) {
  const layerOpacity = inst.getOpacity()
  if (layerOpacity < SHAFT_MIN_DRAW_OPACITY) return
  const { k } = inst
  const t = k.time() * SHAFT_SHIMMER_SPEED
  inst.shafts.forEach(shaft => {
    const shimmer = 1 - SHAFT_SHIMMER_AMP * (0.5 + 0.5 * Math.sin(t + shaft.phase))
    drawShaftPolygon(inst, shaft.beam, shaft.opacity * shimmer * layerOpacity)
    drawShaftPolygon(inst, shaft.pool, shaft.opacity * shimmer * layerOpacity)
  })
}
//
// Scales the static per-vertex opacity profile and draws one polygon.
//
function drawShaftPolygon(inst, poly, strength) {
  for (let i = 0; i < poly.base.length; i++) poly.opacities[i] = poly.base[i] * strength
  inst.k.drawPolygon({
    pts: poly.pts,
    indices: poly.indices,
    opacities: poly.opacities,
    color: inst.color,
    blend: inst.blend
  })
}
//
// Static geometry for one ray: wedge grid + ground pool fan (world space).
//
function buildShaftGeometry(k, sun, ray, topY, groundY, index) {
  const half = ray.spread / 2
  const footLeft = rayX(sun, ray.angle - half, groundY)
  const footRight = rayX(sun, ray.angle + half, groundY)
  return {
    opacity: ray.opacity,
    phase: index * SHAFT_SHIMMER_PHASE_STEP,
    beam: buildBeamPolygon(k, sun, ray, topY, groundY, index),
    pool: buildPoolPolygon(k, (footLeft + footRight) / 2, groundY + POOL_SINK_PX, (footRight - footLeft) * POOL_RX_MULT)
  }
}
//
// Three rows (top, end of head fade-in, ground) × columns across the angular
// width. Each column follows its own line from the sun, so the wedge widens
// with distance and the bottom row lies flat on the ground as the broad foot.
//
function buildBeamPolygon(k, sun, ray, topY, groundY, index) {
  const rows = [
    { v: 0, along: 0 },
    { v: SHAFT_HEAD_FRAC, along: 1 },
    { v: 1, along: SHAFT_BOTTOM_ALPHA }
  ]
  const height = groundY - topY
  const pts = []
  const base = []
  rows.forEach(row => {
    const y = topY + height * row.v
    for (let c = 0; c <= SHAFT_COLUMNS; c++) {
      const u = c / SHAFT_COLUMNS
      pts.push(k.vec2(rayX(sun, ray.angle + (u - 0.5) * ray.spread, y), y))
      base.push(row.along * Math.pow(Math.sin(Math.PI * u), SHAFT_ACROSS_POW) * shaftStreak(u, index))
    }
  })
  const indices = []
  const stride = SHAFT_COLUMNS + 1
  for (let r = 0; r < rows.length - 1; r++) {
    for (let c = 0; c < SHAFT_COLUMNS; c++) {
      const a = r * stride + c
      const b = a + stride
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  return { pts, indices, base, opacities: new Array(base.length).fill(0) }
}
//
// X where the line leaving the sun at the given angle crosses world Y.
//
function rayX(sun, angle, y) {
  return sun.x + Math.tan(angle) * (y - sun.y)
}
//
// Across-beam brightness streaks in [1 - depth, 1]; phases differ per shaft.
//
function shaftStreak(u, index) {
  let wave = 0
  for (let i = 0; i < SHAFT_STREAK_FREQS.length; i++) {
    const phase = index * SHAFT_STREAK_SHAFT_PHASE + i * SHAFT_STREAK_OCTAVE_PHASE
    wave += SHAFT_STREAK_WEIGHTS[i] * (0.5 + 0.5 * Math.sin((u * SHAFT_STREAK_FREQS[i] + phase) * Math.PI * 2))
  }
  return 1 - SHAFT_STREAK_DEPTH * wave
}
//
// Ellipse fan: bright centre fading to zero at the rim.
//
function buildPoolPolygon(k, cx, cy, rx) {
  const pts = [k.vec2(cx, cy)]
  const base = [POOL_ALPHA_MULT]
  for (let i = 0; i < POOL_SEGMENTS; i++) {
    const a = (i / POOL_SEGMENTS) * Math.PI * 2
    pts.push(k.vec2(cx + Math.cos(a) * rx, cy + Math.sin(a) * POOL_RY))
    base.push(0)
  }
  const indices = []
  for (let i = 1; i <= POOL_SEGMENTS; i++) {
    indices.push(0, i, i === POOL_SEGMENTS ? 1 : i + 1)
  }
  return { pts, indices, base, opacities: new Array(base.length).fill(0) }
}
function hexToRgb(hex) {
  const n = parseInt(hex.replace('#', ''), 16)
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 }
}
