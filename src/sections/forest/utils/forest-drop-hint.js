import * as AppleBug from '../components/apple-bug.js'
import { FOREST_CFG } from '../cfg.js'
import { get, set } from '../../../utils/progress.js'

//
// Hint for the water flower by the left big tree: until the hero has shaken
// its bubble loose once himself, his deaths and his time on the move are
// counted. Past FOREST_CFG.dropHint's limits the apple bug bites the bubble
// off for him (the water then grows the apples), a few times at most. The
// counts live in progress so a drowning (which reloads the level) keeps them.
//
const PARAMS = FOREST_CFG.dropHint
const KEY_DONE = 'forest.dropShaken'
const KEY_STATE = 'forest.dropHint'

/**
 * Creates the hint, reading its saved counts once.
 * @param {Object} cfg
 * @param {Object|null} cfg.bug - Apple bug inst
 * @returns {Object} Hint inst
 */
export function create(cfg) {
  const saved = get(KEY_STATE, null)
  return {
    bug: cfg.bug,
    done: Boolean(get(KEY_DONE, false)),
    deaths: saved?.deaths ?? 0,
    moveTime: saved?.moveTime ?? 0,
    bites: saved?.bites ?? 0
  }
}

/**
 * Counts the hero's time on the move and, once the hint is due, keeps
 * asking the bug for a bite until it has bitten enough times.
 * @param {Object} inst - Hint inst
 * @param {number} dt - Frame time (s)
 * @param {boolean} moving - Whether the hero runs or is in the air
 */
export function onUpdate(inst, dt, moving) {
  if (inst.done || !inst.bug) return
  moving && (inst.moveTime += dt)
  inst.bug.dropBites > 0 && countBites(inst)
  const due = inst.deaths >= PARAMS.deaths || inst.moveTime >= PARAMS.moveSeconds
  AppleBug.wantDropBite(inst.bug, due && inst.bites < PARAMS.bites)
}

/**
 * Counts a death of the hero (and saves the counts).
 * @param {Object} inst - Hint inst
 */
export function onHeroDeath(inst) {
  if (inst.done) return
  inst.deaths += 1
  save(inst)
}

/**
 * The hero shook the bubble loose himself: no more hints, ever.
 * @param {Object} inst - Hint inst
 */
export function onHeroShookDrop(inst) {
  if (inst.done) return
  inst.done = true
  AppleBug.wantDropBite(inst.bug, false)
  set(KEY_DONE, true)
}
//
// Moves the bug's fresh bites into the saved count.
//
function countBites(inst) {
  inst.bites += inst.bug.dropBites
  inst.bug.dropBites = 0
  save(inst)
}
function save(inst) {
  set(KEY_STATE, { deaths: inst.deaths, moveTime: inst.moveTime, bites: inst.bites })
}
