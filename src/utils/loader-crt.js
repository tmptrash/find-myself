import { CFG } from '../cfg.js'
import { parseHex } from './helper.js'
import { bakeCrtNoiseTileCanvas } from './crt-overlay.js'

//
// DOM copy of the in-game CRT layer for the HTML loader: the loader hides every
// canvas, so the Kaplay CRT object cannot cover it. Motion uses CSS transform
// animations, which run on the compositor and keep going while loading blocks
// the main thread.
//
const LAYER_ID = 'loader-crt'
const STYLE_ID = 'loader-crt-style'
const NOISE_KEYFRAMES = 'loader-crt-noise-scroll'
const HUM_KEYFRAMES = 'loader-crt-hum-roll'
const LAYER_Z = '2'
const HUM_ROLL_SEC = 11
const CHROMA_LEFT_ALPHA = 0.55
const CHROMA_RIGHT_ALPHA = 0.5
const NOISE_SCROLL_MIN_SEC = 1

/**
 * Builds the loader CRT layer inside the loader element (hidden until shown).
 * @param {HTMLElement} loaderEl - #loader
 * @returns {Object|null} Loader CRT inst
 */
export function create(loaderEl) {
  const crt = CFG.visual.crt
  if (!loaderEl || !crt?.enabled) return null
  const master = Math.max(0, Math.min(1, crt.masterIntensity ?? 1))
  injectKeyframes(crt)
  const layer = document.createElement('div')
  layer.id = LAYER_ID
  Object.assign(layer.style, {
    position: 'absolute',
    inset: '0',
    overflow: 'hidden',
    pointerEvents: 'none',
    zIndex: LAYER_Z,
    display: 'none'
  })
  layer.appendChild(createTintLayer(crt, master))
  layer.appendChild(createChromaLayer(crt, master))
  layer.appendChild(createScanlineLayer(crt, master))
  layer.appendChild(createNoiseLayer(crt, master))
  layer.appendChild(createHumBarLayer(crt, master))
  loaderEl.appendChild(layer)
  return { layer, loaderEl }
}

/**
 * Shows or hides the CRT layer. Re-attaches it if a fatal error wiped the loader.
 * @param {Object|null} inst - Loader CRT inst
 * @param {boolean} visible
 */
export function setVisible(inst, visible) {
  if (!inst) return
  !inst.layer.isConnected && inst.loaderEl.appendChild(inst.layer)
  inst.layer.style.display = visible ? 'block' : 'none'
}

function createTintLayer(crt, master) {
  return makeFill({
    background: rgbaCss(crt.phosphor.tint, 1),
    opacity: String(crt.phosphor.opacity * master)
  })
}

function createChromaLayer(crt, master) {
  const { edgeWidthPx, leftTint, rightTint, edgeOpacity } = crt.chroma
  return makeFill({
    background: [
      `linear-gradient(to right, ${rgbaCss(leftTint, CHROMA_LEFT_ALPHA)} 0, transparent ${edgeWidthPx}px)`,
      `linear-gradient(to left, ${rgbaCss(rightTint, CHROMA_RIGHT_ALPHA)} 0, transparent ${edgeWidthPx}px)`
    ].join(', '),
    opacity: String(edgeOpacity * master)
  })
}

function createScanlineLayer(crt, master) {
  const spacing = Math.max(2, crt.scanlines.spacingPx ?? 3)
  const line = rgbaCss(CFG.visual.colors.outline, 1)
  return makeFill({
    background: `repeating-linear-gradient(to bottom, ${line} 0, ${line} 1px, transparent 1px, transparent ${spacing}px)`,
    opacity: String(crt.scanlines.opacity * master)
  })
}
//
// The tile layer is one tile taller than the screen and slides by exactly one
// tile per loop, so the seam never shows.
//
function createNoiseLayer(crt, master) {
  const tile = crt.noise.tileSize ?? 192
  const el = document.createElement('div')
  Object.assign(el.style, {
    position: 'absolute',
    left: '0',
    right: '0',
    top: `-${tile}px`,
    bottom: '0',
    backgroundImage: `url(${bakeCrtNoiseTileCanvas(crt).toDataURL()})`,
    backgroundSize: `${tile}px ${tile}px`,
    imageRendering: 'pixelated',
    opacity: String(crt.noise.opacity * master),
    willChange: 'transform',
    animation: `${NOISE_KEYFRAMES} ${noiseScrollSec(crt)}s linear infinite`
  })
  return el
}
//
// Slow mains hum bar rolling down the picture — the same soft band the game
// layer draws as its most common glitch.
//
function createHumBarLayer(crt, master) {
  const hum = crt.glitches?.humBar
  const tint = rgbaCss(hum?.tint ?? crt.interference.bandTint, 1)
  const el = document.createElement('div')
  Object.assign(el.style, {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '0',
    height: `${(hum?.heightFrac ?? 0.1) * 100}vh`,
    background: `linear-gradient(to bottom, transparent 0%, ${tint} 50%, transparent 100%)`,
    opacity: String((hum?.opacity ?? 0) * master),
    willChange: 'transform',
    animation: `${HUM_KEYFRAMES} ${HUM_ROLL_SEC}s linear infinite`
  })
  return el
}

function makeFill(style) {
  const el = document.createElement('div')
  Object.assign(el.style, { position: 'absolute', inset: '0' }, style)
  return el
}

function injectKeyframes(crt) {
  if (document.getElementById(STYLE_ID)) return
  const tile = crt.noise.tileSize ?? 192
  const style = document.createElement('style')
  style.id = STYLE_ID
  style.textContent = [
    `@keyframes ${NOISE_KEYFRAMES} { from { transform: translateY(0) } to { transform: translateY(${tile}px) } }`,
    `@keyframes ${HUM_KEYFRAMES} { from { transform: translateY(-100%) } to { transform: translateY(100vh) } }`
  ].join('\n')
  document.head.appendChild(style)
}

function noiseScrollSec(crt) {
  const tile = crt.noise.tileSize ?? 192
  const speed = crt.noise.scrollSpeedPxPerSec ?? 0
  return speed > 0 ? Math.max(NOISE_SCROLL_MIN_SEC, tile / speed) : NOISE_SCROLL_MIN_SEC
}

function rgbaCss(hex, alpha) {
  const [r, g, b] = parseHex(hex)
  return `rgba(${r}, ${g}, ${b}, ${alpha})`
}
