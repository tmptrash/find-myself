import { CFG } from '../../../cfg.js'
import { forestRgb } from '../../forest/utils/forest-palette.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
//
// Shared Canvas2D painters for the cave bakes (terrain tiles, parallax rows,
// platforms): stony rock masses, moss rims, stalactites, stalagmites
// and dark ferns. Every colour comes from CFG.visual.colors.palette.cave.
//
export const CAVE_PAL = CFG.visual.colors.palette.cave
//
// Spikes (reference: long knobbly cones): lumpy sides with drip rings, a
// slightly curved tip, lit left face, shaded right, a pale streak, and a
// broken base where they leave the rock.
//
const SPIKE_STEPS = 10
const SPIKE_TAPER_POW = 0.85
const SPIKE_LUMP_AMP = 0.14
const SPIKE_LUMP_FREQ = 3.2
const SPIKE_TIP_BEND = 0.35
const SPIKE_TIP_W = 0.6
const SPIKE_BASE_JAG = 4
const SPIKE_BASE_POINTS = 4
const SPIKE_BASE_FLARE = 1.15
const SPIKE_LIT_SHARE = 0.38
const SPIKE_SHADE_SHARE = 0.32
const SPIKE_RINGS_MIN = 2
const SPIKE_RINGS_RANGE = 3
const SPIKE_RING_ALPHA = 0.55
const SPIKE_RING_W = 1.2
const SPIKE_STREAK_ALPHA = 0.6
const SPIKE_STREAK_W = 1.2
const SPIKE_STREAK_FROM = 0.1
const SPIKE_STREAK_TO = 0.7
const SPIKE_STREAK_SHIFT = 0.22
const SPIKE_CONTOUR_W = 1.5
//
// Ferns: size range when sprouting from rock edges.
//
const FERN_SIZE_MIN = 22
const FERN_SIZE_RANGE = 26
//
// Hanging vine: S-curve, stem / contour widths, alternate oval leaves.
//
const VINE_CURVE = 9
const VINE_W = 2
const VINE_CONTOUR_W = 3.6
const VINE_STEP_PX = 6
const LEAF_EVERY = 2
const LEAF_RX_MIN = 3.5
const LEAF_RX_RANGE = 3
const LEAF_RY_FRAC = 0.5
const LEAF_TILT = 0.7
const LEAF_LIGHT_CHANCE = 0.3
//
// Leaf crown where a vine leaves the rock: a small fan of bigger leaves.
//
const CROWN_LEAVES_MIN = 3
const CROWN_LEAVES_RANGE = 3
const CROWN_LEAF_SCALE = 1.7
const CROWN_SPREAD = 2.2
const CROWN_LEAF_REACH = 0.8
//
// Moss strands (the reference's hanging leafy threads): a thin stem curving
// slightly, small leaflets packed along it on alternating sides, pointing
// down and out, shrinking toward the tip; a drop at the end.
//
const STRAND_STEP_PX = 4
const STRAND_CURVE = 4
const STRAND_STEM_W = 1.3
const STRAND_LEAF_EVERY = 3.2
const STRAND_LEAF_RX = 2.6
const STRAND_LEAF_RY = 1.5
const STRAND_LEAF_JITTER = 0.35
const STRAND_LEAF_TILT = 0.75
const STRAND_LEAF_REACH = 1.6
const STRAND_TIP_SCALE = 0.45
const STRAND_SHADOW = 0.9
const STRAND_LIGHT_CHANCE = 0.35
const STRAND_BUD = 3
const STRAND_DROP_R = 1.8
const STRAND_DROP_STRETCH = 1.4
const STRAND_DROP_ALPHA = 0.85
const HALF_TURN = Math.PI
const FULL_TURN = Math.PI * 2
const BYTE = 255

/**
 * CSS colour from a palette hex with optional alpha.
 * @param {string} hex - '#rrggbb' palette swatch
 * @param {number} [alpha=1]
 * @returns {string}
 */
export function css(hex, alpha = 1) {
  const { r, g, b } = forestRgb(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}




/**
 * Stone spike (stalactite when dir = 1, stalagmite when dir = -1).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Base centre X
 * @param {number} y - Base Y
 * @param {number} w - Base width
 * @param {number} len - Length toward the tip
 * @param {number} dir - 1 hangs down, -1 points up
 * @param {() => number} rng - Seeded random
 * @param {string[]} [tones] - Dark / mid / light spike tones
 */
export function paintSpike(ctx, x, y, w, len, dir, rng, tones = CAVE_PAL.spike) {
  const [dark, mid, light] = tones
  const phase = rng() * FULL_TURN
  const bend = (rng() - 0.5) * w * SPIKE_TIP_BEND * 2
  const at = (t, side) => {
    const half = w / 2 * (Math.pow(1 - t, SPIKE_TAPER_POW) * (1 - SPIKE_TIP_W / w) + SPIKE_TIP_W / w)
    const lump = 1 + Math.sin(t * Math.PI * SPIKE_LUMP_FREQ + phase + side) * SPIKE_LUMP_AMP
    return { x: x + bend * t * t + side * half * lump, y: y + len * t * dir }
  }
  const pts = []
  for (let i = 0; i <= SPIKE_STEPS; i++) pts.push(at(i / SPIKE_STEPS, -1))
  for (let i = SPIKE_STEPS; i >= 0; i--) pts.push(at(i / SPIKE_STEPS, 1))
  for (let i = 1; i < SPIKE_BASE_POINTS; i++) {
    pts.push({ x: x + w / 2 * SPIKE_BASE_FLARE - w * SPIKE_BASE_FLARE * i / SPIKE_BASE_POINTS, y: y - dir * rng() * SPIKE_BASE_JAG })
  }
  const path = smoothPath(pts)
  const top = Math.min(y - SPIKE_BASE_JAG, y + len * dir)
  ctx.save()
  ctx.fillStyle = css(mid)
  ctx.fill(path)
  ctx.clip(path)
  ctx.fillStyle = css(light)
  ctx.fillRect(x - w, top, w * (1 - SPIKE_LIT_SHARE), len + SPIKE_BASE_JAG * 2)
  ctx.fillStyle = css(dark)
  ctx.fillRect(x + w / 2 - w * SPIKE_SHADE_SHARE + bend / 2, top, w, len + SPIKE_BASE_JAG * 2)
  ctx.strokeStyle = css(dark, SPIKE_RING_ALPHA)
  ctx.lineWidth = SPIKE_RING_W
  const rings = SPIKE_RINGS_MIN + Math.floor(rng() * SPIKE_RINGS_RANGE)
  for (let i = 0; i < rings; i++) {
    const t = (i + rng()) / (rings + 1)
    const l = at(t, -1)
    const r = at(t, 1)
    ctx.beginPath()
    ctx.moveTo(l.x, l.y)
    ctx.quadraticCurveTo((l.x + r.x) / 2, l.y + dir * w * SPIKE_LUMP_AMP, r.x, r.y)
    ctx.stroke()
  }
  ctx.strokeStyle = css(CAVE_PAL.rockRim, SPIKE_STREAK_ALPHA)
  ctx.lineWidth = SPIKE_STREAK_W
  ctx.beginPath()
  const s0 = at(SPIKE_STREAK_FROM, -1)
  const s1 = at(SPIKE_STREAK_TO, -1)
  ctx.moveTo(s0.x + w * SPIKE_STREAK_SHIFT, s0.y)
  ctx.lineTo(s1.x + w * SPIKE_STREAK_SHIFT / 2, s1.y)
  ctx.stroke()
  ctx.restore()
  ctx.strokeStyle = css(CAVE_PAL.contour)
  ctx.lineWidth = SPIKE_CONTOUR_W
  ctx.lineJoin = 'round'
  ctx.stroke(path)
}

/**
 * Dark fern clump sprouting from a rock edge along its outward normal.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Root X
 * @param {number} y - Root Y
 * @param {number} angle - Rotation of "up" (0 = upright, PI/2 = grows right)
 * @param {() => number} rng - Seeded random
 * @param {number} [sizeScale=1]
 * @param {string[]} [tones] - Dark / mid / light frond tones
 */
export function paintEdgeFern(ctx, x, y, angle, rng, sizeScale = 1, tones = CAVE_PAL.plant) {
  const [dark, mid, light] = tones
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)
  drawFernToCanvas(ctx, {
    x: 0,
    baseY: 0,
    size: (FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE) * sizeScale,
    rng,
    colors: { contour: css(CAVE_PAL.contour), dark: css(dark), mid: css(mid), light: css(light) }
  })
  ctx.restore()
}

/**
 * Leafy vine strand hanging down from a point: dark contour under a thin
 * stem, alternate oval leaves.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Pin X
 * @param {number} y - Pin Y
 * @param {number} len - Strand length
 * @param {() => number} rng - Seeded random
 * @param {Object} [opts]
 * @param {string[]} [opts.tones] - Dark / mid / light tones (defaults to cave plants)
 * @param {number} [opts.scale=1] - Leaf and stroke size multiplier
 * @param {boolean} [opts.contour=true] - Dark outline around stem and leaves
 * @param {boolean} [opts.crown=false] - A few leaves where the vine leaves the rock
 */
export function paintHangingVine(ctx, x, y, len, rng, opts = {}) {
  const [, mid, light] = opts.tones ?? CAVE_PAL.plant
  const scale = opts.scale ?? 1
  const contour = opts.contour !== false
  const steps = Math.max(2, Math.round(len / VINE_STEP_PX))
  const phase = rng() * FULL_TURN
  const pts = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    pts.push({ x: x + Math.sin(t * FULL_TURN + phase) * VINE_CURVE * scale * t, y: y + len * t })
  }
  const stroke = (color, width) => {
    ctx.strokeStyle = color
    ctx.lineWidth = width
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.beginPath()
    pts.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
    ctx.stroke()
  }
  contour && stroke(css(CAVE_PAL.contour), VINE_CONTOUR_W * scale)
  stroke(css(mid), VINE_W * scale)
  opts.crown && paintLeafCrown(ctx, x, y, rng, scale, mid, light)
  pts.forEach((p, i) => {
    if (i === 0 || i % LEAF_EVERY !== 0) return
    const side = (i / LEAF_EVERY) % 2 === 0 ? 1 : -1
    const rx = (LEAF_RX_MIN + rng() * LEAF_RX_RANGE) * scale
    ctx.beginPath()
    ctx.ellipse(p.x + side * rx, p.y, rx, rx * LEAF_RY_FRAC, side * LEAF_TILT, 0, FULL_TURN)
    ctx.fillStyle = css(rng() < LEAF_LIGHT_CHANCE ? light : mid)
    ctx.fill()
    if (!contour) return
    ctx.strokeStyle = css(CAVE_PAL.contour)
    ctx.lineWidth = 1
    ctx.stroke()
  })
}

/**
 * Moss strand hanging from a point: a thin curving stem densely set with
 * small leaflets (alternating sides, pointing down and out, smaller toward
 * the tip) over a soft drop shadow, with an optional drop at the tip.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Pin X
 * @param {number} y - Pin Y
 * @param {number} len - Strand length
 * @param {() => number} rng - Seeded random
 * @param {Object} [opts]
 * @param {string[]} [opts.tones] - Shadow / dark / mid / light / drop tones
 * @param {number} [opts.scale=1] - Leaflet size multiplier
 * @param {boolean} [opts.drop=true] - Hang a drop at the tip
 * @returns {{x: number, y: number}} Tip point (below the drop)
 */
export function paintMossStrand(ctx, x, y, len, rng, opts = {}) {
  const [shadow, dark, mid, light, drop] = opts.tones ?? CAVE_PAL.plantStrand
  const scale = opts.scale ?? 1
  const steps = Math.max(2, Math.round(len / STRAND_STEP_PX))
  const phase = rng() * FULL_TURN
  const curve = (rng() - 0.5) * 2 * STRAND_CURVE
  const stem = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    stem.push({ x: x + Math.sin(t * HALF_TURN + phase) * curve * t, y: y + len * t })
  }
  const leaflets = []
  for (let d = 0, side = 1; d < len; d += STRAND_LEAF_EVERY, side = -side) {
    const t = d / len
    const p = stem[Math.round(t * steps)]
    const size = scale * (1 - (1 - STRAND_TIP_SCALE) * t) * (1 + (rng() - 0.5) * STRAND_LEAF_JITTER * 2)
    leaflets.push({ x: p.x + side * STRAND_LEAF_REACH * size, y: p.y, size, side, tone: rng() < STRAND_LIGHT_CHANCE ? light : mid })
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  leaflets.forEach(l => strandLeaflet(ctx, l.x + STRAND_SHADOW, l.y + STRAND_SHADOW, l.size, l.side, shadow))
  ctx.strokeStyle = css(dark)
  ctx.lineWidth = STRAND_STEM_W * scale
  ctx.beginPath()
  stem.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()
  leaflets.forEach(l => strandLeaflet(ctx, l.x, l.y, l.size, l.side, l.tone))
  for (let b = 0; b < STRAND_BUD; b++) strandLeaflet(ctx, x + (rng() - 0.5) * STRAND_BUD * 2, y + rng() * STRAND_BUD, scale, b % 2 ? 1 : -1, b ? mid : dark)
  const tip = stem[stem.length - 1]
  if (opts.drop === false) return tip
  ctx.fillStyle = css(drop, STRAND_DROP_ALPHA)
  ctx.beginPath()
  ctx.ellipse(tip.x, tip.y + STRAND_DROP_R, STRAND_DROP_R, STRAND_DROP_R * STRAND_DROP_STRETCH, 0, 0, FULL_TURN)
  ctx.fill()
  return { x: tip.x, y: tip.y + STRAND_DROP_R * 2 }
}



/**
 * Kaplay colour that multiplies art into the cave shade (darker background
 * props riding a parallax row).
 * @param {Object} k - Kaplay instance
 * @param {number} amount - 0 (untouched) … 1 (the darkness swatch)
 * @returns {Object} Kaplay rgb
 */
export function caveShadeColor(k, amount) {
  const tint = forestRgb(CAVE_PAL.darkness)
  const shade = c => Math.round(BYTE - amount * (BYTE - c))
  return k.rgb(shade(tint.r), shade(tint.g), shade(tint.b))
}

/**
 * Builds an outline by sampling a function along one axis.
 * @param {number} from - Start coordinate
 * @param {number} to - End coordinate
 * @param {number} step - Sample step
 * @param {(v: number) => {x: number, y: number}} at - Point at coordinate
 * @returns {Array<{x: number, y: number}>}
 */
export function sampleEdge(from, to, step, at) {
  const out = []
  const dir = to >= from ? 1 : -1
  for (let v = from; dir > 0 ? v < to : v > to; v += step * dir) out.push(at(v))
  out.push(at(to))
  return out
}
//
// Fan of bigger leaves around a vine's root point, spreading downward.
//
//
// One leaflet of a moss strand: a small oval tilted down and out.
//
function strandLeaflet(ctx, x, y, size, side, tone) {
  ctx.fillStyle = css(tone)
  ctx.beginPath()
  ctx.ellipse(x, y, STRAND_LEAF_RX * size, STRAND_LEAF_RY * size, side * STRAND_LEAF_TILT, 0, FULL_TURN)
  ctx.fill()
}
function paintLeafCrown(ctx, x, y, rng, scale, mid, light) {
  const count = CROWN_LEAVES_MIN + Math.floor(rng() * CROWN_LEAVES_RANGE)
  for (let i = 0; i < count; i++) {
    const a = Math.PI / 2 + (i / Math.max(1, count - 1) - 0.5) * CROWN_SPREAD
    const rx = (LEAF_RX_MIN + rng() * LEAF_RX_RANGE) * scale * CROWN_LEAF_SCALE
    ctx.beginPath()
    ctx.ellipse(x + Math.cos(a) * rx * CROWN_LEAF_REACH, y + Math.sin(a) * rx * CROWN_LEAF_REACH, rx, rx * LEAF_RY_FRAC, a, 0, FULL_TURN)
    ctx.fillStyle = css(rng() < LEAF_LIGHT_CHANCE ? light : mid)
    ctx.fill()
  }
}
//
// Closed outline through vertex midpoints with quadratic corners (smooth).
//
/**
 * Closed path through the midpoints of an outline, rounding every corner.
 * @param {Array<{x: number, y: number}>} pts - Outline
 * @returns {Path2D}
 */
export function smoothPath(pts) {
  const path = new Path2D()
  const mid = (a, b) => ({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 })
  const start = mid(pts[pts.length - 1], pts[0])
  path.moveTo(start.x, start.y)
  pts.forEach((p, i) => {
    const m = mid(p, pts[(i + 1) % pts.length])
    path.quadraticCurveTo(p.x, p.y, m.x, m.y)
  })
  path.closePath()
  return path
}
/**
 * Hit test of a point in drawing coordinates against a path (isPointInPath
 * itself expects device pixels, which differ on a scaled bake).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Path2D} path
 * @param {number} x - Drawing X
 * @param {number} y - Drawing Y
 * @returns {boolean}
 */
export function insidePath(ctx, path, x, y) {
  const m = ctx.getTransform()
  return ctx.isPointInPath(path, m.a * x + m.c * y + m.e, m.b * x + m.d * y + m.f)
}
/**
 * Fills an axis-aligned ellipse in the current fill style.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x - Centre X
 * @param {number} y - Centre Y
 * @param {number} rx - Radius X
 * @param {number} ry - Radius Y
 */
export function fillEllipse(ctx, x, y, rx, ry) {
  ctx.beginPath()
  ctx.ellipse(x, y, rx, ry, 0, 0, FULL_TURN)
  ctx.fill()
}
/**
 * Bounding box of an outline.
 * @param {Array<{x: number, y: number}>} pts - Outline
 * @returns {{x: number, y: number, w: number, h: number}}
 */
export function polygonBounds(pts) {
  const xs = pts.map(p => p.x)
  const ys = pts.map(p => p.y)
  const x = Math.min(...xs)
  const y = Math.min(...ys)
  return { x, y, w: Math.max(...xs) - x, h: Math.max(...ys) - y }
}
