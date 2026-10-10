//
// Drop shadow offset for touch-section UI text (matches glow HUD style).
//
export const TOUCH_TEXT_SHADOW_DX = 1.5
export const TOUCH_TEXT_SHADOW_DY = 1.5

/**
 * Adds a fixed screen-space Kaplay text label with a single drop shadow copy.
 * @param {Object} k - Kaplay instance
 * @param {Object} cfg - Layout and style
 * @param {string} cfg.text - Label string
 * @param {number} cfg.x - Center X
 * @param {number} cfg.y - Center Y
 * @param {number} cfg.size - Font size
 * @param {string} [cfg.font] - Font family
 * @param {string} [cfg.align] - Text align
 * @param {number} cfg.colorR - Main text R
 * @param {number} cfg.colorG - Main text G
 * @param {number} cfg.colorB - Main text B
 * @param {number} cfg.zIndex - Draw order for main text
 * @param {number} [cfg.opacity] - Main text opacity (0–1)
 * @returns {{ main: Object, shadow: Object }} Kaplay text objects
 */
export function addFixedTextWithShadow(k, cfg) {
  const {
    text,
    x,
    y,
    size,
    font,
    align = 'center',
    colorR,
    colorG,
    colorB,
    zIndex,
    opacity = 1
  } = cfg
  const textOpts = { size, align }
  font && (textOpts.font = font)
  const shadow = k.add([
    k.text(text, textOpts),
    k.pos(x + TOUCH_TEXT_SHADOW_DX, y + TOUCH_TEXT_SHADOW_DY),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(opacity * 0.85),
    k.fixed(),
    k.z(zIndex)
  ])
  const main = k.add([
    k.text(text, textOpts),
    k.pos(x, y),
    k.anchor('center'),
    k.color(colorR, colorG, colorB),
    k.opacity(opacity),
    k.fixed(),
    k.z(zIndex + 0.1)
  ])
  return { shadow, main }
}
