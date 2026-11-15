import { setContextLossHandler } from './game-engine.js'
import { rebootIntoActiveScene } from './scene-reboot.js'
//
// A phone drops the game's WebGL context now and then on its own: the app
// went to the background (a screenshot, another app, the screen locked) and
// the system took the GPU memory back, or the GPU process restarted. The
// page itself is fine, so instead of reloading it with an error message the
// engine is rebooted into the scene that was running, under the usual loader
// — and only once the page shows again (a hidden page cannot get a new
// context). RECOVER_DELAY_MS lets the GPU settle first.
//
// More than RECOVER_MAX losses within RECOVER_WINDOW_MS mean something keeps
// killing the context: the engine's own reload path (game-engine.js) takes
// over then.
//
const RECOVER_DELAY_MS = 600
const RECOVER_MAX = 3
const RECOVER_WINDOW_MS = 60000
const VISIBILITY_EVENT = 'visibilitychange'
const recoverTimes = []

/**
 * Installs the in-place recovery from a lost WebGL context (call once at boot).
 * @returns {Object} Recovery inst
 */
export function create() {
  const inst = { pending: false, onVisible: null }
  inst.onVisible = () => onPageVisible(inst)
  setContextLossHandler(() => onContextLost(inst))
  return inst
}

//
// The live engine lost its context; true when the recovery takes it over.
//
function onContextLost(inst) {
  if (inst.pending) return true
  const now = performance.now()
  while (recoverTimes.length && now - recoverTimes[0] > RECOVER_WINDOW_MS) recoverTimes.shift()
  if (recoverTimes.length >= RECOVER_MAX) return false
  recoverTimes.push(now)
  inst.pending = true
  document.hidden ? document.addEventListener(VISIBILITY_EVENT, inst.onVisible) : scheduleRecover(inst)
  return true
}
function onPageVisible(inst) {
  if (document.hidden) return
  document.removeEventListener(VISIBILITY_EVENT, inst.onVisible)
  scheduleRecover(inst)
}
function scheduleRecover(inst) {
  setTimeout(() => recover(inst), RECOVER_DELAY_MS)
}
//
// A reboot that fails as well (no context to be had) falls back to a reload.
//
async function recover(inst) {
  try {
    await rebootIntoActiveScene()
  } catch (_) {
    location.reload()
  } finally {
    inst.pending = false
  }
}
