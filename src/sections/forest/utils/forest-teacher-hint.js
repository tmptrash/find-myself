import * as HeroHint from '../../../utils/hero-hint.js'
//
// Weighted seconds before a context teacher hint may fire (movement = 1:1,
// standing still = 0.5:1 until idle exceeds FOREST_TEACHER_IDLE_CAP_SEC).
//
export const FOREST_TEACHER_HINT_MOVE_SEC = 10
export const FOREST_TEACHER_HINT_DURATION = 5
const FOREST_TEACHER_IDLE_RATE = 0.5
const FOREST_TEACHER_IDLE_CAP_SEC = 5
const FOREST_TEACHER_HINT_OFFSET_Y = 68
const FOREST_TEACHER_HINT_DISMISS_DISTANCE = 9999
//
// Initializes teacher-hint queue state on the forest level inst.
//
export function initForestTeacherHintState(inst) {
  inst.teacherHintQueue = []
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
  inst._forestTeacherWasInCave = false
  inst._forestTeacherHintActive = false
  inst.lastForestTeacherHintText = null
}
/**
 * Advances the shared context timer and invokes the cave hint callback at 10 s.
 * @param {Object} inst - Forest level inst
 * @param {Object} cfg
 * @param {number} cfg.dt - Frame delta
 * @param {boolean} cfg.blocked - Pause accumulation (intro, dialog, etc.)
 * @param {boolean} cfg.heroMoving - Locomotion from scene
 * @param {boolean} cfg.heroActive - Run/jump/air from hero state
 * @param {boolean} cfg.inCave - Hero inside pit cave
 * @param {boolean} cfg.caveEligible - Cave mushroom hint may run
 * @param {Function} [cfg.onCaveHint] - Called when cave context hits the gate
 */
export function tickForestTeacherContextHints(inst, cfg) {
  if (!inst || cfg.blocked) return
  if (!inst.levelIndicator?.lifeRevealed) return
  if (HeroHint.isActive(inst.heroHint) && inst._forestTeacherHintActive) return
  const inCave = Boolean(cfg.inCave)
  if (inCave && !inst._forestTeacherWasInCave) {
    inst.teacherContextAccum = 0
    inst.teacherIdleStreak = 0
    const pit = inst.pit
    if (pit && !pit.pitCaveMushroomDone) {
      pit.pitCaveMushroomHintPausedUntilExit = false
      pit.pitCaveMushroomHintShows = 0
    }
  }
  inst._forestTeacherWasInCave = inCave
  const accumulating = inCave && Boolean(cfg.caveEligible)
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
    inst.teacherIdleStreak <= FOREST_TEACHER_IDLE_CAP_SEC &&
      (inst.teacherContextAccum = (inst.teacherContextAccum || 0) + dt * FOREST_TEACHER_IDLE_RATE)
  }
  if ((inst.teacherContextAccum || 0) < FOREST_TEACHER_HINT_MOVE_SEC) return
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
  cfg.onCaveHint?.()
}
//
// Shows a teacher hint immediately (bypasses the queue).
//
export function showForestTeacherHintNow(inst, text, duration = FOREST_TEACHER_HINT_DURATION, opts = {}) {
  if (!text || !inst) return false
  const forceTeacherHint = Boolean(opts.pitCaveMushroom)
  if (inst._inForestPitCave && !opts.pitCaveMushroom) return false
  if (HeroHint.isActive(inst.heroHint) && !inst._forestTeacherHintActive) {
    if (!forceTeacherHint) return false
    HeroHint.clear(inst.heroHint)
  }
  if (forceTeacherHint && HeroHint.isActive(inst.heroHint) && inst._forestTeacherHintActive) {
    HeroHint.clear(inst.heroHint)
    inst._forestTeacherHintActive = false
  }
  const shown = showForestTeacherHint(inst, text, duration, opts)
  shown && (inst.teacherContextAccum = 0)
  return shown
}
//
// Called when the life HUD first appears so context gating restarts cleanly.
//
export function onForestTeacherLifeHudRevealed(inst) {
  if (!inst) return
  inst.teacherContextAccum = 0
  inst.teacherIdleStreak = 0
}
//
// Screen anchor for the life (teacher) HUD icon.
//
export function forestTeacherHudAnchor(inst) {
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
function showForestTeacherHint(inst, text, duration, opts = {}) {
  const anchor = forestTeacherHudAnchor(inst)
  if (!anchor || !inst.levelIndicator?.lifeRevealed) {
    if (opts.pitCaveMushroom) return false
    return false
  }
  inst._forestTeacherHintActive = true
  inst.lastForestTeacherHintText = text
  HeroHint.show(inst.heroHint, text, duration, {
    anchorX: anchor.x,
    anchorY: anchor.y,
    anchorScreenSpace: true,
    offsetY: opts.offsetY ?? FOREST_TEACHER_HINT_OFFSET_Y,
    forceBelow: true,
    ignoreMovementDismiss: true,
    dismissDistance: FOREST_TEACHER_HINT_DISMISS_DISTANCE,
    dismissOnJump: false,
    ...opts
  })
  return true
}
