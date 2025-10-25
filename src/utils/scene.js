import { CFG } from '../cfg.js'
import { getColor } from './helper.js'
import * as Sound from './sound.js'
import * as Spikes from '../components/spike.js'
/**
 * Adds background to the scene
 * @param {Object} k - Kaplay instance
 * @param {String} color - Background color in hex format
 * @returns {Object} Background object
 */
export function addBackground(k, color) {
  return k.add([
    k.rect(k.width(), k.height()),
    getColor(k, color),
    k.pos(0, 0),
    k.fixed(),
    k.z(CFG.visual.zIndex.background)
  ])
}

/**
 * Adds level indicator using spikes (5 spikes showing current level progress)
 * @param {Object} k - Kaplay instance
 * @param {number} levelNumber - Current level number (1-5)
 * @param {string} activeColor - Color for active (completed) levels
 * @param {string} inactiveColor - Color for inactive (not completed) levels
 * @param {number} [customTopHeight] - Custom top platform height (% of screen height)
 * @returns {Array} Array of spike instances
 */
export function addLevelIndicator(k, levelNumber, activeColor, inactiveColor, customTopHeight = null) {
  const topHeight = customTopHeight || CFG.visual.topPlatformHeight
  const topPlatformHeight = k.height() * topHeight / 100
  const sideWallWidth = k.width() * CFG.visual.sideWallWidth / 100
  
  // Calculate width for single spike (1 pyramid)
  const blockSize = Math.max(2, Math.round(k.height() / 250))
  const singleSpikeWidth = 7 * blockSize  // SINGLE_SPIKE_WIDTH_BLOCKS * blockSize
  const spacing = blockSize  // 1 block between pyramid bases
  
  const startX = sideWallWidth + singleSpikeWidth / 2
  // Position spikes above the top platform
  const spikeHeight = 4 * blockSize  // SPIKE_HEIGHT_BLOCKS * blockSize
  const y = topPlatformHeight - spikeHeight / 2 - 4  // Above platform by spike height + 4px
  
  const spikes = []
  for (let i = 0; i < 5; i++) {
    const color = i < levelNumber ? activeColor : inactiveColor
    const spike = Spikes.create({
      k,
      x: startX + i * (singleSpikeWidth + spacing),
      y: y,
      orientation: Spikes.ORIENTATIONS.FLOOR,
      color: color,
      spikeCount: 1  // Single pyramid for indicator
    })
    spike.spike.opacity = 1  // Make spike visible immediately
    spike.spike.z = CFG.visual.zIndex.ui  // Show above platforms
    spikes.push(spike)
  }
  
  return spikes
}
/**
 * Initializes a level with common setup (gravity, sound, background, platforms, camera, instructions, controls)
 * @param {Object} k - Kaplay instance
 * @param {Object} config - Level configuration
 * @param {String} config.backgroundColor - Background color
 * @param {String} config.platformColor - Platform color
 * @param {Number} [config.bottomPlatformHeight] - Custom bottom platform height (% of screen height)
 * @param {Number} [config.topPlatformHeight] - Custom top platform height (% of screen height)
 * @param {Boolean} [config.skipPlatforms] - If true, don't create standard platforms
 * @param {Boolean} [config.showInstructions=false] - If true, show control instructions
 * @returns {Object} Object with sound instance and other utilities
 */
export function initScene(config) {
  const { k, backgroundColor, platformColor, bottomPlatformHeight, topPlatformHeight, skipPlatforms, showInstructions = false } = config
  
  // Set gravity (scaled to screen height for resolution independence)
  k.setGravity(CFG.gameplay.gravityRatio * k.height())
  
  // Create sound instance and start audio context
  const sound = Sound.create()
  
  // Add background
  addBackground(k, backgroundColor)
  
  // Add platforms (unless skipped)
  if (!skipPlatforms) {
    addPlatforms(k, platformColor, bottomPlatformHeight, topPlatformHeight)
  }
  
  // Setup camera
  setupCamera(k)
  
  // Add instructions (only if requested)
  if (showInstructions) {
    addInstructions(k)
  }
  
  // Setup back to menu
  CFG.controls.backToMenu.forEach(key => {
    k.onKeyPress(key, () => k.go("menu"))
  })
  
  return { sound }
}
/**
 * Adds control instructions to the screen
 * @param {Object} k - Kaplay instance
 * @returns {Object} Created instructions object
 */
function addInstructions(k) {
  // Base instruction text (no spaces between arrows)
  const baseText = "AWD/←↑→ - move\nSpace   - jump\nESC     - menu"
  
  // Calculate position: center horizontally, middle of bottom platform
  const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
  const centerX = k.width() / 2
  const bottomY = k.height() - bottomPlatformHeight / 2  // Middle of bottom platform
  
  return k.add([
    k.text(baseText, {
      size: CFG.visual.instructionsFontSize,
      width: k.width() - 40,
      align: "center"
    }),
    k.pos(centerX, bottomY),
    k.anchor("center"),
    getColor(k, CFG.colors['level-1.1'].instructions),  // instructions color
    k.z(CFG.visual.zIndex.ui),
    k.fixed()
  ])
}
/**
 * Sets up fixed camera in the center of the screen
 * @param {Object} k - Kaplay instance
 */
function setupCamera(k) {
  k.onUpdate(() => {
    k.camPos(k.width() / 2, k.height() / 2)
  })
}
/**
 * Adds standard platforms to the level (top, bottom, left wall, right wall)
 * @param {Object} k - Kaplay instance
 * @param {String} color - Platform color in hex format
 * @param {Number} [customBottomHeight] - Custom bottom platform height (% of screen height)
 * @param {Number} [customTopHeight] - Custom top platform height (% of screen height)
 * @returns {Array} Array of platform objects
 */
function addPlatforms(k, color, customBottomHeight, customTopHeight) {
  // Calculate platform dimensions from percentages (use custom or default)
  const bottomPlatformHeight = k.height() * (customBottomHeight || CFG.visual.bottomPlatformHeight) / 100
  const topPlatformHeight = k.height() * (customTopHeight || CFG.visual.topPlatformHeight) / 100
  const sideWallWidth = k.width() * CFG.visual.sideWallWidth / 100
  
  function createPlatform(x, y, width, height) {
    return k.add([
      k.rect(width, height),
      k.pos(x, y),
      k.area(),
      k.body({ isStatic: true }),
      getColor(k, color),
      "platform"
    ])
  }
  
  return [
    // Bottom platform (1/3 of screen height)
    createPlatform(0, k.height() - bottomPlatformHeight, k.width(), bottomPlatformHeight),
    // Top platform (drops down 1/3 of screen height)
    createPlatform(0, 0, k.width(), topPlatformHeight),
    // Left wall (20% from left edge)
    createPlatform(0, topPlatformHeight, sideWallWidth, k.height() - topPlatformHeight - bottomPlatformHeight),
    // Right wall (20% from right edge)
    createPlatform(k.width() - sideWallWidth, topPlatformHeight, sideWallWidth, k.height() - topPlatformHeight - bottomPlatformHeight)
  ]
}