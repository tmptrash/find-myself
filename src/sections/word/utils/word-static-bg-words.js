import { CFG } from '../cfg.js'
import { toCanvas } from '../../../utils/helper.js'

//
// Farthest static phrase layer — behind bookshelf furniture, no motion
//
const STATIC_WORD_Z = CFG.visual.zIndex.wordStaticBgWords ?? CFG.visual.zIndex.background - 8
const WORD_COUNT_MIN = 58
const WORD_COUNT_MAX = 82
const FONT_SIZE_MIN = 44
const FONT_SIZE_MAX = 96
const WORD_EDGE_MARGIN = 36
const ROTATION_MIN_DEG = -22
const ROTATION_MAX_DEG = 22
const PHRASE_ALPHA_MIN = 0.09
const PHRASE_ALPHA_MAX = 0.19
const COLOR_MIX_MIN = 0.05
const COLOR_MIX_MAX = 0.13
const LETTER_CHANCE = 0.18
const PHRASE_CHANCE = 0.22
//
// Introspective fragments — same tone as flying words / word pile
//
const WORDS = [
  'pain', 'hurt', 'ache', 'fear', 'doubt', 'lost', 'dark',
  'void', 'empty', 'cold', 'numb', 'alone', 'torn', 'break',
  'cut', 'bleed', 'scar', 'wound', 'grief', 'cry', 'fall',
  'sink', 'drown', 'fade', 'die', 'end', 'why', 'how',
  'who', 'am', 'I', '...', 'no', 'never', 'can\'t', 'won\'t',
  'find', 'seek', 'look', 'where', 'when', 'found', 'me',
  'self', 'soul', 'mind', 'heart', 'life', 'death', 'time',
  'shame', 'guilt', 'regret', 'sorry', 'wrong', 'quiet', 'still',
  'wait', 'hide', 'run', 'stay', 'leave', 'forget', 'remember'
]
//
// Two- and three-word frozen phrases for the static texture
//
const PHRASES = [
  'not enough', 'too late', 'said nothing', 'they noticed',
  'still here', 'go away', 'come back', 'hold on',
  'let go', 'too much', 'not me', 'who am I',
  'wrong again', 'said wrong thing', 'cant stop thinking',
  'did they notice', 'they are judging me', 'something bad coming',
  'stayed quiet again', 'nobody likes me', 'that look meant it',
  'words like blades', 'find yourself', 'lost again', 'keep running'
]
const LETTERS = ['a', 'e', 'i', 'o', 'u', 'y', '?', '.', '—']

/**
 * Bakes a static playfield word layer — subtle phrases frozen against the platform tint
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {string} config.backgroundColor - Section background hex
 * @param {string} config.platformColor - Playfield platform hex
 * @param {number} config.sideWallWidth - Left/right wall width in pixels
 * @param {number} config.topPlatformHeight - Top platform height in pixels
 * @param {number} config.bottomPlatformHeight - Bottom platform height in pixels
 * @returns {Object} Static background words instance
 */
export function create(config) {
  const {
    k,
    backgroundColor,
    platformColor,
    sideWallWidth,
    topPlatformHeight,
    bottomPlatformHeight
  } = config
  const playLeft = sideWallWidth ?? 192
  const playTop = topPlatformHeight ?? k.height() * 0.33
  const playBottom = k.height() - (bottomPlatformHeight ?? k.height() * 0.12)
  const playWidth = k.width() - playLeft * 2
  const playHeight = playBottom - playTop
  const bgHex = backgroundColor || CFG.visual.colors.background
  const pfHex = platformColor || CFG.visual.colors.platform
  const wordCount = WORD_COUNT_MIN + Math.floor(Math.random() * (WORD_COUNT_MAX - WORD_COUNT_MIN + 1))
  const placements = buildPlacements(wordCount, playWidth, playHeight, bgHex, pfHex)
  const spriteKey = `word-static-bg-${k.width()}x${playHeight}-${bgHex.replace('#', '')}-${pfHex.replace('#', '')}-${Date.now()}`
  const canvas = toCanvas({ width: playWidth, height: playHeight, pixelRatio: 1 }, (ctx) => {
    ctx.clearRect(0, 0, playWidth, playHeight)
    placements.forEach((word) => drawWord(ctx, word))
  })
  k.loadSprite(spriteKey, canvas)
  canvas.width = 0
  canvas.height = 0
  const sprite = k.add([
    k.sprite(spriteKey),
    k.pos(playLeft, playTop),
    k.z(STATIC_WORD_Z),
    k.fixed()
  ])
  return { k, sprite, playLeft, playTop, playWidth, playHeight }
}

//
// Scatters word placements across the full playfield height
//
function buildPlacements(count, width, height, bgHex, pfHex) {
  const placements = []
  for (let i = 0; i < count; i++) {
    const roll = Math.random()
    const text = roll < LETTER_CHANCE
      ? LETTERS[Math.floor(Math.random() * LETTERS.length)]
      : roll < LETTER_CHANCE + PHRASE_CHANCE
        ? PHRASES[Math.floor(Math.random() * PHRASES.length)]
        : WORDS[Math.floor(Math.random() * WORDS.length)]
    const size = FONT_SIZE_MIN + Math.random() * (FONT_SIZE_MAX - FONT_SIZE_MIN)
    placements.push({
      text,
      x: WORD_EDGE_MARGIN + Math.random() * (width - WORD_EDGE_MARGIN * 2),
      y: WORD_EDGE_MARGIN + Math.random() * (height - WORD_EDGE_MARGIN * 2),
      rotation: (ROTATION_MIN_DEG + Math.random() * (ROTATION_MAX_DEG - ROTATION_MIN_DEG)) * Math.PI / 180,
      size,
      color: pickSubtleColor(bgHex, pfHex),
      opacity: PHRASE_ALPHA_MIN + Math.random() * (PHRASE_ALPHA_MAX - PHRASE_ALPHA_MIN)
    })
  }
  return placements
}

//
// Picks a fill barely lighter or darker than the platform playfield
//
function pickSubtleColor(bgHex, pfHex) {
  const mix = COLOR_MIX_MIN + Math.random() * (COLOR_MIX_MAX - COLOR_MIX_MIN)
  return Math.random() < 0.5
    ? mixHex(pfHex, bgHex, mix)
    : mixHex(pfHex, lightenHex(pfHex, 0.06), mix * 0.85)
}

//
// Draws one frozen phrase onto the baked canvas
//
function drawWord(ctx, word) {
  ctx.save()
  ctx.translate(word.x, word.y)
  ctx.rotate(word.rotation)
  ctx.font = `${word.size}px ${CFG.visual.fonts.regularFull.replace(/'/g, '')}`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillStyle = hexToRgba(word.color, word.opacity)
  ctx.fillText(word.text, 0, 0)
  ctx.restore()
}

//
// Blends two hex colors
//
function mixHex(fg, bg, amount) {
  const parse = (hex) => {
    const h = hex.replace('#', '')
    return {
      r: parseInt(h.slice(0, 2), 16),
      g: parseInt(h.slice(2, 4), 16),
      b: parseInt(h.slice(4, 6), 16)
    }
  }
  const a = parse(fg)
  const b = parse(bg)
  const t = Math.min(1, Math.max(0, amount))
  const r = Math.round(a.r + (b.r - a.r) * t)
  const g = Math.round(a.g + (b.g - a.g) * t)
  const bl = Math.round(a.b + (b.b - a.b) * t)
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${bl.toString(16).padStart(2, '0')}`
}

//
// Nudges a hex color toward white for a whisper-bright variant
//
function lightenHex(hex, amount) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  const t = Math.min(1, Math.max(0, amount))
  const lr = Math.round(r + (255 - r) * t)
  const lg = Math.round(g + (255 - g) * t)
  const lb = Math.round(b + (255 - b) * t)
  return `#${lr.toString(16).padStart(2, '0')}${lg.toString(16).padStart(2, '0')}${lb.toString(16).padStart(2, '0')}`
}

//
// Converts hex + alpha to canvas rgba string
//
function hexToRgba(hex, alpha) {
  const h = hex.replace('#', '')
  const r = parseInt(h.slice(0, 2), 16)
  const g = parseInt(h.slice(2, 4), 16)
  const b = parseInt(h.slice(4, 6), 16)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
