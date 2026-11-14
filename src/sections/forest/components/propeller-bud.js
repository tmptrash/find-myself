import * as BudPicture from '../utils/forest-propeller-bud-picture.js'
import * as Sound from '../../../utils/sound.js'
import { FOREST_CFG } from '../cfg.js'
import { FOREST_PAL } from '../utils/forest-palette.js'
import { getRGB } from '../../../utils/helper.js'
import * as PolyBatch from '../../../utils/poly-batch.js'

//
// Propeller bud ("Valera"): a leafy cone with a hooded head and a seed
// propeller on a stalk over it. It goes through a row of stops (a branch
// or the ground), sitting with two root-paws curled over the wood or dug
// into the soil, asleep and breathing while the hero is far; near, it
// wakes and its light pupils dart about the black eyes, coming back to him
// now and then. Once he gets to its stop (a branch stop: he stands on it;
// a ground stop: he comes close, or its own check says so), it pulls its
// paws in and flies on to the next stop, gliding along one smooth,
// looping arc on the way. From the last one it flies off to its exit and
// is gone for good (with no exit it goes round its stops; a resting bud
// leaves each one after a random rest instead). In the air the propeller is the
// moving point and the body hangs under it on a slack rope, so the body
// trails the propeller, bows the rope, and squashes under the pull of a
// turn or a stop. The head is drawn turned right; flying left, the
// whole bud is mirrored.
//
const STATES = {
  SIT: 'sit',
  ROOTS_IN: 'rootsIn',
  FLY: 'fly',
  LAND: 'land',
  ROOTS_OUT: 'rootsOut',
  GONE: 'gone'
}
export const PERCH = {
  GROUND: 'ground',
  BRANCH: 'branch',
  EXIT: 'exit'
}
const PARAMS = FOREST_CFG.propellerBud
const COLORS = FOREST_PAL.propellerBud
//
// Stalk and root widths below are px for a SIZE_REF_HEAD px head; SIZE
// scales them with the real one, so the whole bud shrinks or grows together.
//
const SIZE_REF_HEAD = 48
const SIZE = PARAMS.headSize / SIZE_REF_HEAD
const RAD_TO_DEG = 180 / Math.PI
const MAX_FRAME_DT = 0.1
//
// It turns to face its flight once the hub moves sideways faster than
// FACE_MIN_V px/s; on a perch it turns its head to a hero within
// wakeReach (once he is FACE_HERO_DEAD px to one side) and else keeps
// its side.
//
const FACE_MIN_V = 40
const FACE_HERO_DEAD = 12
//
// The propeller's whirr is heard while it spins, fading out over
// HUM_HEAR_REACH px from the hero (squared falloff); it whirrs faster by
// HUM_RATE_PER_V per px/s of the hub's speed.
//
const HUM_HEAR_REACH = 750
const HUM_RATE_PER_V = 0.0009
//
// The stick is a short rope: STICK_SHARE of the head's radius, from the
// crown up to the propeller's hub. Its middle lags the swing (ROPE_FROM_W
// px per rad/s) and the flight (ROPE_FROM_V px per px/s), sprung, so it
// bows instead of staying a bar. The hub flies
// the arc; the body is a pendulum of length stick + COM_DROP (shares of
// the radius) under it. HANG_G pulls it straight down, HANG_DRAG
// (quadratic, so a fast cruise leans it back without killing the swing)
// trails it behind the hub's velocity, and HANG_DAMP lets it sway a few
// times before it hangs still. The hub's own acceleration is smoothed
// (ACCEL_SMOOTH) so a bend in the arc doesn't kick the pendulum for one
// frame. The body is soft: extra pull along the rope squashes it
// (SQUASH_ACCEL px/s² for a full squash, up to SQUASH_MAX) and a light
// load stretches it; a push across the rope bends it round its neck
// against the push (BEND_ACCEL px/s² per rad, up to BEND_MAX). Both are
// underdamped springs, so a turn or a stop leaves the body jiggling.
//
const STICK_SHARE = 1.15
const ROPE_FROM_W = 26
const ROPE_FROM_V = 0.045
const ROPE_MAX = 20
const ROPE_STIFF = 22
const ROPE_DAMP = 6
const ROPE_SEGMENTS = 12
//
// The stalk's look: STALK_W_BASE px thick at the head down to STALK_W_TIP
// at the hub, fibres winding STALK_TWISTS times across STALK_FIBRE_REACH of
// its width, a knot at STALK_KNOT_AT of its length and a twig stub at
// STALK_STUB_AT.
//
const STALK_W_BASE = 4.6 * SIZE
const STALK_W_TIP = 2.8 * SIZE
const STALK_OUTLINE = 1.4 * SIZE
const STALK_TWISTS = 1.1
const STALK_FIBRE_REACH = 0.3
const STALK_FIBRE_W = 0.8 * SIZE
const STALK_FIBRES = [
  { phase: 0, light: true },
  { phase: Math.PI * 0.7, light: false },
  { phase: Math.PI * 1.35, light: true }
]
const STALK_KNOT_AT = 0.42
const STALK_KNOT_SHIFT = 0.35
const STALK_KNOT_R = 0.42
const STALK_KNOT_LIT = 0.5 * SIZE
const STALK_STUB_AT = 0.66
const STALK_STUB_LEN = 4 * SIZE
const STALK_STUB_RISE = 2 * SIZE
const STALK_STUB_W = 1.4 * SIZE
const SQUASH_ACCEL = 1300
const SQUASH_MAX = 0.2
const STRETCH_MAX = 0.12
const SQUASH_STIFF = 170
const SQUASH_DAMP = 8
const SQUASH_WIDEN = 0.6
const BEND_ACCEL = 2600
const BEND_MAX = 0.26
const BEND_STIFF = 150
const BEND_DAMP = 7
const COM_DROP = 1.35
const HANG_G = 1600
const HANG_DRAG = 0.018
const HANG_DAMP = 0.65
const HANG_MAX = 1.05
const HANG_W_MAX = 7
const ACCEL_SMOOTH = 12
const HANG_SETTLE = 0.02
const HANG_W_SETTLE = 0.2
const LAND_EXTRA_DAMP = 2.5
//
// Share of the landing descent after which the bud counts as practically
// landed (the film's camera goes to it then).
//
const NEARLY_LANDED_AT = 0.8
const LAND_FORCE_AFTER = 2.4
//
// The propeller stays nearly level (a small lean with its speed) while the
// stick takes the hang angle.
//
const PROP_TILT_PER_V = 0.00035
const PROP_TILT_MAX = 0.18
const PROP_TILT_SNAP = 4
const FRAME_COUNT = 6
//
// Flight of the hub: a lift, then ROUTE_MIN..MAX waypoints and at last a
// hover LAND_CLEAR px over the spot, all joined into one smooth curve
// (centripetal Catmull-Rom through them, SPLINE_STEPS straight bits per
// span) that it flies without stopping. A waypoint lies WANDER_X px either
// side of the straight way and anywhere from the lower end up to RISE_MAX
// px over the higher one, but never more than ROUTE_HEADROOM px over the
// hover above the higher of its two stops or ROUTE_LIFT_ROOM px over the
// lift, whichever is higher (so it stays in view); with BACKTRACK_CHANCE it
// is BACK_MIN..MAX px the other way instead, so it still loops about. The
// route stays within ROUTE_MARGIN px of its spots. Speed builds up and
// eases off along the curve (flyAccel) and slows over the last FLIGHT_RAMP
// px, never under FLIGHT_MIN_V, so it glides in rather than jerks.
//
const TAKEOFF_LIFT = 84
const ROUTE_MIN = 2
const ROUTE_MAX = 4
const WANDER_X = 110
const RISE_MAX = 90
const ROUTE_HEADROOM = 30
const ROUTE_LIFT_ROOM = 40
const BACKTRACK_CHANCE = 0.35
const BACK_MIN = 80
const BACK_MAX = 200
const ROUTE_MARGIN = 120
const SPLINE_STEPS = 16
const SPLINE_ALPHA = 0.5
const SPLINE_EPS = 1e-4
const LAND_CLEAR = 28
const FLIGHT_RAMP = 150
const FLIGHT_MIN_V = 90
const FLIGHT_ARRIVE = 2
//
// Light pupils in the painted black eyes dart like an insect's: a new
// spot every DART_MIN..MAX s (snapping there at EYE_SNAP), and with a hero
// within wakeReach, HERO_CHANCE of the darts go back to him and stay on him
// HERO_HOLD_MIN..MAX s (all the way round once he is EYE_LOOK_FULL px off).
// Asleep, the pupils fade out (EYE_OPEN_SPEED).
//
const DART_MIN = 0.12
const DART_MAX = 0.45
const EYE_SNAP = 32
const HERO_CHANCE = 0.45
const HERO_HOLD_MIN = 0.6
const HERO_HOLD_MAX = 1.4
const EYE_LOOK_FULL = 90
const EYE_OPEN_SPEED = 2.5
//
// Asleep on its perch it breathes once every BREATH_SEC with its stalk
// alone — the body stays still: the stalk's tip leans BREATH_TIP_X px to
// the side, bowing BREATH_BOW px, and the propeller tips over BREATH_PROP_TILT
// rad. Falling asleep and waking take SLEEP_FADE_SEC.
//
const BREATH_SEC = 2.2
const BREATH_TIP_X = 1.5 * SIZE
const BREATH_BOW = 1.6 * SIZE
const BREATH_PROP_TILT = 0.09
const SLEEP_FADE_SEC = 1.2
//
// Two root-legs (the right one given; the left mirrors it). Points are
// shares of the head's radius from the feet: a tapering leg with a knee
// and an ankle (knobbed joints), side rootlets, three toes and fine
// hairs at their tips. In the ground they reach down; on a branch they
// hook over the wood and curl under it. Each segment grows in at its
// level (leg, then shin and rootlets, then toes) and pulls back the
// other way. Points are jittered by LEG_JITTER on every planting.
//
const GROUND_LEG = {
  pts: [[0.5, 0], [0.68, 0.32], [0.84, 0.66], [0.82, 1.0], [1.12, 1.22], [1.3, 1.34], [0.9, 1.38], [0.56, 1.26], [1.02, 0.36], [0.62, 0.8], [1.42, 1.28], [0.94, 1.54]],
  segs: [[0, 1, 4.8, 0], [1, 2, 4, 0], [2, 3, 3.2, 1], [1, 8, 1.1, 1], [2, 9, 1.1, 1], [3, 4, 2.4, 2], [4, 5, 1.6, 2], [3, 6, 2, 2], [3, 7, 1.8, 2], [5, 10, 0.9, 2], [6, 11, 0.9, 2]],
  knobs: [1, 2, 3]
}
const BRANCH_LEG = {
  pts: [[0.5, -0.3], [0.95, -0.05], [1.15, 0.35], [1.05, 0.72], [0.72, 0.88], [0.88, 1.02], [1.2, 0.98], [1.38, 0], [1.42, 0.5], [0.6, 0.8]],
  segs: [[0, 1, 4.6, 0], [1, 2, 3.9, 0], [2, 3, 3.2, 1], [1, 7, 1.1, 1], [2, 8, 1.1, 1], [3, 4, 2.2, 2], [3, 5, 2, 2], [3, 6, 1.7, 2], [4, 9, 0.9, 2]],
  knobs: [1, 2, 3]
}
const LEG_LEVELS = 3
const LEG_JITTER = 0.06
const KNOB_SHARE = 0.62
const LIT_MIN_W = 2.4 * SIZE
const LIT_SHIFT = 0.22
const LIT_W_SHARE = 0.3
const LIT_MIN_LINE = 0.8
const ROOT_OUTLINE = 1.6 * SIZE
const ROOT_TUCK = 2 * SIZE
const pictureByK = new WeakMap()

/**
 * Creates the bud sitting at one of its stops. Needs load(k) to have
 * resolved first. Each stop is where it sits and what chases it on: a stop
 * with heroOn leaves once that check is true, any other once the hero
 * comes within fleeReach. From the last stop it flies to the exit and is
 * gone (stops.length as the start stop means it is already gone).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<{x: number, y: number, perch: string, heroOn?: Function}>} cfg.stops - Its stops in order (perch: PERCH.BRANCH or PERCH.GROUND; y the surface it stands on)
 * @param {{x: number, y: number}|null} [cfg.exit=null] - Where its hub flies off to from the last stop (out of view); without one it flies from the last stop back to the first, round and round
 * @param {{min: number, max: number}|null} [cfg.rest=null] - With it, the bud ignores the hero and leaves every stop after a random rest of min..max seconds
 * @param {number} [cfg.scale=1] - Drawn size (a scene painted smaller than the level); the bud lives in its own space, its stops, exit and hero given there (screen / scale)
 * @param {number} [cfg.startStop=0] - Stop it starts at
 * @param {Function} cfg.getHeroPos - () => {x, y} of the hero's middle, or null
 * @param {Function} [cfg.isVisible] - () => boolean; hidden and still while false
 * @param {Object} [cfg.sound] - Sound instance for its propeller's whirr
 * @param {number} [cfg.humFloor=0] - Least loudness (0..1) of the whirr however far the hero is (a backdrop where no hero walks by)
 * @param {number} cfg.z - Draw layer of the bud
 * @param {number} cfg.rootsZ - Draw layer of its roots under the ground
 * @returns {Object|null} Bud inst (null if its picture is not baked, it has no stops or it is gone)
 */
export function create(cfg) {
  const { k, stops, exit = null, rest = null, scale = 1, startStop = 0, getHeroPos, isVisible = () => true } = cfg
  const look = pictureByK.get(k)
  if (!look || startStop >= stops.length) return null
  const home = stops[startStop]
  const spanXs = [...stops.map(stop => stop.x), ...(exit ? [exit.x] : [])]
  const inst = {
    k,
    look,
    stops,
    scale,
    batch: PolyBatch.create(),
    posScratch: k.vec2(0, 0),
    anchorScratch: k.vec2(0, 0),
    scaleScratch: k.vec2(1, 1),
    spineScratch: Array.from({ length: ROPE_SEGMENTS + 1 }, () => ({ x: 0, y: 0, nx: 0, ny: 0, w: 0, u: 0 })),
    fibreScratch: Array.from({ length: ROPE_SEGMENTS + 1 }, () => ({ x: 0, y: 0 })),
    exit,
    rest,
    stop: startStop,
    getHeroPos,
    isVisible,
    sound: cfg.sound,
    humFloor: cfg.humFloor ?? 0,
    routeMinX: Math.min(...spanXs) - ROUTE_MARGIN,
    routeMaxX: Math.max(...spanXs) + ROUTE_MARGIN,
    stickColor: getRGB(k, COLORS.stick),
    stickDarkColor: getRGB(k, COLORS.stickDark),
    stickLightColor: getRGB(k, COLORS.stickLight),
    rootColor: getRGB(k, COLORS.root),
    rootDarkColor: getRGB(k, COLORS.rootDark),
    rootLightColor: getRGB(k, COLORS.rootLight),
    state: STATES.SIT,
    perch: home.perch,
    goal: null,
    x: home.x,
    y: home.y,
    tilt: 0,
    facing: 1,
    legs: buildLegs(legShape(home.perch)),
    rootGrow: 1,
    prop: null,
    propPrevVx: 0,
    propPrevVy: 0,
    ax: 0,
    ay: 0,
    hang: 0,
    hangW: 0,
    rope: 0,
    ropeV: 0,
    squash: 0,
    squashV: 0,
    bend: 0,
    bendV: 0,
    propTilt: 0,
    curve: null,
    landFrom: null,
    landT: 0,
    spin: false,
    frame: 0,
    frameT: 0,
    awake: false,
    sleep: 1,
    breathT: 0,
    breath: 0,
    restLeft: 0,
    eye: { open: 0, x: 0, y: 0, tx: 0, ty: 0, dartLeft: 0, onHero: false }
  }
  inst.restLeft = pickRest(inst)
  const rootsObj = k.add([k.pos(0, 0), k.scale(scale), k.z(cfg.rootsZ), { draw() { onDrawRoots(inst) } }])
  const obj = k.add([k.pos(0, 0), k.scale(scale), k.z(cfg.z), { draw() { onDraw(inst) } }])
  obj.onUpdate(() => onUpdate(inst))
  inst.layers = [rootsObj, obj]
  return inst
}

/**
 * The stop the bud sits at or flies to (stops.length once it is leaving or
 * gone), to save and start from next time.
 * @param {Object} inst - Bud inst
 * @returns {number}
 */
export function stopIndex(inst) {
  return inst.stop
}

/**
 * True while the bud is taking off, flying, landing or settling its roots
 * (not while it sits or is gone).
 * @param {Object} inst - Bud inst
 * @returns {boolean}
 */
export function isMoving(inst) {
  return inst.state === STATES.ROOTS_IN || inst.state === STATES.FLY ||
    inst.state === STATES.LAND || inst.state === STATES.ROOTS_OUT
}

/**
 * True once the bud has practically landed: its descent is past
 * NEARLY_LANDED_AT of the way down, or it is already planting its roots.
 * @param {Object} inst - Bud inst
 * @returns {boolean}
 */
export function isNearlyLanded(inst) {
  if (inst.state === STATES.ROOTS_OUT) return true
  return inst.state === STATES.LAND && inst.landT / PARAMS.landDuration >= NEARLY_LANDED_AT
}

/**
 * Where the bud's head is in the world (for others to look at), written into
 * out; null while it is hidden.
 * @param {Object} inst - Bud inst
 * @param {{x: number, y: number}} out - Point to fill
 * @returns {{x: number, y: number}|null}
 */
export function headPos(inst, out) {
  if (!inst.isVisible()) return null
  const head = headWorld(inst)
  out.x = head.x * inst.scale
  out.y = head.y * inst.scale
  return out
}

/**
 * Bakes the bud's picture once per live k (waits for it to load).
 * @param {Object} k - Kaplay instance
 * @returns {Promise<Object|null>} The bake (null if it failed to load)
 */
export async function load(k) {
  const cached = pictureByK.get(k)
  if (cached) return cached
  const look = await BudPicture.load(k, PARAMS.headSize, COLORS.pupil)
  look && pictureByK.set(k, look)
  return look
}
//
// One frame: what it does, then how the propeller turns, which way it
// faces, whether it sleeps and where its pupils dart.
//
function onUpdate(inst) {
  if (inst.state === STATES.GONE || !inst.isVisible()) return
  const dt = Math.min(inst.k.dt(), MAX_FRAME_DT)
  if (dt <= 0) return
  const hero = inst.getHeroPos()
  tickState(inst, dt, hero)
  //
  // Gone this very frame: the hum must not start up again after leave().
  //
  if (inst.state === STATES.GONE) return
  updateRope(inst, dt)
  updateSquash(inst, dt)
  updatePropeller(inst, dt)
  updatePropTilt(inst, dt)
  updateFacing(inst, hero)
  updateSleep(inst, dt, hero)
  updateEyes(inst, dt, hero)
  updateHum(inst, hero)
}
function tickState(inst, dt, hero) {
  switch (inst.state) {
    case STATES.SIT: return tickSit(inst, dt, hero)
    case STATES.ROOTS_IN: return tickRootsIn(inst, dt)
    case STATES.FLY: return tickFly(inst, dt)
    case STATES.LAND: return tickLand(inst, dt)
    case STATES.ROOTS_OUT: return tickRootsOut(inst, dt)
  }
}
//
// Once the hero gets to its stop it flies on to the next one, or off to
// the exit from the last.
//
function tickSit(inst, dt, hero) {
  if (!readyToLeave(inst, dt, hero)) return
  if (!inst.exit) {
    inst.stop = (inst.stop + 1) % inst.stops.length
    takeOff(inst, inst.stops[inst.stop])
    return
  }
  inst.stop += 1
  takeOff(inst, inst.stops[inst.stop] ?? { x: inst.exit.x, y: inst.exit.y, perch: PERCH.EXIT })
}
//
// Resting: it stays its rest out. Else the hero chasing it on: his check
// at the stop, or him coming close.
//
function readyToLeave(inst, dt, hero) {
  if (inst.rest) {
    inst.restLeft -= dt
    return inst.restLeft <= 0
  }
  if (!hero) return false
  const here = inst.stops[inst.stop]
  return here.heroOn ? here.heroOn() : heroDistance(inst, hero) < PARAMS.fleeReach
}
function pickRest(inst) {
  return inst.rest ? randomIn(inst.rest.min, inst.rest.max) : 0
}
//
// The propeller starts at once; the paws let go before the hub lifts.
//
function takeOff(inst, goal) {
  inst.goal = goal
  inst.spin = true
  inst.state = STATES.ROOTS_IN
}
function tickRootsIn(inst, dt) {
  inst.rootGrow = Math.max(0, inst.rootGrow - dt / PARAMS.rootRetract)
  inst.rootGrow <= 0 && startFlight(inst)
}
function startFlight(inst) {
  const rest = propAboveFeet(inst)
  inst.prop = { x: rest.x, y: rest.y, vx: 0, vy: 0 }
  inst.propPrevVx = 0
  inst.propPrevVy = 0
  inst.ax = 0
  inst.ay = 0
  inst.hang = 0
  inst.hangW = 0
  const start = { x: inst.prop.x, y: inst.prop.y }
  const lift = { x: start.x, y: start.y - TAKEOFF_LIFT }
  inst.curve = curveOf(splineThrough([start, lift, ...buildRoute(inst, lift)]))
  inst.state = STATES.FLY
}
//
// Waypoints after the lift: a few points round the way (now and then back
// the other way), then the hover over the spot (or the exit point itself).
//
function buildRoute(inst, lift) {
  const end = flightEnd(inst)
  const dir = Math.sign(end.x - lift.x) || 1
  const low = Math.max(lift.y, end.y)
  const fromHover = lift.y + TAKEOFF_LIFT - LAND_CLEAR
  const ceiling = Math.min(Math.min(fromHover, end.y) - ROUTE_HEADROOM, lift.y - ROUTE_LIFT_ROOM)
  const count = ROUTE_MIN + Math.floor(Math.random() * (ROUTE_MAX - ROUTE_MIN + 1))
  const route = []
  for (let i = 1; i <= count; i++) {
    const u = i / (count + 1)
    const back = Math.random() < BACKTRACK_CHANCE
    const x = back ? lift.x - dir * randomIn(BACK_MIN, BACK_MAX) : lift.x + (end.x - lift.x) * u + randomIn(-WANDER_X, WANDER_X)
    const y = randomIn(Math.min(lift.y, end.y) - RISE_MAX, low)
    route.push({ x: clampRange(x, inst.routeMinX, inst.routeMaxX), y: clampRange(y, ceiling, low) })
  }
  route.push(end)
  return route
}
//
// A smooth curve through the points (centripetal Catmull-Rom, so it never
// loops or cusps on uneven spacing), sampled in SPLINE_STEPS bits per span.
// The ends are mirrored so the curve leaves and reaches them head-on.
//
function splineThrough(points) {
  const ext = [mirror(points[1], points[0]), ...points, mirror(points[points.length - 2], points[points.length - 1])]
  const pts = [points[0]]
  for (let i = 1; i < ext.length - 2; i++) {
    for (let j = 1; j <= SPLINE_STEPS; j++) pts.push(catmullRom(ext[i - 1], ext[i], ext[i + 1], ext[i + 2], j / SPLINE_STEPS))
  }
  return pts
}
function mirror(p, about) {
  return { x: about.x * 2 - p.x, y: about.y * 2 - p.y }
}
function catmullRom(p0, p1, p2, p3, u) {
  const t1 = knot(p0, p1)
  const t2 = t1 + knot(p1, p2)
  const t3 = t2 + knot(p2, p3)
  const t = t1 + (t2 - t1) * u
  const a1 = lerpAt(p0, p1, 0, t1, t)
  const a2 = lerpAt(p1, p2, t1, t2, t)
  const a3 = lerpAt(p2, p3, t2, t3, t)
  const b1 = lerpAt(a1, a2, 0, t2, t)
  const b2 = lerpAt(a2, a3, t1, t3, t)
  return lerpAt(b1, b2, t1, t2, t)
}
function knot(a, b) {
  return Math.max(SPLINE_EPS, Math.pow(Math.hypot(b.x - a.x, b.y - a.y), SPLINE_ALPHA))
}
function lerpAt(a, b, ta, tb, t) {
  const u = (t - ta) / (tb - ta)
  return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }
}
function curveOf(pts) {
  const lens = []
  let total = 0
  for (let i = 1; i < pts.length; i++) {
    const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y)
    lens.push(len)
    total += len
  }
  return { pts, lens, total, s: 0, v: 0 }
}
function pointAlong(curve, s) {
  let left = s
  for (let i = 0; i < curve.lens.length; i++) {
    if (left > curve.lens[i]) {
      left -= curve.lens[i]
      continue
    }
    const u = curve.lens[i] ? left / curve.lens[i] : 0
    const a = curve.pts[i]
    const b = curve.pts[i + 1]
    return { x: a.x + (b.x - a.x) * u, y: a.y + (b.y - a.y) * u }
  }
  return curve.pts[curve.pts.length - 1]
}
//
// Glides along the whole curve, then lands (or is gone at the exit). The
// hang steps off the hub's real frame-to-frame velocity, so the body sways
// through the turns.
//
function tickFly(inst, dt) {
  stepPropAlong(inst, dt)
  stepHang(inst, dt, 0)
  applyHang(inst)
  if (inst.curve.total - inst.curve.s > FLIGHT_ARRIVE) return
  inst.goal.perch === PERCH.EXIT ? leave(inst) : startLand(inst)
}
//
// Out of view at the exit: it stops whirring and is gone for good.
//
function leave(inst) {
  inst.state = STATES.GONE
  inst.spin = false
  inst.sound && Sound.stopPropellerHum(inst.sound)
  inst.layers.forEach(layer => layer.destroy())
}
function stepPropAlong(inst, dt) {
  const { curve, prop } = inst
  const remain = curve.total - curve.s
  //
  // Cruise speed, eased off over the last FLIGHT_RAMP px (smoothstep, so
  // the slowing itself starts and ends softly); flyAccel limits the change.
  //
  const rampOut = smoothstep(Math.min(1, Math.max(remain, 0) / FLIGHT_RAMP))
  const want = Math.max(FLIGHT_MIN_V, PARAMS.flySpeed * rampOut)
  curve.v += clamp(want - curve.v, PARAMS.flyAccel * dt)
  curve.s = Math.min(curve.total, curve.s + curve.v * dt)
  const p = pointAlong(curve, curve.s)
  prop.vx = (p.x - prop.x) / dt
  prop.vy = (p.y - prop.y) / dt
  prop.x = p.x
  prop.y = p.y
}
function startLand(inst) {
  inst.landFrom = { x: inst.prop.x, y: inst.prop.y }
  inst.landT = 0
  inst.state = STATES.LAND
}
//
// The hub eases down over the spot. The body keeps swinging under it, and
// once the descent is done an extra damp lets that swing die; then it plants.
//
function tickLand(inst, dt) {
  inst.landT += dt
  const rest = propRestAt(inst, inst.goal)
  const u = smoothstep(Math.min(1, inst.landT / PARAMS.landDuration))
  const prevX = inst.prop.x
  const prevY = inst.prop.y
  inst.prop.x = inst.landFrom.x + (rest.x - inst.landFrom.x) * u
  inst.prop.y = inst.landFrom.y + (rest.y - inst.landFrom.y) * u
  inst.prop.vx = (inst.prop.x - prevX) / dt
  inst.prop.vy = (inst.prop.y - prevY) / dt
  const extra = inst.landT > PARAMS.landDuration ? LAND_EXTRA_DAMP : 0
  stepHang(inst, dt, extra)
  applyHang(inst)
  const settled = u >= 1 && Math.abs(inst.hang) < HANG_SETTLE && Math.abs(inst.hangW) < HANG_W_SETTLE
  const stuck = inst.landT > PARAMS.landDuration + LAND_FORCE_AFTER
  const done = settled || stuck
  done && plant(inst)
}
function plant(inst) {
  inst.x = inst.goal.x
  inst.y = inst.goal.y
  inst.tilt = 0
  inst.hang = 0
  inst.hangW = 0
  inst.squash = 0
  inst.squashV = 0
  inst.bend = 0
  inst.bendV = 0
  inst.perch = inst.goal.perch
  inst.spin = false
  inst.rootGrow = 0
  inst.state = STATES.ROOTS_OUT
  inst.legs = buildLegs(legShape(inst.perch))
}
function tickRootsOut(inst, dt) {
  inst.rootGrow = Math.min(1, inst.rootGrow + dt / PARAMS.rootGrow)
  if (inst.rootGrow < 1) return
  inst.state = STATES.SIT
  inst.restLeft = pickRest(inst)
}
//
// Pendulum under the hub. θ is 0 straight down and positive with the body
// to the hub's right (y grows downward). Quadratic drag on the bob plus
// the hub's acceleration: a steady flight hangs the body back, a stop
// swings it past the hub and it settles underneath.
//
function stepHang(inst, dt, extraDamp) {
  const { prop } = inst
  const axRaw = (prop.vx - inst.propPrevVx) / dt
  const ayRaw = (prop.vy - inst.propPrevVy) / dt
  inst.propPrevVx = prop.vx
  inst.propPrevVy = prop.vy
  const blend = Math.min(1, dt * ACCEL_SMOOTH)
  inst.ax += (axRaw - inst.ax) * blend
  inst.ay += (ayRaw - inst.ay) * blend
  const L = comLength(inst)
  const th = inst.hang
  const w = inst.hangW
  const cos = Math.cos(th)
  const sin = Math.sin(th)
  const bvx = prop.vx + L * w * cos
  const bvy = prop.vy - L * w * sin
  const sp = Math.hypot(bvx, bvy)
  const fx = -HANG_DRAG * sp * bvx
  const fy = HANG_G - HANG_DRAG * sp * bvy
  const alpha = (fx * cos - fy * sin) / L - (inst.ax / L) * cos + (inst.ay / L) * sin - (HANG_DAMP + extraDamp) * w
  inst.hangW = clamp(w + alpha * dt, HANG_W_MAX)
  const next = th + inst.hangW * dt
  if (Math.abs(next) > HANG_MAX) {
    inst.hang = clamp(next, HANG_MAX)
    inst.hangW = 0
    return
  }
  inst.hang = next
}
//
// Feet and lean from the hang, so the crown stays one stick-length from
// the hub along the rope.
//
function applyHang(inst) {
  const drop = dropOf(inst)
  inst.tilt = -inst.hang
  inst.x = inst.prop.x + Math.sin(inst.hang) * drop
  inst.y = inst.prop.y + Math.cos(inst.hang) * drop
}
//
// The rope's middle springs behind the swing, so a turn bows it.
//
function updateRope(inst, dt) {
  const wind = airborne(inst) && inst.prop ? inst.prop.vx : 0
  const target = airborne(inst) ? clamp(-inst.hangW * ROPE_FROM_W - wind * ROPE_FROM_V, ROPE_MAX) : 0
  inst.ropeV += (ROPE_STIFF * (target - inst.rope) - ROPE_DAMP * inst.ropeV) * dt
  inst.rope = clamp(inst.rope + inst.ropeV * dt, ROPE_MAX)
}
//
// Soft body: extra tension along the rope (a hard pull or a fast swing)
// shortens it, a light load lengthens it, and a push across the rope bends
// its bottom back against the push. Springs, so it jiggles after a turn.
//
function updateSquash(inst, dt) {
  let squashTarget = 0
  let bendTarget = 0
  if (airborne(inst)) {
    const along = inst.ax * Math.sin(inst.hang) + inst.ay * Math.cos(inst.hang)
    const across = inst.ax * Math.cos(inst.tilt) + inst.ay * Math.sin(inst.tilt)
    const extra = -along + comLength(inst) * inst.hangW * inst.hangW
    squashTarget = clampRange(extra / SQUASH_ACCEL, -STRETCH_MAX, SQUASH_MAX)
    bendTarget = clamp(across / BEND_ACCEL, BEND_MAX)
  }
  inst.squashV += (SQUASH_STIFF * (squashTarget - inst.squash) - SQUASH_DAMP * inst.squashV) * dt
  inst.squash = clampRange(inst.squash + inst.squashV * dt, -STRETCH_MAX, SQUASH_MAX)
  inst.bendV += (BEND_STIFF * (bendTarget - inst.bend) - BEND_DAMP * inst.bendV) * dt
  inst.bend = clamp(inst.bend + inst.bendV * dt, BEND_MAX)
}
//
// Every frame of the spin shows propFrameSec; stopping, it turns on to
// the flat frame and rests there.
//
function updatePropeller(inst, dt) {
  if (!inst.spin && inst.frame === 0) return
  inst.frameT += dt
  if (inst.frameT < PARAMS.propFrameSec) return
  inst.frameT -= PARAMS.propFrameSec
  inst.frame = (inst.frame + 1) % FRAME_COUNT
}
//
// A small lean of the hub into its flight; on a perch it returns upright.
//
function updatePropTilt(inst, dt) {
  const target = airborne(inst) ? clamp(-inst.prop.vx * PROP_TILT_PER_V, PROP_TILT_MAX) : 0
  inst.propTilt += (target - inst.propTilt) * Math.min(1, dt * PROP_TILT_SNAP)
}
//
// Faces the way the hub flies (while slow it keeps the last side); on a perch
// it turns its head to a hero coming near.
//
function updateFacing(inst, hero) {
  if (airborne(inst)) {
    Math.abs(inst.prop.vx) >= FACE_MIN_V && (inst.facing = Math.sign(inst.prop.vx))
    return
  }
  if (!hero || heroDistance(inst, hero) >= PARAMS.wakeReach) return
  Math.abs(hero.x - inst.x) > FACE_HERO_DEAD && (inst.facing = Math.sign(hero.x - inst.x))
}
//
// Whirr while the propeller turns, louder the nearer the hero (never under
// humFloor).
//
function updateHum(inst, hero) {
  if (!inst.sound) return
  const spinning = inst.spin || inst.frame !== 0
  const near = Math.max(inst.humFloor, hero ? 1 - heroDistance(inst, hero) / HUM_HEAR_REACH : 0)
  const speed = airborne(inst) ? Math.hypot(inst.prop.vx, inst.prop.vy) : 0
  Sound.setPropellerHum(inst.sound, spinning && inst.isVisible() ? near * near : 0, 1 + speed * HUM_RATE_PER_V)
}
//
// Awake in the air and while the hero is within wakeReach; on a perch it
// nods off once he is past sleepReach. Asleep it breathes.
//
function updateSleep(inst, dt, hero) {
  const dist = hero ? heroDistance(inst, hero) : Infinity
  if (inst.state !== STATES.SIT) inst.awake = true
  else if (dist < PARAMS.wakeReach) inst.awake = true
  else if (dist > PARAMS.sleepReach) inst.awake = false
  inst.sleep = clampRange(inst.sleep + (inst.awake ? -dt : dt) / SLEEP_FADE_SEC, 0, 1)
  inst.breathT = (inst.breathT + dt * Math.PI * 2 / BREATH_SEC) % (Math.PI * 2)
  inst.breath = Math.sin(inst.breathT) * inst.sleep
}
//
// Pupils show while awake and dart about; a near hero draws them back now
// and then and holds them a while.
//
function updateEyes(inst, dt, hero) {
  const { eye } = inst
  eye.open = clampRange(eye.open + (inst.awake ? dt : -dt) * EYE_OPEN_SPEED, 0, 1)
  eye.dartLeft -= dt
  const near = hero && heroDistance(inst, hero) < PARAMS.wakeReach
  if (eye.dartLeft <= 0) {
    eye.onHero = near && Math.random() < HERO_CHANCE
    eye.dartLeft = eye.onHero ? randomIn(HERO_HOLD_MIN, HERO_HOLD_MAX) : randomIn(DART_MIN, DART_MAX)
    eye.onHero || pickDartSpot(eye)
  }
  if (eye.onHero && near) {
    const aim = aimAt(inst, hero)
    eye.tx = aim.x
    eye.ty = aim.y
  }
  const snap = Math.min(1, dt * EYE_SNAP)
  eye.x += (eye.tx - eye.x) * snap
  eye.y += (eye.ty - eye.y) * snap
}
function pickDartSpot(eye) {
  const a = Math.random() * Math.PI * 2
  const r = Math.sqrt(Math.random())
  eye.tx = Math.cos(a) * r
  eye.ty = Math.sin(a) * r
}
//
// Where the pupils turn (-1..1 each way, within the unit circle): towards
// the target, all the way once it is EYE_LOOK_FULL px off.
//
function aimAt(inst, target) {
  const head = headWorld(inst)
  const dx = target.x - head.x
  const dy = target.y - head.y
  const len = Math.max(EYE_LOOK_FULL, Math.hypot(dx, dy))
  return { x: dx / len, y: dy / len }
}
function heroDistance(inst, hero) {
  const head = headWorld(inst)
  return Math.hypot(hero.x - head.x, hero.y - head.y)
}
function airborne(inst) {
  return inst.state === STATES.FLY || inst.state === STATES.LAND
}
function headTopLocal(inst) {
  return inst.look.crownY
}
function stickLen(inst) {
  return inst.look.headR * STICK_SHARE
}
//
// Hub to the feet when the rope hangs straight: the stick, then the crown
// down to the feet.
//
function dropOf(inst) {
  return -headTopLocal(inst) + stickLen(inst)
}
function comLength(inst) {
  return stickLen(inst) + inst.look.headR * COM_DROP
}
function propAboveFeet(inst) {
  const top = toWorld(inst, { x: 0, y: headTopLocal(inst) })
  return { x: top.x, y: top.y - stickLen(inst) }
}
function propRestAt(inst, spot) {
  return { x: spot.x, y: spot.y - dropOf(inst) }
}
function flightEnd(inst) {
  const { goal } = inst
  if (goal.perch === PERCH.EXIT) return { x: goal.x, y: goal.y }
  const rest = propRestAt(inst, goal)
  return { x: rest.x, y: rest.y - LAND_CLEAR }
}
function legShape(perch) {
  return perch === PERCH.GROUND ? GROUND_LEG : BRANCH_LEG
}
//
// Both legs of a shape, the left one mirrored, every joint a little off
// so no two plantings look alike.
//
function buildLegs(shape) {
  return [-1, 1].map(side => ({
    pts: shape.pts.map(([x, y], i) => i === 0 ? { x: side * x, y } : {
      x: side * (x + randomIn(-LEG_JITTER, LEG_JITTER)),
      y: y + randomIn(-LEG_JITTER, LEG_JITTER)
    }),
    segs: shape.segs,
    knobs: shape.knobs
  }))
}
function isBudInView(inst) {
  const k = inst.k
  const camX = k.camPos().x
  const camScale = k.camScale?.()
  const zoom = (typeof camScale === 'object' ? camScale.x : camScale) || 1
  const half = k.width() / (2 * zoom) + 80
  const worldX = (airborne(inst) ? inst.prop.x : inst.x) * inst.scale
  return worldX >= camX - half && worldX <= camX + half
}
//
// The two legs under the ground as far as they have grown.
//
function onDrawRoots(inst) {
  if (!inst.isVisible() || airborne(inst) || inst.perch !== PERCH.GROUND || inst.rootGrow <= 0 || !isBudInView(inst)) return
  queueLegs(inst, ROOT_TUCK)
  PolyBatch.flush(inst.batch, inst.k)
}
//
// Dark rim, then the root brown, then a lit line on the thick parts
// (towards the sun, up-left); knobbed knees and ankles once grown to.
//
function queueLegs(inst, dropY) {
  const r = inst.look.headR
  const grow = inst.rootGrow * LEG_LEVELS
  const legs = inst.legs.map(leg => grownLeg(inst, leg, grow, r, dropY))
  for (let i = 0; i < legs.length; i++) drawLegPass(inst, legs[i], ROOT_OUTLINE, inst.rootDarkColor)
  for (let i = 0; i < legs.length; i++) drawLegPass(inst, legs[i], 0, inst.rootColor)
  for (let i = 0; i < legs.length; i++) drawLegLit(inst, legs[i])
}
function grownLeg(inst, leg, grow, r, dropY) {
  const world = leg.pts.map(p => toWorld(inst, { x: p.x * r, y: p.y * r + dropY }))
  const segs = []
  const reached = new Set([0])
  leg.segs.forEach(([a, b, w, depth]) => {
    const u = Math.min(1, grow - depth)
    if (u <= 0) return
    const p1 = world[a]
    const p2 = { x: p1.x + (world[b].x - p1.x) * u, y: p1.y + (world[b].y - p1.y) * u }
    segs.push({ p1, p2, w: w * SIZE })
    u >= 1 && reached.add(b)
  })
  const knobs = leg.knobs.filter(i => reached.has(i)).map(i => ({ p: world[i], r: knobWidth(leg, i) * KNOB_SHARE }))
  return { segs, knobs }
}
function knobWidth(leg, i) {
  const into = leg.segs.find(seg => seg[1] === i)
  return into ? into[2] * SIZE : 0
}
function drawLegPass(inst, leg, extraW, color) {
  const { batch } = inst
  leg.segs.forEach(seg => PolyBatch.addLine(batch, seg.p1.x, seg.p1.y, seg.p2.x, seg.p2.y, seg.w + extraW, color))
  leg.knobs.forEach(knob => PolyBatch.addDisc(batch, knob.p.x, knob.p.y, knob.r + extraW * 0.5, color))
}
function drawLegLit(inst, leg) {
  leg.segs.forEach(seg => {
    if (seg.w < LIT_MIN_W) return
    const dx = seg.p2.x - seg.p1.x
    const dy = seg.p2.y - seg.p1.y
    const len = Math.hypot(dx, dy)
    if (len <= 0) return
    const flip = -dy + dx > 0 ? -1 : 1
    const ox = -dy / len * seg.w * LIT_SHIFT * flip
    const oy = dx / len * seg.w * LIT_SHIFT * flip
    PolyBatch.addLine(inst.batch, seg.p1.x + ox, seg.p1.y + oy, seg.p2.x + ox, seg.p2.y + oy,
      Math.max(LIT_MIN_LINE, seg.w * LIT_W_SHARE), inst.rootLightColor)
  })
}
//
// Body, then the head over its neck; on a branch the two paws curl over
// the wood. The stalk runs from the crown to the hub, and the propeller
// sits on the hub. Body and head mirror to the side it faces.
//
function onDraw(inst) {
  if (!inst.isVisible() || !isBudInView(inst)) return
  const { look } = inst
  drawBody(inst)
  drawTile(inst, look.head, headWorld(inst), inst.tilt, inst.facing, 1)
  drawPupils(inst)
  inst.perch === PERCH.BRANCH && !airborne(inst) && inst.rootGrow > 0 && queueLegs(inst, 0)
  const tip = drawStick(inst)
  drawTile(inst, look.frames[inst.frame], tip, inst.propTilt + inst.breath * BREATH_PROP_TILT, 1, 1)
}
//
// A light pupil in each black eye, roaming its own ellipse there. Its
// baked disc lands on whole pixels so the crisp texture stays 1:1 round.
//
function drawPupils(inst) {
  const { k, eye, posScratch } = inst
  if (eye.open <= 0) return
  const eyes = inst.look.eyes
  for (let i = 0; i < eyes.length; i++) {
    const spot = eyes[i]
    const p = toWorld(inst, { x: spot.at.x * inst.facing + eye.x * spot.rx, y: spot.at.y + eye.y * spot.ry })
    const { pupil } = spot
    posScratch.x = Math.round(p.x - pupil.tileW / 2)
    posScratch.y = Math.round(p.y - pupil.tileH / 2)
    k.drawSprite({
      sprite: pupil.name,
      quad: pupil.quad,
      width: pupil.tileW,
      height: pupil.tileH,
      pos: posScratch,
      opacity: eye.open
    })
  }
}
//
// The leafy body, squashed or stretched round its neck (where the head
// sits, so it stays on the head) and bent round that neck by the push
// across.
//
function drawBody(inst) {
  const { look } = inst
  const sy = 1 - inst.squash
  const sx = 1 + inst.squash * SQUASH_WIDEN
  const reach = -look.neckY * sy
  const feet = { x: -Math.sin(inst.bend) * reach, y: look.neckY + Math.cos(inst.bend) * reach }
  drawTile(inst, look.body, toWorld(inst, feet), inst.tilt + inst.bend, sx * inst.facing, sy)
}
function drawTile(inst, part, pos, angle, sx, sy) {
  const { k, posScratch, anchorScratch, scaleScratch } = inst
  posScratch.x = pos.x
  posScratch.y = pos.y
  anchorScratch.x = part.anchor.x
  anchorScratch.y = part.anchor.y
  scaleScratch.x = sx
  scaleScratch.y = sy
  k.drawSprite({
    sprite: part.tile.name,
    quad: part.tile.quad,
    width: part.tile.tileW,
    height: part.tile.tileH,
    pos: posScratch,
    anchor: anchorScratch,
    scale: scaleScratch,
    angle: angle * RAD_TO_DEG
  })
}
//
// A bowed, branch-like stalk from the crown to the hub, thick at the head
// and thinner at the hub. On a perch it stands straight; in the air its
// middle lags the swing. Dark rim, bark brown, then fibres twisting round
// it, a knot and a little twig stub.
//
function drawStick(inst) {
  const base = toWorld(inst, { x: 0, y: headTopLocal(inst) })
  const tip = airborne(inst) ? inst.prop : {
    x: base.x + inst.breath * BREATH_TIP_X,
    y: base.y - stickLen(inst)
  }
  const bow = inst.rope + inst.breath * BREATH_BOW
  const dx = tip.x - base.x
  const dy = tip.y - base.y
  const len = Math.hypot(dx, dy) || 1
  const mid = {
    x: (base.x + tip.x) / 2 - dy / len * bow,
    y: (base.y + tip.y) / 2 + dx / len * bow
  }
  const spine = stalkSpine(inst, base, mid, tip)
  drawStalkBody(inst, spine, STALK_OUTLINE, inst.stickDarkColor)
  drawStalkBody(inst, spine, 0, inst.stickColor)
  for (let i = 0; i < STALK_FIBRES.length; i++) drawStalkFibre(inst, spine, STALK_FIBRES[i])
  drawStalkDetails(inst, spine)
  PolyBatch.flush(inst.batch, inst.k)
  return tip
}
//
// Points along the stalk's curve with their normal and width.
//
function stalkSpine(inst, base, mid, tip) {
  const spine = inst.spineScratch
  for (let i = 0; i <= ROPE_SEGMENTS; i++) {
    const u = i / ROPE_SEGMENTS
    const a = (1 - u) * (1 - u)
    const b = 2 * u * (1 - u)
    const c = u * u
    const tx = 2 * (1 - u) * (mid.x - base.x) + 2 * u * (tip.x - mid.x)
    const ty = 2 * (1 - u) * (mid.y - base.y) + 2 * u * (tip.y - mid.y)
    const tl = Math.hypot(tx, ty) || 1
    const pt = spine[i]
    pt.x = a * base.x + b * mid.x + c * tip.x
    pt.y = a * base.y + b * mid.y + c * tip.y
    pt.nx = -ty / tl
    pt.ny = tx / tl
    pt.w = STALK_W_BASE + (STALK_W_TIP - STALK_W_BASE) * u
    pt.u = u
  }
  return spine
}
function drawStalkBody(inst, spine, extraW, color) {
  for (let i = 1; i < spine.length; i++) {
    const p = spine[i - 1]
    const q = spine[i]
    PolyBatch.addLine(inst.batch, p.x, p.y, q.x, q.y, (p.w + q.w) / 2 + extraW, color)
  }
}
//
// One fibre: a thin line winding across the stalk (TWISTS turns over its
// length), light on the sunny half, dark on the other.
//
function drawStalkFibre(inst, spine, fibre) {
  const pts = inst.fibreScratch
  for (let i = 0; i < spine.length; i++) {
    const p = spine[i]
    const off = Math.sin(p.u * Math.PI * 2 * STALK_TWISTS + fibre.phase) * p.w * STALK_FIBRE_REACH
    pts[i].x = p.x + p.nx * off
    pts[i].y = p.y + p.ny * off
  }
  PolyBatch.addTaperedRibbon(inst.batch, pts, STALK_FIBRE_W, STALK_FIBRE_W, fibre.light ? inst.stickLightColor : inst.stickDarkColor, false)
}
//
// A knot bulging from the stalk and a short twig stub off its side.
//
function drawStalkDetails(inst, spine) {
  const { batch } = inst
  const knot = spineAt(spine, STALK_KNOT_AT)
  const stub = spineAt(spine, STALK_STUB_AT)
  const kx = knot.x + knot.nx * knot.w * STALK_KNOT_SHIFT
  const ky = knot.y + knot.ny * knot.w * STALK_KNOT_SHIFT
  const sx = stub.x - stub.nx * STALK_STUB_LEN
  const sy = stub.y - stub.ny * STALK_STUB_LEN - STALK_STUB_RISE
  PolyBatch.addLine(batch, stub.x, stub.y, sx, sy, STALK_STUB_W + STALK_OUTLINE, inst.stickDarkColor)
  PolyBatch.addLine(batch, stub.x, stub.y, sx, sy, STALK_STUB_W, inst.stickColor)
  PolyBatch.addDisc(batch, kx, ky, knot.w * STALK_KNOT_R + STALK_OUTLINE * 0.5, inst.stickDarkColor)
  PolyBatch.addDisc(batch, kx, ky, knot.w * STALK_KNOT_R, inst.stickColor)
  PolyBatch.addDisc(batch, kx - STALK_KNOT_LIT, ky - STALK_KNOT_LIT, knot.w * STALK_KNOT_R * 0.45, inst.stickLightColor)
}
function spineAt(spine, u) {
  return spine[Math.round(u * (spine.length - 1))]
}
function headWorld(inst) {
  return toWorld(inst, { x: inst.look.headAt.x * inst.facing, y: inst.look.headAt.y })
}
//
// A bud-local point (from its feet, turned with its lean) in the world.
//
function toWorld(inst, p) {
  const cos = Math.cos(inst.tilt)
  const sin = Math.sin(inst.tilt)
  return { x: inst.x + p.x * cos - p.y * sin, y: inst.y + p.x * sin + p.y * cos }
}
function clamp(value, max) {
  return Math.max(-max, Math.min(max, value))
}
function clampRange(value, min, max) {
  return Math.max(min, Math.min(max, value))
}
function smoothstep(u) {
  return u * u * (3 - 2 * u)
}
function randomIn(min, max) {
  return min + Math.random() * (max - min)
}
