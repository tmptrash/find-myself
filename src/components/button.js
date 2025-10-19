import { getColor, getRGB } from '../utils/helpers.js'

const BTN_SHADOW_COLOR = '000000'
const BTN_COLOR = 'FF6432'
const BTN_TEXT_COLOR = 'FFFFFF'
const BTN_OUTLINE_COLOR = '000000'
const BTN_FONT_SIZE = 36
const BTN_HOVER_SCALE = 1.08
const BTN_PULSE_SPEED = 3
const BTN_PULSE_AMOUNT = 0.03
/**
 * Creates a button with text and animations
 * @param {Object} k - Kaplay inst
 * @param {Object} config - Button configuration
 * @param {string} config.text - Button text
 * @param {number} config.x - X position (button center)
 * @param {number} config.y - Y position (button center)
 * @param {number} [config.width=450] - Button width
 * @param {number} [config.height=90] - Button height
 * @param {Function} config.onClick - Callback function when button is clicked
 * @param {number} [config.textOffsetY=0] - Text vertical offset
 * @returns {Object} Button inst with all properties and elements
 */
export function create(k, config) {
  const {
    text,
    x,
    y,
    width = 450,
    height = 90,
    onClick,
    textOffsetY = 0,
  } = config
  
  // Button shadow
  const buttonShadow = k.add([
    k.rect(width, height, { radius: 12 }),
    k.pos(x + 4, y + 4),
    k.anchor("center"),
    getColor(k, BTN_SHADOW_COLOR),
    k.opacity(0.3),
    k.z(0),
  ])
  
  // Button background
  const button = k.add([
    k.rect(width, height, { radius: 12 }),
    k.pos(x, y),
    k.anchor("center"),
    getColor(k, BTN_COLOR),
    k.outline(6, getRGB(k, BTN_OUTLINE_COLOR)),
    k.area(),
    k.scale(1),
    k.z(1),
    "button",
  ])
  
  // Button text
  const buttonText = k.add([
    k.text(text, { size: BTN_FONT_SIZE }),
    k.pos(x, y + textOffsetY),
    k.anchor("center"),
    getColor(k, BTN_TEXT_COLOR),
    k.outline(3, getRGB(k, BTN_OUTLINE_COLOR)),
    k.z(2),
  ])
  
  // Create button inst
  const inst = {
    k,
    button,
    text: buttonText,
    buttonText,
    shadow: buttonShadow,
    buttonShadow,
    targetScale: 1,
    currentScale: 1,
    pulse: true,
    colorShift: true,
    buttonColor: BTN_COLOR,
    onClick
  }
  
  // Bind event handlers
  button.onHoverUpdate(() => onHoverUpdate(inst))
  button.onHoverEnd(() => onHoverEnd(inst))
  button.onClick(() => onClick(inst))
  k.onUpdate(() => onUpdate(inst))
  
  return inst
}

/**
 * Handle button hover start
 * @param {Object} inst - Button inst
 */
function onHoverUpdate(inst) {
  inst.targetScale = BTN_HOVER_SCALE
  inst.k.setCursor("pointer")
}

/**
 * Handle button hover end
 * @param {Object} inst - Button inst
 */
function onHoverEnd(inst) {
  inst.targetScale = 1
  inst.k.setCursor("default")
}

/**
 * Handle button click
 * @param {Object} inst - Button inst
 */
function onClick(inst) {
  inst?.onClick?.()
}

/**
 * Update button animations (scale, pulse, color)
 * @param {Object} inst - Button inst
 */
function onUpdate(inst) {
  const { k, button, buttonText, buttonShadow, targetScale, currentScale, pulse, colorShift, buttonColor } = inst
  
  // Determine base targetScale
  let baseTargetScale = targetScale
  
  // Add pulse only if not hovering
  if (!button.isHovering() && pulse) {
    baseTargetScale = 1.0 + Math.sin(k.time() * BTN_PULSE_SPEED) * BTN_PULSE_AMOUNT
  }
  
  // Smoothly interpolate to target scale
  inst.currentScale = k.lerp(currentScale, baseTargetScale, 0.2)
  
  // Apply scale to all elements
  button.scale = k.vec2(inst.currentScale)
  buttonText.scale = k.vec2(inst.currentScale)
  buttonShadow.scale = k.vec2(inst.currentScale)
  
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

