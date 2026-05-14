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
import { loadSprites as loadBladeSprites } from "./sections/word/components/blades.js"
import * as CityBackground from "./sections/time/components/city-background.js"
import * as Cursor from "./utils/cursor.js"
//
// Kaplay init: how many times to retry on transient WebGL failure
// (Chrome can transiently fail context creation when the GPU process is busy,
// e.g. right after HMR reload).
//
const KAPLAY_INIT_MAX_ATTEMPTS = 5
const KAPLAY_INIT_RETRY_BASE_MS = 100
const KAPLAY_INIT_RETRY_STEP_MS = 250
//
// Cap concurrent network loads at boot so the browser does not fire 30+ parallel
// mp3/png requests simultaneously. Smaller batches behave better under HMR and
// keep the GPU process responsive while it's acquiring a WebGL context.
//
const ASSET_LOAD_CONCURRENCY = 4
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
const loaderEl = document.getElementById('loader')
const loaderBar = document.getElementById('loader-bar')
let completedTasks = 0
let totalTasks = 0
//
// Boot the application (async so we can retry kaplay() and await asset batches)
//
boot()
/**
 * Top-level boot sequence: init kaplay with retry, then load all assets in batches.
 */
async function boot() {
  let k
  try {
    k = await initKaplayWithRetry()
  } catch (err) {
    showFatalLoaderError('WebGL is not available in this browser. Please reload the page or try a different browser.')
    throw err
  }
  Cursor.init(k)
  //
  // Asset registration tasks (sprites, fonts, scenes) — synchronous setup work
  //
  const setupTasks = buildSetupTasks(k)
  //
  // Sound files — loaded in concurrency-limited batches to avoid burst requests
  //
  const soundTasks = buildSoundTasks(k)
  totalTasks = setupTasks.length + soundTasks.length
  //
  // Phase 1: synchronous setup work, yielding to the renderer between steps
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
    await yieldToRenderer()
  }
  //
  // Phase 2: parallel-limited sound loading — actually awaits each network load
  //
  await runWithConcurrency(soundTasks, ASSET_LOAD_CONCURRENCY, onTaskFinished)
  //
  // All work queued — wait for kaplay's internal load promise to flush
  //
  k.onLoad(() => {
    hideLoader()
    k.go("ready")
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
  showFatalLoaderError('Graphics context lost. Reloading...')
  setTimeout(() => location.reload(), 500)
}
//
// WebGL context restored: in our flow we always reload on loss, so this is
// kept as a no-op stub for completeness (browsers expect both listeners).
//
function onWebGLContextRestored() {}
/**
 * Build the list of synchronous setup tasks (sprites, fonts, backgrounds, scenes).
 */
function buildSetupTasks(k) {
  return [
    //
    // Fonts
    //
    () => k.loadFont(CFG.visual.fonts.regularFull.replace(/'/g, ''), "./fonts/JetBrainsMono-Regular.ttf"),
    () => k.loadFont(CFG.visual.fonts.thinFull.replace(/'/g, ''), "./fonts/JetBrainsMono-Thin.ttf"),
    //
    // Sprites
    //
    () => k.loadSprite("life", "./life.png"),
    () => k.loadSprite("menu-bg", "./menu.png"),
    //
    // Hero and blade sprites
    //
    () => loadHeroSprites(k, HEROES.HERO),
    () => loadHeroSprites(k, HEROES.ANTIHERO),
    () => loadBladeSprites(k),
    //
    // City background preloads (CPU-intensive canvas rendering)
    //
    () => {
      const PLATFORM_BOTTOM_HEIGHT_LEVEL0 = 250
      CityBackground.preloadCityBackground(k, PLATFORM_BOTTOM_HEIGHT_LEVEL0, 'city-background', false, false, true, 2.0, true)
    },
    () => {
      const PLATFORM_BOTTOM_HEIGHT_LEVEL1 = 150
      CityBackground.preloadCityBackground(k, PLATFORM_BOTTOM_HEIGHT_LEVEL1, 'city-background-level1', false, false, true, 2.0, true)
    },
    () => {
      const PLATFORM_BOTTOM_HEIGHT_LEVEL2 = 150
      CityBackground.preloadCityBackground(k, PLATFORM_BOTTOM_HEIGHT_LEVEL2, 'city-background-level2', false, true, true, 0.4, true)
    },
    () => {
      const LOWER_CORRIDOR_Y_LEVEL3 = 680
      const CORRIDOR_HEIGHT_LEVEL3 = 180
      const groundLineLevel3 = k.height() - (LOWER_CORRIDOR_Y_LEVEL3 + CORRIDOR_HEIGHT_LEVEL3)
      CityBackground.preloadCityBackground(k, groundLineLevel3, 'city-background-level3', false, true, false)
    },
    //
    // Scene registration (each scene may do internal setup)
    //
    () => sceneReady(k),
    () => sceneMenu(k),
    () => sceneLevel0(k),
    () => sceneLevel1(k),
    () => sceneLevel2(k),
    () => sceneLevel3(k),
    () => sceneLevel4(k),
    () => sceneWordComplete(k),
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
    //
    // Audio: time section
    //
    ['time', './sounds/time.mp3'],
    ['time0', './sounds/time0.mp3'],
    ['time0-pre', './sounds/time0-pre.mp3'],
    ['time0-kids', './sounds/time0-kids.mp3'],
    ['time1-pre', './sounds/time1-pre.mp3'],
    ['time2-pre', './sounds/time2-pre.mp3'],
    ['time3-pre', './sounds/time3-pre.mp3'],
    //
    // Audio: word section
    //
    ['word', './sounds/word.mp3'],
    ['breath', './sounds/breath.mp3'],
    ['word0-pre', './sounds/word0-pre.mp3'],
    ['word1-pre', './sounds/word1-pre.mp3'],
    ['word2-pre', './sounds/word2-pre.mp3'],
    ['word3-pre', './sounds/word3-pre.mp3'],
    ['word4-pre', './sounds/word4-pre.mp3'],
    //
    // Audio: menu and touch section
    //
    ['menu', './sounds/menu.mp3'],
    ['kids', './sounds/kids.mp3'],
    ['clock', './sounds/clock.mp3'],
    ['touch', './sounds/touch.mp3'],
    ['touch0-pre', './sounds/touch0-pre.mp3'],
    ['touch1-pre', './sounds/touch1-pre.mp3'],
    ['touch2-pre', './sounds/touch2-pre.mp3'],
    ['touch3-pre', './sounds/touch3-pre.mp3'],
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
//
// Yield control to the browser so the progress bar can repaint between steps
//
function yieldToRenderer() {
  return new Promise(r => setTimeout(r, 0))
}
//
// Hide the boot loader after all assets are ready
//
function hideLoader() {
  if (!loaderEl) return
  loaderEl.style.display = 'none'
}
/**
 * Remove any leftover canvas elements (used between failed kaplay init attempts
 * so their dead WebGL contexts can be released by the browser).
 */
function removeStaleCanvases() {
  const stale = document.querySelectorAll('canvas')
  stale.forEach(c => c.remove())
}
/**
 * Replace the loader bar with a human-readable error message.
 */
function showFatalLoaderError(message) {
  if (!loaderEl) return
  loaderEl.innerHTML = `<div style="color:#fff;font-family:monospace;text-align:center;padding:24px">${message}</div>`
}
