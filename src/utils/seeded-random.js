//
// Deterministic RNG for baked decor: the same seed always paints the same
// plant, so layouts survive reloads and resolution-swap reboots unchanged.
//
const SEED_RANGE = 0x7fffffff
const UINT32_RANGE = 4294967296

/**
 * Creates a mulberry32 generator returning floats in [0, 1).
 * @param {number} seed - Integer seed
 * @returns {() => number}
 */
export function createSeededRandom(seed) {
  let a = seed >>> 0
  return () => {
    a = (a + 0x6d2b79f5) >>> 0
    let t = a
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / UINT32_RANGE
  }
}

/**
 * Draws a child seed from a generator (one per placed decor item).
 * @param {() => number} rng - Seeded generator
 * @returns {number}
 */
export function nextSeed(rng) {
  return Math.floor(rng() * SEED_RANGE)
}
