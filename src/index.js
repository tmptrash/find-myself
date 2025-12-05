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
import { loadHeroSprites, HEROES } from "./components/hero.js"
import { loadSprites as loadBladeSprites } from "./sections/word/components/blades.js"
//
// Game initialization
//
const k = kaplay({
  width: CFG.visual.screen.width,
  height: CFG.visual.screen.height,
  font: CFG.visual.fonts.regular,
  letterbox: true,
  background: parseHex(CFG.visual.colors.background)
})
//
// Remove default cursor style to allow CSS custom cursor
//
k.canvas.style.removeProperty('cursor')
//
// Load resources
//
k.loadFont(CFG.visual.fonts.regular, "/fonts/JetBrainsMono-Regular.ttf")
k.loadFont(CFG.visual.fonts.thin, "/fonts/JetBrainsMono-Thin.ttf")
//
// Load audio
//
k.loadSound("word", "/word.mp3")
k.loadSound("menu", "/menu.mp3")
//
// Load default character sprites for both hero types
//
loadHeroSprites(k, HEROES.HERO)
loadHeroSprites(k, HEROES.ANTIHERO)
//
// Load blade sprites
//
loadBladeSprites(k)
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
//
// Start game after resources loaded
// Always show ready screen on page load
//
k.onLoad(() => k.go("ready"))