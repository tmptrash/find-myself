import { CFG } from '../cfg.js'
//
// Time platform configuration
//
const FONT_SIZE = 48
const TIMER_DURATION = 3  // 3 seconds
const PLATFORM_WIDTH = 140
const PLATFORM_HEIGHT = 48

/**
 * Creates a time platform that disappears when timer reaches zero
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {Object} config.hero - Hero instance to detect collision with
 * @param {boolean} [config.isFake=false] - If true, hero will pass through
 * @param {number} [config.duration=3] - Timer duration in seconds
 * @returns {Object} Time platform instance
 */
export function create(config) {
  const { k, x, y, hero, isFake = false, duration = TIMER_DURATION } = config
  //
  // Create invisible collision box for the platform
  // Fake platforms have no body, so hero passes through
  //
  const platformComponents = [
    k.rect(PLATFORM_WIDTH, PLATFORM_HEIGHT),
    k.pos(x, y),
    k.area(),
    k.anchor("center"),
    k.opacity(0),  // Invisible, only text will be visible
    k.z(15),  // Same as platforms
    "time-platform"  // Tag for identification
  ]
  //
  // Only add body and platform tag if not fake
  //
  if (!isFake) {
    platformComponents.push(k.body({ isStatic: true }))
    platformComponents.push(CFG.game.platformName)
  }
  
  const platform = k.add(platformComponents)
  //
  // Create timer text
  //
  const initialSeconds = Math.ceil(duration)
  const minutes = Math.floor(initialSeconds / 60)
  const secs = initialSeconds % 60
  const initialText = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
  
  //
  // Create timer text with manual outline
  // Draw black outline by creating 8 text objects with offsets
  //
  const outlineOffsets = [
    [-2, -2], [0, -2], [2, -2],
    [-2, 0],           [2, 0],
    [-2, 2],  [0, 2],  [2, 2]
  ]
  
  const outlineTexts = outlineOffsets.map(([ox, oy]) => {
    return k.add([
      k.text(initialText, {
        size: FONT_SIZE,
        font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
        align: "center"
      }),
      k.pos(x + ox, y + oy),
      k.anchor("center"),
      k.color(0, 0, 0),  // Black outline
      k.z(16)  // Above platforms
    ])
  })
  
  const timerText = k.add([
    k.text(initialText, {
      size: FONT_SIZE,
      font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
      align: "center"
    }),
    k.pos(x, y),
    k.anchor("center"),
    k.color(192, 192, 192),  // Light gray (same as hero)
    k.z(16)  // Above platforms
  ])
  
  const inst = {
    k,
    platform,
    timerText,
    outlineTexts,
    hero,
    timeRemaining: duration,
    isActive: false,
    isDestroyed: false,
    wasGroundedLastFrame: false,
    isFake
  }
  
  return inst
}

/**
 * Updates time platform
 * @param {Object} inst - Time platform instance
 */
export function onUpdate(inst) {
  if (inst.isDestroyed) return
  //
  // Check if hero landed on the platform
  //
  if (!inst.isActive && inst.hero && inst.hero.character) {
    const heroChar = inst.hero.character
    const isGrounded = heroChar.isGrounded()
    //
    // Activate timer when hero lands (transitions from air to grounded)
    //
    if (isGrounded && !inst.wasGroundedLastFrame) {
      //
      // Check if hero is actually on THIS platform using collision check
      //
      if (inst.platform.isColliding(heroChar)) {
        inst.isActive = true
      }
    }
    
    inst.wasGroundedLastFrame = isGrounded
  }
  //
  // Update timer if active
  //
  if (inst.isActive && inst.timeRemaining > 0) {
    inst.timeRemaining -= inst.k.dt()
    //
    // Update text
    //
    const seconds = Math.max(0, Math.ceil(inst.timeRemaining))
    const minutes = Math.floor(seconds / 60)
    const secs = seconds % 60
    const newText = `${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    inst.timerText.text = newText
    //
    // Update outline texts
    //
    inst.outlineTexts.forEach(outlineText => {
      outlineText.text = newText
    })
    //
    // Destroy when timer reaches zero
    //
    if (inst.timeRemaining <= 0) {
      destroy(inst)
    }
  }
}

/**
 * Destroys the time platform
 * @param {Object} inst - Time platform instance
 */
function destroy(inst) {
  if (inst.isDestroyed) return
  
  inst.isDestroyed = true
  //
  // Remove platform and text
  //
  if (inst.platform.exists()) {
    inst.k.destroy(inst.platform)
  }
  if (inst.timerText.exists()) {
    inst.k.destroy(inst.timerText)
  }
  //
  // Remove outline texts
  //
  inst.outlineTexts.forEach(outlineText => {
    if (outlineText.exists()) {
      inst.k.destroy(outlineText)
    }
  })
}

