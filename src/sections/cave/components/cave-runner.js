import { CFG } from '../../../cfg.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Layout from '../utils/cave-layout.js'
import * as Surface from '../utils/cave-surface.js'
//
// The runner: a small insect of runner.png's parts — a body under a leaf
// shell, a head with one big eye on a neck, two feelers, a leaf for a tail
// (wagging as it runs) and eight legs (four pairs, rear to front; each a hip ball, a thigh, a
// shin and a clawed foot). It runs over every side of the platforms —
// tops, sides and undersides (cave-surface.js's crawl runs), never into
// the lake — the way insects do: short dashes and still pauses, now and
// then turning back, turning back at a run's end — and afraid of the
// hero: once he comes close it bolts away from him, fast. Standing on a
// top it now and then leaps up at a firefly over it, eating it — or
// missing it and just landing again.
//
// The body rides its run, its hips HIP_LIFT over the surface, turned to
// the run's slope over its own length (the chord BODY_SPAN either side),
// not to every lump under it. Each leg's foot stays planted in the world until
// it steps: a ray (Surface.raycast, like the hero's legs' rays) from over
// its rest spot down the body's own down finds where it lands. Legs step
// in two tripods taking turns (a near leg with the far legs beside it):
// once every foot stands, the tripod whose turn it is lifts off if one of
// its feet lags too far from its spot — with it every foot of it that lags
// TRIPOD_FOLLOW px at all — else the other one may. The thigh and the shin are solved by two-bone
// IK from the hip to the ankle, the knee always to the leg's own side —
// forward on the front pairs, back on the rear ones (picking the higher
// knee flipped it whenever the ankle stood right under the hip); the foot hangs from the
// ankle as it is painted, its claws on the toe.
//
// Everything is worked out in sheet px of runner.png in the body's own
// frame (x to the head, y to the surface, origin on the hips' line) and
// drawn under one transform; one atlas texture for all the parts, so all
// the runners draw in one batch.
//
const SPRITE = 'cave0-runner'
const GRAIN_SEED = 9400
const COLOR = CAVE_CFG.runner
//
// Size: world px per sheet px at size 1; the atlas is baked BAKE_OVER
// times finer than that, its parts ATLAS_GAP px apart on shelves
// ATLAS_W px wide.
//
const SCALE = 0.045
const BAKE_OVER = 3
const ATLAS_W = 512
const ATLAS_GAP = 3
const BYTE_MAX = 255
const HALF = 0.5
const DEG = 180 / Math.PI
//
// The parts (sheet px in their pieces): the body's origin (the middle of
// its hips' line), the tail by a pivot set at a point of the body, each
// feeler by its base set at a point of the head (the far one darker).
//
const ORIGIN = { x: 390, y: 305 }
const TAIL = { piece: 'runnerTail', pivot: { x: 174, y: 53 }, at: { x: 20, y: 250 } }
const FEELERS = [
  { piece: 'runnerFeeler0', pivot: { x: 16, y: 182 }, at: { x: 62, y: 16 }, far: true, phase: 0 },
  { piece: 'runnerFeeler1', pivot: { x: 8, y: 155 }, at: { x: 118, y: 12 }, far: false, phase: 1.7 }
]
//
// The head (its pivot its middle, HEAD_R px its radius) on a neck: the neck
// leaves the body's front at NECK.at, NECK.angle degrees up from the body's
// line, and runs NECK_SHARE of the head's radius bare before the head;
// it is the sheet's straight shin (`piece`, its p and q joints) drawn
// NECK.thick times as thick, from NECK.sink px inside the body to the
// head's middle (both ends hidden).
//
const HEAD = { piece: 'runnerHead', pivot: { x: 92, y: 84 } }
const HEAD_R = 86
const NECK_SHARE = 1.2
const NECK = { piece: 'runnerNeck', p: { x: 40.2, y: 22.5 }, q: { x: 17.7, y: 159.6 }, at: { x: 636, y: 262 }, angle: -12, thick: 1.4, sink: 40 }
const NECK_DIR = { x: Math.cos(NECK.angle / DEG), y: Math.sin(NECK.angle / DEG) }
const NECK_FROM = { x: NECK.at.x - ORIGIN.x - NECK_DIR.x * NECK.sink, y: NECK.at.y - ORIGIN.y - NECK_DIR.y * NECK.sink }
const HEAD_AT = {
  x: NECK.at.x - ORIGIN.x + NECK_DIR.x * HEAD_R * (NECK_SHARE + 1),
  y: NECK.at.y - ORIGIN.y + NECK_DIR.y * HEAD_R * (NECK_SHARE + 1)
}
//
// Legs, per pair rear to front: the hip on the body (the belly narrows to
// the front, so the front hips sit higher), the thigh's and the shin's joints in their pieces (p at the
// body's end, q at the far end), the foot's ankle and toe (its claws'
// tip), the hip ball's middle, and where its toe rests ahead of the hip
// (x; the far leg FAR_REST_DX further out). A far leg's hip sits FAR_HIP
// off the near one's, its toe FAR_LIFT over the surface. The legs are
// drawn LEG_SCALE times their size on the sheet (and the hip balls
// HIP_BALL_SCALE): at the runner's size the painted ones read too short.
//
const HIPS = [{ x: 190, y: 306 }, { x: 330, y: 318 }, { x: 470, y: 305 }, { x: 590, y: 272 }]
const THIGHS = [
  { p: { x: 117.1, y: 18.8 }, q: { x: 16.8, y: 135.1 } },
  { p: { x: 143.4, y: 21.3 }, q: { x: 16.5, y: 146.5 } },
  { p: { x: 110.9, y: 19.5 }, q: { x: 15.7, y: 154.8 } },
  { p: { x: 30.8, y: 25.9 }, q: { x: 70.0, y: 142.8 } }
]
const SHINS = [
  { p: { x: 45.0, y: 20.7 }, q: { x: 16.3, y: 157.2 } },
  { p: { x: 40.2, y: 22.5 }, q: { x: 17.7, y: 159.6 } },
  { p: { x: 29.2, y: 25.8 }, q: { x: 47.9, y: 154.6 } },
  { p: { x: 29.5, y: 23.7 }, q: { x: 49.6, y: 155.7 } }
]
const FEET = [
  { ankle: { x: 76.6, y: 19.0 }, toe: { x: 4, y: 128 } },
  { ankle: { x: 85.1, y: 21.1 }, toe: { x: 5, y: 131 } },
  { ankle: { x: 18.8, y: 21.3 }, toe: { x: 74, y: 128 } },
  { ankle: { x: 18.9, y: 21.2 }, toe: { x: 92, y: 127 } }
]
const HIP_BALL = { x: 41.5, y: 41.5 }
const REST_DX = [-250, -100, 90, 240]
const FAR_HIP = { x: -26, y: -16 }
const FAR_REST_DX = 30
const FAR_LIFT = 12
const PAIRS = 4
const LEG_SCALE = 1.15
const HIP_BALL_SCALE = 1.1
//
// Stance (sheet px): the hips' line over the surface, how far past the
// rest height a foot's ray reaches, and where a foot hangs when it finds
// nothing (share of HIP_LIFT under the hips).
//
const HIP_LIFT = 330
const RAY_PAST = 180
const DANGLE = 0.85
const BODY_SPAN = 320
//
// Stepping: a foot steps once it lags STEP_TRIGGER px (sheet) off its spot,
// or STRETCH_LAG px while its leg stretches past STRETCH of its reach (a
// spot out of reach — under a lobe of a ceiling — does not keep a foot
// that already stands on it stepping); a step takes STEP_TIME
// s, lifts STEP_LIFT px (sheet) off the surface and lands STEP_LEAD of the
// way the body goes during it ahead of the spot.
//
const STEP_TRIGGER = 100
const STRETCH = 0.97
const STRETCH_LAG = 30
const TRIPOD_FOLLOW = 30
const STEP_TIME = 0.075
const STEP_LIFT = 90
const STEP_LEAD = 0.9
const KNEE_SLACK = 1
//
// Moving (world px, s): dashes at DASH_SPEED..+RANGE for DASH_TIME..+RANGE,
// pauses for PAUSE_TIME..+RANGE; speeding up at ACCEL, braking at BRAKE; a
// dash turns back with REVERSE_CHANCE; a run's open end is turned at
// END_PAD px before it.
// Fear: the hero within FEAR_R px sends it running from him (the way
// along the run whose point FLEE_LOOK px on lies farther from him — round
// a corner too; turned only once the other way is FLEE_DEADBAND px
// farther, and never again within FLEE_HOLD s of turning, so it does not
// dither where both ways first lead nearer him) at FLEE_SPEED, speeding
// up at FLEE_ACCEL, for as long as he stays near and FLEE_TIME after.
// Driven into the end of its run (a corner) it bolts back the other way,
// right past him, and keeps going until he is behind it (its way on leads
// FLEE_DEADBAND px farther from him) — then it flees on from there (speeds at size 1, scaled with the
// runner). Each flight goes at FLEE_SPEED times FLEE_PACE..+RANGE; driven
// into a corner it bolts back past him only CORNER_BOLT_CHANCE of the
// times, else cowers there COWER_TIME..+RANGE s, frozen. It gets used to
// a hero standing still (moving under HERO_STILL px/s): after
// CALM_AFTER..+RANGE s of that it runs about as it likes again, minding
// him only within CALM_FEAR_R px; once he moves it fears him afresh. In a
// pause a leg shifts now and then (IDLE_STEP..+RANGE s apart, up to
// IDLE_JITTER sheet px off its spot).
//
const DASH_SPEED = 110
const DASH_SPEED_RANGE = 120
const DASH_TIME = 0.15
const DASH_TIME_RANGE = 0.45
const PAUSE_TIME = 0.12
const PAUSE_TIME_RANGE = 0.8
const ACCEL = 1800
const BRAKE = 2600
const REVERSE_CHANCE = 0.25
const END_PAD = 18
const FEAR_R = 200
const FLEE_SPEED = 420
const FLEE_ACCEL = 5000
const FLEE_TIME = 0.5
const FLEE_DEADBAND = 6
const FLEE_LOOK = 120
const FLEE_HOLD = 0.35
const FLEE_PACE = 0.7
const FLEE_PACE_RANGE = 0.45
const CORNER_BOLT_CHANCE = 0.5
const COWER_TIME = 0.6
const COWER_TIME_RANGE = 2.2
const HERO_STILL = 15
const CALM_AFTER = 1.5
const CALM_AFTER_RANGE = 3
const CALM_FEAR_R = 70
const IDLE_STEP = 0.25
const IDLE_STEP_RANGE = 0.6
const IDLE_JITTER = 40
//
// Feelers swing FEELER_SWING degrees at FEELER_HZ (FEELER_RUN_HZ while it
// runs). The tail sways TAIL_SWAY degrees at TAIL_HZ at rest; running it
// wags, up to TAIL_RUN_SWAY degrees more at TAIL_RUN_HZ more by
// TAIL_RUN_SPEED px/s (world, at size 1).
//
const FEELER_SWING = 9
const FEELER_HZ = 2.2
const FEELER_RUN_HZ = 5
const TAIL_SWAY = 4
const TAIL_HZ = 1.5
const TAIL_RUN_SWAY = 14
const TAIL_RUN_HZ = 6
const TAIL_RUN_SPEED = 150
//
// Hunting fireflies (world px, s). It runs about (patrol) until, on a top
// (its down within TOP_DOWN of straight down), unafraid and rested
// (HUNT_REST..+RANGE s since its last hunt), it looks up every WATCH_LOOK
// s and with WATCH_CHANCE takes to watching the lowest firefly within
// WATCH_R px along and WATCH_HIGH over it: it tracks it — dashes and pauses as when
// it runs about, each dash toward the firefly (turning about first if the
// firefly has got behind it, a dash cut short when it does), still once
// within STALK_NEAR px of under it — its head turned up to it on its
// neck, for HUNT_TIME..+RANGE s or until it loses it (LOSE_R px off), is
// scared or leaves the top. Given up on (it never came down), it runs off
// to look for another: a dash at SEARCH_SPEED for SEARCH_TIME..+RANGE s,
// then it looks up again at once. Once the firefly sinks low enough —
// JUMP_LOW..JUMP_HIGH px over its hips and within JUMP_REACH px along, for
// AIM_TIME s — it leaps, and the hunt is over: an arc (gravity JUMP_G,
// the world's own, as for the hero)
// whose top takes its head
// to the firefly — MISS_CHANCE of the leaps aimed MISS_OFF..+RANGE px off,
// so it misses — landing as far again on along its run (never a leap
// whose landing falls past the run's end, nor one whose arc, checked at
// ARC_CHECKS points, runs into the soil). Its legs: it crouches first
// (its hips CROUCH_DIP sheet px lower over CROUCH_TIME s, up to twice as
// long for a leap as high as JUMP_HIGH: a higher leap takes more winding
// up), its neck drawn in; then each foot stays planted as it springs off
// — the leg straightening — until that leg is stretched to its full
// length (PUSH_STRETCH of it; at the latest by PUSH_U_MAX of the flight:
// the rear legs, trailing, push longest), is drawn up to the body (TUCK
// of their rest spread and drop) over TUCK_SPAN of the flight, and from
// REACH_U reaches out and down for the ground again; landed, it gives at
// the hips like a spring (kicked down at LAND_KICK sheet px/s for a fall
// from JUMP_HIGH, less from lower, stiffness SPRING_K, damping
// SPRING_DAMP, at rest within SPRING_REST) on its planted feet. In the air
// its body turns PITCH_SHARE of the way to its flight (at most PITCH_MAX
// rad) and bends — its front BODY_BEND degrees up, its tail TAIL_BEND
// down, eased at BEND_EASE per s — and its neck shoots out toward the
// firefly as it rises, NECK_REACH sheet px at the top of the arc
// (NECK_APEX of the flight), drawn back to NECK_LAND of that as it comes
// down; its head within CATCH_R px of a firefly eats it.
// Watching, its neck only turns toward the firefly (NECK_UP..NECK_DOWN
// rad off its rest line), easing at NECK_EASE per s.
//
const TOP_DOWN = 0.9
const WATCH_LOOK = 0.5
const WATCH_CHANCE = 0.8
const WATCH_R = 240
const WATCH_HIGH = 320
const STALK_NEAR = 18
const HUNT_TIME = 4
const HUNT_TIME_RANGE = 4
const SEARCH_TIME = 0.8
const SEARCH_TIME_RANGE = 1.2
const SEARCH_SPEED = 300
const HUNT_REST = 2
const HUNT_REST_RANGE = 4
const LOSE_R = 340
const AIM_TIME = 0.15
const BODY_BEND = 7
const TAIL_BEND = 22
const BEND_EASE = 8
const NECK_REACH = 150
const NECK_UP = -1.4
const NECK_DOWN = 0.3
const NECK_EASE = 10
const JUMP_LOW = 25
const JUMP_HIGH = 170
const JUMP_REACH = 90
const JUMP_G = CFG.game.gravity
const MISS_CHANCE = 0.35
const MISS_OFF = 12
const MISS_OFF_RANGE = 14
const ARC_CHECKS = 8
const TUCK = 0.45
const CROUCH_TIME = 0.12
const CROUCH_DIP = 110
const PUSH_STRETCH = 1
const PUSH_U_MAX = 0.22
const TUCK_SPAN = 0.22
const NECK_APEX = 0.5
const NECK_LAND = 0.25
const REACH_U = 0.7
const LAND_KICK = 2600
const SPRING_K = 380
const SPRING_DAMP = 16
const SPRING_REST = 0.5
const PITCH_SHARE = 0.5
const PITCH_MAX = 0.45
const CATCH_R = 9
//
// Off-view margin (world px) past which a runner is not drawn.
//
const CULL_MARGIN = 60
const MODE = { DASH: 'dash', PAUSE: 'pause' }
//
// The level's runners (createAll): how many, spread over the crawl runs at
// least SET_MIN_RUN px long — one on each, the rest by length (the longer
// a run, the likelier) — sizes SET_SIZE..+RANGE; seeded so they start in
// the same places (the level and the menu's picture of it alike). The
// first SET_HUNTERS start on a top in the fireflies' air (its outward
// normal within TOP_DOWN of straight up, JUMP_HIGH px or more under their
// highest reach and at most HUNT_BAND px under their lowest), where they
// will hunt them.
//
const SET_COUNT = 7
const SET_MIN_RUN = 250
const SET_SIZE = 0.85
const SET_SIZE_RANGE = 0.3
const SET_SEED = 5150
const SET_HUNTERS = 3
const HUNT_BAND = 120
const atlasFor = new WeakMap()
let atlas = null

/**
 * Creates a runner on a crawl run.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.run - Crawl run (Surface.crawlRuns())
 * @param {number} cfg.s - Arc length along the run to start at
 * @param {number} cfg.dir - 1 along the run, -1 back
 * @param {number} cfg.size - Size multiplier
 * @param {number} cfg.seed - Random seed of its moves
 * @returns {Object} Runner instance
 */
export function create(cfg) {
  const { k, run } = cfg
  bake(k)
  const rng = createSeededRandom(cfg.seed)
  const far = Math.round(BYTE_MAX * (1 - COLOR.farShade))
  const inst = {
    k,
    run,
    rng,
    s: cfg.s,
    dir: cfg.dir,
    unit: SCALE * cfg.size,
    speed: 0,
    mode: MODE.PAUSE,
    timer: PAUSE_TIME * rng(),
    dashSpeed: 0,
    fleeing: false,
    bolting: false,
    jump: null,
    dip: 0,
    dipV: 0,
    hunt: null,
    huntRest: HUNT_REST + rng() * HUNT_REST_RANGE,
    lookIn: WATCH_LOOK,
    head: { x: HEAD_AT.x, y: HEAD_AT.y },
    bend: 0,
    landAt: {},
    headAt: { x: 0, y: 0 },
    arcAt: { x: 0, y: 0 },
    fleeHold: 0,
    fleePace: 1,
    cowerFor: 0,
    heroLast: { x: 0, y: 0 },
    heroSeen: false,
    stillFor: 0,
    calmAfter: CALM_AFTER + rng() * CALM_AFTER_RANGE,
    lookOn: {},
    lookBack: {},
    idleIn: IDLE_STEP,
    tailPhase: rng(),
    nextGroup: 0,
    lags: [],
    phase: rng() * Math.PI * 2,
    at: {},
    back: {},
    ahead: {},
    pos: { x: 0, y: 0 },
    f: { x: 1, y: 0 },
    d: { x: 0, y: 1 },
    angle: 0,
    mirror: false,
    legs: createLegs(),
    nearColor: k.rgb(BYTE_MAX, BYTE_MAX, BYTE_MAX),
    farColor: k.rgb(far, far, far),
    v: k.vec2(0, 0),
    anchors: new Map(),
    tmp: { x: 0, y: 0 },
    hip: { x: 0, y: 0 },
    hipAt: { x: 0, y: 0 }
  }
  placeBody(inst)
  inst.legs.forEach(leg => plantAt(inst, leg))
  return inst
}

/**
 * Creates the level's runners on its crawl runs (Surface.crawlRuns).
 * @param {Object} k - Kaplay instance
 * @returns {Array<Object>} Runner instances
 */
export function createAll(k) {
  const rng = createSeededRandom(SET_SEED)
  const runs = Surface.crawlRuns().filter(run => run.len >= SET_MIN_RUN)
  const total = runs.reduce((sum, run) => sum + run.len, 0)
  const tops = huntingTops(runs)
  return Array.from({ length: SET_COUNT }, (_, i) => {
    const top = i < SET_HUNTERS && tops.length ? tops[Math.floor(rng() * tops.length)] : null
    let pick = rng() * total
    const run = top?.run ?? runs[i - SET_HUNTERS] ?? runs.find(r => (pick -= r.len) < 0) ?? runs[runs.length - 1]
    const s = top ? top.s : rng() * run.len
    return create({ k, run, s, dir: rng() < HALF ? -1 : 1, size: SET_SIZE + rng() * SET_SIZE_RANGE, seed: Math.floor(rng() * SET_SEED) })
  })
}

/**
 * Runs the runner on: its dash or pause, its body along the run, its legs
 * — or its leap for a firefly.
 * @param {Object} inst - Runner instance
 * @param {{x: number, y: number}|null} heroPos - The hero's centre (null: none to flee)
 * @param {Object} [food] - Fireflies it may leap for
 * @param {Array<{x: number, y: number}>} food.prey - The fireflies
 * @param {(f: Object) => void} food.onEat - A firefly is eaten
 */
export function onUpdate(inst, heroPos, food = null) {
  const dt = inst.k.dt()
  inst.fleeHold = Math.max(0, inst.fleeHold - dt)
  inst.tailPhase += dt * (TAIL_HZ + TAIL_RUN_HZ * runShare(inst))
  inst.bend += ((inst.jump && inst.jump.t >= 0 ? 1 : 0) - inst.bend) * Math.min(1, BEND_EASE * dt)
  if (inst.jump) {
    const target = inst.jump.f
    const reach = neckReach(inst.jump)
    leap(inst, dt, food)
    aimNeck(inst, target, reach, dt)
    return
  }
  inst.cowerFor = Math.max(0, inst.cowerFor - dt)
  watchHero(inst, heroPos, dt)
  heroPos && inst.cowerFor <= 0 && flee(inst, heroPos)
  move(inst, dt)
  spring(inst, dt)
  placeBody(inst)
  updateLegs(inst, dt)
  food && watch(inst, dt, food)
  aimNeck(inst, inst.hunt?.f, 0, dt)
}

/**
 * Draws the runner (skipped off the view).
 * @param {Object} inst - Runner instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 */
export function onDraw(inst, view) {
  const { pos } = inst
  if (pos.x < view.left - CULL_MARGIN || pos.x > view.right + CULL_MARGIN || pos.y < view.top - CULL_MARGIN || pos.y > view.bottom + CULL_MARGIN) return
  const k = inst.k
  const parts = atlasFor.get(k)
  if (!parts) return
  k.pushTransform()
  k.pushTranslate(inst.v.set(pos.x, pos.y))
  k.pushRotate(inst.angle)
  k.pushScale(inst.v.set(inst.unit, inst.mirror ? -inst.unit : inst.unit))
  drawRunner(inst, parts)
  k.popTransform()
}
//
// Now and then, standing on a top, rested and unafraid: a leap at a
// firefly over it.
//
function watch(inst, dt, food) {
  inst.huntRest -= dt
  if (inst.hunt) {
    stalk(inst, dt)
    return
  }
  inst.lookIn -= dt
  if (inst.huntRest > 0 || inst.lookIn > 0 || inst.fleeing || inst.d.y < TOP_DOWN) return
  inst.lookIn = WATCH_LOOK
  if (inst.rng() > WATCH_CHANCE) return
  const f = lowestOver(inst, food.prey)
  if (!f) return
  inst.hunt = { f, t: HUNT_TIME + inst.rng() * HUNT_TIME_RANGE, aim: 0 }
  inst.timer = 0
}
//
// Hunting: creeping along under the firefly, facing it (waiting at its
// run's end if the firefly is past it), until it sinks
// within a leap (held AIM_TIME s); lost, scared or tired of it, back to
// running about.
//
function stalk(inst, dt) {
  const hunt = inst.hunt
  const f = hunt.f
  hunt.t -= dt
  const dx = f.x - inst.pos.x
  const dy = inst.pos.y - f.y
  if (hunt.t <= 0) {
    search(inst)
    return
  }
  if (inst.fleeing || inst.d.y < TOP_DOWN || Math.hypot(dx, dy) > LOSE_R) {
    endHunt(inst)
    return
  }
  const behind = inst.mode === MODE.DASH && Math.abs(dx) > STALK_NEAR && towardOf(inst, dx) !== inst.dir
  behind && (inst.timer = 0)
  const inReach = Math.abs(dx) < JUMP_REACH && dy > JUMP_LOW && dy < JUMP_HIGH
  hunt.aim = inReach ? hunt.aim + dt : 0
  hunt.aim >= AIM_TIME && leapAt(inst, f) && endHunt(inst)
}
//
// The hunt's next move once the last runs out: a dash toward the firefly
// (turned toward it first), or — under it, or held at its run's end — a
// pause facing it.
//
function huntStep(inst) {
  const dx = inst.hunt.f.x - inst.pos.x
  inst.dir = towardOf(inst, dx)
  const end = inst.dir > 0 ? inst.run.len - END_PAD - 1 : END_PAD + 1
  const blocked = !inst.run.closed && (inst.s - end) * inst.dir >= 0
  if (Math.abs(dx) < STALK_NEAR || blocked) {
    inst.mode = MODE.PAUSE
    inst.timer = PAUSE_TIME + inst.rng() * PAUSE_TIME_RANGE
    return
  }
  inst.mode = MODE.DASH
  inst.timer = DASH_TIME + inst.rng() * DASH_TIME_RANGE
  inst.dashSpeed = (DASH_SPEED + inst.rng() * DASH_SPEED_RANGE) * inst.unit / SCALE
}
//
// Which way along the run leads toward a point dx off it (along X).
//
function towardOf(inst, dx) {
  const at = Surface.sample(inst.run, inst.s, inst.at)
  return Math.sign(dx * at.tx) || inst.dir
}
function endHunt(inst) {
  inst.hunt = null
  inst.huntRest = HUNT_REST + inst.rng() * HUNT_REST_RANGE
}
//
// The lowest firefly over it within its watch (the likeliest to come
// down within a leap), else null.
//
function lowestOver(inst, prey) {
  let best = null
  prey.forEach(p => {
    const up = inst.pos.y - p.y
    const fits = Math.abs(p.x - inst.pos.x) < WATCH_R && up > 0 && up < WATCH_HIGH
    fits && (!best || p.y > best.y) && (best = p)
  })
  return best
}
//
// Tired of a firefly that never came down: off at a run, either way, to
// look for another the moment it stops.
//
function search(inst) {
  inst.hunt = null
  inst.mode = MODE.DASH
  inst.timer = SEARCH_TIME + inst.rng() * SEARCH_TIME_RANGE
  inst.dashSpeed = SEARCH_SPEED * inst.unit / SCALE
  inst.dir = inst.rng() < HALF ? -1 : 1
  inst.huntRest = inst.timer
  inst.lookIn = inst.timer
}
//
// Its head on its neck: at rest as painted; watching a firefly, turned up
// toward it; leaping, stretched out toward it (up to `reach` sheet px
// more), easing there.
//
function aimNeck(inst, f, reach, dt) {
  let tx = HEAD_AT.x
  let ty = HEAD_AT.y
  if (f) {
    const from = toWorld(inst, NECK_FROM.x, NECK_FROM.y, inst.arcAt)
    const wx = f.x - from.x
    const wy = f.y - from.y
    const lx = (wx * inst.f.x + wy * inst.f.y) / inst.unit
    const ly = (wx * inst.d.x + wy * inst.d.y) / inst.unit
    const rest = Math.atan2(HEAD_AT.y - NECK_FROM.y, HEAD_AT.x - NECK_FROM.x)
    const turn = Math.max(NECK_UP, Math.min(NECK_DOWN, Math.atan2(ly, Math.max(0, lx)) - rest))
    const len0 = Math.hypot(HEAD_AT.x - NECK_FROM.x, HEAD_AT.y - NECK_FROM.y)
    const len = len0 + Math.max(0, Math.min(reach, Math.hypot(lx, ly) - len0 - HEAD_R))
    tx = NECK_FROM.x + Math.cos(rest + turn) * len
    ty = NECK_FROM.y + Math.sin(rest + turn) * len
  }
  const ease = Math.min(1, NECK_EASE * dt)
  inst.head.x += (tx - inst.head.x) * ease
  inst.head.y += (ty - inst.head.y) * ease
}
//
// Off at a firefly: turned toward it, an arc whose top takes its head to
// it (or off it, a miss), landing as far again on along the run.
//
function leapAt(inst, f) {
  const at = Surface.sample(inst.run, inst.s, inst.at)
  inst.dir = Math.sign((f.x - inst.pos.x) * at.tx) || inst.dir
  placeBody(inst)
  const head = toWorld(inst, inst.head.x, inst.head.y, inst.headAt)
  const off = inst.rng() < MISS_CHANCE ? MISS_OFF + inst.rng() * MISS_OFF_RANGE : 0
  const a = inst.rng() * Math.PI * 2
  const ax = f.x - (head.x - inst.pos.x) + Math.cos(a) * off
  const ay = f.y - (head.y - inst.pos.y) + Math.sin(a) * off
  const s1 = inst.s + 2 * (ax - inst.pos.x) / (at.tx || 1)
  if (!inst.run.closed && (s1 < END_PAD || s1 > inst.run.len - END_PAD)) return
  const land = Surface.sample(inst.run, s1, inst.landAt)
  const crouch = CROUCH_DIP * inst.unit
  const jump = { t: 0, crouch: 0, T: 0, x0: inst.pos.x + inst.d.x * crouch, y0: inst.pos.y + inst.d.y * crouch, x1: land.x, y1: land.y - HIP_LIFT * inst.unit, h: 0, s1, fx: inst.f.x, fy: inst.f.y, dx: inst.d.x, dy: inst.d.y }
  jump.h = (jump.y0 + jump.y1) * HALF - ay
  if (jump.h <= 0 || hitsSoil(inst, jump)) return
  jump.T = 2 * Math.sqrt(2 * jump.h / JUMP_G)
  jump.crouch = CROUCH_TIME * (1 + Math.min(1, jump.h / JUMP_HIGH))
  jump.t = -jump.crouch
  jump.f = f
  inst.jump = jump
  inst.speed = 0
  inst.dip = 0
  inst.dipV = 0
  inst.legs.forEach(leg => (leg.step = null))
  return true
}
//
// Whether a leap's arc runs into the soil.
//
function hitsSoil(inst, jump) {
  for (let i = 1; i < ARC_CHECKS; i++) {
    const p = arcAt(jump, i / ARC_CHECKS, inst.arcAt)
    if (Surface.isSoil(p.x, p.y)) return true
  }
  return false
}
//
// A leap's point at u (0 take-off … 1 landing).
//
function arcAt(jump, u, out) {
  out.x = jump.x0 + (jump.x1 - jump.x0) * u
  out.y = jump.y0 + (jump.y1 - jump.y0) * u - 4 * jump.h * u * (1 - u)
  return out
}
//
// A leap: first the crouch on planted feet; then in the air along the
// arc, the body turned toward its flight, the legs pushing off, tucked,
// reaching down again; a firefly at its head is eaten. Landed, it stands
// on its run again, gives like a spring and rests.
//
function leap(inst, dt, food) {
  const jump = inst.jump
  if (jump.t < 0) {
    crouch(inst, jump, dt)
    return
  }
  jump.t = Math.min(jump.T, jump.t + dt)
  const u = jump.t / jump.T
  arcAt(jump, u, inst.pos)
  const vx = (jump.x1 - jump.x0) / jump.T
  const vy = ((jump.y1 - jump.y0) - 4 * jump.h * (1 - 2 * u)) / jump.T
  const turn = Math.atan2(jump.fx * vy - jump.fy * vx, jump.fx * vx + jump.fy * vy)
  const pitch = Math.max(-PITCH_MAX, Math.min(PITCH_MAX, turn * PITCH_SHARE))
  const c = Math.cos(pitch)
  const sn = Math.sin(pitch)
  inst.f.x = jump.fx * c - jump.fy * sn
  inst.f.y = jump.fx * sn + jump.fy * c
  inst.d.x = jump.dx * c - jump.dy * sn
  inst.d.y = jump.dx * sn + jump.dy * c
  inst.angle = Math.atan2(inst.f.y, inst.f.x) * DEG
  inst.legs.forEach(leg => flyLeg(inst, leg, u))
  const head = toWorld(inst, inst.head.x, inst.head.y, inst.headAt)
  const f = food?.prey.find(p => Math.hypot(p.x - head.x, p.y - head.y) < CATCH_R)
  f && food.onEat(f)
  u >= 1 && land(inst)
}
//
// How far the neck stretches out through a leap: drawn in on the crouch,
// shooting out as it rises to the top of the arc, drawn back as it comes
// down.
//
function neckReach(jump) {
  if (jump.t < 0) return 0
  const u = jump.t / jump.T
  if (u <= NECK_APEX) return NECK_REACH * smooth(u / NECK_APEX)
  return NECK_REACH * (1 - (1 - NECK_LAND) * smooth((u - NECK_APEX) / (1 - NECK_APEX)))
}
function land(inst) {
  inst.s = inst.jump.s1
  inst.dipV = LAND_KICK * Math.sqrt(Math.min(1, inst.jump.h / JUMP_HIGH))
  inst.jump = null
  inst.dip = 0
  placeBody(inst)
  inst.legs.forEach(leg => plantAt(inst, leg))
  pause(inst)
}
//
// Before the leap: its hips sink on its planted feet; at the bottom the
// feet are kept where they stand for the push-off.
//
function crouch(inst, jump, dt) {
  jump.t = Math.min(0, jump.t + dt)
  inst.dip = CROUCH_DIP * smooth(1 + jump.t / jump.crouch)
  placeBody(inst)
  if (jump.t < 0) return
  inst.dip = 0
  inst.legs.forEach(leg => {
    leg.from.x = leg.foot.x
    leg.from.y = leg.foot.y
    leg.liftU = null
  })
}
//
// A foot in the air at u of the flight: still on the ground while its leg
// pushes off (until it is stretched straight), drawn up to the body, held
// there, reaching out and down for the landing.
//
function flyLeg(inst, leg, u) {
  const tuck = toWorld(inst, leg.restX * TUCK, HIP_LIFT * TUCK, leg.tuck)
  if (leg.liftU === null) {
    const hip = toWorld(inst, leg.hipX, leg.hipY, inst.hipAt)
    const straight = Math.hypot(hip.x - leg.from.x, hip.y - leg.from.y) >= leg.reach * inst.unit * PUSH_STRETCH
    if (!straight && u < PUSH_U_MAX) {
      leg.foot.x = leg.from.x
      leg.foot.y = leg.from.y
      return
    }
    leg.liftU = u
  }
  if (u < REACH_U) {
    const e = smooth(Math.min(1, (u - leg.liftU) / TUCK_SPAN))
    leg.foot.x = leg.from.x + (tuck.x - leg.from.x) * e
    leg.foot.y = leg.from.y + (tuck.y - leg.from.y) * e
    return
  }
  const reach = toWorld(inst, leg.restX, HIP_LIFT, inst.tmp)
  const e = smooth((u - REACH_U) / (1 - REACH_U))
  leg.foot.x = tuck.x + (reach.x - tuck.x) * e
  leg.foot.y = tuck.y + (reach.y - tuck.y) * e
}
//
// The hips' give after a landing: a damped spring back to standing.
//
function spring(inst, dt) {
  if (inst.dip === 0 && inst.dipV === 0) return
  inst.dipV += (-SPRING_K * inst.dip - SPRING_DAMP * inst.dipV) * dt
  inst.dip += inst.dipV * dt
  if (Math.abs(inst.dip) > SPRING_REST || Math.abs(inst.dipV) > SPRING_REST * SPRING_DAMP) return
  inst.dip = 0
  inst.dipV = 0
}
//
// Smoothstep of t (0..1).
//
function smooth(t) {
  return t * t * (3 - 2 * t)
}
//
// Spots on the runs' tops just under the fireflies' air (for hunters).
//
function huntingTops(runs) {
  const high = Layout.FIREFLY_BOUNDS.y1 + JUMP_HIGH
  const low = Layout.FIREFLY_BOUNDS.y2 + HUNT_BAND
  const spots = []
  runs.forEach(run => run.pts.forEach((pt, i) => {
    pt.ny < -TOP_DOWN && pt.y >= high && pt.y <= low && spots.push({ run, s: run.s[i] })
  }))
  return spots
}
//
// The eight legs: pair, near or far, its tripod, its hip and rest spot in
// the body's frame, its foot (world) and step.
//
function createLegs() {
  const legs = []
  for (let pair = 0; pair < PAIRS; pair++) {
    for (let far = 0; far < 2; far++) {
      legs.push({
        pair,
        far: far === 1,
        group: (pair + far) % 2,
        hipX: HIPS[pair].x - ORIGIN.x + (far ? FAR_HIP.x : 0),
        hipY: HIPS[pair].y - ORIGIN.y + (far ? FAR_HIP.y : 0),
        restX: HIPS[pair].x - ORIGIN.x + REST_DX[pair] + (far ? FAR_HIP.x + Math.sign(REST_DX[pair]) * FAR_REST_DX : 0),
        reach: (boneLength(THIGHS[pair]) + boneLength(SHINS[pair])) * LEG_SCALE,
        foot: { x: 0, y: 0 },
        from: { x: 0, y: 0 },
        tuck: { x: 0, y: 0 },
        liftU: null,
        step: null
      })
    }
  }
  return legs
}
function boneLength(bone) {
  return Math.hypot(bone.q.x - bone.p.x, bone.q.y - bone.p.y)
}
//
// Dash or pause: each runs out on its timer; a dash may turn back, its
// speed picked; the speed eases to the mode's at ACCEL / BRAKE. A run's
// open end stops the dash and turns it back.
//
function move(inst, dt) {
  inst.timer -= dt
  inst.timer <= 0 && (inst.hunt ? huntStep(inst) : nextMode(inst))
  const want = inst.mode === MODE.DASH ? inst.dashSpeed : 0
  const rate = want > inst.speed ? (inst.fleeing ? FLEE_ACCEL : ACCEL) : BRAKE
  inst.speed += Math.max(-rate * dt, Math.min(rate * dt, want - inst.speed))
  inst.s += inst.dir * inst.speed * dt
  inst.mode === MODE.PAUSE && fidget(inst, dt)
  if (inst.run.closed) return
  const end = inst.dir > 0 ? inst.run.len - END_PAD : END_PAD
  if ((inst.s - end) * inst.dir < 0) return
  inst.s = end
  inst.speed = 0
  inst.dir = -inst.dir
  if (inst.fleeing && inst.rng() < CORNER_BOLT_CHANCE) {
    inst.bolting = true
    return
  }
  inst.fleeing && (inst.cowerFor = COWER_TIME + inst.rng() * COWER_TIME_RANGE)
  pause(inst)
  inst.timer = Math.max(inst.timer, inst.cowerFor)
}
//
// How hard it runs: 0 standing … 1 at TAIL_RUN_SPEED or faster.
//
function runShare(inst) {
  return Math.min(1, inst.speed / (TAIL_RUN_SPEED * inst.unit / SCALE))
}
function nextMode(inst) {
  if (inst.mode === MODE.DASH) {
    pause(inst)
    return
  }
  const rng = inst.rng
  inst.mode = MODE.DASH
  inst.timer = DASH_TIME + rng() * DASH_TIME_RANGE
  inst.dashSpeed = (DASH_SPEED + rng() * DASH_SPEED_RANGE) * inst.unit / SCALE
  rng() < REVERSE_CHANCE && (inst.dir = -inst.dir)
}
function pause(inst) {
  inst.fleeing = false
  inst.bolting = false
  inst.mode = MODE.PAUSE
  inst.timer = PAUSE_TIME + inst.rng() * PAUSE_TIME_RANGE
}
//
// The hero close by: a dash away from him along the run, kept up while
// he stays near; a cornered one bolting past him holds its way until he
// is behind it.
//
function flee(inst, heroPos) {
  const dx = heroPos.x - inst.pos.x
  const dy = heroPos.y - inst.pos.y
  const r = inst.stillFor >= inst.calmAfter ? CALM_FEAR_R : FEAR_R
  if (dx * dx + dy * dy > r * r) return
  inst.fleeing || (inst.fleePace = FLEE_PACE + inst.rng() * FLEE_PACE_RANGE)
  const look = FLEE_LOOK * inst.dir
  const on = Surface.sample(inst.run, inst.s + look, inst.lookOn)
  const back = Surface.sample(inst.run, inst.s - look, inst.lookBack)
  const gain = Math.hypot(on.x - heroPos.x, on.y - heroPos.y) - Math.hypot(back.x - heroPos.x, back.y - heroPos.y)
  inst.bolting && gain > FLEE_DEADBAND && (inst.bolting = false)
  if (!inst.bolting && inst.fleeHold <= 0 && gain < (inst.fleeing ? -FLEE_DEADBAND : 0)) {
    inst.dir = -inst.dir
    inst.fleeHold = FLEE_HOLD
  }
  inst.fleeing = true
  inst.mode = MODE.DASH
  inst.timer = FLEE_TIME
  inst.dashSpeed = FLEE_SPEED * inst.fleePace * inst.unit / SCALE
}
//
// How long the hero has stood still (he moved under HERO_STILL px/s);
// moving, he is feared afresh, a little later or sooner each time.
//
function watchHero(inst, heroPos, dt) {
  const last = inst.heroLast
  if (!heroPos || dt <= 0) {
    inst.heroSeen = false
    inst.stillFor = 0
    return
  }
  const still = inst.heroSeen && Math.hypot(heroPos.x - last.x, heroPos.y - last.y) < HERO_STILL * dt
  inst.heroSeen = true
  last.x = heroPos.x
  last.y = heroPos.y
  if (still) {
    inst.stillFor += dt
    return
  }
  inst.stillFor > 0 && (inst.calmAfter = CALM_AFTER + inst.rng() * CALM_AFTER_RANGE)
  inst.stillFor = 0
}
//
// In a pause one leg shifts a little now and then (while all stand).
//
function fidget(inst, dt) {
  inst.idleIn -= dt
  if (inst.idleIn > 0) return
  inst.idleIn = IDLE_STEP + inst.rng() * IDLE_STEP_RANGE
  const leg = inst.legs[Math.floor(inst.rng() * inst.legs.length)]
  if (inst.legs.some(other => other.step)) return
  startStep(inst, leg, (inst.rng() - HALF) * IDLE_JITTER)
}
//
// The body's frame on its run: the hips' line HIP_LIFT over the surface,
// down toward the surface, forward along the run the way it goes;
// mirrored when that frame is left-handed on screen.
//
function placeBody(inst) {
  const at = Surface.sample(inst.run, inst.s, inst.at)
  const span = BODY_SPAN * inst.unit
  const a = Surface.sample(inst.run, inst.s - span, inst.back)
  const b = Surface.sample(inst.run, inst.s + span, inst.ahead)
  let tx = b.x - a.x
  let ty = b.y - a.y
  const chord = Math.hypot(tx, ty)
  tx = chord > 1 ? tx / chord : at.tx
  ty = chord > 1 ? ty / chord : at.ty
  const out = (ty * at.nx - tx * at.ny) >= 0 ? 1 : -1
  const nx = ty * out
  const ny = -tx * out
  const lift = (HIP_LIFT - inst.dip) * inst.unit
  inst.pos.x = at.x + nx * lift
  inst.pos.y = at.y + ny * lift
  inst.d.x = -nx
  inst.d.y = -ny
  inst.f.x = tx * inst.dir
  inst.f.y = ty * inst.dir
  inst.angle = Math.atan2(inst.f.y, inst.f.x) * DEG
  inst.mirror = inst.d.x * -inst.f.y + inst.d.y * inst.f.x < 0
}
//
// A body-frame point (sheet px) in the world.
//
function toWorld(inst, lx, ly, out) {
  const u = inst.unit
  out.x = inst.pos.x + (inst.f.x * lx + inst.d.x * ly) * u
  out.y = inst.pos.y + (inst.f.y * lx + inst.d.y * ly) * u
  return out
}
//
// Where a leg's foot belongs now: down the body's own down from over its
// rest spot (shifted `ahead` sheet px) onto the surface, a far foot a
// little over it; hanging under the hip where the ray finds nothing.
//
function spotOf(inst, leg, ahead, out) {
  const start = toWorld(inst, leg.restX + ahead, leg.hipY, inst.tmp)
  const hit = Surface.raycast(start.x, start.y, inst.d.x, inst.d.y, (HIP_LIFT - leg.hipY + RAY_PAST) * inst.unit)
  if (!hit) return toWorld(inst, leg.restX + ahead, HIP_LIFT * DANGLE, out)
  const lift = leg.far ? FAR_LIFT * inst.unit : 0
  out.x = hit.x - inst.d.x * lift
  out.y = hit.y - inst.d.y * lift
  return out
}
function plantAt(inst, leg) {
  spotOf(inst, leg, 0, leg.foot)
}
//
// Steps the legs on; once all stand, the tripod whose turn it is (or else
// the other) lifts off if it lags, and the turn passes.
//
function updateLegs(inst, dt) {
  inst.legs.forEach(leg => leg.step && stepOn(inst, leg, dt))
  if (inst.legs.some(leg => leg.step)) return
  const lags = inst.lags
  inst.legs.forEach((leg, i) => (lags[i] = lagOf(inst, leg)))
  const wants = group => inst.legs.some((leg, i) => leg.group === group && lags[i] > STEP_TRIGGER)
  let group = inst.nextGroup
  if (!wants(group)) group = 1 - group
  if (!wants(group)) return
  inst.legs.forEach((leg, i) => leg.group === group && lags[i] > TRIPOD_FOLLOW && startStep(inst, leg, 0))
  inst.nextGroup = 1 - group
}
//
// How far a foot lags its spot (sheet px); a leg stretched past STRETCH of
// its reach counts as lagging all the way once it lags STRETCH_LAG.
//
function lagOf(inst, leg) {
  const u = inst.unit
  const spot = spotOf(inst, leg, 0, inst.tmp)
  const lag = Math.hypot(leg.foot.x - spot.x, leg.foot.y - spot.y) / u
  const hip = toWorld(inst, leg.hipX, leg.hipY, inst.hip)
  const stretch = Math.hypot(leg.foot.x - hip.x, leg.foot.y - hip.y) / u
  return lag > STRETCH_LAG && stretch > leg.reach * STRETCH ? Math.max(lag, STEP_TRIGGER + 1) : lag
}
function startStep(inst, leg, ahead) {
  leg.step = { t: 0, fromX: leg.foot.x, fromY: leg.foot.y, ahead, to: { x: 0, y: 0 } }
}
//
// A step on: toward the leg's spot as it is now (led ahead by the body's
// motion still to come), lifted off the surface on the way.
//
function stepOn(inst, leg, dt) {
  const step = leg.step
  step.t = Math.min(1, step.t + dt / STEP_TIME)
  const lead = inst.speed * STEP_TIME * (1 - step.t) * STEP_LEAD / inst.unit
  const to = spotOf(inst, leg, step.ahead + lead, step.to)
  const lift = Math.sin(step.t * Math.PI) * STEP_LIFT * inst.unit
  leg.foot.x = step.fromX + (to.x - step.fromX) * step.t - inst.d.x * lift
  leg.foot.y = step.fromY + (to.y - step.fromY) * step.t - inst.d.y * lift
  step.t >= 1 && (leg.step = null)
}
//
// Back to front: the far feeler and the far legs (darker), the tail
// (wagging the harder the faster it runs), the neck, the body, the head,
// the near feeler, the near legs.
//
function drawRunner(inst, parts) {
  const t = inst.k.time() + inst.phase
  const hz = inst.speed > 1 ? FEELER_RUN_HZ : FEELER_HZ
  drawFeeler(inst, parts, FEELERS[0], t * hz)
  inst.legs.forEach(leg => leg.far && drawLeg(inst, parts, leg))
  const wag = Math.sin(inst.tailPhase * Math.PI * 2) * (TAIL_SWAY + TAIL_RUN_SWAY * runShare(inst)) + TAIL_BEND * inst.bend
  drawPart(inst, parts.get(TAIL.piece), TAIL.at.x - ORIGIN.x, TAIL.at.y - ORIGIN.y, TAIL.pivot, wag, inst.nearColor)
  drawNeck(inst, parts.get(NECK.piece))
  drawPart(inst, parts.get('runnerBody'), 0, 0, ORIGIN, -BODY_BEND * inst.bend, inst.nearColor)
  drawPart(inst, parts.get(HEAD.piece), inst.head.x, inst.head.y, HEAD.pivot, 0, inst.nearColor)
  drawFeeler(inst, parts, FEELERS[1], t * hz)
  inst.legs.forEach(leg => leg.far || drawLeg(inst, parts, leg))
}
//
// The neck: its piece NECK.thick times as thick and stretched along its
// own axis to run from inside the body to the head's middle.
//
function drawNeck(inst, part) {
  const nx = inst.head.x - NECK_FROM.x
  const ny = inst.head.y - NECK_FROM.y
  const len = Math.hypot(nx, ny)
  const vx = (NECK.q.x - NECK.p.x) * NECK.thick
  const vy = NECK.q.y - NECK.p.y
  const stretch = Math.sqrt(Math.max(0, len * len - vx * vx)) / Math.abs(vy)
  const turn = Math.atan2(ny, nx) - Math.atan2(vy * stretch, vx)
  drawPart(inst, part, NECK_FROM.x, NECK_FROM.y, NECK.p, turn * DEG, inst.nearColor, NECK.thick, stretch)
}
//
// A feeler on the head, swinging (`cycles`: its swings so far).
//
function drawFeeler(inst, parts, feeler, cycles) {
  const x = inst.head.x + feeler.at.x - HEAD.pivot.x
  const y = inst.head.y + feeler.at.y - HEAD.pivot.y
  const angle = Math.sin(cycles * Math.PI * 2 + feeler.phase) * FEELER_SWING
  drawPart(inst, parts.get(feeler.piece), x, y, feeler.pivot, angle, feeler.far ? inst.farColor : inst.nearColor)
}
//
// A leg in the body's frame: its toe from its planted foot, its ankle as
// the foot is painted over it, the knee by IK from the hip; then the foot,
// the shin, the thigh and the hip ball.
//
function drawLeg(inst, parts, leg) {
  const u = inst.unit
  const rx = leg.foot.x - inst.pos.x
  const ry = leg.foot.y - inst.pos.y
  const toeX = (rx * inst.f.x + ry * inst.f.y) / u
  const toeY = (rx * inst.d.x + ry * inst.d.y) / u
  const foot = FEET[leg.pair]
  const thigh = THIGHS[leg.pair]
  const shin = SHINS[leg.pair]
  const l1 = boneLength(thigh) * LEG_SCALE
  const l2 = boneLength(shin) * LEG_SCALE
  let ax = toeX + (foot.ankle.x - foot.toe.x) * LEG_SCALE - leg.hipX
  let ay = toeY + (foot.ankle.y - foot.toe.y) * LEG_SCALE - leg.hipY
  const dist = Math.max(Math.abs(l1 - l2) + KNEE_SLACK, Math.min(l1 + l2 - KNEE_SLACK, Math.hypot(ax, ay)))
  const base = Math.atan2(ay, ax)
  ax = Math.cos(base) * dist
  ay = Math.sin(base) * dist
  const bend = Math.acos(Math.max(-1, Math.min(1, (l1 * l1 + dist * dist - l2 * l2) / (2 * l1 * dist))))
  const kneeA = base - bend
  const kneeB = base + bend
  const side = leg.pair >= PAIRS / 2 ? 1 : -1
  const knee = side * Math.cos(kneeA) > side * Math.cos(kneeB) ? kneeA : kneeB
  const kx = leg.hipX + Math.cos(knee) * l1
  const ky = leg.hipY + Math.sin(knee) * l1
  const ankleX = leg.hipX + ax
  const ankleY = leg.hipY + ay
  const color = leg.far ? inst.farColor : inst.nearColor
  drawPart(inst, parts.get(`runnerFoot${leg.pair}`), ankleX, ankleY, foot.ankle, 0, color, LEG_SCALE)
  drawBone(inst, parts.get(`runnerShin${leg.pair}`), shin, kx, ky, ankleX, ankleY, color)
  drawBone(inst, parts.get(`runnerThigh${leg.pair}`), thigh, leg.hipX, leg.hipY, kx, ky, color)
  drawPart(inst, parts.get(`runnerHip${leg.pair}`), leg.hipX, leg.hipY, HIP_BALL, 0, color, HIP_BALL_SCALE)
}
//
// A leg's bone piece laid from one joint to the other (its p on the
// first).
//
function drawBone(inst, part, bone, x1, y1, x2, y2, color) {
  const turn = Math.atan2(y2 - y1, x2 - x1) - Math.atan2(bone.q.y - bone.p.y, bone.q.x - bone.p.x)
  drawPart(inst, part, x1, y1, bone.p, turn * DEG, color, LEG_SCALE)
}
//
// One part at a body-frame point, its pivot there, turned (degrees),
// `sx` / `sy` times its sheet width / height; the pivot's anchor made
// once per pivot.
//
function drawPart(inst, part, x, y, pivot, angle, color, sx = 1, sy = sx) {
  const k = inst.k
  let anchor = inst.anchors.get(pivot)
  anchor || inst.anchors.set(pivot, (anchor = k.vec2(pivot.x / part.w * 2 - 1, pivot.y / part.h * 2 - 1)))
  k.drawSprite({
    sprite: SPRITE,
    quad: part.quad,
    width: part.w * sx,
    height: part.h * sy,
    pos: inst.v.set(x, y),
    anchor,
    angle,
    color
  })
}
//
// The atlas of every part, laid out once per page (BAKE_OVER finer than
// drawn at size 1, shaded toward the cave's dark, grained) and loaded
// once per live k; its parts' quads and sheet sizes by piece name.
//
function bake(k) {
  if (atlasFor.has(k)) return
  atlas ??= buildAtlas()
  if (!atlas) return
  k.loadSprite(SPRITE, atlas.canvas, { filter: 'linear' })
  atlasFor.set(k, atlas.parts)
}
function buildAtlas() {
  const names = ['runnerBody', HEAD.piece, TAIL.piece, NECK.piece].concat(
    FEELERS.map(feeler => feeler.piece),
    Atlas.pieceNames('runnerHip'),
    Atlas.pieceNames('runnerThigh'),
    Atlas.pieceNames('runnerShin'),
    Atlas.pieceNames('runnerFoot')
  )
  const scale = SCALE * BAKE_OVER
  const placed = []
  let x = ATLAS_GAP
  let y = ATLAS_GAP
  let shelf = 0
  for (const name of names) {
    const src = Atlas.piece(name)
    if (!src) return null
    const w = Math.ceil(src.width * scale)
    const h = Math.ceil(src.height * scale)
    if (x + w + ATLAS_GAP > ATLAS_W) {
      x = ATLAS_GAP
      y += shelf + ATLAS_GAP
      shelf = 0
    }
    placed.push({ name, src, x, y, w, h })
    x += w + ATLAS_GAP
    shelf = Math.max(shelf, h)
  }
  const canvas = document.createElement('canvas')
  canvas.width = ATLAS_W
  canvas.height = y + shelf + ATLAS_GAP
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingEnabled = true
  ctx.imageSmoothingQuality = 'high'
  placed.forEach(p => ctx.drawImage(p.src, p.x, p.y, p.w, p.h))
  ctx.globalCompositeOperation = 'source-atop'
  ctx.globalAlpha = COLOR.shadeAmount
  ctx.fillStyle = COLOR.shade
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  const parts = new Map()
  placed.forEach(p => parts.set(p.name, {
    quad: { x: p.x / canvas.width, y: p.y / canvas.height, w: p.w / canvas.width, h: p.h / canvas.height },
    w: p.src.width,
    h: p.src.height
  }))
  return { canvas, parts }
}
