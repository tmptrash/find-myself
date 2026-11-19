import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as CaveLake from '../utils/cave-lake.js'
import * as Swim from '../utils/cave-swim.js'
import * as SkinMesh from '../../../utils/skin-mesh.js'
import { paintFishAtlas, FISH_ART } from '../utils/cave-fish-paint.js'
//
// The lake's fish (painted in code, cave-fish-paint.js). Each swims on a
// spine of SEGMENTS bones in 3D — x and y as on the screen, z into it —
// solved as a follow-the-leader IK chain (cave-swim.js): the head is
// steered, every joint behind it is pulled after the one before it at its
// bone's length, and no joint bends more than MAX_BEND, so the body flows
// along the head's path. The head swims as a fish does: it beats side to side (in
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
// the hero in it, or the lake's giant coming for it, sends it fleeing. A
// fish the giant eats comes back a while later, swimming in from behind
// the lake bed's wall on either side, so the school keeps its number.
//
const SPRITE = 'cave0-fish'
const GRAIN_SEED = 9480
const C = CAVE_CFG.fish
const A = FISH_ART
//
// Size and spine: body length (snout to the tail's root, world px at size
// 1), its bones, the most a joint bends (rad), how deep the lake is for
// them in z (px either way). The whole picture (body and tail fan) is one
// skinned mesh of MESH_COLS × MESH_ROWS cells over the spine's joints
// (evenly along the body's length on the spine line, head first), placed
// by joint MESH_ANCHOR, blended across a joint over MESH_BLEND of a bone.
//
const BODY_LEN = 30
const SEGMENTS = 10
const TEX_PER_PX = A.texL / BODY_LEN
const MAX_BEND = 0.3
const Z_MAX = 26
const MESH_COLS = 22
const MESH_ROWS = 6
const MESH_ANCHOR = SEGMENTS >> 1
const MESH_BLEND = 0.6
const MESH_JOINTS = Array.from({ length: SEGMENTS + 1 }, (_, i) => ({ x: A.bodyX + (1 - i / SEGMENTS) * A.texL, y: A.mid }))
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
// Picking at the bed: rested, about as often as it goes for a firefly
// (FORAGE_SHARE of the times it is ready to feed, never in a frenzy) — and
// on FORAGE_CHANCE of its new spots besides — it goes down to a spot on
// the bed within FORAGE_REACH px and swims nose first into it, its snout
// FORAGE_DIG px down in the soil (the soil, drawn over the fish, hides
// what of it pokes in); there it picks at it, mouth open, for PECK_TIME s, backs
// off tail first (not turning) at BACK_SPEED px/s for BACK_TIME s, lets
// SAND_COUNT..+RANGE single grains drop out of its mouth one by one
// (SAND_GAP s apart) and hangs there over the bed, still drifting back at
// LINGER_BACK px/s, not turning, LINGER..+RANGE s before it swims off.
// Each grain: thrown back
// (from its heading) at up to SAND_BACK px/s and up at up to SAND_UP,
// slowed by SAND_DRAG per s, sinking at SAND_SINK px/s, SAND_PX px square,
// gone once on the bed (or after SAND_LIFE s).
//
const FORAGE_CHANCE = 0.05
const FORAGE_SHARE = 0.5
const FORAGE_REACH = 160
const FORAGE_DIG = 3
const PECK_TIME = 0.5
const BACK_SPEED = 22
const BACK_TIME = 0.5
const LINGER = 3
const LINGER_RANGE = 5
const LINGER_LOOK = 20
const LINGER_BACK = 4
const SAND_COUNT = 2
const SAND_COUNT_RANGE = 2
const SAND_GAP = 0.18
const SAND_BACK = 22
const SAND_UP = 10
const SAND_DRAG = 2.5
const SAND_SINK = 9
const SAND_PX = 1
const SAND_LIFE = 4
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
// picks a new way. Chased by the giant it bolts straight on, away from
// it, at its depth and side-on (z 0), BOLT_REACH px at BOLT_SPEED (slower
// than the giant's chase) for at most BOLT_TIME s, heeding nothing else.
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
const BOLT_SPEED = 95
const BOLT_REACH = 600
const BOLT_TIME = 4
//
// Side fins (pectoral, pelvic): where each is rooted on the whole picture
// (its u along the body and px off the spine), its rest angle and flap
// (degrees); flaps per s. A spine seen nearly end-on (its ends within
// FLIP_EDGE of its length) keeps its facing. Turning to face the other
// way it rolls over about its spine at ROLL_RATE per s: its picture
// across the spine narrows (never under ROLL_MIN_WIDTH of it: it keeps its
// body) while, within ROLL_FADE of edge-on, its other side shows through
// more and more over it (eye, fins and all passing over smoothly, never
// switching at once), and widens again; its side fins shrink to nothing
// and grow out again on the other side. Its tail fan swings toward the
// eye and away with its beat, up to TAIL_SWING rad off the side view (the
// bone before it TAIL_SWING_INNER of that): seen from the side it only
// grows shorter and longer, never wags up or down.
//
const PECT = finAt(A.pectAt, -24, 16)
const PELV = finAt(A.pelvAt, -16, 6)
const FIN_HZ = 2.4
const FLIP_EDGE = 0.2
const ROLL_RATE = 7
const HELD_FADE_FROM = 0.55
const ROLL_MIN_WIDTH = 0.65
const ROLL_FADE = 0.5
const TAIL_SWING = 0.5
const TAIL_SWING_INNER = 0.4
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
const RESPAWN = 4
const RESPAWN_RANGE = 6
const ENTER_OUT = 60
const ENTER_IN = 60
const CULL_MARGIN = 60
//
// The school (createAll): count, sizes, seed.
//
const COUNT = 8
const SET_SIZE = 0.9
const SET_SIZE_RANGE = 0.4
const SET_SEED = 7420
const MODE = { CRUISE: 'cruise', HUNT: 'hunt', JUMP: 'jump', DIVE: 'dive', FLEE: 'flee', GONE: 'gone', ENTER: 'enter', HELD: 'held', BOLT: 'bolt', FORAGE: 'forage' }
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
    joints: Swim.createSpine(SEGMENTS, { x: cfg.x, y, z }, dir, seg),
    heldShape: [],
    heldReach: 0,
    heldFade: 1,
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
    roll: dir,
    lastHeadY: y,
    goneFor: 0,
    stroke: { speed: 0, phase: 0, amp: BEAT_AMP, vert: BEAT_VERT },
    rings: [],
    drops: [],
    shades: Array.from({ length: SHADE_STEPS }, (_, i) => shadeRgb(k, i / (SHADE_STEPS - 1) * C.depthShade)),
    farShade: shadeRgb(k, C.farShade),
    splashRgb: getRGB(k, C.splash),
    sandRgb: getRGB(k, C.sand),
    sand: [],
    peckFor: 0,
    backFor: 0,
    lingerFor: 0,
    v: k.vec2(0, 0),
    mesh: SkinMesh.create({ k, picture: A.picture, scale: cfg.size / TEX_PER_PX, cols: MESH_COLS, rows: MESH_ROWS, joints: MESH_JOINTS, anchor: MESH_ANCHOR, blend: MESH_BLEND }),
    flat: MESH_JOINTS.map(() => ({ x: 0, y: 0 })),
    finAt: { x: 0, y: 0 }
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
  updateSplash(inst, dt)
  updateSand(inst, dt)
  if (inst.mode === MODE.GONE) {
    comeBack(inst, dt)
    return
  }
  if (inst.mode === MODE.HELD) return
  decide(inst, ctx, dt)
  inst.mode === MODE.JUMP ? fly(inst, ctx, dt) : swim(inst, dt)
  Swim.followSpine(inst.joints, inst.h, inst.seg, MAX_BEND)
  inst.facing = Swim.facingOf(inst.joints, inst.facing, BODY_LEN * inst.size * FLIP_EDGE)
  inst.roll += Math.max(-ROLL_RATE * dt, Math.min(ROLL_RATE * dt, inst.facing - inst.roll))
  crossSurface(inst, ctx)
  const picking = inst.mode === MODE.FORAGE && (inst.peckFor > 0 || inst.backFor > 0)
  const gape = picking || (inst.prey && inst.mode === MODE.JUMP && nearPrey(inst, GAPE_R))
  inst.mouth += ((gape ? 1 : 0) - inst.mouth) * Math.min(1, MOUTH_EASE * dt)
  inst.fin += FIN_HZ * FULL_TURN * dt
}

/**
 * The fish is eaten: gone, to swim back in later.
 * @param {Object} inst - Fish instance
 */
export function eat(inst) {
  inst.mode = MODE.GONE
  inst.prey = null
  inst.goneFor = RESPAWN + inst.rng() * RESPAWN_RANGE
}

/**
 * The fish is chased by the giant: it bolts straight on (dir) at its depth.
 * @param {Object} inst - Fish instance
 * @param {number} dir - 1 right, -1 left
 */
export function bolt(inst, dir) {
  const head = inst.joints[0]
  inst.mode = MODE.BOLT
  inst.modeT = 0
  inst.prey = null
  inst.want = BOLT_SPEED
  inst.target.x = Swim.clamp(head.x + dir * BOLT_REACH, inst.minX, inst.maxX)
  inst.target.y = head.y
  inst.target.z = 0
}

/**
 * The fish is seized (in the giant's jaws): it stops swimming and is held
 * until eaten; the giant draws it in its mouth. Its shape as caught (each
 * joint off its middle) is kept, for the jaws to hold it by.
 * @param {Object} inst - Fish instance
 */
export function seize(inst) {
  inst.mode = MODE.HELD
  inst.prey = null
  inst.heldFade = 1
  const m = inst.joints[SEGMENTS >> 1]
  inst.heldShape = inst.joints.map(j => ({ x: j.x - m.x, y: j.y - m.y }))
  inst.heldReach = Math.max(...inst.heldShape.map(o => Math.hypot(o.x, o.y)))
}

/**
 * Holds a seized fish in the jaws: its middle at `at`, its shape as caught
 * turned by `angle` (its thrashing, the head's turn), drawn `share` of its
 * half length on along `dir` (into the mouth, as it is swallowed), fading
 * out from HELD_FADE_FROM of the way in.
 * @param {Object} inst - Fish instance
 * @param {{x: number, y: number}} at - World point (the gullet)
 * @param {number} angle - Turn (rad)
 * @param {{x: number, y: number}} dir - Unit direction into the mouth
 * @param {number} share - 0..1 of its half length
 */
export function hold(inst, at, angle, dir, share) {
  const c = Math.cos(angle)
  const s = Math.sin(angle)
  const ox = at.x + dir.x * share * inst.heldReach
  const oy = at.y + dir.y * share * inst.heldReach
  const fade = Math.max(0, (share - HELD_FADE_FROM) / (1 - HELD_FADE_FROM))
  inst.heldFade = 1 - fade * fade * (3 - 2 * fade)
  inst.joints.forEach((j, i) => {
    const o = inst.heldShape[i]
    j.x = ox + o.x * c - o.y * s
    j.y = oy + o.x * s + o.y * c
  })
}

/**
 * Whether it is feeding under the blue fireflies (in the frenzy, not
 * fleeing) within `reach` px of x along the lake.
 * @param {Object} inst - Fish instance
 * @param {number} x - World X
 * @param {number} reach - Px
 * @returns {boolean}
 */
export function feedsAt(inst, x, reach) {
  const busy = inst.mode === MODE.FLEE || inst.mode === MODE.GONE || inst.mode === MODE.HELD || inst.mode === MODE.BOLT
  return inst.frenzy && !busy && Math.abs(inst.joints[0].x - x) < reach
}

/**
 * The middle of its body while it swims in the lake's water, else null —
 * half of it is in a mouth that reaches this point.
 * @param {Object} inst - Fish instance
 * @returns {{x: number, y: number}|null}
 */
export function middle(inst) {
  return swimmingHead(inst) && inst.joints[SEGMENTS >> 1]
}

/**
 * Its head while it swims in the lake's water (not gone, not leaping, not
 * still behind the bed's wall), else null — what the giant may catch.
 * @param {Object} inst - Fish instance
 * @returns {{x: number, y: number, z: number}|null}
 */
export function swimmingHead(inst) {
  const head = inst.joints[0]
  const out = inst.mode === MODE.GONE || inst.mode === MODE.JUMP || inst.mode === MODE.ENTER || inst.mode === MODE.HELD
  return out || head.x < inst.waterX1 || head.x > inst.waterX2 ? null : head
}

/**
 * Startles it: a splash at x sends it fleeing if it is near.
 * @param {Object} inst - Fish instance
 * @param {number} x - World X of the splash
 */
export function startle(inst, x) {
  if (inst.mode === MODE.JUMP || inst.mode === MODE.GONE || inst.mode === MODE.ENTER || inst.mode === MODE.HELD || inst.mode === MODE.BOLT || Math.abs(inst.joints[0].x - x) > STARTLE_R) return
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
  return inst.mode !== MODE.GONE && inst.mode !== MODE.HELD && head.y < CaveLake.surfaceAt(inst.lake, head.x) + NEAR_SURFACE ? head : null
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
 * Draws the fish (under the water's see-through paint): the far fin, its
 * whole body bent as one mesh, the near fins. A held fish is drawn only by
 * the giant holding it (`held`), in its mouth.
 * @param {Object} inst - Fish instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 * @param {boolean} [held=false] - Drawing it in the giant's mouth
 * @param {Object} [cut] - Held: only what is on this line's kept side shows (what sticks out of the mouth: {x, y, nx, ny}); no side fins
 */
export function onDraw(inst, view, held = false, cut = null) {
  const head = inst.joints[0]
  if (inst.mode === MODE.GONE || (inst.mode === MODE.HELD) !== held || head.x < view.left - CULL_MARGIN || head.x > view.right + CULL_MARGIN || head.y < view.top - CULL_MARGIN || head.y > view.bottom + CULL_MARGIN) return
  const parts = atlasFor.get(inst.k)
  const frame = inst.k.getSprite(SPRITE)?.data?.frames?.[0]
  if (!parts || !frame) return
  const width = ROLL_MIN_WIDTH + (1 - ROLL_MIN_WIDTH) * Math.abs(inst.roll)
  poseMesh(inst, inst.roll < 0 ? -width : width)
  const shade = inst.shades[Math.round((depth(inst) + Z_MAX) / (2 * Z_MAX) * (SHADE_STEPS - 1))] ?? inst.shades[0]
  const opacity = held ? inst.heldFade : 1
  const body = (inst.mouth > HALF ? parts.bodyOpen : parts.body).quad
  if (cut) {
    SkinMesh.onDraw(inst.mesh, frame.tex, body, { color: shade, opacity, cut })
    return
  }
  drawSideFin(inst, parts.pectoral, PECT, inst.farShade, 1, opacity)
  drawBody(inst, frame.tex, body, shade, opacity, width)
  drawSideFin(inst, parts.pelvic, PELV, shade, 0, opacity)
  drawSideFin(inst, parts.pectoral, PECT, shade, 0, opacity)
}

/**
 * Draws the sand it spills picking at the bed (under the water).
 * @param {Object} inst - Fish instance
 */
export function onDrawSand(inst) {
  inst.sand.forEach(g => g.t >= 0 && inst.k.drawRect({ pos: inst.v.set(g.x, g.y), width: SAND_PX, height: SAND_PX, color: inst.sandRgb }))
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
  if (inst.mode === MODE.ENTER) {
    const x = inst.joints[0].x
    x >= inst.minX && x <= inst.maxX && toCruise(inst)
    return
  }
  if (inst.mode === MODE.BOLT) {
    const done = inst.modeT >= BOLT_TIME || Swim.dist3(inst.joints[0], inst.target) < ROAM_ARRIVE
    done && toCruise(inst)
    return
  }
  inst.frenzy = isFeeding(inst, ctx.swarm)
  const head = inst.joints[0]
  const threat = ctx.threats.find(t => Math.abs(t.x - head.x) < FLEE_R && Math.abs(t.y - head.y) < FLEE_R)
  if (threat && inst.mode !== MODE.FLEE) flee(inst, threat.x)
  if (inst.mode === MODE.FLEE) {
    if (Swim.dist3(head, inst.target) < ROAM_ARRIVE || inst.modeT >= FLEE_TIME) toCruise(inst)
    return
  }
  if (inst.mode === MODE.FORAGE) {
    forage(inst, dt)
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
  inst.cooldown <= 0 && (inst.frenzy || inst.rng() >= FORAGE_SHARE ? seekPrey(inst, ctx) : toForage(inst))
  if (inst.mode !== MODE.CRUISE) return
  inst.frenzy ? gather(inst, ctx.swarm) : roam(inst, dt)
}
//
// Off to pick at the bed: a spot on it near by, its snout a little into
// the soil.
//
function toForage(inst) {
  const head = inst.joints[0]
  const x = Swim.clamp(head.x + (inst.rng() * 2 - 1) * FORAGE_REACH, inst.minX, inst.maxX)
  inst.mode = MODE.FORAGE
  inst.modeT = 0
  inst.peckFor = 0
  inst.backFor = 0
  inst.lingerFor = 0
  inst.target.x = x
  inst.target.y = CaveLake.bottomAt(inst.lake, x) + FORAGE_DIG
  inst.target.z = (inst.rng() * 2 - 1) * Z_MAX
  inst.want = CRUISE_SPEED + inst.rng() * CRUISE_SPEED_RANGE
  inst.roamIn = ROAM_TIME + inst.rng() * ROAM_TIME_RANGE
}
//
// On its way down to the bed, then picking at it (hanging there, mouth
// open), then backing off from it tail first; done, it spills the sand
// out and swims on.
//
function forage(inst, dt) {
  const head = inst.joints[0]
  inst.roamIn -= dt
  if (inst.lingerFor > 0) {
    linger(inst, dt)
    return
  }
  if (inst.backFor > 0) {
    backOff(inst, dt)
    return
  }
  if (inst.peckFor > 0) {
    inst.want = HOVER_SPEED
    inst.peckFor -= dt
    inst.peckFor <= 0 && (inst.backFor = BACK_TIME)
    return
  }
  if (head.y >= CaveLake.bottomAt(inst.lake, head.x) + FORAGE_DIG - 1) {
    inst.peckFor = PECK_TIME
    return
  }
  inst.roamIn <= 0 && toCruise(inst)
}
//
// Backing off the bed: the whole fish moved back along its heading (it
// does not swim on meanwhile); once back, the sand comes out and it
// lingers.
//
function backOff(inst, dt) {
  inst.want = 0
  inst.speed = 0
  const step = BACK_SPEED * dt
  inst.joints.forEach(j => {
    j.x -= inst.h.x * step
    j.y -= inst.h.y * step
    j.z -= inst.h.z * step
  })
  inst.backFor -= dt
  if (inst.backFor > 0) return
  spillSand(inst)
  inst.lingerFor = LINGER + inst.rng() * LINGER_RANGE
}
//
// Hanging over the bed after picking at it, facing on the way it faced,
// drifting back ever so slowly; then off again.
//
function linger(inst, dt) {
  const head = inst.joints[0]
  const step = LINGER_BACK * dt
  inst.joints.forEach(j => {
    j.x -= inst.h.x * step
    j.y -= inst.h.y * step
    j.z -= inst.h.z * step
  })
  inst.want = 0
  inst.target.x = head.x + inst.h.x * LINGER_LOOK
  inst.target.y = head.y + inst.h.y * LINGER_LOOK
  inst.target.z = head.z + inst.h.z * LINGER_LOOK
  inst.lingerFor -= dt
  inst.lingerFor <= 0 && toCruise(inst)
}
//
// Sand out of its mouth, thrown back and a little up.
//
function spillSand(inst) {
  const head = inst.joints[0]
  const back = -Math.sign(inst.h.x) || -inst.facing
  const count = SAND_COUNT + Math.floor(inst.rng() * (SAND_COUNT_RANGE + 1))
  for (let i = 0; i < count; i++) {
    inst.sand.push({ x: head.x, y: head.y, vx: back * SAND_BACK * inst.rng(), vy: -SAND_UP * inst.rng(), t: -i * SAND_GAP })
  }
}
//
// The grains (each waiting at the mouth for its turn) slow down and sink
// back onto the bed.
//
function updateSand(inst, dt) {
  if (!inst.sand.length) return
  const drag = Math.exp(-SAND_DRAG * dt)
  const head = inst.joints[0]
  inst.sand.forEach(g => {
    g.t += dt
    if (g.t < 0) {
      g.x = head.x
      g.y = head.y
      return
    }
    g.vx *= drag
    g.vy = g.vy * drag + SAND_SINK * (1 - drag)
    g.x += g.vx * dt
    g.y += g.vy * dt
  })
  inst.sand = inst.sand.filter(g => g.t < SAND_LIFE && g.y < CaveLake.bottomAt(inst.lake, g.x))
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
  const surface = CaveLake.surfaceAt(inst.lake, Swim.clamp(swarm.x, inst.minX, inst.maxX))
  return swarm.y < surface && swarm.y > surface - FRENZY_HIGH
}
//
// In the frenzy, waiting for its leap: up under the swarm, each fish at
// its own spot along it.
//
function gather(inst, swarm) {
  const x = Swim.clamp(swarm.x + inst.gatherDx, inst.minX, inst.maxX)
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
  const x = Swim.clamp(head.x + way * FLEE_REACH, inst.minX, inst.maxX)
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
  const there = Swim.dist3(head, inst.target) < ROAM_ARRIVE
  if (there && head.y < bottomFor(inst, head.x) - ROAM_BED && inst.rng() < HOVER_CHANCE) {
    inst.hoverIn = HOVER_TIME + inst.rng() * HOVER_TIME_RANGE
    return
  }
  if (there || inst.roamIn <= 0) pickRoam(inst)
}
function pickRoam(inst) {
  const head = inst.joints[0]
  if (inst.mode === MODE.CRUISE && !inst.frenzy && inst.rng() < FORAGE_CHANCE) {
    toForage(inst)
    return
  }
  const x = Swim.clamp(head.x + (inst.rng() * 2 - 1) * ROAM_REACH, inst.minX, inst.maxX)
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
  inst.target.x = Swim.clamp(p.x - side * LAUNCH_BACK * inst.size, inst.minX, inst.maxX)
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
  inst.vel.x = Swim.clamp((p.x - head.x) / time, -LEAP_VX, LEAP_VX)
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
  Swim.setDir(inst.h, inst.vel.x, inst.vel.y, 0)
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
  if (Math.hypot(want.x, want.y, want.z) > 1) {
    Swim.setDir(want, want.x, want.y, want.z)
    Swim.setDir(want, want.x, Swim.clamp(want.y, -MAX_PITCH, MAX_PITCH), want.z)
    const fast = inst.frenzy || inst.mode === MODE.HUNT || inst.mode === MODE.FLEE || inst.mode === MODE.BOLT
    Swim.turnToward(inst.h, want, (fast ? TURN_RATE_FAST : TURN_RATE) * dt, inst.turnSide)
  }
  inst.speed += Swim.clamp(inst.want - inst.speed, -ACCEL * dt, ACCEL * dt)
  inst.beat += (BEAT_HZ + BEAT_HZ_PER_SPEED * inst.speed) * FULL_TURN * dt
  inst.stroke.speed = inst.speed
  inst.stroke.phase = inst.beat
  inst.stroke.amp = BEAT_AMP * Math.min(1, HOVER_BEAT + inst.speed / CRUISE_SPEED)
  Swim.swimHead(head, inst.h, inst.stroke, dt)
  keepInWater(inst)
}
function keepInWater(inst) {
  const head = inst.joints[0]
  head.z = Swim.clamp(head.z, -Z_MAX, Z_MAX)
  if (inst.mode === MODE.ENTER) return
  const dive = inst.mode === MODE.DIVE
  head.x = Swim.clamp(head.x, dive ? inst.waterX1 : inst.minX, dive ? inst.waterX2 : inst.maxX)
  const pad = inst.frenzy || inst.mode === MODE.HUNT ? APPROACH_DEPTH - LAUNCH_Y : TOP_PAD
  const top = dive ? -Infinity : topFor(inst, head.x, pad)
  const bottom = inst.mode === MODE.FORAGE ? CaveLake.bottomAt(inst.lake, head.x) + FORAGE_DIG : bottomFor(inst, head.x)
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
// Eaten fish come back: after RESPAWN..+RANGE s one swims in from behind
// the lake's bed wall on either side, ENTER_OUT px past the water's end,
// at a depth of the deep water, toward a spot ENTER_IN px inside.
//
function comeBack(inst, dt) {
  inst.goneFor -= dt
  if (inst.goneFor > 0) return
  const side = inst.rng() < HALF ? -1 : 1
  const dir = -side
  const x = side < 0 ? inst.waterX1 - ENTER_OUT : inst.waterX2 + ENTER_OUT
  const inX = side < 0 ? inst.minX : inst.maxX
  const top = topFor(inst, inX, TOP_PAD)
  const bottom = Math.max(top, bottomFor(inst, inX) - ROAM_BED)
  const head = { x, y: top + (bottom - top) * inst.rng(), z: (inst.rng() * 2 - 1) * Z_MAX }
  inst.joints = Swim.createSpine(SEGMENTS, head, dir, inst.seg)
  Swim.setDir(inst.h, dir, 0, 0)
  inst.facing = dir
  inst.roll = dir
  inst.mode = MODE.ENTER
  inst.modeT = 0
  inst.speed = CRUISE_SPEED
  inst.want = CRUISE_SPEED + CRUISE_SPEED_RANGE
  inst.target.x = inX + dir * ENTER_IN
  inst.target.y = head.y
  inst.target.z = head.z
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
  inst.target.x = Swim.clamp(head.x + Math.sign(inst.vel.x || inst.facing) * DIVE_DOWN, inst.minX, inst.maxX)
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
// The fish's spine as seen from the side laid into its mesh: the body and
// its tail fan bend as one piece, the fan swinging in depth with its beat
// (its last two bones foreshortened: the mesh squeezes the fan along
// them); `roll` its picture's width across the spine (signed: the side
// shown).
//
function poseMesh(inst, roll) {
  inst.joints.forEach((j, i) => {
    inst.flat[i].x = j.x
    inst.flat[i].y = j.y
  })
  const swing = TAIL_SWING * Math.sin(inst.beat)
  const inner = Math.cos(swing * TAIL_SWING_INNER)
  foreshorten(inst.flat[SEGMENTS - 2], inst.flat[SEGMENTS - 1], inner)
  foreshorten(inst.flat[SEGMENTS - 2], inst.flat[SEGMENTS], inner)
  foreshorten(inst.flat[SEGMENTS - 1], inst.flat[SEGMENTS], Math.cos(swing))
  SkinMesh.setJoints(inst.mesh, { joints: inst.flat, mirrored: false, roll })
}
//
// A bone seen turned away from the eye: its far joint drawn in toward its
// near one by `share` of the bone.
//
function foreshorten(near, far, share) {
  far.x = near.x + (far.x - near.x) * share
  far.y = near.y + (far.y - near.y) * share
}
//
// The body drawn; within ROLL_FADE of edge-on the side it rolls to drawn
// over the other, showing more the further it has rolled.
//
function drawBody(inst, tex, quad, shade, opacity, width) {
  if (Math.abs(inst.roll) >= ROLL_FADE) {
    SkinMesh.onDraw(inst.mesh, tex, quad, { color: shade, opacity })
    return
  }
  const u = (inst.roll + ROLL_FADE) / (2 * ROLL_FADE)
  poseMesh(inst, -width)
  SkinMesh.onDraw(inst.mesh, tex, quad, { color: shade, opacity })
  poseMesh(inst, width)
  SkinMesh.onDraw(inst.mesh, tex, quad, { color: shade, opacity: opacity * u * u * (3 - 2 * u) })
  poseMesh(inst, inst.roll < 0 ? -width : width)
}
//
// A side fin at its root on the body (skinned with it), turned with its
// bone and flapping (`phase` puts the far fin half a beat off), mirrored
// with the body.
//
function drawSideFin(inst, fin, at, color, phase, opacity) {
  SkinMesh.pointAt(inst.mesh, at.px, inst.finAt)
  const bone = Math.min(SEGMENTS - 1, Math.floor((1 - at.u) * SEGMENTS))
  const turn = inst.mesh.pose.turns[bone] * DEG + at.rest + at.flap * Math.sin(inst.fin + phase * Math.PI)
  const mirrored = inst.roll < 0
  const scale = inst.size / TEX_PER_PX
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: fin.quad,
    width: fin.w * scale,
    height: fin.h * scale * Math.abs(inst.roll),
    pos: inst.v.set(inst.finAt.x, inst.finAt.y),
    anchor: mirrored ? fin.anchorMirrored : fin.anchor,
    angle: mirrored ? -turn : turn,
    flipX: mirrored,
    color,
    opacity
  })
}
function shadeRgb(k, amount) {
  const c = Math.round(255 * (1 - amount))
  return k.rgb(c, c, c)
}
//
// The atlas: painted once per page, grained, loaded once per live k as
// its own texture; the whole fish (shut and gaping) and the side fins
// with their quads (and a fin's anchors at its root, as painted and
// mirrored).
//
function bake(k) {
  if (atlasFor.has(k)) return
  atlas ??= buildAtlas()
  k.loadSprite(SPRITE, atlas.canvas, { singular: true, filter: 'linear' })
  atlasFor.set(k, {
    body: atlas.parts.body,
    bodyOpen: atlas.parts.bodyOpen,
    pectoral: finOf(k, atlas.parts.pectoral, A.pectRoot),
    pelvic: finOf(k, atlas.parts.pelvic, A.pelvRoot)
  })
}
function buildAtlas() {
  const { canvas, parts } = paintFishAtlas()
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return { canvas, parts: Object.fromEntries(Object.entries(parts).map(([name, p]) => [name, quadOf(p, canvas)])) }
}
function quadOf(p, canvas) {
  return { quad: { x: p.x / canvas.width, y: p.y / canvas.height, w: p.w / canvas.width, h: p.h / canvas.height }, w: p.w, h: p.h }
}
//
// A side fin's root on the whole picture (from its u and offset) with its
// rest angle and flap.
//
function finAt(at, rest, flap) {
  return { u: at.u, px: { x: A.bodyX + at.u * A.texL, y: A.mid + at.dy }, rest, flap }
}
function finOf(k, part, root) {
  const ax = root.x / part.w * 2 - 1
  const ay = root.y / part.h * 2 - 1
  return { ...part, anchor: k.vec2(ax, ay), anchorMirrored: k.vec2(-ax, ay) }
}
