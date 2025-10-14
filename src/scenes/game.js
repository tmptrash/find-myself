export function gameScene(k) {
  k.scene("game", () => {
    const SPEED = 100
    
    // Добавляем героя
    const bean = k.add([
      k.sprite('bean'),
      k.pos(k.width() / 2, k.height() / 2),
      k.area({
        shape: new k.Rect(k.vec2(0, 0), 50, 70)
      }),
      k.anchor("center"),
    ])
    
    // Управление
    k.onKeyDown('right', () => {
      bean.move(SPEED, 0)
    })
    k.onKeyDown('left', () => {
      bean.move(-SPEED, 0)
    })
    k.onKeyDown('up', () => {
      bean.move(0, -SPEED)
    })
    k.onKeyDown('down', () => {
      bean.move(0, SPEED)
    })
    
    // Возврат в меню по ESC
    k.onKeyPress("escape", () => {
      k.go("menu")
    })
  })
}

