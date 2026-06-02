import { CFG, getPlayfieldDepthColor, recessPlayfieldColor } from '../cfg.js'
import { toCanvas } from '../../../utils/helper.js'

//
// Farthest static phrase layer — behind bookshelf furniture, no motion
//
const STATIC_WORD_Z = CFG.visual.zIndex.wordStaticBgWords ?? CFG.visual.zIndex.background - 8
const ROW_X_MARGIN = 56
const ROW_WORD_GAP_MIN = 40
const CHAR_WIDTH_RATIO = 0.58
const PHRASE_ALPHA_MIN = 0.2
const PHRASE_ALPHA_MAX = 0.38
const LETTER_CHANCE = 0.12
const PHRASE_CHANCE = 0.34
//
// Stacked horizontal rows — larger type, wider vertical spacing, gap-aware layout
//
const ROW_BANDS = [
  { yRatio: 0.08, sizeMin: 40, sizeMax: 52, wordsMin: 14, wordsMax: 18 },
  { yRatio: 0.16, sizeMin: 44, sizeMax: 56, wordsMin: 13, wordsMax: 17 },
  { yRatio: 0.24, sizeMin: 58, sizeMax: 74, wordsMin: 11, wordsMax: 14 },
  { yRatio: 0.32, sizeMin: 50, sizeMax: 64, wordsMin: 12, wordsMax: 15 },
  { yRatio: 0.42, sizeMin: 76, sizeMax: 96, wordsMin: 8, wordsMax: 11 },
  { yRatio: 0.52, sizeMin: 54, sizeMax: 70, wordsMin: 11, wordsMax: 14 },
  { yRatio: 0.62, sizeMin: 68, sizeMax: 88, wordsMin: 10, wordsMax: 13 },
  { yRatio: 0.72, sizeMin: 46, sizeMax: 58, wordsMin: 14, wordsMax: 17 },
  { yRatio: 0.82, sizeMin: 52, sizeMax: 66, wordsMin: 13, wordsMax: 16 },
  { yRatio: 0.92, sizeMin: 40, sizeMax: 52, wordsMin: 15, wordsMax: 19 }
]
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
 * Bakes a full-screen static word layer — horizontal rows stacked at varied heights
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {string} config.backgroundColor - Section background hex
 * @param {string} config.platformColor - Playfield platform hex
 * @returns {Object} Static background words instance
 */
export function create(config) {
  const { k, backgroundColor, platformColor } = config
  const canvasW = k.width()
  const canvasH = k.height()
  const bgHex = backgroundColor || CFG.visual.colors.background
  const pfHex = platformColor || CFG.visual.colors.platform
  const placements = buildRowPlacements(canvasW, canvasH, bgHex, pfHex)
  const spriteKey = `word-static-bg-rows-v6-${canvasW}x${canvasH}-${bgHex.replace('#', '')}-${Date.now()}`
  const canvas = toCanvas({ width: canvasW, height: canvasH, pixelRatio: 1 }, (ctx) => {
    ctx.clearRect(0, 0, canvasW, canvasH)
    placements.forEach((word) => drawWord(ctx, word))
  })
  k.loadSprite(spriteKey, canvas)
  canvas.width = 0
  canvas.height = 0
  const sprite = k.add([
    k.sprite(spriteKey),
    k.pos(0, 0),
    k.z(STATIC_WORD_Z),
    k.fixed()
  ])
  return { k, sprite, canvasW, canvasH }
}

//
// Places horizontal rows one above another, each row with its own font size range
//
function buildRowPlacements(width, height, bgHex, pfHex) {
  const placements = []
  const rowCount = ROW_BANDS.length
  ROW_BANDS.forEach((band, rowIndex) => {
    const targetCount = band.wordsMin + Math.floor(Math.random() * (band.wordsMax - band.wordsMin + 1))
    const rowY = height * band.yRatio
    const rowColor = pickRowColor(rowIndex, bgHex, pfHex)
    const rowDepthT = rowCount > 1 ? rowIndex / (rowCount - 1) : 0
    const rowAlphaMax = PHRASE_ALPHA_MAX - rowDepthT * (PHRASE_ALPHA_MAX - PHRASE_ALPHA_MIN) * 0.5
    const rowAlphaMin = PHRASE_ALPHA_MIN * (1 - rowDepthT * 0.4)
    const rowWords = []
    for (let i = 0; i < targetCount; i++) {
      rowWords.push(createRowWord(band))
    }
    const packed = packRowWords(rowWords, width)
    packed.forEach((word) => {
      placements.push({
        ...word,
        y: rowY,
        color: rowColor,
        opacity: rowAlphaMin + Math.random() * Math.max(0.04, rowAlphaMax - rowAlphaMin)
      })
    })
  })
  return placements
}

//
// Builds one label candidate for a horizontal row
//
function createRowWord(band) {
  const roll = Math.random()
  const text = roll < LETTER_CHANCE
    ? LETTERS[Math.floor(Math.random() * LETTERS.length)]
    : roll < LETTER_CHANCE + PHRASE_CHANCE
      ? PHRASES[Math.floor(Math.random() * PHRASES.length)]
      : WORDS[Math.floor(Math.random() * WORDS.length)]
  const size = band.sizeMin + Math.random() * (band.sizeMax - band.sizeMin)
  return { text, size, rotation: 0 }
}

//
// Packs row words left-to-right with minimum gaps; drops labels that would not fit
//
function packRowWords(rowWords, width) {
  const usableW = width - ROW_X_MARGIN * 2
  const fitted = []
  let usedWidth = 0
  for (const word of rowWords) {
    const wordWidth = estimateTextWidth(word.text, word.size)
    const gap = fitted.length > 0 ? ROW_WORD_GAP_MIN : 0
    if (usedWidth + gap + wordWidth > usableW) continue
    usedWidth += gap + wordWidth
    fitted.push({ ...word, width: wordWidth })
  }
  if (fitted.length === 0) return []
  const totalWidth = fitted.reduce((sum, w, i) => sum + w.width + (i > 0 ? ROW_WORD_GAP_MIN : 0), 0)
  let cursorX = ROW_X_MARGIN + (usableW - totalWidth) / 2
  return fitted.map((word, index) => {
    const x = cursorX + word.width / 2
    cursorX += word.width + (index < fitted.length - 1 ? ROW_WORD_GAP_MIN : 0)
    return { text: word.text, size: word.size, rotation: word.rotation, x }
  })
}

//
// Approximate rendered width for monospace gap packing
//
function estimateTextWidth(text, size) {
  return text.length * size * CHAR_WIDTH_RATIO
}

//
// Static phrase rows — depth slot above playfield fill, below moving layers
//
function pickRowColor(rowIndex, bgHex, pfHex) {
  const base = getPlayfieldDepthColor('staticPhrase')
  const rowCount = ROW_BANDS.length
  const t = rowCount > 1 ? rowIndex / (rowCount - 1) : 0
  const rear = getPlayfieldDepthColor('playfield')
  const mixed = mixHex(base, rear, t * 0.6)
  return recessPlayfieldColor(mixed, t * 0.2)
}

//
// Draws one frozen phrase onto the baked canvas
//
function drawWord(ctx, word) {
  ctx.save()
  ctx.translate(word.x, word.y)
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
