import { CFG } from '../cfg.js'
import { getRGB } from '../../../utils/helper.js'
//
// Bug parameters
//
const BUG_BODY_SIZE = 6
const LEG_COUNT = 4  // 4 legs (2 per side)
const LEG_LENGTH_1 = 8  // First segment length
const LEG_LENGTH_2 = 7  // Second segment length
const LEG_THICKNESS = 1.5
const DETECTION_RADIUS = 60  // Detection distance - bugs hide when hero approaches
const CRAWL_SPEED = 60  // Crawling speed (faster movement)
const CRAWL_DURATION = 8.0  // Time to crawl before stopping
const STOP_DURATION = 2.0  // Pause duration before changing direction
const STEP_DISTANCE = 40  // Distance to trigger leg step (longer steps)
const STEP_SPEED = 1.5  // How fast legs step (much slower for more inertia)
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
    zIndex = 8,  // Above all trees (trees are z=2 and z=7), below player (z=10)
    showOutline = true,
    legThickness = 1.0,
    bodyShape = 'semicircle',
    legCount = 4,
    hasUpwardLegs = false,
    targetFloorY = null,
    isDebugBug = false
  } = config
  //
  // Ensure debug bugs always have 4 legs
  //
  const finalLegCount = isDebugBug ? 4 : legCount
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
    // Check if this bug has upward legs (legs go up from sides first, then down)
    //
    const hasUpwardLegs = config.hasUpwardLegs || false
    
    //
    // For debug bugs, always create 4 legs
    //
    if (isDebugBug) {
      //
      // 4 legs: 2 front (pointing forward-down), 2 back (pointing backward-down)
      // Indices: 0 = left front, 1 = right front, 2 = left back, 3 = right back
      //
      legAngles = [
        Math.PI * 0.25,   // Left front leg (forward-down-left)
        Math.PI * 0.25,   // Right front leg (forward-down-right)
        Math.PI * 0.75,   // Left back leg (backward-down-left)
        Math.PI * 0.75    // Right back leg (backward-down-right)
      ]
    } else if (finalLegCount === 2) {
      if (hasUpwardLegs) {
        //
        // 2 legs with upward bend: start from sides going up, then down
        // Left leg: goes up-left first, then down
        // Right leg: goes up-right first, then down
        //
        legAngles = [
          Math.PI * 0.75,   // Left leg (up-left, then curves down)
          Math.PI * 0.25    // Right leg (up-right, then curves down)
        ]
      } else {
        //
        // 2 legs: one on left side, one on right side (far apart)
        //
        legAngles = [
          Math.PI * 0.5,   // Left leg (straight down-left)
          Math.PI * 0.5    // Right leg (straight down-right)
        ]
      }
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
    // For 2 legs: Left leg (i=0) bends right (outward), Right leg (i=1) bends left (outward)
    //
    const side = finalLegCount === 2 ? (i === 0 ? 1 : -1) : (i < 2 ? -1 : 1)
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
      const hasUpwardLegs = config.hasUpwardLegs || false
      const targetFloorY = config.targetFloorY || null
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
      
        if (finalLegCount === 2) {
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
          
          //
          // For bugs with upward legs, legs still touch the floor
          // They go up from sides first, then curve down to the floor
          //
          footY = finalFloorY  // Same Y for all legs (touch floor)
        } else {
        //
        // 4 legs: front and back positioning - very close to body
        //
        const legOffset = isSmallBug ? 0.05 : 0.15  // Much closer for small bugs
        if (i === 2 || i === 3) {
          // Front legs (indices 2, 3) - just ahead of body front
          footX = x + bodyRadiusForInit * legOffset
        } else {
          // Back legs (indices 0, 1) - just behind body back
          footX = x - bodyRadiusForInit * legOffset
        }
        
        footY = finalFloorY  // Same Y for all legs
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
    legCount: finalLegCount,  // Store for number of legs (ensure 4 for debug bugs)
    hasUpwardLegs,   // Store for upward legs flag
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
    lastSteppedLeg: -1  // Track which leg stepped last (for 2-leg bugs)
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
      // Small bugs keep their escape direction, big bugs choose random direction
      //
      const isSmallBug = inst.isMother === false
      if (isSmallBug) {
        //
        // Small bugs: continue in escape direction (already set when escaping)
        //
        inst.vx = Math.cos(inst.movementAngle) * inst.crawlSpeed
        inst.vy = Math.sin(inst.movementAngle) * inst.crawlSpeed
      } else {
        //
        // Big bugs: choose random direction
        //
        if (inst.surface === 'floor') {
          inst.movementAngle = Math.random() > 0.5 ? 0 : Math.PI
        } else if (inst.surface === 'leftWall' || inst.surface === 'rightWall') {
          inst.movementAngle = Math.random() > 0.5 ? -Math.PI / 2 : Math.PI / 2
        }
        inst.vx = Math.cos(inst.movementAngle) * inst.crawlSpeed
        inst.vy = Math.sin(inst.movementAngle) * inst.crawlSpeed
      }
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
    // Small bugs (isMother === false) don't change direction by timer, only bounce off walls
    // Big bugs (isMother === true) use timer-based direction changes
    // Debug bugs always crawl and never stop or bounce
    //
    const isSmallBug = inst.isMother === false
    
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
    } else if (!isSmallBug) {
      //
      // Big bugs: use timer-based state machine
      //
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
      const isSmallBug = inst.isMother === false
      if (isSmallBug && inst.vx === 0 && inst.vy === 0) {
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
 * Update leg positions with IK
 * @param {Object} inst - Bug instance
 * @param {number} dt - Delta time
 */
function updateLegs(inst, dt) {
  const isScaredOrRecovering = inst.state === 'scared' || inst.state === 'recovering'
  const movementAngle = Math.atan2(inst.vy, inst.vx)
  const reach = (inst.legLength1 + inst.legLength2) * inst.scale
  // Debug bugs should use small bug logic for leg positioning (bent knees)
  const isSmallBug = (inst.legLength1 + inst.legLength2) < 5 || inst.isDebugBug
  //
  // Calculate step size based on movement speed
  // Step size should be synchronized with body movement speed
  // Use smaller step size to ensure legs step more frequently and stay synchronized
  //
  const movementSpeed = Math.sqrt(inst.vx * inst.vx + inst.vy * inst.vy)
  //
  // For large bugs with 2 legs: use moderate step size for sequential stepping
  // For other bugs: use smaller step size for better sync
  //
  const isLargeBugWith2Legs = !isSmallBug && inst.legCount === 2
  const stepSize = isLargeBugWith2Legs
    ? (movementSpeed > 0 ? reach * 0.8 : reach * 0.6)  // Moderate step size for sequential stepping
    : (movementSpeed > 0 ? reach * 0.25 : reach * 0.2)  // Smaller step size for better sync
  //
  // Stepping sequence: front right -> back left -> front left -> back right
  // For 4 legs moving right: [3, 0, 2, 1] (3=right front, 0=left back, 2=left front, 1=right back)
  // For 4 legs moving left: [1, 2, 0, 3] (reverse)
  //
  const movingRight = inst.vx > 0
  const movingLeft = inst.vx < 0
  const stepSequence = movingLeft ? [1, 2, 0, 3] : [3, 0, 2, 1]  // Sequence based on direction
  const currentStepIndex = Math.floor(inst.stepDistance / stepSize) % stepSequence.length
  const currentStepLeg = stepSequence[currentStepIndex]
  
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
        const isSmallBug = (inst.legLength1 + inst.legLength2) < 5
        const bodyRadius = inst.scale * BUG_BODY_SIZE * 1.5 * 0.9
        //
        // For bugs with targetFloorY, use targetFloorY directly without restrictions
        // Otherwise calculate floorY relative to body position using full legDropFactor
        //
        let finalFloorY
        if (inst.targetFloorY !== null) {
          //
          // Use targetFloorY directly - it's already calculated to ensure legs touch floor
          //
          finalFloorY = inst.targetFloorY - inst.dropOffset
        } else {
          //
          // Calculate floorY relative to body position
          // Use full legDropFactor to ensure legs reach the floor
          // Account for body radius - legs attach to bottom of body
          //
          const effectiveLegDropFactor = Math.max(inst.legDropFactor, 0.8)  // Ensure at least 0.8
          const floorY = inst.y + bodyRadius + reach * effectiveLegDropFactor - inst.dropOffset
          //
          // Ensure floorY is below body (legs go down)
          // Don't limit minimum - let legs extend fully to reach floor
          //
          finalFloorY = floorY
        }
        
        if (inst.legCount === 2) {
          //
          // 2 legs: one left, one right (indices 0 = left, 1 = right)
          // For large bugs: use larger offset to spread legs wider on platform
          //
          const legSideOffset = isSmallBug
            ? bodyRadius * 0.4 * inst.legSpreadFactor  // Much smaller offset for small bugs
            : bodyRadius * 1.2 * inst.legSpreadFactor  // Larger offset for large bugs to spread legs wider
          idealX = i === 0 ? inst.x - legSideOffset : inst.x + legSideOffset
          
          //
          // For bugs with upward legs, legs still touch the floor
          // They go up from sides first, then curve down to the floor
          //
          idealY = finalFloorY  // Same Y for all legs on floor
        } else {
          //
          // 4 legs: determine which legs are front/back based on movement direction
          //
          const movingRight = inst.vx > 0
          const movingLeft = inst.vx < 0
          let isFrontLeg, isBackLeg
          
          if (movingRight) {
            // Moving right: legs 2,3 are front, 0,1 are back
            isFrontLeg = (i === 2 || i === 3)
            isBackLeg = (i === 0 || i === 1)
          } else if (movingLeft) {
            // Moving left: legs 0,1 are front, 2,3 are back
            isFrontLeg = (i === 0 || i === 1)
            isBackLeg = (i === 2 || i === 3)
          } else {
            // Not moving: use default positions (legs 2,3 front, 0,1 back)
            isFrontLeg = (i === 2 || i === 3)
            isBackLeg = (i === 0 || i === 1)
          }
          //
          // Body front and back edges relative to current body position
          //
          const bodyFrontX = movingRight ? inst.x + bodyRadius : inst.x - bodyRadius
          const bodyBackX = movingRight ? inst.x - bodyRadius : inst.x + bodyRadius
          
          if (inst.isDebugBug) {
            //
            // Debug bug: legs bent backwards at knees
            // Front legs: foot positions behind front body edge
            // Back legs: foot positions behind back body edge
            // Legs step when distance from foot to body edge reaches delta D
            //
            const DELTA_D = bodyRadius * 0.8  // Fixed distance threshold for stepping
            
            if (isFrontLeg) {
              //
              // Front legs: positioned behind front body edge (bent backwards)
              // When stepping: move forward closer to body edge
              // When not stepping: stay behind body edge
              //
              const isStepping = leg.isStepping
              const offset = isStepping ? DELTA_D * 0.2 : DELTA_D * 0.5  // Closer when stepping
              
              if (movingRight) {
                idealX = bodyFrontX - offset  // Behind front edge
              } else if (movingLeft) {
                idealX = bodyFrontX + offset  // Behind front edge
              } else {
                idealX = inst.x + bodyRadius - offset  // Default: behind front edge
              }
            } else if (isBackLeg) {
              //
              // Back legs: positioned behind back body edge (bent backwards)
              // When stepping: move forward closer to body edge
              // When not stepping: stay behind body edge
              //
              const isStepping = leg.isStepping
              const offset = isStepping ? DELTA_D * 0.2 : DELTA_D * 0.5  // Closer when stepping
              
              if (movingRight) {
                idealX = bodyBackX - offset  // Behind back edge
              } else if (movingLeft) {
                idealX = bodyBackX + offset  // Behind back edge
              } else {
                idealX = inst.x - bodyRadius - offset  // Default: behind back edge
              }
            } else {
              idealX = inst.x
            }
          } else if (isSmallBug) {
            //
            // Small bugs: legs must be tightly synchronized with body position
            // Use bodyRadius with very small offset to keep legs close to body edges
            //
            const frontOffset = bodyRadius * 0.1  // Small offset for front legs
            const backOffset = bodyRadius * 0.05   // Even smaller offset for back legs
            
            if (isFrontLeg) {
              //
              // Front legs: just ahead of body front edge
              //
              if (movingRight) {
                idealX = bodyFrontX + frontOffset
              } else if (movingLeft) {
                idealX = bodyFrontX - frontOffset
              } else {
                //
                // Not moving: use default (legs 2,3 are front, assume right direction)
                //
                idealX = inst.x + bodyRadius + frontOffset
              }
              //
              // Ensure front legs are always ahead of body center
              //
              if (movingRight) {
                idealX = Math.max(idealX, inst.x + bodyRadius * 0.8)
              } else if (movingLeft) {
                idealX = Math.min(idealX, inst.x - bodyRadius * 0.8)
              }
            } else if (isBackLeg) {
              //
              // Back legs: position closer to body to keep legs bent at knees
              // When stepping: ahead of body back edge (to move forward)
              // When not stepping: behind body back edge but close enough to keep knees bent
              //
              const isStepping = leg.isStepping
              // Use smaller offset to keep legs bent - legs should be bent at knees, not fully extended
              const backStepOffset = isStepping 
                ? bodyRadius * 0.2  // When stepping, ahead of body
                : -bodyRadius * 0.2  // When not stepping, behind but close to keep knees bent
              
              if (movingRight) {
                idealX = bodyBackX + backStepOffset
              } else if (movingLeft) {
                idealX = bodyBackX - backStepOffset
              } else {
                //
                // Not moving: use default (legs 0,1 are back, assume right direction)
                //
                idealX = inst.x - bodyRadius + backStepOffset
              }
              //
              // Ensure back legs stay synchronized and keep knees bent
              //
              if (movingRight) {
                idealX = Math.max(idealX, inst.x - bodyRadius * 1.2)
              } else if (movingLeft) {
                idealX = Math.min(idealX, inst.x + bodyRadius * 1.2)
              }
            } else {
              idealX = inst.x
            }
          } else {
            //
            // Large bugs: normal logic with proper back leg positioning
            //
            if (isFrontLeg) {
              //
              // Front legs: always ahead of body front edge
              //
              const frontLegOffset = bodyRadius * 0.1
              idealX = bodyFrontX + (movingRight ? frontLegOffset : -frontLegOffset)
            } else if (isBackLeg) {
              //
              // Back legs: position closer to body to keep legs bent at knees
              // When stepping: ahead of body back edge (to move forward)
              // When not stepping: behind body back edge but close enough to keep knees bent
              //
              const isStepping = leg.isStepping
              // Use smaller offset to keep legs bent - legs should be bent at knees, not fully extended
              const backStepOffset = isStepping 
                ? bodyRadius * 0.2  // When stepping, ahead of body
                : -bodyRadius * 0.2  // When not stepping, behind but close to keep knees bent
              idealX = bodyBackX + (movingRight ? backStepOffset : -backStepOffset)
              //
              // Ensure back legs stay synchronized and keep knees bent
              //
              if (movingRight) {
                idealX = Math.max(idealX, inst.x - bodyRadius * 1.2)
              } else if (movingLeft) {
                idealX = Math.min(idealX, inst.x + bodyRadius * 1.2)
              }
            } else {
              idealX = inst.x
            }
          }
        }
        
        //
        // For bugs with upward legs, legs still touch the floor
        // They go up from sides first, then curve down to the floor
        //
        idealY = finalFloorY  // Same Y for all legs on floor
        
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
      // Check if this leg should step
      //
      if (inst.isDebugBug && !leg.isStepping && inst.legCount === 4) {
        //
        // Debug bug: legs step when distance from foot to body edge reaches delta D
        //
        const debugBodyRadius = inst.scale * BUG_BODY_SIZE * 1.5 * 0.9
        const DELTA_D = debugBodyRadius * 0.8  // Fixed distance threshold for stepping
        const movingRight = inst.vx > 0
        const movingLeft = inst.vx < 0
        let isFrontLeg, isBackLeg
        
        if (movingRight) {
          isFrontLeg = (i === 2 || i === 3)
          isBackLeg = (i === 0 || i === 1)
        } else if (movingLeft) {
          isFrontLeg = (i === 0 || i === 1)
          isBackLeg = (i === 2 || i === 3)
        } else {
          isFrontLeg = (i === 2 || i === 3)
          isBackLeg = (i === 0 || i === 1)
        }
        
        const bodyFrontX = movingRight ? inst.x + debugBodyRadius : inst.x - debugBodyRadius
        const bodyBackX = movingRight ? inst.x - debugBodyRadius : inst.x + debugBodyRadius
        
        let distanceToBodyEdge
        if (isFrontLeg) {
          //
          // Front legs: check distance from foot to front body edge
          // When moving right: foot should be behind front edge, so distance = bodyFrontX - footX
          // When moving left: foot should be behind front edge, so distance = footX - bodyFrontX
          //
          if (movingRight) {
            distanceToBodyEdge = bodyFrontX - leg.footX  // Positive when foot is behind
          } else if (movingLeft) {
            distanceToBodyEdge = leg.footX - bodyFrontX  // Positive when foot is behind
          } else {
            distanceToBodyEdge = Math.abs(leg.footX - bodyFrontX)
          }
        } else if (isBackLeg) {
          //
          // Back legs: check distance from foot to back body edge
          // When moving right: foot should be behind back edge, so distance = bodyBackX - footX
          // When moving left: foot should be behind back edge, so distance = footX - bodyBackX
          //
          if (movingRight) {
            distanceToBodyEdge = bodyBackX - leg.footX  // Positive when foot is behind
          } else if (movingLeft) {
            distanceToBodyEdge = leg.footX - bodyBackX  // Positive when foot is behind
          } else {
            distanceToBodyEdge = Math.abs(leg.footX - bodyBackX)
          }
        } else {
          distanceToBodyEdge = Infinity
        }
        
        //
        // Step when distance reaches delta D (leg is too far behind body edge)
        //
        if (distanceToBodyEdge >= DELTA_D) {
          leg.isStepping = true
          leg.stepProgress = 0
          leg.stepStartX = leg.footX
          leg.stepStartY = leg.footY
          leg.targetFootX = idealX
          leg.targetFootY = idealY
        }
      } else if (!leg.isStepping && inst.legCount === 4) {
        //
        // Check if it's this leg's turn to step based on stepping sequence
        // Step sequence: front right -> back left -> front left -> back right
        //
        if (i === currentStepLeg) {
          //
          // This leg should step - reset step distance counter
          //
          inst.stepDistance = 0
          leg.isStepping = true
          leg.stepProgress = 0
          leg.stepStartX = leg.footX
          leg.stepStartY = leg.footY
          leg.targetFootX = idealX
          leg.targetFootY = idealY
        }
      } else if (!leg.isStepping && inst.legCount === 2) {
        //
        // 2 legs: strict alternate stepping (left, right, left, right...)
        // Check if any other leg is currently stepping - if so, don't start a new step
        //
        const anyLegStepping = inst.legs.some((l, idx) => idx !== i && l.isStepping)
        if (!anyLegStepping) {
          //
          // No other leg is stepping, check if this leg should step
          // For large bugs with 2 legs: use strict alternation based on lastSteppedLeg
          //
          const isLargeBugWith2Legs = !isSmallBug && inst.legCount === 2
          
          let shouldStep = false
          if (isLargeBugWith2Legs) {
            //
            // Large bugs with 2 legs: strict alternation
            // If no leg has stepped yet, start with leg 0 (left)
            // Otherwise, alternate: if last was 0, step with 1; if last was 1, step with 0
            //
            if (inst.lastSteppedLeg === -1) {
              // First step: start with left leg (0)
              shouldStep = (i === 0)
            } else {
              // Alternate: step with the other leg
              const nextLeg = inst.lastSteppedLeg === 0 ? 1 : 0
              shouldStep = (i === nextLeg)
            }
          } else {
            //
            // Other bugs: use step distance based sequence
            //
            const twoLegSequence = [0, 1]
            const twoLegStepIndex = Math.floor(inst.stepDistance / stepSize) % twoLegSequence.length
            const twoLegCurrentStep = twoLegSequence[twoLegStepIndex]
            shouldStep = (i === twoLegCurrentStep)
          }
          
          if (shouldStep) {
            //
            // This leg should step - reset step distance counter and update lastSteppedLeg
            //
            inst.stepDistance = 0
            inst.lastSteppedLeg = i
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
      // Animate stepping with IK
      //
      if (leg.isStepping) {
        //
        // Update target position during step to keep synchronized with body movement
        // This is especially important for small bugs
        //
        leg.targetFootX = idealX
        leg.targetFootY = idealY
        
        //
        // Step speed - faster for small bugs, slower for large bugs with 2 legs
        //
        const isLargeBugWith2Legs = !isSmallBug && inst.legCount === 2
        const stepSpeed = isLargeBugWith2Legs
          ? STEP_SPEED * 0.5  // Slower stepping for large bugs with 2 legs
          : (isSmallBug ? STEP_SPEED * 2.0 : STEP_SPEED)
        
        leg.stepProgress += dt * stepSpeed
        if (leg.stepProgress >= 1) {
          leg.stepProgress = 1
          leg.isStepping = false
          leg.footX = leg.targetFootX
          leg.footY = leg.targetFootY
        } else {
          //
          // Interpolate with arc (IK stepping animation)
          //
          const t = leg.stepProgress
          const arcHeight = isSmallBug ? 2 * inst.scale : 4 * inst.scale  // Smaller arc for small bugs
          const arc = Math.sin(t * Math.PI) * arcHeight
          leg.footX = leg.stepStartX + (leg.targetFootX - leg.stepStartX) * t
          leg.footY = leg.stepStartY + (leg.targetFootY - leg.stepStartY) * t - arc
        }
      } else {
        //
        // When not stepping, pull legs towards ideal position to keep synchronized with body movement
        // This prevents legs from stretching when body moves
        // For debug bugs, don't pull legs - let them step instead
        //
        if (!inst.isDebugBug && footDist > 0) {
          //
          // Pull leg towards ideal position to keep synchronized
          // For large bugs with 2 legs: don't pull legs when not stepping (they should stay in place)
          // Use faster speed for small bugs, normal speed for other large bugs
          //
          const isLargeBugWith2Legs = !isSmallBug && inst.legCount === 2
          if (isLargeBugWith2Legs) {
            //
            // Large bugs with 2 legs: don't pull legs when not stepping
            // Legs should stay in place until it's their turn to step
            //
            // Do nothing - leg stays where it is
          } else {
            //
            // Other bugs: pull legs towards ideal position
            //
            const pullSpeed = isSmallBug ? 50.0 : 30.0
            const maxPullDistance = pullSpeed * dt
            if (footDist > maxPullDistance) {
              leg.footX += (footDx / footDist) * maxPullDistance
              leg.footY += (footDy / footDist) * maxPullDistance
            } else {
              leg.footX = idealX
              leg.footY = idealY
            }
          }
        }
        //
        // For debug bugs: legs stay in place until they step
        // This allows distance to body edge to increase and trigger stepping
        //
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
    // For bugs with flat head, draw flattened ellipse instead
    //
    if (inst.hasFlatHead) {
      //
      // Draw flattened head (ellipse with reduced height)
      //
      const flatHeadWidth = radius * 2
      const flatHeadHeight = radius * 0.8  // Flatter head
      
      if (inst.showOutline) {
        k.drawEllipse({
          pos: k.vec2(0, 0),
          radiusX: flatHeadWidth / 2 + 2,
          radiusY: flatHeadHeight / 2 + 2,
          color: k.rgb(0, 0, 0),
          opacity: 1
        })
      }
      k.drawEllipse({
        pos: k.vec2(0, 0),
        radiusX: flatHeadWidth / 2,
        radiusY: flatHeadHeight / 2,
        color: k.rgb(bodyRgb.r, bodyRgb.g, bodyRgb.b),
        opacity: 1
      })
    } else {
      //
      // Draw normal circle body
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
    }
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
    // Draw eye - flat head for bug4, round for others
    //
    if (inst.hasFlatHead) {
      //
      // Draw flat head (rectangular eye)
      //
      const eyeWidth = eyeRadius * 2.2
      const eyeHeight = eyeRadius * 0.8
      k.drawRect({
        width: eyeWidth,
        height: eyeHeight,
        pos: k.vec2(-eyeWidth / 2, -eyeHeight / 2),
        color: k.rgb(180, 180, 180),
        opacity: 1
      })
      //
      // Draw black pupil (smaller rectangle)
      //
      const pupilWidth = pupilRadius * 2
      const pupilHeight = pupilRadius * 1.5
      k.drawRect({
        width: pupilWidth,
        height: pupilHeight,
        pos: k.vec2(pupilOffsetX - pupilWidth / 2, pupilOffsetY - pupilHeight / 2),
        color: k.rgb(0, 0, 0),
        opacity: 1
      })
    } else {
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
    }
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
      // For 2 legs: leg 0 attaches to left side, leg 1 attaches to right side
      // For 4 legs: back legs (0, 1) attach to left side, front legs (2, 3) attach to right side
      // Apply dropOffset to Y position
      //
      const bodyY = inst.y + inst.dropOffset
      const radius = BUG_BODY_SIZE * 1.5 * inst.scale
      
      if (inst.legCount === 2) {
        //
        // 2 legs: one on left, one on right
        //
        if (inst.hasUpwardLegs) {
          //
          // For upward legs with flat head: attach to sides of head
          // Legs should come out from sides and not go above head top
          // For flat head: head is ellipse with height = radius * 0.8
          // Top of head is at bodyY - flatHeadHeight / 2
          // Attach legs at sides, at or below head center (not above top)
          //
          const flatHeadHeight = radius * 0.8
          const headTop = bodyY - flatHeadHeight / 2
          // Attach at sides, at head center level (middle of head)
          if (i === 0) {
            // Left leg: attach on left side, at head center level
            attachX = inst.x - attachmentOffset
            attachY = bodyY  // At body center (which is head center for flat head)
          } else {
            // Right leg: attach on right side, at head center level
            attachX = inst.x + attachmentOffset
            attachY = bodyY  // At body center (which is head center for flat head)
          }
        } else {
          //
          // Normal legs: attach at body center level
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
        }
      } else {
        //
        // 4 legs: back legs (0, 1) on left, front legs (2, 3) on right
        //
        if (i === 0 || i === 1) {
          // Back legs (left side)
          attachX = inst.x - attachmentOffset
          attachY = bodyY
        } else {
          // Front legs (right side)
          attachX = inst.x + attachmentOffset
          attachY = bodyY
        }
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
