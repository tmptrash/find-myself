import * as BugPicture from '../utils/forest-apple-bug-picture.js'
import * as HolePicture from '../utils/forest-bug-hole-picture.js'
import * as TunnelPicture from '../utils/forest-bug-tunnel-picture.js'
import * as WaterFlower from './water-flower.js'
import * as PredatorFeast from './predator-fruit-feast.js'
import * as TreeFruit from '../utils/forest-tree-fruit.js'
import * as Atmosphere from '../utils/forest-level-atmosphere.js'
import { FOREST_CFG } from '../cfg.js'
import { FOREST_PAL } from '../utils/forest-palette.js'
import { getRGB } from '../../../utils/helper.js'

//
// The apple bug: a six-legged bug under a leafy shell living in a burrow
// between the lake and the left big tree. It hides in the burrow for a while,
// comes out and, turn by turn, catches midges over the lake with its long
// forked tongue from the shore (it is afraid of the water and never steps
// in) or strolls round the tree's foot. It goes back in only with an apple
// or when something scares it. It moves in jerky dashes
// with a new pose after each, its legs stepping in two alternating tripods,
// every leg placed by inverse kinematics from its hip to its foot.
//
// An apple falling or lying by the tree makes it turn sharply and run for
// it; it grabs the apple in its mouth and carries it home. The flower's
// falling water hitting it on its way scares it: it turns, drops what it
// carries and flees into the burrow, and comes straight out again. A crawler may race it for
// the same apple until the bug has it in its mouth.
//
// It goes into the burrow with a dash from the doorway: on its way in it
// darkens, fades out, shrinks a little and rises (it is going deeper), and
// it comes out the same way backwards. The burrow's picture draws behind it.
//
// Under the burrow, past a strip of soil, lies a cave: a moment after it
// went in with an apple, the bug shows up in the cave's left end, runs along
// its floor to the far end and stores the apple in a pile there, or eats it
// bite by bite once the pile is full; then it turns and runs back up, and
// later comes out of the burrow as before. An apple falling up there sends it
// rushing back out at once: one in its mouth it drops where it stands.
//
const STATES = {
  INSIDE: 'inside',
  DOWN: 'down',
  APPEAR: 'appear',
  TUNNEL: 'tunnel',
  STORE: 'store',
  EAT: 'eat',
  OUT: 'out',
  EMERGE: 'emerge',
  HUNT: 'hunt',
  WANDER: 'wander',
  SINK: 'sink',
  APPLE: 'apple',
  GRAB: 'grab',
  CARRY: 'carry',
  FLEE: 'flee',
  TO_DROP: 'toDrop',
  BITE: 'bite'
}
const UNDERGROUND = new Set([STATES.INSIDE, STATES.DOWN, STATES.APPEAR, STATES.TUNNEL,
  STATES.STORE, STATES.EAT, STATES.OUT])
//
// In the cave (and not on its way in or out of the dark) it hears an apple
// fall up there.
//
const TUNNEL_ALERT = new Set([STATES.TUNNEL, STATES.STORE, STATES.EAT, STATES.OUT])
const PLANS = {
  LAKE: 'lake',
  WANDER: 'wander',
  APPLE: 'apple'
}
const TONGUE = {
  IDLE: 'idle',
  OUT: 'out',
  BACK: 'back'
}
const PARAMS = FOREST_CFG.appleBug
const COLORS = FOREST_PAL.appleBug
const RAD_TO_DEG = 180 / Math.PI
const MAX_FRAME_DT = 0.1
const ARRIVE_DIST = 0.5
//
// Pose: between dashes the body settles at a new height and pitch (nose
// down is positive) and leans its nose down a little while dashing; it
// snaps to them fast (POSE_SNAP per second), bobbing over each dash.
//
const POSE_LIFT_RANGE = 1.26
const POSE_PITCH_RANGE = 0.06
const DASH_LEAN = 0.05
const DASH_BOB = 0.96
const POSE_SNAP = 16
const HEAD_SNAP = 12
const HEAD_RANGE = 0.12
const HEAD_AIM_MAX = 0.45
const HEAD_GRAB_DIP = 0.4
//
// Legs: a foot rests FOOT_SPREAD from its hip along the body (rear legs
// back, front legs forward) and steps once it lags STEP_TRIGGER behind (or
// SETTLE_TRIGGER at rest), landing STEP_LEAD ahead while moving. The tarsus
// leans TARSUS_TILT outwards from the foot.
//
const FOOT_SPREAD = 14.4
const STEP_TRIGGER = 3.7
const SETTLE_TRIGGER = 1.26
const STEP_LEAD = 3.24
const TARSUS_TILT = 0.4
const IK_SLACK = 0.01
//
// Antennae sway on their bases and swing back while it runs.
//
const ANTENNA_SWAY = 0.1
const ANTENNA_SPEED = 3.1
const ANTENNA_DRAG = 0.0025
const ANTENNA_FAR_PHASE = 1.7
const ANTENNA_SNAP = 10
//
// Tongue: a pink ribbon thinning from the mouth to its tip, out to a midge
// it picks at least TONGUE_MIN_AHEAD ahead of its mouth, the caught midge
// back on its tip. It is never straight: every shot bends it its own way
// (TONGUE_BEND per px of length, up to TONGUE_BEND_MAX), lumps it with
// fixed kinks and its width wobbles, and a wave runs along its middle. Its
// fork's two prongs differ a little. Now and then, away from the lake, it
// tastes the air: a short flick.
//
const TONGUE_WIDTH = 2
const TONGUE_TIP_WIDTH = 1
const TONGUE_WIDTH_JITTER = 0.35
const TONGUE_SEGMENTS = 14
const TONGUE_WAVE = 1
const TONGUE_WAVE_SPEED = 38
const TONGUE_BEND = 0.05
const TONGUE_BEND_MAX = 4
const TONGUE_KINK = 1.2
const TONGUE_KINK_FREQ_A = 9.7
const TONGUE_KINK_FREQ_B = 21.3
const TONGUE_KINK_B_SHARE = 0.45
const TONGUE_SEED_RANGE = 100
const TONGUE_FORK_LEN = 4.6
const TONGUE_FORK_LEN_DIFF = 1.1
const TONGUE_FORK_ANGLE = 0.45
const TONGUE_FORK_ANGLE_DIFF = 0.12
const TONGUE_MIN_AHEAD = 6
const FLICK_LEN = 12
const FLICK_OUT = 0.07
const FLICK_BACK = 0.1
const FLICK_WAIT_MIN = 1.8
const FLICK_WAIT_MAX = 4
//
// Apple: it is held this share of its radius in front of the mouth and a
// little lower; the bug grabs it over GRAB_DURATION. Inside, it comes out
// for an apple after APPLE_NOTICE_DELAY (unless it hides scared). It darts
// once it is DROP_PASS_PAD past the flower's drop.
//
const APPLE_HOLD_AHEAD = 0.55
const APPLE_HOLD_DROP = 0.15
const GRAB_DURATION = 0.28
const APPLE_NOTICE_DELAY = 0.5
const DROP_PASS_PAD = 6
//
// Biting the flower's full bubble (when the level asks for it): it stops
// with its mouth BITE_REACH of the bubble's radius off its centre, aims its
// head at it and bites over BITE_DURATION, the bubble tearing off at
// BITE_AT of it.
//
const BITE_REACH = 0.7
const BITE_DURATION = 0.3
const BITE_AT = 0.5
//
// Startle when the water hits it: it jerks STARTLE_JERK px towards the
// burrow at once (already facing it, nose up by STARTLE_NOSE_UP), its
// feet left behind to scramble after it, and a hop.
//
const STARTLE_HOP = 7.2
const STARTLE_JERK = 11
const STARTLE_NOSE_UP = -0.22
//
// A turn is a quick hop round: the body never goes flat, it narrows to
// TURN_MIN_WIDTH of itself with its nose up, flips and widens again, its
// feet landing where the new way needs them.
//
const TURN_MIN_WIDTH = 0.55
const TURN_HOP = 3.6
const TURN_NOSE_UP = -0.12
//
// The burrow's doorway is DOOR_DX from the hole's middle on either side.
// From there it darts in over RUSH_DURATION (at once at full speed, then
// braking hard, RUSH_EASE_POWER): it gets
// fully dark over the first RUSH_DARK_END share of the dash, fades out from
// RUSH_FADE_START on, and ends DEEP_ZOOM of its size, DEEP_RISE px higher.
// Coming out runs the same dash backwards.
//
const DOOR_DX = 53
const RUSH_DURATION = 0.17
const RUSH_EASE_POWER = 3
const RUSH_DARK_END = 0.55
const RUSH_FADE_START = 0.4
const DEEP_ZOOM = 0.84
const DEEP_RISE = 4.8
//
// Tunnel: full size like the apples there; its body follows the floor's
// slope measured SLOPE_SPAN to either side. It puts an apple down over
// PUT_DURATION. The pile's places are in apple radii from the pile's spot
// (the third on top of the two), an apple it eats lies EAT_DX radii before
// the pile, and it bites every BITE_CYCLE (head down for its first half),
// creeping up to what is left of the apple, its mouth BITE_INTO into it.
//
// It comes into and leaves the tunnel through a "portal": a vertical line
// at the cave's left end (where its rear sits at that end). Crossing it, it
// is fully seen right of the PORTAL_FADE_W band, fades across it in
// PORTAL_STRIPS steps and is gone left of the line — so going out its front
// goes first, coming in its front shows first. Going out, the last
// PORTAL_DIVE_DIST before its rear (and trailing legs, PORTAL_EXIT_PAD) is
// past the line it darts (PORTAL_DIVE_DURATION, braking like the burrow's
// dash); coming in it darts the same distance out of the dark from just
// behind the line and walks on. PORTAL_REACH: how far ahead of its origin
// its head and antennae reach; PORTAL_MASK_H covers the bug above and below
// its ground.
//
const PORTAL_FADE_W = 80
const PORTAL_STRIPS = 16
const PORTAL_EXIT_PAD = 10
const PORTAL_REACH = 60
const PORTAL_MASK_H = 200
const PORTAL_DIVE_DIST = 90
const PORTAL_DIVE_DURATION = 0.15
const SLOPE_SPAN = 12
const PUT_DURATION = 0.3
const PILE_SLOTS = [{ dx: 0, up: 0 }, { dx: -1.9, up: 0 }, { dx: -0.95, up: 1.7 }]
const PILE_SIZE = Math.min(PARAMS.pileMax, PILE_SLOTS.length)
const EAT_DX = -4.4
const BITE_CYCLE = 0.55
const BITE_INTO = 0.8
const EAT_CREEP = 6
const APPLE_FLOOR_SINK = 1
const EATER_ON_LEFT = Math.PI
//
// Burrow: clear ground on each side of its picture.
//
const HOLE_CLEAR_PAD = 10
const pictureByK = new WeakMap()

/**
 * Creates the bug inside its burrow (it comes out after a short while) and
 * the burrow's picture. Needs load(k) to have resolved first.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.holeX - World X of the burrow's middle on the ground line
 * @param {number} cfg.groundY - World Y of the ground line
 * @param {number} cfg.lakeX2 - World X of the lake's right edge (it hunts from past it)
 * @param {number} cfg.treeX - World X of the left big tree's trunk
 * @param {Object} cfg.levelInst - Forest level inst (its treeFruitSpots are the apples)
 * @param {Object} [cfg.midges] - Midges controller (prey over the lake)
 * @param {Object} [cfg.flower] - Water flower inst (its falling water scares the bug)
 * @param {Object} [cfg.predator] - Crawler inst (the bug leaves an apple it eats)
 * @param {number} cfg.backZ - Draw layer of the burrow's picture
 * @param {number} cfg.tunnelZ - Draw layer of the tunnel under the burrow (and the apples in it)
 * @param {number} cfg.z - Draw layer of the bug
 * @returns {Object|null} Bug inst (null if its pictures are not baked)
 */
export function create(cfg) {
  const { k, holeX, groundY, lakeX2, treeX, levelInst, midges = null, flower = null, predator = null } = cfg
  const baked = pictureByK.get(k)
  if (!baked) return null
  const { bug, hole, tunnel } = baked
  const mouthX = holeX + (hole.hole.x1 + hole.hole.x2) * 0.5
  const tunnelX = holeX + hole.leftStoneX
  const tunnelTopY = groundY + PARAMS.tunnelDepth
  const inst = {
    k,
    bug,
    hole,
    tunnel,
    holeX,
    groundY,
    surfaceY: groundY,
    mouthX,
    tunnelPos: k.vec2(Math.round(tunnelX + tunnel.dx), Math.round(tunnelTopY + tunnel.dy)),
    tunnelFloor: tunnel.floor.map(p => ({ x: tunnelX + p.x, y: tunnelTopY + p.y })),
    tunnelEndX: tunnelX + tunnel.endX,
    portalX: tunnelX + tunnel.endX + bug.shellBox.x1,
    pileX: tunnelX + tunnel.pileX,
    floor: null,
    slope: 0,
    slopeCos: 1,
    pile: [],
    put: null,
    meal: null,
    bitesLeft: 0,
    biteT: 0,
    standX: lakeX2 + PARAMS.lakeStandGap,
    wanderX1: holeX + hole.hole.x2,
    wanderX2: treeX + PARAMS.wanderReach,
    appleX1: treeX - PARAMS.appleLeft,
    appleX2: treeX + PARAMS.appleRight,
    levelInst,
    midges,
    flower,
    predator,
    holePos: k.vec2(Math.round(holeX + hole.dx), Math.round(groundY + hole.dy)),
    farTint: getRGB(k, COLORS.farTint),
    tongueColor: getRGB(k, COLORS.tongue),
    forkColor: getRGB(k, COLORS.tongueFork),
    deepColor: getRGB(k, COLORS.deep),
    state: STATES.INSIDE,
    plan: PLANS.WANDER,
    hideLeft: randomIn(PARAMS.hideMin, PARAMS.hideMax),
    nextHide: 0,
    scared: false,
    stateLeft: 0,
    opacity: 0,
    dark: 0,
    zoom: DEEP_ZOOM,
    rise: DEEP_RISE,
    rush: { t: 0, dur: RUSH_DURATION, fromX: 0, toX: 0 },
    diving: false,
    time: 0,
    x: 0,
    goalX: 0,
    facing: 1,
    f: 1,
    turnFrom: 1,
    turnT: 1,
    turnFlipped: true,
    vx: 0,
    dash: { active: false, t: 0, dur: 0, pauseLeft: 0 },
    lift: PARAMS.bodyLift,
    liftTarget: PARAMS.bodyLift,
    hop: 0,
    pitch: 0,
    pitchTarget: 0,
    head: 0,
    headTarget: 0,
    antenna: 0,
    legs: [],
    tongue: { phase: TONGUE.IDLE, t: 0, out: 0, back: 0, prey: null, caught: null, tipX: 0, tipY: 0, waitLeft: 0, seed: 0 },
    flickLeft: randomIn(FLICK_WAIT_MIN, FLICK_WAIT_MAX),
    fruit: null,
    appleFrom: 0,
    darting: false,
    carrying: false,
    rushingOut: false,
    dropBiteWanted: false,
    dropBitten: false,
    dropBites: 0,
    loose: []
  }
  inst.x = inst.mouthX
  inst.goalX = inst.mouthX
  inst.legs = bug.legs.map((leg, i) => createLeg(inst, leg, i))
  const tunnelObj = k.add([k.pos(0, 0), k.z(cfg.tunnelZ), { draw() { onDrawTunnel(inst) } }])
  const backObj = k.add([k.pos(0, 0), k.z(cfg.backZ), { draw() { onDrawBack(inst) } }])
  const obj = k.add([k.pos(0, 0), k.z(cfg.z), { draw() { onDraw(inst) } }])
  obj.onUpdate(() => onUpdate(inst))
  inst.obj = obj
  inst.layers = [tunnelObj, backObj, obj]
  return inst
}

/**
 * Hides or shows the bug, its burrow and the tunnel (it goes on living
 * while hidden).
 * @param {Object|null} inst - Bug inst
 * @param {boolean} hidden - True to hide
 */
export function setHidden(inst, hidden) {
  inst?.layers.forEach(layer => { layer.hidden = hidden })
}

/**
 * Bakes the bug's parts, its burrow and the tunnel under it once per live k
 * (waits for the pictures to load).
 * @param {Object} k - Kaplay instance
 * @returns {Promise<Object|null>} The bakes (null if any failed to load)
 */
export async function load(k) {
  const cached = pictureByK.get(k)
  if (cached) return cached
  const [bug, hole, tunnel] = await Promise.all([
    BugPicture.load(k, PARAMS.shellWidth),
    HolePicture.load(k, PARAMS.holeWidth),
    TunnelPicture.load(k, PARAMS.tunnelWidth)
  ])
  if (!bug || !hole || !tunnel) return null
  const out = { bug, hole, tunnel }
  pictureByK.set(k, out)
  return out
}

/**
 * Ground span the burrow takes, for the level to keep free of plants,
 * stones and grass (no picture needed).
 * @param {number} holeX - World X of the burrow's middle
 * @returns {{x1: number, x2: number}}
 */
export function holeClearSpan(holeX) {
  const place = HolePicture.layout(PARAMS.holeWidth)
  return { x1: holeX + place.dx - HOLE_CLEAR_PAD, x2: holeX + place.dx + place.w + HOLE_CLEAR_PAD }
}

/**
 * Asks it (or stops asking it) to bite the flower's next full bubble: out
 * in the open and with no apple to fetch, it walks up to the bubble and
 * bites it off; the falling water scares it into the burrow as usual.
 * Each bite counts in inst.dropBites.
 * @param {Object|null} inst - Bug inst
 * @param {boolean} wanted - True to ask for bites
 */
export function wantDropBite(inst, wanted) {
  inst && (inst.dropBiteWanted = wanted)
}

/**
 * The bomb it fears (the one nearest its burrow) burst: out in the open it
 * jerks towards the burrow and runs in (an apple in its mouth goes with
 * it); either way (in the tunnel too) it stays in a little while
 * (bombHideMin..bombHideMax).
 * Already on its way in or out of the burrow, it carries on.
 * @param {Object|null} inst - Bug inst
 */
export function onBombBurst(inst) {
  if (!inst || inst.state === STATES.EMERGE || inst.state === STATES.SINK || inst.state === STATES.FLEE) return
  const hide = randomIn(PARAMS.bombHideMin, PARAMS.bombHideMax)
  if (UNDERGROUND.has(inst.state)) {
    inst.hideLeft = Math.max(inst.hideLeft, hide)
    return
  }
  !inst.carrying && inst.fruit && releaseApple(inst)
  retractTongue(inst)
  startle(inst)
  inst.headTarget = 0
  inst.nextHide = hide
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  inst.state = STATES.FLEE
}

//
// The bug's behaviour, the ground under it, its motion and pose, its legs,
// then (out in the open) what it fears: the flower's water and a crawler
// eating near it. Its hiding time runs all the while it is underground.
//
function onUpdate(inst) {
  const dt = Math.min(MAX_FRAME_DT, inst.k.dt())
  inst.time += dt
  UNDERGROUND.has(inst.state) && (inst.hideLeft -= dt)
  updateBehaviour(inst, dt)
  if (inst.state === STATES.INSIDE || inst.state === STATES.DOWN) return
  updateFloor(inst)
  updateTurn(inst, dt)
  updatePose(inst, dt)
  updateLegs(inst, dt)
  updateTongue(inst, dt)
  if (inst.floor) return
  checkWater(inst)
  checkCrawler(inst)
}
function updateBehaviour(inst, dt) {
  TUNNEL_ALERT.has(inst.state) && !inst.rushingOut && findApple(inst) && rushOutOfTunnel(inst)
  switch (inst.state) {
    case STATES.INSIDE: return tickInside(inst)
    case STATES.DOWN: return tickDown(inst, dt)
    case STATES.APPEAR: return tickAppear(inst, dt)
    case STATES.TUNNEL: return tickTunnel(inst, dt)
    case STATES.STORE: return tickStore(inst, dt)
    case STATES.EAT: return tickEat(inst, dt)
    case STATES.OUT: return tickOut(inst, dt)
    case STATES.EMERGE: return tickEmerge(inst, dt)
    case STATES.HUNT: return tickHunt(inst, dt)
    case STATES.WANDER: return tickWander(inst, dt)
    case STATES.SINK: return tickSink(inst, dt)
    case STATES.APPLE: return tickApple(inst, dt)
    case STATES.GRAB: return tickGrab(inst, dt)
    case STATES.CARRY: return tickCarry(inst, dt)
    case STATES.FLEE: return tickFlee(inst, dt)
    case STATES.TO_DROP: return tickToDrop(inst, dt)
    case STATES.BITE: return tickBite(inst, dt)
  }
}
//
// Hidden in the burrow; an apple by the tree calls it out early unless it
// is hiding scared. It stays in while a crawler eats round its grounds, and
// picks what to do next before it comes out.
//
function tickInside(inst) {
  const apple = findApple(inst)
  apple && !inst.scared && (inst.hideLeft = Math.min(inst.hideLeft, APPLE_NOTICE_DELAY))
  if (inst.hideLeft > 0 || crawlerOnGrounds(inst)) return
  inst.scared = false
  inst.plan = findApple(inst) ? PLANS.APPLE : Math.random() < PARAMS.lakeShare ? PLANS.LAKE : PLANS.WANDER
  const dir = inst.plan === PLANS.LAKE ? -1 : 1
  inst.facing = dir
  inst.f = dir
  inst.turnT = 1
  inst.turnFlipped = true
  inst.x = inst.mouthX
  inst.goalX = inst.mouthX
  inst.legs.forEach(leg => plantLeg(inst, leg))
  startRush(inst, inst.mouthX + dir * DOOR_DX)
  updateDepth(inst, 0, false)
  inst.state = STATES.EMERGE
}
function tickEmerge(inst, dt) {
  const u = tickRush(inst, dt)
  updateDepth(inst, 1 - u, false)
  if (u < 1) return
  if (inst.plan === PLANS.APPLE && claimApple(inst)) return
  if (inst.plan === PLANS.LAKE) {
    inst.stateLeft = randomIn(PARAMS.huntMin, PARAMS.huntMax)
    inst.state = STATES.HUNT
    return
  }
  inst.stateLeft = randomIn(PARAMS.wanderMin, PARAMS.wanderMax)
  inst.goalX = wanderGoal(inst)
  inst.state = STATES.WANDER
}
//
// Walks to its spot on the shore, faces the lake and catches midges until
// it has had enough.
//
function tickHunt(inst, dt) {
  if (claimApple(inst) || startToDrop(inst)) return
  inst.stateLeft -= dt
  if (inst.stateLeft <= 0 && inst.tongue.phase === TONGUE.IDLE) return startOuting(inst)
  inst.goalX = inst.standX
  if (!walk(inst, dt, PARAMS.stroll)) return
  if (inst.facing !== -1) return startTurn(inst, -1)
  if (inst.turnT < 1 || inst.tongue.phase !== TONGUE.IDLE) return
  inst.tongue.waitLeft -= dt
  inst.tongue.waitLeft <= 0 && shootTongue(inst)
}
//
// Dashes from spot to spot round the tree's foot, now and then tasting
// the air with its tongue.
//
function tickWander(inst, dt) {
  if (claimApple(inst) || startToDrop(inst)) return
  inst.stateLeft -= dt
  if (inst.stateLeft <= 0) return startOuting(inst)
  walk(inst, dt, PARAMS.stroll) && (inst.goalX = wanderGoal(inst))
  inst.flickLeft -= dt
  inst.flickLeft <= 0 && inst.tongue.phase === TONGUE.IDLE && flickTongue(inst)
}
//
// The dash from the doorway into the dark; an apple in its mouth goes in
// with it (it leaves the level for the tunnel). Without one it only hides
// in the burrow and does not go down to the cave.
//
function tickSink(inst, dt) {
  const u = tickRush(inst, dt)
  updateDepth(inst, u, true)
  if (u < 1) return
  inst.hideLeft = inst.nextHide
  if (!inst.carrying) {
    inst.fruit && releaseApple(inst)
    inst.state = STATES.INSIDE
    return
  }
  TreeFruit.removeForestCarriedFruit(inst.levelInst, inst.fruit)
  inst.stateLeft = PARAMS.tunnelDelay
  inst.state = STATES.DOWN
}
function tickDown(inst, dt) {
  inst.stateLeft -= dt
  inst.stateLeft <= 0 && enterTunnel(inst)
}
//
// It darts out of the dark through the portal at the cave's left rounded
// end, facing along the cave, its head just behind the line at first.
//
function enterTunnel(inst) {
  inst.floor = inst.tunnelFloor
  inst.x = inst.portalX - PORTAL_REACH
  inst.goalX = inst.x + PORTAL_DIVE_DIST
  inst.facing = 1
  inst.f = 1
  inst.turnT = 1
  inst.turnFlipped = true
  inst.zoom = 1
  inst.rise = 0
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  updateFloor(inst)
  inst.legs.forEach(leg => plantLeg(inst, leg))
  inst.opacity = 1
  inst.dark = PARAMS.tunnelBugDark
  startRush(inst, inst.goalX, PORTAL_DIVE_DURATION)
  inst.state = STATES.APPEAR
}
function tickAppear(inst, dt) {
  tickRush(inst, dt) >= 1 && (inst.state = STATES.TUNNEL)
}
//
// Down the tunnel to the far end: its apple it stores in the pile or (the
// pile full) puts down and eats.
//
function tickTunnel(inst, dt) {
  inst.goalX = tunnelStopX(inst)
  if (!walk(inst, dt, PARAMS.tunnel) || inst.turnT < 1) return
  startPut(inst, inst.pile.length >= PILE_SIZE)
}
//
// Where it stops at the far end: its mouth (and the apple held in front of
// it) over the spot the apple goes to.
//
function tunnelStopX(inst) {
  const hold = inst.fruit.r * inst.zoom * APPLE_HOLD_AHEAD
  return tunnelSpot(inst).x - inst.bug.mouth.x * inst.zoom - hold
}
//
// The pile's next place for the apple it brings; before the pile for one it
// eats.
//
function tunnelSpot(inst) {
  const count = inst.pile.length
  return count < PILE_SIZE ? pileSpot(inst, count, inst.fruit.r) : eatSpot(inst, inst.fruit.r)
}
function pileSpot(inst, i, r) {
  const slot = PILE_SLOTS[i]
  const x = inst.pileX + slot.dx * r
  return { x, y: floorY(inst.tunnelFloor, x) - r * (1 + slot.up) + APPLE_FLOOR_SINK }
}
function eatSpot(inst, r) {
  const x = inst.pileX + EAT_DX * r
  return { x, y: floorY(inst.tunnelFloor, x) - r + APPLE_FLOOR_SINK }
}
//
// Lowers its head and sets the apple down from its mouth to its spot.
//
function startPut(inst, eat) {
  const spot = eat ? eatSpot(inst, inst.fruit.r) : pileSpot(inst, inst.pile.length, inst.fruit.r)
  inst.put = { ...spot, eat }
  inst.stateLeft = PUT_DURATION
  inst.headTarget = HEAD_GRAB_DIP
  inst.state = STATES.STORE
}
function tickStore(inst, dt) {
  inst.stateLeft -= dt
  if (inst.stateLeft > 0) return
  const { fruit, put } = inst
  inst.carrying = false
  inst.fruit = null
  inst.put = null
  inst.headTarget = 0
  if (put.eat) return startEat(inst, fruit, put)
  inst.pile.push({ fruit, x: put.x, y: put.y })
  inst.state = STATES.OUT
}
function startEat(inst, fruit, spot) {
  inst.meal = { fruit, x: spot.x, y: spot.y }
  inst.bitesLeft = PARAMS.eatBites
  inst.biteT = 0
  inst.state = STATES.EAT
}
//
// Bite by bite like the crawler: it creeps up to what is left of the apple,
// dips its head and takes a piece off its near side as the head comes up;
// the last bite finishes it.
//
function tickEat(inst, dt) {
  const { meal } = inst
  const reach = TreeFruit.getForestFruitReach(meal.fruit, EATER_ON_LEFT)
  const biteX = meal.x - reach * BITE_INTO - inst.bug.mouth.x * inst.zoom
  inst.x += (biteX - inst.x) * Math.min(1, dt * EAT_CREEP)
  inst.vx = 0
  const half = BITE_CYCLE * 0.5
  const wasDown = inst.biteT < half
  inst.biteT += dt
  inst.headTarget = inst.biteT < half ? HEAD_GRAB_DIP : 0
  wasDown && inst.biteT >= half && takeBite(inst)
  if (inst.biteT < BITE_CYCLE) return
  inst.biteT = 0
  if (inst.bitesLeft > 0) return
  inst.meal = null
  inst.state = STATES.OUT
}
function takeBite(inst) {
  const { fruit } = inst.meal
  fruit.picture && TreeFruit.biteForestPictureFruit(fruit, EATER_ON_LEFT, inst.bitesLeft, Math.random)
  inst.bitesLeft -= 1
}
//
// Back to the cave's left end (turning first) and on through the portal,
// wiped out into the dark as it goes, the last stretch in a dart.
//
function tickOut(inst, dt) {
  inst.diving ? tickOutDive(inst, dt) : tickOutWalk(inst, dt)
}
function tickOutWalk(inst, dt) {
  inst.goalX = inst.portalX + inst.bug.shellBox.x1 * inst.zoom - PORTAL_EXIT_PAD
  walk(inst, dt, inst.rushingOut ? PARAMS.tunnelRush : PARAMS.tunnel)
  if (inst.turnT < 1 || inst.facing > 0 || inst.x - inst.goalX > PORTAL_DIVE_DIST) return
  inst.diving = true
  startRush(inst, inst.goalX, PORTAL_DIVE_DURATION)
}
function tickOutDive(inst, dt) {
  if (tickRush(inst, dt) < 1) return
  inst.diving = false
  inst.floor = null
  inst.rushingOut && (inst.hideLeft = 0)
  inst.rushingOut = false
  inst.state = STATES.INSIDE
}
//
// An apple fell up there: an apple it is putting down lands on its spot, one
// in its mouth it drops on the floor where it stands, a meal it leaves; then
// it runs back to the cave's left end fast and comes straight out for it.
//
function rushOutOfTunnel(inst) {
  inst.put ? finishPut(inst) : inst.carrying && dropInTunnel(inst)
  inst.meal && inst.loose.push(inst.meal)
  inst.meal = null
  inst.headTarget = 0
  inst.rushingOut = true
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  inst.state = STATES.OUT
}
function finishPut(inst) {
  const { fruit, put } = inst
  const item = { fruit, x: put.x, y: put.y }
  put.eat ? inst.loose.push(item) : inst.pile.push(item)
  inst.carrying = false
  inst.fruit = null
  inst.put = null
}
function dropInTunnel(inst) {
  const { fruit } = inst
  const x = mouthWorld(inst).x + inst.f * fruit.r * APPLE_HOLD_AHEAD
  inst.loose.push({ fruit, x, y: floorY(inst.tunnelFloor, x) - fruit.r + APPLE_FLOOR_SINK })
  inst.carrying = false
  inst.fruit = null
}
//
// Runs for its apple (wherever it rolls), turns to face it if it came down
// behind it and grabs it once it lies still; it gives up if the apple is
// gone or the crawler is already eating it.
//
function tickApple(inst, dt) {
  const fruit = inst.fruit
  if (!isAppleFree(inst, fruit)) {
    releaseApple(inst)
    return startOuting(inst)
  }
  const dir = Math.sign(fruit.x - inst.x) || inst.facing
  inst.goalX = fruit.x - dir * (inst.bug.mouth.x + fruit.r * APPLE_HOLD_AHEAD)
  !inst.darting && passedDrop(inst, dir) && startDart(inst)
  if (!walk(inst, dt, inst.darting ? PARAMS.dart : PARAMS.fetch)) return
  if (inst.facing !== dir) return startTurn(inst, dir)
  inst.turnT >= 1 && fruit.settled && startGrab(inst)
}
//
// On its way to an apple it hurries; once the flower's drop is behind it
// (the spot it fears), it darts for the apple. An apple on its own side of
// the drop it just hurries to.
//
function passedDrop(inst, dir) {
  const x = WaterFlower.dropX(inst.flower)
  if (x === null) return false
  const startedBefore = (x - inst.appleFrom) * dir > 0
  return startedBefore && (inst.x - x) * dir > DROP_PASS_PAD
}
function startDart(inst) {
  inst.darting = true
  inst.dash.active = false
  inst.dash.pauseLeft = 0
}
function tickGrab(inst, dt) {
  inst.headTarget = HEAD_GRAB_DIP
  inst.stateLeft -= dt
  if (!isAppleFree(inst, inst.fruit)) {
    releaseApple(inst)
    return startOuting(inst)
  }
  if (inst.stateLeft > 0) return
  TreeFruit.carryForestFruit(inst.fruit)
  inst.carrying = true
  inst.headTarget = 0
  inst.state = STATES.CARRY
}
function tickCarry(inst, dt) {
  goToDoor(inst, dt, PARAMS.run, randomIn(PARAMS.appleHideMin, PARAMS.appleHideMax))
}
function tickFlee(inst, dt) {
  goToDoor(inst, dt, PARAMS.flee, inst.nextHide)
}
//
// Asked to bite the flower's bubble and one hangs full: off to it.
//
function startToDrop(inst) {
  if (!inst.dropBiteWanted || !WaterFlower.isRipe(inst.flower)) return false
  retractTongue(inst)
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  inst.state = STATES.TO_DROP
  return true
}
//
// Hurries up to the bubble, its mouth by it, and faces it; an apple comes
// first, and a bubble gone (shaken loose) sends it off again.
//
function tickToDrop(inst, dt) {
  if (claimApple(inst)) return
  if (!inst.dropBiteWanted || !WaterFlower.isRipe(inst.flower)) return startOuting(inst)
  const drop = WaterFlower.ripeSpot(inst.flower)
  const dir = Math.sign(drop.x - inst.x) || inst.facing
  inst.goalX = drop.x - dir * (inst.bug.mouth.x * inst.zoom + drop.r * BITE_REACH)
  if (!walk(inst, dt, PARAMS.fetch)) return
  if (inst.facing !== dir) return startTurn(inst, dir)
  if (inst.turnT < 1) return
  inst.stateLeft = BITE_DURATION
  inst.dropBitten = false
  inst.state = STATES.BITE
}
//
// Head aimed at the bubble, it bites it off; the water falling right by it
// then scares it into the burrow (checkWater).
//
function tickBite(inst, dt) {
  inst.stateLeft -= dt
  if (!inst.dropBitten) {
    const drop = WaterFlower.ripeSpot(inst.flower)
    const mouth = mouthWorld(inst)
    const aim = Math.atan2(drop.y - mouth.y, (drop.x - mouth.x) * inst.facing)
    inst.headTarget = Math.max(-HEAD_AIM_MAX, Math.min(HEAD_AIM_MAX, aim))
  }
  !inst.dropBitten && inst.stateLeft <= BITE_DURATION * (1 - BITE_AT) && biteDrop(inst)
  if (inst.stateLeft > 0) return
  inst.headTarget = 0
  startOuting(inst)
}
function biteDrop(inst) {
  inst.dropBitten = true
  if (!WaterFlower.pierce(inst.flower)) return
  inst.dropBites += 1
  inst.dropBiteWanted = false
}
//
// Done with what it was doing out there: on to the next outing (lake or
// stroll) instead of going in.
//
function startOuting(inst) {
  const lake = Math.random() < PARAMS.lakeShare
  inst.plan = lake ? PLANS.LAKE : PLANS.WANDER
  inst.stateLeft = lake ? randomIn(PARAMS.huntMin, PARAMS.huntMax) : randomIn(PARAMS.wanderMin, PARAMS.wanderMax)
  !lake && (inst.goalX = wanderGoal(inst))
  inst.state = lake ? STATES.HUNT : STATES.WANDER
}
//
// Runs to the doorway on its own side of the hole, faces the hole and
// dashes in without its usual pause, to hide there for `hide` seconds.
//
function goToDoor(inst, dt, mode, hide) {
  const side = Math.sign(inst.x - inst.mouthX) || 1
  inst.goalX = inst.mouthX + side * DOOR_DX
  const arrived = Math.abs(inst.goalX - inst.x) <= ARRIVE_DIST
  if (!arrived && !walk(inst, dt, mode)) return
  if (inst.facing !== -side) return startTurn(inst, -side)
  if (inst.turnT < 1) return
  retractTongue(inst)
  inst.nextHide = hide
  startRush(inst, inst.mouthX)
  inst.state = STATES.SINK
}
function startRush(inst, toX, dur = RUSH_DURATION) {
  inst.rush.t = 0
  inst.rush.dur = dur
  inst.rush.fromX = inst.x
  inst.rush.toX = toX
  inst.dash.active = false
  inst.dash.pauseLeft = 0
}
//
// Moves it along the dash, quick at first and braking at the end; returns
// how far along the dash it is (0..1).
//
function tickRush(inst, dt) {
  const { rush } = inst
  rush.t = Math.min(1, rush.t + dt / rush.dur)
  const eased = 1 - Math.pow(1 - rush.t, RUSH_EASE_POWER)
  const x = rush.fromX + (rush.toX - rush.fromX) * eased
  inst.vx = (x - inst.x) / dt
  inst.x = x
  return rush.t
}
//
// How deep in the burrow it is (0 at the doorway, 1 inside): darkness,
// opacity, size and rise follow. Going in it darkens before it fades, so
// only a dark shape vanishes; coming out it shows dark first and lightens.
//
function updateDepth(inst, depth, goingIn) {
  const darkEnd = goingIn ? RUSH_DARK_END : 1 - RUSH_FADE_START
  const fadeStart = goingIn ? RUSH_FADE_START : 1 - RUSH_DARK_END
  inst.dark = Math.min(1, depth / darkEnd)
  inst.opacity = 1 - Math.max(0, (depth - fadeStart) / (1 - fadeStart))
  inst.zoom = 1 + (DEEP_ZOOM - 1) * depth
  inst.rise = DEEP_RISE * depth
}
function startGrab(inst) {
  inst.stateLeft = GRAB_DURATION
  inst.state = STATES.GRAB
}
//
// The first free apple falling or lying by the tree; none while a crawler
// is eating (it does not go near one).
//
function findApple(inst) {
  if (PredatorFeast.predatorMealX(inst.predator) !== null) return null
  return inst.levelInst.treeFruitSpots?.find(fruit => isAppleFree(inst, fruit) &&
    fruit.x >= inst.appleX1 && fruit.x <= inst.appleX2) ?? null
}
function isAppleFree(inst, fruit) {
  return Boolean(fruit) && !fruit.attached && !fruit.removed && !fruit.carried &&
    !PredatorFeast.isPredatorEatingFruit(inst.predator, fruit)
}
//
// Notices an apple: drops its tongue, turns at once and runs for it.
//
function claimApple(inst) {
  const fruit = findApple(inst)
  if (!fruit) return false
  inst.fruit = fruit
  inst.appleFrom = inst.x
  inst.darting = false
  retractTongue(inst)
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  inst.state = STATES.APPLE
  return true
}
function releaseApple(inst) {
  inst.fruit = null
}
//
// The flower's water falling on it or near it (bursting on the shell if it
// hits it): the bug jerks, drops what it carries and flees into the burrow
// to hide longer.
//
function checkWater(inst) {
  if (inst.state === STATES.SINK || inst.state === STATES.FLEE || inst.opacity < 1) return
  const water = WaterFlower.fallingWater(inst.flower)
  if (!water) return
  const hit = hitsShell(inst, water)
  if (!hit && !nearShell(inst, water)) return
  hit && WaterFlower.burstFallingWater(inst.flower)
  if (inst.carrying) {
    const mouth = mouthWorld(inst)
    TreeFruit.dropForestCarriedFruit(inst.fruit, mouth.x + inst.f * inst.fruit.r * APPLE_HOLD_AHEAD, mouth.y)
    inst.carrying = false
  }
  inst.fruit && releaseApple(inst)
  retractTongue(inst)
  startle(inst)
  inst.scared = true
  inst.nextHide = PARAMS.scaredHide
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  inst.state = STATES.FLEE
}
//
// No turning round: it faces the burrow at once and jerks towards it (not
// past its doorway).
//
function startle(inst) {
  const side = Math.sign(inst.x - inst.mouthX) || 1
  const door = inst.mouthX + side * DOOR_DX
  if (inst.facing !== -side) {
    inst.facing = -side
    inst.legs.forEach(leg => plantLeg(inst, leg))
  }
  inst.f = inst.facing
  inst.turnT = 1
  inst.turnFlipped = true
  inst.x += -side * Math.min(STARTLE_JERK, Math.max(0, (inst.x - door) * side))
  inst.hop = STARTLE_HOP
  inst.pitch = STARTLE_NOSE_UP
}
function hitsShell(inst, water) {
  const box = inst.bug.shellBox
  const bodyY = inst.groundY - inst.lift
  const xa = inst.x + inst.f * box.x1
  const xb = inst.x + inst.f * box.x2
  const nx = Math.max(Math.min(xa, xb), Math.min(water.x, Math.max(xa, xb)))
  const ny = Math.max(bodyY + box.y1, Math.min(water.y, inst.groundY))
  return Math.hypot(water.x - nx, water.y - ny) <= water.r
}
//
// The water falls within waterScareReach (across) of the shell.
//
function nearShell(inst, water) {
  const box = inst.bug.shellBox
  const xa = inst.x + inst.f * box.x1
  const xb = inst.x + inst.f * box.x2
  const gap = Math.max(0, Math.min(xa, xb) - water.x, water.x - Math.max(xa, xb))
  return gap - water.r <= PARAMS.waterScareReach
}
//
// A crawler eating near it: it drops what it is doing (an apple in its
// mouth it keeps, it is going home anyway) and runs into the burrow.
//
function checkCrawler(inst) {
  const watchful = inst.state === STATES.HUNT || inst.state === STATES.WANDER ||
    inst.state === STATES.APPLE || inst.state === STATES.GRAB ||
    inst.state === STATES.TO_DROP || inst.state === STATES.BITE
  if (!watchful || inst.opacity < 1) return
  const mealX = PredatorFeast.predatorMealX(inst.predator)
  if (mealX === null || Math.abs(mealX - inst.x) > PARAMS.crawlerFearReach) return
  inst.fruit && releaseApple(inst)
  retractTongue(inst)
  inst.headTarget = 0
  inst.nextHide = randomIn(PARAMS.hideMin, PARAMS.hideMax)
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  inst.state = STATES.FLEE
}
//
// A crawler eating anywhere it goes out to (shore stand to the far apples,
// and its fear reach round them).
//
function crawlerOnGrounds(inst) {
  const mealX = PredatorFeast.predatorMealX(inst.predator)
  if (mealX === null) return false
  return mealX >= inst.standX - PARAMS.crawlerFearReach && mealX <= inst.appleX2 + PARAMS.crawlerFearReach
}
//
// A stroll spot, kept out of a crawler's fear reach on the bug's own side
// of where it eats.
//
function wanderGoal(inst) {
  const x = randomIn(inst.wanderX1, inst.wanderX2)
  const mealX = PredatorFeast.predatorMealX(inst.predator)
  if (mealX === null) return x
  const side = Math.sign(inst.x - mealX) || -1
  const edge = mealX + side * PARAMS.crawlerFearReach
  return side < 0 ? Math.min(x, edge) : Math.max(x, edge)
}
//
// The ground under it: flat outside; in the tunnel the floor's height and
// slope round it, the body raised so it stands its usual height off a slope.
//
function updateFloor(inst) {
  if (!inst.floor) {
    inst.groundY = inst.surfaceY
    inst.slope = 0
    inst.slopeCos = 1
    return
  }
  const y1 = floorY(inst.floor, inst.x - SLOPE_SPAN)
  const y2 = floorY(inst.floor, inst.x + SLOPE_SPAN)
  inst.slope = Math.atan2(y2 - y1, SLOPE_SPAN * 2)
  inst.slopeCos = Math.cos(inst.slope)
  inst.groundY = floorY(inst.floor, inst.x) - inst.lift * inst.zoom * (1 / inst.slopeCos - 1)
}
function floorAt(inst, x) {
  return inst.floor ? floorY(inst.floor, x) : inst.surfaceY
}
//
// Height of a walking line (points left to right) at x, flat past its ends.
//
function floorY(floor, x) {
  const i = floor.findIndex(p => p.x >= x)
  if (i === 0) return floor[0].y
  if (i < 0) return floor[floor.length - 1].y
  const a = floor[i - 1]
  const b = floor[i]
  return a.y + (b.y - a.y) * (x - a.x) / (b.x - a.x)
}
//
// Motion: dashes towards the goal (turning sharply first if it lies behind),
// a pause and a new pose after each. True once it stands at the goal. Up
// on the ground it never goes past its shore spot into the lake; the cave
// below may reach further left.
//
function walk(inst, dt, mode) {
  const { dash } = inst
  inst.vx = 0
  if (dash.pauseLeft > 0) {
    dash.pauseLeft = Math.max(0, dash.pauseLeft - dt)
    return false
  }
  !inst.floor && (inst.goalX = Math.max(inst.standX, inst.goalX))
  const gap = inst.goalX - inst.x
  if (Math.abs(gap) <= ARRIVE_DIST) return true
  const dir = Math.sign(gap)
  if (dir !== inst.facing) {
    startTurn(inst, dir)
    return false
  }
  if (inst.turnT < 1) return false
  if (!dash.active) {
    dash.active = true
    dash.t = 0
    dash.dur = randomIn(mode.dashMin, mode.dashMax)
  }
  dash.t += dt
  const u = Math.min(1, dash.t / dash.dur)
  const start = mode.dashStart ?? 0
  const speed = mode.speed * inst.slopeCos
  const step = Math.min(Math.abs(gap), speed * Math.sin(Math.PI * (start + (1 - start) * u)) * dt)
  inst.x += dir * step
  inst.vx = dir * step / dt
  if (u < 1 && Math.abs(inst.goalX - inst.x) > ARRIVE_DIST) return false
  dash.active = false
  dash.pauseLeft = randomIn(mode.pauseMin, mode.pauseMax)
  newPose(inst)
  return false
}
function newPose(inst) {
  inst.liftTarget = PARAMS.bodyLift + randomIn(-POSE_LIFT_RANGE, POSE_LIFT_RANGE)
  inst.pitchTarget = randomIn(-POSE_PITCH_RANGE, POSE_PITCH_RANGE)
  inst.headTarget = randomIn(-HEAD_RANGE, HEAD_RANGE)
}
function startTurn(inst, dir) {
  inst.facing = dir
  inst.turnFrom = Math.sign(inst.f) || -dir
  inst.turnT = 0
  inst.turnFlipped = false
  inst.hop = Math.max(inst.hop, TURN_HOP)
  inst.dash.active = false
}
//
// The hop round: it narrows (never flat) facing the old way, flips at the
// middle of the turn with its feet set for the new way, and widens again.
//
function updateTurn(inst, dt) {
  if (inst.turnT >= 1) return
  inst.turnT = Math.min(1, inst.turnT + dt / PARAMS.turnDuration)
  const flipped = inst.turnT >= 0.5
  const width = TURN_MIN_WIDTH + (1 - TURN_MIN_WIDTH) * Math.abs(2 * inst.turnT - 1)
  inst.f = (flipped ? inst.facing : inst.turnFrom) * width
  if (!flipped || inst.turnFlipped) return
  inst.turnFlipped = true
  inst.legs.forEach(leg => plantLeg(inst, leg))
}
//
// Height, pitch and head snap to the pose; a dash leans the nose down and
// bobs the body, a startle hop falls back, and on a slope the body lies
// along it (nose down going downhill).
//
function updatePose(inst, dt) {
  const { dash } = inst
  const u = dash.active ? Math.min(1, dash.t / dash.dur) : 0
  const turning = inst.turnT < 1 ? TURN_NOSE_UP : 0
  const lean = (dash.active ? DASH_LEAN : 0) + turning
  const bob = dash.active ? Math.sin(Math.PI * 2 * u) * DASH_BOB : 0
  const snap = Math.min(1, dt * POSE_SNAP)
  const slope = inst.slope * (Math.sign(inst.f) || inst.facing)
  inst.hop = Math.max(0, inst.hop - dt * POSE_SNAP)
  inst.lift += (inst.liftTarget + bob + inst.hop - inst.lift) * snap
  inst.pitch += (inst.pitchTarget + lean + slope - inst.pitch) * snap
  inst.head += (inst.headTarget - inst.head) * Math.min(1, dt * HEAD_SNAP)
  const sway = ANTENNA_SWAY * Math.sin(inst.time * ANTENNA_SPEED)
  inst.antenna += (sway - Math.abs(inst.vx) * ANTENNA_DRAG - inst.antenna) * Math.min(1, dt * ANTENNA_SNAP)
}
//
// Legs in two tripods (near rear, far middle, near front; and the other
// three): a lagging foot steps only while no leg of the other tripod is in
// the air, landing a little ahead of its rest spot.
//
function createLeg(inst, leg, i) {
  const group = (i % 3 + (leg.far ? 1 : 0)) % 2
  const out = {
    ...leg,
    group,
    rest: leg.hip.x + leg.place * FOOT_SPREAD,
    footX: 0,
    footLift: 0,
    stepping: false,
    stepT: 0,
    fromX: 0,
    toX: 0
  }
  plantLeg(inst, out)
  return out
}
function plantLeg(inst, leg) {
  leg.footX = inst.x + inst.facing * legRest(inst, leg)
  leg.footLift = 0
  leg.stepping = false
}
//
// A foot's rest spot across from the body's origin: in the tunnel it is
// closer across on a slope (it lies along it).
//
function legRest(inst, leg) {
  return inst.floor ? leg.rest * inst.zoom * inst.slopeCos : leg.rest
}
function updateLegs(inst, dt) {
  const sgn = Math.sign(inst.f) || inst.facing
  const moving = inst.vx !== 0
  const lead = moving ? Math.sign(inst.vx) * STEP_LEAD : 0
  inst.legs.forEach(leg => leg.stepping && stepLeg(inst, leg, dt, sgn, lead))
  for (const leg of inst.legs) {
    if (leg.stepping) continue
    const lag = Math.abs((leg.footX - inst.x) * sgn - legRest(inst, leg))
    if (lag <= (moving ? STEP_TRIGGER : SETTLE_TRIGGER)) continue
    if (inst.legs.some(other => other.stepping && other.group !== leg.group)) continue
    leg.stepping = true
    leg.stepT = 0
    leg.fromX = leg.footX
  }
}
function stepLeg(inst, leg, dt, sgn, lead) {
  leg.stepT = Math.min(1, leg.stepT + dt / PARAMS.stepDuration)
  leg.toX = inst.x + sgn * legRest(inst, leg) + lead
  leg.footX = leg.fromX + (leg.toX - leg.fromX) * leg.stepT
  leg.footLift = Math.sin(Math.PI * leg.stepT) * PARAMS.stepLift
  leg.stepT >= 1 && (leg.stepping = false, leg.footLift = 0)
}
//
// Tongue: out to its prey (following it), the prey caught at its tip,
// back into the mouth; a flick goes out a little and back with nothing.
//
function shootTongue(inst) {
  const mouth = mouthWorld(inst)
  const prey = Atmosphere.findForestMidgeNear(inst.midges, mouth.x, mouth.y, PARAMS.tongueReach,
    inst.facing, TONGUE_MIN_AHEAD)
  inst.tongue.waitLeft = randomIn(PARAMS.tongueWaitMin, PARAMS.tongueWaitMax)
  if (!prey) return
  Object.assign(inst.tongue, {
    phase: TONGUE.OUT, t: 0, prey, caught: null, out: PARAMS.tongueOut, back: PARAMS.tongueBack,
    seed: Math.random() * TONGUE_SEED_RANGE
  })
}
function flickTongue(inst) {
  inst.flickLeft = randomIn(FLICK_WAIT_MIN, FLICK_WAIT_MAX)
  Object.assign(inst.tongue, {
    phase: TONGUE.OUT, t: 0, prey: null, caught: null, out: FLICK_OUT, back: FLICK_BACK,
    seed: Math.random() * TONGUE_SEED_RANGE
  })
}
function retractTongue(inst) {
  const { tongue } = inst
  tongue.prey = null
  tongue.phase !== TONGUE.IDLE && (tongue.phase = TONGUE.BACK)
}
function updateTongue(inst, dt) {
  const { tongue } = inst
  if (tongue.phase === TONGUE.IDLE) return
  const mouth = mouthWorld(inst)
  if (tongue.phase === TONGUE.OUT) {
    tongue.t = Math.min(1, tongue.t + dt / tongue.out)
    aimTongue(inst, mouth)
    tongue.t >= 1 && catchPrey(inst)
    return
  }
  tongue.t = Math.max(0, tongue.t - dt / tongue.back)
  tongue.t <= 0 && (tongue.phase = TONGUE.IDLE, tongue.caught = null)
}
//
// The tip reaches out towards the prey (or straight ahead for a flick);
// the head turns to it.
//
function aimTongue(inst, mouth) {
  const { tongue } = inst
  const prey = tongue.prey
  const tx = prey ? prey.x : mouth.x + inst.facing * FLICK_LEN
  const ty = prey ? prey.y : mouth.y
  tongue.tipX = tx
  tongue.tipY = ty
  const aim = Math.atan2(ty - mouth.y, (tx - mouth.x) * inst.facing)
  inst.headTarget = Math.max(-HEAD_AIM_MAX, Math.min(HEAD_AIM_MAX, aim))
}
function catchPrey(inst) {
  const { tongue } = inst
  tongue.phase = TONGUE.BACK
  if (!tongue.prey || tongue.prey.caught) return
  Atmosphere.catchForestMidge(tongue.prey)
  tongue.caught = tongue.prey
  tongue.prey = null
  inst.headTarget = 0
}
//
// Bug-local point (world px from the body's origin) to world, the body's
// pitch included.
//
function bodyPoint(inst, p, out) {
  const c = Math.cos(inst.pitch)
  const s = Math.sin(inst.pitch)
  out.x = p.x * c - p.y * s
  out.y = p.x * s + p.y * c
  return out
}
//
// Head-local point: turned with the head round the neck.
//
function headPoint(inst, p, out) {
  const { neck } = inst.bug
  const a = inst.pitch + inst.head
  const c = Math.cos(a)
  const s = Math.sin(a)
  bodyPoint(inst, neck, out)
  const dx = p.x - neck.x
  const dy = p.y - neck.y
  out.x += dx * c - dy * s
  out.y += dx * s + dy * c
  return out
}
//
// Bug-local point to world: mirrored by facing, sized by depth round the
// ground under the bug.
//
function toWorld(inst, p) {
  const { zoom } = inst
  return inst.k.vec2(inst.x + inst.f * p.x * zoom, inst.groundY - inst.rise + (p.y - inst.lift) * zoom)
}
function mouthWorld(inst) {
  return toWorld(inst, headPoint(inst, inst.bug.mouth, { x: 0, y: 0 }))
}
//
// The tunnel under the burrow, the apples stored at its far end, those it
// dropped on its way and one being eaten, dim like the bug down there.
//
function onDrawTunnel(inst) {
  inst.k.drawSprite({ sprite: inst.tunnel.sprite, pos: inst.tunnelPos })
  inst.pile.forEach(item => drawTunnelApple(inst, item))
  inst.loose.forEach(item => drawTunnelApple(inst, item))
  inst.meal && drawTunnelApple(inst, inst.meal)
}
function drawTunnelApple(inst, { fruit, x, y }) {
  TreeFruit.drawForestFruitAt(inst.k, fruit, x, y)
  TreeFruit.drawForestFruitAt(inst.k, fruit, x, y, { opacity: PARAMS.tunnelDark, color: inst.deepColor })
}
//
// The burrow's picture behind the bug.
//
function onDrawBack(inst) {
  inst.k.drawSprite({ sprite: inst.hole.sprite, pos: inst.holePos })
}
//
// The bug as it is, then (in the burrow's doorway) the same shapes in the
// dark colour over it as deep as it is in the dark; a fully dark bug skips
// the first pass so nothing lit shows through while it fades. The tongue
// goes last.
//
function onDraw(inst) {
  if (inst.state === STATES.INSIDE || inst.state === STATES.DOWN) return
  const sgn = Math.sign(inst.f) || inst.facing
  const legs = inst.legs.map(leg => solveLeg(inst, leg, sgn))
  isAtPortal(inst) ? drawThroughPortal(inst, legs) : drawLooks(inst, legs, 1)
  inst.tongue.phase !== TONGUE.IDLE && drawTongue(inst)
}
//
// Its own colours, then the dark of where it is over them, both faded by fade.
//
function drawLooks(inst, legs, fade) {
  const opacity = inst.opacity * fade
  inst.dark < 1 && drawBody(inst, legs, { opacity, color: null, farColor: inst.farTint })
  inst.dark > 0 && drawBody(inst, legs, { opacity: opacity * inst.dark, color: inst.deepColor, farColor: inst.deepColor })
}
function isAtPortal(inst) {
  return inst.floor === inst.tunnelFloor && inst.x < inst.portalX + PORTAL_FADE_W + PORTAL_REACH
}
//
// The portal wipe: the bug drawn once per vertical strip of the fade band,
// each masked to its strip and fainter towards the line, and once more
// masked to everything right of the band; nothing of it left of the line.
//
function drawThroughPortal(inst, legs) {
  const { k } = inst
  const top = inst.groundY - PORTAL_MASK_H
  const stripW = PORTAL_FADE_W / PORTAL_STRIPS
  for (let i = 0; i < PORTAL_STRIPS; i++) {
    const x = inst.portalX + stripW * i
    k.drawMasked(
      () => drawLooks(inst, legs, (i + 0.5) / PORTAL_STRIPS),
      () => k.drawRect({ pos: k.vec2(x, top), width: stripW, height: PORTAL_MASK_H * 2 })
    )
  }
  const shownX = inst.portalX + PORTAL_FADE_W
  k.drawMasked(
    () => drawLooks(inst, legs, 1),
    () => k.drawRect({ pos: k.vec2(shownX, top), width: PORTAL_MASK_H * 2, height: PORTAL_MASK_H * 2 })
  )
}
//
// Far legs and antenna, belly, head, near legs, shell and near antenna from
// one atlas, then the apple it carries, all in one look.
//
function drawBody(inst, legs, look) {
  const { bug } = inst
  legs.forEach((joints, i) => inst.legs[i].far && drawLeg(inst, inst.legs[i], joints, look, look.farColor))
  drawAntenna(inst, bug.antennaFar, bug.antennaFarAt, -1, ANTENNA_FAR_PHASE, look)
  drawPart(inst, bug.belly, bodyPoint(inst, bug.bellyAt, { x: 0, y: 0 }), inst.pitch, 1, look)
  drawPart(inst, bug.head, bodyPoint(inst, bug.neck, { x: 0, y: 0 }), inst.pitch + inst.head, 1, look)
  legs.forEach((joints, i) => !inst.legs[i].far && drawLeg(inst, inst.legs[i], joints, look, look.color))
  drawPart(inst, bug.shell, { x: 0, y: 0 }, inst.pitch, 1, look)
  drawAntenna(inst, bug.antennaNear, bug.antennaNearAt, 1, 0, look)
  inst.carrying && drawCarried(inst, look)
}
//
// One part round its anchor at a bug-local point, turned by a bug-local
// angle; mirror -1 draws the part flipped on itself.
//
function drawPart(inst, part, at, angle, mirror, look, color = look.color) {
  const sgn = Math.sign(inst.f) || inst.facing
  inst.k.drawSprite({
    sprite: part.tile.name,
    quad: part.tile.quad,
    width: part.tile.tileW,
    height: part.tile.tileH,
    pos: toWorld(inst, at),
    anchor: inst.k.vec2(part.anchor.x, part.anchor.y),
    angle: sgn * angle * RAD_TO_DEG,
    scale: inst.k.vec2(inst.f * mirror * inst.zoom, inst.zoom),
    opacity: look.opacity,
    ...(color ? { color } : {})
  })
}
function drawAntenna(inst, part, at, mirror, phase, look) {
  const wave = inst.antenna + ANTENNA_SWAY * Math.sin(inst.time * ANTENNA_SPEED + phase) * 0.5
  drawPart(inst, part, headPoint(inst, at, { x: 0, y: 0 }), inst.pitch + inst.head + wave, mirror, look)
}
//
// Inverse kinematics of one leg in the bug's local frame (unmirrored): the
// tarsus leans out from the foot to the ankle, then hip, knee and ankle
// solve as two bones with the knee out on the leg's own side (front legs
// forward, the others back), which is also its upper side.
//
function solveLeg(inst, leg, sgn) {
  const [femur, tibia, tarsus] = leg.pieces
  const hip = bodyPoint(inst, leg.hip, { x: 0, y: 0 })
  const floorDy = (floorAt(inst, leg.footX) - inst.groundY) / inst.zoom
  const foot = { x: (leg.footX - inst.x) * sgn / inst.zoom, y: inst.lift - leg.footLift + floorDy }
  const tilt = leg.place * TARSUS_TILT
  const ankle = { x: foot.x - Math.sin(tilt) * tarsus.len, y: foot.y - Math.cos(tilt) * tarsus.len }
  const dx = ankle.x - hip.x
  const dy = ankle.y - hip.y
  const reach = Math.hypot(dx, dy)
  const d = Math.max(Math.abs(femur.len - tibia.len) + IK_SLACK, Math.min(femur.len + tibia.len - IK_SLACK, reach))
  const base = Math.atan2(dy, dx)
  const cosKnee = (femur.len * femur.len + d * d - tibia.len * tibia.len) / (2 * femur.len * d)
  const bend = Math.acos(Math.max(-1, Math.min(1, cosKnee)))
  const kneeA = { x: hip.x + Math.cos(base + bend) * femur.len, y: hip.y + Math.sin(base + bend) * femur.len }
  const kneeB = { x: hip.x + Math.cos(base - bend) * femur.len, y: hip.y + Math.sin(base - bend) * femur.len }
  const side = leg.place > 0 ? 1 : -1
  const knee = (kneeA.x - kneeB.x) * side > 0 ? kneeA : kneeB
  const shin = Math.atan2(ankle.y - knee.y, ankle.x - knee.x)
  const heel = { x: knee.x + Math.cos(shin) * tibia.len, y: knee.y + Math.sin(shin) * tibia.len }
  return [hip, knee, heel, foot]
}
function drawLeg(inst, leg, joints, look, color) {
  for (let i = 0; i < leg.pieces.length; i++) {
    const piece = leg.pieces[i]
    const from = joints[i]
    const to = joints[i + 1]
    drawPart(inst, piece, from, Math.atan2(to.y - from.y, to.x - from.x) - piece.axis, 1, look, color)
  }
}
//
// The apple in front of its mouth; while it puts one down, on its way from
// there to its spot.
//
function drawCarried(inst, look) {
  const mouth = mouthWorld(inst)
  const r = inst.fruit.r * inst.zoom
  const put = inst.put
  const u = put ? 1 - Math.max(0, inst.stateLeft) / PUT_DURATION : 0
  const holdX = mouth.x + inst.f * r * APPLE_HOLD_AHEAD
  const holdY = mouth.y + r * APPLE_HOLD_DROP
  const x = put ? holdX + (put.x - holdX) * u : holdX
  const y = put ? holdY + (put.y - holdY) * u : holdY
  TreeFruit.drawForestFruitAt(inst.k, inst.fruit, x, y, { zoom: inst.zoom, opacity: look.opacity, color: look.color })
}
//
// The tongue from the mouth towards its tip (as far out as it is): bent,
// kinked and waving across its line, thinning by uneven pieces, forked at
// the end; a caught midge rides the tip.
//
function drawTongue(inst) {
  const { k, tongue } = inst
  const mouth = mouthWorld(inst)
  const tip = tonguePoint(inst, mouth)
  const dx = tip.x - mouth.x
  const dy = tip.y - mouth.y
  const len = Math.hypot(dx, dy) || 1
  const nx = -dy / len
  const ny = dx / len
  const seed = tongue.seed
  const bend = Math.sign(Math.sin(seed)) * Math.min(TONGUE_BEND_MAX, len * TONGUE_BEND)
  const pts = []
  for (let i = 0; i <= TONGUE_SEGMENTS; i++) {
    const u = i / TONGUE_SEGMENTS
    const kink = Math.sin(u * TONGUE_KINK_FREQ_A + seed) + TONGUE_KINK_B_SHARE * Math.sin(u * TONGUE_KINK_FREQ_B + seed * 2)
    const wave = Math.sin(inst.time * TONGUE_WAVE_SPEED + u * Math.PI * 2) * TONGUE_WAVE
    const off = Math.sin(Math.PI * u) * (bend + kink * TONGUE_KINK + wave)
    pts.push(k.vec2(mouth.x + dx * u + nx * off, mouth.y + dy * u + ny * off))
  }
  for (let i = 0; i < TONGUE_SEGMENTS; i++) {
    const u = (i + 0.5) / TONGUE_SEGMENTS
    const jitter = Math.sin(i * TONGUE_KINK_FREQ_B + seed) * TONGUE_WIDTH_JITTER
    k.drawLine({
      p1: pts[i],
      p2: pts[i + 1],
      width: TONGUE_WIDTH + (TONGUE_TIP_WIDTH - TONGUE_WIDTH) * u + jitter,
      color: inst.tongueColor,
      opacity: inst.opacity
    })
  }
  const end = pts[pts.length - 1]
  const before = pts[pts.length - 2]
  const a = Math.atan2(end.y - before.y, end.x - before.x)
  for (const side of [-1, 1]) {
    const fa = a + side * (TONGUE_FORK_ANGLE + side * TONGUE_FORK_ANGLE_DIFF)
    const forkLen = TONGUE_FORK_LEN + side * TONGUE_FORK_LEN_DIFF * 0.5
    k.drawLine({
      p1: end,
      p2: k.vec2(end.x + Math.cos(fa) * forkLen, end.y + Math.sin(fa) * forkLen),
      width: TONGUE_TIP_WIDTH,
      color: inst.forkColor,
      opacity: inst.opacity
    })
  }
  tongue.caught && k.drawCircle({
    pos: end,
    radius: tongue.caught.radius,
    color: Atmosphere.forestMidgeColor(k, inst.midges),
    opacity: inst.opacity
  })
}
//
// Out: the tip travels from the mouth to its target; back: it comes back
// along the same line from where it got to.
//
function tonguePoint(inst, mouth) {
  const { tongue } = inst
  const t = tongue.t
  return { x: mouth.x + (tongue.tipX - mouth.x) * t, y: mouth.y + (tongue.tipY - mouth.y) * t }
}
function randomIn(min, max) {
  return min + Math.random() * (max - min)
}
