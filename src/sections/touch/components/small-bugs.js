import { CFG } from '../cfg.js'
import { getRGB } from '../../../utils/helper.js'
//
// Small bug parameters
//
const BUG_BODY_SIZE = 6
const LEG_LENGTH_1 = 8  // First segment length
const LEG_LENGTH_2 = 7  // Second segment length
const LEG_THICKNESS = 1.5
const CRAWL_SPEED = 60  // Crawling speed (faster movement)
const CRAWL_DURATION = 8.0  // Time to crawl before stopping
const STOP_DURATION = 2.0  // Pause duration before changing direction
const STEP_SPEED = 8.0  // How fast legs step (increased for better sync at high speeds)
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
 * Creates a small bug with IK legs (for small bugs and debug bug)
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
 * @param {number} [config.targetFloorY] - Target floor Y position
 * @param {boolean} [config.isDebugBug=false] - Whether this is a debug bug
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
    zIndex = 8,  // Above all trees (trees are z=2 and z=7), below player (z=10)
    showOutline = true,
    legThickness = 1.0,
    bodyShape = 'semicircle',
    legCount = 4,
    targetFloorY = null,
    isDebugBug = false
  } = config
  //
  // All bugs now use 4 legs with horse-like gait
  //
  const finalLegCount = 4
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
    
    //
    // All bugs now use 4 legs with same angles
    // Indices: 0 = left front, 1 = right front, 2 = left back, 3 = right back
    //
    legAngles = [
      Math.PI * 0.25,   // Left front leg (forward-down-left)
      Math.PI * 0.25,   // Right front leg (forward-down-right)
      Math.PI * 0.75,   // Left back leg (backward-down-left)
      Math.PI * 0.75    // Right back leg (backward-down-right)
    ]
  }
  //
  // Create legs based on legCount
  //
  
  const legs = legAngles.map((baseAngle, i) => {
    //
    // IK bending direction:
    // For 4 legs: Front legs (0, 1): bend forward (side = 1), Back legs (2, 3): bend backward (side = -1)
    // For 2 legs: Left leg (i=0) bends right (outward), Right leg (i=1) bends left (outward)
    //
    let side
    if (finalLegCount === 2) {
      side = i === 0 ? 1 : -1
    } else if (finalLegCount === 4) {
      side = (i === 0 || i === 1) ? 1 : -1  // Front legs (0, 1) bend forward, back legs (2, 3) bend backward
    } else {
      side = i < 2 ? -1 : 1
    }
    const reach = (legLength1 + legLength2) * scale
    
    //
    // Initialize all legs on the same floor line
    //
    let footX, footY
    if (surface === 'floor') {
      //
      // All legs start on same horizontal line (floor)
      // For bugs with targetFloorY, use targetFloorY directly
      // Otherwise calculate floorY relative to body position
      //
      const isSmallBug = (legLength1 + legLength2) < 5
      const bodyRadiusForInit = BUG_BODY_SIZE * 1.5 * scale * 0.9
      //
      // For bugs with targetFloorY, use it directly without restrictions
      // Otherwise calculate floorY relative to body position
      //
      let finalFloorY
      if (targetFloorY !== null) {
        //
        // Use targetFloorY directly - it's already calculated to ensure legs touch floor
        //
        finalFloorY = targetFloorY
      } else {
        //
        // Calculate floorY relative to body position using full legDropFactor
        //
        const floorY = y + reach * legDropFactor
        //
        // Ensure floorY is below body (legs go down)
        // Use smaller minimum for small bugs to allow longer legs
        //
        const minFloorY = isSmallBug
          ? y + bodyRadiusForInit * 0.1  // Smaller minimum for small bugs
          : y + bodyRadiusForInit * 0.3  // Normal minimum for large bugs
        finalFloorY = Math.max(floorY, minFloorY)
      }
      
      if (finalLegCount === 4) {
        //
        // All bugs now use 4 legs: front and back positioning
        // Indices: 0 = left front, 1 = right front, 2 = left back, 3 = right back
        //
        const legOffset = isSmallBug ? 0.05 : 0.15
        if (i === 0 || i === 1) {
          // Front legs (indices 0, 1) - just ahead of body front
          footX = x + bodyRadiusForInit * legOffset
        } else {
          // Back legs (indices 2, 3) - just behind body back
          footX = x - bodyRadiusForInit * legOffset
        }
        
        footY = finalFloorY  // Same Y for all legs
      } else if (finalLegCount === 2) {
        //
        // 2 legs: place them on left and right sides
        //
        const legSideOffset = isSmallBug
          ? bodyRadiusForInit * 0.4 * legSpreadFactor  // Much smaller offset for small bugs
          : reach * 0.8 * legSpreadFactor  // Normal offset for large bugs
        if (i === 0) {
          // Left leg
          footX = x - legSideOffset
        } else {
          // Right leg
          footX = x + legSideOffset
        }
        
        footY = finalFloorY  // Same Y for all legs (touch floor)
      } else {
        //
        // Default positioning for other leg counts
        //
        footX = x
        footY = finalFloorY
      }
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
      stepStartY: footY,
      index: i  // Store leg index for emergency stepping
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
    legCount: finalLegCount,  // Store for number of legs (ensure 4 for debug bugs)
    targetFloorY,    // Store for target floor Y position
    isDebugBug,      // Store for debug bug flag
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
    stepDistance: 0,  // Distance traveled for stepping sequence
    movementAngle: angle,
    dropOffset: 0,  // How much body has dropped when scared
    isMother: false  // Small bugs are not mothers
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
  // Bugs in pyramid don't update movement, but legs need to be updated
  // to prevent them from being pulled in (scared state)
  //
  if (inst.state === 'pyramid') {
    //
    // Reset dropOffset for bugs in pyramid (body should be in normal position)
    //
    inst.dropOffset = 0
    //
    // Update legs for bugs in pyramid (keep legs in normal position)
    //
    updateLegs(inst, dt)
    return
  }
  
  if (inst.state === 'recovering') {
    //
    // Still recovering - count down timer
    // Body stays down during recovery, lifts only after recovery complete
    //
    inst.stateTimer -= dt
    
    if (inst.stateTimer <= 0) {
      //
      // Recovery complete - resume crawling
      //
      inst.state = 'crawling'
      inst.stateTimer = inst.crawlDuration
      //
      // Small bugs keep their escape direction
      //
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
    //
    // Debug bugs always crawl and never stop or bounce
    // Small bugs always stay in crawling state, never stop
    //
    if (inst.isDebugBug) {
      //
      // Debug bugs: always stay in crawling state, never stop
      //
      inst.state = 'crawling'
      if (inst.vx === 0 && inst.vy === 0) {
        //
        // Ensure debug bugs always have velocity
        //
        inst.vx = Math.cos(inst.movementAngle) * inst.crawlSpeed
        inst.vy = Math.sin(inst.movementAngle) * inst.crawlSpeed
      }
    } else {
      //
      // Small bugs: always stay in crawling state, never stop
      // If they're in stopping state, immediately switch to crawling with movement
      //
      if (inst.state === 'stopping') {
        inst.state = 'crawling'
        //
        // Ensure small bugs always have velocity
        //
        if (inst.vx === 0 && inst.vy === 0) {
          //
          // Restore velocity based on current movement angle
          //
          inst.vx = Math.cos(inst.movementAngle) * inst.crawlSpeed
          inst.vy = Math.sin(inst.movementAngle) * inst.crawlSpeed
        }
      }
    }
    //
    // Handle scattering state (after pyramid destruction)
    //
    if (inst.isScattering) {
      inst.scatterTimer -= dt
      if (inst.scatterTimer <= 0) {
        inst.isScattering = false
      }
    }
    
    //
    // Update position if crawling
    //
    if (inst.state === 'crawling') {
      //
      // Ensure small bugs always have velocity
      //
      if (inst.vx === 0 && inst.vy === 0) {
        inst.vx = Math.cos(inst.movementAngle) * inst.crawlSpeed
        inst.vy = Math.sin(inst.movementAngle) * inst.crawlSpeed
      }
      
      const newX = inst.x + inst.vx * dt
      const newY = inst.y + inst.vy * dt
      //
      // Check bounds and reverse direction if hitting edge
      // Debug bugs continue moving without bouncing
      //
      if (inst.isDebugBug) {
        //
        // Debug bugs: continue moving without bounds check
        //
        inst.x = newX
        inst.y = newY
      } else if (inst.bounds) {
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
      //
      // Update step distance counter for stepping sequence
      //
      inst.stepDistance += moveDist
    }
  }
  //
  // Update legs (IK animation)
  //
  updateLegs(inst, dt)
}

/**
 * Update leg positions using IK with horse-like diagonal gait
 * Based on horse trot animation (frames 1-12)
 * @param {Object} inst - Bug instance
 * @param {number} dt - Delta time
 */
function updateLegs(inst, dt) {
  //
  // All bugs with 4 legs use horse-like diagonal gait
  //
  if (inst.legCount !== 4) return
  
  const reach = (inst.legLength1 + inst.legLength2) * inst.scale
  const bodyRadius = inst.scale * BUG_BODY_SIZE * 1.5 * 0.9
  const targetFloorY = inst.targetFloorY || (inst.y + reach * inst.legDropFactor)
  
  //
  // Determine direction and body edges
  //
  const movingRight = inst.vx > 0
  const movingLeft = inst.vx < 0
  //
  // Reset step sequence when direction changes
  //
  if (inst.lastDirection === undefined) {
    inst.lastDirection = movingRight ? 'right' : (movingLeft ? 'left' : 'none')
  }
  const currentDirection = movingRight ? 'right' : (movingLeft ? 'left' : 'none')
  if (currentDirection !== inst.lastDirection && currentDirection !== 'none') {
    inst.lastStepIndex = -1  // Reset sequence on direction change
    inst.lastDirection = currentDirection
  }
  
  const bodyFrontX = movingRight ? inst.x + bodyRadius : inst.x - bodyRadius
  const bodyBackX = movingRight ? inst.x - bodyRadius : inst.x + bodyRadius
  
  inst.legs.forEach((leg, i) => {
    //
    // Classify leg: 0 = left front, 1 = right front, 2 = left back, 3 = right back
    //
    const isFrontLeg = (i === 0 || i === 1)
    const isLeftLeg = (i === 0 || i === 2)
    
    //
    // Calculate ideal foot position
    // Attachment point + step forward + side offset
    // Front legs step forward from front, back legs step moderately forward
    //
    const attachX = isFrontLeg ? bodyFrontX : bodyBackX
    //
    // Front legs: step 20% of reach forward
    // Back legs: step 40% of reach forward (was 60%, reduced for better look)
    //
    const stepForward = isFrontLeg ? reach * 0.2 : reach * 0.4
    const sideOffset = bodyRadius * 0.15 * (isLeftLeg ? -1 : 1)  // Left/right offset
    
    let idealX
    if (movingRight) {
      idealX = attachX + stepForward + sideOffset
    } else if (movingLeft) {
      idealX = attachX - stepForward + sideOffset
    } else {
      idealX = attachX + stepForward + sideOffset
    }
    
    const idealY = targetFloorY
    
    //
    // Calculate distance to ideal position
    //
    const dx = idealX - leg.footX
    const dy = idealY - leg.footY
    const dist = Math.sqrt(dx * dx + dy * dy)
    
    //
    // Check if leg should step
    // Only one leg at a time, diagonal sequence: [1, 2, 0, 3]
    // Adjust threshold based on scale to work with both small and debug bugs
    //
    if (!leg.isStepping) {
      const anyLegStepping = inst.legs.some(l => l.isStepping)
      
      //
      // Force step if leg is stretched too far (emergency step)
      // This prevents legs from dragging behind at high speeds
      //
      const emergencyThreshold = reach * 0.4  // Force step if stretched > 40%
      const forceStep = dist > emergencyThreshold
      
      if (!anyLegStepping || forceStep) {
        const stepSequence = movingLeft ? [0, 3, 1, 2] : [1, 2, 0, 3]
        //
        // Initialize lastStepIndex if not set or invalid
        //
        if (inst.lastStepIndex === undefined || inst.lastStepIndex === null || inst.lastStepIndex < -1) {
          inst.lastStepIndex = -1
        }
        //
        // Determine next leg in sequence (cycles through 0,1,2,3)
        //
        const nextStepIndex = (inst.lastStepIndex + 1) % 4
        const shouldStepLeg = stepSequence[nextStepIndex]
        //
        // Use very small threshold: 5% of reach
        // This ensures legs step frequently and stay synchronized
        //
        const stepThreshold = reach * 0.05
        
        //
        // Step if: it's this leg's turn AND threshold met, OR emergency step needed
        //
        if ((i === shouldStepLeg && dist > stepThreshold) || (forceStep && i === leg.index)) {
          inst.lastStepIndex = nextStepIndex
          leg.isStepping = true
          leg.stepProgress = 0
          leg.stepStartX = leg.footX
          leg.stepStartY = leg.footY
          leg.targetFootX = idealX
          leg.targetFootY = idealY
        }
      }
    }
    
    //
    // Animate step with high arc (like horse)
    //
    if (leg.isStepping) {
      leg.stepProgress += dt * STEP_SPEED
      
      if (leg.stepProgress >= 1) {
        leg.stepProgress = 1
        leg.isStepping = false
        leg.footX = idealX
        leg.footY = idealY
      } else {
        const t = leg.stepProgress
        const arcHeight = reach * 0.35  // 35% of leg reach - высокий подъём как у лошади
        const arc = Math.sin(t * Math.PI) * arcHeight
        
        leg.footX = leg.stepStartX + (idealX - leg.stepStartX) * t
        leg.footY = leg.stepStartY + (idealY - leg.stepStartY) * t - arc
      }
    }
    //
    // No pulling when not stepping - let legs stay in place until next step
    //
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
    const heroX = inst.hero?.character?.pos.x ?? inst.x
    const heroY = inst.hero?.character?.pos.y ?? inst.y
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
    // Draw round eye
    //
    k.drawCircle({
      pos: k.vec2(0, 0),
      radius: eyeRadius,
      color: k.rgb(180, 180, 180),
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
      // Draw gray eye
      //
      k.drawCircle({
        pos: k.vec2(eyeX, eyeY),
        radius: eyeRadius,
        color: k.rgb(180, 180, 180),
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
  // For 6 legs: draw back legs (4, 5) first (further from viewer), then middle (2, 3), then front (0, 1)
  //
  const legColor = getRGB(k, pattern.bodyColor)  // Same color as body
  //
  // Calculate attachment points on body edges
  // For floor: front = left edge, back = right edge (considering body rotation)
  //
  const attachmentOffset = radius * 0.9  // Attach near the edges
  //
  // For 4 legs: draw back legs first, then front legs
  //
  let legDrawOrder
  if (inst.legCount === 4) {
    //
    // Draw order: back legs (2, 3) first, then front legs (0, 1)
    //
    legDrawOrder = [2, 3, 0, 1]
  } else {
    //
    // For other leg counts, draw in order
    //
    legDrawOrder = inst.legs.map((_, i) => i)
  }
  
  legDrawOrder.forEach((legIndex) => {
    const leg = inst.legs[legIndex]
    const i = legIndex
    //
    // Calculate leg attachment point (not center, but on edge of body)
    //
    let attachX, attachY
    
    if (inst.surface === 'floor') {
      //
      // For floor bugs: 
      // For 4 legs: front legs (0, 1) attach at front, back legs (2, 3) attach at back
      // For 2 legs: leg 0 attaches to left side, leg 1 attaches to right side
      // Apply dropOffset to Y position
      //
      const bodyY = inst.y + inst.dropOffset
      const radius = BUG_BODY_SIZE * 1.5 * inst.scale
      
      if (inst.legCount === 4) {
        //
        // 4 legs: front legs (0, 1) attach at front, back legs (2, 3) attach at back
        // Determine front/back based on movement direction
        //
        const movingRight = inst.vx > 0
        const movingLeft = inst.vx < 0
        const bodyFrontX = movingRight ? inst.x + attachmentOffset : (movingLeft ? inst.x - attachmentOffset : inst.x + attachmentOffset)
        const bodyBackX = movingRight ? inst.x - attachmentOffset : (movingLeft ? inst.x + attachmentOffset : inst.x - attachmentOffset)
        
        if (i === 0 || i === 1) {
          // Front legs (0, 1) - both attach at same front point
          attachX = bodyFrontX
          attachY = bodyY
        } else {
          // Back legs (2, 3) - both attach at same back point
          attachX = bodyBackX
          attachY = bodyY
        }
      } else if (inst.legCount === 2) {
        //
        // 2 legs: one on left, one on right
        //
        if (i === 0) {
          // Left leg
          attachX = inst.x - attachmentOffset
          attachY = bodyY
        } else {
          // Right leg
          attachX = inst.x + attachmentOffset
          attachY = bodyY
        }
      } else {
        //
        // Default: attach at body center
        //
        attachX = inst.x
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

