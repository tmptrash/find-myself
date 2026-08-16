import { get } from './progress.js'
import * as BootLoader from './boot-loader.js'
import { getActiveSceneName, rebootEngineForScene } from './engine-switch.js'
import {
  onEngineResolutionSwapped,
  prepareSceneAssetsThenEnterScene
} from './lesson-assets.js'

//
// Debounce so dragging a window edge does not reboot on every pixel.
//
const RESIZE_DEBOUNCE_MS = 280
const MIN_SIZE_DELTA = 4

let lastW = 0
let lastH = 0
let resizeTimer = null
let resizeBusy = false
let installed = false

/**
 * Reboots the live engine on window resize so native-resolution scenes
 * (and letterboxed ones) match a fresh page load at the new size.
 */
export function installWindowResizeReboot() {
  if (installed) return
  installed = true
  lastW = window.innerWidth
  lastH = window.innerHeight
  window.addEventListener('resize', onWindowResize)
}

function onWindowResize() {
  const w = window.innerWidth
  const h = window.innerHeight
  if (Math.abs(w - lastW) < MIN_SIZE_DELTA && Math.abs(h - lastH) < MIN_SIZE_DELTA) return
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => applyWindowResize(), RESIZE_DEBOUNCE_MS)
}

async function applyWindowResize() {
  if (resizeBusy) return
  const w = window.innerWidth
  const h = window.innerHeight
  if (Math.abs(w - lastW) < MIN_SIZE_DELTA && Math.abs(h - lastH) < MIN_SIZE_DELTA) return
  lastW = w
  lastH = h
  const sceneName = getActiveSceneName() || get('lastLesson', null) || 'menu'
  resizeBusy = true
  BootLoader.showLoader()
  BootLoader.setLoaderBarPct(0)
  try {
    const k = await rebootEngineForScene(sceneName)
    onEngineResolutionSwapped()
    await prepareSceneAssetsThenEnterScene(k, sceneName, undefined, { retainLoader: true })
  } finally {
    BootLoader.hideLoader()
    resizeBusy = false
  }
}
