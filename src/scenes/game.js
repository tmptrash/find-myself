export function gameScene(k) {
  k.scene("game", () => {
    const MOVE_SPEED = 450 // Очень высокая скорость движения
    const JUMP_FORCE = 800 // Очень высокая сила прыжка
    
    k.setGravity(2200) // Очень высокая гравитация для резкого падения
    
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
    
    // Земля (основная платформа) - увеличена для более длинного уровня
    const ground = addPlatform(0, k.height() - 60, k.width() * 3, 60)
    
    // Дополнительные платформы - больше для тестирования динамики
    addPlatform(200, k.height() - 200, 200, 20)
    addPlatform(500, k.height() - 320, 180, 20)
    addPlatform(800, k.height() - 180, 150, 20)
    addPlatform(1100, k.height() - 380, 200, 20)
    addPlatform(1400, k.height() - 250, 180, 20)
    addPlatform(1700, k.height() - 400, 220, 20)
    addPlatform(2000, k.height() - 300, 200, 20)
    addPlatform(100, k.height() - 450, 120, 20)
    
    // ОТЛАДКА: Показываем все кадры анимации бега
    const debugY = 120
    const debugScale = 2.5
    const debugSpacing = 100
    
    // Idle с анимацией глаз
    const debugIdleSprite = k.add([
      k.sprite('hero_0_0'),
      k.pos(100, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200),
      {
        eyeOffsetX: 0,
        eyeOffsetY: 0,
        targetEyeX: 0,
        targetEyeY: 0,
        eyeTimer: 0,
        currentEyeSprite: null
      }
    ])
    k.add([
      k.text("IDLE", { size: 16 }),
      k.pos(100, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Анимация глаз для отладочного IDLE спрайта
    k.onUpdate(() => {
      debugIdleSprite.eyeTimer += k.dt()
      
      if (debugIdleSprite.eyeTimer > k.rand(1.5, 3.5)) {
        debugIdleSprite.targetEyeX = k.choose([-1, 0, 1])
        debugIdleSprite.targetEyeY = k.choose([-1, 0, 1])
        debugIdleSprite.eyeTimer = 0
      }
      
      debugIdleSprite.eyeOffsetX = k.lerp(debugIdleSprite.eyeOffsetX, debugIdleSprite.targetEyeX, 0.1)
      debugIdleSprite.eyeOffsetY = k.lerp(debugIdleSprite.eyeOffsetY, debugIdleSprite.targetEyeY, 0.1)
      
      const roundedX = Math.round(debugIdleSprite.eyeOffsetX)
      const roundedY = Math.round(debugIdleSprite.eyeOffsetY)
      
      const spriteName = `hero_${roundedX}_${roundedY}`
      
      if (!debugIdleSprite.currentEyeSprite || debugIdleSprite.currentEyeSprite !== spriteName) {
        debugIdleSprite.use(k.sprite(spriteName))
        debugIdleSprite.currentEyeSprite = spriteName
      }
    })
    
    // Кадр 0 бега
    k.add([
      k.sprite('hero-run-0'),
      k.pos(100 + debugSpacing, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200)
    ])
    k.add([
      k.text("RUN 0", { size: 16 }),
      k.pos(100 + debugSpacing, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Кадр 1 бега
    k.add([
      k.sprite('hero-run-1'),
      k.pos(100 + debugSpacing * 2, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200)
    ])
    k.add([
      k.text("RUN 1", { size: 16 }),
      k.pos(100 + debugSpacing * 2, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Кадр 2 бега
    k.add([
      k.sprite('hero-run-2'),
      k.pos(100 + debugSpacing * 3, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200)
    ])
    k.add([
      k.text("RUN 2", { size: 16 }),
      k.pos(100 + debugSpacing * 3, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Кадр 3 бега
    k.add([
      k.sprite('hero-run-3'),
      k.pos(100 + debugSpacing * 4, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200)
    ])
    k.add([
      k.text("RUN 3", { size: 16 }),
      k.pos(100 + debugSpacing * 4, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Кадр 4 бега
    k.add([
      k.sprite('hero-run-4'),
      k.pos(100 + debugSpacing * 5, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200)
    ])
    k.add([
      k.text("RUN 4", { size: 16 }),
      k.pos(100 + debugSpacing * 5, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Кадр 5 бега
    k.add([
      k.sprite('hero-run-5'),
      k.pos(100 + debugSpacing * 6, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200)
    ])
    k.add([
      k.text("RUN 5", { size: 16 }),
      k.pos(100 + debugSpacing * 6, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Кадр 6 бега
    k.add([
      k.sprite('hero-run-6'),
      k.pos(100 + debugSpacing * 7, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200)
    ])
    k.add([
      k.text("RUN 6", { size: 16 }),
      k.pos(100 + debugSpacing * 7, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Кадр 7 бега
    k.add([
      k.sprite('hero-run-7'),
      k.pos(100 + debugSpacing * 8, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200)
    ])
    k.add([
      k.text("RUN 7", { size: 16 }),
      k.pos(100 + debugSpacing * 8, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Прыжок
    k.add([
      k.sprite('hero-jump'),
      k.pos(100 + debugSpacing * 9, debugY),
      k.anchor("center"),
      k.scale(debugScale),
      k.fixed(),
      k.z(200)
    ])
    k.add([
      k.text("JUMP", { size: 16 }),
      k.pos(100 + debugSpacing * 9, debugY + 80),
      k.anchor("center"),
      k.color(62, 39, 35),
      k.fixed(),
      k.z(200)
    ])
    
    // Добавляем героя
    const player = k.add([
      k.sprite('hero_0_0'), // Используем спрайт с глазами
      k.pos(100, 400),
      k.area({ 
        shape: new k.Rect(k.vec2(0, 0), 14, 25), // Collision box возвращен к исходной ширине
        collisionIgnore: []
      }),
      k.body(),
      k.anchor("center"),
      k.scale(3),
    ])
    
    // Добавляем кастомные свойства после создания
    player.speed = MOVE_SPEED
    player.myJumpForce = JUMP_FORCE
    player.runFrame = 0
    player.runTimer = 0
    player.direction = 1 // 1 = вправо, -1 = влево
    player.canJump = true
    player.isRunning = false // Флаг для отслеживания состояния бега
    player.wasJumping = false // Флаг для отслеживания состояния прыжка
    
    // Переменные для анимации глаз (как на заставке)
    player.eyeOffsetX = 0
    player.eyeOffsetY = 0
    player.targetEyeX = 0
    player.targetEyeY = 0
    player.eyeTimer = 0
    player.currentEyeSprite = null
    
    // Проверка касания земли через столкновения
    player.onCollide("platform", () => {
      player.canJump = true
      // Если был в прыжке, мгновенно переключаемся на idle
      if (player.wasJumping) {
        player.wasJumping = false
        const roundedX = Math.round(player.eyeOffsetX)
        const roundedY = Math.round(player.eyeOffsetY)
        const heroSpriteName = `hero_${roundedX}_${roundedY}`
        player.use(k.sprite(heroSpriteName))
        player.currentEyeSprite = heroSpriteName
      }
    })
    
    // Анимация бега и глаз
    k.onUpdate(() => {
      const isMoving = k.isKeyDown("left") || k.isKeyDown("right") || 
                       k.isKeyDown("a") || k.isKeyDown("d")
      
      // Проверяем, на земле ли игрок (скорость по Y близка к 0 и касается платформы)
      const isGrounded = player.canJump && Math.abs(player.vel.y) < 10
      
      if (!isGrounded) {
        // В прыжке
        player.use(k.sprite("hero-jump"))
        player.runFrame = 0
        player.runTimer = 0
        player.isRunning = false // Сбрасываем флаг бега
        player.wasJumping = true // Устанавливаем флаг прыжка
      } else if (isMoving) {
        // Бег - переключаем кадры плавно (8 кадров как на референсе)
        player.isRunning = true // Устанавливаем флаг бега
        player.runTimer += k.dt()
        if (player.runTimer > 0.04) { // Меняем кадр каждые 0.08 секунды для плавной анимации
          player.runFrame = (player.runFrame + 1) % 6 // 6 кадров для плавности
          player.use(k.sprite(`hero-run-${player.runFrame}`))
          player.runTimer = 0
        }
      } else {
        // Idle - с анимацией глаз (как на заставке)
        
        // Если только что закончили бег, мгновенно переключаемся на idle
        if (player.isRunning) {
          player.isRunning = false
          player.runFrame = 0
          player.runTimer = 0
          // Мгновенно переключаемся на текущий idle спрайт
          const roundedX = Math.round(player.eyeOffsetX)
          const roundedY = Math.round(player.eyeOffsetY)
          const heroSpriteName = `hero_${roundedX}_${roundedY}`
          player.use(k.sprite(heroSpriteName))
          player.currentEyeSprite = heroSpriteName
        }
        
        // Анимация глаз - плавное движение
        player.eyeTimer += k.dt()
        
        // Выбираем новую целевую позицию каждые 1.5-3.5 секунды
        if (player.eyeTimer > k.rand(1.5, 3.5)) {
          player.targetEyeX = k.choose([-1, 0, 1])
          player.targetEyeY = k.choose([-1, 0, 1])
          player.eyeTimer = 0
        }
        
        // Плавно интерполируем к целевой позиции
        player.eyeOffsetX = k.lerp(player.eyeOffsetX, player.targetEyeX, 0.1)
        player.eyeOffsetY = k.lerp(player.eyeOffsetY, player.targetEyeY, 0.1)
        
        // Округляем для пиксель-арт стиля
        const roundedX = Math.round(player.eyeOffsetX)
        const roundedY = Math.round(player.eyeOffsetY)
        
        // Переключаем на предзагруженный спрайт с глазами
        const heroSpriteName = `hero_${roundedX}_${roundedY}`
        
        // Обновляем спрайт только если позиция глаз изменилась
        if (player.currentEyeSprite !== heroSpriteName) {
          player.use(k.sprite(heroSpriteName))
          player.currentEyeSprite = heroSpriteName
        }
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
    
    // Визуализация collision box отключена
    
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

