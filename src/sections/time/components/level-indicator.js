import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { get } from '../../../utils/progress.js'
import * as Hero from '../../../components/hero.js'

/**
 * Creates time section level indicator (letters "T1ME") with hero and life icons
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.levelNumber - Current level number (1-4)
 * @param {string} config.activeColor - Color for completed levels (hex)
 * @param {string} config.inactiveColor - Color for future levels (hex)
 * @param {string} config.completedColor - Color for already completed levels (hex, default: "#FF8C00" - antiHero color)
 * @param {number} config.topPlatformHeight - Height of top platform
 * @param {number} config.sideWallWidth - Width of side wall
 * @returns {Object} Object with letterObjects, smallHero, and lifeImage
 */
export function create(config) {
  const {
    k,
    levelNumber,
    inactiveColor,
    completedColor = "#FF8C00",  // Default: antiHero color (orange/yellow)
    topPlatformHeight,
    sideWallWidth
  } = config
  const letters = ['T', '1', 'M', 'E']
  const fontSize = 48
  const letterSpacing = -5
  const outlineThickness = 2
  const topMargin = 40  // Margin above game area
  const startX = sideWallWidth  // Aligned with left edge of game area
  const y = topPlatformHeight - fontSize / 2 - topMargin  // Above game area
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
  //
  // Create small hero icon and life.png image in top right corner
  //
  const smallHeroSize = 78  // Increased by 30% (60 * 1.3)
  const lifeImageHeight = 70  // Increased by 30% (30 * 2 * 1.3)
  const spacingBetween = 80  // Spacing between hero and life
  const lifeImageOriginalHeight = 1197  // Original height of life.png
  const rightMargin = 90  // Margin from right edge of game area
  const smallHeroY = topPlatformHeight - fontSize / 2 - topMargin + 7  // Above game area, aligned with T1ME
  //
  // Create small hero (2x smaller, static, time section colors)
  // Check completed sections for hero parts (mouth, arms)
  //
  const isWordComplete = get('word', false)
  const isTouchComplete = get('touch', false)
  //
  // Position hero and life in top right corner, aligned with right edge of game area
  //
  const lifeImageX = k.width() - sideWallWidth - rightMargin - lifeImageHeight / 2  // Life aligned with right game area edge, 80px inset
  const smallHeroX = lifeImageX - spacingBetween - smallHeroSize / 2  // Hero to the left of life
  const smallHero = Hero.create({
    k,
    x: smallHeroX,
    y: smallHeroY,
    type: Hero.HEROES.HERO,
    controllable: false,
    isStatic: true,
    scale: 2.6,
    bodyColor: CFG.visual.colors.hero.body,
    outlineColor: CFG.visual.colors.outline,
    addMouth: isWordComplete,  // Add mouth if word section is complete
    addArms: isTouchComplete  // Add arms if touch section is complete
  })
  smallHero.character.fixed = true  // Fixed position
  smallHero.character.z = CFG.visual.zIndex.ui
  //
  // Load and add life.png image (scaled to 2x size, increased by 30%)
  // Positioned in top right corner
  //
  if (!k.getSprite('life')) {
    k.loadSprite('life', '/life.png')
  }
  const lifeImageScale = (lifeImageHeight / lifeImageOriginalHeight) * 1.3  // Scale increased by 30%
  const lifeImage = k.add([
    k.sprite('life'),
    k.pos(lifeImageX, smallHeroY),  // Same Y as small hero (aligned with T1ME)
    k.scale(lifeImageScale),
    k.anchor('center'),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui)
  ])
  return {
    letterObjects,
    smallHero,
    lifeImage
  }
}

