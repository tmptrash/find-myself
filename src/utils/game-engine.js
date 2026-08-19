import kaplay from "kaplay"
import { CFG } from "../cfg.js"
import { sceneReady } from "../scenes/ready.js"
import { sceneMenu } from "../scenes/menu.js"
import { sceneLesson0 } from "../sections/word/scenes/lesson0.js"
import { sceneLesson1 } from "../sections/word/scenes/lesson1.js"
import { sceneLesson2 } from "../sections/word/scenes/lesson2.js"
import { sceneLesson3 } from "../sections/word/scenes/lesson3.js"
import { sceneLesson4 } from "../sections/word/scenes/lesson4.js"
import { sceneWordComplete } from "../sections/word/scenes/word-complete.js"
import { sceneGlowLevel0 } from "../sections/glow/scenes/level0.js"
import { sceneGlowComplete } from "../sections/glow/scenes/glow-complete.js"
import { sceneLesson0 as sceneTouchLevel0 } from "../sections/touch/scenes/lesson0.js"
import { sceneLesson1 as sceneTouchLevel1 } from "../sections/touch/scenes/lesson1.js"
import { sceneLesson2 as sceneTouchLevel2 } from "../sections/touch/scenes/lesson2.js"
import { sceneLesson3 as sceneTouchLevel3 } from "../sections/touch/scenes/lesson3.js"
import { sceneTouchComplete } from "../sections/touch/scenes/touch-complete.js"
import { sceneLesson0 as sceneTimeLevel0 } from "../sections/time/scenes/lesson0.js"
import { sceneLesson1 as sceneTimeLevel1 } from "../sections/time/scenes/lesson1.js"
import { sceneLesson2 as sceneTimeLevel2 } from "../sections/time/scenes/lesson2.js"
import { sceneLesson3 as sceneTimeLevel3 } from "../sections/time/scenes/lesson3.js"
import { sceneTimeComplete } from "../sections/time/scenes/time-complete.js"
import { loadHeroSprites, HEROES } from "../components/hero.js"
import { prepareDesaturatedLifeSprite } from "../sections/touch/components/lesson-indicator.js"
import * as Cursor from "./cursor.js"
import * as TouchInput from "./touch-input.js"
import * as Fullscreen from "./fullscreen.js"
import * as BootLoader from "./boot-loader.js"
import { installLevelFadeIn } from "./transition.js"

//
// The engine can boot in two resolution modes:
// - FIXED: legacy virtual canvas at CFG.visual.screen (1920x1080), stretched
//   to fit the window via Kaplay's letterbox. Used by every scene except Glow.
// - NATIVE: canvas (and Kaplay's internal coordinate space) matches the real
//   window resolution 1:1 — no internal offscreen buffer, no stretch, so
//   hairline art (the hero's 1px outline) never aliases regardless of the
//   user's monitor. Used only by the Glow level, whose own layout adapts to
//   whatever width/height that turns out to be (see level0.js).
//
export const RESOLUTION_MODE = {
  FIXED: 'fixed',
  NATIVE: 'native'
}
//
// Kaplay init: how many times to retry on transient WebGL failure
// (Chrome can transiently fail context creation when the GPU process is busy,
// e.g. right after HMR reload, or right after tearing down a previous engine).
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
// Kaplay key names mapped to DOM KeyboardEvent { key, code } pairs.
// All keys used across the game — used to dispatch synthetic keyup
// events when the window loses focus so Kaplay's internal "held" state
// is cleared. Without this, switching browser tabs leaves keys stuck
// as "pressed" and onKeyPress never fires when the user presses them
// again after returning to the tab.
//
const RESET_KEY_EVENTS = [
  { key: ' ',          code: 'Space'       },
  { key: 'Enter',      code: 'Enter'       },
  { key: 'Escape',     code: 'Escape'      },
  { key: 'ArrowLeft',  code: 'ArrowLeft'   },
  { key: 'ArrowRight', code: 'ArrowRight'  },
  { key: 'ArrowUp',    code: 'ArrowUp'     },
  { key: 'ArrowDown',  code: 'ArrowDown'   },
  { key: 'a',          code: 'KeyA'        },
  { key: 'd',          code: 'KeyD'        },
  { key: 'w',          code: 'KeyW'        }
]
//
// Loader progress state (DOM element + counters) — reset on every bootEngine() call.
//
let completedTasks = 0
let totalTasks = 0
//
// True once any engine has finished its first full load — used to pace WebGL
// loss reload (a loss right after boot needs a longer VRAM-settle delay).
//
let kaplayBootReachedOnLoad = false
//
// Avoid scheduling multiple reloads from rapid duplicate context-loss events.
//
let webglLostReloadScheduled = false
//
// initBlurKeyReset() listens on `window`, independent of any specific Kaplay
// instance — only ever needs to be installed once per page life.
//
let blurKeyResetInstalled = false
//
// The canvas + context-loss listeners belonging to the currently live engine,
// tracked so teardownEngine() can unregister them before removing the canvas.
//
let activeCanvas = null

/**
 * Boots a fresh Kaplay engine in the given resolution mode: creates the
 * canvas, retries on transient WebGL failure, wires up global input/cursor/
 * fullscreen helpers, registers every scene and loads every core asset
 * (fonts, hero sprites, sounds), then resolves once Kaplay's own loader
 * confirms everything is ready.
 * @param {string} resolutionMode - One of RESOLUTION_MODE
 * @returns {Promise<Object>} The new Kaplay instance
 */
export async function bootEngine(resolutionMode) {
  completedTasks = 0
  totalTasks = 0
  let k
  try {
    k = await initKaplayWithRetry(resolutionMode)
  } catch (err) {
    BootLoader.showFatalLoaderError('WebGL is not available in this browser. Please reload the page or try a different browser.')
    throw err
  }
  Cursor.init(k)
  TouchInput.initTouchInput(k)
  Fullscreen.createFullscreenButton(k)
  initBlurKeyReset()
  installLevelFadeIn(k)
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
  // Core assets queued — wait for Kaplay's own loader to flush before handing
  // the instance back (guards against a scene reading a still-loading sprite).
  //
  await new Promise(resolve => {
    let loadDone = false
    k.onLoad(() => {
      if (loadDone) return
      loadDone = true
      kaplayBootReachedOnLoad = true
      resolve()
    })
  })
  await prepareDesaturatedLifeSprite(k)
  k.canvas && !BootLoader.isLoaderVisible() && (k.canvas.style.visibility = 'visible')
  return k
}

/**
 * Fully tears down a booted engine: stops Kaplay's game loop, releases GL
 * resources and removes the canvas from the DOM. Safe to call once per
 * engine returned from bootEngine().
 * @param {Object} k - Kaplay instance to destroy
 */
export function teardownEngine(k) {
  if (!k) return
  const canvas = k.canvas
  if (canvas) {
    canvas.removeEventListener('webglcontextlost', onWebGLContextLost, false)
    canvas.removeEventListener('webglcontextrestored', onWebGLContextRestored, false)
  }
  //
  // k.quit() unbinds GL state, destroys the renderer and removes the canvas
  // itself, but only on the next "frameEnd" event — remove it from the DOM
  // right away too so a stale frame never overlaps the freshly booted canvas.
  //
  try {
    k.quit?.()
  } catch (_) {
    //
    // Already-torn-down or crashed engines can throw here — nothing to do
    //
  }
  canvas?.remove()
  activeCanvas === canvas && (activeCanvas = null)
  webglLostReloadScheduled = false
}
/**
 * Repeatedly try to initialize kaplay until WebGL succeeds or attempts run out.
 * Stale canvases from failed attempts are removed so their dead contexts can
 * be released. Each attempt builds a fresh canvas with our patched getContext
 * (so the WebGL options override is applied) and a webglcontextlost listener
 * for crash recovery.
 * @param {string} resolutionMode - One of RESOLUTION_MODE
 */
async function initKaplayWithRetry(resolutionMode) {
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
    canvas.style.visibility = 'hidden'
    try {
      const k = kaplay(buildKaplayOpts(resolutionMode, canvas))
      activeCanvas = canvas
      return k
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
 * Builds the kaplay() init options for the given resolution mode.
 * FIXED keeps the legacy 1920x1080 virtual canvas, letterboxed to fit the
 * window. NATIVE omits width/height entirely so the canvas — and every
 * k.width()/k.height() read afterwards — matches the real window resolution
 * with no internal stretch. `letterbox` is only valid together with an
 * explicit width/height (Kaplay throws otherwise), so it is disabled in
 * NATIVE mode; there is nothing to pillarbox once there is no fixed aspect.
 * @param {string} resolutionMode - One of RESOLUTION_MODE
 * @param {HTMLCanvasElement} canvas
 */
function buildKaplayOpts(resolutionMode, canvas) {
  const base = {
    font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
    crisp: true,
    background: [0, 0, 0],
    loadingScreen: false,
    canvas
  }
  if (resolutionMode === RESOLUTION_MODE.NATIVE) {
    return { ...base, letterbox: false }
  }
  return {
    ...base,
    width: CFG.visual.screen.width,
    height: CFG.visual.screen.height,
    letterbox: true
  }
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
// WebGL context loss handler: prevent default + reload to fully reinit the app.
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
 * Build the list of synchronous setup tasks (fonts, minimal sprites, scene
 * registration). Identical for every resolution mode so both engines can
 * reach any scene — only the canvas/coordinate configuration differs.
 */
function buildSetupTasks(k) {
  return [
    () => k.loadFont(CFG.visual.fonts.regularFull.replace(/'/g, ''), "./fonts/JetBrainsMono-Regular.ttf"),
    () => k.loadFont(CFG.visual.fonts.thinFull.replace(/'/g, ''), "./fonts/JetBrainsMono-Thin.ttf"),
    () => k.loadSprite("life", "./life.png"),
    () => k.loadSprite("life-ready", "./life-ready.png"),
    () => loadHeroSprites(k, HEROES.HERO),
    () => loadHeroSprites(k, HEROES.ANTIHERO),
    () => sceneReady(k),
    () => sceneMenu(k),
    () => sceneLesson0(k),
    () => sceneLesson1(k),
    () => sceneLesson2(k),
    () => sceneLesson3(k),
    () => sceneLesson4(k),
    () => sceneWordComplete(k),
    () => sceneGlowLevel0(k),
    () => sceneGlowComplete(k),
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
    ['glow-g', './sounds/glow-g.mp3'],
    ['glow-l', './sounds/glow-l.mp3'],
    ['glow-ow', './sounds/glow-ow.mp3'],
    ['touch', './sounds/touch.mp3'],
    ['touch0-t', './sounds/touch0-t.mp3'],
    ['touch0-o', './sounds/touch0-o.mp3'],
    ['touch0-u', './sounds/touch0-u.mp3'],
    ['touch0-ch', './sounds/touch0-ch.mp3'],
    ['touch1-t', './sounds/touch1-t.mp3'],
    ['touch1-o', './sounds/touch1-o.mp3'],
    ['touch1-u', './sounds/touch1-u.mp3'],
    ['touch1-ch', './sounds/touch1-ch.mp3'],
    ['touch1-end', './sounds/touch1-end.mp3'],
    ['touch2-t', './sounds/touch2-t.mp3'],
    ['touch2-o', './sounds/touch2-o.mp3'],
    ['touch2-u', './sounds/touch2-u.mp3'],
    ['touch2-c', './sounds/touch2-c.mp3'],
    ['touch2-h', './sounds/touch2-h.mp3'],
    ['touch0-pre', './sounds/touch0-pre.mp3'],
    ['touch3-pre', './sounds/touch3-pre.mp3'],
    ['crow0', './sounds/crow0.mp3'],
    ['frog', './sounds/frog.mp3'],
    ['life', './sounds/life.mp3'],
    ['boss', './sounds/boss.mp3'],
    ['water', './sounds/water.mp3'],
    ['water-steps', './sounds/water-steps.mp3'],
    ['birds', './sounds/birds.mp3']
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
/**
 * Register a one-time window blur listener that dispatches synthetic keyup
 * events for every game key. When the user switches browser tabs the browser
 * fires blur but never fires keyup for held keys, leaving Kaplay's internal
 * key-state map with keys stuck as "pressed". onKeyPress only triggers on the
 * not-pressed → pressed transition, so the next real press is silently ignored.
 * Dispatching keyup on blur forces Kaplay to clear those states so input works
 * correctly after the user returns to the tab. Installed once per page life —
 * it listens on `window`, independent of any specific Kaplay instance.
 */
function initBlurKeyReset() {
  if (blurKeyResetInstalled) return
  blurKeyResetInstalled = true
  window.addEventListener('blur', onWindowBlur)
}
//
// Synthetic keyup burst sent to window on each blur so Kaplay resets
// its "held" flags for every key the player could have been pressing.
//
function onWindowBlur() {
  RESET_KEY_EVENTS.forEach(({ key, code }) =>
    window.dispatchEvent(new KeyboardEvent('keyup', { key, code, bubbles: true }))
  )
}
