import { CFG } from './cfg.js'
import { getColor, getRGB } from './utils/helper.js'
import { addBackground } from './sections/blades/utils/scene.js'

export function sceneReady(k) {
  k.scene("ready", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Draw background
    addBackground(k, CFG.colors.ready.background)
    
    // Title
    k.add([
      k.text("FIND MYSELF", { size: 64 }),
      k.pos(centerX, 100),
      k.anchor("center"),
      getColor(k, CFG.colors.ready.title),
      k.outline(3, getRGB(k, CFG.colors.outlineTextColor)),
    ])
    
    // Story text
    const storyLines = [
      "The Division shattered your soul in two.",
      "Light and Darkness — two halves of one,",
      "wandering through distorted realities.",
      "",
      "The electric discharges between you are",
      "the echoes of your lost wholeness.",
      "The closer you get — more dangerous.",
      "The farther apart — the more painful.",
      "",
      "Upon meeting, you annihilate each other,",
      "awakening in the new distorted world.",
      "But you keep searching. Again and again.",
      "Giving up on yourself is impossible...",
    ]
    
    const textWidth = 650  // Fixed width for all text lines
    const lineHeight = 32
    const startY = centerY - (storyLines.length * lineHeight) / 2 + 20
    
    storyLines.forEach((line, index) => {
      k.add([
        k.text(line, { size: 24, width: textWidth, align: "center" }),
        k.pos(centerX, startY + index * lineHeight),
        k.anchor("center"),
        getColor(k, CFG.colors.ready.text),
        k.outline(2, getRGB(k, CFG.colors.outlineTextColor)),
      ])
    })
    
    // Hint at bottom
    k.add([
      k.text('Press SPACE or Enter to start', { size: 20 }),
      k.pos(centerX, k.height() - 80),
      k.anchor("center"),
      getColor(k, CFG.colors.ready.hint),
      k.outline(2, getRGB(k, CFG.colors.outlineTextColor)),
    ])
    
    // Press space to start
    CFG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        k.go("menu")
      })
    })
  })
}
