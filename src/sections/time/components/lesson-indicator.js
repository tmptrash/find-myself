import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { get } from '../../../utils/progress.js'
import * as Hero from '../../../components/hero.js'
//
// Unified gray for every HUD numeral/label in the time section.
// Matches the neutral grey used by the FPS counter (fps-counter.js: #B0B0B0).
//
const HUD_GRAY_R = 176
const HUD_GRAY_G = 176
const HUD_GRAY_B = 176

/**
 * Creates time section level indicator (letters "T1ME") with hero and life icons
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.levelNumber - Current level number (1-4)
 * @param {string} config.activeColor - Color for completed levels (hex)
 * @param {string} config.inactiveColor - Color for future levels (hex)
 * @param {string} config.completedColor - Color for already completed levels (hex, default: "#FF8C00" - antiHero color)
 * @param {string} [config.heroBodyColor] - Body color for small hero icon (hex), defaults to global hero body
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
    heroBodyColor = CFG.visual.colors.hero.body,
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
    //
    // Completed and current levels use the orange/yellow completedColor;
    // future levels stay in unified HUD gray.
    //
    const isCompleted = letterLevel <= levelNumber
    const letterX = startX + i * (fontSize + letterSpacing)
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
    const letterColor = isCompleted ? getRGB(k, completedColor) : { r: HUD_GRAY_R, g: HUD_GRAY_G, b: HUD_GRAY_B }
    const mainLetter = k.add([
      k.text(letter, {
        size: fontSize,
        font: CFG.visual.fonts.thinFull.replace(/'/g, '')
      }),
      k.pos(letterX, y),
      k.color(letterColor.r, letterColor.g, letterColor.b),
      k.z(CFG.visual.zIndex.ui)
    ])
    letterObjects.push(mainLetter)
  })
  //
  // Create small hero icon and life.png image in top right corner
  //
  const smallHeroSize = 78  // Increased by 30% (60 * 1.3)
  const lifeImageHeight = 120
  const spacingBetween = 120
  const lifeImageOriginalHeight = 1197
  const rightMargin = 70
  const smallHeroY = topPlatformHeight - fontSize / 2 - topMargin + 10
  //
  // Create small hero (2x smaller, static, time section colors)
  // Check completed sections for hero parts (mouth, arms)
  //
  const isWordComplete = get('word.completed', false)
  const isTouchComplete = get('touch.completed', false)
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
    scale: 2.6 / 3,
    bodyColor: heroBodyColor,
    outlineColor: CFG.visual.colors.outline,
    addMouth: isWordComplete,  // Add mouth if word section is complete
    addArms: isTouchComplete,  // Add arms if touch section is complete
    //
    // HUD indicator hero is purely decorative — never whistles or emits
    // floating notes during gameplay.
    //
    idleVocalization: null
  })
  smallHero.character.fixed = true  // Fixed position
  smallHero.character.z = CFG.visual.zIndex.ui
  //
  //
  // Create life image (sprite pre-loaded in index.js)
  //
  const lifeImageScale = (lifeImageHeight / lifeImageOriginalHeight) * 1.3
  //
  // Lower the life icon a bit further below the small hero (UI polish)
  //
  const LIFE_IMAGE_Y_OFFSET = 8
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
  //
  // Add hero score text (to the right of small hero, closer, with black outline)
  //
  const scoreOffsetX = 5  // Offset from hero/life image (reduced from 15)
  const scoreOffsetY = 10  // Vertical offset down from hero/life center
  const scoreOutlineThickness = 2  // Outline thickness for score text
  //
  // Score drop shadow (single black copy offset right+down, glow-level
  // style) — references stored to update later
  //
  const scoreOffsets = [[scoreOutlineThickness, scoreOutlineThickness]]
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
  //
  // Add main hero score text
  //
  const heroScoreText = k.add([
    k.text(heroScore.toString(), {
      size: fontSize,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(smallHeroX + smallHeroSize / 2 + scoreOffsetX, smallHeroY + scoreOffsetY),
    k.anchor('left'),
    k.color(HUD_GRAY_R, HUD_GRAY_G, HUD_GRAY_B),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui)
  ])
  //
  // Life score drop shadow — same single-offset style, references stored
  //
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
  //
  // Add main life score text
  //
  const lifeScoreText = k.add([
    k.text(lifeScore.toString(), {
      size: fontSize,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(lifeImageX + lifeImageHeight / 2 + scoreOffsetX, smallHeroY + scoreOffsetY),
    k.anchor('left'),
    k.color(HUD_GRAY_R, HUD_GRAY_G, HUD_GRAY_B),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui)
  ])
  //
  // Trap count badge with outline (bold red number right of life icon)
  //
  const trapBadgeX = lifeImageX + 45
  const trapBadgeY = smallHeroY + 30
  const trapBadgeSize = 20
  const trapBadgeFont = CFG.visual.fonts.regularFull
    ? CFG.visual.fonts.regularFull.replace(/'/g, '')
    : CFG.visual.fonts.thinFull.replace(/'/g, '')
  //
  // Drop shadow (single black copy offset right+down), glow-level style.
  //
  const trapOutlineOffsets = [[2, 2]]
  const trapBadgeOutlines = trapOutlineOffsets.map(([dx, dy]) => k.add([
    k.text('', { size: trapBadgeSize, font: trapBadgeFont }),
    k.pos(trapBadgeX + dx, trapBadgeY + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 1)
  ]))
  const trapBadgeText = k.add([
    k.text('', { size: trapBadgeSize, font: trapBadgeFont }),
    k.pos(trapBadgeX, trapBadgeY),
    k.anchor('center'),
    k.color(200, 60, 60),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 1)
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
      //
      // Update all outline texts too
      //
      heroScoreOutlines.forEach(outline => {
        if (outline.exists && outline.exists()) {
          outline.text = newScore.toString()
        }
      })
    },
    updateLifeScore: (newScore) => {
      lifeScoreText.text = newScore.toString()
      //
      // Update all outline texts too
      //
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

