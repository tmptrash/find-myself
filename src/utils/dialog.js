import { CFG } from '../cfg.js'
import * as CanvasBackdrop from './canvas-backdrop.js'
import { parseHex } from './helper.js'
//
// Dialog box dimensions and styling
//
const BOX_WIDTH = 830
const BOX_HEIGHT = 380
const BOX_RADIUS = 16
const BORDER_WIDTH = 3
const FRAME_ALPHA = 0.88
const FILL_ALPHA = 1.0
//
// Animation timing
//
const FADE_DURATION = 0.35
const OVERLAY_DIM = 0.45
const DIALOG_Z = 620
//
// Close hint styling
//
const CLOSE_HINT_TEXT = 'Click or Esc to close'
const CLOSE_HINT_FONT_SIZE = 20
const CLOSE_HINT_FLICKER_DURATION = 1.2
const CLOSE_HINT_MIN_OPACITY = 0.4
const CLOSE_HINT_MAX_OPACITY = 0.75
const CLOSE_HINT_COLOR_HEX = '#BFBFBF'
//
// Text layout within the box
//
const OUTLINE_OFFSET = 2
const LINE_SPACING = 10
const FONT_SIZE = 44
const FONT_SIZE_MIN = 20
//
// Text Y offset: centers main text between box interior top and close hint area.
// Negative values move text upward from screen center.
//
const TEXT_Y_OFFSET = -15
//
// Y offset of close hint from screen center (positive = lower)
//
const CLOSE_HINT_Y_OFFSET = 158

/**
 * Opens a simple text dialog over the scene with animated fade-in/out.
 * Properly syncs both Kaplay's background clear color and CSS letterbox bars
 * with the overlay dim so no horizontal stripes appear at any aspect ratio.
 * @param {Object} k - Kaplay instance
 * @param {string} text - Text to display (may contain Kaplay style tags like [hl]T[/hl])
 * @param {Object} [opts] - Options
 * @param {Object} [opts.fillRgb] - Box fill color {r,g,b}
 * @param {Object} [opts.textRgb] - Main text color {r,g,b}
 * @param {Object} [opts.borderRgb] - Box border color {r,g,b}
 * @param {string} [opts.font] - Font name (Kaplay font key)
 * @param {string} [opts.sceneBackdropHex] - Hex color of the scene background
 * @param {Object} [opts.textStyles] - Kaplay text styles map (e.g. { hl: { color: k.rgb(255,220,0) } })
 * @param {Function} [opts.onClose] - Callback invoked after the dialog closes
 */
export function openDialog(k, text, opts = {}) {
  const {
    fillRgb = { r: 21, g: 37, b: 40 },
    textRgb = { r: 200, g: 220, b: 230 },
    borderRgb = { r: 90, g: 136, b: 152 },
    font = CFG.visual.fonts.regularFull.replace(/'/g, ''),
    sceneBackdropHex = null,
    textStyles = null,
    onClose,
    onCloseStart
  } = opts
  //
  // Strip markup tags (e.g. [hl]...[/hl]) for measurement and outline objects.
  // Styled text is used only for the main visible text layer.
  //
  const plainText = textStyles ? text.replace(/\[[^\]]+\]/g, '') : text
  const centerX = CFG.visual.screen.width / 2
  const centerY = CFG.visual.screen.height / 2
  const boxX = centerX - BOX_WIDTH / 2
  const boxY = centerY - BOX_HEIGHT / 2
  const hintY = centerY + TEXT_Y_OFFSET
  const closeY = centerY + CLOSE_HINT_Y_OFFSET
  const fontSize = calcFontSize(k, plainText, BOX_WIDTH - 60, BOX_HEIGHT - 90, font)
  const closeColor = parseHex(CLOSE_HINT_COLOR_HEX)
  const outlineOffsets = [[-OUTLINE_OFFSET, -OUTLINE_OFFSET], [OUTLINE_OFFSET, -OUTLINE_OFFSET], [-OUTLINE_OFFSET, OUTLINE_OFFSET], [OUTLINE_OFFSET, OUTLINE_OFFSET]]
  const state = { opacity: 0, phase: 'opening', timer: 0, flickerDir: -1, flickerTime: CLOSE_HINT_FLICKER_DURATION }
  const overlay = k.add([
    k.z(DIALOG_Z),
    k.opacity(0),
    k.fixed(),
    {
      draw() {
        k.drawRect({
          width: k.width(),
          height: k.height(),
          pos: k.vec2(0, 0),
          color: k.rgb(0, 0, 0),
          opacity: 0.45 * state.opacity
        })
      }
    }
  ])
  const bubble = k.add([
    k.z(DIALOG_Z + 1),
    k.opacity(0),
    k.fixed(),
    {
      draw() {
        const o = state.opacity
        k.drawRect({
          pos: k.vec2(boxX - BORDER_WIDTH, boxY - BORDER_WIDTH),
          width: BOX_WIDTH + BORDER_WIDTH * 2,
          height: BOX_HEIGHT + BORDER_WIDTH * 2,
          radius: BOX_RADIUS + BORDER_WIDTH,
          color: k.rgb(borderRgb.r, borderRgb.g, borderRgb.b),
          opacity: o * FRAME_ALPHA
        })
        k.drawRect({
          pos: k.vec2(boxX, boxY),
          width: BOX_WIDTH,
          height: BOX_HEIGHT,
          radius: BOX_RADIUS,
          color: k.rgb(fillRgb.r, fillRgb.g, fillRgb.b),
          opacity: o * FILL_ALPHA
        })
      }
    }
  ])
  const hintOutlines = outlineOffsets.map(([dx, dy]) => k.add([
    k.text(plainText, { size: fontSize, align: 'center', lineSpacing: LINE_SPACING, font }),
    k.pos(centerX + dx, hintY + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(0),
    k.fixed(),
    k.z(DIALOG_Z + 2)
  ]))
  const hintMain = k.add([
    k.text(text, { size: fontSize, align: 'center', lineSpacing: LINE_SPACING, font, styles: textStyles ?? undefined }),
    k.pos(centerX, hintY),
    k.anchor('center'),
    k.color(textRgb.r, textRgb.g, textRgb.b),
    k.opacity(0),
    k.fixed(),
    k.z(DIALOG_Z + 3)
  ])
  const closeOutlines = outlineOffsets.map(([dx, dy]) => k.add([
    k.text(CLOSE_HINT_TEXT, { size: CLOSE_HINT_FONT_SIZE, font }),
    k.pos(centerX + dx, closeY + dy),
    k.anchor('center'),
    k.color(0, 0, 0),
    k.opacity(0),
    k.fixed(),
    k.z(DIALOG_Z + 2)
  ]))
  const closeHint = k.add([
    k.text(CLOSE_HINT_TEXT, { size: CLOSE_HINT_FONT_SIZE, font }),
    k.pos(centerX, closeY),
    k.anchor('center'),
    k.color(closeColor[0], closeColor[1], closeColor[2]),
    k.opacity(0),
    k.fixed(),
    k.z(DIALOG_Z + 3)
  ])
  const setAll = (o) => {
    overlay.opacity = o
    bubble.opacity = o
    hintMain.opacity = o
    hintOutlines.forEach(n => n.exists?.() && (n.opacity = o))
    const flicker = CLOSE_HINT_MIN_OPACITY + (CLOSE_HINT_MAX_OPACITY - CLOSE_HINT_MIN_OPACITY) * (state.flickerTime / CLOSE_HINT_FLICKER_DURATION)
    closeHint.opacity = o * flicker
    closeOutlines.forEach(n => n.exists?.() && (n.opacity = o * flicker))
  }
  const destroyAll = () => {
    sceneBackdropHex && CanvasBackdrop.applyCanvasBackdrop(k, sceneBackdropHex)
    overlay.destroy?.()
    bubble.destroy?.()
    hintMain.destroy?.()
    hintOutlines.forEach(n => n.destroy?.())
    closeHint.destroy?.()
    closeOutlines.forEach(n => n.destroy?.())
    escHandler?.cancel?.()
    clickHandler?.cancel?.()
    updateHandler?.cancel?.()
    onClose?.()
  }
  const close = () => {
    if (state.phase === 'closing') return
    state.phase = 'closing'
    state.timer = 0
    escHandler?.cancel?.()
    clickHandler?.cancel?.()
    //
    // Notify immediately so callers can release blocked input (e.g. Esc to menu)
    // without waiting for the full fade-out animation.
    //
    onCloseStart?.()
  }
  const escHandler = k.onKeyPress('escape', close)
  const clickHandler = k.onMousePress(close)
  const updateHandler = k.onUpdate(() => {
    const dt = k.dt()
    if (state.phase === 'opening') {
      state.timer += dt
      state.opacity = Math.min(1, state.timer / FADE_DURATION)
      setAll(state.opacity)
      syncBackdrop(k, sceneBackdropHex, state.opacity)
      state.timer >= FADE_DURATION && (state.phase = 'open')
    } else if (state.phase === 'open') {
      //
      // Ensure backdrop stays fully dimmed while dialog is visible
      //
      syncBackdrop(k, sceneBackdropHex, 1)
      //
      // Pulse the "click to close" hint
      //
      state.flickerTime += dt * state.flickerDir
      if (state.flickerTime >= CLOSE_HINT_FLICKER_DURATION) { state.flickerDir = -1; state.flickerTime = CLOSE_HINT_FLICKER_DURATION }
      else if (state.flickerTime <= 0) { state.flickerDir = 1; state.flickerTime = 0 }
      const flicker = CLOSE_HINT_MIN_OPACITY + (CLOSE_HINT_MAX_OPACITY - CLOSE_HINT_MIN_OPACITY) * (state.flickerTime / CLOSE_HINT_FLICKER_DURATION)
      closeHint.opacity = flicker
      closeOutlines.forEach(n => n.exists?.() && (n.opacity = flicker))
    } else if (state.phase === 'closing') {
      state.timer += dt
      state.opacity = Math.max(0, 1 - state.timer / FADE_DURATION)
      setAll(state.opacity)
      syncBackdrop(k, sceneBackdropHex, state.opacity)
      if (state.timer >= FADE_DURATION) {
        updateHandler?.cancel?.()
        destroyAll()
      }
    }
  })
  return { close }
}
//
// Syncs both Kaplay background clear color and CSS letterbox bars to the
// current dim level so no horizontal strips are visible at any aspect ratio.
// This mirrors syncPanelBackdrop in lesson-help.js.
//
function syncBackdrop(k, sceneBackdropHex, panelOpacity) {
  if (!sceneBackdropHex) return
  const [r, g, b] = parseHex(sceneBackdropHex)
  if (panelOpacity <= 0) {
    CanvasBackdrop.applyCanvasBackdrop(k, sceneBackdropHex)
    return
  }
  const dim = panelOpacity * OVERLAY_DIM
  const dr = Math.round(r * (1 - dim))
  const dg = Math.round(g * (1 - dim))
  const db = Math.round(b * (1 - dim))
  //
  // Both calls are required: setBackground updates Kaplay's canvas clear color
  // (preventing visible render strips), setCssBackdrop syncs the CSS letterbox bars.
  //
  k.setBackground(k.rgb(dr, dg, db))
  CanvasBackdrop.setCssBackdrop(k.canvas, dr, dg, db)
}
//
// Finds the largest font size that fits text within maxW x maxH.
//
function calcFontSize(k, text, maxW, maxH, font) {
  for (let size = FONT_SIZE; size >= FONT_SIZE_MIN; size -= 2) {
    const measured = k.formatText({ text, size, align: 'center', lineSpacing: LINE_SPACING, font })
    if (measured.width <= maxW && measured.height <= maxH) return size
  }
  return FONT_SIZE_MIN
}
