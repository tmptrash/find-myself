import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { paintMossStrand } from '../utils/cave-paint.js'
//
// Long leafy moss strands hanging from the monster plant's leaves and vines
// that sway in the cave draught. Each strand is two baked halves: the upper
// half swings on a spring around its pin toward a slow wind wave (wider in
// gusts), the lower half hangs from the upper one's end on a softer spring
// chasing the upper angle — so the tip lags behind, follows through and
// settles back smoothly.
//
const SPRITE_PREFIX = 'cave0-strand-v2'
const VARIANT_COUNT = 10
const VARIANT_SEED = 7700
const GRAIN_SEED_BASE = 7800
const BAKE_W = 28
const PIN_Y = 4
const LEN_MIN = 70
const LEN_RANGE = 150
const DROP_ROOM = 6
const SPLIT = 0.5
//
// Wind wave (degrees): base swing, extra swing at full gust, two wave
// speeds per strand (the second one faster and smaller).
//
const SWAY_BASE_DEG = 1.6
const SWAY_GUST_DEG = 5
const SWAY_SPEED_MIN = 0.35
const SWAY_SPEED_RANGE = 0.4
const SWAY_SECOND_SPEED = 2.3
const SWAY_SECOND_SHARE = 0.35
const SWAY_SECOND_PHASE = 2
//
// Springs: stiffness and damping of the upper half (toward the wave) and
// the lower half (toward the upper angle); longer strands are slower.
//
const UPPER_STIFF = 14
const UPPER_DAMP = 3.2
const LOWER_STIFF = 7
const LOWER_DAMP = 2.2
const LONG_SLOW = 120
const MAX_DT = 0.05
const CULL_PAD = 40
const FLIP_CHANCE = 0.5
const FULL_TURN = Math.PI * 2
const DEG = Math.PI / 180
const bakedByK = new WeakMap()

/**
 * Creates the swaying strand set.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<{x: number, y: number}>} cfg.anchors - Pin points (world)
 * @param {number} [cfg.seed=1] - Variant / phase seed
 * @returns {Object} Strands instance
 */
export function create(cfg) {
  const { k, anchors, seed = 1 } = cfg
  const variants = bakeVariants(k)
  const rng = createSeededRandom(seed)
  const strands = anchors.map(a => {
    const variant = variants[Math.floor(rng() * variants.length)]
    return {
      x: Math.round(a.x),
      y: Math.round(a.y),
      variant,
      phase: rng() * FULL_TURN,
      speed: SWAY_SPEED_MIN + rng() * SWAY_SPEED_RANGE,
      slow: LONG_SLOW / (LONG_SLOW + variant.h),
      flip: rng() < FLIP_CHANCE,
      upper: 0,
      upperV: 0,
      lower: 0,
      lowerV: 0
    }
  })
  return { k, strands }
}

/**
 * Steps both springs of every strand toward the current wind wave.
 * @param {Object} inst - Strands instance
 * @param {number} gust - Draught strength 0..1
 */
export function onUpdate(inst, gust) {
  const dt = Math.min(MAX_DT, inst.k.dt())
  const t = inst.k.time()
  const amp = SWAY_BASE_DEG + SWAY_GUST_DEG * gust
  inst.strands.forEach(s => {
    const wave = Math.sin(t * s.speed + s.phase) + Math.sin(t * s.speed * SWAY_SECOND_SPEED + s.phase * SWAY_SECOND_PHASE) * SWAY_SECOND_SHARE
    s.upperV += (UPPER_STIFF * s.slow * (wave * amp - s.upper) - UPPER_DAMP * s.upperV) * dt
    s.upper += s.upperV * dt
    s.lowerV += (LOWER_STIFF * s.slow * (s.upper - s.lower) - LOWER_DAMP * s.lowerV) * dt
    s.lower += s.lowerV * dt
  })
}

/**
 * Draws every strand crossing the view: the upper half around its pin,
 * the lower half from the upper half's end.
 * @param {Object} inst - Strands instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDraw(inst, top, bottom) {
  const k = inst.k
  inst.strands.forEach(s => {
    const v = s.variant
    if (s.y > bottom + CULL_PAD || s.y + v.h < top - CULL_PAD) return
    const a = s.upper * DEG
    k.drawSprite({ sprite: v.upper, pos: k.vec2(s.x, s.y), anchor: 'top', angle: s.upper, flipX: s.flip })
    k.drawSprite({
      sprite: v.lower,
      pos: k.vec2(s.x - Math.sin(a) * v.split, s.y + Math.cos(a) * v.split),
      anchor: 'top',
      angle: s.lower,
      flipX: s.flip
    })
  })
}
//
// Strand variants of different lengths, each baked whole and cut in two
// at its middle (both halves pinned at their top centre).
//
function bakeVariants(k) {
  const cached = bakedByK.get(k)
  if (cached) return cached
  const variants = []
  for (let i = 0; i < VARIANT_COUNT; i++) {
    const rng = createSeededRandom(VARIANT_SEED + i)
    const len = LEN_MIN + LEN_RANGE * i / (VARIANT_COUNT - 1)
    const h = Math.ceil(len + PIN_Y + DROP_ROOM)
    const split = Math.round(PIN_Y + len * SPLIT)
    const canvas = document.createElement('canvas')
    canvas.width = BAKE_W
    canvas.height = h
    paintMossStrand(canvas.getContext('2d'), BAKE_W / 2, PIN_Y, len, rng)
    applyForestFilmGrainToCanvas(canvas, GRAIN_SEED_BASE + i)
    const name = `${SPRITE_PREFIX}-${i}`
    variants.push({
      h,
      split,
      upper: loadRows(k, `${name}-upper`, canvas, 0, split),
      lower: loadRows(k, `${name}-lower`, canvas, split, h - split)
    })
  }
  bakedByK.set(k, variants)
  return variants
}
//
// Registers a horizontal band of a canvas as its own sprite.
//
function loadRows(k, name, src, y, h) {
  const canvas = document.createElement('canvas')
  canvas.width = src.width
  canvas.height = h
  canvas.getContext('2d').drawImage(src, 0, y, src.width, h, 0, 0, src.width, h)
  k.loadSprite(name, canvas)
  return name
}
