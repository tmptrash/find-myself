import { CFG } from '../cfg.js'
import { getColor } from './helper.js'
import * as Sound from './sound.js'
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
 * Initializes a level with common setup (gravity, sound, background, platforms, camera, instructions, controls)
 * @param {Object} k - Kaplay instance
 * @param {Object} config - Level configuration
 * @param {String} config.backgroundColor - Background color
 * @param {String} config.platformColor - Platform color
 * @returns {Object} Object with sound instance and other utilities
 */
export function initScene(config) {
  const { k, backgroundColor, platformColor } = config
  
  // Set gravity (scaled to screen height for resolution independence)
  k.setGravity(CFG.gameplay.gravityRatio * k.height())
  
  // Create sound instance and start audio context
  const sound = Sound.create()
  
  // Add background
  addBackground(k, backgroundColor)
  
  // Add platforms
  addPlatforms(k, platformColor)
  
  // Setup camera
  setupCamera(k)
  
  // Add instructions
  addInstructions(k)
  
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
  
  return k.add([
    k.text(baseText, {
      size: CFG.visual.instructionsFontSize,
      width: k.width() - 40
    }),
    k.pos(CFG.visual.instructionsX, CFG.visual.instructionsY),
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
 * @returns {Array} Array of platform objects
 */
function addPlatforms(k, color) {
  // Calculate platform dimensions from percentages
  const bottomPlatformHeight = k.height() * CFG.visual.bottomPlatformHeight / 100
  const topPlatformHeight = k.height() * CFG.visual.topPlatformHeight / 100
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