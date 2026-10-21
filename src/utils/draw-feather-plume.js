import { strokeQuad } from './quad-curve.js'
//
// Canvas2D light spike bush from the forest reference: a tuft of upright
// lance-shaped pale spikes on short stalks, each widest a third of the way
// up and pointed at the top, its face covered in stacked chevrons (the
// overlapping scales of the reference plant) with a darker midrib.
//
const SPIKES_MIN = 4
const SPIKES_RANGE = 3
const SPIKE_SPREAD = 12
const SPIKE_LEAN = 0.2
const SPIKE_LEAN_JITTER = 0.08
const SPIKE_H_MIN_FRAC = 0.5
const SPIKE_STALK_FRAC = 0.22
const SPIKE_HALF_W_FRAC = 0.085
const SPIKE_HALF_W_MIN = 3
const SPIKE_WIDEST_T = 0.32
const SPIKE_TIP_POW = 0.85
const SPIKE_SAMPLES = 14
const SPIKE_CHEVRON_STEP = 3.2
const SPIKE_CHEVRON_DROP = 0.55
const SPIKE_CHEVRON_INSET = 0.82
const SPIKE_CHEVRON_PX = 1
const SPIKE_MIDRIB_PX = 1
const SPIKE_MIDRIB_END_T = 0.7
const SPIKE_EDGE_PX = 1
const SPIKE_STALK_PX = 1.4
const SPIKE_STALK_CONTOUR_PX = 2.6
const SPIKE_CTRL_JITTER = 2
const BASE_LEAF_LEN = 9
const BASE_LEAF_PX = 1.8
const BASE_LEAF_CONTOUR_PX = 1.6
const BASE_LEAF_SIDES = [-1, 1]
const BOUNDS_SIDE = 24
const BOUNDS_PAD = 6

/**
 * Paints one light spike bush rooted at (x, baseY).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.x - Base X
 * @param {number} opts.baseY - Base Y (ground contact)
 * @param {number} opts.height - Tallest spike height incl. stalk (px)
 * @param {() => number} opts.rng - Seeded random in [0, 1)
 * @param {Object} opts.colors - CSS colours
 * @param {string} opts.colors.contour - Stalk / leaf contour
 * @param {string} opts.colors.body - Spike face
 * @param {string} opts.colors.light - Lit chevrons
 * @param {string} opts.colors.shade - Spike rim, midrib, shaded chevrons
 * @param {string} opts.colors.stem - Stalks
 * @param {string} opts.colors.leaf - Base leaves
 */
export function drawFeatherPlumeToCanvas(ctx, opts) {
  const { x, baseY, height, rng, colors } = opts
  const count = SPIKES_MIN + Math.floor(rng() * SPIKES_RANGE)
  const spikes = []
  for (let i = 0; i < count; i++) {
    const norm = count === 1 ? 0 : (i / (count - 1)) * 2 - 1
    const centre = 1 - Math.abs(norm) * (1 - SPIKE_H_MIN_FRAC)
    spikes.push({
      x: x + norm * SPIKE_SPREAD + (rng() - 0.5) * 2,
      lean: norm * SPIKE_LEAN + (rng() - 0.5) * SPIKE_LEAN_JITTER,
      height: height * Math.max(SPIKE_H_MIN_FRAC, centre - rng() * 0.2)
    })
  }
  spikes.sort((a, b) => b.height - a.height)
  spikes.forEach(spike => paintSpike(ctx, spike, baseY, rng, colors))
  paintBaseLeaves(ctx, x, baseY, rng, colors)
}

/**
 * Conservative world bounds of a spike bush of the given height.
 * @param {number} x - Base X
 * @param {number} baseY - Base Y
 * @param {number} height - Tallest spike height
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
export function featherPlumeBounds(x, baseY, height) {
  return { x1: x - BOUNDS_SIDE, y1: baseY - height - BOUNDS_PAD, x2: x + BOUNDS_SIDE, y2: baseY + BOUNDS_PAD }
}
//
// Stalk, then the lance silhouette (rim, face), then chevrons and midrib.
//
function paintSpike(ctx, spike, baseY, rng, colors) {
  const dirX = Math.sin(spike.lean)
  const dirY = -Math.cos(spike.lean)
  const stalkLen = spike.height * SPIKE_STALK_FRAC
  const base = { x: spike.x, y: baseY }
  const top = { x: spike.x + dirX * stalkLen, y: baseY + dirY * stalkLen }
  const ctrl = { x: (base.x + top.x) / 2 + (rng() - 0.5) * SPIKE_CTRL_JITTER, y: (base.y + top.y) / 2 }
  ctx.lineCap = 'round'
  ctx.strokeStyle = colors.contour
  ctx.lineWidth = SPIKE_STALK_CONTOUR_PX
  strokeQuad(ctx, base, ctrl, top)
  ctx.strokeStyle = colors.stem
  ctx.lineWidth = SPIKE_STALK_PX
  strokeQuad(ctx, base, ctrl, top)
  const blade = {
    origin: top,
    dirX,
    dirY,
    len: spike.height - stalkLen,
    halfW: Math.max(SPIKE_HALF_W_MIN, spike.height * SPIKE_HALF_W_FRAC)
  }
  ctx.fillStyle = colors.shade
  fillBlade(ctx, blade, SPIKE_EDGE_PX)
  ctx.fillStyle = colors.body
  fillBlade(ctx, blade, 0)
  paintChevrons(ctx, blade, colors)
}
function bladeHalfWidth(blade, t) {
  if (t <= SPIKE_WIDEST_T) return blade.halfW * Math.sin((t / SPIKE_WIDEST_T) * Math.PI / 2)
  return blade.halfW * Math.pow((1 - t) / (1 - SPIKE_WIDEST_T), SPIKE_TIP_POW)
}
function bladePoint(blade, t, across) {
  const { origin, dirX, dirY, len } = blade
  return {
    x: origin.x + dirX * len * t - dirY * across,
    y: origin.y + dirY * len * t + dirX * across
  }
}
function fillBlade(ctx, blade, grow) {
  ctx.beginPath()
  for (let s = 0; s <= SPIKE_SAMPLES; s++) {
    const t = s / SPIKE_SAMPLES
    const p = bladePoint(blade, t + (s === SPIKE_SAMPLES ? grow / blade.len : 0), bladeHalfWidth(blade, t) + grow)
    s === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)
  }
  for (let s = SPIKE_SAMPLES; s >= 0; s--) {
    const t = s / SPIKE_SAMPLES
    const p = bladePoint(blade, t, -(bladeHalfWidth(blade, t) + grow))
    ctx.lineTo(p.x, p.y)
  }
  ctx.closePath()
  ctx.fill()
}
//
// Stacked V marks pointing up the spike; lit on the left half, shaded on
// the right, so the face reads as overlapping scales lit from the upper left.
//
function paintChevrons(ctx, blade, colors) {
  const rows = Math.max(3, Math.floor(blade.len / SPIKE_CHEVRON_STEP))
  ctx.lineWidth = SPIKE_CHEVRON_PX
  for (let r = 1; r < rows; r++) {
    const t = r / rows
    const w = bladeHalfWidth(blade, t) * SPIKE_CHEVRON_INSET
    const drop = (w * SPIKE_CHEVRON_DROP) / blade.len
    const apex = bladePoint(blade, t, 0)
    const left = bladePoint(blade, t - drop, w)
    const right = bladePoint(blade, t - drop, -w)
    ctx.strokeStyle = colors.light
    ctx.beginPath()
    ctx.moveTo(left.x, left.y)
    ctx.lineTo(apex.x, apex.y)
    ctx.stroke()
    ctx.strokeStyle = colors.shade
    ctx.beginPath()
    ctx.moveTo(apex.x, apex.y)
    ctx.lineTo(right.x, right.y)
    ctx.stroke()
  }
  const ribEnd = bladePoint(blade, SPIKE_MIDRIB_END_T, 0)
  ctx.strokeStyle = colors.shade
  ctx.lineWidth = SPIKE_MIDRIB_PX
  ctx.beginPath()
  ctx.moveTo(blade.origin.x, blade.origin.y)
  ctx.lineTo(ribEnd.x, ribEnd.y)
  ctx.stroke()
}
function paintBaseLeaves(ctx, x, baseY, rng, colors) {
  const base = { x, y: baseY }
  ctx.lineCap = 'round'
  for (const side of BASE_LEAF_SIDES) {
    const len = BASE_LEAF_LEN * (0.8 + rng() * 0.4)
    const tip = { x: x + side * len * 0.9, y: baseY - len * 0.55 }
    const ctrl = { x: x + side * len * 0.2, y: baseY - len * 0.75 }
    ctx.strokeStyle = colors.contour
    ctx.lineWidth = BASE_LEAF_PX + BASE_LEAF_CONTOUR_PX
    strokeQuad(ctx, base, ctrl, tip)
    ctx.strokeStyle = colors.leaf
    ctx.lineWidth = BASE_LEAF_PX
    strokeQuad(ctx, base, ctrl, tip)
  }
}
