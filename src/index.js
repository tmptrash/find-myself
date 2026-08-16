import * as BootLoader from "./utils/boot-loader.js"
import { prepareSceneAssetsThenEnterScene } from "./utils/lesson-assets.js"
import { bootEngine, RESOLUTION_MODE } from "./utils/game-engine.js"
import { setActiveEngine } from "./utils/engine-switch.js"
import { installWindowResizeReboot } from "./utils/window-resize.js"
//
// Force dark background for all elements
//
document.documentElement.style.backgroundColor = '#000000'
document.body.style.backgroundColor = '#000000'
//
// Boot the application (async so we can retry kaplay() and await asset batches)
//
boot()
/**
 * Top-level boot sequence: boots the standard fixed-resolution engine (every
 * scene except Glow lives here — see game-engine.js and engine-switch.js for
 * the Glow-specific native-resolution engine swap), then enters "ready".
 */
async function boot() {
  let k
  try {
    k = await bootEngine(RESOLUTION_MODE.FIXED)
  } catch (err) {
    throw err
  }
  setActiveEngine(k, RESOLUTION_MODE.FIXED)
  installWindowResizeReboot()
  await prepareSceneAssetsThenEnterScene(k, 'ready')
}
