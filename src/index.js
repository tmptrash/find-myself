import kaplay from "kaplay"
import { CFG } from "./cfg.js"
import { sceneReady } from "./scenes/ready.js"
import { sceneMenu } from "./scenes/menu.js"
import { sceneLevel1 } from "./scenes/level1.js"
import { sceneLevel2 } from "./scenes/level2.js"
import { loadHeroSprites } from "./components/hero.js"

// Game initialization (parameters from config)
const k = kaplay({
  width: CFG.visual.windowWidth,
  height: CFG.visual.windowHeight,
  font: "jetbrains"
})

// Load resources
k.loadFont("jetbrains", "/fonts/JetBrainsMono-Regular.ttf")

// Load all character sprites (encapsulated in hero.js)
loadHeroSprites(k)

// Register all scenes
sceneReady(k)
sceneMenu(k)
sceneLevel1(k)
sceneLevel2(k)

// Start game after resources loaded
k.onLoad(() => k.go("ready"))

