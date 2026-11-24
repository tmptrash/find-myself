import * as Strider from './cave-strider.js'
//
// The striders' bridge: now and then the lake's striders gather in a row
// from the pad plant's leaves over toward the right bank, each rowing to
// and fro about its own spot, a jump apart — as if the hero might cross
// the lake on their backs (each one sinking under him and rowing him on a
// little: he has to jump on to the next one before it goes under). They
// hold the row HOLD_TIME s (for as long as he stands on one of them), then
// scatter and live on their own again, and gather again GATHER_EVERY..
// +RANGE s later (the first time FIRST_GATHER s after the level starts).
// The hero falling into the lake breaks the row up. It never takes him all
// the way over: while he stands on a strider the whole row closes up
// between the leaves and STOP_GAP px short of the trumpeter (its
// funnel's middle, `stop`), none of them — not even the one rowing him on —
// going past that (too far to jump to the bank from), and spreads out
// again once he is off them.
//
// The spots: the first FIRST_GAP px out from the leaves' edge (a jump
// from them), the last LAST_GAP px short of the bank's tip (seen from the
// leaves, all but a jump from it), the others evenly between.
//
const FIRST_GATHER = 6
const GATHER_EVERY = 14
const GATHER_EVERY_RANGE = 10
const HOLD_TIME = 16
const FIRST_GAP = 140
const LAST_GAP = 200
const STOP_GAP = 60

/**
 * Creates the striders' bridge over the lake.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<Object>} cfg.striders - The lake's striders (cave-strider.js)
 * @param {number} cfg.from - World X of the pad plant leaves' right edge
 * @param {number} cfg.to - World X of the right bank's tip
 * @param {number} cfg.stop - World X of the trumpeter (the row never takes the hero past it)
 * @returns {Object} Bridge instance
 */
export function create(cfg) {
  const { k, striders, from, to, stop } = cfg
  const first = from + FIRST_GAP
  const fence = stop - STOP_GAP
  return {
    k,
    striders,
    fence,
    slots: spread(striders.length, first, to - LAST_GAP),
    closeSlots: spread(striders.length, first, fence),
    holdLeft: 0,
    gatherIn: FIRST_GATHER,
    order: [],
    retreated: false
  }
}

/**
 * Runs it on: gathering the striders in their row, holding it (while the
 * hero stands on one of them too), scattering them.
 * @param {Object} inst - Bridge instance
 * @param {Object|null} ridden - The strider the hero stands on, or null
 */
export function onUpdate(inst, ridden) {
  const dt = inst.k.dt()
  if (inst.holdLeft > 0) {
    retreat(inst, Boolean(ridden))
    ridden || (inst.holdLeft -= dt)
    inst.holdLeft <= 0 && scatter(inst)
    return
  }
  inst.gatherIn -= dt
  inst.gatherIn <= 0 && gather(inst)
}

/**
 * Breaks the row up (the hero fell into the lake): the striders scatter.
 * @param {Object} inst - Bridge instance
 */
export function breakUp(inst) {
  inst.holdLeft > 0 && scatter(inst)
}
//
// Each strider to its spot, left to right as they are now (none rows
// past another).
//
function gather(inst) {
  inst.holdLeft = HOLD_TIME
  inst.retreated = false
  inst.order = inst.striders.slice().sort((a, b) => a.x - b.x)
  inst.order.forEach((strider, i) => Strider.setSlot(strider, inst.slots[i]))
}
//
// The row closed up short of the trumpeter (and fenced there) while the
// hero is on it, spread out again once he is off it.
//
function retreat(inst, ridden) {
  if (ridden === inst.retreated || !inst.order.length) return
  inst.retreated = ridden
  const slots = ridden ? inst.closeSlots : inst.slots
  inst.order.forEach((strider, i) => {
    Strider.setSlot(strider, slots[i])
    Strider.setFence(strider, ridden ? inst.fence : null)
  })
}
//
// `count` spots evenly from `first` to `last`.
//
function spread(count, first, last) {
  const steps = Math.max(1, count - 1)
  return Array.from({ length: count }, (_, i) => first + (last - first) * i / steps)
}
function scatter(inst) {
  inst.holdLeft = 0
  inst.retreated = false
  inst.striders.forEach(strider => Strider.setFence(strider, null))
  inst.gatherIn = GATHER_EVERY + Math.random() * GATHER_EVERY_RANGE
  inst.striders.forEach(strider => Strider.setSlot(strider, null))
}
