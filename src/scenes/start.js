import { CONFIG, getColor, getRGB } from '../config.js'

export function startScene(k) {
  k.scene("start", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Рисуем фон (из конфига)
    k.add([
      k.rect(k.width(), k.height()),
      getColor(k, CONFIG.colors.start.background),
      k.pos(0, 0),
      k.fixed(),
      k.z(CONFIG.visual.zIndex.background),
    ])
    
    // Кнопка "Are you ready?"
    const buttonWidth = 450
    const buttonHeight = 90
    const buttonX = centerX
    const buttonY = centerY - 50
    
    // Тень кнопки
    const buttonShadow = k.add([
      k.rect(buttonWidth, buttonHeight, { radius: 12 }),
      k.pos(buttonX + 4, buttonY + 4),
      k.anchor("center"),
      getColor(k, [0, 0, 0]),
      k.opacity(0.3),
      k.z(0),
    ])
    
    // Фон кнопки (из конфига)
    const button = k.add([
      k.rect(buttonWidth, buttonHeight, { radius: 12 }),
      k.pos(buttonX, buttonY),
      k.anchor("center"),
      getColor(k, CONFIG.colors.start.button),
      k.outline(6, getRGB(k, CONFIG.colors.start.buttonOutline)),
      k.area(),
      k.scale(1),
      k.z(1),
      "button",
    ])
    
    // Текст на кнопке (из конфига)
    const buttonText = k.add([
      k.text("ARE YOU READY?", { size: CONFIG.visual.buttonFontSize }),
      k.pos(buttonX, buttonY),
      k.anchor("center"),
      getColor(k, CONFIG.colors.start.buttonText),
      k.outline(3, getRGB(k, CONFIG.colors.start.buttonOutline)),
      k.z(2),
    ])
    
    // Эффект hover (из конфига)
    button.onHoverUpdate(() => {
      const scale = CONFIG.visual.menu.buttonHoverScale
      button.scale = k.vec2(scale)
      buttonText.scale = k.vec2(scale)
      buttonShadow.scale = k.vec2(scale)
      k.setCursor("pointer")
    })
    
    button.onHoverEnd(() => {
      button.scale = k.vec2(1)
      buttonText.scale = k.vec2(1)
      buttonShadow.scale = k.vec2(1)
      k.setCursor("default")
    })
    
    // Клик по кнопке
    button.onClick(() => {
      k.go("menu")
    })
    
    // Также можно нажать клавиши (используем конфиг)
    CONFIG.controls.startGame.forEach(key => {
      k.onKeyPress(key, () => {
        k.go("menu")
      })
    })
    
    // Анимация пульсации кнопки (из конфига)
    k.onUpdate(() => {
      if (!button.isHovering()) {
        const pulse = 1.0 + Math.sin(k.time() * CONFIG.visual.menu.titlePulseSpeed) * CONFIG.visual.menu.buttonPulseAmount
        button.scale = k.vec2(pulse)
        buttonText.scale = k.vec2(pulse)
        buttonShadow.scale = k.vec2(pulse)
        
        // Анимация цвета кнопки
        const colorShift = Math.sin(k.time() * 2) * 30
        const baseColor = CONFIG.colors.start.button
        button.color = getRGB(k, [baseColor[0], baseColor[1] + colorShift, baseColor[2]])
      }
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

