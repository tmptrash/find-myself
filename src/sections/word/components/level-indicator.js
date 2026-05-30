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
  const lifeImageHeight = 120
  const spacingBetween = 110
  const lifeImageOriginalHeight = 1197
  const rightMargin = 70
  const smallHeroY = topPlatformHeight - fontSize / 2 - topMargin + 10
  //
  // Check completed sections for hero parts (mouth, arms)
  //
  const isWordComplete = get('word.completed', false)
  const isTouchComplete = get('touch.completed', false)
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
    scale: 2.6 / 3,
    bodyColor: heroBodyColor,
    outlineColor: CFG.visual.colors.outline,
    addMouth: isWordComplete,
    addArms: isTouchComplete,
    addWatch: true,
    //
    // HUD indicator hero is purely decorative — never whistles or emits
    // floating notes during gameplay.
    //
    idleVocalization: null
  })
  smallHero.character.fixed = true
  smallHero.character.z = CFG.visual.zIndex.ui
  //
  // Create life image (sprite pre-loaded in index.js)
  //
  const lifeImageScale = (lifeImageHeight / lifeImageOriginalHeight) * 1.3
  //
  // Lower the life icon a bit further below the small hero (UI polish)
  //
  const LIFE_IMAGE_Y_OFFSET = 8
//
// Trap count badge on life icon (same layout as touch section)
//
const TRAP_BADGE_OFFSET_X = 45
const TRAP_BADGE_OFFSET_Y = 30
const TRAP_BADGE_FONT_SIZE = 20
const TRAP_BADGE_COLOR_R = 200
const TRAP_BADGE_COLOR_G = 60
const TRAP_BADGE_COLOR_B = 60
const TRAP_BADGE_OUTLINE_THICKNESS = 2
  const lifeImageData = {
    sprite: k.add([
      k.sprite('life'),
      k.pos(lifeImageX + 12, smallHeroY + LIFE_IMAGE_Y_OFFSET),
      k.scale(lifeImageScale),
      k.anchor('center'),
      k.fixed(),
      k.z(CFG.visual.zIndex.ui)
    ]),
    pos: { x: lifeImageX, y: smallHeroY + LIFE_IMAGE_Y_OFFSET }
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
  //
  // Trap count badge with outline (bold red number on life icon)
  //
  const trapBadgeX = lifeImageX + TRAP_BADGE_OFFSET_X
  const trapBadgeY = smallHeroY + LIFE_IMAGE_Y_OFFSET + TRAP_BADGE_OFFSET_Y
  const trapBadgeFont = CFG.visual.fonts.regularFull
    ? CFG.visual.fonts.regularFull.replace(/'/g, '')
    : CFG.visual.fonts.thinFull.replace(/'/g, '')
  const trapBadgeOutlineOffsets = [
    [-TRAP_BADGE_OUTLINE_THICKNESS, -TRAP_BADGE_OUTLINE_THICKNESS],
    [0, -TRAP_BADGE_OUTLINE_THICKNESS],
    [TRAP_BADGE_OUTLINE_THICKNESS, -TRAP_BADGE_OUTLINE_THICKNESS],
    [-TRAP_BADGE_OUTLINE_THICKNESS, 0],
    [TRAP_BADGE_OUTLINE_THICKNESS, 0],
    [-TRAP_BADGE_OUTLINE_THICKNESS, TRAP_BADGE_OUTLINE_THICKNESS],
    [0, TRAP_BADGE_OUTLINE_THICKNESS],
    [TRAP_BADGE_OUTLINE_THICKNESS, TRAP_BADGE_OUTLINE_THICKNESS]
  ]
  const trapBadgeOutlines = trapBadgeOutlineOffsets.map(([dx, dy]) => k.add([
    k.text('', { size: TRAP_BADGE_FONT_SIZE, font: trapBadgeFont }),
    k.pos(trapBadgeX + dx, trapBadgeY + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 1)
  ]))
  const trapBadgeText = k.add([
    k.text('', { size: TRAP_BADGE_FONT_SIZE, font: trapBadgeFont }),
    k.pos(trapBadgeX, trapBadgeY),
    k.anchor('center'),
    k.color(TRAP_BADGE_COLOR_R, TRAP_BADGE_COLOR_G, TRAP_BADGE_COLOR_B),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 2)
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
    },
    updateTrapCount: (count) => {
      const val = count > 0 ? count.toString() : ''
      trapBadgeText.text = val
      trapBadgeOutlines.forEach(o => { o.exists?.() && (o.text = val) })
    }
  }
}

