import { CFG } from '../cfg.js'
import { getColor, getRGB } from '../utils/helper.js'
import { addBackground } from '../sections/word/utils/scene.js'

export function sceneReady(k) {
  k.scene("ready", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Draw background
    addBackground(k, CFG.colors.ready.background)
    
    // Title
    k.add([
      k.text("find myself", { size: 64 }),
      k.pos(centerX, 100),
      k.anchor("center"),
      getColor(k, CFG.colors.ready.title),
    ])
    
    // Story text
    const storyLines = [
      "You'll die. Many times.",
      "You'll fall for lies.",
      "You'll doubt every step.",
      "",
      "But each time you fall —",
      "you'll remember a little more.",
    ]
    
    const lineHeight = 34
    const startY = centerY - (storyLines.length * lineHeight) / 2 + 20
    
    storyLines.forEach((line, index) => {
      k.add([
        k.text(line, { size: 26, align: "center" }),
        k.pos(centerX, startY + index * lineHeight),
        k.anchor("center"),
        getColor(k, CFG.colors.ready.text),
      ])
    })
    
    // Hint at bottom
    k.add([
      k.text('Space or Enter - start', { size: 20 }),
      k.pos(centerX, 1030),  // Fixed: same as menu, k.height() - 50 = 1030
      k.anchor("center"),
      getColor(k, CFG.colors.ready.hint),
    ])
    
    //
    // Press space/enter to start
    //
    CFG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        k.go("menu")
      })
    })
    
    //
    // Click anywhere to start (same as space/enter)
    //
    k.onClick(() => {
      k.go("menu")
    })
  })
}