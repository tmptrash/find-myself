import * as Hero from '../../../components/hero.js'

/**
 * Recreates the playable hero after a touch-section death without reloading the scene.
 * @param {Object} k - Kaplay instance
 * @param {Object} heroCfg - Hero.create config without k, x, or y
 * @param {number} spawnX - Respawn X
 * @param {number} spawnY - Respawn Y
 * @returns {Object} Fresh hero instance
 */
export function respawnTouchPlayableHero(k, heroCfg, spawnX, spawnY) {
  const fresh = Hero.create({
    ...heroCfg,
    k,
    x: spawnX,
    y: spawnY,
    controllable: true
  })
  Hero.spawn(fresh, { instant: true })
  return fresh
}
