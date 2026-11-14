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
//
// A window that keeps changing size (some phone web-app modes do) must not
// reboot the engine over and over: after RESIZE_LOOP_MAX reboots within
// RESIZE_LOOP_WINDOW_MS further resizes are ignored until it has been quiet.
//
const RESIZE_LOOP_MAX = 3
const RESIZE_LOOP_WINDOW_MS = 20000
const rebootTimes = []

let lastW = 0
let lastH = 0
let resizeTimer = null
let resizeBusy = false
let installed = false
let rebootCount = 0
//
// While a resize is pending the loader covers the canvas: a phone's rotation
// passes through in-between sizes (and WebKit can fail a frame there), so the
// old engine is never seen stretched or on Kaplay's error screen before the
// reboot. A size that changes again while rebooting is caught right after.
//
let coverShown = false

/**
 * @returns {number} Engine reboots caused by window resizes in this page's life
 */
export function getResizeRebootCount() {
  return rebootCount
}

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
  window.addEventListener('orientationchange', onWindowResize)
}

function onWindowResize() {
  const w = window.innerWidth
  const h = window.innerHeight
  if (Math.abs(w - lastW) < MIN_SIZE_DELTA && Math.abs(h - lastH) < MIN_SIZE_DELTA) return
  coverCanvas()
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => applyWindowResize(), RESIZE_DEBOUNCE_MS)
}
function coverCanvas() {
  if (coverShown || resizeBusy) return
  coverShown = true
  BootLoader.showLoader()
  BootLoader.setLoaderBarPct(0)
}
function uncoverCanvas() {
  coverShown && BootLoader.hideLoader()
  coverShown = false
}

async function applyWindowResize() {
  if (resizeBusy) return
  const w = window.innerWidth
  const h = window.innerHeight
  if (Math.abs(w - lastW) < MIN_SIZE_DELTA && Math.abs(h - lastH) < MIN_SIZE_DELTA) {
    uncoverCanvas()
    return
  }
  lastW = w
  lastH = h
  coverShown = false
  const now = performance.now()
  while (rebootTimes.length && now - rebootTimes[0] > RESIZE_LOOP_WINDOW_MS) rebootTimes.shift()
  if (rebootTimes.length >= RESIZE_LOOP_MAX) {
    uncoverCanvas()
    return
  }
  rebootTimes.push(now)
  rebootCount++
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
  onWindowResize()
}
