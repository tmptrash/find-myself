import * as TouchInput from './touch-input.js'

//
// 2D contexts of every baked canvas are created with this option on touch
// devices: Chrome then rasterises the canvas on the CPU instead of giving it
// a GPU surface.
//
const SOFTWARE_CONTEXT_OPTS = { willReadFrequently: true }
const CONTEXT_TYPE_2D = '2d'

/**
 * Makes every 2D canvas context of the page CPU-backed on touch devices.
 * The game bakes hundreds of canvases at launch (sprites, decor, grain) and
 * Chrome gives each one its own GPU surface, in the same GPU process as the
 * game's WebGL canvas. On a phone GPU (e.g. Mali) that pile of surfaces,
 * plus the readbacks of the grain pass, exhausts GPU memory and the WebGL
 * context is lost while the game is still launching. Baked canvases are only
 * drawn once and uploaded as textures, so a CPU backing costs nothing at
 * run time. Desktop keeps GPU canvases (faster bakes, no memory pressure).
 * Call once, before the first canvas is created.
 * @returns {Object} Inst with `active` flag (false on non-touch devices)
 */
export function create() {
  const inst = {
    active: TouchInput.isTouchDevice(),
    originalGetContext: HTMLCanvasElement.prototype.getContext
  }
  inst.active && patchGetContext(inst)
  return inst
}

// Replaces HTMLCanvasElement.getContext so 2D contexts are always CPU-backed
function patchGetContext(inst) {
  const { originalGetContext } = inst
  HTMLCanvasElement.prototype.getContext = function getContext(type, opts) {
    if (type !== CONTEXT_TYPE_2D) return originalGetContext.call(this, type, opts)
    return originalGetContext.call(this, type, { ...opts, ...SOFTWARE_CONTEXT_OPTS })
  }
}
