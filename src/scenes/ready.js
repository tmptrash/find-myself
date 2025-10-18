import { CONFIG } from '../config.js'
import { getColor, getRGB } from '../utils/helpers.js'
import { addBackground } from '../components/background.js'
import * as Button from '../components/button.js'

export function readyScene(k) {
  k.scene("start", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Рисуем фон (используем общий модуль)
    addBackground(k, CONFIG.colors.start.background)
    
    // Кнопка "Are you ready?" (используем модуль кнопки)
    Button.create(k, {
      text: "ARE YOU READY?",
      x: centerX,
      y: centerY - 50,
      width: 360, // Ширина с равномерными отступами
      targetScene: "menu",
      textOffsetY: 3, // Опускаем текст немного ниже для выравнивания
    })
    
    // Также можно нажать клавиши (используем конфиг)
    CONFIG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        k.go("menu")
      })
    })
    
    // Подсказка (из конфига)
    k.add([
      k.text("Click the button or press Enter/Space", { size: 20 }),
      k.pos(centerX, k.height() - 80),
      k.anchor("center"),
      getColor(k, CONFIG.colors.start.hint),
      k.outline(2, getRGB(k, CONFIG.colors.start.buttonOutline)),
    ])
  })
}

