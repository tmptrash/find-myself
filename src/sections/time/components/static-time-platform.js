import { CFG } from '../cfg.js'
//
// Static time platform configuration
//
const FONT_SIZE = 36
const PLATFORM_WIDTH = 100
const PLATFORM_HEIGHT = 36
const COUNTDOWN_START = 300  // 5 minutes in seconds
const FIXED_OPACITY = 0.25  // Very subtle, barely visible
const FIXED_COLOR = "#606060"  // Close to background color (#505050)

/**
 * Creates a static time platform with running timer
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @returns {Object} Static time platform instance
 */
export function create(config) {
  const { k, x, y } = config
  //
  // Use fixed color and opacity (no randomness)
  //
  const rgbColor = hexToRgb(FIXED_COLOR)
  //
  // Create invisible platform (only collision box)
  //
  const platform = k.add([
    k.rect(PLATFORM_WIDTH, PLATFORM_HEIGHT),
    k.pos(x, y),
    k.area(),
    k.body({ isStatic: true }),
    k.anchor("center"),
    k.opacity(0),  // Invisible
    k.z(15),  // Same as platforms
    CFG.game.platformName
  ])
  //
  // Create timer text (semi-transparent, like background digits)
  //
  const timerText = k.add([
    k.text("05:00", {
      size: FONT_SIZE,
      font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
      align: "center"
    }),
    k.pos(x, y),
    k.anchor("center"),
    k.color(rgbColor.r, rgbColor.g, rgbColor.b),  // Fixed gray color
    k.opacity(FIXED_OPACITY),  // Fixed opacity
    k.z(16)  // Above platforms
  ])
  
  const inst = {
    k,
    platform,
    timerText,
    timeRemaining: COUNTDOWN_START
  }
  
  return inst
}

/**
 * Updates static time platform
 * @param {Object} inst - Static time platform instance
 */
export function onUpdate(inst) {
  //
  // Always count down
  //
  inst.timeRemaining -= inst.k.dt()
  //
  // Loop back when reaches zero
  //
  if (inst.timeRemaining <= 0) {
    inst.timeRemaining = COUNTDOWN_START
  }
  //
  // Update text
  //
  const seconds = Math.max(0, Math.ceil(inst.timeRemaining))
  const minutes = Math.floor(seconds / 60)
  const secs = seconds % 60
  inst.timerText.text = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
}

/**
 * Converts hex color to RGB
 * @param {string} hex - Hex color string
 * @returns {Object} RGB color object
 */
function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : { r: 80, g: 80, b: 80 }
}

