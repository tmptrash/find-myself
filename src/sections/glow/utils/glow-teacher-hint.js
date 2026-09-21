import * as HeroHint from '../../../utils/hero-hint.js'
//
// Weighted seconds before a context teacher hint may fire (movement = 1:1,
// standing still = 0.5:1 until idle exceeds GLOW_TEACHER_IDLE_CAP_SEC).
//
export const GLOW_TEACHER_HINT_MOVE_SEC = 10
export const GLOW_TEACHER_HINT_DURATION = 5
const GLOW_TEACHER_IDLE_RATE = 0.5
const GLOW_TEACHER_IDLE_CAP_SEC = 5
const GLOW_TEACHER_HINT_OFFSET_Y = 52
const GLOW_TEACHER_HINT_DISMISS_DISTANCE = 9999
//
// Initializes teacher-hint queue state on the glow level inst.
//
export function initGlowTeacherHintState(inst) {
  inst.teacherHintQueue = []
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
  inst._glowTeacherWasInCave = false
  inst._glowTeacherHintActive = false
  inst.lastGlowTeacherHintText = null
  inst._postLStopHintShows = 0
  inst._postOBigMushHintShows = 0
}
/**
 * Advances the shared context timer and invokes onCaveHint / onGHint at 10 s.
 * @param {Object} inst - Glow level inst
 * @param {Object} cfg
 * @param {number} cfg.dt - Frame delta
 * @param {boolean} cfg.blocked - Pause accumulation (intro, dialog, etc.)
 * @param {boolean} cfg.heroMoving - Locomotion from scene
 * @param {boolean} cfg.heroActive - Run/jump/air from hero state
 * @param {boolean} cfg.inCave - Hero inside pit cave
 * @param {boolean} cfg.caveEligible - Cave mushroom hint may run
 * @param {boolean} cfg.gEligible - G-zone progress hint may run (outside cave)
 * @param {boolean} cfg.lEligible - L-zone progress hint may run (outside cave)
 * @param {boolean} cfg.postLStopEligible - Post-L stillness nudge (outside cave)
 * @param {boolean} cfg.postOBigMushEligible - Post-O big-mushroom nudge (outside cave)
 * @param {Function} [cfg.onCaveHint] - Called when cave context hits the gate
 * @param {Function} [cfg.onGHint] - Called when G-zone context hits the gate
 * @param {Function} [cfg.onLHint] - Called when L-zone context hits the gate
 * @param {Function} [cfg.onPostLStopHint] - After L pickup, 10 s active movement
 * @param {Function} [cfg.onPostOBigMushHint] - After O pickup, 10 s active movement
 */
export function tickGlowTeacherContextHints(inst, cfg) {
  if (!inst || cfg.blocked) return
  if (!inst.levelIndicator?.lifeRevealed) return
  if (HeroHint.isActive(inst.heroHint) && inst._glowTeacherHintActive) return
  const inCave = Boolean(cfg.inCave)
  if (inCave && !inst._glowTeacherWasInCave) {
    inst.teacherContextAccum = 0
    inst.teacherIdleStreak = 0
    const pit = inst.pit
    if (pit && !pit.pitCaveMushroomDone) {
      pit.pitCaveMushroomHintPausedUntilExit = false
      pit.pitCaveMushroomHintShows = 0
    }
  }
  inst._glowTeacherWasInCave = inCave
  const accumulating = inCave
    ? Boolean(cfg.caveEligible)
    : Boolean(cfg.gEligible || cfg.lEligible || cfg.postLStopEligible || cfg.postOBigMushEligible)
  if (!accumulating) {
    if (!inCave) {
      inst.teacherContextAccum = 0
      inst.teacherIdleStreak = 0
    }
    return
  }
  const moving = Boolean(cfg.heroMoving || cfg.heroActive)
  const dt = cfg.dt || 0
  if (moving) {
    inst.teacherIdleStreak = 0
    inst.teacherContextAccum = (inst.teacherContextAccum || 0) + dt
  } else {
    inst.teacherIdleStreak = (inst.teacherIdleStreak || 0) + dt
    inst.teacherIdleStreak <= GLOW_TEACHER_IDLE_CAP_SEC &&
      (inst.teacherContextAccum = (inst.teacherContextAccum || 0) + dt * GLOW_TEACHER_IDLE_RATE)
  }
  if ((inst.teacherContextAccum || 0) < GLOW_TEACHER_HINT_MOVE_SEC) return
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
  if (inCave) {
    cfg.onCaveHint?.()
    return
  }
  cfg.postOBigMushEligible
    ? cfg.onPostOBigMushHint?.()
    : cfg.postLStopEligible
      ? cfg.onPostLStopHint?.()
      : cfg.lEligible
        ? cfg.onLHint?.()
        : cfg.onGHint?.()
}
//
// Shows a teacher hint immediately (bypasses the queue).
//
export function showGlowTeacherHintNow(inst, text, duration = GLOW_TEACHER_HINT_DURATION, opts = {}) {
  if (!text || !inst) return false
  const forceTeacherHint = opts.pitCaveMushroom || opts.gHudStall || opts.lHudStall ||
    opts.postLStop || opts.postOBigMush
  if (inst._inGlowPitCave && !opts.pitCaveMushroom) return false
  if (HeroHint.isActive(inst.heroHint) && !inst._glowTeacherHintActive) {
    if (!forceTeacherHint) return false
    HeroHint.clear(inst.heroHint)
  }
  if (forceTeacherHint && HeroHint.isActive(inst.heroHint) && inst._glowTeacherHintActive) {
    HeroHint.clear(inst.heroHint)
    inst._glowTeacherHintActive = false
  }
  const shown = showGlowTeacherHint(inst, text, duration, opts)
  shown && (inst.teacherContextAccum = 0)
  return shown
}
//
// Called when the life HUD first appears so context gating restarts cleanly.
//
export function onGlowTeacherLifeHudRevealed(inst) {
  if (!inst) return
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
}
//
// Screen anchor for the life (teacher) HUD icon.
//
export function glowTeacherHudAnchor(inst) {
  const life = inst.levelIndicator?.lifeImage
  const sprite = life?.sprite
  if (!sprite?.exists?.()) return null
  const pos = life?.pos
  return {
    x: pos?.x ?? sprite.pos.x,
    y: pos?.y ?? sprite.pos.y
  }
}
//
// Shows a hint anchored below the life (teacher) HUD icon.
//
function showGlowTeacherHint(inst, text, duration, opts = {}) {
  const anchor = glowTeacherHudAnchor(inst)
  if (!anchor || !inst.levelIndicator?.lifeRevealed) {
    if (opts.pitCaveMushroom) return false
    return false
  }
  inst._glowTeacherHintActive = true
  inst.lastGlowTeacherHintText = text
  HeroHint.show(inst.heroHint, text, duration, {
    anchorX: anchor.x,
    anchorY: anchor.y,
    anchorScreenSpace: true,
    offsetY: opts.offsetY ?? GLOW_TEACHER_HINT_OFFSET_Y,
    forceBelow: true,
    ignoreMovementDismiss: true,
    dismissDistance: GLOW_TEACHER_HINT_DISMISS_DISTANCE,
    dismissOnJump: false,
    ...opts
  })
  return true
}
