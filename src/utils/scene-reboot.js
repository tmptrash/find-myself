import { get } from './progress.js'
import * as BootLoader from './boot-loader.js'
import { getActiveSceneName, rebootEngineForScene } from './engine-switch.js'
import { onEngineResolutionSwapped, prepareSceneAssetsThenEnterScene } from './lesson-assets.js'
//
// Scene the reboot falls back to when none is active and no lesson is saved.
//
const FALLBACK_SCENE = 'menu'

/**
 * Boots a fresh engine and enters the scene that was running (or the saved
 * lesson), under the loader, as a fresh page load at the current size would.
 * Used after a window resize and after a lost WebGL context.
 * @returns {Promise<void>}
 */
export async function rebootIntoActiveScene() {
  const sceneName = getActiveSceneName() || get('lastLesson', null) || FALLBACK_SCENE
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
