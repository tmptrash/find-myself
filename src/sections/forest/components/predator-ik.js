//
// Two-bone leg solver and stepping. Each leg owns a hip anchor, a planted
// foot and a swing timer. Nothing here is a canned walk cycle: a step starts
// only when the hip has left the foot behind, or when the body asks for a
// corrective plant.
//
import * as Sound from '../../../utils/sound.js'

const STEP_LIFT = 7
const FOOT_SOUND_GAP = 0.055
const REACH = 16
const PLANT_BEHIND = 11
//
// A hip sits on its plate's lower side: this share of the plate's radius
// forward (near row) or back (far row), and this share below its centre.
//
const HIP_SIDE_SHARE = 0.6
const HIP_DOWN_SHARE = 0.55

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
    leg.bodyY = hip.bodyY
    leg.bodyR = hip.bodyR
    if (leg.swing > 0) {
      leg.swing += dt * (hurry ? 9 : 4.2 + leg.haste)
      if (leg.swing >= 1) {
        leg.swing = 0
        leg.footX = leg.plantX
        leg.footY = inst.groundAt(leg.plantX)
        onFootPlant(inst)
      }
      return
    }
    const along = dir * (hip.x - leg.footX)
    const reach = REACH * leg.reach * inst.stretch
    const behind = along > PLANT_BEHIND * leg.reach * inst.stretch || Math.hypot(hip.x - leg.footX, hip.y - leg.footY) > reach + 6
    const fidget = speed < 3 && inst.idleTime > leg.fidgetAt
    const retarget = hurry && leg.front && inst.orientKick
    if (behind || fidget || retarget) {
      if (leg.stepWait > 0 && !retarget) {
        leg.stepWait -= dt
        return
      }
      const lead = ((hurry ? 14 : 8) + leg.jitter) * inst.stretch
      const side = leg.side * (7 + leg.jitter * 0.3)
      leg.plantX = hip.x + dir * lead + (Math.random() - 0.5) * 3
      leg.plantX += side * 0.15
      leg.swingFromX = leg.footX
      leg.swingFromY = leg.footY
      leg.swing = 0.01
      leg.stepWait = 0.04 + (index % 3) * 0.03 + Math.random() * 0.05
      fidget && (leg.fidgetAt = inst.idleTime + 0.35 + Math.random() * 0.8)
    } else {
      leg.footY = inst.groundAt(leg.footX)
    }
  })
  inst.orientKick = false
}

/**
 * World position of a leg hip: on the lower side of its plate's dome, the
 * near row toward the front and the far row toward the back. The offsets are
 * shares of the plate's radius from the plate's own centre, so a hip keeps its
 * place on its plate however the body stretches or heaves.
 * @param {Object} inst
 * @param {Object} leg
 * @returns {{ x: number, y: number, bodyY: number, bodyR: number }}
 */
function hipOf(inst, leg) {
  const seg = inst.segments[leg.seg]
  return {
    x: seg.x + inst.dir * leg.side * seg.radius * HIP_SIDE_SHARE,
    y: seg.y + seg.radius * HIP_DOWN_SHARE,
    bodyY: seg.y,
    bodyR: seg.radius
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
    const y = inst.groundAt(leg.footX)
    return { x: leg.footX, y }
  }
  const t = Math.min(1, leg.swing)
  const x = leg.swingFromX + (leg.plantX - leg.swingFromX) * t
  const ground = inst.groundAt(x)
  const start = Math.min(leg.swingFromY, inst.groundAt(leg.swingFromX))
  const end = ground
  const y = start + (end - start) * t - Math.sin(t * Math.PI) * STEP_LIFT * leg.reach
  return { x, y: Math.min(y, ground) }
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
