import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Surface from '../utils/cave-surface.js'
//
// The runner: a small insect of runner.png's parts — a body under a leaf
// shell, a head with one big eye on a neck, two feelers, a leaf for a tail
// (wagging as it runs) and eight legs (four pairs, rear to front; each a hip ball, a thigh, a
// shin and a clawed foot). It runs over every side of the platforms —
// tops, sides and undersides (cave-surface.js's crawl runs), never into
// the lake — the way insects do: short dashes and still pauses, now and
// then turning back, turning back at a run's end — and afraid of the
// hero: once he comes close it bolts away from him, fast.
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
// runner). In a pause a leg shifts now and then (IDLE_STEP..+RANGE s
// apart, up to IDLE_JITTER sheet px off its spot).
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
// Off-view margin (world px) past which a runner is not drawn.
//
const CULL_MARGIN = 60
const MODE = { DASH: 'dash', PAUSE: 'pause' }
//
// The level's runners (createAll): how many, spread over the crawl runs at
// least SET_MIN_RUN px long — one on each, the rest by length (the longer
// a run, the likelier) — sizes SET_SIZE..+RANGE; seeded so they start in
// the same places (the level and the menu's picture of it alike).
//
const SET_COUNT = 7
const SET_MIN_RUN = 250
const SET_SIZE = 0.85
const SET_SIZE_RANGE = 0.3
const SET_SEED = 5150
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
    fleeHold: 0,
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
    hip: { x: 0, y: 0 }
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
  return Array.from({ length: SET_COUNT }, (_, i) => {
    let pick = rng() * total
    const run = runs[i] ?? runs.find(r => (pick -= r.len) < 0) ?? runs[runs.length - 1]
    return create({ k, run, s: rng() * run.len, dir: rng() < HALF ? -1 : 1, size: SET_SIZE + rng() * SET_SIZE_RANGE, seed: Math.floor(rng() * SET_SEED) })
  })
}

/**
 * Runs the runner on: its dash or pause, its body along the run, its legs.
 * @param {Object} inst - Runner instance
 * @param {{x: number, y: number}|null} heroPos - The hero's centre (null: none to flee)
 */
export function onUpdate(inst, heroPos) {
  const dt = inst.k.dt()
  inst.fleeHold = Math.max(0, inst.fleeHold - dt)
  heroPos && flee(inst, heroPos)
  move(inst, dt)
  inst.tailPhase += dt * (TAIL_HZ + TAIL_RUN_HZ * runShare(inst))
  placeBody(inst)
  updateLegs(inst, dt)
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
  inst.timer <= 0 && nextMode(inst)
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
  if (inst.fleeing) {
    inst.bolting = true
    return
  }
  pause(inst)
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
  if (dx * dx + dy * dy > FEAR_R * FEAR_R) return
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
  inst.dashSpeed = FLEE_SPEED * inst.unit / SCALE
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
  const lift = HIP_LIFT * inst.unit
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
  const wag = Math.sin(inst.tailPhase * Math.PI * 2) * (TAIL_SWAY + TAIL_RUN_SWAY * runShare(inst))
  drawPart(inst, parts.get(TAIL.piece), TAIL.at.x - ORIGIN.x, TAIL.at.y - ORIGIN.y, TAIL.pivot, wag, inst.nearColor)
  drawNeck(inst, parts.get(NECK.piece))
  drawPart(inst, parts.get('runnerBody'), 0, 0, ORIGIN, 0, inst.nearColor)
  drawPart(inst, parts.get(HEAD.piece), HEAD_AT.x, HEAD_AT.y, HEAD.pivot, 0, inst.nearColor)
  drawFeeler(inst, parts, FEELERS[1], t * hz)
  inst.legs.forEach(leg => leg.far || drawLeg(inst, parts, leg))
}
//
// The neck: its piece NECK.thick times as thick and stretched along its
// own axis to run from inside the body to the head's middle.
//
function drawNeck(inst, part) {
  const len = Math.hypot(HEAD_AT.x - NECK_FROM.x, HEAD_AT.y - NECK_FROM.y)
  const vx = (NECK.q.x - NECK.p.x) * NECK.thick
  const vy = NECK.q.y - NECK.p.y
  const stretch = Math.sqrt(Math.max(0, len * len - vx * vx)) / Math.abs(vy)
  const turn = Math.atan2(NECK_DIR.y, NECK_DIR.x) - Math.atan2(vy * stretch, vx)
  drawPart(inst, part, NECK_FROM.x, NECK_FROM.y, NECK.p, turn * DEG, inst.nearColor, NECK.thick, stretch)
}
//
// A feeler on the head, swinging (`cycles`: its swings so far).
//
function drawFeeler(inst, parts, feeler, cycles) {
  const x = HEAD_AT.x + feeler.at.x - HEAD.pivot.x
  const y = HEAD_AT.y + feeler.at.y - HEAD.pivot.y
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
