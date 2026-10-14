import { CFG } from '../cfg.js'
import { parseHex } from './helper.js'
import * as BootLoader from './boot-loader.js'
import * as Sound from './sound.js'
import * as TvRender from './ready-tv-power-on-render.js'
import TvPowerOnWorker from './ready-tv-power-on-worker.js?worker&inline'

const TV_INTRO_OVERLAY_ID = 'ready-tv-power-on-overlay'
const TV_INTRO_OVERLAY_Z = '10000'
const TV_SOUND_TAIL_SEC = 0.35
const TV_LOADER_START_PCT = 5
//
// When loading ends: full bar holds → loader fades → snow keeps running a
// little longer → snow fades and reveals the ready scene.
//
const TV_LOADER_FULL_BAR_HOLD_SEC = 0.35
const TV_SNOW_AFTER_LOAD_SEC = 1.1
const TV_BACKDROP_FADE_OUT_SEC = 0.9
//
// A stalled worker never reports the end of its fade — the main thread drops
// the overlay itself this long after asking for it.
//
const TV_FADE_WATCHDOG_PAD_SEC = 0.6
const MSG = TvRender.TV_WORKER_MSG
const EVENTS = TvRender.TV_EVENTS
//
// CRT power-on runs once per real page load (survives Vite HMR module resets).
//
const TV_INTRO_PLAYED_KEY = '__FIND_YOU_TV_INTRO_PLAYED'
let activeTvIntro = null

/**
 * Plays the CRT power-on intro; during snow/noise the DOM loader sits on top.
 * Rendering runs in a worker on an OffscreenCanvas when available, so the
 * snow never stalls while the engine boots on the main thread.
 * @param {Object} [opts]
 * @param {string} [opts.sceneName='ready'] - Boot target scene
 * @param {Function} [opts.onSnowPhaseStart] - Fired when the snow band opens (start boot here)
 * @returns {Promise<void>} Resolves once the intro has opened into the snow backdrop
 */
export async function playReadyTvIntroBeforeLoader(opts = {}) {
  const sceneName = opts.sceneName ?? 'ready'
  if (sceneName !== 'ready' || window[TV_INTRO_PLAYED_KEY]) return
  window[TV_INTRO_PLAYED_KEY] = true
  const inst = create(opts)
  const sound = Sound.create()
  Sound.startAudioContext(sound)
  Sound.playReadyTvPowerOnSound(sound, {
    clickSec: TvRender.TV_TIMELINE.clickSec,
    openSec: TvRender.TV_TIMELINE.lineHoldEndSec,
    endSec: TvRender.TV_TIMELINE.openEndSec + TV_SOUND_TAIL_SEC
  })
  startRenderer(inst)
  await inst.introDone
}

/**
 * Ends the power-on intro at once: snow overlay removed, hiss and power-on
 * sound silenced. Called when the game leaves "ready", so neither the snow nor
 * the hiss can outlive the first screen. No-op once the intro has finished.
 */
export function finishReadyTvIntroNow() {
  const inst = activeTvIntro
  if (!inst) return
  Sound.stopReadyTvLoaderBackdropHiss()
  Sound.stopReadyTvPowerOnSound()
  if (inst.hideHandlerPending) {
    inst.hideHandlerPending = false
    BootLoader.setLoaderHideHandler(null)
    BootLoader.hideLoader()
  }
  inst.resolveIntro()
  finishOverlay(inst)
}
//
// Overlay canvas element plus promises tracking the renderer timeline.
//
function create(opts) {
  const canvas = document.createElement('canvas')
  canvas.id = TV_INTRO_OVERLAY_ID
  Object.assign(canvas.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    width: '100%',
    height: '100%',
    zIndex: TV_INTRO_OVERLAY_Z,
    display: 'block',
    pointerEvents: 'none'
  })
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  document.body.appendChild(canvas)
  const inst = {
    canvas,
    onSnowPhaseStart: opts.onSnowPhaseStart,
    worker: null,
    render: null,
    loaderRevealed: false,
    hideHandlerPending: false,
    finished: false,
    introDone: null,
    resolveIntro: null,
    resolveFade: null
  }
  inst.introDone = new Promise(resolve => {
    inst.resolveIntro = resolve
  })
  activeTvIntro = inst
  return inst
}
//
// Worker path first; the main-thread renderer is the fallback for runtimes
// without OffscreenCanvas transfer or worker support.
//
function startRenderer(inst) {
  const colors = resolveRenderColors()
  const emit = (type) => onRenderEvent(inst, type)
  inst.worker = createWorker(inst.canvas)
  if (inst.worker) {
    const offscreen = inst.canvas.transferControlToOffscreen()
    inst.worker.onmessage = (event) => emit(event.data.type)
    inst.worker.onerror = () => abortRenderer(inst)
    inst.worker.postMessage({ type: MSG.INIT, canvas: offscreen, colors }, [offscreen])
    return
  }
  inst.render = TvRender.create({ canvas: inst.canvas, colors, emit })
  TvRender.start(inst.render)
}

function createWorker(canvas) {
  if (typeof canvas.transferControlToOffscreen !== 'function' || typeof OffscreenCanvas === 'undefined') return null
  try {
    return new TvPowerOnWorker()
  } catch {
    return null
  }
}

function resolveRenderColors() {
  const colors = CFG.visual.colors.ready
  return {
    offRgb: parseHex(colors.background),
    coreRgb: parseHex(colors.tvPowerOn.lineCore),
    haloRgb: parseHex(colors.tvPowerOn.lineHalo),
    snowPalette: colors.tvPowerOn.snow.map(packSnowColor)
  }
}

function onRenderEvent(inst, type) {
  if (type === EVENTS.LOADER_REVEAL) revealLoaderOverSnow(inst)
  else if (type === EVENTS.INTRO_DONE) onIntroDone(inst)
  else if (type === EVENTS.FADE_DONE) finishOverlay(inst)
}

function onIntroDone(inst) {
  !inst.finished && Sound.playReadyTvLoaderBackdropHiss()
  inst.resolveIntro()
}
//
// Loader text + bar over the snow while the tube still shows static; the
// engine boot starts here so loading overlaps the snow phase.
//
function revealLoaderOverSnow(inst) {
  if (inst.loaderRevealed) return
  inst.loaderRevealed = true
  inst.hideHandlerPending = true
  BootLoader.setLoaderHideHandler(() => runLoaderOutro(inst))
  BootLoader.showLoader({
    transparentBackdrop: true,
    elevatedZ: true,
    keepCanvasIds: [TV_INTRO_OVERLAY_ID]
  })
  BootLoader.setLoaderBarPct(TV_LOADER_START_PCT)
  inst.onSnowPhaseStart?.()
}
//
// Bar finishes and the loader fades first; the snow outlives it, then fades
// over the ready scene that has been running underneath since the loader hid.
//
async function runLoaderOutro(inst) {
  inst.hideHandlerPending = false
  await inst.introDone
  //
  // finishReadyTvIntroNow() may have closed the intro meanwhile; the steps
  // below would then hide the next scene's loader or restart nothing useful.
  //
  if (inst.finished) return
  await BootLoader.completeAndFadeOutLoaderUi(TV_LOADER_FULL_BAR_HOLD_SEC)
  if (inst.finished) return
  setSpotStrength(inst, 0)
  await new Promise(resolve => setTimeout(resolve, TV_SNOW_AFTER_LOAD_SEC * 1000))
  if (inst.finished) return
  Sound.fadeOutReadyTvLoaderBackdropHiss(TV_BACKDROP_FADE_OUT_SEC)
  Sound.stopReadyTvPowerOnSound()
  await fadeOutOverlay(inst)
}

function setSpotStrength(inst, value) {
  if (inst.finished) return
  inst.worker
    ? inst.worker.postMessage({ type: MSG.SPOT, value })
    : TvRender.setSpotStrength(inst.render, value)
}

function fadeOutOverlay(inst) {
  if (inst.finished) return Promise.resolve()
  return new Promise(resolve => {
    inst.resolveFade = resolve
    inst.worker
      ? inst.worker.postMessage({ type: MSG.FADE_OUT, durationSec: TV_BACKDROP_FADE_OUT_SEC })
      : TvRender.fadeOut(inst.render, TV_BACKDROP_FADE_OUT_SEC)
    setTimeout(() => finishOverlay(inst), (TV_BACKDROP_FADE_OUT_SEC + TV_FADE_WATCHDOG_PAD_SEC) * 1000)
  })
}

function finishOverlay(inst) {
  if (inst.finished) return
  inst.finished = true
  activeTvIntro === inst && (activeTvIntro = null)
  Sound.stopReadyTvLoaderBackdropHiss()
  Sound.stopReadyTvPowerOnSound()
  inst.canvas.remove()
  inst.worker?.terminate()
  inst.resolveFade?.()
}
//
// A crashed worker must not block boot: show the loader, release the intro
// await and drop the overlay so the game continues without the effect.
//
function abortRenderer(inst) {
  revealLoaderOverSnow(inst)
  inst.resolveIntro()
  finishOverlay(inst)
}
//
// ImageData stores RGBA bytes little-endian, so pack as ABGR.
//
function packSnowColor(hex) {
  const [r, g, b] = parseHex(hex)
  return (255 << 24) | (b << 16) | (g << 8) | r
}
