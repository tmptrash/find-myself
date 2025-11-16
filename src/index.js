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
import { loadHeroSprites } from "./components/hero.js"
import { loadSprites as loadBladeSprites } from "./sections/word/components/blades.js"
//
// Game initialization
//
const k = kaplay({
  width: CFG.screen.width,
  height: CFG.screen.height,
  font: "jetbrains",
  letterbox: true,
  background: CFG.screen.background
})
//
// Remove default cursor style to allow CSS custom cursor
//
k.canvas.style.removeProperty('cursor')
//
// Load resources
//
k.loadFont("jetbrains", "/fonts/JetBrainsMono-Regular.ttf")
k.loadFont("jetbrains-thin", "/fonts/JetBrainsMono-Thin.ttf")
//
// Load audio
//
k.loadSound("word", "/word.mp3")
//
// Load all character sprites (encapsulated in hero.js)
//
loadHeroSprites(k)
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
k.onLoad(() => {
  k.go("ready")
})