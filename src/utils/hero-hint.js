import * as Tooltip from './tooltip.js'
//
// Timed hero hints in the shared white speech bubble (same bubble the touch
// lesson 0 tooltips use). Hints follow the hero, fade in, hold for their
// duration, fade out, and can be chained into a queue.
//
const HINT_FADE_IN = 0.35
const HINT_FADE_OUT = 0.6
const HINT_OFFSET_Y = -60

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
    onQueueEmpty: null
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
  return Boolean(inst && (inst.tooltip || inst.queue.length))
}

/**
 * Shows a single hint immediately, dropping any queued ones.
 * @param {Object} inst - Hero hint inst
 * @param {string} text - Hint text (supports \n for multiline)
 * @param {number} duration - Total on-screen time in seconds
 */
export function show(inst, text, duration) {
  inst.queue = []
  inst.onQueueEmpty = null
  startHint(inst, text, duration)
}

/**
 * Starts a chain of hints — the first shows immediately, the rest follow.
 * @param {Object} inst - Hero hint inst
 * @param {Array<{text: string, duration: number}>} hints - Hints to chain
 * @param {Function} [onComplete] - Called once the whole chain has finished
 */
export function queue(inst, hints, onComplete = null) {
  const list = [...hints]
  const first = list.shift()
  inst.queue = list
  inst.onQueueEmpty = onComplete
  first && startHint(inst, first.text, first.duration)
}

/**
 * Hides the current hint and empties the queue (no completion callback).
 * @param {Object} inst - Hero hint inst
 */
export function clear(inst) {
  inst.queue = []
  inst.onQueueEmpty = null
  destroyHint(inst)
}
//
// Creates the forced-visible tooltip bubble for a new hint text.
//
function startHint(inst, text, duration) {
  destroyHint(inst)
  const { k, heroInst } = inst
  inst.timer = 0
  inst.duration = duration
  inst.target = {
    x: () => heroInst.character?.pos?.x ?? 0,
    y: () => heroInst.character?.pos?.y ?? 0,
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
// Advances the fade-in / hold / fade-out envelope, follows the hero and
// chains queued hints when the current one expires.
//
function onUpdate(inst) {
  if (!inst.tooltip) return
  inst.timer += inst.k.dt()
  if (inst.timer >= inst.duration) {
    destroyHint(inst)
    const next = inst.queue.shift()
    if (next) {
      startHint(inst, next.text, next.duration)
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
// Keeps the frozen bubble anchor glued to the moving hero.
//
function syncBubblePosition(inst) {
  if (!inst.tooltip || !inst.target) return
  inst.tooltip.frozenX = Math.round(inst.target.x())
  inst.tooltip.frozenY = Math.round(inst.target.y())
}
