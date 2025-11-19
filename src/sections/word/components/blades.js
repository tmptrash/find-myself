import { CFG } from '../../../cfg.js'
import { getHex } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'

//
// Blade parameters
//
const SPIKE_COUNT = 3
const SPIKE_HEIGHT_BLOCKS = 4
const SINGLE_SPIKE_WIDTH_BLOCKS = 7
const SPIKE_GAP_BLOCKS = 1
const SPIKE_SCALE = 1
const SPIKE_BLOCK_SIZE = 4

export const ORIENTATIONS = {
  FLOOR: 'floor',
  CEILING: 'ceiling',
  LEFT: 'left',
  RIGHT: 'right'
}

/**
 * Get blade height in pixels for current screen resolution
 * @param {Object} k - Kaplay instance
 * @returns {number} Blade height in pixels
 */
export function getBladeHeight(k) {
  return SPIKE_HEIGHT_BLOCKS * getBladeBlockSize(k)
}

/**
 * Get blade width in pixels for current screen resolution
 * @param {Object} k - Kaplay instance
 * @returns {number} Blade width in pixels
 */
export function getBladeWidth(k) {
  const blockSize = getBladeBlockSize(k)
  return (SINGLE_SPIKE_WIDTH_BLOCKS * SPIKE_COUNT + SPIKE_GAP_BLOCKS * (SPIKE_COUNT - 1)) * blockSize
}

/**
 * Get single blade (pyramid) width in pixels
 * @param {Object} k - Kaplay instance
 * @returns {number} Single blade width in pixels
 */
export function getSingleBladeWidth(k) {
  const blockSize = getBladeBlockSize(k)
  return SINGLE_SPIKE_WIDTH_BLOCKS * blockSize
}

/**
 * Creates blades with collision detection
 * @param {Object} config - Blade configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {Object} [config.hero] - Hero instance (required for collision handling)
 * @param {string} [config.orientation='floor'] - Blade orientation
 * @param {Function} [config.onHit] - Callback when hero hits blades
 * @param {Object} [config.sfx] - Sound instance for audio effects
 * @param {string} [config.color] - Hex color for the blade (defaults to level blade color)
 * @param {number} [config.bladeCount=3] - Number of blade pyramids to draw
 * @param {number} [config.scale=1] - Scale multiplier for the blade
 * @param {number} [config.zIndex] - Custom z-index (defaults to platforms)
 * @returns {Object} Blades instance with blade object and state
 */
export function create(config) {
  const {
    k,
    x,
    y,
    hero = null,
    orientation = ORIENTATIONS.FLOOR,
    onHit = null,
    sfx = null,
    color = CFG.visual.colors['level-word.1'].blades,
    bladeCount = 3,
    scale = 1,
    zIndex = CFG.visual.zIndex.platforms
  } = config

  // Calculate dynamic sizes based on screen resolution
  const blockSize = getBladeBlockSize(k)
  //
  // For text-based blades, calculate actual text dimensions
  //
  const fontSize = 40
  const letterSpacing = 0
  const approximateLetterWidth = fontSize * 0.6
  const bladeWidth = approximateLetterWidth * bladeCount + letterSpacing * (bladeCount - 1) - 8  // Reduce 4px from each side
  const bladeHeight = fontSize - 8  // Reduce 12px from bottom total

  // Load blade sprite with custom color and blade count
  const spriteKey = `blade_${orientation}_${color}_${bladeCount}_v14`
  if (!k.getSprite(spriteKey)) {
    k.loadSprite(spriteKey, createBladeSprite(orientation, blockSize, color, bladeCount))
  }

  // Determine rotation and collision box based on orientation
  const rotation = getRotation(orientation)
  const collisionSize = getCollisionSize(orientation, bladeWidth, bladeHeight)

  const blade = k.add([
    k.sprite(spriteKey),
    k.pos(x, y),
    k.area({
      shape: new k.Rect(
        k.vec2(0, -8),
        collisionSize.width,
        collisionSize.height
      )
    }),
    k.anchor("center"),
    k.rotate(rotation),
    k.scale(SPIKE_SCALE * scale),
    k.z(zIndex),
    k.opacity(0),
    "blade"
  ])

  const inst = {
    blade,
    k,
    hero,
    orientation,
    onHit,
    sfx,
    isVisible: false,
    animationTimer: 0,
    fadeInDuration: 0.3,   // Fade-in duration (0.5 seconds)
    visibleDuration: 0.3,  // Stay visible (0.5 seconds)
    fadeOutDuration: 0.3,  // Fade-out duration (0.5 seconds)
    animationComplete: false,
    wasShownOnDeath: false,  // Flag to prevent auto-animation if shown on death
    collisionEnabled: true   // Flag to enable/disable collision
  }

  // Setup collision detection with hero (works even when invisible)
  blade.onCollide("player", () => {
    // Only trigger collision if enabled
    if (inst.collisionEnabled) {
      onHit?.(inst)
    }
  })

  return inst
}

/**
 * Loads all blade sprites for different orientations
 * Should be called once on game initialization
 * @param {Object} k - Kaplay instance
 */
export function loadSprites(k) {
  const blockSize = getBladeBlockSize(k)
  const defaultColor = CFG.visual.colors['level-word.1'].blades  // Default red color
  const defaultBladeCount = 3  // Default 3 pyramids
  Object.values(ORIENTATIONS).forEach(orientation => {
    const spriteData = createBladeSprite(orientation, blockSize, defaultColor, defaultBladeCount)
    k.loadSprite(`blade_${orientation}`, spriteData)
  })
}

/**
 * Starts the blade animation cycle with delay
 * @param {Object} inst - Blade instance
 * @param {number} delaySeconds - Delay before first appearance
 */
export function startAnimation(inst, delaySeconds = 1) {
  const { blade, k, sfx } = inst
  
  // Wait for initial delay, then start animation cycle
  k.wait(delaySeconds, () => {
    // Don't start animation if blades were already shown on death
    if (inst.wasShownOnDeath) return
    
    // Play blade sound when blades start appearing
    sfx && Sound.playBladeSound(sfx)
    
    blade.onUpdate(() => updateAnimation(inst))
  })
}

/**
 * Shows blades instantly (used when hero dies)
 * @param {Object} inst - Blade instance
 */
export function show(inst) {
  inst.blade.opacity = 1
  inst.isVisible = true
  inst.wasShownOnDeath = true  // Mark that blades were shown on death
}

/**
 * Handle blade collision with hero (shows blades and triggers hero death)
 * @param {Object} inst - Blade instance
 * @param {string} currentLevel - Level to restart on death
 */
export function handleCollision(inst, currentLevel) {
  show(inst)
  Hero.death(inst.hero, () => inst.k.go(currentLevel))
}

/**
 * Update blade animation (fade in, stay visible, fade out once)
 * @param {Object} inst - Blade instance
 */
function updateAnimation(inst) {
  const { blade, k, fadeInDuration, visibleDuration, fadeOutDuration } = inst
  
  // Stop updating if animation is complete
  if (inst.animationComplete) return
  
  inst.animationTimer += k.dt()
  const elapsed = inst.animationTimer
  
  // Phase 1: Fade in
  if (elapsed < fadeInDuration) {
    const progress = elapsed / fadeInDuration
    blade.opacity = progress
    inst.isVisible = true
  }
  // Phase 2: Stay visible
  else if (elapsed < fadeInDuration + visibleDuration) {
    blade.opacity = 1
    inst.isVisible = true
  }
  // Phase 3: Fade out
  else if (elapsed < fadeInDuration + visibleDuration + fadeOutDuration) {
    const fadeOutElapsed = elapsed - fadeInDuration - visibleDuration
    const progress = fadeOutElapsed / fadeOutDuration
    blade.opacity = 1 - progress
    inst.isVisible = progress < 0.5
  }
  // Phase 4: Stay invisible forever
  else {
    blade.opacity = 0
    inst.isVisible = false
    inst.animationComplete = true
  }
}
/**
 * Get blade block size
 * @param {Object} k - Kaplay instance
 * @returns {number} Size of one block in pixels
 */
export function getBladeBlockSize(k) {
  return SPIKE_BLOCK_SIZE
}
/**
 * Get rotation angle based on orientation
 * @param {string} orientation - Blade orientation
 * @returns {number} Rotation angle in degrees
 */
function getRotation(orientation) {
  switch (orientation) {
    case ORIENTATIONS.FLOOR:
      return 0
    case ORIENTATIONS.CEILING:
      return 180
    case ORIENTATIONS.LEFT:
      return 270
    case ORIENTATIONS.RIGHT:
      return 90
    default:
      return 0
  }
}

/**
 * Get collision box size based on orientation
 * @param {string} orientation - Blade orientation
 * @param {number} width - Blade width in pixels
 * @param {number} height - Blade height in pixels
 * @returns {Object} Width and height for collision box
 */
function getCollisionSize(orientation, width, height) {
  if (orientation === ORIENTATIONS.LEFT || orientation === ORIENTATIONS.RIGHT) {
    return { width: height, height: width }
  }
  return { width, height }
}

/**
 * Create blade sprite procedurally - renders letters 'A' instead of pyramids
 * @param {string} orientation - Blade orientation
 * @param {number} blockSize - Size of one block in pixels
 * @param {string} color - Hex color string for the blade
 * @param {number} bladeCount - Number of letters to render
 * @returns {string} Base64 encoded sprite data
 */
function createBladeSprite(orientation, blockSize, color, bladeCount = 3) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  //
  // Font settings
  //
  const fontSize = 40
  const fontFamily = CFG.visual.fonts.thinFull
  const outlineWidth = 2
  const letterSpacing = 0
  
  //
  // Measure text to get dimensions
  //
  ctx.font = `${fontSize}px ${fontFamily}`
  const letterText = 'A'.repeat(bladeCount)
  const metrics = ctx.measureText(letterText)
  const textWidth = metrics.width + (bladeCount - 1) * letterSpacing
  const textHeight = fontSize * 1.4
  
  //
  // Set canvas size with padding for outline
  //
  const padding = outlineWidth * 4
  canvas.width = textWidth + padding * 2
  canvas.height = textHeight + padding * 2
  
  //
  // Set text rendering properties
  //
  ctx.font = `${fontSize}px ${fontFamily}`
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'
  
  const baseX = padding
  const baseY = canvas.height - padding - 12
  
  //
  // Draw black outline by rendering text multiple times with offset
  //
  const offsets = [
    [-outlineWidth, -outlineWidth],
    [0, -outlineWidth],
    [outlineWidth, -outlineWidth],
    [-outlineWidth, 0],
    [outlineWidth, 0],
    [-outlineWidth, outlineWidth],
    [0, outlineWidth],
    [outlineWidth, outlineWidth]
  ]
  
  ctx.fillStyle = '#000000'
  for (let i = 0; i < bladeCount; i++) {
    const letterX = baseX + i * (fontSize * 0.6 + letterSpacing)
    offsets.forEach(([offsetX, offsetY]) => {
      ctx.fillText('A', letterX + offsetX, baseY + offsetY)
    })
  }
  
  //
  // Draw main text (colored)
  //
  ctx.fillStyle = getHex(color)
  for (let i = 0; i < bladeCount; i++) {
    const letterX = baseX + i * (fontSize * 0.6 + letterSpacing)
    ctx.fillText('A', letterX, baseY)
  }

  return canvas.toDataURL()
}

