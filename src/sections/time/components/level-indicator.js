import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { get } from '../../../utils/progress.js'

/**
 * Creates time section level indicator (letters "T1ME")
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.levelNumber - Current level number (1-4)
 * @param {string} config.activeColor - Color for completed levels (hex)
 * @param {string} config.inactiveColor - Color for future levels (hex)
 * @param {string} config.completedColor - Color for already completed levels (hex, default: "#FF8C00" - antiHero color)
 * @param {number} config.topPlatformHeight - Height of top platform
 * @param {number} config.sideWallWidth - Width of side wall
 * @returns {Array} Array of letter objects
 */
export function create(config) {
  const {
    k,
    levelNumber,
    activeColor,
    inactiveColor,
    completedColor = "#FF8C00",  // Default: antiHero color (orange/yellow)
    topPlatformHeight,
    sideWallWidth
  } = config
  //
  // Get last completed level from progress
  //
  const lastLevel = get('lastLevel', null)
  const lastLevelNumber = lastLevel ? parseInt(lastLevel.split('.')[1]) : 0
  
  const letters = ['T', '1', 'M', 'E']
  const fontSize = 48
  const letterSpacing = -5
  const outlineThickness = 2
  
  const startX = sideWallWidth + 20
  const y = topPlatformHeight - fontSize - 10
  
  const letterObjects = []
  
  letters.forEach((letter, i) => {
    const letterLevel = i + 1
    //
    // Determine color based on level status:
    // - Completed and current: use completedColor (yellow/antiHero color)
    // - Future: use inactiveColor (gray)
    //
    let colorHex
    if (letterLevel <= levelNumber) {
      //
      // Completed levels (including current)
      //
      colorHex = completedColor
    } else {
      //
      // Future levels
      //
      colorHex = inactiveColor
    }
    //
    // Calculate x position for this letter
    //
    const letterX = startX + i * (fontSize + letterSpacing)
    //
    // Create outline (8 directions)
    //
    const offsets = [
      [-outlineThickness, -outlineThickness],
      [0, -outlineThickness],
      [outlineThickness, -outlineThickness],
      [-outlineThickness, 0],
      [outlineThickness, 0],
      [-outlineThickness, outlineThickness],
      [0, outlineThickness],
      [outlineThickness, outlineThickness]
    ]
    
    offsets.forEach(([dx, dy]) => {
      k.add([
        k.text(letter, {
          size: fontSize,
          font: CFG.visual.fonts.thinFull.replace(/'/g, '')
        }),
        k.pos(letterX + dx, y + dy),
        k.color(0, 0, 0),
        k.z(CFG.visual.zIndex.ui)
      ])
    })
    //
    // Create main letter
    //
    const {r, g, b} = getRGB(k, colorHex)
    const mainLetter = k.add([
      k.text(letter, {
        size: fontSize,
        font: CFG.visual.fonts.thinFull.replace(/'/g, '')
      }),
      k.pos(letterX, y),
      k.color(r, g, b),
      k.z(CFG.visual.zIndex.ui)
    ])
    
    letterObjects.push(mainLetter)
  })
  
  return letterObjects
}

