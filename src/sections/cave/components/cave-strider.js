import { createSeededRandom } from '../../../utils/seeded-random.js'
import { getRGB } from '../../../utils/helper.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as CaveLake from '../utils/cave-lake.js'
//
// The water strider: a small insect of strider.png's parts — a body under
// its folded wings, a head with one big eye, two feelers and six legs
// (three pairs: short front ones, long middle oars and long hind ones;
// each a bent femur from a ball on the body and a straight tibia whose end
// ball rests on the water). It lives on the lake's surface, riding its
// waves: it glides in jerks, each a stroke of its middle legs (they sweep
// back, then swing forward again) that throws it ahead and then slows
// down on the water, and every stroke sends a ring out from each oar.
// Where a foot rests the surface dimples.
//
// It is afraid of everything that comes near: whatever floats or sinks in
// the water under it, or comes close on the banks or over the water
// (FEAR_R px along the lake, from FEAR_ABOVE px over the surface to
// FEAR_BELOW under it): it rows away from the nearest, stroke after
// stroke; driven against a bank it dashes back past it. Something
// falling into the lake (the hero) startles every strider on it: each
// rows away from the splash for STARTLE_TIME s, wherever it is (one
// already at the bank stays there). Another
// strider too close makes it row off gently. Left alone it drifts and
// rows now and then, this way or that.
//
// Its back is ground the hero can land on (a moving line, see line): under
// his weight it sinks, rowing on the way he came on to get out from under
// him; sunk, it lets him into the water and floats up again. Given a spot
// (setSlot: the striders' bridge, cave-strider-bridge.js) it rows there and
// keeps to and fro about it, afraid of nothing.
//
// Everything is worked out in sheet px of strider.png in the body's own
// frame (x to the head, y down, origin on the middle hips) and drawn under
// one transform (mirrored when it faces left); one atlas texture for all
// the parts, so every strider draws in one batch.
//
const SPRITE = 'cave0-strider'
const GRAIN_SEED = 9450
const COLOR = CAVE_CFG.strider
//
// Size: world px per sheet px at size 1; the atlas is baked BAKE_OVER
// times finer than that, its parts ATLAS_GAP px apart on shelves ATLAS_W
// px wide.
//
const SCALE = 0.045
const BAKE_OVER = 3
const ATLAS_W = 512
const ATLAS_GAP = 3
const BYTE_MAX = 255
const HALF = 0.5
const DEG = 180 / Math.PI
//
// The parts (px in their pieces): the body's origin (its middle hip ball),
// the head by its neck knob set at the body's front ball, each feeler by
// its base set on the head's brow (the far one darker, turned FAR_TURN
// degrees up).
//
const BODY = 'striderBody'
const ORIGIN = { x: 482.7, y: 291.5 }
const HEAD = { piece: 'striderHead', pivot: { x: 20.8, y: 91.7 }, at: { x: 642.9, y: 222.1 } }
const FEELER = { piece: 'striderFeeler', pivot: { x: 17, y: 101.4 }, at: { x: 161.3, y: 30.4 } }
const FEELERS = [{ far: true, turn: -14, phase: 0 }, { far: false, turn: 0, phase: 1.9 }]
const HEAD_AT = { x: HEAD.at.x - ORIGIN.x, y: HEAD.at.y - ORIGIN.y }
const FEELER_AT = { x: HEAD_AT.x + FEELER.at.x - HEAD.pivot.x, y: HEAD_AT.y + FEELER.at.y - HEAD.pivot.y }
//
// Legs: the femur from its ball (p, on the hip) to its cut end (q, the
// knee, under the tibia's top ball), the tibia from its top ball (p) to its
// end ball (q, the foot on the water). Per pair, hind to front: its hip
// ball on the body, where its foot rests (body-frame x), its size; the
// middle pair rows. A far leg's hip sits FAR_HIP off the near one's, its
// foot FAR_SPREAD times as far out and FAR_LIFT px higher (further back on
// the water). The hips ride HIP_LIFT px over the surface.
//
const FEMUR = { piece: 'striderFemur', p: { x: 138.6, y: 27.4 }, q: { x: 20.5, y: 247.4 } }
const TIBIA = { piece: 'striderTibia', p: { x: 28.2, y: 24.7 }, q: { x: 16.9, y: 340.6 } }
const PAIRS = [
  { hip: { x: 399.1, y: 288.4 }, rest: -798, scale: 1.4, oar: false },
  { hip: { x: 482.7, y: 291.5 }, rest: 523, scale: 1.4, oar: true },
  { hip: { x: 573.5, y: 275.5 }, rest: 374, scale: 0.75, oar: false }
]
const FAR_HIP = { x: -18, y: -14 }
const FAR_SPREAD = 1.12
const FAR_LIFT = 49
const HIP_LIFT = 137
const KNEE_SLACK = 1
//
// Rowing: a stroke sweeps the oars' feet back to STROKE_BACK (body x) over
// STROKE_TIME s, they swing forward again over RECOVER_TIME s. Left alone
// it rows every WANDER_EVERY..+RANGE s at WANDER_SPEED..+RANGE px/s, turning
// about with WANDER_TURN; the water slows it at DRAG per s. Afraid it
// rows at FLEE_SPEED..+RANGE every FLEE_EVERY s; a stroke never starts
// before the last one is over.
//
const STROKE_BACK = -75
const STROKE_TIME = 0.16
const RECOVER_TIME = 0.22
const WANDER_EVERY = 1.2
const WANDER_EVERY_RANGE = 3
const WANDER_SPEED = 40
const WANDER_SPEED_RANGE = 35
const WANDER_TURN = 0.4
const DRAG = 2.2
const FLEE_SPEED = 170
const FLEE_SPEED_RANGE = 50
const FLEE_EVERY = 0.2
//
// Fear (world px): anything within FEAR_R along the lake, from FEAR_ABOVE
// over the surface (a bank, the air over the water) to FEAR_BELOW under it
// (something sinking). It rows away from the middle of all it fears there
// (a long thing — the giant — is feared all along, not by its nearest
// point) and keeps that way FLEE_HOLD s, so it never dithers. A way with
// less than CORNER_ROOM px of water left is shut: it rows the other way,
// right past what it fears, and holds that way CROSS_HOLD s — on across
// to the lake's other side — once it has set out. Another strider
// within PEER_R makes it row off at wander speed. It keeps EDGE_PAD px off
// the banks and bounces off them, keeping BOUNCE of its speed.
//
const STARTLE_TIME = 1.4
const FEAR_R = 170
const FEAR_ABOVE = 160
const FEAR_BELOW = 400
const CORNER_ROOM = 90
const FLEE_HOLD = 0.8
const CROSS_HOLD = 3
const PEER_R = 70
const EDGE_PAD = 30
const BOUNCE = 0.25
//
// Ground for the hero (Ground's moving lines): its back, STAND_UP sheet px
// over the water, STAND_HALF sheet px either side of its middle (feet
// within HOLD_REACH world px of that and HOLD_SLACK px into it are on it).
// Under him it sinks SINK_MAX world px over SINK_TIME s (its body going
// down BODY_SINK of that, a ring off it every SINK_RING_EVERY s) — sunk, it
// holds him no more till it is up again. For its first CARRY_TIME s under
// him it rows on the way he came on (at once, then every CARRY_EVERY s) at
// CARRY_SPEED; all the while it strains under his weight: every
// STRAIN_EVERY..+RANGE s it jerks STRAIN_UP px back up (him with it), its
// feet pushed STRAIN_SPREAD sheet px out, easing back at STRAIN_RATE per s.
// Let go, it floats up at RISE_RATE px/s.
//
const STAND_UP = 220
const STAND_HALF = 420
const HOLD_REACH = 15
const HOLD_SLACK = 6
const SINK_MAX = 15
const SINK_TIME = 3.2
const BODY_SINK = 0.4
const SINK_RING_EVERY = 0.4
const CARRY_SPEED = 150
const CARRY_EVERY = 0.35
const CARRY_TIME = 0.8
const STRAIN_EVERY = 0.18
const STRAIN_EVERY_RANGE = 0.3
const STRAIN_UP = 3
const STRAIN_SPREAD = 90
const STRAIN_RATE = 9
const RISE_RATE = 12
const LINE_ID = 'strider'
//
// Holding a spot (setSlot): it rows to it (at up to GATHER_SPEED, every
// GATHER_EVERY s while it is farther than SLOT_FAR px off it), then to and
// fro about it, SLOT_SWAY px either side, every SLOT_EVERY..+RANGE s;
// afraid of nothing, startled only by a splash within SLOT_STARTLE_R px.
//
const GATHER_SPEED = 140
const GATHER_EVERY = 0.4
const SLOT_FAR = 30
const SLOT_SWAY = 10
const SLOT_EVERY = 0.9
const SLOT_EVERY_RANGE = 0.8
const SLOT_STARTLE_R = 250
//
// Feelers swing FEELER_SWING degrees at FEELER_HZ.
//
const FEELER_SWING = 6
const FEELER_HZ = 1.6
//
// Water marks (world px): a dimple under each resting foot (DIMPLE_R wide,
// DIMPLE_FLAT as high, DIMPLE_ALPHA); a ring from each oar per stroke,
// growing from RING_R0 to RING_R1 over RING_TIME s, RING_FLAT as high as
// wide, fading from RING_ALPHA; LINE_W thick.
//
const DIMPLE_R = 2.2
const DIMPLE_FLAT = 0.35
const DIMPLE_ALPHA = 0.45
const RING_R0 = 3
const RING_R1 = 18
const RING_TIME = 0.9
const RING_FLAT = 0.28
const RING_ALPHA = 0.5
const LINE_W = 1
//
// Off-view margin (world px) past which a strider is not drawn.
//
const CULL_MARGIN = 60
//
// The level's striders (createAll): spread over the lake at these shares
// of its span, sizes SET_SIZE..+RANGE, seeded.
//
const SET_AT = [0.22, 0.5, 0.78]
const SET_SIZE = 0.62
const SET_SIZE_RANGE = 0.16
const SET_SEED = 5310
const atlasFor = new WeakMap()
let atlas = null

/**
 * Creates a strider on the lake.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake instance (cave-lake.js)
 * @param {number} cfg.x - World X on the water
 * @param {number} cfg.dir - Facing: 1 right, -1 left
 * @param {number} cfg.size - Size multiplier
 * @param {number} cfg.seed - Random seed
 * @param {string} cfg.id - Its line's id (Ground's moving lines)
 * @param {Array<{x1: number, x2: number}>} [cfg.blocks] - Stretches of the surface it never crosses (a plant's leaves lying on the water)
 * @returns {Object} Strider instance
 */
export function create(cfg) {
  const { k, lake } = cfg
  bake(k)
  const rng = createSeededRandom(cfg.seed)
  const span = freeStretch(CaveLake.openSpan(lake), cfg.blocks ?? [], cfg.x)
  const far = Math.round(BYTE_MAX * (1 - COLOR.farShade))
  const inst = {
    k,
    lake,
    rng,
    unit: SCALE * cfg.size,
    size: cfg.size,
    minX: span.x1 + EDGE_PAD,
    maxX: span.x2 - EDGE_PAD,
    x: Math.max(span.x1 + EDGE_PAD, Math.min(span.x2 - EDGE_PAD, cfg.x)),
    y: CaveLake.surfaceAt(lake, cfg.x),
    vx: 0,
    dir: cfg.dir,
    stroke: null,
    startle: null,
    fleeDir: 0,
    fleeHold: 0,
    middle: { x: 0 },
    restIn: WANDER_EVERY * rng(),
    phase: rng() * Math.PI * 2,
    legs: createLegs(),
    rings: [],
    slot: null,
    swayTo: 1,
    load: 0,
    sink: 0,
    sunk: false,
    sinkRingIn: 0,
    loadT: 0,
    strain: 0,
    strainIn: 0,
    span: { x1: 0, x2: 0 },
    line: null,
    nearColor: k.rgb(BYTE_MAX, BYTE_MAX, BYTE_MAX),
    farColor: k.rgb(far, far, far),
    markRgb: getRGB(k, CAVE_CFG.water.paint.surfaceLine),
    v: k.vec2(0, 0),
    anchors: new Map()
  }
  inst.line = { moving: true, id: cfg.id, span: () => standSpan(inst), at: x => standAt(inst, x) }
  return inst
}

/**
 * Creates the level's striders, spread over the lake.
 * @param {Object} k - Kaplay instance
 * @param {Object} lake - Lake instance (cave-lake.js)
 * @param {Array<{x1: number, x2: number}>} [blocks] - Stretches of the surface none of them crosses
 * @returns {Array<Object>} Strider instances
 */
export function createAll(k, lake, blocks = []) {
  const rng = createSeededRandom(SET_SEED)
  const span = CaveLake.openSpan(lake)
  return SET_AT.map((share, i) => create({
    k,
    lake,
    blocks,
    id: LINE_ID + i,
    x: span.x1 + (span.x2 - span.x1) * share,
    dir: rng() < HALF ? -1 : 1,
    size: SET_SIZE + rng() * SET_SIZE_RANGE,
    seed: Math.floor(rng() * SET_SEED)
  }))
}

/**
 * Runs the strider on: fear, rowing, gliding on the water, its rings.
 * @param {Object} inst - Strider instance
 * @param {Array<{x: number, y: number}>} threats - Everything it may fear (world points)
 * @param {Array<Object>} peers - Every strider of the lake (itself included)
 */
export function onUpdate(inst, threats, peers) {
  const dt = inst.k.dt()
  inst.restIn -= dt
  inst.fleeHold -= dt
  inst.startle && (inst.startle.t -= dt) <= 0 && (inst.startle = null)
  updateSink(inst, dt)
  updateStroke(inst, dt)
  decide(inst, threats, peers)
  glide(inst, dt)
  inst.y = CaveLake.surfaceAt(inst.lake, inst.x)
  inst.rings.forEach(ring => { ring.t += dt })
  inst.rings = inst.rings.filter(ring => ring.t < RING_TIME)
}

/**
 * Startles it: something fell into the lake at x — it rows away from
 * there, wherever on the lake it is, for STARTLE_TIME s.
 * @param {Object} inst - Strider instance
 * @param {number} x - World X of the splash
 */
export function startle(inst, x) {
  if (inst.slot !== null && Math.abs(x - inst.x) > SLOT_STARTLE_R) return
  inst.startle = { x, y: inst.y, t: STARTLE_TIME }
  inst.stroke = null
}

/**
 * Its back as a line the hero can stand on (Ground's moving lines).
 * @param {Object} inst - Strider instance
 * @returns {Object} Ground moving line
 */
export function line(inst) {
  return inst.line
}

/**
 * Whether its back holds up feet at (x, feetY): on it, at most HOLD_SLACK
 * px into it (a hero on it sinking with it is not in the water yet).
 * @param {Object} inst - Strider instance
 * @param {number} x - World X
 * @param {number} feetY - World Y of the feet
 * @returns {boolean}
 */
export function holds(inst, x, feetY) {
  const span = standSpan(inst)
  if (!span || x < span.x1 - HOLD_REACH || x > span.x2 + HOLD_REACH) return false
  return feetY <= backY(inst) + HOLD_SLACK
}

/**
 * Whether the hero stands on it now (0: no; else the way he came on, 1
 * right or -1 left — the way it rows on with him, sinking).
 * @param {Object} inst - Strider instance
 * @param {number} dir - 0, 1 or -1
 */
export function bear(inst, dir) {
  if (!dir) {
    inst.load = 0
    return
  }
  if (inst.load) return
  inst.load = dir
  inst.loadT = 0
  inst.strainIn = 0
  inst.vx = 0
  inst.stroke = null
  inst.restIn = 0
  inst.sinkRingIn = 0
}

/**
 * Gives it a spot on the water to keep to (null: none, it lives on its
 * own again).
 * @param {Object} inst - Strider instance
 * @param {number|null} x - World X
 */
export function setSlot(inst, x) {
  inst.slot = x
}

/**
 * Draws the water marks under it: its feet's dimples and its oars' rings
 * (draw every strider's marks before any strider, so the shapes batch).
 * @param {Object} inst - Strider instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 */
export function onDrawWater(inst, view) {
  if (isCulled(inst, view)) return
  inst.rings.forEach(ring => {
    const share = ring.t / RING_TIME
    const r = (RING_R0 + (RING_R1 - RING_R0) * share) * inst.size
    drawMark(inst, ring.x, ring.y, r, RING_FLAT, RING_ALPHA * (1 - share))
  })
  inst.legs.forEach(leg => {
    const foot = footOf(inst, leg)
    drawMark(inst, foot.wx, waterUnder(inst, leg, foot.wx), DIMPLE_R * inst.size, DIMPLE_FLAT, DIMPLE_ALPHA)
  })
}

/**
 * Draws the strider (skipped off the view).
 * @param {Object} inst - Strider instance
 * @param {{left: number, right: number, top: number, bottom: number}} view - World rect in view
 */
export function onDraw(inst, view) {
  if (isCulled(inst, view)) return
  const k = inst.k
  const parts = atlasFor.get(k)
  if (!parts) return
  k.pushTransform()
  k.pushTranslate(inst.v.set(inst.x, bodyY(inst) - HIP_LIFT * inst.unit))
  k.pushScale(inst.v.set(inst.dir * inst.unit, inst.unit))
  drawStrider(inst, parts)
  k.popTransform()
}
//
// The six legs: pair, near or far, hip in the body's frame, where its
// foot rests and its bone lengths.
//
function createLegs() {
  const legs = []
  PAIRS.forEach(pair => {
    for (let far = 0; far < 2; far++) {
      legs.push({
        far: far === 1,
        oar: pair.oar,
        scale: pair.scale,
        hipX: pair.hip.x - ORIGIN.x + (far ? FAR_HIP.x : 0),
        hipY: pair.hip.y - ORIGIN.y + (far ? FAR_HIP.y : 0),
        rest: pair.rest * (far ? FAR_SPREAD : 1),
        l1: boneLength(FEMUR) * pair.scale,
        l2: boneLength(TIBIA) * pair.scale
      })
    }
  })
  return legs
}
function boneLength(bone) {
  return Math.hypot(bone.q.x - bone.p.x, bone.q.y - bone.p.y)
}
//
// Afraid: rows away from the nearest thing it fears (back past it when
// that way is shut). Else, too close to another strider, it rows off;
// else now and then it rows on its own.
//
function decide(inst, threats, peers) {
  if (inst.stroke) return
  if (inst.load) {
    inst.restIn <= 0 && inst.loadT < CARRY_TIME && row(inst, inst.load, CARRY_SPEED, CARRY_EVERY)
    return
  }
  if (inst.slot !== null && !inst.startle) {
    keepSlot(inst)
    return
  }
  const threat = inst.startle ?? threatsMiddle(inst, threats)
  if (threat) {
    flee(inst, threat)
    return
  }
  inst.fleeDir = 0
  const peer = peers.find(p => p !== inst && Math.abs(p.x - inst.x) < PEER_R)
  if (peer) {
    const away = Math.sign(inst.x - peer.x) || inst.dir
    inst.restIn <= 0 && row(inst, roomTo(inst, away) < CORNER_ROOM ? -away : away, wanderSpeed(inst), wanderWait(inst))
    return
  }
  if (inst.restIn > 0) return
  const turn = inst.rng() < WANDER_TURN ? -inst.dir : inst.dir
  row(inst, roomTo(inst, turn) < CORNER_ROOM ? -turn : turn, wanderSpeed(inst), wanderWait(inst))
}
//
// Away from what it fears: the way it set out on while that holds (turned
// only by a bank: then right past it), else away from it — or, that way
// shut, past it, held long enough to cross to the other side.
//
function flee(inst, threat) {
  const speed = FLEE_SPEED + inst.rng() * FLEE_SPEED_RANGE
  if (inst.fleeDir !== 0 && inst.fleeHold > 0) {
    if (roomTo(inst, inst.fleeDir) < CORNER_ROOM) {
      inst.fleeDir = -inst.fleeDir
      inst.fleeHold = CROSS_HOLD
    }
    row(inst, inst.fleeDir, speed, FLEE_EVERY)
    return
  }
  const away = Math.sign(inst.x - threat.x) || inst.dir
  const shut = roomTo(inst, away) < CORNER_ROOM
  if (shut && inst.startle) return
  inst.fleeDir = shut ? -away : away
  inst.fleeHold = shut ? CROSS_HOLD : FLEE_HOLD
  row(inst, inst.fleeDir, speed, FLEE_EVERY)
}
//
// At its spot: rowing to it, then to and fro about it (each stroke just
// as hard as takes it there: the water's drag stops it on the mark).
//
function keepSlot(inst) {
  if (inst.restIn > 0) return
  const d = inst.slot + inst.swayTo * SLOT_SWAY - inst.x
  const far = Math.abs(d) > SLOT_FAR
  far || (inst.swayTo = -inst.swayTo)
  const wait = far ? GATHER_EVERY : SLOT_EVERY + inst.rng() * SLOT_EVERY_RANGE
  row(inst, Math.sign(d) || inst.dir, Math.min(GATHER_SPEED, Math.abs(d) * DRAG), wait)
}
//
// Under the hero it sinks, straining in jerks (rings going out off it);
// sunk, it holds him no more till it has floated all the way up again.
//
function updateSink(inst, dt) {
  inst.sink = inst.load ? Math.min(SINK_MAX, inst.sink + SINK_MAX / SINK_TIME * dt) : Math.max(0, inst.sink - RISE_RATE * dt)
  inst.sink >= SINK_MAX && (inst.sunk = true)
  inst.sink <= 0 && (inst.sunk = false)
  inst.strain *= Math.exp(-STRAIN_RATE * dt)
  inst.sunk && (inst.strain = 0)
  if (!inst.load) return
  inst.loadT += dt
  inst.strainIn -= dt
  if (inst.strainIn <= 0) {
    inst.strainIn = STRAIN_EVERY + inst.rng() * STRAIN_EVERY_RANGE
    inst.strain = 1
  }
  inst.sinkRingIn -= dt
  if (inst.sinkRingIn > 0) return
  inst.sinkRingIn = SINK_RING_EVERY
  inst.rings.push({ x: inst.x, y: inst.y, t: 0 })
}
//
// Its back's stretch (null while it is sunk) and height.
//
function standSpan(inst) {
  if (inst.sunk) return null
  const half = STAND_HALF * inst.unit
  inst.span.x1 = inst.x - half
  inst.span.x2 = inst.x + half
  return inst.span
}
function standAt(inst, x) {
  const span = standSpan(inst)
  return span && x >= span.x1 && x <= span.x2 ? backY(inst) : null
}
function backY(inst) {
  return inst.y - STAND_UP * inst.unit + inst.sink - inst.strain * STRAIN_UP
}
//
// Its body's water line: the surface, pressed down as it sinks (pushed
// back up a little as it strains).
//
function bodyY(inst) {
  return inst.y + inst.sink * BODY_SINK - inst.strain * STRAIN_UP
}
//
// The middle (along the lake) of everything it fears near it, or null.
//
function threatsMiddle(inst, threats) {
  let x1 = Infinity
  let x2 = -Infinity
  for (const t of threats) {
    if (Math.abs(t.x - inst.x) >= FEAR_R || t.y < inst.y - FEAR_ABOVE || t.y > inst.y + FEAR_BELOW) continue
    x1 = Math.min(x1, t.x)
    x2 = Math.max(x2, t.x)
  }
  if (x1 > x2) return null
  inst.middle.x = (x1 + x2) * HALF
  return inst.middle
}
function roomTo(inst, dir) {
  return dir > 0 ? inst.maxX - inst.x : inst.x - inst.minX
}
function wanderSpeed(inst) {
  return WANDER_SPEED + inst.rng() * WANDER_SPEED_RANGE
}
function wanderWait(inst) {
  return WANDER_EVERY + inst.rng() * WANDER_EVERY_RANGE
}
//
// One stroke: it turns to its way, is thrown ahead, and a ring leaves
// each oar.
//
function row(inst, dir, speed, wait) {
  inst.dir = dir
  inst.vx = dir * Math.max(speed, Math.abs(inst.vx))
  inst.stroke = { t: 0 }
  inst.restIn = wait
  inst.legs.forEach(leg => {
    if (!leg.oar) return
    const foot = footOf(inst, leg)
    inst.rings.push({ x: foot.wx, y: waterUnder(inst, leg, foot.wx), t: 0 })
  })
}
function updateStroke(inst, dt) {
  if (!inst.stroke) return
  inst.stroke.t += dt
  inst.stroke.t >= STROKE_TIME + RECOVER_TIME && (inst.stroke = null)
}
//
// Gliding on, slowed by the water, bouncing off the banks.
//
function glide(inst, dt) {
  inst.vx *= Math.exp(-DRAG * dt)
  inst.x += inst.vx * dt
  if (inst.x < inst.minX) {
    inst.x = inst.minX
    inst.vx = Math.abs(inst.vx) * BOUNCE
  }
  if (inst.x > inst.maxX) {
    inst.x = inst.maxX
    inst.vx = -Math.abs(inst.vx) * BOUNCE
  }
}
//
// Where a leg's foot rests now: body-frame x (an oar sweeps back through
// a stroke and swings forward again; straining, every foot pushes out)
// and world x.
//
function footOf(inst, leg) {
  const lx = (leg.oar ? oarX(inst, leg.rest) : leg.rest) + Math.sign(leg.rest) * inst.strain * STRAIN_SPREAD
  return { lx, wx: inst.x + inst.dir * lx * inst.unit }
}
//
// The water's top under a foot (a far foot's a little further back on it,
// so higher on the screen).
//
function waterUnder(inst, leg, wx) {
  return CaveLake.surfaceAt(inst.lake, wx) - (leg.far ? FAR_LIFT * inst.unit : 0)
}
function oarX(inst, rest) {
  const s = inst.stroke
  if (!s) return rest
  if (s.t < STROKE_TIME) return rest + (STROKE_BACK - rest) * ease(s.t / STROKE_TIME)
  return STROKE_BACK + (rest - STROKE_BACK) * ease((s.t - STROKE_TIME) / RECOVER_TIME)
}
function ease(u) {
  const c = Math.min(1, Math.max(0, u))
  return c * c * (3 - 2 * c)
}
function isCulled(inst, view) {
  return inst.x < view.left - CULL_MARGIN || inst.x > view.right + CULL_MARGIN || inst.y < view.top - CULL_MARGIN || inst.y > view.bottom + CULL_MARGIN
}
//
// A flat ring on the water (a dimple or a stroke's ring), `flat` times as
// high as wide.
//
function drawMark(inst, x, y, r, flat, opacity) {
  inst.k.drawEllipse({
    pos: inst.v.set(x, y),
    radiusX: r,
    radiusY: r * flat,
    fill: false,
    outline: { width: LINE_W, color: inst.markRgb },
    opacity
  })
}
//
// Back to front: the far legs and the far feeler (darker), the body, the
// head, the near feeler, the near legs.
//
function drawStrider(inst, parts) {
  const t = inst.k.time() + inst.phase
  inst.legs.forEach(leg => leg.far && drawLeg(inst, parts, leg))
  drawFeeler(inst, parts, FEELERS[0], t)
  drawPart(inst, parts.get(BODY), 0, 0, ORIGIN, 0, inst.nearColor)
  drawPart(inst, parts.get(HEAD.piece), HEAD_AT.x, HEAD_AT.y, HEAD.pivot, 0, inst.nearColor)
  drawFeeler(inst, parts, FEELERS[1], t)
  inst.legs.forEach(leg => leg.far || drawLeg(inst, parts, leg))
}
function drawFeeler(inst, parts, feeler, t) {
  const angle = feeler.turn + Math.sin(t * FEELER_HZ * Math.PI * 2 + feeler.phase) * FEELER_SWING
  drawPart(inst, parts.get(FEELER.piece), FEELER_AT.x, FEELER_AT.y, FEELER.pivot, angle, feeler.far ? inst.farColor : inst.nearColor)
}
//
// A leg in the body's frame: its foot on the water (riding the wave), the
// knee by IK from the hip — always the upper one, so the legs arch over
// the water as a strider's do; then the femur and the tibia over it.
//
function drawLeg(inst, parts, leg) {
  const foot = footOf(inst, leg)
  const surface = CaveLake.surfaceAt(inst.lake, foot.wx)
  const fx = foot.lx
  const fy = (surface - bodyY(inst)) / inst.unit + HIP_LIFT - (leg.far ? FAR_LIFT : 0)
  let ax = fx - leg.hipX
  let ay = fy - leg.hipY
  const dist = Math.max(Math.abs(leg.l1 - leg.l2) + KNEE_SLACK, Math.min(leg.l1 + leg.l2 - KNEE_SLACK, Math.hypot(ax, ay)))
  const base = Math.atan2(ay, ax)
  ax = Math.cos(base) * dist
  ay = Math.sin(base) * dist
  const bend = Math.acos(Math.max(-1, Math.min(1, (leg.l1 * leg.l1 + dist * dist - leg.l2 * leg.l2) / (2 * leg.l1 * dist))))
  const knee = Math.sin(base - bend) < Math.sin(base + bend) ? base - bend : base + bend
  const kx = leg.hipX + Math.cos(knee) * leg.l1
  const ky = leg.hipY + Math.sin(knee) * leg.l1
  const color = leg.far ? inst.farColor : inst.nearColor
  drawBone(inst, parts.get(FEMUR.piece), FEMUR, leg.hipX, leg.hipY, kx, ky, leg.scale, color)
  drawBone(inst, parts.get(TIBIA.piece), TIBIA, kx, ky, leg.hipX + ax, leg.hipY + ay, leg.scale, color)
}
//
// A bone piece laid from one joint to the other (its p on the first).
//
function drawBone(inst, part, bone, x1, y1, x2, y2, scale, color) {
  const turn = Math.atan2(y2 - y1, x2 - x1) - Math.atan2(bone.q.y - bone.p.y, bone.q.x - bone.p.x)
  drawPart(inst, part, x1, y1, bone.p, turn * DEG, color, scale)
}
//
// One part at a body-frame point, its pivot there, turned (degrees), `s`
// times its sheet size; the pivot's anchor made once per pivot.
//
function drawPart(inst, part, x, y, pivot, angle, color, s = 1) {
  const k = inst.k
  let anchor = inst.anchors.get(pivot)
  anchor || inst.anchors.set(pivot, (anchor = k.vec2(pivot.x / part.w * 2 - 1, pivot.y / part.h * 2 - 1)))
  k.drawSprite({
    sprite: SPRITE,
    quad: part.quad,
    width: part.w * s,
    height: part.h * s,
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
  const names = [BODY, HEAD.piece, FEELER.piece, FEMUR.piece, TIBIA.piece]
  const scale = SCALE * BAKE_OVER * Math.max(...PAIRS.map(pair => pair.scale))
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
//
// The stretch of the open surface between the blocks that holds x (or the
// widest one, if x is on a block).
//
function freeStretch(span, blocks, x) {
  const free = []
  let from = span.x1
  blocks.slice().sort((a, b) => a.x1 - b.x1).forEach(b => {
    b.x1 > from && free.push({ x1: from, x2: b.x1 })
    from = Math.max(from, b.x2)
  })
  from < span.x2 && free.push({ x1: from, x2: span.x2 })
  return free.find(f => x >= f.x1 && x <= f.x2) ?? free.reduce((a, b) => (b.x2 - b.x1 > a.x2 - a.x1 ? b : a), free[0] ?? span)
}
