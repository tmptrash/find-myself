export function startScene(k) {
  k.scene("start", () => {
    const centerX = k.width() / 2
    const centerY = k.height() / 2
    
    // Рисуем фон
    k.add([
      k.rect(k.width(), k.height()),
      k.color(25, 25, 25),
      k.pos(0, 0),
      k.fixed(),
      k.z(-100),
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
      k.color(0, 0, 0),
      k.opacity(0.3),
      k.z(0),
    ])
    
    // Фон кнопки
    const button = k.add([
      k.rect(buttonWidth, buttonHeight, { radius: 12 }),
      k.pos(buttonX, buttonY),
      k.anchor("center"),
      k.color(255, 100, 50),
      k.outline(6, k.rgb(0, 0, 0)),
      k.area(),
      k.scale(1),
      k.z(1),
      "button",
    ])
    
    // Текст на кнопке
    const buttonText = k.add([
      k.text("ARE YOU READY?", { size: 36 }),
      k.pos(buttonX, buttonY),
      k.anchor("center"),
      k.color(255, 255, 255),
      k.outline(3, k.rgb(0, 0, 0)),
      k.z(2),
    ])
    
    // Эффект hover
    button.onHoverUpdate(() => {
      button.scale = k.vec2(1.08)
      buttonText.scale = k.vec2(1.08)
      buttonShadow.scale = k.vec2(1.08)
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
    
    // Также можно нажать Enter или Space
    k.onKeyPress("enter", () => {
      k.go("menu")
    })
    
    k.onKeyPress("space", () => {
      k.go("menu")
    })
    
    // Анимация пульсации кнопки
    k.onUpdate(() => {
      if (!button.isHovering()) {
        const pulse = 1.0 + Math.sin(k.time() * 3) * 0.03
        button.scale = k.vec2(pulse)
        buttonText.scale = k.vec2(pulse)
        buttonShadow.scale = k.vec2(pulse)
        
        // Анимация цвета кнопки
        const colorShift = Math.sin(k.time() * 2) * 30
        button.color = k.rgb(255, 100 + colorShift, 50)
      }
    })
    
    // Подсказка
    k.add([
      k.text("Click the button or press Enter/Space", { size: 20 }),
      k.pos(centerX, k.height() - 80),
      k.anchor("center"),
      k.color(150, 150, 150),
      k.outline(2, k.rgb(0, 0, 0)),
    ])
  })
}

