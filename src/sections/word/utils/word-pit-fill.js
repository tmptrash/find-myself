import { CFG } from '../cfg.js'
import { getColor, getHex } from '../../../utils/helper.js'

//
// Above background cover rects (player - 0.5) but below player (player z = 10)
// This makes pit interior show playfield purple even when bottom cover rects are present
//
const PIT_FILL_Z = (CFG.visual.zIndex.player ?? 10) - 0.3

/**
 * Fills a pit shaft or floor gap with the playfield interior color
 * @param {Object} k - Kaplay instance
 * @param {Object} cfg - Pit fill configuration
 * @param {number} cfg.x - Left edge X in pixels
 * @param {number} cfg.width - Width in pixels
 * @param {number} cfg.topY - Top Y of the fill region
 * @param {number} cfg.bottomY - Bottom Y of the fill region
 * @param {string} cfg.playfieldColor - Playfield hex color
 * @param {boolean} [cfg.solidPlatform=false] - Adds static platform collision body
 * @param {number} [cfg.zIndex] - Override Z index (defaults to player-0.3, use a low value to let background layers show on top)
 * @returns {Object|null} Kaplay game object
 */
export function addPitShaftFill(k, cfg) {
  const { x, width, topY, bottomY, playfieldColor, solidPlatform = false, zIndex } = cfg
  const height = Math.max(1, Math.round(bottomY - topY))
  const fillW = Math.max(1, Math.round(width))
  const hex = getHex(playfieldColor ?? CFG.visual.colors.consciousness?.gameWorld ?? '#5A5A70')
  const parts = [
    k.rect(fillW, height),
    getColor(k, hex),
    k.pos(x, topY),
    k.anchor('topleft'),
    k.fixed(),
    k.z(zIndex ?? PIT_FILL_Z),
    k.opacity(1)
  ]
  solidPlatform && parts.push(
    k.area(),
    k.body({ isStatic: true }),
    CFG.game.platformName
  )
  return k.add(parts)
}
