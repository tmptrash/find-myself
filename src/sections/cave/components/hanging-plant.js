import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { drawFernToCanvas } from '../../../utils/draw-fern.js'
import { CAVE_PAL, css, paintHangingVine } from '../utils/cave-paint.js'
//
// Dark plants hanging from the ceiling and from under ledges: upside-down
// ferns and leafy vine strands. Baked once per live k as a few variants,
// drawn pinned at the top and swinging gently left and right.
//
const SPRITE_PREFIX = 'cave0-hanging-v1'
const VARIANT_COUNT = 8
const VARIANT_SEED = 6100
const GRAIN_SEED_BASE = 9100
const BAKE_W = 76
const PIN_Y = 3
//
// Fern variants: size range of the hanging frond clump.
//
const FERN_SIZE_MIN = 34
const FERN_SIZE_RANGE = 34
//
// Vine variants: strand length.
//
const VINE_LEN_MIN = 60
const VINE_LEN_RANGE = 80
//
// Sway: amplitude in degrees, speed range.
//
const SWAY_AMP_DEG = 4.5
const SWAY_SPEED_MIN = 0.55
const SWAY_SPEED_RANGE = 0.5
const SWAY_LONG_DAMP = 60
const CULL_PAD = 140
const FULL_TURN = Math.PI * 2
const bakedByK = new WeakMap()

/**
 * Creates the hanging plant set.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<{x: number, y: number}>} cfg.spots - Pin points (world)
 * @param {number} [cfg.seed=1] - Variant / phase seed
 * @returns {Object} Hanging plants instance
 */
export function create(cfg) {
  const { k, spots, seed = 1 } = cfg
  const variants = bakeVariants(k)
  const rng = createSeededRandom(seed)
  const plants = spots.map((spot, i) => {
    const v = variants[Math.floor(rng() * variants.length)]
    return {
      x: spot.x,
      y: spot.y,
      variant: v,
      phase: rng() * FULL_TURN,
      speed: SWAY_SPEED_MIN + rng() * SWAY_SPEED_RANGE,
      flip: i % 2 === 0 ? 1 : -1
    }
  })
  return { k, plants }
}

/**
 * Draws every plant crossing the view with its current sway angle.
 * @param {Object} inst - Hanging plants instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDraw(inst, top, bottom) {
  const k = inst.k
  const t = k.time()
  inst.plants.forEach(p => {
    if (p.y > bottom + CULL_PAD || p.y + p.variant.h < top - CULL_PAD) return
    const damp = SWAY_LONG_DAMP / (SWAY_LONG_DAMP + p.variant.h)
    k.drawSprite({
      sprite: p.variant.name,
      pos: k.vec2(Math.round(p.x), Math.round(p.y)),
      anchor: 'top',
      angle: Math.sin(t * p.speed + p.phase) * SWAY_AMP_DEG * (1 + damp),
      flipX: p.flip < 0
    })
  })
}
//
// Half ferns, half vines; every variant pinned at its top centre.
//
function bakeVariants(k) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const variants = []
  for (let i = 0; i < VARIANT_COUNT; i++) {
    const rng = createSeededRandom(VARIANT_SEED + i)
    const isFern = i % 2 === 0
    const h = Math.ceil(isFern ? FERN_SIZE_MIN + FERN_SIZE_RANGE + PIN_Y * 2 : VINE_LEN_MIN + VINE_LEN_RANGE + PIN_Y * 2)
    const canvas = document.createElement('canvas')
    canvas.width = BAKE_W
    canvas.height = h
    const ctx = canvas.getContext('2d')
    isFern ? paintHangingFern(ctx, rng) : paintVine(ctx, rng)
    applyForestFilmGrainToCanvas(canvas, GRAIN_SEED_BASE + i)
    const name = `${SPRITE_PREFIX}-${i}`
    k.loadSprite(name, canvas)
    variants.push({ name, h })
  }
  bakedByK.set(k, variants)
  return variants
}
function paintHangingFern(ctx, rng) {
  const [dark, mid, light] = CAVE_PAL.plant
  ctx.save()
  ctx.translate(BAKE_W / 2, PIN_Y)
  ctx.rotate(Math.PI)
  drawFernToCanvas(ctx, {
    x: 0,
    baseY: 0,
    size: FERN_SIZE_MIN + rng() * FERN_SIZE_RANGE,
    rng,
    colors: { contour: css(CAVE_PAL.contour), dark: css(dark), mid: css(mid), light: css(light) }
  })
  ctx.restore()
}
//
// Leafy strand hanging from the pin point.
//
function paintVine(ctx, rng) {
  paintHangingVine(ctx, BAKE_W / 2, PIN_Y, VINE_LEN_MIN + rng() * VINE_LEN_RANGE, rng)
}
