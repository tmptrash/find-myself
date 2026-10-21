import { get, set } from '../../../utils/progress.js'

//
// Forest experience is section-scoped (forest.experience) so touch/word lifeScore
// traps do not wipe it; the HUD still shows it via updateLifeScore.
//
export const FOREST_EXPERIENCE_START = 20
const FOREST_EXPERIENCE_PATH = 'forest.experience'

/**
 * Ensures forest.experience exists in save data (20 on first Forest play).
 */
function ensureForestExperienceStored() {
  const stored = get(FOREST_EXPERIENCE_PATH, null)
  if (stored !== null && stored !== undefined) return
  set(FOREST_EXPERIENCE_PATH, FOREST_EXPERIENCE_START)
}

/**
 * Current experience, never below zero.
 * @returns {number}
 */
export function readForestExperience() {
  ensureForestExperienceStored()
  return Math.max(0, get(FOREST_EXPERIENCE_PATH, FOREST_EXPERIENCE_START))
}

/**
 * Applies a delta, clamps at 0, persists and returns the new total.
 * @param {number} delta - Positive or negative change
 * @returns {number}
 */
export function applyForestExperienceDelta(delta) {
  const next = Math.max(0, readForestExperience() + delta)
  set(FOREST_EXPERIENCE_PATH, next)
  return next
}
