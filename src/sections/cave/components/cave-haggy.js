import { getRGB, vecLen } from '../../../utils/helper.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
import * as Layout from '../utils/cave-layout.js'
import * as Nav from '../utils/cave-haggy-nav.js'
import * as Surface from '../utils/cave-surface.js'
import * as Look from './cave-haggy-draw.js'
//
// The climber (haggy_waggy.png): a blind predator, a head on five long
// limbs, each ending in a three-clawed hand. A limb has no joints: it is
// one muscular, flexible body, like a snake's or an octopus's arm — a
// short chain of points kept a fixed length apart, straightening its own
// bends, bowed by its muscle out of the surface it holds, kept out of the
// soil, and drawn as one smooth curve. It curves in broad C and S shapes,
// follows its hand with a natural delay, and never folds at one spot.
//
// It climbs by its claws alone: a hand that holds stays fixed on its spot
// while the body moves, its palm's front on the surface and its fingers in
// the soil by their own length; the body has weight — it hangs from the
// hands that hold (or stands on them), sags when one lets go, cannot get
// farther from any of them than that limb reaches, and falls if none
// holds.
//
// Each limb is anchored (holding), reaching (letting go, drawing back a
// little, swinging out to a new hold, turning its claws to the surface and
// taking it), probing (slowly stretching out and feeling an arc for a
// hold), recovering (drawing back after a miss or after letting go) or
// hanging free. A free hand takes the next hold on along the way; once it
// holds, the hand left farthest behind lets go — so support passes from
// hand to hand, in no fixed order. At least minSupport hands always hold,
// each for minHold s at least.
//
// The body turns calmly: its tilt is a damped turn toward the way it goes
// (never faster than angularVel), and it turns round to face the other way
// only when the way has led there for a while — it stops, turns, goes on.
//
// It is blind and hears: a sound (the hero's steps, jumps and landings, a
// splash) loud enough where it is (fading with distance, muffled by soil
// in between) sets it after the place heard — fast, the same limbs and
// holds, only quicker. Silent, it goes on to the last place heard, feels
// about there, then roams slowly again, stopping now and then to feel
// about with a free limb.
//
// Its ways (cave-haggy-nav.js, built once per page, shared) keep to the
// platforms' outline, in one of the ways along a stretch (grip.ways): out
// in the air off the edge (hanging under a ceiling, clinging to a side,
// walking on a top — its limbs never in the soil), behind the platform
// (drawn behind the soil, only its holding hands in front), or on the
// soil's face in front of it; never over the lake.
//
// Cost: the body and limbs step at a fixed rate (perf.simHz, farHz out of
// sight) and are drawn between steps; a limb's chain is settled in a set
// number of passes; holds are planned at perf.planHz (staggered per
// creature), each plan looking at a bounded number of holds in the cells
// near the hand; a way is searched only when a goal is set; sounds are
// handled when they happen. Nothing is allocated per frame.
//
const C = CAVE_CFG.haggy
const ANAT = C.anatomy
const LIMB = C.limb
const TURN = C.turning
const GRIP = C.grip
const HEAR = C.hearing
const PERF = C.perf
//
// Moods, the limbs' states, the ways along a stretch (MODE) and the layer
// each needs (LAYER).
//
const MOOD = { EXPLORE: 'explore', PURSUE: 'pursue', INVESTIGATE: 'investigate' }
const MOOD_CFG = { [MOOD.EXPLORE]: C.explore, [MOOD.PURSUE]: C.pursuit, [MOOD.INVESTIGATE]: C.explore }
const STATE = { ANCHOR: 'anchor', REACH: 'reach', PROBE: 'probe', RECOVER: 'recover', HANG: 'hang' }
const MODE = { OUT: 'out', BEHIND: 'behind', FACE: 'face' }
const LAYER = { BACK: 'back', FRONT: 'front' }
const LAYER_OF = { [MODE.BEHIND]: LAYER.BACK, [MODE.FACE]: LAYER.FRONT }
//
// A limb's chain: SEGS pieces, each the limb's current length over SEGS
// long (a limb contracts: it is limb.slack times as long as the way from
// its shoulder to its wrist, between limb.minLength of its full length
// and all of it — never longer); no two pieces in a row bent more than
// limb.maxBend (their far ends BEND_SHARE pieces apart at least: no kink,
// no zigzag); its muscle bows it most at its middle (BOW_W per point). A hold needs at most reachShare of its
// length and at least ARM_MIN px; a holding limb keeps the body within
// ANCHOR_SLACK of its length. A limb stretched past STRETCH of it wants to
// step.
//
const SEGS = ANAT.segments
const BEND_SHARE = 2 * Math.cos(LIMB.maxBend * 0.5)
const BOW_W = Float32Array.from({ length: SEGS + 1 }, (_, i) => Math.sin(Math.PI * i / SEGS))
const REACH_MAX = ANAT.length
const HOLD_REACH = REACH_MAX * ANAT.reachShare
const ANCHOR_SLACK = 0.98
const ARM_MIN = 30
const STRETCH = 0.9
//
// The chain's settling: a holding limb's bow leans OUTWARD toward its
// hand's side (so the limbs bow apart, not into one another); its bow and
// its wrist's guide ease in at GUIDE_RATE per s; a point in the soil is
// moved out PUSH px at a time, PUSH_STEPS times a pass at most, and stops
// there; a new limb's chain is settled over SETTLE_STEPS steps. Changing
// layer, a limb is clear of the soil if its CLEAR_NODES points are.
//
const OUTWARD = 0.5
const GUIDE_RATE = 6
const PUSH = 1
const PUSH_STEPS = 6
const SETTLE_STEPS = 40
const CLEAR_NODES = [3, 5, 7]
//
// The body: its weight (gravity px/s² while nothing holds, SAG px/s² of
// it felt even then — it hangs a little below its place), how many
// passes the holds' reach is enforced in, the clearance it lands on soil
// with when falling, and how long it may hold nothing before it is put
// back on its way (LOST, s).
//
const GRAVITY = 900
const SAG = 110
const CONSTRAINT_PASSES = 2
const BODY_FOOT = 14
const LOST = 3
//
// Hands: the wrist stands the palm's length out from the point it holds,
// along the surface's normal, the hand pointing into the soil — so the
// palm's front lies on the surface and the fingers sit in the soil by
// their own length (both measured from the art: Look.handMeasures). On
// the soil's face the hands hold FACE_R px out from the body. Fingers ease
// to their curl at CURL_RATE per s: shut (CURL_GRIP) holding on, wide
// open (CURL_OPEN) reaching, loose (CURL_FREE) otherwise.
//
const FACE_R = 165
const CURL_RATE = 9
const CURL_GRIP = 1
const CURL_OPEN = -0.35
const CURL_FREE = 0.25
//
// Where a free hand looks for its next hold, best first: px along the
// edge ahead of the body (on the tangent, the way it goes), climbing,
// behind the edge and walking; on the face, rad off the way it goes. A
// hold off the wanted spot costs its distance plus NORMAL_COST px per
// unit its normal turns from the edge's. Out in the air the straight
// line from the shoulder to the wrist must be clear of soil (at
// LINE_CHECKS of it).
//
const CLIMB_SLOTS = [150, 115, 80, 40, 0]
const BEHIND_SLOTS = [170, 135, 100, 60, 20]
const WALK_SLOTS = [140, 105, 70, 35, 0]
const FACE_SLOTS = [0, -0.7, 0.7, -1.6, 1.6]
const NORMAL_COST = 40
const SAME_HOLD = 6
const RETRY = 0.4
const LINE_CHECKS = [0.25, 0.5, 0.75]
//
// Which holding hand lets go: the one farthest behind (px), each unit of
// stretch (of its limb's length) counting LET_GO_STRETCH px more.
//
const LET_GO_STRETCH = 60
//
// A reach: the hand first draws back RETRACT of the way to its shoulder
// and LIFT px off the surface, then swings out and comes in LIFT px over
// the hold; where that path would cross soil (checked at PATH_CHECKS of
// it) it arcs HIGH_LIFT times higher, and a hold with no clear path is
// left alone. Its time varies by up to REACH_JITTER. In the back layer it
// shows in front of the soil from REACH_FRONT of the way on (it comes
// round the edge). A hold out of reach once the hand is there is a miss:
// it recovers.
//
const RETRACT = 0.35
const LIFT = 24
const HIGH_LIFT = 2.5
const PATH_CHECKS = [0.2, 0.4, 0.6, 0.8]
const REACH_JITTER = 0.3
const REACH_FRONT = 0.8
//
// Probing: the free hand slowly stretches out (from PROBE_NEAR to
// PROBE_FAR of the limb's length over the first PROBE_OUT of the probe),
// feeling one arc of PROBE_ARC rad each side of the way ahead (tilted
// PROBE_TILT toward the surface) for holds within PROBE_FEEL px of its
// claws' tips, and draws in again from PROBE_BACK of the probe on. It
// probes again PROBE_GAP s after a probe at the soonest.
//
const PROBE_ARC = 0.6
const PROBE_TILT = 0.6
const PROBE_NEAR = 0.45
const PROBE_FAR = 0.82
const PROBE_OUT = 0.35
const PROBE_BACK = 0.8
const PROBE_FEEL = 26
const PROBE_GAP = 3
//
// A free hand: hanging HANG_SHARE of its limb's length under its
// shoulder, HANG_APART px to its own side; the walker's free hand held
// FREE_R px out ahead and up (FREE_UP); never in the soil (a spot in it
// is drawn back toward the shoulder TARGET_STEP px at a time, TARGET_TRIES
// times at most). The spot it goes for moves smoothly (eased at
// TARGET_EASE per s: a spot that jumps — the soil came in the way, the
// pose changed — never jerks the hand). Letting go, it draws back to it
// over RECOVER_TIME s (half that hunting), starting and ending gently;
// then it follows at FREE_EASE per s (PROBE_EASE probing), its hand
// turning with its limb's end at AXIS_EASE per s. A firefly its claws touch (GRAB_NEAR px)
// is snatched, the hand shut for SNAP s.
//
const HANG_SHARE = 0.55
const HANG_APART = 14
const FREE_R = 84
const FREE_UP = 0.8
const TARGET_STEP = 8
const TARGET_TRIES = 14
const TARGET_EASE = 5
const FREE_EASE = 3
const RECOVER_TIME = 0.8
const PROBE_EASE = 3.5
const AXIS_EASE = 8
const GRAB_NEAR = 12
const SNAP = 0.5
//
// Its way: a goal reached, it rests REST..+RANGE s (exploring); it starts
// from the node nearest START_SPOT. A stretch of STRETCH_MIN..+RANGE
// nodes is climbed in one way; after a stretch behind or on the face come
// OUT_BETWEEN nodes out in the air (it changes layer there). It moves on
// its way only while MOVE_EPS px/s or more. Held back for STUCK s (its
// hands cannot get it on), it takes a new way from where it is.
//
const REST = 2
const REST_RANGE = 4
const START_SPOT = { x: 620, y: 470 }
const STRETCH_MIN = 6
const STRETCH_RANGE = 9
const OUT_BETWEEN = 3
const MOVE_EPS = 2
const STUCK = 4
//
// The head: it bobs BOB_PX at BOB_HZ; its tilt answers at TILT_FREQ rad/s
// (critically damped), leaning with the way only while it moves (FACE_SPEED
// px/s or more, eased at MOVE_RATE per s). It goes on only once turned
// within TURNED of the way it faces; hunting, it turns round PURSUIT_TURN
// times as long. Its mouth opens a little and shuts again now and then:
// to a random share of JAW_OPEN rad every MOUTH_GAP..+RANGE s
// (PURSUIT_MOUTH times as often, wider, when it hunts), wide when it hears
// something or snatches; it eases at MOUTH_RATE.
//
const BOB_PX = 2
const BOB_HZ = 0.5
const TILT_FREQ = 6
const FACE_SPEED = 6
const MOVE_RATE = 3
const TURNED = 0.3
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
// Hearing: a sound is muffled by the share of OCCLUDE_SAMPLES points on
// the line to it that lie in soil.
//
const OCCLUDE_SAMPLES = 5
//
// Changing layer needs the body CLEAR_R px clear of the soil and no limb
// over it. It is drawn while within CULL_PAD px of the view. At most
// MAX_STEPS steps run per frame. Profiling eases its timings at STAT_EASE
// per sample.
//
const CLEAR_R = 26
const CULL_PAD = REACH_MAX + 80
const MAX_STEPS = 4
const STAT_EASE = 0.05
const HALF = 0.5
const FULL_TURN = Math.PI * 2
const DEBUG_PARAM = 'haggyDebug'
//
// The soil test's point and its answer, the way out (see wayOut), kept in
// one numeric buffer: passing fractions to a function or storing them in
// an object's fields makes garbage in V8, and this test runs hundreds of
// times a step.
//
const SPOT_X = 0
const SPOT_Y = 1
const OUT_X = 2
const OUT_Y = 3
const SPOT = new Float64Array(4)

/**
 * Creates a climber hanging near its start spot, its hands on the soil.
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
  const debug = PERF.debug || new URLSearchParams(window.location.search).has(DEBUG_PARAM)
  const inst = {
    k,
    rng,
    nav,
    debug,
    profile: debug,
    hand: Look.handMeasures(CURL_GRIP),
    stats: { update: 0, limbs: 0, plan: 0, draw: 0, way: 0, queries: 0, candidates: 0, heard: 0 },
    view: null,
    mood: MOOD.EXPLORE,
    heard: { x: 0, y: 0, at: 0 },
    plannedAt: -Infinity,
    plannedTo: { x: 0, y: 0 },
    wantWay: false,
    time: 0,
    simAcc: 0,
    planAcc: rng() / PERF.planHz,
    layer: LAYER.FRONT,
    path: [start, start],
    modes: [MODE.OUT, MODE.OUT],
    seg: 0,
    u: 0,
    speed: 0,
    restFor: REST,
    pauseFor: 0,
    pauseIn: pauseGap(rng),
    probeAt: 0,
    probeSide: 1,
    lastLand: 0,
    lostFor: 0,
    stuckFor: 0,
    anchored: 0,
    reaching: 0,
    carrot: { x: 0, y: 0 },
    body: { x: 0, y: 0 },
    prev: { x: 0, y: 0, tilt: 0, face: -1 },
    vel: { x: 0, y: 0 },
    frame: { nx: 0, ny: 1, h: ANAT.hangH, mode: MODE.OUT, walk: false, dx: -1, dy: 0 },
    face: -1,
    faceWant: -1,
    faceSide: -1,
    faceFor: 0,
    tilt: 0,
    tiltVel: 0,
    tiltWant: 0,
    moveShare: 0,
    mouth: 0,
    mouthWant: 0,
    mouthIn: MOUTH_GAP,
    arms: Array.from({ length: ANAT.shoulders.length }, (_, i) => createArm(i)),
    cand: [],
    candCount: 0,
    ideal: { x: 0, y: 0 },
    pa: { x: 0, y: 0, h: 0 },
    pb: { x: 0, y: 0, h: 0 },
    pose: { x: 0, y: 0, tilt: 0, face: -1, jaw: 0 },
    visible: false,
    strip: { arm: null, q: null, band: null },
    v: k.vec2(0, 0),
    color: getRGB(k, C.tint)
  }
  start && settle(inst, start)
  return inst
}

/**
 * Runs it on: fixed steps of its body and limbs (fewer out of sight), its
 * hands' holds planned now and then, a new way when one is due; then its
 * pose for this frame, between its last two steps.
 * @param {Object} inst - Climber instance
 * @param {Object} ctx
 * @param {{left: number, right: number, top: number, bottom: number}} ctx.view - Visible world rect
 * @param {Array<{x: number, y: number}>} ctx.prey - Fireflies its claws may touch and snatch
 * @param {(f: Object) => void} ctx.onEat - A firefly is snatched
 */
export function onUpdate(inst, ctx) {
  if (!inst.path[0]) return
  const t0 = inst.profile ? performance.now() : 0
  const dt = inst.k.dt()
  inst.view = ctx.view
  const far = isFar(inst, ctx.view)
  const step = 1 / (far ? PERF.farHz : PERF.simHz)
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
  inst.profile && (inst.stats.update = ease(inst.stats.update, performance.now() - t0))
}

/**
 * Draws it in one of the level's two passes: behind the soil (its limbs
 * and head while it is behind a platform, and its free hands) or in front
 * of it (all of it while it is in front; else only the hands that hold an
 * edge, come round it); in front also the holds' lines (showHolds) and,
 * in debug, its workings.
 * @param {Object} inst - Climber instance
 * @param {boolean} front - The pass in front of the soil
 */
export function onDraw(inst, front) {
  front && C.showHolds && inst.view && Look.drawHolds(inst, inst.view)
  if (!inst.visible) return
  const t0 = inst.profile ? performance.now() : 0
  const whole = (inst.layer === LAYER.FRONT) === front
  for (let i = 0; i < inst.arms.length; i++) whole && Look.drawArm(inst, inst.arms[i])
  for (let i = 0; i < inst.arms.length; i++) inst.arms[i].handFront === front && Look.drawHand(inst, inst.arms[i])
  whole && Look.drawHead(inst)
  front && inst.debug && Look.drawDebug(inst)
  inst.profile && (inst.stats.draw = ease(inst.stats.draw, performance.now() - t0))
}

/**
 * A sound somewhere in the cave: heard if it is loud enough where the
 * climber is (fading over hearing.range, muffled by soil in between); a
 * heard one sets it after that place (its mouth opens).
 * @param {Object} inst - Climber instance
 * @param {number} x - World X of the sound
 * @param {number} y - World Y of the sound
 * @param {number} loudness - Its loudness at its source (1: a heavy landing)
 */
export function hear(inst, x, y, loudness) {
  const dx = x - inst.body.x
  const dy = y - inst.body.y
  if (Math.abs(dx) > HEAR.range || Math.abs(dy) > HEAR.range) return
  const reach = loudness * (1 - vecLen(dx, dy) / HEAR.range)
  if (reach < HEAR.threshold) return
  if (reach * (1 - occlusion(inst, x, y) * HEAR.occlusion) < HEAR.threshold) return
  inst.stats.heard++
  inst.heard.x = x
  inst.heard.y = y
  inst.heard.at = inst.time
  inst.mood !== MOOD.PURSUE && openWide(inst)
  inst.mood = MOOD.PURSUE
  inst.restFor = 0
  inst.pauseFor = 0
  inst.wantWay = true
}
//
// A limb: its state and the time in it, when it took its hold; its
// shoulder and wrist and the way its hand points; its chain's points
// (x, y), where they were a step ago (ox, oy: their motion), at the last
// step's end (rx, ry: for drawing between steps) and as drawn this frame
// (nx, ny); its muscle's eased bow and its wrist's guide; its hold and the
// hold it reaches for (records of its own), its reach's curve, its
// probe's arc, its fingers' curl; what it is drawn with.
//
function createArm(i) {
  return {
    i,
    state: STATE.HANG,
    stateT: 0,
    heldAt: 0,
    side: i % 2 ? -1 : 1,
    sx: 0,
    sy: 0,
    wx: 0,
    wy: 0,
    ax: 0,
    ay: 1,
    x: new Float32Array(SEGS + 1),
    y: new Float32Array(SEGS + 1),
    ox: new Float32Array(SEGS + 1),
    oy: new Float32Array(SEGS + 1),
    rx: new Float32Array(SEGS + 1),
    ry: new Float32Array(SEGS + 1),
    nx: new Float32Array(SEGS + 1),
    ny: new Float32Array(SEGS + 1),
    tx: 0,
    ty: 0,
    fromX: 0,
    fromY: 0,
    backFor: RECOVER_TIME,
    bowX: 0,
    bowY: 0,
    guide: 0,
    seg: ANAT.length / SEGS,
    swell: 1,
    p: { wx: 0, wy: 0, ax: 0, ay: 1 },
    d: { wx: 0, wy: 0, ax: 0, ay: 1 },
    hold: newHold(),
    to: newHold(),
    reach: { fx: 0, fy: 0, fax: 0, fay: 1, c1x: 0, c1y: 0, c2x: 0, c2y: 0, t: 0, dur: 1 },
    probe: { a0: 0, a1: 0, t: 0, dur: 1 },
    retryAt: 0,
    snap: 0,
    curl: CURL_FREE,
    handFront: true,
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
// Its start: the body at the start node's place, its hands put on the
// nearest holds round it (as many as it keeps), the rest hanging; each
// limb's chain laid from shoulder to wrist and settled.
//
function settle(inst, node) {
  inst.path[0] = node
  inst.path[1] = node
  inst.path.length = 2
  inst.modes[0] = MODE.OUT
  inst.modes[1] = MODE.OUT
  inst.modes.length = 2
  inst.seg = 0
  inst.u = 0
  placeFrame(inst)
  inst.body.x = inst.carrot.x
  inst.body.y = inst.carrot.y
  inst.vel.x = 0
  inst.vel.y = 0
  inst.layer = LAYER.FRONT
  inst.arms.forEach(arm => {
    shoulderOf(inst, arm)
    arm.state = STATE.HANG
    if (countState(inst, STATE.ANCHOR) < MOOD_CFG[inst.mood].holds && findHold(inst, arm, 0)) anchorAt(inst, arm, arm.to)
    else hangAt(inst, arm)
    layChain(arm)
  })
  for (let step = 0; step < SETTLE_STEPS; step++) inst.arms.forEach(arm => flex(inst, arm, 1 / PERF.simHz))
  inst.arms.forEach(keepPrev)
  inst.anchored = countState(inst, STATE.ANCHOR)
  inst.prev.x = inst.body.x
  inst.prev.y = inst.body.y
}
function hangAt(inst, arm) {
  hangPose(inst, arm, inst.ideal)
  arm.wx = inst.ideal.x
  arm.wy = inst.ideal.y
  arm.tx = arm.wx
  arm.ty = arm.wy
}
//
// A chain laid straight from its shoulder to its wrist, at rest.
//
function layChain(arm) {
  arm.seg = wantedLength(arm) / SEGS
  for (let i = 0; i <= SEGS; i++) {
    const t = i / SEGS
    arm.x[i] = arm.sx + (arm.wx - arm.sx) * t
    arm.y[i] = arm.sy + (arm.wy - arm.sy) * t
    arm.ox[i] = arm.x[i]
    arm.oy[i] = arm.y[i]
  }
}
//
// One fixed step: its mood, the way it faces, its way, its layer, its
// body, its limbs, its tilt and mouth.
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
  updateLayer(inst)
  moveBody(inst, dt)
  const t0 = inst.profile ? performance.now() : 0
  for (let i = 0; i < inst.arms.length; i++) moveArm(inst, inst.arms[i], dt)
  inst.profile && (inst.stats.limbs = ease(inst.stats.limbs, performance.now() - t0))
  inst.anchored = countState(inst, STATE.ANCHOR)
  inst.reaching = countState(inst, STATE.REACH)
  updateTilt(inst, dt)
  updateMouth(inst, dt)
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
// Its mood: hunting, silent for `memory` s, it gives up the chase and
// feels about where it is; done feeling about, it roams again.
//
function updateMood(inst, dt) {
  if (inst.mood === MOOD.PURSUE && inst.time - inst.heard.at > HEAR.memory) return arrive(inst)
  if (inst.mood !== MOOD.INVESTIGATE || inst.restFor > 0) return
  inst.mood = MOOD.EXPLORE
  inst.restFor = dt
}
//
// The way it faces: the side the way leads to (only past faceDx sideways:
// a steep way keeps the side it has), taken as the side to face only
// after it has led there for faceHold s; the head then turns round over
// turnTime s (quicker hunting) — never at once.
//
function updateFacing(inst, dt) {
  const f = inst.frame
  const quick = inst.mood === MOOD.PURSUE ? PURSUIT_TURN : 1
  inst.faceSide = f.dx > TURN.faceDx ? 1 : f.dx < -TURN.faceDx ? -1 : inst.faceSide
  const led = inst.restFor <= 0 && inst.faceSide !== inst.faceWant
  inst.faceFor = led ? inst.faceFor + dt : 0
  if (inst.faceFor >= TURN.faceHold * quick) {
    inst.faceWant = inst.faceSide
    inst.faceFor = 0
  }
  const step = 2 * dt / (TURN.turnTime * quick)
  inst.face += Math.max(-step, Math.min(step, inst.faceWant - inst.face))
}
//
// Its way: resting at a goal (then a new way), stopping now and then while
// it roams; else its place moved on along the way — only while enough
// hands hold, the body keeps up (never more than `lead` px behind) and it
// faces the way it goes (turning round, it stands) — and the frame there.
//
function updateTravel(inst, dt) {
  const m = MOOD_CFG[inst.mood]
  if (inst.restFor > 0) {
    inst.restFor -= dt
    inst.restFor <= 0 && (inst.wantWay = true)
  }
  updatePause(inst, dt)
  const behind = vecLen(inst.carrot.x - inst.body.x, inst.carrot.y - inst.body.y)
  const turned = inst.faceSide === inst.faceWant && Math.abs(inst.faceWant - inst.face) < TURNED
  const free = inst.restFor <= 0 && inst.pauseFor <= 0 && turned
  const go = free && inst.anchored >= GRIP.minSupport && behind < m.lead
  inst.stuckFor = free && !go ? inst.stuckFor + dt : 0
  inst.stuckFor > STUCK && (inst.wantWay = true)
  inst.speed += ((go ? m.speed : 0) - inst.speed) * Math.min(1, m.accel * dt)
  inst.speed > MOVE_EPS && advance(inst, inst.speed * dt)
  placeFrame(inst)
}
function updatePause(inst, dt) {
  if (inst.mood !== MOOD.EXPLORE) return
  if (inst.pauseFor > 0) {
    inst.pauseFor -= dt
    return
  }
  inst.pauseIn -= dt
  if (inst.pauseIn > 0) return
  inst.pauseIn = pauseGap(inst.rng)
  inst.pauseFor = between(inst.rng, C.explore.pause)
}
function pauseGap(rng) {
  return between(rng, C.explore.pauseEvery)
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
//
// At its goal: hunting, it feels about there for a while; roaming, it
// rests.
//
function arrive(inst) {
  const hunted = inst.mood === MOOD.PURSUE
  inst.mood = hunted ? MOOD.INVESTIGATE : MOOD.EXPLORE
  inst.restFor = hunted ? HEAR.investigate : REST + inst.rng() * REST_RANGE
  inst.speed = 0
}
function segLength(inst, seg) {
  const a = nodePlace(inst, seg, inst.pa)
  const b = nodePlace(inst, seg + 1, inst.pb)
  return Math.max(1, vecLen(b.x - a.x, b.y - a.y))
}
//
// The body's place at a node of the way, in the way it is climbed there
// (out in the air while its layer is still the other one).
//
function nodePlace(inst, i, out) {
  const node = inst.path[i]
  const mode = modeAt(inst, i)
  out.h = mode === MODE.OUT ? node.h : mode === MODE.BEHIND ? Nav.BEHIND_OUT : -Nav.FACE_IN
  out.x = node.x + node.nx * out.h
  out.y = node.y + node.ny * out.h
  return out
}
function modeAt(inst, i) {
  const want = inst.modes[i] ?? MODE.OUT
  return want !== MODE.OUT && LAYER_OF[want] !== inst.layer ? MODE.OUT : want
}
//
// The frame at its place between two nodes of the way: the place itself
// (where the holding limbs pull the body), the edge's normal, how far off
// it, the way it is climbed there, which way along.
//
function placeFrame(inst) {
  const seg = Math.min(inst.seg, inst.path.length - 2)
  const a = nodePlace(inst, seg, inst.pa)
  const b = nodePlace(inst, seg + 1, inst.pb)
  const na = inst.path[seg]
  const nb = inst.path[seg + 1]
  const u = inst.u
  const f = inst.frame
  inst.carrot.x = a.x + (b.x - a.x) * u
  inst.carrot.y = a.y + (b.y - a.y) * u
  const nx = na.nx + (nb.nx - na.nx) * u
  const ny = na.ny + (nb.ny - na.ny) * u
  const nl = vecLen(nx, ny) || 1
  f.nx = nx / nl
  f.ny = ny / nl
  f.h = a.h + (b.h - a.h) * u
  const near = u < HALF ? seg : seg + 1
  f.mode = modeAt(inst, near)
  f.walk = f.mode === MODE.OUT && inst.path[near].top
  const dl = vecLen(b.x - a.x, b.y - a.y)
  if (dl > 1) {
    f.dx = (b.x - a.x) / dl
    f.dy = (b.y - a.y) / dl
  }
}
//
// A new way: hunting, to the node nearest the last place heard; else to a
// node picked at random; cut into stretches each climbed in one way where
// the nodes allow it; from the next node of its way, or — stuck — from
// the node nearest where it is. Hunting, it plans again at most every
// replanGap s, or when the sound moved replanDist px.
//
function planWay(inst) {
  const hunting = inst.mood === MOOD.PURSUE
  const stuck = inst.stuckFor > STUCK
  const moved = vecLen(inst.heard.x - inst.plannedTo.x, inst.heard.y - inst.plannedTo.y)
  if (hunting && !stuck && inst.time - inst.plannedAt < HEAR.replanGap && moved < HEAR.replanDist && inst.seg < inst.path.length - 1) return
  inst.wantWay = false
  inst.stuckFor = 0
  const t0 = inst.profile ? performance.now() : 0
  const next = inst.path[Math.min(inst.seg + 1, inst.path.length - 1)]
  const from = stuck ? Nav.nearestNode(inst.nav, inst.body.x, inst.body.y, next.group) ?? next : next
  const goal = hunting ? Nav.nearestNode(inst.nav, inst.heard.x, inst.heard.y, from.group) : Nav.randomNode(inst.nav, from.group, inst.rng)
  inst.plannedAt = inst.time
  inst.plannedTo.x = inst.heard.x
  inst.plannedTo.y = inst.heard.y
  if (!goal || goal === from) {
    hunting ? arrive(inst) : (inst.restFor = REST)
    return
  }
  const count = Nav.findWay(inst.nav, from, goal, inst.path)
  count < 2 && inst.path.push(from)
  stretchModes(inst)
  inst.seg = 0
  inst.u = 0
  inst.profile && (inst.stats.way = ease(inst.stats.way, performance.now() - t0))
}
//
// Each node's way along the path: stretches of one way each (where the
// node has no room for it, out in the air), OUT_BETWEEN nodes out in the
// air after a stretch behind or on the face; hunting, always out in the
// air (the quickest).
//
function stretchModes(inst) {
  const way = inst.path
  inst.modes.length = way.length
  let mode = MODE.OUT
  let left = 0
  for (let i = 0; i < way.length; i++) {
    if (left <= 0) {
      const wasIn = mode !== MODE.OUT
      mode = wasIn || inst.mood === MOOD.PURSUE ? MODE.OUT : pickMode(inst)
      left = wasIn ? OUT_BETWEEN : STRETCH_MIN + Math.floor(inst.rng() * (STRETCH_RANGE + 1))
    }
    left--
    const node = way[i]
    inst.modes[i] = mode === MODE.BEHIND && !node.behind ? MODE.OUT : mode === MODE.FACE && !node.face ? MODE.OUT : mode
  }
  inst.modes[way.length - 1] = MODE.OUT
}
function pickMode(inst) {
  const ways = GRIP.ways
  const r = inst.rng() * (ways.out + ways.behind + ways.face)
  return r < ways.out ? MODE.OUT : r < ways.out + ways.behind ? MODE.BEHIND : MODE.FACE
}
//
// Its layer: the one the stretch here (or the next node's) needs, taken
// only while nothing of it is over the soil.
//
function updateLayer(inst) {
  const seg = Math.min(inst.seg, inst.path.length - 2)
  const need = LAYER_OF[inst.modes[seg]] ?? LAYER_OF[inst.modes[seg + 1]]
  need && need !== inst.layer && isClear(inst) && (inst.layer = need)
}
function isClear(inst) {
  if (!Surface.isOpenAir(inst.body.x, inst.body.y, CLEAR_R)) return false
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    for (let j = 0; j < CLEAR_NODES.length; j++) {
      if (Surface.isSoil(arm.x[CLEAR_NODES[j]], arm.y[CLEAR_NODES[j]])) return false
    }
  }
  return true
}
//
// The body: pulled to its place by the holding limbs (as strongly as they
// are enough to bear it), damped, weighed down — falling if nothing
// holds; then kept within reach of every holding hand. Falling it lands
// on soil; lost (in the lake, out of the world, too long without a hold)
// it is put back on its way.
//
function moveBody(inst, dt) {
  const m = MOOD_CFG[inst.mood]
  const b = inst.body
  const v = inst.vel
  const share = Math.min(1, inst.anchored / GRIP.minSupport)
  const damp = 2 * Math.sqrt(m.pull) * m.damping
  v.x += ((inst.carrot.x - b.x) * m.pull * share - v.x * damp) * dt
  v.y += ((inst.carrot.y - b.y) * m.pull * share - v.y * damp + GRAVITY * (1 - share) + SAG * share) * dt
  b.x += v.x * dt
  b.y += v.y * dt
  for (let pass = 0; pass < CONSTRAINT_PASSES; pass++) {
    for (let i = 0; i < inst.arms.length; i++) inst.arms[i].state === STATE.ANCHOR && keepInReach(inst, inst.arms[i])
  }
  if (inst.anchored === 0) fall(inst, dt)
  else inst.lostFor = 0
}
//
// A holding hand's reach: the body (by its shoulder) no farther from the
// wrist than the limb is long; moving away from it, it stops.
//
function keepInReach(inst, arm) {
  shoulderOf(inst, arm)
  const dx = arm.sx - arm.hold.x
  const dy = arm.sy - arm.hold.y
  const d = vecLen(dx, dy)
  const limit = REACH_MAX * ANCHOR_SLACK
  if (d <= limit) return
  const ux = dx / d
  const uy = dy / d
  inst.body.x -= ux * (d - limit)
  inst.body.y -= uy * (d - limit)
  const out = inst.vel.x * ux + inst.vel.y * uy
  if (out <= 0) return
  inst.vel.x -= ux * out
  inst.vel.y -= uy * out
}
function fall(inst, dt) {
  const b = inst.body
  inst.lostFor += dt
  if (inst.vel.y > 0 && Surface.isSoil(b.x, b.y + BODY_FOOT)) {
    b.y = inst.prev.y
    inst.vel.y = 0
    inst.vel.x = 0
  }
  const lost = inst.lostFor > LOST || b.y > Layout.WORLD_H || Nav.inLakeZone(b.x, b.y)
  const start = lost && Nav.nearestNode(inst.nav, START_SPOT.x, START_SPOT.y, -1)
  start && settle(inst, start)
}
//
// A limb for one step: its shoulder on the body; its wrist held, swung on
// its reach, feeling its arc, drawn back or hanging (a free one never past
// its length); its chain settled between them; a free hand turned with
// its limb's end; its fingers.
//
function moveArm(inst, arm, dt) {
  arm.stateT += dt
  arm.snap = Math.max(0, arm.snap - dt)
  shoulderOf(inst, arm)
  if (arm.state === STATE.ANCHOR) holdOn(arm)
  else if (arm.state === STATE.REACH) swing(inst, arm, dt)
  else if (arm.state === STATE.PROBE) sweep(inst, arm, dt)
  else hangFree(inst, arm, dt)
  arm.state === STATE.ANCHOR || keepFreeInReach(arm)
  flex(inst, arm, dt)
  arm.state === STATE.ANCHOR || arm.state === STATE.REACH || followChain(arm, dt)
  arm.curl += (curlWanted(arm) - arm.curl) * Math.min(1, CURL_RATE * dt)
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
function holdOn(arm) {
  arm.wx = arm.hold.x
  arm.wy = arm.hold.y
  arm.ax = arm.hold.ax
  arm.ay = arm.hold.ay
}
//
// The limb's flesh, one step: every point between its shoulder and its
// wrist keeps most of its motion and is bowed by the muscle (most at the
// limb's middle); then, in a set number of passes, the limb comes into
// its wrist along the hand, straightens its bends (none sharper than
// maxBend), keeps out of the soil (out in the air) and keeps its length.
//
function flex(inst, arm, dt) {
  const { x, y, ox, oy } = arm
  easeBow(inst, arm, dt)
  arm.seg += (wantedLength(arm) / SEGS - arm.seg) * Math.min(1, LIMB.lengthRate * dt)
  const keep = Math.pow(LIMB.damping, dt * PERF.simHz)
  const push = dt * dt
  for (let i = 1; i < SEGS; i++) {
    const vx = (x[i] - ox[i]) * keep
    const vy = (y[i] - oy[i]) * keep
    ox[i] = x[i]
    oy[i] = y[i]
    x[i] += vx + arm.bowX * push * BOW_W[i]
    y[i] += vy + arm.bowY * push * BOW_W[i]
  }
  const solid = inst.frame.mode === MODE.OUT
  for (let pass = 0; pass < PERF.limbPasses; pass++) {
    x[0] = arm.sx
    y[0] = arm.sy
    x[SEGS] = arm.wx
    y[SEGS] = arm.wy
    const lead = arm.guide * LIMB.wristGuide
    x[SEGS - 1] += (arm.wx - arm.ax * arm.seg - x[SEGS - 1]) * lead
    y[SEGS - 1] += (arm.wy - arm.ay * arm.seg - y[SEGS - 1]) * lead
    for (let i = 1; i < SEGS; i++) {
      x[i] += ((x[i - 1] + x[i + 1]) * HALF - x[i]) * LIMB.stiffness
      y[i] += ((y[i - 1] + y[i + 1]) * HALF - y[i]) * LIMB.stiffness
    }
    keepBends(arm)
    solid && keepOutOfSoil(arm)
    keepLength(arm)
  }
  ox[0] = x[0]
  oy[0] = y[0]
  ox[SEGS] = x[SEGS]
  oy[SEGS] = y[SEGS]
}
//
// How long a limb wants to be: a little longer than the way from its
// shoulder to its wrist (so it curves gently), never shorter than it can
// contract nor longer than it is.
//
function wantedLength(arm) {
  const span = vecLen(arm.wx - arm.sx, arm.wy - arm.sy)
  return Math.max(REACH_MAX * LIMB.minLength, Math.min(REACH_MAX, span * LIMB.slack))
}
//
// The muscle's bow, eased to its new way: a holding or reaching limb
// bows out of the surface its hand holds (behind a platform, into it:
// hidden behind the soil) and a little toward its hand's side; a free one
// droops. The wrist's guide eases in while the hand holds or reaches.
//
function easeBow(inst, arm, dt) {
  const h = arm.state === STATE.ANCHOR ? arm.hold : arm.state === STATE.REACH ? arm.to : null
  let bx = 0
  let by = LIMB.droop
  if (h) {
    const into = inst.frame.mode === MODE.BEHIND ? -1 : 1
    const dx = arm.wx - arm.sx
    const dy = arm.wy - arm.sy
    const d = vecLen(dx, dy) || 1
    const wx = h.nx * into + dx / d * OUTWARD
    const wy = h.ny * into + dy / d * OUTWARD
    const w = vecLen(wx, wy) || 1
    bx = wx / w * LIMB.bow
    by = wy / w * LIMB.bow
  }
  const e = Math.min(1, LIMB.bowRate * dt)
  arm.bowX += (bx - arm.bowX) * e
  arm.bowY += (by - arm.bowY) * e
  arm.guide += ((h ? 1 : 0) - arm.guide) * Math.min(1, GUIDE_RATE * dt)
}
//
// No bend sharper than maxBend: the far ends of two pieces in a row are
// moved apart to BEND_SHARE pieces (the shoulder and the wrist stay put).
//
function keepBends(arm) {
  const { x, y } = arm
  const span = BEND_SHARE * arm.seg
  for (let i = 0; i + 2 <= SEGS; i++) {
    const dx = x[i + 2] - x[i]
    const dy = y[i + 2] - y[i]
    const d = vecLen(dx, dy) || 1
    if (d >= span) continue
    const off = (span - d) / d
    const a = i === 0 ? 0 : i + 2 === SEGS ? 1 : HALF
    x[i] -= dx * off * a
    y[i] -= dy * off * a
    x[i + 2] += dx * off * (1 - a)
    y[i + 2] += dy * off * (1 - a)
  }
}
//
// Every piece its length again: its two ends moved together or apart (the
// shoulder and the wrist stay put).
//
function keepLength(arm) {
  const { x, y } = arm
  for (let i = 0; i < SEGS; i++) {
    const dx = x[i + 1] - x[i]
    const dy = y[i + 1] - y[i]
    const d = vecLen(dx, dy) || 1
    const off = (d - arm.seg) / d
    const a = i === 0 ? 0 : i === SEGS - 1 ? 1 : HALF
    x[i] += dx * off * a
    y[i] += dy * off * a
    x[i + 1] -= dx * off * (1 - a)
    y[i + 1] -= dy * off * (1 - a)
  }
}
//
// No point of the limb, nor the middle of a piece, in the soil (nor
// within the limb's radius of it): each is moved out the way the soil
// lies, a px at a time, and stops there.
//
function keepOutOfSoil(arm) {
  const { x, y, ox, oy } = arm
  for (let i = 1; i < SEGS; i++) {
    for (let n = 0; n < PUSH_STEPS; n++) {
      SPOT[SPOT_X] = x[i]
      SPOT[SPOT_Y] = y[i]
      if (!wayOut(arm)) break
      x[i] += SPOT[OUT_X] * PUSH
      y[i] += SPOT[OUT_Y] * PUSH
      ox[i] = x[i]
      oy[i] = y[i]
    }
  }
  for (let i = 0; i < SEGS; i++) {
    SPOT[SPOT_X] = (x[i] + x[i + 1]) * HALF
    SPOT[SPOT_Y] = (y[i] + y[i + 1]) * HALF
    if (!Surface.isSoil(Math.round(SPOT[SPOT_X]) | 0, Math.round(SPOT[SPOT_Y]) | 0) || !wayOut(arm)) continue
    i > 0 && shift(arm, i)
    i + 1 < SEGS && shift(arm, i + 1)
  }
}
function shift(arm, i) {
  arm.x[i] += SPOT[OUT_X] * PUSH
  arm.y[i] += SPOT[OUT_Y] * PUSH
}
//
// Whether the point in SPOT is in the soil or within the limb's radius of
// it, and the way out of it (written into SPOT): away from where the soil
// lies round the point; deep in it, back toward the shoulder. The soil is
// asked in whole px (whole numbers pass without garbage).
//
function wayOut(arm) {
  const px = Math.round(SPOT[SPOT_X]) | 0
  const py = Math.round(SPOT[SPOT_Y]) | 0
  const r = LIMB.radius
  const l = Surface.isSoil(px - r, py) ? 1 : 0
  const rt = Surface.isSoil(px + r, py) ? 1 : 0
  const u = Surface.isSoil(px, py - r) ? 1 : 0
  const d = Surface.isSoil(px, py + r) ? 1 : 0
  if (!(l || rt || u || d || Surface.isSoil(px, py))) return false
  let gx = l - rt
  let gy = u - d
  if (!gx && !gy) {
    gx = arm.sx - px
    gy = arm.sy - py
  }
  const g = vecLen(gx, gy) || 1
  SPOT[OUT_X] = gx / g
  SPOT[OUT_Y] = gy / g
  return true
}
//
// A free hand turns with its limb's end, eased.
//
function followChain(arm, dt) {
  const dx = arm.x[SEGS] - arm.x[SEGS - 1]
  const dy = arm.y[SEGS] - arm.y[SEGS - 1]
  const d = vecLen(dx, dy) || 1
  const e = Math.min(1, AXIS_EASE * dt)
  setAxis(arm, arm.ax + (dx / d - arm.ax) * e, arm.ay + (dy / d - arm.ay) * e)
}
//
// A reaching hand on its curve: drawn back and off the surface, out, and
// in over the hold, its way turning to the hold's; there, it takes hold
// (or, out of reach now, it missed and draws back).
//
function swing(inst, arm, dt) {
  const r = arm.reach
  r.t = Math.min(1, r.t + dt / r.dur)
  const e = r.t * r.t * (3 - 2 * r.t)
  const to = arm.to
  arm.wx = cubic(r.fx, r.c1x, r.c2x, to.x, e)
  arm.wy = cubic(r.fy, r.c1y, r.c2y, to.y, e)
  setAxis(arm, r.fax + (to.ax - r.fax) * e, r.fay + (to.ay - r.fay) * e)
  if (r.t < 1) return
  if (vecLen(to.x - arm.sx, to.y - arm.sy) > REACH_MAX * ANCHOR_SLACK) return drawBack(inst, arm)
  anchorAt(inst, arm, to)
  landed(inst, arm)
}
function cubic(a, b, c, d, t) {
  const m = 1 - t
  return m * m * m * a + 3 * m * m * t * b + 3 * m * t * t * c + t * t * t * d
}
//
// A hand has taken hold: the body gets a small tug toward it, and the
// hand left farthest behind lets go if more hold than the mood keeps.
//
function landed(inst, arm) {
  const m = MOOD_CFG[inst.mood]
  inst.lastLand = inst.time
  const dx = arm.hold.gx - inst.body.x
  const dy = arm.hold.gy - inst.body.y
  const d = vecLen(dx, dy) || 1
  inst.vel.x += dx / d * m.kick
  inst.vel.y += dy / d * m.kick
  inst.anchored = countState(inst, STATE.ANCHOR)
  inst.anchored > m.holds && inst.anchored - 1 >= GRIP.minSupport && letGo(inst, arm)
}
//
// The holding hand farthest behind the way it goes (or most stretched)
// lets go and draws back; never the one that just took hold, nor one that
// has held for less than minHold s.
//
function letGo(inst, keep) {
  let pick = null
  let worst = -Infinity
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm === keep || arm.state !== STATE.ANCHOR || inst.time - arm.heldAt < GRIP.minHold) continue
    const need = lagOf(inst, arm) + stretchOf(arm) * LET_GO_STRETCH
    if (need <= worst) continue
    worst = need
    pick = arm
  }
  pick && drawBack(inst, pick)
  inst.anchored = countState(inst, STATE.ANCHOR)
}
function lagOf(inst, arm) {
  return -((arm.hold.gx - inst.carrot.x) * inst.frame.dx + (arm.hold.gy - inst.carrot.y) * inst.frame.dy)
}
function stretchOf(arm) {
  return vecLen(arm.hold.x - arm.sx, arm.hold.y - arm.sy) / REACH_MAX
}
//
// A probing hand: slowly stretching out, feeling its one arc round its
// shoulder, drawing in again at the end; then it draws back.
//
function sweep(inst, arm, dt) {
  const p = arm.probe
  p.t = Math.min(1, p.t + dt / p.dur)
  const e = p.t * p.t * (3 - 2 * p.t)
  const angle = p.a0 + (p.a1 - p.a0) * e
  const out = Math.min(1, p.t / PROBE_OUT)
  const back = Math.max(0, (p.t - PROBE_BACK) / (1 - PROBE_BACK))
  const share = PROBE_NEAR + (PROBE_FAR - PROBE_NEAR) * out * out * (3 - 2 * out) * (1 - back * back)
  inst.ideal.x = arm.sx + Math.cos(angle) * REACH_MAX * share
  inst.ideal.y = arm.sy + Math.sin(angle) * REACH_MAX * share
  freeSpot(inst, arm, inst.ideal)
  easeSpot(arm, inst.ideal, dt)
  easeWrist(arm, arm.tx, arm.ty, PROBE_EASE * dt)
  p.t >= 1 && drawBack(inst, arm)
}
//
// A hand lets go (or missed): it draws back from where it is (the spot it
// goes for starts there too), over a time set now (quicker hunting).
//
function drawBack(inst, arm) {
  arm.fromX = arm.wx
  arm.fromY = arm.wy
  arm.backFor = RECOVER_TIME * (inst.mood === MOOD.PURSUE ? PURSUIT_TURN : 1)
  arm.tx = arm.wx
  arm.ty = arm.wy
  setState(arm, STATE.RECOVER)
}
//
// The spot a free hand goes for, eased toward where it should be.
//
function easeSpot(arm, spot, dt) {
  const e = Math.min(1, TARGET_EASE * dt)
  arm.tx += (spot.x - arm.tx) * e
  arm.ty += (spot.y - arm.ty) * e
}
//
// A free hand: drawn back after letting go — a timed move from where it
// let go to where it hangs, gentle at both ends — then hanging loose under
// its shoulder, or — the walker's — held up ahead; never into the soil.
//
function hangFree(inst, arm, dt) {
  hangPose(inst, arm, inst.ideal)
  freeSpot(inst, arm, inst.ideal)
  easeSpot(arm, inst.ideal, dt)
  if (arm.state !== STATE.RECOVER) return easeWrist(arm, arm.tx, arm.ty, FREE_EASE * dt)
  const t = Math.min(1, arm.stateT / arm.backFor)
  const e = t * t * (3 - 2 * t)
  arm.wx = arm.fromX + (arm.tx - arm.fromX) * e
  arm.wy = arm.fromY + (arm.ty - arm.fromY) * e
  t >= 1 && setState(arm, STATE.HANG)
}
function hangPose(inst, arm, out) {
  const f = inst.frame
  if (f.walk) {
    out.x = arm.sx + f.dx * FREE_R
    out.y = arm.sy - FREE_UP * FREE_R
    return out
  }
  out.x = arm.sx + arm.side * HANG_APART
  out.y = arm.sy + REACH_MAX * HANG_SHARE
  return out
}
//
// A spot for a free hand, out in the air: one in the soil (or within the
// limb's radius of it) is drawn back toward the shoulder until it is
// clear.
//
function freeSpot(inst, arm, spot) {
  if (inst.frame.mode !== MODE.OUT) return
  const dx = arm.sx - spot.x
  const dy = arm.sy - spot.y
  const d = vecLen(dx, dy) || 1
  for (let n = 0; n < TARGET_TRIES && n * TARGET_STEP < d; n++) {
    SPOT[SPOT_X] = spot.x
    SPOT[SPOT_Y] = spot.y
    if (!wayOut(arm)) return
    spot.x += dx / d * TARGET_STEP
    spot.y += dy / d * TARGET_STEP
  }
}
function easeWrist(arm, x, y, rate) {
  const e = 1 - Math.exp(-rate)
  arm.wx += (x - arm.wx) * e
  arm.wy += (y - arm.wy) * e
}
function keepFreeInReach(arm) {
  const dx = arm.wx - arm.sx
  const dy = arm.wy - arm.sy
  const d = vecLen(dx, dy)
  if (d <= REACH_MAX) return
  arm.wx = arm.sx + dx / d * REACH_MAX
  arm.wy = arm.sy + dy / d * REACH_MAX
}
function setAxis(arm, x, y) {
  const l = vecLen(x, y)
  if (l < HALF) return
  arm.ax = x / l
  arm.ay = y / l
}
function curlWanted(arm) {
  if (arm.state === STATE.ANCHOR || arm.snap > 0) return CURL_GRIP
  return arm.state === STATE.REACH ? CURL_OPEN : CURL_FREE
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
// The body's tilt: a damped turn toward the lean of the way it goes (only
// while it moves; mirrored with the side it faces), never faster than
// angularVel nor harder than angularAccel.
//
function updateTilt(inst, dt) {
  const moving = inst.speed > FACE_SPEED ? 1 : 0
  inst.moveShare += (moving - inst.moveShare) * Math.min(1, MOVE_RATE * dt)
  inst.tiltWant = inst.frame.dy * TURN.tilt * inst.face * inst.moveShare
  const pull = (inst.tiltWant - inst.tilt) * TILT_FREQ * TILT_FREQ - inst.tiltVel * 2 * TILT_FREQ
  const acc = Math.max(-TURN.angularAccel, Math.min(TURN.angularAccel, pull))
  inst.tiltVel = Math.max(-TURN.angularVel, Math.min(TURN.angularVel, inst.tiltVel + acc * dt))
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
// The plan, planHz times a second: a new way when one is due; enough
// hands holding; the next hold on along the way for a free hand when one
// is behind; a free limb feeling about while it stops; a probing or free
// hand touching a hold or a firefly.
//
function planTick(inst, ctx) {
  const t0 = inst.profile ? performance.now() : 0
  inst.stats.queries = 0
  inst.stats.candidates = 0
  inst.wantWay && planWay(inst)
  const m = MOOD_CFG[inst.mood]
  if (inst.anchored + inst.reaching < GRIP.minSupport) holdOnAgain(inst)
  else if (inst.reaching < m.reaches && inst.time - inst.lastLand >= m.stepGap && needsStep(inst, m)) stepOn(inst, m)
  else maybeProbe(inst)
  for (let i = 0; i < inst.arms.length; i++) feel(inst, inst.arms[i], ctx)
  inst.profile && (inst.stats.plan = ease(inst.stats.plan, performance.now() - t0))
}
//
// Too few hands hold (it starts, or it slipped): every free hand reaches
// for a hold round where it is.
//
function holdOnAgain(inst) {
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    arm.state !== STATE.ANCHOR && arm.state !== STATE.REACH && inst.time >= arm.retryAt && reachFor(inst, arm, 0)
  }
}
//
// Whether a hand should step on: it moves and a hold lags `stride` px
// behind its place or is near the end of its limb's length; or fewer
// hands hold than the mood keeps.
//
function needsStep(inst, m) {
  if (inst.anchored < m.holds) return true
  if (inst.speed <= MOVE_EPS && inst.restFor > 0) return false
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state === STATE.ANCHOR && (lagOf(inst, arm) > m.stride || stretchOf(arm) > STRETCH)) return true
  }
  return false
}
//
// A step: a free hand goes for the next hold on along the way; with no
// hand free, the one farthest behind lets go first (if enough others
// hold).
//
function stepOn(inst, m) {
  const arm = freeArm(inst)
  if (arm) return inst.time >= arm.retryAt && reachFor(inst, arm, m.holdLead)
  inst.anchored - 1 >= GRIP.minSupport && letGo(inst, null)
}
function freeArm(inst) {
  let pick = null
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state === STATE.ANCHOR || arm.state === STATE.REACH) continue
    if (!pick || arm.state === STATE.HANG) pick = arm
  }
  return pick
}
//
// Sends a hand to the best hold for it `lead` px on along the way; one
// that finds none (or no clear path to it) waits RETRY s.
//
function reachFor(inst, arm, lead) {
  if (findHold(inst, arm, lead) && startReach(inst, arm)) return true
  arm.retryAt = inst.time + RETRY
  return false
}
//
// The best hold for a hand: the wanted spots ahead first (on the face the
// very spot, where soil is there); near each, the hold nearest it whose
// normal fits the edge, that the limb reaches, no other hand has and no
// soil stands in the way to. Written into arm.to.
//
function findHold(inst, arm, lead) {
  const f = inst.frame
  const slots = f.mode === MODE.FACE ? FACE_SLOTS : f.mode === MODE.BEHIND ? BEHIND_SLOTS : f.walk ? WALK_SLOTS : CLIMB_SLOTS
  for (let s = 0; s < slots.length; s++) {
    const ideal = slotPoint(inst, slots[s], lead, inst.ideal)
    if (f.mode === MODE.FACE ? faceHold(inst, arm, ideal) : edgeHold(inst, arm, ideal)) return true
  }
  return false
}
//
// A wanted spot: on the face, FACE_R px round the body off the way it
// goes; else on the edge under the place `lead` px on, `off` px along it
// the way it goes.
//
function slotPoint(inst, off, lead, out) {
  const f = inst.frame
  const bx = inst.carrot.x + f.dx * lead
  const by = inst.carrot.y + f.dy * lead
  if (f.mode === MODE.FACE) {
    const c = Math.cos(off)
    const s = Math.sin(off)
    out.x = bx + (f.dx * c - f.dy * s) * FACE_R
    out.y = by + (f.dx * s + f.dy * c) * FACE_R
    return out
  }
  const tx = -f.ny
  const ty = f.nx
  const ahead = f.dx * tx + f.dy * ty < 0 ? -off : off
  out.x = bx - f.nx * f.h + tx * ahead
  out.y = by - f.ny * f.h + ty * ahead
  return out
}
function edgeHold(inst, arm, ideal) {
  const f = inst.frame
  const n = Nav.gripsNear(inst.nav, ideal.x, ideal.y, GRIP.search, inst.cand, PERF.maxCandidates)
  inst.candCount = n
  inst.stats.queries++
  inst.stats.candidates += n
  let best = null
  let bestCost = Infinity
  for (let i = 0; i < n; i++) {
    const g = inst.cand[i]
    const cost = vecLen(g.x - ideal.x, g.y - ideal.y) + (1 - (g.nx * f.nx + g.ny * f.ny)) * NORMAL_COST
    if (cost >= bestCost || !canHold(inst, arm, g)) continue
    best = g
    bestCost = cost
  }
  if (!best || isSameHold(arm, best.x, best.y)) return false
  clawHold(inst, best, arm.to)
  return true
}
function faceHold(inst, arm, at) {
  const far = vecLen(at.x - arm.sx, at.y - arm.sy)
  if (!Surface.isSoil(at.x, at.y) || Nav.inLakeZone(at.x, at.y) || far > HOLD_REACH || far < ARM_MIN) return false
  if (isTaken(inst, arm, at.x, at.y) || isSameHold(arm, at.x, at.y)) return false
  const dx = at.x - inst.body.x
  const dy = at.y - inst.body.y
  const l = vecLen(dx, dy) || 1
  const h = arm.to
  h.gx = at.x
  h.gy = at.y
  h.ax = dx / l
  h.ay = dy / l
  h.x = at.x - h.ax * inst.hand.palm
  h.y = at.y - h.ay * inst.hand.palm
  h.nx = -h.ay * arm.side
  h.ny = h.ax * arm.side
  return true
}
//
// Whether a hand may hold an edge point: within its limb's reach of the
// shoulder, no other hand's hold there, and (out in the air) the straight
// line from the shoulder to where the wrist would stand clear of soil.
//
function canHold(inst, arm, g) {
  const d = vecLen(g.x - arm.sx, g.y - arm.sy)
  if (d > HOLD_REACH || d < ARM_MIN || isTaken(inst, arm, g.x, g.y)) return false
  if (inst.frame.mode !== MODE.OUT) return true
  const wx = g.x + g.nx * inst.hand.palm
  const wy = g.y + g.ny * inst.hand.palm
  for (let i = 0; i < LINE_CHECKS.length; i++) {
    if (Surface.isSoil(arm.sx + (wx - arm.sx) * LINE_CHECKS[i], arm.sy + (wy - arm.sy) * LINE_CHECKS[i])) return false
  }
  return true
}
function isTaken(inst, arm, x, y) {
  for (let i = 0; i < inst.arms.length; i++) {
    const other = inst.arms[i]
    const h = other === arm ? null : other.state === STATE.ANCHOR ? other.hold : other.state === STATE.REACH ? other.to : null
    if (h && vecLen(h.gx - x, h.gy - y) < GRIP.gap) return true
  }
  return false
}
function isSameHold(arm, x, y) {
  return arm.state === STATE.ANCHOR && vecLen(arm.hold.gx - x, arm.hold.gy - y) < SAME_HOLD
}
//
// A hold on an edge point: the hand points into the soil along the
// surface's normal, its wrist the palm's length out from the point — the
// palm's front on the surface, the fingers in the soil by their own
// length, nothing else of the limb in it.
//
function clawHold(inst, g, h) {
  h.gx = g.x
  h.gy = g.y
  h.nx = g.nx
  h.ny = g.ny
  h.ax = -g.nx
  h.ay = -g.ny
  h.x = g.x + g.nx * inst.hand.palm
  h.y = g.y + g.ny * inst.hand.palm
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
  setState(arm, STATE.ANCHOR)
  holdOn(arm)
}
//
// A reach to arm.to: the hand lets go (if it held), draws back toward its
// shoulder and off its surface, swings out and comes in over the hold —
// arcing higher where the plain path would cross soil; with no clear
// path it does not start. Quicker hunting, its time a little irregular.
//
function startReach(inst, arm) {
  const m = MOOD_CFG[inst.mood]
  const r = arm.reach
  const to = arm.to
  if (!layPath(inst, arm, LIFT) && !layPath(inst, arm, LIFT * HIGH_LIFT)) return false
  r.fx = arm.wx
  r.fy = arm.wy
  r.fax = arm.ax
  r.fay = arm.ay
  r.t = 0
  const dist = vecLen(to.x - r.fx, to.y - r.fy)
  r.dur = Math.max(m.reachTime[0], Math.min(m.reachTime[1], dist / m.reachSpeed)) * (1 + inst.rng() * REACH_JITTER)
  setState(arm, STATE.REACH)
  inst.anchored = countState(inst, STATE.ANCHOR)
  inst.reaching = countState(inst, STATE.REACH)
  return true
}
//
// The reach's curve from where the hand is, with a lift off the surfaces
// at both ends; whether it is clear of soil (out in the air; elsewhere any
// path will do).
//
function layPath(inst, arm, lift) {
  const r = arm.reach
  const to = arm.to
  const held = arm.state === STATE.ANCHOR
  const fnx = held ? arm.hold.nx : -arm.ax
  const fny = held ? arm.hold.ny : -arm.ay
  r.c1x = arm.wx + (arm.sx - arm.wx) * RETRACT + fnx * lift
  r.c1y = arm.wy + (arm.sy - arm.wy) * RETRACT + fny * lift
  r.c2x = to.x + to.nx * lift
  r.c2y = to.y + to.ny * lift
  if (inst.frame.mode !== MODE.OUT) return true
  for (let i = 0; i < PATH_CHECKS.length; i++) {
    const t = PATH_CHECKS[i]
    if (Surface.isSoil(cubic(arm.wx, r.c1x, r.c2x, to.x, t), cubic(arm.wy, r.c1y, r.c2y, to.y, t))) return false
  }
  return true
}
//
// While it stops (roaming, or searching where it heard something), a
// hanging hand now and then stretches out and feels an arc ahead of it
// for a hold.
//
function maybeProbe(inst) {
  if (inst.mood === MOOD.PURSUE || inst.time < inst.probeAt || inst.speed > MOVE_EPS) return
  inst.probeAt = inst.time + PROBE_GAP
  if (inst.rng() > C.explore.probeChance) return
  const arm = freeArm(inst)
  arm && arm.state === STATE.HANG && startProbe(inst, arm)
}
function startProbe(inst, arm) {
  const f = inst.frame
  const center = Math.atan2(f.dy - f.ny * PROBE_TILT, f.dx - f.nx * PROBE_TILT)
  inst.probeSide = -inst.probeSide
  const p = arm.probe
  p.a0 = center - PROBE_ARC * inst.probeSide
  p.a1 = center + PROBE_ARC * inst.probeSide
  p.t = 0
  p.dur = between(inst.rng, C.explore.probeTime)
  arm.tx = arm.wx
  arm.ty = arm.wy
  setState(arm, STATE.PROBE)
}
//
// A free hand's claws: a hold they touch while probing is taken; a
// firefly they touch is snatched.
//
function feel(inst, arm, ctx) {
  if (arm.state === STATE.ANCHOR || arm.state === STATE.REACH) return
  const tip = inst.hand.palm + inst.hand.finger
  const tx = arm.wx + arm.ax * tip
  const ty = arm.wy + arm.ay * tip
  arm.state === STATE.PROBE && inst.frame.mode !== MODE.FACE && touchHold(inst, arm, tx, ty) && startReach(inst, arm)
  for (let i = 0; i < ctx.prey.length; i++) {
    const prey = ctx.prey[i]
    if (arm.snap > 0 || vecLen(prey.x - tx, prey.y - ty) > GRAB_NEAR) continue
    arm.snap = SNAP
    openWide(inst)
    ctx.onEat(prey)
  }
}
function touchHold(inst, arm, x, y) {
  const n = Nav.gripsNear(inst.nav, x, y, PROBE_FEEL, inst.cand, PERF.maxCandidates)
  inst.stats.queries++
  inst.stats.candidates += n
  for (let i = 0; i < n; i++) {
    const g = inst.cand[i]
    if (!canHold(inst, arm, g)) continue
    clawHold(inst, g, arm.to)
    return true
  }
  return false
}
//
// Out of sight by farMargin px or more: it steps fewer times a second.
//
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
// current one: the body, the head (bobbing, the side it faces, its jaw),
// each limb's chain, wrist and hand, its curve laid; which hands show in
// front.
//
function pose(inst, alpha) {
  const p = inst.pose
  p.x = lerp(inst.prev.x, inst.body.x, alpha)
  p.y = lerp(inst.prev.y, inst.body.y, alpha) + Math.sin(inst.time * BOB_HZ * FULL_TURN) * BOB_PX
  p.tilt = lerp(inst.prev.tilt, inst.tilt, alpha)
  p.face = lerp(inst.prev.face, inst.face, alpha)
  p.jaw = inst.mouth * JAW_OPEN
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
    arm.handFront = handInFront(inst, arm)
  }
}
//
// Whether a hand shows in front of the soil: all of them while it is in
// front; behind a platform, the ones that hold (they come round the
// edge) and a reaching one nearly there.
//
function handInFront(inst, arm) {
  if (inst.layer === LAYER.FRONT || arm.state === STATE.ANCHOR) return true
  return arm.state === STATE.REACH && arm.reach.t > REACH_FRONT
}
function lerp(a, b, t) {
  return a + (b - a) * t
}
//
// How much of the line to a sound lies in soil (0 … 1).
//
function occlusion(inst, x, y) {
  let solid = 0
  for (let i = 1; i <= OCCLUDE_SAMPLES; i++) {
    const u = i / (OCCLUDE_SAMPLES + 1)
    Surface.isSoil(inst.body.x + (x - inst.body.x) * u, inst.body.y + (y - inst.body.y) * u) && solid++
  }
  return solid / OCCLUDE_SAMPLES
}
function ease(stat, sample) {
  return stat + (sample - stat) * STAT_EASE
}
