import * as CaveLevel from '../utils/cave-level.js'
//
// Dev scene for the lake's giant (/?scene=lesson-cave.giant-dev): the cave
// level with the giant kept in the lake and driven by keys — 1 hanging
// still, 2 a slow swim, 3 a fast one, 4 surfacing under the hero to
// breathe (ridable back), 5 diving, 6 a reversal, 0 back to its own ways
// — its debug overlay (mesh, bones and weights, attachments, the back's
// body, the state) shown, G toggling it. Not reachable from the game.
//
export const SCENE_NAME = 'lesson-cave.giant-dev'

/**
 * Registers the giant's dev scene.
 * @param {Object} k - Kaplay instance
 */
export function sceneCaveGiantDev(k) {
  k.scene(SCENE_NAME, () => CaveLevel.create(k, { giantDev: true }))
}
