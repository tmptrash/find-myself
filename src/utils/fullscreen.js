import { CFG } from '../cfg.js'
import { isTouchDevice } from './touch-input.js'
import { parseHex } from './helper.js'
import { applyForestFilmGrainToCanvas } from '../sections/forest/utils/forest-parallax-grain.js'

//
// Top-left HUD buttons for touch devices: fullscreen toggle + back (Esc) button.
// The Esc button dispatches a synthetic KeyboardEvent('Escape') on the Kaplay
// canvas so existing onKeyPress('escape') handlers fire unchanged.
//
const BTN_Z = 10000
const BTN_HEIGHT = 44
//
// The buttons' (and on touch devices the levels' FPS readout's) distance
// from the screen's left edge, CSS px.
//
const BTN_MARGIN = 16
//
// The stack starts below the levels' FPS readout in the top-left corner
// (its text runs down to about 55 px), so it stays visible.
//
const BTN_TOP = 66
const BTN_GAP = 8
const FULLSCREEN_BTN_WIDTH = 44
const ESC_BTN_WIDTH = FULLSCREEN_BTN_WIDTH
//
// The levels' look (cfg colors.touchControls): a cream icon ringed by the
// dark contour (on the icon alone) over a barely-there green-black face
// with film grain and no rim — the button itself is see-through, the icon
// stays solid. Pressed, the face firms up to BTN_PRESSED_FACE_ALPHA and the
// icon shades. The Home Screen hint's text box keeps a denser face to stay
// readable.
//
const BTN_FACE_ALPHA = 0.1
const BTN_PRESSED_FACE_ALPHA = 0.3
const INSTALL_HINT_FACE_ALPHA = 0.6
const BTN_BORDER_W = 2
const BTN_LABEL_CONTOUR_PX = 1
const BTN_GRAIN_TILE = 64
const BTN_GRAIN_SEED = 9200
const grainTileUrls = new Map()
//
// Icons any phone user knows, drawn in the label colour (currentColor) and
// ringed by the dark contour: the four-corner frame for fullscreen (corners
// turned in while in fullscreen, to leave it) and a left arrow for back
// (the Esc key).
//
const ICON_PX = 24
const ICON_STROKE_W = 2.5
const ICON_SVG_HEAD = `<svg width="${ICON_PX}" height="${ICON_PX}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${ICON_STROKE_W}" stroke-linecap="round" stroke-linejoin="round" style="display:block;margin:auto;filter:${iconContour()}">`
const ICON_FULLSCREEN_ENTER = `${ICON_SVG_HEAD}<path d="M4 9V4h5M15 4h5v5M20 15v5h-5M9 20H4v-5"/></svg>`
const ICON_FULLSCREEN_EXIT = `${ICON_SVG_HEAD}<path d="M9 4v5H4M20 9h-5V4M15 20v-5h5M4 15h5v5"/></svg>`
const ICON_BACK = `${ICON_SVG_HEAD}<path d="M19 12H5M11 6l-6 6 6 6"/></svg>`
//
// iPhone browsers (all WebKit) have no fullscreen for a page, only for
// video. The one way to lose the browser bars there is the game opened from
// the Home Screen (manifest.webmanifest, apple-mobile-web-app-capable in
// index.html): then the fullscreen button is not needed and is left out; in the
// browser it shows how to get there (INSTALL_HINT_TEXT, in the buttons'
// look, gone on a tap or after INSTALL_HINT_MS).
//
const INSTALL_HINT_TEXT = 'Full screen on iPhone: tap Share, then “Add to Home Screen”, and start the game from its icon.'
const INSTALL_HINT_MS = 7000
const INSTALL_HINT_WIDTH = 300
const INSTALL_HINT_FONT_SIZE = 14
const INSTALL_HINT_PAD = 10
const STANDALONE_QUERIES = ['(display-mode: fullscreen)', '(display-mode: standalone)']
let installHint = null
let installHintTimer = null

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
  // Fullscreen toggle (top button) — not needed when already started from
  // the Home Screen.
  //
  const standalone = isStandalone()
  if (!fullscreenBtn && !standalone) {
    fullscreenBtn = createHudButton({
      icon: fullscreenIcon(),
      ariaLabel: 'Toggle fullscreen',
      width: FULLSCREEN_BTN_WIDTH,
      top: BTN_TOP,
      onClick: toggleFullscreen
    })
    document.addEventListener('fullscreenchange', syncFullscreenIcon)
    document.addEventListener('webkitfullscreenchange', syncFullscreenIcon)
  } else if (fullscreenBtn) {
    applyHudButtonReleased(fullscreenBtn)
  }
  //
  // Esc shortcut sits directly below the fullscreen button so both stick to
  // the screen edge as a small vertical HUD stack.
  //
  if (!escBtn && k) {
    escBtn = createHudButton({
      icon: ICON_BACK,
      ariaLabel: 'Back',
      width: ESC_BTN_WIDTH,
      top: standalone ? BTN_TOP : BTN_TOP + BTN_HEIGHT + BTN_GAP,
      onClick: () => dispatchEscape(kaplayRef)
    })
  } else if (escBtn) {
    applyHudButtonReleased(escBtn)
  }
}

/**
 * World X of the buttons' left edge in a level (CSS px → the engine's world
 * px), for HUD text that lines up with them.
 * @param {Object} k - Kaplay instance
 * @returns {number}
 */
export function hudLeftWorldX(k) {
  return BTN_MARGIN * k.width() / window.innerWidth
}

//
// Builds a fixed-position HUD button anchored to the top-left of the viewport.
//
function createHudButton(opts) {
  const { icon, ariaLabel, width, top, onClick } = opts
  const btn = document.createElement('button')
  btn.type = 'button'
  btn.innerHTML = icon
  btn.setAttribute('aria-label', ariaLabel)
  btn.style.cssText = [
    'position:fixed',
    `top:${top}px`,
    `left:${BTN_MARGIN}px`,
    `width:${width}px`,
    `height:${BTN_HEIGHT}px`,
    `z-index:${BTN_Z}`,
    'border-radius:8px',
    'background-color:transparent',
    `background-image:url(${buttonGrainTile(BTN_FACE_ALPHA)})`,
    'border:none',
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
// Pressed HUD button styling (shaded icon, firmer face)
//
function applyHudButtonPressed(btn) {
  btn.style.color = CFG.visual.colors.touchControls.arrowShade
  btn.style.backgroundImage = `url(${buttonGrainTile(BTN_PRESSED_FACE_ALPHA)})`
}

//
// Default HUD button styling — cream icon, see-through face
//
function applyHudButtonReleased(btn) {
  btn.style.color = CFG.visual.colors.touchControls.arrow
  btn.style.backgroundImage = `url(${buttonGrainTile(BTN_FACE_ALPHA)})`
}
//
// A face: the disc colour at an alpha with film grain, baked once per alpha
// into a repeating tile.
//
function buttonGrainTile(alpha) {
  if (grainTileUrls.has(alpha)) return grainTileUrls.get(alpha)
  const canvas = document.createElement('canvas')
  canvas.width = BTN_GRAIN_TILE
  canvas.height = BTN_GRAIN_TILE
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = cssRgba(CFG.visual.colors.touchControls.disc, alpha)
  ctx.fillRect(0, 0, BTN_GRAIN_TILE, BTN_GRAIN_TILE)
  applyForestFilmGrainToCanvas(canvas, BTN_GRAIN_SEED)
  const url = canvas.toDataURL()
  grainTileUrls.set(alpha, url)
  return url
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
  if (!target.requestFullscreen && !target.webkitRequestFullscreen) {
    toggleInstallHint()
    return
  }
  target.requestFullscreen?.() || target.webkitRequestFullscreen?.()
}
//
// The fullscreen button's icon follows the page's fullscreen state.
//
function fullscreenIcon() {
  return document.fullscreenElement || document.webkitFullscreenElement ? ICON_FULLSCREEN_EXIT : ICON_FULLSCREEN_ENTER
}
function syncFullscreenIcon() {
  fullscreenBtn && (fullscreenBtn.innerHTML = fullscreenIcon())
}
//
// The dark contour round an icon: one sharp drop shadow per side (the
// button's rim is drawn by its border, so a filter on the whole button only
// rings the icon lines and the rim itself, both dark-edged in the level art).
//
function iconContour() {
  const c = CFG.visual.colors.touchControls.contour
  const d = BTN_LABEL_CONTOUR_PX
  return [[d, 0], [-d, 0], [0, d], [0, -d]].map(([x, y]) => `drop-shadow(${x}px ${y}px 0 ${c})`).join(' ')
}
function isStandalone() {
  return navigator.standalone === true || STANDALONE_QUERIES.some(q => window.matchMedia(q).matches)
}
//
// The Home Screen hint next to the buttons (a second tap or a tap on it hides it).
//
function toggleInstallHint() {
  if (installHint) {
    hideInstallHint()
    return
  }
  installHint = document.createElement('div')
  installHint.textContent = INSTALL_HINT_TEXT
  installHint.style.cssText = installHintCss()
  installHint.addEventListener('click', hideInstallHint)
  document.body.appendChild(installHint)
  installHintTimer = setTimeout(hideInstallHint, INSTALL_HINT_MS)
}
function hideInstallHint() {
  clearTimeout(installHintTimer)
  installHint?.remove()
  installHint = null
}
function installHintCss() {
  const colors = CFG.visual.colors.touchControls
  return [
    'position:fixed',
    `top:${BTN_TOP}px`,
    `left:${BTN_MARGIN * 2 + FULLSCREEN_BTN_WIDTH}px`,
    `width:${INSTALL_HINT_WIDTH}px`,
    `padding:${INSTALL_HINT_PAD}px`,
    `z-index:${BTN_Z}`,
    `font-size:${INSTALL_HINT_FONT_SIZE}px`,
    'line-height:1.35',
    `font-family:${CFG.visual.fonts.regularFull.replace(/'/g, '')}`,
    'border-radius:8px',
    'background-color:transparent',
    `background-image:url(${buttonGrainTile(INSTALL_HINT_FACE_ALPHA)})`,
    `color:${colors.arrow}`,
    `border:${BTN_BORDER_W}px solid ${colors.rim}`,
    `text-shadow:${labelContour()}`,
    'box-sizing:border-box'
  ].join(';')
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
