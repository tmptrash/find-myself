import { CONFIG } from '../config.js'
import { getColor } from '../utils/helpers.js'

// ============================================
// CONTROL INSTRUCTIONS FOR LEVELS
// ============================================

/**
 * Adds control instructions to the screen
 * @param {Object} k - Kaplay instance
 * @param {Object} [options] - Additional options
 * @returns {Object} Created instructions object
 */
export function addInstructions(k) {
  // Base instruction text (no spaces between arrows)
  const baseText = "AWD/←↑→ - move\nSpace   - jump\nESC     - menu"
  
  return k.add([
    k.text(baseText, {
      size: CONFIG.visual.instructionsFontSize,
      width: k.width() - 40
    }),
    k.pos(CONFIG.visual.instructionsX, CONFIG.visual.instructionsY),
    getColor(k, CONFIG.colors.level1.instructions),
    k.z(CONFIG.visual.zIndex.ui),
    k.fixed()
  ])
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Sets up return to menu on ESC key press
 * @param {Object} k - Kaplay instance
 */
export function setupBackToMenu(k) {
  CONFIG.controls.backToMenu.forEach(key => {
    k.onKeyPress(key, () => {
      k.go("menu")
    })
  })
}
