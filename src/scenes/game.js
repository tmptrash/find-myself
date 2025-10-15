export function gameScene(k) {
  k.scene("game", () => {
    const MOVE_SPEED = 200
    const JUMP_FORCE = 500
    
    k.setGravity(980)
    
    // Фон - фиксированный к камере
    k.add([
      k.rect(k.width(), k.height()),
      k.color(255, 218, 185), // Светлый персиковый
      k.pos(0, 0),
      k.fixed(),
      k.z(-100)
    ])
    
    // Создаем платформы
    function addPlatform(x, y, width, height) {
      return k.add([
        k.rect(width, height),
        k.pos(x, y),
        k.area(),
        k.body({ isStatic: true }),
        k.color(62, 39, 35), // Темно-коричневый
        k.outline(2, k.rgb(0, 0, 0)),
        "platform"
      ])
    }
    
    // Земля (основная платформа)
    const ground = addPlatform(0, k.height() - 60, k.width(), 60)
    
    // Дополнительные платформы
    addPlatform(200, k.height() - 200, 200, 20)
    addPlatform(500, k.height() - 300, 180, 20)
    addPlatform(750, k.height() - 180, 150, 20)
    addPlatform(100, k.height() - 350, 120, 20)
    
    // Добавляем героя
    const player = k.add([
      k.sprite('hero-idle'),
      k.pos(100, 100),
      k.area(),
      k.body(),
      k.anchor("center"),
      k.scale(3),
    ])
    
    // Добавляем кастомные свойства после создания
    player.speed = MOVE_SPEED
    player.myJumpForce = JUMP_FORCE
    player.walkFrame = 0
    player.walkTimer = 0
    player.direction = 1 // 1 = вправо, -1 = влево
    player.canJump = true
    
    // Проверка касания земли через столкновения
    player.onCollide("platform", () => {
      player.canJump = true
    })
    
    // Анимация ходьбы
    k.onUpdate(() => {
      const isMoving = k.isKeyDown("left") || k.isKeyDown("right") || 
                       k.isKeyDown("a") || k.isKeyDown("d")
      
      // Проверяем, на земле ли игрок (скорость по Y близка к 0 и касается платформы)
      const isGrounded = player.canJump && Math.abs(player.vel.y) < 10
      
      if (!isGrounded) {
        // В прыжке
        player.use(k.sprite("hero-jump"))
      } else if (isMoving) {
        // Ходьба - переключаем кадры
        player.walkTimer += k.dt()
        if (player.walkTimer > 0.15) { // Меняем кадр каждые 0.15 секунды
          player.walkFrame = (player.walkFrame + 1) % 2
          player.use(k.sprite(`hero-walk-${player.walkFrame}`))
          player.walkTimer = 0
        }
      } else {
        // Idle
        player.use(k.sprite("hero-idle"))
        player.walkFrame = 0
        player.walkTimer = 0
      }
      
      // Отзеркаливание в зависимости от направления
      player.flipX = player.direction === -1
    })
    
    // Управление движением (стрелки)
    k.onKeyDown("left", () => {
      player.move(-player.speed, 0)
      player.direction = -1
    })
    
    k.onKeyDown("right", () => {
      player.move(player.speed, 0)
      player.direction = 1
    })
    
    // Управление движением (WASD)
    k.onKeyDown("a", () => {
      player.move(-player.speed, 0)
      player.direction = -1
    })
    
    k.onKeyDown("d", () => {
      player.move(player.speed, 0)
      player.direction = 1
    })
    
    // Прыжок (стрелка вверх или W)
    k.onKeyPress("up", () => {
      if (player.canJump) {
        player.vel.y = -player.myJumpForce
        player.canJump = false
      }
    })
    
    k.onKeyPress("w", () => {
      if (player.canJump) {
        player.vel.y = -player.myJumpForce
        player.canJump = false
      }
    })
    
    // Пробел для прыжка (дополнительно)
    k.onKeyPress("space", () => {
      if (player.canJump) {
        player.vel.y = -player.myJumpForce
        player.canJump = false
      }
    })
    
    // Инструкции
    const instructions = k.add([
      k.text("Arrow Keys / WASD to move\nUP / W / SPACE to jump\nESC to return to menu", {
        size: 20,
        width: k.width() - 40
      }),
      k.pos(20, 20),
      k.color(62, 39, 35),
      k.z(100),
      k.fixed() // Фиксируем к экрану
    ])
    
    // Дебаг информация (в правом верхнем углу)
    const debugText = k.add([
      k.text("", { size: 14 }),
      k.pos(k.width() - 220, 20),
      k.color(62, 39, 35),
      k.z(100),
      k.fixed()
    ])
    
    // Камера и дебаг - обновляем вместе
    k.onUpdate(() => {
      // Камера следует за игроком
      const targetCamPos = player.pos
      k.camPos(targetCamPos.x, k.height() / 2)
      
      // Ограничиваем камеру
      if (k.camPos().x < k.width() / 2) {
        k.camPos(k.width() / 2, k.height() / 2)
      }
      
      // Обновляем дебаг текст
      debugText.text = `Pos: ${Math.round(player.pos.x)}, ${Math.round(player.pos.y)}\nVel: ${Math.round(player.vel?.x || 0)}, ${Math.round(player.vel?.y || 0)}\nCan Jump: ${player.canJump}`
    })
    
    // Возврат в меню по ESC
    k.onKeyPress("escape", () => {
      k.go("menu")
    })
  })
}

