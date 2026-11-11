import { CFG } from '../cfg.js'
import { isTouchDevice } from './touch-input.js'
import { parseHex } from './helper.js'
import { applyForestFilmGrainToCanvas } from '../sections/forest/utils/forest-parallax-grain.js'

//
// Top-left HUD buttons for touch devices: fullscreen toggle + Esc shortcut.
// The Esc button dispatches a synthetic KeyboardEvent('Escape') on the Kaplay
// canvas so existing onKeyPress('escape') handlers fire unchanged.
//
const BTN_Z = 10000
const BTN_HEIGHT = 44
const BTN_MARGIN = 10
//
// The stack starts below the levels' FPS readout in the top-left corner
// (its text runs down to about 55 px), so it stays visible.
//
const BTN_TOP = 66
const BTN_GAP = 8
const FULLSCREEN_BTN_WIDTH = 44
const FULLSCREEN_BTN_FONT_SIZE = 18
const ESC_BTN_WIDTH = FULLSCREEN_BTN_WIDTH
const ESC_BTN_FONT_SIZE = 16
//
// The levels' look, as the on-screen run / jump buttons (cfg
// colors.touchControls): a see-through green-black face with film grain
// (a small baked tile), a dark rim, a cream label ringed by the dark
// contour; pressed, the rim lights up in the slate glint and the label
// shades. The whole button shows at BTN_OPACITY.
//
const BTN_OPACITY = 0.8
const BTN_FACE_ALPHA = 0.6
const BTN_BORDER_W = 2
const BTN_LABEL_CONTOUR_PX = 1
const BTN_GRAIN_TILE = 64
const BTN_GRAIN_SEED = 9200
let grainTileUrl = null
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
      top: BTN_TOP,
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
      top: BTN_TOP + BTN_HEIGHT + BTN_GAP,
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
    `opacity:${BTN_OPACITY}`,
    'background-color:transparent',
    `background-image:url(${buttonGrainTile()})`,
    `text-shadow:${labelContour()}`,
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
// Pressed HUD button styling (shaded label, rim lit in the slate glint)
//
function applyHudButtonPressed(btn) {
  const colors = CFG.visual.colors.touchControls
  btn.style.color = colors.arrowShade
  btn.style.border = `${BTN_BORDER_W}px solid ${colors.glint}`
}

//
// Default HUD button styling — cream label, dark rim
//
function applyHudButtonReleased(btn) {
  const colors = CFG.visual.colors.touchControls
  btn.style.color = colors.arrow
  btn.style.border = `${BTN_BORDER_W}px solid ${colors.rim}`
}
//
// The button face: the disc colour at BTN_FACE_ALPHA with film grain, baked
// once into a repeating tile.
//
function buttonGrainTile() {
  if (grainTileUrl) return grainTileUrl
  const canvas = document.createElement('canvas')
  canvas.width = BTN_GRAIN_TILE
  canvas.height = BTN_GRAIN_TILE
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = cssRgba(CFG.visual.colors.touchControls.disc, BTN_FACE_ALPHA)
  ctx.fillRect(0, 0, BTN_GRAIN_TILE, BTN_GRAIN_TILE)
  applyForestFilmGrainToCanvas(canvas, BTN_GRAIN_SEED)
  grainTileUrl = canvas.toDataURL()
  return grainTileUrl
}
//
// A dark contour round the label: one shadow per side.
//
function labelContour() {
  const c = CFG.visual.colors.touchControls.contour
  const d = BTN_LABEL_CONTOUR_PX
  return [[d, 0], [-d, 0], [0, d], [0, -d]].map(([x, y]) => `${x}px ${y}px 0 ${c}`).join(',')
}
function cssRgba(hex, alpha) {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
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
// Fires synthetic Escape on window so scene handlers registered via
// onPhysicalKeyPress / bindBackToMenuKeys run without canvas focus.
//
function dispatchEscape(k) {
  const down = new KeyboardEvent('keydown', { key: 'Escape', code: 'Escape', bubbles: true })
  const up = new KeyboardEvent('keyup', { key: 'Escape', code: 'Escape', bubbles: true })
  window.dispatchEvent(down)
  window.dispatchEvent(up)
  const canvas = k?.canvas
  if (!canvas) return
  canvas.dispatchEvent(down)
  canvas.dispatchEvent(up)
}
