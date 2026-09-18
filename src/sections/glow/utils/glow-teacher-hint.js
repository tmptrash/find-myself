import * as HeroHint from '../../../utils/hero-hint.js'
//
// Seconds of hero movement (standing still does not count) before the next
// queued teacher hint may appear.
//
export const GLOW_TEACHER_HINT_MOVE_SEC = 10
export const GLOW_TEACHER_HINT_DURATION = 5
const GLOW_TEACHER_HINT_OFFSET_Y = 52
const GLOW_TEACHER_HINT_DISMISS_DISTANCE = 9999
//
// Initializes teacher-hint queue state on the glow level inst.
//
export function initGlowTeacherHintState(inst) {
  inst.teacherHintQueue = []
  inst.teacherMoveAccum = 0
  inst._glowTeacherHintActive = false
  inst.lastGlowTeacherHintText = null
}
//
// Enqueues a life-icon hint; shown after enough movement and when the bubble is free.
//
export function queueGlowTeacherHint(inst, text, duration = GLOW_TEACHER_HINT_DURATION, opts = {}) {
  if (!text || !inst) return
  if (inst._inGlowPitCave && !opts.pitCaveMushroom) return
  inst.teacherHintQueue = inst.teacherHintQueue || []
  inst.teacherHintQueue.push({ text, duration, opts })
}
//
// Running, jumping, or air drift counts toward the movement gate.
//
export function tickGlowTeacherHintMovement(inst, heroMoving, dt, blocked = false, heroActive = false) {
  if (!inst?.heroHint || blocked) return
  if (!inst.levelIndicator?.lifeRevealed) return
  if (HeroHint.isActive(inst.heroHint)) {
    !inst._glowTeacherHintActive && (inst._glowTeacherHintActive = false)
    return
  }
  inst._glowTeacherHintActive = false
  if (inst._inGlowPitCave) return
  if (heroMoving || heroActive) {
    inst.teacherMoveAccum = (inst.teacherMoveAccum || 0) + dt
  }
  if ((inst.teacherMoveAccum || 0) < GLOW_TEACHER_HINT_MOVE_SEC) return
  tryDequeueGlowTeacherHint(inst)
}
//
// Shows a teacher hint immediately (bypasses the queue).
//
export function showGlowTeacherHintNow(inst, text, duration = GLOW_TEACHER_HINT_DURATION, opts = {}) {
  if (!text || !inst) return false
  const forceTeacherHint = opts.pitCaveMushroom || opts.gHudStall
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
  shown && (inst.teacherMoveAccum = 0)
  return shown
}
//
// Called when the life HUD first appears so movement gating restarts cleanly.
//
export function onGlowTeacherLifeHudRevealed(inst) {
  if (!inst) return
  inst.teacherMoveAccum = 0
  if (inst._inGlowPitCave) return
  tryDequeueGlowTeacherHint(inst)
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
// Pops one queued hint onto the life icon when the movement gate is open.
//
function tryDequeueGlowTeacherHint(inst) {
  if (!inst?.levelIndicator?.lifeRevealed) return
  if (inst._inGlowPitCave) return
  if (HeroHint.isActive(inst.heroHint)) return
  const q = inst.teacherHintQueue
  if (!q?.length) return
  const next = q.shift()
  showGlowTeacherHint(inst, next.text, next.duration, next.opts)
  inst.teacherMoveAccum = 0
}
//
// Shows a hint anchored below the life (teacher) HUD icon.
//
function showGlowTeacherHint(inst, text, duration, opts = {}) {
  const anchor = glowTeacherHudAnchor(inst)
  if (!anchor || !inst.levelIndicator?.lifeRevealed) {
    if (opts.pitCaveMushroom) return false
    queueGlowTeacherHint(inst, text, duration, opts)
    return true
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
