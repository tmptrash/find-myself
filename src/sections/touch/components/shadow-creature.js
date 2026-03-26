import { CFG } from '../cfg.js'
//
// Creature body configuration (solid black)
//
const BODY_RADIUS = 30
const BODY_SEGMENTS = 4
const BODY_SEGMENT_SPACING = 20
const BODY_COLOR_R = 5
const BODY_COLOR_G = 5
const BODY_COLOR_B = 8
//
// Tentacle (IK arm) configuration
//
const SEGMENT_1_LENGTH = 45
const SEGMENT_2_LENGTH = 38
const TENTACLE_THICKNESS = 4
const STEP_THRESHOLD = 28
const STEP_SPEED = 5.0
const STEP_ARC_HEIGHT = 14
//
// Movement and AI configuration
//
const STALK_SPEED = 55
const FLEE_SPEED = 100
const LIGHT_FEAR_RADIUS = 450
const HERO_KILL_RADIUS = 85
//
// Smooth turning speed (radians per second)
//
const TURN_SPEED = 2.5
//
// Eye configuration
//
const EYE_OFFSET_RATIO = 0.45
const EYE_RADIUS = 5
const PUPIL_RADIUS = 2.5
const PUPIL_OFFSET = 2
const EYE_ANGLE_SPREAD = 0.4
//
// Tentacle rest angle offsets (radians from body center)
// 3 per side: front, middle, back
//
const TENTACLE_ANGLES = [
  -Math.PI * 0.15,
  Math.PI * 0.15,
  -Math.PI * 0.45,
  Math.PI * 0.45,
  -Math.PI * 0.75,
  Math.PI * 0.75
]
//
// IK bending direction for each tentacle
//
const TENTACLE_SIDES = [1, -1, 1, -1, 1, -1]
//
// Tip dot radius at end of each tentacle
//
const TIP_DOT_RADIUS = 3
/**
 * Creates a shadow creature with IK tentacle arms
 * Solid black body, fears glowing bugs, stalks hero
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Initial X position
 * @param {number} cfg.y - Initial Y position
 * @param {Object} cfg.hero - Hero instance
 * @param {Function} cfg.onHeroTouch - Callback when creature touches hero
 * @returns {Object} Shadow creature instance
 */
export function create(cfg) {
  const { k, x, y, hero, onHeroTouch } = cfg
  //
  // Initialize tentacles with rest positions around body
  //
  const reach = SEGMENT_1_LENGTH + SEGMENT_2_LENGTH
  const tentacles = TENTACLE_ANGLES.map((angle, i) => {
    const restX = x + Math.cos(angle) * reach * 0.6
    const restY = y + Math.sin(angle) * reach * 0.6
    return {
      angle,
      side: TENTACLE_SIDES[i],
      footX: restX,
      footY: restY,
      targetX: restX,
      targetY: restY,
      isStepping: false,
      stepProgress: 0,
      stepStartX: restX,
      stepStartY: restY
    }
  })
  const inst = {
    k,
    x,
    y,
    hero,
    onHeroTouch,
    tentacles,
    facingAngle: 0,
    targetFacingAngle: 0,
    isFleeing: false,
    lastStepIndex: -1
  }
  return inst
}

/**
 * Updates creature AI, movement, and IK tentacle stepping
 * Movement follows smooth facing direction for organic motion
 * @param {Object} inst - Shadow creature instance
 * @param {number} dt - Delta time
 * @param {Array} glowPositions - Array of {x, y, radius} from glowing bugs
 */
export function onUpdate(inst, dt, glowPositions) {
  const { hero } = inst
  //
  // Find nearest light source for AI flee behavior
  //
  let nearestLightDist = Infinity
  let nearestLightX = 0
  let nearestLightY = 0
  glowPositions.forEach(glow => {
    const dx = glow.x - inst.x
    const dy = glow.y - inst.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    if (dist < nearestLightDist) {
      nearestLightDist = dist
      nearestLightX = glow.x
      nearestLightY = glow.y
    }
  })
  //
  // AI: determine desired facing direction
  //
  let desiredAngle = inst.facingAngle
  let speed = 0
  //
  // If light is within fear radius, smoothly turn away from it
  //
  if (nearestLightDist < LIGHT_FEAR_RADIUS) {
    desiredAngle = Math.atan2(inst.y - nearestLightY, inst.x - nearestLightX)
    speed = FLEE_SPEED
    inst.isFleeing = true
  } else if (hero?.character?.pos) {
    //
    // No light nearby: stalk the hero
    //
    desiredAngle = Math.atan2(
      hero.character.pos.y - inst.y,
      hero.character.pos.x - inst.x
    )
    speed = STALK_SPEED
    inst.isFleeing = false
  }
  //
  // Smoothly interpolate facing angle toward desired direction
  //
  inst.targetFacingAngle = desiredAngle
  inst.facingAngle = lerpAngle(inst.facingAngle, inst.targetFacingAngle, TURN_SPEED * dt)
  //
  // Move body in current facing direction (smooth organic movement)
  //
  if (speed > 0) {
    inst.x += Math.cos(inst.facingAngle) * speed * dt
    inst.y += Math.sin(inst.facingAngle) * speed * dt
  }
  //
  // Clamp creature to play area
  //
  const leftBound = CFG.visual.gameArea.leftMargin + BODY_RADIUS
  const rightBound = CFG.visual.screen.width - CFG.visual.gameArea.rightMargin - BODY_RADIUS
  const topBound = CFG.visual.gameArea.topMargin + BODY_RADIUS
  const bottomBound = CFG.visual.screen.height - CFG.visual.gameArea.bottomMargin - BODY_RADIUS
  inst.x = Math.max(leftBound, Math.min(rightBound, inst.x))
  inst.y = Math.max(topBound, Math.min(bottomBound, inst.y))
  //
  // Update tentacle IK stepping
  //
  updateTentacles(inst, dt)
  //
  // Check hero collision (kill on touch)
  //
  if (hero?.character?.pos) {
    const dx = hero.character.pos.x - inst.x
    const dy = hero.character.pos.y - inst.y
    const dist = Math.sqrt(dx * dx + dy * dy)
    dist < HERO_KILL_RADIUS && inst.onHeroTouch?.()
  }
}

/**
 * Draws the shadow creature with body segments and IK tentacles
 * @param {Object} inst - Shadow creature instance
 */
export function onDraw(inst) {
  const { k } = inst
  const bodyColor = k.rgb(BODY_COLOR_R, BODY_COLOR_G, BODY_COLOR_B)
  const tentacleColor = k.rgb(BODY_COLOR_R + 8, BODY_COLOR_G + 5, BODY_COLOR_B + 10)
  //
  // Draw tentacles first (behind body)
  //
  inst.tentacles.forEach(tentacle => {
    //
    // Calculate attachment point on body edge
    //
    const attachX = inst.x + Math.cos(tentacle.angle + inst.facingAngle) * BODY_RADIUS * 0.8
    const attachY = inst.y + Math.sin(tentacle.angle + inst.facingAngle) * BODY_RADIUS * 0.8
    //
    // Solve IK for this tentacle
    //
    const { jointX, jointY } = solveIK(
      attachX, attachY,
      tentacle.footX, tentacle.footY,
      SEGMENT_1_LENGTH, SEGMENT_2_LENGTH,
      tentacle.side
    )
    k.drawLine({
      p1: k.vec2(attachX, attachY),
      p2: k.vec2(jointX, jointY),
      width: TENTACLE_THICKNESS,
      color: tentacleColor
    })
    k.drawLine({
      p1: k.vec2(jointX, jointY),
      p2: k.vec2(tentacle.footX, tentacle.footY),
      width: TENTACLE_THICKNESS * 0.7,
      color: tentacleColor
    })
    k.drawCircle({
      pos: k.vec2(tentacle.footX, tentacle.footY),
      radius: TIP_DOT_RADIUS,
      color: tentacleColor
    })
  })
  //
  // Draw body segments (overlapping circles for solid shape)
  //
  for (let i = 0; i < BODY_SEGMENTS; i++) {
    const offset = (i - 1) * BODY_SEGMENT_SPACING
    const segX = inst.x - Math.cos(inst.facingAngle) * offset
    const segY = inst.y - Math.sin(inst.facingAngle) * offset
    const segRadius = BODY_RADIUS * (1 - Math.abs(i - 1) * 0.15)
    k.drawCircle({
      pos: k.vec2(segX, segY),
      radius: segRadius,
      color: bodyColor
    })
  }
  //
  // Draw two eyes that look toward facing direction
  //
  const eyeOffset = BODY_RADIUS * EYE_OFFSET_RATIO
  const eyeAngle1 = inst.facingAngle + EYE_ANGLE_SPREAD
  const eyeAngle2 = inst.facingAngle - EYE_ANGLE_SPREAD
  const eyeX1 = inst.x + Math.cos(eyeAngle1) * eyeOffset
  const eyeY1 = inst.y + Math.sin(eyeAngle1) * eyeOffset
  const eyeX2 = inst.x + Math.cos(eyeAngle2) * eyeOffset
  const eyeY2 = inst.y + Math.sin(eyeAngle2) * eyeOffset
  //
  // Eye whites (dark, barely distinguishable from body)
  //
  k.drawCircle({
    pos: k.vec2(eyeX1, eyeY1),
    radius: EYE_RADIUS,
    color: k.rgb(15, 12, 18)
  })
  k.drawCircle({
    pos: k.vec2(eyeX2, eyeY2),
    radius: EYE_RADIUS,
    color: k.rgb(15, 12, 18)
  })
  //
  // Pupils (dim red, pointing toward facing direction)
  //
  const pupilDirX = Math.cos(inst.facingAngle) * PUPIL_OFFSET
  const pupilDirY = Math.sin(inst.facingAngle) * PUPIL_OFFSET
  k.drawCircle({
    pos: k.vec2(eyeX1 + pupilDirX, eyeY1 + pupilDirY),
    radius: PUPIL_RADIUS,
    color: k.rgb(140, 30, 30)
  })
  k.drawCircle({
    pos: k.vec2(eyeX2 + pupilDirX, eyeY2 + pupilDirY),
    radius: PUPIL_RADIUS,
    color: k.rgb(140, 30, 30)
  })
}

/**
 * Updates IK tentacle stepping for locomotion
 * Uses alternating tripod gait (odd/even tentacles)
 * @param {Object} inst - Shadow creature instance
 * @param {number} dt - Delta time
 */
function updateTentacles(inst, dt) {
  const reach = SEGMENT_1_LENGTH + SEGMENT_2_LENGTH
  inst.tentacles.forEach((tentacle, i) => {
    //
    // Calculate ideal rest position relative to current body
    //
    const idealX = inst.x + Math.cos(tentacle.angle + inst.facingAngle) * reach * 0.55
    const idealY = inst.y + Math.sin(tentacle.angle + inst.facingAngle) * reach * 0.55
    const dx = idealX - tentacle.footX
    const dy = idealY - tentacle.footY
    const dist = Math.sqrt(dx * dx + dy * dy)
    //
    // Start stepping when foot is too far from ideal
    //
    if (!tentacle.isStepping && dist > STEP_THRESHOLD) {
      const groupParity = i % 2
      const sameGroupStepping = inst.tentacles.some(
        (t, idx) => idx % 2 === groupParity && t.isStepping
      )
      if (!sameGroupStepping) {
        tentacle.isStepping = true
        tentacle.stepProgress = 0
        tentacle.stepStartX = tentacle.footX
        tentacle.stepStartY = tentacle.footY
        tentacle.targetX = idealX
        tentacle.targetY = idealY
      }
    }
    //
    // Animate stepping with arc
    //
    if (tentacle.isStepping) {
      tentacle.stepProgress += dt * STEP_SPEED
      if (tentacle.stepProgress >= 1) {
        tentacle.stepProgress = 1
        tentacle.isStepping = false
        tentacle.footX = tentacle.targetX
        tentacle.footY = tentacle.targetY
      } else {
        const t = tentacle.stepProgress
        const arc = Math.sin(t * Math.PI) * STEP_ARC_HEIGHT
        tentacle.footX = tentacle.stepStartX + (tentacle.targetX - tentacle.stepStartX) * t
        tentacle.footY = tentacle.stepStartY + (tentacle.targetY - tentacle.stepStartY) * t - arc
      }
    }
  })
}

/**
 * Smoothly interpolates between two angles handling wraparound
 * @param {number} from - Current angle in radians
 * @param {number} to - Target angle in radians
 * @param {number} t - Interpolation factor (0-1 range, clamped internally)
 * @returns {number} Interpolated angle
 */
function lerpAngle(from, to, t) {
  let diff = to - from
  while (diff > Math.PI) diff -= Math.PI * 2
  while (diff < -Math.PI) diff += Math.PI * 2
  return from + diff * Math.min(1, t)
}

/**
 * Solves 2-segment inverse kinematics
 * @param {number} baseX - Base joint X
 * @param {number} baseY - Base joint Y
 * @param {number} targetX - Target (foot) X
 * @param {number} targetY - Target (foot) Y
 * @param {number} len1 - First segment length
 * @param {number} len2 - Second segment length
 * @param {number} side - Bend direction (-1 or 1)
 * @returns {Object} Joint position {jointX, jointY}
 */
function solveIK(baseX, baseY, targetX, targetY, len1, len2, side) {
  const dx = targetX - baseX
  const dy = targetY - baseY
  let dist = Math.sqrt(dx * dx + dy * dy)
  //
  // Clamp to reachable range
  //
  const maxReach = len1 + len2 - 0.1
  const minReach = Math.abs(len1 - len2) + 0.1
  dist = Math.max(minReach, Math.min(maxReach, dist))
  //
  // Law of cosines for joint angle
  //
  const angleToTarget = Math.atan2(dy, dx)
  const cosAngle = (dist * dist + len1 * len1 - len2 * len2) / (2 * dist * len1)
  const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle)))
  const jointAngle = angleToTarget + angle1 * side
  return {
    jointX: baseX + Math.cos(jointAngle) * len1,
    jointY: baseY + Math.sin(jointAngle) * len1
  }
}
