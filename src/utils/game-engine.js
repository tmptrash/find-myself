import kaplay from "kaplay"
import { CFG } from "../cfg.js"
import { sceneReady } from "../scenes/ready.js"
import { sceneForestHeroFramesPreview } from "../scenes/forest-hero-frames-preview.js"
import { sceneMenu } from "../scenes/menu.js"
import { sceneForestLevel0 } from "../sections/forest/scenes/level0.js"
import { sceneForestComplete } from "../sections/forest/scenes/forest-complete.js"
import { sceneCaveLevel0 } from "../sections/cave/scenes/level0.js"
import { loadHeroSprites, loadHeroPicture } from "../components/hero.js"
import * as TouchInput from "./touch-input.js"
import * as Fullscreen from "./fullscreen.js"
import * as BootLoader from "./boot-loader.js"
import { installLevelFadeIn } from "./transition.js"
import { setFocusCanvas, focusGameCanvas } from "./canvas-focus.js"
import { resetPhysicalInputLayer } from "./helper.js"
import { unlockWaterStepsAudio, unlockEarTreeWhisperAudio } from "./sound.js"

//
// The engine can boot in two resolution modes:
// - FIXED: legacy virtual canvas at CFG.visual.screen (1920x1080), stretched
//   to fit the window via Kaplay's letterbox. Used by forest-complete and the
//   dev hero-frames preview.
// - NATIVE: canvas (and Kaplay's internal coordinate space) matches the real
//   window resolution 1:1 — no internal offscreen buffer, no stretch, so
//   hairline art (the hero's 1px outline) never aliases regardless of the
//   user's monitor. Used by "ready", "menu", Forest and Cave — the whole
//   hub flow shares one engine with no swap between them —
//   whose own layout adapts to whatever width/height that turns out to be.
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
//
// Phones: a native-resolution level keeps 1 world px per CSS px, and a
// phone's window is only ~350-450 CSS px across its short side, which
// changes with the browser bar and fullscreen. On a touch device whose
// window's short side is under SMALL_VIEW_MAX_H, the world is scaled (Kaplay
// `scale`) so that side shows SMALL_VIEW_WORLD_H world px — the window's
// height in landscape, its width held upright — so the hero keeps one size on
// screen with or without fullscreen and in either orientation. The
// canvas buffer gets 1 / scale px per CSS px (`pixelDensity`), so one world
// px is still one buffer px and hairline art stays whole. A window resize
// reboots the engine (window-resize.js), so the choice follows rotation and
// fullscreen.
//
const SMALL_VIEW_MAX_H = 600
//
// A rotating phone can report a near-zero size for a moment; the scale never
// goes below this short side's (the size settles and reboots again).
//
const SMALL_VIEW_MIN_H = 200
const SMALL_VIEW_WORLD_H = 562
//
// A short window (browser bar showing) is wider for its height than the
// fullscreen one, so at the same world height it would show more world across
// and need a wider canvas buffer: about a fifth more pixels to fill and more
// decor to draw, enough to drop a 120 FPS phone to ~70. The world never shows
// more than this many px across; the scale rises instead (the hero ends up
// about as big as in fullscreen, a little less of the level shows above and below).
//
const SMALL_VIEW_MAX_WORLD_W = 1250
//
// Held upright, the screen never shows more world px top to bottom than the
// forest playfield is tall, so the level fills the whole screen (no void
// band over its sky); the hero comes out a little bigger than in landscape.
//
const UPRIGHT_MAX_WORLD_H = CFG.visual.forest.playfieldHeight
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
// A reload loop on repeated context losses gets the site's WebGL blocked by
// the browser (Chrome stops giving it a context until it restarts). Past
// WEBGL_LOST_MAX_RELOADS automatic reloads within WEBGL_LOST_WINDOW_MS the
// page waits for a tap instead (the times live in sessionStorage).
//
const WEBGL_LOST_MAX_RELOADS = 2
const WEBGL_LOST_WINDOW_MS = 60000
const WEBGL_LOST_RELOADS_KEY = 'webglLostReloads'
const WEBGL_LOST_TAP_HINT = 'Graphics stopped responding. Close other tabs, then tap to reload. If it keeps happening, restart the browser.'
const WEBGL_UNAVAILABLE_HINT = 'WebGL is not available right now. Close other tabs or restart the browser, then tap to reload.'
//
// An engine's WebGL context is released explicitly when it is torn down
// (WEBGL_lose_context), RELEASE_DELAY_FRAMES frames later so the stopped
// engine never draws on a lost context — leaving it to the garbage collector
// piles up live contexts on every engine swap (each rotation of a phone)
// until the browser drops them.
//
const RELEASE_DELAY_FRAMES = 2
const glByCanvas = new WeakMap()
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
// antialias:false keeps the canvas without MSAA: native-resolution frames are
// drawn straight onto it (Kaplay patch), and they must look exactly like the
// old non-multisampled offscreen frame and skip the per-frame MSAA resolve.
//
const WEBGL_CONTEXT_OPTS_OVERRIDE = {
  preserveDrawingBuffer: false,
  antialias: false,
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
// setupTasks/soundTasks mostly just queue k.loadSprite/loadSound/loadFont
// calls rather than waiting for the actual network fetch + decode — that
// real work happens later, inside the k.onLoad() flush wait in bootEngine.
// Without this split, the bar would race to 100% almost immediately (the
// queueing loop is fast) and then sit frozen at 100% for the whole real
// loading time, which reads as "hung, then a long pause". Task queueing
// gets this small early share; the k.onLoad flush (tracked live via
// k.loadProgress()) gets the rest, where the real time is actually spent.
//
const TASK_QUEUE_BAR_SHARE = 0.12
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
    BootLoader.showFatalLoaderError(WEBGL_UNAVAILABLE_HINT, { onTap: reloadPage })
    throw err
  }
  TouchInput.initTouchInput(k)
  Fullscreen.createFullscreenButton(k)
  initBlurKeyReset()
  //
  // Focus the canvas on boot so Kaplay onKeyPress works without an extra click.
  // Physical window listeners (bindBackToMenuKeys, etc.) still cover unfocused cases.
  //
  setFocusCanvas(k.canvas ?? null)
  focusGameCanvas()
  installLevelFadeIn(k)
  //
  // Hero frames are cut from a picture sheet — it must be decoded before
  // the setup tasks bake them
  //
  await loadHeroPicture()
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
  // This is normally the slowest part of boot, so poll k.loadProgress() every
  // frame to keep the bar moving with real progress instead of sitting
  // frozen at whatever the task-queueing phase left it at.
  //
  await new Promise(resolve => {
    let loadDone = false
    const pollProgress = () => {
      if (loadDone) return
      updateLoaderBarFromKaplayProgress(k)
      requestAnimationFrame(pollProgress)
    }
    pollProgress()
    k.onLoad(() => {
      if (loadDone) return
      loadDone = true
      updateLoaderBarFromKaplayProgress(k)
      kaplayBootReachedOnLoad = true
      resolve()
    })
  })
  if (k.canvas && !BootLoader.isLoaderVisible()) {
    k.canvas.style.visibility = 'visible'
    focusGameCanvas()
  }
  unlockKaplayAudioOnFirstGesture(k)
  return k
}
//
// Kaplay owns its own internal AudioContext, entirely separate from the
// game's procedural Web Audio API context (see sound.js's resumeGlobalAudio).
// That context boots suspended and only resumes inside a real k.play() call —
// every earlier sound in the game happens to be either procedural or started
// paused (e.g. birds.mp3), so the very first unpaused k.play() (typically
// forest's water_steps.mp3 on the first drowning) can race the async
// AudioContext.resume() and play silently. Firing a silent, immediately
// stopped k.play() inside the user's very first keyboard/pointer gesture on
// the page resumes it synchronously within a trusted gesture handler, well
// before any real sound needs it.
//
function unlockKaplayAudioOnFirstGesture(k) {
  const unlock = () => {
    window.removeEventListener('keydown', unlock)
    window.removeEventListener('pointerdown', unlock)
    window.removeEventListener('touchstart', unlock)
    try {
      const handle = k.play('water-steps', { volume: 0.0001, paused: false })
      handle?.stop?.()
    } catch (error) {
      //
      // Asset not loaded yet on this engine — harmless, later real playback
      // still triggers Kaplay's own internal resume on its own.
      //
    }
    unlockWaterStepsAudio()
    unlockEarTreeWhisperAudio()
  }
  window.addEventListener('keydown', unlock, { once: true })
  window.addEventListener('pointerdown', unlock, { once: true })
  window.addEventListener('touchstart', unlock, { once: true })
}

/**
 * Fully tears down a booted engine: stops Kaplay's game loop, releases GL
 * resources and removes the canvas from the DOM. Safe to call once per
 * engine returned from bootEngine().
 * @param {Object} k - Kaplay instance to destroy
 */
export function teardownEngine(k) {
  if (!k) return
  resetPhysicalInputLayer()
  const canvas = k.canvas
  canvas && detachContextListeners(canvas)
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
  canvas && releaseContextLater(canvas)
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
    const scale = nativeWorldScale()
    return { ...base, letterbox: false, scale, pixelDensity: 1 / scale }
  }
  return {
    ...base,
    width: CFG.visual.screen.width,
    height: CFG.visual.screen.height,
    letterbox: true
  }
}
//
// World px per CSS px for a native-resolution engine (see SMALL_VIEW_MAX_H).
//
function nativeWorldScale() {
  const w = window.innerWidth
  const h = window.innerHeight
  const side = Math.min(w, h)
  if (!TouchInput.isTouchDevice() || side >= SMALL_VIEW_MAX_H) return 1
  const scale = Math.max(Math.max(side, SMALL_VIEW_MIN_H) / SMALL_VIEW_WORLD_H, w / SMALL_VIEW_MAX_WORLD_W)
  return h > w ? Math.max(scale, h / UPRIGHT_MAX_WORLD_H) : scale
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
    if (type !== 'webgl' && type !== 'webgl2' && type !== 'experimental-webgl') return originalGetContext(type, opts)
    const gl = originalGetContext(type, { ...(opts || {}), ...WEBGL_CONTEXT_OPTS_OVERRIDE })
    gl && glByCanvas.set(canvas, gl)
    return gl
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
  if (!noteContextLossReload()) {
    BootLoader.showFatalLoaderError(WEBGL_LOST_TAP_HINT, { onTap: reloadPage })
    return
  }
  const hint = kaplayBootReachedOnLoad
    ? 'Graphics context lost. Reloading…'
    : 'GPU was overloaded while loading assets. Waiting before reload…'
  BootLoader.showFatalLoaderError(hint)
  setTimeout(reloadPage, delayMs)
}
//
// Records one automatic reload for a lost context; false when the recent
// ones already reached WEBGL_LOST_MAX_RELOADS (the page then waits for a tap).
//
function noteContextLossReload() {
  try {
    const now = Date.now()
    const recent = JSON.parse(sessionStorage.getItem(WEBGL_LOST_RELOADS_KEY) || '[]').filter(t => now - t < WEBGL_LOST_WINDOW_MS)
    if (recent.length >= WEBGL_LOST_MAX_RELOADS) return false
    sessionStorage.setItem(WEBGL_LOST_RELOADS_KEY, JSON.stringify([...recent, now]))
    return true
  } catch (_) {
    //
    // No sessionStorage (private mode, blocked site data): reload as before
    //
    return true
  }
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
    () => k.loadFont(CFG.visual.fonts.regularFull.replace(/'/g, ''), "./fonts/JetBrainsMono_Regular.ttf"),
    () => k.loadFont(CFG.visual.fonts.thinFull.replace(/'/g, ''), "./fonts/JetBrainsMono_Thin.ttf"),
    () => k.loadSprite("eye-hud-0", "./eye_0.png"),
    () => k.loadSprite("eye-hud-1", "./eye_1.png"),
    () => k.loadSprite("eye-hud-2", "./eye_2.png"),
    () => loadHeroSprites(k),
    () => sceneReady(k),
    () => sceneForestHeroFramesPreview(k),
    () => sceneMenu(k),
    () => sceneForestLevel0(k),
    () => sceneForestComplete(k),
    () => sceneCaveLevel0(k)
  ]
}
/**
 * Build the list of async sound-load tasks (each returns a Promise).
 * Loaded with limited concurrency to avoid request bursts at boot.
 */
function buildSoundTasks(k) {
  const sounds = [
    ['birds', './sounds/birds.mp3'],
    ['water-steps', './sounds/water_steps.mp3'],
    ['whisper', './sounds/whisper.mp3']
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
  if (totalTasks === 0) return
  const frac = Math.min(1, completedTasks / totalTasks) * TASK_QUEUE_BAR_SHARE
  BootLoader.setLoaderBarPct(Math.round(frac * 100))
}
//
// Increment task counter and refresh the loader bar (used by async batches)
//
function onTaskFinished() {
  completedTasks++
  updateLoaderBar()
}
//
// Reflects Kaplay's own live asset-loading fraction (k.loadProgress(), 0..1)
// into the remaining share of the bar, on top of what the task-queueing
// phase already filled — called every animation frame during the k.onLoad
// flush wait so the bar keeps moving for the real duration of that wait
// instead of sitting frozen.
//
function updateLoaderBarFromKaplayProgress(k) {
  const kaplayFrac = typeof k.loadProgress === 'function' ? k.loadProgress() : 1
  const frac = TASK_QUEUE_BAR_SHARE + (1 - TASK_QUEUE_BAR_SHARE) * Math.min(1, Math.max(0, kaplayFrac))
  BootLoader.setLoaderBarPct(Math.round(frac * 100))
}
/**
 * Remove any leftover canvas elements (used between failed kaplay init attempts
 * so their dead WebGL contexts can be released by the browser).
 */
function removeStaleCanvases() {
  document.querySelectorAll('canvas').forEach(c => {
    detachContextListeners(c)
    c.remove()
    releaseContext(c)
  })
}
function detachContextListeners(canvas) {
  canvas.removeEventListener('webglcontextlost', onWebGLContextLost, false)
  canvas.removeEventListener('webglcontextrestored', onWebGLContextRestored, false)
}
//
// Gives a canvas's WebGL context back to the browser right away.
//
function releaseContext(canvas) {
  const gl = glByCanvas.get(canvas)
  if (!gl) return
  glByCanvas.delete(canvas)
  gl.isContextLost() || gl.getExtension('WEBGL_lose_context')?.loseContext()
}
function releaseContextLater(canvas, frames = RELEASE_DELAY_FRAMES) {
  if (frames <= 0) {
    releaseContext(canvas)
    return
  }
  requestAnimationFrame(() => releaseContextLater(canvas, frames - 1))
}
function reloadPage() {
  location.reload()
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
