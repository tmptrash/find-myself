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
    updateTimer: 0
  }
  
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
}

