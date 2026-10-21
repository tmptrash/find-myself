import { quadPoint, quadTangent } from './quad-curve.js'
//
// Canvas2D fern clump in the look of the forest reference: one to three
// upright pinnate fronds. Each frond is a gently bowed stem with a bare stalk
// at the bottom, then four or five pairs of big rounded leaflets set slightly
// alternate with open gaps (so the stem reads between them), shrinking toward
// one terminal leaflet. Back fronds take the dark tone, front ones the mid
// tone, and a few upper leaflets catch the light. The optional contour pass
// grows every leaflet and the stem by a pixel in the contour colour first.
//
const FERN_FRONDS_MIN = 1
const FERN_FRONDS_RANGE = 3
const FERN_LEAN_SPREAD = 0.4
const FERN_LEAN_SINGLE = 0.3
const FERN_LEAN_JITTER = 0.14
const FERN_BOW = 0.1
const FERN_LEN_MIN_FRAC = 0.66
const FERN_PAIRS_MIN = 4
const FERN_PAIRS_RANGE = 2
const FERN_PAIR_T_START = 0.3
const FERN_PAIR_T_END = 0.84
const FERN_ALTERNATE_T = 0.035
const FERN_LEAFLET_LEN = 0.34
const FERN_LEAFLET_TAPER = 0.5
const FERN_LEAFLET_WIDTH = 0.6
const FERN_LEAFLET_ANGLE = 0.9
const FERN_LEAFLET_ANGLE_TOP = 0.55
const FERN_LEAFLET_REACH = 0.56
const FERN_TIP_LEAFLET_SCALE = 0.85
const FERN_STEM_PX = 1.8
const FERN_CONTOUR_PX = 1.2
const FERN_LIGHT_CHANCE = 0.35
const FERN_LIGHT_MIN_T = 0.5
const FERN_BACK_FROND_SHARE = 0.5
const FERN_BOUNDS_SPREAD = 0.8
const FERN_BOUNDS_PAD = 6

/**
 * Paints one fern clump rooted at (x, baseY).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.x - Base X
 * @param {number} opts.baseY - Base Y (ground contact)
 * @param {number} opts.size - Tallest frond length (px)
 * @param {() => number} opts.rng - Seeded random in [0, 1)
 * @param {Object} opts.colors - CSS colours
 * @param {string} [opts.colors.contour] - Leaflet and stem contour (omit for soft parallax ferns)
 * @param {string} [opts.colors.stem] - Stem tone (defaults to the frond tone)
 * @param {string} opts.colors.dark - Back fronds
 * @param {string} opts.colors.mid - Front fronds
 * @param {string} opts.colors.light - Lit leaflets
 */
export function drawFernToCanvas(ctx, opts) {
  const { x, baseY, size, rng, colors } = opts
  const count = FERN_FRONDS_MIN + Math.floor(rng() * FERN_FRONDS_RANGE)
  const fronds = []
  for (let i = 0; i < count; i++) {
    const norm = count === 1 ? 0 : (i / (count - 1)) * 2 - 1
    const lean = count === 1 ? (rng() - 0.5) * FERN_LEAN_SINGLE : norm * FERN_LEAN_SPREAD
    fronds.push({
      norm,
      lean: lean + (rng() - 0.5) * FERN_LEAN_JITTER,
      len: size * (FERN_LEN_MIN_FRAC + rng() * (1 - FERN_LEN_MIN_FRAC)),
      pairs: FERN_PAIRS_MIN + Math.floor(rng() * FERN_PAIRS_RANGE),
      back: count > 1 && rng() < FERN_BACK_FROND_SHARE,
      seed: rng()
    })
  }
  fronds.sort((a, b) => Number(b.back) - Number(a.back))
  fronds.forEach(frond => {
    const leaflets = buildFrondLeaflets(x, baseY, frond, rng)
    const base = frond.back ? colors.dark : colors.mid
    colors.contour && paintFrond(ctx, frond, leaflets, colors.contour, colors.contour, colors.contour, FERN_CONTOUR_PX)
    paintFrond(ctx, frond, leaflets, base, colors.light, colors.stem ?? base, 0)
  })
}

/**
 * Conservative world bounds of a fern clump (for bake canvases).
 * @param {number} x - Base X
 * @param {number} baseY - Base Y
 * @param {number} size - Tallest frond length
 * @returns {{x1: number, y1: number, x2: number, y2: number}}
 */
export function fernBounds(x, baseY, size) {
  const reach = size + FERN_BOUNDS_PAD
  return { x1: x - reach * FERN_BOUNDS_SPREAD, y1: baseY - reach, x2: x + reach * FERN_BOUNDS_SPREAD, y2: baseY + FERN_BOUNDS_PAD }
}
//
// Stem curve plus every leaflet (centre, half-length, half-width, angle).
// The two leaflets of a pair sit a little apart along the stem, and lean up
// toward the frond tip, flatter near the base.
//
function buildFrondLeaflets(x, baseY, frond, rng) {
  const dirX = Math.sin(frond.lean)
  const dirY = -Math.cos(frond.lean)
  const bow = frond.len * FERN_BOW * (frond.norm || (frond.seed - 0.5))
  frond.p0 = { x, y: baseY }
  frond.p1 = { x: x + dirX * frond.len * 0.5 - dirY * bow, y: baseY + dirY * frond.len * 0.5 + dirX * bow }
  frond.p2 = { x: x + dirX * frond.len, y: baseY + dirY * frond.len }
  const leaflets = []
  for (let j = 0; j < frond.pairs; j++) {
    const pairT = FERN_PAIR_T_START + (FERN_PAIR_T_END - FERN_PAIR_T_START) * (j / Math.max(1, frond.pairs - 1))
    const light = pairT > FERN_LIGHT_MIN_T && rng() < FERN_LIGHT_CHANCE
    for (const side of [-1, 1]) {
      const t = pairT + (side > 0 ? FERN_ALTERNATE_T : 0)
      const p = quadPoint(frond.p0, frond.p1, frond.p2, t)
      const tan = quadTangent(frond.p0, frond.p1, frond.p2, t)
      const len = frond.len * FERN_LEAFLET_LEN * (1 - t * FERN_LEAFLET_TAPER)
      const spread = FERN_LEAFLET_ANGLE + (FERN_LEAFLET_ANGLE_TOP - FERN_LEAFLET_ANGLE) * t
      const a = Math.atan2(tan.y, tan.x) + side * spread
      leaflets.push({
        x: p.x + Math.cos(a) * len * FERN_LEAFLET_REACH,
        y: p.y + Math.sin(a) * len * FERN_LEAFLET_REACH,
        rx: len * 0.5,
        ry: len * FERN_LEAFLET_WIDTH * 0.5,
        angle: a,
        light
      })
    }
  }
  const tipLen = frond.len * FERN_LEAFLET_LEN * (1 - FERN_LEAFLET_TAPER) * FERN_TIP_LEAFLET_SCALE
  const tipTan = quadTangent(frond.p0, frond.p1, frond.p2, 1)
  leaflets.push({
    x: frond.p2.x + tipTan.x * tipLen * 0.35,
    y: frond.p2.y + tipTan.y * tipLen * 0.35,
    rx: tipLen * 0.55,
    ry: tipLen * FERN_LEAFLET_WIDTH * 0.5,
    angle: Math.atan2(tipTan.y, tipTan.x),
    light: false
  })
  return leaflets
}
//
// Leaflets first, the stem stroked over their bases so it stays readable
// all the way up the frond.
//
function paintFrond(ctx, frond, leaflets, base, light, stem, grow) {
  leaflets.forEach(leaf => {
    ctx.fillStyle = leaf.light && !grow ? light : base
    ctx.beginPath()
    ctx.ellipse(leaf.x, leaf.y, leaf.rx + grow, leaf.ry + grow, leaf.angle, 0, Math.PI * 2)
    ctx.fill()
  })
  ctx.strokeStyle = stem
  ctx.lineCap = 'round'
  ctx.lineWidth = FERN_STEM_PX + grow * 2
  ctx.beginPath()
  ctx.moveTo(frond.p0.x, frond.p0.y)
  ctx.quadraticCurveTo(frond.p1.x, frond.p1.y, frond.p2.x, frond.p2.y)
  ctx.stroke()
}
