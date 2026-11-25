import { CFG } from '../cfg.js'
import { getRGB } from '../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../sections/forest/utils/forest-parallax-grain.js'
import * as HeroPicture from '../utils/hero-picture.js'
//
// The white fireflies the hero breaks into when he dies (both levels): his
// picture is gone and they line up along his outline, hold it a moment,
// then fly apart and flit about at random — darting this way and that —
// and go out after a while. Every one is a soft additive glow with a
// bright core, flickering; all of them draw in one pass at the layer's z.
//
// The outline: the edge pixels of the hero's idle stance (its body, and
// its legs LEG_HALF_W px either side of each hip, LEG_TUCK px up into the
// body, down to the feet), in his sprite's frame round its middle; each
// firefly takes one spot of it, the spots at least CONTOUR_GAP_SHARE of an
// even share of the outline apart. They fly in from up to GATHER_FROM px
// off their spots over GATHER s (easing in, fading in), hold the outline
// HOLD..+RANGE s, then are thrown out away from his middle at
// BURST_SPEED..+RANGE px/s (UP_BIAS px/s more upward), the throw dying
// away at BURST_DRAG per second. Each then flies at FLY_SPEED..+RANGE px/s
// on a heading that turns at random up to TURN_RATE turns per second and
// now and then (DART_CHANCE per second) jumps by up to DART_TURN of a turn
// — the chaotic back and forth. Once free it lives LIFE..+RANGE s, fading
// out over its last FADE_OUT s. None goes under the ground or the water he
// died over: each burst has a floor (by default the line his feet stood
// on), and a firefly reaching FLOOR_CLEAR px over it turns back up.
//
const LEG_HALF_W = 4.3
const LEG_TUCK = 2
const SOLID_ALPHA = 128
const CONTOUR_GAP_SHARE = 0.7
const LOOK_AHEAD = { x: 0, y: 0 }
const GATHER_FROM = 14
const GATHER = 0.18
const HOLD = 0.12
const HOLD_RANGE = 0.08
const FLOOR_CLEAR = 3
const BURST_SPEED = 40
const BURST_SPEED_RANGE = 120
const UP_BIAS = 30
const BURST_DRAG = 2.2
const FLY_SPEED = 35
const FLY_SPEED_RANGE = 45
const TURN_RATE = 1.2
const DART_CHANCE = 1.5
const DART_TURN = 0.45
const LIFE = 1.6
const LIFE_RANGE = 0.8
const FADE_OUT = 0.7
//
// Looks: glow radius GLOW_R..+RANGE px, core CORE_SCALE of it; flicker
// FLICKER_HZ..+RANGE times a second, down to 1 - FLICKER_DEPTH.
//
const GLOW_R = 6
const GLOW_R_RANGE = 5
const CORE_SCALE = 0.32
const FLICKER_HZ = 2
const FLICKER_HZ_RANGE = 4
const FLICKER_DEPTH = 0.45
//
// The glow sprite: a radial falloff GLOW_BAKE_R px in radius (white at the
// centre, MID_ALPHA at MID_STOP of the way out, clear at the rim), baked
// once per live k with film grain (seeded GRAIN_SEED).
//
const GLOW_SPRITE = 'hero-death-firefly-glow-v1'
const GLOW_BAKE_R = 32
const MID_STOP = 0.35
const MID_ALPHA = 0.35
const GRAIN_SEED = 9710
const COLORS = CFG.visual.colors.palette.heroDeathFirefly
const FULL_TURN = Math.PI * 2
const HALF = 0.5
const BYTE_MAX = 255
const HEX_RADIX = 16
const RGBA = 4
const glowFor = new WeakSet()
let contour = null

/**
 * Creates the hero's death fireflies: one draw layer at z that runs and
 * draws every burst.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.z - Draw layer z
 * @returns {Object} Death fireflies inst
 */
export function create(cfg) {
  const { k, z } = cfg
  bakeGlow(k)
  const inst = {
    k,
    flies: [],
    glowRgb: getRGB(k, COLORS.glow),
    coreRgb: getRGB(k, COLORS.core),
    pos: k.vec2(0, 0)
  }
  k.add([
    k.z(z),
    {
      update() {
        onUpdate(inst)
      },
      draw() {
        onDraw(inst)
      }
    }
  ])
  return inst
}

/**
 * The hero breaks into white fireflies: they line up along his outline
 * round his middle, then fly apart.
 * @param {Object} inst - Death fireflies inst
 * @param {number} x - World X of his middle (his sprite's centre)
 * @param {number} y - World Y of his middle
 * @param {number} count - How many
 * @param {number} [floorY] - World Y none of them goes under (the ground or the water; his feet's line when left out)
 */
export function burst(inst, x, y, count, floorY = y + HeroPicture.FEET_Y - HeroPicture.FRAME_SIZE * HALF) {
  outlineSpots(count).forEach(spot => {
    const a = Math.random() * FULL_TURN
    const off = Math.random() * GATHER_FROM
    const hold = GATHER + HOLD + Math.random() * HOLD_RANGE
    inst.flies.push({
      x: x + spot.x,
      y: y + spot.y,
      tx: x + spot.x,
      ty: y + spot.y,
      ox: Math.cos(a) * off,
      oy: Math.sin(a) * off,
      cx: x,
      cy: y,
      floor: floorY - FLOOR_CLEAR,
      free: false,
      vx: 0,
      vy: 0,
      heading: Math.random() * FULL_TURN,
      speed: FLY_SPEED + Math.random() * FLY_SPEED_RANGE,
      age: 0,
      hold,
      life: hold + LIFE + Math.random() * LIFE_RANGE,
      r: GLOW_R + Math.random() * GLOW_R_RANGE,
      flickerHz: FLICKER_HZ + Math.random() * FLICKER_HZ_RANGE,
      phase: Math.random() * FULL_TURN
    })
  })
}
//
// Each firefly: gathering onto its spot of the outline and holding it,
// then thrown out (the throw dying away), its heading wandering (and now
// and then darting off), on until its life is over.
//
function onUpdate(inst) {
  if (!inst.flies.length) return
  const dt = inst.k.dt()
  const drag = Math.exp(-BURST_DRAG * dt)
  inst.flies.forEach(f => {
    f.age += dt
    if (!f.free) {
      holdOutline(f)
      return
    }
    f.heading += (Math.random() * 2 - 1) * TURN_RATE * FULL_TURN * dt
    Math.random() < DART_CHANCE * dt && (f.heading += (Math.random() * 2 - 1) * DART_TURN * FULL_TURN)
    f.vx *= drag
    f.vy *= drag
    f.x += (f.vx + Math.cos(f.heading) * f.speed) * dt
    f.y += (f.vy + Math.sin(f.heading) * f.speed) * dt
    f.y > f.floor && keepOverFloor(f)
  })
  inst.flies = inst.flies.filter(f => f.age < f.life)
}
//
// A firefly at its floor turns back up: set on it, its throw and its
// heading pointed upward.
//
function keepOverFloor(f) {
  f.y = f.floor
  f.vy = -Math.abs(f.vy)
  Math.sin(f.heading) > 0 && (f.heading = -f.heading)
}
//
// On its way onto its spot (eased in), then still on it; once its hold is
// over it is thrown out away from his middle.
//
function holdOutline(f) {
  const u = Math.min(1, f.age / GATHER)
  const left = (1 - u) * (1 - u) * (1 - u)
  f.x = f.tx + f.ox * left
  f.y = f.ty + f.oy * left
  if (f.age < f.hold) return
  const dx = f.tx - f.cx
  const dy = f.ty - f.cy
  const len = Math.hypot(dx, dy) || 1
  const speed = BURST_SPEED + Math.random() * BURST_SPEED_RANGE
  f.vx = dx / len * speed
  f.vy = dy / len * speed - UP_BIAS
  f.free = true
}
//
// Additive glow and bright core of every living firefly.
//
function onDraw(inst) {
  const k = inst.k
  const t = k.time()
  inst.flies.forEach(f => {
    const fade = Math.min(1, f.age / GATHER, (f.life - f.age) / FADE_OUT)
    const flicker = 1 - FLICKER_DEPTH * (HALF + HALF * Math.sin(t * f.flickerHz * FULL_TURN + f.phase))
    drawGlow(inst, f.x, f.y, f.r, inst.glowRgb, fade * flicker)
    drawGlow(inst, f.x, f.y, f.r * CORE_SCALE, inst.coreRgb, fade)
  })
}
function drawGlow(inst, x, y, r, color, opacity) {
  if (opacity <= 0) return
  const k = inst.k
  inst.pos.x = x
  inst.pos.y = y
  k.drawSprite({
    sprite: GLOW_SPRITE,
    pos: inst.pos,
    anchor: 'center',
    width: r * 2,
    height: r * 2,
    color,
    opacity,
    blend: k.BlendMode.Add
  })
}
//
// count spots of the hero's outline, spread along it (a ring round his
// middle until his picture is loaded).
//
function outlineSpots(count) {
  const edge = heroOutline()
  if (!edge) return Array.from({ length: count }, (_, i) => ringSpot(i / count))
  const gap = edge.length / count * CONTOUR_GAP_SHARE
  const spots = []
  edge.slice().sort(() => Math.random() - HALF).forEach(p => {
    spots.length < count && spots.every(q => Math.hypot(p.x - q.x, p.y - q.y) >= gap) && spots.push(p)
  })
  while (spots.length < count) spots.push(edge[Math.floor(Math.random() * edge.length)])
  return spots
}
function ringSpot(share) {
  const a = share * FULL_TURN
  const r = HeroPicture.FRAME_SIZE * HALF * HALF
  return { x: Math.cos(a) * r, y: Math.sin(a) * r }
}
//
// The edge pixels of the hero's idle stance with his legs, round his
// sprite's middle (once per page; null until his picture is loaded).
//
function heroOutline() {
  if (contour) return contour
  const body = HeroPicture.bakeIdleFrame([LOOK_AHEAD, LOOK_AHEAD])
  if (!body) return null
  const size = HeroPicture.FRAME_SIZE
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d', { willReadFrequently: true })
  ctx.drawImage(body, 0, 0)
  ctx.fillStyle = COLORS.core
  HeroPicture.IDLE_HIP_POINTS.forEach(hip => ctx.fillRect(hip.x - LEG_HALF_W, hip.y - LEG_TUCK, LEG_HALF_W * 2, HeroPicture.FEET_Y - hip.y + LEG_TUCK))
  const data = ctx.getImageData(0, 0, size, size).data
  const edge = []
  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      isEdge(data, size, x, y) && edge.push({ x: x + HALF - size * HALF, y: y + HALF - size * HALF })
    }
  }
  canvas.width = 0
  body.width = 0
  contour = edge
  return contour
}
//
// A solid pixel with a clear (or outside) pixel beside it.
//
function isEdge(data, size, x, y) {
  return isSolid(data, size, x, y) && !(isSolid(data, size, x - 1, y) && isSolid(data, size, x + 1, y) && isSolid(data, size, x, y - 1) && isSolid(data, size, x, y + 1))
}
function isSolid(data, size, x, y) {
  return x >= 0 && y >= 0 && x < size && y < size && data[(y * size + x) * RGBA + 3] >= SOLID_ALPHA
}
//
// The soft white glow, once per live k.
//
function bakeGlow(k) {
  if (glowFor.has(k)) return
  const size = GLOW_BAKE_R * 2
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  const g = ctx.createRadialGradient(GLOW_BAKE_R, GLOW_BAKE_R, 0, GLOW_BAKE_R, GLOW_BAKE_R, GLOW_BAKE_R)
  g.addColorStop(0, hexAlpha(COLORS.core, 1))
  g.addColorStop(MID_STOP, hexAlpha(COLORS.core, MID_ALPHA))
  g.addColorStop(1, hexAlpha(COLORS.core, 0))
  ctx.fillStyle = g
  ctx.fillRect(0, 0, size, size)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  k.loadSprite(GLOW_SPRITE, canvas)
  glowFor.add(k)
}
//
// '#rrggbb' with an alpha byte for gradient stops.
//
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
