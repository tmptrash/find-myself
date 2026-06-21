import { CFG } from '../cfg.js'
import { getRGB, parseHex } from './helper.js'
import { get, set } from './progress.js'
import * as Sound from './sound.js'
import * as Tooltip from './tooltip.js'
import * as CanvasBackdrop from './canvas-backdrop.js'

//
// HELP label layout — centered in bottom margin below play area
//
const HELP_UI_VERTICAL_OFFSET = 5
export const HELP_UNDER_PLAY_AREA_OFFSET = 48
export const HELP_FRAGMENT_COST = 3
const HELP_LABEL_TEXT = 'buy help'
const HELP_LABEL_TOOLTIP_TEXT = 'Trade 3 fragments for level help'
const HELP_LABEL_TOOLTIP_WIDTH = 200
const HELP_LABEL_TOOLTIP_HEIGHT = 40
const HELP_LABEL_TOOLTIP_Y_OFFSET = -36
//
// Match the top-left section indicator letters (`fontSize = 48` in
// `<section>/components/level-indicator.js`) so the HELP label visually
// belongs to the same HUD typography level as the current-level title.
//
const HELP_FONT_SIZE = 48
const HELP_PRESSED_FONT_SIZE = 44
const HELP_PRESSED_SHIFT_X = 4
const HELP_PRESSED_SHIFT_Y = 3
const HELP_HIT_HALF_W = 180
const HELP_HIT_HALF_H = 40
const HELP_OUTLINE_OFFSET = 2
//
// Hint panel styling (life-deduction bubble, wider)
//
const PANEL_BOX_WIDTH = 760
const PANEL_BOX_HEIGHT = 340
const PANEL_BOX_RADIUS = 16
const PANEL_BORDER_WIDTH = 3
const PANEL_FRAME_ALPHA = 0.88
const PANEL_FILL_R = 72
const PANEL_FILL_G = 74
const PANEL_FILL_B = 82
const PANEL_BORDER_R = 0
const PANEL_BORDER_G = 0
const PANEL_BORDER_B = 0
const PANEL_FILL_ALPHA = 1.0
const PANEL_FONT_SIZE = 44
const PANEL_LINE_SPACING = 10
const PANEL_HINT_Y_OFFSET = -28
const PANEL_FADE_IN = 0.35
const PANEL_OVERLAY_DIM = 0.45
const PANEL_Z = 620
const CLOSE_HINT_TEXT = 'Click to close'
const CLOSE_HINT_FONT_SIZE = 20
const CLOSE_HINT_Y_OFFSET = 118
const CLOSE_HINT_COLOR_HEX = '#BFBFBF'
const CLOSE_HINT_FLICKER_DURATION = 1.2
const CLOSE_HINT_MIN_OPACITY = 0.4
const CLOSE_HINT_MAX_OPACITY = 0.75
//
// Fragment spend visual effect on HUD small hero
//
const SPEND_FLOAT_TEXT = `-${HELP_FRAGMENT_COST}`
const SPEND_FLOAT_FONT_SIZE = 36
const SPEND_FLOAT_X_OFFSET = 22
const SPEND_FLOAT_Y_OFFSET = -28
const SPEND_FLOAT_RISE = 42
const SPEND_FLOAT_DURATION = 0.85
const SPEND_PARTICLE_COUNT = 10
const SPEND_PARTICLE_SPEED_MIN = 40
const SPEND_PARTICLE_SPEED_RANGE = 35
const SPEND_PARTICLE_LIFETIME_MIN = 0.5
const SPEND_PARTICLE_LIFETIME_RANGE = 0.35
const SPEND_PARTICLE_SIZE_MIN = 3
const SPEND_PARTICLE_SIZE_RANGE = 3
const SPEND_FLASH_COUNT = 8
const SPEND_FLASH_INTERVAL = 0.05
//
// Section letter colors (match level indicator top-left). Touch now uses
// its complementary steel-teal identity (same as the in-game anti-hero
// and the TOUCH HUD letters), so the "buy help" label keeps the same
// chromatic conversation with the rest of the section.
//
const SECTION_HELP_COLORS = {
  touch: '#5A8898',
  time: '#FF8C00',
  word: '#DC143C'
}
//
// Touch help panel matches touch life-deduction bubble (wall fill + steel-teal accent)
//
const TOUCH_PANEL_FILL_HEX = '#152528'
const TOUCH_PANEL_TEXT_HEX = '#5A8898'
const TOUCH_PANEL_BORDER_HEX = '#5A8898'
//
// Goal text per level (gray text shown under the main subtitle before each level)
//
export const LEVEL_GOAL_TEXTS = {
  'level-touch.0': 'Here you need to figure out\nhow to gather bugs together\nby touching them',
  'level-touch.1': 'Here you need to figure out\nhow to play the right melody\nby touching things',
  'level-touch.2': 'Jumping is beautiful.\nFigure out how to use your\nlegs to activate your path\nto yourself...',
  'level-touch.3': 'Touch the bugs and see what happens...',
  'level-time.0': 'Platforms don\'t live forever...',
  'level-time.1': 'Don\'t forget the fragments of yourself —\nthey can be found in unexpected places',
  'level-word.0': 'Find yourself and accept that\nthe voices in your head\nwon\'t go away',
  'level-word.1': 'The task is the same —\nfind and accept yourself'
}
//
// Goal label text and layout
//
const GOAL_LABEL_TEXT = 'goal'
const GOAL_GAP = 140
const GOAL_HIT_HALF_W = 80
//
// Button border: 4-line rect drawn around buy-help and goal labels.
// Color is derived from sceneBackdropHex (brightened), so it blends
// with the level background while still being visible.
//
const BTN_BORDER_PAD_X = 18
const BTN_BORDER_PAD_Y = 8
const BTN_BORDER_WIDTH = 1.5
const BTN_BORDER_OPACITY = 0.8
const BTN_BORDER_LIGHTEN = 60
//
// Module-level reference to the currently active panel instance.
// Updated when a panel opens or closes. Used by isAnyPanelOpen().
//
let activeInst = null
/**
 * Returns true when a help panel is currently visible (open or animating).
 * Touch scene Escape handlers call this to avoid going to menu while the
 * panel is open.
 * @returns {boolean}
 */
export function isAnyPanelOpen() {
  return activeInst?.panelOpen ?? false
}
export const LEVEL_HELP_TEXTS = {
  'level-touch.0': 'Collect all the bugs in one\nplace and they will help\nyou. Notice what they do\nwhen you touch them',
  'level-touch.1': 'Approach yourself to get\nthe sequence of notes to\nplay. The hero will become\ncolorful if you play right.',
  'level-touch.2': 'Jump to the right of the\nicicles, then you\'ll\nfigure out the rest',
  'level-touch.3': 'Turns out the bugs\nare trampolines :)',
  'level-time.0': 'Hurry — platforms\ndon\'t last forever',
  'level-time.1': 'Ones kill you —\njust don\'t jump on them',
  'level-time.2': 'An odd sum of digits kills\nyou, an even sum doesn\'t',
  'level-time.3': 'Just reach your other half\nwith or against the wind.\nRemember: rushing doesn\'t\nalways make you faster.',
  'level-word.0': 'Some words cut like\nblades — avoid them\nFind and accept yourself\nas you are, to move forward',
  'level-word.1': 'Life always finds a way\nto ruin your plans.\nBe careful',
  'level-word.2': 'Use your memory to remember\nwhere the blade-like words\nare...',
  'level-word.3': 'Be quick and focused.\nNothing more',
  'level-word.4': 'Do everything quickly\nand don\'t trust logic.\nTry to change a monster\nby throwing letters'
}

/**
 * Creates bottom-right HELP label with click-to-open hint panel
 * @param {Object} config - Configuration
 * @param {Object} config.k - Kaplay instance
 * @param {string} config.levelName - Scene name (e.g. level-touch.0)
 * @param {number} config.sideWallWidth - Right game-area inset
 * @param {number} config.floorY - Top Y of the bottom platform / game floor
 * @param {number} [config.helpY] - Optional Y override for HELP label placement
 * @param {Object} [config.levelIndicator] - HUD with smallHero and updateHeroScore
 * @param {Object} [config.sound] - Sound instance for purchase/deny feedback
 * @param {string} [config.sceneBackdropHex] - Level backdrop hex for letterbox sync while panel is open
 * @returns {Object|null} HELP instance or null when level has no hint text
 */
export function create(config) {
  const { k, levelName, sideWallWidth, floorY, helpY: helpYOverride, levelIndicator, sound, sceneBackdropHex } = config
  const hintText = LEVEL_HELP_TEXTS[levelName]
  if (!hintText) return null
  const goalText = LEVEL_GOAL_TEXTS[levelName] ?? null
  const sectionColorHex = getSectionHelpColor(levelName)
  const { r, g, b } = getRGB(k, sectionColorHex)
  const font = CFG.visual.fonts.thinFull.replace(/'/g, '')
  const helpY = helpYOverride ?? ((floorY + k.height()) / 2 + HELP_UI_VERTICAL_OFFSET)
  const outlineOffsets = buildOutlineOffsets(HELP_OUTLINE_OFFSET)
  //
  // Create "buy help" label first at placeholder position — layout follows after measuring widths
  //
  const outlineNodes = outlineOffsets.map(([dx, dy]) => k.add([
    k.text(HELP_LABEL_TEXT, { size: HELP_FONT_SIZE, font, align: 'center' }),
    k.pos(0 + dx, helpY + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 2)
  ]))
  const labelNode = k.add([
    k.text(HELP_LABEL_TEXT, { size: HELP_FONT_SIZE, font, align: 'center' }),
    k.pos(0, helpY),
    k.anchor('center'),
    k.color(r, g, b),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 3)
  ])
  //
  // Optional "goal" label (only when this level has a goal text)
  //
  let goalLabelNode = null
  let goalOutlineNodes = []
  if (goalText) {
    goalOutlineNodes = outlineOffsets.map(([dx, dy]) => k.add([
      k.text(GOAL_LABEL_TEXT, { size: HELP_FONT_SIZE, font, align: 'center' }),
      k.pos(0 + dx, helpY + dy),
      k.anchor('center'),
      k.color(0, 0, 0),
      k.fixed(),
      k.z(CFG.visual.zIndex.ui + 2)
    ]))
    goalLabelNode = k.add([
      k.text(GOAL_LABEL_TEXT, { size: HELP_FONT_SIZE, font, align: 'center' }),
      k.pos(0, helpY),
      k.anchor('center'),
      k.color(r, g, b),
      k.fixed(),
      k.z(CFG.visual.zIndex.ui + 3)
    ])
  }
  //
  // Lay out labels centered around screen midpoint
  //
  const centerX = k.width() / 2
  const helpW = labelNode.width
  const goalW = goalLabelNode ? goalLabelNode.width : 0
  const totalW = helpW + (goalLabelNode ? GOAL_GAP + goalW : 0)
  const groupStart = centerX - totalW / 2
  const helpX = groupStart + helpW / 2
  const goalX = goalLabelNode ? groupStart + helpW + GOAL_GAP + goalW / 2 : centerX
  //
  // Apply positions to buy help
  //
  labelNode.pos.x = helpX
  outlineNodes.forEach((node, i) => {
    const [dx, dy] = outlineOffsets[i]
    node.pos.x = helpX + dx
  })
  //
  // Apply positions to goal
  //
  if (goalLabelNode) {
    goalLabelNode.pos.x = goalX
    goalOutlineNodes.forEach((node, i) => {
      const [dx, dy] = outlineOffsets[i]
      node.pos.x = goalX + dx
    })
  }
  const panelColors = getSectionPanelColors(levelName)
  const inst = {
    k,
    levelName,
    hintText,
    goalText,
    sectionColorHex,
    panelColors,
    sceneBackdropHex,
    levelIndicator,
    sound,
    helpX,
    helpY,
    goalX,
    font,
    outlineOffsets,
    labelNode,
    outlineNodes,
    goalLabelNode,
    goalOutlineNodes,
    pressed: false,
    goalPressed: false,
    panelOpen: false,
    panelIsGoal: false,
    panelNodes: null,
    panelOpacity: 0,
    panelPhase: 'closed',
    panelTimer: 0,
    closeFlickerTime: CLOSE_HINT_FLICKER_DURATION,
    closeFlickerDir: -1
  }
  Tooltip.create({
    k,
    targets: [{
      x: helpX,
      y: helpY,
      width: HELP_LABEL_TOOLTIP_WIDTH,
      height: HELP_LABEL_TOOLTIP_HEIGHT,
      text: HELP_LABEL_TOOLTIP_TEXT,
      offsetY: HELP_LABEL_TOOLTIP_Y_OFFSET
    }]
  })
  k.onUpdate(() => onUpdate(inst))
  k.onMousePress(() => onMousePress(inst))
  k.onMouseRelease(() => onMouseRelease(inst))
  k.onKeyPress('escape', () => inst.panelOpen && closePanel(inst))
  //
  // Derive border color from backdrop (lightened) so it blends with the
  // level background but remains visible
  //
  const backdropRgb = sceneBackdropHex ? parseHex(sceneBackdropHex) : [26, 26, 26]
  const borderR = Math.min(255, backdropRgb[0] + BTN_BORDER_LIGHTEN)
  const borderG = Math.min(255, backdropRgb[1] + BTN_BORDER_LIGHTEN)
  const borderB = Math.min(255, backdropRgb[2] + BTN_BORDER_LIGHTEN)
  k.add([
    k.z(CFG.visual.zIndex.ui + 2),
    k.fixed(),
    {
      draw() {
        drawButtonBorder(k, inst, borderR, borderG, borderB)
      }
    }
  ])
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
// Resolves panel fill / text / border colours per section
//
function getSectionPanelColors(levelName) {
  if (levelName.includes('touch')) {
    const [fillR, fillG, fillB] = parseHex(TOUCH_PANEL_FILL_HEX)
    const [textR, textG, textB] = parseHex(TOUCH_PANEL_TEXT_HEX)
    const [borderR, borderG, borderB] = parseHex(TOUCH_PANEL_BORDER_HEX)
    return { fillR, fillG, fillB, textR, textG, textB, borderR, borderG, borderB }
  }
  //
  // Time section: orange border and text to match the life-deduction dialog
  // (textColorRgb: { r: 255, g: 140, b: 0 } = #FF8C00 hero orange)
  //
  if (levelName.includes('time')) {
    return {
      fillR: PANEL_FILL_R, fillG: PANEL_FILL_G, fillB: PANEL_FILL_B,
      textR: 255, textG: 140, textB: 0,
      borderR: 255, borderG: 140, borderB: 0
    }
  }
  return { fillR: PANEL_FILL_R, fillG: PANEL_FILL_G, fillB: PANEL_FILL_B, textR: null, textG: null, textB: null, borderR: PANEL_BORDER_R, borderG: PANEL_BORDER_G, borderB: PANEL_BORDER_B }
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
  const outlineOffsets = inst.outlineOffsets
  inst.outlineNodes.forEach((node, i) => {
    if (!node?.exists?.()) return
    const [dx, dy] = outlineOffsets[i]
    node.scale = inst.k.vec2(scale, scale)
    node.pos.x = inst.helpX + shiftX + dx
    node.pos.y = inst.helpY + shiftY + dy
  })
  //
  // Animate goal label press (same shrink effect)
  //
  if (inst.goalLabelNode?.exists?.()) {
    const gScale = inst.goalPressed ? HELP_PRESSED_FONT_SIZE / HELP_FONT_SIZE : 1
    const gShiftX = inst.goalPressed ? HELP_PRESSED_SHIFT_X : 0
    const gShiftY = inst.goalPressed ? HELP_PRESSED_SHIFT_Y : 0
    inst.goalLabelNode.scale = inst.k.vec2(gScale, gScale)
    inst.goalLabelNode.pos.x = inst.goalX + gShiftX
    inst.goalLabelNode.pos.y = inst.helpY + gShiftY
    inst.goalOutlineNodes.forEach((node, i) => {
      if (!node?.exists?.()) return
      const [dx, dy] = outlineOffsets[i]
      node.scale = inst.k.vec2(gScale, gScale)
      node.pos.x = inst.goalX + gShiftX + dx
      node.pos.y = inst.helpY + gShiftY + dy
    })
  }
  if (inst.panelPhase === 'opening') {
    inst.panelTimer += inst.k.dt()
    inst.panelOpacity = Math.min(1, inst.panelTimer / PANEL_FADE_IN)
    setPanelOpacity(inst, inst.panelOpacity)
    syncPanelBackdrop(inst, inst.panelOpacity)
    inst.panelTimer >= PANEL_FADE_IN && (inst.panelPhase = 'open')
  } else if (inst.panelPhase === 'closing') {
    inst.panelTimer += inst.k.dt()
    inst.panelOpacity = Math.max(0, 1 - inst.panelTimer / PANEL_FADE_IN)
    setPanelOpacity(inst, inst.panelOpacity)
    syncPanelBackdrop(inst, inst.panelOpacity)
    if (inst.panelTimer >= PANEL_FADE_IN) {
      destroyPanel(inst)
      inst.panelPhase = 'closed'
      inst.panelOpen = false
      inst.panelIsGoal = false
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
// Shrinks HELP / GOAL on press; closes open panel on any click
//
function onMousePress(inst) {
  if (inst.panelOpen) {
    closePanel(inst)
    return
  }
  isMouseOverHelp(inst) && (inst.pressed = true)
  isMouseOverGoal(inst) && (inst.goalPressed = true)
}

//
// Opens hint or goal panel after click release
//
function onMouseRelease(inst) {
  if (inst.pressed) {
    inst.pressed = false
    isMouseOverHelp(inst) && !inst.panelOpen && tryPurchaseHelp(inst)
  }
  if (inst.goalPressed) {
    inst.goalPressed = false
    isMouseOverGoal(inst) && !inst.panelOpen && openGoalPanel(inst)
  }
}

//
// Deducts fragments and opens panel, or plays deny sound when too few
//
function tryPurchaseHelp(inst) {
  const currentScore = get('heroScore', 0)
  if (currentScore < HELP_FRAGMENT_COST) {
    inst.sound && Sound.playHelpDeniedSound(inst.sound)
    playHelpDeniedEffect(inst.k, inst.levelIndicator)
    return
  }
  const newScore = currentScore - HELP_FRAGMENT_COST
  set('heroScore', newScore)
  inst.levelIndicator?.updateHeroScore?.(newScore)
  inst.sound && Sound.playHelpPurchaseSound(inst.sound)
  playFragmentSpendEffect(inst.k, inst.levelIndicator)
  inst.panelIsGoal = false
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
// True when cursor is over the GOAL hit area
//
function isMouseOverGoal(inst) {
  if (!inst.goalLabelNode) return false
  const mp = inst.k.mousePos()
  return Math.abs(mp.x - inst.goalX) < GOAL_HIT_HALF_W && Math.abs(mp.y - inst.helpY) < HELP_HIT_HALF_H
}

//
// Builds centered hint panel and dims the scene
//
function openPanel(inst) {
  if (inst.panelOpen) return
  const { k, sceneBackdropHex } = inst
  const hintText = inst.panelIsGoal ? inst.goalText : inst.hintText
  inst.panelOpen = true
  activeInst = inst
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
  const closeRgb = getRGB(k, CLOSE_HINT_COLOR_HEX)
  const { panelColors } = inst
  const hintRgb = panelColors.textR != null
    ? { r: panelColors.textR, g: panelColors.textG, b: panelColors.textB }
    : getRGB(k, inst.sectionColorHex)
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
          color: k.rgb(panelColors.borderR, panelColors.borderG, panelColors.borderB),
          opacity: o * PANEL_FRAME_ALPHA
        })
        k.drawRect({
          pos: k.vec2(boxX, boxY),
          width: PANEL_BOX_WIDTH,
          height: PANEL_BOX_HEIGHT,
          radius: PANEL_BOX_RADIUS,
          color: k.rgb(panelColors.fillR, panelColors.fillG, panelColors.fillB),
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
    k.color(hintRgb.r, hintRgb.g, hintRgb.b),
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
// Opens the goal panel with the level description text (no fragment cost)
//
function openGoalPanel(inst) {
  if (inst.panelOpen || !inst.goalText) return
  inst.panelIsGoal = true
  openPanel(inst)
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
  inst.sceneBackdropHex && CanvasBackdrop.applyCanvasBackdrop(inst.k, inst.sceneBackdropHex)
  if (activeInst === inst) activeInst = null
}

//
// Red flash on HUD small hero and score when HELP is denied
//
function playHelpDeniedEffect(k, levelIndicator) {
  if (!levelIndicator?.smallHero?.character?.exists?.()) return
  const bodyColorHex = levelIndicator.smallHero.bodyColor || CFG.visual.colors.hero.body
  const heroColor = getRGB(k, bodyColorHex)
  flashHelpDeniedHud(k, levelIndicator, heroColor, 0)
}

//
// Alternates small hero and score text between normal and red
//
function flashHelpDeniedHud(k, levelIndicator, heroColor, count) {
  if (!levelIndicator?.smallHero?.character?.exists?.()) return
  const normalHero = k.rgb(heroColor.r, heroColor.g, heroColor.b)
  const red = k.rgb(255, 80, 80)
  //
  // Touch HUD scoreboard renders the numerals in neutral grey, while
  // other sections still use white. The level-indicator exposes its
  // resting score colour via `scoreColorHex`; fall back to white when
  // that field is absent so word / time sections keep their existing
  // bright numerals.
  //
  const scoreRest = levelIndicator?.scoreColorHex
    ? getRGB(k, levelIndicator.scoreColorHex)
    : { r: 255, g: 255, b: 255 }
  const scoreRestColor = k.rgb(scoreRest.r, scoreRest.g, scoreRest.b)
  const scoreOutlineBlack = k.rgb(0, 0, 0)
  if (count >= SPEND_FLASH_COUNT) {
    levelIndicator.smallHero.character.color = k.rgb(255, 255, 255)
    levelIndicator.heroScoreText && (levelIndicator.heroScoreText.color = scoreRestColor)
    levelIndicator.heroScoreOutlines?.forEach(outline => {
      outline.exists?.() && (outline.color = scoreOutlineBlack)
    })
    return
  }
  const isRed = count % 2 === 0
  levelIndicator.smallHero.character.color = isRed ? red : normalHero
  levelIndicator.heroScoreText && (levelIndicator.heroScoreText.color = isRed ? red : scoreRestColor)
  levelIndicator.heroScoreOutlines?.forEach(outline => {
    outline.exists?.() && (outline.color = isRed ? red : scoreOutlineBlack)
  })
  k.wait(SPEND_FLASH_INTERVAL, () => flashHelpDeniedHud(k, levelIndicator, heroColor, count + 1))
}

//
// Flash HUD small hero and show floating "-3" with burst particles
//
function playFragmentSpendEffect(k, levelIndicator) {
  if (!levelIndicator?.smallHero?.character?.exists?.()) return
  const sh = levelIndicator.smallHero.character
  const bodyColorHex = levelIndicator.smallHero.bodyColor || CFG.visual.colors.hero.body
  const heroColor = getRGB(k, bodyColorHex)
  flashSmallHeroSpend(k, levelIndicator, heroColor, 0)
  createSpendParticles(k, levelIndicator, heroColor)
  const floatX = sh.pos.x + SPEND_FLOAT_X_OFFSET
  const floatY = sh.pos.y + SPEND_FLOAT_Y_OFFSET
  const floatText = k.add([
    k.text(SPEND_FLOAT_TEXT, {
      size: SPEND_FLOAT_FONT_SIZE,
      font: CFG.visual.fonts.thinFull.replace(/'/g, '')
    }),
    k.pos(floatX, floatY),
    k.anchor('center'),
    k.color(230, 90, 90),
    k.fixed(),
    k.z(CFG.visual.zIndex.ui + 22)
  ])
  const floatState = { elapsed: 0 }
  floatText.onUpdate(() => onUpdateSpendFloat(k, floatText, floatY, floatState))
}

//
// Animates the "-3" label upward and fades it out
//
function onUpdateSpendFloat(k, floatText, startY, state) {
  state.elapsed += k.dt()
  const t = state.elapsed / SPEND_FLOAT_DURATION
  floatText.pos.y = startY - SPEND_FLOAT_RISE * t
  floatText.opacity = 1 - t
  t >= 1 && k.destroy(floatText)
}

//
// Brief red/white flash on the HUD small hero after spending fragments
//
function flashSmallHeroSpend(k, levelIndicator, heroColor, count) {
  if (!levelIndicator?.smallHero?.character?.exists?.()) return
  if (count >= SPEND_FLASH_COUNT) {
    levelIndicator.smallHero.character.color = k.rgb(255, 255, 255)
    return
  }
  levelIndicator.smallHero.character.color = count % 2 === 0
    ? k.rgb(heroColor.r, heroColor.g, heroColor.b)
    : k.rgb(255, 120, 120)
  k.wait(SPEND_FLASH_INTERVAL, () => flashSmallHeroSpend(k, levelIndicator, heroColor, count + 1))
}

//
// Particles burst from the top-right of the HUD small hero icon
//
function createSpendParticles(k, levelIndicator, heroColor) {
  const heroX = levelIndicator.smallHero.character.pos.x + SPEND_FLOAT_X_OFFSET
  const heroY = levelIndicator.smallHero.character.pos.y + SPEND_FLOAT_Y_OFFSET
  for (let i = 0; i < SPEND_PARTICLE_COUNT; i++) {
    const angle = -Math.PI / 4 + (Math.random() - 0.5) * 1.2
    const speed = SPEND_PARTICLE_SPEED_MIN + Math.random() * SPEND_PARTICLE_SPEED_RANGE
    const lifetime = SPEND_PARTICLE_LIFETIME_MIN + Math.random() * SPEND_PARTICLE_LIFETIME_RANGE
    const size = SPEND_PARTICLE_SIZE_MIN + Math.random() * SPEND_PARTICLE_SIZE_RANGE
    const particle = k.add([
      k.circle(size),
      k.pos(heroX, heroY),
      k.color(230, 90, 90),
      k.opacity(1),
      k.z(CFG.visual.zIndex.ui + 21),
      k.anchor('center'),
      k.fixed()
    ])
    const vx = Math.cos(angle) * speed
    const vy = Math.sin(angle) * speed
    const particleState = { elapsed: 0 }
    particle.onUpdate(() => onUpdateSpendParticle(k, particle, vx, vy, lifetime, particleState))
  }
}

//
// Updates a single spend particle until its lifetime expires
//
function onUpdateSpendParticle(k, particle, vx, vy, lifetime, state) {
  state.elapsed += k.dt()
  particle.pos.x += vx * k.dt()
  particle.pos.y += vy * k.dt()
  particle.opacity = 1 - state.elapsed / lifetime
  state.elapsed >= lifetime && k.destroy(particle)
}
//
// Syncs CSS letterbox bars to the current panel overlay opacity.
// panelOpacity 0 → original scene color, 1 → dimmed by PANEL_OVERLAY_DIM.
//
function syncPanelBackdrop(inst, panelOpacity) {
  if (!inst.sceneBackdropHex) return
  const [r, g, b] = parseHex(inst.sceneBackdropHex)
  if (panelOpacity <= 0) {
    //
    // Fully closed: restore original background via applyCanvasBackdrop
    // (updates both k.setBackground and all CSS ancestors).
    //
    CanvasBackdrop.applyCanvasBackdrop(inst.k, inst.sceneBackdropHex)
    return
  }
  const dim = panelOpacity * PANEL_OVERLAY_DIM
  const dr = Math.round(r * (1 - dim))
  const dg = Math.round(g * (1 - dim))
  const db = Math.round(b * (1 - dim))
  //
  // Update both Kaplay clear color and CSS backdrop every frame so canvas
  // letterbox bars and any unrendered canvas areas match the dimmed scene.
  //
  inst.k.setBackground(inst.k.rgb(dr, dg, db))
  CanvasBackdrop.setCssBackdrop(inst.k.canvas, dr, dg, db)
}
//
// Draws 4 border lines around a label node to form a visible button outline.
// Uses k.drawLine which is reliable across all Kaplay versions.
//
function drawLabelBorderLines(k, node, r, g, b) {
  const color = k.rgb(r, g, b)
  const w = node.width
  const h = node.height
  const x = node.pos.x
  const y = node.pos.y
  const x1 = x - w / 2 - BTN_BORDER_PAD_X
  const y1 = y - h / 2 - BTN_BORDER_PAD_Y
  const x2 = x + w / 2 + BTN_BORDER_PAD_X
  const y2 = y + h / 2 + BTN_BORDER_PAD_Y
  k.drawLine({ p1: k.vec2(x1, y1), p2: k.vec2(x2, y1), width: BTN_BORDER_WIDTH, color, opacity: BTN_BORDER_OPACITY })
  k.drawLine({ p1: k.vec2(x2, y1), p2: k.vec2(x2, y2), width: BTN_BORDER_WIDTH, color, opacity: BTN_BORDER_OPACITY })
  k.drawLine({ p1: k.vec2(x2, y2), p2: k.vec2(x1, y2), width: BTN_BORDER_WIDTH, color, opacity: BTN_BORDER_OPACITY })
  k.drawLine({ p1: k.vec2(x1, y2), p2: k.vec2(x1, y1), width: BTN_BORDER_WIDTH, color, opacity: BTN_BORDER_OPACITY })
}
//
// Draws borders around the buy-help label (and goal label if present).
//
function drawButtonBorder(k, inst, r, g, b) {
  inst.labelNode?.exists?.() && drawLabelBorderLines(k, inst.labelNode, r, g, b)
  inst.goalLabelNode?.exists?.() && drawLabelBorderLines(k, inst.goalLabelNode, r, g, b)
}
