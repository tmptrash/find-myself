import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import { CAVE_CFG } from '../cfg.js'
import * as Glow from '../utils/cave-glow.js'
import * as Surface from '../utils/cave-surface.js'
import * as Layout from '../utils/cave-layout.js'
//
// The lantern mushroom's blue fireflies. They live in its holes: when the
// hero lands on its cap they fly out of them one after another — each
// starts as a spark deep in its hole (the hole lighting up round it) and
// comes out of it outward and up, growing to full size — and gather into
// a small swarm over the mushroom.
//
// The swarm keeps together round its middle, but no two of them fly
// alike: each weaves round the middle on its own looping path (sums of
// slow sines, its own sizes and speeds), chases it on its own spring, and
// gets small random shoves now and then. The middle itself drifts a
// little round where the swarm stays.
//
// They are afraid of the hero: once he comes within SCARE_R px of the
// swarm's middle it bolts the way he is moving (his motion, not where he
// stands: a hero running in from the left sends it right, one dropping
// onto it from above sends it down; a hero standing still sends it
// straight away from him), FLEE_DIST px — or as far as there is open air
// that way, turning aside up to FLEE_TURNS where the soil is close. There
// it stays; once the hero has let it be for REST_TIME s it flies home and
// every firefly goes back into a hole of the mushroom, fading into it.
//
const COUNT = 16
const SEED = 6100
//
// Coming out: the next one leaves EMERGE_GAP s after the last (plus up to
// EMERGE_JITTER), out of its hole at EMERGE_SPEED..+RANGE px/s, growing
// over EMERGE_TIME s while its hole glows HOLE_FLASH_R px wide and fades.
// The swarm gathers HOME_ABOVE px over the mushroom's cap.
//
const EMERGE_GAP = 0.07
const EMERGE_JITTER = 0.08
const EMERGE_SPEED = 70
const EMERGE_SPEED_RANGE = 60
const EMERGE_UP = 0.8
const EMERGE_TIME = 0.4
const EMERGE_DRAG = 3
const HOLE_FLASH_R = 9
const HOLE_FLASH_OPACITY = 0.9
const HOME_ABOVE = 50
//
// Keeping together: each one's loop round the middle (SPREAD_X / SPREAD_Y
// px at most, its two pairs of sines at LOOP_W..+RANGE rad/s), its spring
// (stiffness and damping, each with its spread), its shoves (JITTER_ACC
// px/s² every JITTER_EVERY..+RANGE s) and its top speed.
//
const SPREAD_X = 30
const SPREAD_Y = 20
const LOOP_W = 0.6
const LOOP_W_RANGE = 1.3
const SPRING = 12
const SPRING_RANGE = 12
const DAMP = 3
const DAMP_RANGE = 2.5
const JITTER_ACC = 160
const JITTER_EVERY = 0.15
const JITTER_EVERY_RANGE = 0.3
const MAX_SPEED = 420
//
// The middle: drifts WANDER_X / WANDER_Y px round where it stays (at
// WANDER_WX / WANDER_WY rad/s); moves at most HOVER_SPEED px/s while it
// stays, FLEE_SPEED while it bolts, RETURN_SPEED on its way home (slowing
// over the last SLOW_WITHIN px).
//
const WANDER_X = 14
const WANDER_Y = 9
const WANDER_WX = 0.45
const WANDER_WY = 0.7
const HOVER_SPEED = 60
const FLEE_SPEED = 380
const RETURN_SPEED = 90
const SLOW_WITHIN = 40
//
// Fear: not before FEAR_DELAY s after they came out (they are seen coming
// out first); the hero within SCARE_R px of the middle; a hero moving
// slower than HERO_MOVING px/s counts as standing; the flight's length,
// how close to soil it ends (WALL_CLEAR px), the least worth taking
// (FLEE_MIN), the turns tried when the way is shut (degrees), and no new
// scare within SCARE_GAP s of the last. The hero's motion is eased over
// HERO_VEL_EASE per second.
//
const FEAR_DELAY = 1.2
const SCARE_R = 80
const HERO_MOVING = 80
const FLEE_DIST = 170
const WALL_CLEAR = 36
const FLEE_MIN = 70
const FLEE_TURNS = [0, 40, -40, 80, -80, 120, -120, 180]
const SCARE_GAP = 0.5
const HERO_VEL_EASE = 10
const WORLD_MARGIN = 40
//
// Home: after REST_TIME s left alone; the swarm counts as home within
// HOME_ARRIVE px, and a firefly enters its hole within ENTER_R px of it,
// fading out over VANISH_TIME s (pulled in on a stiffer spring).
//
const REST_TIME = 10
const HOME_ARRIVE = 24
const ENTER_R = 5
const VANISH_TIME = 0.3
const HOME_SPRING = 30
const HOME_DAMP = 7
//
// Look: glow and core radius (px, times each one's size SIZE..+RANGE),
// glow opacity and its flicker (speed, depth).
//
const GLOW_R = 9
const CORE_R = 1.7
const GLOW_OPACITY = 0.8
const SIZE = 0.75
const SIZE_RANGE = 0.5
const FLICKER_W = 3
const FLICKER_W_RANGE = 4
const FLICKER_DEPTH = 0.45
const CORE_GLOW_SCALE = 0.35
const HALF = 0.5
const FULL_TURN = Math.PI * 2
const DEG = 180 / Math.PI
const STATE = { IDLE: 'idle', OUT: 'out', RETURN: 'return', ENTER: 'enter' }
const PHASE = { WAIT: 'wait', EMERGE: 'emerge', FLY: 'fly', HOME: 'home', GONE: 'gone' }

/**
 * Creates the (empty) swarm of the lantern mushroom.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @returns {Object} Swarm instance
 */
export function create(cfg) {
  const { k } = cfg
  Glow.create(k)
  return {
    k,
    rng: createSeededRandom(SEED),
    state: STATE.IDLE,
    flies: [],
    nest: null,
    home: { x: 0, y: 0 },
    center: { x: 0, y: 0 },
    anchor: { x: 0, y: 0 },
    t: 0,
    calm: 0,
    fearIn: 0,
    scareIn: 0,
    fleeing: false,
    heroLast: null,
    heroVel: { x: 0, y: 0 },
    glowRgb: getRGB(k, CAVE_CFG.colors.swarm),
    coreRgb: getRGB(k, CAVE_CFG.colors.swarmCore)
  }
}

/**
 * The hero landed on the mushroom: its fireflies come out of its holes
 * (unless they are out already).
 * @param {Object} inst - Swarm instance
 * @param {{holes: Array<{x: number, y: number}>, x: number, top: number}} nest - The mushroom's holes (Lantern.holes)
 */
export function release(inst, nest) {
  if (inst.state !== STATE.IDLE) return
  const rng = inst.rng
  inst.nest = nest
  inst.home.x = nest.x
  inst.home.y = nest.top - HOME_ABOVE
  inst.center.x = nest.x
  inst.center.y = nest.top
  inst.anchor.x = inst.home.x
  inst.anchor.y = inst.home.y
  inst.state = STATE.OUT
  inst.calm = REST_TIME
  inst.fearIn = FEAR_DELAY
  inst.fleeing = false
  inst.flies = Array.from({ length: COUNT }, (_, i) => newFly(rng, i, nest))
}

/**
 * Runs the swarm on: its flies coming out, keeping together, bolting from
 * the hero, going home.
 * @param {Object} inst - Swarm instance
 * @param {{x: number, y: number}|null} heroPos - The hero's centre (null: none)
 */
export function onUpdate(inst, heroPos) {
  if (inst.state === STATE.IDLE) return
  const dt = inst.k.dt()
  inst.t += dt
  trackHero(inst, heroPos, dt)
  inst.fearIn -= dt
  inst.scareIn -= dt
  heroPos && inst.fearIn <= 0 && inst.scareIn <= 0 && near(inst.center, heroPos, SCARE_R) && scare(inst, heroPos)
  updateState(inst, dt)
  moveCenter(inst, dt)
  inst.flies.forEach(fly => updateFly(inst, fly, dt))
  inst.flies.every(fly => fly.phase === PHASE.GONE) && (inst.state = STATE.IDLE)
}

/**
 * Draws the fireflies (and the glow of a hole one comes out of) in the
 * additive lights pass.
 * @param {Object} inst - Swarm instance
 */
export function onDraw(inst) {
  if (inst.state === STATE.IDLE) return
  inst.flies.forEach(fly => drawFly(inst, fly))
}
//
// One firefly waiting in its hole, with its own loop, spring, flicker and
// size.
//
function newFly(rng, i, nest) {
  const hole = nest.holes[Math.floor(rng() * nest.holes.length)]
  const side = hole.x - nest.x
  const out = unit(side / Math.max(1, Math.abs(side)), -EMERGE_UP)
  const loop = () => LOOP_W + rng() * LOOP_W_RANGE
  return {
    phase: PHASE.WAIT,
    delay: i * EMERGE_GAP + rng() * EMERGE_JITTER,
    hole,
    out,
    x: hole.x,
    y: hole.y,
    vx: 0,
    vy: 0,
    age: 0,
    show: 0,
    ax: SPREAD_X * (HALF + rng() * HALF),
    bx: SPREAD_X * rng() * HALF,
    ay: SPREAD_Y * (HALF + rng() * HALF),
    by: SPREAD_Y * rng() * HALF,
    w: [loop(), loop(), loop(), loop()],
    p: [rng() * FULL_TURN, rng() * FULL_TURN, rng() * FULL_TURN, rng() * FULL_TURN],
    spring: SPRING + rng() * SPRING_RANGE,
    damp: DAMP + rng() * DAMP_RANGE,
    jx: 0,
    jy: 0,
    jitterIn: 0,
    emergeSpeed: EMERGE_SPEED + rng() * EMERGE_SPEED_RANGE,
    size: SIZE + rng() * SIZE_RANGE,
    flickerW: FLICKER_W + rng() * FLICKER_W_RANGE,
    flickerP: rng() * FULL_TURN,
    rng
  }
}
//
// The hero's motion, eased over a few frames.
//
function trackHero(inst, heroPos, dt) {
  if (!heroPos || dt <= 0) {
    inst.heroLast = null
    return
  }
  const last = inst.heroLast
  inst.heroLast = { x: heroPos.x, y: heroPos.y }
  if (!last) return
  const ease = Math.min(1, dt * HERO_VEL_EASE)
  inst.heroVel.x += ((heroPos.x - last.x) / dt - inst.heroVel.x) * ease
  inst.heroVel.y += ((heroPos.y - last.y) / dt - inst.heroVel.y) * ease
}
//
// The hero came close: the swarm bolts the way he moves (or from him), as
// far as the air is open that way or the nearest open way round it.
//
function scare(inst, heroPos) {
  const v = inst.heroVel
  const moving = Math.hypot(v.x, v.y) > HERO_MOVING
  const away = moving ? unit(v.x, v.y) : unit(inst.center.x - heroPos.x, inst.center.y - heroPos.y)
  let best = null
  for (const turn of FLEE_TURNS) {
    const dir = turned(away, turn / DEG)
    const room = openRoom(inst.center, dir)
    if (!best || room > best.room) best = { dir, room }
    if (room >= FLEE_MIN) break
  }
  inst.anchor.x = inst.center.x + best.dir.x * best.room
  inst.anchor.y = inst.center.y + best.dir.y * best.room
  inst.state = STATE.OUT
  inst.calm = REST_TIME
  inst.fleeing = true
  inst.scareIn = SCARE_GAP
  inst.flies.forEach(fly => fly.phase === PHASE.HOME && (fly.phase = PHASE.FLY))
}
//
// How far the swarm can fly from p along dir: up to FLEE_DIST, short of
// the soil by WALL_CLEAR and inside the world.
//
function openRoom(p, dir) {
  const hit = Surface.raycast(p.x, p.y, dir.x, dir.y, FLEE_DIST + WALL_CLEAR)
  let room = hit ? Math.max(0, hit.dist - WALL_CLEAR) : FLEE_DIST
  const x = p.x + dir.x * room
  const y = p.y + dir.y * room
  const inside = x > WORLD_MARGIN && x < Layout.WORLD_W - WORLD_MARGIN && y > WORLD_MARGIN && y < Layout.WORLD_H - WORLD_MARGIN
  inside || (room = 0)
  return room
}
//
// Left alone long enough it heads home; at home its fireflies go in.
//
function updateState(inst, dt) {
  if (inst.state === STATE.OUT) {
    inst.calm -= dt
    if (inst.calm > 0) return
    inst.state = STATE.RETURN
    inst.fleeing = false
    inst.anchor.x = inst.home.x
    inst.anchor.y = inst.home.y
    return
  }
  if (inst.state !== STATE.RETURN || !near(inst.center, inst.home, HOME_ARRIVE)) return
  inst.state = STATE.ENTER
  inst.flies.forEach(fly => fly.phase === PHASE.FLY && (fly.phase = PHASE.HOME))
}
//
// The middle moves toward where the swarm is to be (drifting round it),
// fast while it bolts, slowing as it gets there.
//
function moveCenter(inst, dt) {
  const settled = inst.state === STATE.OUT && !inst.fleeing
  const tx = inst.anchor.x + (settled ? Math.sin(inst.t * WANDER_WX) * WANDER_X : 0)
  const ty = inst.anchor.y + (settled ? Math.sin(inst.t * WANDER_WY + 1) * WANDER_Y : 0)
  const dx = tx - inst.center.x
  const dy = ty - inst.center.y
  const dist = Math.hypot(dx, dy)
  if (dist < 1) {
    inst.fleeing = false
    return
  }
  const top = inst.fleeing ? FLEE_SPEED : inst.state === STATE.OUT ? HOVER_SPEED : RETURN_SPEED
  const speed = top * Math.min(1, dist / SLOW_WITHIN)
  const step = Math.min(dist, speed * dt)
  inst.center.x += dx / dist * step
  inst.center.y += dy / dist * step
  inst.fleeing && dist < SLOW_WITHIN * HALF && (inst.fleeing = false)
}
//
// One firefly: waiting in its hole, coming out of it, flying with the
// swarm, or going back in.
//
function updateFly(inst, fly, dt) {
  if (fly.phase === PHASE.GONE) return
  if (fly.phase === PHASE.WAIT) {
    fly.delay -= dt
    if (fly.delay > 0) return
    fly.phase = PHASE.EMERGE
    fly.vx = fly.out.x * fly.emergeSpeed
    fly.vy = fly.out.y * fly.emergeSpeed
    return
  }
  fly.age += dt
  if (fly.phase === PHASE.EMERGE) {
    fly.show = Math.min(1, fly.age / EMERGE_TIME)
    const drag = Math.exp(-EMERGE_DRAG * dt)
    fly.vx *= drag
    fly.vy *= drag
    steer(inst, fly, dt, fly.show)
    fly.age >= EMERGE_TIME && (fly.phase = PHASE.FLY)
    return
  }
  if (fly.phase === PHASE.FLY) {
    steer(inst, fly, dt, 1)
    return
  }
  homeIn(fly, dt)
}
//
// Toward its point on its loop round the middle, on its own spring, with
// its shoves; `pull` eases the spring in as it comes out of its hole.
//
function steer(inst, fly, dt, pull) {
  const t = inst.t
  const tx = inst.center.x + fly.ax * Math.sin(fly.w[0] * t + fly.p[0]) + fly.bx * Math.sin(fly.w[1] * t + fly.p[1])
  const ty = inst.center.y + fly.ay * Math.cos(fly.w[2] * t + fly.p[2]) + fly.by * Math.sin(fly.w[3] * t + fly.p[3])
  fly.jitterIn -= dt
  if (fly.jitterIn <= 0) {
    const a = fly.rng() * FULL_TURN
    fly.jx = Math.cos(a) * JITTER_ACC
    fly.jy = Math.sin(a) * JITTER_ACC
    fly.jitterIn = JITTER_EVERY + fly.rng() * JITTER_EVERY_RANGE
  }
  fly.vx += (((tx - fly.x) * fly.spring - fly.vx * fly.damp) * pull + fly.jx) * dt
  fly.vy += (((ty - fly.y) * fly.spring - fly.vy * fly.damp) * pull + fly.jy) * dt
  move(fly, dt)
}
//
// Back into its hole on a stiff spring, fading out once it is in.
//
function homeIn(fly, dt) {
  fly.vx += ((fly.hole.x - fly.x) * HOME_SPRING - fly.vx * HOME_DAMP) * dt
  fly.vy += ((fly.hole.y - fly.y) * HOME_SPRING - fly.vy * HOME_DAMP) * dt
  move(fly, dt)
  if (!near(fly, fly.hole, ENTER_R) && fly.show >= 1) return
  fly.show = Math.max(0, fly.show - dt / VANISH_TIME)
  fly.show <= 0 && (fly.phase = PHASE.GONE)
}
function move(fly, dt) {
  const speed = Math.hypot(fly.vx, fly.vy)
  if (speed > MAX_SPEED) {
    fly.vx *= MAX_SPEED / speed
    fly.vy *= MAX_SPEED / speed
  }
  fly.x += fly.vx * dt
  fly.y += fly.vy * dt
}
//
// A firefly's glow and core (flickering), and while it comes out the glow
// of its hole.
//
function drawFly(inst, fly) {
  if (fly.phase === PHASE.WAIT || fly.phase === PHASE.GONE) return
  const k = inst.k
  if (fly.phase === PHASE.EMERGE) Glow.drawGlow(k, fly.hole.x, fly.hole.y, HOLE_FLASH_R, inst.glowRgb, HOLE_FLASH_OPACITY * (1 - fly.show))
  const flicker = 1 - FLICKER_DEPTH * (HALF + HALF * Math.sin(inst.t * fly.flickerW + fly.flickerP))
  const r = GLOW_R * fly.size * (HALF + HALF * fly.show)
  Glow.drawGlow(k, fly.x, fly.y, r, inst.glowRgb, GLOW_OPACITY * fly.show * flicker)
  Glow.drawGlow(k, fly.x, fly.y, Math.max(CORE_R, r * CORE_GLOW_SCALE), inst.coreRgb, fly.show)
}
function near(a, b, r) {
  const dx = a.x - b.x
  const dy = a.y - b.y
  return dx * dx + dy * dy < r * r
}
function unit(x, y) {
  const len = Math.hypot(x, y)
  return len > 0 ? { x: x / len, y: y / len } : { x: 0, y: -1 }
}
function turned(v, a) {
  const c = Math.cos(a)
  const s = Math.sin(a)
  return { x: v.x * c - v.y * s, y: v.x * s + v.y * c }
}
