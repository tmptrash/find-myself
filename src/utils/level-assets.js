import * as CityBackground from '../sections/time/components/city-background.js'
import * as BootLoader from './boot-loader.js'
import { drainTrackedTouchSpriteNames } from './touch-sprite-registry.js'
import { squashSpriteReleaseGpu } from './sprite-gpu.js'

//
// City sprite names used by time levels — tracked so we can compare pack keys.
//
const TIME_LEVEL0_PLATFORM_BOTTOM = 250
const TIME_LEVEL1_PLATFORM_BOTTOM = 150
const TIME_LEVEL2_PLATFORM_BOTTOM = 150
const TIME_LEVEL3_LOWER_CORRIDOR_Y = 680
const TIME_LEVEL3_CORRIDOR_HEIGHT = 180
//
// City background sprite names for each time pack.
// When entering any time level, the city backgrounds of ALL OTHER time levels
// are squashed (replaced with a 1×1 placeholder) so their GPU textures become
// eligible for GC before the new level's heavy canvas generation starts.
// This prevents VRAM accumulation across level transitions, which caused
// WebGL context loss on time level 1 and 2 entry.
//
const TIME_CITY_SPRITE = {
  'time-0': 'city-background',
  'time-1': 'city-background-level1',
  'time-2': 'city-background-level2',
  'time-3': 'city-background-level3'
}
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
//
// Registry for sprites loaded exclusively by time level 3.
// Squashed (replaced with 1×1 canvas) when the pack changes away from time-3
// so their GPU texture objects become eligible for GC.
//
const time3SpriteRegistry = new Set()

/**
 * Register a sprite as belonging to the time-3 pack so it is squashed on pack exit.
 * Called by time level 3 for every sprite it loads.
 * @param {string} name - Kaplay sprite asset id
 */
export function registerTime3Sprite(name) {
  time3SpriteRegistry.add(name)
}

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

async function loadTimeCityForLevel(k, sceneName) {
  //
  // onProgress is called inside preloadCityBackground between the draw phase
  // and the blur phase (and again after blur). It updates the loader bar so the
  // user sees gradual progress, and yields rAF frames so the browser can repaint.
  //
  const onProgress = async (pct) => {
    BootLoader.setLoaderBarPct(pct)
    await BootLoader.yieldForGpu(2)
  }
  if (sceneName === 'level-time.0') {
    await CityBackground.preloadCityBackground(
      k, TIME_LEVEL0_PLATFORM_BOTTOM, 'city-background',
      false, false, true, 2.0, true, onProgress
    )
    return
  }
  if (sceneName === 'level-time.1') {
    await CityBackground.preloadCityBackground(
      k, TIME_LEVEL1_PLATFORM_BOTTOM, 'city-background-level1',
      false, false, true, 2.0, true, onProgress
    )
    return
  }
  if (sceneName === 'level-time.2') {
    await CityBackground.preloadCityBackground(
      k, TIME_LEVEL2_PLATFORM_BOTTOM, 'city-background-level2',
      false, true, true, 0.4, true, onProgress
    )
    return
  }
  if (sceneName === 'level-time.3') {
    const groundLine = k.height() - (TIME_LEVEL3_LOWER_CORRIDOR_Y + TIME_LEVEL3_CORRIDOR_HEIGHT)
    //
    // No trees and no sun for level 3 — keeps VRAM lower and matches the snowy aesthetic.
    //
    await CityBackground.preloadCityBackground(k, groundLine, 'city-background-level3', false, true, false, 0.25, false, false, onProgress)
    //
    // Register city bg so it gets squashed when leaving time-3.
    //
    registerTime3Sprite('city-background-level3')
  }
}

/**
 * Load GPU-heavy assets for the given pack. Loader bar may already be visible.
 * @param {Object} k
 * @param {string} packKey
 * @param {string} sceneName
 */
async function applyPack(k, packKey, sceneName) {
  //
  // When switching away from time-3, squash its large sprites so the GPU texture
  // objects become orphaned and eligible for GC. This reduces VRAM pressure when
  // entering time-3 on a second or subsequent visit.
  //
  if (packKey !== 'time-3' && time3SpriteRegistry.size > 0) {
    for (const name of time3SpriteRegistry) {
      squashSpriteReleaseGpu(k, name)
    }
    time3SpriteRegistry.clear()
  }
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
    //
    // Squash city backgrounds of every other time level before generating the
    // new one. Each city background is a 1920×1080 GPU texture (~8 MB); letting
    // them accumulate across level transitions can push VRAM past the browser
    // budget and trigger WebGL context loss on level 1 and 2 entry.
    //
    Object.entries(TIME_CITY_SPRITE).forEach(([pack, spriteName]) => {
      pack !== packKey && squashSpriteReleaseGpu(k, spriteName)
    })
    BootLoader.setLoaderBarPct(20)
    //
    // Yield extra frames after squashing so the browser can flush pending GPU
    // work and give GC a chance to reclaim old texture memory before the new
    // city background drawing starts.
    //
    await BootLoader.yieldForGpu(3)
    //
    // loadTimeCityForLevel is async: it draws the canvas (~65 ms), yields, blurs
    // (~130 ms), yields, then calls k.loadSprite. onProgress inside the function
    // updates the bar from 55 → 85 % with repaints between each phase.
    //
    await loadTimeCityForLevel(k, sceneName)
    BootLoader.setLoaderBarPct(95)
    await BootLoader.yieldForGpu(2)
  }
}

/**
 * Ensures assets for the target scene are loaded.
 * For time packs (which do synchronous blocking canvas work) the loader is shown
 * immediately and the DOM gets two paint frames before the blocking call.
 * For all other packs the loader only appears if preparation exceeds LOADER_REVEAL_DELAY_MS.
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
  //
  // Time packs call createCityBackgroundSprite which is synchronous and blocks the JS
  // thread for several seconds. Show the loader and yield frames so the browser can
  // repaint before we hand the thread to the canvas generator.
  //
  const isTimePack = packKey.startsWith('time-')
  let loaderShown = false
  let loaderTimer = null
  if (!quietFirstHub) {
    BootLoader.setLoaderBarPct(5)
    if (isTimePack) {
      BootLoader.showLoader()
      loaderShown = true
      //
      // Two rAF frames so the browser actually paints the loader before the sync block.
      //
      await BootLoader.yieldForGpu(2)
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
  // Paint canvas immediately so the previous scene (menu) does not flash for a frame
  //
  if (sceneName.startsWith('level-touch')) {
    k.setBackground(k.rgb(26, 26, 26))
    k.canvas?.style.setProperty('background-color', 'rgb(26, 26, 26)', 'important')
  }
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
