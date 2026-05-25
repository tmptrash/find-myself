import { isTouchDevice } from './touch-input.js'
import { CFG } from '../cfg.js'

//
// Touch-only on-screen tap button used in place of keyboard hint texts
// (e.g. "Press Enter to start"). Renders a simple framed rectangle with a
// centered label and triggers the supplied callback on click/tap.
//
const BTN_WIDTH = 220
const BTN_HEIGHT = 56
const BTN_BG_R = 26
const BTN_BG_G = 26
const BTN_BG_B = 26
const BTN_BG_OPACITY = 0.9
const BTN_OUTLINE_R = 68
const BTN_OUTLINE_G = 68
const BTN_OUTLINE_B = 68
const BTN_OUTLINE_WIDTH = 3
const BTN_TEXT_SIZE = 22
const BTN_TEXT_R = 235
const BTN_TEXT_G = 235
const BTN_TEXT_B = 235
//
// Inline variant (sits within a hint phrase, hugs its label).
//
const INLINE_PADDING_X = 10
const INLINE_PADDING_Y = 3
const INLINE_BG_OPACITY = 0.95
const INLINE_TEXT_R = 240
const INLINE_TEXT_G = 240
const INLINE_TEXT_B = 240
//
// Default hint colors used by renderHintWithEnter.
//
const HINT_TEXT_R = 150
const HINT_TEXT_G = 150
const HINT_TEXT_B = 150
const HINT_OUTLINE_R = 0
const HINT_OUTLINE_G = 0
const HINT_OUTLINE_B = 0
const HINT_OUTLINE_OFFSETS = [[-2, 0], [2, 0], [0, -2], [0, 2], [-1, -1], [1, -1], [-1, 1], [1, 1]]
const ENTER_LABEL = 'Enter'

/**
 * Creates a tappable in-game button (touch devices only). Returns the
 * created inst or null on desktop so callers can render their normal
 * keyboard hint instead.
 *
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Center X
 * @param {number} cfg.y - Center Y
 * @param {string} cfg.label - Button caption
 * @param {Function} cfg.onTap - Click/tap callback
 * @param {number} [cfg.width=BTN_WIDTH] - Override button width
 * @param {number} [cfg.height=BTN_HEIGHT] - Override button height
 * @param {number} [cfg.z] - Z index for the button rect (text uses z+1)
 * @param {boolean} [cfg.fixed=false] - Use k.fixed() so the button stays on screen
 * @returns {Object|null} { rect, text, destroy }
 */
export function create(cfg) {
  if (!isTouchDevice()) return null
  const {
    k,
    x,
    y,
    label,
    onTap,
    width = BTN_WIDTH,
    height = BTN_HEIGHT,
    z = CFG.visual.zIndex.ui + 50,
    fixed = false
  } = cfg
  //
  // Build component lists; k.fixed() is opt-in so menu/training buttons
  // can sit in world space like the text they replace.
  //
  const rectComps = [
    k.rect(width, height),
    k.pos(x, y),
    k.anchor('center'),
    k.area(),
    k.color(BTN_BG_R, BTN_BG_G, BTN_BG_B),
    k.outline(BTN_OUTLINE_WIDTH, k.rgb(BTN_OUTLINE_R, BTN_OUTLINE_G, BTN_OUTLINE_B)),
    k.opacity(BTN_BG_OPACITY),
    k.z(z)
  ]
  fixed && rectComps.push(k.fixed())
  const rect = k.add(rectComps)
  const textComps = [
    k.text(label, { size: BTN_TEXT_SIZE }),
    k.pos(x, y),
    k.anchor('center'),
    k.color(BTN_TEXT_R, BTN_TEXT_G, BTN_TEXT_B),
    k.z(z + 1)
  ]
  fixed && textComps.push(k.fixed())
  const text = k.add(textComps)
  rect.onClick(onTap)
  return {
    rect,
    text,
    destroy() {
      rect.exists?.() && rect.destroy()
      text.exists?.() && text.destroy()
    }
  }
}

/**
 * Creates a small framed key-cap-style tappable label intended to sit inline
 * inside a hint phrase (e.g. between the words "press" and "or click to
 * start"). Returns null on desktop so callers can render plain text instead.
 *
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Center X for the button
 * @param {number} cfg.y - Center Y for the button
 * @param {string} cfg.label - Button caption (e.g. "Enter")
 * @param {number} cfg.fontSize - Font size of the label
 * @param {Function} cfg.onTap - Click callback
 * @param {string} [cfg.font] - Optional font family
 * @param {number} [cfg.z] - Z index for the button rect (text uses z+1)
 * @returns {Object|null} { rect, text, width, height, destroy() }
 */
export function createInline(cfg) {
  if (!isTouchDevice()) return null
  const {
    k,
    x,
    y,
    label,
    fontSize,
    onTap,
    font,
    z = CFG.visual.zIndex.ui + 50
  } = cfg
  //
  // Render the text first so we can size the frame around it precisely.
  //
  const textOpts = font ? { size: fontSize, font } : { size: fontSize }
  const text = k.add([
    k.text(label, textOpts),
    k.pos(x, y),
    k.anchor('center'),
    k.color(INLINE_TEXT_R, INLINE_TEXT_G, INLINE_TEXT_B),
    k.z(z + 1)
  ])
  const width = Math.round(text.width + INLINE_PADDING_X * 2)
  const height = Math.round(text.height + INLINE_PADDING_Y * 2)
  const rect = k.add([
    k.rect(width, height),
    k.pos(x, y),
    k.anchor('center'),
    k.area(),
    k.color(BTN_BG_R, BTN_BG_G, BTN_BG_B),
    k.outline(BTN_OUTLINE_WIDTH, k.rgb(BTN_OUTLINE_R, BTN_OUTLINE_G, BTN_OUTLINE_B)),
    k.opacity(INLINE_BG_OPACITY),
    k.z(z)
  ])
  rect.onClick(onTap)
  return {
    rect,
    text,
    width,
    height,
    destroy() {
      rect.exists?.() && rect.destroy()
      text.exists?.() && text.destroy()
    }
  }
}

/**
 * Renders a horizontal hint line composed of three parts: prefix + Enter + suffix.
 * Desktop draws the full sentence as a single text with outline shadows. Touch
 * devices keep the same text but replace the middle "Enter" word with a tappable
 * framed key-cap button so phones can fire the same action without a keyboard.
 *
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.centerX - Horizontal center of the full hint line
 * @param {number} cfg.y - Y position
 * @param {string} cfg.prefix - Text before the Enter button
 * @param {string} cfg.suffix - Text after the Enter button
 * @param {number} cfg.fontSize - Font size of every part
 * @param {string} [cfg.font] - Optional font family
 * @param {Array<number>} [cfg.color] - Text color [r, g, b]
 * @param {Array<number>} [cfg.outlineColor] - Outline color [r, g, b]
 * @param {Array<Array<number>>} [cfg.outlineOffsets] - Outline offsets
 * @param {number} [cfg.z] - Base z index (outline uses z-1, button text z+1)
 * @param {Function} cfg.onTap - Click callback when Enter button is tapped
 * @returns {Object} { setOpacity(op), destroy() }
 */
export function renderHintWithEnter(cfg) {
  const {
    k,
    centerX,
    y,
    prefix,
    suffix,
    fontSize,
    font,
    color = [HINT_TEXT_R, HINT_TEXT_G, HINT_TEXT_B],
    outlineColor = [HINT_OUTLINE_R, HINT_OUTLINE_G, HINT_OUTLINE_B],
    outlineOffsets = HINT_OUTLINE_OFFSETS,
    z = CFG.visual.zIndex.ui,
    onTap
  } = cfg
  const textOpts = font ? { size: fontSize, font } : { size: fontSize }
  const touchMode = isTouchDevice()
  //
  // Desktop: single text + outline shadows (existing visual style).
  //
  if (!touchMode) {
    const fullText = prefix + ENTER_LABEL + suffix
    const outlines = outlineOffsets.map(([dx, dy]) => k.add([
      k.text(fullText, textOpts),
      k.pos(centerX + dx, y + dy),
      k.anchor('center'),
      k.color(outlineColor[0], outlineColor[1], outlineColor[2]),
      k.z(z - 1)
    ]))
    const text = k.add([
      k.text(fullText, textOpts),
      k.pos(centerX, y),
      k.anchor('center'),
      k.color(color[0], color[1], color[2]),
      k.z(z)
    ])
    return {
      setOpacity(op) {
        text.opacity = op
        outlines.forEach(o => (o.opacity = op))
      },
      destroy() {
        text.exists?.() && text.destroy()
        outlines.forEach(o => o.exists?.() && o.destroy())
      }
    }
  }
  //
  // Touch: render prefix + Enter button + suffix laid out horizontally.
  // Measure widths via a probe so the three parts line up without overlap.
  //
  const prefixObj = k.add([
    k.text(prefix, textOpts),
    k.pos(centerX, y),
    k.anchor('left'),
    k.color(color[0], color[1], color[2]),
    k.z(z)
  ])
  const suffixObj = k.add([
    k.text(suffix, textOpts),
    k.pos(centerX, y),
    k.anchor('left'),
    k.color(color[0], color[1], color[2]),
    k.z(z)
  ])
  const enterProbe = k.add([
    k.text(ENTER_LABEL, textOpts),
    k.pos(-9999, -9999),
    k.anchor('left'),
    k.z(z)
  ])
  const enterTextWidth = enterProbe.width
  const enterTextHeight = enterProbe.height
  enterProbe.destroy()
  const enterBtnW = Math.round(enterTextWidth + INLINE_PADDING_X * 2)
  const enterBtnH = Math.round(enterTextHeight + INLINE_PADDING_Y * 2)
  const totalW = prefixObj.width + enterBtnW + suffixObj.width
  const xLeft = centerX - totalW / 2
  prefixObj.pos.x = xLeft
  suffixObj.pos.x = xLeft + prefixObj.width + enterBtnW
  const enterCenterX = xLeft + prefixObj.width + enterBtnW / 2
  //
  // Outline shadows around the surrounding text (button has its own frame).
  //
  const buildOutlines = (textValue, leftX) => outlineOffsets.map(([dx, dy]) => k.add([
    k.text(textValue, textOpts),
    k.pos(leftX + dx, y + dy),
    k.anchor('left'),
    k.color(outlineColor[0], outlineColor[1], outlineColor[2]),
    k.z(z - 1)
  ]))
  const prefixOutlines = buildOutlines(prefix, prefixObj.pos.x)
  const suffixOutlines = buildOutlines(suffix, suffixObj.pos.x)
  const enterRect = k.add([
    k.rect(enterBtnW, enterBtnH),
    k.pos(enterCenterX, y),
    k.anchor('center'),
    k.area(),
    k.color(BTN_BG_R, BTN_BG_G, BTN_BG_B),
    k.outline(BTN_OUTLINE_WIDTH, k.rgb(BTN_OUTLINE_R, BTN_OUTLINE_G, BTN_OUTLINE_B)),
    k.opacity(INLINE_BG_OPACITY),
    k.z(z)
  ])
  const enterText = k.add([
    k.text(ENTER_LABEL, textOpts),
    k.pos(enterCenterX, y),
    k.anchor('center'),
    k.color(INLINE_TEXT_R, INLINE_TEXT_G, INLINE_TEXT_B),
    k.z(z + 1)
  ])
  enterRect.onClick(onTap)
  const surroundingNodes = [prefixObj, suffixObj, ...prefixOutlines, ...suffixOutlines]
  return {
    setOpacity(op) {
      surroundingNodes.forEach(o => (o.opacity = op))
    },
    destroy() {
      [...surroundingNodes, enterRect, enterText].forEach(o => o.exists?.() && o.destroy())
    }
  }
}
