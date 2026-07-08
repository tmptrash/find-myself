import { CFG } from '../../../cfg.js'
import { getRGB } from '../../../utils/helper.js'
import { get } from '../../../utils/progress.js'
import * as Hero from '../../../components/hero.js'
//
// Small hero and life icon layout constants
//
const SMALL_HERO_SIZE = 78
const LIFE_IMAGE_HEIGHT = 86
//
// SPACING is increased to push the hero icon further LEFT while life icon
// stays at its original position (UI_RIGHT_MARGIN unchanged).
//
const SPACING_BETWEEN = 120
const LIFE_IMAGE_ORIGINAL_HEIGHT = 1197
const UI_RIGHT_MARGIN = 70
const TOP_OFFSET = 40
const SMALL_HERO_Y_ADJUST = 10
const LIFE_SCALE_FACTOR = 1.3
const SCORE_OFFSET_X = 5
const SCORE_OFFSET_Y = 10
const SCORE_OUTLINE_THICKNESS = 2
//
// Vertical offset for the life icon so it sits a bit below the small hero
// (raised further so the "teacher" reads higher in the HUD of every level)
//
const LIFE_IMAGE_Y_OFFSET = 3
//
// Trap count badge: small red number below-right of life icon
//
const TRAP_BADGE_OFFSET_X = 28
const TRAP_BADGE_OFFSET_Y = 38
//
// Letter burst effect: circles radiating from a newly activated HUD letter
//
const LETTER_BURST_PARTICLE_COUNT = 15
const LETTER_BURST_SPEED_MIN = 80
const LETTER_BURST_SPEED_EXTRA = 40
const LETTER_BURST_LIFETIME_MIN = 0.8
const LETTER_BURST_LIFETIME_EXTRA = 0.4
const LETTER_BURST_SIZE_MIN = 4
const LETTER_BURST_SIZE_EXTRA = 4
const LETTER_BURST_Y_OFFSET = 24
const TRAP_BADGE_FONT_SIZE = 20
const TRAP_BADGE_COLOR_R = 200
const TRAP_BADGE_COLOR_G = 60
const TRAP_BADGE_COLOR_B = 60
const TRAP_BADGE_OUTLINE_THICKNESS = 2
//
// HUD scoreboard grey: shared by the life-icon tint, score numerals
// and the inactive TOUCH letters so every quiet HUD slot reads as one
// neutral colour. Bumped from the previous `#808080` to the brighter
// `#B0B0B0` because the previous mid-grey disappeared into its black
// outline at HUD font sizes.
//
const HUD_SCORE_ICON_GREY_HEX = '#B0B0B0'
const HUD_SCORE_ICON_GREY_R = 176
const HUD_SCORE_ICON_GREY_G = 176
const HUD_SCORE_ICON_GREY_B = 176
//
// Falling "H" letter configuration (last letter tilts as if falling)
//
const FALLING_LETTER_INDEX = 4
const FALLING_LETTER_TILT = 22
//
// Wobbly "H" letter shares the same neutral grey as every other quiet
// HUD slot (inactive TOUCH letters, score numerals, life icon, FPS) —
// the falling glyph is a quirky character, not a separate accent, so
// it stays inside the single `#B0B0B0` HUD grey instead of drifting
// to its own darker tone.
//
const FALLING_LETTER_COLOR = HUD_SCORE_ICON_GREY_HEX
const FALLING_LETTER_OFFSET_X = 10
//
// Vertical offset so the top of "H" sits on the same line as the bottom of "C" (H lowered vs T,O,U,C)
//
const FALLING_LETTER_UNDER_C_RATIO = 0.72
//
// Wobble animation for the falling "H" letter (continuous gentle sway)
//
const WOBBLE_SPEED = 2.5
const WOBBLE_AMPLITUDE = 4
/**
 * Creates touch section level indicator (letters "TOUCH") with small hero and life icons
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.levelNumber - Current level number (0-4)
 * @param {string} config.activeColor - Color for completed levels (hex)
 * @param {string} config.inactiveColor - Color for future levels (hex)
 * @param {string} config.completedColor - Color for already completed levels (hex, default: touch antiHero color)
 * @param {string} [config.heroBodyColor] - Body color for small hero icon (hex), defaults to activeColor
 * @param {number} config.topPlatformHeight - Height of top platform
 * @param {number} config.sideWallWidth - Width of side wall
 * @param {string} [config.sectionLabel] - Custom header label (e.g. TRAINING) instead of TOUCH
 * @param {string} [config.labelColor] - Single color for all letters when sectionLabel is set
 * @param {number} [config.sectionLabelStagePairs] - Pair count for staged letter coloring (2 letters per stage)
 * @param {number} [config.sectionLabelCompletedStages] - Initial completed stage pairs (0-based count)
 * @param {number} [config.sectionLabelCompletedLetters] - Initial completed letter count (TRAINING per-letter mode)
 * @param {number} [config.sectionLabelLetterSpacing] - Tighter spacing for custom section labels
 * @param {number} [config.sectionLabelY] - Top Y for section label row (lower = closer to game area)
 * @returns {Object} Object with letterObjects, smallHero, lifeImage, and score update methods
 */
export function create(config) {
  const {
    k,
    levelNumber,
    activeColor,
    inactiveColor,
    completedColor = CFG.visual.colors.sections.touch.antiHero,
    heroBodyColor = activeColor,
    topPlatformHeight,
    sideWallWidth,
    sectionLabel = null,
    labelColor = null,
    sectionLabelStagePairs = null,
    sectionLabelCompletedStages = 0,
    sectionLabelCompletedLetters = null,
    sectionLabelLetterSpacing = null,
    sectionLabelY = null,
    hideScoreboard = false,
    scoreboardGreyLife = false,
    heroOutlineColor = CFG.visual.colors.outline,
    heroEyeWhiteColor = null,
    heroLegStrip = false
  } = config
  const letters = sectionLabel ? sectionLabel.split('') : ['T', 'O', 'U', 'C', 'H']
  const fontSize = 48
  const letterSpacing = sectionLabelLetterSpacing ?? -5
  const outlineThickness = 2
  const startX = sideWallWidth + 40
  const y = sectionLabelY ?? (topPlatformHeight - fontSize) / 2
  const fallingLetterExtraY = Math.round(fontSize * FALLING_LETTER_UNDER_C_RATIO)
  const letterObjects = []
  const letterOutlineObjects = []
  const fallingLetterObjects = []
  letters.forEach((letter, i) => {
    const letterLevel = i
    //
    // Determine color based on level status:
    // - Completed levels (< current level): use completedColor (touch antiHero color - brown)
    // - Current level: use activeColor (hero color - yellow)
    // - Future levels: use inactiveColor (gray)
    //
    //
    // Last letter "H" is always gray and tilted (falling effect)
    //
    const isFallingLetter = !sectionLabel && i === FALLING_LETTER_INDEX
    let colorHex
    if (sectionLabelCompletedLetters != null) {
      colorHex = i < sectionLabelCompletedLetters ? activeColor : inactiveColor
    } else if (sectionLabelStagePairs) {
      const stageIndex = Math.floor(i / 2)
      colorHex = stageIndex < sectionLabelCompletedStages ? activeColor : inactiveColor
    } else if (labelColor) {
      colorHex = labelColor
    } else if (isFallingLetter) {
      colorHex = FALLING_LETTER_COLOR
    } else if (letterLevel < levelNumber) {
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
    // Create drop shadow (single black copy offset right+down)
    //
    const offsets = [[outlineThickness, outlineThickness]]
    offsets.forEach(([dx, dy]) => {
      const outlineComponents = [
        k.text(letter, {
          size: fontSize,
          font: CFG.visual.fonts.thinFull.replace(/'/g, '')
        }),
        k.pos(letterX + dx + (isFallingLetter ? FALLING_LETTER_OFFSET_X : 0), y + dy + (isFallingLetter ? fallingLetterExtraY : 0)),
        k.color(0, 0, 0),
        k.z(CFG.visual.zIndex.ui)
      ]
      isFallingLetter && outlineComponents.push(k.rotate(FALLING_LETTER_TILT))
      const outlineObj = k.add(outlineComponents)
      letterOutlineObjects.push(outlineObj)
      isFallingLetter && fallingLetterObjects.push(outlineObj)
    })
    //
    // Create main letter
    //
    const {r, g, b} = getRGB(k, colorHex)
    const fallingOffX = isFallingLetter ? FALLING_LETTER_OFFSET_X : 0
    const fallingOffY = isFallingLetter ? fallingLetterExtraY : 0
    const mainComponents = [
      k.text(letter, {
        size: fontSize,
        font: CFG.visual.fonts.thinFull.replace(/'/g, '')
      }),
      k.pos(letterX + fallingOffX, y + fallingOffY),
      k.color(r, g, b),
      k.z(CFG.visual.zIndex.ui)
    ]
    isFallingLetter && mainComponents.push(k.rotate(FALLING_LETTER_TILT))
    const mainLetter = k.add(mainComponents)
    isFallingLetter && fallingLetterObjects.push(mainLetter)
    letterObjects.push(mainLetter)
  })
  //
  // Wobble animation: continuously sway the falling "H" letter back and forth
  //
  k.onUpdate(() => {
    const wobbleAngle = FALLING_LETTER_TILT + Math.sin(k.time() * WOBBLE_SPEED) * WOBBLE_AMPLITUDE
    fallingLetterObjects.forEach(obj => {
      obj.exists?.() && (obj.angle = wobbleAngle)
    })
  })
  //
  // Create small hero icon and life.png image in top right corner
  //
  const smallHeroY = sectionLabelY != null
    ? sectionLabelY + fontSize / 2 + SMALL_HERO_Y_ADJUST
    : topPlatformHeight - fontSize / 2 - TOP_OFFSET + SMALL_HERO_Y_ADJUST
  const isTouchComplete = get('touch.completed', false)
  const isWordComplete = get('word.completed', false)
  const lifeImageX = k.width() - sideWallWidth - UI_RIGHT_MARGIN - LIFE_IMAGE_HEIGHT / 2
  const smallHeroX = lifeImageX - SPACING_BETWEEN - SMALL_HERO_SIZE / 2
  const smallHero = Hero.create({
    k,
    x: smallHeroX,
    y: smallHeroY,
    type: Hero.HEROES.HERO,
    controllable: false,
    isStatic: true,
    scale: 2.6 / 3,
    //
    // HUD small hero mirrors the playable hero's body colour — silver
    // by default, then teal / orange / red as the player completes
    // each section. Keeps the top-right scoreboard's "you" icon in
    // chromatic sync with the actual character running the level.
    //
    bodyColor: heroBodyColor,
    outlineColor: heroOutlineColor,
    eyeWhiteColor: heroEyeWhiteColor,
    addLegStrip: heroLegStrip,
    addMouth: isWordComplete,
    addArms: isTouchComplete,
    //
    // HUD indicator hero is purely decorative — never let it whistle or
    // emit floating notes during gameplay.
    //
    idleVocalization: null
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
      k.pos(lifeImageX - 5, smallHeroY + LIFE_IMAGE_Y_OFFSET),
      k.scale(lifeImageScale),
      k.anchor('center'),
      k.fixed(),
      //
      // Tint the white "life" PNG to the neutral grey used by the small
      // hero so both HUD icons share one quiet scoreboard colour.
      //
      k.color(HUD_SCORE_ICON_GREY_R, HUD_SCORE_ICON_GREY_G, HUD_SCORE_ICON_GREY_B),
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
  // Score numerals cast a drop shadow (single black copy offset right+down)
  //
  const scoreOffsets = [[SCORE_OUTLINE_THICKNESS, SCORE_OUTLINE_THICKNESS]]
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
  //
  // Trap count badge with outline (bold red number right of life icon)
  //
  const trapBadgeX = lifeImageX + TRAP_BADGE_OFFSET_X
  const trapBadgeY = smallHeroY + TRAP_BADGE_OFFSET_Y
  const trapBadgeFont = CFG.visual.fonts.regularFull
    ? CFG.visual.fonts.regularFull.replace(/'/g, '')
    : CFG.visual.fonts.thinFull.replace(/'/g, '')
  //
  // Trap badge shadow (single black copy offset right+down)
  //
  const trapBadgeOutlineOffsets = [[TRAP_BADGE_OUTLINE_THICKNESS, TRAP_BADGE_OUTLINE_THICKNESS]]
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
    k.z(CFG.visual.zIndex.ui + 1)
  ])
  const scoreboardNodes = [
    smallHero.character,
    lifeImageData.sprite,
    heroScoreText,
    lifeScoreText,
    ...heroScoreOutlines,
    ...lifeScoreOutlines,
    trapBadgeText,
    ...trapBadgeOutlines
  ]
  hideScoreboard && scoreboardNodes.forEach(node => { node.hidden = true })
  return {
    k,
    letterObjects,
    letterOutlineObjects,
    sectionLabelStagePairs,
    sectionLabelActiveColor: activeColor,
    sectionLabelInactiveColor: inactiveColor,
    smallHero,
    lifeImage: lifeImageData,
    heroScoreText,
    lifeScoreText,
    lifeScoreOutlines,
    heroScoreOutlines,
    scoreboardNodes,
    scoreboardGreyLife,
    smallHeroRevealed: !hideScoreboard,
    lifeRevealed: !hideScoreboard,
    //
    // Exposed so external flash routines (life-deduct red blink,
    // help-purchase / help-denied flashes) can reset the score numerals
    // back to the same neutral grey we used at creation time — avoids
    // them snapping to hard white when the flash ends.
    //
    scoreColorHex: HUD_SCORE_ICON_GREY_HEX,
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
    },
    updateTrapCount: (count) => {
      const val = count > 0 ? count.toString() : ''
      trapBadgeText.text = val
      trapBadgeOutlines.forEach(o => { o.exists?.() && (o.text = val) })
    }
  }
}

/**
 * Hides or shows the section label letters (fills + outlines) in the top-left HUD.
 * Used by levels where the label appears only after the first letter is earned.
 * @param {Object} inst - Level indicator instance from create()
 * @param {boolean} hidden - True to hide the letters, false to show them
 */
export function setSectionLabelHidden(inst, hidden) {
  if (!inst) return
  inst.letterObjects?.forEach(obj => { obj.exists?.() && (obj.hidden = hidden) })
  inst.letterOutlineObjects?.forEach(obj => { obj.exists?.() && (obj.hidden = hidden) })
}

/**
 * Reveals the small-hero icon and hero-score numerals in the top-right HUD.
 * @param {Object} inst - Level indicator instance from create()
 */
export function revealSmallHeroHud(inst) {
  if (!inst || inst.smallHeroRevealed) return
  inst.smallHeroRevealed = true
  inst.smallHero?.character && (inst.smallHero.character.hidden = false)
  inst.heroScoreText && (inst.heroScoreText.hidden = false)
  inst.heroScoreOutlines?.forEach(o => { o.hidden = false })
}

/**
 * Reveals the life icon and life-score numerals in the top-right HUD.
 * @param {Object} inst - Level indicator instance from create()
 * @param {boolean} [greyLife=true] - Tint life icon grey (glow grayscale phase)
 */
export function revealLifeHud(inst, greyLife = true) {
  if (!inst || inst.lifeRevealed) return
  inst.lifeRevealed = true
  const useGrey = greyLife || inst.scoreboardGreyLife
  if (useGrey && inst.lifeImage?.sprite) {
    inst.lifeImage.sprite.color = inst.k.rgb(HUD_SCORE_ICON_GREY_R, HUD_SCORE_ICON_GREY_G, HUD_SCORE_ICON_GREY_B)
  }
  inst.lifeImage?.sprite && (inst.lifeImage.sprite.hidden = false)
  inst.lifeScoreText && (inst.lifeScoreText.hidden = false)
  inst.lifeScoreOutlines?.forEach(o => { o.hidden = false })
}

export function setSectionLabelLetterProgress(inst, completedLetters) {
  if (!inst?.letterObjects?.length) return
  const capped = Math.min(completedLetters, inst.letterObjects.length)
  inst.letterObjects.forEach((letter, i) => {
    if (!letter?.exists?.()) return
    const colorHex = i < capped ? inst.sectionLabelActiveColor : inst.sectionLabelInactiveColor
    const { r, g, b } = getRGB(inst.k, colorHex)
    letter.color = inst.k.rgb(r, g, b)
  })
}

/**
 * Spawns burst particles radiating from the newly lit HUD letter at the given 1-based index.
 * Mirrors the stage-complete burst effect used in the training scene.
 * @param {Object} inst - Level indicator instance from create()
 * @param {number} letterIndex - 1-based index of the letter that was just collected (1 = T, 2 = O…)
 */
export function flashLetterBurst(inst, letterIndex) {
  if (!inst?.letterObjects?.length || !inst.k) return
  const letter = inst.letterObjects[letterIndex - 1]
  if (!letter?.exists?.()) return
  const k = inst.k
  const cx = letter.pos.x
  const cy = letter.pos.y + LETTER_BURST_Y_OFFSET
  const { r, g, b } = getRGB(k, inst.sectionLabelActiveColor)
  for (let i = 0; i < LETTER_BURST_PARTICLE_COUNT; i++) {
    const angle = (Math.PI * 2 * i) / LETTER_BURST_PARTICLE_COUNT
    const speed = LETTER_BURST_SPEED_MIN + Math.random() * LETTER_BURST_SPEED_EXTRA
    const lifetime = LETTER_BURST_LIFETIME_MIN + Math.random() * LETTER_BURST_LIFETIME_EXTRA
    const size = LETTER_BURST_SIZE_MIN + Math.random() * LETTER_BURST_SIZE_EXTRA
    const particle = k.add([
      k.circle(size),
      k.pos(cx, cy),
      k.color(r, g, b),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 10),
      k.anchor('center'),
      k.fixed()
    ])
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const ps = { elapsed: 0 }
    particle.onUpdate(() => onUpdateLetterBurstParticle(k, particle, vx, vy, lifetime, ps))
  }
}
/**
 * Colors TRAINING-style section label letter pairs as stages complete (2 letters per stage)
 * @param {Object} inst - Level indicator instance from create()
 * @param {number} completedStages - Number of completed 2-letter stages (0–4 for TRAINING)
 */
export function setSectionLabelStageProgress(inst, completedStages) {
  if (!inst?.sectionLabelStagePairs || !inst.letterObjects?.length) return
  const capped = Math.min(completedStages, inst.sectionLabelStagePairs)
  inst.letterObjects.forEach((letter, i) => {
    if (!letter?.exists?.()) return
    const stageIndex = Math.floor(i / 2)
    const colorHex = stageIndex < capped ? inst.sectionLabelActiveColor : inst.sectionLabelInactiveColor
    const { r, g, b } = getRGB(inst.k, colorHex)
    letter.color = inst.k.rgb(r, g, b)
  })
}

/**
 * Creates score text drop-shadow elements (black copies at given offsets)
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
    //
    // Score numerals share the same neutral grey as the small hero,
    // life icon and inactive TOUCH letters — the entire HUD now reads
    // as one quiet grey scoreboard against the in-game palette.
    //
    k.color(HUD_SCORE_ICON_GREY_R, HUD_SCORE_ICON_GREY_G, HUD_SCORE_ICON_GREY_B),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui)
  ])
}
//
// Advances a single burst particle: moves, fades, and destroys it on expiry
//
function onUpdateLetterBurstParticle(k, particle, vx, vy, lifetime, ps) {
  ps.elapsed += k.dt()
  particle.pos.x += vx * k.dt()
  particle.pos.y += vy * k.dt()
  particle.opacity = 1 - ps.elapsed / lifetime
  ps.elapsed >= lifetime && k.destroy(particle)
}
