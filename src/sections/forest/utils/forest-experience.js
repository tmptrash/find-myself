import { get, set } from '../../../utils/progress.js'

//
// Glow experience is section-scoped (glow.experience) so touch/word lifeScore
// traps do not wipe it; the HUD still shows it via updateLifeScore.
//
export const GLOW_EXPERIENCE_START = 20
const GLOW_EXPERIENCE_PATH = 'glow.experience'

/**
 * Ensures glow.experience exists in save data (20 on first Glow play).
 */
function ensureGlowExperienceStored() {
  const stored = get(GLOW_EXPERIENCE_PATH, null)
  if (stored !== null && stored !== undefined) return
  set(GLOW_EXPERIENCE_PATH, GLOW_EXPERIENCE_START)
}

/**
 * Current experience, never below zero.
 * @returns {number}
 */
export function readGlowExperience() {
  ensureGlowExperienceStored()
  return Math.max(0, get(GLOW_EXPERIENCE_PATH, GLOW_EXPERIENCE_START))
}

/**
 * Applies a delta, clamps at 0, persists and returns the new total.
 * @param {number} delta - Positive or negative change
 * @returns {number}
 */
export function applyGlowExperienceDelta(delta) {
  const next = Math.max(0, readGlowExperience() + delta)
  set(GLOW_EXPERIENCE_PATH, next)
  return next
}
