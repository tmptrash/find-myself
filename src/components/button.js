import { CONFIG } from '../config.js'
import { getColor, getRGB } from '../utils/helpers.js'

// ============================================
// UNIVERSAL MENU BUTTON
// ============================================

/**
 * Update button animations (scale, pulse, color)
 * @param {Object} instance - Button animation instance
 * @param {Object} instance.k - Kaplay instance
 * @param {Object} instance.state - Animation state (targetScale, currentScale)
 * @param {Object} instance.elements - Button elements (button, buttonText, buttonShadow)
 * @param {boolean} instance.pulse - Enable pulse animation
 * @param {boolean} instance.colorShift - Enable color shift animation
 * @param {string} instance.buttonColor - Button color in hex format
 */
function updateButtonAnimation(instance) {
  const { k, state, elements, pulse, colorShift, buttonColor } = instance
  const { button, buttonText, buttonShadow } = elements
  
  // Determine base targetScale
  let baseTargetScale = state.targetScale
  
  // Add pulse only if not hovering
  if (!button.isHovering() && pulse) {
    const pulseValue = 1.0 + Math.sin(k.time() * CONFIG.visual.menu.titlePulseSpeed) * CONFIG.visual.menu.buttonPulseAmount
    baseTargetScale = pulseValue
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
    const shift = Math.sin(k.time() * 2) * 15
    button.color = k.rgb(r, Math.max(0, Math.min(255, g + shift)), b)
  }
}

/**
 * Creates a button with text and animations
 * @param {Object} k - Kaplay instance
 * @param {Object} config - Button configuration
 * @param {string} config.text - Button text
 * @param {number} config.x - X position (button center)
 * @param {number} config.y - Y position (button center)
 * @param {number} [config.width=450] - Button width
 * @param {number} [config.height=90] - Button height
 * @param {string} config.targetScene - Target scene to navigate to on click
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
    targetScene,
    textOffsetY = 0,
  } = config
  
  // Common parameters for all buttons
  const fontSize = CONFIG.visual.buttonFontSize
  const buttonColor = CONFIG.colors.start.button
  const textColor = CONFIG.colors.start.buttonText
  const outlineColor = CONFIG.colors.start.buttonOutline
  const pulse = true
  const colorShift = true
  
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
    getColor(k, buttonColor),
    k.outline(6, getRGB(k, outlineColor)),
    k.area(),
    k.scale(1),
    k.z(1),
    "button",
  ])
  
  // Button text
  const buttonText = k.add([
    k.text(text, { size: fontSize }),
    k.pos(x, y + textOffsetY),
    k.anchor("center"),
    getColor(k, textColor),
    k.outline(3, getRGB(k, outlineColor)),
    k.z(2),
  ])
  
  // Animation state
  const animationState = {
    targetScale: 1,
    currentScale: 1
  }
  
  // Button elements
  const elements = {
    button,
    buttonText,
    buttonShadow
  }
  
  // Animation instance
  const animationInstance = {
    k,
    state: animationState,
    elements,
    pulse,
    colorShift,
    buttonColor
  }
  
  // Hover effect
  button.onHoverUpdate(() => {
    animationState.targetScale = CONFIG.visual.menu.buttonHoverScale
    k.setCursor("pointer")
  })
  
  button.onHoverEnd(() => {
    animationState.targetScale = 1
    k.setCursor("default")
  })
  
  // Button click
  button.onClick(() => {
    k.go(targetScene)
  })
  
  // Pulse animation and smooth scale change
  k.onUpdate(() => {
    updateButtonAnimation(animationInstance)
  })
  
  return {
    button,
    text: buttonText,
    shadow: buttonShadow
  }
}

