import * as Tooltip from './tooltip.js'
//
// Timed hero hints in the shared white speech bubble (same bubble the touch
// lesson 0 tooltips use). Hints appear at the hero's position when shown,
// stay anchored there, fade in/out, and can be chained into a queue. Walking
// ~30 px away in any direction (Euclidean), or jumping, dismisses early.
//
const HINT_FADE_IN = 0.35
const HINT_FADE_OUT = 0.6
const HINT_OFFSET_Y = -60
//
// How far the hero may walk from the hint's spawn point before it clears
//
const HINT_DISMISS_DISTANCE = 30

/**
 * Creates a hero hint controller bound to one hero instance.
 * @param {Object} cfg - Configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.heroInst - Hero inst whose position anchors the bubble
 * @returns {Object} Hero hint inst
 */
export function create(cfg) {
  const { k, heroInst } = cfg
  const inst = {
    k,
    heroInst,
    tooltip: null,
    target: null,
    timer: 0,
    duration: 0,
    queue: [],
    onQueueEmpty: null,
    //
    // World position of the hero when the current hint started — used to
    // dismiss the bubble if he walks away.
    //
    spawnX: 0,
    spawnY: 0,
    //
    // When true, only the hint timer (or an explicit clear) ends the bubble
    //
    ignoreMovementDismiss: false,
    //
    // When true, the bubble tracks the hero each frame (e.g. drowning)
    //
    followHero: false,
    //
    // Seconds to wait before showing the next queued hint (optional per item).
    //
    queuePauseRemaining: 0
  }
  k.onUpdate(() => onUpdate(inst))
  return inst
}

/**
 * Returns true while a hint bubble is on screen or more hints are queued.
 * @param {Object} inst - Hero hint inst
 * @returns {boolean} Whether a hint is currently active
 */
export function isActive(inst) {
  return Boolean(inst && (inst.tooltip || inst.queue.length || inst.queuePauseRemaining > 0))
}

/**
 * Shows a single hint immediately, dropping any queued ones.
 * @param {Object} inst - Hero hint inst
 * @param {string} text - Hint text (supports \n for multiline)
 * @param {number} duration - Total on-screen time in seconds
 * @param {Object} [opts] - Show options
 * @param {boolean} [opts.ignoreMovementDismiss=false] - Keep bubble until timer ends
 * @param {boolean} [opts.followHero=false] - Track the hero position every frame
 * @param {number} [opts.anchorX] - Optional world X override for the bubble
 * @param {number} [opts.anchorY] - Optional world Y override for the bubble
 * @param {number} [opts.dismissDistance] - Walk-away dismiss radius in px (default 30)
 * @param {boolean} [opts.dismissOnJump=true] - Dismiss when the hero jumps
 */
export function show(inst, text, duration, opts = {}) {
  inst.queue = []
  inst.onQueueEmpty = null
  inst.ignoreMovementDismiss = Boolean(opts.ignoreMovementDismiss)
  inst.followHero = Boolean(opts.followHero)
  inst.dismissDistance = opts.dismissDistance ?? HINT_DISMISS_DISTANCE
  inst.dismissOnJump = opts.dismissOnJump !== false
  inst.anchorOverride = (opts.anchorX != null && opts.anchorY != null)
    ? { x: opts.anchorX, y: opts.anchorY }
    : null
  startHint(inst, text, duration)
}

/**
 * Starts a chain of hints — the first shows immediately, the rest follow.
 * @param {Object} inst - Hero hint inst
 * @param {Array<{text: string, duration: number, pauseBefore?: number}>} hints - Hints to chain
 * @param {Function} [onComplete] - Called once the whole chain has finished
 */
export function queue(inst, hints, onComplete = null) {
  const list = [...hints]
  const first = list.shift()
  inst.queue = list
  inst.onQueueEmpty = onComplete
  inst.ignoreMovementDismiss = false
  inst.dismissDistance = HINT_DISMISS_DISTANCE
  inst.dismissOnJump = true
  first && startQueuedHint(inst, first)
}

/**
 * Hides the current hint and empties the queue (no completion callback).
 * @param {Object} inst - Hero hint inst
 */
export function clear(inst) {
  inst.queue = []
  inst.onQueueEmpty = null
  inst.queuePauseRemaining = 0
  inst.ignoreMovementDismiss = false
  inst.followHero = false
  inst.dismissDistance = HINT_DISMISS_DISTANCE
  inst.dismissOnJump = true
  destroyHint(inst)
}
function applyQueueItemOpts(inst, item = {}) {
  inst.ignoreMovementDismiss = Boolean(item.ignoreMovementDismiss)
  inst.followHero = Boolean(item.followHero)
  inst.dismissDistance = item.dismissDistance ?? HINT_DISMISS_DISTANCE
  inst.dismissOnJump = item.dismissOnJump !== false
}
//
// Starts a queued hint and applies its per-item options.
//
function startQueuedHint(inst, item) {
  applyQueueItemOpts(inst, item)
  startHint(inst, item.text, item.duration)
}
//
// Creates the forced-visible tooltip bubble for a new hint text.
//
function startHint(inst, text, duration) {
  destroyHint(inst)
  const { k, heroInst } = inst
  inst.timer = 0
  inst.duration = duration
  inst.dismissDistance = inst.dismissDistance ?? HINT_DISMISS_DISTANCE
  inst.dismissOnJump = inst.dismissOnJump !== false
  const hx = inst.anchorOverride?.x ?? heroInst.character?.pos?.x ?? 0
  const hy = inst.anchorOverride?.y ?? heroInst.character?.pos?.y ?? 0
  inst.spawnX = hx
  inst.spawnY = hy
  inst.anchorOverride = null
  //
  // Anchor at the spawn world position — the bubble must stay where it
  // appeared so walking away reads clearly before the 30 px dismiss.
  // followHero mode re-reads the hero each frame instead.
  //
  inst.target = {
    x: () => inst.followHero
      ? (inst.heroInst.character?.pos?.x ?? inst.spawnX)
      : inst.spawnX,
    y: () => inst.followHero
      ? (inst.heroInst.character?.pos?.y ?? inst.spawnY)
      : inst.spawnY,
    width: 1,
    height: 1,
    text,
    offsetY: HINT_OFFSET_Y
  }
  inst.tooltip = Tooltip.create({ k, targets: [inst.target], forceVisible: true })
  inst.tooltip.activeTarget = inst.target
  syncBubblePosition(inst)
  inst.tooltip.opacity = 0
}
//
// Removes the active bubble.
//
function destroyHint(inst) {
  inst.tooltip && Tooltip.destroy(inst.tooltip)
  inst.tooltip = null
  inst.target = null
}
//
// Clears the current hint (and any queued ones), then fires the queue-empty
// callback so intro locks / follow-up logic still unlock.
//
function dismissEarly(inst) {
  const done = inst.onQueueEmpty
  inst.queue = []
  inst.onQueueEmpty = null
  inst.queuePauseRemaining = 0
  destroyHint(inst)
  done?.()
}
//
// True when the hero has jumped or walked far from the hint spawn point.
//
function shouldDismissByMovement(inst) {
  const hero = inst.heroInst
  const ch = hero?.character
  if (!ch?.pos) return false
  //
  // Replay / goal reminders stay until Space/Esc or the timer expires
  //
  if (inst.ignoreMovementDismiss) return false
  //
  // Intro / dialog locks freeze the hero — spawn settle must not wipe hints
  //
  if (hero.controlsDisabled || !hero.controllable) return false
  //
  // Only a real jump (crouch→launch) dismisses — brief unground flicker /
  // spawn plant used to clear intro bubbles before they were readable.
  //
  const jumping = inst.dismissOnJump !== false && (
    hero.isSquashing ||
    hero.jumpPhase === 'jumping' ||
    hero.jumpPhase === 'squashing'
  )
  if (jumping) return true
  const dx = ch.pos.x - inst.spawnX
  const dy = ch.pos.y - inst.spawnY
  //
  // Euclidean distance so a diagonal walk also clears the bubble
  //
  const dist = inst.dismissDistance ?? HINT_DISMISS_DISTANCE
  return Math.hypot(dx, dy) >= dist
}
//
// Advances the fade-in / hold / fade-out envelope and chains queued hints
// when the current one expires. The bubble stays at spawn (not on the hero).
//
function onUpdate(inst) {
  if (!inst.tooltip) {
    if (inst.queuePauseRemaining > 0) {
      inst.queuePauseRemaining -= inst.k.dt()
      if (inst.queuePauseRemaining <= 0) {
        inst.queuePauseRemaining = 0
        const next = inst.queue.shift()
        next && startQueuedHint(inst, next)
      }
    }
    return
  }
  if (shouldDismissByMovement(inst)) {
    dismissEarly(inst)
    return
  }
  inst.timer += inst.k.dt()
  if (inst.timer >= inst.duration) {
    destroyHint(inst)
    const next = inst.queue[0]
    if (next) {
      const pause = next.pauseBefore ?? 0
      if (pause > 0) {
        inst.queuePauseRemaining = pause
        return
      }
      inst.queue.shift()
      startQueuedHint(inst, next)
      return
    }
    const done = inst.onQueueEmpty
    inst.onQueueEmpty = null
    done?.()
    return
  }
  syncBubblePosition(inst)
  const fadeOutStart = inst.duration - HINT_FADE_OUT
  inst.tooltip.opacity = inst.timer < HINT_FADE_IN
    ? inst.timer / HINT_FADE_IN
    : (inst.timer > fadeOutStart ? Math.max(0, (inst.duration - inst.timer) / HINT_FADE_OUT) : 1)
}
//
// Keeps the frozen bubble anchor on the spawn point.
//
function syncBubblePosition(inst) {
  if (!inst.tooltip || !inst.target) return
  const k = inst.k
  const wx = inst.target.x()
  const wy = inst.target.y()
  const cam = k.camPos()
  const halfW = k.width() / 2
  const halfH = k.height() / 2
  inst.tooltip.frozenX = Math.round(wx - cam.x + halfW)
  inst.tooltip.frozenY = Math.round(wy - cam.y + halfH)
}
