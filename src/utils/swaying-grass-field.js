import { buildGrassBladeData } from './draw-grass-blade.js'
import {
  MENU_BG_GROUND_Y,
  MENU_BG_HORIZON_LINE_HEIGHT,
  MENU_BG_CANVAS_W
} from './menu-bg-generator.js'

//
// Swaying grass — short blades growing from inside the black horizon
// strip. Each tuft is a cluster of blades that share wind phase but
// have individual offsets so the patch reads as one reacting mass.
//
const GRASS_TUFT_COUNT = 36
const GRASS_TUFT_BLADES_MIN = 10
const GRASS_TUFT_BLADES_RANGE = 14
const GRASS_TUFT_WIDTH_MIN = 18
const GRASS_TUFT_WIDTH_RANGE = 22
const GRASS_TUFT_LEFT_INSET = 30
const GRASS_TUFT_RIGHT_INSET = 30
const GRASS_BLADE_SCALE_MIN = 0.45
const GRASS_BLADE_SCALE_RANGE = 0.3
const GRASS_BASE_R = 60
const GRASS_BASE_G = 85
const GRASS_BASE_B = 40
const GRASS_OPACITY = 0.92
const GRASS_WIND_FREQ = 0.45
const GRASS_WIND_AMP = 1.0

/**
 * Builds a swaying grass field along the menu-bg horizon strip
 * @param {Object} [cfg] - Optional layout overrides
 * @param {number} [cfg.centerX] - Screen centre X for keep-out band
 * @param {number} [cfg.centerKeepoutHalf=0] - Half-width of central exclusion zone (0 = none)
 * @param {number} [cfg.tuftCount=36] - Number of grass tufts to place
 * @returns {{ blades: Object[] }} Grass field state
 */
export function createSwayingGrassField(cfg = {}) {
  const centerX = cfg.centerX ?? MENU_BG_CANVAS_W / 2
  const centerKeepoutHalf = cfg.centerKeepoutHalf ?? 0
  const tuftCount = cfg.tuftCount ?? GRASS_TUFT_COUNT
  const grassY = MENU_BG_GROUND_Y + MENU_BG_HORIZON_LINE_HEIGHT
  const usableLeft = GRASS_TUFT_LEFT_INSET
  const usableRight = MENU_BG_CANVAS_W - GRASS_TUFT_RIGHT_INSET
  const centerMin = centerX - centerKeepoutHalf
  const centerMax = centerX + centerKeepoutHalf
  const blades = []
  let placed = 0
  let attempts = 0
  while (placed < tuftCount && attempts < tuftCount * 8) {
    attempts++
    const tuftCenter = usableLeft + Math.random() * (usableRight - usableLeft)
    if (centerKeepoutHalf > 0 && tuftCenter >= centerMin && tuftCenter <= centerMax) continue
    const tuftWidth = GRASS_TUFT_WIDTH_MIN + Math.random() * GRASS_TUFT_WIDTH_RANGE
    const bladeCount = GRASS_TUFT_BLADES_MIN + Math.floor(Math.random() * GRASS_TUFT_BLADES_RANGE)
    for (let b = 0; b < bladeCount; b++) {
      const offsetT = (Math.random() + Math.random() - 1) * 0.5
      const baseX = tuftCenter + offsetT * tuftWidth
      blades.push(buildGrassBladeData({
        baseX,
        grassY,
        scale: GRASS_BLADE_SCALE_MIN + Math.random() * GRASS_BLADE_SCALE_RANGE,
        baseOpacity: GRASS_OPACITY,
        baseR: GRASS_BASE_R,
        baseG: GRASS_BASE_G,
        baseB: GRASS_BASE_B
      }))
    }
    placed++
  }
  blades.sort((a, b) => a.height - b.height)
  return { blades }
}

/**
 * Draws swaying grass blades for one frame
 * @param {Object} k - Kaplay instance
 * @param {{ blades: Object[] }} field - Grass field from createSwayingGrassField
 */
export function drawSwayingGrassField(k, field) {
  const time = k.time()
  for (const blade of field.blades) {
    const sway = Math.sin(time * (GRASS_WIND_FREQ + blade.swaySpeed * 0.6) + blade.swayOffset) * blade.swayAmount * GRASS_WIND_AMP
    k.drawLine({
      p1: k.vec2(blade.x1, blade.y1),
      p2: k.vec2(blade.baseX2 + sway, blade.y2),
      width: blade.width,
      color: k.rgb(Math.round(blade.color.r), Math.round(blade.color.g), Math.round(blade.color.b)),
      opacity: blade.opacity
    })
  }
}
