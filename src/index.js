import kaplay from "kaplay"
import { CFG } from "./cfg.js"
import { sceneReady } from "./scenes/ready.js"
import { sceneMenu } from "./scenes/menu.js"
import { sceneLevel0 } from "./sections/word/scenes/level0.js"
import { sceneLevel1 } from "./sections/word/scenes/level1.js"
import { sceneLevel2 } from "./sections/word/scenes/level2.js"
import { sceneLevel3 } from "./sections/word/scenes/level3.js"
import { sceneLevel4 } from "./sections/word/scenes/level4.js"
import { sceneWordComplete } from "./sections/word/scenes/word-complete.js"
import { sceneLevel0 as sceneTouchLevel0 } from "./sections/touch/scenes/level0.js"
import { sceneLevel1 as sceneTouchLevel1 } from "./sections/touch/scenes/level1.js"
import { sceneLevel2 as sceneTouchLevel2 } from "./sections/touch/scenes/level2.js"
import { sceneLevel3 as sceneTouchLevel3 } from "./sections/touch/scenes/level3.js"
import { sceneLevel0 as sceneTimeLevel0 } from "./sections/time/scenes/level0.js"
import { sceneLevel1 as sceneTimeLevel1 } from "./sections/time/scenes/level1.js"
import { sceneLevel2 as sceneTimeLevel2 } from "./sections/time/scenes/level2.js"
import { sceneLevel3 as sceneTimeLevel3 } from "./sections/time/scenes/level3.js"
import { sceneTimeComplete } from "./sections/time/scenes/time-complete.js"
import { loadHeroSprites, HEROES } from "./components/hero.js"
import { loadSprites as loadBladeSprites } from "./sections/word/components/blades.js"
import * as CityBackground from "./sections/time/components/city-background.js"
//
// Game initialization
//
const k = kaplay({
  width: CFG.visual.screen.width,
  height: CFG.visual.screen.height,
  font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
  letterbox: true,
  background: [0, 0, 0]  // Black background as RGB array
})
//
// Force dark background for all elements
//
document.documentElement.style.backgroundColor = '#000000'
document.body.style.backgroundColor = '#000000'
//
// Remove default cursor style to allow CSS custom cursor
//
k.canvas.style.removeProperty('cursor')
//
// Load resources
//
k.loadFont(CFG.visual.fonts.regularFull.replace(/'/g, ''), "/fonts/JetBrainsMono-Regular.ttf")
k.loadFont(CFG.visual.fonts.thinFull.replace(/'/g, ''), "/fonts/JetBrainsMono-Thin.ttf")
//
// Load audio
//
k.loadSound("time", "/sounds/time.mp3")
k.loadSound("time0", "/sounds/time0.mp3")
k.loadSound("time0-pre", "/sounds/time0-pre.mp3")
k.loadSound("time0-kids", "/sounds/time0-kids.mp3")
k.loadSound("time1", "/sounds/time1.mp3")
k.loadSound("time1-pre", "/sounds/time1-pre.mp3")
k.loadSound("time2-pre", "/sounds/time2-pre.mp3")
k.loadSound("time3-pre", "/sounds/time3-pre.mp3")

k.loadSound("word", "/sounds/word.mp3")
k.loadSound("word0-pre", "/sounds/word0-pre.mp3")
k.loadSound("word1-pre", "/sounds/word1-pre.mp3")
k.loadSound("word2-pre", "/sounds/word2-pre.mp3")
k.loadSound("word3-pre", "/sounds/word3-pre.mp3")
k.loadSound("word4-pre", "/sounds/word4-pre.mp3")

k.loadSound("menu", "/sounds/menu.mp3")
k.loadSound("kids", "/sounds/kids.mp3")
k.loadSound("clock", "/sounds/clock.mp3")
k.loadSound("touch", "/sounds/touch.mp3")
k.loadSound("life", "/sounds/life.mp3")
//
// Load default character sprites for both hero types
// Must be loaded before scenes are registered, as scenes may create heroes immediately
//
try {
  loadHeroSprites(k, HEROES.HERO)
  loadHeroSprites(k, HEROES.ANTIHERO)
  loadBladeSprites(k)
  //
  // Preload city backgrounds for time section levels
  //
  const PLATFORM_BOTTOM_HEIGHT_LEVEL0 = 250  // Same as in level0.js
  CityBackground.preloadCityBackground(k, PLATFORM_BOTTOM_HEIGHT_LEVEL0, 'city-background')
  const PLATFORM_BOTTOM_HEIGHT_LEVEL1 = 150  // Same as in level1.js
  CityBackground.preloadCityBackground(k, PLATFORM_BOTTOM_HEIGHT_LEVEL1, 'city-background-level1')
  const PLATFORM_BOTTOM_HEIGHT_LEVEL2 = 150  // Same as in level2.js
  CityBackground.preloadCityBackground(k, PLATFORM_BOTTOM_HEIGHT_LEVEL2, 'city-background-level2', false, true)  // No sun, autumn leaves for level 2
  //
  // For level 3: ground line matches lower corridor floor
  //
  const LOWER_CORRIDOR_Y_LEVEL3 = 680
  const CORRIDOR_HEIGHT_LEVEL3 = 180
  const groundLineLevel3 = k.height() - (LOWER_CORRIDOR_Y_LEVEL3 + CORRIDOR_HEIGHT_LEVEL3)
  CityBackground.preloadCityBackground(k, groundLineLevel3, 'city-background-level3', false, true, false)  // No sun, autumn leaves, no cars for level 3
} catch (error) {
  //
  // If sprite loading fails, continue anyway - sprites will be loaded on-demand in Hero.create()
  //
}
//
// Register all scenes
//
sceneReady(k)
sceneMenu(k)
sceneLevel0(k)
sceneLevel1(k)
sceneLevel2(k)
sceneLevel3(k)
sceneLevel4(k)
sceneWordComplete(k)
sceneTouchLevel0(k)
sceneTouchLevel1(k)
sceneTouchLevel2(k)
sceneTouchLevel3(k)
sceneTimeLevel0(k)
sceneTimeLevel1(k)
sceneTimeLevel2(k)
sceneTimeLevel3(k)
sceneTimeComplete(k)
//
// Start game after resources loaded
// Always show ready screen on page load
//
k.onLoad(() => k.go("ready"))