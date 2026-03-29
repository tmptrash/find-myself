import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { get } from '../../../utils/progress.js'
import * as Hero from '../../../components/hero.js'

/**
 * Creates word section level indicator (letters "WORDS") with hero and life icons
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.levelNumber - Current level number (1-5)
 * @param {string} config.activeColor - Color for completed levels (hex)
 * @param {string} config.inactiveColor - Color for future levels (hex)
 * @param {string} [config.heroBodyColor] - Body color for small hero icon (hex), defaults to activeColor
 * @param {number} config.topPlatformHeight - Height of top platform
 * @param {number} config.sideWallWidth - Width of side wall
 * @returns {Object} Object with letterObjects, smallHero, lifeImage, and score update methods
 */
export function create(config) {
  const {
    k,
    levelNumber,
    activeColor,
    inactiveColor,
    heroBodyColor = activeColor,
    topPlatformHeight,
    sideWallWidth
  } = config
  
  const letters = ['W', 'O', 'R', 'D', 'S']
  const fontSize = 48
  const letterSpacing = -5
  const outlineThickness = 2
  const topMargin = 40
  
  const startX = sideWallWidth + 20
  const y = topPlatformHeight - fontSize / 2 - topMargin
  
  const letterObjects = []
  
  letters.forEach((letter, i) => {
    const isActive = i < levelNumber
    const colorHex = isActive ? activeColor : inactiveColor
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
  const smallHeroSize = 78
  const lifeImageHeight = 70
  const spacingBetween = 110
  const lifeImageOriginalHeight = 1197
  const rightMargin = 90
  const smallHeroY = topPlatformHeight - fontSize / 2 - topMargin + 7
  //
  // Check completed sections for hero parts (mouth, arms)
  //
  const isTouchComplete = get('touch', false)
  //
  // Position hero and life in top right corner
  //
  const lifeImageX = k.width() - sideWallWidth - rightMargin - lifeImageHeight / 2
  const smallHeroX = lifeImageX - spacingBetween - smallHeroSize / 2
  const smallHero = Hero.create({
    k,
    x: smallHeroX,
    y: smallHeroY,
    type: Hero.HEROES.HERO,
    controllable: false,
    isStatic: true,
    scale: 2.6,
    bodyColor: heroBodyColor,
    outlineColor: CFG.visual.colors.outline,
    addMouth: true,
    addArms: isTouchComplete
  })
  smallHero.character.fixed = true
  smallHero.character.z = CFG.visual.zIndex.ui
  //
  // Create life image (sprite pre-loaded in index.js)
  //
  const lifeImageScale = (lifeImageHeight / lifeImageOriginalHeight) * 1.3
  const lifeImageData = {
    sprite: k.add([
      k.sprite('life'),
      k.pos(lifeImageX, smallHeroY),
      k.scale(lifeImageScale),
      k.anchor('center'),
      k.fixed(),
      k.z(CFG.visual.zIndex.ui)
    ]),
    pos: { x: lifeImageX, y: smallHeroY }
  }
  //
  // Get score values from localStorage
  //
  const heroScore = get('heroScore', 0)
  const lifeScore = get('lifeScore', 0)
  const scoreOffsetX = 5
  const scoreOffsetY = 10
  const scoreOutlineThickness = 2
  const scoreOffsets = [
    [-scoreOutlineThickness, -scoreOutlineThickness],
    [0, -scoreOutlineThickness],
    [scoreOutlineThickness, -scoreOutlineThickness],
    [-scoreOutlineThickness, 0],
    [scoreOutlineThickness, 0],
    [-scoreOutlineThickness, scoreOutlineThickness],
    [0, scoreOutlineThickness],
    [scoreOutlineThickness, scoreOutlineThickness]
  ]
  const heroScoreOutlines = []
  scoreOffsets.forEach(([dx, dy]) => {
    const outline = k.add([
      k.text(heroScore.toString(), {
        size: fontSize,
        font: CFG.visual.fonts.thinFull.replace(/'/g, '')
      }),
      k.pos(smallHeroX + smallHeroSize / 2 + scoreOffsetX + dx, smallHeroY + scoreOffsetY + dy),
      k.anchor('left'),
      k.color(0, 0, 0),
      k.fixed(),
      k.z(CFG.visual.zIndex.ui)
    ])
    heroScoreOutlines.push(outline)
  })
  const heroScoreText = k.add([
    k.text(heroScore.toString(), {
      size: fontSize,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(smallHeroX + smallHeroSize / 2 + scoreOffsetX, smallHeroY + scoreOffsetY),
    k.anchor('left'),
    k.color(255, 255, 255),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui)
  ])
  const lifeScoreOutlines = []
  scoreOffsets.forEach(([dx, dy]) => {
    const outline = k.add([
      k.text(lifeScore.toString(), {
        size: fontSize,
        font: CFG.visual.fonts.thinFull.replace(/'/g, '')
      }),
      k.pos(lifeImageX + lifeImageHeight / 2 + scoreOffsetX + dx, smallHeroY + scoreOffsetY + dy),
      k.anchor('left'),
      k.color(0, 0, 0),
      k.fixed(),
      k.z(CFG.visual.zIndex.ui)
    ])
    lifeScoreOutlines.push(outline)
  })
  const lifeScoreText = k.add([
    k.text(lifeScore.toString(), {
      size: fontSize,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(lifeImageX + lifeImageHeight / 2 + scoreOffsetX, smallHeroY + scoreOffsetY),
    k.anchor('left'),
    k.color(255, 255, 255),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui)
  ])
  return {
    letterObjects,
    smallHero,
    lifeImage: lifeImageData,
    heroScoreText,
    lifeScoreText,
    lifeScoreOutlines,
    heroScoreOutlines,
    updateHeroScore: (newScore) => {
      heroScoreText.text = newScore.toString()
      heroScoreOutlines.forEach(outline => {
        if (outline.exists && outline.exists()) {
          outline.text = newScore.toString()
        }
      })
    },
    updateLifeScore: (newScore) => {
      lifeScoreText.text = newScore.toString()
      lifeScoreOutlines.forEach(outline => {
        if (outline.exists && outline.exists()) {
          outline.text = newScore.toString()
        }
      })
    }
  }
}

