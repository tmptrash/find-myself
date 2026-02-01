import { CFG } from '../cfg.js'
//
// Analog clock configuration
//
const CLOCK_RADIUS = 120  // Clock face radius (increased from 80)
const HAND_WIDTH = 4  // Width of the second hand (increased from 3)
const HAND_LENGTH = 90  // Length of the second hand (increased from 60)
const CENTER_DOT_RADIUS = 8  // Radius of center dot (increased from 6)
const TICK_LENGTH = 12  // Length of tick marks (increased from 8)
const TICK_WIDTH = 3  // Width of tick marks (increased from 2)
const FACE_COLOR = { r: 80, g: 80, b: 80 }  // Dark gray for clock face
const HAND_COLOR = { r: 144, g: 144, b: 144 }  // Same color as sand particles (#909090)
const CLOCK_OPACITY = 0.0  // Transparent (clock face is invisible)
//
// Gray shades for pulsation (from dark to light and back)
// Moves away from face color and back each second
// More shades for smoother visual progression
//
const GRAY_SHADES = [
  { r: 80, g: 80, b: 80 },     // Same as face (darkest) - start
  { r: 88, g: 88, b: 88 },     // Very slightly lighter
  { r: 96, g: 96, b: 96 },     // Slightly lighter
  { r: 104, g: 104, b: 104 },  // Lighter
  { r: 112, g: 112, b: 112 },  // Medium-dark
  { r: 120, g: 120, b: 120 },  // Medium
  { r: 128, g: 128, b: 128 },  // Medium
  { r: 136, g: 136, b: 136 },  // Medium-light
  { r: 144, g: 144, b: 144 },  // Same as hand (lightest) - peak
  { r: 136, g: 136, b: 136 },  // Medium-light (going back)
  { r: 128, g: 128, b: 128 },  // Medium (going back)
  { r: 120, g: 120, b: 120 },  // Medium (going back)
  { r: 112, g: 112, b: 112 },  // Medium-dark (going back)
  { r: 104, g: 104, b: 104 },  // Lighter (going back)
  { r: 96, g: 96, b: 96 },     // Slightly lighter (going back)
  { r: 88, g: 88, b: 88 }      // Very slightly lighter (going back)
]

/**
 * Creates an analog clock that shows seconds (0-60)
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {Object} config.staticPlatform - Static time platform instance to sync with
 * @returns {Object} Analog clock instance
 */
export function create(config) {
  const { k, x, y, staticPlatform } = config
  
  const inst = {
    k,
    x,
    y,
    staticPlatform,
    currentAngle: 0,  // Current angle of second hand (0 = 12 o'clock, increases clockwise)
    currentShadeIndex: 0  // Index in GRAY_SHADES array
  }
  
  return inst
}

/**
 * Updates analog clock
 * @param {Object} inst - Analog clock instance
 */
export function onUpdate(inst) {
  if (!inst.staticPlatform) return
  //
  // Get current seconds from static platform for hand position
  //
  const totalSeconds = inst.staticPlatform.timeRemaining
  const seconds = Math.ceil(totalSeconds) % 60
  //
  // For color cycling, calculate elapsed seconds from start (300 - current)
  // This ensures synchronization with the second hand and starts with index 0
  //
  const elapsedSeconds = 300 - Math.ceil(totalSeconds)
  inst.currentShadeIndex = elapsedSeconds % GRAY_SHADES.length
  //
  // Calculate angle: 0 seconds = top (0 degrees), clockwise rotation
  //
  inst.currentAngle = -(seconds * 6) * (Math.PI / 180)
}

/**
 * Draws analog clock
 * @param {Object} inst - Analog clock instance
 */
export function draw(inst) {
  const { k, x, y, currentAngle, currentShadeIndex } = inst
  //
  // Get current shade from the array (cycles through shades each second)
  //
  const shade = GRAY_SHADES[currentShadeIndex]
  const glowR = shade.r
  const glowG = shade.g
  const glowB = shade.b
  //
  // Draw thin pulsating ring (transparent when clock is transparent)
  //
  const outerRadius = CLOCK_RADIUS + 12
  const innerRadius = CLOCK_RADIUS + 9  // Thin ring (3px width)
  //
  // Draw outer circle (only if clock is visible)
  //
  if (CLOCK_OPACITY > 0) {
    k.drawCircle({
      pos: k.vec2(x, y),
      radius: outerRadius,
      color: k.rgb(glowR, glowG, glowB),
      opacity: 0.8 * CLOCK_OPACITY,
      fill: true
    })
    //
    // Draw inner circle (to create ring effect) - use background color
    //
    k.drawCircle({
      pos: k.vec2(x, y),
      radius: innerRadius,
      color: k.rgb(80, 80, 80),  // Same as background
      opacity: 1.0,
      fill: true
    })
  }
  //
  // Draw clock face circle (transparent)
  //
  k.drawCircle({
    pos: k.vec2(x, y),
    radius: CLOCK_RADIUS,
    color: k.rgb(FACE_COLOR.r, FACE_COLOR.g, FACE_COLOR.b),
    opacity: CLOCK_OPACITY,
    fill: true
  })
  //
  // Draw 12 tick marks with pulsating color (stationary)
  //
  for (let i = 0; i < 12; i++) {
    const angle = (i * 30) * (Math.PI / 180)  // 30 degrees per tick (360 / 12)
    const startRadius = CLOCK_RADIUS - TICK_LENGTH
    const endRadius = CLOCK_RADIUS
    
    const startX = x + Math.sin(angle) * startRadius
    const startY = y - Math.cos(angle) * startRadius
    const endX = x + Math.sin(angle) * endRadius
    const endY = y - Math.cos(angle) * endRadius
    //
    // Draw tick mark with pulsating color
    //
    k.drawLine({
      p1: k.vec2(startX, startY),
      p2: k.vec2(endX, endY),
      width: TICK_WIDTH,
      color: k.rgb(glowR, glowG, glowB),
      opacity: CLOCK_OPACITY
    })
  }
  //
  // Draw second hand with pulsating color (rotates clockwise)
  //
  const handEndX = x + Math.sin(currentAngle) * HAND_LENGTH
  const handEndY = y - Math.cos(currentAngle) * HAND_LENGTH
  //
  // Draw hand with pulsating color
  //
  k.drawLine({
    p1: k.vec2(x, y),
    p2: k.vec2(handEndX, handEndY),
    width: HAND_WIDTH,
    color: k.rgb(glowR, glowG, glowB),
    opacity: CLOCK_OPACITY
  })
  //
  // Draw center dot with pulsating color
  //
  k.drawCircle({
    pos: k.vec2(x, y),
    radius: CENTER_DOT_RADIUS,
    color: k.rgb(glowR, glowG, glowB),
    opacity: CLOCK_OPACITY,
    fill: true
  })
}

