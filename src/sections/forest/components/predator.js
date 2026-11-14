import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { FOREST_PAL } from '../utils/forest-palette.js'
import * as PolyBatch from '../../../utils/poly-batch.js'
import { initBody, samplePredatorSpineHitPoints, tickBody } from './predator-body.js'
import { tickLegs, solveLeg, footNow, footGround } from './predator-ik.js'
import { initEyes, tickEyes } from './predator-eyes.js'
import { tickMove, startFleeMove } from './predator-move.js'
import {
  cancelPredatorFeast,
  isPredatorFeasting,
  tickPredatorFruitFeast
} from './predator-fruit-feast.js'
import * as Sound from '../../../utils/sound.js'

//
// Low predatory crawler. Pose is computed every frame from the spine, the
// leg targets and the eye targets — there is no baked walk cycle.
//
const LEG_PAIRS = 16
//
// One leg pair on every segment from LEG_FIRST_SEG.
//
const LEG_FIRST_SEG = 1
//
// Near-side legs start half a stride ahead so the two rows alternate.
//
const NEAR_SIDE = 1
const NEAR_FOOT_LEAD = 5
const NEAR_STEP_DELAY = 0.08
const THIGH = 9
const SHIN = 10
const DRAW_Z = CFG.visual.zIndex.player - 1
//
// Back spikes: a triangle on each SPIKE_AT segment (shares of the body); in
// a rage (inst.anger) they lie back along the body by up to SPIKE_PRESS of
// their height and shrink by SPIKE_SQUASH.
//
const SPIKE_AT = [0.12, 0.2, 0.28, 0.36, 0.44, 0.52, 0.6, 0.68, 0.76, 0.84, 0.92]
const SPIKE_H = 10
const SPIKE_HALF = 2.75
const SPIKE_OUTLINE_HALF_PAD = 1
const SPIKE_OUTLINE_H_PAD = 1.4
const SPIKE_PRESS = 0.7
//
// Each spike stands on the back's top edge (SPIKE_BASE_UP of its segment's
// radius up), varies up to SPIKE_VARY in height and width and
// SPIKE_SWEEP_VARY in sweep, shrinks with the radius (SPIKE_TAPER_POW) from
// SPIKE_REF_R, the radius it was drawn for.
//
const SPIKE_BASE_UP = 0.8
const SPIKE_REF_R = 9.2
const SPIKE_TAPER_POW = 1.6
const SPIKE_VARY = 0.22
const SPIKE_SWEEP = 0.35
const SPIKE_SWEEP_VARY = 0.2
const SPIKE_SQUASH = 0.18
//
// Legs: a thigh and a shin LEG_THIGH_W and LEG_SHIN_W wide, each ringed by
// the contour (LEG_THIGH_RIM_W, LEG_SHIN_RIM_W wide), a round knee and foot.
//
const LEG_THIGH_W = 2
const LEG_SHIN_W = 1.7
const LEG_THIGH_RIM_W = 3.6
const LEG_SHIN_RIM_W = 3.1
const LEG_KNEE_R = 2.1
const LEG_FOOT_R = 1.9
//
// The body's seams: a round joint on every segment as wide as the lines
// that join them (shares of its radius).
//
const JOINT_CONTOUR = 0.85
const JOINT_BELLY = 0.575
const JOINT_BACK = 0.425
//
// Tail shears (two horn lines) reach SHEAR_REACH past the tail, opening
// SHEAR_OPEN; every TAIL_SNAP_MIN..+RANGE seconds they snap shut twice within
// TAIL_SNAP_SEC, and much oftener (TAIL_ATTACK_MIN..+RANGE) while it attacks.
//
const SHEAR_OPEN = 8
const TAIL_SNAP_MIN = 2.5
const TAIL_SNAP_RANGE = 4
const TAIL_SNAP_SEC = 0.5
const TAIL_ATTACK_MIN = 0.35
const TAIL_ATTACK_RANGE = 0.5
//
// In a rage the eye's upper lid comes down by up to EYE_SQUINT of the eye.
//
const EYE_R = 4.35
const EYE_SQUINT = 0.42
const LID_STEPS = 8
const LID_INDICES = Array.from({ length: LID_STEPS - 1 }, (_, i) => [0, i + 1, i + 2]).flat()
//
// Hit reach past the tail (its shears).
//
const SHEAR_REACH = 18
const HERO_HIT_HALF_W = 15
const HERO_HIT_H = 69
const SNOUT_REACH = 7
const SNOUT_DROP = 2.4
const SNOUT_HALF = 4.1
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
    bodyClear: 7,
    idleTime: 0,
    wobblePhase: Math.random() * 6,
    orientKick: false,
    lungeT: 0,
    batch: PolyBatch.create(),
    colors: {
      contour: rgb(cfg.k, FOREST_PAL.predatorContour),
      back: rgb(cfg.k, FOREST_PAL.predatorBack),
      spike: rgb(cfg.k, FOREST_PAL.predatorSpike),
      belly: rgb(cfg.k, FOREST_PAL.predatorBelly),
      moss: rgb(cfg.k, FOREST_PAL.predatorMoss),
      leg: rgb(cfg.k, FOREST_PAL.predatorLeg),
      eye: rgb(cfg.k, FOREST_PAL.predatorEye),
      pupil: rgb(cfg.k, FOREST_PAL.predatorPupil),
      horn: rgb(cfg.k, FOREST_PAL.predatorHorn)
    },
    tailSnapIn: TAIL_SNAP_MIN + Math.random() * TAIL_SNAP_RANGE,
    tailSnapLeft: 0,
    lid: Array.from({ length: LID_STEPS + 1 }, () => ({ x: 0, y: 0 })),
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
  tickMove(inst, dt, hero)
  tickBody(inst, dt)
  const hurry = inst.state === 'lunge' ||
    (feasting && (inst.feastPhase === 'approach' || inst.feastBitePhase === 'forward'))
  tickLegs(inst, dt, hurry)
  tickEyes(inst, dt, hero)
  tickTail(inst, dt)
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
    const seg = LEG_FIRST_SEG + i
    for (const side of [-1, 1]) {
      const hipX = inst.segments[seg].x
      const footX = hipX + side * 4 + (side === NEAR_SIDE ? inst.dir * NEAR_FOOT_LEAD : 0)
      inst.legs.push({
        seg,
        side,
        front: i < 3,
        reach: 0.85 + Math.random() * 0.3,
        haste: Math.random() * 1.4,
        jitter: Math.random() * 4,
        lead: 0,
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
  const { contour, back, belly, moss, leg, eye, pupil, horn, spike } = inst.colors
  //
  // Far-side legs sit behind the body, near-side legs are drawn over it.
  //
  const legs = inst.legs
  for (let i = 0; i < legs.length; i++) {
    legs[i].side !== NEAR_SIDE && drawLeg(inst, batch, legs[i], contour, leg)
  }
  drawBodySegments(inst, batch, contour, belly, back, moss)
  for (let i = 0; i < legs.length; i++) {
    legs[i].side === NEAR_SIDE && drawLeg(inst, batch, legs[i], contour, leg)
  }
  const spikes = inst.spikeAt
  for (let i = 0; i < spikes.length; i++) {
    const index = spikes[i]
    const seg = inst.segments[index]
    const prev = inst.segments[index + 1]
    prev && drawBackSpike(inst, batch, seg, prev, contour, spike, index)
  }
  drawTailShears(inst, batch, contour, horn)
  drawHead(inst, batch, contour, back, eye, pupil)
  PolyBatch.flush(batch, k, 1)
}

function drawBodySegments(inst, batch, contour, belly, back, moss) {
  for (let i = inst.segments.length - 1; i >= 0; i--) {
    const seg = inst.segments[i]
    const prev = inst.segments[i + 1]
    if (prev) {
      PolyBatch.addLine(batch, prev.x, prev.y + 1, seg.x, seg.y + 1, seg.radius * 1.7, contour)
      PolyBatch.addLine(batch, prev.x, prev.y + 2, seg.x, seg.y + 2, seg.radius * 1.15, belly)
      PolyBatch.addLine(batch, prev.x, prev.y - 1, seg.x, seg.y - 1, seg.radius * 0.85, back)
    }
    //
    // Round joints as wide as the lines they join, so a bent or stretched
    // body never opens a wedge-shaped hole at a seam.
    //
    PolyBatch.addDisc(batch, seg.x, seg.y + 1, seg.radius * JOINT_CONTOUR, contour)
    PolyBatch.addDisc(batch, seg.x, seg.y + 2, seg.radius * JOINT_BELLY, belly)
    PolyBatch.addDisc(batch, seg.x, seg.y - 1, seg.radius * JOINT_BACK, back)
    seg.moss && PolyBatch.addDisc(batch, seg.x + inst.dir * 2, seg.y - seg.radius * 0.35, 2.2, moss)
  }
}

function drawLeg(inst, batch, limb, contour, leg) {
  const foot = footNow(inst, limb)
  let bend = limb.side
  const lenScale = limb.reach * inst.stretch
  let knee = solveLeg(limb.hipX, limb.hipY, foot.x, foot.y, THIGH * lenScale, SHIN * lenScale, bend)
  const kneeGround = footGround(inst, knee.kneeX)
  if (knee.kneeY > kneeGround - 1) {
    bend *= -1
    knee = solveLeg(limb.hipX, limb.hipY, foot.x, foot.y, THIGH * lenScale, SHIN * lenScale, bend)
  }
  //
  // A folded shin can still cross the ground line. Keep the joint on it.
  //
  knee.kneeY > kneeGround && (knee.kneeY = kneeGround)
  PolyBatch.addLine(batch, limb.hipX, limb.hipY, knee.kneeX, knee.kneeY, LEG_THIGH_RIM_W, contour)
  PolyBatch.addLine(batch, knee.kneeX, knee.kneeY, foot.x, foot.y, LEG_SHIN_RIM_W, contour)
  PolyBatch.addLine(batch, limb.hipX, limb.hipY, knee.kneeX, knee.kneeY, LEG_THIGH_W, leg)
  PolyBatch.addLine(batch, knee.kneeX, knee.kneeY, foot.x, foot.y, LEG_SHIN_W, leg)
  PolyBatch.addDisc(batch, knee.kneeX, knee.kneeY, LEG_KNEE_R, contour)
  PolyBatch.addDisc(batch, foot.x, foot.y, LEG_FOOT_R, contour)
}

function drawHead(inst, batch, contour, back, eyeColor, pupilColor) {
  const head = inst.segments[0]
  const dir = inst.dir
  const snoutX = head.x + dir * (head.radius + SNOUT_REACH)
  const snoutY = head.y + SNOUT_DROP
  PolyBatch.addLine(batch, head.x, head.y + 1, snoutX, snoutY, 8.2, contour)
  PolyBatch.addLine(batch, head.x, head.y + 0.4, snoutX - dir * 1, snoutY - 0.4, 4.4, back)
  PolyBatch.addLine(batch, head.x + dir * 3, head.y + 3.2, snoutX, snoutY + 1.6, 3.4, contour)
  PolyBatch.addLine(batch, snoutX - dir * 1.2, snoutY + 0.6, snoutX - dir * 2.4, snoutY + 6.2, 1.6, contour)
  PolyBatch.addLine(batch, snoutX + dir * 2.2, snoutY + 0.4, snoutX + dir * 0.6, snoutY + 5.4, 1.45, contour)
  PolyBatch.addDisc(batch, snoutX, snoutY, 2.2, contour)
  const eye = inst.eyes[0]
  if (!eye) return
  const ex = head.x + dir * eye.ox
  const ey = head.y + eye.oy
  PolyBatch.addLine(batch, ex - dir * 6, ey - 3.4, ex + dir * 4.4, ey - 0.8, 2.8, contour)
  PolyBatch.addDisc(batch, ex, ey, 5.6, contour)
  PolyBatch.addDisc(batch, ex, ey, 4.35, eyeColor)
  const px = ex + dir * clamp(eye.px, -1.1, 1.1) * 1.15
  const py = ey + clamp(eye.py, -1.1, 1.1) * 0.7
  PolyBatch.addLine(batch, px, py - 2.8, px, py + 2.8, 1.45, pupilColor)
  drawEyeLid(inst, batch, ex, ey, contour, back)
}
//
// The upper lid coming down over the eye in a rage: a cap of the eye in the
// head's colour with a dark edge.
//
function drawEyeLid(inst, batch, ex, ey, contour, back) {
  const squint = inst.anger * EYE_SQUINT
  if (squint < 0.02) return
  const lid = inst.lid
  const reach = Math.acos(1 - squint * 2)
  for (let n = 0; n <= LID_STEPS; n++) {
    const a = -Math.PI / 2 - reach + reach * 2 * n / LID_STEPS
    lid[n].x = ex + Math.cos(a) * (EYE_R + 1)
    lid[n].y = ey + Math.sin(a) * (EYE_R + 1)
  }
  PolyBatch.addPolygon(batch, lid, LID_INDICES, back)
  PolyBatch.addLine(batch, lid[0].x, lid[0].y, lid[LID_STEPS].x, lid[LID_STEPS].y, 1.1, contour)
}

function drawBackSpike(inst, batch, seg, prev, contour, fill, index) {
  const anger = inst.anger
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
  //
  // On the very top edge of the back, each spike a little different (by its
  // number) and smaller towards the tail; its tip sweeps back along the body
  // (tx points to the head), and further in a rage.
  //
  const bx = seg.x + nx * seg.radius * SPIKE_BASE_UP
  const by = seg.y + ny * seg.radius * SPIKE_BASE_UP
  const taper = Math.pow(seg.radius / SPIKE_REF_R, SPIKE_TAPER_POW)
  const tall = SPIKE_H * taper * (1 - SPIKE_VARY + 2 * SPIKE_VARY * spikeHash(index, 12.9898))
  const half = SPIKE_HALF * taper * (1 - SPIKE_VARY + 2 * SPIKE_VARY * spikeHash(index, 78.233))
  const sweep = SPIKE_SWEEP + (spikeHash(index, 37.719) * 2 - 1) * SPIKE_SWEEP_VARY + anger * SPIKE_PRESS
  const lx = nx - tx * sweep
  const ly = ny - ty * sweep
  const ll = Math.hypot(lx, ly) || 1
  const squash = 1 - anger * SPIKE_SQUASH
  addSpikeTri(batch, bx, by, tx, ty, lx / ll, ly / ll, half + SPIKE_OUTLINE_HALF_PAD, (tall + SPIKE_OUTLINE_H_PAD) * squash, contour)
  addSpikeTri(batch, bx, by, tx, ty, lx / ll, ly / ll, half, tall * squash, fill)
}

function drawTailShears(inst, batch, contour, horn) {
  const tail = inst.segments[inst.segments.length - 1]
  const prev = inst.segments[inst.segments.length - 2]
  if (!tail || !prev) return
  const dx = tail.x - prev.x
  const dy = tail.y - prev.y
  const len = Math.hypot(dx, dy) || 1
  const tx = dx / len
  const ty = dy / len
  const nx = -ty
  const ny = tx
  const ox = tail.x + tx * tail.radius * 0.35
  const oy = tail.y + ty * tail.radius * 0.2
  const shut = inst.tailSnapLeft > 0 ? Math.pow(Math.sin(Math.PI * 2 * (1 - inst.tailSnapLeft / TAIL_SNAP_SEC)), 2) : 0
  const open = SHEAR_OPEN * (1 - shut)
  for (const side of [-1, 1]) {
    const ex = ox + tx * SHEAR_REACH + nx * side * open
    const ey = oy + ty * SHEAR_REACH + ny * side * open
    PolyBatch.addLine(batch, ox, oy, ex, ey, 3.6, contour)
    PolyBatch.addLine(batch, ox, oy, ex, ey, 1.7, horn)
  }
}

//
// A fixed pseudo-random 0..1 for a spike's number.
//
function spikeHash(index, salt) {
  const x = Math.sin((index + 1) * salt) * 43758.5453
  return x - Math.floor(x)
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

//
// Counts down to the tail shears' next snap and runs it.
//
function tickTail(inst, dt) {
  if (inst.tailSnapLeft > 0) {
    inst.tailSnapLeft = Math.max(0, inst.tailSnapLeft - dt)
    return
  }
  inst.tailSnapIn -= dt
  if (inst.tailSnapIn > 0) return
  const attacking = inst.state === 'hunt' || inst.state === 'lunge'
  inst.tailSnapIn = attacking ? TAIL_ATTACK_MIN + Math.random() * TAIL_ATTACK_RANGE : TAIL_SNAP_MIN + Math.random() * TAIL_SNAP_RANGE
  inst.tailSnapLeft = TAIL_SNAP_SEC
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
