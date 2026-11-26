import { getRGB } from '../../../utils/helper.js'
import * as Ring from '../../../utils/ring-draw.js'
import { applyForestFilmGrainToCanvas } from '../../forest/utils/forest-parallax-grain.js'
import { CAVE_CFG } from '../cfg.js'
import * as Atlas from '../utils/cave-atlas.js'
import * as Layout from '../utils/cave-layout.js'
import * as CaveLake from '../utils/cave-lake.js'
//
// The trumpeter (plant_right.png): a creature living like a plant on the
// lake's bed near the right bank — a body in a ring of leaves, two eyes,
// and a stalk up from it with a funnel on top, its nose.
//
// Asleep it is a plant: its eyes shut (lids drawn over them), the funnel
// narrowed, its rim held just under the water's line, its stalk swaying it
// slowly to and fro. A school of fish gathering over it (or a fish
// leaping near it at the swarm's fireflies) wakes it: its eyes open
// (pupils drawn, on the nearest fish), its stalk grows up (more of its
// ringed middle shows) till the funnel's rim stands just out of the water,
// and whenever a fish leaps near it at the swarm's fireflies (it heeds no
// other leap: a fish snapping at a lone firefly it lets be), it picks that
// one fish and follows its flight with its funnel
// till it has it: the funnel rising out of the water, opening wider and
// going to and fro under where the fish will come down, the stalk leaning
// under it. The fish drops into the funnel like a ball into a basket: once
// its head is in it is the trumpeter's, sliding on down into the mouth
// (drawn in front of the funnel, cut off along the mouth's near lip) till
// it is all gone inside; the funnel opens wide with a gulp, popping up,
// its teeth showing; then it chews
// (the funnel squeezing in and out), then swallows — a lump running down
// its throat to its body. Once the fish have gone from round it a while
// it sinks back, narrows its funnel and shuts its eyes.
//
// The hero dropping into its open funnel (even while it is busy with a
// fish: that one goes down at once) it grabs (drawn in front of it,
// his lower half gone in it past the mouth's near lip), shakes him to and fro and spits him out up and to the right, over
// onto the right bank (the level throws him: ctx.onSpit).
//
const SPRITE = 'cave0-trumpet'
const GRAIN_SEED = 9700
const C = CAVE_CFG.trumpet
//
// Size and place: world px per sheet px (BAKE_OVER times finer baked); it
// stands TRUMPET_DX px left of the right bank's tip, its foot (the sheet's
// bottom row) FOOT_SINK px into the bed.
//
const SCALE = 0.15
const BAKE_OVER = 2.5
const ATLAS_GAP = 4
const TRUMPET_DX = 230
const FOOT_SINK = 18
//
// The picture (trumpet piece px), its middle at MID_X: the funnel (rows
// 0..CUP_ROWS, columns CUP_X1..CUP_X2; drawn in CUP_SLICES strips, its
// widening growing from none at its foot to all of it at its rim, so its
// foot always meets the throat), the throat under it (to THROAT_ROWS, its
// stalk STALK_TOP_W wide there; drawn in THROAT_SLICES strips so a lump
// can swell it), the body with its eyes and leaves under it (BODY_ROW
// down: the stalk meets it at its narrowest, BAND_X1..BAND_X2). The stalk
// between the throat and the body (STALK_REST long as painted, longer as
// it grows) narrows all the way down from the throat to the body: the
// stalk's rows BAND_ROWS (just over the body), each drawn out across to
// that narrowest width, laid on repeat in BAND_SUBS strips a tile, each
// strip as wide as the stalk is there; the rows just under them faded in
// over their top BAND_BLEND rows so the repeats meet without a seam (a
// row's stalk: its opaque run, SOLID_ALPHA or more, through MID_X). The rim's top row (RIM_ROW); the mouth
// inside the rim (an ellipse: MOUTH); the eyes (EYES: middles, the ball's
// radius EYE_R, the lid's LID_R).
//
const MID_X = 886
const CUP_ROWS = 300
const CUP_X1 = 640
const CUP_X2 = 1135
const THROAT_ROWS = 470
const STALK_TOP_W = 129
const BAND_SUBS = 3
const CUP_SLICES = 12
const THROAT_SLICES = 10
const BAND_ROWS = [550, 580]
const BAND_X1 = 840
const BAND_X2 = 924
const BAND_BLEND = 10
const BODY_ROW = 580
const RIM_ROW = 6
const STALK_REST = (BODY_ROW - THROAT_ROWS) * SCALE
const SOLID_ALPHA = 128
const RGBA = 4
const ALPHA_OFFSET = 3
const MOUTH = { x: 886, y: 135, rx: 168, ry: 100 }
const EYES = [{ x: 740, y: 630 }, { x: 1032, y: 631 }]
const EYE_R = 24
const LID_R = 33
const PUPIL_R = 0.5
const PUPIL_SHIFT = 0.4
//
// Rising and sinking: the stalk grows (lift 0..1) at LIFT_RATE per s till
// the rim stands RIM_UP px out of the water, asleep it sinks till the rim
// is SLEEP_UNDER px under it; its eyes open and shut at
// LID_RATE; the funnel's width eases at CUP_RATE between NARROW asleep, 1
// awake and WIDE while it follows a leaping fish. Eating (or holding the
// hero), it holds its funnel EAT_UP px higher out of the water (eased at
// EAT_RATE), its teeth seen over the water.
//
const RIM_UP = 4
const SLEEP_UNDER = 28
const EAT_UP = 30
const EAT_RATE = 14
const LIFT_RATE = 0.9
const LID_RATE = 3
const CUP_RATE = 5
const NARROW = 0.8
const WIDE = 1.25
const LEAP_NEAR = 160
//
// The fish leaping nearest it within LEAP_NEAR px it follows with its
// funnel till it is caught or back in the water: leaning to right under
// where it will come down through the rim (at most FOLLOW_MAX px across),
// eased at FOLLOW_RATE per s, back upright at FOLLOW_BACK; the funnel held
// LEAP_UP px higher out of the water meanwhile. A catch is a gulp: the
// funnel GULP_WIDE wide for GULP_TIME s, opening at GULP_RATE per s.
//
const FOLLOW_MAX = 70
const FOLLOW_RATE = 12
const LEAP_UP = 26
const FOLLOW_BACK = 2
const GULP_WIDE = 1.4
const GULP_TIME = 0.35
const GULP_RATE = 16
//
// Asleep its stalk sways: the funnel goes SWAY px to either side at
// SWAY_HZ, the stalk leaning under it (none at its foot); the sway eases in
// and out at SWAY_RATE per s as it falls asleep and wakes.
//
const SWAY = 4
const SWAY_HZ = 0.22
const SWAY_RATE = 1.5
//
// Waking: a school over it — WAKE_FISH fish or more within WAKE_R px of it
// along the lake, over its body and in the upper WAKE_DEPTH px of the
// water —, or any leaping within LEAP_NEAR; it sleeps again SLEEP_AFTER s
// after the last of that.
//
const WAKE_FISH = 3
const WAKE_R = 120
const WAKE_DEPTH = 140
const SLEEP_AFTER = 2.5
//
// Chewing, its round mouth goes flat into an oval and back with each
// bite: the funnel CHEW_WIDE times CHEW_SQUEEZE wider, CHEW_CLOSE times it
// lower.
//
// Catching: the fish it follows coming down within CATCH_R px of the
// funnel's middle (times its width), its head through the rim: it is
// seized and slides on down into the mouth (on at the speed it fell, at
// least SLIDE_MIN px/s, drawn to the funnel's middle at SLIDE_CENTER per s)
// till its middle is SLIDE_PAST px under the mouth's near lip — eaten. The
// near lip (the mouth's lower arc, LIP_STEPS points) cuts it off: drawn
// in front of the funnel, only what is over the lip shows (the mask's top
// MASK_H px over the mouth's middle, MASK_W px either side). Then it chews CHEW_TIME s (teeth out over TEETH_IN s; the
// funnel squeezed by up to CHEW_SQUEEZE at CHEW_HZ) and swallows over
// SWALLOW_TIME s: a lump BULGE wider than the throat, BULGE_LEN px long,
// running down it to the body.
//
const CATCH_R = 22
const SLIDE_MIN = 160
const SLIDE_CENTER = 6
const SLIDE_PAST = 30
const LIP_STEPS = 16
const MASK_H = 400
const MASK_W = 200
const DOWN = { x: 0, y: 1 }
const CHEW_TIME = 1.3
const TEETH_IN = 0.08
const CHEW_SQUEEZE = 0.2
const CHEW_WIDE = 0.6
const CHEW_CLOSE = 2.2
const CHEW_HZ = 2.5
const SWALLOW_TIME = 1.4
const BULGE = 0.55
const BULGE_LEN = 9
//
// Teeth, as a shark's: TEETH of them round the far half of the mouth's
// rim (from TEETH_FROM rad past its sides), TOOTH_LEN sheet px long,
// TOOTH_W wide at the root, pointing in — and deeper in, rows all round
// the mouth (TOOTH_ROWS: on a ring `ring` of the mouth's size, `count` of
// them, `size` of a rim tooth's, each row turned half a tooth on from the
// last), darker (toothDeep), drawn deepest first.
//
const TEETH = 9
const TEETH_FROM = 0.35
const TOOTH_LEN = 34
const TOOTH_W = 26
const TOOTH_EDGE = 1
const TOOTH_ROWS = [{ ring: 0.45, count: 10, size: 0.75 }, { ring: 0.72, count: 13, size: 0.9 }]
//
// The hero: taken while awake as his feet fall through its rim within
// TAKE_SHARE of the mouth's half width of its middle. He falls on into the
// mouth as a fish does (at the speed he fell, at least SLIDE_MIN px/s) and
// sticks fast with his centre HELD_DEPTH px under the rim (his lower half
// in it). For SHAKE_TIME s it tries to swallow him — GULP_HZ times a
// second it squeezes its funnel GULP_SQUEEZE in and pulls him GULP_PULL px
// deeper — shaking him SHAKE px to and fro at SHAKE_HZ; he will not go
// down. Then it winds up: over WIND_TIME s its stalk draws in WIND_DOWN px
// (him with it); then over SPIT_TIME s it shoots out THRUST_UP px longer,
// pushing him up to SPIT_DEPTH px over the rim (his feet out), the funnel
// leaning SPIT_LEAN px right and turned SPIT_TILT rad over to the right
// (its mouth up and to the right, after a WIND_TILT turn back to the left
// as it winds up), and spits him out (a splash: the level's); its stalk
// eases back to its length and upright at THRUST_RATE per s.
//
const TAKE_SHARE = 0.85
const HELD_DEPTH = 22
const GULP_HZ = 1.6
const GULP_SQUEEZE = 0.14
const GULP_PULL = 7
const SHAKE = 22
const SHAKE_HZ = 2.2
const SHAKE_TIME = 1.3
const SPIT_TIME = 0.18
const WIND_TIME = 0.35
const WIND_DOWN = 14
const THRUST_UP = 16
const THRUST_RATE = 6
const SPIT_TILT = 0.9
const WIND_TILT = 0.15
const SPIT_DEPTH = -46
const SPIT_LEAN = 30
const DEG = 180 / Math.PI
const STATE = { SLEEP: 'sleep', AWAKE: 'awake', CHEW: 'chew', SWALLOW: 'swallow', HOLD: 'hold' }
const HALF = 0.5
const FULL_TURN = Math.PI * 2
const TRANSPARENT = '00'
const bakedFor = new WeakMap()
let atlas = null

/**
 * Creates the trumpeter on the lake's bed near the right bank.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.lake - Lake instance (cave-lake.js)
 * @returns {Object} Trumpeter instance
 */
export function create(cfg) {
  const { k, lake } = cfg
  bake(k)
  const x = Layout.BANK_TIP_X2 - TRUMPET_DX
  const foot = CaveLake.bedTopAt(lake, x) + FOOT_SINK
  const bodyTop = foot - (atlas ? atlas.h - BODY_ROW : 0) * SCALE
  const restRim = bodyTop - STALK_REST - (THROAT_ROWS - RIM_ROW) * SCALE
  const reach = Math.max(0, restRim - (Layout.LAKE_SURFACE_Y - RIM_UP))
  const sleepRim = bodyTop - STALK_REST - (THROAT_ROWS - CUP_ROWS) * SCALE - (CUP_ROWS - RIM_ROW) * SCALE * NARROW
  const sleepLift = reach > 0 ? Math.max(0, Math.min(1, (sleepRim - (Layout.LAKE_SURFACE_Y + SLEEP_UNDER)) / reach)) : 0
  const inst = {
    k,
    lake,
    x,
    foot,
    bodyTop,
    reach,
    sleepLift,
    state: STATE.SLEEP,
    stateT: 0,
    lift: sleepLift,
    sway: 1,
    swayT: 0,
    follow: 0,
    gulp: 0,
    target: null,
    swallow: null,
    lastX: 0,
    lastY: 0,
    cupNow: null,
    drawWith: null,
    lipPts: Array.from({ length: LIP_STEPS + 1 }, () => k.vec2(0, 0)),
    maskFn: null,
    heroFn: null,
    fishFn: null,
    heldDepth: 0,
    thrust: 0,
    tilt: 0,
    heldV: 0,
    stuckT: -1,
    pop: 0,
    lid: 1,
    cup: NARROW,
    awakeFor: 0,
    look: null,
    color: getRGB(k, C.tint),
    lidRgb: getRGB(k, C.lid),
    lidEdgeRgb: getRGB(k, C.lidEdge),
    pupilRgb: getRGB(k, C.pupil),
    toothRgb: getRGB(k, C.tooth),
    toothDeepRgb: getRGB(k, C.toothDeep),
    toothEdgeRgb: getRGB(k, C.toothEdge),
    v: k.vec2(0, 0),
    tri: [k.vec2(0, 0), k.vec2(0, 0), k.vec2(0, 0)]
  }
  inst.maskFn = () => drawLipMask(inst)
  inst.heroFn = () => inst.drawWith.hero(heldInCup(inst))
  inst.fishFn = () => inst.drawWith.fish(inst.swallow.fish)
  return inst
}

/**
 * Runs it on: waking and sleeping, its stalk, eyes and funnel easing, a
 * catch, its chewing and swallowing.
 * @param {Object} inst - Trumpeter instance
 * @param {Object} ctx
 * @param {Array<Object>} ctx.school - The lake's fish
 * @param {(fish: Object) => {x: number, y: number}|null} ctx.headOf - A fish's head while it swims in the water
 * @param {(fish: Object) => {x: number, y: number}|null} ctx.leapOf - A fish's head while it leaps out of the water at the swarm's fireflies (the only leaps it heeds)
 * @param {(fish: Object) => {x: number, y: number}|null} ctx.tailOf - A fish's tail while it leaps out of the water
 * @param {(fish: Object, y: number) => number|null} ctx.landingOf - Where a leaping fish comes down through height y
 * @param {(fish: Object, out: {x: number, y: number}) => void} ctx.seizeFish - It has that fish (Fish.seize: head along `out`)
 * @param {(fish: Object, at: Object, angle: number, dir: Object, share: number) => void} ctx.holdFish - Holds it with its middle at `at` (Fish.hold)
 * @param {(fish: Object) => void} ctx.onCatch - It has eaten that fish (it is gone)
 * @param {(at: {x: number, y: number}) => void} ctx.onSpit - It spat the hero out (his centre now)
 */
export function onUpdate(inst, ctx) {
  const dt = inst.k.dt()
  if (dt <= 0) return
  inst.stateT += dt
  const near = nearFish(inst, ctx)
  pickTarget(inst, ctx, near)
  inst.look = (inst.target && ctx.leapOf(inst.target)) ?? near.nearest
  inst.awakeFor = near.wake ? SLEEP_AFTER : inst.awakeFor - dt
  inst.state === STATE.SLEEP && inst.awakeFor > 0 && setState(inst, STATE.AWAKE)
  inst.state === STATE.AWAKE && inst.awakeFor <= 0 && !inst.swallow && setState(inst, STATE.SLEEP)
  inst.state === STATE.CHEW && inst.stateT >= CHEW_TIME && setState(inst, STATE.SWALLOW)
  inst.state === STATE.SWALLOW && inst.stateT >= SWALLOW_TIME && setState(inst, inst.awakeFor > 0 ? STATE.AWAKE : STATE.SLEEP)
  const asleep = inst.state === STATE.SLEEP
  inst.lift += Math.max(-LIFT_RATE * dt, Math.min(LIFT_RATE * dt, (asleep ? inst.sleepLift : 1) - inst.lift))
  inst.sway += Math.max(-SWAY_RATE * dt, Math.min(SWAY_RATE * dt, (asleep ? 1 : 0) - inst.sway))
  inst.swayT += dt
  inst.lid += Math.max(-LID_RATE * dt, Math.min(LID_RATE * dt, (asleep ? 1 : 0) - inst.lid))
  const eating = inst.state === STATE.CHEW || inst.state === STATE.SWALLOW || inst.state === STATE.HOLD
  inst.pop += ((eating ? EAT_UP : (inst.target || inst.swallow ? LEAP_UP : 0)) - inst.pop) * Math.min(1, EAT_RATE * dt)
  inst.state === STATE.HOLD && inst.swallow && gulpDown(inst, ctx)
  inst.state === STATE.HOLD ? holdHero(inst, ctx, dt) : follow(inst, ctx, dt)
  inst.state === STATE.HOLD || (inst.thrust -= inst.thrust * Math.min(1, THRUST_RATE * dt))
  inst.state === STATE.HOLD || (inst.tilt -= inst.tilt * Math.min(1, THRUST_RATE * dt))
  inst.gulp = Math.max(0, inst.gulp - dt)
  const gulping = inst.gulp > 0
  const cup = asleep ? NARROW : (gulping ? GULP_WIDE : (inst.target ? WIDE : 1))
  inst.cup += (cup - inst.cup) * Math.min(1, (gulping ? GULP_RATE : CUP_RATE) * dt)
  inst.state === STATE.AWAKE && catchTarget(inst, ctx, dt)
  inst.swallow && slideIn(inst, ctx, dt)
}

/**
 * Whether it takes the hero now: awake (or busy with a fish: catching,
 * chewing or swallowing it), its rim out of the water, his feet falling
 * through it over its mouth.
 * @param {Object} inst - Trumpeter instance
 * @param {number} x - Hero X
 * @param {number} feetY - His feet's Y now
 * @param {number} prevFeetY - His feet's Y last frame
 * @returns {boolean}
 */
export function takes(inst, x, feetY, prevFeetY) {
  const rim = rimY(inst)
  if (inst.state === STATE.SLEEP || inst.state === STATE.HOLD || rim > Layout.LAKE_SURFACE_Y) return false
  return Math.abs(x - (inst.x + inst.follow)) < MOUTH.rx * SCALE * inst.cup * TAKE_SHARE && prevFeetY <= rim && feetY >= rim
}

/**
 * It grabs the hero (his centre at heroY now, falling at heroVy): he falls
 * on into its funnel and sticks there; it tries to swallow him and spits
 * him out (ctx.onSpit).
 * @param {Object} inst - Trumpeter instance
 * @param {number} heroY - World Y of his centre
 * @param {number} heroVy - His fall speed (px/s)
 */
export function grab(inst, heroY, heroVy) {
  setState(inst, STATE.HOLD)
  inst.target = null
  inst.gulp = GULP_TIME
  inst.heldDepth = heroY - rimY(inst)
  inst.heldV = Math.max(SLIDE_MIN, heroVy)
  inst.stuckT = -1
}

/**
 * Where the hero it holds is: his centre (world) and his tilt (degrees,
 * with the funnel's lean).
 * @param {Object} inst - Trumpeter instance
 * @returns {{x: number, y: number, angle: number}}
 */
export function heldPoint(inst) {
  const at = heldInCup(inst)
  const pivot = cupPivot(inst, rimY(inst))
  const c = Math.cos(inst.tilt)
  const sn = Math.sin(inst.tilt)
  return {
    x: pivot.x + (at.x - pivot.x) * c - (at.y - pivot.y) * sn,
    y: pivot.y + (at.x - pivot.x) * sn + (at.y - pivot.y) * c,
    angle: at.angle + inst.tilt * DEG
  }
}

/**
 * Draws it (under the water's see-through paint): its body and leaves,
 * its stalk (swollen where a lump goes down), its throat, its funnel (its
 * teeth while it eats), its eyes (lidded, or open with pupils).
 * @param {Object} inst - Trumpeter instance
 * @param {{left: number, right: number}} view - World rect in view
 * @param {Object} draw
 * @param {(at: {x: number, y: number, angle: number}) => void} draw.hero - Draws the hero it holds (his centre, his tilt)
 * @param {(fish: Object) => void} draw.fish - Draws the fish it has (held)
 */
export function onDraw(inst, view, draw) {
  const parts = bakedFor.get(inst.k)
  const halfW = atlas ? atlas.w * SCALE * HALF : 0
  if (!parts || inst.x + halfW < view.left || inst.x - halfW > view.right) return
  const ext = STALK_REST + inst.lift * inst.reach + inst.pop + inst.thrust
  const throatBottom = inst.bodyTop - ext
  const throatTop = throatBottom - (THROAT_ROWS - CUP_ROWS) * SCALE
  const lump = lumpY(inst, throatTop)
  const lean = { h: inst.bodyTop - throatTop, at: SWAY * inst.sway * Math.sin(inst.swayT * SWAY_HZ * FULL_TURN) + inst.follow }
  drawStalk(inst, parts.band, ext, lump, lean)
  drawRows(inst, parts.body, BODY_ROW, inst.bodyTop, 1, 1, 0)
  for (let i = 0; i < THROAT_SLICES; i++) {
    const rows = (THROAT_ROWS - CUP_ROWS) / THROAT_SLICES
    const y = throatTop + i * rows * SCALE
    drawSlice(inst, parts.throat, i * rows, rows, y, swell(y + rows * SCALE * HALF, lump), leanAt(inst, lean, y + rows * SCALE * HALF))
  }
  const sq = squeeze(inst)
  const chewing = inst.state === STATE.CHEW
  const sx = inst.cup * (chewing ? 1 + sq * CHEW_WIDE : 1 - sq)
  const sy = inst.cup * (1 - (chewing ? sq * CHEW_CLOSE : 0))
  inst.cupNow = { top: throatTop - CUP_ROWS * SCALE * sy, sx, sy, dx: lean.at }
  drawEyes(inst)
  inst.drawWith = draw
  const k = inst.k
  k.pushTransform()
  k.pushTranslate(k.vec2(inst.x + lean.at, throatTop))
  k.pushRotate(inst.tilt * DEG)
  k.pushTranslate(k.vec2(-inst.x - lean.at, -throatTop))
  drawCup(inst, parts.cup, inst.cupNow)
  drawTeeth(inst, inst.cupNow)
  inst.state === STATE.HOLD && k.drawMasked(inst.heroFn, inst.maskFn)
  inst.swallow && k.drawMasked(inst.fishFn, inst.maskFn)
  k.popTransform()
}
//
// The hero it holds as in its funnel before the funnel's tilt (drawn under
// the funnel's own turn): his centre and his lean (degrees).
//
function heldInCup(inst) {
  const rim = rimY(inst)
  return { x: inst.x + inst.follow, y: rim + inst.heldDepth, angle: Math.atan2(inst.follow, inst.bodyTop - rim) * DEG }
}
//
// Where the funnel turns (tilting to spit): the middle of its foot on the
// throat.
//
function cupPivot(inst, rim) {
  return { x: inst.x + inst.follow, y: rim + (CUP_ROWS - RIM_ROW) * SCALE * inst.cup }
}
//
// The mask over the mouth's near lip: all over the mouth's middle row, and
// the lower half of the mouth under it.
//
function drawLipMask(inst) {
  const cup = inst.cupNow
  const c = cupPoint(inst, cup, MOUTH.x, MOUTH.y)
  const rx = MOUTH.rx * SCALE * cup.sx
  const ry = MOUTH.ry * SCALE * cup.sy
  inst.k.drawRect({ pos: inst.v.set(c.x - MASK_W, c.y - MASK_H), width: MASK_W * 2, height: MASK_H })
  inst.lipPts.forEach((p, i) => {
    const t = Math.PI * i / LIP_STEPS
    p.x = c.x + Math.cos(t) * rx
    p.y = c.y + Math.sin(t) * ry
  })
  inst.k.drawPolygon({ pts: inst.lipPts })
}
//
// How far across the stalk leans at y: none at its foot, all of the sway
// at the funnel.
//
function leanAt(inst, lean, y) {
  return lean.h > 0 ? lean.at * Math.max(0, Math.min(1, (inst.bodyTop - y) / lean.h)) : 0
}
//
// Awake, it picks the fish leaping nearest it and keeps to that one till
// it is back in the water (or caught); not awake, none.
//
function pickTarget(inst, ctx, near) {
  if (inst.state !== STATE.AWAKE) {
    inst.target = null
    return
  }
  inst.target && !ctx.leapOf(inst.target) && (inst.target = null)
  if (inst.target || inst.swallow || !near.leaper) return
  inst.target = near.leaper
  const head = ctx.leapOf(near.leaper)
  inst.lastX = head.x
  inst.lastY = head.y
}
//
// Its funnel under where the fish it follows will come down through its
// rim (upright again once there is none).
//
function follow(inst, ctx, dt) {
  const x = inst.target ? ctx.landingOf(inst.target, rimY(inst)) : null
  const to = x === null ? 0 : Math.max(-FOLLOW_MAX, Math.min(FOLLOW_MAX, x - inst.x))
  inst.follow += (to - inst.follow) * Math.min(1, (x === null ? FOLLOW_BACK : FOLLOW_RATE) * dt)
}
//
// The hero in its funnel: falling on in till he sticks, then gulped at and
// shaken to and fro; its stalk winds up shorter and shoots out longer,
// pushing him up out of it leaning right; spat out.
//
function holdHero(inst, ctx, dt) {
  if (inst.stuckT < 0) {
    inst.heldDepth = Math.min(HELD_DEPTH, inst.heldDepth + inst.heldV * dt)
    inst.heldDepth >= HELD_DEPTH && (inst.stuckT = 0)
    return
  }
  inst.stuckT += dt
  const t = inst.stuckT
  if (t < SHAKE_TIME) {
    inst.heldDepth = HELD_DEPTH + GULP_PULL * gulpPull(inst)
    inst.follow = SHAKE * Math.sin(Math.PI * t / SHAKE_TIME) * Math.sin(t * SHAKE_HZ * FULL_TURN)
    return
  }
  const wind = (t - SHAKE_TIME) / WIND_TIME
  inst.heldDepth = HELD_DEPTH
  inst.follow = 0
  if (wind < 1) {
    inst.thrust = -WIND_DOWN * wind * (2 - wind)
    inst.tilt = -WIND_TILT * wind * (2 - wind)
    return
  }
  const u = Math.min(1, (t - SHAKE_TIME - WIND_TIME) / SPIT_TIME)
  inst.thrust = -WIND_DOWN + (WIND_DOWN + THRUST_UP) * u
  inst.tilt = -WIND_TILT + (WIND_TILT + SPIT_TILT) * u
  inst.heldDepth = HELD_DEPTH + (SPIT_DEPTH - HELD_DEPTH) * u
  inst.follow = SPIT_LEAN * u
  if (u < 1) return
  ctx.onSpit(heldPoint(inst))
  inst.gulp = GULP_TIME
  inst.awakeFor = SLEEP_AFTER
  setState(inst, STATE.AWAKE)
}
function setState(inst, state) {
  inst.state = state
  inst.stateT = 0
}
//
// The fish round it: whether they wake it (or keep it awake), the one
// leaping nearest it, and the nearest one's head (for its eyes).
//
function nearFish(inst, ctx) {
  let count = 0
  let leaper = null
  let leapD = LEAP_NEAR
  let nearest = null
  let best = Infinity
  const surface = Layout.LAKE_SURFACE_Y
  ctx.school.forEach(fish => {
    const leap = ctx.leapOf(fish)
    const head = leap ?? ctx.headOf(fish)
    if (!head) return
    const dx = Math.abs(head.x - inst.x)
    if (leap && dx < leapD) {
      leapD = dx
      leaper = fish
    }
    !leap && dx < WAKE_R && head.y < inst.bodyTop && head.y < surface + WAKE_DEPTH && count++
    const d = Math.hypot(head.x - inst.x, head.y - inst.bodyTop)
    if (d >= best) return
    best = d
    nearest = head
  })
  return { wake: count >= WAKE_FISH || Boolean(leaper), leaper, nearest }
}
//
// The fish it follows, coming down over its funnel, drops into it: its
// head through the rim, it is seized (head on the way it falls) and slides
// on in (slideIn).
//
function catchTarget(inst, ctx, dt) {
  const fish = inst.target
  const head = fish && ctx.leapOf(fish)
  if (!head) return
  const vx = (head.x - inst.lastX) / dt
  const vy = (head.y - inst.lastY) / dt
  inst.lastX = head.x
  inst.lastY = head.y
  const rim = rimY(inst)
  const mouthX = inst.x + inst.follow
  if (vy <= 0 || head.y < rim || rim > Layout.LAKE_SURFACE_Y || Math.abs(head.x - mouthX) >= CATCH_R * inst.cup) return
  const tail = ctx.tailOf(fish) ?? head
  const v = Math.hypot(vx, vy) || 1
  ctx.seizeFish(fish, { x: vx / v, y: vy / v })
  inst.swallow = { fish, dx: (head.x + tail.x) * HALF - mouthX, dy: (head.y + tail.y) * HALF - rim, v: Math.max(SLIDE_MIN, vy) }
  inst.target = null
  inst.gulp = GULP_TIME
  slideIn(inst, ctx, 0)
}
//
// The hero dropped in while a fish was still sliding into its mouth: that
// fish is gone down at once.
//
function gulpDown(inst, ctx) {
  ctx.onCatch(inst.swallow.fish)
  inst.swallow = null
}
//
// The fish it has sliding on down into its mouth, drawn to its middle;
// all of it gone past the near lip, it is eaten and chewed.
//
function slideIn(inst, ctx, dt) {
  const s = inst.swallow
  s.dy += s.v * dt
  s.dx *= Math.exp(-SLIDE_CENTER * dt)
  const rim = rimY(inst)
  ctx.holdFish(s.fish, { x: inst.x + inst.follow + s.dx, y: rim + s.dy }, 0, DOWN, 0)
  if (s.dy < (MOUTH.y + MOUTH.ry - RIM_ROW) * SCALE * inst.cup + SLIDE_PAST) return
  inst.swallow = null
  ctx.onCatch(s.fish)
  setState(inst, STATE.CHEW)
}
//
// The rim's top: its stalk grown by its lift, its funnel at its width.
//
function rimY(inst) {
  return inst.bodyTop - STALK_REST - inst.lift * inst.reach - inst.pop - inst.thrust - (THROAT_ROWS - CUP_ROWS) * SCALE - (CUP_ROWS - RIM_ROW) * SCALE * inst.cup
}
//
// How far the funnel is squeezed in now (chewing, or gulping at the hero).
//
function squeeze(inst) {
  if (inst.state === STATE.HOLD) return GULP_SQUEEZE * gulpPull(inst)
  return inst.state === STATE.CHEW ? CHEW_SQUEEZE * (HALF - HALF * Math.cos(inst.stateT * CHEW_HZ * FULL_TURN)) : 0
}
//
// How hard it gulps at the hero stuck in it now (0..1; none before he
// sticks, nor once it spits).
//
function gulpPull(inst) {
  const t = inst.stuckT
  return t < 0 || t >= SHAKE_TIME ? 0 : HALF - HALF * Math.cos(t * GULP_HZ * FULL_TURN)
}
//
// Where the lump of a swallowed fish is now (null: none): from the
// funnel's foot down to the body.
//
function lumpY(inst, throatTop) {
  if (inst.state !== STATE.SWALLOW) return null
  const u = inst.stateT / SWALLOW_TIME
  return throatTop + (inst.bodyTop - throatTop) * u * u * (3 - 2 * u)
}
//
// How much wider the stalk is at y with a lump at `lump`.
//
function swell(y, lump) {
  if (lump === null) return 1
  const d = (y - lump) / BULGE_LEN
  return 1 + BULGE * Math.exp(-d * d)
}
//
// The stalk from the body up to the throat (len px of it): its tile laid
// on repeat in thin strips, each as wide as the stalk is there — narrow at
// the body, as wide as the throat's foot at the top (the topmost strip cut
// short).
//
function drawStalk(inst, part, len, lump, lean) {
  const tile = (BAND_ROWS[1] - BAND_ROWS[0]) * SCALE
  const step = tile / BAND_SUBS
  const widen = STALK_TOP_W / (BAND_X2 - BAND_X1) - 1
  const mid = ((BAND_X1 + BAND_X2) * HALF - MID_X) * SCALE
  for (let i = 0; i * step < len; i++) {
    const d = i * step
    const h = Math.min(step, len - d)
    const y = inst.bodyTop - d - h
    const sub = i % BAND_SUBS
    const w = part.w * (1 + widen * (d + h * HALF) / len) * swell(y + h * HALF, lump)
    inst.k.drawSprite({
      sprite: SPRITE,
      quad: { x: part.quad.x, y: part.quad.y + part.quad.h * (1 - sub / BAND_SUBS - h / tile), w: part.quad.w, h: part.quad.h * h / tile },
      width: w,
      height: h,
      pos: inst.v.set(inst.x + leanAt(inst, lean, y + h * HALF) + mid - w * HALF, y),
      color: inst.color
    })
  }
}
//
// The funnel in strips, each as much wider as it is near the rim (its foot
// as painted, meeting the throat), sy times as tall.
//
function drawCup(inst, part, cup) {
  const rows = CUP_ROWS / CUP_SLICES
  for (let i = 0; i < CUP_SLICES; i++) {
    const s = rowScale(cup, (i + HALF) * rows)
    inst.k.drawSprite({
      sprite: SPRITE,
      quad: { x: part.quad.x, y: part.quad.y + part.quad.h * i / CUP_SLICES, w: part.quad.w, h: part.quad.h / CUP_SLICES },
      width: part.w * s,
      height: rows * SCALE * cup.sy,
      pos: inst.v.set(inst.x + cup.dx + (part.x1 - MID_X) * SCALE * s, cup.top + i * rows * SCALE * cup.sy),
      color: inst.color
    })
  }
}
//
// How much wider the funnel is drawn at a row of it: all of its widening
// at the rim, none at its foot.
//
function rowScale(cup, row) {
  return 1 + (cup.sx - 1) * (1 - row / CUP_ROWS)
}
//
// A part's rows drawn from a world top, its middle on the trumpeter's
// (shifted dx px across), sx / sy times its size.
//
function drawRows(inst, part, fromRow, top, sx, sy, dx) {
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: part.quad,
    width: part.w * sx,
    height: part.h * sy,
    pos: inst.v.set(inst.x + dx + (part.x1 - MID_X) * SCALE * sx, top),
    color: inst.color
  })
}
//
// A strip of a part (rows from..+count of it, from its own top) at a world
// top, `widen` times as wide, shifted dx px across.
//
function drawSlice(inst, part, from, count, top, widen, dx) {
  inst.k.drawSprite({
    sprite: SPRITE,
    quad: { x: part.quad.x, y: part.quad.y + part.quad.h * from / part.rows, w: part.quad.w, h: part.quad.h * count / part.rows },
    width: part.w * widen,
    height: count * SCALE,
    pos: inst.v.set(inst.x + dx + (part.x1 - MID_X) * SCALE * widen, top),
    color: inst.color
  })
}
//
// Teeth round the far half of its mouth, pointing in, while it eats.
//
function drawTeeth(inst, cup) {
  const out = inst.swallow ? 1 : inst.state === STATE.CHEW || inst.state === STATE.HOLD ? Math.min(1, inst.stateT / TEETH_IN) : (inst.state === STATE.SWALLOW ? Math.max(0, 1 - inst.stateT / TEETH_IN) : 0)
  if (out <= 0) return
  TOOTH_ROWS.forEach((row, r) => {
    for (let i = 0; i < row.count; i++) {
      const t = FULL_TURN * (i + HALF * (r + 1)) / row.count
      drawTooth(inst, cup, t, row.ring, row.size * out, row.size, inst.toothDeepRgb)
    }
  })
  const span = Math.PI - TEETH_FROM * 2
  for (let i = 0; i < TEETH; i++) drawTooth(inst, cup, Math.PI + TEETH_FROM + span * (i + HALF) / TEETH, 1, out, 1, inst.toothRgb)
}
//
// One tooth on a ring of the mouth (`ring` of its size) at angle t,
// pointing in to its middle: `grow` of a rim tooth's length, `size` of its
// width.
//
function drawTooth(inst, cup, t, ring, grow, size, color) {
  const bx = MOUTH.x + Math.cos(t) * MOUTH.rx * ring
  const by = MOUTH.y + Math.sin(t) * MOUTH.ry * ring
  const ix = MOUTH.x - bx
  const iy = MOUTH.y - by
  const il = Math.hypot(ix, iy) || 1
  const ux = ix / il
  const uy = iy / il
  const len = TOOTH_LEN * grow
  const half = TOOTH_W * size * HALF
  const p1 = cupPoint(inst, cup, bx - uy * half, by + ux * half)
  const p2 = cupPoint(inst, cup, bx + uy * half, by - ux * half)
  const p3 = cupPoint(inst, cup, bx + ux * len, by + uy * len)
  inst.k.drawTriangle({
    p1: inst.tri[0].set(p1.x, p1.y),
    p2: inst.tri[1].set(p2.x, p2.y),
    p3: inst.tri[2].set(p3.x, p3.y),
    color,
    outline: { width: TOOTH_EDGE, color: inst.toothEdgeRgb }
  })
}
//
// A point of the funnel's picture (sheet px) in the world, the funnel at
// its place and size now.
//
function cupPoint(inst, cup, px, py) {
  return { x: inst.x + cup.dx + (px - MID_X) * SCALE * rowScale(cup, py), y: cup.top + py * SCALE * cup.sy }
}
//
// Its eyes: open, a pupil on each looking at the nearest fish; shutting,
// a lid coming down over each (its edge darker).
//
function drawEyes(inst) {
  const k = inst.k
  EYES.forEach(eye => {
    const x = inst.x + (eye.x - MID_X) * SCALE
    const y = inst.bodyTop + (eye.y - BODY_ROW) * SCALE
    const r = EYE_R * SCALE
    if (inst.lid < 1) {
      const lx = inst.look ? inst.look.x - x : 0
      const ly = inst.look ? inst.look.y - y : 0
      const l = Math.hypot(lx, ly) || 1
      Ring.disc(k, x + lx / l * r * PUPIL_SHIFT, y + ly / l * r * PUPIL_SHIFT, r * PUPIL_R, r * PUPIL_R, inst.pupilRgb, 1)
    }
    if (inst.lid <= 0) return
    const lr = LID_R * SCALE
    const lidY = y - lr + lr * inst.lid
    const lidH = Math.max(TOOTH_EDGE, lr * inst.lid)
    Ring.disc(k, x, lidY, lr, lidH, inst.lidRgb, 1)
    Ring.ring(k, x, lidY, lr, lidH, TOOTH_EDGE, inst.lidEdgeRgb, 1)
  })
}
//
// The picture cut into its parts, baked once per page at BAKE_OVER times
// its drawn size (the stalk's middle as a seamless repeat), grained,
// loaded once per live k; per part its quad, drawn size, left column and
// rows.
//
function bake(k) {
  if (bakedFor.has(k)) return
  atlas ??= buildAtlas()
  if (!atlas) return
  k.loadSprite(SPRITE, atlas.canvas, { singular: true, filter: 'linear' })
  bakedFor.set(k, atlas.parts)
}
function buildAtlas() {
  const src = Atlas.piece('trumpet')
  if (!src) return null
  const items = [
    { name: 'cup', src, x1: CUP_X1, x2: CUP_X2, y1: 0, y2: CUP_ROWS },
    { name: 'throat', src, x1: CUP_X1, x2: CUP_X2, y1: CUP_ROWS, y2: THROAT_ROWS },
    { name: 'band', src: bandTile(src), x1: BAND_X1, x2: BAND_X2, y1: 0, y2: BAND_ROWS[1] - BAND_ROWS[0], own: true },
    { name: 'body', src, x1: 0, x2: src.width, y1: BODY_ROW, y2: src.height }
  ]
  const s = SCALE * BAKE_OVER
  const w = Math.ceil(Math.max(...items.map(it => (it.x2 - it.x1) * s))) + ATLAS_GAP * 2
  const h = items.reduce((sum, it) => sum + Math.ceil((it.y2 - it.y1) * s) + ATLAS_GAP, ATLAS_GAP)
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  const ctx = canvas.getContext('2d')
  ctx.imageSmoothingQuality = 'high'
  const parts = {}
  let y = ATLAS_GAP
  items.forEach(it => {
    const pw = Math.ceil((it.x2 - it.x1) * s)
    const ph = Math.ceil((it.y2 - it.y1) * s)
    ctx.drawImage(it.src, it.own ? 0 : it.x1, it.y1, it.x2 - it.x1, it.y2 - it.y1, ATLAS_GAP, y, pw, ph)
    parts[it.name] = { quad: { x: ATLAS_GAP / w, y: y / h, w: pw / w, h: ph / h }, w: (it.x2 - it.x1) * SCALE, h: (it.y2 - it.y1) * SCALE, x1: it.x1, rows: it.y2 - it.y1 }
    y += ph + ATLAS_GAP
  })
  applyForestFilmGrainToCanvas(canvas, GRAIN_SEED)
  return { canvas, parts, w: src.width, h: src.height }
}
//
// The stalk's rows (BAND_ROWS) as a tile that repeats up without a seam,
// each row's stalk drawn out to the tile's width: its top BAND_BLEND rows
// faded into the rows just under the band.
//
function bandTile(src) {
  const w = BAND_X2 - BAND_X1
  const rows = BAND_ROWS[1] - BAND_ROWS[0]
  const alpha = src.getContext('2d', { willReadFrequently: true }).getImageData(0, 0, src.width, src.height).data
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = rows
  const ctx = canvas.getContext('2d')
  for (let r = 0; r < rows; r++) stalkRow(ctx, src, alpha, BAND_ROWS[0] + r, r, w)
  const over = document.createElement('canvas')
  over.width = w
  over.height = BAND_BLEND
  const octx = over.getContext('2d')
  for (let r = 0; r < BAND_BLEND; r++) stalkRow(octx, src, alpha, BAND_ROWS[1] + r, r, w)
  const fade = octx.createLinearGradient(0, 0, 0, BAND_BLEND)
  fade.addColorStop(0, C.pupil)
  fade.addColorStop(1, C.pupil + TRANSPARENT)
  octx.globalCompositeOperation = 'destination-in'
  octx.fillStyle = fade
  octx.fillRect(0, 0, w, BAND_BLEND)
  ctx.drawImage(over, 0, 0)
  return canvas
}
//
// One row of the stalk (its opaque run through MID_X) drawn out to w px at
// row `to` of a tile.
//
function stalkRow(ctx, src, alpha, row, to, w) {
  let l = MID_X
  let r = MID_X
  while (l > 0 && isSolid(alpha, src.width, l - 1, row)) l--
  while (r < src.width - 1 && isSolid(alpha, src.width, r + 1, row)) r++
  ctx.drawImage(src, l, row, r - l + 1, 1, 0, to, w, 1)
}
function isSolid(alpha, width, x, row) {
  return alpha[(row * width + x) * RGBA + ALPHA_OFFSET] >= SOLID_ALPHA
}
