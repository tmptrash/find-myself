import { CFG } from '../cfg.js'

//
// Hanging vine phrases — intrusive-thought sentences draped between top playfield anchors
//
const VINE_Z = CFG.visual.zIndex.blades - 2
const LETTER_SIZE_MIN = 18
const LETTER_SIZE_MAX = 26
const LETTER_SPACING = 20
const WORD_SPACE_SPACING = 30
const SWAY_SPEED = 1.35
const SWAY_AMPLITUDE = 26
const VINE_OPACITY = 0.55
const SPACE_OPACITY = 0.35
const VINE_T_START = 0.02
const VINE_T_END = 0.98
const VINE_COLOR_R = 150
const VINE_COLOR_G = 150
const VINE_COLOR_B = 150
//
// Default horizontal span for parabolic arc vines (fraction of play width)
//
const ARC_SPAN_RATIO_DEFAULT = 0.14
const ARC_SAG_DEFAULT = 0.78
//
// Intrusive-thought sentences
//
const VINE_PHRASES = [
  'what if i said something wrong',
  'why cant i stop thinking',
  'did they notice my mistake',
  'everyone must be judging me',
  'what if something bad happens',
  'i should have stayed quiet',
  'they are probably angry',
  'why did i do that again',
  'nobody actually likes me',
  'what was that look for'
]
//
// Arc vines: both ends anchored at the playfield top edge
//
const VINE_LAYOUTS = [
  { xRatio: 0.03, spanRatio: 0.11, sag: 0.74, phase: 0.1 },
  { xRatio: 0.15, spanRatio: 0.13, sag: 0.86, phase: 1.4 },
  { xRatio: 0.28, spanRatio: 0.12, sag: 0.78, phase: 2.6 },
  { xRatio: 0.41, spanRatio: 0.14, sag: 0.88, phase: 0.8 },
  { xRatio: 0.54, spanRatio: 0.11, sag: 0.76, phase: 3.2 },
  { xRatio: 0.66, spanRatio: 0.13, sag: 0.84, phase: 1.9 },
  { xRatio: 0.78, spanRatio: 0.12, sag: 0.8, phase: 4.1 },
  { xRatio: 0.89, spanRatio: 0.1, sag: 0.72, phase: 2.3 }
]

/**
 * Creates hanging vine phrases from small letters across the word section playfield
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {number} config.sideWallWidth - Left/right wall width in pixels
 * @param {number} config.topPlatformHeight - Top platform height in pixels
 * @param {number} config.bottomPlatformHeight - Bottom platform height in pixels
 * @returns {Object} Hanging vines instance
 */
export function create(config) {
  const { k, sideWallWidth, topPlatformHeight, bottomPlatformHeight } = config
  const playLeft = sideWallWidth ?? 192
  const playRight = k.width() - playLeft
  const playTop = topPlatformHeight ?? k.height() * 0.33
  const playBottom = k.height() - (bottomPlatformHeight ?? k.height() * 0.12)
  const playWidth = playRight - playLeft
  const playHeight = playBottom - playTop
  const vines = VINE_LAYOUTS.map((layout, index) => buildVine(
    layout,
    index,
    playLeft,
    playWidth,
    playTop,
    playHeight
  ))
  const inst = {
    k,
    vines
  }
  k.add([
    k.pos(0, 0),
    k.z(VINE_Z),
    k.fixed(),
    {
      draw() {
        onDraw(inst)
      }
    }
  ])
  return inst
}

//
// Builds one parabolic arc vine — start and end pinned to the playfield top edge
//
function buildVine(layout, index, playLeft, playWidth, playTop, playHeight) {
  const anchorY = playTop
  const phrase = VINE_PHRASES[index % VINE_PHRASES.length]
  const startX = playLeft + playWidth * layout.xRatio
  const span = playWidth * (layout.spanRatio ?? ARC_SPAN_RATIO_DEFAULT)
  const sag = layout.sag ?? ARC_SAG_DEFAULT
  const letterSize = Math.round(LETTER_SIZE_MIN + sag * (LETTER_SIZE_MAX - LETTER_SIZE_MIN))
  const vine = {
    letters: phrase.split(''),
    letterSize,
    startX,
    startY: anchorY,
    endX: startX + span,
    endY: anchorY,
    controlX: startX + span / 2,
    controlY: playTop + playHeight * sag,
    phase: layout.phase,
    arcLength: 0
  }
  vine.arcLength = measureArcLength(vine)
  return vine
}

//
// Draws letters and visible word spaces along a top-anchored arc
//
function onDraw(inst) {
  const { k, vines } = inst
  const time = k.time()
  const font = CFG.visual.fonts.thinFull.replace(/'/g, '')
  const color = k.rgb(VINE_COLOR_R, VINE_COLOR_G, VINE_COLOR_B)
  vines.forEach(vine => {
    let dist = 0
    const arcSpan = vine.arcLength * (VINE_T_END - VINE_T_START)
    vine.letters.forEach((letter, i) => {
      const spacing = letter === ' ' ? WORD_SPACE_SPACING : LETTER_SPACING
      const t = tAtArcLength(vine, VINE_T_START * vine.arcLength + dist, arcSpan)
      const base = quadraticPoint(vine, t)
      //
      // Pendulum sway: fixed at top anchors, strongest at the arc sag
      //
      const swayFactor = Math.sin(t * Math.PI)
      const swayPhase = time * SWAY_SPEED + vine.phase + t * 2.4
      const swayX = Math.sin(swayPhase) * SWAY_AMPLITUDE * swayFactor
      const swayY = Math.sin(swayPhase * 0.7 + 0.6) * SWAY_AMPLITUDE * 0.12 * swayFactor
      if (letter === ' ') {
        k.drawText({
          text: '·',
          size: Math.round(vine.letterSize * 0.45),
          font,
          pos: k.vec2(base.x + swayX, base.y + swayY),
          anchor: 'center',
          color,
          opacity: SPACE_OPACITY
        })
      } else {
        k.drawText({
          text: letter,
          size: vine.letterSize,
          font,
          pos: k.vec2(base.x + swayX, base.y + swayY),
          anchor: 'center',
          color,
          opacity: VINE_OPACITY
        })
      }
      i < vine.letters.length - 1 && (dist += spacing)
    })
  })
}

//
// Quadratic bezier point at parameter t (0 = left top, 1 = right top)
//
function quadraticPoint(vine, t) {
  const u = 1 - t
  return {
    x: u * u * vine.startX + 2 * u * t * vine.controlX + t * t * vine.endX,
    y: u * u * vine.startY + 2 * u * t * vine.controlY + t * t * vine.endY
  }
}

//
// Total arc length of the hanging curve
//
function measureArcLength(vine) {
  const samples = 32
  let total = 0
  let prev = quadraticPoint(vine, 0)
  for (let i = 1; i <= samples; i++) {
    const pt = quadraticPoint(vine, i / samples)
    total += Math.hypot(pt.x - prev.x, pt.y - prev.y)
    prev = pt
  }
  return total
}

//
// Maps arc-length distance along the vine to bezier parameter t
//
function tAtArcLength(vine, dist, maxDist) {
  const samples = 32
  let total = 0
  let prev = quadraticPoint(vine, 0)
  const segLens = [0]
  for (let i = 1; i <= samples; i++) {
    const pt = quadraticPoint(vine, i / samples)
    total += Math.hypot(pt.x - prev.x, pt.y - prev.y)
    segLens.push(total)
    prev = pt
  }
  if (total <= 0) return VINE_T_START
  const target = Math.min(dist, maxDist ?? total)
  for (let i = 1; i <= samples; i++) {
    if (segLens[i] >= target) {
      const segStart = segLens[i - 1]
      const segEnd = segLens[i]
      const frac = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0
      return ((i - 1) + frac) / samples
    }
  }
  return VINE_T_END
}
