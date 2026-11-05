import * as Hero from '../../../components/hero.js'
import * as SpikyTomato from '../components/spiky-tomato.js'
import { get, set } from '../../../utils/progress.js'

//
// Where the hero glances each time he comes to a stop (after a run or a
// landing) while he has not found the next step yet, in this order: within
// FLOWER_LOOK_REACH of the water flower's bubble, until his own landing
// has shaken it down once, at that bubble; then, right of the left mushroom
// trampoline and before his first landing on the right big tree's branch,
// at that branch; after that landing, still right of the trampoline, at the
// right bomb tree's bomb until it has fallen once. The glance lasts a
// moment, then he looks straight at the player and his eyes wander as
// usual. The steps done are saved so a reload (drowning) keeps them.
//
const FLOWER_LOOK_REACH = 150      // Either side of the bubble (world px; a 300 px wide zone)
const GLANCE_TARGET_SEC = 2        // Looking at the object
const GLANCE_CENTER_SEC = 1        // Then straight at the player
const PHASE_FREE = 'free'
const PHASE_TARGET = 'target'
const PHASE_CENTER = 'center'
const KEY_SHORE_BRANCH_LANDED = 'forest.shoreBranchLanded'
const KEY_RIGHT_BOMB_DROPPED = 'forest.rightBombDropped'

/**
 * Creates the gaze guide, reading its saved steps once.
 * @param {Object} cfg
 * @param {Object} cfg.hero - Hero inst
 * @param {Object|null} cfg.flower - Water flower inst
 * @param {Object|null} cfg.dropHint - Drop hint inst (its done flag: the hero shook the bubble once)
 * @param {number|null} cfg.rightZoneX - World X of the left mushroom trampoline (the right part starts past it)
 * @param {{x1: number, x2: number, y: number}|null} cfg.shoreBranch - Right big tree's branch
 * @param {Object|null} cfg.bombs - Spiky bomb inst
 * @param {number} cfg.bombIndex - Index of the right bomb tree (-1 for none)
 * @returns {Object} Gaze inst
 */
export function create(cfg) {
  const branch = cfg.shoreBranch
  return {
    hero: cfg.hero,
    flower: cfg.flower,
    dropHint: cfg.dropHint,
    rightZoneX: cfg.rightZoneX,
    branchSpot: branch ? { x: (branch.x1 + branch.x2) * 0.5, y: branch.y } : null,
    bombs: cfg.bombs,
    bombIndex: cfg.bombIndex,
    flowerSpot: { x: 0, y: 0 },
    bombSpot: { x: 0, y: 0 },
    centerSpot: { x: 0, y: 0 },
    phase: PHASE_FREE,
    phaseTimer: 0,
    wasStill: false,
    shoreBranchLanded: Boolean(get(KEY_SHORE_BRANCH_LANDED, false)),
    rightBombDropped: Boolean(get(KEY_RIGHT_BOMB_DROPPED, false))
  }
}

/**
 * Notes the steps done this frame and drives the glance: each time the hero
 * comes to a stop in a hint zone he looks at its object, then straight at
 * the player, then lets his eyes wander until he stops again.
 * @param {Object} inst - Gaze inst
 * @param {number} heroX - Hero world X
 * @param {boolean} still - Whether the hero stands still on a surface this frame
 */
export function onUpdate(inst, heroX, still) {
  trackBombDrop(inst)
  still && !inst.wasStill && startGlance(inst, heroX)
  inst.wasStill = still
  !still && (inst.phase = PHASE_FREE)
  inst.phase !== PHASE_FREE && tickGlance(inst, heroX)
  Hero.setLookAtPos(inst.hero, glanceSpot(inst, heroX))
}

/**
 * The hero landed on the right big tree's branch: from now on he no longer
 * glances at it.
 * @param {Object} inst - Gaze inst
 */
export function onShoreBranchLanded(inst) {
  if (inst.shoreBranchLanded) return
  inst.shoreBranchLanded = true
  set(KEY_SHORE_BRANCH_LANDED, true)
}
//
// The right bomb's first fall is seen here (saved once).
//
function trackBombDrop(inst) {
  const bomb = SpikyTomato.bombAt(inst.bombs, inst.bombIndex)
  if (inst.rightBombDropped || !bomb || SpikyTomato.isBombHanging(bomb)) return
  inst.rightBombDropped = true
  set(KEY_RIGHT_BOMB_DROPPED, true)
}
function startGlance(inst, heroX) {
  if (!lookTarget(inst, heroX)) return
  inst.phase = PHASE_TARGET
  inst.phaseTimer = GLANCE_TARGET_SEC
}
function tickGlance(inst, heroX) {
  inst.phaseTimer -= inst.hero.k.dt()
  //
  // The hint is solved or the hero left its zone mid-glance: no point
  // looking at it any longer.
  //
  inst.phase === PHASE_TARGET && !lookTarget(inst, heroX) && (inst.phaseTimer = 0)
  if (inst.phaseTimer > 0) return
  if (inst.phase === PHASE_CENTER) {
    inst.phase = PHASE_FREE
    return
  }
  inst.phase = PHASE_CENTER
  inst.phaseTimer = GLANCE_CENTER_SEC
}
//
// The hero's own position puts his eyes in the middle, facing the player.
//
function glanceSpot(inst, heroX) {
  if (inst.phase === PHASE_TARGET) return lookTarget(inst, heroX)
  const pos = inst.hero.character?.pos
  if (inst.phase === PHASE_FREE || !pos) return null
  inst.centerSpot.x = pos.x
  inst.centerSpot.y = pos.y
  return inst.centerSpot
}
function lookTarget(inst, heroX) {
  const flower = inst.flower
  if (flower && !inst.dropHint?.done && Math.abs(heroX - flower.heartX) <= FLOWER_LOOK_REACH) {
    inst.flowerSpot.x = flower.heartX
    inst.flowerSpot.y = flower.heartY
    return inst.flowerSpot
  }
  const inRightPart = inst.rightZoneX !== null && heroX > inst.rightZoneX
  if (!inRightPart) return null
  if (!inst.shoreBranchLanded) return inst.branchSpot
  const bomb = SpikyTomato.bombAt(inst.bombs, inst.bombIndex)
  if (inst.rightBombDropped || !bomb) return null
  inst.bombSpot.x = bomb.x
  inst.bombSpot.y = bomb.y
  return inst.bombSpot
}
