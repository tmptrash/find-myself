import { CFG } from '../cfg.js'
//
// Offset of the counter/timer relative to the hero position. Shared by every
// level that shows a number near the hero (firefly counter, meditation
// countdown, ...): slightly to the right and just above the head.
//
const COUNTER_X_OFFSET = 22
const COUNTER_Y_OFFSET = -64
//
// Full 8-direction outline so the digits read cleanly on any background.
//
const OUTLINE_OFFSETS = [[-1, -1], [0, -1], [1, -1], [-1, 0], [1, 0], [-1, 1], [0, 1], [1, 1]]
const OUTLINE_OPACITY = 0.8
const COUNTER_Z = 10

/**
 * Creates a hero-attached counter/timer instance. Text objects are created
 * lazily on the first update() call.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay inst
 * @param {number} cfg.size - Font size
 * @param {Object} cfg.color - Main text colour ({ r, g, b })
 * @param {string} [cfg.font] - Optional font family (Kaplay default if omitted)
 * @param {Object} [cfg.outlineColor] - Outline colour ({ r, g, b }), black by default
 * @returns {Object} Counter inst
 */
export function create(cfg) {
  const { k, size, color, font = null, outlineColor = { r: 0, g: 0, b: 0 } } = cfg
  return {
    k,
    size,
    font,
    color,
    outlineColor,
    textObj: null,
    outlineObjs: []
  }
}

/**
 * Shows the counter near the hero with the given text. Creates the retained
 * text objects on first call, then repositions and updates them every frame.
 * @param {Object} inst - Counter inst
 * @param {string} text - Text to display
 * @param {number} heroX - Hero X position
 * @param {number} heroY - Hero Y position
 */
export function update(inst, text, heroX, heroY) {
  const { k } = inst
  const cx = heroX + COUNTER_X_OFFSET
  const cy = heroY + COUNTER_Y_OFFSET
  !inst.textObj && createObjects(inst, text, cx, cy)
  inst.textObj.text = text
  inst.textObj.pos.x = cx
  inst.textObj.pos.y = cy
  inst.textObj.opacity = 1
  inst.outlineObjs.forEach((obj, i) => {
    if (!obj.exists?.()) return
    obj.text = text
    obj.pos.x = cx + OUTLINE_OFFSETS[i][0]
    obj.pos.y = cy + OUTLINE_OFFSETS[i][1]
    obj.opacity = OUTLINE_OPACITY
  })
}

/**
 * Hides the counter without destroying it (e.g. countdown cancelled or hero death).
 * @param {Object} inst - Counter inst
 */
export function hide(inst) {
  if (!inst?.textObj) return
  inst.textObj.opacity = 0
  inst.outlineObjs.forEach(obj => { obj.exists?.() && (obj.opacity = 0) })
}

/**
 * Destroys the counter's game objects.
 * @param {Object} inst - Counter inst
 */
export function destroy(inst) {
  if (!inst) return
  inst.textObj?.destroy?.()
  inst.outlineObjs.forEach(obj => obj.destroy?.())
  inst.textObj = null
  inst.outlineObjs = []
}
//
// Lazily builds the outline copies + main text object at the given position.
//
function createObjects(inst, text, cx, cy) {
  const { k } = inst
  const textOpts = inst.font ? { size: inst.size, font: inst.font } : { size: inst.size }
  inst.outlineObjs = OUTLINE_OFFSETS.map(([dx, dy]) => k.add([
    k.text(text, textOpts),
    k.pos(cx + dx, cy + dy),
    k.anchor('left'),
    k.color(inst.outlineColor.r, inst.outlineColor.g, inst.outlineColor.b),
    k.opacity(OUTLINE_OPACITY),
    k.z(CFG.visual.zIndex.ui + COUNTER_Z)
  ]))
  inst.textObj = k.add([
    k.text(text, textOpts),
    k.pos(cx, cy),
    k.anchor('left'),
    k.color(inst.color.r, inst.color.g, inst.color.b),
    k.opacity(1),
    k.z(CFG.visual.zIndex.ui + COUNTER_Z + 0.1)
  ])
}
