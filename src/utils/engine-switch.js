import * as BootLoader from './boot-loader.js'
import { bootEngine, teardownEngine, RESOLUTION_MODE } from './game-engine.js'

//
// Scene name prefix that runs on the native-resolution engine. Every other
// scene (menu, ready, word/touch/time lessons, glow-complete) runs on the
// fixed 1920x1080 engine.
//
const NATIVE_RESOLUTION_SCENE_PREFIX = 'lesson-glow'
//
// Avoid flashing the DOM loader on fast engine swaps (e.g. right after the
// yellow pre-Glow subtitle when boot finishes within this window).
//
const ENGINE_SWAP_LOADER_DELAY_MS = 200
//
// Currently live Kaplay instance and which resolution mode it was booted in.
//
let activeEngine = null
let activeResolutionMode = null
//
// Glow registers audio teardown here — Kaplay onSceneLeave does not run when
// the native engine is destroyed during a resolution swap (menu / other levels).
//
let glowNativeTeardown = null

/**
 * The currently active Kaplay instance, or null before the first boot.
 * @returns {Object|null}
 */
export function getActiveEngine() {
  return activeEngine
}

/**
 * The resolution mode the active engine was booted with.
 * @returns {string|null}
 */
export function getActiveResolutionMode() {
  return activeResolutionMode
}

/**
 * Registers the currently live engine. Called once right after the initial
 * boot in index.js, and again internally after every engine swap.
 * @param {Object} k - Kaplay instance
 * @param {string} mode - One of RESOLUTION_MODE
 */
export function setActiveEngine(k, mode) {
  activeEngine = k
  activeResolutionMode = mode
}
/**
 * Registers a one-shot callback that stops Glow-only loop audio (birds, rain)
 * before the native engine is torn down for a resolution swap.
 * @param {Function|null} fn
 */
export function registerGlowNativeTeardown(fn) {
  glowNativeTeardown = fn
}
//
// Stops Glow loop audio when leaving the native-resolution engine.
//
function runGlowNativeTeardown() {
  glowNativeTeardown?.()
  glowNativeTeardown = null
}

/**
 * Which resolution mode a given scene name needs to run in.
 * @param {string} sceneName
 * @returns {string} One of RESOLUTION_MODE
 */
export function resolutionModeForScene(sceneName) {
  return typeof sceneName === 'string' && sceneName.startsWith(NATIVE_RESOLUTION_SCENE_PREFIX)
    ? RESOLUTION_MODE.NATIVE
    : RESOLUTION_MODE.FIXED
}

/**
 * Makes sure the live engine matches the resolution mode the target scene
 * needs, swapping it if not: tears down the current engine, boots a fresh
 * one (reloading every core asset from scratch — a DOM loader is shown for
 * the duration) and registers it as active. A no-op when already in the
 * right mode.
 * @param {string} sceneName - Scene about to be entered
 * @param {Object} [opts]
 * @param {boolean} [opts.loaderDuringBoot] - Keep the DOM loader up for the full swap + boot
 * @returns {Promise<{ k: Object, switched: boolean }>}
 */
export async function ensureEngineForScene(sceneName, opts = {}) {
  const neededMode = resolutionModeForScene(sceneName)
  if (neededMode === activeResolutionMode && activeEngine) {
    return { k: activeEngine, switched: false }
  }
  const loaderDuringBoot = opts.loaderDuringBoot === true
  const staleEngine = activeEngine
  const silentSwap = !loaderDuringBoot && neededMode === RESOLUTION_MODE.NATIVE
  let loaderShown = false
  let loaderTimer = null
  if (loaderDuringBoot) {
    BootLoader.showLoader()
    BootLoader.setLoaderBarPct(0)
    loaderShown = true
  } else if (!silentSwap) {
    loaderTimer = setTimeout(() => {
      BootLoader.showLoader()
      BootLoader.setLoaderBarPct(0)
      loaderShown = true
    }, ENGINE_SWAP_LOADER_DELAY_MS)
  }
  activeResolutionMode === RESOLUTION_MODE.NATIVE && runGlowNativeTeardown()
  staleEngine && teardownEngine(staleEngine)
  const freshEngine = await bootEngine(neededMode)
  if (loaderDuringBoot) {
    BootLoader.setLoaderBarPct(100)
  } else {
    loaderTimer && clearTimeout(loaderTimer)
    loaderShown && BootLoader.hideLoader()
  }
  setActiveEngine(freshEngine, neededMode)
  return { k: freshEngine, switched: true }
}
