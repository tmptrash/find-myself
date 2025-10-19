import { getColor, getRGB, parseHex } from '../utils/helpers.js'
/**
 * All buttons should be the same, so we incapsulate their properties inside
 * this module. It should not be in a global config.
 */
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
    k.color(getRGB(k, BTN_COLOR)),
    getColor(k, BTN_COLOR),
    k.outline(6, getRGB(k, BTN_OUTLINE_COLOR)),
    k.area(),
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
    onClick
  }
  
  // Bind event handlers
  button.onHoverUpdate(() => onHoverUpdate(inst))
  button.onHoverEnd(() => onHoverEnd(inst))
  button.onClick(() => inst?.onClick?.())
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
 * Update button animations (scale, pulse, color)
 * @param {Object} inst - Button inst
 */
function onUpdate(inst) {
  const { k, button, buttonText, buttonShadow, targetScale, currentScale, pulse } = inst
  
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
}

