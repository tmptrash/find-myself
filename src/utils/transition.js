import { CFG } from '../cfg.js'
import { parseHex, onPhysicalKeyPress, resetPhysicalInputLayer } from './helper.js'
import { set, normalizeSceneName } from './progress.js'
import * as Sound from './sound.js'
import * as TouchControls from './touch-controls.js'
import * as Hero from '../components/hero.js'
import { goAfterPreparingAssets, goToMenuAfterAssets, prepareSceneAssets, enterPreparedScene, bumpPrepareCancelNonce, onEngineResolutionSwapped } from './lesson-assets.js'
import * as CanvasBackdrop from './canvas-backdrop.js'
import * as BootLoader from './boot-loader.js'
import {
  prewarmForestLevel0HeavyAssets,
  setForestLevel0BootstrapReporter
} from '../sections/forest/scenes/level0.js'
import { ensureEngineForScene, getActiveEngine } from './engine-switch.js'
import { focusGameCanvas } from './canvas-focus.js'

/**
 * Level transition configuration - maps current level to next level
 */
const LEVEL_TRANSITIONS = {
  'menu-forest': 'lesson-forest.0',
  'menu-cave': 'lesson-cave.0',
  'lesson-forest.0': 'lesson-cave.0',
  'lesson-cave.0': 'menu',
  'forest-complete': 'menu'
}
//
// The opaque overlay draws above every scene object while the next level
// loads behind it.
//
const TRANSITION_OVERLAY_Z = CFG.visual.zIndex.ui + 2600
const BLACK_PAUSE_DURATION = 0.5     // Black screen hold before the level loads
const FADE_TO_BLACK_DURATION = 0.8   // Fade overlay to black from a non-level scene
const ESCAPE_ARM_DELAY = 0.3         // Esc only escapes to the menu after this long
const FOREST_PRELEVEL_SCENE = 'lesson-forest.0'
const FOREST_PREWARM_BAR_START = 5
const FOREST_PREWARM_BAR_END = 38
const FOREST_BOOTSTRAP_BAR_START = FOREST_PREWARM_BAR_END
const FOREST_BOOTSTRAP_BAR_END = 100
//
// Loader bar steps while the forest's pack, engine swap and heavy bakes run.
//
const FOREST_LOAD_PACK_PCT = 5
const FOREST_LOAD_PACKED_PCT = 12
const FOREST_LOAD_ENGINE_PCT = 18
const FOREST_LOAD_ENGINE_READY_PCT = 28
const FOREST_LOAD_PREWARM_LEAD_PCT = 7
const SCENE_FADE_IN_DURATION = 0.5   // Duration of fade-in overlay when entering new scene

/**
 * Show the pre-level transition, then navigate to the saved level.
 * Called when the player resumes from the menu with a saved game.
 * Looks up which "menu-to-section" key produces targetLevel and replays
 * the transition from there.
 * @param {Object} k - Kaplay instance
 * @param {string} targetLevel - Target level to go to (e.g., 'lesson-forest.0')
 */
export function showTransitionToLevel(k, targetLevel) {
  targetLevel = normalizeSceneName(targetLevel)
  if (!targetLevel) {
    goToMenuAfterAssets(k)
    return
  }
  //
  // Find the key whose transition chain starts at targetLevel.
  // E.g. if targetLevel is 'lesson-forest.0', previousLevel is 'menu-forest'.
  //
  const previousLevel = getPreviousLevel(targetLevel)
  if (previousLevel) {
    createLevelTransition(k, previousLevel)
  } else {
    goAfterPreparingAssets(k, targetLevel)
  }
}
/**
 * Fades to black and loads the next level behind an opaque overlay:
 * 1. Prepare the next level's assets (forest: pack, engine swap, heavy bakes)
 * 2. Fade to black (0.8s) unless the overlay starts opaque
 * 3. Black screen pause (0.5s)
 * 4. Load new level
 *
 * Esc during the transition goes back to the menu instead.
 *
 * @param {Object} k - Kaplay instance
 * @param {string} currentLevel - Current level name (e.g., 'lesson-forest.0' or 'menu-forest')
 * @param {Function} onComplete - Callback when there is no next level
 */
export function createLevelTransition(k, currentLevel, onComplete) {
  const nextLevel = LEVEL_TRANSITIONS[currentLevel] || null
  let transitionK = k
  if (!nextLevel) {
    onComplete?.()
    return
  }
  //
  // Menu-hero jump handlers live on window, not on the Kaplay instance — they
  // survive k.go unless cleared here before the transition registers its own.
  //
  resetPhysicalInputLayer()
  //
  // Mute procedural sounds and suspend AudioContext to silence all active oscillators
  //
  Sound.muteProceduralSounds()
  Sound.suspendGlobalAudio()
  //
  // Suppress any active hero idle vocalization (visual notes + whistle) until
  // the next scene starts or the transition is escaped.
  //
  Hero.suppressIdleVocalization()
  const originalVolume = k.volume()
  k.volume(0)
  //
  // Save progress for next level immediately (before the transition), so it
  // is saved even if the player interrupts it with Esc. Plain menu entries
  // are not lessons and save nothing.
  //
  const isLessonScene = (s) => s.startsWith('level-') || s.startsWith('lesson-')
  const isLevelToLevelTransition = isLessonScene(currentLevel) && isLessonScene(nextLevel)
  const isMenuToLevelTransition = currentLevel.startsWith('menu') && isLessonScene(nextLevel)
  if (isLevelToLevelTransition || isMenuToLevelTransition) {
    set('lastLesson', nextLevel)
  }
  let timer = 0
  //
  // From a level, the menu or a menu-section entry the overlay starts opaque
  // (no slow fade): the transition opens on the black pause.
  //
  const isFromLevel = currentLevel !== 'menu' && isLessonScene(currentLevel)
  const isFromMenuSection = currentLevel === 'menu-forest' || currentLevel === 'menu-cave'
  const startsOpaque = currentLevel === 'menu' || isFromLevel || isFromMenuSection
  const postAssetPreparePhase = startsOpaque ? 'black_pause' : 'fade_to_black'
  const needsEarlyAssetLoad = isLessonScene(nextLevel)
  const isForestPrelevel = needsEarlyAssetLoad && nextLevel === FOREST_PRELEVEL_SCENE
  let phase = needsEarlyAssetLoad ? 'asset_prepare' : postAssetPreparePhase
  if (isForestPrelevel) {
    BootLoader.showLoader()
    BootLoader.setLoaderBarPct(0)
  }
  const inst = {
    skipped: false,
    skipEnabled: false,
    skipEnableTimer: 0,
    originalVolume,
    postAssetPreparePhase,
    assetPrepareDone: !needsEarlyAssetLoad,
    assetPreparePromise: null,
    entered: false,
    skipInputCancels: []
  }
  //
  // The touch run/jump buttons hide for the whole transition; the next level
  // scene re-creates them.
  //
  TouchControls.setVisible(false)
  //
  // From a level or a menu-section entry the backdrop takes the menu colour
  // too, so Kaplay's clear colour and the CSS letterbox bars match.
  //
  const transitionBgHex = CFG.visual.colors.menu.platformColor
  const [bgR, bgG, bgB] = parseHex(transitionBgHex)
  if (isFromLevel || isFromMenuSection) {
    CanvasBackdrop.applyCanvasBackdrop(transitionK, transitionBgHex)
  }
  let overlay = transitionK.add([
    transitionK.rect(transitionK.width(), transitionK.height()),
    transitionK.pos(0, 0),
    transitionK.color(bgR, bgG, bgB),
    k.opacity(startsOpaque ? 1 : 0),
    k.z(TRANSITION_OVERLAY_Z),
    k.fixed()
  ])
  transitionK._transitionOverlay = overlay
  let transitionInterval = null
  const endTransitionInput = (k) => {
    transitionInterval?.cancel?.()
    transitionInterval = null
    cancelTransitionSkipInput(inst)
    resetPhysicalInputLayer()
    if (k.transitionCleanup) {
      const cleanup = k.transitionCleanup
      k.transitionCleanup = null
      cleanup()
      return
    }
    overlay?.exists?.() && k.destroy(overlay)
    k._transitionOverlay === overlay && (k._transitionOverlay = null)
  }
  const escapeToMenu = () => {
    if (inst.skipped) return
    if (phase !== 'asset_prepare' && !inst.skipEnabled) return
    inst.skipped = true
    bumpPrepareCancelNonce()
    endTransitionInput(transitionK)
    isForestPrelevel && BootLoader.hideLoader()
    transitionK.volume(inst.originalVolume)
    Sound.unmuteProceduralSounds()
    Sound.resumeGlobalAudio()
    Hero.unsuppressIdleVocalization()
    goToMenuAfterAssets(transitionK)
  }
  const bindTransitionEngine = (liveK) => {
    transitionInterval?.cancel?.()
    cancelTransitionSkipInput(inst)
    transitionInterval = liveK.onUpdate(updateTransition)
    installTransitionEscapeInput(liveK, inst, escapeToMenu)
    liveK.transitionCleanup = () => {
      transitionInterval.cancel()
      cancelTransitionSkipInput(inst)
      overlay.exists() && liveK.destroy(overlay)
      if (liveK._transitionOverlay === overlay) liveK._transitionOverlay = null
      liveK.transitionCleanup = null
    }
  }
  if (isForestPrelevel) {
    inst.assetPreparePromise = prepareForestPrelevelAssets()
  } else if (needsEarlyAssetLoad) {
    inst.assetPreparePromise = prepareSceneAssets(transitionK, nextLevel).then(() => {
      inst.assetPrepareDone = true
    })
  }
  async function prepareForestPrelevelAssets() {
    const reportLoad = (pct) => BootLoader.setLoaderBarPct(pct)
    try {
      reportLoad(FOREST_LOAD_PACK_PCT)
      await prepareSceneAssets(transitionK, nextLevel, { retainLoader: true, deferLoaderReveal: true })
      if (inst.skipped) return
      reportLoad(FOREST_LOAD_PACKED_PCT)
      await BootLoader.yieldForGpu(1)
      if (inst.skipped) return
      transitionInterval?.cancel?.()
      transitionInterval = null
      overlay.exists() && transitionK.destroy(overlay)
      transitionK._transitionOverlay = null
      reportLoad(FOREST_LOAD_ENGINE_PCT)
      await ensureEngineForScene(nextLevel, { loaderDuringBoot: true })
      if (inst.skipped) return
      reportLoad(FOREST_LOAD_ENGINE_READY_PCT)
      await BootLoader.yieldForGpu(1)
      if (inst.skipped) return
      onEngineResolutionSwapped()
      transitionK = getActiveEngine()
      CanvasBackdrop.applyCanvasBackdrop(transitionK, transitionBgHex)
      overlay = transitionK.add([
        transitionK.rect(transitionK.width(), transitionK.height()),
        transitionK.pos(0, 0),
        transitionK.color(bgR, bgG, bgB),
        transitionK.opacity(1),
        transitionK.z(TRANSITION_OVERLAY_Z),
        transitionK.fixed()
      ])
      transitionK._transitionOverlay = overlay
      setForestLevel0BootstrapReporter(reportLoad, {
        start: FOREST_BOOTSTRAP_BAR_START,
        end: FOREST_BOOTSTRAP_BAR_END
      })
      reportLoad(FOREST_PREWARM_BAR_START + FOREST_LOAD_PREWARM_LEAD_PCT)
      await prewarmForestLevel0HeavyAssets(transitionK, bakedPct => {
        const t = Math.min(100, Math.max(0, bakedPct)) / 100
        reportLoad(FOREST_PREWARM_BAR_START + Math.round(
          (FOREST_PREWARM_BAR_END - FOREST_PREWARM_BAR_START) * t
        ))
      })
      reportLoad(FOREST_PREWARM_BAR_END)
    } finally {
      !inst.skipped && (inst.assetPrepareDone = true)
    }
  }
  const finalizeTransitionToLevel = () => {
    const enter = async () => {
      if (inst.entered) return
      inst.entered = true
      cancelTransitionSkipInput(inst)
      transitionInterval?.cancel?.()
      transitionInterval = null
      Hero.unsuppressIdleVocalization()
      TouchControls.setVisible(true)
      transitionK.volume(inst.originalVolume)
      Sound.unmuteProceduralSounds()
      Sound.resumeGlobalAudio()
      needsEarlyAssetLoad && BootLoader.showLoader()
      !isForestPrelevel && needsEarlyAssetLoad && BootLoader.setLoaderBarPct(100)
      try {
        await enterPreparedScene(transitionK, nextLevel, () => {
          isForestPrelevel && BootLoader.setLoaderBarPct(100)
          overlay?.exists?.() && transitionK.destroy(overlay)
          transitionK._transitionOverlay === overlay && (transitionK._transitionOverlay = null)
          BootLoader.hideLoader()
        })
      } finally {
        resetPhysicalInputLayer()
      }
    }
    if (needsEarlyAssetLoad && inst.assetPreparePromise && !inst.assetPrepareDone) {
      inst.assetPreparePromise.then(enter)
      return
    }
    enter()
  }
  const updateTransition = () => {
    const k = transitionK
    if (!inst.skipEnabled) {
      inst.skipEnableTimer += k.dt()
      inst.skipEnableTimer >= ESCAPE_ARM_DELAY && (inst.skipEnabled = true)
    }
    if (phase === 'asset_prepare') {
      if (!inst.assetPrepareDone) return
      BootLoader.hideLoader()
      phase = inst.postAssetPreparePhase
      timer = 0
      return
    }
    timer += k.dt()
    if (phase === 'fade_to_black') {
      const progress = Math.min(timer / FADE_TO_BLACK_DURATION, 1)
      overlay.opacity = progress
      if (progress < 1) return
      phase = 'black_pause'
      timer = 0
      return
    }
    if (timer < BLACK_PAUSE_DURATION) return
    transitionInterval?.cancel?.()
    BootLoader.hideLoader()
    //
    // Go to next level — fade-in comes from installLevelFadeIn(k.go).
    //
    finalizeTransitionToLevel()
  }
  const ensureTransitionEngineBound = () => {
    if (inst.skipped) return
    transitionInterval?.cancel?.()
    transitionInterval = null
    transitionK = getActiveEngine()
    bindTransitionEngine(transitionK)
  }
  if (isForestPrelevel) {
    const forestPrepare = inst.assetPreparePromise
    inst.assetPreparePromise = forestPrepare?.finally?.(() => {
      ensureTransitionEngineBound()
    }) ?? Promise.resolve().then(ensureTransitionEngineBound)
  } else {
    bindTransitionEngine(transitionK)
  }
}

/**
 * Creates an opaque overlay in the NEW scene that fades out, preventing
 * a visual flash when k.go() destroys the old scene's transition overlay.
 * Must be called immediately after k.go() while still in the same call stack.
 * @param {Object} k - Kaplay instance
 * @param {number} [r=0] - Red component of overlay color
 * @param {number} [g=0] - Green component of overlay color
 * @param {number} [b=0] - Blue component of overlay color
 */
function createSceneFadeIn(k, r = 0, g = 0, b = 0) {
  const fadeOverlay = k.add([
    k.rect(k.width(), k.height()),
    k.pos(0, 0),
    k.color(r, g, b),
    k.opacity(1),
    k.z(CFG.visual.zIndex.ui + 100),
    k.fixed()
  ])
  let fadeTimer = 0
  fadeOverlay.onUpdate(() => {
    fadeTimer += k.dt()
    const progress = Math.min(fadeTimer / SCENE_FADE_IN_DURATION, 1)
    fadeOverlay.opacity = 1 - progress
    if (progress >= 1 && fadeOverlay.exists()) {
      k.destroy(fadeOverlay)
    }
  })
}
//
// True for playable section levels (and section-complete screens).
//
function isLevelSceneName(name) {
  return typeof name === 'string' && (
    name.startsWith('lesson-') ||
    name.startsWith('level-') ||
    name.endsWith('-complete')
  )
}
/**
 * Wraps k.go so every level entry (transitions, death reloads, menu picks)
 * starts with a short fade-in. Safe to call once after Kaplay init.
 * @param {Object} k - Kaplay instance
 */
export function installLevelFadeIn(k) {
  if (!k || k._levelFadeInInstalled) return
  k._levelFadeInInstalled = true
  const originalGo = k.go.bind(k)
  k.go = (name, ...args) => {
    originalGo(name, ...args)
    focusGameCanvas()
    isLevelSceneName(name) && createSceneFadeIn(k, 0, 0, 0)
  }
}
//
// Reverse lookup: find the key that maps to targetLevel in LEVEL_TRANSITIONS.
// Returns the previous level name or null if not found.
//
function getPreviousLevel(targetLevel) {
  for (const [key, value] of Object.entries(LEVEL_TRANSITIONS)) {
    if (value === targetLevel) return key
  }
  return null
}
//
// Drops every skip-input listener registered for one transition run.
//
function cancelTransitionSkipInput(inst) {
  inst?.skipInputCancels?.forEach(c => c.cancel?.())
  inst && (inst.skipInputCancels = [])
}
//
// Esc back to the menu — rebound on every engine swap (Forest pre-level
// reboots Kaplay mid-transition). The physical key listener sits on window
// so it keeps working even when the canvas never received focus; Kaplay
// onKeyPress is kept as a backup on the live instance.
//
function installTransitionEscapeInput(k, inst, onEscape) {
  cancelTransitionSkipInput(inst)
  inst.skipInputCancels.push(onPhysicalKeyPress('Escape', onEscape))
  inst.skipInputCancels.push(k.onKeyPress('escape', onEscape))
}
