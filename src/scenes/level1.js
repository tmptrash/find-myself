export function level1Scene(k) {
  k.scene("level1", () => {
    // ========================================
    // TIME-BASED СИСТЕМА: независима от FPS
    // ========================================
    // Все скорости измеряются в пикселях в секунду (px/s)
    // Kaplay автоматически умножает move() на k.dt()
    // Анимации используют k.dt() для time-based обновлений
    
    const MOVE_SPEED = 450 // Скорость движения (px/s)
    const JUMP_FORCE = 800 // Сила прыжка (px/s)
    const GRAVITY = 2200 // Гравитация (px/s²)
    const RUN_ANIM_SPEED = 0.04 // Скорость анимации бега (секунды на кадр)
    
    k.setGravity(GRAVITY)
    
    // Флаг дебаг режима (переключается по F1)
    let debugMode = false
    
    // Используем глобальный аудио контекст
    const audioContext = window.gameAudioContext
    
    // Функция для звука приземления
    function playLandSound() {
      const now = audioContext.currentTime
      
      // Легкий мягкий звук приземления
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(250, now) // Выше частота = легче звук
      oscillator.frequency.exponentialRampToValueAtTime(80, now + 0.08)
      
      gainNode.gain.setValueAtTime(0.343, now) // Громкость (0.264 * 1.3 = +30%, итого +186% от оригинала)
      gainNode.gain.exponentialRampToValueAtTime(0.029, now + 0.1) // Затухание
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.start(now)
      oscillator.stop(now + 0.1)
    }
    
    // Функция для звука шагов при беге
    function playStepSound() {
      const now = audioContext.currentTime
      
      // Короткий щелчок для шага
      const oscillator = audioContext.createOscillator()
      const gainNode = audioContext.createGain()
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(180, now)
      oscillator.frequency.exponentialRampToValueAtTime(60, now + 0.03)
      
      gainNode.gain.setValueAtTime(0.176, now) // Громкость звука шага (0.135 * 1.3 = +30%, итого +120% от оригинала)
      gainNode.gain.exponentialRampToValueAtTime(0.022, now + 0.05)
      
      oscillator.connect(gainNode)
      gainNode.connect(audioContext.destination)
      
      oscillator.start(now)
      oscillator.stop(now + 0.05)
    }
    
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
        "platform"
      ])
    }
    
    // Нижняя платформа (широкая)
    addPlatform(0, k.height() - 150, k.width(), 150)
    
    // Верхняя платформа (широкая, той же высоты)
    addPlatform(0, 0, k.width(), 150)
    
    // Левая стена (коридор)
    addPlatform(0, 150, 30, k.height() - 300)
    
    // Правая стена (коридор)
    addPlatform(k.width() - 30, 150, 30, k.height() - 300)
    
    // Добавляем героя (падает на нижнюю платформу)
    const player = k.add([
      k.sprite('hero_0_0'), // Используем спрайт с глазами
      k.pos(k.width() / 2, 300), // Стартуем по центру коридора
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
        playLandSound() // Звук приземления
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
        // Бег - переключаем кадры плавно (time-based анимация)
        player.isRunning = true // Устанавливаем флаг бега
        player.runTimer += k.dt()
        if (player.runTimer > RUN_ANIM_SPEED) { // Меняем кадр через заданное время
          player.runFrame = (player.runFrame + 1) % 6 // 6 кадров для плавности
          player.use(k.sprite(`hero-run-${player.runFrame}`))
          player.runTimer = 0
          
          // Звук шага на кадрах 0 и 3 (когда нога касается земли)
          if (player.runFrame === 0 || player.runFrame === 3) {
            playStepSound()
          }
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
      
      // Ограничиваем игрока в пределах коридора
      const leftBound = 60  // После левой стены
      const rightBound = k.width() - 60  // До правой стены
      const topBound = 180  // После верхней платформы
      const bottomBound = k.height() - 180  // До нижней платформы
      
      // Ограничиваем по X
      if (player.pos.x < leftBound) {
        player.pos.x = leftBound
      }
      if (player.pos.x > rightBound) {
        player.pos.x = rightBound
      }
      
      // Ограничиваем по Y
      if (player.pos.y < topBound) {
        player.pos.y = topBound
      }
      if (player.pos.y > bottomBound) {
        player.pos.y = bottomBound
      }
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
      k.text("WASD/← ↑ → - Move\nSpace - jump\nESC - menu", {
        size: 14,
        width: k.width() - 40
      }),
      k.pos(20, 20),
      k.color(255, 218, 185), // Светлый персиковый (как фон)
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
    
    // Переключение дебаг режима по F1
    k.onKeyPress("f1", () => {
      debugMode = !debugMode
    })
    
    // Визуализация collision box отключена
    
    // Камера и дебаг - обновляем вместе
    k.onUpdate(() => {
      // Камера фиксирована в центре экрана (не следует за игроком)
      k.camPos(k.width() / 2, k.height() / 2)
      
      // Обновляем дебаг текст (только если дебаг режим включен)
      if (debugMode) {
        debugText.text = `Pos: ${Math.round(player.pos.x)}, ${Math.round(player.pos.y)}\nVel: ${Math.round(player.vel?.x || 0)}, ${Math.round(player.vel?.y || 0)}\nCan Jump: ${player.canJump}`
      } else {
        debugText.text = ""
      }
    })
    
    // Возврат в меню по ESC
    k.onKeyPress("escape", () => {
      k.go("menu")
    })
  })
}

