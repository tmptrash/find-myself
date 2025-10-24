import { CFG } from '../cfg.js'
import { getHex } from '../utils/helper.js'
import * as Sound from '../utils/sound.js'

// Spike parameters
const SPIKE_COUNT = 3         // Number of triangle spikes
const SPIKE_HEIGHT_BLOCKS = 4 // Height in blocks (pattern: 1, 3, 5, 7)
const SINGLE_SPIKE_WIDTH_BLOCKS = 7  // Width of one spike in blocks (for pattern: 1, 3, 5, 7)
const SPIKE_GAP_BLOCKS = 1    // Gap between spikes in blocks
const SPIKE_SCALE = 1

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
 * Creates spikes with collision detection
 * @param {Object} config - Spike configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {string} [config.orientation='floor'] - Spike orientation
 * @param {Function} [config.onHit] - Callback when hero hits spikes
 * @param {Object} [config.sfx] - Sound instance for audio effects
 * @returns {Object} Spikes instance with spike object and state
 */
export function create(config) {
  const {
    k,
    x,
    y,
    orientation = ORIENTATIONS.FLOOR,
    onHit = null,
    sfx = null
  } = config

  // Calculate dynamic sizes based on screen resolution
  const blockSize = getSpikeBlockSize(k)
  const spikeHeight = SPIKE_HEIGHT_BLOCKS * blockSize
  const spikeWidth = (SINGLE_SPIKE_WIDTH_BLOCKS * SPIKE_COUNT + SPIKE_GAP_BLOCKS * (SPIKE_COUNT - 1)) * blockSize

  // Determine rotation and collision box based on orientation
  const rotation = getRotation(orientation)
  const collisionSize = getCollisionSize(orientation, spikeWidth, spikeHeight)

  const spike = k.add([
    k.sprite(`spike_${orientation}`),
    k.pos(x, y),
    k.area({
      shape: new k.Rect(
        k.vec2(0, 0),
        collisionSize.width,
        collisionSize.height
      )
    }),
    k.anchor("center"),
    k.rotate(rotation),
    k.scale(SPIKE_SCALE),
    k.z(CFG.visual.zIndex.platforms),
    k.opacity(0),
    "spike"
  ])

  const inst = {
    spike,
    k,
    orientation,
    onHit,
    sfx,
    isVisible: false,
    animationTimer: 0,
    fadeInDuration: 0.3,   // Fade-in duration (0.5 seconds)
    visibleDuration: 0.3,  // Stay visible (0.5 seconds)
    fadeOutDuration: 0.3,  // Fade-out duration (0.5 seconds)
    animationComplete: false,
    wasShownOnDeath: false  // Flag to prevent auto-animation if shown on death
  }

  // Setup collision detection with hero (works even when invisible)
  spike.onCollide("player", () => onHit?.(inst))

  return inst
}

/**
 * Loads all spike sprites for different orientations
 * Should be called once on game initialization
 * @param {Object} k - Kaplay instance
 */
export function loadSprites(k) {
  const blockSize = getSpikeBlockSize(k)
  Object.values(ORIENTATIONS).forEach(orientation => {
    const spriteData = createSpikeSprite(orientation, blockSize)
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
 * Calculate spike block size based on screen height
 * Block size scales with screen resolution
 * @param {Object} k - Kaplay instance
 * @returns {number} Size of one block in pixels
 */
function getSpikeBlockSize(k) {
  // Base calculation: screen height / ratio to get proportional block size
  return Math.max(2, Math.round(k.height() / 250))
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
 * Create spike sprite procedurally
 * @param {string} orientation - Spike orientation
 * @param {number} blockSize - Size of one block in pixels
 * @returns {string} Base64 encoded sprite data
 */
function createSpikeSprite(orientation, blockSize) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // Calculate canvas dimensions based on block size
  const spikeHeight = SPIKE_HEIGHT_BLOCKS * blockSize
  const singleSpikeWidth = SINGLE_SPIKE_WIDTH_BLOCKS * blockSize
  const spikeGap = SPIKE_GAP_BLOCKS * blockSize
  const spikeWidth = singleSpikeWidth * SPIKE_COUNT + spikeGap * (SPIKE_COUNT - 1)
  
  // Canvas size based on orientation
  if (orientation === ORIENTATIONS.LEFT || orientation === ORIENTATIONS.RIGHT) {
    canvas.width = spikeHeight
    canvas.height = spikeWidth
  } else {
    canvas.width = spikeWidth
    canvas.height = spikeHeight
  }

  // Use red color for spikes (danger!)
  const spikeColor = getHex(CFG.colors['level-1.1'].spikes)
  ctx.fillStyle = spikeColor

  // Draw pixelated spikes using fillRect for 8-bit style (45° stepped pyramids)
  
  // Draw each spike as stepped pyramid (45° sides, sharp point on top)
  for (let i = 0; i < SPIKE_COUNT; i++) {
    const baseX = i * (singleSpikeWidth + spikeGap)
    const centerX = baseX + singleSpikeWidth / 2
    
    // Calculate number of steps (each step is blockSize high)
    const numSteps = Math.floor(canvas.height / blockSize)
    
    // Draw pyramid from bottom to top, step by step
    for (let step = 0; step < numSteps; step++) {
      const y = step * blockSize
      
      // For 45° angle: each step is 1 block narrower on each side
      const blocksFromEachEdge = step
      const rowWidth = singleSpikeWidth - (blocksFromEachEdge * 2 * blockSize)
      
      // Stop if width becomes zero or negative
      if (rowWidth <= 0) break
      
      // Draw the row of pixels centered
      const startX = baseX + blocksFromEachEdge * blockSize
      const numBlocks = Math.floor(rowWidth / blockSize)
      
      // Draw blocks for this row
      for (let b = 0; b < numBlocks; b++) {
        ctx.fillRect(
          Math.floor(startX + b * blockSize), 
          canvas.height - y - blockSize, 
          blockSize, 
          blockSize
        )
      }
    }
  }

  return canvas.toDataURL()
}

