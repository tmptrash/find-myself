import { CFG } from '../cfg.js'

//
// Text platform visual (matches touch/time bonus text platforms)
//
const PLATFORM_TEXT = 'platform'
const PLATFORM_FONT_SIZE = 36
const PLATFORM_COLLISION_HEIGHT = 22
const FLOAT_AMPLITUDE = 3
const FLOAT_SPEED = 1.2
const TEXT_OUTLINE_OFFSETS = [
  [-2, -2], [0, -2], [2, -2],
  [-2, 0], [2, 0],
  [-2, 2], [0, 2], [2, 2]
]
const TEXT_MAIN_R = 192
const TEXT_MAIN_G = 192
const TEXT_MAIN_B = 192

/**
 * Creates a static word-text platform with collision (touch section style)
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {number} cfg.x - Center X
 * @param {number} cfg.y - Center Y
 * @param {number} cfg.width - Collision width
 * @param {string} [cfg.text=PLATFORM_TEXT] - Platform label
 * @param {number} [cfg.fontSize=PLATFORM_FONT_SIZE] - Label font size
 * @returns {Object} Platform instance
 */
export function create(cfg) {
  const { k, x, y, width, text = PLATFORM_TEXT, fontSize = PLATFORM_FONT_SIZE } = cfg
  const font = CFG.visual.fonts.thinFull.replace(/'/g, '')
  const platform = k.add([
    k.rect(width, PLATFORM_COLLISION_HEIGHT),
    k.pos(x, y),
    k.anchor('center'),
    k.area(),
    k.body({ isStatic: true }),
    k.opacity(0),
    k.z(CFG.visual.zIndex.platforms),
    CFG.game.platformName
  ])
  const inst = {
    k,
    x,
    y,
    text,
    fontSize,
    font,
    floatOffset: 0,
    platform
  }
  k.add([
    k.z(CFG.visual.zIndex.platforms),
    {
      draw() {
        onDraw(inst)
      }
    }
  ])
  k.onUpdate(() => onUpdate(inst))
  return inst
}

//
// Gentle float animation for the label
//
function onUpdate(inst) {
  inst.floatOffset += inst.k.dt() * FLOAT_SPEED
  const floatY = inst.y + Math.sin(inst.floatOffset) * FLOAT_AMPLITUDE
  inst.platform.pos.y = floatY
}

//
// Draws platform word with black outline
//
function onDraw(inst) {
  const { k, x, text, fontSize, font, floatOffset, y } = inst
  const floatY = y + Math.sin(floatOffset) * FLOAT_AMPLITUDE
  TEXT_OUTLINE_OFFSETS.forEach(([ox, oy]) => {
    k.drawText({
      text,
      size: fontSize,
      font,
      pos: k.vec2(x + ox, floatY + oy),
      anchor: 'center',
      color: k.rgb(0, 0, 0),
      opacity: 1
    })
  })
  k.drawText({
    text,
    size: fontSize,
    font,
    pos: k.vec2(x, floatY),
    anchor: 'center',
    color: k.rgb(TEXT_MAIN_R, TEXT_MAIN_G, TEXT_MAIN_B),
    opacity: 1
  })
}
