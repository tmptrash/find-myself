import { CFG } from '../cfg.js'
//
// Time digits configuration
//
const DIGIT_COUNT = 30
const MIN_SIZE = 24
const MAX_SIZE = 72
const MIN_OPACITY = 0.15
const MAX_OPACITY = 0.4
const COUNTDOWN_START = 300  // 5 minutes in seconds
const UPDATE_INTERVAL = 1.0  // Update every second
//
// Sand particle configuration
//
const SAND_PARTICLE_SIZE = 4
const SAND_PARTICLE_STEP = 5  // pixels per step (each second) - small subtle movement
const SAND_PARTICLE_MAX_STEPS = 200  // maximum steps before removal
const SAND_PARTICLE_OPACITY = 0.8
const SAND_LINES_COUNT = 20  // Number of lines/snakes (increased)
const SAND_PARTICLE_SPACING = 10  // Steps between particles on same line (10 steps = 50 pixels)
const SAND_LINE_MAX_LENGTH = 300  // Maximum length of each line in pixels
//
// Shades of gray for digits
//
const GRAY_SHADES = [
  "#303030",  // Very dark gray
  "#404040",  // Dark gray
  "#505050",  // Medium-dark gray
  "#606060",  // Medium gray
  "#707070",  // Medium-light gray
  "#808080",  // Light gray
  "#909090"   // Very light gray
]

/**
 * Creates time digits background effect
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @returns {Object} Time digits instance
 */
export function create(config) {
  const { k } = config
  
  //
  // Use full screen dimensions
  //
  const playableLeft = 0
  const playableRight = k.width()
  const playableTop = 0
  const playableBottom = k.height()
  
  const digits = []
  
  //
  // Create initial digits with collision detection
  //
  for (let i = 0; i < DIGIT_COUNT; i++) {
    let digit
    let attempts = 0
    const maxAttempts = 50
    
    //
    // Try to create digit that doesn't overlap with existing ones
    //
    do {
      digit = createDigit(k, playableLeft, playableRight, playableTop, playableBottom)
      attempts++
    } while (attempts < maxAttempts && hasOverlap(digit, digits))
    
    //
    // Only add if we found a valid position or exhausted attempts
    //
    if (attempts < maxAttempts || digits.length === 0) {
      digits.push(digit)
    }
  }
  
  const inst = {
    k,
    digits,
    globalTimer: COUNTDOWN_START,
    updateTimer: 0,
    sandParticles: [],
    sandLines: [],  // Fixed paths for sand particles
    screenWidth: k.width(),
    screenHeight: k.height()
  }
  //
  // Initialize sand lines (fixed paths)
  //
  initializeSandLines(inst)
  //
  // Pre-populate lines with particles
  //
  populateInitialParticles(inst)
  
  return inst
}

/**
 * Creates a single time digit
 * @param {Object} k - Kaplay instance
 * @param {number} left - Left boundary
 * @param {number} right - Right boundary
 * @param {number} top - Top boundary
 * @param {number} bottom - Bottom boundary
 * @returns {Object} Digit object
 */
function createDigit(k, left, right, top, bottom) {
  const x = left + Math.random() * (right - left)
  const y = top + Math.random() * (bottom - top)
  const size = MIN_SIZE + Math.random() * (MAX_SIZE - MIN_SIZE)
  const opacity = MIN_OPACITY + Math.random() * (MAX_OPACITY - MIN_OPACITY)
  const shade = GRAY_SHADES[Math.floor(Math.random() * GRAY_SHADES.length)]
  
  //
  // Start each digit with a random time offset
  //
  const timeOffset = Math.floor(Math.random() * COUNTDOWN_START)
  
  return {
    x,
    y,
    size,
    opacity,
    shade,
    timeOffset,
    currentTime: COUNTDOWN_START - timeOffset
  }
}
/**
 * Check if digit overlaps with any existing digits
 * @param {Object} digit - Digit to check
 * @param {Array} existingDigits - Array of existing digits
 * @returns {boolean} True if overlaps
 */
function hasOverlap(digit, existingDigits) {
  //
  // Approximate width and height of time text (MM:SS format)
  // Width is roughly size * 3 (5 characters with spacing)
  // Height is roughly size
  //
  const padding = 20  // Extra padding between digits
  const width = digit.size * 3 + padding
  const height = digit.size + padding
  
  for (const existing of existingDigits) {
    const existingWidth = existing.size * 3 + padding
    const existingHeight = existing.size + padding
    
    //
    // Check if rectangles overlap
    //
    const overlapX = Math.abs(digit.x - existing.x) < (width + existingWidth) / 2
    const overlapY = Math.abs(digit.y - existing.y) < (height + existingHeight) / 2
    
    if (overlapX && overlapY) {
      return true
    }
  }
  
  return false
}

/**
 * Updates time digits
 * @param {Object} inst - Time digits instance
 */
export function onUpdate(inst) {
  inst.updateTimer += inst.k.dt()
  
  //
  // Update global timer every second
  //
  if (inst.updateTimer >= UPDATE_INTERVAL) {
    inst.updateTimer = 0
    inst.globalTimer--
    
    //
    // Update each digit's time
    //
    inst.digits.forEach(digit => {
      digit.currentTime--
      
      //
      // Reset to start when reaches 0
      //
      if (digit.currentTime <= 0) {
        digit.currentTime = COUNTDOWN_START
      }
    })
    
    //
    // Reset global timer when reaches 0
    //
    if (inst.globalTimer <= 0) {
      inst.globalTimer = COUNTDOWN_START
    }
    //
    // Move all existing sand particles on each second tick
    //
    moveSandParticles(inst)
  }
}

/**
 * Draws time digits on screen
 * @param {Object} inst - Time digits instance
 */
export function draw(inst) {
  inst.digits.forEach(digit => {
    //
    // Format time as MM:SS
    //
    const minutes = Math.floor(digit.currentTime / 60)
    const seconds = digit.currentTime % 60
    const timeString = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`
    
    //
    // Parse shade color
    //
    const r = parseInt(digit.shade.slice(1, 3), 16)
    const g = parseInt(digit.shade.slice(3, 5), 16)
    const b = parseInt(digit.shade.slice(5, 7), 16)
    
    inst.k.drawText({
      text: timeString,
      pos: inst.k.vec2(digit.x, digit.y),
      size: digit.size,
      color: inst.k.rgb(r, g, b),
      opacity: digit.opacity,
      font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
      anchor: "center"
    })
  })
  //
  // Draw sand particles
  //
  drawSandParticles(inst)
}
/**
 * Initialize fixed sand lines (paths for particles)
 * @param {Object} inst - Time digits instance
 */
function initializeSandLines(inst) {
  const { screenWidth, screenHeight } = inst
  //
  // Count vertical and horizontal lines
  //
  const verticalCount = Math.ceil(SAND_LINES_COUNT / 2)
  const horizontalCount = Math.floor(SAND_LINES_COUNT / 2)
  
  let verticalIndex = 0
  let horizontalIndex = 0
  
  for (let i = 0; i < SAND_LINES_COUNT; i++) {
    const isVertical = i % 2 === 0
    
    if (isVertical) {
      //
      // Vertical line - distribute evenly across width
      // Use segment-based positioning with small random variation
      //
      const segment = (verticalIndex + 0.5) / (verticalCount + 1)
      const segmentWidth = screenWidth / (verticalCount + 1)
      const randomVariation = (Math.random() - 0.5) * segmentWidth * 0.3
      const x = (segment * screenWidth) + randomVariation
      const startOffset = Math.random() * SAND_LINE_MAX_LENGTH
      
      inst.sandLines.push({
        startX: x,
        startY: 0,
        dirX: 0,
        dirY: 1,
        isVertical: true,
        lastParticleSteps: SAND_PARTICLE_SPACING,
        maxDistance: screenHeight,
        offset: startOffset
      })
      
      verticalIndex++
    } else {
      //
      // Horizontal line - distribute evenly across height
      // Use segment-based positioning with small random variation
      //
      const segment = (horizontalIndex + 0.5) / (horizontalCount + 1)
      const segmentHeight = screenHeight / (horizontalCount + 1)
      const randomVariation = (Math.random() - 0.5) * segmentHeight * 0.3
      const y = (segment * screenHeight) + randomVariation
      const startOffset = Math.random() * SAND_LINE_MAX_LENGTH
      
      inst.sandLines.push({
        startX: 0,
        startY: y,
        dirX: 1,
        dirY: 0,
        isVertical: false,
        lastParticleSteps: SAND_PARTICLE_SPACING,
        maxDistance: screenWidth,
        offset: startOffset
      })
      
      horizontalIndex++
    }
  }
}
/**
 * Populate lines with initial particles
 * @param {Object} inst - Time digits instance
 */
function populateInitialParticles(inst) {
  const { sandLines } = inst
  const lightShades = ["#808080", "#909090", "#A0A0A0"]
  //
  // For each line, create particles at regular intervals
  // All particles form a continuous line
  //
  sandLines.forEach((line, lineIndex) => {
    const maxParticles = Math.floor(SAND_LINE_MAX_LENGTH / (SAND_PARTICLE_SPACING * SAND_PARTICLE_STEP))
    //
    // Calculate starting position using offset
    //
    const offsetSteps = Math.floor(line.offset / SAND_PARTICLE_STEP)
    
    for (let i = 0; i < maxParticles; i++) {
      //
      // Each particle is exactly SAND_PARTICLE_SPACING steps behind the previous one
      //
      const totalSteps = offsetSteps + (i * SAND_PARTICLE_SPACING)
      const shade = lightShades[Math.floor(Math.random() * lightShades.length)]
      
      const particle = {
        x: line.startX + line.dirX * totalSteps * SAND_PARTICLE_STEP,
        y: line.startY + line.dirY * totalSteps * SAND_PARTICLE_STEP,
        dirX: line.dirX,
        dirY: line.dirY,
        shade,
        steps: totalSteps,
        isVertical: line.isVertical,
        lineIndex
      }
      
      inst.sandParticles.push(particle)
    }
  })
}
/**
 * Creates sand particles on lines where spacing allows
 * @param {Object} inst - Time digits instance
 */
function createSandParticles(inst) {
  const { sandLines } = inst
  //
  // Use lighter gray shades for better visibility
  //
  const lightShades = ["#808080", "#909090", "#A0A0A0"]
  //
  // Check each line
  //
  sandLines.forEach(line => {
    //
    // Increment steps counter for this line
    //
    line.lastParticleSteps++
    //
    // Create new particle if spacing reached
    //
    if (line.lastParticleSteps >= SAND_PARTICLE_SPACING) {
      const shade = lightShades[Math.floor(Math.random() * lightShades.length)]
      
      const particle = {
        x: line.startX,
        y: line.startY,
        dirX: line.dirX,
        dirY: line.dirY,
        shade,
        steps: 0,
        isVertical: line.isVertical,
        lineIndex: sandLines.indexOf(line)
      }
      
      inst.sandParticles.push(particle)
      //
      // Reset counter for this line
      //
      line.lastParticleSteps = 0
    }
  })
}
/**
 * Moves all sand particles by one step (called every second)
 * @param {Object} inst - Time digits instance
 */
function moveSandParticles(inst) {
  //
  // Move each particle by one step
  //
  for (let i = inst.sandParticles.length - 1; i >= 0; i--) {
    const particle = inst.sandParticles[i]
    //
    // Move particle by step
    //
    particle.x += particle.dirX * SAND_PARTICLE_STEP
    particle.y += particle.dirY * SAND_PARTICLE_STEP
    particle.steps++
    //
    // Check if particle went out of bounds - wrap around instead of removing
    //
    const line = inst.sandLines[particle.lineIndex]
    
    if (particle.isVertical && particle.y > inst.screenHeight) {
      //
      // Wrap to top
      //
      particle.y = 0
      particle.steps = 0
    } else if (!particle.isVertical && particle.x > inst.screenWidth) {
      //
      // Wrap to left
      //
      particle.x = 0
      particle.steps = 0
    }
    //
    // Only remove if max steps reached (safety limit)
    //
    if (particle.steps >= SAND_PARTICLE_MAX_STEPS) {
      inst.sandParticles.splice(i, 1)
    }
  }
}
/**
 * Draws all sand particles
 * @param {Object} inst - Time digits instance
 */
function drawSandParticles(inst) {
  const { k, sandParticles } = inst
  
  sandParticles.forEach(particle => {
    //
    // Parse shade color
    //
    const r = parseInt(particle.shade.slice(1, 3), 16)
    const g = parseInt(particle.shade.slice(3, 5), 16)
    const b = parseInt(particle.shade.slice(5, 7), 16)
    //
    // Calculate opacity based on steps (fade in and out)
    //
    const progress = particle.steps / SAND_PARTICLE_MAX_STEPS
    let opacity = SAND_PARTICLE_OPACITY
    
    if (progress < 0.2) {
      //
      // Fade in
      //
      opacity = SAND_PARTICLE_OPACITY * (progress / 0.2)
    } else if (progress > 0.8) {
      //
      // Fade out
      //
      opacity = SAND_PARTICLE_OPACITY * ((1 - progress) / 0.2)
    }
    //
    // Draw particle as small square
    //
    k.drawRect({
      pos: k.vec2(particle.x, particle.y),
      width: SAND_PARTICLE_SIZE,
      height: SAND_PARTICLE_SIZE,
      color: k.rgb(r, g, b),
      opacity,
      anchor: "center"
    })
  })
}

