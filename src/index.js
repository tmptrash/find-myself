import kaplay from "kaplay"
import { sceneReady } from "./scenes/ready.js"
import { sceneMenu } from "./scenes/menu.js"
import { sceneLevel0 } from "./sections/word/scenes/level0.js"
import { sceneLevel1 } from "./sections/word/scenes/level1.js"
import { sceneLevel2 } from "./sections/word/scenes/level2.js"
import { sceneLevel3 } from "./sections/word/scenes/level3.js"
import { sceneLevel4 } from "./sections/word/scenes/level4.js"
import { loadHeroSprites } from "./components/hero.js"
import { loadSprites as loadBladeSprites } from "./sections/word/components/blades.js"

// Game initialization (fixed resolution 1920x1080)
const k = kaplay({
  width: 1920,
  height: 1080,
  font: "jetbrains",
  letterbox: true,
  background: [0, 0, 0]  // Black background, no loading screen
})
//
// Remove default cursor style to allow CSS custom cursor
//
k.canvas.style.cursor = ''

// Load resources
k.loadFont("jetbrains", "/fonts/JetBrainsMono-Regular.ttf")

// Load all character sprites (encapsulated in hero.js)
loadHeroSprites(k)

// Load blade sprites
loadBladeSprites(k)

// Register all scenes
sceneReady(k)
sceneMenu(k)
sceneLevel0(k)
sceneLevel1(k)
sceneLevel2(k)
sceneLevel3(k)
sceneLevel4(k)

//
// Start game after resources loaded
// Always show ready screen on page load
//
k.onLoad(() => {
  k.go("ready")
})

