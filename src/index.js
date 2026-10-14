import * as BootLoader from "./utils/boot-loader.js"
import { playReadyTvIntroBeforeLoader, finishReadyTvIntroNow } from "./utils/ready-tv-power-on.js"
import { prepareSceneAssetsThenEnterScene } from "./utils/lesson-assets.js"
import { bootEngine, RESOLUTION_MODE } from "./utils/game-engine.js"
import { disposeActiveEngineForHotReload, setActiveEngine } from "./utils/engine-switch.js"
import { installWindowResizeReboot } from "./utils/window-resize.js"
import * as Sound from "./utils/sound.js"
//
// Force dark background for all elements
//
document.documentElement.style.backgroundColor = '#000000'
document.body.style.backgroundColor = '#000000'
//
// Vite HMR re-runs this module but must not reboot into "ready" or replay TV snow.
//
if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    finishReadyTvIntroNow()
    Sound.stopReadyTvLoaderBackdropHiss()
    Sound.stopReadyTvPowerOnSound()
    document.getElementById('ready-tv-power-on-overlay')?.remove()
    BootLoader.setLoaderHideHandler(null)
    BootLoader.hideLoader()
    disposeActiveEngineForHotReload()
  })
}
if (!import.meta.hot?.data.gameBooted) {
  import.meta.hot && (import.meta.hot.data.gameBooted = true)
  boot()
}
/**
 * Top-level boot sequence: boots the native-resolution engine that "ready",
 * "menu" and Glow/touch lesson 0 all share (see game-engine.js and
 * engine-switch.js), then enters "ready" directly with no engine swap.
 * Every remaining lesson still runs on the fixed 1920x1080 engine and swaps
 * into it on demand.
 */
async function boot() {
  const startScene = new URLSearchParams(location.search).get('scene') || 'ready'
  let bootDuringTv = null
  await playReadyTvIntroBeforeLoader({
    sceneName: startScene,
    onSnowPhaseStart: () => {
      bootDuringTv = bootEngine(RESOLUTION_MODE.NATIVE)
    }
  })
  if (!BootLoader.isLoaderVisible()) {
    BootLoader.showLoader()
    BootLoader.setLoaderBarPct(0)
  }
  let k
  try {
    k = bootDuringTv ? await bootDuringTv : await bootEngine(RESOLUTION_MODE.NATIVE)
  } catch (err) {
    throw err
  }
  setActiveEngine(k, RESOLUTION_MODE.NATIVE)
  installWindowResizeReboot()
  await prepareSceneAssetsThenEnterScene(k, startScene)
}
