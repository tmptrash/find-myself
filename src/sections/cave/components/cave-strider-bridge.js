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
// the way over: while he stands on a strider the last one backs off
// LAST_RETREAT px from its spot by the bank (too far to jump to the bank
// from), and goes back once he is off them.
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
const LAST_RETREAT = 130

/**
 * Creates the striders' bridge over the lake.
 * @param {Object} cfg
 * @param {Object} cfg.k - Kaplay instance
 * @param {Array<Object>} cfg.striders - The lake's striders (cave-strider.js)
 * @param {number} cfg.from - World X of the pad plant leaves' right edge
 * @param {number} cfg.to - World X of the right bank's tip
 * @returns {Object} Bridge instance
 */
export function create(cfg) {
  const { k, striders, from, to } = cfg
  const first = from + FIRST_GAP
  const last = to - LAST_GAP
  const steps = Math.max(1, striders.length - 1)
  return {
    k,
    striders,
    slots: striders.map((_, i) => first + (last - first) * i / steps),
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
// The last strider backed off from the bank while the hero is on the row,
// back at its spot once he is off it.
//
function retreat(inst, ridden) {
  if (ridden === inst.retreated || !inst.order.length) return
  inst.retreated = ridden
  const last = inst.order.length - 1
  Strider.setSlot(inst.order[last], inst.slots[last] - (ridden ? LAST_RETREAT : 0))
}
function scatter(inst) {
  inst.holdLeft = 0
  inst.gatherIn = GATHER_EVERY + Math.random() * GATHER_EVERY_RANGE
  inst.striders.forEach(strider => Strider.setSlot(strider, null))
}
