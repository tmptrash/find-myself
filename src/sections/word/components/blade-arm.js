import { CFG } from '../cfg.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'

// Blade arm parameters
const EXTENSION_DURATION = 1.0  // Duration of extension animation (seconds)
const PAUSE_DURATION = 1.0  // Duration of pause between extensions (seconds)
const TEXT_MESSAGE = '⟪ words that kill ⟫'
const TEXT_SIZE = 36
const OUTLINE_THICKNESS = 2

/**
 * Creates a blade arm text that extends from the left side of the screen
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.y - Y position (center of text)
 * @param {Object} config.hero - Hero instance for collision detection
 * @param {Object} [config.sfx] - Sound instance
 * @param {string} config.currentLevel - Current level name for restart
 * @returns {Object} Blade arm instance
 */
export function create(config) {
  const { k, y, hero, sfx = null, currentLevel } = config
  
  const sideWallWidth = 192  // Side walls width (10% of 1920)
  
  // Start position: right edge of left wall (text will slide from behind the wall)
  const startX = sideWallWidth
  
  // Calculate maximum width (from left wall to right wall)
  const screenWidth = CFG.visual.screen.width  // 1920
  const maxWidth = screenWidth - sideWallWidth * 2  // Distance between walls
  
  // Create a temporary text to measure full width
  const tempText = k.add([
    k.text(TEXT_MESSAGE, {
      size: TEXT_SIZE,
      font: CFG.visual.fonts.thin
    }),
    k.pos(-10000, -10000),  // Off-screen
    k.opacity(0)
  ])
  const fullTextWidth = tempText.width
  tempText.destroy()
  
  // Calculate how much to extend per step (based on text width)
  const extensionStep = fullTextWidth / 5  // Extend in 5 steps (faster movement)
  
  // Create container for all text elements (z-index below platforms so text appears from behind)
  const textContainer = k.add([
    k.pos(startX - fullTextWidth, y),
    k.z(CFG.visual.zIndex.platforms - 1)
  ])
  
  // Create 8 outline text objects (black, offset in all directions)
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
    const outlineText = textContainer.add([
      k.text(TEXT_MESSAGE, {
        size: TEXT_SIZE,
        font: CFG.visual.fonts.thin
      }),
      k.pos(dx, dy),
      k.color(0, 0, 0),
      k.opacity(0)
    ])
    textObjects.push(outlineText)
  })
  
  // Create main text (steel blue)
  const mainText = textContainer.add([
    k.text(TEXT_MESSAGE, {
      size: TEXT_SIZE,
      font: CFG.visual.fonts.thin
    }),
    k.pos(0, 0),
    k.color(107, 142, 159),
    k.opacity(0)
  ])
  textObjects.push(mainText)
  
  // Create collision area (z-index below platforms but collision still works)
  // Height matches text size with small padding for outline
  const collisionHeight = TEXT_SIZE + OUTLINE_THICKNESS * 2
  const collisionArea = k.add([
    k.pos(startX, y),
    k.rect(0, collisionHeight),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms - 1),
    "blade-arm-text"
  ])
  
  const inst = {
    k,
    textContainer,
    textObjects,
    collisionArea,
    hero,
    sfx,
    currentLevel,
    state: 'initial_pause',  // initial_pause, extending or paused
    timer: 0,
    startX,
    currentWidth: 0,  // Current visible width
    targetWidth: extensionStep,  // Target width for current extension
    extensionStep,
    fullTextWidth,
    maxWidth,  // Maximum width to right wall
    soundPlayed: false  // Track if sound was played for current extension
  }
  
  // Start the animation cycle
  collisionArea.onUpdate(() => updateBladeArm(inst))
  
  // Handle collision with text
  collisionArea.onCollide("player", () => handleCollision(inst))
  
  return inst
}

/**
 * Handle collision with blade arm
 * @param {Object} inst - Blade arm instance
 */
function handleCollision(inst) {
  Hero.death(inst.hero, () => inst.k.go(inst.currentLevel))
}

/**
 * Update blade arm animation (extends in bursts with pauses)
 * @param {Object} inst - Blade arm instance
 */
function updateBladeArm(inst) {
  //
  // Stop animation and sound if hero is annihilating
  //
  if (inst.hero.isAnnihilating) {
    return
  }
  
  const { k, sfx, extensionStep, fullTextWidth } = inst
  
  inst.timer += k.dt()
  
  if (inst.state === 'initial_pause') {
    // Initial pause: wait 1 second before first extension
    if (inst.timer >= 1.0) {
      inst.state = 'extending'
      inst.timer = 0
    }
  } else if (inst.state === 'extending') {
    // Extending phase: grow visible width over EXTENSION_DURATION
    const progress = Math.min(1, inst.timer / EXTENSION_DURATION)
    
    // Play slow sliding sound at the start of each extension
    if (!inst.soundPlayed && sfx) {
      Sound.playTextSlideSound(sfx)
      inst.soundPlayed = true
    }
    
    // Smoothly interpolate from current width to target width
    const startWidth = inst.targetWidth - extensionStep
    inst.currentWidth = startWidth + (extensionStep * progress)
    
    // Update collision area width
    inst.collisionArea.width = inst.currentWidth
    
    // Move text container to create sliding effect
    inst.textContainer.pos.x = inst.startX - inst.fullTextWidth + inst.currentWidth
    
    // Show text when animation starts
    updateTextVisibility(inst)
    
    // When extension completes, switch to pause
    if (progress >= 1) {
      inst.state = 'paused'
      inst.timer = 0
    }
  } else if (inst.state === 'paused') {
    // Paused phase: wait for PAUSE_DURATION
    if (inst.timer >= PAUSE_DURATION) {
      // Check if we've reached the right wall
      if (inst.currentWidth < inst.maxWidth) {
        inst.state = 'extending'
        inst.timer = 0
        inst.targetWidth += extensionStep  // Set new target for next extension
        inst.soundPlayed = false  // Reset sound flag for next extension
      }
    }
  }
}

/**
 * Update text visibility
 * @param {Object} inst - Blade arm instance
 */
function updateTextVisibility(inst) {
  const { textObjects, currentWidth } = inst
  
  // Show text when there's visible width
  textObjects.forEach(textObj => {
    textObj.opacity = currentWidth > 0 ? 1 : 0
  })
}

