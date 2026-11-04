import * as BootLoader from './boot-loader.js'
import { normalizeSceneName } from './progress.js'
import { ensureEngineForScene, getActiveResolutionMode, resolutionModeForScene, setActiveSceneName } from './engine-switch.js'
import { waitForForestLevel0Bootstrap } from '../sections/forest/scenes/level0.js'
import { RESOLUTION_MODE } from './game-engine.js'

const FOREST_LEVEL0_SCENE = 'lesson-forest.0'
const FOREST_SCENE_PREFIX = 'lesson-forest'
//
// Asset packs: the forest level bakes its own heavy art; every other scene
// (ready, menu, cave, forest-complete) builds its sprites inside the scene.
//
const PACK = {
  HUB: 'hub',
  FOREST: 'forest'
}
//
// Loader bar share reached once a hub pack is "loaded".
//
const HUB_LOADER_BAR_PCT = 80
const LOADER_START_BAR_PCT = 5
const LOADER_DONE_BAR_PCT = 100
const LOADER_YIELD_FRAMES = 2
//
// Pack key active when the last prepareSceneAssets completed.
//
let activePackKey = null
//
// When the player aborts a transition (Esc), in-flight prepareSceneAssets must not
// commit activePackKey — bump cancels any snapshot taken at async entry.
//
let prepareCancelNonce = 0
//
// After this many ms with no completion, reveal the DOM loader.
// Short hub packs finish well under this threshold.
//
const LOADER_REVEAL_DELAY_MS = 2000

/**
 * Invalidate async asset preparation started for a level transition (e.g. Esc to menu).
 */
export function bumpPrepareCancelNonce() {
  prepareCancelNonce++
}

/**
 * Ensures assets for the target scene are loaded.
 * @param {Object} k
 * @param {string} sceneName
 * @param {Object} [opts]
 * @param {boolean} [opts.retainLoader] - Keep the DOM loader visible after prepare (Forest pre-level)
 * @param {boolean} [opts.deferLoaderReveal] - Skip this function's own show/hide/delay logic
 *   entirely because the caller already owns a single loader-reveal timer spanning this
 *   pack-prep step plus additional work of its own (see native-prelevel handling in transition.js)
 */
export async function prepareSceneAssets(k, sceneName, opts = {}) {
  const retainLoader = opts.retainLoader === true
  const deferLoaderReveal = opts.deferLoaderReveal === true
  const packKey = sceneToPackKey(sceneName)
  //
  // Same pack still active — nothing to load; the existing sprites are valid.
  //
  if (packKey === activePackKey) return
  const nonceAtStart = prepareCancelNonce
  //
  // First hub attach after boot: loader is already visible at 100% from the boot sequence —
  // hide it quickly without a progress flash.
  //
  const quietFirstHub = activePackKey === null && packKey === PACK.HUB
  let loaderShown = false
  let loaderTimer = null
  if (!quietFirstHub && !deferLoaderReveal) {
    BootLoader.setLoaderBarPct(LOADER_START_BAR_PCT)
    if (packKey === PACK.FOREST) {
      BootLoader.showLoader()
      loaderShown = true
      await BootLoader.yieldForGpu(LOADER_YIELD_FRAMES)
      if (nonceAtStart !== prepareCancelNonce) return
    } else {
      loaderTimer = setTimeout(() => {
        if (nonceAtStart !== prepareCancelNonce) return
        BootLoader.showLoader()
        loaderShown = true
      }, LOADER_REVEAL_DELAY_MS)
    }
  }
  try {
    await applyPack(packKey)
    if (nonceAtStart !== prepareCancelNonce) return
    loaderShown && BootLoader.setLoaderBarPct(LOADER_DONE_BAR_PCT)
    activePackKey = packKey
  } finally {
    loaderTimer && clearTimeout(loaderTimer)
    loaderShown && !retainLoader && BootLoader.hideLoader()
    quietFirstHub && !retainLoader && BootLoader.hideLoader()
  }
}

/**
 * Clears pack bookkeeping after a resolution-mode engine swap.
 */
export function onEngineResolutionSwapped() {
  activePackKey = null
}

/**
 * Enter the scene. A scene on the other resolution mode (forest-complete runs
 * on the fixed engine) needs a differently sized engine than the one passed
 * in — ensureEngineForScene transparently swaps to it first, tearing down and
 * rebooting the whole Kaplay instance when needed (see engine-switch.js).
 * @param {Object} k
 * @param {string} sceneName
 * @param {Function} [afterGo]
 */
export async function enterPreparedScene(k, sceneName, afterGo) {
  const nativeTarget = resolutionModeForScene(sceneName) === RESOLUTION_MODE.NATIVE
  const { k: liveK, switched } = await ensureEngineForScene(sceneName, {
    loaderDuringBoot: nativeTarget
  })
  //
  // A swapped-in engine starts with nothing beyond its core boot assets
  // loaded — any pack bookkeeping from the previous engine no longer
  // describes what is actually resident on the GPU.
  //
  switched && onEngineResolutionSwapped()
  switched && await prepareSceneAssets(liveK, sceneName, { deferLoaderReveal: true })
  setActiveSceneName(sceneName)
  liveK.go(sceneName)
  sceneName === FOREST_LEVEL0_SCENE && await waitForForestLevel0Bootstrap()
  afterGo?.(liveK)
}

/**
 * Runs asset preparation then enters the scene.
 * @param {Object} k
 * @param {string} sceneName
 * @param {Function} [afterGo]
 * @param {Object} [opts] - Forwarded to prepareSceneAssets
 */
export async function prepareSceneAssetsThenEnterScene(k, sceneName, afterGo, opts = {}) {
  await prepareSceneAssets(k, sceneName, opts)
  await enterPreparedScene(k, sceneName, afterGo)
}

/**
 * Prepare assets and navigate to scene, with optional callback after k.go.
 * @param {Object} k
 * @param {string} sceneName
 * @param {Function} [afterGo]
 */
export function goAfterPreparingAssets(k, sceneName, afterGo) {
  return prepareSceneAssetsThenEnterScene(k, normalizeSceneName(sceneName), afterGo)
}

/**
 * Navigate to the menu scene, releasing current pack.
 * @param {Object} k
 */
export function goToMenuAfterAssets(k) {
  //
  // Only pre-show the loader when an actual engine swap is coming — menu
  // shares the native engine with Forest and Cave, so leaving one of those
  // straight into menu needs no swap at all. Checking the CURRENT mode alone
  // (rather than whether it differs from menu's target mode) used to retain
  // a loader that ensureEngineForScene's same-mode early return would then
  // never hide, freezing the screen.
  //
  const modeChanging = resolutionModeForScene('menu') !== getActiveResolutionMode()
  if (modeChanging) {
    BootLoader.showLoader()
    BootLoader.setLoaderBarPct(0)
  }
  return prepareSceneAssetsThenEnterScene(k, 'menu', undefined, {
    retainLoader: modeChanging
  })
}
//
// Scene name → asset pack id.
//
function sceneToPackKey(sceneName) {
  return sceneName?.startsWith(FOREST_SCENE_PREFIX) ? PACK.FOREST : PACK.HUB
}
//
// Loads the GPU-heavy assets of a pack. Forest GPU work runs in
// prewarmForestLevel0HeavyAssets, so only the hub moves the loader bar.
//
async function applyPack(packKey) {
  if (packKey === PACK.FOREST) return
  BootLoader.setLoaderBarPct(HUB_LOADER_BAR_PCT)
  await BootLoader.yieldForGpu(LOADER_YIELD_FRAMES)
}
