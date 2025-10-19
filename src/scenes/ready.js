import { CONFIG } from '../config.js'
import { getColor, getRGB } from '../utils/helpers.js'
import { addBackground } from '../components/scene.js'
import * as Button from '../components/button.js'

export function readyScene(k) {
  k.scene("start", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Draw background (use common module)
    addBackground(k, CONFIG.colors.start.background)
    
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
    CONFIG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        k.go("menu")
      })
    })
    
    // Hint (from config)
    k.add([
      k.text("Click the button or press Enter/Space", { size: 20 }),
      k.pos(centerX, k.height() - 80),
      k.anchor("center"),
      getColor(k, CONFIG.colors.start.hint),
      k.outline(2, getRGB(k, CONFIG.colors.start.buttonOutline)),
    ])
  })
}
