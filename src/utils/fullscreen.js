import { CFG } from '../cfg.js'
import { isTouchDevice } from './touch-input.js'

//
// Fullscreen toggle button (touch devices only)
//
const FULLSCREEN_BTN_Z = 10000
const FULLSCREEN_BTN_SIZE = 44
const FULLSCREEN_BTN_MARGIN = 10
const FULLSCREEN_BTN_FONT_SIZE = 18
const FULLSCREEN_BTN_BG = 'rgba(38, 38, 38, 0.82)'
const FULLSCREEN_BTN_COLOR = '#FFFFFF'
const FULLSCREEN_BTN_LABEL = '[ ]'

let fullscreenBtn = null

/**
 * Creates a top-left fullscreen toggle on touch devices
 */
export function createFullscreenButton() {
  if (!isTouchDevice() || fullscreenBtn) return
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.textContent = FULLSCREEN_BTN_LABEL
  btn.setAttribute('aria-label', 'Toggle fullscreen')
  btn.style.cssText = [
    'position:fixed',
    `top:${FULLSCREEN_BTN_MARGIN}px`,
    `left:${FULLSCREEN_BTN_MARGIN}px`,
    `width:${FULLSCREEN_BTN_SIZE}px`,
    `height:${FULLSCREEN_BTN_SIZE}px`,
    `z-index:${FULLSCREEN_BTN_Z}`,
    `font-size:${FULLSCREEN_BTN_FONT_SIZE}px`,
    `font-family:${CFG.visual.fonts.regularFull.replace(/'/g, '')}`,
    'border:none',
    'border-radius:8px',
    `background:${FULLSCREEN_BTN_BG}`,
    `color:${FULLSCREEN_BTN_COLOR}`,
    'cursor:pointer',
    'padding:0',
    'line-height:1',
    'touch-action:manipulation'
  ].join(';')
  btn.addEventListener('click', () => toggleFullscreen())
  document.body.appendChild(btn)
  fullscreenBtn = btn
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
