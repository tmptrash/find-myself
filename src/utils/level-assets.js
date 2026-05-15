import * as CityBackground from '../sections/time/components/city-background.js'
import * as BootLoader from './boot-loader.js'
import { drainTrackedTouchSpriteNames } from './touch-sprite-registry.js'

//
// City sprite names used by time levels — tracked so we can compare pack keys.
//
const TIME_LEVEL0_PLATFORM_BOTTOM = 250
const TIME_LEVEL1_PLATFORM_BOTTOM = 150
const TIME_LEVEL2_PLATFORM_BOTTOM = 150
const TIME_LEVEL3_LOWER_CORRIDOR_Y = 680
const TIME_LEVEL3_CORRIDOR_HEIGHT = 180
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
// Short packs (hub/touch) finish well under this threshold.
//
const LOADER_REVEAL_DELAY_MS = 2000

/**
 * Invalidate async asset preparation started for a level transition (e.g. Esc to menu).
 */
export function bumpPrepareCancelNonce() {
  prepareCancelNonce++
}

/**
 * Scene name → asset pack id.
 * @param {string} sceneName
 * @returns {string}
 */
export function sceneToPackKey(sceneName) {
  if (!sceneName) return 'hub'
  if (sceneName === 'word-complete' || sceneName === 'time-complete' || sceneName === 'touch-complete') {
    return 'hub'
  }
  if (sceneName.startsWith('level-word')) return 'word'
  if (sceneName.startsWith('level-time')) return `time-${sceneName.split('.')[1]}`
  if (sceneName.startsWith('level-touch')) return `touch-${sceneName.split('.')[1]}`
  return 'hub'
}

function loadTimeCityForLevel(k, sceneName) {
  if (sceneName === 'level-time.0') {
    CityBackground.preloadCityBackground(
      k, TIME_LEVEL0_PLATFORM_BOTTOM, 'city-background',
      false, false, true, 2.0, true
    )
    return
  }
  if (sceneName === 'level-time.1') {
    CityBackground.preloadCityBackground(
      k, TIME_LEVEL1_PLATFORM_BOTTOM, 'city-background-level1',
      false, false, true, 2.0, true
    )
    return
  }
  if (sceneName === 'level-time.2') {
    CityBackground.preloadCityBackground(
      k, TIME_LEVEL2_PLATFORM_BOTTOM, 'city-background-level2',
      false, true, true, 0.4, true
    )
    return
  }
  if (sceneName === 'level-time.3') {
    const groundLine = k.height() - (TIME_LEVEL3_LOWER_CORRIDOR_Y + TIME_LEVEL3_CORRIDOR_HEIGHT)
    CityBackground.preloadCityBackground(k, groundLine, 'city-background-level3', false, true, false)
  }
}

/**
 * Load GPU-heavy assets for the given pack. Loader bar may already be visible.
 * @param {Object} k
 * @param {string} packKey
 * @param {string} sceneName
 */
async function applyPack(k, packKey, sceneName) {
  if (packKey === 'hub' || packKey.startsWith('touch-')) {
    //
    // Touch and hub scenes generate their own sprites inside the scene body — nothing to pre-load.
    //
    BootLoader.setLoaderBarPct(80)
    await BootLoader.yieldForGpu(2)
    return
  }
  if (packKey === 'word') {
    BootLoader.setLoaderBarPct(40)
    await BootLoader.yieldForGpu(1)
    //
    // Blade sprites use dynamic import to avoid a circular dependency chain.
    //
    const Blades = await import('../sections/word/components/blades.js')
    Blades.loadSprites(k)
    BootLoader.setLoaderBarPct(85)
    await BootLoader.yieldForGpu(3)
    return
  }
  if (packKey.startsWith('time-')) {
    BootLoader.setLoaderBarPct(35)
    await BootLoader.yieldForGpu(1)
    loadTimeCityForLevel(k, sceneName)
    BootLoader.setLoaderBarPct(90)
    await BootLoader.yieldForGpu(4)
  }
}

/**
 * Ensures assets for the target scene are loaded.
 * Shows the DOM loader only when preparation takes longer than LOADER_REVEAL_DELAY_MS.
 * @param {Object} k
 * @param {string} sceneName
 */
export async function prepareSceneAssets(k, sceneName) {
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
  const quietFirstHub = activePackKey === null && packKey === 'hub'
  let loaderShown = false
  let loaderTimer = null
  if (!quietFirstHub) {
    BootLoader.setLoaderBarPct(5)
    loaderTimer = setTimeout(() => {
      if (nonceAtStart !== prepareCancelNonce) return
      BootLoader.showLoader()
      loaderShown = true
    }, LOADER_REVEAL_DELAY_MS)
  }
  try {
    await applyPack(k, packKey, sceneName)
    if (nonceAtStart !== prepareCancelNonce) return
    if (loaderShown) BootLoader.setLoaderBarPct(100)
    activePackKey = packKey
  } finally {
    if (loaderTimer) clearTimeout(loaderTimer)
    if (loaderShown) BootLoader.hideLoader()
    if (quietFirstHub) BootLoader.hideLoader()
  }
}

/**
 * Enter the scene. Touch procedural sprites from the previous level are drained
 * from the registry (no GPU free — GC handles memory) so the new scene can
 * re-register the same names without stale tracking state.
 * @param {Object} k
 * @param {string} sceneName
 * @param {Function} [afterGo]
 */
export function enterPreparedScene(k, sceneName, afterGo) {
  //
  // Clear Touch sprite tracking so next scene starts with a clean registry list.
  //
  drainTrackedTouchSpriteNames()
  k.go(sceneName)
  afterGo?.()
}

/**
 * Runs asset preparation then enters the scene.
 * @param {Object} k
 * @param {string} sceneName
 * @param {Function} [afterGo]
 */
export async function prepareSceneAssetsThenEnterScene(k, sceneName, afterGo) {
  await prepareSceneAssets(k, sceneName)
  enterPreparedScene(k, sceneName, afterGo)
}

/**
 * Prepare assets and navigate to scene, with optional callback after k.go.
 * @param {Object} k
 * @param {string} sceneName
 * @param {Function} [afterGo]
 */
export function goAfterPreparingAssets(k, sceneName, afterGo) {
  return prepareSceneAssetsThenEnterScene(k, sceneName, afterGo)
}

/**
 * Navigate to the menu scene, releasing current pack.
 * @param {Object} k
 */
export function goToMenuAfterAssets(k) {
  return goAfterPreparingAssets(k, 'menu')
}
