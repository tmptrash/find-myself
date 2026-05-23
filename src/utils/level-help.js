import { CFG } from '../cfg.js'
import { getRGB } from './helper.js'
import * as Tooltip from './tooltip.js'

//
// HELP label layout — right edge aligned with life HUD
//
const HELP_UI_RIGHT_MARGIN = 70
const HELP_LABEL_TEXT = '3 fragments for HELP'
const HELP_FONT_SIZE = 26
const HELP_PRESSED_FONT_SIZE = 22
const HELP_PRESSED_SHIFT_X = 3
const HELP_PRESSED_SHIFT_Y = 2
const HELP_HIT_HALF_W = 150
const HELP_HIT_HALF_H = 28
const HELP_OUTLINE_OFFSET = 2
//
// Hint panel styling (life-deduction bubble, wider)
//
const PANEL_BOX_WIDTH = 760
const PANEL_BOX_HEIGHT = 340
const PANEL_BOX_RADIUS = 16
const PANEL_BORDER_WIDTH = 3
const PANEL_FRAME_ALPHA = 0.88
const PANEL_FILL_ALPHA = 1.0
const PANEL_FONT_SIZE = 28
const PANEL_LINE_SPACING = 10
const PANEL_HINT_Y_OFFSET = -28
const PANEL_FADE_IN = 0.35
const PANEL_Z = 620
const CLOSE_HINT_TEXT = 'click to close'
const CLOSE_HINT_FONT_SIZE = 20
const CLOSE_HINT_Y_OFFSET = 118
const CLOSE_HINT_COLOR_HEX = '#BFBFBF'
const CLOSE_HINT_FLICKER_DURATION = 1.2
const CLOSE_HINT_MIN_OPACITY = 0.4
const CLOSE_HINT_MAX_OPACITY = 0.75
//
// Section letter colors (match level indicator top-left)
//
const SECTION_HELP_COLORS = {
  touch: '#8B5A50',
  time: '#FF8C00',
  word: '#DC143C'
}
//
// Per-level hint copy
//
export const LEVEL_HELP_TEXTS = {
  'level-touch.0': 'herd all the bugs into one spot\nand see what happens',
  'level-touch.1': 'play the notes shown\nby your other half',
  'level-touch.2': 'jump to the right of the icicles,\nthen you\'ll figure out the rest',
  'level-touch.3': 'turns out the bugs\nare trampolines :)',
  'level-time.0': 'hurry — platforms\ndon\'t last forever',
  'level-time.1': 'ones kill you —\njust don\'t jump on them',
  'level-time.2': 'an odd sum of digits kills you,\nan even sum doesn\'t',
  'level-time.3': 'just reach your other half —\nwith or against the wind ;)',
  'level-word.0': 'some words cut like blades —\navoid them',
  'level-word.1': 'life always finds a way to ruin\nyour plans. be careful',
  'level-word.2': 'use your memory to remember where\nthe blade-like words are...',
  'level-word.3': 'be quick and focused.\nnothing more',
  'level-word.4': 'do everything fast\nand don\'t trust logic'
}

/**
 * Creates bottom-right HELP label with click-to-open hint panel
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {string} config.levelName - Scene name (e.g. level-touch.0)
 * @param {number} config.sideWallWidth - Right game-area inset
 * @param {number} config.floorY - Top Y of the bottom platform / game floor
 * @returns {Object|null} HELP instance or null when level has no hint text
 */
export function create(config) {
  const { k, levelName, sideWallWidth, floorY } = config
  const hintText = LEVEL_HELP_TEXTS[levelName]
  if (!hintText) return null
  const sectionColorHex = getSectionHelpColor(levelName)
  const { r, g, b } = getRGB(k, sectionColorHex)
  const font = CFG.visual.fonts.thinFull.replace(/'/g, '')
  const helpX = k.width() - sideWallWidth - HELP_UI_RIGHT_MARGIN
  const helpY = (floorY + k.height()) / 2
  const outlineOffsets = buildOutlineOffsets(HELP_OUTLINE_OFFSET)
  const outlineNodes = outlineOffsets.map(([dx, dy]) => k.add([
    k.text(HELP_LABEL_TEXT, { size: HELP_FONT_SIZE, font, align: 'center' }),
    k.pos(helpX + dx, helpY + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 2)
  ]))
  const labelNode = k.add([
    k.text(HELP_LABEL_TEXT, { size: HELP_FONT_SIZE, font, align: 'center' }),
    k.pos(helpX, helpY),
    k.anchor('center'),
    k.color(r, g, b),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 3)
  ])
  const inst = {
    k,
    levelName,
    hintText,
    sectionColorHex,
    helpX,
    helpY,
    font,
    labelNode,
    outlineNodes,
    pressed: false,
    panelOpen: false,
    panelNodes: null,
    panelOpacity: 0,
    panelPhase: 'closed',
    panelTimer: 0,
    closeFlickerTime: CLOSE_HINT_FLICKER_DURATION,
    closeFlickerDir: -1
  }
  k.onUpdate(() => onUpdate(inst))
  k.onMousePress(() => onMousePress(inst))
  k.onMouseRelease(() => onMouseRelease(inst))
  k.onKeyPress('escape', () => inst.panelOpen && closePanel(inst))
  return inst
}

//
// Resolves section accent color from level scene name
//
function getSectionHelpColor(levelName) {
  if (levelName.includes('touch')) return SECTION_HELP_COLORS.touch
  if (levelName.includes('time')) return SECTION_HELP_COLORS.time
  if (levelName.includes('word')) return SECTION_HELP_COLORS.word
  return SECTION_HELP_COLORS.touch
}

//
// Eight-direction outline offset pairs
//
function buildOutlineOffsets(thickness) {
  return [
    [-thickness, -thickness],
    [0, -thickness],
    [thickness, -thickness],
    [-thickness, 0],
    [thickness, 0],
    [-thickness, thickness],
    [0, thickness],
    [thickness, thickness]
  ]
}

//
// Tracks press shrink, panel fade, and close-hint pulse
//
function onUpdate(inst) {
  if (!inst.labelNode?.exists?.()) return
  const scale = inst.pressed ? HELP_PRESSED_FONT_SIZE / HELP_FONT_SIZE : 1
  const shiftX = inst.pressed ? HELP_PRESSED_SHIFT_X : 0
  const shiftY = inst.pressed ? HELP_PRESSED_SHIFT_Y : 0
  inst.labelNode.scale = inst.k.vec2(scale, scale)
  inst.labelNode.pos.x = inst.helpX + shiftX
  inst.labelNode.pos.y = inst.helpY + shiftY
  const outlineOffsets = buildOutlineOffsets(HELP_OUTLINE_OFFSET)
  inst.outlineNodes.forEach((node, i) => {
    if (!node?.exists?.()) return
    const [dx, dy] = outlineOffsets[i]
    node.scale = inst.k.vec2(scale, scale)
    node.pos.x = inst.helpX + shiftX + dx
    node.pos.y = inst.helpY + shiftY + dy
  })
  if (inst.panelPhase === 'opening') {
    inst.panelTimer += inst.k.dt()
    inst.panelOpacity = Math.min(1, inst.panelTimer / PANEL_FADE_IN)
    setPanelOpacity(inst, inst.panelOpacity)
    inst.panelTimer >= PANEL_FADE_IN && (inst.panelPhase = 'open')
  } else if (inst.panelPhase === 'closing') {
    inst.panelTimer += inst.k.dt()
    inst.panelOpacity = Math.max(0, 1 - inst.panelTimer / PANEL_FADE_IN)
    setPanelOpacity(inst, inst.panelOpacity)
    if (inst.panelTimer >= PANEL_FADE_IN) {
      destroyPanel(inst)
      inst.panelPhase = 'closed'
      inst.panelOpen = false
      Tooltip.unsuppressAll()
    }
  }
  inst.panelOpen && updateCloseHintPulse(inst)
}

//
// Pulses "click to close" like the ready scene hint
//
function updateCloseHintPulse(inst) {
  if (!inst.panelNodes?.closeHint) return
  inst.closeFlickerTime += inst.k.dt() * inst.closeFlickerDir
  if (inst.closeFlickerTime >= CLOSE_HINT_FLICKER_DURATION) {
    inst.closeFlickerDir = -1
    inst.closeFlickerTime = CLOSE_HINT_FLICKER_DURATION
  } else if (inst.closeFlickerTime <= 0) {
    inst.closeFlickerDir = 1
    inst.closeFlickerTime = 0
  }
  const pulse = CLOSE_HINT_MIN_OPACITY +
    (CLOSE_HINT_MAX_OPACITY - CLOSE_HINT_MIN_OPACITY) * (inst.closeFlickerTime / CLOSE_HINT_FLICKER_DURATION)
  const op = pulse * inst.panelOpacity
  inst.panelNodes.closeHint.opacity = op
  inst.panelNodes.closeHintOutlines.forEach(node => { node.opacity = op })
}

//
// Shrinks HELP on press; closes open panel on any click
//
function onMousePress(inst) {
  if (inst.panelOpen) {
    closePanel(inst)
    return
  }
  isMouseOverHelp(inst) && (inst.pressed = true)
}

//
// Opens hint panel after click release on HELP
//
function onMouseRelease(inst) {
  if (!inst.pressed) return
  inst.pressed = false
  if (!isMouseOverHelp(inst) || inst.panelOpen) return
  openPanel(inst)
}

//
// True when cursor is over the HELP hit area
//
function isMouseOverHelp(inst) {
  const mp = inst.k.mousePos()
  return Math.abs(mp.x - inst.helpX) < HELP_HIT_HALF_W && Math.abs(mp.y - inst.helpY) < HELP_HIT_HALF_H
}

//
// Builds centered hint panel and dims the scene
//
function openPanel(inst) {
  if (inst.panelOpen) return
  const { k, hintText, sectionColorHex } = inst
  inst.panelOpen = true
  inst.panelPhase = 'opening'
  inst.panelTimer = 0
  inst.panelOpacity = 0
  inst.closeFlickerTime = CLOSE_HINT_FLICKER_DURATION
  inst.closeFlickerDir = -1
  Tooltip.suppressAll()
  const centerX = CFG.visual.screen.width / 2
  const centerY = CFG.visual.screen.height / 2
  const hintY = centerY + PANEL_HINT_Y_OFFSET
  const closeY = centerY + CLOSE_HINT_Y_OFFSET
  const boxX = centerX - PANEL_BOX_WIDTH / 2
  const boxY = centerY - PANEL_BOX_HEIGHT / 2
  const { r, g, b } = getRGB(k, sectionColorHex)
  const closeRgb = getRGB(k, CLOSE_HINT_COLOR_HEX)
  const overlay = k.add([
    k.z(PANEL_Z),
    k.opacity(0),
    k.fixed(),
    {
      draw() {
        k.drawRect({
          width: k.width(),
          height: k.height(),
          pos: k.vec2(0, 0),
          color: k.rgb(0, 0, 0),
          opacity: 0.45 * inst.panelOpacity
        })
      }
    }
  ])
  const bubble = k.add([
    k.z(PANEL_Z + 1),
    k.opacity(0),
    k.fixed(),
    {
      draw() {
        const o = inst.panelOpacity
        k.drawRect({
          pos: k.vec2(boxX - PANEL_BORDER_WIDTH, boxY - PANEL_BORDER_WIDTH),
          width: PANEL_BOX_WIDTH + PANEL_BORDER_WIDTH * 2,
          height: PANEL_BOX_HEIGHT + PANEL_BORDER_WIDTH * 2,
          radius: PANEL_BOX_RADIUS + PANEL_BORDER_WIDTH,
          color: k.rgb(230, 233, 238),
          opacity: o * PANEL_FRAME_ALPHA
        })
        k.drawRect({
          pos: k.vec2(boxX, boxY),
          width: PANEL_BOX_WIDTH,
          height: PANEL_BOX_HEIGHT,
          radius: PANEL_BOX_RADIUS,
          color: k.rgb(72, 74, 82),
          opacity: o * PANEL_FILL_ALPHA
        })
      }
    }
  ])
  const outlineOffsets = buildOutlineOffsets(HELP_OUTLINE_OFFSET)
  const hintOutlines = outlineOffsets.map(([dx, dy]) => k.add([
    k.text(hintText, {
      size: PANEL_FONT_SIZE,
      align: 'center',
      lineSpacing: PANEL_LINE_SPACING,
      font: inst.font
    }),
    k.pos(centerX + dx, hintY + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(0),
    k.fixed(),
    k.z(PANEL_Z + 2)
  ]))
  const hintMain = k.add([
    k.text(hintText, {
      size: PANEL_FONT_SIZE,
      align: 'center',
      lineSpacing: PANEL_LINE_SPACING,
      font: inst.font
    }),
    k.pos(centerX, hintY),
    k.anchor('center'),
    k.color(r, g, b),
    k.opacity(0),
    k.fixed(),
    k.z(PANEL_Z + 3)
  ])
  const closeHintOutlines = outlineOffsets.map(([dx, dy]) => k.add([
    k.text(CLOSE_HINT_TEXT, { size: CLOSE_HINT_FONT_SIZE, font: inst.font }),
    k.pos(centerX + dx, closeY + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(0),
    k.fixed(),
    k.z(PANEL_Z + 2)
  ]))
  const closeHint = k.add([
    k.text(CLOSE_HINT_TEXT, { size: CLOSE_HINT_FONT_SIZE, font: inst.font }),
    k.pos(centerX, closeY),
    k.anchor('center'),
    k.color(closeRgb.r, closeRgb.g, closeRgb.b),
    k.opacity(0),
    k.fixed(),
    k.z(PANEL_Z + 3)
  ])
  inst.panelNodes = { overlay, bubble, hintOutlines, hintMain, closeHintOutlines, closeHint }
}

//
// Starts panel fade-out
//
function closePanel(inst) {
  if (!inst.panelOpen || inst.panelPhase === 'closing') return
  inst.panelPhase = 'closing'
  inst.panelTimer = 0
}

//
// Applies opacity to all panel nodes
//
function setPanelOpacity(inst, opacity) {
  if (!inst.panelNodes) return
  const { overlay, bubble, hintOutlines, hintMain, closeHintOutlines, closeHint } = inst.panelNodes
  overlay.opacity = opacity
  bubble.opacity = opacity
  hintMain.opacity = opacity
  hintOutlines.forEach(node => { node.opacity = opacity })
  if (closeHint) {
    const pulse = CLOSE_HINT_MIN_OPACITY +
      (CLOSE_HINT_MAX_OPACITY - CLOSE_HINT_MIN_OPACITY) * (inst.closeFlickerTime / CLOSE_HINT_FLICKER_DURATION)
    closeHint.opacity = pulse * opacity
    closeHintOutlines.forEach(node => { node.opacity = pulse * opacity })
  }
}

//
// Removes panel nodes from the scene
//
function destroyPanel(inst) {
  if (!inst.panelNodes) return
  const { overlay, bubble, hintOutlines, hintMain, closeHintOutlines, closeHint } = inst.panelNodes
  overlay.destroy?.()
  bubble.destroy?.()
  hintMain.destroy?.()
  hintOutlines.forEach(node => node.destroy?.())
  closeHint?.destroy?.()
  closeHintOutlines?.forEach(node => node.destroy?.())
  inst.panelNodes = null
}
