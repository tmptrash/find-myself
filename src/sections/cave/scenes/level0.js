import * as CaveLevel from '../utils/cave-level.js'

/**
 * Registers cave lesson 0 — the cave room under the forest island.
 * @param {Object} k - Kaplay instance
 */
export function sceneCaveLevel0(k) {
  k.scene(CaveLevel.SCENE_NAME, () => CaveLevel.create(k))
}
