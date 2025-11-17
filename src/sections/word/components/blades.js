import { CFG } from '../../../cfg.js'
import { getHex } from '../../../utils/helper.js'
import * as Sound from '../../../utils/sound.js'
import * as Hero from '../../../components/hero.js'

//
// Spike parameters
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
 * Get spike height in pixels for current screen resolution
 * @param {Object} k - Kaplay instance
 * @returns {number} Spike height in pixels
 */
export function getSpikeHeight(k) {
  return SPIKE_HEIGHT_BLOCKS * getSpikeBlockSize(k)
}

/**
 * Get spike width in pixels for current screen resolution
 * @param {Object} k - Kaplay instance
 * @returns {number} Spike width in pixels
 */
export function getSpikeWidth(k) {
  const blockSize = getSpikeBlockSize(k)
  return (SINGLE_SPIKE_WIDTH_BLOCKS * SPIKE_COUNT + SPIKE_GAP_BLOCKS * (SPIKE_COUNT - 1)) * blockSize
}

/**
 * Get single spike (pyramid) width in pixels
 * @param {Object} k - Kaplay instance
 * @returns {number} Single spike width in pixels
 */
export function getSingleSpikeWidth(k) {
  const blockSize = getSpikeBlockSize(k)
  return SINGLE_SPIKE_WIDTH_BLOCKS * blockSize
}

/**
 * Creates spikes with collision detection
 * @param {Object} config - Spike configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {Object} [config.hero] - Hero instance (required for collision handling)
 * @param {string} [config.orientation='floor'] - Spike orientation
 * @param {Function} [config.onHit] - Callback when hero hits spikes
 * @param {Object} [config.sfx] - Sound instance for audio effects
 * @param {string} [config.color] - Hex color for the spike (defaults to level spike color)
 * @param {number} [config.spikeCount=3] - Number of spike pyramids to draw
 * @param {number} [config.scale=1] - Scale multiplier for the spike
 * @param {number} [config.zIndex] - Custom z-index (defaults to platforms)
 * @returns {Object} Spikes instance with spike object and state
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
    color = CFG.colors['level-word.1'].spikes,
    spikeCount = 3,
    scale = 1,
    zIndex = CFG.visual.zIndex.platforms
  } = config

  // Calculate dynamic sizes based on screen resolution
  const blockSize = getSpikeBlockSize(k)
  //
  // For text-based blades, calculate actual text dimensions
  //
  const fontSize = 40
  const letterSpacing = 0
  const approximateLetterWidth = fontSize * 0.6
  const spikeWidth = approximateLetterWidth * spikeCount + letterSpacing * (spikeCount - 1) - 8  // Reduce 4px from each side
  const spikeHeight = fontSize - 8  // Reduce 12px from bottom total

  // Load spike sprite with custom color and spike count
  const spriteKey = `spike_${orientation}_${color}_${spikeCount}_v14`
  if (!k.getSprite(spriteKey)) {
    k.loadSprite(spriteKey, createSpikeSprite(orientation, blockSize, color, spikeCount))
  }

  // Determine rotation and collision box based on orientation
  const rotation = getRotation(orientation)
  const collisionSize = getCollisionSize(orientation, spikeWidth, spikeHeight)

  const spike = k.add([
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
    "spike"
  ])

  const inst = {
    spike,
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
  spike.onCollide("player", () => {
    // Only trigger collision if enabled
    if (inst.collisionEnabled) {
      onHit?.(inst)
    }
  })

  return inst
}

/**
 * Loads all spike sprites for different orientations
 * Should be called once on game initialization
 * @param {Object} k - Kaplay instance
 */
export function loadSprites(k) {
  const blockSize = getSpikeBlockSize(k)
  const defaultColor = CFG.colors['level-word.1'].spikes  // Default red color
  const defaultSpikeCount = 3  // Default 3 pyramids
  Object.values(ORIENTATIONS).forEach(orientation => {
    const spriteData = createSpikeSprite(orientation, blockSize, defaultColor, defaultSpikeCount)
    k.loadSprite(`spike_${orientation}`, spriteData)
  })
}

/**
 * Starts the spike animation cycle with delay
 * @param {Object} inst - Spike instance
 * @param {number} delaySeconds - Delay before first appearance
 */
export function startAnimation(inst, delaySeconds = 1) {
  const { spike, k, sfx } = inst
  
  // Wait for initial delay, then start animation cycle
  k.wait(delaySeconds, () => {
    // Don't start animation if spikes were already shown on death
    if (inst.wasShownOnDeath) return
    
    // Play spike sound when spikes start appearing
    sfx && Sound.playSpikeSound(sfx)
    
    spike.onUpdate(() => updateAnimation(inst))
  })
}

/**
 * Shows spikes instantly (used when hero dies)
 * @param {Object} inst - Spike instance
 */
export function show(inst) {
  inst.spike.opacity = 1
  inst.isVisible = true
  inst.wasShownOnDeath = true  // Mark that spikes were shown on death
}

/**
 * Handle spike collision with hero (shows spikes and triggers hero death)
 * @param {Object} inst - Spike instance
 * @param {string} currentLevel - Level to restart on death
 */
export function handleCollision(inst, currentLevel) {
  show(inst)
  Hero.death(inst.hero, () => inst.k.go(currentLevel))
}

/**
 * Update spike animation (fade in, stay visible, fade out once)
 * @param {Object} inst - Spike instance
 */
function updateAnimation(inst) {
  const { spike, k, fadeInDuration, visibleDuration, fadeOutDuration } = inst
  
  // Stop updating if animation is complete
  if (inst.animationComplete) return
  
  inst.animationTimer += k.dt()
  const elapsed = inst.animationTimer
  
  // Phase 1: Fade in
  if (elapsed < fadeInDuration) {
    const progress = elapsed / fadeInDuration
    spike.opacity = progress
    inst.isVisible = true
  }
  // Phase 2: Stay visible
  else if (elapsed < fadeInDuration + visibleDuration) {
    spike.opacity = 1
    inst.isVisible = true
  }
  // Phase 3: Fade out
  else if (elapsed < fadeInDuration + visibleDuration + fadeOutDuration) {
    const fadeOutElapsed = elapsed - fadeInDuration - visibleDuration
    const progress = fadeOutElapsed / fadeOutDuration
    spike.opacity = 1 - progress
    inst.isVisible = progress < 0.5
  }
  // Phase 4: Stay invisible forever
  else {
    spike.opacity = 0
    inst.isVisible = false
    inst.animationComplete = true
  }
}
/**
 * Get spike block size
 * @param {Object} k - Kaplay instance
 * @returns {number} Size of one block in pixels
 */
export function getSpikeBlockSize(k) {
  return SPIKE_BLOCK_SIZE
}
/**
 * Get rotation angle based on orientation
 * @param {string} orientation - Spike orientation
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
 * @param {string} orientation - Spike orientation
 * @param {number} width - Spike width in pixels
 * @param {number} height - Spike height in pixels
 * @returns {Object} Width and height for collision box
 */
function getCollisionSize(orientation, width, height) {
  if (orientation === ORIENTATIONS.LEFT || orientation === ORIENTATIONS.RIGHT) {
    return { width: height, height: width }
  }
  return { width, height }
}

/**
 * Create spike sprite procedurally - renders letters 'A' instead of pyramids
 * @param {string} orientation - Spike orientation
 * @param {number} blockSize - Size of one block in pixels
 * @param {string} color - Hex color string for the spike
 * @param {number} spikeCount - Number of letters to render
 * @returns {string} Base64 encoded sprite data
 */
function createSpikeSprite(orientation, blockSize, color, spikeCount = 3) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  //
  // Font settings
  //
  const fontSize = 40
  const fontFamily = CFG.fonts.thinFull
  const outlineWidth = 2
  const letterSpacing = 0
  
  //
  // Measure text to get dimensions
  //
  ctx.font = `${fontSize}px ${fontFamily}`
  const letterText = 'A'.repeat(spikeCount)
  const metrics = ctx.measureText(letterText)
  const textWidth = metrics.width + (spikeCount - 1) * letterSpacing
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
  for (let i = 0; i < spikeCount; i++) {
    const letterX = baseX + i * (fontSize * 0.6 + letterSpacing)
    offsets.forEach(([offsetX, offsetY]) => {
      ctx.fillText('A', letterX + offsetX, baseY + offsetY)
    })
  }
  
  //
  // Draw main text (colored)
  //
  ctx.fillStyle = getHex(color)
  for (let i = 0; i < spikeCount; i++) {
    const letterX = baseX + i * (fontSize * 0.6 + letterSpacing)
    ctx.fillText('A', letterX, baseY)
  }

  return canvas.toDataURL()
}

