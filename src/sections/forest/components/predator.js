import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { FOREST_PAL } from '../utils/forest-palette.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { initBody, samplePredatorSpineHitPoints, tickBody } from './predator-body.js'
import { tickLegs, solveLeg, footNow } from './predator-ik.js'
import { initEyes, tickEyes } from './predator-eyes.js'
import { initHead, drawHead } from './predator-head.js'
import { tickMove, startFleeMove } from './predator-move.js'
import {
  cancelPredatorFeast,
  getPredatorFeastLookTarget,
  isPredatorFeasting,
  tickPredatorFruitFeast
} from './predator-fruit-feast.js'
import * as Sound from '../../../utils/sound.js'

//
// Low predatory crawler. Pose is computed every frame from the spine, the
// leg targets and the eye targets — there is no baked walk cycle.
//
const LEG_PAIRS = 12
//
// Leg pairs run from the first plate behind the head (LEG_FIRST_SEG) to
// LEG_TAIL_FREE plates short of the tail.
//
const LEG_FIRST_SEG = 1
const LEG_TAIL_FREE = 2
//
// Near-side legs start half a stride ahead so the two rows alternate.
//
const NEAR_SIDE = 1
const NEAR_FOOT_LEAD = 5
const NEAR_STEP_DELAY = 0.08
const THIGH = 11
const SHIN = 13
const DRAW_Z = CFG.visual.zIndex.player - 1
//
// Look (draw only — hit tests use the spine), after the reference picture:
// a mossy centipede. The body is a row of domed shell plates, tail first so
// each nearer plate overlaps the one behind and its contour arc marks the
// joint: a green moss dome (PLATE_R of the segment's radius, lifted
// DOME_RISE of it) with a darker lower half and a few light moss clumps on
// top (CLUMPS, as shares of the radius). The joints are bridged so a
// stretched charge never shows gaps. Legs start at the dome's lower side, at
// fixed places along the spine.
//
//
// In a rage the thorns lay back against the way it runs (tangent lean added
// to the unit normal, scaled by inst.anger).
//
const THORN_RAGE_BACK = 1.1
const PLATE_R = 1.05
const PLATE_RIM = 1.4
const DOME_RISE = 0.28
const DOME_SHADE_DROP = 0.3
const DOME_LIT_R = 0.62
const DOME_LIT_RISE = 0.28
const BRIDGE_W = 1.45
const CLUMPS = [{ dx: -0.35, dy: -0.7, r: 0.22 }, { dx: 0.1, dy: -0.82, r: 0.26 }, { dx: 0.5, dy: -0.62, r: 0.2 }]
//
// Back spikes: a pale horn thorn (THORN_H) on every SPIKE_AT plate (shares of
// the body), standing out of the moss; on every SPROUT_EVERY-th of them it
// stands between a sprout of two pointed leaves (SPROUT_LEAF_LEN, spread
// SPROUT_SPREAD rad), one on each side of it, SPROUT_SIDE_GAP px off its
// middle so the thorn never hides them.
//
const SPIKE_AT = [0.16, 0.26, 0.36, 0.46, 0.56, 0.66, 0.76, 0.86]
const SPROUT_EVERY = 3
const SPROUT_LEAF_LEN = 7
const SPROUT_LEAF_HALF = 2.4
const SPROUT_SPREAD = 0.95
const SPROUT_SIDE_GAP = 3.2
const THORN_H = 10
const THORN_HALF = 2
//
// No two thorns alike: each (by its number) is THORN_H_MIN..+RANGE times as
// tall, THORN_W_MIN..+RANGE times as wide and its tip leans up to THORN_LEAN
// along the body.
//
const THORN_H_MIN = 0.75
const THORN_H_RANGE = 0.6
const THORN_W_MIN = 0.85
const THORN_W_RANGE = 0.4
const THORN_LEAN = 0.28
const THORN_HASH_H = 12.9898
const THORN_HASH_W = 78.233
const THORN_HASH_L = 37.719
const THORN_HASH_MUL = 43758.5453
//
// Legs: sharp, curved brown claws — a short thigh from the hip, then the
// shin tapering from LEG_KNEE_W to a point at the foot, bowed LEG_BOW px.
// Far-side legs are a shade darker.
//
const LEG_THIGH_W = 3
const LEG_KNEE_W = 3.6
const LEG_BOW = 1.6
const LEG_RIM = 1.2
//
// Tail: two big curved shear claws (TAIL_CLAW_LEN, TAIL_CLAW_W thick at the
// base) spreading back from the last plate.
//
const TAIL_CLAW_LEN = 24
const TAIL_CLAW_W = 5
const TAIL_CLAW_OPEN = 0.45
const TAIL_CLAW_BEND = 0.5
//
// Hit reach past the tail (its claws), as the old tail shears had.
//
const SHEAR_REACH = 18
const HERO_HIT_HALF_W = 15
const HERO_HIT_H = 69
const SNOUT_REACH = 7
const SNOUT_DROP = 2.4
const SNOUT_HALF = 4.1
//
// Near-side legs are drawn over the shell from its lower edge
// (NEAR_LEG_FROM of the plate's radius under its middle), so they read in
// front without crossing the plates.
//
const NEAR_LEG_FROM = 0.72
//
// Hero must be within this horizontal span of the body to hear foot taps.
//
const FOOT_HEAR_RANGE_X = 360
//
// A burst closer than this (to the body centre) sends the crawler fleeing.
//
const FLEE_TRIGGER_RADIUS = 460
//
// Swimming body rides half under the water line.
//
const SWIM_SURFACE_SINK = 16
//
// Width inside the shore over which the swim line eases down from the ground.
//
const SWIM_SHORE_RAMP_PX = 56

/**
 * Creates the crawler on the ground line.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.x - Head start X
 * @param {number} cfg.minX - Left wander bound
 * @param {number} cfg.maxX - Right wander bound
 * @param {function(number): number} cfg.groundAt - Surface Y under a world X (up is smaller)
 * @param {Object} cfg.hero - Hero inst
 * @param {Object} cfg.zones - Level zones
 * @param {Object} [cfg.sfx] - Shared Sound inst for foot taps
 * @param {number} [cfg.dir=-1] - Initial facing, -1 left, 1 right
 * @param {function(): boolean} [cfg.canHuntHero] - When false, the hero is ignored
 * @param {{x1: number, x2: number, surfaceY: number}} [cfg.water] - Lake span the crawler can swim across
 * @param {number} [cfg.fleeLeftX] - Far-left swim target when fleeing left
 * @param {number} [cfg.homeX] - Roam-home X when the hero is off the ground line (the roam strip's right end)
 * @param {number} [cfg.roamLeftX] - Left end of the roam strip; set, the idle crawler walks random spots between it and homeX
 * @param {{x1: number, x2: number, z: number}} [cfg.frontSpan] - While any body part is within x1..x2 it draws at z (in front of a big prop there)
 * @returns {Object} Predator inst
 */
export function create(cfg) {
  const inst = {
    k: cfg.k,
    sfx: cfg.sfx,
    x: cfg.x,
    y: cfg.groundAt(cfg.x),
    dir: cfg.dir ?? -1,
    minX: cfg.minX,
    maxX: cfg.maxX,
    landAt: cfg.groundAt,
    groundAt: null,
    water: cfg.water ?? null,
    fleeLeftX: cfg.fleeLeftX ?? cfg.minX,
    homeX: cfg.homeX ?? cfg.x,
    roamLeftX: cfg.roamLeftX ?? null,
    roamGoalX: null,
    frontSpan: cfg.frontSpan ?? null,
    swimming: false,
    fleePath: null,
    hero: cfg.hero,
    zones: cfg.zones,
    canHuntHero: cfg.canHuntHero,
    state: 'search',
    stateTime: 0.4,
    vx: 0,
    ax: 0,
    speedTarget: 0,
    burst: 0.2,
    stretch: 1,
    headLift: 0,
    lookBack: false,
    bodyClear: 7,
    idleTime: 0,
    wobblePhase: Math.random() * 6,
    orientKick: false,
    lungeT: 0,
    batch: PolyBatch.create(),
    colors: {
      contour: rgb(cfg.k, FOREST_PAL.predatorContour),
      shell: rgb(cfg.k, FOREST_PAL.predatorShell),
      shellShade: rgb(cfg.k, FOREST_PAL.predatorShellShade),
      shellLight: rgb(cfg.k, FOREST_PAL.predatorShellLight),
      clump: rgb(cfg.k, FOREST_PAL.predatorMossClump),
      bellyShade: rgb(cfg.k, FOREST_PAL.predatorBellyShade),
      leg: rgb(cfg.k, FOREST_PAL.predatorLeg),
      legFar: rgb(cfg.k, FOREST_PAL.predatorLegFar),
      legLight: rgb(cfg.k, FOREST_PAL.predatorLegLight),
      leaf: rgb(cfg.k, FOREST_PAL.predatorLeaf),
      leafLight: rgb(cfg.k, FOREST_PAL.predatorLeafLight),
      thorn: rgb(cfg.k, FOREST_PAL.predatorThorn),
      fang: rgb(cfg.k, FOREST_PAL.predatorFang),
      brow: rgb(cfg.k, FOREST_PAL.predatorBrow),
      eye: rgb(cfg.k, FOREST_PAL.predatorEye),
      pupil: rgb(cfg.k, FOREST_PAL.predatorPupil)
    },
    footHearable: false
  }
  inst.groundAt = x => predatorSurfaceAt(inst, x)
  initBody(inst)
  inst.spikeAt = SPIKE_AT.map(t => Math.min(
    inst.segments.length - 2,
    Math.max(2, Math.round(t * (inst.segments.length - 1)))
  ))
  initLegs(inst)
  initEyes(inst)
  initHead(inst)
  inst.obj = cfg.k.add([
    cfg.k.z(DRAW_Z),
    {
      draw() {
        drawPredator(inst)
      }
    }
  ])
  return inst
}

/**
 * Steps controller, spine, legs and eyes.
 * @param {Object} inst
 * @param {number} dt
 */
export function update(inst, dt) {
  if (!inst) return
  tickPredatorFruitFeast(inst, inst.levelInst, dt)
  syncFootstepAudibility(inst)
  const feasting = isPredatorFeasting(inst)
  const hero = feasting ? null : heroPoint(inst)
  const lookTarget = feasting ? (getPredatorFeastLookTarget(inst) ?? hero) : hero
  tickMove(inst, dt, hero)
  tickBody(inst, dt)
  const hurry = inst.state === 'lunge' ||
    (feasting && (inst.feastPhase === 'approach' || inst.feastBitePhase === 'forward'))
  tickLegs(inst, dt, hurry)
  tickEyes(inst, dt, lookTarget)
  inst.y = inst.segments[0].y
  syncDrawZ(inst)
}

/**
 * True when the hero's live hitbox overlaps any body segment, including the snout.
 * @param {Object} inst
 * @param {number} heroX - Fallback center X when the live area is unavailable
 * @param {number} heroFootY - Fallback foot Y
 * @returns {boolean}
 */
export function isTouchingHero(inst, heroX, heroFootY) {
  if (!inst || inst.state === 'coast' || inst.state === 'flee' || inst.obj?.hidden) return false
  return overlapsHeroHitbox(inst, heroX, heroFootY)
}

/**
 * Same geometry as isTouchingHero, but ignores coast/hidden — for respawn nudge.
 * @param {Object} inst
 * @param {number} heroX
 * @param {number} heroFootY
 * @returns {boolean}
 */
/**
 * True when a falling twig segment crosses the crawler's back.
 * @param {Object} inst - Predator inst
 * @param {number} x1 - Twig start X
 * @param {number} y1 - Twig start Y
 * @param {number} x2 - Twig end X
 * @param {number} y2 - Twig end Y
 * @returns {{ x: number, y: number, index: number }|null} Mount point on the back
 */
export function predatorBackCatchPoint(inst, x1, y1, x2, y2) {
  if (!inst?.segments?.length || inst.obj?.hidden) return null
  let best = null
  let bestD = 22
  for (let i = 1; i < inst.segments.length - 1; i++) {
    const seg = inst.segments[i]
    const topX = seg.x
    const topY = seg.y - seg.radius * 0.45
    const d = pointSegDistance(topX, topY, x1, y1, x2, y2)
    if (d < bestD) {
      bestD = d
      best = { x: topX, y: topY - 2, index: i }
    }
  }
  return best
}

export function overlapsHeroHitbox(inst, heroX, heroFootY) {
  if (!inst || inst.obj?.hidden) return false
  const box = heroHitbox(inst, heroX, heroFootY)
  if (!box) return false
  const stretch = Math.max(1, inst.stretch ?? 1)
  const chains = [inst.segments, samplePredatorSpineHitPoints(inst)]
  for (let c = 0; c < chains.length; c++) {
    const spine = chains[c]
    if (!spine?.length) continue
    if (spineHitsHero(spine, box, stretch, inst.dir)) return true
  }
  return false
}

/**
 * After a kill the body keeps its velocity for a moment, then searches again.
 * @param {Object} inst
 */
export function notifyKill(inst) {
  if (!inst) return
  inst.state = 'coast'
  inst.stateTime = 0.35 + Math.random() * 0.25
  inst.speedTarget = 0
}

/**
 * Burst at fromX — a crawler within range jerks away from it and flees.
 * @param {Object} inst - Predator inst
 * @param {number} fromX - Burst world X
 */
export function startFlee(inst, fromX) {
  if (!inst || inst.obj?.hidden) return
  const centerX = predatorBodyCenterX(inst)
  if (Math.abs(centerX - fromX) > FLEE_TRIGGER_RADIUS) return
  isPredatorFeasting(inst) && cancelPredatorFeast(inst)
  startFleeMove(inst, centerX >= fromX ? 1 : -1)
}

function initLegs(inst) {
  inst.legs = []
  for (let i = 0; i < LEG_PAIRS; i++) {
    const span = Math.max(1, inst.segments.length - LEG_FIRST_SEG - LEG_TAIL_FREE)
    const at = LEG_FIRST_SEG + (i + 0.5) * span / LEG_PAIRS
    for (const side of [-1, 1]) {
      const hipX = inst.x - inst.dir * (10 + i * 7)
      const footX = hipX + side * 8 + (side === NEAR_SIDE ? inst.dir * NEAR_FOOT_LEAD : 0)
      inst.legs.push({
        at,
        side,
        front: i < 3,
        reach: 0.85 + Math.random() * 0.3,
        haste: Math.random() * 1.4,
        jitter: Math.random() * 4,
        swing: 0,
        swingFromX: footX,
        swingFromY: inst.groundAt(footX),
        footX,
        footY: inst.groundAt(footX),
        plantX: footX,
        stepWait: Math.random() * 0.2 + (side === NEAR_SIDE ? NEAR_STEP_DELAY : 0),
        fidgetAt: 0.4 + Math.random()
      })
    }
  }
}

function heroPoint(inst) {
  if (inst.canHuntHero && !inst.canHuntHero()) return null
  const pos = inst.hero?.character?.pos
  if (!pos) return null
  return { x: pos.x, y: pos.y }
}

function predatorBodyCenterX(inst) {
  const segs = inst.segments
  if (!segs?.length) return inst.x
  return (segs[0].x + segs[segs.length - 1].x) * 0.5
}
//
// The whole body switches layer at once — a half-switched body would split
// across the prop.
//
function syncDrawZ(inst) {
  const span = inst.frontSpan
  if (!span) return
  const inFront = inst.segments.some(seg => seg.x >= span.x1 && seg.x <= span.x2)
  const z = inFront ? span.z : DRAW_Z
  inst.obj.z !== z && (inst.obj.z = z)
}
function syncFootstepAudibility(inst) {
  const sfx = inst.sfx
  if (!sfx?.predatorFootGain) return
  if (isPredatorFeasting(inst)) {
    inst.footHearable = false
    Sound.setForestPredatorFootGain(sfx, 0)
    return
  }
  const hero = heroPoint(inst)
  const hearable = Boolean(hero) &&
    Math.abs(hero.x - predatorBodyCenterX(inst)) <= FOOT_HEAR_RANGE_X
  if (hearable === inst.footHearable) return
  inst.footHearable = hearable
  Sound.setForestPredatorFootGain(sfx, hearable ? 1 : 0)
}

function isPredatorInView(inst) {
  const segs = inst.segments
  if (!segs?.length) return true
  const k = inst.k
  const camX = k.camPos().x
  const scale = k.camScale?.()
  const zoom = (typeof scale === 'object' ? scale.x : scale) || 1
  const half = k.width() / (2 * zoom) + 40
  const minV = camX - half
  const maxV = camX + half
  for (let i = 0; i < segs.length; i++) {
    const x = segs[i].x
    if (x >= minV && x <= maxV) return true
  }
  return false
}

function drawPredator(inst) {
  if (!isPredatorInView(inst)) return
  const k = inst.k
  const batch = inst.batch
  PolyBatch.reset(batch)
  const colors = inst.colors
  //
  // Far-side legs come out from under the shell; near-side ones go over it
  // from its lower edge.
  //
  const legs = inst.legs
  for (let i = 0; i < legs.length; i++) {
    legs[i].side !== NEAR_SIDE && drawLeg(inst, batch, legs[i], colors, colors.legFar, false)
  }
  drawTailClaws(inst, batch, colors)
  drawBodySegments(inst, batch, colors)
  const sprouts = inst.spikeAt
  for (let i = 0; i < sprouts.length; i++) {
    const seg = inst.segments[sprouts[i]]
    const prev = inst.segments[sprouts[i] + 1]
    prev && drawSpike(inst, batch, seg, prev, i % SPROUT_EVERY === 1, colors, i)
  }
  for (let i = 0; i < legs.length; i++) {
    legs[i].side === NEAR_SIDE && drawLeg(inst, batch, legs[i], colors, colors.leg, true)
  }
  drawHead(inst, batch, colors)
  PolyBatch.flush(batch, k, 1)
}
//
// The body: joints bridged in the belly brown, then the plates tail to head.
//
function drawBodySegments(inst, batch, colors) {
  const segs = inst.segments
  for (let i = segs.length - 1; i > 0; i--) {
    const seg = segs[i - 1]
    const prev = segs[i]
    PolyBatch.addLine(batch, prev.x, prev.y, seg.x, seg.y, seg.radius * BRIDGE_W, colors.contour)
    PolyBatch.addLine(batch, prev.x, prev.y + 1, seg.x, seg.y + 1, seg.radius * BRIDGE_W - PLATE_RIM * 2, colors.bellyShade)
  }
  for (let i = segs.length - 1; i > 0; i--) addPlate(inst, batch, segs[i], colors)
}
//
// One plate: the moss dome (shaded lower
// half, lit top, light clumps).
//
function addPlate(inst, batch, seg, colors) {
  const r = seg.radius * PLATE_R
  const dir = inst.dir
  const dy = seg.y - r * DOME_RISE
  PolyBatch.addDisc(batch, seg.x, dy, r, colors.contour)
  PolyBatch.addDisc(batch, seg.x, dy, r - PLATE_RIM, colors.shellShade)
  PolyBatch.addDisc(batch, seg.x, dy - r * DOME_SHADE_DROP * 0.5, r - PLATE_RIM - r * DOME_SHADE_DROP * 0.5, colors.shell)
  PolyBatch.addDisc(batch, seg.x + dir * r * 0.1, dy - r * DOME_LIT_RISE, r * DOME_LIT_R * 0.6, colors.shellLight)
  for (const c of CLUMPS) PolyBatch.addDisc(batch, seg.x + dir * c.dx * r, dy + c.dy * r * 0.8, Math.max(1, c.r * r), colors.clump)
}
//
// A back spike on a plate's top, standing square to the body: its leaves
// beside it (on a sprout plate), then the pale thorn between them.
//
function drawSpike(inst, batch, seg, prev, sprout, colors, index) {
  const dx = seg.x - prev.x
  const dy = seg.y - prev.y
  const len = Math.hypot(dx, dy) || 1
  let nx = -dy / len
  let ny = dx / len
  if (ny > 0) {
    nx = -nx
    ny = -ny
  }
  const tx = dx / len
  const ty = dy / len
  const r = seg.radius * PLATE_R
  const bx = seg.x + nx * r * (1 + DOME_RISE) * 0.85
  const by = seg.y + ny * r * (1 + DOME_RISE) * 0.85
  for (const side of [-1, 1]) {
    if (!sprout) break
    const a = Math.atan2(ny, nx) + side * SPROUT_SPREAD
    addLeaf(batch, bx + tx * side * SPROUT_SIDE_GAP, by + ty * side * SPROUT_SIDE_GAP, Math.cos(a), Math.sin(a), colors)
  }
  const tall = THORN_H * (THORN_H_MIN + THORN_H_RANGE * thornHash(index, THORN_HASH_H))
  const wide = THORN_HALF * (THORN_W_MIN + THORN_W_RANGE * thornHash(index, THORN_HASH_W))
  const lean = (thornHash(index, THORN_HASH_L) * 2 - 1) * THORN_LEAN - inst.anger * THORN_RAGE_BACK
  const lx = nx + tx * lean
  const ly = ny + ty * lean
  addSpikeTri(batch, bx, by, tx, ty, lx, ly, wide + 1, tall + 1.4, colors.contour)
  addSpikeTri(batch, bx, by, tx, ty, lx, ly, wide, tall, colors.thorn)
}
//
// A fixed pseudo-random 0..1 for a thorn's number.
//
function thornHash(index, salt) {
  const x = Math.sin((index + 1) * salt) * THORN_HASH_MUL
  return x - Math.floor(x)
}
//
// One pointed leaf from a base along (ux, uy): a contour, the leaf, a light
// midrib half.
//
function addLeaf(batch, bx, by, ux, uy, colors) {
  const px = -uy
  const py = ux
  const tipX = bx + ux * SPROUT_LEAF_LEN
  const tipY = by + uy * SPROUT_LEAF_LEN
  const midX = bx + ux * SPROUT_LEAF_LEN * 0.45
  const midY = by + uy * SPROUT_LEAF_LEN * 0.45
  const leaf = (half, color) => {
    PolyBatch.addTriangle(batch, bx, by, midX + px * half, midY + py * half, tipX, tipY, color)
    PolyBatch.addTriangle(batch, bx, by, tipX, tipY, midX - px * half, midY - py * half, color)
  }
  leaf(SPROUT_LEAF_HALF + PLATE_RIM, colors.contour)
  leaf(SPROUT_LEAF_HALF, colors.leaf)
  PolyBatch.addTriangle(batch, bx, by, midX + px * SPROUT_LEAF_HALF * 0.8, midY + py * SPROUT_LEAF_HALF * 0.8, tipX, tipY, colors.leafLight)
}

function drawLeg(inst, batch, limb, colors, fill, front) {
  const foot = footNow(inst, limb)
  let bend = limb.side
  let knee = solveLeg(limb.hipX, limb.hipY, foot.x, foot.y, THIGH * limb.reach, SHIN * limb.reach, bend)
  const kneeGround = inst.groundAt(knee.kneeX)
  if (knee.kneeY > kneeGround - 1) {
    bend *= -1
    knee = solveLeg(limb.hipX, limb.hipY, foot.x, foot.y, THIGH * limb.reach, SHIN * limb.reach, bend)
  }
  //
  // A folded shin can still cross the ground line. Keep the joint on it.
  //
  knee.kneeY > kneeGround && (knee.kneeY = kneeGround)
  const from = front ? frontLegFrom(inst, limb, knee, foot) : { x: limb.hipX, y: limb.hipY, thigh: true }
  if (!from) return
  if (from.thigh) {
    PolyBatch.addLine(batch, from.x, from.y, knee.kneeX, knee.kneeY, LEG_THIGH_W + LEG_RIM * 2, colors.contour)
    PolyBatch.addLine(batch, from.x, from.y, knee.kneeX, knee.kneeY, LEG_THIGH_W, fill)
  }
  const kx = from.thigh ? knee.kneeX : from.x
  const ky = from.thigh ? knee.kneeY : from.y
  addClaw(batch, kx, ky, foot.x, foot.y, inst.dir, LEG_KNEE_W + LEG_RIM * 2, LEG_RIM, colors.contour)
  addClaw(batch, kx, ky, foot.x, foot.y, inst.dir, LEG_KNEE_W, 0, fill)
}
//
// A curved claw from (x1, y1) tapering to a point at (x2, y2), bowed
// LEG_BOW px towards the way the body faces; tipPad keeps a contour's
// point a little past the fill's.
//
function addClaw(batch, x1, y1, x2, y2, dir, w, tipPad, color) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len = Math.hypot(dx, dy) || 1
  const px = -dy / len
  const py = dx / len
  const bow = Math.sign(px * dir) * LEG_BOW || LEG_BOW
  const mx = (x1 + x2) / 2 + px * bow
  const my = (y1 + y2) / 2 + py * bow
  const tx = x2 + dx / len * tipPad
  const ty = y2 + dy / len * tipPad
  const h = w / 2
  PolyBatch.addQuad(batch, x1 + px * h, y1 + py * h, mx + px * h * 0.55, my + py * h * 0.55, mx - px * h * 0.55, my - py * h * 0.55, x1 - px * h, y1 - py * h, color)
  PolyBatch.addTriangle(batch, mx + px * h * 0.55, my + py * h * 0.55, tx, ty, mx - px * h * 0.55, my - py * h * 0.55, color)
  PolyBatch.addDisc(batch, x1, y1, h, color)
}
//
// Where a near-side leg shows from over the shell (only below its lower
// edge, NEAR_LEG_FROM): from the edge along the thigh when the knee is
// below it, else along the shin (thigh: false); null when the whole leg
// stays above the edge.
//
function frontLegFrom(inst, limb, knee, foot) {
  const edgeY = limb.bodyY + limb.bodyR * PLATE_R * NEAR_LEG_FROM
  if (knee.kneeY > edgeY) return { ...pointAtY(limb.hipX, limb.hipY, knee.kneeX, knee.kneeY, edgeY), thigh: true }
  if (foot.y <= edgeY) return null
  return { ...pointAtY(knee.kneeX, knee.kneeY, foot.x, foot.y, edgeY), thigh: false }
}
//
// The point of a line at height y (clamped to the line's ends).
//
function pointAtY(x1, y1, x2, y2, y) {
  if (y <= Math.min(y1, y2) || y1 === y2) return { x: y1 < y2 ? x1 : x2, y: Math.min(y1, y2) }
  const t = Math.min(1, (y - y1) / (y2 - y1))
  return { x: x1 + (x2 - x1) * t, y: y1 + (y2 - y1) * t }
}
//
// Two curved claws spreading back from the last plate.
//
function drawTailClaws(inst, batch, colors) {
  const tail = inst.segments[inst.segments.length - 1]
  const prev = inst.segments[inst.segments.length - 2]
  if (!tail || !prev) return
  const back = Math.atan2(tail.y - prev.y, tail.x - prev.x)
  for (const side of [-1, 1]) {
    const a = back + side * TAIL_CLAW_OPEN * 0.4 - Math.PI * 0.08
    const mx = tail.x + Math.cos(a) * TAIL_CLAW_LEN * 0.55
    const my = tail.y + Math.sin(a) * TAIL_CLAW_LEN * 0.55
    const tipA = a + side * TAIL_CLAW_BEND + (side < 0 ? TAIL_CLAW_OPEN : 0)
    const tx = mx + Math.cos(tipA) * TAIL_CLAW_LEN * 0.5
    const ty = my + Math.sin(tipA) * TAIL_CLAW_LEN * 0.5
    const fill = side < 0 ? colors.leg : colors.legFar
    addClaw(batch, tail.x, tail.y, mx, my, inst.dir, TAIL_CLAW_W + LEG_RIM * 2, 0, colors.contour)
    addClaw(batch, mx, my, tx, ty, inst.dir, TAIL_CLAW_W * 0.8 + LEG_RIM * 2, LEG_RIM, colors.contour)
    addClaw(batch, tail.x, tail.y, mx, my, inst.dir, TAIL_CLAW_W, 0, fill)
    addClaw(batch, mx, my, tx, ty, inst.dir, TAIL_CLAW_W * 0.8, 0, fill)
  }
}

function addSpikeTri(batch, bx, by, tx, ty, nx, ny, half, height, color) {
  PolyBatch.addTriangle(
    batch,
    bx - tx * half, by - ty * half,
    bx + nx * height, by + ny * height,
    bx + tx * half, by + ty * half,
    color
  )
}

function heroHitbox(inst, heroX, heroFootY) {
  const live = liveHeroAabb(inst.hero?.character)
  if (live) return live
  if (heroX == null || heroFootY == null) return null
  return {
    left: heroX - HERO_HIT_HALF_W,
    right: heroX + HERO_HIT_HALF_W,
    top: heroFootY - HERO_HIT_H,
    bottom: heroFootY
  }
}

function liveHeroAabb(character) {
  if (!character?.worldArea) return null
  let shape = null
  try {
    shape = character.worldArea()
  } catch {
    return null
  }
  const box = shape?.bbox?.() ?? shape
  if (!box?.width || !box?.height) return null
  const left = box.pos?.x ?? box.x ?? 0
  const top = box.pos?.y ?? box.y ?? 0
  return {
    left,
    top,
    right: left + box.width,
    bottom: top + box.height
  }
}

function spineHitsHero(spine, box, stretch, dir) {
  const tailReach = (SHEAR_REACH + 10) * stretch
  for (let i = 0; i < spine.length; i++) {
    const seg = spine[i]
    const next = spine[i + 1]
    const radius = Math.max(8, seg.radius * 0.95) * (1 + (stretch - 1) * 0.35)
    if (circleHitsRect(seg.x, seg.y, radius, box)) return true
    if (!next) continue
    const linkR = Math.max(radius, next.radius * 0.95)
    if (capsuleHitsRect(seg.x, seg.y, next.x, next.y, linkR, box)) return true
  }
  const head = spine[0]
  const tail = spine[spine.length - 1]
  const prev = spine[spine.length - 2]
  if (head) {
    const snoutX = head.x + dir * (head.radius + SNOUT_REACH)
    const snoutY = head.y + SNOUT_DROP
    if (capsuleHitsRect(head.x, head.y, snoutX, snoutY, Math.max(SNOUT_HALF, 6), box)) return true
  }
  if (tail && prev) {
    const dx = tail.x - prev.x
    const dy = tail.y - prev.y
    const len = Math.hypot(dx, dy) || 1
    const tipX = tail.x + dx / len * tailReach
    const tipY = tail.y + dy / len * tailReach
    if (capsuleHitsRect(tail.x, tail.y, tipX, tipY, 9 * stretch, box)) return true
  }
  return false
}

function pointSegDistance(px, py, x1, y1, x2, y2) {
  const dx = x2 - x1
  const dy = y2 - y1
  const len2 = dx * dx + dy * dy || 1
  const t = Math.max(0, Math.min(1, ((px - x1) * dx + (py - y1) * dy) / len2))
  const qx = x1 + dx * t
  const qy = y1 + dy * t
  return Math.hypot(px - qx, py - qy)
}

function capsuleHitsRect(x1, y1, x2, y2, radius, box) {
  return segmentHitsRect(
    x1, y1, x2, y2,
    box.left - radius, box.top - radius, box.right + radius, box.bottom + radius
  )
}

function segmentHitsRect(x1, y1, x2, y2, left, top, right, bottom) {
  if (x1 >= left && x1 <= right && y1 >= top && y1 <= bottom) return true
  if (x2 >= left && x2 <= right && y2 >= top && y2 <= bottom) return true
  return segmentsCross(x1, y1, x2, y2, left, top, right, top) ||
    segmentsCross(x1, y1, x2, y2, right, top, right, bottom) ||
    segmentsCross(x1, y1, x2, y2, right, bottom, left, bottom) ||
    segmentsCross(x1, y1, x2, y2, left, bottom, left, top)
}

function segmentsCross(ax, ay, bx, by, cx, cy, dx, dy) {
  const abx = bx - ax
  const aby = by - ay
  const cdx = dx - cx
  const cdy = dy - cy
  const denom = abx * cdy - aby * cdx
  if (Math.abs(denom) < 1e-6) return false
  const t = ((cx - ax) * cdy - (cy - ay) * cdx) / denom
  const u = ((cx - ax) * aby - (cy - ay) * abx) / denom
  return t >= 0 && t <= 1 && u >= 0 && u <= 1
}

function circleHitsRect(cx, cy, radius, box) {
  const nx = clamp(cx, box.left, box.right)
  const ny = clamp(cy, box.top, box.bottom)
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy <= radius * radius
}

//
// Ground under x, or the lake surface while the crawler swims across it.
//
function predatorSurfaceAt(inst, x) {
  const water = inst.water
  const land = inst.landAt(x)
  if (!inst.swimming || !water) return land
  //
  // Lake level only over the lake itself — a flee waypoint ends inland while
  // still swimming, and a flat lake level there sank the legs under the
  // ground line. A short eased ramp inside the shore keeps the spine (and the
  // stick on it) from kinking at the water edge.
  //
  const inset = Math.min(x - water.x1, water.x2 - x)
  if (inset <= 0) return land
  const t = Math.min(1, inset / SWIM_SHORE_RAMP_PX)
  const ease = t * t * (3 - 2 * t)
  return land + (water.surfaceY + SWIM_SURFACE_SINK - land) * ease
}
function rgb(k, hex) {
  const c = getRGB(k, hex)
  return k.rgb(c.r, c.g, c.b)
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
