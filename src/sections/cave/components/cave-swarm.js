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
// comes out of it to the right (a little up), growing to full size — and
// gather into a small swarm right of the mushroom, never higher than the
// hero's head: over any ground a firefly at large keeps under HEAD_HEIGHT
// px above it (the ground under the swarm's middle, found by a ray). That
// height only ever rises with the ground: driven off a ledge the swarm
// keeps its height (a push from the side moves it along, never down); only
// a hero dropping onto it sends it down (see SCATTER_*), and once it has
// sunk the height is that of the ground it came down to.
//
// The swarm keeps together round its middle, but no two of them fly
// alike: each weaves round the middle on its own looping path (sums of
// slow sines, its own sizes and speeds), chases it on its own spring, and
// gets small random shoves now and then. The middle itself drifts a
// little round where the swarm stays.
//
// They shy away from a hero moving at them: while he is within SCARE_R px
// of the swarm's middle and closing in, the middle keeps drifting on away
// from him (along his way and off him, as far as there is open air that
// way, turning aside up to FLEE_TURNS where the soil is close), never
// faster than it must to keep ahead of him; and each firefly near him
// swerves off him on its own, so the swarm parts round him in no order. A
// hero standing still they let be (they may fly through him) — but for
// one driving them (from the giant's nose), who moves them on even when
// he stands. A hero jumping onto it — in the air over its middle and no
// longer rising, however fast he runs — does not send it diving: it
// scatters and sinks slowly to the lake's left edge (see SCATTER_*).
// There it stays; once the hero has let it be for REST_TIME s (counted
// from when it has come down) it flies home and every firefly goes back
// into a hole of the mushroom, fading into it.
//
const COUNT = 16
const SEED = 6100
//
// Coming out: the next one leaves EMERGE_GAP s after the last (plus up to
// EMERGE_JITTER), out of its hole at EMERGE_SPEED..+RANGE px/s, growing
// over EMERGE_TIME s while its hole glows HOLE_FLASH_R px wide and fades;
// it leaves rightward, EMERGE_UP up for every px right, turned by up to
// EMERGE_SPREAD rad. The swarm gathers HOME_ASIDE px right of the mushroom
// (toward the open ledge and the lake), its loops reaching up to the
// head's height over the mushroom's foot. The ground under the swarm is
// looked for GROUND_LOOK px down.
//
const EMERGE_GAP = 0.07
const EMERGE_JITTER = 0.08
const EMERGE_SPEED = 70
const EMERGE_SPEED_RANGE = 60
const EMERGE_UP = 0.35
const EMERGE_SPREAD = 0.35
const EMERGE_TIME = 0.4
const EMERGE_DRAG = 3
const HOLE_FLASH_R = 9
const HOLE_FLASH_OPACITY = 0.9
const HOME_ASIDE = 70
const HEAD_HEIGHT = 62
const GROUND_LOOK = 900
//
// Keeping together: each one's loop round the middle (SPREAD_X / SPREAD_Y
// px at most, its two pairs of sines at LOOP_W..+RANGE rad/s; squeezed,
// never cut off, where the head's height or the water leaves less room
// over or under the middle, so they never line up along that edge), its
// spring (stiffness and damping, each with its spread), its shoves
// (JITTER_ACC px/s² every JITTER_EVERY..+RANGE s) and its top speed. One
// that strays over the head's height or down to the water is eased back
// (EDGE_RATE per s of how far it is out), never set back at once.
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
const EDGE_RATE = 4
//
// A firefly a fish snaps at dodges it: shoved DODGE_SPEED..+RANGE px/s up
// and aside (up to DODGE_SPREAD rad off straight up), then back to the
// swarm on its spring — never gone.
//
const DODGE_SPEED = 160
const DODGE_SPEED_RANGE = 80
const DODGE_SPREAD = 0.9
//
// The middle: drifts WANDER_X / WANDER_Y px round where it stays (at
// WANDER_WX / WANDER_WY rad/s); moves at most HOVER_SPEED px/s while it
// stays, while it shies away AVOID_PACE times the hero's closing speed
// (at least HOVER_SPEED, at most FLEE_SPEED), RETURN_SPEED on its way home
// (slowing over the last SLOW_WITHIN px), its speed changing by no more
// than CENTER_ACCEL px/s² (so it never starts or stops at once).
//
const WANDER_X = 14
const WANDER_Y = 9
const WANDER_WX = 0.45
const WANDER_WY = 0.7
const HOVER_SPEED = 60
const FLEE_SPEED = 300
const AVOID_PACE = 1.2
const CENTER_ACCEL = 700
const RETURN_SPEED = 90
const SLOW_WITHIN = 40
//
// Fear: not before FEAR_DELAY s after they came out (they are seen coming
// out first); the hero within SCARE_R px of the middle; a hero moving
// slower than HERO_MOVING px/s counts as standing; how far ahead the
// middle aims as it shies away (FLEE_DIST), how close to soil (WALL_CLEAR
// px), the least worth taking (FLEE_MIN), the turns tried when the way is
// shut (degrees); its way is looked for anew every AVOID_GAP s. A firefly
// within FLY_AVOID_R px of a hero moving at it swerves off him at up to
// FLY_AVOID_ACC px/s² (more the nearer). The hero's motion is eased over
// HERO_VEL_EASE per second; a jump of more than HERO_JUMP_PX in a frame
// (he came back to life elsewhere) is no motion.
//
const FEAR_DELAY = 1.2
const SCARE_R = 130
const HERO_MOVING = 80
const FLEE_DIST = 140
const WALL_CLEAR = 36
const FLEE_MIN = 50
const FLEE_TURNS = [0, 40, -40, 80, -80, 120, -120, 180]
const AVOID_GAP = 0.1
const FLY_AVOID_R = 55
const FLY_AVOID_ACC = 1100
const HERO_VEL_EASE = 10
const HERO_JUMP_PX = 100
const WORLD_MARGIN = 40
//
// The water's level is a floor for all of it: no firefly at large comes
// within WATER_CLEAR px of the lake's surface height (turned back up
// there), and the middle stays SPREAD_Y px higher still — over the lake,
// where the ground under the swarm lies deep under the water, as anywhere.
//
const WATER_CLEAR = 10
const WATER_FLOOR = Layout.LAKE_SURFACE_Y - WATER_CLEAR
const CENTER_FLOOR = WATER_FLOOR - SPREAD_Y
//
// Jumped on (the hero in the air within JUMP_R px of its middle and
// JUMP_ABOVE px or more over it —
// not a hop off a bump of the ground beside it — and rising no faster than
// HERO_MOVING px/s — at the top of his jump or coming down, run as fast as
// he may; a running jump reaches it still flying more sideways than down):
// its fireflies scatter —
// each shoved SCATTER_SPEED..+RANGE px/s its own way, left or right, from
// SCATTER_UP rad above level to SCATTER_DOWN below it (nearly level: no
// higher than the hero's head, not into the ground) — and for SCATTER_TIME s hardly keep together
// (SCATTER_PULL of their pull), gathering again over REGROUP_TIME s, while
// the swarm sinks at SINK_SPEED px/s to rest LAKE_EDGE_OUT px past the
// lake's left edge, low over the water (where the lake's fish come for
// it): along at its height to the open shaft LAKE_SHAFT_IN px short of
// the lake's left edge, down it, then along over the water (the ledge
// over the lake's edge shuts the straight way). Its way home goes back up
// the same shaft. It does not shy away while it sinks.
//
const LAKE_SHAFT_IN = 60
const JUMP_R = 80
const JUMP_ABOVE = 20
const SCATTER_SPEED = 140
const SCATTER_SPEED_RANGE = 120
const SCATTER_UP = 0.15
const SCATTER_DOWN = 0.12
const SCATTER_TIME = 0.6
const SCATTER_PULL = 0.08
const REGROUP_TIME = 0.9
const SINK_SPEED = 110
const LAKE_EDGE_OUT = 70
const SHAFT_X = Layout.LAKE_X1 - LAKE_SHAFT_IN
const ARRIVE_PX = 2
//
// Home: after REST_TIME s left alone; the swarm counts as home within
// HOME_ARRIVE px. Then each firefly goes in at its own moment (up to
// HOME_STAGGER s after the swarm arrives, flying with it till then) and
// its own pace — pulled to its hole on its own spring (HOME_SPRING times
// HOME_PACE..+RANGE, damped HOME_DAMP times HOME_DAMP_MIN..+RANGE) — and,
// within ENTER_R px of it, fades into it over VANISH_TIME..+RANGE s.
//
const REST_TIME = 10
const HOME_ARRIVE = 24
const ENTER_R = 5
const HOME_STAGGER = 3
const VANISH_TIME = 0.2
const VANISH_TIME_RANGE = 0.4
const HOME_SPRING = 30
const HOME_PACE = 0.3
const HOME_PACE_RANGE = 0.9
const HOME_DAMP = 7
const HOME_DAMP_MIN = 0.6
const HOME_DAMP_RANGE = 0.6
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
    centerV: { x: 0, y: 0 },
    anchor: { x: 0, y: 0 },
    t: 0,
    ceilY: -Infinity,
    calm: 0,
    fearIn: 0,
    avoidIn: 0,
    fleeing: false,
    fleeSpeed: HOVER_SPEED,
    hero: null,
    driven: false,
    sinking: false,
    path: [],
    scatterT: null,
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
 * @param {{holes: Array<{x: number, y: number}>, x: number, top: number, foot: number}} nest - The mushroom's holes (Lantern.holes)
 */
export function release(inst, nest) {
  if (inst.state !== STATE.IDLE) return
  const rng = inst.rng
  inst.nest = nest
  inst.home.x = nest.x + HOME_ASIDE
  inst.home.y = nest.foot - HEAD_HEIGHT + SPREAD_Y
  inst.center.x = nest.x
  inst.center.y = nest.top
  inst.anchor.x = inst.home.x
  inst.anchor.y = inst.home.y
  inst.state = STATE.OUT
  inst.calm = REST_TIME
  inst.fearIn = FEAR_DELAY
  inst.fleeing = false
  inst.path = []
  inst.flies = Array.from({ length: COUNT }, (_, i) => newFly(rng, i, nest))
}

/**
 * Runs the swarm on: its flies coming out, keeping together, shying away
 * from the hero, going home.
 * @param {Object} inst - Swarm instance
 * @param {{x: number, y: number}|null} heroPos - The hero's centre (null: none)
 * @param {boolean} [airborne=false] - The hero is in the air (jumping or falling)
 * @param {number} [scareR=SCARE_R] - How near him it shies away (farther when he drives it from the giant's nose)
 * @param {boolean} [driven=false] - He drives it (from the giant's nose): it moves on even while he stands
 */
export function onUpdate(inst, heroPos, airborne = false, scareR = SCARE_R, driven = false) {
  if (inst.state === STATE.IDLE) return
  const dt = inst.k.dt()
  inst.t += dt
  trackHero(inst, heroPos, dt)
  inst.hero = heroPos && inst.fearIn <= 0 && !inst.sinking ? heroPos : null
  inst.driven = driven
  inst.fearIn -= dt
  inst.avoidIn -= dt
  inst.scatterT !== null && (inst.scatterT += dt) >= SCATTER_TIME + REGROUP_TIME && (inst.scatterT = null)
  inst.hero && airborne && jumpedOn(inst, heroPos) && scatterDown(inst)
  inst.hero = inst.sinking ? null : inst.hero
  inst.hero && inst.avoidIn <= 0 && near(inst.center, heroPos, scareR) && shyAway(inst, heroPos)
  updateState(inst, dt)
  updateCeiling(inst)
  moveCenter(inst, dt)
  inst.flies.forEach(fly => updateFly(inst, fly, dt))
  inst.flies.every(fly => fly.phase === PHASE.GONE) && (inst.state = STATE.IDLE)
}

/**
 * Calls fn with every firefly flying at large (out of its hole, not on
 * its way back into it).
 * @param {Object} inst - Swarm instance
 * @param {(fly: {x: number, y: number}) => void} fn - Called per firefly
 */
export function forEachFlying(inst, fn) {
  inst.state === STATE.IDLE || inst.flies.forEach(fly => fly.phase === PHASE.FLY && fn(fly))
}

/**
 * A fish snaps at a firefly: it dodges, shoved up and aside, and flies
 * back to the swarm (it is never gone: the swarm lasts as long as the hero
 * keeps it out over the water).
 * @param {Object} inst - Swarm instance
 * @param {Object} fly - The firefly (from forEachFlying)
 */
export function eat(inst, fly) {
  const a = -Math.PI / 2 + (inst.rng() * 2 - 1) * DODGE_SPREAD
  const speed = DODGE_SPEED + inst.rng() * DODGE_SPEED_RANGE
  fly.vx += Math.cos(a) * speed
  fly.vy += Math.sin(a) * speed
}

/**
 * The swarm's middle while it is out (null while its fireflies are home).
 * @param {Object} inst - Swarm instance
 * @returns {{x: number, y: number}|null}
 */
export function center(inst) {
  return inst.state === STATE.IDLE ? null : inst.center
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
  const out = turned(unit(1, -EMERGE_UP), (rng() * 2 - 1) * EMERGE_SPREAD)
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
  if (!last || !near(last, heroPos, HERO_JUMP_PX)) return
  const ease = Math.min(1, dt * HERO_VEL_EASE)
  inst.heroVel.x += ((heroPos.x - last.x) / dt - inst.heroVel.x) * ease
  inst.heroVel.y += ((heroPos.y - last.y) / dt - inst.heroVel.y) * ease
}
//
// The hero dropping onto it: in the air close over its middle, no longer
// rising.
//
function jumpedOn(inst, heroPos) {
  return near(inst.center, heroPos, JUMP_R) && heroPos.y < inst.center.y - JUMP_ABOVE && inst.heroVel.y > -HERO_MOVING
}
//
// The hero close and closing in (or driving it): the middle aims on away
// from him — along his way and off him — as far as the air is open that
// way or the nearest open way round it, as fast as it must to keep ahead.
//
function shyAway(inst, heroPos) {
  const v = inst.heroVel
  const off = unit(inst.center.x - heroPos.x, inst.center.y - heroPos.y)
  const closing = v.x * off.x + v.y * off.y
  if (closing < HERO_MOVING && !inst.driven) return
  inst.avoidIn = AVOID_GAP
  const away = awayWay(v, off, heroPos.y > inst.center.y)
  let best = null
  for (const turn of FLEE_TURNS) {
    const dir = turned(away, turn / DEG)
    const room = openRoom(inst.center, dir)
    if (!best || room > best.room) best = { dir, room }
    if (room >= FLEE_MIN) break
  }
  inst.anchor.x = inst.center.x + best.dir.x * best.room
  inst.anchor.y = Math.max(inst.center.y + best.dir.y * best.room, inst.ceilY + SPREAD_Y)
  inst.path = []
  inst.state = STATE.OUT
  inst.calm = REST_TIME
  inst.fleeing = true
  inst.fleeSpeed = Math.min(FLEE_SPEED, Math.max(HOVER_SPEED, closing * AVOID_PACE))
  inst.flies.forEach(fly => fly.phase === PHASE.HOME && (fly.phase = PHASE.FLY))
}
//
// Dropped on from above: its fireflies scatter every way, and the swarm
// sinks to the lake's left edge (round the soil where it must).
//
function scatterDown(inst) {
  const rng = inst.rng
  const ground = headCeiling({ x: SHAFT_X, y: inst.center.y })
  const target = { x: Layout.LAKE_X1 + LAKE_EDGE_OUT, y: Math.min(CENTER_FLOOR, ground === -Infinity ? inst.center.y : ground + SPREAD_Y) }
  inst.path = routeTo(inst.center, target)
  inst.anchor.x = target.x
  inst.anchor.y = target.y
  inst.state = STATE.OUT
  inst.calm = REST_TIME
  inst.fleeing = false
  inst.sinking = true
  inst.scatterT = 0
  inst.flies.forEach(fly => {
    if (fly.phase !== PHASE.FLY && fly.phase !== PHASE.HOME) return
    fly.phase = PHASE.FLY
    const a = -SCATTER_UP + rng() * (SCATTER_UP + SCATTER_DOWN)
    const side = rng() < HALF ? -1 : 1
    const speed = SCATTER_SPEED + rng() * SCATTER_SPEED_RANGE
    fly.vx = Math.cos(a) * side * speed
    fly.vy = Math.sin(a) * speed
  })
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
    inst.calm -= inst.sinking ? 0 : dt
    if (inst.calm > 0) return
    inst.state = STATE.RETURN
    inst.fleeing = false
    inst.anchor.x = inst.home.x
    inst.anchor.y = inst.home.y
    inst.path = routeTo(inst.center, inst.home)
    return
  }
  if (inst.state !== STATE.RETURN || !near(inst.center, inst.home, HOME_ARRIVE)) return
  inst.state = STATE.ENTER
  const rng = inst.rng
  inst.flies.forEach(fly => {
    fly.homeIn = rng() * HOME_STAGGER
    fly.homeSpring = HOME_SPRING * (HOME_PACE + rng() * HOME_PACE_RANGE)
    fly.homeDamp = HOME_DAMP * (HOME_DAMP_MIN + rng() * HOME_DAMP_RANGE)
    fly.vanishTime = VANISH_TIME + rng() * VANISH_TIME_RANGE
  })
}
//
// The middle moves toward where the swarm is to be (drifting round it),
// fast while it bolts, slowing as it gets there.
//
function moveCenter(inst, dt) {
  if (inst.path.length || inst.sinking) {
    followPath(inst, dt, inst.sinking ? SINK_SPEED : RETURN_SPEED)
    inst.centerV.x = 0
    inst.centerV.y = 0
    return
  }
  const settled = inst.state === STATE.OUT && !inst.fleeing
  const tx = inst.anchor.x + (settled ? Math.sin(inst.t * WANDER_WX) * WANDER_X : 0)
  const ty = Math.min(CENTER_FLOOR, Math.max(inst.ceilY + SPREAD_Y, inst.anchor.y + (settled ? Math.sin(inst.t * WANDER_WY + 1) * WANDER_Y : 0)))
  const dx = tx - inst.center.x
  const dy = ty - inst.center.y
  const dist = Math.hypot(dx, dy)
  if (dist < 1 && Math.hypot(inst.centerV.x, inst.centerV.y) < 1) {
    inst.fleeing = false
    inst.centerV.x = 0
    inst.centerV.y = 0
    return
  }
  const top = inst.fleeing ? inst.fleeSpeed : inst.state === STATE.OUT ? HOVER_SPEED : RETURN_SPEED
  const want = top * Math.min(1, dist / SLOW_WITHIN)
  const along = dist > 0 ? want / dist : 0
  const wx = dx * along - inst.centerV.x
  const wy = dy * along - inst.centerV.y
  const dv = Math.hypot(wx, wy)
  const k = dv > 0 ? Math.min(1, CENTER_ACCEL * dt / dv) : 0
  inst.centerV.x += wx * k
  inst.centerV.y += wy * k
  inst.center.x += inst.centerV.x * dt
  inst.center.y += inst.centerV.y * dt
  inst.fleeing && dist < SLOW_WITHIN * HALF && (inst.fleeing = false)
}
//
// The middle along its way, point by point, at `speed` (sinking to the
// lake's edge, or going home).
//
function followPath(inst, dt, speed) {
  const to = inst.path[0]
  if (!to) {
    inst.sinking = false
    return
  }
  const dx = to.x - inst.center.x
  const dy = to.y - inst.center.y
  const dist = Math.hypot(dx, dy)
  if (dist < ARRIVE_PX) {
    inst.path.shift()
    return
  }
  const step = Math.min(dist, speed * dt)
  inst.center.x += dx / dist * step
  inst.center.y += dy / dist * step
}
//
// A way from one point to another through open air: straight, or round the
// soil in two legs — up or down first, then along, or along first — or in
// three by the open shaft left of the lake (along, down or up it, along);
// the first that is clear (straight if none is).
//
function routeTo(from, to) {
  const end = { x: to.x, y: to.y }
  if (isClear(from, to)) return [end]
  const ways = [{ x: from.x, y: to.y }, { x: to.x, y: from.y }]
  const bend = ways.find(p => isClear(from, p) && isClear(p, to))
  if (bend) return [bend, end]
  const top = { x: SHAFT_X, y: from.y }
  const foot = { x: SHAFT_X, y: to.y }
  return isClear(from, top) && isClear(top, foot) && isClear(foot, to) ? [top, foot, end] : [end]
}
function isClear(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const dist = Math.hypot(dx, dy)
  return dist < 1 || !Surface.raycast(a.x, a.y, dx / dist, dy / dist, dist)
}
//
// How hard the fireflies keep together: hardly at all right after a
// scatter, gathering again over REGROUP_TIME.
//
function cohesion(inst) {
  const s = inst.scatterT
  if (s === null) return 1
  if (s < SCATTER_TIME) return SCATTER_PULL
  return Math.min(1, SCATTER_PULL + (s - SCATTER_TIME) / REGROUP_TIME * (1 - SCATTER_PULL))
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
    keepOverWater(fly)
    fly.age >= EMERGE_TIME && (fly.phase = PHASE.FLY)
    return
  }
  if (fly.phase === PHASE.FLY) {
    swerve(inst, fly, dt)
    steer(inst, fly, dt, cohesion(inst))
    keepUnderHead(inst, fly)
    keepOverWater(fly)
    inst.state === STATE.ENTER && (fly.homeIn -= dt) <= 0 && (fly.phase = PHASE.HOME)
    return
  }
  homeIn(fly, dt)
}
//
// Off a hero moving at it (or driving the swarm), the nearer the harder;
// a hero standing still it lets be.
//
function swerve(inst, fly, dt) {
  const hero = inst.hero
  if (!hero) return
  const dx = fly.x - hero.x
  const dy = fly.y - hero.y
  const d = Math.hypot(dx, dy)
  if (d >= FLY_AVOID_R || d <= 0) return
  const v = inst.heroVel
  const toward = (dx * v.x + dy * v.y) / d
  if (toward < HERO_MOVING && !inst.driven) return
  const acc = FLY_AVOID_ACC * (1 - d / FLY_AVOID_R)
  fly.vx += dx / d * acc * dt
  fly.vy += dy / d * acc * dt
}
//
// Toward its point on its loop round the middle, on its own spring, with
// its shoves; `pull` eases the spring in as it comes out of its hole.
//
function steer(inst, fly, dt, pull) {
  const t = inst.t
  const tx = inst.center.x + fly.ax * Math.sin(fly.w[0] * t + fly.p[0]) + fly.bx * Math.sin(fly.w[1] * t + fly.p[1])
  const ty = inst.center.y + squeezed(inst, fly.ay * Math.cos(fly.w[2] * t + fly.p[2]) + fly.by * Math.sin(fly.w[3] * t + fly.p[3]))
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
// The head's height the swarm keeps under: over the ground under its
// middle while it is out (not while it sinks or goes home); it rises with
// higher ground and never lowers on its own.
//
function updateCeiling(inst) {
  const want = inst.state === STATE.OUT && !inst.sinking ? headCeiling(inst.center) : -Infinity
  if (want === -Infinity || inst.ceilY === -Infinity || want < inst.ceilY) inst.ceilY = want
}
//
// A loop's height off the middle squeezed into the room there is: over it
// up to the head's height, under it down to the water.
//
function squeezed(inst, oy) {
  const room = oy < 0 ? inst.center.y - inst.ceilY : WATER_FLOOR - inst.center.y
  return oy * Math.min(1, Math.max(0, room) / SPREAD_Y)
}
//
// Which way the swarm shies from a hero: along his way and off him (off
// him alone while he stands: driving it); never down for a hero under it
// (a push from the side moves it along, not down).
//
function awayWay(v, off, below) {
  const speed = Math.hypot(v.x, v.y)
  const way = speed > HERO_MOVING ? unit(v.x / speed + off.x, v.y / speed + off.y) : off
  return below && way.y > 0 ? unit(way.x, 0) : way
}
//
// A firefly at large over the head's height is eased back down.
//
function keepUnderHead(inst, fly) {
  if (fly.y >= inst.ceilY) return
  fly.vy = Math.max(fly.vy, (inst.ceilY - fly.y) * EDGE_RATE)
}
//
// A firefly at large down at the water is eased back up; it never goes
// into it.
//
function keepOverWater(fly) {
  if (fly.y <= WATER_FLOOR) return
  fly.vy = Math.min(fly.vy, (WATER_FLOOR - fly.y) * EDGE_RATE)
  fly.y = Math.min(fly.y, Layout.LAKE_SURFACE_Y)
}
//
// The height of a hero's head over the ground under a point (none where
// no ground lies within GROUND_LOOK px under it); over the lake the water
// is the ground.
//
function headCeiling(p) {
  const hit = Surface.raycast(p.x, p.y, 0, 1, GROUND_LOOK)
  const overLake = p.x > Layout.LAKE_X1 && p.x < Layout.LAKE_X2 && p.y < Layout.LAKE_SURFACE_Y
  const ground = overLake ? Math.min(hit ? hit.y : Infinity, Layout.LAKE_SURFACE_Y) : hit?.y
  return ground === undefined ? -Infinity : ground - HEAD_HEIGHT
}
//
// Back into its hole on a stiff spring, fading out once it is in.
//
function homeIn(fly, dt) {
  fly.vx += ((fly.hole.x - fly.x) * fly.homeSpring - fly.vx * fly.homeDamp) * dt
  fly.vy += ((fly.hole.y - fly.y) * fly.homeSpring - fly.vy * fly.homeDamp) * dt
  move(fly, dt)
  if (!near(fly, fly.hole, ENTER_R) && fly.show >= 1) return
  fly.show = Math.max(0, fly.show - dt / fly.vanishTime)
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
