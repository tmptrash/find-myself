import { GLOW_PAL } from '../utils/glow-palette.js'
//
// Sunlight through one canopy gap above the frame: a wide haze wedge and
// one beam from the gap to the ground (flat core, crisp side edges).
// Per-vertex opacity: flat core with a narrow rim fade on the sides (crisp
// beam edges, not a wide sin haze). Ground pools add a warm foot patch.
// Screen blend lightens whatever the shafts cross without crushing palette.
//
const SHAFT_COLUMNS = 22
//
// Fraction of half-width (0 at lateral edge, 1 at centre) kept at full
// strength; only the outer band fades for anti-alias.
//
const SHAFT_EDGE_RIM = 0.08
const HAZE_EDGE_RIM = 0.14
//
// Brightness along a beam (t = 0 at the gap, 1 on the ground) and width
// there as a fraction of the foot width — extra rows for smooth falloff.
//
const SHAFT_ROWS = [
  { t: 0, alpha: 0, width: 0.14 },
  { t: 0.12, alpha: 0.42, width: 0.28 },
  { t: 0.28, alpha: 0.88, width: 0.42 },
  { t: 0.45, alpha: 1, width: 0.55 },
  { t: 0.62, alpha: 0.78, width: 0.72 },
  { t: 0.8, alpha: 0.52, width: 0.88 },
  { t: 1, alpha: 0.32, width: 1 }
]
//
// Inner structure: brighter streaks and softer gaps across each beam.
//
const SHAFT_STREAK_DEPTH = 0
const SHAFT_STREAK_FREQS = [2.1, 4.7, 7.3]
const SHAFT_STREAK_WEIGHTS = [0.5, 0.32, 0.18]
const SHAFT_STREAK_SHAFT_PHASE = 0.37
const SHAFT_STREAK_OCTAVE_PHASE = 0.61
const SHAFT_SHIMMER_AMP = 0.09
const SHAFT_SHIMMER_SPEED = 0.28
const SHAFT_SHIMMER_PHASE_STEP = 1.7
const SHAFT_MIN_DRAW_OPACITY = 0.01
const SHAFT_LENGTH_FADE = 0.12
//
// Haze cone: faint atmospheric lift under the whole fan.
//
const HAZE_SPREAD_PAD = 200
const HAZE_ROWS = [
  { t: 0, alpha: 0.22 },
  { t: 0.18, alpha: 0.19 },
  { t: 0.4, alpha: 0.13 },
  { t: 0.65, alpha: 0.08 },
  { t: 1, alpha: 0.035 }
]
//
// Ground pool: flat ellipse at the beam foot, slightly sunk into the lip.
//
const POOL_SEGMENTS = 20
const POOL_RX_MULT = 0.55
const POOL_RY = 14
const POOL_SINK_PX = 4
const POOL_ALPHA_MULT = 0.92
const LIGHT_SHAFT_MOUNT_MANUAL = 'manual'

/**
 * Creates the light-shaft layer (haze + beams + ground pools).
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {{x: number, y: number}} cfg.source - Canopy gap in world space (above the frame)
 * @param {Array<{x: number, width: number, opacity: number, gapSkewX?: number, gapSkewY?: number}>} cfg.rays - Foot centre X, width and peak opacity; optional per-beam gap offset
 * @param {number} cfg.groundY - Ground line Y
 * @param {Function} cfg.getOpacity - () => number global layer opacity
 * @param {number} [cfg.z] - Z when mount is object (Kaplay draw tree)
 * @param {string} [cfg.mount='object'] - 'object' | 'manual' — manual: caller invokes onDraw (e.g. behind near parallax)
 * @param {number} [cfg.hazeStrength=1] - Scales the atmospheric wedge
 * @param {number} [cfg.poolStrength=1] - Scales ground pools
 * @returns {Object} Light-shaft inst
 */
export function create(cfg) {
  const inst = buildLightShaftInst(cfg)
  cfg.mount !== LIGHT_SHAFT_MOUNT_MANUAL &&
    cfg.k.add([cfg.k.z(cfg.z), { draw() { onDraw(inst) } }])
  return inst
}

/**
 * Draws haze, beams and pools (slow per-beam shimmer). One colour, Screen blend.
 * @param {Object} inst - Light-shaft inst
 */
export function onDraw(inst) {
  const layerOpacity = inst.getOpacity()
  if (layerOpacity < SHAFT_MIN_DRAW_OPACITY) return
  const { k } = inst
  const t = k.time() * SHAFT_SHIMMER_SPEED
  inst.hazeStrength > SHAFT_MIN_DRAW_OPACITY &&
    drawShaftPolygon(inst, inst.haze, inst.hazeStrength * layerOpacity)
  inst.shafts.forEach(shaft => {
    const shimmer = 1 - SHAFT_SHIMMER_AMP * (0.5 + 0.5 * Math.sin(t + shaft.phase))
    const beamStrength = shaft.opacity * shimmer * layerOpacity
    drawShaftPolygon(inst, shaft.beam, beamStrength)
    inst.poolStrength > SHAFT_MIN_DRAW_OPACITY &&
      drawShaftPolygon(inst, shaft.pool, beamStrength * inst.poolStrength)
  })
}

function buildLightShaftInst(cfg) {
  const { k, source, rays, groundY, getOpacity } = cfg
  const rgb = hexToRgb(GLOW_PAL.glowForestFloor.shaft)
  return {
    k,
    getOpacity,
    hazeStrength: cfg.hazeStrength ?? 1,
    poolStrength: cfg.poolStrength ?? 1,
    color: k.rgb(rgb.r, rgb.g, rgb.b),
    blend: k.BlendMode.Screen,
    haze: buildHazePolygon(k, source, rays, groundY),
    shafts: rays.map((ray, i) => buildShaftGeometry(k, source, ray, groundY, i))
  }
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
// Static geometry for one beam: wedge grid + ground pool fan (world space).
//
function buildShaftGeometry(k, source, ray, groundY, index) {
  const gap = beamGapSource(source, ray)
  return {
    opacity: ray.opacity,
    phase: index * SHAFT_SHIMMER_PHASE_STEP,
    beam: buildBeamPolygon(k, gap, ray, groundY, index),
    pool: buildPoolPolygon(k, ray.x, groundY + POOL_SINK_PX, ray.width * POOL_RX_MULT)
  }
}
//
// Each beam may use a slightly shifted gap so angles vary naturally.
//
function beamGapSource(source, ray) {
  const dx = ray.gapSkewX ?? 0
  const dy = ray.gapSkewY ?? 0
  return dx === 0 && dy === 0 ? source : { x: source.x + dx, y: source.y + dy }
}
//
// Rows from the gap to the ground × columns across the beam width.
//
function buildBeamPolygon(k, gap, ray, groundY, index) {
  const pts = []
  const base = []
  SHAFT_ROWS.forEach(row => {
    const y = gap.y + (groundY - gap.y) * row.t
    const axisX = gap.x + (ray.x - gap.x) * row.t
    const width = ray.width * row.width
    const along = row.alpha * (1 - SHAFT_LENGTH_FADE * row.t)
    for (let c = 0; c <= SHAFT_COLUMNS; c++) {
      const u = c / SHAFT_COLUMNS
      pts.push(k.vec2(axisX + (u - 0.5) * width, y))
      base.push(along * shaftAcrossAlpha(u, SHAFT_EDGE_RIM) * shaftStreak(u, index))
    }
  })
  return { pts, indices: gridIndices(SHAFT_ROWS.length, SHAFT_COLUMNS), base, opacities: new Array(base.length).fill(0) }
}
//
// Wide wedge from the gap to the ground over every beam foot plus pad.
//
function buildHazePolygon(k, source, rays, groundY) {
  const leftX = Math.min(...rays.map(ray => ray.x - ray.width * 0.5)) - HAZE_SPREAD_PAD
  const rightX = Math.max(...rays.map(ray => ray.x + ray.width * 0.5)) + HAZE_SPREAD_PAD
  const pts = []
  const base = []
  HAZE_ROWS.forEach(row => {
    const y = source.y + (groundY - source.y) * row.t
    const along = row.alpha * (1 - SHAFT_LENGTH_FADE * row.t * 0.65)
    for (let c = 0; c <= SHAFT_COLUMNS; c++) {
      const u = c / SHAFT_COLUMNS
      const footX = leftX + (rightX - leftX) * u
      pts.push(k.vec2(source.x + (footX - source.x) * row.t, y))
      base.push(along * shaftAcrossAlpha(u, HAZE_EDGE_RIM))
    }
  })
  return { pts, indices: gridIndices(HAZE_ROWS.length, SHAFT_COLUMNS), base, opacities: new Array(base.length).fill(0) }
}
//
// Two triangles per cell of a rows × columns vertex grid.
//
function gridIndices(rowCount, columns) {
  const indices = []
  const stride = columns + 1
  for (let r = 0; r < rowCount - 1; r++) {
    for (let c = 0; c < columns; c++) {
      const a = r * stride + c
      const b = a + stride
      indices.push(a, a + 1, b, a + 1, b + 1, b)
    }
  }
  return indices
}
//
// Lateral opacity: 1 in the core, smoothstep only in the outer rim band.
//
function shaftAcrossAlpha(u, rim) {
  const edgeDist = 1 - Math.abs(u - 0.5) * 2
  if (edgeDist >= rim) return 1
  const t = edgeDist / rim
  return t * t * (3 - 2 * t)
}
//
// Across-beam brightness streaks in [1 - depth, 1]; phases differ per beam.
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
