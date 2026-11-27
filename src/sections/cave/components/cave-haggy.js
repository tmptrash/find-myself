import { getRGB, vecLen } from '../../../utils/helper.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { CAVE_CFG } from '../cfg.js'
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
//   Walking it keeps half a limb over the ground; its head keeps out of
//   everything hard and never shrinks: where its way is too tight for it
//   upright (a shaft, a gap between ledges), it turns along the way.
// - Its limbs are rooted at five places on the head: a pair at either
//   side — two at its front, two at its back, whichever way it faces —
//   and one in the middle of its underside, its tail. Each keeps to its
//   own side (the holds of the pair on the side it goes to lie ahead of
//   the head, the other pair's behind it, the tail's under it), so a
//   limb runs out from where it is rooted, not across behind the head.
// - The limbs step: the hand left farthest behind its own place lets go
//   and reaches for a hold on ahead (a curve clear of everything hard,
//   eased with minimum jerk) — or, while its pair's other hand hangs
//   free, that one reaches on and it lets go: a pair's hands take turns.
//   A holding hand keeps on the line from its shoulder to its hold and
//   lets go once that line is cut; free hands hang, or feel about.
// - A limb is a chain of points, no physics of its own: holding, it runs
//   straight from the hold to the head; free, each point follows the next
//   one toward the hand (the hand leads as a head does); caught behind
//   something, it is drawn in from the shoulder and the hand comes after.
//   No point of it goes into anything hard.
// - It is blind and senses by touch — and by the tremor of what runs
//   near it on the rock (a runner: prey told as `tremor`): that it feels
//   from afar and creeps toward, to where it last felt it run. What it
//   can eat — the hero, a
//   runner — it catches with a hand: whatever its claws touch it seizes
//   (the level makes the prey gone and draws it in the hand: ctx.onSeize,
//   ctx.onBite, onDraw's drawHeld). Touched by a limb or by the head, the
//   prey is only felt: a free hand strikes at it at once — on a floor, a
//   wall or a ceiling alike — and it stalks to where that was, creeping
//   there low and slow, its mouth a little open.
// - A meal: the hand brings the prey before its mouth (round whatever lies
//   between, drawn in along its own limb) and holds it there; only then
//   it eats — pushes it into its gaping mouth, bites slowly through,
//   chews what it took off, swallows, pauses, and again, a few times
//   over (the level hears its jaws: ctx.onJaws). While it eats it minds
//   nothing else, whatever touches it.
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
const PERF = C.perf
const HEAD = ANAT.head
const AVOID = SENSE.avoid
const EAT = SENSE.eat
const MOOD = { EXPLORE: 'explore', STALK: 'stalk', INVESTIGATE: 'investigate' }
const MOOD_CFG = { [MOOD.EXPLORE]: C.explore, [MOOD.STALK]: C.stalk, [MOOD.INVESTIGATE]: C.explore }
const STATE = { HOLD: 'hold', REACH: 'reach', FREE: 'free', CARRY: 'carry' }
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
// time, BODY_PUSH times a step. Walking, the ground under it is looked
// for every GROUND_STEP px.
//
const HEAD_POINTS = 24
const HEAD_PAD = 2
const HEAD_COS = Float64Array.from({ length: HEAD_POINTS }, (_, i) => Math.cos(i / HEAD_POINTS * Math.PI * 2))
const HEAD_SIN = Float64Array.from({ length: HEAD_POINTS }, (_, i) => Math.sin(i / HEAD_POINTS * Math.PI * 2))
const BODY_PUSH = 10
const GROUND_STEP = 6
//
// Travel: it rests REST..+REST_RANGE s at a way's end; its place on the
// way goes on in full while a hold lies AHEAD_FULL of the mood's lead
// ahead of the head (slower the nearer the foremost hold) and the head
// is within LAG_FULL of the lead of it; under MOVE_EPS px/s it stands.
// Free to go but under STUCK_SHARE of its speed for STUCK s, it gives
// that way up. It goes on only once turned within TURNED of the way it
// faces. It never stays in one place: its head not STILL_R px from where
// it was for STILL_TIME s (not eating), it wanders off — some way picked
// at random, keeping clear of what it was making for, deaf to tremors
// for a while (tremor.lost s).
//
const START_SPOT = { x: 620, y: 470 }
const REST = 2
const REST_RANGE = 4
const AHEAD_FULL = 0.6
const LAG_FULL = 0.5
const MOVE_EPS = 2
const STUCK = 3
const STUCK_SHARE = 0.1
const STILL_R = 30
const STILL_TIME = 9
const GLANCE_TIME = 1.1
const GLANCE_EVERY = 3.5
const GLANCE_MIN_DX = 24
const TURNED = 0.3
//
// Hands. Its fingers curl to CURL_GRIP on a hold, open to CURL_OPEN on a
// reach, hang at CURL_FREE (eased at CURL_RATE per s). A reach's curve
// draws back RETRACT of the way to the shoulder and LIFT px off the
// surface it leaves (HIGH_LIFT times higher where that is not clear,
// checked at PATH_CHECKS); it is eased with minimum jerk (MIN_JERK_A, _B,
// _C: 10t³ − 15t⁴ + 6t⁵), its time varying by REACH_JITTER; a free hand's
// speed (CARRY_MAX px/s at most; it is kept up to HAND_SPEED_MAX) carries
// on into it. A free hand follows its place as a spring of FOLLOW_W
// rad/s that never speeds it up or slows it down by more than HAND_ACCEL
// px/s² nor takes it faster than FREE_SPEED px/s (its place may jump —
// the hand never does, and a hand let go far off drifts to where it
// hangs, it does not whip there through its own shoulder), hanging HANG_SHARE
// of a limb under its shoulder (HANG_OUT of its root's way off the
// head's middle farther out) or, walking, held FREE_R px out to its own
// side — the tail's hangs on — (FREE_UP of that up); it goes over from one to
// the other at WALK_RATE per s; its place is the last clear one on the
// way from its shoulder (looked for every TARGET_STEP px, then halved
// TARGET_HALVINGS times). A free limb caught behind something stays so
// for DRAG_HOLD s at least. A free hand lies the way its limb runs up to
// it (read over HAND_BASE pieces), eased at AXIS_EASE per s. A straight
// way is checked every LINE_STEP px, its sides every LINE_WIDE-th check.
// A hand that found no hold tries again after RETRY s. A holding hand
// turns about its claws HOLD_TURN rad/s at most. No hand is ever turned
// more than HAND_BEND either way from the way its limb's end runs (it
// never folds back in on its limb): the limb gives, the hand turns
// smoothly — a moving hand's limb comes out of its wrist straight along
// the hand, a holding or dragged one's end bends to within HAND_BEND of
// it. A reach comes in on its hold along the hand's own way, LAND_OFF
// of its lift off the surface.
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
const FOLLOW_W = 10
const HAND_ACCEL = 3000
const FREE_SPEED = 400
const WALK_RATE = 4
const HANG_SHARE = 0.55
const HANG_OUT = 0.6
const FREE_R = 84
const FREE_UP = 0.8
const TARGET_STEP = 6
const TARGET_HALVINGS = 3
const DRAG_HOLD = 0.3
const AXIS_EASE = 8
const HAND_BASE = 2
const LINE_STEP = 8
const LINE_WIDE = 2
const RETRY = 0.4
const HOLD_TURN = 5
const HAND_BEND = Math.PI / 4
const LAND_OFF = 0.5
//
// Holds are tried at LEAD_SHARES of the mood's lead on along the way
// from the limb's own place (anatomy.keep px to its side of the head,
// as far as the way runs level: ahead for the pair on the side it goes
// to, behind for the other), then
// round the edges of the way's next NODES_AHEAD nodes (a ceiling it is
// about to climb onto, a floor it lets itself down to). A hold is
// stepped on from once it lags the stride behind that place — or is
// stretched past STRETCH of the limb and lags at all, or lies within
// CRAMPED px of its shoulder, wherever (a limb crumpled up against the
// head, its hand folded on it); one within TOO_NEAR px is let go at
// once. A limb runs out from its root: it takes no hold whose straight
// way from the root lies more than BEHIND_TAKE px behind the head (in
// its ellipse), and steps on from one once BEHIND_MOST px of it do (the
// head has come over the hold) — but stuck for LOOSE_AFTER s it takes
// any hold it can: it never stands still for its looks.
//
const LEAD_SHARES = [1, 0.6, 1.4, 0.2]
const BEHIND_TAKE = 20
const BEHIND_MOST = 28
const LOOSE_AFTER = 0.6
const NODES_AHEAD = 3
const STRETCH = 0.9
const CRAMPED = 34
const TOO_NEAR = 20
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
// tilt a spring of TILT_W rad/s. Its mouth opens to a random share of
// JAW_OPEN rad every MOUTH_GAP..+RANGE s, wide when it snatches a
// firefly (eased at MOUTH_RATE); stalking it is held STALK_MOUTH open;
// eating it gapes and snaps shut at BITE_RATE. Stalking, the head comes
// down toward the surface it creeps on (stalk.crouch px), eased at
// CROUCH_RATE per s.
//
const BOB_PX = 2
const BOB_HZ = 0.5
const FACE_SPEED = 6
const MOVE_RATE = 3
const TILT_W = 6
const JAW_OPEN = 0.17
const MOUTH_GAP = 0.8
const MOUTH_RANGE = 2.4
const MOUTH_REST = 0.45
const STALK_MOUTH = 0.3
const BITE_RATE = 18
const CROUCH_RATE = 2
const MOUTH_RATE = 5
const MOUTH_WIDE = 1
const MOUTH_WIDE_HOLD = 0.6
//
// Touch. Up to MAX_BEINGS living things are told to it (how fast each
// moves is followed from frame to frame, eased at SPEED_EASE per s); its
// part nearest a thing is looked for at every NEAR_EVERY-th point of its
// limbs.
// Prey within touch.reach px of a hand — its palm and fingers, from the
// wrist to HAND_SPAN of the way to the claws' tips — is caught; within
// the limb's radius of a limb's chain, or touching the head (or a hand
// that cannot let go of its hold), it is only felt. Felt prey is struck
// at with a free hand at once, wherever it is — on a floor, a wall, a
// ceiling — if it is within STRIKE_REACH of a limb from that hand's
// shoulder and a straight way to it is clear: a reach STRIKE_TIME s long
// for where the prey will be by then, its claws going STRIKE_PAST px
// past it; then the hand hangs free again, and the next strike comes
// STRIKE_GAP s later at the soonest. Stalking, it strikes so at the
// place it last felt its prey.
// Tremor. Prey that shakes the rock as it runs (a runner) is felt from
// tremor.reach px off the head while it moves tremor.speed px/s or
// faster — standing still it gives nothing away: the nearest such one is
// noted as touched prey is, and it stalks to where that one last ran
// (felt anew at every plan while it keeps running). Prey it has touched
// counts for more: a stalk after a touch is not led away by a tremor.
// The one it stalks by its tremor it keeps to while that one runs within
// reach (it does not turn to and fro between two). Fed, it minds no
// tremor for tremor.sated s after its meal (nor a runner that touches
// it) — but it still knows where the running is: whatever it does
// (short of eating), it turns its head to the side a tremor comes from
// (one GLANCE_MIN_DX px or more to that side) for GLANCE_TIME s — going
// on its way meanwhile, looking back over its shoulder if need be — then
// faces its way again; the next such turn GLANCE_EVERY s later at the
// soonest; having lost one — its way
// there cut off, or nothing found where it ran — none for tremor.lost s,
// and it wanders off some other way.
// A meal: the prey sits HOLD_AT of the fingers' length out from the
// palm. The hand brings it to the mouth, its fingers turned toward the
// mouth (CARRY_TURN rad/s): the prey's far end — its `ahead` px on
// from the grip, less with every bite — to the mouth's front, from one
// of the ways in APPROACH ([ahead, down] in the head's own frame); drawn
// in along its own limb first while something hard lies between (as a
// caught limb is). There the hand is pressed to the mouth and keeps
// still (the head's bob stills too, at STILL_RATE per s). Only there it
// eats, one PHASE after another, eat.bites times over: its mouth gapes
// (to MOUTH_GAPE) while the hand pushes the prey's end eat.deep px into
// it (eat.gape s); its jaws close on it slowly (eat.bite s — the bite is
// heard all that while); what they took off stays in the mouth and is
// chewed (eat.chew s: the jaw working between CHEW_SHUT and CHEW_OPEN at
// CHEW_HZ, each chew heard CHEW_LOUD as loud), the hand drawn eat.back
// px back with what is left; swallowed, a pause (eat.pause s), mouth
// shut. A runner kicks until its first bite, then goes still over
// KICK_FADE s.
//
const MAX_BEINGS = 48
const SPEED_EASE = 12
const NEAR_EVERY = 2
const HAND_SPAN = 0.8
const STRIKE_REACH = 0.9
const STRIKE_TIME = 0.2
const STRIKE_PAST = 8
const STRIKE_GAP = 0.6
const HOLD_AT = 0.45
const PHASE = { GAPE: 0, BITE: 1, CHEW: 2, PAUSE: 3 }
const MOUTH_GAPE = 1.5
const CHEW_OPEN = 0.6
const CHEW_SHUT = 0.08
const CHEW_HZ = 1.2
const CHEW_LOUD = 0.45
const STILL_RATE = 4
const CARRY_TURN = 7
const APPROACH = [[1, 0], [Math.SQRT1_2, Math.SQRT1_2], [0, 1]]
const KICK_FADE = 0.5
//
// It is drawn while within CULL_PAD px of the view; at most MAX_STEPS
// steps run per frame. A limb's inner points settle onto the chain's as
// drawn as a spring of DRAW_W rad/s (one SNAP_FAR px off is put right
// there). The drawn curve keeps CURVE_CLEAR px out of anything hard
// (moved CURVE_TRIES px at most), but for its last CURVE_HAND points at
// the hand.
//
const CULL_PAD = REACH_MAX + 80
const MAX_STEPS = 4
const DRAW_W = 60
const SNAP_FAR = 200
const CURVE_CLEAR = 5
const CURVE_TRIES = 28
const CURVE_HAND = 2
const HALF = 0.5
const DEG = 180 / Math.PI
const FULL_TURN = Math.PI * 2
const QUARTER = Math.PI / 2
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
 * @param {{x: number, y: number}} [cfg.at] - Where it starts (the hold nearest that point; its usual start spot when left out)
 * @returns {Object} Climber instance
 */
export function create(cfg) {
  const { k } = cfg
  Look.bake(k)
  const nav = Nav.get()
  const rng = createSeededRandom(cfg.seed)
  const at = cfg.at ?? START_SPOT
  const start = Nav.nearestNode(nav, at.x, at.y, -1)
  const inst = {
    k,
    rng,
    nav,
    hand: Look.handMeasures(CURL_GRIP),
    view: null,
    beings: null,
    mood: MOOD.EXPLORE,
    ctx: null,
    beingX: new Float32Array(MAX_BEINGS),
    beingY: new Float32Array(MAX_BEINGS),
    beingVx: new Float32Array(MAX_BEINGS),
    beingVy: new Float32Array(MAX_BEINGS),
    beingSeen: new Uint8Array(MAX_BEINGS),
    target: { x: 0, y: 0, at: -Infinity, touched: false, being: -1 },
    meal: { arm: null, prey: null, t: 0, bites: 0, phase: PHASE.GAPE, left: 0, chews: 0, biting: false, done: false, kick: 0, way: 0, turned: false },
    heldDraw: null,
    strikeAt: 0,
    still: 0,
    crouch: 0,
    lookIn: TURN.lookEvery[1],
    glanceFor: 0,
    glanceIn: 0,
    glanceSide: 1,
    avoid: { x: 0, y: 0, r: 0, cost: AVOID.cost, until: 0 },
    waterAt: -Infinity,
    deafUntil: 0,
    fedUntil: 0,
    standAt: null,
    stillAt: { x: 0, y: 0 },
    stillFor: 0,
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
    walkShare: 0,
    mouth: 0,
    mouthWant: 0,
    mouthIn: MOUTH_GAP,
    arms: Array.from({ length: ANAT.shoulders.length }, (_, i) => createArm(i, rng)),
    cand: [],
    ideal: { x: 0, y: 0 },
    aim: { x: 0, y: 0, ax: 0, ay: 1 },
    pose: { x: 0, y: 0, tilt: 0, face: -1, want: -1, jaw: 0 },
    visible: false,
    strip: { arm: null, q: null, band: null },
    v: k.vec2(0, 0),
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
 * @param {Array<{x: number, y: number}>} ctx.prey - Small prey its claws may snatch (the fireflies)
 * @param {Function} ctx.onEat - Called with a small prey it snatched
 * @param {Array<{x: number, y: number, r: number, live: boolean, prey: Object|null}>} ctx.beings - The living things about (their bodies' middles and radii; live: about right now; prey: what the level knows it by — its `ahead`: how far it reaches on from where it is gripped, px; `mouthful`: small enough to be pushed into the mouth; `tremor`: its running shakes the rock, felt from afar — null for what it cannot eat): what it may touch
 * @param {(x: number, y: number) => void} [ctx.onGrip] - A hand has taken a hold there (to be heard)
 * @param {(prey: Object) => void} ctx.onSeize - A hand has caught this prey: it is the climber's now (gone from the world, drawn in the hand)
 * @param {(prey: Object, strength: number, x: number, y: number) => void} ctx.onJaws - Its jaws work on its prey there: 1 as they start to close for a bite (the bite takes eat.bite s), less for a chew
 * @param {(prey: Object, bites: number, x: number, y: number) => boolean} ctx.onBite - Its jaws have closed: it has bitten its prey through (for the bites-th time, at that world point); false once nothing is left of it
 * @param {(prey: Object, x: number, y: number) => void} ctx.onDrop - It could not bring its prey to its mouth and let it drop there
 */
export function onUpdate(inst, ctx) {
  if (!inst.path[0]) return
  const dt = inst.k.dt()
  inst.view = ctx.view
  inst.beings = ctx.beings
  inst.ctx = ctx
  trackBeings(inst, dt)
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
  inst.visible && pose(inst, inst.simAcc / step, dt)
}

/**
 * Draws the climber: its limbs with their buttons, its hands, its head,
 * the prey a hand holds and that hand over it (its fingers round the
 * prey). A mouthful (prey.mouthful: a runner) is drawn inside the mouth —
 * over the head, under the lower jaw: what the jaws took off it, being
 * chewed, and what the hand holds of it; other prey (the hero) in front
 * of the whole head.
 * @param {Object} inst - Climber instance
 * @param {(prey: Object, at: {x: number, y: number}, angle: number, bites: number, kick: number, chew: number, claws: Array<Array<number>>|null) => void} drawHeld - Draws the prey: at that world point, turned `angle` degrees (the hand's turn), after so many bites, kicking that hard (0 … 1); chew below 0: what is left of it in the hand, `claws` the fingers closed on it (a line each: its points' world x, y in turn); 0 … 1: the piece the last bite took, so far chewed
 */
export function onDraw(inst, drawHeld) {
  if (!inst.visible) return
  const meal = inst.meal
  inst.heldDraw = drawHeld
  for (let i = 0; i < inst.arms.length; i++) Look.drawArm(inst, inst.arms[i])
  for (let i = 0; i < inst.arms.length; i++) Look.drawButtons(inst, inst.arms[i])
  for (let i = 0; i < inst.arms.length; i++) inst.arms[i] === meal.arm || Look.drawHand(inst, inst.arms[i])
  Look.drawHead(inst, meal.arm && meal.prey.mouthful ? drawMeal : null)
  if (!meal.arm) return
  meal.prey.mouthful || drawMeal(inst)
  Look.drawHand(inst, meal.arm)
}

/**
 * The climber's part nearest a point — its head or a point along one of
 * its limbs (what a small thing about fears, as it fears the hero).
 * @param {Object} inst - Climber instance
 * @param {{x: number, y: number}} to - World point
 * @param {{x: number, y: number}} out - Written: that part's place
 * @returns {{x: number, y: number}} out
 */
export function nearestTo(inst, to, out) {
  out.x = inst.body.x
  out.y = inst.body.y
  let best = vecLen(to.x - out.x, to.y - out.y)
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    for (let j = NEAR_EVERY; j <= SEGS; j += NEAR_EVERY) {
      const d = vecLen(to.x - arm.x[j], to.y - arm.y[j])
      if (d >= best) continue
      best = d
      out.x = arm.x[j]
      out.y = arm.y[j]
    }
  }
  return out
}
//
// A limb: its state and the time in it, when it took its hold; the side
// of the head it is rooted on (-1 left, 1 right, the tail 0) and its own
// place there (keep: px to that side of the head); its
// shoulder and wrist, the way its hand points and how fast it goes; its
// chain's points (x, y), at the last step's end (rx, ry: for drawing
// between steps) and as drawn (nx, ny; gx, gy with their speeds: the
// spring they settle by); whether it is caught behind
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
    keep: ANAT.keep[i],
    side: Math.sign(ANAT.keep[i]),
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
    gx: new Float32Array(SEGS + 1),
    gy: new Float32Array(SEGS + 1),
    gvx: new Float32Array(SEGS + 1),
    gvy: new Float32Array(SEGS + 1),
    drag: false,
    dragFor: 0,
    strike: false,
    seg: REACH_MAX / SEGS,
    swell: 1,
    p: { wx: 0, wy: 0, ax: 0, ay: 1 },
    d: { wx: 0, wy: 0, ax: 0, ay: 1 },
    hold: newHold(),
    to: newHold(),
    reach: { fx: 0, fy: 0, fax: 0, fay: 1, vx: 0, vy: 0, c1x: 0, c1y: 0, c2x: 0, c2y: 0, turn: 0, t: 0, dur: 1 },
    probe: { on: false, a0: 0, a1: 0, t: 0, dur: 1 },
    probeAt: 0,
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
// limbs, its tilt and mouth, what it touches.
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
  senseTouch(inst)
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
// Its mood: a stalk whose prey was not felt again for `memory` s ends
// where it is (it feels about there); having felt about and found
// nothing it wanders off. Stalking it crouches, else it rises again. And
// it never stays put (see STILL_TIME).
//
function updateMood(inst, dt) {
  inst.crouch += ((inst.mood === MOOD.STALK ? 1 : 0) - inst.crouch) * Math.min(1, CROUCH_RATE * dt)
  watchStill(inst, dt)
  if (inst.mood === MOOD.STALK && inst.time - inst.target.at > SENSE.memory) return arrive(inst)
  inst.mood === MOOD.INVESTIGATE && inst.restFor <= 0 && wanderOff(inst)
}
//
// How long its head has kept within STILL_R px of one spot (not while it
// eats); STILL_TIME s of that and it wanders off.
//
function watchStill(inst, dt) {
  const at = inst.stillAt
  const moved = vecLen(inst.body.x - at.x, inst.body.y - at.y) > STILL_R
  if (moved || inst.meal.arm) {
    at.x = inst.body.x
    at.y = inst.body.y
    inst.stillFor = 0
    return
  }
  inst.stillFor += dt
  inst.stillFor > STILL_TIME && wanderOff(inst)
}
//
// It leaves where it is, whatever it was after: roaming again, some way
// picked at random — clear of what lay ahead of it — at once (no rest, no
// pause), minding no tremor for tremor.lost s.
//
function wanderOff(inst) {
  const lead = C.explore.lead
  inst.mood = MOOD.EXPLORE
  inst.deafUntil = Math.max(inst.deafUntil, inst.time + SENSE.tremor.lost)
  inst.target.being = -1
  shun(inst, inst.body.x + inst.frame.dx * lead, inst.body.y + inst.frame.dy * lead)
  inst.restFor = 0
  inst.pauseFor = 0
  inst.stuckFor = 0
  inst.stillFor = 0
  inst.wantWay = true
}
//
// The way it faces: the side its way runs to (once it has run that way
// for faceHold s); resting or paused it looks about, to one side and the
// other, every turning.lookEvery s — but not with prey in its hand: it
// eats facing the way it did; and for a while after it felt something
// run, the side that came from (see GLANCE_TIME). It turns round in
// turnTime s.
//
function updateFacing(inst, dt) {
  const f = inst.frame
  inst.faceSide = f.dx > TURN.faceDx ? 1 : f.dx < -TURN.faceDx ? -1 : inst.faceSide
  if (inst.meal.arm) inst.faceFor = 0
  else if (inst.glanceFor > 0) glance(inst, dt)
  else if (inst.restFor > 0 || inst.pauseFor > 0) lookAbout(inst, dt)
  else leadFace(inst, dt)
  const step = 2 * dt / TURN.turnTime
  inst.face += Math.max(-step, Math.min(step, inst.faceWant - inst.face))
}
function glance(inst, dt) {
  inst.glanceFor -= dt
  inst.faceFor = 0
  inst.faceWant = inst.glanceFor > 0 ? inst.glanceSide : inst.faceSide
}
function leadFace(inst, dt) {
  inst.faceFor = inst.faceSide !== inst.faceWant ? inst.faceFor + dt : 0
  if (inst.faceFor < TURN.faceHold) return
  inst.faceWant = inst.faceSide
  inst.faceFor = 0
}
function lookAbout(inst, dt) {
  inst.faceFor = 0
  inst.lookIn -= dt
  if (inst.lookIn > 0) return
  inst.lookIn = between(inst.rng, TURN.lookEvery)
  inst.faceWant = -inst.faceWant
}
//
// Its place on the way: resting, it waits (then wants a new way); roaming
// it pauses now and then; else it goes on at the mood's speed times its
// support (see supportShare), eased — so it slows down and starts again
// smoothly, never at a jump. Free to go but not going for STUCK s, it
// gives the way up. (It goes on while it only glances aside at a tremor.)
//
function updateTravel(inst, dt) {
  const m = MOOD_CFG[inst.mood]
  if (inst.restFor > 0) {
    inst.restFor -= dt
    inst.restFor <= 0 && (inst.wantWay = true)
  }
  updatePause(inst, dt)
  const turned = inst.glanceFor > 0 || (inst.faceSide === inst.faceWant && Math.abs(inst.faceWant - inst.face) < TURNED)
  const free = inst.restFor <= 0 && inst.pauseFor <= 0 && turned && !inst.meal.arm
  const share = free ? supportShare(inst, m) : 0
  inst.stuckFor = free && share < STUCK_SHARE ? inst.stuckFor + dt : 0
  inst.stuckFor > STUCK && giveUp(inst)
  inst.speed += (m.speed * share - inst.speed) * Math.min(1, m.accel * dt)
  inst.speed > MOVE_EPS && advance(inst, inst.speed * dt)
  placeFrame(inst)
  inst.walkShare += ((inst.frame.walk ? 1 : 0) - inst.walkShare) * Math.min(1, WALK_RATE * dt)
}
//
// How freely it may go on (0 … 1): by how far ahead of the head, the way
// it goes, its foremost hold lies (walking, none ahead: it stays where
// its hands are — it never walks out past them, over water or off an
// edge) — or, hanging, by how much reach its two nearest holds have left
// (it lets itself down on its limbs) — and by how near the head has kept
// to where it makes for: its place on the way, at the height it stands
// at there (walking over a rise the head is held up off the way's line —
// that is not lagging behind).
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
  const lag = 1 - vecLen(inst.carrot.x - b.x, (inst.standAt ?? inst.carrot.y) - b.y) / m.lead
  return Math.max(0, Math.min(1, spare / (m.lead * AHEAD_FULL), lag / LAG_FULL))
}
//
// A way it cannot go on along: after prey it has touched, it gives the
// chase up there (and feels about); after a tremor, it wanders off;
// roaming, it keeps clear of what lies ahead for a while and takes
// another way.
//
function giveUp(inst) {
  inst.stuckFor = 0
  if (inst.mood === MOOD.STALK) return inst.target.touched ? arrive(inst) : wanderOff(inst)
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
  const hunted = inst.mood === MOOD.STALK
  inst.mood = hunted ? MOOD.INVESTIGATE : MOOD.EXPLORE
  inst.restFor = hunted ? SENSE.investigate : REST + inst.rng() * REST_RANGE
  hunted && (inst.deafUntil = Math.max(inst.deafUntil, inst.time + SENSE.investigate))
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
  inst.carrot.x -= f.nx * C.stalk.crouch * inst.crouch
  inst.carrot.y -= f.ny * C.stalk.crouch * inst.crouch
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
  const hunting = inst.mood === MOOD.STALK
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
// than body.minWalk of a limb — then keeps out of anything hard.
//
function moveBody(inst, dt) {
  const b = inst.body
  const v = inst.vel
  const w = MOOD_CFG[inst.mood].follow
  const e = Math.exp(-w * dt)
  inst.standAt = standY(inst)
  const dx = b.x - inst.carrot.x
  const dy = b.y - inst.standAt
  const kx = v.x + w * dx
  const ky = v.y + w * dy
  b.x += (dx + kx * dt) * e - dx
  b.y += (dy + ky * dt) * e - dy
  v.x = (v.x - w * kx * dt) * e
  v.y = (v.y - w * ky * dt) * e
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
  const least = REACH_MAX * C.body.minWalk - C.stalk.crouch * inst.crouch
  const x = Math.round(inst.body.x) | 0
  for (let d = HEAD.ry; d < least; d += GROUND_STEP) {
    if (isHard(x, Math.round(y + d) | 0)) return y + d - least
  }
  return y
}
//
// Whether the head touches anything hard; the way off what it touches is
// written into SPOT.
//
function headTouch(inst) {
  const b = inst.body
  const c = Math.cos(inst.tilt)
  const s = Math.sin(inst.tilt)
  const rx = HEAD.rx + HEAD_PAD
  const ry = HEAD.ry + HEAD_PAD
  let gx = 0
  let gy = 0
  let hit = false
  for (let i = 0; i < HEAD_POINTS; i++) {
    const px = HEAD_COS[i] * rx * c - HEAD_SIN[i] * ry * s
    const py = HEAD_COS[i] * rx * s + HEAD_SIN[i] * ry * c
    if (!isHard(Math.round(b.x + px) | 0, Math.round(b.y + py) | 0)) continue
    hit = true
    gx -= px
    gy -= py
  }
  const g = vecLen(gx, gy) || 1
  SPOT[OUT_X] = gx / g
  SPOT[OUT_Y] = gy / g
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
    } else if (!headTouch(inst)) return
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
// takes it — held, swung on its reach, carrying its prey to the mouth, or
// free (caught behind something: dragged after its limb); its chain
// between them; how fast the hand went; a free hand — or a caught one —
// turned to lie along its limb; its fingers (shut on a hold, on prey, on
// a snatch).
//
function moveArm(inst, arm, dt) {
  const px = arm.wx
  const py = arm.wy
  arm.stateT += dt
  arm.snap = Math.max(0, arm.snap - dt)
  shoulderOf(inst, arm)
  markDrag(arm, dt)
  if (arm.state === STATE.HOLD) holdOn(inst, arm, dt)
  else if (arm.state === STATE.REACH) swing(inst, arm, dt)
  else if (arm.state === STATE.CARRY) carryPrey(inst, arm, px, py, dt)
  else arm.drag || freeHand(inst, arm, px, py, dt)
  flex(arm, dt)
  arm.drag && dragHand(arm)
  const v = vecLen(arm.wx - px, arm.wy - py) / dt
  const k = v > HAND_SPEED_MAX ? HAND_SPEED_MAX / v : 1
  arm.vx = (arm.wx - px) / dt * k
  arm.vy = (arm.wy - py) / dt * k
  arm.state === STATE.FREE || arm.drag ? pointHand(arm, dt) : null
  const curl = arm.state === STATE.HOLD || arm.state === STATE.CARRY || arm.snap > 0 ? CURL_GRIP : arm.state === STATE.REACH ? CURL_OPEN : CURL_FREE
  arm.curl += (curl - arm.curl) * Math.min(1, CURL_RATE * dt)
}
//
// Whether a free limb (or one carrying prey) is caught behind something:
// something hard on the straight line from its shoulder to its hand. Caught, it stays so for
// DRAG_HOLD s at least and until that way is clear by the limb's whole
// thickness (so it does not flicker between dragged and free at a
// ledge's edge). As it is caught its pieces take the length the chain
// lies at (round a corner it lies longer than the straight way it was
// measured by: drawn in to that at once, its hand would jump).
//
function markDrag(arm, dt) {
  if (arm.state !== STATE.FREE && arm.state !== STATE.CARRY) {
    arm.drag = false
    return
  }
  if (!isWayClear(arm.sx, arm.sy, arm.wx, arm.wy, 0)) {
    arm.drag || (arm.seg = lengthOf(arm) / SEGS)
    arm.drag = true
    arm.dragFor = 0
    return
  }
  arm.dragFor += dt
  arm.drag = arm.drag && (arm.dragFor < DRAG_HOLD || !isWayClear(arm.sx, arm.sy, arm.wx, arm.wy, LIMB.radius))
}
//
// Where its shoulder is: its root on the head, tilted with it (the roots
// lie alike either side, so they stay where they are as the head turns
// round: the pair on the side it faces is its front one).
//
function shoulderOf(inst, arm) {
  const at = ANAT.shoulders[arm.i]
  const c = Math.cos(inst.tilt)
  const s = Math.sin(inst.tilt)
  arm.sx = inst.body.x + at[0] * c - at[1] * s
  arm.sy = inst.body.y + at[0] * s + at[1] * c
}
//
// A holding hand: its claws stay on their spot; the hand turns about them
// with the head — toward the line from its shoulder to the hold, the
// limb's own line, HOLD_TURN rad/s at most (it never flips as the
// shoulder passes close by) — while its wrist stays out of anything hard
// that way.
//
function holdOn(inst, arm, dt) {
  const h = arm.hold
  aimHand(arm, h.gx, h.gy, inst.hand.palm, inst.aim)
  const most = HOLD_TURN * dt
  const turn = Math.max(-most, Math.min(most, Math.atan2(h.ax * inst.aim.ay - h.ay * inst.aim.ax, h.ax * inst.aim.ax + h.ay * inst.aim.ay)))
  const ax = h.ax * Math.cos(turn) - h.ay * Math.sin(turn)
  const ay = h.ax * Math.sin(turn) + h.ay * Math.cos(turn)
  if (isWristClear(h.gx - ax * inst.hand.palm, h.gy - ay * inst.hand.palm)) {
    h.ax = ax
    h.ay = ay
    h.x = h.gx - ax * inst.hand.palm
    h.y = h.gy - ay * inst.hand.palm
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
// off with dying away over the reach), turning to the hold's way (aimed
// from where the shoulder is now) the way round it set off — the shorter
// one then; kept to, so the hand never swaps sides half-way as the
// shoulder moves (r.turn: the whole turn, carried from step to step);
// there, it takes hold — or, out of reach now, it missed; a strike takes
// no hold: the hand hangs free again.
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
  const shorter = Math.atan2(r.fax * to.ay - r.fay * to.ax, r.fax * to.ax + r.fay * to.ay)
  r.turn = shorter + Math.round((r.turn - shorter) / FULL_TURN) * FULL_TURN
  arm.ax = r.fax * Math.cos(r.turn * e) - r.fay * Math.sin(r.turn * e)
  arm.ay = r.fax * Math.sin(r.turn * e) + r.fay * Math.cos(r.turn * e)
  if (r.t < 1) return
  if (arm.strike || vecLen(to.x - arm.sx, to.y - arm.sy) > REACH_MAX * ANCHOR_SLACK) return release(arm)
  anchorAt(inst, arm, to)
  inst.lastLand = inst.time
  inst.ctx?.onGrip?.(to.x, to.y)
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
// critically damped spring whose pull is kept under HAND_ACCEL and its
// speed under FREE_SPEED (it never changes speed at a jump, however far
// its place has just moved), never past its limb's length nor into
// anything hard.
//
function freeHand(inst, arm, px, py, dt) {
  const spot = inst.ideal
  arm.probe.on ? probeSpot(arm, dt, spot) : hangPose(inst, arm, spot)
  freeSpot(arm, spot)
  followSpot(arm, spot, px, py, dt)
}
function followSpot(arm, spot, px, py, dt) {
  const pull = FOLLOW_W * FOLLOW_W
  const ax = pull * (spot.x - px) - 2 * FOLLOW_W * arm.vx
  const ay = pull * (spot.y - py) - 2 * FOLLOW_W * arm.vy
  const a = vecLen(ax, ay)
  const k = a > HAND_ACCEL ? HAND_ACCEL / a : 1
  arm.vx += ax * k * dt
  arm.vy += ay * k * dt
  const v = vecLen(arm.vx, arm.vy)
  if (v > FREE_SPEED) {
    arm.vx *= FREE_SPEED / v
    arm.vy *= FREE_SPEED / v
  }
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
// Where a free hand hangs: loose under its shoulder (a little farther
// out from the head's middle), or — the walker's — held up out to its
// own side (the tail's hangs on); between the two by how long it has
// walked (walkShare: the way's tops and sides change fast round a small
// ledge, the hands' place does not).
//
function hangPose(inst, arm, out) {
  const w = inst.walkShare * Math.abs(arm.side)
  out.x = arm.sx + lerp((arm.sx - inst.body.x) * HANG_OUT, arm.side * FREE_R, w)
  out.y = arm.sy + lerp(REACH_MAX * HANG_SHARE, -FREE_UP * FREE_R, w)
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
// radius of it): the last clear point on the straight way from its
// shoulder toward the spot (looked for every TARGET_STEP px, then halved
// TARGET_HALVINGS times) — it stops before the first thing in its way,
// so the spot slides along what the hand cannot pass as the head moves
// and never hops to the far side of a small ledge and back.
//
function freeSpot(arm, spot) {
  const dx = spot.x - arm.sx
  const dy = spot.y - arm.sy
  const steps = Math.ceil((vecLen(dx, dy) || 1) / TARGET_STEP)
  let clear = 0
  let blocked = 1
  for (let i = 1; i <= steps && blocked === 1; i++) {
    if (isOpen(Math.round(arm.sx + dx * i / steps) | 0, Math.round(arm.sy + dy * i / steps) | 0, LIMB.radius)) clear = i / steps
    else blocked = i / steps
  }
  for (let n = 0; n < TARGET_HALVINGS && clear < 1 && blocked > clear; n++) {
    const mid = (clear + blocked) * HALF
    if (isOpen(Math.round(arm.sx + dx * mid) | 0, Math.round(arm.sy + dy * mid) | 0, LIMB.radius)) clear = mid
    else blocked = mid
  }
  spot.x = arm.sx + dx * clear
  spot.y = arm.sy + dy * clear
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
// A free hand lies along its limb: it turns (eased) to the way the limb
// runs up to its last piece — that piece lies along the hand itself
// (stiffEnd), so it is read from the HAND_BASE pieces before it; a
// dragged hand's, to the way the chain's end lies. Never to the way it
// moves: a hand drawn back toward its shoulder would turn in on its limb.
//
function pointHand(arm, dt) {
  const to = arm.drag ? SEGS : SEGS - 1
  const from = arm.drag ? SEGS - 1 : SEGS - 1 - HAND_BASE
  const dx = arm.x[to] - arm.x[from]
  const dy = arm.y[to] - arm.y[from]
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
// on. Its end gives to the hand, never the hand to it: a moving hand's
// last piece lies straight along the hand (stiffEnd), a holding or
// dragged one's bends to within HAND_BEND of it (bendEnd: a holding
// hand's claws stay on their spot). Then every point is kept out of
// anything hard.
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
  if (held || arm.drag) bendEnd(arm, x, y)
  else stiffEnd(arm)
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
// A limb's end bent to its hand: where the hand is turned more than
// HAND_BEND either way from the way the chain's last piece runs, that
// piece is turned about the wrist until it is not. (`hand`: its ax, ay —
// the limb, or its drawn hand; xs, ys: the chain's points, or as drawn.)
//
function bendEnd(hand, xs, ys) {
  const dx = xs[SEGS] - xs[SEGS - 1]
  const dy = ys[SEGS] - ys[SEGS - 1]
  const turn = Math.atan2(dx * hand.ay - dy * hand.ax, dx * hand.ax + dy * hand.ay)
  if (Math.abs(turn) <= HAND_BEND) return
  const over = turn - Math.sign(turn) * HAND_BEND
  const c = Math.cos(over)
  const s = Math.sin(over)
  xs[SEGS - 1] = xs[SEGS] - (dx * c - dy * s)
  ys[SEGS - 1] = ys[SEGS] - (dx * s + dy * c)
}
//
// A moving hand's limb comes out of its wrist straight along the hand:
// the chain's last piece laid on the hand's own line, its length kept.
// (Left to follow the hand like the rest, that piece flips over within a
// step when the hand is drawn back faster than the piece is long — and a
// piece bent only as far as HAND_BEND jumps from one side to the other
// there.)
//
function stiffEnd(arm) {
  const { x, y } = arm
  const len = vecLen(x[SEGS] - x[SEGS - 1], y[SEGS] - y[SEGS - 1])
  x[SEGS - 1] = x[SEGS] - arm.ax * len
  y[SEGS - 1] = y[SEGS] - arm.ay * len
}
//
// A free limb, led by its hand: its points droop a little, are smoothed,
// its end is laid along the hand (stiffEnd), then they follow one another
// toward the hand (the hand leads like a head and the limb comes after it
// along the way it went); none of its pieces ends up stretched (from the
// shoulder on, the far end of a long one is drawn in: a long piece would
// lie right through a ledge).
//
function followHand(arm, droop) {
  const { x, y } = arm
  const most = arm.seg * STRETCH_MAX
  for (let pass = 0; pass < LIMB_PASSES; pass++) {
    for (let i = 1; i < SEGS; i++) {
      x[i] += ((x[i - 1] + x[i + 1]) * HALF - x[i]) * SMOOTH
      y[i] += ((y[i - 1] + y[i + 1]) * HALF - y[i]) * SMOOTH + (pass ? 0 : droop)
    }
    stiffEnd(arm)
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
// The head's tilt: it leans with the way it goes only while it moves —
// or, where its way is too tight for it upright (a turned node on its
// stretch, off a top), it turns right along the way, its face ahead (as
// far as straight up or down: it never turns over its back); a
// critically damped spring.
//
function updateTilt(inst, dt) {
  const f = inst.frame
  const moving = inst.speed > FACE_SPEED ? 1 : 0
  inst.moveShare += (moving - inst.moveShare) * Math.min(1, MOVE_RATE * dt)
  const tight = !f.walk && (inst.path[inst.seg]?.turned || inst.path[inst.seg + 1]?.turned)
  const side = inst.face < 0 ? -1 : 1
  const along = Math.atan2(side * f.dy, side * f.dx)
  const want = tight ? Math.max(-QUARTER, Math.min(QUARTER, along)) : f.dy * TURN.tilt * inst.face * inst.moveShare
  inst.tiltVel += ((want - inst.tilt) * TILT_W * TILT_W - inst.tiltVel * 2 * TILT_W) * dt
  inst.tilt += inst.tiltVel * dt
}
//
// The mouth: a little open, a little shut again, now and then; stalking,
// held a little open; eating, as the meal has it (gaping, then snapped
// shut, fast).
//
function updateMouth(inst, dt) {
  if (inst.meal.arm) {
    inst.mouth += (inst.mouthWant - inst.mouth) * Math.min(1, BITE_RATE * dt)
    return
  }
  inst.mouthIn -= dt
  if (inst.mood === MOOD.STALK && inst.mouthIn <= 0) inst.mouthWant = STALK_MOUTH
  else if (inst.mouthIn <= 0) {
    inst.mouthIn = MOUTH_GAP + inst.rng() * MOUTH_RANGE
    inst.mouthWant = inst.mouthWant > 0 ? 0 : inst.rng() * MOUTH_REST * 2
  }
  inst.mouth += (inst.mouthWant - inst.mouth) * Math.min(1, MOUTH_RATE * dt)
}
function openWide(inst) {
  inst.mouthWant = MOUTH_WIDE
  inst.mouthIn = MOUTH_WIDE_HOLD
}
//
// The plan, planHz times a second: a new way when one is due; no hold
// kept that is cut off or out of reach; a step when one is due; the free
// limbs feeling about, or — stalking — one of them striking at its prey's
// place (neither with prey in a hand); the water, the holds and the
// fireflies a free hand's claws touch. Before all that, what it feels
// running near.
//
function planTick(inst, ctx) {
  senseTremor(inst)
  inst.wantWay && planWay(inst)
  const m = MOOD_CFG[inst.mood]
  dropLostHolds(inst)
  inst.reaching < m.reaches && inst.time - inst.lastLand >= m.stepGap && stepOn(inst, m)
  inst.meal.arm || (inst.mood === MOOD.STALK ? strikeAt(inst, inst.target.x, inst.target.y) : maybeProbe(inst))
  for (let i = 0; i < inst.arms.length; i++) feel(inst, inst.arms[i], ctx)
}
//
// A hold its limb has no straight way to any more (something hard between
// the shoulder and the hand: the head has gone round a corner) or that is
// out of the limb's reach is let go — but its last one. So is one the
// head has come right up to (within TOO_NEAR px of the shoulder: the limb
// would lie crumpled on the head), while enough others hold.
//
function dropLostHolds(inst) {
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state !== STATE.HOLD || inst.anchored < 2) continue
    const span = vecLen(arm.hold.x - arm.sx, arm.hold.y - arm.sy)
    const lost = span > REACH_MAX * ANCHOR_SLACK || !isWayClear(arm.sx, arm.sy, arm.wx, arm.wy, 0)
    const crumpled = span < TOO_NEAR && inst.anchored > GRIP.minSupport
    if (!lost && !crumpled) continue
    release(arm)
    inst.anchored--
  }
}
//
// A step: with fewer hands holding than the mood keeps, a free hand
// reaches for a hold; else the holding hand farthest behind its place
// (see laggingArm) is due — its pair's other hand reaches on while that
// one hangs free (the due hand then lets go: the pair takes turns), else
// it reaches on from its hold itself — to a hold on along the way from
// the limb's own place, or round one of the way's next nodes. A hand
// that finds no hold tries again after RETRY s. Kept from going on (for
// LOOSE_AFTER s: no hold ahead of it), the hand farthest behind is due
// however little it lags — else, every hand under a stride behind, none
// would ever step and it would stand there for good.
//
function stepOn(inst, m) {
  const due = inst.anchored < m.holds ? null : laggingArm(inst, m, inst.stuckFor >= LOOSE_AFTER)
  const arm = due ? freeArm(inst, due.side) ?? due : inst.anchored < m.holds ? freeArm(inst, null) : null
  if (!arm) return
  if (!reachOn(inst, arm, m)) {
    arm.retryAt = inst.time + RETRY
    return
  }
  if (!due || arm === due) return
  release(due)
  inst.anchored--
}
//
// Starts a hand's reach for a hold on along the way from its limb's own
// place (the mood's lead at LEAD_SHARES), or round one of the way's next
// nodes; whether it found one.
//
function reachOn(inst, arm, m) {
  const lead = inst.restFor > 0 ? 0 : m.lead
  for (let i = 0; i < LEAD_SHARES.length; i++) {
    edgeAhead(inst, lead * LEAD_SHARES[i] + arm.keep * inst.frame.dx, inst.ideal)
    if (findHold(inst, arm, inst.ideal.x, inst.ideal.y) && startReach(inst, arm, m)) return true
  }
  for (let n = 1; n <= NODES_AHEAD && lead > 0; n++) {
    const node = inst.path[Math.min(inst.seg + n, inst.path.length - 1)]
    if (findHold(inst, arm, node.x, node.y) && startReach(inst, arm, m)) return true
  }
  return false
}
//
// A hand free to reach: of the pair on one side (-1, 1; the tail, 0, has
// no pair), or — any (null) — of the side with the fewest hands holding
// or reaching.
//
function freeArm(inst, side) {
  if (side === 0) return null
  let pick = null
  let least = Infinity
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state !== STATE.FREE || arm.drag || inst.time < arm.retryAt || (side !== null && arm.side !== side)) continue
    const busy = busyOf(inst, arm.side)
    if (busy >= least) continue
    least = busy
    pick = arm
  }
  return pick
}
function busyOf(inst, side) {
  let n = 0
  for (let i = 0; i < inst.arms.length; i++) inst.arms[i].side === side && inst.arms[i].state !== STATE.FREE && n++
  return n
}
//
// The holding hand due to step on: the one farthest behind its own
// place along the way, if it lags a stride (or lags at all, stretched;
// or is crumpled up against its shoulder, ahead or behind; or its limb
// has come to lie behind the head), has held minHold s and enough
// others hold; `loose`: the one farthest behind, whatever its lag.
//
function laggingArm(inst, m, loose) {
  if (inst.anchored - 1 < GRIP.minSupport) return null
  const f = inst.frame
  let pick = null
  let worst = 0
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state !== STATE.HOLD || inst.time - arm.heldAt < GRIP.minHold || inst.time < arm.retryAt) continue
    const span = vecLen(arm.hold.x - arm.sx, arm.hold.y - arm.sy)
    const along = (arm.hold.gx - inst.body.x) * f.dx + (arm.hold.gy - inst.body.y) * f.dy
    const lag = arm.keep * f.dx - along
    const behind = runBehind(inst, arm, arm.hold.x, arm.hold.y) - BEHIND_MOST
    const need = span < CRAMPED ? m.stride + Math.abs(lag) : behind > 0 ? m.stride + behind : span > REACH_MAX * STRETCH ? m.stride + lag : lag
    if ((!loose && need < m.stride) || need <= worst) continue
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
// The surface's edge `lead` px on along the way from its place (back
// along it, below 0): the path's nodes' edge points, eased between them.
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
  while (left < 0) {
    const len = segLength(inst, seg)
    const room = u * len
    if (-left < room || seg === 0) {
      u = Math.max(0, u + left / len)
      break
    }
    left += room
    seg--
    u = 1
  }
  const a = inst.path[seg]
  const b = inst.path[seg + 1]
  out.x = a.x + (b.x - a.x) * u
  out.y = a.y + (b.y - a.y) * u
}
//
// Whether a hand can take a hold: within reach and not too near, not
// another hand's (within grip.gap px), its limb's way there not behind
// the head (unless it is stuck), something solid under the claws, its
// wrist clear of anything hard and a straight clear way to it from the
// shoulder.
//
function canHold(inst, arm, g) {
  const d = vecLen(g.x - arm.sx, g.y - arm.sy)
  if (d > HOLD_REACH || d < ARM_MIN || isTaken(inst, arm, g.x, g.y)) return false
  if (inst.stuckFor < LOOSE_AFTER && runBehind(inst, arm, g.x, g.y) > BEHIND_TAKE) return false
  if (!Solid.isSolid(Math.round(g.x - g.nx * inst.hand.depth) | 0, Math.round(g.y - g.ny * inst.hand.depth) | 0)) return false
  aimHand(arm, g.x, g.y, inst.hand.palm, inst.aim)
  return isWristClear(inst.aim.x, inst.aim.y) && isWayClear(arm.sx, arm.sy, inst.aim.x, inst.aim.y, LIMB.radius)
}
//
// How much of a limb's straight way from its root to a point lies behind
// the head (px): the stretch of it inside the head's ellipse — little
// where the limb runs out from its root, long where it would run across
// under the head.
//
function runBehind(inst, arm, x, y) {
  const c = Math.cos(inst.tilt)
  const s = Math.sin(inst.tilt)
  const wx = x - arm.sx
  const wy = y - arm.sy
  const d = vecLen(wx, wy) || 1
  const rx = arm.sx - inst.body.x
  const ry = arm.sy - inst.body.y
  const px = (rx * c + ry * s) / HEAD.rx
  const py = (ry * c - rx * s) / HEAD.ry
  const ex = (wx * c + wy * s) / d / HEAD.rx
  const ey = (wy * c - wx * s) / d / HEAD.ry
  const a = ex * ex + ey * ey
  const b = px * ex + py * ey
  return Math.min(d, (Math.sqrt(Math.max(0, b * b - a * (px * px + py * py - 1))) - b) / a)
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
  arm.strike = false
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
  r.turn = Math.atan2(r.fax * to.ay - r.fay * to.ax, r.fax * to.ax + r.fay * to.ay)
  r.t = 0
  r.dur = Math.max(m.reachTime[0], Math.min(m.reachTime[1], vecLen(to.x - r.fx, to.y - r.fy) / m.reachSpeed)) * (1 + inst.rng() * REACH_JITTER)
  arm.probe.on = false
  setState(arm, STATE.REACH)
  inst.anchored = countState(inst, STATE.HOLD)
  inst.reaching = countState(inst, STATE.REACH)
  return true
}
//
// The reach's curve from where the hand is, with a lift off the surface
// it leaves; it comes in on the hold along the hand's own way there (so
// the limb's end and the hand lie one way as it lands), LAND_OFF of the
// lift off that surface; whether it is clear of anything hard.
//
function layPath(arm, lift) {
  const r = arm.reach
  const to = arm.to
  const held = arm.state === STATE.HOLD
  const fnx = held ? arm.hold.nx : -arm.ax
  const fny = held ? arm.hold.ny : -arm.ay
  r.c1x = arm.wx + (arm.sx - arm.wx) * RETRACT + fnx * lift
  r.c1y = arm.wy + (arm.sy - arm.wy) * RETRACT + fny * lift
  r.c2x = to.x + (to.nx * LAND_OFF - to.ax) * lift
  r.c2y = to.y + (to.ny * LAND_OFF - to.ay) * lift
  for (let i = 0; i < PATH_CHECKS.length; i++) {
    const t = PATH_CHECKS[i]
    if (isHard(Math.round(cubic(arm.wx, r.c1x, r.c2x, to.x, t)) | 0, Math.round(cubic(arm.wy, r.c1y, r.c2y, to.y, t)) | 0)) return false
  }
  return true
}
//
// Roaming, a hand hanging free feels about now and then (while it moves,
// one hand is kept back for the next step; the tail never does): it
// sweeps an arc along the way out to its own side, to one side of that
// then the other.
//
function maybeProbe(inst) {
  let spare = inst.speed > MOVE_EPS ? 1 : 0
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    if (arm.state !== STATE.FREE || arm.probe.on || arm.drag || !arm.side) continue
    if (spare-- > 0 || inst.time < arm.probeAt) continue
    arm.probeAt = inst.time + C.explore.probeGap * (1 + inst.rng() * PROBE_VARY)
    inst.rng() < C.explore.probeChance && startProbe(inst, arm)
  }
}
function startProbe(inst, arm) {
  const f = inst.frame
  const out = f.dx * arm.side < 0 ? -1 : 1
  const center = Math.atan2(f.dy * out - f.ny * PROBE_TILT, f.dx * out - f.nx * PROBE_TILT)
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
// the hand draw back at once (and it keeps clear of there); a hold they
// touch while feeling about is taken; a firefly they close on is
// snatched and eaten — neither while it eats: it minds nothing else
// then. (The living things it touches: senseTouch.)
//
function feel(inst, arm, ctx) {
  if (arm.state === STATE.HOLD || arm.state === STATE.CARRY) return
  const tip = inst.hand.palm + inst.hand.finger
  const tx = arm.wx + arm.ax * tip
  const ty = arm.wy + arm.ay * tip
  if (Nav.inWater(Math.round(tx) | 0, Math.round(ty) | 0)) return touchWater(inst, arm)
  if (arm.state === STATE.REACH || inst.meal.arm) return
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
// another way, stalking it gives the stalk up there.
//
function touchWater(inst, arm) {
  release(arm)
  if (inst.time - inst.waterAt < SENSE.waterGap) return
  inst.waterAt = inst.time
  shun(inst, arm.wx, arm.wy)
  if (inst.restFor > 0) return
  inst.mood === MOOD.STALK ? arrive(inst) : (inst.wantWay = true)
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
// current one: the head (bobbing, the side it faces, its jaw), each
// limb's chain (its inner points drawn as they settle:
// smoothDrawn), wrist and hand (never more than HAND_BEND from the
// chain's end as drawn: the end is bent to the hand), its curve laid.
// (dt: the frame's time.)
//
function pose(inst, alpha, dt) {
  const p = inst.pose
  p.x = lerp(inst.prev.x, inst.body.x, alpha)
  inst.still += ((inst.meal.biting ? 1 : 0) - inst.still) * Math.min(1, STILL_RATE * dt)
  p.y = lerp(inst.prev.y, inst.body.y, alpha) + Math.sin(inst.time * BOB_HZ * FULL_TURN) * BOB_PX * (1 - inst.still)
  p.tilt = lerp(inst.prev.tilt, inst.tilt, alpha)
  p.face = lerp(inst.prev.face, inst.face, alpha)
  p.want = inst.faceWant
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
    arm.swell = Math.max(LIMB.girth.thin, Math.min(LIMB.girth.thick, Math.sqrt(REACH_MAX * LIMB.girth.rest / (arm.seg * SEGS))))
    smoothDrawn(arm, dt)
    bendEnd(d, arm.nx, arm.ny)
    Look.layArm(arm)
    clearCurve(arm) && Look.measureArm(arm)
  }
}
//
// The limb's inner points as drawn follow where the chain has them as a
// critically damped spring of DRAW_W rad/s (solved exactly: steady at any
// frame time), so no flicker of the chain's from one step to the next
// shows; its ends — shoulder and wrist — are drawn where they are. One
// more than SNAP_FAR px off (a new start) is put right there.
//
function smoothDrawn(arm, dt) {
  const { nx, ny, gx, gy, gvx, gvy } = arm
  const e = Math.exp(-DRAW_W * dt)
  for (let j = 1; j < SEGS; j++) {
    const dx = gx[j] - nx[j]
    const dy = gy[j] - ny[j]
    if (Math.abs(dx) > SNAP_FAR || Math.abs(dy) > SNAP_FAR) {
      gx[j] = nx[j]
      gy[j] = ny[j]
      gvx[j] = 0
      gvy[j] = 0
      continue
    }
    const kx = gvx[j] + DRAW_W * dx
    const ky = gvy[j] + DRAW_W * dy
    gx[j] = nx[j] + (dx + kx * dt) * e
    gy[j] = ny[j] + (dy + ky * dt) * e
    gvx[j] = (gvx[j] - DRAW_W * kx * dt) * e
    gvy[j] = (gvy[j] - DRAW_W * ky * dt) * e
    nx[j] = gx[j]
    ny[j] = gy[j]
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
// How fast each living thing about moves (px/s, eased): from where it
// was a frame ago; one that has just turned up counts as still.
//
function trackBeings(inst, dt) {
  const beings = inst.beings
  if (!beings || dt <= 0) return
  const count = Math.min(beings.length, MAX_BEINGS)
  const e = Math.min(1, SPEED_EASE * dt)
  for (let j = 0; j < count; j++) {
    const b = beings[j]
    const known = b.live && inst.beingSeen[j]
    inst.beingVx[j] = known ? inst.beingVx[j] + ((b.x - inst.beingX[j]) / dt - inst.beingVx[j]) * e : 0
    inst.beingVy[j] = known ? inst.beingVy[j] + ((b.y - inst.beingY[j]) / dt - inst.beingVy[j]) * e : 0
    inst.beingX[j] = b.x
    inst.beingY[j] = b.y
    inst.beingSeen[j] = b.live ? 1 : 0
  }
}
//
// What it touches, every step — nothing while it eats: it minds only its
// meal then; and, fed (tremor.sated s after a meal), no prey small enough
// for a mouthful (a runner): that may run over it unharmed. Prey a hand
// is on is caught, by a hand that may let go of what it holds (enough
// others holding); else, as prey a limb or the head is on, it is felt —
// and struck at with a free hand.
//
function senseTouch(inst) {
  const beings = inst.beings
  if (!beings || inst.meal.arm) return
  const count = Math.min(beings.length, MAX_BEINGS)
  for (let j = 0; j < count; j++) {
    const b = beings[j]
    if (!b.live || !b.prey || (b.prey.mouthful && inst.time < inst.fedUntil)) continue
    const arm = handOn(inst, b)
    if (arm && (arm.state !== STATE.HOLD || inst.anchored - 1 >= GRIP.minSupport)) return seize(inst, arm, b)
    if (!arm && !limbOn(inst, b) && !headOn(inst, b)) continue
    notice(inst, b)
    strikeAt(inst, b.x + inst.beingVx[j] * STRIKE_TIME, b.y + inst.beingVy[j] * STRIKE_TIME)
  }
}
//
// The hand that is on a living thing: one whose palm and fingers (from
// its wrist HAND_SPAN of the way to its claws' tips) pass within
// touch.reach px of the thing's body.
//
function handOn(inst, b) {
  const span = (inst.hand.palm + inst.hand.finger) * HAND_SPAN
  const near = b.r + SENSE.touch.reach
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    const along = Math.max(0, Math.min(span, (b.x - arm.wx) * arm.ax + (b.y - arm.wy) * arm.ay))
    if (vecLen(b.x - arm.wx - arm.ax * along, b.y - arm.wy - arm.ay * along) <= near) return arm
  }
  return null
}
//
// Whether a limb lies on a living thing: a point of its chain within the
// limb's radius of the thing's body.
//
function limbOn(inst, b) {
  const near = b.r + LIMB.radius
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    for (let j = 1; j < SEGS; j++) {
      if (Math.abs(arm.x[j] - b.x) <= near && Math.abs(arm.y[j] - b.y) <= near && vecLen(arm.x[j] - b.x, arm.y[j] - b.y) <= near) return true
    }
  }
  return false
}
function headOn(inst, b) {
  return vecLen(b.x - inst.body.x, b.y - inst.body.y) <= HEAD.rx + b.r
}
//
// What it feels running near, at every plan — nothing while it eats: of
// the prey whose running shakes the rock, the one it stalks already —
// else the nearest one — within tremor.reach px of its head that moves
// tremor.speed px/s or faster. It turns its head that way; and, unless
// it is deaf to tremors (fed, or having just lost one) or stalks prey it
// has touched, that one is noted and it stalks there.
//
function senseTremor(inst) {
  const beings = inst.beings
  if (!beings || inst.meal.arm) return
  const count = Math.min(beings.length, MAX_BEINGS)
  const kept = inst.mood === MOOD.STALK ? inst.target.being : -1
  let felt = -1
  let best = SENSE.tremor.reach
  for (let j = 0; j < count; j++) {
    const d = tremorOf(inst, beings[j], j)
    const rank = j === kept && d < SENSE.tremor.reach ? -1 : d
    if (rank >= best) continue
    best = rank
    felt = j
  }
  if (felt < 0) return
  turnToward(inst, beings[felt])
  if (inst.time < inst.deafUntil || (inst.mood === MOOD.STALK && inst.target.touched)) return
  notice(inst, beings[felt], false)
  inst.target.being = felt
}
//
// Its head turns to the side something runs on (GLANCE_MIN_DX px or more
// to that side of it), for GLANCE_TIME s — when such a turn is due
// (GLANCE_EVERY s after the last).
//
function turnToward(inst, b) {
  const dx = b.x - inst.body.x
  if (inst.time < inst.glanceIn || Math.abs(dx) < GLANCE_MIN_DX) return
  inst.glanceSide = dx < 0 ? -1 : 1
  inst.glanceFor = GLANCE_TIME
  inst.glanceIn = inst.time + GLANCE_EVERY
}
//
// How far off (px from its head) a living thing's tremor comes from —
// Infinity for one that gives none: not about, not one whose running
// shakes the rock right now, or moving under tremor.speed px/s.
//
function tremorOf(inst, b, j) {
  if (!b.live || !b.prey?.tremor || vecLen(inst.beingVx[j], inst.beingVy[j]) < SENSE.tremor.speed) return Infinity
  return vecLen(b.x - inst.body.x, b.y - inst.body.y)
}
//
// Prey felt — touched, or only its tremor: where it is is noted and it
// stalks there, whatever it was doing.
//
function notice(inst, b, touched = true) {
  inst.target.x = b.x
  inst.target.y = b.y
  inst.target.at = inst.time
  inst.target.touched = touched
  inst.target.being = -1
  inst.mood = MOOD.STALK
  inst.restFor = 0
  inst.pauseFor = 0
  inst.wantWay = true
}
//
// A hand takes prey: it lets go of what it held, shuts on the prey and
// is the meal's hand from now on; the level is told (the prey is the
// climber's: gone from the world, drawn in its hand). It stops to eat.
//
function seize(inst, arm, b) {
  const meal = inst.meal
  arm.probe.on = false
  setState(arm, STATE.CARRY)
  inst.anchored = countState(inst, STATE.HOLD)
  inst.reaching = countState(inst, STATE.REACH)
  meal.arm = arm
  meal.prey = b.prey
  meal.t = 0
  meal.bites = 0
  meal.phase = PHASE.GAPE
  meal.left = EAT.gape
  meal.biting = false
  meal.done = false
  meal.kick = 1
  meal.way = 0
  meal.turned = false
  inst.mood = MOOD.EXPLORE
  inst.ctx.onSeize(b.prey)
}
//
// A strike at a point with a hand hanging free — the one whose shoulder
// is nearest it, within STRIKE_REACH of a limb, a straight way there
// clear; none within STRIKE_GAP s of the last one.
//
function strikeAt(inst, x, y) {
  if (inst.time < inst.strikeAt) return
  let pick = null
  let best = REACH_MAX * STRIKE_REACH
  for (let i = 0; i < inst.arms.length; i++) {
    const arm = inst.arms[i]
    const d = vecLen(x - arm.sx, y - arm.sy)
    if (arm.state !== STATE.FREE || arm.drag || d >= best || !isWayClear(arm.sx, arm.sy, x, y, 0)) continue
    best = d
    pick = arm
  }
  if (!pick || !startStrike(inst, pick, x, y)) return
  inst.strikeAt = inst.time + STRIKE_GAP
}
//
// A strike: a reach for a point in the air, straight from the shoulder —
// the claws' tips go STRIKE_PAST px past it — STRIKE_TIME s long; whether
// it could start (a clear curve there).
//
function startStrike(inst, arm, x, y) {
  const to = arm.to
  const dx = x - arm.sx
  const dy = y - arm.sy
  const d = vecLen(dx, dy) || 1
  to.gx = x + dx / d * (STRIKE_PAST - inst.hand.finger)
  to.gy = y + dy / d * (STRIKE_PAST - inst.hand.finger)
  to.nx = -dx / d
  to.ny = -dy / d
  aimHand(arm, to.gx, to.gy, inst.hand.palm, to)
  if (!startReach(inst, arm, MOOD_CFG[inst.mood])) return false
  arm.strike = true
  arm.reach.dur = STRIKE_TIME
  return true
}
//
// Where prey is brought to: the mouth's front, between the jaws.
//
function mouthSpot(inst, out) {
  const c = Math.cos(inst.tilt)
  const s = Math.sin(inst.tilt)
  const fx = Look.MOUTH_AT.x * (inst.face < 0 ? -1 : 1)
  out.x = inst.body.x + fx * c - Look.MOUTH_AT.y * s
  out.y = inst.body.y + fx * s + Look.MOUTH_AT.y * c
  return out
}
//
// The hand with the prey (not while its limb is caught behind something:
// it is drawn in along the limb then, see markDrag). It comes before the
// mouth, its fingers turned toward the mouth, the prey's far end at the
// mouth's front — nearer with every bite, as less of the prey is left —
// from the first of the ways in APPROACH that has room for the hand
// (from ahead; from ahead and below; from below); with no room any way,
// it turns its head round once to eat facing the other side. Once there
// the hand is pressed to the mouth and held still, and only then it eats
// (see eat); not there within eat.carryMost s, it lets its prey drop.
//
function carryPrey(inst, arm, px, py, dt) {
  const meal = inst.meal
  meal.t += dt
  meal.kick = meal.bites ? Math.max(0, meal.kick - dt / KICK_FADE) : 1
  if (arm.drag) return
  const left = Math.max(0, 1 - meal.bites / EAT.bites)
  const reach = inst.hand.palm + inst.hand.finger * HOLD_AT + (meal.prey.ahead ?? 0) * left
  const pushed = meal.biting && meal.phase <= PHASE.BITE
  const off = reach + (pushed ? (meal.prey.mouthful ? -EAT.deep : 0) : EAT.back)
  meal.biting || approach(inst, off)
  const spot = handSpot(inst, off, inst.ideal)
  turnAxis(arm, -inst.aim.ax, -inst.aim.ay, CARRY_TURN * dt)
  if (meal.biting) {
    arm.wx += (spot.x - arm.wx) * Math.min(1, AXIS_EASE * dt)
    arm.wy += (spot.y - arm.wy) * Math.min(1, AXIS_EASE * dt)
    return eat(inst, arm, dt)
  }
  followSpot(arm, spot, px, py, dt)
  meal.biting = vecLen(arm.wx - spot.x, arm.wy - spot.y) <= EAT.near && arm.ax * -inst.aim.ax + arm.ay * -inst.aim.ay > HALF
  if (meal.biting || meal.t < EAT.carryMost) return
  inst.ctx.onDrop(meal.prey, arm.wx, arm.wy)
  endMeal(inst)
}
//
// Turns a hand toward a way (a unit vector), the shorter way round,
// `most` rad at most.
//
function turnAxis(arm, tx, ty, most) {
  const turn = Math.max(-most, Math.min(most, Math.atan2(arm.ax * ty - arm.ay * tx, arm.ax * tx + arm.ay * ty)))
  const c = Math.cos(turn)
  const s = Math.sin(turn)
  const ax = arm.ax * c - arm.ay * s
  arm.ay = arm.ax * s + arm.ay * c
  arm.ax = ax
}
//
// The way the meal's hand comes to the mouth (meal.way: its place in
// APPROACH): kept while the hand has room there, else the first that has
// it; none has — the head turns round, once a meal.
//
function approach(inst, off) {
  const meal = inst.meal
  for (let n = 0; n < APPROACH.length; n++) {
    const way = (meal.way + n) % APPROACH.length
    meal.way = way
    const spot = handSpot(inst, off, inst.ideal)
    if (isWristClear(spot.x, spot.y)) return
  }
  meal.way = 0
  if (meal.turned) return
  meal.turned = true
  inst.faceWant = -inst.faceWant
}
//
// Where the meal's hand goes (its wrist): `off` px out from the mouth's
// front the way it comes (meal.way) — that way, in the world, is written
// into inst.aim (ax, ay): the hand's fingers point back along it.
//
function handSpot(inst, off, out) {
  const way = APPROACH[inst.meal.way]
  const side = inst.face < 0 ? -1 : 1
  const c = Math.cos(inst.tilt)
  const s = Math.sin(inst.tilt)
  inst.aim.ax = side * way[0] * c - way[1] * s
  inst.aim.ay = side * way[0] * s + way[1] * c
  mouthSpot(inst, out)
  out.x += inst.aim.ax * off
  out.y += inst.aim.ay * off
  return out
}
//
// Eating, the hand at the mouth: the meal's phase runs on, and at its
// end the next one starts (see PHASE and the phases below).
//
function eat(inst, arm, dt) {
  const meal = inst.meal
  meal.left -= dt
  if (meal.phase === PHASE.GAPE) gape(inst, arm)
  else if (meal.phase === PHASE.BITE) chomp(inst, arm)
  else if (meal.phase === PHASE.CHEW) chew(inst, arm)
  else pause(inst)
}
//
// The mouth gapes while the hand pushes the prey in; then the jaws start
// to close on it (heard from now on, the whole bite long).
//
function gape(inst, arm) {
  const meal = inst.meal
  inst.mouthWant = MOUTH_GAPE
  if (meal.left > 0) return
  meal.phase = PHASE.BITE
  meal.left = EAT.bite
  inst.ctx.onJaws(meal.prey, 1, arm.wx, arm.wy)
}
//
// The jaws close slowly; shut, they have bitten the prey through: only
// now is less of it left in the hand (the level is told), and what they
// took off is in the mouth to be chewed — or, with nothing left of the
// prey at all (the hero), there is nothing to chew.
//
function chomp(inst, arm) {
  const meal = inst.meal
  inst.mouthWant = MOUTH_GAPE * Math.max(0, meal.left / EAT.bite)
  if (meal.left > 0) return
  const hold = inst.hand.palm + inst.hand.finger * HOLD_AT
  meal.bites++
  const more = inst.ctx.onBite(meal.prey, meal.bites, arm.wx + arm.ax * hold, arm.wy + arm.ay * hold)
  meal.done = !more || meal.bites >= EAT.bites
  meal.phase = more ? PHASE.CHEW : PHASE.PAUSE
  meal.left = more ? EAT.chew : EAT.pause
  meal.chews = 0
}
//
// Chewing what is in the mouth: the jaw works open and shut, each chew
// heard; then it is swallowed.
//
function chew(inst, arm) {
  const meal = inst.meal
  const t = EAT.chew - meal.left
  const chews = Math.floor(t * CHEW_HZ)
  inst.mouthWant = CHEW_SHUT + (CHEW_OPEN - CHEW_SHUT) * (HALF - HALF * Math.cos(t * CHEW_HZ * FULL_TURN))
  if (chews > meal.chews) {
    meal.chews = chews
    inst.ctx.onJaws(meal.prey, CHEW_LOUD, arm.wx, arm.wy)
  }
  if (meal.left > 0) return
  meal.phase = PHASE.PAUSE
  meal.left = EAT.pause
}
//
// A pause, its mouth shut; then the next bite — or, the prey eaten, the
// meal is over.
//
function pause(inst) {
  const meal = inst.meal
  inst.mouthWant = 0
  if (meal.left > 0) return
  if (meal.done) return endMeal(inst)
  meal.phase = PHASE.GAPE
  meal.left = EAT.gape
}
//
// The meal is over: the hand lets go and hangs free, the mouth shuts, and
// it rests eat.rest s before it goes on — away from where it ate (its
// next ways keep clear of the place: what comes back there is not found
// again at once), minding no tremor for tremor.sated s — and no small
// prey either (see senseTouch).
//
function endMeal(inst) {
  const meal = inst.meal
  release(meal.arm)
  meal.arm = null
  meal.prey = null
  meal.biting = false
  inst.mouthWant = 0
  inst.mouthIn = MOUTH_GAP
  inst.restFor = EAT.rest
  inst.deafUntil = inst.time + SENSE.tremor.sated
  inst.fedUntil = inst.deafUntil
  shun(inst, inst.body.x, inst.body.y)
}
//
// The meal as the level draws it (inst.heldDraw): the piece the last bite
// took off, in the mouth while it is chewed — eat.inside px in from the
// mouth's front as the head is drawn — and what the hand still holds,
// HOLD_AT along the drawn hand's fingers, with where those fingers lie
// on it; both with the hand's turn (degrees).
//
function drawMeal(inst) {
  const meal = inst.meal
  const d = meal.arm.d
  const p = inst.pose
  const turn = Math.atan2(d.ay, d.ax) * DEG
  const side = p.face < 0 ? -1 : 1
  const hold = inst.hand.palm + inst.hand.finger * HOLD_AT
  if (meal.biting && meal.phase === PHASE.CHEW) {
    const fx = (Look.MOUTH_AT.x - EAT.inside) * side
    inst.ideal.x = p.x + fx * Math.cos(p.tilt) - Look.MOUTH_AT.y * Math.sin(p.tilt)
    inst.ideal.y = p.y + fx * Math.sin(p.tilt) + Look.MOUTH_AT.y * Math.cos(p.tilt)
    inst.heldDraw(meal.prey, inst.ideal, turn, meal.bites, 0, 1 - meal.left / EAT.chew, null)
  }
  if (meal.done || meal.bites >= EAT.bites) return
  inst.ideal.x = d.wx + d.ax * hold
  inst.ideal.y = d.wy + d.ay * hold
  inst.heldDraw(meal.prey, inst.ideal, turn, meal.bites, meal.kick, -1, Look.clawLines(inst, meal.arm))
}
