import { getRGB, vecLen } from '../../../utils/helper.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from '../utils/cave-layout.js'
import * as Nav from '../utils/cave-haggy-nav.js'
import * as Solid from '../utils/cave-haggy-solid.js'
import * as Look from './cave-haggy-draw.js'
//
// The climber (haggy_waggy.png): a blind predator, a heavy head on five
// long jointless limbs with clawed hands. It goes along ways of the nav
// graph (cave-haggy-nav.js) over everything solid to it
// (cave-haggy-solid.js) and never into water.
// - The head rides its way: its place on the way (the carrot) goes on at
//   the mood's speed while a hold lies ahead of it — it never passes its
//   foremost hold, so it always stands or hangs among its hands — and the
//   head follows the carrot as a critically damped spring: no jerks.
//   Walking it keeps half a limb over the ground; its soft head keeps out
//   of everything hard and squeezes in tight places.
// - The limbs step: the hand left farthest behind lets go and reaches for
//   a hold on ahead (a curve clear of everything hard, eased with minimum
//   jerk), a holding hand keeps on the line from its shoulder to its hold
//   and lets go once that line is cut; free hands hang, or feel about.
// - A limb is a chain of points, no physics of its own: holding, it runs
//   straight from the hold to the head; free, each point follows the next
//   one toward the hand (the hand leads as a head does); caught behind
//   something, it is drawn in from the shoulder and the hand comes after.
//   No point of it goes into anything hard.
// - It senses by ultrasound (pulses in a cone from its upper jaw, echoes
//   off moving things) and by touch (its claws), and hunts what it finds.
// The simulation runs in fixed steps (perf.simHz; farHz off screen), the
// drawing eases between the last two steps; plans are made at perf.planHz.
// Nothing is allocated per frame.
//
const C = CAVE_CFG.haggy
const ANAT = C.anatomy
const LIMB = C.limb
const TURN = C.turning
const GRIP = C.grip
const SENSE = C.sense
const SONAR = SENSE.ultrasound
const PERF = C.perf
const HEAD = ANAT.head
const AVOID = SENSE.avoid
const MOOD = { EXPLORE: 'explore', PURSUE: 'pursue', INVESTIGATE: 'investigate' }
const MOOD_CFG = { [MOOD.EXPLORE]: C.explore, [MOOD.PURSUE]: C.pursuit, [MOOD.INVESTIGATE]: C.explore }
const STATE = { HOLD: 'hold', REACH: 'reach', FREE: 'free' }
const SOURCE = { ULTRASOUND: 'ultrasound', TOUCH: 'touch' }
//
// A limb: SEGS pieces; a hold may be HOLD_REACH px from the shoulder when
// taken and ANCHOR_SLACK of the limb's length before it is let go, never
// nearer than ARM_MIN px. Its chain is settled in LIMB_PASSES passes; a
// free one's pieces are smoothed (SMOOTH of the way to their neighbours'
// middle), never stretched past STRETCH_MAX; one caught behind something
// is drawn in to DRAG_TIGHT of the length it lies at per pull. A point in
// something hard is moved out PUSH px at a time, PUSH_STEPS times; one
// whose move of more than CROSS_STEP px would cross something stops
// before it and slides along it, SLIDE_MAX px a step at most; deep in,
// the way out is looked for up to DEEP_FAR px off.
//
const SEGS = ANAT.segments
const REACH_MAX = ANAT.length
const HOLD_REACH = REACH_MAX * ANAT.reachShare
const ANCHOR_SLACK = 0.98
const ARM_MIN = 60
const LIMB_PASSES = 2
const SMOOTH = 0.22
const STRETCH_MAX = 1.15
const DRAG_TIGHT = 0.92
const PUSH = 1
const PUSH_STEPS = 6
const CROSS_STEP = 6
const SLIDE_MAX = 6
const DEEP_FAR = 36
//
// The head: kept out of anything hard by HEAD_POINTS points round its
// ellipse (HEAD_PAD px wider: it bobs that much as drawn), a px at a
// time, BODY_PUSH times a step; it squeezes by SQUEEZE_STEP shares and
// swells back at SWELL_RATE per s. Walking, the ground under it is looked
// for every GROUND_STEP px.
//
const HEAD_POINTS = 24
const HEAD_PAD = 2
const HEAD_COS = Float64Array.from({ length: HEAD_POINTS }, (_, i) => Math.cos(i / HEAD_POINTS * Math.PI * 2))
const HEAD_SIN = Float64Array.from({ length: HEAD_POINTS }, (_, i) => Math.sin(i / HEAD_POINTS * Math.PI * 2))
const BODY_PUSH = 10
const SQUEEZE_STEP = 0.02
const SWELL_RATE = 2
const GROUND_STEP = 6
//
// Travel: it rests REST..+REST_RANGE s at a way's end; its place on the
// way goes on in full while a hold lies AHEAD_FULL of the mood's lead
// ahead of the head (slower the nearer the foremost hold) and the head
// is within LAG_FULL of the lead of it; under MOVE_EPS px/s it stands.
// Free to go but under STUCK_SHARE of its speed for STUCK s, it gives
// that way up. It goes on only once turned within TURNED of the way it
// faces.
//
const START_SPOT = { x: 620, y: 470 }
const REST = 2
const REST_RANGE = 4
const AHEAD_FULL = 0.6
const LAG_FULL = 0.5
const MOVE_EPS = 2
const STUCK = 3
const STUCK_SHARE = 0.1
const TURNED = 0.3
//
// Hands. Its fingers curl to CURL_GRIP on a hold, open to CURL_OPEN on a
// reach, hang at CURL_FREE (eased at CURL_RATE per s). A reach's curve
// draws back RETRACT of the way to the shoulder and LIFT px off the
// surfaces at both ends (HIGH_LIFT times higher where that is not clear,
// checked at PATH_CHECKS); it is eased with minimum jerk (MIN_JERK_A, _B,
// _C: 10t³ − 15t⁴ + 6t⁵), its time varying by REACH_JITTER; a free hand's
// speed (CARRY_MAX px/s at most; it is kept up to HAND_SPEED_MAX) carries
// on into it. A free hand follows its place as a spring of FOLLOW_W
// rad/s, hanging HANG_SHARE of a limb under its shoulder (HANG_APART px
// to its side) or, walking, held FREE_R px ahead (FREE_UP of that up);
// its place is drawn back to the shoulder TARGET_STEP px at a time
// (TARGET_TRIES times) out of anything hard. It points the way it moves
// (over LEAD_SPEED px/s) or along its limb's end, eased at AXIS_EASE per
// s. A straight way is checked every LINE_STEP px, its sides every
// LINE_WIDE-th check. A hand that found no hold tries again after RETRY
// s.
//
const CURL_RATE = 5
const CURL_GRIP = 1
const CURL_OPEN = -0.35
const CURL_FREE = 0.25
const RETRACT = 0.35
const LIFT = 24
const HIGH_LIFT = 2.5
const PATH_CHECKS = [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9]
const MIN_JERK_A = 10
const MIN_JERK_B = 15
const MIN_JERK_C = 6
const REACH_JITTER = 0.3
const CARRY_MAX = 300
const HAND_SPEED_MAX = 900
const FOLLOW_W = 18
const HANG_SHARE = 0.55
const HANG_APART = 14
const FREE_R = 84
const FREE_UP = 0.8
const TARGET_STEP = 8
const TARGET_TRIES = 14
const AXIS_EASE = 8
const LEAD_SPEED = 30
const LINE_STEP = 8
const LINE_WIDE = 2
const RETRY = 0.4
//
// Holds are tried at LEAD_SHARES of the mood's lead on along the way,
// then round the edges of the way's next NODES_AHEAD nodes (a ceiling it
// is about to climb onto, a floor it lets itself down to). A
// hold is stepped on from once it lags the stride behind — or is
// stretched past STRETCH of the limb or lies within CRAMPED px of its
// shoulder and lags at all.
//
const LEAD_SHARES = [1, 0.6, 1.4, 0.2]
const NODES_AHEAD = 3
const STRETCH = 0.9
const CRAMPED = 34
//
// Feeling about: a free hand sweeps PROBE_ARC rad either side of the way
// on (turned PROBE_TILT toward the surface), from PROBE_NEAR to PROBE_FAR
// of a limb out and back, its gaps varying by PROBE_VARY; claws within
// PROBE_FEEL px of a hold take it. Prey within GRAB_NEAR px of the claws
// is snatched (the hand shut for SNAP s).
//
const PROBE_ARC = 0.6
const PROBE_TILT = 0.6
const PROBE_NEAR = 0.45
const PROBE_FAR = 0.82
const PROBE_FEEL = 26
const PROBE_VARY = 0.6
const GRAB_NEAR = 12
const SNAP = 0.5
//
// The head's look: it bobs BOB_PX px at BOB_HZ; leans with the way only
// while it moves (FACE_SPEED px/s or more, eased at MOVE_RATE per s), its
// tilt a spring of TILT_W rad/s; hunting it turns round PURSUIT_TURN
// times as long. Its mouth opens to a random share of JAW_OPEN rad every
// MOUTH_GAP..+RANGE s (PURSUIT_MOUTH times as often, wider, when it
// hunts), wide when it finds something or snatches; eased at MOUTH_RATE.
//
const BOB_PX = 2
const BOB_HZ = 0.5
const FACE_SPEED = 6
const MOVE_RATE = 3
const TILT_W = 6
const PURSUIT_TURN = 0.5
const JAW_OPEN = 0.17
const MOUTH_GAP = 0.8
const MOUTH_RANGE = 2.4
const MOUTH_REST = 0.45
const PURSUIT_MOUTH = 0.4
const MOUTH_RATE = 5
const MOUTH_WIDE = 1
const MOUTH_WIDE_HOLD = 0.6
//
// Senses: a wave's rays are checked for something hard every RAY_STEP px
// of their way; an echo's way back at ECHO_CHECKS points. Up to
// MAX_BEINGS living things are followed (how fast each moves, from one
// plan to the next). A hand that touched a living thing does not report
// it again for TOUCH_GAP s. After a touch it sends a pulse within
// TOUCH_PULSE s. A pulse leaves only while the head faces a side squarely
// (FACING of the way round) and it is not eating.
//
const RAY_STEP = 8
const ECHO_CHECKS = 6
const MAX_BEINGS = 48
const TOUCH_GAP = 0.8
const TOUCH_PULSE = 0.15
const FACING = 0.9
//
// It is drawn while within CULL_PAD px of the view; at most MAX_STEPS
// steps run per frame. The drawn curve keeps CURVE_CLEAR px out of
// anything hard (moved CURVE_TRIES px at most), but for its last
// CURVE_HAND points at the hand.
//
const CULL_PAD = REACH_MAX + 80
const MAX_STEPS = 4
const CURVE_CLEAR = 5
const CURVE_TRIES = 28
const CURVE_HAND = 2
const HALF = 0.5
const FULL_TURN = Math.PI * 2
//
// A point's test against everything hard (see wayOut), kept in one
// numeric buffer: the point, its radius, the point to fall back toward
// and the way out. Fractions passed to a function or kept in an object's
// fields make garbage in V8, and this test runs hundreds of times a step.
//
const SPOT_X = 0
const SPOT_Y = 1
const OUT_X = 2
const OUT_Y = 3
const SPOT_R = 4
const BACK_X = 5
const BACK_Y = 6
const SPOT = new Float64Array(7)

/**
 * Creates a climber near its start spot, its hands on what is solid there.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.seed - Seed of its moves
 * @returns {Object} Climber instance
 */
export function create(cfg) {
  const { k } = cfg
  Look.bake(k)
  const nav = Nav.get()
  const rng = createSeededRandom(cfg.seed)
  const start = Nav.nearestNode(nav, START_SPOT.x, START_SPOT.y, -1)
  const inst = {
    k,
    rng,
    nav,
    hand: Look.handMeasures(CURL_GRIP),
    view: null,
    beings: null,
    beingX: new Float32Array(MAX_BEINGS),
    beingY: new Float32Array(MAX_BEINGS),
    beingSpeed: new Float32Array(MAX_BEINGS).fill(-1),
    trackedAt: 0,
    sonar: {
      pulseIn: C.explore.pulseEvery,
      pulses: Array.from({ length: SONAR.maxPulses }, () => ({ live: false, x: 0, y: 0, r: 0, dir: 0, cos: new Float32Array(SONAR.rays), sin: new Float32Array(SONAR.rays), ends: new Float32Array(SONAR.rays), seen: new Uint8Array(MAX_BEINGS) })),
      echoes: Array.from({ length: SONAR.maxEchoes }, () => ({ live: false, x: 0, y: 0, t: 0, dur: 1, being: -1, moving: false, confidence: 0 }))
    },
    mood: MOOD.EXPLORE,
    target: { x: 0, y: 0, at: 0, source: SOURCE.ULTRASOUND, confidence: 0, id: -1, moving: false },
    scanIn: SONAR.scanEvery[1],
    avoid: { x: 0, y: 0, r: 0, cost: AVOID.cost, until: 0 },
    waterAt: -Infinity,
    plannedAt: -Infinity,
    plannedTo: { x: 0, y: 0 },
    wantWay: false,
    time: 0,
    simAcc: 0,
    planAcc: rng() / PERF.planHz,
    path: [start, start],
    way: [],
    seg: 0,
    u: 0,
    speed: 0,
    restFor: REST,
    pauseFor: 0,
    pauseIn: between(rng, C.explore.pauseEvery),
    probeSide: 1,
    lastLand: 0,
    stuckFor: 0,
    anchored: 0,
    reaching: 0,
    carrot: { x: 0, y: 0 },
    body: { x: 0, y: 0 },
    prev: { x: 0, y: 0, tilt: 0, face: -1 },
    vel: { x: 0, y: 0 },
    frame: { nx: 0, ny: 1, walk: false, dx: -1, dy: 0 },
    face: -1,
    faceWant: -1,
    faceSide: -1,
    faceFor: 0,
    tilt: 0,
    tiltVel: 0,
    moveShare: 0,
    mouth: 0,
    mouthWant: 0,
    mouthIn: MOUTH_GAP,
    squeeze: 1,
    arms: Array.from({ length: ANAT.shoulders.length }, (_, i) => createArm(i, rng)),
    cand: [],
    ideal: { x: 0, y: 0 },
    aim: { x: 0, y: 0, ax: 0, ay: 1 },
    pose: { x: 0, y: 0, tilt: 0, face: -1, want: -1, jaw: 0, wide: 1, tall: 1 },
    visible: false,
    strip: { arm: null, q: null, band: null },
    v: k.vec2(0, 0),
    v2: k.vec2(0, 0),
    color: getRGB(k, C.tint)
  }
  start && settle(inst, start)
  return inst
}

/**
 * Runs the climber: its steps (fewer while far off screen), its plans, and
 * its pose for this frame.
 * @param {Object} inst - Climber instance
 * @param {Object} ctx
 * @param {{left: number, top: number, right: number, bottom: number}} ctx.view - Visible world rect
 * @param {Array<{x: number, y: number}>} ctx.prey - Small prey its claws may snatch
 * @param {Function} ctx.onEat - Called with a prey it snatched
 * @param {Array<{x: number, y: number, r: number, live: boolean}>} ctx.beings - The living things about, the hero among them (their bodies' middles and radii; live: about right now): what its ultrasound echoes off and its hands may touch
 */
export function onUpdate(inst, ctx) {
  if (!inst.path[0]) return
  const dt = inst.k.dt()
  inst.view = ctx.view
  inst.beings = ctx.beings
  const step = 1 / (isFar(inst, ctx.view) ? PERF.farHz : PERF.simHz)
  inst.simAcc = Math.min(inst.simAcc + dt, step * MAX_STEPS)
  while (inst.simAcc >= step) {
    inst.simAcc -= step
    simStep(inst, step)
  }
  inst.planAcc += dt
  if (inst.planAcc >= 1 / PERF.planHz) {
    inst.planAcc = 0
    planTick(inst, ctx)
  }
  inst.visible = isInView(inst, ctx.view)
  inst.visible && pose(inst, inst.simAcc / step)
}

/**
 * Draws the climber: the holds (if shown), its ultrasound, its limbs with
 * their buttons, its hands, its head.
 * @param {Object} inst - Climber instance
 */
export function onDraw(inst) {
  C.showHolds && inst.view && Look.drawHolds(inst, inst.view)
  Look.drawWaves(inst)
  if (!inst.visible) return
  for (let i = 0; i < inst.arms.length; i++) Look.drawArm(inst, inst.arms[i])
  for (let i = 0; i < inst.arms.length; i++) Look.drawButtons(inst, inst.arms[i])
  for (let i = 0; i < inst.arms.length; i++) Look.drawHand(inst, inst.arms[i])
  Look.drawHead(inst)
}

//
// A limb: its state and the time in it, when it took its hold; its
// shoulder and wrist, the way its hand points and how fast it goes; its
// chain's points (x, y), at the last step's end (rx, ry: for drawing
// between steps) and as drawn (nx, ny); whether it is caught behind
// something (drag); its hold and the hold it reaches for, its reach's
// curve, its feeling arc, its fingers' curl; the buttons along it (each
// `u` of its length from the shoulder, `side` of its half width off its
// middle); what it is drawn with.
//
function createArm(i, rng) {
  const count = ANAT.buttons[0] + Math.floor(rng() * (ANAT.buttons[1] - ANAT.buttons[0] + 1))
  return {
    i,
    state: STATE.FREE,
    stateT: 0,
    heldAt: 0,
    side: i % 2 ? -1 : 1,
    sx: 0,
    sy: 0,
    wx: 0,
    wy: 0,
    ax: 0,
    ay: 1,
    vx: 0,
    vy: 0,
    x: new Float32Array(SEGS + 1),
    y: new Float32Array(SEGS + 1),
    rx: new Float32Array(SEGS + 1),
    ry: new Float32Array(SEGS + 1),
    nx: new Float32Array(SEGS + 1),
    ny: new Float32Array(SEGS + 1),
    drag: false,
    seg: REACH_MAX / SEGS,
    swell: 1,
    p: { wx: 0, wy: 0, ax: 0, ay: 1 },
    d: { wx: 0, wy: 0, ax: 0, ay: 1 },
    hold: newHold(),
    to: newHold(),
    reach: { fx: 0, fy: 0, fax: 0, fay: 1, vx: 0, vy: 0, c1x: 0, c1y: 0, c2x: 0, c2y: 0, t: 0, dur: 1 },
    probe: { on: false, a0: 0, a1: 0, t: 0, dur: 1 },
    probeAt: 0,
    touchAt: 0,
    retryAt: 0,
    snap: 0,
    curl: CURL_FREE,
    buttons: Array.from({ length: count }, () => ({ u: ANAT.buttonSpan[0] + rng() * (ANAT.buttonSpan[1] - ANAT.buttonSpan[0]), side: rng() * 2 - 1 })),
    spine: Look.newSpine(),
    len: 0,
    fingers: [],
    pts: [],
    uv: [],
    pool: [],
    uvPool: []
  }
}
function newHold() {
  return { gx: 0, gy: 0, x: 0, y: 0, ax: 0, ay: 1, nx: 0, ny: -1 }
}
//
// Puts it at a node: its head there, as many hands as its mood keeps on
// the holds round it, the rest hanging, every limb laid straight.
//
function settle(inst, node) {
  inst.path[0] = node
  inst.path[1] = node
  inst.path.length = 2
  inst.seg = 0
  inst.u = 0
  placeFrame(inst)
  inst.body.x = inst.carrot.x
  inst.body.y = inst.carrot.y
  inst.prev.x = inst.body.x
  inst.prev.y = inst.body.y
  inst.anchored = 0
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    shoulderOf(inst, arm)
    if (inst.anchored < MOOD_CFG[inst.mood].holds && findHold(inst, arm, node.x, node.y)) {
      anchorAt(inst, arm, arm.to)
      inst.anchored++
    } else {
      hangPose(inst, arm, inst.ideal)
      arm.wx = inst.ideal.x
      arm.wy = inst.ideal.y
    }
    for (let j = 0; j <= SEGS; j++) {
      arm.x[j] = arm.sx + (arm.wx - arm.sx) * j / SEGS
      arm.y[j] = arm.sy + (arm.wy - arm.sy) * j / SEGS
    }
    arm.seg = Math.max(REACH_MAX * LIMB.minLength, vecLen(arm.wx - arm.sx, arm.wy - arm.sy)) / SEGS
    keepPrev(arm)
  }
}
//
// One step: where everything was is kept (for drawing between steps);
// then its mood, the way it faces, its place on the way, its head, its
// limbs, its tilt and mouth, its ultrasound.
//
function simStep(inst, dt) {
  inst.time += dt
  inst.prev.x = inst.body.x
  inst.prev.y = inst.body.y
  inst.prev.tilt = inst.tilt
  inst.prev.face = inst.face
  for (let i = 0; i < inst.arms.length; i++) keepPrev(inst.arms[i])
  updateMood(inst, dt)
  updateFacing(inst, dt)
  updateTravel(inst, dt)
  moveBody(inst, dt)
  for (let i = 0; i < inst.arms.length; i++) moveArm(inst, inst.arms[i], dt)
  inst.anchored = countState(inst, STATE.HOLD)
  inst.reaching = countState(inst, STATE.REACH)
  updateTilt(inst, dt)
  updateMouth(inst, dt)
  updateSonar(inst, dt)
}
function keepPrev(arm) {
  arm.rx.set(arm.x)
  arm.ry.set(arm.y)
  arm.p.wx = arm.wx
  arm.p.wy = arm.wy
  arm.p.ax = arm.ax
  arm.p.ay = arm.ay
}
//
// Its mood: a hunt whose prey was not found again for `memory` s ends
// where it is (it feels about there); having felt about it roams again.
//
function updateMood(inst, dt) {
  if (inst.mood === MOOD.PURSUE && inst.time - inst.target.at > SENSE.memory) return arrive(inst)
  if (inst.mood !== MOOD.INVESTIGATE || inst.restFor > 0) return
  inst.mood = MOOD.EXPLORE
  inst.restFor = dt
}
//
// The way it faces: the side its way runs to (once it has run that way
// for faceHold s); resting or paused it looks about, to one side and the
// other (its ultrasound only goes out ahead). It turns round in turnTime
// s (hunting, quicker).
//
function updateFacing(inst, dt) {
  const f = inst.frame
  const quick = inst.mood === MOOD.PURSUE ? PURSUIT_TURN : 1
  inst.faceSide = f.dx > TURN.faceDx ? 1 : f.dx < -TURN.faceDx ? -1 : inst.faceSide
  if (inst.restFor > 0 || inst.pauseFor > 0) lookAbout(inst, dt)
  else leadFace(inst, dt, quick)
  const step = 2 * dt / (TURN.turnTime * quick)
  inst.face += Math.max(-step, Math.min(step, inst.faceWant - inst.face))
}
function leadFace(inst, dt, quick) {
  inst.faceFor = inst.faceSide !== inst.faceWant ? inst.faceFor + dt : 0
  if (inst.faceFor < TURN.faceHold * quick) return
  inst.faceWant = inst.faceSide
  inst.faceFor = 0
}
function lookAbout(inst, dt) {
  inst.faceFor = 0
  inst.scanIn -= dt
  if (inst.scanIn > 0) return
  inst.scanIn = between(inst.rng, SONAR.scanEvery)
  inst.faceWant = -inst.faceWant
}
//
// Its place on the way: resting, it waits (then wants a new way); roaming
// it pauses now and then; else it goes on at the mood's speed times its
// support (see supportShare), eased — so it slows down and starts again
// smoothly, never at a jump. Free to go but not going for STUCK s, it
// gives the way up.
//
function updateTravel(inst, dt) {
  const m = MOOD_CFG[inst.mood]
  if (inst.restFor > 0) {
    inst.restFor -= dt
    inst.restFor <= 0 && (inst.wantWay = true)
  }
  updatePause(inst, dt)
  const turned = inst.faceSide === inst.faceWant && Math.abs(inst.faceWant - inst.face) < TURNED
  const free = inst.restFor <= 0 && inst.pauseFor <= 0 && turned
  const share = free ? supportShare(inst, m) : 0
  inst.stuckFor = free && share < STUCK_SHARE ? inst.stuckFor + dt : 0
  inst.stuckFor > STUCK && giveUp(inst)
  inst.speed += (m.speed * share - inst.speed) * Math.min(1, m.accel * dt)
  inst.speed > MOVE_EPS && advance(inst, inst.speed * dt)
  placeFrame(inst)
}
//
// How freely it may go on (0 … 1): by how far ahead of the head, the way
// it goes, its foremost hold lies (walking, none ahead: it stays where
// its hands are — it never walks out past them, over water or off an
// edge) — or, hanging, by how much reach its two nearest holds have left
// (it lets itself down on its limbs) — and by how near the head has kept
// to its place on the way.
//
function supportShare(inst, m) {
  const f = inst.frame
  const b = inst.body
  let ahead = -Infinity
  let near = Infinity
  let next = Infinity
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state !== STATE.HOLD) continue
    const span = vecLen(arm.hold.x - arm.sx, arm.hold.y - arm.sy)
    ahead = Math.max(ahead, (arm.hold.gx - b.x) * f.dx + (arm.hold.gy - b.y) * f.dy)
    next = Math.min(next, Math.max(near, span))
    near = Math.min(near, span)
  }
  const spare = f.walk ? ahead : Math.max(ahead, REACH_MAX * STRETCH - next)
  const lag = 1 - vecLen(inst.carrot.x - b.x, inst.carrot.y - b.y) / m.lead
  return Math.max(0, Math.min(1, spare / (m.lead * AHEAD_FULL), lag / LAG_FULL))
}
//
// A way it cannot go on along: hunting, it gives the chase up there;
// roaming, it keeps clear of what lies ahead for a while and takes
// another way.
//
function giveUp(inst) {
  inst.stuckFor = 0
  if (inst.mood === MOOD.PURSUE) return arrive(inst)
  const m = MOOD_CFG[inst.mood]
  shun(inst, inst.body.x + inst.frame.dx * m.lead, inst.body.y + inst.frame.dy * m.lead)
  inst.wantWay = true
}
function shun(inst, x, y) {
  inst.avoid.x = x
  inst.avoid.y = y
  inst.avoid.r = AVOID.radius
  inst.avoid.until = inst.time + AVOID.time
}
function updatePause(inst, dt) {
  if (inst.mood !== MOOD.EXPLORE) return
  if (inst.pauseFor > 0) {
    inst.pauseFor -= dt
    return
  }
  inst.pauseIn -= dt
  if (inst.pauseIn > 0) return
  inst.pauseIn = between(inst.rng, C.explore.pauseEvery)
  inst.pauseFor = between(inst.rng, C.explore.pause)
}
function between(rng, range) {
  return range[0] + rng() * (range[1] - range[0])
}
//
// Moves its place `dist` px on along the way; at its end it rests (or,
// hunting, feels about there).
//
function advance(inst, dist) {
  let left = dist
  while (left > 0 && inst.seg < inst.path.length - 1) {
    const len = segLength(inst, inst.seg)
    const room = (1 - inst.u) * len
    if (left < room) {
      inst.u += left / len
      return
    }
    left -= room
    inst.seg++
    inst.u = 0
  }
  if (inst.seg < inst.path.length - 1 || inst.restFor > 0) return
  inst.seg = Math.max(0, inst.path.length - 2)
  inst.u = 1
  arrive(inst)
}
function arrive(inst) {
  const hunted = inst.mood === MOOD.PURSUE
  inst.mood = hunted ? MOOD.INVESTIGATE : MOOD.EXPLORE
  inst.restFor = hunted ? SENSE.investigate : REST + inst.rng() * REST_RANGE
}
function segLength(inst, seg) {
  const a = inst.path[seg]
  const b = inst.path[seg + 1]
  return Math.max(1, vecLen(b.ox - a.ox, b.oy - a.oy))
}
//
// Its place on the way (the carrot) and the frame there: the surface's
// normal, the way it goes, whether it walks on a top.
//
function placeFrame(inst) {
  const seg = Math.min(inst.seg, inst.path.length - 2)
  const a = inst.path[seg]
  const b = inst.path[seg + 1]
  const u = inst.u
  const f = inst.frame
  inst.carrot.x = a.ox + (b.ox - a.ox) * u
  inst.carrot.y = a.oy + (b.oy - a.oy) * u
  const nx = a.nx + (b.nx - a.nx) * u
  const ny = a.ny + (b.ny - a.ny) * u
  const nl = vecLen(nx, ny) || 1
  f.nx = nx / nl
  f.ny = ny / nl
  f.walk = (u < HALF ? a : b).top
  const dl = vecLen(b.ox - a.ox, b.oy - a.oy)
  if (dl > 1) {
    f.dx = (b.ox - a.ox) / dl
    f.dy = (b.oy - a.oy) / dl
  }
}
//
// A new way: hunting, to the node from which the place its prey was found
// can be got at; else to a place to wander to (an opening one time in
// `explore.openings`); keeping clear of what it shuns. It carries on from
// where it is — the stretch it is on stays the new way's first, so its
// place never jumps (turned round where the new way doubles back).
// Hunting, it plans again at most every replanGap s, or when its prey
// moved replanDist px.
//
function planWay(inst) {
  const hunting = inst.mood === MOOD.PURSUE
  const moved = vecLen(inst.target.x - inst.plannedTo.x, inst.target.y - inst.plannedTo.y)
  if (hunting && inst.time - inst.plannedAt < SENSE.replanGap && moved < SENSE.replanDist && inst.seg < inst.path.length - 1) return
  inst.wantWay = false
  const seg = Math.min(inst.seg, inst.path.length - 2)
  const cur = inst.path[seg]
  const next = inst.path[seg + 1]
  const goal = hunting ? Nav.goalNode(inst.nav, inst.target.x, inst.target.y, next.group, HOLD_REACH) : wanderNode(inst, next.group)
  inst.time >= inst.avoid.until && (inst.avoid.r = 0)
  inst.plannedAt = inst.time
  inst.plannedTo.x = inst.target.x
  inst.plannedTo.y = inst.target.y
  if (!goal || goal === next) {
    hunting ? arrive(inst) : (inst.restFor = REST)
    return
  }
  const count = Nav.findWay(inst.nav, next, goal, inst.way, inst.avoid)
  if (count < 2) return
  const back = inst.way[1] === cur
  inst.path.length = 0
  back || inst.path.push(cur)
  for (let i = 0; i < count; i++) inst.path.push(inst.way[i])
  inst.seg = 0
  inst.u = back ? 1 - inst.u : inst.u
}
function wanderNode(inst, group) {
  return inst.rng() < C.explore.openings ? Nav.openingNode(inst.nav, group, inst.rng) : Nav.randomNode(inst.nav, group, inst.rng)
}
//
// The head: it follows its place on the way as a critically damped spring
// (the mood's `follow`, rad/s, solved exactly: it never jerks, whatever
// its place does) — walking from top to top, never lower over the ground
// than body.minWalk of a limb — then squeezes where it is tight and keeps
// out of anything hard.
//
function moveBody(inst, dt) {
  const b = inst.body
  const v = inst.vel
  const w = MOOD_CFG[inst.mood].follow
  const e = Math.exp(-w * dt)
  const dx = b.x - inst.carrot.x
  const dy = b.y - standY(inst)
  const kx = v.x + w * dx
  const ky = v.y + w * dy
  b.x += (dx + kx * dt) * e - dx
  b.y += (dy + ky * dt) * e - dy
  v.x = (v.x - w * kx * dt) * e
  v.y = (v.y - w * ky * dt) * e
  fitHead(inst, dt)
  keepBodyOut(inst)
}
//
// The height the head makes for: its place's on the way — walking from
// top to top (along a floor, over its stones), raised to body.minWalk of
// a limb over whatever lies under the head.
//
function standY(inst) {
  const y = inst.carrot.y
  if (!inst.path[inst.seg]?.top || !inst.path[inst.seg + 1]?.top) return y
  const least = REACH_MAX * C.body.minWalk
  const x = Math.round(inst.body.x) | 0
  for (let d = HEAD.ry; d < least; d += GROUND_STEP) {
    if (isHard(x, Math.round(y + d) | 0)) return y + d - least
  }
  return y
}
//
// The soft head in a tight place: it squeezes as far as it must for no
// two opposite sides of it to touch anything hard at once — and, where
// its way runs through an opening (a narrow node: a shaft, a gap between
// ledges), for none of it to touch anything; else one side touching, it
// is moved off it instead (keepBodyOut). At once, to head.squeeze of its
// size at most; it swells back at SWELL_RATE per s.
//
function fitHead(inst, dt) {
  const tight = inst.path[inst.seg]?.narrow || inst.path[inst.seg + 1]?.narrow
  let fit = 1
  while (fit > HEAD.squeeze && headTouch(inst, fit, !tight, false)) fit -= SQUEEZE_STEP
  fit = Math.max(HEAD.squeeze, fit)
  inst.squeeze = fit < inst.squeeze ? fit : inst.squeeze + (fit - inst.squeeze) * Math.min(1, SWELL_RATE * dt)
}
//
// Whether the head squeezed to `fit` touches anything hard (`pinched`:
// on two opposite sides at once). With `out`, the way off what it touches
// is written into SPOT.
//
function headTouch(inst, fit, pinched, out) {
  const b = inst.body
  const c = Math.cos(inst.tilt)
  const s = Math.sin(inst.tilt)
  const rx = HEAD.rx * fit + HEAD_PAD
  const ry = HEAD.ry * fit + HEAD_PAD
  let gx = 0
  let gy = 0
  let hit = false
  for (let i = 0; i < HEAD_POINTS; i++) {
    const px = HEAD_COS[i] * rx * c - HEAD_SIN[i] * ry * s
    const py = HEAD_COS[i] * rx * s + HEAD_SIN[i] * ry * c
    if (!isHard(Math.round(b.x + px) | 0, Math.round(b.y + py) | 0)) continue
    if (pinched && !isHard(Math.round(b.x - px) | 0, Math.round(b.y - py) | 0)) continue
    hit = true
    gx -= px
    gy -= py
  }
  if (out) {
    const g = vecLen(gx, gy) || 1
    SPOT[OUT_X] = gx / g
    SPOT[OUT_Y] = gy / g
  }
  return hit
}
//
// The head out of anything hard: moved away from the points of its
// ellipse that touch, a px at a time, and it stops moving into them; its
// very middle in, the way the hard thing lies round it or back toward its
// place on the way.
//
function keepBodyOut(inst) {
  const b = inst.body
  const v = inst.vel
  for (let n = 0; n < BODY_PUSH; n++) {
    if (isHard(Math.round(b.x) | 0, Math.round(b.y) | 0)) {
      SPOT[SPOT_R] = HEAD.ry
      SPOT[SPOT_X] = b.x
      SPOT[SPOT_Y] = b.y
      SPOT[BACK_X] = inst.carrot.x
      SPOT[BACK_Y] = inst.carrot.y
      wayOut()
    } else if (!headTouch(inst, inst.squeeze, false, true)) return
    b.x += SPOT[OUT_X] * PUSH
    b.y += SPOT[OUT_Y] * PUSH
    const into = v.x * SPOT[OUT_X] + v.y * SPOT[OUT_Y]
    if (into >= 0) continue
    v.x -= SPOT[OUT_X] * into
    v.y -= SPOT[OUT_Y] * into
  }
}
//
// A limb for one step: its shoulder on the head; its hand where its state
// takes it — held, swung on its reach, or free (caught behind something:
// dragged after its limb); its chain between them; how fast the hand
// went; a free hand turned the way it goes; its fingers.
//
function moveArm(inst, arm, dt) {
  const px = arm.wx
  const py = arm.wy
  arm.stateT += dt
  arm.snap = Math.max(0, arm.snap - dt)
  shoulderOf(inst, arm)
  arm.drag = arm.state === STATE.FREE && !isWayClear(arm.sx, arm.sy, arm.wx, arm.wy, 0)
  if (arm.state === STATE.HOLD) holdOn(inst, arm)
  else if (arm.state === STATE.REACH) swing(inst, arm, dt)
  else arm.drag || freeHand(inst, arm, px, py, dt)
  flex(arm, dt)
  arm.drag && dragHand(arm)
  const v = vecLen(arm.wx - px, arm.wy - py) / dt
  const k = v > HAND_SPEED_MAX ? HAND_SPEED_MAX / v : 1
  arm.vx = (arm.wx - px) / dt * k
  arm.vy = (arm.wy - py) / dt * k
  arm.state === STATE.FREE && pointHand(arm, v, dt)
  const curl = arm.state === STATE.HOLD || arm.snap > 0 ? CURL_GRIP : arm.state === STATE.REACH ? CURL_OPEN : CURL_FREE
  arm.curl += (curl - arm.curl) * Math.min(1, CURL_RATE * dt)
}
//
// Where its shoulder is: under the head, on the side it faces (crossing
// over smoothly as it turns round), tilted with it.
//
function shoulderOf(inst, arm) {
  const at = ANAT.shoulders[arm.i]
  const ox = -at[0] * inst.face
  const c = Math.cos(inst.tilt)
  const s = Math.sin(inst.tilt)
  arm.sx = inst.body.x + ox * c - at[1] * s
  arm.sy = inst.body.y + ox * s + at[1] * c
}
//
// A holding hand: its claws stay on their spot; the hand turns about them
// with the head — it keeps on the line from its shoulder to the hold, the
// limb's own line — while its wrist stays out of anything hard that way.
//
function holdOn(inst, arm) {
  const h = arm.hold
  aimHand(arm, h.gx, h.gy, inst.hand.palm, inst.aim)
  if (isWristClear(inst.aim.x, inst.aim.y)) {
    h.ax = inst.aim.ax
    h.ay = inst.aim.ay
    h.x = inst.aim.x
    h.y = inst.aim.y
  }
  arm.wx = h.x
  arm.wy = h.y
  arm.ax = h.ax
  arm.ay = h.ay
}
//
// A hand on a hold, carrying on its limb's line: pointing from its
// shoulder to the hold, its wrist the palm's length back along that line.
// Written into `h` (ax, ay, x, y).
//
function aimHand(arm, gx, gy, palm, h) {
  const dx = gx - arm.sx
  const dy = gy - arm.sy
  const d = vecLen(dx, dy) || 1
  h.ax = dx / d
  h.ay = dy / d
  h.x = gx - h.ax * palm
  h.y = gy - h.ay * palm
}
//
// A reaching hand on its curve (eased with minimum jerk, the speed it set
// off with dying away over the reach), its way turning to the hold's
// (aimed from where the shoulder is now); there, it takes hold — or, out
// of reach now, it missed.
//
function swing(inst, arm, dt) {
  const r = arm.reach
  const to = arm.to
  r.t = Math.min(1, r.t + dt / r.dur)
  const e = r.t * r.t * r.t * (r.t * (r.t * MIN_JERK_C - MIN_JERK_B) + MIN_JERK_A)
  const carry = r.dur * r.t * (1 - r.t) * (1 - r.t)
  aimHand(arm, to.gx, to.gy, inst.hand.palm, to)
  arm.wx = cubic(r.fx, r.c1x, r.c2x, to.x, e) + r.vx * carry
  arm.wy = cubic(r.fy, r.c1y, r.c2y, to.y, e) + r.vy * carry
  setAxis(arm, r.fax + (to.ax - r.fax) * e, r.fay + (to.ay - r.fay) * e)
  if (r.t < 1) return
  if (vecLen(to.x - arm.sx, to.y - arm.sy) > REACH_MAX * ANCHOR_SLACK) return release(arm)
  anchorAt(inst, arm, to)
  inst.lastLand = inst.time
  trimHolds(inst, arm)
}
//
// More hands holding than the mood keeps (a feeling hand took a hold):
// the one farthest behind the way it goes lets go — never `keep`, the one
// that just landed.
//
function trimHolds(inst, keep) {
  if (countState(inst, STATE.HOLD) <= MOOD_CFG[inst.mood].holds) return
  const f = inst.frame
  let pick = null
  let worst = -Infinity
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    const lag = -((arm.hold.gx - inst.body.x) * f.dx + (arm.hold.gy - inst.body.y) * f.dy)
    if (arm === keep || arm.state !== STATE.HOLD || lag <= worst) continue
    worst = lag
    pick = arm
  }
  pick && release(pick)
}
function cubic(a, b, c, d, t) {
  const m = 1 - t
  return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d
}
function setAxis(arm, x, y) {
  const l = vecLen(x, y)
  if (l < HALF) return
  arm.ax = x / l
  arm.ay = y / l
}
//
// A free hand: where it hangs (or, feeling about, along its arc), drawn
// back out of anything hard; it goes there from where it was (px, py) as a
// critically damped spring (it never changes speed at a jump), never past
// its limb's length nor into anything hard.
//
function freeHand(inst, arm, px, py, dt) {
  const spot = inst.ideal
  arm.probe.on ? probeSpot(arm, dt, spot) : hangPose(inst, arm, spot)
  freeSpot(arm, spot)
  const pull = FOLLOW_W * FOLLOW_W
  arm.vx += (pull * (spot.x - px) - 2 * FOLLOW_W * arm.vx) * dt
  arm.vy += (pull * (spot.y - py) - 2 * FOLLOW_W * arm.vy) * dt
  arm.wx = px + arm.vx * dt
  arm.wy = py + arm.vy * dt
  const d = vecLen(arm.wx - arm.sx, arm.wy - arm.sy)
  if (d > REACH_MAX) {
    arm.wx = arm.sx + (arm.wx - arm.sx) / d * REACH_MAX
    arm.wy = arm.sy + (arm.wy - arm.sy) / d * REACH_MAX
  }
  keepWristOut(arm)
}
//
// Where a free hand hangs: loose under its shoulder, or — the walker's —
// held up ahead.
//
function hangPose(inst, arm, out) {
  const f = inst.frame
  out.x = f.walk ? arm.sx + f.dx * FREE_R : arm.sx + arm.side * HANG_APART
  out.y = f.walk ? arm.sy - FREE_UP * FREE_R : arm.sy + REACH_MAX * HANG_SHARE
}
//
// A feeling hand's place along its arc: out from near to far and back,
// swept from one side to the other; at its end the feeling is over.
//
function probeSpot(arm, dt, out) {
  const p = arm.probe
  p.t = Math.min(1, p.t + dt / p.dur)
  const angle = p.a0 + (p.a1 - p.a0) * p.t * p.t * (3 - 2 * p.t)
  const share = PROBE_NEAR + (PROBE_FAR - PROBE_NEAR) * Math.sin(Math.PI * p.t)
  out.x = arm.sx + Math.cos(angle) * REACH_MAX * share
  out.y = arm.sy + Math.sin(angle) * REACH_MAX * share
  p.on = p.t < 1
}
//
// A spot for a free hand out of anything hard (nor within the limb's
// radius of it): drawn back toward the shoulder until it is clear.
//
function freeSpot(arm, spot) {
  const dx = arm.sx - spot.x
  const dy = arm.sy - spot.y
  const d = vecLen(dx, dy) || 1
  for (let n = 0; n < TARGET_TRIES && n * TARGET_STEP < d; n++) {
    if (isOpen(Math.round(spot.x) | 0, Math.round(spot.y) | 0, LIMB.radius)) return
    spot.x += dx / d * TARGET_STEP
    spot.y += dy / d * TARGET_STEP
  }
}
//
// A free hand's wrist out of anything hard, its limb's thickness counted:
// moved out the way the hard thing lies, a px at a time.
//
function keepWristOut(arm) {
  SPOT[SPOT_R] = LIMB.radius
  SPOT[BACK_X] = arm.sx
  SPOT[BACK_Y] = arm.sy
  for (let n = 0; n < PUSH_STEPS; n++) {
    SPOT[SPOT_X] = arm.wx
    SPOT[SPOT_Y] = arm.wy
    if (!wayOut()) return
    arm.wx += SPOT[OUT_X] * PUSH
    arm.wy += SPOT[OUT_Y] * PUSH
  }
}
//
// A hand caught behind something goes where its limb's end has come (out
// of anything hard): the limb drags it round the thing.
//
function dragHand(arm) {
  arm.wx = arm.x[SEGS]
  arm.wy = arm.y[SEGS]
  keepWristOut(arm)
  arm.x[SEGS] = arm.wx
  arm.y[SEGS] = arm.wy
}
//
// A free hand points the way it moves — it leads its limb as a head leads
// a snake's body — and, hardly moving (under LEAD_SPEED px/s) or dragged,
// the way its limb's end lies; eased.
//
function pointHand(arm, speed, dt) {
  const moving = !arm.drag && speed > LEAD_SPEED
  const dx = moving ? arm.vx : arm.x[SEGS] - arm.x[SEGS - 1]
  const dy = moving ? arm.vy : arm.y[SEGS] - arm.y[SEGS - 1]
  const d = vecLen(dx, dy) || 1
  const e = Math.min(1, AXIS_EASE * dt)
  setAxis(arm, arm.ax + (dx / d - arm.ax) * e, arm.ay + (dy / d - arm.ay) * e)
}
//
// The limb's chain, one step. Its length eases to what it needs: the way
// from shoulder to wrist (a holding limb, taut), a little more (a free
// one: it curves), a little less than it lies at (one caught: it is
// drawn in) — never shorter than that way itself, but for one caught.
// Holding, its points settle onto the straight line from the hold to the
// head; free, each follows the next one toward the hand, drooping a
// little; caught, each is drawn after the one before from the shoulder
// on. Then every point is kept out of anything hard.
//
function flex(arm, dt) {
  const { x, y } = arm
  const span = vecLen(arm.wx - arm.sx, arm.wy - arm.sy)
  const held = arm.state === STATE.HOLD
  const want = arm.drag ? lengthOf(arm) * DRAG_TIGHT : span * (held ? 1 : LIMB.slack)
  const full = Math.max(REACH_MAX * LIMB.minLength, Math.min(REACH_MAX, want))
  arm.seg += (full / SEGS - arm.seg) * Math.min(1, LIMB.lengthRate * dt)
  arm.drag || (arm.seg = Math.max(arm.seg, Math.min(REACH_MAX, span) / SEGS))
  x[0] = arm.sx
  y[0] = arm.sy
  if (!arm.drag) {
    x[SEGS] = arm.wx
    y[SEGS] = arm.wy
  }
  if (held) straighten(arm, Math.min(1, LIMB.tautRate * dt))
  else if (arm.drag) followEnd(arm, 0, 1)
  else followHand(arm, LIMB.droop * dt)
  keepOutOfHard(arm)
}
function lengthOf(arm) {
  let sum = 0
  for (let i = 0; i < SEGS; i++) sum += vecLen(arm.x[i + 1] - arm.x[i], arm.y[i + 1] - arm.y[i])
  return sum
}
function straighten(arm, e) {
  const { x, y } = arm
  for (let i = 1; i < SEGS; i++) {
    x[i] += (arm.sx + (arm.wx - arm.sx) * i / SEGS - x[i]) * e
    y[i] += (arm.sy + (arm.wy - arm.sy) * i / SEGS - y[i]) * e
  }
}
//
// A free limb, led by its hand: its points droop a little, are smoothed,
// then follow one another toward the hand (the hand leads like a head and
// the limb comes after it along the way it went); none of its pieces ends
// up stretched (from the shoulder on, the far end of a long one is drawn
// in: a long piece would lie right through a ledge).
//
function followHand(arm, droop) {
  const { x, y } = arm
  const most = arm.seg * STRETCH_MAX
  for (let pass = 0; pass < LIMB_PASSES; pass++) {
    for (let i = 1; i < SEGS; i++) {
      x[i] += ((x[i - 1] + x[i + 1]) * HALF - x[i]) * SMOOTH
      y[i] += ((y[i - 1] + y[i + 1]) * HALF - y[i]) * SMOOTH + (pass ? 0 : droop)
    }
    followEnd(arm, SEGS, -1)
    for (let i = 0; i + 1 < SEGS; i++) {
      const dx = x[i + 1] - x[i]
      const dy = y[i + 1] - y[i]
      const d = vecLen(dx, dy)
      if (d <= most) continue
      x[i + 1] = x[i] + dx / d * most
      y[i + 1] = y[i] + dy / d * most
    }
  }
}
//
// The chain's pieces their length again, from one end (`from`: 0 the
// shoulder, SEGS the hand) to the other (`step`: 1 or -1): each point is
// drawn after the one before it; the far end too when the limb is caught
// (its hand is dragged), else it stays.
//
function followEnd(arm, from, step) {
  const { x, y } = arm
  const last = from + step * (arm.drag ? SEGS : SEGS - 1)
  for (let i = from; i !== last; i += step) {
    const j = i + step
    const dx = x[j] - x[i]
    const dy = y[j] - y[i]
    const d = vecLen(dx, dy) || 1
    const off = (d - arm.seg) / d
    x[j] -= dx * off
    y[j] -= dy * off
  }
}
//
// No point of the limb in anything hard (nor within the limb's radius of
// it — its thickness counts): one whose move this step would cross
// something stops before it and slides along it (stopAtHard); one in is
// moved out the way the hard thing lies, a px at a time.
//
function keepOutOfHard(arm) {
  const { x, y } = arm
  SPOT[SPOT_R] = LIMB.radius
  SPOT[BACK_X] = arm.sx
  SPOT[BACK_Y] = arm.sy
  for (let i = 1; i < SEGS; i++) {
    stopAtHard(arm, i)
    for (let n = 0; n < PUSH_STEPS; n++) {
      SPOT[SPOT_X] = x[i]
      SPOT[SPOT_Y] = y[i]
      if (!wayOut()) break
      x[i] += SPOT[OUT_X] * PUSH
      y[i] += SPOT[OUT_Y] * PUSH
    }
  }
}
//
// A limb point's move within a step, from a clear place, across something
// hard (checked every CROSS_STEP px of a move longer than that: a short
// one cannot skip anything): it stops at the last clear place on its way
// and goes on only along the thing (what of its move runs along it,
// SLIDE_MAX px at most) — it never jumps through a ledge, and it slides
// round a corner as a rope pulled round it does. Takes the limb and the
// point's index, not its coordinates: fractional arguments would be
// boxed on every call.
//
function stopAtHard(arm, i) {
  const ax = arm.rx[i]
  const ay = arm.ry[i]
  const dx = arm.x[i] - ax
  const dy = arm.y[i] - ay
  const d = Math.sqrt(dx * dx + dy * dy)
  if (d <= CROSS_STEP || isHard(Math.round(ax) | 0, Math.round(ay) | 0)) return
  const steps = Math.ceil(d / CROSS_STEP)
  for (let n = 1; n < steps; n++) {
    SPOT[SPOT_X] = ax + dx * n / steps
    SPOT[SPOT_Y] = ay + dy * n / steps
    if (!isHard(Math.round(SPOT[SPOT_X]) | 0, Math.round(SPOT[SPOT_Y]) | 0)) continue
    wayOut()
    const rest = 1 - (n - 1) / steps
    const into = (dx * SPOT[OUT_X] + dy * SPOT[OUT_Y]) * rest
    const tx = dx * rest - SPOT[OUT_X] * into
    const ty = dy * rest - SPOT[OUT_Y] * into
    const t = Math.sqrt(tx * tx + ty * ty)
    const k = t > SLIDE_MAX ? SLIDE_MAX / t : 1
    arm.x[i] = ax + dx * (n - 1) / steps + tx * k
    arm.y[i] = ay + dy * (n - 1) / steps + ty * k
    return
  }
}
//
// Whether the point in SPOT is in anything hard or within SPOT's radius
// of it, and the way out (written into SPOT): away from where the hard
// thing lies round the point — looked for farther off, up to DEEP_FAR px,
// where it lies the same on both sides near by; with no side to it even
// there, back toward SPOT's fall-back point.
//
function wayOut() {
  const px = Math.round(SPOT[SPOT_X]) | 0
  const py = Math.round(SPOT[SPOT_Y]) | 0
  const r = SPOT[SPOT_R] | 0
  let l = isHard(px - r, py) ? 1 : 0
  let rt = isHard(px + r, py) ? 1 : 0
  let u = isHard(px, py - r) ? 1 : 0
  let d = isHard(px, py + r) ? 1 : 0
  if (!(l || rt || u || d || isHard(px, py))) return false
  for (let far = r * 2; l === rt && u === d && far <= DEEP_FAR; far *= 2) {
    l = isHard(px - far, py) ? 1 : 0
    rt = isHard(px + far, py) ? 1 : 0
    u = isHard(px, py - far) ? 1 : 0
    d = isHard(px, py + far) ? 1 : 0
  }
  let gx = l - rt
  let gy = u - d
  if (!gx && !gy) {
    gx = SPOT[BACK_X] - px
    gy = SPOT[BACK_Y] - py
  }
  const g = vecLen(gx, gy) || 1
  SPOT[OUT_X] = gx / g
  SPOT[OUT_Y] = gy / g
  return true
}
//
// The head's tilt: it leans with the way it goes only while it moves; a
// critically damped spring.
//
function updateTilt(inst, dt) {
  const moving = inst.speed > FACE_SPEED ? 1 : 0
  inst.moveShare += (moving - inst.moveShare) * Math.min(1, MOVE_RATE * dt)
  const want = inst.frame.dy * TURN.tilt * inst.face * inst.moveShare
  inst.tiltVel += ((want - inst.tilt) * TILT_W * TILT_W - inst.tiltVel * 2 * TILT_W) * dt
  inst.tilt += inst.tiltVel * dt
}
//
// The mouth: a little open, a little shut again, now and then (more often
// and wider while it hunts).
//
function updateMouth(inst, dt) {
  inst.mouthIn -= dt
  if (inst.mouthIn <= 0) {
    const hunting = inst.mood === MOOD.PURSUE
    const gap = MOUTH_GAP + inst.rng() * MOUTH_RANGE
    inst.mouthIn = hunting ? gap * PURSUIT_MOUTH : gap
    inst.mouthWant = inst.mouthWant > 0 ? 0 : inst.rng() * (hunting ? 1 : MOUTH_REST * 2)
  }
  inst.mouth += (inst.mouthWant - inst.mouth) * Math.min(1, MOUTH_RATE * dt)
}
function openWide(inst) {
  inst.mouthWant = MOUTH_WIDE
  inst.mouthIn = MOUTH_WIDE_HOLD
}
//
// The plan, planHz times a second: how fast the living things about move;
// a new way when one is due; no hold kept that is cut off or out of
// reach; a step when one is due; the free limbs feeling about; what a
// free hand's claws touch.
//
function planTick(inst, ctx) {
  trackBeings(inst)
  inst.wantWay && planWay(inst)
  const m = MOOD_CFG[inst.mood]
  dropLostHolds(inst)
  inst.reaching < m.reaches && inst.time - inst.lastLand >= m.stepGap && stepOn(inst, m)
  maybeProbe(inst)
  for (let i = 0; i < inst.arms.length; i++) feel(inst, inst.arms[i], ctx)
}
//
// A hold its limb has no straight way to any more (something hard between
// the shoulder and the hand: the head has gone round a corner) or that is
// out of the limb's reach is let go — but its last one.
//
function dropLostHolds(inst) {
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state !== STATE.HOLD || inst.anchored < 2) continue
    const far = vecLen(arm.hold.x - arm.sx, arm.hold.y - arm.sy) > REACH_MAX * ANCHOR_SLACK
    if (!far && isWayClear(arm.sx, arm.sy, arm.wx, arm.wy, 0)) continue
    release(arm)
    inst.anchored--
  }
}
//
// A step: with fewer hands holding than the mood keeps, a free hand
// reaches for a hold; else the holding hand farthest behind the way it
// goes (see laggingArm) reaches on from its hold — to a hold on along
// the way, or round one of the way's next nodes. A hand that finds no
// hold tries again after RETRY s.
//
function stepOn(inst, m) {
  const arm = inst.anchored < m.holds ? freeArm(inst) : laggingArm(inst, m)
  if (!arm) return
  const lead = inst.restFor > 0 ? 0 : m.lead
  for (let i = 0; i < LEAD_SHARES.length; i++) {
    edgeAhead(inst, lead * LEAD_SHARES[i], inst.ideal)
    if (findHold(inst, arm, inst.ideal.x, inst.ideal.y) && startReach(inst, arm, m)) return
  }
  for (let n = 1; n <= NODES_AHEAD && lead > 0; n++) {
    const node = inst.path[Math.min(inst.seg + n, inst.path.length - 1)]
    if (findHold(inst, arm, node.x, node.y) && startReach(inst, arm, m)) return
  }
  arm.retryAt = inst.time + RETRY
}
function freeArm(inst) {
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state === STATE.FREE && !arm.drag && inst.time >= arm.retryAt) return arm
  }
  return null
}
//
// The holding hand to step on with: the one farthest behind the way it
// goes, if it lags a stride (or lags at all, stretched or crumpled), has
// held minHold s and enough others hold.
//
function laggingArm(inst, m) {
  if (inst.anchored - 1 < GRIP.minSupport) return null
  const f = inst.frame
  let pick = null
  let worst = 0
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state !== STATE.HOLD || inst.time - arm.heldAt < GRIP.minHold || inst.time < arm.retryAt) continue
    const span = vecLen(arm.hold.x - arm.sx, arm.hold.y - arm.sy)
    const lag = -((arm.hold.gx - inst.body.x) * f.dx + (arm.hold.gy - inst.body.y) * f.dy)
    const need = span > REACH_MAX * STRETCH || span < CRAMPED ? m.stride + lag : lag
    if (need < m.stride || need <= worst) continue
    worst = need
    pick = arm
  }
  return pick
}
//
// The best hold for a hand round a point of the surface's edge (written
// into arm.to): the nearest of the holds there that it can take.
//
function findHold(inst, arm, ex, ey) {
  const n = Nav.gripsNear(inst.nav, ex, ey, GRIP.search, inst.cand, PERF.maxCandidates)
  let best = null
  let bestD = Infinity
  for (let i = 0; i < n; i++) {
    const g = inst.cand[i]
    const d = vecLen(g.x - ex, g.y - ey)
    if (d >= bestD || !canHold(inst, arm, g)) continue
    best = g
    bestD = d
  }
  best && clawHold(inst, arm, best, arm.to)
  return Boolean(best)
}
//
// The surface's edge `lead` px on along the way from its place: the
// path's nodes' edge points, eased between them.
//
function edgeAhead(inst, lead, out) {
  let seg = Math.min(inst.seg, inst.path.length - 2)
  let u = inst.u
  let left = lead
  while (left > 0) {
    const len = segLength(inst, seg)
    const room = (1 - u) * len
    if (left < room || seg === inst.path.length - 2) {
      u = Math.min(1, u + left / len)
      break
    }
    left -= room
    seg++
    u = 0
  }
  const a = inst.path[seg]
  const b = inst.path[seg + 1]
  out.x = a.x + (b.x - a.x) * u
  out.y = a.y + (b.y - a.y) * u
}
//
// Whether a hand can take a hold: within reach and not too near, not
// another hand's (within grip.gap px), something solid under the claws,
// its wrist clear of anything hard and a straight clear way to it from
// the shoulder.
//
function canHold(inst, arm, g) {
  const d = vecLen(g.x - arm.sx, g.y - arm.sy)
  if (d > HOLD_REACH || d < ARM_MIN || isTaken(inst, arm, g.x, g.y)) return false
  if (!Solid.isSolid(Math.round(g.x - g.nx * inst.hand.depth) | 0, Math.round(g.y - g.ny * inst.hand.depth) | 0)) return false
  aimHand(arm, g.x, g.y, inst.hand.palm, inst.aim)
  return isWristClear(inst.aim.x, inst.aim.y) && isWayClear(arm.sx, arm.sy, inst.aim.x, inst.aim.y, LIMB.radius)
}
function isTaken(inst, arm, x, y) {
  for (let i = 0; i < inst.arms.length; i++) {
    const other = inst.arms[i]
    const h = other === arm ? null : other.state === STATE.HOLD ? other.hold : other.state === STATE.REACH ? other.to : null
    if (h && vecLen(h.gx - x, h.gy - y) < GRIP.gap) return true
  }
  return false
}
function clawHold(inst, arm, g, h) {
  h.gx = g.x
  h.gy = g.y
  h.nx = g.nx
  h.ny = g.ny
  aimHand(arm, g.x, g.y, inst.hand.palm, h)
}
function anchorAt(inst, arm, h) {
  const k = arm.hold
  k.gx = h.gx
  k.gy = h.gy
  k.x = h.x
  k.y = h.y
  k.ax = h.ax
  k.ay = h.ay
  k.nx = h.nx
  k.ny = h.ny
  arm.heldAt = inst.time
  arm.wx = h.x
  arm.wy = h.y
  arm.ax = h.ax
  arm.ay = h.ay
  setState(arm, STATE.HOLD)
}
function release(arm) {
  arm.probe.on = false
  setState(arm, STATE.FREE)
}
function setState(arm, state) {
  arm.state = state
  arm.stateT = 0
}
function countState(inst, state) {
  let n = 0
  for (let i = 0; i < inst.arms.length; i++) inst.arms[i].state === state && n++
  return n
}
//
// A reach to arm.to: the hand lets go (if it held), draws back toward its
// shoulder and off its surface, swings out and comes in over the hold —
// arcing higher where the plain path would cross something hard; with no
// clear path it does not start. A free hand's speed carries on into it.
//
function startReach(inst, arm, m) {
  const r = arm.reach
  const to = arm.to
  if (!layPath(arm, LIFT) && !layPath(arm, LIFT * HIGH_LIFT)) return false
  const carried = arm.state === STATE.HOLD ? 0 : Math.min(1, CARRY_MAX / (vecLen(arm.vx, arm.vy) || 1))
  r.fx = arm.wx
  r.fy = arm.wy
  r.fax = arm.ax
  r.fay = arm.ay
  r.vx = arm.vx * carried
  r.vy = arm.vy * carried
  r.t = 0
  r.dur = Math.max(m.reachTime[0], Math.min(m.reachTime[1], vecLen(to.x - r.fx, to.y - r.fy) / m.reachSpeed)) * (1 + inst.rng() * REACH_JITTER)
  arm.probe.on = false
  setState(arm, STATE.REACH)
  inst.anchored = countState(inst, STATE.HOLD)
  inst.reaching = countState(inst, STATE.REACH)
  return true
}
//
// The reach's curve from where the hand is, with a lift off the surfaces
// at both ends; whether it is clear of anything hard.
//
function layPath(arm, lift) {
  const r = arm.reach
  const to = arm.to
  const held = arm.state === STATE.HOLD
  const fnx = held ? arm.hold.nx : -arm.ax
  const fny = held ? arm.hold.ny : -arm.ay
  r.c1x = arm.wx + (arm.sx - arm.wx) * RETRACT + fnx * lift
  r.c1y = arm.wy + (arm.sy - arm.wy) * RETRACT + fny * lift
  r.c2x = to.x + to.nx * lift
  r.c2y = to.y + to.ny * lift
  for (let i = 0; i < PATH_CHECKS.length; i++) {
    const t = PATH_CHECKS[i]
    if (isHard(Math.round(cubic(arm.wx, r.c1x, r.c2x, to.x, t)) | 0, Math.round(cubic(arm.wy, r.c1y, r.c2y, to.y, t)) | 0)) return false
  }
  return true
}
//
// Roaming, a hand hanging free feels about now and then (while it moves,
// one hand is kept back for the next step): it sweeps an arc ahead, to
// one side then the other.
//
function maybeProbe(inst) {
  if (inst.mood === MOOD.PURSUE) return
  let spare = inst.speed > MOVE_EPS ? 1 : 0
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state !== STATE.FREE || arm.probe.on || arm.drag) continue
    if (spare-- > 0 || inst.time < arm.probeAt) continue
    arm.probeAt = inst.time + C.explore.probeGap * (1 + inst.rng() * PROBE_VARY)
    inst.rng() < C.explore.probeChance && startProbe(inst, arm)
  }
}
function startProbe(inst, arm) {
  const f = inst.frame
  const center = Math.atan2(f.dy - f.ny * PROBE_TILT, f.dx - f.nx * PROBE_TILT)
  const p = arm.probe
  inst.probeSide = -inst.probeSide
  p.a0 = center - PROBE_ARC * inst.probeSide
  p.a1 = center + PROBE_ARC * inst.probeSide
  p.t = 0
  p.dur = between(inst.rng, C.explore.probeTime)
  p.on = true
}
//
// A free or reaching hand's claws (their tips): water they touch makes
// the hand draw back at once (and it keeps clear of there); a living
// thing they touch is found; a hold they touch while feeling about is
// taken; small prey they close on is snatched and eaten.
//
function feel(inst, arm, ctx) {
  if (arm.state === STATE.HOLD) return
  const tip = inst.hand.palm + inst.hand.finger
  const tx = arm.wx + arm.ax * tip
  const ty = arm.wy + arm.ay * tip
  if (Nav.inWater(Math.round(tx) | 0, Math.round(ty) | 0)) return touchWater(inst, arm)
  touchBeing(inst, arm, tx, ty)
  if (arm.state === STATE.REACH) return
  arm.probe.on && touchHold(inst, arm, tx, ty) && startReach(inst, arm, MOOD_CFG[inst.mood])
  for (let i = 0; i < ctx.prey.length; i++) {
    const prey = ctx.prey[i]
    if (arm.snap > 0 || vecLen(prey.x - tx, prey.y - ty) > GRAB_NEAR) continue
    arm.snap = SNAP
    openWide(inst)
    ctx.onEat(prey)
  }
}
//
// Water under a hand's claws: the hand draws back at once (a reach is
// given up), and — at most every waterGap s — it stops going that way:
// the spot is kept clear of by its ways for a while; roaming it takes
// another way, hunting it gives the chase up there.
//
function touchWater(inst, arm) {
  release(arm)
  if (inst.time - inst.waterAt < SENSE.waterGap) return
  inst.waterAt = inst.time
  shun(inst, arm.wx, arm.wy)
  if (inst.restFor > 0) return
  inst.mood === MOOD.PURSUE ? arrive(inst) : (inst.wantWay = true)
}
//
// A living thing's body under a hand's claws (within touch.reach px of
// it — real contact, no wider sense): it is found right there, moving or
// still; the hand does not report it again for TOUCH_GAP s, and a pulse
// goes out at once.
//
function touchBeing(inst, arm, x, y) {
  const beings = inst.beings
  if (!beings || inst.time < arm.touchAt) return
  const count = Math.min(beings.length, MAX_BEINGS)
  for (let j = 0; j < count; j++) {
    const b = beings[j]
    const near = b.r + SENSE.touch.reach
    if (!b.live || Math.abs(b.x - x) > near || Math.abs(b.y - y) > near || vecLen(b.x - x, b.y - y) > near) continue
    arm.touchAt = inst.time + TOUCH_GAP
    inst.sonar.pulseIn = Math.min(inst.sonar.pulseIn, TOUCH_PULSE)
    detect(inst, SOURCE.TOUCH, x, y, 1, j, inst.beingSpeed[j] >= SONAR.moveMin)
    return
  }
}
//
// A hold right at a feeling hand's claws (within PROBE_FEEL px) that it
// can take: written into arm.to.
//
function touchHold(inst, arm, x, y) {
  const n = Nav.gripsNear(inst.nav, x, y, PROBE_FEEL, inst.cand, PERF.maxCandidates)
  for (let i = 0; i < n; i++) {
    if (!canHold(inst, arm, inst.cand[i])) continue
    clawHold(inst, arm, inst.cand[i], arm.to)
    return true
  }
  return false
}
//
// Whether a hand's wrist has room at a point: nothing hard there nor
// within the limb's radius round it.
//
function isWristClear(x, y) {
  return isOpen(Math.round(x) | 0, Math.round(y) | 0, LIMB.radius)
}
function isOpen(x, y, r) {
  return !(isHard(x, y) || isHard(x - r, y) || isHard(x + r, y) || isHard(x, y - r) || isHard(x, y + r))
}
//
// What its flesh — head, limbs, hands — never goes into: anything solid
// to it (soil and what stands on it, cave-haggy-solid.js) or water.
//
function isHard(x, y) {
  return Solid.isSolid(x, y) || Nav.inWater(x, y)
}
//
// Whether a limb can lie straight between two points: nothing hard on the
// line (checked every LINE_STEP px, so nothing as small as a floating
// ledge is missed) nor, every LINE_WIDE-th check, within `r` px either
// side of it (the limb's radius; 0: only the line itself).
//
function isWayClear(ax, ay, bx, by, r) {
  const d = vecLen(bx - ax, by - ay) || 1
  const steps = Math.ceil(d / LINE_STEP)
  const sx = -(by - ay) / d * r
  const sy = (bx - ax) / d * r
  for (let i = 1; i < steps; i++) {
    const x = ax + (bx - ax) * i / steps
    const y = ay + (by - ay) * i / steps
    if (isHard(Math.round(x) | 0, Math.round(y) | 0)) return false
    if (r > 0 && i % LINE_WIDE === 0 && (isHard(Math.round(x + sx) | 0, Math.round(y + sy) | 0) || isHard(Math.round(x - sx) | 0, Math.round(y - sy) | 0))) return false
  }
  return true
}
function isFar(inst, view) {
  const b = inst.body
  const pad = PERF.farMargin
  return b.x < view.left - pad || b.x > view.right + pad || b.y < view.top - pad || b.y > view.bottom + pad
}
function isInView(inst, view) {
  const b = inst.body
  return b.x > view.left - CULL_PAD && b.x < view.right + CULL_PAD && b.y > view.top - CULL_PAD && b.y < view.bottom + CULL_PAD
}
//
// Its pose this frame, `alpha` of the way from its last step to the
// current one: the head (bobbing, the side it faces, its jaw, how it is
// squeezed), each limb's chain, wrist and hand, its curve laid.
//
function pose(inst, alpha) {
  const p = inst.pose
  p.x = lerp(inst.prev.x, inst.body.x, alpha)
  p.y = lerp(inst.prev.y, inst.body.y, alpha) + Math.sin(inst.time * BOB_HZ * FULL_TURN) * BOB_PX
  p.tilt = lerp(inst.prev.tilt, inst.tilt, alpha)
  p.face = lerp(inst.prev.face, inst.face, alpha)
  p.want = inst.faceWant
  p.jaw = inst.mouth * JAW_OPEN
  p.wide = inst.squeeze
  p.tall = inst.squeeze
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    for (let j = 0; j <= SEGS; j++) {
      arm.nx[j] = lerp(arm.rx[j], arm.x[j], alpha)
      arm.ny[j] = lerp(arm.ry[j], arm.y[j], alpha)
    }
    const d = arm.d
    d.wx = arm.nx[SEGS]
    d.wy = arm.ny[SEGS]
    d.ax = lerp(arm.p.ax, arm.ax, alpha)
    d.ay = lerp(arm.p.ay, arm.ay, alpha)
    arm.swell = Math.min(LIMB.swell, Math.sqrt(REACH_MAX / (arm.seg * SEGS)))
    Look.layArm(arm)
    clearCurve(arm) && Look.measureArm(arm)
  }
}
//
// The curve as it is drawn, out of anything hard: drawn between two steps
// and smoothed between its chain's points it may graze a corner though
// every point of the chain is clear, so each of its own points in
// something hard — or within CURVE_CLEAR px of it — is moved out the way
// it lies, CURVE_TRIES px at most; its last points, at the hand, are the
// wrist's. True if any moved.
//
function clearCurve(arm) {
  const sp = arm.spine
  let moved = false
  SPOT[SPOT_R] = CURVE_CLEAR
  SPOT[BACK_X] = arm.sx
  SPOT[BACK_Y] = arm.sy
  for (let j = 1; j < sp.length - CURVE_HAND; j++) {
    for (let n = 0; n < CURVE_TRIES; n++) {
      SPOT[SPOT_X] = sp[j].x
      SPOT[SPOT_Y] = sp[j].y
      if (!wayOut()) break
      sp[j].x += SPOT[OUT_X]
      sp[j].y += SPOT[OUT_Y]
      moved = true
    }
  }
  return moved
}
function lerp(a, b, t) {
  return a + (b - a) * t
}
//
// Its ultrasound, one step: a new pulse when one is due (from the tip of
// its upper jaw); every wave in the air spread on; every echo flown on,
// the ones that are back heard.
//
function updateSonar(inst, dt) {
  const sonar = inst.sonar
  sonar.pulseIn -= dt
  if (sonar.pulseIn <= 0) {
    sonar.pulseIn = MOOD_CFG[inst.mood].pulseEvery
    emitPulse(inst)
  }
  for (let i = 0; i < sonar.pulses.length; i++) sonar.pulses[i].live && spread(inst, sonar.pulses[i], dt)
  for (let i = 0; i < sonar.echoes.length; i++) {
    const echo = sonar.echoes[i]
    if (!echo.live) continue
    echo.t += dt
    if (echo.t < echo.dur) continue
    echo.live = false
    hearEcho(inst, echo)
  }
}
//
// The tip of its upper jaw: where a pulse leaves and an echo is heard.
//
function jawTip(inst, out) {
  const c = Math.cos(inst.tilt)
  const s = Math.sin(inst.tilt)
  const fx = Look.JAW_TIP.x * inst.face
  out.x = inst.body.x + fx * c - Look.JAW_TIP.y * s
  out.y = inst.body.y + fx * s + Look.JAW_TIP.y * c
  return out
}
//
// A new pulse (if fewer than maxPulses are in the air) — only while the
// head faces a side squarely and it is not eating: its rays fan out
// across the cone the head faces, nothing behind it; all out, nothing met
// yet. It keeps the way it was sent: turning the head later only aims the
// next ones.
//
function emitPulse(inst) {
  if (Math.abs(inst.face) < FACING || isEating(inst)) return
  const pulses = inst.sonar.pulses
  for (let i = 0; i < pulses.length; i++) {
    const p = pulses[i]
    if (p.live) continue
    jawTip(inst, inst.ideal)
    p.x = inst.ideal.x
    p.y = inst.ideal.y
    p.r = 0
    p.dir = inst.face > 0 ? inst.tilt : inst.tilt + Math.PI
    for (let j = 0; j < SONAR.rays; j++) {
      const a = p.dir + (j / (SONAR.rays - 1) - HALF) * SONAR.coneAngle
      p.cos[j] = Math.cos(a)
      p.sin[j] = Math.sin(a)
    }
    p.ends.fill(0)
    p.seen.fill(0)
    p.live = true
    return
  }
}
function isEating(inst) {
  for (let i = 0; i < inst.arms.length; i++) {
    if (inst.arms[i].snap > 0) return true
  }
  return false
}
//
// A wave spread on for one step: each ray still out goes on to the new
// radius unless soil or water ends it (some of those show their echo);
// the living things the wave has just crossed, in the open, send echoes.
// At its full distance — or with every ray ended — the wave is gone for
// good: it never turns back, and a wave that met nothing leaves no echo.
//
function spread(inst, p, dt) {
  const from = p.r
  p.r = Math.min(SONAR.maxDistance, from + SONAR.speed * dt)
  let out = 0
  for (let i = 0; i < SONAR.rays; i++) {
    if (p.ends[i] > 0) continue
    for (let d = Math.min(p.r, from + RAY_STEP); ; d = Math.min(p.r, d + RAY_STEP)) {
      const x = p.x + p.cos[i] * d
      const y = p.y + p.sin[i] * d
      if (isBlocked(Math.round(x) | 0, Math.round(y) | 0)) {
        p.ends[i] = d
        i % SONAR.echoEvery === 0 && addEcho(inst, x, y, d, -1, false)
        break
      }
      if (d >= p.r) break
    }
    p.ends[i] === 0 && out++
  }
  meetBeings(inst, p, from)
  p.live = out > 0 && p.r < SONAR.maxDistance
}
//
// Soil, water or the world's edge: where a ray ends and an echo cannot
// pass.
//
function isBlocked(x, y) {
  if (x < 0 || y < 0 || x > Layout.WORLD_W || y > Layout.WORLD_H) return true
  return isHard(Math.round(x) | 0, Math.round(y) | 0)
}
//
// The living things a wave has just reached (each once per wave): one
// inside the wave's cone, on a ray still out — not in the shadow of soil
// or water — sends an echo from the near side of its body, marked with
// whether it was moving then (prey: the hero as any other).
//
function meetBeings(inst, p, from) {
  const beings = inst.beings
  if (!beings) return
  const count = Math.min(beings.length, MAX_BEINGS)
  for (let j = 0; j < count; j++) {
    const b = beings[j]
    if (!b.live || p.seen[j]) continue
    const dx = b.x - p.x
    const dy = b.y - p.y
    if (Math.abs(dx) > p.r + b.r || Math.abs(dy) > p.r + b.r) continue
    const d = vecLen(dx, dy) || 1
    if (d - b.r > p.r) continue
    p.seen[j] = 1
    if (d + b.r < from) continue
    const off = Math.atan2(dy, dx) - p.dir
    const turn = off - Math.round(off / FULL_TURN) * FULL_TURN
    if (Math.abs(turn) > SONAR.coneAngle * HALF) continue
    const ray = Math.round((turn / SONAR.coneAngle + HALF) * (SONAR.rays - 1))
    if (p.ends[ray] > 0 && p.ends[ray] < d - b.r) continue
    addEcho(inst, b.x - dx / d * b.r, b.y - dy / d * b.r, d, j, inst.beingSpeed[j] >= SONAR.moveMin)
  }
}
//
// An echo from a point `dist` px out: it flies back at the wave's speed,
// fainter the farther it comes from. With no room left for it, an echo
// off a living thing takes the place of one off soil.
//
function addEcho(inst, x, y, dist, being, moving) {
  const echoes = inst.sonar.echoes
  let slot = null
  for (let i = 0; i < echoes.length && !slot; i++) echoes[i].live || (slot = echoes[i])
  for (let i = 0; i < echoes.length && !slot && being >= 0; i++) echoes[i].being < 0 && (slot = echoes[i])
  if (!slot) return
  slot.live = true
  slot.x = x
  slot.y = y
  slot.t = 0
  slot.dur = dist / SONAR.speed
  slot.being = being
  slot.moving = moving
  slot.confidence = 1 - dist / SONAR.maxDistance
}
//
// An echo is back — if soil or water has not come between it and the jaw
// (it moved meanwhile). One off soil only shows the cave's shape; one off
// a living thing that stood still is an obstacle, no prey; one off a
// thing that moved is prey, at the place the wave met it.
//
function hearEcho(inst, echo) {
  if (echo.being < 0) return
  jawTip(inst, inst.ideal)
  for (let i = 1; i < ECHO_CHECKS; i++) {
    const u = i / ECHO_CHECKS
    if (isBlocked(Math.round(echo.x + (inst.ideal.x - echo.x) * u) | 0, Math.round(echo.y + (inst.ideal.y - echo.y) * u) | 0)) return
  }
  echo.moving && detect(inst, SOURCE.ULTRASOUND, echo.x, echo.y, echo.confidence, echo.being, true)
}
//
// It has found a living thing — by an echo or by touch, never otherwise:
// what it knows of its prey is set anew (where, when, how, how surely),
// its mouth opens, and it rushes toward that place at once — whatever it
// was doing, by whatever way leads there. Only while it holds to fresher
// prey is an echo off another thing passed over.
//
function detect(inst, source, x, y, confidence, id, moving) {
  const t = inst.target
  const hunting = inst.mood === MOOD.PURSUE
  if (source === SOURCE.ULTRASOUND && hunting && id !== t.id && inst.time - t.at < SENSE.lock) return
  t.x = x
  t.y = y
  t.at = inst.time
  t.source = source
  t.confidence = confidence
  t.id = id
  t.moving = moving
  inst.mood !== MOOD.PURSUE && openWide(inst)
  inst.mood = MOOD.PURSUE
  inst.restFor = 0
  inst.pauseFor = 0
  inst.wantWay = true
}
//
// How fast each living thing about moves: from where it was at the last
// plan to where it is now (one that was not about then counts as still).
//
function trackBeings(inst) {
  const beings = inst.beings
  const span = inst.time - inst.trackedAt
  inst.trackedAt = inst.time
  if (!beings || span <= 0) return
  const count = Math.min(beings.length, MAX_BEINGS)
  for (let j = 0; j < count; j++) {
    const b = beings[j]
    const known = b.live && inst.beingSpeed[j] >= 0
    inst.beingSpeed[j] = !b.live ? -1 : known ? vecLen(b.x - inst.beingX[j], b.y - inst.beingY[j]) / span : 0
    inst.beingX[j] = b.x
    inst.beingY[j] = b.y
  }
}
