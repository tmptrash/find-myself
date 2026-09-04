import { CFG } from '../cfg.js'
import * as TouchControls from './touch-controls.js'

// Get color as Kaplay object
export function getColor(k, colorHex) {
  const [r, g, b] = parseHex(colorHex)
  return k.color(r, g, b)
}

// Get RGB color as Kaplay object
export function getRGB(k, colorHex) {
  const [r, g, b] = parseHex(colorHex)
  return k.rgb(r, g, b)
}

// Get hex string for Canvas API
export function getHex(colorHex) {
  // Type check
  if (typeof colorHex !== 'string') {
    console.error('getHex: expected string, got', typeof colorHex, colorHex)
    // If it's an RGB array, convert to hex
    if (Array.isArray(colorHex) && colorHex.length === 3) {
      const r = colorHex[0].toString(16).padStart(2, '0')
      const g = colorHex[1].toString(16).padStart(2, '0')
      const b = colorHex[2].toString(16).padStart(2, '0')
      return `#${r}${g}${b}`
    }
    throw new Error(`getHex: colorHex must be a string, got ${typeof colorHex}`)
  }
  
  return `#${colorHex.replace('#', '')}`
}

//
// Parse hex string into RGB components
//
export function parseHex(colorHex) {
  //
  // Type check and conversion
  //
  if (typeof colorHex !== 'string') {
    //
    // If it's an array, return it as is
    //
    if (Array.isArray(colorHex) && colorHex.length === 3) {
      return colorHex
    }
    throw new Error(`parseHex: colorHex must be a string, got ${typeof colorHex}`)
  }
  
  const hex = colorHex.replace('#', '')
  const r = parseInt(hex.substring(0, 2), 16)
  const g = parseInt(hex.substring(2, 4), 16)
  const b = parseInt(hex.substring(4, 6), 16)
  return [r, g, b]
}
//
// Physical key state tracking (uses KeyboardEvent.code for layout-independent input)
//
const physicalKeysDown = new Set()
const physicalKeyPressCallbacks = []
window.addEventListener('keydown', (e) => {
  if (!physicalKeysDown.has(e.code)) {
    physicalKeysDown.add(e.code)
    physicalKeyPressCallbacks.forEach(cb => {
      if (cb.code !== e.code) return
      try {
        cb.fn()
      } catch (_) {
        //
        // A handler from a destroyed scene (menu hero after k.go) can throw;
        // one bad entry must not block every other listener on the same key.
        //
      }
    })
  }
})
window.addEventListener('keyup', (e) => {
  physicalKeysDown.delete(e.code)
})
//
// KeyboardEvent.code values for every in-game action key. Used to clear a
// stuck "held" flag after menu / transition / engine swap — if Space stays in
// physicalKeysDown, onPhysicalKeyPress never fires again and jump appears dead.
//
export const GAME_PHYSICAL_KEY_CODES = [
  'Space',
  'Enter',
  'Escape',
  'ArrowUp',
  'ArrowLeft',
  'ArrowRight',
  'ArrowDown',
  'KeyW',
  'KeyA',
  'KeyD'
]
//
// Drops specific keys from the physical held set (does not remove listeners).
//
export function releasePhysicalKeys(codes) {
  codes.forEach(code => physicalKeysDown.delete(code))
}
//
// Clears every game action key from the physical held set.
//
export function releaseGamePhysicalKeys() {
  releasePhysicalKeys(GAME_PHYSICAL_KEY_CODES)
}
//
// Wipes physical held state and every onPhysicalKeyPress callback. Called when
// a Kaplay engine is torn down — otherwise menu-hero listeners survive on the
// window and stack on top of the level hero's handlers after a resolution swap.
//
export function resetPhysicalInputLayer() {
  physicalKeysDown.clear()
  physicalKeyPressCallbacks.length = 0
}
//
// Kaplay key names mapped to the physical KeyboardEvent.code tracked above.
// Every key name ever passed to isAnyKeyDown() must have an entry here.
//
const KAPLAY_KEY_TO_PHYSICAL_CODE = {
  left: 'ArrowLeft',
  right: 'ArrowRight',
  up: 'ArrowUp',
  down: 'ArrowDown',
  space: 'Space',
  w: 'KeyW',
  a: 'KeyA',
  s: 'KeyS',
  d: 'KeyD'
}
//
// Check if any of the keys is pressed (down), supports both Kaplay key names and
// physical KeyboardEvent.code values (e.g. 'KeyW'). Reads exclusively from our
// own window-level physicalKeysDown tracking rather than Kaplay's internal key
// state — the latter can end up stuck after a scene switch or engine reboot
// (its own listeners survive on a torn-down instance), which silently broke
// jump/skip input in the past. Our tracking is reset explicitly on every
// engine boot/teardown (see resetPhysicalInputLayer) so it stays reliable
// across transitions.
//
export function isAnyKeyDown(k, keys) {
  return keys.some(key => {
    if (TouchControls.isVirtualKeyDown(key)) return true
    //
    // On touch devices Kaplay maps touches to arrow keys — ignore synthetic
    // emulated keys but still allow physical keyboard input below.
    //
    if (TouchControls.needsTouchControls() && isKaplayTouchEmulatedKey(key)) return false
    const code = key.length > 1 && key.startsWith('Key') ? key : KAPLAY_KEY_TO_PHYSICAL_CODE[key]
    return code ? physicalKeysDown.has(code) : k.isKeyDown(key)
  })
}

//
// Keys Kaplay synthesizes from touch positions; virtual buttons own these on phones
//
function isKaplayTouchEmulatedKey(key) {
  return CFG.controls.moveLeft.includes(key)
    || CFG.controls.moveRight.includes(key)
    || CFG.controls.jump.includes(key)
}
//
// Register a callback for physical key press (fires once on keydown, not repeat)
//
export function onPhysicalKeyPress(code, fn) {
  const entry = { code, fn }
  physicalKeyPressCallbacks.push(entry)
  return { cancel: () => {
    const idx = physicalKeyPressCallbacks.indexOf(entry)
    idx >= 0 && physicalKeyPressCallbacks.splice(idx, 1)
  }}
}

/**
 * Render a procedural image into a canvas and return the canvas itself.
 * Designed to be passed directly to k.loadSprite(name, canvas) — Kaplay
 * accepts HTMLCanvasElement as a sprite source via its ImageSource type,
 * so no data-URL / image-decode round-trip happens. Avoiding data URLs
 * also keeps DevTools Network tab clean (each toDataURL call would
 * otherwise show up as a separate "request" entry).
 *
 * When softwareRendering is true the context is created with
 * { willReadFrequently: true }, which forces Chrome to use Skia's CPU
 * rasteriser instead of a GPU-backed surface. This prevents Chrome from
 * allocating a full-resolution GPU FBO (framebuffer object) for every
 * ctx.filter = 'blur(Xpx)' draw call. On a 1920×1080 canvas each GPU FBO
 * is ~8 MB; multiple overlapping blur passes can push VRAM past the
 * browser's WebGL context budget and trigger a context loss that prevents
 * Kaplay from recreating its GL state. Use softwareRendering for any canvas
 * that applies ctx.filter blur; leave it false for small or non-blurred
 * canvases where GPU acceleration is beneficial.
 *
 * @param {{width:number, height:number, pixelRatio?:number, softwareRendering?:boolean}} opts - Canvas size in CSS px
 * @param {(ctx: CanvasRenderingContext2D, canvas: HTMLCanvasElement) => void} drawFn - Drawing routine
 * @returns {HTMLCanvasElement} Canvas with the rendered image, ready for loadSprite
 */
export function toCanvas({ width, height, pixelRatio = 1, softwareRendering = false }, drawFn) {
  const canvas = document.createElement('canvas')
  canvas.width = width * pixelRatio
  canvas.height = height * pixelRatio
  canvas.style.width = width + 'px'
  canvas.style.height = height + 'px'
  //
  // GPU-backed canvas (default) is fast for normal drawing but creates a large
  // temporary GPU framebuffer for every blur filter call, risking context loss.
  // Software-backed canvas routes all drawing through Skia on the CPU — no
  // GPU FBOs, safe for large canvases that use ctx.filter.
  //
  const ctxOptions = softwareRendering ? { willReadFrequently: true } : undefined
  const ctx = canvas.getContext("2d", ctxOptions)
  ctx.scale(pixelRatio, pixelRatio)

  drawFn(ctx, canvas)
  return canvas
}
//
// Counter for unique canvas-atlas sprite names (one per createCanvasAtlasBuilder
// build() call — e.g. the initial decor bake and any later rebake each get
// their own texture).
//
let canvasAtlasBakeId = 0
/**
 * Collects several small pre-baked canvases (e.g. one per decor instance —
 * a rock, a mushroom, in both its gray and outline colour variants) and
 * packs them side by side into one shared sprite. register() returns a
 * mutable placeholder ({ name, tileW, tileH, quad }) that stays empty until
 * build() runs (once every instance has registered), so it can be drawn
 * later via k.drawSprite({ sprite: placeholder.name, quad: placeholder.quad,
 * ... }) — every instance then shares one GPU texture instead of needing
 * its own bindTexture/useProgram state change every time it draws, which is
 * what actually costs FPS once dozens of individually-baked decor sprites
 * are on screen at once.
 * @returns {{ register: (canvas: HTMLCanvasElement) => { name: string|null, tileW: number, tileH: number, quad: Object|null }, build: (k: Object) => void }}
 */
export function createCanvasAtlasBuilder() {
  const entries = []
  const register = (canvas) => {
    const placeholder = { name: null, tileW: canvas.width, tileH: canvas.height, quad: null }
    entries.push({ canvas, placeholder })
    return placeholder
  }
  const build = (k) => {
    if (!entries.length) return
    const pad = 1
    let atlasW = pad
    let atlasH = 0
    entries.forEach(e => {
      atlasW += e.canvas.width + pad
      atlasH = Math.max(atlasH, e.canvas.height)
    })
    const atlasCanvas = document.createElement('canvas')
    atlasCanvas.width = atlasW
    atlasCanvas.height = atlasH
    const ctx = atlasCanvas.getContext('2d')
    const atlasName = `canvas-atlas-${canvasAtlasBakeId++}`
    let cursorX = pad
    entries.forEach(e => {
      const w = e.canvas.width
      const h = e.canvas.height
      ctx.drawImage(e.canvas, cursorX, 0)
      Object.assign(e.placeholder, {
        name: atlasName,
        tileW: w,
        tileH: h,
        quad: { x: cursorX / atlasW, y: 0, w: w / atlasW, h: h / atlasH }
      })
      cursorX += w + pad
    })
    k.loadSprite(atlasName, atlasCanvas)
    entries.forEach(e => { e.canvas.width = 0; e.canvas.height = 0 })
    atlasCanvas.width = 0
    atlasCanvas.height = 0
  }
  return { register, build }
}

export const prop = (path, root = {}) => path.split(".").reduce(
  (o, key) => (o == null ? undefined : o[key]),
  root
)

export function setProp(path, val, obj = {}) {
  const keys = path.split(".")
  keys.slice(0, -1).forEach(k => obj = obj[k] ??= {})
  obj[keys.pop()] = val
}
/**
 * Convert hex color to RGB object
 * @param {string} hex - Hex color string (e.g. "#ff0000" or "ff0000")
 * @returns {Object} RGB object with r, g, b properties
 */
export function hexToRgb(hex) {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16)
  } : null
}

/**
 * Convert RGB values to hex color string
 * @param {number} r - Red value (0-255)
 * @param {number} g - Green value (0-255)
 * @param {number} b - Blue value (0-255)
 * @returns {string} Hex color string with # prefix
 */
export function rgbToHex(r, g, b) {
  return "#" + ((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1)
}

//
// Blur parameters: radius controls softness, passes = 2 gives a good
// Gaussian approximation for scenic backgrounds (cities, trees).
//
const BOX_BLUR_RADIUS = 5
const BOX_BLUR_PASSES = 2

/**
 * Apply a fast in-place box blur to a canvas using a sliding-window algorithm.
 * Runs in O(width × height) regardless of radius. Two passes approximate a
 * Gaussian well enough for atmospheric background sprites (buildings, trees).
 * Works well with both GPU-backed and CPU-backed canvases; for a GPU-backed
 * canvas the one-time getImageData read-back takes ~20–40 ms on most hardware.
 * @param {CanvasRenderingContext2D} ctx - 2D context of the canvas to blur
 * @param {number} width  - Canvas pixel width
 * @param {number} height - Canvas pixel height
 */
export function applyBoxBlur(ctx, width, height) {
  const imageData = ctx.getImageData(0, 0, width, height)
  const data = imageData.data
  const tmp = new Uint8ClampedArray(data.length)
  for (let pass = 0; pass < BOX_BLUR_PASSES; pass++) {
    blurHorizontal(data, tmp, width, height, BOX_BLUR_RADIUS)
    blurVertical(tmp, data, width, height, BOX_BLUR_RADIUS)
  }
  ctx.putImageData(imageData, 0, 0)
}
//
// Sliding-window horizontal blur: src → dst.
// Initialises the running sum for the window centred at x = 0,
// then each step adds the incoming right-edge pixel and removes the outgoing
// left-edge pixel — O(1) per pixel regardless of radius.
//
function blurHorizontal(src, dst, w, h, radius) {
  for (let y = 0; y < h; y++) {
    const rowOffset = y * w
    let r = 0, g = 0, b = 0, a = 0
    const initEnd = Math.min(radius, w - 1)
    for (let x = 0; x <= initEnd; x++) {
      const i = (rowOffset + x) * 4
      r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]
    }
    for (let x = 0; x < w; x++) {
      const cnt = Math.min(x + radius, w - 1) - Math.max(0, x - radius) + 1
      const o = (rowOffset + x) * 4
      dst[o] = r / cnt; dst[o + 1] = g / cnt; dst[o + 2] = b / cnt; dst[o + 3] = a / cnt
      if (x >= radius) {
        const ri = (rowOffset + x - radius) * 4
        r -= src[ri]; g -= src[ri + 1]; b -= src[ri + 2]; a -= src[ri + 3]
      }
      const addX = x + radius + 1
      if (addX < w) {
        const ai = (rowOffset + addX) * 4
        r += src[ai]; g += src[ai + 1]; b += src[ai + 2]; a += src[ai + 3]
      }
    }
  }
}
//
// Sliding-window vertical blur: src → dst.
//
function blurVertical(src, dst, w, h, radius) {
  for (let x = 0; x < w; x++) {
    let r = 0, g = 0, b = 0, a = 0
    const initEnd = Math.min(radius, h - 1)
    for (let y = 0; y <= initEnd; y++) {
      const i = (y * w + x) * 4
      r += src[i]; g += src[i + 1]; b += src[i + 2]; a += src[i + 3]
    }
    for (let y = 0; y < h; y++) {
      const cnt = Math.min(y + radius, h - 1) - Math.max(0, y - radius) + 1
      const o = (y * w + x) * 4
      dst[o] = r / cnt; dst[o + 1] = g / cnt; dst[o + 2] = b / cnt; dst[o + 3] = a / cnt
      if (y >= radius) {
        const ri = ((y - radius) * w + x) * 4
        r -= src[ri]; g -= src[ri + 1]; b -= src[ri + 2]; a -= src[ri + 3]
      }
      const addY = y + radius + 1
      if (addY < h) {
        const ai = (addY * w + x) * 4
        r += src[ai]; g += src[ai + 1]; b += src[ai + 2]; a += src[ai + 3]
      }
    }
  }
}
