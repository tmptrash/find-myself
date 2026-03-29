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
const TENTACLE_THICKNESS = 7
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
// Padding around platform rectangles for body avoidance (pixels)
//
const PLATFORM_AVOIDANCE_PADDING = 5
//
// Steering angle offset when creature is blocked by a platform (radians)
//
const STEER_ANGLE_STEP = Math.PI / 6
//
// Creature glow when near light (reflected light on body)
//
const GLOW_RING_COUNT = 8
//
// Burning effect when creature is very close to a light source
//
const BURN_FLEE_SPEED = 180
const BURN_PARTICLE_COUNT = 6
const BURN_PARTICLE_SPEED_MIN = 40
const BURN_PARTICLE_SPEED_EXTRA = 60
const BURN_PARTICLE_LIFETIME = 0.5
const BURN_PARTICLE_SIZE = 5
const BURN_GLOW_MAX_OPACITY = 0.35
const BURN_GLOW_RADIUS_MULTIPLIER = 2.5
//
// Eye configuration
//
const EYE_OFFSET_RATIO = 0.45
const EYE_RADIUS = 6
const EYE_ANGLE_SPREAD = 0.7
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
const TIP_DOT_RADIUS = 4
/**
 * Creates a shadow creature with IK tentacle arms
 * Solid black body, fears glowing bugs, stalks hero
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Initial X position
 * @param {number} cfg.y - Initial Y position
 * @param {Object} cfg.hero - Hero instance
 * @param {Function} cfg.onHeroTouch - Callback when creature touches hero
 * @param {Array} [cfg.platforms=[]] - Platform rectangles {x, y, width} for collision avoidance
 * @param {number} [cfg.platformHeight=40] - Platform thickness in pixels
 * @returns {Object} Shadow creature instance
 */
export function create(cfg) {
  const { k, x, y, hero, onHeroTouch, platforms = [], platformHeight = 40 } = cfg
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
    platforms,
    platformHeight,
    facingAngle: 0,
    targetFacingAngle: 0,
    isFleeing: false,
    lastStepIndex: -1,
    stopped: false,
    nearestLightDist: Infinity,
    isBurning: false,
    burnParticles: []
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
  //
  // Skip all movement when stopped (hero reached anti-hero)
  //
  if (inst.stopped) return
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
  // Store nearest light distance for glow rendering
  //
  inst.nearestLightDist = nearestLightDist
  //
  // AI: determine desired facing direction
  //
  let desiredAngle = inst.facingAngle
  let speed = 0
  //
  // If light is within fear radius, smoothly turn away from it
  //
  //
  // Burning state: creature burns while fleeing from any light source
  //
  inst.isBurning = nearestLightDist < LIGHT_FEAR_RADIUS
  if (nearestLightDist < LIGHT_FEAR_RADIUS) {
    desiredAngle = Math.atan2(inst.y - nearestLightY, inst.x - nearestLightX)
    //
    // Speed scales up as creature gets closer to light (lerp between FLEE and BURN_FLEE)
    //
    const closeness = 1 - nearestLightDist / LIGHT_FEAR_RADIUS
    speed = FLEE_SPEED + (BURN_FLEE_SPEED - FLEE_SPEED) * closeness
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
  // Move body with platform avoidance: try direct path first,
  // then probe rotated angles (±30°, ±60°, ±90°) to steer around obstacles
  //
  if (speed > 0) {
    const step = speed * dt
    const moved = tryMoveWithSteering(inst, inst.facingAngle, step)
    //
    // If all angles are blocked, try axis-aligned sliding as fallback
    //
    if (!moved) {
      const moveDx = Math.cos(inst.facingAngle) * step
      const moveDy = Math.sin(inst.facingAngle) * step
      !wouldOverlapPlatform(inst, inst.x + moveDx, inst.y) && (inst.x += moveDx)
      !wouldOverlapPlatform(inst, inst.x, inst.y + moveDy) && (inst.y += moveDy)
    }
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
  // Update burn particles and spawn new ones while burning
  //
  updateBurnParticles(inst, dt)
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
  //
  // Draw glow or burning effect around body depending on light proximity
  //
  if (inst.isBurning) {
    //
    // Intense burning glow (orange-red, flickering)
    //
    const burnIntensity = 1 - inst.nearestLightDist / LIGHT_FEAR_RADIUS
    const flicker = 0.8 + Math.sin(k.time() * 12) * 0.2
    const glowR = BODY_RADIUS * BURN_GLOW_RADIUS_MULTIPLIER * flicker
    for (let i = 0; i < GLOW_RING_COUNT; i++) {
      const t = i / GLOW_RING_COUNT
      const ringRadius = glowR * (1 - t)
      const ringOpacity = BURN_GLOW_MAX_OPACITY * burnIntensity * t * t
      k.drawCircle({
        pos: k.vec2(inst.x, inst.y),
        radius: ringRadius,
        color: k.rgb(200, 100, 20),
        opacity: ringOpacity
      })
    }
    //
    // Draw burn particles (rising flame wisps)
    //
    inst.burnParticles.forEach(p => {
      const alpha = 1 - p.age / p.lifetime
      k.drawCircle({
        pos: k.vec2(p.x, p.y),
        radius: BURN_PARTICLE_SIZE * alpha,
        color: k.rgb(p.r, p.g, p.b),
        opacity: alpha * 0.7
      })
    })
  }
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
      color: bodyColor
    })
    k.drawLine({
      p1: k.vec2(jointX, jointY),
      p2: k.vec2(tentacle.footX, tentacle.footY),
      width: TENTACLE_THICKNESS * 0.7,
      color: bodyColor
    })
    k.drawCircle({
      pos: k.vec2(tentacle.footX, tentacle.footY),
      radius: TIP_DOT_RADIUS,
      color: bodyColor
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
  // Eyes (solid red, no surrounding eyeball)
  //
  k.drawCircle({
    pos: k.vec2(eyeX1, eyeY1),
    radius: EYE_RADIUS,
    color: k.rgb(140, 30, 30)
  })
  k.drawCircle({
    pos: k.vec2(eyeX2, eyeY2),
    radius: EYE_RADIUS,
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
 * Spawns flame particles when burning and updates existing particle positions/lifetimes
 * Particles rise upward with random spread, fading from orange to red
 * @param {Object} inst - Shadow creature instance
 * @param {number} dt - Delta time
 */
function updateBurnParticles(inst, dt) {
  //
  // Update existing particles (move upward, age)
  //
  for (let i = inst.burnParticles.length - 1; i >= 0; i--) {
    const p = inst.burnParticles[i]
    p.x += p.vx * dt
    p.y += p.vy * dt
    p.age += dt
    p.age >= p.lifetime && inst.burnParticles.splice(i, 1)
  }
  //
  // Spawn new particles while burning
  //
  if (!inst.isBurning) return
  for (let i = 0; i < BURN_PARTICLE_COUNT; i++) {
    if (Math.random() > 0.3) continue
    const angle = Math.random() * Math.PI * 2
    const speed = BURN_PARTICLE_SPEED_MIN + Math.random() * BURN_PARTICLE_SPEED_EXTRA
    const rVal = Math.random()
    inst.burnParticles.push({
      x: inst.x + (Math.random() - 0.5) * BODY_RADIUS,
      y: inst.y + (Math.random() - 0.5) * BODY_RADIUS,
      vx: Math.cos(angle) * speed * 0.3,
      vy: -Math.abs(Math.sin(angle)) * speed - 30,
      age: 0,
      lifetime: BURN_PARTICLE_LIFETIME + Math.random() * 0.3,
      r: rVal > 0.5 ? 255 : 220,
      g: rVal > 0.5 ? 140 : 80,
      b: 20
    })
  }
}

/**
 * Tries to move the creature at the given angle; if blocked, probes
 * progressively wider angles (±30°, ±60°, ±90°) to find a clear path.
 * Prefers the side closer to the original desired direction.
 * @param {Object} inst - Shadow creature instance
 * @param {number} angle - Desired movement angle (radians)
 * @param {number} step - Movement distance this frame (pixels)
 * @returns {boolean} True if creature successfully moved
 */
function tryMoveWithSteering(inst, angle, step) {
  //
  // Try direct path first
  //
  const dx = Math.cos(angle) * step
  const dy = Math.sin(angle) * step
  if (!wouldOverlapPlatform(inst, inst.x + dx, inst.y + dy)) {
    inst.x += dx
    inst.y += dy
    return true
  }
  //
  // Probe rotated angles on both sides to find a clear path around the platform
  //
  for (let i = 1; i <= 3; i++) {
    const offset = STEER_ANGLE_STEP * i
    const angleLeft = angle + offset
    const angleRight = angle - offset
    const ldx = Math.cos(angleLeft) * step
    const ldy = Math.sin(angleLeft) * step
    if (!wouldOverlapPlatform(inst, inst.x + ldx, inst.y + ldy)) {
      inst.x += ldx
      inst.y += ldy
      return true
    }
    const rdx = Math.cos(angleRight) * step
    const rdy = Math.sin(angleRight) * step
    if (!wouldOverlapPlatform(inst, inst.x + rdx, inst.y + rdy)) {
      inst.x += rdx
      inst.y += rdy
      return true
    }
  }
  return false
}

/**
 * Checks if placing the creature body at (x, y) would overlap any platform
 * Uses circle-vs-AABB: finds closest point on each platform rect and
 * checks if distance is less than body radius + padding
 * @param {Object} inst - Shadow creature instance
 * @param {number} x - Candidate X position
 * @param {number} y - Candidate Y position
 * @returns {boolean} True if position would overlap a platform
 */
function wouldOverlapPlatform(inst, x, y) {
  const padding = BODY_RADIUS + PLATFORM_AVOIDANCE_PADDING
  const paddingSq = padding * padding
  return inst.platforms.some(platform => {
    const left = platform.x - platform.width / 2
    const right = platform.x + platform.width / 2
    const top = platform.y
    const bottom = platform.y + inst.platformHeight
    const closestX = Math.max(left, Math.min(right, x))
    const closestY = Math.max(top, Math.min(bottom, y))
    const dx = x - closestX
    const dy = y - closestY
    return (dx * dx + dy * dy) < paddingSq
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
