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
// Thin outline on vine letters — black cardinal stroke (matches touch tree/cloud style)
//
const VINE_OUTLINE_OFFSETS = [
  [-1, 0], [1, 0], [0, -1], [0, 1]
]
const VINE_OUTLINE_HEX = CFG.visual.colors.outline ?? '#000000'
//
// Letter placement: arc letters pin start and end on the top platform; hang drapes down
//
const HANG_LETTER_T_START = 0.02
const HANG_LETTER_T_END = 0.98
const ARC_LETTER_T_START = 0
const ARC_LETTER_T_END = 1
const ARC_LENGTH_SAMPLES = 48
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
//
// Intrusive-thought sentences
//
const VINE_PHRASES = [
  'Said wrong thing',
  'Cant stop thinking',
  'Did they notice',
  'They are judging me',
  'Something bad coming',
  'Stayed quiet again',
  'They are angry',
  'Why did I do that',
  'Nobody likes me',
  'That look meant it'
]
//
// Random vine layout — varied anchor, length, span, and arc vs hang per level load
//
const VINE_COUNT_MIN = 6
const VINE_COUNT_MAX = 10
const VINE_X_RATIO_MIN = 0.03
const VINE_X_RATIO_MAX = 0.97
//
// Horizontal slot jitter — keeps vines spread edge-to-edge with slight randomness
//
const VINE_SLOT_JITTER = 0.55
const VINE_LENGTH_MIN = 0.38
const VINE_LENGTH_MAX = 1
const VINE_DRIFT_MIN = -36
const VINE_DRIFT_MAX = 36
const VINE_SPAN_RATIO_MIN = 0.11
const VINE_SPAN_RATIO_MAX = 0.2
const VINE_SAG_MIN = 0.52
const VINE_SAG_MAX = 0.9
const VINE_DEPTH_OPACITY_MIN = 0.38
const VINE_DEPTH_OPACITY_MAX = 0.62

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
  const playTop = topPlatformHeight ?? k.height() * 0.33
  const playBottom = k.height() - (bottomPlatformHeight ?? k.height() * 0.12)
  const playWidth = k.width()
  const playHeight = playBottom - playTop
  const spanLeft = 0
  const vineCount = VINE_COUNT_MIN + Math.floor(Math.random() * (VINE_COUNT_MAX - VINE_COUNT_MIN + 1))
  const vines = []
  for (let index = 0; index < vineCount; index++) {
    const slotCenter = (index + 0.5) / vineCount
    const jitter = (Math.random() - 0.5) * (VINE_SLOT_JITTER / vineCount)
    const xRatio = Math.min(VINE_X_RATIO_MAX, Math.max(VINE_X_RATIO_MIN, slotCenter + jitter))
    const layout = resolveVineLayout(xRatio)
    vines.push(buildVine(
      layout,
      pickRandomPhrase(),
      spanLeft,
      playWidth,
      playTop,
      playBottom,
      playHeight
    ))
  }
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
// Picks arc (both ends on top platform) or hang (single top anchor) with random layout
//
function resolveVineLayout(xRatio) {
  const length = VINE_LENGTH_MIN + Math.random() * (VINE_LENGTH_MAX - VINE_LENGTH_MIN)
  return {
    xRatio,
    length,
    drift: VINE_DRIFT_MIN + Math.random() * (VINE_DRIFT_MAX - VINE_DRIFT_MIN),
    spanRatio: VINE_SPAN_RATIO_MIN + Math.random() * (VINE_SPAN_RATIO_MAX - VINE_SPAN_RATIO_MIN),
    sag: VINE_SAG_MIN + Math.random() * (VINE_SAG_MAX - VINE_SAG_MIN),
    phase: Math.random() * Math.PI * 2,
    depthOpacity: VINE_DEPTH_OPACITY_MIN + length * (VINE_DEPTH_OPACITY_MAX - VINE_DEPTH_OPACITY_MIN),
    arc: Math.random() < ARC_VINE_CHANCE
  }
}

//
// Picks a random intrusive-thought phrase for each vine on level load
//
function pickRandomPhrase() {
  return VINE_PHRASES[Math.floor(Math.random() * VINE_PHRASES.length)]
}

//
// Builds one vine — hang drapes from top platform; arc spans between two top anchors
//
function buildVine(layout, phrase, playLeft, playWidth, playTop, playBottom, playHeight) {
  //
  // Bottom edge of the top platform — both arc ends and hang starts pin here
  //
  const topAnchorY = playTop
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
      depthOpacity: layout.depthOpacity ?? VINE_OPACITY,
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
    depthOpacity: layout.depthOpacity ?? VINE_OPACITY,
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
  const outlineR = parseInt(VINE_OUTLINE_HEX.slice(1, 3), 16)
  const outlineG = parseInt(VINE_OUTLINE_HEX.slice(3, 5), 16)
  const outlineB = parseInt(VINE_OUTLINE_HEX.slice(5, 7), 16)
  const outlineColor = k.rgb(outlineR, outlineG, outlineB)
  vines.forEach(vine => {
    const vineOpacity = vine.depthOpacity ?? VINE_OPACITY
    getLetterLayout(vine).forEach(({ letter, t, size }) => {
      const base = quadraticPoint(vine, t)
      //
      // Arc: sway at sag; hang: sway grows toward the dangling tip
      //
      const swayFactor = vine.arc ? Math.sin(t * Math.PI) : t * t
      const swayPhase = time * SWAY_SPEED + vine.phase + t * 2.4
      const swayX = Math.sin(swayPhase) * SWAY_AMPLITUDE * swayFactor
      const swayY = Math.sin(swayPhase * 0.7 + 0.6) * SWAY_AMPLITUDE * 0.12 * swayFactor
      const pos = k.vec2(base.x + swayX, base.y + swayY)
      const phraseColor = pickVinePhraseColor(k, t)
      if (letter === ' ') {
        k.drawText({
          text: '·',
          size: Math.round(size * 0.45),
          font,
          pos,
          anchor: 'center',
          color: phraseColor,
          opacity: SPACE_OPACITY * (vineOpacity / VINE_OPACITY)
        })
      } else {
        VINE_OUTLINE_OFFSETS.forEach(([dx, dy]) => {
          k.drawText({
            text: letter,
            size,
            font,
            pos: k.vec2(pos.x + dx, pos.y + dy),
            anchor: 'center',
            color: outlineColor,
            opacity: vineOpacity
          })
        })
        k.drawText({
          text: letter,
          size,
          font,
          pos,
          anchor: 'center',
          color: phraseColor,
          opacity: vineOpacity
        })
      }
    })
  })
}

//
// Picks a light red shade for vine glyphs from the section vineLetter palette
//
function pickVinePhraseColor(k, tAlongVine) {
  const palette = CFG.visual.colors.vineLetter
  if (!palette?.length) return k.rgb(200, 72, 88)
  const idx = Math.floor(tAlongVine * palette.length * 0.85 + Math.random() * 2)
  const hex = palette[Math.max(0, Math.min(palette.length - 1, idx))]
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return k.rgb(r, g, b)
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
