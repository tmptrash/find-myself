import kaplay from "kaplay"
import { CFG } from "./cfg.js"
import { parseHex } from "./utils/helper.js"
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
k.loadSound("word", "/word.mp3")
k.loadSound("menu", "/menu.mp3")
k.loadSound("kids", "/kids.mp3")
k.loadSound("clock", "/clock.mp3")
k.loadSound("time", "/time.mp3")
k.loadSound("touch", "/touch.mp3")
//
// Load default character sprites for both hero types
// Must be loaded before scenes are registered, as scenes may create heroes immediately
//
try {
  loadHeroSprites(k, HEROES.HERO)
  loadHeroSprites(k, HEROES.ANTIHERO)
} catch (error) {
  //
  // If sprite loading fails, continue anyway - sprites will be loaded on-demand in Hero.create()
  //
}
//
// Load blade sprites
//
try {
  loadBladeSprites(k)
} catch (error) {
  //
  // If blade sprite loading fails, continue anyway
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