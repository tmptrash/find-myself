import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as CaveLake from '../utils/cave-lake.js'
import { paintFishAtlas, FISH_ART } from '../utils/cave-fish-paint.js'
//
// The lake's fish (painted in code, cave-fish-paint.js). Each swims on a
// spine of SEGMENTS bones in 3D — x and y as on the screen, z into it —
// solved as a follow-the-leader IK chain: the head is steered, every
// joint behind it is pulled after the one before it at its bone's length,
// and no joint bends more than MAX_BEND, so the body flows along the
// head's path. The head swims as a fish does: it beats side to side (in
// z, toward and away from the eye: from the side that shows as the body
// and the tail fan turning edge-on and back) a little up and down, and
// faster the faster it goes; it turns about through the depth (a fish
// turning round shows its head, not its belly). The body is drawn as
// slices of its picture laid along the projected bones (shortened as
// they turn away), the tail fan on the last bone (narrowing as it turns
// edge-on), side fins flapping on theirs; a fish deeper in z is darker.
//
// It roams the lake under the surface, now and then hanging still on its
// fins. When a firefly (the cave's gold ones or the lantern's blue ones)
// comes down over the water within HUNT_HIGH px of it, the nearest free
// fish swims up under it, just under the surface, and leaps: thrown out
// of the water at it (its rise and run worked out so it meets the
// firefly), its mouth gaping; whatever its mouth reaches it eats. It
// falls back in with a splash (rings and drops; one on leaving the water
// too) and dives. While the lantern's blue swarm hangs low over the water
// the whole school goes into a frenzy: every fish swims to it, they
// gather under it and leap at its fireflies one after another, hardly
// resting between leaps. Something falling into the water near it, or
// the hero in it, sends it fleeing.
//
const SPRITE = 'cave0-fish'
const GRAIN_SEED = 9480
const C = CAVE_CFG.fish
const A = FISH_ART
//
// Size and spine: body length (snout to the tail's root, world px at size
// 1), its bones, how far apart they draw over each other, the most a
// joint bends (rad), how deep the lake is for them in z (px either way).
//
const BODY_LEN = 30
const SEGMENTS = 10
const TEX_PER_PX = A.texL / BODY_LEN
const OVERLAP = 0.7
const MAX_BEND = 0.3
const Z_MAX = 26
//
// Swimming (px/s, rad/s): cruise speed range, hanging still, hunting,
// fleeing; how fast it speeds up or slows; how fast it turns (faster
// hunting or fleeing); the most it climbs or dives while swimming (sine
// of the pitch); the side beat (amplitude rad, beats per s at rest and per
// px/s) and the small up-and-down beat beside it.
//
const CRUISE_SPEED = 26
const CRUISE_SPEED_RANGE = 18
const HOVER_SPEED = 3
const HUNT_SPEED = 120
const FLEE_SPEED = 150
const ACCEL = 140
const TURN_RATE = 2.2
const TURN_RATE_FAST = 5
const MAX_PITCH = 0.55
const BEAT_AMP = 0.38
const BEAT_HZ = 1.2
const BEAT_HZ_PER_SPEED = 0.035
const BEAT_VERT = 0.05
const HOVER_BEAT = 0.25
//
// Roaming: a new spot within ROAM_REACH px (and anywhere in z, ROAM_BED px
// or more over the bed) on getting within ROAM_ARRIVE px or after
// ROAM_TIME..+RANGE s; on arriving it may hang still (HOVER_CHANCE) for
// HOVER_TIME..+RANGE s — in open water only, never resting on the bed.
//
const ROAM_REACH = 260
const ROAM_BED = 30
const ROAM_ARRIVE = 14
const ROAM_TIME = 4
const ROAM_TIME_RANGE = 5
const HOVER_CHANCE = 0.35
const HOVER_TIME = 1.5
const HOVER_TIME_RANGE = 2.5
//
// Water: it keeps TOP_PAD px under the surface (APPROACH_DEPTH while it
// readies a leap), BED_PAD over the lake's bed, and only where the lake is
// MIN_DEPTH px deep or more.
//
const TOP_PAD = 26
const BED_PAD = 14
const MIN_DEPTH = 60
//
// Hunting: a firefly over the water from HUNT_LOW to HUNT_HIGH px over the
// surface, within HUNT_SEE px along the lake; the fish comes up
// LAUNCH_BACK px short of under it, APPROACH_DEPTH px under the surface,
// and leaps from within LAUNCH_X px of that spot (LAUNCH_Z in z). The
// leap: gravity GRAVITY, aimed OVERSHOOT px over the firefly, at most
// LEAP_VX px/s along. It gives up after HUNT_GIVE_UP s or once the
// firefly has been gone LOSE_TIME s; between hunts it rests
// COOLDOWN..+RANGE s. The mouth gapes within GAPE_R px of the prey and
// eats it within CATCH_R px.
//
//
// Feeding frenzy: while the swarm's middle is within FRENZY_REACH px of the
// deep water along the lake and at most FRENZY_HIGH px over the surface,
// every fish darts for it at FRENZY_SPEED, gathering FRENZY_SPREAD px
// either side under it (GATHER_DEPTH px under the leaping depth,
// GATHER_Z px either way in z), resting only FRENZY_COOLDOWN..+RANGE s
// between leaps and diving FRENZY_DIVE s after one. A firefly LEAP_OUT px
// past the deep water is still within a leap; back in the water a fish
// may come down EDGE_IN px off the lake's very ends.
//
const FRENZY_REACH = 80
const FRENZY_HIGH = 160
const FRENZY_SPREAD = 50
const FRENZY_SPEED = 240
const GATHER_DEPTH = 8
const GATHER_Z = 10
const FRENZY_COOLDOWN = 0.3
const FRENZY_COOLDOWN_RANGE = 0.6
const FRENZY_DIVE = 0.35
const LEAP_OUT = 30
const EDGE_IN = 6
const HUNT_LOW = 4
const HUNT_HIGH = 120
const HUNT_SEE = 420
const LAUNCH_BACK = 18
const APPROACH_DEPTH = 14
const LAUNCH_X = 22
const LAUNCH_Y = 10
const LAUNCH_Z = 12
const GRAVITY = 1100
const OVERSHOOT = 14
const LEAP_VX = 260
const HUNT_GIVE_UP = 7
const LOSE_TIME = 0.8
const COOLDOWN = 3
const COOLDOWN_RANGE = 6
const GAPE_R = 70
const CATCH_R = 10
const MOUTH_EASE = 14
//
// Back in the water it keeps ENTRY_KEEP of its speed and dives for
// DIVE_TIME s. Fear: the hero in the water within FLEE_R px, or a splash
// (startle) within STARTLE_R, sends it off FLEE_REACH px away for at most
// FLEE_TIME s, into the middle of the water (FLEE_DEPTH..+RANGE of the
// way from the top it keeps to the bed, never against the bed); with less
// than FLEE_CORNER px of water left that way it slips past the danger
// instead, along the far side of the depth. Once there, still afraid, it
// picks a new way.
//
const ENTRY_KEEP = 0.45
const DIVE_TIME = 0.8
const DIVE_DOWN = 70
const FLEE_R = 160
const STARTLE_R = 420
const FLEE_TIME = 1.6
const FLEE_REACH = 260
const FLEE_CORNER = 120
const FLEE_DEPTH = 0.3
const FLEE_DEPTH_RANGE = 0.4
//
// Fins: the tail fan's least width when edge-on and its extra flex behind
// the last bone (rad, lagging the beat); the side fins' rest angle and
// flap (degrees) and flaps per s.
//
const TAIL_MIN = 0.22
const TAIL_FLEX = 0.5
const TAIL_LAG = 1.2
const PECT_REST = -24
const PECT_FLAP = 16
const PELV_REST = -16
const PELV_FLAP = 6
const FIN_HZ = 2.4
const FLIP_EDGE = 0.2
//
// Shade: far side fin, and steps of depth darkening (z).
//
const SHADE_STEPS = 6
//
// Splash (world px, s): rings on the surface growing from RING_R0 to
// RING_R1 over RING_TIME, RING_FLAT as high as wide; drops thrown up
// DROP_SPEED..+RANGE px/s, DROP_SPREAD wide, falling under DROP_GRAVITY,
// DROP_R big. Leaving the water makes a small splash, falling back a big one.
//
const RING_R0 = 3
const RING_R1 = 22
const RING_TIME = 0.9
const RING_FLAT = 0.28
const RING_ALPHA = 0.55
const DROPS_SMALL = 4
const DROPS_BIG = 8
const DROP_SPEED = 90
const DROP_SPEED_RANGE = 90
const DROP_SPREAD = 0.9
const DROP_GRAVITY = 700
const DROP_R = 1.2
const DROP_ALPHA = 0.8
const SPLASH_SMALL = 0.5
const SPLASH_BIG = 1
const LINE_W = 1
const NEAR_SURFACE = 30
const CULL_MARGIN = 60
//
// The school (createAll): count, sizes, seed.
//
const COUNT = 6
const SET_SIZE = 0.9
const SET_SIZE_RANGE = 0.4
const SET_SEED = 7420
const MODE = { CRUISE: 'cruise', HUNT: 'hunt', JUMP: 'jump', DIVE: 'dive', FLEE: 'flee' }
const HALF = 0.5
const DEG = 180 / Math.PI
const FULL_TURN = Math.PI * 2
const atlasFor = new WeakMap()
let atlas = null

/**
 * Creates a fish in the lake.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake instance (cave-lake.js)
 * @param {{minX: number, maxX: number}} cfg.water - Where the lake is deep enough
 * @param {number} cfg.x - Start X
 * @param {number} cfg.size - Size multiplier
 * @param {number} cfg.seed - Random seed
 * @returns {Object} Fish instance
 */
export function create(cfg) {
  const { k, lake, water } = cfg
  bake(k)
  const rng = createSeededRandom(cfg.seed)
  const seg = BODY_LEN * cfg.size / SEGMENTS
  const dir = rng() < HALF ? -1 : 1
  const surface = CaveLake.surfaceAt(lake, cfg.x)
  const y = surface + TOP_PAD + (CaveLake.bottomAt(lake, cfg.x) - BED_PAD - surface - TOP_PAD) * rng()
  const z = (rng() * 2 - 1) * Z_MAX
  const inst = {
    k,
    lake,
    rng,
    size: cfg.size,
    seg,
    minX: water.minX,
    maxX: water.maxX,
    waterX1: water.x1,
    waterX2: water.x2,
    frenzy: false,
    gatherDx: (rng() * 2 - 1) * FRENZY_SPREAD,
    gatherDz: (rng() * 2 - 1) * GATHER_Z,
    joints: Array.from({ length: SEGMENTS + 1 }, (_, i) => ({ x: cfg.x - dir * seg * i, y, z })),
    h: { x: dir, y: 0, z: 0 },
    vel: { x: 0, y: 0, z: 0 },
    speed: 0,
    want: CRUISE_SPEED,
    mode: MODE.CRUISE,
    target: { x: cfg.x, y, z },
    roamIn: 0,
    hoverIn: 0,
    modeT: 0,
    cooldown: COOLDOWN * rng(),
    prey: null,
    lostFor: 0,
    mouth: 0,
    beat: rng() * FULL_TURN,
    fin: rng() * FULL_TURN,
    turnSide: rng() < HALF ? -1 : 1,
    facing: dir,
    lastHeadY: y,
    fleeFrom: 0,
    rings: [],
    drops: [],
    shades: Array.from({ length: SHADE_STEPS }, (_, i) => shadeRgb(k, i / (SHADE_STEPS - 1) * C.depthShade)),
    farShade: shadeRgb(k, C.farShade),
    splashRgb: getRGB(k, C.splash),
    v: k.vec2(0, 0),
    anchors: new Map()
  }
  pickRoam(inst)
  return inst
}

/**
 * Creates the lake's school, spread over its deep water.
 * @param {Object} k - Kaplay instance
 * @param {Object} lake - Lake instance (cave-lake.js)
 * @returns {Array<Object>} Fish instances
 */
export function createAll(k, lake) {
  const rng = createSeededRandom(SET_SEED)
  const water = deepWater(lake)
  return Array.from({ length: COUNT }, (_, i) => create({
    k,
    lake,
    water,
    x: water.minX + (water.maxX - water.minX) * (i + HALF) / COUNT,
    size: SET_SIZE + rng() * SET_SIZE_RANGE,
    seed: Math.floor(rng() * SET_SEED)
  }))
}

/**
 * Runs the fish on: fear, hunting, roaming, leaping; its spine after its
 * head; its splashes.
 * @param {Object} inst - Fish instance
 * @param {Object} ctx
 * @param {Array<{x: number, y: number}>} ctx.prey - Fireflies it may hunt
 * @param {Array<{x: number, y: number}>} ctx.swarmPrey - The blue swarm's fireflies among them
 * @param {{x: number, y: number}|null} ctx.swarm - The blue swarm's middle (null: home)
 * @param {Array<{x: number, y: number}>} ctx.threats - Things in the water it flees
 * @param {Array<Object>} ctx.school - Every fish of the lake
 * @param {(prey: Object) => void} ctx.onCatch - A firefly was eaten
 * @param {(x: number, strength: number) => void} ctx.onSplash - It broke the surface
 */
export function onUpdate(inst, ctx) {
  const dt = inst.k.dt()
  if (dt <= 0) return
  inst.modeT += dt
  inst.cooldown -= dt
  decide(inst, ctx, dt)
  inst.mode === MODE.JUMP ? fly(inst, ctx, dt) : swim(inst, dt)
  followSpine(inst)
  crossSurface(inst, ctx)
  inst.mouth += ((inst.prey && inst.mode === MODE.JUMP && nearPrey(inst, GAPE_R) ? 1 : 0) - inst.mouth) * Math.min(1, MOUTH_EASE * dt)
  inst.fin += FIN_HZ * FULL_TURN * dt
  updateSplash(inst, dt)
}

/**
 * Startles it: a splash at x sends it fleeing if it is near.
 * @param {Object} inst - Fish instance
 * @param {number} x - World X of the splash
 */
export function startle(inst, x) {
  if (inst.mode === MODE.JUMP || Math.abs(inst.joints[0].x - x) > STARTLE_R) return
  flee(inst, x)
}

/**
 * Its head when it is near the surface or out of the water (for what
 * lives on the surface to fear), else null.
 * @param {Object} inst - Fish instance
 * @returns {{x: number, y: number}|null}
 */
export function surfacePoint(inst) {
  const head = inst.joints[0]
  return head.y < CaveLake.surfaceAt(inst.lake, head.x) + NEAR_SURFACE ? head : null
}

/**
 * Its depth for drawing far fish first (larger is farther).
 * @param {Object} inst - Fish instance
 * @returns {number}
 */
export function depth(inst) {
  return inst.joints[SEGMENTS >> 1].z
}

/**
 * Draws the fish: tail fan, far fin, the body's slices tail to head, the
 * near fins (under the water's see-through paint).
 * @param {Object} inst - Fish instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 */
export function onDraw(inst, view) {
  const head = inst.joints[0]
  if (head.x < view.left - CULL_MARGIN || head.x > view.right + CULL_MARGIN || head.y < view.top - CULL_MARGIN || head.y > view.bottom + CULL_MARGIN) return
  const parts = atlasFor.get(inst.k)
  if (!parts) return
  updateFacing(inst)
  const shade = inst.shades[Math.round((depth(inst) + Z_MAX) / (2 * Z_MAX) * (SHADE_STEPS - 1))] ?? inst.shades[0]
  drawTail(inst, parts, shade)
  drawSideFin(inst, parts.pectoral, A.pectAt, PECT_REST, PECT_FLAP, inst.farShade, 1)
  const slices = inst.mouth > HALF ? parts.openSlices : parts.slices
  for (let i = SEGMENTS - 1; i >= 0; i--) drawSlice(inst, parts, slices[i], i, shade)
  drawSideFin(inst, parts.pelvic, A.pelvAt, PELV_REST, PELV_FLAP, shade, 0)
  drawSideFin(inst, parts.pectoral, A.pectAt, PECT_REST, PECT_FLAP, shade, 0)
}

/**
 * Draws its splashes over the water: the rings and the drops.
 * @param {Object} inst - Fish instance
 */
export function onDrawSplash(inst) {
  const k = inst.k
  inst.rings.forEach(ring => {
    const share = ring.t / RING_TIME
    const r = (RING_R0 + (RING_R1 - RING_R0) * share) * ring.strength * inst.size
    k.drawEllipse({ pos: inst.v.set(ring.x, ring.y), radiusX: r, radiusY: r * RING_FLAT, fill: false, outline: { width: LINE_W, color: inst.splashRgb }, opacity: RING_ALPHA * (1 - share) })
  })
  inst.drops.forEach(drop => k.drawCircle({ pos: inst.v.set(drop.x, drop.y), radius: DROP_R, color: inst.splashRgb, opacity: DROP_ALPHA }))
}
//
// Where the lake is deep enough for a fish: its first and last columns
// MIN_DEPTH px deep or more.
//
function deepWater(lake) {
  const span = CaveLake.span(lake)
  let minX = span.x2
  let maxX = span.x1
  for (let x = span.x1; x < span.x2; x++) {
    if (CaveLake.bottomAt(lake, x) - CaveLake.surfaceAt(lake, x) < MIN_DEPTH) continue
    minX = Math.min(minX, x)
    maxX = Math.max(maxX, x)
  }
  return { minX: minX + BODY_LEN, maxX: maxX - BODY_LEN, x1: span.x1 + EDGE_IN, x2: span.x2 - EDGE_IN }
}
//
// What it does now: flee the hero in the water, go for a firefly over the
// water, keep after the one it hunts, or roam.
//
function decide(inst, ctx, dt) {
  if (inst.mode === MODE.JUMP) return
  inst.frenzy = isFeeding(inst, ctx.swarm)
  const head = inst.joints[0]
  const threat = ctx.threats.find(t => Math.abs(t.x - head.x) < FLEE_R && Math.abs(t.y - head.y) < FLEE_R)
  if (threat && inst.mode !== MODE.FLEE) flee(inst, threat.x)
  if (inst.mode === MODE.FLEE) {
    if (dist3(head, inst.target) < ROAM_ARRIVE || inst.modeT >= FLEE_TIME) toCruise(inst)
    return
  }
  if (inst.mode === MODE.DIVE) {
    inst.modeT >= (inst.frenzy ? FRENZY_DIVE : DIVE_TIME) && toCruise(inst)
    return
  }
  if (inst.mode === MODE.HUNT) {
    hunt(inst, ctx, dt)
    return
  }
  inst.cooldown <= 0 && seekPrey(inst, ctx)
  if (inst.mode !== MODE.CRUISE) return
  inst.frenzy ? gather(inst, ctx.swarm) : roam(inst, dt)
}
function toCruise(inst) {
  inst.mode = MODE.CRUISE
  inst.modeT = 0
  inst.prey = null
  inst.cooldown = Math.max(inst.cooldown, restTime(inst))
  pickRoam(inst)
}
function restTime(inst) {
  return inst.frenzy ? FRENZY_COOLDOWN + inst.rng() * FRENZY_COOLDOWN_RANGE : COOLDOWN + inst.rng() * COOLDOWN_RANGE
}
//
// Whether the blue swarm hangs low over the water within reach.
//
function isFeeding(inst, swarm) {
  if (!swarm || swarm.x < inst.minX - FRENZY_REACH || swarm.x > inst.maxX + FRENZY_REACH) return false
  const surface = CaveLake.surfaceAt(inst.lake, clamp(swarm.x, inst.minX, inst.maxX))
  return swarm.y < surface && swarm.y > surface - FRENZY_HIGH
}
//
// In the frenzy, waiting for its leap: up under the swarm, each fish at
// its own spot along it.
//
function gather(inst, swarm) {
  const x = clamp(swarm.x + inst.gatherDx, inst.minX, inst.maxX)
  inst.target.x = x
  inst.target.y = CaveLake.surfaceAt(inst.lake, x) + APPROACH_DEPTH + GATHER_DEPTH
  inst.target.z = inst.gatherDz
  inst.want = FRENZY_SPEED
  inst.hoverIn = 0
}
function flee(inst, fromX) {
  const head = inst.joints[0]
  const away = Math.sign(head.x - fromX) || inst.facing
  const room = away > 0 ? inst.maxX - head.x : head.x - inst.minX
  const cornered = room < FLEE_CORNER
  const way = cornered ? -away : away
  const x = clamp(head.x + way * FLEE_REACH, inst.minX, inst.maxX)
  const top = topFor(inst, x, TOP_PAD)
  inst.mode = MODE.FLEE
  inst.modeT = 0
  inst.prey = null
  inst.want = FLEE_SPEED
  inst.target.x = x
  inst.target.y = top + (bottomFor(inst, x) - top) * (FLEE_DEPTH + inst.rng() * FLEE_DEPTH_RANGE)
  inst.target.z = cornered ? (Math.sign(head.z) || inst.turnSide) * -Z_MAX : (inst.rng() * 2 - 1) * Z_MAX
}
//
// Roaming: on to a new spot when there (or after a while), hanging still
// on its fins now and then.
//
function roam(inst, dt) {
  inst.roamIn -= dt
  if (inst.hoverIn > 0) {
    inst.hoverIn -= dt
    inst.want = HOVER_SPEED
    inst.hoverIn <= 0 && pickRoam(inst)
    return
  }
  const head = inst.joints[0]
  const there = dist3(head, inst.target) < ROAM_ARRIVE
  if (there && head.y < bottomFor(inst, head.x) - ROAM_BED && inst.rng() < HOVER_CHANCE) {
    inst.hoverIn = HOVER_TIME + inst.rng() * HOVER_TIME_RANGE
    return
  }
  if (there || inst.roamIn <= 0) pickRoam(inst)
}
function pickRoam(inst) {
  const head = inst.joints[0]
  const x = clamp(head.x + (inst.rng() * 2 - 1) * ROAM_REACH, inst.minX, inst.maxX)
  const top = topFor(inst, x, TOP_PAD)
  const bottom = Math.max(top, bottomFor(inst, x) - ROAM_BED)
  inst.target.x = x
  inst.target.y = top + (bottom - top) * inst.rng()
  inst.target.z = (inst.rng() * 2 - 1) * Z_MAX
  inst.want = CRUISE_SPEED + inst.rng() * CRUISE_SPEED_RANGE
  inst.roamIn = ROAM_TIME + inst.rng() * ROAM_TIME_RANGE
  inst.hoverIn = 0
}
//
// The nearest firefly over the water that no other fish is after — in the
// frenzy one of the swarm's, however far.
//
function seekPrey(inst, ctx) {
  const head = inst.joints[0]
  let best = null
  let bestDx = inst.frenzy ? Infinity : HUNT_SEE
  for (const p of inst.frenzy ? ctx.swarmPrey : ctx.prey) {
    const dx = Math.abs(p.x - head.x)
    if (dx >= bestDx || !isOverWater(inst, p) || ctx.school.some(f => f.prey === p)) continue
    best = p
    bestDx = dx
  }
  if (!best) return
  inst.prey = best
  inst.mode = MODE.HUNT
  inst.modeT = 0
  inst.lostFor = 0
}
function isOverWater(inst, p) {
  if (p.x < inst.minX - LEAP_OUT || p.x > inst.maxX + LEAP_OUT) return false
  const surface = CaveLake.surfaceAt(inst.lake, p.x)
  return p.y <= surface - HUNT_LOW && p.y >= surface - HUNT_HIGH
}
//
// Up under the firefly, just under the surface; once there, the leap.
//
function hunt(inst, ctx, dt) {
  const p = inst.prey
  const alive = ctx.prey.includes(p) && isOverWater(inst, p)
  inst.lostFor = alive ? 0 : inst.lostFor + dt
  if (inst.lostFor > LOSE_TIME || inst.modeT > HUNT_GIVE_UP) {
    toCruise(inst)
    return
  }
  const head = inst.joints[0]
  const side = Math.sign(p.x - head.x) || inst.facing
  const surface = CaveLake.surfaceAt(inst.lake, p.x)
  inst.target.x = clamp(p.x - side * LAUNCH_BACK * inst.size, inst.minX, inst.maxX)
  inst.target.y = surface + APPROACH_DEPTH
  inst.target.z = 0
  inst.want = inst.frenzy ? FRENZY_SPEED : HUNT_SPEED
  const ready = alive && Math.abs(head.x - inst.target.x) < LAUNCH_X && head.y < inst.target.y + LAUNCH_Y && Math.abs(head.z) < LAUNCH_Z
  ready && leap(inst, p)
}
//
// Thrown out at the firefly: rising OVERSHOOT px past it, along at the
// pace that meets it at the top (capped).
//
function leap(inst, p) {
  const head = inst.joints[0]
  const rise = Math.max(OVERSHOOT, head.y - p.y + OVERSHOOT)
  const up = Math.sqrt(2 * GRAVITY * rise)
  const time = up / GRAVITY
  inst.vel.x = clamp((p.x - head.x) / time, -LEAP_VX, LEAP_VX)
  inst.vel.y = -up
  inst.vel.z = 0
  inst.mode = MODE.JUMP
  inst.modeT = 0
}
//
// In the air: falling under gravity, its head along its flight; whatever
// its mouth reaches it eats.
//
function fly(inst, ctx, dt) {
  const head = inst.joints[0]
  inst.lastHeadY = head.y
  inst.vel.y += GRAVITY * dt
  head.x += inst.vel.x * dt
  head.y += inst.vel.y * dt
  setDir(inst.h, inst.vel.x, inst.vel.y, 0)
  inst.beat += BEAT_HZ * FULL_TURN * dt
  if (!inst.prey || !nearPrey(inst, CATCH_R * inst.size) || !ctx.prey.includes(inst.prey)) return
  ctx.onCatch(inst.prey)
  inst.prey = null
}
function nearPrey(inst, r) {
  const head = inst.joints[0]
  return Math.hypot(inst.prey.x - head.x, inst.prey.y - head.y) < r
}
//
// Under the water: the head turns toward its target (through the depth
// when it lies behind), speeds toward its pace and beats side to side as
// it swims; the water's surface, bed and banks hold it in.
//
function swim(inst, dt) {
  const head = inst.joints[0]
  inst.lastHeadY = head.y
  const t = inst.target
  const want = { x: t.x - head.x, y: t.y - head.y, z: t.z - head.z }
  const len = Math.hypot(want.x, want.y, want.z)
  if (len > 1) {
    want.x /= len
    want.y /= len
    want.z /= len
    setDir(want, want.x, clamp(want.y, -MAX_PITCH, MAX_PITCH), want.z)
    const fast = inst.frenzy || inst.mode === MODE.HUNT || inst.mode === MODE.FLEE
    turnToward(inst, want, (fast ? TURN_RATE_FAST : TURN_RATE) * dt)
  }
  inst.speed += clamp(inst.want - inst.speed, -ACCEL * dt, ACCEL * dt)
  inst.beat += (BEAT_HZ + BEAT_HZ_PER_SPEED * inst.speed) * FULL_TURN * dt
  const beat = BEAT_AMP * Math.min(1, HOVER_BEAT + inst.speed / CRUISE_SPEED)
  const side = sideOf(inst.h)
  const lat = Math.tan(beat * Math.sin(inst.beat))
  const vert = BEAT_VERT * Math.cos(inst.beat)
  const mx = inst.h.x + side.x * lat
  const my = inst.h.y + vert
  const mz = inst.h.z + side.z * lat
  const ml = Math.hypot(mx, my, mz) || 1
  head.x += mx / ml * inst.speed * dt
  head.y += my / ml * inst.speed * dt
  head.z += mz / ml * inst.speed * dt
  keepInWater(inst)
}
//
// Turns the heading toward a direction by at most `step` rad (slerp);
// straight behind, it turns through the depth on its own side.
//
function turnToward(inst, want, step) {
  const h = inst.h
  let dot = clamp(h.x * want.x + h.y * want.y + h.z * want.z, -1, 1)
  if (dot < -1 + 1e-3) {
    want.z += inst.turnSide * HALF
    const l = Math.hypot(want.x, want.y, want.z)
    want.x /= l
    want.y /= l
    want.z /= l
    dot = clamp(h.x * want.x + h.y * want.y + h.z * want.z, -1, 1)
  }
  const angle = Math.acos(dot)
  if (angle <= step) {
    setDir(h, want.x, want.y, want.z)
    return
  }
  const s = Math.sin(angle)
  const a = Math.sin(angle - step) / s
  const b = Math.sin(step) / s
  setDir(h, h.x * a + want.x * b, h.y * a + want.y * b, h.z * a + want.z * b)
}
function sideOf(h) {
  const l = Math.hypot(h.x, h.z)
  return l < 1e-3 ? { x: 0, z: 1 } : { x: -h.z / l, z: h.x / l }
}
function keepInWater(inst) {
  const head = inst.joints[0]
  const dive = inst.mode === MODE.DIVE
  head.x = clamp(head.x, dive ? inst.waterX1 : inst.minX, dive ? inst.waterX2 : inst.maxX)
  head.z = clamp(head.z, -Z_MAX, Z_MAX)
  const pad = inst.frenzy || inst.mode === MODE.HUNT ? APPROACH_DEPTH - LAUNCH_Y : TOP_PAD
  const top = dive ? -Infinity : topFor(inst, head.x, pad)
  const bottom = bottomFor(inst, head.x)
  if (head.y > bottom) {
    head.y = bottom
    inst.h.y = Math.min(0, inst.h.y)
  }
  if (head.y < top) {
    head.y = top
    inst.h.y = Math.max(0, inst.h.y)
  }
}
function topFor(inst, x, pad) {
  return CaveLake.surfaceAt(inst.lake, x) + pad
}
function bottomFor(inst, x) {
  return Math.max(topFor(inst, x, TOP_PAD), CaveLake.bottomAt(inst.lake, x) - BED_PAD)
}
//
// The IK chain: each joint is pulled after the one before it at its
// bone's length, turned back within MAX_BEND of the bone before.
//
function followSpine(inst) {
  const j = inst.joints
  let px = inst.h.x
  let py = inst.h.y
  let pz = inst.h.z
  for (let i = 1; i <= SEGMENTS; i++) {
    const a = j[i - 1]
    const b = j[i]
    let dx = a.x - b.x
    let dy = a.y - b.y
    let dz = a.z - b.z
    const l = Math.hypot(dx, dy, dz) || 1
    dx /= l
    dy /= l
    dz /= l
    const dot = clamp(dx * px + dy * py + dz * pz, -1, 1)
    const angle = Math.acos(dot)
    if (angle > MAX_BEND) {
      const s = Math.sin(angle) || 1
      const wa = Math.sin(MAX_BEND) / s
      const wb = Math.sin(angle - MAX_BEND) / s
      dx = px * wb + dx * wa
      dy = py * wb + dy * wa
      dz = pz * wb + dz * wa
      const n = Math.hypot(dx, dy, dz) || 1
      dx /= n
      dy /= n
      dz /= n
    }
    b.x = a.x - dx * inst.seg
    b.y = a.y - dy * inst.seg
    b.z = a.z - dz * inst.seg
    px = dx
    py = dy
    pz = dz
  }
}
//
// Breaking the surface: a small splash leaving the water, a big one
// falling back in (then it dives).
//
function crossSurface(inst, ctx) {
  if (inst.mode !== MODE.JUMP) return
  const head = inst.joints[0]
  const surface = CaveLake.surfaceAt(inst.lake, head.x)
  const was = inst.lastHeadY
  if (was >= surface && head.y < surface) splash(inst, ctx, head.x, surface, SPLASH_SMALL, DROPS_SMALL)
  if (head.y <= surface || inst.vel.y <= 0) return
  was <= surface && splash(inst, ctx, head.x, surface, SPLASH_BIG, DROPS_BIG)
  const sp = Math.hypot(inst.vel.x, inst.vel.y)
  inst.speed = sp * ENTRY_KEEP
  inst.want = CRUISE_SPEED
  inst.mode = MODE.DIVE
  inst.modeT = 0
  inst.prey = null
  inst.target.x = clamp(head.x + Math.sign(inst.vel.x || inst.facing) * DIVE_DOWN, inst.minX, inst.maxX)
  inst.target.y = Math.min(bottomFor(inst, inst.target.x), surface + DIVE_DOWN)
  inst.target.z = 0
  inst.cooldown = restTime(inst)
}
function splash(inst, ctx, x, y, strength, drops) {
  inst.rings.push({ x, y, t: 0, strength })
  for (let i = 0; i < drops; i++) {
    const a = -Math.PI * HALF + (inst.rng() * 2 - 1) * DROP_SPREAD
    const s = (DROP_SPEED + inst.rng() * DROP_SPEED_RANGE) * strength
    inst.drops.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s })
  }
  ctx.onSplash(x, strength)
}
function updateSplash(inst, dt) {
  inst.rings.forEach(ring => { ring.t += dt })
  inst.rings = inst.rings.filter(ring => ring.t < RING_TIME)
  inst.drops.forEach(drop => {
    drop.vy += DROP_GRAVITY * dt
    drop.x += drop.vx * dt
    drop.y += drop.vy * dt
  })
  inst.drops = inst.drops.filter(drop => drop.vy < 0 || drop.y < CaveLake.surfaceAt(inst.lake, drop.x))
}
//
// Which way the fish faces on the screen (with a dead band, so a fish
// seen head-on does not flicker).
//
function updateFacing(inst) {
  const dx = inst.joints[0].x - inst.joints[SEGMENTS].x
  Math.abs(dx) > BODY_LEN * inst.size * FLIP_EDGE && (inst.facing = Math.sign(dx))
}
//
// A bone's screen angle (degrees, toward the head), length, and whether
// its slice is drawn flipped (pointing left: belly kept down).
//
function boneOf(inst, i) {
  const a = inst.joints[i]
  const b = inst.joints[i + 1]
  const dx = a.x - b.x
  const dy = a.y - b.y
  const len = Math.hypot(dx, dy)
  const flip = Math.abs(dx) < inst.seg * FLIP_EDGE ? inst.facing < 0 : dx < 0
  return { angle: Math.atan2(dy, dx) * DEG, len, flip }
}
function drawSlice(inst, parts, slice, i, shade) {
  const bone = boneOf(inst, i)
  const scale = inst.size / TEX_PER_PX
  const w = slice.w * scale * (bone.len / inst.seg) + OVERLAP
  const at = inst.joints[i]
  drawQuad(inst, slice, at.x, at.y, w, slice.h * scale, bone.angle, bone.flip, shade)
}
//
// The tail fan on the last bone, narrowing as it turns edge-on to the eye
// (the bone's own turn into the depth and the fan's flex behind it).
//
function drawTail(inst, parts, shade) {
  const bone = boneOf(inst, SEGMENTS - 1)
  const j = inst.joints
  const d = { x: j[SEGMENTS - 1].x - j[SEGMENTS].x, y: j[SEGMENTS - 1].y - j[SEGMENTS].y, z: j[SEGMENTS - 1].z - j[SEGMENTS].z }
  const yaw = Math.atan2(d.z, Math.hypot(d.x, d.y)) + TAIL_FLEX * Math.sin(inst.beat - TAIL_LAG)
  const tail = parts.tail
  const scale = inst.size / TEX_PER_PX
  const w = tail.w * scale * Math.max(TAIL_MIN, Math.abs(Math.cos(yaw)))
  const at = inst.joints[SEGMENTS]
  drawQuad(inst, tail, at.x, at.y, w, tail.h * scale, bone.angle, bone.flip, shade)
}
//
// A side fin at its root on the body (u along it, px under the spine),
// flapping; `phase` puts the far fin's flap half a beat off.
//
function drawSideFin(inst, fin, at, rest, flap, color, phase) {
  const s = (1 - at.u) * SEGMENTS
  const i = Math.min(SEGMENTS - 1, Math.floor(s))
  const bone = boneOf(inst, i)
  const a = inst.joints[i]
  const b = inst.joints[i + 1]
  const f = s - i
  const scale = inst.size / TEX_PER_PX
  const off = (bone.flip ? -1 : 1) * at.dy * scale
  const rad = bone.angle / DEG
  const x = a.x + (b.x - a.x) * f - Math.sin(rad) * off
  const y = a.y + (b.y - a.y) * f + Math.cos(rad) * off
  const turn = rest + flap * Math.sin(inst.fin + phase * Math.PI)
  drawQuad(inst, fin, x, y, fin.w * scale, fin.h * scale, bone.angle + (bone.flip ? -turn : turn), bone.flip, color)
}
//
// One piece of the atlas (a slice or a fin) at a point, its anchor there
// (the flipped one when drawn flipped).
//
function drawQuad(inst, piece, x, y, w, h, angle, flip, color) {
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: piece.quad,
    width: w,
    height: h,
    pos: inst.v.set(x, y),
    anchor: flip ? piece.anchorFlip : piece.anchor,
    angle,
    flipY: flip,
    color
  })
}
function setDir(v, x, y, z) {
  const l = Math.hypot(x, y, z) || 1
  v.x = x / l
  v.y = y / l
  v.z = z / l
}
function dist3(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y, a.z - b.z)
}
function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
function shadeRgb(k, amount) {
  const c = Math.round(255 * (1 - amount))
  return k.rgb(c, c, c)
}
//
// The atlas: painted once per page, grained, loaded once per live k; the
// body's slices (shut and gaping), the tail and side fins with their
// quads and anchors (on the spine line and at their roots; flipped too).
//
function bake(k) {
  if (atlasFor.has(k)) return
  atlas ??= buildAtlas()
  k.loadSprite(SPRITE, atlas.canvas, { filter: 'linear' })
  atlasFor.set(k, {
    slices: atlas.parts.slices.map(piece => withAnchors(k, piece)),
    openSlices: atlas.parts.openSlices.map(piece => withAnchors(k, piece)),
    tail: withAnchors(k, atlas.parts.tail),
    pectoral: withAnchors(k, atlas.parts.pectoral),
    pelvic: withAnchors(k, atlas.parts.pelvic)
  })
}
function withAnchors(k, piece) {
  return { ...piece, anchor: k.vec2(piece.anchor.x, piece.anchor.y), anchorFlip: k.vec2(piece.anchorFlip.x, piece.anchorFlip.y) }
}
function buildAtlas() {
  const { canvas, parts } = paintFishAtlas()
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  const size = { w: canvas.width, h: canvas.height }
  return {
    canvas,
    parts: {
      slices: slicesOf(parts.body, size),
      openSlices: slicesOf(parts.bodyOpen, size),
      tail: finOf(parts.tail, A.tailRoot, size),
      pectoral: finOf(parts.pectoral, A.pectRoot, size),
      pelvic: finOf(parts.pelvic, A.pelvRoot, size)
    }
  }
}
function quadOf(p, x0, x1, size) {
  return { x: (p.x + x0) / size.w, y: p.y / size.h, w: (x1 - x0) / size.w, h: p.h / size.h }
}
function slicesOf(part, size) {
  const slices = []
  for (let i = 0; i < SEGMENTS; i++) {
    const front = A.pad + (SEGMENTS - i) / SEGMENTS * A.texL
    const x0 = i === SEGMENTS - 1 ? 0 : A.pad + (SEGMENTS - i - 1) / SEGMENTS * A.texL
    const x1 = i === 0 ? A.bodyW : front
    const ax = (front - x0) / (x1 - x0) * 2 - 1
    slices.push({
      quad: quadOf(part, x0, x1, size),
      w: x1 - x0,
      h: part.h,
      anchor: { x: ax, y: A.mid / part.h * 2 - 1 },
      anchorFlip: { x: ax, y: (part.h - A.mid) / part.h * 2 - 1 }
    })
  }
  return slices
}
function finOf(part, root, size) {
  const ax = root.x / part.w * 2 - 1
  return {
    quad: quadOf(part, 0, part.w, size),
    w: part.w,
    h: part.h,
    anchor: { x: ax, y: root.y / part.h * 2 - 1 },
    anchorFlip: { x: ax, y: (part.h - root.y) / part.h * 2 - 1 }
  }
}
