import { CFG } from '../cfg.js'

//
// Hanging vine phrases — intrusive-thought sentences draped between top playfield anchors
//
const VINE_Z = CFG.visual.zIndex.blades - 2
const LETTER_SIZE_MIN = 42
const LETTER_SIZE_MAX = 57
const LETTER_SPACING = 92
const WORD_SPACE_SPACING = 130
//
// Minimum gap so glyph bodies never overlap at full letter size
//
const LETTER_SPACING_SIZE_RATIO = 2.4
const WORD_SPACE_SIZE_RATIO = 3.4
//
// Hard minimum gap relative to render letter size so glyphs always have a visible hole
//
const MIN_LETTER_GAP_RATIO = 1.12
const MIN_WORD_GAP_RATIO = 1.4
const MIN_RENDER_LETTER_SIZE = 16
const SWAY_SPEED = 1.35
const SWAY_AMPLITUDE = 26
const VINE_OPACITY = 0.55
const SPACE_OPACITY = 0.35
//
// Letter placement: arc letters pin start and end on the top platform; hang drapes down
//
const HANG_LETTER_T_START = 0.02
const HANG_LETTER_T_END = 0.98
const ARC_LETTER_T_START = 0
const ARC_LETTER_T_END = 1
const ARC_LENGTH_SAMPLES = 48
const VINE_COLOR_R = 150
const VINE_COLOR_G = 150
const VINE_COLOR_B = 150
//
// Default horizontal span for parabolic arc vines (fraction of play width)
//
const ARC_SPAN_RATIO_DEFAULT = 0.14
const ARC_SAG_DEFAULT = 0.78
//
// Minimum vine drop as a fraction of playfield height (80% toward the floor)
//
const VINE_MIN_LENGTH = 0.8
//
// Chance each slot becomes a top-anchored arc (both ends on the top platform)
//
const ARC_VINE_CHANCE = 0.42
const VINE_SLOT_COUNT = 9
const VINE_LAYOUT_SEED = 7331
//
// Intrusive-thought sentences
//
const VINE_PHRASES = [
  'said wrong thing',
  'cant stop thinking',
  'did they notice',
  'they are judging me',
  'something bad coming',
  'stayed quiet again',
  'they are angry',
  'why did i do that',
  'nobody likes me',
  'that look meant it'
]
//
// Horizontal slots — arc vs hang is chosen randomly per slot at create time
//
const VINE_SLOTS = [
  { xRatio: 0.05, length: 1, drift: 28, spanRatio: 0.14, sag: 0.74, phase: 0.1 },
  { xRatio: 0.16, length: 0.9, drift: -18, spanRatio: 0.13, sag: 0.72, phase: 1.4 },
  { xRatio: 0.28, length: 0.88, drift: -32, spanRatio: 0.15, sag: 0.78, phase: 2.6 },
  { xRatio: 0.4, length: 0.95, drift: 22, spanRatio: 0.16, sag: 0.85, phase: 0.8 },
  { xRatio: 0.52, length: 0.94, drift: 14, spanRatio: 0.12, sag: 0.76, phase: 3.2 },
  { xRatio: 0.64, length: 0.86, drift: -26, spanRatio: 0.14, sag: 0.8, phase: 1.9 },
  { xRatio: 0.76, length: 1, drift: -24, spanRatio: 0.13, sag: 0.82, phase: 4.1 },
  { xRatio: 0.88, length: 0.84, drift: 18, spanRatio: 0.15, sag: 0.7, phase: 2.3 },
  { xRatio: 0.96, length: 0.82, drift: -12, spanRatio: 0.11, sag: 0.75, phase: 3.7 }
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
  const rand = seededRandom(VINE_LAYOUT_SEED + Math.round(playWidth))
  const vines = VINE_SLOTS.slice(0, VINE_SLOT_COUNT).map((slot, index) => buildVine(
    resolveVineLayout(slot, rand),
    index,
    playLeft,
    playWidth,
    playTop,
    playBottom,
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
// Picks arc (both ends on top platform) or hang (single top anchor) per slot
//
function resolveVineLayout(slot, rand) {
  return {
    ...slot,
    arc: rand() < ARC_VINE_CHANCE
  }
}

//
// Builds one vine — hang drapes from top platform; arc spans between two top anchors
//
function buildVine(layout, index, playLeft, playWidth, playTop, playBottom, playHeight) {
  //
  // Bottom edge of the top platform — both arc ends and hang starts pin here
  //
  const topAnchorY = playTop
  const phrase = VINE_PHRASES[index % VINE_PHRASES.length]
  if (layout.arc) {
    const startX = playLeft + playWidth * layout.xRatio
    const span = playWidth * (layout.spanRatio ?? ARC_SPAN_RATIO_DEFAULT)
    const sag = layout.sag ?? ARC_SAG_DEFAULT
    const letterSize = Math.round(LETTER_SIZE_MIN + sag * (LETTER_SIZE_MAX - LETTER_SIZE_MIN))
    const vine = {
      arc: true,
      letters: phrase.split(''),
      letterSize,
      startX,
      startY: topAnchorY,
      endX: startX + span,
      endY: topAnchorY,
      controlX: startX + span / 2,
      controlY: playTop + playHeight * sag,
      phase: layout.phase,
      arcLength: 0
    }
    vine.arcLength = measureArcLength(vine)
    return vine
  }
  const anchorX = playLeft + playWidth * layout.xRatio
  const length = Math.max(layout.length, VINE_MIN_LENGTH)
  const drop = length >= 0.98
    ? playBottom - topAnchorY - 10
    : playHeight * length
  const endX = anchorX + layout.drift
  const endY = topAnchorY + drop
  const controlX = anchorX + layout.drift * 0.45
  const controlY = topAnchorY + drop * 0.58
  const letterSize = Math.round(LETTER_SIZE_MIN + length * (LETTER_SIZE_MAX - LETTER_SIZE_MIN))
  const vine = {
    arc: false,
    letters: phrase.split(''),
    letterSize,
    startX: anchorX,
    startY: topAnchorY,
    controlX,
    controlY,
    endX,
    endY,
    phase: layout.phase,
    arcLength: 0
  }
  vine.arcLength = measureArcLength(vine)
  return vine
}

//
// Draws letters and visible word spaces along a hanging curve
//
function onDraw(inst) {
  const { k, vines } = inst
  const time = k.time()
  const font = CFG.visual.fonts.thinFull.replace(/'/g, '')
  const color = k.rgb(VINE_COLOR_R, VINE_COLOR_G, VINE_COLOR_B)
  vines.forEach(vine => {
    getLetterLayout(vine).forEach(({ letter, t, size }) => {
      const base = quadraticPoint(vine, t)
      //
      // Arc: sway at sag; hang: sway grows toward the dangling tip
      //
      const swayFactor = vine.arc ? Math.sin(t * Math.PI) : t * t
      const swayPhase = time * SWAY_SPEED + vine.phase + t * 2.4
      const swayX = Math.sin(swayPhase) * SWAY_AMPLITUDE * swayFactor
      const swayY = Math.sin(swayPhase * 0.7 + 0.6) * SWAY_AMPLITUDE * 0.12 * swayFactor
      if (letter === ' ') {
        k.drawText({
          text: '·',
          size: Math.round(size * 0.45),
          font,
          pos: k.vec2(base.x + swayX, base.y + swayY),
          anchor: 'center',
          color,
          opacity: SPACE_OPACITY
        })
      } else {
        k.drawText({
          text: letter,
          size,
          font,
          pos: k.vec2(base.x + swayX, base.y + swayY),
          anchor: 'center',
          color,
          opacity: VINE_OPACITY
        })
      }
    })
  })
}

//
// Evenly spaces letters along the usable curve — shrinks glyphs so a visible gap always remains
//
function getLetterLayout(vine) {
  const { letters } = vine
  if (!letters.length) return []
  const tStart = vine.arc ? ARC_LETTER_T_START : HANG_LETTER_T_START
  const tEnd = vine.arc ? ARC_LETTER_T_END : HANG_LETTER_T_END
  const usableLen = measureArcLengthBetween(vine, tStart, tEnd)
  if (letters.length === 1) {
    return [{
      letter: letters[0],
      t: vine.arc ? (tStart + tEnd) / 2 : tStart,
      size: vine.letterSize
    }]
  }
  //
  // Shrink letter size until visible-min gaps for the whole phrase fit the curve.
  // Then space evenly across the curve so glyphs never overlap.
  //
  const renderSize = chooseRenderSize(letters, vine.letterSize, usableLen)
  const visibleMins = computeVisibleMinGaps(letters, renderSize)
  const minTotal = visibleMins.reduce((sum, g) => sum + g, 0)
  //
  // If the minimum-spacing total leaves room, spread evenly across the full curve;
  // otherwise pack at the visible minimum (still no overlap thanks to renderSize).
  //
  const stretch = minTotal > 0 && minTotal < usableLen ? usableLen / minTotal : 1
  const layout = []
  let dist = 0
  letters.forEach((letter, i) => {
    layout.push({
      letter,
      t: distToT(vine, tStart, tEnd, dist, usableLen),
      size: renderSize
    })
    i < letters.length - 1 && (dist += visibleMins[i] * stretch)
  })
  return layout
}

//
// Picks the largest letter size at which every glyph keeps a visible gap to its neighbour
//
function chooseRenderSize(letters, baseSize, usableLen) {
  for (let size = baseSize; size >= MIN_RENDER_LETTER_SIZE; size--) {
    let needed = 0
    for (let i = 0; i < letters.length - 1; i++) {
      needed += letters[i] === ' '
        ? size * MIN_WORD_GAP_RATIO
        : size * MIN_LETTER_GAP_RATIO
    }
    if (needed <= usableLen) return size
  }
  return MIN_RENDER_LETTER_SIZE
}

//
// Per-gap visible minimum so glyph bodies never overlap each other
//
function computeVisibleMinGaps(letters, renderSize) {
  const gaps = []
  for (let i = 0; i < letters.length - 1; i++) {
    gaps.push(letters[i] === ' '
      ? renderSize * MIN_WORD_GAP_RATIO
      : renderSize * MIN_LETTER_GAP_RATIO)
  }
  return gaps
}

//
// Maps distance along the usable arc (0 = tStart, usableLen = tEnd) to bezier t
//
function distToT(vine, tStart, tEnd, dist, usableLen) {
  if (usableLen <= 0) return tStart
  const frac = Math.min(1, Math.max(0, dist / usableLen))
  const samples = ARC_LENGTH_SAMPLES
  let total = 0
  let prev = quadraticPoint(vine, tStart)
  const segLens = [0]
  for (let i = 1; i <= samples; i++) {
    const t = tStart + (tEnd - tStart) * (i / samples)
    const pt = quadraticPoint(vine, t)
    total += Math.hypot(pt.x - prev.x, pt.y - prev.y)
    segLens.push(total)
    prev = pt
  }
  if (total <= 0) return tStart
  const target = frac * total
  for (let i = 1; i <= samples; i++) {
    if (segLens[i] >= target) {
      const segStart = segLens[i - 1]
      const segEnd = segLens[i]
      const segFrac = segEnd > segStart ? (target - segStart) / (segEnd - segStart) : 0
      return tStart + (tEnd - tStart) * ((i - 1) + segFrac) / samples
    }
  }
  return tEnd
}

//
// Arc length between two bezier parameters
//
function measureArcLengthBetween(vine, tStart, tEnd) {
  const samples = ARC_LENGTH_SAMPLES
  let total = 0
  let prev = quadraticPoint(vine, tStart)
  for (let i = 1; i <= samples; i++) {
    const t = tStart + (tEnd - tStart) * (i / samples)
    const pt = quadraticPoint(vine, t)
    total += Math.hypot(pt.x - prev.x, pt.y - prev.y)
    prev = pt
  }
  return total
}

//
// Quadratic bezier point at parameter t (0 = start anchor, 1 = end)
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
  return measureArcLengthBetween(vine, 0, 1)
}

//
// Deterministic pseudo-random for stable arc/hang mix per playfield width
//
function seededRandom(seed) {
  let state = seed >>> 0
  return () => {
    state = (state * 1103515245 + 12345) >>> 0
    return state / 0xffffffff
  }
}
