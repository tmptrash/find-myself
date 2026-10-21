import { paintForestContactShadow } from '../sections/forest/utils/forest-atmosphere.js'
//
// Canvas2D grass tuft: a handful of curved tapered blades, some dry straw.
// For baked decor; the live swaying field stays in components/grass.js.
//
const TUFT_BLADES_MIN = 4
const TUFT_BLADES_RANGE = 4
const TUFT_H_MIN = 8
const TUFT_H_RANGE = 10
const TUFT_DRY_CHANCE = 0.3
const TUFT_BLADE_W = 2.2
const TUFT_SPREAD = 7
const TUFT_BEND = 0.6

/**
 * Paints one grass tuft rooted at (x, baseY).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Object} opts
 * @param {number} opts.x - Base X
 * @param {number} opts.baseY - Base Y
 * @param {() => number} opts.rng - Seeded random in [0, 1)
 * @param {Object} opts.colors - Hex colours
 * @param {string} opts.colors.grass - Green blades
 * @param {string} opts.colors.dry - Straw blades
 */
export function drawGrassTuftToCanvas(ctx, opts) {
  const { x, baseY, rng, colors } = opts
  colors.contactShadow && paintForestContactShadow(ctx, x, baseY, TUFT_SPREAD * 1.05, 3.2, colors.contactShadow, 0.85)
  const blades = TUFT_BLADES_MIN + Math.floor(rng() * TUFT_BLADES_RANGE)
  for (let i = 0; i < blades; i++) {
    const bx = x + (rng() - 0.5) * TUFT_SPREAD
    const h = TUFT_H_MIN + rng() * TUFT_H_RANGE
    const bend = (rng() - 0.5) * h * TUFT_BEND
    ctx.fillStyle = rng() < TUFT_DRY_CHANCE ? colors.dry : colors.grass
    ctx.beginPath()
    ctx.moveTo(bx - TUFT_BLADE_W / 2, baseY)
    ctx.quadraticCurveTo(bx + bend * 0.3, baseY - h * 0.6, bx + bend, baseY - h)
    ctx.quadraticCurveTo(bx + bend * 0.3 + TUFT_BLADE_W * 0.4, baseY - h * 0.5, bx + TUFT_BLADE_W / 2, baseY)
    ctx.closePath()
    ctx.fill()
  }
}
