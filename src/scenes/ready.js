import { CFG } from '../cfg.js'
import { getColor, getRGB } from '../utils/helper.js'
import { addBackground } from '../utils/scene.js'

export function sceneReady(k) {
  k.scene("ready", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Draw background
    addBackground(k, CFG.colors.ready.background)
    
    // Title
    k.add([
      k.text("FIND YOU", { size: 64 }),
      k.pos(centerX, 100),
      k.anchor("center"),
      getColor(k, CFG.colors.ready.title),
      k.outline(3, getRGB(k, CFG.colors.outlineTextColor)),
    ])
    
    // Story text
    const storyLines = [
      "The Division shattered your soul in two.",
      "",
      "Light and Darkness — two halves of one whole,",
      "wandering through distorted realities.",
      "",
      "The electric discharges between you —",
      "echoes of your lost wholeness.",
      "",
      "The closer — the more dangerous.",
      "The farther — the more painful.",
      "",
      "Upon meeting, you annihilate each other,",
      "awakening in a new distorted world.",
      "",
      "But you keep searching.",
      "Again. And again. And again.",
      "",
      "Because giving up on yourself is impossible.",
    ]
    
    const lineHeight = 28
    const startY = centerY - (storyLines.length * lineHeight) / 2
    
    storyLines.forEach((line, index) => {
      k.add([
        k.text(line, { size: 24 }),
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
