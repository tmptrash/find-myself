import * as Tooltip from '../../../utils/tooltip.js'

//
// Standard HUD hover zones (progress, green timer, small hero, life)
//
const WORD_PROGRESS_TOOLTIP_TEXT = 'Your progress'
const GREEN_TIMER_TOOLTIP_TEXT = "Complete the level in time\nto earn more fragments"
const SMALL_HERO_TOOLTIP_TEXT = 'Your fragments'
const LIFE_TOOLTIP_TEXT = 'Life score'
const WORD_INDICATOR_TOOLTIP_WIDTH = 220
const WORD_INDICATOR_TOOLTIP_HEIGHT = 48
const WORD_INDICATOR_TOOLTIP_Y_OFFSET = -30
const GREEN_TIMER_TOOLTIP_WIDTH = 80
const GREEN_TIMER_TOOLTIP_HEIGHT = 30
const GREEN_TIMER_TOOLTIP_Y_OFFSET = 50
const SMALL_HERO_TOOLTIP_SIZE = 60
const SMALL_HERO_TOOLTIP_Y_OFFSET = 50
const LIFE_TOOLTIP_SIZE = 60
const LIFE_TOOLTIP_Y_OFFSET = 50

/**
 * Registers standard WORD section HUD hover tooltips (progress, timer, small hero, life)
 * @param {Object} k - Kaplay instance
 * @param {Object} ctx - Context
 * @param {Object} ctx.levelIndicator - Word level indicator instance
 * @param {Object} [ctx.fpsCounter] - FPS counter with optional targetText
 * @param {number} ctx.topPlatformHeight - Top platform height in pixels
 */
export function setupStandardHudTooltips(k, ctx) {
  const { levelIndicator, fpsCounter, topPlatformHeight } = ctx
  if (!levelIndicator?.letterObjects?.length) return
  const letters = levelIndicator.letterObjects
  const wordsCenterX = letters.reduce((sum, letter) => sum + letter.pos.x, 0) / letters.length
  const wordsCenterY = letters[0]?.pos?.y ?? topPlatformHeight / 2
  Tooltip.create({
    k,
    targets: [{
      x: wordsCenterX,
      y: wordsCenterY,
      width: WORD_INDICATOR_TOOLTIP_WIDTH,
      height: WORD_INDICATOR_TOOLTIP_HEIGHT,
      text: WORD_PROGRESS_TOOLTIP_TEXT,
      offsetY: WORD_INDICATOR_TOOLTIP_Y_OFFSET
    }]
  })
  fpsCounter?.targetText && Tooltip.create({
    k,
    targets: [{
      x: fpsCounter.targetText.pos.x,
      y: fpsCounter.targetText.pos.y,
      width: GREEN_TIMER_TOOLTIP_WIDTH,
      height: GREEN_TIMER_TOOLTIP_HEIGHT,
      text: GREEN_TIMER_TOOLTIP_TEXT,
      offsetY: GREEN_TIMER_TOOLTIP_Y_OFFSET,
      forceBelow: true
    }]
  })
  levelIndicator.smallHero?.character && Tooltip.create({
    k,
    targets: [{
      x: () => levelIndicator.smallHero.character.pos.x,
      y: () => levelIndicator.smallHero.character.pos.y,
      width: SMALL_HERO_TOOLTIP_SIZE,
      height: SMALL_HERO_TOOLTIP_SIZE,
      text: SMALL_HERO_TOOLTIP_TEXT,
      offsetY: SMALL_HERO_TOOLTIP_Y_OFFSET,
      forceBelow: true
    }]
  })
  levelIndicator.lifeImage?.sprite && Tooltip.create({
    k,
    targets: [{
      x: () => levelIndicator.lifeImage.sprite.pos.x,
      y: () => levelIndicator.lifeImage.sprite.pos.y,
      width: LIFE_TOOLTIP_SIZE,
      height: LIFE_TOOLTIP_SIZE,
      text: LIFE_TOOLTIP_TEXT,
      offsetY: LIFE_TOOLTIP_Y_OFFSET,
      forceBelow: true
    }]
  })
}
