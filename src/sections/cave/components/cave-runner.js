import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Surface from '../utils/cave-surface.js'
//
// The runner: a small insect of runner.png's parts — a body under a leaf
// shell, a head with one big eye, two beaded feelers, a leaf for a tail
// and eight legs (four pairs, rear to front; each a hip ball, a thigh, a
// shin and a clawed foot). It runs over every side of the platforms —
// tops, sides and undersides (cave-surface.js's crawl runs), never into
// the lake — the way insects do: short dashes and still pauses, now and
// then turning back, turning back at a run's end, darting off when the
// hero comes close.
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
// its hips' line), the head and the tail by a pivot set at a point of the
// body, each feeler by its base set at a point of the head.
//
const ORIGIN = { x: 362, y: 319 }
const HEAD = { piece: 'runnerHead', pivot: { x: 94, y: 88 }, at: { x: 737, y: 252 } }
const TAIL = { piece: 'runnerTail', pivot: { x: 164, y: 66 }, at: { x: 40, y: 330 } }
//
// Both feelers are the sheet's straight one (its curled one reads as a
// hook at this size): the far one darker, set further back on the head
// and turned up by `turn` degrees.
//
const FEELER = { piece: 'runnerFeeler', pivot: { x: 18, y: 162 } }
const FEELERS = [
  { at: { x: 92, y: 30 }, turn: -18, far: true, phase: 0 },
  { at: { x: 126, y: 28 }, turn: 0, far: false, phase: 1.7 }
]
//
// Legs, per pair rear to front: the hip on the body (x on the hips'
// line), the thigh's and the shin's joints in their pieces (p at the
// body's end, q at the far end), the foot's ankle and toe (its claws'
// tip), the hip ball's middle, and where its toe rests ahead of the hip
// (x; the far leg FAR_REST_DX further out). A far leg's hip sits FAR_HIP
// off the near one's, its toe FAR_LIFT over the surface. The legs are
// drawn LEG_SCALE times their size on the sheet (and the hip balls
// HIP_BALL_SCALE): at the runner's size the painted ones read too short.
//
const HIP_X = [177, 332, 482, 627]
const THIGHS = [
  { p: { x: 118.6, y: 28.2 }, q: { x: 25.5, y: 117.9 } },
  { p: { x: 141.1, y: 25.9 }, q: { x: 21.8, y: 147.2 } },
  { p: { x: 115.1, y: 25.0 }, q: { x: 22.0, y: 153.3 } },
  { p: { x: 39.8, y: 29.7 }, q: { x: 90.6, y: 134.7 } }
]
const SHINS = [
  { p: { x: 57.8, y: 27.3 }, q: { x: 31.0, y: 122.7 } },
  { p: { x: 48.0, y: 27.3 }, q: { x: 33.9, y: 143.1 } },
  { p: { x: 41.2, y: 27.8 }, q: { x: 58.3, y: 139.9 } },
  { p: { x: 37.3, y: 28.1 }, q: { x: 57.5, y: 128.6 } }
]
const FEET = [
  { ankle: { x: 102.6, y: 30.3 }, toe: { x: 15.9, y: 162.6 } },
  { ankle: { x: 104.0, y: 30.0 }, toe: { x: 14.5, y: 148.9 } },
  { ankle: { x: 27.8, y: 30.9 }, toe: { x: 116.1, y: 150.2 } },
  { ankle: { x: 27.3, y: 30.3 }, toe: { x: 120.5, y: 145.4 } }
]
const HIP_BALL = { x: 46.5, y: 46 }
const REST_DX = [-250, -100, 90, 240]
const FAR_HIP = { x: -26, y: -16 }
const FAR_REST_DX = 30
const FAR_LIFT = 12
const PAIRS = 4
const LEG_SCALE = 1.35
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
// END_PAD px before it. The hero within FEAR_R px sends it off at
// FLEE_SPEED for FLEE_TIME. In a pause a leg shifts now and then
// (IDLE_STEP..+RANGE s apart, up to IDLE_JITTER sheet px off its spot).
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
const FEAR_R = 130
const FLEE_SPEED = 300
const FLEE_TIME = 0.6
const IDLE_STEP = 0.25
const IDLE_STEP_RANGE = 0.6
const IDLE_JITTER = 40
//
// Feelers swing FEELER_SWING degrees at FEELER_HZ (FEELER_RUN_HZ while it
// runs); the tail sways TAIL_SWAY degrees at TAIL_HZ.
//
const FEELER_SWING = 9
const FEELER_HZ = 2.2
const FEELER_RUN_HZ = 5
const TAIL_SWAY = 4
const TAIL_HZ = 1.5
//
// Off-view margin (world px) past which a runner is not drawn.
//
const CULL_MARGIN = 60
const MODE = { DASH: 'dash', PAUSE: 'pause' }
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
    idleIn: IDLE_STEP,
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
 * Runs the runner on: its dash or pause, its body along the run, its legs.
 * @param {Object} inst - Runner instance
 * @param {{x: number, y: number}|null} heroPos - The hero's centre (null: none to flee)
 */
export function onUpdate(inst, heroPos) {
  const dt = inst.k.dt()
  heroPos && flee(inst, heroPos)
  move(inst, dt)
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
        hipX: HIP_X[pair] - ORIGIN.x + (far ? FAR_HIP.x : 0),
        hipY: far ? FAR_HIP.y : 0,
        restX: HIP_X[pair] - ORIGIN.x + REST_DX[pair] + (far ? FAR_HIP.x + Math.sign(REST_DX[pair]) * FAR_REST_DX : 0),
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
  const rate = want > inst.speed ? ACCEL : BRAKE
  inst.speed += Math.max(-rate * dt, Math.min(rate * dt, want - inst.speed))
  inst.s += inst.dir * inst.speed * dt
  inst.mode === MODE.PAUSE && fidget(inst, dt)
  if (inst.run.closed) return
  const end = inst.dir > 0 ? inst.run.len - END_PAD : END_PAD
  if ((inst.s - end) * inst.dir < 0) return
  inst.s = end
  inst.speed = 0
  inst.dir = -inst.dir
  pause(inst)
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
  inst.mode = MODE.PAUSE
  inst.timer = PAUSE_TIME + inst.rng() * PAUSE_TIME_RANGE
}
//
// The hero close by: a dash away from him along the run.
//
function flee(inst, heroPos) {
  const dx = heroPos.x - inst.pos.x
  const dy = heroPos.y - inst.pos.y
  if (dx * dx + dy * dy > FEAR_R * FEAR_R || (inst.mode === MODE.DASH && inst.dashSpeed >= FLEE_SPEED)) return
  const along = (dx * inst.at.tx + dy * inst.at.ty) > 0 ? 1 : -1
  inst.dir = -along
  inst.mode = MODE.DASH
  inst.timer = FLEE_TIME
  inst.dashSpeed = FLEE_SPEED
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
// Back to front: the far feeler and the far legs (darker), the tail, the
// head, the body, the near feeler, the near legs.
//
function drawRunner(inst, parts) {
  const t = inst.k.time() + inst.phase
  const hz = inst.speed > 1 ? FEELER_RUN_HZ : FEELER_HZ
  const headX = HEAD.at.x - ORIGIN.x
  const headY = HEAD.at.y - ORIGIN.y
  drawFeeler(inst, parts, FEELERS[0], headX, headY, t * hz)
  inst.legs.forEach(leg => leg.far && drawLeg(inst, parts, leg))
  const sway = Math.sin(t * Math.PI * 2 * TAIL_HZ) * TAIL_SWAY
  drawPart(inst, parts.get(TAIL.piece), TAIL.at.x - ORIGIN.x, TAIL.at.y - ORIGIN.y, TAIL.pivot, sway, inst.nearColor)
  drawPart(inst, parts.get(HEAD.piece), headX, headY, HEAD.pivot, 0, inst.nearColor)
  drawPart(inst, parts.get('runnerBody'), 0, 0, ORIGIN, 0, inst.nearColor)
  drawFeeler(inst, parts, FEELERS[1], headX, headY, t * hz)
  inst.legs.forEach(leg => leg.far || drawLeg(inst, parts, leg))
}
//
// A feeler on the head, swinging (`cycles`: its swings so far).
//
function drawFeeler(inst, parts, feeler, headX, headY, cycles) {
  const x = headX + feeler.at.x - HEAD.pivot.x
  const y = headY + feeler.at.y - HEAD.pivot.y
  const angle = feeler.turn + Math.sin(cycles * Math.PI * 2 + feeler.phase) * FEELER_SWING
  drawPart(inst, parts.get(FEELER.piece), x, y, FEELER.pivot, angle, feeler.far ? inst.farColor : inst.nearColor)
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
// `size` times its sheet size; the pivot's anchor made once per pivot.
//
function drawPart(inst, part, x, y, pivot, angle, color, size = 1) {
  const k = inst.k
  let anchor = inst.anchors.get(pivot)
  anchor || inst.anchors.set(pivot, (anchor = k.vec2(pivot.x / part.w * 2 - 1, pivot.y / part.h * 2 - 1)))
  k.drawSprite({
    sprite: SPRITE,
    quad: part.quad,
    width: part.w * size,
    height: part.h * size,
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
  const names = ['runnerBody', HEAD.piece, TAIL.piece, FEELER.piece].concat(
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
