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
import { sceneTouchComplete } from "./sections/touch/scenes/touch-complete.js"
import { sceneLevel0 as sceneTimeLevel0 } from "./sections/time/scenes/level0.js"
import { sceneLevel1 as sceneTimeLevel1 } from "./sections/time/scenes/level1.js"
import { sceneLevel2 as sceneTimeLevel2 } from "./sections/time/scenes/level2.js"
import { sceneLevel3 as sceneTimeLevel3 } from "./sections/time/scenes/level3.js"
import { sceneTimeComplete } from "./sections/time/scenes/time-complete.js"
import { loadHeroSprites, HEROES } from "./components/hero.js"
import { loadSprites as loadBladeSprites } from "./sections/word/components/blades.js"
import * as CityBackground from "./sections/time/components/city-background.js"
//
// URL pattern for network-loaded assets (all resource types)
//
const NETWORK_ASSET_PATTERN = /\.(mp3|png|js|css|ttf|woff2?)(\?|$)/i
//
// Game initialization
//
const k = kaplay({
  width: CFG.visual.screen.width,
  height: CFG.visual.screen.height,
  font: CFG.visual.fonts.regularFull.replace(/'/g, ''),
  letterbox: true,
  background: [0, 0, 0]
})
//
// Progress bar element and counters
//
const loaderBar = document.getElementById('loader-bar')
let completedTasks = 0
let totalTasks = 0
//
// Update progress bar after each task completes
//
function updateLoaderBar() {
  if (!loaderBar || totalTasks === 0) return
  const pct = Math.min(100, Math.round((completedTasks / totalTasks) * 100))
  loaderBar.style.width = `${pct}%`
}
//
// Yield control to the browser so the progress bar can repaint
//
function yieldToRenderer() {
  return new Promise(r => setTimeout(r, 0))
}
//
// Force dark background for all elements
//
document.documentElement.style.backgroundColor = '#000000'
document.body.style.backgroundColor = '#000000'
//
// Apply custom cursor class to the canvas.
// The class rule uses !important to override Kaplay's inline cursor: default.
// Scenes swap between 'cursor' and 'cursor-pointer' as needed.
//
k.canvas.classList.add('cursor')
//
// Define all asset loading tasks as an ordered list.
// Each task is executed one at a time with browser yields between them
// so the progress bar updates smoothly and reflects real loading status.
//
const assetTasks = [
  //
  // Fonts
  //
  () => k.loadFont(CFG.visual.fonts.regularFull.replace(/'/g, ''), "/fonts/JetBrainsMono-Regular.ttf"),
  () => k.loadFont(CFG.visual.fonts.thinFull.replace(/'/g, ''), "/fonts/JetBrainsMono-Thin.ttf"),
  //
  // Audio: time section
  //
  () => k.loadSound("time", "/sounds/time.mp3"),
  () => k.loadSound("time0", "/sounds/time0.mp3"),
  () => k.loadSound("time0-pre", "/sounds/time0-pre.mp3"),
  () => k.loadSound("time0-kids", "/sounds/time0-kids.mp3"),
  () => k.loadSound("time1-pre", "/sounds/time1-pre.mp3"),
  () => k.loadSound("time2-pre", "/sounds/time2-pre.mp3"),
  () => k.loadSound("time3-pre", "/sounds/time3-pre.mp3"),
  //
  // Audio: word section
  //
  () => k.loadSound("word", "/sounds/word.mp3"),
  () => k.loadSound("breath", "/sounds/breath.mp3"),
  () => k.loadSound("word0-pre", "/sounds/word0-pre.mp3"),
  () => k.loadSound("word1-pre", "/sounds/word1-pre.mp3"),
  () => k.loadSound("word2-pre", "/sounds/word2-pre.mp3"),
  () => k.loadSound("word3-pre", "/sounds/word3-pre.mp3"),
  () => k.loadSound("word4-pre", "/sounds/word4-pre.mp3"),
  //
  // Audio: menu and touch section
  //
  () => k.loadSound("menu", "/sounds/menu.mp3"),
  () => k.loadSound("kids", "/sounds/kids.mp3"),
  () => k.loadSound("clock", "/sounds/clock.mp3"),
  () => k.loadSound("touch", "/sounds/touch.mp3"),
  () => k.loadSound("touch0-pre", "/sounds/touch0-pre.mp3"),
  () => k.loadSound("touch1-pre", "/sounds/touch1-pre.mp3"),
  () => k.loadSound("touch2-pre", "/sounds/touch2-pre.mp3"),
  () => k.loadSound("touch3-pre", "/sounds/touch3-pre.mp3"),
  () => k.loadSound("life", "/sounds/life.mp3"),
  () => k.loadSound("boss", "/sounds/boss.mp3"),
  //
  // Sprites
  //
  () => k.loadSprite("life", "/life.png"),
  () => k.loadSprite("menu-bg", "/menu.png"),
  //
  // Hero and blade sprites
  //
  () => loadHeroSprites(k, HEROES.HERO),
  () => loadHeroSprites(k, HEROES.ANTIHERO),
  () => loadBladeSprites(k),
  //
  // City background preloads (CPU-intensive canvas rendering)
  //
  () => {
    const PLATFORM_BOTTOM_HEIGHT_LEVEL0 = 250
    CityBackground.preloadCityBackground(k, PLATFORM_BOTTOM_HEIGHT_LEVEL0, 'city-background', true, false, true, 2.0)
  },
  () => {
    const PLATFORM_BOTTOM_HEIGHT_LEVEL1 = 150
    CityBackground.preloadCityBackground(k, PLATFORM_BOTTOM_HEIGHT_LEVEL1, 'city-background-level1', true, false, true, 2.0)
  },
  () => {
    const PLATFORM_BOTTOM_HEIGHT_LEVEL2 = 150
    CityBackground.preloadCityBackground(k, PLATFORM_BOTTOM_HEIGHT_LEVEL2, 'city-background-level2', false, true, true, 0.4)
  },
  () => {
    const LOWER_CORRIDOR_Y_LEVEL3 = 680
    const CORRIDOR_HEIGHT_LEVEL3 = 180
    const groundLineLevel3 = k.height() - (LOWER_CORRIDOR_Y_LEVEL3 + CORRIDOR_HEIGHT_LEVEL3)
    CityBackground.preloadCityBackground(k, groundLineLevel3, 'city-background-level3', false, true, false)
  },
  //
  // Scene registration (each scene may do internal setup)
  //
  () => sceneReady(k),
  () => sceneMenu(k),
  () => sceneLevel0(k),
  () => sceneLevel1(k),
  () => sceneLevel2(k),
  () => sceneLevel3(k),
  () => sceneLevel4(k),
  () => sceneWordComplete(k),
  () => sceneTouchLevel0(k),
  () => sceneTouchLevel1(k),
  () => sceneTouchLevel2(k),
  () => sceneTouchLevel3(k),
  () => sceneTouchComplete(k),
  () => sceneTimeLevel0(k),
  () => sceneTimeLevel1(k),
  () => sceneTimeLevel2(k),
  () => sceneTimeLevel3(k),
  () => sceneTimeComplete(k)
]
totalTasks = assetTasks.length
//
// Execute all loading tasks sequentially with browser yields between each.
// This lets the progress bar repaint after every task instead of freezing
// during a single long synchronous block.
//
async function loadAllAssets() {
  for (let i = 0; i < assetTasks.length; i++) {
    try {
      assetTasks[i]()
    } catch (_) {
      //
      // If any single task fails, continue with the rest
      //
    }
    completedTasks++
    updateLoaderBar()
    await yieldToRenderer()
  }
  //
  // All tasks queued — wait for Kaplay to finish downloading everything
  //
  k.onLoad(() => {
    const loader = document.getElementById('loader')
    if (loader) loader.remove()
    k.go("ready")
  })
}
loadAllAssets()
