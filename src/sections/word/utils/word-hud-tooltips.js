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

//
// Insecurity thoughts shown on hero hover — shared across all word section levels.
// The first entry is the default; subsequent ones cycle each new hover session.
//
export const HERO_INSECURITY_THOUGHTS = [
  'Damn, so many thoughts',
  'I\'m probably not good enough',
  'I\'m not sure I can do this',
  'Everyone is doing so well, but not me...',
  'So much going on, I don\'t know where to start',
  'What if something goes wrong?',
  'Maybe just wait and it will sort itself out?',
  'I\'m scared to take the first step',
  'It\'s definitely easier for them than for me'
]
//
// Hover zone and offset shared by all word-level hero tooltips
//
const HERO_INSECURITY_HOVER_SIZE = 80
const HERO_INSECURITY_Y_OFFSET = -100

/**
 * Registers a hero hover tooltip that cycles through insecurity thoughts.
 * Each new hover session (cursor leaves then returns) advances to the next thought;
 * the text stays frozen for the entire duration the cursor is over the hero.
 * @param {Object} k - Kaplay instance
 * @param {Object} hero - Hero instance
 */
export function setupHeroInsecurityTooltip(k, hero) {
  const state = { idx: -1, lastCallTime: -Infinity }
  Tooltip.create({
    k,
    targets: [{
      x: () => hero.character.pos.x,
      y: () => hero.character.pos.y,
      width: HERO_INSECURITY_HOVER_SIZE,
      height: HERO_INSECURITY_HOVER_SIZE,
      text: () => getHeroThoughtText(k, state),
      offsetY: HERO_INSECURITY_Y_OFFSET
    }]
  })
}
//
// Advances the thought index once per hover session.
// A gap of >100 ms between calls means the cursor left and came back.
//
function getHeroThoughtText(k, state) {
  const now = k.time()
  const isNewHover = (now - state.lastCallTime) > 0.1
  if (isNewHover) {
    state.idx = (state.idx + 1) % HERO_INSECURITY_THOUGHTS.length
  }
  state.lastCallTime = now
  return HERO_INSECURITY_THOUGHTS[Math.max(0, state.idx)]
}
