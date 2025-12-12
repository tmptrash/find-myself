import { CFG } from '../cfg.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'

//
// Walking creature parameters
//
const TEXT_MESSAGE = 'words that kill'
const TEXT_SIZE = 36
const OUTLINE_THICKNESS = 2
const WALK_SPEED = 60  // Pixels per second (slower walking speed)
const LEG_COUNT = 6  // Number of legs (3 pairs)
const UPPER_LEG_LENGTH = 18  // Length of upper leg segment (longer for more reach)
const LOWER_LEG_LENGTH = 18  // Length of lower leg segment
const LEG_SPACING = 50  // Horizontal spacing between legs
const STEP_HEIGHT = 18  // How high to lift foot during step
const STEP_LENGTH = 50  // How far forward to step (increased for more forward reach)
const STEP_DURATION = 0.5  // Duration of one step (seconds)
const BODY_BOUNCE = 2  // Vertical bounce of body during walk (reduced)

/**
 * Creates a walking text creature with procedurally animated legs using inverse kinematics
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.y - Y position (center of text)
 * @param {Object} config.hero - Hero instance for collision detection
 * @param {string} config.currentLevel - Current level name for restart
 * @param {Object} [config.sfx] - Sound instance for audio effects
 * @param {Function} [config.onHit] - Optional custom death callback
 * @returns {Object} Walking creature instance
 */
export function create(config) {
  const { k, y, hero, currentLevel, sfx = null, onHit = null } = config
  
  const sideWallWidth = 192  // Side walls width (10% of 1920)
  
  //
  // Calculate ground level (bottom platform)
  //
  const PLATFORM_BOTTOM_HEIGHT = 360
  const groundY = CFG.visual.screen.height - PLATFORM_BOTTOM_HEIGHT  // 720
  
  //
  // Start position: behind left wall
  //
  const startX = sideWallWidth - 200
  
  //
  // Calculate maximum width (to right wall)
  //
  const screenWidth = CFG.visual.screen.width  // 1920
  const maxX = screenWidth - sideWallWidth
  
  //
  // Create a temporary text to measure full width
  //
  const tempText = k.add([
    k.text(TEXT_MESSAGE, {
      size: TEXT_SIZE,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(-10000, -10000),  // Off-screen
    k.opacity(0)
  ])
  const textWidth = tempText.width
  tempText.destroy()
  
  //
  // Create container for the entire creature
  //
  const creatureContainer = k.add([
    k.pos(startX, y),
    k.z(CFG.visual.zIndex.platforms - 1)
  ])
  
  //
  // Create legs with IK targets
  // Distribute evenly under the text from first letter to last letter
  // Create TWO rows: near legs (visible to player) and far legs (behind)
  //
  const legs = []
  const legStartX = -textWidth / 2 + 10  // Start at first letter (left edge + small padding)
  const legEndX = textWidth / 2 - 10  // End at last letter (right edge - small padding)
  const totalLegSpan = legEndX - legStartX  // Total distance to distribute legs
  
  //
  // Calculate text height to attach legs properly
  //
  const textHeight = TEXT_SIZE
  const attachY = -textHeight / 2 + 20  // Attach lower in the letters (was +8)
  
  for (let i = 0; i < LEG_COUNT; i++) {
    //
    // Distribute legs evenly from first to last letter
    //
    const attachX = legStartX + (totalLegSpan / (LEG_COUNT - 1)) * i
    
    //
    // Create NEAR leg (closer to player, in front)
    //
    const nearLeg = {
      attachX,  // Attachment point X (relative to body)
      attachY,  // Attachment point Y (below text)
      footX: startX + attachX,  // Current foot X position (world space)
      footY: groundY,  // Current foot Y position (on ground)
      targetX: startX + attachX,  // Target foot X position
      targetY: groundY,  // Target foot Y position
      isLifted: false,  // Is foot currently lifted?
      stepProgress: 0,  // Progress of current step (0-1)
      pairGroup: i % 3,  // Group for alternating legs (0, 1, 2)
      needsStep: false,  // Does this leg need to step?
      startX: startX + attachX,  // Step start position X
      startY: groundY,  // Step start position Y
      isFarLeg: false  // This is a near leg (drawn in front)
    }
    
    legs.push(nearLeg)
    
    //
    // Create FAR leg (away from player, behind)
    // Offset by half the spacing for alternating pattern
    //
    const farLeg = {
      attachX,  // Same attachment point X
      attachY,  // Same attachment point Y
      footX: startX + attachX,  // Current foot X position (world space)
      footY: groundY,  // Current foot Y position (on ground)
      targetX: startX + attachX,  // Target foot X position
      targetY: groundY,  // Target foot Y position
      isLifted: false,  // Is foot currently lifted?
      stepProgress: 0,  // Progress of current step (0-1)
      pairGroup: i % 3,  // Group for alternating legs (0, 1, 2)
      needsStep: false,  // Does this leg need to step?
      startX: startX + attachX,  // Step start position X
      startY: groundY,  // Step start position Y
      isFarLeg: true,  // This is a far leg (drawn behind)
      phaseOffset: 0.5  // Start with opposite phase for alternating gait
    }
    
    legs.push(farLeg)
  }
  
  //
  // Create 8 outline text objects (black, offset in all directions)
  //
  const offsets = [
    [-OUTLINE_THICKNESS, -OUTLINE_THICKNESS],
    [0, -OUTLINE_THICKNESS],
    [OUTLINE_THICKNESS, -OUTLINE_THICKNESS],
    [-OUTLINE_THICKNESS, 0],
    [OUTLINE_THICKNESS, 0],
    [-OUTLINE_THICKNESS, OUTLINE_THICKNESS],
    [0, OUTLINE_THICKNESS],
    [OUTLINE_THICKNESS, OUTLINE_THICKNESS]
  ]
  
  const textObjects = []
  
  offsets.forEach(([dx, dy]) => {
    const outlineText = creatureContainer.add([
      k.text(TEXT_MESSAGE, {
        size: TEXT_SIZE,
        font: CFG.visual.fonts.thinFull.replace(/'/g, '')
      }),
      k.pos(dx, dy),
      k.color(0, 0, 0),
      k.anchor('center')
    ])
    textObjects.push(outlineText)
  })
  
  //
  // Create main text (steel blue)
  //
  const mainText = creatureContainer.add([
    k.text(TEXT_MESSAGE, {
      size: TEXT_SIZE,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(0, 0),
    k.color(107, 142, 159),
    k.anchor('center')
  ])
  textObjects.push(mainText)
  
  //
  // Create collision area for the text body
  //
  const collisionHeight = TEXT_SIZE + OUTLINE_THICKNESS * 2
  const collisionArea = k.add([
    k.pos(startX, y),
    k.rect(textWidth, collisionHeight),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.anchor('center'),
    k.z(CFG.visual.zIndex.platforms + 1),  // In front of platforms so legs are visible
    "blade-arm-text"
  ])
  
  const inst = {
    k,
    creatureContainer,
    textObjects,
    collisionArea,
    legs,
    hero,
    currentLevel,
    sfx,
    onHit,
    textWidth,
    maxX,
    groundY,
    animationTime: 0,
    pauseTimer: 1.0,  // Initial pause before starting to walk
    bodyBounceOffset: 0,
    bodyTilt: 0,  // Body tilt angle (horizontal sway)
    currentSpeed: WALK_SPEED,  // Current walking speed
    heroIsDead: false  // Flag to stop movement after killing hero
  }
  
  //
  // Start the animation cycle
  //
  collisionArea.onUpdate(() => updateWalkingCreature(inst))
  
  //
  // Draw legs
  //
  k.onDraw(() => drawLegs(inst))
  
  //
  // Handle collision with text
  //
  collisionArea.onCollide("player", () => handleCollision(inst))
  
  return inst
}

/**
 * Handle collision with walking creature
 * @param {Object} inst - Walking creature instance
 */
function handleCollision(inst) {
  //
  // Mark hero as dead to stop creature movement
  //
  inst.heroIsDead = true
  
  //
  // Use custom death handler if provided, otherwise use default
  //
  if (inst.onHit) {
    inst.onHit(inst)
  } else {
  Hero.death(inst.hero, () => inst.k.go(inst.currentLevel))
  }
}

/**
 * Solve inverse kinematics for two-bone leg
 * @param {number} targetX - Target foot X position
 * @param {number} targetY - Target foot Y position
 * @param {number} attachX - Attachment point X
 * @param {number} attachY - Attachment point Y
 * @param {number} upperLength - Upper leg length
 * @param {number} lowerLength - Lower leg length
 * @returns {Object} Joint positions {kneeX, kneeY}
 */
function solveIK(targetX, targetY, attachX, attachY, upperLength, lowerLength) {
  //
  // Calculate distance from attachment to target
  //
  const dx = targetX - attachX
  const dy = targetY - attachY
  const distance = Math.sqrt(dx * dx + dy * dy)
  
  //
  // Clamp distance to reachable range
  //
  const maxReach = upperLength + lowerLength
  const clampedDistance = Math.min(distance, maxReach * 0.99)
  
  //
  // Calculate angles using law of cosines
  //
  const angleToTarget = Math.atan2(dy, dx)
  
  const upperAngle = Math.acos(
    (upperLength * upperLength + clampedDistance * clampedDistance - lowerLength * lowerLength) /
    (2 * upperLength * clampedDistance)
  )
  
  //
  // Calculate knee position
  //
  const kneeAngle = angleToTarget + upperAngle
  const kneeX = attachX + Math.cos(kneeAngle) * upperLength
  const kneeY = attachY + Math.sin(kneeAngle) * upperLength
  
  return { kneeX, kneeY }
}

/**
 * Update procedural leg animation
 * @param {Object} inst - Walking creature instance
 */
function updateProceduralLegs(inst) {
  const { legs, creatureContainer, groundY } = inst
  
  //
  // Track which pair groups just completed a step (to play sound once per group)
  //
  const completedPairGroups = new Set()
  
  //
  // Update each leg
  //
  legs.forEach(leg => {
    //
    // Calculate attachment point in world space
    //
    const attachWorldX = creatureContainer.pos.x + leg.attachX
    
    //
    // Check if leg needs to step (foot is far behind attachment point)
    //
    const distanceFromAttach = leg.footX - attachWorldX
    
    //
    // Trigger step when foot is significantly behind attachment (at back of stride)
    //
    if (!leg.isLifted && distanceFromAttach < -STEP_LENGTH * 0.6) {
      //
      // Check if legs in same pair group are not already stepping
      //
      const pairBusy = legs.some(l => 
        l.pairGroup === leg.pairGroup && l.isLifted && l !== leg
      )
      
      if (!pairBusy) {
        leg.needsStep = true
      }
    }
    
    //
    // Start step if needed
    //
    if (leg.needsStep && !leg.isLifted) {
      leg.isLifted = true
      leg.stepProgress = 0
      leg.needsStep = false
      
      //
      // Store initial position
      //
      leg.startX = leg.footX
      leg.startY = leg.footY
      
      //
      // Set target position: FAR ahead of attachment point
      // Foot moves from behind attachment to far in front
      // This creates proper stride: back -> forward through center
      //
      leg.targetX = attachWorldX + STEP_LENGTH * 1.0  // 100% of step length AHEAD of attachment
      leg.targetY = groundY
    }
    
    //
    // Animate step
    //
    if (leg.isLifted) {
      leg.stepProgress += inst.k.dt() / STEP_DURATION
      
      if (leg.stepProgress >= 1) {
        //
        // Step complete
        //
        leg.isLifted = false
        leg.stepProgress = 0
        leg.footX = leg.targetX
        leg.footY = leg.targetY
        
        //
        // Mark this pair group as completed (for sound)
        // Track both near and far legs
        //
        completedPairGroups.add(leg.pairGroup)
      } else {
        //
        // Interpolate foot position with arc
        //
        const t = leg.stepProgress
        
        //
        // Use smooth ease-in-out curve for natural motion
        //
        const easeT = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2
        
        leg.footX = leg.startX + (leg.targetX - leg.startX) * easeT
        
        //
        // Arc trajectory (parabola) - foot lifts up during step
        //
        const heightCurve = Math.sin(t * Math.PI)
        leg.footY = leg.startY + (leg.targetY - leg.startY) * easeT - STEP_HEIGHT * heightCurve
      }
    }
  })
  
  //
  // Play sound once per completed pair group
  //
  if (inst.sfx && completedPairGroups.size > 0) {
    completedPairGroups.forEach(() => {
      Sound.playCrunchSound(inst.sfx)
    })
  }
}

/**
 * Update walking creature animation
 * @param {Object} inst - Walking creature instance
 */
function updateWalkingCreature(inst) {
  //
  // Stop animation if hero is annihilating or dead
  //
  if (inst.hero.isAnnihilating || inst.heroIsDead) {
    return
  }
  
  const { k, hero } = inst
  const dt = k.dt()
  
  //
  // Initial pause
  //
  if (inst.pauseTimer > 0) {
    inst.pauseTimer -= dt
    return
  }
  
  //
  // Update animation time
  //
  inst.animationTime += dt
  
  //
  // Check if hero is moving
  // Use hero's isRunning flag OR check velocity as fallback
  //
  const heroIsMoving = hero.isRunning || 
                       Math.abs(hero.character.vel?.x || 0) > 5 || 
                       Math.abs(hero.character.vel?.y || 0) > 5
  
  //
  // Adaptive speed: FREEZE/slow when hero moves (stalking), speed up when hero is still (hunting)
  //
  const targetSpeed = heroIsMoving ? WALK_SPEED * 0.1 : WALK_SPEED * 1.5  // 10% or 150% of base speed
  
  //
  // Smooth speed transition
  //
  inst.currentSpeed += (targetSpeed - inst.currentSpeed) * dt * 5  // Fast transition
  
  //
  // Move creature to the right (walking)
  //
  const newX = inst.creatureContainer.pos.x + inst.currentSpeed * dt
  
  //
  // Check if reached right wall
  //
  if (newX < inst.maxX) {
    inst.creatureContainer.pos.x = newX
    inst.collisionArea.pos.x = newX
  }
  
  //
  // Update body bounce (subtle vertical movement)
  //
  const oldBounceOffset = inst.bodyBounceOffset
  inst.bodyBounceOffset = Math.sin(inst.animationTime * 6) * BODY_BOUNCE
  const bounceChange = inst.bodyBounceOffset - oldBounceOffset
  inst.creatureContainer.pos.y += bounceChange
  
  //
  // Update body tilt (horizontal sway like a stalking animal)
  //
  inst.bodyTilt = Math.sin(inst.animationTime * 3) * 4  // ±4 degrees tilt
  inst.creatureContainer.angle = inst.bodyTilt
  inst.collisionArea.angle = inst.bodyTilt
  
  //
  // Update procedural leg animation
  //
  updateProceduralLegs(inst)
}

/**
 * Draw animated legs using inverse kinematics
 * @param {Object} inst - Walking creature instance
 */
function drawLegs(inst) {
  const { k, creatureContainer, legs } = inst
  
  //
  // Don't draw during pause
  //
  if (inst.pauseTimer > 0) {
    return
  }
  
  //
  // Draw far legs first (behind), then near legs (in front)
  //
  const farLegs = legs.filter(leg => leg.isFarLeg)
  const nearLegs = legs.filter(leg => !leg.isFarLeg)
  
  //
  // Helper function to draw a single leg
  //
  const drawLeg = (leg) => {
    //
    // Calculate world positions
    // Foot position is already in world space
    //
    const attachWorldX = creatureContainer.pos.x + leg.attachX
    const attachWorldY = creatureContainer.pos.y + leg.attachY
    const footWorldX = leg.footX  // Already in world space
    const footWorldY = leg.footY  // Already in world space
    
    //
    // Solve IK for knee position
    //
    const ik = solveIK(
      footWorldX - attachWorldX,
      footWorldY - attachWorldY,
      0,
      0,
      UPPER_LEG_LENGTH,
      LOWER_LEG_LENGTH
    )
    
    const kneeWorldX = attachWorldX + ik.kneeX
    const kneeWorldY = attachWorldY + ik.kneeY
    
    //
    // Draw black outline for upper leg (wider for visibility)
    //
    k.drawLine({
      p1: k.vec2(attachWorldX, attachWorldY),
      p2: k.vec2(kneeWorldX, kneeWorldY),
      width: 7,
      color: k.rgb(0, 0, 0)
    })
    
    //
    // Draw black outline for lower leg (wider for visibility)
    //
    k.drawLine({
      p1: k.vec2(kneeWorldX, kneeWorldY),
      p2: k.vec2(footWorldX, footWorldY),
      width: 7,
      color: k.rgb(0, 0, 0)
    })
    
    //
    // Draw upper leg (steel blue, same as text)
    //
    k.drawLine({
      p1: k.vec2(attachWorldX, attachWorldY),
      p2: k.vec2(kneeWorldX, kneeWorldY),
      width: 3,
      color: k.rgb(107, 142, 159)
    })
    
    //
    // Draw lower leg (steel blue, same as text)
    //
    k.drawLine({
      p1: k.vec2(kneeWorldX, kneeWorldY),
      p2: k.vec2(footWorldX, footWorldY),
      width: 3,
      color: k.rgb(107, 142, 159)
    })
    
    //
    // Draw foot knob (набалдашник) with black outline (smaller)
    //
    const knobRadius = 4
    
    //
    // Black outline for knob
    //
    k.drawCircle({
      pos: k.vec2(footWorldX, footWorldY),
      radius: knobRadius + 1.2,
      color: k.rgb(0, 0, 0)
    })
    
    //
    // Steel blue knob
    //
    k.drawCircle({
      pos: k.vec2(footWorldX, footWorldY),
      radius: knobRadius,
      color: k.rgb(107, 142, 159)
    })
  }
  
  //
  // Draw far legs first (they appear behind the text)
  //
  farLegs.forEach(drawLeg)
  
  //
  // Draw near legs last (they appear in front)
  //
  nearLegs.forEach(drawLeg)
}
