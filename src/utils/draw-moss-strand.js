import { CFG } from '../cfg.js'
//
// A hanging moss strand painted into a 2D canvas: a thin wavy stem with
// small leaflets on alternate sides, shrinking toward the tip, a dark
// shadow under the leaflets, a bud cluster where it hangs from and a
// water drop at its tip.
//
const TONES = CFG.visual.colors.palette.mossStrand
const STEP_PX = 4
const CURVE = 4
const STEM_W = 1.3
const LEAF_EVERY = 3.2
const LEAF_RX = 2.6
const LEAF_RY = 1.5
const LEAF_JITTER = 0.35
const LEAF_TILT = 0.75
const LEAF_REACH = 1.6
const TIP_SCALE = 0.45
const SHADOW = 0.9
const LIGHT_CHANCE = 0.35
const BUD = 3
const DROP_R = 1.8
const DROP_STRETCH = 1.4
const DROP_ALPHA = 0.85
const BYTE_MAX = 255
const HEX_RADIX = 16
const HALF_TURN = Math.PI
const FULL_TURN = Math.PI * 2

/**
 * Paints one moss strand hanging from x / y.
 * @param {CanvasRenderingContext2D} ctx - Target context
 * @param {number} x - Hang point X
 * @param {number} y - Hang point Y
 * @param {number} len - Strand length
 * @param {function(): number} rng - Seeded random
 * @param {Object} [opts]
 * @param {Array<string>} [opts.tones] - Shadow, stem, leaf, lit leaf, drop ('#rrggbb')
 * @param {number} [opts.scale=1] - Leaflet size
 * @param {boolean} [opts.drop=true] - Paint the water drop at the tip
 * @returns {{x: number, y: number}} Lowest point painted
 */
export function paintMossStrand(ctx, x, y, len, rng, opts = {}) {
  const [shadow, dark, mid, light, drop] = opts.tones ?? TONES
  const scale = opts.scale ?? 1
  const steps = Math.max(2, Math.round(len / STEP_PX))
  const phase = rng() * FULL_TURN
  const curve = (rng() - 0.5) * 2 * CURVE
  const stem = []
  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    stem.push({ x: x + Math.sin(t * HALF_TURN + phase) * curve * t, y: y + len * t })
  }
  const leaflets = []
  for (let d = 0, side = 1; d < len; d += LEAF_EVERY, side = -side) {
    const t = d / len
    const p = stem[Math.round(t * steps)]
    const size = scale * (1 - (1 - TIP_SCALE) * t) * (1 + (rng() - 0.5) * LEAF_JITTER * 2)
    leaflets.push({ x: p.x + side * LEAF_REACH * size, y: p.y, size, side, tone: rng() < LIGHT_CHANCE ? light : mid })
  }
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  leaflets.forEach(l => leaflet(ctx, l.x + SHADOW, l.y + SHADOW, l.size, l.side, shadow))
  ctx.strokeStyle = dark
  ctx.lineWidth = STEM_W * scale
  ctx.beginPath()
  stem.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)))
  ctx.stroke()
  leaflets.forEach(l => leaflet(ctx, l.x, l.y, l.size, l.side, l.tone))
  for (let b = 0; b < BUD; b++) leaflet(ctx, x + (rng() - 0.5) * BUD * 2, y + rng() * BUD, scale, b % 2 ? 1 : -1, b ? mid : dark)
  const tip = stem[stem.length - 1]
  if (opts.drop === false) return tip
  ctx.fillStyle = drop + Math.round(DROP_ALPHA * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
  ctx.beginPath()
  ctx.ellipse(tip.x, tip.y + DROP_R, DROP_R, DROP_R * DROP_STRETCH, 0, 0, FULL_TURN)
  ctx.fill()
  return { x: tip.x, y: tip.y + DROP_R * 2 }
}
function leaflet(ctx, x, y, size, side, tone) {
  ctx.fillStyle = tone
  ctx.beginPath()
  ctx.ellipse(x, y, LEAF_RX * size, LEAF_RY * size, side * LEAF_TILT, 0, FULL_TURN)
  ctx.fill()
}
