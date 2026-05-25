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
const ESC_BTN_WIDTH = FULLSCREEN_BTN_WIDTH
const ESC_BTN_FONT_SIZE = 16
const BTN_BG = 'rgba(26, 26, 26, 0.92)'
const BTN_COLOR = '#FFFFFF'
const BTN_BORDER = '2px solid rgba(58, 58, 58, 0.95)'
const BTN_PRESSED_BG = 'rgba(26, 26, 26, 0.92)'
const BTN_PRESSED_COLOR = '#B8E4FF'
const BTN_PRESSED_BORDER = '2px solid rgba(72, 130, 168, 0.95)'
const FULLSCREEN_BTN_LABEL = '[ ]'
const ESC_BTN_LABEL = 'Esc'

let fullscreenBtn = null
let escBtn = null
let kaplayRef = null

/**
 * Creates top-left fullscreen + Esc shortcut buttons on touch devices
 * @param {Object} [k] - Kaplay instance (needed for the Esc button to dispatch
 *                       a synthetic keyboard event on the canvas)
 */
export function createFullscreenButton(k) {
  if (!isTouchDevice()) return
  k && (kaplayRef = k)
  //
  // Fullscreen toggle (top button).
  //
  if (!fullscreenBtn) {
    fullscreenBtn = createHudButton({
      label: FULLSCREEN_BTN_LABEL,
      ariaLabel: 'Toggle fullscreen',
      width: FULLSCREEN_BTN_WIDTH,
      fontSize: FULLSCREEN_BTN_FONT_SIZE,
      top: BTN_MARGIN,
      onClick: toggleFullscreen
    })
  } else {
    applyHudButtonReleased(fullscreenBtn)
  }
  //
  // Esc shortcut sits directly below the fullscreen button so both stick to
  // the screen edge as a small vertical HUD stack.
  //
  if (!escBtn && k) {
    escBtn = createHudButton({
      label: ESC_BTN_LABEL,
      ariaLabel: 'Press Escape',
      width: ESC_BTN_WIDTH,
      fontSize: ESC_BTN_FONT_SIZE,
      top: BTN_MARGIN + BTN_HEIGHT + BTN_GAP,
      onClick: () => dispatchEscape(kaplayRef)
    })
  } else if (escBtn) {
    applyHudButtonReleased(escBtn)
  }
}

//
// Builds a fixed-position HUD button anchored to the top-left of the viewport.
//
function createHudButton(opts) {
  const { label, ariaLabel, width, fontSize, top, onClick } = opts
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = label
  btn.setAttribute('aria-label', ariaLabel)
  btn.style.cssText = [
    'position:fixed',
    `top:${top}px`,
    `left:${BTN_MARGIN}px`,
    `width:${width}px`,
    `height:${BTN_HEIGHT}px`,
    `z-index:${BTN_Z}`,
    `font-size:${fontSize}px`,
    `font-family:${CFG.visual.fonts.regularFull.replace(/'/g, '')}`,
    'border-radius:8px',
    'cursor:pointer',
    'padding:0',
    'line-height:1',
    'touch-action:manipulation',
    '-webkit-tap-highlight-color:transparent',
    'outline:none',
    'appearance:none',
    '-webkit-appearance:none',
    'box-sizing:border-box'
  ].join(';')
  applyHudButtonReleased(btn)
  //
  // Touch: run action on touchend (preventDefault on touchstart blocks click).
  // Desktop: normal click handler.
  //
  let touchHandled = false
  btn.addEventListener('touchstart', () => {
    applyHudButtonPressed(btn)
  }, { passive: true })
  btn.addEventListener('touchend', () => {
    applyHudButtonReleased(btn)
    btn.blur()
    touchHandled = true
    onClick()
  }, { passive: true })
  btn.addEventListener('touchcancel', () => {
    applyHudButtonReleased(btn)
    btn.blur()
  }, { passive: true })
  btn.addEventListener('click', () => {
    if (touchHandled) {
      touchHandled = false
      return
    }
    onClick()
  })
  btn.addEventListener('mousedown', () => applyHudButtonPressed(btn))
  btn.addEventListener('mouseup', () => applyHudButtonReleased(btn))
  btn.addEventListener('mouseleave', () => applyHudButtonReleased(btn))
  document.body.appendChild(btn)
  return btn
}

//
// Pressed HUD button styling (dark fill, light blue label and outline)
//
function applyHudButtonPressed(btn) {
  btn.style.backgroundColor = BTN_PRESSED_BG
  btn.style.color = BTN_PRESSED_COLOR
  btn.style.border = BTN_PRESSED_BORDER
}

//
// Default HUD button styling — dark fill, light label, light outline
//
function applyHudButtonReleased(btn) {
  btn.style.backgroundColor = BTN_BG
  btn.style.color = BTN_COLOR
  btn.style.border = BTN_BORDER
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
