import kaplay from "kaplay"
import { CFG } from "./cfg.js"
import { sceneReady } from "./scenes/ready.js"
import { sceneMenu } from "./scenes/menu.js"
import { sceneLevel0 } from "./sections/word/scenes/level0.js"
import { sceneLevel1 } from "./sections/word/scenes/level1.js"
import { sceneLevel2 } from "./sections/word/scenes/level2.js"
import { sceneLevel3 } from "./sections/word/scenes/level3.js"
import { sceneLevel4 } from "./sections/word/scenes/level4.js"
import { sceneWordComplete } from "./sections/word/scenes/word-complete.js"
import { sceneTouchTraining } from "./sections/touch/scenes/training.js"
import { sceneLevel0 as sceneTouchLevel0 } from "./sections/touch/scenes/level0.js"
import { sceneLevel1 as sceneTouchLevel1 } from "./sections/touch/scenes/level1.js"
import { sceneLevel2 as sceneTouchLevel2 } from "./sections/touch/scenes/level2.js"
import { sceneLevel3 as sceneTouchLevel3 } from "./sections/touch/scenes/level3.js"
import { sceneTouchComplete } from "./sections/touch/scenes/touch-complete.js"
import { sceneLevel0 as sceneTimeLevel0 } from "./sections/time/scenes/level0.js"
import { sceneLevel1 as sceneTimeLevel1 } from "./sections/time/scenes/level1.js"
import { sceneLevel2 as sceneTimeLevel2 } from "./sections/time/scenes/level2.js"
import { sceneLevel3 as sceneTimeLevel3 } from "./sections/time/scenes/level3.js"
import { sceneTimeComplete } from "./sections/time/scenes/time-complete.js"
import { loadHeroSprites, HEROES } from "./components/hero.js"
import * as Cursor from "./utils/cursor.js"
import * as TouchInput from "./utils/touch-input.js"
import * as Fullscreen from "./utils/fullscreen.js"
import * as BootLoader from "./utils/boot-loader.js"
import { prepareSceneAssetsThenEnterScene } from "./utils/level-assets.js"
import { generateMenuBackgroundCanvas } from "./utils/menu-bg-generator.js"
//
// Kaplay init: how many times to retry on transient WebGL failure
// (Chrome can transiently fail context creation when the GPU process is busy,
// e.g. right after HMR reload).
//
const KAPLAY_INIT_MAX_ATTEMPTS = 5
const KAPLAY_INIT_RETRY_BASE_MS = 200
const KAPLAY_INIT_RETRY_STEP_MS = 400
//
// Cap concurrent network loads at boot so the browser does not fire 30+ parallel
// mp3/png requests simultaneously. Smaller batches behave better under HMR and
// keep the GPU process responsive while it's acquiring a WebGL context.
//
const ASSET_LOAD_CONCURRENCY = 4
//
// If we reload immediately after context loss the GPU may still be reclaiming VRAM;
// the next kaplay() then fails all retries → fatal "WebGL not available". Longer
// delay during boot when the burst of textures is largest.
//
const WEBGL_LOST_RELOAD_MS_AFTER_BOOT = 6000
const WEBGL_LOST_RELOAD_MS_INGAME = 2500
//
// WebGL context options we force onto Kaplay's canvas. By default Kaplay asks
// for { preserveDrawingBuffer: true } which keeps a persistent GPU backbuffer
// every frame — on heavy scenes this balloons GPU memory and is the most
// common cause of:
//   - context loss (the "sad canvas" / Aw-Snap icon in Chrome)
//   - getContext() returning null on subsequent reloads
// Setting preserveDrawingBuffer:false lets the driver discard the backbuffer
// after each composite, which is the documented WebGL recommendation for
// games and dramatically reduces VRAM pressure.
//
const WEBGL_CONTEXT_OPTS_OVERRIDE = {
  preserveDrawingBuffer: false,
  failIfMajorPerformanceCaveat: false
}
//
// Force dark background for all elements
//
document.documentElement.style.backgroundColor = '#000000'
document.body.style.backgroundColor = '#000000'
//
// Loader progress state (DOM element + counters)
//
let completedTasks = 0
let totalTasks = 0
//
// True until k.onLoad runs — used to pace WebGL loss reload and document cause.
//
let kaplayBootReachedOnLoad = false
//
// Avoid scheduling multiple reloads from rapid duplicate context-loss events.
//
let webglLostReloadScheduled = false
//
// Boot the application (async so we can retry kaplay() and await asset batches)
//
boot()
/**
 * Top-level boot sequence: init kaplay with retry, load core assets + sounds,
 * then prepare lazy level packs on demand (see level-assets.js).
 */
async function boot() {
  let k
  try {
    k = await initKaplayWithRetry()
  } catch (err) {
    BootLoader.showFatalLoaderError('WebGL is not available in this browser. Please reload the page or try a different browser.')
    throw err
  }
  Cursor.init(k)
  TouchInput.initTouchInput(k)
  Fullscreen.createFullscreenButton(k)
  //
  // Core registration only — section-heavy sprites load per level via level-assets helpers
  //
  const setupTasks = buildSetupTasks(k)
  const soundTasks = buildSoundTasks(k)
  totalTasks = setupTasks.length + soundTasks.length
  //
  // Phase 1: synchronous setup work, yielding to the GPU between steps
  //
  for (const task of setupTasks) {
    try {
      task()
    } catch (_) {
      //
      // If any single task fails, continue with the rest
      //
    }
    completedTasks++
    updateLoaderBar()
    await BootLoader.yieldForGpu(BootLoader.DEFAULT_GPU_YIELD_FRAMES)
  }
  //
  // Phase 2: parallel-limited sound loading — actually awaits each network load
  //
  await runWithConcurrency(soundTasks, ASSET_LOAD_CONCURRENCY, onTaskFinished)
  //
  // Core assets queued — flush Kaplay loader, then preload hub pack + enter ready.
  // The guard prevents k.onLoad from re-firing when later loadSprite calls complete.
  //
  let bootOnLoadDone = false
  k.onLoad(async () => {
    if (bootOnLoadDone) return
    bootOnLoadDone = true
    kaplayBootReachedOnLoad = true
    await prepareSceneAssetsThenEnterScene(k, 'ready');
  })
}
/**
 * Repeatedly try to initialize kaplay until WebGL succeeds or attempts run out.
 * Stale canvases from failed attempts are removed so their contexts can be released.
 * Each attempt builds a fresh canvas with our patched getContext (so the WebGL
 * options override is applied) and a webglcontextlost listener for crash recovery.
 */
async function initKaplayWithRetry() {
  let lastError
  for (let attempt = 0; attempt < KAPLAY_INIT_MAX_ATTEMPTS; attempt++) {
    const canvas = createPatchedCanvas()
    //
    // Kaplay sets fixedSize only when width+height are set AND letterbox is off.
    // With letterbox:true it reads canvas.parentElement.offsetWidth/Height.
    // A user-supplied canvas is never appendChild'd by Kaplay, so parentElement
    // stays null and kaplay.ts crashes on offsetWidth.
    //
    document.body.appendChild(canvas)
    try {
      return kaplay({
        width: CFG.visual.screen.width,
        height: CFG.visual.screen.height,
        font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
        letterbox: true,
        background: [0, 0, 0],
        canvas
      })
    } catch (err) {
      lastError = err
      removeStaleCanvases()
      //
      // Wait progressively longer between attempts so the GPU process can settle
      //
      await new Promise(r => setTimeout(r, KAPLAY_INIT_RETRY_BASE_MS + attempt * KAPLAY_INIT_RETRY_STEP_MS))
    }
  }
  throw lastError ?? new Error('Kaplay init failed: WebGL not available')
}
/**
 * Create a canvas whose getContext("webgl"|"webgl2") merges in our safer
 * WEBGL_CONTEXT_OPTS_OVERRIDE on top of whatever Kaplay requests. Also wires
 * up webglcontextlost/restored handlers — without preventDefault() on lost
 * the browser refuses to ever fire restored, leaving the canvas frozen.
 * On a real loss we just reload the page (cheap, and the only reliable way
 * to rebuild Kaplay's GL state from scratch).
 */
function createPatchedCanvas() {
  const canvas = document.createElement('canvas')
  const originalGetContext = canvas.getContext.bind(canvas)
  canvas.getContext = function patchedGetContext(type, opts) {
    if (type === 'webgl' || type === 'webgl2' || type === 'experimental-webgl') {
      opts = { ...(opts || {}), ...WEBGL_CONTEXT_OPTS_OVERRIDE }
    }
    return originalGetContext(type, opts)
  }
  //
  // Recover from GPU process crash / driver reset. Calling preventDefault()
  // is required by spec for the browser to attempt restoration.
  //
  canvas.addEventListener('webglcontextlost', onWebGLContextLost, false)
  canvas.addEventListener('webglcontextrestored', onWebGLContextRestored, false)
  return canvas
}
//
// WebGL context loss handler: prevent default + reload to fully reinit Kaplay
//
function onWebGLContextLost(e) {
  e.preventDefault()
  if (webglLostReloadScheduled) return
  webglLostReloadScheduled = true
  //
  // Integrated GPUs can lose the context under load; reloading too soon leaves
  // VRAM pinned → initKaplayWithRetry fails → misleading "WebGL not available".
  //
  const delayMs = kaplayBootReachedOnLoad ? WEBGL_LOST_RELOAD_MS_INGAME : WEBGL_LOST_RELOAD_MS_AFTER_BOOT
  const hint = kaplayBootReachedOnLoad
    ? 'Graphics context lost. Reloading…'
    : 'GPU was overloaded while loading assets. Waiting before reload…'
  BootLoader.showFatalLoaderError(hint)
  setTimeout(() => location.reload(), delayMs)
}
//
// WebGL context restored: in our flow we always reload on loss, so this is
// kept as a no-op stub for completeness (browsers expect both listeners).
//
function onWebGLContextRestored() {}
/**
 * Build the list of synchronous setup tasks (fonts, minimal sprites, scene registration).
 */
function buildSetupTasks(k) {
  return [
    () => k.loadFont(CFG.visual.fonts.regularFull.replace(/'/g, ''), "./fonts/JetBrainsMono-Regular.ttf"),
    () => k.loadFont(CFG.visual.fonts.thinFull.replace(/'/g, ''), "./fonts/JetBrainsMono-Thin.ttf"),
    () => k.loadSprite("life", "./life.png"),
    () => k.loadSprite("life-ready", "./life-ready.png"),
    () => k.loadSprite("menu-bg", generateMenuBackgroundCanvas()),
    () => loadHeroSprites(k, HEROES.HERO),
    () => loadHeroSprites(k, HEROES.ANTIHERO),
    () => sceneReady(k),
    () => sceneMenu(k),
    () => sceneLevel0(k),
    () => sceneLevel1(k),
    () => sceneLevel2(k),
    () => sceneLevel3(k),
    () => sceneLevel4(k),
    () => sceneWordComplete(k),
    () => sceneTouchTraining(k),
    () => sceneTouchLevel0(k),
    () => sceneTouchLevel1(k),
    () => sceneTouchLevel2(k),
    () => sceneTouchLevel3(k),
    () => sceneTouchComplete(k),
    () => sceneTimeLevel0(k),
    () => sceneTimeLevel1(k),
    () => sceneTimeLevel2(k),
    () => sceneTimeLevel3(k),
    () => sceneTimeComplete(k)
  ]
}
/**
 * Build the list of async sound-load tasks (each returns a Promise).
 * Loaded with limited concurrency to avoid request bursts at boot.
 */
function buildSoundTasks(k) {
  const sounds = [
    ['time', './sounds/time.mp3'],
    ['time0', './sounds/time0.mp3'],
    ['time0-pre', './sounds/time0-pre.mp3'],
    ['time0-kids', './sounds/time0-kids.mp3'],
    ['time1-pre', './sounds/time1-pre.mp3'],
    ['time2-pre', './sounds/time2-pre.mp3'],
    ['time3-pre', './sounds/time3-pre.mp3'],
    ['word', './sounds/word.mp3'],
    ['breath', './sounds/breath.mp3'],
    ['word0-pre', './sounds/word0-pre.mp3'],
    ['word1-pre', './sounds/word1-pre.mp3'],
    ['word2-pre', './sounds/word2-pre.mp3'],
    ['word3-pre', './sounds/word3-pre.mp3'],
    ['word4-pre', './sounds/word4-pre.mp3'],
    ['menu', './sounds/menu.mp3'],
    ['kids', './sounds/kids.mp3'],
    ['clock', './sounds/clock.mp3'],
    ['touch', './sounds/touch.mp3'],
    ['touch0-pre', './sounds/touch0-pre.mp3'],
    ['touch1-pre', './sounds/touch1-pre.mp3'],
    ['touch2-pre', './sounds/touch2-pre.mp3'],
    ['touch3-pre', './sounds/touch3-pre.mp3'],
    ['crow0', './sounds/crow0.mp3'],
    ['life', './sounds/life.mp3'],
    ['boss', './sounds/boss.mp3'],
    ['water', './sounds/water.mp3']
  ]
  return sounds.map(([name, path]) => () => k.loadSound(name, path))
}
/**
 * Run a list of async task factories with a fixed concurrency limit.
 * Each task is a function returning a Promise. onDone is called after each task.
 */
async function runWithConcurrency(tasks, limit, onDone) {
  let cursor = 0
  async function worker() {
    while (cursor < tasks.length) {
      const idx = cursor++
      try {
        await tasks[idx]()
      } catch (_) {
        //
        // Individual asset failures must not block the rest of the boot
        //
      }
      onDone?.()
    }
  }
  const workers = []
  for (let i = 0; i < Math.min(limit, tasks.length); i++) {
    workers.push(worker())
  }
  await Promise.all(workers)
}
/**
 * Update the loader progress bar based on completed task count.
 */
function updateLoaderBar() {
  const loaderBar = document.getElementById('loader-bar')
  if (!loaderBar || totalTasks === 0) return
  const pct = Math.min(100, Math.round((completedTasks / totalTasks) * 100))
  loaderBar.style.width = `${pct}%`
}
//
// Increment task counter and refresh the loader bar (used by async batches)
//
function onTaskFinished() {
  completedTasks++
  updateLoaderBar()
}
/**
 * Remove any leftover canvas elements (used between failed kaplay init attempts
 * so their dead WebGL contexts can be released by the browser).
 */
function removeStaleCanvases() {
  const stale = document.querySelectorAll('canvas')
  stale.forEach(c => c.remove())
}
