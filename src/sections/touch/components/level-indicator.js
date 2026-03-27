import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { get } from '../../../utils/progress.js'
import * as Hero from '../../../components/hero.js'
//
// Small hero and life icon layout constants
//
const SMALL_HERO_SIZE = 78
const LIFE_IMAGE_HEIGHT = 70
const SPACING_BETWEEN = 110
const LIFE_IMAGE_ORIGINAL_HEIGHT = 1197
const UI_RIGHT_MARGIN = 90
const TOP_OFFSET = 40
const SMALL_HERO_Y_ADJUST = 7
const LIFE_SCALE_FACTOR = 1.3
const SCORE_OFFSET_X = 5
const SCORE_OFFSET_Y = 10
const SCORE_OUTLINE_THICKNESS = 2
/**
 * Creates touch section level indicator (letters "TOUCH") with small hero and life icons
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.levelNumber - Current level number (0-4)
 * @param {string} config.activeColor - Color for completed levels (hex)
 * @param {string} config.inactiveColor - Color for future levels (hex)
 * @param {string} config.completedColor - Color for already completed levels (hex, default: touch antiHero color)
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
    completedColor = CFG.visual.colors.sections.touch.antiHero,
    topPlatformHeight,
    sideWallWidth
  } = config
  const letters = ['T', 'O', 'U', 'C', 'H']
  const fontSize = 48
  const letterSpacing = -5
  const outlineThickness = 2
  const startX = sideWallWidth + 40
  const y = topPlatformHeight + TOP_OFFSET
  const letterObjects = []
  letters.forEach((letter, i) => {
    const letterLevel = i
    //
    // Determine color based on level status:
    // - Completed levels (< current level): use completedColor (touch antiHero color - brown)
    // - Current level: use activeColor (hero color - yellow)
    // - Future levels: use inactiveColor (gray)
    //
    let colorHex
    if (letterLevel < levelNumber) {
      colorHex = completedColor
    } else if (letterLevel === levelNumber) {
      colorHex = activeColor
    } else {
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
  const smallHeroY = topPlatformHeight - fontSize / 2 - TOP_OFFSET + SMALL_HERO_Y_ADJUST
  const isTouchComplete = get('touch', false)
  const lifeImageX = k.width() - sideWallWidth - UI_RIGHT_MARGIN - LIFE_IMAGE_HEIGHT / 2
  const smallHeroX = lifeImageX - SPACING_BETWEEN - SMALL_HERO_SIZE / 2
  const smallHero = Hero.create({
    k,
    x: smallHeroX,
    y: smallHeroY,
    type: Hero.HEROES.HERO,
    controllable: false,
    isStatic: true,
    scale: 2.6,
    bodyColor: activeColor,
    outlineColor: CFG.visual.colors.outline,
    addMouth: true,
    addArms: isTouchComplete
  })
  smallHero.character.fixed = true
  smallHero.character.z = CFG.visual.zIndex.ui
  //
  // Create life image (sprite pre-loaded in index.js)
  //
  const lifeImageScale = (LIFE_IMAGE_HEIGHT / LIFE_IMAGE_ORIGINAL_HEIGHT) * LIFE_SCALE_FACTOR
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
  const scoreOffsets = [
    [-SCORE_OUTLINE_THICKNESS, -SCORE_OUTLINE_THICKNESS],
    [0, -SCORE_OUTLINE_THICKNESS],
    [SCORE_OUTLINE_THICKNESS, -SCORE_OUTLINE_THICKNESS],
    [-SCORE_OUTLINE_THICKNESS, 0],
    [SCORE_OUTLINE_THICKNESS, 0],
    [-SCORE_OUTLINE_THICKNESS, SCORE_OUTLINE_THICKNESS],
    [0, SCORE_OUTLINE_THICKNESS],
    [SCORE_OUTLINE_THICKNESS, SCORE_OUTLINE_THICKNESS]
  ]
  //
  // Hero score outlines (black) and main text (white)
  //
  const heroScoreOutlines = createScoreOutlines(k, heroScore, smallHeroX + SMALL_HERO_SIZE / 2 + SCORE_OFFSET_X, smallHeroY + SCORE_OFFSET_Y, fontSize, scoreOffsets)
  const heroScoreText = createScoreText(k, heroScore, smallHeroX + SMALL_HERO_SIZE / 2 + SCORE_OFFSET_X, smallHeroY + SCORE_OFFSET_Y, fontSize)
  //
  // Life score outlines (black) and main text (white)
  //
  const lifeScoreOutlines = createScoreOutlines(k, lifeScore, lifeImageX + LIFE_IMAGE_HEIGHT / 2 + SCORE_OFFSET_X, smallHeroY + SCORE_OFFSET_Y, fontSize, scoreOffsets)
  const lifeScoreText = createScoreText(k, lifeScore, lifeImageX + LIFE_IMAGE_HEIGHT / 2 + SCORE_OFFSET_X, smallHeroY + SCORE_OFFSET_Y, fontSize)
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
        outline.exists?.() && (outline.text = newScore.toString())
      })
    },
    updateLifeScore: (newScore) => {
      lifeScoreText.text = newScore.toString()
      lifeScoreOutlines.forEach(outline => {
        outline.exists?.() && (outline.text = newScore.toString())
      })
    }
  }
}

/**
 * Creates outlined score text elements (black outlines in 8 directions)
 * @param {Object} k - Kaplay instance
 * @param {number} score - Score value to display
 * @param {number} x - Base X position
 * @param {number} y - Base Y position
 * @param {number} fontSize - Font size in pixels
 * @param {Array} offsets - Array of [dx, dy] offset pairs for outline directions
 * @returns {Array} Array of outline text game objects
 */
function createScoreOutlines(k, score, x, y, fontSize, offsets) {
  return offsets.map(([dx, dy]) => k.add([
    k.text(score.toString(), {
      size: fontSize,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(x + dx, y + dy),
    k.anchor('left'),
    k.color(0, 0, 0),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui)
  ]))
}

/**
 * Creates main score text element (white)
 * @param {Object} k - Kaplay instance
 * @param {number} score - Score value to display
 * @param {number} x - X position
 * @param {number} y - Y position
 * @param {number} fontSize - Font size in pixels
 * @returns {Object} Score text game object
 */
function createScoreText(k, score, x, y, fontSize) {
  return k.add([
    k.text(score.toString(), {
      size: fontSize,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(x, y),
    k.anchor('left'),
    k.color(255, 255, 255),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui)
  ])
}

