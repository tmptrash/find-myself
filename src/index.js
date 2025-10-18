import kaplay from "kaplay"
import { CONFIG } from "./config.js"
import { readyScene } from "./scenes/ready.js"
import { menuScene } from "./scenes/menu.js"
import { level1Scene } from "./scenes/level1.js"
import { level2Scene } from "./scenes/level2.js"
import { loadAllSprites } from "./components/hero.js"

// Game initialization (parameters from config)
const k = kaplay({
  width: CONFIG.visual.windowWidth,
  height: CONFIG.visual.windowHeight,
  scale: 1,
  background: [0, 0, 0],
  font: "jetbrains"
})

// Load all character sprites (encapsulated in hero.js)
loadAllSprites(k)

// Load resources
k.loadFont("jetbrains", "/fonts/JetBrainsMono-Regular.ttf")

// Register all scenes
readyScene(k)
menuScene(k)
level1Scene(k)
level2Scene(k)

// Start game after resources loaded
k.onLoad(() => k.go("start"))

