import { getRGB } from '../../../utils/helper.js'
import * as Glow from '../utils/cave-glow.js'
import { CAVE_CFG } from '../cfg.js'
//
// Cave fireflies: slow wandering sparks across the shaft, plus bursts of
// sparks where the hero comes back (they drift apart, flicker and fade).
// The wandering ones shy away from the hero when he comes near (SHY_*).
// Given a nest (the dry mushroom's big holes, setNest), a few of them are
// always at it: one flies to a hole and goes in, stays a while, comes out
// of a hole and flies off; as soon as one is off (or eaten on its way),
// the free one nearest the nest heads for it — so as many as ever wander
// the cave. Everything draws in one additive pass with the shared glow
// sprite.
//
const AMBIENT_SPEED = 22
const AMBIENT_TURN_RATE = 0.9
const AMBIENT_GLOW_R = 9
const AMBIENT_CORE_R = 1.6
const AMBIENT_OPACITY = 0.75
const FLICKER_SPEED_MIN = 1.2
const FLICKER_SPEED_RANGE = 2.4
const FLICKER_DEPTH = 0.55
const CULL_PAD = 24
//
// The bright core of an ambient firefly drifts round inside its glow, as a
// little lit ball would: round a circle CORE_ORBIT of the glow's radius
// (breathing by CORE_ORBIT_BREATHE of it at CORE_BREATHE_HZ), at
// CORE_SPIN..+RANGE rad/s, either way round.
//
const CORE_ORBIT = 0.2
const CORE_ORBIT_BREATHE = 0.25
const CORE_BREATHE_HZ = 0.6
const CORE_SPIN = 1.2
const CORE_SPIN_RANGE = 1.6
const HALF = 0.5
//
// Burst sparks: launch speed, drag, lifetime and size.
//
const BURST_SPEED_MIN = 50
const BURST_SPEED_RANGE = 190
const BURST_UP_BIAS = 60
const BURST_DRAG = 1.6
const BURST_FLOAT = 14
const BURST_LIFE_MIN = 1.5
const BURST_LIFE_RANGE = 0.9
const BURST_GLOW_R_MIN = 6
const BURST_GLOW_R_RANGE = 7
const BURST_SPREAD_PX = 14
const CORE_GLOW_SCALE = 0.32
const SPARK_FLICKER_MULT = 3
const FULL_TURN = Math.PI * 2
//
// An ambient firefly eaten (by a fish, a runner) lights up again at once
// elsewhere — in the box it is given (over the lake, so the lake never
// runs out of them) or anywhere in the bounds — fading in over
// RELIGHT_FADE s, so there are always as many of them.
//
const RELIGHT_FADE = 1.5
//
// Given where the air is open (isOpen), they keep to it: each is placed
// at an open spot (OPEN_TRIES picks at most) and turns about where its
// next step would take it out of the open (one that is not in the open —
// just out of the nest — flies on freely till it is).
//
const OPEN_TRIES = 40
//
// They shy away from the hero: within SHY_R px of him (standing, running
// or in a jump) each is shoved off him at up to SHY_ACC px/s² (more the
// nearer), the shove dying away at SHY_DRAG per s, and heads on away.
//
const SHY_R = 70
const SHY_ACC = 900
const SHY_DRAG = 2.5
//
// The hero moving through the air sways them off his way: within WAKE_R
// px of him each is pushed away from him at WAKE_ACC px/s² per px/s of his
// speed (more the nearer, and the more he moves toward it: from
// WAKE_SIDE of that when he passes it by to all of it when he comes
// straight at it). His speed is read off his moves, eased at WAKE_EASE per
// s, and never taken past WAKE_MAX px/s (a respawn is no move).
//
const WAKE_R = 150
const WAKE_ACC = 2.5
const WAKE_SIDE = 0.35
const WAKE_EASE = 10
const WAKE_MAX = 900
//
// The nest: how many are at it, flying at NEST_SPEED px/s, turning toward
// their hole at up to NEST_TURN rad/s (within ARRIVE_R px of it straight
// at it, slowing to ARRIVE_SPEED), going in within ENTER_R px of it — they
// dim only over the last ENTER_FADE_R px, so each is seen to fly into its
// very hole; inside STAY..+RANGE s (the
// first ones a share of that, so they do not all come out at once); out
// of a hole headed away from the nest's middle (give or take LEAVE_SPREAD
// rad, LEAVE_UP rad up), lighting up over LEAVE_FADE s, free after
// LEAVE_TIME s. The one sent home is the nearest of PICK_SAMPLES free ones.
//
const NEST_COUNT = 4
const NEST_SPEED = 34
const NEST_TURN = 3
const ENTER_R = 1
const ENTER_FADE_R = 5
const ARRIVE_R = 20
const ARRIVE_SPEED = 12
const STAY = 6
const STAY_RANGE = 10
const LEAVE_SPREAD = 0.7
const LEAVE_UP = 0.5
const LEAVE_FADE = 0.6
const LEAVE_TIME = 2.2
const PICK_SAMPLES = 6
const STATE = { FREE: 'free', HOMING: 'homing', INSIDE: 'inside', LEAVING: 'leaving' }

/**
 * Creates the ambient firefly swarm.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {{x1: number, y1: number, x2: number, y2: number}} cfg.bounds - World box they wander in
 * @param {number} cfg.count - Ambient firefly count
 * @param {(x: number, y: number) => boolean} [cfg.isOpen] - Open air at a point (else anywhere is)
 * @returns {Object} Fireflies instance
 */
export function create(cfg) {
  const { k, bounds, count } = cfg
  Glow.create(k)
  const inst = {
    k,
    bounds,
    isOpen: cfg.isOpen ?? null,
    nest: null,
    ambient: [],
    sparks: [],
    glowRgb: getRGB(k, CAVE_CFG.colors.firefly),
    coreRgb: getRGB(k, CAVE_CFG.colors.fireflyCore),
    sparkRgbs: CAVE_CFG.colors.heroSpark.map(hex => getRGB(k, hex)),
    hero: { x: 0, y: 0, vx: 0, vy: 0, known: false }
  }
  for (let i = 0; i < count; i++) {
    const spot = openSpot(inst, bounds)
    inst.ambient.push({
      x: spot.x,
      y: spot.y,
      heading: Math.random() * FULL_TURN,
      flickerSpeed: FLICKER_SPEED_MIN + Math.random() * FLICKER_SPEED_RANGE,
      phase: Math.random() * FULL_TURN,
      spin: (CORE_SPIN + Math.random() * CORE_SPIN_RANGE) * (Math.random() < HALF ? -1 : 1),
      orbit: Math.random() * FULL_TURN,
      fade: 1,
      vis: 1,
      vx: 0,
      vy: 0,
      state: STATE.FREE,
      hole: null,
      stay: 0,
      leaveT: 0
    })
  }
  return inst
}

/**
 * Gives the fireflies a nest to go in and out of (from then on NEST_COUNT
 * of them are always at it; they start inside).
 * @param {Object} inst - Fireflies instance
 * @param {{holes: Array<{x: number, y: number}>, x: number, top: number, foot: number}} nest - The holes (and the nest's middle line, top and foot)
 */
export function setNest(inst, nest) {
  inst.nest = { holes: nest.holes, x: nest.x, y: (nest.top + nest.foot) * HALF }
  inst.ambient.slice(0, NEST_COUNT).forEach((f, i) => goInside(f, STAY * i / NEST_COUNT + Math.random() * STAY_RANGE * HALF))
}

/**
 * Bursts the hero into fireflies at a point.
 * @param {Object} inst - Fireflies instance
 * @param {number} x - Burst centre X
 * @param {number} y - Burst centre Y
 * @param {number} count - Spark count
 */
export function burst(inst, x, y, count) {
  for (let i = 0; i < count; i++) {
    const a = Math.random() * FULL_TURN
    const speed = BURST_SPEED_MIN + Math.random() * BURST_SPEED_RANGE
    const life = BURST_LIFE_MIN + Math.random() * BURST_LIFE_RANGE
    inst.sparks.push({
      x: x + (Math.random() - 0.5) * BURST_SPREAD_PX,
      y: y + (Math.random() - 0.5) * BURST_SPREAD_PX * 2,
      vx: Math.cos(a) * speed,
      vy: Math.sin(a) * speed - BURST_UP_BIAS,
      life,
      maxLife: life,
      r: BURST_GLOW_R_MIN + Math.random() * BURST_GLOW_R_RANGE,
      color: inst.sparkRgbs[i % inst.sparkRgbs.length],
      flickerSpeed: (FLICKER_SPEED_MIN + Math.random() * FLICKER_SPEED_RANGE) * SPARK_FLICKER_MULT,
      phase: Math.random() * FULL_TURN
    })
  }
}

/**
 * Calls fn with every ambient firefly.
 * @param {Object} inst - Fireflies instance
 * @param {(f: {x: number, y: number}) => void} fn - Called per firefly
 */
export function forEachLit(inst, fn) {
  inst.ambient.forEach(f => f.state !== STATE.INSIDE && fn(f))
}

/**
 * An ambient firefly is eaten: it lights up again at once at a new spot in
 * a box (or anywhere in the bounds), fading in.
 * @param {Object} inst - Fireflies instance
 * @param {Object} f - The firefly (from forEachLit)
 * @param {{x1: number, y1: number, x2: number, y2: number}|null} [box=null] - Where it lights up again
 */
export function eat(inst, f, box = null) {
  const spot = openSpot(inst, box ?? inst.bounds)
  f.x = spot.x
  f.y = spot.y
  f.fade = 0
  f.vis = 1
  f.state = STATE.FREE
}

/**
 * Moves ambient fireflies (shying away from the hero) and ages burst
 * sparks.
 * @param {Object} inst - Fireflies instance
 * @param {{x: number, y: number}|null} [heroPos=null] - The hero's centre (null: none)
 */
export function onUpdate(inst, heroPos = null) {
  const dt = inst.k.dt()
  const { bounds } = inst
  const drag = Math.exp(-SHY_DRAG * dt)
  trackHero(inst, heroPos, dt)
  inst.ambient.forEach(f => {
    if (f.state !== STATE.FREE) {
      stepNest(inst, f, dt)
      return
    }
    f.fade = Math.min(1, f.fade + dt / RELIGHT_FADE)
    f.heading += (Math.random() - 0.5) * AMBIENT_TURN_RATE * FULL_TURN * dt
    heroPos && shy(f, heroPos, dt)
    heroPos && sway(f, inst.hero, dt)
    f.vx *= drag
    f.vy *= drag
    const nx = f.x + (Math.cos(f.heading) * AMBIENT_SPEED + f.vx) * dt
    const ny = f.y + (Math.sin(f.heading) * AMBIENT_SPEED + f.vy) * dt
    if (inst.isOpen && !inst.isOpen(nx, ny) && inst.isOpen(f.x, f.y)) {
      f.heading += Math.PI
      f.vx = 0
      f.vy = 0
      return
    }
    f.x = nx
    f.y = ny
    const outX = f.x < bounds.x1 || f.x > bounds.x2
    const outY = f.y < bounds.y1 || f.y > bounds.y2
    outX && (f.heading = Math.PI - f.heading)
    outY && (f.heading = -f.heading)
    f.x = Math.max(bounds.x1, Math.min(bounds.x2, f.x))
    f.y = Math.max(bounds.y1, Math.min(bounds.y2, f.y))
  })
  inst.nest && sendHome(inst)
  const sparkDrag = Math.exp(-BURST_DRAG * dt)
  inst.sparks.forEach(s => {
    s.vx *= sparkDrag
    s.vy = s.vy * sparkDrag - BURST_FLOAT * dt
    s.x += s.vx * dt
    s.y += s.vy * dt
    s.life -= dt
  })
  inst.sparks = inst.sparks.filter(s => s.life > 0)
}

/**
 * Additive draw of every visible firefly and spark.
 * @param {Object} inst - Fireflies instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDraw(inst, top, bottom) {
  const k = inst.k
  const t = k.time()
  inst.ambient.forEach(f => f.state === STATE.FREE && drawAmbient(inst, f, t, top, bottom))
  inst.sparks.forEach(s => {
    const fade = s.life / s.maxLife
    const flicker = flickerAt(t, s)
    Glow.drawGlow(k, s.x, s.y, s.r, s.color, fade * flicker)
    Glow.drawGlow(k, s.x, s.y, s.r * CORE_GLOW_SCALE, inst.coreRgb, fade)
  })
}
/**
 * Additive draw of the ones flying to the nest or away from it, in front
 * of the nest (so each is seen going into a hole and coming out of one).
 * @param {Object} inst - Fireflies instance
 * @param {number} top - View top world Y
 * @param {number} bottom - View bottom world Y
 */
export function onDrawNest(inst, top, bottom) {
  const t = inst.k.time()
  inst.ambient.forEach(f => (f.state === STATE.HOMING || f.state === STATE.LEAVING) && drawAmbient(inst, f, t, top, bottom, 1))
}
//
// An ambient firefly: its glow and its bright core drifting round in it.
//
function drawAmbient(inst, f, t, top, bottom) {
  if (f.y < top - CULL_PAD || f.y > bottom + CULL_PAD) return
  const k = inst.k
  const flicker = flickerAt(t, f) * f.fade * f.vis
  const a = f.orbit + t * f.spin
  const r = AMBIENT_GLOW_R * CORE_ORBIT * (1 + CORE_ORBIT_BREATHE * Math.sin(t * CORE_BREATHE_HZ * FULL_TURN + f.phase))
  Glow.drawGlow(k, f.x, f.y, AMBIENT_GLOW_R, inst.glowRgb, AMBIENT_OPACITY * flicker)
  Glow.drawGlow(k, f.x + Math.cos(a) * r, f.y + Math.sin(a) * r, AMBIENT_CORE_R / CORE_GLOW_SCALE, inst.coreRgb, flicker)
}
//
// One at the nest: flying to its hole (dimming as it gets there), inside
// till its stay is over, then out of a hole and away until it is free.
//
function stepNest(inst, f, dt) {
  if (f.state === STATE.INSIDE) {
    f.stay -= dt
    f.stay <= 0 && comeOut(inst, f)
    return
  }
  if (f.state === STATE.LEAVING) {
    f.fade = Math.min(1, f.fade + dt / LEAVE_FADE)
    f.leaveT -= dt
    f.leaveT <= 0 && (f.state = STATE.FREE)
    fly(f, NEST_SPEED, dt)
    return
  }
  f.fade = Math.min(1, f.fade + dt / RELIGHT_FADE)
  const dx = f.hole.x - f.x
  const dy = f.hole.y - f.y
  const d = Math.hypot(dx, dy)
  if (d <= ENTER_R) {
    goInside(f, STAY + Math.random() * STAY_RANGE)
    return
  }
  f.vis = Math.min(1, d / ENTER_FADE_R)
  const want = Math.atan2(dy, dx)
  const turn = Math.atan2(Math.sin(want - f.heading), Math.cos(want - f.heading))
  f.heading = d < ARRIVE_R ? want : f.heading + Math.max(-NEST_TURN * dt, Math.min(NEST_TURN * dt, turn))
  const speed = d < ARRIVE_R ? ARRIVE_SPEED + (NEST_SPEED - ARRIVE_SPEED) * d / ARRIVE_R : NEST_SPEED
  fly(f, Math.min(speed, d / Math.max(dt, Number.EPSILON)), dt)
}
function fly(f, speed, dt) {
  f.x += Math.cos(f.heading) * speed * dt
  f.y += Math.sin(f.heading) * speed * dt
}
function goInside(f, stay) {
  f.state = STATE.INSIDE
  f.stay = stay
  f.vx = 0
  f.vy = 0
}
//
// Out of a hole, headed away from the nest's middle (and a little up),
// lighting up.
//
function comeOut(inst, f) {
  const hole = inst.nest.holes[Math.floor(Math.random() * inst.nest.holes.length)]
  f.x = hole.x
  f.y = hole.y
  f.heading = Math.atan2(hole.y - inst.nest.y, hole.x - inst.nest.x) + (Math.random() * 2 - 1) * LEAVE_SPREAD
  f.heading -= Math.cos(f.heading) > 0 ? LEAVE_UP : -LEAVE_UP
  f.fade = 0
  f.vis = 1
  f.leaveT = LEAVE_TIME
  f.state = STATE.LEAVING
}
//
// Keeps NEST_COUNT at the nest: the free one nearest it (of a few picked)
// heads for a hole.
//
function sendHome(inst) {
  const atNest = inst.ambient.filter(f => f.state !== STATE.FREE).length
  if (atNest >= NEST_COUNT) return
  const free = inst.ambient.filter(f => f.state === STATE.FREE)
  if (!free.length) return
  let best = null
  for (let i = 0; i < PICK_SAMPLES; i++) {
    const f = free[Math.floor(Math.random() * free.length)]
    const d = Math.hypot(f.x - inst.nest.x, f.y - inst.nest.y)
    if (!best || d < best.d) best = { f, d }
  }
  best.f.hole = inst.nest.holes[Math.floor(Math.random() * inst.nest.holes.length)]
  best.f.state = STATE.HOMING
}
//
// The hero's place and speed (read off how far he moved since the last
// frame, eased; none while he is gone).
//
function trackHero(inst, heroPos, dt) {
  const h = inst.hero
  if (!heroPos || dt <= 0) {
    h.known = false
    return
  }
  const vx = h.known ? (heroPos.x - h.x) / dt : 0
  const vy = h.known ? (heroPos.y - h.y) / dt : 0
  const real = Math.hypot(vx, vy) < WAKE_MAX
  const k = Math.min(1, WAKE_EASE * dt)
  h.vx += ((real ? vx : 0) - h.vx) * k
  h.vy += ((real ? vy : 0) - h.vy) * k
  h.x = heroPos.x
  h.y = heroPos.y
  h.known = true
}
//
// Swayed off the moving hero's way: pushed away from him, the harder the
// faster and nearer he is and the more he comes at it.
//
function sway(f, hero, dt) {
  const dx = f.x - hero.x
  const dy = f.y - hero.y
  const d = Math.hypot(dx, dy)
  const speed = Math.hypot(hero.vx, hero.vy)
  if (d >= WAKE_R || d <= 0 || speed <= 0) return
  const toward = Math.max(0, (hero.vx * dx + hero.vy * dy) / (speed * d))
  const acc = WAKE_ACC * speed * (1 - d / WAKE_R) * (WAKE_SIDE + (1 - WAKE_SIDE) * toward) * dt
  f.vx += dx / d * acc
  f.vy += dy / d * acc
}
//
// Near the hero: shoved off him (the nearer the harder), heading away.
//
function shy(f, heroPos, dt) {
  const dx = f.x - heroPos.x
  const dy = f.y - heroPos.y
  const d = Math.hypot(dx, dy)
  if (d >= SHY_R || d <= 0) return
  const acc = SHY_ACC * (1 - d / SHY_R) * dt
  f.vx += dx / d * acc
  f.vy += dy / d * acc
  f.heading = Math.atan2(dy, dx)
}
//
// A spot in a box, in the open air when that is known (the last pick if
// none was open).
//
function openSpot(inst, box) {
  let spot = null
  for (let i = 0; i < OPEN_TRIES; i++) {
    spot = { x: box.x1 + Math.random() * (box.x2 - box.x1), y: box.y1 + Math.random() * (box.y2 - box.y1) }
    if (!inst.isOpen || inst.isOpen(spot.x, spot.y)) return spot
  }
  return spot
}
//
// Brightness 1 → (1 - FLICKER_DEPTH) following a per-light sine.
//
function flickerAt(t, light) {
  const wave = (1 + Math.sin(t * light.flickerSpeed + light.phase)) / 2
  return 1 - FLICKER_DEPTH * wave
}
