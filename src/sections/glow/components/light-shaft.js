import { GLOW_PAL } from '../utils/glow-palette.js'
//
// Soft sunlight rays from one distant sun. The sun is so far away that every
// ray falls at the same angle to the ground — the rays are parallel bands
// through canopy gaps. Geometry starts well above the playfield top so the
// fade-in finishes before the visible frame edge — rays read as coming from
// behind the canopy, not starting on a horizontal cut. Softness comes from
// per-vertex opacity (across the width
// and along the length), and a warm pool of light is laid where the ray
// meets the ground. Everything is drawn with Screen blending above the world
// decor, so whatever the ray crosses — grass, mushrooms, the hero, the
// ground lip — is lightened, never darkened.
//
const SHAFT_COLUMNS = 18
const SHAFT_ACROSS_POW = 1.4
const SHAFT_BOTTOM_ALPHA = 0.7
//
// Beam origin sits this many world px above topY so the head fade completes
// before the playfield's top edge.
//
const SHAFT_ORIGIN_ABOVE_TOP = 220
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
 * @param {number} cfg.angle - Shared ray angle from straight down (radians, positive leans right)
 * @param {Array<{x: number, width: number, opacity: number}>} cfg.rays - Ray foot centre X on the ground line, band width and peak opacity
 * @param {number} cfg.topY - World Y of the playfield top (fade finishes here)
 * @param {number} cfg.groundY - World Y of the ground line every ray lands on
 * @param {Function} cfg.getOpacity - () => number, global layer opacity
 * @param {number} cfg.z - Layer z (above the world decor the light should brighten)
 * @returns {Object} Light-shaft inst
 */
export function create(cfg) {
  const { k, angle, rays, topY, groundY, getOpacity, z } = cfg
  const rgb = hexToRgb(GLOW_PAL.glowForestFloor.shaft)
  const inst = {
    k,
    getOpacity,
    color: k.rgb(rgb.r, rgb.g, rgb.b),
    blend: k.BlendMode.Screen,
    shafts: rays.map((ray, i) => buildShaftGeometry(k, angle, ray, topY, groundY, i))
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
function buildShaftGeometry(k, angle, ray, topY, groundY, index) {
  return {
    opacity: ray.opacity,
    phase: index * SHAFT_SHIMMER_PHASE_STEP,
    beam: buildBeamPolygon(k, angle, ray, topY, groundY, index),
    pool: buildPoolPolygon(k, ray.x, groundY + POOL_SINK_PX, ray.width * POOL_RX_MULT)
  }
}
//
// Three rows (origin above frame, full strength at playfield top, ground) ×
// columns across the band width. Every column runs along the shared sun angle.
//
function buildBeamPolygon(k, angle, ray, topY, groundY, index) {
  const originY = topY - SHAFT_ORIGIN_ABOVE_TOP
  const rows = [
    { y: originY, along: 0 },
    { y: topY, along: 1 },
    { y: groundY, along: SHAFT_BOTTOM_ALPHA }
  ]
  const pts = []
  const base = []
  rows.forEach(row => {
    const y = row.y
    for (let c = 0; c <= SHAFT_COLUMNS; c++) {
      const u = c / SHAFT_COLUMNS
      pts.push(k.vec2(rayX(angle, ray.x + (u - 0.5) * ray.width, groundY, y), y))
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
// X at world Y on the sun-angle line that lands on the ground at footX.
//
function rayX(angle, footX, groundY, y) {
  return footX - Math.tan(angle) * (groundY - y)
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
