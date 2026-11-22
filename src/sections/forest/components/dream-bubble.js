import * as Hero from '../../../components/hero.js'
import { get, set } from '../../../utils/progress.js'
import * as ThoughtBubble from './thought-bubble.js'
//
// The hero's dream: once he has dozed off and his eyes are shut
// (Hero.dozeShare reaches 1), a thought bubble (assets/forest/level_end.png,
// thought-bubble.js) swells up beside his head and bobs gently. The moment
// he moves it bursts into fireflies.
//
// It dreams up only SHOWS_MAX times (counted in the saved progress under
// SHOWS_KEY, so a page reload does not give them back), and never while the
// caller says no (the hero on the left tree's branch). Once it has dreamt
// them all, the hero no longer dozes off at all. Both dreams come back on
// the very first start of the game (nothing saved yet), when the level is
// started over from the menu (that wipes the forest's progress) and after
// AWAKE_RESET_SEC more in the level since the last one (that time is saved
// under AWAKE_KEY every AWAKE_SAVE_SEC, so reloads and deaths keep it).
//
const URL = 'forest/level_end.png'
const SPRITE_PREFIX = 'forest0-dream-bubble'
const GRAIN_SEED = 9310
const BUBBLE_W = 200
const SHOWS_MAX = 2
const SHOWS_KEY = 'forest.dreamShows'
const AWAKE_KEY = 'forest.dreamAwakeSec'
const AWAKE_RESET_SEC = 30 * 60
const AWAKE_SAVE_SEC = 30
//
// It waits SHOW_DELAY_SEC after his eyes shut.
//
const SHOW_DELAY_SEC = 0.3

/**
 * Waits for the bubble picture (once per page).
 * @returns {Promise<void>}
 */
export function load() {
  return ThoughtBubble.load(URL)
}

/**
 * Creates the dream bubble over a hero (its sprite baked once per live k;
 * nothing shows until load() has resolved).
 * @param {Object} cfg - Bubble configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.heroInst - Hero instance it dreams over (swap it on respawn)
 * @param {number} [cfg.z] - Draw z (the level puts it over the big trees); default just over the hero
 * @returns {Object} Bubble inst
 */
export function create(cfg) {
  const { k, heroInst, z } = cfg
  return {
    heroInst,
    bubble: ThoughtBubble.create({ k, url: URL, spritePrefix: SPRITE_PREFIX, grainSeed: GRAIN_SEED, width: BUBBLE_W, z }),
    shows: get(SHOWS_KEY, 0),
    awakeSec: get(AWAKE_KEY, 0),
    awakeSavedSec: 0,
    dreamedThisDoze: false,
    shutT: 0
  }
}

/**
 * Shows the bubble once the hero's eyes have shut (if it still may), bursts
 * it into fireflies when he moves, and drifts the fireflies.
 * @param {Object} inst - Bubble inst
 * @param {number} dt - Seconds since the last frame
 * @param {boolean} allowed - False keeps a new bubble from showing, bursts one that shows and keeps the hero awake (his eyes stay open)
 * @param {boolean} [mayDoze=true] - False keeps the hero awake (his doze timer does not run)
 */
export function onUpdate(inst, dt, allowed, mayDoze = true) {
  const shown = ThoughtBubble.isShown(inst.bubble)
  inst.shows >= SHOWS_MAX && !shown && tickAwake(inst, dt)
  Hero.setDozes(inst.heroInst, allowed && (shown || (mayDoze && inst.shows < SHOWS_MAX)))
  const doze = Hero.dozeShare(inst.heroInst)
  doze <= 0 && (inst.dreamedThisDoze = false)
  inst.shutT = doze >= 1 ? inst.shutT + dt : 0
  if (shown) {
    (doze < 1 || !allowed) && ThoughtBubble.burst(inst.bubble)
  } else if (allowed && inst.shutT >= SHOW_DELAY_SEC && !inst.dreamedThisDoze && inst.shows < SHOWS_MAX) {
    startDream(inst)
  }
  ThoughtBubble.onUpdate(inst.bubble, dt, inst.heroInst?.character?.pos ?? null)
}
//
// A new dream: counted for this run of the app.
//
function startDream(inst) {
  if (!ThoughtBubble.show(inst.bubble)) return
  inst.dreamedThisDoze = true
  inst.shows++
  set(SHOWS_KEY, inst.shows)
}
//
// Time in the level since the last dream: saved now and then; once it
// reaches AWAKE_RESET_SEC both dreams come back.
//
function tickAwake(inst, dt) {
  inst.awakeSec += dt
  if (inst.awakeSec >= AWAKE_RESET_SEC) {
    inst.shows = 0
    inst.awakeSec = 0
    inst.awakeSavedSec = 0
    set(SHOWS_KEY, 0)
    set(AWAKE_KEY, 0)
    return
  }
  inst.awakeSec - inst.awakeSavedSec >= AWAKE_SAVE_SEC && saveAwake(inst)
}
function saveAwake(inst) {
  inst.awakeSavedSec = inst.awakeSec
  set(AWAKE_KEY, inst.awakeSec)
}
