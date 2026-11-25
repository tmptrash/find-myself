import { get } from './progress.js'
import * as BootLoader from './boot-loader.js'
import { getActiveSceneName, rebootEngineForScene } from './engine-switch.js'
import { onEngineResolutionSwapped, prepareSceneAssetsThenEnterScene } from './lesson-assets.js'
//
// Scene the reboot falls back to when none is active and no lesson is saved.
//
const FALLBACK_SCENE = 'menu'
//
// One reboot at a time: a window resize and a lost WebGL context can ask
// for one at the same moment (a phone rotated as it comes back from the
// background), and two engines booting side by side fight over the canvas
// and the GPU's memory. A reboot asked for while one runs is run once more
// after it (the size or the context has changed again since it started).
//
let running = null
let again = false

/**
 * Boots a fresh engine and enters the scene that was running (or the saved
 * lesson), under the loader, as a fresh page load at the current size would.
 * Used after a window resize and after a lost WebGL context; never two at
 * once (see `running`).
 * @returns {Promise<void>} Resolves once the last reboot asked for is through
 */
export function rebootIntoActiveScene() {
  if (running) {
    again = true
    return running
  }
  running = rebootUntilSettled().finally(clearRunning)
  return running
}
function clearRunning() {
  running = null
}
async function rebootUntilSettled() {
  do {
    again = false
    await rebootOnce()
  } while (again)
}
async function rebootOnce() {
  const sceneName = getActiveSceneName() || get('lastLesson', null) || FALLBACK_SCENE
  BootLoader.setLoaderScene(sceneName)
  BootLoader.showLoader()
  BootLoader.setLoaderBarPct(0)
  try {
    const k = await rebootEngineForScene(sceneName)
    onEngineResolutionSwapped()
    await prepareSceneAssetsThenEnterScene(k, sceneName, undefined, { retainLoader: true })
  } finally {
    BootLoader.hideLoader()
  }
}
