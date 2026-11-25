import { getRGB } from '../../../utils/helper.js'
import { createSeededRandom } from '../../../utils/seeded-random.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Layout from '../utils/cave-layout.js'
import * as Surface from '../utils/cave-surface.js'
//
// The climber (haggy_waggy.png): a head on five long thin soft arms, each
// ending in a three-clawed hand. The arms work like the lurker's neck — a
// strip of scales drawn along a curve from under the head to the wrist,
// bending every way, swaying, sliding out longer as it reaches. The
// fingers bend: open while a hand reaches, curled shut once it has hold —
// its claws hooked right onto the edge of the soil.
//
// It climbs the platforms, somewhere between a sloth, an orangutan and an
// octopus: one hand lets go, reaches on and takes hold, the body pulls
// itself after it, then the next hand. Climbing it works three of its arms
// that way; the other two just hang. It keeps to the platforms' outline
// (cave-surface.js's crawl runs), its hands on their edges, in one of
// three ways along a stretch of its way:
// - out in the air off the edge: hanging under a ceiling, clinging to a
//   side, or — on a top — walking on four of its arms like a cow, the
//   fifth free to reach for a firefly passing by and snatch it;
// - behind the platform, its head half hidden behind the edge it holds
//   (drawn behind the soil; only its hands come round the edge in front);
// - on the platform's face, in front of the soil, its hands on the face.
// It changes between behind and in front only out in the open air, where
// nothing shows the change. It never goes where the lake's water is (nor
// over it close by): it gets past the lake round its sides — up over the
// hall's ceiling or down along the slab's underside. Its head faces the
// way it goes, mirrored.
//
const SPRITE = 'cave0-haggy-v2'
const GRAIN_SEED = 9710
const C = CAVE_CFG.haggy
//
// Sizes: world px per sheet px of the head and of the arm (with its hand);
// the atlas is baked BAKE_OVER times finer, its pieces ATLAS_GAP px apart.
//
const HEAD_SCALE = 0.14
const ARM_SCALE = 0.1
const BAKE_OVER = 2.5
const ATLAS_GAP = 4
//
// The pieces (Atlas): the head by its middle;
// the arm piece's place on the sheet (the hand's cuts below are in sheet
// px); the arm's scales: a stretch of its tube (TILE, in the arm piece)
// made into a tile that repeats along the arm, its last TILE_BLEND
// columns faded into the columns before its first.
//
const HEAD = { piece: 'haggyHead', pivot: { x: 287, y: 231 } }
const ARM_PIECE = 'haggyArm'
const ARM_AT = { x: 236, y: 410 }
const TILE = { x: 94, y: 152, w: 880, h: 122 }
const TILE_BLEND = 60
const TILE_INSET = 0.01
//
// The hand (sheet px): the palm cut out (drawn over the fingers' roots,
// its pivot the wrist) and three fingers, each with its claw one strip of
// its own along its spine (root to claw tip, `widths` px each side at its
// points, smoothed into FINGER_SUBS pieces per span; cut out by its
// `cuts`). A finger bends smoothly, no rigid pieces and no notch at a
// joint: `turn` rad at a full curl (1) spread over KNUCKLE_BEND px from
// where it leaves the palm, its claw `hook` rad more over JOINT_BEND px
// round its joint; open wide they bend the other way (curl below 0).
//
const WRIST = { x: 1270, y: 623 }
const PALM = { poly: [[1240, 560], [1330, 558], [1392, 532], [1432, 562], [1424, 596], [1432, 640], [1420, 664], [1436, 702], [1392, 724], [1330, 708], [1240, 710]], pivot: WRIST }
const FINGERS = [
  {
    cuts: [
      [[1362, 596], [1384, 540], [1440, 466], [1478, 438], [1502, 450], [1508, 482], [1490, 502], [1442, 588], [1408, 616]],
      [[1462, 446], [1480, 428], [1540, 416], [1572, 440], [1570, 454], [1530, 457], [1512, 484], [1486, 488], [1466, 470]]
    ],
    spine: [[1360, 620], [1405, 575], [1450, 500], [1490, 456], [1530, 438], [1578, 452]],
    widths: [48, 48, 46, 40, 34, 30],
    joint: { x: 1488, y: 462 },
    turn: 0.55,
    hook: 0.75
  },
  {
    cuts: [
      [[1385, 598], [1420, 590], [1540, 578], [1562, 588], [1566, 640], [1546, 652], [1420, 658], [1385, 652]],
      [[1546, 594], [1566, 584], [1602, 594], [1634, 630], [1638, 654], [1622, 652], [1590, 642], [1562, 648], [1546, 634]]
    ],
    spine: [[1370, 624], [1420, 623], [1500, 622], [1558, 620], [1600, 626], [1642, 662]],
    widths: [48, 48, 46, 44, 40, 30],
    joint: { x: 1558, y: 616 },
    turn: 0,
    hook: 0.55
  },
  {
    cuts: [
      [[1368, 664], [1412, 638], [1442, 680], [1488, 744], [1494, 772], [1472, 798], [1450, 792], [1398, 722], [1364, 702]],
      [[1446, 772], [1470, 754], [1494, 764], [1532, 790], [1552, 806], [1546, 816], [1500, 824], [1464, 812], [1446, 794]]
    ],
    spine: [[1370, 660], [1400, 700], [1440, 745], [1470, 778], [1505, 800], [1556, 816]],
    widths: [48, 48, 44, 40, 36, 30],
    joint: { x: 1470, y: 784 },
    turn: -0.55,
    hook: -0.75
  }
]
const FINGER_SUBS = 4
const KNUCKLE_BEND = 40
const JOINT_BEND = 36
//
// Arms: how many; each leaves the body SHOULDER_R px from its middle
// toward its hand and runs to the wrist as a curve of ARM_SEGS pieces: it
// leaves along the way to the hand and comes into the wrist along the
// hand's own way (over AXIS_REACH px at most), each end reaching
// CTRL_SHARE of the span. Shorter than REST_LEN it is slack: it bows
// aside (BOW of the slack, each arm to its own side) and sags (SAG);
// always it sways SWAY_PX at SWAY_HZ. Its strip is HALF_W px wide each
// side.
//
const ARMS = 5
const ARM_SEGS = 14
const SHOULDER_R = 8
const CTRL_SHARE = 0.36
const AXIS_REACH = 40
const REST_LEN = 130
const BOW = 0.55
const SAG = 0.22
const SWAY_PX = 3
const SWAY_HZ = 0.45
const HALF_W = TILE.h * ARM_SCALE * 0.5
//
// Hands: the wrist stands WRIST_OUT px back from the point it holds, along
// the hand's own way — as far as its curled claws reach, so their tips
// hook onto the very edge of the soil. Fingers ease to their curl at
// CURL_RATE per s: shut
// (CURL_GRIP) holding on, wide open (CURL_OPEN) reaching, loose
// (CURL_FREE) hanging free. A walking foot lies along the ground, FOOT_LIFT
// px over it: it points FOOT_FWD along the way it walks and FOOT_DOWN into
// the ground.
//
const WRIST_OUT = 27
const CURL_RATE = 9
const CURL_GRIP = 1
const CURL_OPEN = -0.35
const CURL_FREE = 0.25
const FOOT_DOWN = 0.3
const FOOT_FWD = 0.95
const FOOT_LIFT = 6
//
// The ways along a stretch (MODE) and the layer each needs (LAYER): the
// body's place off an edge point along its outward normal — out in the
// air (hanging HANG_H under a ceiling whose normal points down past
// CEIL_NY, WALK_H over a top whose normal points up past TOP_NY, SIDE_H
// off a side; where there is no room that far out, TIGHT_SHARES of it, so
// it gets through narrow places closer in), behind the soil BEHIND_OUT px
// out from the edge (its head half hidden behind it; only where the soil
// is BEHIND_PROBE px deep), FACE_IN px inside the outline on its face
// (only where soil lies FACE_ROOM px all round there). Out in the air the
// body needs BODY_R px of room and stays EDGE px inside the world.
//
const MODE = { OUT: 'out', BEHIND: 'behind', FACE: 'face' }
const LAYER = { BACK: 'back', FRONT: 'front' }
const LAYER_OF = { [MODE.BEHIND]: LAYER.BACK, [MODE.FACE]: LAYER.FRONT }
const HANG_H = 108
const WALK_H = 72
const SIDE_H = 86
const CEIL_NY = 0.5
const TOP_NY = 0.75
const BEHIND_OUT = 8
const BEHIND_PROBE = 14
const FACE_IN = 55
const FACE_ROOM = 30
const TIGHT_SHARES = [1, 0.75, 0.55, 0.4]
const BODY_R = 26
const EDGE = 24
//
// The lake it keeps out of: its water's span LAKE_PAD px wider, from
// LAKE_OVER px over its surface down to LAKE_DEEP px under it, and the
// banks' hollows HOLLOW_PAD px wider.
//
const LAKE_PAD = 40
const LAKE_OVER = 80
const LAKE_DEEP = 320
const HOLLOW_PAD = 40
//
// Its ways: a node every NODE_STEP px of the outline (where it has room
// out in the air), joined to the next along the outline and — through the
// open air, never over the lake — to any other whose place lies within
// LINK_MAX px (checked every LINK_CHECK px, LINK_ROOM px of room); the
// points a hand may hold lie every GRIP_STEP px of it, looked up in
// GRID px cells.
//
const NODE_STEP = 28
const GRIP_STEP = 8
const LINK_MAX = 200
const LINK_CHECK = 20
const LINK_ROOM = 18
const GRID = 64
//
// A way is cut into stretches of STRETCH_MIN..+RANGE nodes, each walked in
// one way picked by MODE_SHARES (out, behind, on the face); after a
// stretch behind or on the face come OUT_BETWEEN nodes out in the air (it
// changes layer there). A goal is a node picked at random — HERO_SHARE of
// the time one within HERO_R px of the hero, so it is about where he is —
// and reached, it rests REST..+RANGE s.
//
const STRETCH_MIN = 6
const STRETCH_RANGE = 9
const MODE_SHARES = [0.45, 0.3, 0.25]
const OUT_BETWEEN = 3
const HERO_SHARE = 0.55
const HERO_R = 700
const REST = 2
const REST_RANGE = 4
const START_SPOT = { x: 620, y: 470 }
//
// Moving: CLIMB_SPEED px/s pulling itself along (WALK_SPEED walking),
// only REACH_SHARE of that while a hand reaches (WALK_REACH_SHARE
// walking: a cow never stops), PULL_BOOST times it for PULL_TIME s after
// a hand has taken hold — the pull; the speed eases at ACCEL per s and
// the body follows its place on the way at FOLLOW per s. Its head bobs
// BOB_PX at BOB_HZ, tilts TILT rad with the way it goes (eased at
// TILT_RATE) and turns to face it once it moves FACE_SPEED px/s sideways.
//
const CLIMB_SPEED = 62
const WALK_SPEED = 44
const REACH_SHARE = 0.22
const WALK_REACH_SHARE = 0.8
const PULL_BOOST = 1.35
const PULL_TIME = 0.3
const ACCEL = 7
const FOLLOW = 6
const BOB_PX = 2
const BOB_HZ = 0.5
const TILT = 0.3
const TILT_RATE = 4
const FACE_SPEED = 6
//
// Where each hand wants to hold, along the edge from under the body
// (px along the outline's tangent), climbing, behind the edge and walking;
// on the face, round the body at FACE_ANGLES rad off the outward normal,
// FACE_R px out. Climbing (any way but walking) only three arms work; the
// HANG_ARMS hold nothing and just hang. Walking, four arms are its legs
// and the FREE_ARM holds nothing. A hand holds the
// edge point nearest that within SEARCH px, no farther than ARM_REACH from
// the body nor nearer than ARM_MIN, GRIP_GAP px clear of the other hands'.
// It steps once its hold lies STRIDE px (WALK_STRIDE walking) off where it
// wants to be — the one worst off first, CLIMB_REACHES at a time
// (WALK_REACHES walking), STEP_GAP s after the last one took hold — to a
// hold LEAD px on along the way (WALK_LEAD walking). A hold farther than
// ARM_MAX from the body is let go. An arm that finds no hold tries again
// RETRY s later.
//
const OFFS_CLIMB = [-100, 0, 0, 0, 100]
const OFFS_BEHIND = [-112, 0, -40, 0, 94]
const OFFS_WALK = [-64, -26, 0, 26, 64]
const HANG_ARMS = [1, 3]
const FREE_ARM = 2
const FACE_ANGLES = [-2.2, 0, 0, 0, 2.2]
const FACE_R = 122
const SEARCH = 80
const ARM_REACH = 245
const ARM_MIN = 24
const ARM_MAX = 285
const GRIP_GAP = 30
const STRIDE = 60
const WALK_STRIDE = 30
const CLIMB_REACHES = 1
const WALK_REACHES = 2
const STEP_GAP = 0.22
const LEAD = 76
const WALK_LEAD = 36
const RETRY = 0.4
const FREE_NEED = 1e6
const SAME_HOLD = 6
//
// A reach: the hand flies to its new hold at REACH_SPEED px/s (taking
// REACH_MIN..REACH_MAX s), lifted LIFT px off the surface on the way; in
// the back layer it shows in front of the soil from REACH_FRONT of the
// way on (it comes round the edge).
//
const REACH_SPEED = 260
const REACH_MIN = 0.28
const REACH_MAX = 0.55
const LIFT = 24
const REACH_FRONT = 0.8
//
// A free hand: hanging loose DANGLE px under the body, DANGLE_APART px to
// its own side (an arm that just hangs, or one with no hold), or — the
// walker's free arm — held FREE_R px out, up and ahead
// (FREE_UP), circling WAVE_PX at WAVE_HZ, and going for a firefly within
// GRAB_R px of the body: its claws' tips (TIP px past the wrist) within
// GRAB_NEAR px of it snatch it, the hand shut for SNAP s. It moves at
// FREE_EASE per s.
//
const DANGLE = 92
const DANGLE_APART = 14
const FREE_R = 84
const FREE_UP = 0.8
const WAVE_PX = 8
const WAVE_HZ = 0.3
const GRAB_R = 190
const TIP = 34
const GRAB_NEAR = 12
const SNAP = 0.5
const FREE_EASE = 5
//
// Changing layer needs the body CLEAR_R px clear of the soil and none of
// its arms over it (checked at CLEAR_AT of each arm's pieces).
//
const CLEAR_R = 26
const CLEAR_AT = [4, 7, 10]
const CULL_PAD = ARM_MAX + 80
const MAX_DT = 0.05
const HALF = 0.5
const FULL_TURN = Math.PI * 2
const DEG = 180 / Math.PI
const BYTE_MAX = 255
const HEX_RADIX = 16
const atlasFor = new WeakMap()
const indicesFor = new Map()
let atlas = null
let rigs = null
let nav = null

/**
 * Creates the climber (hanging under the hall's ceiling at first).
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.seed - Seed of its moves
 * @returns {Object} Climber instance
 */
export function create(cfg) {
  const { k } = cfg
  bake(k)
  nav ??= buildNav()
  const rng = createSeededRandom(cfg.seed)
  const start = nearestNode(START_SPOT.x, START_SPOT.y)
  const inst = {
    k,
    rng,
    time: 0,
    layer: LAYER.FRONT,
    path: [start, start],
    modes: [MODE.OUT, MODE.OUT],
    seg: 0,
    u: 0,
    speed: 0,
    restFor: REST,
    pullFor: 0,
    landedAt: 0,
    carrot: { x: start?.ox ?? 0, y: start?.oy ?? 0 },
    body: { x: start?.ox ?? 0, y: start?.oy ?? 0 },
    frame: { nx: start?.nx ?? 0, ny: start?.ny ?? 1, h: start?.h ?? HANG_H, mode: MODE.OUT, walk: false, dx: 1, dy: 0 },
    flip: false,
    tilt: 0,
    arms: Array.from({ length: ARMS }, (_, i) => createArm(rng, i)),
    ideal: { x: 0, y: 0 },
    pa: { x: 0, y: 0, h: 0 },
    pb: { x: 0, y: 0, h: 0 },
    v: k.vec2(0, 0),
    color: getRGB(k, C.tint)
  }
  inst.arms.forEach(arm => layArm(inst, arm))
  return inst
}

/**
 * Runs it on: its way, its layer, its hands (letting go, reaching, taking
 * hold; the free one after a firefly), its head.
 * @param {Object} inst - Climber instance
 * @param {Object} ctx
 * @param {{x: number, y: number}|null} ctx.hero - The hero's centre (it roams about where he is), else null
 * @param {Array<{x: number, y: number}>} ctx.prey - Fireflies its free hand may snatch
 * @param {(f: Object) => void} ctx.onEat - A firefly is snatched
 */
export function onUpdate(inst, ctx) {
  if (!nav || !inst.path[0]) return
  const dt = Math.min(inst.k.dt(), MAX_DT)
  inst.time += dt
  updateTravel(inst, ctx, dt)
  updateLayer(inst)
  updateArms(inst, ctx, dt)
  updateHead(inst, dt)
}

/**
 * Draws it in one of the level's two passes: behind the soil (its arms
 * and head while it is behind a platform, and a hand hanging free) or in
 * front of it (all of it while it is in front; else only the hands that
 * hold an edge, come round it).
 * @param {Object} inst - Climber instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - Visible world rect
 * @param {boolean} front - The pass in front of the soil
 */
export function onDraw(inst, view, front) {
  const parts = atlasFor.get(inst.k)
  if (!parts || !inst.path[0] || !inView(inst, view)) return
  const whole = (inst.layer === LAYER.FRONT) === front
  whole && inst.arms.forEach(arm => drawArm(inst, arm, parts))
  inst.arms.forEach(arm => handInFront(inst, arm) === front && drawHand(inst, arm, parts))
  whole && drawHead(inst, parts)
}
//
// An arm: its wrist and the way its hand points, what it holds (grip) or
// flies to (reach), its fingers' curl, its curve's points (with their
// length from the shoulder) and the vectors its strip is drawn with (its
// own: reused every frame).
//
function createArm(rng, i) {
  return {
    wrist: { x: 0, y: 0 },
    ax: 0,
    ay: 1,
    grip: null,
    reach: null,
    retryAt: 0,
    snap: 0,
    curl: CURL_FREE,
    side: i % 2 ? -1 : 1,
    phase: rng() * FULL_TURN,
    len: 0,
    spine: Array.from({ length: ARM_SEGS + 1 }, () => ({ x: 0, y: 0, s: 0 })),
    hangX: (i - FREE_ARM) * DANGLE_APART,
    fingers: [],
    pts: [],
    uv: [],
    pool: [],
    uvPool: []
  }
}
//
// Its way: resting at a goal, then a new way; else its place moved on
// along the way at its pulsing speed, the frame there (the edge's normal,
// how far off it, which way along) and the body after it.
//
function updateTravel(inst, ctx, dt) {
  if (inst.restFor > 0) {
    inst.restFor -= dt
    inst.restFor <= 0 && plan(inst, ctx)
  }
  const reaching = inst.arms.some(arm => arm.reach)
  const f = inst.frame
  const cruise = f.walk ? WALK_SPEED : CLIMB_SPEED
  const slow = f.walk ? WALK_REACH_SHARE : REACH_SHARE
  inst.pullFor = Math.max(0, inst.pullFor - dt)
  const want = inst.restFor > 0 ? 0 : cruise * (reaching ? slow : 1) * (inst.pullFor > 0 ? PULL_BOOST : 1)
  inst.speed += (want - inst.speed) * Math.min(1, ACCEL * dt)
  advance(inst, inst.speed * dt)
  placeFrame(inst)
  const ease = 1 - Math.exp(-FOLLOW * dt)
  inst.body.x += (inst.carrot.x - inst.body.x) * ease
  inst.body.y += (inst.carrot.y - inst.body.y) * ease
}
//
// Moves its place `dist` px on along the way; at its end it rests.
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
  if (inst.seg >= inst.path.length - 1 && inst.restFor <= 0) {
    inst.seg = Math.max(0, inst.path.length - 2)
    inst.u = 1
    inst.restFor = REST + inst.rng() * REST_RANGE
  }
}
function segLength(inst, seg) {
  const a = nodePlace(inst, seg, inst.pa)
  const b = nodePlace(inst, seg + 1, inst.pb)
  return Math.max(1, Math.hypot(b.x - a.x, b.y - a.y))
}
//
// The body's place at a node of the way, in the way it is walked there
// (out in the air while its layer is still the other one).
//
function nodePlace(inst, i, out) {
  const node = inst.path[i]
  const mode = modeAt(inst, i)
  out.h = mode === MODE.OUT ? node.h : mode === MODE.BEHIND ? BEHIND_OUT : -FACE_IN
  out.x = node.x + node.nx * out.h
  out.y = node.y + node.ny * out.h
  return out
}
function modeAt(inst, i) {
  const want = inst.modes[i]
  return want !== MODE.OUT && LAYER_OF[want] !== inst.layer ? MODE.OUT : want
}
//
// The frame at its place between two nodes of the way.
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
  const nl = Math.hypot(nx, ny) || 1
  f.nx = nx / nl
  f.ny = ny / nl
  f.h = a.h + (b.h - a.h) * u
  const near = u < HALF ? seg : seg + 1
  f.mode = modeAt(inst, near)
  f.walk = f.mode === MODE.OUT && inst.path[near].top
  const dl = Math.hypot(b.x - a.x, b.y - a.y)
  if (dl > 1 && inst.restFor <= 0) {
    f.dx = (b.x - a.x) / dl
    f.dy = (b.y - a.y) / dl
  }
}
//
// A new way: to a goal picked at random (often one near the hero), cut
// into stretches each walked in one way where the nodes allow it.
//
function plan(inst, ctx) {
  const from = inst.path[Math.min(inst.seg + 1, inst.path.length - 1)]
  const goal = pickGoal(inst, ctx, from)
  const way = findWay(from, goal)
  if (way.length < 2) {
    inst.restFor = REST
    return
  }
  inst.path = way
  inst.modes = stretchModes(inst, way)
  inst.seg = 0
  inst.u = 0
}
function pickGoal(inst, ctx, from) {
  const all = nav.nodes.filter(node => node.group === from.group && node !== from)
  const hero = ctx.hero
  const near = hero && inst.rng() < HERO_SHARE ? all.filter(node => Math.hypot(node.ox - hero.x, node.oy - hero.y) < HERO_R) : []
  const pool = near.length ? near : all
  return pool[Math.floor(inst.rng() * pool.length)] ?? from
}
//
// Each node's way along a path: stretches of one way each (where the
// node has no room for it, out in the air), OUT_BETWEEN nodes out in the
// air after a stretch behind or on the face.
//
function stretchModes(inst, way) {
  const modes = []
  let mode = MODE.OUT
  let left = 0
  way.forEach(node => {
    if (left <= 0) {
      const wasIn = mode !== MODE.OUT
      mode = wasIn ? MODE.OUT : pickMode(inst)
      left = wasIn ? OUT_BETWEEN : STRETCH_MIN + Math.floor(inst.rng() * (STRETCH_RANGE + 1))
    }
    left--
    modes.push(mode === MODE.BEHIND && !node.behind ? MODE.OUT : mode === MODE.FACE && !node.face ? MODE.OUT : mode)
  })
  modes[modes.length - 1] = MODE.OUT
  return modes
}
function pickMode(inst) {
  const r = inst.rng()
  return r < MODE_SHARES[0] ? MODE.OUT : r < MODE_SHARES[0] + MODE_SHARES[1] ? MODE.BEHIND : MODE.FACE
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
  return inst.arms.every(arm => CLEAR_AT.every(i => !Surface.isSoil(arm.spine[i].x, arm.spine[i].y)))
}
//
// Its hands: the flying ones flown on, one more sent off if it is time,
// then each arm's free hand moved, its over-stretched hold let go, its
// fingers eased and its curve laid.
//
function updateArms(inst, ctx, dt) {
  let reaching = 0
  inst.arms.forEach(arm => {
    arm.reach && flyOn(inst, arm, dt)
    arm.reach && reaching++
  })
  const limit = inst.frame.walk ? WALK_REACHES : CLIMB_REACHES
  reaching < limit && inst.time - inst.landedAt >= STEP_GAP && startStep(inst)
  inst.arms.forEach((arm, i) => {
    arm.snap = Math.max(0, arm.snap - dt)
    arm.grip && tooFar(inst, arm) && (arm.grip = null)
    arm.grip && holdsNothing(inst, i) && (arm.grip = null)
    arm.grip || arm.reach || moveFree(inst, arm, i, ctx, dt)
    arm.curl += (curlWanted(arm) - arm.curl) * Math.min(1, CURL_RATE * dt)
    layArm(inst, arm)
  })
}
function tooFar(inst, arm) {
  return Math.hypot(arm.wrist.x - inst.body.x, arm.wrist.y - inst.body.y) > ARM_MAX
}
//
// Whether arm i holds nothing here: walking, its free arm; climbing, the
// two that just hang.
//
function holdsNothing(inst, i) {
  return inst.frame.walk ? i === FREE_ARM : HANG_ARMS.includes(i)
}
function curlWanted(arm) {
  if (arm.grip || arm.snap > 0) return CURL_GRIP
  return arm.reach ? CURL_OPEN : CURL_FREE
}
//
// Sends the hand worst off its place to a new hold (an arm holding
// nothing first); one that finds none, or only the hold it has, waits.
//
function startStep(inst) {
  const stride = inst.frame.walk ? WALK_STRIDE : STRIDE
  let pick = -1
  let worst = stride
  inst.arms.forEach((arm, i) => {
    if (arm.reach || holdsNothing(inst, i) || inst.time < arm.retryAt) return
    const need = arm.grip ? holdError(inst, arm, i) : FREE_NEED
    if (need <= worst) return
    worst = need
    pick = i
  })
  if (pick < 0) return
  const arm = inst.arms[pick]
  const to = gripFor(inst, pick, inst.restFor > 0 ? 0 : inst.frame.walk ? WALK_LEAD : LEAD)
  if (!to || (arm.grip && Math.hypot(to.gx - arm.grip.gx, to.gy - arm.grip.gy) < SAME_HOLD)) {
    arm.retryAt = inst.time + RETRY
    return
  }
  const dist = Math.hypot(to.x - arm.wrist.x, to.y - arm.wrist.y)
  arm.reach = { fx: arm.wrist.x, fy: arm.wrist.y, fax: arm.ax, fay: arm.ay, to, t: 0, dur: Math.max(REACH_MIN, Math.min(REACH_MAX, dist / REACH_SPEED)) }
  arm.grip = null
}
function holdError(inst, arm, i) {
  const ideal = idealFor(inst, i, 0, inst.ideal)
  return Math.hypot(arm.grip.gx - ideal.x, arm.grip.gy - ideal.y)
}
//
// A flying hand: eased from where it let go to its new hold, lifted off
// the surface on the way, turning to the hold's way; there, it takes hold
// (and the body pulls).
//
function flyOn(inst, arm, dt) {
  const r = arm.reach
  r.t = Math.min(1, r.t + dt / r.dur)
  const e = r.t * r.t * (3 - 2 * r.t)
  const lift = Math.sin(r.t * Math.PI) * LIFT
  arm.wrist.x = r.fx + (r.to.x - r.fx) * e - r.to.ax * lift
  arm.wrist.y = r.fy + (r.to.y - r.fy) * e - r.to.ay * lift
  setAxis(arm, r.fax + (r.to.ax - r.fax) * e, r.fay + (r.to.ay - r.fay) * e)
  if (r.t < 1) return
  arm.grip = r.to
  arm.reach = null
  inst.landedAt = inst.time
  inst.pullFor = PULL_TIME
}
function setAxis(arm, x, y) {
  const l = Math.hypot(x, y)
  if (l < HALF * HALF) return
  arm.ax = x / l
  arm.ay = y / l
}
//
// Where hand i wants to hold with the body `lead` px on along its way: on
// the face, round the body; else on the edge under the body, its own
// distance along it.
//
function idealFor(inst, i, lead, out) {
  const f = inst.frame
  const bx = inst.carrot.x + f.dx * lead
  const by = inst.carrot.y + f.dy * lead
  if (f.mode === MODE.FACE) {
    const c = Math.cos(FACE_ANGLES[i])
    const s = Math.sin(FACE_ANGLES[i])
    out.x = bx + (f.nx * c - f.ny * s) * FACE_R
    out.y = by + (f.nx * s + f.ny * c) * FACE_R
    return out
  }
  const off = (f.mode === MODE.BEHIND ? OFFS_BEHIND : f.walk ? OFFS_WALK : OFFS_CLIMB)[i]
  out.x = bx - f.nx * f.h - f.ny * off
  out.y = by - f.ny * f.h + f.nx * off
  return out
}
//
// A hold for hand i: on the face the very spot it wants (if soil is
// there), else the edge point nearest it that the arm reaches and no
// other hand has; null if there is none.
//
function gripFor(inst, i, lead) {
  const f = inst.frame
  const ideal = idealFor(inst, i, lead, inst.ideal)
  const bx = inst.body.x + f.dx * lead
  const by = inst.body.y + f.dy * lead
  if (f.mode === MODE.FACE && Surface.isSoil(ideal.x, ideal.y) && !inLakeZone(ideal.x, ideal.y)) return faceGrip(ideal, bx, by)
  let best = null
  let bestD = SEARCH
  gripsNear(ideal.x, ideal.y, SEARCH).forEach(g => {
    const d = Math.hypot(g.x - ideal.x, g.y - ideal.y)
    const reach = Math.hypot(g.x - bx, g.y - by)
    if (d >= bestD || reach > ARM_REACH || reach < ARM_MIN || isTaken(inst, i, g)) return
    best = g
    bestD = d
  })
  return best && edgeGrip(inst, best)
}
function isTaken(inst, i, g) {
  return inst.arms.some((arm, j) => {
    const hold = j !== i && (arm.grip ?? arm.reach?.to)
    return hold && Math.hypot(hold.gx - g.x, hold.gy - g.y) < GRIP_GAP
  })
}
//
// A hold on an edge point: the hand points into the soil, its wrist back
// out from the point; a walking foot lies along the ground over it.
//
function edgeGrip(inst, g) {
  const f = inst.frame
  if (!f.walk) return { gx: g.x, gy: g.y, x: g.x + g.nx * WRIST_OUT, y: g.y + g.ny * WRIST_OUT, ax: -g.nx, ay: -g.ny }
  const fx = -g.nx * FOOT_DOWN + f.dx * FOOT_FWD
  const fy = -g.ny * FOOT_DOWN + f.dy * FOOT_FWD
  const l = Math.hypot(fx, fy) || 1
  const ax = fx / l
  const ay = fy / l
  return { gx: g.x, gy: g.y, x: g.x + g.nx * FOOT_LIFT - ax * WRIST_OUT, y: g.y + g.ny * FOOT_LIFT - ay * WRIST_OUT, ax, ay }
}
//
// A hold on the soil's face: the hand points on out from the body.
//
function faceGrip(at, bx, by) {
  const l = Math.hypot(at.x - bx, at.y - by) || 1
  const ax = (at.x - bx) / l
  const ay = (at.y - by) / l
  return { gx: at.x, gy: at.y, x: at.x - ax * WRIST_OUT, y: at.y - ay * WRIST_OUT, ax, ay }
}
//
// A hand holding nothing: the walker's free arm held up ahead, circling,
// or after a firefly near by (snatched once its claws reach it); any
// other hanging loose under the body.
//
function moveFree(inst, arm, i, ctx, dt) {
  const b = inst.body
  const f = inst.frame
  let tx = b.x + arm.hangX + Math.sin(inst.time * WAVE_HZ * FULL_TURN + arm.phase) * WAVE_PX
  let ty = b.y + DANGLE
  if (f.walk && i === FREE_ARM) {
    const prey = nearestPrey(inst, ctx)
    const wave = inst.time * WAVE_HZ * FULL_TURN + arm.phase
    tx = b.x + f.dx * FREE_R + Math.cos(wave) * WAVE_PX
    ty = b.y - FREE_UP * FREE_R + Math.sin(wave) * WAVE_PX
    if (prey) {
      const l = Math.hypot(prey.x - b.x, prey.y - b.y) || 1
      tx = prey.x - (prey.x - b.x) / l * TIP
      ty = prey.y - (prey.y - b.y) / l * TIP
      snatch(arm, prey, ctx)
    }
  }
  const ease = 1 - Math.exp(-FREE_EASE * dt)
  arm.wrist.x += (tx - arm.wrist.x) * ease
  arm.wrist.y += (ty - arm.wrist.y) * ease
  setAxis(arm, arm.wrist.x - b.x, arm.wrist.y - b.y)
}
function nearestPrey(inst, ctx) {
  let best = null
  let bestD = GRAB_R
  ctx.prey.forEach(p => {
    const d = Math.hypot(p.x - inst.body.x, p.y - inst.body.y)
    if (d >= bestD) return
    best = p
    bestD = d
  })
  return best
}
function snatch(arm, prey, ctx) {
  const tipX = arm.wrist.x + arm.ax * TIP
  const tipY = arm.wrist.y + arm.ay * TIP
  if (arm.snap > 0 || Math.hypot(prey.x - tipX, prey.y - tipY) > GRAB_NEAR) return
  arm.snap = SNAP
  ctx.onEat(prey)
}
//
// Its head: facing the way it goes (once it moves sideways), tilted with
// it.
//
function updateHead(inst, dt) {
  const f = inst.frame
  const vx = f.dx * inst.speed
  vx > FACE_SPEED && (inst.flip = true)
  vx < -FACE_SPEED && (inst.flip = false)
  const moving = inst.speed > FACE_SPEED ? 1 : 0
  const want = -f.dy * TILT * moving * (inst.flip ? -1 : 1)
  inst.tilt += (want - inst.tilt) * Math.min(1, TILT_RATE * dt)
}
//
// An arm's curve from its shoulder to its wrist (see ARMS): its points and
// their length from the shoulder.
//
function layArm(inst, arm) {
  const b = inst.body
  const w = arm.wrist
  const d = Math.hypot(w.x - b.x, w.y - b.y) || 1
  const dx = (w.x - b.x) / d
  const dy = (w.y - b.y) / d
  const sx = b.x + dx * SHOULDER_R
  const sy = b.y + dy * SHOULDER_R
  const span = Math.max(1, d - SHOULDER_R)
  const slack = Math.max(0, 1 - span / REST_LEN)
  const bow = slack * BOW * REST_LEN * arm.side + Math.sin(inst.time * SWAY_HZ * FULL_TURN + arm.phase) * SWAY_PX
  const sag = slack * SAG * REST_LEN
  const k1 = span * CTRL_SHARE
  const k2 = Math.min(span * CTRL_SHARE, AXIS_REACH)
  const c1x = sx + dx * k1 - dy * bow
  const c1y = sy + dy * k1 + dx * bow + sag
  const c2x = w.x - arm.ax * k2 - dy * bow * HALF
  const c2y = w.y - arm.ay * k2 + dx * bow * HALF + sag
  let len = 0
  arm.spine.forEach((p, i) => {
    const t = i / ARM_SEGS
    const m = 1 - t
    p.x = m * m * m * sx + 3 * m * m * t * c1x + 3 * m * t * t * c2x + t * t * t * w.x
    p.y = m * m * m * sy + 3 * m * m * t * c1y + 3 * m * t * t * c2y + t * t * t * w.y
    const before = arm.spine[i - 1]
    before && (len += Math.hypot(p.x - before.x, p.y - before.y))
    p.s = len
  })
  arm.len = len
}
function inView(inst, view) {
  const b = inst.body
  return b.x > view.left - CULL_PAD && b.x < view.right + CULL_PAD && b.y > view.top - CULL_PAD && b.y < view.bottom + CULL_PAD
}
//
// Whether a hand shows in front of the soil: all of them while it is in
// front; behind a platform, the ones that hold (they come round the
// edge) and a reaching one nearly there.
//
function handInFront(inst, arm) {
  if (inst.layer === LAYER.FRONT) return true
  return arm.grip ? true : Boolean(arm.reach) && arm.reach.t > REACH_FRONT
}
//
// An arm: one strip along its curve, its scales tiled along it from the
// wrist back (each tile split off where it ends, so the texture never
// wraps inside a quad).
//
function drawArm(inst, arm, parts) {
  const frame = inst.k.getSprite(SPRITE)?.data?.frames?.[0]
  if (!frame) return
  const tile = TILE.w * ARM_SCALE
  const spine = arm.spine
  const last = spine.length - 1
  arm.pts.length = 0
  arm.uv.length = 0
  const strip = { inst, arm, q: frame.q, band: parts.band.quad }
  for (let i = 0; i <= last; i++) {
    const p = spine[i]
    const a = spine[Math.max(0, i - 1)]
    const b = spine[Math.min(last, i + 1)]
    const tl = Math.hypot(b.x - a.x, b.y - a.y) || 1
    const nx = (b.y - a.y) / tl
    const ny = -(b.x - a.x) / tl
    const back = arm.len - p.s
    const cell = Math.floor(back / tile)
    if (i > 0) {
      const prev = arm.len - spine[i - 1].s
      const edge = Math.floor(prev / tile)
      edge !== cell && pushEdge(strip, spine[i - 1], p, nx, ny, edge * tile, prev, back)
    }
    pushPair(strip, p.x, p.y, nx, ny, back / tile - cell)
  }
  inst.k.drawPolygon({ pts: arm.pts, uv: arm.uv, indices: stripIndices(arm.pts.length), tex: frame.tex, color: inst.color })
}
//
// A pair of the strip's vertices across the arm at a point (its texture
// `u` of the way along a tile); the vectors are the arm's own, reused.
//
function pushPair(strip, x, y, nx, ny, u) {
  const { inst, arm, q, band } = strip
  const i = arm.pts.length
  arm.pool[i] ??= inst.k.vec2(0, 0)
  arm.pool[i + 1] ??= inst.k.vec2(0, 0)
  arm.uvPool[i] ??= inst.k.vec2(0, 0)
  arm.uvPool[i + 1] ??= inst.k.vec2(0, 0)
  arm.pts.push(arm.pool[i].set(x + nx * HALF_W, y + ny * HALF_W), arm.pool[i + 1].set(x - nx * HALF_W, y - ny * HALF_W))
  const share = Math.max(TILE_INSET, Math.min(1 - TILE_INSET, u))
  const ux = q.x + (band.x + (1 - share) * band.w) * q.w
  arm.uv.push(arm.uvPool[i].set(ux, q.y + band.y * q.h), arm.uvPool[i + 1].set(ux, q.y + (band.y + band.h) * q.h))
}
//
// Where a tile ends between two points: the end of one tile and the start
// of the next at the same place.
//
function pushEdge(strip, a, b, nx, ny, edgeBack, backA, backB) {
  const u = (edgeBack - backA) / ((backB - backA) || 1)
  const x = a.x + (b.x - a.x) * u
  const y = a.y + (b.y - a.y) * u
  pushPair(strip, x, y, nx, ny, 0)
  pushPair(strip, x, y, nx, ny, 1)
}
//
// The strip's triangles for a count of vertices (kept per count: an arm's
// strip has the same few counts every frame).
//
function stripIndices(count) {
  const cached = indicesFor.get(count)
  if (cached) return cached
  const out = []
  for (let i = 0; i + 3 < count; i += 2) out.push(i, i + 1, i + 2, i + 1, i + 3, i + 2)
  indicesFor.set(count, out)
  return out
}
//
// A hand at its wrist, pointing its way: the fingers (each one strip, bent
// smoothly by the curl) under the palm.
//
function drawHand(inst, arm, parts) {
  const frame = inst.k.getSprite(SPRITE)?.data?.frames?.[0]
  if (!frame) return
  FINGERS.forEach((spec, i) => drawFinger(inst, arm, i, parts[`finger${i}`], frame))
  drawPart(inst, parts.palm, arm.wrist.x, arm.wrist.y, Math.atan2(arm.ay, arm.ax), false)
}
//
// A finger with its claw: its spine laid out again from its root, each
// piece turned by the bend there (the mean of its ends' bends), the strip
// across it turned with it; then from the hand's frame (sheet px from the
// wrist) into the world. The vectors are the arm's own, reused.
//
function drawFinger(inst, arm, i, part, frame) {
  const k = inst.k
  const spec = FINGERS[i]
  const rig = rigs[i]
  const q = frame.q
  arm.fingers[i] ??= { pts: [], uv: [] }
  const out = arm.fingers[i]
  let x = rig.points[0].x - WRIST.x
  let y = rig.points[0].y - WRIST.y
  let before = 0
  rig.points.forEach((p, j) => {
    const bend = arm.curl * (spec.turn * p.knee + spec.hook * p.hook)
    if (j) {
      const mid = (bend + before) * HALF
      const dx = p.x - rig.points[j - 1].x
      const dy = p.y - rig.points[j - 1].y
      x += dx * Math.cos(mid) - dy * Math.sin(mid)
      y += dx * Math.sin(mid) + dy * Math.cos(mid)
    }
    before = bend
    const nx = (p.nx * Math.cos(bend) - p.ny * Math.sin(bend)) * p.w
    const ny = (p.nx * Math.sin(bend) + p.ny * Math.cos(bend)) * p.w
    const at = j * 2
    out.pts[at] = toWorld(arm, x + nx, y + ny, out.pts[at] ?? k.vec2(0, 0))
    out.pts[at + 1] = toWorld(arm, x - nx, y - ny, out.pts[at + 1] ?? k.vec2(0, 0))
    out.uv[at] = (out.uv[at] ?? k.vec2(0, 0)).set(q.x + (part.quad.x + p.u1 * part.quad.w) * q.w, q.y + (part.quad.y + p.v1 * part.quad.h) * q.h)
    out.uv[at + 1] = (out.uv[at + 1] ?? k.vec2(0, 0)).set(q.x + (part.quad.x + p.u2 * part.quad.w) * q.w, q.y + (part.quad.y + p.v2 * part.quad.h) * q.h)
  })
  k.drawPolygon({ pts: out.pts, uv: out.uv, indices: stripIndices(out.pts.length), tex: frame.tex, color: inst.color })
}
//
// A point of the hand's frame (sheet px from the wrist) in the world.
//
function toWorld(arm, lx, ly, v) {
  return v.set(arm.wrist.x + (lx * arm.ax - ly * arm.ay) * ARM_SCALE, arm.wrist.y + (lx * arm.ay + ly * arm.ax) * ARM_SCALE)
}
//
// The head over the arms' roots, bobbing, mirrored to face its way.
//
function drawHead(inst, parts) {
  const b = inst.body
  drawPart(inst, parts.head, b.x, b.y + Math.sin(inst.time * BOB_HZ * FULL_TURN) * BOB_PX, inst.tilt, inst.flip)
}
//
// One piece of the atlas at a world point (its pivot there), turned (rad),
// maybe mirrored.
//
function drawPart(inst, part, x, y, angle, mirrored) {
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: part.quad,
    width: part.w,
    height: part.h,
    pos: inst.v.set(x, y),
    anchor: mirrored ? part.anchorMirrored : part.anchor,
    angle: angle * DEG,
    flipX: mirrored,
    color: inst.color
  })
}
//
// Whether a point lies where the lake's water is (or close over it), or in
// a bank's hollow.
//
function inLakeZone(x, y) {
  if (Layout.inHollow(x, y, HOLLOW_PAD)) return true
  return x > Layout.LAKE_X1 - LAKE_PAD && x < Layout.LAKE_X2 + LAKE_PAD && y > Layout.LAKE_SURFACE_Y - LAKE_OVER && y < Layout.LAKE_SURFACE_Y + LAKE_DEEP
}
//
// Its ways (once per page): the nodes along the outline with their links,
// each in a group of nodes that reach one another, and the points a hand
// may hold in a grid.
//
function buildNav() {
  const nodes = []
  const grid = new Map()
  const p = {}
  Surface.crawlRuns().forEach(run => {
    for (let s = 0; s < run.len; s += GRIP_STEP) {
      Surface.sample(run, s, p)
      inLakeZone(p.x, p.y) || addGrip(grid, { x: p.x, y: p.y, nx: p.nx, ny: p.ny })
    }
    const count = Math.max(1, Math.floor(run.len / NODE_STEP))
    const own = []
    for (let i = 0; i < count + (run.closed ? 0 : 1); i++) {
      Surface.sample(run, i * run.len / count, p)
      own.push(nodeAt(p))
    }
    own.forEach((node, i) => {
      const next = own[i + 1] ?? (run.closed ? own[0] : null)
      node && nodes.push(node)
      node && next && next !== node && link(node, next)
    })
  })
  nodes.forEach((a, i) => {
    for (let j = i + 1; j < nodes.length; j++) {
      const b = nodes[j]
      Math.hypot(a.ox - b.ox, a.oy - b.oy) <= LINK_MAX && !a.links.includes(b) && isAirBetween(a, b) && link(a, b)
    }
  })
  markGroups(nodes)
  return { nodes, grid }
}
//
// A node at an outline point: where the body hangs out in the air off it
// (null without room there), and whether it may also go behind the edge
// or onto the face there.
//
function nodeAt(p) {
  const top = p.ny < -TOP_NY
  const full = top ? WALK_H : p.ny > CEIL_NY ? HANG_H : SIDE_H
  const h = TIGHT_SHARES.map(share => full * share).find(off => hasRoom(p.x + p.nx * off, p.y + p.ny * off, BODY_R))
  if (!h) return null
  const ox = p.x + p.nx * h
  const oy = p.y + p.ny * h
  const fx = p.x - p.nx * FACE_IN
  const fy = p.y - p.ny * FACE_IN
  const bx = p.x + p.nx * BEHIND_OUT
  const by = p.y + p.ny * BEHIND_OUT
  return {
    x: p.x,
    y: p.y,
    nx: p.nx,
    ny: p.ny,
    h,
    top,
    ox,
    oy,
    behind: Surface.isSoil(p.x - p.nx * BEHIND_PROBE, p.y - p.ny * BEHIND_PROBE) && !inLakeZone(bx, by),
    face: isOnFace(fx, fy),
    links: [],
    group: -1
  }
}
//
// Whether the body has a face of soil to lie on at a point: soil there
// and FACE_ROOM px round it, inside the world, away from the lake.
//
function isOnFace(x, y) {
  if (x < FACE_ROOM || y < FACE_ROOM || x > Layout.WORLD_W - FACE_ROOM || y > Layout.WORLD_H - FACE_ROOM * 2 || inLakeZone(x, y)) return false
  return Surface.isSoil(x, y) && Surface.isSoil(x - FACE_ROOM, y) && Surface.isSoil(x + FACE_ROOM, y) && Surface.isSoil(x, y - FACE_ROOM) && Surface.isSoil(x, y + FACE_ROOM)
}
function hasRoom(x, y, r) {
  if (x < EDGE || y < EDGE || x > Layout.WORLD_W - EDGE || y > Layout.WORLD_H - EDGE) return false
  return !inLakeZone(x, y) && Surface.isOpenAir(x, y, r)
}
function link(a, b) {
  a.links.push(b)
  b.links.push(a)
}
function isAirBetween(a, b) {
  const steps = Math.ceil(Math.hypot(b.ox - a.ox, b.oy - a.oy) / LINK_CHECK)
  for (let i = 1; i < steps; i++) {
    const u = i / steps
    if (!hasRoom(a.ox + (b.ox - a.ox) * u, a.oy + (b.oy - a.oy) * u, LINK_ROOM)) return false
  }
  return true
}
function markGroups(nodes) {
  let group = 0
  nodes.forEach(start => {
    if (start.group >= 0) return
    const stack = [start]
    start.group = group
    while (stack.length) {
      stack.pop().links.forEach(next => {
        if (next.group >= 0) return
        next.group = group
        stack.push(next)
      })
    }
    group++
  })
}
function addGrip(grid, g) {
  const key = gridKey(Math.floor(g.x / GRID), Math.floor(g.y / GRID))
  grid.has(key) || grid.set(key, [])
  grid.get(key).push(g)
}
function gridKey(cx, cy) {
  return cy * Layout.WORLD_W + cx
}
function gripsNear(x, y, r) {
  const out = []
  for (let cy = Math.floor((y - r) / GRID); cy <= Math.floor((y + r) / GRID); cy++) {
    for (let cx = Math.floor((x - r) / GRID); cx <= Math.floor((x + r) / GRID); cx++) {
      const cell = nav.grid.get(gridKey(cx, cy))
      cell && out.push(...cell)
    }
  }
  return out
}
//
// The node of the biggest group nearest a spot (where it starts).
//
function nearestNode(x, y) {
  const sizes = new Map()
  nav.nodes.forEach(node => sizes.set(node.group, (sizes.get(node.group) ?? 0) + 1))
  let group = -1
  sizes.forEach((size, id) => { (group < 0 || size > sizes.get(group)) && (group = id) })
  let best = null
  nav.nodes.forEach(node => {
    if (node.group !== group) return
    const d = Math.hypot(node.ox - x, node.oy - y)
    if (best && d >= best.d) return
    best = { node, d }
  })
  return best?.node ?? null
}
//
// The shortest way from one node to another along the links (their
// places' distance); just the start if there is none.
//
function findWay(from, to) {
  const dist = new Map([[from, 0]])
  const prev = new Map()
  const open = new Set([from])
  while (open.size) {
    let cur = null
    open.forEach(node => { (!cur || dist.get(node) < dist.get(cur)) && (cur = node) })
    if (cur === to) break
    open.delete(cur)
    cur.links.forEach(next => {
      const d = dist.get(cur) + Math.hypot(next.ox - cur.ox, next.oy - cur.oy)
      if (d >= (dist.get(next) ?? Infinity)) return
      dist.set(next, d)
      prev.set(next, cur)
      open.add(next)
    })
  }
  const way = [to]
  while (way[0] !== from && prev.has(way[0])) way.unshift(prev.get(way[0]))
  return way[0] === from ? way : [from]
}
//
// The atlas: the pieces baked once per page at BAKE_OVER times their drawn
// size (the arm's scales as one seamless tile, the hand cut apart),
// grained, loaded once per live k; per piece its quad, drawn size and
// anchor (its pivot).
//
function bake(k) {
  if (atlasFor.has(k)) return
  atlas ??= buildAtlas()
  if (!atlas) return
  k.loadSprite(SPRITE, atlas.canvas, { singular: true, filter: 'linear' })
  atlasFor.set(k, Object.fromEntries(Object.entries(atlas.parts).map(([name, part]) => [name, withAnchor(k, part)])))
}
function withAnchor(k, part) {
  const ax = part.pivot.x / part.sw * 2 - 1
  const ay = part.pivot.y / part.sh * 2 - 1
  return { ...part, anchor: k.vec2(ax, ay), anchorMirrored: k.vec2(-ax, ay) }
}
function buildAtlas() {
  const head = Atlas.piece(HEAD.piece)
  const arm = Atlas.piece(ARM_PIECE)
  if (!head || !arm) return null
  const items = [
    { name: 'head', src: head, pivot: HEAD.pivot, scale: HEAD_SCALE },
    { name: 'band', src: armTile(arm), pivot: { x: 0, y: 0 }, scale: ARM_SCALE },
    cutOut('palm', arm, [PALM.poly], boxOf(PALM.poly), PALM.pivot)
  ]
  rigs ??= FINGERS.map(fingerRig)
  FINGERS.forEach((spec, i) => items.push(cutOut(`finger${i}`, arm, spec.cuts, rigs[i].box, WRIST)))
  const sizes = items.map(it => ({ w: Math.ceil(it.src.width * it.scale * BAKE_OVER), h: Math.ceil(it.src.height * it.scale * BAKE_OVER) }))
  const w = Math.max(...sizes.map(size => size.w)) + ATLAS_GAP * 2
  const h = sizes.reduce((sum, size) => sum + size.h + ATLAS_GAP, ATLAS_GAP)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  const parts = {}
  let y = ATLAS_GAP
  items.forEach((it, i) => {
    const size = sizes[i]
    ctx.drawImage(it.src, ATLAS_GAP, y, size.w, size.h)
    parts[it.name] = { quad: { x: ATLAS_GAP / w, y: y / h, w: size.w / w, h: size.h / h }, w: it.src.width * it.scale, h: it.src.height * it.scale, sw: it.src.width, sh: it.src.height, pivot: it.pivot }
    y += size.h + ATLAS_GAP
  })
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return { canvas, parts }
}
//
// A piece of the hand cut out of the arm piece by its outlines (sheet px,
// together), on a canvas of its own the size of its box (sheet px); its
// pivot in that canvas.
//
function cutOut(name, arm, polys, box, pivot) {
  const canvas = document.createElement('canvas')
  canvas.width = box.w
  canvas.height = box.h
  const ctx = canvas.getContext('2d')
  polys.forEach(poly => {
    ctx.beginPath()
    poly.forEach(([x, y]) => ctx.lineTo(x - box.x, y - box.y))
    ctx.closePath()
    ctx.fill()
  })
  ctx.globalCompositeOperation = 'source-in'
  ctx.drawImage(arm, ARM_AT.x - box.x, ARM_AT.y - box.y)
  return { name, src: canvas, pivot: { x: pivot.x - box.x, y: pivot.y - box.y }, scale: ARM_SCALE }
}
//
// The box (sheet px, whole px) round some points.
//
function boxOf(points) {
  const xs = points.map(pt => pt[0])
  const ys = points.map(pt => pt[1])
  const x = Math.floor(Math.min(...xs))
  const y = Math.floor(Math.min(...ys))
  return { x, y, w: Math.ceil(Math.max(...xs)) - x, h: Math.ceil(Math.max(...ys)) - y }
}
//
// A finger's strip at rest (sheet px), once per page: its spine smoothed
// (Catmull-Rom, FINGER_SUBS pieces per span), at each point its width, the
// normal across it, how far along the knuckle's bend (from where the spine
// leaves the palm) and the claw's (round its joint) have got, and where
// its two edge vertices sit in its box (0 … 1) — the box round them all.
//
function fingerRig(spec) {
  const sp = spec.spine
  const points = []
  for (let j = 0; j < sp.length - 1; j++) {
    for (let n = 0; n < FINGER_SUBS; n++) {
      const t = n / FINGER_SUBS
      const at = catmullRom(sp[Math.max(0, j - 1)], sp[j], sp[j + 1], sp[Math.min(sp.length - 1, j + 2)], t)
      points.push({ x: at[0], y: at[1], w: spec.widths[j] + (spec.widths[j + 1] - spec.widths[j]) * t })
    }
  }
  const last = sp[sp.length - 1]
  points.push({ x: last[0], y: last[1], w: spec.widths[spec.widths.length - 1] })
  let s = 0
  points.forEach((p, j) => {
    const a = points[Math.max(0, j - 1)]
    const b = points[Math.min(points.length - 1, j + 1)]
    const len = Math.hypot(b.x - a.x, b.y - a.y) || 1
    p.nx = (b.y - a.y) / len
    p.ny = -(b.x - a.x) / len
    j && (s += Math.hypot(p.x - a.x, p.y - a.y))
    p.s = s
  })
  const inPalm = points.findLastIndex(p => isInPoly(PALM.poly, p.x, p.y))
  const exitS = points[Math.min(points.length - 1, inPalm + 1)].s
  const jointS = points.reduce((a, b) => (Math.hypot(b.x - spec.joint.x, b.y - spec.joint.y) < Math.hypot(a.x - spec.joint.x, a.y - spec.joint.y) ? b : a)).s
  const edges = points.flatMap(p => [[p.x + p.nx * p.w, p.y + p.ny * p.w], [p.x - p.nx * p.w, p.y - p.ny * p.w]])
  const box = boxOf(edges)
  points.forEach((p, j) => {
    p.knee = smoothStep((p.s - exitS) / KNUCKLE_BEND)
    p.hook = smoothStep((p.s - jointS) / JOINT_BEND + HALF)
    p.u1 = (edges[j * 2][0] - box.x) / box.w
    p.v1 = (edges[j * 2][1] - box.y) / box.h
    p.u2 = (edges[j * 2 + 1][0] - box.x) / box.w
    p.v2 = (edges[j * 2 + 1][1] - box.y) / box.h
  })
  return { points, box }
}
function catmullRom(p0, p1, p2, p3, t) {
  return [0, 1].map(i => HALF * (2 * p1[i] + (p2[i] - p0[i]) * t + (2 * p0[i] - 5 * p1[i] + 4 * p2[i] - p3[i]) * t * t + (3 * p1[i] - p0[i] - 3 * p2[i] + p3[i]) * t * t * t))
}
function smoothStep(t) {
  const c = Math.max(0, Math.min(1, t))
  return c * c * (3 - 2 * c)
}
function isInPoly(poly, x, y) {
  let inside = false
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i]
    const [xj, yj] = poly[j]
    yi > y !== yj > y && x < (xj - xi) * (y - yi) / (yj - yi) + xi && (inside = !inside)
  }
  return inside
}
//
// The arm's scales as a tile that repeats along it without a seam: TILE
// of the arm piece, its last TILE_BLEND columns faded into the columns
// just before its first (so its end runs on into its start).
//
function armTile(arm) {
  const canvas = document.createElement('canvas')
  canvas.width = TILE.w
  canvas.height = TILE.h
  const ctx = canvas.getContext('2d')
  ctx.drawImage(arm, TILE.x, TILE.y, TILE.w, TILE.h, 0, 0, TILE.w, TILE.h)
  const over = document.createElement('canvas')
  over.width = TILE_BLEND
  over.height = TILE.h
  const octx = over.getContext('2d')
  octx.drawImage(arm, TILE.x - TILE_BLEND, TILE.y, TILE_BLEND, TILE.h, 0, 0, TILE_BLEND, TILE.h)
  const fade = octx.createLinearGradient(0, 0, TILE_BLEND, 0)
  fade.addColorStop(0, hexAlpha(C.tint, 0))
  fade.addColorStop(1, C.tint)
  octx.globalCompositeOperation = 'destination-in'
  octx.fillStyle = fade
  octx.fillRect(0, 0, TILE_BLEND, TILE.h)
  ctx.drawImage(over, TILE.w - TILE_BLEND, 0)
  return canvas
}
function hexAlpha(hex, alpha) {
  return hex + Math.round(alpha * BYTE_MAX).toString(HEX_RADIX).padStart(2, '0')
}
