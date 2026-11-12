import * as BugPicture from '../utils/forest-apple-bug-picture.js'
import * as TunnelPicture from '../utils/forest-bug-tunnel-picture.js'
import * as WaterFlower from './water-flower.js'
import * as PredatorFeast from './predator-fruit-feast.js'
import * as TreeFruit from '../utils/forest-tree-fruit.js'
import * as Atmosphere from '../utils/forest-level-atmosphere.js'
import { FOREST_CFG } from '../cfg.js'
import { FOREST_PAL } from '../utils/forest-palette.js'
import * as GroundLine from '../utils/forest-ground-line.js'
import * as EarthMerge from '../utils/forest-earth-merge.js'
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
// Its burrow is a shaft going down from a mouth on the ground into a cave,
// and it lives in the cave: it starts the level there and rests there
// between outings, always in sight. It runs to the mouth, tips over its lip
// head first and walks down the shaft's wall, turns onto the cave's floor at
// the bottom, and climbs back up the same way, head up, to come out.
//
// With an apple it runs along the cave's floor to the far end and stores
// the apple in a pile there, or eats it bite by bite once the pile is full,
// then rests. An apple falling up there sends it rushing back out at once:
// one in its mouth it drops where it stands.
//
const STATES = {
  REST: 'rest',
  DESCEND: 'descend',
  ASCEND: 'ascend',
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
  BITE: 'bite',
  DODGE: 'dodge',
  PEEK: 'peek'
}
const UNDERGROUND = new Set([STATES.REST, STATES.DESCEND, STATES.ASCEND, STATES.TUNNEL,
  STATES.STORE, STATES.EAT, STATES.OUT, STATES.PEEK])
//
// Its hiding time runs while it is down in the cave.
//
const IN_CAVE = new Set([STATES.REST, STATES.TUNNEL, STATES.STORE, STATES.EAT])
//
// In the cave (and not on its way in or out of the dark) it hears an apple
// fall up there.
//
const TUNNEL_ALERT = new Set([STATES.TUNNEL, STATES.STORE, STATES.EAT, STATES.OUT])
const PLANS = {
  LAKE: 'lake',
  FIELD: 'field',
  WANDER: 'wander',
  APPLE: 'apple'
}
//
// With a trampoline mushroom east of the tree its grounds reach on past it:
// it strolls up to FIELD_WANDER_PAST px beyond the mushroom's foot, and
// FIELD_SHARE of its outings without an apple it hunts out there instead of
// over the lake — standing a random FIELD_STAND_MIN..FIELD_STAND_MAX px past
// the foot, facing on east, catching the midges there.
//
const FIELD_SHARE = 0.4
const FIELD_STAND_MIN = 40
const FIELD_STAND_MAX = 200
const FIELD_WANDER_PAST = 220
//
// What else it fears out in the open: the centipede itself coming within
// CRAWLER_NEAR_FEAR px (any part of it) sends it home, and its strolls keep
// that far from the centipede's head; the hero landing within
// HERO_LAND_SCARE px makes it dash HERO_DODGE_DIST px aside, away from him,
// then go back to what it was doing (him just walking by does not).
//
const CRAWLER_NEAR_FEAR = 130
const HERO_LAND_SCARE = 120
const HERO_DODGE_DIST = 110
//
// The states it keeps watch in out in the open (a crawler it sees there
// makes it freeze, crouch or run), and the stages of that wariness.
//
const WATCHFUL = new Set([STATES.HUNT, STATES.WANDER, STATES.APPLE, STATES.GRAB,
  STATES.TO_DROP, STATES.BITE, STATES.DODGE])
const WARY = { FREEZE: 'freeze', CROUCH: 'crouch' }
//
// Peeking out of the burrow after a scare: it rises to the lip, looks, and
// ducks back down for a while if a crawler is near.
//
const PEEK_PHASE = { LOOK: 'look', BACK: 'back', HIDE: 'hide', RISE: 'rise' }
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
// SETTLE_TRIGGER at rest), landing STEP_LEAD ahead while moving.
//
const FOOT_SPREAD = 5.4
const STEP_TRIGGER = 3.7
const SETTLE_TRIGGER = 1.26
const STEP_LEAD = 3.24
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
// Biting the flower's full drop (when the level asks for it): it stops
// with its mouth BITE_REACH of the drop's radius off its centre, aims its
// head at it and bites over BITE_DURATION, the drop tearing off at
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
// It runs in at an even speed from DOOR_DX either side of the mouth's
// middle to the lip on its own side over RUN_IN_DURATION, and hops out from
// the lip to the doorway in climbOutHop (cfg).
//
// On the shaft's wall its body keeps its height off the wall (the walk is
// the usual one, turned onto the wall). Going in, it tips over the lip round
// its corner, walks down and at the bottom turns round its middle onto the
// cave's floor (each turn as long a walk as a quarter circle of its height);
// climbing out it does the same backwards, head up, in one fast jerk. It darkens to the cave's
// dark over the first WALL_DARK_DEPTH px below the ground.
//
const DOOR_DX = 53
const RUN_IN_DURATION = 0.2
const QUARTER_TURN = Math.PI / 2
const WALL_DARK_DEPTH = 30
//
// At the shaft's foot it turns round a point as far from the wall and the
// floor as its front reaches (its head, shell or front feet, plus
// FRONT_REACH_PAD), so nothing of it goes past the wall while it turns.
//
const FRONT_REACH_PAD = 12
const FAR_AWAY = 1e6
//
// Tunnel: full size like the apples there; its body follows the floor's
// slope measured SLOPE_SPAN to either side. It puts an apple down over
// PUT_DURATION. The pile's places are in apple radii from the pile's spot
// (the third on top of the two), an apple it eats lies EAT_DX radii before
// the pile, and it bites every BITE_CYCLE (head down for its first half),
// creeping up to what is left of the apple, its mouth BITE_INTO into it.
//
const SLOPE_SPAN = 12
//
// How fast (per second) its body settles to the ground line's height under it.
//
const SURFACE_SNAP = 18
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
 * Creates the bug resting in the cave under its burrow (it comes out after
 * a short while) and the burrow's picture. Needs load(k) to have resolved
 * first.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.holeX - World X of the burrow's middle on the ground line
 * @param {number} cfg.groundY - World Y of the ground line
 * @param {Object} cfg.groundLine - Level's ground line (raycast under its feet, like the hero's)
 * @param {number} cfg.lakeX2 - World X of the lake's right edge (it hunts from past it)
 * @param {number} cfg.treeX - World X of the left big tree's trunk
 * @param {number} [cfg.fieldTrampX] - World X of the left trampoline mushroom (it also hunts past it)
 * @param {Object} cfg.levelInst - Forest level inst (its treeFruitSpots are the apples)
 * @param {Object} [cfg.midges] - Midges controller (prey over the lake)
 * @param {Object} [cfg.flower] - Water flower inst (its falling water scares the bug)
 * @param {Object} [cfg.predator] - Crawler inst (the bug leaves an apple it eats)
 * @param {number} cfg.tunnelZ - Draw layer of the burrow (and the apples in its cave)
 * @param {number} cfg.z - Draw layer of the bug
 * @returns {Object|null} Bug inst (null if its pictures are not baked)
 */
export function create(cfg) {
  const { k, holeX, groundY, groundLine, lakeX2, treeX, levelInst, midges = null, flower = null, predator = null, fieldTrampX = null } = cfg
  const baked = pictureByK.get(k)
  if (!baked) return null
  const { bug, tunnel } = baked
  const mouthX = holeX + (tunnel.mouth.x1 + tunnel.mouth.x2) * 0.5
  const tunnelX = holeX
  const tunnelTopY = groundY
  const inst = {
    k,
    bug,
    tunnel,
    holeX,
    groundY,
    groundLine,
    surfaceY: groundY,
    mouthX,
    tunnelX,
    tunnelPos: k.vec2(Math.round(tunnelX + tunnel.dx), Math.round(tunnelTopY + tunnel.dy)),
    tunnelFloor: tunnel.floor.map(p => ({ x: tunnelX + p.x, y: tunnelTopY + p.y })),
    restX: tunnelX + tunnel.restX,
    mouthX1: tunnelX + tunnel.mouth.x1,
    mouthX2: tunnelX + tunnel.mouth.x2,
    wallFloor: [{ x: -FAR_AWAY, y: groundY }, { x: FAR_AWAY, y: groundY }],
    wall: null,
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
    fieldTrampX,
    dodgeBack: null,
    huntX: lakeX2 + PARAMS.lakeStandGap,
    huntFacing: -1,
    wanderX1: holeX + tunnel.lip.x2,
    wanderX2: Math.max(treeX + PARAMS.wanderReach, fieldTrampX === null ? -Infinity : fieldTrampX + FIELD_WANDER_PAST),
    appleX1: treeX - PARAMS.appleLeft,
    appleX2: treeX + PARAMS.appleRight,
    levelInst,
    midges,
    flower,
    predator,
    farTint: getRGB(k, COLORS.farTint),
    tongueColor: getRGB(k, COLORS.tongue),
    forkColor: getRGB(k, COLORS.tongueFork),
    deepColor: getRGB(k, COLORS.deep),
    state: STATES.REST,
    plan: PLANS.WANDER,
    hideLeft: randomIn(PARAMS.hideMin, PARAMS.hideMax),
    nextHide: 0,
    scared: false,
    fled: false,
    peekWanted: false,
    peeked: false,
    peek: { phase: PEEK_PHASE.LOOK, left: 0 },
    wary: null,
    crawlerDist: null,
    stateLeft: 0,
    dark: PARAMS.tunnelBugDark,
    zoom: 1,
    rise: 0,
    rush: { t: 0, dur: RUN_IN_DURATION, fromX: 0, toX: 0 },
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
    loose: [],
    posScratch: k.vec2(0, 0),
    anchorScratch: k.vec2(0, 0),
    scaleScratch: k.vec2(1, 1)
  }
  inst.x = inst.restX
  inst.goalX = inst.restX
  inst.floor = inst.tunnelFloor
  updateFloor(inst)
  inst.legs = bug.legs.map(leg => createLeg(inst, leg))
  inst.frontReach = Math.max(bug.shellBox.x2, bug.mouth.x, ...inst.legs.map(leg => leg.rest)) + FRONT_REACH_PAD
  const tunnelObj = k.add([k.pos(0, 0), k.z(cfg.tunnelZ), { draw() { onDrawTunnel(inst) } }])
  const obj = k.add([k.pos(0, 0), k.z(cfg.z), { draw() { onDraw(inst) } }])
  obj.onUpdate(() => onUpdate(inst))
  inst.obj = obj
  inst.layers = [tunnelObj, obj]
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
 * Whether the bug is out on the ground (not in its tunnel or on the shaft wall).
 * @param {Object|null} inst - Bug inst
 * @returns {boolean}
 */
export function isOnSurface(inst) {
  return !!inst && !inst.floor
}

/**
 * The burrow's tunnel picture as a static layer for the merged earth sprite
 * (forest-earth-merge.js); the apples in it stay live.
 * @param {Object} inst - Apple bug inst
 * @returns {Array<{sprite: string, x: number, y: number}>}
 */
export function undergroundLayers(inst) {
  return [{ sprite: inst.tunnel.sprite, x: inst.tunnelPos.x, y: inst.tunnelPos.y }]
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
  const [bug, tunnel] = await Promise.all([
    BugPicture.load(k, PARAMS.shellWidth),
    TunnelPicture.load(k, PARAMS.tunnelWidth)
  ])
  if (!bug || !tunnel) return null
  const out = { bug, tunnel }
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
  const { lip } = TunnelPicture.layout(PARAMS.tunnelWidth)
  return { x1: holeX + lip.x1 - HOLE_CLEAR_PAD, x2: holeX + lip.x2 + HOLE_CLEAR_PAD }
}

/**
 * Asks it (or stops asking it) to bite the flower's next full drop: out
 * in the open and with no apple to fetch, it walks up to the drop and
 * bites it off; the falling water scares it into the burrow as usual.
 * Each bite counts in inst.dropBites.
 * @param {Object|null} inst - Bug inst
 * @param {boolean} wanted - True to ask for bites
 */
export function wantDropBite(inst, wanted) {
  inst && (inst.dropBiteWanted = wanted)
}

/**
 * The hero landed at heroX: hunting or strolling within HERO_LAND_SCARE of
 * him, the bug dashes HERO_DODGE_DIST aside, away from him (no further than
 * its grounds' ends), then goes back to what it was doing.
 * @param {Object|null} inst - Bug inst
 * @param {number} heroX - Where the hero landed (world X)
 */
export function onHeroLanded(inst, heroX) {
  if (!inst || (inst.state !== STATES.HUNT && inst.state !== STATES.WANDER)) return
  if (Math.abs(heroX - inst.x) > HERO_LAND_SCARE) return
  const side = Math.sign(inst.x - heroX) || 1
  const away = Math.max(inst.wanderX1, Math.min(inst.wanderX2, inst.x + side * HERO_DODGE_DIST))
  retractTongue(inst)
  inst.dodgeBack = inst.state
  inst.goalX = away
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  inst.state = STATES.DODGE
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
    inst.fled = true
    inst.state === STATES.PEEK && (inst.peek.phase = PEEK_PHASE.BACK)
    return
  }
  !inst.carrying && inst.fruit && releaseApple(inst)
  retractTongue(inst)
  startle(inst)
  inst.headTarget = 0
  inst.nextHide = hide
  inst.fled = true
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
  IN_CAVE.has(inst.state) && (inst.hideLeft -= dt)
  updateBehaviour(inst, dt)
  updateFloor(inst, dt)
  updateTurn(inst, dt)
  updatePose(inst, dt)
  updateLegs(inst, dt)
  updateTongue(inst, dt)
  inst.wall && updateWall(inst)
  if (inst.floor) return
  checkWater(inst)
  checkCrawler(inst, dt)
}
function updateBehaviour(inst, dt) {
  if (inst.wary && WATCHFUL.has(inst.state)) return tickWary(inst)
  TUNNEL_ALERT.has(inst.state) && !inst.rushingOut && findApple(inst) && rushOutOfTunnel(inst)
  switch (inst.state) {
    case STATES.REST: return tickRest(inst)
    case STATES.DESCEND: return tickDescend(inst, dt)
    case STATES.ASCEND: return tickAscend(inst, dt)
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
    case STATES.DODGE: return tickDodge(inst, dt)
    case STATES.PEEK: return tickPeek(inst, dt)
  }
}
//
// Resting in the cave; an apple by the tree calls it out early unless it
// is hiding scared. It stays in while a crawler eats round its grounds, and
// picks what to do next before it goes up.
//
function tickRest(inst) {
  const apple = findApple(inst)
  apple && !inst.scared && (inst.hideLeft = Math.min(inst.hideLeft, APPLE_NOTICE_DELAY))
  if (inst.hideLeft > 0 || crawlerOnGrounds(inst)) return
  inst.scared = false
  inst.plan = findApple(inst) ? PLANS.APPLE : pickOutingPlan(inst)
  inst.rushingOut = inst.plan === PLANS.APPLE
  inst.peekWanted = inst.fled && !inst.rushingOut
  inst.peeked = false
  inst.fled = false
  inst.state = STATES.OUT
}
//
// Out of the shaft at its lip: on to the doorway, then off to its plan.
//
function tickEmerge(inst, dt) {
  if (tickRush(inst, dt) < 1) return
  if (inst.plan === PLANS.APPLE && claimApple(inst)) return
  if (inst.plan === PLANS.LAKE || inst.plan === PLANS.FIELD) {
    startHunt(inst)
    return
  }
  inst.stateLeft = randomIn(PARAMS.wanderMin, PARAMS.wanderMax)
  inst.goalX = wanderGoal(inst)
  inst.state = STATES.WANDER
}
//
// Walks to its hunting spot (on the shore facing the lake, or past the
// trampoline mushroom facing east), and catches midges until it has had
// enough.
//
function tickHunt(inst, dt) {
  if (claimApple(inst) || startToDrop(inst)) return
  inst.stateLeft -= dt
  if (inst.stateLeft <= 0 && inst.tongue.phase === TONGUE.IDLE) return startOuting(inst)
  inst.goalX = inst.huntX
  if (!walk(inst, dt, PARAMS.stroll)) return
  if (inst.facing !== inst.huntFacing) return startTurn(inst, inst.huntFacing)
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
// The run from the doorway to the lip; an apple in its mouth goes in with
// it (it leaves the level for the cave). Then down the wall.
//
function tickSink(inst, dt) {
  if (tickRush(inst, dt) < 1) return
  inst.hideLeft = inst.nextHide
  inst.carrying ? TreeFruit.removeForestCarriedFruit(inst.levelInst, inst.fruit) : inst.fruit && releaseApple(inst)
  startWall(inst, false)
  inst.state = STATES.DESCEND
}
//
// Down the shaft's wall and onto the cave's floor: with an apple on to the
// far end, without one to rest.
//
function tickDescend(inst, dt) {
  if (!walk(inst, dt, PARAMS.tunnel)) return
  leaveWall(inst)
  inst.state = inst.carrying ? STATES.TUNNEL : STATES.REST
}
//
// Up the shaft's wall to the lip, then the run to the doorway.
//
function tickAscend(inst, dt) {
  const peeking = inst.peekWanted && !inst.peeked
  peeking && (inst.goalX = wallXAt(inst.wall, peekS(inst)))
  if (!walk(inst, dt, PARAMS.climbOut)) return
  if (peeking) return startPeek(inst)
  leaveWall(inst)
  inst.rushingOut && (inst.hideLeft = 0)
  inst.rushingOut = false
  inst.peekWanted = false
  startRush(inst, inst.mouthX + inst.facing * DOOR_DX, PARAMS.climbOutHop)
  inst.state = STATES.EMERGE
}
//
// Its head just over the lip: it looks round for a while, then goes on out.
// A crawler near sends it down the wall to hide, and it comes up to look
// again. Moves along the wall at an even PARAMS.peekSpeed.
//
function startPeek(inst) {
  inst.peeked = true
  inst.peek.phase = PEEK_PHASE.LOOK
  inst.peek.left = randomIn(PARAMS.peekMin, PARAMS.peekMax)
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  inst.state = STATES.PEEK
}
function tickPeek(inst, dt) {
  const { peek, wall } = inst
  inst.vx = 0
  inst.dash.active = false
  const danger = crawlerAround(inst, PARAMS.peekFearReach)
  switch (peek.phase) {
    case PEEK_PHASE.LOOK:
      if (danger) {
        peek.phase = PEEK_PHASE.BACK
        return
      }
      peek.left -= dt
      if (peek.left > 0) return
      inst.goalX = wallXAt(wall, 0)
      inst.state = STATES.ASCEND
      return
    case PEEK_PHASE.BACK:
      if (!slideOnWall(inst, dt, peekS(inst) + PARAMS.peekDive)) return
      peek.phase = PEEK_PHASE.HIDE
      peek.left = randomIn(PARAMS.peekHideMin, PARAMS.peekHideMax)
      return
    case PEEK_PHASE.HIDE:
      peek.left -= dt
      peek.left <= 0 && (peek.phase = PEEK_PHASE.RISE)
      return
    case PEEK_PHASE.RISE:
      if (danger) {
        peek.phase = PEEK_PHASE.BACK
        return
      }
      if (!slideOnWall(inst, dt, peekS(inst))) return
      peek.phase = PEEK_PHASE.LOOK
      peek.left = randomIn(PARAMS.peekMin, PARAMS.peekMax)
  }
}
//
// How far along its way up the wall it stands when only its head shows over
// the lip: the mouth PARAMS.peekHeadOut over the ground.
//
function peekS(inst) {
  const w = inst.wall
  return Math.min(w.turn + w.drop, w.turn + inst.bug.mouth.x * inst.zoom - PARAMS.peekHeadOut)
}
//
// The wall x for a way-up progress s (0 at the lip, w.total at the floor).
//
function wallXAt(w, s) {
  return w.fromX + w.dir * (w.total - s)
}
//
// Slides along the wall to progress s at PARAMS.peekSpeed; true once there.
//
function slideOnWall(inst, dt, s) {
  const w = inst.wall
  const cur = w.total - (inst.x - w.fromX) * w.dir
  const step = Math.sign(s - cur) * Math.min(Math.abs(s - cur), PARAMS.peekSpeed * dt)
  const x = wallXAt(w, cur + step)
  inst.vx = (x - inst.x) / dt
  inst.x = x
  return Math.abs(s - cur) <= ARRIVE_DIST
}
//
// Any crawler segment within reach of the bug, seen or not (it hears it
// through the ground).
//
function crawlerAround(inst, reach) {
  return Boolean(crawlerHead(inst)) && inst.predator.segments.some(seg => Math.abs(seg.x - inst.x) <= reach)
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
  inst.state = STATES.REST
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
  inst.state = STATES.REST
}
function takeBite(inst) {
  const { fruit } = inst.meal
  fruit.picture && TreeFruit.biteForestPictureFruit(fruit, EATER_ON_LEFT, inst.bitesLeft, Math.random)
  inst.bitesLeft -= 1
}
//
// Back to the foot of the shaft's left wall, its front just short of the
// wall, facing it; a short crouch, then up the wall in one jerk.
//
function tickOut(inst, dt) {
  inst.goalX = inst.mouthX1 + inst.frontReach
  if (!walk(inst, dt, inst.rushingOut ? PARAMS.tunnelRush : PARAMS.tunnel)) return
  if (inst.facing !== -1) return startTurn(inst, -1)
  if (inst.turnT < 1) return
  startWall(inst, true)
  inst.dash.active = false
  inst.dash.pauseLeft = PARAMS.climbOutCrouch
  inst.state = STATES.ASCEND
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
// Asked to bite the flower's drop and one hangs full: off to it.
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
// Hurries up to the drop, its mouth by it, and faces it; an apple comes
// first, and a drop gone (shaken loose) sends it off again.
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
// Head aimed at the drop, it bites it off; the water falling right by it
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
  inst.plan = pickOutingPlan(inst)
  if (inst.plan !== PLANS.WANDER) {
    startHunt(inst)
    return
  }
  inst.stateLeft = randomIn(PARAMS.wanderMin, PARAMS.wanderMax)
  inst.goalX = wanderGoal(inst)
  inst.state = STATES.WANDER
}
//
// An outing without an apple: past the trampoline (FIELD_SHARE, when there
// is one), over the lake (lakeShare of the rest) or a stroll.
//
function pickOutingPlan(inst) {
  if (inst.fieldTrampX !== null && Math.random() < FIELD_SHARE) return PLANS.FIELD
  return Math.random() < PARAMS.lakeShare ? PLANS.LAKE : PLANS.WANDER
}
//
// Off to hunt where the plan says: the lake's shore facing west, or past
// the trampoline facing east.
//
function startHunt(inst) {
  const field = inst.plan === PLANS.FIELD
  inst.huntX = field ? inst.fieldTrampX + randomIn(FIELD_STAND_MIN, FIELD_STAND_MAX) : inst.standX
  inst.huntFacing = field ? 1 : -1
  inst.stateLeft = randomIn(PARAMS.huntMin, PARAMS.huntMax)
  inst.state = STATES.HUNT
}
//
// Runs to the doorway left of the burrow (from either side), faces the
// mouth and runs in without its usual pause, so it always goes down with
// its feet on the left wall; it stays in for `hide` seconds.
//
function goToDoor(inst, dt, mode, hide) {
  const side = -1
  inst.goalX = inst.mouthX + side * DOOR_DX
  const arrived = Math.abs(inst.goalX - inst.x) <= ARRIVE_DIST
  if (!arrived && !walk(inst, dt, mode)) return
  if (inst.facing !== -side) return startTurn(inst, -side)
  if (inst.turnT < 1) return
  retractTongue(inst)
  inst.nextHide = hide
  startRush(inst, side < 0 ? inst.mouthX1 : inst.mouthX2, RUN_IN_DURATION)
  inst.state = STATES.SINK
}
function startRush(inst, toX, dur) {
  inst.rush.t = 0
  inst.rush.dur = dur
  inst.rush.fromX = inst.x
  inst.rush.toX = toX
  inst.dash.active = false
  inst.dash.pauseLeft = 0
}
//
// Moves it along the run at an even speed; returns how far along it is
// (0..1).
//
function tickRush(inst, dt) {
  const { rush } = inst
  rush.t = Math.min(1, rush.t + dt / rush.dur)
  const x = rush.fromX + (rush.toX - rush.fromX) * rush.t
  inst.vx = (x - inst.x) / dt
  inst.x = x
  return rush.t
}
//
// Onto the shaft's wall (down from the lip, or up from the cave's floor):
// its usual walk on a flat stand-in ground, turned onto the wall as it is
// drawn. Going down its feet take the wall under the lip it stands on;
// going up, the left wall it faces at the bottom. Walking on, it turns
// round the lip's corner, goes along the wall and turns round in place at
// the bottom.
//
function startWall(inst, up) {
  const dir = inst.facing
  const side = up ? dir : -dir
  const reach = inst.frontReach
  const wallX = side < 0 ? inst.mouthX1 : inst.mouthX2
  const footX = wallX - side * reach
  const floorB = floorY(inst.tunnelFloor, footX)
  const drop = floorB - reach - inst.surfaceY
  const turn = PARAMS.bodyLift * QUARTER_TURN
  const footTurn = reach * QUARTER_TURN
  inst.wall = { up, dir, side, wallX, footX, floorB, drop, turn, footTurn, total: turn + drop + footTurn, fromX: inst.x, cx: 0, cy: 0, a: 0 }
  inst.floor = inst.wallFloor
  inst.goalX = inst.x + dir * (turn + drop + footTurn)
  updateFloor(inst)
  updateWall(inst)
}
//
// Off the wall: on the cave's floor at the foot of the wall it came down
// (in the cave's dark), or on the ground at the lip it climbed to.
//
function leaveWall(inst) {
  const { wall } = inst
  inst.wall = null
  wall.up && (inst.peekWanted = false)
  inst.floor = wall.up ? null : inst.tunnelFloor
  inst.x = wall.up ? wall.wallX : wall.footX
  inst.goalX = inst.x
  inst.dark = wall.up ? 0 : PARAMS.tunnelBugDark
  updateFloor(inst)
  inst.legs.forEach(leg => plantLeg(inst, leg))
}
//
// Where its feet touch (the point under its body on the stand-in ground)
// and how far it is turned, from how far it has walked: at the lip's corner
// while it turns round it, sliding along the wall, then at the bottom round
// a point its front's reach off the wall and the floor (going up, the same
// the other way round). It darkens as it goes down.
//
function updateWall(inst) {
  const w = inst.wall
  const walked = (inst.x - w.fromX) * w.dir
  const s = w.up ? w.turn + w.drop + w.footTurn - walked : walked
  const full = (w.up ? -w.dir : w.dir) * QUARTER_TURN
  if (s < w.turn) {
    w.a = full * Math.max(0, s) / w.turn
    w.cx = w.wallX
    w.cy = inst.surfaceY
  } else if (s < w.turn + w.drop) {
    w.a = full
    w.cx = w.wallX
    w.cy = inst.surfaceY + s - w.turn
  } else {
    const reach = inst.frontReach
    w.a = full * (1 - Math.min(1, (s - w.turn - w.drop) / w.footTurn))
    w.cx = w.footX - reach * Math.sin(w.a)
    w.cy = w.floorB - reach + reach * Math.cos(w.a)
  }
  inst.dark = PARAMS.tunnelBugDark * Math.min(1, Math.max(0, w.cy - inst.surfaceY) / WALL_DARK_DEPTH)
}
//
// A point of its stand-in walk turned onto the wall.
//
function wallPoint(inst, x, y) {
  const w = inst.wall
  const dx = x - inst.x
  const dy = y - (inst.groundY - inst.rise)
  const c = Math.cos(w.a)
  const s = Math.sin(w.a)
  return inst.k.vec2(w.cx + dx * c - dy * s, w.cy + dx * s + dy * c)
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
  if (inst.state === STATES.SINK || inst.state === STATES.FLEE) return
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
  inst.fled = true
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
// A crawler it can see (in front of it only; one behind its back does not
// exist for it) coming closer: it stops, then presses itself to the ground,
// then runs into the burrow; at once if it is close, closing in fast or just
// came into sight near. One eating near it sends it home too, an apple in
// its mouth it keeps (it is going home anyway).
//
function checkCrawler(inst, dt) {
  if (!WATCHFUL.has(inst.state)) {
    inst.wary = null
    inst.crawlerDist = null
    return
  }
  const dist = seenCrawlerDist(inst)
  const prev = inst.crawlerDist
  inst.crawlerDist = dist
  const mealX = PredatorFeast.predatorMealX(inst.predator)
  const eatingNear = mealX !== null && isInFront(inst, mealX) && Math.abs(mealX - inst.x) <= PARAMS.crawlerFearReach
  const sudden = dist !== null && dist <= PARAMS.crawlerCrouchReach &&
    (prev === null || (prev - dist) / dt > PARAMS.crawlerSuddenSpeed)
  if (eatingNear || sudden || (dist !== null && dist <= CRAWLER_NEAR_FEAR)) return fleeFromCrawler(inst)
  if (dist === null || dist > PARAMS.crawlerFreezeReach) {
    inst.wary && newPose(inst)
    inst.wary = null
    return
  }
  inst.wary = dist <= PARAMS.crawlerCrouchReach ? WARY.CROUCH : WARY.FREEZE
}
function fleeFromCrawler(inst) {
  inst.fruit && releaseApple(inst)
  retractTongue(inst)
  inst.wary = null
  inst.headTarget = 0
  inst.fled = true
  inst.nextHide = randomIn(PARAMS.hideMin, PARAMS.hideMax)
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  inst.state = STATES.FLEE
}
//
// Stands still, its tongue in, pressed to the ground when the crawler is
// closer.
//
function tickWary(inst) {
  inst.vx = 0
  inst.dash.active = false
  inst.dash.pauseLeft = 0
  retractTongue(inst)
  inst.liftTarget = PARAMS.bodyLift - (inst.wary === WARY.CROUCH ? PARAMS.crouchDrop : 0)
  inst.pitchTarget = 0
  inst.headTarget = 0
}
//
// Whether a world x lies in front of the bug (the way it faces).
//
function isInFront(inst, x) {
  return (x - inst.x) * inst.facing >= 0
}
//
// How far the nearest crawler segment in front of it is; null when none is
// (no crawler out, or all of it behind the bug).
//
function seenCrawlerDist(inst) {
  if (!crawlerHead(inst)) return null
  let best = null
  for (const seg of inst.predator.segments) {
    if (!isInFront(inst, seg.x)) continue
    const d = Math.abs(seg.x - inst.x)
    best = best === null ? d : Math.min(best, d)
  }
  return best
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
// of where it eats (or of where its head is, out walking).
//
function wanderGoal(inst) {
  const x = randomIn(inst.wanderX1, inst.wanderX2)
  const mealX = PredatorFeast.predatorMealX(inst.predator)
  const head = crawlerHead(inst)
  const fearX = mealX ?? head?.x ?? null
  if (fearX === null) return x
  const reach = mealX === null ? CRAWLER_NEAR_FEAR : PARAMS.crawlerFearReach
  const side = Math.sign(inst.x - fearX) || -1
  const edge = fearX + side * reach
  return side < 0 ? Math.min(x, edge) : Math.max(x, edge)
}
//
// The centipede's head while it is out and shown (null otherwise).
//
function crawlerHead(inst) {
  const pred = inst.predator
  if (!pred?.segments?.length || pred.obj?.hidden) return null
  return pred.segments[0]
}
//
// Dashing aside from where the hero landed; then back to its hunt or stroll.
//
function tickDodge(inst, dt) {
  if (!walk(inst, dt, PARAMS.flee)) return
  inst.state = inst.dodgeBack ?? STATES.WANDER
  inst.dodgeBack = null
  inst.state === STATES.WANDER && (inst.goalX = wanderGoal(inst))
}
//
// The ground under it: flat outside; in the tunnel the floor's height and
// slope round it, the body raised so it stands its usual height off a slope.
//
function updateFloor(inst, dt = 1) {
  if (!inst.floor) {
    //
    // Out in the open the body rides the line the hero's feet use: the mean
    // of its surface under the front and rear feet, eased so a stone's edge
    // does not jerk it.
    //
    const target = (surfaceAt(inst, inst.x - FOOT_SPREAD) + surfaceAt(inst, inst.x + FOOT_SPREAD)) * 0.5
    inst.groundY += (target - inst.groundY) * Math.min(1, dt * SURFACE_SNAP)
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
//
// The ground line's surface under a world X (raycast), flat where it has
// nothing.
//
function surfaceAt(inst, x) {
  return inst.groundLine ? GroundLine.surfaceY(inst.groundLine, x, inst.surfaceY) : inst.surfaceY
}
function floorAt(inst, x) {
  return inst.floor ? floorY(inst.floor, x) : surfaceAt(inst, x)
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
// Legs in two step groups (the picture's: neighbours on a side alternate):
// a lagging foot steps only while no leg of the other group is in the air,
// landing a little ahead of its rest spot.
//
function createLeg(inst, leg) {
  const out = {
    ...leg,
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
// Bug-local point to world: mirrored by facing, round the ground under the
// bug, turned onto the shaft's wall while it is on it.
//
function toWorld(inst, p) {
  const v = toStandIn(inst, p)
  return inst.wall ? wallPoint(inst, v.x, v.y) : inst.k.vec2(v.x, v.y)
}
//
// Bug-local point to world as if it stood on its ground (on the wall: on
// the stand-in ground, not yet turned onto the wall).
//
function toStandIn(inst, p) {
  const { zoom } = inst
  return { x: inst.x + inst.f * p.x * zoom, y: inst.groundY - inst.rise + (p.y - inst.lift) * zoom }
}
function mouthWorld(inst) {
  return toWorld(inst, headPoint(inst, inst.bug.mouth, { x: 0, y: 0 }))
}
function isBugSpanInView(k, x1, x2) {
  const camX = k.camPos().x
  const scale = k.camScale?.()
  const zoom = (typeof scale === 'object' ? scale.x : scale) || 1
  const half = k.width() / (2 * zoom) + 80
  return x2 >= camX - half && x1 <= camX + half
}
//
// The tunnel under the burrow, the apples stored at its far end, those it
// dropped on its way and one being eaten, dim like the bug down there.
//
function onDrawTunnel(inst) {
  if (!isBugSpanInView(inst.k, inst.tunnelPos.x - 40, inst.tunnelPos.x + 280)) return
  EarthMerge.isMerged(inst, inst.tunnel.sprite) || inst.k.drawSprite({ sprite: inst.tunnel.sprite, pos: inst.tunnelPos })
  for (let i = 0; i < inst.pile.length; i++) drawTunnelApple(inst, inst.pile[i])
  for (let i = 0; i < inst.loose.length; i++) drawTunnelApple(inst, inst.loose[i])
  inst.meal && drawTunnelApple(inst, inst.meal)
}
function drawTunnelApple(inst, { fruit, x, y }) {
  TreeFruit.drawForestFruitAt(inst.k, fruit, x, y)
  TreeFruit.drawForestFruitAt(inst.k, fruit, x, y, { opacity: PARAMS.tunnelBugDark, color: inst.deepColor })
}
//
// The bug in its own colours, then the dark of where it is over them (in
// the cave, a little darker than up on the ground); the tongue goes last.
//
function onDraw(inst) {
  const reach = inst.frontReach + 120
  if (!isBugSpanInView(inst.k, inst.x - reach, inst.x + reach)) return
  const sgn = Math.sign(inst.f) || inst.facing
  const legs = inst.legs.map(leg => solveLeg(inst, leg, sgn))
  inst.dark < 1 && drawBody(inst, legs, { opacity: 1, color: null, farColor: inst.farTint })
  inst.dark > 0 && drawBody(inst, legs, { opacity: inst.dark, color: inst.deepColor, farColor: inst.deepColor })
  inst.tongue.phase !== TONGUE.IDLE && drawTongue(inst)
}
//
// Far legs and antenna, body, head, near legs, the leaf hood over the body
// (the head looks out of its open front) and near antenna from one atlas, then the apple it
// carries, all in one look.
//
function drawBody(inst, legs, look) {
  const { bug } = inst
  legs.forEach((joints, i) => inst.legs[i].far && drawLeg(inst, inst.legs[i], joints, look, look.farColor))
  drawAntenna(inst, bug.antennaFar, bug.antennaFarAt, 1, ANTENNA_FAR_PHASE, look)
  drawPart(inst, bug.body, { x: 0, y: 0 }, inst.pitch, 1, look)
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
  const { posScratch, anchorScratch, scaleScratch } = inst
  const w = toWorld(inst, at)
  posScratch.x = w.x
  posScratch.y = w.y
  anchorScratch.x = part.anchor.x
  anchorScratch.y = part.anchor.y
  scaleScratch.x = inst.f * mirror * inst.zoom
  scaleScratch.y = inst.zoom
  inst.k.drawSprite({
    sprite: part.tile.name,
    quad: part.tile.quad,
    width: part.tile.tileW,
    height: part.tile.tileH,
    pos: posScratch,
    anchor: anchorScratch,
    angle: (sgn * angle + (inst.wall ? inst.wall.a : 0)) * RAD_TO_DEG,
    scale: scaleScratch,
    opacity: look.opacity,
    ...(color ? { color } : {})
  })
}
function drawAntenna(inst, part, at, mirror, phase, look) {
  const wave = inst.antenna + ANTENNA_SWAY * Math.sin(inst.time * ANTENNA_SPEED + phase) * 0.5
  drawPart(inst, part, headPoint(inst, at, { x: 0, y: 0 }), inst.pitch + inst.head + wave, mirror, look)
}
//
// Inverse kinematics of one leg in the bug's local frame (unmirrored): hip,
// knee and sole solve as two bones with the knee out on the leg's own side
// (front legs forward, the others back), which is also its upper side: the
// thigh from the hip, the foot from the knee down to its sole.
//
function solveLeg(inst, leg, sgn) {
  const [femur, tibia] = leg.pieces
  const hip = bodyPoint(inst, leg.hip, { x: 0, y: 0 })
  const floorDy = (floorAt(inst, leg.footX) - inst.groundY) / inst.zoom
  const foot = { x: (leg.footX - inst.x) * sgn / inst.zoom, y: inst.lift - leg.footLift + floorDy }
  const dx = foot.x - hip.x
  const dy = foot.y - hip.y
  const reach = Math.hypot(dx, dy)
  const d = Math.max(Math.abs(femur.len - tibia.len) + IK_SLACK, Math.min(femur.len + tibia.len - IK_SLACK, reach))
  const base = Math.atan2(dy, dx)
  const cosKnee = (femur.len * femur.len + d * d - tibia.len * tibia.len) / (2 * femur.len * d)
  const bend = Math.acos(Math.max(-1, Math.min(1, cosKnee)))
  const kneeA = { x: hip.x + Math.cos(base + bend) * femur.len, y: hip.y + Math.sin(base + bend) * femur.len }
  const kneeB = { x: hip.x + Math.cos(base - bend) * femur.len, y: hip.y + Math.sin(base - bend) * femur.len }
  const side = leg.place > 0 ? 1 : -1
  const knee = (kneeA.x - kneeB.x) * side > 0 ? kneeA : kneeB
  const shin = Math.atan2(foot.y - knee.y, foot.x - knee.x)
  const sole = { x: knee.x + Math.cos(shin) * tibia.len, y: knee.y + Math.sin(shin) * tibia.len }
  return [hip, knee, sole]
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
  const r = inst.fruit.r * inst.zoom
  const put = inst.put
  const u = put ? 1 - Math.max(0, inst.stateLeft) / PUT_DURATION : 0
  const mouth = toStandIn(inst, headPoint(inst, inst.bug.mouth, { x: 0, y: 0 }))
  const holdX = mouth.x + inst.f * r * APPLE_HOLD_AHEAD
  const holdY = mouth.y + r * APPLE_HOLD_DROP
  const x = put ? holdX + (put.x - holdX) * u : holdX
  const y = put ? holdY + (put.y - holdY) * u : holdY
  const at = inst.wall ? wallPoint(inst, x, y) : { x, y }
  TreeFruit.drawForestFruitAt(inst.k, inst.fruit, at.x, at.y, { zoom: inst.zoom, opacity: look.opacity, color: look.color })
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
