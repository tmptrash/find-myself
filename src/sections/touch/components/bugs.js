import { CFG } from '../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
//
// Bug parameters
//
const BUG_BODY_SIZE = 6
const LEG_COUNT = 4  // 4 legs (2 per side)
const LEG_LENGTH_1 = 8  // First segment length
const LEG_LENGTH_2 = 7  // Second segment length
const LEG_THICKNESS = 1.5
const DETECTION_RADIUS = 60  // Detection distance - bugs hide when hero approaches
const CRAWL_SPEED = 15  // Slow crawling speed
const CRAWL_DURATION = 8.0  // Time to crawl before stopping
const STOP_DURATION = 2.0  // Pause duration before changing direction
const STEP_DISTANCE = 8  // Distance to trigger leg step (reduced from 12)
const STEP_SPEED = 6  // How fast legs step
//
// Bug color patterns (ladybug-like)
//
const BUG_PATTERNS = [
  {
    bodyColor: '#E74C3C',  // Red
    spotColor: '#000000',
    spots: [
      { x: -0.3, y: -0.2 },
      { x: 0.3, y: -0.2 },
      { x: 0, y: 0.3 }
    ]
  },
  {
    bodyColor: '#F39C12',  // Orange
    spotColor: '#000000',
    spots: [
      { x: -0.25, y: 0 },
      { x: 0.25, y: 0 }
    ]
  },
  {
    bodyColor: '#9B59B6',  // Purple
    spotColor: '#FFFFFF',
    spots: [
      { x: -0.3, y: -0.3 },
      { x: 0.3, y: -0.3 },
      { x: -0.3, y: 0.3 },
      { x: 0.3, y: 0.3 }
    ]
  },
  {
    bodyColor: '#3498DB',  // Blue
    spotColor: '#000000',
    spots: [
      { x: 0, y: -0.3 },
      { x: -0.3, y: 0.1 },
      { x: 0.3, y: 0.1 }
    ]
  }
]

/**
 * Creates a bug with IK legs
 * @param {Object} config - Bug configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {Object} config.hero - Hero instance to react to
 * @param {string} config.surface - Surface type: 'floor', 'leftWall', 'rightWall'
 * @param {Object} config.bounds - Movement bounds {minX, maxX, minY, maxY}
 * @param {number} [config.scale=1] - Scale multiplier for bug size (for debugging)
 * @param {number} [config.legLength1] - First leg segment length (overrides default)
 * @param {number} [config.legLength2] - Second leg segment length (overrides default)
 * @param {number} [config.crawlSpeed] - Crawling speed (overrides default)
 * @param {number} [config.legSpreadFactor=1.0] - How wide legs are spread (0.3 = narrow, 1.0 = normal)
 * @param {number} [config.legDropFactor=0.7] - How far down legs reach (0.2 = straight, 0.7 = bent)
 * @param {string} [config.customColor] - Custom color for body (hex string like "#123456")
 * @param {number} [config.zIndex] - Z-index for rendering order
 * @param {boolean} [config.showOutline=true] - Whether to show black outline
 * @param {number} [config.legThickness] - Custom leg thickness multiplier
 * @param {string} [config.bodyShape='semicircle'] - Body shape: 'semicircle' or 'circle'
 * @param {number} [config.legCount=4] - Number of legs: 2 or 4
 * @returns {Object} Bug instance
 */
export function create(config) {
  const { 
    k, x, y, hero, surface = 'floor', bounds, scale = 1, sfx,
    legLength1 = LEG_LENGTH_1,
    legLength2 = LEG_LENGTH_2,
    crawlSpeed = CRAWL_SPEED,
    legSpreadFactor = 1.0,
    legDropFactor = 0.7,
    customColor = null,
    zIndex = 15,
    showOutline = true,
    legThickness = 1.0,
    bodyShape = 'semicircle',
    legCount = 4
  } = config
  //
  // Choose random pattern or use custom color
  //
  const pattern = customColor 
    ? { bodyColor: customColor, spotColor: '#000000', spots: [] }
    : BUG_PATTERNS[Math.floor(Math.random() * BUG_PATTERNS.length)]
  //
  // Initialize bug state based on surface
  //
  let angle, normalAngle, legAngles
  if (surface === 'leftWall') {
    angle = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2  // Up or down
    normalAngle = 0  // Normal points right (away from wall)
    //
    // 4 legs: 2 on left side, 2 on right side of body (from viewer perspective)
    //
    legAngles = [
      Math.PI * 0.75,   // Left front leg
      Math.PI * 1.25,   // Left back leg
      -Math.PI * 0.25,  // Right front leg
      Math.PI * 0.25    // Right back leg
    ]
  } else if (surface === 'rightWall') {
    angle = Math.random() > 0.5 ? Math.PI / 2 : -Math.PI / 2  // Up or down
    normalAngle = Math.PI  // Normal points left (away from wall)
    //
    // 4 legs: 2 on left side, 2 on right side of body
    //
    legAngles = [
      Math.PI * 0.75,   // Left front leg
      Math.PI * 1.25,   // Left back leg
      -Math.PI * 0.25,  // Right front leg
      Math.PI * 0.25    // Right back leg
    ]
  } else {
    angle = Math.random() > 0.5 ? 0 : Math.PI  // Left or right
    normalAngle = Math.PI / 2  // Normal points down (towards floor)
    
    if (legCount === 2) {
      //
      // 2 legs: one on left side, one on right side (far apart)
      //
      legAngles = [
        Math.PI * 0.5,   // Left leg (straight down-left)
        Math.PI * 0.5    // Right leg (straight down-right)
      ]
    } else {
      //
      // 4 legs: 2 front (pointing forward-down), 2 back (pointing backward-down)
      // Indices: 0 = left front, 1 = right front, 2 = left back, 3 = right back
      // Front legs point more forward (smaller angle), back legs point more backward (larger angle)
      //
      legAngles = [
        Math.PI * 0.25,   // Left front leg (forward-down-left)
        Math.PI * 0.25,   // Right front leg (forward-down-right)
        Math.PI * 0.75,   // Left back leg (backward-down-left)
        Math.PI * 0.75    // Right back leg (backward-down-right)
      ]
    }
  }
  //
  // Create legs based on legCount
  //
  
  const legs = legAngles.map((baseAngle, i) => {
    //
    // IK bending direction:
    // For 4 legs: Back legs (0, 1): bend backward (side = -1), Front legs (2, 3): bend forward (side = 1)
    // For 2 legs: Both bend outward (side based on index)
    //
    const side = legCount === 2 ? (i === 0 ? -1 : 1) : (i < 2 ? -1 : 1)
    const reach = (legLength1 + legLength2) * scale
    
    //
    // Initialize all legs on the same floor line
    //
    let footX, footY
    if (surface === 'floor') {
      //
      // All legs start on same horizontal line (floor)
      //
      const floorY = y + reach * legDropFactor
      
      if (legCount === 2) {
        //
        // 2 legs: place them far apart on left and right sides
        //
        if (i === 0) {
          // Left leg
          footX = x - reach * 0.8 * legSpreadFactor
        } else {
          // Right leg
          footX = x + reach * 0.8 * legSpreadFactor
        }
      } else {
        //
        // 4 legs: front and back positioning
        //
        if (i === 2 || i === 3) {
          // Front legs (indices 2, 3)
          footX = x + reach * 0.6 * legSpreadFactor
        } else {
          // Back legs (indices 0, 1)
          footX = x - reach * 0.4 * legSpreadFactor
        }
      }
      
      footY = floorY  // Same Y for all legs
    } else {
      //
      // Wall bugs use angles
      //
      footX = x + Math.cos(baseAngle) * reach * 0.7
      footY = y + Math.sin(baseAngle) * reach * 0.7
    }
    
    return {
      baseAngle: baseAngle,  // Absolute angle for legs
      side,
      footX,
      footY,
      targetFootX: footX,
      targetFootY: footY,
      isStepping: false,
      stepProgress: 0,
      stepStartX: footX,
      startStartY: footY
    }
  })
  //
  // Randomize initial state and timer for each bug
  // Also randomize cycle durations and speed for each bug
  //
  const finalCrawlSpeed = crawlSpeed * (0.5 + Math.random() * 1.0)
  const crawlDuration = CRAWL_DURATION * (0.5 + Math.random() * 1.5)  // 4-20 seconds
  const stopDuration = STOP_DURATION * (0.3 + Math.random() * 1.4)  // 0.6-3.4 seconds
  
  const startInCrawling = Math.random() > 0.3  // 70% start crawling, 30% start stopped
  const initialState = startInCrawling ? 'crawling' : 'stopping'
  const initialTimer = startInCrawling 
    ? Math.random() * crawlDuration  // Random time into crawl cycle
    : Math.random() * stopDuration   // Random time into stop cycle
  
  const inst = {
    k,
    hero,
    sfx,
    x,
    y,  // Y is floor line position
    surface,
    normalAngle,
    bounds,
    scale,
    legLength1,     // Store for IK calculations
    legLength2,     // Store for IK calculations
    legSpreadFactor, // Store for leg positioning
    legDropFactor,   // Store for leg positioning
    zIndex,          // Store for rendering order
    showOutline,     // Store for outline display
    legThickness,    // Store for leg thickness
    bodyShape,       // Store for body shape
    legCount,        // Store for number of legs
    crawlSpeed: finalCrawlSpeed,     // Unique speed for this bug
    crawlDuration,  // Unique duration for this bug
    stopDuration,   // Unique duration for this bug
    vx: startInCrawling ? Math.cos(angle) * finalCrawlSpeed : 0,
    vy: startInCrawling ? Math.sin(angle) * finalCrawlSpeed : 0,
    pattern,
    legs,
    state: initialState,  // States: 'crawling', 'stopping', 'scared', 'recovering'
    stateTimer: initialTimer,  // Random time in current state
    distanceTraveled: 0,
    movementAngle: angle,
    dropOffset: 0  // How much body has dropped when scared
  }
  
  return inst
}

/**
 * Update bug position and legs
 * @param {Object} inst - Bug instance
 * @param {number} dt - Delta time
 */
export function onUpdate(inst, dt) {
  const { k, hero } = inst
  //
  // Note: Hero proximity detection is handled in the level scene
  // This function only handles state transitions and movement
  //
  if (inst.state === 'recovering') {
    //
    // Still recovering - count down timer
    // Body stays down during recovery, lifts only after recovery complete
    //
    inst.stateTimer -= dt
    
    if (inst.stateTimer <= 0) {
      //
      // Recovery complete - resume crawling with new direction
      //
      inst.state = 'crawling'
      inst.stateTimer = inst.crawlDuration
      //
      // Choose random direction
      //
      if (inst.surface === 'floor') {
        inst.movementAngle = Math.random() > 0.5 ? 0 : Math.PI
      } else if (inst.surface === 'leftWall' || inst.surface === 'rightWall') {
        inst.movementAngle = Math.random() > 0.5 ? -Math.PI / 2 : Math.PI / 2
      }
      inst.vx = Math.cos(inst.movementAngle) * inst.crawlSpeed
      inst.vy = Math.sin(inst.movementAngle) * inst.crawlSpeed
    }
  } else if (inst.state === 'crawling' || inst.state === 'stopping') {
    //
    // State machine for crawling behavior
    // Also lift body back up when crawling
    //
    if (inst.surface === 'floor' && inst.dropOffset > 0) {
      inst.dropOffset -= dt * 150
      if (inst.dropOffset < 0) inst.dropOffset = 0
    }
    
    inst.stateTimer -= dt
    
    if (inst.state === 'crawling') {
      if (inst.stateTimer <= 0) {
        //
        // Switch to stopping state
        //
        inst.state = 'stopping'
        inst.stateTimer = inst.stopDuration  // Use bug's unique duration
        inst.vx = 0
        inst.vy = 0
      }
    } else if (inst.state === 'stopping') {
      if (inst.stateTimer <= 0) {
        //
        // Switch to crawling with new random direction
        //
        inst.state = 'crawling'
        inst.stateTimer = inst.crawlDuration  // Use bug's unique duration
        
        if (inst.surface === 'floor') {
          //
          // Floor: randomly choose left or right
          //
          inst.movementAngle = Math.random() > 0.5 ? 0 : Math.PI
        } else if (inst.surface === 'leftWall' || inst.surface === 'rightWall') {
          //
          // Wall: randomly choose up or down
          //
          inst.movementAngle = Math.random() > 0.5 ? -Math.PI / 2 : Math.PI / 2
        }
        
        inst.vx = Math.cos(inst.movementAngle) * inst.crawlSpeed
        inst.vy = Math.sin(inst.movementAngle) * inst.crawlSpeed
      }
    }
    //
    // Update position if crawling
    //
    if (inst.state === 'crawling') {
      const newX = inst.x + inst.vx * dt
      const newY = inst.y + inst.vy * dt
      //
      // Check bounds and reverse direction if hitting edge
      //
      if (inst.bounds) {
        if (inst.surface === 'floor') {
          //
          // Floor: check left/right bounds
          //
          if (newX < inst.bounds.minX || newX > inst.bounds.maxX) {
            inst.movementAngle = inst.movementAngle === 0 ? Math.PI : 0
            inst.vx = Math.cos(inst.movementAngle) * inst.crawlSpeed
            inst.stateTimer = inst.crawlDuration  // Use bug's unique duration
          } else {
            inst.x = newX
          }
        } else if (inst.surface === 'leftWall' || inst.surface === 'rightWall') {
          //
          // Wall: check top/bottom bounds
          //
          if (newY < inst.bounds.minY || newY > inst.bounds.maxY) {
            inst.movementAngle = inst.movementAngle === -Math.PI / 2 ? Math.PI / 2 : -Math.PI / 2
            inst.vy = Math.sin(inst.movementAngle) * inst.crawlSpeed
            inst.stateTimer = inst.crawlDuration  // Use bug's unique duration
          } else {
            inst.y = newY
          }
        }
      } else {
        inst.x = newX
        inst.y = newY
      }
      
      const moveDist = Math.sqrt(inst.vx * inst.vx + inst.vy * inst.vy) * dt
      inst.distanceTraveled += moveDist
    }
  }
  //
  // Update legs (IK animation)
  //
  updateLegs(inst, dt)
}

/**
 * Update leg positions with IK
 * @param {Object} inst - Bug instance
 * @param {number} dt - Delta time
 */
function updateLegs(inst, dt) {
  const isScaredOrRecovering = inst.state === 'scared' || inst.state === 'recovering'
  const movementAngle = Math.atan2(inst.vy, inst.vx)
  const reach = (inst.legLength1 + inst.legLength2) * inst.scale
  //
  // Leg stepping sequence
  // For 2 legs: alternating (0 -> 1 -> 0 -> 1)
  // For 4 legs: diagonal gait (3 -> 0 -> 2 -> 1)
  //
  const stepSequence = inst.legCount === 2 ? [0, 1] : [3, 0, 2, 1]
  const currentStep = Math.floor(inst.distanceTraveled / (STEP_DISTANCE * 0.5)) % stepSequence.length
  
  inst.legs.forEach((leg, i) => {
    if (isScaredOrRecovering) {
      //
      // Pull legs close to body when scared or recovering
      //
      const pullAngle = leg.baseAngle
      const pullFactor = 0.3
      leg.footX = inst.x + Math.cos(pullAngle) * reach * pullFactor
      leg.footY = inst.y + Math.sin(pullAngle) * reach * pullFactor
    } else {
      //
      // Normal walking - procedural IK stepping with diagonal gait
      // Legs maintain their direction relative to surface
      //
      let idealX, idealY
      
      if (inst.surface === 'floor') {
        //
        // Floor bugs: all legs land on the same horizontal line (floor level)
        // Body position adjusted by dropOffset when scared
        //
        const floorY = inst.y + reach * inst.legDropFactor - inst.dropOffset  // Floor line moves up when body drops
        const bodyRadius = inst.scale * BUG_BODY_SIZE * 1.5 * 0.9
        
        if (inst.legCount === 2) {
          //
          // 2 legs: one left, one right (indices 0 = left, 1 = right)
          //
          const legSideOffset = reach * 0.8 * inst.legSpreadFactor
          idealX = i === 0 ? inst.x - legSideOffset : inst.x + legSideOffset
        } else {
          //
          // 4 legs: determine which legs are front/back based on movement direction
          //
          const movingRight = inst.vx > 0
          let isFrontLeg, isBackLeg
          
          if (movingRight) {
            // Moving right: legs 2,3 are front, 0,1 are back
            isFrontLeg = (i === 2 || i === 3)
            isBackLeg = (i === 0 || i === 1)
          } else {
            // Moving left: legs 0,1 are front, 2,3 are back
            isFrontLeg = (i === 0 || i === 1)
            isBackLeg = (i === 2 || i === 3)
          }
          //
          // Body front and back edges
          //
          const bodyFrontX = movingRight ? inst.x + bodyRadius : inst.x - bodyRadius
          const bodyBackX = movingRight ? inst.x - bodyRadius : inst.x + bodyRadius
          
          if (isFrontLeg) {
            //
            // Front legs: must stay ahead of body front edge
            //
            const minFrontDistance = reach * 0.6 * inst.legSpreadFactor
            idealX = bodyFrontX + (movingRight ? minFrontDistance : -minFrontDistance)
          } else if (isBackLeg) {
            //
            // Back legs: position near center of body (not back edge!)
            // This keeps them closer and makes them step more frequently
            //
            const backLegOffset = reach * 0.4 * inst.legSpreadFactor
            idealX = inst.x + (movingRight ? -backLegOffset : backLegOffset)
          }
        }
        
        idealY = floorY  // Same Y for all legs on floor
        
      } else {
        //
        // Wall bugs: legs maintain angle towards wall
        //
        const adjustedAngle = leg.baseAngle + Math.atan2(inst.vy, inst.vx) * 0.1
        idealX = inst.x + Math.cos(adjustedAngle) * reach * 0.7
        idealY = inst.y + Math.sin(adjustedAngle) * reach * 0.7
      }
      
      const footDx = idealX - leg.footX
      const footDy = idealY - leg.footY
      const footDist = Math.sqrt(footDx * footDx + footDy * footDy)
      //
      // Check if leg needs to step (diagonal gait sequence)
      // Back legs step much earlier to avoid dragging
      //
      const isBackLeg = (inst.vx > 0 && (i === 0 || i === 1)) || (inst.vx < 0 && (i === 2 || i === 3))
      const stepThreshold = isBackLeg ? STEP_DISTANCE * inst.scale * 0.25 : STEP_DISTANCE * inst.scale
      
      if (!leg.isStepping && footDist > stepThreshold) {
        //
        // Find position of this leg in step sequence
        //
        const legPositionInSequence = stepSequence.indexOf(i)
        //
        // Check if it's this leg's turn to step
        //
        const shouldStep = legPositionInSequence === currentStep
        
        if (shouldStep) {
          leg.isStepping = true
          leg.stepProgress = 0
          leg.stepStartX = leg.footX
          leg.stepStartY = leg.footY
          leg.targetFootX = idealX
          leg.targetFootY = idealY
        }
      }
      //
      // Animate stepping
      //
      if (leg.isStepping) {
        leg.stepProgress += dt * STEP_SPEED
        if (leg.stepProgress >= 1) {
          leg.stepProgress = 1
          leg.isStepping = false
          leg.footX = leg.targetFootX
          leg.footY = leg.targetFootY
        } else {
          //
          // Interpolate with arc
          //
          const t = leg.stepProgress
          const arcHeight = 2 * inst.scale
          const arc = Math.sin(t * Math.PI) * arcHeight
          leg.footX = leg.stepStartX + (leg.targetFootX - leg.stepStartX) * t
          leg.footY = leg.stepStartY + (leg.targetFootY - leg.stepStartY) * t - arc
        }
      }
    }
  })
}

/**
 * Draw bug with IK legs
 * @param {Object} inst - Bug instance
 */
export function draw(inst) {
  const { k, pattern } = inst
  //
  // Draw body as semicircle (top half of circle) FIRST
  //
  const bodyRgb = getRGB(k, pattern.bodyColor)
  //
  // Calculate body orientation based on surface
  //
  let bodyRotation
  if (inst.surface === 'floor') {
    bodyRotation = 0  // Flat on floor, rounded top
  } else if (inst.surface === 'leftWall') {
    bodyRotation = Math.PI / 2  // Against left wall
  } else {
    bodyRotation = Math.PI / 2  // Against right wall
  }
  //
  // Draw semicircle body (top half of circle)
  //
  const radius = BUG_BODY_SIZE * 1.5 * inst.scale
  const segments = 20  // Number of segments for smooth curve
  //
  // Apply dropOffset to body Y position when drawing
  //
  const bodyY = inst.y + inst.dropOffset
  
  k.pushTransform()
  k.pushTranslate(inst.x, bodyY)
  k.pushRotate(bodyRotation)
  
  if (inst.bodyShape === 'circle') {
    //
    // Draw full circle body
    //
    if (inst.showOutline) {
      k.drawCircle({
        pos: k.vec2(0, 0),
        radius: radius + 2,
        color: k.rgb(0, 0, 0),
        opacity: 1
      })
    }
    k.drawCircle({
      pos: k.vec2(0, 0),
      radius: radius,
      color: k.rgb(bodyRgb.r, bodyRgb.g, bodyRgb.b),
      opacity: 1
    })
  } else {
    //
    // Create points for semicircle (top half)
    // Start from left (-radius, 0), curve up, end at right (radius, 0)
    //
    const points = []
    for (let i = 0; i <= segments; i++) {
      const angle = Math.PI + (Math.PI * i / segments)  // From PI to 2*PI (top half)
      const x = Math.cos(angle) * radius
      const y = Math.sin(angle) * radius
      points.push(k.vec2(x, y))
    }
    //
    // Draw black outline semicircle (thicker) - only if showOutline is true
    //
    if (inst.showOutline) {
      const outlinePoints = []
      for (let i = 0; i <= segments; i++) {
        const angle = Math.PI + (Math.PI * i / segments)
        const x = Math.cos(angle) * (radius + 2)
        const y = Math.sin(angle) * (radius + 2)
        outlinePoints.push(k.vec2(x, y))
      }
      k.drawPolygon({
        pts: outlinePoints,
        color: k.rgb(0, 0, 0),
        opacity: 1
      })
    }
    //
    // Draw main body semicircle
    //
    k.drawPolygon({
      pts: points,
      color: k.rgb(bodyRgb.r, bodyRgb.g, bodyRgb.b),
      opacity: 1
    })
  }
  //
  // Draw eye
  //
  if (inst.bodyShape === 'circle') {
    //
    // For circle body: draw one large eye in center that follows hero
    //
    const eyeRadius = BUG_BODY_SIZE * 0.8 * inst.scale
    const pupilRadius = BUG_BODY_SIZE * 0.2 * inst.scale
    const maxPupilOffset = eyeRadius * 0.4
    //
    // Calculate direction to hero
    //
    const heroX = inst.hero.character.pos.x
    const heroY = inst.hero.character.pos.y
    const dx = heroX - inst.x
    const dy = heroY - (inst.y + inst.dropOffset)
    const dist = Math.sqrt(dx * dx + dy * dy)
    //
    // Calculate pupil position
    //
    let pupilOffsetX = 0
    let pupilOffsetY = 0
    if (dist > 0) {
      pupilOffsetX = (dx / dist) * maxPupilOffset
      pupilOffsetY = (dy / dist) * maxPupilOffset
    }
    //
    // Draw white eye
    //
    k.drawCircle({
      pos: k.vec2(0, 0),
      radius: eyeRadius,
      color: k.rgb(255, 255, 255),
      opacity: 1
    })
    //
    // Draw black pupil
    //
    k.drawCircle({
      pos: k.vec2(pupilOffsetX, pupilOffsetY),
      radius: pupilRadius,
      color: k.rgb(0, 0, 0),
      opacity: 1
    })
  } else {
    //
    // For semicircle body: draw eye on the side of movement direction
    //
    const isMovingRight = inst.vx > 0
    const isMovingLeft = inst.vx < 0
    
    if (isMovingRight || isMovingLeft) {
      const eyeRadius = BUG_BODY_SIZE * 0.3 * inst.scale
      const pupilRadius = BUG_BODY_SIZE * 0.15 * inst.scale
      //
      // Position eye on the side of movement
      //
      const eyeX = isMovingRight ? radius * 0.6 : -radius * 0.6
      const eyeY = -radius * 0.4
      //
      // Draw white eye
      //
      k.drawCircle({
        pos: k.vec2(eyeX, eyeY),
        radius: eyeRadius,
        color: k.rgb(255, 255, 255),
        opacity: 1
      })
      //
      // Draw black pupil
      //
      k.drawCircle({
        pos: k.vec2(eyeX, eyeY),
        radius: pupilRadius,
        color: k.rgb(0, 0, 0),
        opacity: 1
      })
    }
  }
  
  k.popTransform()
  //
  // Draw legs AFTER body (on top of body)
  // Legs attach to the front and back edges of the semicircle
  //
  const legColor = getRGB(k, pattern.bodyColor)  // Same color as body
  //
  // Calculate attachment points on body edges
  // For floor: front = left edge, back = right edge (considering body rotation)
  //
  const attachmentOffset = radius * 0.9  // Attach near the edges
  
  inst.legs.forEach((leg, i) => {
    //
    // Calculate leg attachment point (not center, but on edge of body)
    //
    let attachX, attachY
    
    if (inst.surface === 'floor') {
      //
      // For floor bugs: 
      // Back legs (0, 1) attach to left side
      // Front legs (2, 3) attach to right side
      // Apply dropOffset to Y position
      //
      const bodyY = inst.y + inst.dropOffset
      if (i === 0 || i === 1) {
        // Back legs (left side)
        attachX = inst.x - attachmentOffset
        attachY = bodyY
      } else {
        // Front legs (right side)
        attachX = inst.x + attachmentOffset
        attachY = bodyY
      }
    } else if (inst.surface === 'leftWall') {
      //
      // For left wall bugs: legs attach to top and bottom
      //
      if (i === 0 || i === 1) {
        // Top legs
        attachX = inst.x
        attachY = inst.y - attachmentOffset
      } else {
        // Bottom legs
        attachX = inst.x
        attachY = inst.y + attachmentOffset
      }
    } else {
      //
      // For right wall bugs: legs attach to top and bottom
      //
      if (i === 0 || i === 1) {
        // Top legs
        attachX = inst.x
        attachY = inst.y - attachmentOffset
      } else {
        // Bottom legs
        attachX = inst.x
        attachY = inst.y + attachmentOffset
      }
    }
    
    const { jointX, jointY } = solveIK(
      attachX, attachY,
      leg.footX, leg.footY,
      inst.legLength1 * inst.scale, inst.legLength2 * inst.scale,
      leg.side
    )
    
    const actualLegThickness = LEG_THICKNESS * inst.legThickness
    //
    // Draw outline (thicker black line) - only if showOutline is true
    //
    if (inst.showOutline) {
      k.drawLine({
        p1: k.vec2(attachX, attachY),
        p2: k.vec2(jointX, jointY),
        width: actualLegThickness + 1,
        color: k.rgb(0, 0, 0),
        opacity: 1
      })
      k.drawLine({
        p1: k.vec2(jointX, jointY),
        p2: k.vec2(leg.footX, leg.footY),
        width: actualLegThickness + 1,
        color: k.rgb(0, 0, 0),
        opacity: 1
      })
    }
    //
    // Draw main leg (using body color)
    //
    k.drawLine({
      p1: k.vec2(attachX, attachY),
      p2: k.vec2(jointX, jointY),
      width: actualLegThickness,
      color: k.rgb(legColor.r, legColor.g, legColor.b),
      opacity: 1
    })
    k.drawLine({
      p1: k.vec2(jointX, jointY),
      p2: k.vec2(leg.footX, leg.footY),
      width: actualLegThickness,
      color: k.rgb(legColor.r, legColor.g, legColor.b),
      opacity: 1
    })
    //
    // Draw small circle at joint (knee) - only if showOutline is true
    //
    if (inst.showOutline) {
      k.drawCircle({
        pos: k.vec2(jointX, jointY),
        radius: 1,
        color: k.rgb(legColor.r, legColor.g, legColor.b),
        opacity: 1
      })
    }
  })
}

/**
 * Solves inverse kinematics for a 2-segment leg
 * @param {number} baseX - Base X (body position)
 * @param {number} baseY - Base Y (body position)
 * @param {number} targetX - Target X (foot position)
 * @param {number} targetY - Target Y (foot position)
 * @param {number} len1 - Length of first segment
 * @param {number} len2 - Length of second segment
 * @param {number} side - Side of the leg (-1 left, 1 right)
 * @returns {Object} Joint position { jointX, jointY }
 */
function solveIK(baseX, baseY, targetX, targetY, len1, len2, side) {
  //
  // Distance from base to target
  //
  const dx = targetX - baseX
  const dy = targetY - baseY
  let dist = Math.sqrt(dx * dx + dy * dy)
  //
  // Clamp distance to reachable range
  //
  const maxReach = len1 + len2 - 0.1
  const minReach = Math.abs(len1 - len2) + 0.1
  dist = Math.max(minReach, Math.min(maxReach, dist))
  //
  // Use law of cosines to find angles
  //
  const angleToTarget = Math.atan2(dy, dx)
  //
  // Angle at base joint
  //
  const cosAngle1 = (dist * dist + len1 * len1 - len2 * len2) / (2 * dist * len1)
  const angle1 = Math.acos(Math.max(-1, Math.min(1, cosAngle1)))
  //
  // Calculate joint position
  // Side determines which way the joint bends
  //
  const jointAngle = angleToTarget + angle1 * side
  const jointX = baseX + Math.cos(jointAngle) * len1
  const jointY = baseY + Math.sin(jointAngle) * len1
  
  return { jointX, jointY }
}
