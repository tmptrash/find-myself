import { CONFIG } from '../config.js'
import { getColor, getRGB } from '../utils/helpers.js'

// ============================================
// PUBLIC API
// ============================================

/**
 * Creates a button with text and animations
 * @param {Object} k - Kaplay instance
 * @param {Object} config - Button configuration
 * @param {string} config.text - Button text
 * @param {number} config.x - X position (button center)
 * @param {number} config.y - Y position (button center)
 * @param {number} [config.width=450] - Button width
 * @param {number} [config.height=90] - Button height
 * @param {Function} config.onClick - Callback function when button is clicked
 * @param {number} [config.textOffsetY=0] - Text vertical offset
 * @returns {Object} Object with button elements (button, text, shadow)
 */
export function create(k, config) {
  const {
    text,
    x,
    y,
    width = 450,
    height = 90,
    onClick: onClickCallback,
    textOffsetY = 0,
  } = config
  
  // Button shadow
  const buttonShadow = k.add([
    k.rect(width, height, { radius: 12 }),
    k.pos(x + 4, y + 4),
    k.anchor("center"),
    getColor(k, "000000"),
    k.opacity(0.3),
    k.z(0),
  ])
  
  // Button background
  const button = k.add([
    k.rect(width, height, { radius: 12 }),
    k.pos(x, y),
    k.anchor("center"),
    getColor(k, CONFIG.colors.ready.button),
    k.outline(6, getRGB(k, CONFIG.colors.ready.buttonOutline)),
    k.area(),
    k.scale(1),
    k.z(1),
    "button",
  ])
  
  // Button text
  const buttonText = k.add([
    k.text(text, { size: CONFIG.visual.buttonFontSize }),
    k.pos(x, y + textOffsetY),
    k.anchor("center"),
    getColor(k, CONFIG.colors.ready.buttonText),
    k.outline(3, getRGB(k, CONFIG.colors.ready.buttonOutline)),
    k.z(2),
  ])
  
  // Create button instance
  const instance = {
    k,
    button,
    buttonText,
    buttonShadow,
    state: {
      targetScale: 1,
      currentScale: 1
    },
    pulse: true,
    colorShift: true,
    buttonColor: CONFIG.colors.ready.button,
    onClickCallback
  }
  
  // Bind event handlers
  button.onHoverUpdate(() => onHoverUpdate(instance))
  button.onHoverEnd(() => onHoverEnd(instance))
  button.onClick(() => handleClick(instance))
  k.onUpdate(() => onUpdate(instance))
  
  return {
    button,
    text: buttonText,
    shadow: buttonShadow
  }
}

/**
 * Handle button hover start
 * @param {Object} instance - Button instance
 */
function onHoverUpdate(instance) {
  instance.state.targetScale = CONFIG.visual.menu.buttonHoverScale
  instance.k.setCursor("pointer")
}

/**
 * Handle button hover end
 * @param {Object} instance - Button instance
 */
function onHoverEnd(instance) {
  instance.state.targetScale = 1
  instance.k.setCursor("default")
}

/**
 * Handle button click
 * @param {Object} instance - Button instance
 */
function handleClick(instance) {
  if (instance.onClickCallback) {
    instance.onClickCallback()
  }
}

/**
 * Update button animations (scale, pulse, color)
 * @param {Object} instance - Button instance
 */
function onUpdate(instance) {
  const { k, button, buttonText, buttonShadow, state, pulse, colorShift, buttonColor } = instance
  
  // Determine base targetScale
  let baseTargetScale = state.targetScale
  
  // Add pulse only if not hovering
  if (!button.isHovering() && pulse) {
    baseTargetScale = 1.0 + Math.sin(k.time() * CONFIG.visual.menu.titlePulseSpeed) * CONFIG.visual.menu.buttonPulseAmount
  }
  
  // Smoothly interpolate to target scale
  state.currentScale = k.lerp(state.currentScale, baseTargetScale, 0.2)
  
  // Apply scale to all elements
  button.scale = k.vec2(state.currentScale)
  buttonText.scale = k.vec2(state.currentScale)
  buttonShadow.scale = k.vec2(state.currentScale)
  
  // Color animation
  if (colorShift) {
    // Parse hex color to RGB components
    const hex = buttonColor.replace('#', '')
    const r = parseInt(hex.substring(0, 2), 16)
    const g = parseInt(hex.substring(2, 4), 16)
    const b = parseInt(hex.substring(4, 6), 16)
    
    // Add small shift to green channel for liveliness
    button.color = k.rgb(r, Math.max(0, Math.min(255, g + Math.sin(k.time() * 2) * 15)), b)
  }
}

