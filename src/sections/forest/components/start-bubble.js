import * as ThoughtBubble from './thought-bubble.js'
//
// The level's opening controls hint: a thought bubble with the hot keys
// (assets/forest/level_start.png, thought-bubble.js) over the hero's head.
// The hero can move while it is up. It bursts into fireflies after
// DURATION_SEC, when the player dismisses it (the level calls dismiss) or
// once the hero has walked DISMISS_DISTANCE px sideways from where it came
// up (the first GRACE_SEC of movement are ignored, so spawn settle and the
// camera snap never clear it).
//
// It is BUBBLE_W world px wide — wider than the dream so its lettering reads.
//
const URL = 'forest/level_start.png'
const SPRITE_PREFIX = 'forest0-start-bubble'
const GRAIN_SEED = 9320
const BUBBLE_W = 260
const DURATION_SEC = 18
const DISMISS_DISTANCE = 80
const GRACE_SEC = 0.45

/**
 * Waits for the bubble picture (once per page).
 * @returns {Promise<void>}
 */
export function load() {
  return ThoughtBubble.load(URL)
}

/**
 * Creates the controls bubble over a hero (hidden until show()).
 * @param {Object} cfg - Bubble configuration
 * @param {Object} cfg.k - Kaplay instance
 * @param {Object} cfg.heroInst - Hero instance it hangs over (swap it on respawn)
 * @param {number} [cfg.z] - Draw z
 * @returns {Object} Start bubble inst
 */
export function create(cfg) {
  const { k, heroInst, z } = cfg
  return {
    heroInst,
    bubble: ThoughtBubble.create({ k, url: URL, spritePrefix: SPRITE_PREFIX, grainSeed: GRAIN_SEED, width: BUBBLE_W, z }),
    timer: 0,
    spawnX: 0
  }
}

/**
 * Brings the bubble up over the hero.
 * @param {Object} inst - Start bubble inst
 * @returns {boolean} True if it shows (its picture is loaded)
 */
export function show(inst) {
  inst.timer = 0
  inst.spawnX = inst.heroInst?.character?.pos?.x ?? 0
  return ThoughtBubble.show(inst.bubble)
}

/**
 * True while the bubble is up.
 * @param {Object} inst - Start bubble inst
 * @returns {boolean}
 */
export function isActive(inst) {
  return ThoughtBubble.isShown(inst.bubble)
}

/**
 * Bursts the bubble now (no-op when it is not up).
 * @param {Object} inst - Start bubble inst
 */
export function dismiss(inst) {
  ThoughtBubble.burst(inst.bubble)
}

/**
 * Times the bubble out, bursts it once the hero walks away, and runs its
 * swell, bob and fireflies. Call once per frame.
 * @param {Object} inst - Start bubble inst
 * @param {number} dt - Seconds since the last frame
 * @param {{left: number, top: number, right: number}|null} view - Visible world rect the bubble stays inside
 */
export function onUpdate(inst, dt, view) {
  const pos = inst.heroInst?.character?.pos ?? null
  isActive(inst) && tickShown(inst, dt, pos)
  ThoughtBubble.onUpdate(inst.bubble, dt, pos, view)
}
function tickShown(inst, dt, pos) {
  inst.timer += dt
  const walkedAway = inst.timer >= GRACE_SEC && pos && Math.abs(pos.x - inst.spawnX) >= DISMISS_DISTANCE
  if (inst.timer >= DURATION_SEC || walkedAway) dismiss(inst)
}
