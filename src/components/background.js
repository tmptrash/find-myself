import { CONFIG } from '../config.js'
import { getColor } from '../utils/helpers.js'

// ============================================
// UNIVERSAL BACKGROUND FOR ALL SCENES
// ============================================

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
    k.z(CONFIG.visual.zIndex.background)
  ])
}
