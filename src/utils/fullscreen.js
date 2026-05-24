import { CFG } from '../cfg.js'
import { isTouchDevice } from './touch-input.js'

//
// Top-left HUD buttons for touch devices: fullscreen toggle + Esc shortcut.
// The Esc button dispatches a synthetic KeyboardEvent('Escape') on the Kaplay
// canvas so existing onKeyPress('escape') handlers fire unchanged.
//
const BTN_Z = 10000
const BTN_HEIGHT = 44
const BTN_MARGIN = 10
const BTN_GAP = 8
const FULLSCREEN_BTN_WIDTH = 44
const FULLSCREEN_BTN_FONT_SIZE = 18
const ESC_BTN_WIDTH = 56
const ESC_BTN_FONT_SIZE = 16
const BTN_BG = 'rgba(38, 38, 38, 0.82)'
const BTN_COLOR = '#FFFFFF'
const FULLSCREEN_BTN_LABEL = '[ ]'
const ESC_BTN_LABEL = 'Esc'

let fullscreenBtn = null
let escBtn = null

/**
 * Creates top-left fullscreen + Esc shortcut buttons on touch devices
 * @param {Object} [k] - Kaplay instance (needed for the Esc button to dispatch
 *                       a synthetic keyboard event on the canvas)
 */
export function createFullscreenButton(k) {
  if (!isTouchDevice()) return
  //
  // Fullscreen toggle (leftmost button).
  //
  if (!fullscreenBtn) {
    fullscreenBtn = createHudButton({
      label: FULLSCREEN_BTN_LABEL,
      ariaLabel: 'Toggle fullscreen',
      width: FULLSCREEN_BTN_WIDTH,
      fontSize: FULLSCREEN_BTN_FONT_SIZE,
      left: BTN_MARGIN,
      onClick: toggleFullscreen
    })
  }
  //
  // Esc shortcut (right of the fullscreen button).
  //
  if (!escBtn && k) {
    escBtn = createHudButton({
      label: ESC_BTN_LABEL,
      ariaLabel: 'Press Escape',
      width: ESC_BTN_WIDTH,
      fontSize: ESC_BTN_FONT_SIZE,
      left: BTN_MARGIN + FULLSCREEN_BTN_WIDTH + BTN_GAP,
      onClick: () => dispatchEscape(k)
    })
  }
}

//
// Builds a fixed-position HUD button with the shared visual style.
//
function createHudButton(opts) {
  const { label, ariaLabel, width, fontSize, left, onClick } = opts
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = label
  btn.setAttribute('aria-label', ariaLabel)
  btn.style.cssText = [
    'position:fixed',
    `top:${BTN_MARGIN}px`,
    `left:${left}px`,
    `width:${width}px`,
    `height:${BTN_HEIGHT}px`,
    `z-index:${BTN_Z}`,
    `font-size:${fontSize}px`,
    `font-family:${CFG.visual.fonts.regularFull.replace(/'/g, '')}`,
    'border:none',
    'border-radius:8px',
    `background:${BTN_BG}`,
    `color:${BTN_COLOR}`,
    'cursor:pointer',
    'padding:0',
    'line-height:1',
    'touch-action:manipulation'
  ].join(';')
  btn.addEventListener('click', onClick)
  document.body.appendChild(btn)
  return btn
}

//
// Toggles browser fullscreen for the game page
//
function toggleFullscreen() {
  if (document.fullscreenElement) {
    document.exitFullscreen?.()
    return
  }
  const target = document.documentElement
  target.requestFullscreen?.() || target.webkitRequestFullscreen?.()
}

//
// Fires synthetic Escape key events on the Kaplay canvas so scene-level
// onKeyPress('escape') handlers run as if the user pressed Esc on a keyboard.
//
function dispatchEscape(k) {
  const canvas = k?.canvas
  if (!canvas) return
  const down = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
  const up = new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true })
  canvas.dispatchEvent(down)
  canvas.dispatchEvent(up)
}
