import { CFG } from '../cfg.js'
import { getColor, parseHex } from '../../../utils/helper.js'
import * as Hero from '../../../components/hero.js'
import * as Sound from '../../../utils/sound.js'

//
// Walking creature parameters
//
const TEXT_MESSAGE = 'fear'
const TEXT_SIZE = 36
const OUTLINE_THICKNESS = 2
const WALK_SPEED = 35  // Pixels per second (slow walking speed)
const LEG_COUNT = 3  // Number of leg pairs (3 near + 3 far = 6 legs = 3 pairs)
const UPPER_LEG_LENGTH = 18  // Length of upper leg segment (longer for more reach)
const LOWER_LEG_LENGTH = 18  // Length of lower leg segment
const LEG_SPACING = 50  // Horizontal spacing between legs
const STEP_HEIGHT = 18  // How high to lift foot during step
const STEP_LENGTH = 50  // How far forward to step (increased for more forward reach)
//
// Return-as-friend behaviour: after walking off the right edge the creature comes
// back as a harmless "friend" platform the hero can jump onto.
//
const RETURN_FRIEND_TEXT = 'friend'
const FRIEND_COLOR = '#6BCB77'         // Friendly green once it returns
const OFFSCREEN_MARGIN = 140           // Extra px past the right edge before turning around
const STEP_DURATION = 0.32  // Duration of one step (seconds) — snappier, more dynamic gait
//
// Per-leg step-trigger lag (fraction of STEP_LENGTH the foot falls behind the
// attachment before it steps). Front legs use a smaller lag so they step first,
// creating a front-to-back wave. Far legs are offset to desync from near legs.
//
const STEP_LAG_FRONT = 0.4    // Front legs step soonest
const STEP_LAG_BACK = 0.85    // Back legs step latest
const STEP_LAG_FAR_OFFSET = 0.22  // Far-row legs lag slightly more than near-row
const BODY_BOUNCE = 2  // Vertical bounce of body during walk (reduced)
//
// Tight collision height that hugs the word glyphs (was TEXT_SIZE + outline,
// which sat noticeably above and below the visible letters)
//
const COLLISION_TIGHT_HEIGHT = TEXT_SIZE * 0.72

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
  
  //
  // Unique group counter so every leg steps independently (no two legs are forced
  // to wait on each other), producing a more dynamic, less synchronised gait.
  //
  let legGroupCounter = 0
  for (let i = 0; i < LEG_COUNT; i++) {
    //
    // Distribute legs evenly from first to last letter
    //
    const attachX = legStartX + (totalLegSpan / (LEG_COUNT - 1)) * i
    //
    // leadOrder: 0 for the front-most leg (largest attachX), 1 for the back-most.
    // Front legs get a smaller step lag so they step before middle, middle before back.
    //
    const leadOrder = LEG_COUNT > 1 ? (LEG_COUNT - 1 - i) / (LEG_COUNT - 1) : 0
    const nearLag = STEP_LAG_FRONT + leadOrder * (STEP_LAG_BACK - STEP_LAG_FRONT)
    const farLag = nearLag + STEP_LAG_FAR_OFFSET
    
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
      pairGroup: legGroupCounter++,  // Unique group — each leg steps on its own
      stepTriggerDist: -STEP_LENGTH * nearLag,  // Foot-behind distance that triggers a step
      needsStep: false,  // Does this leg need to step?
      startX: startX + attachX,  // Step start position X
      startY: groundY,  // Step start position Y
      isFarLeg: false  // This is a near leg (drawn in front)
    }
    
    legs.push(nearLeg)
    
    //
    // Create FAR leg (away from player, behind) — desynced from the near leg
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
      pairGroup: legGroupCounter++,  // Unique group — each leg steps on its own
      stepTriggerDist: -STEP_LENGTH * farLag,  // Far legs lag slightly more than near
      needsStep: false,  // Does this leg need to step?
      startX: startX + attachX,  // Step start position X
      startY: groundY,  // Step start position Y
      isFarLeg: true  // This is a far leg (drawn behind)
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
  // Create main text — use the shared blade accent color so it matches the AAA letters
  //
  const mainText = creatureContainer.add([
    k.text(TEXT_MESSAGE, {
      size: TEXT_SIZE,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(0, 0),
    getColor(k, CFG.visual.colors.blades),
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
  
  //
  // Parse blade color once for use in drawLegs
  //
  const [bladeR, bladeG, bladeB] = parseHex(CFG.visual.colors.blades)
  //
  // Pre-split near and far leg lists so drawLegs never calls filter() per frame
  //
  const nearLegs = legs.filter(leg => !leg.isFarLeg)
  const farLegs = legs.filter(leg => leg.isFarLeg)
  const inst = {
    k,
    creatureContainer,
    textObjects,
    collisionArea,
    legs,
    nearLegs,
    farLegs,
    hero,
    currentLevel,
    sfx,
    onHit,
    textWidth,
    maxX,
    groundY,
    bladeR,
    bladeG,
    bladeB,
    //
    // Pre-cached colors — avoids k.rgb() allocations per leg per frame in drawLegs
    //
    blackColor: k.rgb(0, 0, 0),
    bladeColor: k.rgb(bladeR, bladeG, bladeB),
    animationTime: 0,
    pauseTimer: 1.0,  // Initial pause before starting to walk
    bodyBounceOffset: 0,
    bodyTilt: 0,  // Body tilt angle (horizontal sway)
    currentSpeed: WALK_SPEED,  // Current walking speed
    heroIsDead: false,  // Flag to stop movement after killing hero
    isFrozen: false,
    freezeTimeRemaining: 0,
    //
    // Walking phase: 'forward' (lethal "fear", moving right) →
    // 'returning' (harmless "friend" platform, moving left)
    //
    phase: 'forward',
    walkDir: 1,                                   // +1 right, -1 left (used by leg gait)
    isFriend: false,                              // True once it returns as a platform
    offscreenX: screenWidth + textWidth + OFFSCREEN_MARGIN,  // Turnaround point past right edge
    leftStopX: sideWallWidth + (maxX - sideWallWidth) * 0.45 // Where the friend platform settles
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
 * Sets the creature's displayed word, its lethality, and its colour. Used when
 * the hero shoots the creature with a letter: a "good" word makes it harmless
 * (it no longer kills on touch), a "bad" word keeps it lethal.
 * @param {Object} inst - Walking creature instance
 * @param {string} text - New word to display
 * @param {boolean} isGood - True = harmless (does not kill), false = lethal
 * @param {Object} [color] - Optional kaplay colour for the main text + legs
 */
export function setWord(inst, text, isGood, color) {
  //
  // Lethality follows the word: good words are friendly (handleCollision no-ops)
  //
  inst.isFriend = isGood
  //
  // Relabel every outline + main text object with the new word
  //
  inst.textObjects.forEach(obj => { obj.text = text })
  //
  // Recolour the main text (last object) and the legs when a colour is given
  //
  if (color) {
    const mainText = inst.textObjects[inst.textObjects.length - 1]
    mainText && (mainText.color = color)
    inst.bladeColor = color
  }
  //
  // Resize the collision box to hug the new word: measure the rendered width and
  // use a tighter height so the box follows the glyphs exactly (was too tall and
  // narrower than wide words)
  //
  resizeCollision(inst, text)
}

/**
 * Handle collision with walking creature
 * @param {Object} inst - Walking creature instance
 */
function handleCollision(inst) {
  //
  // Once it has returned as the friend platform it is harmless — hero stands on it
  //
  if (inst.isFriend) return
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
 * Transforms the lethal "fear" creature into the harmless "friend" platform:
 * relabels every text object, recolours it green, flips its walking direction,
 * and switches to the returning phase. The static body stays solid so the hero
 * can jump onto it, but handleCollision now no-ops.
 * @param {Object} inst - Walking creature instance
 */
function becomeFriend(inst) {
  if (inst.isFriend) return
  inst.isFriend = true
  inst.phase = 'returning'
  inst.walkDir = -1
  const friendColor = inst.k.rgb(...parseHex(FRIEND_COLOR))
  //
  // Relabel every outline + main text object and recolour the main text
  //
  inst.textObjects.forEach((obj, index) => {
    obj.text = RETURN_FRIEND_TEXT
    //
    // The last text object is the coloured main text; outlines stay black
    //
    index === inst.textObjects.length - 1 && (obj.color = friendColor)
  })
  //
  // Recolour the legs to match the friendly main text
  //
  inst.bladeColor = friendColor
}

/**
 * Re-measures the given word and resizes the collision body to hug it: full
 * rendered width and a tight height that follows the glyphs.
 * @param {Object} inst - Walking creature instance
 * @param {string} text - Current word being displayed
 */
function resizeCollision(inst, text) {
  const { k } = inst
  //
  // Measure the rendered width of the new word off-screen
  //
  const temp = k.add([
    k.text(text, { size: TEXT_SIZE, font: CFG.visual.fonts.thinFull.replace(/'/g, '') }),
    k.pos(-10000, -10000),
    k.opacity(0)
  ])
  const measuredWidth = temp.width
  temp.destroy()
  //
  // Apply the new dimensions to the collision rect (area recomputes from these)
  //
  inst.textWidth = measuredWidth
  inst.collisionArea.width = measuredWidth
  inst.collisionArea.height = COLLISION_TIGHT_HEIGHT
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
  // Walking direction (+1 right, -1 left) — legs step in the direction of travel
  //
  const dir = inst.walkDir
  
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
    // How far the foot trails the attachment along the walking direction
    // (positive = foot is behind, regardless of left/right movement)
    //
    const distanceFromAttach = leg.footX - attachWorldX
    const behind = -dir * distanceFromAttach
    
    //
    // Trigger step when the foot trails by this leg's own lag — front legs use a
    // shorter lag so they step first (front-to-back wave). stepTriggerDist is
    // negative, so -stepTriggerDist is the positive lag threshold.
    //
    if (!leg.isLifted && behind > -leg.stepTriggerDist) {
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
      // Set target position: one step length ahead of the attachment in the
      // current walking direction (creates a proper back-to-front stride)
      //
      leg.targetX = attachWorldX + dir * STEP_LENGTH * 1.0
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
  //
  // Skip movement while frozen (hit by letter projectile)
  //
  if (inst.isFrozen) {
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
  // Move creature according to its phase — held in place while it is blocked by
  // an anti-hero standing in its way (e.g. the confusion decoys)
  //
  if (!inst.stoppedByAntihero) {
    if (inst.phase === 'forward') {
      //
      // "fear" walks right, off the right edge, then turns into the friend platform
      //
      inst.creatureContainer.pos.x += inst.currentSpeed * dt
      inst.collisionArea.pos.x = inst.creatureContainer.pos.x
      if (inst.creatureContainer.pos.x > inst.offscreenX) {
        becomeFriend(inst)
      }
    } else if (inst.phase === 'returning') {
      //
      // "friend" walks back left until it settles, remaining a standable platform
      //
      if (inst.creatureContainer.pos.x > inst.leftStopX) {
        inst.creatureContainer.pos.x -= inst.currentSpeed * dt
        inst.collisionArea.pos.x = inst.creatureContainer.pos.x
      }
    }
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
  //
  // Don't draw during pause
  //
  if (inst.pauseTimer > 0) {
    return
  }
  //
  // Use pre-cached arrays and colors to avoid per-frame allocations
  //
  const { k, creatureContainer, nearLegs, farLegs, blackColor, bladeColor } = inst
  
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
      color: blackColor
    })
    //
    // Draw black outline for lower leg (wider for visibility)
    //
    k.drawLine({
      p1: k.vec2(kneeWorldX, kneeWorldY),
      p2: k.vec2(footWorldX, footWorldY),
      width: 7,
      color: blackColor
    })
    //
    // Draw upper leg (blade accent color, same as text)
    //
    k.drawLine({
      p1: k.vec2(attachWorldX, attachWorldY),
      p2: k.vec2(kneeWorldX, kneeWorldY),
      width: 3,
      color: bladeColor
    })
    //
    // Draw lower leg (blade accent color, same as text)
    //
    k.drawLine({
      p1: k.vec2(kneeWorldX, kneeWorldY),
      p2: k.vec2(footWorldX, footWorldY),
      width: 3,
      color: bladeColor
    })
    //
    // Draw foot knob with black outline
    //
    const knobRadius = 4
    k.drawCircle({
      pos: k.vec2(footWorldX, footWorldY),
      radius: knobRadius + 1.2,
      color: blackColor
    })
    k.drawCircle({
      pos: k.vec2(footWorldX, footWorldY),
      radius: knobRadius,
      color: bladeColor
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
