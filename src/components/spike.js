import { CFG } from '../cfg.js'
import { getHex, getColor } from '../utils/helper.js'

// Spike parameters
const SPIKE_WIDTH = 100       // Width that hero can jump over
const SPIKE_HEIGHT = 20       // Height of spikes
const SPIKE_COUNT = 4         // Number of triangle spikes
const SPIKE_SCALE = 1

export const ORIENTATIONS = {
  FLOOR: 'floor',
  CEILING: 'ceiling',
  LEFT: 'left',
  RIGHT: 'right'
}

/**
 * Creates spikes with collision detection
 * @param {Object} config - Spike configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.x - X position
 * @param {number} config.y - Y position
 * @param {string} [config.orientation='floor'] - Spike orientation
 * @param {Function} [config.onHit] - Callback when hero hits spikes
 * @returns {Object} Spikes instance with spike object and state
 */
export function create(config) {
  const {
    k,
    x,
    y,
    orientation = ORIENTATIONS.FLOOR,
    onHit = null
  } = config

  // Determine rotation and collision box based on orientation
  const rotation = getRotation(orientation)
  const collisionSize = getCollisionSize(orientation)

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
    "spike"
  ])

  const inst = {
    spike,
    k,
    orientation,
    onHit
  }

  // Setup collision detection with hero
  spike.onCollide("player", () => onHit?.(inst))

  return inst
}

/**
 * Loads all spike sprites for different orientations
 * Should be called once on game initialization
 * @param {Object} k - Kaplay instance
 */
export function loadSprites(k) {
  Object.values(ORIENTATIONS).forEach(orientation => {
    const spriteData = createSpikeSprite(orientation)
    k.loadSprite(`spike_${orientation}`, spriteData)
  })
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
 * @returns {Object} Width and height for collision box
 */
function getCollisionSize(orientation) {
  if (orientation === ORIENTATIONS.LEFT || orientation === ORIENTATIONS.RIGHT) {
    return { width: SPIKE_HEIGHT, height: SPIKE_WIDTH }
  }
  return { width: SPIKE_WIDTH, height: SPIKE_HEIGHT }
}

/**
 * Create spike sprite procedurally
 * @param {string} orientation - Spike orientation
 * @returns {string} Base64 encoded sprite data
 */
function createSpikeSprite(orientation) {
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  
  // Canvas size based on orientation
  if (orientation === ORIENTATIONS.LEFT || orientation === ORIENTATIONS.RIGHT) {
    canvas.width = SPIKE_HEIGHT
    canvas.height = SPIKE_WIDTH
  } else {
    canvas.width = SPIKE_WIDTH
    canvas.height = SPIKE_HEIGHT
  }

  // Use platform color for spikes
  const spikeColor = getHex(CFG.colors.level1.platform)

  // Draw all spikes as one continuous path (no gaps between spikes)
  const spikeWidth = canvas.width / SPIKE_COUNT
  
  // Create single path for all spikes
  ctx.beginPath()
  ctx.moveTo(0, canvas.height)  // Start at bottom left
  
  // Draw zigzag pattern for all spikes
  for (let i = 0; i < SPIKE_COUNT; i++) {
    const x = i * spikeWidth
    ctx.lineTo(x + spikeWidth / 2, 0)  // Up to peak
    ctx.lineTo(x + spikeWidth, canvas.height)  // Down to base
  }
  
  // Explicitly draw along the bottom to close the shape
  ctx.lineTo(canvas.width, canvas.height)  // Move along bottom edge to right
  ctx.lineTo(0, canvas.height)  // Move along bottom edge to start
  ctx.closePath()  // Close path back to start
  
  // Fill with spike color (no outline)
  ctx.fillStyle = spikeColor
  ctx.fill()

  return canvas.toDataURL()
}

