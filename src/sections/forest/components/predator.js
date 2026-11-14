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
  feastMouthOpen,
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
const SPIKE_HALF = 3.2
const SPIKE_OUTLINE_HALF_PAD = 1
const SPIKE_OUTLINE_H_PAD = 1.4
const SPIKE_PRESS = 0.7
//
// Each spike stands on the back's top edge (SPIKE_BASE_UP of its segment's
// radius up), varies up to SPIKE_VARY in height and width and
// SPIKE_SWEEP_VARY in sweep, shrinks with the radius (SPIKE_TAPER_POW) from
// SPIKE_REF_R, the radius it was drawn for.
//
const SPIKE_BASE_UP = 0.72
const SPIKE_SINK = 2.5
const SPIKE_MID = 0.5
const SPIKE_MID_WIDTH = 0.78
const SPIKE_REF_R = 9.2
const SPIKE_TAPER_POW = 1.6
const SPIKE_VARY = 0.22
const SPIKE_SWEEP = 0.55
const SPIKE_SWEEP_VARY = 0.2
const SPIKE_SQUASH = 0.18
//
// Legs: a thigh and a shin LEG_THIGH_W and LEG_SHIN_W wide, each ringed by
// the contour (LEG_THIGH_RIM_W, LEG_SHIN_RIM_W wide), a round knee and foot.
//
const LEG_MAX_REACH = 0.96
const LEG_THIGH_W = 2
const LEG_SHIN_W = 1.7
const LEG_THIGH_RIM_W = 3.6
const LEG_SHIN_RIM_W = 3.1
const LEG_KNEE_R = 2.1
const LEG_FOOT_R = 1.9
//
// A forked lizard tongue flicks out of the mouth every TONGUE_MIN..+RANGE
// seconds (TONGUE_HUNT_MIN..+RANGE while it hunts): out to TONGUE_LEN px in
// the first TONGUE_OUT of its TONGUE_SEC, held, then back in; it shivers by
// TONGUE_WIGGLE px and forks into two TONGUE_FORK px tines.
//
const TONGUE_MIN = 1.5
const TONGUE_RANGE = 3
const TONGUE_HUNT_MIN = 0.7
const TONGUE_HUNT_RANGE = 1.2
const TONGUE_SEC = 0.55
const TONGUE_OUT = 0.3
const TONGUE_HOLD = 0.55
const TONGUE_LEN = 15
const TONGUE_DROP = 1.2
const TONGUE_W = 1.6
const TONGUE_RIM = 1
const TONGUE_WIGGLE = 1.4
const TONGUE_FORK = 3.4
const TONGUE_WIGGLE_HZ = 38
//
// The head turns to what it goes for, as if the jaws were an arrow pointing at
// it: the upper jaw (the head's axis) and the lower one make a sector, and
// the sector's bisector points at the target, so the head tilts up by half
// the opening as the mouth opens. Its target is the apple it eats or, attacking, the hero (HEAD_AIM_STATES),
// within HEAD_PITCH_MAX rad up or down, eased at HEAD_PITCH_EASE per second;
// otherwise it carries the head level. The upper jaw is part of the head and
// never moves on its own: only the lower jaw opens, hinged at (HINGE_X,
// HINGE_Y) off the head's centre, hanging at LOWER_REST rad below the head's
// axis when shut and swinging LOWER_OPEN rad lower at full open.
//
// The mouth is open while it attacks (MOUTH_BY_STATE), open going for an
// apple and between bites, and snaps shut as the lunge reaches the apple
// (feastMouthOpen). It opens at MOUTH_OPEN_EASE and shuts at MOUTH_SHUT_EASE
// per second; no tongue then.
//
const HEAD_PITCH_MAX = 1
const HEAD_PITCH_EASE = 14
const HEAD_AIM_STATES = ['hunt', 'lunge', 'stalk']
const HERO_AIM_DY = -28
const LOWER_REST = 0.04
const LOWER_OPEN = 0.95
const HINGE_X = 3
const HINGE_Y = 3.2
//
// The red mouth between the jaws fills MOUTH_FILL of the sector (from the hinge).
//
const MOUTH_FILL = 0.72
const LOWER_W = 3.4
const LOWER_TIP_W = 0.6
const MOUTH_OPEN_EASE = 12
const MOUTH_SHUT_EASE = 40
//
// Attacking, it runs with its mouth open (how wide, by state); catching the
// hero (coast) it snaps shut.
//
const MOUTH_BY_STATE = { hunt: 0.8, lunge: 1 }
//
// The upper jaw's two fangs (length, thickness, how far back from its tip):
// the far one (first, drawn first) is smaller and nearer the head, the near
// one (over it) bigger and further out along the jaw.
//
const FANGS = [{ len: 3.8, w: 1.2, back: 3.8 }, { len: 6.2, w: 1.7, back: 1 }]
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
//
// A claw is a ribbon of SHEAR_STEPS points, SHEAR_W thick at its root and
// pointed (SHEAR_TIP_W) at its tip, ringed by SHEAR_RIM more; it curls in
// over SHEAR_CURL of a half wave.
//
const SHEAR_STEPS = 7
const SHEAR_W = 4
const SHEAR_TIP_W = 0.2
const SHEAR_RIM = 2
const SHEAR_CURL = 0.65
const TAIL_SNAP_MIN = 2.5
const TAIL_SNAP_RANGE = 4
const TAIL_SNAP_SEC = 0.5
const TAIL_ATTACK_MIN = 0.35
const TAIL_ATTACK_RANGE = 0.5
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
 * @param {number} [cfg.feastZ] - Draw z while it goes for or eats an apple: in front of the fruit
 * @param {number} [cfg.lakeBehindZ] - Draw z while any body part is over the lake (or it swims): behind the water, its bed, its stones and rim
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
    lakeZ: cfg.lakeBehindZ ?? null,
    feastZ: cfg.feastZ ?? null,
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
      horn: rgb(cfg.k, FOREST_PAL.predatorHorn),
      tongue: rgb(cfg.k, FOREST_PAL.predatorTongue),
      mouth: rgb(cfg.k, FOREST_PAL.predatorMouth)
    },
    tailSnapIn: TAIL_SNAP_MIN + Math.random() * TAIL_SNAP_RANGE,
    tailSnapLeft: 0,
    tongueIn: TONGUE_MIN + Math.random() * TONGUE_RANGE,
    tongueT: 0,
    mouth: 0,
    headPitch: 0,
    headPts: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
    lowJaw: [{ x: 0, y: 0 }, { x: 0, y: 0 }],
    shearPts: [0, 1].map(() => Array.from({ length: SHEAR_STEPS }, () => ({ x: 0, y: 0 }))),
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
  tickTongue(inst, dt)
  tickMouth(inst, dt)
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
  if (!inst || inst.state === 'coast' || inst.obj?.hidden) return false
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
  //
  // Over the lake it is always behind the water and everything of the lake,
  // however it is drawn elsewhere.
  //
  const water = inst.water
  if (inst.lakeZ != null && water && (inst.swimming || inst.segments.some(seg => seg.x > water.x1 && seg.x < water.x2))) {
    inst.obj.z !== inst.lakeZ && (inst.obj.z = inst.lakeZ)
    return
  }
  //
  // Going for or eating an apple, it is in front of the fruit.
  //
  if (inst.feastZ != null && inst.state === 'feast') {
    inst.obj.z !== inst.feastZ && (inst.obj.z = inst.feastZ)
    return
  }
  const span = inst.frontSpan
  if (!span) {
    inst.obj.z !== DRAW_Z && (inst.obj.z = DRAW_Z)
    return
  }
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
  const lenScale = limb.reach * inst.stretch
  const foot = reachableFoot(inst, limb, (THIGH + SHIN) * lenScale * LEG_MAX_REACH)
  let bend = limb.side
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
  const open = inst.mouth
  const [p, q] = inst.headPts
  const snoutF = head.radius + SNOUT_REACH
  const snoutD = SNOUT_DROP
  //
  // Everything of the head is placed in its own frame (forward, down) and
  // turned with the head's pitch, so the upper jaw points at its target.
  //
  headPoint(inst, snoutF, snoutD + TONGUE_DROP, p)
  drawTongue(inst, batch, p.x, p.y)
  headPoint(inst, 0, 1, p)
  headPoint(inst, snoutF, snoutD, q)
  PolyBatch.addLine(batch, p.x, p.y, q.x, q.y, 8.2, contour)
  headPoint(inst, 0, 0.4, p)
  headPoint(inst, snoutF - 1, snoutD - 0.4, q)
  PolyBatch.addLine(batch, p.x, p.y, q.x, q.y, 4.4, back)
  drawLowerJaw(inst, batch, snoutF, snoutD + 1.6, open)
  drawUpperTeeth(inst, batch, snoutF, snoutD, open)
  headPoint(inst, snoutF, snoutD, p)
  PolyBatch.addDisc(batch, p.x, p.y, 2.2, contour)
  const eye = inst.eyes[0]
  if (!eye) return
  headPoint(inst, eye.ox, eye.oy, p)
  const ex = p.x
  const ey = p.y
  headPoint(inst, eye.ox - 6, eye.oy - 3.4, p)
  headPoint(inst, eye.ox + 4.4, eye.oy - 0.8, q)
  PolyBatch.addLine(batch, p.x, p.y, q.x, q.y, 2.8, contour)
  PolyBatch.addDisc(batch, ex, ey, 5.6, contour)
  PolyBatch.addDisc(batch, ex, ey, 4.35, eyeColor)
  headPoint(inst, eye.ox + clamp(eye.px, -1.1, 1.1) * 1.15, eye.oy + clamp(eye.py, -1.1, 1.1) * 0.7, p)
  const along = Math.cos(inst.headPitch)
  const across = Math.sin(inst.headPitch)
  PolyBatch.addLine(batch, p.x + dir * across * 2.8, p.y - along * 2.8, p.x - dir * across * 2.8, p.y + along * 2.8, 1.45, pupilColor)
}
//
// A point of the head's own frame (forward, down from its centre) in the
// world, turned with the head's pitch.
//
function headPoint(inst, forward, down, out) {
  const head = inst.segments[0]
  const c = Math.cos(inst.headPitch)
  const s = Math.sin(inst.headPitch)
  out.x = head.x + inst.dir * (forward * c - down * s)
  out.y = head.y + forward * s + down * c
}
//
// The lower jaw, hinged under the head and tapering away from the hinge to a
// point; it hangs along the chin when shut and swings down when open, and the
// dark mouth shows between it and the upper jaw.
//
function drawLowerJaw(inst, batch, tipF, tipD, open) {
  const { contour, belly, mouth } = inst.colors
  const [p, q] = inst.headPts
  const length = Math.hypot(tipF - HINGE_X, tipD - HINGE_Y)
  const angle = Math.atan2(tipD - HINGE_Y, tipF - HINGE_X) + LOWER_REST + open * LOWER_OPEN
  const jaw = inst.lowJaw
  headPoint(inst, HINGE_X, HINGE_Y, jaw[0])
  headPoint(inst, HINGE_X + Math.cos(angle) * length, HINGE_Y + Math.sin(angle) * length, jaw[1])
  if (open > 0.02) {
    headPoint(inst, tipF, tipD - 1, p)
    const hx = jaw[0].x
    const hy = jaw[0].y
    PolyBatch.addTriangle(batch, hx, hy, hx + (p.x - hx) * MOUTH_FILL, hy + (p.y - hy) * MOUTH_FILL, hx + (jaw[1].x - hx) * MOUTH_FILL, hy + (jaw[1].y - hy) * MOUTH_FILL, mouth)
  }
  PolyBatch.addTaperedRibbon(batch, jaw, LOWER_W + 2, LOWER_TIP_W + 2, contour, false)
  open > 0.02 && PolyBatch.addTaperedRibbon(batch, jaw, LOWER_W, LOWER_TIP_W, belly, false)
}
//
// The upper jaw's two fangs hanging from its tip: dark when the mouth is
// shut, cream with a dark ring once it opens.
//
function drawUpperTeeth(inst, batch, snoutF, snoutD, open) {
  const { contour, eye } = inst.colors
  const [p, q] = inst.headPts
  FANGS.forEach(fang => {
    headPoint(inst, snoutF + 1 - fang.back, snoutD + 0.5, p)
    headPoint(inst, snoutF + 1 - fang.back - fang.len * 0.2, snoutD + 0.5 + fang.len, q)
    if (open > 0.02) {
      PolyBatch.addLine(batch, p.x, p.y, q.x, q.y, fang.w + 1.6, contour)
      PolyBatch.addLine(batch, p.x, p.y, q.x, q.y, fang.w, eye)
    } else {
      PolyBatch.addLine(batch, p.x, p.y, q.x, q.y, fang.w, contour)
    }
  })
}
//
// The foot where the leg can really put it: the planted or swinging foot, but
// never further from the hip than maxReach, so a leg is never drawn
// stretched (it steps instead).
//
function reachableFoot(inst, limb, maxReach) {
  const foot = footNow(inst, limb)
  const dx = foot.x - limb.hipX
  const dy = foot.y - limb.hipY
  const dist = Math.hypot(dx, dy)
  if (dist <= maxReach) return foot
  const k = maxReach / dist
  return { x: limb.hipX + dx * k, y: limb.hipY + dy * k }
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
  // Sunk into the top edge of the back (SPIKE_BASE_UP of its segment's
  // radius up), each spike a little different (by its number) and smaller
  // towards the tail; it curves back along the body (tx points to the head),
  // further in a rage.
  //
  const bx = seg.x + nx * seg.radius * SPIKE_BASE_UP
  const by = seg.y + ny * seg.radius * SPIKE_BASE_UP
  const taper = Math.pow(seg.radius / SPIKE_REF_R, SPIKE_TAPER_POW)
  const tall = SPIKE_H * taper * (1 - SPIKE_VARY + 2 * SPIKE_VARY * spikeHash(index, 12.9898)) * (1 - anger * SPIKE_SQUASH)
  const half = SPIKE_HALF * taper * (1 - SPIKE_VARY + 2 * SPIKE_VARY * spikeHash(index, 78.233))
  const sweep = SPIKE_SWEEP + (spikeHash(index, 37.719) * 2 - 1) * SPIKE_SWEEP_VARY + anger * SPIKE_PRESS
  const shape = { bx, by, tx, ty, nx, ny, half, tall, sweep }
  addSpike(batch, shape, SPIKE_OUTLINE_HALF_PAD, SPIKE_OUTLINE_H_PAD, contour, contour)
  addSpike(batch, shape, 0, 0, inst.colors.back, fill)
}
//
// A curved spike: a quad from its foot (the back's own colour, so it grows
// out of the back with no seam) up to SPIKE_MID of its height, then a
// triangle to the tip (fill). The back sweep grows with the square of the
// height, so the spike bends over towards the tail. pad widens and lengthens
// it for its outline.
//
function addSpike(batch, s, padHalf, padH, footColor, tipColor) {
  const h = s.tall + padH
  const spot = (u, side, half) => ({
    x: s.bx + s.nx * h * u - s.tx * s.sweep * h * u * u + s.tx * side * half,
    y: s.by + s.ny * h * u - s.ty * s.sweep * h * u * u + s.ty * side * half
  })
  const half = s.half + padHalf
  const midHalf = half * SPIKE_MID_WIDTH
  const sink = SPIKE_SINK
  const a = { x: s.bx - s.nx * sink - s.tx * half, y: s.by - s.ny * sink - s.ty * half }
  const b = { x: s.bx - s.nx * sink + s.tx * half, y: s.by - s.ny * sink + s.ty * half }
  const ml = spot(SPIKE_MID, -1, midHalf)
  const mr = spot(SPIKE_MID, 1, midHalf)
  const tip = spot(1, 0, 0)
  PolyBatch.addQuad(batch, a.x, a.y, b.x, b.y, mr.x, mr.y, ml.x, ml.y, footColor)
  PolyBatch.addTriangle(batch, ml.x, ml.y, tip.x, tip.y, mr.x, mr.y, tipColor)
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
  for (let n = 0; n < 2; n++) {
    const side = n ? 1 : -1
    const pts = inst.shearPts[n]
    //
    // A claw: spreads out and then hooks in towards the other one, so the
    // pointed tips close on each other.
    //
    for (let m = 0; m < pts.length; m++) {
      const u = m / (pts.length - 1)
      const along = SHEAR_REACH * u
      const spread = open * (Math.sin(u * Math.PI * SHEAR_CURL) * 1.1)
      pts[m].x = ox + tx * along + nx * side * spread
      pts[m].y = oy + ty * along + ny * side * spread
    }
    PolyBatch.addTaperedRibbon(batch, pts, SHEAR_W + SHEAR_RIM, SHEAR_TIP_W + SHEAR_RIM, contour, false)
    PolyBatch.addTaperedRibbon(batch, pts, SHEAR_W, SHEAR_TIP_W, horn, false)
  }
}

//
// Counts down to the tongue's next flick and runs it.
//
function tickTongue(inst, dt) {
  if (inst.state === 'feast') {
    inst.tongueT = 0
    return
  }
  if (inst.tongueT > 0) {
    inst.tongueT += dt
    inst.tongueT >= TONGUE_SEC && (inst.tongueT = 0)
    return
  }
  inst.tongueIn -= dt
  if (inst.tongueIn > 0) return
  const hunting = inst.state === 'hunt' || inst.state === 'lunge' || inst.state === 'stalk'
  inst.tongueIn = hunting ? TONGUE_HUNT_MIN + Math.random() * TONGUE_HUNT_RANGE : TONGUE_MIN + Math.random() * TONGUE_RANGE
  inst.tongueT = 0.001
}
//
// The mouth: open while it attacks (MOUTH_BY_STATE), open going for an apple
// and shut as the bite reaches it (feastMouthOpen), shut otherwise.
//
function tickMouth(inst, dt) {
  const target = inst.state === 'feast' ? feastMouthOpen(inst) : (MOUTH_BY_STATE[inst.state] ?? 0)
  const rate = target < inst.mouth ? MOUTH_SHUT_EASE : MOUTH_OPEN_EASE
  inst.mouth += (target - inst.mouth) * Math.min(1, dt * rate)
  inst.headPitch += (headPitchTarget(inst) - inst.headPitch) * Math.min(1, dt * HEAD_PITCH_EASE)
}
//
// The angle (rad, down positive) of the line from the head to what it goes
// for, 0 when it goes for nothing.
//
function headPitchTarget(inst) {
  const head = inst.segments[0]
  let target = null
  if (inst.state === 'feast') {
    target = inst.feastFruit
  } else if (HEAD_AIM_STATES.includes(inst.state)) {
    const pos = inst.hero?.character?.pos
    pos && (target = { x: pos.x, y: pos.y + HERO_AIM_DY })
  }
  if (!target) return 0
  const aim = Math.atan2(target.y - head.y, (target.x - head.x) * inst.dir)
  const gap = LOWER_REST + inst.mouth * LOWER_OPEN
  return clamp(aim - gap / 2, -HEAD_PITCH_MAX, HEAD_PITCH_MAX)
}
//
// The tongue out of the mouth at (mx, my), shivering, forked at its tip.
//
function drawTongue(inst, batch, mx, my) {
  if (inst.tongueT <= 0) return
  const u = inst.tongueT / TONGUE_SEC
  const out = u < TONGUE_OUT ? u / TONGUE_OUT : u < TONGUE_HOLD ? 1 : (1 - u) / (1 - TONGUE_HOLD)
  const len = TONGUE_LEN * out
  const dir = inst.dir
  const wig = Math.sin(inst.tongueT * TONGUE_WIGGLE_HZ) * TONGUE_WIGGLE * out
  const tx = mx + dir * len
  const ty = my + wig
  const { contour, tongue } = inst.colors
  const fork = TONGUE_FORK * out
  for (const [pad, color] of [[TONGUE_RIM, contour], [0, tongue]]) {
    PolyBatch.addLine(batch, mx, my, tx, ty, TONGUE_W + pad * 2, color)
    PolyBatch.addLine(batch, tx, ty, tx + dir * fork, ty - fork * 0.7, TONGUE_W * 0.8 + pad * 2, color)
    PolyBatch.addLine(batch, tx, ty, tx + dir * fork, ty + fork * 0.7, TONGUE_W * 0.8 + pad * 2, color)
  }
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
//
// A fixed pseudo-random 0..1 for a spike's number.
//
function spikeHash(index, salt) {
  const x = Math.sin((index + 1) * salt) * 43758.5453
  return x - Math.floor(x)
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
