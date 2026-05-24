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
const BTN_OUTLINE_WIDTH = 2
const BTN_OUTLINE_R = 200
const BTN_OUTLINE_G = 200
const BTN_OUTLINE_B = 200
const BTN_TEXT_SIZE = 22
const BTN_TEXT_R = 235
const BTN_TEXT_G = 235
const BTN_TEXT_B = 235

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
