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
 * Top-level boot sequence: boots the native-resolution engine that "ready",
 * "menu" and Glow/touch lesson 0 all share (see game-engine.js and
 * engine-switch.js), then enters "ready" directly with no engine swap.
 * Every remaining lesson still runs on the fixed 1920x1080 engine and swaps
 * into it on demand.
 */
async function boot() {
  let k
  try {
    k = await bootEngine(RESOLUTION_MODE.NATIVE)
  } catch (err) {
    throw err
  }
  setActiveEngine(k, RESOLUTION_MODE.NATIVE)
  installWindowResizeReboot()
  await prepareSceneAssetsThenEnterScene(k, 'ready')
}
