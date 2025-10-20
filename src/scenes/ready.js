import { CFG } from '../cfg.js'
import { getColor, getRGB } from '../utils/helper.js'
import { addBackground } from '../utils/scene.js'
import * as Button from '../components/button.js'

export function sceneReady(k) {
  k.scene("ready", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Draw background (use common module)
    addBackground(k, CFG.colors.ready.background)
    
    // "Are you ready?" button (use button module)
    Button.create(k, {
      text: "ARE YOU READY?",
      x: centerX,
      y: centerY - 50,
      width: 360, // Width with even padding
      onClick: () => k.go("menu"),
      textOffsetY: 3, // Lower text slightly for alignment
    })
    
    // Can also press keys (use config)
    CFG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        k.go("menu")
      })
    })
    
    // Hint (from config)
    k.add([
      k.text("Click the button or press Enter/Space", { size: 20 }),
      k.pos(centerX, k.height() - 80),
      k.anchor("center"),
      getColor(k, CFG.colors.ready.hint),
      k.outline(2, getRGB(k, CFG.colors.outlineTextColor)),
    ])
  })
}
