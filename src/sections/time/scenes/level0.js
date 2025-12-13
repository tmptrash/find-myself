import { CFG } from '../cfg.js'
import { initScene } from '../utils/scene.js'
import * as Hero from '../../../components/hero.js'

//
// Platform dimensions (in pixels, for 1920x1080 resolution)
// Platforms fill entire top and bottom to hide background
//
const PLATFORM_TOP_HEIGHT = 360
const PLATFORM_BOTTOM_HEIGHT = 360
const PLATFORM_SIDE_WIDTH = 192

//
// Hero spawn positions (in pixels)
//
const HERO_SPAWN_X = 250
const HERO_SPAWN_Y = 680
const ANTIHERO_SPAWN_X = 1670
const ANTIHERO_SPAWN_Y = 680

/**
 * Time section level 0 scene
 * @param {Object} k - Kaplay instance
 */
export function sceneLevel0(k) {
  k.scene("level-time.0", () => {
    //
    // Initialize level with heroes and platforms
    //
    const { hero, antiHero } = initScene({
      k,
      levelName: 'level-time.0',
      bottomPlatformHeight: PLATFORM_BOTTOM_HEIGHT,
      topPlatformHeight: PLATFORM_TOP_HEIGHT,
      sideWallWidth: PLATFORM_SIDE_WIDTH,
      heroX: HERO_SPAWN_X,
      heroY: HERO_SPAWN_Y,
      antiHeroX: ANTIHERO_SPAWN_X,
      antiHeroY: ANTIHERO_SPAWN_Y
    })
    //
    // Spawn heroes (enables movement)
    //
    Hero.spawn(hero)
    Hero.spawn(antiHero)
  })
}
