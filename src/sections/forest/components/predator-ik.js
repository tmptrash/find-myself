//
// Two-bone leg solver and stepping. Each leg owns a hip anchor, a planted
// foot and a swing timer. Nothing here is a canned walk cycle: a step starts
// only when the hip has left the foot behind, or when the body asks for a
// corrective plant.
//
import * as Sound from '../../../utils/sound.js'

const STEP_LIFT = 4
const FOOT_SOUND_GAP = 0.055
const REACH = 11
//
// A step gets quicker with the body's speed (SWING_SPEED_GAIN per px/s), so a
// running leg is back on the ground in time; above RUN_NO_WAIT_SPEED legs
// step the moment they are behind, without the idle stagger.
//
const SWING_SPEED_GAIN = 0.05
const RUN_NO_WAIT_SPEED = 60
const PLANT_BEHIND = 5
//
// A hip sits on its segment's flank, shares of the segment's radius from its
// centre (side: forward, down: below the centre). The near row starts on the
// body's visible side and is drawn over it; the far row starts lower and
// further back, behind the body.
//
const NEAR_HIP = { side: 0.1, down: 0.12 }
const FAR_HIP = { side: -0.35, down: 0.5 }
//
// Like the hero's feet, a foot finds its surface with a ray cast down from
// FOOT_RAY_UP above the plain ground to FOOT_RAY_DEPTH under it (the level's
// ground line: stones and mushrooms lift it); swimming, the water level.
//
const FOOT_RAY_UP = 26
const FOOT_RAY_DEPTH = 44
//
// A leg never starts a step while the other one of its pair or a neighbour
// on its own side is mid-step (unless it is already dragging a foot further
// than DRAG_PX behind), so the legs go one after another.
//
const DRAG_PX = 5

/**
 * Solves a 2-segment leg. bendSign picks which side the knee folds to.
 * @param {number} hipX
 * @param {number} hipY
 * @param {number} footX
 * @param {number} footY
 * @param {number} len1
 * @param {number} len2
 * @param {number} bendSign
 * @returns {{ kneeX: number, kneeY: number }}
 */
export function solveLeg(hipX, hipY, footX, footY, len1, len2, bendSign) {
  let dx = footX - hipX
  let dy = footY - hipY
  let dist = Math.hypot(dx, dy) || 0.001
  const max = len1 + len2 - 0.4
  const min = Math.abs(len1 - len2) + 0.4
  if (dist > max) {
    dx *= max / dist
    dy *= max / dist
    dist = max
  } else if (dist < min) {
    dx *= min / dist
    dy *= min / dist
    dist = min
  }
  const ang = Math.atan2(dy, dx)
  const cos = clamp((len1 * len1 + dist * dist - len2 * len2) / (2 * len1 * dist), -1, 1)
  const kneeAng = ang + bendSign * Math.acos(cos)
  return {
    kneeX: hipX + Math.cos(kneeAng) * len1,
    kneeY: hipY + Math.sin(kneeAng) * len1
  }
}

/**
 * Advances every leg: plants, swings, and the odd idle fidget.
 * @param {Object} inst - Predator inst
 * @param {number} dt
 * @param {boolean} hurry - Charge / orient retarget
 */
export function tickLegs(inst, dt, hurry) {
  const dir = inst.dir
  const speed = Math.abs(inst.vx)
  inst.legs.forEach((leg, index) => {
    const hip = hipOf(inst, leg)
    leg.hipX = hip.x
    leg.hipY = hip.y
    if (leg.swing > 0) {
      const rate = swingRate(leg, hurry, speed)
      leg.swing += dt * rate
      leg.plantX = landingX(inst, leg, hip.x, (1 - leg.swing) / rate)
      if (leg.swing >= 1) {
        leg.swing = 0
        leg.footX = leg.plantX
        leg.footY = footGround(inst, leg.plantX)
        onFootPlant(inst)
      }
      return
    }
    const along = dir * (hip.x - leg.footX)
    const reach = REACH * leg.reach * inst.stretch
    const behind = along > PLANT_BEHIND * leg.reach * inst.stretch || Math.hypot(hip.x - leg.footX, hip.y - leg.footY) > reach + 2
    const fidget = speed < 3 && inst.idleTime > leg.fidgetAt
    const retarget = hurry && leg.front && inst.orientKick
    if (behind || fidget || retarget) {
      const dragging = along > PLANT_BEHIND * leg.reach * inst.stretch + DRAG_PX
      if (!dragging && neighbourStepping(inst, index)) return
      if (leg.stepWait > 0 && !retarget && speed < RUN_NO_WAIT_SPEED) {
        leg.stepWait -= dt
        return
      }
      leg.lead = ((hurry ? 9 : 5) + leg.jitter * 0.5) * inst.stretch + leg.side * 0.8 + (Math.random() - 0.5) * 2
      leg.plantX = landingX(inst, leg, hip.x, 1 / swingRate(leg, hurry, speed))
      leg.swingFromX = leg.footX
      leg.swingFromY = leg.footY
      leg.swing = 0.01
      leg.stepWait = 0.04 + (index % 3) * 0.03 + Math.random() * 0.05
      fidget && (leg.fidgetAt = inst.idleTime + 0.35 + Math.random() * 0.8)
    } else {
      leg.footY = footGround(inst, leg.footX)
    }
  })
  inst.orientKick = false
}

// How fast a swing advances (1 = a whole step per second)
function swingRate(leg, hurry, speed) {
  return (hurry ? 11 : 7 + leg.haste * 0.6) + speed * SWING_SPEED_GAIN
}

// Where the foot should land: ahead of the hip by the leg's lead, plus the way the body travels before the foot arrives
function landingX(inst, leg, hipX, secondsLeft) {
  return hipX + inst.dir * leg.lead + inst.vx * secondsLeft
}

/**
 * World position of a leg hip on the flank of its segment. The offsets come from
 * the segment's own centre, so a hip keeps its place on it however the
 * body stretches or heaves.
 * @param {Object} inst
 * @param {Object} leg
 * @returns {{ x: number, y: number }}
 */
function hipOf(inst, leg) {
  const seg = inst.segments[leg.seg]
  const hip = leg.side > 0 ? NEAR_HIP : FAR_HIP
  return {
    x: seg.x + inst.dir * seg.radius * hip.side,
    y: seg.y + seg.radius * hip.down
  }
}

/**
 * Foot position this frame, lifted in an arc while swinging and never below
 * the surface under that x.
 * @param {Object} inst
 * @param {Object} leg
 * @returns {{ x: number, y: number }}
 */
export function footNow(inst, leg) {
  if (leg.swing <= 0) {
    const y = footGround(inst, leg.footX)
    return { x: leg.footX, y }
  }
  const t = Math.min(1, leg.swing)
  const x = leg.swingFromX + (leg.plantX - leg.swingFromX) * t * t * (3 - 2 * t)
  const ground = footGround(inst, x)
  const start = Math.min(leg.swingFromY, footGround(inst, leg.swingFromX))
  const end = ground
  const y = start + (end - start) * t - Math.sin(t * Math.PI) * STEP_LIFT * leg.reach
  return { x, y: Math.min(y, ground) }
}

/**
 * The surface under a foot at x: the level's ground-line ray (like the
 * hero's feet), else the plain ground.
 * @param {Object} inst - Predator inst
 * @param {number} x - World X
 * @returns {number} Surface Y
 */
export function footGround(inst, x) {
  const base = inst.groundAt(x)
  if (!inst.surfaceRay || inst.swimming) return base
  return inst.surfaceRay(x, base - FOOT_RAY_UP, FOOT_RAY_DEPTH + FOOT_RAY_UP) ?? base
}

// True while a neighbour (same side, next segment) or the opposite leg is mid-step
function neighbourStepping(inst, index) {
  const legs = inst.legs
  return (legs[index - 2]?.swing ?? 0) > 0 || (legs[index + 2]?.swing ?? 0) > 0 || (legs[index ^ 1]?.swing ?? 0) > 0
}

function onFootPlant(inst) {
  const sfx = inst.sfx
  if (!sfx || sfx._forestSfxMuted || !inst.k || !inst.footHearable) return
  const now = inst.k.time()
  if (now < (inst.footSoundUntil ?? 0)) return
  inst.footSoundUntil = now + FOOT_SOUND_GAP
  Sound.playForestPredatorFootstep(sfx)
}

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v))
}
